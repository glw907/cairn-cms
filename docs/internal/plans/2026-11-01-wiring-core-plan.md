# Wiring core: task plan

Slice `wiring-core`, class `ordinary` plus `runner` (`scripts/checks`). Initiative: `shared-standards`.
Base: `d71e4401e`, then `df3b0e8aa` (the sweep verdicts). Design note:
`docs/internal/plans/2026-11-01-wiring-core-design.md`. Sources: `design-audit/run-sheet.md` "Pass 2" and
"Moves the facts settled", `design-audit/design.md` "2. Wiring", `shape.md` 1, 2, 3, 6, 19,
`ergonomics.md` 9, 17, ledger.md "## Rulings".

Path: 395 minutes against a design estimate of about 390 and a ceiling of 780. No cut is needed.

Merge: `cairn-cms-9b` merges under Geoff's merge word. The executor stops at PR-ready.

## Pre-flight

Every task was read for owner steps and auto-mode gaps.

- **Geoff's steps:** none. No sign-in, secret, dialog, browser action, or permission rule.
- **Auto-mode writes** under workstation#192's line. A refusal is a stop for `cairn-cms-9b`, never a
  thing to route around.
  - T4: `.claude/skills/cairn-writing-engine-code/references/code-idioms.md`.
  - T7: `.claude/skills/cairn-writing-docs/evals/site-cases/{S07-new-concept,S08-public-routes,s15-adopt-and-migrate}.json`,
    `.claude/skills/cairn-writing-docs/evals/setups/site/{s14-debug-from-logs,s15-adopt-and-migrate-bad}.mjs`,
    and the deletes of `site-cases/s11-media-config.json` and `setups/site/s11-media-config-bad.mjs`.
  - Every task that edits `skills/`, through `npm run emit:template`: `templates/waymark/.claude/skills/**`.
  - No task edits `CLAUDE.md` or `.claude/rules/`.
- **`wrangler d1 --local`, a test process, a merge:** none of this pass's steps needs them. The conductor
  merges under the merge word.
- **Live accounts:** none.

## Backlog sweep

Scoped sweep at `d71e4401e`, landed in `df3b0e8aa`. A full sweep isn't due: 12 of 67 open items lacked a
stamp, under the 15 line, and the sheet runs one at pass 8's close. Items already stamped 2026-10-31 or
2026-11-01 stay unedited, so this branch leaves the lines 1a and 1b stamped alone.

| Item | Verdict | Reason |
|---|---|---|
| #157 | fold | T4. `site-descriptors.ts:14` and `site-indexes.ts:48-51` are rewritten. Moves to Done at T7. |
| #159 | fold | T5. `CairnAdmin.svelte:54-55` and `compose.ts:59` are rewritten. Moves to Done at T7. |
| #201 | reword | The sweep called it dissolved, but `ReproContext.svelte:245` keeps the file. Stays in pass 3. |
| #181 | reword | T3 removes the `allowedTypes` it pointed at. Stays in pass 4. |
| #134 | keep | T4 removes its mechanism. Pass 4 drops it, and this branch leaves the line alone. |
| #197 | keep | `site-resolver.ts`'s duplicate-permalink throw survives T4. Stamped. |
| #32, #144, #160, #98, #187 | keep | Pass 3. T2 rewrites `pipeline.ts`, so pass 3 reads #144 and #160 after this lands. |
| #107, #133, #163, #164, #179 | keep | Pass 4. T4's refusal does not cover a slash in `dir`. |
| #103, #147, #150, #180 | keep | Pass 5. T1 types `screen`, and #103's error string stays. |
| #70, #75, #166, #188, #196 | keep | Pass 8. |

## Stops and standing answers

The sheet's standing answers apply to every task. These are this slice's.

- **Plan over 780:** cut ergonomics 9's `screen` key, then shape 19. May set aside: ergonomics 9, 17, shape
  19, the `EntryData` stretch. May not: shape 1, 2, 3, 6, #159.
- **`SiteResolver<A>` variance:** the design note's probe passed. T4 writes the type test first. If the
  real types fail it, ship one typed `site` with a default and list the gap.
- **The `**` glob's cost is measurable:** T4 reads two `vite build` times. A real difference narrows the
  default glob to `/src/content/*/*.md`, and the PR lists it.
- **`noExternal` merge order fails:** keep the template lines and set ergonomics 17 aside.
- **A dependency this plan missed:** set that item aside for its home pass, list it under `## Decisions`,
  and go on. A real dependency on 1a or 1b is one, unless the slice can't land without it.
