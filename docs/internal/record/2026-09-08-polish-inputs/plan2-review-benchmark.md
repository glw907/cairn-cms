# Benchmark review of plan two: the toolset at the implementation level

Adversarial review of `docs/superpowers/plans/2026-09-08-docs-toolset-pass.md` (revision 1), one
lens only: for each script, gate, template, schema, and corpus artifact the plan builds, how does
its design compare to how the surveyed documentation programs implement the nearest equivalent, and
is there an off-the-shelf tool or rule set the task should adopt instead of writing one. Read-only.
Sources fetched 2026-09-08; repository claims measured against the working tree at `d565ab77` plus
the uncommitted figures state.

This review sits under the spec-level benchmark
([`docs-spec-review-benchmark.md`](docs-spec-review-benchmark.md)) and does not re-argue it. Where a
spec-level finding was settled by an owner decision, this review takes the decision as given and
asks only whether the plan implements it the way the field implements the same thing.

## Method and what changed since the spec review

The spec review compared programs by what they gate. This review fetched the implementations: the
`github/docs` content linter and its test harness, `markdownlint` and `markdownlint-cli2`'s current
rule list, the `remark-lint` plugin ecosystem, Vale's extension points and the `errata-ai` packages'
own fixture harness, the `kubernetes/website` archetypes and Makefile, GitLab's `lint-doc.sh`,
`.markdownlint-cli2.yaml`, and the 51-rule `gitlab_base` Vale style, and the link-check workflows of
four programs. Two spec-level claims did not survive the fetch, and both change what plan two should
build.

## Ranked findings

Ordered by cost avoided, heaviest first. Each names its task id and a verdict.

### 1. G1-4, G1-6, G2-3, G2-4, G2-5, G2-6, H2: one npm script per rule family is not how the field packages a docs linter. **Change.**

