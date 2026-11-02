# Field values: task plan

A slice cut forward from pass 4, slug `field-values`, class `ordinary` plus `runner` (three data files
under `scripts/checks/`, design note call 8). Initiative: `shared-standards`. Base: `d71e4401e`. Design
note: `docs/internal/plans/2026-11-01-field-values-design.md`. Sources: `design-audit/run-sheet.md`
"Pass 4" and "Run rules", `design-audit/design.md` "4. Content rules", ledger.md "## Rulings".

Path: 225 minutes against a design estimate of 170 and a ceiling of 340. No cut is needed.

## Pre-flight

Every task was read for owner steps and auto-mode gaps.

- **Geoff's steps:** none. No sign-in, secret, dialog, browser action, or permission rule.
- **Auto-mode writes:** none under `.claude/skills/`, `.claude/rules/`, or `CLAUDE.md` in the repo root.
  `npm run emit:template` regenerates `templates/waymark/.claude/skills/**` from the packaged `skills/`
  (T1, T3, T4, T6). That is generated output under workstation#192's line. A refusal is a stop, never a
  thing to route around.
- **Reads outside the worktree:** T2's test reads `~/Projects/{ecxc-ski,907-life,aksailingclub-org,cairn-pub}`
  by path, read-only, and never writes there.
- **Live accounts:** none.
- **`wrangler d1 --local` and stopping a test process:** not needed by any task.

## Backlog sweep

Scoped sweep at `d71e4401e`, by a fresh read-only agent. The keeps and rewords land on this branch in
the plan's commit. A full sweep isn't due: the stamps are recent, and the sheet runs one at pass 8's
close.

| Item | Verdict | Reason |
|---|---|---|
| #100 | fold | T5. The arms are in a pass file, and E7 already edits `FieldInput.svelte:376`. |
| #101 | fold | T6. One condition at `fieldset.ts:231`, plus the `ValueOf` branch. The placeholder half is already documented. |
| #118 | fold | T1. E7 removes the arm that rewrites the value, and E12 keeps a timestamp as written. |
| #99 | fold | T1. The members go with `DatetimeField`. |
| #162 | fold | T4, resting on T2. After E12 every timestamp arrives as text, so `fieldset.ts:295` already refuses it and only the message is new. |
| #163 | fold | T4. The boolean arm alone misses an undeclared `draft`, so `concepts.ts:231` covers that. |
| #143 | reword | Only `help` is left, outside this pass's lines. Pass 5 keeps it. |
| #32 | reword | ROADMAP has no `inFeeds` entry to retire, and the cite moved to `types.ts:398`. Pass 3 keeps it. |
| #98 | keep | The wrapper changes, but the fix is a new public export this design never priced. T7 cuts its "an unquoted timestamp parses to a `Date`" clause. |
| #107, #164 | keep | Real, and pass 4 holds them. |
| #134, #41 | keep, unstamped | Each is another open branch's item (`wiring-core` moots #134, `tidy-lists` carries #41), so this branch leaves those lines alone. The sweep's stale cites go to those branches through the conductor. |

## Stops and standing answers

The sheet's standing answers apply to every task. These are this pass's.

- **Plan over 340:** cut E12 first, which is T2 and T3. E7, #100, #101, #162, and #163 may not be cut.
- **T2's test finds a difference other than a date read:** stay on `gray-matter`. Restore
  `src/lib/content/frontmatter.ts`, skip T3, list the file and key under `## Decisions`, keep the backlog
  line "the dependency sweep carries E12", and go on to T4 with its Date arm.
- **T2's test finds a date difference:** that's the expected case, 42 of 420 files at planning. The
  wrapper keeps the text as written, which is the sheet's fix in the wrapper, as #162's root. A date
  value with a time of day is listed in the PR, because T4 refuses it at the next rebuild. Nothing
  stops.
- **A site's content moved since planning:** the test runs against the checkouts as they stand. Report
  the new counts, and apply the two answers above.
