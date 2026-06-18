---
name: logo-pack
description: Produces a production-ready logo pack for a product, service, or project — a tailored set of professional, diverse logo prompts (minimalist one-color, a monochrome variation, a comfortable/approachable variation, and a polished professional version, plus icon/wordmark/monogram). First checks whether a brand guide or logo already exists; if a logo exists it analyzes and refines it, otherwise it designs new directions. Use when the user wants a logo, brand mark, app icon, wordmark, favicon, logo prompts, or to refresh/refine an existing logo.
---

# Logo Pack

Turn a brand into a **production-ready logo pack** — a tailored, professional set of logo
directions and the prompts to generate them. The pack is diverse on purpose (several styles)
but every option is on-brand and specific to *this* product, never generic clip-art.

It is **brand-aware**: it reads `docs/brand.json` (the same brand-as-data file the rest of the
ship pack uses) and checks for an existing logo before doing anything.

## The first question: refine or create?

Always start by scanning what already exists:

```bash
node scripts/scan-brand.mjs        # or: --json
```

It reports the `brand.json`, any brand guide, and any existing logo files, then recommends:

- **A logo already exists → ANALYZE & REFINE.** Read the existing mark (look at the actual
  image), extract its visual DNA — forms, weight, color, personality — and produce *variations
  that stay true to it*: a one-color version, a monochrome version, a simplified app-icon, a
  cleaner refinement. Don't throw away brand equity unless the user explicitly asks to redesign.
- **No logo (or the user says "make a new one") → CREATE.** Design fresh directions from the
  brief. Still diverse-but-professional, still on-brand.

State which mode you're in and why.

## Build the brief

Before writing prompts, capture a short brief (save it to `docs/brand/logo-brief.md`):

- **Name** + **what it is** (one line) + **who it's for**
- **Personality** — 3–5 adjectives (from the tagline, brand, or ask the user)
- **Colors** — from `brand.json` (`brand`, `accent`, plus neutrals)
- **Must-work conditions** — small sizes, one color, dark and light backgrounds, app icon
- **Avoid** — clichés that don't fit (generic globes, swooshes, gears, gradients-for-no-reason)

If the product's purpose isn't clear from `brand.json`/context, ask the user one line about it.

## Write the prompt set

Produce a tailored prompt per style, following **[references/prompt-styles.md](references/prompt-styles.md)**.
Always include these four (the core set), then add supporting styles as useful:

| Style | What it's for |
|-------|---------------|
| **Minimalist one-color** | The simplest, flattest, single-color mark — the workhorse |
| **Monochrome variation** | Pure black / pure white — stamps, embossing, single-color print, watermarks |
| **Comfortable variation** | Warmer, rounder, friendlier — approachable without losing polish |
| **Professional / premium** | The refined, confident, corporate-grade version |
| *Icon / mark* | Standalone symbol with no text |
| *Wordmark* | The name set as a designed logotype |
| *Monogram* | The initials as a compact mark (great for favicons/app icons) |

Each prompt is **tailored to this product** (its purpose and audience drive the imagery), names
the brand colors, and specifies logo-grade output: flat/vector-like, high contrast, legible at
16px, transparent background, no stray text. Save all of them to `docs/brand/logo-prompts.json`.

## Generate (production step, generator-agnostic)

The skill writes prompts; you choose the engine. Hand `logo-prompts.json` to whichever is set up:

- **`using-local-ideogram4`** skill — best for **wordmarks/text** (Ideogram renders type well).
- **`gemini-imagegen`** skill (Nano Banana Pro) — strong for clean marks + quick variations.
- **Ad Lab** — `node D:/git/mkm/ad-lab/scripts/generate-image.js -p "<prompt>" -o docs/brand/logos/<id>.png`.
- **Replicate** (in-app) — model `google/nano-banana-2`.

Save outputs to `docs/brand/logos/<style-id>.png`. Generate 2–4 per prompt; logos are a
numbers game — make many, keep few.

## Review and iterate

Lay the candidates out (a simple contact sheet or just the folder), pick the strongest, then
refine that one with a follow-up prompt (tighten spacing, true the geometry, lock the color).
For the winner, export the standard set: full-color, one-color, monochrome, and a square app
icon / favicon. Update `brand.json` if the logo establishes or shifts the brand colors.

## Quality bar

- **Specific, not generic.** The mark should only make sense for *this* product. If the same
  logo would fit any company, the prompt is too vague.
- **Works in one color and at 16px.** If it dies when shrunk or flattened, it's not a logo.
- **On-brand.** Honor `brand.json` colors and the personality. Never use purple for the
  user's apps unless their brand says so.
- **Honest.** Prompts are starting points — generation always needs a human pick + a refine pass.
