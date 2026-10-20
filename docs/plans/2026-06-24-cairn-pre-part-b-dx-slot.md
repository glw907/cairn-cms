# Pre-Part-B DX slot

The small, targeted DX fix-up the scaffolder spec sequences immediately before Part B, for the known
engine warts the template would otherwise bake in. Investigated and implemented 2026-06-24 on
`feat/pre-part-b-dx` (off `main` at `0.63.0`), shipped as `0.64.0` (held). It had no pre-written plan;
it was driven from the spec by two workflows (a parallel investigation, then a serial
implement-and-verify), plus a best-practices research pass and an adversarial review of the one
public-API proposal. This file is the post-mortem and the record of the one design reversal.

## The three items the spec named, and what each became

The spec named three: the `AuthEnv` root re-export, the `media.json` graceful-degrade, and the
`runtime.publicMediaResolver` ergonomic. Investigation reshaped all three.

**1. `AuthEnv` root re-export: already done.** The friction-log entry was stale and backwards. `AuthEnv`
has always been root-exported (`src/lib/index.ts:4`) and was re-exported from `/sveltekit` on 2026-06-13
(commit 61842ae); both reference pages carry it and the deploy guide shows the verbatim `app.d.ts` block.
The entry duplicated an accurate 2026-06-12 one. The stale bullet was retired; no engine change.

**2. `media.json` graceful-degrade: a consumer static-import crash, fixed with a reusable engine helper.**
The engine's `parseMediaManifest` already degrades a missing manifest to `{}`, but the showcase's bare
static `import media.json` fails the Vite build (module-not-found) before that ever runs, so a fresh site
crashes. Added `readCommittedManifest(globResult)` (exported from `/media`): it parses an
`import.meta.glob` result, which returns `{}` for an absent file instead of crashing. The showcase reads
its manifest through the glob plus the helper, and a manifest-less build verifiably succeeds. The
template seed inherits the no-crash read, removing the seed-empty-file workaround.

**3. `runtime.publicMediaResolver`: dropped after an adversarial review found it regresses the
architecture.** This is the design story of the slot.

## The publicMediaResolver reversal

The friction log asked for a `runtime.publicMediaResolver` to subsume "three wire-points." A
best-practices research pass produced a careful additive design (an optional runtime member, derived in
`composeRuntime` from a new `ComposeInput.mediaManifest`). An adversarial review, verified first-hand
against the import graph, then dismantled it:

- The "three wire-points" was two, both in the prerender graph, already sharing one `cairn.config`
  export. The `/media` route reads `runtime.resolvedAssets`, not the resolver. The "wire once" win was
  mostly already banked.
- `composeRuntime` is called once, on the Worker side (`cairn.server.ts`). The research assumed two
  calls (a public and a Worker composition); there is one. Moving the resolver onto the runtime would
  force the prerendered `(site)` route to import `cairn.server`, pulling the admin and dev-backend graph
  into a prerendered page-server module. The proposal inverted the prerender/Worker boundary it claimed
  to protect.
- The comment everyone cited ("kept out of the runtime Worker," `public-routes.ts`) is about the content
  `SiteResolver`, not the media manifest. The premise was a misread.

So the runtime member was dropped. The real wart behind the friction-log item is the silent-broken-images
failure (the ecxc 0.57.0 HIGH finding): a site that configures media on but forgets the `resolveMedia`
wiring ships bare `media:` tokens with no signal. The fix is diagnosis, not a convenience member: a
`media.resolver_absent` warn event, emitted once at `createPublicRoutes` construction when
`assetsEnabled && !resolveMedia`. `createPublicRoutes` is in the prerender graph and carries no runtime,
so "media on" enters as an explicit `assetsEnabled` boolean a site threads from its config. The showcase
threads it, so the diagnostic ships armed in the template seed.

The lesson: the adversarial review caught a public-API change that would have shipped to two production
sites and inverted the architecture. The research alone did not, it accepted the boundary premise; the
red-team, forced to read the import graph, found the premise was false. Do not re-propose a
`runtime.publicMediaResolver`.

## Shipped (`0.64.0`, held)

Six commits on `feat/pre-part-b-dx`: `readCommittedManifest` plus the showcase glob read, the
`media.resolver_absent` event plus `PublicRoutesDeps.assetsEnabled`, the friction-log cleanup, the
showcase `assetsEnabled` threading, the code-simplifier co-location of the manifest read, and the release
consolidation. All additive, no consumer action required.

## Verified

`npm run check` 1147 files 0/0, `npm test` 229 files / 2482 tests EXIT 0, all four doc gates. The
load-bearing check: a showcase build with `media.json` removed succeeds (the fresh-site crash is genuinely
fixed, which no unit test catches). Dev-backend non-regression holds (the default `build/` grep is empty).

## Carry-forwards

- **The real sites arm the diagnostic at cutover.** The `media.resolver_absent` event fires only for a
  site that threads `assetsEnabled`. The showcase and template seed it; ecxc-ski and 907-life thread it at
  their next per-site cutover.
- **Part B is next:** the showcase-to-deployable-template factoring, with the `frontend-design` pass and
  the first-class tokens layer.
