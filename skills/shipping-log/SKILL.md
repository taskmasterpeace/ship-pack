---
name: shipping-log
description: >-
  Generates a public-facing, investor-enticing changelog ("shipping log") from a git or
  GitHub repository's recent history. This skill should be used when the user wants a
  changelog, release notes, a "what's new" feed, or a "shipping log" written for end users
  and investors rather than engineers — grouped by version (or date/release) with New / Improved / Fixed /
  Security sections, benefit-first copy, momentum stats, and an optional landing-page
  component. Triggers on requests like "changelog for the last N days", "shipping log",
  "what's new for the public/investors", "turn my commits into release notes", or "show that
  we're shipping constantly".
---

# Shipping Log

## Purpose

Turn raw git/GitHub history into a polished, public-facing changelog that reads like a product
update — benefit-first, jargon-free, and framed to signal momentum to users and investors.
The engineering log says "what was coded"; the shipping log says "what you can now do."

## Part of the docs + release pack

This skill is one of three that share a single version anchor with
[`user-guide-builder`](../user-guide-builder/SKILL.md) and
[`screenshot-capture`](../screenshot-capture/SKILL.md):

```
docs/VERSION            ← single source of truth (semver, e.g. 1.4.0)
   ├─ shipping-log       → groups releases "## v1.4.0 — 2026-06-17"  (this skill OWNS the bump)
   ├─ user-guide-builder → stamps the guide "Current as of v1.4.0"
   └─ screenshot-capture → captures the app screens (feature art, guide images)
```

A reader can then match *what changed* (this log) to *how it now works* (the guide).
After you cut a release here, offer to run `user-guide-builder` so the guide's stamp matches.

## Versioning anchor

A **release** is one version number over a batch of shipped work. Manage it with the
bundled `scripts/version.mjs` (dependency-free, cross-platform):

| Action | Command |
|---|---|
| Read current version | `node <skill-dir>/scripts/version.mjs get` |
| Create anchor if absent | `node <skill-dir>/scripts/version.mjs init 0.1.0` |
| Cut a release (pick one) | `node <skill-dir>/scripts/version.mjs bump <minor\|patch\|major>` |

- `minor` — new user-facing features (most releases) · `patch` — fixes/polish only ·
  `major` — breaking change or headline launch.
- **Group the log by version**, newest first: `## v{X.Y.Z} — {date}`. Everything since the
  previous `## v…` heading (or git tag) goes under the new version.
- **First-time / backfill:** reconstruct a few version buckets from history so the log opens
  with momentum (pre-GA products stay in `0.x`); `set` the anchor to the newest bucket and
  say in your report that early versions were reconstructed.

## Workflow

1. **Collect history.** From the repo root, run the bundled script:
   ```bash
   node <skill-dir>/scripts/collect-history.mjs --days 5
   ```
   - Use `--since-tag` instead of `--days N` to scope from the latest git tag to HEAD.
   - Add `--github` to also pull merged PR titles + releases via the `gh` CLI (best-effort; skipped if `gh` is unauthenticated).
   - Output is JSON: momentum `stats`, `tags`, and `commits` grouped by day. Read it; do not guess history.

2. **Load the voice guide.** Read `references/voice-and-format.md` for the tone rules, the
   commit→section mapping, the omit list, the exact markdown format, and a worked example.
   Follow it exactly — the value of this skill is the consistent voice.

3. **Translate, don't transcribe.** Group commits by **version** (default — see
   [Versioning anchor](#versioning-anchor)), or by day/release/tag. For each entry write
   a one-line headline + 2–4 benefit bullets + section tags (New / Improved / Fixed /
   Security). Merge many small commits into a few user-meaningful bullets.

4. **Compute momentum stats** from the JSON for the header strip: updates this week, releases,
   last shipped. These are the numbers investors scan first.

5. **Pick the output** based on the request:
   - **Markdown changelog** (default) — write `docs/SHIPPING-LOG.md` (or `CHANGELOG.md`),
     newest first, grouped by version (`## v1.4.0 — 2026-06-17`).
   - **Standalone "What's New" page** — copy `assets/whats-new.html` for a full-page, premium,
     themeable changelog (version-grouped, category filter chips, momentum band, works without
     JS). Set the `:root` brand tokens to the project's real colors — never invent a palette.
   - **Landing-page section** — copy `assets/shipping-log.html`, fill in the entries and the
     illustration slots, and adapt to the project's stack (convert to React/TSX if the repo is
     React; keep the structure and class names).

6. **Be honest about ship status.** Clearly mark un-merged/un-deployed work as "rolling out" or
   "staged" — never imply staged work is live. Check `git status` / whether commits are pushed if
   in doubt.

## Non-negotiable rules

- **Benefit-first.** Lead with what the user/customer can now do, not the implementation.
- **No internal jargon.** Translate engineering terms to product impact. "Enabled RLS" → "your
  data is now isolated to your account"; "removed @ts-nocheck / refactor / bumped deps" → omit or
  fold into one "Behind the scenes" line.
- **Never invent.** Every entry must trace to a real commit/PR in the collected JSON. If a commit's
  user impact is unclear, inspect the diff, ask, or omit it — do not fabricate a feature.
- **Sentence case, punchy, scannable.** One screenful per release. Two weights, no ALL CAPS.

## Portfolio mode (one board across many repos)

To build a "we ship across everything" board (a portfolio ship index), aggregate multiple repos:

1. Copy `assets/portfolio.config.example.json` and edit the `projects` list (name, local repo
   `path`, `tagline`, `accent`). One entry per app.
2. Run `node <skill-dir>/scripts/collect-portfolio.mjs --config <your-config>.json --days 35`.
   Output JSON has: `totals` (ships_this_week, ships_30d, active_this_week, busiest_day), a merged
   `daily` heatmap map, per-`projects` stats, and the latest cross-project `recent` commits.
3. Render the Ship Index: portfolio stat strip + a 5-week activity heatmap (color cells by daily
   count) + per-project rows (bar width ∝ 30-day commits) + a cross-project recent-ships feed.
   Rewrite `recent[].subject` (raw commit messages) into benefit-first copy per the voice spec.
4. Data source choice when wiring to a real site:
   - **Static/generated** (repos are local or in CI): run the aggregator on a schedule, write the
     JSON into the home-page repo (or an endpoint), and have the page read it. No live git needed.
   - **GitHub-API live**: if every repo is on GitHub, a serverless function can hit the commits API
     per repo and aggregate on request — always fresh, no local step. Needs a token + repo list.
   - Keep cadence claims truthful; show dormant projects honestly (or feature only active ones).

## Reusable contents

- `scripts/version.mjs` — the shared semver anchor manager (get/init/set/bump/date on `docs/VERSION`).
- `scripts/collect-history.mjs` — single-repo history collector (run, don't reinvent).
- `scripts/collect-portfolio.mjs` — multi-repo aggregator for the portfolio ship index.
- `assets/portfolio.config.example.json` — example portfolio config.
- `references/voice-and-format.md` — the voice + format spec and worked example.
- `assets/whats-new.html` — a standalone, premium, themeable "What's New" page (version-grouped,
  category filter chips, momentum band; works without JS). Pairs with `docs/SHIPPING-LOG.md`.
- `assets/shipping-log.html` — a dark, on-brand landing "shipping log" section (single product)
  with metric strip, timeline cards, illustration slots, and notes for adapting to React.
