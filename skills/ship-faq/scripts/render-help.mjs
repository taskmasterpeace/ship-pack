#!/usr/bin/env node
// render-help.mjs — render docs/FAQ.md into a searchable, themeable, single-file help-center page.
//
// Part of the "ship" pack (ship-faq). Dependency-free. Parses a FAQ markdown file structured as
//   ## <Category>
//   ### <Question>
//   <answer markdown…>
// and produces a self-contained HTML help center: instant client-side search over every Q&A,
// category sidebar + filtering, collapsible answers, and a copy-to-clipboard "permalink" per
// question. Themed entirely from docs/brand.json (colors + fonts) via :root CSS variables.
//
// Self-contained + safe-to-render rules (shared across the pack):
//   - one HTML file, no external build, fonts loaded from Google Fonts only (graceful fallback)
//   - NEVER purple by default; brand defaults are blue/amber
//   - NO backdrop-filter and NO SVG feTurbulence (both hang/freeze some renderers)
//
// Usage:
//   node render-help.mjs --in docs/FAQ.md --out docs/help.html \
//        [--brand docs/brand.json] [--version docs/VERSION] [--replies docs/support-replies.md]
//
// Exit codes: 0 ok, 1 usage/IO error.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };

const IN = opt("--in", "docs/FAQ.md");
const OUT = opt("--out", "docs/help.html");
const BRAND = opt("--brand", "docs/brand.json");
const VFILE = opt("--version", "docs/VERSION");
const REPLIES = opt("--replies", "docs/support-replies.md");

if (!existsSync(IN)) {
  console.error(`render-help: input FAQ not found: ${IN}`);
  console.error(`  write ${IN} first (the ship-faq skill generates it), then re-run.`);
  process.exit(1);
}

// ---------- theme tokens (match the rest of the pack; brand.json overrides) ----------
const DEFAULTS = {
  bg: "#0b0d10", surface: "#13171e", border: "#232a33", "border-soft": "#1b212a",
  text: "#e7edf3", muted: "#90a0b0", heading: "#f5f9fd",
  brand: "#3b82f6", accent: "#f6b73c", "accent-ink": "#9fd0e8",
  grid: "rgba(255,255,255,.025)",
  radius: "14px", maxw: "78rem", "sidebar-w": "16rem",
};
const FONT_DEFAULTS = { display: "Bricolage Grotesque", body: "Hanken Grotesk", mono: "JetBrains Mono" };
const fontStack = (name, kind) =>
  `"${name}",${kind === "mono" ? 'ui-monospace,"SFMono-Regular",monospace' : "ui-sans-serif,system-ui,sans-serif"}`;

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

// ---------- minimal markdown -> html (answers are small blocks) ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 64);
const plain = (s) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*`_#>]/g, "").replace(/\s+/g, " ").trim();

function inline(text) {
  const codes = [];
  text = text.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `@@C${codes.length - 1}@@`; });
  text = esc(text);
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, h) => `<a href="${h.replace(/"/g, "&quot;")}">${t}</a>`);
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  text = text.replace(/@@C(\d+)@@/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
  return text;
}

// Render a small block of answer markdown (paragraphs, lists, fenced code, blockquote).
function renderBlock(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    if (/^\s*```/.test(line)) {
      i++; const code = [];
      while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i++; }
      i++; out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`); continue;
    }
    if (/^\s*>/.test(line)) {
      const q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      out.push(`<blockquote>${inline(q.join(" "))}</blockquote>`); continue;
    }
    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")); i++;
      }
      out.push(`<${ordered ? "ol" : "ul"}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    const buf = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*(```|>|[-*+]\s|\d+\.\s)/.test(lines[i])) { buf.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

// ---------- parse FAQ.md into categories -> [{q, a}] ----------
function parseFaq(md) {
  md = md.replace(/<!--[\s\S]*?-->/g, "");
  const lines = md.split(/\r?\n/);
  const cats = [];
  let cur = null, q = null, buf = [];
  const flushQ = () => {
    if (q && cur) { cur.items.push({ q, a: buf.join("\n").trim() }); }
    q = null; buf = [];
  };
  let intro = [];
  let title = "Help Center";
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    if (h1) { title = plain(h1[1]); continue; }
    if (h2) { flushQ(); cur = { name: plain(h2[1]), id: slug(h2[1]), items: [] }; cats.push(cur); continue; }
    if (h3) { flushQ(); q = plain(h3[1]); continue; }
    if (q) { buf.push(line); }
    else if (cur) { /* category lead text — ignored in cards */ }
    else { intro.push(line); }
  }
  flushQ();
  // drop empty categories
  return { title, intro: intro.join("\n").trim(), cats: cats.filter((c) => c.items.length) };
}

