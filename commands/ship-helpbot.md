---
description: Build an embeddable "ask the guide" assistant for THIS project — chunk the user guide into a retrieval index, emit a themeable <ship-helpbot> web component, and wire a model-pluggable /api/ask-docs route that answers from the guide with deep-linking citations. Start by verifying retrieval with no LLM needed.
argument-hint: "[--provider claude|gateway|ollama] [--in docs/user-guide/<Guide>.md] [a focus, e.g. \"just rebuild the index\"]"
---

Use the `ship-helpbot` skill for THIS project. Skills live in `${CLAUDE_PLUGIN_ROOT}/skills`;
outputs go in this project's `docs/` and `public/`. Part of the `/ship-*` pack.

**Discover first** (don't clobber existing work):
```
node "${CLAUDE_PLUGIN_ROOT}/skills/ship-helpbot/scripts/version.mjs" get
ls docs/brand.json docs/guide-index.json docs/user-guide/*.md public/ship-helpbot.js app/api/ask-docs/route.*
```
- No guide markdown? Stop and run `/ship-guide` first — there's nothing to chunk. Say so.
- No `docs/brand.json`? The widget uses on-brand neutral defaults (never purple); offer to create one.

**1. Chunk the guide into a retrieval index:**
```
node "${CLAUDE_PLUGIN_ROOT}/skills/ship-helpbot/scripts/build-index.mjs" --out docs/guide-index.json --version docs/VERSION --brand docs/brand.json
```
(auto-discovers the guide; pass `--in <Guide.md>` to override.)

**2. Verify retrieval BEFORE any LLM** (this is the quality gate — no API key needed):
```
node "${CLAUDE_PLUGIN_ROOT}/skills/ship-helpbot/scripts/retrieve.mjs" --index docs/guide-index.json --q "how do I get started"
```
Try 3–5 real user questions; the right section must rank first. If not, fix chunking/the guide.

**3. Emit the themed, self-contained web component:**
```
node "${CLAUDE_PLUGIN_ROOT}/skills/ship-helpbot/scripts/build-widget.mjs" --out public/ship-helpbot.js --brand docs/brand.json --endpoint /api/ask-docs --src /guide-index.json
```
Copy `docs/guide-index.json` to `public/` so it's served. No purple, no backdrop-filter/turbulence.

**4. Wire the route + embed:** follow `references/api-route.md` to create `/api/ask-docs` for this
repo's stack (Next/Express/SvelteKit/edge), copying `scripts/retrieve.mjs` into the app and importing
`rank()`. Pick the model with `HELPBOT_PROVIDER` (claude / gateway / ollama — honor "$ARGUMENTS" if it
sets `--provider`). Then follow `references/embedding.md` to add the script + `<ship-helpbot guide="/help">`
tag to the root layout so citations deep-link into the rendered guide.

If "$ARGUMENTS" scopes the work (e.g. "just rebuild the index"), do only that. Otherwise do all steps.

**Report:** index path + section count + version, files written, the model provider wired and its env
vars, a working sample question→answer→citation, and any topics the guide is too thin to answer.
