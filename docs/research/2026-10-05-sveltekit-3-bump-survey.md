# SvelteKit 3 and adapter-cloudflare 8 bump survey

Date: 2026-10-05. Branch `sveltekit-3`, segment S4 (the bump). The dependency-upgrade record for the
`@sveltejs/kit` and `@sveltejs/adapter-cloudflare` majors, which Geoff approved in the pass's spec
(`docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md`). The earlier planning survey,
`2026-10-04-sveltekit-3-survey.md`, ranked the opportunities before the plan; this record covers what
the bump itself found against the repo's call sites, including what that survey missed.

Sources, read for the whole window: `packages/kit/CHANGELOG.md` from 2.70.3 through 3.0.0 (the
3.0.0 section is the union of 3.0.0-next.0 through next.32) and `packages/adapter-cloudflare/CHANGELOG.md`
from 7.2.9 through 8.0.0, both at `sveltejs/kit` `main` on 2026-10-05; the installed tarballs.

## Before table

| Package | Current | Wanted | Latest | Manifest |
| --- | --- | --- | --- | --- |
| `@sveltejs/kit` | 2.70.3 | 2.70.3 | 3.0.0 | root `peerDependencies` and `devDependencies`, `^2.70`; `packages/cairn-cms-dev` `peerDependencies`, `^2.61.0`; showcase `devDependencies`, `^2.70` |
| `@sveltejs/adapter-cloudflare` | 7.2.9 | 7.2.9 | 8.0.0 | showcase `devDependencies`, `^7.2.9` (Waymark through emit) |
| `svelte` (peer floor only) | 5.57.1 | 5.57.1 | 5.57.1 | root `peerDependencies`, `^5.56.10` |

Result: kit `^3` (peer and devDependency), the dev package's kit peer `^3`, adapter `^8`, the svelte peer
`^5.57.1`. Each resolves to the newest production release (`npm view`: kit 3.0.0, adapter 8.0.0,
svelte 5.57.1). Ranges were rewritten in the manifests and the lockfiles regenerated with
`npm install` and `npm install --prefix examples/showcase`.

## Resolved-version changes (lockfile diffs)

Root `package-lock.json`: `@sveltejs/kit` 2.70.3 to 3.0.0; `cookie` 0.6.0 to 2.0.1; `@sveltejs/kit`'s
nested `magic-string` 1.4.3 added; `@types/cookie` 0.6.0 and `set-cookie-parser` 3.1.2 removed.

Showcase `package-lock.json`: the same four kit moves; `@sveltejs/adapter-cloudflare` 7.2.9 to 8.0.0;
the adapter's nested `@cloudflare/workers-types` 4.20260702.1, `regexparam` 3.0.0, and `worktop`
0.8.0-next.18 removed; the `file:` entries' recorded versions 0.97.0 to 0.98.0 (a stale lockfile
field, not a resolution change).

## Breaking changes and their effect here

