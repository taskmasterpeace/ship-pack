#!/usr/bin/env node
// render-press.mjs — render the markdown press release into a self-contained, on-brand HTML page.
//
// Dependency-free markdown→HTML for the subset a press release uses (headings, paragraphs,
// lists, blockquotes, tables, em/strong/code/links, hr). Themed from docs/brand.json via
// :root CSS variables — one brand file, every output on-brand. Falls back to a NEUTRAL slate
// theme (never purple) when no brand.json is present.
//
// Hard rules baked in: no backdrop-filter, no SVG feTurbulence (both hang renderers).
// The whole page is one file, no external CSS/JS except an optional web-font link.
//
// Render verification: the press release is DESIGNED to carry honest [ADD …] / [CONFIRM …]
// placeholders (no fabricated quotes/metrics/contact). This renderer therefore SCANS the
// generated HTML for any remaining placeholder tokens and (a) prints an explicit
// "HTML still contains N placeholder(s)" line, (b) embeds a machine-readable HTML comment
// listing them, and (c) exits non-zero (unless --allow-placeholders) so a kit is never
// silently published with raw [ADD CONTACT] in it. This is a guard, not a failure: the
// fix is to fill the placeholders, then re-render.
//
// Usage:
//   node render-press.mjs --in docs/press/release.md --out docs/press/release.html \
//        [--brand docs/brand.json] [--version docs/VERSION] [--allow-placeholders]
//
// Part of the ship-press skill / the "ship" pack.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const IN = opt("--in", "docs/press/release.md");
const OUT = opt("--out", "docs/press/release.html");
const BRAND = opt("--brand", "docs/brand.json");
const VFILE = opt("--version", "docs/VERSION");
const ALLOW_PLACEHOLDERS = args.includes("--allow-placeholders");

if (!existsSync(IN)) { console.error(`render-press: input not found: ${IN} — write the release markdown first.`); process.exit(1); }

// ---------- theme tokens (neutral slate default — NEVER purple) ----------
const DEFAULTS = {
  bg: "#0b0e13", surface: "#141922", border: "#252d3a", "border-soft": "#1b212c",
  text: "#e6ecf4", muted: "#94a3b8", heading: "#f4f8fd",
  brand: "#3b82f6", accent: "#f5b53d", "accent-ink": "#9fc4ff",
  grid: "rgba(255,255,255,.022)",
};
const FONT_DEFAULTS = { display: "Bricolage Grotesque", body: "Hanken Grotesk", mono: "JetBrains Mono" };
const fontStack = (name, kind) =>
  `"${name}",${kind === "mono" ? 'ui-monospace,"SFMono-Regular",monospace' : "ui-sans-serif,system-ui,sans-serif"}`;
function buildRootCss(brand) {
  const t = { ...DEFAULTS };
  if (brand && brand.colors) for (const [k, v] of Object.entries(brand.colors)) t[k] = v;
  const fonts = resolveFonts(brand);
  const lines = Object.entries(t).map(([k, v]) => `    --${k}:${v};`);
  lines.push(`    --font-display:${fontStack(fonts.display, "display")};`);
  lines.push(`    --font-body:${fontStack(fonts.body, "body")};`);
  lines.push(`    --font-mono:${fontStack(fonts.mono, "mono")};`);
  return `  :root{\n${lines.join("\n")}\n  }`;
}

