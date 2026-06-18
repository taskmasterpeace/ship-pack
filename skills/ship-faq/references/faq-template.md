# FAQ structure, answer formula & category taxonomy

`docs/FAQ.md` is both a readable document **and** the input to `render-help.mjs`. The renderer parses
it by heading level, so the structure below is a contract, not a suggestion.

## File structure (the renderer's contract)

```markdown
# <Product> — Help Center

<one or two sentence intro: who this helps and how to use search>

## <Category>            ← each H2 becomes a topic in the sidebar
### <Question>           ← each H3 becomes one searchable, collapsible answer card
<answer markdown: paragraph, numbered steps, bullets, code, blockquote>

### <Another question>
…

## <Next category>
…
```

Rules the parser depends on:

- Exactly one `#` H1 (the title). Everything above the first `##` is intro text and is **not** shown
  as a card — keep it short.
- Every `###` must sit under a `##`. A question with no category is dropped.
- The answer is everything between a `###` and the next `###`/`##`. Supported markdown inside an
  answer: paragraphs, `-`/`1.` lists, fenced ```code```, `> blockquote`, `**bold**`, `` `code` ``,
  and `[links](…)`. Keep answers tight — this is not the place for a full tutorial; link to the
  guide for depth.
- Question headings should read the way a user would phrase them: *"How do I …?"*, *"Why is …?"*,
  *"Can I …?"*, *"What does … mean?"* — not internal feature names.

## The answer formula

Every answer follows the same shape so the help center feels consistent:

1. **Direct answer first** — one sentence that resolves it, with the real button/screen name in
   **bold**. A user who only reads the first line should be unblocked.
2. **Steps, if needed** — numbered, each a single action ("Click **Review**", not "navigate to the
   review experience"). Use the exact labels from the guide.
3. **Honest caveat** — role/plan/state limits ("Only the homeowner can approve"), or an explicit
   "not yet supported / planned" when that's the truth. Cross-check the guide's maturity labels;
   never imply a feature works if the guide marks it Planned.
4. **Escape hatch** — a "if that didn't work…" line pointing to a deeper guide section or support.

Keep it to ~40-120 words. If an answer needs more, it's a guide section — link to it.

## Category taxonomy

Derive categories from *this* product's guide; don't impose a fixed list. Most products land on a
subset of these, plus one category per major module:

| Category | What lands here |
|----------|-----------------|
| **Getting started** | First login, the 5-minute first win, what the product is for |
| **Accounts & roles** | Sign up, invites, permissions, "why can't I see/do X" (role-gated) |
| **Billing & plans** | Pricing tiers, upgrades, what's gated, invoices, cancellation |
| **<Module> (one each)** | The recurring how-do-I and why-is-it for each real feature area |
| **Data & privacy** | Export, deletion, who can see what, security questions |
| **Troubleshooting** | Errors, "it's greyed out", "nothing happens", browser/offline issues |
| **Mobile / offline** | Only if the product has a mobile or offline story |
| **Glossary** | "What does <term> mean?" — one Q per domain term worth defining |

Order categories by how early a user hits them: Getting started first, Glossary/Troubleshooting last.

## Where questions come from (evidence, not invention)

`scripts/extract-source.mjs` hands you a JSON scaffold from the guide. Map it like this:

| Scaffold field | Becomes |
|----------------|---------|
| `workflows[]` (task headings) | *"How do I `<task>`?"* answers — copy the real steps |
| `troubleshooting[]` | *"Why is …?" / "… isn't working"* answers |
| `gaps[]` (known limits) | *"Can I …?" / "Is … supported?"* — answered honestly with the limit |
| `glossary[]` | *"What does `<term>` mean?"* in the Glossary category |
| `faq[]` (existing) | Merge — keep good ones, refresh stale ones |

If a candidate question has no honest answer in the guide, **do not fabricate one**. Either omit it
or list it in your final report as a product/documentation gap.

## Don't (anti-generic)

- No invented features, plans, or limits. If the guide doesn't prove it, don't claim it.
- No filler questions ("Is this product good?", "How do I get started?" with a non-answer).
- No "simply" / "just" / "easily" — they read as condescending when the user is stuck.
- No marketing voice. This is help, not a landing page.
- No duplicate questions phrased two ways — merge them.

## Minimum bar

A real product FAQ is **20-40 questions** across 4-8 categories. Fewer usually means the guide
wasn't mined — go back to the scaffold. Thinness is the failure mode; depth grounded in the guide
is the goal.
