# Audit trim: task plan

Pass 1b, slug `audit-trim`, class `ordinary` plus `runner`. Initiative: `shared-standards`.
Base: `d71e4401e`, then `2d256f484` (the sweep verdicts). Design note:
`docs/internal/plans/2026-11-01-audit-trim-design.md`. Source of the calls: design.md's twelve Decide
blocks, ledger entry "cleanup design 20261101T122027-138291 approved with all 12 recommendations".

Path: 195 minutes against a design estimate of 150 and a ceiling of 300. No cut is needed.

## Pre-flight

Every task was read for owner steps and auto-mode gaps.

- **Geoff's steps:** none. No sign-in, secret, dialog, browser action, or permission rule.
- **Auto-mode writes** (workstation#192 covers cairn worktree edits under this sheet; a refusal is a
  stop, never a thing to route around):
  - T5: `claude/CLAUDE.md`, and through `npm run emit:template` the tree `templates/waymark/.claude/**`.
  - T7: `.claude/skills/cairn-judging-scope/references/what-cairn-is-and-is-not.md`,
    `.claude/skills/cairn-following-admin-design/references/admin-design-system.md`, and
    `.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md`.
  - The root `CLAUDE.md` and `.claude/rules/` need nothing: `grep -rnE "rendered|norms" CLAUDE.md
    .claude/rules` finds no audit hit.
- **A push of `.github/workflows`:** T3. #173 pushed `publish.yml` from this setup.

## Backlog sweep

Scoped sweep at `d71e4401e`, landed in `2d256f484`. A full sweep isn't due (12 of 67 open items lack a
stamp, under the 15 line, and the sheet runs one at pass 8's close).

| Item | Verdict | Reason |
|---|---|---|
| #120 | fold | `src/lib/audit/rendered.ts:305-315` dissolves with the removal. T8 moves it to Done. |
| #86 | reword | Does not close. `e2e.yml:76`, `design.yml:62`, and `test.yml:47` run the same `--with-deps` step through `bounded-install`. Reworded, placed in the cleanup round. |
| #70, #159, #166, #179, #180, #195, #196, #205 | keep | Each names a file the pass touches, in lines it doesn't rewrite. Stamped. |

## Stops and standing answers

The run sheet's standing answers apply to every task. These are this pass's own.

- **Over 300 minutes:** cut nothing of E1. Trim T5's rewrites to pointers.
- **May not set aside:** E1, the `norms` job removal, the skill clean-up, T1.
- **May set aside:** a single comment in T7 whose rewording returns a red after one structural fix.
  File it through `standards:log-issue` and list it in the PR.
- **A static rule proves to import rendered code:** that file stays and is listed. At `d71e4401e`,
  `grep -rnE "from '.*(rendered|norms|color)" src/lib/audit/rules/static` finds none.
- **`culori`, `contrast.ts`, `schemes.ts`, and `peers.ts` stay,** as does the `playwright` devDependency.
- **A test outside this plan fails on removed code:** it pins old behavior, so change it and list it
  under `## Decisions`. A test that proves the admin palette keeps running through
  `_canvas-color.ts`, since test retirement waits for Geoff's read.
- **A pair merge conflicts:** the pairs are disjoint, so a conflict means a task left its file list.
  Resolve toward the plan, then rerun the fast lane.
- **Pass 1a merges first:** `git merge origin/main`, keep both `## Unreleased` entries, run
  `npm run emit:template` and `npm run check:surface -- --update`, rerun the fast lane.
- **Questions:** none is expected. A stop goes to `docs/STATUS.md` for `cairn-cms-9b`, per the prompt.

## Tasks

Order: T1, then pair T2 and T3, then T4, then pair T5 and T6, then T7, then T8. Run the fast lane after
each task. Keep T3 ahead of T4, so no pushed head has `norms.yml` calling a removed `norms:check`.

### T1. Write the 12 calls into the rulings ledger (25 min, ordinary)

**Outcome:** `docs/internal/engine-rulings.md` records all twelve calls, including the auth ones pass 1a
executes. Pass 1a leaves this file to this task.

**Files:** `docs/internal/engine-rulings.md`, `BACKLOG.md`.

