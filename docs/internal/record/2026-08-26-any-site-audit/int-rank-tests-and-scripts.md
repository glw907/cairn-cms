# Internals audit: `src/tests` and `scripts/` (cairn-cms, main @ 0406f1d5)

Scope audited: 442 `*.test.ts` files (~79,700 lines) across three vitest projects plus
`src/tests/lab`, 13 `_*.svelte` harnesses, 8 shared `_*` helper modules, and 40 `.mjs` files
(~9,600 lines) under `scripts/{checks,build,lab}` plus the two shared roots
`scripts/repo-root.mjs` and `scripts/walk-files.mjs`. Judged against `docs/internal/code-idioms.md`
(especially T1-T6, N4, N6, M2), the TSDoc comment standard in `CLAUDE.md` "Authoring",
`CONTRIBUTING.md`'s repository map, and the three directives (idiomatic SvelteKit 2 / Svelte 5;
inviting to a new developer; extensible by an AI agent).

## State of the area

This is a strong test-and-gate estate carrying a small number of structural defects that are
disproportionately expensive against the two comprehension directives. The strengths are real and
worth naming: gate scripts decompose into pure exported functions driven by `src/tests/unit/check-*.test.ts`
rather than by shelling out (`diffSurface`, `checkReadiness`, `scanDocument`, `scopeReport`); the
shared harnesses (`_content-harness.ts`, `_auth-harness.ts`, `_github-double.ts`) are well-shaped and
carry genuine orientation headers; the `$app/*` stubs are honest about how they diverge from the real
modules; the Svelte 5 idiom inside the 13 `.svelte` harnesses is clean (runes throughout, `@component`
blocks, zero legacy `export let` / `on:` / store usage); and `vitest.config.ts` documents every
non-obvious knob with the failure that motivated it. Against that, four defects dominate. First, 827
`as never` casts across 89 test files discard the exact structural event and props contracts the
engine went out of its way to make checkable, and the repo already contains the counter-exemplar
that proves the typed path works. Second, there is no aggregate gate target: the authoritative list
of ~26 gates exists only inside `.github/workflows/test.yml`, which `CONTRIBUTING.md` institutionalises
("derive the list from those files rather than from prose") and which the project's own memory records
as having shipped `main` red three times. Third, the ESLint/TSDoc gate is scoped to `src/lib` alone,
leaving ~89,000 lines of tests and scripts outside every comment and lint gate. Fourth, `src/tests/unit`
is a flat 282-file directory carrying three competing filename conventions while its own `audit/`
subtree demonstrates the mirror-`src/lib` layout that would fix it. Grade: **B**. The craft per file
is high, frequently excellent; the estate-level structure is where it falls short of "inviting and
comprehensible" and "easy for an agent to extend".

---

## 1. 827 `as never` casts erase the engine's own checked event and props contracts

**Tier: refactor. Limb: multiple (comprehension + agent-extensibility).**

`src/lib/sveltekit/types.ts:64` defines `CairnEvent<Env>` and its own doc block states the point of
its existence:

> `cairnBackend` is the per-request content store the dev-backend handle injects; the engine
> resolves it ahead of the real provider, so **typing it here makes the seam a checked contract
> rather than a cast**.

The test suite then discards that contract 827 times across 89 files. The shared harness returns an
inferred object literal with no annotation:

```ts
// src/tests/unit/_content-harness.ts:87
export function contentEvent(opts: ContentEventOptions) {
  ...
  return {                                   // :107 — inferred, not `: CairnEvent`
    url: new URL(url),
    ...
```

so every call site erases the argument type:

```ts
// src/tests/unit/content-routes-save.test.ts:59
routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: '...' }) as never),
```

The component project does the same to props, which is worse, because `never` is assignable to
anything and the cast therefore disables checking of the whole props object:

```ts
// src/tests/component/CairnMediaLibrary.test.ts:90 (50 identical occurrences in that file)
const screen = await render(CairnMediaLibrary, { data: fixture() } as never);
```

The repo already contains the counter-exemplar. `src/tests/integration/auth-guard.test.ts:19` builds
the same kind of event with a real annotation and no cast at all:

```ts
function event(pathname: string, cookies = makeCookies()): CairnEvent {
```

Thirteen such annotations exist across eight files, against 827 casts. The consequence for the bar's
third directive is direct: an agent that adds a member to `CairnEvent`, renames a component prop, or
tightens a route factory's argument gets zero compile feedback from 89 test files and discovers the
break only as a runtime assertion failure inside a browser-mode test.

