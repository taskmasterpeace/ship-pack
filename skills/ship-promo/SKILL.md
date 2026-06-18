---
name: ship-promo
description: >-
  Turns a project's changelog, shipping log, or user guide into a short promo-video PLAN —
  a brand-voiced voiceover script, a timed shotlist, and a storyboard outline written to
  docs/promo/. Reads docs/brand.json (colors + fonts) and docs/VERSION so the plan matches
  the current release, and emits ready-to-run prompts for whatever generator the user has
  (Ad Lab generate-* scripts, Directors Palette, or any local image/video tool) via adapters —
  nothing is assumed installed. Use when the user wants a promo video, launch teaser, demo
  reel, trailer, sizzle, social ad, "what's new" video, video script, voiceover script,
  shotlist, or storyboard for a release or feature. Triggers on "make a promo", "promo plan",
  "launch video", "teaser", "video script for this release", "storyboard the changelog".
---

# Ship Promo

## Purpose

Produce a short, benefit-first **promo video plan** from what the project just shipped. The
shipping log says *what changed*; the user guide says *how it works*; this skill says *how to
SHOW it in 30–60 seconds*. Output is three planning artifacts plus generator-ready prompts —
not a rendered video. Rendering is delegated to whatever tool the user already has, through
adapters (see `references/generator-adapters.md`). The skill never assumes a generator exists.

## Part of the ship pack

One member of the cross-project "ship" toolkit, all sharing the `docs/VERSION` anchor:

```
docs/VERSION              ← single source of truth (semver)
docs/brand.json           ← brand-as-data (colors + fonts) — themes every output
   ├─ ship-changelog / shipping-log → docs/SHIPPING-LOG.md   (WHAT shipped → promo source)
   ├─ ship-guide / user-guide-builder → docs/.../guide        (HOW it works → promo claims)
   ├─ ship-screenshots / screenshot-capture → screenshots/    (real app frames for the storyboard)
   ├─ ship-logos / logo-pack → docs/brand/logos/              (brand mark for the end card)
   └─ ship-promo (this)   → docs/promo/                        (script + shotlist + storyboard)
```

Source priority: the shipping log is the spine (it is already benefit-first). Pull supporting
claims from the guide, and prefer **real screenshots** over generated frames whenever they
exist — they are the most honest, on-brand footage available.

## Workflow

1. **Discover what already exists.** Never act blind. From the repo root:
   ```bash
   node "<skill-dir>/scripts/discover-promo.mjs" --pretty
   ```
   It reports (as JSON): `docs/brand.json` (parsed colors + fonts, or a flag if missing),
   `docs/VERSION`, the changelog / guide / screenshots / logos it found, any prior
   `docs/promo/*` outputs (so you update instead of clobber), and a `gaps` list of missing
   inputs. Read it before writing anything.

2. **Choose the angle and length.** Default is a **45-second "what's new" promo** for the
   current `docs/VERSION`. Honor the user's ask: a feature spotlight, a 15s social teaser, a
   60s investor/launch sizzle, or a "since v0.x" range. Pick **one spine message** (the single
   thing a viewer should remember) and 3–5 proof beats that back it. More is worse.

3. **Gather evidence.** Read the changelog/guide the discovery step found. Every claim in the
   script must trace to a shipped item — no invented features, no "AI-powered" filler. If the
   changelog is thin or absent, say so and offer to run `/ship-changelog` first rather than
   padding with generic lines.

