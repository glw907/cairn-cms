# Mechanics and feasibility review: content-rest plan

**Target:** `docs/internal/plans/2026-11-01-content-rest-plan.md` and the design note beside it, on `worktree-content-rest` at `2bc11636c`. Reviewer: `standards:plan-reviewer`, Opus at medium. It edited no file.

**Verdict:** there are no blockers and the design holds. T1's and T2's core mechanics survived probes, and the T6 table is exact. The plan has 3 major and 13 minor gaps. All are cheap to fold before launch. The most costly are F1, F2 and F3.

Probes run: a remark parse of each body-scan case; an in-memory `tsc` of the real `fields.ts` with T2's array builder swapped in; a `tsc` model of T1's `defineConcept` and T2's defaults; a scan of the four site checkouts; a read of PR #180's gate source.

## Findings

### F1. major, correctness: T3 and T5 bin checks need a showcase install the plan never names
**Location:** plan:238 (T3 acceptance), plan:350 (T5 local check), Pre-flight plan:13-26.

**Defect:** both run `npx cairn-manifest` inside `examples/showcase`.
- At this head `examples/showcase` has no `node_modules`; `ls` shows none. Only the root does.
- `durable-gotchas.md:106-109` says of a feature worktree: "`examples/showcase/node_modules` symlinks back to the main checkout, so the showcase resolves `@glw907/cairn-cms` ... to MAIN's build".
- `cairn-running-passes` setup is `npm ci && npm ci --prefix examples/showcase && (cd examples/showcase && npx svelte-kit sync)`.
- Without that install, `npx` finds no local `cairn-manifest` bin. On main's engine it would write `"summary"`, so the T3 check fails falsely.
- T3 runs as a pair subagent in its own worktree, so that worktree would need the setup too.
- T1's `check:public-skill` also needs the sync.

**Fold:** add a Pre-flight line: the session runs the skill's setup command, and the session (not the implementer) runs the two bin checks after the pair merges. Replace T3's check, or add to it, a test that asserts `formatManifest(parseManifest(raw)) === raw` for both committed `index.json` files. That proves key order with no install.

### F2. major, correctness: T1's migration misses tests `tsc` can't see or the codemod can't match
**Location:** plan:152-157.

**Defect:** the 94-sites figure is a `tsc` count and the codemod matches only `fields: defineFieldset(X)`. Three groups escape one or both:
- **Template-string fixtures** in `vite-verify-references.test.ts:36-52`, `vite-site-facts.test.ts` and `vite-verify-nested-media.test.ts`. `ADAPTER` imports `defineFieldset` from `@glw907/cairn-cms` inside a string. `tsc` can't see it. It fails only at run time, in a nested Vite, against dist. The plan assigns these three files to T5, not T1.
- **Variable-bound fieldsets:** `_content-fixture.ts:39,45` (`fields: postFieldset`), `edit-page-field-hint.test.ts:32,70`, and `edit-page-spellcheck-override.test.ts:29`. If such a site escaped the type check, `defineFieldset` would read a `Fieldset` as a field record (`fields`, `behavior`, `validate`). Not reproduced.
- **Root imports:** `define-concept.test.ts:3`, `fieldset-taxonomy.test.ts:2` and `fieldset-seo.test.ts:2` import `defineFieldset` from `../../lib/index.js`, so "keeps its relative import" needs a repoint to `content/fieldset.js`.

Size the work by grep: 69 test files contain `defineFieldset` and the reviewer's pattern matched 112 lines.

**Fold:** add the three vite suites to T1's Files. Have the codemod also rewrite string fixtures and drop `defineFieldset,` from their import line. Name the three variable-bound files. Require `npm run package` before those suites run.

### F3. major, correctness: the raw-HTML scan hard-fails a build on content that ships fine
**Location:** plan:259-260 (T4 `body-scan.ts`).

**Defect:** the regex runs over every `html` node's value. Probe results: `<!-- <a href="cairn:posts/old">gone</a> -->` is one `html` node, and `<pre><code>href="cairn:posts/one"</code></pre>` is one `html` node. Both produce a dead href, which is a non-draft build failure. Neither ships a live `cairn:` href in an anchor. The comment is inferred to drop downstream, and the `<pre>` text is literal, not an attribute. The "only warns" standing answer covers directives, not this path, so a false alarm here has no answer. None of the four sites has this today.

