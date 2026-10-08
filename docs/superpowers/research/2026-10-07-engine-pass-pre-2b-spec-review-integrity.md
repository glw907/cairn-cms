# Engine pass before stage 2b: spec review, data integrity and failure risk

Lens: data integrity and failure risk. Target:
`docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md` at `32fd9b1c` (cited as
`spec:<line>`). Code read at `draft-docs-2a` (cited by path and line). Rulings read from
`2026-10-07-engine-pass-pre-2b-rulings.md`. Consumer wiring was checked read-only in the five
site repos at `HEAD`.

Only gaps that affect correctness or the stated requirements are flagged. Findings rank by
consequence within each severity.

Counts: 1 blocker, 10 major (3 of them owner forks), 6 minor, 2 over-ceremony.

## Blocker

### I-1. The D1 fix never reaches an existing site's delete gate

- **Location:** `spec:342-350` (D1), against `src/lib/media/usage.ts:83-94`,
  `src/lib/content/manifest.ts:88-112` and `:311-328`.
- **Defect.** The safe-delete gate's published side does not re-extract anything. It reads the
  `mediaRefs` stored in the committed content manifest (`index.json`). Fixing `extractMediaRefs`
  changes only what future saves and regenerations write. Every existing manifest keeps its old
  rows. `verifyManifest` then hides the gap. A gallery-only entry has no `mediaRefs` key, because
  `manifestEntryFromFile` omits the key when the list is empty (`manifest.ts:88-112`). The build's
  additive-field normalization drops the built `mediaRefs` whenever the committed entry lacks the
  key (`:325-328`), so the build passes and the stale row stands.
- **Failure scenario.** A site upgrades with a gallery-only asset. Its build stays green. The
  Library still reads the asset as unreferenced, so the delete skips the typed-slug confirm and
  removes bytes in use. The data-loss defect D1 exists to fix survives on every site until someone
  happens to regenerate. Mixed entries (a hero and a gallery image) fail the other way. Their
  committed `mediaRefs` key exists, so the new nested ref reads as drift. The deploy build then
  fails with "content manifest is stale", a break that `spec:350` lists as "Surface: none".
- **Fold.**
  - Add `Consumers must: regenerate the content manifest (npx cairn-manifest) and commit it.`
  - The D1 task regenerates the showcase's committed manifest (and the template's, if it carries
    nested images).
  - Make the stale case loud. Narrow the `mediaRefs` drop in `verifyManifest` to a manifest that
    predates the field entirely (no committed entry carries `mediaRefs`). A post-field manifest
    then compares exactly, so a gallery-only entry fails the build with the regenerate message
    instead of passing silently.
  - Acceptance adds a test: a committed manifest with a gallery-only entry and no `mediaRefs` key
    fails `verifyManifest`.

## Major

### I-2. C11 leaves the publish path as an unguarded whole-file writer of `media.json`

- **Location:** `spec:333-341` (C11), against
  `src/lib/sveltekit/content-routes-entry-write.ts:215-231,347-381`, and decision 1 of
  `docs/superpowers/specs/2026-06-15-cairn-media-2a-ingest-delivery-design.md:162-168`.
- **Defect.** Publish commits a `media.json` snapshot read from main at save time. It commits the
  snapshot to main through the head-merge retry, with no `expectedHead`, and it never re-reads or
  re-merges on retry (`entry-write.ts:347-354`). The 2a media design ruled this exact shape out: "A
  whole-file overwrite of a shared mutable `media.json` through `commitFiles` would
  last-writer-wins and silently drop a concurrent row, so it must never ship; if a global-on-main
  copy is ever required, the merge moves inside the `commitFiles` retry loop." The publish commit
  also carries a whole `index.json` the same way.
