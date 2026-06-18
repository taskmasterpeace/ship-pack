#!/usr/bin/env node
// render-demo.mjs — render docs/demo/script.md into a self-contained, themeable
// presenter page (docs/demo/script.html) for the ship-demo skill.
//
// The HTML is a "teleprompter" for live demos: each step is a card with WHERE to go,
// WHAT to say, WHAT to show, and the reset/recovery notes. It is keyboard-drivable
// (←/→ to move, F to focus one step) and works with zero JS. Theming comes ONLY from
// docs/brand.json (:root CSS variables) — never an invented palette, never purple by
// default. No backdrop-filter, no SVG feTurbulence (both hang/janky in renderers).
//
// Usage:
//   node render-demo.mjs [--in docs/demo/script.md] [--out docs/demo/script.html] [--brand docs/brand.json]
//
// The markdown contract it expects (the skill writes it; see references/script-template.md):
//   # <Title>
//   <intro paragraph(s)>
//   ## 1. <Step title> — <est time>
//   **Go to:** ...      **Say:** ...      **Show:** ...      **Reset:** ...
// Any "## N. ..." heading starts a step card; the bold labels become rows. Unstructured
// markdown still renders (as a plain step body), so a hand-edited script won't break.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const IN = opt("--in", "docs/demo/script.md");
const OUT = opt("--out", "docs/demo/script.html");
const BRAND = opt("--brand", "docs/brand.json");
const fail = (m) => { console.error(`render-demo: ${m}`); process.exit(1); };

if (!existsSync(IN)) fail(`script not found at ${IN} — write it first (see references/script-template.md)`);
const md = readFileSync(IN, "utf8");

// ---- brand → CSS variables (neutral slate default; NEVER purple) ------------
const FALLBACK = {
  bg: "#0d1117", surface: "#161b22", border: "#283040", "border-soft": "#1d242f",
  text: "#e6edf3", muted: "#9aa7b5", heading: "#f4f8fd",
  brand: "#2f81f7", accent: "#ffb454", grid: "rgba(120,170,255,.045)",
};
let brand = {};
if (existsSync(BRAND)) { try { brand = JSON.parse(readFileSync(BRAND, "utf8")); } catch { /* keep fallback */ } }
const c = { ...FALLBACK, ...(brand.colors || {}) };
// guard: if someone supplies a purple brand we still honor it (explicit), but the DEFAULT is slate-blue.
const fonts = brand.fonts || {};
const display = fonts.display || "system-ui";
const body = fonts.body || "system-ui";
const mono = fonts.mono || "ui-monospace, SFMono-Regular, Menlo, monospace";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

// ---- parse markdown into title, intro, steps --------------------------------
const lines = md.split(/\r?\n/);
let title = "Demo Script";
const intro = [];
const steps = [];
let cur = null;
const LABELS = ["go to", "say", "show", "do", "reset", "watch out", "note", "if it breaks"];

