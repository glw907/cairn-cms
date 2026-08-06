# History and revert (Phase F, pass one) — implementation plan

> **For agentic workers:** execute task-by-task per the repo's standing method: dispatch each task
> to `cairn-implementer` (pinned Sonnet), test-first; the main loop reviews each diff and confirms
> the full gate before the next dispatch. The spec is
> [`../specs/2026-08-06-history-revert-preview-design.md`](../specs/2026-08-06-history-revert-preview-design.md);
> read it before task 1.

**Goal:** the per-entry history view (a version is a publish) and revert as a draft through the
unchanged Publish gate, refusing fail-closed on an open draft.

**Architecture:** one new additive `Backend` member reads `main`'s commit log for the entry's
file; `historyLoad` shapes it into `HistoryData` with a synthetic open-draft row; the facade
gains a `history` view; `revertAction` reuses the existing branch-create-and-commit pipeline.
No new storage, no new actor, nothing breaking.

## Global constraints

- Every name is already reserved (C2 R11) and MUST land exactly as reserved: `historyLoad`,
  `history` (facade view), `HistoryData`, `HistoryEntry`, `revertAction`, `revert` (facade key),
  `RevertFailure` (used as `ActionFailure<RevertFailure>`), log event `commit.reverted` with
  `concept`, `id`, `editor`, and the reverted-to ref.
- Additive only. No existing export changes shape; `Consumers must: nothing` for non-adopters.
- Per-task gate: the task's targeted tests, then `npm run check` 0/0, then `npm test` exit 0.
- TSDoc per the repo standard; no em dash in comments; every new export documented
  (`check:reference` fails otherwise).
- Work runs on a feature worktree off `main` (`git worktree add`), one pass per worktree; note
  the showcase-symlink gotcha in CLAUDE.md before trusting any worktree e2e.
- Admin UI work follows `docs/internal/admin-design-system.md` (read before task 4).

---

### Task 1: the `Backend.listCommits` member

