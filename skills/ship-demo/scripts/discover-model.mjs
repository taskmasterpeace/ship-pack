#!/usr/bin/env node
// discover-model.mjs — discover a project's data model + prior demo work for the ship-demo skill.
//
// Before generating any seed data, this answers: what is the data model, how does this
// project seed/migrate, and does demo material already exist? It walks the repo (bounded,
// no node_modules), classifies the ORM/data layer, extracts table/model/type names, and
// reports the demo entry points already present so the skill APPENDS to a project instead
// of fighting it. Dependency-free, cross-platform, read-only.
//
// Usage:
//   node discover-model.mjs [--root .] [--json]
//
// Output (default): a human-readable report. With --json: a machine-readable object
//   { root, orm, schemaFiles, models, seedScripts, demoDocs, brandJson, version, packageManager, dbCommands, recommendation }

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const ROOT = opt("--root", ".");
const JSON_OUT = args.includes("--json");

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".turbo", ".cache",
  "coverage", ".vercel", ".expo", "out", "vendor", ".venv", "venv", "__pycache__",
]);
const MAX_DEPTH = 6;
const MAX_FILES = 6000;

// ---- bounded walk -----------------------------------------------------------
let scanned = 0;
function walk(dir, depth, hit) {
  if (depth > MAX_DEPTH || scanned > MAX_FILES) return;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (scanned > MAX_FILES) return;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
      walk(full, depth + 1, hit);
    } else {
      scanned++;
      hit(full, e.name);
    }
  }
}

const rel = (p) => {
  // Strip the ROOT prefix only when it's a real prefix; ROOT="." has length 1 but no prefix.
  let r = p;
  if (ROOT !== "." && ROOT !== "" && r.startsWith(ROOT)) r = r.slice(ROOT.length);
  return r.replace(/^[\\/]/, "").replace(/\\/g, "/");
};
const read = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const firstExisting = (list) => { for (const p of list) if (existsSync(join(ROOT, p))) return p; return null; };

// ---- collectors -------------------------------------------------------------
const schemaFiles = [];   // drizzle/prisma/sql/sequelize/typeorm/zod-ish schema files
const seedScripts = [];   // existing seed / fixture / factory files
const tsTypeFiles = [];   // shared TS type files that look like the domain model
const ormSignals = { drizzle: 0, prisma: 0, sequelize: 0, typeorm: 0, mongoose: 0, sql: 0, supabase: 0 };

const SCHEMA_DIR = /(^|[\\/])(schema|schemas|models|migrations|entities)([\\/]|$)/i;
const SEED_HINT = /(seed|seeds|seeder|fixture|fixtures|factory|factories|demo-data|sampledata|sample-data|mock-data)/i;
const TYPE_HINT = /(types?|domain|entities|models)\.(ts|tsx)$/i;

