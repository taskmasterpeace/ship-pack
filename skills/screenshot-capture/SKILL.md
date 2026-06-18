---
name: screenshot-capture
description: Captures consistent, repeatable screenshots of a running web app for documentation, and fills [SCREENSHOT: id] markers in a user guide with the images. Config-driven and re-runnable, so screenshots can be regenerated whenever a feature changes. Use when the user wants screenshots for a user guide, help docs, a feature announcement, or a README; wants to refresh stale screenshots; or asks to capture app screens, fill screenshot placeholders, or document a new feature visually.
---

# Screenshot Capture

Capture clean, consistent screenshots from a **running app** and drop them straight into
the docs — then regenerate them in one command when the UI changes. This is the visual
half of the documentation + release pack: [`user-guide-builder`](../user-guide-builder/SKILL.md)
writes `[SCREENSHOT: id]` markers; this skill fills them with real images.

The point is **repeatability**. Hand-grabbed screenshots rot the moment a button moves.
A config-driven shot list is re-run per release, so the guide's pictures always match the
product.

## Part of the pack

```
user-guide-builder  → writes the guide + [SCREENSHOT: id] markers
screenshot-capture  → captures images, fills the markers          ← you are here
shipping-log        → can reuse the same shots as feature art
        all three are versioned together via docs/VERSION
```

## Choose a capture path

| App type | Use | Why |
|----------|-----|-----|
| **Web app** (Next.js, Vite, etc.) | **Playwright** via `scripts/capture.mjs` (default) | Deterministic, sized, re-runnable, can log in, redact, annotate |
| Web app, quick one-off | Claude Preview MCP (`preview_start` → `preview_screenshot`) | No script/config; good for a single shot |
| Native / desktop app | `computer-use` (screenshot + window control) | Only path that can drive a non-browser UI |

The bundled script targets the common case (web apps). The rest of this skill describes it.

## Workflow (Playwright path)

```
1. Make sure the app is running (its dev command, or the `run` skill). Note the URL/port.
2. Copy assets/screenshots.config.example.json → docs/screenshots.config.json and edit it.
3. node <skill-dir>/scripts/capture.mjs --dry-run        ← plan + gap report, no browser
4. Install Playwright if needed: npm i -D playwright && npx playwright install chromium
5. node <skill-dir>/scripts/capture.mjs                   ← capture every shot
6. node <skill-dir>/scripts/capture.mjs --fill-markers    ← embed images into the guide
```

`--dry-run` is the safe first step: it parses the guide's `[SCREENSHOT: …]` markers, lists
the shots you've configured, and reports **orphan markers** (no shot yet) and **unused
shots** (no marker) — so you know exactly what's missing before launching a browser.

## The config

`docs/screenshots.config.json` (full schema + recipes in
[references/capture-recipes.md](references/capture-recipes.md)):

```jsonc
{
  "baseUrl": "http://localhost:3000",
  "outDir":  "docs/user-guide/screenshots",
  "viewport": { "width": 1440, "height": 900 },
  "guide":   "docs/user-guide/MyFieldTime-User-Guide.md",
  "vars":    { "projectId": "demo-project-id" },          // {projectId} in any url
  "auth": {
    "loginUrl": "/login",
    "steps": [
      { "fill": "#email", "value": "pm@example.test" },
      { "fill": "#password", "env": "SHOT_PASS" },          // creds from env, not committed
      { "click": "button[type=submit]" },
      { "waitFor": "/dashboard" }
    ]
  },
  "shots": [
    { "id": "dashboard", "label": "Company dashboard", "url": "/dashboard", "waitFor": ".project-card" },
    { "id": "calendar",  "label": "Calendar",          "url": "/project/{projectId}/calendar", "fullPage": true },
    { "id": "co-approve","label": "Change order approval", "url": "/project/{projectId}/change-orders",
      "highlight": ".approve-btn", "mask": [".homeowner-email"] }
  ]
}
```

Per-shot options: `url` · `selector` (capture one element) · `clip` · `fullPage` ·
`waitFor` (selector) · `wait` (ms) · `highlight` (outline + scroll to an element) ·
`mask` (selectors painted over — native Playwright redaction).

## Capture quality (the "premium" details)

- **2× device scale** by default — crisp on retina/zoom.
- **Fixed viewport** so every shot is the same frame.
- **`waitFor`** a real selector (not a sleep) so you never capture a spinner.
- **`mask`** any selector showing a real name, email, address, or dollar figure — it's
  painted out in the capture, not just cropped.
- **`highlight`** the element a step is about, for feature callouts.

## Marker convention

Standardize on short ids: `[SCREENSHOT: dashboard]`, `[SCREENSHOT: co-approve]`. The
`--fill-markers` step matches a marker to a shot by **id or label**, then replaces it with
`![label](relative/path.png)`. Re-running re-captures the PNG in place, so the embed stays
valid — refresh is one command.

## Safety

- **Demo/test accounts only.** Never capture real customer data.
- **Creds via env** (`"env": "SHOT_PASS"`), never hard-coded in a committed config.
- **Mask sensitive UI** with the `mask` option — assume screenshots get shared publicly.
- Add the output dir to the repo intentionally; keep `screenshots.config.json` free of secrets.

## Cross-app notes

This skill is project-agnostic: the config carries everything app-specific (URL, login,
routes). The same `capture.mjs` serves MyFieldTime, LogNog, Directors Palette, or any web
app — only the config changes. For a non-web app, fall back to `computer-use`.
