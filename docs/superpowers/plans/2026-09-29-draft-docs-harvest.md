# Draft docs harvest, then delete

**Goal:** Prove every claim on the 49 old narrative and front-door pages is a fact or a recorded
cut, then delete those pages with every inbound reference and gate repaired.

**Spec:** `docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md` (the claim ledger, the
audit, the verifier, the deletion, acceptance) and its parent,
`docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`, "Amendment: harvest, then
delete". Executors read the harvest spec in full. Where this plan and the spec disagree, stop and
report.

**Approach:** Build the ledger format and its verifier first, test-first. Audit one arm alone to
measure the per-page rate, then run the other four batches as three parallel chains. Merge the
chains, run the verifier over all 49 pages, and only then delete. Plans specify outcomes and
acceptance, never implementation code.

**Pass class:** mixed. Task 1 is `engine-logic`. Tasks 2 to 6 are `docs`, with a gate the plan
names (below) instead of the docs tier, since their diff is ledgers and facts bullets, not
published prose. Task 8 is `engine-logic` for its `scripts/` and `src/tests/` changes and `tool`
for its `tool/` changes, gated by the union. `code-simplifier` runs once at the close (task 9)
over the pass's changed JavaScript, TypeScript, and Go.

**Execution mode:**
- Task 1: one Agent-tool chain (`cairn-implementer` on `sonnet`, then `diff-reviewer` on
  `claude-opus-5-5`), in this worktree.
- Task 2: one Agent-tool chain, the same shape, in this worktree. It is the rate checkpoint.
- Tasks 3 to 6: `pass-execute-chains` by name, three chains in three worktrees branched from task
  2's commit, with `classifier: false`, `gateLane: "light"`, and each task's `gate` set as below.
  Chain X is `draft-docs-harvest-x` (task 3, then task 4). Chain Y is `draft-docs-harvest-y`
  (task 5). Chain Z is `draft-docs-harvest-z` (task 6). The conductor creates each worktree and
  runs `npm ci` in it before launch. The chains are independent: X touches only `editors.md`,
  `front-door.md`, and their ledgers; Y and Z touch disjoint page sections of `extend.md` and
  their own ledgers.
- Task 7: conductor-led merge and verification (below).
- Task 8: one Agent-tool chain, upshifted to `model: opus` for the implementer, because the
  gate narrowing is correctness-critical and the plan names outcomes, not the shape of each
  narrowing.
- Task 9: the close, authored by one fold agent with one independent `diff-reviewer` read.

**Token ceiling:** 7M, flag at 5.5M. Derivation: audit 3 to 4.5M (49 pages at 60 to 90k each),
deletion about 1M, review and close about 1M. **Counting rule:** what `/cost` reports for the
conductor session, as draft docs pass 0+1 recorded it; subagent and workflow tokens come from
each dispatch's reported usage, summed in the ledger below.

**Checkpoints:** after task 1 (STATUS written); after task 2 (the rate checkpoint: re-project
tasks 3 to 6 from task 2's measured tokens per page, and if the projection puts the pass over
the 7M ceiling, write STATUS and ask Geoff one question on ceiling before launching the chains);
after task 7; after task 8. Segments: S1 is tasks 1 and 2, S2 is tasks 3 to 7, S3 is tasks 8
and 9. Every boundary is a gate-green commit.

## Global constraints

- The deletion list is exactly 49 pages: every `.md` under `docs/admin/` (9), `docs/editors/` (8),
  and `docs/extend/` (33) minus `docs/extend/migration-notes.md`, `docs/extend/upgrade-cairn.md`,
  and `docs/extend/choose-an-ai-posture.md` (30), plus `docs/why-cairn.md` and `docs/README.md`.
  The three kept extend pages are never audited, edited, or deleted by this pass.
