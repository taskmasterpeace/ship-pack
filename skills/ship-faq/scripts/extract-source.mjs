#!/usr/bin/env node
// extract-source.mjs — mine an existing user guide for FAQ raw material, so questions come from
// the real product, not from thin air. Part of the "ship" pack (ship-faq).
//
// It scans a guide markdown file (or any docs file) and pulls out the sections that most reliably
// seed support questions: Troubleshooting, FAQ, Glossary, Known Gaps/Limitations, and the
// step-numbered Workflows (each "How do I …" becomes a candidate question). Output is a JSON
// scaffold the skill turns into docs/FAQ.md — NOT the final FAQ. You still write real answers.
//
// Usage:
//   node extract-source.mjs --guide docs/user-guide/<Guide>.md [--json] [--out -]
//   node extract-source.mjs            # auto-discovers a guide under docs/
//
// Output (JSON): { guide, version, counts, troubleshooting[], faq[], glossary[], gaps[], workflows[] }
// Exit codes: 0 ok (even if guide missing — reports what it found), 1 only on bad args.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const JSON_OUT = args.includes("--json") || opt("--out", "") === "-";

// ---------- discover a guide if not given ----------
function findGuide() {
  const explicit = opt("--guide");
  if (explicit) return existsSync(explicit) ? explicit : null;
  const candidates = [];
  const roots = ["docs/user-guide", "docs", "."];
  for (const r of roots) {
    if (!existsSync(r)) continue;
    let entries = [];
    try { entries = readdirSync(r); } catch { continue; }
    for (const f of entries) {
      if (!/\.md$/i.test(f)) continue;
      if (/guide|manual|handbook|help/i.test(f) && !/faq/i.test(f)) {
        const p = join(r, f);
        try { candidates.push({ p, mtime: statSync(p).mtimeMs }); } catch {}
      }
    }
  }
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates.length ? candidates[0].p : null;
}

const GUIDE = findGuide();
const VFILE = opt("--version", "docs/VERSION");
const version = existsSync(VFILE) ? readFileSync(VFILE, "utf8").trim() : null;

if (!GUIDE) {
  const payload = { guide: null, version, counts: {}, troubleshooting: [], faq: [], glossary: [], gaps: [], workflows: [],
    note: "No user guide found under docs/. Run /ship-guide first, or pass --guide <path>. The FAQ can still be written from the app + changelog, but a guide is the richest source." };
  console.log(JSON.stringify(payload, null, JSON_OUT ? 0 : 2));
  process.exit(0);
}

const md = readFileSync(GUIDE, "utf8").replace(/\r/g, "");
const lines = md.split("\n");

// Split into (level, title, bodyLines) sections by ## / ### headings.
function sections() {
  const secs = [];
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) { cur = { level: h[1].length, title: h[2].replace(/[*`#]/g, "").trim(), body: [] }; secs.push(cur); }
    else if (cur) cur.body.push(line);
  }
  return secs;
}
const secs = sections();
const find = (re) => secs.filter((s) => re.test(s.title));

const bullets = (body) =>
  body.map((l) => l.match(/^\s*[-*+]\s+(.*)$/)).filter(Boolean).map((m) => m[1].trim());

// Troubleshooting: each bullet / bold "Problem:" line is a candidate Q.
const troubleshooting = find(/troublesho|common problem|fixing|errors?/i)
  .flatMap((s) => bullets(s.body)).slice(0, 40);

// Existing FAQ pairs (Q in bold or as a question line).
const faqSecs = find(/^faq$|frequently asked|questions/i);
const faq = faqSecs.flatMap((s) => {
  const out = [];
  for (const l of s.body) {
    const q = l.match(/^\s*(?:[-*]|\*\*Q[:.]?\*\*)?\s*(?:\*\*)?([^*?]+\?)/);
    if (q) out.push(q[1].trim());
  }
  return out;
}).slice(0, 40);

// Glossary: "**Term** — definition" or "Term: definition".
const glossary = find(/glossary|terminology|definitions/i).flatMap((s) =>
  s.body.map((l) => l.match(/^\s*[-*]?\s*\*\*([^*]+)\*\*\s*[—:-]\s*(.+)$/) || l.match(/^\s*[-*]\s*([A-Z][^:]{1,40}):\s+(.+)$/))
    .filter(Boolean).map((m) => ({ term: m[1].trim(), def: m[2].trim() }))
).slice(0, 60);

// Known gaps / limitations → "Why can't I …" / "Is X supported?" candidates.
const gaps = find(/known gap|limitation|not yet|roadmap|planned/i).flatMap((s) => bullets(s.body)).slice(0, 30);

// Workflows: heading titles that read like tasks → "How do I <task>?"
// Match the verb stem so gerunds ("Approving", "Inviting") and plain forms both hit.
const TASK_VERB = /\b(creat|add|edit|delet|remov|invit|approv|reject|submit|send|sending|upload|download|export|import|set ?up|configur|schedul|assign|generat|captur|manag|track|pay|paying|sign|review|publish|share|sharing|connect|enabl|disabl|rename|duplicat|archiv|restor)/i;
const workflows = secs
  .filter((s) => s.level >= 3 && TASK_VERB.test(s.title))
  .map((s) => ({ title: s.title, steps: s.body.filter((l) => /^\s*\d+\.\s+/.test(l)).length }))
  .slice(0, 60);

const counts = {
  sections: secs.length, troubleshooting: troubleshooting.length, faq: faq.length,
  glossary: glossary.length, gaps: gaps.length, workflows: workflows.length,
};

const payload = { guide: GUIDE, version, counts, troubleshooting, faq, glossary, gaps, workflows };
console.log(JSON.stringify(payload, null, JSON_OUT ? 0 : 2));
