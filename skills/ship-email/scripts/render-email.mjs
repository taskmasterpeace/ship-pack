#!/usr/bin/env node
// render-email.mjs — render a small content JSON into the announcement assets:
//   • email.html      — self-contained, email-client-safe HTML (table layout, themeable :root)
//   • email.txt       — plain-text fallback (deliverability + accessibility)
//   • whats-new.html   — an in-app "What's new" modal snippet (drop-in <dialog>/<div>)
//   • social.txt       — the short social post + char counts
//
// Brand-as-data: colors + fonts come from docs/brand.json (one file, every output on-brand).
// NEVER purple by default. NO backdrop-filter, NO SVG feTurbulence (they hang renderers and
// most email clients strip/choke on them anyway).
//
// Usage:
//   node render-email.mjs --in docs/announcements/<v>/content.json --outdir docs/announcements/<v> \
//        [--brand docs/brand.json]
//
// Part of the ship-email skill / the docs + release "ship" pack.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const IN = opt("--in");
const OUTDIR = opt("--outdir");
const BRAND = opt("--brand", "docs/brand.json");

const fail = (m) => { console.error(`render-email: ${m}`); process.exit(1); };
if (!IN || !OUTDIR) fail("usage: render-email.mjs --in <content.json> --outdir <dir> [--brand docs/brand.json]");
if (!existsSync(IN)) fail(`content not found: ${IN}  (copy assets/content.example.json and fill it in)`);

let content;
try { content = JSON.parse(readFileSync(IN, "utf8")); }
catch (e) { fail(`content.json is not valid JSON: ${e.message}`); }

// ---------- brand tokens (brand-as-data; safe non-purple fallback) ----------
const DEFAULTS = {
  bg: "#0b0d12", surface: "#ffffff", panel: "#f4f7fb", border: "#dce3ec",
  text: "#1c2530", muted: "#5b6b7c", heading: "#0f1722",
  brand: "#1f6feb", accent: "#f5a623", "accent-ink": "#1f6feb",
};
const FONT_DEFAULTS = { display: "Bricolage Grotesque", body: "Hanken Grotesk" };
let brand = null;
if (existsSync(BRAND)) { try { brand = JSON.parse(readFileSync(BRAND, "utf8")); } catch {} }
const C = { ...DEFAULTS, ...((brand && brand.colors) || {}) };
const F = { ...FONT_DEFAULTS, ...((brand && brand.fonts) || {}) };
// guard: a brand.json missing surface/panel still needs light email chrome.
// We DON'T copy a dark-theme text/heading/muted token onto this light surface —
// the ink-swap below forces those back to readable dark inks.
if (!brand?.colors?.surface) C.surface = DEFAULTS.surface;
if (!brand?.colors?.panel) C.panel = DEFAULTS.panel;

