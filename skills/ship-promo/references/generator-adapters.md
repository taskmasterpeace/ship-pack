# Generator adapters — prompts that any tool can run

`ship-promo` produces a **plan**, not a render. Each shot in `shotlist.md` carries a
tool-agnostic prompt; this file maps those prompts to whatever generator the user actually has.
**Adapters, not assumptions** — detect a tool before emitting its command; if you can't confirm
it, write the prompt anyway and mark the adapter "not detected."

## The neutral prompt spec (write this first, in the shotlist)

Every shot prompt should be a single line that names, in order:

1. **Subject + action** — what's happening (the verb matters: "assembles," "approves," "scrolls").
2. **Framing** — close-up / wide / push-in / overhead; aspect ratio if it matters (9:16 social, 16:9 hero).
3. **Light + mood** — "golden hour," "blueprint dusk," "clean studio."
4. **Brand color cues** — pull hexes from `docs/brand.json` (e.g. brand `#2f7dff`, accent
   `#FFDD00`, bg `#0a0a0f`). Put the accent on one focal object, not everywhere.
5. **Fidelity** — "photoreal," "UI-accurate screen recording," "soft 3D render."
6. **Negatives** — what to avoid (e.g. "no purple, no lens flare, no text artifacts").

Keep UI shots as **real screenshots** whenever discovery found them — no generator beats the
actual app for honesty. Use generators for hero b-roll, transitions, and the end card.

## Detecting a tool (cheap checks, repo-root)

Run only what's plausible; absence is fine.

```bash
# Ad Lab (image/voice/music/video CLIs)
ls "D:/git/mkm/ad-lab/scripts" 2>/dev/null

# Directors Palette (local API / skill)
ls "D:/git/directors-palette-v2" 2>/dev/null

# Local Ideogram (Pinokio launcher)
ls "D:/pinokio/api/ideogram4" 2>/dev/null
```

Paths vary per machine — treat the ones above as examples, confirm before using. If a
project-local generator exists (a `scripts/generate-*.mjs`, a Makefile target), prefer it.

## Adapter: Ad Lab (`generate-*` scripts)

Marketing production CLIs. Each shot maps to a clip; stitch with the merge tool.

```bash
# 1. Still / keyframe per shot
node "D:/git/mkm/ad-lab/scripts/generate-image.js" -p "<shot prompt>" -o "docs/promo/frames/shot-01.jpg"

# 2. Animate the still into a clip
node "D:/git/mkm/ad-lab/scripts/generate-video.js" -p "<motion: push-in, 3s>" -i "docs/promo/frames/shot-01.jpg" -o "docs/promo/clips/shot-01.mp4"

# 3. Voiceover from the script (one beat at a time, or the whole VO)
node "D:/git/mkm/ad-lab/scripts/generate-voice.js" -t "<VO line>" -o "docs/promo/audio/vo.mp3"

# 4. Background music (instrumental, energy matches the curve)
node "D:/git/mkm/ad-lab/scripts/generate-music.js" -g cinematic --instrumental -o "docs/promo/audio/bed.mp3"

# 5. Merge: duck the music under the VO
node "D:/git/mkm/ad-lab/scripts/merge-audio-video.js" --video "docs/promo/clips/cut.mp4" --voice "docs/promo/audio/vo.mp3" --music "docs/promo/audio/bed.mp3" --duck -o "docs/promo/promo.mp4"
```

There is also a one-shot `create-campaign.js`; if present, `--dry-run` it first to preview.

## Adapter: Directors Palette

AI storyboard / shot generation. If the `directors-palette` skill is available, hand it the
shotlist (it batches character-consistent shots and can animate via Seedance/Wan). Otherwise
use its local API per that project's docs. Best when shots need a consistent character or
recurring "host."

## Adapter: local image/video tools

- **Local Ideogram 4** (`using-local-ideogram4` skill / Pinokio at `D:/pinokio/api/ideogram4`)
  — strong for brand-colored stills and end cards.
- **Wan 2.2 batch** (`wan-batch-animation` skill) — animate a folder of `<shot>.png` + `<shot>.txt`
  pairs into clips. Write the shotlist frames as that pair format and run the batch.
- **Seedance** (`seedance-animation` skill) — directed image-to-video with camera moves.

Map the neutral prompt to whichever is installed; the prompt text does not change, only the runner.

## Adapter: none detected

Still ship the plan. In the report, list each adapter as "not detected" and say what to install
(or that the user can paste the prompts into any web tool). The voiceover, shotlist, and
storyboard are useful with zero generators — they're the hard part; rendering is the easy part.

## Stitching order (whatever the renderer)

1. Lock the **VO** first — it sets the timing the estimator computed.
2. Generate/collect **frames** per shot; prefer real screenshots.
3. Animate to **clips** at the shot durations from the shotlist.
4. Lay a **music bed** matching the energy curve; duck under VO.
5. Add **on-screen text / lower-thirds** in the brand fonts from `brand.json`.
6. End on the **brand card** (wordmark + tagline + CTA, accent color).

Keep the cut honest: real app footage for feature claims, generated b-roll for mood only.