Append the eleven `cleanup-*` entries after the last entry, in the table's order. Each heading ends
`  (<verdict>, 2026-11-01, cleanup design 20261101T122027-138291)`, two spaces first. Each entry has a
one-sentence `- **Verdict:**` line drawn from its Decide block's recommendation, the `- **Reopens on:**`
line below verbatim, and, where the Reverses column isn't "nothing", a `- **Record:**` line naming each
slug, with the tag URL from the file's header. No other text.

| Call | Slug: item | Verdict | Reverses | Reopens on |
|---|---|---|---|---|
| 1 | `cleanup-rendered-audit`: the browser half of `cairn-audit` and its norms lookup | retire | The 2026-08-08 charter line that the audit "ships whole"; tag `audit-cli-cairn-audit-rendered-harness-base-url-dynamic-playwright-bot`, `audit-cli-cairn-audit-norms-subcommand-and-the-shipped-norms-manifest`, `audit-cli-rendered-allowlist-and-rule-declared-exemptions`, and the rendered rule keeps | A site rebuild misses the audit. The `pre-agent-first` tag preserves it. |
| 2 | `cleanup-starter-template`: `templates/waymark` stays committed, and `/styleguide` leaves the scaffold's production build | keep | nothing | The Deploy button leaves `ROADMAP.md`, so nothing points at the subdirectory. |
| 3 | `cleanup-history-reset`: the changelog, migration notes, roadmap history, and the Go tool's mockups reset | accept | nothing | A site must upgrade across a reset entry. The `pre-agent-first` tag keeps every line. |
| 5 | `cleanup-live-figures`: `/reproductions` stays for the editor docs | keep | nothing; the 2026-08-15 and 2026-10-31 (#173) rulings stand | cairn.pub's rebuild ships its editor docs without live figures. |
| 6 | `cleanup-visual-baselines`: the baselines and the five-viewport bar stay | keep | nothing | A measurement shows no dark-only width has caught a defect. |
| 7 | `cleanup-one-import-path`: each public name imports from its one declaring subpath, with no re-export | retire | Tag `canonical-home-rule` (re-exports as "not a second home") and part of `f1-return-position-leak-sanction` | The leak gate cannot follow a type across subpaths once the re-exports go. |
| 8 | `cleanup-hide-internals`: about 40 names leave the public surface, `/auth-store` goes, `cairn-media-seed` moves to the dev package, and `resolveDb` turns optional on `createSectionAction` | retire | Tag keeps `audit-sveltekit-adminaction`, `audit-admin-listtoolbar`, `audit-adapter-verifymanifest`, `audit-sveltekit-requireeditor`, `audit-delivery-composeentrydata`, `audit-admin-formattimestamp`, `polish-formattimestamp-domain`, `audit-delivery-buildrssfeed`, `audit-delivery-buildjsonfeed`, `audit-delivery-buildsitemap`, the `audit-auth-*` keeps on `/auth-store`, and the `cairn-media-seed` keeps | A site needs a hidden name, shown in code it has built. `tooltip-primitive` stands. |
| 9 | `cleanup-unset-options`: options and field kinds no site sets are removed | retire | Won't-do #126 and #139; tag keeps `audit-adapter-assetconfig`, `audit-adapter-navmenuconfig`, `audit-sveltekit-authguardoptions`, `audit-admin-formatcivildateoptions`, `audit-log-editor-bootstrapped` | A site sets the option, shown in code it has built. Adding one back isn't a break. |
| 10 | `cleanup-custom-recipes`: the hand-mount factories, preview token verbs, preview lifetime, and newly-published recipe are removed | retire | Tag `audit-sveltekit-mintpreviewtoken`, `audit-sveltekit-createauthroutes`, `audit-sveltekit-createeditorroutes`, `audit-sveltekit-createcontentroutes`, `audit-delivery-newlypublishedentries`; closes #115 and #116 | A site needs its own preview screen or a publish hook, shown in code it has built. |
| 11 | `cleanup-one-validate-hook`: one fail-closed `validate` replaces `refine` and `behavior` | retire | Won't-do #138; tag keeps `audit-adapter-behaviortable`, `audit-adapter-fieldbehavior`, `audit-adapter-standardinput` | A site needs a hook that fails open on a save, shown in code it has built. |
| 12 | `cleanup-wiring-reshapes`: the seven wiring reshapes and `vite dev`'s manifest regeneration | reshape | Tag keeps `audit-adapter-renderer`, `audit-adapter-resolveoptions`, `audit-delivery-siteglobs`, `audit-media-resolvedassetconfig`, `audit-delivery-siteindexes`, `audit-sveltekit-authroutesconfig`, `audit-delivery-resolvedreference`, `audit-adapter-fieldset`; "locked decision 1" at `src/lib/vite/internal.ts:14` | A rebuilt site can't express a case the old shape met. `audit-adapter-createrenderer` is honored. |

Call 4 updates its existing entry. In `audit-auth-createauthchannel` (line 316), the heading becomes
`## audit-auth-createauthchannel: `createAuthChannel`  (retire, 2026-11-01, cleanup design
20261101T122027-138291)`. The body becomes three lines, replacing all of it:

- `- **Verdict:**` retire. xcathletes, the factory's one reason to exist, is retired (dotfiles
  `cf4c26b`, PR #181), so the entry's own reopen condition is met. The second ground stands:
  hand-rolled sign-in is high-consequence, so #189's recipe on `/auth-crypto` comes first.
- `- **Reopens on:**` a site's member sign-in built from the #189 recipe meets a defect the factory
  would have prevented.
- `- **Record:**` the prior reshape and its 2026-08-30 reopening, at the tag URL.

Two other live lines change, and nothing else does:

- `audit-rule-advisory-first-tier`, lines 381-382, quoted: "`cairn-audit` static or\n  rendered rule
  reaching a consumer's own tree". Drop "or rendered".
- `BACKLOG.md`, Won't-do #126, #138, and #139: append ` Reversed by \`cleanup-unset-options\`` (or
  `cleanup-one-validate-hook` for #138) ` (Geoff, 2026-11-01).` They stay in the section.

`convention-identifier-grammar`'s `rendered-*` text is a closed record, so it stays.
`runtime-publicmediaresolver` is pass 2's.

**Acceptance:** `npm run check:rulings-format` passes. `grep -c 'cleanup design 20261101T122027-138291'
docs/internal/engine-rulings.md` prints 12. `grep -n 'REOPENED 2026-08-30' docs/internal/engine-rulings.md`
prints nothing.

**Test:** none. The format gate is the test. Push and open the draft PR here.

### T2. Move the tests off the code E1 deletes (30 min, ordinary; pair with T3)

**Outcome:** nothing outside `src/lib/audit` and the tests T4 deletes imports `rendered`, `norms`, or
`color`. The palette, recipe, and vertical-alignment proofs still run.

**Files:** new `src/tests/unit/_canvas-color.ts`; `src/tests/unit/{badge-tier-legibility,
interactive-control-edge-contrast,status-chip-register-tuning,guidance-recipes-sync}.test.ts`;
`src/tests/component/BtnActiveDarkGround.test.ts`; `src/tests/lab/vertical-metrics{,.test}.ts`.

- `_canvas-color.ts` takes `Rgba`, `composite`, `relativeLuminance`, and `contrastRatio` from
  `src/lib/audit/color.ts`, plus `resolveColors` and its in-page function from
  `src/lib/audit/rendered/page-surface.ts:81-96`, moved as they stand. Its page parameter is a local
  `{ evaluate }` type. Repoint the imports quoted below. `BtnActiveDarkGround.test.ts:58`'s comment
  cites `src/lib/audit/color.ts`, so point it at the helper.
  - `import { composite, contrastRatio, type Rgba } from '../../lib/audit/color.js';`
  - `import { resolveColors, type RenderedPage } from '../../lib/audit/rendered.js';`
  - `import { composite, contrastRatio as rgbaContrastRatio, type Rgba } from '../../lib/audit/color.js';`
- `guidance-recipes-sync.test.ts:16` reads `import { RATIFIED_NORMS, RECIPE_MODEL, ROLE_RECIPES } from
  '../../lib/audit/norms.js';`. Move `RECIPE_MODEL` (`norms.ts:302`) and `ROLE_RECIPES` (`norms.ts:317`)
  into the test as local data, dropping the `role` field and `RoleRecipe`'s link to the ratified table.
  Delete `checkRoleRows` and the test that calls it, which had `RATIFIED_NORMS` as its other side. List
  that under `## Decisions`.
- `vertical-metrics.ts:364-366` reads the helpers from `globalThis.__cairnAudit`. Replace them with
  local `signature` and `isVisible` copied from `page-surface.ts:163-215`, inside the in-page
  function, and delete `import { ensurePageHelpers } from '../../lib/audit/rendered.js';`, the
  `import type` at line 72, and the `await ensurePageHelpers(page);` in `measureVerticalMetrics`.
  Declare a local `RenderedPage` with the two methods it uses, exported for `vertical-metrics.test.ts:33`.

**Acceptance:** `grep -rlE "audit/(rendered|norms|color)" src/tests scripts` lists only
`src/tests/unit/audit/{rendered,norms,color}.test.ts`, `src/tests/unit/audit/rules/rendered/**`, and the
scripts T4 deletes. `npx vitest run --project unit src/tests/unit/guidance-recipes-sync.test.ts` passes.
A deliberately removed row from a guidance copy still fails that test.

**Test:** the moved tests. Run the fast lane with the component project, since a component test moved.

### T3. Remove the `norms` workflow (35 min with its CI wait, runner; pair with T2)

**Outcome:** no workflow calls `norms.yml`, and `publish` and `publish-dev` have no `needs`.

**Files:** delete `.github/workflows/norms.yml`; `.github/workflows/{e2e,publish}.yml`;
`.github/ci-green.json`; `src/tests/unit/workflow-yaml.test.ts`.

- `e2e.yml:17-23`: delete the comment block from "# The 0.91.0 cut proved" and the `norms:` job.
- `publish.yml:23-28`: delete the comment block from "# The norms manifest ships in the package" and
  the `norms:` job. Delete `    needs: norms` at lines 31 and 97. Drop `norms.yml, ` from the comment at
  line 46. Line 150 `needs: [publish, publish-dev]` stays.
- `.github/ci-green.json:14`: delete `".github/workflows/norms.yml",`.
- `workflow-yaml.test.ts:108-119`: delete the test "reads a reusable-workflow call through the jobs of
  the workflow it calls". No caller remains, so remove the `job.uses` branch in `jobsWithoutTimeout`
  (lines 88-95) and its doc comment lines too. List it under `## Decisions`.

**Acceptance:** `grep -n 'needs:' .github/workflows/publish.yml` prints only line-150's
`needs: [publish, publish-dev]`, and `grep -rn 'norms' .github .github/ci-green.json` prints nothing.
After the merged commit is pushed, `node scripts/checks/gate-tier.mjs --range <base>..HEAD --protected`
prints `ciWait`, so run `ci-green <sha> --pr <n> --wait` and start T4 only on green.

**Test:** `npx vitest run --project unit src/tests/unit/workflow-yaml.test.ts`.

### T4. Remove the rendered half and norms (45 min, runner)

**Outcome:** `cairn-audit` is static. `--rendered` and `norms` are unknown arguments.

**Files:**

- Delete: `src/lib/audit/rendered.ts`, `src/lib/audit/rendered/`, `src/lib/audit/rules/rendered/`,
  `src/lib/audit/norms.ts`, `src/lib/audit/norms-manifest.json`, `src/lib/audit/color.ts`,
  `scripts/lab/generate-norms-manifest.mjs`, `scripts/checks/check-interactive-contrast.mjs`,
  `scripts/checks/check-touch-targets.mjs`, `scripts/checks/live-probe-support.mjs`,
  `src/tests/unit/audit/{rendered,norms,color}.test.ts`, `src/tests/unit/audit/rules/rendered/`.
- `package.json`: remove the scripts `check:interactive-contrast`, `check:touch-targets`,
  `norms:generate`, `norms:check`.
- `src/lib/audit/bin.ts`: remove the `formatNormsQuery, loadNormsManifest, queryNorms, renderedRules,
  runRendered, unknownTermMessage` imports, `norms()`, the `args.command === 'norms'` branch, and the
  header lines 4-5. Replace `const report = args.rendered ? await runRendered(config,
  selectRules(renderedRules(), args.rule)) : runStatic(config, selectRules(staticRules(), args.rule));`
  with the static call.
- `src/lib/audit/index.ts`: remove the re-exports from `./norms.js`, `./rendered.js`,
  `./rules/rendered/index.js`, `./color.js`, plus `DEFAULT_RENDERED_PAGES` and `RenderedAllowlistEntry`.
  Keep `contrast.js`, `import-chain`, `peers`, `schemes`, and `theme-contrast`.
- `src/lib/audit/config.ts`: remove `DEFAULT_RENDERED_PAGES`, `RenderedAllowlistEntry`, `renderedPages`,
  `renderedAllowlist`, `asAllowlist`, `const renderedSection = asRecord(file.rendered, 'rendered');` and
  what reads it. In `USAGE`, remove `[--rendered]`, the `cairn-audit norms <selector-or-role>` line, the
  `--rendered` and `norms` blocks, ", no server, no browser", and the last two lines' "Rendered mode
  exempts through rendered.allowlist in the config, and only an advisory rule can exempt itself."
  `AuditArgs` becomes one object type, and `parseArgs` drops `term`, `if (rest[0] === 'norms')`, and the
  `--rendered` branch. A `rendered` key in an old config is ignored, as any unknown key is.
- Comments and messages:
  - `src/lib/audit/run.ts:179` "Generic over both rule shapes (static and rendered)".
  - `src/lib/audit/report.ts:17`, both "rendered" clauses.
  - `src/lib/audit/rules/static/theme-contrast.ts:17-18` "The rendered checks (`interactive-contrast`,
    and the rendered page itself) stay the ground truth", and `:272-274`, where each "in the rendered
    audit" becomes "in a browser".
  - `rules/static/list-role.ts:19,226`, which names `rules/rendered/list-role.ts`.
  - `rules/static/stock-default-hazards.ts:19`: "the audit\'s 3:1 border-contrast floor" becomes
    "cairn\'s 3:1 border-contrast floor".
  - `rules/static/stripe-trim-parity.ts:12`: the `container-inset-asymmetry` precedent. Drop the clause.
