#!/usr/bin/env node
// emit-feed.mjs — turn docs/changelog.json into a syndication feed (RSS 2.0 or Atom 1.0).
// Dependency-free, cross-platform. One <item>/<entry> per release; categories become
// <category> tags; the release body becomes HTML-in-CDATA so readers render it nicely.
//
// Usage:
//   node emit-feed.mjs [--in docs/changelog.json] [--out docs/changelog.xml]
//        [--format rss|atom] [--site-url https://example.com] [--feed-path /changelog.xml]
//
// --site-url is used to build absolute <link>/<id> values (feeds want absolute URLs).
// If absent, falls back to changelog.json's siteUrl, then to "" (relative — valid but
// less portable; the script warns).
//
// Exit codes: 0 ok, 1 missing/unreadable input.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };

const IN = opt("--in", "docs/changelog.json");
const OUT = opt("--out", "docs/changelog.xml");
const FORMAT = (opt("--format", "rss") || "rss").toLowerCase();
const FEED_PATH = opt("--feed-path", "/changelog.xml");

function die(msg) { console.error(`emit-feed: ${msg}`); process.exit(1); }
if (!existsSync(IN)) die(`changelog not found at ${IN}. Run parse-changelog.mjs first.`);

let doc;
try { doc = JSON.parse(readFileSync(IN, "utf8")); }
catch (e) { die(`could not parse ${IN}: ${e.message}`); }

const SITE = (opt("--site-url", doc.siteUrl || "") || "").replace(/\/+$/, "");
if (!SITE) console.error("emit-feed: WARNING no --site-url / siteUrl — emitting relative links. Pass --site-url for portable feeds.");

const product = doc.product || "Product";
const tagline = doc.tagline || `What's new in ${product}`;
const releases = Array.isArray(doc.releases) ? doc.releases : [];

const xmlEsc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const cdata = (s) => `<![CDATA[${String(s ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

// release → an absolute anchor on the What's New page (whats-new.html#v1.2.3)
const linkFor = (r) => `${SITE}/whats-new.html#${encodeURIComponent(r.id || ("v" + r.version))}`;
// release date → RFC-822 (RSS) / RFC-3339 (Atom)
function dateObj(r) { return r.date ? new Date(r.date + "T12:00:00Z") : new Date(); }
const rfc822 = (d) => d.toUTCString();
const rfc3339 = (d) => d.toISOString();

// release body as a small HTML block (grouped by category) for the feed reader
const CAT_LABEL = { new: "New", improved: "Improved", fixed: "Fixed", security: "Security", other: "Also" };
function bodyHtml(r) {
  const out = [];
  if (r.summary) out.push(`<p><em>${xmlEsc(r.summary)}</em></p>`);
  for (const cat of (doc.categories || ["new", "improved", "fixed", "security"])) {
    const items = r.items.filter((i) => i.category === cat);
    if (!items.length) continue;
    out.push(`<h3>${CAT_LABEL[cat] || cat}</h3>`, "<ul>");
    for (const i of items) {
      const lead = i.title ? `<strong>${xmlEsc(i.title)}</strong>` : "";
      const body = i.body ? ` ${xmlEsc(i.body)}` : (i.text && !i.title ? xmlEsc(i.text) : "");
      out.push(`<li>${lead}${i.title && i.body ? " — " : ""}${i.title ? body : body}</li>`);
    }
    out.push("</ul>");
  }
  return out.join("\n");
}

let xml;
if (FORMAT === "atom") {
  const updated = releases.length ? rfc3339(dateObj(releases[0])) : rfc3339(new Date());
  const entries = releases.map((r) => `  <entry>
    <title>${xmlEsc(`${product} ${r.version}${r.title ? " — " + r.title : ""}`)}</title>
    <id>${xmlEsc(linkFor(r))}</id>
    <link href="${xmlEsc(linkFor(r))}"/>
    <updated>${rfc3339(dateObj(r))}</updated>
    ${r.items.map((i) => `<category term="${xmlEsc(i.category)}"/>`).filter((v, idx, a) => a.indexOf(v) === idx).join("\n    ")}
    <content type="html">${cdata(bodyHtml(r))}</content>
  </entry>`).join("\n");
  xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xmlEsc(`${product} — What's New`)}</title>
  <subtitle>${xmlEsc(tagline)}</subtitle>
  <id>${xmlEsc(SITE + FEED_PATH)}</id>
  <link href="${xmlEsc(SITE + "/whats-new.html")}"/>
  <link rel="self" href="${xmlEsc(SITE + FEED_PATH)}"/>
  <updated>${updated}</updated>
  <generator>ship-feed</generator>
${entries}
</feed>
`;
} else {
  const items = releases.map((r) => {
    const cats = [...new Set(r.items.map((i) => i.category))]
      .map((c) => `      <category>${xmlEsc(c)}</category>`).join("\n");
    return `    <item>
      <title>${xmlEsc(`${product} ${r.version}${r.title ? " — " + r.title : ""}`)}</title>
      <link>${xmlEsc(linkFor(r))}</link>
      <guid isPermaLink="false">${xmlEsc(r.id || ("v" + r.version))}</guid>
      <pubDate>${rfc822(dateObj(r))}</pubDate>
${cats}
      <description>${cdata(bodyHtml(r))}</description>
    </item>`;
  }).join("\n");
  const buildDate = releases.length ? rfc822(dateObj(releases[0])) : rfc822(new Date());
  xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEsc(`${product} — What's New`)}</title>
    <link>${xmlEsc(SITE + "/whats-new.html")}</link>
    <description>${xmlEsc(tagline)}</description>
    <language>en</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <generator>ship-feed</generator>
    <atom:link href="${xmlEsc(SITE + FEED_PATH)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, xml, "utf8");
console.error(`emit-feed: wrote ${OUT} (${FORMAT.toUpperCase()}, ${releases.length} release(s))`);