- **A test outside this plan fails on removed code:** it pins old behavior, so change it and list it under
  `## Decisions`. A test that only exercises a removed kind or arm leaves with it. This is not R6's
  retirement list, which waits for Geoff.
- **`docs/internal/engine-rulings.md`:** leave it. Pass 1b writes every call, and E7 and E12 reverse
  nothing there.
- **A real dependency the map missed:** set the item aside for pass 4, list it under `## Decisions`,
  and go on.
- **Stale transcript block** (`packages/create-cairn-site/test/fixtures/transcripts/01-create-cairn-site.txt`
  shows `js-yaml` and `gray-matter` lines): leave page and fixture alone, and list it for the
  recapture.
- **Merge chores:** `templates/waymark`, `scripts/checks/api-surface.md`, and `CHANGELOG.md` are rerun at
  each merge. Keep them current on the branch, and merge `origin/main` only when `cairn-cms-9b` says.
- **Gates:** every leg goes through `cairn-run-gate`, per `cairn-pass` "Gate" and "Fast lane". After
  each task, `node scripts/checks/gate-tier.mjs --fast --range <base>..HEAD` prints the legs. A `.svelte`
  change adds the component project.
- **`docs/STATUS.md`:** the conductor batches it. Touch it only for a stop.
- **Questions:** none is expected. A stop goes to `docs/STATUS.md` for `cairn-cms-9b`, per the prompt.

## Tasks

Order: T1, T2, T3, then pair T4 and T5, then T6, then T7. Run the fast lane after each task. T4 and T5 are
disjoint: T5 owns `fields.ts`, and T4 owns `fieldset.ts`. T6 follows the pair because it edits both.

### T1. Remove `datetime` and `email`, E7 (40 min, `runner`)

**Outcome:** the two kinds are gone from the type, the builders, the validator, the decoders, the
forms, and the directive attributes. #118 and #99 are moot.

**Files:** `src/lib/content/fields.ts`, `fieldset.ts`, `frontmatter.ts`,
`src/lib/admin/FieldInput.svelte`, `ComponentForm.svelte`, `src/lib/render/registry.ts`,
`src/lib/index.ts`, `src/lib/delivery/data.ts`, `src/lib/sveltekit/index.ts`,
`scripts/checks/check-options.mjs`, `check-self-use-allowlist.json`, `check-surface-reexports.json`,
`api-surface.md`, `skills/cairn-extending-a-site/references/{content-model,components-and-islands,migrate-content}.md`,
their template copies through `npm run emit:template`, and the tests below. Load
`cairn-following-admin-design` first, by `.claude/rules/admin.md`.

- `fields.ts`: remove `EmailField` and `DatetimeField`, their two lines in `FieldDescriptor`, and the
  builders `email: <const O extends Omit<EmailField, 'type'>>(o: O): EmailField & O => ({ type: 'email', ...o }),`
  and `datetime: <const O extends Omit<DatetimeField, 'type'>>(o: O): DatetimeField & O => ({ type: 'datetime', ...o }),`.
- `fieldset.ts`: remove `EMAIL_RE`, `if (type === 'datetime' && value instanceof Date) return datetimeInputValue(value);`,
  the `case 'email'` arm, and `case 'datetime':` from the shared `case 'datetime': case 'icon':` arm.
  Reword the comments that say `datetime` at `:125`, `:307-309`, `:325-326`, and the `@remarks`
  sentence "(a numeric `number`, a `Date` on a `datetime` field, a lone scalar on a `multiselect`)" to
  name `a `Date` on a `date` field`. T3 rewords it again.
- `frontmatter.ts`: remove `datetimeInputValue`, the `case 'datetime':` arm of `formValues`, and the
  `case 'email':` and `case 'datetime':` labels in `decodeField`, `frontmatterFromForm`, and `formValues`.
  Fix the three comment lists that name them (`:54`, `:170`, `:362`).
- `FieldInput.svelte`: `inputType` keeps `url` only, so its return type becomes `'url' | undefined`.
  Remove the `'email'` and `'datetime'` cases from `assertFieldInputArmsExhaustive`, and change "a
  sixteenth arm" to "a fourteenth arm". The arm comment "url, email, datetime, and the text fallback"
  (`:154` and `:372`) drops the two names.
