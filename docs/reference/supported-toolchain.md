# Supported toolchain

cairn's `peerDependencies` are what a consumer's install resolves against. The showcase's
`package.json` and `wrangler.jsonc` are what the engine's own test suite and its scaffolded
template actually run on. This page names both, since they are different claims, and the table
below carries the current number for each. Where a peer range admits versions older than the one
CI runs, that room is untested rather than proven.

This page documents the package's own requirements rather than an export subpath, so it carries
no stability tier and the export-coverage gate does not check it. `check:target-stack` derives
every `Target today` cell from the source the number comes from: the root `package.json`'s own
version, `engines`, and peer ranges, and the showcase's `package.json` and `wrangler.jsonc`, which
is what the public template is emitted from. It fails when a cell disagrees. It checks that one
column only; the rest of this page is accurate as of its last edit.

## The target stack

| Part | Target today | Where it's set | How often it moves |
|---|---|---|---|
| The cairn package | `0.96.0` | `package.json`, the `@glw907/cairn-cms` version | On a release whose changelog carries a `Consumers must:` line |
| Node, on your machine | `>=24` | `engines.node` in cairn's own `package.json` | Rarely, on Node's own Active LTS calendar |
| SvelteKit | `^2.70` | cairn's `peerDependencies` | Rarely, only when a feature needs a newer SvelteKit capability |
| Svelte | `^5.56.10` | cairn's `peerDependencies` | Rarely, on the same cadence as SvelteKit |
| `@cloudflare/workers-types` | `^5` | cairn's `peerDependencies` | Rarely, on Cloudflare's own major-version cadence |
| Wrangler | `^4.125.0` | the template's `package.json`, set once when a site is scaffolded | Whenever Cloudflare ships a new Wrangler major |
| `@sveltejs/adapter-cloudflare` | `^7.2.9` | the template's `package.json` | Follows SvelteKit's own release line |
| The Workers `compatibility_date` | `2026-08-21` | the template's `wrangler.jsonc`, set once when a site is scaffolded | Moves forward when a new template pulls in a later date; a deployed site's own date never changes on its own |
| TypeScript | `^6` | the template's `package.json` | Held deliberately for now; see the note below |

**`@sveltejs/kit` `^2.70`.** The floor tracks the version cairn develops and tests against, so
the engine may use SvelteKit's current capabilities with no guard for an older minor. The edit
page's `$app/state` dependency, which forced the earlier `^2.12` floor (the `0.51.0` changelog
entry made that range an enforced consumer requirement rather than an advisory), still holds;
`^2.70` raises the floor to the version cairn installs.

**`svelte` `^5.56.10`.** The floor is the version cairn develops and tests against, for the same
reason. The correctness history behind the earlier `^5.56.3` floor still stands underneath it:
svelte `5.56.1` miscompiles parenthesized boolean groupings, and a consumer compiles the
package's shipped `.svelte` sources directly, so a lower floor would let a broken svelte compile
a broken component.

**`@cloudflare/workers-types` `^5`.** cairn's own shipped `.d.ts` files import named types
(`D1Database`, `R2Bucket`, `RateLimit`, and others) directly from this package, so a site needs it
installed as a `devDependency` even when it generates its own binding types with `wrangler types`,
the now-recommended replacement for installing `@cloudflare/workers-types` directly. Without it, a
`skipLibCheck: true` project, a common default, silently loses every cairn-typed binding signature
to an unresolvable-import `any`, with no red `TS2307` to flag the gap.

**`vite`.** The package declares no `vite` peer dependency, so this table names no target for
it. The showcase builds on Vite 8. That is a fact about the engine's own toolchain; the gate does
not track it.

**TypeScript is held at `^6`.** The floor a consumer's own `tsc` needs comes from `const` type
parameters on the public surface. `defineAdapter`, `defineConcept`, `fieldset`, and every
`fields.*` constructor capture their argument with a `const` type parameter, so the call site's
literal types (`required: true`, a `select` option union) survive into the inferred descriptor.
That floor is TypeScript `5.0`; cairn's own code and its shipped `.d.ts` files are already
TypeScript 7-clean. The `^6` target above is a separate, higher number: it is what the scaffolded
template installs, and it is held there because three tools in cairn's own build still pin
`typescript` to 6: `svelte-check`, which type-checks a consumer's site and cairn's shipped
declarations; `svelte2tsx` under `@sveltejs/package`, which builds the shipped `.d.ts`; and
`typescript-estree` under `eslint-plugin-tsdoc`. TypeScript 7.0 shipped without a programmatic
compiler API, and 7.1, the first release that adds one, is expected in October 2026. The `^6`
target moves on a release whose changelog carries a `Consumers must:` line, once the compiler API
ships and the pin is verified.

**`node` `>=24`.** This is a build-toolchain floor. The package runs on Cloudflare Workers, whose
runtime is `workerd`, never Node. CI's Node 24 pin follows the same floor, which is evidence
about the engine's own tooling rather than about a consumer. The consumer-facing floor comes from
Vite 8 and SvelteKit 2, both of which already require a current Node to build; the `engines.node`
field in `package.json` gives npm something to check against. That check is a warning, not an
install block: `npm install` on an older Node prints an `EBADENGINE` notice naming the mismatch,
and installs anyway, unless the consumer's own `.npmrc` sets `engine-strict=true`, which turns
the same mismatch into a hard install failure.

## TypeScript module resolution

The package is ESM-only, with a conditional `exports` map and no legacy `main` or `types`
fallback field. A consumer's `tsconfig.json` needs a `moduleResolution` of `node16`, `nodenext`,
or `bundler` to resolve it. Only `bundler` is proven end to end here: the showcase's own
`tsconfig.json` sets it, with a comment explaining why. `node16` and `nodenext` resolve an
ESM-only conditional `exports` map by TypeScript's documented rules, and cairn does not exercise
them.

## What `attw` reports about this package

`check:package`'s `attw --ignore-rules no-resolution cjs-resolves-to-esm
internal-resolution-error` mutes three rules deliberately. Each is a structural limitation of
`svelte-package`'s output against `attw`'s resolver, not a masked defect: `svelte-package` ships
`.svelte` and `.css` re-export specifiers that `attw`'s resolver cannot follow without the Svelte
language plugin, and the package is ESM-only by design, so a CJS-resolution check does not apply.
An `attw` report against the package reflects these three structural gaps, not a defect a consumer
needs to work around.

## The `checkOrigin` deprecation

SvelteKit deprecated `csrf.checkOrigin` in 2.61, in favor of `csrf.trustedOrigins`, but has not
removed it ([sveltejs/kit#15992](https://github.com/sveltejs/kit/issues/15992)). Read
"deprecated" as exactly that, not "unsupported": cairn's admin CSRF ownership still depends on
disabling `checkOrigin` (see [Disable checkOrigin](../extend/build-a-site-by-hand.md#wire-the-dev-backend-and-the-csrf-handoff)),
and the current SvelteKit range in this matrix still ships it. This table does not track the
removal; the linked issue is where it will be announced.
