# Documentation Initiative Phase 1 Implementation Plan: Legibility and Split

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give cairn-cms a clean, trustworthy face for external adopters: a rewritten README, a security policy, a prioritized roadmap, accurate npm packaging, and the historical clutter moved out of the adopter's path.

**Architecture:** This is the first of six phases in the documentation initiative spec at `docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md`. Phase 1 produces the repo-root legibility files and the `docs/` skeleton without writing the four Diátaxis arms yet. Those arms (reference, explanation, guides, tutorial) land in phases 2 through 5. Every link this phase writes must point at a file that exists, so the phase creates the linked-to files before the files that link to them.

**Tech Stack:** Markdown, `prose-guard` (the writing-voice gate), `gh` CLI (GitHub API for private advisories), `npm`/`publint` (package metadata), `git mv` (history-preserving relocation).

**Conventions for this plan:** Documentation has no unit tests. Each task's verification is the docs gate: `prose-guard <file>` shows no blocking tell (em-dash, banned word, or banned structure), every relative link resolves to a real file, and any factual claim matches the code. The advisory anaphora line from `prose-guard` is non-blocking; do not chase it. All authored prose follows the writing-voice standard, so draft clean on the first pass.

**Reused content.** Two blocks are reused verbatim across files. Copy them exactly.

Status block:

```
cairn-cms runs two production sites today, [ecnordic.ski](https://ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions. The author is
still working through the core-feature roadmap, and the project stays closely held until that
core lands.
```

Contribution line:

```
A contributor who feels inspired is welcome to open an issue or a discussion to start a
conversation. There is no formal contribution process yet, so this is not an open call for
pull requests.
```

---

### Task 1: Relocate historical docs to `docs/internal/`

**Files:**
- Create: `docs/internal/README.md`
- Move (via `git mv`): `docs/PLAN.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-CRITIQUE.md`, `docs/FORWARD-COMPAT.md`, `docs/cairn-dx-feedback-2026-06-04.md`, `docs/cairn-dx-feedback-2026-06-04-ecnordic-0.24.md`, `docs/dx-backlog-ecnordic-migration.md` into `docs/internal/`

- [ ] **Step 1: Create the directory and move the files with git**

```bash
mkdir -p docs/internal
git mv docs/PLAN.md docs/internal/PLAN.md
git mv docs/ARCHITECTURE.md docs/internal/ARCHITECTURE.md
git mv docs/ARCHITECTURE-CRITIQUE.md docs/internal/ARCHITECTURE-CRITIQUE.md
git mv docs/FORWARD-COMPAT.md docs/internal/FORWARD-COMPAT.md
git mv docs/cairn-dx-feedback-2026-06-04.md docs/internal/cairn-dx-feedback-2026-06-04.md
git mv docs/cairn-dx-feedback-2026-06-04-ecnordic-0.24.md docs/internal/cairn-dx-feedback-2026-06-04-ecnordic-0.24.md
git mv docs/dx-backlog-ecnordic-migration.md docs/internal/dx-backlog-ecnordic-migration.md
```

- [ ] **Step 2: Write the `docs/internal/` banner**

Create `docs/internal/README.md` with exactly this content:

```markdown
# Internal and historical docs

These documents are kept for history. They are superseded by the docs under `docs/`, and they
may describe designs that were later changed or reverted. Do not read them as current.

- `PLAN.md`: the original rebuild plan.
- `ARCHITECTURE.md`: the original architecture writeup.
- `ARCHITECTURE-CRITIQUE.md`: a self-critique of that architecture.
- `FORWARD-COMPAT.md`: early forward-compatibility notes.
- `cairn-dx-feedback-2026-06-04.md`: a developer-experience feedback pass from 907.life.
- `cairn-dx-feedback-2026-06-04-ecnordic-0.24.md`: a companion feedback note from the ecnordic upgrade.
- `dx-backlog-ecnordic-migration.md`: the DX backlog from the ecnordic migration.
```

- [ ] **Step 3: Find and fix inbound references to the moved files**