- `ComponentForm.svelte`: the same in `inputType` and `assertComponentFormArmsExhaustive`.
- `registry.ts`: `ATTRIBUTE_TYPES` loses `'email'` and `'datetime'`, and the error at `:289` and the
  `@remarks` at `:301` lose them.
- Barrels: remove `DatetimeField` and `EmailField` from all three.
- `scripts/checks`: remove `'DatetimeField.type': BUILDER_TAG,` and `'EmailField.type': BUILDER_TAG,`,
  the two allowlist entries, and the four `check-surface-reexports.json` entries. Line 82 of the
  allowlist says "same shared-helper scenario as EmailField": rewrite it to stand alone.
- Tests: `fields-exports`, `fields-descriptors`, `fieldset-validate`, `content-frontmatter`,
  `content-types`, `root-barrel-prune`, `field-input`, `ComponentForm`, `edit-page-v2-fields`, and
  `form-renderer-family-guard`. A case for a removed kind leaves with it.
- Skills: `content-model.md` `fields.text`, `textarea`, `number`, `url`, `email`, `date` (`YYYY-MM-DD`),
  `datetime`, `boolean`, loses the two. `components-and-islands.md:27` likewise.
  `migrate-content.md:33-34` loses "A `datetime` field needs the timestamp as a quoted string with its
  offset."

**Acceptance:** `npm run check` passes. `git grep -nE "fields\.(datetime|email)|DatetimeField|EmailField|datetimeInputValue|case 'datetime'|case 'email'" -- src/lib scripts/checks skills`
prints only `api-surface.md` lines the update removes, so nothing after `npm run check:surface -- --update`.
`npm run check:options`, `check:self-use`, and `check:surface` pass. `fields-exports.test.ts` asserts
`email` and `datetime` are not keys of `fields`, which fails against today's `fields.ts`.

**Test:** the edited suites, with the component project.

### T2. Prove the round trip, then swap the wrapper, E12 (45 min, ordinary, `model: opus`)

**Outcome:** `parseMarkdown` and `serializeMarkdown` run on `yaml`, and a test over all four sites proved
it first. `gray-matter` stays installed for this task, because the test compares against it.

**Files:** `src/lib/content/frontmatter.ts`, `src/lib/content/frontmatter-region.ts`,
`src/tests/unit/e12-site-roundtrip.test.ts` (new, removed in T3), `src/tests/unit/content-frontmatter.test.ts`.

Write the test and the new wrapper in the working tree, and run the test before committing. The commit
is the gate: if the test finds a non-date difference, nothing of the swap lands, per the stop.

The wrapper:

- `frontmatter-region.ts`: widen `const m = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);` to
  `/^---[ \t]*\r?\n(?:[\s\S]*?\r?\n)??---\r?\n?/`. Probed: `---\n---\nbody\n` matches the two fences,
  `---\n---\nx\n---\ny` stops at the second line, `--- \ntitle: a\n---\n` matches, `----\na\n---\n` and an
  unclosed `---\ntitle: a\n` don't.
- `parseMarkdown`: replace `const parsed = matter(source, {});` and its comment. Strip one leading BOM
  (`﻿`, as `references.ts` names it), call `splitFrontmatter`, take the text between the fences,
  parse it with `yaml`'s `parse` (core schema, no options), and treat a null result as `{}`. A file
  with no block returns `{ frontmatter: {}, body }` with the BOM-stripped body. A parse failure still
  throws, on every read, because `#106` needs it and `yaml` has no cache.
- `serializeMarkdown`: replace `return matter.stringify(body, frontmatter);`. Write `yaml`'s
  `stringify(frontmatter, { singleQuote: true, lineWidth: 0 })` between `---` fences, followed by the body
  with one trailing newline added if it has none. An empty record writes the body alone. These match
  `gray-matter/lib/stringify.js`'s `if (matter !== '{}')` and `newline()`.