// ---------- assemble ----------
const md = readFileSync(IN, "utf8");
const brand = existsSync(BRAND) ? JSON.parse(readFileSync(BRAND, "utf8")) : null;
const version = existsSync(VFILE) ? readFileSync(VFILE, "utf8").trim() : "0.0.0";
const updated = new Date().toISOString().slice(0, 10);
const { title, intro, cats } = parseFaq(md);

if (!cats.length) {
  console.error("render-help: no questions found. Expect '## Category' then '### Question' headings in the FAQ.");
  process.exit(1);
}

const product = (brand && brand.name) || title.replace(/—.*$/, "").trim() || "Help Center";
const tagline = (brand && brand.tagline) || "";
const totalQ = cats.reduce((n, c) => n + c.items.length, 0);

// search index payload (plain text, for the client matcher)
const index = [];
const sidebar = cats.map((c) =>
  `      <a href="#${c.id}" data-cat="${c.id}">${esc(c.name)} <span class="ct">${c.items.length}</span></a>`
).join("\n");

const sections = cats.map((c) => {
  const cards = c.items.map((it) => {
    const id = slug(c.id + "-" + it.q);
    index.push({ id, cat: c.id, q: it.q, a: plain(it.a).slice(0, 600) });
    return `      <details class="qa" id="${id}" data-cat="${c.id}">
        <summary><span class="q">${inline(it.q)}</span><span class="ico" aria-hidden="true">+</span></summary>
        <div class="a">${renderBlock(it.a)}
          <button class="permalink" data-id="${id}" type="button">Copy link</button>
        </div>
      </details>`;
  }).join("\n");
  return `    <section class="cat" id="${c.id}" data-cat="${c.id}">
      <h2>${esc(c.name)}</h2>
${cards}
    </section>`;
}).join("\n");

const noteHtml = REPLIES && existsSync(REPLIES)
  ? `<p class="ops-note">Support team: canned reply templates live in <code>${esc(REPLIES)}</code>.</p>`
  : "";

