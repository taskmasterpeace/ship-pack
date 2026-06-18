#!/usr/bin/env node
// version.mjs — tiny, dependency-free semver anchor manager for the docs-release skill pack.
//
// The "anchor" is a single-line semver in docs/VERSION. It is the one number that
// both the user-guide-builder and shipping-log skills read and stamp, so "what
// changed" (shipping log) and "how to use it" (user guide) always agree.
//
// Usage:
//   node version.mjs get                      print current version (errors if missing)
//   node version.mjs init [x.y.z]             create the anchor (default 0.1.0)
//   node version.mjs set <x.y.z>              set explicit version
//   node version.mjs bump <major|minor|patch> bump and write, print new version
//   node version.mjs date                     print today's date (YYYY-MM-DD) for stamping
// Options:
//   --file <path>   anchor file (default: docs/VERSION)
//   --json          machine-readable output: {"version","file"}
//
// Exit codes: 0 ok, 1 usage/validation error. No external dependencies.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const cmd = args[0];
const fileIdx = args.indexOf("--file");
const FILE = fileIdx !== -1 ? args[fileIdx + 1] : "docs/VERSION";
const JSON_OUT = args.includes("--json");

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function fail(msg) {
  console.error(`version: ${msg}`);
  process.exit(1);
}

function readVersion() {
  if (!existsSync(FILE)) {
    fail(`anchor not found at ${FILE} — run "node version.mjs init" first`);
  }
  const raw = readFileSync(FILE, "utf8").trim();
  if (!SEMVER.test(raw)) {
    fail(`anchor ${FILE} is not a valid semver (found "${raw}")`);
  }
  return raw;
}

function writeVersion(v) {
  if (!SEMVER.test(v)) {
    fail(`"${v}" is not a valid semver (expected MAJOR.MINOR.PATCH)`);
  }
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, v + "\n", "utf8");
  return v;
}

function out(version) {
  if (JSON_OUT) console.log(JSON.stringify({ version, file: FILE }));
  else console.log(version);
}

switch (cmd) {
  case "get":
    out(readVersion());
    break;

  case "init": {
    if (existsSync(FILE)) {
      fail(`anchor already exists at ${FILE} (${readFileSync(FILE, "utf8").trim()})`);
    }
    const seed = args[1] && SEMVER.test(args[1]) ? args[1] : "0.1.0";
    out(writeVersion(seed));
    break;
  }

  case "set":
    if (!args[1]) fail("usage: set <x.y.z>");
    out(writeVersion(args[1]));
    break;

  case "bump": {
    const kind = args[1];
    const [maj, min, pat] = readVersion().split(".").map(Number);
    let next;
    if (kind === "major") next = `${maj + 1}.0.0`;
    else if (kind === "minor") next = `${maj}.${min + 1}.0`;
    else if (kind === "patch") next = `${maj}.${min}.${pat + 1}`;
    else fail("usage: bump <major|minor|patch>");
    out(writeVersion(next));
    break;
  }

  case "date":
    out(new Date().toISOString().slice(0, 10));
    break;

  default:
    console.log(
      "Usage: node version.mjs <get|init|set|bump|date> [value] [--file docs/VERSION] [--json]"
    );
    process.exit(cmd ? 1 : 0);
}
