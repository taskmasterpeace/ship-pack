#!/usr/bin/env node
// retrieve.mjs — dependency-free lexical retrieval over guide-index.json.
//
// Scores guide sections against a question using BM25-lite (TF-IDF with length
// normalization) plus a title/breadcrumb boost, and prints the top-k. This is the
// SAME ranking the reference /api/ask-docs route uses — it is exported as a function
// (rank()) so the route can import it, and runnable on the CLI so you can sanity-check
// retrieval quality WITHOUT an LLM or any API key.
//
// Usage (CLI):
//   node retrieve.mjs --index docs/guide-index.json --q "how do I add a change order" [--k 4] [--json]
//
// Usage (import):
//   import { rank } from "./retrieve.mjs";
//   const hits = rank(question, index.sections, 4);  // [{ id,title,anchor,score,text }]
//
// No external dependencies. Good enough to ship; swap in embeddings later if you want.

import { readFileSync, existsSync } from "node:fs";

const STOP = new Set(("a an and are as at be by for from has have how i in into is it its of on or "
  + "that the to was what when where which who why will with you your do does can could should "
  + "this these those there here about my me we our").split(" "));

const tokenize = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));

// crude singular/plural + verb folding so "orders"~"order", "adding"~"add"
const stem = (w) =>
  w.replace(/ies$/, "y").replace(/(sses|ches|shes|xes)$/, (m) => m.slice(0, -2))
    .replace(/([^s])s$/, "$1").replace(/ing$/, "").replace(/ed$/, "");
const norm = (s) => tokenize(s).map(stem);

/**
 * Rank sections against a query. BM25-ish: idf * tf saturation, length-normalized,
 * with a boost when query terms appear in the title or breadcrumb.
 * @returns array of { id, title, anchor, breadcrumb, score, text } sorted desc.
 */
export function rank(query, sections, k = 4) {
  const q = norm(query);
  if (!q.length || !sections.length) return [];
  const N = sections.length;
  const docs = sections.map((s) => {
    const body = norm(s.text || "");
    const title = norm([s.title, ...(s.breadcrumb || [])].join(" "));
    const tf = new Map();
    for (const w of body) tf.set(w, (tf.get(w) || 0) + 1);
    return { s, tf, len: body.length || 1, titleSet: new Set(title) };
  });
  const avgLen = docs.reduce((n, d) => n + d.len, 0) / N;
  const df = new Map();
  for (const term of new Set(q)) {
    let c = 0;
    for (const d of docs) if (d.tf.has(term)) c++;
    df.set(term, c);
  }
  const k1 = 1.5, b = 0.75;
  const scored = docs.map((d) => {
    let score = 0;
    for (const term of q) {
      const f = d.tf.get(term) || 0;
      if (f > 0) {
        const idf = Math.log(1 + (N - (df.get(term) || 0) + 0.5) / ((df.get(term) || 0) + 0.5));
        score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / avgLen));
      }
      if (d.titleSet.has(term)) score += 2.4; // strong signal: the section is ABOUT this
    }
    return { s: d.s, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ s, score }) => ({
      id: s.id, title: s.title, anchor: s.anchor,
      breadcrumb: s.breadcrumb || [], score: +score.toFixed(3), text: s.text,
    }));
}

// ---------- CLI ----------
const isMain = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
  const INDEX = opt("--index", "docs/guide-index.json");
  const Q = opt("--q");
  const K = parseInt(opt("--k", "4"), 10);
  const JSON_OUT = args.includes("--json");
  if (!Q) { console.error('usage: retrieve.mjs --index <guide-index.json> --q "question" [--k 4] [--json]'); process.exit(1); }
  if (!existsSync(INDEX)) { console.error(`retrieve: index not found: ${INDEX} (run build-index.mjs first)`); process.exit(1); }
  const idx = JSON.parse(readFileSync(INDEX, "utf8"));
  const hits = rank(Q, idx.sections || [], K);
  if (JSON_OUT) { console.log(JSON.stringify({ question: Q, hits }, null, 2)); }
  else if (!hits.length) { console.log("(no matching sections — the guide may not cover this)"); }
  else {
    for (const h of hits) {
      const crumb = h.breadcrumb.length ? h.breadcrumb.join(" › ") + " › " : "";
      console.log(`\n[${h.score}]  ${crumb}${h.title}   (#${h.anchor})`);
      console.log("    " + h.text.slice(0, 200).replace(/\s+/g, " ") + (h.text.length > 200 ? "…" : ""));
    }
  }
}
