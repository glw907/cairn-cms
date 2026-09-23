# Minor and patch bump survey, pre-release

Scope: the pending minor/patch bumps listed for the next cairn-cms release, judged against
actual usage in this repo (not hypothetical usage). Per-package sections carry features to
leverage, practices to change, and risks in the bump. A separate section covers the DaisyUI
component inventory Geoff asked for directly. A ranked top five closes the document.

## Update, 2026-09-20 (pre-cut sweep, Task 1)

This record is extended in place, not restarted: the `## Unreleased` window this file covers
has not closed since 2026-09-13 (nothing in it landed; the pass that would have taken it never
ran, per the pre-cut plan). Every package below moved further in the same direction the
2026-09-13 survey already found; none reversed or introduced a new practice this update did not
already cover. New sections follow for packages this update newly surveys: `devalue`,
`eslint-plugin-tsdoc`, `postcss`, `@types/node`, `@codemirror/commands`, and the audit-fix
findings (`fast-uri`, `js-yaml`, `cookie`, `sharp`). The per-package "still accurate" notes are
inline in each existing section below.

## svelte 5.56.10 -> 5.57.1

**Update, 2026-09-20.** Moved one further patch, 5.57.0 to 5.57.1: four bug fixes (cancel
deferred event listeners on cleanup, preserve global CSS in a component with no scopable
element, reduce SSR render-result garbage, resolve an `each` block's fallback in the enclosing
scope) plus a parser perf change. None touches a shape `MarkdownEditor` or the admin components
depend on; the "preserve global CSS" fix is a correctness fix for `:global()` usage, not a
behavior change for code that already worked. The 2026-09-13 findings below (the `<select>` and
`<textarea>` codegen risk items) are unaffected and still the right gate-risk targets.

