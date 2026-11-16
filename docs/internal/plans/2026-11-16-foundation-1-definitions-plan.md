# Pass foundation-1: definitions

Initiative: theme-garden
Round: foundation
Pass: 1 of 6, `foundation-1` (definitions), class `runner`, base `9af8587ea`, branch `foundation-1`

Design: `~/Projects/initiatives/theme-garden/specs/2026-11-15-foundation-design.md` ("Calls made
here", "Passes" row 1, "Acceptance", "Standing answers", "Backlog verdicts"). Approved by Geoff in
queue document `20261115-223648-1d48b9` (2026-11-15). Earlier passes in this round: none, so no
`[advisor]` lines to read.

Outcome: kinds and features are data under `definitions/`. The schemas that name a kind are
generated from that data, `npm run check:definitions` fails when one differs, and the theme schema
accepts one to five kinds and optional `menus` and `features`. No theme, set, or site changes, so
the merge publishes nothing.

Planned path: 135 minutes against the design's 80 (planning ceiling 160). See "Path".

## Pre-flight

Permissions checked: read `~/.local/state/claude-denials.jsonl` on 2026-11-16. The log holds 110
rows, all from 2026-11-01T00:55Z to 2026-11-16T07:43Z (it starts inside the 30-day window).
Classes and row counts: Classifier unavailable 44; Self-Modification 10; server classifier with no
explanation 10; Interfere With Workloads 9; Destructive or Unwanted Actions 6; Merge Without
Review 3; Auto-Mode Bypass 3; Irreversible Local Destruction 2; Git Destructive 2; Create Public
Surface 2; Unverifiable Deletion Scope 2; Sensitive-Source Provenance 2; Security Weaken 2;
Undermining Oversight 2; one each of Production Deploy, Secret-Store Writes, DNS / Domain / Cert
Changes, Bot Check Circumvention, Code from External, Shared Scratch Sweep, Safety Bypass Flag,
Out-of-Place Publication, PII Data Handling, Modify Shared Resources, Unauthorized Access. Rows
that touch this pass's commands, with the form to use instead:

| Refused form (date, class) | This pass uses |
| --- | --- |
| The setup command piped to `tail` and chained with `ls` (2026-11-14, Destructive or Unwanted Actions) | The setup command alone and bare: `npm ci && npm ci --prefix examples/showcase && (cd examples/showcase && npx svelte-kit sync)` |
| `pkill -f 'lane:fast'`, `kill <pid>` of test runs (2026-11-01, 2026-11-15 twice) | Never kill a process. A hung command runs to its timeout; re-run it bare |
| `claude stop` chained with other commands (2026-11-10, 2026-11-13, 2026-11-16) | `claude stop <id>` alone, only for a job this session launched |
| `git push origin HEAD:main` (2026-11-10, 2026-11-15 Modify Shared Resources) | Push only `foundation-1`: `git push -u origin foundation-1` |
| `gh pr merge` and a `gh pr view` chained into one (2026-11-10, 2026-11-11 Merge Without Review) | Never `gh pr merge`. The executor merges nothing; `conductor-foundation` lands the PR with `approval-queue land` (`approval-packet` step 1) |
| Edits to `settings.json` (Self-Modification, 10 rows) | The pass writes no Claude settings file |
| Classifier unavailable (44 rows, transient) | Retry the same command once, bare and alone |

Reviewed: one `standards:plan-reviewer` read on 2026-11-16, with `planner.md` "Stops" and
"Pre-flight" added to its prompt; findings folded below (see "Review folded").

Evidence: the mechanism table and the recorded searches below.

Geoff steps: none. The pass needs no credential, no secret, no sign-in, and no permission rule.
Values the run needs: none from any store. Writes read against auto mode: files in the pass
worktree, commits and a push to `foundation-1`, one draft PR. No write to Claude's settings, a
credential file, or new public surface (no publish, no deploy, no version bump). The launch runs
from the main checkout, which sessions have opened before, so no workspace trust prompt.

## Mechanism table

| Mechanism | Probe or source | Result |
| --- | --- | --- |
| The drift-gate pattern to copy | `scripts/build/emit-tool-conditions.mjs` exports `buildMirrors()`; `scripts/checks/check-tool-conditions.mjs:9` imports it, compares bytes, prints `<path>: does not match its generator; run "node scripts/build/emit-tool-conditions.mjs" and commit the result` (`:26`), exits 1 | Copy the shape: a builder module that returns `{path: contents}`, a check that compares bytes |
| Ajv rejects an empty `enum` | `node -e` compiling `{items:{enum:[]}}` with `ajv/dist/2020.js` | `ERR enum must have non-empty array` |
| An empty feature list can be stated | Same Ajv, `strict: true`, and again with the house options of `scripts/theme/build-tokens.mjs:75` (`new Ajv2020({ validateFormats: false, allErrors: true })`), `items: {$ref: '#/$defs/f'}` | `$defs.f = false` and `$defs.f = {not: {}}` both accept `[]` and reject `['x']` (`keyword: "false schema"`) |
| Where each schema names a kind | `grep -n '"enum"' schema/cairn-{theme,set,catalog}-1.schema.json` | Theme `properties.kinds.items.enum` (line 42), set `properties.kind.enum` (line 16), catalog `$defs.kindId.enum` (line 40). Each enum sits on one line |
| The theme schema blocks the new fields | `schema/cairn-theme-1.schema.json:7` | Root `"additionalProperties": false`; `kinds` has `maxItems: 3` (line 39) |
| The catalog schema caps a theme's kinds | `schema/cairn-catalog-1.schema.json:153-159` | `themes[].kinds` has `minItems: 1`, `maxItems: 3`, items `$ref: #/$defs/kindId` |
| The catalog would publish `defaultFeatures` | `scripts/catalog/index.mjs:137` copies whole kind objects into `next.kinds`; `schema/cairn-catalog-1.schema.json:67-74` `$defs.kind` has no `additionalProperties: false` | Without a projection the next publish writes `defaultFeatures` into the hosted index |
| Who reads `sets/kinds.json` in code | `scripts/catalog/publish.mjs:253` `readJson(path.join(root, 'sets/kinds.json'))` | The one runtime reader |
| Tests that duplicate the coming check | `scripts/catalog/index.test.mjs:79` (`schema.$defs.kindId.enum`), `scripts/theme/build-tokens.test.mjs:144-145` (`schema.properties.kinds.items.enum` equals the kinds ids) | Both are replaced by `check:definitions` and its test |
| The template's skill copy is generated | `scripts/build/bake-template.mjs:200` reads `skills/`; `package.json:92-93` `emit:template`, `check:template` | Edit `skills/`, then run `npm run emit:template` |
| The fast lane's buckets | `scripts/checks/gate-table.json` `buckets.showcase` holds `sets/`; an unbucketed path runs every static check (`scripts/checks/gate-tier.mjs:416`) | `definitions/` joins `showcase` |
| A fast-lane check outside `check:close` | `gate-table.json` `extraCommands` (`check:version-rise` = `node scripts/catalog/version-rise.mjs`); `gate-tier.mjs:179` `DIST_FREE_EXTRAS`; `src/tests/unit/gate-tier.test.ts:164-167` requires every label in `checks` | `check:definitions` goes in `checks`, `extraCommands`, and `DIST_FREE_EXTRAS` |
| How CI runs the check with no workflow edit | `.github/workflows/test.yml:86` runs `npm run test:emit`; `test.yml:6,8` ignore only `tool/**`. `src/tests/unit/docs-gate.test.ts:18-38` pins the docs gate's 14 labels in order, and that file is outside the row | `emit-definitions.test.mjs`'s first test runs `checkDefinitions` on the committed tree, so CI fails on drift through `test:emit`. The docs gate is not touched. No held path changes |
| `check:close` stays as it is | `src/tests/unit/close-prebuilt.test.ts:85` pins `CLOSE_COMPONENTS` at 36; that file is outside the row | `check:definitions` does not join `CLOSE_COMPONENTS` |
| The test file reaches CI | `package.json:90` `test:emit` lists `scripts/build/*.test.mjs` files; `test.yml:86` runs `npm run test:emit` | Add `scripts/build/emit-definitions.test.mjs` to `test:emit` |
| Removing `sets/kinds.json` needs no set version | `scripts/catalog/version-rise.mjs` reads a set's version from a path of more than two segments | `sets/kinds.json` is two segments, so no rise is asked |
| The catalog workflow and the new folder | `.github/workflows/catalog.yml` `paths` list `sets/**`, `themes/**`, `scripts/catalog/**`, `scripts/theme/**`, and the schemas, not `definitions/**` | Held path. Recorded for the round's `merge` document (standing answer 19). This PR still triggers it through `scripts/catalog/**` |
| The demo build and its output | `scripts/catalog/demo.mjs:179-205` `buildDemo({ root, themeDir, out, worker, origin, set })` copies `<site>/.svelte-kit/cloudflare` to `<out>/assets` (line 194); the CLI (line 218) passes no `set`; `publish.mjs:306` picks `sets/<kinds[0]>` | Build Waymark with no set (as published) and Pennant with `set: sets/organization` |
| The showcase's built output | `examples/showcase/wrangler.jsonc:6` `"main": ".svelte-kit/cloudflare/_worker.js"`; `vite.config.ts:1,22` `adapter-cloudflare` | Public output is `examples/showcase/.svelte-kit/cloudflare/` less `_worker.js` and its server chunks |
| The Go tool reads no kind | `git grep -n "kinds" tool` | Only `tool/scripts/check-copy.sh`'s word list. Pass 3 adds the embedded copy |
| `MIGRATION-NOTES.md:168` and `CHANGELOG.md:185` are unreleased | `grep -n "^## " MIGRATION-NOTES.md` (Unreleased at 85, `0.99.0-rc.4` at 195); `CHANGELOG.md` (Unreleased 1 to 225) | Neither is a dated entry. The MIGRATION line names `sets/kinds.json`, so the grep needs it corrected; the acceptance exempts `CHANGELOG.md` and says the pass leaves it as written |
| Two `$id` families under `schema/` | `grep -h '"$id"' schema/*.json` | `https://cairn.pub/schemas/<name>/1.json` for theme, catalog, set; `https://cairn.pub/schema/<file>` for the nine tool schemas. `tool/cmd/cairn/messages.go:254` promises the second |

## Recorded searches

| Search (at `9af8587ea`) | Hits | Disposition |
| --- | --- | --- |
| `git grep -l "kinds.json"` | 13 | `CHANGELOG.md` (exempt and left as written; a new bullet supersedes it, Decisions 4), `MIGRATION-NOTES.md` (Unreleased, corrected), `schema/cairn-catalog-1.schema.json`, `schema/cairn-set-1.schema.json`, `schema/cairn-theme-1.schema.json`, `scripts/catalog/index.test.mjs`, `scripts/catalog/kinds.test.mjs`, `scripts/catalog/publish.mjs`, `scripts/catalog/publish.test.mjs`, `scripts/theme/build-tokens.test.mjs`, `skills/cairn-styling-public-pages/references/theme-directory.md`, `src/tests/unit/gate-tier.test.ts`, `templates/waymark/.claude/skills/cairn-styling-public-pages/references/theme-directory.md` (regenerated). The other 12 change |
| `git grep -ln "maxItems\": 3\|one to three\|One to three\|three kinds"` (less `CHANGELOG.md`) | 7 | `MIGRATION-NOTES.md`, `schema/cairn-catalog-1.schema.json`, `schema/cairn-theme-1.schema.json`, `scripts/theme/build-tokens.test.mjs`, both `theme-directory.md` copies change. `schema/dtcg/2025.10/resolver.json` is the vendored DTCG schema: dismissed |
| `git grep -ln "cairn-theme-1.schema\|cairn-set-1.schema\|cairn-catalog-1.schema"` | 15 | Read for kind wording. `.github/workflows/catalog.yml` and `src/tests/unit/workflow-yaml.test.ts` (held and out of row; recorded), `docs/internal/theme-catalog.md` (one sentence added, Task 4), `skills/.../checking-a-theme.md` and its template copy (name the schema path only: no change), the rest already listed |
| `git grep -n "kinds" -- docs/ skills/` | 10 | Only `theme-directory.md:66,84` concern theme kinds. `docs/internal/theme-catalog.md:69` (first kind picks the set) stays true. The rest use "kinds" in other senses: dismissed |
| Retired form (`ready.md`): `grep -rln "sets/kinds\.json"` in `~/.dotfiles/claude`, each `~/Projects/*/.claude` and `~/Projects/*/skills` (worktrees excluded), and prompts in `~/Projects/initiatives` | 2 | `~/Projects/cairn-cms/skills/cairn-styling-public-pages/references/theme-directory.md` (fixed by Task 4, reaches the main checkout at merge). `~/Projects/initiatives/theme-garden/plans/2026-11-15-foundation-1-planner-prompt.txt:18`, this pass's own planner prompt, which names the old path as the source of the move: dismissed, not a live use. Specs and plans in initiatives are not prompts and are not counted |
| `git grep -n "kindId\|properties.kind\|items.enum" -- scripts src tool` | 2 | The two duplicate tests in the mechanism table |

## Rulings and standing answers

The twelve standing answers in `round-run.md` hold, with the design's 13 to 20. The ones this
pass can meet:

- 14: a needed `src/lib/**` file parks the pass. None is planned.
- 15: a pixel or public-output difference is fixed at its cause, never by a new baseline.
- 18: plan against the files as merged. Done at `9af8587ea`.
- 19: a needed change under `.github/**`, `scripts/release/**`, or `.claude/settings*` is left
  alone and recorded for the round's `merge` document. One is foreseen (`catalog.yml`).
- 20: over 160 path minutes at planning parks. 135 planned.

The run's ceilings are the ones the design names: the round stops new launches past 1,380 path
minutes, and the usage ceiling is 85 percent of the weekly allowance (design "Order"). Retries go
on while each fixes a traced cause, as `planner.md` "Stops" says, until one of those is reached.

Every other stop the run meets goes through `advisor.md`. The ones foreseen:

| Stop | Answer |
| --- | --- |
| The generated `$defs` breaks a schema consumer (Ajv in `build-tokens.mjs`, `check-rules.mjs`, `publish.mjs`) | Fix the generator's output, never the consumer's options. The `{not: {}}` form is probed |
| A CI run fails in a job this pass didn't touch | Re-run once; a repeat goes to the advisor, and a real regression is fixed at cause |
| The `catalog` workflow's proving job fails on this PR | Read its log. A failure in code this pass changed is fixed; a Cloudflare 403 parks the pass. Never widen a token or try another credential |
| The whole-branch review asks for work outside the row | `standards:log-issue`, listed in the PR body |
| A theme or set file would change | Stop that edit. Pass 1 changes nothing under `themes/` or `sets/<kind>/` |

## Acceptance

Every pass:

- CI is green on the head commit, and the whole-branch review is accepted with no open finding.
  - Task 7: `ci-green <sha> --pr <n> --wait` exit 0; the `standards:diff-reviewer` whole-branch
    verdict `accept` quoted in the PR.
- The built showcase, the Waymark demo, and the Pennant demo show no visitor-visible change. A
  fresh `standards:visual-verifier` compares each of the home page, a post, a plain page, and the
  archive at the five widths with the same page built from the pass's base commit, and returns no
  difference.
  - Tasks 0 and 6: 60 base/head screenshot pairs; the verifier's verdict quoted in the PR.
- The showcase's built public output (every prerendered page, the feeds, the sitemap, and
  `robots.txt`) equals the base commit's, file for file, once hashed asset names are replaced
  with a fixed token. The PR lists any file that differs, with the reason.
  - Tasks 0 and 6: the normalized hash list diff, pasted in the PR.

