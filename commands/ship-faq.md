---
description: Build a help center from this project's user guide — a real-question docs/FAQ.md (grounded in the guide's workflows, troubleshooting, and glossary), a library of canned support replies, and a searchable, on-brand docs/help.html. Updates an existing FAQ rather than competing with it.
argument-hint: "[a focus area, e.g. \"billing\" or \"the change-orders module\" — omit to cover the whole product]"
---

Use the `ship-faq` skill to build (or refresh) the help center for THIS project.
Skills live in `${CLAUDE_PLUGIN_ROOT}/skills`; outputs go in this project's `docs/`.

1. **Discover first** — read the version and check what already exists:
   `node "${CLAUDE_PLUGIN_ROOT}/skills/ship-faq/scripts/version.mjs" get`
   (init `0.1.0` if there's no `docs/VERSION`). Look for an existing `docs/FAQ.md`,
   `docs/support-replies.md`, `docs/brand.json`, and the user guide — **prefer updating** over
   creating competing files. Create `docs/brand.json` if missing (never purple).

2. **Extract real questions** from the guide (don't invent them):
   `node "${CLAUDE_PLUGIN_ROOT}/skills/ship-faq/scripts/extract-source.mjs" --json`
   (or pass `--guide docs/user-guide/<Guide>.md`). If there's no guide yet, say so and suggest
   `/ship-guide` first — you can still draft a thinner FAQ from the app + changelog.

3. **Write `docs/FAQ.md`** — `# Title` → `## Category` → `### Question` → answer. Real questions
   only, grouped into scannable topics; each answer leads with the direct fix using real screen and
   button names, then steps, then an honest caveat. Follow
   `references/faq-template.md`. Aim for the product's real recurring questions (typically 20-40),
   not a thin list. If `$ARGUMENTS` names a focus area, concentrate the new/updated entries there.

4. **Write `docs/support-replies.md`** — the 7 universal canned replies plus ~12 keyed to the top
   FAQ answers, each linking back to its help-page anchor (`references/support-replies.md`).

5. **Render the help page**:
   `node "${CLAUDE_PLUGIN_ROOT}/skills/ship-faq/scripts/render-help.mjs" --in docs/FAQ.md --out docs/help.html --brand docs/brand.json --version docs/VERSION --replies docs/support-replies.md`
   (self-contained, searchable, themed from `brand.json` — no purple, no backdrop-filter/turbulence).

6. **Report** the files written, the question/category counts, the version stamped, which questions
   are new this pass, and any product gaps the FAQ exposed (questions you couldn't answer honestly).
   Point to the files; don't paste the whole FAQ into chat.

Part of the `/ship-*` pack (`/ship-guide`, `/ship-changelog`, `/ship-screenshots`, `/ship-logos`) —
shares `docs/VERSION` + `docs/brand.json`, so re-run after a release so the FAQ covers what's new.