- Facts follow `docs/internal/facts/README.md` exactly: a minted id from
  `node scripts/checks/check-facts.mjs --mint`, one tag at the end, a `Source:` that resolves, and
  no em dash anywhere in the container.
- A new fact is filed inside the facts-file section of the page being audited, never elsewhere,
  so parallel chains never edit the same hunk.
- A ledger paraphrases a claim in at most 25 words and never copies a sentence from the page.
- `npm run check:facts` is green after every task.
- `templates/waymark/` is emitted from `examples/showcase` (`npm run emit:template`), never
  hand-edited.
- A released Go binary's docs URLs (`https://cairn.pub/docs/...`) and the anchor strings in
  `tool/` constants are shipped contracts: they are never changed by this pass.
- Commit specific files, never `git add -A`. Commit messages carry the attribution trailer.
- No task edits `docs/STATUS.md` except the conductor's checkpoint writes and task 9.

## Review focus

1. **A page edited on `main` after its audit.** Pass C or a site pass may touch an old page while
   the chains run. The verifier's `blob` check must fail such a page by name, and task 7 re-audits
   only the changed claims before the deletion.
2. **A fact that is near the claim but not it.** An auditor may map a claim to a bullet that is
   broader, narrower, or about a neighboring behavior. Each audit's `diff-reviewer` spot-traces at
   least five `fact` dispositions per batch against the claim paraphrase and the bullet.
3. **A reference grep misses.** Inbound references include anchor fragments, JSON, Go test reads,
   a GitHub workflow, the shipped skill, and emitted templates. Task 8's post-condition is a
   repo-wide grep for every deleted path's basename that returns only the allowed residue.
4. **A gate that passes because its subject vanished.** A narrowed gate must still fail on the
   defect it exists for once an arm has pages again. Task 8's tests pin each narrowing both ways.
5. **The tarball.** `package.json` `files` lists the deleted paths and `check:package-files`
   requires the front doors. After the deletion, `npm run check:package` passes and the packed
   tarball carries `docs/reference/` and the three kept extend pages.

## Tasks

### Task 1: the claim ledger format and its verifier

**Pass class:** `engine-logic`. **Gate:** `npm run check` and the verifier's own unit test file,
through `cairn-run-gate`, light lane (the test runs in Node only; name the vitest project that
holds it).

**Files:** create `scripts/oneshot/verify-harvest.mjs`, its unit test under `src/tests/unit/`,
`docs/internal/record/harvest/README.md` (the ledger schema and the cut-reason list, copied from
the spec, for the auditors), and one fixture ledger set under the test's fixtures. Modify
`scripts/checks/gate-tier.mjs` only if the new directory needs a tier.

**Outcomes:**
- The verifier implements every rule in the spec's "The verifier" section, reading the deletion
  list from one exported constant that task 8 also uses.
- It takes `--arm <admin|editors|extend|front-door>` to scope a run to one arm's pages (the
  auditors' self-check) and `--pages <path,...>` to scope to a batch; with no flag it checks all
  49 and fails on any missing ledger.
- Its output names each failure with the ledger path and the claim index, and prints per-arm
  counts on success.

**Acceptance:** test-first, each rule has a failing fixture case and a passing one, including a
stale `blob`, an unresolved id, a `[candidate]` target, an unknown cut reason, an undisposed
claim, and a ledger for a page off the list. The check and the test are green.

### Task 2: audit admin (rate checkpoint)

**Pass class:** `docs`. **Gate:** `npm run check:facts && node scripts/oneshot/verify-harvest.mjs
--arm admin`, light lane.

**Pages (9):** every `.md` under `docs/admin/`, `README.md` included.

**Outcomes:** per the spec's "The audit" section, for these pages: a ledger per page, missing facts
filed, and every `[candidate]` and `[docs-drift]` bullet in `docs/internal/facts/admin.md`
resolved. `admin/README.md` gains its facts-file section. Every heading slug that
`tool/internal/spine/conditions.json`, `tool/internal/doctor/`, `scripts/checks/shipped-anchors.json`,
or a gate names on `is-it-working.md` is recorded as a fact naming the slug and what pins it.