Pass 1:

- `definitions/kinds.json` and `definitions/features.json` exist, and `sets/kinds.json` doesn't.
  Today: `git cat-file -e origin/main:definitions/kinds.json` exits 128.
  - Task 1: `git cat-file -e HEAD:definitions/kinds.json && git cat-file -e HEAD:definitions/features.json; echo $?` prints 0, and `git cat-file -e HEAD:sets/kinds.json` exits 128.
- No tracked file names `sets/kinds.json`, apart from `BACKLOG.md`, `CHANGELOG.md`, and the
  dated entries in `MIGRATION-NOTES.md`, which the pass leaves as written. Today: 13 files do.
  - Tasks 1, 2, 4, and 8: `git grep -l "sets/kinds.json" HEAD -- . ':!BACKLOG.md' ':!CHANGELOG.md' ':!MIGRATION-NOTES.md'` prints nothing, and `git grep -n "sets/kinds.json" HEAD -- MIGRATION-NOTES.md` prints nothing (no dated entry names the path today, and Task 4 corrects the one Unreleased line). `BACKLOG.md` names no such path today. The plan and the
    executor prompt name the old path, so Task 8 deletes both before close (as pennant-4 did in
    `394a18957`). The Unreleased `MIGRATION-NOTES.md` line is corrected (it isn't dated);
    `CHANGELOG.md` keeps its old bullet and gains a new one (Decisions 4).
- `npm run check:definitions` passes. A test adds a sixth kind to a copy of the data, runs the
  generator, and finds the id in all three schemas. A second test
  changes one schema by hand and the check fails, naming it. Not runnable today: the script
  doesn't exist.
  - Task 1: `npm run check:definitions` output; `node --test scripts/build/emit-definitions.test.mjs` output naming both tests.
- The theme schema accepts five kinds and rejects six, none, and one kind twice. It accepts a
  manifest with `menus` and `features` and one without. It rejects `menus` that isn't a list of
  unique names, and a `features` id that `definitions/features.json` doesn't list. Today: `maxItems` is 3, and the schema's
  `additionalProperties: false` rejects both new fields.
  - Task 2: `npm run test:theme` and `node --test scripts/build/emit-definitions.test.mjs`
    output. Each rejection asserts the Ajv `keyword` (`maxItems`, `minItems`, `uniqueItems`,
    `pattern` or `type`, `not`), so a test can't pass on the wrong failure. Five real ids exist,
    so six distinct kinds are built on a generated copy with a sixth kind.
- Each kind in `definitions/kinds.json` carries `defaultFeatures`, an empty list in this round.
  A test gives a copy of the data a default that `features.json` doesn't list, and
  `check:definitions` fails, naming the kind and the id.
  - Task 1: `node -e` printing every kind's `defaultFeatures` as `[]`; the test's assertion on the message.

Writing for people follows `~/.claude/docs/voice/written-for-people.md`; developer docs and
skills follow the Google style through `cairn-writing-docs`.

## Skills the executor loads

`cairn-pass`, `pass-core` (`references/executor.md`, `references/round-run.md`,
`references/advisor.md`), `cairn-running-passes`, `cairn-writing-engine-code`,
`standards:ts-conventions` (doc comments in the `.mjs` and `.ts` files), `cairn-writing-docs`
(Task 4), and `standards:go-conventions` only if a `.go` file is touched, which none is planned to
be. Voice: `~/.claude/docs/voice/written-for-people.md`.

## Tasks

The worktree is `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/foundation-1`. After each
task, run the fast lane: `node scripts/checks/gate-tier.mjs --fast --range 9af8587ea..HEAD`, each
leg through `cairn-run-gate`. Tasks 1 and 2 share the schemas and run in order. Tasks 4 and 5 are
independent of each other once Task 2 lands, and run as a pair (`pass-core` "Pairs").

### Task 0: base build (25 min)

Before any edit, run the setup command bare, then `npm run package`. Build the base outputs into
`$CLAUDE_JOB_DIR/tmp/parity/base/`:

1. `npm --prefix examples/showcase run build`, then copy `examples/showcase/.svelte-kit/cloudflare`
   to `parity/base/showcase`.
2. Waymark's demo as the publish job builds it, with no set:
   `DEMO_WORKER=cairn-demo-{id} DEMO_ORIGIN=https://{id}.example node scripts/catalog/demo.mjs themes/waymark --out "$CLAUDE_JOB_DIR/tmp/parity/base/waymark"`.
3. Pennant's demo over its set, which the CLI can't pass: a `node --input-type=module -e` that
   imports `buildDemo` from `scripts/catalog/demo.mjs` and calls it with `root` the worktree,
   `themeDir` `themes/pennant`, `set` the absolute `sets/organization`, the same worker and origin
   forms, and `out` `$CLAUDE_JOB_DIR/tmp/parity/base/pennant`.

Write `$CLAUDE_JOB_DIR/tmp/parity/serve.mjs`, a static server of about 20 lines that answers a
path from `<p>`, `<p>.html`, or `<p>/index.html` under a directory it is given. Read the built
pages to pick, for each site, the home page, one post, one plain page, and the archive, and write
the 12 URLs to `parity/pages.txt`, one `<site> <page> <path>` per line. Write
`parity/shoot.mjs <dir> <port-map> <out>`: it imports `chromium` from the repo's `playwright`, and
for each line and each width of 320, 390, 768, 1440, and 2560 opens a fresh page at that width
and a height of 900, goes to the URL with `waitUntil: 'networkidle'`, awaits
`document.fonts.ready`, and saves a full-page screenshot to `<out>/<site>-<page>-<width>.png`.
Task 6 runs the same script with the same arguments, so nothing is retyped. Write
`parity/compare.mjs base head`: with `pngjs` from the root `node_modules`, it decodes each pair and
prints `same` or `differs (<w>x<h> vs <w>x<h>, <n> pixels)` per file, and a count.

Write `parity/hash.mjs`: walk a directory, skip `_worker.js` and server-only chunks, replace hashed
asset names (`[.-][A-Za-z0-9_-]{8,}\.(js|css|woff2|svg|png|webp|avif|json)`), the `__sveltekit_<id>`
global, and the version value in `_app/version.json` with fixed tokens, and print `sha256 path`
per file, sorted by normalized path and then hash, so two assets whose names normalize alike stay
two lines (a sorted multiset). Run it on `parity/base/showcase` into `parity/base/showcase.hashes`.

### Task 1: move the data and add the generator and the check (35 min)

1. `git mv sets/kinds.json definitions/kinds.json`. Add `"defaultFeatures": []` to each kind, after
   `description`. Create `definitions/features.json` as `{ "features": [] }` with a trailing
   newline. A feature entry, when round two adds one, carries `id`, `label`, `kinds`, and `layer`.
2. `scripts/build/emit-definitions.mjs`, modeled on `emit-tool-conditions.mjs`:
   - `TARGETS`, the one list pass 3 appends `schema/cairn-site-1.schema.json` to:
     `[{ file: 'schema/cairn-catalog-1.schema.json', defs: ['kindId'] }, { file: 'schema/cairn-set-1.schema.json', defs: ['kindId'] }, { file: 'schema/cairn-theme-1.schema.json', defs: ['kindId', 'featureId'] }]`.
   - Each target's named `$defs` entry is written whole from the data. Where the root has no
     `$defs` (the set schema today), the generator adds it as the root's last key; an existing
     `$defs` keeps its place and its other entries, and the generated entry keeps its key order.
     `{ "description": "Generated from definitions/<kinds|features>.json by scripts/build/emit-definitions.mjs.", "enum": [ids] }`,
     and `{ "description": ..., "not": {} }` in place of `enum` when the list is empty (Ajv refuses
     an empty `enum`; the `not` form is probed).
   - `buildSchemas(root)` reads `<root>/definitions/*.json` and each target file and returns
     `{ [file]: contents }`, serialized as `JSON.stringify(schema, null, 2) + '\n'`.
   - `definitionProblems({ kinds, features })` returns one line per fault: a repeated kind or
     feature id; a kind's `defaultFeatures` id that `features.json` doesn't list, as
     `definitions/kinds.json: kind "<kind>" names default feature "<id>", which definitions/features.json doesn't list`;
     a feature's `kinds` id that `kinds.json` doesn't list.
   - `main()` writes the files under the repo root. It takes no flag.
3. `scripts/checks/check-definitions.mjs`: `checkDefinitions(root)` returns the problems plus, per
   target file that differs, `<file>: does not match definitions/; run "node scripts/build/emit-definitions.mjs" and commit the result`.
   Its main prints each line and exits 1, or prints `check-definitions: OK (3 schemas match definitions/)`.
4. Commit the schema rewrite in two commits. First, a format-only commit: each of the three
   schemas re-serialized with `JSON.stringify(…, null, 2)`, proven by a `node -e` that
   `assert.deepStrictEqual`s the parsed file before and after. Second, the `$defs` change: the
   theme's `kinds.items` and the set's `kind` become `{ "$ref": "#/$defs/kindId" }` (each
   property keeps its hand-written description, reworded to name `definitions/kinds.json`), the
   catalog's existing `$defs.kindId` loses its hand description, and the generator is run.
5. Wire it: `package.json` gains `"check:definitions": "node scripts/checks/check-definitions.mjs"`
   and `scripts/build/emit-definitions.test.mjs` in `test:emit` (Decisions 1).
   `scripts/checks/docs-gate.mjs` doesn't change (Decisions 9). `scripts/checks/gate-table.json`: `definitions/` joins
   `buckets.showcase`; `checks["check:definitions"]` is `["showcase", "exportSurface", "scripts"]`;
   `extraCommands["check:definitions"]` is `"node scripts/checks/check-definitions.mjs"`.
   `scripts/checks/gate-tier.mjs`: `check:definitions` joins `DIST_FREE_EXTRAS`.
   `src/tests/unit/gate-tier.test.ts`: the `sets/` row's example path becomes
   `sets/organization/cairn-set.json`, a row `['showcase', 'definitions/', 'definitions/kinds.json']`
   is added, and one assertion that the fast lane picks `check:definitions` for
   `definitions/kinds.json`.
6. `scripts/build/emit-definitions.test.mjs` (node:test). Each test copies `definitions/` and
   `schema/` into a `mkdtemp` root:
   - the repo as committed: `checkDefinitions(repoRoot)` returns `[]`;
   - a sixth kind `gallery` added to the copy, the generator run: `gallery` is in
     `$defs.kindId.enum` of all three schemas, and the check passes;
   - one schema changed by hand (drop `docs` from `cairn-set-1`'s `$defs.kindId.enum`): the check
     fails with a line that starts `schema/cairn-set-1.schema.json:`;
   - `blog.defaultFeatures = ['comments']` on the copy: the check fails with a line naming
     `"blog"` and `"comments"`.
   Task 2 adds its copy-based schema tests to this file, so Task 1's commit is green alone.
7. Readers: `scripts/catalog/publish.mjs:253` reads `definitions/kinds.json`;
   `scripts/catalog/publish.test.mjs:58` copies `definitions/kinds.json` (and `features.json`)
   into its scratch root; `scripts/catalog/kinds.test.mjs` reads the new path, its titles name it,
   and its key assertion becomes `['id', 'label', 'description', 'defaultFeatures']` with each
   `defaultFeatures` equal to `[]`; `scripts/catalog/index.test.mjs:14,78` read the new path, and
   the duplicate enum test at `:78-79` is deleted (the check covers it).

### Task 2: the theme and catalog schemas (20 min)

1. `schema/cairn-theme-1.schema.json`: `kinds` takes `maxItems: 5`, its description "One to five
   kinds …". Add two optional properties: `menus`, an array with `uniqueItems: true` and items
   `$ref: #/$defs/name`, described as the names of the menus the theme shows, as `site.config.yaml`
   keys them under `menus`; and `features`, an array with `uniqueItems: true` and items
   `$ref: #/$defs/featureId`, described as the features whose views the theme styles, from
   `definitions/features.json`. Neither is required. Run the generator.
2. `schema/cairn-catalog-1.schema.json`: `themes[].kinds` takes `maxItems: 5` (Decisions 2).
3. `scripts/catalog/index.mjs`: `next.kinds` maps each kind to `{ id, label, description }`, and
   the doc comment of `buildIndex`'s `kinds` input names `defaultFeatures`. A test in
   `index.test.mjs` passes a kind with `defaultFeatures` and finds none in the index. The refusal
   `'a theme with four kinds'` (`index.test.mjs:56`) becomes six kinds, which needs a sixth id, so
   it becomes `'a theme with one kind twice'` plus an acceptance of five kinds.
4. `scripts/theme/build-tokens.test.mjs:131-145`: five kinds accepted (all five ids); none rejected
   with keyword `minItems`; `['blog', 'blog']` rejected with `uniqueItems`; `menus: ['main', 'actions']`
   with `features: []` accepted; no `menus` and no `features` accepted (the existing fixture);
   `menus: 'main'` rejected (`type`), `menus: ['main', 'main']` rejected (`uniqueItems`),
   `menus: ['Main menu']` rejected (`pattern`); `features: ['comments']` rejected (`not`). The
   duplicate enum assertion at `:143-145` is deleted. Assert the keyword through the validator's
   errors, so each case fails for its own reason.
5. Add to `emit-definitions.test.mjs`, on a generated copy: with a sixth kind, six distinct kinds are
   rejected with `maxItems`; with `features.json` holding `{ id: 'test-feature', label: 'Test',
   kinds: ['blog'], layer: 'features/test-feature' }`, a manifest with `features: ['test-feature']`
   is accepted and `features: ['other']` rejected (`enum`). Compile with the same Ajv options as
   `build-tokens.mjs:75`.

### Task 4: docs and notes (pair, 15 min)

Load `cairn-writing-docs` and the writing-voice standard.

1. `skills/cairn-styling-public-pages/references/theme-directory.md`: the `kinds` row reads one to
   five; two rows for `menus` and `features` (No), each one sentence; line 84 names
   `definitions/kinds.json` and says `features` takes ids from `definitions/features.json`, which
   lists none yet. Then `npm run emit:template` and confirm the only `templates/waymark` change is
   under `.claude/skills/`.
2. `docs/internal/theme-catalog.md`: one sentence where the manifest's `kinds` are described (or
   the closest place) naming `definitions/` and `npm run check:definitions`.
3. `MIGRATION-NOTES.md` Unreleased: step 2 at line 168 reads "one to five ids from
   `definitions/kinds.json`". One new paragraph: a theme may declare up to five kinds and the
   optional `menus` and `features`; a cairn-cms clone reads the kinds from `definitions/kinds.json`
   (the paragraph names no old path, so the MIGRATION grep stays empty),
   and the schemas' kind and feature lists are generated, so edit `definitions/` and run
   `node scripts/build/emit-definitions.mjs`. Nothing for a site.
4. `CHANGELOG.md` Unreleased: leave the theme-manifest bullet at lines 182 to 186 as written. Add
   one bullet after it: a theme may now declare one to five kinds, listed in
   `definitions/kinds.json` (moved from `sets/kinds.json`), and the optional `menus` and
   `features`; `definitions/features.json` lists the features (none yet), each kind carries
   `defaultFeatures`, the schemas' kind and feature lists are generated by
   `scripts/build/emit-definitions.mjs`, and `npm run check:definitions` fails when one differs.
   It ends "Consumers must: nothing." 

### Task 5: backlog stamps (pair, 5 min)

In `BACKLOG.md`, nothing else changes:

- Append ` *(swept 2026-11-15)*` to the end of the item line of each of #388, #484, #378, #485,
  #480, #472, #419, #417, #416, #415, #413, #412, #406, #394, #373, #333, #323, #304, #302,
  replacing the item's older `*(swept …)*` stamp where it has one (#472 has none). #486 is closed
  (`[x]`, line 1673) and is left alone (Decisions 5).
- Replace #481's item line and body with:

  ```
  - [ ] **#481** No blog set exists `#improvement` `#cairn-cms` `#initiative:theme-garden` *(2026-11-14)* *(swept 2026-11-15)*
    Waymark's `kinds` is `["blog"]` and `sets/blog/` doesn't exist, so the publish job builds Waymark's demo over `scripts/build/starter-overlay`. Found in theme-catalog-1 ("Calls settled here").
    Placement: round two, the pass that writes the blog set.
  ```

- Replace #482's item line and body with:

  ```
  - [ ] **#482** Serve the theme, catalog, set, and site schemas at their `$id` addresses from the rebuilt cairn.pub `#feature` `#cairn-cms` `#initiative:theme-garden` *(2026-11-14)* *(swept 2026-11-15)*
    `schema/cairn-theme-1.schema.json`, `schema/cairn-catalog-1.schema.json`, and `schema/cairn-set-1.schema.json` declare `$id` addresses of the form `https://cairn.pub/schemas/<name>/1.json`, and round `foundation` pass 3 adds `schema/cairn-site-1.schema.json` in the same form. None answers today, so a reader that resolves a `$schema` or `$id` fails until cairn.pub serves them. This item owns the `https://cairn.pub/schemas/` addresses; #168 owns `https://cairn.pub/schema/`, where the `cairn` tool's own schemas sit. Found in theme-catalog-1 (design "The catalog file").
    Placement: the cairn.pub rebuild.
  ```

- In #168, replace the item line's stamp with `*(swept 2026-11-15)*`, and replace the body
  sentence that begins "Serve `https://cairn.pub/schema/`" with:

  ```
  Serve `https://cairn.pub/schema/` from the nine `schema/*.schema.json` files whose `$id` sits under it (`cairn-adopt-list`, `cairn-auth-check`, `cairn-doctor`, `cairn-health`, `cairn-health-summary`, `cairn-logs`, `cairn-setup-event`, `cairn-sites-list`, and `cairn-theme-check`), since `cairn help agents` promises each `$id` there (`tool/cmd/cairn/messages.go:254`). The theme, catalog, set, and site schemas sit under `https://cairn.pub/schemas/`, which #482 owns.
  ```

Check: `git diff 9af8587ea -- BACKLOG.md | grep -c '^+- \[ \]'` prints 22 (19 stamps and three
rewords), and `grep -c 'swept 2026-11-15' BACKLOG.md` rises by 22.

### Task 6: head build and parity (20 min)

After Tasks 1, 2, 4, and 5 (there is no Task 3; the review folded it here):

1. `git diff --stat 9af8587ea..HEAD -- themes/ 'sets/*/'` prints nothing. `npm run check:theme --
   themes/waymark` and `-- themes/pennant` pass, and `node scripts/catalog/version-rise.mjs`
   passes with no rise asked.
2. Repeat Task 0's builds, `shoot.mjs`, and `hash.mjs` into `parity/head/`.
3. `diff parity/base/showcase.hashes parity/head/showcase.hashes` prints nothing. A difference is
   traced and fixed at its cause (standing answer 15). Paste the command and its output in the PR.
4. `node parity/compare.mjs parity/base/shots parity/head/shots`; paste the count in the PR.
   Read every pair it reports as differing with your own eyes, and trace each to its cause.
5. Dispatch three fresh `standards:visual-verifier` agents, one per site, each with that site's 20
   base/head pairs as separate, labeled images (never composited), its four URLs, and the five
   widths, plus the compare output for its pairs. Each verdict is "no difference" on every pair,
   and all three are quoted in the PR.

### Task 7: review, PR, CI (path 10 min)

1. `npm run check:definitions`, `npm run test:emit`, `npm run test:catalog`, `npm run test:theme`,
   `npm run check:template`, `npm run check:docs-gate`, each bare.
2. Dispatch `standards:diff-reviewer` at whole-branch scope with this plan and the design. Fold
   every finding.
3. Push `foundation-1` and open the PR against `main` (draft until CI is green). The body opens
   with a paragraph per the voice standard, carries round id `foundation`, the acceptance evidence
   item by item, `## Decisions` (this plan's, plus any run decision), `## Held paths` (the
   `catalog.yml` change below), `## Planning misses`, and the score.
