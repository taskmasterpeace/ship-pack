---
description: Capture consistent, on-brand app screenshots for the docs (fixed viewport, redaction, callouts) and drop them into the guide's [SCREENSHOT: id] placeholders. Start with a dry-run to see the plan and gaps before launching a browser.
argument-hint: "[--dry-run | --only id1,id2 | --base http://localhost:PORT]"
---

Use the `screenshot-capture` skill for THIS project. Skills live in `${CLAUDE_PLUGIN_ROOT}/skills`;
outputs go in this project's `docs/`.

- If there's no `docs/screenshots.config.json` yet, copy
  `${CLAUDE_PLUGIN_ROOT}/skills/screenshot-capture/assets/screenshots.config.example.json` to
  `docs/screenshots.config.json` and help me fill in the base URL, login steps, and the shot list.
- **Always start with a dry-run** (no browser needed) to show the plan + gaps:
  `node "${CLAUDE_PLUGIN_ROOT}/skills/screenshot-capture/scripts/capture.mjs" --dry-run`
- Then, with the app running, capture and fill markers (passing through "$ARGUMENTS"):
  `node "${CLAUDE_PLUGIN_ROOT}/skills/screenshot-capture/scripts/capture.mjs" $ARGUMENTS --fill-markers`
  (Real captures need Playwright: `npm i -D playwright && npx playwright install chromium`.)
- Use demo/test accounts only; keep passwords in env (`SHOT_PASS`); mask sensitive UI.
- Report which shots were captured and which markers remain unfilled.
