# Capture Recipes

Full config schema and common patterns for `scripts/capture.mjs`.

## Config schema

| Key | Type | Notes |
|-----|------|-------|
| `baseUrl` | string | Where the app is running. Override at runtime with `--base`. |
| `outDir` | string | Where PNGs are written. Default `docs/screenshots`. |
| `viewport` | `{width,height}` | Frame size for every shot. Default 1440×900, captured @2×. |
| `guide` | string | Path to the markdown guide whose `[SCREENSHOT: …]` markers get filled. |
| `vars` | object | Values substituted into `{token}` in any `url` (e.g. `{projectId}`). |
| `auth` | object | Optional login run once before captures. |
| `shots` | array | The shot list (below). |

### `auth.steps` (run in order)

| Step | Shape | Does |
|------|-------|------|
| fill | `{ "fill": "<sel>", "value": "x" }` or `{ "fill": "<sel>", "env": "SHOT_PASS" }` | Types into an input. Prefer `env` for secrets. |
| click | `{ "click": "<sel>" }` | Clicks an element. |
| waitFor | `{ "waitFor": "/path" }` | Waits for the URL to contain `/path`. |
| wait | `{ "wait": 800 }` | Waits N ms (last resort). |

### `shots[]`

| Key | Does |
|-----|------|
| `id` | Required. Output is `<outDir>/<id>.png`; matches `[SCREENSHOT: id]`. |
| `label` | Human caption; also matches `[SCREENSHOT: label]`; becomes the alt text. |
| `url` | Path appended to `baseUrl`. Supports `{var}` from `vars`. |
| `selector` | Capture just this element instead of the page. |
| `clip` | `{x,y,width,height}` region capture. |
| `fullPage` | `true` to capture the entire scroll height. |
| `waitFor` | Selector to wait for before shooting (avoids spinners). |
| `wait` | Extra ms to settle animations. |
| `highlight` | Selector to outline (yellow) + scroll into view — for callouts. |
| `mask` | Array of selectors painted over in the capture — redaction. |

## Recipes

**Log in once, capture authed pages** — put creds in `auth`, list pages in `shots`. The
session persists across all shots in one run.

**Redact a homeowner's name / a dollar figure** — add the element to `mask`:
```json
{ "id": "money", "url": "/project/{projectId}/money", "mask": [".client-name", ".draw-amount"] }
```
Masking paints a box in the actual pixels — safe to publish.

**Call out a new button for a feature announcement** — `highlight` it:
```json
{ "id": "co-approve", "url": "/project/{projectId}/change-orders", "highlight": ".approve-btn" }
```

**Capture one component, not the whole page** — use `selector`:
```json
{ "id": "weather-strip", "url": "/project/{projectId}/dashboard", "selector": ".weather-hero" }
```

**Different port** — `node capture.mjs --base http://localhost:3001`.

**Only re-shoot what changed** — `node capture.mjs --only dashboard,co-approve --fill-markers`.

## Regenerating per release

Tie captures to the version anchor: after a release bumps `docs/VERSION` and the guide is
re-stamped, re-run `capture.mjs --fill-markers` so the images match the shipped UI. The
config is version-controlled, so "what the docs looked like at v1.4.0" is reproducible.

## Non-web fallback

For a native/desktop app there's no Playwright path. Use `computer-use`: open the app,
position the window, `screenshot`, and save into `outDir` with the same `<id>.png` naming,
then fill markers by hand (or with a one-off edit). The marker convention is identical.