**Remediation.** Annotate `contentEvent(): CairnEvent` and `_auth-harness.ts`'s `makeEvent(): CairnEvent`;
annotate the ~65 per-file event wrappers that call them (one annotation kills 10-25 casts each); type
the component-test props builders as `ComponentProps<typeof X>` the way `_EditPageDesk.svelte:22`
already does internally. Then add a lint or a `check:` gate banning `as never` under `src/tests`, so
the convergence cannot silently regress.

---

## 2. No aggregate gate target: the gate list lives only in CI YAML

**Tier: refactor. Limb: agent-extensibility.**

`package.json` declares 30 gate-shaped scripts. `.github/workflows/test.yml` enumerates 26 `npm run
check*` invocations in a hand-maintained list. Nothing composes them. `CONTRIBUTING.md:66` makes that
the documented rule rather than treating it as a defect:

> CI is the authority on what must pass. The workflows in `.github/workflows/` run the gates,
> and `test.yml` carries most of them; **derive the list from those files rather than from prose.**

The project memory `cairn-ci-only-gates` records the cost already paid: "re-derive the gate list from
the workflows BEFORE committing, never from memory; a remembered subset has shipped `main` red three
times." A watch item whose trigger is machine-detectable is supposed to become a gate under this
repo's own "Watch items" rule; here the mitigation is prose telling every future reader to re-derive a
list by hand.

Three concrete symptoms of the missing aggregate:

- `check:interactive-contrast` and `check:touch-targets` appear in `package.json:59-60` and run in
  **no** workflow and no documented manual ritual. Both are deliberately live-server gates, but
  nothing schedules or reminds; they are effectively dormant.
- `npm run lint` (`"lint": "eslint src/lib"`, `package.json:71`) duplicates
  `scripts/checks/check-comments.sh:9` (`npx --no-install eslint src/lib`). Two targets, one job; only
  the second runs in CI.
- The eight workflows each re-derive their own prerequisites (`npm run package` appears in five of
  them, and 12 individual `check:*` targets prepend `npm run package` themselves), so the packaging
  step runs many times per CI run with no single place that states the dependency.

**Remediation.** Add `npm run gate` composing every blocking gate in dependency order (package once,
then the checks, then the suites), and reduce `test.yml` to calling it. Give the two live probes their
own composed target (`gate:live`) with the BASE_URL precondition, and name it in `CONTRIBUTING.md`.
Delete `lint` in favour of `check:comments`.

---

## 3. The comment and lint gate covers `src/lib` only; ~89,000 lines of tests and scripts are ungated

**Tier: refactor. Limb: comprehension.**

```js
// eslint.config.js:33
const COMMENT_GLOBS = ['src/lib/**/*.ts', 'packages/cairn-cms-dev/src/**/*.ts'];
```

Everything the TSDoc standard buys (`tsdoc/syntax`, `jsdoc/no-types`, `jsdoc/informative-docs`, the
local `house/no-em-dash-in-comments`) stops at `src/lib`. `src/tests` (79,700 lines) and `scripts`
(9,600 lines, 32% of them comment) receive none of it. `tsconfig.json:15` compounds this: `include`
names `src/lib/**` and `src/tests/**` and omits `scripts/**`, so the 17 scripts that no test imports
(`link-consumer.mjs` at 334 lines, `generate-norms-manifest.mjs` at 399, `check-target-stack.mjs`,
`check-consumers.mjs`, `transpile-dist-svelte.mjs`, `reskin-fixture.mjs`, and 11 more) are never
type-checked at all despite carrying full JSDoc type annotations.

The measurable consequence in the comment corpus: 174 comments under `src/tests` cite a plan artifact
a reader cannot resolve, and one live example of the class the `informative-docs` rule exists to catch
sits in a gate's user-facing output, pointing at a path that has not existed since the `scripts/`
regroup:

```js
// scripts/checks/check-admin-prose.mjs:267 — printed to the developer on every failure
console.error('Run `node scripts/check-admin-prose.mjs --list` to read all admin copy at once.');
```

The file is at `scripts/checks/check-admin-prose.mjs`; following the gate's own remediation gives
ENOENT. The same stale path is in its header at `:17`. `scripts/lab/migrate-allowlist.mjs:6` carries
the identical class of staleness.