// Resolve the three font roles once — both the :root tokens AND the Google Fonts <link>
// must read from the SAME object, or a custom-font brand silently falls back to system
// fonts (the webfont is themed in CSS but never fetched).
function resolveFonts(brand) {
  return { ...FONT_DEFAULTS, ...((brand && brand.fonts) || {}) };
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

// ---------- placeholder scan (render verification) ----------
// Matches the skill's honest-placeholder convention: bracketed ALL-CAPS tokens that start
// with ADD or CONFIRM, e.g. [ADD CONTACT], [ADD METRIC], [ADD CUSTOMER QUOTE],
// [CONFIRM SHIP STATUS], [CONFIRM MAKER NAME]. Case-tolerant on the verb, but the token
// must look like a real placeholder (caps/spaces/digits only) so prose brackets don't match.
const PLACEHOLDER_RE = /\[(?:ADD|CONFIRM)(?:\s+[A-Z0-9][A-Z0-9 /-]*)?\]/gi;
function scanPlaceholders(text) {
  const counts = new Map();
  for (const m of text.matchAll(PLACEHOLDER_RE)) {
    const token = m[0].toUpperCase().replace(/\s+/g, " ").trim();
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  const items = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const total = items.reduce((n, [, c]) => n + c, 0);
  return { total, items }; // items: [ [token, count], … ]
}

// ---------- minimal markdown -> html ----------
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
  return text;
}
function renderList(items) {
  const base = items[0].match(/^(\s*)/)[1].length;
  const ordered = /^\s*\d+\./.test(items[0]);
  let html = ordered ? "<ol>" : "<ul>", i = 0;
  while (i < items.length) {
    const m = items[i].match(/^(\s*)(?:[-*+]|\d+\.)\s+(.*)$/);
    let li = `<li>${inline(m[2])}`;
    const kids = [];
    while (i + 1 < items.length) {
      const mn = items[i + 1].match(/^(\s*)(?:[-*+]|\d+\.)\s+/);
      if (mn && mn[1].length > base) { kids.push(items[i + 1]); i++; } else break;
    }
    if (kids.length) li += renderList(kids);
    html += li + "</li>"; i++;
  }
  return html + (ordered ? "</ol>" : "</ul>");
}
function render(md) {
  md = md.replace(/<!--[\s\S]*?-->/g, "");
  const lines = md.split(/\r?\n/), out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    if (/^\s*```/.test(line)) { i++; const c = []; while (i < lines.length && !/^\s*```/.test(lines[i])) { c.push(lines[i]); i++; } i++; out.push(`<pre><code>${esc(c.join("\n"))}</code></pre>`); continue; }
    if (/^\s*([-*_])\1\1[-*_\s]*$/.test(line)) { out.push("<hr>"); i++; continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { const lvl = h[1].length, txt = h[2].replace(/\s*#+\s*$/, "").trim(); out.push(`<h${lvl} id="${slug(txt)}">${inline(txt)}</h${lvl}>`); i++; continue; }
    if (/^\s*>/.test(line)) { const q = []; while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, "")); i++; } out.push(`<blockquote>${inline(q.join(" "))}</blockquote>`); continue; }
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*$/.test(lines[i + 1])) {
      const row = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = row(line); i += 2; const body = [];
      while (i < lines.length && lines[i].includes("|") && !/^\s*$/.test(lines[i])) { body.push(row(lines[i])); i++; }
      let t = '<div class="tw"><table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>";
      for (const rr of body) t += "<tr>" + rr.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>";
      out.push(t + "</tbody></table></div>"); continue;
    }
    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      const items = [];
      while (i < lines.length) {
        if (/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i])) { items.push(lines[i]); i++; }
        else if (!/^\s*$/.test(lines[i]) && /^\s+\S/.test(lines[i])) { items[items.length - 1] += " " + lines[i].trim(); i++; }
        else break;
      }
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
const brand = existsSync(BRAND) ? (() => { try { return JSON.parse(readFileSync(BRAND, "utf8")); } catch { return null; } })() : null;
const version = existsSync(VFILE) ? readFileSync(VFILE, "utf8").trim() : "";
const product = (brand && brand.name) || (md.match(/^#\s+(.*)$/m) || [, "Press Release"])[1].replace(/—.*$/, "").trim();
const initial = (product.trim()[0] || "•").toUpperCase();
const body = render(md);

// Render verification: scan the rendered HTML for unfilled honest placeholders.
const ph = scanPlaceholders(body);
const phComment = ph.total
  ? `\n<!-- ship-press: HTML still contains ${ph.total} placeholder(s) — fill before distribution:\n` +
    ph.items.map(([t, c]) => `     ${t}${c > 1 ? ` ×${c}` : ""}`).join("\n") +
    `\n-->`
  : `\n<!-- ship-press: no [ADD …] / [CONFIRM …] placeholders remaining. -->`;

const html = `<!DOCTYPE html>
<!-- Press release / launch page. Rendered by ship-press/scripts/render-press.mjs from
     docs/press/release.md + docs/brand.json. Self-contained: no external CSS/JS, no
     backdrop-filter, no SVG turbulence. Theme via the :root tokens below. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(product)} — Press Release</title>
${buildFontLink(brand)}
<style>
${buildRootCss(brand)}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:17px;line-height:1.72;
    -webkit-font-smoothing:antialiased;letter-spacing:-0.006em;
    background-image:
      radial-gradient(120% 60% at 50% -10%, color-mix(in oklab,var(--brand) 13%, transparent), transparent 62%),
      linear-gradient(var(--grid) 1px,transparent 1px),
      linear-gradient(90deg,var(--grid) 1px,transparent 1px);
    background-size:auto,32px 32px,32px 32px;background-attachment:fixed,fixed,fixed}
  a{color:var(--brand);text-decoration:none}
  a:hover{text-decoration:underline}
  .wrap{max-width:46rem;margin:0 auto;padding:0 1.3rem 6rem}
  header.masthead{display:flex;align-items:center;gap:.7rem;padding:1.8rem 0 1.2rem;border-bottom:1px solid var(--border-soft)}
  .logo{width:2rem;height:2rem;border-radius:8px;background:var(--brand);display:grid;place-items:center;
    color:#fff;font-family:var(--font-display);font-weight:700;font-size:1.05rem;flex:none}
  .brandname{font-family:var(--font-display);font-weight:700;color:var(--heading);font-size:1.1rem;letter-spacing:-0.02em}
  .kicker{margin-left:auto;font-family:var(--font-mono);font-size:.72rem;color:var(--accent-ink);text-transform:uppercase;letter-spacing:.12em}
  .ver{font-family:var(--font-mono);font-size:.72rem;color:var(--brand);border:1px solid color-mix(in oklab,var(--brand) 40%,var(--border));
    border-radius:6px;padding:.08rem .45rem;margin-left:.5rem;background:color-mix(in oklab,var(--brand) 10%,transparent)}
  .content{padding:2.2rem 0 0}
  .content :where(h1,h2,h3){font-family:var(--font-display);color:var(--heading);letter-spacing:-0.025em;line-height:1.16}
  .content h1{font-size:clamp(1.9rem,5vw,2.6rem);margin:.2rem 0 1rem}
  .content h2{font-size:1.4rem;margin:2.4rem 0 .8rem;padding-top:1.4rem;border-top:1px solid var(--border-soft)}
  .content h3{font-size:1.1rem;margin:1.6rem 0 .5rem}
  .content p{margin:.9rem 0}
  .content strong{color:var(--heading);font-weight:700}
  .content blockquote{margin:1.4rem 0;padding:1rem 1.2rem;border-left:3px solid var(--brand);
    background:color-mix(in oklab,var(--brand) 7%,var(--surface));border-radius:0 10px 10px 0;color:var(--text);font-style:italic}
  .content ul,.content ol{margin:.8rem 0;padding-left:1.3rem}
  .content li{margin:.4rem 0}
  .content li::marker{color:var(--brand)}
  .content code{font-family:var(--font-mono);font-size:.86em;background:var(--surface);border:1px solid var(--border-soft);
    border-radius:5px;padding:.08em .35em;color:var(--accent-ink)}
  .content pre{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1rem;overflow:auto}
  .content pre code{border:0;background:none;padding:0;color:var(--text)}
  .content hr{border:0;border-top:1px solid var(--border-soft);margin:2.2rem 0}
  .content img{max-width:100%;border:1px solid var(--border);border-radius:12px;margin:1rem 0}
  .tw{overflow:auto;margin:1.2rem 0}
  table{border-collapse:collapse;width:100%;font-size:.92rem}
  th,td{text-align:left;padding:.55rem .8rem;border-bottom:1px solid var(--border-soft)}
  th{color:var(--heading);font-family:var(--font-display)}
  footer{margin-top:3rem;padding-top:1.4rem;border-top:1px solid var(--border-soft);color:var(--muted);font-size:.85rem}
  .ph-banner{margin:1.4rem 0 0;padding:.7rem 1rem;border:1px solid color-mix(in oklab,var(--accent) 55%,var(--border));
    border-radius:10px;background:color-mix(in oklab,var(--accent) 12%,var(--surface));color:var(--heading);
    font-family:var(--font-mono);font-size:.82rem;line-height:1.5}
  .ph-banner b{color:var(--accent-ink)}
  @media print{body{background:#fff;color:#111}.masthead .kicker,.ver,.ph-banner{display:none}}
</style>
</head>
<body>
  <div class="wrap">
    <header class="masthead">
      <div class="logo">${esc(initial)}</div>
      <div class="brandname">${esc(product)}</div>
      <div class="kicker">Press Release${version ? `<span class="ver">v${esc(version)}</span>` : ""}</div>
    </header>${ph.total ? `
    <div class="ph-banner" role="note">⚠ Draft — this page still contains <b>${ph.total} placeholder${ph.total === 1 ? "" : "s"}</b> (${ph.items.map(([t]) => esc(t)).join(", ")}). Fill them before distributing.</div>` : ""}${phComment}
    <main class="content">
${body}
    </main>
    <footer>${esc(product)}${version ? ` · v${esc(version)}` : ""} · Generated by the ship pack · Public-safe — verify all claims before distribution.</footer>
  </div>
</body>
</html>
`;

writeFileSync(OUT, html, "utf8");
console.log(`render-press: wrote ${OUT}  (v${version || "?"}, ${brand ? "themed from " + BRAND : "neutral default theme"})`);

// Render verification line — always printed, so step 6's report can quote it.
if (ph.total) {
  console.log(`render-press: HTML still contains ${ph.total} placeholder(s) — fill before distribution:`);
  for (const [t, c] of ph.items) console.log(`  - ${t}${c > 1 ? ` (×${c})` : ""}`);
  if (!ALLOW_PLACEHOLDERS) {
    console.error(`render-press: refusing to certify as final (exit 3). Fill the placeholders and re-render, or pass --allow-placeholders to render a labelled DRAFT.`);
    process.exit(3);
  }
  console.log(`render-press: --allow-placeholders set — rendered as a DRAFT with a visible warning banner.`);
} else {
  console.log(`render-press: HTML still contains 0 placeholders — clean to distribute.`);
}
