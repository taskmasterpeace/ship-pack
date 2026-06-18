---
name: ship-feed
description: >-
  Turns a project's shipping log into machine-readable data plus an embeddable changelog
  widget. Parses docs/SHIPPING-LOG.md + docs/VERSION into a structured docs/changelog.json
  (releases with version, date, and items grouped by category), then emits an RSS/Atom feed
  (docs/changelog.xml) and a self-contained, brand-themed <ship-changelog> web component +
  static HTML embed that read that JSON. For a company-page "What's new" section, an in-app
  "What's new" badge, and a subscribe-able feed. Use when the user wants a changelog API or
  JSON, an RSS/Atom changelog feed, a "what's new" widget or web component, an embeddable
  changelog, a release feed, or to make their shipping log machine-readable / syndicatable.
  Triggers on "changelog as data", "changelog.json", "RSS feed for releases", "what's new
  widget", "embed the changelog", "release feed", "ship-feed". Part of the /ship-* pack.
---

# Ship Feed

## Purpose

A shipping log is great prose, but prose can't be embedded, subscribed to, or read by code.
This skill makes the same release history **machine-readable and embeddable**:

- `docs/changelog.json` — structured releases (version, date, title, summary, items by category)
- `docs/changelog.xml` — an RSS 2.0 (or Atom 1.0) feed of releases, for feed readers + bots
- `docs/ship-changelog.js` — a self-contained `<ship-changelog>` web component (full or badge)
- `docs/whats-new.embed.html` — a static, data-inlined page for an `<iframe>` or a no-JS host

All four are static, brand-themed from `docs/brand.json`, and derive from one source of truth —
your existing shipping log. Write the prose once (with `shipping-log`); syndicate it everywhere.

## Part of the /ship-* pack

`ship-feed` is the **distribution** layer of the docs + release pack. It consumes what the other
skills produce; it never invents content.

```
docs/VERSION  ── single semver anchor ──┐
docs/brand.json ── brand as data ───────┤
docs/SHIPPING-LOG.md  (← shipping-log)   │
        │  parse                         │
        ▼                                ▼
  docs/changelog.json ──► docs/changelog.xml   (RSS/Atom feed)
        │                ──► docs/ship-changelog.js  (<ship-changelog> component)
        │                ──► docs/whats-new.embed.html (iframe / no-JS embed)
```

- **[`shipping-log`](../shipping-log/SKILL.md)** writes/owns `docs/SHIPPING-LOG.md` and the prose
  `docs/whats-new.html`. **Run it first** — this skill parses its output. If the log is missing,
  stop and offer to run it.
- **[`user-guide-builder`](../user-guide-builder/SKILL.md)** + **[`screenshot-capture`](../screenshot-capture/SKILL.md)**
  share the same `docs/VERSION` anchor so "what changed" and "how it works" stay in lockstep.
- **[`logo-pack`](../logo-pack/SKILL.md)** and the renderers all read the same `docs/brand.json`.

The widget links and the feed point back to `whats-new.html#v<version>`, so the data layer and
the prose page reinforce each other.

## Discovery first (don't act blind)

Before generating anything, inspect what already exists and report it:

1. **Inputs present?**
   - `node <skill>/scripts/version.mjs get` → current semver (or "no anchor").
   - Read `docs/brand.json` (colors + fonts). If absent, the renderers fall back to a neutral
     slate+blue theme (never purple) — note that in your report and offer to create `brand.json`.
   - `ls docs/SHIPPING-LOG.md` — **required**. If missing, stop and offer to run `shipping-log`.
2. **Prior outputs?** `ls docs/changelog.json docs/changelog.xml docs/ship-changelog.js
   docs/whats-new.embed.html` — note what you'll be regenerating so the user knows what changes.
3. **Deploy target?** Ask (or infer) the public site URL for absolute feed links and whether they
   want **RSS or Atom**, and whether they need the **component**, the **iframe embed**, or both.

`version.mjs` is shared with the pack — call it, don't reinvent version handling.

## Workflow

Run scripts from the **repo root**; reference them by absolute skill path. They are
dependency-free `.mjs` (Node ≥ 16, cross-platform) — run them, never inline their logic.

1. **Parse the log into data.**
   ```bash
   node <skill>/scripts/parse-changelog.mjs --pretty --site-url https://<your-site>
   ```
   Reads `docs/SHIPPING-LOG.md` (+ `docs/VERSION`, `docs/brand.json`), writes
   `docs/changelog.json`. It prints `N release(s), M item(s)`. **Read the printed counts** — if
   it warns "parsed 0 releases", the log isn't in the pack's `## v1.2.3 — YYYY-MM-DD` shape; fix
   the headings (or regenerate via `shipping-log`) rather than hand-editing JSON.

2. **Emit the feed.**
   ```bash
   node <skill>/scripts/emit-feed.mjs --format rss --site-url https://<your-site>
   # Atom instead:  --format atom --out docs/changelog.atom.xml
   ```
   One `<item>`/`<entry>` per release; categories become `<category>` tags; the release body is
   HTML-in-CDATA so readers render it. Pass `--site-url` for portable absolute links.

