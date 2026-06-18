---
name: ship-faq
description: Generates a help center for a project from its user guide — a real-question docs/FAQ.md (grounded in the guide's workflows, troubleshooting, and glossary), a set of canned support reply templates, and a searchable, themeable single-file help page (docs/help.html). Use when the user wants an FAQ, help center, knowledge base, support docs, "frequently asked questions", canned/saved support replies, a self-serve help page, or to turn a user guide into customer-facing help. Triggers on "make an FAQ", "build a help center", "knowledge base", "support replies", "help page", "turn the guide into help docs".
---

# Ship FAQ

Turn a project's user guide into a **help center**: a `docs/FAQ.md` of real user questions with
honest answers, a library of **canned support replies** the team can paste into tickets, and a
**searchable, on-brand `docs/help.html`** rendered from the FAQ.

The guide answers *"how does the whole thing work."* The FAQ answers *"the one thing I'm stuck on
right now"* — short, scannable, search-first. They must agree, so this skill **derives** the FAQ
from the guide instead of inventing questions.

## Part of the "ship" pack

Shares one version anchor (`docs/VERSION`) and one brand file (`docs/brand.json`) with the rest:

```
docs/VERSION  ·  docs/brand.json   ← shared anchors (semver + brand-as-data)
   ├─ ship-guide  (user-guide-builder) → the guide  ← THIS skill's primary source
   ├─ ship-faq    (this skill)         → FAQ.md + support replies + help.html
   ├─ ship-changelog (shipping-log)    → what's-new; new releases seed new FAQ entries
   ├─ ship-screenshots (screenshot-capture) → images the help page can reuse
   └─ ship-logos (logo-pack)           → brand marks; same brand.json
```

A reader should be able to go *changelog → guide → FAQ* and never hit a contradiction. After a
release, re-run this so the FAQ covers anything new. See
[`user-guide-builder`](../user-guide-builder/SKILL.md),
[`shipping-log`](../shipping-log/SKILL.md),
[`screenshot-capture`](../screenshot-capture/SKILL.md).

## Workflow

```
1. DISCOVER what already exists (don't clobber, don't reinvent)
2. EXTRACT raw questions from the guide (scripts/extract-source.mjs)
3. WRITE docs/FAQ.md — real questions, honest answers, grouped by topic
4. WRITE docs/support-replies.md — canned ticket replies keyed to the FAQ
5. RENDER docs/help.html (scripts/render-help.mjs, themed from brand.json)
6. REPORT files, counts, version stamped, and gaps; never paste the whole FAQ into chat
```

### 1. Discover (always first)

Check the ground truth before writing anything:

```bash
node "<skill-dir>/scripts/version.mjs" get        # current docs/VERSION (or init 0.1.0)
node "<skill-dir>/scripts/version.mjs" date        # today, for the stamp
```

Then look for, and **prefer updating**, what's already there:

- `docs/FAQ.md`, `docs/faq.md`, `FAQ.md` → **update mode**: keep good entries, refresh stale
  answers, add new questions. Never spawn a competing FAQ.
- `docs/support-replies.md` → merge, don't overwrite hand-edited tone.
- `docs/help.html` → it's a render artifact; regenerate it.
- `docs/brand.json` → theme source (create per [references/help-page.md](references/help-page.md)
  if missing — **never** invent purple). `docs/VERSION` → the stamp.
- The guide itself (`docs/user-guide/*.md`, `docs/user-guide.md`, `README.md` user sections) → the
  **source of questions**. No guide yet? Say so and offer `/ship-guide` first; you can still draft a
  smaller FAQ from the app + changelog, but flag it as thinner.

### 2. Extract raw material from the guide

Run the miner — it pulls the sections that reliably seed support questions (Troubleshooting,
existing FAQ, Glossary, Known Gaps, and task-shaped Workflow headings → "How do I …?"):

```bash
node "<skill-dir>/scripts/extract-source.mjs" --guide docs/user-guide/<Guide>.md --json
# or, to auto-discover the newest guide under docs/:
node "<skill-dir>/scripts/extract-source.mjs"
```

This JSON is a **scaffold, not the answer**. You still judge which questions are real, merge
duplicates, and write the answers. If the miner returns little, the guide is thin — note it.

### 3. Write `docs/FAQ.md`

Structure it exactly so the renderer can parse it: `# Title` → `## Category` → `### Question` →
answer. Categories are topics a confused user would scan (Getting started, Accounts & roles,
Billing, plus one per major module). Full structure, the answer formula, and category taxonomy:
**[references/faq-template.md](references/faq-template.md)**.

Each answer: lead with the direct fix in one sentence, then numbered steps if needed, then a "if
that didn't work" line. Reference **real screen and button names** from the guide — not "the
relevant page." Where a picture helps, reuse a `[SCREENSHOT: id]` the guide already defines.

### 4. Write `docs/support-replies.md`

Canned replies are the human side of the same answers — what an agent pastes into a ticket. Tone:
warm, specific, no blame, always a next step. Cover the top ~12 recurring tickets plus the
universal ones (greeting, "need more info", bug acknowledgement, feature-request decline, refund/
billing, escalation, closing). Each has a trigger, a fill-in-the-blanks body with `{{placeholders}}`,
and a link back to the matching FAQ anchor. Templates and full set:
**[references/support-replies.md](references/support-replies.md)**.

### 5. Render the help page

```bash
node "<skill-dir>/scripts/render-help.mjs" \
  --in docs/FAQ.md --out docs/help.html \
  --brand docs/brand.json --version docs/VERSION --replies docs/support-replies.md
```

You get a self-contained page: hero search over **every** Q&A (instant, client-side, `/` to
focus), a topic sidebar that filters, collapsible answers, copy-link permalinks, and deep-linking
by hash. Themed entirely from `brand.json` via `:root` variables — drop a different brand file and
it re-themes. Page contract (self-contained, no `backdrop-filter`, no `feTurbulence`, never purple):
**[references/help-page.md](references/help-page.md)**.

### 6. Report

State the files written, question/category counts, the version stamped, which questions are new
this pass, and any **product gaps** the FAQ exposed (questions you couldn't answer honestly from
the guide). Point to the files; don't dump the FAQ into chat.

## Cross-project

Nothing here is tied to one app. The renderer and miner read only `docs/` conventions; categories
come from *this* project's guide, not a fixed list. External generators (image/screenshot tools)
are referenced through the pack's own skills as adapters — never assumed installed. Works in any
repo that has, or will have, a `docs/` folder.

## Quality bar

Not done until:

- **Every question is real** — it traces to a guide workflow, a troubleshooting item, a glossary
  term, or a known gap. No invented features, no "as an AI" filler, no generic SaaS boilerplate.
- **Every answer is actionable and honest** — direct fix first, real screen names, and an honest
  "not yet supported / planned" when that's the truth (cross-check the guide's maturity labels).