4. **Write the script + shotlist + storyboard.** Follow `references/promo-format.md` exactly
   (structure, timing math, the beat taxonomy, and a full worked example). Produce three files
   under `docs/promo/` — see [Outputs](#outputs). Keep the voiceover in the brand voice:
   benefit-first, second person, concrete, no hype words from the ban list.

5. **Attach generator prompts.** For each shot, write a tool-agnostic image/video prompt into
   the shotlist, themed by `brand.json` colors. Then map them to the user's actual tools using
   `references/generator-adapters.md` — emit a runnable command block per available adapter
   (Ad Lab, Directors Palette, local Ideogram/Wan, etc.). Mark adapters you could not confirm
   as "not detected — install or swap," and never fabricate a command for a tool that isn't there.

6. **Render the storyboard page (optional).** If the user wants something to look at / share,
   build a self-contained `docs/promo/storyboard.html` from `references/storyboard-template.md`,
   themed from `brand.json`. It must be a single file, no build step, `:root` CSS variables only,
   never purple by default, and **must NOT use `backdrop-filter` or SVG `feTurbulence`** (both
   hang renderers). Embed real screenshots where they exist; use prompt text as placeholders
   where they don't.

7. **Report.** State the angle, the length, the spine message, the files written, which
   generator adapters were detected, and the honest gaps (e.g. "no screenshots for the Finance
   shot — run `/ship-screenshots`"). If you used a stale changelog, say so.

## Outputs

All under the project's `docs/promo/` (create it if absent — `mkdir -p docs/promo`):

| File | What it is |
|---|---|
| `docs/promo/voiceover.md` | The spoken script: titled beats with timecodes, word counts, and an estimated read time at ~2.6 words/sec. Plain, speakable sentences. |
| `docs/promo/shotlist.md` | A timed table — every shot's `t_start–t_end`, on-screen action, the VO line it carries, on-screen text/lower-third, and a generator prompt. The production spine. |
| `docs/promo/storyboard.md` | Beat-by-beat outline: the narrative arc (hook → proof → payoff → CTA), pacing notes, music/energy curve, and which shots are real screenshots vs. generated. |
| `docs/promo/storyboard.html` | *(optional)* A shareable, on-brand visual board of the above. |

Use the bundled estimator so timings are consistent, not guessed:
```bash
node "<skill-dir>/scripts/estimate-timing.mjs" docs/promo/voiceover.md
```
It returns per-beat word counts, read times (~2.6 wps), cumulative timecodes, and a total —
and warns if the total overshoots the target length so you can trim before storyboarding.

## Brand & theming

- Read `docs/brand.json` for `colors` and `fonts`. Use them for any on-screen text spec,
  lower-thirds, end card, and the HTML board. If `brand.json` is missing, fall back to the
  project's landing page / Tailwind config / logo, and say in your report that you inferred it.
- **Never default to purple/indigo.** If the brand has an explicit "no purple" rule, honor it.
- The end card uses the brand wordmark/logo from `docs/brand/logos/` if present, the tagline
  from `brand.json`, and the brand accent for the CTA.

## Quality bar

A promo plan passes only if **every** line is true:

- **One spine message, 3–5 proof beats.** If you can't name the single takeaway in a sentence,
  the plan fails. Cut everything that doesn't serve it.
- **Every claim traces to a shipped item** in the changelog or guide. No invented capabilities,
  no roadmap-as-fact, no implied security/compliance you can't cite.
- **Benefit-first, second person, concrete.** "Send a change order in two taps" beats
  "streamline your workflow." Show the noun (the actual feature), not the adjective.
- **Banned filler:** revolutionary, game-changing, seamless, robust, cutting-edge, unlock,
  supercharge, leverage, elevate, next-level, "AI-powered" as a standalone selling point. If a
  line still works with the word deleted, delete it.
- **Timing is computed, not vibes.** Word counts → read time → timecodes via the estimator;
  the total fits the target length (with ~10% headroom for breaths and music tails).
- **Shotlist is shootable.** Each shot says what's on screen, what's said, and how to make the
  frame (real screenshot path OR a specific, brand-colored generator prompt). No "show the app
  looking great."
- **Honest about gaps.** Missing screenshots, thin changelog, undetected generator — named in
  the report, not papered over.

## Honest handling of missing inputs

- **No changelog/guide** → don't invent. Offer `/ship-changelog` first; if the user insists,
  build only from `git log` + README and label the plan "draft — claims unverified."
- **No brand.json** → infer from landing page/logo, write a minimal one, note the inference.
- **No screenshots** → use prompt placeholders in the storyboard and flag the shots that would
  be stronger with real frames (`/ship-screenshots`).
- **No generator detected** → still write the prompts; mark every adapter "not detected" and
  list what to install. The plan is useful even with zero generators present.

## Reusable contents

- `scripts/discover-promo.mjs` — inventories brand/version/changelog/guide/screenshots/logos/
  prior promo outputs and reports gaps. Run first; don't reinvent.
- `scripts/estimate-timing.mjs` — word-count → read-time → timecode estimator for the script.
- `references/promo-format.md` — script/shotlist/storyboard structure, timing math, beat
  taxonomy, voice rules, and a full input→output worked example. Read before writing.
- `references/generator-adapters.md` — tool-agnostic prompt spec + per-tool command mappings
  (Ad Lab, Directors Palette, local image/video). Adapters, not assumptions.
- `references/storyboard-template.md` — the self-contained, themeable `storyboard.html`
  template (no backdrop-filter, no feTurbulence, never purple) and how to fill it.