3. **Render the widget(s).**
   ```bash
   node <skill>/scripts/render-widget.mjs --mode both
   ```
   Writes `docs/ship-changelog.js` (the `<ship-changelog>` component) and
   `docs/whats-new.embed.html` (static embed). Both are themed from `docs/brand.json`. Use
   `--mode component` or `--mode page` to emit just one. `--src <url>` sets the JSON URL the
   component fetches at runtime (default `./changelog.json`).

4. **Verify before declaring done.**
   - `node --check docs/ship-changelog.js` (valid JS).
   - Confirm `<item>` open/close counts match in the XML and that `--site-url` produced absolute
     links.
   - Grep the outputs for `backdrop-filter` / `feTurbulence` — there must be **none** in real
     CSS (they hang renderers).
   - Spot-check `changelog.json` `stats` against the log (release + item counts).

5. **Wire it up.** Read `references/embedding.md` and give the user the exact snippets for their
   case: company-page component, in-app badge (`badge limit="1"` + the unread-dot pattern), the
   `<iframe>` embed, and the `<link rel="alternate">` feed auto-discovery tag.

6. **Report honestly.** State what was generated, the release/item counts, whether `brand.json`
   themed it or defaults were used, whether links are absolute (site URL known) or relative, and
   which categories appeared. If you regenerated existing files, say so.

## Worked example (real input → real output)

**Input** — `docs/SHIPPING-LOG.md` (MyFieldTime), heading + first bullet:

```markdown
## v0.8.0 — 2026-06-17 · Money & decisions

_The homeowner finally sees the money — and signs off without the email chase._

### ✨ New
- **Money & Progress portal for homeowners.** Clients open one page to see how much of the
  budget is spent, what's left, and how far along the job is — no spreadsheet, no phone call.
```

Run: `parse-changelog.mjs --pretty --site-url https://myfieldtime.com`

**Output** — `docs/changelog.json` (excerpt): `3 release(s), 18 item(s)`, the bold lead split
from its body, the italic line captured as `summary`:

```json
{
  "$schema": "ship-feed/changelog@1",
  "product": "MyFieldTime", "tagline": "Run your jobs. Not your inbox.",
  "currentVersion": "0.8.0",
  "stats": { "releases": 3, "items": 18, "latestVersion": "0.8.0", "latestDate": "2026-06-17" },
  "releases": [{
    "version": "0.8.0", "date": "2026-06-17", "title": "Money & decisions", "id": "v0.8.0",
    "summary": "The homeowner finally sees the money — and signs off without the email chase.",
    "items": [{
      "category": "new",
      "title": "Money & Progress portal for homeowners",
      "body": "Clients open one page to see how much of the budget is spent, what's left, and how far along the job is — no spreadsheet, no phone call."
    }]
  }]
}
```

Then `emit-feed.mjs` turns the same release into:

```xml
<item>
  <title>MyFieldTime 0.8.0 — Money &amp; decisions</title>
  <link>https://myfieldtime.com/whats-new.html#v0.8.0</link>
  <guid isPermaLink="false">v0.8.0</guid>
  <pubDate>Wed, 17 Jun 2026 12:00:00 GMT</pubDate>
  <category>new</category> …
</item>
```

…and `render-widget.mjs` themes the `<ship-changelog>` component with MyFieldTime's tokens
(`--sc-brand: #2f7dff; --sc-accent: #FFDD00;`) — on-brand, **never purple**.

## Quality bar

Hold the output to this standard before you call it done:

- **Faithful, not generative.** Every datum traces to a line in `SHIPPING-LOG.md`. The scripts
  parse; they never write copy. If the data looks thin, the *log* is thin — fix it upstream with
  `shipping-log`, don't pad the JSON.
- **The JSON is a real contract.** Matches `references/data-contract.md`, carries `$schema`,
  newest-first releases, canonical category ids. A downstream app can depend on its shape.
- **Valid, well-formed feeds.** XML escapes correctly, dates are RFC-822 (RSS) / RFC-3339 (Atom),
  links are absolute when a site URL is known. It validates in a feed reader.
- **Self-contained, themeable, on-brand.** The widget inlines all its CSS/JS (Shadow DOM), pulls
  colors + fonts from `brand.json`, exposes `--sc-*` tokens for host overrides, and defaults to a
  neutral slate+blue — **never purple**. **No `backdrop-filter`, no SVG `feTurbulence`.**
- **Honest about freshness + status.** The feed reflects the log at parse time; re-run after each
  release (or wire into `/ship-release`). Don't imply a live API where there's a static file.
- **Cross-project.** Nothing is hardcoded to one app — product name, tagline, colors, version,
  and site URL all come from that project's `docs/`. Deploy targets are referenced via adapters
  (any static host / CDN / CI), never assumed.

## Reusable contents

- `scripts/parse-changelog.mjs` — `SHIPPING-LOG.md` (+ VERSION + brand) → `changelog.json`.
- `scripts/emit-feed.mjs` — `changelog.json` → `changelog.xml` (RSS 2.0 or Atom 1.0).
- `scripts/render-widget.mjs` — `changelog.json` → `ship-changelog.js` + `whats-new.embed.html`.
- `scripts/version.mjs` — the shared pack semver anchor manager (get/init/set/bump/date).
- `references/data-contract.md` — the `changelog.json` schema + downstream-stability rules.
- `references/embedding.md` — copy-paste snippets: company page, in-app badge, iframe, RSS link,
  host theming, and the renderer-safety rules.
