---
description: Turn git history into a public, investor-friendly changelog grouped by version (benefit-first New / Improved / Fixed / Security + a momentum line), then render the themed What's New page. Scope it by date range, person, or version range — or pass a bump to cut a new version.
argument-hint: "[minor|patch|major · \"last 7 days\" · \"since v0.7.0\" · \"by Abakar\" · 2026-06-01..2026-06-17]"
---

Use the `shipping-log` skill to produce a public, investor-friendly changelog for THIS project.
Skills live in `${CLAUDE_PLUGIN_ROOT}/skills`; outputs go in this project's `docs/`.

**Scope it however you need** — read "$ARGUMENTS" and translate to git:
- **Time range** — "last 7 days", "since 2026-06-01", "this week", "June" → `git log --since=… [--until=…]`
- **Version range** — "since v0.7.0", "v0.6.0..v0.8.0" → from that tag/heading to HEAD
- **By person** — "by Abakar", "author robert" → `git log --author=…` (useful for a per-dev rollup)
- **Cut a version** — "minor" / "patch" / "major" bumps `docs/VERSION` first, then logs under the new version
- **Default** (no args) — everything since the last `## v…` heading already in `docs/SHIPPING-LOG.md`

Then:
- Collect git history (and merged PRs if available). Translate commits into **benefit-first**
  New / Improved / Fixed / Security bullets, grouped by version (`## v<x.y.z> — <date>`), newest
  first, with a momentum line. Omit internal-only noise (refactors, lockfiles, CI). Never invent
  features; never imply a security breach.
- Write/append to `docs/SHIPPING-LOG.md` and render `docs/whats-new.html` (themed by `docs/brand.json`).
- Report the version/scope covered and the momentum stats. If you bumped, remind me to run
  `/ship-guide` so the guide's "Current as of" stamp matches.

(This is the version-aware pack changelog; your house-style `/shiplog` still works independently.)
