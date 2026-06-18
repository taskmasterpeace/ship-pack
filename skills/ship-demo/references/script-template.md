# Demo script — structure, voice, and the markdown contract

The demo script is a **teleprompter for a live walkthrough**: a presenter (founder, AE, PM)
should be able to read it top-to-bottom and give a confident demo without rehearsing. It also
renders to a presenter HTML page via `scripts/render-demo.mjs`, so it must follow the contract
below exactly.

## Sequencing principle: open strong, build a story, end on value

Order steps to tell ONE story with the demo data, not a feature tour:

1. **Hook (15s)** — log in to a pre-seeded account; land on the most impressive populated screen
   (a dashboard with real-looking activity). Goal: "this is a live, used product," not "empty app."
2. **The core loop** — the 2–4 features that ARE the product, in the order a real user hits them.
   Each step does one thing and shows one payoff.
3. **A wow moment** — the single most differentiated feature (AI, automation, a slick view). Put
   it ~⅔ through, after they trust the basics.
4. **Create something live** — use the seeded "empty/new" record to add a real item on stage. Live
   creation beats any pre-baked screen for proving it works.
5. **Close on outcome** — land back on a screen that shows the value (saved time, money tracked,
   risk caught). End with the one sentence you want them to repeat.

Map every step to a **real seeded record** so nothing is empty and links work. Note the **role**
to log in as for each step if the product is multi-role.

## Voice for the "Say" lines

- Speak to the **viewer's problem**, not the feature. "Here's where you'd catch a change order
  before it blows the budget" beats "this is the change-orders table."
- One idea per line, conversational, no internal jargon. It's a script to read aloud.
- Quantify with the demo data ("this job is $48,000, 60% billed") — concrete numbers land.
- Be honest: if something is staged/coming-soon, say "here's where this is going," never imply
  it's shipped.

## The markdown contract (render-demo.mjs depends on this)

```markdown
# <Demo title>            ← single H1, becomes the page title

<1–2 intro sentences: who this demo is for, how long, what they'll walk away believing.>
<Optional: login + reset line, e.g. "Logins in docs/DEMO-LOGINS.md · reset with `npm run seed:demo`".>

## 1. <Step title> — ~<seconds>          ← every "## N." starts a step card
**Go to:** <exact place: URL, screen name, or click path>
**Say:** <the line to say aloud — one or two sentences>
**Show:** <what to point at / what they should notice on screen>
**Reset:** <only if the step changes state — how to undo it for the next run>

## 2. <next step> — ~<seconds>
...
```

Recognized bold labels (case-insensitive): **Go to** (or **Do**), **Say**, **Show**, **Reset**,
**Watch out**, **If it breaks**, **Note**. Anything else under a step renders as plain body text,
so extra prose is safe. A heading without these labels still renders as a step.

## End the script with an operator's appendix

After the steps, include:

- **Accounts** — the seeded logins per role (point to `docs/DEMO-LOGINS.md`; never paste real
  passwords — use the demo password or an env var).
- **Reset** — the one command to restore the demo to a clean state (`npm run seed:demo`).
- **Failure recovery** — what to do if a step won't load (skip to step N, talk track to cover).
- **Timing** — total runtime and which steps to cut for a 5-minute version.

---

## Worked example (input → output)

**Input** — discovery found a Drizzle contractor-SaaS model
(`companies → projects → tasks, change_orders, invoices, messages`), seeded as: company
"Northwind Builders (Demo)", project "Smith Kitchen Remodel" (fully populated, $48k, 60% billed,
one overdue invoice, one pending change order), project "Garage Conversion (new)" (empty), logins
in `docs/DEMO-LOGINS.md`.

**Output** — `docs/demo/script.md`:

```markdown
# MyFieldTime — 7-Minute Walkthrough

For a contractor evaluating MyFieldTime. In 7 minutes they'll see a real job run end to end —
schedule, change orders, and money — and believe their crew could run on this Monday.
Logins: docs/DEMO-LOGINS.md (password `DemoPass2026!`). Reset anytime: `npm run seed:demo`.

## 1. Land on a working job — ~30s
**Go to:** Log in as `pm@example.test` → you land on the Smith Kitchen Remodel dashboard.
**Say:** This isn't an empty app — this is a real kitchen remodel, day 18 of 40, $48,000 contract, already 60% billed.
**Show:** The progress bar, the live activity feed, and the "1 invoice overdue" alert in the corner.

## 2. The schedule everyone shares — ~45s
**Go to:** Calendar tab.
**Say:** The crew, the homeowner, and the office all see the same schedule — no more "wait, that was today?"
**Show:** Drag the "Cabinet install" block to Thursday; the homeowner gets notified automatically.
**Reset:** Drag it back to Wednesday (or re-run the seed).

## 3. Catch a change order before it costs you — ~60s
**Go to:** Change Orders → the pending "Upgrade to quartz countertops" item.
**Say:** Here's where margin leaks stop. The homeowner asked for quartz — that's a $2,400 change, logged, priced, and waiting for one tap to approve.
**Show:** The approve button; approving rolls it straight into the invoice total.

## 4. The money, finally clear — ~60s
**Go to:** Finance tab.
**Say:** Every contractor's nightmare is "what am I actually owed?" Here it is — $28,800 billed, $19,200 to go, and that one overdue invoice flagged in red.
**Show:** The overdue invoice; click "Send reminder."

## 5. Start a new job live — ~45s
**Go to:** Projects → New → pick the "Garage Conversion" lead.
**Say:** Spinning up a new job takes ten seconds — watch.
**Show:** Fill the name + address, hit create; the empty workspace appears, ready for the crew.
**Reset:** Delete the project you just made, or re-run the seed.

## 6. Close — ~20s
**Go to:** Back to the Smith Kitchen dashboard.
**Say:** One place for the schedule, the changes, and the money — that's a weekend of paperwork your crew gets back.

## Appendix
- **Accounts:** pm@ / contractor@ / homeowner@example.test — see docs/DEMO-LOGINS.md.
- **Reset:** `npm run seed:demo` (idempotent; safe to run mid-demo).
- **If it breaks:** Finance slow to load? Skip to step 5 and come back. Talk track: "while that loads…"
- **Timing:** ~4:20 full; for a 5-min cut, drop step 2.
```

Then `node <skill>/scripts/render-demo.mjs` turns that into `docs/demo/script.html` — a themed,
keyboard-navigable presenter page.