**Remediation.** Extend `COMMENT_GLOBS` to `scripts/**/*.mjs` and `src/tests/**/*.ts` (the em-dash ban
and `tsdoc/syntax` apply verbatim; set `jsdoc/require-jsdoc` off for these globs since neither tree has
a public surface). Add `scripts/**/*.mjs` to `tsconfig.json`'s `include` so `npm run check` type-checks
the JSDoc that is already written. Fix the two stale paths.

---

## 4. `src/tests/unit` is a flat 282-file directory with three competing filename conventions

**Tier: refactor. Limb: agent-extensibility.**

282 `*.test.ts` files sit directly in `src/tests/unit`. Their prefixes already reconstruct `src/lib`'s
directory tree by hand: 36 `content-*`, 24 `delivery-*`, 18 `media-*`, 15 `check-*`, 14 `render-*`,
11 `github-*`, 11 `doctor-*`, 9 `auth-*`, 9 `admin-*`. The one subtree that exists,
`src/tests/unit/audit/{,rules/,rules/rendered/}`, mirrors `src/lib/audit/{,rules/static,rules/rendered}`
exactly and is markedly easier to navigate. Two schemes for one job, with the better one already built.

The component project layers a second problem on top: three casings name the same component's tests.

```
EditPage.test.ts                       edit-page-advisories.test.ts
EditPage-insert.test.ts                edit-page-field-hint.test.ts
                                       edit-page-preview-share.test.ts
                                       edit-page-publish-visibility.test.ts
                                       edit-page-spellcheck-override.test.ts
                                       edit-page-v2-fields.test.ts
```

Eight files, three conventions (`PascalCase`, `PascalCase-kebab`, `kebab`), for one component. Same
fork at `MarkdownEditor.test.ts` vs `markdown-editor-theme-polarity.test.ts` and `CairnAdminShell.test.ts`
vs `admin-shell-theme-override.test.ts`. A fourth convention appears in the audit subtree:
`rulings.border-contrast.test.ts`, `rulings.chip-ground-collision.test.ts`, `rulings.touch-targets.test.ts`,
`rulings.weight-budget.test.ts` use a dot-separated group prefix. `edit-page-v2-fields.test.ts` also
carries an unresolvable internal version label ("v2") in its filename.

`CONTRIBUTING.md:131` states only that tests live under `src/tests/{unit,integration,component}/`; no
rule governs placement or naming within a project. An agent asked to "add a test for EditPage's save
guard" cannot predict its destination and must read the whole component directory to find where the
neighbouring behaviour is asserted.

**Remediation.** Mirror `src/lib` under `src/tests/unit` (`content/`, `delivery/`, `media/`, `github/`,
`doctor/`, `auth/`, `render/`, `nav/`, `sveltekit/`, `checks/` for the gate tests), the way `audit/`
already does. Fix one filename convention per project and state it in `CONTRIBUTING.md`: component tests
take the component's own name and a hyphenated aspect suffix (`EditPage-insert.test.ts`), unit tests
take the module's own basename. Rename `edit-page-v2-fields` to what it actually asserts.

---

## 5. Thirteen "unit" tests launch a raw Chromium; a configured browser project already exists

**Tier: refactor. Limb: idiom.**

`vitest.config.ts` configures the `component` project properly for the browser:

```ts
browser: { enabled: true, provider: playwright(), headless: true, instances: [{ browser: 'chromium' }] },
```

Meanwhile 13 files inside the node `unit` project drive Chromium by hand, each with its own launch and
teardown:

```ts
// src/tests/unit/audit/rules/rendered/rulings.weight-budget.test.ts:21 (and 12 sibling files)
browser = await chromium.launch();
```

The full set: `advisory-refutations`, `browser-regressions`, `container-inset-asymmetry`,
`field-edge-alignment`, `form-font-parity`, `gate-refutations`, `norms-bands.browser`,
`one-filled-action-partition`, `rulings.border-contrast`, `rulings.chip-ground-collision`,
`rulings.touch-targets`, `rulings.weight-budget`, `screen-anatomy` (plus `check-package-files.test.ts`,
which imports `playwright` for a different reason). These run inside a project the config caps at four
workers and gives a 30s test timeout, and they raise their `beforeAll` to `120_000` individually to
survive the launch. `npm run test:unit`, which reads as the fast node target, launches up to 13 browsers.

