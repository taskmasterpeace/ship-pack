#!/usr/bin/env node
/**
 * Aggregate a PORTFOLIO of git repos into one "ship index" dataset — the data
 * behind a "we ship across everything" board.
 *
 * Usage:
 *   node collect-portfolio.mjs --config portfolio.config.json [--days 35]
 *
 * Config JSON shape:
 *   {
 *     "title": "Machine King Labs",
 *     "projects": [
 *       { "name": "Directors Palette", "path": "D:/git/directors-palette-v2",
 *         "tagline": "AI storyboard & image gen", "accent": "info" }
 *     ]
 *   }
 *
 * Output (stdout JSON): portfolio totals, a merged daily heatmap, per-project
 * stats, and the latest cross-project commits (raw subjects — rewrite them into
 * benefit-first copy with references/voice-and-format.md before publishing).
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const argv = process.argv.slice(2)
const val = (f, d) => {
  const i = argv.indexOf(f)
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d
}
const configPath = val('--config', 'portfolio.config.json')
const days = Number(val('--days', 35))

const sh = (path, cmd) => {
  try {
    return execSync(`git -C "${path}" ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

let config
try {
  config = JSON.parse(readFileSync(configPath, 'utf8'))
} catch (e) {
  console.error(`Could not read config at ${configPath}: ${e.message}`)
  process.exit(1)
}

const sinceWeek = '7 days ago'
const sinceMonth = '30 days ago'
const dailyAll = {}
const recent = []
const projects = []

for (const p of config.projects || []) {
  const isRepo = sh(p.path, 'rev-parse --is-inside-work-tree') === 'true'
  if (!isRepo) {
    projects.push({ ...p, error: 'not a git repo', commits7: 0, commits30: 0 })
    continue
  }
  const count = (since) => Number(sh(p.path, `log --since="${since}" --oneline`).split('\n').filter(Boolean).length)
  const commits7 = count(sinceWeek)
  const commits30 = count(sinceMonth)
  const total = Number(sh(p.path, 'rev-list --count HEAD')) || 0
  const last = sh(p.path, 'log -1 --date=short --format=%ad') || null

  const dayLines = sh(p.path, `log --since="${days} days ago" --date=short --pretty=%ad`).split('\n').filter(Boolean)
  const daily = {}
  for (const dt of dayLines) {
    daily[dt] = (daily[dt] || 0) + 1
    dailyAll[dt] = (dailyAll[dt] || 0) + 1
  }

  const recentLines = sh(p.path, 'log -5 --date=short --pretty=%ad%x1f%s').split('\n').filter(Boolean)
  for (const line of recentLines) {
    const [date, subject] = line.split('\x1f')
    recent.push({ project: p.name, accent: p.accent || 'info', date, subject })
  }

  projects.push({ name: p.name, tagline: p.tagline || '', accent: p.accent || 'info', path: p.path, commits7, commits30, total, last, daily })
}

projects.sort((a, b) => (b.commits30 || 0) - (a.commits30 || 0))
recent.sort((a, b) => (a.date < b.date ? 1 : -1))

const dates = Object.keys(dailyAll)
let busiest = { date: null, n: 0 }
for (const [dt, n] of Object.entries(dailyAll)) if (n > busiest.n) busiest = { date: dt, n }

const out = {
  title: config.title || 'Portfolio',
  generated_for_window_days: days,
  totals: {
    ships_this_week: projects.reduce((s, p) => s + (p.commits7 || 0), 0),
    ships_30d: projects.reduce((s, p) => s + (p.commits30 || 0), 0),
    active_this_week: projects.filter((p) => (p.commits7 || 0) > 0).length,
    project_count: projects.length,
    busiest_day: busiest,
  },
  daily: dailyAll,
  projects,
  recent: recent.slice(0, 12),
}

process.stdout.write(JSON.stringify(out, null, 2) + '\n')
