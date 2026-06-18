#!/usr/bin/env node
// discover-promo.mjs — inventory the inputs a promo plan needs, before writing anything.
//
// Dependency-free, cross-platform. Run from the repo root (or pass --root <dir>).
// Reports, as JSON: brand (parsed from docs/brand.json), version (docs/VERSION),
// the changelog / guide / screenshots / logos it found, any prior docs/promo/* outputs,
// and a `gaps` list of missing inputs so the skill can be honest instead of guessing.
//
// Usage:
//   node discover-promo.mjs [--root <dir>] [--pretty]
//
// Exit codes: 0 always (discovery never fails the run; absence is data, not an error).

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const ROOT = resolve(rootIdx !== -1 ? args[rootIdx + 1] : process.cwd());
const PRETTY = args.includes("--pretty");

const p = (...parts) => join(ROOT, ...parts);
const has = (rel) => existsSync(p(rel));

function readText(rel) {
  try { return readFileSync(p(rel), "utf8"); } catch { return null; }
}

function readJson(rel) {
  const raw = readText(rel);
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch (e) { return { __parse_error: String(e.message || e) }; }
}

// List files under a dir (one level) matching extensions; returns repo-relative paths.
function listFiles(rel, exts) {
  const dir = p(rel);
  if (!existsSync(dir)) return [];
  let out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st; try { st = statSync(full); } catch { continue; }
    if (st.isFile()) {
      if (!exts || exts.some((e) => name.toLowerCase().endsWith(e))) {
        out.push(`${rel}/${name}`.replace(/\\/g, "/"));
      }
    }
  }
  return out;
}

// First existing path from a candidate list.
function firstExisting(cands) {
  for (const c of cands) if (has(c)) return c.replace(/\\/g, "/");
  return null;
}

// ---- brand.json -----------------------------------------------------------
const brandRaw = readJson("docs/brand.json");
let brand = null;
if (brandRaw && !brandRaw.__parse_error) {
  brand = {
    found: true,
    name: brandRaw.name ?? null,
    tagline: brandRaw.tagline ?? null,
    colors: brandRaw.colors ?? null,
    fonts: brandRaw.fonts ?? null,
  };
} else if (brandRaw && brandRaw.__parse_error) {
  brand = { found: true, parse_error: brandRaw.__parse_error };
} else {
  brand = { found: false };
}

// ---- version --------------------------------------------------------------
const versionRaw = readText("docs/VERSION");
const version = versionRaw ? versionRaw.trim() : null;

// ---- changelog ------------------------------------------------------------
const changelogPath = firstExisting([
  "docs/SHIPPING-LOG.md",
  "docs/CHANGELOG.md",
  "CHANGELOG.md",
  "docs/whats-new.html",
]);

// ---- user guide -----------------------------------------------------------
const guidePath = firstExisting([
  "docs/user-guide",                 // directory case handled below
  "docs/USER-GUIDE.md",
  "docs/user-guide.md",
  "docs/GUIDE.md",
]);
// If the guide is a directory, surface its markdown files.
let guideFiles = [];
if (guidePath && existsSync(p(guidePath)) && statSync(p(guidePath)).isDirectory()) {
  guideFiles = listFiles(guidePath, [".md", ".html"]);
}

// ---- screenshots ----------------------------------------------------------
const screenshotDirs = ["screenshots", "docs/screenshots", "docs/images/screenshots"];
let screenshots = [];
let screenshotDir = null;
for (const d of screenshotDirs) {
  const found = listFiles(d, [".png", ".jpg", ".jpeg", ".webp"]);
  if (found.length) { screenshots = found; screenshotDir = d; break; }
}

// ---- logos ----------------------------------------------------------------
const logoDirs = ["docs/brand/logos", "docs/brand", "public/images/logos", "images/logos"];
let logos = [];
let logoDir = null;
for (const d of logoDirs) {
  const found = listFiles(d, [".png", ".svg", ".jpg", ".webp"]);
  if (found.length) { logos = found; logoDir = d; break; }
}

// ---- prior promo outputs --------------------------------------------------
const priorPromo = {
  voiceover: has("docs/promo/voiceover.md"),
  shotlist: has("docs/promo/shotlist.md"),
  storyboard: has("docs/promo/storyboard.md"),
  storyboard_html: has("docs/promo/storyboard.html"),
  files: listFiles("docs/promo", null),
};
const promoExists = priorPromo.files.length > 0;

// ---- gaps -----------------------------------------------------------------
const gaps = [];
if (!brand.found) gaps.push("no docs/brand.json — infer brand from landing page/logo and note it");
if (brand.found && brand.parse_error) gaps.push(`docs/brand.json is invalid JSON: ${brand.parse_error}`);
if (!version) gaps.push("no docs/VERSION — promo won't be version-stamped; run ship-changelog/version.mjs");
if (!changelogPath) gaps.push("no changelog (docs/SHIPPING-LOG.md) — run /ship-changelog before promising features");
if (!guidePath) gaps.push("no user guide — claims can't be cross-checked against how features work");
if (!screenshots.length) gaps.push("no screenshots — storyboard will use generated placeholders; consider /ship-screenshots");
if (!logos.length) gaps.push("no logo found — end card will use a text wordmark");

const report = {
  root: ROOT,
  brand,
  version,
  changelog: changelogPath,
  guide: { path: guidePath, files: guideFiles },
  screenshots: { dir: screenshotDir, count: screenshots.length, sample: screenshots.slice(0, 12) },
  logos: { dir: logoDir, count: logos.length, files: logos.slice(0, 12) },
  prior_promo: promoExists ? priorPromo : null,
  gaps,
  next: promoExists
    ? "prior promo outputs exist — UPDATE them in place, do not clobber"
    : "no prior promo — create docs/promo/ fresh",
};

process.stdout.write(JSON.stringify(report, null, PRETTY ? 2 : 0) + "\n");
