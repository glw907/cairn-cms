# retire-1's docs inventory, for draft docs pass A

Agent-facing. This is the inventory the retirement's conductor owes draft docs pass A before that
pass runs, per the retirement spec's Choreography step 4
(`docs/superpowers/specs/2026-09-21-doctor-retirement-design.md:352-359`). It says exactly what
pass retire-1 adds or changes under `tool/docs/` and which Go tests name those paths, so pass A's
precondition 4 (`docs/superpowers/plans/2026-09-21-draft-docs-pass-a.md:44-48`) resolves against a
written list rather than a re-survey.

Written from the retire-1 plan (`docs/superpowers/plans/2026-09-21-doctor-retire-1-go.md`) before
that pass executed. **The conductor refreshes this file with the merge SHA when retire-1 merges**,
and a divergence between this list and the merged tree is what pass A's precondition 4 stops on.

Tool-side line numbers are as read on branch `cairn-tool-b2` at its committed head **`3dc2520f`**
(2026-09-21), through `git show`. B2 merges before retire-1 branches, so every line below is
re-verified against `main` at pass A's own task 1.

## Under `tool/docs/reference/`, after retire-1

The whole directory, which pass A's precondition 4 reads: **seven `*.schema.json` files and four
markdown pages.**

### Added by retire-1

| Path | What it is |
| --- | --- |
| `tool/docs/reference/cairn-doctor.schema.json` | The seventh schema. The `cairn doctor --json` payload. Named by the convention the six share, `cairn-<payload kind, kebab>.schema.json`. `$id` is `https://cairn.pub/schema/cairn-doctor.schema.json`. |
| `tool/docs/reference/cli-cairn-doctor.md` | The command's page, written as **interim** operator copy. Pass A drafts the public page fresh from a mining read and never renames this one into place (spec `:375-378`; pass A plan `:57-59`). |

### Changed by retire-1

| Path | The change |
| --- | --- |
| `tool/docs/reference/json-output.md` | Four edits: the lede's schema list (`:6-7`) names the seventh; "The six payloads" (`:16`) becomes seven with a `cairn doctor --json` row; a new `## The doctor payload` section; and in `## What freezes at 1.0` the check-id bullet (`:287-288`) gains a scoped sub-bullet naming the eleven `cairn doctor` check ids, with the freeze sentence amended to say an addition to a published id list is a minor-version event and a rename or a removal major. The doctor payload section also states that for `cairn doctor` the frozen `reason.not-run` means the check's precondition did not apply, and that a doctor `info` is written `state: pass` with its text in a doctor-only `note` key, since the five wire state words are frozen. **No state word and no reason code is added**, so `TestDocPublishesTheWholeReasonVocabulary` is unchanged. No other sentence on the page is rewritten. |
| `tool/docs/reference/exit-codes.md` | One added section, `## cairn doctor`: the command makes at most one request so it has no row in the requests-per-check table, it reads no credential and no registry, and exit 3 covers a usage error, a run whose only non-passing results are `unknown`, and a directory that is not a cairn site. The four codes, the precedence rule, and the usage-error rule are untouched. |

### Unchanged by retire-1

`tool/docs/reference/log-events.md` and all six existing schemas
(`cairn-adopt-list`, `cairn-auth-check`, `cairn-health`, `cairn-health-summary`, `cairn-logs`,
`cairn-sites-list`).

## Elsewhere under `tool/docs/`

| Path | The change |
| --- | --- |
| `tool/docs/adr/0002-render-dependencies.md` | Amended: YAML (`go.yaml.in/yaml/v3`) promoted from indirect to a fifth direct require, recorded as a promotion rather than a choice, and recorded as belonging to the module rather than to `internal/render`. Its Status line (`:5-9`) gains one amendment note. **Pass A does not touch `tool/docs/adr/`** (pass A plan `:70-71`), so this is informational. |

Nothing else under `tool/docs/` changes. `tool/docs/credentials.md`,
`tool/docs/release-candidate-notes.md`, `tool/docs/tripwire.md`, and everything under
`tool/docs/design/` are untouched by retire-1.

## Go tests that name these paths

### Existing on B2's head, which retire-1 modifies

