#!/usr/bin/env node
// render-guide.mjs — render a markdown user guide into a premium, navigable, single-file HTML page.
//
// Dependency-free markdown→HTML for the common subset (headings, lists, tables, blockquotes,
// code, inline) + a sticky sidebar TOC with scrollspy and a live section filter. The page is
// themed from docs/brand.json (or built-in defaults) — one brand file, every output on-brand.
//
// Usage:
//   node render-guide.mjs --in docs/user-guide/Guide.md --out docs/user-guide/Guide.html \
//        [--brand docs/brand.json] [--version docs/VERSION]
//
// Part of the user-guide-builder skill / the docs + release pack.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };

const IN = opt("--in");
const OUT = opt("--out");
const BRAND = opt("--brand", "docs/brand.json");
const VFILE = opt("--version", "docs/VERSION");

if (!IN || !OUT) {
  console.error("usage: render-guide.mjs --in <guide.md> --out <out.html> [--brand docs/brand.json] [--version docs/VERSION]");
  process.exit(1);
}
if (!existsSync(IN)) { console.error(`render-guide: input not found: ${IN}`); process.exit(1); }

// ---------- theme tokens ----------
const DEFAULTS = {
  bg: "#0b0d10", surface: "#13171e", "border": "#232a33", "border-soft": "#1b212a",
  text: "#e7edf3", muted: "#90a0b0", heading: "#f5f9fd",
  brand: "#4cc2ff", accent: "#ffc24b", "accent-ink": "#9fd0e8",
  grid: "rgba(255,255,255,.025)",
  radius: "14px", maxw: "72rem", "sidebar-w": "17rem",
};
const FONT_DEFAULTS = { display: "Bricolage Grotesque", body: "Hanken Grotesk", mono: "JetBrains Mono" };
function fontStack(name, kind) {
  const fb = kind === "mono" ? 'ui-monospace,"SFMono-Regular",monospace' : "ui-sans-serif,system-ui,sans-serif";
  return `"${name}",${fb}`;
}
function buildRootCss(brand) {
  const tokens = { ...DEFAULTS };
  if (brand && brand.colors) for (const [k, v] of Object.entries(brand.colors)) tokens[k] = v;
  const fonts = { ...FONT_DEFAULTS, ...((brand && brand.fonts) || {}) };
  const lines = Object.entries(tokens).map(([k, v]) => `    --${k}:${v};`);
  lines.push(`    --font-display:${fontStack(fonts.display, "display")};`);
  lines.push(`    --font-body:${fontStack(fonts.body, "body")};`);
  lines.push(`    --font-mono:${fontStack(fonts.mono, "mono")};`);
  return `  :root{\n${lines.join("\n")}\n  }`;
}

// ---------- markdown -> html ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
const plain = (s) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*`_]/g, "").trim();

function inline(text) {
  const codes = [];
  text = text.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `@@C${codes.length - 1}@@`; });
  text = esc(text);
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, a, h) => `<img src="${h}" alt="${a}" loading="lazy">`);
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, h) => `<a href="${h}">${t}</a>`);
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  text = text.replace(/@@C(\d+)@@/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
  return text;
}

function renderList(items) {
  const base = items[0].match(/^(\s*)/)[1].length;
  const ordered = /^\s*\d+\./.test(items[0]);
  let html = ordered ? "<ol>" : "<ul>";
  let i = 0;
  while (i < items.length) {
    const m = items[i].match(/^(\s*)(?:[-*+]|\d+\.)\s+(.*)$/);
    let li = `<li>${inline(m[2])}`;
    const children = [];
    while (i + 1 < items.length) {
      const mn = items[i + 1].match(/^(\s*)(?:[-*+]|\d+\.)\s+/);
      if (mn && mn[1].length > base) { children.push(items[i + 1]); i++; } else break;
    }
    if (children.length) li += renderList(children);
    html += li + "</li>";
    i++;
  }
  return html + (ordered ? "</ol>" : "</ul>");
}

function render(md) {
  md = md.replace(/<!--[\s\S]*?-->/g, "");
  md = md.replace(/\n##\s*Table of contents[\s\S]*?(?=\n---|\n## )/i, "\n");
  const lines = md.split(/\r?\n/);
  const out = [], toc = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }

    if (/^\s*```/.test(line)) { i++; const code = []; while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i++; } i++; out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`); continue; }

    if (/^\s*([-*_])\1\1[-*_\s]*$/.test(line)) { out.push("<hr>"); i++; continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length, txt = h[2].replace(/\s*#+\s*$/, "").trim(), id = slug(txt);
      out.push(`<h${lvl} id="${id}">${inline(txt)}</h${lvl}>`);
      if (lvl === 2 || lvl === 3) toc.push({ id, txt: plain(txt), lvl });
      i++; continue;
    }

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
      while (i < lines.length) {
        if (/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i])) { items.push(lines[i]); i++; }
        else if (!/^\s*$/.test(lines[i]) && /^\s+\S/.test(lines[i])) { items[items.length - 1] += " " + lines[i].trim(); i++; }
        else break;
      }
      out.push(renderList(items)); continue;
    }

    const buf = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*(#{1,6}\s|>|```|([-*_])\2\2)/.test(lines[i]) && !/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i]) && !(lines[i].includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*$/.test(lines[i + 1]))) { buf.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return { html: out.join("\n"), toc };
}

// ---------- assemble ----------
const md = readFileSync(IN, "utf8");
const brand = existsSync(BRAND) ? JSON.parse(readFileSync(BRAND, "utf8")) : null;
const version = existsSync(VFILE) ? readFileSync(VFILE, "utf8").trim() : "0.0.0";
const updated = new Date().toISOString().slice(0, 10);

const { html, toc } = render(md);
const h1 = (md.match(/^#\s+(.*)$/m) || [, "User Guide"])[1].replace(/—.*$/, "").trim();
const product = (brand && brand.name) || h1 || "Guide";
const tocHtml = toc.map((t) => `      <a class="${t.lvl === 3 ? "lvl3" : ""}" href="#${t.id}">${esc(t.txt)}</a>`).join("\n");

const shell = readFileSync(join(here, "..", "assets", "guide-shell.html"), "utf8");
const outHtml = shell
  .replaceAll("{{TITLE}}", esc(`${product} — User Guide`))
  .replace("{{ROOT_CSS}}", buildRootCss(brand))
  .replaceAll("{{PRODUCT}}", esc(product))
  .replaceAll("{{INITIAL}}", esc(product.trim()[0] || "•"))
  .replaceAll("{{VERSION}}", esc(version))
  .replaceAll("{{UPDATED}}", esc(updated))
  .replace("{{TOC}}", tocHtml)
  .replace("{{CONTENT}}", html);

writeFileSync(OUT, outHtml, "utf8");
console.log(`render-guide: wrote ${OUT}  (${toc.length} sections, v${version}${brand ? ", themed from " + BRAND : ", default theme"})`);
