---
name: ship-demo
description: >-
  Generates realistic, obviously-fake demo/seed data plus a guided live-demo script for any
  project. Discovers the data model (Drizzle, Prisma, raw SQL/Supabase, TypeORM, Sequelize,
  Mongoose, or TS types), writes an idempotent seed script that builds a few complete, wired-up
  "hero" records, and writes docs/demo/script.md — a step-by-step walkthrough that hits the best
  features in a sensible order with what-to-say and what-to-show — then renders it to a themed
  presenter page. Use when the user wants demo data, seed data, sample/test/fixture data, a demo
  environment, a sales or investor demo, a demo script, a walkthrough, a guided product tour, a
  "fill the app with data" task, or to prep a live demo. Triggers on "seed the database", "demo
  data", "demo script", "walkthrough", "prep for a demo", "sample data", "populate the app".
---

# Ship Demo

Make a project **demo-ready**: a seed that fills it with realistic, obviously-fake data, plus a
script that walks someone through the product so it lands. Two deliverables that depend on each
other — the script clicks through the records the seed creates, so a demo looks the same every
run and never lands on an empty screen.

The point is **a told story, not a feature dump**. A handful of complete, wired-together records
(a real-looking project with its tasks, files, money, and people) beats ten thousand random rows.

## Part of the ship pack

```
ship-demo            → seed data + live-demo script        ← you are here
user-guide-builder   → the written guide the demo mirrors
shipping-log         → "what's new" the demo can show off
screenshot-capture   → can shoot the seeded screens for docs
logo-pack            → the brand the script + page are themed with
        all themed by docs/brand.json · versioned by docs/VERSION
```

Outputs go under the project's `docs/`. After seeding, offer to run `screenshot-capture` against
the freshly-seeded app (the demo data makes for great doc screenshots), and `user-guide-builder`
so the guide and the demo describe the same flows.

## Workflow

1. **Discover first — never seed blind.** From the repo root, run the bundled scanner:
   ```bash
   node <skill-dir>/scripts/discover-model.mjs --json
   ```
   It reports: the ORM/data layer, schema files, model/table names, **any existing seed script**,
   prior demo docs (`docs/demo/script.md`, `docs/DEMO-LOGINS.md`), `docs/brand.json`,
   `docs/VERSION`, the package manager, and detected `db:*` scripts. Read it before doing anything.
   - If it finds an **existing seed**, extend/match it — do not create a parallel one.
   - If it finds **prior demo docs**, update them in place; preserve the established logins/story.
   - If the layer is **unknown**, ask where the model lives and how the app persists data. Do not
     guess — a wrong seed against a real DB is worse than none.

2. **Read the real schema.** Discovery gives names; open the actual schema files it listed for
   columns, required fields, enums, and foreign keys. Pick the adapter and the idempotency
   strategy from [references/seed-adapters.md](references/seed-adapters.md) (Drizzle / Prisma /
   SQL+Supabase / TypeORM / Sequelize / Mongoose / API-only / unknown).

3. **Design the dataset (depth over breadth).** Plan a *story*, not a row dump:
   - **2–3 hero records** fully populated end to end (the ones the demo clicks through).
   - **1 empty/new record** to demo the create-flow and empty states live.
   - **1 edge record** in a tricky state (overdue, rejected, partially paid) to show the product
     handling reality.
   - Enough breadth behind them (a populated list, users with distinct roles) that lists and
     dashboards aren't barren. Wire records together so navigation and links work.

4. **Write the seed — idempotent and namespaced.** Use the deterministic, dependency-free
   `scripts/fake.mjs` for all values (stable ids, `@example.test` emails, `(555)` phones — so
   data is reproducible AND obviously fake). The seed MUST:
   - **Upsert by a stable natural key** (never blind insert) so re-running changes nothing.
   - **Scope to a demo namespace** (a demo company/tenant, an `is_demo` flag, or the
     `@example.test` domain) and only ever touch that namespace.
   - **Reuse the project's own db client/config**, run in dependency order, ideally in one
     transaction. Add a `--reset` path that clears only the demo namespace.
   - Add a runnable entry point (e.g. a `seed:demo` package script) and capture logins in
     `docs/DEMO-LOGINS.md` (demo password or env var — never a real credential).

