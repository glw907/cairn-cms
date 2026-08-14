# Post-mortem: the e2e build failed parsing dist `.svelte` on Vite 8 (0.60.0)

Status: RESOLVED 2026-06-21, fixed forward in 0.60.1. This took a long multi-session debugging effort,
so the detail below exists to keep the next person from repeating it.

## Summary

The `e2e` CI job (the showcase production build) failed on `main` after 0.60.0 while every local build
passed. The cause was an upstream Vite 8 / Rolldown incompatibility with the TypeScript that
`@sveltejs/package` ships inside `.svelte` files, hidden by a CI toolchain no local run could reproduce.
The fix is a post-package step that transpiles each shipped `.svelte` `<script>` to plain JavaScript,
plus committing the showcase lockfile so CI is reproducible. No production site was affected; none had
cut over to 0.60.0.

## The symptom

Playwright's `webServer` runs `npm run build` for the showcase. On Vite 8 that build failed with three
errors from Rolldown's builtin dynamic-import-vars plugin, each parsing a cairn `.svelte` file from
`dist/` and choking on a TypeScript optional parameter:

```
[builtin:vite-dynamic-import-vars] Failed to parse code in 'dist/components/ComponentInsertDialog.svelte':
  "Expected `,` or `)` but found `?`"
  17 | export function insertableDefs(registry?) {
```

The `?` is a TypeScript optional-parameter marker. The bundler stripped the `: ComponentRegistry` type
but kept the `?`, leaving invalid JavaScript.

## Why it did not reproduce locally (the trap that cost the most time)

`examples/showcase/package-lock.json` was gitignored. CI checks out a fresh tree with no lockfile and
ran `npm install --prefix examples/showcase`, which resolves the latest toolchain satisfying the `^`
ranges. A developer's working tree keeps an on-disk lockfile, so `npm install` reuses it and pins an
older, working toolchain. Deleting `node_modules` does not help, because the lockfile still pins the old
versions. The reproduction recipe was to delete the lockfile too:

```
rm -rf examples/showcase/node_modules examples/showcase/package-lock.json
npm ci                                   # root, so dist rebuilds with all deps (incl. spellchecker-wasm)
npm install --prefix examples/showcase   # resolves the CI toolchain fresh
npm --prefix examples/showcase run build # reproduces the failure
```

This is now closed. The lockfile is committed and CI uses `npm ci`, so CI and local resolve the same
toolchain.

## Root cause

There are two layers of TypeScript in cairn's `.svelte` files, handled by different tools.

1. The `<script lang="ts">` body. `@sveltejs/package` ships `.svelte` with `lang="ts"` and the
   TypeScript intact (its `strip_lang_tags` keeps the tag for Svelte 5). The consumer bundles these
   files (`ssr.noExternal: ['@glw907/cairn-cms']`). On Vite 8, Rolldown's builtin dynamic-import-vars
   parses the `<script>` as JavaScript before the Svelte plugin compiles the file, and it mis-strips a
   TypeScript optional parameter, turning `registry?: T` into invalid `registry?`. This is the failure.

2. The markup. cairn uses TypeScript in the template too: typed snippet parameters
   (`{#snippet configureForm(def: ComponentDef)}`) and `{@const f = field as TextareaField}` casts. The
   Svelte compiler handles this, but only when `lang="ts"` is present.

So the `<script>` TypeScript has to go, because the bundler sees it, and the `lang="ts"` tag has to stay,
because the Svelte compiler needs it for the markup. Those two constraints together rule out the obvious
fixes.

The underlying bug is upstream, tracked in sveltejs/vite-plugin-svelte#1143 (a meta-issue for Vite 8 /
Rolldown / Svelte) with related issues in oxc and rolldown. The maintainer's note there says plainly that
Vite 8 plus Rolldown is not production-ready.

## The fix

`scripts/transpile-dist-svelte.mjs` runs after `svelte-package` in the `package` script. For each
`dist/**/*.svelte` it transpiles the `<script lang="ts">` body to JavaScript with esbuild and leaves the
`lang="ts"` tag and the markup untouched. The transpile sets `verbatimModuleSyntax`, so only `import
type` (and inline `type` specifiers) are removed and every value import is kept, including one referenced
only in the markup. That detail is load-bearing: the default TypeScript import elision drops markup-only
imports and breaks the component at runtime, which is the regression behind `vitePreprocess({ script:
true })` on Vite 8 (sveltejs/vite-plugin-svelte#1313).

The shipped `.svelte` now carries `<script lang="ts">` with a plain-JavaScript body. The bundler parses
the body cleanly, and the Svelte compiler still has the tag it needs for the markup. cairn's import
discipline (consistent `import type`) is what makes `verbatimModuleSyntax` safe, and `npm run check`
enforces it.

CI is reproducible now too: `examples/showcase/package-lock.json` is committed and the workflow uses
`npm ci --prefix examples/showcase`.

## Dead ends (do not retry these)

- **Pin the showcase to an older toolchain.** Unreliable. The failure reproduces even on `vite@8.0.14` /
  `rolldown@1.0.2`, the set a developer's on-disk lockfile had pinned green; the trigger is a drifting
  transitive rather than a single version, and reconstructing the "green" set still failed.
- **`vitePreprocess({ script: true })`.** It transpiles the `<script>` to JavaScript and the build goes
  green, but it elides markup-only imports and breaks the editor at runtime; the component test suite
  catches it.
- **`build.dynamicImportVarsOptions.exclude`.** Vite 8 / Rolldown's builtin ignores it and the parse
  error stays.
- **Override `rolldown` to 1.1.2** (which does fix the parse bug). API-incompatible with the available
  Vite 8 versions: `vite@8.0.x` imports `viteWasmFallbackPlugin` from `rolldown/experimental`, which
  1.1.2 dropped. No published Vite pairs with a fixed Rolldown yet.
- **Pin the showcase to stable Vite 7.** Out of scope, since cairn targets Vite 8, and Vite 7 hits the
  same class of error from rollup's parser anyway.

## Watch items

- When Rolldown ships a fix and a Vite release pairs with it, the transpile step can be revisited. It is
  correct hygiene regardless, because a plain-JavaScript `<script>` body is bundler-agnostic. Do not
  remove it without re-proving the showcase build on the then-current Vite 8 toolchain.
- The markup TypeScript means `lang="ts"` must stay on the shipped `.svelte`. A consumer that runs
  `vitePreprocess({ script: true })` over cairn's components would re-trigger the elision bug. That is
  the upstream issue rather than cairn's, and it is why the tag cannot simply be stripped.