function classify(full, name) {
  const r = rel(full);
  const ext = extname(name).toLowerCase();
  const lower = r.toLowerCase();

  if (name === "schema.prisma") { schemaFiles.push(r); ormSignals.prisma += 3; return; }
  if (ext === ".sql") {
    if (SEED_HINT.test(name)) seedScripts.push(r);   // seed-demo.sql, fixtures.sql, etc.
    else schemaFiles.push(r);
    ormSignals.sql += 1;
    return;
  }

  if (ext === ".ts" || ext === ".js" || ext === ".tsx") {
    const looksSchema = SCHEMA_DIR.test(r);
    if (SEED_HINT.test(name) && !/\.test\.|\.spec\./.test(name)) seedScripts.push(r);
    if (looksSchema) {
      // peek for ORM markers (cheap: read only schema-ish files)
      const head = read(full).slice(0, 4000);
      if (/from ['"]drizzle-orm|pgTable|sqliteTable|mysqlTable/.test(head)) { ormSignals.drizzle += 2; schemaFiles.push(r); return; }
      if (/sequelize\.define|extends Model|DataTypes\./.test(head)) { ormSignals.sequelize += 2; schemaFiles.push(r); return; }
      if (/@Entity\(|typeorm/.test(head)) { ormSignals.typeorm += 2; schemaFiles.push(r); return; }
      if (/new Schema\(|mongoose\.model|mongoose\.Schema/.test(head)) { ormSignals.mongoose += 2; schemaFiles.push(r); return; }
      schemaFiles.push(r);
    } else if (TYPE_HINT.test(name) && /(shared|types|packages|src)/.test(lower)) {
      tsTypeFiles.push(r);
    }
  }
}

walk(ROOT, 0, classify);

// supabase signal
if (existsSync(join(ROOT, "supabase"))) ormSignals.supabase += 2;

// ---- model name extraction (best-effort, by detected ORM) -------------------
function extractNames() {
  const names = new Set();
  const sample = schemaFiles.slice(0, 40);
  for (const r of sample) {
    const txt = read(join(ROOT, r));
    // Drizzle: export const users = pgTable("users", {...})
    for (const m of txt.matchAll(/export\s+const\s+(\w+)\s*=\s*(?:pg|sqlite|mysql)Table\(\s*["'`](\w+)["'`]/g)) names.add(m[2] || m[1]);
    // Prisma: model User {
    for (const m of txt.matchAll(/\bmodel\s+(\w+)\s*\{/g)) names.add(m[1]);
    // SQL: CREATE TABLE [IF NOT EXISTS] name
    for (const m of txt.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?["'`]?([\w.]+)["'`]?/gi)) names.add(m[1].replace(/^public\./, ""));
    // TypeORM/Mongoose/Sequelize class + define
    for (const m of txt.matchAll(/(?:class\s+(\w+)|sequelize\.define\(\s*["'`](\w+))/g)) names.add(m[1] || m[2]);
  }
  // shared TS types as a fallback model surface
  for (const r of tsTypeFiles.slice(0, 12)) {
    const txt = read(join(ROOT, r));
    for (const m of txt.matchAll(/export\s+(?:interface|type)\s+(\w+)/g)) names.add(m[1]);
  }
  return [...names].filter((n) => n && n.length > 1).sort();
}

// ---- package manager + db commands ------------------------------------------
function detectPM() {
  if (existsSync(join(ROOT, "yarn.lock"))) return "yarn";
  if (existsSync(join(ROOT, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(ROOT, "bun.lockb"))) return "bun";
  if (existsSync(join(ROOT, "package-lock.json"))) return "npm";
  return "npm";
}
function dbScripts() {
  const pkgPath = firstExisting(["package.json", "packages/web/package.json", "app/package.json"]);
  if (!pkgPath) return {};
  let pkg; try { pkg = JSON.parse(read(join(ROOT, pkgPath))); } catch { return {}; }
  const out = {};
  for (const [k, v] of Object.entries(pkg.scripts || {})) {
    if (/seed|db|migrat|drizzle|prisma|reset|push/i.test(k)) out[k] = v;
  }
  return out;
}

// ---- prior demo work --------------------------------------------------------
const demoDocs = [
  "docs/demo/script.md", "docs/demo/script.html", "docs/DEMO.md",
  "docs/DEMO-LOGINS.md", "docs/demo-data.md",
].filter((p) => existsSync(join(ROOT, p)));

const brandJson = firstExisting(["docs/brand.json", "brand.json", "docs/brand/brand.json"]);
const versionFile = firstExisting(["docs/VERSION", "VERSION"]);
const version = versionFile ? read(join(ROOT, versionFile)).trim() : null;

// ---- decide dominant ORM + recommendation ----------------------------------
const orm = Object.entries(ormSignals).sort((a, b) => b[1] - a[1])[0];
const ormName = orm && orm[1] > 0 ? orm[0] : "unknown";
const models = extractNames();
const pm = detectPM();
const dbCommands = dbScripts();

let recommendation;
if (seedScripts.length) recommendation = `append to / extend the existing seed (${seedScripts[0]}) — match its style, do not duplicate`;
else if (ormName !== "unknown") recommendation = `generate a new idempotent seed for the ${ormName} model (${models.length} entities found)`;
else if (models.length) recommendation = `model inferred from TS types (${models.length}) — confirm the persistence layer before seeding`;
else recommendation = "no data model auto-detected — ask the user where the schema/types live before generating a seed";

const report = {
  root: ROOT, orm: ormName, ormSignals,
  schemaFiles: schemaFiles.slice(0, 60),
  models,
  tsTypeFiles: tsTypeFiles.slice(0, 20),
  seedScripts, demoDocs, brandJson, version,
  packageManager: pm, dbCommands,
  recommendation,
};

if (JSON_OUT) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

const line = (l, v) => console.log(`  ${l.padEnd(14)}: ${v}`);
console.log(`Data-model scan  (root: ${ROOT}, ${scanned} files seen)`);
line("ORM / layer", `${ormName}${ormName === "unknown" ? "" : `  (signals: ${JSON.stringify(ormSignals)})`}`);
line("schema files", schemaFiles.length ? `${schemaFiles.length} found` : "— none —");
for (const s of schemaFiles.slice(0, 12)) console.log(`     • ${s}`);
line("models/tables", models.length ? `${models.length}: ${models.slice(0, 24).join(", ")}${models.length > 24 ? " …" : ""}` : "— none auto-detected —");
line("existing seed", seedScripts.length ? seedScripts.join(", ") : "— none —");
line("demo docs", demoDocs.length ? demoDocs.join(", ") : "— none —");
line("brand.json", brandJson || "— none —");
line("version", version || "— none —");
line("pkg manager", pm);
line("db scripts", Object.keys(dbCommands).length ? Object.keys(dbCommands).join(", ") : "— none —");
console.log(`\n  → recommendation: ${recommendation}`);
