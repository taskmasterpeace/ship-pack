#!/usr/bin/env node
// onboarding.mjs — derive / validate / lint a first-run onboarding spec (docs/onboarding.json).
//
// This is the data half of the ship-onboarding skill. It does NOT invent product copy on its
// own — that's your job, from real evidence in the guide. What it does, dependency-free:
//
//   scaffold  Build a DRAFT docs/onboarding.json by reading the user guide's main-workflow
//             headings and (optionally) the screenshot config's shot ids. Every step is marked
//             "draft": true and carries a TODO selector so nothing pretends to be wired up.
//   validate  Lint an existing docs/onboarding.json: schema shape, unique step ids, version
//             match against docs/VERSION, duplicate selectors, and missing screenshot ids.
//   gaps      Report what's missing without writing: steps with TODO selectors, steps whose
//             screenshot id has no captured PNG, and guide workflows not yet covered by a step.
//
// Usage:
//   node onboarding.mjs scaffold [--guide docs/user-guide/Guide.md] [--shots docs/screenshots.config.json]
//                                [--out docs/onboarding.json] [--version docs/VERSION] [--force]
//   node onboarding.mjs validate [--in docs/onboarding.json] [--version docs/VERSION]
//   node onboarding.mjs gaps     [--in docs/onboarding.json] [--guide docs/user-guide/Guide.md]
//                                [--shots docs/screenshots.config.json]
// Options:
//   --json    machine-readable result on stdout
//
// Exit codes: 0 ok / clean, 1 usage or validation failure. No external dependencies.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const flag = (n) => args.includes(n);
const JSON_OUT = flag("--json");

function fail(msg) { console.error(`onboarding: ${msg}`); process.exit(1); }
function readJSON(p) { return JSON.parse(readFileSync(p, "utf8")); }
function todayISO() { return new Date().toISOString().slice(0, 10); }

// ---- slug + id helpers -------------------------------------------------------
const slug = (s) =>
  s.toLowerCase().replace(/[`*_]/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40);

// Drop a leading "12. " numbering, trailing "—" clauses, and "& AI notes"-style noise.
function cleanHeading(h) {
  return h.replace(/^\s*\d+[.)]\s*/, "").replace(/\s*[—–-].*$/, "").replace(/[`*_]/g, "").trim();
}

