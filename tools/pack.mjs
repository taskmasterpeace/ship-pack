#!/usr/bin/env node
// pack.mjs — bundle the "ship" pack (skills + slash commands) into a shareable Claude Code plugin.
//
// Copies the listed skills + commands out of your GLOBAL ~/.claude into a self-contained plugin
// folder with a .claude-plugin/plugin.json (+ marketplace.json + README), so anyone can install
// it with /plugin — or drop it into their own ~/.claude. Dependency-free.
//
// Usage:
//   node pack.mjs [--out <dir>] [--src-skills <dir>] [--src-commands <dir>] [--version x.y.z]

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

// The ship pack: 14 skills + 15 slash commands. (Excludes machine-local items like ship-pr.)
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

const DESC = "Docs + release toolkit: versioned user guides, benefit-first changelogs, screenshots, logos, a brand kit, an embeddable help bot, demo/onboarding/pitch/press kits — all driven by one docs/brand.json + docs/VERSION.";

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

writeFileSync(join(OUT, "README.md"),
  `# ship-pack\n\n${DESC}\n\n` +
  `## Install as a Claude Code plugin\n\n` +
  "```\n/plugin marketplace add " + REPO + "\n/plugin install ship-pack@ship-pack-marketplace\n```\n\n" +
  `## Or drop-in (no marketplace)\n\n` +
  "Copy `skills/*` into `~/.claude/skills/` and `commands/*` into `~/.claude/commands/`.\n\n" +
  `## Contents\n\n- **${skn} skills**, **${cmn} commands**.\n` +
  `- Commands: ${COMMANDS.map((c) => "`/" + c + "`").join(", ")}\n\n` +
  `Re-pack after editing the skills: \`node tools/pack.mjs --out .\`\n`);

// keep a copy of this packer in the bundle (skip if we are already running from there)
const self = fileURLToPath(import.meta.url);
const dest = join(OUT, "tools", "pack.mjs");
mkdirSync(join(OUT, "tools"), { recursive: true });
try { if (self !== dest) cpSync(self, dest); } catch {}

console.log(`ship-pack: wrote ${OUT}`);
console.log(`  skills:   ${skn}/${SKILLS.length}`);
console.log(`  commands: ${cmn}/${COMMANDS.length}`);
if (missing.length) console.log(`  MISSING:  ${missing.join(", ")}`);
console.log(`  manifest: .claude-plugin/plugin.json + marketplace.json + README.md`);
