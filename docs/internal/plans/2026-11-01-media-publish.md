# Media and publish pass: plan

Design: `docs/internal/plans/2026-11-01-media-publish-design.md`, approved by Geoff 2026-11-01. Initiative: none. Consultation: none open for this pass. Risk class: `ordinary`, no `live-account`. Base: `main` at `c85b1de0b` plus this plan branch. Facts below were read or probed at that commit.

Path estimate: **245 minutes** (design 200; ceiling 400). Task sum 380, which sets nothing. Expect about half the path, per the design's Estimate.

## Pre-flight

No step needs Geoff.

- [x] PR #170 merged (`c85b1de0b`).
- [x] `gh pr merge * --match-head-commit *` is in `permissions.allow`, and the launch prompt carries Geoff's merge word.
- Checked by the planner just before launch: the main checkout is on `main`, `git rev-list --count HEAD..origin/main` prints 0, and no process holds the executor's worktree path.

## What the planner settled

These are decided. A task does not reopen them.

- **Dev backend probe.** The showcase's dev backend can't reach a production build. `packages/cairn-cms-dev/src/repository-backend.ts:2-4` says "a commit writes only the overlay, so nothing reaches disk", and fixtures mode is in memory. So the end-to-end check takes the design's fallback, an integration test over the committed files (Task 4).
- **#31 reads no branch.** The build's throw (`src/lib/delivery/site-resolver.ts:104`) sees only routable, non-draft entries on main (`index.all()` drops drafts, and `:100` skips non-routable concepts). That filter applies to both sides of a collision: a draft or a fragment holds no address, and it can't lose one either. The check therefore runs over the manifest the publish already holds, the same way the link guard does. A pending branch elsewhere is no build fault, and its own publish meets this check later. With no branch read, Geoff's fail-open condition has nothing left to fail, and `buildAddressIndex` loses its only caller, so it goes. Record this in `## Decisions`.
- **#106 fails closed on a read failure.** A failed prior read that degraded to "no prior keys" would silently delete keys, which is the defect itself. This reverses the degrade at `content-routes-entry-write.ts:172-173` for the tag path too, since one read serves both. A parse failure only stays closed if `parseMarkdown` stops using gray-matter's cache: bare `matter(source)` stores the file before parsing, so a malformed file throws once in an isolate and then reads as `{}` with the whole file as the body. Passing options skips the cache (`node_modules/gray-matter/index.js:37`; probed, three parses of `matter(s, {})` all throw, and the unit suite stays green). So a malformed file now throws on every parse, where it used to throw once. Record in `## Decisions`.
- **#106 widens a bare YAML date.** Probed through gray-matter: `updated: 2026-01-01` round-trips as `updated: 2026-01-01T00:00:00.000Z`. The instant survives and the text changes. Accept it and record in `## Decisions`. Tests assert the value, not the bytes. `draft`, nested objects, and quoted strings round-trip exactly.
- **#137 covers rename too.** BACKLOG's sweep line says #141 "adds the delete and rename gaps". A rename that strands a pending include dangles at publish-all, which runs no save guard, so the rename gate is part of closing the item.
- **#48 uses the existing media-base context, with no `EditData` change.** `CairnAdminShell.svelte:87` already provides `MEDIA_BASE_CONTEXT_KEY`, and `MediaPicker`, `MediaHeroField`, and `CairnMediaLibrary` read it. They pass `'slug'` form. The delivery route takes the hash and extension from the last path segment (`media-route.ts:109-125`), so a slug-form preview URL resolves on an `opaque` site as well. That satisfies the item's `urlForm` half without new surface.
- **#48 keeps part of `media.md`'s step 3.** `cairn-media-seed` hard-codes `/media` (`src/lib/media-seed/assemble.ts:133`), so the step shrinks to the seed reason and doesn't go entirely. Record in `## Decisions`. Fixing the seed tool is out of scope.
- **#111 is stamp membership.** A live, stamped `after` entry is new only when its `publishedAt` value appears on no `before` row. This subsumes the key match: batch peers share a stamp but land in one commit, a rename carries its stamp, and a deleted-and-recreated entry gets a fresh stamp and still reads as new, which #111's merged #104 note leaves alone.
- **Class of `scripts/checks/api-surface.md`.** The path map's `scripts/checks/**` glob catches this generated record. The design names the file under Records and sets the class `ordinary`, and Geoff approved both. Regenerating it changes no gate logic, so the class stays `ordinary`. Tell the close reviewer so.