5. **Run it (twice).** Execute the seed, then run it again. **Row counts must match** — that
   proves idempotency. Fix any duplication before moving on. If you can't reach the DB, say so
   and hand the user the exact command.

6. **Write the demo script.** Following [references/script-template.md](references/script-template.md)
   (sequencing, voice, the exact markdown contract), write `docs/demo/script.md`: a hook →
   core loop → wow moment → live-create → value-close walkthrough, each step mapped to a real
   seeded record, with **Go to / Say / Show / Reset** lines and an operator's appendix (accounts,
   reset command, failure recovery, timing).

7. **Render the presenter page.**
   ```bash
   node <skill-dir>/scripts/render-demo.mjs   # docs/demo/script.md → docs/demo/script.html
   ```
   Self-contained, keyboard-navigable, themed from `docs/brand.json` (default slate-blue, never
   purple; no backdrop-filter / no feTurbulence). Print-to-PDF gives a handout.

8. **Report honestly.** List what was seeded (counts per entity), the logins, the reset command,
   and the two output paths. Flag anything you stubbed, any field you guessed, and any feature in
   the script that is staged rather than shipped.

## Quality bar

- **Obviously fake, zero real PII.** Every value comes from the fictional pools in `fake.mjs`
  (`@example.test`, `555` numbers, fictional streets). Never scrape, copy, or invent a real
  person's name, email, address, or a real customer's data into the seed. If the repo already
  has demo data, reuse its conventions — don't introduce a second, conflicting fake-identity set.
- **Idempotent or it's broken.** Run-twice ⇒ identical state. A seed that duplicates on re-run
  fails this bar.
- **A story, not noise.** Records connect; the dataset reads like one real account using the
  product, with deliberate happy-path AND edge cases — not lorem-ipsum sprinkled across tables.
- **Script is presenter-ready.** Someone who has never seen the product can read it aloud and
  give the demo. Every step points at a record the seed actually created.
- **Honest.** Staged/coming-soon features are labeled as such in the script. The report names
  what was guessed or stubbed. No claim that un-run seeds or un-shipped features work.
- **Evidence-based.** The dataset and script come from the *real* schema and *real* features you
  read — not a generic template. If you couldn't verify the persistence layer, you stopped and
  asked rather than shipping a plausible-but-wrong seed.

## Cross-project notes

Nothing here is hardcoded to one app. `discover-model.mjs` and `fake.mjs` are generic;
`seed-adapters.md` covers the common ORMs and a fallback for unknown layers. External tools are
referenced via adapters (the project's own db client, its db scripts, or its API/MCP) and never
assumed installed — if a layer can't be reached, the skill asks instead of fabricating.

## Bundled contents

- `scripts/discover-model.mjs` — bounded, read-only scanner: ORM, schema files, models, existing
  seed/demo work, brand/version, db scripts. Run it first, JSON or human output.
- `scripts/fake.mjs` — deterministic, dependency-free fake-data helpers (stable ids, fictional
  people/companies/addresses, money in cents, date offsets). Import it into the seed; it has a
  `node fake.mjs <seed>` self-test.
- `scripts/render-demo.mjs` — renders `docs/demo/script.md` → a themed, self-contained,
  keyboard-navigable presenter HTML page.
- `references/seed-adapters.md` — per-ORM read + idempotent-upsert playbook and the
  depth-over-breadth dataset guidance.
- `references/script-template.md` — demo-script sequencing, voice, the markdown contract
  `render-demo.mjs` consumes, and a full worked input→output example.
