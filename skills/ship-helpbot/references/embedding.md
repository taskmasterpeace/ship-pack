# Reference: embedding `<ship-helpbot>` in any app

The widget is one self-contained file (`ship-helpbot.js`) that registers a custom element.
It works in **plain HTML, React/Next, Vue, Svelte, Astro** — anywhere you can add a script tag
and a DOM element. It renders inside a Shadow DOM, so the host app's CSS can't leak in and the
widget's CSS can't leak out.

## Files it needs at runtime

| File | Where | Built by |
|------|-------|----------|
| `guide-index.json` | served at a public URL (e.g. `/guide-index.json`) | `build-index.mjs` |
| `ship-helpbot.js` | served as a static script (e.g. `/ship-helpbot.js`) | `build-widget.mjs` |
| `/api/ask-docs` | a server route (see `api-route.md`) | you (copy the reference) |

In Next.js, put both build artifacts in `public/` so they're served at the root. In a static
site, put them in the web root. The widget fetches `guide-index.json` only if the server route
needs it client-side; by default the **server** reads the index, so the JSON can also live
outside the web root — your choice.

## 1. Plain HTML

```html
<script src="/ship-helpbot.js" defer></script>
<ship-helpbot src="/guide-index.json" endpoint="/api/ask-docs"></ship-helpbot>
```

That's it — a floating launcher appears bottom-right.

## 2. Next.js (App Router)

```tsx
// app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="/ship-helpbot.js" strategy="afterInteractive" />
        {/* @ts-expect-error — custom element, not in JSX intrinsic types */}
        <ship-helpbot src="/guide-index.json" endpoint="/api/ask-docs" guide="/help" />
      </body>
    </html>
  );
}
```
To silence the TS warning project-wide, declare the element once:
```ts
// types/ship-helpbot.d.ts
declare namespace JSX {
  interface IntrinsicElements {
    "ship-helpbot": { src?: string; endpoint?: string; guide?: string; label?: string; open?: boolean };
  }
}
```

## 3. Vue / Svelte / Astro
Same tag. Vue: add `ship-helpbot` to `compilerOptions.isCustomElement`. Svelte/Astro: the tag
just works (they don't try to own unknown elements). Load the script once in the root layout.

## Attributes

| Attribute | Default | Purpose |
|-----------|---------|---------|
| `src` | `/guide-index.json` | URL of the index (passed to the route; lets you host elsewhere) |
| `endpoint` | `/api/ask-docs` | the POST route that answers questions |
| `guide` | `""` | base URL of the **rendered HTML guide** so citations deep-link, e.g. `guide="/help"` → a citation links to `/help#change-orders` |
| `label` | `Ask {product}` | launcher button text (product comes from `brand.json`) |
| `open` | absent | present ⇒ start expanded (handy for a `/help` page) |

## Theming (brand-as-data, no purple)

Colors/fonts are baked in from `docs/brand.json` at build time, so the default look already
matches the app. To override at runtime (e.g. a light section), set the `--shb-*` custom
properties on the element from host CSS:

```css
ship-helpbot {
  --shb-brand: #0056D2;   /* Trust Blue */
  --shb-accent: #FFDD00;  /* Construction Yellow */
  --shb-bg: #0a0a0f;
}
```

The component uses **no `backdrop-filter`** and **no SVG `feTurbulence`** (both can hang
renderers) — per the ship pack's HTML rules. It honors `prefers-reduced-motion`.

## Pairing with the rendered guide

Set `guide=` to wherever `user-guide-builder`'s rendered HTML is served. The index anchors are
the same slugs that the guide renderer emits for headings, so a citation chip like
`▸ Change Orders` links straight to `/help#change-orders` — the user lands on the exact section,
not a generic help home. This is the payoff of sharing the slugging rule across the pack.

## Re-build cadence

Re-run `build-index.mjs` whenever the guide changes (i.e. after every `user-guide-builder` run
or release). The `/ship-release` pipeline is the natural place to chain it. The widget JS only
needs rebuilding if `brand.json` changes or you upgrade the skill.
