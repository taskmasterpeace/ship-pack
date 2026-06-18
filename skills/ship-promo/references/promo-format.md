# Promo format — structure, timing, voice, and a worked example

This is the spec the `ship-promo` skill follows when writing `docs/promo/voiceover.md`,
`shotlist.md`, and `storyboard.md`. The value of the skill is consistency: follow this exactly.

## The arc (every promo, any length)

A promo earns attention in the first 3 seconds and a click in the last 5. Use this five-beat
arc; scale the middle, never drop the ends:

1. **Hook (0–4s)** — the pain or the promise, stated as the viewer's problem. No logo yet.
   "Still chasing change orders over text?"
2. **Reveal (≈4–8s)** — name the product and the spine message once. Brand mark appears.
   "MyFieldTime keeps every job on one timeline."
3. **Proof beats (the middle, 3–5 of them)** — one shipped capability per beat, shown not told.
   Each beat = one VO line + one shot. This is where the changelog items go.
4. **Payoff (≈last 8s)** — the outcome the viewer keeps. "Run your jobs. Not your inbox."
5. **CTA + end card (last 3–4s)** — wordmark, tagline, one action ("Start free at …").

## Length presets (target totals)

| Preset | Total | Proof beats | Use |
|---|---|---|---|
| Teaser | 12–15s | 1–2 | Social, top-of-feed, single feature |
| What's-new | 45s | 3–4 | A release; the default |
| Sizzle / launch | 60s | 4–5 | Investor, homepage hero, big launch |

Pick **one** spine message regardless of length. Length only changes how many proof beats and
how much breathing room — never the number of ideas.

## Timing math (computed, not guessed)

- Read pace: **~2.6 words/sec** for a calm VO (use 3.0 for a brisk social cut). The
  `estimate-timing.mjs` script computes per-beat seconds and cumulative timecodes from word
  counts. Run it after drafting `voiceover.md`; trim until the total fits the preset with ~10%
  headroom for breaths, music, and the end-card hold.
- A 45s promo is roughly **110–120 spoken words**. A 15s teaser is **~35 words**. Do not exceed.
- Each proof beat is typically 4–8s and 10–20 words. Shots can be shorter than the VO line
  (cut on the verb); never longer than the line that carries them.

## Voice rules

- **Benefit-first, second person, present tense.** "You send a change order in two taps,"
  not "Change orders can be created efficiently."
- **One concrete noun per line** — the real feature, the real number. "Eleven modules,"
  "transcribed in minutes," "two-tap approval." Specifics are credibility.
- **Speakable.** Read every line aloud. No clause stacks, no parentheticals, no words a
  narrator would stumble on. Contractions are good.
- **Banned filler** (delete on sight): revolutionary, game-changing, seamless, robust,
  cutting-edge, unlock, supercharge, leverage, elevate, next-level, world-class, "AI-powered"
  as a standalone claim. If the line still works with the word gone, it was filler.
- **Truth:** every claim traces to a shipped changelog item or a documented guide feature.
  No roadmap-as-fact, no implied security/compliance you can't cite.

## File shapes

### `voiceover.md`
Front matter line with version + target length, then one `##` heading per beat, with the
spoken lines underneath and a `[direction]` line in brackets for tone. Headings + brackets are
excluded from the spoken word count by the estimator, so write freely.

### `shotlist.md`
A markdown table — the production spine. Columns:

`# | t_start–t_end | Shot (what's on screen) | VO line | On-screen text | Source / prompt`

- **Source / prompt**: either a real screenshot path (`screenshots/calendar.png`) **or** a
  generator prompt (a single, specific, brand-colored line — see `generator-adapters.md`).
- Prefer real screenshots wherever discovery found them. Generated frames are for what you
  can't screenshot (hero abstractions, the end card, b-roll).

### `storyboard.md`
Prose outline: the spine message up top, then the arc beat-by-beat with pacing and an energy/
music curve (e.g. "build → peak on proof beat 3 → resolve"), and a table marking each shot
**real** vs **generated**. This is what a human reads to approve the plan before anything renders.

---

## Worked example (input → output)

### Input (what discovery + the changelog gave us)

- `docs/VERSION` → `0.8.0`
- `docs/brand.json` → name "MyFieldTime", tagline "Run your jobs. Not your inbox.",
  brand `#2f7dff`, accent `#FFDD00`, bg `#0a0a0f`. (No purple.)