| Test | Location on `3dc2520f` | What it reads, and what retire-1 does to it |
| --- | --- | --- |
| `TestEveryGoldenValidatesAgainstItsSchema` | `tool/internal/render/json_schema_test.go:196` | Validates every golden against the schema published beside it, resolved through `schemaDir` (`:26`, `"../../docs/reference"`). retire-1 adds a doctor case to `jsonGoldens` (`:45`) and the seventh schema to the map. |
| `TestEverySchemaVersionIsOneBeforeTheTag` | `json_schema_test.go:399` | A literal table of schema file and version constant. retire-1 adds a seventh row and one sentence to the doc comment: a payload first published after `tool/v1.0.0` also starts at 1. |
| `TestDocNamesEveryFieldTheGoldensCarry` | `json_schema_test.go:472` | Reads `docPath` (`:29`, `"../../docs/reference/json-output.md"`) and fails on any golden key the page does not name in backticks. It picks up the doctor payload's keys automatically once the golden joins the corpus. |
| `TestDocCarriesBothFreezeLists` | `json_schema_test.go:514` | Reads the same page and asserts `## What freezes at 1.0` names every `health.All` check id, every verdict word, and all five state words. retire-1 **adds a loop** asserting the frozen section also names all eleven `cairn doctor` check ids, read from the `doctor` package's own registry rather than a literal. |
| `TestDocPublishesTheWholeReasonVocabulary` | `json_schema_test.go:551` | Reads the same page. retire-1 adds no reason code, so this test is unchanged and must stay green. |
| `TestSkipAndUnknownRequireAReason` | `json_schema_test.go:574` | Reads `cairn-health.schema.json` and drives its `if`/`then` conditional. The seventh schema carries the same conditional shape; retire-1 adds a sibling test for it or extends this one, and the implementer's report says which. |
| `TestTheSingleSiteBudgetFitsTheRequestArithmetic` | `tool/cmd/cairn/usage_test.go:542` | Reads `exit-codes.md`'s requests-per-check table and derives `defaultTimeout`. retire-1's added `## cairn doctor` section carries **no table row**, precisely so this test's arithmetic is untouched. |
| `TestTheSweepCapIsThePublishedOne` | `tool/cmd/cairn/usage_test.go:568` | Reads `exit-codes.md`'s sweep-cap sentence. Untouched by retire-1. |
| `TestExportedSurfaceIsPinned` | `tool/internal/render/purity_test.go:258` | Pins `render`'s exported names (`:224-246`). retire-1 adds **one** name, `DoctorSchemaVersion`. The marshaller itself lives in `internal/doctor`, not in `render`, so that `render` never imports a package carrying `net/http` (retire-1 plan, decision 9). Names no docs path, listed because pass A's task 3 and task 8 both edit this file's package. |
| `TestRenderDirectRequiresArePinned` | `tool/internal/render/purity_test.go:186` | Asserts `renderDirectRequires` (`:170-175`) and the module's total direct-require count against `otherDirectRequires` (`:181`). retire-1 moves that integer from 4 to 5 for the YAML promotion. Names no docs path; listed so pass A does not read the change as drift. |

### Added by retire-1

| Test | Where | What it reads |
| --- | --- | --- |
| The eleven-id loop inside `TestDocCarriesBothFreezeLists` | `tool/internal/render/json_schema_test.go` | `tool/docs/reference/json-output.md`'s frozen section. |
| A page-coverage test for the command page | `tool/cmd/cairn` or `tool/internal/doctor`, named in retire-1's Task 9 report | `tool/docs/reference/cli-cairn-doctor.md`, asserting it names every one of the eleven check ids. **This is the one new test whose only input is the interim page**, so it is the test pass A's task 8 must repoint or retire when the page moves to `docs/reference/cli-cairn-doctor.md`. |

## New under `tool/`, outside `tool/docs/`

Not in pass A's scope, listed because pass A's task 3 touches `tool/testdata/` and its task 1
surveys the goldens.

- `tool/internal/doctor/**`: the new package, its tests, its corpus under
  `tool/internal/doctor/testdata/corpus/`, and its text-report goldens under
  `tool/internal/doctor/testdata/golden/`.
- `tool/internal/render/testdata/json/doctor.json`: the seventh payload golden. Pass A's task 1
  enumerates the goldens "one line each"; this is the line retire-1 adds.
- `tool/internal/spine/conditions.go` and its test: the `go:embed` of the pre-task's
  `conditions.json`, and the constant-set test replacing `TestConditionsMatchRegistry`'s regex read
  of `src/lib/diagnostics/conditions.ts` (`tool/internal/spine/condition_test.go:52-85` on
  `3dc2520f`). After retire-1 that file names `providers.RepoRoot` nowhere.
- `tool/testdata/doctor-agreement.md`: the committed status-mapping table the retirement spec's
  acceptance requires (`:394`). A record, never a gate; no Go test reads it.
- `tool/testdata/copy.golden.md`: regenerated, gaining a `doctor` section, because
  `tool/cmd/copylist/main.go`'s `catalogues()` (`:50-66`) gains a fourth package.
- `tool/CHANGELOG.md`: a new `## Unreleased` heading with retire-1's entry. The `1.0.0` entry is
  released history and is untouched.
- `tool/go.mod` and `tool/go.sum`: `go.yaml.in/yaml/v3` moved from the indirect block to the direct
  one. No module joins the build graph.

## What retire-1 does not do

- **No `tool/v1.1.0` tag and no release.** Pass A's precondition 2 checks exactly this.
- **No file under `docs/` is added or moved.** Every page and schema this pass writes lives under
  `tool/docs/reference/`, which is what leaves pass A free to draft the public pages fresh. The
  memory ruling `cairn-cli-is-part-of-the-system` is why.
- **No edit to `.github/workflows/tool.yml`.** Its two `paths` lists already cover `tool/**`. Pass
  A's task 8 adds the `docs/reference/` entries.
- **No edit to `docs/internal/README.md`.** `check-arm-indexes.mjs:28-34` walks `docs/internal`
  non-recursively, and `docs/internal/README.md:99-106`'s `## record/` section states that it
  deliberately does not enumerate the files under `record/`. This record is linked from
  `docs/superpowers/plans/2026-09-21-doctor-retire-1-go.md` and from the conductor's handoff to
  pass A, which is the filing this directory's own rule asks for.
