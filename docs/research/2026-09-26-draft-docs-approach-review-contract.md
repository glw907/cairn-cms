# Draft docs approach spec review: contract and criteria lens

**Target:** `docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md` at `e00fcf70`.
**Input:** `docs/internal/record/2026-09-26-docs-approach-handoff.md`. **Lens:** is every promise
testable, can any criterion pass vacuously, and what would a planner have to guess. Findings are
ranked by consequence. Line numbers are the spec's unless a file is named.

**Counts:** 0 blocker, 7 major, 6 minor. One OWNER FORK (M3).

## Major

### M1. `check:provenance` passes an arm with no briefs, so the provenance promise is unenforced at merge

- **Location:** spec:82, spec:113-116; `scripts/checks/check-provenance.mjs:392`
  (`if (briefs.length === 0) return { defects: [], report: ['  no page has a brief yet'] }`).
- **Defect:** CI runs `check:provenance` over whatever briefs exist. A page with no brief is never
  a defect, so a rebuilt page whose chain skipped or lost its brief merges green. The per-page gate
  runs on "the page's brief" (spec:115), but nothing at stage merge proves every page in the arm has
  one. The front-door pages (`why-cairn.md`, arm READMEs) have no `<track>` for the
  `docs/internal/briefs/<track>/<page>.json` path (spec:114), so a planner must guess whether they
  carry briefs at all.
- **Fold:** Add to Stage 0 acceptance: `check:provenance` gains a coverage rule (a manifest of
  rebuilt arms, or a `--require <arm>` mode run in CI) that fails when any page in a merged arm
  lacks a brief. Unit-test the empty-arm case failing. State the front door's brief path (for
  example `briefs/front/<page>.json`) or state that it is exempt and why.

### M2. The per-page gate is a subset of the CI checks that read arm pages, so pages pass the chain and fail at merge

- **Location:** spec:115-116, spec:98; `.github/workflows/test.yml:77-88`; handoff:62-63.
- **Defect:** The chain gate lists `check:docs`, `check:vale`, `check:facts`, `check:provenance`,
  `check:procedures`. CI also runs `check:arm-indexes`, `check:editor-quotes`, `check:transcripts`,
  `check:snippets`, `check:visuals`, `check:prose`, and `check:tool-conditions`, several of which
  read arm pages, and about 25 `docsAnchor` values in `conditions.ts` point at page anchors. A page
  rename or restructure the outline approves (spec:89-90) breaks those, and no step owns the fix.
  The Go drift tests on the three contract pages (spec:151) likewise have no stated gate step.
  "Merge and checkpoint" (spec:98) names no gate at all.
- **Fold:** Define a stage merge gate: the full CI docs check set plus the tool's `make check`
  (drift tests), run once on the arm branch before merge. Add to the outline step: every rename or
  removal lists its `docsAnchor`, check-script, and index updates beside the redirect row, and the
  stage lands them.

### M3. OWNER FORK: direct site-pass edits collide with provenance briefs and the CLAUDE.md "never edits" line