## Standing answers

- **Plan or run past 400 path minutes:** cut #127, then #48, to `BACKLOG.md` and go on. Stop only if still over.
- **May escalate:** #48, #111, #127, #128, #129, after the structural fix `pass-core` sets out. **May not:** #74, #106, #31, #137; a stop on one of these goes to STATUS and `conductor-cairn-cms`.
- **#137 needs a file under `src/lib/github`:** it should not, since `listBranches` and `readFile` exist on `Backend`. If it does, the pass becomes `auth-data`, adds the security read and live smoke, and sends a packet.
- **A test pins the old behavior:** change the test and list it under `## Decisions`. Known cases: `content-routes-publish.test.ts:284`, `edit-page-advisories.test.ts:61`, the tag-path read-failure test, and `newly-published` tests that assert a rename reads as new.
- **An item breaks a site:** add the `Consumers must:` line. No question.
- **A retried test:** list it as flake evidence in the PR. No stop.
- **A count cap or a repeat failure:** a traced cause gets a fix and goes on, per `pass-core` "Lifecycle" step 1.
- **Heavy lane busy:** other passes run beside this one, so `RUN_GATE_IF_BUSY=defer` is fine for a heavy leg, since CI is the full-suite home.

## Execution shape

The session runs three waves of pairs, then three tasks of its own. Each wave's two tasks have disjoint files. Hand each to a `cairn-implementer` with `isolation: "worktree"` and the description `media-publish task <n>`. After both return, in this order: merge them, run `npm run emit:template`, commit the tree if it changed, run the fast lane, push, and start the CI watch. Each wave's report names the CI verdict on that head. Tasks 2b and 3b make one commit per item, so an escalated item reverts alone.

**The session owns these shared records. A pair subagent does not commit them:** `CHANGELOG.md`, `MIGRATION-NOTES.md`, and `templates/waymark/` (regenerated). `check:template` is a fast-lane leg that compares that tree to `skills/`, so any later `skills/` edit, including a Task 6 fix, also takes an emit and a commit before its lane. The exception to a generated-record rule is `scripts/checks/api-surface.md`, which only Task 2b changes, through `npm run check:surface -- --update`.

Every pair dispatch pastes the task block, every "What the planner settled" bullet naming its items, and this text: "Load `cairn-writing-engine-code`. Keep to this task's files and outcome. Write the contract and the why in comments, never the type. No em dash in comments. Before each fast-lane run, run `npm run emit:template`. After the last lane run, run `git restore templates/waymark && git clean -fd templates/waymark`. Never commit that tree: the session owns it, and this overrides your rule to commit a generated tree."

A public-behavior edit to a packaged skill reference rides its task's commit. Editor pages wait for Task 5, so one fresh fact-check covers them all in this PR.

## Tasks

### Wave 1: path 45

#### Task 1a: Keep undeclared keys through a save (#106), 45 min

- **Outcome:** a save or publish keeps every frontmatter key in the prior file that the fieldset doesn't declare, so a hand-written `draft: true` survives and the entry stays hidden.
- **Mechanism:**
  - In `parseMarkdown`, call `matter(source, {})` so a parse failure repeats (see "What the planner settled").
  - In `saveToBranch`, move the `guardedHead` read at `:225` above the prior read and update its comment, so a publish's `expectedHead` stays at or before every byte it sends.
  - When not `isNew`, read the prior file once, branch-first as `:177-179` does, before decoding. The tag path reads its prior tags from that one read.
  - Merge prior keys that are neither in `concept.fields` nor in `result.data` onto `result.data` before `serializeMarkdown` at `:221`. The upsert and the commit then carry the merged markdown.
  - A read or parse failure answers `fail(503, saveRefusal(...))` with the posted body, and commits nothing. A null prior reads as no keys. Publish-all copies branch files raw, so it needs no change.
