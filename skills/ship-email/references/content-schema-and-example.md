# content.json schema + a full worked example

`render-email.mjs` reads ONE small JSON file and emits all four assets. You write the JSON; the
script handles HTML escaping, table layout, plain-text wrapping, and theming from `brand.json`.
**Write plain text in every field** — never embed HTML; it is escaped at render time.

## Schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `product` | string | recommended | Falls back to `brand.name`. |
| `tagline` | string | optional | Falls back to `brand.tagline`. Shows under the headline. |
| `version` | string | recommended | e.g. `"v0.8.0"`. Omit from the **subject** for homeowners. |
| `audience` | string | recommended | `homeowner` \| `investor` \| `crew` \| custom. Recorded in output. |
| `subject` | string | **yes** | The email subject. Specific + benefit-first + ≤ 55 chars. |
| `preheader` | string | recommended | Inbox preview text. Complements the subject, doesn't repeat it. |
| `headline` | string | recommended | Big in-email title. Defaults to `subject`. |
| `greeting` | string | optional | e.g. `"Hi Sarah,"`. Defaults to `"Hi there,"`. |
| `intro` | string | recommended | 1–2 sentences setting up the news in the reader's stakes. |
| `items[]` | array | **yes** | Each `{ "title": "...", "body": "..." }`. 2–5 items. Benefit-first. |
| `cta` | object | optional | `{ "label": "...", "url": "..." }`. Drives the button + plain-text + social link. |
| `signoff` | string | optional | e.g. `"— The Acme team"`. |
| `footer` | string | optional | Why-you're-getting-this line. |
| `unsubscribeUrl` | string | optional* | Adds an Unsubscribe link to the footer. *Required for bulk/marketing mail (CAN-SPAM); the renderer prints a warning if it's absent. Omit only for a transactional send. |
| `modalTitle` | string | optional | Title for the in-app "What's new" modal. Defaults to `headline`. |
| `social` | object | optional | `{ "network", "post", "hashtags":[], "url" }`. Drives `social.txt`. |

Unknown keys are ignored, so you can keep notes (e.g. `$comment`) inline. A ready-to-edit file
ships at `assets/content.example.json`.

## Worked example — input → output

**Input** (`docs/announcements/v0.8.0/content.json`, audience = homeowner — abridged):

```json
{
  "product": "MyFieldTime", "version": "v0.8.0", "audience": "homeowner",
  "subject": "See exactly where your project's money is going",
  "preheader": "Your new Money & Progress page, change-order sign-off, and more.",
  "headline": "Your project, finally clear at a glance",
  "greeting": "Hi Sarah,",
  "intro": "We shipped a few things that make it easier to see where your remodel stands — no spreadsheet, no phone tag.",
  "items": [
    { "title": "See where the money's going", "body": "One page shows how much of your budget is spent, what's left, and how far along the job is." },
    { "title": "Approve changes with a real signature", "body": "Review a change and sign right on the page. No printing, no email chase." }
  ],
  "cta": { "label": "Open your project", "url": "https://app.myfieldtime.com/project" },
  "social": { "network": "linkedin", "post": "Homeowners shouldn't need a spreadsheet to know where their remodel stands. MyFieldTime v0.8 puts budget, progress, and change-order sign-off on one page.", "hashtags": ["construction","remodel"], "url": "https://myfieldtime.com/whats-new" }
}
```

**Command:**

```bash
node "<skill-dir>/scripts/render-email.mjs" \
  --in docs/announcements/v0.8.0/content.json \
  --outdir docs/announcements/v0.8.0 \
  --brand docs/brand.json
```

**Output — four files in `docs/announcements/v0.8.0/`:**

1. `email.html` — a 600px, table-layout, light-background email. Brand band in `--brand`
   (`#2f7dff` from MyFieldTime's brand.json — **not purple**), accent dots in `--accent`
   (`#FFDD00`), bold display font for titles, button linking to the CTA, hidden preheader,
   `mso` Outlook fallback. Body/heading/muted text use the brand's ink **unless that token is too
   light to read on the white email card** (a dark-theme `text` like `#e8eef7`) — in which case the
   renderer swaps it to a dark, legible default, so copy is never near-white-on-white. Self-contained,
   no external CSS/JS, no `backdrop-filter`, no `feTurbulence`.

2. `email.txt` — the same announcement as plain text, hard-wrapped at ~72 cols:

   ```
   See exactly where your project's money is going
   ===============================================

   Hi Sarah,

   We shipped a few things that make it easier to see where your remodel
   stands — no spreadsheet, no phone tag.

   * See where the money's going
     One page shows how much of your budget is spent, what's left, and
     how far along the job is.

   * Approve changes with a real signature
     Review a change and sign right on the page. No printing, no email chase.

   Open your project: https://app.myfieldtime.com/project

   — The MyFieldTime team
   ```

3. `whats-new.html` — a drop-in in-app modal: a `role="dialog"` card with a brand band, kicker,
   title, the same items as a list, and "Maybe later" / CTA buttons. Themed entirely through
   `:root`-scoped CSS variables on `.whats-new` (re-skin without touching markup). `data-version`
   lets the app show it once per release.

4. `social.txt` — the short post + a length header (so you can check it against the network's
   limit) + hashtags + link:

   ```
   # MyFieldTime v0.8.0 — social post (linkedin)
   # length: 198 chars  (X/Twitter limit 280 · LinkedIn ~3000 · favor ≤220)

   Homeowners shouldn't need a spreadsheet to know where their remodel
   stands. MyFieldTime v0.8 puts budget, progress, and change-order
   sign-off on one page.

   #construction #remodel

   https://myfieldtime.com/whats-new
   ```

## Re-running for another audience

Keep one folder per version; keep audience-specific copies side by side so a teammate can grab the
right one:

```
docs/announcements/v0.8.0/
  content.homeowner.json   email.homeowner.html   …
  content.investor.json    email.investor.html    …
```

Render each with `--in content.<aud>.json` and then rename the four outputs with the same suffix,
or render into a per-audience subfolder (`docs/announcements/v0.8.0/investor/`). Either is fine —
just don't overwrite one audience's assets with another's.
