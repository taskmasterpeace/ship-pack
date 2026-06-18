# Authoring the tour & embedding the component

Two jobs live here: writing **good first-run copy** (the hard, human part) and **wiring the
generated component into a real app** (the integration part). The scaffolder and renderer
handle the mechanical middle.

## Deriving the first-run path from the guide

The scaffolder reads the user guide's `##`/`###` workflow headings and proposes one coachmark
per top workflow. That's a starting list, not the answer. A first-run tour is **not** a list of
every feature — it's the shortest path to one real win.

Trim the scaffold to the **activation path**:

1. **Welcome** — one sentence: what they can do here and why it's worth 30 seconds.
2. **3–5 core steps** — only the features on the path to a first successful outcome. For a
   contractor PM tool that's typically: *create a project → see the calendar → add the crew →
   log the first update*. Drop anything that isn't on that path (settings, glossary, admin).
3. **Finish** — the single next action that delivers value ("Create your first project").

Cut steps aggressively. Six is plenty; ten is a slog people skip.

## Copy rules (anti-generic)

Every step's `body` must pass these:

- **Names the real screen/button**, not "the relevant section." Use the exact label the user
  sees.
- **States one action to try**, in the imperative ("Add your first crew member here").
- **Says what they'll get**, not what the feature is ("so everyone sees the same schedule").
- **No "simply" / "just" / "easily."** No feature list. No marketing.
- **Grounded in the guide.** If the guide doesn't describe it, don't claim it in the tour.

> Generic (reject): "Calendar. View and manage your calendar events here."
> Specific (ship): "Calendar. Every visit, inspection, and milestone lands here — drag an event
> to reschedule and the homeowner sees it instantly."

## Worked example — input → output

**Input.** The guide has these workflow headings (real MyFieldTime guide):
`Getting started`, `The dashboard`, `Inside a project`, `Calendar`, `Documents`, `Messages`,
`Meetings & AI notes`, `Photos & images`, `Change orders`, `Team & invitations`.

**Scaffold** (`node onboarding.mjs scaffold`) proposes welcome + 7 workflow coachmarks +
finish, each `draft:true` with a `TODO:` selector.

**Author trims to the activation path** and writes real copy + real selectors:

```jsonc
{
  "$schema": "ship-onboarding/1",
  "name": "MyFieldTime", "version": "0.8.0", "updated": "2026-06-18",
  "storageKey": "onboarding:v0.8.0", "persona": "new-user",
  "steps": [
    { "id": "welcome", "placement": "center", "title": "Welcome to MyFieldTime",
      "body": "Run your jobs from one place — schedule, photos, change orders, and crew. This 30-second tour gets you to your first project.",
      "cta": "Show me" },

    { "id": "new-project", "selector": "[data-tour=\"new-project\"]", "placement": "bottom",
      "title": "Start a project", "route": "/dashboard",
      "body": "Click New Project to set up a job. Everything else — calendar, docs, crew — hangs off the project you create here." },

    { "id": "calendar", "selector": "[data-tour=\"calendar\"]", "placement": "bottom",
      "title": "Schedule the work", "route": "/project/{projectId}/calendar",
      "screenshot": "calendar",
      "body": "Every visit and milestone lives on the Calendar. Drag an event to reschedule and the homeowner sees the change instantly." },

    { "id": "invite-crew", "selector": "[data-tour=\"team\"]", "placement": "bottom",
      "title": "Add your crew", "route": "/project/{projectId}/team",
      "body": "Invite contractors and the homeowner by email from Team. Each person only sees what their role allows." },

    { "id": "finish", "placement": "center", "title": "You're set",
      "body": "Create your first project and add one calendar event — that's the whole loop.",
      "cta": "Create a project" }
  ]
}
```

**Render** (`node render-tour.mjs`) emits `onboarding-tour.js` + `onboarding-preview.html`.
Open the preview, click through, tune the copy, re-render. From 7 raw workflows the human kept
**3 on the activation path** and dropped the rest — that judgment is the point.

## Embedding the component

The generated `onboarding-tour.js` defines a `<onboarding-tour>` custom element. It is
framework-agnostic — it's a standard Web Component, so it drops into React, Vue, Svelte, or
plain HTML identically.

**Plain HTML**
```html
<script src="/onboarding-tour.js"></script>
<onboarding-tour src="/onboarding.json"></onboarding-tour>
```

**Next.js / React** (copy `onboarding-tour.js` into `public/`, `onboarding.json` too):
```tsx
"use client";
import { useEffect, useRef } from "react";
export function OnboardingTour() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { import("/onboarding-tour.js"); }, []);     // registers the element once
  // Optional: route on step change if your steps use `route`
  return <onboarding-tour ref={ref as any} src="/onboarding.json" />;
}
```
Add `data-tour` attributes to the elements your steps target. Mount `<OnboardingTour/>` once in
the authenticated app shell (not on the marketing site). It self-fires for users who haven't
seen `storageKey` and no-ops for everyone else.

**Handling `route`.** The component does not navigate (it can't know your router). If your steps
set `route`, listen for the step and push the route yourself, or keep the tour to a single page
and drop `route`. Both are valid; single-page tours are simpler and recommended for v1.

**Replaying.** Give users a "Show me around again" control:
```js
document.querySelector("onboarding-tour").restart();
```

**Analytics (optional).** The component dispatches a `finish` event with `{ skipped, index }`.
Listen for it to measure completion vs. skip and which step people bail on.

## Keeping it in sync (the pack contract)

The tour drifts the moment the UI moves. Keep it honest:

- **Re-stamp `version` + `storageKey`** on each release so returning users see a materially new
  path once. The `/ship-release` flow is the place to do this.
- **Re-run `gaps`** after a guide update to catch new workflows worth a step and screenshots
  that moved.
- **Re-render** after any spec edit. The `.js` is generated — never hand-edit it; edit the JSON
  and re-render.