- Update the file header and the two doc comments that name `gray-matter` here. T3 removes the import.

The test, `describe.skipIf` on any of the four roots being absent, so CI skips it and T2 and T3 run it
locally:

- Walk every `.md` under each root, skipping `node_modules`, `.git`, `.svelte-kit`, `.claude`, `build`,
  `dist`, and `.wrangler`. Assert each root yields at least one file with frontmatter, so a moved
  checkout can't pass by reading nothing. Planning counted 93, 39, 275, and 13 files.
- For each file, compare `parseMarkdown(src)` against `matter(src, {})`: the body exactly, and the whole
  record deeply, undeclared keys included. A `Date` on the `gray-matter` side and a string on the other
  counts as a date difference. Every other mismatch is a failure, reported with file and key.
- For each file, assert `parseMarkdown(serializeMarkdown(frontmatter, body))` returns the same record
  and body, so an undeclared key survives a save.
- Print the counts: files, with frontmatter, date differences, and any date with a time of day.

Permanent cases in `content-frontmatter.test.ts`, each failing against today's wrapper or pinning a
named behavior: a bare `date: 2024-03-15` reads as the string `2024-03-15`; `2024-03-15 20:00:00 -08:00`
reads as that text; an undeclared key survives parse and serialize; `'123'`, `'true'`, and `'2026'`-shaped
strings reparse as strings; a long `description` stays on one line; `---\n---\nbody` has an empty record;
a BOM is stripped; CRLF fences work; a comment-only block is `{}`; malformed YAML throws on two reads
in a row.

**Acceptance:** the site test passes locally with non-zero counts on all four roots, and its printed
counts go in the PR body. Rerun it with one site file copied to a temporary root and changed to
`a: 10:30`: it must fail, which proves a non-date difference stops the swap. Discard that copy.

**Test:** `npx vitest run src/tests/unit/e12-site-roundtrip.test.ts src/tests/unit/content-frontmatter.test.ts`,
then the fast lane. Other suites may pin single-quoted output or `Date` reads: change each and list it.

### T3. Finish the swap and retire the Date arms, E12 (40 min, ordinary)

**Outcome:** no engine file imports `gray-matter`, the dependency is gone, and no code path expects a
`Date`.

**Files:** `src/lib/content/media-rewrite.ts`, `references.ts`, `frontmatter.ts`, `frontmatter-region.ts`,
`fieldset.ts`, `identity.ts`, `fields.ts`, `package.json`, `package-lock.json`,
`examples/showcase/package-lock.json`, `skills/cairn-extending-a-site/references/{content-model,migrate-content}.md`,
`src/tests/unit/dist-sveltekit-app-import-boundary.test.ts`, `examples/showcase/e2e/media-hero.spec.ts`, and
each test that pins a removed behavior.

- `media-rewrite.ts`: `const data = matter(markdown).data as Record<string, unknown>;` at `:225` and `:494`
  become `parseMarkdown(markdown).frontmatter`. Remove the import. Reword the comments at `:8`, `:191`,
  `:217`, `:311`, `:475`, `:483`, and `:558-559` to say "the frontmatter parser" or `parseMarkdown`.
- `references.ts`: `needsQuoting` keeps its contract with `typeof parse(id) !== 'string'` over `yaml`'s
  `parse`. A date-shaped id now reparses as a string, so it stops being quoted: that's correct, and
  the test that pins `'2026-01-02'` changes. Reword the comments at `:3`, `:73`, and `:150`.
- Remove the Date arms: `if (type === 'date' && value instanceof Date) return dateInputValue(value);` in
  `coerceToText`, the `if (value instanceof Date)` block in `dateInputValue`,
  `if (value instanceof Date) return dateInputValue(value);` in `referenceIdFromValue`, and the first line
  of `asDate`. Rewrite each doc comment that explains the arm, including `dateInputValue`'s "gray-matter
  parses an unquoted YAML date into a JS Date", `referenceIdFromValue`'s "A Date (a YAML-parsed unquoted
  date-shaped id)", `asDate`'s "An unquoted YAML date parses as a JS Date", the `formValues` comment "a
  YAML-parsed Date becomes its UTC-sliced id, never String(Date) timezone garbage", `coerceToText`'s
  header, and `validateField`'s "a Date on a date or datetime field". The `@remarks` of `defineFieldset`
  drops the `Date` example.
