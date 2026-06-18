#!/usr/bin/env node
// scan-assets.mjs — discover what brand assets already exist before generating a kit.
//
// Answers the ship-brand DISCOVERY step: is there a brand.json? a docs/VERSION? prior
// ship-brand output in docs/brand/? existing favicons / app icons / OG images / web manifests
// already living in the app's public folder? It prints a report so the skill REUSES and
// EXTENDS rather than blindly overwriting. Dependency-free, bounded (no deep recursive walk).
//
// Usage:  node scan-assets.mjs [--root .] [--json]

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const ROOT = (() => { const i = args.indexOf("--root"); return i !== -1 ? args[i + 1] : "."; })();
const JSON_OUT = args.includes("--json");

const exists = (p) => existsSync(join(ROOT, p));
const firstExisting = (list) => list.find(exists) || null;

// --- inputs the kit derives from
const brandJson = firstExisting(["docs/brand.json", "brand.json", "brand/brand.json", ".brand.json"]);
const versionFile = exists("docs/VERSION") ? "docs/VERSION" : null;
const version = versionFile ? safeRead(versionFile) : null;
let brand = null;
if (brandJson) { try { brand = JSON.parse(readFileSync(join(ROOT, brandJson), "utf8")); } catch {} }

function safeRead(p) { try { return readFileSync(join(ROOT, p), "utf8").trim(); } catch { return null; } }

// --- prior ship-brand output
const PRIOR_OUTPUTS = [
  "docs/brand/tokens.css", "docs/brand/palette.json", "docs/brand/icon-manifest.json",
  "docs/brand/site.webmanifest", "docs/brand/head-snippet.html", "docs/brand/brand-kit.html",
];
const priorOutputs = PRIOR_OUTPUTS.filter(exists);

// --- existing brand assets already shipped in the app
const ICON_PATTERN = /(favicon|apple-touch-icon|icon-\d+|maskable|og[-_]?image|og-|opengraph|avatar|banner|social|share)/i;
const IMG = /\.(png|svg|ico|jpe?g|webp)$/i;
// A *shipped web* manifest is site.webmanifest, manifest.webmanifest, or a bare manifest.json —
// NOT this kit's own docs/brand/icon-manifest.json (which is the icon SPEC we generate, not a
// PWA manifest the app already ships). Match only the real names so discovery never claims the
// app ships a manifest that ship-brand itself wrote.
const MANIFEST = /(^|\/)(site\.webmanifest|manifest\.webmanifest|manifest\.json)$/i;
// The kit's OWN output dir. ship-brand writes site.webmanifest + icons under docs/brand/ on every
// --write. Those are OUR generated files, not assets the app already ships, so the SHIPPED-asset
// scans (icons, manifests) must exclude anything under here — otherwise the second run re-reports
// docs/brand/site.webmanifest and docs/brand/icons/* as pre-existing app assets, which would lie
// exactly the way the manifest comment above promises it won't. (Prior-output and logo detection
// below DO look inside docs/brand/ on purpose — that's how we surface what we wrote last time.)
const OUTPUT_DIR = "docs/brand";
const underOutputDir = (relPath) =>
  relPath === OUTPUT_DIR || relPath.replace(/\\/g, "/").startsWith(OUTPUT_DIR + "/");
// Logos a prior logo-pack run dropped — the PREFERRED image source (Adapter A). Square marks
// resize cleanly into every icon size, so finding one steers the recommendation, not just prose.
const LOGO_DIRS = ["docs/brand/logos", "docs/logos", "public/logos", "assets/logos", "brand/logos"];
const LOGO_IMG = /\.(png|svg|webp|jpe?g)$/i;

