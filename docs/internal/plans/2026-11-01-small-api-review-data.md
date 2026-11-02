# small-api plan review: data integrity and failure risk

Reviewed the plan and design note at `90f3f3c8e`, reading the code each task changes and the four sites'
checkouts (`aksailingclub-org`, `907-life`, `ecxc-ski`, `cairn-pub`). "Plan" below means
`docs/internal/plans/2026-11-01-small-api-plan.md`. Nothing here was executed; the code paths were read.

**Verdict:** no finding loses or corrupts stored data. No task changes what's written to a site's repository,
D1, or R2. The risks are silent degradation after an upgrade, a message contract change, one lost refusal, and a
merge that can undo a sibling's fix. 0 blockers, 6 major, 14 minor. No owner forks.

## Findings

### 1. major, `correctness`: a missed `components` rename publishes a site with no blocks, and the build stays green

- **Location:** plan:263-269 (T14); `src/lib/render/pipeline.ts:155`; `src/lib/render/remark-directives.ts:65`; `src/lib/content/adapter.ts:14`; `src/lib/admin/CairnAdmin.svelte:94`.
- **Defect:** `createRenderer` reads `config.components ?? defineRegistry({ components: [] })`. After T14 it reads `config.blocks`, so a call still passing `components` gets an empty registry and no error. Every `:::name` directive then goes unstamped, its `build()` never runs, and the page publishes without the block. `rendering.components` fails the same way: the insert palette goes empty, and the islands check throws only for a site with `rendering.islands`. All four sites' `build` script is `vite build`, which doesn't type-check, so only `svelte-check` sees the stale key. The repository content stays intact, but the public site degrades on deploy with no signal. `ergonomics.md` item 6 records this failure class. The sites' calls at their pins (`createRenderer(registry, { ... })`, `cairn-pub/src/theme/cairn.config.ts:359`, `aksailingclub-org/src/theme/cairn.config.ts:32`) reach the same fallback against today's one-argument signature, so a rebuild can hit it either way.
- **Fold:** add to T14: `createRenderer` throws when `'components' in config` or `'defs' in config`, and `defineAdapter` throws on `rendering.components`, each naming `blocks`. Test both. This is a refusal, not a shim, so it stands with the "no shim" answer, and it matches `resolveRouting`'s fail-loud posture at the same kind of config boundary. Keep the refusal if the riders are set aside.

### 2. major, `correctness`: appending the remediation changes messages editors read

- **Location:** plan:208 (T8); `src/lib/diagnostics/error.ts:12`; `src/lib/nav/site-config.ts:34-39,223,297-302`; `src/lib/sveltekit/nav-routes.ts:148`; `src/lib/sveltekit/content-routes-settings.ts:297,417`.
- **Defect:** T8 appends `resolved.remediation` to every `CairnError` message. `NavValidationError`, `TidyConventionsError`, and `SiteConfigError` extend `CairnError`, and three actions return `err.message` to the browser through `fail(400, { error: message })`. A bad nav save or a duplicate tag would then show an editor text such as "Correct site.config.yaml; the parse or validation error names the failing field or URL-policy rule." The comments at both sites call these strings engine-authored and safe to surface. T8's acceptance checks only for secrets, and its file list omits the tests that pin these strings. The remediation holds no secret, since it's static registry text, so this is a client-visible contract change, not a leak.
- **Fold:** keep the three subclasses' messages exact. Add `{ remediate: false }` to `CairnError`'s options, passed by those three constructors, or apply the append only at the operator throw sites (`env.ts`, `email.ts`, `auth/store.ts`, `github/credentials.ts`). Add acceptance: an invalid nav save and an invalid vocabulary save return today's exact string.

### 3. major, `correctness`: an optional `resolveDb` can lose the fail-closed refusal, and the plan names no mechanism that stops it

