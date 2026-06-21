<p align="center"><img src="assets/ship-pack-hero.svg" alt="ship-pack — turn what you ship into the docs, changelog, and launch kit around it" width="100%"></p>

# ship-pack

Docs + release toolkit: versioned user guides, benefit-first changelogs, screenshots, logos, a brand kit, an embeddable help bot, demo/onboarding/pitch/press kits — all driven by one docs/brand.json + docs/VERSION.

## What it does

<img src="assets/ship-pack-flow.svg" alt="One brand.json + one version drives a user guide, changelog, screenshots, logos, brand kit, help bot, and more" width="100%">

## Install as a Claude Code plugin

```
/plugin marketplace add taskmasterpeace/ship-pack
/plugin install ship-pack@ship-pack-marketplace
```

## Or drop-in (no marketplace)

Copy `skills/*` into `~/.claude/skills/` and `commands/*` into `~/.claude/commands/`.

## Contents

- **14 skills**, **15 commands**.
- Commands: `/ship-release`, `/ship-changelog`, `/ship-guide`, `/ship-screenshots`, `/ship-logos`, `/ship-brand`, `/ship-feed`, `/ship-helpbot`, `/ship-email`, `/ship-onboarding`, `/ship-faq`, `/ship-pitch`, `/ship-demo`, `/ship-promo`, `/ship-press`

Re-pack after editing the skills: `node tools/pack.mjs --out .`
