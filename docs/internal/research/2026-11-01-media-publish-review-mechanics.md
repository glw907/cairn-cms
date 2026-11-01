# Mechanics and feasibility review: media and publish plan (db5e4358c)

Reply of the `standards:plan-reviewer` agent, saved by the planning session.

Verdict: not launch-ready as written. One blocker and six majors, all fixable by editing the plan. None is an OWNER FORK. No settled choice needs re-arguing; one settled mechanism is partly false (finding 5).

## Findings, ranked

### 1. Blocker, correctness: five of six pair tasks can't get a green fast lane (plan:44, :46)

`check:template` is in the fast lane for every engine diff: `gate-table.json` has `"check:template": ["showcase", "engine"]`, and `node scripts/checks/gate-tier.mjs --fast --range ac4fbdbb6~1..ac4fbdbb6`, a src plus skills commit, lists it. `emit-template-dir.mjs --check` compares `templates/waymark/` to a fresh bake. The bake reads `skills/` directly (`bake-template.mjs:196`) and sets a non-zero exit code on drift. `diff -rq skills templates/waymark/.claude/skills` is clean today, so any skill edit drifts. Tasks 1a, 2a, 2b, 3a, and 3b each edit `skills/` and hold the template back. Only 1b is unaffected.

`cairn-implementer.md` then gives conflicting orders: "If you cannot get a green lane, report BLOCKED ... instead of committing a red one." and "Re-emit any generated tree before the gate and commit it in the same commit." The plan says it must not touch the tree. If both pair agents obey the agent file, both commit the wholesale-regenerated tree, including the guidance manifest and version stamp `writeGuidance` writes, which defeats the session-owned rule and risks a merge conflict.

Fold: add to the pair prompt: "After committing, run `node packages/create-cairn-site/scripts/emit-template-dir.mjs`, then the fast lane, then `git restore templates/waymark && git clean -fd templates/waymark`. Never commit that tree. This overrides your re-emit rule." The lane then runs real, and the session stays sole owner. Also fix the order at :42 against :44: merge, emit, commit, fast lane, push. As written :42 runs the lane before the emit that :44 describes. The emit needs `dist/guidance/install.js` (`bake-template.mjs:225`), which a lane run leaves behind.

### 2. Major, correctness: Task 2b's named options type fails `check:self-use`, and its fix is outside the file list and the class note (plan:103, :105, :27)

"Export the options type with a tier tag" creates an export whose only uses are its declaring file and a barrel re-export. `check-self-use.mjs` counts neither: a call site is an occurrence "not the file declaring it, and is not itself a barrel re-export line". Types are in scope; `AdminActionOptions` sits in the allowlist for this reason. `check:self-use` is in the fast lane through `exportSurface`. The only documented remedy is `scripts/checks/check-self-use-allowlist.json`, not in the task's list and matching `scripts/checks/**`, the `runner` class. Line :27 excuses only `api-surface.md`.

Fold: use an inline parameter, `opts: { /** ... */ strict?: boolean } = {}`, the shape `createSiteResolver` and `createSiteIndexes` already use. `check:options` reads inline members ("an inline literal's members by the path from it"). No export, tier tag, or allowlist row is needed. Change :103 and the Task 5 wording to match.

### 3. Major, correctness: the #31 helper can refuse a fragment publish, and "exactly when the refusal would" isn't specified (plan:82-83, :95)

The rule matches the build for holders: `index.all()`, `raw.draft === true`, `:100`, and the undeclared-concept skip all line up. But only the holder side is filtered. The publishing row is checked only as "live", not as routable. Fragments can be published non-draft, and their concept has `routable: false` with a permalink (`/fragments/:slug` in test fixtures). A fragment whose permalink equals a page's would get a 409 for a state the build allows. At edit-load the entry may have no manifest row, or a branch-side permalink, so the helper can't take "a row in the manifest". A draft self must also show no advisory. Acceptance 4 tests only a draft holder.

Fold: define the helper as `heldAddress(manifest, concepts, self: { concept, id, permalink, draft })`. It returns null when self is a draft or non-routable, and otherwise the first other live routable row at that permalink. Add to acceptance 2 "a fragment published at a page's permalink succeeds", and to acceptance 4 "no advisory when this entry is a draft".

### 4. Major, correctness: Task 2a acceptance 5 passes vacuously if the fixture is hand-written (plan:96)

"`createSiteResolver` over a fixture of what a refused publish leaves on main does not throw" is headed "each fails on the base". A hand-built fixture with no duplicate can't fail on the base.

Fold: drive the real `publishAction` on `GithubDouble`, then build the indexes from `gh.branches.get('main')`. On the base that tree holds the duplicate, so the resolver throws `cairn: permalink ... resolves to both`. State that the fixture must come from the double's tree.

### 5. Major, correctness: "a read or parse failure answers 503" is false on retry, because gray-matter caches the failure (plan:21, :57, :63)

gray-matter 4.0.3 stores the file in its cache before parsing, and `parseMarkdown` calls `matter(source)` with no options:

