# Address-check scope: main-arm at edit-load (editor-help Pass 3 follow-up) design

A small follow-up to editor-help Pass 3. It narrows the cross-branch address-collision check so the
editor's hot path stops paying a per-open GitHub fan-out, while the decisive publish-time check stays
thorough. It resolves the MEDIUM-HIGH carry-forward the Pass 3 cloudflare review raised.

This supersedes one settled decision in
[`2026-06-23-cairn-advisory-validation-design.md`](2026-06-23-cairn-advisory-validation-design.md):
"The address check runs at edit-load, full cross-branch." Edit-load now runs the main arm only. The
publish-time re-check stays full cross-branch, so the rest of that spec stands.

## The problem

`editLoad` builds the address index on every editor open, including a read-only open. The build's branch
arm lists every open `cairn/*` branch and reads one file per branch, so the cost is `1 + N` GitHub reads
(one `listBranches`, then `N` `readRaw`) for `N` open drafts. Worse, it runs sequentially after the
edit-load stage-1 batch, which already issues about five concurrent reads and sits near workerd's
six-simultaneous-connection ceiling. The cloudflare review rated this MEDIUM-HIGH: the fan-out matches
the shipping usage-index pattern and fails open, so it is a follow-up rather than a blocker, but it is
real recurring cost on the most-trafficked admin path.

## The decision and why

**Edit-load runs the main arm only; publish keeps the full cross-branch check.**

A public address is occupied only on `main`. Publishing writes to `main`, so the consequential
collision, replacing what visitors see, is a main-arm fact: it is a reverse map over the content
manifest, which `editLoad` has already read, so it costs zero extra reads. A sibling draft on a
`cairn/*` branch does not occupy a public address yet; the branch arm only detects the speculative case
that two unpublished drafts will collide if both publish. That branch arm is the least-accurate signal
(its message says "already uses" when the other entry is also just a draft) and it is the entire source
of the cost.

Three things make the narrower edit-load check safe:

- **The build resolver is the hard backstop.** `src/lib/delivery/site-resolver.ts` throws at build when
  two entries resolve to the same permalink. A true collision can never silently ship; the deploy fails.
  The editor advisory is a courtesy that surfaces the problem earlier, not the guard that prevents a
  broken site.
- **Publish stays thorough.** The publish-time re-check keeps the full cross-branch build, so a
  concurrent two-draft collision is still caught at the decisive moment and still emits
  `publish.address_collision`.
- **It matches the ecosystem.** WordPress, headless CMSs, static site generators, and the git-based CMSs
  (Decap, Sveltia, Tina) all validate a slug or permalink against the published source, never against
  sibling unpublished drafts. The main-arm check is the industry norm; the branch arm at edit-load is a
  cairn-specific nicety no comparable tool offers.

## Architecture

Three units, scoped tight.

### Unit 1: extract the main arm as a pure function (`content/advisories.ts`)

Add `mainAddressIndex(manifest: Manifest): AddressIndex`, a synchronous reverse map over
`manifest.entries` (each carries its resolved `permalink`). It takes no backend or token and does no
I/O. Refactor `buildAddressIndex` to compose it: seed from `mainAddressIndex(manifest)`, then add the
branch arm exactly as today. `buildAddressIndex`'s signature and behavior are unchanged, so the publish
path and its tests are untouched. `addressCollision` is unchanged; it operates on any `AddressIndex` and
still excludes the self entry by `concept` and `id`.

### Unit 2: edit-load calls the pure arm (`sveltekit/content-routes.ts`)

In `editLoad`, replace `await buildAddressIndex(runtime.backend, token, runtime.concepts, manifest)` with
`mainAddressIndex(manifest)`. The advisory build is now pure local computation. The only remaining throw
is `entryIdentity` on a dated entry with no valid date, so the `try`/`catch` stays as a
degrade-to-no-advisory guard, but the `log.warn('github.unreachable', { scope: 'edit-advisories' })` line
is removed: no GitHub call remains at edit-load to be unreachable. A malformed-date entry degrades to no
advisory, the same outcome as before, without the misleading network log.

### Unit 3: the publish path is unchanged (`sveltekit/content-routes.ts`)

`publishAction` keeps `await buildAddressIndex(...)` (full cross-branch) and its `publish.address_collision`
event. Full detection stays at the decisive moment.

## Behavior change

At edit-load the advisory now fires only when a published entry already holds the address (the accurate
"you will replace what visitors see" case). A collision that exists only between two unpublished sibling
drafts is no longer surfaced while editing. It is still caught at publish by the full re-check, and as a
hard backstop by the build resolver. No public export changes and no consumer action: a patch bump.

## Error handling and degradation

- Edit-load: a malformed-date entry (one `entryIdentity` can not resolve) degrades to no advisory. There
  is no network read on this path, so no GitHub-failure mode and no `github.unreachable` log.
- Publish: unchanged. A thrown index build degrades to no event and the publish proceeds, logging
  `github.unreachable` under the `publish-advisories` scope.

## Testing

- **Unit** (`advisories.test.ts`): a new `mainAddressIndex` test (a main-only collision is found with no
  branch read), plus the existing `buildAddressIndex` full-union test and the `addressCollision` tests,
  unchanged.
- **Integration** (`editLoad`): the existing test, a collision with a published entry on `main`, stays
  green because that is a main-arm case. Confirm test-first that no existing test asserts a branch-only
  collision at edit-load or the removed `edit-advisories` log; adjust any that do, since that is the
  behavior this pass changes.
- **Integration** (`publishAction`): the `publish.address_collision` test is untouched.

## Documentation

- The `advisories.ts` module comment: "main arm at edit-load, full cross-branch at publish."
- `CHANGELOG.md` and `docs/guides/upgrade-cairn.md`: a per-version entry for the behavior change, stating
  no consumer action.
- `docs/reference/log-events.md`: drop the `edit-advisories` scope from the `github.unreachable` row if it
  is enumerated there; the `publish-advisories` scope stays.
- `docs/internal/docs-friction-log.md`: flip the Pass 3 fan-out carry-forward to resolved.

## Out of scope

- The publish-path branch arm. It stays; this pass narrows edit-load only.
- Live client-side recomputation of the collision as the author retypes the slug (deferred in the Pass 3
  spec, still deferred).
- Dropping the branch arm entirely (Option C from the brainstorm). It is the semantically cleanest end
  state, but it reverses more of the Pass 3 spec and removes a tested path; revisit only if the
  publish-path branch warning proves to be noise.
