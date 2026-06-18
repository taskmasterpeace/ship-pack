# Worked example: from a guide to a grounded, cited answer

A concrete input → output trace on a real MyFieldTime-shaped guide, so you can see exactly
what each step produces and what "good" looks like.

## Input: a slice of the user guide (`docs/user-guide/MyFieldTime-User-Guide.md`)

```markdown
## Change Orders

Change orders track scope and price changes after a project starts. Each change order has a
title, a description, a dollar amount, and a status: Draft, Pending, Approved, or Rejected.

### Create a change order
1. Open the project and click **Change Orders** in the sidebar.
2. Click **New change order** (top right).
3. Enter a title, description, and the amount. Save as **Draft** or submit for approval.

### Approve or reject a change order
The project manager and homeowner can act on a Pending change order.
1. Open the **Change Orders** tab and select the Pending order.
2. Review the amount, then click **Approve** or **Reject**.
3. Approved amounts roll into the project's running total automatically.

## Documents
Upload plans, permits, and contracts under **Documents**. Drag files in or click **Upload**…
```

## Step 1 — chunk it (`build-index.mjs`)

```
$ node build-index.mjs --in docs/user-guide/MyFieldTime-User-Guide.md --out docs/guide-index.json
build-index: 3 sections, ~120 words → docs/guide-index.json  (v0.8.0)
```

`docs/guide-index.json` (abridged):
```json
{
  "$schema": "ship-helpbot/guide-index@1",
  "product": "MyFieldTime", "version": "0.8.0", "count": 3,
  "sections": [
    { "id": "create-a-change-order", "title": "Create a change order", "level": 3,
      "anchor": "create-a-change-order", "breadcrumb": ["Change Orders"],
      "text": "1. Open the project and click Change Orders in the sidebar. 2. Click New change order…",
      "tokens": 38 },
    { "id": "approve-or-reject-a-change-order", "title": "Approve or reject a change order", "level": 3,
      "anchor": "approve-or-reject-a-change-order", "breadcrumb": ["Change Orders"],
      "text": "The project manager and homeowner can act on a Pending change order. 1. Open the Change Orders tab and select the Pending order. 2. Review the amount, then click Approve or Reject. 3. Approved amounts roll into the project's running total automatically.",
      "tokens": 44 },
    { "id": "documents", "title": "Documents", "level": 2, "anchor": "documents",
      "breadcrumb": [], "text": "Upload plans, permits, and contracts under Documents…", "tokens": 22 }
  ]
}
```
Note: headings became **anchors** (`approve-or-reject-a-change-order`) — the same slugs the
guide's HTML renderer uses, so citations will deep-link correctly.

## Step 2 — sanity-check retrieval WITHOUT an LLM (`retrieve.mjs`)

```
$ node retrieve.mjs --index docs/guide-index.json --q "who can approve a change order?"

[6.812]  Change Orders › Approve or reject a change order   (#approve-or-reject-a-change-order)
    The project manager and homeowner can act on a Pending change order. 1. Open the Change…

[2.140]  Change Orders › Create a change order   (#create-a-change-order)
    1. Open the project and click Change Orders in the sidebar. 2. Click New change order…
```

The right section ranks first — retrieval is healthy before any API key is involved. (If the
top hit were wrong here, you'd fix chunking/the guide, not blame the LLM.)

## Step 3 — the route asks the model with those sections (see `api-route.md`)

The route builds this system prompt (top-2 hits shown):
```
You are the in-app help assistant for MyFieldTime. Answer ONLY from the numbered guide
sections below … After the answer, on a new line list the section anchors you used as:
CITES: anchor1, anchor2

GUIDE SECTIONS:
[1] (#approve-or-reject-a-change-order) Approve or reject a change order
The project manager and homeowner can act on a Pending change order…
[2] (#create-a-change-order) Create a change order
1. Open the project and click Change Orders in the sidebar…
```

Model returns:
```
Both the project manager and the homeowner can approve a Pending change order. Open the
**Change Orders** tab, select the Pending order, review the amount, then click **Approve**.
Once approved, the amount rolls into the project's running total automatically.
CITES: approve-or-reject-a-change-order
```

The route strips the `CITES:` line, maps the anchor back to its section, and returns:

## Output: what the widget receives and shows

```json
{
  "answer": "Both the project manager and the homeowner can approve a Pending change order. Open the **Change Orders** tab, select the Pending order, review the amount, then click **Approve**. Once approved, the amount rolls into the project's running total automatically.",
  "citations": [
    { "id": "approve-or-reject-a-change-order", "title": "Approve or reject a change order",
      "anchor": "approve-or-reject-a-change-order" }
  ],
  "model": "claude-sonnet-4-5", "grounded": true
}
```

In the panel the user sees the answer (bold preserved) and one citation chip:
**▸ Approve or reject a change order** → links to `/help#approve-or-reject-a-change-order`.

## The honest-failure case

```
$ node retrieve.mjs --index docs/guide-index.json --q "how do I export to QuickBooks?"
(no matching sections — the guide may not cover this)
```
Retrieval is empty → the route returns `{"answer":"I couldn't find that in the guide.",
"citations":[],"grounded":false}` and the widget says so, with a link to the guide home.
**No invented QuickBooks steps.** That honesty is the point — a helpbot that confidently makes
up features is worse than no helpbot.