4. `ci-green <sha> --pr <n> --wait` as a background task.

### Task 8: delete the plan and prompt, land (5 min)

Before the last CI run, commit the deletion of
`docs/internal/plans/2026-11-16-foundation-1-definitions-plan.md` and
`docs/internal/plans/2026-11-16-foundation-1-executor-prompt.txt`, then run
`git grep -l "sets/kinds.json" HEAD -- . ':!BACKLOG.md' ':!CHANGELOG.md' ':!MIGRATION-NOTES.md'` prints nothing, and `git grep -n "sets/kinds.json" HEAD -- MIGRATION-NOTES.md` prints nothing (no dated entry names the path today, and Task 4 corrects the one Unreleased line). The PR body carries `Round: foundation`,
`Review: accept, open findings 0`, `Calls: none` (or each call), and no `## Before merge`.
Then mark the PR ready and hand over by `approval-packet`: under the conductor, `conductor-foundation`
reads the PR and lands it by step 1 (`round-run.md` "Reading a pass"), since passes 1 to 3 land
once their checks are green and the review is accepted. A pass that can't land that way waits for
the round's close packet, which the conductor sends. The executor writes STATUS only for a
`## Stop`.

## Held paths

`.github/workflows/catalog.yml` should list `definitions/**` in both its `pull_request` and `push`
`paths`, with `src/tests/unit/workflow-yaml.test.ts`'s `PATHS` to match, so a change to the kind
labels alone reaches the hosted catalog at its own merge. Until then it reaches it at the next
theme or set release. Recorded for the round's `merge` document (standing answer 19). Nothing
else under a held path is needed.