- `docs/SHIPPING-LOG.md` top release `## v0.8.0` lists: full invoices + payments module;
  finishes & products (selections) module; two-tap change orders; meeting transcription.
- `screenshots/` has `calendar.png`, `change-order.png`, `finance.png`. No invoice-detail shot.
- Ask: "make a 45s what's-new promo for 0.8."

### Output — `docs/promo/voiceover.md` (excerpt)

```markdown
# MyFieldTime — promo VO · v0.8.0 · target 45s · spine: "one timeline for the whole job"

## Hook (0–7s)
Still running your jobs out of a group text, a shoebox of receipts, and a memory that's already full?
[flat, knowing — the viewer's Tuesday]

## Reveal (7–14s)
MyFieldTime puts the whole job on one timeline — your schedule, your money, and every decision in one place.
[warm, confident; wordmark lands on "one timeline"]

## Proof — Schedule (14–20s)
See every crew, every inspection, and every milestone on a calendar your homeowner can actually follow.
[brisk]

## Proof — Money (20–28s)
New in this release: send a real invoice, take a payment on the spot, and watch the budget update itself.
[land on "take a payment"]

## Proof — Decisions (28–35s)
Approve a change order in two taps. Log every selection and finish with a photo, so nobody argues later.
[clip the pace, two beats]

## Payoff (35–40s)
Less chasing. Less guessing. Less living in your inbox. Just run your jobs.
[settle, full breath before the tag]

## CTA (40–42s)
Start free today at myfieldtime.com.
[single, clean]
```

Running `estimate-timing.mjs voiceover.md --wps 2.6 --target 45` returns **110 spoken words,
42.3s total** across 7 beats — inside 45 with ~2.7s of headroom for breaths and the end-card hold. ✓
(The estimator excludes headings and `[bracketed]` directions from the count, so write directions freely.)

### Output — `docs/promo/shotlist.md` (excerpt)

```markdown
| # | Time | Shot | VO line | On-screen text | Source / prompt |
|---|------|------|---------|----------------|-----------------|
| 1 | 0:00–0:07 | Phone on a dusty truck dash, group-text chaos scrolling | "Still running your jobs out of a group text…" | — | gen: cinematic close-up of a contractor's phone on a worn truck dashboard, jobsite morning light, cluttered group chat on screen, shallow depth of field, brand accent #FFDD00 hard-hat in soft background, #0a0a0f dusk tones |
| 2 | 0:07–0:14 | UI hero: timeline assembles, wordmark resolves | "…on one timeline." | MyFieldTime · "one timeline" | screenshots/calendar.png (push-in) + wordmark from docs/brand/logos |
| 3 | 0:14–0:20 | Calendar module, crews + inspections | "See every crew, every inspection…" | — | screenshots/calendar.png |
| 4 | 0:20–0:28 | Finance module; invoice + payment chip animates | "send a real invoice, take a payment…" | New: Invoices & Payments | screenshots/finance.png |
| 5 | 0:28–0:35 | Change order approve tap; selections grid | "Approve a change order in two taps…" | Two-tap approval | screenshots/change-order.png |
| 6 | 0:35–0:40 | Calm wide: finished kitchen, phone shows green budget | "…Just run your jobs." | — | gen: warm finished kitchen at golden hour, contractor relaxed, phone foreground showing a tidy green budget bar in #2f7dff, #0a0a0f shadows, photoreal |
| 7 | 0:40–0:42 | End card | "Start free today at myfieldtime.com." | Wordmark · tagline · myfieldtime.com | logo + brand accent #FFDD00 CTA on #0a0a0f |
```

### Output — `docs/promo/storyboard.md` (excerpt)

> **Spine:** *One timeline for the whole job.* Everything supports that single idea.
> **Energy curve:** low-grit hook → lift on reveal → steady build across the three proof beats,
> peak on Money (the headline of 0.8) → exhale on payoff → clean button on CTA.
> **Real vs generated:** shots 3/4/5 are real app screenshots (most honest); shots 1/6 are
> generated b-roll; shot 2 composites a real screenshot with the brand wordmark; shot 7 is the
> brand end card. **Gap:** an invoice-detail screenshot would make shot 4 stronger —
> run `/ship-screenshots` for the Finance module.

Note how every line above is traceable to a shipped 0.8.0 item, uses concrete nouns, prefers
real screenshots, honors the brand colors, names no banned filler, and flags its own gap.
