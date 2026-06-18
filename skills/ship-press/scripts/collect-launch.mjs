#!/usr/bin/env node
// collect-launch.mjs — discovery + raw material for a launch kit, in one JSON payload.
//
// Answers the ship-press skill's first questions BEFORE any copy is written:
//   • Is there a shipping log? What is the latest release (heading, date, themed line, bullets)?
//   • Is there a brand.json (name, tagline, colors, VOICE/TONE) and a docs/VERSION?
//   • What launch assets already exist (logos, screenshots) to attach to the kit?
//   • Has a launch kit already been generated (don't clobber silently)?
//
// Brand VOICE matters here specifically: both the press template and the maker's-comment
// spec lean on "the product's brand voice." If brand.json carries voice/tone guidance, we
// extract it (brand.voice and common variants) so the copy is voice-CONSISTENT instead of
// the model improvising a tone.
//
// It NEVER invents anything — it only extracts what is on disk. The skill turns this
// material into a press release + Product Hunt assets + checklist. Dependency-free,
// cross-platform, bounded (no deep recursive walk).
//
// Usage:  node collect-launch.mjs [--root .] [--log docs/SHIPPING-LOG.md] [--json]
//
// Part of the "ship" pack — pairs with shipping-log (source of the release) and
// logo-pack / screenshot-capture (source of the visual assets).

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const ROOT = opt("--root", ".");
const JSON_OUT = args.includes("--json");
const r = (p) => join(ROOT, p);

const firstExisting = (list) => list.find((p) => existsSync(r(p))) || null;
const readMaybe = (p) => { try { return readFileSync(r(p), "utf8"); } catch { return null; } };
const jsonMaybe = (p) => { const t = readMaybe(p); if (!t) return null; try { return JSON.parse(t); } catch { return null; } };

// ---- inputs ----------------------------------------------------------------
const SHIPLOG_CANDIDATES = [
  opt("--log", null), "docs/SHIPPING-LOG.md", "docs/CHANGELOG.md", "CHANGELOG.md",
  "docs/shipping-log.md", "SHIPPING-LOG.md",
].filter(Boolean);
const BRAND_CANDIDATES = ["docs/brand.json", "brand.json", "docs/brand/brand.json", ".brand.json"];
const VERSION_CANDIDATES = ["docs/VERSION", "VERSION"];

const shiplogPath = firstExisting(SHIPLOG_CANDIDATES);
const brandPath = firstExisting(BRAND_CANDIDATES);
const versionPath = firstExisting(VERSION_CANDIDATES);

const brand = brandPath ? jsonMaybe(brandPath) : null;
const version = versionPath ? (readMaybe(versionPath) || "").trim() || null : null;

// ---- brand voice / tone extraction -----------------------------------------
// brand.json has no fixed schema for voice, so accept the common shapes:
//   "voice": "warm, plain-spoken"                     (string)
//   "voice": { "tone": "...", "personality": "...",   (object — flatten the useful keys)
//              "do": [...], "dont": [...], "words_we_use": [...] }
//   top-level "tone" / "personality" / "voiceAndTone" (variants)
// Returns a normalized { summary, tone, personality, do[], dont[], words[], raw } or null.
function extractVoice(b) {
  if (!b || typeof b !== "object") return null;
  const src = b.voice ?? b.voiceAndTone ?? b.tone ?? b.brandVoice ?? null;
  const asArr = (v) => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);
  let v = { summary: null, tone: null, personality: null, do: [], dont: [], words: [] };
  if (typeof src === "string") {
    v.summary = src.trim() || null;
  } else if (src && typeof src === "object") {
    v.summary = (src.summary || src.description || src.statement || "").toString().trim() || null;
    v.tone = (src.tone || b.tone || "").toString().trim() || null;
    v.personality = (src.personality || src.persona || "").toString().trim() || null;
    v.do = asArr(src.do || src.dos || src.use || src.always);
    v.dont = asArr(src.dont || src.donts || src.avoid || src.never);
    v.words = asArr(src.words || src.words_we_use || src.vocabulary || src.lexicon);
  } else {
    // no `voice`, but maybe top-level tone/personality
    v.tone = (b.tone || "").toString().trim() || null;
    v.personality = (b.personality || "").toString().trim() || null;
  }
  const hasAny = v.summary || v.tone || v.personality || v.do.length || v.dont.length || v.words.length;
  if (!hasAny) return null;
  v.raw = src ?? { tone: v.tone, personality: v.personality };
  return v;
}
const voice = extractVoice(brand);