## Decisions

1. `[design-gap]` The design's file row leaves out `package.json`, `BACKLOG.md`, and
   `CHANGELOG.md`, and the pass needs each. The acceptance names `npm run check:definitions`, so
   `package.json` gains that script and one test file in `test:emit`, and nothing else. The design's
   backlog verdicts say "stamped by pass 1", so `BACKLOG.md` takes Task 5's edits and no others.
   `CHANGELOG.md` gains one bullet (Decisions 4).
2. `[design-gap]` The catalog schema caps a theme's kinds at three. It rises to five, or a legal
   five-kind manifest fails at publish. `maxItems` stays hand-written in both schemas.
3. `[design-gap]` The catalog index would publish `defaultFeatures`. `buildIndex` projects each
   kind to `id`, `label`, `description`, with a test.
4. `[stale-fact]` The design calls the `MIGRATION-NOTES.md` lines dated. Line 168 sits under
   `## Unreleased` and names `sets/kinds.json`, so it is corrected to the new path and count.
   `CHANGELOG.md:185` is also unreleased, but the acceptance exempts `CHANGELOG.md` and says the
   pass leaves it as written, so its bullet stays and a new bullet states the change. The repo's
   rule that a pass finalizes its own entry under `## Unreleased` is met by that bullet.
5. `[stale-fact]` #486 closed after the sweep (line 1673, `[x]`). It gets no stamp.
6. `[ambiguous]` #168's reword ("its file list, after the `kinds.json` move") is read as naming
   the nine tool schemas that `https://cairn.pub/schema/` serves and handing the
   `https://cairn.pub/schemas/` family to #482, the split the design asks #482 to state. It also
   corrects the stale `messages.go:228` to `:254`.