The naming makes it worse rather than better: exactly one of the 13 carries a `.browser.` infix
(`norms-bands.browser.test.ts`), so the convention that would let a reader or an agent tell these apart
exists and is applied to 1 file in 13. A naming signal that is wrong 92% of the time is worse than none.

**Remediation.** Give the rendered-rule fixtures their own vitest project (`audit-rendered`) with a
shared browser lifecycle in a setup file, or move them into the existing `component` project's browser
mode. Either way, apply the `.browser.` infix to all of them or drop it from the one.

---

## 6. `EditPage.test.ts`: 3,367 lines, 174 assertions in one undivided `describe`

**Tier: refactor. Limb: comprehension.**

```
src/tests/component/EditPage.test.ts:124   describe('EditPage', () => {
src/tests/component/EditPage.test.ts:2463    describe('zen', () => {          <- first sub-describe
```

209 `it()` blocks total, 174 of them in the flat span between those two lines with no intervening
structure. The file's siblings (`CairnMediaLibrary.test.ts` 1,764, `MarkdownEditor.test.ts` 1,679,
`CairnAdminShell.test.ts` 1,288, `ListToolbar.test.ts` 1,119) have the same shape at smaller scale.
Idiom T3 asks component tests to "describe by UI region"; the six sub-describes that do exist
(`zen`, `the Edit-block round-trip control`, `tidy (the host action driver)`, and three audit-derived
ones) arrive only in the last 900 lines.

The practical cost: to add one assertion about, say, the field hint, a reader must scan 2,300
undifferentiated lines to find whether it already exists and where its fixture lives, and the answer
may in fact be in `edit-page-field-hint.test.ts` instead (finding 4).

**Remediation.** Partition the flat span into `describe` blocks by UI region (frontmatter fields,
the editor surface, the preview pane, the desk band, insert flows, save/publish lifecycle), then split
the file along those seams and fold the six `edit-page-*.test.ts` strays into the matching regions.

---

## 7. The shared script helpers exist and are bypassed: 19 root resolutions, 5 corpus lists

**Tier: refactor. Limb: idiom.**

`scripts/repo-root.mjs:1-4` states its own reason for existing:

> Every gate lives one level under a `scripts/` subdirectory ... sharing the resolution here keeps
> that two-levels-up assumption **in one place instead of restated per file**.

It is then restated per file 19 times:

```js
// scripts/checks/check-symbols.mjs:49, check-public-tokens.mjs:25, check-visuals.mjs:26,
// transcript-blocks.mjs:18, docs-links.mjs:14, check-surface.mjs:19, reference-coverage.mjs:10,
// check-version.mjs:12, check-package-files.mjs:14, check-readiness.mjs:12, check-consumers.mjs:33,
// check-target-stack.mjs:12, check-arm-indexes.mjs:23, check-dev-package.mjs:16,
// check-admin-prose.mjs:22, check-reference-signatures.mjs:15, reskin-fixture.mjs:29, ...
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
```

13 scripts import the helper; 19 hand-roll it. The same fork runs through the entry guard, in two
spellings: `if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))`
(19 files) and `if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();`
(5 files: `check-symbols.mjs:514`, `docs-links.mjs:357`, `transcript-blocks.mjs:508`,
`check-arm-indexes.mjs:143`, `check-visuals.mjs:361`).

The published-docs corpus is declared five times, in four orders and two shapes:

```js
scripts/checks/check-visuals.mjs:31      const SCAN_DIRS = ['docs/admin','docs/editors','docs/extend','docs/reference'];
scripts/checks/transcript-blocks.mjs:23  const SCAN_DIRS = ['docs/admin','docs/editors','docs/extend','docs/reference'];
scripts/checks/check-snippets.mjs:47     const DOC_DIRS  = ['docs/reference','docs/extend','docs/admin','docs/editors'];
scripts/checks/check-symbols.mjs:55      const SCOPE = ['docs/admin','docs/editors','docs/extend','docs/why-cairn.md',
                                                        'docs/reference','docs/README.md','README.md'];
scripts/checks/check-arm-indexes.mjs:30  { dir: 'docs/admin', index: 'docs/admin/README.md' }, ...
```

They already disagree. `check-symbols` scans `docs/why-cairn.md`, `docs/README.md`, and the root
`README.md`; `check-snippets` does not. Any TypeScript fence added to those three pages would have its
symbol names checked and its types never checked. That gap is currently latent (all three carry zero
`ts`/`svelte` fences today), which is exactly the shape of a hole nobody notices until a page moves.

