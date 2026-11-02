# small-api plan

- **Slice:** run sheet pass 3 plus pass 2's shape 8, cut forward. Design: `2026-11-01-small-api-design.md`.
- **Class:** `ordinary` plus `runner` by the sheet. T1 and T5 are `auth-data` by the path map, with T13 as a security-read note at the close, since its page-route `data` types can reach `(site)/preview/[token]`. The whole-branch close adds the security read and the live smoke. See the design's "Class".
- **Base:** `main` at launch. Cites were read at `f89fe83be`, and each cite in a file PR #180 changed was re-read at `16a081668`. The executor's setup lands on current `main`: it enters a worktree cut from the main checkout, then runs `git merge origin/worktree-small-api`. No other merge step. **Branch:** `worktree-small-api`, pushed to `glw907/cairn-cms`.
- **Estimate:** design 330, ceiling 840, plan path **540**, set from recent actuals (0.4 to 0.65 of plan). No cut is planned. The cut order stays armed: ergonomics 21, then 13, then W3's unverified names.
- **Review:** three lenses, fold (`2026-11-01-small-api-fold-record.md`), verification read, saved beside this plan.
- **Merge:** conductor (`cairn-cms-9b`) under the merge word, record packet first. The executor stops at PR-ready, finalizes its `## Unreleased` entry, never bumps or publishes, and merges `main` only when told.
- **Executor:** Opus high (the sheet's pass 3 line), `cairn-cms-small-api`. Tasks go to `cairn-implementer`; those marked **upshift** pass `model: opus`.

## Sweep verdicts

Scoped sweep at `f89fe83be`, by a read-only agent. The backlog edits landed in `acac26a79`. Overrides of the agent's verdicts are marked. Items sibling plans take aren't stamped here, since those lines are theirs.

| Item | Verdict | Reason |
|---|---|---|
| #98 | fold, T2 | `src/lib/index.ts:54` exports `parseMarkdown` alone. |
| #160 | fold, T2 | `render/highlight.ts:29-31`, `pipeline.ts:183,187`. `EditPage.svelte:102` still takes `render`, so say out of the static client graph, never out of the browser. |
| #187 | fold, T2 | `guard.ts:92,123,355,363`, `sveltekit/index.ts:15`, allowlist `:33`. |
| #201 | fold, T2 | `admin/media-base-context.ts:5`, `render/resolve-media.ts:14`, `media/naming.ts:131`. |
| #233 | fold, T2 | `check-self-use-allowlist.json:52`. Cite `RenderInput` (`pipeline.ts:50`). |
| #230 | reword, fold, T13 | It isn't a union today: `public-routes.ts:64` is an interface. Reworded and re-placed in `acac26a79`. |
| #231 | fold, T3 | The `/delivery/data` fold removes the question. The four sites don't import those names from there. |
| #32 | fold, T10 | `types.ts:372-373`, `concepts.ts:38-41`, `fixtures.ts:36`. No reader in `src/lib`. |
| #103 | fold, T8 | `admin-nav.ts:284`. |
| #144 | fold, T9 | `pipeline.ts:119-120` goes with `anchorRel`; reword `:169` to "after the dispatch", keep the order at `:190-199`. |
| #115, #116 | keep (override) | The agent proposed a fold. admin-rest drops both, and `cleanup-custom-recipes` closes them. T5 removes the code. |
| #190, #122 | keep (override) | admin-rest T3 owns the ordering and the reorder in `preview.ts`. T5 keeps them. |
| #134 | keep (override) | content-rest moves it to Done. |
| #200 | reword, keep | Its files aren't this pass's. Placement moved to Pass 8; admin-rest corrects its citations. |
| #198 | reword, keep | Citations corrected. The pass doesn't rewrite that row. |
| #133, #232, #243 | keep | Mechanism holds, not in rewritten lines. Stamped. |
| #143, #173, #24, #179, #181, #164, #107, #237, #199, #136, #75, #180 | keep | Sibling plans or PR #180 take them. |
| #248, #247, #182, #238, #216, #239, #203, #195, #245, #70, #196, #188, #193 | keep | Other passes; no overlap with rewritten lines. Not re-read. |

No drop and no duplicate. The agent counted 35 open items with no recent stamp, so the skill's rule says a full sweep is due. The sheet places the full sweep at pass 8's close, and a sheet answer beats the skill, so it doesn't run here. Most of the 35 were filed this week. See `## Tooling` seeds.

## Pre-flight

Nothing for Geoff: no sign-in, no secret, no dialog, no permission rule. The live smoke mints a local session in a local D1 (`wrangler d1 --local`) and reads wrangler's local `send_email` output.

Auto-mode notes, named per the launch prompt. `autoMode.allow` covers these. A refusal is a stop for `cairn-cms-9b`, never a thing to route around, with one exception: a refused eval deletion takes the standing answer below.

Writes under `.claude/skills/`, each file by task:

- **T2:** `cairn-writing-docs/evals/site-cases/s04-cloudflare-access.json:14`, `cairn-writing-engine-code/references/code-idioms.md:45`.
- **T3:** `cairn-writing-docs/references/docs-register.md:290`. `S06-newly-published.json` also hits the T3 row, as a listed false match until T5 deletes it.
- **T5 (deletes):** under `cairn-writing-docs/evals/`, `site-cases/s05-draft-preview.json`, `site-cases/S06-newly-published.json`, `setups/site/s05-draft-preview-bad.mjs`, `setups/site/s06-newly-published-bad.mjs`, `setups/site/s06-newly-published.mjs`.
- **T7:** `cairn-writing-engine-code/references/durable-gotchas.md`.
- **T10 (script):** `cairn-writing-docs/evals/setups/site/s08-public-routes.mjs`, `s15-adopt-and-migrate-bad.mjs`.
- **T11:** `cairn-writing-docs/evals/site-cases/S08-public-routes.json`, `s12-tidy-and-posture.json`, `setups/site/s12-tidy-and-posture.mjs`, `s12-tidy-and-posture-bad.mjs`.
- **T12:** `cairn-following-admin-design/references/daisy-absorption-ritual.md`.
- **T14 (script):** `cairn-writing-docs/references/docs-register.md`, `evals/site-cases/S09-component-with-island.json`, `evals/setups/site/s09-component-with-island-bad.mjs`.
- **T15:** any hit the table leaves in `.claude/skills/`.

`e3-seam-bug-fix.json:21` names `createAdminAction`, an internal name that stays true, so nothing edits it. Others: T14 and T15 edit `.claude/rules/` only if a table hit there is true. T15 edits `CLAUDE.md` only on a true hit, and none is expected. `npm run emit:template` writes `templates/waymark/.claude/skills/`. `wrangler d1 --local` and stopping the test Worker the session started, at T16. Conductor merges under the merge word.

No task reads a credential.

## Standing answers

The sheet's "Standing answers for every pass" all apply. For this slice:

- **May set aside:** ergonomics 13, 21, W3's `ADMIN_CSS_SAFELIST` and `fenceDepths`, shape 14, shape 21's riders, #230, and the `/delivery/data` fold if a dynamic kit import fails its dist test. **May not:** shape 8, shape 7, the hide-internals set, E9, the leak gate. A set-aside goes under `## Decisions`, with a backlog item. Closing an item in T15 skips one set aside.
- **`ADMIN_CSS_SAFELIST`** goes only on a clean built-CSS diff of `dist/admin/cairn-admin.css`. Any byte of difference keeps it.
- **A conditional `ctx.db` type fails:** type it optional and document the narrowing. (Sheet, verbatim. T4's overloads are how the conditional avoids failing, so this stays the fallback.)
- **A barrel-prune test from R6's list breaks:** update it to the new names, never delete it.
- **A test pins a renamed string or name:** change the test and list it.
- **Anything breaks a site:** add a `Consumers must:` line, no shim. Each line sits alone with a blank line before and after, starts at column 0 or two spaces, and ends in a period. Write no bare `Consumers must:` phrase in prose outside a code span. `npm run check:consumers-must` enforces this: a task adding a line runs it, and `lane:fast` selects it on any range with a `.md` path (`gate-table.json`, `docs` bucket).
- **`preview.ts` beside admin-rest:** T5 and admin-rest T3 edit neighbouring lines in `mintPreview`. Whichever lands second keeps admin-rest's check order and this pass's removal of `ttlMs`. That is a merge chore, not a set-aside.
- **`content-routes-preview.ts` and `content-routes-preview.test.ts` beside admin-rest:** whichever lands second keeps `requireOrigin` before the mint, keeps admin-rest's #122 and #190 tests, and moves them to the three-argument call. After the merge, `npm run check` and the test "With no `PUBLIC_ORIGIN`, the mint writes no `preview_tokens` row" must pass.
- **`fieldset.ts:455` beside content-rest:** if `behavior` is gone by merge, drop that string from T8.
- **`check-surface-reexports.json` beside content-rest:** content-rest adds an `EntryRef` row. Keep the file deleted, and give `EntryRef` one home in the merge.
- **`delivery/data.ts` and `verifyEntries` beside content-rest:** `data.ts` stays deleted, and its additions move to `delivery/index.ts`. `verifyEntries` joins `internal.ts` and leaves the root. The generated module keeps one `/internal` import. `ManifestProblem` gets one home.
- **T10 and T14 beside content-rest:** their renames are mechanical. On a conflict, the merge takes `main`'s side and re-runs the task's script line, then the task's hand edits. If the merge comes after the plan files leave at close, take the script from `git show <the commit before the deletion>:docs/internal/plans/2026-11-01-small-api-renames.mjs`.
- **After any merge from `main`:** rerun the whole dead-name table. A sibling branch can reintroduce a name in prose or a skill with no conflict and no failing check.
- **A cause that returns after one structural fix:** set the item aside if the line above allows, and list it. A may-not item stops with one question in `docs/STATUS.md`.
- **A real dependency found:** set the item aside for its home pass, list it, go on.
- **A conflicting PR fires no `pull_request` CI.** At the first conflict, tell `cairn-cms-9b`, and merge `main` on its word. `templates/waymark`, `scripts/checks/api-surface.md`, and `CHANGELOG.md` are merge chores: keep both `## Unreleased` entries, run `npm run emit:template` and `npm run check:surface -- --update`, rerun the fast lane.
- **Intended visual change (T14's UI strings):** regenerate on CI through `e2e.yml`'s `update_snapshots`, never a local baseline.
- **New BACKLOG item:** the next free number on `main` at merge. Name the placeholder in the PR.
- **Heavy lane:** `RUN_GATE_IF_BUSY=defer` is allowed except on T1 and T5.
- **Refused eval deletion (T5):** leave S05 and S06 in place, file a backlog item for pass 8, and go on. They aren't a gate this pass needs, and `run-site.test.mjs` doesn't pin them. The row T5's hits there are listed as false.
- **Run git as a plain single command** from the worktree. The guard refuses compound forms (#214 on PR #180). A refusal of a form is not a stop: use the plain form, or the Read and Grep tools. Log each one for `## Tooling`.
- **A count of retries** is a loop guard, never a stop while each retry fixes a traced cause.

## Tasks

Every task commits, then runs `npm run lane:fast -- --range <base>..HEAD`.

**Surface tasks** (T1 to T6, T9, T10, T11, T13, T14) run `node scripts/checks/check-surface-leaks.mjs`, reconcile `check-surface-leaks.json` to the derivation, then run `npm run check:surface -- --update` and commit `api-surface.md`. `check:surface` chains the leak gate first, so a stale row blocks `--update`. That's why surface tasks are serial.

**Template:** `check:template` diffs a wholesale bake of the showcase. So edit the showcase only, never `templates/waymark` by hand, and any task touching the showcase or `skills/` runs `npm run emit:template` and commits the output. A task edits the skill lines its own gates read (`check:public-skill`, the skill-references test); T15 sweeps what's left.

**Records:** each task with a behavior or surface change adds its `## Unreleased` lines and its `MIGRATION-NOTES.md` step as it goes, except inside a pair (see the pair headers). `Consumers must:` lines are listed per task, so T15 only proofreads them.

**Tier tags:** a hidden name keeps its tier tag where the file is `auth-data` (`auth-routes.ts`, `auth/roles.ts`). `check:tiers` walks exports only, and #243 already carries those tags. Elsewhere, drop `@public` from a name that leaves the barrels.

**Showcase proofs:** the setup command installs the showcase, so a showcase command runs against this worktree's engine after `npm run package`.

### Dead-name table

Shared pathspec, for every row:

`. ':!CHANGELOG.md' ':!MIGRATION-NOTES.md' ':!BACKLOG.md' ':!ROADMAP.md' ':!docs/internal' ':!tool/CHANGELOG.md' ':!packages/*/CHANGELOG.md' ':!scripts/checks/consumers-must-baseline.json'`

A task's acceptance includes `git grep -nE "<its row>" -- <pathspec>` printing nothing, or each hit listed in the PR as a false match. T15's acceptance is every row. Each row was run at `16a081668` and hits today.

| Task | Regex |
|---|---|
| T1 | `runtime\??\.(render|icons|assets|sender)\b` |
| T2 | `IdentityRefusal` |
| T3 | `delivery/(data|head)\b|cairn-cms/render\b|delivery-data-dist-spawn` |
| T4 | `AdminActionOptions|deps\.(access|isDev)|\bisDev\b` |
| T4, narrowed to `-- skills docs` | `createAdminAction` |
| T5 | `PreviewTokenConfig|resolveTtlMs|buildNewlyPublished|\bpreview: \{ ttlMs` |
| T6 | `check-surface-reexports|loadReexportRecord|deriveRendererLeaks` |
| T7 | `src/lib/media-seed|dist/media-seed` |
| T9 | `sanitizeSchema|unsafeDisableSanitize|anchorRel|includeSubDomains|intlOptions|bodyClass|spellcheck\??\.dialect` |
| T10 | `inFeeds|routing: ?['"]feed|'feed'` |
| T11 | `\b(rss|jsonFeed|sitemap|robots|markdown)Response\b` |
| T12 | `generateComponentReference|deriveTagUsage|markFirstList|fenceDepths` |
| T14 | `defineComponent|ComponentDef\b|ComponentRegistry|ComponentContext|onComponentAtCaret|rendering\??\.components|markdown-components|defineRegistry\(\{ components|rendering: \{ components|Insert a component|Search components|Back to components|Edit the component at the cursor|Place the cursor in a component|Fold this section|Layout marker|layout blocks` |

Known false matches: T9's `not.toContain('includeSubDomains')` at `admin-response.test.ts:12`, if kept. T10's refusal tests below.

### T1. Shape 8: `CairnRuntime` loses `render`, `icons`, `assets`; `sender` becomes `email`. 25 min, `auth-data`

- **Outcome:** `composeRuntime` no longer copies what the adapter already holds. No code reads those members.
  `compose.ts` today, inside `composeRuntime`:
  ```ts
  sender: adapter.email,
  render: adapter.rendering.render,
  icons: adapter.rendering.icons,
  navMenu: adapter.editor?.nav,
  siteConfigPath: adapter.editor?.siteConfigPath ?? DEFAULT_SITE_CONFIG_PATH,
  assets: adapter.media,
  media: normalizeMedia(adapter.media),
  ```
  Keep `navMenu`, `siteConfigPath`, and `media`. `sender: adapter.email,` becomes `email: adapter.email,`.
  `auth-routes.ts:240` reads `await send(env, buildMagicLinkMessage({ to: email, siteName: config.runtime.siteName, sender: config.runtime.sender, link }));`, and takes `sender: config.runtime.email`. `buildMagicLinkMessage`'s own `sender` input stays. Fix the stale comments at `auth-routes.ts:2,40` and `cairn-admin.ts:40`.
- **Files:** `src/lib/content/compose.ts`, `src/lib/content/types.ts` (`sender: SenderConfig;` at `:436`, `render: SiteRender;`, `icons?: IconSet;`, `assets?: MediaConfig;`), `src/lib/sveltekit/auth-routes.ts:2,40,240`, `src/lib/sveltekit/cairn-admin.ts:40`, `src/tests/unit/compose-icons.test.ts` (delete), `src/tests/unit/content-compose.test.ts:14`, the runtime fixtures the type check names, `api-surface.md`.
- **Test first:** an `auth-routes` test builds a runtime with `email: { from: ... }` and asserts the message's sender. It fails before the rename. A type test holds `@ts-expect-error` on `runtime.render`, `.icons`, `.assets`, and `.sender`, which fails while the members exist.
- **Acceptance:** the T1 row. `git grep -nE "^\s+(sender|render|icons|assets):" -- src/lib/content/compose.ts` prints nothing. `CairnAdmin.svelte:93,95` keep their `rendering` prop. The magic-link suite passes.
- **Consumers must:** `Consumers must: read `runtime.email` in place of `runtime.sender`, and read `render`, `icons`, and `media` from the adapter in place of `runtime.render`, `runtime.icons`, and `runtime.assets`.`

### T2. Small names: #187, #98, #201, #233, #160. 15 min, `runner`

- **#187:** `export interface IdentityRefusal {` at `guard.ts:123` becomes `IdentityFailure`, at every site the T2 row lists. A `Consumers must:` line.
- **#98:** export `serializeMarkdown` (`frontmatter.ts:354`) beside `export { parseMarkdown } from './content/frontmatter.js';`, with `@public`. Add a showcase use or a self-use allowlist row. `root-barrel-prune.test.ts:23` lists it as off the root, so that name moves to the test's "stays" assertion.
- **#201:** `export const DEFAULT_MEDIA_BASE = '/media';` moves from `admin/media-base-context.ts:5` to `src/lib/media/naming.ts`. `resolve-media.ts:14`, the six admin importers, and `publicPath`'s default read it. `MEDIA_BASE_CONTEXT_KEY` stays.
- **#233:** correct the `ResolveOptions` reason at `check-self-use-allowlist.json:52`.
- **#160:** correct `highlight.ts:29-31` ("SERVER/BUILD-ONLY: Shiki is loaded through a dynamic import so it stays out of the static client graph (a separate async chunk). The highlighter runs only inside the async pipeline, at render/prerender and in the Worker SSR.") and `pipeline.ts:183,187`. The chunk also runs in the browser, through `EditPage.svelte`'s `render` prop.
- **Files:** the sites above, `src/lib/index.ts`, `sveltekit/index.ts:15`, `check-self-use-allowlist.json:33,52`, `src/tests/unit/root-barrel-prune.test.ts:23`, `delivery-entry-boundary.test.ts`, `api-surface.md`.
- **Acceptance:** the T2 row. `root-barrel-prune` asserts `serializeMarkdown` resolves from `.`. `render/` imports nothing from `admin/`: extend `delivery-entry-boundary.test.ts` or a sibling with that assertion, which fails on today's `resolve-media.ts:14`.

### T3. Shape 5 and the internal entry. 45 min, `ordinary` plus `runner`, upshift

- **Outcome:** `/delivery/data`, `/delivery/head`, and `/render` are gone. `/delivery` carries no static kit import. `CairnHead` joins `PreviewBanner` on `/public`. `ComponentContext` is reachable from root only. A new `./internal` export backs the plugin's generated module. Closes #231.
- **Change:** `public-routes.ts:7` `import { error } from '@sveltejs/kit';` goes. `:225` `if (!entry) throw error(404, ...)` and `:268` `if (!entry || isNoindex(entry.frontmatter)) throw error(404, ...)` become `throw (await import('@sveltejs/kit')).error(404, ...)`, with a one-line helper only if both sites read better for it.
  `src/lib/internal.ts` exports `buildSiteManifest`, `formatManifest`, `verifyManifest`, `verifyReferences`, `parseMediaManifest`, `HASH_RE`, `R2_EXT_RE`, and `r2Key`. Its header says the entry is the engine's own and carries no semver promise.
  `vite/internal.ts:76-77` generates one import from `@glw907/cairn-cms/internal` in place of:
  ```
  import { buildSiteManifest } from '@glw907/cairn-cms/delivery/data';
  import { formatManifest, verifyManifest, verifyReferences } from '@glw907/cairn-cms';
  ```
  `surfaceSubpaths()` at `check-surface.mjs:29` skips `./internal`.
- **Record:** in `check-surface-reexports.json`, rewrite each `/delivery/data` row's `subpath` to `/delivery`, delete the `/render` row, and delete `layeredBarrels`. Deleting the `/delivery/data` rows instead fails `--update` with 37 duplicate lines.
- **Files:** `package.json` exports, `src/lib/delivery/{index,public-routes}.ts`, delete `delivery/{data,head}.ts` and `render/authoring.ts`, `src/lib/public/index.ts`, `src/lib/index.ts:47`, `src/lib/internal.ts`, `src/lib/vite/internal.ts`, `scripts/checks/check-surface.mjs:26,29,321`, `check-surface-reexports.json`, `check-surface-leaks.json` (rows `SlotKind` and `StandardResult` at `/delivery/data`), `check-options.mjs:12`, `vitest.config.ts:102,127`, `src/tests/unit/workers-env-reach.test.ts:88` (adds `'./internal'`), `.claude/skills/cairn-writing-docs/references/docs-register.md:290`, the importers of `CairnHead` (`routes/(site)/+page.svelte:9`, `theme/components/ArticleView.svelte:22`), `skills/.../public-routes.md:47`, `component-cairn-head.md:3`, the barrel tests below, `api-surface.md`.
- **Tests:** `delivery-data-dist-spawn.test.ts` becomes `delivery-dist-spawn.test.ts`, stays in the `unit-dist-spawn` project, and asserts `existsSync` in place of `it.skipIf(!built)`. It walks the emitted import graph from `dist/delivery/index.js`, following relative specifiers, for a static `@sveltejs/kit` or `.svelte` import, since a plain import alone can't fail while kit resolves from the repo's `node_modules`. It spawns Node to assert `createPublicRoutes` and `buildSiteManifest` are functions, and that `dist/internal.js` exports all eight names. `delivery-entry-boundary.test.ts`'s second walk starts from `delivery/index.ts`. Update `delivery-data-split`, `delivery-head-split`, `delivery-exports`, `delivery-media-vite-barrel-prune`, and `render-exports` to the new names.
- **Acceptance:** the T3 row. `npm run check:package` passes (publint and attw, probed on a copy of `dist`). After `npm run package`, `npx vitest run --project unit-dist-spawn delivery-dist-spawn` passes. `npm --prefix examples/showcase run build` runs the generated module. CI's `markdown-twin.spec.ts:30` and `nav-from-config.spec.ts:44` prove a dynamic-import 404 stays a 404 once bundled. `api-surface.md` has no `./internal` section. The set-aside fires only if the dist test fails on a traced kit import.
- **Consumers must:** one line each for `/delivery/data`, `/delivery/head`, `/render`.

### T4. Hide the internals, E4, ergonomics 13. 60 min, `ordinary` plus `runner`, upshift

- **Outcome:** these leave the barrels and the code stays:
  - E6: `LoginPage`, `ConfirmPage`, `ConceptList`, `CairnMediaLibrary`, `CairnTidySettings`, `HelpHome`, `EditPage`, `CairnHistory`, `ManageEditors`, `MarkdownEditor`, `EditorApi`, `TidyApi`, `ImagePlaceholderApi`, `FormatKind`, `NavTree`, `DeleteDialog`, `RenameDialog`, `VocabularyAdmin`, `WelcomeView` from `/admin`.
  - E8: `buildRssFeed`, `buildJsonFeed`, `buildSitemap`, `buildRobots`.
  - E10: `formatManifest`, `verifyManifest`, `verifyReferences`, `composeEntryData`, `renderJsonLdScript`, `requireEditor`, `resolveCapability`, `formatTimestamp` (from `admin-toolkit/index.ts`; `CairnHistory.svelte:23` then imports it from `../admin-toolkit/format.js`). `parseManifest` waits for T5. `parseMarkdown`, `buildExcerpt`, `resolveRateLimit`, `BranchExistsError`, and `CommitConflictError` stay.
  - E4: `createAdminAction` leaves `/sveltekit`. `AdminActionOptions` and the `deps` parameter go. `const dev = deps.isDev ?? DEV;` goes, and the check reads `if (DEV) throw ...`, with `DEV` still from `esm-env`. The `deps.access` branch goes. `section-action.ts:232` passes neither, so production paths don't change.
- **`resolveDb`:** two overloads, probed against the `dist` types:
  - `createSectionAction<Env, Db>(config: SectionActionConfig<Env, Db>)`, returning today's `SectionAction<Env, Db>`, with `ctx.db: NonNullable<Db>`.
  - `createSectionAction<Env = unknown>(config: Omit<SectionActionConfig<Env, unknown>, 'resolveDb'> & { resolveDb?: undefined })`, returning a wrapper whose `ctx` is `Omit<SectionActionContext<unknown>, 'db'>`. The returned type gets one exported name with `@public`.

  The runtime branches on `'resolveDb' in config`. Key absent: the action runs with no `ctx.db` and never returns the `db_not_bound` refusal. Key present: today's order stands, `const db = config.resolveDb(siteEnv<Env>());` runs last, after every authorization check, and a present undefined value refuses with `db_not_bound`.
- **Ergonomics 13:** `createSectionAction({ resolveDb: () => env.APP_DB })` becomes the recipe in `custom-screen.md:84`, `admin-access.md`, and the doc comment, which also say the action needs an access-map rule for its target: an empty map refuses everyone, owner included. The warning at `custom-screen.md:49` goes. Leave the parameter. T4 doesn't touch `admin/signups/`: that path is `auth-data`.
- **Section-refusals:** p1-p8 files an omitted-`resolveDb` fixture item for this pass, once it merges. If `examples/showcase/src/routes/admin/section-refusals/+page.server.ts` exists on `main` at T4's start, add an `omitted` action there (`createSectionAction({})`, a handler that calls `ctx.audit`, success text) and its row in `examples/showcase/e2e/section-refusals.spec.ts`. CI's `e2e` job is the proof. If it doesn't, leave the item open for `cairn-cms-9b` and say so in the PR.
- **Files:** `src/lib/{index,sveltekit/index,delivery/index,admin/index,admin-toolkit/index}.ts`, `src/lib/admin/CairnHistory.svelte:23`, `src/lib/sveltekit/{admin-action,section-action}.ts`, `src/lib/ambient.ts:26,63,65`, `check-options.mjs:8-20`, `check-self-use-allowlist.json:4-5`, `check-surface-leaks.json` (row `Change` at `/admin`), `examples/showcase/src/routes/robots.txt/server.test.ts:2,21,31`, `skills/cairn-building-admin-screens/SKILL.md:3`, `skills/.../custom-screen.md:49,84,152-173`, `admin-access.md:99,120,121`, `debug.md:63`, `log-events.md:123,126`, `admin-mount.md`, `src/tests/unit/admin-action.test.ts`, `section-action.test.ts`, `factory-contracts.test.ts`, `src/tests/integration/one-map-five-readers.test.ts`, `root-barrel-prune`, `sveltekit-barrel-prune`, `admin-barrel-prune`, `admin-exports`, `admin-barrel`, `delivery-media-vite-barrel-prune`, `delivery-exports`, `delivery-data-split`, `api-surface.md`. `env-genericity.test.ts:15,34,71` imports from the file, so it stays.
- **Test, E4:** in `admin-action.test.ts`, delete the two `createAdminAction` access `describe` blocks at `:268-415`. `section-action.test.ts` already covers each refusal: no rule `:283`, role `:304`, `ownerOnly` `:493`, none capability `:506`, reasons `:524`, order `:558`. The five `isDev` tests at `:422-457` drive both branches with a module mock, probed on this source:
  ```ts
  const mocks = vi.hoisted(() => ({ DEV: true }));
  vi.mock('esm-env', () => ({ get DEV() { return mocks.DEV; }, BROWSER: false, NODE: true }));
  ```
- **Test, readers:** `createAdminAction` stops being a `locals` reader, so `one-map-five-readers.test.ts` becomes `one-map-four-readers.test.ts`: the header, the `describe`, and the `it` names say four and two, `adminAction` and `adminActionY` go, and `sectionAction` proves both `/admin/x` and `/admin/y`. Nothing else names the file.
- **Test, `resolveDb`:** an action declared with `createSectionAction({})` runs its handler for an authorized editor, with `expect('db' in ctx).toBe(false)` and no `db_not_bound` audit. `{ resolveDb: undefined }` refuses with `db_not_bound`. In `factory-contracts.test.ts`, `expectTypeOf(ctx.db).toEqualTypeOf<D1Database>()` for `createSectionAction({ resolveDb: () => env.APP_DB })` and `createSectionAction<Env, D1Database>({ resolveDb })`, so `any` fails. `@ts-expect-error` on `ctx.db` under `createSectionAction({})`, and on `createSectionAction<Env, D1Database>({})`. If the overloads fail, take the standing answer, and the type test asserts `ctx.db` is exactly `Db | undefined`. The existing refusal-order test passes unchanged.
- **Acceptance:** the two T4 rows. `admin-barrel-prune` asserts through `enumerateExports('dist/admin/index.d.ts')` that the barrel holds exactly `CairnAdmin`, `CairnAdminShell`, `CsrfField`. Keep the WATCH comment at `/admin`'s barrel: `check:tool-heuristics` greps that export.
- **Consumers must:** one line naming the removed exports, which says a replacement of `createAdminAction` is `createSectionAction` with an access-map rule for its target. `aksailingclub-org/src/tests/_editor.ts:6` is a known `resolveCapability` import: a literal capability replaces it.

### T5. E9, `buildNewlyPublished`, `ttlMs`, shape 10. 45 min, `auth-data`, upshift

- **Outcome:**
  - `createContentRoutes`, `createAuthRoutes`, `createEditorRoutes`, `mintPreview`, `revokePreview`, `buildNewlyPublished`, and `parseManifest` leave the barrels. `buildNewlyPublished` is deleted (`delivery/manifest.ts:55-86`). Config types a kept signature names stay public; the leak gate decides. If `ContentRoutesConfig` leaves `/sveltekit`, `packages/cairn-cms-dev/src/fake-anthropic.ts:10` imports it from the source file through the same internal path it uses for the runtime.
  - `PreviewTokenConfig`, `resolveTtlMs`, and `ContentRoutesConfig`'s and `CairnAdminConfig`'s `preview` go, leaving the fixed default. `mintPreview(runtime, config, event, target)` becomes `mintPreview(runtime, event, target)`, and `content-routes-preview.ts:70` drops `ctx.deps.preview ?? {}`.
  - `export async function loadHealth(event: CairnEvent, runtime: CairnRuntime): Promise<HealthData> {` at `health.ts:208` takes `(event, { runtime })`. `loadPreview(runtime: CairnRuntime, config: PublicRoutesConfig, event: CairnEvent)` at `preview.ts:435` takes `(event, { runtime, publicRoutes })`.
  - Comments naming `createAdminAction` at `hooks.server.ts:6` and `admin/signups/+page.server.ts:56` now describe the wrapper by what remains public.
  - `examples/showcase/src/routes/admin/signups/actions.test.ts:66`'s test adds `vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' })`, because T8's sink would turn its record to a string outside Workers. It's harmless before T8, and it sits here because `admin/signups/` is T5's path. If ergonomics 21 is set aside, the line stays.
- **Files:** `src/lib/sveltekit/{index,preview,health,content-routes-preview,content-routes-context,cairn-admin}.ts`, `src/lib/delivery/{index,manifest}.ts`, `src/lib/index.ts`, `check-surface-reexports.json` (the `/delivery` `parseManifest` row), `check-surface-leaks.json` (rows the derivation no longer produces), showcase `routes/(site)/preview/[token]/+page.server.ts:20`, `routes/healthz/+server.ts:21`, `healthz/server.test.ts`, `hooks.server.ts`, `admin/signups/+page.server.ts`, `admin/signups/actions.test.ts`, `packages/cairn-cms-dev/src/fake-anthropic.ts:10`, `check-options.mjs`, `check-self-use-allowlist.json`, `skills/.../draft-preview.md:12,41,59`, delete `skills/.../newly-published.md`, `SKILL.md`, `log-events.md`, `admin-mount.md:157`, `admin-access.md:46`, the five S05 and S06 eval files in `## Pre-flight`, `src/tests/integration/preview-load.test.ts`, `src/tests/integration/content-routes-preview.test.ts`, `src/tests/unit/health.test.ts`, `health-live-check.test.ts`, `env-genericity.test.ts:141`, `delivery-newly-published.test.ts` (delete), `root-barrel-prune`, `sveltekit-barrel-prune`, `api-surface.md`.
- **Test first:** `health.test.ts` calls `loadHealth(event, { runtime })` and `preview-load.test.ts` calls `loadPreview(event, { runtime, publicRoutes })`, and both fail before the change.
- **Reorder proof:** rewrite `preview-load.test.ts`'s call shape in one mechanical commit. `git diff` over the file changes only the `loadPreview(` call lines: no `expect` line, fixture, or event builder changes, and the file passes.
- **Lifetime pin:** delete the two `ttlMs` tests at `content-routes-preview.test.ts:157,171`, and add one asserting a minted token's `expiresAt` is seven days out (`DEFAULT_PREVIEW_TTL_MS`).
- **Acceptance:** the T5 row, whose `ttlMs` term is narrow on purpose: `github/signing.ts:133,141` holds an unrelated `ttlMs` that stays. `sveltekit-barrel-prune` asserts through `dist/sveltekit/index.d.ts` that none of the seven names is exported. A preview link minted through the built-in path renders in the integration suite.
- **File:** a backlog item for `createNavRoutes`, which no site mounts: public, and outside E9.
- **Consumers must:** one line for the `loadPreview` and `loadHealth` bags, which names both routes and says to run `npm run check`, because `vite build` doesn't type-check and a stale call fails only at runtime. One for the removed names. One for `preview` on `createCairnAdmin`. `aksailingclub-org/src/tests/adapter.test.ts:3` is a known `createContentRoutes` import.

### T6. Shape 7 and the leak gate. 65 min, `runner`, upshift

- **Outcome:** each public name imports from one subpath. `check-surface-reexports.json` is deleted, and `check:surface` fails any name on two subpaths with no record file to excuse it.
- **Change:** drop each re-export from its non-home barrel, using the record's `home` as the keeper. Delete `REEXPORTS`, `loadReexportRecord`, and the record parameter of `findHomeViolations`, keeping the `findHomeViolations` call in `main()`. In `check-surface-leaks.mjs`, retire `deriveRendererLeaks` and its `:431` merge. A type inlined across subpaths is now legal, and the one-path rule replaces the per-subpath check it held. Extract the filter at `:284-288` as a pure exported function. Reconcile `check-surface-leaks.json` to the rows the derivation produces: `SlotKind` at `/sveltekit`, `DatePrefix` at `/sveltekit`, `EngineScreenId` at `.`, `NavIcon` at `.` go. The barrel comments naming R4 go.
- **`gate-table.json`, the pass's one protected edit:** this commit removes `:38`'s `check-surface-reexports.json` and `:174`'s `"src/lib/media-seed/"` prefix, so T7 has no table edit. `src/lib/media/` keeps that row's specs. Update `gate-tier.test.ts:71`.
- **`ciWait`:** `node scripts/checks/gate-tier.mjs --range <T6 base>..HEAD --protected` prints `ciWait`, and no other task's range does. `test.yml` runs on `pull_request`, not on a branch push, so T6 pushes and opens a draft PR, then waits for green on its own commit. No script reads the mode: `pass-gate-tiers.md:180` says the runner decides, and this is that step. The later tasks push to the same draft. 15 of T6's minutes are this wait.
- **Consumers:** `MediaResolve` from `/delivery` becomes `.` in `chassis/feed-items.ts`. A later reshape's name stays with its task.
- **Files:** the barrels, `scripts/checks/check-surface.mjs`, `check-surface-leaks.mjs`, `check-surface-leaks.json`, delete `check-surface-reexports.json`, `gate-table.json`, `src/tests/unit/check-surface.test.ts`, `check-surface-leaks.test.ts:11-13,186-268`, `gate-tier.test.ts:71`, `examples/showcase/src/chassis/feed-items.ts`, `api-surface.md`.
- **Test:**
  - Fixture model with one name on two subpaths: `findHomeViolations` reports it.
  - On the extracted filter, a type exported only from `.` is no leak, and a type exported nowhere is a leak. These pin the `cleanup-one-import-path` reopen condition and pass on old code.
  - `deriveLeaks` output holds no entry with `model: 'renderer'`, using the literal-union case from `check-surface-leaks.test.ts:221`. This one fails on old code.
  - The `deriveRendererLeaks` tests go with the function.
- **Acceptance:** the T6 row. `npm run check:surface` passes. Mutation: add one duplicate export to a barrel, see `npm run check:surface` exit non-zero naming it, revert, and paste the output in the PR. A one-off list from the deleted JSON (`git show <T5 head>:scripts/checks/check-surface-reexports.json`) checks that no `skills/` snippet imports a moved name from its non-home subpath. It isn't committed.
- **Consumers must:** one line: import each name from its one subpath.

### Pair A: T7 and T8, path 25

Disjoint files: T7 has no `skills/` edit and T8 no `package.json` edit, so `emit:template` runs in T8 alone. Neither implementer touches `CHANGELOG.md` or `MIGRATION-NOTES.md`. Each reports its lines, and the session writes them after the pair merges, then runs `npm run check:consumers-must`.

### T7. E5: `cairn-media-seed` moves to the dev package. 20 min, `ordinary` plus `runner`

- **Outcome:** `src/lib/media-seed/` moves to `packages/cairn-cms-dev/src/media-seed/`. The root `package.json:186` bin entry moves to the dev package. `package.json:36` drops `dist/media-seed/bin.js` from its `chmod` and appends `&& chmod +x packages/cairn-cms-dev/dist/media-seed/bin.js` after the `tsc`, since the file doesn't exist until `tsc` runs. `assemble.ts:4-5` and `run.ts:7` read `@glw907/cairn-cms/internal`.
- **Files:** those, `packages/cairn-cms-dev/package.json` (`bin`), `src/tests/unit/media-seed.test.ts` (moves beside the code, under the unit project's `packages/cairn-cms-dev/src/**/*.test.ts` glob), `media-seed-dist-spawn.test.ts`, `src/tests/unit/emit-template-tree.test.ts:52`, `CONTRIBUTING.md:183`, `docs/architecture.md:62`, `check-symbols-allowlist.mjs:11,23-25`, `durable-gotchas.md:398,441`, `tool/internal/doctor/fileread.go:23,65` (comments, under `standards:go-conventions`), both lockfiles.
- **Test:** repoint `BIN` to `packages/cairn-cms-dev/dist/media-seed/bin.js` in both test files (`media-seed.test.ts:538`, `media-seed-dist-spawn.test.ts:16`), first. Replace `it.skipIf(!built)` with `expect(existsSync(BIN), 'missing; run "npm run package" first').toBe(true)`, so a wrong path fails and can't skip.
- **Acceptance:** the T7 row. After `npm run package`, `packages/cairn-cms-dev/dist/media-seed/bin.js --help` prints usage and exits 0. `check:dev-package` and `media-seed-dist-spawn` pass, with zero skipped in both files.
- **Consumers must:** a site running `cairn-media-seed` adds `@glw907/cairn-cms-dev` as a dev dependency at the engine's version. `aksailingclub-org/package.json:23` is the one known.

### T8. Ergonomics 16, 21, #103. 25 min, `ordinary`

- **Outcome:** each error names the next step.
  - `admin-nav.ts:281`: ``throw new Error(`navLayout: unknown screen "${ref.screen}"`);`` lists `knownScreens`.
  - `admin-nav.ts:284`: `'navLayout: screen "nav" is referenced but no navMenu is configured'` names `editor.nav` and `NavMenuConfig`.
  - `concepts.ts:195` lists the declared fields, `fieldset.ts:455` the fields, `concepts.ts:150` and `url-policy.ts:52` the tokens.
  - `diagnostics/error.ts`: `super(options?.message ?? resolved.title, ...)` appends `resolved.remediation`, after `. `, to the title or to an explicit `options.message` alike, which is what ergonomics 16 asks of `AUTH_DB binding is not configured`. `NavValidationError`, `TidyConventionsError`, and `SiteConfigError` each add `this.message = message;` after `super(...)`, since `nav-routes.ts:149` and `content-routes-settings.ts:298,418` return their text to an editor. No new option and no new surface. Their `conditionId` stays.
  - `log/create.ts`: the sink chooses per emit, not at module load: it prints `JSON.stringify(record)` outside Workers and keeps the object on Workers, detected as `packages/cairn-cms-dev/src/handle.ts:58` does: `typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'`. `createLogger`'s `@remarks` and `log-events.md` say a record outside Workers is one JSON line, so an `Error` or `Headers` value prints as `{}`, a `BigInt` falls to the `<unserializable>` fallback, and keys below the redaction cap print in full.
- **Test setup:** `src/tests/helpers/cloudflare-workers-fake-setup.ts` (the `unit` and `component` projects share it), at module top, guarded by `typeof document === 'undefined'` so Chromium keeps its real `navigator` for CodeMirror's detection:
  ```ts
  Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true, value: { userAgent: 'Cloudflare-Workers' } });
  ```
  A `defineProperty` survives `unstubGlobals: true`, and `vi.stubGlobal` still overrides it per test (probed). The `integration` project is on workerd already. Run on a copy of `main` with the sink change, 5,242 unit tests showed one traced fallout: `underWorkerd()` in the dev handle reads the same check. So:
  - `packages/cairn-cms-dev/src/handle.test.ts` and `repository.test.ts` add a `beforeEach` stubbing a Node user agent. `handle.test.ts:210` then reads each record through `JSON.parse`.
  - `src/tests/unit/compose.test.ts:92` passes `content: 'fixtures'`.
- **Files:** those, `src/lib/nav/site-config.ts:34-39,223-227,297-301`, `skills/.../log-events.md`, tests asserting the strings (`nav-layout-resolve`, `nav-routes-load`, `content-routes-layout`, `cairn-error.test.ts:15,20`).
- **Test:** each string's valid values appear in the thrown message. `new CairnError('config.bindings-missing').message` holds title and remediation, and with `{ message, cause }` holds the message and remediation, with `conditionId` and `cause` unchanged. An invalid nav save and an invalid vocabulary save return today's exact string. `log/create.test.ts` stubs `navigator` to a Node agent and asserts one parseable string with the event and a field, and to Workers and asserts an object.
- **Acceptance:** `check:tool-conditions` passes. The remediation text is static registry content, so a record's `error` field gains no secret.
- **Consumers must:** the sink's change goes in changelog prose. Record `Consumers must: nothing.` unless the sweep finds a shipped surface that reads the old shape.

### T9. Options no site sets, #144. 30 min, `ordinary`

- **Outcome:** gone: `editor.siteConfigPath`, `sanitizeSchema`, `unsafeDisableSanitize`, `anchorRel`, `preview.bodyClass`, `includeSubDomains`, `FormatCivilDateOptions.intlOptions`, `spellcheck.dialect` and with it the `spellcheck` block.
- **`intlOptions`:** the Media Library's short date stays. An unexported internal formatter in `admin-toolkit/format.ts`, off the barrel, renders `{ month: 'short', day: 'numeric' }`, and `CairnMediaLibrary.svelte:888,1122` call it. No screen changes, and the public option goes. The call removes names, not behavior, so this one answer is right. See the fold record. `CairnMediaLibrary.svelte` is shared with admin-rest, as a merge chore.
- **Lines:** `types.ts:330` `siteConfigPath?: string;`; `compose.ts`'s `siteConfigPath:` takes `DEFAULT_SITE_CONFIG_PATH` alone; `render/pipeline.ts` and `sanitize-schema.ts`; `pipeline.ts:169` per #144; `types.ts:204,219`, `preview-doc.ts:76`, `content-routes-entry-read.ts:186` for `bodyClass`; `guard.ts:75,227,426`; `admin-response.ts:13,19,35,49,62`, where `opts.includeSubDomains ? 'max-age=63072000; includeSubDomains' : 'max-age=63072000'` becomes the constant `'max-age=63072000'`, and `omitHsts` stays with a reworded reason; `admin-toolkit/format.ts:31,44`; `nav/site-config.ts:100-103,154,311,339`; `compose.ts`'s `spellcheckDictionary: dictionaryFileForDialect(siteConfig.spellcheck?.dialect)` reads the default dictionary.
- **Files:** those, `check-self-use-allowlist.json:28` (its reason goes false), showcase `theme/site.config.yaml:32`, `skills/.../adopt-cairn.md:29`, `tidy-and-ai-posture.md:81`, tests naming the options including `admin-toolkit-format.test.ts:30` and `remark-figure.test.ts:14`, `api-surface.md`.
- **Test:** a `spellcheck` key in a site config throws the "unrecognized key" error, which lists the known keys. HSTS stays exact at `max-age=63072000`. A `<script>` in markdown is removed by the one pipeline path. `@ts-expect-error` on `editor: { siteConfigPath }`, `unsafeDisableSanitize`, and `preview: { bodyClass }`. The Media Library still shows a month and day with no year.
- **Acceptance:** the T9 row. Closes #144.
- **Consumers must:** a site with `spellcheck:` in `site.config.yaml` deletes it. `cairn-pub/src/theme/site.config.yaml:20` and `aksailingclub-org/src/theme/site.config.yaml:45` are the two known. One line for the removed options, which says subdomain pinning now belongs at the zone.

### T10. Shape 12 with #32. 30 min, `ordinary`. Alone: over 50 files

- **Outcome:** `routing: 'dated'` replaces `'feed'`, and `RoutingRule.inFeeds` goes.
- **Rename:** `node docs/internal/plans/2026-11-01-small-api-renames.mjs routing`. It is re-runnable: a second run changes nothing, and on a copy of `main` it changed 55 files. With the hand edits below, the unit project then had no routing failure.
- **Hand edits:** `concepts.ts:38-41` (`feed:` key to `dated:`), `concepts.ts:61` (the script rewrites the list), `concepts.ts:74`, `types.ts:106-114,372-373`, `content-concepts.test.ts:82`, `routing.test.ts:17`'s comment (the script takes the union), `skills/.../content-model.md`, 4 `api-surface.md` rows.
- **Test:** `resolveRouting('feed' as never, 'posts')` throws `must be one of dated, page, embedded`. In a type test, `const stale = 'feed' as const` passed as `routing: stale` under `@ts-expect-error`, a form the script doesn't rewrite. `routing.test.ts:17`'s existing `@ts-expect-error` is on an object, so it can't stand in.
- **Acceptance:** the T10 row, with those two tests as its false matches.
- **Consumers must:** every site writes `routing: 'dated'` and stops reading `inFeeds`. `aksailingclub-org/src/tests/adapter.test.ts:10,20` is the one known reader.

### Pair B: T11 and T12, path 20

T12 edits no surface export, so only T11 regenerates `api-surface.md`, and only T11 runs `emit:template`. Neither implementer touches `CHANGELOG.md` or `MIGRATION-NOTES.md`. Each reports its lines, and the session writes them after the pair merges.

### T11. Shape 14: `build*Response`. 20 min, `ordinary`

- **Outcome:** `rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`, `markdownResponse` in `delivery/responses.ts:14-59` become `buildRssResponse`, `buildJsonFeedResponse`, `buildSitemapResponse`, `buildRobotsResponse`, `buildMarkdownResponse`.
- **Files:** those, `packages/create-cairn-site/src/substitute.mjs:64,80` (exact comment-match strings, so change the strings and the showcase together), `scaffold.test.mjs:102`, `substitute.test.mjs:30`, `packages/create-cairn-site/README.md:34`, showcase `theme/cairn.config.ts:195` and routes, `tool/internal/spine/conditions.json:15`, its mirror in `src/lib/diagnostics/conditions.ts:131`, `.vale/styles/Cairn/ProseProcedure.test.yml:5`, the S08 and s12 evals in `## Pre-flight`, skills, tests, `api-surface.md`.
- **Acceptance:** the T11 row. `check:tool-conditions`, `make -C tool check`, and `npm test -w packages/create-cairn-site` pass.
- **Consumers must:** one line with the five renames.

### T12. W3: dead exports. 20 min, `ordinary`

- **Outcome:** `generateComponentReference` (`render/component-reference.ts`, whole file) and its test go. `deriveTagUsage` (`content/manifest.ts:567`) and its tests go. `export function fenceDepths` (`admin/markdown-directives.ts:116`) loses `export` if an internal caller reads it; otherwise it goes with its tests. `export function markFirstList` (`render/rehype-dispatch.ts:29`) goes with its test at `render-rehype-dispatch.test.ts:75`, and moves into `render-pipeline-snapshot.test.ts` as a local helper, since it's a fixture directive there. `markFirstList` isn't on the sheet's set-aside list, so this keeps W3 whole.
- **`ADMIN_CSS_SAFELIST`:** delete `admin/admin-css-safelist.ts` only if `dist/admin/cairn-admin.css` is byte-identical after the build, compared by `cmp` against a copy taken first. It also needs `admin-css-build.test.ts:183`, `badge-tier-legibility.test.ts:7`, and `daisy-absorption-ritual.md:5,19,44` corrected.
- **Files:** those, `component-exports.test.ts:10,21`, `render-exports.test.ts:26`, `root-barrel-prune.test.ts:46`, `manifest.test.ts:2,684-704`, `markdown-directives.test.ts`.
- **Acceptance:** the T12 row, printing nothing or only a listed set-aside.

### T13. #230: `EntryData` typed from the resolver. 25 min, `ordinary`, upshift

- **Outcome:** `EntryData<S extends SiteResolver = SiteResolver>` narrows on `concept`, as the design probed. `PublicRoutesConfig` and `createPublicRoutes` carry `S`. `composeEntryData` stays untyped, and `entryLoad` casts once at the boundary, with a comment saying why. `preview.ts:227`, `interface PreviewData extends EntryData`, becomes an intersection type.
- **Files:** `src/lib/delivery/public-routes.ts`, `src/lib/sveltekit/preview.ts`, `ArticleView.svelte:27,75`, the page routes' `data` types, `skills/.../public-routes.md`, `api-surface.md`, a type test.
- **Note:** if a `data` type reaches `(site)/preview/[token]`, an `auth-data` path, say so in the task's report for the close's security read.
- **Test:** the design's probe becomes a type test against the source: narrowing, `@ts-expect-error` on the other arm, the untyped default, widening.
- **Acceptance:** the cast at `ArticleView.svelte:75` is gone. `check:public-skill` and `npm --prefix examples/showcase run check` pass after `npm run package`. Set aside on a traced failure, per the standing answers.

### T14. Shape 21 and the block rename. 70 min, `ordinary`. Alone: over 50 files. Upshift

- **Outcome:** per `ROADMAP.md`'s entry: `defineComponent` to `defineBlock`; `ComponentDef`, `ComponentRegistry`, `ComponentContext` to `BlockDef`, `BlockRegistry`, `BlockContext`; `defineRegistry({ components })` to `({ blocks })`; `rendering.components` to `rendering.blocks`; `onComponentAtCaret` to `onBlockAtCaret`; `src/theme/markdown-components.ts` to `markdown-blocks.ts`.
- **Rename:** `git mv` the theme file, then `node docs/internal/plans/2026-11-01-small-api-renames.mjs block`. It is re-runnable and changed 78 files on a copy of `main`. An earlier run left the name and string terms empty over `src`, the showcase's `src` and `e2e`, `skills`, `docs/editors`, `docs/why-cairn.md`, and `.claude/skills`, not the whole T14 row, since `rendering: { components` falls to the hand edits. It covers the names and the UI strings.
- **Hand edits (what the script can't tell apart):** `registry.ts:206-225` (the `components` parameter), `pipeline.ts:85-88,155`, `showcase theme/cairn.config.ts:24,38,65,207`, `markdown-blocks.ts`'s export, `styleguide/+page.server.ts:102-110`, `load.test.ts:11,24`, `chassis/README.md:156`, `chassis/render.ts:47`, `reproductions/stories/support.ts:80`, `adopt-cairn.md:36`, `components-and-islands.md:22`, `docs-register.md:267` (the rename its row says is still to come has landed), and `S09-component-with-island.json:32` if the rider renames the theme's `components` export.
- **UI strings:** "Insert a component", "Search components", "Back to components", "Edit the component at the cursor", "Place the cursor in a component to edit it" (reworded to "Place the cursor in an editable block to edit it", since it misdescribes a figure), "Layout marker." to "Block marker.", the help dialog's "layout blocks" to "blocks", "Fold this section" to "Fold this block", and its pair "Unfold this section" to "Unfold this block" (listed under `## Decisions`), at `ComponentInsertDialog.svelte:332,336,345,421-422`, `EditPage.svelte:935,938`, `editor-folding.ts:450`, `editor-highlight.ts:57`, `MarkdownHelpDialog.svelte:4,45`, `reproductions/stories/editor.ts:143`, with `golden-path.spec.ts:514,521`, `EditPage.test.ts`, `reproductions-stories.test.ts:527`, and `docs/editors/write-in-the-editor.md:179`.
- **Stale-key refusal (a refusal, not a shim; it stays if the riders are set aside):** `createRenderer` throws when `'components' in config` or `'defs' in config`, and `defineAdapter` throws on `rendering.components`, each naming `blocks`. Without it, a missed rename publishes a site with no blocks and a green build, because a site's `build` is `vite build`, and `config.blocks ?? defineRegistry({ blocks: [] })` falls back silently. `'defs'` catches `createRenderer(registry, { ... })`, the form two sites use at their pins.
- **Riders (may set aside):** `rendering: { blocks }` is an array and the engine builds the registry; `createRenderer({ blocks })`. `BlockDef` drops `attributeSchema`, and `RegisteredBlock` carries it (`registry.ts:127`, `:310-313`). Readers: `pipeline.ts:25,85,155`, `content/adapter.ts:14`, showcase `cairn.config.ts:9,38`, `styleguide/+page.server.ts:102`, `styleguide/load.test.ts:21-24`.
- **Leave:** "component" in the Svelte sense; `ComponentForm.svelte`, `ComponentInsertDialog.svelte`, `component-grammar.ts`; the anchor `<a id="add-components-and-fragments">`.
- **Files:** 81 by grep, as the T14 row lists: `src/lib`, tests, `skills/.../components-and-islands.md`, `public-component.md`, `.claude/skills` per `## Pre-flight`, `docs/why-cairn.md`, `docs/editors/write-in-the-editor.md`, `check-public-skill.mjs`, `check-options.mjs:9`, `Tooltip.test.ts`, `MarkdownEditor.test.ts:577`, `examples/showcase/e2e/site-visual.spec.ts`, story `editor/collapsed-layout-block`, `api-surface.md`. No `write-a-markdown-component.md`, `add-an-island.md`, or reference page exists at this commit.
- **Test:** both refusals throw naming `blocks`, on `createRenderer({ components: registry } as never)`, on `createRenderer(registry as never)`, and on `defineAdapter` with a stale `rendering.components`.
- **Acceptance:** the T14 row. `npm run emit:template`, `check:template`, `check:editor-quotes`, and `check:docs-gate` pass. Visual baselines that change regenerate on CI.
- **Consumers must:** one line for each rename a site writes, so the rebuilds can grep them.

### T15. Docs and rulings. 25 min, `ordinary`

Load `cairn-writing-docs`. The bulk is `engine-rulings.md`: the `cleanup-*` entries executed here say so, and `cleanup-one-import-path`'s reopen condition cites T6's fixture. Then `docs/architecture.md`'s subpath list, `CONTRIBUTING.md`, the `docs/admin/**` pages and `skills/` teaching the table finds, and the `MIGRATION-NOTES.md` steps. No moved-name table is committed: the sheet says no migration tooling, and `api-surface.md` answers that question. Close #98, #160, #187, #201, #230, #231, #233, #32, #103, #144 in `BACKLOG.md`, each unless set aside under `## Decisions`. Run `docs-fact-checker` on the changed lines. Run `npm run emit:template` and `npm run check:docs-gate`. **Acceptance:** every row of the dead-name table prints nothing or lists its false matches, and `npm run check:consumers-must` passes.

### T16. Close. 60 min, `auth-data`

Follow `cairn-running-passes` "Close checklist". The 60 holds the whole-branch `standards:diff-reviewer`, `standards:svelte-reviewer`, `standards:web-auth-security-reviewer` on the `auth-data` paths with T13's note, and `standards:daisyui-a11y-reviewer` scoped to T14's changed `aria-label` lines, folded with no open finding; a CI baseline regenerate; the live admin smoke per `references/admin-smoke-test.md`, where the known `no-pending-request` FAIL counts as a pass with a note; and the CI wait. Green CI on the head. After the last fold, run `npm run check:docs-gate`, `npm run check:consumers-must`, and the dead-name table. List every retried test as flake evidence. Delete the plan files, including `2026-11-01-small-api-renames.mjs`, in a final commit. Finalize `## Unreleased`. PR body per `pass-core` "Close": `## Brief`, what landed, `## Decisions`, `## Planning misses`, `## Tooling`, the score. Move `docs/STATUS.md`. Report PR-ready to `cairn-cms-9b`.

## Path

| Step | Min | Holds |
|---|---|---|
| T1 | 25 | |
| T2 | 15 | |
| T3 | 45 | the graph walk |
| T4 | 60 | hide set, E4's tests, overloads |
| T5 | 45 | |
| T6 | 65 | 15 of CI wait |
| Pair A | 25 | |
| T9 | 30 | |
| T10 | 30 | |
| Pair B | 20 | |
| T13 | 25 | |
| T14 | 70 | the refusals |
| T15 | 25 | rulings, close of items, fact-check |
| T16 | 60 | four reviewers, baselines, smoke, CI |
| **Path** | **540** | |

Order rests on: T3 before T6 (the sheet), T3 before T7 (`./internal`), T4 and T5 before T6 so the closure is final, T6's table edit before T7 so T7 has none, T5's hidden names before T15, T10 and T14 alone. T14 runs last among code tasks because its rename touches what every earlier task touched.

## `## Tooling` seeds

The PR's `## Tooling` lists each skill, agent, gate, or hook that failed, misled, or was missing, with its fix or backlog number. Seeds from planning:

- **Worktree guard:** refused compound `git`, heredocs, any command with a variable in operand position, and an `env -C` command whose text held a `git` form (#214). It cost several rewrites.
- **`standards:backlog-sweep`:** its due rule counts items filed this week. 35 "unswept" items were mostly filed days ago, so the rule fired where a sweep can't add anything. Candidate fix: count items older than 30 days.
- **`check-tiers`:** walks exports, so a `@public` tag on a hidden name is silent (#243).
- **Plain-Node dist tests:** `delivery-data-dist-spawn.test.ts` runs from `tmpdir` but kit still resolves from the repo's `node_modules`, so its import alone can't catch a static kit import. T3 fixes that.
- **`delivery-entry-boundary.test.ts`:** its node-safety claim rests on a source walk alone until T3.
- **Sheet against path map:** the sheet's class line missed T1 and T5's `auth-data` paths. Candidate fix: the planner's dependency map runs the path map over each item's files.
- **`gate-tier.mjs --protected`:** `pass-gate-tiers.md` says the runner reads it, and no script does, and `test.yml` has no branch-push trigger. A protected task's wait is hand-run through a draft PR.
