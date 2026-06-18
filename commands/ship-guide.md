---
description: Build or update this project's user & admin guide in full depth (every feature gets real steps, examples, and what-you'll-see — never one-liners), then render it to a navigable, on-brand HTML page with a sidebar, search, and scroll-spy.
argument-hint: "[a focus area, e.g. \"the billing module\" — omit to cover everything]"
---

Use the `user-guide-builder` skill to create or update the user & admin guide for THIS project.
Skills live in `${CLAUDE_PLUGIN_ROOT}/skills`; outputs go in this project's `docs/`.

- **Prefer updating** an existing guide over creating a competing new one.
- **Write with real depth**: every feature gets the full block (what it does · where to find it ·
  step-by-step · a concrete example · what you'll see · limitations) — never one-liners. Use real
  screen and button names. A real guide is long; thinness is the failure.
- Walk the actual app/code so feature maturity is honest (Available / Partial / Planned / Unclear).
- Stamp the guide with `docs/VERSION` and link `docs/SHIPPING-LOG.md`. Mark picture spots with
  `[SCREENSHOT: short-id]` (the `/ship-screenshots` command fills them).
- If "$ARGUMENTS" names a focus area, concentrate there; otherwise cover the whole product.
- **Render to HTML** (create `docs/brand.json` first if missing):
  `node "${CLAUDE_PLUGIN_ROOT}/skills/user-guide-builder/scripts/render-guide.mjs" --in <guide.md> --out <guide.html> --brand docs/brand.json --version docs/VERSION`
- Report the file written, the version stamped, sections changed, and any product gaps found.