**Remediation.** One `scripts/docs-corpus.mjs` exporting `PUBLISHED_ARMS`, `FRONT_DOORS`, and
`ROOT_DOCS`, imported by all five gates, with a test asserting each named path exists. Retarget the 19
hand-rolled `ROOT` constants at `repoRoot(import.meta.url)`. Pick one entry-guard spelling and record
it under idiom N4.

---

## 8. `walkMarkdown` is defined five times with three different capability levels

**Tier: refactor. Limb: idiom.**

`scripts/walk-files.mjs:1-4` also states its own reason for existing:

> the shared recursive-directory walk the `scripts/` gates that scan a source tree by filename
> predicate reuse ... **One walk, one place to fix a traversal bug.**

Six scripts import it. Nine hand-roll their own recursion anyway, and five of those name the function
identically while behaving differently:

```js
// scripts/checks/check-visuals.mjs:295      SKIP_DIRS, no existsSync guard
// scripts/checks/check-arm-indexes.mjs:53   SKIP_DIRS, no existsSync guard
// scripts/checks/transcript-blocks.mjs:57   SKIP_DIRS + `if (!existsSync(dir)) return [];`
// scripts/checks/check-symbols.mjs:96       NO SKIP_DIRS at all
// scripts/checks/docs-links.mjs:18          `walkMarkdown(dir, skip, out)` — skip passed as a param
function walkMarkdown(dir) { ... }
```

Four are byte-comparable apart from those two lines. The `check-symbols` copy having no `SKIP_DIRS`
means it descends `__snapshots__`/`snapshots` directories the other four deliberately exclude, so the
five gates do not agree on what "the docs corpus" contains even before the corpus lists of finding 7
diverge. `scripts/lab/link-consumer.mjs` is the sharpest instance: it imports `walk` from
`walk-files.mjs` at line 31 *and* hand-rolls a `readdirSync` recursion of its own.

The same duplication runs through fenced-block parsing, six independent regexes with different
capability:

