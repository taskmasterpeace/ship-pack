# Guide Template

The standard structure for a user + admin guide. Use it unless the user asks for a
different format. Every `[bracketed]` note is an instruction to you, not literal text.

Keep the **header stamp** and **section 14** in sync with `docs/VERSION`.

---

```markdown
<!--
[Project] — User Guide
Brand tokens for any PDF/HTML render: [pull from the project's brand — colors, fonts, logos].
Screenshots: mark spots with [SCREENSHOT: short-id]; the screenshot-capture skill fills them.
-->

# [Project Name] — User & Admin Guide

**[One-line product promise.]**
**Current as of v[X.Y.Z]** · updated [YYYY-MM-DD]

> See [what's new](../SHIPPING-LOG.md) for changes since the last version.
> Sections marked **(Coming soon)** are in active development; everything else is live today.

---

## Table of contents
[Linked anchor list of every section below.]

---
```

## 1. Overview
- What the product is, who it's for, the main value, what users accomplish.
- One line on current documentation status (e.g. "first versioned edition").

## 2. Quick Start
The fastest path for a new user to a first win.
- **Before you begin** (accounts, access, prerequisites)
- **First access** (sign in / open)
- **First task** (one concrete thing that delivers value)
- **What success looks like**

## 3. User Roles and Permissions

| Role | What they can do | What they cannot do | Notes |
|------|------------------|---------------------|-------|

If roles are inferred rather than confirmed, say so in Notes.

## 4. Navigation Guide

| Area / Page | Purpose | Who uses it | Common actions |
|-------------|---------|-------------|----------------|

## 5. Core Concepts

| Term | Meaning | Example |
|------|---------|---------|

Only the objects/terms a user actually needs.

## 6. Main User Workflows
Repeat this block per workflow:

```markdown
### Workflow: [Name]
**Goal:** [what it achieves]
**Who uses this:** [roles]
**When to use it:** [scenario]
**Steps:**
1. …
2. …
**Example:** [a realistic, specific scenario]
**Expected result:** [what should happen]
**Common mistakes:** [likely confusion points]
**Troubleshooting:** [what to try if it fails]
```

## 7. Feature Reference
Repeat this block per feature:

```markdown
### [Feature Name]
**Status:** Available / Partially available / Planned / Unclear
**What it does:** [plain English]
**Where to find it:** [page, menu, tab]
**How to use it:**
1. …
**Example use case:** [concrete]
**Inputs:** [what the user provides]
**Outputs:** [what they get back]
**Admin notes:** [anything admins should know]
**Limitations / assumptions:** [honest]
```

## 8. Admin Guide
Include only sections that match real admin surfaces found in the project: managing
users · roles · records · reviewing submissions · settings · billing/subscription ·
templates/prompts/content · usage monitoring · support · data export/import ·
security & access.

If there is no admin surface, write:
> This project does not currently expose a clear admin interface in the inspected files.

## 9. Examples and Scenarios
At least 3 (unless the project is tiny). Each: Scenario · User goal · Steps taken ·
Expected outcome · What the user learns.

## 10. Troubleshooting

| Problem | Likely cause | What to try | When to contact admin |
|---------|--------------|-------------|-----------------------|

Only issues that make sense for this project.

## 11. FAQ
Questions real users would ask — not developer questions.

## 12. Glossary
Define the important terms.

## 13. Known Gaps, Unclear Areas, and Suggested Improvements
Be brutally honest. Do not hide uncertainty.

| Area | What's missing or unclear | Why it matters | Suggested fix |
|------|---------------------------|----------------|---------------|

## 14. Documentation Maintenance Notes
- **Documents version:** v[X.Y.Z] (matches `docs/VERSION`)
- **Last updated:** [YYYY-MM-DD]
- **Inspected:** [files/areas you actually looked at]
- **Changed in this pass:** [one-line summary — update mode only]
- **Assumptions:** [what you assumed]
- **Needs future review:** [what to revisit]