- `frontmatter-region.ts:3-4`: the comment names `gray-matter`, reword it.
- Run `npm uninstall gray-matter`, then `npm install --package-lock-only --prefix examples/showcase`.
  `js-yaml` leaves with it. Delete `src/tests/unit/e12-site-roundtrip.test.ts`, whose history is T2's
  commit.
- `dist-sveltekit-app-import-boundary.test.ts:43` and `media-hero.spec.ts:104` name `gray-matter` in a
  comment: reword. `frontmatter-reference-roundtrip.test.ts:50,64` and `references.test.ts:118` name
  `js-yaml`: reword, and change what they pin.
- Add one test that a `serializeMarkdown` output with an unquoted `src: media:<hash>` still repoints
  through `repointMediaRef` and `fillAltForHash`, since the write form changed from quoted to plain.
- Skills: in `content-model.md`, delete "A bare YAML date in an undeclared key is rewritten as a full ISO
  instant (`2026-01-01T00:00:00.000Z`)." and cut `date` from "A text-type field reads a non-string
  value (an unquoted number, date, or boolean) as empty." In `migrate-content.md`, `parseMarkdown`
  now returns a date as text: `const toDay = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0]);`
  loses its `Date` arm, and "Text-type fields read a number, date, or boolean as empty" loses `date`.
  T4 owns the "Dates." and "Drafts." bullets.

**Acceptance:** `git grep -nE "gray-matter|js-yaml|instanceof Date" -- src/lib package.json skills examples/showcase/e2e`
prints nothing. `npm ls gray-matter js-yaml` prints `(empty)` at the root, unless another dependency
still pulls `js-yaml`, which the PR then names. `npm ci --prefix examples/showcase` passes on the
updated lockfile. `npm run package` and `npm run check:package` pass. The new media test fails if
`findSrcLinesInRange` can't anchor an unquoted token.

**Test:** the fast lane with the component project, then `npm test -w packages/create-cairn-site`, since
the scaffold's template reads the packaged engine. CI's `e2e` is the bundling proof: `frontmatter.ts`
reaches the admin's client bundle through `isClosedMultiselect` in `FieldInput.svelte`, so `yaml` does
too, in place of `gray-matter` and `js-yaml`.

### T4. Refuse a time of day and a non-boolean, #162 and #163 (30 min, ordinary)

**Outcome:** the sheet's two product defaults, in the validator and the build gate.

**Files:** `src/lib/content/fieldset.ts`, `src/lib/content/concepts.ts`,
`skills/cairn-extending-a-site/references/{migrate-content,content-model}.md`,
`src/tests/unit/fieldset-validate.test.ts`, a build-gate test beside the existing `createSiteResolver`
tests.

- #162, in `validateField`'s `case 'date':`, ahead of
  `if (!isCalendarDate(text)) return { issues: [{ path, message: `${label} must be a valid date (YYYY-MM-DD)` }] };`:
  a text that opens with a calendar date followed by `T` or a space returns
  `${label} has a time of day. Write the date alone: ${day}`, where `day` is the leading `YYYY-MM-DD` as
  written. `siteProblems` already prefixes `${descriptor.dir}/${problem.id}: ${field}: `, and
  `buildSiteManifest` logs `content.entry_invalid` with `path`, so the file is named on both routes.
  `dateInputValue`'s string slice stays, so the admin opens the entry on the written day and a save
  writes the date alone.
- **If T2 set E12 aside:** the `Date` arm stays. `coerceToText` then hands the validator a sliced day,
  so the check runs on the raw `value`: a `Date` that isn't UTC midnight returns the same message with
  its UTC day. Update the acceptance's day to `2024-03-16` and say so in `## Decisions`.
