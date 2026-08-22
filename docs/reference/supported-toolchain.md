# Supported toolchain

The versions the package promises against and the versions its own CI proves, in one gated table
plus the prose that explains each deliberate floor. This page names both, since they are
different claims: the package's `peerDependencies` are the promise a consumer's install resolves
against, and the showcase's `package.json` and `wrangler.jsonc` are what the engine's own test
suite and its scaffolded template actually run against. The two need not match, and where they
differ the gap is the safety margin between what is promised and what is exercised.

This page documents the package's own requirements rather than an export subpath, so it carries
no stability tier and the export-coverage gate does not check it. The target-stack table below is
its own gate, `check:target-stack`, which derives each `Target today` cell from the same source
the number actually comes from and fails when this page's table disagrees; a cell can only go
stale silently if that gate stops running.

## Framework and runtime

| Part | Target today | Where it's set | How often it moves |
|---|---|---|---|
| The cairn package | `0.95.0` | `package.json`, the `@glw907/cairn-cms` version | On a release whose changelog carries a `Consumers must:` line |
| Node, on your machine | `>=24` | `engines.node` in cairn's own `package.json` | Rarely, on Node's own Active LTS calendar |
| SvelteKit | `^2.70` | cairn's `peerDependencies` | Rarely, only when a feature needs a newer SvelteKit capability |
| Svelte | `^5.56.10` | cairn's `peerDependencies` | Rarely, on the same cadence as SvelteKit |
| Wrangler | `^4.125.0` | the template's `package.json`, set once when a site is scaffolded | Whenever Cloudflare ships a new Wrangler major |
| `@sveltejs/adapter-cloudflare` | `^7.2.9` | the template's `package.json` | Follows SvelteKit's own release line |
| The Workers `compatibility_date` | `2026-08-21` | the template's `wrangler.jsonc`, set once when a site is scaffolded | Moves forward when a new template pulls in a later date; a deployed site's own date never changes on its own |
| TypeScript | `^6` | the template's `package.json` | Held deliberately for now; see the note below |

**`@sveltejs/kit` `^2.70`.** The floor tracks the version cairn develops and tests against
(Geoff's 2026-08-21 ruling), so the engine may use kit's full current capabilities with no guard
for an older minor. The edit page's `$app/state` dependency, which forced the earlier `^2.12`
floor (the `0.51.0` changelog entry made that range an enforced consumer requirement rather than
an advisory), still holds; `^2.70` simply raises the floor to the installed line.

**`svelte` `^5.56.10`.** Same ruling: the floor is the version cairn develops and tests against.
The correctness history behind the earlier `^5.56.3` floor still stands underneath it: svelte
`5.56.1` miscompiles parenthesized boolean groupings, and a consumer compiles the package's
shipped `.svelte` sources directly, so a lower floor would let a broken svelte compile a broken
component.

**`vite`.** The package declares no `vite` peer dependency, so this table names no target for it.
The showcase's own lockfile pins a current Vite 8, which is a fact about the engine's own
toolchain, not a promise this gate tracks.

**TypeScript is held at `^6`.** The floor a consumer's own `tsc` needs is forced by `const` type
parameters on the public surface: `defineAdapter`, `defineConcept`, `fieldset`, and every
`fields.*` constructor capture their argument with a `const` type parameter so the call site's
literal types (`required: true`, a `select` option union) survive into the inferred descriptor.
That floor is TypeScript `5.0`; cairn's own code and its shipped `.d.ts` files are already
TypeScript 7-clean. The `^6` target above is a separate, higher number: it is what the scaffolded
template installs, and it is held there because three of the tools cairn's own build and a
consumer's own `check` script depend on still require TypeScript 6. TypeScript 7.0 shipped
without a programmatic compiler API, and 7.1 (the first release expected to add one) is not out
yet; `svelte-check`, the tool that type-checks a consumer's site and cairn's shipped
declarations, is one of the three, and cannot run on TypeScript 7 until that API lands. The `^6`
target moves the same way every row in this table does: on a release whose changelog carries a
`Consumers must:` line, once the compiler API ships and the pin is verified.

**`node` `>=24`.** This is a build-toolchain floor, not a runtime claim: the package runs on
Cloudflare Workers, whose runtime is `workerd`, never Node. CI's Node 24 pin follows the same
floor, which is evidence about the engine's own tooling rather than about a consumer. The
consumer-facing floor comes from Vite 8 and SvelteKit 2, both of which already require a current
Node to build; Node 24 is stated explicitly because it is already the published requirement in
[Build a site by hand](../extend/build-a-site-by-hand.md), and the `engines.node` field in
`package.json` now gives npm something to check against. That check is a warning, not an install
block: `npm install` on an older Node prints an `EBADENGINE` notice naming the mismatch, and
installs anyway, unless the consumer's own `.npmrc` sets `engine-strict=true`, which turns the
same mismatch into a hard install failure.

## TypeScript module resolution

The package is ESM-only, with a conditional `exports` map and no legacy `main` or `types`
fallback field. A consumer's `tsconfig.json` needs a `moduleResolution` of `node16`, `nodenext`,
or `bundler` to resolve it. Only `bundler` is positively proven end to end: the showcase's own
`tsconfig.json` sets it explicitly, with a comment explaining why. This page does not assert
that `node10` or the classic resolution mode fails; that is sound general TypeScript behavior,
but it is unproven in this repo and not worth a probe to publish.

## `check:package`'s muted `attw` rules

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
and the current SvelteKit range in this matrix still ships it. A scheduled routine watches the
upstream issue for the eventual removal; this table does not.
