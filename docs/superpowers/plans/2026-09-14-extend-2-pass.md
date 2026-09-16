# Extend-2 Pass Implementation Plan (the guidance layer, after the docs rewrite)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with TWO chains, launched as ONE workflow run; see
> Execution. Steps use checkbox syntax for tracking. Every anchor is re-verified at dispatch
> against the branch HEAD, per the Reconciliation block below.

**Date:** 2026-09-14. **Approved:** Geoff, 2026-09-14, after the three-lens adversarial review, the
fold read over the spec and both plans, and the targeted read of the fold's own mechanisms. The
plan-approval gate is closed; execution needs no further read. **Spec:** `docs/superpowers/specs/2026-09-12-extend-design.md`
(Layer 3, the Trust boundary, Adoption, Fold 6, 9, and 10). The plan argues from the spec;
executors read both.

**2026-09-15 amendment (docs-to-facts pass):** the `extend` narrative arm is frozen against
rewrites. Task 3a no longer edits `docs/extend/what-the-scaffold-wrote.md`; it files the fact(s)
in `docs/internal/facts/extend.md` instead. The reference arm is unaffected.

**Goal:** a developer using Claude Code on a cairn site gets the engine's guidance from the
package it already has: a `CLAUDE.md` fragment, three skills, one read-only review agent, and a
`Stop` hook the fragment documents as a snippet, all shipped in the tarball, with the fragment,
the skills, and the agent baked into every new site at scaffold time and installed or refreshed
on an existing site by a new package bin, `cairn-guidance`, which also
reports the site's gate wiring gaps with their snippets. The doctor loses its skill install, since
it is retiring in favor of the Go `cairn` tool.

## Fold (2026-09-14)

Draft 1 went to three adversarial lenses. Every ranked change is applied. The decisions that
changed the plan's shape:

1. **The shipped agent carries `tools: Read, Grep, Glob` and no model pin** (risk 1). Copying
   this repo's reviewer frontmatter would ship `Bash` into a consumer's `.claude/agents/`, which
   Claude Code auto-discovers with no consent line: the unattended-execution door the trust
   boundary exists to close.
2. **A scaffolded site is born with the guidance; no install runs at creation** (mechanics 1 and
   2, contract 2). The scaffold copies the baked template and never installs, and the overlay
   composes only into the GitHub template repository, so the bake writes the guidance tree and
   the `CLAUDE.md` import line at prepack, the way it writes the dev shim.
3. **The snippets `check` prints ship in the tarball** (mechanics 3), under `claude/snippets/`,
   each asserted byte-identical to its in-repo counterpart by a packaging test, since neither the
   showcase's scripts nor the workflow reach `node_modules/@glw907/cairn-cms`.
4. **The doctor's skill check has four dependents the draft missed** (contract 1, risk 6,
   mechanics 4 and 5): the diagnostics condition, `check-readiness.mjs`'s fail-closed coupling to
   a doc section, a `check:docs` anchor link from the audit reference, and the symbols allowlist.
   All are named.
5. **`.orig` is never clobbered, the install writes a `MANIFEST`, and `check` gains `--strict`**
   (risk 4, 8, 10). A second upgrade is when the recovery copy is most needed; a retired agent must
   be named rather than silently retained; a site that wants a gate has one.
6. **The hook is a `Stop` hook running the static audit with `--if-present`** (risk 5), never a
   `PostToolUse` hook that compiles a stylesheet on every write and fails every edit on a site
   without the script.
7. **Tasks 1 and 3 each split in two**, at the seams their steps drew; the transcript re-captures
   are stretch items with the polish-11a fallback (mechanics 7).
8. **The gate string is carried verbatim** (mechanics 11), and no task's content depends on a table
   filled at dispatch (contract 5): the router reads the recipe index on the branch and quotes
   what it read.

## Where it sits

After extend-1 has merged and after the docs rewrite has landed the per-pattern recipe pages and
the tarball docs index. extend-1 runs after the `0.97.0` cut beside Go tool pass A and before the
rewrite; this pass is third. Site migration (ASC, ecxc, 907) waits until this pass has landed
(Geoff, 2026-09-13).

**Architecture:** nine tasks in two chains. Chain A is engine and scaffold work: the bin, the
doctor's retirement, the packaged `claude/` tree, the bake, the CI assertions, the docs, the
ledger. Chain B is three deliverables under `skills/` and `scripts/checks/`: the budget check's
path list with the `check:docs` extension, and the two new skills. The chains share
`CHANGELOG.md` only, reconciled by hand at the merge.

**Tech stack:** the doctor's existing tree-hash install (`src/lib/doctor/check-skill.ts`,
relocated), Node bins under `dist/`, the `create-cairn-site` bake, Claude Code's skill, agent, and
`CLAUDE.md` import conventions as published at dispatch.

**Not in this pass:** any new doctor check; the recipe pages; the Go tool; a `settings.json`
write; site adoption.

## Token ceiling

**5.4M.**

