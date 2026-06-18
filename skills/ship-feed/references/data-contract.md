# Data contract — `changelog.json`

`changelog.json` is the one machine-readable artifact this skill produces; the feed and the
widget both read it, and any external site/app can too. Treat its shape as a stable contract.
The `$schema` field (`ship-feed/changelog@1`) is the version handle — bump it only on a breaking
change and keep old consumers in mind.

## Top-level envelope

| Field | Type | Notes |
|---|---|---|
| `$schema` | string | `"ship-feed/changelog@1"`. Consumers may assert on this. |
| `product` | string\|null | From `brand.json` `name`. Falls back to `"Product"`. |
| `tagline` | string\|null | From `brand.json` `tagline`. |
| `siteUrl` | string\|null | Passed via `--site-url`; used to build absolute feed links. |
| `currentVersion` | string\|null | From `docs/VERSION`; falls back to the newest release. |
| `generatedAt` | string | ISO-8601 timestamp of the parse run. |
| `categories` | string[] | The categories actually present, in canonical order. |
| `stats` | object | `{ releases, items, latestVersion, latestDate }`. |
| `releases` | array | Newest first. See below. |

## Release object

| Field | Type | Notes |
|---|---|---|
| `version` | string | Semver without the leading `v` (e.g. `"0.8.0"`). |
| `date` | string\|null | `YYYY-MM-DD` if present in the heading. |
| `title` | string\|null | The text after `·`/`:` in the heading (e.g. `"Money & decisions"`). |
| `summary` | string\|null | The `_italic_` line under the heading, as plain text. |
| `id` | string | Anchor id, `"v" + version` (used in feed links + widget anchors). |
| `items` | array | One per bullet. See below. |

## Item object

| Field | Type | Notes |
|---|---|---|
| `category` | string | One of `new \| improved \| fixed \| security \| other`. |
| `title` | string | The `**bold lead**` of the bullet (no trailing period), or the whole line. |
| `body` | string | The remainder after the bold lead (empty if none). |
| `text` | string | The full bullet as plain text (lead + body) — convenient for feeds/search. |

## Canonical categories

Headings are matched by **keyword**, not by emoji, so all of these map to `new`:
`### ✨ New`, `### New`, `### New things`. Mapping:

| Canonical | Heading keywords |
|---|---|
| `new` | new |
| `improved` | improve, improved, enhance, enhanced |
| `fixed` | fix, fixed, bug |
| `security` | security, secure |
| `other` | anything unmatched |

## Stability rules for downstream consumers

- New optional fields may be **added** without a `$schema` bump. Don't fail on unknown keys.
- Field **renames/removals or category-id changes** require a `$schema` bump (`@2`).
- `releases` is always newest-first. `stats.latest*` always mirrors `releases[0]`.
- A valid-but-empty log yields `releases: []` and `stats.*: 0/null` — render an empty state,
  don't crash.
