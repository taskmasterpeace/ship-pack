#!/usr/bin/env node
// scan-release.mjs — discover everything ship-email needs BEFORE writing a single word.
//
// Answers the skill's first questions: what version are we announcing, what's the newest
// shipping-log entry, do we have a brand to theme with, and did we already announce this
// version? Prints a JSON report (with --json) so the skill can make honest decisions about
// missing inputs instead of guessing. Dependency-free, bounded (no deep filesystem walk).
//
// Usage:  node scan-release.mjs [--root .] [--version <x.y.z>] [--json]

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const ROOT = opt("--root", ".");
const WANT_VERSION = opt("--version", null);
const JSON_OUT = args.includes("--json");

const rd = (p) => { try { return readFileSync(join(ROOT, p), "utf8"); } catch { return null; } };
const firstExisting = (list) => { for (const p of list) if (existsSync(join(ROOT, p))) return p; return null; };

// ---- candidate locations (cross-project: never assume one app's layout) ----
const VERSION_FILES = ["docs/VERSION", "VERSION", ".version"];
const SHIPLOG_FILES = ["docs/SHIPPING-LOG.md", "SHIPPING-LOG.md", "docs/CHANGELOG.md", "CHANGELOG.md", "docs/whats-new.html"];
const BRAND_JSON = ["docs/brand.json", "brand.json", "brand/brand.json", ".brand.json"];

// ---- version ----
const versionFile = firstExisting(VERSION_FILES);
const versionFileValue = versionFile ? (rd(versionFile) || "").trim() : null;

// ---- shipping log ----
const shiplogPath = firstExisting(SHIPLOG_FILES);
const shiplog = shiplogPath ? rd(shiplogPath) : null;

// parse markdown "## v1.2.3 — 2026-06-17 · Title" style headings, newest first as written
function parseEntries(md) {
  if (!md) return [];
  const lines = md.split(/\r?\n/);
  const heads = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+v?(\d+\.\d+\.\d+)\b\s*[—–-]?\s*([^·\n]*?)\s*(?:·\s*(.*))?$/);
    if (m) heads.push({ index: i, version: m[1], date: (m[2] || "").trim(), title: (m[3] || "").trim() });
  }
  // body of each entry = lines until the next "## " heading
  return heads.map((h, k) => {
    const end = k + 1 < heads.length ? heads[k + 1].index : lines.length;
    const body = lines.slice(h.index + 1, end).join("\n").replace(/^\s*-{3,}\s*$/gm, "").trim();
    return { version: h.version, date: h.date, title: h.title, body };
  });
}
const entries = parseEntries(shiplog);

// choose the target entry: explicit --version, else the version file, else the newest entry
let target = null;
if (WANT_VERSION) target = entries.find((e) => e.version === WANT_VERSION) || { version: WANT_VERSION, entryFound: false };
else if (versionFileValue) target = entries.find((e) => e.version === versionFileValue) || { version: versionFileValue, entryFound: false };
else target = entries[0] || null;
const targetVersion = target ? target.version : (versionFileValue || WANT_VERSION || null);

// ---- brand ----
const brandJsonPath = firstExisting(BRAND_JSON);
let brand = null;
if (brandJsonPath) { try { brand = JSON.parse(rd(brandJsonPath)); } catch {} }

// ---- prior announcement outputs (don't silently overwrite) ----
function listDir(rel) {
  const dir = join(ROOT, rel);
  if (!existsSync(dir)) return [];
  try { return readdirSync(dir).filter((f) => { try { return statSync(join(dir, f)).isDirectory(); } catch { return false; } }); }
  catch { return []; }
}
const annRoot = "docs/announcements";
const priorVersions = listDir(annRoot).sort();
const targetDir = targetVersion ? `${annRoot}/${targetVersion}` : null;
const targetExisting = targetDir ? (existsSync(join(ROOT, targetDir))
  ? readdirSync(join(ROOT, targetDir)) : []) : [];

const report = {
  root: ROOT,
  version: { file: versionFile, value: versionFileValue, requested: WANT_VERSION, resolved: targetVersion },
  shippingLog: {
    path: shiplogPath,
    entryCount: entries.length,
    versions: entries.map((e) => e.version),
    target: target ? {
      version: target.version,
      date: target.date || null,
      title: target.title || null,
      entryFound: target.body !== undefined,
      bodyChars: target.body ? target.body.length : 0,
    } : null,
  },
  brand: brandJsonPath ? { path: brandJsonPath, name: brand?.name || null, tagline: brand?.tagline || null, colorKeys: brand?.colors ? Object.keys(brand.colors).length : 0 } : null,
  announcements: { dir: annRoot, priorVersions, targetDir, targetExisting },
  warnings: [],
};

if (!shiplogPath) report.warnings.push("No shipping log found — run /ship-changelog first, or pass release notes manually.");
if (!targetVersion) report.warnings.push("No version resolved — pass --version or create docs/VERSION (see version.mjs in shipping-log/user-guide-builder).");
if (target && target.body === undefined) report.warnings.push(`No shipping-log entry for v${targetVersion} — cut it with /ship-changelog or supply the notes by hand.`);
if (!brandJsonPath) report.warnings.push("No docs/brand.json — HTML will fall back to a neutral (non-purple) theme. Run /ship-logos to establish brand tokens.");
if (targetExisting.length) report.warnings.push(`docs/announcements/${targetVersion}/ already has files (${targetExisting.join(", ")}) — confirm before overwriting.`);

if (JSON_OUT) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

console.log(`Release scan  (root: ${ROOT})`);
console.log(`  version    : ${targetVersion || "— none —"}${versionFile ? `  (from ${versionFile})` : ""}`);
console.log(`  ship log   : ${shiplogPath || "— none —"}${entries.length ? `  (${entries.length} entries)` : ""}`);
if (report.shippingLog.target) {
  const t = report.shippingLog.target;
  console.log(`  target     : v${t.version}${t.title ? ` · ${t.title}` : ""}  ${t.entryFound ? `(${t.bodyChars} chars of notes)` : "(NO ENTRY — supply notes)"}`);
}
console.log(`  brand.json : ${brandJsonPath || "— none —"}${report.brand?.name ? `  (${report.brand.name}, ${report.brand.colorKeys} colors)` : ""}`);
console.log(`  prior anns : ${priorVersions.length ? priorVersions.join(", ") : "— none —"}`);
console.log(`  target dir : ${targetDir || "—"}${targetExisting.length ? `  ⚠ already has: ${targetExisting.join(", ")}` : ""}`);
if (report.warnings.length) { console.log("\n  warnings:"); for (const w of report.warnings) console.log(`    ⚠ ${w}`); }
