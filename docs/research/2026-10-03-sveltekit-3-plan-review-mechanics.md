# SvelteKit 3 plan review: mechanics and feasibility lens

Target: `docs/superpowers/plans/2026-10-03-sveltekit-3-upgrade.md` at HEAD `27b254ac`. Lens: will each
task build and end green in the order given, verified empirically or by quoted source.

## Method and probe

Scratch lives under `~/.cache/kit3-plan-review/`. Nothing in the repo was touched except this file.

- `repo/`: a `git clone` of HEAD with `node_modules` linked to the main checkout. I ran `npm run
  package`, then `VITE_CAIRN_E2E=1 npm run build` of the showcase on Kit 2.70.3 / adapter 7. Then I
  ran `wrangler dev --var CAIRN_DEV_BACKEND:1` (wrangler 4.135.0, the showcase's installed copy).
  This is Task 5's host, built ahead of time.
- `repo/examples/showcase/src/members/dev-wiring.ts` was patched to Task 5's shape: no `MEMBER_DB`
  double, only the flag stamp. `wrangler d1 migrations apply MEMBER_DB --local` ran
  non-interactively. Output:
  `0000_channel.sql │ ✅`.
- I ran the whole showcase e2e suite against that host through a scratch Playwright config
  (`pw-wrangler.config.ts`, webServer `npx wrangler dev --port 4418 --var CAIRN_DEV_BACKEND:1`).
  Then I ran the same build under the stock `vite preview` config for parity.
- `repo2/`: Task 3's shape applied on Kit 2.70. The config moved into `sveltekit({...})`,
  `svelte.config.js` was deleted, `imports` gained `#lib`/`#chassis`/`#theme` with their `/*` forms,
  and every `$lib`/`$chassis`/`$theme` specifier was rewritten.

### What the probe proved works (no finding)

- **The dev gate under workerd.** Before the patch, `/admin` died inside `membersDevHandle` with
  `TypeError: Illegal constructor at createChannelDb`. That handle is reachable only inside
  `if (__CAIRN_DEV_BUILD__ && devBackendOptIn())`, so `--var` delivery reaches `process.env` and the
  gate opens. The `node:sqlite` fact also reproduces.
- **Both host names for Task 9's cross-origin pair.** `wrangler dev` (default `--ip`) listens on
  `127.0.0.1:4418` and `[::1]:4418`, and `/admin` answers on `localhost`, `127.0.0.1`, and `[::1]`.
- **The suite on the new host.** Under `wrangler dev`, 307 passed and 31 failed (13.7m):
  - 20 `site-visual` failures: site home and archive page 2 at all five widths, light and dark. This
    is exactly the durable-gotchas set this workstation cannot reproduce ("the 20 home and archive2
    files"). No admin-visual or other visual spec failed, so the host move does not shift paint, and
    the CI-canonical baselines should hold. CI at the S2 boundary stays the real proof.
  - 8 `preview.spec.ts` failures, also red under `vite preview`. They are environmental: another
    process holds `[::1]:4173`, and minted links use `PUBLIC_ORIGIN` `http://localhost:4173` from
    `wrangler.jsonc` `vars`. Not host-related.
  - `media-library.spec.ts:189`, host-specific (PM1).
  - `spellcheck.spec.ts:20` and `tidy.spec.ts:20`, which timed out waiting for the seed post's list
    link in the full run and pass in an isolated rerun on the same host (see "Parity run" below).
- **Subpath imports on Kit 2.70 (Task 3).** In `repo2`, `npm run check` reported
  `COMPLETED 811 FILES 0 ERRORS 0 WARNINGS`, and the default `npm run build` exited 0 with 96
  prerendered files. Kit 2.70.3's `sveltekit(config)` takes inline config
  (`src/exports/vite/index.js:150-174`), and `svelte-kit sync` loads it through
  `load_config_from_vite` (`src/core/config/index.js:131`). Task 3's fallback is unlikely to fire.
- **Kit 2.70.0 floor.** The 2.70.0 tarball declares `$app/env` (`types/index.d.ts:3184`) and
  `refreshAll` (`:3364`), so Task 2's dist imports stay valid across the whole `^2.70` peer range.
- **`@sveltejs/package` 3.0.0 on Kit 2.70 (Task 4).** It has no kit peer: its peers are svelte and
  `typescript ^6.0.0`, and the root pins `^6.0.3`.
- **Every named gate command exists.** That covers `cairn-run-gate`, every npm script the plan names,
  `make -C tool check` (target at `tool/Makefile:56`), and the `create-cairn-site` workspace test. The
  light lane is used only for browserless gates (T, D, S, and Task 10's unit/check gate).
- **Kit 3's warning grep matches.** Warnings print their code first
  (`src/messages/internal/build.js` `format(code, message)`), so a grep for
  `config_option_deprecated` matches.

## Correctness gaps, ranked by consequence

### PM1 (high). Adapter 7's Cache API layer makes Task 5's suite red under `wrangler dev`

Location: plan `:394-434` (Task 5 acceptance "whole existing showcase e2e suite is green").

Evidence: `media-library.spec.ts:189` fails reproducibly on the new host. It failed both in the full
run and in an isolated four-spec rerun:

```
Error: expect(received).toBe(expected)   Expected: 404   Received: 200
  230 |     expect((await request.get(deliveryPath)).status()).toBe(404);
```

The same spec passes under `vite preview` on the same build. The cause is in adapter 7's built
`_worker.js`, which `vite preview` never runs and `wrangler dev` does:

```js
// worktop/cfw.cache
var s = caches.default;
...
let res = !pragma.includes("no-cache") && await r2(req);   // serve from cache first
...
return pragma && res.status < 400 ? c(req, res, ctx) : res; // cache any response with Cache-Control
```

The `/media` route sets `Cache-Control: public, max-age=31536000, immutable`
(`src/lib/sveltekit/media-route.ts:36`). The first GET caches the object, and after the orphan delete
the cached 200 still answers. Miniflare persists that cache under `.wrangler/state`, so a stale entry
can also cross local runs. Adapter 8's `files/worker.js` has no `caches` use, so the spec would go
green again at S4. The S2 boundary, though, must be green on adapter 7.

Proposed fold: Task 5 names the defect and its fix. The post-delete probe in
`media-library.spec.ts` sends `Cache-Control: no-cache`, which the adapter honors (it skips the cache
read). That asserts the R2 state, which is what the spec claims. Alternatively, the webServer starts
from a fresh `--persist-to` directory. Add `examples/showcase/e2e/media-library.spec.ts` to Task 5's
Files.

### PM2 (medium, OWNER FORK on the remedy). Adapter 8 silently drops edge caching of worker responses

Location: plan Task 11 `:645-679` and Task 13 CHANGELOG `:791-793`. The spec and the survey say
nothing about it; `grep -i cache` hits neither.

Evidence: the same quotes as PM1. Under adapter 7, every response carrying `Cache-Control` without
`private`/`no-cache`/`no-store` goes into `caches.default` at the colo. That covers `/media`'s
immutable bytes and any SSR page a site marks public. Adapter 8's worker
(`~/.cache/kit3-research/cf/package/files/worker.js`) serves static assets through
`env.ASSETS_BINDING` and dynamic responses through `server.respond(...)`, with no cache layer. After
the bump, every `/media` hit reads R2 and every public SSR page re-renders. Consumers see this as
latency and cost, and no `Consumers must:` line or fact discloses it.

Proposed fold: at minimum, Task 13 adds a fact bullet and a CHANGELOG or migration-notes line saying
adapter 8 no longer caches worker responses. The OWNER FORK is whether the engine's media route
should `caches.default.put` its own immutable responses. That is new engine behavior, a scope
question for the charter, not this lens.

### PM3 (high). The dev flag never reaches the worker in the repointed `preview` callers, and a persistent `.dev.vars` poisons default builds

Location: Decision 3 `:141-145`; Task 5 `:408-411` (".dev.vars or --var"); Task 6 `:436-463`;
Close step 5 `:847-853`.

Evidence:

1. **An OS env var does not reach workerd.** The probe's wrangler banner lists only
   `wrangler.jsonc` vars and `--var` entries
   (`env.CAIRN_DEV_BACKEND ("(hidden)") Environment Variable local` appears only with `--var`). Every
   flagged caller that Task 6 moves passes the flag as an OS env var, which reaches `vite preview`'s
   Node process but not workerd: `norms.yml:55` and `:94`
   (`CAIRN_DEV_BACKEND=1 nohup npm --prefix examples/showcase run preview`), `theme-fixture.mjs:66`
   (`SITE_ENV = {..., CAIRN_DEV_BACKEND: '1'}`), and the instructions in
   `generate-norms-manifest.mjs:127`, `probe-vertical-alignment.mjs:49`, `capture-surfaces.mjs:294`,
   and `docs/reference/cairn-audit.md:693`.
2. **Without the flag, the failure is silent.** The guard mounts and `/admin/posts` redirects to
   login. `norms.yml`'s readiness loop is `curl -sf -o /dev/null http://localhost:4173/admin/posts`,
   and `-f` fails only at 400 or above, so a 30x passes the readiness check. `norms:check` then
   measures the login page.
3. **The flag cannot live in the shared `preview` script or a lingering `.dev.vars`.** A default
   build serves the guard, and the guard refuses every request when the flag is set
   (`guard.ts:195-200`):

   ```ts
   if (isDevBackendFlagSet(platformFlag) || isDevBackendFlagSet(processFlag)) {
     log.error('guard.refused', { reason: 'dev_backend_in_prod', path: pathname });
     return new Response(CAIRN_DEV_BACKEND_MESSAGE, { status: 503 });
   }
   ```

   If Task 5 picks `.dev.vars` (the showcase `.gitignore` already ignores it), the file outlives the
   e2e run. Every later `npm run preview` or `wrangler dev` of a default build in that checkout then
   returns 503. That includes the close's live smoke, which requires "dev backend off". A Waymark
   site would inherit the same trap if `preview` embedded the flag.

Proposed fold:

- Decision 3: `preview` stays flag-free, serving `wrangler dev` on the build output.
- Task 5: prefer command-scoped `--var CAIRN_DEV_BACKEND:1` over a written `.dev.vars`. If the spike
  finds only `.dev.vars` works, write it per run and delete it on exit.
- Task 6: every flagged caller passes `-- --var CAIRN_DEV_BACKEND:1`. Its acceptance asserts that
  each flagged readiness probe gets `200` from `/admin/posts`, not a redirect (for example
  `curl -sf --max-redirs 0`).
- Close step 5: precondition that no `.dev.vars` in the showcase carries the flag.

### PM4 (medium). Task 6's acceptance grep cannot print nothing

Location: plan `:445-446`, `:453-455`.

Evidence: the pattern `vite preview\|run preview\|'preview'` must print nothing outside records. But
Decision 3 routes callers through `npm run preview`, so the moved callers themselves match. The
pattern also matches unrelated live text:

- `EditPage.svelte` `'write' | 'preview'` mode strings;
- `examples/showcase/src/routes/(site)/styleguide/+page.svelte:117` (`id: 'preview'`);
- `examples/showcase/src/content/posts/2026-04-05-the-reading-surface.md:89` (`npm run build && npm
  run preview`, a site-generic command that stays valid);
- `packages/create-cairn-site/test/fixtures/transcripts/01d-resume.txt:629`;
- `scripts/checks/check-symbols-allowlist.mjs:17`.

An implementer either fails the acceptance or rewrites correct text.

Proposed fold: the acceptance grep becomes `vite preview` plus the broken env-prefix form
(`CAIRN_DEV_BACKEND=1 [^|]*run preview`), excluding records, with named survivors listed in the
report.

### PM5 (medium). `check:chassis-boundary` goes vacuous after `#chassis`, and no task gate notices

Location: Task 3 Files `:330-336`.

Evidence: `scripts/checks/check-chassis-boundary.mjs:76` reads:

```js
return spec.startsWith('$chassis/') || /(^|\/)chassis\//.test(spec);
```

`#chassis/foo.js` matches neither branch. After Task 3, every theme reach-in through `#chassis` goes
unchecked, and the gate stays green. The check runs only in `check:close`, not in F, so Task 3's gate
would not notice even a hard failure.

Related loose ends:

- `scripts/checks/check-public-skill.mjs:409-414` keeps a dead `$chassis`/`$theme`/`$lib` alias map.
  Vite resolves `#` imports from the showcase `package.json` without it.
- The canonical seam rule in `examples/showcase/src/chassis/README.md:10` and `:42` still says "the
  `$chassis` alias". The boundary script parses that README.

Proposed fold: add these to Task 3's Files:

- `check-chassis-boundary.mjs`: match `#chassis/`, and drop `$chassis/` per the debt-free constraint.
- The chassis README wording.
- `check-public-skill.mjs`'s alias map.

Acceptance: a scratch reach-in `import x from '#chassis/<unlisted>.js'` fails
`npm run check:chassis-boundary`, and the report quotes the red run.

### PM6 (medium). The close's live smoke cannot "commit" under Ruling 1

Location: Close step 5 `:847-853` ("a Save commits through the guard").

Evidence: the showcase backend is a placeholder,
`createGithubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2'
})` (`examples/showcase/src/theme/cairn.config.ts:149`). Ruling 1 says "No provisioning", so no App
key and no repo exist. With the dev backend off, a Save cannot land a commit.

Proposed fold: restate the Save evidence as the POST passing Kit's Origin check and the guard's token.
That means no Kit 403 and no `auth.csrf-token-invalid`, and the request reaches the commit path,
whose GitHub failure (the commit-failure log event with reason `error`) is the expected terminal
record.

### PM7 (low-medium). Task 2's `invalidateAll` grep-zero covers a `goto` option Kit 2.70 cannot rename

Location: Task 2 acceptance `:310-312`.

Evidence: `src/lib/admin/MediaUploadDialog.svelte:212` has
`await goto('/admin/media?uploaded=1', { invalidateAll: true })`. Kit 2.70.3's `goto` options are
`replaceState, noScroll, keepFocus, invalidateAll, invalidate, state` (`types/index.d.ts:3329-3336`),
with no `refreshAll`. Kit 3 adds `refreshAll?: boolean` and deprecates `invalidateAll` in that bag
(Kit 3 `types/index.d.ts:2583-2587`). On 2.70, `refreshAll: true` is a type error and a runtime no-op.

Proposed fold: Task 2's grep exempts the `goto` option. Task 11, whose grep-zero already includes
`invalidateAll`, renames it to `refreshAll: true`.

### PM8 (medium, the conductor's call). Task 11 is larger than one chain needs to be

Location: Task 11 `:622-721`; Models `:76-80`; ceiling `:31-37` (2.0M).

Evidence: HEAD counts.

| What | Count |
|---|---|
| `\.platform\b` in `src/lib` | 62 lines in 25 files |
| `platform` in `src/tests` | 154 lines in 42 files (52 are `platform:` literals, in 20 files) |
| `platform` in `examples/showcase/src` | 31 lines in 14 files |
| `App.Platform` | 31 occurrences |
| `CairnEvent<` | 31 occurrences in 9 files |

On top of those edits, the task adds a new fake and setup file, an import-graph checker, a
`satisfies` type test, two lockfile bumps, a from-scratch reinstall, the harness rerun, `emit:template`,
`check:surface -- --update`, and at least one F run with the 14-minute e2e.

The runtime core is truly atomic. Adapter 8's worker passes no platform
(`return await server.respond(req, { getClientAddress() {...} })`), so the bump and the `env` rewrite
cannot be separated. Two slices still land green outside it:

- **(a) Before the bump, on Kit 2.70.**
  - The two `members.spec.ts` bodyless POSTs gain a body; that is harmless on 2.70.
  - The guard's and the factory's `process.env` flag reads, plus `readPublicOrigin`'s fallback,
    retire. After Task 5 the flag already arrives on `platform.env`.
  - The unused `cloudflare:workers` fake and the per-project vitest alias go in.
- **(b) After the bump.** The public type re-expression moves: `CairnPlatformBindings` as an
  interface with its `satisfies` test, `CairnEvent` dropping its `Env` parameter, `PlatformContext`
  retiring, and the matching reference and `api-surface` edits. Kit 3's `RequestEvent` still declares
  an optional `platform` (spec "Evidence"), so the old type shapes compile for one more commit.

Proposed fold: split S4 into 11a (atomic runtime) and 11b (type surface), and move slice (a) into S3
or a small S4-prep task. That keeps each chain's diff reviewable by one `diff-reviewer` read. If the
conductor keeps Task 11 whole, raise its line to about 3M, since two F runs at the e2e's length are
plausible.

### PM9 (low). `--strictPort` breaks the theme fixture's serve under `wrangler dev`

Location: Task 6 (`scripts/lab/theme-fixture.mjs:150`).

Evidence: the fixture spawns `npm run preview -- --port N --strictPort`. Probe:

```
$ npx wrangler dev --port 4419 --strictPort
✘ [ERROR] Unknown argument: strictPort      (exit 1)
```

Task 6 owns the file, and `--build-only` still serves and smoke-loads pages, so the gate would catch
it. Naming it saves a fix round.

Proposed fold: Task 6's notes say that `wrangler dev` takes `--port` but not `--strictPort`. The
fixture's own `listening(PORT)` pre-check already covers the strict-port intent.

### PM10 (low). Task 5 names an e2e "width matrix" that `e2e.yml` does not have

Location: plan `:404`, `:414`.

Evidence: `e2e.yml` has no `matrix:`. The width sweep lives in the specs (`site-visual.spec.ts`), and
both the e2e step and `update_snapshots` run `npm --prefix examples/showcase run test:e2e`
(`e2e.yml:124`, `:134`). The playwright `webServer` change therefore carries CI with it, and
`e2e.yml` likely needs only comment edits. The pre-flight would catch this. Recorded so it does not
spawn a phantom edit.

## Over-ceremony, ranked by cost

### OC1. The docs gate re-runs what `check:docs-gate` already runs

Location: Gates `:101`.

`check:docs-gate` already runs `check:docs`, `check:vale`, `check:facts`, `check:reference`, and
`check:reference:signatures` after one `npm run package` (`scripts/checks/docs-gate.mjs:55-100`). D
then runs each again. `check:reference`, `check:reference:signatures`, and `check:surface` each start
with their own `npm run package`, so D packages four times.

Fold: D = `npm run check:docs-gate && npm run check:surface && npm run check:rulings-format`.

### OC2. Spike item 3 is mostly answered

Location: Task 1 `:261-264`.

This review's probe booted the Kit 2.70 / adapter 7 e2e build under `wrangler dev`. It used `--var`
delivery and local D1 `MEMBER_DB` migrated from `migrations-members`, and ran the whole suite. Only
`.dev.vars` delivery is unprobed. Fold: item 3 narrows to the `.dev.vars` question and PM1's cache
handling, or adopts `--var` per PM3 and drops the question.

### OC3. The fresh-agent harness rerun in Task 1's acceptance is an extra dispatch

Location: Task 1 `:282-283`.

Task 11 and the close both rerun the committed harness against real tarballs. A third run by a fresh
agent in S0 adds a dispatch for little marginal proof. This is optional; keep it only if the conductor
values catching a non-portable harness at S0 rather than S4.

## Parity run

The full suite under the stock `vite preview` config, on the same build, is recorded below. It settles
whether the `spellcheck`/`tidy` timeouts in the `wrangler dev` full run are host-related.

Under `vite preview`, 308 passed and 30 failed (13.5m). The failures were the same 20 `site-visual`
files, the same 8 `preview.spec.ts` cases, and `spellcheck.spec.ts:20` and `tidy.spec.ts:20`. The
spellcheck and tidy timeouts are therefore order-dependent in a full run on this workstation under
either host, and both pass in isolation. They are not a host effect.

Under `wrangler dev` the suite had one more failure than this parity run:
`media-library.spec.ts:189` (PM1). That is the only behavioral difference the host move introduces
on Kit 2.70 / adapter 7.