- **Location:** spec:28-30, spec:67-72, spec:147-148; `CLAUDE.md` ("A site-pass agent never edits the
  cairn-cms checkout ... records each deficiency under 'Engine docs fixes'").
- **Defect:** `check:provenance` requires a page's prose to equal its brief's sentences exactly. A
  site-pass agent who "fixes" a rebuilt page directly (spec:72) fails CI unless it also edits the
  brief and cites a verified fact bullet, which no rule tells it. Stage 0 acceptance says the text
  follows the 2026-09-21 ruling but does not name the CLAUDE.md line it replaces, so both rules can
  survive side by side and a planner must guess which wins.
- **Options:** (a) Site-pass agents edit pages directly and must keep the brief and container in
  step, so `check:provenance` stays green; the `site-pass` skill carries the rule. (b) Site-pass
  agents file only; the existing batched `cairn-implementer` dispatch on `site-docs/<site>-<pass>`
  applies fixes through the brief. (c) Provenance applies until the site round, then briefs are
  frozen as a draft record and the check stops covering those pages.
- **Recommendation:** (a). It honors the 2026-09-21 ruling and keeps the one gate that traces
  claims. Stage 0 acceptance then names the CLAUDE.md sentence rewritten and the brief-sync rule
  landed in `site-pass`.

### M4. `check:procedures` can pass vacuously and has no defined oracle for "read-only"

- **Location:** spec:80, spec:139-146, spec:57 (Stage 3 "procedures under `check:procedures`").
- **Defect:** Four gaps, each of which lets the check pass while proving nothing.
  1. Zero commands passes. Today's arms hold about five fenced `cairn` lines, nearly all
     `cairn doctor`; the admin arm's procedures are mostly `npm`, `npx`, `wrangler`, and `git`,
     which are out of scope (spec:143). Stage 3's "procedures under `check:procedures`" can be
     satisfied by a check that examined one command.
  2. The read-only rule "`doctor`, `--json` output, `--help`" (spec:140) is a flag heuristic.
     `cairn health --json`, `logs --json`, `auth check --json`, `sites --json`, and `adopt list
     --json` exist (`tool/cmd/cairn/coverage_test.go:94-102`); they need live Cloudflare
     credentials and network, which contradicts "needs no container and no scratch site" and makes
     CI non-deterministic. `health` also takes `--ack`, which writes state.
  3. "Asserting the exit code" has no stated expected value; a page rarely states one, and doctor
     against the showcase may legitimately exit non-zero.
  4. "The JSON shape" names no schema source.
- **Fold:** Specify: an allowlist runs for real (`cairn doctor [--json] [<dir>]` and any `--help`);
  every other verb is help-checked only, unknown verbs included. The expected exit code is the one
  the page's own transcript or the showcase fixture records, never "any"; the JSON shape is
  validated against the schema `cli-cairn-json-output.md` documents. The check prints commands
  checked per page and fails when a page the outline marks procedural yields zero. Unit tests must
  include a planted unknown flag, a planted unknown subcommand, a zero-command procedural page, and
  a state-changing verb that must not execute. Say how placeholders (`<dir>`, `<site>`) are handled.
  Scope Stage 3's claim honestly: `check:procedures` covers `cairn` lines only, and the site round
  is the test for the rest.

### M5. Where `check:procedures` gets its `cairn` binary is unstated, and the CI job it names has no Go toolchain

- **Location:** spec:80 ("runs in the docs gate and CI"), spec:139-146; `.github/workflows/test.yml`
  (no `setup-go`); `tool.yml` has it.
- **Defect:** The check must execute `cairn`. A binary from `~/.local/bin` or a release drifts from
  `tool/` at HEAD and yields false passes or failures; `test.yml` cannot build one. "The docs gate"
  is not a defined script (the page chain takes its gate string from the plan), so "runs in the docs
  gate" has no single place to verify.
- **Fold:** Stage 0 acceptance names the CI job (add `setup-go` and a `go build ./tool/cmd/cairn`
  step, or run it in `tool.yml`), builds the binary from `tool/` at HEAD in both CI and local runs,
  and defines the docs gate as a named `package.json` script the page chain invokes.

### M6. Stage 1 has no acceptance criterion that can fail, and its relation to the page chain is unstated

- **Location:** spec:55, spec:101-102, spec:115-116.
- **Defect:** "Check each reference page against the container and the export surface; edit in
  place" under `check:reference`. `check:reference` and `check:reference:signatures` pass today, so
  the stage can close with zero work shown. The spec does not say whether stage 1 pages go through
  the page chain. If they do, the chain's draft step and sentence-level briefs contradict "edit in
  place" and cannot fit 0.8M for pages like `sveltekit.md` (over 1,100 lines). If they do not, no
  review reads them.
- **Fold:** State stage 1's flow: a per-page claim check (fact read only) over the reference pages,
  output as a record listing each page, claims checked, and discrepancies found and fixed; edits
  gated by `check:reference` and `check:reference:signatures`. State whether reference pages carry
  provenance briefs (recommend: no, since they are edited in place and pinned by the signature
  check), and exempt them in the M1 coverage rule.

### M7. The consistency read and the owner fold edit pages after review, with no brief sync and no re-read

- **Location:** spec:91-97.
- **Defect:** The consistency read has no defined output (findings list, coverage of every page) and
  "fixes land as one batch through the gate" names no editor agent. Any sentence it or the fold
  changes breaks that page's brief (M1's exact-match rule), and any new sentence needs a fact id.
  Neither step re-runs the fact read or register editor on changed sentences, so a fact error
  introduced at fold time ships unreviewed. An empty findings list is indistinguishable from a read
  that never ran.