- **Location:** plan:73, plan:162, plan:165 (T4); `src/lib/sveltekit/section-action.ts:50,125-126,347-348`.
- **Defect:** the guards are safe: the access-map check, authorization, CSRF, and audit all run before the new branch, and the set case keeps its order. Two holes remain. First, `createSectionAction<Env, D1Database>({})`, the explicit-argument form every taught recipe and `club-action.ts:45` use, must not compile, but one optional member would leave `ctx.db` typed `D1Database` while it's `undefined` at runtime. The handler then throws a raw `TypeError` with no `db_not_bound` audit or log. Second, a value that's present but undefined (`resolveDb: pickResolver()`) silently means "no database". A mistyped key in an object literal is caught by the excess-property check only if the type stays exact. The standing answer at plan:73 makes this worse: an optional `ctx.db` breaks `ctx.db.prepare` at every bound site, and invites `ctx.db?.`, which turns a missing binding into a silent no-op.
- **Fold:** specify two overloads: `createSectionAction<Env>(config: { resolveDb?: undefined; rateLimit? })` with no `db`, and `createSectionAction<Env, Db>(config: { resolveDb: ...; rateLimit? })` with `db: NonNullable<Db>`. At runtime, branch on `'resolveDb' in config`, so a present undefined value refuses with `db_not_bound`. Add `@ts-expect-error` on `createSectionAction<Env, D1Database>({})`. Replace the standing answer: if the overloads fail, keep `resolveDb` required and set ergonomics 13 aside, which plan:68 allows, rather than type `ctx.db` optional. A site then has no public no-database door once E4 lands, so record that under `## Decisions`.

### 4. major, `correctness`: T8's JSON sink turns about 50 test files' console records into strings

- **Location:** plan:209-212 (T8), plan:8 (cut order); `src/lib/log/create.ts:122-126`; for example `src/tests/integration/auth-request.test.ts:407,429`.
- **Defect:** vitest runs under Node, so `navigator.userAgent` isn't `Cloudflare-Workers` and the new sink prints a string. 51 test files spy on `console.log`, `warn`, or `error`, and tests such as `auth-request.test.ts` read `c[0].event` off the object. T8 lists three test files and 20 minutes. The fallout hits `auth-data` suites, where a test that filters by `.event` can stop matching and fail far from the cause. The plan also says the logger test stubs `navigator` both ways, which needs the sink to choose per emit, not at module load, and `sinkByLevel` is a module constant today.
- **Fold:** choose per emit inside `emit`. Stub `navigator.userAgent` to `Cloudflare-Workers` in the shared vitest setup, so every existing suite keeps object records and only `log/create.test.ts` exercises the Node path. List the setup files, including the showcase and dev package projects. This is ergonomics 21, first in the armed cut order, so if the setup stub doesn't hold, cut it there rather than rewrite 50 files. No site test reads records this way: `aksailingclub-org/src/tests/club-action.test.ts` has no console spy.

### 5. major, `correctness`: the merge answer covers `preview.ts` but not the file where #122's order lives

