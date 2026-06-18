# One-Pager & Deck — structure, templates, and the honesty contract

This is the content spec the `ship-pitch` skill writes to. Follow the section order, the
voice, and — above all — the **honesty contract**. The deliverables are a single-screen
investor one-pager (`docs/pitch/one-pager.md`) and a slide-by-slide deck outline
(`docs/pitch/deck-outline.md`). Both draw from the SAME discovered facts.

---

## The honesty contract (non-negotiable)

An investor one-pager lives or dies on whether a number survives diligence. So:

1. **Never fabricate a metric.** No user counts, revenue, MRR, retention, NPS, growth %,
   waitlist size, or "X teams use us" unless it appears in a real source you were given
   (a file, a number the user stated, an analytics export). If you did not read it, it
   does not go in.
2. **Momentum stats are the exception you CAN show** — because they're derived from the
   repo itself: releases shipped, versions cut, active build days, commit cadence, span of
   development, last-shipped date. These come from the shipping log + git via the collector
   script. They prove *you are building*, not that you have traction. Label them as
   "Development momentum," never as "traction" or "growth."
3. **Traction is a labeled placeholder until proven.** Every traction line uses an explicit
   bracket token the renderer styles as a placeholder, e.g.
   `[TRACTION: pilot customers — fill once signed]`, `[METRIC: MRR]`, `[TBD: waitlist]`.
   This makes it impossible to accidentally ship a fake number and trivial for the founder
   to find every blank. Use ONLY the canonical tokens below — the renderer's regex and this
   writer must stay in lockstep, so a single search for `[` surfaces every blank.
4. **Distinguish shipped vs planned.** "What's shipped" = features that exist now (verify
   against the guide / app, not the roadmap). Anything not yet live goes under "On the
   roadmap," clearly future-tense. Never imply staged work is live.
5. **Attribute claims.** If a market-size or competitor claim isn't from a source you were
   handed, frame it as the founder's thesis ("we believe…"), not as fact, and add a
   `[SOURCE: …]` placeholder so it can be cited later.

If an input is missing, say so in the doc as a placeholder — do not paper over it.

### Canonical placeholder tokens (writer ↔ renderer contract)

These are the ONLY bracket tokens to use for unverified content. The renderer
(`scripts/render-one-pager.mjs`) styles each as a visible dashed pill, so the writer and
the regex must agree on this exact set. Form: `[TOKEN: human-readable hint]` (the hint is
optional for `[PLACEHOLDER]` but recommended for the rest).

| Token | Use it for | Example |
|-------|-----------|---------|
| `[TRACTION: …]` | Customers, pilots, logos — any "people use us" claim | `[TRACTION: # of paying or pilot customers]` |
| `[METRIC: …]` | A specific number: MRR/ARR, usage, retention, growth % | `[METRIC: MRR with as-of date]` |
| `[TBD: …]` | A line you intend to fill but can't yet (pipeline, use of funds) | `[TBD: signed LOIs, waitlist, demos booked]` |
| `[ASK: …]` | The raise — round/stage and amount | `[ASK: raising $X for N months runway]` |
| `[SOURCE: …]` | A market-size / competitor / external claim needing a citation | `[SOURCE: residential-remodel software TAM]` |
| `[CONTACT: …]` | Founder contact line | `[CONTACT: name · email]` |
| `[TEAM: …]` | Founder/team bios or credentials | `[TEAM: founder bios]` |
| `[MODEL: …]` | Business model / pricing when not yet real in the guide | `[MODEL: per-seat tiers TBD]` |
| `[PLACEHOLDER]` | Generic catch-all when none of the above fits | `[PLACEHOLDER]` |

Notes:
- `[SCREENSHOT: id]` is a **visual marker** for the deck (filled by `ship-screenshots`),
  NOT a blank — the renderer deliberately leaves it un-styled.
- Any new `[WORD: …]` colon-form token also gets the pill treatment as a safety net, but
  prefer the canonical set so the find-for-`[` audit stays predictable.

---

## One-pager — section order (`docs/pitch/one-pager.md`)

Keep it to roughly one screen / one printed page. Order, with what each is for:

```
# {Product} — Investor One-Pager        ← H1; renderer adds brand tagline + version
1. The problem        — the pain, concrete and specific to a real buyer. 2–3 sentences.
2. The solution       — what the product is and the one core insight. Plain language.
3. What's shipped     — proof the team executes. Pull from the guide; cite momentum stats.
4. Who it's for       — the user/buyer, the "job to be done," the segment. From the guide.
5. Why now / why us   — timing + unfair advantage (honest; thesis-framed if unproven).
6. Traction           — labeled placeholders ONLY, until real numbers exist.
7. The ask            — round/stage + use of funds (placeholder if unknown), contact.
```

### Section writing notes

- **Problem** — lead with the buyer's words, not the tech. Bad: "no unified data layer."
  Good: "A remodeler runs five jobs out of a texting thread and a paper folder; a missed
  change order eats the margin on the whole job." Anchor it to the product's real domain
  (read the guide / brand tagline to learn the domain — never assume).
