# Logo Prompt Styles

A library of prompt templates, one per style. Fill the `{placeholders}` from the brief:
`{name}`, `{what}` (what it does), `{audience}`, `{brand}` (primary color hex/name),
`{accent}` (secondary), `{personality}` (3–5 adjectives), `{motif}` (a concrete, product-specific
image idea — the most important field).

The `{motif}` is what makes a logo specific. For a contractor app it might be "a blueprint
corner mark", "a level bubble", "a roof line forming an arrow"; for a log platform "a stacked
bars/timeline glyph". Spend your effort here — a great motif beats a great adjective.

## Output spec — append to every prompt

> flat vector logo, solid shapes, high contrast, centered, transparent background, no gradient
> unless specified, no photographic detail, no drop shadow, legible at 16px, no extra text, no
> letters except the ones requested, professional brand identity.

## The four core styles

### 1. Minimalist one-color
The workhorse — the simplest possible mark in a single brand color.
```
Minimalist single-color logo for {name}, {what}. A simple geometric {motif} rendered in one
flat color ({brand}) on transparent background. Maximum simplicity, generous negative space,
clean even strokes, instantly recognizable as a silhouette. {personality}. [output spec]
```

### 2. Monochrome variation
Pure black and pure white — for print, embossing, watermarks, single-color contexts.
```
Monochrome logo for {name}: the {motif} mark in solid black, designed to also work as a pure
white knockout on a dark background. No color, no gradient, strong silhouette that survives a
rubber stamp or an embossed business card. {personality}. [output spec]
```

### 3. Comfortable variation
Warmer and friendlier — rounded forms, softer geometry — approachable without losing polish.
```
Friendly, approachable logo for {name}, {what}, for {audience}. The {motif} drawn with rounded
corners and soft, organic geometry in {brand} with a touch of {accent}. Warm and human, inviting
not corporate, but still clean and modern. {personality}. [output spec]
```

### 4. Professional / premium
The refined, confident, corporate-grade version.
```
Premium, refined logo for {name}, {what}. A precise, balanced {motif} mark in {brand}, with
exact geometry, confident weight, and timeless restraint — the kind of identity a trusted,
established brand would own. Subtle use of {accent} only if it strengthens it. {personality}.
[output spec]
```

## Supporting styles (add when useful)

### Icon / mark (symbol only)
```
Standalone logo symbol (no text) for {name}: a {motif} mark in {brand}, balanced inside an
invisible square, designed to stand alone as an app icon or favicon. [output spec]
```

### Wordmark (logotype) — best generated with Ideogram for clean type
```
Wordmark logo: the word "{name}" set as a custom logotype, modern geometric sans-serif, tight
even spacing, in {brand}. {personality}. Optionally a tiny {motif} integrated into one letter.
Correct spelling, no extra characters. [output spec]
```

### Monogram (initials)
```
Monogram logo for {name}: the initials "{initials}" combined into one compact, balanced mark in
{brand}, suitable for a favicon and an app icon. Clever but legible letterform interlock. [output spec]
```

### Emblem / badge (enclosed)
```
Emblem logo for {name}, {what}: the {motif} and the name enclosed in a clean badge/seal, modern
not vintage, in {brand} and {accent}. Balanced, official, trustworthy. [output spec]
```

## Tailoring rules

- **Anchor on the {motif}, not adjectives.** Brainstorm 3–5 product-specific motif ideas first;
  the same four style prompts with a strong motif beat generic ones.
- **Honor `brand.json`.** Use its real `brand`/`accent` hex values; respect any "no purple" rule.
- **One idea per mark.** A logo is one clear thought, not three combined.
- **Refine-mode prompts** (existing logo): describe the *current* mark's DNA first, then ask for
  the variation ("same rounded blueprint-corner mark, but as a one-color white knockout") so the
  family stays consistent.

## Negative-prompt guidance (avoid the AI-logo clichés)

Avoid unless genuinely apt: generic globes, swooshes, abstract gradient blobs, gears, light
bulbs, checkmarks-in-circles, hexagon tech badges, hands-shaking, mountains-and-sun, fake Latin
text, mangled lettering, photographic textures, heavy bevels and 3D drop shadows.

## Worked example — a contractor app called "MyFieldTime", Trust Blue #0056D2

Motif ideas: a blueprint corner registration mark · a roof line forming a forward arrow · a
clock built from a level bubble · an "MFT" monogram as a folded blueprint.

Minimalist one-color → "Minimalist single-color logo for MyFieldTime, a jobsite project hub. A
simple geometric blueprint corner-mark with a small bubble-level center, in one flat Trust Blue
(#0056D2) on transparent background. Maximum simplicity… [output spec]"
