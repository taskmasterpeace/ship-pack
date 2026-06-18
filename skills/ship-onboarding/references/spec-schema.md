# `docs/onboarding.json` — schema & field reference

The onboarding spec is the **source of truth** for the first-run tour. The component renders
it; the renderer themes it; you author it. Keep it small — a first-run tour is 4–8 steps, not
a tour of every feature.

## Top-level shape

```jsonc
{
  "$schema": "ship-onboarding/1",
  "name": "MyFieldTime",                 // product name (from docs/brand.json if present)
  "version": "0.8.0",                    // mirrors docs/VERSION — re-stamp on release
  "updated": "2026-06-18",               // YYYY-MM-DD, when the copy was last written
  "storageKey": "onboarding:v0.8.0",     // localStorage key; BUMP to re-show after big UI changes
  "persona": "new-user",                 // who this path is for (see "Multiple personas")
  "screenshotBase": "/onboarding/shots", // OPTIONAL public URL prefix for step screenshots
  "steps": [ /* ordered; see below */ ]
}
```

`storageKey` is the gate: the tour fires once, then writes `done`. Bump the key (e.g. tie it to
`version`) when the UI changes enough that returning users should see the new path once.

## Step object

| Field | Required | Meaning |
|-------|----------|---------|
| `id` | yes | Stable, unique slug (`calendar`, `invite-crew`). Used as a React key and analytics id. |
| `title` | yes | Short coachmark heading. 2–5 words. |
| `body` | yes | One or two plain sentences: what this is **and the one action to try**. No jargon. |
| `selector` | for anchored steps | CSS selector of the element to spotlight, e.g. `[data-tour="calendar"]`. Prefer a dedicated `data-tour` attribute over brittle class/nth-child selectors. |
| `placement` | no | `bottom` (default), `top`, `center`, or `modal`. `center`/`modal` ignore `selector` and show a centered card (good for welcome/finish). |
| `route` | no | Path to navigate to before showing the step (e.g. `/project/{id}/calendar`). The host app reads this and routes; the component itself does not navigate. |
| `screenshot` | no | A screenshot **id** matching a shot in `docs/screenshots.config.json`. Shown in the card when `screenshotBase` is set. Lets a tour work even before the target element exists. |
| `cta` | no | Button label for this step (`Next` default; last step defaults to `Done`). |
| `draft` | scaffold only | `true` means the scaffolder wrote a placeholder. Remove it once you've written real copy + a real selector. `validate`/`gaps` flag any left. |

### Anchored vs. centered steps
- **Anchored** (has a real `selector`): spotlights the element, positions the card beside it.
  If the selector isn't on the current page, the component gracefully falls back to a centered
  card (so a broken selector never blanks the screen).
- **Centered** (`placement: center` / `modal`, or no selector): full-screen-centered card.
  Use for the opening welcome and the closing "you're set" steps.

## Selector strategy (the part that actually wires it up)

The scaffolder writes `"selector": "TODO: data-tour=\"calendar\""`. To make it real:

1. Add a stable hook in the app's JSX/HTML on the element the step is about:
   ```html
   <a href="…/calendar" data-tour="calendar">Calendar</a>
   ```
2. Set the step selector to `"[data-tour=\"calendar\"]"` and drop the `TODO:`/`draft`.

Prefer `data-tour` attributes. They survive refactors, CSS-module hashing, and i18n in a way
that `.btn.primary:nth-child(3)` never will. One attribute per step.

## Multiple personas (optional)

If a homeowner and a contractor should see different first-run paths, ship one spec per
persona and let the app pick by role:

```
docs/onboarding.json                 // default / new-user
docs/onboarding.homeowner.json
docs/onboarding.contractor.json
```

Each is the same shape with its own `persona`, `storageKey`, and `steps`. The component takes
whichever JSON you hand it via `src` or `.spec`.

## What the renderer guarantees

- The component is themed entirely from `--ob-*` CSS variables, defaulted from `docs/brand.json`
  (never purple). Embedded in your app, it inherits your page's variables if you define the
  same names; standalone, the preview supplies them.
- No `backdrop-filter`, no SVG `feTurbulence` (both can hang renderers). The spotlight is a
  plain `box-shadow` ring.
- Keyboard-focusable buttons, a visible focus ring, and `prefers-reduced-motion` support.
