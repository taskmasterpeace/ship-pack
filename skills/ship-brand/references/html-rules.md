# HTML rules — the brand-kit gallery

The kit gallery (`docs/brand/brand-kit.html`) is a single self-contained file that shows the
derived kit: palette swatches with hex + AA/AAA badges, the type scale rendered live, and an icon
spec board. These rules are shared with the rest of the ship pack so every HTML output matches.

## Hard rules (non-negotiable)

1. **Self-contained.** One `.html` file. No external CSS, JS, fonts, or images required to render.
   Inline everything. Web fonts may be `@import`ed from Google Fonts with a `system-ui` fallback,
   but the page must still read correctly with no network.
2. **Themed from `brand.json` via `:root`.** Copy the variables from the generated `tokens.css`
   into a `:root` block. Use `var(--brand)`, `var(--bg)`, `var(--surface)`, `var(--text)`,
   `var(--muted)`, the `--*-50..900` ramps, and `--text-*`. Hardcode no colors in the body.
3. **NEVER purple by default.** The only colors come from `brand.json`. If the brand has no
   purple, the page has no purple.
4. **NEVER `backdrop-filter`.** It hangs/whites-out headless renderers and screenshot tools.
   Use a solid or simple `rgba()` background instead.
5. **NEVER SVG `feTurbulence` / `feDisplacementMap`** (or other heavy filter primitives). They
   hang renderers. For texture, use a static CSS gradient or a tiny repeating linear-gradient grid.
6. **No tracking, no analytics, no CDNs beyond optional fonts.**

## Layout & quality

- Dark theme by default if `brand.bg` is dark (it usually is). Background `var(--bg)`, cards
  `var(--surface)`, borders `var(--border)`.
- **Palette section**: one swatch card per color. Show the swatch, the name, the hex, and the
  WCAG badge from `palette.json` (e.g. `AAA 19.75:1` or `AA 5.5:1`). Show the recommended text
  color *rendered on the swatch itself* so the pairing is visible, not just asserted. Optionally
  show the 50–900 ramp as a strip under each base color.
- **Type scale section**: render each step at its real size using `--font-display` for headings
  and `--font-body` for body, labeled with token name + px + rem.
- **Icon spec board**: a labeled square per required size from `icon-manifest.json` (e.g. a 32px
  and a 180px box). Before images exist, draw a placeholder square with the size + purpose; after
  generation, drop the real PNG in via a relative `icons/<file>` path (still renders standalone —
  a missing image just shows the box).
- Rounded corners (~10px), subtle borders, hover lift on cards, smooth 0.2s transitions.
- Tasteful, on-brand, not generic. The page should look like it belongs to *this* product.

## Skeleton

```html
<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BRAND — Brand Kit</title>
<style>
  :root{
    /* paste from docs/brand/tokens.css */
    --bg:#0a0a0f; --surface:#11141f; --border:#1e2740; --text:#e7edf6;
    --muted:#8b9bb4; --brand:#2f7dff; --accent:#FFDD00;
    --font-display:"Bricolage Grotesque",system-ui,sans-serif;
    --font-body:"Hanken Grotesk",system-ui,sans-serif;
  }
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);
    font-family:var(--font-body);padding:2.5rem;line-height:1.5}
  h1,h2{font-family:var(--font-display);letter-spacing:-.02em}
  .grid{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}
  .swatch{border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--surface);
    transition:transform .2s,box-shadow .2s}
  .swatch:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.35)}
  .chip{height:84px;display:flex;align-items:flex-end;padding:.5rem;font-weight:600}
  .meta{padding:.5rem .6rem;font-size:.8rem}
  .badge{display:inline-block;padding:.05rem .4rem;border-radius:6px;font-size:.7rem;
    background:var(--brand);color:#fff}
  .ramp{display:flex} .ramp i{flex:1;height:10px}
</style>
<h1>BRAND — Brand Kit</h1>
<!-- palette grid, type scale, icon spec board; values from palette.json / icon-manifest.json -->
```

Keep it lean. The gallery is a reference sheet, not an app — clarity over cleverness.