- **A test pins old behavior:** change it and list it. A test that only exercises a removed export or
  option leaves with it. This is not R6's retirement list. A barrel-prune test is updated to the new
  names, never deleted.
- **Stale transcript block:** leave page and fixture alone, and list it for the recapture.
- **An intended visual change:** none is expected. If CI shows one, regenerate through `e2e.yml`'s
  `update_snapshots` on the branch, read the render, and list it. Never commit a local baseline.
- **A site breaks:** add the `Consumers must:` line and go on, with no shim and no alias.
- **`docs/internal/engine-rulings.md`:** T3 rewords `runtime-publicmediaresolver` only. Pass 1b's T1 writes
  the twelve rulings.
- **Shared hunks:** `src/lib/sveltekit/index.ts:140` (1a at `:21` and `:110`), `src/lib/sveltekit/preview.ts`
  `:359` and `:364` (1a at `:420`), `src/lib/log/events.ts:56` (1a at `:92`),
  `src/lib/sveltekit/content-routes-entry-read.ts:306` (`tidy-lists` at `:503`), and
  `scripts/checks/check-surface-reexports.json` (1a edits it too). They are distant, and the conductor
  merges in order. Merge `origin/main` only when told, then keep both `## Unreleased` entries, run
  `npm run emit:template` and `npm run check:surface -- --update`, and rerun the fast lane.
- **A pair merge conflicts:** T5 and T6 are disjoint outside generated `api-surface.md` and
  `templates/waymark`. A conflict there is resolved by regenerating. Any other conflict means a task left
  its file list: resolve toward the plan and rerun the fast lane.
- **The clock:** a task past twice its estimate writes the stop to STATUS and waits for `cairn-cms-9b`. A
  traced cause gets twice the estimate once.
- **Questions:** none is expected. A stop goes to `docs/STATUS.md` for `cairn-cms-9b`, per the prompt.

## Gates

After each task, run the legs `node scripts/checks/gate-tier.mjs --fast --range <base>..HEAD` prints, each
through `cairn-run-gate` with the Bash tool's `timeout: 600000`, re-issued on exit 75, using
`CAIRN_GATE_LANE=light` on the legs that drive no browser. `<base>` is the commit before the task.

Each task that changes `index.ts` or an export's shape also runs `npm run check:surface -- --update` and
commits `scripts/checks/api-surface.md`, or `check:surface` is red in its lane. Each task that changes
`examples/showcase/` or `skills/` also runs `npm run emit:template` and commits `templates/waymark/`.

Each task edits the `skills/` references that teach what it changed in the same commit, because
`check:docs-gate` reads the range. Before calling a task free of docs, run
`git grep -n '<name>' -- docs/editors docs/admin skills` and read each hit outside history. No page under
`docs/editors/` or `docs/admin/` names these options today, so no `docs-fact-checker` run is expected. A
task that does edit such a page runs it.

## Tasks

Order: T1, T2, T3, T4, then the pair T5 and T6, then T7, T8. T1 to T4 share `types.ts` and the showcase's
`cairn.config.ts`, so they never pair. Hand each to `cairn-implementer`. T1 and T4 take `model: opus`,
since both carry inference or matching logic the plan doesn't fully specify. The rest stay Sonnet.

### T1. Keep the optional keys and check the config keys (40 min, ordinary, `model: opus`)

**Outcome:** shape 19 and ergonomics 9. `cairn.aiPosture` reads with no cast, and `npm run check` refuses
`summaryFields: ['nope']` and `navLayout: [{ screen: 'postz' }]`.

**Files:** `src/lib/content/adapter.ts`, `src/lib/content/concepts.ts`, `src/lib/content/types.ts`,
`src/lib/sveltekit/admin-nav.ts`, `examples/showcase/src/routes/robots.txt/+server.ts`, a new
`src/tests/unit/adapter-config-types.test.ts`, `skills/cairn-extending-a-site/references/content-model.md` if it
teaches either key.

- `adapter.ts:33`: `export function defineAdapter<const A extends CairnAdapter>(adapter: A): A {`. Return
  `A & Omit<CairnAdapter, keyof A>`, and type the parameter so `editor.navLayout`'s `screen` is the
  engine's six ids or `keyof A['content'] & string`.
- `concepts.ts:79`: `export function defineConcept<const C extends ConceptConfig>(concept: C): C {`. Key
  `summaryFields` to `keyof C['fields']['fields'] & string`. The design note quotes the proven form.
- `admin-nav.ts:127`: `export type EngineScreenId = (typeof ENGINE_SCREEN_IDS)[number] | (string & {});`
  stays for the untyped `NavLayout`. Export one helper type for the keyed form, with a doc comment and a
  tier tag. Reuse `NavLayoutEntry` and `NavLayoutSection` in it, so the keyed form cannot drift from them.
