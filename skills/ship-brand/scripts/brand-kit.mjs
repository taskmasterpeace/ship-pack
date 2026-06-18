#!/usr/bin/env node
// brand-kit.mjs — derive a full brand kit from docs/brand.json. Dependency-free, cross-platform.
//
// From the brand's colors + fonts it computes:
//   • a palette: each named color expanded into 50..900 tints/shades (HSL-lightness ramp)
//   • WCAG contrast: for every color, whether black or white text passes AA/AAA, with ratios
//   • a type scale: a modular scale (display..caption) from a base size + ratio
//   • an icon/favicon manifest: the standard favicon, PWA, Apple, OG/social sizes to render
//   • a web manifest (site.webmanifest) + a <head> snippet that wires the icons up
//
// It NEVER fabricates a brand. If docs/brand.json is missing it says so and exits non-zero
// (unless --init, which writes a starter brand.json you then edit).
//
// Usage:
//   node brand-kit.mjs                 # human report (discovery + derived kit summary)
//   node brand-kit.mjs --json          # machine-readable kit (palette+contrast+scale+manifest)
//   node brand-kit.mjs --write         # write docs/brand/ outputs (tokens.css, palette.json,
//                                      #   icon-manifest.json, site.webmanifest, head-snippet.html)
//   node brand-kit.mjs --init          # scaffold a starter docs/brand.json (then edit + re-run)
//   node brand-kit.mjs --root <dir>    # operate on another repo
//   node brand-kit.mjs --base 16 --ratio 1.25   # type-scale base px + ratio (default 16 / 1.25)

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const has = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const ROOT = opt("--root", ".");
const JSON_OUT = has("--json");
const WRITE = has("--write");
const INIT = has("--init");
const BASE = Number(opt("--base", "16"));
const RATIO = Number(opt("--ratio", "1.25"));

const BRAND_CANDIDATES = ["docs/brand.json", "brand.json", "brand/brand.json", ".brand.json"];
const OUT_DIR = "docs/brand";

// ---------------------------------------------------------------- color math
function parseColor(input) {
  if (typeof input !== "string") return null;
  let s = input.trim();
  // rgb()/rgba()
  let m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(",").map((x) => x.trim());
    const r = +p[0], g = +p[1], b = +p[2], a = p[3] !== undefined ? +p[3] : 1;
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b, a };
  }
  // #rgb / #rrggbb / #rrggbbaa
  m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }
  return null; // named CSS colors / gradients not resolvable without a table — skip honestly
}
const toHex = (r, g, b) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToRgb({ h, s, l }) {
  h /= 360; s /= 100; l /= 100;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}
