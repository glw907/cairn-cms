# Mechanics and feasibility review: field-values plan at d9660da9a

From `standards:plan-reviewer`, saved by the planning session. Verdict: approve after one fold. T1 through
T7 build in order, with no owner fork.

## Findings, ranked by consequence

- **F1, blocker, `correctness`, plan T2.** The round-trip assertion compares the body exactly, but
  `serializeMarkdown` adds a trailing newline to a body that lacks one. One corpus file,
  `~/Projects/aksailingclub-org/docs/2026-07-29-assets-functional-input.md`, has none, so the test goes
  red with a non-date difference and the stop drops E12. Fold: compare the body modulo that newline, and
  say a mismatch in a file outside a content tree doesn't stop E12.
- **F2, major, `correctness`, plan T2.** The proof "rerun with a file copied to a temporary root" needs a
  root override the spec doesn't have, and without one the test skips or must be edited. A file on which
  a parser throws has no reported outcome, and a mid-edit site file would read as a stop. Fold: name the
  mechanism, treat both-throw as one outcome, one-side-throw as a difference, and give a changed file one
  rerun.
- **F3, major, `correctness`, plan T5.** `ComponentForm` sits in no submit form
  (`ComponentForm.svelte:261`, `ComponentInsertDialog.svelte:316`), so `minlength`, `min`, and `max` never
  block anything there, and the Outcome is false for it. `EditPage` holds up: no `novalidate`, and
  `onFormInvalid` (`:341`) reveals the control. The acceptance reads attributes only. Native behaviors go
  unstated: `maxlength` truncates a paste silently, lengths count untrimmed text, an over-long stored
  value trips nothing until edited, and a stored date outside bounds is invalid at once. Fold: split the
  Outcome, record the behaviors, add an `EditPage` test.
- **F4, minor, `correctness`, plan T4.** The claim about the admin is half true. `buildSiteManifest`
  drops an invalid entry, so it leaves the concept list with only a log line. The edit route still opens
  it by URL. Fold: correct the sentence and the `Consumers must:` line.
- **F5, minor, `correctness`, plan stops and T1.** The stop restores `frontmatter.ts` alone, though T2 also
  touches `frontmatter-region.ts` and two tests. On the skip-T3 path, `fieldset.ts:263-264` keeps "date or
  datetime". Fold: name all the files, and add `:264` to T1.
- **F6, minor, `correctness`, plan T2.** A scalar or list block returns a non-record from `parseMarkdown`,
  which is `gray-matter` parity and unstated. `stringify` writes `{}\n` for a record of undefined values,
  where `gray-matter` threw.
- **F7, minor, `correctness`, plan T3.** The acceptance grep excludes `src/tests`, which hides
  `content-frontmatter.test.ts:2`, a hard import failure after the uninstall, and comments at `:336`,
  `:349`, and `content-media-rewrite.test.ts:332`. Date pins at `content-identity.test.ts:59-61,84`,
  `fieldset-validate.test.ts:208`, and `references.test.ts:172` go unnamed, as do the comments at
  `fieldset.ts:186-187` and `frontmatter.ts:348-349`. `fields.ts` is in T3's Files with no bullet.
  `npm ls` exits 1 on an absent package, and nothing else pulls `js-yaml`.
- **F8, minor, `correctness`, plan T2.** It says T3 runs the site test, but T3 only deletes it.
- **F9, minor, `optional`, plan T4.** `concepts.ts:23` isn't a layering note, and the cycle check is
  already settled: nothing in the import closure imports `concepts.js`.
- **F10, minor, `correctness`, plan T7.** The docs search omits `draft`, frontmatter, YAML, and the write
  form, the terms #163 and E12 change. The reviewer's wider grep hit only a diagram label at
  `publish-and-history.md:67`, so the conclusion stands.
- **F11, minor, `correctness`, plan T7 and prompt.** Deleting the plan makes a new head after CI was
  confirmed. Fold: push and confirm CI on that head before marking ready.
- **F12, minor, `optional`, plan T1.** The grep restates `check:surface`, `check:options`, and the type
  check, except over `skills`.

## Checked and sound

Every quoted line compared matches source. T1's inventory is complete, with no showcase, template, Go
tool, or `docs/admin` hit, and the Go tool has no frontmatter reader. T4 and T5 are file-disjoint,
generated output included, and no leg goes red on a later task's work.

Probed: `singleQuote: true, lineWidth: 0` writes `'123'`, `'true'`, plain `2026-01-02`, `media:abc`, and
`10:30`; `2024-03-15 20:00:00 -08:00` reads as that text; empty and comment-only blocks read null; duplicate
keys and bad mappings throw on both sides; and the design's readings hold, plus `0o755`, which was a string
and is now 493. The new regex matched `gray-matter`'s body on all 420 files, and no test pins
`splitFrontmatter`. `src/tests/unit` is a node project, so `~/Projects` reads work and CI skips them.

The lock step works: on a scratch copy, `npm uninstall gray-matter` plus
`npm install --package-lock-only --prefix examples/showcase` removed both packages from both locks, with
about 66 harmless `oxide-wasm32-wasi` lines. No template, scaffold, or build script names `gray-matter`.
`findSrcLinesInRange` is quote-agnostic. `siteProblems` prints `dir/id: draft: Draft must be true or
false`, and an undeclared `draft` can't refuse a save. The `ValueOf` branch works with the builder's
`const` capture, and `closeTaxonomyField` keeps taxonomies closed. `engine-rulings.md` names none of these
items. Pre-flight has no owner step and no write outside the named set, and the estimate adds to 225.
