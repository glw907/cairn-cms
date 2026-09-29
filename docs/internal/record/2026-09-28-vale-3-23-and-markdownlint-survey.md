# Vale 3.23.0 and markdownlint-cli2 survey

**Date:** 2026-09-28. **Pass:** style-guide-sync, pre-flight P3. **Scope:** survey only. No pin moves here.

## Vale 3.15.1 to 3.23.0

**Pinned in:** `.github/workflows/test.yml` (the "Install Vale 3.15.1" step) and
`.github/workflows/tool.yml` (`VALE_VERSION`). **Newest production release:** 3.23.0
(2026-09-25, GitHub "Latest"; the workstation Homebrew `vale` is already 3.23.0). Nothing newer exists.

Releases in range: 3.15.2, 3.16.0, 3.17.0, 3.17.1, 3.18.0, 3.19.0, 3.20.0, 3.21.0, 3.22.0, 3.23.0.

### Breaking changes

None found in any release note. Two changes touch this repo's config surface and are recorded for the bump task:

- 3.17.1 warns on unrecognized core options in `.vale.ini`. A clean run of 3.23.0 against the repo printed no config warning.
- 3.23.0 makes `vale sync` install the package release the running Vale supports. `Packages = Google, Microsoft` is unaffected for a 3.23 binary; a pinned old Vale reading newer styles is the case the change protects.

### Behavior changes that can move findings

Measured, not inferred: both binaries run over `README.md`, `docs/{admin,extend,reference,editors}`, `docs/why-cairn.md`, and `examples/showcase/README.md` with the repo's `.vale.ini` and the synced `.vale/styles`.

- **The CI gate is unchanged.** `npm run check:vale` (`--minAlertLevel=error`) exits 0 with 0 error alerts on both 3.15.1 and 3.23.0.
- **Suggestion and warning counts shift.** Total alerts at `MinAlertLevel = suggestion` rose from 3,388 to 4,437. Google.Parens went 634 to 1,167 and Google.Semicolons 502 to 969. Google.Colons 173 to 184, Google.OxfordComma 39 to 51. Google.WordListCase moved 638 to 642 with some positions shifted (e.g. `docs/admin/is-it-working.md:131-132` now reports at lines 130 and 132). The likely cause is the 3.15.2 through 3.17 fixes that place matches per block and per inline span (`fix: place inline fragments where they actually are`, `stop scanning the whole document`, `lint a tight list item's own text as its own block`, 3.18.0). Repeat matches that the old engine merged are now each reported. None of these rules are error level here.
- **Google.EmDash and Microsoft.Quotes.** The `.vale.ini` header says 3.19.0 fires both where 3.15.1 does not. Neither appears in this measurement on either version. The comment is stale for the current corpus and needs a rewrite when the pin moves; the version-arbiter paragraph would then describe a resolved drift.
- 3.15.2 through 3.18.0 carry many alert-position fixes (byte-offset placement, smart-quote source, `vale off/on` spans, tight lists, HTML comments as text boundaries). Expect line/column changes in advisory output, and check that any `<!-- vale off -->` regions still behave.
- 3.19.0 lints JSX children in MDX; the repo has no MDX. Not applicable.

### Capabilities and rulings

| Capability (release) | Ruling |
| --- | --- |
| Pin bump itself: newest version, removes local-versus-CI drift that `.vale.ini` documents | Take now, in the style-guide-sync task that owns the pin. Bump `test.yml` and `tool.yml` together, then rewrite the version-arbiter comment. |
| Style-level severity in `BasedOnStyles` (3.17.0) and per-rule scalar overrides `Rule[key] = value` (3.20.0) | File. Candidate for demoting Google.Parens and Google.Semicolons volume without editing rules. Decide in the style-guide-sync design, not in the bump. |
| Rule `extends` and nested rule directories (3.20.0) | File. Could replace copy-edited `.vale/styles/Cairn` rules that duplicate a Google pattern. Leans on this only if a Cairn rule needs a Google parent. |
| `vale test` and per-rule `tests:` with `vale test --coverage` (3.18.0, 3.23.0) | Take now if the pass adds or edits Cairn rules; otherwise file. Gives the style rules a test net. |
| Section-level `Vocab` (3.22.0), `UNSET`, empty `BasedOnStyles` clears inheritance (3.22.0) | File. Simplifies the `docs/internal/**` and `docs/STATUS.md` blank-`BasedOnStyles` sections. |
| `doc(...)` selections, named scopes, metric variables (3.21.0, 3.23.0) | File. Section-scoped rules become possible (for example a word budget per section). No current need. |
| Native MDX, Typst, Quarto, MyST, QDoc, Jupyter, Sphinx, code-comment Views, data-file comments (3.18.0 to 3.23.0) | Not applicable. Code comments stay under ESLint TSDoc. |
| Performance work (3.16.0, 3.17.0, 3.17.1) | Take with the bump. No action. |
| `--plain-progress` and per-package `vale sync` logging (3.18.0) | Take with the bump. Cleaner CI logs, no action. |
| Windows on ARM build (3.17.1) | Not applicable. |

### Verdict

Bumping to 3.23.0 is a minor take-by-default under the dependency rules. It does not break the pin, the gate stays green, and the only visible change is advisory-volume and position drift below error level. The task that bumps it should re-measure the same way, update `.vale.ini`'s version-arbiter comment, and move both workflow pins in one commit.

## markdownlint-cli2 (new package)

| Field | Value |
| --- | --- |
| Current production version | 0.23.3 (2026-09-20) |
| License | MIT |
| Maintainer | David Anson (`davidanson`), also author of the `markdownlint` core (0.41.1) |
| Repository | `DavidAnson/markdownlint-cli2` |
| Last release | 0.23.3 on 2026-09-20; prior 0.23.2 (2026-07-27), 0.23.1 (2026-07-17), 0.23.0 (2026-07-01), roughly a release every three to six weeks |
| Last push | 2026-09-28 (active) |
| Open issues | 5 |
| Stars | about 929; repository not archived |
| Runtime dependencies | globby, js-yaml, smol-toml, micromatch, jsonpointer, markdown-it, jsonc-parser, markdownlint, a default formatter |
| Version line | 0.x; the maintainer has kept it 0.x for years, so a minor can carry rule changes |

**Rationale for `check:markdown`:** it enforces structural Markdown hygiene (heading levels, list and fence shape, line endings, link syntax) deterministically, a layer Vale's prose styles do not cover, and it is a single-maintainer but long-lived, active, MIT tool with a config file and glob support.

Pin guidance for adoption: use an exact or `~` range in `devDependencies`, since a 0.x minor may add rules that change findings.
