# `0.94.0-rc.1` blocker: `/auth-crypto` and `/cloudflare` fail to start on Workers

**Resolved** on branch `rc2-worker-condition`: the `worker` condition fix below is applied to
`package.json`, backed by a structural gate (`scripts/check-package-files.mjs`) and a behavioral
resolver probe (`src/tests/unit/packaging-boundary.test.ts`). Ships in `0.94.0-rc.2`.

Two corrections the fix's own review produced. **`/auth-crypto` has carried this since stable
`0.93.0`**, the release that shipped the subpath, so the title's "`0.94.0-rc.1` blocker" understates
it; the defect was latent there because no consumer imported the subpath. And **neither new gate
exercises real Wrangler**, since both resolve through Node's `--conditions`. The end-to-end proof is
ASC's Playwright suite against `rc.2` from the registry, and the standing gate this section suggests
is now filed in `ROADMAP.md`'s Now tier.

**That end-to-end proof ran on 2026-08-06 and passed.** ASC repinned to `0.94.0-rc.2` from the
registry on a clean `npm ci`, and its Playwright suite started a Worker and ran all 75 specs with
every functional spec green, where `rc.1` had refused all 75 connections. The fix holds against
the published artifact, not only against the patched `node_modules` copy this filing was written
from.

Found 2026-08-05 by the `aksailingclub-org` migration, at that site's Playwright gate, after
`svelte-check`, `vitest`, and `vite build` had all passed. **This blocks the RC for any consumer
that adopts either subpath, which is every site in this window, since both are server-side
primitives for Cloudflare.** It needs an `rc.2`.

## Symptom

The deployed Worker does not start. `wrangler dev --local` and the CI e2e run both die the same
way, before serving a single request:

```
✘ [ERROR] service core:user:asc-site: Uncaught Error: @glw907/cairn-cms/auth-crypto is server-only
    at null.<anonymous> (_worker.js:145990:7)
✘ [ERROR] The Workers runtime failed to start.
```

Every test then fails with `net::ERR_CONNECTION_REFUSED`, which is what the failure looks like
from the outside: 75 of 75 specs red, and nothing in the output naming a cairn subpath unless you
read the web-server log.

## Cause

Both subpaths publish a `browser` condition pointing at a stub that throws at import:

```jsonc
"./auth-crypto": {
  "types": "./dist/auth-crypto/index.d.ts",
  "browser": "./dist/auth-crypto/browser.js",   // throws 'is server-only'
  "default": "./dist/auth-crypto/index.js"
}
```

`./cloudflare` is identical. The stub is the right idea: these are Web Crypto and platform
primitives, and shipping them to a page would be useless and dangerous.

The bug is that **`browser` is the condition a Workers build resolves too.** Wrangler re-bundles
the adapter's output with esbuild for `workerd`, and that resolution applies `browser`, so the
*server* bundle gets the throwing stub. The exports map has no `worker` condition to take
precedence, so there is no way for the runtime cairn targets to reach the real module. The two
subpaths cairn describes as "the Cloudflare-native platform primitives" are unusable on Cloudflare.

Nothing earlier catches it. TypeScript resolves `types` and is happy. Vitest never applies
`browser`. `vite build` emits the adapter output without evaluating it, and the stub is valid
JavaScript that only throws when the module is first evaluated, which is Worker startup.

## Fix, verified

Add a `worker` condition ahead of `browser` in both entries, pointing at the same file `default`
does:

```jsonc
"./auth-crypto": {
  "types": "./dist/auth-crypto/index.d.ts",
  "worker": "./dist/auth-crypto/index.js",
  "browser": "./dist/auth-crypto/browser.js",
  "default": "./dist/auth-crypto/index.js"
}
```

Conditions resolve in declaration order and `worker` is the standard key a Workers runtime
applies, so the server build takes the real module and a browser build still hits the stub. Proven
against the failing site by patching its installed `node_modules` copy: `npm run build` then
`wrangler dev --port 4179 --local` serves `200` where it had refused every connection, and the
client bundle still fails closed on a client-reachable import of the subpath, which is the
guard's whole purpose.

`./auth-store` ships no browser stub and is unaffected.

## What it does not excuse

The client-side half of this is a separate, real finding and stands on its own: the same site's
`vite build` failed earlier with `MISSING_EXPORT ... browser.js`, correctly, because a client page
had been reaching into its member-auth crypto module. That is the guard working. The defect here
is only that the guard also fires on the server.

## Suggested regression gate

`examples/showcase` never exercised this, because nothing in it imports either subpath. A gate
that would have caught it is a showcase route importing `/auth-crypto` and a smoke check that
`wrangler dev` answers `200`, since the failure is at module evaluation and only a started Worker
proves it.