- **Fold:** The consistency agent returns a structured record: every page read, findings with
  `file:line`, class (term, link, overlap, depth), and proposed edit; the record is committed or
  summarized in STATUS even when empty. An implementer applies the batch and updates briefs; the
  gate includes `check:provenance` over the whole arm. A page whose changed prose goes beyond term
  or link substitution gets the fact read again. The same rule covers the owner fold.

## Minor

### m1. `docs-page-chain.js` lives outside the repo, and "matches the chain" has no proof

- **Location:** spec:81-82; `~/.claude/workflows/docs-page-chain.js:117,122,187-225`.
- **Defect:** The workflow still requires `args.profile`, defaults the drafter to
  `cairn-implementer`, and runs a profile grader. It has no page-inputs step (spec:108-112). The file
  is outside the repo, so no diff-reviewer or CI sees the change. The `cairn-docs-drafter` agent
  definition still describes an audience-profile input.
- **Fold:** Acceptance: a dry run of the revised chain on one page produces a per-page record with
  the brief path, no grader read, and the page-inputs output. List the `cairn-docs-drafter`
  definition among Stage 0's edits.

### m2. Page-inputs output has no persisted home, and harvested bullets have no stated tag

- **Location:** spec:108-112.
- **Defect:** Job, type, exemplars, and fact ids are written somewhere unnamed. A bullet filed "from
  code or config" must be `[verified]` to be citable (`check-provenance.mjs` rejects `[candidate]`);
  the spec does not say who verifies it or how. Three pages in flight (spec:91) can append to the same
  track facts file concurrently.
- **Fold:** Store page inputs in the per-page record or the brief JSON. State that harvested
  bullets land `[verified]` with a `Source:` line, the fact read re-verifies them, and harvest
  writes are serialized per facts file (or IDs are pre-minted).

### m3. The site round's timing relative to stages is ambiguous

- **Location:** spec:13-14 ("the site round that follows each draft"), spec:147-149, R4.
- **Defect:** One reading has a site round per arm, another one round after all drafts. Sheet 1 is
  an editor task, and the editors arm lands in stage 4; a round after stage 3 would test old pages.
- **Fold:** One answer follows from the 2026-09-21 ruling ("draft docs first, then the site round"):
  the site round starts after stage 5 merges. Say so, and drop "each."

### m4. The stop rule "any page escalates twice" cannot fire as written

- **Location:** spec:120-121, spec:159.
- **Defect:** The chain allows one redraft; a second `fix` escalates once and there is no third round,
  so a page can escalate twice only if the conductor re-dispatches, which the spec does not define.
- **Fold:** Replace with "any page escalates after a conductor re-dispatch" or "two pages in one arm
  escalate."

### m5. Stage 0's owner-fact and freeze items name no proof

- **Location:** spec:67-79.
- **Defect:** "Lifted in every place that enforces it" and "settled" have no check. Skills and the
  memory file are outside the repo. The ROADMAP item says "drops the inputs it retired" without
  listing them.
- **Fold:** Acceptance proof: a grep for the freeze wording across `CLAUDE.md`, the two skills, and
  the memory returns only the new text; each owner-fact item ends with its bullet edited and retagged
  and `check:facts` green, and its STATUS line removed; the ROADMAP inputs to drop are the retired
  list at spec:34-39.

### m6. Human task reads have no named output

- **Location:** spec:149, R4.
- **Defect:** "Inform, never gate" is fine, but no step says where results land or who folds them.
- **Fold:** Results go in the Logs table of `2026-09-25-docs-reset-2a-human-reads.md`; findings are
  fixed or filed through the same site-round rule.
