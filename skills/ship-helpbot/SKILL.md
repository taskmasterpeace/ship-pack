---
name: ship-helpbot
description: >-
  Builds an embeddable "ask the guide" assistant for any app: chunks the project's user-guide
  markdown into docs/guide-index.json, emits a framework-agnostic <ship-helpbot> web component,
  and a reference /api/ask-docs route that retrieves the top sections and asks an LLM to answer
  WITH citations to guide anchors. Model-pluggable (Claude API, Vercel AI Gateway, or local
  Ollama). Use when the user wants an in-app help bot, docs chatbot, "ask the docs/guide"
  widget, support assistant, RAG over the user guide, embeddable help search, or "answer
  questions from my documentation." Triggers on "ask the guide", "help bot", "docs chatbot",
  "ask-docs", "in-app help assistant", "chat with my user guide", "guide search widget".
---

# Ship Helpbot

## Purpose

Turn the user guide you already have into an **in-app assistant** users can ask in plain
language — and that answers **only from the guide, with citations** that deep-link to the exact
section. Two drop-in pieces do this in any app:

1. **`<ship-helpbot>`** — a self-contained, themeable web component (a floating "Ask the guide"
   launcher + chat panel). Plain HTML, React/Next, Vue, Svelte, Astro — anywhere.
2. **`/api/ask-docs`** — a reference server route: it retrieves the top guide sections and asks
   an LLM to answer using only those, returning `{ answer, citations }`.

A small script chunks the guide markdown into `docs/guide-index.json` (the retrieval corpus).
The retrieval ranking is dependency-free and runnable on the CLI, so you can verify answer
quality **before** any API key is involved. The LLM is **pluggable** behind an adapter (Claude /
Vercel AI Gateway / local Ollama), so the same code runs on any stack.

This is grounded retrieval over your own docs — not a general chatbot. If the guide doesn't cover
something, the bot says so instead of inventing steps.

## Part of the "ship" pack

This skill consumes the output of [`user-guide-builder`](../user-guide-builder/SKILL.md) and shares
the same `docs/VERSION` anchor and `docs/brand.json` theming as the rest of the pack:

```
docs/VERSION  ← single source of truth (semver)
  ├─ user-guide-builder → writes docs/user-guide/<Guide>.md + renders <Guide>.html (anchors = heading slugs)
  ├─ ship-helpbot       → chunks that .md into guide-index.json; answers cite the SAME anchors  (this skill)
  ├─ shipping-log       → "what changed" (the bot can point users to what's new)
  └─ screenshot-capture → the images the guide references
```

Because the index reuses the guide renderer's anchor slugs, a citation like `▸ Change Orders`
links straight to `/help#change-orders` in the rendered guide. Re-run the chunker on each release.
Also relevant: [`logo-pack`](../logo-pack/SKILL.md) for the launcher mark if you want one.

## Discovery first — check what already exists

Before building anything, run this discovery so you don't clobber or duplicate work:

```bash
node "<skill-dir>/scripts/version.mjs" get 2>/dev/null   # current docs version (or init it)
ls docs/brand.json docs/guide-index.json 2>/dev/null     # brand tokens? a prior index?
ls docs/user-guide/*.md docs/user-guide.md USER_GUIDE.md 2>/dev/null   # the guide to chunk
ls public/ship-helpbot.js public/guide-index.json 2>/dev/null         # widget already deployed?
ls app/api/ask-docs/route.* pages/api/ask-docs.* 2>/dev/null          # route already wired?
```

Interpret the results:

- **No guide markdown** → stop and run `user-guide-builder` first (`/ship-guide`). The helpbot is
  only as good as the guide; there is nothing to chunk without it. Say so plainly.
- **No `docs/brand.json`** → the widget falls back to on-brand neutral defaults (never purple).
  Offer to create `brand.json` (see [`logo-pack`](../logo-pack/SKILL.md) / the pack) so the launcher
  matches the app, but don't block on it.
- **A prior `guide-index.json`** → you're refreshing; rebuild it from the current guide.
- **An existing route/widget** → update in place; don't create a competing second copy.
- **No version anchor** → `node "<skill-dir>/scripts/version.mjs" init 0.1.0` and say so.

`<skill-dir>` is this skill's folder. Use the absolute path the slash command passes, or
`${CLAUDE_PLUGIN_ROOT}/skills/ship-helpbot`.

## Workflow

### 1. Build the retrieval index from the guide

```bash
node "<skill-dir>/scripts/build-index.mjs" \
  --in docs/user-guide/<Guide>.md --out docs/guide-index.json \
  --version docs/VERSION --brand docs/brand.json
```

- Omit `--in` to auto-discover the guide (`docs/user-guide/*.md`, then `docs/user-guide.md`, …).
- Each `##`/`###` heading becomes one section: `{ id, title, level, anchor, breadcrumb, text, tokens }`.
  Anchors are the **same slugs** the guide's HTML renderer emits, so citations deep-link.
- Empty heading shells (no real prose) are dropped; YAML front-matter and `[SCREENSHOT:]` markers
  are stripped. Tune granularity with `--min-level`/`--max-level` (default h2–h3).
- The script prints section count + word total. If it reports very few sections, the guide is thin —
  fix the guide (run `user-guide-builder`), not the chunker.

### 2. Verify retrieval BEFORE involving an LLM

