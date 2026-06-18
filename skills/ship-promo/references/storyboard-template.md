# Storyboard HTML template

The optional `docs/promo/storyboard.html` is a single, shareable, on-brand board of the promo
plan — a human looks at it and approves before anything renders. Build it from the template
below.

## Hard rules (renderer safety + brand)

- **Self-contained.** One file. No build step, no external JS, no CDN scripts. Web fonts via a
  `<link>` are fine (with a system fallback in the variable).
- **Themeable via `:root` only.** Every color/font comes from a CSS variable. Fill them from
  `docs/brand.json` (`colors` + `fonts`). Pull `name`, `tagline`, `version` too.
- **Never purple/indigo by default.** Use the project's real brand. If `brand.json` is missing,
  pick a neutral slate/ink scheme — not purple — and say you inferred it.
- **NEVER use `backdrop-filter`** and **NEVER use SVG `feTurbulence`/`feDisplacementMap`** — both
  hang/melt renderers. Use flat fills, simple gradients, and a static SVG grid instead.
- Works with JavaScript disabled. Any JS is progressive enhancement only.

## How to fill it

1. Replace `{{NAME}}`, `{{TAGLINE}}`, `{{VERSION}}`, `{{ANGLE}}`, `{{SPINE}}`, `{{LENGTH}}`.
2. Set the `:root` tokens to the brand colors/fonts from `brand.json`.
3. Duplicate the `.shot` card per shotlist row. For each: number, timecode, on-screen text,
   the VO line, and the frame — an `<img>` with a real screenshot path if one exists, else a
   `.frame--gen` block showing the generator prompt as the placeholder.
4. Mark generated frames with the `data-kind="gen"` badge so reviewers see real vs generated.
5. Keep total cards == shotlist rows. The board IS the shotlist, made visual.

## Template

```html
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{NAME}} — Promo Storyboard · v{{VERSION}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    /* ←—— set these from docs/brand.json. Example shown = MyFieldTime (NO PURPLE). */
    --bg:#0a0a0f; --surface:#11141f; --surface-2:#141826;
    --border:#1e2740; --text:#e7edf6; --muted:#8b9bb4; --heading:#f6f9ff;
    --brand:#2f7dff; --accent:#FFDD00;
    --grid:rgba(0,86,210,.07);
    --font-display:"Bricolage Grotesque",ui-sans-serif,system-ui,sans-serif;
    --font-body:"Hanken Grotesk",ui-sans-serif,system-ui,sans-serif;
    --radius:14px; --maxw:64rem;
  }
  *{box-sizing:border-box}
  body{
    margin:0;color:var(--text);font-family:var(--font-body);line-height:1.5;
    background:
      linear-gradient(var(--grid) 1px,transparent 1px) 0 0/40px 40px,
      linear-gradient(90deg,var(--grid) 1px,transparent 1px) 0 0/40px 40px,
      var(--bg);
  }
  .wrap{max-width:var(--maxw);margin:0 auto;padding:2.5rem 1.25rem 4rem}
  header h1{font-family:var(--font-display);color:var(--heading);font-size:1.9rem;letter-spacing:-.02em;margin:.2rem 0}
  .tag{color:var(--muted);font-size:1rem}
  .meta{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0 .5rem}
  .chip{border:1px solid var(--border);border-radius:999px;padding:.25rem .7rem;font-size:.8rem;color:var(--muted)}
  .chip b{color:var(--accent);font-weight:600}
  .spine{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--brand);
    border-radius:var(--radius);padding:1rem 1.1rem;margin:1.25rem 0 2rem;color:var(--heading)}
  .grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,18rem),1fr))}
  .shot{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
    overflow:hidden;display:flex;flex-direction:column;transition:border-color .2s,box-shadow .2s}
  .shot:hover{border-color:var(--brand);box-shadow:0 6px 24px rgba(0,0,0,.35)}
  .frame{aspect-ratio:16/9;background:var(--surface-2);display:flex;align-items:center;justify-content:center;position:relative}
  .frame img{width:100%;height:100%;object-fit:cover;display:block}
  .frame--gen{padding:.9rem;font-size:.8rem;color:var(--muted);text-align:left;overflow:auto}
  .kind{position:absolute;top:.5rem;right:.5rem;font-size:.65rem;text-transform:uppercase;letter-spacing:.04em;
    padding:.15rem .5rem;border-radius:999px;border:1px solid var(--border);background:var(--surface);color:var(--muted)}
  .kind[data-kind="real"]{color:var(--brand);border-color:var(--brand)}
  .kind[data-kind="gen"]{color:var(--accent);border-color:var(--accent)}
  .body{padding:.9rem 1rem 1.1rem;display:flex;flex-direction:column;gap:.45rem}
  .num{font-family:var(--font-display);color:var(--heading);font-size:.95rem}
  .num span{color:var(--muted);font-weight:400;font-size:.8rem;margin-left:.4rem}
  .ost{font-size:.78rem;color:var(--accent)}
  .vo{color:var(--text);font-size:.92rem}
  footer{margin-top:2.5rem;color:var(--muted);font-size:.82rem;text-align:center}
</style>
<div class="wrap">
  <header>
    <h1>{{NAME}} — Promo Storyboard</h1>
    <div class="tag">{{TAGLINE}}</div>
    <div class="meta">
      <span class="chip">v<b>{{VERSION}}</b></span>
      <span class="chip">Angle: <b>{{ANGLE}}</b></span>
      <span class="chip">Length: <b>{{LENGTH}}</b></span>
    </div>
  </header>

  <div class="spine"><b>Spine message:</b> {{SPINE}}</div>

  <div class="grid">
    <!-- SHOT CARD — duplicate per shotlist row -->
    <article class="shot">
      <div class="frame">
        <img src="../../screenshots/calendar.png" alt="Shot 3 — Calendar module">
        <span class="kind" data-kind="real">real</span>
      </div>
      <div class="body">
        <div class="num">Shot 3 <span>0:14–0:20</span></div>
        <div class="ost">On-screen: —</div>
        <div class="vo">“See every crew, every inspection, and every milestone…”</div>
      </div>
    </article>

    <!-- GENERATED-FRAME CARD — when no screenshot exists -->
    <article class="shot">
      <div class="frame frame--gen">
        gen: cinematic close-up of a contractor’s phone on a worn truck dashboard, jobsite
        morning light, brand accent #FFDD00 hard-hat in soft background, #0a0a0f dusk tones,
        photoreal, no purple
        <span class="kind" data-kind="gen">gen</span>
      </div>
      <div class="body">
        <div class="num">Shot 1 <span>0:00–0:07</span></div>
        <div class="ost">On-screen: —</div>
        <div class="vo">“Still running your jobs out of a group text…”</div>
      </div>
    </article>
  </div>

  <footer>Generated by ship-promo · v{{VERSION}} · real frames are app screenshots; gen frames are prompts for your generator.</footer>
</div>
```