| Change (release notes) | Effect here | Done in this bump |
| --- | --- | --- |
| adapter 8 removes `platform`; emulate `cloudflare:workers` | Every engine binding read | One internal module, `src/lib/sveltekit/workers-env.ts`; `withEnv` in `devBackendHandle` |
| hooks types move to `@sveltejs/kit/hooks` | `Handle` in the guard, the dev handle, the showcase hooks, the dev README; `HandleServerError` in a reference snippet | Imports moved |
| `BeforeNavigate` and the navigation types move to `$app/navigation` | Three component-test files | Imports moved |
| `ActionResult` and `SubmitFunction` move to `$app/forms` | The showcase signups page | Import moved |
| param files in a folder removed in favor of one `params.ts` (`defineParams`, `@sveltejs/kit/params`) | The showcase `src/params/md.ts` matcher; without the move the build fails `param_matcher_missing` | `src/params.ts` with `defineParams` |
| external redirects forbidden by default | The identity `logoutUrl` redirect | `{ external: [origin] }` for an absolute target |
| `invalidateAll` deprecated for `refreshAll` | `MediaUploadDialog`'s `goto` option | Renamed |
| `error(status, {...})` deprecated | None in `src/lib` or the showcase | Nothing |
| `json`/`text` deprecated | Two reference snippets | Left for the docs task, which owns the snippets |
| `HttpError.body` now carries `status` | Two guard unit tests compared the body exactly | Compared with `objectContaining` |
| tsconfig written to `node_modules/$app/tsconfig` | Kit 3 no longer writes `.svelte-kit/tsconfig.json`, so the showcase and Waymark configs that extend it fail a fresh build (`Tsconfig not found` in the manifest plugin's nested server) and warn `tsconfig_extends_missing` | Both extend `$app/tsconfig`, naming `$app/types` and `node` in `types` |
| Kit's dev server checks its SSR environment with `instanceof` against its own Vite | The `/vite` plugin's nested verify server came from the engine's own Vite when the engine is linked (`file:`), failing the showcase build `vite_ssr_environment_not_runnable` | The nested server is built from the site's own Vite (`resolveConsumerVite`) |
| `sequence` reads the request store | A unit test cannot call `sequence` outside a server | The test composes the two handles by hand |
| remove Cache API use (adapter) | `/media` caching | Ruled no action (Geoff, 2026-10-04) |
| Node 22.17, TypeScript 6, Vite 8.0.12, vite-plugin-svelte 7, svelte 5.56.4, wrangler 4.118 | All met | Svelte peer raised to 5.57.1 per the spec |

No hits for the other removals (`$app/stores`, `$app/paths` `base`/`assets`/`resolveRoute`,
`$service-worker`, `goto` `noScroll`/`keepFocus`, `data-sveltekit-*="off"`, `Page` from the kit root,
`preloadCode` by pathname) in `src/lib`, the dev package, or the showcase.

## Features to leverage, with a decision each

| Capability | Code it touches | Decision |
| --- | --- | --- |
| `cloudflare:workers` `env`, `waitUntil`, `withEnv` | Every binding read; the auth channel's inline-await branch; the dev handle's `platform` rewrite | Take now (this bump) |
| `wrangler types` as the binding type | `App.Platform` in the showcase and Waymark; `CairnPlatformBindings` | Take now: a committed Env-only `worker-configuration.d.ts` (`--include-runtime=false`, runtime types from `@cloudflare/workers-types`), checked against the bindings types by `npm run check` |
| `defineParams` matchers returning a value | The `md` matcher | Take now (forced) |
| `$app/tsconfig` | The showcase and Waymark `tsconfig.json` | Take now (forced; see the breaking-change table) |
| `kit.paths.origin` | `PUBLIC_ORIGIN` in `csrfSecure` and `readPublicOrigin` | No action (spec, "Public origin": a library cannot read it at runtime) |
| Remote functions, tracing out of experimental | None | No action (planning survey) |

## Practices to change

- A site reads its bindings from `cloudflare:workers`, never the event; the engine's own reads go
  through `workers-env.ts` and stay unreachable from the Node-context entries (a test walks the packed
  `dist`).
- Code that can run while a build prerenders checks `building` before touching the Worker env.
- `wrangler types --check` agrees with a committed file only on a tree with no build output: wrangler
  adds `GlobalProps.mainModule` when `.svelte-kit/cloudflare/_worker.js` exists. Filed in ROADMAP
  "Next".

## What consumers compile that moved

`CairnEvent` (no type parameter, no `platform`), `PlatformContext` (removed), `CairnMediaBindings`
(`MEDIA_BUCKET` typed by its methods), every factory's event parameter, `AuthChannel`'s and
`SectionAction`'s event types, the `Handle` import path, and the site's own `app.d.ts`, `params.ts`,
and binding reads. The docs task writes the `Consumers must:` lines.
