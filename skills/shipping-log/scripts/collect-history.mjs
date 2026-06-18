#!/usr/bin/env node
/**
 * Collect recent git/GitHub history for a public "shipping log" changelog.
 *
 * Usage (run from the repo root):
 *   node collect-history.mjs [--days 5] [--since-tag] [--github]
 *
 * Flags:
 *   --days N      Window of the last N days (default 5). Ignored if --since-tag.
 *   --since-tag   Scope from the latest git tag to HEAD instead of a day window.
 *   --github      Also pull merged PRs via `gh` (best-effort; needs gh auth).
 *
 * Output: JSON with { window, stats, tags, byDay[], github? } on stdout.
 * Cross-platform (Node + git in PATH). Safe to run read-only.
 */
import { execSync } from 'node:child_process'

const argv = process.argv.slice(2)
const has = (f) => argv.includes(f)
const val = (f, d) => {
  const i = argv.indexOf(f)
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d
}

const days = Number(val('--days', 5))
const useTag = has('--since-tag')
const useGithub = has('--github')

const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

if (sh('git rev-parse --is-inside-work-tree') !== 'true') {
  console.error('Not inside a git repository. Run from the repo root.')
  process.exit(1)
}

// Build the range/filter
let rangeArg = ''
let dateFilter = ''
let sinceTag = null
if (useTag) {
  sinceTag = sh('git describe --tags --abbrev=0') || null
  rangeArg = sinceTag ? `${sinceTag}..HEAD` : ''
} else {
  dateFilter = `--since="${days} days ago"`
}

// Record separators: 0x1f between fields, 0x1e between records.
const FMT = '%H%x1f%ad%x1f%s%x1f%b%x1e'
const raw = sh(`git log ${rangeArg} ${dateFilter} --date=short --pretty=format:"${FMT}"`)

const commits = raw
  .split('\x1e')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((rec) => {
    const [hash = '', date = '', subject = '', body = ''] = rec.split('\x1f')
    return { hash: hash.slice(0, 8), date, subject: subject.trim(), body: body.trim() }
  })

const byDayMap = {}
for (const c of commits) (byDayMap[c.date] ||= []).push(c)
const byDay = Object.keys(byDayMap)
  .sort()
  .reverse()
  .map((date) => ({ date, commits: byDayMap[date] }))

const dates = Object.keys(byDayMap).sort()
const stats = {
  commits: commits.length,
  days_active: dates.length,
  first_shipped: dates[0] || null,
  last_shipped: dates[dates.length - 1] || null,
  merges_or_releases: commits.filter((c) => /^merge /i.test(c.subject)).length,
}

const tags = sh('git tag --sort=-creatordate').split('\n').filter(Boolean).slice(0, 10)

const out = {
  window: useTag ? { since_tag: sinceTag } : { days },
  stats,
  tags,
  byDay,
}

if (useGithub) {
  const prs = sh('gh pr list --state merged --limit 50 --json number,title,mergedAt,labels')
  try {
    out.github = { merged_prs: JSON.parse(prs || '[]') }
  } catch {
    out.github = { merged_prs: [], note: 'gh unavailable or unauthenticated' }
  }
}

process.stdout.write(JSON.stringify(out, null, 2) + '\n')
