# Discovery Checklist

Before writing a word of the guide, inspect the project to understand **what a user can
do**. Stay out of code internals — you're mapping product surface, not architecture.

## Where to look (in priority order)

1. **Routes / pages / screens** — the clearest map of what exists. For web apps: the
   router or `app/`, `pages/`, `src/routes`. For mobile: screens/navigators. For CLIs:
   the command table.
2. **Navigation** — sidebars, menus, tab bars. These name the features in the product's
   own words.
3. **Forms, dashboards, settings, admin pages** — what users create, configure, manage.
4. **Auth & roles** — sign-up/login flows, role/permission logic, who-sees-what gating.
5. **Seed data / fixtures / demo accounts** — reveal intended real-world usage.
6. **Existing help text, READMEs, marketing/landing copy** — the product's own framing
   and value proposition (but verify claims against the actual app).
7. **API route names** — only when they reveal a user-facing capability.
8. **Tests** — often encode real workflows step by step.
9. **Env examples** — reveal integrations (email, payments, AI, SMS, storage).

## Product Understanding Checklist

Answer before drafting. If you can't confirm an answer, mark it inferred.

**Identity**
- What is it called? What problem does it solve? Who is it for?
- What's the core value / the user's "job to be done"?

**User types** — which of these exist?
- Guest/visitor · registered user · power user · admin · super admin · manager ·
  client/customer · internal operator. Note where the boundary is inferred.

**Main workflows** — which apply?
- Sign up/login · create · upload · search/filter · review results · edit/update ·
  generate AI output · approve/reject · export/download/share · manage settings ·
  manage users · admin review · reporting/analytics.

**Per feature**
- Name · what it does · who uses it · when · steps · example · expected result ·
  limitations · admin implications.

**Edge cases to look for**
- Empty states · errors · required fields · permission limits · disabled buttons ·
  loading states · missing data · failed uploads · AI-output uncertainty ·
  payment/subscription gating · role-based access restrictions.

## Tier / plan gating (SaaS)

If the product gates features by plan or role, capture the matrix — which plan or role
unlocks which module. This belongs in **Roles & Permissions** and each feature's
**Status**. A feature that exists but is plan-locked is "Available (Plan X+)", not
"Unclear".

## Output of discovery

A short internal map you can write the guide from:
- The product in one sentence.
- The role list (confirmed vs inferred).
- The feature list with a maturity guess each (Available / Partial / Planned / Unclear).
- The 3–6 main workflows worth a full write-up.
- The honest gaps (for section 13).
