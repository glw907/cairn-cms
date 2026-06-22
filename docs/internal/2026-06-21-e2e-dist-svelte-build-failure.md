# Troubleshooting: the e2e CI build fails parsing dist `.svelte` (0.60.0)

Status: OPEN. Started 2026-06-21, after `0.60.0` published. This is a handoff brief for a fresh
troubleshooting session. Read it first, then go straight to the CI probe (see "Recommended first
step"). The failure only reproduces in CI, so do not expect a local repro to come easily; the prior
session tried hard and could not.

## The symptom

The `e2e` CI job on `main` fails at the showcase production build (Playwright's `webServer` runs
`npm run build`). The `test` job (unit, integration, component) passes; only `e2e` fails. The error:

```
[builtin:vite-dynamic-import-vars] plugin threw an error
  Failed to parse code in '.../dist/components/MediaInsertPopover.svelte':
  "Expected `,` or `)` but found `?`"
Build failed with 3 errors:
  dist/components/ComponentInsertDialog.svelte:17  export function insertableDefs(registry?) {
  dist/components/CairnMediaLibrary.svelte:222     function openAsset(asset, origin?) {
```

The `?` is a TypeScript optional-parameter marker. In CI's `dist`, the type annotation is stripped
(`registry?: ComponentRegistry` becomes `registry?`) but the `?` stays, which is invalid JS, and
rolldown's `vite-dynamic-import-vars` parser dies on it. It is deterministic: a `gh run rerun` failed
identically.

## Blast radius

- No production site is on `0.60.0` (the per-site cutovers were not done), so nothing live is broken.
- `0.60.0` is published to npm as `latest` and its consumer build is suspect. The real sites
  (ecxc-ski, 907-life) consume cairn the same way the showcase does (`ssr.noExternal` plus the
  `svelte` export condition over `dist/*.svelte`), so a real site build likely hits this too.
- Supersede with a fixed `0.60.1` once e2e is green. Consider `npm deprecate @glw907/cairn-cms@0.60.0`
  (needs Geoff's npm 2FA; a CLI token cannot do it).

## Ruled out (do not re-run these)

Every local build passes; the failure did not reproduce under any of:

- Node 22 (CI's version) and Node 24. Note: `nvm use 22` does not stick in the claude shell because a
  non-nvm `node` sits ahead on PATH; invoke `~/.nvm/versions/node/v22.23.0/bin/node` or prepend it to
  PATH explicitly.
- npm 10.9.8 (CI's version, from Node 22).
- rolldown 1.0.3 (the committed lockfile pin) and rolldown 1.1.2 (latest, force-installed).
- A clean root `npm ci` plus a fresh `npm run package` (`dist` rebuilt from scratch).
- A clean showcase `node_modules` plus `npm install --prefix examples/showcase`.

The decisive divergence: the local clean `dist/components/ComponentInsertDialog.svelte` is VALID,
`<script lang="ts">` with the full type kept (`export function insertableDefs(registry?:
ComponentRegistry): ComponentDef[]`). CI's `dist` shows the malformed `insertableDefs(registry?)`. So
the same `svelte-package` (2.5.7) and the same source produce different `dist` output, or the consumer
build produces that malformed intermediate, between this machine and the CI runner. That gap is the
mystery.

Also note: `ComponentInsertDialog.svelte` and `CairnMediaLibrary.svelte` contain ZERO `import(` calls
(only `MediaInsertPopover.svelte` has 2), yet CI parse-errors on all three. So `dynamic-import-vars` is
parsing these files broadly, not because a glob from cairn's own code matched them.

## Key unknowns to chase (in order)

1. What exact `vite`, `rolldown`, and `esbuild` versions does the CI runner resolve? The e2e workflow
   uses `npm install --prefix examples/showcase` (NOT `npm ci`), so the showcase deps are unpinned and
   may drift from the committed `examples/showcase/package-lock.json`. This is the leading suspect.
2. Why does CI's `dist/*.svelte` differ from local (type stripped, `?` kept)? Is `svelte-package`
   preprocessing differently in CI, or is the consumer's `vitePreprocess` producing that intermediate
   before `dynamic-import-vars` runs?
3. Why does `dynamic-import-vars` parse `.svelte` files that contain no dynamic import?
4. What changed between `0.59.0` (e2e passed, CI run 27890571761) and `0.60.0` (e2e fails) to trigger
   this? New in `0.60.0`: the spellcheck Web Worker (`new Worker(new URL('./spellcheck-worker.js',
   import.meta.url), { type: 'module' })`), several `await import('@codemirror/...')` calls, the
   worker's `await import('spellchecker-wasm/lib/browser/SpellcheckerWasm.js')`, and a templated
   dictionary `new URL` that has since been removed.

## State so far

- Partial fix pushed to `main`: `7e20e49` "Resolve the spellcheck dictionary URL with a static path".
  It removed the only templated `new URL(./spellcheck-assets/${file})`, a real latent glob trigger,
  but it is NOT the cause; e2e still fails after it (CI run 27919852421). Keep the fix; it is correct.
- `0.60.0` is merged to `main` (`ffd4d92`), released, and on npm. The pass itself (Tasks 1 to 17,
  simplify, adversarial review fold-in) is complete and committed.
- The `feat/editor-copyedit` worktree still exists at `.claude/worktrees/editor-copyedit`, even with
  `main` at `7e20e49`.
- Relevant config: the library `svelte.config.js` has `preprocess: vitePreprocess()`. The showcase
  `vite.config.ts` has `ssr: { noExternal: ['@glw907/cairn-cms'] }` and the `cairnManifest` plugin.
  The e2e workflow is `.github/workflows/e2e.yml`.

## Recommended first step: a CI probe for ground truth

Local cannot reproduce, so get the runner's truth in one round-trip. On a PR branch (the
`pull_request` trigger runs e2e without touching `main`), add a temporary step before
`test:e2e` that prints:

- `node -v`, `npm -v`
- `npm --prefix examples/showcase ls vite rolldown esbuild @sveltejs/package svelte` (and the root)
- the head of `dist/components/ComponentInsertDialog.svelte` as the runner sees it (confirm the
  malformed `registry?`), and whether its `<script>` tag still carries `lang="ts"`

That pins unknown 1 and 2 immediately. Then fix from evidence rather than guesswork.

## Candidate fixes (decide after the probe)

- If toolchain drift (unknown 1): switch the e2e workflow's `npm install --prefix examples/showcase`
  to `npm ci`, and make sure `examples/showcase/package-lock.json` is committed and in sync. This is
  the cheapest fix if a newer vite/rolldown/esbuild is the trigger.
- If the package ships `.svelte` that a consumer's bundler cannot parse (unknown 2 and 3): the robust
  package-level fix is to stop shipping TS that a non-svelte parser sees. Options: have `svelte-package`
  emit fully JS-stripped `.svelte`, ensure the consumer's svelte transform runs before
  `dynamic-import-vars`, or document a consumer `build.dynamicImportVarsOptions`/plugin-order tweak
  (the prod sites would need it too, so a package-level fix is preferred).
- Keep `7e20e49` regardless; the static dictionary URL is correct hygiene.

## How to verify a fix

Local builds pass regardless, so they cannot confirm a fix. Use CI as the oracle: iterate on a PR
branch until its `e2e` job is green, then merge to `main` and cut `0.60.1` (`gh release create v0.60.1
--target main`, which fires the OIDC publish). Do not cut the release until e2e is green.