const html = `<!DOCTYPE html>
<!-- ${esc(product)} Help Center — rendered by ship-faq/scripts/render-help.mjs from ${esc(IN)} + ${esc(BRAND)}.
     Self-contained and safe to embed; re-themeable via :root variables sourced from brand.json. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(product)} — Help Center</title>
${buildFontLink(brand)}
<style>
${buildRootCss(brand)}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:16px;line-height:1.65;
    -webkit-font-smoothing:antialiased;letter-spacing:-0.006em;
    background-image:
      radial-gradient(120% 60% at 50% -10%, color-mix(in oklab,var(--brand) 13%, transparent), transparent 60%),
      linear-gradient(var(--grid) 1px,transparent 1px),
      linear-gradient(90deg,var(--grid) 1px,transparent 1px);
    background-size:auto,34px 34px,34px 34px;}
  a{color:var(--brand);text-decoration:none}
  a:hover{text-decoration:underline}

  header.hero{max-width:var(--maxw);margin:0 auto;padding:2.6rem 1.4rem 1.2rem;text-align:center}
  .hero h1{font-family:var(--font-display);color:var(--heading);font-size:clamp(2rem,5vw,2.9rem);letter-spacing:-0.03em;margin:0 0 .35rem}
  .hero .tag{color:var(--muted);font-size:1.05rem;margin:0 0 1.3rem}
  .searchbox{position:relative;max-width:40rem;margin:0 auto}
  .searchbox input{width:100%;font:inherit;font-size:1.02rem;color:var(--text);background:var(--surface);
    border:1px solid var(--border);border-radius:12px;padding:.85rem 1rem .85rem 2.7rem;outline:none}
  .searchbox input:focus{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in oklab,var(--brand) 22%,transparent)}
  .searchbox input::placeholder{color:var(--muted)}
  .searchbox svg{position:absolute;left:.95rem;top:50%;transform:translateY(-50%);width:1.15rem;height:1.15rem;stroke:var(--muted)}
  .meta{color:var(--muted);font-size:.84rem;margin:.7rem 0 0;font-family:var(--font-mono)}
  .ver{display:inline-block;font-family:var(--font-mono);font-size:.72rem;color:var(--brand);
    border:1px solid color-mix(in oklab,var(--brand) 40%,var(--border));border-radius:6px;padding:.06rem .42rem;
    background:color-mix(in oklab,var(--brand) 10%,transparent);margin-left:.4rem}

  .layout{max-width:var(--maxw);margin:0 auto;display:grid;grid-template-columns:var(--sidebar-w) minmax(0,1fr);gap:2.2rem;padding:1.4rem 1.4rem 5rem}
  .sidebar{position:sticky;top:1rem;align-self:start;max-height:calc(100vh - 2rem);overflow-y:auto;scrollbar-width:thin}
  .sidebar .lbl{font-family:var(--font-display);color:var(--heading);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;margin:.2rem .65rem .6rem}
  .sidebar nav a{display:flex;justify-content:space-between;align-items:center;gap:.5rem;color:var(--muted);font-size:.88rem;
    padding:.4rem .65rem;border-left:2px solid transparent;border-radius:0 7px 7px 0;transition:color .15s,background .15s,border-color .15s}
  .sidebar nav a:hover{color:var(--text);background:var(--surface);text-decoration:none}
  .sidebar nav a.active{color:var(--heading);border-left-color:var(--brand);background:color-mix(in oklab,var(--brand) 10%,transparent)}
  .sidebar nav a .ct{font-family:var(--font-mono);font-size:.72rem;color:var(--muted);background:var(--surface);border-radius:20px;padding:.02rem .45rem}

  main{min-width:0}
  .cat h2{font-family:var(--font-display);color:var(--heading);font-size:1.4rem;letter-spacing:-0.025em;margin:1.8rem 0 .8rem;scroll-margin-top:1rem}
  .cat:first-child h2{margin-top:.2rem}
  details.qa{background:var(--surface);border:1px solid var(--border);border-radius:12px;margin:.6rem 0;overflow:hidden;scroll-margin-top:1rem}
  details.qa[open]{border-color:color-mix(in oklab,var(--brand) 45%,var(--border))}
  details.qa summary{display:flex;align-items:center;justify-content:space-between;gap:1rem;cursor:pointer;list-style:none;
    padding:.95rem 1.1rem;font-family:var(--font-display);font-weight:600;color:var(--heading);font-size:1.02rem;letter-spacing:-0.01em}
  details.qa summary::-webkit-details-marker{display:none}
  details.qa summary:hover{background:color-mix(in oklab,var(--brand) 6%,transparent)}
  .qa .ico{flex:none;width:1.5rem;height:1.5rem;display:grid;place-items:center;border-radius:7px;color:var(--brand);
    background:color-mix(in oklab,var(--brand) 12%,transparent);font-weight:700;font-size:1.1rem;transition:transform .2s}
  details.qa[open] .ico{transform:rotate(45deg)}
  .qa .a{padding:0 1.1rem 1rem;color:var(--text);border-top:1px solid var(--border-soft)}
  .qa .a > :first-child{margin-top:.85rem}
  .qa .a p{margin:.6rem 0}
  .qa .a ul,.qa .a ol{margin:.6rem 0;padding-left:1.25rem}
  .qa .a li{margin:.3rem 0}
  .qa .a li::marker{color:var(--muted)}
  .qa .a code{font-family:var(--font-mono);font-size:.84em;background:var(--bg);border:1px solid var(--border-soft);border-radius:5px;padding:.08em .35em;color:var(--accent-ink)}
  .qa .a pre{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:.85rem 1rem;overflow:auto;margin:.8rem 0}
  .qa .a pre code{background:none;border:0;padding:0;color:var(--text);font-size:.85rem}
  .qa .a blockquote{margin:.7rem 0;padding:.5rem .9rem;border-left:3px solid var(--accent);background:color-mix(in oklab,var(--accent) 9%,transparent);border-radius:0 8px 8px 0;color:var(--muted)}
  .permalink{margin-top:.6rem;font:inherit;font-size:.76rem;font-family:var(--font-mono);color:var(--muted);background:transparent;
    border:1px solid var(--border);border-radius:7px;padding:.2rem .55rem;cursor:pointer;transition:color .15s,border-color .15s}
  .permalink:hover{color:var(--brand);border-color:var(--brand)}

  .empty{display:none;text-align:center;color:var(--muted);padding:3rem 1rem}
  .empty.show{display:block}
  .empty .big{font-family:var(--font-display);color:var(--heading);font-size:1.2rem;margin-bottom:.3rem}
  mark{background:color-mix(in oklab,var(--accent) 38%,transparent);color:var(--heading);border-radius:3px;padding:0 .12em}
  .ops-note{max-width:var(--maxw);margin:0 auto;padding:0 1.4rem;color:var(--muted);font-size:.82rem;text-align:center}
  .foot{max-width:var(--maxw);margin:0 auto;padding:1.6rem 1.4rem 3rem;color:var(--muted);font-size:.82rem;text-align:center}
  .foot .mono{font-family:var(--font-mono)}

  @media (max-width:820px){
    .layout{grid-template-columns:1fr;gap:.4rem}
    .sidebar{position:static;max-height:none;display:flex;flex-wrap:wrap;gap:.3rem}
    .sidebar .lbl{width:100%}
    .sidebar nav{display:flex;flex-wrap:wrap;gap:.3rem}
    .sidebar nav a{border-left:0;border:1px solid var(--border);border-radius:20px;padding:.3rem .7rem}
    .sidebar nav a.active{border-color:var(--brand)}
  }
  @media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.ico{transition:none}}
</style>
</head>
<body>
<header class="hero">
  <h1>${esc(product)} Help Center</h1>
  ${tagline ? `<p class="tag">${esc(tagline)}</p>` : `<p class="tag">Answers to common questions.</p>`}
  <div class="searchbox">
    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
    <input id="q" type="search" placeholder="Search ${totalQ} answers…" aria-label="Search the help center" autocomplete="off">
  </div>
  <p class="meta">${totalQ} answers · ${cats.length} topics<span class="ver">v${esc(version)}</span></p>
</header>
${noteHtml}
<div class="layout">
  <aside class="sidebar">
    <div class="lbl">Topics</div>
    <nav aria-label="Topics">
      <a href="#" data-cat="" class="active">All <span class="ct">${totalQ}</span></a>
${sidebar}
    </nav>
  </aside>
  <main id="main">
${sections}
    <div class="empty" id="empty">
      <div class="big">No answers match that.</div>
      <div>Try fewer or different words — or contact support.</div>
    </div>
  </main>
</div>
<div class="foot">${esc(product)} help center · <span class="mono">v${esc(version)}</span> · updated ${updated} · built with the ship pack</div>
<script id="faq-index" type="application/json">${JSON.stringify(index).replace(/</g, "\\u003c")}</script>
<script>
(function(){
  var IDX = JSON.parse(document.getElementById('faq-index').textContent);
  var byId = {}; IDX.forEach(function(r){ byId[r.id]=(r.q+' '+r.a).toLowerCase(); });
  var input = document.getElementById('q');
  var empty = document.getElementById('empty');
  var qas = [].slice.call(document.querySelectorAll('details.qa'));
  var cats = [].slice.call(document.querySelectorAll('section.cat'));
  var navLinks = [].slice.call(document.querySelectorAll('.sidebar nav a'));
  var activeCat = '';

  function apply(){
    var q = input.value.trim().toLowerCase();
    var terms = q.split(/\\s+/).filter(Boolean);
    var shown = 0;
    qas.forEach(function(d){
      var hay = byId[d.id] || '';
      var matchText = terms.every(function(t){ return hay.indexOf(t)>-1; });
      var matchCat = !activeCat || d.getAttribute('data-cat')===activeCat;
      var on = matchText && matchCat;
      d.style.display = on ? '' : 'none';
      if(on){ shown++; if(q) d.open = terms.length<=3 && shown<=8; }
    });
    cats.forEach(function(s){
      var any = [].slice.call(s.querySelectorAll('details.qa')).some(function(d){return d.style.display!=='none';});
      s.style.display = any ? '' : 'none';
    });
    empty.classList.toggle('show', shown===0);
  }
  input.addEventListener('input', apply);

  navLinks.forEach(function(a){
    a.addEventListener('click', function(e){
      activeCat = a.getAttribute('data-cat') || '';
      navLinks.forEach(function(x){x.classList.toggle('active',x===a);});
      if(activeCat){ e.preventDefault(); }
      apply();
    });
  });

  document.addEventListener('click', function(e){
    var b = e.target.closest('.permalink'); if(!b) return;
    var url = location.origin+location.pathname+'#'+b.getAttribute('data-id');
    var done = function(){ var t=b.textContent; b.textContent='Copied!'; setTimeout(function(){b.textContent=t;},1200); };
    if(navigator.clipboard){ navigator.clipboard.writeText(url).then(done, function(){location.hash=b.getAttribute('data-id');done();}); }
    else { location.hash=b.getAttribute('data-id'); done(); }
  });

  // deep-link: open + scroll to a question if the URL has a hash
  if(location.hash){ var el=document.getElementById(location.hash.slice(1)); if(el && el.tagName==='DETAILS'){ el.open=true; setTimeout(function(){el.scrollIntoView({block:'center'});},60); } }

  // keyboard '/' focuses search
  document.addEventListener('keydown', function(e){
    if(e.key==='/' && document.activeElement!==input){ e.preventDefault(); input.focus(); }
  });
})();
</script>
</body>
</html>
`;

writeFileSync(OUT, html, "utf8");
console.log(`render-help: wrote ${OUT}  (${totalQ} answers across ${cats.length} topics, v${version}${brand ? ", themed from " + BRAND : ", default theme"})`);