| Line item | Basis | Tokens |
|---|---|---|
| Nine paint-neutral task chains | 500K each; task 1b is the widest (the retirement's eleven dependents) | 4.5M |
| Re-dispatch reserve | one fix round forecast | 0.5M |
| Reviewer fan-out | `web-auth-security-reviewer` over the bin's write containment and the trust boundary (blocking), `prose-voice-reviewer` over the fragment and the two skills, `code-simplifier` | 0.4M |
| **Total** | | **5.4M** |

At 80 percent (4.3M) the conductor finishes the task in flight, writes STATUS, and asks one
combined question. **Checkpoint interval:** every four tasks; written when the run returns.

## Execution

| Chain | Tasks, in order | Worktree | Branch |
|---|---|---|---|
| A | 1a, 1b, 2, 3a, 3b, 4 | `.claude/worktrees/extend-2` | `extend-2` |
| B | 5, 6, 7 | `.claude/worktrees/extend-2-skills` | `extend-2-skills` |

`extend-2` merges; `extend-2-skills` merges into it at the ritual. Chain B touches
`scripts/checks/check-skill-budget.mjs` and its test, `scripts/checks/docs-links.mjs`,
`skills/cairn-extend/**`, `skills/cairn-consult/**`, and the changelog; chain A touches none of
those. No paint, so every task runs CHECK-PLUS-UNIT and port 4173 is never contended. `maxFix` is `1`.

**Chain independence, stated.** Task 1a's `install` enumerates whatever `skills/` directories the
package ships, so it neither names nor needs chain B's two skills; when chain B merges, the next
install picks them up. Task 2's link test covers `claude/**`; task 5's `check:docs` extension
covers `skills/**` and `claude/**` after the merge. Neither chain waits on the other.

### Pre-dispatch

1. Confirm extend-1 and the docs rewrite have merged and CI on `main` is green.
2. Confirm no live executor holds either worktree. Create both off the same commit; `npm install`
   at each root and from scratch in each `examples/showcase`.
3. Confirm the branch carries this plan (committed on `main` at authoring). Write STATUS. Arm the
   guards.

## Reconciliation at dispatch

Measured on `main` at `55fc7762` by the spec's mechanics review and the plan's own; two later
passes (extend-1, the rewrite) move anchors under `docs/extend/`, `docs/reference/`,
`package.json`, and the scaffold.

| Anchor | Who moves it | Which task cares | How to relocate |
|---|---|---|---|
| `docs/extend/README.md` recipe index | the docs rewrite | Task 6 | No task reads this table for content: task 6 reads the index on the branch, cites every recipe page it lists, and quotes the list in its report |
| The tarball docs index path | the docs rewrite | Task 2 | Read `package.json` `files` and the rewrite's HISTORY entry at execution; the fragment names the path it found |
| `examples/showcase/.github/workflows/check.yml` (the commented final step) | extend-1 task 8a | Task 3b | Locate the comment by text |
| `examples/showcase/package.json` scripts, `cairn-audit.config.json` | extend-1 task 7 | Task 2's snippets copy them | Read both whole |
| `src/lib/doctor/check-skill.ts` (whole, 150 lines), `assemble.ts:36-51`, `:73-77`, `:206-227`, `bin.ts:47-56`, `:58-71` | untouched by extend-1 | Tasks 1a, 1b | Verify at dispatch |
| `src/lib/diagnostics/conditions.ts:212-219` (`skill.admin-screens-stale`), `scripts/checks/check-readiness.mjs:14-25`, `docs/admin/is-it-working.md:155`, `:452-457` | untouched | Task 1b | Locate by id and heading |
| `docs/reference/doctor.md:45`, `:95`, `:246-270`; `docs/reference/cairn-audit.md:18` (the `#the---fix-skill-install` link); `docs/reference/README.md:53-56`, `:84-90` (the CLI list and counts) | untouched | Tasks 1a, 1b | Locate by text |
| `scripts/checks/check-symbols-allowlist.mjs:19` (`cli-flag:--fix`), `scripts/checks/check-package-files.mjs:121-138` | untouched | Tasks 1b, 2 | Locate by text |
| `package.json:36` (the `package` script's `chmod` list), `:175-180` (`bin`), `:181-193` (`files`) | extend-1 task 1 adds an export | Tasks 1a, 2 | Read whole |
| `scripts/checks/check-skill-budget.mjs:20`, `:25`, `:61-65`, `:75-88`, `:152-161`, `:163-181` | extend-1 task 2 adds a section name | Task 5 | Read whole |
| `scripts/checks/docs-links.mjs:15`, `:36` (the scan roots) | untouched | Task 5 | Read whole |
| `.github/workflows/create-site.yml:105-107`, `:131-141` | extend-1 task 8b edits both; re-read the whole step | Task 3b | Locate by the `existsSync` text |
| `packages/create-cairn-site/scripts/bake-template.mjs:26-58` (`SITE_README`), `:60` (`DEV_SHIM`), `:180` (the engine spec), `:197` | extend-1 task 8a edits `DEV_SHIM` | Task 3a | Read whole |
| `packages/create-cairn-site/template/src/chassis/tokens.css:47` and `examples/showcase/src/chassis/tokens.css:47` | untouched | Task 3a | Locate by `@import "tailwindcss"` |
| `packages/create-cairn-site/template/gitignore` | untouched | Task 3a | Read whole |
| `docs/extend/upgrade-cairn.md:38-42` (step 4) | the rewrite rebuilds the page | Task 4 | Locate by the doctor command |
| `docs/internal/engine-rulings.md:4955` | rows appended elsewhere | Task 4 | Locate by slug |
| `ROADMAP.md:940` (extend), `:1447-1452` (the DX decisions), `:1456-1460` (the no-pruning note) | extend-1 task 6 closes its half | Task 4 | Locate by heading text |
| The gate string | unchanged unless a later pass edits `.github/workflows/`; extend-1 task 7 appends one step | Every task | Re-derive at the branch point |

## Ruled inputs (recorded; no task re-derives them)

- **The bin writes only under `<cwd>/.claude/`**, and only `.claude/skills/<dir>/` for each
  packaged skill directory, `.claude/agents/cairn-extension-reviewer.md`, and `.claude/cairn/`.
  Never `.claude/settings.json`, `CLAUDE.md`, `package.json`, or `.github/`. Every destination is
  resolved and refused unless it sits under `resolve(cwd, '.claude')`, the write-side twin of
  `bin.ts:58-71`'s `readFileUnderCwd`; a packaged entry that is not a regular file is refused by
  name.
- **`.orig` is never clobbered.** Written only when none exists for that destination; an existing
  one is left and reported. `check` reports any `.orig` still present as its seventh line.
- **`MANIFEST` lists what the install wrote.** A later install and `check` name every path the
  previous manifest listed that the package no longer ships, as removable. The bin never deletes.
- **`check` exits 0 by default; `--strict` exits 1 on stale or missing guidance.**
- **The agent ships with `name`, `description`, and `tools: Read, Grep, Glob`.** No `Bash`, no
  `model`, no `effort`. The frontmatter schema is Claude Code's, watched by the ritual's routine.
- **The consent boundary is stated, not claimed.** Skills and agents are auto-discovered on
  install; the bake writes the import line; the deliberate act that removes all of it is deleting
  the three paths. The reference page says so.
- **The hook snippet is a `Stop` hook running `npm run check:cairn --if-present`**, static only;
  the fragment says in one line why it is not `PostToolUse`.
- **The retire ruling is executed, late, not reversed.**
- **The DaisyUI-first rule opens the router and the reviewer.**
- **The skill budget is 3,500 estimated tokens** (14,000 characters at the gate's estimator,
  frontmatter included); the working cap is 1,700 words. The tier-map assertion binds
  `cairn-admin-screens` alone.
- **The import line is `@.claude/cairn/CLAUDE.md`**, written by the bake into the template's
  `CLAUDE.md` and reported by `check` when absent.
- **`VERSION` is read from the installed package** through
  `createRequire(import.meta.url).resolve('@glw907/cairn-cms/package.json')`, the precedent at
  `check-skill.ts:63-67`; the bake stamps the engine version it resolves at `bake-template.mjs:180`.
- **No process citations in shipped markdown.** The fragment and the skills name rulings by slug in
  a "why" link.
- **Every task's `CHANGELOG.md` line is one entry under `## Unreleased`**, with `Consumers must:`
  only in task 1b, and plain "No consumer action." elsewhere.

## Global constraints

1. The em dash is banned in every comment and every doc this pass writes; the shipped markdown
   follows Anthropic's Claude Code best practices as the agent-facing standard.
2. No process citations in shipped comments or shipped markdown.
3. The gate is CI-derived; the string is under "## Gate".
4. `check:surface` is regenerated by no task; the bin is not a subpath export.
5. Every packaged skill core stays under budget, proven by `check-skill-budget.mjs` in the gate.
6. Every showcase or template change regenerates `templates/waymark/` by `npm run emit:template`.
7. No task edits `docs/STATUS.md` or `docs/HISTORY.md`.

---

## Task 1a: The `cairn-guidance` bin

**Chain:** A, first.

**Deliverables: three.** The bin with `install`, `check`, and `--strict`; the relocated tree-hash
install with `.orig`, `MANIFEST`, `VERSION`, and write containment; the reference page and its
index entry.

**Files (10):**
- Create: `src/lib/guidance/install.ts` (`hashFileTree`, `resolveSourceRoot`, and the copy,
  relocated from `check-skill.ts` and generalized over a list of trees), `src/lib/guidance/check.ts`
  (the seven reports and the recommendation block), `src/lib/guidance/bin.ts`,
  `src/tests/unit/guidance/install.test.ts`, `src/tests/unit/guidance/check.test.ts`,
  `src/tests/unit/guidance/bin.test.ts` (the `skipIf`-on-dist spawn test, per `doctor-bin.test.ts:193-196`),
  `docs/reference/guidance.md`
- Modify: `package.json` (`bin["cairn-guidance"]` and the `package` script's `chmod` list at `:36`),
  `docs/reference/README.md` (the CLI list at `:53-56`; the counts at `:84-90` become nine and
  five), `CHANGELOG.md`
- Not modified this task: anything under `src/lib/doctor/` (task 1b).

**Interfaces:**
- Produces: `cairn-guidance install` enumerates every directory under the installed package's
  `skills/` and copies each to `.claude/skills/<dir>/`, copies `claude/agents/*.md` to
  `.claude/agents/`, copies `claude/CLAUDE.md` to `.claude/cairn/CLAUDE.md`, writes
  `.claude/cairn/VERSION` and `.claude/cairn/MANIFEST`, writes `<file>.orig` beside any destination
  whose content differs and has no `.orig` yet, prints the written list, the `.orig` list, and any
  previously written path the package no longer ships, and closes with one line saying the tree
  belongs in the commit and `.orig` files are meant to be read and deleted rather than ignored.
- Produces: `cairn-guidance check` prints one line each, with the snippet read from
  `claude/snippets/` (task 2): the guidance tree (fresh, stale by hash, or missing, with a
  removable list from `MANIFEST`); the `CLAUDE.md` import line; the `check:cairn` script; the
  `cairn-audit.config.json`; the CI workflow; the `@source not "./.claude"` exclusion in the entry
  Vite builds (a gitignored `.claude` passes; the Tailwind 4.1 floor is stated; when no entry can
  be identified the item reports unknown, names every path it looked at, and prints the snippet
  with placement guidance); any `.orig` present. Then a recommendation block, not counted: the
  DaisyUI skill install line, a free documentation server, Blueprint as the paid option. Exit 0;
  `--strict` exits 1 on a stale or missing tree.
- Consumed by task 3a (the bake reuses the copy and the stamp), task 3b (the workflow step), and
  every existing site.

**Decisions the plan makes:**
- `docs/reference/guidance.md` carries the `@source not "./.claude"` paragraph moved verbatim from
  `docs/reference/doctor.md:264-270` (with the Tailwind 4.1 floor and the gitignore equivalence),
  the trust-boundary paragraph from the spec including the consent statement and the three-path
  removal, `--strict`, and the `.orig` and `MANIFEST` rules. Task 1b then deletes the doctor
  section without a window in which the advice exists nowhere.
- The install refuses `..` segments and non-regular entries by name.

**Steps:**
- [ ] **Step 1: the failing tests first.** Install into an empty tree writes one
  `.claude/skills/<dir>/` per packaged skill directory (fixtured, not hard-coded), the agent, the
  fragment, `VERSION`, and `MANIFEST`; install over an edited skill writes `.orig` and lists it; a
  second install over the same edited file does not rewrite the existing `.orig`; a packaged tree
  carrying `../../evil.md` and a symlink entry writes nothing outside `<cwd>/.claude/` and names
  the offending entry; a tree carrying `.claude/settings.json`, a root `CLAUDE.md`, a `package.json`,
  and a `.github/workflows/check.yml` with known content leaves all four byte-identical; `check`
  on a fresh tree with snippets present reports seven green lines; `check` on a tree missing the
  import line prints the exact line; `check` on a gitignored `.claude` passes the exclusion item;
  `check` with no identifiable CSS entry reports unknown and the paths it read; `check --strict`
  exits 1 on a stale tree.
- [ ] **Step 2:** write the three modules and the bin; `chmod` list; spawn test.
- [ ] **Step 3:** the reference page, the index and counts, the changelog (no consumer action
  this task; task 1b carries the `Consumers must:`). The gate. Commit.

**Acceptance criteria:**
- The three test files pass with every Step 1 case named; the write-boundary test's assertion
  list is quoted in the report.
- `npm run package` leaves `dist/guidance/bin.js` executable; the spawn test passes when dist
  exists.
- `check:arm-indexes`, `check:symbols`, and `check:docs` green with the new page.
- The gate string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `feat(guidance): add the cairn-guidance bin`.

---

## Task 1b: The doctor's skill install retired

**Chain:** A, second. **Depends on:** task 1a (the reference page exists).

**Deliverables: two.** The check, the flag, and the condition removed with every dependent; the
doctor's docs and fixtures reconciled, with the transcript re-capture as a stretch item.

**Files (17):**
- Delete: `src/lib/doctor/check-skill.ts`, `src/tests/unit/doctor-check-skill.test.ts` (its
  `hashFileTree` and copy cases relocated to task 1a's tests, not lost)
- Modify: `src/lib/doctor/assemble.ts:36-51`, `:73-77`, `:206-227` (`fix` out of `DoctorArgs`,
  `USAGE`, `parseArgs`, `defaultChecks`), `src/lib/doctor/bin.ts:47-56`,
  `src/lib/diagnostics/conditions.ts:212-219` (the `skill.admin-screens-stale` condition removed
  whole), `src/tests/unit/conditions.test.ts:111`, `:129-134`, `src/tests/unit/doctor-bin.test.ts:45-51`,
  `:239-255`, `src/tests/unit/check-package-files.test.ts:143`, `scripts/checks/check-readiness.mjs:20-25`
  (the comment narrating the retired allowlist entry), `scripts/checks/check-symbols-allowlist.mjs:19`
  (`cli-flag:--fix` removed), `docs/reference/doctor.md:45`, `:95`, `:246-270`,
  `docs/reference/cairn-audit.md:18` (the link retargeted at `guidance.md`),
  `docs/admin/is-it-working.md:28`, `:155`, `:452-457` (the quoted block's row, the checklist row,
  and the whole "Refresh the admin-screens skill" section), `skills/cairn-admin-screens/SKILL.md:23`
  (the install sentence now names `cairn-guidance install`), `packages/create-cairn-site/test/fixtures/transcripts/README.md`
  (the staleness note, if the fallback is taken), `docs/extend/migration-notes.md`, `CHANGELOG.md`
- Stretch: `packages/create-cairn-site/test/fixtures/transcripts/02-doctor-bare.txt` and
  `03-doctor-credentialed.txt` re-captured as real pty recordings; the harness lives outside the
  repo and the capture site drifted (`docs/HISTORY.md:329-348`). Fallback: leave both, add the
  dated staleness note, and say so in the changelog; `check:transcripts` stays green either way.

**Interfaces:**
- Produces: the doctor without `--fix`, without `skill.admin-screens`, and without the
  `skill.admin-screens-stale` condition; `parseArgs(['--fix'])` throws with the usage line.
- Produces: `Consumers must:` reading "run `npx cairn-guidance install` after the bump;
  `cairn-doctor --fix` is gone".

**Steps:**
- [ ] **Step 1: the failing tests first.** Invert `doctor-bin.test.ts:45-51`: `--fix` is rejected;
  the conditions test no longer expects the retired id; `check-readiness.mjs` green with the
  section and the condition both gone.
- [ ] **Step 2:** the removals; the docs; the link; the allowlist; the SKILL.md sentence.
- [ ] **Step 3:** the stretch re-capture or the fallback note; `npm run check:transcripts`.
- [ ] **Step 4:** migration note; changelog. The gate. Commit.

**Acceptance criteria:**
- `grep -rn -- '--fix' src/ scripts/ docs/reference docs/admin docs/extend skills/ packages/`
  returns nothing outside `docs/internal/` and `CHANGELOG.md` history; `grep -rn 'skill.admin-screens'
  src scripts docs/admin docs/reference` returns nothing.
- `node scripts/checks/check-readiness.mjs`, `npm run check:symbols`, `npm run check:docs`,
  `npm run check:transcripts` green.
- The gate string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `refactor(doctor): retire the skill install and its condition`.

---

## Task 2: The packaged `claude/` tree

**Chain:** A, third. **Depends on:** task 1a.

**Deliverables: four.** `claude/CLAUDE.md`; `claude/agents/cairn-extension-reviewer.md`;
`claude/snippets/` with its byte-identity test; `package.json` `files`, the packaging gate, and
the link test.

**Files (12):**
- Create: `claude/CLAUDE.md`, `claude/agents/cairn-extension-reviewer.md`,
  `claude/snippets/check-cairn.json` (the seven script entries extend-1 task 7 added: `build:admin-css`, `precheck`, `prebuild`, `predev`, `dev:admin-css`, `check:cairn`, `check:cairn:rendered`), `claude/snippets/cairn-audit.config.json`,
  `claude/snippets/check.yml`, `claude/snippets/settings-hook.json`, `claude/snippets/claude-md-import.txt`,
  `src/tests/unit/packaging-guidance.test.ts`
- Modify: `package.json:181-193` (`files` gains `claude`), `scripts/checks/check-package-files.mjs:121-138`
  (assert the packed tarball carries `claude/CLAUDE.md`, `claude/agents/*`, `claude/snippets/*`;
  update both `cairn-doctor --fix` mentions to `cairn-guidance install`), `docs/reference/guidance.md`
  (one paragraph per shipped file, and one per skill named from tasks 6 and 7's Interfaces),
  `CHANGELOG.md`

**Interfaces:**
- Produces: the fragment, under 1,500 words (`wc -w < claude/CLAUDE.md`), whose first line names
  what it is and that `.claude/cairn/` is engine-owned and refreshed by `cairn-guidance install`,
  then: the boundary in two paragraphs quoted from `docs/internal/what-cairn-is-and-is-not.md`;
  the atoms by name with their reference pages; the gates and how to run them (`check:cairn`,
  `check:cairn:rendered`, `cairn-guidance check`); the consultation trigger pointing at
  `cairn-consult`; the DaisyUI-first rule; the `Stop` hook snippet with its one-line why; the
  DaisyUI tooling recommendation; and where the docs are (`cairn docs <query>` where the Go tool
  is installed, else the tarball's docs index by the path task 2 finds at execution).
- Produces: the agent with frontmatter `name: cairn-extension-reviewer`, `description`, and
  `tools: Read, Grep, Glob`, nothing else; read-only; reads a diff against the boundary, the atoms,
  and the craft bar; asks of every new component whether a DaisyUI component or template covers
  it and of every action with more than two outcomes whether it uses the `outcome` grammar;
  returns accept, fix, or escalate with `file:line` findings.
- Produces: `claude/snippets/*`, each asserted against its in-repo counterpart by the packaging
  test so they cannot drift: `check-cairn.json` by parsed-value equality against the seven script
  entries in `examples/showcase/package.json`; `cairn-audit.config.json`, `check.yml`, the
  fragment's hook block, and the import line byte-identical to their sources.
- Produces: the packaging test resolves the tarball through
  `require.resolve('@glw907/cairn-cms/package.json')`, asserts the tree ships, asserts the agent
  frontmatter carries no tool that can write or execute, and extracts every relative `](./…)` and
  `](../…)` link from `claude/CLAUDE.md` and asserts each resolves to a file inside the packed
  `docs/` allowlist.

**Steps:**
- [ ] **Step 1: the failing tests first.** The packed tarball lacks `claude/`; the frontmatter
  assertion, the snippet identity, and the link resolution all fail with the files absent.
- [ ] **Step 2:** write the seven files; `files`; the packaging gate strings.
- [ ] **Step 3:** the reference paragraphs; changelog (no consumer action). The gate. Commit.

**Acceptance criteria:**
- `npm pack --dry-run` lists every file under `claude/`; the packaging test and `check:package`
  are green.
- `wc -w < claude/CLAUDE.md` is under 1500; the agent file contains no `Bash`, `model`, or
  `effort` key, asserted by the test.
- The gate string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `feat(guidance): ship the fragment, the agent, and the snippets`.

---

## Task 3a: The bake writes the guidance into every new site

**Chain:** A, fourth. **Depends on:** tasks 1a and 2. **Checkpoint** after this task.

**Deliverables: four.** The bake writing the guidance tree, `VERSION`, `MANIFEST`, and the
template's `CLAUDE.md`; the `@source not` exclusion in both trees; the template's gitignore; the
handover text and the scaffold doc.

**Files (9):**
- Modify: `packages/create-cairn-site/scripts/bake-template.mjs` (beside `SITE_README` and
  `DEV_SHIM`: read the monorepo's own `skills/` and `claude/` from `repoRoot`, the precedent the
  file itself sets at `bake-template.mjs:14` and `:125-126`, write them into `template/.claude/` through
  task 1a's copy, stamp `VERSION` with the version parsed out of the resolved engine spec at
  `bake-template.mjs:178` (the caret stripped; the spec string itself is `^x.y.z` and would never
  equal an installed version), write `MANIFEST`, and write `template/CLAUDE.md` with the import
  line and a three-line site section),
  `packages/create-cairn-site/scripts/bake-template.test.mjs`, `packages/create-cairn-site/template/src/chassis/tokens.css:47`
  and `examples/showcase/src/chassis/tokens.css:47` (`@source not "./.claude";` after the import,
  so the bake stays byte-exact), `packages/create-cairn-site/template/gitignore`
  (`.claude/agent-memory/`), `packages/create-cairn-site/src/scaffold.mjs:224-252` (the handover
  names the guidance and `cairn-guidance check`), `templates/waymark/**` (regenerated),
  `CHANGELOG.md`. **(2026-09-15 amendment, docs-to-facts pass):** `docs/extend/what-the-scaffold-wrote.md`
  is frozen; instead file the container bullet(s) in `docs/internal/facts/extend.md` for the
  guidance tree, `VERSION`, and `MANIFEST` the bake now writes.
- Not modified: `examples/showcase/.cairn-template.json`'s `.claude` exclusion, which keeps the
  showcase's own dev tooling out; the bake writes the guidance explicitly.

**Interfaces:**
- Produces: a scaffolded site born with `.claude/skills/<every packaged skill>/`,
  `.claude/agents/cairn-extension-reviewer.md`, `.claude/cairn/CLAUDE.md`, `VERSION`, `MANIFEST`,
  a root `CLAUDE.md` importing the fragment, a public CSS entry excluding `.claude/`, and
  `.claude/agent-memory/` ignored.

**Steps:**
- [ ] **Step 1: the failing test first.** The bake test asserts the tree, `VERSION` equal to the
  resolved engine version, and the `CLAUDE.md` import line; `check:template` fails on the diff.
- [ ] **Step 2:** the bake; the exclusion in both trees; the gitignore; the handover; the
  `docs/internal/facts/extend.md` bullet(s); `npm run emit:template`.
- [ ] **Step 3:** changelog (no consumer action). The gate. Commit.

**Acceptance criteria:**
- `npm run check:template` prints `emit-template-dir: OK`; `npm --prefix packages/create-cairn-site test`
  green with the new assertions.
- `templates/waymark/.claude/cairn/VERSION` exists after the bake.
- The gate string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `feat(create-cairn-site): bake the guidance into the template`.

---

## Task 3b: The scaffolded site proves the guidance and reports staleness

**Chain:** A, fifth. **Depends on:** task 3a.

**Deliverables: two.** The create-site CI assertions; the workflow's final step enabled, with the
scaffold transcript re-capture as a stretch item.

**Files (5), plus the stretch transcripts:**
- Modify: `.github/workflows/create-site.yml:105-107` (the leftover list loses the bare `.claude`
  entry and gains: `.claude` contains exactly the installed guidance paths plus `VERSION` and
  `MANIFEST`, `.claude/agent-memory` and `.claude/worktrees` absent by name, `VERSION` equal to the
  installed package version), `examples/showcase/.github/workflows/check.yml` (uncomment the final
  step, `npx cairn-guidance check` under `continue-on-error: true`), `templates/waymark/**`
  (regenerated), `docs/admin/create-your-site.md` (the prose around the quoted blocks), `CHANGELOG.md`
- Stretch: the four scaffold transcripts (`01`, `01b`, `01c`, `01d`) re-captured; fallback as in
  task 1b.

**Steps:**
- [ ] **Step 1: the failing assertion first.** The new `.claude` assertion fails on the pre-3a
  scaffold shape (run the assertion script against a bake without the tree).
- [ ] **Step 2:** the assertion, the step, the doc prose; `npm run emit:template`.
- [ ] **Step 3:** the stretch or the fallback note; `check:transcripts`. Changelog. The gate.
  Commit.

**Acceptance criteria:**
- `create-site.yml` and `scaffold.yml` green on the PR with the `.claude` assertion and the
  `cairn-guidance check` step visible in the log.
- `check:transcripts` and `check:template` green.
- The gate string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `test(create-cairn-site): assert the baked guidance`.

---

## Task 4: Docs, the ledger, the roadmap (chain A, last)

**Chain:** A, sixth.

**Deliverables: four.** The upgrade page's new step; the ledger Note and row; the ROADMAP closes;
the migration note, the changelog window, and the record.

**Files (6):**
- Modify: `docs/extend/upgrade-cairn.md` (a new step between the current steps 3 and 4, "Refresh
  the engine's guidance: `npx cairn-guidance install`", one sentence naming `.orig` and pointing at
  `docs/reference/guidance.md`; the doctor step keeps its text, renumbered),
  `docs/internal/engine-rulings.md` (a dated `- **Note (extend-2, Task 4):**` on
  `audit-cli-skill-admin-screens-check-and-cairn-doctor-fix` recording the late execution, the
  relocation to `cairn-guidance`, each of the three grounds' disposition, and the
  executed-without-removal discrepancy; a new `guidance-layer` accept row citing the spec),
  `ROADMAP.md` (close the extend entry at `:940`; close the pre-release DX-decisions
  entry at `:1447`, whose two open calls the `.orig` rule and the flag's removal answer; close the
  no-pruning note at `:1456`, answered by `MANIFEST`; the site-migration follow-up moves to each
  site's own roadmap by reference), `docs/extend/migration-notes.md`, `CHANGELOG.md`,
  `docs/internal/record/2026-09-14-extend-2-record.md`

**Steps:**
- [ ] **Step 1:** the ledger edits; `npm run check:rulings-format`.
- [ ] **Step 2:** the upgrade page, ROADMAP, migration notes, changelog reconciliation, the record.
- [ ] **Step 3:** the gate. Commit.

**Acceptance criteria:**
- `check:rulings-format`, `check:docs`, `check:vale` green.
- `grep -n "cairn-guidance install" docs/extend/upgrade-cairn.md` returns the new step, and the
  doctor step still follows it.
- The gate string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `docs(extend-2): upgrade step, ledger, roadmap, records`.

---

## Task 5: The budget check over every skill, and the docs gates over shipped markdown

**Chain:** B, first.

**Deliverables: three.** `check-skill-budget.mjs` over `skills/*/SKILL.md` with the tier map
bound to one skill and a dist-absent skip; `check:docs` extended to `skills/**/*.md` and
`claude/**/*.md`; the tests.

**Files (4):**
- Modify: `scripts/checks/check-skill-budget.mjs:25`, `:163-181`, `src/tests/unit/check-skill-budget.test.ts`
  (exists on `main`; extend), `scripts/checks/docs-links.mjs:15`, `:36` (the scan roots gain the
  two globs), `CHANGELOG.md`

**Interfaces:**
- Produces: the script globs `skills/*/SKILL.md`, applies the 3,500-token budget to each file
  whole (frontmatter counts), runs `parseTierMap` and the registry comparison only for
  `skills/cairn-admin-screens/SKILL.md`, prints a notice and skips the tier map when
  `dist/audit/rules/static/index.js` is absent, and fails naming the file and the overage.
- Produces: `check:docs` resolves every relative link and anchor in `skills/**/*.md` and
  `claude/**/*.md`.
- Consumed by tasks 6 and 7 (Step 1 runs the bare script without a `package` first).

**Steps:**
- [ ] **Step 1: the failing test first.** A fixture skill over budget fails naming it; a fixture
  skill with no tier map passes when it is not `cairn-admin-screens`; the dist-absent case prints
  the notice and exits 0; a `skills/` fixture with a dead link fails `check:docs`.
- [ ] **Step 2:** implement; changelog (no consumer action). The gate. Commit.

**Acceptance criteria:** the tests pass; `node scripts/checks/check-skill-budget.mjs` green over
the existing skill with and without `dist/`; `npm run check:docs` green; the gate string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `chore(checks): budget every packaged skill and link-check shipped markdown`.

---

## Task 6: The `cairn-extend` skill

**Chain:** B, second. **Depends on:** task 5.

**Deliverables: two.** `skills/cairn-extend/SKILL.md` under the cap; its two references.

**Files (4):**
- Create: `skills/cairn-extend/SKILL.md`, `skills/cairn-extend/references/preflight.md`,
  `skills/cairn-extend/references/daisyui-first.md`
- Modify: `CHANGELOG.md` only. The reference paragraph for this skill is task 2's, written from
  this Interfaces block; this task writes nothing under `docs/`.

**Interfaces:**
- Produces: a skill whose frontmatter `name` and `description` (the shape at
  `skills/cairn-admin-screens/SKILL.md:1-4`) trigger on building or changing anything under a
  cairn site that touches `/admin`, a form action, logging, or the engine's seams. Its body opens
  with the DaisyUI question, then a table: what you are building, the atom, the seam, the showcase
  exemplar file, the recipe page path, and the ruling slug as the why. The recipe paths are read
  from `docs/extend/README.md`'s recipe index on the branch at execution, every listed page cited,
  and the report quotes the list it read. It ends with the pre-flight checklist reference.
- Produces: `references/daisyui-first.md`, the engine's own 2026-09-13 minor-bump survey's DaisyUI
  section summarized, with the rulings-ledger slugs for the cases where a documented DaisyUI defect
  is the reason a home-grown component exists.

**Steps:**
- [ ] **Step 1:** write the router under 1,700 words; `node scripts/checks/check-skill-budget.mjs`.
- [ ] **Step 2:** the two references; changelog. The gate. Commit.

**Acceptance criteria:** the budget check is green; `npm run check:docs` resolves every recipe
path the table names; the report quotes the index it read; the gate string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `feat(skills): add cairn-extend`.

---

## Task 7: The `cairn-consult` skill

**Chain:** B, third. **Depends on:** task 5.

**Deliverables: two.** `skills/cairn-consult/SKILL.md`; its brief template and the copied standard.

**Files (4):**
- Create: `skills/cairn-consult/SKILL.md`, `skills/cairn-consult/references/brief-template.md`,
  `skills/cairn-consult/references/the-standard.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces: a skill that triggers when a developer has worked around the engine twice or wants
  something the seams do not reach, and writes a consultation brief in the four-field format (what
  the pass builds; the engine edge it presses with `file:line`; evidence for the any-site case; the
  site's fallback if declined with its rough size), saved under the site's own docs. The filing
  path is conditional: where the URL at the installed package's `package.json` `bugs.url` is
  reachable, the brief is filed there; where it is not, the skill says so plainly, the brief is the
  deliverable to send by whatever channel the developer has, and the skill never claims an issue was
  filed. The implementer checks the URL's reachability at execution and the report records it.
- Produces: `references/the-standard.md`, the two entry conditions and the four constraints
  copied from `~/.claude/skills/engine-consult/SKILL.md`'s "## The standard" section, which the
  implementer reads with `sed -n` and quotes in its report. A point-in-time copy with no gate;
  its drift is filed with the ritual's routine.

**Steps:**
- [ ] **Step 1:** write the skill and both references under the cap; the budget check.
- [ ] **Step 2:** changelog. The gate. Commit.

**Acceptance criteria:** the budget check is green;
`diff <(sed -n '/^## The standard/,/^## /p' ~/.claude/skills/engine-consult/SKILL.md | sed '$d') skills/cairn-consult/references/the-standard.md`
is empty (if the workstation path is unreachable from the worktree, the report says so and the
file is a paraphrase with a link, stated as such); the gate string exits 0.

**Gate:** CHECK-PLUS-UNIT. **Commit:** one, `feat(skills): add cairn-consult`.

---

## Gate

Derived at authoring from the committed `.github/workflows/`; byte-identical to the extend-1
plan's derivation plus the `check:cairn` step extend-1's task 7 appends. **Re-derive it from the
branch point before the first dispatch.**

**The CHECK-PLUS-UNIT string**, for every task, run through `cairn-run-gate '<string>'` in the
worktree:

```
npm run package && npm run check && npm test && npx publint --strict && npx attw --pack . --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error && node scripts/checks/check-package-files.mjs && node scripts/checks/check-skill-budget.mjs && node scripts/checks/reference-coverage.mjs && node scripts/checks/check-reference-signatures.mjs && node scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs && node scripts/checks/check-self-use.mjs && node scripts/checks/check-custom-surface.mjs && npm run check:chassis-boundary && npm run check:cm-internals && npm run check:idioms && node scripts/checks/check-invisible-craft.mjs && node scripts/checks/check-admin-css-classes.mjs && node scripts/checks/check-readiness.mjs && npm run check:docs && npm run check:rulings-format && npm run check:target-stack && npm run check:arm-indexes && npm run check:editor-quotes && node scripts/checks/check-visuals.mjs && npm run check:transcripts && npm run check:symbols && node scripts/checks/check-snippets.mjs && npm run check:prose && npm run check:version && npm run check:dev-package && npm run check:template && node scripts/checks/check-consumers.mjs && npm run test:emit && npm --prefix packages/create-cairn-site run prepack && npm --prefix packages/create-cairn-site test && npm --prefix examples/showcase run check && npm --prefix examples/showcase run check:cairn && npm --prefix examples/showcase run test:unit && npm --prefix examples/showcase run format:check && npm run check:vale && npm run check:comments
```

**The FULL string**, for the ritual only, appends `&& CI=1 npm --prefix examples/showcase run test:e2e`.

**The reduced gate for a comment-only fix round**: `npm run check:comments && npm run check:symbols
&& npm run check:docs` plus the touched files' own unit tests.

`publint` and `attw` keep their `npx` prefix; the string builds once at the head and calls each
check at its node entry point. Left to CI: `scaffold.yml` and `create-site.yml` (blocking for 3a
and 3b), `design.yml`, `norms.yml`, `tsgo.yml`, `publish.yml`.

## Rollback and halt semantics

- **After task 1a:** mergeable and already useful; the bin installs the one skill that exists.
- **After task 1b:** mergeable; the doctor is clean.
- **After task 2:** the fragment and agent ship and install.
- **After task 3a:** `create-site.yml` is red on the `.claude` leftover assertion until task 3b
  flips it; 3a is not independently mergeable.
- **Chain B unmerged:** the bin installs two skills fewer and the shipped-markdown link gate does
  not run; `install` enumerates the package's `skills/`, so nothing breaks.
- **Task 3a halted:** existing sites are served by `check`'s snippets; new sites lack the tree
  until it lands, a named carry-forward.

## Pass-end ritual

0. STATUS for the checkpoint and the close; merge `extend-2-skills` into `extend-2`, reconciling
   `CHANGELOG.md` and re-running `npm run emit:template`; open the PR; push.
1. `code-simplifier`; re-run the gate.
2. The FULL gate green once in the npm-script form.
3. The six CI-only gates green inside that run; `check:surface` byte-identical to `main`.
4. The from-scratch consumer build in `examples/showcase`.
5. `scaffold.yml` and `create-site.yml` green on the PR.
6. The reviewer fan-out; the security reviewer's read of the bin's write containment, the `.orig`
   rule, and the agent's tool list is blocking.
7. **The conductor files the scheduled routine** through the `schedule` skill: a monthly cloud
   agent reading Claude Code's published `CLAUDE.md` import documentation and its agent and skill
   frontmatter schema, pinging only on a change. Its id goes into STATUS's active watches with one
   line naming the response: a syntax change means the bake's written line, `cairn-guidance check`'s
   reported line, the agent frontmatter, and the reference page move together in one patch, with a
   `Consumers must:` line telling existing sites to re-run the install. The copied consultation
   standard is filed under the same routine.
8. Docs, HISTORY, STATUS, ROADMAP as task 4 left it; the record file. Score both budgets.
9. Merge on green CI. Close the session. Site migration is each site's next pass.

## What this pass hands forward

- **To each site's next pass:** `npm i @glw907/cairn-cms@latest`, `npx cairn-guidance install`,
  `npx cairn-guidance check`, paste the snippets, then the atom swaps the advisory findings
  schedule; ecxc's hookify rules retire where `no-uncompiled-class` covers them.
- **To the Go tool's 2.0:** a health check over `.claude/cairn/VERSION` and `MANIFEST`, if wanted.
- **To the workstation:** three implementer skills proposed during this plan's authoring
  (`cairn-audit-rule`, `cairn-export`, `cairn-ledger`), filed through `~/.claude/docs/claude-tooling.md`'s
  manifest process, not in this repo. A `cairn-migrate` skill for the site-side atom swaps is a
  candidate only if the first site pass shows the need.

## Post-mortem

Written at the close: tokens against 5.4M, the two attended-time counts, what the gate caught, and
what a later pass would be wrong to rediscover.
