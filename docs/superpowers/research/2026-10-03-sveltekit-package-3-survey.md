# `@sveltejs/package` 3 upgrade survey

Date: 2026-10-05. Branch `sveltekit-3`. Approved by Ruling 2 of the SvelteKit 3 plan.
Source: `packages/package/CHANGELOG.md` in `sveltejs/kit`, read for every release from the installed
2.5.8 through 3.0.0.

## Before table

| Package | Current | Wanted | Latest | Manifest |
| --- | --- | --- | --- | --- |
| `@sveltejs/package` | 2.5.8 | 2.5.8 | 3.0.0 | root `devDependencies`, `^2` |

Result: manifest `^3`, resolved 3.0.0 (the newest production 3.x, confirmed with
`npm view @sveltejs/package version`).

## Releases covered

2.5.8 is the installed version, so the window is the nine 3.0.0 prereleases and 3.0.0 itself. The 3.0.0
release notes are the union of the prerelease notes.

| Release | Content |
| --- | --- |
| 3.0.0-next.0 | breaking: require Node 22 or newer; drop `kleur` |
| 3.0.0-next.1 | declare `typescript` as an optional peer dependency |
| 3.0.0-next.2 | feat: warn on a `.server.` file or a file in a `server` directory that imports no server-only module |
| 3.0.0-next.3 | feat: transform import aliases into relative imports in files |
| 3.0.0-next.4 | drop `sade`; import resolved peer dependencies as file URLs; emit declarations when the tsconfig lives above the package root |
| 3.0.0-next.5 | consolidation of next.0 through next.4, plus private fs helpers replaced with Node built-ins |
| 3.0.0-next.6, next.7 | bump `svelte2tsx` to 0.7.59, then 0.7.60 |
| 3.0.0-next.8 | read the Svelte config via `@sveltejs/load-config` |
| 3.0.0 | final; adds a fix rewriting `.ts` extensions in `import.meta.glob` patterns under `rewriteRelativeImportExtensions` |

## Call sites checked

The `package` script (`svelte-package`, then `build-admin-css.mjs`, `transpile-dist-svelte.mjs`, and a
`chmod`), the root `svelte.config.js` (`vitePreprocess()` only, no `kit` block, no `alias`), and
`scripts/build/*`. `src/lib` has no `$lib` or `#` alias import, no `.server.` file, and no `server`
directory; its only `import.meta.glob` mentions are in comments.

## Breaking changes and their effect here

1. Node 22 or newer. No effect: the repo's `engines` is `>=24` and every workflow pins Node 24.
2. `typescript` is a peer dependency, `^6.0.0`, optional. No effect: the repo resolves
   TypeScript 6.0.3.
3. The Svelte config is read through `@sveltejs/load-config` 0.2.3. No effect: the root config loads
   unchanged, and `svelte-check` already shares the same resolved copy.

No fix was needed in `svelte.config.js` or `scripts/build/*`.

## Features to leverage, with a decision each

| Capability | Code that hand-rolls it | Decision |
| --- | --- | --- |
| Transform import aliases into relative imports | None. `src/lib` imports relatively and the root config sets no alias. | No action. Nothing to take or file. |
| Warn on a `.server.` file with no server-only import | None. The engine ships no `.server.` files or `server` directory. | No action. Nothing to take or file. |
| `.ts` rewrite inside `import.meta.glob` patterns | None. The engine passes globs from the consumer site and never packs one. | No action. Nothing to take or file. |

## Practices to change

None. No deprecation and no changed default touches this repo's invocation.

## Lockfile diff

Every resolved-version change in `package-lock.json`:

- `@sveltejs/package` 2.5.8 to 3.0.0 (its `engines.node` `>=22`; optional peer `typescript` `^6.0.0`).
- Its dependency list: `kleur` and `sade` dropped, `semver` `^7.5.4` to `^7.8.5`, `svelte2tsx`
  `~0.7.55` to `~0.7.60`, `@sveltejs/load-config` `^0.2.3` added.
- No other package changed version: `semver` stays 7.8.5, `svelte2tsx` stays 0.7.61, and
  `@sveltejs/load-config` stays 0.2.3 (already resolved for `svelte-check`).

## Packed output

`npm pack --dry-run --json --ignore-scripts` listings, before the bump and after, hold 876 files each
with identical paths and identical per-file sizes. The unpacked size is 8,107,091 bytes in both, and a
sha256 of every file under `dist/` matches before and after. The only difference is the tarball size,
2,824,401 versus 2,824,402 bytes, from `package.json`'s edited range.

`npm run check:package` is green: `publint --strict` and `attw` report no problems, and
`check-package-files` and `check-skill-budget` pass.

## Consumer impact

Nothing the consumer compiles moved: the emitted `dist/` is byte-identical. No `CHANGELOG.md` entry is
added in this task, and no `Consumers must:` line applies.
