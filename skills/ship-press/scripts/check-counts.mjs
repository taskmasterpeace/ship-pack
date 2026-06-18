#!/usr/bin/env node
// check-counts.mjs — programmatic count-check for the Product Hunt assets.
//
// The PH tagline has a HARD 60-character limit and the description a ~260-char target.
// "Count them" by eye is the one place an off-by-a-few breaks the submission, so this
// verifies the counts mechanically instead of trusting the model's mental tally.
//
// TWO modes:
//
//  1. Ad-hoc strings (quick check while drafting):
//       node check-counts.mjs --tagline "Run your jobs, not your inbox"
//       node check-counts.mjs --tagline "…" --description "…"
//
//  2. Scan a finished launch-kit.md (verify what you actually wrote):
//       node check-counts.mjs --in docs/press/launch-kit.md
//     It pulls tagline options from list lines under a "Tagline" heading — either bullets
//     (- * +) or a numbered list (1. 2. 3.) — and the first paragraph under a "Description"
//     heading, and checks each. A Tagline section with zero parseable options is a hard fail
//     (so a real, too-long tagline can't slip past the 60-char gate via an unrecognized format).
//
// Limits (overridable): --tagline-max 60 --desc-target 260 --desc-max 320
// Exit code is non-zero if any HARD limit (tagline 60, description max) is exceeded,
// so it can gate a launch. Char count uses Unicode code points (so emoji count as the
// platform tends to count them, not as UTF-16 surrogate pairs). Dependency-free.
//
// Part of the ship-press skill / the "ship" pack.

import { readFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const IN = opt("--in", null);
const TAGLINE = opt("--tagline", null);
const DESCRIPTION = opt("--description", null);
const TAG_MAX = parseInt(opt("--tagline-max", "60"), 10);
const DESC_TARGET = parseInt(opt("--desc-target", "260"), 10);
const DESC_MAX = parseInt(opt("--desc-max", "320"), 10);

// Count by Unicode code points, not UTF-16 .length (so "café" = 4, an emoji = 1–2 not 2–4).
const len = (s) => [...(s || "")].length;

let hardFail = false;
let checked = 0;

function checkTagline(text, label = "tagline") {
  checked++;
  const n = len(text);
  const ok = n <= TAG_MAX;
  if (!ok) hardFail = true;
  console.log(`  ${ok ? "OK " : "OVER"}  ${label}: ${n}/${TAG_MAX}  "${text}"${ok ? "" : `  ← ${n - TAG_MAX} over the hard limit`}`);
}

function checkDescription(text, label = "description") {
  checked++;
  const n = len(text);
  const overTarget = n > DESC_TARGET;
  const overHard = n > DESC_MAX;
  if (overHard) hardFail = true;
  const note = overHard ? `  ← ${n - DESC_MAX} over the max` : overTarget ? `  (over the ~${DESC_TARGET} target, under ${DESC_MAX} max)` : "";
  console.log(`  ${overHard ? "OVER" : "OK "}  ${label}: ${n} chars (target ~${DESC_TARGET}, max ${DESC_MAX})${note}`);
}

console.log(`PH count-check  (tagline ≤ ${TAG_MAX}, description ~${DESC_TARGET}/≤${DESC_MAX})`);

if (TAGLINE) checkTagline(TAGLINE);
if (DESCRIPTION) checkDescription(DESCRIPTION);

if (IN) {
  if (!existsSync(IN)) { console.error(`check-counts: input not found: ${IN}`); process.exit(1); }
  const md = readFileSync(IN, "utf8");
  const lines = md.split(/\r?\n/);

  // Find the "Tagline" section and collect candidate lines: markdown bullets (- * +) OR numbered
  // list items (1. 2. 3.), optionally with a trailing "(NN)" count the writer added. Strip
  // bold/italic/code, the list marker, and the trailing count before counting characters.
  const sectionBody = (headingRe) => {
    const start = lines.findIndex((l) => headingRe.test(l));
    if (start === -1) return [];
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^#{1,6}\s/.test(lines[i]) || /^---\s*$/.test(lines[i])) { end = i; break; }
    }
    return lines.slice(start + 1, end);
  };
  const clean = (s) => s
    .replace(/`([^`]*)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/, "").replace(/\s*\(\d+\)\s*$/, "").trim();

  // Candidate option lines: markdown bullets (- * +) OR numbered list items (1. 2. 3.).
  // The skill's own worked-example writes the taglines as a NUMBERED list, so both must match
  // or a too-long option silently slips through (a false PASS on the hard-60 gate).
  const optionRe = /^\s*(?:[-*+]|\d+\.)\s+\S/;
  const tagBody = sectionBody(/^#{1,6}\s+.*tagline/i);
  const hasTagSection = lines.some((l) => /^#{1,6}\s+.*tagline/i.test(l));
  const tagCandidates = tagBody
    .filter((l) => optionRe.test(l))
    .map(clean)
    .filter(Boolean);
  if (tagCandidates.length) {
    console.log(`\n  Taglines (from ${IN}):`);
    tagCandidates.forEach((t, i) => checkTagline(t, `option ${i + 1}`));
  } else if (hasTagSection) {
    // A Tagline section exists but we parsed zero options — almost always a format the parser
    // missed. Warn loudly and fail rather than silently passing, so a real tagline can't dodge
    // the 60-char gate. (If there genuinely are no options, remove the empty Tagline heading.)
    hardFail = true;
    console.log(`\n  WARN  a Tagline section exists in ${IN} but no option lines were parsed`);
    console.log(`        (expected "- option" or "1. option" bullets) — cannot verify the 60-char limit.`);
  } else {
    console.log(`\n  (no Tagline section found in ${IN})`);
  }

  const descBody = sectionBody(/^#{1,6}\s+.*description/i);
  const descPara = (() => {
    const buf = [];
    for (const l of descBody) {
      if (/^\s*$/.test(l)) { if (buf.length) break; else continue; }
      if (/^\s*[-*+]\s/.test(l)) continue; // skip note bullets
      buf.push(clean(l));
    }
    return buf.join(" ").trim();
  })();
  if (descPara) {
    console.log(`\n  Description (from ${IN}):`);
    checkDescription(descPara);
  }
}

if (!checked) {
  console.error("check-counts: nothing to check. Pass --tagline / --description, or --in <launch-kit.md>.");
  process.exit(2);
}

console.log(hardFail
  ? `\ncheck-counts: a HARD limit was exceeded — tighten before submitting (exit 1).`
  : `\ncheck-counts: all hard limits respected.`);
process.exit(hardFail ? 1 : 0);
