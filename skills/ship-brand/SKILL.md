---
name: ship-brand
description: Generates a complete, production-ready brand kit from docs/brand.json — an expanded color palette (50–900 tints/shades with WCAG-checked text pairings), a modular type scale, a favicon + app-icon spec/manifest at standard sizes, a social avatar + banner, and an Open Graph share image. Discovers existing brand assets first, derives everything deterministically from brand.json with a dependency-free script, and is generator-agnostic for the actual images. Use when the user wants a brand kit, favicon, app icons, social/OG images, a color palette, design tokens, a type scale, a web manifest, or to turn brand.json into real assets.
---

# Ship Brand

Turn `docs/brand.json` (brand-as-data: colors + fonts) into a **complete, production-ready brand
kit**: an expanded palette, a type scale, design tokens, a favicon/app-icon spec, social images,
and an OG share image — all derived deterministically from one file so everything is on-brand.

This is the **brand-kit** member of the `/ship-*` pack. It pairs with:
- **logo-pack** (`ship-logos`) — makes the *logo*; ship-brand turns it into the full asset set.
- **user-guide-builder** (`ship-guide`) and **shipping-log** (`ship-changelog`) — read the same
  `brand.json` so docs match the kit.
- **screenshot-capture** (`ship-screenshots`) — uses the same tokens for on-brand callouts.

The split is deliberate: the **derivation** (palette math, contrast, sizes, manifests) is
deterministic and done by a script. The **image generation** is generator-agnostic — the skill
writes specs and prompts; you point them at whatever image engine is set up (adapters below).

## Workflow

### 1. Discover what already exists (always first)