7. The generator writes whole `$defs` entries (`kindId`, `featureId`) and every property refers to
   them, so the generated part of each schema is one node with no hand text inside it. An empty
   list is `{ "not": {} }`, since Ajv refuses `enum: []`.
8. The three schemas are re-serialized once with `JSON.stringify(…, null, 2)`, in a commit of their
   own whose parsed content is unchanged, as `emit-tool-conditions.mjs` serializes its output.
9. `check:definitions` reaches CI through `test:emit`, whose first `emit-definitions.test.mjs`
   test runs the check on the committed tree, and runs in the fast lane as an extra command. It
   joins neither the docs gate (whose label list `src/tests/unit/docs-gate.test.ts:18-38` pins,
   outside the row) nor `check:close` (whose count `close-prebuilt.test.ts:85` pins).
10. The two old tests that compared a schema's enum with the kinds file are deleted; the check and
    its test hold the same fact for all three schemas.
11. The plan and the executor prompt live on the pass branch and are deleted before close, as
    pennant-4 did, so acceptance item 2's grep holds on the head commit. The grep excludes the
    three files the item exempts, since `CHANGELOG.md` keeps naming the old path (Decisions 4).

## Path

| Task | Minutes |
| --- | --- |
| 0 base build, scripts, screenshots, hash | 25 |
| 1 data, generator, check, tests, wiring | 40 |
| 2 schemas and their tests | 20 |
| 4 and 5, as a pair | 15 |
| 6 the no-change check, head build, parity, three verifiers | 20 |
| 7 review and PR (CI off the path) | 10 |
| 8 delete and hand over | 5 |
| Path (4 and 5 overlap) | 135 |