- **Files:** `src/lib/sveltekit/content-routes-entry-write.ts`, `src/lib/content/frontmatter.ts`; tests beside `src/tests/unit/content-routes-publish.test.ts`; `skills/cairn-extending-a-site/references/{content-model,migrate-content,log-events}.md`. `migrate-content.md:16` and the `content.field_undeclared` row in `log-events.md` both say the first admin save deletes undeclared keys, and each stops saying so.
- **Class:** `ordinary`.
- **Acceptance:** each of these fails on the base.
  1. Saving an entry whose file holds undeclared `draft: true`, `updated`, and a nested object commits all three to the branch, and a declared field removed from the form stays removed.
  2. Publishing that entry commits a manifest row with `draft: true` and no `publishedAt`, and `listLoad` reports it as a draft row, which answers the design's unverified Hidden claim.
  3. A throwing prior read commits nothing and answers 503 with the body reseeded.
  4. A prior file with malformed YAML answers 503 and commits nothing on each of two consecutive saves.

#### Task 1b: Update the manifest on replace and alt push (#74), 45 min

- **Outcome:** a media replace and an alt propagation commit each rewritten entry's rebuilt manifest row in the same commit, so the next build's `verifyManifest` passes.
- **Mechanism:** both actions hold the content manifest they read after `head` in one variable. For each rewritten entry, rebuild the row with `manifestEntryFromFile(findConcept(...), { path, raw: newMarkdown })`, fold it with `upsertEntry` (which keeps `publishedAt`), and add `{ path: runtime.manifestPath, content: formatManifest(...) }` to `changes`. Alt uses only the `changed` entries. With nothing rewritten, replace leaves the manifest out of the commit. A small file-local helper serves both call sites. `mediaUpdateAction` and the media deletes rewrite no entry, and no other commit site does (checked against every `backend.commit` under `src/lib`).
- **Files:** `src/lib/sveltekit/content-routes-media-metadata.ts`, whose action doc comments still say the commit is entries plus `media.json`; its unit tests.
- **Class:** `ordinary`.
- **Acceptance:** each of these fails on the base. Seed every manifest row through `manifestEntryFromFile` from the seeded file, with no `description`, so `summary` is the body's excerpt and `mediaRefs` is present. Build `built` the same way from the committed files.
  1. After a replace, the committed manifest's row for the rewritten entry holds the new hash in `mediaRefs`, keeps its `publishedAt`, and `verifyManifest(built, committedRaw)` does not throw.
  2. After an alt propagation with a `]` in the default alt, the committed row's `summary` matches a row rebuilt from the file.
  3. A replace of an unreferenced asset commits only `media.json`, which holds on the base too and guards the skip.

### Wave 2: path 50

#### Task 2a: Refuse a publish onto a held address (#31), 40 min

- **Outcome:** single and batch publish refuse when a live entry holds the address, and the edit page says so beforehand.
- **Mechanism:**
  - Add one pure helper in `src/lib/content/advisories.ts`: `heldAddress(manifest, concepts, self: { concept, id, permalink, draft })`. It returns null when `self` is a draft or its concept is non-routable. Otherwise it returns the first other row at that permalink that is non-draft and of a declared, routable concept. The edit-load advisory and both publish paths call it, so the warning fires exactly when the refusal would. Edit-load passes the entry's identity and its frontmatter `draft`, since the entry may have no row or a branch-side permalink.
  - `publishAction`: after `saveToBranch` and the stamp, if `heldAddress` returns a row for the held row, log `publish.address_collided` and return `fail(409, saveRefusal(...))`. The branch keeps the edits, and main takes no commit. The message names the address and says to change one of the two.
  - `publishAllAction`: after the fold, call `heldAddress` for each published row. If any collides, log one record per colliding entry, commit nothing, keep every branch, and redirect `?error=address_collision`. A duplicate between two rows of the batch counts. A duplicate on main that involves no batch row does not.
  - Add `address_collision` to `src/lib/sveltekit/refusal-codes.ts` with editor copy, and fix its "three outcomes" comments.
  - Rename the event's fields to `heldByConcept` and `heldById`, since nothing is displaced now.
  - Rewrite the advisory message in `content-routes-entry-read.ts:415` and the comments at `:397` and `entry-write.ts:372`.
  - Delete what the helper replaces, since no gate reports it: `buildAddressIndex`, `mainAddressIndex`, `addressCollision`, `AddressIndex`, `AddressEntry`, the private `push`, their `advisories.test.ts` cases, and imports left unused. Fix the header comments in `advisories.ts` and `cross-branch-index.ts` ("Four indexes").
