---
name: ship-email
description: >-
  Turns a shipped release into audience-tailored announcement assets — a customer email (themed
  HTML + plain-text), an in-app "What's new" modal snippet, and a short social post — all in the
  product's brand voice, written separately for homeowners vs. investors vs. crew (or any custom
  audience). Reads docs/SHIPPING-LOG.md for what shipped and docs/brand.json for colors + fonts, and
  writes everything to docs/announcements/<version>/. Use when the user wants to announce a release,
  write a launch or update email, a "what's new" email or modal, release-announcement copy, a
  customer/investor update, or a social post for a feature — or says "announce this", "email about
  the release", "tell our customers what shipped", "what's new email". Part of the /ship-* pack.
---

# Ship Email

## Purpose

A release is "done" in git but not in the world until the people who care hear about it — in
*their* terms. This skill takes one version's shipping-log entry and re-tells it for a chosen
audience, producing four ready-to-send assets:

| Asset | File | What it's for |
|---|---|---|
| Customer email (HTML) | `email.html` | Branded, email-client-safe HTML (table layout). |
| Customer email (text) | `email.txt` | Plain-text fallback — deliverability + accessibility. |
| In-app "What's new" | `whats-new.html` | Drop-in modal snippet, themed via CSS variables. |
| Social post | `social.txt` | Short post + char count + hashtags + link. |

The point is **audience tailoring**: a homeowner, an investor, and a crew lead get genuinely
different copy from the same release — not the same blast with the names swapped.

## Part of the /ship-* pack

This skill consumes what the rest of the pack produces and shares the `docs/VERSION` anchor:

```
docs/VERSION              ← single source of truth (semver)
docs/brand.json           ← colors + fonts (brand-as-data) — themes every output
docs/SHIPPING-LOG.md      ← what shipped, per version (this skill's INPUT)
   ├─ ship-changelog (shipping-log)   → writes the shipping log this skill reads
   ├─ ship-guide (user-guide-builder) → "how it now works" (link it in the email)
   ├─ ship-screenshots (screenshot-capture) → feature art you can attach/reference
   ├─ ship-logos (logo-pack) / ship-brand    → establish brand.json tokens + the wordmark
   └─ ship-promo                       → a promo-video plan for the same release
```

If there's no shipping log yet, run `/ship-changelog` first — that's the upstream source of truth.

## Workflow

### 1. Discover what exists (always first)

Never guess the version or invent history. Run the bundled scan from the repo root:

```bash
node "<skill-dir>/scripts/scan-release.mjs" --json          # or omit --json for a readable summary
node "<skill-dir>/scripts/scan-release.mjs" --version 0.8.0  # announce a specific version
```

It reports: the resolved version (from `docs/VERSION` or `--version`), the matching
`docs/SHIPPING-LOG.md` entry and its body, whether `docs/brand.json` exists, any **prior
announcements** under `docs/announcements/`, and a `warnings[]` list. Read it before acting.

**Handle what it tells you honestly:**
- *No shipping log / no matching entry* → run `/ship-changelog` (or ask the user for the notes).
  Do not fabricate features.
- *No `docs/brand.json`* → the renderer falls back to a neutral, **non-purple** theme; offer to run
  `/ship-logos` or `/ship-brand` to set real tokens. Never invent a palette.
- *Target folder already populated* → confirm before overwriting; or render an audience-suffixed
  variant alongside (see the schema reference).

### 2. Pick the audience(s)

Ask if unstated. Read `references/audiences-and-voice.md` — it has a profile (lead value,
vocabulary, proof, CTA, tone) for `homeowner`, `investor`, and `crew`, plus how to derive a custom
audience from the same four moves. **One audience per content file.** If the user wants several,
produce one content file (and one set of assets) per audience — don't blend them.

### 3. Load the voice + the real release content

- Read the brand voice from `docs/brand.json` (`tagline`, any `voice`/`tone` fields) and honor every
  brand rule (e.g. **no purple, ever**). Match the product's existing register, not a generic
  newsletter voice.
- Read the target version's body from `docs/SHIPPING-LOG.md` (the scan gave you its location).
  **Translate, don't transcribe:** turn each shipped bullet into the chosen audience's stakes.

### 4. Write the content file

