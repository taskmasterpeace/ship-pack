#!/usr/bin/env node
/**
 * render-one-pager.mjs — render the investor one-pager markdown into a single-file,
 * print-friendly, themeable HTML page. Themed entirely from docs/brand.json (colors +
 * fonts) via :root CSS variables. Typography is fully themeable: the Google Fonts <link>
 * is built dynamically from brand.fonts (display/body/mono) — the SAME object that sets
 * the --font-* tokens — so a custom-font brand actually fetches its fonts instead of
 * silently falling back to system fonts. System/generic families are skipped (no needless
 * fetch). Self-contained (no build step, fonts via CDN with a system fallback). NEVER
 * purple by default; NEVER uses backdrop-filter or feTurbulence.
 *
 * Usage (from the repo root):
 *   node render-one-pager.mjs --in docs/pitch/one-pager.md --out docs/pitch/one-pager.html \
 *        [--brand docs/brand.json] [--version docs/VERSION]
 *
 * Dependency-free markdown subset (headings, lists, tables, blockquotes, hr, code, inline).
 * Part of the ship-pitch skill / the "ship" pack.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const IN = opt("--in");
const OUT = opt("--out");
const BRAND = opt("--brand", "docs/brand.json");
const VFILE = opt("--version", "docs/VERSION");

if (!IN || !OUT) {
  console.error("usage: render-one-pager.mjs --in <one-pager.md> --out <out.html> [--brand docs/brand.json] [--version docs/VERSION]");
  process.exit(1);
}
if (!existsSync(IN)) { console.error(`render-one-pager: input not found: ${IN}`); process.exit(1); }

// ---------- theme tokens (neutral defaults — NEVER purple) ----------
const DEFAULTS = {
  bg: "#0b0d10", surface: "#13171e", "border": "#232a33", "border-soft": "#1b212a",
  text: "#e7edf3", muted: "#90a0b0", heading: "#f5f9fd",
  brand: "#3a86ff", accent: "#ffc24b", "accent-ink": "#9fd0e8",
  grid: "rgba(255,255,255,.025)", radius: "14px", maxw: "60rem",
};
const FONT_DEFAULTS = { display: "Bricolage Grotesque", body: "Hanken Grotesk", mono: "JetBrains Mono" };
const fontStack = (name, kind) =>
  `"${name}",${kind === "mono" ? 'ui-monospace,"SFMono-Regular",monospace' : "ui-sans-serif,system-ui,sans-serif"}`;

// Resolve the three font roles once — both the :root tokens AND the Google Fonts <link>
// must read from the SAME object, or a custom-font brand silently falls back to system
// fonts (the webfont is themed in CSS but never fetched).
function resolveFonts(brand) {
  return { ...FONT_DEFAULTS, ...((brand && brand.fonts) || {}) };
}

function buildRootCss(brand) {
  const tokens = { ...DEFAULTS };
  if (brand && brand.colors) for (const [k, v] of Object.entries(brand.colors)) tokens[k] = v;
  const fonts = resolveFonts(brand);
  const lines = Object.entries(tokens).map(([k, v]) => `    --${k}:${v};`);
  lines.push(`    --font-display:${fontStack(fonts.display, "display")};`);
  lines.push(`    --font-body:${fontStack(fonts.body, "body")};`);
  lines.push(`    --font-mono:${fontStack(fonts.mono, "mono")};`);
  return `  :root{\n${lines.join("\n")}\n  }`;
}

// ---------- Google Fonts <link>, built from brand.fonts (NOT hardcoded) ----------
// A generic/system family (e.g. "system-ui", "Arial", "monospace") is NOT on Google
// Fonts, so we skip it — the CSS stack already falls back to it. Bricolage Grotesque
// keeps its optical-size axis; everything else gets a sensible weight range per role.
const SYSTEM_FONTS = new Set([
  "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded",
  "sans-serif", "serif", "monospace", "-apple-system", "blinkmacsystemfont",
  "segoe ui", "arial", "helvetica", "helvetica neue", "times", "times new roman",
  "georgia", "courier", "courier new", "menlo", "consolas", "sf mono", "sfmono-regular",
  "tahoma", "verdana", "roboto",
]);
const isWebFont = (name) => !!name && !SYSTEM_FONTS.has(String(name).trim().toLowerCase());
const familySpec = (name, kind) => {
  const fam = String(name).trim().replace(/\s+/g, "+");
  if (kind === "display") {
    // Optical-size axis for Bricolage; a plain weight range for any other display face.
    return /^bricolage\+grotesque$/i.test(fam)
      ? `${fam}:opsz,wght@12..96,400..800`
      : `${fam}:wght@400;500;600;700;800`;
  }
  if (kind === "mono") return `${fam}:wght@400;500;600`;
  return `${fam}:wght@400;500;600;700`; // body
};

// Returns the <link> tags (with preconnect) or "" if no web font is requested.
function buildFontLink(brand) {
  const fonts = resolveFonts(brand);
  const roles = [
    [fonts.display, "display"],
    [fonts.body, "body"],
    [fonts.mono, "mono"],
  ];
  const families = [];
  const seen = new Set();
  for (const [name, kind] of roles) {
    if (!isWebFont(name)) continue;
    const key = String(name).trim().toLowerCase();
    if (seen.has(key)) continue; // de-dupe shared faces (e.g. display === body)
    seen.add(key);
    families.push(familySpec(name, kind));
  }
  if (!families.length) return ""; // all-system brand: nothing to fetch
  const href = `https://fonts.googleapis.com/css2?${families.map((f) => "family=" + f).join("&")}&display=swap`;
  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link href="${href}" rel="stylesheet">`,
  ].join("\n");
}

// ---------- markdown -> html (common subset) ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

function inline(text) {
  const codes = [];
  text = text.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `@@C${codes.length - 1}@@`; });
  text = esc(text);
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, a, h) => `<img src="${h}" alt="${a}" loading="lazy">`);
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, h) => `<a href="${h}">${t}</a>`);
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  text = text.replace(/@@C(\d+)@@/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
  // Visually flag EVERY placeholder token the spec emits so no fake number can ship.
  // Canonical set: TRACTION, METRIC, TBD, ASK, SOURCE, CONTACT, TEAM, MODEL, PLACEHOLDER.
  // Plus a catch-all for any [WORD: ...] colon-form token, so a new token still gets the
  // dashed-pill treatment. SCREENSHOT is a deck-visual marker, not a blank — leave it plain.
  const PH_TOKENS = /^\[(TRACTION|METRIC|TBD|ASK|SOURCE|CONTACT|TEAM|MODEL|PLACEHOLDER)\b/i;
  text = text.replace(/\[[A-Z][A-Z0-9_]*\s*:[^\]]*\]|\[(?:TBD|PLACEHOLDER|TRACTION|METRIC|ASK|SOURCE|CONTACT|TEAM|MODEL)\]/gi, (m) => {
    if (/^\[SCREENSHOT\b/i.test(m)) return m;                 // visual marker, not a placeholder
    if (!PH_TOKENS.test(m) && !/^\[[A-Z][A-Z0-9_]*\s*:/.test(m)) return m;
    return `<span class="ph">${esc(m)}</span>`;
  });
  return text;
}

function renderList(items) {
  const ordered = /^\s*\d+\./.test(items[0]);
  let html = ordered ? "<ol>" : "<ul>";
  for (const it of items) {
    const m = it.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/);
    html += `<li>${inline(m ? m[1] : it)}</li>`;
  }
  return html + (ordered ? "</ol>" : "</ul>");
}

function render(md) {
  md = md.replace(/<!--[\s\S]*?-->/g, "");
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    if (/^\s*```/.test(line)) { i++; const code = []; while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i++; } i++; out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`); continue; }
    if (/^\s*([-*_])\1\1[-*_\s]*$/.test(line)) { out.push("<hr>"); i++; continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { const lvl = h[1].length, txt = h[2].replace(/\s*#+\s*$/, "").trim(); out.push(`<h${lvl} id="${slug(txt)}">${inline(txt)}</h${lvl}>`); i++; continue; }
    if (/^\s*>/.test(line)) { const q = []; while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, "")); i++; } out.push(`<blockquote>${inline(q.join(" "))}</blockquote>`); continue; }
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*$/.test(lines[i + 1])) {
      const row = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = row(line); i += 2; const body = [];
      while (i < lines.length && lines[i].includes("|") && !/^\s*$/.test(lines[i])) { body.push(row(lines[i])); i++; }
      let t = '<div class="table-wrap"><table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>";
      for (const r of body) t += "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>";
      out.push(t + "</tbody></table></div>"); continue;
    }
    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i])) { items.push(lines[i]); i++; }
      out.push(renderList(items)); continue;
    }
    const buf = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*(#{1,6}\s|>|```|([-*_])\2\2)/.test(lines[i]) && !/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i])) { buf.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

// ---------- assemble ----------
const md = readFileSync(IN, "utf8");
const brand = existsSync(BRAND) ? JSON.parse(readFileSync(BRAND, "utf8")) : null;
const version = existsSync(VFILE) ? readFileSync(VFILE, "utf8").trim() : "";
const updated = new Date().toISOString().slice(0, 10);
const h1 = (md.match(/^#\s+(.*)$/m) || [, "One-Pager"])[1].replace(/[—–-].*$/, "").trim();
const product = (brand && brand.name) || h1 || "Pitch";
const tagline = (brand && brand.tagline) || "";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(product)} — Investor One-Pager</title>
${buildFontLink(brand)}
<style>
${buildRootCss(brand)}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;color:var(--text);background:var(--bg);font-family:var(--font-body);
    font-size:16px;line-height:1.62;-webkit-font-smoothing:antialiased;letter-spacing:-0.006em;
    background-image:
      radial-gradient(120% 60% at 50% -10%, color-mix(in oklab, var(--brand) 14%, transparent), transparent 60%),
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size:auto,32px 32px,32px 32px;background-attachment:scroll;min-height:100vh}
  .sheet{max-width:var(--maxw);margin:0 auto;padding:clamp(2rem,5vw,3.6rem) 1.4rem 3.5rem}
  .eyebrow{display:inline-flex;align-items:center;gap:.5rem;font-family:var(--font-mono);font-size:.72rem;
    font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--brand)}
  .eyebrow::before{content:"";width:1.6rem;height:1px;background:var(--brand);opacity:.7}
  h1{font-family:var(--font-display);font-weight:700;color:var(--heading);font-size:clamp(2rem,5.5vw,3rem);
    line-height:1.03;letter-spacing:-0.03em;margin:.6rem 0 .35rem}
  .tagline{color:var(--muted);font-size:1.08rem;margin:0 0 1.4rem;max-width:36rem}
  h2{font-family:var(--font-display);font-weight:700;color:var(--heading);font-size:1.35rem;
    letter-spacing:-0.02em;margin:2.2rem 0 .6rem;padding-top:1.4rem;border-top:1px solid var(--border-soft)}
  h3{font-family:var(--font-display);font-weight:600;color:var(--heading);font-size:1.05rem;margin:1.3rem 0 .4rem}
  p{margin:.5rem 0}
  a{color:var(--accent-ink);text-decoration:none;border-bottom:1px solid color-mix(in oklab,var(--accent-ink) 35%,transparent)}
  ul,ol{margin:.5rem 0 .8rem;padding-left:1.2rem}
  li{margin:.28rem 0}
  strong{color:var(--heading)}
  code{font-family:var(--font-mono);font-size:.86em;background:var(--surface);border:1px solid var(--border-soft);
    border-radius:6px;padding:.08em .4em}
  pre{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;overflow:auto}
  pre code{background:none;border:0;padding:0}
  blockquote{margin:1rem 0;padding:.7rem 1rem;border-left:3px solid var(--brand);background:var(--surface);
    border-radius:0 var(--radius) var(--radius) 0;color:var(--muted)}
  hr{border:0;border-top:1px solid var(--border-soft);margin:2rem 0}
  .table-wrap{overflow:auto;margin:.8rem 0}
  table{border-collapse:collapse;width:100%;font-size:.93rem}
  th,td{text-align:left;padding:.5rem .7rem;border-bottom:1px solid var(--border-soft)}
  th{color:var(--muted);font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}
  .ph{font-family:var(--font-mono);font-size:.82em;color:var(--accent);background:color-mix(in oklab,var(--accent) 12%,transparent);
    border:1px dashed color-mix(in oklab,var(--accent) 55%,var(--border));border-radius:6px;padding:.05em .45em}
  .meta{margin-top:2.5rem;padding-top:1.2rem;border-top:1px solid var(--border-soft);color:var(--muted);
    font-family:var(--font-mono);font-size:.78rem;display:flex;flex-wrap:wrap;gap:1rem}
  @media print{
    body{background:#fff;color:#0b0d10}
    .sheet{max-width:none;padding:0}
    h1,h2,h3,strong,th{color:#0b0d10}
    a{color:#0b3; border:0}
    .meta,blockquote,code,pre,table,th,td{color:#333}
    h2{border-color:#ccc}
  }
</style>
</head>
<body>
  <main class="sheet">
    <span class="eyebrow">Investor One-Pager${version ? " · v" + esc(version) : ""}</span>
    <h1>${esc(product)}</h1>
    ${tagline ? `<p class="tagline">${esc(tagline)}</p>` : ""}
    ${render(md).replace(/^<h1[^>]*>.*?<\/h1>\s*/i, "")}
    <div class="meta">
      <span>${esc(product)}</span>
      ${version ? `<span>v${esc(version)}</span>` : ""}
      <span>Generated ${updated}</span>
      <span>Metrics in [brackets] are unverified placeholders</span>
    </div>
  </main>
</body>
</html>
`;

writeFileSync(OUT, html, "utf8");
const usedFonts = resolveFonts(brand);
const webFonts = [usedFonts.display, usedFonts.body, usedFonts.mono].filter(isWebFont);
console.log(`render-one-pager: wrote ${OUT}  (v${version || "n/a"}${brand ? ", themed from " + BRAND : ", default theme"}; fonts: ${webFonts.length ? [...new Set(webFonts)].join(", ") : "system only"})`);
