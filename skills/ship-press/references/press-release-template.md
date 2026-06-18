# Press release template + voice

A launch press release is **public, attributable, and quotable**. Every sentence may be copy-pasted
into an article. That sets the bar: zero fabrication, plain English, benefit-first. This file is the
exact structure and the voice rules. Follow it; do not improvise the shape.

## Structure (write `docs/press/release.md` in this order)

```
# {Product} {launches | ships v{X.Y.Z} | introduces {headline feature}}

**{City, optional} — {Month D, YYYY}** — {One-sentence lede: who, what's new, why it matters to
the reader.} {Second sentence: the concrete capability, named, no hype.}

{Paragraph 2 — the problem.} The status quo this release improves on, in the user's words.
Grounded in what the release actually changed. No invented market-size or "industry-leading" claims.

{Paragraph 3 — what shipped.} The 2–4 headline capabilities from the latest release, each in one
plain sentence describing what the user can now do. Trace every one to a shipping-log bullet.

## What's new in this release
- **{Capability}.** {One line — the outcome for the user, not the implementation.}
- **{Capability}.** {…}
- **{Capability}.** {…}

## Quote
> "{A quote you are allowed to write — see the quote rule below.}"
> — {Real name + role}, OR an attributable maker statement, OR omit this section entirely.

## Availability
{Where to get it, on what plans/tiers, at what price — only if you actually know these from the
repo/brand. If pricing is unknown, say "available now" and link, don't invent a number.}

## About {Product}
{2–3 sentences: what the product is and who it's for, from brand.json tagline + repo context.
Factual. No "founded in", no headcount, no funding unless it's in the source material.}

**Media contact:** {name / email / link — or "[ADD CONTACT]" placeholder, never a fake address.}
**Learn more:** {URL or "[ADD URL]"}
```

## The non-negotiable rules

1. **No fabricated quotes.** Do not invent a customer, an analyst, or a testimonial. You may write a
   **maker/founder statement** ONLY as a clearly-attributable first-party line (e.g. *"— The {Product}
   team"* or a real name the user gives you). If you have no real person to attribute, **omit the
   Quote section** rather than fake one. Leave `[ADD CUSTOMER QUOTE]` as an explicit placeholder if a
   quote slot is wanted but no source exists.
2. **No fabricated metrics.** No "10x faster", "saves 5 hours/week", "trusted by thousands", "#1",
   "industry-leading" unless that exact number is in the source material (shipping log, brand, repo).
   If a metric would strengthen the release but you don't have it, leave `[ADD METRIC]` and say so.
3. **Trace every capability to a real bullet.** The "What's new" list maps 1:1 to the latest release's
   shipping-log bullets. If a bullet's user impact is unclear, inspect or omit — never embellish.
4. **Honest ship status.** If work is staged/rolling out, say "available now" only when it truly is.
   Use "rolling out" / "in {plan} tier" when accurate. Check `git status` / deploy state if unsure.
5. **Plain English, present tense, third person.** "MyFieldTime now shows homeowners the budget" —
   not "We're excited to announce a paradigm-shifting solution." Cut every adjective that isn't load-bearing.
   **If `brand.json` declares a voice/tone** (surfaced by `collect-launch.mjs` as `report.voice`), the
   word choice and rhythm should match it — honor its tone/personality and its do/don't/words lists
   instead of defaulting to a generic press tone. Absent a declared voice, use this plain default.
6. **One screen.** A press release is ~300–450 words. If it's longer, you're padding.

## Placeholder convention

When a fact is genuinely unknown, use a bracketed ALL-CAPS placeholder and **list every one at the top
of your report** so the user can fill them: `[ADD CONTACT]`, `[ADD URL]`, `[ADD PRICE]`, `[ADD METRIC]`,
`[ADD CUSTOMER QUOTE]`, `[CONFIRM SHIP STATUS]`. Placeholders are honest; invented facts are not.

Keep the `[ADD …]` / `[CONFIRM …]` shape exactly (square brackets, leading `ADD` or `CONFIRM`,
ALL-CAPS): `render-press.mjs` scans the rendered HTML for that pattern, reports the remaining count,
and refuses to certify a page that still has any — so well-formed placeholders are caught and surfaced
instead of silently shipping. A placeholder written some other way (e.g. `<TODO contact>`) slips past
the scan, so don't invent a different convention.

## Voice quick-reference

| Do | Don't |
|----|-------|
| "Homeowners now see the budget and sign off in one place." | "Revolutionary, game-changing budget experience." |
| "Available now on the Pro plan." | "Trusted by industry leaders worldwide." |
| "— The {Product} team" (first-party) | "— A satisfied customer" (fabricated) |
| Name the feature, state the outcome | Stack three adjectives before a noun |
| Leave `[ADD METRIC]` if unknown | Invent "saves 5 hours a week" |