**Files:**
- Modify: `src/lib/github/backend.ts` (the `Backend` interface, line ~21, and the GitHub
  provider's implementation)
- Modify: `src/lib/github/repo.ts` (the commits-API fetch helper, beside `contentsUrl`/`treeUrl`)
- Modify: `packages/cairn-cms-dev/src/fake-github.ts` (the dev backend implements `Backend`)
- Test: a new unit spec beside the existing github unit specs, plus the fake's own spec
  (`packages/cairn-cms-dev/src/fake-github.test.ts`)

**Interfaces:**
- Produces: `listCommits(path: string, ref: string, limit: number): Promise<BackendCommit[]>` on
  `Backend`, newest first; `BackendCommit { ref: string; author: { name: string; email: string };
  date: string }` (ISO 8601), exported beside the interface.

**Outcome:** the seam can answer "who published this file, when," from the GitHub commits API's
path filter under the App installation token, and the dev backend answers the same question from
its recorded fake commits so local dev and e2e exercise the same shape.

**Constraints:** the GitHub call is one request (`per_page = limit + 1`, so the caller can set a
truncation flag without a second read), no pagination; a 404 or an empty log returns `[]`, never
throws (an entry created before its first publish has no history, which is a state, not an
error). Field mapping is exact and deliberate (adversarial round): author comes from
`commit.author.name`/`commit.author.email`, the git trailer that is always present, NEVER the
top-level `author`, which is the matched GitHub account and is null for magic-link editors, the
common case; the date is `commit.committer.date`, the honest "when did this land on main". The
fake records enough on its existing commit path to answer without new fixture formats.

**Two backend corrections ride this task (adversarial round).** The fake's `createBranch`
silently overwrites an existing branch where GitHub answers 422, so every collision test would
prove nothing and local dev can destroy a draft; the fake must throw on an existing name. And
the real backend's branch-create maps its already-exists failure to a typed conflict
(`isConflict`-compatible, or a dedicated `BranchExistsError` both backends throw identically),
so a caller can catch a branch collision as a refusal rather than a 500. This also fixes a
pre-existing save-vs-save race that 500s today.

**Acceptance criteria:** unit tests prove newest-first ordering, the `limit + 1` bound, the
empty answer for an unknown path, author/date mapping from the API payload shape including a
null top-level `author` (recorded fixture, not a live call), and that BOTH backends throw the
same typed error on `createBranch` of an existing branch. The spec's plan-time verification
rides here: confirm the path filter behaves under an installation token (one manual `curl`
against a real repo, result noted in the task report, not a committed test).

### Task 2: `historyLoad` and its types

**Files:**
- Modify: `src/lib/sveltekit/content-routes-core.ts` (beside `editLoad`; the entry's file path
  derives exactly as `editLoad` derives it)
- Modify: `src/lib/sveltekit/types.ts` and the `/sveltekit` barrel (`src/lib/sveltekit/index.ts`)
- Test: integration spec beside the existing content-routes specs, against the fake backend

**Interfaces:**
- Consumes: `Backend.listCommits` (task 1), `pendingBranch(concept, id)` from
  `src/lib/content/pending.ts`, `branchHead`.
- Produces: `historyLoad` route-factory member returning `HistoryData { entries: HistoryEntry[];
  draft: { editor: string; startedAt: string } | null; truncated: boolean }`;
  `HistoryEntry { ref: string; editor: string; date: string }`.

**Outcome:** the durable publish history as data: most recent 25 publishes (the bound is a
module constant, not config), `truncated: true` when the backend returned the full limit,
`draft` populated from the pending branch's head commit when one exists.

**Constraints:** `editor` on a `HistoryEntry` renders what git recorded, degrading to the raw
name or "unknown" rather than assuming a cairn editor (main's log also holds commits made
outside cairn: imports, direct developer edits, repo-wide migrations); no save-level rows ever
appear; `truncated` is set by the `limit + 1` probe (an entry with exactly 25 publishes is NOT
truncated); and the load calls `requireEngineAccess(runtime.access, editor, concept.id)` exactly
as `editLoad` does (adversarial round: the guard does authentication and capability only, and
every per-concept boundary in this repo is enforced by the route itself).

**Acceptance criteria:** tests prove the bounded read, the truncation flag exactly at the
`limit + 1` boundary (25 publishes: not truncated; 26: truncated), the `draft: null` and
populated cases, an access-map denial (an editor mapped away from the concept gets the same
refusal `editLoad` gives), and that a never-published entry with an open draft yields empty
`entries` plus the draft row. The rename question is already answered (adversarial round:
`renameAction` exists, so the path filter truncates at a rename); the consequence is task 4's
"Recent versions" wording and a task 6 doc sentence, no code.

### Task 3: the facade `history` view

**Files:**
- Modify: `src/lib/sveltekit/admin-dispatch.ts` (`parseAdminPath` grows the
  `/admin/<concept>/<id>/history` shape)
- Modify: `src/lib/sveltekit/cairn-admin.ts` (the `AdminData` union gains
  `{ view: 'history'; page: HistoryData }`, the dispatch switch gains its case)
- Test: the admin-dispatch and facade specs beside the existing ones

**Interfaces:**
- Consumes: `historyLoad` (task 2).
- Produces: the `history` member on the facade's view union, reachable from the edit screen.

**Outcome:** the reserved facade view exists and routes; an unknown concept or id inside the
path 404s exactly as the edit view does. That includes a deleted entry, by decision rather than
accident (Geoff, 2026-08-06): undelete is out of v1's scope, files to ROADMAP with the
recently-deleted surface it needs, and the guide names the developer's git escape hatch.

**Acceptance criteria:** dispatch tests for the parse (valid, unknown concept, unknown id);
a facade test proving the view delegates to `historyLoad` and carries its page shape.

### Task 4: the history screen

**Files:**
- Create: `src/lib/components/CairnHistory.svelte` (registered in the `CairnAdmin` view switch)
- Modify: `src/lib/components/CairnAdmin.svelte`, the edit screen's chrome (the link to history)
- Test: component spec beside the existing component specs

**Interfaces:**
- Consumes: `HistoryData` (task 2).
- Produces: the editor-facing screen; the revert affordance posts `?/revert` with the row's
  `ref` (task 5 implements the action; this task renders the form).

**Outcome:** metadata rows (editor, date, relative order) under the heading "Recent versions"
(never a completeness claim; a renamed entry's history is truncated invisibly, so the label
must not assert wholeness), the synthetic draft row pinned on top when present, the "showing
the most recent 25" line when `truncated`, an empty state for a never-published entry, all in
the admin design system's idiom (read `docs/internal/admin-design-system.md` first;
`data-theme` on a bare wrapper, scoped overrides in `@layer components`).

