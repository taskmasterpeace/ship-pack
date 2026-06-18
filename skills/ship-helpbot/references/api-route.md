# Reference: the `/api/ask-docs` route + model adapters

This is the **server half** of the helpbot. The widget (`<ship-helpbot>`) POSTs
`{ question, src }`; this route retrieves the top guide sections, asks an LLM to answer
**using only those sections**, and returns `{ answer, citations: [{ id, title, anchor }] }`.

The retrieval is provided dependency-free by `scripts/retrieve.mjs` (`rank(question, sections, k)`).
Copy that file into the app (e.g. `lib/ship-helpbot/retrieve.mjs`) and import it from the route —
do **not** re-implement ranking. Only the LLM call differs per app, so it lives behind an adapter.

## The contract (keep this stable across apps)

**Request** `POST /api/ask-docs`
```json
{ "question": "How do I approve a change order?", "src": "/guide-index.json" }
```

**Response**
```json
{
  "answer": "Open the **Change Orders** tab, select the pending order, and click Approve…",
  "citations": [
    { "id": "change-orders", "title": "Change Orders", "anchor": "change-orders" }
  ],
  "model": "claude-sonnet-...",      // optional, for debugging
  "grounded": true                    // false => the model fell back / index was empty
}
```

If retrieval returns nothing, answer honestly (`"I couldn't find that in the guide."`,
`grounded: false`) instead of letting the model invent steps.

## The system prompt (grounding + citations)

```
You are the in-app help assistant for {PRODUCT}. Answer ONLY from the numbered guide
sections below. If the answer isn't in them, say you couldn't find it in the guide and
suggest the closest section — never invent features, prices, or steps.
Be concise and concrete: name real screens and buttons. Use short paragraphs.
After the answer, list the section ids you actually used as: CITES: id1, id2

GUIDE SECTIONS:
[1] (#change-orders) Change Orders
<text…>
[2] (#documents) Documents
<text…>
```

Parse the trailing `CITES:` line, map each id back to its section to recover `title`/`anchor`,
and strip the line from the visible answer. (Or use the provider's tool/JSON mode to return
`{answer, citations}` directly — both work; the `CITES:` convention keeps it provider-agnostic.)

## Model adapters — pluggable, nothing assumed installed

Pick the adapter by an env var (`HELPBOT_PROVIDER`) so the **same route** runs on any stack.
Each adapter takes `(systemPrompt, question)` and returns the raw answer string.

### A. Anthropic Claude (direct)
```js
// env: ANTHROPIC_API_KEY, HELPBOT_MODEL=claude-sonnet-4-...  (check the claude-api skill for current ids)
async function askClaude(system, question) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.HELPBOT_MODEL || "claude-sonnet-4-5",
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: question }],
    }),
  });
  const j = await r.json();
  return j.content?.[0]?.text ?? "";
}
```

### B. Vercel AI Gateway (OpenAI-compatible; one key, many models, failover)
```js
// env: AI_GATEWAY_API_KEY, HELPBOT_MODEL=anthropic/claude-sonnet-4-5 (or openai/gpt-..., etc.)
async function askGateway(system, question) {
  const r = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.HELPBOT_MODEL || "anthropic/claude-sonnet-4-5",
      max_tokens: 700,
      messages: [{ role: "system", content: system }, { role: "user", content: question }],
    }),
  });
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}
```
> If the repo already uses the Vercel **AI SDK**, prefer `generateText({ model, system, prompt })`
> from `ai` + `@ai-sdk/*` instead of raw fetch — see the `vercel:ai-sdk` / `vercel:ai-gateway` skills.

### C. Local Ollama (offline / private; LAN box)
```js
// env: OLLAMA_URL=http://localhost:11434, HELPBOT_MODEL=qwen3.5 (or llama3.1, mistral, …)
async function askOllama(system, question) {
  const base = process.env.OLLAMA_URL || "http://localhost:11434";
  const r = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.HELPBOT_MODEL || "qwen3.5",
      stream: false,
      messages: [{ role: "system", content: system }, { role: "user", content: question }],
    }),
  });
  const j = await r.json();
  return j.message?.content ?? "";
}
```