- `scripts/checks/check-package-files.mjs`: remove the `rendered:` row of `RULE_REGISTRIES` (line 270),
  `reachableRenderedBasenames`, and `reachable.rendered`, so the reachability check takes the static
  set alone. Its test `src/tests/unit/check-package-files.test.ts:340-360,407-408` moves its fixture to a
  static rule name. Keep the file's `vertical-metrics` worked-example comment true: it describes
  history, so leave it.
- `scripts/checks/check-skill-budget.mjs`: remove the rows `{ label: 'Rendered, error tier', ...}` and
  `{ label: 'Rendered, advisory tier', ...}`, `renderedModule`, and the `mode` typedef's rendered arm.
  Its test `src/tests/unit/check-skill-budget.test.ts:18,141,150,151` follows.
- Tests that pin old behavior: `src/tests/unit/audit/config.test.ts` (rendered lines 61, 77-78, 100-116,
  149-178, 339-398) and `src/tests/unit/audit/fail-on.test.ts:44-45` (`rendered: false` goes). Its
  `:58` case keeps `--rendered` as a flag-shaped value, which `--fail-on needs a value` still rejects,
  so change the fixture to `--config`. Add one case to `config.test.ts`: `parseArgs(['--rendered'])` and
  `parseArgs(['norms', 'x'])` each throw `unknown argument`.

