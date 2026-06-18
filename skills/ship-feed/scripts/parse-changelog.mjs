#!/usr/bin/env node
// parse-changelog.mjs — turn docs/SHIPPING-LOG.md (+ docs/VERSION + docs/brand.json)
// into machine-readable docs/changelog.json. Dependency-free, cross-platform.
//
// It parses the EXACT shipping-log markdown shape this pack emits:
//   ## v0.8.0 — 2026-06-17 · Money & decisions      (version · date · optional title)
//   _One-line italic summary._                      (optional release summary)
//   ### ✨ New | ### ⚡ Improved | ### 🛠 Fixed | ### 🔒 Security   (category headings)
//   - **Bold lead.** Rest of the benefit sentence.  (one item per bullet)
//
// Category headings are matched by KEYWORD (new/improved/fixed/security), so the emoji
// is optional and "### New things" still maps to "new". Unknown headings → "other".
//
// Usage:
//   node parse-changelog.mjs [--in docs/SHIPPING-LOG.md] [--out docs/changelog.json]
//        [--version docs/VERSION] [--brand docs/brand.json] [--site-url https://…] [--pretty]
//
// Output JSON shape (stable contract — the xml + widget read this):
//   {
//     "$schema": "ship-feed/changelog@1",
//     "product": "MyFieldTime",
//     "tagline": "Run your jobs. Not your inbox.",
//     "siteUrl": "https://…" | null,
//     "currentVersion": "0.8.0",
//     "generatedAt": "2026-06-18T…Z",
//     "categories": ["new","improved","fixed","security","other"],
//     "stats": { "releases": 3, "items": 18, "latestVersion": "0.8.0", "latestDate": "2026-06-17" },
//     "releases": [ { "version","date","title","summary","id","items":[ {"category","title","body","text"} ] } ]
//   }
//
// Exit codes: 0 ok, 1 missing/unreadable input, 2 parsed zero releases (warn, still writes []).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const has = (n) => args.includes(n);

const IN = opt("--in", "docs/SHIPPING-LOG.md");
const OUT = opt("--out", "docs/changelog.json");
const VFILE = opt("--version", "docs/VERSION");
const BRAND = opt("--brand", "docs/brand.json");
const SITE_URL = opt("--site-url", null);
const PRETTY = has("--pretty");

function die(msg, code = 1) { console.error(`parse-changelog: ${msg}`); process.exit(code); }
function readMaybe(p) { try { return existsSync(p) ? readFileSync(p, "utf8") : null; } catch { return null; } }
function readJson(p) { const r = readMaybe(p); if (!r) return null; try { return JSON.parse(r); } catch { return null; } }

if (!existsSync(IN)) {
  die(`shipping log not found at ${IN}. Run the shipping-log skill first to create it, then re-run.`);
}
const md = readFileSync(IN, "utf8");

// ---- side inputs (all optional; the log alone is enough) ----
const version = (readMaybe(VFILE) || "").trim() || null;
const brand = readJson(BRAND) || {};
const product = brand.name || null;
const tagline = brand.tagline || null;

// ---- category mapping: keyword → canonical id (emoji-agnostic) ----
const CATS = [
  { id: "new", re: /\bnew\b/i },
  { id: "improved", re: /\bimprove|\benhanc/i },
  { id: "fixed", re: /\bfix|\bbug/i },
  { id: "security", re: /\bsecurity|\bsecure/i },
];
function categoryOf(heading) {
  for (const c of CATS) if (c.re.test(heading)) return c.id;
  return "other";
}

// ---- strip leading emoji / decoration from a heading or lead ----
const stripDecor = (s) =>
  s.replace(/^[\s -㌀\uD83C-􏰀-\uDFFF←-➿️✨⚡🛠🔒🚀📣•·\-–—:]+/u, "").trim();

// markdown inline → plain text (for the "text" field / feeds)
const toPlain = (s) =>
  s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1")
   .replace(/`([^`]+)`/g, "$1").replace(/[*_~]/g, "").trim();

// ---- line-by-line state machine ----
const lines = md.split(/\r?\n/);
const releases = [];
let cur = null;     // current release
let curCat = "new"; // current category bucket
let pendingSummary = false; // expect an italic summary right after a version heading

const RE_VERSION = /^##\s+v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.\-]+)?)\s*(?:[—–-]\s*([0-9]{4}-[0-9]{2}-[0-9]{2}))?\s*(?:[·:|–—-]\s*(.+?))?\s*$/;
const RE_CAT = /^###\s+(.+?)\s*$/;
const RE_BULLET = /^\s*[-*]\s+(.+?)\s*$/;
const RE_ITALIC = /^_(.+)_\s*$/;

function pushItem(raw) {
  if (!cur) return;
  const text = toPlain(raw);
  // split "**Bold lead.** rest" into title + body when a bold lead exists
  let title = text, body = "";
  const m = raw.match(/^\*\*(.+?)\*\*\.?\s*(.*)$/);
  if (m) { title = toPlain(m[1]).replace(/\.$/, ""); body = toPlain(m[2]); }
  cur.items.push({ category: curCat, title, body, text });
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  const v = line.match(RE_VERSION);
  if (v) {
    cur = {
      version: v[1],
      date: v[2] || null,
      title: v[3] ? stripDecor(v[3]) : null,
      summary: null,
      id: `v${v[1]}`,
      items: [],
    };
    releases.push(cur);
    curCat = "new";
    pendingSummary = true;
    continue;
  }

  if (!cur) continue; // skip the file's masthead/momentum preamble

  if (pendingSummary) {
    const it = line.trim().match(RE_ITALIC);
    if (it) { cur.summary = toPlain(it[1]); pendingSummary = false; continue; }
    if (line.trim() === "") continue; // blank between heading and summary
    pendingSummary = false;           // anything else ends the summary window
  }

  const c = line.match(RE_CAT);
  if (c) { curCat = categoryOf(stripDecor(c[1])); continue; }

  const b = line.match(RE_BULLET);
  if (b) { pushItem(b[1]); continue; }
}

// ---- stats + envelope ----
const usedCats = [...new Set(releases.flatMap((r) => r.items.map((i) => i.category)))];
const orderedCats = ["new", "improved", "fixed", "security", "other"].filter((c) => usedCats.includes(c));
const itemCount = releases.reduce((n, r) => n + r.items.length, 0);
const latest = releases[0] || null;

const doc = {
  $schema: "ship-feed/changelog@1",
  product: product || (latest ? "Product" : null),
  tagline: tagline || null,
  siteUrl: SITE_URL || null,
  currentVersion: version || (latest ? latest.version : null),
  generatedAt: new Date().toISOString(),
  categories: orderedCats.length ? orderedCats : ["new", "improved", "fixed", "security"],
  stats: {
    releases: releases.length,
    items: itemCount,
    latestVersion: latest ? latest.version : null,
    latestDate: latest ? latest.date : null,
  },
  releases,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(doc, null, PRETTY ? 2 : 0) + "\n", "utf8");

console.error(
  `parse-changelog: wrote ${OUT} — ${releases.length} release(s), ${itemCount} item(s)` +
  (version ? `, current v${doc.currentVersion}` : "")
);
if (releases.length === 0) {
  console.error("parse-changelog: WARNING parsed 0 releases. Check the log uses '## v1.2.3 — YYYY-MM-DD' headings.");
  process.exit(2);
}