- **Files:** `src/lib/content/advisories.ts`, `src/lib/content/cross-branch-index.ts` (comment), `src/lib/sveltekit/content-routes-entry-write.ts`, `content-routes-entry-read.ts`, `refusal-codes.ts`; tests `content-routes-publish.test.ts`, `advisories.test.ts`, `content-routes-edit.test.ts`, `edit-page-advisories.test.ts`, `refusal-codes.test.ts`; `skills/cairn-extending-a-site/references/{log-events,content-model}.md`.
- **Class:** `ordinary`.
- **Acceptance:** each of these fails on the base unless marked.
  1. A publish onto a live entry's address answers 409, makes no commit on main, and leaves the branch.
  2. The same publish against a draft entry at that address, a fragment row, or another entry's pending branch succeeds, and so does a fragment published at a page's permalink (these hold on the base too, and guard over-refusal).
  3. A batch with one colliding entry, and a batch of two entries at one new address, each redirect with `address_collision`, commit nothing, and keep all branches.
  4. The advisory appears for a live holder, not for a draft holder, and not when this entry is itself a draft.
  5. Drive the real `publishAction` on `GithubDouble`, then build the indexes from `gh.branches.get('main')`: `createSiteResolver` over that tree does not throw. The fixture must come from the double's tree, never by hand, because on the base that tree holds the duplicate and the resolver throws.

#### Task 2b: Typed upload, strict resolver, rename stamp (#49, #127, #111), 50 min

Three commits, in this order.

- **#49 (15):** add `'mediaLibraryUpload'` to the `actions` Pick in `CairnAdminRoutes` (`src/lib/sveltekit/cairn-admin.ts:420`), name it in the member's doc comment, and take it out of the narrowing comment at `:377-381`, which then counts nine, drops "exactly", and states that `mediaLibraryUpload` is the one difference from `ContentRoutes`, which keeps ten. `:103` and `:388` also count ten and go to nine. `admin-mount.md:164-168` goes to nine the same way, and `media.md`'s custom-screen upload section gains the typed path. No ruling covers this narrowing; the design's scope check passed it.
- **#127 (20):** `createMediaResolver` takes a third parameter, an inline `opts: { /** ... */ strict?: boolean } = {}`, the shape `createSiteResolver` uses. Export no options type: a named one fails `check:self-use` (probed), and the inline member passes `check:options` once it has its doc comment (probed). Strict throws a `cairn:`-prefixed error on a miss while media is on, and media off stays silent. `imageDetail` is unchanged. Replace the wrapper in `media.md`'s "Fail the build on a missing asset" section with the option, keeping the note that a request-time page gets a 500 and previews keep marking misses broken.
- **#111 (15):** rewrite `buildNewlyPublished` to stamp membership (see "What the planner settled"), its doc comment, and `newly-published.md:18`. Rename's half of #104 closes here.
- **Files:** `src/lib/sveltekit/cairn-admin.ts`, `src/lib/render/resolve-media.ts`, `src/lib/media/index.ts`, `src/lib/delivery/manifest.ts`; their tests; `skills/cairn-building-admin-screens/references/admin-mount.md`; `skills/cairn-extending-a-site/references/{media,newly-published}.md`; `scripts/checks/api-surface.md`.
- **Class:** `ordinary`.
- **Acceptance:** `check:options`, `check:tiers`, `check:self-use`, and `check:surface` pass, and each of these fails on the base.
  1. A type test reaches `actions.mediaLibraryUpload` with no cast.
  2. A strict resolver throws on a missing hash and keeps `imageDetail` on a hit, and a non-strict one still returns `undefined`.
  3. `buildNewlyPublished` omits an entry renamed with its stamp carried. It still returns a first publish, each peer of a first batch, and a recreated entry with a fresh stamp, and `before: null` still fans out.

### Wave 3: path 50

#### Task 3a: Guard includes at save, delete, and rename (#137), 50 min

