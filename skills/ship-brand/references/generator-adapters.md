# Generator adapters — turning the spec into real images

`brand-kit.mjs` produces the **spec** (`icon-manifest.json`: which files, what sizes, what each is
for). It does NOT generate pixels — image generation is generator-agnostic. This file lists the
adapters. Pick whatever is actually available; **never assume a tool is installed.** If none are,
hand the user the manifest + prompts and say so honestly.

Output layout:
```
docs/brand/
  icons/    favicon-16/32/48.png, favicon.ico, icon-180/192/512.png, maskable-512.png
  social/   avatar-512.png, banner-1500x500.png, linkedin-banner-1584x396.png, og-1200x630.png
```

## Adapter A — logo-pack output (preferred when a logo exists)

The cleanest path: don't re-imagine the mark, **reuse it**. If `docs/brand/logos/` has a winning
square logo (from the `logo-pack` / `ship-logos` skill):

1. **Icons** = the square mark, resized + padded to each icon size on a transparent canvas.
   For `maskable-512`, add ~40px padding so the safe zone is respected.
2. **Avatar** = the mark centered on a `brand` or `bg` fill at 512².
3. **OG / banner** = the mark + product name + tagline composed on a branded canvas (palette
   colors, `brand.json` fonts, a reserved text band).

If a resize tool (sharp, ImageMagick, `sips` on macOS) is present, batch-resize. If not, ask the
generator to render each size directly. Prefer this adapter — it keeps brand equity and is
deterministic for the icon set.

## Adapter B — `gemini-imagegen` skill (Nano Banana Pro)

Strong for clean marks, app icons, and OG/social art with backgrounds. Invoke the skill with a
prompt per asset. Good for: generating icons from scratch when there's no logo, and for the
illustrated OG/banner background.

## Adapter C — `using-local-ideogram4` skill

Best when the **OG image or banner needs crisp headline text** (the product name + tagline baked
into the art). Ideogram renders type cleanly. Use it for text-bearing social art; use A or B for
the plain icons.

## Adapter D — Ad Lab (only if installed; path is per-machine, not assumed)

Ad Lab is an optional external CLI that lives at a per-user path — there is no canonical location,
so **discover it, don't hardcode a drive letter.** Resolve `$ADLAB` in this order and skip the
adapter entirely if nothing resolves:

```bash
# 1) explicit env var  2) on PATH  3) a known checkout — adjust to wherever YOURS lives
ADLAB="${AD_LAB_DIR:-$(command -v ad-lab-generate-image 2>/dev/null)}"
[ -z "$ADLAB" ] && [ -f "$HOME/git/ad-lab/scripts/generate-image.js" ] && ADLAB="$HOME/git/ad-lab/scripts/generate-image.js"

if [ -n "$ADLAB" ] && [ -f "$ADLAB" ]; then
  node "$ADLAB" -p "<prompt>" -o docs/brand/social/og-1200x630.png
else
  echo "Ad Lab not found — set AD_LAB_DIR or use another adapter."
fi
```

A direct CLI; good when Ad Lab is the user's set-up engine. If it isn't installed, fall through to
Adapter A/B/C — never assume the path exists.

## Adapter E — in-app Replicate

If the project already calls Replicate (model `google/nano-banana-2`), generate through the app's
existing route. Reuses configured credentials; nothing new to install.

## Prompt recipes

**App icon (no text):**
> App icon for {name}, {what-it-is}. The {logo motif / a simple geometric mark} centered in a
> rounded-square, flat solid shapes in {brand} with a touch of {accent}, transparent or {bg}
> background, no text, crisp at small sizes, balanced inside the safe zone. Flat vector, high
> contrast, no drop shadow, no gradient unless on-brand.

**Maskable icon:** same as above, but **extra padding** — keep all art within the inner 80%
(≈40px on 512) so Android's circle/squircle crop never clips it.

**OG / link-preview (1200×630):**
> Open Graph share image for {name} — {tagline}. {brand}-and-{accent} palette on a {bg}
> background, the {logo/mark} top-left, the product name set in {display font} and the tagline in
> {body font}, generous whitespace, a clear horizontal text band, high contrast (AA+),
> professional and on-brand. No clutter, no stock-photo look, no purple unless the brand is purple.

**X / Twitter banner (1500×500):** wide hero band, mark + tagline left-aligned, palette gradient
or solid `bg`, leave the lower-right ~120px clear (profile avatar overlaps there).

**LinkedIn banner (1584×396):** similar to the X banner but shorter; keep text vertically centered
and away from the left where the profile photo sits on profile pages.

## Always

- Render at the **exact pixel size** in `icon-manifest.json`; don't upscale a small render.
- Pull colors and fonts from `brand.json` (via `palette.json` / `tokens.css`) — never hardcode.
- After generating, **look at the result**, check the OG/banner text contrast against the kit's
  WCAG table, keep the strongest, and drop it into the gallery's icon spec board.
- `favicon.ico` is multi-size; build it from the 16/32/48 PNGs (ImageMagick:
  `magick favicon-16.png favicon-32.png favicon-48.png favicon.ico`) — most image generators
  can't emit `.ico` directly.