// relative luminance + WCAG contrast ratio
function relLum({ r, g, b }) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(c1, c2) {
  const L1 = relLum(c1), L2 = relLum(c2);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
const WHITE = { r: 255, g: 255, b: 255 }, BLACK = { r: 0, g: 0, b: 0 };
const rate = (ratio) => ({
  ratio: Math.round(ratio * 100) / 100,
  AA: ratio >= 4.5, AA_large: ratio >= 3, AAA: ratio >= 7,
});

// Expand a base color into a 50..900 lightness ramp (keeps hue/sat, walks lightness).
const STOPS = [
  [50, 96], [100, 91], [200, 81], [300, 70], [400, 60],
  [500, 50], [600, 42], [700, 33], [800, 24], [900, 15],
];
function ramp(base) {
  const hsl = rgbToHsl(base);
  const out = {};
  for (const [stop, L] of STOPS) {
    const { r, g, b } = hslToRgb({ h: hsl.h, s: hsl.s, l: L });
    out[stop] = toHex(r, g, b);
  }
  return out;
}
// Best readable text color for a background + accessibility verdict.
function textOn(bg) {
  const onWhite = contrast(bg, WHITE), onBlack = contrast(bg, BLACK);
  const pick = onWhite >= onBlack ? "#ffffff" : "#000000";
  const best = Math.max(onWhite, onBlack);
  return { text: pick, white: rate(onWhite), black: rate(onBlack), best: rate(best) };
}

// --------------------------------------------------------------- type scale
function typeScale(base, ratio) {
  const steps = [
    ["display", 4], ["h1", 3], ["h2", 2], ["h3", 1],
    ["body-lg", 0.5], ["body", 0], ["small", -1], ["caption", -2],
  ];
  return steps.map(([name, step]) => {
    const px = base * ratio ** step;
    return { name, step, px: Math.round(px * 100) / 100, rem: Math.round((px / 16) * 1000) / 1000 };
  });
}

// ------------------------------------------------------ icon / social manifest
// The standard, real-world set a brand kit needs to render. Square unless noted.
const ICON_SIZES = [
  { file: "favicon-16.png", size: 16, purpose: "browser tab (legacy)" },
  { file: "favicon-32.png", size: 32, purpose: "browser tab / bookmark" },
  { file: "favicon-48.png", size: 48, purpose: "Windows site icon" },
  { file: "favicon.ico", size: "16,32,48", purpose: "multi-size .ico (legacy/IE)" },
  { file: "icon-180.png", size: 180, purpose: "apple-touch-icon (iOS home screen)" },
  { file: "icon-192.png", size: 192, purpose: "PWA / Android (manifest)" },
  { file: "icon-512.png", size: 512, purpose: "PWA splash / store (manifest)" },
  { file: "maskable-512.png", size: 512, purpose: "PWA maskable (safe-zone padded)" },
];
const SOCIAL_SIZES = [
  { file: "avatar-512.png", w: 512, h: 512, purpose: "square social avatar (X/LinkedIn/GitHub)" },
  { file: "banner-1500x500.png", w: 1500, h: 500, purpose: "X/Twitter header banner" },
  { file: "linkedin-banner-1584x396.png", w: 1584, h: 396, purpose: "LinkedIn page/profile banner" },
  { file: "og-1200x630.png", w: 1200, h: 630, purpose: "Open Graph / link preview (og:image)" },
];

// ---------------------------------------------------------------- load brand
function findBrand() {
  for (const p of BRAND_CANDIDATES) if (existsSync(join(ROOT, p))) return p;
  return null;
}

if (INIT) {
  const target = join(ROOT, "docs/brand.json");
  if (existsSync(target)) { console.error(`refusing to overwrite ${target} (already exists)`); process.exit(1); }
  mkdirSync(join(ROOT, "docs"), { recursive: true });
  const starter = {
    $comment: "Brand, as data. Read by the ship pack (brand kit, user guide, what's new). No purple by default.",
    name: "Your Product",
    tagline: "One line that says what it does.",
    colors: {
      bg: "#0b0c10", surface: "#14161d", border: "#242833",
      text: "#e8edf4", muted: "#9aa6b8", heading: "#f4f8ff",
      brand: "#2f7dff", accent: "#19c37d",
    },
    fonts: { display: "Inter", body: "Inter", mono: "JetBrains Mono" },
  };
  writeFileSync(target, JSON.stringify(starter, null, 2) + "\n");
  console.log(`Wrote starter ${target} — edit the colors/fonts, then re-run brand-kit.mjs.`);
  process.exit(0);
}

const brandPath = findBrand();
if (!brandPath) {
  console.error("No brand.json found (looked for: " + BRAND_CANDIDATES.join(", ") + ").");
  console.error("Run with --init to scaffold docs/brand.json, or create it first.");
  process.exit(2);
}
let brand;
try { brand = JSON.parse(readFileSync(join(ROOT, brandPath), "utf8")); }
catch (e) { console.error(`Failed to parse ${brandPath}: ${e.message}`); process.exit(3); }

const colors = brand.colors || {};
const fonts = brand.fonts || {};
const version = existsSync(join(ROOT, "docs/VERSION"))
  ? readFileSync(join(ROOT, "docs/VERSION"), "utf8").trim() : null;

// Build palette + contrast for each parseable color. Unparseable values are reported, not faked.
// Alpha colors (a < 1) are utility/overlay tones — a grid/scrim/glow, not a brand hue. A 50–900
// ramp computed on their opaque RGB is noise (a 7%-opacity grid does not need a tint ladder), so
// they keep the raw var only and are listed under alphaColors instead of getting a ramp.
const palette = {}, contrastTable = {}, skipped = [], alphaColors = [];
for (const [name, value] of Object.entries(colors)) {
  const c = parseColor(value);
  if (!c) { skipped.push({ name, value }); continue; }
  if (c.a < 1) { alphaColors.push({ name, value, alpha: c.a }); continue; }
  palette[name] = { base: toHex(c.r, c.g, c.b), ...ramp(c) };
  contrastTable[name] = { hex: toHex(c.r, c.g, c.b), ...textOn(c) };
}

const scale = typeScale(BASE, RATIO);

const kit = {
  brand: { name: brand.name || null, tagline: brand.tagline || null, version, source: brandPath },
  fonts: { display: fonts.display || null, body: fonts.body || null, mono: fonts.mono || null },
  palette,
  contrast: contrastTable,
  typeScale: { base: BASE, ratio: RATIO, steps: scale },
  icons: ICON_SIZES,
  social: SOCIAL_SIZES,
  skippedColors: skipped,
  alphaColors,
};

// ------------------------------------------------------------------- writers
function tokensCss() {
  const lines = [":root {"];
  // Names we couldn't parse (e.g. `rebeccapurple`, a named/unsupported value). We still emit a raw
  // var so nothing the brand set silently disappears, but we ANNOTATE it so the token file is as
  // honest as the report: an unparsed value has no 50–900 ramp and no WCAG contrast row, and the
  // comment says so. Without this, a reader could mistake a skipped color for an endorsed token.
  const skippedNames = new Set(skipped.map((s) => s.name));
  // Raw vars for EVERY color (incl. alpha overlays like --grid: rgba(...)) — verbatim.
  for (const [name, value] of Object.entries(colors)) {
    const note = skippedNames.has(name) ? "  /* unparsed — no ramp/contrast, not validated */" : "";
    lines.push(`  --${name}: ${value};${note}`);
  }
  lines.push("");
  // 50–900 ramps only for opaque brand colors (alpha colors are excluded — see palette build).
  for (const [name, ramps] of Object.entries(palette))
    for (const stop of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900])
      lines.push(`  --${name}-${stop}: ${ramps[stop]};`);
  lines.push("");
  if (fonts.display) lines.push(`  --font-display: "${fonts.display}", system-ui, sans-serif;`);
  if (fonts.body) lines.push(`  --font-body: "${fonts.body}", system-ui, sans-serif;`);
  if (fonts.mono) lines.push(`  --font-mono: "${fonts.mono}", ui-monospace, monospace;`);
  lines.push("");
  for (const s of scale) lines.push(`  --text-${s.name}: ${s.rem}rem;`);
  lines.push("}");
  return lines.join("\n") + "\n";
}
function webManifest() {
  return JSON.stringify({
    name: brand.name || "App",
    short_name: brand.name || "App",
    description: brand.tagline || "",
    theme_color: colors.brand || "#2f7dff",
    background_color: colors.bg || "#0b0c10",
    display: "standalone",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }, null, 2) + "\n";
}
function headSnippet() {
  return `<!-- ship-brand: favicons, app icons, social/OG. Place icons at web root; adjust paths as needed. -->
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="${colors.brand || "#2f7dff"}">
<meta property="og:title" content="${brand.name || ""}">
<meta property="og:description" content="${brand.tagline || ""}">
<meta property="og:image" content="/og-1200x630.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="/og-1200x630.png">
`;
}