```js
scripts/checks/docs-links.mjs:48            /^(\s*)(```+|~~~+)/               handles ~~~ and indent
scripts/checks/check-symbols.mjs:138        /^(\s*)(```+|~~~+)\s*([\w-]*)/    handles ~~~ and indent
scripts/checks/check-snippets.mjs:51        /^```(ts|typescript|svelte)\s*$/  neither
scripts/checks/reference-coverage.mjs:233   /^```(?:ts|typescript)\s*$/       neither
scripts/checks/transcript-blocks.mjs:38     /^```([\w-]*)$/                   neither
scripts/checks/check-visuals.mjs:45         /^```([\w-]*)\n([\s\S]*?)\n```$/  neither (and its own
                                                                              comment admits it)
```

**Remediation.** Move `walkMarkdown` into `scripts/walk-files.mjs` with `skip` and a missing-directory
guard as options, delete the five copies, and retarget the four other hand-rolled walks. Extract one
`scripts/markdown-fences.mjs` exporting a single CommonMark-correct fence scanner (`~~~`, indented
fences, info strings) and retarget the six regexes at it.

---

## 9. T2 violated: hand-rolled unguarded redirect unwraps beside the shared guarded helper

**Tier: refactor. Limb: idiom.**

`src/tests/_redirect-assertions.ts` exports `expectRedirect`/`expectHttpError` built on SvelteKit's own
`isRedirect`/`isHttpError`, exactly as idiom T2 requires, and both `_content-harness.ts:14` and
`_auth-harness.ts:5` re-export them. Three integration files import that harness and then hand-roll an
unguarded replacement anyway:

```ts
// src/tests/integration/content-routes-fragments-delete.test.ts:49
/** Drive an action that redirects on success and return the redirect location. */
async function redirectedTo(action: Promise<unknown>): Promise<string> {
  try { await action; }
  catch (e) { return (e as { location: string }).location; }
  throw new Error('expected a redirect');
}
```

Identical copies in `content-routes-fragments-rename.test.ts:52` and
`content-routes-fragments-edit.test.ts:48`. The missing `isRedirect(e)` guard is not cosmetic: if the
action under test throws a real error, or an `error(500, ...)`, this returns `undefined` as the
location and the subsequent `expect(location).toContain(...)` fails with a `TypeError` on `undefined`
rather than reporting the actual failure. A test that misreports why it failed costs an agent a full
debugging cycle.

`src/tests/integration/preview-load.test.ts:121-130` reimplements `expectHttpError` verbatim, down to
the same throw message (`'expected an HTTP error, none thrown'`), because it also needs the error body:

```ts
async function expectNotFound(fn: () => Promise<unknown>): Promise<{ status: number; message: string }> {
```

That one is a signature gap in the shared helper, not carelessness.

**Remediation.** Delete the three `redirectedTo` copies for `expectRedirect`. Widen the shared
`expectHttpError` to return `{ status, body }` so `preview-load.test.ts` can drop its copy. Move
`_content-harness.ts` and `_github-double.ts` up to `src/tests/` alongside `_redirect-assertions.ts`,
since 11 integration files currently reach across projects with `from '../unit/_github-double.js'`.

---

## 10. Dead script, and a knip config under which no script can ever be reported dead

**Tier: refactor. Limb: comprehension.**

`scripts/lab/migrate-allowlist.mjs` (50 lines) migrates a legacy `AUTH_KV` editor allowlist into a
`better-auth` D1 `user` table:

```js
// scripts/lab/migrate-allowlist.mjs:1-8
// One-off, dev-only: migrate a site's legacy AUTH_KV editor allowlist into its better-auth D1
// `user` table. ...
//   node scripts/migrate-allowlist.mjs <kv-namespace-id> <d1-db-name> [--local|--remote]
// Defaults to --local. Pass --remote for the production cutover (Phase 6).
```

None of that exists any more. `AUTH_KV`, `better-auth`, and a `user` table appear nowhere in `src/lib`,
`migrations/` (which ships `editor`, `magic_token`, `session`, `audit`, `preview`), or `docs/reference`.
The usage line names a path that has not existed since the `scripts/` regroup (commit d6ce6c13), and
the SQL is built by string interpolation. Its only inbound reference in the repo is
`docs/internal/history/plan.md`. A new developer opening `scripts/lab/` reads it as current apparatus
and infers an auth architecture cairn abandoned.

The instrument that should have caught it cannot:

```jsonc
// knip.jsonc:11-16
"entry": [
  "scripts/**/*.mjs",          // <- every script is an entry point
  "src/tests/unit/**/*.test.ts", ...
```

Treating the whole `scripts/` tree as entry points means knip can never report a script as unreachable,
which is the one question worth asking of that directory.

**Remediation.** Delete `scripts/lab/migrate-allowlist.mjs`. Narrow knip's `entry` to the scripts
`package.json` and the workflows actually invoke (a generated list, or the `npm run gate` composition
from finding 2), so an orphaned gate surfaces. `scripts/lab/probe-vertical-alignment.mjs` is the live
counter-case: 1,754 lines, wired into no npm script, discoverable only through its own header.

---

## 11. `scripts/lab/probe-vertical-alignment.mjs`: 1,754 lines, a `.mjs` extension that lies, unwired

**Tier: refactor. Limb: comprehension.**

The largest file in `scripts/` by a factor of 2.6. Its content is excellent, thoroughly reasoned, and
correctly split from its measurement module. Three structural problems stand:

```js
// scripts/lab/probe-vertical-alignment.mjs:1
#!/usr/bin/env -S npx tsx
...
// :62
import { ... } from '../../src/tests/lab/vertical-metrics.ts';
```

The file is named `.mjs` but cannot run under `node`; it imports a `.ts` module and needs `tsx`. Every
other `.mjs` in the tree runs under plain `node`, so the extension is a false signal to both a reader
and a tool. It appears in no `package.json` script, so the only way to learn how to run it is to open
it and read lines 46-53. And at 1,754 lines it holds a renderer, a corpus walker, a calibration driver,
a report writer, and a screenshot cropper in one module, with no decomposition into testable exports
of the kind every gate script in `scripts/checks/` demonstrates.

Its measurement module has a matching N6 problem. Idiom N6 requires "test-helper modules that are not
themselves tests carry the `_` filename prefix, in all three test projects";
`src/tests/lab/vertical-metrics.ts` (1,574 lines, 27 exports, not a test) carries none.

**Remediation.** Rename to `probe-vertical-alignment.mts` (or `.ts`) so the extension matches the
runtime, add a `probe:vertical` npm script, and split the report writer and the corpus walker into
their own modules with unit tests. Rename `vertical-metrics.ts` to `_vertical-metrics.ts` per N6, or
amend N6 to exempt `lab/`.

---

## 12. Gate identity and exit conventions fork across the 26 gates

**Tier: refactor. Limb: agent-extensibility.**

Two exit idioms, split almost evenly:

- `process.exit(1)` in 12 gates (`check-package-files.mjs` calls it from five separate places)
- `process.exitCode = 1` in 9 gates

The fork is not only stylistic. `process.exit()` terminates before pending `stdout` writes flush when
output is piped, which is precisely the class of failure the project memory `exit-code-is-not-an-outcome`
records ("a masking pipe ... reported success over a real failure").

Four spellings of the same gate's identity appear in its own output, so a CI log line cannot be mapped
back to a target mechanically:

```
scripts/checks/check-consumers.mjs:66        console.log('check:consumers OK');            // npm target
scripts/checks/check-arm-indexes.mjs:133     console.log('check-arm-indexes: OK (...)');   // script basename
scripts/checks/check-chassis-boundary.mjs    console.error('chassis-boundary: FAIL');      // bare noun
scripts/checks/check-admin-prose.mjs:268     console.error('admin-copy prose gate: ...');  // prose label
scripts/checks/check-custom-surface.mjs      console.error(`custom-surface [${name}]: FAIL`);
```

Success lines are equally varied: some report a count (`check-symbols: OK (N files, no unresolved
symbol)`), some report nothing (`check-visuals: OK`). A gate that reports zero scanned files looks
identical to a gate that passed, which is the vacuous-pass failure `check-interactive-contrast.mjs:5-9`
documents having actually happened to itself.

**Remediation.** One `scripts/gate-report.mjs` exporting `pass(name, detail)` / `fail(name, findings)`
that prints `<npm target>: OK (<count> …)` or `<npm target>: FAIL` and sets `process.exitCode`,
never `process.exit()`. Require every gate's OK line to carry a scanned count so a vacuous pass is
visible.

---

## 13. The `$app/state` stub is a plain object, so component reactivity is untested

**Tier: refactor. Limb: idiom (Svelte 5).**

```ts
// src/tests/component/_app-state.ts:1-9
// A plain mutable object is enough: a test sets page.url (or page.data) before
// rendering, and no test asserts that a derived re-runs after a swap on a mounted component.
export const page: { url: URL; data: Record<string, unknown> } = {
  url: new URL('http://localhost/'),
  data: {},
};
```

SvelteKit 2's real `$app/state` `page` is rune-backed and reactive; this stand-in is not. The comment
is honest, but the consequence is that the fake is *less capable* than the real module, which is the
defect shape the project memory `fakes-must-refuse-what-the-real-service-refuses` names: a fake more
permissive than the real service hides a whole defect class. Here the hidden class is the inverse and
just as real: a component that correctly reads `page.url` inside a `$derived` and one that incorrectly
snapshots it at mount are indistinguishable under this stub, and 68 component test files run against it.

A second, smaller instance: `src/tests/_app-environment.ts:2-3` claims

> wired in by the unit and integration projects' vite alias (**the component project has its own
> equivalent stubs in src/tests/component/**)

but `vitest.config.ts` aliases the component project's `$app/environment` to this same file. The
comment describes a layout that no longer exists.

**Remediation.** Back the stub with `$state` (`export const page = $state({ url, data })` in a `.svelte.ts`
module) so a mounted component's `$derived` re-runs on a URL swap, and add one test that would fail
against the current plain object. Correct the `_app-environment.ts` header.

---

## 14. The two live audit-gate wrappers duplicate a `main()` their static siblings share

**Tier: note. Limb: idiom.**

`scripts/checks/audit-gate.mjs` exists so the audit-gate wrappers share their narrowing, and
`check-admin-css-classes.mjs` and `check-invisible-craft.mjs` both use it. The two live wrappers do
not follow the pattern: `check-interactive-contrast.mjs:38-58` and `check-touch-targets.mjs` carry a
byte-comparable 20-line `main()` differing only in `RULE_ID` and the extra page list.

```js
// scripts/checks/check-interactive-contrast.mjs:38-58, mirrored in check-touch-targets.mjs
const { DEFAULT_BASE_URL, exitCodeFor, formatReport, renderedRules, resolveConfig, runRendered } =
  await import('../../dist/audit/index.js');
const baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;
const rule = renderedRules().find((candidate) => candidate.id === RULE_ID);
if (!rule) throw new Error(`the packaged engine registers no ${RULE_ID} rule`);
...
```

**Remediation.** Add `runRenderedGate(ruleId, { extraPages, allowlist })` to
`scripts/checks/live-probe-support.mjs` (which already owns the shared half) and reduce both wrappers
to a constant plus one call.

---

## 15. ~40 test titles cite plan artifacts a reader cannot resolve

**Tier: note. Limb: comprehension.**

Idiom T3: "titles are present-tense sentences with **no plan-task numbers**." A sample of the
violations:

```
src/tests/integration/media-delivery.test.ts:66        describe('media delivery route (Task 4)', ...)
src/tests/integration/content-routes-tidy.test.ts:266  describe('tidy action: error voice (save-500-honest-errors, Task 4)', ...)
src/tests/integration/auth-guard.test.ts:196           it('...(Task 3: an absent map then only ever means the guard never ran)', ...)
src/tests/component/ConceptList.test.ts:463            describe('office composition at 320px (audit finding 8)', ...)
src/tests/component/EditorToolbar.test.ts:152          describe('the persistent "?" help control (design-arc D2)', ...)
src/tests/component/EditPage.test.ts:3157              describe('phone-desk composition (design-arc C1, docs/internal/2026-07-15-design-arc-log.md)', ...)
src/tests/unit/audit/.../rulings.chip-ground-collision.test.ts:64
                                                       describe('chip-ground-collision floor, ratified at 1.5 (Task 16b ruling 3)', ...)
```

"Task 4" appears in four different files meaning four different plans' task 4. 174 comment lines under
`src/tests` carry the same class of reference. When a test fails in CI, the title is the only context a
reader gets, and half of it points at a document the reader cannot identify.

**Remediation.** Strip the plan and finding labels from titles; keep the behavioural clause. Where the
rationale genuinely matters, put it in the file header with a resolvable path (the
`EditPage.test.ts:3157` form, which names the document, is the acceptable shape).

---

## 16. `emit-template.mjs` is tested in two runners, in two directories

**Tier: note. Limb: idiom.**

`scripts/build/emit-template.mjs` has two test files under two harnesses:

- `scripts/build/emit-template.test.mjs` — `node:test` + `node:assert/strict`, run by
  `"test:emit": "node --test scripts/build/emit-template.test.mjs"` and its own CI step
  (`test.yml:49`).
- `src/tests/unit/emit-template-tree.test.ts` — vitest, run by `npm test`.

Every other main-repo gate script is tested exactly once, in vitest, from `src/tests/unit/check-*.test.ts`.
The `node:test` convention belongs to `packages/create-cairn-site` (whose whole suite uses it), so this
file is a convention leaking across a package boundary. An agent adding a case to `stripMarkedBlocks`
has to pick a runner with nothing to guide the choice.

**Remediation.** Fold `emit-template.test.mjs`'s eight cases into `emit-template-tree.test.ts` (or a
sibling `emit-template.test.ts`), delete `test:emit` and its CI step.

---

## 17. Two fetch-mocking idioms with mismatched teardown

**Tier: note. Limb: idiom.**

```
vi.stubGlobal('fetch', ...)          87 occurrences
vi.spyOn(globalThis, 'fetch', ...)   20 occurrences
vi.restoreAllMocks()                112 occurrences
vi.unstubAllGlobals()                19 occurrences
```

`vi.restoreAllMocks()` restores `vi.spyOn` subjects; `vi.stubGlobal` is undone by
`vi.unstubAllGlobals()`, and `unstubGlobals` is not enabled in `vitest.config.ts`. So the dominant
idiom (87 sites) is paired with the wrong teardown at most of them. Isolation between files limits the
blast radius, but within a file a test that expects the real `fetch` inherits whatever the previous
test installed. `src/tests/unit/_github-double.ts` (a stateful, scripted double) coexists with 26
files that hand-roll a `vi.stubGlobal('fetch', ...)` scripted responder, including four that use both
(`nav-routes-load.test.ts`, `turnstile.test.ts`, `edit-page-preview-share.test.ts`, `EditPage.test.ts`).

**Remediation.** Set `unstubGlobals: true` in `vitest.config.ts` so the teardown is automatic and
correct, pick `vi.stubGlobal` as the single idiom, and record it under idiom T4's neighbourhood.
Where a test scripts GitHub API responses, prefer `GithubDouble` over a fresh responder.