for (const raw of lines) {
  const l = raw.trimEnd();
  const h1 = l.match(/^#\s+(.*)/);
  const h2 = l.match(/^##\s+(.*)/);
  if (h1) { title = h1[1].trim(); continue; }
  if (h2) {
    cur = { title: h2[1].trim(), rows: [], body: [] };
    steps.push(cur);
    continue;
  }
  if (!l.trim()) { if (cur) cur.body.push(""); continue; }
  const bold = l.match(/^\*\*([^:*]+):\*\*\s*(.*)/);
  if (cur && bold && LABELS.includes(bold[1].trim().toLowerCase())) {
    cur.rows.push({ k: bold[1].trim(), v: bold[2].trim() });
  } else if (cur) {
    cur.body.push(l);
  } else {
    intro.push(l);
  }
}

const ICONS = {
  "go to": "→", "do": "→", "say": "❝", "show": "◉", "reset": "↺",
  "watch out": "!", "if it breaks": "!", "note": "i",
};
const stepCards = steps.map((s, i) => {
  const rows = s.rows.map((r) => {
    const key = r.k.toLowerCase();
    const cls = key === "say" ? "row say" : (key === "reset" || key === "if it breaks" || key === "watch out") ? "row reset" : "row";
    return `<div class="${cls}"><span class="k"><i>${ICONS[key] || "•"}</i>${esc(r.k)}</span><span class="v">${inline(r.v)}</span></div>`;
  }).join("\n");
  const body = s.body.join("\n").trim();
  const bodyHtml = body ? `<div class="body">${body.split(/\n{2,}/).map((p) => `<p>${inline(p.replace(/\n/g, " "))}</p>`).join("")}</div>` : "";
  return `<article class="step" id="step-${i + 1}" tabindex="0">
  <header><span class="num">${i + 1}</span><h2>${inline(s.title)}</h2></header>
  ${rows}${bodyHtml}
</article>`;
}).join("\n");

const introHtml = intro.filter((l) => l.trim()).map((l) => `<p>${inline(l)}</p>`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root{
    --bg:${c.bg};--surface:${c.surface};--border:${c.border};--border-soft:${c["border-soft"]};
    --text:${c.text};--muted:${c.muted};--heading:${c.heading};
    --brand:${c.brand};--accent:${c.accent};--grid:${c.grid};
    --font-display:"${display}",system-ui,sans-serif;--font-body:"${body}",system-ui,sans-serif;--font-mono:${mono};
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);
    line-height:1.55;background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:44px 44px}
  .wrap{max-width:880px;margin:0 auto;padding:48px 22px 96px}
  h1{font-family:var(--font-display);font-weight:800;letter-spacing:-.02em;font-size:clamp(28px,5vw,42px);color:var(--heading);margin:0 0 6px}
  .lede{color:var(--muted);max-width:62ch}
  .lede p{margin:.4em 0}
  .meta{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 30px}
  .pill{font-family:var(--font-mono);font-size:12px;padding:5px 11px;border:1px solid var(--border);border-radius:999px;color:var(--muted);background:var(--surface)}
  .pill b{color:var(--accent);font-weight:600}
  .step{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 22px;margin:16px 0;scroll-margin-top:18px;transition:border-color .2s,transform .2s}
  .step:focus,.step:hover{outline:none;border-color:var(--brand);transform:translateY(-1px)}
  .step:target{border-color:var(--brand);box-shadow:0 0 0 1px var(--brand)}
  .step header{display:flex;align-items:center;gap:14px;margin:0 0 14px}
  .num{flex:0 0 auto;width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:var(--brand);color:#fff;font-family:var(--font-mono);font-weight:700;font-size:15px}
  .step h2{font-family:var(--font-display);font-weight:700;font-size:19px;color:var(--heading);margin:0;letter-spacing:-.01em}
  .row{display:grid;grid-template-columns:96px 1fr;gap:14px;padding:8px 0;border-top:1px solid var(--border-soft)}
  .row .k{display:flex;align-items:center;gap:7px;font-family:var(--font-mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .row .k i{width:18px;height:18px;display:grid;place-items:center;border-radius:6px;background:var(--bg);border:1px solid var(--border);font-style:normal;font-size:11px;color:var(--brand)}
  .row .v{color:var(--text)}
  .row.say .v{color:var(--heading);font-size:16px;border-left:2px solid var(--accent);padding-left:12px;font-style:italic}
  .row.reset .k i{color:var(--accent);border-color:var(--accent)}
  .body{color:var(--muted);font-size:14px;padding-top:8px}
  .body p{margin:.45em 0}
  code{font-family:var(--font-mono);font-size:.86em;background:var(--bg);border:1px solid var(--border-soft);border-radius:5px;padding:1px 6px;color:var(--accent)}
  a{color:var(--brand)}
  footer{margin-top:36px;color:var(--muted);font-size:12px;text-align:center;font-family:var(--font-mono)}
  kbd{font-family:var(--font-mono);font-size:11px;background:var(--surface);border:1px solid var(--border);border-bottom-width:2px;border-radius:5px;padding:1px 6px}
  @media print{body{background:#fff;color:#000}.step{break-inside:avoid;border-color:#ccc}.meta,footer{display:none}}
</style>
</head>
<body>
<div class="wrap">
  <h1>${esc(title)}</h1>
  <div class="lede">${introHtml}</div>
  <div class="meta">
    <span class="pill"><b>${steps.length}</b> steps</span>
    <span class="pill">Move <kbd>←</kbd> <kbd>→</kbd></span>
    <span class="pill">Focus a step <kbd>F</kbd></span>
    <span class="pill">Print to PDF for a handout</span>
  </div>
  ${stepCards}
  <footer>Generated by the ship-demo skill · pairs with the seed script · theme from docs/brand.json</footer>
</div>
<script>
// Optional keyboard nav (page is fully usable without it).
(function(){
  var steps=[].slice.call(document.querySelectorAll('.step'));var i=-1;
  function focus(n){i=Math.max(0,Math.min(steps.length-1,n));steps[i].focus();steps[i].scrollIntoView({behavior:'smooth',block:'center'});}
  document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT')return;
    if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();focus(i+1);}
    else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();focus(i-1);}
    else if(e.key.toLowerCase()==='f'){e.preventDefault();focus(i<0?0:i);}
  });
})();
</script>
</body>
</html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log(`render-demo: wrote ${OUT}  (${steps.length} steps${brand.name ? `, themed "${brand.name}"` : ", default slate theme"})`);