The field runs one linter binary with many registered rules. `github/docs` has 46 custom rules in
[`src/content-linter/lib/linting-rules/`](https://github.com/github/docs/tree/main/src/content-linter/lib/linting-rules),
each a plain markdownlint custom-rule object:

```ts
export const tableColumnIntegrity = {
  names: ['GHD047', 'table-column-integrity'],
  description: 'Tables must have consistent column counts across all rows',
  tags: ['tables', 'accessibility', 'formatting'],
  severity: 'error',
  function: (params, onError) => { /* ... */ },
}
```

They are registered in one config object
([`src/content-linter/style/github-docs.ts`](https://raw.githubusercontent.com/github/docs/main/src/content-linter/style/github-docs.ts))
that maps rule name to `{ severity, 'partial-markdown-files', 'yml-files' }`. GitLab does the same
at smaller scale: `markdownlint-cli2` with one custom rule loaded through `customRules`
(`./doc/.markdownlint/rules/unnecessary_traversal.js`) in
[`.markdownlint-cli2.yaml`](https://gitlab.com/gitlab-org/gitlab/-/raw/master/.markdownlint-cli2.yaml).
Two binaries, `markdownlint-cli2` and `vale`, carry GitLab's entire docs lint estate, invoked from
one [`scripts/lint-doc.sh`](https://gitlab.com/gitlab-org/gitlab/-/raw/master/scripts/lint-doc.sh).

cairn's CI already runs about thirty discrete `npm run check:*` steps in
`.github/workflows/test.yml`. Plan two adds eight more: `check:anatomy`, `check:headings`,
`check:provenance`, `check:prose-read`, `check:ledger`, `check:fact-coverage`,
`check:vale-fixtures`, and `lint:markdown`. Each arrives with its own argument parsing, its own
markdown stripping, its own path scoping through `docs-standard-scope.json`, its own fixture
directory, and its own vitest file. That is roughly 53 fixture files and 9 test files across the
G-chains for what the field expresses as rule registrations inside a runner that already parses the
markdown once and already has per-glob configuration.

G1-7 adopts `markdownlint-cli2` (MIT, `DavidAnson/markdownlint-cli2`, current 0.23.2). Once that
lands, the mechanical half of `check:headings` and part of `check:anatomy` belong inside it as
custom rules with `CAIRN###` ids and a `severity` field, not beside it as separate processes.
`markdownlint-cli2`'s glob-keyed config overrides are also the mechanism `docs-standard-scope.json`
hand-builds, which would remove a contended file from three tasks at once (the plan's Reconciliation
table lists five tasks writing that one JSON file).

**Adopt:** `markdownlint-cli2` custom rules for the heading and structural checks; keep standalone
scripts only for the two gates that read artifacts markdownlint cannot see (`check:ledger` over the
five ledger files, `check:prose-read` over `receipts.md`).

### 2. G1-5, G1-6: five of the seven heading rules are Vale rules, and rule 1 already ships and already runs. **Change.**

The spec justifies `check:headings` with "Vale sees one line at a time, and parallelism needs the
whole page, which is why the script must exist"
(`2026-09-08-docs-standard-design.md`, line 367). That premise is wrong. Vale has eleven extension
points and a `scope:` selector that reaches `heading`, `paragraph`, and `sentence`
([docs.vale.sh/topics/styles](https://docs.vale.sh/topics/styles/)). Rule by rule:

| Rule | Vale mechanism | Status in this repo today |
|---|---|---|
| 1. Sentence case | `extends: capitalization`, `scope: heading`, `match: $sentence` | **Already shipping and already running.** `.vale/styles/Google/Headings.yml`, active on `docs/**` at warning |
| 2. One level-one heading | markdownlint MD025 | G1-7 |
| 3. No skipped levels | markdownlint MD001 | G1-7 |
| 4. No leading `-ing` form | `extends: existence`, `scope: heading`, one `raw` pattern | Not written |
| 5. Verb-first for task sections | `extends: existence` with a pattern generated from `verb-lexicon.json`, or `extends: sequence` (POS-tagged) | Not written |
| 6. Siblings in one form | Needs whole-document state. Vale's `extends: script` (Tengo) reaches it; a script rule is also fine | Not written |
| 7. Question headings only under `docs/editors/` | `extends: existence`, `scope: heading`, scoped by a `.vale.ini` section, which is how `docs/editors/**` already gets Microsoft instead of Google | Not written |

Rule 1 is the largest single saving. `Google.Headings` is `extends: capitalization, scope: heading,
match: $sentence`, verified live at
[errata-ai/Google/Headings.yml](https://raw.githubusercontent.com/errata-ai/Google/master/Google/Headings.yml)
and present in `.vale/styles/Google/Headings.yml` in this repo. Promoting it to error is a
`.vale.ini` line plus the severity contract's clearing work, and the clearing work is small:
`vale --minAlertLevel=warning --output=line docs README.md` reports **17 `Google.Headings`
findings** across the published set today. Seventeen headings, against a new script with seven rules,
fourteen fixtures, a committed verb lexicon, and a `heading-grammar.md` explainer.

Note the field position on the two rules that need judgment. GitLab's 51-rule `gitlab_base` style
has **no heading-case rule at all** and no verb-first rule; sentence case is a style-guide convention
GitLab does not gate. Its only heading-text rule is `HeadingContent.yml` (warning), which flags
generic headings such as "Overview" and "Limitations". So rules 5 and 6 are cairn's own invention on
top of a convention the largest surveyed Vale user does not machine-check.

**Adopt:** raise `Google.Headings` to error in `.vale.ini` after clearing 17 headings; write rules 4,
5, and 7 as three Cairn Vale rules inside the fixture harness G2-2 already builds. Keep a script for
rule 6 alone, or express it as a `markdownlint-cli2` custom rule per finding 1. G1-5's lexicon
survives either way, as the data a rule reads.

### 3. G2-2: the length rules duplicate a shipped rule on the editors track, and the paragraph hedge is answerable now. **Change.**

`Microsoft.SentenceLength` already runs on `docs/editors/**` and is exactly the shape the plan
proposes to author:

```yaml
extends: occurrence
message: "Try to keep sentences short (< 30 words)."
scope: sentence
level: suggestion
max: 30
token: \b(\w+)\b
```

A new `Cairn.SentenceCeiling` at 25 words on the same track means two findings on the same sentence
in two vocabularies. Set `Microsoft.SentenceLength` off in that `.vale.ini` section, or override its
`max` to 25, rather than shipping a parallel rule.

G2-2's file list hedges: "`.vale/styles/Cairn/ParagraphBounds.yml` **or the equivalent script check
if Vale cannot hold a paragraph measure**." It can. `extends: occurrence` with `scope: paragraph`
counts sentence terminators per paragraph the same way `Microsoft.SentenceLength` counts words per
sentence, and `extends: metric` evaluates a formula over a block's token, word, and sentence counts.
Resolve the hedge in the plan rather than leaving an implementer to discover it, since the fallback
branch quietly adds a ninth script.

### 4. G2-2: the must-fire fixture design is weaker than the precedent it cites. **Change.**

The benchmark cites errata-ai's per-rule fixtures as precedent, correctly. The actual convention is
more specific than "one fixture per rule", and the two mechanics the plan omits are the two that
make it work:

- **`fixtures/<Rule>/.vale.ini` plus `test.md`**, a minimal one-rule configuration, and
  **`testdata/<Rule>.ct`**, a [go-cmdtest](https://pkg.go.dev/github.com/google/go-cmdtest) golden
  recording the literal CLI line and its exact expected output:

  ```
  $ cdf ${ROOTDIR}/fixtures/Headings
  $ vale --output=line --sort --normalize --relative --no-global --no-exit .
  test.md:1:3:Google.Headings:'Test: Modern documentation management' should use sentence-style capitalization.
  ```

- **`--no-global`.** Without it the fixture run inherits a developer's global Vale configuration and
  the harness is not hermetic. `--sort`, `--normalize`, and `--relative` are what make the golden
  stable across machines. `main_test.go` drives every `.ct` case through the real binary in CI, and
  the workflow installs a pinned Vale release, which is precisely the version-skew guard cairn wants.

G2-2's acceptance criterion is "fails when any Cairn rule reports zero findings on its own fixture."
That is a weaker assertion than the precedent: a rule that fires on the wrong line with the wrong
message passes it, and a section override that silently rescopes a rule to a different path still
produces one finding. Assert the exact `file:line:col:Rule:message` output, snapshot-style, as
errata-ai does.

**Adopt** the invocation and the golden-output form. The `.ct` file format is Go-specific; the Node
equivalent is a vitest snapshot of the same normalized output string. Licences: `errata-ai/Google`
and `errata-ai/Microsoft` are both MIT.

### 5. G1-1: no surveyed program hand-writes a YAML parser; two of the three use a schema library. **Change.**

`github/docs` parses frontmatter with `js-yaml` and validates it with **ajv** against a JSON Schema,
then remaps ajv's `instancePath` and `params` into a friendly property name for the error message
([`read-frontmatter.ts`](https://raw.githubusercontent.com/github/docs/main/src/frame/lib/read-frontmatter.ts);
`package.json` pins `ajv ^8.18.0` and `js-yaml ^5.2.2`). `cloudflare/cloudflare-docs` and
`withastro/docs` both validate with **zod** through Astro content collections
([content.config.ts](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content.config.ts)).
None hand-rolls parsing.

G1-1 says "write the parser" and names no dependency. cairn has no YAML library today (`js-yaml` and
`yaml` both fail `require.resolve`), so a dependency is being added either way, or an implementer
writes a YAML subset parser by hand and the plan has not said which. The field's answer, in cairn's
non-Astro context, is `js-yaml` (MIT) or `yaml` (ISC) for parsing plus `ajv` (MIT) or `zod` (MIT)
for the schema.

Take the second half of the pattern too: `brief-schema.md` should be generated from, or checked
against, the machine schema. The plan already applies exactly this discipline to `check:ledger`
("The validator reads its column names from `ledger-schema.md`'s stated set and fails when a ledger's
header row does not match, so the schema and the gate cannot drift apart"); the brief deserves the
same and does not have it.

### 6. G1-1: the briefs will ship in the npm tarball, and the task's own acceptance criterion will fail. **Change.**

`package.json`'s `files` array lists `docs/reference`, `docs/admin`, `docs/editors`, and
`docs/extend` as **directories**, and npm includes a listed directory recursively. A sidecar brief at
`docs/extend/add-a-custom-admin-screen.brief.yml` is therefore packed. G1-1's criterion reads: "No
brief path is added to `package.json`'s `files` array, and `npm run check:package` proves no
`*.brief.yml` reaches the tarball." Those two clauses contradict each other; adding nothing to
`files` is what causes the briefs to ship. The fix is a negation entry (`!docs/**/*.brief.yml`) plus
a new assertion in `scripts/checks/check-package-files.mjs`, which today asserts only that at least
one `migrations/*.sql` is present and has no exclusion logic at all.

The field avoids this class of problem by putting page metadata **in the page's own frontmatter**:
Kubernetes' `content_type`, GitHub Docs' `type` and layout schema, Microsoft Learn's required
metadata. A sidecar is defensible here, because the `sentences` list is per-sentence and would
overwhelm a frontmatter block and because cairn ships raw markdown that cairn.pub renders. But the
sidecar is the reason the packaging trap exists, and the plan should name it.

### 7. G1-4: markdownlint MD043 carries part of `check:anatomy`, and nothing off the shelf carries the rest. **Adopt in part; keep the remainder.**

markdownlint **MD043 `required-headings`** takes an ordered array of exact heading strings with
wildcards (`*` zero or more, `+` one or more, `?` exactly one unspecified), enforces order, and
optionally case ([md043 doc](https://github.com/DavidAnson/markdownlint/blob/main/doc/md043.md)).
`markdownlint-cli2` supports glob-keyed config overrides, so a per-directory required-heading array
is expressible today with no new code. It cannot dispatch on a brief's `type` field, so a page whose
type does not follow its directory still needs the script.

Everything else was searched and is not available. The `remark-lint` ecosystem has heading style,
duplication, and punctuation plugins and **nothing that enforces a required ordered section list per
page type**. Vale has no document-structure extension point. So on the central novel item the
spec-level benchmark ranked as "genuinely novel, keep", the implementation-level answer agrees:
`check:anatomy` builds something that does not exist.

Worth recording what the strongest page-type registry in the field actually costs. Kubernetes'
archetypes are HTML comments:

```
---
title: "{{ replace .Name "-" " " | title }}"
content_type: task
---

<!-- overview -->

## {{% heading "prerequisites" %}}
{{< include "task-tutorial-prereqs.md" >}}

<!-- steps -->

<!-- discussion -->

## {{% heading "whatsnext" %}}
```

They are scaffolding used at `hugo new` time. Nothing in `kubernetes/website`'s Makefile, `scripts/`,
or its three GitHub workflows validates that a page's declared `content_type` matches its body, and
the repo runs no markdownlint at all. Its CI gates are the Hugo build, `htmltest` for internal links,
and a custom spellchecker.

**Adopt:** MD043 for the types that map cleanly to a path glob (the reference entries, the track
indexes). Keep `check:anatomy` for brief resolution, the corpus-approval check, and type-dispatched
order, and keep the constraint that the templates are its only source.

### 8. H2, G2-3, G2-4: the gates are cairn's own, but three scripts should not each re-derive what a sentence and a fence are. **Keep the gates; change the substrate.**

No surveyed program extracts fact tokens or resolves sentences to a claim ledger, and the recorded
failure earns both gates. The implementation note is about the shared primitives. G2-3 imports
`measure-prose.mjs`'s sentence splitter, which is the right instinct, and `measure-prose.mjs` is 102
lines of regex that strips fences, tables, headings, and links by hand and splits sentences on
`/(?<=[.!?])\s+(?=[A-Z"'(`])/`. `check:fact-coverage` (H2) then needs its own fence handling for
`kind: block` entries, `check:anatomy` needs headings, `check:headings` needs headings.

Two off-the-shelf substrates apply. `Intl.Segmenter` with `granularity: 'sentence'` is Node standard
library, no dependency, and is the correct answer for sentence segmentation. A markdown AST
(`remark` / `mdast`, MIT, which is what markdownlint itself reaches through micromark) is the correct
answer for locating headings, fences, and tables once rather than five times with five different
regexes. Divergent strippers across five scripts is the same drift class the plan already guards
against between `ledger-schema.md` and `check:ledger`.

### 9. C1, C2, C3: the corpus excerpts what the field links to, and the standard cairn enforces says not to. **Change the default mode.**

Google's own style guide, the standard `.vale.ini` puts every published page under, is explicit:

> Don't copy content from another source because it might violate copyright. Instead, paraphrase
> and link to their content.

It names open-source product documentation specifically, "varying licenses create uncertainty", and
closes with "when uncertain, don't use it"
([developers.google.com/style/other-sources](https://developers.google.com/style/other-sources)).

The precedent the spec-level benchmark cites for an exemplar set does not survive the fetch either:
Astro's paired good-and-bad examples in its
[writing style guide](https://contribute.docs.astro.build/guides/writing-style/) are **original prose
written for that guide**, not quoted from published documentation. No surveyed program vendors
third-party prose into its repository as a corpus. Searching for the practice returned no engineering
precedent at all.

C2's `reference-only` mode is already the field-conforming answer: URL, fetch date, and the measured
numbers, with no committed text. It is currently the exception, taken only when a licence forbids an
excerpt. **Invert it.** Make `reference-only` the default and `excerpt` the exception that requires a
permissive licence and a stated reason. That keeps every measurement C4 needs, keeps the exemplar's
authority (a reviewer opens the URL), keeps the corpus useful to `check:anatomy`'s approval check,
and removes the licence question from all but a handful of entries. It also removes the plan's one
artifact that a copyright complaint could force out of git history.

### 10. C1, C2, C3: the licensing columns are right and the rules behind them are missing. **Change.**

The plan's handling is better than most: a `license` column that must name a specific licence or the
words "no redistribution grant", a `mode` column, a `## Source` section per entry naming source, URL,
licence, and fetch date, and a rule routing non-permissive sources to `reference-only`. Four gaps
against the licences the spec's exemplar table actually names.

**Verified clean** for a 400-word attributed excerpt, no share-alike spillover onto an MIT
repository: SQLite (public domain, [sqlite.org/copyright.html](https://sqlite.org/copyright.html)),
Kubernetes docs and Cloudflare docs (both CC BY 4.0, confirmed from each repository's LICENSE),
GitHub Docs content (CC BY 4.0), Go proposals (BSD-3-Clause), Kubernetes KEPs (Apache-2.0).

- **Share-alike is on the exemplar list and the plan has no rule for it.** GitLab docs are CC BY-SA
  4.0 (confirmed from the docs.gitlab.com footer badge). Mozilla SUMO is commonly CC BY-SA, version
  unverified from a live page. Quoting verbatim with the licence marked is fine inside an MIT
  repository, because the repository licence governs its code and not text plainly marked as
  separately licensed. **Adapting** is not: an adaptation must carry SA forward. The banked Go sample
  already records itself as "unedited apart from rewrapping and the removal of one heading", which is
  an edit. Add the rule: a share-alike source is quoted byte for byte or it is `reference-only`,
  never trimmed or rewrapped.
- **Stripe grants nothing.** It is named as the `reference-table` exemplar, and its Services Agreement
  reserves all rights in the documentation ([stripe.com/legal/ssa](https://stripe.com/legal/ssa)).
  C2's "no redistribution grant" covers it, but name Stripe as the worked case so an implementer does
  not reach for fair use. The field does not invoke fair use as policy anywhere I could find.
- **Attribution mechanics beyond a licence name.** BSD-3 requires the copyright notice reproduced;
  Apache-2.0 requires attribution and notice of changes. The two banked design-document samples cite
  the licence and reproduce neither notice. C1 fixes the `## Source` shape for every later entry, so
  the notice text for those two classes belongs in the shape, not just the licence name.
- **DigitalOcean is unverified.** Secondary sources report CC BY-NC-SA 4.0; the live tutorial pages
  are JavaScript-rendered and the static footer carries only a plain copyright notice. If NC is
  correct it bars the use outright. Treat it as `reference-only` unless verified from the page itself.

### 11. C1, C4, D2: spec-benchmark finding 6 was lost rather than overruled. **Change.**

The spec-level benchmark recommended dropping the hinged-pair share from the corpus manifest's
recorded numbers and keeping it in the scanner's report, on the spec's own evidence that the
definition moved twice and that a splitter change moves a track figure by 17 points. Decision 7 moved
the instrument to tellgrader, which is a different question. The manifest schema in C1 still carries
a `hinged pairs` column, C4 fills it, and D2 requires it in the reviewer's measurement table. So an
unsound number is recorded in the manifest that plan three drafts against, which is the specific
authority the benchmark objected to. Either drop the column from C1 and D2 or record the overrule
with its reason.

### 12. D3: decision 2's accepted recommendation carries a review the plan does not schedule. **Change.**

The spec's decision row reads: "Keep eleven for plan one's registry, **then review after the
demonstration page shows what a template costs**", and the owner accepted the recommendations as
written. D3 measures the per-page cost and R2 records twelve templates as settled; no task performs
the review. This is the plan's largest standing deviation from the field and it is worth restating
now that the implementations are in hand: Kubernetes runs **four** content types over more than a
thousand pages, expressed as HTML comments in Hugo archetypes, with **no validator of any kind**;
GitLab runs no page-type registry. cairn proposes twelve types, twelve templates, twelve or more
corpus entries, and a validator, for 79 pages. Add the review to D3's deliverables, feeding R2.

### 13. G2-2, G2-8: decision 1's permanent warnings will never be seen by anyone. **Change.**

`check:vale` runs `vale --minAlertLevel=error`. Every warning is therefore invisible in CI today:
`vale --minAlertLevel=warning` over the published set currently reports 558 `Google.WordListCase`,
178 `Google.Colons`, 46 `Google.OxfordComma`, 23 `Google.WordList`, and 17 `Google.Headings`
findings, none of which anyone sees. Decision 1 settles the 25-word and 40-word ceilings at warning
"permanently, with no promotion path", and the plan adds no mechanism that surfaces a warning. As
specified, "warns permanently" ships as "is silent permanently", and the two rules G2-2 authors will
never affect anything.

The field has the mechanism. GitLab's `docs-lint markdown` job appends a `codequality` output
formatter with `severity: blocker` so findings land in the merge-request diff without failing the
job, and its Vale invocation uses a custom output template (`--output=doc/.vale/vale.tmpl`) for the
same purpose. GitHub Docs carries `severity` per rule in the config and runs the linter pre-commit as
well as in CI.

**Adopt:** a second, non-blocking Vale invocation at `--minAlertLevel=warning --no-exit` as its own
named CI step, or a Code-Quality-style report artifact. G2-8 already establishes the pattern for a
non-blocking step (the tell scanner "in report mode ... its absence never fails a build").

### 14. G1-7: take GitLab's markdownlint config shape, not stock defaults. **Adopt.**

GitLab's [`.markdownlint-cli2.yaml`](https://gitlab.com/gitlab-org/gitlab/-/raw/master/.markdownlint-cli2.yaml)
is the closest working model to what G1-7 needs and it is worth copying rather than rediscovering:

- `default: true` then per-rule overrides, which is exactly G1-7's "stock rules plus the disables
  this repository needs".
- `line-length` (MD013) with `code_blocks: false`, `tables: false`, `headings: true`,
  `heading_line_length: 100`, `line_length: 800`. Note for the plan: **MD013 measures characters per
  line, not sentence length.** It is not a back door to the length rules decision 1 settled, and the
  plan should say so, since an implementer reading "markdownlint carries the length rules" could
  wire it that way.
- `no-duplicate-heading: { siblings_only: true }` (MD024). At the stock setting this will fire hard
  across cairn's reference pages, which repeat `## Types` and similar section headings by design.
  This is the single most likely source of G1-7's step 1 clearing work.
- `proper-names` (MD044) with a product-name allowlist. This is where cairn's own proper nouns
  belong, and it partly overlaps the `Vocab = Cairn` list `.vale.ini` already carries; decide which
  owns it rather than maintaining two.
- `customRules` loading a local rule file, which is the hook finding 1 depends on.

One more mechanic: GitLab lints **only changed files** on an ordinary merge request
(`Tooling::FindChanges` filtered to `doc/*.md`, `.vale*`, `.markdownlint*`), and lints everything only
when the lint configuration itself changed. At 79 pages cairn does not need this, but it is where the
field goes and it is the answer if the eight new gates make CI slow.

Licences: `markdownlint` and `markdownlint-cli2` are both MIT (David Anson).

### 15. G2-7: the alt-text criterion is half already true and half already covered by markdownlint. **Change.**

G2-7's criterion reads: "`check:visuals` fails an image with no alt attribute, and its fixture proves
the previous behavior passed it." For markdown images that is already false today.
`scripts/checks/check-visuals.mjs` fails an empty markdown alt (`empty-alt`) and an alt over 150
characters, and has done so since the register's alt ceiling landed.

The real hole is narrower and the plan should name it precisely: `HTML_IMG_ALT_RE` is
`/<img\b[^>]*\balt="([^"]*)"[^>]*>/gi`, so an `<img>` that carries **no `alt` attribute at all**
matches neither that regex nor `MD_IMAGE_RE`, is never counted in `imageCount`, and is never flagged.
Meanwhile markdownlint **MD045 `no-alt-text`** covers exactly that case off the shelf and arrives in
G1-7, one task earlier in a chain that merges first by default. Let MD045 carry it; spend G2-7 on the
seven figure assertions, which have no off-the-shelf equivalent.

### 16. G2-8: the link-rot routine matches the field, and lychee is the tool to adopt. **Adopt.**

The field splits internal from external, and the plan's instinct is right:

- **Internal links and anchors, per pull request.** GitLab runs `lychee --offline --no-progress
  --include-fragments doc tooling/docs/api/tags` on every docs MR. GitHub Docs runs a custom
  per-PR internal checker with `CHECK_ANCHORS=true`. Astro runs a custom `scripts/lint-linkcheck.ts`
  on every push. cairn already has this in `check:docs`.
- **External URLs, weekly and reporting.** GitHub Docs' `link-check-external.yml` is a scheduled
  weekly job with a three-hour timeout that files and refreshes a **rolling issue** rather than
  pinging fresh each run. Kubernetes and Cloudflare run `htmltest` manually rather than on a cron.

So G2-8's "scheduled rather than per pull request, reports rather than fails" is the field position.
Two refinements: adopt **lychee** (`lycheeverse/lychee`, Apache-2.0 / MIT dual, with
`lycheeverse/lychee-action`) rather than writing another script, pinning the version as GitLab pins
`lychee-0.24.2` in its lint container; and give the routine the rolling-report behavior so a
persistent dead link does not ping weekly forever.

### 17. G2-1: the register section is the right place for the benchmark's citation correction, and the acceptance criteria omit it. **Change.**

The spec-level benchmark's finding 13 stands and is confirmed: `errata-ai/Google` is a community port
under MIT ("Copyright (c) 2018 - 2019 Joseph Kato"), not Google's own gate, and Google publishes no
linting of its own documentation repositories. G2-1 is the task that writes the register's prose
standard section and its severity contract, and none of its six acceptance criteria carries the
correction. Add it there, since no other task in the plan touches that description.

The severity contract itself checks out against source and should be kept as written. GitLab's
`gitlab_base` style grades 18 rules at error, 25 at warning, and 8 at suggestion, with `ReadingLevel`
among the suggestions, which is the shape cairn is copying.

### 18. Items where the plan matches the field with no change needed. **Keep.**

- **`check:ledger` and `check:prose-read` as standalone scripts.** They read artifacts (five ledger
  files, `receipts.md`) that no markdown linter can see. Finding 1 does not reach them.
- **`check:provenance`'s deny-by-default sentence walk.** No precedent, and the recorded failure
  earns it. G2-4's front-door fixture reproducing both outcomes, red build when unclassified and pass
  when marked `no-claim`, is the correct design for a gate whose limit is honestly stated.
- **The must-fire fixture principle.** Confirmed as errata-ai's actual practice and stricter than
  GitLab's, which has **no fixture harness for its Vale rules at all**; GitLab tests rules by running
  them over live documentation, and its own contributor doc describes manual CLI testing. cairn's
  fixture suite would be the stronger of the two once finding 4's mechanics are folded in.
- **The one cross-chain edge (H1's schema into G2-6) and the wait-rather-than-invent rule.** Sound.
- **Templates as `check:anatomy`'s only source.** The right control against the drift Kubernetes
  lives with, where the archetypes and the style page can disagree with the pages and nothing
  notices.
- **The scope file naming a remover for every exclusion.** No precedent found, and it is the control
  that stops an exclusion becoming permanent. Fold it into `markdownlint-cli2`'s glob overrides per
  finding 1 rather than dropping it.

## Verdict: does the plan build what already exists?

**Partly, and the overlap is concentrated in the two structure gates rather than spread across the
plan.**

Four of the six new scripts build things that genuinely do not exist. `check:provenance`,
`check:fact-coverage`, `check:ledger`, and `check:prose-read` have no off-the-shelf equivalent, no
precedent in any surveyed program, and answer the recorded failure. The search for a per-page-type
section-order validator came back empty across `remark-lint`, Vale, and markdownlint, so
`check:anatomy`'s core is novel too. On these the plan is building, not rebuilding.

The rebuilding is in `check:headings` and in the packaging. Five of its seven rules are Vale rules,
one of them already ships in this repository and already runs against every published page, and two
more are markdownlint rules the plan adopts one task later. What remains after subtraction is one
rule, sibling parallelism, and a lexicon. The plan spends a script, a lexicon file, an explainer
page, fourteen fixtures, and a unit test to reach it. The packaging finding is the same defect at
plan scale: eight new npm scripts where the two largest surveyed programs run two binaries and
register rules inside them.

Two designs should change because a library is the field's answer and the plan names none: the brief
parser (ajv or zod over `js-yaml`, not hand-written) and the shared markdown and sentence substrate
(`Intl.Segmenter` and an AST, not five regex strippers). One design should change because the field
does the opposite and the standard cairn enforces says so in as many words: the corpus should default
to `reference-only` and excerpt by exception.

Three findings are defects rather than benchmark deviations, and they would each cost a task a
re-dispatch: the briefs will ship in the tarball and G1-1's own criterion contradicts itself; G2-7's
alt-text criterion asserts a "previous behavior" that is not the current behavior; and decision 1's
permanent warnings reach nobody because `check:vale` runs at error only.

Applying findings 1 through 5 removes roughly a script, a lexicon explainer, fourteen fixtures, and a
duplicated Vale rule from the G chains, and makes the fixture harness match the precedent it cites.
Applying 9 and 10 removes most of the licensing surface from chain C. Applying 6, 13, and 15 closes
three defects before dispatch. The remainder of the plan sits where the spec-level benchmark said the
reduced shape should sit: heavier than Cloudflare and Astro, level with GitLab and GitHub Docs on
mechanical gates, and ahead of every surveyed program on claim provenance, which is the one place
cairn's recorded failure actually happened.

## Sources fetched for this review

- [github/docs content linter rules](https://github.com/github/docs/tree/main/src/content-linter/lib/linting-rules), [style/github-docs.ts](https://raw.githubusercontent.com/github/docs/main/src/content-linter/style/github-docs.ts), [read-frontmatter.ts](https://raw.githubusercontent.com/github/docs/main/src/frame/lib/read-frontmatter.ts), [table-column-integrity.ts](https://raw.githubusercontent.com/github/docs/main/src/content-linter/lib/linting-rules/table-column-integrity.ts) (code MIT, content CC BY 4.0)
- [github/docs link-check-external.yml](https://github.com/github/docs/blob/main/.github/workflows/link-check-external.yml), [link-check-internal.yml](https://github.com/github/docs/blob/main/.github/workflows/link-check-internal.yml), [link-check-on-pr.yml](https://github.com/github/docs/blob/main/.github/workflows/link-check-on-pr.yml)
- [markdownlint Rules.md](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md), [MD043 required-headings](https://github.com/DavidAnson/markdownlint/blob/main/doc/md043.md), [markdownlint-cli2](https://www.npmjs.com/package/markdownlint-cli2) (both MIT)
- [Vale styles and extension points](https://docs.vale.sh/topics/styles/); [errata-ai/Google Headings.yml](https://raw.githubusercontent.com/errata-ai/Google/master/Google/Headings.yml), its `fixtures/Headings/.vale.ini`, `testdata/Headings.ct`, `main_test.go`, and [CI workflow](https://raw.githubusercontent.com/errata-ai/Google/master/.github/workflows/main.yml) (MIT)
- [remarkjs/remark-lint](https://github.com/remarkjs/remark-lint) (searched; no per-page-type template plugin)
- [Kubernetes page content types](https://kubernetes.io/docs/contribute/style/page-content-types/), [archetypes/](https://github.com/kubernetes/website/tree/main/archetypes), [Makefile](https://raw.githubusercontent.com/kubernetes/website/main/Makefile), [.htmltest.yml](https://raw.githubusercontent.com/kubernetes/website/main/.htmltest.yml), [LICENSE](https://raw.githubusercontent.com/kubernetes/website/main/LICENSE) (content CC BY 4.0)
- [GitLab scripts/lint-doc.sh](https://gitlab.com/gitlab-org/gitlab/-/raw/master/scripts/lint-doc.sh), [.markdownlint-cli2.yaml](https://gitlab.com/gitlab-org/gitlab/-/raw/master/.markdownlint-cli2.yaml), [doc/.vale/gitlab_base/](https://gitlab.com/gitlab-org/gitlab/-/tree/master/doc/.vale/gitlab_base), [.gitlab/ci/docs.gitlab-ci.yml](https://gitlab.com/gitlab-org/gitlab/-/raw/master/.gitlab/ci/docs.gitlab-ci.yml), [vale.md](https://gitlab.com/gitlab-org/gitlab/-/raw/master/doc/development/documentation/testing/vale.md) (`doc/` CC BY-SA 4.0, rest MIT Expat)
- [cloudflare-docs anchor-link-audit.yml](https://github.com/cloudflare/cloudflare-docs/blob/production/.github/workflows/anchor-link-audit.yml), [content.config.ts](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content.config.ts), [LICENSE](https://github.com/cloudflare/cloudflare-docs/blob/production/LICENSE) (CC BY 4.0)
- [withastro/docs ci.yml](https://github.com/withastro/docs/blob/main/.github/workflows/ci.yml), [content.config.ts](https://github.com/withastro/docs/blob/main/src/content.config.ts), [writing style guide](https://contribute.docs.astro.build/guides/writing-style/)
- [Google style guide, documenting other sources](https://developers.google.com/style/other-sources)
- [lycheeverse/lychee](https://github.com/lycheeverse/lychee) (Apache-2.0 / MIT), [wjdp/htmltest](https://github.com/wjdp/htmltest) (MIT), [linkinator](https://github.com/JustinBeckwith/linkinator) (Apache-2.0), [remark-validate-links](https://github.com/remarkjs/remark-validate-links) (MIT), [markdown-link-check](https://github.com/tcort/markdown-link-check) (MIT)
- Licences for corpus candidates: [sqlite.org/copyright.html](https://sqlite.org/copyright.html) (public domain), [golang/proposal](https://github.com/golang/proposal) (BSD-3-Clause), [kubernetes/enhancements](https://github.com/kubernetes/enhancements/blob/master/LICENSE) (Apache-2.0), [stripe.com/legal/ssa](https://stripe.com/legal/ssa) (all rights reserved), [django/django](https://github.com/django/django) (BSD-3-Clause), [DigitalOcean ToS](https://www.digitalocean.com/legal/terms-of-service-agreement) (unverified)
- Repository measurements: `vale --minAlertLevel=warning --output=line docs README.md` (local Vale 3.20.0, not the 3.15.1 CI pin); `package.json` `files` and `scripts`; `.vale.ini`; `scripts/checks/check-visuals.mjs`; `scripts/checks/check-package-files.mjs`; `scripts/checks/measure-prose.mjs`; `.github/workflows/test.yml`