**Acceptance:** `npm run package` then `node dist/audit/bin.js --rendered` and `node dist/audit/bin.js
norms button-primary` each exit 2 and print `unknown argument`. `npm run check:audit-pack` passes.
`npm run check:package` passes, with no `rendered` path in `dist/audit`. `npm run check:skill-budget`
passes. `grep -rnE "from '.*(rendered|norms|color)\.js'" src/lib src/tests scripts` prints nothing
except the unrelated `*-rendered*` names, if any, each read and listed.

**Test:** the new parse case, plus the suites above. Before deleting, the new case fails against the
old `parseArgs`.

### T5. Clean the packaged skills (40 min, ordinary with one runner file; pair with T6)

**Outcome:** no packaged guidance teaches `--rendered` or `norms`. Design guidance a rule used to
enforce stays as guidance, and a value the norms query used to print is reached through the skill's
"Write this, get this" table, `references/exemplar-kit.md`, and `references/form-anatomy.md`.

**Files:** `skills/cairn-building-admin-screens/SKILL.md` and its `references/{audit-rules,
extension-grammar,exemplar-list,exemplar-detail,form-anatomy}.md`;
`skills/cairn-extending-a-site/references/{audit,daisyui-first}.md`; `claude/CLAUDE.md`;
`scripts/checks/check-symbols-allowlist.mjs`; `src/tests/unit/check-symbols.test.ts`;
`src/tests/unit/skill-references-compile.test.ts`; generated `templates/waymark/.claude/**`.