- `+server.ts:16`: `posture: (cairn as CairnAdapter).aiPosture,` loses the cast and its import. The comment
  at `:10` that explains the cast goes.
- The runtime throws stay, for an untyped caller: `concepts.ts:182-185` and `validateNavLayout`.

**Acceptance:** the test file holds `@ts-expect-error` lines on an unknown `summaryFields` key, a misspelled
`screen`, and a misspelled `screen` inside a section's `children`, plus a positive read of an unset
`aiPosture`. Removing the keyed type turns each `@ts-expect-error` into an unused-directive error in
`npm run check`, so the check can fail. Keyed access holds too: the test reads
`cairn.content.posts.dir` as its literal type, which T4's resolver needs.
`git grep -n 'cairn as CairnAdapter' -- examples/showcase` prints nothing.

**Standing answer:** the real `NavLayout` types fail inference the probe's stand-ins passed: set the `screen`
key aside, keep `summaryFields`, and list it. That is the first named cut.

### T2. Give `createRenderer` one bag and one render (70 min, ordinary)

**Outcome:** shape 1. A site writes `render: renderer.render`, which cannot drop `resolveFragment`.

**Files:** `src/lib/render/pipeline.ts`, `src/lib/content/types.ts`, `src/lib/delivery/public-routes.ts`,
`src/lib/admin/EditPage.svelte`, `src/lib/index.ts`, the comments in `src/lib/render/resolve-links.ts` and
`resolve-media.ts`, `examples/showcase/src/theme/cairn.config.ts`, `examples/showcase/src/chassis/{render,feed-items}.ts`,
`examples/showcase/src/chassis/feed-items.test.ts`, `examples/showcase/src/chassis/README.md`, the styleguide
page's quoted sample only if it names a real call, `scripts/checks/check-self-use-allowlist.json` if an
entry's reason names the old shape, `skills/cairn-extending-a-site/references/adopt-cairn.md`, and every
test under `src/tests/` that calls `renderMarkdown` or passes `resolve:`.

- `pipeline.ts:110-113` today:

  ```ts
  export function createRenderer(
    registry: ComponentRegistry = defineRegistry({ components: [] }),
    options: RendererConfig = {},
  ) {
  ```

  It becomes one `config: RendererConfig = {}` bag, with `components?: ComponentRegistry` and
  `resolveMedia?: MediaResolve` joining `RendererConfig`, each with a doc comment. `resolveMedia` is the
  default when an input carries none. It returns a hand-written `Renderer`: `render(input)` and
  `renderDocument(input)`, with the contract written out, per `convention-contract-first-returns`.
- `pipeline.ts:187`: `renderMarkdown: async (content: string, opts: ResolveOptions = {}): Promise<string> => {`
  goes. `renderDocument`'s `(content, opts)` becomes the same one input. The input is `SiteRender`'s:
  `{ body, concept?, frontmatter? }` plus `ResolveOptions`. Name it, so `SiteRender`, `render`, and
  `renderDocument` share one declaration.
- `pipeline.ts:207`: `export type Renderer = ReturnType<typeof createRenderer>;` goes.
- `pipeline.ts:37`, in `ResolveOptions`: `resolve?: LinkResolve;` becomes `resolveLink`. `SiteRender`'s
  member at `types.ts:279` does too, with its doc comment. The `[CAIRN_RESOLVE]: opts.resolve,` line in `makeFile`
  follows.
- The returned `remarkPlugins` and `rehypePlugins` go, and the comment on `buildProcessor` that says "the
  editor preview reuses that exact array" goes with them. `git grep` over `src/lib` and the showcase finds
  no reader. The options stay, since `cairn-pub` passes `rehypePlugins` at `src/lib/docs/loader.ts:44`.
- `public-routes.ts:208`, in `composeEntryData`: `resolve: overrides?.resolveLink ?? createLinkResolver(site),`
  becomes `resolveLink:`. `EditPage.svelte:1489` likewise.
- `cairn.config.ts:48`: `const { renderMarkdown } = createRenderer(registry, { remarkPlugins: proseTypography });`
  and the forwarding closure at `:210-215` become `const renderer = createRenderer({ ... })` and
  `render: renderer.render`. T3 adds `resolveMedia` to that bag.
- `#144`'s and `#160`'s comments stay as they are, for pass 3.

The tests are about 147 mechanical call sites: `renderMarkdown(md, opts)` to `render({ body: md, ...opts })`.
Script it once, in `$CLAUDE_JOB_DIR/tmp`, then hand-fix what it misses.

