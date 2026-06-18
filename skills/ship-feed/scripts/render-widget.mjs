#!/usr/bin/env node
// render-widget.mjs — emit a self-contained, themeable <ship-changelog> web component
// + a static embeddable HTML page from docs/changelog.json (themed by docs/brand.json).
// Dependency-free, cross-platform. No backdrop-filter, no SVG feTurbulence (they hang renderers).
//
// Two outputs (pick with --mode):
//   --mode component  → docs/ship-changelog.js : a custom element <ship-changelog>.
//                       Drop the script on any page, then <ship-changelog src="/changelog.json">.
//                       Shadow DOM, reads brand tokens baked in as defaults + overridable via
//                       CSS custom properties on the host. Has a compact "badge" mode too.
//   --mode page       → docs/whats-new.embed.html : a single static page that inlines the data
//                       (no fetch needed) for a company-page <iframe> or direct host.
//   --mode both       → emit both (default).
//
// Usage:
//   node render-widget.mjs [--in docs/changelog.json] [--brand docs/brand.json]
//        [--mode both|component|page] [--out-dir docs] [--src /changelog.json]
//
// --src is the URL the component fetches at runtime (defaults to ./changelog.json).
// Exit codes: 0 ok, 1 missing/unreadable input.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };

const IN = opt("--in", "docs/changelog.json");
const BRAND = opt("--brand", "docs/brand.json");
const MODE = (opt("--mode", "both") || "both").toLowerCase();
const OUT_DIR = opt("--out-dir", "docs");
const SRC = opt("--src", "./changelog.json");

function die(msg) { console.error(`render-widget: ${msg}`); process.exit(1); }
if (!existsSync(IN)) die(`changelog not found at ${IN}. Run parse-changelog.mjs first.`);

let doc;
try { doc = JSON.parse(readFileSync(IN, "utf8")); }
catch (e) { die(`could not parse ${IN}: ${e.message}`); }

let brand = {};
try { if (existsSync(BRAND)) brand = JSON.parse(readFileSync(BRAND, "utf8")); } catch { /* defaults */ }

// ---------- theme tokens (NEVER purple by default — neutral slate+blue) ----------
const DEFAULTS = {
  bg: "#0b0d10", surface: "#13171e", "surface-2": "#171c24",
  border: "#232a33", "border-soft": "#1b212a",
  text: "#e7edf3", muted: "#90a0b0", heading: "#f5f9fd",
  brand: "#4cc2ff", accent: "#ffc24b",
  new: "#58a6ff", improved: "#e3b341", fixed: "#3fb950", security: "#56d4dd", other: "#90a0b0",
  radius: "14px",
};
const FONT_DEFAULTS = { display: "Bricolage Grotesque", body: "Hanken Grotesk", mono: "JetBrains Mono" };
function fontStack(name, kind) {
  const fb = kind === "mono" ? 'ui-monospace,"SFMono-Regular",monospace' : "ui-sans-serif,system-ui,sans-serif";
  return `"${name}",${fb}`;
}
const tokens = { ...DEFAULTS };
if (brand.colors) for (const [k, v] of Object.entries(brand.colors)) if (k in DEFAULTS || ["new", "improved", "fixed", "security"].includes(k)) tokens[k] = v;
const fonts = { ...FONT_DEFAULTS, ...(brand.fonts || {}) };

