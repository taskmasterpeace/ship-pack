---
description: Generate an in-app first-run onboarding tour for THIS project — derive an ordered docs/onboarding.json (steps, target selectors, copy, screenshot ids) from the user guide's main workflows, then render an embeddable, brand-themed coachmark tour component + a click-through preview. Start with a gap report before writing anything.
argument-hint: "[--guide path] [--persona role] | validate | gaps | render-only"
---

Use the `ship-onboarding` skill for THIS project. Skills live in `${CLAUDE_PLUGIN_ROOT}/skills`;
all outputs go in this project's `docs/`. It's part of the /ship-* pack
(user-guide-builder, screenshot-capture, shipping-log, logo-pack).

**Always start with discovery** — show what already exists and what's missing, no files written:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ship-onboarding/scripts/onboarding.mjs" gaps $ARGUMENTS
```

If `docs/onboarding.json` already exists, **update it** — never overwrite real work. Otherwise:

1. **Scaffold** a draft from the guide's workflow headings (auto-matches screenshot ids):
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/ship-onboarding/scripts/onboarding.mjs" scaffold $ARGUMENTS
   ```
   No user guide yet? Build one with `/ship-guide` first, or hand-author steps from the routes.

2. **Trim to the activation path (4–8 steps)** and write real copy + real selectors. A first-run
   tour is the shortest path to one win, not a tour of every feature. Prefer `data-tour="<id>"`
   hooks over brittle CSS. Follow the copy rules + worked example in the skill's
   `references/authoring-and-embedding.md`; the field reference is `references/spec-schema.md`.

3. **Validate** (exits non-zero on errors; flags leftover drafts/TODO/REPLACE):
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/ship-onboarding/scripts/onboarding.mjs" validate
   ```

4. **Render** the embeddable, brand-themed component + standalone preview:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/ship-onboarding/scripts/render-tour.mjs" --in docs/onboarding.json --out-dir docs/onboarding --brand docs/brand.json
   ```

Then open `docs/onboarding/onboarding-preview.html`, click through, refine the JSON, re-render.
Output is themed from `docs/brand.json` (never purple), self-contained, no backdrop-filter or SVG
turbulence. Stamp `version` + `storageKey` from `docs/VERSION` so the tour re-shows once per
release. Report the spec path, step count, any steps still drafted, and the two rendered files.