**Acceptance:** add one test to `src/tests/unit/resolve-include.test.ts` where `render({ body:
'::include[x]', resolveFragment })` resolves, with `render` passed straight as `rendering.render`, and one
in `render-pipeline.test.ts` that a bag `resolveMedia` applies when an input has none and an input's wins.
Delete the input's `resolveFragment` read in `makeFile` and the first fails, so it cannot pass vacuously.
`git grep -n 'renderMarkdown' -- src/lib examples/showcase/src skills` prints only the styleguide's quoted
sample, or nothing. `npm run check` passes.

### T3. Fold the media wiring and drop the five options (90 min, ordinary)

**Outcome:** shape 3 and the five options. The whole wiring is
`export const resolveMedia = createMediaResolver(media, mediaManifest);`, and a site's only media setting
is `bucketBinding`.

**Files:** `src/lib/media/{config,naming,index}.ts`, `src/lib/media/transform-url.ts` (delete),
`src/lib/render/resolve-media.ts`, `src/lib/content/{compose,types}.ts`, `src/lib/index.ts`,
`src/lib/sveltekit/{index,media-route,preview}.ts`,
`src/lib/sveltekit/content-routes-{shell,entry-read,entry-write,media-ingest,media-metadata,media-delete}.ts`,
`src/lib/delivery/public-routes.ts`, `src/lib/log/{events,events-list}.ts`,
`tool/internal/logs/events.go`, `src/lib/admin/{CairnAdminShell,CairnMediaLibrary,MediaHeroField,MediaPicker}.svelte`,
`src/lib/admin/editor-media.ts`, `src/lib/reproductions/ReproContext.svelte`,
`examples/showcase/src/theme/cairn.config.ts`, `examples/showcase/src/chassis/{public-routes,feed}.ts`,
`examples/showcase/src/routes/test/render-media/+server.ts`,
`scripts/checks/{check-options.mjs,check-surface-reexports.json}`,
`skills/cairn-extending-a-site/references/{media,public-routes,debug,log-events}.md`,
`docs/internal/engine-rulings.md`, `src/tests/unit/media-transform-url.test.ts` (delete), and the tests below.

Rename across the tree, the type first: `AssetConfig` to `MediaConfig`, `ResolvedAssetConfig` to
`ResolvedMediaConfig`, `normalizeAssets` to `normalizeMedia`, `runtime.resolvedAssets` to `runtime.media`.
`runtime.assets` stays, retyped: shape 8 removes it.

- `config.ts:17-31`: `ResolvedMediaConfig` keeps `enabled` and `bucketBinding`. The defaults at `:34-38`
  stay as exported constants `MAX_UPLOAD_BYTES` and `ALLOWED_TYPES`. The checks at `:59-67` go, with the
  `extForMediaType` import. It leaves `/media`, and so does `normalizeMedia`.
- `naming.ts:129-135` becomes `publicPath(slug, shortHash, ext, base = '/media')`. The `opaque` arm at
  `:136-138` goes. The six callers lose their `'slug'` argument: `CairnMediaLibrary.svelte:606`,
  `MediaPicker.svelte:254`, `MediaHeroField.svelte:140,244,354`, `editor-media.ts:94`, and
  `resolve-media.ts`'s three.
- `resolve-media.ts:100-111`: `createMediaResolver(manifest, resolved, opts)` becomes
  `createMediaResolver(media: MediaConfig | undefined, manifest, opts)`, normalizing inside. `strict` stays
  as it is.
- `resolve-media.ts`: `SRCSET_WIDTHS` at `:26`, `SIZES_BY_ROLE` at `:36`, `MediaImageDetail.srcSet`,
  `roleFromParent` at `:172`, the `sizes` branch of `applyImageDetail`, and the `variantUrl` import go.
  `imageDetail` stays and carries `width` and `height`.
- `preview.ts:359` and `:364`: `if (runtime.resolvedAssets.enabled) {` and
  `resolveMedia = createMediaResolver(parseMediaManifest(safeParseJson(raw)), runtime.resolvedAssets);`
  take `runtime.media` in the new order. Narrowed on `enabled`, it assigns to `MediaConfig`. The comment at
  `:354` loses "publicBase, presets".
- `content-routes-media-ingest.ts:105,133,138` read the constants.
- `public-routes.ts:57` and `:65`: `resolveMedia?: MediaResolve;` becomes required `resolveMedia: MediaResolve | null;`,
  and `assetsEnabled?: boolean;` goes. The warn at `:232-234` goes. `composeEntryData` and `deriveHeroImage`
  treat `null` as absent.