- **Depth over thinness** — a one-line FAQ is a failure. Aim for the real recurring questions of
  *this* product (typically 20-40), grouped into scannable topics. Thin output means you didn't
  mine the guide.
- **Replies match answers** — each canned reply points at its FAQ anchor; tone is warm and specific.
- **The page is sound** — opens offline, searches instantly, themes from `brand.json`, isn't
  purple, uses no `backdrop-filter` or `feTurbulence`, and degrades gracefully with no JS.
- **Versioned** — stamped with `docs/VERSION`; re-runnable each release.

If any bullet fails, keep going.

## Worked example

**Input** — a MyFieldTime guide section:

```markdown
### Approving a change order
1. Open the project and click Change Orders in the sidebar.
2. Find the pending order and click Review.
3. Check the line items and the new total, then click Approve.
The homeowner is notified by email and the contract total updates.

## Troubleshooting
- "Approve button is greyed out" — only the homeowner role can approve; contractors can only submit.
```

`extract-source.mjs` surfaces the workflow heading *"Approving a change order"* and the
troubleshooting bullet. **Output** in `docs/FAQ.md`:

```markdown
## Change orders

### How do I approve a change order?
Open the project, click **Change Orders** in the sidebar, find the pending order and click
**Review**. Check the line items and the new total, then click **Approve**. The homeowner is
emailed and the contract total updates automatically.

### Why is the Approve button greyed out?
Only the **homeowner** can approve a change order — contractors can submit and edit, but not
approve. If you're the homeowner and it's still greyed out, the order may already be approved or
withdrawn; refresh the page.
```

And the matching canned reply in `docs/support-replies.md`:

```markdown
### Can't approve a change order  ·  → [#why-is-the-approve-button-greyed-out](docs/help.html#change-orders-why-is-the-approve-button-greyed-out)
Hi {{name}}, thanks for reaching out! The **Approve** button only appears for the homeowner on the
project — contractor accounts can submit and revise change orders but not approve them. If you're
the homeowner and still can't approve, reply here and I'll check the order's status on our side.
```

Then `render-help.mjs` turns the whole `FAQ.md` into a searchable `docs/help.html` — type "approve"
and both answers surface instantly.
