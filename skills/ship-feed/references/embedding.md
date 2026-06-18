# Embedding the feed + widget

Three artifacts, three audiences. All are static — host them next to `whats-new.html`, behind a
CDN, or commit them to the docs site repo. No server is required.

| File | What it is | Where it goes |
|---|---|---|
| `docs/changelog.json` | The data | Fetched by the widget; consumed by any integration. |
| `docs/changelog.xml` | RSS 2.0 (or Atom) feed | Feed readers, "subscribe to updates", Slack/Discord RSS bots. |
| `docs/ship-changelog.js` | `<ship-changelog>` web component | Marketing/company page; in-app "What's new" badge. |
| `docs/whats-new.embed.html` | Static, data-inlined page | `<iframe>` embeds; hosts with no JS. |

## 1. Company / marketing page — full changelog

```html
<script src="/ship-changelog.js" defer></script>
<ship-changelog src="/changelog.json"></ship-changelog>
```

The element renders in a Shadow DOM, so the host page's CSS can't leak in and break it, and its
own styles can't leak out. It reads the brand defaults baked in at generation time.

## 2. In-app "What's new" badge

Compact mode shows just the newest release(s) — perfect for a header dropdown or a "What's new"
pill. `limit` caps how many releases render.

```html
<ship-changelog src="/changelog.json" badge limit="1"></ship-changelog>
```

Drive an unread-dot off the data without rendering the whole list:

```js
const r = await fetch("/changelog.json").then(r => r.json());
const seen = localStorage.getItem("whatsnew:lastSeen");
if (r.stats.latestVersion && r.stats.latestVersion !== seen) showDot();
// when the user opens the panel:
localStorage.setItem("whatsnew:lastSeen", r.stats.latestVersion);
```

The component also fires a `ship-changelog:ready` event (`detail.stats`) once rendered, so the
host can react without a second fetch.

## 3. iframe / no-JS embed

```html
<iframe src="/whats-new.embed.html" title="What's new" loading="lazy"
        style="width:100%;height:520px;border:0"></iframe>
```

`whats-new.embed.html` inlines the data, so it works with JavaScript disabled and needs no
network round-trip.

## 4. RSS / Atom subscription

Link the feed from `<head>` so browsers and readers can auto-discover it:

```html
<link rel="alternate" type="application/rss+xml"
      title="What's New" href="/changelog.xml">
```

`emit-feed.mjs --format atom` emits Atom 1.0 instead; point a feed bot at the URL.

## Theming a host override (without re-running the skill)

The component's tokens are CSS custom properties prefixed `--sc-`. A host can re-theme per page
by setting them on the element — useful for a light-on-dark vs. dark-on-light placement:

```css
ship-changelog {
  --sc-bg: #ffffff; --sc-surface: #f6f8fb; --sc-text: #1b2430;
  --sc-heading: #0b1220; --sc-muted: #5a6b7b; --sc-border: #e3e8ef;
  --sc-brand: #2f7dff; --sc-accent: #b58900;
}
```

The static embed page exposes the same tokens in its `:root` block.

## Renderer-safety rules (do not violate when hand-editing output)

- **No `backdrop-filter`** and **no SVG `feTurbulence`** — both can hang/blank renderers and
  preview iframes. The generators avoid them; keep it that way.
- Keep the widget **self-contained** — no external CSS/JS except optional web fonts already
  declared in `brand.json`. The component inlines all its styles in the shadow root.
- Backgrounds use plain gradients + `color-mix`, which degrade gracefully.

## Keeping it fresh

Re-run the skill after each release (or wire it into `/ship-release`). For an always-fresh feed
without a manual step, run `parse-changelog.mjs` + `emit-feed.mjs` in CI on push to the default
branch and publish the `docs/` artifacts.