**Fold:** strip `<!--...-->` from the value first. Match only inside a tag, for example `/<[a-z][^>]*\b(?:href|src)\s*=\s*["']?(cairn:[^"'\s>]*)/gi`. Add both cases to T4's "yield none" list.

### F4. minor, correctness: `SiteManifestBuild` as placed fails `check:self-use`, and T4's Files omit the gate data
**Location:** plan:270, plan:284-285, plan:249-252.

**Defect:** `check-self-use.mjs` counts "a whole-word occurrence ... in a `src/lib` ... file that is not the file declaring it, and is not itself a barrel re-export line". Declared in `delivery/manifest.ts` and re-exported only from `data.ts`, the type has zero call sites and no showcase use. `verifyEntries` clears through the `virtualSource` string. `ManifestProblem` clears through `delivery/manifest.ts`. `SiteManifestBuild` needs a tier tag, and the plan tags only the other two. `ManifestProblem` on `/delivery/data` needs a `check-surface-reexports.json` row with home `.`. T4 lists no `scripts/checks` file and is tagged `ordinary`, though the header says runner data lives in T1, T3 and T7.

**Fold:** declare `SiteManifestBuild` in `content/manifest.ts`, tagged `@public`. The import in `delivery/manifest.ts` then counts and no allowlist row is needed. Add the reexports file to T4 and mark T4 `ordinary` plus `runner`.

### F5. minor, correctness: T2's `registry.ts` line doesn't compile as described
**Location:** plan:188-190.

**Defect:** in the reviewer's model, `typeof field.default==='number'?String(field.default):(field.default ?? ...)` errors with `Type 'string | boolean | readonly string[]' is not assignable to type 'string | boolean'`. `def.attributes` is `Record<string, FieldDescriptor>`, so the list default stays in the union, although `ATTRIBUTE_TYPES` refuses multiselect at run time.

**Fold:** the task text names a third arm that drops a list. Bind the default first and branch on `typeof d === 'object'`, then probe it, because `Array.isArray` won't remove `readonly string[]` from the false branch.

### F6. minor, correctness: the plan says no script regenerates the template's `index.json`, but one does
**Location:** plan:229-231.

**Defect:** `scripts/build/emit-template.mjs:143-158` (`regenerateManifest`) reads the showcase file, filters excluded entries, and writes `src/content/.cairn/index.json` into the emitted tree. The header of `emit-template-dir.mjs` says the tree is "generated wholesale". The template's hand rename is overwritten by the next emit.

**Fold:** rename the showcase file only, then run `npm run emit:template`. `check:template` proves the template.

### F7. minor, correctness: `summary` seeds in the dev package are missed, and no check catches it
**Location:** T3 Files, plan:207-211.

**Defect:** `packages/cairn-cms-dev/src/fake-github.ts:319,330,341,352,363,465,688` seed manifest rows with `summary:`, under a comment naming "The Manifest shape". These objects aren't typed as `Manifest`, and `parseManifest` ignores the unknown key. After T3, `content-routes-list.ts:166` reads `e.excerpt` and gets `null`. The e2e can't notice: `golden-path.spec.ts:290` asserts `[data-summary]` has count 0. Line 166 was the only `ManifestEntry` reader in a grep of `src/lib`, `tool`, `packages`, `scripts`, showcase, template and skills. `fixtures.ts`'s `summary` is `EntrySummary`, which stays.

**Fold:** add the file to T3 and rename the seven keys. Run `check:dev-package`.

### F8. minor, correctness: T5's `changed` count is ambiguous and can read every stamped row as changed
**Location:** plan:321-322.

**Defect:** `diffManifests` compares the union of keys at `manifest.ts:293-295`. Diffed against pre-carry output, each stamped entry differs on `publishedAt`, so the line would report them as changed on every run. A bytes-only change also reports `0 changed` with a warning.

**Fold:** state "diff the carried result against the committed file" and pin it with a test holding a stamped entry.

### F9. minor, correctness: T5 understates which tests change
**Location:** plan:68-70, plan:344-349.

**Defect:** besides the named drift test, `verifies the manifest and the site facts...` pins `loaded` as `['virtual:cairn-manifest', ...]`, and `falls back to the nested verify server...` will break. The fake returns `{ result: '{}' }` at `:61`, so `manifest` parses undefined and reaches `writeFile`.

**Fold:** list both tests. Have `FAKE_VITE` return `{"manifest":"...","problems":[]}`. `parseAdapterFacts` drops unknown keys, so the adapter-facts read still works.

