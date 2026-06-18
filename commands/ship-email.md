---
description: Turn a shipped release into audience-tailored announcement assets — a branded HTML + plain-text customer email, an in-app "What's new" modal snippet, and a short social post — written separately for homeowners, investors, or crew in the project's brand voice, from docs/SHIPPING-LOG.md + docs/brand.json. Outputs to docs/announcements/<version>/.
argument-hint: "[homeowner|investor|crew (audience) · v0.8.0 (version) · \"announce the money portal\"]"
---

Use the `ship-email` skill to produce audience-tailored release announcement assets for THIS
project. Skills live in `${CLAUDE_PLUGIN_ROOT}/skills`; outputs go in this project's
`docs/announcements/<version>/`.

**Read "$ARGUMENTS"** for the audience (`homeowner` / `investor` / `crew`, or a custom one), a
specific version (e.g. `v0.8.0`), and any angle to lead with. If no audience is given, ask which one
(don't blend them); if no version, the scan resolves it from `docs/VERSION`.

1. **Discover first** — run the scan from the repo root and read its output:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/ship-email/scripts/scan-release.mjs" --json
   ```
   It resolves the version, finds the matching `docs/SHIPPING-LOG.md` entry + `docs/brand.json`,
   flags prior announcements, and lists missing-input warnings. Handle them honestly:
   no shipping log → run `/ship-changelog` first; no `brand.json` → neutral non-purple theme, offer
   `/ship-logos` or `/ship-brand`; target folder already populated → confirm before overwriting.

2. **Tailor the copy** — read `references/audiences-and-voice.md`, pick the audience, and translate
   the release notes into that reader's stakes (lead value, vocabulary, proof, CTA). Honor every
   brand rule (e.g. no purple). Never invent a feature or metric; mark staged work as "rolling out."

3. **Write the content file** — copy `assets/content.example.json` to
   `docs/announcements/<version>/content.json` and fill it for the audience (plain text; benefit-first
   items; specific ≤55-char subject). Schema + worked example: `references/content-schema-and-example.md`.

4. **Render the four assets:**
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/ship-email/scripts/render-email.mjs" ^
     --in docs/announcements/<version>/content.json ^
     --outdir docs/announcements/<version> --brand docs/brand.json
   ```
   Produces `email.html` (themed, email-client-safe), `email.txt`, `whats-new.html` (in-app modal),
   and `social.txt`. The renderer keeps the brand color but forces body/heading ink to a readable
   dark value when a brand token is too light for the white email card (dark-theme brands), and warns
   if `items[]` or `unsubscribeUrl` is missing — act on those warnings before sending bulk mail. For
   more audiences, repeat with audience-suffixed content files.

5. **Report** the version + audience, the four file paths, the subject line, and the social char
   count. Offer to render another audience, hand the email to the user's ESP/Gmail, or run
   `/ship-promo` for a matching launch video.

(Part of the /ship-* pack: `/ship-changelog` writes the log this reads, `/ship-guide` documents how
it works, `/ship-brand` + `/ship-logos` set the brand tokens, `/ship-promo` makes the video.)
