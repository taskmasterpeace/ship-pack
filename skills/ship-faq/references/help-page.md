# Help page contract — `render-help.mjs` + brand.json

`docs/help.html` is produced by `scripts/render-help.mjs` from `docs/FAQ.md`. You normally just run
the script — this reference documents the contract so you can theme it, debug parsing, or extend it.

## Run it

```bash
node "<skill-dir>/scripts/render-help.mjs" \
  --in docs/FAQ.md --out docs/help.html \
  --brand docs/brand.json --version docs/VERSION --replies docs/support-replies.md
```

| Flag | Default | Purpose |
|------|---------|---------|
| `--in` | `docs/FAQ.md` | source FAQ (must follow the `## Category / ### Question` contract) |
| `--out` | `docs/help.html` | self-contained page to write |
| `--brand` | `docs/brand.json` | colors + fonts; falls back to built-in **non-purple** defaults |
| `--version` | `docs/VERSION` | stamped into the page header + footer |
| `--replies` | `docs/support-replies.md` | if present, adds a small internal note pointing agents to it |

It exits non-zero if the FAQ is missing or has zero parseable questions — fix the FAQ structure
(see `faq-template.md`) and re-run.

## What the page gives the user

- **Instant search** over every Q&A (question + answer text), client-side, no backend. Multi-term
  AND matching; `/` focuses the box; an empty-state shows when nothing matches.
- **Topic sidebar** that filters to one category (or All), with per-topic counts.
- **Collapsible answers** (`<details>`), with a **Copy link** permalink per question and hash
  deep-linking (opening `help.html#<id>` expands and scrolls to that answer).
- Fully responsive; sidebar collapses to pill chips on narrow screens.

## brand.json — brand as data

One file themes every pack output. Create it if missing (this exact shape):

```json
{
  "name": "Acme",
  "tagline": "Run the job, not the inbox.",
  "colors": {
    "bg": "#0a0a0f", "surface": "#11141f", "border": "#1e2740", "border-soft": "#171d30",
    "text": "#e7edf6", "muted": "#8b9bb4", "heading": "#f6f9ff",
    "brand": "#2f7dff", "accent": "#FFDD00", "accent-ink": "#86b8ff",
    "grid": "rgba(0,86,210,.07)"
  },
  "fonts": { "display": "Bricolage Grotesque", "body": "Hanken Grotesk", "mono": "JetBrains Mono" }
}
```

Every key in `colors` becomes a `--<key>` CSS variable on `:root`; any you omit falls back to the
renderer's defaults. Drop a different `brand.json` and the page re-themes with no CSS edits — same
contract the user guide and what's-new pages use, so the whole pack matches.

## Hard rules for the HTML (do not break these)

- **Self-contained**: one file. The only external request is Google Fonts, and it degrades to
  system fonts if blocked. No build step, no bundler, no local assets required to open it.
- **Never purple by default.** The built-in defaults are blue (`--brand`) + amber (`--accent`).
  Only brand.json can change that, and the user's brand rule still wins (e.g. MyFieldTime = no
  purple ever).
- **No `backdrop-filter`** anywhere — it freezes/hangs some embedded renderers.
- **No SVG `feTurbulence`** (or other heavy SVG filters) — same reason. The only SVG is a tiny
  static search icon.
- **Works with JavaScript disabled**: all answers and links are present in the HTML; only search,
  filtering, and copy-link are progressive enhancements.
- **Accessible**: real `<details>/<summary>`, labelled search input, visible focus ring, honors
  `prefers-reduced-motion`.

## Extending it

The renderer is dependency-free and intentionally small. Reasonable extensions: a "Was this
helpful?" mailto/analytics hook, a category icon set keyed off the category id, or embedding the
guide's `[SCREENSHOT: id]` images inside answers (the screenshot-capture skill already produces
them — reuse, don't regenerate). Keep every addition inside the self-contained + no-hang rules
above. Re-render after any FAQ edit or release so the page and the version stamp stay in sync.
