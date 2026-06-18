# Derivation reference — how the kit is computed

This explains the math in `scripts/brand-kit.mjs` so a reviewer can trust the numbers and a
maintainer can extend them. All of it is deterministic and dependency-free.

## Color parsing

`brand.json` colors may be `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(...)`, or `rgba(...)`. The parser
returns `{ r, g, b, a }`. Anything else — named CSS colors (`rebeccapurple`), gradients,
`hsl(...)`, `var(...)` — is **not resolvable without a lookup table**, so it is reported in
`skippedColors` and excluded from the palette rather than guessed. That honesty matters: a faked
swatch is worse than a missing one.

**Alpha colors are utility tones, not brand hues — they get the raw var only, no ramp.** A
`grid: rgba(0,86,210,.07)` overlay is a scrim/glow/grid line, not a color you tint into 50–900
backgrounds and text. So when `a < 1` the parser flags it: the *raw* value is preserved verbatim
in `tokens.css` (`--grid: rgba(0,86,210,.07);`), but no `--grid-50..900` ladder is emitted and no
contrast row is computed (the ratio of a 7%-opacity overlay is meaningless on its own). These
colors are listed under `alphaColors` in the JSON/report so the exclusion is visible, not silent.
If you *do* want a ramp from an overlay's underlying hue, add it to `brand.json` as an opaque hex.

## Tints & shades (the 50–900 ramp)

Each color is converted to HSL; **hue and saturation are held constant** and only **lightness**
walks a fixed ladder:

```
50→96%  100→91%  200→81%  300→70%  400→60%
500→50%  600→42%  700→33%  800→24%  900→15%
```

This produces a Tailwind-shaped ramp where `500` is roughly the "true" tone and the ends are
usable for backgrounds (`50/100`) and text/borders on light (`700/800/900`). Because hue/sat are
preserved, the ramp always reads as the *same* color family, just lighter/darker. The base color
keeps its exact original hex under `base` (so the brand's literal value is never lost to rounding).

> Note: a pure HSL-lightness ramp is simple and predictable, not perceptually uniform (OKLCH would
> be more even). It is intentionally dependency-free; if perceptual evenness is required, swap in
> an OKLCH ramp — the rest of the kit is unaffected.

## WCAG contrast

Contrast uses the WCAG 2.1 definition:

1. Linearize each channel: `c/255`, then `c≤0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`.
2. Relative luminance `L = 0.2126·R + 0.7152·G + 0.0722·B`.
3. Ratio `= (Llighter + 0.05) / (Ldarker + 0.05)` → ranges 1:1 … 21:1.

For every brand color the script computes the ratio against **black** and **white** text, picks
the higher one as the recommended text color, and reports verdicts:

| Threshold | Meaning |
|-----------|---------|
| **≥ 3:1** | AA for large text (≥24px, or ≥19px bold) and UI components |
| **≥ 4.5:1** | AA for normal body text |
| **≥ 7:1** | AAA for normal body text |

Use this to choose text-on-button and text-on-surface pairings with evidence. If `brand` only
hits AA at 5.5:1, body text on a solid brand fill is fine but small/secondary text wants a darker
stop (e.g. `brand-700`) or the accent.

## Type scale (modular scale)

A classic modular scale: `size(step) = base × ratio^step`. Defaults `base = 16px`, `ratio = 1.25`
(major third). Steps:

| Token | step | at 16/1.25 |
|-------|------|-----------|
| display | +4 | 39.06px |
| h1 | +3 | 31.25px |
| h2 | +2 | 25px |
| h3 | +1 | 20px |
| body-lg | +0.5 | 17.89px |
| body | 0 | 16px |
| small | −1 | 12.8px |
| caption | −2 | 10.24px |

Override with `--base` / `--ratio`. Common ratios: 1.2 (minor third, tighter), 1.25 (major third),
1.333 (perfect fourth, dramatic). `rem` values assume a 16px root.

## Icon & social manifest

The sizes are the real production set, each tagged with its `purpose` so nothing is cargo-culted:

| File | Size | Used by |
|------|------|---------|
| `favicon-16/32/48.png` | 16, 32, 48 | browser tabs, bookmarks, Windows |
| `favicon.ico` | 16+32+48 multi | legacy / IE fallback |
| `icon-180.png` | 180 | `apple-touch-icon` (iOS home screen) |
| `icon-192.png` / `icon-512.png` | 192 / 512 | PWA / Android (web manifest) |
| `maskable-512.png` | 512 | PWA maskable — keep art inside the ~80% safe zone |
| `avatar-512.png` | 512² | square social avatar (X, LinkedIn, GitHub) |
| `banner-1500x500.png` | 1500×500 | X/Twitter header |
| `linkedin-banner-1584x396.png` | 1584×396 | LinkedIn page/profile banner |
| `og-1200x630.png` | 1200×630 | Open Graph link preview (`og:image`) |

`site.webmanifest` references the PWA icons and is themed (`theme_color` = `brand`,
`background_color` = `bg`). `head-snippet.html` wires icons + OG/Twitter meta into `<head>`.

## Maskable & OG composition notes

- **Maskable**: Android may crop to a circle/squircle. Keep the mark within the inner ~80%
  (≈40px padding on a 512 canvas) so it never gets clipped.
- **OG / banner**: 1200×630 is the canonical link-preview size and crops well on most platforms.
  Reserve a clear horizontal text band for the product name + tagline; use `brand`/`accent` from
  the palette, real fonts from `brand.json`, and high contrast (check the ratio before shipping).
