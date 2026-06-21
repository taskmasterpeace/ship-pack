#!/usr/bin/env node
// pack.mjs — bundle the "ship" pack (skills + slash commands) into a shareable Claude Code plugin.
//
// Copies the listed skills + commands out of your GLOBAL ~/.claude into a self-contained plugin
// folder with a .claude-plugin/plugin.json (+ marketplace.json + a rich README + LICENSE), so
// anyone can install it with /plugin — or drop it into their own ~/.claude. Dependency-free.
//
// Usage:
//   node pack.mjs [--out <dir>] [--src-skills <dir>] [--src-commands <dir>] [--version x.y.z] [--repo owner/name]

import { cpSync, mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const HOME = homedir();
const SRC_SKILLS = opt("--src-skills", join(HOME, ".claude", "skills"));
const SRC_CMDS = opt("--src-commands", join(HOME, ".claude", "commands"));
const OUT = opt("--out", join(HOME, "ship-pack"));
const VERSION = opt("--version", "1.0.0");
const REPO = opt("--repo", "<github-owner>/ship-pack");

const SKILLS = [
  "user-guide-builder", "shipping-log", "screenshot-capture", "logo-pack",
  "ship-brand", "ship-feed", "ship-helpbot", "ship-email", "ship-onboarding",
  "ship-faq", "ship-pitch", "ship-demo", "ship-promo", "ship-press",
];
const COMMANDS = [
  "ship-release", "ship-changelog", "ship-guide", "ship-screenshots", "ship-logos",
  "ship-brand", "ship-feed", "ship-helpbot", "ship-email", "ship-onboarding",
  "ship-faq", "ship-pitch", "ship-demo", "ship-promo", "ship-press",
];

// Curated, detailed command reference (rendered into the README, grouped).
// "args" uses · not | so it is safe inside markdown tables.
const CATALOG = [
  { emoji: "🚀", title: "Release & docs", items: [
    { cmd: "ship-release", args: "major · minor · patch", what: "Cut a whole release in one command — bump the version, write the changelog, re-stamp & re-render the user guide, and refresh screenshots, all in sync.", writes: "docs/VERSION, SHIPPING-LOG.md, the guide, whats-new.html" },
    { cmd: "ship-changelog", args: "\"last 7 days\" · \"since v0.7.0\" · minor", what: "Turn git history into a benefit-first changelog grouped by version, then render a themed \"What's New\" page. Scope by date, version range, or author.", writes: "docs/SHIPPING-LOG.md, docs/whats-new.html" },
    { cmd: "ship-guide", args: "focus area", what: "Build or update a full-depth user & admin guide, then render it to a navigable HTML page (sidebar TOC, search, scroll-spy).", writes: "docs/user-guide.md + .html" },
    { cmd: "ship-screenshots", args: "--dry-run · --only ids", what: "Capture consistent app screenshots (fixed viewport, redaction, callouts) and drop them into the guide's [SCREENSHOT] markers.", writes: "docs/…/screenshots/*.png" },
  ] },
  { emoji: "🎨", title: "Brand & visuals", items: [
    { cmd: "ship-logos", args: "new · name", what: "Detect an existing logo and refine it (or design fresh) — a tailored prompt set: minimalist, monochrome, comfortable, premium + icon/wordmark/monogram.", writes: "docs/brand/logo-brief.md, logo-prompts.json" },
    { cmd: "ship-brand", args: "", what: "Generate a full brand kit from brand.json — palette (50–900 + WCAG-checked pairs), type scale, favicon + app-icon manifest, social avatar/banner, OG image.", writes: "docs/brand/*" },
  ] },
  { emoji: "💬", title: "In-app & support", items: [
    { cmd: "ship-helpbot", args: "", what: "Build an embeddable \"ask the guide\" assistant — a retrieval index, a <ship-helpbot> web component, and a model-pluggable /api/ask-docs route that answers with citations.", writes: "docs/guide-index.json, public/ship-helpbot.js" },
    { cmd: "ship-onboarding", args: "", what: "Generate an in-app first-run tour / coachmarks from the guide's main workflows, themed from brand.json.", writes: "docs/onboarding.json + tour component" },
    { cmd: "ship-faq", args: "", what: "Build a help center from the guide — a real-question FAQ, canned support replies, and a searchable, on-brand help page.", writes: "docs/FAQ.md, docs/help.html" },
    { cmd: "ship-feed", args: "", what: "Turn the shipping log into data — changelog.json + an RSS/Atom feed + a <ship-changelog> web component for a company-page \"What's new\".", writes: "docs/changelog.json, changelog.xml" },
  ] },
  { emoji: "📣", title: "Growth & launch", items: [
    { cmd: "ship-email", args: "audience", what: "Turn a release into a customer email (HTML + text), an in-app \"What's new\" modal, and a short social post — audience-tailored.", writes: "docs/announcements/<version>/" },
    { cmd: "ship-pitch", args: "", what: "Generate an investor one-pager + slide-by-slide deck outline from your brand, momentum stats, and guide — never fabricates a metric.", writes: "docs/pitch/one-pager.md + .html, deck-outline.md" },
    { cmd: "ship-demo", args: "focus", what: "Discover your data model and write an idempotent, obviously-fake seed + a guided live-demo script.", writes: "seed script, docs/demo/script.md" },
    { cmd: "ship-promo", args: "15s · 60s · feature", what: "Turn what you shipped into a promo-video plan — voiceover script, timed shotlist, storyboard, + generator-ready prompts.", writes: "docs/promo/*" },
    { cmd: "ship-press", args: "", what: "Generate a launch kit — a press release, Product Hunt assets, and a launch-day checklist. Public-safe, zero fabricated quotes.", writes: "docs/press/*" },
  ] },
];

mkdirSync(join(OUT, ".claude-plugin"), { recursive: true });
mkdirSync(join(OUT, "skills"), { recursive: true });
mkdirSync(join(OUT, "commands"), { recursive: true });

const missing = [];
let skn = 0, cmn = 0;
for (const s of SKILLS) {
  const src = join(SRC_SKILLS, s);
  if (!existsSync(join(src, "SKILL.md"))) { missing.push("skill:" + s); continue; }
  cpSync(src, join(OUT, "skills", s), { recursive: true });
  skn++;
}
for (const c of COMMANDS) {
  const src = join(SRC_CMDS, c + ".md");
  if (!existsSync(src)) { missing.push("command:" + c); continue; }
  cpSync(src, join(OUT, "commands", c + ".md"));
  cmn++;
}

// ---------- portability + privacy pass on the bundled .md files ----------
// Make the SHARED copy machine-agnostic: rewrite the author's absolute ~/.claude path to the
// plugin-relative ${CLAUDE_PLUGIN_ROOT} (normalizing backslashes), and genericize a LAN
// endpoint. Your own global ~/.claude copies are untouched and keep working as-is.
function sanitize(text) {
  text = text.replace(/C:[\\/]Users[\\/][^\\/\s"'`)]+[\\/]\.claude[\\/]([^\s"'`)]*)/gi,
    (_, rest) => "${CLAUDE_PLUGIN_ROOT}/" + rest.replace(/\\/g, "/"));
  text = text.replace(/192\.168\.1\.217/g, "localhost");
  return text;
}
function walkMd(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkMd(p);
    else if (e.name.endsWith(".md")) {
      const before = readFileSync(p, "utf8");
      const after = sanitize(before);
      if (after !== before) writeFileSync(p, after);
    }
  }
}
walkMd(join(OUT, "skills"));
walkMd(join(OUT, "commands"));

const DESC = "Docs + release toolkit for Claude Code: versioned user guides, benefit-first changelogs, screenshots, logos, a brand kit, an embeddable help bot, demo/onboarding/pitch/press kits — all driven by one docs/brand.json + docs/VERSION.";

writeFileSync(join(OUT, ".claude-plugin", "plugin.json"),
  JSON.stringify({
    name: "ship-pack", version: VERSION, description: DESC,
    author: { name: "Machine King Labs" },
    keywords: ["docs", "changelog", "release", "brand", "screenshots", "onboarding", "pitch", "press", "logo", "helpbot"],
  }, null, 2) + "\n");

writeFileSync(join(OUT, ".claude-plugin", "marketplace.json"),
  JSON.stringify({
    name: "ship-pack-marketplace",
    owner: { name: "Machine King Labs" },
    plugins: [{ name: "ship-pack", source: "./", description: DESC }],
  }, null, 2) + "\n");

// ---------- LICENSE (MIT) ----------
writeFileSync(join(OUT, "LICENSE"),
  `MIT License\n\nCopyright (c) 2026 Machine King Labs\n\n` +
  `Permission is hereby granted, free of charge, to any person obtaining a copy\n` +
  `of this software and associated documentation files (the "Software"), to deal\n` +
  `in the Software without restriction, including without limitation the rights\n` +
  `to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n` +
  `copies of the Software, and to permit persons to whom the Software is\n` +
  `furnished to do so, subject to the following conditions:\n\n` +
  `The above copyright notice and this permission notice shall be included in all\n` +
  `copies or substantial portions of the Software.\n\n` +
  `THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n` +
  `IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n` +
  `FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n` +
  `AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n` +
  `LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n` +
  `OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\n` +
  `SOFTWARE.\n`);

// ---------- README (rich, generated) ----------
const cell = (s) => String(s).replace(/\|/g, "·");
const commandsMd = CATALOG.map((g) =>
  `### ${g.emoji} ${g.title}\n\n` +
  `| Command | What it does | Writes |\n|---|---|---|\n` +
  g.items.map((it) =>
    `| \`/${it.cmd}\`${it.args ? " `" + it.args + "`" : ""} | ${cell(it.what)} | \`${cell(it.writes)}\` |`
  ).join("\n")
).join("\n\n");

const readme = [
  `<p align="center"><img src="assets/ship-pack-hero.svg" alt="ship-pack — turn what you ship into the docs, changelog, and launch kit around it" width="100%"></p>`,
  ``,
  `<p align="center">`,
  `  <img src="https://img.shields.io/badge/Claude_Code-plugin-48b6ff" alt="Claude Code plugin">`,
  `  <img src="https://img.shields.io/badge/commands-${cmn}-ffc24b" alt="${cmn} commands">`,
  `  <img src="https://img.shields.io/badge/skills-${skn}-3a86ff" alt="${skn} skills">`,
  `  <img src="https://img.shields.io/badge/license-MIT-46d39a" alt="MIT license">`,
  `</p>`,
  ``,
  `<h1 align="center">ship-pack</h1>`,
  `<p align="center">${DESC}</p>`,
  ``,
  `## ⚡ Install`,
  ``,
  "```",
  `/plugin marketplace add ${REPO}`,
  `/plugin install ship-pack@ship-pack-marketplace`,
  "```",
  ``,
  `That's it — all **${cmn} commands** and **${skn} skills** load in every project. Prefer not to use a marketplace? See [drop-in install](#-drop-in-install-no-marketplace).`,
  ``,
  `## 🧭 How it works`,
  ``,
  "Your markdown is the **source**. One `docs/brand.json` (your colors + fonts) and one `docs/VERSION` (a semver) drive everything — so your guide, changelog, and screenshots never drift apart. `/ship-release` runs the whole pipeline in a single command.",
  ``,
  `<img src="assets/ship-pack-flow.svg" alt="One brand.json + one version drives a user guide, changelog, screenshots, logos, brand kit, help bot, and more" width="100%">`,
  ``,
  `## 🧩 Commands`,
  ``,
  commandsMd,
  ``,
  `## 🚢 Cut a release`,
  ``,
  "Run one command and the whole release stays in lockstep:",
  ``,
  "```",
  "/ship-release minor",
  "  ✓ version      0.8.0 → 0.9.0",
  "  ✓ changelog    new \"## v0.9.0\" entry + What's New page",
  "  ✓ user guide   re-stamped \"Current as of v0.9.0\" + re-rendered",
  "  ✓ screenshots  refreshed for anything that changed",
  "```",
  ``,
  "Omit the bump and it infers `patch` / `minor` / `major` from your commits and tells you why.",
  ``,
  `## 🎨 Themed from one brand.json`,
  ``,
  "Drop a `docs/brand.json` in any project and every output is on-brand — no CSS edits:",
  ``,
  "```json",
  '{ "name": "MyApp", "tagline": "…",',
  '  "colors": { "brand": "#0056D2", "accent": "#FFDD00" },',
  '  "fonts":  { "display": "Bricolage Grotesque", "body": "Hanken Grotesk" } }',
  "```",
  ``,
  "Different app → different `brand.json` → everything re-themes.",
  ``,
  `## 📦 Drop-in install (no marketplace)`,
  ``,
  "Copy `skills/*` into `~/.claude/skills/` and `commands/*` into `~/.claude/commands/`. Done.",
  ``,
  `## 🔄 Update`,
  ``,
  "Edit any skill, then re-pack and push:",
  ``,
  "```bash",
  `node tools/pack.mjs --out . --repo ${REPO} --version 1.1.0`,
  `git commit -am "v1.1.0" && git push`,
  "```",
  ``,
  `## 📄 License`,
  ``,
  `MIT © Machine King Labs`,
  ``,
].join("\n");
writeFileSync(join(OUT, "README.md"), readme);

// keep a copy of this packer in the bundle (skip if we are already running from there)
const self = fileURLToPath(import.meta.url);
const dest = join(OUT, "tools", "pack.mjs");
mkdirSync(join(OUT, "tools"), { recursive: true });
try { if (self !== dest) cpSync(self, dest); } catch {}

console.log(`ship-pack: wrote ${OUT}`);
console.log(`  skills:   ${skn}/${SKILLS.length}`);
console.log(`  commands: ${cmn}/${COMMANDS.length}`);
if (missing.length) console.log(`  MISSING:  ${missing.join(", ")}`);
console.log(`  files:    .claude-plugin/{plugin,marketplace}.json, LICENSE, README.md (rich), tools/pack.mjs`);