- **Failure scenario.** An editor saves with a new upload, and the publish reads main's
  `media.json`. A head-guarded Library delete (post-C11) commits. The publish then lands its stale
  snapshot on the new head, so the deleted row returns. That row points at bytes the delete just
  removed, which breaks delivery. A Library upload in the same window loses its row the same way.
  After C11, the five media paths are safe against each other and still unsafe against the most
  frequent writer of main. The same retry can also drop another publish's `index.json` row. The
  build regenerates and catches that, but the delete gate reads the stale committed rows in the
  meantime.
- **Fold.** Bring publish's `media.json` and `index.json` writes under the 2a design's own named
  fix. On retry, re-read both files at the new head and re-apply this publish's records and its
  manifest row, merging by hash and key. A fail-closed `expectedHead` is the wrong tool for
  publish, because publish moves main constantly and would 409 on any concurrent commit. If the
  pass declines this, the spec should record the residual and narrow C11's claim from "lost or
  resurrected manifest rows" to the five Library paths. Acceptance: a race test where a Library
  delete lands between a publish's read and its commit, and the row stays deleted.

### I-3. C11 misdescribes two of its five paths, and leaves the head read unordered

- **Location:** `spec:333-341`, against `content-routes-media-metadata.ts:298-400`
  (replace) and `:495-552` (alt propagation), `content-routes-media-ingest.ts:235-239`, and
  `content-routes-media-delete.ts:106-114`.
- **Defect.**
  - Replace and alt propagation are not `media.json` writers only. Both rewrite published entry
    files on main from markdown read earlier. Alt propagation writes no `media.json` at all
    (`:489-493`). Both answer a conflict with `CONTENT_CONFLICT_MESSAGE`, not
    `MANIFEST_CONFLICT_MESSAGE`.
  - The spec says "read the head and pass `expectedHead`" but never says when. The codebase's
    rule, stated at every guarded write (`ingest.ts:235-237`, `content-routes-settings.ts:290`,
    `nav-routes.ts:146`), is to read the head before the content the commit derives from. A head
    read placed just before `commit` lets the guard pass over stale content.
- **Failure scenario.** An alt propagation plans from entry text E0. A concurrent publish of the
  same entry lands E1, with new prose. Today the retry commits E0 plus the alt onto E1's head, so
  the published prose silently reverts. That loss of published writing is the worst outcome on
  C11's list, and the spec frames it as a manifest-row problem. A head read placed after the
  usage-index build (the slow part of delete and replace) reproduces the same race under a guard
  that looks correct.
- **Fold.**
  - State that each of the five paths reads `branchHead` before its first read of `media.json`,
    the content manifest, or any entry file.
  - Name the conflict message per path.
  - Note that the guard also closes the published-reference half of the stale-read window that
    the delete docstring describes (`delete.ts:110-114`), and update that comment.
  - Acceptance: the replace and alt race tests inject a concurrent publish of a rewritten entry,
    and the entry's new prose survives.

### I-4. D1's "one level" misses `array(object({ image }))`, and the rewrite misses `- src:`

- **Location:** `spec:342-350`, against `src/lib/content/fieldset.ts:380-416` and
  `src/lib/content/media-rewrite.ts:126-155`.
- **Defect.** `checkContainerNesting` allows four image shapes: top-level, inside an `object`,
  `array(image())`, and an image leaf inside an `array(object(...))` row (`fieldset.ts:407-410`).
  The last shape is a common one, such as team members with a photo. Its value sits two steps
  down (array index, then key). "Descend one level into `array` and `object` fields" is ambiguous
  for it, and the acceptance tests only "a gallery asset". Separately, the rewrite's `src:`
  locator is `/^(\s*)src:[ \t]?/` (`media-rewrite.ts:132`). That pattern never matches a
  block-sequence item line (`  - src: media:...`), which is exactly how `array(image())`
  serializes.
- **Failure scenario.** An asset used only in an `array(object({ photo: image() }))` row still
  reads as an orphan, so safe-delete removes it while in use. A replace on a gallery asset reports
  N affected entries and leaves the `- src:` lines unrewritten.