### The selector
```js
const ADAPTERS = { claude: askClaude, gateway: askGateway, ollama: askOllama };
const ask = ADAPTERS[process.env.HELPBOT_PROVIDER || "claude"];
if (!ask) throw new Error(`unknown HELPBOT_PROVIDER: ${process.env.HELPBOT_PROVIDER}`);
```

## Full route — Next.js App Router (`app/api/ask-docs/route.ts`)

```ts
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rank } from "@/lib/ship-helpbot/retrieve.mjs"; // copied from scripts/retrieve.mjs

// Load the index once (it's a build artifact in /public). Re-read on each cold start.
let INDEX: any;
function getIndex() {
  if (!INDEX) INDEX = JSON.parse(readFileSync(join(process.cwd(), "public/guide-index.json"), "utf8"));
  return INDEX;
}

export async function POST(req: Request) {
  const { question } = await req.json();
  if (!question || typeof question !== "string" || question.length > 500) {
    return NextResponse.json({ error: "bad question" }, { status: 400 });
  }
  const idx = getIndex();
  const hits = rank(question, idx.sections, 4);
  if (!hits.length) {
    return NextResponse.json({ answer: "I couldn't find that in the guide.", citations: [], grounded: false });
  }

  const product = idx.product || "this product";
  const ctx = hits.map((h: any, i: number) => `[${i + 1}] (#${h.anchor}) ${h.title}\n${h.text}`).join("\n\n");
  const system =
    `You are the in-app help assistant for ${product}. Answer ONLY from the numbered guide ` +
    `sections below. If the answer isn't there, say you couldn't find it in the guide. Never invent ` +
    `features, prices, or steps. Be concise and name real screens/buttons. After the answer, on a new ` +
    `line list the section anchors you used as: CITES: anchor1, anchor2\n\nGUIDE SECTIONS:\n${ctx}`;

  let raw = "";
  try { raw = await ask(system, question); }
  catch (e: any) { return NextResponse.json({ error: "model unavailable", detail: e.message }, { status: 502 }); }

  // split off the CITES line and map anchors back to sections
  const m = raw.match(/\n?CITES:\s*(.+)\s*$/i);
  const used = m ? m[1].split(/[,\s]+/).map((s) => s.replace(/^#/, "").trim()).filter(Boolean) : [];
  const answer = (m ? raw.slice(0, m.index) : raw).trim();
  const byAnchor = new Map(hits.map((h: any) => [h.anchor, h]));
  const citations = (used.length ? used : hits.map((h: any) => h.anchor))
    .map((a) => byAnchor.get(a)).filter(Boolean)
    .map((h: any) => ({ id: h.id, title: h.title, anchor: h.anchor }));

  return NextResponse.json({ answer, citations, model: process.env.HELPBOT_MODEL, grounded: true });
}
```

### Non-Next stacks
The shape is identical; only the framing changes:
- **Express / Fastify:** `app.post("/api/ask-docs", …)`, read the index from disk, `res.json(...)`.
- **SvelteKit / Remix / Astro:** an `+server.ts` / `loader` / endpoint that does the same three steps.
- **Edge runtime / serverless:** bundle `guide-index.json` as an import or fetch it from the CDN URL
  (`src`) instead of `readFileSync`, since some edge runtimes have no filesystem.

## Hardening (do these before shipping)

- **Validate & cap input** — reject empty / over-long questions (done above). The widget is public.
- **Rate-limit** the route (per IP or per session) — it spends model tokens. Reuse the app's limiter
  (this repo has one on `/api/dev-login`).
- **Never trust `src` for a file path.** Only use it to pick among indexes you control; never
  `readFileSync(userSuppliedPath)`.
- **Keep keys server-side.** The widget calls *your* route, never the model provider directly.
- **Cache** the parsed index in module scope (done) and consider caching identical questions.
- **Fail soft.** Model down → 502 with a friendly message; the widget already shows "the guide is
  still available directly" and the citations/links work without the LLM.