// Dirs to walk for assets the APP ships. Note: docs/brand and docs/brand/icons are intentionally
// NOT here — that's ship-brand's own output dir (handled by PRIOR_OUTPUTS + the underOutputDir
// guard), and scanning it for "shipped" icons/manifests would mis-report our own generated files.
let ASSET_DIRS = [
  "public", "public/images", "public/icons", "public/img", "public/static",
  "app", "src/app", "static", "assets",
];
for (const base of ["packages", "apps"]) {
  const baseAbs = join(ROOT, base);
  if (exists(base) && statSync(baseAbs).isDirectory()) {
    for (const pkg of readdirSync(baseAbs)) {
      ASSET_DIRS.push(`${base}/${pkg}/public`, `${base}/${pkg}/public/images`, `${base}/${pkg}/src/app`, `${base}/${pkg}/app`);
    }
  }
}

function scanDir(rel, test) {
  const dir = join(ROOT, rel);
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter((f) => test(f)).map((f) => `${rel}/${f}`);
  } catch { return []; }
}
// Shipped icons + manifests: scan ASSET_DIRS, then drop anything under our own output dir so a
// re-run never re-reports the site.webmanifest / icons that ship-brand --write just produced.
const existingIcons = [...new Set(ASSET_DIRS.flatMap((d) => scanDir(d, (f) => IMG.test(f) && ICON_PATTERN.test(f))))]
  .filter((p) => !underOutputDir(p)).sort();
// Match the manifest regex against the full relative path so the leading-slash anchor works.
const existingManifests = [...new Set(ASSET_DIRS.flatMap((d) => scanDir(d, (f) => MANIFEST.test(`${d}/${f}`))))]
  .filter((p) => !underOutputDir(p)).sort();
const existingLogos = [...new Set(LOGO_DIRS.flatMap((d) => scanDir(d, (f) => LOGO_IMG.test(f))))].sort();

const report = {
  root: ROOT,
  brandJson,
  brandName: brand?.name ?? null,
  brandColors: brand?.colors ? Object.keys(brand.colors).length : 0,
  brandFonts: brand?.fonts ? Object.keys(brand.fonts) : [],
  version,
  priorOutputs,
  existingIcons,
  existingManifests,
  existingLogos,
  recommendation: !brandJson
    ? "no brand.json — run `brand-kit.mjs --init` to scaffold one, then fill in colors/fonts"
    : priorOutputs.length
      ? `kit exists — re-derive (brand-kit.mjs --write) to refresh; only re-generate images that changed${existingLogos.length ? "; logo found → resize the square mark per Adapter A" : ""}`
      : existingIcons.length
        ? "brand.json present, app already ships some icons — derive the kit, then fill gaps (missing sizes/social/OG)"
        : existingLogos.length
          ? "brand.json + logo present — derive (brand-kit.mjs --write), then use Adapter A: resize the square mark from the logo dir into every icon size (cleanest path)"
          : "brand.json present, no kit/logo yet — derive (brand-kit.mjs --write), then generate images (run ship-logos first for a reusable mark)",
};

if (JSON_OUT) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

console.log(`Asset scan  (root: ${ROOT})`);
console.log(`  brand.json     : ${brandJson || "— none —"}${report.brandName ? `  (${report.brandName}, ${report.brandColors} colors)` : ""}`);
console.log(`  fonts          : ${report.brandFonts.length ? report.brandFonts.join(", ") : "— none —"}`);
console.log(`  docs/VERSION   : ${version || "— none —"}`);
console.log(`  prior kit      : ${priorOutputs.length ? "" : "— none —"}`);
for (const p of priorOutputs) console.log(`    • ${p}`);
console.log(`  existing icons : ${existingIcons.length ? "" : "— none —"}`);
for (const i of existingIcons) console.log(`    • ${i}`);
console.log(`  web manifests  : ${existingManifests.length ? existingManifests.join(", ") : "— none —"}`);
console.log(`  logos (reuse)  : ${existingLogos.length ? "" : "— none —"}`);
for (const l of existingLogos) console.log(`    • ${l}`);
console.log(`\n  → recommendation: ${report.recommendation}`);