// Headings that describe how to USE the product (workflow candidates), not meta sections.
const META = /^(table of contents|glossary|appendix|documentation maintenance|faq|frequently|troubleshooting|known gaps|coming soon|what is|who it'?s for|account|help|support|overview)/i;

function guideWorkflows(guidePath) {
  if (!existsSync(guidePath)) return [];
  const md = readFileSync(guidePath, "utf8").replace(/```[\s\S]*?```/g, "");
  const out = [];
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^(#{2,3})\s+(.*)$/);
    if (!m) continue;
    const raw = m[2].replace(/\s*#+\s*$/, "").trim();
    const title = cleanHeading(raw);
    if (!title || META.test(title) || META.test(raw)) continue;
    out.push({ title, id: slug(title) });
  }
  // de-dup by id, keep first
  const seen = new Set();
  return out.filter((w) => (seen.has(w.id) ? false : seen.add(w.id)));
}

function shotIds(shotsPath) {
  if (!shotsPath || !existsSync(shotsPath)) return { ids: [], outDir: null, shots: [] };
  const cfg = readJSON(shotsPath);
  return {
    ids: (cfg.shots || []).map((s) => s.id).filter(Boolean),
    outDir: cfg.outDir || null,
    shots: cfg.shots || [],
  };
}

// ---- schema validation -------------------------------------------------------
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function validateSpec(spec, opts = {}) {
  const errors = [], warnings = [];
  if (!spec || typeof spec !== "object") { errors.push("root is not an object"); return { errors, warnings }; }
  if (!Array.isArray(spec.steps)) { errors.push("`steps` must be an array"); return { errors, warnings }; }
  if (spec.steps.length === 0) warnings.push("`steps` is empty — no tour to show");
  if (spec.version && !SEMVER.test(spec.version)) errors.push(`\`version\` "${spec.version}" is not semver`);
  if (opts.anchorVersion && spec.version && spec.version !== opts.anchorVersion)
    warnings.push(`spec version ${spec.version} != docs/VERSION ${opts.anchorVersion} — re-stamp before shipping`);

  const ids = new Set(), selectors = new Map();
  spec.steps.forEach((s, idx) => {
    const at = `steps[${idx}]`;
    if (!s.id) errors.push(`${at}: missing \`id\``);
    else if (ids.has(s.id)) errors.push(`${at}: duplicate id "${s.id}"`);
    else ids.add(s.id);
    if (!s.title) warnings.push(`${at} (${s.id || "?"}): missing \`title\``);
    if (!s.body) warnings.push(`${at} (${s.id || "?"}): missing \`body\` copy`);
    if (s.selector) {
      if (/TODO|REPLACE|\?\?\?/i.test(s.selector)) warnings.push(`${at} (${s.id}): selector is a placeholder ("${s.selector}")`);
      const prior = selectors.get(s.selector);
      if (prior) warnings.push(`${at} (${s.id}): selector "${s.selector}" also used by step "${prior}"`);
      else selectors.set(s.selector, s.id);
    } else if (s.placement !== "center" && s.placement !== "modal") {
      warnings.push(`${at} (${s.id}): no \`selector\` and not a centered/modal step — it will float`);
    }
    if (opts.shotIds && s.screenshot && !opts.shotIds.includes(s.screenshot))
      warnings.push(`${at} (${s.id}): screenshot id "${s.screenshot}" has no matching shot in the capture config`);
  });
  return { errors, warnings };
}

// ---- commands ----------------------------------------------------------------
function cmdScaffold() {
  const guide = opt("--guide", autoGuide());
  const shotsPath = opt("--shots", "docs/screenshots.config.json");
  const out = opt("--out", "docs/onboarding.json");
  const vfile = opt("--version", "docs/VERSION");
  if (existsSync(out) && !flag("--force"))
    fail(`${out} already exists — edit it, or pass --force to overwrite a draft`);

  const version = existsSync(vfile) ? readFileSync(vfile, "utf8").trim() : "0.1.0";
  const flows = guideWorkflows(guide);
  const shots = shotIds(shotsPath);
  if (flows.length === 0)
    console.error(`onboarding: warning — no workflow headings found in ${guide}; emitting a starter step only`);

  const steps = [];
  // Always open with a welcome/center step.
  steps.push({
    id: "welcome", title: "Welcome", placement: "center", selector: null,
    body: "REPLACE with one sentence on the first win a new user should get here.",
    cta: "Take the tour", draft: true,
  });
  // One coachmark per top workflow (cap at 7 — a first-run tour should be short).
  for (const f of flows.slice(0, 7)) {
    const screenshot = shots.ids.includes(f.id) ? f.id : null;
    steps.push({
      id: f.id,
      title: f.title,
      selector: `TODO: data-tour=\"${f.id}\"`,   // add this attribute to the real element
      placement: "bottom",
      body: `REPLACE with what \"${f.title}\" does and the one action to try, grounded in the guide.`,
      ...(screenshot ? { screenshot } : {}),
      route: null,                                 // optional: path to navigate to for this step
      draft: true,
    });
  }
  steps.push({
    id: "finish", title: "You're set", placement: "center", selector: null,
    body: "REPLACE with the single next action that gets them to value.",
    cta: "Start building", draft: true,
  });

  const spec = {
    $schema: "ship-onboarding/1",
    name: tryBrandName() || "this app",
    version,
    updated: todayISO(),
    storageKey: "onboarding:v" + version,   // bump => returning users see the new tour once
    persona: "new-user",                     // duplicate the block per role if onboarding differs
    steps,
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(spec, null, 2) + "\n", "utf8");

  const msg = `scaffolded ${out}: ${steps.length} steps (${flows.length} workflows seen, ` +
    `${steps.filter((s) => s.screenshot).length} with screenshots). All steps draft:true — fill the copy + real selectors.`;
  if (JSON_OUT) console.log(JSON.stringify({ out, steps: steps.length, workflows: flows.length }));
  else console.log("onboarding: " + msg);
}

function cmdValidate() {
  const inPath = opt("--in", "docs/onboarding.json");
  const vfile = opt("--version", "docs/VERSION");
  if (!existsSync(inPath)) fail(`${inPath} not found — run "scaffold" first`);
  const anchorVersion = existsSync(vfile) ? readFileSync(vfile, "utf8").trim() : null;
  let spec; try { spec = readJSON(inPath); } catch (e) { fail(`${inPath} is not valid JSON: ${e.message}`); }
  const { errors, warnings } = validateSpec(spec, { anchorVersion });
  const drafts = (spec.steps || []).filter((s) => s.draft).map((s) => s.id);

  if (JSON_OUT) { console.log(JSON.stringify({ ok: errors.length === 0, errors, warnings, drafts })); }
  else {
    if (errors.length) { console.error("onboarding: ERRORS"); errors.forEach((e) => console.error("  ✗ " + e)); }
    if (warnings.length) { console.error("onboarding: warnings"); warnings.forEach((w) => console.error("  ! " + w)); }
    if (drafts.length) console.error(`onboarding: ${drafts.length} step(s) still draft:true → ${drafts.join(", ")}`);
    if (!errors.length && !warnings.length && !drafts.length) console.log("onboarding: spec is clean and fully drafted ✓");
  }
  process.exit(errors.length ? 1 : 0);
}

function cmdGaps() {
  const inPath = opt("--in", "docs/onboarding.json");
  const guide = opt("--guide", autoGuide());
  const shotsPath = opt("--shots", "docs/screenshots.config.json");
  if (!existsSync(inPath)) fail(`${inPath} not found — run "scaffold" first`);
  const spec = readJSON(inPath);
  const flows = guideWorkflows(guide);
  const shots = shotIds(shotsPath);

  const todoSelectors = spec.steps.filter((s) => s.selector && /TODO|REPLACE|\?\?\?/i.test(s.selector)).map((s) => s.id);
  const draftCopy = spec.steps.filter((s) => /REPLACE/i.test(s.body || "")).map((s) => s.id);
  const coveredIds = new Set(spec.steps.map((s) => s.id));
  const uncovered = flows.filter((f) => !coveredIds.has(f.id)).map((f) => f.title);
  const missingShots = spec.steps
    .filter((s) => s.screenshot)
    .filter((s) => !pngExists(shots.outDir, s.screenshot))
    .map((s) => `${s.id} → ${s.screenshot}`);

  const report = { todoSelectors, draftCopy, uncoveredWorkflows: uncovered, missingScreenshots: missingShots };
  if (JSON_OUT) { console.log(JSON.stringify(report)); return; }
  const line = (label, arr) => console.log(`  ${label}: ${arr.length ? arr.join(", ") : "none ✓"}`);
  console.log("onboarding: gap report");
  line("selectors still TODO", todoSelectors);
  line("copy still says REPLACE", draftCopy);
  line("workflows in guide not in tour", uncovered);
  line("steps whose screenshot PNG is missing", missingShots);
}

// ---- small fs/brand helpers --------------------------------------------------
function pngExists(outDir, id) {
  if (!outDir) return false;
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) if (existsSync(join(outDir, id + ext))) return true;
  return false;
}
function tryBrandName() {
  try { if (existsSync("docs/brand.json")) return readJSON("docs/brand.json").name || null; } catch {}
  return null;
}
// Best-effort: find a single user guide if --guide not given.
function autoGuide() {
  const cands = ["docs/user-guide.md", "docs/user-guide/user-guide.md"];
  for (const c of cands) if (existsSync(c)) return c;
  // fall back to first *.md under docs/user-guide via a shallow check
  try {
    const dir = "docs/user-guide";
    if (existsSync(dir)) {
      const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
      const md = files.find((f) => /user-?guide/i.test(f)) || files[0];
      if (md) return join(dir, md);
    }
  } catch {}
  return "docs/user-guide.md";
}

switch (cmd) {
  case "scaffold": cmdScaffold(); break;
  case "validate": cmdValidate(); break;
  case "gaps": cmdGaps(); break;
  default:
    console.log("Usage: node onboarding.mjs <scaffold|validate|gaps> [--guide ..] [--shots ..] [--in ..] [--out ..] [--version ..] [--json] [--force]");
    process.exit(cmd ? 1 : 0);
}