// ---- parse the latest release out of the shipping log ----------------------
// A release block starts at a level-2 heading like "## v0.8.0 — 2026-06-17 · Money & decisions".
function parseLatestRelease(md) {
  if (!md) return null;
  const lines = md.split(/\r?\n/);
  const heads = [];
  lines.forEach((ln, idx) => {
    const m = ln.match(/^##\s+(.*\S)\s*$/);
    if (m && !/^table of contents/i.test(m[1])) heads.push({ idx, raw: m[1] });
  });
  if (!heads.length) return null;
  const first = heads[0];
  const end = heads[1] ? heads[1].idx : lines.length;
  const body = lines.slice(first.idx + 1, end);

  // heading parts: "v0.8.0 — 2026-06-17 · Money & decisions"
  const ver = (first.raw.match(/v?(\d+\.\d+\.\d+)/) || [])[1] || null;
  const date = (first.raw.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
  const title = first.raw.split(/[·•|]/).slice(1).join("·").trim() ||
    first.raw.replace(/^v?\d+\.\d+\.\d+\s*[—-]?\s*/, "").replace(/\d{4}-\d{2}-\d{2}/, "").replace(/[—-]/g, "").trim() || null;

  // a one-line italic tagline directly under the heading: "_..._" or "*...*"
  const themed = (() => {
    for (const ln of body) {
      const t = ln.trim();
      if (!t) continue;
      const m = t.match(/^[_*](.+?)[_*]$/);
      return m ? m[1].trim() : null;
    }
    return null;
  })();

  // collect bullets, tagged by the nearest section heading (### New / Improved / Fixed / Security)
  const sections = {};
  let cur = "Highlights";
  for (const ln of body) {
    const h = ln.match(/^#{3,4}\s+(?:[^\w\s]*\s*)?(.*\S)\s*$/);
    if (h) { cur = h[1].replace(/[^\w\s/&-].*$/, "").trim() || cur; continue; }
    const b = ln.match(/^\s*[-*+]\s+(.*\S)\s*$/);
    if (b) {
      let txt = b[1].replace(/\*\*/g, "").trim();
      (sections[cur] ||= []).push(txt);
    }
  }
  const bulletCount = Object.values(sections).reduce((n, a) => n + a.length, 0);
  return { version: ver, date, title, themed, sections, bulletCount, headingRaw: first.raw };
}

const release = parseLatestRelease(readMaybe(shiplogPath));

// ---- momentum line (optional, from the log header) -------------------------
const momentum = (() => {
  const md = readMaybe(shiplogPath);
  if (!md) return null;
  const m = md.match(/\*\*Momentum:\*\*\s*(.+)/i);
  return m ? m[1].replace(/\*\*/g, "").trim() : null;
})();

// ---- visual assets to attach ----------------------------------------------
const IMG = /\.(png|svg|jpe?g|webp)$/i;
const LOGOISH = /logo|icon|wordmark|brand|mark|favicon|emblem/i;
const ASSET_DIRS = [
  "docs/brand/logos", "docs/brand", "docs/screenshots", "screenshots",
  "public/images/logos", "public/logos", "public/images", "assets/logos", "images/logos",
];
function listAssets(rel, filter) {
  const dir = r(rel);
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter((f) => IMG.test(f) && (!filter || filter.test(f))).map((f) => `${rel}/${f}`);
  } catch { return []; }
}
const logos = [...new Set(ASSET_DIRS.flatMap((d) => listAssets(d, LOGOISH)))].sort();
const screenshots = [...new Set(["docs/screenshots", "screenshots"].flatMap((d) => listAssets(d, null)))].sort();

// ---- prior launch-kit output (don't clobber silently) ----------------------
const PRESS_DIR = "docs/press";
const priorOutputs = (() => {
  const dir = r(PRESS_DIR);
  if (!existsSync(dir)) return [];
  try { return readdirSync(dir).filter((f) => statSync(r(`${PRESS_DIR}/${f}`)).isFile()).map((f) => `${PRESS_DIR}/${f}`); }
  catch { return []; }
})();

// ---- assemble report -------------------------------------------------------
const report = {
  root: ROOT,
  inputs: {
    shippingLog: shiplogPath,
    brandJson: brandPath,
    versionFile: versionPath,
  },
  brand: brand ? { name: brand.name || null, tagline: brand.tagline || null, hasColors: !!(brand.colors), colorKeys: brand.colors ? Object.keys(brand.colors).length : 0, hasVoice: !!voice } : null,
  voice,
  version,
  release,
  momentum,
  assets: { logos, screenshots },
  priorOutputs,
  warnings: [],
};
if (!shiplogPath) report.warnings.push("No shipping log found — run the shipping-log skill first, or point --log at a changelog. A launch kit needs a real release to describe.");
if (shiplogPath && !release) report.warnings.push(`Shipping log found at ${shiplogPath} but no '## v…' release heading parsed — check its format.`);
if (!brandPath) report.warnings.push("No docs/brand.json — HTML output will fall back to neutral defaults (never purple). Run logo-pack/brand setup to theme it.");
if (brandPath && !voice) report.warnings.push("brand.json has no voice/tone guidance (no `voice`, `tone`, or `personality`) — the press release & maker's comment will follow the skill's default plain-English voice. Add a `voice` field to brand.json to lock the tone.");
else if (voice) report.warnings.push("Brand voice found in brand.json — write the press release and maker's comment IN THAT VOICE (see report.voice), don't improvise a tone.");
if (release && !release.themed) report.warnings.push("Latest release has no one-line themed summary — you'll need to write the lede from the bullets, grounded only in them.");
if (priorOutputs.length) report.warnings.push(`A launch kit already exists (${priorOutputs.join(", ")}) — confirm before overwriting; offer a diff/update instead.`);

if (JSON_OUT) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

// ---- human-readable --------------------------------------------------------
console.log(`Launch-kit discovery  (root: ${ROOT})`);
console.log(`  shipping log : ${shiplogPath || "— none (BLOCKER) —"}`);
console.log(`  brand.json   : ${brandPath || "— none (neutral theme) —"}${report.brand && report.brand.name ? `  (${report.brand.name}${report.brand.tagline ? ` — "${report.brand.tagline}"` : ""})` : ""}`);
if (voice) {
  const vbits = [voice.summary, voice.tone && `tone: ${voice.tone}`, voice.personality && `personality: ${voice.personality}`].filter(Boolean);
  console.log(`  brand voice  : ${vbits.length ? vbits.join(" · ") : "(present)"}`);
  if (voice.do.length) console.log(`     do        : ${voice.do.join("; ")}`);
  if (voice.dont.length) console.log(`     don't     : ${voice.dont.join("; ")}`);
  if (voice.words.length) console.log(`     words     : ${voice.words.join(", ")}`);
} else if (brandPath) {
  console.log(`  brand voice  : — none in brand.json (default plain-English voice) —`);
}
console.log(`  version      : ${version || "— none —"}`);
if (release) {
  console.log(`  latest release: v${release.version || "?"}  ${release.date || ""}  ${release.title ? "· " + release.title : ""}`);
  console.log(`  themed line  : ${release.themed ? `"${release.themed}"` : "— none —"}`);
  console.log(`  bullets      : ${release.bulletCount} across [${Object.keys(release.sections).join(", ")}]`);
}
console.log(`  logos        : ${logos.length ? logos.join(", ") : "— none —"}`);
console.log(`  screenshots  : ${screenshots.length ? screenshots.length + " found" : "— none —"}`);
console.log(`  prior kit    : ${priorOutputs.length ? priorOutputs.join(", ") : "— none —"}`);
if (report.warnings.length) {
  console.log(`\n  warnings:`);
  for (const w of report.warnings) console.log(`    ! ${w}`);
}