- **Outcome:** a save refuses an include naming no fragment, and a fragment that a pending branch includes can't be deleted or renamed.
- **Mechanism:**
  - Save, in `saveToBranch` beside the link guard: refuse with `saveRefusal` when `extractIncludes(body)` names an id with no `fragments` row in the upserted manifest. A draft fragment row passes, since the build's `fragments.byId` includes drafts. A site with no fragments concept has no rows, so its include refuses, which matches the build's throw.
  - `extractIncludes` skips a missing or empty `fragment` attribute (`includes.ts:28`), and the manifest depends on that. Add a sibling in `includes.ts` that reports an include with no id, and refuse on it too, sharing the parse.
  - Delete and rename: for the fragments concept, build a strict `buildCrossBranchIndex` of `extractIncludes` over open `cairn/*` branches, with no main rows, in one file-local helper. Each row carries the `InboundLink` shape: title from frontmatter or the id, and permalink `''`, as `:146-151` does. In `deleteEntry`, a read failure answers 503 like the reference gate and a holder answers the existing 409 with `inboundKind: 'include'`. Reword the comment at `:113` ("Same degrade-to-allow posture"), which is no longer true. In `renameAction`, a read failure answers the existing "Could not verify" 409 and a holder answers 409 naming the entries, as `:296-299` does for references. Run it after the existing fan-out, never merged into one wider `Promise.all`, per `cross-branch-index.ts`'s workerd note.
- **Files:** `src/lib/content/includes.ts`, `src/lib/sveltekit/content-routes-entry-write.ts`, `content-routes-entry-destructive.ts`; tests `content-routes-fragments-{edit,delete,rename}.test.ts`, a unit test beside the includes tests; `skills/cairn-extending-a-site/references/content-model.md`.
- **Class:** `ordinary`. No file under `src/lib/github`.
- **Acceptance:** each of these fails on the base.
  1. A save naming an unknown fragment, and a save with `::include{}` and `::include{fragment=""}`, each answer 400 and commit nothing, and the body reseeds.
  2. A save naming a draft fragment commits (holds on the base too).
  3. Deleting a fragment that only a pending branch includes answers 409, and a throwing branch read answers 503.
  4. Renaming that fragment answers 409 naming the entry.

#### Task 3b: Preview base, type check, dead presets (#48, #128, #129), 50 min

Three commits, in this order.

- **#48 (30):** `manifestMediaResolver` takes the base as an optional second argument defaulting to `DEFAULT_MEDIA_BASE`, and `EditPage.svelte:1371` passes the media-base context the way `MediaPicker.svelte:74` reads it. Fix the `EditPage` comment at `:1360` and the stale note in `src/lib/reproductions/stories/support.ts:104`. Shrink `media.md`'s step 3 to the `cairn-media-seed` reason and remove any failure row that names the preview.
- **#128 (10):** `normalizeAssets` throws a `cairn:`-prefixed error naming a value that `extForMediaType` (`src/lib/media/sniff.ts:107`) answers `null` for, so the sniffer stays the one source and no second list appears. `media.md:21` says so.
- **#129 (10):** delete `BUILT_IN_PRESETS` and `presetUrl`, and their tests in `media-config.test.ts` and `media-transform-url.test.ts`. Fix the prose that names them: the `config.ts` header, `ResolvedAssetConfig`'s "ignores any preset", `normalizeAssets`'s remarks, the `WATCH:` comment in `transform-url.ts`, and `delivery-media-vite-barrel-prune.test.ts:77`. Neither is public, so the surface stays unchanged.
- **Files:** `src/lib/render/resolve-media.ts`, `src/lib/admin/EditPage.svelte`, `src/lib/reproductions/stories/support.ts`, `src/lib/media/{config,transform-url}.ts`; their tests; `skills/cairn-extending-a-site/references/media.md`.
- **Class:** `ordinary`.
- **Acceptance:**
  1. A component test renders `_EditPageDesk.svelte` with `context: new Map([[MEDIA_BASE_CONTEXT_KEY, '/images']])`, as `media-public-base.test.ts:38` does, opens the Preview tab, waits for the iframe's `srcdoc`, and parses it: the image `src` starts with `/images/`. The preview is a sandboxed `srcdoc` iframe, so there is no DOM `img` to query. This fails on the base.
  2. `normalizeAssets({ allowedTypes: ['image/svg+xml'], ... })` throws and every default type passes. The throw fails on the base.
  3. `grep -rn --exclude-dir=plans --exclude-dir=research 'presetUrl\|BUILT_IN_PRESETS' src skills docs` prints only `check-self-use.test.ts`, whose text is a fixture string.

### Task 4: End-to-end check over the committed files, 40 min