- **Fold.** Enumerate the four shapes in D1's outcome. Acceptance runs where-used, safe-delete,
  bulk delete, and replace over each shape, including the `- src:` sequence form and an asset
  that appears twice in one array (`findSrcLineInRange` returns only the first hit, `:126-155`).

### I-5. Widening `imageFieldKeys` reaches alt propagation and can corrupt published YAML

- **Location:** `spec:347-348` ("both readers descend"), against `media-rewrite.ts:164-175` and
  `:444-487`.
- **Defect.** `imageFieldKeys` is one of the two readers D1 widens. It is shared with
  `heroAltEdits`, the alt-propagation arm. That arm finds the `alt:` sibling at the `src:` line's
  captured indent and otherwise inserts `\n<indent>alt: "..."` after the `src:` line
  (`:472-483`). For a sequence item (`  - src:`), the item's keys sit at the indent plus two
  spaces. A naive widening either finds no sibling and inserts at the wrong indent, or edits the
  first item's `alt:` for every occurrence.
- **Failure scenario.** An owner runs "propagate alt" on an asset used in galleries. The engine
  splices a mis-indented `alt:` into several published entries in one atomic commit to main. The
  frontmatter becomes invalid or semantically wrong YAML, and the next deploy build fails, or the
  site renders the wrong alt. `dropOverlappingEdits` (`:65-72`) prevents overlapping splices, not
  malformed ones.
- **Fold.** Make D1 name alt propagation's nested behavior. Either it reports nested placements
  and never splices them (the lean choice, since alt fill is optional), or it implements and tests
  the sequence form. Add one invariant to both rewrite arms: re-parse the rewritten frontmatter,
  and skip the entry (reporting it) unless only the targeted values changed.

### I-6. A6's `use:enhance` breaks the edit page's submit state, so a failed save can still lose the writing

- **Location:** `spec:321-329` (A6), against `src/lib/admin/EditPage.svelte:158-185,190-192,256-277,1040-1062`.
- **Defect.** The page's state machine assumes every submit ends in a full document load. The
  submit handler flips `saving` or `publishing` (`:163-166`). The only reset is the entry-hop
  block (`:1041-1062`), which runs only when `entryKey` changes. The leave guard is suppressed
  while `busy` (`:266`, `:269`, `:277`). Under enhance, a `failure` result renders in place, and
  none of that state resets.
- **Failure scenario.** A save fails on a GitHub error. The calm message shows, and the text is
  intact, as A6 promises. But Save and Publish stay disabled ("Saving…"), so the editor cannot
  retry. With `busy` still true, the leave guard no longer fires, so the editor navigates away
  and loses the writing with no prompt, the outcome A6 set out to prevent. On a successful
  same-entry save, the redirect reuses the component: `fieldsDirty` stays true, so the page reads
  "Unsaved changes" after a save, and `uploadedRecords` carries into the next save.
- **Fold.** The enhance callback resets `saving` and `publishing` on every result. A `redirect`
  result keeps today's semantics with a full document navigation, or runs the same reset block.
  Only `failure` is applied in place. Acceptance adds two checks: after a failed save the Save
  button is enabled and a retry succeeds, and after a failed save the leave guard prompts.

### I-7. The dev overlay's read-through needs tombstones, branch read-through, and a shadowing rule

- **Location:** `spec:235-248` (ruling 5), against
  `packages/cairn-cms-dev/src/fake-github.ts:42-48,711-822`.
