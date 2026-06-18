---
name: ship-pitch
description: >-
  Generates an investor one-pager plus a slide-by-slide pitch deck outline from a project's
  own evidence — docs/brand.json (name, tagline, colors, fonts), the shipping log + git
  momentum stats, and the user guide. Produces docs/pitch/one-pager.md, a themeable HTML
  render, and docs/pitch/deck-outline.md covering problem, solution, what's shipped
  (momentum), who it's for, and clearly-labeled traction placeholders. Never fabricates a
  metric. Use when the user wants an investor pitch, one-pager, pitch deck, deck outline,
  fundraising doc, investor update, exec summary, or "turn what we've shipped into a pitch."
  Triggers on "investor one-pager", "pitch deck", "deck outline", "fundraising one-pager",
  "investor summary", "make a pitch", "pitch from our shipping log".
---

# Ship Pitch

## Purpose

Turn a project's real, verifiable evidence into an investor one-pager and a slide-by-slide
deck outline. The angle is a **builder's pitch**: lead with proof of execution — what is
shipped and how fast the team ships (momentum) — rather than vague vision. Brand, momentum,
and product capabilities all come from files already in the repo, so the pitch matches the
current release and never drifts from reality.

The cardinal rule: **never fabricate a metric.** Momentum stats (releases, active build
days, cadence) are derived from the repo and may be shown. Traction (users, revenue,
retention) is shown only as clearly-labeled placeholders until a real, sourced number
exists. See `references/one-pager-and-deck.md` → "The honesty contract."

## Part of the "ship" pack

Reuses the same brand-as-data file and version anchor as the rest of the toolkit, and
consumes their outputs:

```
docs/brand.json   ← colors + fonts (themes the HTML render; sets name + tagline)
docs/VERSION      ← shared semver anchor (stamped on the one-pager)
   ├─ shipping-log / ship-changelog → docs/SHIPPING-LOG.md  → momentum stats + shipped features
   ├─ user-guide-builder / ship-guide → docs/user-guide/*   → what it does + who it's for
   ├─ screenshot-capture / ship-screenshots → [SCREENSHOT: id] callouts for deck visuals
   └─ logo-pack / ship-logos → docs/brand/ logo for the deck cover
ship-pitch (this) → docs/pitch/one-pager.md + .html + docs/pitch/deck-outline.md
```

If a needed input is missing, this skill points at the sibling that produces it
(e.g. no shipping log → run `/ship-changelog` first) rather than guessing.

## Workflow