- `SKILL.md`: line 17 job row drops "run rendered mode, read a norms query". Lines 28-31 become
  "`cairn-audit` (`npx cairn-audit`) runs twenty-one rules: seventeen error tier and four advisory."
  Delete the "**Rendered, error tier:**" and "**Rendered, advisory tier**" blocks. Lines 83-84 "Before
  inventing a height or a padding, run `npx cairn-audit norms <role>`." point at the "Write this, get
  this" table. Register rules that cite `one-filled-action` and `chip-ground-collision` keep the rule
  of thumb and drop the id. Delete done-gate item 2 "**The rendered audit passes**", renumbering.
- `references/audit-rules.md`: remove the contents lines 9-12, the rendered text at lines 20 and 22, the
  config rows at lines 104-106, and the sections "Rendered mode", "Rendered rules", "The rendered
  allowlist", and "The norms query". The exit-code text loses "no server, no browser".
- `references/extension-grammar.md`: lines 4, 9, 16-17, 21, 28, and 39, and the "Audit" worked-example
  bullet, name static rules only.
- `references/exemplar-list.md:34,40`, `exemplar-detail.md:28,120`, `form-anatomy.md:40`: each rule
  mention goes, and the design statement stays.
- `skills/cairn-extending-a-site/references/audit.md`: delete the contents lines and sections "## The
  rendered pass" (lines 123-134 hold the Playwright, `BASE_URL`, and `CAIRN_AUDIT_COOKIES` text) and fix
  "## Exit code 2". `references/daisyui-first.md:83-84` "`npx cairn-audit norms <role>`\nprints the
  measured values." points at the same table.
