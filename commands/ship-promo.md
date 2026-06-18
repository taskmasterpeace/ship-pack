---
description: Turn what this project just shipped into a short promo-video PLAN — a brand-voiced voiceover script, a timed shotlist, and a storyboard outline in docs/promo/, plus generator-ready prompts for whatever video/image tool you have. Scope it to a release, a single feature, a 15s teaser, or a 60s launch sizzle.
argument-hint: "[teaser | 45s what's-new (default) | 60s sizzle · \"feature: Finance\" · \"since v0.7.0\" · \"for v0.8.0\"]"
---

Use the `ship-promo` skill to plan a promo video for THIS project. Skills live in
`${CLAUDE_PLUGIN_ROOT}/skills`; outputs go in this project's `docs/promo/`.

1. **Discover first** — run
   `node "${CLAUDE_PLUGIN_ROOT}/skills/ship-promo/scripts/discover-promo.mjs" --pretty`
   to inventory `docs/brand.json` (colors + fonts), `docs/VERSION`, the changelog, the user
   guide, screenshots, logos, and any prior `docs/promo/*` outputs. Read the `gaps` list.

2. **Pick the angle from "$ARGUMENTS"** — translate to a preset and source:
   - **Length** — "teaser"/"15s" → 12–15s · default → 45s what's-new · "sizzle"/"60s" → 60s launch.
   - **Feature spotlight** — "feature: Finance" → spotlight that module from the guide/changelog.
   - **Range** — "since v0.7.0" / "for v0.8.0" → scope claims to that version's changelog entries.
   - **Default** (no args) — a 45s "what's new" promo for the current `docs/VERSION`.
   Choose ONE spine message and 3–5 proof beats. If the changelog is thin/absent, say so and
   offer `/ship-changelog` first — do not invent features.

3. **Write the plan** following `references/promo-format.md` (arc, timing math, voice rules,
   worked example). Produce in `docs/promo/`: `voiceover.md`, `shotlist.md`, `storyboard.md`.
   Keep the VO benefit-first, second person, concrete; honor the brand voice and the banned-
   filler list. Every claim must trace to a shipped item.

4. **Check the timing** —
   `node "${CLAUDE_PLUGIN_ROOT}/skills/ship-promo/scripts/estimate-timing.mjs" docs/promo/voiceover.md --target 45`
   (set `--target` to your preset). Trim until it fits with ~10% headroom.

5. **Attach generator prompts** per `references/generator-adapters.md` — write a tool-agnostic,
   brand-colored prompt per shot, then map to whatever generator is actually present (Ad Lab
   `generate-*`, Directors Palette, local Ideogram/Wan/Seedance). Mark undetected tools "not
   detected" — never fabricate a command for a tool that isn't there. Prefer real screenshots
   over generated frames for any feature claim.

6. **(Optional) Render the board** — build a self-contained `docs/promo/storyboard.html` from
   `references/storyboard-template.md`, themed from `brand.json` (no purple, no backdrop-filter,
   no feTurbulence). Embed real screenshots where they exist; use prompt text as placeholders
   elsewhere.

7. **Report** — the angle, length, spine message, files written, which generator adapters were
   detected, and the honest gaps (e.g. "no Finance screenshot — run `/ship-screenshots`"). If
   you cut a release or the changelog was stale, remind me to keep `docs/VERSION` and the guide
   in sync (`/ship-changelog`, `/ship-guide`).

Part of the /ship-* family: it consumes the changelog (`/ship-changelog`), the guide
(`/ship-guide`), screenshots (`/ship-screenshots`), and the logo (`/ship-logos`).