**Features to leverage.** `defaultValue` on `<select>` (PR #18591) fits
`src/lib/components/ManageEditors.svelte:169-174`, which builds an uncontrolled `<select
name="role">` and picks the default option with a per-iteration computed
`selected={entry.role === 'editor'}`. That collapses to `<select name="role"
defaultValue="editor">` with plain `<option value={entry.role}>`, dropping the boolean.
Small, optional win. Nothing else in range has a call site: `createContext`, `SvelteMap`, and
`svelte/server`'s new exports (`RenderOutput`, `Csp`, `Sha256Source`) all grep to zero outside
build output.

**Practices to change.** None forced. The widened `a11y_mouse_events_have_key_events` rule
(now accepts `onfocusin`/`onfocusout`) touches
`src/lib/admin-toolkit/ToolbarDisclosure.svelte:285`, which already uses `onfocusout`: this
removes a lint warning cairn may have been suppressing, not a new requirement.

**Risks in the bump.** Two compiler-codegen fixes touch shapes cairn actually has:
- #18449 ("prevent malformed AST output for `<select>` with static `value` attribute") and
  the paired `defaultValue` feature both touch `<select value=...>` codegen. Cairn has three
  controlled, static-`value` selects, none using `bind:value`:
  `src/lib/admin-toolkit/ListToolbar.svelte:364`, `:393`, and
  `src/lib/admin-toolkit/Pagination.svelte:74`. Re-run the component and e2e suite over these
  after the bump.
- #18727 ("properly apply static textarea value attribute during CSR") touches `<textarea
  value={...}>` (unbound). `src/lib/components/ComponentForm.svelte:330-342` matches this
  exactly (`value={slotString(slot.name)}` with `oninput` sync). A prior CSR mis-application
  could shift a snapshot or a vitest-browser test.

Otherwise a routine patch/perf release: no removed API, no changed default.

## vite 8.2.2 -> 8.3.0

**Update, 2026-09-20.** Still the target; nothing newer in range. Findings below still accurate.

**Features to leverage.** Nothing for cairn. The one feature (skip re-settling already-seen
preload dependencies during build) is an internal Rollup-preload perf change with no config
surface `examples/showcase/vite.config.ts` touches.

**Practices to change.** None. No deprecation and no changed default reaches this repo's
`dedupe`, `ssr.noExternal`, `server.fs.allow`, or the `devBuildDefine`/`cairnManifest`
plugins.

**Risks in the bump.** "Only treat whole `node_modules` path segments as dependencies" (fixing
vite#17467) narrows a false-positive path match. The showcase resolves the engine via a
`file:../..` symlink into `examples/showcase/node_modules`, with `ssr.noExternal:
['@glw907/cairn-cms']` and `server.fs.allow: ['..', '../..']`: exactly the kind of
cross-boundary resolution this fix touches, on top of this repo's own documented worktree
symlink gotcha (CLAUDE.md, "a worktree showcase e2e proves main's engine"). Low probability of
breakage since the fix narrows rather than removes matching, but run a real `npm run dev` plus
an e2e smoke after the bump. No other exposure (no CRLF files, no Vite proxy config here).

## vitest-browser-svelte 3.0.0 -> 3.1.0

**Update, 2026-09-20.** Still the target; nothing newer in range. Findings below still accurate.

Nothing for cairn in this range: 3.0.0...3.1.0. The entire changelog is "add license and
support vitest 5" (widens the `vitest` peer range to include `^5`). Cairn pins `vitest:
"^4.1"` in both `package.json:276` and `examples/showcase/package.json:46`, so this bump only
unblocks a future vitest-5 migration; it has no effect today.

## wrangler 4.125.0 -> 4.135.0

**Update, 2026-09-20.** Moved four further releases, 4.131.1 to 4.135.0: Containers Build
Output support, a private-beta `--secrets-file`/`--var` flag pair on `wrangler preview`, and a
`miniflare`/`sharp` dependency bump (the same bump that resolves this sweep's `sharp` advisory
in the showcase's own `npm audit`, see the audit-fix section below). No entry across the added
range mentions D1, email sending, or R2. Findings below still accurate.

**Features to leverage.** `wrangler@4.128.0` adds `observability.redact_query_string`. The
showcase turns on `observability.enabled: true` in `examples/showcase/wrangler.jsonc`, and
`docs/reference/log-events.md` promises logs carry no secrets. Marginal fit: cairn's routes
don't put secrets in query strings today, so this is optional hardening, not a gap-closer.

**Practices to change.** `4.129.1` changes the bundle-size warning to compare uncompressed
size against a single 64 MiB ceiling, replacing the old 3 MiB/10 MiB gzip limits. Cosmetic for
cairn, which ships nowhere near either limit, and nothing asserts on the warning text today.
`4.131.0` removes the private-beta `wrangler preview settings` commands; unused here.

**Risks in the bump.** None found. No changelog entry across the range mentions D1, email
sending, or R2: the three Cloudflare surfaces cairn actually depends on
(`AUTH_DB`/`APP_DB`/`MEMBER_DB`, `MEDIA_BUCKET`, `send_email`). The Containers and
Pages-delegation changes don't apply; cairn ships no `containers` config and doesn't use
`wrangler pages`. Because the repo's gates run e2e through `vite preview`, not `wrangler dev`
(confirmed: no `wrangler` string anywhere in `examples/showcase/playwright.config.ts` or
`e2e/`), none of these CLI-behavior changes can turn a local gate red.

## @cloudflare/workers-types 5.20260821.1 -> 5.20260921.1

**Update, 2026-09-20.** Moved ten further daily builds, 5.20260911.1 to 5.20260921.1; types-only
package, no runtime behavior. Not separately diffed beyond the 2026-09-13 range below; the
binding types cairn uses (`D1`, `EmailMessage`, `R2Bucket`) are stable surface that has not
moved across a `@cloudflare/workers-types` release in this repo's history.

Nothing for cairn in the originally surveyed range. Diffed `index.d.ts` directly (17,240 to
17,556 lines): zero
hits for `D1`, `EmailMessage`, or `R2Bucket` in either direction, so the binding types cairn
actually uses are unchanged. The diff is almost entirely new Workers AI model type
declarations, small DOM-lib polyfill widenings, and Containers/tracing additions: none of
which any code under `src/lib` touches (no Workers AI binding, no Container binding, no
tracing API calls).

## daisyui 5.7.20 -> 5.7.42

All 17 releases in the originally surveyed 5.7.20-5.7.37 range are single-bug-fix patches
(checkbox, badge, loading spinner, OTP, dropdown/toast RTL, tooltip font-weight, breadcrumbs,
join, skeleton, menu, floating-label, FAB, text-rotate). None touch card, btn, input, modal,
tab, select, or drawer, the classes cairn leans on most.

**Update, 2026-09-20.** Moved five further patches, 5.7.37 to 5.7.42, and one of them is a real
feature-to-leverage hit, not cosmetic. 5.7.38 styles `[aria-pressed]` and `[aria-current]` as
`btn-active` natively inside `.btn`. `src/lib/admin-toolkit/Pagination.svelte:97-101` already
sets both `class="... {item === page ? 'btn-active' : ''}"` and `aria-current={item === page ?
'page' : undefined}` on the same button, hand-rolling exactly what daisyui's CSS now does from
the `aria-current` attribute alone. The manual `btn-active` class is now redundant, not
conflicting (both target the same state), so this is a genuine simplification candidate, ruled
in the refactor-decision table below. 5.7.42 fixes disabled styling for
`input`/`select`/`textarea`/`file-input`, a pixel-only fix to already-shipped markup, same class
as the checkbox/badge fixes below.

**Correction, 2026-09-21 (from the post-bump baseline regen).** Two claims above read the
selectors too narrowly, and the visual regen is what surfaced both.

- `src/lib/admin-toolkit/ListToolbar.svelte`'s facet buttons are NOT out of reach. 5.7.38's selector reads
  `.btn:is([aria-pressed=true],[aria-checked=true],[aria-current]:not([aria-current=false],[aria-current=""]))`,
  so `aria-checked` matches it as squarely as `aria-pressed` does. The outcome is still no visual
  move, but for a different reason than the one recorded: `ListToolbar.svelte:289` already writes
  `btn-active` on the same state, so daisyui's rule lands on a button that already had the
  treatment. The record's "does not reach it" was wrong; "changes nothing" is right.
- 5.7.38 does reach a surface cairn uses. Its `menu` `aria-current` styling adds a
  visible depth shadow under the admin sidebar's active nav item
  (`box-shadow: 0 2px calc(var(--depth) * 3px) -2px var(--menu-active-bg)`, `menu.css`), which is
  more than the `--menu-active-fg` color entry the norms check caught. Taken as daisyui's stock
  active treatment, not overridden.

**Features to leverage.** 5.7.25 adds native `checkbox` support for `aria-checked="mixed"`
styling (parallel to `:indeterminate`). `src/lib/components/MediaOrphanTools.svelte:55-79`
drives the indeterminate state imperatively via the DOM property with no `aria-checked`
mirror. The DOM-property approach still works; this just means DaisyUI now has its own CSS
path for the mixed state, worth a look if cairn ever adds an ARIA mirror. Not a code deletion
today.

**Practices to change.** 5.7.36 fixes checkbox tick/dash alignment; 5.7.35 fixes badge
shrinking inside a flex container. Cairn uses `checkbox` (51 call sites) and `badge badge-xs
... ml-auto` inside flex rows at `CairnAdminShell.svelte:1005,1030`. Both are visual-only
pixel nudges to already-shipped markup, no code change needed, but expect exact-pixel snapshot
diffs on those elements specifically.

**Risks in the bump.** Check the checkbox, badge, `loading-sm`, disabled-input, and
Pagination's `aria-current` button visual/e2e baselines specifically after bumping; the other
patches (OTP, RTL dropdown/toast, join, skeleton, floating-label, FAB, text-rotate, Firefox
Android drag-resize, validator colors, `dock`) touch surfaces cairn doesn't use.

**Gate risk, resolved 2026-09-21.** The post-bump CI regen rewrote 33 admin baselines, and a
fresh visual read of that regen reported four regressions. Measured against the two committed
baseline sets, the regen moved exactly three things, and only one of them is breakage:

1. **The breadcrumb, real breakage.** 5.7.28 added
   `.breadcrumbs { margin-inline-start: -.25rem }` and
   `.breadcrumbs > ul { padding-inline-start: .25rem }` (`breadcrumbs.css`). The pair nets to no
   visible shift, but it takes 4px out of the crumb list's content box inside a wrapper that
   sizes to its crumbs, so the flex line overflowed by 4px and every crumb ellipsized. Fixed by
   `ms-0` alone on the call site's `nav`, cancelling the negative margin; the `ul`'s own padding
   stays, since it is the room the first crumb's keyboard focus ring needs against the
   `.breadcrumbs` scroll clip. The 40px of left inset the same change removed was the
   UA's own `<ul>` marker gutter, never authored; the band now starts at the topbar's own left
   padding, aligned with an office route's site name.
2. **The active nav item's depth shadow, intended.** 5.7.38, above. Taken as stock.
3. **The media view toggle's pressed ring, not the bump at all.** The ring darkened from a 20%
   `base-content` mix to a 55% one. That is `2ca47771` (2026-09-12), which raised the pressed
   cue above the WCAG 1.4.11 3:1 floor, reaching a baseline for the first time; the previous
   regen (`3a5e2f3b`, 2026-08-29) predates it. The packaged sheet's `.ring-base-content\/55` rule
   is byte-identical under 5.7.20 and 5.7.42.

The fourth reported regression, a shrunken `⌘K` hint, is not in the regen: the two baseline sets
are pixel-identical in that region. The hint renders differently on this workstation than on CI
because `<kbd>` inherits the UA's `monospace` keyword and the two font sets resolve `U+2318`
differently; the comparison that reported it read a local render against a CI baseline.

The wider lesson for the next bump: baselines regenerate on CI only, so a regen after a long gap
carries every intended change since the last one (this one spanned 1033 commits and three weeks).
Attribute a regen's diff against the code that moved, not against the bump alone.

**Confirmed, 2026-09-20: `npm run norms:check` caught a real, attributable move.**
`CairnAdminShell.svelte:1055` sets `aria-current="page"` on the active nav item inside its
`menu`-classed sidebar; 5.7.38's "style aria-current as menu-active in menu" fix adds
`var(--menu-active-fg)` to that nav item's computed color set, which `src/lib/audit/norms.ts`'s
`nav-item` color role now observes. `npm run norms:generate` regenerated
`src/lib/audit/norms-manifest.json` (one role's `expressions` array gains the one entry; no
other change), and `npm run norms:check` is green against the regenerated file. This is exactly
the class of move the plan's baseline procedure asks for: attributable to the bumped renderer,
regenerated by the documented command, read before committing.

See the DaisyUI component-inventory section below for the separate, non-version-gated
question of whether cairn's home-grown components should be DaisyUI components at all.

## @lucide/svelte 1.33.0 -> 1.47.0

**Update, 2026-09-20.** Moved further, 1.45.0 to 1.47.0: two more point releases of new icon
additions only, same pattern as the range below. `npm test`'s own run of
`src/tests/unit/reproductions-icon-drift.test.ts` caught something the changelog read alone
would have missed: somewhere in 1.45.0 to 1.47.0, `@lucide/svelte` changed its generated
component shape from `const iconNode = [...]` (a bare array) to `const iconData = { name, size,
node: [...] }` (an object wrapping the same array). The test's own scraping regex hard-failed
on the new shape, its intended tripwire for exactly this kind of layout change; the fix is a
one-line regex and destructure update in the test itself, no icon path changed (verified: every
`d` value the new shape carries for the six transcribed icons is byte-identical to before).
Filed nowhere further since the test now covers the new shape going forward.

**Features to leverage.** Only new icon additions in range (mail-clock, ship-cargo, a
playing-card family, germ, virus, user-group, trash-off, calendar-chevrons-right, and more).
None map to a gap in `admin-icons.ts` or `admin-nav-icons.ts`, or replace a workaround.
Nothing to adopt.

**Practices to change.** `fix(icons): removed trash icon in favour of trash-2` (1.41.0) is a
non-event: cairn already imports `trash-2` everywhere (`admin-icons.ts:11`,
`RepeatableField.svelte:28`, `VocabularyAdmin.svelte:37`), never plain `trash`.
`fix(icons): unify check, cross and plus sizes` (1.36.0) only resizes compound icons
(`circle-check`, `square-check`, `badge-check`, `clipboard-x`, `volume-x`, `copy-x`,
`git-pull-request-closed`, `clock-check`, `mail-x`, `spell-check`), none of which cairn
imports; the standalone `check`, `x`, and `plus` glyphs cairn does use
(`admin-icons.ts:23,25,7`) are untouched per the upstream PR description.

**Risks in the bump.** `src/tests/unit/reproductions-icon-drift.test.ts` hard-fails if any of
cairn's six transcribed toolbar icons (`blocks`, `square-pen`, `link`, `file-symlink`,
`image`, `sparkles`) get a path redraw between these versions. None of the six appear in any
`fix(icons): changed <name>` entry across 1.34.0 to 1.45.0 (the redraws hit `ghost`, `swords`,
`shopping-cart`, `beef`, `panda`, `blend`, `key`, `square-split-vertical`, `asterisk`,
`computer`, `table-2`, `id-card`, `id-card-lanyard`, `door-open`, `satellite-dish`, `leaf`,
`album`/`book-marked`/`folder-bookmark`, `cookie`, `lectern`, and a `swiss-franc`
deprecation). Low risk; run the drift test, which is the correct tripwire for this range.

## @codemirror/view 6.43.9 -> 6.43.12, @codemirror/state 6.7.1 -> 6.7.5, @codemirror/commands 6.11.0 -> 6.11.1

**Update, 2026-09-20.** Now verifiable directly: this sweep's own `npm install` populated
`node_modules/@codemirror/{view,state,commands}/CHANGELOG.md` with every entry through the new
target versions, closing the gap the 2026-09-13 entry below flagged.

- `@codemirror/view` 6.43.10 through 6.43.12: highlighted-space rendering during composition,
  scroll-position stability under CSS scaling, `visualLineSide` bidi handling, a duplicate-DOM-
  node fix for marks around an active composition, a Firefox composition-outside-line-container
  workaround, and a VoiceOver repeated-announcement fix. All browser-specific edge cases; none
  touches `EditorView`'s public API or an extension cairn loads.
- `@codemirror/state` 6.7.2 through 6.7.5: four range-set/range-mapping bug fixes (ordering
  violations, point-range sort order, a range-set comparison causing spurious redraws). Internal
  to `EditorState`'s change-mapping machinery; no public API change.
- `@codemirror/commands` 6.11.0 to 6.11.1: makes `cursorLineEnd`/`cursorLineStart` bidi-aware via
  `moveToLineBoundary`. `MarkdownEditor` uses the default keymap without overriding either
  command; low risk, and this is a correctness fix, not a behavior cairn depends on differently.

Nothing in cairn's `MarkdownEditor` usage (`EditorView`, `EditorState`, the specific extensions
loaded) depends on any patch behavior found. The original 2026-09-13 finding below (not fully
verifiable from primary sources) is superseded by the direct read above.

## playwright / @playwright/test 1.62.1 -> 1.63.0

**Update, 2026-09-20.** Still the target; nothing newer in range. Findings below still accurate.

**Features to leverage.** Nothing directly usable. Test locks (`test('...', {lock: 'x'})`)
would be a narrower version of what `examples/showcase/playwright.config.ts:14` already does
globally (`workers: 1, fullyParallel: false`, forced because of shared dev-backend state).
`locator.visible()` is a nicer form of a `:visible` CSS pseudo-class cairn doesn't currently
use anywhere in `examples/showcase/e2e/*.ts`. The new `omitTags` reporter option and the
`perfetto` reporter are unused surface.

**Practices to change.** None forced. No config in `playwright.config.ts` touches
`trace.snapshots`, `httpCredentials`, or `opfs`.

**Risks in the bump.** Low. Nothing in the changelog touches screenshot comparison, pixel
diffing, or `toHaveScreenshot` defaults, so this repo's documented CI-canonical baseline
problem (`playwright.config.ts:1-12`, `maxDiffPixels: 120`) is untouched. The experimental
`@playwright/experimental-ct-react*` packages are frozen upstream, but cairn doesn't use
component testing. Safe bump.

## eslint 10.9.0 -> 10.11.0

Nothing for cairn in the originally surveyed range. The three feature items (`new-cap`
Object.prototype check, `no-extra-bind` class-fields case, `d`/`v` regex flags in
`no-unexpected-multiline`) are all targeted fixes/extensions to built-in rules
`eslint.config.js` never enables. No default-severity or flat-config-shape change. The
`file-entry-cache` dependency bump is internal caching with no observable effect. Safe bump.

**Update, 2026-09-20.** Moved one further minor, 10.10.0 to 10.11.0. Not separately verified
this pass beyond `npm run lint` and `npm run check:comments` staying green in the full gate,
which is the correct tripwire for an unreviewed ESLint core bump on a flat config with no custom
rule additions in range.

## typescript-eslint 8.67.0 -> 8.70.0

**Update, 2026-09-20.** Still the target; nothing newer in range. Findings below still accurate.

Nothing for cairn. `eslint.config.js` uses `tseslint.parser` only
(`eslint.config.js:3,46,85`), never any `typescript-eslint` rule set: confirmed no
`tseslint.configs.*` recommended set is spread into this repo's config. `no-misused-promises`,
`no-mixed-enums`, `member-ordering`, `no-deprecated`, and `no-generated-empty-object-type` are
all unused rules. The `no-deprecated` fix (8.70.0), the `no-unnecessary-condition` fix, and the
`project-service` tsserver-log fix affect rules or diagnostics cairn doesn't enable. Safe bump.

## eslint-plugin-jsdoc 64.2.1 -> 64.5.4

Nothing for cairn in the originally surveyed range, despite the wide-looking span. 64.3.0 adds
an opt-in rule `no-unnecessary-type-assertion` for `@type` casts, but it defaults to `'off'` in
the plugin's own source and is not part of `jsdoc.configs['flat/recommended-typescript-error']`,
the preset `eslint.config.js:43` imports wholesale: so it doesn't land in cairn's gate even
though cairn's own `jsdoc/no-types: 'error'` rule (`eslint.config.js:52`) already forbids
`@type` casts by a different route. No release in the range touches `informative-docs`,
`require-jsdoc`, `no-types`, `check-tag-names`, or `check-param-names`: the five rules cairn
actually configures (`eslint.config.js:51-57`). Safe bump.

**Update, 2026-09-20.** Moved further, 64.3.10 to 64.5.4. Same five configured rules stay
untouched across the added range; `npm run check:comments` in the full gate is this bump's
correct tripwire and it stays green.

## eslint-plugin-tsdoc 0.5.2 -> 0.5.3 (new this update, 2026-09-20)

Single patch: declares `eslint` as an optional peer dependency so its published typings resolve
against the consumer's own ESLint under a non-hoisted installer. No rule behavior change;
`check:comments` stays the tripwire. Safe bump.

## postcss 8.5.26 -> 8.5.28 (new this update, 2026-09-20)

Not separately changelog-verified this pass (no bundled `CHANGELOG.md` and no reachable raw
source); the range is two patches on a widely-depended transitive build tool with no config
surface `tailwindcss`/`@tailwindcss/postcss` or `postcss-prefix-selector` exposes to cairn
directly. The full gate's CSS build steps (`check:package`, `check:admin-css-classes`,
`check:public-tokens`) are the correct tripwire and they stay green.

## @types/node 24.13.3 -> 24.13.6 (new this update, 2026-09-20)

Three patches of `Node.js` 24 LTS type-definition corrections (the held major is `@types/node`
26, tracking the same trigger as the other two held majors below). Type-only package; `npm run
check` (svelte-check, 0/0) is the tripwire and it stays green.

## @anthropic-ai/sdk 0.120.0 -> 0.127.0

**Update, 2026-09-20.** Moved two further minors, 0.125.0 to 0.127.0: Managed Agents auto-mode
tool permissions, a compaction/signed-compaction-blocks beta, workspace data-residency and
`workspace_id` additions, a `compactBeforeNextTurn()` tool-runner helper, and several retry/
Retry-After and streaming edge-case fixes. None of it reaches a bare `messages.create()` call
with no tools, agents, compaction, or streaming. One fix worth naming: 0.127.0 stops retrying a
request whose body is a stream or iterator; cairn's call sends a plain JSON body, not a stream,
so this changes nothing here. The 0.122.0 `DOMException` finding below is unaffected and still
the one substantive behavior change in the whole surveyed range.

Cairn's usage is narrow: a single non-streaming `messages.create()` call per Tidy action in
`src/lib/sveltekit/content-routes-context.ts` and `content-routes-tidy.ts`, no tool use, no
Files/Skills, no Managed Agents. The SDK is dynamically imported as an optional peer and cast
to a narrow local `AnthropicWireClient` interface (`content-routes-context.ts:76-97`) so
vendor-shape changes stay contained.

**Features to leverage.** None of the range's feature work (Managed Agents, Organization API,
user profiles, Files/Skills GA-shape changes, tool-runner `pause_turn` continuation fixes)
applies to a bare `messages.create` call with no tools, agents, or files.

**Practices to change.** None required; the Files/Skills beta-shape change (0.122.0) doesn't
reach cairn, since it never imports `client.beta.files` or `.skills`.

**Risks/upside in the bump.** 0.122.0 fixes cross-realm `DOMException` abort/timeout
classification in `castToError` (commit `1bd6395`) so an aborted-fetch `DOMException` from a
different realm (undici/workerd vs. the calling realm: exactly a Cloudflare Workers-shaped
concern) now wraps into a real `Error` with `name: 'AbortError'` instead of failing
`instanceof Error`. Cairn's own abort classification at `content-routes-tidy.ts:229` (`err
instanceof Error && err.name === 'AbortError'`) depends on exactly that wrapping to route a
deadline/abort to `reason: 'abort'` instead of the generic `'model'` bucket. This is a genuine
upside on Workers, not a risk, and the one substantive behavior change in range.

## @clack/prompts 1.7.0 -> 1.8.1

**Update, 2026-09-20.** Still the target; nothing newer in range. Findings below still accurate.

Cairn's usage in `packages/create-cairn-site` is `intro`, `outro`, `text`, `password`,
`confirm`, `select`, `isCancel`, `cancel`. No `spinner`, `multiselect`, `group`, `log`,
`note`, or `autocomplete`.

**Features to leverage.** 1.8.0 adds async validation support to prompts, with validation
state rendered directly on `text` prompts. `packages/create-cairn-site/src/cloudflare/prefill.mjs:265-289`
(`ensureApiToken`) manually reimplements this today: it prompts with `password()`, then
`await`s a separate `validateToken(pasted, scope)` round-trip against the live Cloudflare API,
and on failure logs a message and re-prompts once by hand. With 1.8.0's async `validate`
callback this could become a single `password` call with `validate: async (v) => (await
validateToken(v, scope)).ok ? undefined : 'That token did not work; check it and paste it
again.'`, with clack rendering the in-progress/failed state itself, replacing the manual
first-try/second-try structure. Caveat: cairn deliberately caps the retry at exactly one (a
token that fails twice needs a new permission, not more re-prompting), so this needs an
explicit attempt counter to preserve that ceiling: a possible simplification, not a drop-in
win.

**Practices to change / risks.** None; both 1.8.0 and 1.8.1 are additive or patch-only, and
1.8.1 only corrects the `CANCEL_SYMBOL` return type.

## devalue 5.9.1 -> 5.9.4 (new this update, 2026-09-20; superseded "nothing to act on" below)

This range moved for real since 2026-09-13: `devalue` had published 5.9.2 through 5.9.4 in the
interim, so the caret range now resolves further than "already satisfied." Verified directly
against `sveltejs/devalue`'s `CHANGELOG.md`. Three patches carry genuine security-relevant
fixes, not routine bug fixes: 5.9.2 rejects out-of-bounds indices; 5.9.3 rejects non-string
null-prototype object keys in `parse`/`unflatten` (closing a `__proto__`-check bypass) and
serializes only the visible bytes of a Node `Buffer` in `stringify`/`stringifyAsync`/`uneval`
(closing a disclosure of unrelated data from a shared allocation pool); 5.9.4 is a pure
tree-shaking annotation with no behavior change. SvelteKit uses `devalue` internally to
serialize `load` return data across the server/client boundary, which is exactly the path a
cairn site's own load functions (and `createContentRoutes`'/`createCairnAdmin`'s) run through,
so the buffer-disclosure and prototype-bypass fixes are a genuine hardening win on the exact
serialization path cairn depends on, not merely a version bump. No code change required; this
belongs in the CHANGELOG's `Dependencies` entry as security-relevant, not "no consumer action."

**Practices to change.** None; no changed default or removed API in range.

**Risks in the bump.** None found; every 5.9.x release is additive or a fix, no API-shape
change to `stringify`/`parse`/`uneval`/`unflatten`, the four entry points SvelteKit's own
internals call.

## Patch-only packages (skim)

- **postcss-prefix-selector** 2.1.1 -> 2.2.1: no bundled changelog; not independently verified
  beyond the 2026-09-13 finding. Nothing found suggesting a behavior change relevant to cairn's
  CSS scoping use; `check:admin-css-classes` in the full gate is the tripwire and stays green.
- **esbuild** 0.28.1 -> 0.28.2 (new this update, 2026-09-20): verified directly against
  `evanw/esbuild`'s `CHANGELOG.md`. Two fixes: a tree-shaking bug for a TypeScript `import ... =
  Base.SomeType` alias, and a CSS-minifier bug that incorrectly removed a `&` nesting selector
  under `--minify`. Cairn's build uses esbuild inside `svelte-package`/`transpile-dist-svelte.mjs`
  for JS transpilation, not CSS minification, and `src/lib` uses no TypeScript import-equals
  aliasing. Safe bump.
- **tsx** 4.23.12 -> 4.23.15 (new this update, 2026-09-20): not independently changelog-verified
  (no bundled `CHANGELOG.md`, no reachable raw source this pass); three patches on a dev-only
  loader used by `scripts/build/*.mjs` and test tooling. The full gate exercising every script
  that shells to `tsx` is the tripwire.
- **yaml** 2.9.0 -> 2.9.1 (new this update, 2026-09-20): single patch, not independently
  changelog-verified this pass; `gray-matter`'s frontmatter parsing (via `js-yaml`, a separate
  package) doesn't route through this `yaml` dependency, which cairn's own `dependencies` list
  declares directly for a narrower use. Low risk given the single-patch range.

## Audit-fix findings, 2026-09-20 (new this update)

`npm audit` at the root, before and after the sweep, plus in `examples/showcase`. Before: 8
advisories at the root (2 low, 6 high), 6 in the showcase (3 low, 3 high). After the sweep's
fresh reinstall (delete `node_modules` and both lockfiles, reinstall root then showcase, no
manifest range change beyond what the sweep already took): 6 at the root (2 low, 4 high), 3 in
the showcase (all low).

- **`fast-uri` (root, transitive via `eslint-plugin-tsdoc` -> `@microsoft/tsdoc-config` ->
  ajv).** Fixed by the fresh reinstall alone, no manifest edit. `ajv`'s own dependency range
  (`^3.0.1`) already admits `3.1.8`, a patch beyond the vulnerable `3.0.0-3.1.5` band; the old
  lockfile had pinned `3.1.5`. Confirmed: `fast-uri` reads `3.1.8` in the regenerated lockfile.
- **`js-yaml` (root, transitive via `gray-matter`).** Same pattern: `gray-matter`'s own
  dependency range (`^3.13.1`) already admits `3.15.2`, a patch beyond the vulnerable
  `3.0.0-3.15.1` band. Confirmed: `js-yaml` reads `3.15.2` in the regenerated lockfile.
- **`cookie` under `@sveltejs/kit@2.70.3` (root and showcase). HELD, major.** `npm audit fix`
  offers only `--force`, and would install `@sveltejs/kit@0.0.30`, a downgrade far below the
  `^2.70` peer range: this is the ruling-2 "needs `--force`, or downgrades to clear an
  advisory" case, held the same as a major. `2.70.3` is already the newest version satisfying
  `^2.70` (verified via `npm view @sveltejs/kit@latest`), so this cannot resolve within the
  current peer range; it needs either an `@sveltejs/kit` patch release that bumps its own
  `cookie` dependency past `0.7.0` inside the `2.70.x` line, or the peer range moving to a kit
  major, which is its own held decision. **Trigger:** re-check `npm audit` after any future
  `@sveltejs/kit` patch release, or when the peer range next moves.
- **`sharp` under `@cloudflare/vitest-pool-workers@0.22.0`'s own nested `miniflare` (root
  only). HELD, major.** `npm audit fix` offers only `--force`, and would install
  `@cloudflare/vitest-pool-workers@0.8.30`, a downgrade below the installed `0.22.0` (the
  highest version that package has ever published, per `npm view` versions). The sweep's own
  `wrangler` bump (4.125.0 to 4.135.0) resolves the *showcase's* copy of this same advisory,
  because the showcase has no `@cloudflare/vitest-pool-workers` dependency and its `wrangler`
  now pulls a `miniflare` carrying `sharp@0.35.4`; the root keeps a second, separate nested
  `miniflare` under `@cloudflare/vitest-pool-workers` that does not move with `wrangler`.
  **Trigger:** re-check `npm audit` at the root after any future `@cloudflare/vitest-pool-workers`
  release above `0.22.0`.

---

## DaisyUI component inventory: home-grown vs. stock (not version-gated)

Per Geoff's direct instruction, this section grades every home-grown admin component/recipe
against the full current DaisyUI 5 component set as it stands today (verified live against
daisyui.com/components), independent of the 5.7.20-5.7.37 range above. Existing DaisyUI usage
in `src/lib` is already broad: `btn` (527 call sites), `card` (189), `modal` (62), `alert`
(59), `loading` (33), `menu` (18), `select` (18), `badge` (17), `checkbox` (16), `table` (12),
`kbd` (10), `dropdown` (8, styling only), `join` (7), `textarea` (6), `drawer` (5), `divider`
(4), `avatar` (2), `status` (2), `fieldset` (2), `breadcrumbs` (1), `steps` (1), `toggle` (1),
`range` (1), `filter` (1).

Ranked, most valuable first:

1. **Nav collapsible groups: adopt `collapse`/`accordion` over raw `<details>`.** The
   documented nav-group recipe (`admin-design-system.md:369-374`) is a `<details>` element
   with a custom `.cairn-caret` chevron, functionally identical to DaisyUI 5's
   `collapse`/`collapse-arrow` (also `<details>`-backed). DaisyUI covers this fully; the only
   gap is cosmetic CSS (cairn's own rotate-on-open rule versus DaisyUI's built-in arrow). The
   swap touches nav markup and classes in `src/lib/components/CairnAdminShell.svelte`. Since
   the recipe is documented, a consumer site that scoped-overrode `.cairn-caret` would need a
   `Consumers must:` line. Low urgency, real but small win. This is the one genuine "should
   have been DaisyUI all along" candidate found.

2. **`cairn-btn-guarded` (pointer-events restore): a still-current DaisyUI defect, not a
   stale workaround.** DaisyUI 5.6 added `[aria-disabled="true"]` to `.btn`'s disabled
   selector with `pointer-events: none` (`admin-design-system.md:864-869,1580`), which kills
   the `title` tooltip on a control that must stay perceivable-but-refused (Publish with
   nothing to publish, a disabled Figure button). Cairn's unlayered override restoring
   `pointer-events` compensates. The live DaisyUI docs show no change here as of 5.7.37: the
   defect still holds and the home-grown patch should stay.

3. **Tooltip: native `title` versus `daisyui tooltip`.** DaisyUI's tooltip component is
   CSS-only (`.tooltip` plus `data-tip`), hover-triggered, with no documented keyboard-focus or
   touch support (verified against daisyui.com/components/tooltip directly).
   `StatusChip.svelte:78-83` states cairn's reasoning explicitly: native `title` works on
   hover, keyboard, and touch, and avoids the pointer-events issue above. This is a real,
   current accessibility gap in DaisyUI's tooltip, not inertia. Keep native `title`.

4. **Toast: always-mounted status regions versus `daisyui toast`.** DaisyUI ships a
   fixed-position toast stack that mounts and unmounts per message. Cairn instead keeps status
   regions always mounted and swaps their text in place (the "Busy idiom,"
   `admin-design-system.md:556-570`; the needs-alt notice at `:836-841`; Tidy's two live
   regions at `:976-979`), with the documented reason that a mount/unmount toast risks a
   screen reader missing the announcement. Deliberate, correct rejection with a stated
   accessibility rationale. Keep.

5. **Popover menus: `popovertarget`/`anchor-name` versus `daisyui .dropdown`.** Cairn
   explicitly ruled against DaisyUI's focus-driven `.dropdown` wrapper: it "opens on
   focus-in-transit and ignores Escape" (`admin-design-system.md:526-531`): and rebuilt menus
   on the Popover API, reusing `dropdown menu` classes only for styling (hence the 8 grep
   hits, which are class reuse, not the old interaction model). DaisyUI's own docs still show
   the classic focus-driven pattern as default; the behavior cairn ruled against is unchanged
   upstream. Keep.

6. **`StatusChip` versus raw `badge-outline`/`badge-ghost`.** The component's own doc comment
   states the defect precisely: `badge-outline` "compiles to an explicit background and border
   color that can match one of AdminTable's own zebra stripe colors," so a ghost chip melts
   into the row. `docs/internal/engine-rulings.md:5019` independently names "badge-ghost and a
   bare `.dropdown`" as refuted defaults across the whole cairn family (the badge-tier ruling,
   closed 2026-09-01, `engine-rulings.md:2995`). This is a structural color-value issue, not a
   per-version bug, so it still holds at 5.7.37. Cairn already draws the line correctly: raw
   DaisyUI badges (`badge-error`, `badge-success`, `badge-soft`, `badge-outline`, `badge-dash`)
   are safelisted for stock surfaces; `StatusChip` is reserved for the register grammar. No
   change needed.

7. **`Pagination`: already matches DaisyUI's own pattern, no gap exists.** DaisyUI ships no
   dedicated pagination class; its own docs (daisyui.com/components/pagination) build
   pagination from `join` + `btn` + `btn-active`. `src/lib/admin-toolkit/Pagination.svelte`
   already does exactly this, adding only the range line and page-size `select` in scoped CSS
   because `/admin/**` loads only the precompiled sheet. This closes a plausible false lead:
   there is nothing to adopt here.

8. **Segmented-control contrast (`btn-active` on dark): a still-current, measured DaisyUI
   defect.** For the join-style pickers (`ListToolbar`'s facet, `Pagination`, the editor's
   Write/Preview capsule), cairn documents a measured defect: "on dark, a lightened
   `.btn-active` fill measures only 1.14:1 against an unselected sibling"
   (`admin-design-system.md:603-611`), patched with a pinned hairline ring. This is a
   color-token issue in DaisyUI's theme construction, unaffected by point-release bumps unless
   the theme engine itself changes. Keep the patch.

9. **`DeleteDialog`: already fully DaisyUI-native.** `DeleteDialog.svelte:69-72` is a native
   `<dialog class="modal">` with `.modal-box`, the documented Dialog recipe exactly. No
   home-grown alternative exists here; cited only to close a false lead in the brief.

**Bottom line for this section:** every cairn divergence from stock DaisyUI (tooltip, toast,
dropdown interaction, `StatusChip`, `btn-active` contrast, guarded-disabled buttons) traces to
a specific, still-current documented defect or accessibility gap in the design-system doc or
the rulings ledger, not to inertia or a stale workaround. The one real "adopt more DaisyUI"
opportunity is the nav `<details>` groups toward `collapse`/`accordion`, and it is
cosmetic-value only.

---

## Held majors, with unblock triggers (2026-09-20)

| Package | Held at | Major | Trigger |
| --- | --- | --- | --- |
| `typescript` | `^6.0.3` | `7.0.2` | `svelte-check --tsgo` runs green (`tsgo.yml` checks weekly). Carried from `docs/STATUS.md`. |
| `vitest`, `@vitest/browser`, `@vitest/browser-playwright` | `^4.1` / `^4.1.7` | `5.0.1` | `@cloudflare/vitest-pool-workers` (currently `0.22.0`) declares a peer `vitest: ^4.1.0`; re-check when that package publishes a release supporting Vitest 5. |
| `@types/node` | `^24.13.6` | `26.6.2` | Tracks the engine floor: "Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026)" (`docs/STATUS.md`, Open decisions). |
| `devalue` (new this sweep) | `^5.9.4` | `6.0.0` | `devalue` is a transitive/dev-tooling dependency, not a direct `src/lib` import; 6.0.0 requires Node ≥22.17 (already satisfied) but changes the custom-object `uneval` replacer API from nested `uneval` calls to a tagged template `js`, which is a breaking API shape change for any caller of that specific API. Re-check when a `devalue`-consuming toolchain (SvelteKit's own internal pin, or `svelte-check`) requires 6.x, since cairn has no direct call site to migrate today. |

Two `npm audit` findings are held the same way (needs `--force`, or downgrades to clear the
advisory); see the "Audit-fix findings" section above for the `cookie`/`@sveltejs/kit` and
`sharp`/`@cloudflare/vitest-pool-workers` entries and their triggers.

## Refactor-decision table (ruling 3: default "file"; every item below is filed, none taken)

| Capability | Code that hand-rolls it | Ruling |
| --- | --- | --- |
| `<select>` default-selection via per-option `selected={...}` | `src/lib/components/ManageEditors.svelte:169-174` | File. Svelte 5.57's `defaultValue` on `<select>` replaces the per-iteration boolean; small, optional, no existing test targets this exact simplification. |
| Imperative DOM-property indeterminate checkbox with no ARIA mirror | `src/lib/components/MediaOrphanTools.svelte:55-79` | File. DaisyUI 5.7.25 added native `aria-checked="mixed"` styling; the DOM-property approach still works, so this is a future nice-to-have, not a defect. |
| Manual two-try Cloudflare token prompt (`password()` plus a hand-rolled retry) | `packages/create-cairn-site/src/cloudflare/prefill.mjs:265-289` | File. `@clack/prompts` 1.8.0's async `validate` callback could replace the manual structure, but preserving the deliberate one-retry ceiling needs an explicit attempt counter: not a drop-in, so it does not qualify as the zero-behavior-change take-now case. |
| Manual `btn-active` class alongside `aria-current="page"` | `src/lib/admin-toolkit/Pagination.svelte:97-101` | File. DaisyUI 5.7.38 now styles `[aria-current]` as `btn-active` natively, making the manual class redundant; removing it needs a visual-baseline read to confirm pixel parity, which belongs in a reviewed pass, not a dependency sweep. |
| Hand-authored nav-group `<details>` with a custom `.cairn-caret` chevron | `src/lib/components/CairnAdminShell.svelte`, documented at `admin-design-system.md:369-374` | File (already flagged in the 2026-09-13 DaisyUI inventory below as the one genuine "should have been DaisyUI" candidate). DaisyUI's `collapse`/`collapse-arrow` covers this; low urgency, cosmetic-value only. |

Five filed items; no take-now item exists this sweep (nothing met the zero-behavior-change
with existing-test bar), so no formal refactoring pass is proposed. `ROADMAP.md` carries a line
for each, in the tier where it bites.

## Top five for Geoff, ranked

1. Simplify the Cloudflare token prompt in `packages/create-cairn-site` using
   `@clack/prompts` 1.8.0's async `validate`, replacing the manual two-try structure in
   `prefill.mjs:265-289` (keep the one-retry ceiling with an explicit counter).
2. Re-run the component and e2e suite against the three static-`value` `<select>` sites
   (`ListToolbar.svelte:364,393`, `Pagination.svelte:74`) and the static-`value` `<textarea>`
   in `ComponentForm.svelte:330-342` after the Svelte 5.57.0 bump; two compiler-codegen fixes
   land exactly on those shapes.
3. Note the Workers-relevant `DOMException` abort-classification fix in
   `@anthropic-ai/sdk` 0.122.0: it makes cairn's existing abort routing at
   `content-routes-tidy.ts:229` more correct on Cloudflare, no code change required, just
   awareness.
4. **Resolved, 2026-09-20:** the CodeMirror `@codemirror/view`/`@codemirror/state`/
   `@codemirror/commands` patch notes are now confirmed directly from the installed
   `CHANGELOG.md` files (see the CodeMirror section above); every entry is a browser-specific
   or internal range-mapping bug fix with no cairn call-site exposure.
5. After the DaisyUI bump, check the checkbox, badge, `loading-sm`, disabled-input, and
   Pagination's `aria-current` button visual/e2e baselines specifically (5.7.35 through 5.7.42
   change their pixel rendering, and 5.7.38's native `[aria-current]` styling makes
   `Pagination.svelte`'s manual `btn-active` class redundant, filed above); separately, the nav
   `<details>` groups toward `collapse`/`accordion` are the one DaisyUI component-adoption
   opportunity worth a future small pass, unrelated to this version range.

   **Checked, 2026-09-21, full showcase e2e run (`CI=1 npm --prefix examples/showcase run
   test:e2e`, 262 tests, 242 passed, 20 failed, 0 flaky):**
   - Checkbox: `src/tests/component/field-input.test.ts` (orphan-flag and plain vocabulary
     checkboxes), `src/tests/component/CairnMediaLibrary.test.ts` (orphaned-files select-all and
     row checkboxes), `src/tests/component/AdminTable.test.ts` (row-selection checkboxes). All
     passed.
   - Badge: `src/tests/component/StatusChip.test.ts`,
     `src/tests/unit/badge-tier-legibility.test.ts`,
     `src/tests/unit/status-chip-register-parity.test.ts`,
     `src/tests/unit/status-chip-register-tuning.test.ts`. All passed.
   - `loading-sm`: `src/tests/component/EditPage.test.ts` (Save/Publish loading state),
     `src/tests/component/MediaUploadDialog.test.ts`, `src/tests/component/MediaReplaceDialog.test.ts`.
     All passed.
   - Disabled input: `src/tests/component/field-input.test.ts`,
     `src/tests/component/ComponentForm.test.ts` (disabled field states). All passed.
   - Pagination `aria-current`: `src/tests/component/Pagination.test.ts` (asserts
     `[aria-current="page"]`), `src/tests/component/ConceptList.test.ts` (pagination
     integration). All passed.
   - Visual/e2e baselines covering these surfaces (`admin-visual.spec.ts`, `site-visual.spec.ts`
     archive pages): every failure in this run was confined to the 20
     `site-home-*`/`archive2-*` files the CI regen commit `4de378ec` last rewrote (this
     workstation's known Chromium anti-aliasing divergence), none of them a checkbox, badge,
     `loading-sm`, disabled-input, or Pagination surface specifically; no new baseline move
     attributable to the DaisyUI bump was observed.
6. **New, 2026-09-20:** `devalue` 5.9.2-5.9.4 carries two genuine security fixes (a
   prototype-pollution-bypass close in `parse`/`unflatten`, a shared-buffer disclosure close in
   `stringify`/`uneval`) on the exact serialization path SvelteKit's own `load` boundary uses;
   worth the CHANGELOG's `Dependencies` entry naming it as security-relevant rather than a
   routine floor move.

## Top-up, 2026-09-23 (0.97.0 cut)

Scope: the pre-cut top-up sweep for the 0.97.0 release, one range move per package listed
below. Root `package.json`: `daisyui` `^5.7.42` to `^5.7.44`, `@codemirror/state` `^6.7.5` to
`^6.7.6`, `@codemirror/view` `^6.43.12` to `^6.43.13` (both runtime `dependencies`, so the
published floors move), `@sveltejs/vite-plugin-svelte` `^7.1` to `^7.3.1`, `typescript-eslint`
`^8.70.0` to `^8.70.1`, `wrangler` `^4.135.0` to `^4.137.0`, `@cloudflare/workers-types`
`^5.20260921.1` to `^5.20260923.1`, `@anthropic-ai/sdk` devDependency `^0.127.0` to `^0.128.0`
(the `>=0.105.0 <1` peer range is untouched). `examples/showcase/package.json`: the same
`daisyui`, `@sveltejs/vite-plugin-svelte` (`^7` to `^7.3.1`), `wrangler`, and
`@cloudflare/workers-types` moves, plus `prettier` `^3.9.8` to `^3.9.9`.

Per-package finding:

- **daisyui 5.7.42 -> 5.7.44.** Both patches touch only the `status` and `avatar` components.
  The rebuilt `dist/components/cairn-admin.css` diff (378,059 bytes to 378,125 bytes) confirms
  it: the only textual change is inside the `.status` rule block (a `width`/`height` pair
  replaced by a `--size` custom property computed the same way), and no admin component uses
  the bare `.status` class (only `avatar avatar-placeholder`, unaffected). Shipped CSS is
  unchanged in every way that reaches the admin; no `Consumers must:` line needed.
- **@codemirror/state 6.7.6.** A `changeByRange` cursor-mapping fix. `MarkdownEditor.svelte`
  does not call `changeByRange` directly; unused.
- **@codemirror/view 6.43.13.** A `coordsAtPos` bidirectional-text edge-case fix, and the
  deprecated `visualLineSide` option (unused here). `MarkdownEditor.svelte:1199` calls
  `coordsAtPos` for the caret-anchored insert popover; re-tested below.
- **wrangler 4.137.0.** A local-only D1 statement-splitting fix in `wrangler d1 execute`; the
  gate never runs that command, using `vite preview` for the showcase instead. No exposure.
- **@anthropic-ai/sdk 0.128.0.** No breaking change against cairn's single call site
  (`messages.create()`); the devDependency floor moves, the peer range does not.
- **prettier 3.9.9 (showcase only).** A markdown `$` character parsing fix. The showcase's
  format check is re-run below to confirm no reformatting.

Refactor decision: nothing to take, nothing newly filed. Every finding above is either a
no-op for cairn's call sites or a confirmed-unchanged shipped artifact; the existing
refactor-decision table above is unaffected.

Held majors, unchanged, same triggers as the 2026-09-20 update: `typescript` at `^6.0.3`
(waiting on `tsgo` going green), `vitest`/`@vitest/browser`/`@vitest/browser-playwright` at
`^4.1`/`^4.1.7` (waiting on `@cloudflare/vitest-pool-workers` supporting Vitest 5),
`@types/node` at `^24.13.6` (tracks the engine floor decision in `docs/STATUS.md`), and
`devalue` at `^5.9.4` (waiting on a `devalue`-consuming toolchain requiring 6.x).
