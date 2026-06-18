---
description: Generate an investor one-pager + slide-by-slide deck outline from THIS project's own evidence — brand.json, the shipping-log/git momentum stats, and the user guide. Writes docs/pitch/one-pager.md (+ a brand-themed HTML render) and docs/pitch/deck-outline.md covering problem, solution, what's shipped (momentum), who it's for, and clearly-labeled traction placeholders. Never fabricates a metric.
argument-hint: "[optional: focus, e.g. \"seed deck\", \"emphasize momentum\", \"audience = construction VCs\", \"update existing\"]"
---

Use the `ship-pitch` skill to build an investor pitch for THIS project. Skills live in
`${CLAUDE_PLUGIN_ROOT}/skills`; outputs go in this project's `docs/pitch/`.

1. **Discover first (read what exists — never guess metrics):**
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/ship-pitch/scripts/collect-pitch-inputs.mjs" --days 30
   ```
   Read the JSON: brand (name/tagline/colors), `docs/VERSION`, momentum from the shipping
   log + git (releases, active build days, span, last shipped), the user guide's section
   headings (the shipped-feature map), and any prior pitch outputs. Honor `gaps[]`.

2. **Handle missing inputs honestly, don't paper over them.** No `brand.json` → hand-write a
   minimal on-brand one (never purple) or suggest `/ship-logos`. No shipping log / not git →
   momentum stats are the only metrics you may show; if absent, say so and suggest
   `/ship-changelog`. No guide → suggest `/ship-guide` or fall back to README/routes and mark
   inferred. Prior pitch → update in place, preserve human-entered traction/ask.

3. **Follow the spec.** Read `${CLAUDE_PLUGIN_ROOT}/skills/ship-pitch/references/one-pager-and-deck.md`
   (section order, voice, the honesty contract, traction-placeholder block, deck template) and
   `...\references\worked-example.md` (a full input→output trace). Apply "$ARGUMENTS" as the
   focus/audience/scope if provided.

4. **Write the deliverables:**
   - `docs/pitch/one-pager.md` — problem → solution → what's shipped (momentum strip) → who
     it's for → why now/why us → traction → the ask. Domain-specific, not generic. Every
     traction/financial/unsourced line is a canonical bracket token — `[TRACTION:]`,
     `[METRIC:]`, `[TBD:]`, `[ASK:]`, `[SOURCE:]`, `[CONTACT:]`, `[TEAM:]`, `[MODEL:]`, or
     `[PLACEHOLDER]` (full table + writer↔renderer contract in the reference). The HTML
     render styles every one of these as a visible placeholder; use only this set.
   - `docs/pitch/deck-outline.md` — one block per slide (headline + 3–5 points + speaker note
     + visual), covering title, problem, solution, what's shipped, momentum, who it's for,
     why now/why us, traction (placeholders), business model, the ask. Suggest
     `[SCREENSHOT: id]` visuals that `/ship-screenshots` can fill.

5. **Render the themed HTML one-pager** (self-contained, brand-themed in both colors AND
   fonts — the Google Fonts `<link>` is built from `brand.fonts`, so custom typography is
   actually fetched; print-friendly; never purple; no backdrop-filter / feTurbulence):
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/ship-pitch/scripts/render-one-pager.mjs" --in docs/pitch/one-pager.md --out docs/pitch/one-pager.html --brand docs/brand.json --version docs/VERSION
   ```

6. **Report** the files created, the exact momentum stats used, and — explicitly — every
   `[...]` placeholder the founder still has to fill (search the output for `[`), plus which
   sibling `/ship-*` command produces any missing input.

**Hard rule:** never invent a customer count, revenue, retention, growth %, or any metric you
did not read in a real source. Momentum stats from the repo are fine and must be labeled as
momentum, not traction. Part of the `/ship-*` family.