1. **DISCOVERY — read what already exists (never guess).** From the repo root:
   ```bash
   node "<skill-dir>/scripts/collect-pitch-inputs.mjs" --days 30
   ```
   Returns one JSON blob: `brand` (name/tagline/colors), `version`, `shippingLog`
   (releases, latest/first version, dates), `git` (commits, active days, span, last
   shipped, contributors), `guide` (path + section headings = the shipped feature map),
   `priorPitch` (existing outputs — update, don't clobber), `gaps[]`, and `ready`.
   **Read it.** It is the only source of metrics. If `ready` is false or `gaps[]` is
   non-empty, handle it per step 2 before writing.

2. **Handle missing inputs honestly.**
   - **No `brand.json`** → ask for, or hand-write, a minimal one (name + tagline + colors);
     the HTML render must be on-brand and must never default to purple. Offer `/ship-logos`.
   - **No shipping log / not a git repo** → momentum stats are the *only* metrics you may
     show; if neither exists, you have no momentum numbers — say so and offer
     `/ship-changelog`. Do **not** invent cadence.
   - **No user guide** → "what's shipped" and "who it's for" lack grounding; offer
     `/ship-guide`, or fall back to the README / routes and mark inferred items.
   - **Prior pitch exists** → read it, preserve any human-entered traction/ask, and update
     the momentum + shipped sections in place.

3. **Load the content spec.** Read `references/one-pager-and-deck.md` for the section order,
   the voice rules, the traction-placeholder block, and the deck slide template. Read
   `references/worked-example.md` for a full input→output trace. Match them — the value of
   this skill is the consistent, honest structure.

4. **Write the one-pager** to `docs/pitch/one-pager.md` using the section order: problem →
   solution → what's shipped → who it's for → why now/why us → traction → the ask.
   - Pull problem/solution/audience from the **guide + brand tagline** (learn the real
     domain; never write interchangeable SaaS filler).
   - Build the **momentum strip** only from the collector's `git`/`shippingLog` numbers.
   - Every traction/financial/unsourced line is a canonical bracket token — `[TRACTION: …]`,
     `[METRIC: …]`, `[TBD: …]`, `[ASK: …]`, `[SOURCE: …]`, `[CONTACT: …]`, `[TEAM: …]`,
     `[MODEL: …]`, or `[PLACEHOLDER]`. The renderer styles **every one** of these as a visible
     dashed-pill placeholder, so no fake number can ship. Use only this set (the full table is
     in `references/one-pager-and-deck.md` → "Canonical placeholder tokens") so the writer and
     the renderer regex stay in lockstep. `[SCREENSHOT: id]` is a deck visual marker, not a
     blank, and is left un-styled.

5. **Write the deck outline** to `docs/pitch/deck-outline.md` — one block per slide
   (headline + 3–5 talking points + speaker note + visual suggestion), covering: title,
   problem, solution, what's shipped, momentum, who it's for, why now/why us, traction
   (placeholders), business model, the ask. Suggest `[SCREENSHOT: id]` visuals that
   `ship-screenshots` can fill.

6. **Render the HTML one-pager** (themed from brand.json, print-friendly):
   ```bash
   node "<skill-dir>/scripts/render-one-pager.mjs" \
     --in docs/pitch/one-pager.md --out docs/pitch/one-pager.html \
     --brand docs/brand.json --version docs/VERSION
   ```
   Self-contained, themeable via `:root` tokens from brand.json — **both colors AND
   typography**: the Google Fonts `<link>` is built from `brand.fonts` (display/body/mono),
   so a brand that sets custom fonts actually fetches them (not only the `--font-*` tokens).
   All-system font names (e.g. `Georgia`, `system-ui`) are skipped — no needless web fetch.
   Never purple by default, no `backdrop-filter` / no SVG `feTurbulence`, and includes a
   print stylesheet so it exports to PDF cleanly.

7. **Report** what was created, the momentum stats used, and — explicitly — **every
   bracket placeholder the founder still has to fill** (search the output for `[`). Tell
   them which inputs were missing and which sibling command produces them.

## Quality bar

A pitch passes only if **all** of these hold:

- **Zero fabricated metrics.** Every number traces to the discovery JSON or a source the
  user provided. Every unverified metric is a visible `[...]` placeholder. If you typed a
  user/revenue/growth number you didn't read in a source, you failed.
- **Momentum is labeled as momentum,** never as "traction" or "growth." It proves the team
  builds, not that customers exist.
- **Shipped ≠ planned.** "What's shipped" lists only features that exist now (cross-checked
  against the guide); future work is clearly future-tense under "roadmap."
- **Domain-specific, not generic.** Problem/solution name a real buyer and a real pain in
  the product's actual domain (learned from the guide/brand), not swappable filler. The
  "rejected vs accepted" example in `one-pager-and-deck.md` is the bar.
- **On-brand HTML.** Colors *and* fonts come from brand.json — the rendered `<link>` fetches
  the brand's display/body/mono faces (verify: the Google Fonts URL names the brand's fonts,
  not the defaults), and the `--font-*` tokens match it. Not purple unless brand.json says so;
  no backdrop-filter / feTurbulence; prints to a clean PDF.
- **Findable blanks.** A single search for `[` surfaces every unfilled placeholder, and the
  HTML render styles **every** canonical token (`TRACTION`, `METRIC`, `TBD`, `ASK`, `SOURCE`,
  `CONTACT`, `TEAM`, `MODEL`, `PLACEHOLDER`) as a visible dashed pill — none render as plain
  text. Only `[SCREENSHOT: id]` (a deck visual) is intentionally left un-styled.
- **Skimmable.** One screen / one page for the one-pager; one idea per line; no buzzwords
  ("revolutionary," "seamless," "leverage," "synergy," "game-changing").

## Cross-project portability

Nothing is hardcoded to any one app. All inputs are auto-discovered from conventional paths
(`docs/brand.json`, `docs/VERSION`, `docs/SHIPPING-LOG.md`/`CHANGELOG.md`,
`docs/user-guide/*`) with graceful fallback. Momentum comes from plain git, available in any
repo. External generators (logo, screenshots, a deck builder) are referenced through their
sibling skills as **adapters** — none is assumed installed; the skill degrades to
placeholders and clear "run X to fill this" notes instead of failing.

## Reusable contents

- `scripts/collect-pitch-inputs.mjs` — discovery: gathers brand, version, momentum
  (shipping log + git), and the shipped-feature map into one JSON. Read-only. Run it; don't
  re-derive history by hand.
- `scripts/render-one-pager.mjs` — renders the one-pager markdown to a self-contained,
  brand-themed, print-friendly HTML page (dependency-free markdown subset). Themes colors
  **and fonts** from brand.json: `--font-*` tokens and the Google Fonts `<link>` are both
  derived from `brand.fonts`, so custom typography is actually loaded, deduped, and falls
  back cleanly for system fonts.
- `references/one-pager-and-deck.md` — section order, voice, the honesty contract, the
  traction-placeholder block, and the deck slide template.
- `references/worked-example.md` — a full discovery-JSON → one-pager + deck-outline trace,
  with a rejected-vs-accepted problem statement showing the anti-generic bar.
