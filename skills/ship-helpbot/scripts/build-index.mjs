#!/usr/bin/env node
// build-index.mjs — chunk a user-guide markdown file into a retrieval index for the helpbot.
//
// Splits the guide on its headings into self-contained sections and writes
// docs/guide-index.json: an array of { id, title, level, anchor, text, tokens }.
// The same anchors the user-guide-builder's HTML renderer produces (lowercase-hyphen
// slugs of headings) are reused here, so a citation like "see #change-orders" links
// straight into the rendered guide. Dependency-free; runs anywhere Node 18+ runs.
//
// Usage:
//   node build-index.mjs --in docs/user-guide/Guide.md --out docs/guide-index.json \
//        [--min-level 2] [--max-level 3] [--version docs/VERSION] [--brand docs/brand.json]
//
// Defaults discover the guide if --in is omitted (first match wins):
//   docs/user-guide/*.md, docs/user-guide.md, USER_GUIDE.md, docs/manual.md
//
// Exit codes: 0 ok, 1 usage/IO error. Part of the ship-helpbot skill (the "ship" pack).

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const fail = (m) => { console.error(`build-index: ${m}`); process.exit(1); };

const MIN_LEVEL = parseInt(opt("--min-level", "2"), 10); // h2 starts a section by default
const MAX_LEVEL = parseInt(opt("--max-level", "3"), 10); // h3 also starts one; deeper stays inline
const OUT = opt("--out", "docs/guide-index.json");
const VFILE = opt("--version", "docs/VERSION");
const BRAND = opt("--brand", "docs/brand.json");

// ---------- discover the guide if not given ----------
function discoverGuide() {
  const dir = "docs/user-guide";
  if (existsSync(dir)) {
    const md = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".md")).sort();
    // prefer a file that looks like the main guide over fragments
    const main = md.find((f) => /guide/i.test(f)) || md[0];
    if (main) return join(dir, main);
  }
  for (const c of ["docs/user-guide.md", "USER_GUIDE.md", "docs/manual.md", "docs/help.md"]) {
    if (existsSync(c)) return c;
  }
  return null;
}

const IN = opt("--in") || discoverGuide();
if (!IN) fail("no guide markdown found — pass --in <guide.md> (run user-guide-builder first)");
if (!existsSync(IN)) fail(`input not found: ${IN}`);

// ---------- helpers (anchor slugs must match render-guide.mjs) ----------
const slug = (s) =>
  s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
const plain = (s) =>
  s.replace(/!\[[^\]]*\]\([^)]*\)/g, "")      // images out
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")  // link text only
    .replace(/`([^`]+)`/g, "$1")              // inline code
    .replace(/[*_~]/g, "")                     // emphasis marks
    .replace(/^\s*>\s?/gm, "")                 // blockquote markers
    .replace(/\[SCREENSHOT:[^\]]*\]/gi, "")    // pack screenshot markers
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

const md = readFileSync(IN, "utf8").replace(/\r\n/g, "\n");
const lines = md.split("\n");

// strip a leading YAML front-matter block if present
let start = 0;
if (lines[0] === "---") {
  const end = lines.indexOf("---", 1);
  if (end !== -1) start = end + 1;
}

// ---------- walk headings, accumulate bodies, track breadcrumb ----------
const sections = [];
let cur = null;
const crumb = {}; // level -> last title seen, for breadcrumbs
let inFence = false;
const usedAnchors = new Map();

function uniqueAnchor(base) {
  const n = usedAnchors.get(base) || 0;
  usedAnchors.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

function pushCur() {
  if (!cur) return;
  const text = plain(cur.bodyLines.join("\n")).trim();
  cur.text = text;
  cur.tokens = text ? text.split(/\s+/).length : 0;
  // drop empty shells (a heading with no real prose under it)
  if (cur.tokens >= 3) sections.push(cur);
  cur = null;
}

for (let i = start; i < lines.length; i++) {
  const line = lines[i];
  if (/^```/.test(line.trim())) inFence = !inFence;
  const h = !inFence && line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
  if (h) {
    const level = h[1].length;
    const title = plain(h[2]).trim();
    crumb[level] = title;
    for (const k of Object.keys(crumb)) if (+k > level) delete crumb[k];
    if (level >= MIN_LEVEL && level <= MAX_LEVEL) {
      pushCur();
      const anchor = uniqueAnchor(slug(h[2]));
      const breadcrumb = Object.keys(crumb)
        .map(Number).sort((a, b) => a - b)
        .filter((l) => l < level).map((l) => crumb[l]);
      cur = { id: anchor, title, level, anchor, breadcrumb, bodyLines: [] };
    } else if (cur) {
      cur.bodyLines.push(line); // deeper/shallower headings stay inline in the current section
    }
  } else if (cur) {
    cur.bodyLines.push(line);
  }
}
pushCur();

if (!sections.length) fail(`no h${MIN_LEVEL}-h${MAX_LEVEL} sections found in ${IN}`);

// ---------- assemble index ----------
const version = existsSync(VFILE) ? readFileSync(VFILE, "utf8").trim() : null;
let brandName = null;
if (existsSync(BRAND)) {
  try { brandName = JSON.parse(readFileSync(BRAND, "utf8")).name || null; } catch { /* ignore */ }
}

const index = {
  $schema: "ship-helpbot/guide-index@1",
  source: IN.replace(/\\/g, "/"),
  product: brandName,
  version,
  builtAt: new Date().toISOString(),
  count: sections.length,
  sections: sections.map(({ bodyLines, ...s }) => s),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(index, null, 2) + "\n", "utf8");

const totalTokens = sections.reduce((n, s) => n + s.tokens, 0);
console.log(
  `build-index: ${sections.length} sections, ~${totalTokens} words → ${OUT}` +
  (version ? `  (v${version})` : "")
);
