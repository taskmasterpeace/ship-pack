---
description: Produce a production-ready logo pack — checks for an existing brand/logo, then either refines it or designs new directions, and writes a tailored, professional prompt set (minimalist one-color, monochrome, comfortable, and premium, plus icon/wordmark/monogram). Optionally generates the images.
argument-hint: "[new (force a fresh design) | a product/service name or one-line description]"
---

Use the `logo-pack` skill for THIS project. Skills live in `${CLAUDE_PLUGIN_ROOT}/skills`;
outputs go in this project's `docs/brand/`.

1. **Scan first** — `node "${CLAUDE_PLUGIN_ROOT}/skills/logo-pack/scripts/scan-brand.mjs"` to
   find `docs/brand.json`, any brand guide, and any existing logo files.
2. **Pick the mode** — if a logo exists, ANALYZE it (look at the actual image) and produce
   on-brand refinements/variations; if none (or "$ARGUMENTS" says "new"), DESIGN fresh directions.
   If "$ARGUMENTS" names a product/service, scope the pack to that.
3. **Write the brief** to `docs/brand/logo-brief.md` (name, what it is, audience, personality,
   colors from `brand.json`, must-work conditions, things to avoid).
4. **Write the tailored prompt set** to `docs/brand/logo-prompts.json` following
   `references/prompt-styles.md` — always the four core styles (minimalist one-color, monochrome,
   comfortable, premium) plus icon/wordmark/monogram as useful. Anchor each on a concrete,
   product-specific motif, honor the brand colors, and spec logo-grade output.
5. **Generate (optional)** — hand the prompts to an available engine (the `using-local-ideogram4`
   or `gemini-imagegen` skill, or Ad Lab's `generate-image.js`) and save to `docs/brand/logos/`.
6. **Report** the mode chosen, the brief, the prompt set, and (if generated) the candidates —
   then recommend the strongest direction and a refine pass.

Stay specific to this product (never generic), keep it working in one color and at 16px, and
respect any "no purple" brand rule.
