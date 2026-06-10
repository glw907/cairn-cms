# cairn publish workflow: edits held on per-entry branches until Publish

Design for the publish workflow Geoff requested 2026-06-10. Today every save commits straight to
`main` and the site auto-deploys a few minutes later. The editor has no way to work on a live page
without shipping each save, no indication that a page differs from what visitors see, and no way to
abandon a bad edit short of manually restoring the old text. This design gives the admin a held-back
save, a deliberate Publish action (per page and site-wide), a visible pending state, and a discard.

## Requirements (settled with Geoff 2026-06-10)

- Saving stores the edit without changing the live site. A deliberate Publish pushes it live.
- Publish works per page and as a site-wide "publish all pending".
- Revert means discarding pending edits back to the live version. Rolling a published page back to
  an earlier version is out of scope (a future version-history initiative).
- The editor's built-in live preview is the preview. No staged-site deployment.
- Only page and post content edits are held. Deletes, renames, and nav/site-config changes stay
  immediate, as today.
- This becomes the one behavior. There is no `publish_mode` knob; a mode would double the test
  surface forever for two consumer sites that both want the workflow.
- The existing `draft:` frontmatter flag keeps its mechanics and is re-presented as **Hidden**.
  Removing it requires a content migration on both production sites (existing `draft: true` entries
  would otherwise go live silently) and is deferred to its own pass.

## The analog

Sveltia CMS, cairn's closest analog, has not built this yet; its editorial-workflow doc is marked
unimplemented, and its community works around the gap with a hand-merged drafts branch. The proven
mechanism is Decap CMS's `editorial_workflow`: one branch per pending entry (`cms/<collection>/<slug>`)
plus a PR, where publish merges the PR and discard deletes the branch. The load-bearing idea is the
per-entry branch, which makes every operation we need a natural git operation. Decap's pain points
(branch litter, status metadata smeared across PR labels) come from needing PRs as a status store
and a review UI. cairn owns its whole pipeline and needs neither, so the design takes the branch
model and drops the PRs.

## Locked architecture: one branch per pending entry

A pending entry lives on `cairn/<conceptKey>/<id>`, for example `cairn/posts/2026-06-10-summer-race`.
Entry ids are filename-safe slugs, unique per concept, so the name is a valid ref with no escaping.
The branch is the only state. There is no D1 row and no metadata file; an entry is pending exactly
when its ref exists. That makes the system self-healing by construction: delete a branch by hand in
GitHub and cairn sees nothing pending, with no orphaned record to reconcile.

The four operations:

- **Save** creates the branch from `main`'s current head if it does not exist, then runs the
  existing atomic commit pipeline against it (author = editor, committer = the App, manifest
  updated on the branch by the unchanged save path). The live site never changes and no deploy
  fires. *Plan-time reconciliation: branches carry no manifest copy; a save commits only the entry
  file, and publish performs the manifest upsert on `main`.*
- **Publish** reads the entry's file from its branch, commits it to `main` through the same pipeline
  as one "Publish <title>" commit authored by the editor (content plus recomputed manifest entry),
  then deletes the branch. This is a content copy, never a git merge, so it cannot conflict no
  matter how far `main` has advanced since the branch was cut. The deploy fires here and only here.
- **Publish all** is the same copy for every pending entry in one atomic multi-file commit on
  `main`, then deletes every consumed branch. One deploy ships the batch.
- **Discard** deletes the branch. For an entry that exists on `main` this restores the live version
  in the admin; for a never-published entry it removes the entry entirely.

Because publish copies content rather than merging, branch base staleness is irrelevant. A branch
cut from an old `main` head publishes exactly what the editor last saved, which is exactly what the
in-editor preview showed them.

The GitHub App needs no new permissions. Branch create, delete, and prefix listing are all Git Data
API operations under the existing contents permission. No PRs are created.

### Conflict model

Saves keep the existing behavior, now scoped per branch: the atomic commit retries when the ref
moves mid-commit and surfaces `CommitConflictError` (the reload-and-reapply page) when the race
persists. Two editors on different entries can no longer race each other at all, since each entry
has its own ref. Two editors on the same entry remain last-writer-wins, as today.

A site developer pushing directly to `main` on a file with pending edits makes publish
last-write-wins for that file. This is documented, not mitigated. Every editor write flows through
cairn, so the case only arises when the developer intervenes, and the pending branch sits in plain
sight in their GitHub repo.

## Editor model

One status vocabulary replaces the current Draft/Published badge pair. **Published** means the entry
on `main` is live with nothing pending. **Edited** means a published entry has held-back changes.
**New** means the entry exists only on its branch and has never been published. **Hidden** is the
`draft: true` frontmatter flag under its honest post-workflow name; it renders as a second,
independent badge, since an entry can be Hidden and Edited at once.

In the edit page, Save stores the edit and the page gains a visible pending state. Publish ships
the entry. Discard changes sits behind a confirm dialog (reusing the existing dialog pattern) whose
copy distinguishes the two cases: restoring the live version for an Edited entry, deleting the
entry outright for a New one.

