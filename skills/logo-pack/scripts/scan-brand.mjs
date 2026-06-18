#!/usr/bin/env node
// scan-brand.mjs — discover what brand material already exists before generating logos.
//
// Answers the logo-pack skill's first questions: is there a brand guide? a brand.json?
// an existing logo? It prints a JSON report so the skill chooses ANALYZE (refine the
// existing mark) vs CREATE (design a new one). Dependency-free, bounded (no deep walk).
//
// Usage:  node scan-brand.mjs [--root .] [--json]

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const ROOT = opt("--root", ".");
const JSON_OUT = args.includes("--json");

const IMG = /\.(png|svg|jpe?g|webp|ico|pdf|ai|eps)$/i;
const LOGOISH = /logo|icon|wordmark|brand|mark|favicon|emblem/i;

const BRAND_JSON = ["docs/brand.json", "brand.json", "brand/brand.json", ".brand.json"];
const BRAND_GUIDE = [
  "BRAND.md", "brand.md", "BRANDING.md", "branding.md",
  "docs/brand.md", "docs/BRAND.md", "docs/brand-guide.md", "docs/branding.md",
  "brand/guide.md", "docs/brand/guide.md", "docs/brand/README.md",
];

// candidate folders that commonly hold logos
let LOGO_DIRS = [
  "public/images/logos", "public/logos", "public/images", "public/img", "public",
  "images/logos", "images", "assets/logos", "assets/images", "assets",
  "brand", "brand/logos", "docs/brand", "docs/brand/logos",
  "static", "src/assets", ".",
];
// add monorepo packages/*/public/... candidates
for (const base of ["packages", "apps"]) {
  const baseAbs = join(ROOT, base);
  if (existsSync(baseAbs) && statSync(baseAbs).isDirectory()) {
    for (const pkg of readdirSync(baseAbs)) {
      LOGO_DIRS.push(`${base}/${pkg}/public/images/logos`, `${base}/${pkg}/public/logos`, `${base}/${pkg}/public/images`);
    }
  }
}

function firstExisting(list) {
  for (const p of list) if (existsSync(join(ROOT, p))) return p;
  return null;
}
function listLogos(rel) {
  const dir = join(ROOT, rel);
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((f) => IMG.test(f) && LOGOISH.test(f))
      .map((f) => `${rel}/${f}`.replace(/\/\.\//, "/"));
  } catch { return []; }
}

const brandJsonPath = firstExisting(BRAND_JSON);
let brand = null;
if (brandJsonPath) { try { brand = JSON.parse(readFileSync(join(ROOT, brandJsonPath), "utf8")); } catch {} }

const brandGuide = firstExisting(BRAND_GUIDE);
const logos = [...new Set(LOGO_DIRS.flatMap(listLogos))].sort();

const report = {
  root: ROOT,
  brandJson: brandJsonPath,
  brandName: brand && brand.name ? brand.name : null,
  brandColors: brand && brand.colors ? Object.keys(brand.colors).length : 0,
  brandGuide,
  logos,
  recommendation: logos.length ? "analyze (refine the existing mark) — or create new on request"
    : "create (no existing logo found)",
};

if (JSON_OUT) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

console.log(`Brand scan  (root: ${ROOT})`);
console.log(`  brand.json : ${brandJsonPath || "— none —"}${report.brandName ? `  (${report.brandName}, ${report.brandColors} colors)` : ""}`);
console.log(`  brand guide: ${brandGuide || "— none —"}`);
console.log(`  logos found: ${logos.length ? "" : "— none —"}`);
for (const l of logos) console.log(`    • ${l}`);
console.log(`\n  → recommendation: ${report.recommendation}`);
