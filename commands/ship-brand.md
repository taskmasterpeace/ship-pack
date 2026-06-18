---
description: Generate a complete brand kit from docs/brand.json — an expanded palette (50–900 tints/shades with WCAG-checked text pairings), a type scale, design tokens, a favicon + app-icon spec/web manifest at standard sizes, plus social avatar, banner, and OG share images. Discovers existing assets first, derives the kit with a dependency-free script, and is generator-agnostic for the actual images.
argument-hint: "[--write | --json | icons | social | og | --base 16 --ratio 1.25 | a note like 'just the favicon set']"
---

Use the `ship-brand` skill for THIS project. Skills live in `${CLAUDE_PLUGIN_ROOT}/skills`;
outputs go in this project's `docs/brand/`. Part of the `/ship-*` pack.

1. **Discover first** — find brand.json, docs/VERSION, prior kit, any icons/OG/*real* web
   manifests the app already ships, and any reusable logo in `docs/brand/logos/`:
   `node "${CLAUDE_PLUGIN_ROOT}/skills/ship-brand/scripts/scan-assets.mjs"`
   Reuse and extend what exists; don't duplicate or blindly overwrite. If it reports a logo,
   prefer **Adapter A** in step 5 (resize the square mark) over generating icons from scratch.
2. **If there's no `docs/brand.json`**, scaffold one and stop until it's filled in (don't invent a
   brand): `node "${CLAUDE_PLUGIN_ROOT}/skills/ship-brand/scripts/brand-kit.mjs" --init`
3. **Derive the kit** (deterministic, dependency-free) and write the outputs:
   `node "${CLAUDE_PLUGIN_ROOT}/skills/ship-brand/scripts/brand-kit.mjs" --write`
   → `docs/brand/{tokens.css, palette.json, icon-manifest.json, site.webmanifest, head-snippet.html}`.
   Pass type-scale overrides through if "$ARGUMENTS" has them (e.g. `--base 18 --ratio 1.2`).
4. **Render the kit gallery** `docs/brand/brand-kit.html` — palette swatches with hex + AA/AAA
   badges, the live type scale, and an icon spec board. Self-contained, themed from `tokens.css`
   via `:root`, NEVER purple by default, NO backdrop-filter / feTurbulence
   (see `references/html-rules.md`).
5. **Generate the images** (generator-agnostic) for each entry in `icon-manifest.json` using an
   available adapter. If step 1 found a logo, use **Adapter A** first — resize/pad the square mark
   from the logo dir into every icon size (cleanest, brand-preserving). Otherwise fall back to
   `gemini-imagegen`, `using-local-ideogram4`, or Ad Lab (see `references/generator-adapters.md`).
   Save icons to `docs/brand/icons/`, social to `docs/brand/social/`. If "$ARGUMENTS" scopes it
   (e.g. `icons`, `social`, `og`, "just the favicon set"), do only that.
6. **Report + wire up** — summarize the palette + WCAG pairings, the type scale, and which images
   are done vs. pending (be honest about gaps). Tell me where to drop the icons + `site.webmanifest`
   (web root) and to paste `head-snippet.html` into `<head>`. Stamp with `docs/VERSION`. Cross-link
   `ship-logos` if the logo needs work and `ship-guide` so the docs pick up the new tokens.

Stay on-brand from `brand.json` (never purple unless the brand is), keep every color choice backed
by a real WCAG ratio, and keep the kit portable (nothing hardcoded to one app).
