---
description: Make this project demo-ready — discover its data model, write an idempotent, obviously-fake seed that builds a few complete wired-up records, and produce docs/demo/script.md (a hook → core-loop → wow → live-create → value-close walkthrough with what-to-say / what-to-show) rendered to a themed presenter page. Pass a focus, a record count, or a "script only" / "seed only" scope.
argument-hint: "[focus, e.g. \"sales demo\" · \"investor\" · \"3 projects\" · \"script only\" · \"seed only\" · \"reset\"]"
---

Use the `ship-demo` skill to make THIS project demo-ready.
Skills live in `${CLAUDE_PLUGIN_ROOT}/skills`; outputs go in this project's `docs/`.

**Always discover before acting** — run, from the repo root:
```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ship-demo/scripts/discover-model.mjs" --json
```
Read the JSON: the ORM/data layer, schema files, model names, ANY existing seed or demo docs,
`docs/brand.json`, `docs/VERSION`, and the project's db scripts. Extend existing seed/demo work —
never create a parallel one. If the data layer is unknown, ask where the model lives; don't guess.

**Interpret "$ARGUMENTS"** to scope the run:
- **Audience/focus** — "sales demo", "investor", "onboarding" → tune the story and the script's voice.
- **Size** — "3 projects", "more data" → how many hero records, while keeping it a wired-together story.
- **`seed only`** — generate just the idempotent seed + `docs/DEMO-LOGINS.md`, skip the script.
- **`script only`** — write/refresh `docs/demo/script.md` against data that already exists, skip seeding.
- **`reset`** — run the seed's `--reset` path to restore the demo namespace to a clean state.
- **Default** (no args) — full pass: seed + script + rendered page.

Then follow the skill:
- Read the real schema, pick the adapter (`references/seed-adapters.md`), and write an
  **idempotent, namespaced** seed using `scripts/fake.mjs` (obviously-fake `@example.test` /
  `(555)` data, stable ids). Build 2–3 fully-populated hero records, 1 empty record, 1 edge-case
  record — wired together. Add a runnable `seed:demo` entry point and capture logins in
  `docs/DEMO-LOGINS.md` (demo password / env var, NEVER a real credential).
- **Run the seed twice** and confirm row counts match (proof of idempotency) before continuing.
- Write `docs/demo/script.md` per `references/script-template.md` (Go to / Say / Show / Reset +
  operator appendix), then render the presenter page:
  ```bash
  node "${CLAUDE_PLUGIN_ROOT}/skills/ship-demo/scripts/render-demo.mjs"
  ```
  (self-contained, themed from `docs/brand.json` — never purple, no backdrop-filter/turbulence).
- Report: counts per entity, the logins, the reset command, and both output paths
  (`docs/demo/script.md`, `docs/demo/script.html`). Flag anything stubbed, guessed, or staged
  rather than shipped. Then offer to run `/ship-screenshots` on the seeded app and `/ship-guide`
  so the guide and the demo describe the same flows.

(Part of the /ship-* pack: /ship-guide, /ship-changelog, /ship-screenshots, /ship-logos, /ship-release.)
