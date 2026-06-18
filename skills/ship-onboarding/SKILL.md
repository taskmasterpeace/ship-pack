---
name: ship-onboarding
description: Generates an in-app first-run onboarding tour from a project's user guide and screenshots — an ordered docs/onboarding.json (steps with target selectors, copy, and optional screenshot ids) plus an embeddable, themeable coachmark/tour web component. Derives the activation path from the guide's main workflows, themes from docs/brand.json, and stays in sync via docs/VERSION. Use when the user wants an onboarding tour, first-run experience, product tour, guided tour, coachmarks, walkthrough overlay, tooltips/hints for new users, a "show me around" flow, an onboarding checklist, or to turn the user guide into an in-app tour. Triggers on "onboarding tour", "first-run", "product tour", "coachmarks", "guided tour", "in-app walkthrough", "new-user tour", "ship-onboarding".
---

# Ship Onboarding

Turn the project's user guide and screenshots into a real **first-run experience**: an ordered
`docs/onboarding.json` (the spec) and an embeddable, on-brand **coachmark tour component** that
spotlights elements, walks a new user to their first win, and fires once per release.

This is the *in-app* sibling of the guide: [`user-guide-builder`](../user-guide-builder/SKILL.md)
explains every feature on a docs page; this skill picks the **shortest activation path** out of
those features and shows it inside the running app. It does **not** invent product behavior — it
derives steps from the guide and you write honest, specific copy.

## Part of the /ship-* pack

```
docs/VERSION            ← shared semver anchor (stamps the tour's version + storageKey)
docs/brand.json         ← brand-as-data (colors + fonts) → themes the component, never purple
   │
   ├─ user-guide-builder → the guide whose workflows seed the tour's steps
   ├─ screenshot-capture → the shot ids a step can show before its element exists
   ├─ shipping-log       → the release that bumps VERSION (re-show the tour once)
   └─ ship-onboarding    → docs/onboarding.json + an embeddable tour component   ← you are here
```

## Quick start

```
1. node scripts/onboarding.mjs scaffold   → DRAFT docs/onboarding.json from the guide workflows
2. Trim to the activation path + write real copy and real selectors (references/authoring…md)
3. node scripts/onboarding.mjs validate   → lint shape, ids, version, leftover drafts
4. node scripts/render-tour.mjs           → onboarding-tour.js + onboarding-preview.html
5. Open the preview, click through, refine the JSON, re-render
6. Embed <onboarding-tour> in the app shell; add data-tour hooks to the target elements
```

Scripts are run, never inlined. Both are dependency-free Node (`.mjs`) — nothing to install.

## Step 0 — Discovery (check what already exists first)

Before generating anything, look. Never overwrite real work or pretend inputs exist.

| Look for | Why it matters |
|----------|----------------|
| `docs/onboarding.json` | **Already there → UPDATE it**, don't overwrite. Re-run `validate`/`gaps`, refine. |
| `docs/user-guide/*.md` (or `docs/user-guide.md`) | Source of workflow steps. No guide → run `user-guide-builder` first, or hand-author steps. |
| `docs/screenshots.config.json` | Shot ids a step can display. Lets a tour exist before every element is wired. |
| `docs/brand.json` | Themes the component (colors + fonts). Absent → safe non-purple defaults, and say so. |
| `docs/VERSION` | Stamps the spec's `version` + `storageKey`. Absent → falls back to `0.1.0`. |
| Existing tour code (`onboarding`, `coachmark`, `intro.js`, `driver.js`, `shepherd`) | Don't duplicate. Adapt the spec to what's there, or replace intentionally. |

Run the read-only **gap report** to see exactly what's missing — no files written:

```bash
node scripts/onboarding.mjs gaps      # TODO selectors · draft copy · uncovered workflows · missing screenshots
```

## Step 1 — Scaffold the spec from the guide

```bash
node scripts/onboarding.mjs scaffold \
  --guide docs/user-guide/<Guide>.md \
  --shots docs/screenshots.config.json \
  --out   docs/onboarding.json
```

This reads the guide's `##`/`###` workflow headings, drops meta sections (TOC, glossary,
appendices, FAQ), and proposes **welcome + up to 7 coachmarks + finish**, each marked
`draft:true` with a `TODO:` selector and a `REPLACE …` body. It matches a step to a screenshot
id when the workflow slug equals a shot id. Nothing pretends to be wired up. `--force` to
overwrite a previous draft.