function lum(hex) { // perceived luminance 0–255, or null if unparseable
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return null;
  const n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
function isDark(hex) { const L = lum(hex); return L != null && L < 110; }
// A token is "too light for a white card" if it's near-white (luminance > ~200).
// Such a value (e.g. a dark-theme text token like #e8eef7) is invisible on the email surface.
function tooLightForWhite(hex) { const L = lum(hex); return L != null && L > 200; }

// Emails render on a light card across clients. The brand may ship a DARK-THEME palette where
// `text`/`heading`/`muted` are light values intended for a dark surface — those are unreadable
// here. So when the email surface is light, pick a readable INK for each role:
//   • dark surface  → trust the brand's (light) tokens as-is
//   • light surface → use the brand token only if it's legible (not dark-on-its-own-bg AND not
//                     near-white); otherwise fall back to a readable dark default.
const SURFACE_DARK = isDark(C.surface);
function inkFor(token, darkDefault) {
  if (SURFACE_DARK) return token;                 // dark email card: brand light tokens are fine
  if (isDark(token)) return token;                // already dark → readable on white
  if (tooLightForWhite(token)) return darkDefault; // near-white on white → swap to dark ink
  return token;                                   // mid-tone brand color → keep it
}
const BODY_INK = inkFor(C.text, "#1c2530");
const MUTED_INK = inkFor(C.muted, "#5b6b7c");
const HEAD_INK = inkFor(C.heading, "#0f1722");

const fontStack = (n) => `'${n}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
const BODY_FONT = fontStack(F.body);
const DISPLAY_FONT = fontStack(F.display);

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- content model ----------
const product = content.product || (brand && brand.name) || "Our product";
const tagline = content.tagline || (brand && brand.tagline) || "";
const version = content.version || "";
const audience = content.audience || "customer";
const preheader = content.preheader || `What's new in ${product}${version ? ` ${version}` : ""}`;
const subject = content.subject || `What's new in ${product}${version ? ` ${version}` : ""}`;
const greeting = content.greeting || "Hi there,";
const intro = content.intro || "";
const items = Array.isArray(content.items) ? content.items : [];
const cta = content.cta || null; // { label, url }
const signoff = content.signoff || `— The ${product} team`;
const footer = content.footer || `You're receiving this because you use ${product}.`;
const social = content.social || {};

if (!items.length) console.warn("render-email: WARNING — no items[]; the announcement body will be empty.");
if (!content.unsubscribeUrl) console.warn("render-email: WARNING — no unsubscribeUrl; bulk/marketing email needs an unsubscribe link (CAN-SPAM / deliverability). Add \"unsubscribeUrl\" to content.json, or confirm this is a transactional send.");

// ---------- 1) email.html (table layout, inline-friendly, no fl/grid reliance) ----------
function itemRowsHtml() {
  return items.map((it) => {
    const title = esc(it.title || "");
    const body = esc(it.body || "");
    return `
            <tr><td style="padding:18px 0 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td valign="top" width="10" style="padding-top:6px;">
                    <div style="width:8px;height:8px;border-radius:2px;background:${C.accent};"></div>
                  </td>
                  <td valign="top" style="padding-left:12px;">
                    <div style="font-family:${DISPLAY_FONT};font-size:17px;line-height:1.35;font-weight:700;color:${HEAD_INK};">${title}</div>
                    <div style="font-family:${BODY_FONT};font-size:15px;line-height:1.55;color:${BODY_INK};padding-top:4px;">${body}</div>
                  </td>
                </tr>
              </table>
            </td></tr>`;
  }).join("");
}
const ctaHtml = cta && cta.url ? `
            <tr><td style="padding:26px 0 4px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${C.brand};">
                <a href="${esc(cta.url)}" style="display:inline-block;padding:13px 26px;font-family:${BODY_FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(cta.label || "See what's new")}</a>
              </td></tr></table>
            </td></tr>` : "";

const emailHtml = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="x-apple-disable-message-reformatting">
  <title>${esc(subject)}</title>
  <!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
  <style>
    /* :root tokens are sourced from brand.json — re-theme by editing these (brand color, not a default accent). */
    :root{
      --brand:${C.brand}; --accent:${C.accent}; --ink:${BODY_INK};
      --heading:${HEAD_INK}; --muted:${MUTED_INK}; --panel:${C.panel}; --border:${C.border};
    }
    body{margin:0;padding:0;background:${C.panel};-webkit-text-size-adjust:100%;}
    a{color:${C.brand};}
    @media (max-width:620px){ .container{width:100%!important;} .px{padding-left:22px!important;padding-right:22px!important;} }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.panel};">
  <!-- preheader: shows in the inbox preview, hidden in the body -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.panel};">
    <tr><td align="center" style="padding:28px 14px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${C.surface};border:1px solid ${C.border};border-radius:14px;overflow:hidden;">
        <!-- brand band -->
        <tr><td style="background:${C.brand};height:6px;line-height:6px;font-size:6px;">&nbsp;</td></tr>
        <tr><td class="px" style="padding:30px 40px 6px 40px;">
          <div style="font-family:${DISPLAY_FONT};font-size:13px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:${C.brand};">${esc(product)}${version ? ` &middot; ${esc(version)}` : ""}</div>
        </td></tr>
        <tr><td class="px" style="padding:8px 40px 0 40px;">
          <h1 style="margin:0;font-family:${DISPLAY_FONT};font-size:26px;line-height:1.2;font-weight:800;color:${HEAD_INK};letter-spacing:-.01em;">${esc(content.headline || subject)}</h1>
          ${tagline ? `<div style="font-family:${BODY_FONT};font-size:15px;color:${MUTED_INK};padding-top:6px;">${esc(tagline)}</div>` : ""}
        </td></tr>
        <tr><td class="px" style="padding:22px 40px 0 40px;">
          <p style="margin:0 0 14px 0;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:${BODY_INK};">${esc(greeting)}</p>
          ${intro ? `<p style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:${BODY_INK};">${esc(intro)}</p>` : ""}
        </td></tr>
        <tr><td class="px" style="padding:6px 40px 0 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRowsHtml()}${ctaHtml}</table>
        </td></tr>
        <tr><td class="px" style="padding:26px 40px 30px 40px;">
          <p style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:${BODY_INK};">${esc(signoff)}</p>
        </td></tr>
        <tr><td style="background:${C.panel};border-top:1px solid ${C.border};padding:18px 40px;">
          <div style="font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${MUTED_INK};">${esc(footer)}${content.unsubscribeUrl ? ` &middot; <a href="${esc(content.unsubscribeUrl)}" style="color:${MUTED_INK};">Unsubscribe</a>` : ""}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ---------- 2) email.txt (plain-text fallback) ----------