- **Location:** plan:78-79; `src/lib/sveltekit/content-routes-preview.ts:61-70,89`; `src/tests/integration/content-routes-preview.test.ts`; admin-rest plan T3 (#122).
- **Defect:** admin-rest moves `requireOrigin` ahead of `mintPreview` and rewrites the trade comment above line 70. T5 rewrites line 70 itself. Both also edit `content-routes-preview.test.ts`: T5 changes about 11 four-argument calls and removes the TTL cases, and admin-rest adds its #190 and #122 tests. Taking T5's side of that hunk restores the old order, so an orphan token row returns with no compile error, and taking T5's side of the test file can drop the test that would catch it. If admin-rest merges second, its new tests call `mintPreview(runtime(), {}, event, target)` against a three-argument function, and `{}` lands in `event`. Vitest doesn't type-check, so a loosely asserted test can pass or fail for the wrong reason.
- **Fold:** extend the standing answer: "`content-routes-preview.ts` and `content-routes-preview.test.ts` beside admin-rest: whichever lands second keeps `requireOrigin` before the mint, keeps admin-rest's #122 and #190 tests, and moves them to the three-argument call. After the merge, `npm run check` and the test 'With no `PUBLIC_ORIGIN`, the mint writes no `preview_tokens` row' must pass."

### 6. major, `correctness`: T5's acceptance grep can't pass, and points at an `auth-data` file

- **Location:** plan:178; `src/lib/github/signing.ts:133,141`.
- **Defect:** `git grep -n "ttlMs\|buildNewlyPublished" -- src/lib skills .claude/skills` must print nothing, but `ttlMs` is also the GitHub installation-token cache parameter in `signing.ts`. An executor working to the gate either stalls or renames a parameter in the signing path, which T5 doesn't scope.
- **Fold:** grep `PreviewTokenConfig|resolveTtlMs|buildNewlyPublished`, and drop the bare `ttlMs`, or exclude `':!src/lib/github/signing.ts'`.

### 7. minor, `correctness`: stale `loadPreview` and `loadHealth` calls fail only at runtime

- **Location:** plan:174,177,180 (T5); `src/lib/sveltekit/preview.ts:435-436`; `src/lib/sveltekit/health.ts:208-210`; `examples/showcase/src/routes/healthz/+server.ts:19-28`.
- **Defect:** a mis-ordered call is a compile error, but only under `svelte-check`: `vite build` passes, and both routes set `prerender = false`, so no build exercises them. At runtime, an old `loadPreview(runtime, config, event)` throws on `event.setHeaders`, its first statement, and answers 500. It exposes nothing but sends none of the `noindex` and `no-store` headers. An old `loadHealth(event, runtime)` destructures `runtime` to `undefined`, throws, and the route answers its fixed 503, which reads as a failed signing check, not a wiring fault, and can trip a deploy gate or an uptime alert.
- **Fold:** the `Consumers must:` line says to run `npm run check` because `vite build` won't catch this, and names both routes. No code change.

### 8. minor, `correctness`: T5's test claims and file list don't match the suites

- **Location:** plan:176-177; `src/tests/integration/preview-load.test.ts` (about 25 call sites); `src/tests/integration/content-routes-preview.test.ts:140-228`.
- **Defect:** "The token flow's refusal tests pass unchanged" can't hold, since every refusal test calls the old signature. Neither file is in T5's list. The TTL tests at `:157` and `:171` must go, and they're the nearest pin on lifetime.
- **Fold:** list both files. Say "pass with only the call shape changed". Replace the removed tests with one asserting `expiresAt` is seven days out, so the fixed default stays pinned.

### 9. minor, `correctness`: T4's `isDev` conditional already resolves, and the design says the opposite

- **Location:** plan:161; design:46-49; `src/lib/sveltekit/admin-action.ts:97-116,249,357`; `src/tests/unit/admin-action.test.ts:423-454`.
- **Defect:** removing `access` and `isDev` changes no production path: `section-action.ts:232` passes neither, so `dev` equals `DEV` today. But five tests set `isDev`, so the plan's "goes if nothing else sets them" resolves to keep, while the design says `AdminActionOptions` loses it. Keeping it leaves a public type whose one member exists for tests. Read literally, deleting `const dev = deps.isDev ?? DEV;` also removes the `DEV` read that decides throw against `admin.action.unaudited`.
- **Fold:** decide it: remove `deps` and `AdminActionOptions`, write `if (DEV) throw`, and drive both branches with `vi.mock('esm-env')`. Delete the `deps.access` tests, since `section-action` tests cover `authorizeAdminTarget`.

### 10. minor, `correctness`: moving off `createAdminAction` adds an access-map requirement

- **Location:** plan:161-163,167; `src/lib/sveltekit/admin-action.ts:226-238,330-337`.
- **Defect:** without `access`, `createAdminAction` authenticated and authorized nothing. `createSectionAction` refuses any target with no map rule, and the zero-config guard attaches an empty map, so a moved action answers 403 for everyone, owner included. None of the four sites imports it, so the risk is to an outside site and to the new recipe.
- **Fold:** the `Consumers must:` line and the `custom-screen.md` recipe say the replacement needs an access-map rule for its target.

### 11. minor, `optional`: a stale `spellcheck:` key gets a generic message, and `cairn doctor` passes it

- **Location:** plan:219,221 (T9); `src/lib/nav/site-config.ts:321-329,355-361`; `examples/showcase/src/theme/site-config.ts:10`; `tool/internal/doctor/siteconfig.go:66`.
- **Defect:** see "T9 `spellcheck`" below for where it throws. The build refuses, which is right, but "unrecognized key" with the key list doesn't say the block was retired, and the doctor's narrowed predicate reports the file healthy.
- **Fold:** add a `spellcheck` entry to `ADAPTER_MISPLACEMENTS` saying to delete the block. Leave the doctor alone.

### 12. minor, `optional`: `includeSubDomains` removal needs its one consequence stated

- **Location:** plan:217,221; `src/lib/sveltekit/admin-response.ts:15-22,56-68`.
- **Defect:** for a site that had opted in, the next guarded admin response replaces a browser's cached policy with `max-age` only (RFC 6797 section 8.1), which unpins subdomains for that browser. No known site set it. The rationale at `:15-22` and `:61-67` also stops applying once there's no opt-in, though `omitHsts` still works and should stay.
- **Fold:** the `Consumers must:` line says subdomain pinning now belongs at the zone. Keep `omitHsts` and its behavior, and reword its reason.

### 13. minor, `optional`: `JSON.stringify` changes what a Node log record can carry

- **Location:** plan:209,212; `src/lib/log/create.ts:53,88,156-167,185-191`.
- **Defect:** an `Error` or `Headers` value prints as `{}`, and a `BigInt` or a deep cycle makes `JSON.stringify` throw, so `emit` falls back to `fields: '<unserializable>'` and drops the record's fields. Keys below the three-level redaction cap also print in full, where Node's inspector used to truncate them. That matches what Workers Logs already stores, and the doc comment states the cap, so it's no new exposure. The engine's own records pass strings.
- **Fold:** T8 updates `createLogger`'s `@remarks` and `log-events.md` for these three behaviors. No code.

### 14. minor, `correctness`: the moved `chmod` must follow the dev package's `tsc`

- **Location:** plan:197,199 (T7); `package.json:36`.
- **Defect:** `package` runs `chmod +x dist/... && tsc -p packages/cairn-cms-dev/tsconfig.build.json`. A moved path left in that `chmod` fails, because the file doesn't exist yet, and T7's acceptance runs the bin directly, so it needs the mode set.
- **Fold:** append `&& chmod +x packages/cairn-cms-dev/dist/media-seed/bin.js` after the `tsc`.

### 15. minor, `optional`: the Node-entry walk loses the seed bin and never gains `./internal`

- **Location:** plan:143,197; `src/tests/unit/workers-env-reach.test.ts:88,101`.
- **Defect:** the test walks `NODE_CONTEXT_KEYS` and the root `bin` map. After T7 neither reaches the seed code, and `./internal` is a new Node-context entry that the header's rule covers. `media-seed-dist-spawn` would catch a real break, but the stated invariant goes unenforced.
- **Fold:** add `'./internal'` to `NODE_CONTEXT_KEYS` in T3.

### 16. minor, `optional`: the dev package peers on `*` while reading an entry with no semver promise

- **Location:** plan:143,197; `packages/cairn-cms-dev/package.json:26`.
- **Defect:** the seed bin now depends on `@glw907/cairn-cms/internal`, and any engine version satisfies the peer. An older engine fails loudly. A later `r2Key` change could write local objects under keys the site's engine doesn't read. This touches local R2 only.
- **Fold:** have `cairn-releasing` pin the dev package's peer to the same version, or add a backlog item.

### 17. minor, `correctness`: T5 doesn't name the dev package's `ContentRoutesConfig` import

- **Location:** plan:172; `packages/cairn-cms-dev/src/fake-anthropic.ts:10`.
- **Defect:** if the leak gate drops `ContentRoutesConfig` from `/sveltekit` with `createContentRoutes`, the dev package's `tsc`, which `npm run package` runs, fails.
- **Fold:** add the file to T5, and say what it imports instead if the type goes.

### 18. minor, `correctness`: acceptance greps aren't rerun after a sibling merge

- **Location:** plan:86-88,98.
- **Defect:** a sibling branch merged after these tasks can reintroduce `routing: 'feed'`, `defineComponent`, or `createAdminAction` in `docs/`, `skills/`, or a template with no text conflict. The fast lane runs by range, and T15's sweep has already happened. Code fails `npm run check`; prose and skill teaching don't.
- **Fold:** add to the merge chore: rerun T14's and T15's name greps after merging `main`.

### 19. minor, `optional`: T4 and T5 don't name the known site hits

- **Location:** plan:160,167,172,180; `aksailingclub-org/src/tests/_editor.ts:6`, `roles-vocabulary.test.ts:2`, `adapter.test.ts:3,10,20`.
- **Defect:** T7 and T9 name their known consumers, but T4 and T5 don't. `resolveCapability` and `createContentRoutes` are imported by that site's tests, and `_editor.ts` has no replacement once `resolveCapability` is hidden.
- **Fold:** name the files in the `Consumers must:` lines and give `_editor.ts` its replacement: a literal capability.

### 20. minor, `optional` (over-ceremony): T1 doesn't need an upshift

- **Location:** plan:109, plan:12-13.
- **Defect:** the `cairn-implementer` definition reserves `model: opus` for novel correctness-critical logic the plan doesn't fully specify. T1 quotes every line, has a compile-checked rename and one test, and reads no dynamic key. Cost: an Opus run of a 25-minute task, in tokens, with no accuracy gain. The `auth-data` review at close stays.
- **Fold:** remove "upshift" from T1.

## Checked, no gap

- **T1:** no code reads the runtime by a dynamic key, spreads it, or logs it. The only reader of `sender` is `auth-routes.ts:240`. `packages/cairn-cms-dev/src/handle.ts:80` takes `Pick<CairnRuntime, 'roles' | 'access'>`. No site reads `runtime.render`, `icons`, `assets`, or `sender`. No record is affected, because nothing serializes the runtime.
- **T4:** `resolveDb` still runs last when set, and rate limit, access map, and audit are unchanged.
- **T5, stored rows:** `loadPreview` honors each row's own `expires_at` and never reads a TTL, so existing links keep their expiry. There's no schema change, so an old and a new isolate can share D1 in a gradual deploy, and a rollback reads the same rows. No site sets `ttlMs` or `preview` on `createCairnAdmin`, so no site's lifetime changes.
- **T7:** every write is `wrangler r2 object put --local`, so production R2 is never touched. The only caller is `aksailingclub-org/package.json:23`, and no workflow or deploy script in the four sites runs it. A missed dev dependency fails loudly with command not found.
- **T8, secrets:** the appended text is static registry content, and `auth.link.send_failed` still scrubs the original error. The generic 500s at `cairn-admin.ts:249` and `content-routes-settings.ts:183` don't change.
- **T9 `spellcheck`:** it throws at build. The site's `site-config.ts` calls `parseSiteConfig` at module load, so a stale key stops the deploy and the old Worker keeps serving. The runtime paths (`content-routes-settings.ts:248,311,355,433`, `nav-routes.ts:107`) throw only if a Worker on the new engine reads a default branch that still has the key, or that restored it. Settings and vocabulary saves then refuse with `CONFIG_INVALID_MESSAGE`, and nothing is written. `setMenu` round-trips the key. Both known sites use `en-US`, so the dictionary doesn't change.
- **T9, other options:** no site sets `sanitizeSchema`, `unsafeDisableSanitize`, `anchorRel`, `includeSubDomains`, `bodyClass`, or `siteConfigPath`. The engine never emitted `preload`, so nothing relied on this option for preload.
- **T10:** `routing` is config only. It isn't in any committed `.cairn` manifest, in D1, or in the tool. No site reader compares it, apart from `aksailingclub-org/src/tests/adapter.test.ts:10,20`. A stale `'feed'` throws from `resolveRouting` at module load.
- **T14, stored data:** nothing committed names the term. Directives store the block's own name, `.cairn` manifests hold no such key, and the stamp is `data-primitive`. `validateComponent`'s fallback at `component-validate.ts:22` keeps the `attributeSchema` rider safe.
- **Merge, other overlaps:** `check-surface-reexports.json` conflicts loudly as a modify and delete. admin-rest's `guard.ts` and `section-action.ts` edits sit in `deny` and near `:550`, away from T4 and T9.
