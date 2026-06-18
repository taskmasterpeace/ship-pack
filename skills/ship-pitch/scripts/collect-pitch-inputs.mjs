#!/usr/bin/env node
/**
 * collect-pitch-inputs.mjs — DISCOVERY for the ship-pitch skill.
 *
 * Gathers every input an investor one-pager + deck needs, from what the repo ALREADY
 * has, and reports it as one JSON blob. It reads — never writes, never fabricates.
 * If an input is missing it is reported as null/empty with a `gaps[]` note, so the
 * skill can decide to generate it (e.g. run the shipping-log first) or flag a
 * traction placeholder instead of inventing a number.
 *
 * Sources (all optional, all auto-discovered):
 *   • docs/brand.json ........ name, tagline, colors, fonts  (brand-as-data)
 *   • docs/VERSION ........... the shared semver anchor
 *   • shipping log ........... docs/SHIPPING-LOG.md / CHANGELOG.md  → momentum + versions
 *   • git history ............ real momentum stats (commits, active days, span)  [if git]
 *   • product guide .......... docs/user-guide/*.md  → what the product does, for whom
 *   • prior pitch outputs .... docs/pitch/*           → so we update, not clobber
 *
 * Usage (from the repo root):
 *   node collect-pitch-inputs.mjs [--root .] [--days 30]
 *
 * Output: JSON on stdout. Dependency-free. Cross-platform. Read-only & safe.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const ROOT = opt("--root", ".");
const DAYS = Number(opt("--days", 30));

const rel = (p) => join(ROOT, p);
const readIf = (p) => { try { return existsSync(rel(p)) ? readFileSync(rel(p), "utf8") : null; } catch { return null; } };
const first = (list) => { for (const p of list) if (existsSync(rel(p))) return p; return null; };
const sh = (cmd) => { try { return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } };

const gaps = [];

// ---------- brand.json ----------
const BRAND_PATHS = ["docs/brand.json", "brand.json", "brand/brand.json", ".brand.json"];
const brandPath = first(BRAND_PATHS);
let brand = null;
if (brandPath) { try { brand = JSON.parse(readFileSync(rel(brandPath), "utf8")); } catch { gaps.push(`brand.json at ${brandPath} is not valid JSON`); } }
else gaps.push("No docs/brand.json — run /ship-logos or hand-write one so the pitch is on-brand (and not purple).");

// ---------- VERSION ----------
const versionPath = first(["docs/VERSION", "VERSION"]);
const version = versionPath ? (readIf(versionPath) || "").trim() || null : null;
if (!version) gaps.push("No docs/VERSION anchor — run the shipping-log / version.mjs to stamp a version.");

// ---------- shipping log (the source of truth for momentum + shipped features) ----------
const logPath = first(["docs/SHIPPING-LOG.md", "CHANGELOG.md", "docs/CHANGELOG.md", "docs/whats-new.md"]);
const logText = logPath ? readIf(logPath) : null;
let shippingLog = null;
if (logText) {
  // version headings like "## v1.4.0 — 2026-06-17"
  const versions = [...logText.matchAll(/^##\s+v?(\d+\.\d+\.\d+)\s*[—\-–]?\s*(\d{4}-\d{2}-\d{2})?/gim)]
    .map((m) => ({ version: m[1], date: m[2] || null }));
  const categories = {
    new: (logText.match(/\b(New|Added)\b/gi) || []).length,
    improved: (logText.match(/\bImproved\b/gi) || []).length,
    fixed: (logText.match(/\bFixed\b/gi) || []).length,
    security: (logText.match(/\bSecurity\b/gi) || []).length,
  };
  shippingLog = {
    path: logPath,
    releases: versions.length,
    latest: versions[0] || null,
    first: versions[versions.length - 1] || null,
    versions: versions.slice(0, 12),
    category_mentions: categories,
  };
} else {
  gaps.push("No shipping log (docs/SHIPPING-LOG.md). Run /ship-changelog first so momentum stats are real, not guessed.");
}

// ---------- git momentum (real numbers; only if this is a git repo) ----------
let git = null;
if (sh("git rev-parse --is-inside-work-tree") === "true") {
  const FMT = "%ad";
  const dates = sh(`git log --since="${DAYS} days ago" --date=short --pretty=format:"${FMT}"`)
    .split("\n").map((s) => s.trim()).filter(Boolean);
  const uniqDays = [...new Set(dates)].sort();
  const allDates = sh(`git log --date=short --pretty=format:"${FMT}"`).split("\n").map((s) => s.trim()).filter(Boolean).sort();
  const tags = sh("git tag --sort=-creatordate").split("\n").filter(Boolean);
  // shortlog needs a TTY in some shells; counting unique authors via git log is robust.
  const contributors = [...new Set(
    sh(`git log --since="${DAYS} days ago" --format="%an"`).split("\n").map((s) => s.trim()).filter(Boolean)
  )].length;
  const span = allDates.length ? `${allDates[0]} → ${allDates[allDates.length - 1]}` : null;
  git = {
    window_days: DAYS,
    commits_in_window: dates.length,
    active_days_in_window: uniqDays.length,
    contributors_in_window: contributors,
    total_commits: allDates.length || null,
    history_span: span,
    last_shipped: allDates[allDates.length - 1] || null,
    tags: tags.slice(0, 10),
    uncommitted: sh("git status --porcelain").split("\n").filter(Boolean).length,
  };
} else {
  gaps.push("Not a git repo — momentum stats will rely on the shipping log only.");
}

// ---------- product guide (what it does / who it is for) ----------
const guideDir = first(["docs/user-guide", "docs/guide", "docs"]);
let guide = null;
if (guideDir) {
  try {
    const mds = readdirSync(rel(guideDir)).filter((f) => /\.md$/i.test(f) && /guide|manual|user|help|docs/i.test(f));
    if (mds.length) {
      const g = mds.sort((a, b) => statSync(rel(join(guideDir, b))).mtimeMs - statSync(rel(join(guideDir, a))).mtimeMs)[0];
      const text = readIf(join(guideDir, g)) || "";
      const headings = [...text.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].replace(/\s*#+\s*$/, "").trim()).slice(0, 40);
      guide = { path: join(guideDir, g), headings, words: text.split(/\s+/).filter(Boolean).length };
    }
  } catch { /* ignore */ }
}
if (!guide) gaps.push("No product/user guide found — run /ship-guide so 'what is shipped' and 'who it's for' are grounded.");

// ---------- prior pitch outputs (update, don't clobber) ----------
const PITCH_FILES = ["docs/pitch/one-pager.md", "docs/pitch/one-pager.html", "docs/pitch/deck-outline.md"];
const priorPitch = PITCH_FILES.filter((p) => existsSync(rel(p)));

// ---------- README / landing (extra framing, verify before trusting) ----------
const readmePath = first(["README.md", "docs/README.md"]);

const report = {
  root: ROOT,
  brand: brand ? { path: brandPath, name: brand.name || null, tagline: brand.tagline || null,
    colors: brand.colors ? Object.keys(brand.colors).length : 0, fonts: brand.fonts || null } : { path: null },
  version: { path: versionPath, value: version },
  shippingLog,
  git,
  guide,
  readme: readmePath,
  priorPitch,
  gaps,
  ready: !!brand && !!(shippingLog || git) && !!guide,
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");
