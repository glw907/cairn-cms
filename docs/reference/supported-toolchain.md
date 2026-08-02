# Supported toolchain

The versions the package promises against and the versions its own CI proves. This page names
both, since they are different claims: the package's `peerDependencies` are the promise a
consumer's install resolves against, and the showcase's `package-lock.json` is what the engine's
own test suite actually runs against. The two need not match, and where they differ the gap is
the safety margin between what is promised and what is exercised.

This page documents the package's own requirements rather than an export subpath, so it carries
no stability tier and the export-coverage gate does not check it.

## Framework and runtime

| Dependency | Minimum supported | Proven against |
|---|---|---|
| `@sveltejs/kit` | `^2.12` (peer dependency) | `2.68.0` |
| `svelte` | `^5.56.3` (peer dependency) | `5.56.4` |
| `vite` | no declared floor | `8.1.0` |
| `typescript` | `5.0` | `6.0.3` |
| `node` | `>=22` | `>=22` (CI's pin) |

**`@sveltejs/kit` `^2.12`.** The floor is deliberate, not stale. The edit page reads `$app/state`,
which shipped in kit 2.12.0, and the `0.51.0` changelog entry made the range an enforced
consumer requirement rather than an advisory.

**`svelte` `^5.56.3`.** Also deliberate: svelte `5.56.1` miscompiles parenthesized boolean
groupings, and a consumer compiles the package's shipped `.svelte` sources directly, so a lower
floor would let a broken svelte compile a broken component.

**`vite`.** The package declares no `vite` peer dependency, so `8.1.0` is a proven-against fact
about the showcase's own lockfile, never a promise.

**`typescript` `5.0`.** The floor is forced by `const` type parameters on the public surface:
`defineAdapter`, `defineConcept`, `fieldset`, and every `fields.*` constructor capture their
argument with a `const` type parameter so the call site's literal types (`required: true`, a
`select` option union) survive into the inferred descriptor. A consumer's own `tsc` run over a
site that calls these constructors needs `const` type parameter support to type-check correctly.
The package's root `devDependency` range is `^6.0.3`, the version the engine develops against.
That is a separate number from the `5.0` floor, and it describes a different audience: a
consumer's own `typescript` version needs only to satisfy the floor, not match the engine's own
development version.

**`node` `>=22`.** This is a build-toolchain floor, not a runtime claim: the package runs on
Cloudflare Workers, whose runtime is `workerd`, never Node. CI's Node 22 pin exists because
`vitest-pool-workers` requires it, which is evidence about the engine's own tooling rather than
about a consumer. The consumer-facing floor comes from Vite 8 and SvelteKit 2, both of which
already require a current Node to build; Node 22 is stated explicitly because it is already the
published requirement in the
[tutorial](../tutorial/build-your-first-cairn-site.md), and the `engines.node` field in
`package.json` now enforces it at install time.

## TypeScript module resolution

The package is ESM-only, with a conditional `exports` map and no legacy `main` or `types`
fallback field. A consumer's `tsconfig.json` needs a `moduleResolution` of `node16`, `nodenext`,
or `bundler` to resolve it. Only `bundler` is positively proven end to end: the showcase's own
`tsconfig.json` sets it explicitly, with a comment explaining why. This page does not assert
that `node10` or the classic resolution mode fails; that is sound general TypeScript behavior,
but it is unproven in this repo and not worth a probe to publish.

## Cloudflare tooling (proven against, not promised)

| Dependency | Proven against |
|---|---|
| `wrangler` | `4.105.0` |
| `@cloudflare/workers-types` | `4.20260630.1` |

The package declares no formal dependency on either `wrangler` or `@cloudflare/workers-types`, so
these are proven-against facts about the showcase's toolchain, never a promise a consumer's
install resolves against.

## `check:package`'s muted `attw` rules

`check:package`'s `attw --ignore-rules no-resolution cjs-resolves-to-esm
internal-resolution-error` mutes three rules deliberately. Each is a structural limitation of
`svelte-package`'s output against `attw`'s resolver, not a masked defect: `svelte-package` ships
`.svelte` and `.css` re-export specifiers that `attw`'s resolver cannot follow without the Svelte
language plugin, and the package is ESM-only by design, so a CJS-resolution check does not apply.
Both source plans that adopted this set (the engine-distribution plan and the enforced-boundary
plan) concluded the mute stays; do not un-mute it without new evidence.

## The `checkOrigin` deprecation

SvelteKit deprecated `csrf.checkOrigin` in 2.61, in favor of `csrf.trustedOrigins`, but has not
removed it ([sveltejs/kit#15992](https://github.com/sveltejs/kit/issues/15992)). Read
"deprecated" as exactly that, not "unsupported": cairn's admin CSRF ownership still depends on
disabling `checkOrigin` (see [Disable checkOrigin](../guides/deploy-to-cloudflare.md#disable-checkorigin)),
and the current SvelteKit range in this matrix still ships it. A scheduled routine watches the
upstream issue for the eventual removal; this table does not.