**Acceptance criteria:** component tests for all four states (rows, rows+draft, truncated,
empty); the revert form posts the row's FULL 40-character sha as a hidden field plus the
current head sha of `main` the page rendered against (task 5's staleness check reads it); no
new utility class outside the shipped admin sheet (`check:admin-css-classes` stays green).

### Task 5: `revertAction`

**Files:**
- Modify: `src/lib/sveltekit/content-routes-core.ts` (beside `saveAction`; reuses `readFile` at
  the target ref, `createBranch`, and the same `commit` path `saveAction` uses)
- Modify: `src/lib/sveltekit/cairn-admin.ts` (the actions map gains
  `revert: viewAction('revert', ['history'], ...)`)
- Modify: `src/lib/sveltekit/types.ts` (+ barrel): `RevertFailure`
- Modify: `docs/reference/log-events.md` rides task 6; the log call lands here
- Test: integration specs beside the save/publish specs

**Interfaces:**
- Consumes: `Backend.readFile(path, ref)`, `listCommits` (the ref-membership re-read),
  `createBranch` with its typed collision error (task 1), `commit` with `expectedHead`,
  `pendingBranch`, `requireEntryFromParams`, `concept.validate` and the save advisories channel,
  `commitFailure` from `src/lib/sveltekit/commit-log.ts`.
- Produces: `revertAction` member; facade key `revert` gated to the `history` view;
  `RevertFailure { reason: 'draft_exists'; draftEditor: string; draftStartedAt: string } |
  { reason: 'ref_unknown' } | { reason: 'history_stale' }` as `ActionFailure<RevertFailure>`
  (`fail(409, ...)` for `draft_exists` and `history_stale`, `fail(404, ...)` for `ref_unknown`).

**Outcome:** revert validates the posted ref against a fresh `listCommits` read (full-sha exact
membership, which gives `ref_unknown` one meaning, makes `commit.reverted`'s provenance true by
construction, and closes the arbitrary-ref read; the deliberate consequence, stated in the
docs: only the listed recent publishes are revertable through the UI). It compares the form's
`main`-head sha against `branchHead(defaultBranch)` and refuses `history_stale` when someone
published since the page rendered. It parses and validates the old content, then creates the
branch, commits with `expectedHead` set to the sha it just created (a save landing in the
window answers 409 instead of being silently overwritten), logs `commit.reverted` (`concept`,
`id`, `editor`, reverted-to ref, and the new branch sha) alongside the ordinary
`commit.succeeded`, and answers with the edit screen's post-save redirect carrying any
validation advisories ("this version predates a change to this content type: ..."), the same
channel save's advisories already ride.

**Constraints:** no force-path and no confirmation-gated overwrite exists, per the spec; the
refusal stays on the page (an `ActionFailure`, not a navigation); the Publish gate is
untouched. The branch-exists pre-check is a fast path for a friendly message; **`createBranch`'s
typed collision failure is the authoritative refusal** and maps to the same
`RevertFailure { draft_exists }` after a re-read for the draft's author and date. Validation is
warn-not-refuse (spec, adversarial round): advisories carry retired-field and
retired-vocabulary warnings, and revert never refuses on them. The revert commit's message is
its own (`Revert <concept>: <id> to <short-sha>`), not save's.

**Acceptance criteria:** integration tests prove the happy path end to end (revert, then the
existing publish path publishes the reverted content and deletes the branch), the collision
refusal with a populated `RevertFailure` from BOTH entry points (the pre-check and the typed
`createBranch` failure under a simulated race), `history_stale` on a moved `main` head,
`ref_unknown` for a sha absent from the fresh history read, the advisory path for an old
version carrying a retired frontmatter field, and one named test for the vocabulary-union
interaction: reverting to a version with retired tags must surface the advisory rather than
silently laundering the tags back into the allowed set. The log assertions cover
`commit.reverted`'s exact field set including the branch sha, and that `commit.succeeded` still
fires for the branch commit.

### Task 6: docs, changelog, roadmap

**Files:**
- Modify: `docs/reference/sveltekit.md` (`historyLoad`, `revertAction`, the types),
  `docs/reference/admin-routes.md` (the `history` view, the `revert` key),
  `docs/reference/log-events.md` (`commit.reverted`), `docs/guides/` (one short "restore an
  earlier version" how-to in the editor-workflow guide's arm)
- Modify: `CHANGELOG.md` under `## Unreleased`, `ROADMAP.md` (the entry-history item leaves Now)
- Test: `npm run check:reference`, `check:reference:signatures`, `check:docs`, `check:snippets`

**Outcome:** every new export documented, the changelog entry finalized under Unreleased
(holding for RELEASE ONE), the ROADMAP row removed with its vocabulary-reservation note marked
consumed, and a new ROADMAP entry filed for undelete (with the recently-deleted surface it
needs, per the sitting's scope ruling).

**Doc sentences the adversarial round requires:** history shows every commit that touched the
file, including changes made outside cairn; the 25-row bound composes with ref-membership
validation into "revert reaches the last 25 publishes," with git as the developer's escape
hatch beyond it; a renamed entry's history restarts at the rename; deleted entries are out of
scope and why.

**Acceptance criteria:** all four doc gates green; the changelog entry carries
`Consumers must: nothing` with the adopter-only framing; Vale clean on the published arms.