Search the files that stay (root files, `CLAUDE.md`, the functional spec, `docs/STATUS.md`, other `docs/*.md`) for references to the moved basenames, and repoint them to `docs/internal/`.

Run:

```bash
grep -rn --include='*.md' -E 'docs/(PLAN|ARCHITECTURE|ARCHITECTURE-CRITIQUE|FORWARD-COMPAT)\.md|cairn-dx-feedback-2026-06-04|dx-backlog-ecnordic-migration' . \
  | grep -v '^\./docs/internal/' | grep -v '^\./docs/superpowers/plans/2026-06-04-cairn-docs'
```

For each hit outside `docs/internal/`, update the path to its new `docs/internal/...` location. `CLAUDE.md` and `README.md` both reference `docs/PLAN.md` and `docs/ARCHITECTURE.md`; the `README.md` reference is removed wholesale in Task 5, so only fix the `CLAUDE.md` reference here (change `docs/PLAN.md` to `docs/internal/PLAN.md` and `docs/ARCHITECTURE.md` to `docs/internal/ARCHITECTURE.md`). Do not edit files under `docs/internal/` (their cross-references moved together and stay valid by basename).

- [ ] **Step 4: Verify nothing dangles and the banner is clean**

Run:

```bash
prose-guard docs/internal/README.md
test -f docs/internal/PLAN.md && test -f docs/internal/dx-backlog-ecnordic-migration.md && echo "moved OK"
grep -rn --include='*.md' -E 'docs/(PLAN|ARCHITECTURE)\.md' . | grep -v '^\./docs/internal/' | grep -v 'docs-phase-1' || echo "no stale refs"
```

Expected: `prose-guard` reports no blocking tell, `moved OK` prints, and the stale-ref grep prints `no stale refs`.

- [ ] **Step 5: Commit**

```bash
git add -A docs/internal CLAUDE.md
git commit -m "Move historical docs under docs/internal/ with a banner"
```

---

### Task 2: Seed the docs friction log

**Files:**
- Create: `docs/internal/docs-friction-log.md`

- [ ] **Step 1: Write the friction log**

Create `docs/internal/docs-friction-log.md` with exactly this content:

```markdown
# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting
cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and the backlog. A finding here does not block the doc
that found it.

Record each finding with its perspective, the doc that surfaced it, and a short note. The
perspective is `developer` (the integrator building and deploying a site) or `editor` (the
non-technical author working in `/admin`).

## Findings

Phase 1 seeds this file. Later phases append as they write.

- **developer** (npm packaging, from `cairn-dx-feedback-2026-06-04-ecnordic-0.24.md`): the
  published tarball shipped no `CHANGELOG.md` and no `homepage`, so an npm consumer could not
  reach the upgrade record from the registry page. Addressed in this phase's metadata task.
```

- [ ] **Step 2: Verify**

Run: `prose-guard docs/internal/docs-friction-log.md`
Expected: no blocking tell.

- [ ] **Step 3: Commit**

```bash
git add docs/internal/docs-friction-log.md
git commit -m "Seed the docs friction log"
```

---

### Task 3: Add the security policy and enable private advisories

**Files:**
- Create: `SECURITY.md`

- [ ] **Step 1: Write `SECURITY.md`**

Create `SECURITY.md` at the repo root with exactly this content:

```markdown
# Security policy

## Supported versions

cairn-cms is `0.x`. Only the latest published minor version receives security fixes. Pin a
caret range and upgrade when a new minor lands. There is no backport branch.

## Reporting a vulnerability

Report privately through GitHub's private vulnerability reporting. Open the repository's
**Security** tab and choose **Report a vulnerability**. That opens a private advisory the
maintainer can see. Please do not file a public issue for a suspected vulnerability.

Include the affected version, a description, and a reproduction if you have one. Expect an
acknowledgement within a few days.

## Security posture

cairn-cms owns its editor authentication. A magic-link login issues an atomic single-use
token, confirms it over POST, and stores opaque session rows in Cloudflare D1. Sessions ride a
`__Host-` cookie over HTTPS. Editor access is an allowlist with two roles, `owner` and
`editor`, and an anti-lockout rule keeps at least one owner in place.

The render path applies a rehype-sanitize floor by default. Author markdown cannot inject raw
HTML or a `javascript:` URL unless a site explicitly opts out. See
[`docs/data-architecture.md`](./docs/data-architecture.md) for where auth state lives and
[`docs/render-sanitize-floor.md`](./docs/render-sanitize-floor.md) for the render floor.
```

