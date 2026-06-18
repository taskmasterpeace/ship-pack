# Shipping Log — Voice & Format Spec

The job: translate an engineering history into a changelog a customer or investor reads and
thinks "these people ship constantly, and every update makes the product better for me."

## The voice

- **Benefit-first.** Open each bullet with the outcome for the user, then (optionally) the
  mechanism. "Pull your full case context over the API in one call" — not "Added GET /context".
- **Plain language.** A non-engineer should understand every line. No table names, flags,
  framework internals, or ticket numbers.
- **Confident, not hypey.** Concrete verbs and numbers beat adjectives. Avoid "revolutionary",
  "seamless", "leverage". Prefer "now", "automatically", "in one call", "instantly".
- **Sentence case. Two weights.** No Title Case, no ALL CAPS, no exclamation-mark spam.
- **Tight.** One screenful per release: a headline + 2–4 bullets + tags. Merge small commits.

## Commit → section mapping

Sort each user-meaningful change into one of four sections (omit empty ones):

| Section | What goes here | Common commit signals |
|---|---|---|
| **New** | Capabilities a user didn't have before | `feat:`, "add", "introduce", new routes/pages/UI |
| **Improved** | Existing things made better/faster/clearer | `perf:`, `polish:`, "improve", "redesign", "speed up" |
| **Fixed** | Bugs users could hit | `fix:`, "resolve", "correct", "no longer" |
| **Security** | Access control, data isolation, dependency/CVE fixes | "RLS", "auth", "vulnerab", "isolate", "permission", `chore(deps)` security bumps |

## What to OMIT (or compress to one "Behind the scenes" line)

These are invisible to users — never give them a headline:
- Refactors, renames, type-safety cleanup (`@ts-nocheck`, generics), lint/format.
- Internal migrations, schema/tracking repair, regenerated types — UNLESS they unlock a
  user-visible behavior (then describe the behavior, not the migration).
- Tests, CI, build config, dependency bumps without user impact.
- Docs/comments, scaffolding, dead-code removal.

Rule of thumb: if the only honest user-facing sentence is "the code is cleaner now", omit it.

## Momentum framing (the investor hook)

Lead the page with a small stats strip computed from the collected history:
- **Updates this week** = `stats.commits` (or merged PRs if using `--github`).
- **Releases** = count of distinct active days, tags, or merge commits in the window.
- **Last shipped** = `stats.last_shipped` (say "Today" / "Yesterday" when recent).
- A "Built in public · shipping weekly · v{X.Y}" line reinforces cadence.

Keep cadence claims truthful — if the window shows 3 active days, don't claim "daily".

## Ship-status honesty

If commits are local/unpushed or a feature is built-but-not-deployed, label the entry
"Rolling out" or "Staged — coming soon". Never imply staged work is live. When unsure, check
`git status` / `git log origin/<branch>..HEAD`, or ask.

## Output format (markdown, newest first)

```markdown
# 📣 {Product} — What's New

## {Month D, YYYY} — {optional release name}   *(rolling out)*   ← only if not yet live

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

- Emoji section headers are optional but read well on landing pages and in-app "What's New".
- One `##` block per day or release. Skip empty sections. Add a one-line italic theme under the
  date for big releases (e.g. *Your folders became living memory for live conversations*).

## Worked example (one engineering day → one entry)

Raw commits for a day:
- `feat: external briefing REST API with personal API keys`
- `feat: api_keys table for external briefing API access`
- `feat: API key management UI and routes`
- `refactor: extract bearer token helper`
- `test: api-key-service unit tests`

Becomes:

```markdown
## June 12, 2026

### 🆕 New
- Connect your own tools and agents to TalkAdvantage. Create a personal API key in
  Profile → API Keys and let outside scripts read and update your briefings.
```

Note: 5 commits → 1 user-facing bullet. The refactor and tests are omitted; the table + routes
+ UI collapse into the single capability the user gained.

## Landing-page output

When asked to put this on a site, use `assets/shipping-log.html`:
- Replace the metric-strip numbers with the computed stats.
- One `<article class="ship-entry">` per release; fill headline, bullets, tags, date badge.
- Each entry has an illustration slot (`.ship-art`) — drop in an SVG/`<img>` per release theme.
  Keep illustrations flat and on-brand; one accent color family per entry.
- If the repo is React/Next, port the markup to a component (keep class names) and feed entries
  from a typed array or an MDX/`CHANGELOG` source so future updates are one edit.