- #163, in `validateField`'s boolean arm,
  `return value === true ? { value: true, issues: [] } : { issues: [] };` becomes: `true` stores `true`;
  `false`, `undefined`, `null`, and `''` omit the value, which keeps the empty-reads-as-absent rule;
  anything else returns `${label} must be true or false`. Update the header comment at `:150-151`,
  which says "anything else omits the value".
- #163, undeclared `draft`, at `concepts.ts:231`, `validate: (frontmatter, body) => fs.validate(frontmatter, body, id),`:
  when the fieldset declares no `draft`, run the raw `draft` through a module-level
  `defineFieldset({ draft: fields.boolean({ label: 'Draft' }) })` after a passing `fs.validate`, and return
  its failure. `concepts.ts` imports `Fieldset` and `FieldDescriptor` as types today, with a layering
  note at `:23`: check that a value import of `defineFieldset` and `fields` doesn't cycle. `fieldset.ts`
  imports only `frontmatter`, `field-rules`, `ids`, and `log`. Update `ConceptConfig`'s doc comment on
  `draft` in `types.ts:98` only if it states the old read.
- Skills: `migrate-content.md`'s "Dates." bullet becomes: a `date` field takes `YYYY-MM-DD`, and a value
  with a time of day fails the build, naming the file and the day as written, so write the date alone,
  taking the day from the filename when it carries one. The "Drafts." bullet becomes: only boolean
  `true` or `false` is valid, and `draft: 'true'` or `draft: yes` fails the build, while `published: false`
  still reads as published, so map each old marker to `draft: true`. The symptom row
  "| `date: ... must be a valid date (YYYY-MM-DD)` | Not a real date (an unquoted `2024-13-45` rolls over
  silently instead) |" loses its parenthesis, and a new row covers the time of day. Add the boolean
  rule to `content-model.md`.

**Acceptance:** a test builds a concept with no `draft` field and two raw files, `date: 2024-03-15 20:00:00 -08:00`
and `draft: "true"`, and `createSiteResolver` throws naming both ids, `2024-03-15`, and `draft: Draft
must be true or false`. Each assertion fails against today's code, where the first validates as the next
day and the second publishes. `draft: true`, `draft: false`, and an empty `draft:` pass, and a declared
`draft: fields.boolean(...)` reports once. A directive with a boolean attribute still validates, through
`validateComponent`.

**Test:** the fast lane.

### T5. Render bounds as input attributes, #100 (25 min, ordinary)

**Outcome:** the browser refuses what the save would refuse, for length and date bounds.

**Files:** `src/lib/admin/FieldInput.svelte`, `src/lib/admin/ComponentForm.svelte`,
`src/lib/content/fields.ts`, `src/tests/component/field-input.test.ts`, `ComponentForm.test.ts`. Load
`cairn-following-admin-design` first.

- `FieldInput.svelte`, textarea arm at `:218`: add `minlength` and `maxlength`. `length` sets both, and
  otherwise `min` and `max` set them. Date arm at `:264`: add `min={field.min}` and `max={field.max}`.
- The fallback arm at `:376` serves `text`, `url`, `icon` with no icon set: add the length attributes only
  when `field.type === 'text'`, by the same rule. `pattern` stays out, because the browser anchors it.
- `ComponentForm.svelte`, the fallback `<input>`: the same, for a `text`, `textarea`, or `date` attribute.
- `fields.ts`: rewrite the doc comments that say "Enforced at the save, never rendered as an input
  attribute" on `TextField.min`, `max`, `TextareaField.min`, `max`, and "Enforced at the save, never
  rendered on the input" on `DateField.min`, `max`. `TextField.pattern` keeps its sentence. `length`'s
  comment gains the attribute.

**Acceptance:** a component test mounts each of `text` with `max`, `text` with `length`, `textarea` with
`min`, and `date` with `min` and `max`, and reads the attribute off the control, and a `url` field
carries no `maxlength`. Each fails against today's markup.

