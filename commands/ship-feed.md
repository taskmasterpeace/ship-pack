---
description: Turn this project's shipping log into machine-readable data + an embeddable widget — parse docs/SHIPPING-LOG.md into docs/changelog.json, emit an RSS/Atom feed (docs/changelog.xml), and render a self-contained, brand-themed <ship-changelog> web component + static embed for a company-page "What's new" and an in-app badge.
argument-hint: "[rss|atom · component|page|both · --site-url https://… · badge]"
---

Use the `ship-feed` skill to make THIS project's changelog machine-readable and embeddable.
Skills live in `${CLAUDE_PLUGIN_ROOT}/skills`; outputs go in this project's `docs/`.

**Read "$ARGUMENTS"** and translate to flags (sensible defaults if empty):
- **Feed format** — "rss" (default) or "atom" → `emit-feed.mjs --format <fmt>`
- **Widget mode** — "component", "page", or "both" (default) → `render-widget.mjs --mode <mode>`
- **Site URL** — `--site-url https://…` makes feed links absolute (ask if unknown; relative is fine)
- **Badge** — "badge" means they want the compact in-app "What's new" variant; surface that snippet

Then follow the skill's workflow:

1. **Discover first.** `node ${CLAUDE_PLUGIN_ROOT}/skills/ship-feed/scripts/version.mjs get`;
   read `docs/brand.json`; confirm `docs/SHIPPING-LOG.md` exists. **If the log is missing, stop**
   and offer to run `/ship-changelog` (the `shipping-log` skill) — this command parses its output,
   it never invents content. Note any existing outputs you'll regenerate.

2. **Parse → data:**
   `node ${CLAUDE_PLUGIN_ROOT}/skills/ship-feed/scripts/parse-changelog.mjs --pretty [--site-url …]`
   → writes `docs/changelog.json`. Read the printed release/item counts; if it warns "0 releases",
   fix the log headings (`## v1.2.3 — YYYY-MM-DD`) rather than hand-editing JSON.

3. **Emit feed:**
   `node ${CLAUDE_PLUGIN_ROOT}/skills/ship-feed/scripts/emit-feed.mjs --format <rss|atom> [--site-url …]`
   → `docs/changelog.xml`.

4. **Render widget:**
   `node ${CLAUDE_PLUGIN_ROOT}/skills/ship-feed/scripts/render-widget.mjs --mode <both|component|page>`
   → `docs/ship-changelog.js` and/or `docs/whats-new.embed.html`, themed from `docs/brand.json`
   (neutral slate+blue if absent — never purple).

5. **Verify:** `node --check docs/ship-changelog.js`; confirm balanced XML `<item>`s and absolute
   links; grep outputs for `backdrop-filter`/`feTurbulence` (there must be none in real CSS).

6. **Report + wire up.** Give the exact embed snippets from `references/embedding.md` (company-page
   component, in-app `badge limit="1"` + unread-dot, `<iframe>`, and the `<link rel="alternate">`
   RSS tag). State counts, whether brand.json themed it, and whether links are absolute or relative.

(Part of the `/ship-*` pack. Run after `/ship-changelog` updates the log — e.g. inside
`/ship-release` — so the data, feed, and widget match the current `docs/VERSION`.)
