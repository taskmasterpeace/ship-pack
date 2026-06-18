# Shipping Log — Style Guide

A portable house style for turning raw git history into a public-facing changelog that reads like a
product update: benefit-first, jargon-free, and framed to signal momentum. Copy this file into any
repo (`docs/CHANGELOG-STYLE.md`), hand it to a teammate, or paste it into any AI tool — it stands
alone.

> The engineering log says *what was coded*. The shipping log says *what you can now do*.

---

## The voice

- **Benefit-first.** Open every bullet with the outcome for the user, then (optionally) the
  mechanism. "Pull your full case context in one API call" — not "Added GET /context".
- **Plain language.** A non-engineer understands every line. No table names, flags, framework
  internals, or ticket numbers.
- **Confident, not hypey.** Concrete verbs and numbers beat adjectives. Avoid "revolutionary",
  "seamless", "leverage". Prefer "now", "automatically", "in one call", "instantly".
- **Sentence case. Two weights.** No Title Case, no ALL CAPS, no exclamation spam.
- **Tight.** One screenful per release: a headline + 2–4 bullets + section tags. Merge many small
  commits into a few user-meaningful bullets.

## Sort each change into one of four sections (omit empty ones)

| Section | What goes here | Commit signals |
|---|---|---|
| 🆕 **New** | Capabilities the user didn't have before | `feat:`, "add", "introduce", new pages/routes/UI |
| ✨ **Improved** | Existing things made better/faster/clearer | `perf:`, `polish:`, "improve", "redesign", "speed up" |
| 🐛 **Fixed** | Bugs a user could actually hit | `fix:`, "resolve", "correct", "no longer" |
| 🔒 **Security** | Access control, data isolation, dependency/CVE fixes | "RLS", "auth", "isolate", "permission", security bumps |

## Omit (or compress to one "Behind the scenes" line)

Invisible to users — never headline these:
- Refactors, renames, type-safety/lint/format cleanup.
- Internal migrations, schema/tracking repair, regenerated types — *unless* they unlock a
  user-visible behavior (then describe the behavior, not the migration).
- Tests, CI, build config, dependency bumps without user impact.
- Docs, comments, scaffolding, dead-code removal.

Rule of thumb: if the only honest user-facing sentence is "the code is cleaner now," omit it.

## Momentum strip (the investor hook)

Lead the page with a one-line stats strip computed from history:
- **Updates this week** = commit (or merged-PR) count in the window.
- **Releases / active days** = distinct active days, tags, or merges.
- **Last shipped** = most recent date ("Today" / "Yesterday" when recent).
- A "built in public · shipping weekly · vX.Y" line reinforces cadence.

Keep cadence claims truthful — if the window shows 3 active days, don't claim "daily."

## Ship-status honesty

If work is committed-but-unpushed or built-but-not-deployed, label the entry **"rolling out"** or
**"staged — coming soon."** Never imply staged work is live. When unsure, check
`git rev-list --count @{u}..HEAD` (unpushed) or your deploy status.

## Output format (markdown, newest first)

```markdown
# 📣 {Product} — What's New

**Shipping fast:** {N} updates over {M} active days · {one-line theme} · built in public · v{X.Y}

---

## {Month D, YYYY} — *{optional one-line theme}*   ·  *rolling out*  ← only if not yet live

### 🆕 New
- {benefit-first bullet}.

### ✨ Improved
- {benefit-first bullet}.

### 🐛 Fixed
- {benefit-first bullet}.

### 🔒 Security
- {benefit-first bullet}.

---
```

One `##` block per day or release. Skip empty sections. Add an italic theme line under big releases.

## Worked example (5 commits → 1 user bullet)

Raw:
- `feat: external briefing REST API with personal API keys`
- `feat: api_keys table for external briefing API access`
- `feat: API key management UI and routes`
- `refactor: extract bearer token helper`
- `test: api-key-service unit tests`

Becomes:
```markdown
### 🆕 New
- Connect your own tools and agents. Create a personal API key in Profile → API Keys and let
  outside scripts read and update your briefings.
```
The refactor and tests are dropped; the table + routes + UI collapse into the one capability gained.

---

## Drop-in prompt (for any AI tool)

> You are writing a public "shipping log" / changelog. Here is recent git history:
> `<paste: git log --since="5 days ago" --pretty=format:"%ad %s%n%b" --date=short>`
> Rewrite it in this house style: benefit-first bullets (lead with what the user can now do, not the
> implementation), plain language (no internal jargon), sentence case, grouped by day newest-first,
> sorted into 🆕 New / ✨ Improved / 🐛 Fixed / 🔒 Security (omit empty). Merge small commits into a
> few meaningful bullets; omit refactors/tests/migrations unless they unlock user-visible behavior.
> Start with a one-line momentum strip (updates this week, active days, last shipped). Mark any
> unpushed/undeployed work "rolling out." Keep each release to one screenful.