- `'media.resolver_absent'` leaves `events.ts:56`, `events-list.ts:48`, `events.go:42`, `log-events.md:88`,
  `debug.md:87`, and `media.md:127`. `public-routes.test.ts:398-418` leaves with it.
- `content-routes-shell.ts:97` and `:247`: `mediaBase: string;` and
  `mediaBase: runtime.resolvedAssets.enabled ? runtime.resolvedAssets.publicBase : DEFAULT_MEDIA_BASE,` go,
  with the import at `:9`. `CairnAdminShell.svelte:81-87`'s comment and `setContext` go.
  `ReproContext.svelte:288-292`'s comment and `mediaBase` field go. Its `setContext` at `:245` stays, as do
  `media-base-context.ts` and the readers' `?? DEFAULT_MEDIA_BASE`.
- `cairn.config.ts:52-72`: the showcase hoists `media` and writes one `export const resolveMedia`. The
  renderer bag takes it. `mediaEnabled` and `publicMediaResolver` go, and `chassis/public-routes.ts:21-24` and
  `chassis/feed.ts` read `resolveMedia`. `render-media/+server.ts` calls
  `createMediaResolver({ bucketBinding: 'MEDIA_BUCKET' }, manifest)`.
- `scripts/checks/check-options.mjs:60`: `ResolvedAssetConfig` in `EXCLUDED_TYPE` becomes
  `ResolvedMediaConfig`. `check-surface-reexports.json:318` and `:348` follow the new names. The entry at
  `:321`, whose reason is "`normalizeAssets` names it on this subpath", goes if nothing on `/media` still
  names the type.
- `media.md`: rewrite the options sections at `:21-55` and `:74` to what remains. One `bucketBinding`, the
  fixed 25 MB cap, the five stored types, and `/media` as the one route.
- `engine-rulings.md:502`: "A measured need the `media.resolver_absent` warn event at `createPublicRoutes`
  construction does not cover" becomes "A measured need the required `PublicRoutesConfig.resolveMedia` does
  not cover". Run `npm run check:rulings-format`.

Tests. Script the `resolvedAssets` fixture in the 31 test files that hold it, and hand-fix the ones that set
an option. `media-config.test.ts` keeps `enabled` and the missing-binding refusal. `media-upload.test.ts:181`
sets `maxUploadBytes: 10`, so its too-large cases change to a declared length of `MAX_UPLOAD_BYTES + 1` and,
for the post-read recheck, a real body of that size. `:229`'s SVG case stays, since SVG is still denied, with
`allowedTypes` dropped from the fixture. Keep `resolve-media.test.ts`'s width and height cases, and move
`:105`'s describe off `transformations`. `render-sink-guard.test.ts`'s `srcSet` cases stay: the guard
handles author HTML. `media-naming.test.ts` loses its `opaque` case.

In `reproductions-stories.test.ts`, the case at `:280`, "prefers CairnAdminShell's own shadow", pins what
this task removes. Rewrite it as "a shell-hosted story reads ReproContext's media base", passing `mediaBase:
'/docs/repro-assets'`, and assert that value. It stays falsifiable: remove `:245`'s `setContext` and the probe
reads `/media`.

**Acceptance:** add a `resolve-media.test.ts` case that `createMediaResolver(undefined, manifest)` resolves
nothing and `createMediaResolver({ bucketBinding: 'B' }, manifest)` resolves a hash. A `public-routes.test.ts`
case with `resolveMedia: null` derives no hero and renders. `git grep -nE
'publicBase|urlForm|maxUploadBytes|allowedTypes|transformations|resolvedAssets|normalizeAssets|AssetConfig|assetsEnabled|resolver_absent|variantUrl'
-- src/lib examples/showcase/src skills tool/internal` prints nothing, once T3 rewords `sniff.ts:19`, `:24`,
and `:115`'s `allowedTypes` comments to say the denial stands ahead of the type list. `make -C tool check` passes. A build's `<img>` for a media image carries `width` and `height` and
no `srcset`, read from the `resolve-media.test.ts` output.

### T4. One glob and one typed resolver (85 min, ordinary, `model: opus`)

**Outcome:** shape 2, shape 6, and #157. Adding a concept is one edit in one file, and `site.concept('posts')`
is typed and never undefined.