- **Solution** — one sentence of *what it is*, one of *the insight that makes it work*.
  Then 3–5 capability bullets that map to shipped features.
- **What's shipped** — this is the differentiator of a *builder's* one-pager. Two parts:
  (a) a short feature list pulled from the user guide's section headings (real, not
  aspirational); (b) a **momentum strip** built from the collector's stats —
  e.g. "12 releases · 47 active build days · shipping since 2026-01 · last shipped
  2026-06-17." Use only numbers the collector returned.
- **Who it's for** — name the primary user/role and the buyer if different (from the
  guide's roles section / tier matrix). State the segment and the job-to-be-done.
- **Why now / why us** — timing (a real shift), and the team/product edge. If you can't
  source a claim, frame as thesis and add a `[SOURCE]`/`[TEAM: bios]` placeholder.
- **Traction** — keep the heading; fill with placeholders. Example block below.
- **The ask** — stage, amount (or `[ASK: raising $X for N months runway]`), use of funds,
  and a contact line. If unknown, placeholder — never invent a round.

### Traction placeholder block (copy this shape)

Uses only canonical tokens (see the table above) so the renderer styles every line and a
find-for-`[` catches them all:

```markdown
## Traction

> Metrics below are placeholders until verified. Replace each bracket with a real,
> sourced number before sending.

- **Customers / pilots:** [TRACTION: # of paying or pilot customers]
- **Revenue:** [METRIC: MRR or ARR, with as-of date]
- **Usage:** [METRIC: active accounts / projects / weekly active]
- **Retention or efficiency proof:** [METRIC: e.g. retention %, or a customer outcome]
- **Pipeline:** [TBD: signed LOIs, waitlist, demos booked]

*Development momentum (verifiable from the repo): {momentum strip from the collector}.*
```

---

## Deck outline — slide-by-slide (`docs/pitch/deck-outline.md`)

A *content* outline, not a built deck — one block per slide with the headline, 3–5 talking
points, and a speaker note. The founder (or a deck tool) builds slides from it. Cover, in
order. Match the requested emphasis (the prompt explicitly asks for: problem, solution,
what is shipped / momentum, who it's for, and clearly-labeled traction placeholders).

| # | Slide | Headline does what | Body |
|---|-------|--------------------|------|
| 1 | Title | Name + one-line what-it-is | Tagline (from brand.json), version, contact |
| 2 | Problem | Names the pain in the buyer's words | 3 bullets: who hurts, how, cost of status quo |
| 3 | Solution | The product in one line + the insight | What it is; the core insight; how it feels to use |
| 4 | What's shipped | Proof of execution | Shipped feature bullets + the momentum strip |
| 5 | Momentum | "We ship constantly" | Releases, active days, cadence chart-in-words, last shipped |
| 6 | Who it's for | The user & buyer | Segment, persona, job-to-be-done, where they are today |
| 7 | Why now / why us | Timing + edge | The shift that makes this the moment; unfair advantage |
| 8 | Traction | Honest signal | **Placeholders only** + the verifiable momentum line |
| 9 | Business model | How it makes money | Pricing/tiers if real (from the guide); else `[MODEL]` |
| 10 | The ask | What you want | Round/stage, use of funds, milestones, contact |

For each slide write:

```markdown
### Slide N — {Title}
**Headline:** {the one line that goes big on the slide}
- {talking point}
- {talking point}
- {talking point}
*Speaker note:* {what the founder says out loud; where to insert a real metric later}
*Visual:* {chart/screenshot suggestion — reference a [SCREENSHOT: id] from ship-screenshots if relevant}
```

Slides 8/9/10 carry traction/model/ask placeholders using the same bracket tokens as the
one-pager, so a single find-for-`[` surfaces everything left to fill.

---

## Voice

- **Plain, confident, specific.** Short sentences. No "revolutionary," "seamless,"
  "cutting-edge," "leverage," "synergy," "game-changing." Concrete nouns and verbs.
- **Buyer-first, not feature-first.** Lead with the outcome; name the feature second.
- **Evidence over adjectives.** "Shipped 12 releases in 5 months" beats "moving fast."
- **One idea per line.** An investor skims; reward the skim.

## Worked micro-example (problem section)

Input facts (from discovery): brand tagline "Run your jobs. Not your inbox.";
guide headings include "Change Orders," "Field Logs," "Calendar"; domain = contractor
project management.

Generic, rejected:
> "Construction companies lack a unified platform to streamline operations and leverage
> data for better outcomes."

On-target, accepted:
> "A remodeler runs five active jobs from a group text and a truck full of paper. The
> change order that protects the job's margin gets lost between a voicemail and a photo —
> and the contractor eats the cost. Scheduling, field logs, and client sign-off live in
> four different apps, none of them talking."

The second is specific, sourced from the product's real domain and shipped features, and
makes the solution section land. That is the bar.