```js
matter.cache[file.content] = file;
return parseMatter(file, options);
```

Probe on the installed package, three parses of a malformed file:

```
parse 1 THROW YAMLException
parse 2 ok {} "---\ntitle: [unclosed\ndraft: true\n---\nbody\n"
parse 3 ok {} ...
```

The first parse in an isolate fails closed. The retry reads as "no prior keys", which is the deletion the planner rejected. `editLoad` (`content-routes-entry-read.ts:316`) can spend that first throw before any save. The same probe printed `same data obj true`, so parsed frontmatter is shared across calls. Any merge that mutates it poisons the cache. Acceptance 3 covers only a throwing read.

Fold: change `parseMarkdown` to `matter(source, {})`. An options object skips the cache; source: `if (!options) {...}`. Add `src/lib/content/frontmatter.ts` to Task 1a's Files. Add acceptance: a malformed prior answers 503 on two consecutive saves. Add a mechanism note: copy prior keys, never mutate the parsed object.

The plan's `updated` claim is confirmed: the probe printed `updated: 2026-01-01T00:00:00.000Z`.

### 6. Major, correctness: Task 4 can't show both base failures as written, and its harness needs are unnamed (plan:146, :149)

`GithubDouble` covers the sequence: main-branch reads through `gh.branches`, `expectedHead`, and the ref PATCH commit path. The test can really fail on the base for both reasons. Replace leaves `mediaRefs` stale, and `predatesMediaRefs` can't excuse it because `buildSiteManifest` writes the key for the image entry. The save drops `draft`. Three things are missing:

- One sequential `it` stops at the first failed assertion, so `verifyManifest` throwing on the base hides the dropped-key failure. Use two `it`s, or `expect.soft`, or assert the key before `verifyManifest`.
- The default harness concept can't work. `postsConcept()` has `fields: []` and `validate: () => ({ ok: true, data: {} })`, and `buildSiteManifest` needs a `CairnAdapter`, not a runtime. Name the wiring: `defineAdapter` with real concepts; `runtime({ concepts: normalizeConcepts(adapter.content), resolvedAssets: MEDIA_ON })`; a `SiteConfig`; a per-concept globs object built from the tree read back from main.
- `mediaReplaceAction` is reached in tests through `createContentRoutesInternal` (`content-routes-media-replace.test.ts:11`), and its form needs `oldHash`, `newHash`, `confirmSlug`, and a `media` record. `:89` is the right line.

Fold: add those three lines to Task 4's Mechanism.

### 7. Major, correctness: Task 1b's acceptance can pass on the base with common fixtures (plan:72-73)

Acceptance 2 can fail only if the entry has no `description` (`buildExcerpt` returns it first) and the seeded `summary` is the body's excerpt. Otherwise the row is unchanged and nothing separates base from head. Acceptance 1's `verifyManifest` clause needs a `built` manifest and at least one seeded `mediaRefs` key, or `predatesMediaRefs` hides the drift. The harness has no adapter.

Fold: state both in Task 1b: seed rows through `manifestEntryFromFile` from the seeded file, with no `description`. Build `built` the same way from the committed files.

### 8. Minor, correctness: the #106 prior read lands before the head guard (plan:57)

"Read the prior file once ... before decoding" puts a read of main before `guardedHead` at `:225`. A publish landing between that read and the head read passes `expectedHead` while carrying stale undeclared keys. The publish paths' stated invariant is that `expectedHead` is at or before every byte sent.

Fold: when `guardMainHead` is set, read the head first, moving `:225` above the prior read, and update the comment.

### 9. Minor, correctness: Task 1a misses a page it makes false (plan:58)

`skills/cairn-extending-a-site/references/migrate-content.md:15-16` says "The first admin save deletes undeclared keys. Drafts need `draft: fields.boolean(...)`". `log-events.md:54` says validation drops keys. Task 5's grep is by action name and may not reach these.

Fold: add `migrate-content.md` to Task 1a's Files. Add `log-events.md:54` to the check list if its wording suggests the file loses the key.

### 10. Minor, correctness: a dispatch can't resolve "see What the planner settled" (plan:104, :46)

`cairn-implementer.md` says "you do not read the plan file". #111's mechanism is only that cross-reference, and the #48, #137, and #31 settled facts live there too. The pair prompt names none of them.

Fold: add to :46: "Paste the task block and every settled bullet naming its items into the dispatch."

### 11. Minor, correctness: Task 3b acceptance 3 fails on a correct run (plan:141)

The grep runs at Task 3b, while the plan still exists. It prints `docs/internal/plans/2026-11-01-media-publish.md:135` and `:141`.

Fold: use `grep -rn --exclude-dir=plans 'presetUrl\|BUILT_IN_PRESETS' src skills docs`.

### 12. Minor, correctness: Task 3b acceptance 1 doesn't say how to read the preview (plan:139)

The preview is `<iframe sandbox="" ... srcdoc={previewDoc}>` (`EditPage.svelte:2260`). There is no DOM `img` to query, and the render is async. The test must open the Preview tab, wait, and parse `srcdoc`. The `_EditPageDesk.svelte` harness must pass `MEDIA_BASE_CONTEXT_KEY` in its context map, or the default base makes the check meaningless.

