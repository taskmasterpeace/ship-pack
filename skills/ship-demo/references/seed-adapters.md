# Seed adapters — discover the model, then write an idempotent seed

`scripts/discover-model.mjs` classifies the project's data layer and lists models. This file
is the per-layer playbook: how to read the schema, how to make the seed **idempotent**, and a
copy-paste skeleton. Always read the *real* schema before seeding — discovery gives you names,
the schema gives you columns, required fields, enums, and foreign keys.

## The golden rule: idempotent, not destructive

A demo seed is run repeatedly (before every demo, after every reset). It must:

- **Upsert by a stable natural key** (slug, email, or a deterministic id from `fake.mjs`'s
  `slugId()`), never blind `insert` that duplicates on the second run.
- **Be safe to re-run** — second run = no new rows, same data. Test this: run it twice, row
  counts must match.
- **Never touch non-demo rows.** Scope everything to a clearly marked demo namespace (a demo
  company/org/tenant, an `is_demo` flag, or an email domain like `@example.test`). A `--reset`
  path deletes ONLY that namespace.
- **Order by dependencies.** Parents before children (company → project → tasks). Resolve FKs
  from the rows you just upserted, not hard-coded ids.

## Adapter: Drizzle ORM (Postgres/SQLite/MySQL)

Read `src/db/schema/*.ts` for `pgTable("name", { ... })`. Note `.notNull()`, `.references()`,
enums (`pgEnum`), and `.default()`. Reuse the project's own db client (e.g.
`src/db/index.ts`) so pooler/SSL config is correct — do not open a second connection.

```js
import { db } from "../src/db/index.js";          // the PROJECT's client
import * as schema from "../src/db/schema/index.js";
import { rng, person, slugId } from "<skill>/scripts/fake.mjs";

// upsert by natural key — idempotent
await db.insert(schema.companies)
  .values({ id: slugId("demo-co"), name: "Northwind Builders (Demo)", isDemo: true })
  .onConflictDoUpdate({ target: schema.companies.id, set: { name: "Northwind Builders (Demo)" } });
```

If there is no unique/PK to conflict on, add one or `delete` the demo namespace first inside a
transaction, then insert. Wrap the whole seed in `db.transaction(...)` so a failure rolls back.

## Adapter: Prisma

Read `schema.prisma` for `model` blocks, `@id`, `@unique`, `@relation`, enums. Use `upsert`:

```js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
await prisma.company.upsert({
  where: { slug: "northwind-demo" },
  update: { name: "Northwind Builders (Demo)" },
  create: { slug: "northwind-demo", name: "Northwind Builders (Demo)", isDemo: true },
});
```

`upsert` by a `@unique` field is inherently idempotent. Nest `create` for relations, or upsert
children with the parent id from the row you just made.

## Adapter: raw SQL / Supabase

Read `migrations/*.sql` or `supabase/migrations/*` for `CREATE TABLE`. Write the seed as SQL
using `INSERT ... ON CONFLICT (key) DO UPDATE` (Postgres) or `INSERT OR REPLACE` (SQLite), and
run it through the project's existing runner. For Supabase, prefer the `supabase` MCP
`apply_migration` / `execute_sql` if available, or `psql`/the project's db script — do not
invent a connection string.

```sql
insert into companies (id, name, is_demo) values ('demo-co','Northwind Builders (Demo)', true)
on conflict (id) do update set name = excluded.name;
```

## Adapter: TypeORM / Sequelize / Mongoose

- **TypeORM**: entities are classes with `@Entity()`; use `repository.upsert(rows, ["key"])`.
- **Sequelize**: `Model.upsert(values)` (needs a unique key).
- **Mongoose**: `Model.updateOne({ key }, doc, { upsert: true })` — Mongo upsert by query.

## Adapter: API-only / no direct DB access

If the app has no reachable DB layer but has an authenticated API (the common pattern for
`/api/project/[id]/*` routes), seed **through the API** with the project's own demo/login
route to get a session, then POST the demo entities. Slower but respects all validation and
permissions, and proves the API works. Use the project's documented demo credentials, never
real accounts.

## Adapter: unknown / nothing detected

Do not guess. Ask the user: where does the data model live, and how does the app persist data
(ORM, SQL, an API)? Offer to seed through the UI/API as a fallback. A wrong seed against a real
database is worse than no seed.

## Choosing what to seed (depth over breadth)

A good demo dataset is **a few complete, realistic stories**, not thousands of random rows:

- **2–3 hero records** fully populated end to end (e.g. one project with tasks, files,
  messages, an invoice, a status that shows progress) — this is what you actually click through.
- **1 "empty/new" record** so you can demo the create-flow and empty states live.
- **1 "edge" record** that exercises a tricky state (overdue, rejected, partially paid) so the
  demo can show the product handling reality, not just the happy path.
- Enough **breadth** behind them (a populated list, a few users with distinct roles) that lists
  and dashboards don't look barren — but every row should be plausible.

Wire records together so navigation works (a task links to a real user; an invoice links to a
real project). Disconnected rows make a demo feel hollow.
