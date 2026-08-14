# Pass D: the documentation reset

> **For agentic workers:** executed by a fresh Opus 5 conductor session in its own worktree
> off `main`, dispatching each implementable task to `cairn-implementer` (pinned Sonnet);
> the main loop reviews each diff and confirms the relevant gates before the next dispatch.
> Tasks marked **[main loop]** are cross-repo, external-tooling, or judgment-bearing. Any
> concrete path, count, or code shape this plan names is a claim to verify at the first
> task that touches it, never an instruction to follow blind (the T4a-through-T4d lesson,
> six times now).

**Goal:** restructure `docs/` around the four audiences (admin, editor, extender,
contributor), rewrite the setup guides to `create-cairn-site`'s real UX, rewire every gate
that encodes the old arm layout, and prepare the cairn-pub migration, so release one cuts
with documentation that matches the product it publishes.

**Spec:** the umbrella,
[`docs/superpowers/specs/2026-08-09-admin-setup-and-docs-reset-design.md`](../specs/2026-08-09-admin-setup-and-docs-reset-design.md)
(Part 2 and its Pass D acceptance criteria), with the pre-brainstorm brief
(`2026-08-09-docs-refactor-brief.md`) as background. The admin track's evidence base is the
baseline walk (`docs/internal/2026-08-unagented-setup-baseline.md`; its drag points 2, 4, 5,
7, 9, 10, 11, 12, 13, and 14 are this pass's documentation defects) and the live run
records (`docs/internal/2026-08-13-t5-task8-live-e2e.md`,
`docs/internal/2026-08-13-t4d-task7-live-proof.md`).

**Two phases, two worktrees (the sizing ruling, applied at plan time rather than
mid-flight).** Fourteen tasks is past a full plate, and this initiative's history says a
quiet double costs more than an early split. Phase 1 (Tasks 1-5) is the structural half:
the friction-log triage, the move manifest, the tree move with every gate rewired, the
readiness contract, and the standards layer. It merges to `main` with all gates green
before Phase 2 branches, so `main` stays releasable at the boundary. Phase 2 (Tasks 6-14)
is the content half: the track rewrites, the prune, cairn-pub, and the close. Within a
phase, the T4d rule stands: a second in-flight task split means proposing a further pass
split, not absorbing it.

## Rulings made at plan time (approve or veto at the plan gate)

1. **`docs/editors/` moves to Vale's Microsoft package**, vendored beside Google; every
   other published track stays on Google. The workstation standard routes editor copy to
   Microsoft, and the register standard already gives the editor guides their own register;
   this gives that register its deterministic net. Lands in Task 5.
2. **The resume table lands as the admin track's setup recovery page** (Task 8), derived
   from the shipped tool's real state model. This closes two debts at once: the umbrella's
   unowned resume-table deliverable (STATUS carry-forward 7) and the baseline's drag point
   10, that the setup phase has no troubleshooting surface at all.
3. **cairn-pub work is prepared in-pass and merged at the site walk.** The migration is
   authored on a branch in `~/Projects/cairn-pub` and proven against the packed tarball,
   but it cannot build against the registry until release one publishes, so it merges when
   the site walk reaches cairn-pub. "Lands" in the umbrella's acceptance reads as authored
   and proven, not deployed.
4. **No published page cites Diátaxis.** The front door routes by audience, which needs no
   appeal to authority, and the citation's URL is known dead. This retires the umbrella's
   re-verify item.
5. **ROADMAP reconciliation is explicit, not silent.** P6 (front-door docs) is absorbed by
   Task 6; P7's quickstart story is delivered by the tool's chapter 1 plus Task 7's
   create-your-site page. Task 14 marks both absorbed with pointers rather than deleting
   them.

## Global constraints

- Docs prose follows the Google standard under Vale plus the register standard in
  `docs/internal/docs-register.md` (as rewritten by Task 5), and never names ASC publicly.
  `docs/editors/` follows Microsoft per ruling 1.
- **No version bump, no publish.** The pass finalizes its `CHANGELOG.md` entry under
  `## Unreleased`, carrying a `Consumers must:` line for the docs-tree consumers
  (cairn-pub's loaders, any bookmarked `/docs/<arm>/<stem>` URL).
- **`CHANGELOG.md` history is immutable.** Old entries keep their old paths;
  `scripts/checks/docs-links.mjs` learns a legacy-path map applied to `CHANGELOG.md` only
  (Task 3).
- **Quoted tool output in the admin track must trace to a recorded transcript or a freshly
  captured run.** The sources are the live run records named above and runs of the real CLI
  against its fakes. Invented output is a defect, not a placeholder.
- **Every rewired gate is proven red once** before it is trusted green: flip one input the
  gate exists to catch and watch the named check fail (the falsifiability rule this
  initiative keeps relearning).
- **Every moved file's inbound links chase in the same task that moves it.** `check:docs`
  green is necessary; the reverse check, a grep for the old stem across `docs/`,
  `README.md`, and the root files, runs by hand per task.
- Root `CLAUDE.md` has no context headroom: Task 13's path chase trims at least as much
  prose as it adds.
- The full docs gate list for this pass, run in whole at each phase close and re-derived
  (never restated from memory) with `grep -l pull_request .github/workflows/*` before each
  merge: `check`, `test`, `check:comments`, `check:docs`, `check:arm-indexes`,
  `check:reference`, `check:reference:signatures`, `check:package`, `check:snippets`,
  `check:surface`, `check:readiness`, `check:prose`, `check:version`, `check:dev-package`,
  `check:consumers`.

---

## Phase 1: structure

### Task 1: the friction-log triage

**Files:** modify `docs/internal/docs-friction-log.md`, `ROADMAP.md`.

Self-contained and dispatchable first, per STATUS's own recommendation. The log holds 19
open findings, last cleared 2026-07-29; complete-or-move governs.

- [ ] Verify each of the 19 findings against current code before acting on it; an entry
  records what was true when written. For each: delete it (stale, with the verification
  evidence named in the triage note), promote it to the `ROADMAP.md` tier where it bites
  with its trigger, convert it to a co-located `// WATCH:` comment where the trigger is
  next-time-you-touch-X, or ship it only if the fix is genuinely one line.
- [ ] The refused-action editor cluster (the polite/assertive announcement split, the
  `?new=1` title seed, the 409 disclosure, the discarded frontmatter edits, the four forms
  losing working state) is one theme. Produce an explicit recommendation in the task
  report: does it earn its own later pass? The refused-save-discards-frontmatter finding is
  the sharpest and files to ROADMAP regardless of the cluster verdict.
- [ ] Entry 19 (the T2 hardening tail) has had its trigger fire twice without action;
  re-triage its remaining items now or delete what is no longer true, per the entry's own
  text.
- [ ] The setup-walk entry (the Pass D work list) stays open until Phase 2 ships what it
  names; Task 14 closes it.
- [ ] Keep the existing tag vocabulary in this task; Task 5 renames it.

**Acceptance:** the open-findings section holds only entries verified live within this
task; every removal names its evidence; the editor-cluster recommendation exists in
writing.

### Task 2: the move manifest

**Files:** create `docs/internal/2026-08-14-pass-d-move-manifest.md` (a dated process
artifact; Task 5's filing rule will place it on the record side).

The umbrella's bill demands exact counts before any move budget is committed. This task
produces the single document Task 3 executes mechanically.

- [ ] Re-derive the per-guide audience classification **from the guide texts**, not the
  filenames. The umbrella's 7 setup / 4 operations / 17 extender / 6 editor split is a
  claim to check, recorded per guide with a one-line justification.
- [ ] The move map: every current page under `docs/` maps to exactly one disposition, a
  new path under `docs/{admin,editors,extend,reference,internal}/`, KILL, or MERGE-into
  (naming the surviving page). Target shape per the umbrella: tracks are flat directories,
  each with its own `README.md` index whose link order is the future sidebar;
  `docs/README.md` stays the front door; `reference/` stays put except the
  authoring-syntax editor half; the hand-build tutorial and `explanation/` fold into
  `extend/`; `build-a-theme.md` moves to `internal/` as a draft.
- [ ] The prune list, full corpus: the redundancy harvest the umbrella names (duplicated
  log tables, AI-posture pages, `fields.reference` and glob-wiring snippets, the
  three-way gating overlap) plus anything else that does not earn its place, each with a
  rationale.
- [ ] The redirect map for cairn.pub: every old `/docs/<arm>/<stem>` and `/help/<stem>`
  URL to its new path, consumed by Task 12.
- [ ] The derived inbound-link counts (from a `check:docs`-based scan) and the gate bill
  re-derived against the current tree: every file that hardcodes an arm path. Verified at
  plan time as at least: `scripts/checks/{reference-coverage,check-reference-signatures,check-arm-indexes,check-snippets,check-package-files,check-readiness,docs-links}.mjs`,
  `src/lib/diagnostics/conditions.ts` (21 `docsAnchor` slugs),
  `src/tests/unit/github-slug-contract.test.ts`, `package.json` `files`, `.vale.ini`,
  `docs/internal/docs-register.md`, `docs/internal/docs-maintenance.md`, root `CLAUDE.md`,
  the `cairn-pass` skill, and the agent memories.
- [ ] The `internal/` split: the curated live set (roughly the 14 the README indexes,
  re-derived) versus the record (dated artifacts, joining `history/` or a sibling
  directory the manifest rules on), plus the filing rule's exact text so sediment does not
  reaccumulate.

**Acceptance:** every current `docs/` page appears exactly once in the manifest; a reader
could execute Task 3 from the manifest alone.

### Task 3: the tree move and the mechanical gates

**Files:** per the manifest. Modify at least `package.json`,
`scripts/checks/check-package-files.mjs` and its unit-test fixtures,
`scripts/checks/check-arm-indexes.mjs` (`ARMS`), `scripts/checks/check-snippets.mjs`
(`DOC_DIRS`), `scripts/checks/reference-coverage.mjs` and
`check-reference-signatures.mjs` (CONFIG paths), `scripts/checks/docs-links.mjs` (the
legacy-path map), `src/tests/unit/github-slug-contract.test.ts` (corpus scope),
`.vale.ini` (track paths; Google only, the Microsoft flip is Task 5's).

- [ ] Execute the manifest: `git mv` per the move map, KILLs executed (merges wait for
  Phase 2), each track's `README.md` index written with the full link order, the two
  front doors re-pointed so every link resolves (the audience rewrite is Task 6's).
- [ ] Rewire each gate named above; `package.json` `files` ships the new tracks and the
  packaging gate's allowlist plus fixtures match. The `files` change sequences before any
  cairn-pub loader change by construction (Task 12 is later and unmerged).
- [ ] `docs-links.mjs` learns the legacy-path map (old arm path to new track path),
  applied to `CHANGELOG.md` only; its hardcoded `upgrade-cairn.md` `## Unreleased`
  pairing repoints to wherever the manifest homed the upgrade page.
- [ ] Prove each rewired gate red once: a temporary wrong entry in the packaging
  allowlist, a dead link, a snippet in a moved dir, an index omission; watch each named
  check fail, then revert.
- [ ] Full gate green at task end: content unrewritten, every link resolving, the tarball
  shape correct (`npm pack --dry-run` inspected).

### Task 4: the readiness contract

**Files:** modify `scripts/checks/check-readiness.mjs` (`DOC`),
`src/lib/diagnostics/conditions.ts`, the readiness page at its new admin-track home, and
the contract's tests.

The umbrella names this its own task: `check:readiness` is a three-way contract between a
hardcoded doc path, 21 `docsAnchor` heading slugs baked into library source, and the page
itself.

- [ ] Reorganize the readiness page for its admin-track home, enumerate the anchors, and
  make the `docsAnchor` semantics track-aware (the doctor's rendered links must resolve
  against the new tree).
- [ ] `npm test` proves the contract; one deliberate wrong-anchor mutation proves the gate
  can fail; `conditions.ts` changes run the library gates (`check`, `npm test`,
  `check:comments`, and `check:surface` if the exported surface moved, with the snapshot
  regenerated and committed only if drift is intended).

### Task 5: the standards layer

**Files:** modify `docs/internal/docs-register.md`, `.vale.ini` (vendor the Microsoft
package beside Google under `.vale/styles`), `docs/internal/docs-friction-log.md` (tags),
`docs/internal/README.md`; move record artifacts per the manifest.

- [ ] Rewrite `docs-register.md`'s arm registers as track registers, update the front-door
  register for four-audience routing, and fix the stale "62 pages" count (line 3) against
  the post-move tree.
- [ ] Apply ruling 1: `[docs/editors/**]` gets the Microsoft package; confirm the vendored
  package passes offline the way Google's does; run Vale over the moved editor guides and
  clear error-tier findings only.
- [ ] Rename the friction-log tag vocabulary to the four audience names; `operator:`
  retires into `admin:`; retag the entries that survived Task 1; update the log's own
  header rules.
- [ ] Rewrite `docs/internal/README.md` as the curated live index plus the filing rule
  from the manifest; move the record artifacts per the manifest.

**Phase 1 close [main loop]:** full gate by name, `grep -l pull_request` for the CI list,
push, PR, all checks green, merge to `main`. Update STATUS's entry to "Phase 1 merged,
Phase 2 next" with the fresh-worktree instruction. This is a normal pass boundary: prep
the context clear even if the same conductor continues.

---

## Phase 2: content (fresh worktree off the merged `main`)

### Task 6: the front doors

**Files:** modify `README.md`, `docs/README.md`; `why-cairn`'s new home per the manifest.

- [ ] Both front doors route four audiences by name in the first screenful; the first
  copyable command sits near the top of the root README rather than behind five sections
  of positioning (drag 12).
- [ ] `docs/README.md` stops telling the reader to keep `examples/showcase` open (a
  quickstart reader does not have it) and stops promising the guides follow the tutorial's
  order; the track indexes own sequencing now.
- [ ] `why-cairn` sits in the front door's orbit per the manifest; no page cites Diátaxis
  (ruling 4).
- [ ] Vale plus the Task 5 register standard hold on both files.

### Task 7: the admin track, chapter 1

**Files:** create/modify the admin track's create-your-site page and the setup guides per
the manifest's setup set.

- [ ] "Create your site" presents both doors: the Deploy button as the zero-prerequisite
  start, the CLI as the complete experience, per the umbrella's two-doors ruling. The CLI
  narrative quotes the tool's real printed output from the recorded runs (the
  transcript-traceability constraint), through chapter 1's finish line: signed into your
  own admin on `workers.dev`, no payment, no domain, no email.
- [ ] Prerequisites are stated up front as facts, not discovered at the failing step: Node
  (with an install path, drag 8), a GitHub account; and chapter 1 explicitly needs no git
  binary, no payment, no domain.
- [ ] The setup guides rewrite to the tool's output rather than relocating hand-authoring:
  each page in the manifest's setup set is rewritten, merged into the track pages, or
  killed per the manifest. `CLOUDFLARE_API_TOKEN` guidance lands where the tool's
  token-prefill needs it, with scopes (drag 7). No placeholder ids: the tool writes real
  ones, and any residual placeholder is marked as one that breaks a real deploy (drag 9).
  The two-localhost-origins confusion is resolved wherever origins are named (drag 13).
- [ ] The readiness page (Task 4's home) slots into this track as the doctor-organized
  "is it working" surface.
- [ ] Platform rule: no GNU-only shell command ships without a macOS branch (the `base64
  -w0` class, drag 5).

### Task 8: the admin track, chapter 2 and day 2

**Files:** create/modify the domain, email, and push-to-deploy pages; the setup recovery
page; the four operations guides; the default-site upgrade page.

- [ ] Chapter 2 opens with the money stated plainly (Workers Paid and a payment method are
  the chapter's admission price, drag 2) and the domain prerequisite named before any
  zone instruction: you own a domain, it becomes a Cloudflare zone, nameservers and
  propagation are involved (drag 4).
- [ ] **Browser-moment counts are stated per door and per chapter, derived from the real
  flow; the domain page states both carried counts: chapter 2's count is one and chapter
  3's is two** (STATUS carry-forward 2).
- [ ] The setup recovery page is the umbrella's resume table made real (ruling 2): one row
  per step naming the persisted key, its expiry, how partial state is detected, and the
  exact re-entry, derived from `packages/create-cairn-site`'s real state model and the
  live-run records. It doubles as the setup-phase troubleshooting surface the corpus
  lacks (drag 10), and says plainly what the published troubleshooting guide covers
  (live sites) versus this page (setup).
- [ ] The four operations guides land as day 2, with the short default-site upgrade page
  beside them.

### Task 9: the editors track

**Files:** the six editor guides at their new home; `docs/editors/README.md`; the
authoring-syntax split per the manifest.

- [ ] The six guides read under the Microsoft register; fix error-tier findings without
  flattening the guides' existing voice.
- [ ] The editor-facing half of `authoring-syntax` joins the track, named in both indexes
  as the one deliberate `reference/` exception; the developer-facing residue stays in
  `reference/` with cross-pointers both ways.

### Task 10: the extend track

**Files:** the extender guides, the retitled hand-build tutorial, the folded
`explanation/` pages, the upgrade-ceremony material, per the manifest.

- [ ] The hand-build tutorial retitles as the extender's deep path and its toolchain drift
  is fixed against the current scaffold, verified by running `npx sv create` before
  writing: the adapter is configured in `vite.config.ts` now, so the `svelte.config.js`
  edit dies (drag 11); the origins are reconciled (drag 13); every shell command is
  platform-branched where GNU/BSD differ (drag 5).
- [ ] `make-waymark-your-own` joins the track (it edits source and rebuilds);
  `build-a-theme` moves to `internal/` as a draft per the umbrella.
- [ ] `explanation/` folds per the manifest; the changelog-ceremony upgrade material
  (`upgrade-cairn.md`) homes here and Task 3's gate pairing already points at it
  (verify).

### Task 11: the prune

**Files:** per the manifest's MERGE list.

- [ ] Execute the merges: duplicated log tables, AI-posture pages, `fields.reference` and
  glob-wiring snippets, the three-way gating overlap, collapsing to the canonical homes
  the manifest names; every merged page's inbound links repoint.
- [ ] Sweep for residue: grep every killed or merged stem across `docs/`, `README.md`,
  and `CONTRIBUTING.md`; zero hits outside the CHANGELOG legacy map and the process
  record.

### Task 12: cairn-pub, prepared **[main loop]**

**Files:** in `~/Projects/cairn-pub`, on a branch: `src/lib/docs/{loader,link-policy,link-check}.ts`,
the `/docs/[...path]` and `/help/[guide]` routes, the loader tests,
`src/theme/components/GettingStartedPanel.svelte`, plus a redirect map.

- [ ] The loader consumes the track tree: the arms union, `/help` derived from the
  `editors/` index instead of parsing a "For editors" heading out of the guides README
  (the mechanism dissolves, not just the path), tutorial stems reworked, and
  `link-policy.ts` made fail-loud on an unknown `docs/*` prefix instead of silently
  rewriting to a GitHub blob URL.
- [ ] The redirect map: every old `/docs/<arm>/<stem>` and `/help/<stem>` URL from the
  manifest redirects to its new location.
- [ ] Proven against the packed tarball: `npm pack` from the Pass D tree, installed via
  `file:` in the cairn-pub branch, site builds green and renders the tracks.
- [ ] **Not merged** (ruling 3): the branch name and its proof evidence are recorded in
  STATUS; the site walk merges it once release one publishes and the dependency range
  bumps.

### Task 13: the outside edges **[main loop]**

**Files:** modify `CHANGELOG.md`, `docs/guides`-successor upgrade page, root `CLAUDE.md`,
`docs/internal/docs-maintenance.md`, `~/.claude/skills/cairn-pass/SKILL.md`, agent
memories; the drift routine via the schedule tooling.

- [ ] Finalize the `## Unreleased` entry with the `Consumers must:` line naming the docs
  tree change and the cairn-pub loader migration; add the upgrade-guide entry.
- [ ] Chase arm paths through prose: root `CLAUDE.md` (trimming at least as much as it
  adds), `docs-maintenance.md`'s machine-layer table, the `cairn-pass` skill's docs step,
  and any agent memory naming an arm path.
- [ ] The drift routine (`trig_015UPQostYVisXuExTHTH2vu`): verify what it actually
  samples. If it samples repo paths, re-scope it now; if it samples cairn.pub URLs, the
  re-scope rides the site-walk sitting that merges Task 12's branch, recorded as a STATUS
  hand-off line. Either way the routine must fail loud, not report a clean "no drift",
  when its sample set stops resolving.

### Task 14: pass close **[main loop]**

- [ ] ROADMAP reconciliation: Pass D marked done in the T-series entry; P6 and P7 marked
  absorbed with pointers (ruling 5); the editor-cluster filing from Task 1's
  recommendation; the friction log's setup-walk entry closed against what shipped.
- [ ] Post-mortem appended to this plan; STATUS rewritten with the next action (release
  one via `cairn-release`, restating the same-cut obligations: `create-cairn-site`,
  `@glw907/cairn-cms-dev`, the template repo, and T5a'); the initiative memory
  refreshed.
- [ ] Phase 2 merges via PR with all checks green; the cold-start test runs before the
  session closes (a fresh session reading only plan, spec, STATUS, and memory reaches
  the same next action).

## Exit criteria

The umbrella's Pass D acceptance, verbatim where it applies: the four tracks ship with the
dispositions above; every gate in the bill passes, including the readiness contract, the
packaging allowlist, and the re-scoped anchor corpus; the cairn-pub branch is proven
against the tarball with its redirect map and fail-loud link policy; the CHANGELOG keeps
its history via the legacy-path map; the drift routine's scope is handled at the boundary
Task 13 rules; the front doors route four audiences by name; and no published page
describes tooling that is not installable in the same cut, which release one satisfies by
publishing the tool, `@glw907/cairn-cms-dev`, and the template repo together with this
tree.