- `claude/CLAUDE.md:33-34`: delete "`cairn-audit --rendered` runs the same audit against a running dev
  server on\nboth themes; run it by hand when you need it." Pass 1a edits lines 25-26, so the hunks differ.
- `claude/snippets/check-cairn.json:8` needs nothing: #121 removed it, and line 8 is the closing brace.
- `check-symbols-allowlist.mjs:21`: delete `'cli-flag:--rendered', // cairn-audit's flag, not
  create-cairn-site's`. `check-symbols.test.ts:108,110`: change the fixture to `npx cairn-audit --rule
  list-role`. `skill-references-compile.test.ts:89`: the comment's `` `cairn-audit norms destination` ``
  example becomes `` `cairn-audit --rule list-role` ``.
- Run `npm run emit:template`. Commit its output with this task.

**Acceptance:** `grep -rnE -- "--rendered|cairn-audit norms|CAIRN_AUDIT_COOKIES|rendered\.(allowlist|extraPages)"
skills claude templates/waymark/.claude` prints nothing. `npm run check:skill-budget`, `npm run
check:symbols`, `npm run check:public-skill`, and `npx vitest run --project unit
src/tests/unit/guidance-recipes-sync.test.ts src/tests/unit/skill-references-compile.test.ts` pass.
`grep -n 'admin-design-system' -r skills claude` prints nothing new: the file doesn't ship.

**Test:** the gates above. No new test.

### T6. Drop the audit-config step from the bake (15 min, ordinary; pair with T5)

**Outcome:** the showcase carries no rendered config, and the scaffold's `cairn-audit.config.json` copies
through the bake unchanged in content.

**Files:** `examples/showcase/{package.json,cairn-audit.config.json,.cairn-template.json}`,
`packages/create-cairn-site/scripts/bake-template{,.test}.mjs`.

- `examples/showcase/package.json:22`: delete `"check:cairn:rendered": "cairn-audit --rendered",`.
- `examples/showcase/cairn-audit.config.json`: delete the `rendered` key, leaving `"sheet"` only.
- `examples/showcase/.cairn-template.json:20`: delete `"cairn-audit.config.json"`.
- `bake-template.mjs:21`: `PRUNED_SCRIPTS` loses `'check:cairn:rendered'`, since
  `pruneShowcaseOnlyPackageFields` throws on a missing expected script. Delete `AUDIT_CONFIG_FILE`
  (lines 24-29), `pruneShowcaseOnlyAuditConfig` (lines 153-171), and the regeneration block (lines
  313-322). `bake-template.test.mjs:223,238` drop the entry from their fixtures.

**Acceptance:** `npm test -w packages/create-cairn-site` and `npm run test:emit` pass. `npm run
emit:template` then `git status --short templates/waymark/cairn-audit.config.json templates/waymark/package.json`
prints nothing, which proves the copied file equals the old pruned output. On this file the check was
probed at `d71e4401e`: the showcase config minus `rendered`, at two-space indent with a trailing
newline, is byte-identical to the template's.

