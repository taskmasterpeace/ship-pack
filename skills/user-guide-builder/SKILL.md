---
name: user-guide-builder
description: Creates or updates a complete, versioned user and admin guide for any project, written for non-developers. Stamps the guide with the shared docs/VERSION anchor and links to the shipping log so "how to use it" stays in sync with "what changed". Use when the user asks for user docs, admin docs, a product manual, feature guide, walkthrough, onboarding or help docs, an SOP, or wants the project explained from an end-user rather than a developer perspective.
---

# User Guide Builder

Produce a clear, practical, **non-developer** guide for the current project — what it
does, who it's for, how to use each feature, and what admins must know — and stamp it
with a real version number so it never silently drifts from the product.

This is **not** a README, an architecture doc, a code explanation, or a changelog.
Completeness beats brevity. A long, honest guide is the goal.

## Part of the docs + release pack

This skill is one of three that share a single version anchor:

```
docs/VERSION            ← single source of truth (semver, e.g. 1.4.0)
   │
   ├─ user-guide-builder → stamps the guide "Current as of v1.4.0"   (this skill)
   ├─ shipping-log       → groups releases "## v1.4.0 — 2026-06-17"
   └─ screenshot-capture → fills the guide's [SCREENSHOT: id] markers with real images
```

When you finish a guide, the version it documents and the shipping log's top entry
must be the **same number**. That is the whole point of the pack: a reader can match
*what changed* to *how it now works* — with screenshots that match the shipped UI.
See [`shipping-log`](../shipping-log/SKILL.md) and [`screenshot-capture`](../screenshot-capture/SKILL.md).

## Quick start

```
1. node scripts/version.mjs get          → read the current version (or `init` it)
2. Decide: does a guide already exist?    → UPDATE it. Otherwise CREATE one.
3. Discover the product (see references/discovery.md)
4. Write/refresh the guide (see references/guide-template.md)
5. Stamp the header + Maintenance Notes with the version and today's date
6. Report what changed; do NOT paste the whole doc into chat
```

## Decide: create or update

**Always prefer updating an existing guide.** Before creating anything, search for:

```
docs/user-guide.md            docs/user-guide/*.md         USER_GUIDE.md
docs/admin-guide.md           docs/manual.md               ADMIN_GUIDE.md
docs/product-guide.md         docs/help.md                 MANUAL.md
```

Also scan `README.md` for user-facing sections.