## Planning misses

- `[file-list]` `package.json`, `BACKLOG.md`, and `CHANGELOG.md` not in the row (Decisions 1).
- `[design-gap]` The catalog schema's `maxItems` and the index's kind projection (Decisions 2, 3).
- `[mechanism]` The design's empty feature list can't be an `enum`; probed, answered by Decisions 7.
- `[stale-fact]` The Unreleased notes called dated, and #486 closed (Decisions 4, 5).
- `[conflict]` The acceptance leaves `CHANGELOG.md` as written; the repo rule has each pass write its Unreleased entry (Decisions 4).
- `[ambiguous]` #168's reword (Decisions 6).
- `[estimate]` 135 against 80: the parity builds and 60 screenshot pairs every pass owes.
- `[file-list]` `src/tests/unit/docs-gate.test.ts` pins the docs gate's labels; found at plan review, answered by Decisions 9.
- `[design-gap]` The design names no per-pass run ceiling; the run takes the round's 1,380-minute clock and the usage ceiling.

## Review folded

One `standards:plan-reviewer` read on 2026-11-16. Folded:

- The docs-gate edit would fail `src/tests/unit/docs-gate.test.ts:18-38`, outside the row. Dropped;
  CI reaches the check through `test:emit` (Decisions 9).
- The hand-over named `approval-queue merge`, which acts on a sent document. The conductor lands
  the PR with `approval-queue land` by `approval-packet` step 1, and the executor queues nothing.
- The executor prompt's 220-minute run ceiling had no approval behind it. Replaced by the
  round's 1,380-minute clock and the usage ceiling, which the design names.
- One verifier on 60 pairs could miss a small difference. A pixel compare runs first, and three
  verifiers take one site each.
- Estimates for Tasks 0, 1, and 6 rose; the path is 135.
- The set schema's new `$defs` placement, the screenshot script, the job paths, the hash sort, and
  the test ordering are now written out.
- Task 3 folded into Task 6.
- At the pre-launch advisor read: the item-2 grep now carries its exemptions, and a grep of
  `src/tests/unit` and `scripts/**/*.test.*` found no other test that pins the lists Task 1
  edits (`close-ci-coverage.test.ts` reads only `CLOSE_COMPONENTS`).

Not folded: the fast lane picks no `test:theme` for a `schema/` change. It predates the pass, and
Task 7 and CI run `test:theme`.