**Acceptance:** the gate is green; the report gives the claim count, facts reused, facts filed,
cuts by reason, and the tokens the dispatch used, so the conductor can compute tokens per page.

### Task 3: audit editors (chain X)

**Pass class:** `docs`. **Gate:** `npm run check:facts && node scripts/oneshot/verify-harvest.mjs
--arm editors`, light lane.

**Pages (8):** every `.md` under `docs/editors/`, `README.md` included. It gains a facts section.

**Outcomes and acceptance:** as task 2, against `docs/internal/facts/editors.md`. The quoted UI
strings `check:editor-quotes` pins on `when-something-goes-wrong.md` are recorded as facts
sourced to the component or message file that renders them.

### Task 4: audit the front door (chain X, after task 3)

**Pass class:** `docs`. **Gate:** `npm run check:facts && node scripts/oneshot/verify-harvest.mjs
--arm front-door`, light lane.

**Pages (2):** `docs/why-cairn.md` and `docs/README.md`.

**Outcomes and acceptance:** as task 2, against `docs/internal/facts/front-door.md`. A stance claim
maps to an owner-tier fact with its verbatim key phrase, or is cut as
`stance-without-owner-basis`. The facts file's `README.md` and `CLAUDE.md` sections are not
audited: those files are not being deleted.

### Task 5: audit extend, first half (chain Y)

**Pass class:** `docs`. **Gate:** `npm run check:facts && node scripts/oneshot/verify-harvest.mjs
--pages <the 15 paths>`, light lane.

**Pages (15, about 2830 lines):** `add-a-custom-admin-screen`, `add-an-island`,
`add-a-second-audience`, `add-cairn-to-a-sveltekit-app`, `animate-a-custom-screen`,
`announce-on-publish`, `architecture`, `auth-channel-security-model`, `build-a-site-by-hand`,
`configure-rendering`, `content-model`, `data-tiers`, `debug-your-site`,
`declare-your-own-concept`, `define-an-adapter-and-schema` (each `docs/extend/<name>.md`).
`animate-a-custom-screen` gains its facts section.

**Outcomes and acceptance:** as task 2, against these pages' sections of
`docs/internal/facts/extend.md` only. Candidates and drift bullets outside these sections are
left for task 6.

### Task 6: audit extend, second half (chain Z)

**Pass class:** `docs`. **Gate:** as task 5, with its own 15 paths.

**Pages (15, about 2740 lines):** `design-your-site`, `enable-tidy`,
`link-content-with-references`, `migrate-existing-content`, `organize-your-admin-nav`, `README`,
`render-safety`, `restrict-admin-access`, `reuse-content-across-entries`,
`rotate-the-github-app-key`, `security-model`, `share-a-draft-preview`,
`sign-in-through-your-organization`, `what-the-scaffold-wrote`, `wire-the-delivery-surface`
(each `docs/extend/<name>.md`).

**Outcomes and acceptance:** as task 5, for these sections. Any `[candidate]` or `[docs-drift]`
bullet in `extend.md` outside every page section (under no page heading) is resolved here too.

### Task 7: merge the chains and verify the whole harvest

**Conductor-led.** Merge chains X, Y, and Z into `draft-docs-harvest` in that order. A conflict in
a facts file is resolved by keeping both sides' bullets, never by editing a claim; any other
conflict stops the task. Merge `main` in as well, so the verifier sees current pages. Run
`npm run check:facts` and `node scripts/oneshot/verify-harvest.mjs` with no flag. A stale-`blob`
failure dispatches one Sonnet auditor for only the named pages' changed claims (it diffs the page
against the audited blob). Record the verifier's per-arm counts in this plan's ledger.

**Acceptance:** the full verifier and `check:facts` are green on the merged head; the counts are
recorded.