- **Defect.** "`readFile` and `readEntries` answer the overlay first, then the file on disk"
  leaves four integrity holes.
  - **Deletes.** The fake deletes by removing the path from its map (`:768-769`). A removed path
    falls through to disk, so a deleted or renamed entry reappears. Deletes need tombstones.
  - **Branches.** `createBranch` copies the source branch's map (`:812`). In repository mode,
    main's map is the sparse overlay, so a new `cairn/*` branch holds only overlay files. Every
    other file read on the branch returns null. Branch reads must fall through the same way.
  - **The module-level seed.** It writes `src/content/posts/2026-06-hello.md` into main at import
    (`:42-47`), outside the seed functions that repository mode skips. A phantom post then shows
    in the site's real list.
  - **Shadowing.** After a dev-admin save, the overlay copy shadows that file for the rest of the
    process. A later disk edit to the same file no longer shows, which contradicts the acceptance
    line "a disk edit shows without a restart" (`spec:250-251`) unless the spec scopes it.
- **Failure scenario.** A developer deletes a test post in the dev admin, and it is still listed.
  Then they open a draft, and its preview reads null for files it never touched. Then they edit a
  post on disk after saving it once in the dev admin, and the dev admin keeps showing the old
  text. None of this reaches disk, but it makes the dev backend untrustworthy as a view of the
  real content, which is what ruling 5 asks for.