function wrap(s, w = 72) {
  return String(s || "").split(/\n/).map((line) => {
    const words = line.split(/\s+/); let out = "", cur = "";
    for (const word of words) {
      if ((cur + " " + word).trim().length > w) { out += (out ? "\n" : "") + cur; cur = word; }
      else cur = (cur ? cur + " " : "") + word;
    }
    return out + (out ? "\n" : "") + cur;
  }).join("\n");
}
const txtItems = items.map((it) => `* ${it.title || ""}\n  ${wrap(it.body || "", 70).replace(/\n/g, "\n  ")}`).join("\n\n");
const emailTxt = [
  subject, "=".repeat(Math.min(subject.length, 72)), "",
  greeting, "", intro ? wrap(intro) + "\n" : "",
  txtItems, "",
  cta && cta.url ? `${cta.label || "See what's new"}: ${cta.url}\n` : "",
  signoff, "", "—", footer, content.unsubscribeUrl ? `Unsubscribe: ${content.unsubscribeUrl}` : "",
].filter((x) => x !== undefined).join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";

// ---------- 3) whats-new.html (in-app modal snippet — drop-in, theme via CSS vars) ----------
const modalItems = items.map((it) => `
      <li class="wn-item">
        <span class="wn-dot" aria-hidden="true"></span>
        <div>
          <p class="wn-item-title">${esc(it.title || "")}</p>
          <p class="wn-item-body">${esc(it.body || "")}</p>
        </div>
      </li>`).join("");
