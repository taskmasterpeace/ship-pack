# Audiences & voice — ship-email reference

The whole value of this skill is **the same release, re-told for one reader**. A homeowner, an
investor, and a crew lead care about different things; sending all three the same generic blast is
the failure mode. Pick ONE audience per run and tailor every field to it.

## How to tailor (the four moves)

For each audience, rewrite the release through these four lenses:

1. **Lead value** — the single thing this reader cares about most. It sets the subject + headline.
2. **Vocabulary** — the words they actually use (and the words to drop).
3. **Proof** — what makes it credible to *them* (a number, a workflow removed, a risk closed).
4. **Call to action** — the next step that makes sense for their relationship to the product.

Translate every shipping-log bullet into the reader's stakes. Do not just relabel — re-explain.

## The default audiences

### `homeowner` / customer-end-user (the person who *receives* the work)
- **Cares about:** clarity, money, "is my project on track?", less back-and-forth, trust.
- **Lead value:** peace of mind and visibility. They didn't buy software — they hired a pro.
- **Vocabulary:** plain, warm, concrete. "your project", "what's left", "sign off", "at a glance".
  Drop: "module", "RLS", "API", "tenant", "workflow", version numbers in the subject line.
- **Proof:** a tangible before/after — "no spreadsheet", "no phone tag", "approve in one tap".
- **CTA:** open their project / view the new page. Personal, low-effort.
- **Tone:** reassuring, second-person, short sentences. Never salesy at an existing customer.

### `investor` / stakeholder (the person funding or betting on the company)
- **Cares about:** momentum, retention/expansion, market pull, defensibility, what's next.
- **Lead value:** "this team ships, and what they shipped moves the business."
- **Vocabulary:** outcomes and direction. "shipped", "now live", "expands", "reduces churn risk",
  "the wedge". One honest metric beats five adjectives.
- **Proof:** cadence ("Nth release this quarter"), a usage or scope number, a strategic "why now."
  Tie the feature to a thesis — retention, ACV, a new segment — without overclaiming.
- **CTA:** read the full changelog / book a walkthrough / reply with questions.
- **Tone:** confident, concise, candid about what's staged vs. live. Investors smell spin.

### `crew` / operator (the person who *does* the work in the field)
- **Cares about:** does it save me time on the jobsite, fewer steps, works on my phone, less typing.
- **Lead value:** "this removes a hassle from your day."
- **Vocabulary:** direct, jobsite-real. "punch list", "photos", "from your phone", "one tap",
  "no double entry". Skip marketing gloss entirely.
- **Proof:** the steps removed — "log it once", "everyone sees the same list".
- **CTA:** try it on your next job / here's the 20-second how-to.
- **Tone:** plainspoken, respectful of their time, zero fluff. They'll bounce off corporate voice.

> These three are the defaults. If the project's `brand.json` or audience list names others
> (e.g. `gc` general-contractor, `architect`, `prospect`, `partner`, `press`), build a matching
> profile from the same four moves. Nothing here is hardcoded to one app — derive stakes from the
> product, not from a fixed list.

## Brand voice (read brand.json first)

- Use `brand.tagline` and any `brand.voice`/`brand.tone` fields verbatim as the north star.
- Honor brand rules absolutely — if the brand says **no purple**, the theme and copy obey it.
- Match the product's existing register: scan the shipping log and landing copy for cadence and
  word choice, then write *in that voice*, not a generic newsletter voice.

## Anti-generic checklist (reject the draft if any are true)

- [ ] The subject would work for literally any SaaS ("Exciting updates are here!"). ✗
- [ ] A bullet restates the commit ("Refactored finance module"). ✗ — say the user-facing result.
- [ ] The same copy could go to all three audiences unchanged. ✗ — you didn't tailor.
- [ ] A claim has no basis in the shipping log. ✗ — never invent a feature or a number.
- [ ] Staged/un-merged work is described as "live". ✗ — say "rolling out" and be honest.
- [ ] Emoji or exclamation-point soup standing in for substance. ✗.

## Subject-line bar

Write 2–3 candidates, keep the strongest. A good subject is **specific + benefit-first + ≤ 55 chars**.

- homeowner: "See exactly where your project's money is going" ✓  · "v0.8.0 release notes" ✗
- investor: "MyFieldTime v0.8: the homeowner money portal is live" ✓ · "Big news!" ✗
- crew: "Punch list + photos now work from your phone" ✓ · "Product update" ✗