- **Fold.** Specify tombstones for deletes and renames. Branches read their own overlay, then
  disk (or snapshot main's merged view at creation). The static seed moves into the fixtures arm.
  State the shadowing rule: an overlay entry wins until restart. Acceptance adds delete, rename,
  and create-branch-then-read cases against the temp directory.

### I-8. OWNER FORK: Rulings for Geoff, item 1, where a dev-admin save lands

- **Location:** `spec:451-457`, `spec:238-241`.
- **Integrity evidence for the fork.** The in-memory reading is the safer one, for three reasons
  beyond the spec's own.
  - The fake R2 starts empty, so in repository mode the Library's reconcile shows every real asset
    as a broken reference. Under disk writes, cleaning up those "broken" rows writes a real
    `media.json` without them. The developer then commits it, and production loses the rows for
    live assets.
  - A cairn commit touches several files at once (entry, `index.json`, `media.json`). A
    filesystem write of that set is not atomic, so a crash between files leaves a manifest that
    fails the next build.
  - Disk writes race the developer's editor and any manifest regeneration the Vite plugin runs.
- **The in-memory reading's own risk.** Today the dev admin shows fixtures, so nobody writes real
  prose there. After ruling 5 it shows the site's real content and invites real writing, and a
  restart silently discards that writing. That is the same loss class A6 fixes, moved to dev.
  Nothing in the admin says saves are held in memory (no banner exists in `src/lib/admin/`).
- **Options.**
  1. In-memory, plus a persistent dev-admin notice that edits are held in memory and discarded
     when the dev server stops. **Recommended.**
  2. In-memory with no notice, as drafted.
  3. Disk writes for publishes, the alternative reading.

### I-9. OWNER FORK: the anonymous live mint is bounded per isolate, never per fleet

- **Location:** `spec:200-204`.
- **Defect.** "At most one mint per isolate per minute" bounds one isolate. Cloudflare runs many
  isolates across many locations, so a distributed burst of `/healthz?live=1` scales the mint
  count with the attacker's spread. I have not verified GitHub's exact ceiling for
  installation-token creation. Its secondary rate limits do throttle bursts of App-authenticated
  writes, though. A throttled App cannot mint the tokens real commits need when a cold isolate's
  cache is empty.
- **Failure scenario.** An anonymous caller triggers live mints from many locations. GitHub
  throttles the App, and editors' saves and publishes fail as `github.unreachable` until the
  throttle lifts. Nothing is lost, because the branch holds the save. Publishing still stops,
  triggered by a public URL.
- **Options.**
  1. Live mode requires a signed-in owner session. The rotation page's reader is the owner, and
     no new secret is needed. **Recommended.**
  2. Live mode requires a shared secret (`?live=<token>` against a Worker secret), which keeps it
     usable from an uptime monitor.
  3. Keep it public with the per-isolate cache, as drafted, and state the residual as fleet-wide.

### I-10. OWNER FORK, reinforcing Rulings for Geoff item 2: the live check alone can license an outage

- **Location:** `spec:211-218`, `spec:458-462`.
- **Defect.** After `wrangler secret put`, a new Worker version rolls out while old-version
  isolates may still serve. A live `ok` can come from an isolate that still holds the old key,
  which GitHub accepts until it is deleted. The spec already names the wrong-target case; the
  rollout window is a second route to the same false `ok`.
- **Failure scenario.** The operator reads `ok` and deletes the old key on GitHub. The deployed
  key is then the old one (wrong target), or the new one is not yet everywhere. Publishing stops,
  and the deleted key cannot be restored.
- **Options.** 1. Add the fingerprint, and make "the fingerprint matches the new key" the gate
  before deletion. **Recommended.** 2. Decline it, in which case the rotation page must not
  present a live `ok` as permission to delete the old key.

### I-11. The lead must make `runtime` required, or the split it removes survives

- **Location:** `spec:75-79`, `spec:136-137`, `spec:138-141`, against
  `src/lib/sveltekit/guard.ts:172-174`.
- **Defect.** `createAuthGuard(config: AuthGuardConfig = {})` defaults `roles` to
  `DEFAULT_ROLES` (`guard.ts:174`). The spec never says `runtime` becomes required. Its doctor
  acceptance ("keeps failing on a bare `createAuthGuard()` with custom roles declared") implies a
  bare call stays legal. A bare guard is then still a second reader, with the default declaration,
  beside an adapter that declares custom roles and access. Three of the five consumer sites call
  it bare (`ecxc-ski`, `907-life`, `cairn-pub`, all `src/hooks.server.ts:7`).
- **Failure scenario.** A site later adds roles and access on the adapter and keeps its bare
  guard. Custom-role editors resolve against the default vocabulary, and the guard attaches `{}`.
  The site's own screens then lock out its own editors, the bug class the decision says
  "disappears". It fails closed, so no data leaks, but the claim is false.
- **Fold.** Make `runtime` required on all three factories, so a bare call fails to compile. The
  `Consumers must:` line covers bare calls, not only `{ roles, access }` calls. The doctor's
  bare-call branch remains for older engines.

## Minor

### I-12. The dictionary path's batch reasoning is wrong; fold it into C11

- **Location:** `spec:658`, against `src/lib/sveltekit/content-routes-dictionary.ts:56-73,83-87`.
- **Defect.** `mergeAndCommitDictionary` passes no `expectedHead`. So `commitFiles` silently
  re-parents the precomputed file over the new head (`repo.ts:295-301`), and the action's own
  conflict-and-re-merge branch (`:133-149`) never fires. The docstring's "SHA-guarded" claim is
  false. "Sorted, idempotent file" does not help, because the retry re-parents a whole file and
  never re-merges.
- **Failure scenario.** Two editors add different words concurrently. One word is dropped, while
  its editor's client was told it committed and cleared it from the pending set. The cost is low:
  a lost dictionary word.
- **Fold.** Read the head before `readFile`, and pass it. The existing retry loop was written for
  exactly this. That is one argument in C11's task, which costs less than a batch entry and a
  later triage.

### I-13. A3's named remediation must cover every role write, and warn about the rebuild

- **Location:** `spec:279-286`, against `src/lib/auth/store.ts:263-273,468,506-509,544` and
  `migrations/0001_roles.sql`.
- **Defect.** The `CHECK` constraint also fires on `setEditorRole` and the demote path
  (`UPDATE editor SET role = ?`, `:506-509`, `:544`), not only on the first add. On an existing
  database, `0001_roles.sql` rebuilds `editor` with an explicit four-column copy, so any column a
  site added to `editor` is dropped. Out-of-order application itself is safe. Wrangler applies an
  unapplied `0001` after `0003` and `0004`, neither of which touches `editor`, and the copy keeps
  every row.
- **Fold.** Route all role-writing statements through the named failure. The remediation message
  says the rebuild copies only the engine's four columns.

### I-14. B5's 503 turns a non-GitHub backend into a permanent outage signal

- **Location:** `spec:206-209`, `spec:381-383`, against `src/lib/sveltekit/health.ts:16-31`.
- **Defect.** The comment says a non-GitHub backend "skips the signing check". The code instead
  returns `ok: false` with "GITHUB_APP_PRIVATE_KEY_B64 is not configured" for any provider whose
  `kind` is not `github-app`. `BackendProvider.kind` is a public open string (`backend.ts:78-85`).
  After B5, such a site's `/healthz` answers 503 forever.
- **Fold.** A skipped check counts as passing, and the 503 maps only from an applicable check that
  failed. Add a test for a non-GitHub provider.

### I-15. Name the workerd detection for `'repository'`

- **Location:** `spec:241-243`.
- **Defect.** "Under workerd, the handle throws at construction." With `nodejs_compat` at a recent
  compatibility date, workerd provides a virtual `node:fs`. To my knowledge that holds since late
  2025, but verify it. A detection that relies on the import failing would then read an empty
  virtual tree and show no content instead of throwing.
- **Fold.** Name a positive runtime check (for example, `navigator.userAgent ===
  'Cloudflare-Workers'`), and test the throw.

### I-16. The hooks import widens a composition failure, and the build is the safety net

- **Location:** `spec:97-100`, against `templates/waymark/src/chassis/cairn.server.ts` and
  `templates/waymark/src/hooks.server.ts`.
- **Defect.** Importing `cairn.server.ts` from hooks runs `composeRuntime` and
  `createCairnAdmin` in every isolate for every route. Today only the routes that import it run
  them. A13 and A14 add composition throws, and a throw in hooks fails every dynamic route,
  public ones included. The claim "adds no new cold-start work" undercounts. The prerender
  imports hooks, so a composition throw should fail the build before deploy.
- **Fold.** Correct the claim, and add one acceptance line: a composition throw fails
  `vite build`.

### I-17. The lead's `Consumers must:` line should cover two differing declarations

- **Location:** `spec:138-141`, `spec:551-553`.
- **Defect.** The line handles `roles` and `access` that lived "only in the hooks". A site that
  declared both, with different maps, now has the adapter's map governing `requireAccess` and
  `createSectionAction`. That can loosen a write gate with no signal. Both production sites with
  access maps pass one object to both places (`aksailingclub-org`, `xcathletes-org`), so today's
  exposure is nil.
- **Fold.** Extend the line with "if they differed, reconcile them; the adapter's now governs
  every reader".

## Over-ceremony

### O-1. Keying the live-verdict cache by a hash of the key secret (low cost)

- **Location:** `spec:200-203`.
- An isolate's `env` is fixed for its lifetime, because a secret change deploys a new version
  with new isolates. A plain per-isolate time-to-live therefore never reads a stale verdict
  across a key change. The key hash adds a digest per request and a test case that guards nothing.
  Drop it, unless I-9's option 3 stands and the hash serves another purpose.

### O-2. Batching the dictionary path (C11b)

- **Location:** `spec:658`.
- Covered under I-12. The fix is one argument inside a task that already touches the same
  pattern, so a batch entry and a later pass cost more than the fold.

## Checked with no finding

- **The signups demo's removal (ruling 2).** Removal applies to new scaffolds only. An existing
  scaffold keeps its route, its `APP_DB` binding, and that database's rows, and nothing in the
  pass deletes or migrates them. The dev package keeps `fake-app-db.ts`, so an existing site's
  screen still runs under `npm run dev`.
- **The audit log.** No item changes `0002_audit.sql`, the sink, or what writes to it. A1 changes
  which `none`-role requests are admitted, not whether a refusal is audited.
- **The live check's token handling.** The mint bypasses the shared cache (`signing.ts:121`), and
  the minted token is never returned or logged.
