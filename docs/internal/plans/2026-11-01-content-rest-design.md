# Content rest: design note

The rest of pass 4 after `field-values`, slug `content-rest`, class `ordinary` plus `runner`. Initiative:
`shared-standards`. Base: `6762c2db3`. Design estimate about 220, ceiling 500.

## Outcome

A concept declares plain fields, a field's `default` takes the type of its value, and the read side stops
overloading `fields` and `summary`. The manifest build refuses a filename, a `dir`, and a `cairn:` href
that would ship broken. It warns on an unknown directive and names the real fault ahead of the stale
verdict. `vite dev` regenerates a stale manifest and starts, `cairn-manifest` prints what it did, and
editor screens stop using builder words.

Scope: #107, #133, #164, #179, #181, shape 4, 15, 16, 17, Standard Schema, ergonomics 4, 5, 6. Out: shape
9 (after pass 3), #182 and #176 (pass 7), everything `field-values` closed.

## Calls

Each call is the plan's reading. All are reversible before a release.

1. **Shape 4 keeps `refine` and `behavior` as concept members.** `ConceptConfig<R>` carries `fields: R`,
   `refine?`, and `behavior?`, so shape 9 later folds two members instead of finding them in a wrapper.
   The alternative, shape 9 first, is what the slice's brief rules out.
2. **`defineConcept` builds the fieldset to run its checks and drops it.** `normalizeConcepts` builds the
   one it keeps, which also covers a concept written without `defineConcept`, as shape 4 requires.
   `requireDateField` still mutates the record both fieldsets close over. A cache between the two would
   be new machinery for a cold path.
3. **`InferFieldset` keeps its name and gains a record arm.** No template, showcase page, skill, or docs
   page reads it. Keeping the name keeps `InferFieldset<typeof posts.fields>` working for a rebuild.
   `Fieldset`, `BehaviorTable`, and `FieldBehavior` stay public. `defineFieldset`, `FieldsetConfig`, and
   `StandardInput` leave.
4. **Standard Schema goes now, with no shape 9.** The brief excepts shape 9 only. `slim.md` W2 says to
   fold it with shape 9 because they edit the same lines, but removing `~standard` needs nothing from
   shape 9. Ruling `cleanup-one-validate-hook` already records the reversal.
5. **`default` moves off `FieldBase`.** Text, textarea, url, select, icon, date, and reference take
   `string`, number takes `number`, boolean takes `boolean`, multiselect takes `readonly string[]`.
   Image, object, and array take none, since a string there was never a valid value. `initialValues`
   also omits an empty list, matching "An empty string or `false` writes no key".
6. **`EntryRef` lives in `content/manifest.ts` and is `@public`.** `/delivery/data` is its home, and
   `/sveltekit` is a recorded R4 re-export. `EntrySummary.summary`, the admin list row, stays: the audit
   doesn't name it, and widening it is a separate rename. `FeedItem.summary` stays under
   `convention-interop-carve-out`.
7. **`buildSiteManifest` returns `{ manifest, problems }`.** It has no caller outside the plugin's
   virtual module and three test files, so one name carries the report instead of a second builder.
   `ManifestProblem` carries `concept`, `id`, `path`, `draft`, and `errors`, and three checks feed it: the
   validator, the stem rule, and the body scan. It and `SiteManifestBuild` live in `content/manifest.ts`, which
   can't import `ContentProblem` from `delivery/`.
8. **`verifyEntries(problems)` is a new public function beside `verifyManifest`.** The generated source
   runs in the site's graph, so it reaches only public subpaths. It goes with the other two when pass 3
   hides them. `verifyReferences` gains the body-link check, so no third verifier appears.
9. **#133 is a manifest-build scan, not a render step.** A render step would need a build-only signal
   the pipeline lacks, since the preview runs the same processor. It would also miss a concept no route
   renders, and it couldn't name the file. The scan covers a reference definition, an image, a malformed
   inline token, raw HTML, and a directive attribute, and it exempts drafts as the build does. A
   frontmatter value stays out: it never renders through the pipeline, so nothing survives.
10. **#164's stem and #133's dead href keep the entry's row.** `write` still produces what it can, and
    `verifyEntries` fails the build. Only a validation failure drops a row, as it does today.
11. **Ergonomics 6 uses one flat known set.** Registered names, every slot name, `include`, and `figure`.
    A slot name anywhere is known, which is the audit's "skip nested slots" with no parent walk. The
    registry is reachable: `adapter.rendering.components` sits on the adapter the manifest build takes.
12. **Under `vite dev` the plugin writes and never verifies.** At `buildStart` it evaluates the write-mode
    module through the running server, carries the stamps, and writes only when the bytes differ. Then it
    prints one line, and `this.warn` carries any problem. A site with an invalid entry starts, and the
    page reports the fault. `vite build` stays strict. No hook runs this on a hot update.
13. **The summary line and exit code follow ergonomics 5.** `index.json: 15 entries, 2 changed;
    site-facts.json unchanged; 1 invalid: posts/hello: title: Title is required`. A draft's problem reads
    `1 invalid draft:` and exits 0. Many problems show the first plus `(+N more)`, and a mix of draft and
    non-draft problems carries both clauses.
14. **The chip reads `No references`.** The filter's "No references found" beside the 28px checkbox can
    overlap a narrow tile, and the shorter word agrees with the filter and is narrower than today's chip.
15. **One stale-head wording.** Each condition reads "<thing> changed since you opened it", and the
    second sentence keeps its current recovery. The plan's T6 table holds the strings. "Asset" leaves
    the flashes and the two table headers, so the media library says "image" throughout.
16. **`content.directive_unknown` lands in the Go tool too.** `TestEventVocabularyMatchesEngine` compares
    the sets, and #241 says the fast lane won't catch a miss.
17. **Dev keeps failing on a stale `site-facts.json`.** Ergonomics 4 and the sheet scope only the manifest, so
    `this.error` on a stale facts file stays under `vite dev`. An adapter edit can still stop a dev start until
    `cairn-manifest` runs.

## Files

`src/lib/content/{concepts,fieldset,fields,types,manifest}.ts`, a new `src/lib/content/body-scan.ts`, a
removed `standard-schema.ts`, `src/lib/delivery/{manifest,content-index,site-resolver,data}.ts`,
`src/lib/vite/{internal,bin,assemble}.ts`, `src/lib/render/registry.ts`, `src/lib/log/{events,events-list}.ts`,
`tool/internal/logs/events.go`, the barrels, the copy files in T6, `scripts/checks/{check-options.mjs,check-self-use-allowlist.json,check-surface-reexports.json,api-surface.md}`,
the showcase and template config and pages, both `index.json` files, and the packaged skills.

## End-to-end check

CI's `create-site` builds the scaffold from packed tarballs, so the template's plain-record config, its
`excerpt` manifest, and its `summaryFields` read all run in a real build. A manifest-build test feeds a bad
stem, a reference-style `cairn:` link, and an unknown directive through the real `buildSiteManifest`, and
each case fails if its check is removed.

## Later

- `EntrySummary.summary` could read `excerpt` too. Not filed: nothing misreads it.
- Reference-style `cairn:` links could resolve like inline ones, the other half of #133's candidates. The
  product default took the failure.