### Task 8: delete the pages and repair every reference

**Pass class:** `engine-logic` plus `tool`. **Gate:** the repo's full gate (`npm test` exit 0 and
`npm run check:close`), `npm run check:package`, and `make -C tool check` on the light lane, each
through `cairn-run-gate`.

**Discovery (the implementer runs it first and works from its output, never from this list):**
`git grep -nIE 'docs/(admin|editors|extend)/|why-cairn|docs/README' -- ':!docs/internal/record' ':!docs/superpowers' ':!docs/HISTORY.md' ':!CHANGELOG.md'`,
plus a grep for each deleted page's basename, since anchors and relative links omit the directory.
At plan time the first grep found about 45 live files outside `docs/`, among them
`package.json` `files`; `scripts/checks/{check-package-files,check-arm-indexes,check-readiness,check-editor-quotes,check-symbols,check-symbols-allowlist,check-public-tokens,docs-links,gate-tier}.mjs`;
unit tests in `src/tests/unit/`; `tool/internal/health/fixes_test.go`; `.github/workflows/tool.yml`;
`packages/create-cairn-site/`; `examples/showcase/` and `examples/cairn-theme/` READMEs and source
comments; `templates/waymark/`; `skills/cairn-extend/SKILL.md`; and the repo-root `README.md`,
`CONTRIBUTING.md`, `SECURITY.md`, `CLAUDE.md`, and `ROADMAP.md`. Links inside `docs/internal/`
(other than `record/`) and `docs/reference/` are repaired too.

**Outcomes:**
- The 49 pages are deleted. Nothing else under `docs/` is deleted.
- Every reference is repaired per the spec's "The deletion" section: a prose link retargets to a
  reference page covering the same ground, or is removed with its sentence reworded; a test
  fixture using a real old path moves to a surviving or synthetic path.
- Each pinning gate is narrowed per the spec, scoped to the arm's absence. `check:readiness` and
  `fixes_test.go` check every live `docsAnchor` against a committed anchor list while
  `is-it-working.md` is absent, and against the page when it exists.
- `CLAUDE.md`'s docs section and `docs/internal/facts/README.md`'s "How this container grows"
  drop the per-arm freeze language for the deleted arms, per the parent amendment's
  "Superseded" paragraph, and state that the arms are empty until their stages rebuild them.
- `docs/internal/record/harvest/relink.json` records every removed link and narrowed assertion
  with its file, line, old target, action, and the stage (`2a`, `2b`, `3`, `4`, `5`) that
  restores or re-arms it.
- `CHANGELOG.md` `## Unreleased` gains the spec's entry.

**Acceptance:** test-first for every gate change, each narrowing pinned both ways (passes on the
empty arm, still fails on its defect once a page exists); the discovery grep returns only
`relink.json`, `CHANGELOG.md`, the ledgers, and Go constants naming `cairn.pub` anchors; the full
gate, `check:package`, and `make -C tool check` are green.

### Task 9: close

Run `cairn-pass`'s close. `code-simplifier:code-simplifier` over the pass's changed `.mjs`, `.ts`,
and `.go`; the full gate; STATUS rewritten with the stage 2a plan as the next action (a fresh
brainstorm session writes it, drawing the extend outline from jobs, the facts, and `relink.json`);
the HISTORY entry with the verifier's counts, what the gates caught, what a later pass would be
wrong to rediscover, and whether any refused review finding turned out real; ROADMAP updated;
this plan's post-mortem with both budgets scored. Push, open the PR, and merge on Geoff's go.

## Ledger

| Task | Status | Tokens | Notes |
| --- | --- | --- | --- |
| 1 | pending | | |
| 2 | pending | | |
| 3 | pending | | |
| 4 | pending | | |
| 5 | pending | | |
| 6 | pending | | |
| 7 | pending | | |
| 8 | pending | | |
| 9 | pending | | |