- **Outcome:** the design's end-to-end check, as the fallback the probe forces.
- **Mechanism:** the session writes one integration test with `GithubDouble` and the content harness.
  - Wiring: the harness's `postsConcept()` validates nothing, and `buildSiteManifest` needs an adapter, so define real concepts with `defineAdapter`, and call `runtime({ concepts: normalizeConcepts(adapter.content), resolvedAssets: MEDIA_ON })`, with a `SiteConfig` and a per-concept globs object built from the tree read back from main. Copy `MEDIA_ON` from `content-routes-edit.test.ts:36`.
  - Seed main with an entry that uses an image, an entry with a hand-written undeclared `draft: true`, `media.json`, and a manifest from `buildSiteManifest`.
  - Run the real replace action, reached through `createContentRoutesInternal` as `content-routes-media-replace.test.ts` does; its form needs `oldHash`, `newHash`, `confirmSlug`, and a `media` record. Then run a save and a publish of the second entry.
  - Read the committed tree back from main into per-concept records, and run what the build runs: `buildSiteManifest` then `verifyManifest(built, committedRaw, adapter)` then `verifyReferences(built)`, the sequence at `src/lib/vite/internal.ts:89`.
  - Assert the surviving key with `expect.soft`, ahead of `verifyManifest`, so a base run reports both failures.
- **Files:** `src/tests/integration/commit-chain-build.test.ts`.
- **Class:** `ordinary`.
- **Acceptance:** it passes on the head, and asserts `verifyManifest` doesn't throw and the key survives. It imports nothing this pass adds. For the base proof, in a new scratch directory outside the repo, extract the base with `git archive c85b1de0b`, symlink the worktree's `node_modules` into it, copy this one test in, and run `./node_modules/.bin/vitest run --project integration <file>` there. The test fails on the stale `mediaRefs` and the dropped key. Paste both results into the PR.

### Task 5: Editor pages and version records, 30 min

- **Outcome:** the editor pages match the new refusals, and the records are final.
- **Mechanism:** load `cairn-writing-docs` and follow case A.
  - `docs/editors/when-something-goes-wrong.md` gains the two refusal messages, quoted exactly, under "A save or publish is refused" and "A site-wide publish is refused".
  - `docs/editors/publish-and-history.md` gets the fragment delete refusal's pending case.
  - Check `write-in-the-editor.md` (includes) and `manage-the-media-library.md` (replace).
  - Run the rule's grep over `docs/editors/`, `docs/admin/`, and `skills/` for each action's name and what it writes, and show it in the PR.
  - Write `CHANGELOG.md` under `## Unreleased` and `MIGRATION-NOTES.md`'s Unreleased notes, with `Consumers must:` lines for `buildNewlyPublished`, `normalizeAssets`, the `publish.address_collided` fields and meaning, and `createMediaResolver`'s option. Keep the save-preserves-keys note, since a key dropped from a fieldset now stays in old files.
- **Files:** those pages, `CHANGELOG.md`, `MIGRATION-NOTES.md`.
- **Class:** `ordinary`.
- **Acceptance:** `npm run check:docs-gate` passes, and a fresh `docs-fact-checker` on the changed lines returns no open finding. Register review by `cairn-register-editor` is folded per the skill.

### Task 6: Close, 30 min

1. Run the whole-branch `standards:diff-reviewer` against this plan and the design, telling it the class note above. Dispatch `standards:svelte-reviewer` for the action and `EditPage` changes. No `visual-verifier` run is owed unless a screen's layout changed, since only strings and an image base changed. State that in the PR.
2. Fold one fix chain, quoting each finding verbatim. Run the fast lane again.
3. Move the ten items to `## Done` with proof, and file anything found through `standards:log-issue`.
4. Delete `docs/internal/plans/2026-11-01-media-publish*` and `docs/internal/research/2026-11-01-media-publish-*`. A plan goes when its pass closes.
5. Update `docs/STATUS.md`.
6. Run `npm run check:docs-gate`, commit, and push.
7. Write the PR body: `## Brief`, what landed, `## Decisions`, `## Planning misses`, every retried test, the score with plan path 245 beside actual.
8. With CI green on the head and the review accepted, run `gh pr ready <n>`, then merge with `gh pr merge <n> --merge --match-head-commit <head>`, then pull the main checkout per `pass-core` "Close". No bump, no publish. If either command is refused, the merge stops: record it in STATUS.

## Out of scope

Every other backlog item, however close it sits, including #136, #179, #180, #193, #194. A rename onto a live entry's address across concepts lands the same build failure as #31 and is filed as #197, not fixed here. `cairn-media-seed`'s hard-coded `/media` stays.
