# Task 12 carry from S3 (Tasks 8, 9, 10), engine pass pre-2b A

Source: s3-run.json `.result.tasks`. Verbatim from the record; nothing here is filed. All three reviewer verdicts: accept.

## Task 8 (edit form on use:enhance; commit 666aff41)

**Consumers must / may**
- Consumers must: none. Consumers may: a site that overrode or wrapped the edit form's onsubmit handler or relied on a failed save re-running the entry load can now read the failure from the page's form prop; a failed save or publish no longer replaces the page.

**2a extend pages falsified (not edited)**
- `docs/extend/rotate-the-github-app-key.md` lines 115 and 127 say a failed key "ends each attempt to open or publish an entry on an error page with status 500". With JavaScript, a failed publish now stays in the editor; opening an entry still ends on the error page. Falsifies f:ogokfy. Needs a with/without-JavaScript distinction.

**Fact ids edited or minted**
- New: f:tqafd9 (editors.md). Narrowed: f:772sb6 ("a page rendered without JavaScript"). Rewritten: f:ogokfy (extend.md). Three anchored EditPage.svelte line pointers repaired (extend.md:118, extend.md:654, reference.md:1202). The 2130 and 1401 pointers were already stale before the task.

**User-facing copy chosen by the implementer (verbatim)**
- Calm notice: "That did not go through. Your text is still here; try again." Shown in an alert-warning strip and sent to the assertive live region. Shows for any failure the server did not word (an error result, a non-JSON answer, a failure with no error text or broken links). A failure that carries error text shows that text through the existing formError alert instead.
- The summary also quotes "Something went wrong and your changes were not saved..." as what a failed publish shows in the editor (existing server message, not new copy).
- Existing note strings the task touches: "Saved. Note:" (the ?drafts= and ?refs= banners, blanked on in-place failure).

**Reviewer nonBlocking**
- `src/lib/admin/EditPage.svelte:173-185`: landsOnThisConcept corrects a wrong plan premise (the guard's login redirect arrives as a redirect result, not an error result; kit respond.js:458, forms/client.js:215-217). Only the component stand-in covers it; no e2e forges /admin/login. Conductor should record that the plan wording was corrected.
- `examples/showcase/e2e/edit-save-failure.spec.ts:78-107`: in the 500 case the server's error text shows through formError, not the calm notice; the calm notice is proven by the abort and non-JSON cases and a component test.
- `src/lib/admin/EditPage.svelte:199-207`: saving is cleared before location.assign, so Save re-enables briefly during the document load; a second click could POST again.
- `examples/showcase/e2e/edit-save-failure.spec.ts:236`: ordering assertion relies on a fixed waitForTimeout(1000).

## Task 9 (head guard on media and dictionary; commit df8857d9)

**Consumers must / may**
- Consumers must: none. Consumers may: none.
- Draft CHANGELOG line: "Media delete, bulk delete, metadata update, replace and alt propagation, and the personal-dictionary add now fail closed when the default branch moves between the read and the commit: the editor sees the existing reload-and-retry message and no stale file is committed. The dictionary add re-reads and retries once after such a conflict."

**2a extend pages falsified (not edited)**
- `docs/extend/architecture.md`, "Concurrent writes" (about lines 123-129; the review puts the stale phrase at 125-126, "the media delete and metadata commits"). Falsifies f:0gihxq. Media delete (single and bulk), metadata update, replace, alt, and the dictionary add now belong in the head-guard bullet. "The retry makes three further attempts against the moved head" stays true for paths that keep the retry.
- f:0gihxq is also cited by internal files the conductor may repoint: `docs/internal/briefs/extend/architecture.plan.md`, `architecture.json`, `scaffolded-site-files.framing.md`, `outlines/extend.json`.

**Fact ids edited or minted**
- f:0gihxq rewritten, id kept (now lists delete, bulk delete, metadata update, replace, alt propagation, and the dictionary add as head-guarded).

**Reviewer nonBlocking**
- `src/tests/unit/content-routes-dictionary.test.ts:236`: the null-head test checks only status 409 and no commit, not the dictionary's own conflict message or dictionary.add_conflict.
- `src/lib/sveltekit/content-routes-dictionary.ts:178`: describe names and the action docstring still say "SHA-guarded retry" beside the new "head-guarded" wording (cosmetic).

## Task 10 (head guard on publish and publish-all; commit a4618437)

**Consumers must / may**
- Consumers may: expect publish and publish-all to answer a conflict when another commit lands on the default branch (a Library delete, another publish, a dictionary add) while the action is reading its snapshots. The entry stays held on its branch and publishing again succeeds; no merge happens inside a retry. A default branch with no readable head refuses to publish rather than committing unguarded. No signature or option change; no `Consumers must:` line.

**2a extend pages falsified (not edited)**
- `docs/extend/architecture.md` line 123 ("The save and publish commits handle a moved head with a head-merge retry") and line 125 ("The head-merge retry covers entry save, single publish, publish-all, entry delete and rename, and the media delete and metadata commits"). Both tied to f:0gihxq. Line 165 (a commit without expectedHead keeps the retry, f:025q6u) stays true.

**Fact ids edited or minted**
- f:0gihxq (single publish and publish-all moved to the head-guarded list, head-read order stated); f:0oyrh6 and f:0xxou5 re-pointed; one reference.md pointer re-pointed. Other stale line ranges into content-routes-entry-write.ts left alone.

**Reviewer nonBlocking**
- `src/lib/sveltekit/content-routes-entry-write.ts:393`: on a null default-branch head, single publish refuses only after saveToBranch has already committed to the entry's own branch, so "refuses without a commit" holds for main only. Consistent with the "Your edits are saved" copy; conductor may want to confirm.
- `src/tests/unit/content-routes-publish-head-guard.test.ts:213`: publish-all never commits media.json, so the index.json race test stands in for the "Library delete stays deleted" criterion.
- `src/lib/sveltekit/content-routes-entry-write.ts:393`: the null-head guard checks both null and undefined, so a caller that forgets guardMainHead=true refuses instead of committing unguarded (fails safe, no change).

## Task 12 hand-off summary
- Rewrite `docs/extend/rotate-the-github-app-key.md:115,127` (f:ogokfy).
- Rewrite `docs/extend/architecture.md:123-129` (f:0gihxq).
- Draft CHANGELOG lines above; none carries a Consumers must.
- Unfiled gap noted by Task 9: no gate compares the prose list on architecture.md to f:0gihxq, so the page went stale unnoticed.
