# Minor and patch bump survey, pre-release

Scope: the pending minor/patch bumps listed for the next cairn-cms release, judged against
actual usage in this repo (not hypothetical usage). Per-package sections carry features to
leverage, practices to change, and risks in the bump. A separate section covers the DaisyUI
component inventory Geoff asked for directly. A ranked top five closes the document.

## svelte 5.56.10 -> 5.57.0

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

Nothing for cairn in this range: 3.0.0...3.1.0. The entire changelog is "add license and
support vitest 5" (widens the `vitest` peer range to include `^5`). Cairn pins `vitest:
"^4.1"` in both `package.json:276` and `examples/showcase/package.json:46`, so this bump only
unblocks a future vitest-5 migration; it has no effect today.

## wrangler 4.125.0 -> 4.131.1

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

## @cloudflare/workers-types 5.20260821.1 -> 5.20260911.1

Nothing for cairn in this range. Diffed `index.d.ts` directly (17,240 to 17,556 lines): zero
hits for `D1`, `EmailMessage`, or `R2Bucket` in either direction, so the binding types cairn
actually uses are unchanged. The diff is almost entirely new Workers AI model type
declarations, small DOM-lib polyfill widenings, and Containers/tracing additions: none of
which any code under `src/lib` touches (no Workers AI binding, no Container binding, no
tracing API calls).

## daisyui 5.7.20 -> 5.7.37

All 17 releases in this exact range are single-bug-fix patches (checkbox, badge, loading
spinner, OTP, dropdown/toast RTL, tooltip font-weight, breadcrumbs, join, skeleton, menu,
floating-label, FAB, text-rotate). None touch card, btn, input, modal, tab, select, or drawer,
the classes cairn leans on most.

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

**Risks in the bump.** Check the checkbox, badge, and `loading-sm` visual/e2e baselines
specifically after bumping; the other 14 patches (OTP, RTL dropdown/toast, breadcrumbs, join,
skeleton, menu, floating-label, FAB, text-rotate) touch surfaces cairn doesn't use.

See the DaisyUI component-inventory section below for the separate, non-version-gated
question of whether cairn's home-grown components should be DaisyUI components at all.

## @lucide/svelte 1.33.0 -> 1.45.0

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

## @codemirror/view 6.43.9 -> 6.43.11, @codemirror/state 6.7.1 -> 6.7.4

Not fully verifiable from primary sources this pass: the installed
`node_modules/@codemirror/view/CHANGELOG.md` and `.../state/CHANGELOG.md` reflect only the
currently installed versions (6.43.9, 6.7.1), and fetching GitHub's rendered CHANGELOG.md for
the newer entries did not return raw content. Every prior point release in this changelog is a
narrow browser-specific bug fix (scroll position, `posAtCoords`, IME composition, tile-tree
corruction), so the pattern suggests more of the same, but this is not confirmed. Nothing in
cairn's `MarkdownEditor` usage (`EditorView`, `EditorState`, the specific extensions loaded)
depends on any patch behavior found so far. Re-check the changelog directly after bumping
rather than treating this as cleared.

## playwright / @playwright/test 1.62.1 -> 1.63.0

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

## eslint 10.9.0 -> 10.10.0

Nothing for cairn. The three feature items (`new-cap` Object.prototype check, `no-extra-bind`
class-fields case, `d`/`v` regex flags in `no-unexpected-multiline`) are all targeted
fixes/extensions to built-in rules `eslint.config.js` never enables. No default-severity or
flat-config-shape change. The `file-entry-cache` dependency bump is internal caching with no
observable effect. Safe bump.

## typescript-eslint 8.67.0 -> 8.70.0

Nothing for cairn. `eslint.config.js` uses `tseslint.parser` only
(`eslint.config.js:3,46,85`), never any `typescript-eslint` rule set: confirmed no
`tseslint.configs.*` recommended set is spread into this repo's config. `no-misused-promises`,
`no-mixed-enums`, `member-ordering`, `no-deprecated`, and `no-generated-empty-object-type` are
all unused rules. The `no-deprecated` fix (8.70.0), the `no-unnecessary-condition` fix, and the
`project-service` tsserver-log fix affect rules or diagnostics cairn doesn't enable. Safe bump.

## eslint-plugin-jsdoc 64.2.1 -> 64.3.10

Nothing for cairn, despite the wide-looking range. 64.3.0 adds an opt-in rule
`no-unnecessary-type-assertion` for `@type` casts, but it defaults to `'off'` in the plugin's
own source and is not part of `jsdoc.configs['flat/recommended-typescript-error']`, the preset
`eslint.config.js:43` imports wholesale: so it doesn't land in cairn's gate even though
cairn's own `jsdoc/no-types: 'error'` rule (`eslint.config.js:52`) already forbids `@type`
casts by a different route. No release in the range touches `informative-docs`,
`require-jsdoc`, `no-types`, `check-tag-names`, or `check-param-names`: the five rules cairn
actually configures (`eslint.config.js:51-57`). Safe bump.

## @anthropic-ai/sdk 0.120.0 -> 0.125.0

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

## Patch-only packages (skim)

- **postcss-prefix-selector** 2.1.1 -> 2.2.1: no bundled changelog; installed version is still
  2.1.1. Nothing found suggesting a behavior change relevant to cairn's CSS scoping use.
- **devalue, esbuild, tsx, yaml**: all four are already satisfied at their latest patch by the
  existing `^` ranges in `package.json` (devalue `^5.8.1` installed `5.9.1`, esbuild `^0.28.1`
  installed `0.28.1`, tsx `^4.23.11` installed `4.23.12`, yaml `^2` installed `2.9.0`). Nothing
  to act on.

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
4. Confirm the CodeMirror `@codemirror/view`/`@codemirror/state` patch notes directly from
   upstream before or right after bumping; this pass could not verify the exact range from a
   changelog and it is the one package left unconfirmed rather than cleared.
5. After the DaisyUI bump, check the checkbox, badge, and `loading-sm` visual/e2e baselines
   specifically (5.7.35 and 5.7.36 change their pixel rendering); separately, the nav
   `<details>` groups toward `collapse`/`accordion` are the one DaisyUI component-adoption
   opportunity worth a future small pass, unrelated to this version range.