const modalHtml = `<!-- ship-email: in-app "What's new" modal snippet for ${esc(product)} ${esc(version)}.
     Self-contained. Theme by editing the scoped CSS variables (sourced from brand.json).
     Renderer-safe (no blur filters, no SVG noise). Drop into your app and toggle [data-open]. -->
<div class="whats-new" data-version="${esc(version)}" role="dialog" aria-modal="true" aria-labelledby="wn-title">
  <style>
    .whats-new{
      --wn-brand:${C.brand}; --wn-accent:${C.accent};
      --wn-surface:${C.surface}; --wn-panel:${C.panel}; --wn-border:${C.border};
      --wn-heading:${HEAD_INK}; --wn-text:${BODY_INK}; --wn-muted:${MUTED_INK};
      font-family:${BODY_FONT}; color:var(--wn-text);
      max-width:440px; background:var(--wn-surface); border:1px solid var(--wn-border);
      border-radius:14px; overflow:hidden; box-shadow:0 18px 50px rgba(10,16,30,.28);
    }
    .whats-new .wn-band{height:5px;background:var(--wn-brand);}
    .whats-new .wn-head{padding:20px 22px 4px;}
    .whats-new .wn-kicker{font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--wn-brand);}
    .whats-new #wn-title{margin:6px 0 0;font-family:${DISPLAY_FONT};font-size:20px;line-height:1.25;font-weight:800;color:var(--wn-heading);letter-spacing:-.01em;}
    .whats-new .wn-list{list-style:none;margin:0;padding:8px 22px 6px;}
    .whats-new .wn-item{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--wn-border);}
    .whats-new .wn-item:first-child{border-top:0;}
    .whats-new .wn-dot{flex:0 0 auto;width:8px;height:8px;border-radius:2px;background:var(--wn-accent);margin-top:6px;}
    .whats-new .wn-item-title{margin:0;font-weight:700;font-size:14.5px;color:var(--wn-heading);}
    .whats-new .wn-item-body{margin:2px 0 0;font-size:13.5px;line-height:1.5;color:var(--wn-muted);}
    .whats-new .wn-foot{padding:14px 22px 18px;display:flex;justify-content:flex-end;gap:8px;background:var(--wn-panel);border-top:1px solid var(--wn-border);}
    .whats-new .wn-btn{appearance:none;border:0;cursor:pointer;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;font-family:inherit;}
    .whats-new .wn-btn-primary{background:var(--wn-brand);color:#fff;text-decoration:none;}
    .whats-new .wn-btn-ghost{background:transparent;color:var(--wn-muted);}
  </style>
  <div class="wn-band"></div>
  <div class="wn-head">
    <div class="wn-kicker">${esc(product)}${version ? ` &middot; ${esc(version)}` : ""}</div>
    <h2 id="wn-title">${esc(content.modalTitle || content.headline || "What's new")}</h2>
  </div>
  <ul class="wn-list">${modalItems}
  </ul>
  <div class="wn-foot">
    <button class="wn-btn wn-btn-ghost" type="button" data-wn-dismiss>Maybe later</button>
    ${cta && cta.url ? `<a class="wn-btn wn-btn-primary" href="${esc(cta.url)}">${esc(cta.label || "Take a look")}</a>` : `<button class="wn-btn wn-btn-primary" type="button" data-wn-dismiss>Got it</button>`}
  </div>
</div>`;

// ---------- 4) social.txt ----------
const sName = social.network || "social";
const sBody = (social.post || "").trim();
const sTags = Array.isArray(social.hashtags) ? social.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ") : "";
const sLink = social.url || (cta && cta.url) || "";
const socialFull = [sBody, sTags, sLink].filter(Boolean).join("\n\n");
const socialTxt = [
  `# ${product} ${version} — social post (${sName})`,
  `# length: ${socialFull.length} chars  (X/Twitter limit 280 · LinkedIn ~3000 · favor ≤220 for reshareability)`,
  "", socialFull, "",
].join("\n");

// ---------- write ----------
if (!existsSync(OUTDIR)) mkdirSync(OUTDIR, { recursive: true });
const w = (name, data) => { writeFileSync(join(OUTDIR, name), data); return name; };
const written = [
  w("email.html", emailHtml),
  w("email.txt", emailTxt),
  w("whats-new.html", modalHtml),
  w("social.txt", socialTxt),
];

console.log(`render-email: wrote for ${product}${version ? ` ${version}` : ""} (audience: ${audience})`);
for (const f of written) console.log(`  ✓ ${join(OUTDIR, f)}`);
console.log(`  theme: brand=${C.brand} accent=${C.accent}${brand ? ` (from ${BRAND})` : " (neutral fallback — no brand.json)"}`);
console.log(`  social: ${socialFull.length} chars`);
const lightSwaps = !SURFACE_DARK
  ? ["text", "muted", "heading"].filter((k) => tooLightForWhite(C[k])).join(", ")
  : "";
if (lightSwaps) console.log(`  ink: swapped near-white brand token(s) [${lightSwaps}] to dark ink for the light email card (legible on white).`);
if (!items.length) console.log("  ⚠ items[] was empty — fill content.json before sending.");
if (!content.unsubscribeUrl) console.log("  ⚠ no unsubscribeUrl — add one for bulk mail (omit only for transactional sends).");
