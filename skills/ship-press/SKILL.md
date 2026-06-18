---
name: ship-press
description: >-
  Generates a launch kit from a release — a press release, Product Hunt assets, and a launch-day
  checklist — written from the project's shipping log and brand.json. This skill should be used when
  the user wants to launch or announce a release: a press release, a Product Hunt / Hacker News /
  Show HN / Reddit / Indie Hackers submission (tagline, description, maker's first comment), a launch
  announcement, a launch-day plan, or a "launch kit" / "launch assets" / "press kit" / "media kit".
  Triggers on "press release", "launch kit", "Product Hunt assets", "launch this release",
  "announce v1.2", "maker comment", "launch checklist", "PH tagline". Public-safe by design — it
  never fabricates quotes, customers, or metrics.
---

# Ship Press — launch kit from a release

Turn a shipped release into everything you need to **launch it publicly**: a press release, the
copy for a Product Hunt (or HN / Reddit / IH) post, and a launch-day checklist. The input is the
work you already shipped — this skill reframes it for the public, on-brand, with **zero fabrication**.

The shipping log says *what changed*. The user guide says *how to use it*. The launch kit says
*"here's why the world should care, today."* It is attributable and quotable, so the honesty bar is
absolute: no invented quotes, customers, traction, or metrics — ever.

## Part of the "ship" pack

One repo, one `docs/`, one brand file. This skill consumes the pack's outputs:

```
docs/VERSION              ← shared semver anchor (ship-release owns the bump)
docs/brand.json           ← brand-as-data (colors + fonts) — themes every HTML output
docs/SHIPPING-LOG.md      ← the release this kit announces   (← shipping-log / ship-changelog)
   └─ ship-press          → docs/press/release.md + .html, docs/press/launch-kit.md   (this skill)
docs/brand/logos/*        ← thumbnail / gallery art          (← logo-pack)
docs/screenshots/*        ← gallery images                   (← screenshot-capture)
docs/user-guide/*         ← "how to use it" companion link   (← user-guide-builder)
```

Cross-links: get the release from **shipping-log** / cut it with **ship-release**; get the
thumbnail from **logo-pack**; get gallery images from **screenshot-capture**.

## Outputs

| File | What it is |
|------|------------|
| `docs/press/release.md` | The press release (markdown, ~300–450 words, quotable) |
| `docs/press/release.html` | Self-contained, on-brand, print-friendly page (rendered from `release.md`) |
| `docs/press/launch-kit.md` | Product Hunt tagline + description + maker's first comment + launch-day checklist |

`launch-kit.md` is **intentionally markdown-only** — it's paste-ready copy (PH/HN/Reddit fields +
an operational checklist) meant to be copied straight into a submission form or a task list, so it
gets no HTML render. Only `release.md` is rendered (it's the one public, link-shareable artifact).
That asymmetry is by design, not a missing output.

## Workflow

### 1. Discover what exists (always first — never act blind)

Run the bundled discovery script from the repo root. It reads the shipping log, `brand.json`, and
`docs/VERSION`, extracts the **latest release** (version, date, themed line, bullets by section)
and the **brand voice** (`brand.voice` / `tone` / `personality`, plus do/don't/words lists),
lists existing logos/screenshots to attach, and flags any prior launch kit so you don't clobber it.

```bash
node "<skill-dir>/scripts/collect-launch.mjs" --json
```

`<skill-dir>` is this skill's folder (e.g. `${CLAUDE_PLUGIN_ROOT}/skills/ship-press`). Read the
JSON; **do not guess the release from memory.** Honor every `warnings[]` entry:

- **No shipping log** → that's a blocker. A launch kit needs a real release. Offer to run
  **shipping-log** first, or ask the user to point `--log` at a changelog.
- **No `brand.json`** → HTML falls back to a neutral slate theme (never purple). Proceed, note it.
- **`voice` present** (`report.voice`) → write the press release and the maker's comment **in that
  voice** — honor its tone/personality and its do/don't/words lists. Don't improvise a tone when the
  brand has declared one. **`voice` absent** → use the skill's default plain-English press voice.
- **No themed line** → write the lede from the bullets, grounded only in them.
- **Prior kit exists** → confirm before overwriting; offer to update/diff instead.

### 2. Confirm the launch framing (one or two questions, only if needed)

Resolve only what the source can't tell you: the **maker/spokesperson name** (for attribution),
the **launch channel** (Product Hunt? Show HN? just a press release?), the **canonical URL** and
**media contact**, and the **price/availability** if the kit should state it. If unknown, you'll use
honest `[ADD …]` placeholders — do **not** invent any of these.

### 3. Write the press release → `docs/press/release.md`

Follow **[references/press-release-template.md](references/press-release-template.md)** exactly:
the headline → dated lede → problem → what-shipped paragraphs → "What's new" list → optional quote
→ availability → about → contact. Map the "What's new" list **1:1 to the latest release's bullets**.

The hard rules (full list in the template):
- **No fabricated quotes.** A maker statement may be first-party and attributable ("— The {Product}
  team" or a real name). No real source → **omit the Quote section** or leave `[ADD CUSTOMER QUOTE]`.
- **No fabricated metrics.** No "10x", "saves N hours", "trusted by thousands", "#1" unless the exact
  number is in the source. Otherwise leave `[ADD METRIC]` and report it.
- **Honest ship status.** "Available now" only if it truly is; else "rolling out" / "in {plan} tier".
- Plain English, present tense, third person, one screen.

### 4. Write the Product Hunt assets + launch-day checklist → `docs/press/launch-kit.md`

Follow **[references/product-hunt-assets.md](references/product-hunt-assets.md)**:
- **Tagline** — 3 ranked options, each **≤60 chars**, benefit-first, from `brand.json.tagline`.
- **Description** — 2–3 sentences (~260 chars): problem → what it does → who it's for.
- **Maker's first comment** — ~120–180 words, first person, the arc: who → the itch → what it does
  today (honestly scoped) → what's next → a real ask. Never a fake persona. Match the **brand voice**
  from discovery if one was declared.
- **Gallery notes** — list the assets discovery found; flag what's missing and which pack skill makes it.
- **Launch-day checklist** — Before / Launch hour / During / After, terse and checkable, adapted to the
  channels the user actually has (don't assume a Twitter/X account exists).

Then **verify the counts programmatically** — the 60-char tagline limit is hard, and an eyeball count
is exactly where it breaks. Don't trust the mental tally:

```bash
node "<skill-dir>/scripts/check-counts.mjs" --in docs/press/launch-kit.md
```

It reads every Tagline option and the Description back out of the file and prints `OK`/`OVER` with the
real code-point count; it exits non-zero if any tagline exceeds 60 (or the description blows the max).
Tighten any `OVER` line and re-check before moving on. (Ad-hoc while drafting:
`check-counts.mjs --tagline "…" --description "…"`.)

### 5. Render the press release to HTML

```bash
node "<skill-dir>/scripts/render-press.mjs" --in docs/press/release.md --out docs/press/release.html \
  --brand docs/brand.json --version docs/VERSION
```

Self-contained single file, themed from `brand.json` via `:root` CSS variables, neutral slate
default (**never purple**), print-friendly, **no `backdrop-filter`, no SVG `feTurbulence`**. If
`brand.json` is absent it themes from the neutral defaults — still on-brand-safe.

**Render verification (don't skip the exit code).** The renderer **scans the generated HTML for any
remaining `[ADD …]` / `[CONFIRM …]` placeholders** — which the release carries honestly by design —
and prints a `HTML still contains N placeholder(s)` line listing each one. If any remain it **exits
non-zero (3) and refuses to certify the page as final**, embeds a machine-readable comment, and draws
a visible "Draft — N placeholders" banner on the page so a kit is never published with raw
`[ADD CONTACT]` showing. The fix is to fill the placeholders and re-render. If you deliberately want a
labelled draft for review, pass `--allow-placeholders` (exit 0, banner stays). Capture that `N` for
the report.

### 6. Report

Summarize: the files written, the release described (version + date), the **full list of `[ADD …]` /
`[CONFIRM …]` placeholders** the user must fill — quote the renderer's `HTML still contains N
placeholder(s)` line so the count is explicit — the `check-counts` result (any tagline that was
`OVER`), any missing gallery assets (and which skill produces them), and the ship-status note. Then
offer the next pack step (refresh screenshots, or `ship-release` to cut the next version).

## Worked example

See **[references/worked-example.md](references/worked-example.md)** for a complete input→output
pass: a real `brand.json` + `VERSION` + shipping-log block in, and the resulting `release.md`,
Product Hunt assets, maker comment, checklist, and themed HTML out — with notes on *why each passes
the honesty bar* (capabilities traced to bullets, quote omitted, placeholders flagged).

## Quality bar

A launch kit is good when:

- **Every claim traces to a real input.** Each "What's new" line maps to a shipping-log bullet; each
  number appears in the source. If you can't trace it, it's not in the kit — it's an `[ADD …]` flag.
- **No fabricated social proof.** Zero invented quotes, customers, logos-of-companies, user counts,
  or "industry-leading" language. A maker statement is first-party and attributable, or absent.
- **Benefit-first, plain English.** Outcomes for the reader, not implementation. No marketing
  throat-clearing ("We're thrilled to announce…"). Cut every non-load-bearing adjective.
- **Specific to this product.** If the press release would fit any company by swapping the name, it's
  too generic — anchor it in this release's actual capabilities and this product's audience.
- **Counts respected — and verified.** Tagline ≤60 chars, description ~260, press release one screen,
  maker comment 120–180 words. The tagline/description counts are checked **programmatically**
  (`check-counts.mjs`), not by eye — `check-counts` must come back with no `OVER`.
- **On-brand voice.** If `brand.json` declares a voice/tone, the release and maker's comment read in
  it (honoring its do/don't/words) — not a generic press tone.
- **No raw placeholders shipped.** The rendered HTML is scanned; `render-press` reports the remaining
  `[ADD …]` count and refuses to certify a page that still has any (a labelled draft is explicit).
- **Honest about gaps.** Missing assets, unknown facts, and staged-not-live work are surfaced as
  placeholders and report notes — never papered over.
- **On-brand, portable HTML.** Themed from `brand.json`, never purple by default, self-contained,
  no `backdrop-filter` / `feTurbulence`. Works in any repo — nothing hardcoded to one app.

## Reusable contents

- `scripts/collect-launch.mjs` — discovery + raw material (run, don't reinvent): latest release,
  brand, **brand voice/tone**, version, existing assets, prior outputs, warnings. `--json` for machine-readable.
- `scripts/render-press.mjs` — markdown press release → self-contained, themed HTML page; **scans for
  unfilled `[ADD …]`/`[CONFIRM …]` placeholders** and refuses to certify a page that still has any.
- `scripts/check-counts.mjs` — programmatic char-count check for the PH tagline (hard 60) + description;
  reads a finished `launch-kit.md` (`--in`) or ad-hoc strings (`--tagline`/`--description`).
- `references/press-release-template.md` — exact press-release structure + the honesty rules + voice.
- `references/product-hunt-assets.md` — PH tagline/description/maker-comment specs + launch-day checklist.
- `references/worked-example.md` — one full input→output pass with rationale.