- [ ] **Step 2: Enable private vulnerability reporting on the repo**

Run:

```bash
gh api -X PUT repos/glw907/cairn-cms/private-vulnerability-reporting
gh api repos/glw907/cairn-cms/private-vulnerability-reporting -i 2>&1 | head -1
```

Expected: the second call prints `HTTP/2.0 204` (enabled). If `gh` is not authenticated or the call is denied, leave a note in the task report so the user can run it, since this is a one-time repo setting and not a code change.

- [ ] **Step 3: Verify the file**

Run:

```bash
prose-guard SECURITY.md
test -f docs/data-architecture.md && test -f docs/render-sanitize-floor.md && echo "links OK"
```

Expected: no blocking tell, and `links OK` prints (both linked files exist).

- [ ] **Step 4: Commit**

```bash
git add SECURITY.md
git commit -m "Add security policy and enable private advisories"
```

---

### Task 4: Audit and fix npm packaging metadata

This task acts on the validated finding in `docs/internal/cairn-dx-feedback-2026-06-04-ecnordic-0.24.md`: the published tarball carried no `CHANGELOG.md` and the `package.json` had no `homepage`, so an npm consumer could not reach the upgrade record. Add the changelog to the shipped files, and add `homepage` and `bugs`.

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `homepage`, `bugs`, and ship the changelog**

In `package.json`, add a `homepage` and a `bugs` field next to `repository`:

```json
  "homepage": "https://github.com/glw907/cairn-cms#readme",
  "bugs": {
    "url": "https://github.com/glw907/cairn-cms/issues"
  },
```

Then add `CHANGELOG.md` to the `files` array so the upgrade record installs with the package. The array becomes:

```json
  "files": [
    "dist",
    "src/lib",
    "CHANGELOG.md"
  ],
```

- [ ] **Step 2: Verify the manifest is valid and the changelog will ship**

Run:

```bash
node -e "const p=require('./package.json'); console.log(p.homepage, '|', p.bugs.url, '|', p.files.includes('CHANGELOG.md'))"
npm pack --dry-run 2>&1 | grep -E 'CHANGELOG\.md|Tarball Contents' | head -5
```

Expected: the node line prints the homepage URL, the issues URL, and `true`. The `npm pack --dry-run` output lists `CHANGELOG.md` among the tarball contents.

- [ ] **Step 3: Confirm packaging lint still passes**

Run: `npm run check:package`
Expected: `publint` and `attw` pass with no new error. This runs `svelte-package` first, which is expected.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "Ship CHANGELOG in the tarball and add homepage and bugs URLs"
```

---

### Task 5: Create the ROADMAP draft

The ROADMAP is synthesized from `docs/STATUS.md`, the two relocated DX feedback notes, the dx-backlog, and the memory index, then handed to the user to reorder. Tier it Now / Next / Later / Considering. Open with the status block so a reader sees the honest state first.

**Files:**
- Create: `ROADMAP.md`

- [ ] **Step 1: Gather the candidate items**

Read these sources and extract candidate roadmap items:

```bash
sed -n '1,80p' docs/STATUS.md
cat docs/internal/cairn-dx-feedback-2026-06-04.md
cat docs/internal/dx-backlog-ecnordic-migration.md
sed -n '1,200p' /home/glw907/.claude/projects/-home-glw907-Projects-cairn-cms/memory/MEMORY.md
```

Known in-flight items to seed the tiers (verify each against `docs/STATUS.md` before placing):
- **Now:** publish the unpublished version window (STATUS shows `0.24.0` latest with `0.25.0` and `0.26.0` unpublished on `main`); this Phase 1 docs work.
- **Next:** the image and gallery management initiative (git-versus-R2 storage fork, brainstorm first); the `create-cairn-site` scaffolder (Phase P4 of the DX series).
- **Later:** the site-facing component registry plus guided insert form and an `llms-full` reference; a content lifecycle pass for rename and delete ergonomics.
- **Considering:** broader extension-mode surface (the `CairnExtension` seam).

- [ ] **Step 2: Write `ROADMAP.md`**

Create `ROADMAP.md` with this shape. Fill each tier from Step 1. Keep entries to one or two sentences. Do not invent items the sources do not support.

```markdown
# Roadmap

