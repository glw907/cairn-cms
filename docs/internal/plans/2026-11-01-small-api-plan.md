# small-api plan

- **Slice:** run sheet pass 3 plus pass 2's shape 8, cut forward. Design: `2026-11-01-small-api-design.md`.
- **Class:** `ordinary` plus `runner` by the sheet. T1 and T5 are `auth-data` by the path map, so the
  whole-branch close adds the security read and the live smoke. See the design's "Class".
- **Base:** `main` at `f89fe83be`. **Branch:** `worktree-small-api`, pushed to `glw907/cairn-cms`.
- **Estimate:** design 330, ceiling 840, plan path **460**, set from recent actuals (0.4 to 0.65 of plan). No
  cut is planned. The cut order stays armed: ergonomics 21, then 13, then W3's unverified names.
- **Review:** three lenses, fold, verification read, saved beside this plan.
- **Merge:** conductor (`cairn-cms-9b`) under the merge word, record packet first. The executor stops at
  PR-ready, finalizes its `## Unreleased` entry, never bumps or publishes, and merges `main` only when told.
- **Executor:** Opus high (the sheet's pass 3 line), `cairn-cms-small-api`. Tasks go to `cairn-implementer`;
  those marked **upshift** pass `model: opus`.

## Sweep verdicts

Scoped sweep at `f89fe83be`, by a read-only agent. The backlog edits landed in `acac26a79`. Overrides of the
agent's verdicts are marked. Items sibling plans take aren't stamped here, since those lines are theirs.

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

No drop and no duplicate. The agent counted 35 open items with no recent stamp, so the skill's rule says a full
sweep is due. The sheet places the full sweep at pass 8's close, and a sheet answer beats the skill, so it doesn't
run here. Most of the 35 were filed this week. See `## Tooling` seeds.

## Pre-flight

Nothing for Geoff: no sign-in, no secret, no dialog, no permission rule. The live smoke mints a local session in a
local D1 (`wrangler d1 --local`) and reads wrangler's local `send_email` output.

Auto-mode notes, named per the launch prompt. `autoMode.allow` covers these, and a refusal of any is a stop for
`cairn-cms-9b`, never a thing to route around:

- **`.claude/skills/` edits:** T5 deletes the S05 and S06 eval files under
  `.claude/skills/cairn-writing-docs/evals/`. T7 edits `.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md`.
  T14 edits `.claude/skills/cairn-writing-docs/references/docs-register.md`, the S09 eval, and any rule or skill naming the renamed terms.
  T14 and T15 edit `.claude/rules/` only if a grep hit there is false.
- **`CLAUDE.md`:** T15 edits it only if a grep hit is false. None is expected.
- **Generated:** `npm run emit:template` writes `templates/waymark/.claude/skills/`.
- **`wrangler d1 --local`** and stopping the test Worker the session started, at T16.
- **Conductor merges** under the merge word.

No task reads a credential.

## Standing answers

The sheet's "Standing answers for every pass" all apply. For this slice:

- **May set aside:** ergonomics 13, 21, W3's `ADMIN_CSS_SAFELIST` and `fenceDepths`, shape 14, shape 21's riders, #230,
  and the `/delivery/data` fold if a dynamic kit import fails its dist test. **May not:** shape 8, shape 7, the
  hide-internals set, E9, the leak gate. A set-aside goes under `## Decisions`, with a backlog item.
- **`ADMIN_CSS_SAFELIST`** goes only on a clean built-CSS diff of `dist/admin/cairn-admin.css`. Any byte of difference
  keeps it.
- **A conditional `ctx.db` type fails:** type it optional and document the narrowing.
- **A barrel-prune test from R6's list breaks:** update it to the new names, never delete it.
- **A test pins a renamed string or name:** change the test and list it.
- **Anything breaks a site:** add a `Consumers must:` line, no shim. Each line sits alone with a blank line before and
  after, starts at column 0 or two spaces, and ends in a period. PR #180's `check:consumers-must` enforces that once merged.
- **`preview.ts` beside admin-rest:** T5 and admin-rest T3 edit neighbouring lines in `mintPreview`. Whichever lands
  second keeps admin-rest's check order and this pass's removal of `ttlMs`. That is a merge chore, not a set-aside.
- **`fieldset.ts:455` beside content-rest:** if `behavior` is gone by merge, drop that string from T8.
- **`check-surface-reexports.json` beside content-rest:** content-rest adds an `EntryRef` row. Keep the file deleted, and give
  `EntryRef` one home in the merge.
- **A cause that returns after one structural fix:** set the item aside if the line above allows, and list it. A may-not
  item stops with one question in `docs/STATUS.md`.
- **A real dependency found:** set the item aside for its home pass, list it, go on.
- **A conflicting PR fires no `pull_request` CI.** At the first conflict, tell `cairn-cms-9b`, and merge `main` on its word.
  `templates/waymark`, `scripts/checks/api-surface.md`, and `CHANGELOG.md` are merge chores: keep both `## Unreleased`
  entries, run `npm run emit:template` and `npm run check:surface -- --update`, rerun the fast lane.
- **Intended visual change (T14's UI strings):** regenerate on CI through `e2e.yml`'s `update_snapshots`, never a local baseline.
- **New BACKLOG item:** the next free number on `main` at merge. Name the placeholder in the PR.
- **Heavy lane:** `RUN_GATE_IF_BUSY=defer` is allowed except on T1 and T5.
- **Run git as a plain single command** from the worktree. The guard refuses compound forms (#214 on PR #180). A refusal of a
  form is not a stop: use the plain form, or the Read and Grep tools. Log each one for `## Tooling`.
- **A count of retries** is a loop guard, never a stop while each retry fixes a traced cause.

## Tasks

Every task commits, then runs `npm run lane:fast -- --range <base>..HEAD`. `check:surface` runs on any barrel change, so
each surface task runs `npm run check:surface -- --update` and commits `api-surface.md`. That's why surface tasks are
serial. A task that edits `skills/` runs `npm run emit:template` and commits the output. A task edits the skill lines its
own gates read (`check:public-skill`, the skill-references test); T15 sweeps what's left. Each task with a behavior or
surface change adds its `## Unreleased` lines and its `MIGRATION-NOTES.md` step as it goes.

`Consumers must:` lines are listed per task, so T15 only proofreads them.

A hidden name keeps its tier tag where the file is `auth-data` (`auth-routes.ts`, `auth/roles.ts`). `check:tiers` walks exports
only, and #243 already carries those tags. Elsewhere, drop `@public` from a name that leaves the barrels.

### T1. Shape 8: `CairnRuntime` loses `render`, `icons`, `assets`; `sender` becomes `email`. 25 min, `auth-data`, upshift

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
  `auth-routes.ts:240` reads `await send(env, buildMagicLinkMessage({ to: email, siteName: config.runtime.siteName, sender: config.runtime.sender, link }));`,
  and takes `sender: config.runtime.email`. `buildMagicLinkMessage`'s own `sender` input stays.
- **Files:** `src/lib/content/compose.ts`, `src/lib/content/types.ts` (`sender: SenderConfig;` at `:436`, `render: SiteRender;`, `icons?: IconSet;`, `assets?: MediaConfig;`), `src/lib/sveltekit/auth-routes.ts:40,240`, `src/tests/unit/compose-icons.test.ts` (delete), `src/tests/unit/content-compose.test.ts:14`, the runtime fixtures the type check names, `api-surface.md`.
- **Test first:** an `auth-routes` test builds a runtime with `email: { from: ... }` and asserts the message's sender. It fails before the rename.
- **Acceptance:** `git grep -nE "runtime\??\.(render|icons|assets|sender)\b" -- src/lib src/tests examples/showcase/src templates/waymark/src packages/cairn-cms-dev/src` prints nothing. `CairnAdmin.svelte:93,95` keep their `rendering` prop. The magic-link suite passes.
- **Consumers must:** nothing for a site that doesn't read the runtime; say so in the changelog prose. A site reading `runtime.sender` reads `runtime.email`, so add one line.

### T2. Small names: #187, #98, #201, #233, #160. 15 min, `runner`

- **#187:** `export interface IdentityRefusal {` at `guard.ts:123` becomes `IdentityFailure`, at every site the sweep lists, and the two `.claude/skills` hits. A `Consumers must:` line.
- **#98:** export `serializeMarkdown` (`frontmatter.ts:354`) beside `export { parseMarkdown } from './content/frontmatter.js';`, with `@public`. Add a showcase use or a self-use allowlist row.
- **#201:** `export const DEFAULT_MEDIA_BASE = '/media';` moves from `admin/media-base-context.ts:5` to `src/lib/media/naming.ts`. `resolve-media.ts:14`, the six admin importers, and `publicPath`'s default read it. `MEDIA_BASE_CONTEXT_KEY` stays.
- **#233:** correct the `ResolveOptions` reason at `check-self-use-allowlist.json:52`.
- **#160:** correct `highlight.ts:29-31` ("SERVER/BUILD-ONLY: Shiki is loaded through a dynamic import so it stays out of the static client graph (a separate async chunk). The highlighter runs only inside the async pipeline, at render/prerender and in the Worker SSR.") and `pipeline.ts:183,187`. The chunk also runs in the browser, through `EditPage.svelte`'s `render` prop.
- **Acceptance:** `git grep -n IdentityRefusal` hits only history files. `render/` imports nothing from `admin/`: extend `delivery-entry-boundary.test.ts` or a sibling with that assertion, which fails on today's `resolve-media.ts:14`.

### T3. Shape 5 and the internal entry. 40 min, `ordinary` plus `runner`, upshift

- **Outcome:** `/delivery/data`, `/delivery/head`, and `/render` are gone. `/delivery` carries no static kit import. `CairnHead` joins `PreviewBanner` on `/public`. `ComponentContext` is reachable from root only. A new `./internal` export backs the plugin's generated module. Closes #231.
- **Change:** `public-routes.ts:7` `import { error } from '@sveltejs/kit';` goes. `:225` `if (!entry) throw error(404, ...)` and `:268` `if (!entry || isNoindex(entry.frontmatter)) throw error(404, ...)` become `throw (await import('@sveltejs/kit')).error(404, ...)`, with a one-line helper only if both sites read better for it.
  `src/lib/internal.ts` exports `buildSiteManifest`, `formatManifest`, `verifyManifest`, `verifyReferences`, `parseMediaManifest`, `HASH_RE`, `R2_EXT_RE`, and `r2Key`. Its header says the entry is the engine's own and carries no semver promise.
  `vite/internal.ts:76-77` generates one import from `@glw907/cairn-cms/internal` in place of:
  ```
  import { buildSiteManifest } from '@glw907/cairn-cms/delivery/data';
  import { formatManifest, verifyManifest, verifyReferences } from '@glw907/cairn-cms';
  ```
  `surfaceSubpaths()` at `check-surface.mjs:29` skips `./internal`.
- **Files:** `package.json` exports, `src/lib/delivery/{index,public-routes}.ts`, delete `delivery/{data,head}.ts` and `render/authoring.ts`, `src/lib/public/index.ts`, `src/lib/internal.ts`, `src/lib/vite/internal.ts`, `scripts/checks/check-surface.mjs`, `check-surface-reexports.json` (rows naming a removed subpath, and `layeredBarrels`), `gate-table.json`, the importers of `CairnHead` (`routes/(site)/+page.svelte:9`, `theme/components/ArticleView.svelte:22`, showcase and template), `skills/.../public-routes.md:47`, `component-cairn-head.md:3`, the barrel tests below, `api-surface.md`.
- **Tests:** `delivery-data-dist-spawn.test.ts` becomes `delivery-dist-spawn.test.ts`: it imports `dist/delivery/index.js`, asserts `createPublicRoutes` and `buildSiteManifest` are functions, and reads the emitted `dist/delivery/*.js` for a static `@sveltejs/kit` or `.svelte` import. A plain-Node import alone can't fail here, because kit resolves from the repo's `node_modules`. `delivery-entry-boundary.test.ts`'s second walk starts from `delivery/index.ts`. Update `delivery-data-split`, `delivery-head-split`, `delivery-exports`, `delivery-media-vite-barrel-prune`, and `render-exports` to the new names.
- **Acceptance:** `npm run check:package` passes (publint and attw, probed on a copy of `dist`). A `vite build` of the showcase runs the generated module. `api-surface.md` has no `./internal` section. The set-aside fires only if the dist test fails on a traced kit import.
- **Consumers must:** one line each for `/delivery/data`, `/delivery/head`, `/render`.

### T4. Hide the internals, E4, ergonomics 13. 40 min, `ordinary` plus `runner`

- **Outcome:** these leave the barrels and the code stays:
  - E6: `LoginPage`, `ConfirmPage`, `ConceptList`, `CairnMediaLibrary`, `CairnTidySettings`, `HelpHome`, `EditPage`, `CairnHistory`, `ManageEditors`, `MarkdownEditor`, `EditorApi`, `TidyApi`, `ImagePlaceholderApi`, `FormatKind`, `NavTree`, `DeleteDialog`, `RenameDialog`, `VocabularyAdmin`, `WelcomeView` from `/admin`.
  - E8: `buildRssFeed`, `buildJsonFeed`, `buildSitemap`, `buildRobots`.
  - E10: `formatManifest`, `verifyManifest`, `verifyReferences`, `composeEntryData`, `renderJsonLdScript`, `requireEditor`, `resolveCapability`, `formatTimestamp`. `parseManifest` waits for T5. `parseMarkdown`, `buildExcerpt`, `resolveRateLimit`, `BranchExistsError`, and `CommitConflictError` stay.
  - E4: `createAdminAction`, and `AdminActionOptions`'s `isDev` and `access`. `section-action.ts:232` passes neither: `return createAdminAction<T | ActionFailure<{ error: string }>>(async ({ event, form, ctx }) => {`. `admin-action.ts`'s `deps` parameter and `const dev = deps.isDev ?? DEV;` go if nothing else sets them; a test double that does keeps them and gets listed.
- **`resolveDb`:** `resolveDb: (env: Env | undefined) => Db | undefined;` turns optional. Omitted, the action runs with no `ctx.db` and never returns the `db_not_bound` refusal. Set, today's order stands: `const db = config.resolveDb(siteEnv<Env>());` runs last, after every authorization check.
- **Ergonomics 13:** `createSectionAction({ resolveDb: () => env.APP_DB })` becomes the recipe in `custom-screen.md:84`, `admin-access.md`, and the doc comment. The warning at `custom-screen.md:49` goes. Leave the parameter. The showcase's `admin/signups/+page.server.ts` stays as it is: that path is `auth-data` and not in this task.
- **Files:** the barrels, `admin-action.ts`, `section-action.ts`, `check-options.mjs:8-20`, `check-self-use-allowlist.json:4-5`, `examples/showcase/src/routes/robots.txt/server.test.ts:2,21,31`, `skills/.../custom-screen.md`, `admin-access.md:99,120,121`, `debug.md:63`, `log-events.md:123,126`, `admin-mount.md`, `root-barrel-prune`, `sveltekit-barrel-prune`, `admin-barrel-prune`, `admin-exports`, `admin-barrel`, `api-surface.md`.
- **Test:** an action declared with no `resolveDb` runs its handler for an authorized editor. A type test proves `ctx.db` is `D1Database` with `resolveDb` and absent without it. If the conditional fails, take the standing answer. The existing refusal-order test passes unchanged.
- **Acceptance:** `Object.keys` of `dist/admin/index.js` is exactly `CairnAdmin`, `CairnAdminShell`, `CsrfField`. `git grep -n "createAdminAction" -- skills` shows no teaching of the export. Keep the WATCH comment at `/admin`'s barrel: `check:tool-heuristics` greps that export.
- **Consumers must:** one line naming the removed exports.

### T5. E9, `buildNewlyPublished`, `ttlMs`, shape 10. 35 min, `auth-data`, upshift

- **Outcome:**
  - `createContentRoutes`, `createAuthRoutes`, `createEditorRoutes`, `mintPreview`, `revokePreview`, `buildNewlyPublished`, and `parseManifest` leave the barrels. `buildNewlyPublished` is deleted (`delivery/manifest.ts:55-86`). Config types a kept signature names stay public; the leak gate decides.
  - `PreviewTokenConfig`, `resolveTtlMs`, and `ContentRoutesConfig`'s and `CairnAdminConfig`'s `preview` go, leaving the fixed default. `mintPreview(runtime, config, event, target)` becomes `mintPreview(runtime, event, target)`, and `content-routes-preview.ts:70` drops `ctx.deps.preview ?? {}`.
  - `export async function loadHealth(event: CairnEvent, runtime: CairnRuntime): Promise<HealthData> {` at `health.ts:208` takes `(event, { runtime })`. `loadPreview(runtime: CairnRuntime, config: PublicRoutesConfig, event: CairnEvent)` at `preview.ts:435` takes `(event, { runtime, publicRoutes })`.
  - Comments naming `createAdminAction` at `hooks.server.ts:6` and `admin/signups/+page.server.ts:56` (showcase and template) now describe the wrapper by what remains public.
- **Files:** `src/lib/sveltekit/{index,preview,health,content-routes-preview,content-routes-context,cairn-admin}.ts`, `src/lib/delivery/{index,manifest}.ts`, `src/lib/index.ts`, showcase and template `routes/(site)/preview/[token]/+page.server.ts:20`, `routes/healthz/+server.ts:21`, `healthz/server.test.ts`, `hooks.server.ts`, `admin/signups/+page.server.ts`, `check-options.mjs`, `skills/.../draft-preview.md:12,41,59`, delete `skills/.../newly-published.md`, `SKILL.md`, `log-events.md`, `admin-mount.md:157`, `admin-access.md:46`, delete the S05 and S06 eval files, `api-surface.md`.
- **Test first:** the two bag signatures. `preview-[token]` load tests call `loadPreview(event, { runtime, publicRoutes })` and fail before the change. The token flow's refusal tests pass unchanged, which is the proof the reorder survives.
- **Acceptance:** `dist/sveltekit/index.js` exports none of the seven names. A preview link minted through the built-in path renders in the integration suite. `git grep -n "ttlMs\|buildNewlyPublished" -- src/lib skills .claude/skills` prints nothing.
- **File:** a backlog item for `createNavRoutes`, which no site mounts: public, and outside E9.
- **Consumers must:** one line for the `loadPreview` and `loadHealth` bags; one for the removed names; one for `preview` on `createCairnAdmin`.

### T6. Shape 7 and the leak gate. 40 min, `runner`, upshift

- **Outcome:** each public name imports from one subpath. `check-surface-reexports.json` is deleted, and `check:surface` fails any name on two subpaths with no record file to excuse it.
- **Change:** drop each re-export from its non-home barrel, using the record's `home` as the keeper. Delete `REEXPORTS`, `loadReexportRecord`, and the record parameter of `findHomeViolations`. In `check-surface-leaks.mjs`, retire `deriveRendererLeaks` and its `:431` merge, and the rows in `check-surface-leaks.json` it alone justified. The barrel comments naming R4 go. Update `gate-table.json:38`, `check-surface.test.ts`, `gate-tier.test.ts`.
- **Consumers:** `MediaResolve` from `/delivery` becomes `.` in `chassis/feed-items.ts` (showcase and template). A later reshape's name stays with its task.
- **Test:** fixture model with one name on two subpaths: `findHomeViolations` reports it. Fixture signature on `/sveltekit` naming a type exported only from `.`: no leak. The same signature naming a type exported nowhere: a leak. The last two pin the `cleanup-one-import-path` reopen condition.
- **Acceptance:** `check:surface` and `check:surface-leaks` pass, and the duplicate count over `api-surface.md` by a one-off read is 0. `git grep check-surface-reexports` hits only history.
- **Consumers must:** one line: import each name from its one subpath, with the moved-name table in `MIGRATION-NOTES.md` generated from the deleted JSON.

### Pair A: T7 and T8, path 20

Disjoint files: T7 has no `skills/` edit and T8 no `package.json` edit, so `emit:template` runs in T8 alone.

### T7. E5: `cairn-media-seed` moves to the dev package. 20 min, `ordinary` plus `runner`

- **Outcome:** `src/lib/media-seed/` moves to `packages/cairn-cms-dev/src/media-seed/`. The root `package.json:185` bin entry and the `dist/media-seed/bin.js` `chmod` move to the dev package. `assemble.ts:4-5` and `run.ts:7` read `@glw907/cairn-cms/internal`.
- **Files:** those, `packages/cairn-cms-dev/package.json` (`bin`), `src/tests/unit/media-seed.test.ts` (moves beside the code, under the unit project's `packages/cairn-cms-dev/src/**/*.test.ts` glob), `media-seed-dist-spawn.test.ts` (reads the dev dist), `CONTRIBUTING.md:182`, `docs/architecture.md:62`, `gate-table.json:173`, `check-symbols-allowlist.mjs:11,23-25`, `durable-gotchas.md:398,441`, both lockfiles.
- **Acceptance:** after `npm run package`, `packages/cairn-cms-dev/dist/media-seed/bin.js --help` prints usage and exits 0. `check:dev-package` and `media-seed-dist-spawn` pass. `git grep -n "cairn-media-seed" -- package.json` prints nothing.
- **Consumers must:** a site running `cairn-media-seed` adds `@glw907/cairn-cms-dev` as a dev dependency. `aksailingclub-org/package.json:23` is the one known.

### T8. Ergonomics 16, 21, #103. 20 min, `ordinary`

- **Outcome:** each error names the next step.
  - `admin-nav.ts:281`: ``throw new Error(`navLayout: unknown screen "${ref.screen}"`);`` lists `knownScreens`.
  - `admin-nav.ts:284`: `'navLayout: screen "nav" is referenced but no navMenu is configured'` names `editor.nav` and `NavMenuConfig`.
  - `concepts.ts:195` lists the declared fields, `fieldset.ts:455` the fields, `concepts.ts:150` and `url-policy.ts:52` the tokens.
  - `diagnostics/error.ts`: `super(options?.message ?? resolved.title, ...)` appends `resolved.remediation` to the message.
  - `log/create.ts`: `sinkByLevel` prints `JSON.stringify(record)` outside Workers and keeps the object on Workers, detected as `packages/cairn-cms-dev/src/handle.ts:58` does: `typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'`.
- **Files:** those, `skills/.../log-events.md`, and tests asserting the strings (`nav-layout-resolve`, `nav-routes-load`, `content-routes-layout`).
- **Test:** each string's valid values appear in the thrown message. A logger test stubs `navigator` both ways, and asserts one string containing the event and a field outside Workers, and an object on Workers.
- **Acceptance:** `CairnError`'s `conditionId` and `cause` are unchanged, and a record's `error` field still has no secret: read `log-events.md`'s redaction line against the new message. `check:tool-conditions` passes.

### T9. Options no site sets, #144. 25 min, `ordinary`

- **Outcome:** gone: `editor.siteConfigPath`, `sanitizeSchema`, `unsafeDisableSanitize`, `anchorRel`, `preview.bodyClass`, `includeSubDomains`, `FormatCivilDateOptions.intlOptions`, `spellcheck.dialect` and with it the `spellcheck` block.
- **Lines:** `types.ts:330` `siteConfigPath?: string;`; `compose.ts`'s `siteConfigPath:` takes `DEFAULT_SITE_CONFIG_PATH` alone; `render/pipeline.ts` and `sanitize-schema.ts`; `pipeline.ts:169` per #144; `types.ts:204,219`, `preview-doc.ts:76`, `content-routes-entry-read.ts:186` for `bodyClass`; `guard.ts:75,227,426`; `admin-response.ts:13,19,35,49,62`, where `opts.includeSubDomains ? 'max-age=63072000; includeSubDomains' : 'max-age=63072000'` becomes the constant `'max-age=63072000'`; `admin-toolkit/format.ts:31,44`; `nav/site-config.ts:100-103,154,311,339`; `compose.ts`'s `spellcheckDictionary: dictionaryFileForDialect(siteConfig.spellcheck?.dialect)` reads the default dictionary.
- **Files:** those, showcase `theme/site.config.yaml:32`, template copy, `skills/.../adopt-cairn.md:29`, `tidy-and-ai-posture.md:81`, tests naming the options, `api-surface.md`.
- **Test:** a `spellcheck` key in a site config throws the "unrecognized key" error, which lists the known keys. HSTS stays exact at `max-age=63072000`. A `<script>` in markdown is removed by the one pipeline path, with no opt-out left in the type.
- **Acceptance:** `git grep -nE "sanitizeSchema|unsafeDisableSanitize|anchorRel|includeSubDomains|intlOptions" -- src/lib skills` prints nothing. Closes #144.
- **Consumers must:** a site with `spellcheck:` in `site.config.yaml` deletes it. `cairn-pub/src/theme/site.config.yaml:20` and `aksailingclub-org/src/theme/site.config.yaml:45` are the two known. One line for the removed options.

### T10. Shape 12 with #32. 30 min, `ordinary`. Alone: over 50 files

- **Outcome:** `routing: 'dated'` replaces `'feed'`, and `RoutingRule.inFeeds` goes.
- **Lines:** `concepts.ts:38-41`:
  ```ts
  const ROUTING_SHORTHANDS: Readonly<Record<'feed' | 'page' | 'embedded', RoutingRule>> = {
    feed: { routable: true, dated: true, inFeeds: true },
    page: { routable: true, dated: false, inFeeds: false },
    embedded: { routable: false, dated: false, inFeeds: false },
  ```
  also `concepts.ts:74`, `types.ts:106-114,372-373`, `reproductions/fixtures.ts:36`, `examples/showcase/src/theme/cairn.config.ts:80`, `templates/waymark/src/theme/cairn.config.ts:77`, `skills/.../content-model.md`, about 48 test files, 4 `api-surface.md` rows.
- **Acceptance:** `git grep -n "inFeeds" -- src examples/showcase/src templates/waymark/src skills` prints nothing. `routing: 'feed'` is a type error, shown by a `@ts-expect-error` in a type test, and a config-time error names the valid values.
- **Consumers must:** every site writes `routing: 'dated'`.

### Pair B: T11 and T12, path 20

T12 edits no surface export, so only T11 regenerates `api-surface.md`.

### T11. Shape 14: `build*Response`. 20 min, `ordinary`

- **Outcome:** `rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`, `markdownResponse` in `delivery/responses.ts:14-59` become `buildRssResponse`, `buildJsonFeedResponse`, `buildSitemapResponse`, `buildRobotsResponse`, `buildMarkdownResponse`.
- **Files:** those, `packages/create-cairn-site/src/substitute.mjs:64,80` (exact comment-match strings, so change the strings and the template together), `scaffold.test.mjs:102`, `substitute.test.mjs:30`, showcase `theme/cairn.config.ts:195`, showcase and template routes, `tool/internal/spine/conditions.json:15`, its mirror in `src/lib/diagnostics/conditions.ts`, `tool/internal/doctor/check_posture.go:24,39`, skills, tests, `api-surface.md`.
- **Acceptance:** `check:tool-conditions`, `make -C tool check`, and `npm test -w packages/create-cairn-site` pass. `git grep -nE "\b(rss|jsonFeed|sitemap|robots|markdown)Response\b" -- src/lib examples/showcase/src templates/waymark/src skills packages tool` prints nothing.
- **Consumers must:** one line with the five renames.

### T12. W3: dead exports. 20 min, `ordinary`

- **Outcome:** `generateComponentReference` (`render/component-reference.ts`, whole file) and its test go. `deriveTagUsage` (`content/manifest.ts:567`) and its tests go. `export function markFirstList` (`render/rehype-dispatch.ts:29`) and `export function fenceDepths` (`admin/markdown-directives.ts:116`) lose `export` if an internal caller reads them; otherwise they go with their tests. `git grep` found no `src/lib` caller of either, so expect deletion, and check `render-pipeline-snapshot.test.ts:9,74` first. It uses `markFirstList` as a fixture, so a snapshot that needs it keeps the function and sets the name aside.
- **`ADMIN_CSS_SAFELIST`:** delete `admin/admin-css-safelist.ts` only if `dist/admin/cairn-admin.css` is byte-identical after the build, compared by `cmp` against a copy taken first. It also needs `admin-css-build.test.ts:183`, `badge-tier-legibility.test.ts:7`, and `daisy-absorption-ritual.md:5,19,44` corrected. That skill edit runs under `.claude/skills/` and is named here for auto mode.
- **Acceptance:** `npm run package` passes. `src/lib/media-seed/index.ts` is already gone by T7.

### T13. #230: `EntryData` typed from the resolver. 25 min, `ordinary`, upshift

- **Outcome:** `EntryData<S extends SiteResolver = SiteResolver>` narrows on `concept`, as the design probed. `PublicRoutesConfig` and `createPublicRoutes` carry `S`. `composeEntryData` stays untyped, and `entryLoad` casts once at the boundary, with a comment saying why. `preview.ts:227`, `interface PreviewData extends EntryData`, becomes an intersection type.
- **Files:** `src/lib/delivery/public-routes.ts`, `src/lib/sveltekit/preview.ts`, `ArticleView.svelte:27,75` (showcase and template), the page routes' `data` types, `skills/.../public-routes.md`, `api-surface.md`, a type test.
- **Test:** the design's probe becomes a type test against the source: narrowing, `@ts-expect-error` on the other arm, the untyped default, widening.
- **Acceptance:** the cast at `ArticleView.svelte:75` is gone from showcase and template, and `check:public-skill` and the scaffold type check pass. Set aside on a traced failure, per the standing answers.

### T14. Shape 21 and the block rename. 60 min, `ordinary`. Alone: over 50 files. Upshift

- **Outcome:** per `ROADMAP.md`'s entry: `defineComponent` to `defineBlock`; `ComponentDef`, `ComponentRegistry`, `ComponentContext` to `BlockDef`, `BlockRegistry`, `BlockContext`; `defineRegistry({ components })` to `({ blocks })`; `rendering.components` to `rendering.blocks`; `onComponentAtCaret` to `onBlockAtCaret`; `src/theme/markdown-components.ts` to `markdown-blocks.ts`.
- **UI strings:** "Insert a component", "Search components", "Back to components", "Edit the component at the cursor", "Place the cursor in a component to edit it" (reworded), "Layout marker.", the help dialog's "layout blocks", "Fold this section" to "Fold this block", at `ComponentInsertDialog.svelte:332,345,421-422,429,436` and `EditPage.svelte:934-938`.
- **Riders (may set aside):** `rendering: { blocks }` is an array and the engine builds the registry; `createRenderer({ blocks })`. `BlockDef` drops `attributeSchema`, and `RegisteredBlock` carries it (`registry.ts:127`, `:310-313`). Readers: `pipeline.ts:25,85,155` (`const registry = config.components ?? defineRegistry({ components: [] });`), `content/adapter.ts:14`, showcase `cairn.config.ts:9,38`, `styleguide/+page.server.ts:102`, `styleguide/load.test.ts:21-24`.
- **Leave:** "component" in the Svelte sense; `ComponentForm.svelte`, `ComponentInsertDialog.svelte`, `component-grammar.ts`; the anchor `<a id="add-components-and-fragments">`.
- **Files:** 82 by count, including `docs/admin/write-a-markdown-component.md` (renamed `write-a-markdown-block.md`), `add-an-island.md`, the reference, `.claude/skills/cairn-writing-docs/references/docs-register.md`, the S09 eval, Vale rules, `skills/.../components-and-islands.md`, `check-public-skill.mjs`, `Tooltip.test.ts`, `MarkdownEditor.test.ts:577`, `e2e`, story `editor/collapsed-layout-block`, `check-options.mjs:9`, `api-surface.md`.
- **Acceptance:** `npm run emit:template`, `check:template`, and `check:docs-gate` pass. `git grep -nE "defineComponent|ComponentDef|ComponentRegistry|ComponentContext|onComponentAtCaret|rendering\.components" -- src examples/showcase/src templates/waymark/src skills docs` prints nothing. Visual baselines that change regenerate on CI.
- **Consumers must:** one line for each rename a site writes, so the rebuilds can grep them.

### T15. Docs and rulings. 45 min, `ordinary`

Load `cairn-writing-docs`. Grep every removed or renamed name across `docs/`, `skills/`, `claude/`, and `README.md`, and repoint each hit. Fix `docs/admin/**` pages, `docs/architecture.md`'s subpath list, and `skills/` teaching. Add the moved-name table to `MIGRATION-NOTES.md`. Update `engine-rulings.md`: the `cleanup-*` entries executed here say so, and `cleanup-one-import-path`'s reopen condition cites the T6 fixture. Update `CONTRIBUTING.md`. Close #98, #160, #187, #201, #230, #231, #233, #32, #103, #144 in `BACKLOG.md`. Run `docs-fact-checker` on the changed lines. Run `npm run emit:template` and `npm run check:docs-gate`.

### T16. Close. 40 min, `auth-data`

Follow `cairn-running-passes` "Close checklist". Whole-branch `standards:diff-reviewer`, then `standards:svelte-reviewer`, `standards:web-auth-security-reviewer` on the `auth-data` paths, and `standards:daisyui-a11y-reviewer` on T14's markup, folded with no open finding. Live admin smoke per `references/admin-smoke-test.md`; the known `no-pending-request` FAIL counts as a pass with a note. Green CI on the head. List every retried test as flake evidence. Delete the plan files in a final commit. Finalize `## Unreleased`. PR body per `pass-core` "Close": `## Brief`, what landed, `## Decisions`, `## Planning misses`, `## Tooling`, the score. Move `docs/STATUS.md`. Report PR-ready to `cairn-cms-9b`.

## Path

| Step | Min |
|---|---|
| T1 | 25 |
| T2 | 15 |
| T3 | 40 |
| T4 | 40 |
| T5 | 35 |
| T6 | 40 |
| Pair A | 20 |
| T9 | 25 |
| T10 | 30 |
| Pair B | 20 |
| T13 | 25 |
| T14 | 60 |
| T15 | 45 |
| T16 | 40 |
| **Path** | **460** |

Order rests on: T3 before T6 (the sheet), T3 before T7 (`./internal`), T4 and T5 before T6 so the closure is final, T5's hidden names before T15, T10 and T14 alone. T14 runs last among code tasks because its rename touches what every earlier task touched.

## `## Tooling` seeds

The PR's `## Tooling` lists each skill, agent, gate, or hook that failed, misled, or was missing, with its fix or backlog number. Seeds from planning:

- **Worktree guard:** refused compound `git`, heredocs, and any command with a variable in operand position (#214). It cost several rewrites.
- **`standards:backlog-sweep`:** its due rule counts items filed this week. 35 "unswept" items were mostly filed days ago, so the rule fired where a sweep can't add anything. Candidate fix: count items older than 30 days.
- **`check-tiers`:** walks exports, so a `@public` tag on a hidden name is silent (#243).
- **Plain-Node dist tests:** `delivery-data-dist-spawn.test.ts` runs from `tmpdir` but kit still resolves from the repo's `node_modules`, so its import alone can't catch a static kit import. T3 fixes that.
- **`delivery-entry-boundary.test.ts`:** its node-safety claim rests on a source walk alone until T3.
- **Sheet against path map:** the sheet's class line missed T1 and T5's `auth-data` paths. Candidate fix: the planner's dependency map runs the path map over each item's files.