Never overwrite blindly. Scan inputs and prior outputs:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ship-brand/scripts/scan-assets.mjs"        # or --json
```

It reports: `docs/brand.json` (name, color count, fonts), `docs/VERSION`, any prior kit in
`docs/brand/`, any favicons / app icons / OG images / **real web manifests** (`site.webmanifest`,
`manifest.webmanifest`, bare `manifest.json` — *not* the kit's own `icon-manifest.json`) the app
**already ships**, and any reusable **logos** in `docs/brand/logos/` (or `public/logos/`, etc.). It
walks `public/`, `src/app/`, and monorepo `packages/*/public`, then ends with a recommendation:

- **No `brand.json`** → scaffold one (step 2), don't invent a brand.
- **Prior kit exists** → re-derive to refresh; only regenerate images that actually changed.
- **A logo is present** → use **Adapter A** (resize the square mark into every icon size — the
  cleanest, brand-preserving path; see step 5). The scan surfaces this, not just the docs.
- **App already ships icons** → derive the kit, then **fill gaps** (missing sizes / social / OG)
  rather than duplicating what exists.

### 2. Ensure brand.json exists (honest about missing input)

If `scan-assets.mjs` found none, scaffold a starter and stop until it's filled in:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ship-brand/scripts/brand-kit.mjs" --init
```

This writes a starter `docs/brand.json` (no purple by default) with `name`, `tagline`, `colors`,
`fonts`. Help the user set the real brand color (`brand`), accent, neutrals, and font names —
then re-run. **Do not fabricate brand colors.** If a logo exists but no `brand.json`, run
`logo-pack` first or read the colors off the logo with the user.

### 3. Derive the kit (deterministic, dependency-free)

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ship-brand/scripts/brand-kit.mjs"          # human report
node "${CLAUDE_PLUGIN_ROOT}/skills/ship-brand/scripts/brand-kit.mjs" --write  # write outputs
```

`--write` emits, into `docs/brand/`:

| File | What it is |
|------|-----------|
| `tokens.css` | `:root` CSS variables: raw brand colors (incl. alpha overlays, verbatim), a `--<name>-50..900` ramp for each *opaque* color, font vars, `--text-*` scale |
| `palette.json` | The palette, the WCAG contrast table, and the type scale — machine-readable |
| `icon-manifest.json` | The exact icon + social/OG sizes to render, each with its purpose |
| `site.webmanifest` | A valid PWA web manifest, themed from `brand.json` |
| `head-snippet.html` | The `<link rel="icon">` / apple-touch / manifest / OG `<meta>` tags to paste into `<head>` |

What the script computes (see **[references/derivation.md](references/derivation.md)** for the math):
- **Palette** — each *opaque* named color → a 50–900 lightness ramp (hue/sat preserved). Alpha
  overlays (e.g. `grid: rgba(...,.07)`) keep their raw var only — no ramp, since a tint ladder of
  a 7%-opacity scrim is noise.
- **Contrast** — for every color, the WCAG 2.1 ratio against black and white text, with AA / AAA
  verdicts, so you pick text colors with evidence, not by eye.
- **Type scale** — a modular scale (`display`→`caption`) from `--base` px and `--ratio`
  (default 16 / 1.25; pass `--base 18 --ratio 1.2` to change).
- **Icon + social manifest** — the standard real-world sizes (favicon 16/32/48, `.ico`,
  apple-touch 180, PWA 192/512, maskable 512; avatar 512, X banner 1500×500, LinkedIn 1584×396,
  OG 1200×630), each tagged with where it's used.

### 4. Render the brand-kit gallery (self-contained, themeable HTML)

Build a single-file `docs/brand/brand-kit.html` that shows the kit: palette swatches with their
hex + AA/AAA badges, the type scale rendered live, and an **icon spec board** (a labeled square
per required size — the *spec*, with the real images dropped in once generated). Theme it from
`tokens.css` via `:root`. Follow **[references/html-rules.md](references/html-rules.md)**:
self-contained, no external CSS/JS, themed from `brand.json` (NEVER purple by default), and
**never** `backdrop-filter` or SVG `feTurbulence` (they hang renderers).

### 5. Generate the images (generator-agnostic — use an adapter)

The kit specifies *what* to render; you choose the engine. For each entry in
`icon-manifest.json`, generate at the listed pixel size onto a transparent (icons) or branded
(social/OG) canvas. Use whichever adapter is available — see
**[references/generator-adapters.md](references/generator-adapters.md)**:

- **logo-pack output** — the cleanest path: take the winning square mark from
  `docs/brand/logos/` and resize/pad it to each icon size; compose it onto the OG/banner canvas.
- **`gemini-imagegen`** skill (Nano Banana Pro) — render icons + OG/social art directly.
- **`using-local-ideogram4`** skill — when the OG/banner needs crisp headline text.
- **Ad Lab** (optional, only if installed) — resolve its path from `$AD_LAB_DIR` / PATH / a known
  checkout (never a hardcoded drive letter), then `node "$AD_LAB_DIR/scripts/generate-image.js"
  -p "<prompt>" -o docs/brand/icons/<file>`. See Adapter D for the discovery snippet.

Save icons to `docs/brand/icons/`, social to `docs/brand/social/`. Generate, **look at the
output**, keep the strongest. For OG/banner, the prompt names the brand colors and reserves a
clear text zone for the product name + tagline.

### 6. Wire it up + report

Tell the user exactly what to do with the output:
- Copy `docs/brand/icons/*` and `site.webmanifest` to the app's web root (e.g. `public/`).
- Paste `head-snippet.html` into the app's `<head>` (Next.js: `app/layout.tsx` metadata or
  `app/head`). Adjust paths if assets live under a sub-path.
- Stamp the kit with `docs/VERSION` so it travels with the release.

Report: the derived palette + contrast summary, the type scale, which images were generated vs.
still pending (be honest about gaps), and the wire-up steps. Cross-link `ship-logos` if the logo
needs work and `ship-guide` so the docs pick up the new tokens.

## Worked example (input → output)

**Input** — `docs/brand.json`:
```json
{ "name": "MyFieldTime", "tagline": "Run your jobs. Not your inbox.",
  "colors": { "bg": "#0a0a0f", "brand": "#2f7dff", "accent": "#FFDD00", "muted": "#8b9bb4" },
  "fonts": { "display": "Bricolage Grotesque", "body": "Hanken Grotesk" } }
```

**Run** — `node …/brand-kit.mjs --write`. **Output** (excerpt):
- `brand` ramp: `50 #ebf2ff · 200 #9ec2ff · 500 #0060ff · 700 #003fa8 · 900 #001d4d`.
- Contrast: `brand #2f7dff` → best text **black, 5.5:1, AA** (so white nav text on a brand button
  needs a *darker* stop like `brand-700` for AA body text). `accent #FFDD00` → black text,
  15.59:1, **AAA**. `muted #8b9bb4` → black, 7.45:1, AAA — safe for secondary text on light.
- Type scale (16 / 1.25): `display 39px · h1 31px · h2 25px · body 16px · caption 10.24px`.
- `tokens.css` with all `--brand-50..900`, `--font-display: "Bricolage Grotesque"`, `--text-*`.
- `icon-manifest.json` listing 8 icons + 4 social/OG sizes, each with a `purpose`.
- `site.webmanifest` themed `#2f7dff` on `#0a0a0f`; `head-snippet.html` with the `<link>`/OG tags.

Then the kit gallery renders those swatches (each with its AA/AAA badge) and an icon spec board,
and the images get generated from the logo-pack mark — a complete kit from one JSON file.

## Quality bar

- **Derived, not eyeballed.** Palette ramps and contrast come from the script's math. Every
  text-on-color choice cites a real WCAG ratio + AA/AAA verdict — no "looks fine."
- **Honest about inputs.** Missing `brand.json` → scaffold and stop, never invent a brand.
  Unparseable color values are *reported and skipped*; alpha overlays keep a raw var but no
  ramp — both are surfaced in the report, not silently guessed or padded with noise. An
  unparseable color that still lands in `tokens.css` is annotated there too
  (`/* unparsed — no ramp/contrast, not validated */`), so the token file is as honest as the
  report and no reader mistakes it for an endorsed token.
- **Discovery tells the truth.** It distinguishes a *shipped* web manifest from the kit's own
  files: anything under the output dir `docs/brand/` (the `site.webmanifest` and `icons/*` that
  `--write` itself produces) is excluded from the shipped-asset scan, so a second run never
  re-reports its own output as a pre-existing app asset. It also actually detects a reusable logo
  (`docs/brand/logos/…`) so the recommended Adapter A path is found, not merely described.
- **Reuse over churn.** Discovery runs first; existing icons are extended, not duplicated. A
  re-run refreshes tokens and regenerates only what changed.
- **Real sizes, real purposes.** The icon manifest is the actual production set (favicon → `.ico`
  → apple-touch → PWA/maskable → OG/social), each labeled with where it's used — not a vague list.
- **On-brand, never generic.** Tokens, manifest theme color, and HTML all source `brand.json`.
  Never purple unless the brand says so. OG/social art is specific to *this* product.
- **HTML that renders anywhere.** Self-contained, themeable via `:root`, no `backdrop-filter`,
  no `feTurbulence`.
- **Portable.** Nothing hardcoded to one app; image engines are adapters, never assumed installed.
