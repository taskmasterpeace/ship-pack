---
description: Generate a launch kit from this project's latest release — a quotable press release (markdown + on-brand HTML), Product Hunt assets (tagline, description, maker's first comment), and a launch-day checklist. Reads the shipping log + brand.json; public-safe with zero fabricated quotes or metrics.
argument-hint: "[maker/spokesperson name, channel (e.g. 'Product Hunt'), or a feature to headline — optional]"
---

Use the `ship-press` skill for THIS project to produce a launch kit from the latest release. Skills
live in `${CLAUDE_PLUGIN_ROOT}/skills`; outputs go in this project's `docs/press/`.

1. **Discover first** — run the bundled discovery script and read its JSON:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/ship-press/scripts/collect-launch.mjs" --json
   ```
   It extracts the latest release (version, date, themed line, bullets) from `docs/SHIPPING-LOG.md`,
   the **brand voice/tone** (`report.voice`), reads `docs/brand.json` and `docs/VERSION`, lists
   existing logos/screenshots, and flags any prior kit. Honor every `warnings[]` entry. If `report.voice`
   is present, write all copy IN THAT VOICE. If there is no shipping log, that's a blocker — offer to
   run the `shipping-log` skill first instead of inventing a release.

2. **Frame the launch** — use "$ARGUMENTS" for the maker/spokesperson name, the launch channel, or a
   feature to headline. For anything the source can't supply (contact, URL, price, real quote), use
   honest `[ADD …]` placeholders — never fabricate.

3. **Write the press release** to `docs/press/release.md` following
   `references/press-release-template.md`. Map "What's new" 1:1 to the release's shipping-log bullets.
   No fabricated quotes, no fabricated metrics, honest ship status, one screen.

4. **Write the Product Hunt assets + launch-day checklist** to `docs/press/launch-kit.md` following
   `references/product-hunt-assets.md`: a tagline (3 options, each ≤60 chars), a ~260-char
   description, a 120–180-word first-person maker's comment (in the brand voice), gallery notes (flag
   missing assets and which pack skill makes them), and a Before/Launch/During/After checklist adapted
   to real channels. (`launch-kit.md` is intentionally markdown-only, paste-ready — no HTML render.)
   Then **verify the char counts programmatically** — the 60-char tagline limit is hard:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/ship-press/scripts/check-counts.mjs" --in docs/press/launch-kit.md
   ```
   Tighten any tagline it marks `OVER` and re-run until it passes.

5. **Render the HTML** (self-contained, themed from brand.json, never purple, no backdrop-filter/turbulence):
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/ship-press/scripts/render-press.mjs" --in docs/press/release.md --out docs/press/release.html --brand docs/brand.json --version docs/VERSION
   ```
   The renderer scans the HTML for unfilled `[ADD …]`/`[CONFIRM …]` placeholders and prints
   `HTML still contains N placeholder(s)`; it **exits non-zero and refuses to certify** if any remain
   (pass `--allow-placeholders` only for a deliberately-labelled draft). Capture that `N` for the report.

6. **Report** the files written, the release described, the **full list of `[ADD …]`/`[CONFIRM …]`
   placeholders** to fill (quote the renderer's `N placeholder(s)` line), the `check-counts` result,
   any missing gallery assets, and the ship-status note — then offer the next `/ship-*` step.

Stay specific to this product and grounded only in the shipping log + brand.json. This is part of the
`/ship-*` pack (alongside `/ship-changelog`, `/ship-release`, `/ship-guide`, `/ship-screenshots`,
`/ship-logos`).