**Test:** the fast lane with the component project.

### T6. Let `creatable` widen the set, #101 (15 min, ordinary)

**Outcome:** a creatable multiselect saves a value outside `options`, and its inferred type says so.

**Files:** `src/lib/content/fieldset.ts`, `src/lib/content/fields.ts`,
`skills/cairn-extending-a-site/references/content-model.md`, `src/tests/unit/fieldset-validate.test.ts`,
`src/tests/unit/content-types.test.ts`.

- `fieldset.ts`, the multiselect arm: `const { options } = field; if (options) {` applies only when
  `!field.creatable`. Reword the arm's header comment.
- `ValueOf`: add `D extends { type: 'multiselect'; creatable: true } ? string[]` ahead of the arm
  `D extends { type: 'multiselect'; options: readonly (infer O extends string)[] }`.
- `fields.ts`: `options` loses "including under `creatable`", and `creatable`'s comment "Render an open
  comma-separated tag input instead of checkboxes. A value outside `options` still fails the save."
  says the value is kept.
- `content-model.md`: state it where `multiselect` is taught.

**Acceptance:** `validate({ topics: ['new'] }, '')` on `fields.multiselect({ label: 'T', options: ['a'], creatable: true })`
returns `ok: true`, and the same without `creatable` still returns the unknown-value error. A type test
reads `InferFieldset` as `string[]` with `creatable: true` and as the literal union without it. A
taxonomy under a vocabulary still refuses a new tag: the existing `enforceTaxonomy` route test passes
unchanged.

**Test:** the fast lane.

### T7. Close (30 min, ordinary)

**Outcome:** the PR is ready for `cairn-cms-9b`.

- **Docs search,** per `.claude/rules/docs-with-code.md`. Run
  `grep -rnE "fields\.(email|datetime)|time of day|valid date|must be true|creatable|maxlength|unquoted" docs/admin docs/editors skills`,
  read every hit, and show the command and its result in the PR. At planning, no page under `docs/admin` or
  `docs/editors` teaches a changed behavior. If that holds, no docs page changes and `docs-fact-checker`
  has nothing to read. If a hit needs an edit, load `cairn-writing-docs`, and the fact-check runs.
- **`CHANGELOG.md`** under `## Unreleased`, in its existing `Consumers must:` style: one entry for E7,
  naming `fields.text` with a `pattern` for an address and `fields.date` plus a text field for a moment;
  one for E12, naming `parseMarkdown`'s text dates, the YAML 1.2 readings, the ended language tag, the
  unclosed block, and the changed write form; one each for #162, #163, #101, and #100. `MIGRATION-NOTES.md`
  gains the matching per-version lines.
- **`BACKLOG.md`:** move #100, #101, #162, and #163 to `## Done` with their proof, and #118 and #99 with
  `done: fields.datetime removed (E7)`. In #98, cut "and an unquoted timestamp parses to a `Date`" and
  `matter.stringify`, since neither is true after T3.
- **Surface and template:** `npm run check:surface -- --update`, `npm run emit:template`, and commit both.
- **Review:** whole-branch `standards:diff-reviewer` against this plan and the design note, then
  `standards:svelte-reviewer` for `FieldInput.svelte` and `ComponentForm.svelte`, and
  `standards:daisyui-a11y-reviewer` for their markup. Fold every `fix`, rerun the fast lane, push, and
  confirm green CI on the head.
- **PR body,** per `pass-core` "Close": `## Brief`, what landed, T2's counts, the docs search,
  `## Decisions` with the design note's ten calls, `## Planning misses`, the retried tests, and the
  score.
- Delete the plan, the design note, and the prompts last. Mark the PR ready and report to `cairn-cms-9b`.

**Acceptance:** CI is green on the head, the review has no open finding, `## Unreleased` is final, and
`docs/internal/plans/` holds no `2026-11-01-field-values-*` file.

## Later

Offering `options` as suggestions on a creatable input. Refusing Jekyll's `published` key at build. Both
are outside this slice, and neither is filed unless a rebuild asks.