function rootVars(prefix = "--sc-") {
  const lines = Object.entries(tokens).map(([k, v]) => `  ${prefix}${k}: ${v};`);
  lines.push(`  ${prefix}font-display: ${fontStack(fonts.display, "display")};`);
  lines.push(`  ${prefix}font-body: ${fontStack(fonts.body, "body")};`);
  lines.push(`  ${prefix}font-mono: ${fontStack(fonts.mono, "mono")};`);
  return lines.join("\n");
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const CAT_LABEL = { new: "New", improved: "Improved", fixed: "Fixed", security: "Security", other: "Also" };
mkdirSync(OUT_DIR, { recursive: true });

// ===================================================================
// Shared style block (scoped under :host in the component, under .sc-root on the page).
// Uses ONLY var(--sc-*) so a host can re-theme by setting those custom properties.
// ===================================================================
function styleBlock(scope) {
  return `
${scope}{
  all: initial;
  display: block;
  font-family: var(--sc-font-body);
  color: var(--sc-text);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  text-align: left;
}
${scope} *{ box-sizing: border-box; }
${scope} .panel{
  background:
    radial-gradient(120% 90% at 50% -10%, color-mix(in srgb, var(--sc-brand) 13%, transparent), transparent 60%),
    var(--sc-bg);
  border: 1px solid var(--sc-border);
  border-radius: var(--sc-radius);
  padding: clamp(1.1rem, 3vw, 1.6rem);
}
${scope} .head{ display:flex; flex-wrap:wrap; align-items:baseline; gap:.55rem .8rem; margin:0 0 .25rem; }
${scope} .head h2{ font-family: var(--sc-font-display); font-weight:700; color: var(--sc-heading);
  font-size: clamp(1.25rem,3vw,1.6rem); letter-spacing:-.02em; margin:0; }
${scope} .tagline{ color: var(--sc-muted); margin:.15rem 0 1rem; font-size:.95rem; }
${scope} .stats{ display:flex; flex-wrap:wrap; gap:.5rem; margin:0 0 1.1rem; }
${scope} .stat{ font-family: var(--sc-font-mono); font-size:.72rem; letter-spacing:.03em;
  color: var(--sc-muted); border:1px solid var(--sc-border-soft); border-radius:999px;
  padding:.28rem .7rem; background: var(--sc-surface); }
${scope} .stat b{ color: var(--sc-accent); font-weight:600; }
${scope} .rel{ border-top:1px solid var(--sc-border-soft); padding:1.1rem 0 .25rem; }
${scope} .rel:first-of-type{ border-top:0; padding-top:0; }
${scope} .rel-head{ display:flex; flex-wrap:wrap; align-items:baseline; gap:.5rem .7rem; }
${scope} .ver{ font-family: var(--sc-font-mono); font-weight:600; color: var(--sc-brand);
  font-size:.95rem; }
${scope} .date{ font-family: var(--sc-font-mono); font-size:.74rem; color: var(--sc-muted); }
${scope} .rel-title{ font-weight:600; color: var(--sc-heading); }
${scope} .summary{ color: var(--sc-muted); font-style:italic; margin:.35rem 0 .6rem; font-size:.92rem; }
${scope} .cat{ margin:.7rem 0 .2rem; }
${scope} .cat-h{ display:inline-flex; align-items:center; gap:.45rem; font-size:.72rem; font-weight:700;
  letter-spacing:.05em; text-transform:uppercase; color: var(--sc-muted); margin:0 0 .3rem; }
${scope} .dot{ width:.55rem; height:.55rem; border-radius:50%; display:inline-block; }
${scope} .dot.new{ background: var(--sc-new); } ${scope} .dot.improved{ background: var(--sc-improved); }
${scope} .dot.fixed{ background: var(--sc-fixed); } ${scope} .dot.security{ background: var(--sc-security); }
${scope} .dot.other{ background: var(--sc-other); }
${scope} ul{ margin:0; padding:0 0 0 1.05rem; }
${scope} li{ margin:.32rem 0; font-size:.92rem; }
${scope} li b{ color: var(--sc-heading); font-weight:600; }
${scope} .foot{ margin-top:1rem; font-size:.72rem; color: var(--sc-muted); font-family: var(--sc-font-mono); }
${scope} .foot a{ color: var(--sc-brand); text-decoration:none; }
/* compact badge variant — for an in-app "What's new" pill/dropdown */
${scope}.badge .panel{ padding:.9rem 1rem; max-width:22rem; }
${scope}.badge .stats, ${scope}.badge .tagline{ display:none; }
${scope}.badge .rel{ padding:.6rem 0 .2rem; }
${scope}.badge .rel:not(:first-of-type) .cat:nth-of-type(n+2){ display:none; } /* keep badge short */
@media (max-width:520px){ ${scope} .stat{ font-size:.68rem; } }
`.trim();
}

// release → HTML (used by both modes for the static path; component re-implements in JS)
function releaseHtml(r, categories) {
  const cats = categories.map((cat) => {
    const items = r.items.filter((i) => i.category === cat);
    if (!items.length) return "";
    const lis = items.map((i) => {
      const lead = i.title ? `<b>${esc(i.title)}</b>` : "";
      const sep = i.title && i.body ? " — " : "";
      const rest = i.body ? esc(i.body) : (i.title ? "" : esc(i.text));
      return `<li>${lead}${sep}${rest}</li>`;
    }).join("");
    return `<div class="cat"><div class="cat-h"><span class="dot ${cat}"></span>${CAT_LABEL[cat] || cat}</div><ul>${lis}</ul></div>`;
  }).join("");
  return `<div class="rel" id="${esc(r.id || ("v" + r.version))}">
  <div class="rel-head"><span class="ver">v${esc(r.version)}</span>${r.date ? `<span class="date">${esc(r.date)}</span>` : ""}${r.title ? `<span class="rel-title">${esc(r.title)}</span>` : ""}</div>
  ${r.summary ? `<div class="summary">${esc(r.summary)}</div>` : ""}
  ${cats}
</div>`;
}

function headerHtml(d) {
  const s = d.stats || {};
  return `<div class="head"><h2>${esc(d.product || "What's New")}</h2></div>
${d.tagline ? `<p class="tagline">${esc(d.tagline)}</p>` : ""}
<div class="stats">
  <span class="stat"><b>${s.releases ?? 0}</b> releases</span>
  <span class="stat"><b>${s.items ?? 0}</b> updates</span>
  ${s.latestVersion ? `<span class="stat">latest <b>v${esc(s.latestVersion)}</b></span>` : ""}
  ${s.latestDate ? `<span class="stat">${esc(s.latestDate)}</span>` : ""}
</div>`;
}

const written = [];

// ---------- MODE: page (data inlined; no fetch) ----------
if (MODE === "page" || MODE === "both") {
  const categories = doc.categories || ["new", "improved", "fixed", "security"];
  const body = doc.releases.map((r) => releaseHtml(r, categories)).join("\n");
  const page = `<!DOCTYPE html>
<!-- ship-changelog embeddable page. Self-contained, themeable, no JS required.
     Theme by editing the :root --sc-* tokens below (sourced from docs/brand.json). -->
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.product || "Product")} — What's New</title>
<link rel="alternate" type="application/rss+xml" title="What's New" href="./changelog.xml">
<style>
:root{
${rootVars("--sc-")}
}
html,body{ margin:0; background: transparent; }
${styleBlock(".sc-root")}
.sc-root{ max-width:48rem; margin:0 auto; padding:1.25rem; }
</style></head>
<body>
<div class="sc-root">
  <div class="panel">
    ${headerHtml(doc)}
    ${body}
    <div class="foot">Generated by ship-feed · <a href="./changelog.xml">RSS</a> · <a href="./changelog.json">JSON</a></div>
  </div>
</div>
</body></html>
`;
  const out = join(OUT_DIR, "whats-new.embed.html");
  writeFileSync(out, page, "utf8");
  written.push(out);
}

// ---------- MODE: component (<ship-changelog>) ----------
if (MODE === "component" || MODE === "both") {
  // The component baked-in default tokens (host can override via CSS vars on the element).
  const defaultVarsObj = JSON.stringify(
    Object.fromEntries([
      ...Object.entries(tokens),
      ["font-display", fontStack(fonts.display, "display")],
      ["font-body", fontStack(fonts.body, "body")],
      ["font-mono", fontStack(fonts.mono, "mono")],
    ]),
  );
  const compStyle = styleBlock(":host");
  const js = `/* ship-changelog — self-contained web component. Generated by ship-feed.
 * Usage:  <script src="/ship-changelog.js"></script>
 *         <ship-changelog src="/changelog.json"></ship-changelog>
 *         <ship-changelog src="/changelog.json" badge limit="1"></ship-changelog>
 * Attributes: src (JSON url, default "${SRC}"), badge (compact), limit (max releases).
 * Theme: set CSS custom properties (--sc-brand, --sc-bg, …) on the element to override the
 * baked-in brand defaults. No backdrop-filter / no SVG turbulence (renderer-safe). */
(function () {
  var DEFAULT_SRC = ${JSON.stringify(SRC)};
  var DEFAULTS = ${defaultVarsObj};
  var CAT_LABEL = ${JSON.stringify(CAT_LABEL)};
  var STYLE = ${JSON.stringify(compStyle)};
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function rootCss(){ var o=":host{"; for(var k in DEFAULTS){ o+="--sc-"+k+":"+DEFAULTS[k]+";"; } return o+"}"; }
  function relHtml(r, cats){
    var html='<div class="rel" id="'+esc(r.id||("v"+r.version))+'"><div class="rel-head"><span class="ver">v'+esc(r.version)+'</span>';
    if(r.date) html+='<span class="date">'+esc(r.date)+'</span>';
    if(r.title) html+='<span class="rel-title">'+esc(r.title)+'</span>';
    html+='</div>';
    if(r.summary) html+='<div class="summary">'+esc(r.summary)+'</div>';
    cats.forEach(function(cat){
      var items=(r.items||[]).filter(function(i){return i.category===cat;});
      if(!items.length) return;
      html+='<div class="cat"><div class="cat-h"><span class="dot '+cat+'"></span>'+(CAT_LABEL[cat]||cat)+'</div><ul>';
      items.forEach(function(i){
        var lead=i.title?'<b>'+esc(i.title)+'</b>':'';
        var sep=(i.title&&i.body)?' — ':'';
        var rest=i.body?esc(i.body):(i.title?'':esc(i.text));
        html+='<li>'+lead+sep+rest+'</li>';
      });
      html+='</ul></div>';
    });
    return html+'</div>';
  }
  function render(host, doc){
    var badge = host.hasAttribute("badge");
    var limit = parseInt(host.getAttribute("limit")||"0",10);
    var cats = doc.categories || ["new","improved","fixed","security"];
    var rels = doc.releases || [];
    if(limit>0) rels = rels.slice(0,limit);
    var s = doc.stats||{};
    var head = '<div class="head"><h2>'+esc(doc.product||"What\\u2019s New")+'</h2></div>';
    if(doc.tagline) head+='<p class="tagline">'+esc(doc.tagline)+'</p>';
    head+='<div class="stats"><span class="stat"><b>'+(s.releases||0)+'</b> releases</span>'+
      '<span class="stat"><b>'+(s.items||0)+'</b> updates</span>'+
      (s.latestVersion?'<span class="stat">latest <b>v'+esc(s.latestVersion)+'</b></span>':'')+
      (s.latestDate?'<span class="stat">'+esc(s.latestDate)+'</span>':'')+'</div>';
    var body = rels.map(function(r){return relHtml(r,cats);}).join("");
    var root = host.shadowRoot;
    var hostClass = badge ? "badge" : "";
    if(hostClass) host.classList.add("badge");
    root.innerHTML = '<style>'+rootCss()+STYLE+'</style>'+
      '<div class="panel">'+head+body+'<div class="foot">Updated v'+esc(s.latestVersion||"")+'</div></div>';
    host.dispatchEvent(new CustomEvent("ship-changelog:ready",{detail:{stats:s},bubbles:true,composed:true}));
  }
  class ShipChangelog extends HTMLElement{
    static get observedAttributes(){ return ["src","badge","limit"]; }
    connectedCallback(){
      if(!this.shadowRoot) this.attachShadow({mode:"open"});
      var inline = this.querySelector('script[type="application/json"]');
      if(inline){ try{ render(this, JSON.parse(inline.textContent)); return; }catch(e){} }
      var src = this.getAttribute("src") || DEFAULT_SRC;
      var self=this;
      fetch(src,{cache:"no-cache"}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
        .then(function(doc){ render(self,doc); })
        .catch(function(e){
          if(!self.shadowRoot) self.attachShadow({mode:"open"});
          self.shadowRoot.innerHTML='<style>'+rootCss()+'</style><div style="color:var(--sc-muted);font:13px/1.5 var(--sc-font-body,sans-serif)">What\\u2019s new is unavailable.</div>';
        });
    }
  }
  if(!customElements.get("ship-changelog")) customElements.define("ship-changelog", ShipChangelog);
})();
`;
  const out = join(OUT_DIR, "ship-changelog.js");
  writeFileSync(out, js, "utf8");
  written.push(out);
}

console.error(`render-widget: wrote ${written.join(", ")}`);