cairn-cms runs two production sites today, [ecnordic.ski](https://ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions. The author is
still working through the core-feature roadmap, and the project stays closely held until that
core lands.

This roadmap is a direction, not a commitment. Priorities shift as the production sites surface
needs. Items move up from lower tiers as the core fills in.

## Now

<items in progress or next to ship>

## Next

<items planned after the current work>

## Later

<items wanted once the core is in place>

## Considering

<ideas not yet committed>
```

- [ ] **Step 3: Verify prose**

Run: `prose-guard ROADMAP.md`
Expected: no blocking tell.

- [ ] **Step 4: Present the draft to the user for reordering**

Show the user the drafted tiers and ask them to confirm or reorder before the phase closes. Final priority is the user's call. Apply any reordering they give, then re-run `prose-guard ROADMAP.md`.

- [ ] **Step 5: Commit**

```bash
git add ROADMAP.md
git commit -m "Add prioritized roadmap draft"
```

---

### Task 6: Create the documentation index

The index is the map of the four arms. It links only to files that exist now, and it marks the unwritten arms as forthcoming so the link checker stays green.

**Files:**
- Create: `docs/README.md`

- [ ] **Step 1: Write `docs/README.md`**

Create `docs/README.md` with exactly this content:

```markdown
# cairn-cms documentation

cairn-cms runs two production sites today, [ecnordic.ski](https://ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions. The author is
still working through the core-feature roadmap, and the project stays closely held until that
core lands.

These docs are organized in four arms.

- **Tutorial** teaches a first build end to end. Forthcoming in a later pass.
- **How-to guides** answer task questions: setting up the GitHub App, configuring auth and D1,
  defining an adapter, configuring rendering, wiring delivery, deploying, and upgrading.
  Forthcoming. [`upgrading.md`](./upgrading.md) is the current upgrade guide until then.
- **Reference** documents each package export. Forthcoming in a later pass.
- **Explanation** covers the architecture and the design rules.
  [`data-architecture.md`](./data-architecture.md) is the current data-tier writeup until the
  arm lands.

## Current pages

While the arms fill in, these pages are live:

- [Upgrading cairn](./upgrading.md)
- [Where each kind of state lives](./data-architecture.md)
- [Admin route structure](./admin-route-structure.md)
- [The render sanitize floor](./render-sanitize-floor.md)

## Project files

[README](../README.md), [ROADMAP](../ROADMAP.md), [SECURITY](../SECURITY.md),
[CHANGELOG](../CHANGELOG.md).
```

- [ ] **Step 2: Verify prose and links**

Run:

```bash
prose-guard docs/README.md
for l in upgrading.md data-architecture.md admin-route-structure.md render-sanitize-floor.md; do test -f "docs/$l" || echo "MISSING: docs/$l"; done
for l in README.md ROADMAP.md SECURITY.md CHANGELOG.md; do test -f "$l" || echo "MISSING: $l"; done
```

Expected: no blocking tell and no `MISSING:` line. `ROADMAP.md` must already exist, so run Task 5 first.

- [ ] **Step 3: Commit**

```bash
git add docs/README.md
git commit -m "Add the documentation index"
```

---

### Task 7: Rewrite the README as the adopter hub

The current README is accurate on install and subpaths; keep that. Replace the `Status` section with the new status block plus the contribution line, add a `Documentation` section that routes to the four arms through `docs/README.md`, and stop sending adopters into dev-process and historical files (`docs/STATUS.md`, `docs/PLAN.md`, `docs/ARCHITECTURE.md`).

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the `## Status` section**

Replace the entire existing `## Status` section (the paragraph that begins "`0.x`, published to public npm" and ends at the next `## Install` heading) with:

```markdown
## Status

cairn-cms runs two production sites today, [ecnordic.ski](https://ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions. The author is
still working through the core-feature roadmap, and the project stays closely held until that
core lands. See the [ROADMAP](./ROADMAP.md) for what is planned and the
[CHANGELOG](./CHANGELOG.md) for what changed.

Editor auth is self-owned: an atomic single-use magic-link token, a POST-confirm flow, opaque
D1-backed session rows, and two-tier `owner`/`editor` roles. There is no better-auth, Drizzle,
or ORM. Pin a caret range and read the CHANGELOG before bumping; every breaking entry carries a
"Consumers must" line.

A contributor who feels inspired is welcome to open an issue or a discussion to start a
conversation. There is no formal contribution process yet, so this is not an open call for
pull requests.
```

- [ ] **Step 2: Add a `## Documentation` section before `## How it's developed`**

Insert this section immediately before the `## How it's developed` heading:

```markdown
## Documentation

The [`docs/`](./docs/README.md) tree is organized in four arms: a tutorial that builds a first
site end to end, how-to guides for each setup task, a reference for every package export, and
explanation pages for the architecture and design rules. Start at the
[documentation index](./docs/README.md). The [security policy](./SECURITY.md) covers reporting
and the security posture.
```

- [ ] **Step 3: Replace the `## How it's developed` closing paragraph**

The `## How it's developed` section ends with a paragraph that points at the functional spec, `docs/STATUS.md`, `docs/PLAN.md`, and `docs/ARCHITECTURE.md`. Replace that closing paragraph with:

```markdown
The historical rebuild plan and the early architecture writeups live under `docs/internal/`.
They are kept for history and are not current.
```

- [ ] **Step 4: Verify prose and links**

Run:

```bash
prose-guard README.md
for l in ROADMAP.md CHANGELOG.md SECURITY.md docs/README.md; do test -f "$l" || echo "MISSING: $l"; done
grep -nE 'docs/(STATUS|PLAN|ARCHITECTURE)\.md' README.md && echo "STALE REF PRESENT" || echo "no stale refs"
```

Expected: no blocking tell, no `MISSING:` line, and `no stale refs` prints. Run this task last, after Tasks 5 and 6 create `ROADMAP.md` and `docs/README.md`.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "Rewrite the README as the adopter documentation hub"
```

---

## Task ordering

Link dependencies fix the order. `ROADMAP.md` (Task 5) and `docs/README.md` (Task 6) must exist before the README rewrite (Task 7) links them, and `ROADMAP.md` must exist before the index links it. Run the tasks in this order: **1, 2, 3, 4, 5, 6, 7**. Task 4 (packaging) is independent and may run any time after Task 1.

## Phase-end ritual

After all tasks commit, before declaring the phase done:

- [ ] Run `prose-guard` across every authored file: `for f in README.md SECURITY.md ROADMAP.md docs/README.md docs/internal/README.md docs/internal/docs-friction-log.md; do prose-guard "$f"; done`. No blocking tell on any.
- [ ] Confirm no dangling relative links remain in the root files and `docs/README.md`.
- [ ] Append any design friction this phase surfaced to `docs/internal/docs-friction-log.md` (the packaging finding is already seeded; add anything new).
- [ ] Update `docs/STATUS.md` to record Phase 1 landed and name Phase 2 (Reference) as the next action, per the `cairn-pass` ritual.
- [ ] Leave the tree clean.

## Self-review notes (already applied)

- Every link written in this phase points at a file that exists by the time its file is created; the ordering section enforces it.
- `SECURITY.md` links `docs/data-architecture.md` and `docs/render-sanitize-floor.md`, which exist now; Phase 3 repoints them to `security-model.md` when that arm lands.
- The packaging task ships `CHANGELOG.md` (a stable filename), not the churning `docs/` tree, so the `files` array stays low-maintenance.
- `docs/STATUS.md` and `docs/superpowers/` are untouched by the relocation because `cairn-pass` depends on their paths.