Copy `assets/content.example.json` to `docs/announcements/<version>/content.json` and fill it for
the audience. Schema + a full input→output worked example: `references/content-schema-and-example.md`.
Write **plain text** in every field (the renderer escapes HTML for you). Aim for 2–5 `items[]`,
benefit-first; a specific, ≤55-char `subject`; a `preheader` that complements (not repeats) it.

### 5. Render the assets

```bash
node "<skill-dir>/scripts/render-email.mjs" \
  --in docs/announcements/<version>/content.json \
  --outdir docs/announcements/<version> \
  --brand docs/brand.json
```

Writes `email.html`, `email.txt`, `whats-new.html`, `social.txt`. The script themes everything from
`brand.json`. Because email renders on a light card, it keeps the brand's accent/brand color but
**forces body/heading/muted ink to a readable dark value whenever a brand token is too light for a
white background** (the common dark-theme case — e.g. a light `text` token with no `surface`), so
copy is never near-white-on-white. It prints a summary: theme colors, any ink it had to swap, the
social char count, and warnings if `items[]` is empty or `unsubscribeUrl` is missing.

### 6. Review against the quality bar + report

Open `email.html` to eyeball it (it's a single self-contained file). Run the anti-generic checklist
in the voice reference. Then report to the user: the version + audience, the four file paths, the
subject line, and the social char count. If anything was staged/un-merged, say so plainly — don't
imply staged work is live. Offer to render another audience, or to run `/ship-promo` for a video.

## Quality bar

A draft ships only if **all** of these hold:

- **Audience-true.** A homeowner email and an investor email for the same release read differently
  — different lead value, vocabulary, proof, and CTA. If you could send one copy to all three, redo it.
- **Evidence-based.** Every claim traces to a real entry in `docs/SHIPPING-LOG.md`. No invented
  features, no invented metrics, no implied security breach. Unclear impact → inspect or omit.
- **Benefit-first, jargon-free.** Lead with what the reader can now do, not the implementation.
  "Refactored finance module" → "See exactly where your budget is going."
- **Specific subject.** Passes the ≤55-char, benefit-first test; would NOT fit any other product.
- **Honest about ship status.** Un-merged/un-deployed work is "rolling out", never "live."
- **On-brand + safe HTML.** Themed from `brand.json` (never purple by default); `email.html` and
  `whats-new.html` are self-contained, themeable via `:root`/scoped CSS variables, and use **no
  `backdrop-filter` and no SVG `feTurbulence`** (both hang renderers / get stripped by mail clients).
- **Deliverable.** A plain-text part exists alongside the HTML; bulk mail includes an unsubscribe.

## Cross-project notes

- **Generic by design.** Nothing is hardcoded to one app. The scan probes common locations
  (`docs/VERSION`, `docs/SHIPPING-LOG.md` / `CHANGELOG.md`, `docs/brand.json`) and degrades
  gracefully when they're absent. Works in any repo.
- **Tool-agnostic delivery.** This skill produces files; it does not assume an ESP is installed.
  To actually send, hand `email.html` + `email.txt` to whatever the user has via an adapter — paste
  into Mailchimp/Resend/Customer.io/SendGrid, attach to a Gmail draft, or commit the modal snippet
  into the app. Reference those tools; never assume them.
- **Re-runnable.** Regenerate any time the release notes or brand change — outputs are deterministic
  from `content.json` + `brand.json`.

## Files in this skill

- `scripts/scan-release.mjs` — discovery: resolves version, finds the shipping-log entry + brand,
  flags prior announcements and missing inputs. Dependency-free. Run it first.
- `scripts/render-email.mjs` — renders the four assets from `content.json`, themed by `brand.json`.
  Dependency-free, email-client-safe, no purple / no `backdrop-filter` / no `feTurbulence`. Forces
  body/heading/muted ink to a readable dark value when a brand token is too light for the white
  email card (dark-theme brands), and warns on empty `items[]` or a missing `unsubscribeUrl`.
- `assets/content.example.json` — ready-to-edit content file (the worked example's input).
- `references/audiences-and-voice.md` — audience profiles, the four tailoring moves, brand-voice
  rules, and the anti-generic + subject-line checklists.
- `references/content-schema-and-example.md` — the `content.json` schema and a full input→output
  worked example for all four assets.
