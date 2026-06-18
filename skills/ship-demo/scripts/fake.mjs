#!/usr/bin/env node
// fake.mjs — deterministic, dependency-free fake-data helpers for ship-demo seed scripts.
//
// Why deterministic: re-running the seed must produce the SAME rows (stable ids/values),
// so the seed is idempotent and a demo looks identical every run. Everything here is seeded
// from a string via a small hash + PRNG — no `Math.random`, no faker dependency, no install.
//
// Why "obviously fake": names, emails, phones, and addresses are drawn from clearly fictional
// pools (example.test domain, 555 phone prefix, fictional streets) so demo data can never be
// mistaken for — or leak — real PII.
//
// Import from a seed script:
//   import { rng, pick, person, company, email, phone, address, sentence, dateOffset, money, slugId } from "<skill>/scripts/fake.mjs";
//   const r = rng("smith-residence");            // stable stream for this entity
//   const owner = person(r);                      // { first, last, full, email, phone }

// ---- deterministic PRNG (mulberry32 over a string hash) ----------------------
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** rng(seed) → a function returning floats in [0,1). Same seed ⇒ same sequence. */
export function rng(seed) {
  const s = xmur3(String(seed))();
  return mulberry32(s);
}

export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export const int = (r, min, max) => Math.floor(r() * (max - min + 1)) + min;
export const bool = (r, p = 0.5) => r() < p;
/** A short stable id derived from a seed (good for deterministic primary keys). */
export const slugId = (seed) => (xmur3(String(seed))() >>> 0).toString(36).padStart(7, "0").slice(0, 8);

// ---- obviously-fictional pools ----------------------------------------------
const FIRST = ["Avery", "Jordan", "Riley", "Casey", "Morgan", "Quinn", "Reese", "Skyler",
  "Harper", "Rowan", "Emerson", "Marlowe", "Dakota", "Sage", "Blair", "Hollis"];
const LAST = ["Sample", "Demoson", "Testerly", "Placeholder", "Fakenham", "Exampleton",
  "Mockton", "Trialby", "Sandbox", "Proxyfield", "Loremwood", "Stubbs"];
const COMPANY_A = ["Northwind", "Acme", "Globex", "Initech", "Umbrella", "Hooli", "Soylent",
  "Vandelay", "Stark", "Wayne", "Pied Piper", "Cyberdyne"];
const COMPANY_B = ["Builders", "Labs", "Works", "Group", "Co", "Studio", "Partners", "Collective"];
const STREETS = ["Sample St", "Demo Ave", "Placeholder Rd", "Test Loop", "Example Blvd",
  "Mockingbird Ln", "Lorem Ct", "Sandbox Way", "Fixture Dr"];
const CITIES = ["Springfield", "Faketown", "Demo City", "Testburg", "Sampleville", "Exampleton"];
const STATES = ["CA", "TX", "NY", "WA", "CO", "VA", "IL"];
const WORDS = ("the quick demo project ships value to every customer with clear status and "
  + "simple actions so teams move faster and nothing falls through the cracks today").split(" ");

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function person(r) {
  const first = pick(r, FIRST);
  const last = pick(r, LAST);
  return {
    first, last,
    full: `${first} ${last}`,
    email: `${first}.${last}`.toLowerCase() + "@example.test",
    phone: phone(r),
  };
}
export function company(r) {
  const name = `${pick(r, COMPANY_A)} ${pick(r, COMPANY_B)}`;
  return { name, domain: name.toLowerCase().replace(/[^a-z]+/g, "") + ".example.test" };
}
export const email = (r, name) =>
  (name ? String(name).toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") : `user${int(r, 100, 999)}`) + "@example.test";
/** Always uses the reserved-for-fiction 555 exchange — never a routable number. */
export const phone = (r) => `(555) ${int(r, 200, 989)}-${String(int(r, 0, 9999)).padStart(4, "0")}`;
export function address(r) {
  return {
    street: `${int(r, 100, 9999)} ${pick(r, STREETS)}`,
    city: pick(r, CITIES),
    state: pick(r, STATES),
    zip: String(int(r, 10000, 99999)),
  };
}
export function sentence(r, min = 6, max = 14) {
  const n = int(r, min, max);
  const w = Array.from({ length: n }, () => pick(r, WORDS));
  return cap(w.join(" ")) + ".";
}
export function paragraph(r, sentences = 3) {
  return Array.from({ length: sentences }, () => sentence(r)).join(" ");
}
/** Money as integer cents (store-safe); use .dollars for display. */
export function money(r, minDollars, maxDollars) {
  const cents = int(r, minDollars * 100, maxDollars * 100);
  return { cents, dollars: (cents / 100).toFixed(2), display: `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}` };
}
/** ISO date offset by N days from a fixed anchor (so the seed is reproducible, not "now"). */
export function dateOffset(days, anchor = "2026-01-15T09:00:00.000Z") {
  const d = new Date(anchor);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

// CLI self-test:  node fake.mjs "smith-residence"
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("fake.mjs")) {
  const r = rng(process.argv[2] || "demo");
  console.log(JSON.stringify({
    id: slugId(process.argv[2] || "demo"),
    owner: person(r), company: company(r), address: address(r),
    note: sentence(r), amount: money(r, 1000, 50000), when: dateOffset(7),
  }, null, 2));
}