**Files:** `src/lib/delivery/{site-resolver,site-descriptors,manifest,public-routes,data,index}.ts`,
`src/lib/delivery/site-indexes.ts` (delete), `src/lib/vite/{index,internal}.ts`,
`src/lib/content/{adapter,types}.ts` (comments), `scripts/checks/{check-self-use-allowlist,check-surface-reexports}.json`,
`examples/showcase/src/chassis/content.ts`, `examples/showcase/src/chassis/feed-items.ts`,
`examples/showcase/vite.config.ts`, the showcase routes that import `posts`,
`examples/showcase/src/chassis/README.md`, `examples/showcase/e2e/fragments.spec.ts`'s comment,
`.claude/skills/cairn-writing-engine-code/references/code-idioms.md`,
`skills/cairn-extending-a-site/references/{adopt-cairn,content-model,migrate-content,public-routes,log-events}.md`,
a new `src/tests/unit/site-resolver-types.test.ts`, and the tests below.

Write `site-resolver-types.test.ts` first, in its own commit-ready state, from the design note's probe: a typed
read, a refused id, a refused field on the other concept, assignment of `SiteResolver<typeof adapter>` to
`SiteResolver` as a value and as an argument, and the default's `concept` being possibly undefined. It needs
`A & Omit<CairnAdapter, keyof A>` from T1 in place. Then:

- Types: `export type SiteResolver<A extends CairnAdapter = CairnAdapter>` is the conditional alias the note
  quotes, over two exported interfaces with doc comments and tier tags, so the leak gate sees them.
- `site-indexes.ts:48-51`, `createSiteIndexes(adapter, config, globs, opts)`, becomes public
  `createSiteResolver<const A extends CairnAdapter>(adapter: A, files: Record<string, string>): SiteResolver<A>`
  in `site-resolver.ts`. The existing internal `createSiteResolver(concepts, opts)` at `site-resolver.ts:71`
  takes another name and loses `opts`. `SiteIndexes`, `SiteGlobs`, and the file go, and the reserved-key throw
  at `site-indexes.ts:62-66` with them.
- `site-resolver.ts:77-88`: the `validate: false` branch goes, so `content.entry_invalid`'s `scope: 'index'`
  arm goes. `log-events.md:55` drops `id` (index), and `types.ts`'s "unless the site passes `validate: false`"
  at `ConceptConfig.fields` goes.
- One internal function buckets a `Record<string, string>` by descriptor, shared by `createSiteResolver` and
  `buildSiteManifest`. A path's parent directory, leading slash stripped, must equal a `descriptor.dir`.
  - A file under no concept throws `cairn: content file "<path>" sits under no concept's dir`, naming the
    declared dirs.
  - A `dir` outside `src/content` throws `cairn: concept "<id>" dir "<dir>" is outside src/content`.
  - A concept with no files is an empty index.
  - The throw message is a contract: `content-model.md` quotes it.
- `manifest.ts:20`, `buildSiteManifest(adapter, config, globs)`, becomes `buildSiteManifest(adapter, files)`.
  `:24`'s `globRecord[descriptor.id] ?? {}` goes. `site-descriptors.ts:14`,
  `buildSiteDescriptors(adapter: CairnAdapter, siteConfig: SiteConfig)`, drops `siteConfig`, with `void siteConfig;`.
- `SiteResolver.entries()` at `site-resolver.ts:30` becomes `paths()`. `PublicRoutes.entries` keeps its name,
  and `public-routes.ts:245`'s `site.entries()` reads `site.paths()`.
- `SiteResolver.adjacent` at `:28` and `:117-120` goes. `public-routes.ts:166`,
  `const { newer, older } = site.adjacent(entry);`, reads the concept's index, gated on `site.routable`, as the
  design note says. `public-routes.md` loses it, and `ContentIndex.adjacent` stays.
- `internal.ts:39-52`: `CairnManifestOptions` keeps `configModule` alone, whose doc comment drops "and the parsed
  `siteConfig`". `DEFAULT_MANIFEST_PATH` and `DEFAULT_SITE_FACTS_PATH` become the only paths, so
  `internal.ts:73`, `:246`, and `:400` read them directly.
- `virtualSource` at `:72-101`: the `globEntries` map at `:74-79` and `const globs` go, and the source holds one
  `const files = import.meta.glob('/src/content/**/*.md', { query: '?raw', import: 'default', eager: true });`.
  `:93`, `import { cairn, siteConfig } from ...`, drops `siteConfig`. `:98` reads
  `const built = buildSiteManifest(cairn, files);`.
- `chassis/content.ts:9-29` becomes one glob and `export const site = createSiteResolver(cairn, files);`, using
  `import.meta.glob<string>`. `posts` stays exported as `site.concept('posts')`, so its readers change only if
  the type asks. `feed-items.ts:31`'s `if (!posts)` stays, since `FeedSource.site` is the default resolver.
