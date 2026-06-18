# Product Hunt assets + launch-day checklist

The launch kit's second half: the copy you paste into a Product Hunt (or Hacker News / Reddit /
Indie Hackers) submission, plus a dated, do-it list for launch day. Same honesty bar as the press
release — no fabricated metrics, no fake social proof.

Write these into `docs/press/launch-kit.md` (one file, sections below) unless the user wants splits.

---

## 1. Product Hunt submission assets

### Tagline (the "one-liner")
- **Hard limit: 60 characters.** It shows next to the name in the feed. Don't eyeball the count —
  **verify it programmatically** with `scripts/check-counts.mjs` (see "Verify counts" below). An
  off-by-a-few here silently breaks the submission.
- Says **what it is + who it's for**, not how it feels. Start from `brand.json.tagline` but tighten it
  to a benefit. No "the best", no "revolutionary".
- Worked shape: *"{Outcome} for {audience}"* or *"{Category} that {does the thing}"*.
- Provide **3 options** ranked, with the char count after each, e.g. `Run your jobs, not your inbox (29)`.
  Write them as a list under a `## Tagline` heading — a numbered list (`1.` `2.` `3.`) or `- * +`
  bullets both work; `check-counts.mjs` parses either and strips the trailing `(NN)` before counting.

### Description (the body)
- **2–3 sentences, ~260 characters.** First sentence = the problem. Second = what the product does.
  Third (optional) = the proof or the "for" (who it's for / what plan).
- Plain, scannable, no marketing throat-clearing. End with a soft hook, not a hard sell.
- Pull the substance from the latest release's headline capabilities (the same bullets as the press
  release "What's new"). No new claims that aren't in the source.

### Maker's first comment (the most important asset)
This is what converts. It is a **first-person note from the maker**, ~120–180 words, in this arc:
1. **Hi, I'm {maker} / we're the {Product} team.** (Use the real name the user gives; otherwise a
   first-party team voice — never a fake persona.)
2. **The itch** — the real problem that made you build it (grounded in the release / repo context).
3. **What it does today** — 2–3 concrete capabilities (from the shipping log), honestly scoped
   (say what's in beta / which plan).
4. **What's next** — one honest near-term line (only if you can support it).
5. **The ask** — "I'd love your feedback on {specific thing}." A real question beats "please upvote".

Rules: first person, warm but not breathless, no fabricated traction ("we hit 10k users" — only if
true), no fake humility. If you don't know the maker's name, write it in team voice and flag
`[CONFIRM MAKER NAME]`. **If `brand.json` declares a voice/tone** (surfaced by `collect-launch.mjs`
as `report.voice`), write the comment in it — honor its tone, personality, and do/don't/words lists
rather than improvising a generic founder tone.

### Gallery / thumbnail notes
List the assets `collect-launch.mjs` found (logos under `docs/brand/logos`, screenshots under
`docs/screenshots`) and what's still needed: a 240×240 thumbnail (logo), and 3–5 gallery images
(1270×760) — typically the best screenshots. If screenshots are missing, point to the
**screenshot-capture** skill to produce them; don't ship a kit that claims images exist when they don't.

### Topics / tags
Suggest 2–3 relevant Product Hunt topics from the product category (e.g. "Productivity",
"SaaS", "Construction") — inferred from brand/repo, not invented affiliations.

### Verify counts (do this, don't trust the eyeball)
After writing `launch-kit.md`, run the count-checker over it so the hard 60-char tagline limit is
enforced mechanically:

```bash
node "<skill-dir>/scripts/check-counts.mjs" --in docs/press/launch-kit.md
```

`<skill-dir>` is this skill's folder — substitute the absolute path when you copy the command (e.g.
`${CLAUDE_PLUGIN_ROOT}/skills/ship-press`); the `/ship-press` slash command already hardcodes it.

It reads each Tagline option — bullets (`- * +`) **or** a numbered list (`1.` `2.` `3.`) — and the
Description back out of the file and prints `OK`/`OVER` with the
real Unicode code-point count (so emoji and accents count the way the platform counts them), and
**exits non-zero if any tagline is over 60** or the description blows the max. Fix every `OVER` line
and re-run. While drafting a single line you can check it directly:
`check-counts.mjs --tagline "Run your jobs, not your inbox"`.

---

## 2. Launch-day checklist

A concrete, orderable list. Adapt the channels to what the user actually has (don't assume a
Twitter/X account exists). Group as **Before**, **Launch hour**, **During the day**, **After**.

### Before (the day before)
- [ ] Press release reviewed, every `[ADD …]` placeholder filled or consciously left.
- [ ] Tagline + description + maker comment proofread; char counts under limits.
- [ ] Thumbnail (240×240) and 3–5 gallery images (1270×760) exported and named.
- [ ] Demo login / sandbox works for a cold visitor (test in a private window).
- [ ] First-comment drafted and saved (you paste it the second you go live).
- [ ] Schedule the PH launch for **12:01am PT** (the standard window) if using Product Hunt.

### Launch hour
- [ ] Submit / publish. Paste the maker's first comment immediately.
- [ ] Post the launch to your own channels (only the ones you have) with a direct link.
- [ ] Notify anyone who asked to be told — personally, not a blast.

### During the day
- [ ] Reply to **every** comment within ~15 min, in the maker voice. Answer the real question.
- [ ] Watch for bugs reported by new users; hotfix or acknowledge honestly.
- [ ] Share one genuine milestone if it happens ("we're #3 for the day") — only if true.

### After
- [ ] Thank commenters and early users.
- [ ] Write down what worked / what broke (feeds the next `ship-release`).
- [ ] Fold real feedback into the backlog; if it changes the product, it changes the next changelog.

Render none of this as hype. The checklist is an operational doc — keep it terse and checkable.

---

## Cross-pack handoffs

- Missing screenshots → **screenshot-capture** skill (config-driven, repeatable).
- No logo/thumbnail → **logo-pack** skill (produces icon/wordmark/favicon prompts + images).
- The release this kit describes comes from **shipping-log**; cut the version with **ship-release**.
- Need the "how to use it" companion link → **user-guide-builder** output.