Fold: say so in the acceptance.

### 13. Minor, correctness: dead address code is left to the executor's guess (plan:82, :88)

If all three paths call the new helper, `mainAddressIndex`, `addressCollision`, `AddressIndex`, and `AddressEntry.source` lose their callers. The plan deletes only `buildAddressIndex`.

Fold: name them for deletion, along with their `advisories.test.ts` cases. `check:*` won't catch these (knip "is an on-demand dead-code instrument, not a gate"), so nothing else will surface them.

### 14. Minor, correctness: Task 2a's test list omits `refusal-codes.test.ts` (plan:89)

That file pins each code and its copy. The new code and copy belong there.

Fold: add it.

### 15. Minor, correctness: #49's comment fix is under-specified (plan:102)

`cairn-admin.ts:377-381` also says "mirroring `ContentRoutes`'s narrowing exactly" and "`ContentRoutes`'s ten excluded internal actions". After the change the first is false, since `ContentRoutes` keeps ten and this type nine.

Fold: add "drop 'exactly'; state that `mediaLibraryUpload` is the one difference".

### 16. Minor, correctness: Task 3a doesn't name the delete row's shape (plan:120)

`DeleteFailure.inboundLinks` is `InboundLink[]`, with `title` and `permalink`. An include index with no main rows must carry them. The comment at `content-routes-entry-destructive.ts:113` ("Same degrade-to-allow posture") also needs rewording.

Fold: one clause: use title from frontmatter or id, and permalink `''`, as `:146-151` does.

### 17. Minor, correctness: close and CI lens items are unstated (plan:42, :167-172)

Step 2 runs the last lane, then steps 3-6 edit `BACKLOG.md` and `docs/STATUS.md` and delete the plan. No docs gate follows the last docs edit. No task report is required to name the CI verdict on its head. Step 7 merges without marking the draft PR ready. PR #170's timeline holds a `ready_for_review` event at 19:52:55Z, so the practice exists, but the plan omits it. Only `gh pr merge * --match-head-commit *` is in `permissions.allow`. The refusal text was not verified.

Fold: step 6a: `npm run check:docs-gate`, then push. Line :42: "each wave report names the CI verdict on that head". Step 7 opens with `gh pr ready <n>`, and its failure answer is "merge stops; record in STATUS".

### 18. Minor, optional, over-ceremony: Task 4's base proof (plan:149)

A throwaway worktree with a full `npm ci` costs several minutes for one test file.

Fold: use `git worktree add <tmp> c85b1de0b`, symlink `node_modules`, copy the one test, and run that one test. Keep `examples/showcase` out, since the test doesn't use it.

## Checked and true

- Wave disjointness, source and tests: disjoint, wave by wave. `content-model.md` and `resolve-media.ts` recur only across waves.
- `api-surface.md`: only Task 2b changes it. `buildAddressIndex`, `manifestMediaResolver`, `presetUrl`, and `BUILT_IN_PRESETS` are absent from the surface, and the log event name is unchanged.
- `CHANGELOG.md` and `MIGRATION-NOTES.md`: no lane leg needs them mid-wave.
- `check:editor-quotes`: no `docs/editors/` page quotes the old advisory, so it stays green while pages wait for Task 5.
- #31: the settled mechanism holds for holders, including the undeclared-concept skip. `buildAddressIndex`'s only non-test caller is `entry-write`.
- #137: the no-fragments site throws, per `createFragmentResolver`; `byId` includes drafts; `includes.ts:28` skips empty ids; the strict option exists on `buildCrossBranchIndex`; an empty include renders a notice and does not fail the build, so the save refusal is deliberately stricter.
- #48: `media-route.ts:127-129` takes the hash and extension from the filename, so a slug-form URL resolves on an `opaque` site. Context key, default, and `assemble` reason are as stated.
- #111: a rename carries its stamp (`entry-destructive:323`). Batch peers share one stamp in one commit.
- #106: `upsertEntry` keeps `publishedAt`. `stampFirstPublish` leaves a draft unstamped when the prior row is a draft or absent. `listLoad` passes `e.draft`. `ConceptList` renders Hidden from it, which answers the design's unverified claim.
- #128: `sniff.ts` has no imports, so the barrels stay clean. The SVG test fixtures pass `resolvedAssets` directly and never reach `normalizeAssets`.
- Infrastructure: `worktree.baseRef: "head"` is set in both settings files, so wave 2 sees wave 1. The merge permission is present. The dev-backend probe quote is accurate. `git rev-list --count HEAD..origin/main` printed 0.
- Workstation items: no value is needed from Geoff; no hidden Geoff step; no write to settings or credentials; no count cap stops the line; escalation lists are named; every cheap stop has a standing answer, except the draft-state merge in finding 17. Task and path arithmetic checks: 245 and 365.

The reviewer did not run a real emit or `check:self-use`. Findings 1 and 2 rest on the gate-tier output and the gate source quoted above.