- `vite.config.ts:51-59`: `cairnManifest({ configModule: '/src/theme/cairn.config.ts' })`.
- `content-model.md:44`, step 3, and the "pass `{}`" advice go, so a new concept is its adapter entry alone.
  `code-idioms.md:32`'s example prefix `createSiteIndexes:` becomes `createSiteResolver:`.

`delivery-site-indexes.test.ts` becomes the public function's test. `delivery-manifest.test.ts`,
`delivery-site-resolver.test.ts`, the barrel-prune and export tests, and the entry-boundary test follow the
names, and `delivery-data-dist-spawn.test.ts` stays green.

**Acceptance:** three new cases: a file at `/src/content/stray.md` throws naming the path, a concept at
`dir: 'content/posts'` throws naming the id, and a concept with no files is empty, with `.all()` length 0.
Each sits against an adapter with a populated concept beside it, so the buckets are not all empty. In
`public-routes.test.ts`, a fragment-concept entry gets no `newer` or `older`, which fails with the
`site.routable` gate deleted. `vite-manifest*.test.ts` pass with the new option shape, including the
`CAIRN_OPTIONS` stash. Run `(cd examples/showcase && npm run build)` before and after the change through
`cairn-run-gate`, record both times, and take the standing answer if the second is over 20% longer.
`git grep -n 'createSiteIndexes\|SiteGlobs\|SiteIndexes\|manifestPath\|siteFactsPath' -- src/lib/delivery src/lib/vite examples/showcase skills`
prints nothing but the `CairnRuntime.manifestPath` member, which stays.

### T5. One rendering prop on `CairnAdmin` (25 min, ordinary, pair with T6)

**Outcome:** #159. A site cannot wire `render` and `registry` apart, so Insert block never silently vanishes.

**Files:** `src/lib/admin/CairnAdmin.svelte`, `src/lib/content/{compose,types}.ts`,
`examples/showcase/src/routes/admin/[...path]/+page.svelte`,
`skills/cairn-building-admin-screens/references/admin-mount.md`,
`skills/cairn-extending-a-site/references/admin-access.md`, `src/tests/component/CairnAdmin.test.ts`,
`src/tests/unit/compose.test.ts`, `src/tests/unit/compose-icons.test.ts` if it reads `registry`.

- `CairnAdmin.svelte:52-57` declares `render?: SiteRender;`, `registry?: ComponentRegistry;`, and `icons?: IconSet;`.
  They become one `rendering?: CairnAdapter['rendering']`, and `:64` and `:96-98` read from it. `EditPage`'s props
  stay, since it is `CairnAdmin`'s child and not the site's seam.
- `compose.ts:59`: `registry: adapter.rendering.components,` goes, with `registry?: ComponentRegistry;` on
  `CairnRuntime` at `types.ts:487`. `render` and `icons` stay for shape 8.
- `+page.svelte:26-28` and both skill pages become `rendering={cairn.rendering}`.

