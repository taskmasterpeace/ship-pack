# Worked example — discovery input → one-pager + deck output

A full, concrete trace so the skill knows exactly what "good" looks like. The product here
is a contractor-management SaaS, but the *shape* applies to any repo.

---

## 1. Input: what `collect-pitch-inputs.mjs` returned (abridged)

```json
{
  "brand": { "path": "docs/brand.json", "name": "MyFieldTime",
    "tagline": "Run your jobs. Not your inbox.", "colors": 11,
    "fonts": { "display": "Bricolage Grotesque", "body": "Hanken Grotesk" } },
  "version": { "path": "docs/VERSION", "value": "0.8.0" },
  "shippingLog": { "path": "docs/SHIPPING-LOG.md", "releases": 6,
    "latest": { "version": "0.8.0", "date": "2026-06-17" },
    "first":  { "version": "0.3.0", "date": "2026-01-22" },
    "category_mentions": { "new": 9, "improved": 5, "fixed": 4, "security": 2 } },
  "git": { "window_days": 30, "commits_in_window": 41, "active_days_in_window": 18,
    "contributors_in_window": 2, "total_commits": 312,
    "history_span": "2026-01-08 → 2026-06-17", "last_shipped": "2026-06-17", "tags": ["v0.8.0"] },
  "guide": { "path": "docs/user-guide/MyFieldTime-User-Guide.md",
    "headings": ["Calendar","Documents","Chat","Field Logs","Meetings","Change Orders",
                 "Punch List","Images","3D Tours","Finance","Roles & Permissions","Plans & Pricing"],
    "words": 6400 },
  "priorPitch": [],
  "gaps": [],
  "ready": true
}
```

**What the skill derives from this (and what it must NOT):**
- Momentum strip (verifiable): "6 releases · 18 active build days in the last 30 ·
  shipping since 2026-01 · last shipped 2026-06-17." ✅ all from the JSON.
- Shipped features: pulled from `guide.headings`. ✅
- Who it's for: read the guide's "Roles & Permissions" + "Plans & Pricing" sections. ✅
- Traction (customers, MRR, users): **none in the JSON → placeholders only.** ❌ never invent.

---

## 2. Output: `docs/pitch/one-pager.md` (excerpt)

```markdown
# MyFieldTime — Investor One-Pager

## The problem
A remodeler runs five active jobs from a group text and a folder on the truck seat. The
change order that protects a job's margin gets lost between a voicemail and a photo, and
the contractor eats the cost. Scheduling, field logs, and homeowner sign-off live in four
apps that don't talk — so the office never knows what really happened on site.

## The solution
MyFieldTime is one workspace per job: calendar, field logs, change orders, documents, and
client chat in a single timeline. The insight — a contractor's source of truth isn't a
spreadsheet, it's the day's events on the job. Capture those once and the paperwork,
billing, and client updates fall out of it.

- Shared job calendar and daily field logs
- Change orders with homeowner sign-off
- Documents, photos, and 3D site tours in one place
- Client chat tied to the job, not a personal phone

## What's shipped
Working today: Calendar, Documents, Field Logs, Meetings, Change Orders, Punch List,
Images, and 3D Tours — across three plan tiers with role-based access.

**Development momentum:** 6 releases shipped · 18 active build days in the last 30 ·
shipping since January 2026 · last shipped 2026-06-17.

## Who it's for
Residential remodeling and specialty-trade contractors running 3–15 concurrent jobs —
the project manager in the office and the lead on site, with homeowners looped in
read-only. The job-to-be-done: end every day knowing what happened on every job without
chasing anyone.

## Why now / why us
Construction software has been priced and built for large GCs; the small remodeler still
runs on texts. We believe mobile-first field capture plus client transparency is the wedge.
[SOURCE: market-size figure for residential remodel software] · [TEAM: founder bios]

## Traction

> Metrics below are placeholders until verified. Replace each bracket before sending.

- **Customers / pilots:** [TRACTION: # of paying or pilot contractors]
- **Revenue:** [METRIC: MRR with as-of date]
- **Usage:** [METRIC: active jobs / weekly active accounts]
- **Retention proof:** [METRIC: e.g. a customer outcome or retention %]

*Development momentum (verifiable from the repo): 6 releases, 18 active build days in the
last 30, shipping since Jan 2026.*

## The ask
[ASK: raising $X for N months of runway] · Use of funds: [TBD: hires / GTM / pilots].
Contact: [CONTACT: name · email].
```

---

## 3. Output: `docs/pitch/deck-outline.md` (first three slides)

```markdown
### Slide 1 — Title
**Headline:** MyFieldTime — run your jobs, not your inbox.
- One workspace per job for residential contractors
- v0.8.0 · shipping since January 2026
- Contact: [CONTACT: name · email]
*Speaker note:* Open with the tagline; it's the whole thesis in five words.
*Visual:* Logo on the blueprint-grid brand background.

### Slide 2 — The problem
**Headline:** Five jobs, one group text, no source of truth.
- Change orders lost between a voicemail and a photo — margin eaten
- Schedule, field logs, sign-off spread across four apps
- The office never knows what really happened on site
*Speaker note:* Tell one specific job's story; don't abstract to "the industry."
*Visual:* [SCREENSHOT: chaos-before] or a simple four-disconnected-apps diagram.

### Slide 4 — What's shipped
**Headline:** We don't demo a roadmap. This is live today.
- Calendar, Field Logs, Change Orders, Punch List, Documents, 3D Tours — working now
- Three plan tiers, role-based access (PM / contractor / homeowner)
- 6 releases · 18 active build days in the last 30 · last shipped 2026-06-17
*Speaker note:* This slide is the credibility close — emphasize cadence, not promises.
*Visual:* [SCREENSHOT: dashboard] + the momentum strip as four big numbers.
```

---

## 4. Why this scores

- Every number is traceable to the discovery JSON; every unknown is a visible bracket.
- The problem/solution are specific to the product's real domain (read from the guide and
  brand tagline), not interchangeable SaaS filler.
- "What's shipped" leads with proof-of-execution — the builder's edge — and labels momentum
  as momentum, not traction.
- A founder can find every blank with one search for `[`.