In the concept list, each row carries its status badge. Publish all is site-wide, not per concept:
it lives in the admin topbar with a pending count, visible from any admin page (the authed layout
load counts pending refs with one `cairn/` prefix call), and its confirm dialog names the entries
it will ship, grouped by concept. Creating an entry commits to its branch only, so a new entry is
born New and invisible to the site until its first publish, which also makes the `draft` checkbox
redundant for that case without touching it.

## Structural ops against a pending branch

Per the scope decision, deletes, renames, and nav edits stay immediate on `main`. Where they meet a
pending branch:

- **Delete** also deletes the entry's pending branch. The existing confirm dialog gains a line
  saying unpublished edits are discarded with the page.
- **Rename** is refused while the entry has pending edits, with a message to publish or discard
  first. Renames are rare and deliberate, and carrying a branch across an id change buys complexity
  for nothing.

## Data flow in the admin

The list load merges two sources. Entries on `main` load as today, and one matching-refs call per
concept (`git/matching-refs/heads/cairn/<conceptKey>/`) marks which of them are Edited. Ids whose
ref exists but whose file is absent from `main` are the New rows; their title and date come from
reading the file off the branch, one read per pending-only entry. Pending counts are small (a
handful of in-flight drafts, not the whole site), so the extra reads stay proportionate.

The edit-page load checks the entry's branch first and falls back to `main`, so the editor always
sees their pending version, and the in-editor preview renders pending content with no extra work.

## Observability

Three events join the log vocabulary, through the existing internal logger:

- `entry.published` with `editor`, `concept`, `id`, and `batch: true` when part of a publish-all.
- `entry.discarded` with `editor`, `concept`, `id`.
- `publish.failed` with the same `reason`/`error` shape as `commit.failed`.

Saves continue to emit `commit.succeeded`/`commit.failed`; those records gain a `branch` field so a
held save and a publish are distinguishable in Workers Logs. The reference table
(`docs/reference/log-events.md`) updates in the same pass.

## Units

- `src/lib/github/branches.ts` (new): `createBranch(repo, name, fromSha)`, `deleteBranch(repo,
  name)`, `listBranches(repo, prefix)` over the Git Data API (`POST git/refs`, `DELETE
  git/refs/heads/...`, `GET git/matching-refs/heads/...`). Pure transport, mirroring `repo.ts`.
- `src/lib/content/pending.ts` (new): the branch-name codec, `pendingBranch(conceptKey, id)` and
  `parsePendingBranch(ref)`. Pure functions, no I/O.
- `src/lib/sveltekit/content-routes.ts` (extend): the save and create actions target the entry's
  branch (creating it on first save); `editPageLoad` and the list load read branch-first as above;
  new `publishAction`, `publishAllAction`, and `discardAction` wired through `composeRuntime` like
  the existing actions; the delete action removes the branch alongside the file; the rename action
  refuses while a branch exists.
- `src/lib/components/EditPage.svelte`, `ConceptList.svelte`, and `AdminLayout.svelte` (extend):
  the status badges, the Publish and Discard controls, the topbar Publish all action with its
  pending count, and the confirm dialogs, all under the admin design system.
- The fake-github test double (extend): ref create/delete/list support, the main test-infrastructure
  item, prerequisite to every integration test below.

`repo.ts` itself needs no change; every read and write is already pinned to `RepoRef.branch`, so the
workflow passes a branch-substituted `RepoRef` through the existing functions.

## Testing

Unit tests cover the branch-name codec and the `branches.ts` transport against the extended double.
Integration tests (the existing workerd suite) cover save-creates-branch, save-to-existing-branch,
publish, publish-all, discard for both Edited and New, delete-with-pending, rename-refused, and the
conflict path on a branch save. Component tests pin the badges, the controls, the confirm copy, and
the Publish all visibility rule. The showcase golden-path E2E extends to save, see pending, publish,
see live. The full gate (`npm run check` 0/0, `npm test` exit 0, the three docs gates) clears after
every task, as always.

## Docs dimension

The editor-facing flow gets a guide (save, publish, discard, what the badges mean). Both the
architecture explanation and the security model gain the branch model and its trust boundary (the
App writes only under `cairn/` refs and the content directories on `main`). In the upgrade guide
the entry is behavioral: saves no longer deploy, publish does, and no consumer code change is
required since the actions wire through `composeRuntime`. Reference pages update for any changed
public export surface. *Plan-time reconciliation: consumer shims enumerate named actions, so they
must add `publish`/`discard` to the edit shim and `publishAll` to the list shim.*

## Versioning and sequencing

One minor bump, additive in API but behavioral for editors, with the upgrade-guide note above. The
initiative enters the queued backlog behind the resequenced engine order in `docs/STATUS.md`
(diagnostics Pass 2 and 3, the gates-and-tooling pass, the gallery initiative, P4); where it slots
relative to the gallery and P4 is Geoff's call at queue time. The plan will likely split it on
verification surface, the engine workflow (branches, actions, double) before the admin UI, but that
is the plan's decision.

## Deferred

- Published-version rollback (browse a page's git history, restore a version).
- Deploy-status surfacing (saved, building, live) after a publish.
- A staged-site preview deployment.
- Removing the `draft:` flag, with its content migration on both production sites.
