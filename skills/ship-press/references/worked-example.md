# Worked example — release → launch kit

A full, concrete pass so you can see the bar. Inputs are real fragments; outputs are what the skill
should produce. Nothing here is invented beyond what the inputs support.

## INPUT 1 — `docs/brand.json` (excerpt)
```json
{ "name": "MyFieldTime",
  "tagline": "Run your jobs. Not your inbox.",
  "colors": { "bg": "#0a0a0f", "brand": "#2f7dff", "accent": "#FFDD00", "text": "#e7edf6" },
  "voice": { "tone": "plain-spoken, practical, no hype",
             "personality": "the steady PM who tells it straight",
             "dont": ["exclamation points", "buzzwords", "we're thrilled to announce"] } }
```

## INPUT 2 — `docs/VERSION`
```
0.8.0
```

## INPUT 3 — latest block of `docs/SHIPPING-LOG.md`
```
## v0.8.0 — 2026-06-17 · Money & decisions
_The homeowner finally sees the money — and signs off without the email chase._
### ✨ New
- **Money & Progress portal for homeowners.** Clients open one page to see how much of the
  budget is spent, what's left, and how far along the job is — no spreadsheet, no phone call.
- **Approve change orders with a real signature.** Homeowners review a change and sign it right
  on the page; the approval is captured with a typed e-signature and a clear status.
- **Punch list is back.** Track the final to-do items on a job in one shared list.
### ⚡ Improved
- **A real demo to walk through.** A complete Smith Residence example project is seeded.
```

`collect-launch.mjs --json` extracts: version `0.8.0`, date `2026-06-17`, title `Money & decisions`,
themed line, 4 bullets across New/Improved, brand name + tagline, the **brand voice** (`report.voice`
= plain-spoken / no hype / no exclamation points), and no `[ADD METRIC]` source numbers. The copy
below is written *in that voice* — flat, practical, zero throat-clearing.

---

## OUTPUT A — `docs/press/release.md`

```markdown
# MyFieldTime ships its Money & Progress portal for homeowners

**June 17, 2026** — MyFieldTime, the field-management app for contractors, now gives
homeowners a single page to see where their project's money and progress stand. The v0.8.0
release adds a Money & Progress portal, on-page change-order approvals with a real signature,
and a shared punch list.

For most remodels, the budget lives in a contractor's spreadsheet and reaches the homeowner as
a forwarded email — or a phone call. MyFieldTime replaces that chase. Homeowners open one page
to see how much of the budget is spent, what's left, and how far along the job is.

This release also moves approvals onto the page: a homeowner reviews a change order and signs it
with a typed e-signature, captured with a clear status. The final to-do items on a job now live
in one shared punch list everyone can see.

## What's new in this release
- **Money & Progress portal.** Homeowners see spend, remaining budget, and job progress in one place — no spreadsheet, no phone call.
- **Change orders signed on the page.** Review and approve a change with a typed e-signature and a clear status.
- **Shared punch list.** Track the final to-do items on a job in one list everyone can see.

## About MyFieldTime
MyFieldTime is field-management software for contractors and the homeowners they work with —
built to run jobs, not inboxes. It is available now.

**Media contact:** [ADD CONTACT]
**Learn more:** [ADD URL]
```

**Why this passes:** every capability maps to a bullet; no metric is invented; the Quote section is
**omitted** (no real person to attribute); `[ADD CONTACT]`/`[ADD URL]` are honest placeholders, reported
to the user. ~210 words — one screen.

---

## OUTPUT B — `docs/press/launch-kit.md` (Product Hunt assets, excerpt)

```markdown
## Tagline (≤60 chars) — pick one
1. Run the job, show the homeowner the money (43)
2. Field management contractors and homeowners share (49)
3. One page for budget, progress, and sign-off (44)

## Description (~260 chars)
The project budget usually lives in the contractor's spreadsheet and reaches the homeowner as a
forwarded email. MyFieldTime gives both sides one page: spend, what's left, progress, and
change-orders signed right there. Run your jobs, not your inbox.

## Maker's first comment
Hi — we're the MyFieldTime team. We kept watching the same thing on remodels: the money lived in
the contractor's spreadsheet, and the homeowner only saw it as a forwarded email or a phone call,
usually late. So this release is about closing that gap. Homeowners now open one Money & Progress
page to see spend, remaining budget, and how far along the job is — and they can approve a change
order with a signature right on the page instead of over email. The shared punch list keeps the
final items in one place. It's early and we're building in the open. I'd love your feedback on the
homeowner view specifically: is it the thing you'd actually send a client? [CONFIRM MAKER NAME]

## Gallery
- Thumbnail 240×240: docs/brand/logos/myfieldtime-icon.png (found)
- Gallery 1270×760: NEEDED — run screenshot-capture for the Money portal + change-order pages.

## Topics: Productivity · SaaS · Construction
```

**Verify the counts (not by eye):** the taglines above are a **numbered list** (`1.` / `2.` / `3.`),
and `check-counts.mjs` parses numbered options as well as `- * +` bullets — so this exact format is
checked, not silently skipped:
```
$ node check-counts.mjs --in docs/press/launch-kit.md
PH count-check  (tagline ≤ 60, description ~260/≤320)

  Taglines (from docs/press/launch-kit.md):
  OK   option 1: 41/60  "Run the job, show the homeowner the money"
  OK   option 2: 49/60  "Field management contractors and homeowners share"
  OK   option 3: 43/60  "One page for budget, progress, and sign-off"

  Description (from docs/press/launch-kit.md):
  OK   description: 250 chars (target ~260, max 320)

check-counts: all hard limits respected.
```

(If any option ran long it would print `OVER  option N: 72/60 …` and exit 1; if the Tagline section
existed but no option lines parsed, it **warns and fails** rather than passing — a too-long tagline
can never slip the 60-char gate through an unrecognized list format. The trailing `(43)` annotations
are stripped before counting.)

**Why this passes:** taglines are **verified ≤60 by `check-counts.mjs`**, not just hand-counted;
description leads with the problem; the maker comment is first-party, in the brand voice, names only
real capabilities, asks a real question, and flags the unknown name instead of inventing one; gallery
is honest about what exists vs. what to capture.

---

## OUTPUT C — launch-day checklist
A dated, checkable list (see `product-hunt-assets.md` §2) adapted to the channels the user actually
has. No assumed Twitter account; placeholders where a channel is unconfirmed.

---

## OUTPUT D — `docs/press/release.html`
`node render-press.mjs --in docs/press/release.md --out docs/press/release.html` →
a self-contained page themed `--brand:#2f7dff` / `--accent:#FFDD00` from brand.json (blue, **never
purple**), masthead with the version badge, print-friendly. No backdrop-filter, no feTurbulence.

Because `release.md` above still has two honest placeholders, the renderer **flags them and does not
certify the page as final**:
```
render-press: wrote docs/press/release.html  (v0.8.0, themed from docs/brand.json)
render-press: HTML still contains 2 placeholder(s) — fill before distribution:
  - [ADD CONTACT]
  - [ADD URL]
render-press: refusing to certify as final (exit 3). Fill the placeholders and re-render,
              or pass --allow-placeholders to render a labelled DRAFT.
```
The page carries a visible "Draft — 2 placeholders" banner until `[ADD CONTACT]` and `[ADD URL]` are
filled and it re-renders clean (`0 placeholders`, exit 0). Step 6's report quotes that exact count.
