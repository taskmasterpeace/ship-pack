#!/usr/bin/env node
// estimate-timing.mjs — turn a voiceover script into per-beat word counts, read times,
// and cumulative timecodes, so promo timing is computed instead of guessed.
//
// Dependency-free, cross-platform. Reads a markdown voiceover script where each beat is a
// heading (## or ###) followed by the spoken lines for that beat. Lines that are obviously
// non-spoken (bullets starting with "-", "*", ">", code fences, [bracketed stage directions],
// (parenthetical-only lines), and tables) are excluded from the spoken word count.
//
// Usage:
//   node estimate-timing.mjs <voiceover.md> [--wps 2.6] [--target 45] [--json]
//
// --wps     words per second for the read (default 2.6 ≈ a calm promo VO; 3.0 is brisk)
// --target  target total length in seconds; warns if the estimate overshoots (default: none)
// --json    machine-readable output
//
// Exit codes: 0 ok (even if over target — overshoot is a warning, not a failure);
//             1 only on usage error (missing/unreadable file).

import { readFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const numOpt = (name, dflt) => {
  const i = args.indexOf(name);
  if (i === -1) return dflt;
  const v = Number(args[i + 1]);
  return Number.isFinite(v) ? v : dflt;
};
const WPS = numOpt("--wps", 2.6);
const TARGET = numOpt("--target", null);
const JSON_OUT = args.includes("--json");

if (!file) {
  console.error("usage: node estimate-timing.mjs <voiceover.md> [--wps 2.6] [--target 45] [--json]");
  process.exit(1);
}
if (!existsSync(file)) {
  console.error(`estimate-timing: file not found: ${file}`);
  process.exit(1);
}

const text = readFileSync(file, "utf8");
const lines = text.split(/\r?\n/);

// Count only spoken words: drop directions, bullets, tables, fences, blank lines.
function spokenWords(rawLines) {
  let inFence = false;
  let words = 0;
  for (let line of rawLines) {
    const t = line.trim();
    if (t.startsWith("```")) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (!t) continue;
    if (t.startsWith("#")) continue;                 // sub-headings inside a beat
    if (/^[-*>|]/.test(t)) continue;                 // bullets, quotes, tables
    if (/^\[.*\]$/.test(t)) continue;                // [STAGE DIRECTION]
    if (/^\(.*\)$/.test(t)) continue;                // (parenthetical only)
    // strip inline parentheticals/brackets, markdown emphasis, then count
    const clean = t
      .replace(/\([^)]*\)/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/[*_`~]/g, " ");
    const w = clean.split(/\s+/).filter((x) => /[A-Za-z0-9]/.test(x));
    words += w.length;
  }
  return words;
}

// Split into beats by ## / ### headings.
const beats = [];
let current = null;
for (const line of lines) {
  const m = line.match(/^(#{2,3})\s+(.*)$/);
  if (m) {
    if (current) beats.push(current);
    current = { title: m[2].trim(), lines: [] };
  } else if (current) {
    current.lines.push(line);
  }
}
if (current) beats.push(current);

// If there were no headings at all, treat the whole file as one beat.
if (beats.length === 0) beats.push({ title: "(whole script)", lines });

function fmt(sec) {
  const s = Math.round(sec * 10) / 10;
  const mm = Math.floor(s / 60);
  const rest = (s - mm * 60).toFixed(1).padStart(4, "0");
  return mm > 0 ? `${mm}:${rest}` : `0:${rest}`;
}

let cum = 0;
const rows = beats.map((b) => {
  const words = spokenWords(b.lines);
  const dur = words / WPS;
  const start = cum;
  cum += dur;
  return {
    beat: b.title,
    words,
    seconds: Math.round(dur * 10) / 10,
    start: Math.round(start * 10) / 10,
    end: Math.round(cum * 10) / 10,
    timecode: `${fmt(start)}–${fmt(cum)}`,
  };
});

const totalWords = rows.reduce((a, r) => a + r.words, 0);
const totalSeconds = Math.round(cum * 10) / 10;
const overTarget = TARGET != null && totalSeconds > TARGET;

const summary = {
  file,
  wps: WPS,
  target_seconds: TARGET,
  total_words: totalWords,
  total_seconds: totalSeconds,
  total_timecode: fmt(cum),
  over_target: overTarget,
  beats: rows,
};

if (JSON_OUT) {
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
} else {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`Promo timing — ${file}  (@ ${WPS} words/sec)`);
  console.log("-".repeat(64));
  console.log(`${pad("Beat", 30)}${pad("words", 7)}${pad("secs", 7)}timecode`);
  for (const r of rows) {
    console.log(`${pad(r.beat.slice(0, 28), 30)}${pad(r.words, 7)}${pad(r.seconds, 7)}${r.timecode}`);
  }
  console.log("-".repeat(64));
  console.log(`${pad("TOTAL", 30)}${pad(totalWords, 7)}${pad(totalSeconds, 7)}${fmt(cum)}`);
  if (TARGET != null) {
    if (overTarget) {
      const cutWords = Math.ceil((totalSeconds - TARGET) * WPS);
      console.log(`\n⚠ Over target by ${(totalSeconds - TARGET).toFixed(1)}s — trim ~${cutWords} words to hit ${TARGET}s.`);
    } else {
      console.log(`\n✓ Within target (${TARGET}s) with ${(TARGET - totalSeconds).toFixed(1)}s of headroom.`);
    }
  }
}