If there's no guide, the scaffold emits a starter step and warns — hand-author the steps from
the routes/nav instead, or build the guide first.

## Step 2 — Trim to the activation path and write real copy

The scaffold is a *candidate list*, not the answer. A first-run tour is the **shortest path to
one real win**, not a tour of every feature. Cut to **4–8 steps**:

1. **Welcome** (centered) — one sentence on the first win.
2. **3–5 core steps** — only features on the path to that win (e.g. create project → calendar →
   invite crew). Drop settings, admin, glossary.
3. **Finish** (centered) — the single next action that delivers value.

Copy must be **specific and honest**: name the real screen/button, give one action to try, say
what they'll get. No "simply/just," no feature lists, no claims the guide can't back. Full copy
rules, selector strategy, and a complete **input → output worked example** are in
**[references/authoring-and-embedding.md](references/authoring-and-embedding.md)**. The spec
field reference is **[references/spec-schema.md](references/spec-schema.md)**.

Wire each step to a stable hook — prefer `data-tour="<id>"` attributes over brittle CSS
selectors — then drop the `TODO:` and `draft` flags.

## Step 3 — Validate

```bash
node scripts/onboarding.mjs validate     # exits non-zero on structural errors
```

Checks: array shape, **unique step ids**, semver `version` and whether it matches `docs/VERSION`,
duplicate selectors, screenshot ids with no matching shot, and any leftover `draft:true` / `TODO`
/ `REPLACE`. Fix everything it flags before rendering.

## Step 4 — Render the embeddable component

```bash
node scripts/render-tour.mjs \
  --in docs/onboarding.json --out-dir docs/onboarding --brand docs/brand.json
```

Writes two self-contained, brand-themed artifacts:

- **`docs/onboarding/onboarding-tour.js`** — a dependency-free `<onboarding-tour>` Web Component
  (spotlight + coachmark, Next/Back/Skip, dots, localStorage "fire once," graceful fallback when
  a selector isn't on the page). Drops into React/Vue/Svelte/plain HTML unchanged.
- **`docs/onboarding/onboarding-preview.html`** — a standalone page that mounts the tour over a
  mock app so you can click through the real copy before wiring it in. No server needed.

Themed entirely from `docs/brand.json` via `:root` `--ob-*` variables. **Never purple by
default** (blue/amber defaults). No `backdrop-filter`, no SVG `feTurbulence` — the spotlight is a
plain `box-shadow` ring, so it never hangs a renderer. Embedded, the component inherits your
app's CSS variables if you define the same names.

## Step 5 — Embed and keep in sync

Copy `onboarding-tour.js` + `onboarding.json` into the app's public dir, add `data-tour` hooks to
the target elements, and mount `<onboarding-tour src="/onboarding.json">` **once** in the
authenticated shell (not the marketing site). It self-fires for users who haven't seen
`storageKey`. Give users a `restart()` control for "show me around again." Full React/Next.js
snippet and `route` handling: [references/authoring-and-embedding.md](references/authoring-and-embedding.md).

On each release, **re-stamp `version` + `storageKey`** (so returning users see a materially new
path once), re-run `gaps`, and re-render. Edit the JSON and re-render — never hand-edit the
generated `.js`.

## Cross-project

Nothing here is app-specific. The guide, brand, routes, and selectors all come from the target
repo's `docs/`. The same scripts serve MyFieldTime, LogNog, Directors Palette, or any web app —
only the inputs change. The component is a plain Web Component, so it works regardless of the
app's framework. External tour libraries (driver.js, Shepherd, intro.js) are **adapters you can
target**, not dependencies — the default output assumes none of them are installed.

## Quality bar

The tour isn't done until:

- It's **4–8 steps** on the **activation path**, not a list of every feature.
- Every step **names a real screen/button** and gives **one action to try** — no "simply/just,"
  no generic "manage your X here," no claim the guide can't back.
- Every anchored step has a **real selector** (ideally `data-tour`), not a `TODO:` placeholder;
  `validate` reports **zero** drafts and **zero** errors.
- The component is **themed from brand.json** (not purple), **self-contained**, and free of
  `backdrop-filter` / `feTurbulence`.
- `version` + `storageKey` match `docs/VERSION`, so the tour re-shows once after a real release.
- You **previewed it** (`onboarding-preview.html`) and clicked through — it reads like a calm
  product trainer, not a feature dump.

If any of these fail, keep going.