**Acceptance:** a `CairnAdmin.test.ts` case mounts an edit view with `rendering={{ render, components }}` and
finds the Insert block trigger. It fails if `components` isn't threaded. `git grep -n 'registry={' --
examples/showcase/src skills src/tests/component/CairnAdmin.test.ts` prints nothing.

### T6. The plugin owns `ssr.noExternal` (30 min, ordinary, pair with T5)

**Outcome:** ergonomics 17. A site's `vite.config.ts` carries no `noExternal` line, in dev and in a build.

**Files:** `src/lib/vite/internal.ts`, `examples/showcase/vite.config.ts`,
`skills/cairn-extending-a-site/references/adopt-cairn.md`, `packages/cairn-cms-dev/README.md`,
`src/tests/unit/vite-manifest-dev-server.test.ts` or a new case beside it.

- `internal.ts:305-309`, the `config` hook, returns early: `if (config.define && DEV_BUILD_DEFINE in config.define) return;`.
  Restructure it so a site-set define skips only the define, and the hook always returns
  `ssr: { noExternal: ['@glw907/cairn-cms', '@glw907/cairn-cms-dev'] }`. Vite's `mergeConfig` concatenates
  array values, so a site's own list is kept. Quote that behavior from Vite's docs or source in the commit
  message.
- The nested server drops this plugin: `NESTED_SERVER_STRIPPED` at `:190` names `'cairn-manifest'`, and
  `createServer` at `:118` spreads the site's config. Without the lines the nested server loses `noExternal`,
  so `evalVirtual` adds it to the inline config. The `// WATCH:` at `:187-189` says the same about the define.
- `vite.config.ts:64`: `ssr: { noExternal: ['@glw907/cairn-cms', '@glw907/cairn-cms-dev'] },` goes, with its
  comment at `:62-63`. `resolve.dedupe` stays, because that comment ties it to the `file:../..` symlink.
- `adopt-cairn.md:19`'s step 2 and `:62`'s `noExternal` clause go. `README.md:37-40` goes.

**Acceptance:** a unit case calls the hook with a site list and confirms both names are returned, and that a
site-set define still wins. Then the real proof, each through `cairn-run-gate`, from the worktree after
`npm run package`: `(cd examples/showcase && npm run build)` and the fast lane's e2e leg, which runs `/admin` under
the dev build. A 500 on `/admin` or a `.svelte` parse error is the merge-order failure, whose standing answer
keeps the lines and sets ergonomics 17 aside. `npm test -w packages/create-cairn-site` passes.

### T7. Evals, changelog, and migration notes (40 min, ordinary)

**Outcome:** the eval cases, the record files, and the backlog match the landed slice.

**Files:** the evals in Pre-flight, `CHANGELOG.md`, `MIGRATION-NOTES.md`, `BACKLOG.md`.

- `s11-media-config.json` and its bad setup go. Its checks read `publicBase` and `urlForm`, which no longer
  exist. Confirm `evals-site.json:10`'s `casesDir` picks cases by directory, so nothing names it.
- `S07-new-concept.json:15,23` and `S08-public-routes.json:5,20`: `createSiteIndexes` becomes `createSiteResolver`,
  and S07's expectation drops the per-concept glob.
- `s14-debug-from-logs.mjs:122` swaps `  type AssetConfig,\n} from`. It becomes `MediaConfig`, and a check that the
  swap target exists in the baked `cairn.config.ts` is the acceptance.
- `s15-adopt-and-migrate.json:17,21,23,99,111`: its `noExternal` check goes, unless T6 set ergonomics 17 aside, and
  `createSiteIndexes\\(` becomes `createSiteResolver\\(`. `s15-adopt-and-migrate-bad.mjs:35-40` loses
  `{ validate: false }`, since that option is gone. The setup keeps its other faults, and its header
  comment is reread against them.
- This is a fixture update for renamed code, not a docs-process change, so `.claude/rules/evals-docs-process.md`'s
  two-suite run does not apply. List that under `## Decisions`.
- `CHANGELOG.md` `## Unreleased`: one entry per change, with one `Consumers must:` line per consumer action.
- `MIGRATION-NOTES.md` `## Unreleased` at `:197` gains the same steps.
- `BACKLOG.md`: #157 and #159 move to `## Done`. File a found item for the `EntryData` union through
  `standards:log-issue`, and anything else found, and list them in the PR.

**Acceptance:** `node --test .claude/skills/cairn-writing-docs/evals/run-site.test.mjs` passes, and
`git grep -n 'createSiteIndexes\|AssetConfig\|publicBase' -- .claude/skills` prints only `history.md`. The docs gate
passes: `npm run check:docs-gate`.

### T8. Regenerate, review, and hand over (40 min, ordinary)

**Outcome:** a green PR at PR-ready, with no open finding.

**Files:** `scripts/checks/api-surface.md`, `templates/waymark/`, `docs/STATUS.md` only for a stop, the PR body.

- Run `npm run emit:template` and `npm run check:surface -- --update`, and commit what they change. Confirm
  `git diff df3b0e8aa..HEAD -- packages/create-cairn-site/src` is empty, and `npm test -w packages/create-cairn-site`
  passes, which holds the `TEMPLATE_GITHUB_APP_LITERAL` bake test.
- Dispatch `standards:diff-reviewer` at whole-branch scope with `standards:svelte-reviewer` for the changed
  `.svelte` and load code. Fold through one fix chain, quoting each finding verbatim.
- Rerun `npm run check:docs-gate` after the last docs edit, and the fast lane.
- Green CI on the head through `ci-green <sha> --pr <n> --wait`. Name the verdict in the report.
- The PR body opens with `## Brief`, then what landed, `## Decisions`, `## Planning misses`, flake evidence, the
  found items, and the score, per `pass-core` "Close".

**Acceptance:** CI green on the head, including `e2e` and `create-site`. The review reads accept. Every breaking
item in T1 to T6 has a `Consumers must:` line in `CHANGELOG.md`: count them against the task list.

## Docs

`docs/editors/` and `docs/admin/` hold none of the removed names, and a save, an upload, and a publish behave as
before, so neither track should change. T3 and T4 confirm with the grep under "Gates". The packaged skills carry
the developer's job. `cairn.pub` renders the doc arms from its installed version, so these go public at the next
release and pin bump.

## Later

Nothing is built for these: the `EntryData` union; a `content` option for a site outside `src/content`; a
`srcset` path, which a future site can ask for and adding it is no break.