if (WRITE) {
  const dir = join(ROOT, OUT_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "tokens.css"), tokensCss());
  writeFileSync(join(dir, "palette.json"), JSON.stringify({ palette, contrast: contrastTable, typeScale: kit.typeScale }, null, 2) + "\n");
  writeFileSync(join(dir, "icon-manifest.json"), JSON.stringify({ icons: ICON_SIZES, social: SOCIAL_SIZES }, null, 2) + "\n");
  writeFileSync(join(dir, "site.webmanifest"), webManifest());
  writeFileSync(join(dir, "head-snippet.html"), headSnippet());
  console.log("Wrote to " + OUT_DIR + "/:");
  for (const f of ["tokens.css", "palette.json", "icon-manifest.json", "site.webmanifest", "head-snippet.html"])
    console.log("  • " + OUT_DIR + "/" + f);
  console.log("\nNext: render the swatch/icon-spec gallery (see SKILL.md), then generate the actual images.");
  process.exit(0);
}

if (JSON_OUT) { console.log(JSON.stringify(kit, null, 2)); process.exit(0); }

// ------------------------------------------------------------- human report
console.log(`Brand kit  (root: ${ROOT})`);
console.log(`  source     : ${brandPath}${kit.brand.name ? `  (${kit.brand.name})` : ""}${version ? `  v${version}` : ""}`);
console.log(`  fonts      : display=${fonts.display || "—"}  body=${fonts.body || "—"}  mono=${fonts.mono || "—"}`);
console.log(`  colors     : ${Object.keys(palette).length} ramped, ${alphaColors.length} alpha (raw var only), ${skipped.length} skipped`);
if (alphaColors.length) for (const a of alphaColors) console.log(`    ~ alpha ${a.name} = ${a.value} (overlay/utility — raw var kept, no 50–900 ramp)`);
if (skipped.length) for (const s of skipped) console.log(`    ! skipped ${s.name} = ${s.value} (not a hex/rgb value)`);
console.log("\n  Contrast (text that passes on each color):");
for (const [name, c] of Object.entries(contrastTable)) {
  const verdict = c.best.AAA ? "AAA" : c.best.AA ? "AA" : c.best.AA_large ? "AA-large only" : "FAIL";
  console.log(`    ${name.padEnd(12)} ${c.hex}  best text ${c.text}  ${c.best.ratio}:1  ${verdict}`);
}
console.log(`\n  Type scale (base ${BASE}px, ratio ${RATIO}):`);
for (const s of scale) console.log(`    ${s.name.padEnd(9)} ${s.px}px  (${s.rem}rem)`);
console.log(`\n  Icons to render : ${ICON_SIZES.length}  (favicon → PWA → Apple → .ico)`);
console.log(`  Social to render: ${SOCIAL_SIZES.length}  (avatar, banner, LinkedIn, OG)`);
console.log(`\n  → run with --write to emit docs/brand/{tokens.css,palette.json,icon-manifest.json,site.webmanifest,head-snippet.html}`);
console.log(`  → run with --json for the full machine-readable kit`);
