#!/usr/bin/env node
// capture.mjs — documentation screenshot capturer for the docs-release skill pack.
//
// Drives a RUNNING web app with Playwright, captures consistent screenshots from a
// config-driven shot list, optionally redacts/annotates, and fills [SCREENSHOT: id]
// markers in a user guide with image embeds. Re-runnable: regenerate every shot when a
// feature changes, instead of hand-capturing.
//
// Usage:
//   node capture.mjs [--config docs/screenshots.config.json] [options]
// Options:
//   --dry-run        Parse the guide's [SCREENSHOT: …] markers + the shot list and print
//                    the capture plan + gaps. No browser, no Playwright needed. Start here.
//   --only a,b,c     Capture only these shot ids.
//   --fill-markers   After capturing, replace [SCREENSHOT: id|label] in the guide with
//                    ![label](relative/path.png).
//   --base <url>     Override config.baseUrl (e.g. a different dev port).
//
// Credentials: prefer env vars over committing secrets. In an auth "fill" step set
// "env":"SHOT_PASS" instead of "value":"...". Use demo/test accounts only.
// Real captures need Playwright:  npm i -D playwright && npx playwright install chromium

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const has = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };

const CONFIG = opt("--config", "docs/screenshots.config.json");
const DRY = has("--dry-run");
const FILL = has("--fill-markers");
const ONLY = opt("--only", "") ? opt("--only", "").split(",").map((s) => s.trim()).filter(Boolean) : null;

const fail = (m) => { console.error(`capture: ${m}`); process.exit(1); };

function loadConfig() {
  if (!existsSync(CONFIG)) fail(`config not found at ${CONFIG} — copy assets/screenshots.config.example.json there`);
  let cfg;
  try { cfg = JSON.parse(readFileSync(CONFIG, "utf8")); }
  catch (e) { fail(`config is not valid JSON: ${e.message}`); }
  cfg.baseUrl = opt("--base", cfg.baseUrl) || "http://localhost:3000";
  cfg.outDir = cfg.outDir || "docs/screenshots";
  cfg.viewport = cfg.viewport || { width: 1440, height: 900 };
  cfg.shots = cfg.shots || [];
  return cfg;
}

function parseMarkers(guidePath) {
  if (!guidePath || !existsSync(guidePath)) return [];
  const re = /\[SCREENSHOT:\s*([^\]]+?)\s*\]/g;
  const txt = readFileSync(guidePath, "utf8");
  const out = [];
  let m;
  while ((m = re.exec(txt))) out.push(m[1]);
  return out;
}

const cfg = loadConfig();
const shots = ONLY ? cfg.shots.filter((s) => ONLY.includes(s.id)) : cfg.shots;
const markers = parseMarkers(cfg.guide);

// ---------- DRY RUN: plan + gap report, no browser ----------
if (DRY) {
  console.log(`Capture plan  (config: ${CONFIG})`);
  console.log(`  baseUrl : ${cfg.baseUrl}`);
  console.log(`  outDir  : ${cfg.outDir}`);
  console.log(`  viewport: ${cfg.viewport.width}x${cfg.viewport.height} @2x`);
  console.log(`\n  Shots configured (${shots.length}):`);
  for (const s of shots) console.log(`    - ${String(s.id).padEnd(22)} ${s.url || s.selector || ""}`);
  if (cfg.guide) {
    const ids = new Set(cfg.shots.map((s) => s.id));
    const labels = new Set(cfg.shots.map((s) => s.label).filter(Boolean));
    const uniqMarkers = [...new Set(markers)];
    const orphan = uniqMarkers.filter((mk) => !ids.has(mk) && !labels.has(mk));
    const unused = cfg.shots.filter((s) => !markers.includes(s.id) && !(s.label && markers.includes(s.label)));
    console.log(`\n  Guide: ${cfg.guide}`);
    console.log(`    [SCREENSHOT: …] markers found: ${markers.length} (${uniqMarkers.length} unique)`);
    if (orphan.length) console.log(`    markers with NO matching shot (add to config):\n      - ${orphan.join("\n      - ")}`);
    if (unused.length) console.log(`    shots with no marker in the guide: ${unused.map((s) => s.id).join(", ")}`);
    if (!orphan.length && !unused.length) console.log(`    ✓ every marker has a shot and vice-versa`);
  }
  console.log(`\n  (dry run — no browser launched)`);
  process.exit(0);
}

// ---------- REAL CAPTURE (needs Playwright) ----------
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { fail("Playwright not installed. Run: npm i -D playwright && npx playwright install chromium  (or use --dry-run)"); }

const outAbs = resolve(cfg.outDir);
mkdirSync(outAbs, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: cfg.viewport, deviceScaleFactor: 2 });
const page = await ctx.newPage();

async function doAuth() {
  if (!cfg.auth) return;
  const a = cfg.auth;
  await page.goto(cfg.baseUrl + (a.loginUrl || "/login"), { waitUntil: "networkidle" });
  for (const step of a.steps || []) {
    if (step.fill) await page.fill(step.fill, step.env ? (process.env[step.env] || "") : step.value);
    else if (step.click) await page.click(step.click);
    else if (step.waitFor) await page.waitForURL("**" + step.waitFor + "**", { timeout: 15000 }).catch(() => {});
    else if (step.wait) await page.waitForTimeout(step.wait);
  }
}

const subst = (url) => url.replace(/\{(\w+)\}/g, (_, k) => (cfg.vars && cfg.vars[k]) || "");
const results = [];

try {
  await doAuth();
  for (const s of shots) {
    try {
      if (s.url) await page.goto(cfg.baseUrl + subst(s.url), { waitUntil: "networkidle" });
      if (s.waitFor) await page.waitForSelector(s.waitFor, { timeout: 15000 }).catch(() => {});
      if (s.wait) await page.waitForTimeout(s.wait);
      if (s.highlight) {
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) { el.style.outline = "3px solid #FFDD00"; el.style.outlineOffset = "3px"; el.scrollIntoView({ block: "center" }); }
        }, s.highlight);
      }
      const file = join(outAbs, `${s.id}.png`);
      const masks = (s.mask || []).map((sel) => page.locator(sel)); // native redaction
      if (s.selector) await page.locator(s.selector).screenshot({ path: file, mask: masks });
      else await page.screenshot({ path: file, fullPage: !!s.fullPage, clip: s.clip, mask: masks });
      results.push({ id: s.id, label: s.label || s.id, file });
      console.log(`  ✓ ${s.id} → ${relative(process.cwd(), file)}`);
    } catch (e) {
      console.error(`  ✗ ${s.id}: ${e.message}`);
    }
  }
} finally {
  await browser.close();
}

// ---------- fill [SCREENSHOT: …] markers ----------
if (FILL && cfg.guide && existsSync(cfg.guide)) {
  let txt = readFileSync(cfg.guide, "utf8");
  let n = 0;
  for (const r of results) {
    const rel = relative(dirname(cfg.guide), r.file).replace(/\\/g, "/");
    const embed = `![${r.label}](${rel})`;
    const esc = (r.label || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\[SCREENSHOT:\\s*(?:${r.id}|${esc})\\s*\\]`, "g");
    txt = txt.replace(re, () => { n++; return embed; });
  }
  writeFileSync(cfg.guide, txt, "utf8");
  console.log(`  filled ${n} marker(s) in ${cfg.guide}`);
}

console.log(`Done: ${results.length}/${shots.length} captured.`);
