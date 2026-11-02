# Content rest: task plan

The rest of pass 4, slug `content-rest`, class `ordinary` plus `runner` (`scripts/checks` data in T1, T3,
T4, and T7). Initiative: `shared-standards`. Base: `4edb7f9e8` (`origin/main` at `f89fe83be`, PR #178 merged). Design note:
`docs/internal/plans/2026-11-01-content-rest-design.md`. Sources: `design-audit/run-sheet.md` "Pass 4" and
"Run rules", `design-audit/design.md` "4. Content rules", `shape.md` 4, 15, 16, 17, `ergonomics.md` 4, 5, 6,
`slim.md` W2, ledger.md "## Rulings".

Path: 190 minutes (T1 60, the pair at T3's 25, the pair at T4's 40, T5 40, T7 25), against a design
estimate of about 220 and a ceiling of 500. Estimates carry the run's 1.7 speed-up. No cut is needed. The
cut order, if one were: ergonomics 5, then shape 15.

## Pre-flight

Every task was read for owner steps and auto-mode gaps.

- **Geoff's steps:** none. No sign-in, secret, dialog, browser action, or permission rule.
- **Auto-mode writes, all named under workstation#192's line:** T1 edits
  `.claude/skills/cairn-writing-docs/evals/setups/site/{s07-new-concept-bad,s08-public-routes,s15-adopt-and-migrate-bad}.mjs`
  and `.claude/skills/cairn-writing-docs/evals/site-cases/S07-new-concept.json`. `npm run emit:template`
  regenerates `templates/waymark/.claude/skills/**` from `skills/` in T1 through T5. No task edits
  `CLAUDE.md` or `.claude/rules/`. A refusal is a stop, never a thing to route around.
- **Setup:** before T1 the session runs the `cairn-running-passes` setup command in this worktree:
  `npm ci && npm ci --prefix examples/showcase && (cd examples/showcase && npx svelte-kit sync)`. The
  showcase has no `node_modules` at this head. `readlink -f examples/showcase/node_modules/@glw907/cairn-cms`
  must print this worktree, since a showcase that resolves to the main checkout proves main's engine. T1's
  `check:public-skill` needs the sync too.
- **Bin checks:** the session, never an implementer, runs T3's and T5's `npx cairn-manifest` checks here,
  after `npm run package`, and T3's only after its pair merges.
- **Reads outside the worktree:** none needed. The planner's probes read the four site checkouts.
- **Live accounts, credentials, `wrangler d1 --local`, stopping a test process:** not needed by any task.
- **A workflow dispatch:** T7 may run `gh workflow run e2e.yml --ref <branch> -f update_snapshots=true`, the
  sheet's standing answer for an intended visual change. A refusal goes to `cairn-cms-9b` as a stop.

## Backlog sweep

Scoped sweep at `6762c2db3`, before PR #178 merged, by a fresh read-only agent. The verdicts landed on this branch in the plan's
commit, stamped 2026-11-01. No item from outside the slice folds, so the scope stands. 29 of 71 open items
have no stamp from the last 90 days, which passes the 15 line, and the sheet already places the full sweep
at pass 8's close.

| Item | Verdict | Reason |
|---|---|---|
| #107 | fold | T4. Refuse a leading or trailing slash only, since every real `dir` has inner slashes. |
| #133 | fold | T4. `remarkResolveCairnLinks` visits `link` nodes alone, so a definition, raw HTML, and a directive attribute survive, and a malformed inline token passes too. The product default took the failure. |
| #164 | fold | T4. The list screen projects manifest rows, so a bad stem lists a row whose edit route refuses it. All 47 engine stems pass. |
| #179 | fold | T6. All live. Line 1956's "this page" takes #193's ruled "entry". |
| #181 | fold, reworded | T6. `allowedTypes` is gone, and two more "Asset" strings and two test pins sit outside the item's text. |
| #134 | done | ddcd3bcdc removed `createSiteIndexes` and the plugin's `content` option. The sheet also dropped it. |
| #239 | reword | Shape 4 takes `defineFieldset` off the public surface, so the title reads "at declaration". |
| #136 | reword | The mechanism holds. The `pre-agent-first` cite and line numbers are refreshed. |
| #199 | keep, re-placed | Its placement named this slice, which doesn't carry it: it's the save path, outside the lines this pass rewrites. Now the Cleanup round. |
| #241 | keep | The slice is the next diff to hit it. T4 adds the event to `tool/internal/logs/events.go` and runs the tool gate by hand. |
| #235 | keep | A skill edit here avoids a prose span of `npm run ...`, which fails in CI only. |
| #193 | keep | T6 uses its ruled words, so nothing is reworded twice. |
| #232, #231, #238, #216, #200, #32, #98, #143, #103, #172, #180, #188, #75, #202, #64 | keep | Each mechanism holds, and none lives in lines this pass rewrites. |
| #230 | left unstamped | `EntryData` is an interface at `public-routes.ts:64`, so "union" can't be grounded. Its author's meaning goes to the conductor. |

## Stops and standing answers

The sheet's standing answers apply to every task. These are this pass's.

- **Plan over 500:** cut ergonomics 5, then shape 15. At 190 this doesn't fire.
- **`defineConcept` inference fails from a plain record:** set shape 4 aside and go on, per the sheet. The
  planner's probe passed on `main`: `ConceptConfig<S extends Record<string, FieldDescriptor>>`, a
  `TypedSiteResolver` read, and `summaryFields` key checking all typed correctly under `tsc`. So T1's
  first test should pass the same way. A failure there means the probe missed a case, so trace it first.
- **A cause that returns after one structural fix:** T1's shape 4, T2, T3's shape 16 half, and T5 may be
  set aside and listed. If shape 4 is set aside, Standard Schema still lands, since it needs nothing from
  shape 4. #133, #164, #107, #179, #181, shape 17, and ergonomics 6 may not. If one of those
  can't land, write the stop to `docs/STATUS.md` for `cairn-cms-9b`.
- **Ergonomics 4 regenerates once at `buildStart` under dev, never on a hot update.** No `handleHotUpdate`
  hook, and no write from `watchChange`.
- **The directive check only warns.** A false alarm in a site is data for the rebuilds, never a reason to
  add a skip list.
- **A test pins old behavior:** change it and list it under `## Decisions`. T5 changes
  `a manifest drift the running server reports still fails dev start through this.error`, which pins what
  ergonomics 4 reverses. A test in R6's retirement list that breaks is updated to the new names, never
  deleted.
- **A site breaks:** add the `Consumers must:` line and go on. No shim, no alias, no migration tooling.
  Each line follows PR #180's grammar: one line, two-space indent under its bullet, a blank line before and
  after, terminal period.
- **`docs/internal/engine-rulings.md`:** leave it. `cleanup-one-validate-hook` and `cleanup-wiring-reshapes`
  already record these reversals, and `:71`'s `FieldsetConfig` is a historic rename.
- **`tool/testdata/doctor-agreement.md:193`:** historic text. Leave it.
- **A skill edit:** never put `npm run ...` in a prose code span, which fails `skill-references-compile`
  in CI only (#235). Name the script, or use a fenced block.
- **Stale transcript block:** leave page and fixture alone, and list it for the recapture.
- **Intended visual change:** T6's chip and hero line can move baselines. Regenerate on CI through
  `e2e.yml`'s `update_snapshots` on the branch, read the render, and list it. Never commit a local baseline.
- **A real dependency the map missed:** set the item aside for pass 4's home, list it under `## Decisions`,
  and go on.
- **Merge chores:** `templates/waymark`, `scripts/checks/api-surface.md`, and `CHANGELOG.md` are rerun at
  each merge. Keep them current on the branch. A conflicting PR fires no `pull_request` CI, so a `ci-green`
  exit 2 (missing) means check the PR for a conflict and report to `cairn-cms-9b`. Merge `origin/main` on
  `cairn-cms-9b`'s word only. PR #178 (1a) is already in this branch. PR #180 (`tool-gates`) touches `CHANGELOG.md`, `BACKLOG.md`, and `CONTRIBUTING.md`.
- **A new BACKLOG item** takes the next free number on `main` at merge.
- **Gates:** every leg goes through `cairn-run-gate`, per `cairn-pass` "Gate" and "Fast lane". After each
  task, `node scripts/checks/gate-tier.mjs --fast --range <base>..HEAD` prints the legs. A `.svelte` change
  adds the component project. `vite-verify-references`, `vite-verify-nested-media`, and `vite-site-facts`
  import the built package, so run `npm run package` before them in T1, T2, T4, and T5.
- **Push and CI:** push after T1 and after each pair, opening the draft PR at T1's push. Each accepted-task
  report names that head's CI verdict from `ci-green <sha> --pr <n> --wait`. No task waits for CI before the
  next, and a red stops the line.
- **`docs/STATUS.md`:** the conductor batches it. Touch it only for a stop.
- **Questions:** none is expected. A stop goes to `docs/STATUS.md` for `cairn-cms-9b`.

## Tasks

Order: T1, then pair T2 and T3, then pair T4 and T6, then T5, then T7. Run the fast lane after each task or
pair. Each pair has disjoint files, with one exception: T2 owns `fields.ts`, `fieldset.ts`,
`registry.ts`, and each `cairn.config.ts`, while T3 owns the read side and the page files. T4 owns the
manifest path, and T6 owns editor copy. The exception is `delivery-site-resolver.test.ts`: T2 owns the
`fields.array(` calls at `:61,106`, and T3 owns the `summary:` lines at `:90,93,131`, whose hunks merge. The
session reruns `npm run emit:template` and `npm run check:surface -- --update` after each pair, so no
implementer writes `api-surface.md` in a pair. T1, T4, and T5 pass `model: opus`, since they carry novel correctness
logic. T2, T3, and T6 stay Sonnet medium.

### T1. A plain field record, shape 4 and Standard Schema (60 min, `runner`, `model: opus`)

**Outcome:** a concept declares `fields: { ... }` with `refine` and `behavior` beside it. `defineFieldset`,
`FieldsetConfig`, and `StandardInput` leave the root barrel, and `~standard` leaves `Fieldset`.

**Files:** `src/lib/content/{types,concepts,fieldset,manifest}.ts`, removed `src/lib/content/standard-schema.ts`,
`src/lib/delivery/site-resolver.ts`, `src/lib/index.ts`, `scripts/checks/check-options.mjs`,
`check-self-use-allowlist.json`, `api-surface.md`, `examples/showcase/src/theme/cairn.config.ts`, the
template through `npm run emit:template`, `skills/cairn-extending-a-site/references/content-model.md`, the
four eval files in Pre-flight, and the tests below.

Write the type tests first, in `fieldset-infer.test.ts` and `site-resolver-types.test.ts`. They read a
plain-record `defineConcept`, with `toEqualTypeOf` over a required text, an optional number, and a select
union, and `@ts-expect-error` on a `summaryFields` key no field declares.

- `types.ts`: `export interface ConceptConfig<S extends Fieldset = Fieldset> {` becomes
  `ConceptConfig<R extends Record<string, FieldDescriptor> = Record<string, FieldDescriptor>>`, and
  `fields: S;` becomes `fields: R;`. Add `refine?` and `behavior?` with doc comments moved from
  `FieldsetConfig`. Rewrite the `fields` doc comment's first sentence, "The concept's fieldset: the form
  projection, the generated validator, and the inferred type.", and `:73-74`'s "One `fields` fieldset, built
  with `defineFieldset`", which names a function that's no longer public.
- `concepts.ts`: `summaryFields?: readonly (keyof C['fields']['fields'] & string)[];` drops one `['fields']`.
  `defineConcept` first runs `defineFieldset(concept.fields, { refine: concept.refine, behavior: concept.behavior })`
  and drops the result, then passes `concept.fields` where `concept.fields.fields,` is today.
  `normalizeConcepts`'s `const fs = config.fields;` becomes the same `defineFieldset` call, and the rest of
  that function keeps reading `fs`. `declared` and `namedFields` still read `fs.fields`. `defineConcept`'s
  `@throws` gains the declaration checks it now runs, and the comment at `:239`, "a fieldset is a standalone
  object a site may share across concepts", loses that claim.
- `manifest.ts`: `declaresNestedImage(Object.values(concept.fields.fields))` loses one `.fields`.
- `fieldset.ts`: `export type InferFieldset<S> = S extends Fieldset<infer R> ? InferRecord<R> : never;` gains a
  record arm: `S extends Fieldset<infer R> ? InferRecord<R> : S extends Record<string, FieldDescriptor> ? InferRecord<S> : never`.
  Remove `import type { StandardInput, StandardSchemaV1 } from './standard-schema.js';`, the
  `readonly '~standard': ...` member and its doc comment, `const standard: ...` through its closing `};`, and
  `'~standard': standard` from the return. Fix the header comment's "and the Standard Schema conformance
  property" and the same words in `defineFieldset`'s and `Fieldset`'s doc comments. `FieldsetConfig` stays
  exported from this module and leaves the barrel.
- `site-resolver.ts`: the `ConceptConfig<infer S> ? InferFieldset<S>` line keeps working. Confirm with the
  type test.
- `index.ts`: remove `export type { StandardInput } from './content/standard-schema.js';`,
  `export { defineFieldset } from './content/fieldset.js';`, and `FieldsetConfig,` from the type block, and
  reword the comment `` // `FieldsetConfig.behavior` and `Fieldset.behavior` name these. ``
- `check-options.mjs`: `defineConcept, defineFieldset, defineRegistry, defineRoles` loses the name.
- `check-self-use-allowlist.json`: remove the `FieldsetConfig` row at `:27`.
- Showcase: `defineFieldset,` at `:10` leaves, and `fields: defineFieldset({` at `:81`, `:133`, and `:149`
  unwrap. Run `npm run emit:template`.
- `content-model.md`: rewrite the example at `:98-114` and the two hook bullets at `:85-91` so `refine` and
  `behavior` sit on `defineConcept`.
- Evals: `s07-new-concept-bad.mjs:11,18`, `s08-public-routes.mjs:65`, `s15-adopt-and-migrate-bad.mjs:17,26`,
  and `S07-new-concept.json:5,20`, same change.
- Tests: `tsc` on `main` with this edit reports 94 sites in 22 files, led by `content-concepts` (20),
  `public-routes` (13), and `delivery-content-index` (13). `defineFieldset` sits in 69 test files, and
  `tsc` sees only part of that work. Use a one-time codemod in `$CLAUDE_JOB_DIR/tmp`, never committed, that
  unwraps `fields: defineFieldset(X)` by balanced parens and moves a second-argument `{ refine }` or
  `{ behavior }` onto the concept. `schema: defineFieldset(...)` on a hand-built descriptor stays. A test that
  exercises the fieldset itself keeps its relative `defineFieldset` import. `fieldset-validate.test.ts` loses
  its `~standard` cases, and `root-barrel-prune` asserts the three names are gone. Four groups need more:
  - String fixtures, which `tsc` can't see and which fail only at run time against `dist`:
    `vite-verify-references.test.ts:32,40,47`, `vite-site-facts.test.ts:40,45,46,52,61,62`, and
    `vite-verify-nested-media.test.ts:25,32`. The codemod runs over these and drops `defineFieldset, ` from
    each string's import line. T5 edits these files later.
  - Bound fieldsets: `_content-fixture.ts:39,45` become `fields: postFieldset.fields` and
    `fields: pageFieldset.fields`, since the two consts still feed `namedFields`. `fields: schema` in
    `edit-page-field-hint.test.ts` and `edit-page-spellcheck-override.test.ts` is a `NamedField[]` prop, so
    leave it.
  - Root imports: `define-concept.test.ts:3`, `fieldset-taxonomy.test.ts:2`, and `fieldset-seo.test.ts:2`
    repoint `defineFieldset` to `../../lib/content/fieldset.js`.
  - `fields-exports.test.ts`: remove the `exports defineFieldset from the main entry` case, the
    `FieldsetConfig` and `StandardInput` imports at `:7,10` with their pins at `:48,67`, and read the fieldset
    at `:42` from `content/fieldset.js`.

**Acceptance:** `npm run check` passes with the new type tests. After `npm run package`, the three vite
suites pass. `content-concepts.test.ts` proves that a
plain record with a malformed `pattern`, with two `seo` images, and with a `behavior` key no field declares
each throws at `defineConcept`, that a concept passed to `normalizeConcepts` without `defineConcept` enforces
`required`, and that a concept's `refine` error reaches `descriptor.validate`. `git grep -n defineFieldset --
skills examples/showcase/src templates/waymark/src` prints nothing. `npm run check:options`, `check:self-use`,
`check:surface -- --update`, and `check:public-skill` pass.

**Test:** the edited suites.

### T2. Typed `default`, an `array` bag, shape 15 (20 min, `ordinary`)

**Outcome:** `fields.number({ default: 5 })` compiles, a multiselect defaults to a list, and
`fields.array({ item, label })` replaces the positional form.

**Files:** `src/lib/content/{fields,fieldset}.ts`, `src/lib/render/registry.ts`,
`examples/showcase/src/theme/cairn.config.ts`, the template through `npm run emit:template`, and the tests.

- `fields.ts`: move `default?: string | boolean;` and its doc comment off `FieldBase` into
  `interface WithDefault<T> { default?: T }`. `TextField`, `TextareaField`, `UrlField`, `SelectField`,
  `DateField`, `IconField`, and `ReferenceField` extend `WithDefault<string>`, `NumberField` extends
  `WithDefault<number>`, `BooleanField` extends `WithDefault<boolean>`, and `MultiselectField` extends
  `WithDefault<readonly string[]>`. `ImageField`, `ObjectField`, and `ArrayField` declare `default?: never`
  with a one-line doc comment, so a value there fails to compile through the builders' `const O` and
  `field.default` still reads across the union. `:2`, `:51`, `:170`, and the array doc comment stop naming
  `defineFieldset` and say the check runs at declaration.
- `fields.ts` builder: replace `array: <const I extends FieldDescriptor, const O extends Omit<ArrayField, 'type' | 'item'>>(`
  through `): ArrayField & { item: I } & O => ({ type: 'array', item, ...(o as O) }),` with
  `array: <const O extends Omit<ArrayField, 'type'>>(o: O): ArrayField & O => ({ type: 'array', ...o }),`.
- `fieldset.ts`: `if (value === undefined || value === '' || value === false) continue;` also skips an
  empty array.
- `registry.ts`: `attributes[name] = field.default ?? (field.type === 'boolean' ? false : '');` stringifies a
  number default, since `ComponentValues.attributes` holds `string | boolean` and a directive attribute is
  one flat string. A list default stays in the union, although `ATTRIBUTE_TYPES` refuses multiselect at run
  time, so `??` no longer compiles. Bind `const d = field.default;`, then write
  `typeof d === 'number' ? String(d) : typeof d === 'object' || d === undefined ? (field.type === 'boolean' ? false : '') : d`.
- Call sites: `git grep 'fields\.array('`. Tests hold 23 and the showcase config 3. One is the string at
  `vite-verify-nested-media.test.ts:42`, which `tsc` can't see. A call with no options gains
  `label: 'Items'`, since `label` is now required.

**Acceptance:** `fieldset-infer.test.ts` gains `fields.array({ item: fields.number({ label: 'N' }), label: 'L' })`
inferring `number[]`, `@ts-expect-error` on `fields.number({ label: 'N', default: '5' })` and on
`fields.image({ label: 'I', default: 'x' })`. `initialValues` tests assert `5` and `0` carry through a number
field, `['a']` through a multiselect, and `[]` writes no key. `registry` test asserts a number default seeds
`'5'`. Today `[]` and the `registry` case fail at run time, and the rest fail `npm run check` as compile
errors.

**Test:** `fieldset-infer`, `fieldset-validate`, the `registry` suite, and `npm run check`.

### T3. The read side, shape 16 and 17 (25 min, `runner`)

**Outcome:** `ContentSummary.fields` is `summaryFields`, `EntryRef` replaces `InboundLink` and
`ResolvedReference`, and `ManifestEntry.summary` is `excerpt`.

**Files:** `src/lib/delivery/{content-index,site-resolver,data}.ts`, `src/lib/content/{manifest,types}.ts`,
`src/lib/sveltekit/{index,content-routes-entry-read,content-routes-entry-destructive,content-routes-shared,content-routes-list}.ts`,
`src/lib/admin/DeleteDialog.svelte`, `src/lib/reproductions/stories/publish.ts`,
`packages/cairn-cms-dev/src/fake-github.ts`, the showcase pages and chassis, the showcase `index.json`, the
template through `npm run emit:template`, `scripts/checks/check-surface-reexports.json`, `skills/cairn-extending-a-site/references/content-model.md`,
and the tests.

- `content-index.ts`: the member `fields: Record<string, unknown>;` and `fields: summaryFieldValues,` become
  `summaryFields`. Reword `types.ts`'s two mentions of `ContentSummary.fields` and "each summary's `fields`
  record", and `concepts.ts`'s doc line, which T3 owns after T1.
- Pages: `data.featured.fields.description` at `(site)/+page.svelte:77-78` and `post.fields.description` at
  `EntryRow.svelte:32-33`.
- `manifest.ts`: `InboundLink` at `:486` becomes `export interface EntryRef { concept: string; id: string;
  title: string; permalink: string; excerpt?: string }`, tagged `@public`. `summary?: string;` on
  `ManifestEntry`, `summary: buildExcerpt(...)` at `:115`, `...(e.summary ? { summary: e.summary } : {}),` at
  `:150`, and `(e.summary === undefined || typeof e.summary === 'string') &&` at `:195` read `excerpt`.
- `site-resolver.ts`: remove `ResolvedReference`, import `EntryRef`, and change
  `if (target.excerpt) resolved.summary = target.excerpt;` to set `excerpt`.
- `content-routes-list.ts`: `EntrySummary.summary` stays, and the line that fills it reads `e.excerpt`.
- `data.ts`: export `EntryRef` in the content-type block in place of `ResolvedReference`.
  `sveltekit/index.ts`: `export type { InboundLink } from '../content/manifest.js';` names `EntryRef`, with one
  `check-surface-reexports.json` row: `EntryRef`, subpath `/sveltekit`, home `/delivery/data`, reason
  "R4 closure: `EditData`, `ContentFormFailure` name it on this subpath."
- `index.json`: the key is byte-for-byte a rename and `formatManifest` keeps its position, so replace `"summary":`
  with `"excerpt":` in `examples/showcase/src/content/.cairn/index.json`, then run `npm run emit:template`.
  `regenerateManifest` in `scripts/build/emit-template.mjs` writes the template's file from the showcase's, so
  never edit that one by hand.
- `fake-github.ts`: `summary:` at `:319,330,341,352,363,465,688` seeds manifest rows that aren't typed as
  `Manifest`, and `parseManifest` ignores an unknown key, so no check catches a miss. Rename the seven, and
  reword the comment at `:306`. Run `npm run check:dev-package`.
- Showcase: `entry-data.ts:7,32,34` and `ArticleView.svelte:21,27,54,56,58`, then `npm run emit:template`.
- `content-model.md:143`: `ContentSummary.summaryFields`.

**Acceptance:** `delivery-content-index` asserts `summaryFields.description` and no `fields` key on a summary.
`delivery-site-resolver` asserts `resolveReferences` sets `excerpt` and never `summary`. A `manifest` test
asserts `parseManifest` keeps `excerpt` and `formatManifest` writes it, and asserts
`formatManifest(parseManifest(raw)) === raw` for both committed `index.json` files, which fails if the rename
missed a key or moved one and needs no install. After the pair merges, the session runs
`(cd examples/showcase && npx cairn-manifest)` per Pre-flight, and `git status` stays clean. `git grep -n -E 'InboundLink|ResolvedReference' -- src/lib examples/showcase/src
templates/waymark/src skills` prints nothing.

**Test:** the edited suites and `npm run check`.

### T4. The manifest build reports, #107, #133, #164, ergonomics 6, ergonomics 4 part 2 (40 min, `ordinary` plus `runner`, `model: opus`)

**Outcome:** `buildSiteManifest` returns the manifest and its problems, and `vite build` reports a problem
ahead of a dangling link, and a dangling link ahead of the stale verdict.

**Files:** `src/lib/content/{concepts,manifest}.ts`, new `src/lib/content/body-scan.ts`,
`src/lib/delivery/{manifest,data}.ts`, `src/lib/index.ts`, `src/lib/vite/internal.ts` (`virtualSource` only),
`src/lib/log/{events,events-list}.ts`, `tool/internal/logs/events.go`,
`scripts/checks/check-surface-reexports.json`,
`skills/cairn-extending-a-site/references/{log-events,content-model,migrate-content,public-routes}.md`, the
template through `npm run emit:template`, and the tests.

- #107, `concepts.ts`: a `validateDir(id, dir)` beside `validateUrlPolicy` throws
  `cairn: concept "${id}" dir "${dir}" must have no leading or trailing slash`. `defineConcept` and
  `normalizeConcepts` each call it first.
- `body-scan.ts`: `scanBody(body)` parses once with `remarkParse`, `remarkGfm`, and `remarkDirective`, and
  returns `{ deadHrefs: string[]; directives: string[] }`. A dead href is a `link` whose `cairn:` url
  `parseCairnToken` refuses, a `definition` or `image` with a `cairn:` url, an `html` node matching the regex
  below, or a directive attribute value starting `cairn:`. `directives` holds each `containerDirective` and
  `leafDirective` name once, never a `textDirective`, since `:word` is ordinary prose. For an `html` node,
  first strip comments with `/<!--[\s\S]*?(?:-->|$)/g`, then match inside a tag only with
  `/<[a-z][^>]*[\s"'](?:href|src)\s*=\s*["']?(cairn:[^"'\s>]*)/gi`. `[^>]*` crosses newlines on purpose, since a
  tag can span lines. Give each `visit` callback a statement body: a callback that returns `push`'s number
  moves the walk and skips nodes.
- `content/manifest.ts`: add `ManifestProblem` (`concept`, `id`, `path`, `draft`, `errors`),
  `SiteManifestBuild` (`{ manifest, problems }`), tagged `@public` so `delivery/manifest.ts`'s import clears
  `check:self-use`, and `verifyEntries(problems)`, which throws `cairn: <n> invalid entries:` then one
  `<concept>/<id>: <field>: <message>` line per error, counting non-draft problems only and passing when none
  remain. `verifyReferences` also walks each non-draft entry's `links` and throws
  `content link is dangling: <concept>/<id> links to <target>, which does not exist.`. A draft source is exempt
  because the prerender never renders one, and a reference edge keeps today's check. Export `ManifestProblem`
  and `verifyEntries` from `index.ts` beside `verifyManifest`, each `@public`.
- `delivery/manifest.ts`: `buildSiteManifest` returns `SiteManifestBuild`. For each
  file, after `parseMarkdown`, build `errors`: `errors.filename` when `isValidId(entryId(file.path))` fails, as
  `<stem>.md is not a valid entry filename: use lowercase letters, digits, and single hyphens`, and
  `errors.body` when `deadHrefs` is non-empty, as `cairn: link can't resolve: <first href>`. A validator failure
  merges its errors in, logs `content.entry_invalid` as today, pushes the problem, and `continue`s. Any other
  non-empty `errors` pushes the problem and keeps the row. Log `content.directive_unknown` with `concept`,
  `path`, and `name` for each name outside the known set: `adapter.rendering.components`'s names and every
  `slots[].name`, plus `include` and `figure`.
- `virtualSource`: `const built = buildSiteManifest(cairn, files);` becomes
  `const { manifest: built, problems } = buildSiteManifest(cairn, files);`, and verify mode's
  `'(verifyManifest(built, committed, cairn), verifyReferences(built), "ok")'` becomes
  `'(verifyEntries(problems), verifyReferences(built), verifyManifest(built, committed, cairn), "ok")'`, with the
  comment above it updated. Add `verifyEntries` to the generated import. `problems` is unused in write mode.
  That's fine, since T5 reads it.
- `data.ts`: export `SiteManifestBuild`, and `ManifestProblem` beside it as a recorded R4 re-export, with one
  `check-surface-reexports.json` row: `ManifestProblem`, subpath `/delivery/data`, home `.`, reason
  "R4 closure: `SiteManifestBuild` names it on this subpath."
- Log: add `'content.directive_unknown'` to `events.ts:37`'s union and `events-list.ts:31`'s list, and a
  `log-events.md` row after `content.entry_invalid`. Add `"content.directive_unknown",` after
  `"content.entry_invalid",` in `tool/internal/logs/events.go`, loading `standards:go-conventions` first.
  `TestEventVocabularyMatchesEngine` compares the two sets, and the fast lane doesn't select the tool gate
  for an `events.ts` change (#241). Run `make -C tool check` through `cairn-run-gate`.
- Skills: `content-model.md:210-212` adds `cairn: <n> invalid entries:` and `content link is dangling`, and
  says `content manifest is stale` now means the content is valid and the manifest is behind.
  `migrate-content.md:100-101` and `public-routes.md:100` gain the new headline, since the build reaches it
  first. Run `npm run emit:template`.
- Tests: `delivery-manifest.test.ts`, `delivery-create-site-resolver.test.ts`, and
  `commit-chain-build.test.ts` read `.manifest`.

**Acceptance:** `delivery-manifest.test.ts` proves, through the real builder, that a `My_Trip.md` non-draft
yields a problem naming the stem and keeps its row, that `[a][r]` with `[r]: cairn:posts/one`, `<a
href="cairn:posts/one">`, `[a](cairn:bad)`, and `:::cta{href="cairn:posts/one"}` each yield a body problem and
keep the row, and that a good inline `[a](cairn:posts/one)`, a `cairn:` token in a code fence,
`<!-- <a href="cairn:posts/old">gone</a> -->`, and `<pre><code>href="cairn:posts/one"</code></pre>` yield none.
`<img src="cairn:x">`, a single-quoted href, and a tag spanning two lines each yield a body problem.
A draft's problem is flagged `draft: true`, and `verifyEntries` passes on it. An unknown `:::calout` logs
`content.directive_unknown`, while a registered name, a slot name, `::include`, `:::figure`, and `:word` log
nothing. `vite-verify-references.test.ts` proves an invalid non-draft entry over a stale manifest throws
`invalid entries`, and a dangling `cairn:` link over a stale manifest throws `content link is dangling`, neither
reading `content manifest is stale`. `content-concepts.test.ts` proves `/src/content/posts` and
`src/content/posts/` each throw at `defineConcept` and `normalizeConcepts`.

**Test:** the edited suites and `npm run check`.

### T5. `vite dev` regenerates, and `cairn-manifest` reports, ergonomics 4 part 1 and ergonomics 5 (40 min, `ordinary`, `model: opus`)

**Outcome:** a stale manifest under `vite dev` regenerates once and the server starts. `cairn-manifest` prints
one line and exits 1 on an invalid non-draft entry.

**Files:** `src/lib/vite/{internal,bin,assemble}.ts`, `skills/cairn-extending-a-site/references/{content-model,migrate-content}.md`,
the template through `npm run emit:template`, and `src/tests/unit/{vite-manifest-dev-server,vite-site-facts,vite-verify-nested-media,vite-verify-references}.test.ts`.

- `virtualSource` write mode: `'formatManifest(built)'` becomes
  `'JSON.stringify({ manifest: formatManifest(built), problems })'`. `buildManifestFromVite` returns the parsed
  `{ manifest, problems }`, so the `JSON.parse(await buildManifestFromVite(...))` calls at
  `vite-verify-nested-media.test.ts:73`, `vite-verify-references.test.ts:80`, and `vite-site-facts.test.ts:99`
  change.
- A shared `applyManifest(root, built)`: read the committed file, run `carryPublishStamps`, write only when the
  bytes differ, and return `ManifestReport` (`{ entries, changed, problems }`). `changed` sums `diffManifests`'
  three lists, diffing the carried result against the committed file, so a stamped row doesn't count on every
  run. A committed file that's absent or won't parse counts every entry as changed. `writeManifest`
  returns it, and `writeSiteFacts` returns whether its bytes changed.
- `formatManifestSummary(report, factsChanged?)`: `index.json: 15 entries, 2 changed; site-facts.json unchanged;
  1 invalid: posts/hello: title: Title is required`. Omit the facts clause when `factsChanged` is undefined. A
  draft problem reads `1 invalid draft:`. With no problem the clause is absent. Many problems show the first
  plus a count, `40 invalid: posts/hello: title: Title is required (+39 more)`, and a mix carries both clauses.
- `bin.ts`: print that line to stdout. Set `process.exitCode = 1` when a problem is non-draft, through a pure
  `manifestExitCode(report)` so a test reaches it. The bin's header comment and `USAGE`'s
  `Exit codes: 0 written (or --help); 1 the write failed` gain the new case.
- Dev: add `WRITE_VIRTUAL_ID = 'virtual:cairn-manifest/write'` with a resolved id, a `resolveId` arm, and a
  `load` arm returning `virtualSource(opts, 'write')`. In `buildStart`, the `devServer` branch runs write mode
  through `loadFromDevServer` and `applyManifest`, then `checkSiteFacts`, and never runs verify. A stale
  `site-facts.json` still reaches `this.error` under dev, since the sheet scopes only the manifest. `this.warn`
  carries `cairn-manifest: regenerated ` plus the summary when bytes changed or a problem exists. A build keeps
  `runStartChecks` unchanged. An error from the load still reaches `this.error`.
- Comments: rewrite `internal.ts:7-9`'s "so a drift throws there and fails the build (or the dev server's start)",
  and drop "See the design spec, locked decision 1." from `:14`. Update `cairnManifest`'s doc comment. The
  comment at `:335` still says the bin can read "the content" globs, and no such option exists since
  ddcd3bcdc, so correct it.
- Skills: `content-model.md:151` says the plugin regenerates under dev and fails on drift under build.
  `migrate-content.md:98` says to read the summary line and its exit code, in place of "Its output must show no
  `content.entry_invalid`".

**Acceptance:** `vite-manifest-dev-server.test.ts`: a dev start with a stale file writes the new manifest once,
warns one `cairn-manifest: regenerated` line, loads `virtual:cairn-manifest/write`, never loads
`virtual:cairn-manifest`, and creates no nested server. A second start with the same bytes writes nothing and
warns nothing. `watchChange` then no second `buildStart` writes nothing. A dev start with a problem starts and
names it. A committed stamped entry counts as unchanged. `verifies the manifest and the site facts...` now pins
the write id in `loaded`, and `falls back to the nested verify server...` needs `FAKE_VITE`'s `:61` result to be
`JSON.stringify({ manifest, problems: [] })` over a valid serialized manifest, since the write path parses it.
`parseAdapterFacts` drops the unknown keys, so the adapter-facts read holds. The build path's "verifies once per
build" cases stay green unchanged, which proves `vite build` stays strict. Unit cases pin
`formatManifestSummary`'s four forms (none, one, one draft, many with a mix) and `manifestExitCode` at 0 for a draft problem and
1 for a non-draft one. A local check runs the real bin: add a titleless post to the showcase, `npx cairn-manifest`
prints the line and exits 1, then restore the tree.

**Test:** the edited suites and `npm run check`.

### T6. Editor copy, #179 and #181 (20 min, `ordinary`)

**Outcome:** no builder word on an editor screen, one wording for a stale head, and media strings that agree.

**Files:** `src/lib/admin/{EditPage,ShareLinkPanel,CairnMediaLibrary,MediaHeroField,MediaReplaceDialog}.svelte`,
`src/lib/sveltekit/{content-routes-entry-write,content-routes-entry-destructive,content-routes-media-shared,content-routes-settings,nav-routes}.ts`,
`docs/editors/{when-something-goes-wrong,manage-your-tag-vocabulary,manage-the-media-library}.md`, and the
tests that pin them. Load `cairn-following-admin-design` first, by `.claude/rules/admin.md`, and
`cairn-writing-docs` for the docs edits. Editor copy follows the Microsoft voice.

| Where | Today | Becomes |
|---|---|---|
| `EditPage.svelte:1956` | `this page references`, then `not yet published, which the build will flag until published.` | `this entry references`, then `not yet published. Publish {referenceWarning.includes(',') ? 'them' : 'it'} first.` |
| `content-routes-entry-write.ts:338` | `This file changed since you opened it. Re-read the draft and save again.` | `This entry changed since you opened it. Re-read the draft and save again.` |
| `content-routes-entry-destructive.ts:234,482` | `This file changed since you opened it. Reload and try again.` | `This entry changed since you opened it. Reload and try again.` |
| `content-routes-media-shared.ts:93` | `The media manifest changed since you opened it. Reload and try again.` | `The media library changed since you opened it. Reload and try again.` |
| `content-routes-settings.ts:157`, `nav-routes.ts:173` | `The site config changed since you opened it. Re-read the config and reapply your edits.` | `These settings changed since you opened them. Reload and reapply your edits.` |
| `ShareLinkPanel.svelte:193` | `Minting…` | `Creating…` |
| `CairnMediaLibrary.svelte:107,109,111,113` | `Asset deleted.`, `Asset replaced.`, `Assets deleted.`, `Asset uploaded.` | `Image deleted.`, `Image replaced.`, `Images deleted.`, `Image uploaded.` |
| `CairnMediaLibrary.svelte:112` | `Orphans purged.` | `Orphaned files removed.` |
| `CairnMediaLibrary.svelte:829,977` | `Asset` | `Image` |
| `CairnMediaLibrary.svelte:773` | `Not referenced` | `No references`, with the comment at `:767` updated |
| `MediaHeroField.svelte:607`, `MediaReplaceDialog.svelte:448` | `PNG, JPEG, WebP, or HEIC. We convert HEIC for you.` | `PNG, JPEG, WebP, GIF, AVIF, or HEIC. We convert HEIC for you.` |

`content-routes-media-shared.ts:99`'s `The site changed since you opened it. Reload and try again.` already
reads plainly, so it stays. `CairnMediaLibrary.svelte:1231`'s text stays with #172. Docs: `when-something-goes-wrong.md:58,89` quotes
the new save string, `manage-your-tag-vocabulary.md:72` the new settings string, and
`manage-the-media-library.md:14`'s caption says a No references label. Its `:34` and `:148` quote the new
flashes, and `:38`'s "JPEG, PNG, WebP, and GIF files" gains AVIF. Test pins that move:
`CairnMediaLibrary.test.ts:121,405`, `examples/showcase/e2e/media-library.spec.ts:312`, and
`examples/showcase/e2e/media-pass-b.spec.ts:182`. `:121` is a comment, so reword it and add the assertion. These
synthetic strings also move with the grep below: `NavTree.test.ts:94,97`, `tidy-settings.test.ts:223,226`,
`vocabulary-admin.test.ts:206,209`, `commit-log.test.ts:15`, and `CairnMediaLibrary.test.ts:421`.

**Acceptance:** `git grep -n -E 'Minting…|will flag|This file changed|media manifest changed|site config changed|Not referenced|Orphans purged|Assets? (uploaded|deleted|replaced)' -- src/lib src/tests examples/showcase/e2e docs/editors`
prints nothing. `npm run check:editor-quotes`, `check:docs-gate`, and `check:vale` pass. `/changed since you opened/i` keeps matching.
A new assertion in `CairnMediaLibrary.test.ts` beside `:121` pins `No references`. `MediaHeroField`'s and `MediaReplaceDialog`'s formats
line names each type `ALLOWED_TYPES` at `media/config.ts:18` holds, and a component test pins it. A fresh
`docs-fact-checker` reads the three pages at this commit, and a wrong claim is fixed.

**Test:** the edited component and integration suites.

### T7. Close (25 min, `runner`)

**Outcome:** docs, records, and review are complete, and the PR is ready for `cairn-cms-9b`.

**Files:** `CHANGELOG.md`, `MIGRATION-NOTES.md`, `BACKLOG.md`, `api-surface.md`, and this plan's removal.

- Docs search, per `.claude/rules/docs-with-code.md`, shown in the PR:
  `grep -rnEi "defineFieldset|fields\.array|ContentSummary\.fields|ResolvedReference|InboundLink|cairn-manifest|manifest is stale|invalid frontmatter|directive_unknown" docs/admin docs/editors skills`.
- `CHANGELOG.md` under `## Unreleased`, one entry per item. Expected `Consumers must:` lines: unwrap
  `defineFieldset` on each concept; move `refine` and `behavior` to the concept; stop reading `~standard` or
  `StandardInput`; pass `fields.array` a bag; give `default` its field's type; read
  `summary.summaryFields`; rename `InboundLink` and `ResolvedReference` to `EntryRef` and `.summary` to `.excerpt`;
  regenerate `index.json`; read `.manifest` from `buildSiteManifest`; fix a slash on `dir`, a bad stem, and a
  surviving `cairn:` href; expect exit 1 from `cairn-manifest` on an invalid entry. Each has a
  `MIGRATION-NOTES.md` bullet. `vite dev` no longer failing on a stale manifest is listed as a behavior change
  with no action.
- `BACKLOG.md`: #107, #133, #164, #179, and #181 move to `## Done`.
- Whole-branch `standards:diff-reviewer`, `standards:svelte-reviewer` for the `.svelte` files and load code, and
  `standards:daisyui-a11y-reviewer` for the media chip. One batched fix chain.
- PR body per `pass-core` "Close": `## Brief`, what landed, `## Decisions` (the design note's calls and any
  more), `## Planning misses`, `## Tooling`, the score, and retried tests as flake evidence. List every test
  changed for old behavior. Remove this plan, the design note, the review files, and the fold record in the last commit.

**Acceptance:** CI is green on the head, every review finding is folded, fixed, filed, or overruled, and
`npm run check:docs-gate` passes.
