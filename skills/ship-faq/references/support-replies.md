# Canned support replies — template & full set

`docs/support-replies.md` is the **human** side of the FAQ: copy-paste ticket responses for whoever
answers support. Each reply maps to a FAQ answer, so the self-serve page and the human channel say
the same thing in the same voice.

## Voice

Warm, specific, blame-free, always a next step. Use the customer's name. Acknowledge the friction.
Never say "simply" or "just." End with either a resolution or an explicit "I'll do X next."

## File structure

```markdown
# <Product> — Support Replies

> Internal use. Paste into tickets, fill the {{placeholders}}, keep the tone.
> Each reply links to the matching FAQ answer so self-serve and human support agree.

## <Group, e.g. Universal / Billing / Change orders>

### <Short label>  ·  → [#faq-anchor](docs/help.html#<category-id>-<question-slug>)
**When:** <the situation that triggers this reply>
<reply body with {{placeholders}}>
```

The `→` link points at the deep-link anchor the help page generates (`#<category-id>-<question-slug>`,
e.g. `#change-orders-how-do-i-approve-a-change-order`). Open `docs/help.html`, click a question's
**Copy link**, and paste that anchor to be exact.

## Placeholders (keep them obvious)

`{{name}}` · `{{product}}` · `{{plan}}` · `{{feature}}` · `{{date}}` · `{{ticket}}` · `{{steps}}`
· `{{eta}}` · `{{agent}}`. Use double braces so a quick find-and-replace can't miss one.

## The universal set (write these for every product)

These don't depend on features — always include them:

### Greeting / acknowledged
```
Hi {{name}}, thanks for reaching out — happy to help with this. Let me take a look and get you a
clear answer.
```

### Need more information
```
Hi {{name}}, thanks for the details so far. To pin this down, could you share {{steps}} (and a
screenshot if it's easy)? That'll let me reproduce it and get you a fix faster.
```

### Confirmed bug — acknowledged
```
Hi {{name}}, thanks for flagging this — you've found a real bug, and I've logged it as {{ticket}}.
The team is on it; I'll update you here as soon as there's a fix (current estimate: {{eta}}). In the
meantime, {{workaround}}.
```

### Feature request — logged, declining for now
```
Hi {{name}}, I love this idea and I've passed it to the product team. It's not on the near-term
roadmap, so I can't promise a date, but requests like yours are exactly how we prioritize. I'll
note your vote on it.
```

### Billing / refund
```
Hi {{name}}, thanks for your patience. I've reviewed your account ({{plan}} plan). {{resolution}}.
You'll see this reflected within {{eta}}. If anything looks off, reply here and I'll sort it.
```

### Escalation
```
Hi {{name}}, this one needs a closer look from our {{team}} team, so I'm escalating it now
({{ticket}}). You'll hear back from us by {{eta}} — thanks for bearing with us.
```

### Closing / resolved
```
Hi {{name}}, glad that's sorted! I'll close this out, but if it resurfaces just reply and the
thread reopens. Thanks for using {{product}}.
```

## Feature replies (derive ~12 from the FAQ)

For each high-traffic FAQ answer, write one canned reply. Pick the questions most likely to become
tickets: role/permission blocks ("can't do X"), billing/plan gates, onboarding stumbles, and the
top troubleshooting items. Each is the FAQ answer rewritten as a warm first-person reply with a
next step — see the worked example in `SKILL.md`.

Aim for **~12 feature replies + the 7 universal** = a usable starter library. Don't pad with replies
for questions that won't generate tickets.

## Honesty

If the canned reply would promise something the product can't do, fix the product claim or the FAQ
first — never paper over a gap with a friendly reply. A reply that says "yes that works!" for a
Planned feature is worse than no reply.