### F10. minor, correctness: T4's skill edits leave a page stale, and T4 has no emit step
**Location:** plan:291-293, plan:21.

**Defect:** `skills/cairn-extending-a-site/references/public-routes.md:100` keeps the `cairn: <n> invalid frontmatter field(s):` row. A non-draft invalid entry now fails first at `cairn: <n> invalid entries:`. T7's search will hit that row, but T7's Files hold no skill. T4 edits three skill files and its body names no `npm run emit:template`, though Pre-flight says it runs.

**Fold:** add `public-routes.md` and the emit step to T4.

### F11. minor, correctness: T7's `Consumers must:` grammar is incomplete
**Location:** plan:73.

**Defect:** PR #180's gate also adds "the line is not a paragraph of its own (blank line before and after)". The plan names one line, indent and period only.

**Fold:** add "a blank line before and after".

### F12. minor, correctness: T6 calls a comment a test pin
**Location:** plan:384, plan:389.

**Defect:** `CairnMediaLibrary.test.ts:121` is a comment, and "Not referenced" appears nowhere else in `src/tests`. The plan's "asserts `No references`" means adding an `expect`. Also, `:1231` at plan:380 names no file. The acceptance grep will also hit these pins, all synthetic: `NavTree.test.ts:94,97`, `tidy-settings.test.ts:223,226`, `vocabulary-admin.test.ts:206,209`, `commit-log.test.ts:15`, and `CairnMediaLibrary.test.ts:421`.

**Fold:** say "add an assertion" and name the file for `:1231`.

### F13. minor, correctness: the summary line has no form for many problems
**Location:** plan:325-327, plan:349.

**Defect:** only none, one invalid, and one draft are pinned. Forty problems, or a mix of draft and non-draft, have no named report, and `this.warn` carries the same line.

**Fold:** pick one form, for example the first problem plus `(+39 more)`, with both clauses in a mixed case, and pin it as a fourth case.

### F14. minor, correctness: no push point and no per-task CI verdict
**Location:** plan:98, plan:418; Pre-flight.

**Defect:** the fast lane runs "no whole node project and no e2e" (`gate-tier.mjs` header). The plan names CI only at T7, so a guard test or e2e break from T1 surfaces at close. The plan text sets no rule that an accepted-task report names the CI verdict on its head.

**Fold:** push after T1 and after each pair, with each report naming that head's CI verdict. The executor prompt should carry the same rule. Also name `gh workflow run` as a check for T7's dispatch, per the scope item.

### F15. minor, correctness: the set-aside rule leaves Standard Schema unplaced
**Location:** plan:57-63.

**Defect:** T1 bundles shape 4 and Standard Schema. The sheet lets shape 4 be set aside, and neither the sheet nor the plan says what happens to `~standard` then. It needs nothing from shape 4.

**Fold:** add "if shape 4 is set aside, Standard Schema still lands".

### F16. minor, optional: pair disjointness is overstated for one test file
**Location:** plan:99-101.

**Defect:** `delivery-site-resolver.test.ts` has 2 `fields.array(` sites for T2 and takes T3's `excerpt` assertion. Hunks should merge, but "disjoint files" isn't literal. T4 and T6 are disjoint, and `emit:template` output doesn't overlap for either pair.

**Fold:** give that file to one task, or note the session reruns `npm run emit:template` and `check:surface -- --update` after each pair.

### F17. minor, optional: public doc comments still name a private function
**Location:** T1 and T2 edits.

**Defect:** `fields.ts:51,170,272`, `types.ts:74` and `concepts.ts:239` keep naming `defineFieldset` or a shared fieldset. `defineConcept`'s `@throws` doesn't gain the checks it now runs.

**Fold:** one line each in T1 and T2.

### F18. minor, optional: dev still stops on a stale `site-facts.json`
**Location:** plan:332-335.

**Defect:** T5 keeps `checkSiteFacts`, and `this.error` on `stale` stays at `internal.ts:326-327`. So `vite dev` can still fail after an adapter edit, which is the friction ergonomics 4 names for the manifest. The sheet scopes only the manifest, so this is a method call, not a fork.

**Fold:** record it under `## Decisions`, or downgrade it to a warning under dev.

### F19. minor, optional: dangling message on an invalid draft target
**Location:** plan:266-268.

**Defect:** a non-draft link to a draft that failed validation has no row, so the message says "which does not exist" while the file exists.