- **Found one** → enter [Update mode](#update-mode). Keep the file. Preserve accurate
  content. Never create a competing second guide.
- **None** → create `docs/user-guide.md` (or `docs/user-guide/<Project>-User-Guide.md`
  if the project clearly prefers a folder). Create `docs/` if needed.

## Versioning: the shared anchor

The guide is worthless as a reference if a reader can't tell which version of the
product it describes. Tie it to `docs/VERSION`.

| Step | Command / action |
|------|------------------|
| Read current version | `node scripts/version.mjs get` |
| Create anchor if absent | `node scripts/version.mjs init 0.1.0` |
| Get today's date | `node scripts/version.mjs date` |

Then stamp **two** places in the guide:

1. **Header**, directly under the title:
   ```markdown
   **Current as of v1.4.0** · updated 2026-06-17
   > See [what's new](../SHIPPING-LOG.md) for changes since the last version.
   ```
2. **Documentation Maintenance Notes** (last section) — record the version, the date,
   which files/areas you inspected, and the assumptions you made.

Do **not** invent or bump the version yourself. The version is owned by the release
(the `shipping-log` skill bumps it). This skill only **reads and stamps** it. If no
anchor exists yet and the user isn't doing a release, `init` it to `0.1.0` and say so.

## Perspective — who you write for

1. **End users** — completing real tasks. They don't care how the code works. Give
   plain steps, examples, and "what you'll see."
2. **Admins / operators** — managing users, roles, settings, content, billing. They
   need workflows, controls, and risks.
3. **Project owner / product lead** — wants honest feature coverage, gaps, and what's
   unfinished.

Never write like a developer unless a section genuinely requires setup steps.

## Discovery first

Inspect the project enough to understand **what a user can do** — routes, pages,
nav menus, forms, dashboards, settings/admin pages, auth and roles, seed data, and any
existing help text. Don't get lost in code internals.

Full checklist: **[references/discovery.md](references/discovery.md)**.

## Write the guide

Use the standard 14-section structure (Overview → Quick Start → Roles → Navigation →
Concepts → Workflows → Feature Reference → Admin Guide → Examples → Troubleshooting →
FAQ → Glossary → Known Gaps → Maintenance Notes).

Full template with per-section formats: **[references/guide-template.md](references/guide-template.md)**.

### Writing style

Write like a calm product trainer.

**Do:** plain English · strong headings · numbered steps · tables for clarity ·
realistic examples · "what you see / what to do" · short warnings before mistakes ·
checklists for repeated workflows.

**Don't:** developer jargon · framework or code explanations · "simply" / "just" /
vague steps · overpromise features that aren't visible · pretend unfinished work is done.

### Depth — never ship a thin guide

A guide that lists features in one line each is **not done**. Helpful means thorough:

- **Every feature** gets the full Feature Reference block (what it does · where to find it ·
  how, step by step · a concrete example · inputs · outputs · limitations) — never a single
  sentence.
- **Every main workflow** gets numbered steps, a realistic example, a "what you'll see"
  description, common mistakes, and troubleshooting.
- Use **specifics**: real screen and button names, real example data, real numbers — not
  "the relevant page" or "configure as needed."
- If a section is one or two sentences, it isn't finished. Expand it.
- A real user guide is **long**. Length is fine; thinness is the failure. Don't trim for brevity.

### Label feature maturity honestly

Every feature gets a status: **Available** · **Partially available** · **Planned** ·
**Unclear from current files**. See [Evidence & honesty](#evidence--honesty-rules).

## Render to navigable HTML

The markdown guide is the **source**, not the final artifact. Render it to a premium,
navigable, single-file HTML page:

```bash
node scripts/render-guide.mjs \
  --in docs/user-guide/<Guide>.md --out docs/user-guide/<Guide>.html \
  --brand docs/brand.json --version docs/VERSION
```

You get a sticky sidebar table of contents with scroll-spy, a live section filter, and
clean typography — themed entirely from `docs/brand.json` (colors + fonts). No per-project
CSS edits: drop a different `brand.json` and the page re-themes. The renderer is
dependency-free and the output is self-contained.

`brand.json` — one per app, your brand as data:
```json
{ "name": "MyApp", "tagline": "…",
  "colors": { "bg":"#0a0a0f", "brand":"#0056D2", "accent":"#FFDD00", "heading":"#f6f9ff" },
  "fonts":  { "display":"Bricolage Grotesque", "body":"Hanken Grotesk", "mono":"JetBrains Mono" } }
```

This is the first renderer off the markdown source — PDF and an in-app component can hang
off the same `.md` later. Re-render after any guide edit or release.

## Update mode

1. Read the existing guide fully before touching it.
2. Preserve structure and accurate content; reorganize only if it's genuinely poor.
3. Refresh stale sections; add missing features; mark or remove outdated claims.
4. Keep the same file. Never spawn a competing guide. Never duplicate sections.
5. Re-stamp the header and Maintenance Notes with the current version + date.
6. In Maintenance Notes, add a one-line "Changed in this pass" summary.

## Evidence & honesty rules

Never invent features. If the files don't prove something exists, hedge precisely:

- "The project appears to support…"
- "This seems intended for…"
- "This could not be confirmed from the current files."
- "This feature exists in the code, but the user-facing path is unclear."

If `README` claims clash with the actual app, record it in **Known Gaps**.

## Output rules

When done, report:

1. The file created or updated, and the version stamped.
2. Major sections added or changed.
3. Key assumptions you made.
4. Any major product gaps you found.
5. The recommended next documentation pass.

Do **not** dump the whole guide into chat — point to the file.

## Screenshots

Emit placeholders as `[SCREENSHOT: short-id]` (e.g. `[SCREENSHOT: dashboard]`,
`[SCREENSHOT: co-approve]`) wherever a picture helps — roughly one per feature/screen.
Then hand off to the [`screenshot-capture`](../screenshot-capture/SKILL.md) skill: it drives
the running app, captures each screen consistently (fixed viewport, redaction of sensitive
data, optional callouts), and fills the markers with real images in one re-runnable command.
Re-run it each release so the pictures match the shipped UI.

If the app can't run locally, keep the markers and note the guide is file-based only for now.

## Quality bar

The guide isn't done until it answers all of these:

- What is this product, and who uses it?
- What can each user type do?
- How does a new user get their first win?
- What are the main workflows, and what does each feature do?
- How do admins manage it?
- Which examples make the features click?
- What breaks or confuses users?
- What's unfinished, unclear, or risky — and what version is this?

If it can't, keep going.
