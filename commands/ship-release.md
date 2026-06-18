---
description: Cut a release in one step — bump docs/VERSION, add the new changelog entry, re-stamp and re-render the user guide, and refresh screenshots, so the changelog, guide, and images all agree on the new version. Run it right after you ship work.
argument-hint: "[major|minor|patch]"
---

Cut a release for THIS project using the docs + release skill pack. The skills live in
`${CLAUDE_PLUGIN_ROOT}/skills`. Outputs go in this project's `docs/`.

1. **Decide the bump** from "$ARGUMENTS" (`major` | `minor` | `patch`). If empty, infer it from
   the work since the last release — new user-facing features → `minor`; fixes/polish only →
   `patch`; breaking change or headline launch → `major` — and tell me what you chose and why.
2. **Bump the anchor** (if `docs/VERSION` is missing, `init 0.1.0` first):
   `node "${CLAUDE_PLUGIN_ROOT}/skills/shipping-log/scripts/version.mjs" bump <kind> --file docs/VERSION`
3. **Changelog** — use the `shipping-log` skill to add the new `## v<version> — <today>` entry to
   `docs/SHIPPING-LOG.md` (benefit-first, grouped New / Improved / Fixed / Security, with a
   momentum line), then re-render `docs/whats-new.html`, themed by `docs/brand.json`.
4. **User guide** — use the `user-guide-builder` skill to re-stamp the guide's
   "Current as of v<version>" header and add any new features (full depth — no one-liners), then:
   `node "${CLAUDE_PLUGIN_ROOT}/skills/user-guide-builder/scripts/render-guide.mjs" --in <guide.md> --out <guide.html> --brand docs/brand.json --version docs/VERSION`
5. **Screenshots** — if `docs/screenshots.config.json` exists, refresh anything that changed:
   `node "${CLAUDE_PLUGIN_ROOT}/skills/screenshot-capture/scripts/capture.mjs" --fill-markers`
6. **Report** the new version, the files updated, and the momentum line. Confirm the changelog,
   the guide stamp, and the screenshots all agree on the new version.

Never invent features — everything traces to real commits. Keep it public-safe (no PII/financials).
This is the one-shot version of `/ship-changelog` + `/ship-guide` + `/ship-screenshots`.