**Fold:** accept it, or check `problems` for a friendlier line. No new false failure on a valid draft target.

### F20. minor, optional: acceptance wording and over-ceremony
- **T2 "Each fails against today's code"** (plan:198): `5`, `0` and `['a']` already pass through `initialValues` at run time. They fail only under `npm run check`, as compile errors. Reword.
- **Third parse per entry:** measured about 13 ms per 10 KB body with directive parsing, on top of `extractCairnLinks` and `extractIncludes`. It's tolerable. Returning the includes from one parse would save one, but this isn't needed now.
- **`standards:daisyui-a11y-reviewer` for a one-label chip** (plan:413): low value, and a cut candidate unless a rule requires it.
- **Hand template rename:** see F6.

## Checked and holding

**T1:** `validate` reads `record` when called, and `namedFields` runs after `validateUrlPolicy` (`concepts.ts:225-226`), so `requireDateField`'s mutation reaches form and validator. Declaration checks all run in `defineFieldset`. `DRAFT_FLAG` is untouched. Only `concepts.ts:95` and `manifest.ts:351` read `.fields.fields`, and `.fields.validate` and the like have no `ConceptConfig` reader. `composeRuntime` runs at "module evaluation", so "cold path" holds. The model compiled contextual `refine` and `behavior` params under `const C`.

**T2:** `default?: never` keeps `field.default` readable across the union, and `Array.isArray(value) && value.length === 0` compiles. The two `@ts-expect-error` targets fail as intended. `'today'` fits `string`. List and number defaults reach the form: `initialValues` feeds `loadFrontmatter` (`content-routes-entry-read.ts:329`), `formValues` runs `multiselectFormValue`, and `0` stringifies. Against the real `fieldset.ts` types, the array bag inferred `number[]`, the object shape, `string[]` and the select union.

**T3:** renaming `:150` in place keeps key position, so the rename is byte-for-byte. `tool/`'s `summary` is the doctor's JSON and is unrelated. The reexports row shape matches (`name`, `subpath`, `home`, `reason`), and `/delivery` is covered by `layeredBarrels`.

**T4:** draft rows carry `draft` and `links` (`manifest.ts:116-117`), and valid draft targets stay in `present`, so no false positive. `cairn:posts/one#sec` is a `link` that `parseCairnToken` refuses, a correct dead href that never enters `links`. Fenced and inline code produce no nodes in the probe, including HTML and directives inside a fence. The reference-style, image, inline-HTML, directive-attribute and autolink cases parse as planned. Prose `cairn:posts` becomes a `textDirective`, which the plan ignores. `parseCairnToken` exists at `links.ts:29`. remark packages are declared at `package.json:258-260`, and `includes.ts` already uses the same pipeline. The root barrel path works for `verifyEntries` once it's exported. Bare manifest fixtures in `manifest.test.ts` use `links: []`. Site scan: no bad stem and no dead-href pattern in the four checkouts' content.

**T5:** `this.warn` already runs in `buildStart` at `internal.ts:323`, and `fakeContext` supports it. `loadFromDevServer` is id-generic. `buildStart` runs for the client environment only in dev, per the filter at Vite 8.3.3 `node.js:8409`. `watchChange` only clears `buildChecks`, so there is no write loop. `carryPublishStamps` takes strings. No CI or tool code invokes the bin, so exit 1 breaks nothing automated.

**T6:** every "Today" row is exact at its line, and `FLASH_MESSAGE` is the only flash home. `check:editor-quotes` has no fixture directory of its own, only a unit test. It guards `when-something-goes-wrong.md` alone, so the other two pages rest on the fact-checker. `/changed since you opened/i` still matches.

**Gates:** `verifyEntries` clears `check:self-use` through the generated string. `ConceptConfig`'s new `BehaviorTable` closure already has rows on `/delivery/data` and `/sveltekit`. `check:options` walks only `define*` and `create*` roots.

**Acceptance greps and order:** the T1, T3 and T6 greps all print hits on the unchanged tree. T5 depends on T4's `problems`, and the order provides it. T3's doc edits land after T1.

**Estimates:** 175 against 500 leaves no stop risk. T1 likely overruns 50 given F2. No action needed.

**Run-sheet fit:** the plan matches the Pass 4 answers. `cleanup-one-validate-hook` and `cleanup-wiring-reshapes` exist and cover the reversals.

No owner forks.