```bash
node "<skill-dir>/scripts/retrieve.mjs" --index docs/guide-index.json --q "how do I add a change order"
```

This runs the exact ranking the route uses (BM25-lite + title boost) and prints the top sections
with scores. If the right section isn't on top, the bug is in chunking or the guide — catch it here,
cheaply. Try 3–5 real user questions. This step is the quality gate.

### 3. Emit the widget (themed from brand.json)

```bash
node "<skill-dir>/scripts/build-widget.mjs" \
  --out public/ship-helpbot.js --brand docs/brand.json \
  --endpoint /api/ask-docs --src /guide-index.json
```

Writes one self-contained custom-element file. Colors/fonts come from `brand.json` (baked in,
also overridable at runtime via `--shb-*` host CSS). **No purple default, no `backdrop-filter`,
no SVG `feTurbulence`** — per the pack's HTML rules; Shadow DOM isolates it from host CSS; honors
`prefers-reduced-motion`. Also copy `guide-index.json` to where it's served (e.g. `public/`).

### 4. Wire the `/api/ask-docs` route

Read **[references/api-route.md](references/api-route.md)** and create the route for the app's stack
(Next.js route shown in full; Express/SvelteKit/Remix/edge notes included). Copy
`scripts/retrieve.mjs` into the app (e.g. `lib/ship-helpbot/retrieve.mjs`) and `import { rank }` —
do not re-implement ranking. Pick the model adapter via `HELPBOT_PROVIDER` env var.

### 5. Embed the component

Read **[references/embedding.md](references/embedding.md)** and add the two lines (script + tag) to
the app's root layout. Set `guide="/help"` (or wherever the rendered guide is served) so citations
deep-link. Verify the launcher appears, ask a real question, confirm an answer + a working citation.

### 6. Report

Tell the user: index path + section count + version stamped, the widget/route files written, which
model provider is wired (and the env vars it needs), and any gaps (e.g. "guide is thin on billing —
the bot will say it can't answer billing questions"). Do **not** paste the whole index into chat.

## Model adapters (pluggable, nothing assumed installed)

Pick at runtime with `HELPBOT_PROVIDER`. Full code in [references/api-route.md](references/api-route.md).

| Provider | `HELPBOT_PROVIDER` | Needs | Use when |
|----------|--------------------|-------|----------|
| Anthropic Claude (direct) | `claude` | `ANTHROPIC_API_KEY` | best answer quality; check `claude-api` skill for model ids |
| Vercel AI Gateway | `gateway` | `AI_GATEWAY_API_KEY` | one key, many models, failover; app already on Vercel |
| Local Ollama (LAN/offline) | `ollama` | `OLLAMA_URL` (e.g. `http://localhost:11434`) | private/offline; no per-token cost |

Adapters are referenced via env, not assumed installed — if a provider isn't configured the route
fails soft (502 + friendly message) and the widget still links to the guide. If the repo already
uses the Vercel **AI SDK**, prefer `generateText` (see the `vercel:ai-sdk` skill) over raw fetch.

## Quality bar

The helpbot isn't done until all of these hold:

- **Grounded, not generative.** Answers come only from retrieved sections. Off-guide questions get
  an honest "I couldn't find that in the guide," never a fabricated feature, price, or step.
- **Real citations that deep-link.** Every answer that uses the guide shows ≥1 citation chip whose
  anchor opens the matching section in the rendered guide. Click one and verify it lands.
- **Retrieval verified without an LLM.** You ran `retrieve.mjs` on real questions and the right
  sections ranked first. (If retrieval is wrong, the LLM can't save it.)
- **On-brand, self-contained widget.** Themed from `brand.json`; no purple default; no
  `backdrop-filter`/`feTurbulence`; Shadow-DOM isolated; respects reduced motion; one file, no deps.
- **Pluggable + portable.** Provider swaps via one env var; the same two pieces drop into any app;
  nothing hardcoded to one project. Index, widget, and route all read brand/version where relevant.
- **Hardened.** Input validated and length-capped, route rate-limited, keys server-side, `src` never
  used as a filesystem path. See the hardening checklist in `references/api-route.md`.
- **Honest about coverage.** Your report names the topics the guide is thin on, so expectations match.

A bot that confidently invents steps is worse than no bot. Grounding + citations are non-negotiable.

## Worked example

A full input→output trace (guide slice → `guide-index.json` → ranked retrieval → grounded, cited
answer, including the honest-failure case) is in **[references/worked-example.md](references/worked-example.md)**.

## Files in this skill

- `scripts/build-index.mjs` — chunk the guide markdown into `docs/guide-index.json` (run it).
- `scripts/retrieve.mjs` — dependency-free BM25-lite ranking; CLI verifier **and** the `rank()`
  the route imports. Don't reinvent retrieval; import this.
- `scripts/build-widget.mjs` — emit the themed, self-contained `<ship-helpbot>` web component.
- `scripts/version.mjs` — the shared semver anchor manager (byte-identical across the pack).
- `references/api-route.md` — the `/api/ask-docs` route, system prompt, the three model adapters,
  full Next.js code, and the hardening checklist.
- `references/embedding.md` — how to embed `<ship-helpbot>` in HTML/Next/Vue/Svelte/Astro; attributes; theming.
- `references/worked-example.md` — one concrete input→output trace.