**Test:** the bake suite above.

### T7. Fix the inbound references (20 min, ordinary)

**Outcome:** no engine doc, internal skill, or comment names a removed rule, file, or flag as live.

**Files:**

- `.claude/skills/cairn-judging-scope/references/what-cairn-is-and-is-not.md:55-64`: replace the
  "**`cairn-audit` ships whole, as consumer product.**" paragraph. Keep the reasoning that the admin is
  the product being audited, and say the static audit ships, with twenty-one rules, and the browser half
  retired on 2026-11-01 (`cleanup-rendered-audit`).
- `.claude/skills/cairn-following-admin-design/references/admin-design-system.md:620,638,664,880-881`:
  "the audit's own" floors become the system's floors. Lines 880-881 cite `src/lib/audit/norms.ts` and
  `src/lib/audit/rules/rendered/screen-anatomy.ts`, so drop that clause. Line 1336 stays until pass 8.
- `.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md:194,204`: both cite
  `src/tests/unit/audit/rendered.test.ts`. Drop the example at line 194. Delete the sentences from "A
  preview server on port 4173" through `confirms).` at lines 203-206, since that test held the risk.
- `CONTRIBUTING.md:190-191`: "Two exceptions run in CI: `test:reskin` from `design.yml` and\n
  `norms:check` from `norms.yml`." becomes one exception.
- `examples/showcase/e2e/theme-kit-contrast.spec.ts:6,47`, and `src/tests/unit/audit/rules/list-role.test.ts:133,214-217`.
- `src/lib/admin/{DeleteDialog.svelte:91,EditorToolbar.svelte:377,460,CairnAdminShell.svelte:846,979,1101,EntryPicker.svelte:143,ComponentInsertDialog.svelte:451,EditPage.svelte:1661}`:
  drop "(cairn-audit's list-role rule, rendered mode)".
- `src/lib/admin/ConceptList.svelte:225`, `VocabularyAdmin.svelte:207`, `src/lib/admin/cairn-admin.css:1726,1728`.
- `src/lib/admin-toolkit/StatusChip.svelte:16,74,76,122`: a public doc comment, so the floors stay as
  cairn's and the file citations `chip-ground-collision.ts` go.

**Acceptance:** `grep -rnE "chip-ground-collision|one-filled-action|rendered mode|rendered audit|rules/rendered|norms\.ts|norms:check|touch-targets" src/lib skills claude
.claude/skills CONTRIBUTING.md examples/showcase/e2e` prints only lines read and kept, each listed in the
PR. `npm run check:comments` and `npm run check:options` pass.

**Test:** the fast lane, with the component project for the `.svelte` files.

### T8. Close the records (30 min, ordinary)

**Outcome:** the pass is ready for the conductor.

**Files:** `CHANGELOG.md`, `MIGRATION-NOTES.md`, `BACKLOG.md`, `docs/STATUS.md`, and the deletion of
this plan, its design note, review files, and prompt files.

- `CHANGELOG.md`, `## Unreleased`, `### Removed`, and `MIGRATION-NOTES.md`, `## Unreleased`: one entry
  each. `Consumers must:` lines: drop `cairn-audit --rendered`, `cairn-audit norms`, and any
  `check:cairn:rendered` script; delete a `rendered` section from `cairn-audit.config.json`; remove
  Playwright if the audit was its only use.
- `BACKLOG.md`: #120 moves to `## Done` as `done: dissolved by pass 1b's removal of src/lib/audit/rendered.ts`.
- No docs page changes: `grep -rlE "cairn-audit" docs/admin docs/editors docs/why-cairn.md README.md`
  prints nothing. Show that command in the PR. `npm run check:surface` passes unchanged.
- Dispatch `standards:diff-reviewer` at whole-branch scope against the design note and this plan.
  Fold every `fix`, then rerun the fast lane. Push, and confirm green CI on the head.
- Delete the plan files in a last commit. Mark the PR ready. Write the PR body per `pass-core` "Close"
  with `## Brief`, `## Decisions`, `## Planning misses`, and the score. Never bump, publish, or merge.

**Acceptance:** `npm run lane:fast -- --range <base>..HEAD` passes on the head. `ci-green <head> --pr
<n> --wait` exits 0. The review's last verdict is `accept`, or each open finding is stated with its reason.

**Test:** the whole suites on CI.
