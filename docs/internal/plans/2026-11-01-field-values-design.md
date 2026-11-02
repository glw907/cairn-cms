# Field values: just-in-time design note

A slice cut forward from pass 4 of the run sheet (`~/.local/state/cairn-agent-first/design-audit/run-sheet.md`).
Geoff's approval is cleanup design 20261101T122027-138291, run sheet 20261101T125326-233255, and his chat
ruling of 2026-11-01 on skipping forward ("We have quite a few passes ahead, so you can skip forward if
there aren't linear dependencies."). This note records only what the code and a probe settled at
`d71e4401e`. Initiative: `shared-standards`. It reverses no ruling.

## Outcome

- **E7:** `fields.datetime`, `fields.email`, `DatetimeField`, and `EmailField` are gone. #118 and #99
  close with them.
- **E12:** `gray-matter` and `js-yaml` leave the engine. `yaml`, already a dependency, reads and writes
  frontmatter behind `parseMarkdown` and `serializeMarkdown`.
- **#162:** a `date` field refuses a value with a time of day, and the build names the file and the day
  it read.
- **#163:** a `boolean` field refuses a non-boolean, and `draft: "true"` fails the build whether or not
  the concept declares `draft`.
- **#101:** `creatable` widens a multiselect's `options` at save, and the inferred type follows.
- **#100:** `text`, `textarea`, and `date` bounds render as input attributes. `pattern` stays out.

One end-to-end check: a fixture site with `date: 2024-03-15 20:00:00 -08:00` on one entry and
`draft: "true"` on another, in a concept that declares no `draft` field, makes `createSiteResolver`
throw, naming both files, `2024-03-15` as the day, and the `draft` key. Under `gray-matter` the first
built as `2024-03-16` and the second published.

## The probe

A planning probe compared `gray-matter` 4.0.3 (with `js-yaml` 3.15.2) against `yaml` 2.9.1 on every
`.md` file in the four site checkouts, on 2026-11-01. It compared the whole parsed record, so
undeclared keys are in it. Scripts: `$CLAUDE_JOB_DIR/tmp/probe-e12{,b,c}.mjs`, which don't outlive this
session. T2 reruns the same comparison through the real wrapper.

| Measure | Result |
|---|---|
| Files, with frontmatter | 420 (ecxc 93, 907 39, sailing 275, cairn.pub 13), 119 |
| Same record, `yaml` core schema | 378 |
| Differ only in a date read | 42 |
| Differ in anything else | 0 |
| Parse throws on either side | 0 |
| Date values that aren't a plain `YYYY-MM-DD` | 0 (every Date is UTC midnight from a bare date) |
| Same record, `yaml` with `customTags: ['timestamp']` or `version: '1.1'` | 420 |
| Body identical to `gray-matter`'s, through `splitFrontmatter` | 450 of 450, showcase content included |
| `yaml.stringify` reparses to the same record | 119 of 119 |
| `draft` values | 9 `false`, none non-boolean; no `published` key |

## What the code settled

These are reversible calls inside the approved scope. Each goes under the PR's `## Decisions`.

1. **Dates stay the text they were written.** `yaml`'s core schema reads `2024-03-15` as a string, which
   is the "date differs" case in the sheet's stop. The sheet's answer is to fix it in the wrapper first,
   as #162's root, and #162's root is that the offset is lost at parse. So the wrapper keeps the core
   schema and adds no `timestamp` tag: the day as written survives, and #162 reads it from the text. A
   `timestamp` tag would match `gray-matter` exactly and keep the bug. Every `instanceof Date` arm
   (`fieldset.ts:129`, `frontmatter.ts:207`, `:269`, `identity.ts:30`) becomes dead and goes. The swap
   also retires the UTC-instant rewrite of a bare date in an undeclared key that `content-model.md`
   warns about, and a text field's silent drop of an unquoted date.
2. **"A difference" in the stop means a value, not a byte.** The stop guards what a site reads. Quote
   style on the next save changes no value, and `gray-matter` already rewrites a hand-written block on
   its first save. The test compares values and bodies, and reports byte form as a count.
3. **`singleQuote: true` and `lineWidth: 0` on the write.** `references.ts` and the docs treat
   `author: '123'` as the committed form of a significant id, so single quotes keep that shape.
   `lineWidth: 0` keeps every scalar on one line, which the line-based rewriters in `media-rewrite.ts` and
   `references.ts` read. Measured against `gray-matter`'s dump of the same record, 58 of 119 blocks are
   byte-identical. Of the 61 that differ, 42 lose the quotes on a bare date and the rest are a dropped
   quote pair or fold on a string that needs neither.
4. **`splitFrontmatter` becomes the one boundary.** Its doc comment says it's "Shared by every arm so
   they agree on the boundary", and `gray-matter` was the arm that didn't. `parseMarkdown` strips a BOM
   and calls it. Its regex widens to accept an empty block and spaces after the opening fence, which
   `gray-matter` accepted. Two `gray-matter` readings end, neither in any corpus file: a language tag
   after the fence (`---yaml`, and `---js`, which `gray-matter/lib/engines.js` runs through `eval`), and
   an unclosed block, which it read as frontmatter to the end of the file and which now reads as no
   frontmatter.
5. **YAML 1.2 core replaces `js-yaml` 3's dialect.** `10:30` was 630 and is now the string `10:30`,
   `0755` was 493 and is now 755, `1_000` and `0b11` stay strings, and `<<` merge keys stop merging. Each
   reads closer to what an author wrote, and none is in any corpus file. The test would stop the swap
   if one were.
6. **`draft` is checked at the concept, beside the fieldset.** The scaffold declares no `draft` field
   (`#163`'s sweep note and `content-model.md`), so a `boolean` arm alone leaves `draft: "true"`
   published. `content-index.ts:128` and `manifest.ts:116` read the raw key. The concept's `validate`
   (`concepts.ts:231`) runs an undeclared `draft` through a one-field fieldset, so the message and the
   rule are the `boolean` arm's. An empty `draft:` reads as absent, as every other field does. A
   directive's booleans are real booleans (`component-grammar.ts:125`), so the arm can't refuse one.
7. **`creatable` needs a type change too.** `ValueOf` infers `O[]` from `options`, which would lie once
   a creatable value leaves the set. A taxonomy under a vocabulary stays closed: `closeTaxonomyField`
   sets `creatable: false` (`taxonomy-enforce.ts:40`), and `enforceTaxonomy` runs separately, so the
   widening doesn't reach it.
8. **The class is `ordinary` plus `runner`.** E7 must edit three data files under `scripts/checks/`
   (`check-options.mjs:352-353`, `check-self-use-allowlist.json:26,31,82`, and
   `check-surface-reexports.json:138,144,438,456`). The prompt said `ordinary`. The conductor merges
   either way, and a `runner` pass adds a record packet first. This changes who is told, not what is
   built.

9. **Two tag-era keeps fall with E7, and `options` loses its display under `creatable`.** `slim.md`
   says no ruling names either kind, but `check-self-use-allowlist.json:26,31` cites the tag keeps
   `audit-adapter-datetimefield` and `audit-adapter-emailfield`. Neither is in the live ledger, so
   nothing here edits it, and call 9 of the cleanup design covers the removal. Under `creatable`,
   the tag input never showed `options`, and #101's default leaves that as it is.
10. **A `Date` passed in by hand reads as empty.** After E12 nothing in the engine produces one. A
    developer calling `validate` or `'~standard'` with a `Date` gets the empty-value path, so the
    change is a `Consumers must:` line, not a kept arm.

## Out of scope

Everything else in pass 4 stays there: #107, #133, #164, #179, #181, shape 4, 9, 15, 16, 17, Standard
Schema, and ergonomics 4, 5, and 6. `FieldBehavior`, `refine`, and `'~standard'` stay until shape 9.
Jekyll's `published: false` isn't an engine-read key, so it stays a migration step. A `datalist` of
`options` on a creatable input isn't asked for.

## Dependencies

The dependency map held. `#106` landed in `d71e4401e`'s history, with the `parseMarkdown` comment E12
retires. No pass 3 name is required: E7 removes four barrel lines and `check-surface-reexports.json`
entries that pass 3 retires anyway. `concepts.ts`, `manifest.ts`, and the barrels sit near `wiring-core`
and pass 1a, in distant hunks.
