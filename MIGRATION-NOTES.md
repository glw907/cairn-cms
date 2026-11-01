# Migration notes

How to move a site onto a newer `@glw907/cairn-cms` version, then the per-version record of what a
consumer must do to take each upgrade, distilled from `CHANGELOG.md`'s `Consumers must:` lines.
`CHANGELOG.md` is the authoritative, gate-checked source; this file exists so you can scan the
versions that carried a real action without reading the whole changelog. A version not listed here
stated no consumer action for that release.

## Upgrade cairn

Move your site onto a newer `@glw907/cairn-cms` version, and confirm nothing broke.

### Precondition

A `0.x` minor can break a documented seam, so an upgrade is never a blind bump. Each export's
TSDoc carries its stability tier: `@public` is the Extension API, `@scaffold` the Scaffold API, and
`@beta` an Unstable API with no promise across minors.

### Steps

1. **Bump the version range** in `package.json` and install:

   ```bash
   npm install @glw907/cairn-cms@latest
   ```

   or edit the version range by hand and run `npm install`. The package's `engines` and
   `peerDependencies` name the Node, SvelteKit, and Svelte targets this install checks against.

2. **Read every `Consumers must:` line your range crossed**, not just the version you landed on.
   `CHANGELOG.md` ships in the package (`node_modules/@glw907/cairn-cms/CHANGELOG.md`, or the
   repository itself) and carries one dated section per released version, each stating what a
   consumer must do or explicitly stating nothing. A caret range admits only its minor, so a
   site more than one minor behind crosses several of these lists in one jump, and each applies in
   order. [The per-version notes](#per-version-notes) below are the running record of which recent
   versions carried a real action, if you want the short list before opening the full file.

3. **Make the changes each crossed `Consumers must:` line names.** Most are a rename, a type
   widening, or a config addition; a few are structural. Do them in the order the changelog states
   them when a version's list is ordered, since a later rename sometimes depends on an earlier
   one already compiling. If a version shipped a D1 migration, apply it by hand with `wrangler d1
   migrations apply`: a Cloudflare Workers Builds deploy on push has no equivalent step for a
   database schema change, so nothing runs a new migration for you.

4. **Refresh the engine's guidance:**

   ```bash
   npx cairn-guidance install
   ```

   Writes `.orig` beside any local edit the new version's guidance tree diverges from, so you keep
   what you changed. `npx cairn-guidance --help` lists its commands.

5. **Run the doctor:**

   ```bash
   cairn doctor
   ```

   A clean run confirms your bindings and your site config still resolve the way the new version
   expects. It doesn't reach the GitHub App or the auth store; publish an edit and confirm a
   `cairn-cms[bot]` commit lands on `main` to prove those. `cairn doctor --help` says what each
   check verifies.

6. **Typecheck and test your site** before deploying. The doctor checks configuration; it does
   not typecheck your adapter or your custom routes against the new version's types.

### When your range crosses the public stylesheet export

The window that adds `@glw907/cairn-cms/cairn-public.css` changes what a copied `src/chassis/tokens.css`
owns. Do these in order, after step 3:

1. Move any key your copied `tokens.css` adds beyond the new template's into your theme.
2. Replace the copied roles, the two `@theme` colors, the code-block binding, and the focus-ring
   utility with `@import "@glw907/cairn-cms/cairn-public.css";`, placed after `@import "tailwindcss";`
   and before `@import "./prose.css";`. Compare your copy's ink, muted, and shadow values first,
   since those defaults changed.
3. If `static.scope` or `static.cssFiles` reads the old copy, list it under `static.paletteFiles`
   until the swap deletes it.
4. Run `npm run check:cairn`. Install `daisyui` and `tailwindcss` (both optional peers) if the run
   names one as missing. The three public rules print advisory findings and never fail the run;
   a configured public root your tree lacks, or one a `public.exclude` path covers, does. A
   `log-event-grammar`, `log-secret-field`, or `cairn-btn-guarded` finding fails the run too, since
   those moved to error tier. Run `npx cairn-audit` before you upgrade, then fix each finding or
   suppress it with a directive that names the rule and gives a reason. The
   [per-version notes](#per-version-notes) item "Fix `log-event-grammar`, `log-secret-field`, and
   `cairn-btn-guarded` findings before you upgrade" has the fixes.
5. Port the template fixes you want by hand: the skip-link idiom, the toggle's `color-scheme`
   resolution (including `only dark`), radius-token corners, the heading levers, and the CI Node 24
   pin.

[The per-version notes](#per-version-notes) carry each item with its reason, and the
`cairn-styling-public-pages` skill's stylesheet contract lists every key and default.

### When your range crosses SvelteKit 3

The window that moves the engine to SvelteKit 3 and `@sveltejs/adapter-cloudflare` 8 changes how a
site is configured, how it reads its bindings, and how a built site is served. Do these in order,
after step 3:

1. In `package.json`, set `@sveltejs/kit` to `^3`, `@sveltejs/adapter-cloudflare` to `^8`, `svelte` to
   `^5.57.1`, and `wrangler` to `^4.118` or later. Then run `npm install` with no
   `--legacy-peer-deps` or `--force` flag.
2. In `vite.config`, move the contents of `svelte.config.js` into `sveltekit({ ... })`, then delete
   `svelte.config.js`.
3. In the same call, delete the whole `csrf` block, and don't replace it with
   `trustedOrigins: ['*']`.
4. In `src/app.d.ts`, delete `App.Platform`, and keep the `import '@glw907/cairn-cms/ambient';` line.
5. Run `npx wrangler types --env-file=.dev.vars.example`, so `worker-configuration.d.ts` carries
   the secret names. If `src/app.d.ts` references `@cloudflare/workers-types`, as a scaffolded
   site's does, add `--include-runtime=false`, the form a scaffolded site's `cf-typegen` script in
   `package.json` runs.
6. In your server code, import `env` and `waitUntil` from `cloudflare:workers` where you read
   `event.platform`. Wrap `resolve` in `withEnv` in a handle that wrote it.
7. Import `Handle` from `@sveltejs/kit/hooks`, and move `$lib` to `#lib` through the `imports` field in
   `package.json`.
8. Run `npm run check`, and expect no errors or warnings. Add `({}) as Env satisfies
   CairnPlatformBindings` to a server module if you want a missing binding to fail here.
9. Run `npm run build`, and expect it to exit 0.
10. Run `wrangler dev .svelte-kit/cloudflare/_worker.js`, because `vite preview` can't serve adapter 8
    output.
11. Request `/admin/login` from the running server, and expect a `200` response with the sign-in form.

[The per-version notes](#per-version-notes) carry each item with its reason, and the
`CairnPlatformBindings` type states what the generated `Env` must carry.

### When your range crosses the one-declaration change

The window that makes the adapter's `roles` and `access` the one declaration changes how the guard is
wired, tightens two access edges, and regenerates the manifest. Do these in order, after step 3:

1. In the adapter, declare `roles` and `access` as members (`defineAdapter({ roles, access })`). If
   `src/hooks.server.ts` held a different map, reconcile the two first, because the adapter's now
   governs every reader. Delete a scaffold's `src/access.ts` once its map sits on the adapter.
2. In `src/hooks.server.ts`, import the site's runtime and pass `{ runtime }` to `createAuthGuard` and
   to `devBackendHandle`. Remove their `roles` and `access` options. Do the same for any per-route
   `createEditorRoutes` call.
3. Run `npx cairn-manifest` and commit the result. A site that declares an image inside an object or
   an array fails its build until you do.
4. Move any site route mounted under `/admin/auth/` outside `/admin` if anonymous visitors must reach
   it. Only `/admin/login` and `/admin/auth/confirm` are public now.
5. Mount `tidyAction` and `dictionaryAddAction` only on a route with a `concept` param.
6. Review any access rule that names a role of `none` capability. The rule now admits that role to the
   route it names. Remove a role you dropped from `defineRoles` from every access rule, or keep it
   declared: a rule naming an undeclared role now fails at server start.
7. Key alerting for a missing Turnstile secret on `missing_secret`, not `invalid_input`.
8. If you passed a full `auth.branding` without `replyTo`, check the adapter's `email` group: the
   runtime's `replyTo` applies now.
9. Optionally, answer 503 from `/healthz` when `ok` is false, and apply `0001_roles.sql` if you declare
   custom roles on a site scaffolded before the scaffold shipped it.
10. Run `npm run check`, then `npm run build`, and expect both to exit 0. Run `cairn doctor` and expect
    its `auth.role-wiring` check to pass.

[The per-version notes](#per-version-notes) carry each item with its reason.

### When your range crosses the scaffold and dev-backend change

The window that moves the site-config path, tightens composition, and changes the dev backend asks for
these steps, in order, after step 3:

1. Delete `configPath` from `editor.nav`. If your site config does not live at
   `src/theme/site.config.yaml`, set `editor.siteConfigPath` to its path. A site that builds a
   `CairnRuntime` by hand adds `siteConfigPath` to it.
2. Remove `itemLabel` from any `behavior` table and set it on the `array` field descriptor. Rename a
   concept whose id is `login`, `auth`, `editors`, `help`, `media`, `vocabulary`, `nav`, or `settings`.
   Give every `publishActions` entry a distinct `label`.
3. Make every `sanitizeSchema` callback return a schema with a `tagNames` array. Move any markup that
   needed `<script>` into a registered component or an island.
4. Delete your `devBuildDefine` plugin and the `__CAIRN_DEV_BUILD__` declaration in `app.d.ts`.
   The `cairnManifest()` plugin defines the flag, and `@glw907/cairn-cms/ambient` declares it.
5. Add `@glw907/cairn-cms-dev` to `ssr.noExternal` in `vite.config.ts`, beside the engine.
6. Drop `seedContent` from `devBackendHandle`. Pass `content: 'fixtures'` when the dev backend runs
   under `wrangler dev`, or to keep the seeded dev content.
7. Run `npm run check`, then `npm run build`, and expect both to exit 0.

[The per-version notes](#per-version-notes) carry each item with its reason.

### You know it worked when

`npm run check` (or your site's type-check script) passes, `cairn doctor` reports every check
passed or skipped, and the admin loads and saves an entry without a new error.

### If something goes wrong

A doctor failure names its condition and remedy. A type error after the bump usually traces
directly to a `Consumers must:` line you haven't applied yet; re-read the changelog section for the
version the error's import or field name last appeared in. For a runtime symptom that only shows
up after deploy, read the site's structured logs; the `cairn-extending-a-site` skill's debug
reference walks them.

## Per-version notes

This record starts at `0.84.4`, the oldest version among the sites that depend on cairn today (per
`CHANGELOG.md`'s `0.94.0` entry). A site upgrading from further back crosses more history than
this file carries; read `CHANGELOG.md` directly for anything older.

## Unreleased

- **Expect `buildSitemapView` to drop `noindex` entries.** A concept whose fieldset declares `robots` no longer lists an entry marked `noindex` in the sitemap. A site that wants one listed anyway builds that row into `extraRoutes`. A site built from the scaffold can copy the new `src/routes/sitemap.xml/+server.ts`, which uses `buildSitemapView` and takes `lastmod` from `updated`.

- **Run `npx cairn-guidance install`; it removes the four old skill directories.** The packaged skills have new names: `cairn-extend` is `cairn-extending-a-site`, `cairn-public` is `cairn-styling-public-pages`, `cairn-admin-screens` is `cairn-building-admin-screens`, and `cairn-consult` is `cairn-consulting-the-engine`. `install` deletes an old file whose hash matches a version the package shipped. It keeps and names an edited file, and reports an old directory it has no `MANIFEST` entry for, so delete those by hand under `.claude/skills/`; both name sets load until you do. Rewrite any project instruction that names an old skill.
- **Read upgrade steps from `MIGRATION-NOTES.md` and JSON schemas from `schema/`.** The extend, reference, and Claude Code docs tracks are gone: each export's doc comment carries its contract, and the packaged skills teach each job. A script that read the reference track's schema directory reads `schema/` in the installed package, each `$id` unchanged. Re-run `npx cairn-guidance install` so your copy of the skills drops links to the removed pages.
- **Move `editor.nav.configPath` to `editor.siteConfigPath`.** The nav editor, Settings, and Tags all read the one site-config file the adapter names, which defaults to `src/theme/site.config.yaml`. Set the member when your file lives elsewhere. A site that builds a `CairnRuntime` by hand adds `siteConfigPath` to it.
- **Remove `itemLabel` from any `behavior` table, rename any concept whose id names an engine view, and make publish-action labels unique.** `itemLabel` stays on the `array` field descriptor. Composition now throws on a concept id of `login`, `auth`, `editors`, `help`, `media`, `vocabulary`, `nav`, or `settings`, and on two publish actions that share a label.
- **Return a `tagNames` array from every `sanitizeSchema` callback.** The callback now gets a copy of the safe schema, and the engine strips `script` after it returns, so a callback can no longer admit author script. Use a registered component or island for that markup, or `unsafeDisableSanitize` to turn the floor off.
- **Delete your `devBuildDefine` plugin and `__CAIRN_DEV_BUILD__` declaration.** The `cairnManifest()` plugin defines the flag now and `/ambient` declares it. A site that keeps both still builds, because a define the site sets wins.
- **Add `@glw907/cairn-cms-dev` to `ssr.noExternal` in `vite.config.ts`.** The package ships built JavaScript that imports `cloudflare:workers`. Without the entry, `vite dev` hands it to Node, which rejects the scheme, and `/admin` answers 500.
- **Drop `seedContent` from `devBackendHandle`, and pass `content: 'fixtures'` when the dev backend runs under `wrangler dev`.** The option never did anything, and the dev backend now serves your site's content from the working tree by default. That mode needs a filesystem, so it throws under workerd.
- **Pass `content: 'fixtures'` to keep the seeded dev content.** A site that runs the dev backend without ever naming `seedContent` now sees its entries instead of the sample posts. Edits stay in memory either way, and the admin says so in one persistent notice.
- **Upgrade to SvelteKit 3, `@sveltejs/adapter-cloudflare` 8, Svelte 5.57.1, and Wrangler 4.118.**
  The engine's peer ranges become `@sveltejs/kit` `^3` and `svelte` `^5.57.1`, and a SvelteKit 2 site
  can't run it. The site also needs Vite `^8.0.12`, `@sveltejs/vite-plugin-svelte` `^7`, and Node
  `>=22.17`, which the scaffold already pins. See [When your range crosses SvelteKit 3](#when-your-range-crosses-sveltekit-3)
  for the steps in order.
- **Move `svelte.config.js` into `sveltekit({ ... })` in `vite.config`, and delete the file.**
  SvelteKit 3 no longer supports `svelte.config.js`. Pass the adapter, `prerender`, and every other
  kit option as sibling keys of the plugin call.
- **Delete the `csrf` block, and don't replace it with `trustedOrigins: ['*']`.** SvelteKit 3 removed
  `csrf.checkOrigin`, so a config that sets it fails the build, and its removal message suggests
  `'*'`. That value turns off SvelteKit's Origin check on every route, `/admin` included, and `cairn
  doctor` fails it. The check now covers every route on its own, so cairn's guard no longer repeats
  it outside `/admin`.
- **Delete `App.Platform` from `app.d.ts`, run `wrangler types`, and type bindings from its `Env`.**
  Adapter 8 passes no `platform`, so the type has nothing to describe.
  `CairnPlatformBindings` states what the
  generated `Env` must carry, and `({}) as Env satisfies CairnPlatformBindings` checks it at
  compile time.
- **Read `event.platform` from `cloudflare:workers` instead.** Import `env` and `waitUntil` from the
  module. A handle that wrote `event.platform`, as a dev-double handle does, wraps `resolve` in
  `withEnv({ ...env, ...doubles }, () => resolve(event))` instead. Pass `createD1AuditSink` the
  module's `waitUntil`.
- **Write `CairnEvent` without a type argument, and drop `PlatformContext`.** The `platform` member
  and the `Env` parameter retired together, since `Env` reached the event only through `platform`.
- **Import `Handle` from `@sveltejs/kit/hooks`, and move `$lib` to `#lib`.** Add `"imports": { "#lib":
  "./src/lib", "#lib/*": "./src/lib/*" }` to `package.json`. Move any custom `kit.alias` to a
  subpath import the same way.
- **Mock `$app/env`, not `$app/environment`, in a test that puts `loadPreview` in a build.**
  `loadPreview` reads `building` from `$app/env`. A mock of the old module no longer reaches it, and
  its `try`/`catch` falls back to `false`, so the build refusal goes untested without an error.
- **Serve a built site with `wrangler dev`, not `vite preview`.** `vite preview` fails on adapter 8
  output with `ERR_UNSUPPORTED_ESM_URL_SCHEME` (sveltejs/kit#17271). Run
  `wrangler dev .svelte-kit/cloudflare/_worker.js`.
- **Add caching if you relied on adapter 7's.** Adapter 7's worker put every response that
  carried a public `Cache-Control` into `caches.default`, `/media` and public SSR pages included.
  Adapter 8's worker does not, and the engine adds no replacement. `/media` answers `max-age=31536000,
  immutable`, so browsers still hold the bytes. A site that needs edge caching adds it, for example
  as a zone Cache Rule.
- **Inline the engine in your vitest config if a test covers its server modules.** Add
  `test: { server: { deps: { inline: ['@glw907/cairn-cms'] } } }`. The engine imports
  `cloudflare:workers`, which Node's loader rejects when vitest leaves the installed engine
  external.
- **Serve `strict-origin-when-cross-origin` or `strict-origin` if your site sets `no-referrer`
  site-wide.** Under `no-referrer` a browser sends `Origin: null` on a form POST, and SvelteKit's
  check refuses your forms and `createAuthChannel` forms. cairn's admin documents pin
  `strict-origin` with a header and a meta tag, so the admin keeps working unless a meta placed
  after `%sveltekit.head%` in `app.html` overrides it.
- **Have a server-to-server POST carry a `Content-Type`.** SvelteKit 3 refuses a POST with no
  `Content-Type` and a missing or foreign `Origin`, where SvelteKit 2 let it through. Have the
  sender set a content type such as JSON.
- **Upgrade the `cairn` tool to `v2`.** `v1`'s doctor recommends `csrf: { checkOrigin: false }`,
  which is now a build error. `v2` replaces the `config.csrf-disable` check with
  `config.csrf-trusted-origins` and retires three ids, so a script that matches on them needs changing:
  `config.csrf-disable`, `config.csrf-disable-missing`, and `auth.csrf-origin-mismatch`.
- **Stop matching on `auth.channel.delivery_inline`.** The event retired, since the module's
  `waitUntil` is always defined. `guard.refused` also carries no `origin` reason, because
  SvelteKit's check refuses a cross-origin form POST before the guard runs.
- **Re-run `npx cairn-guidance install` if your site uses the `cairn-extend` skill.** This release
  drops cairn's narrative guides and its two front-door pages until each set is rebuilt, so the
  shipped skill now points its recipe table at the reference pages instead. A reinstall replaces
  your copy of the skill, which still links to the removed pages. The migration notes, the upgrade
  procedure, and the AI-posture page stayed in place.

- **Pass `{ runtime }` to `createAuthGuard`, `devBackendHandle`, and `createEditorRoutes`, and declare
  `roles` and `access` once on the adapter.** The three factories take one bag with a required
  `runtime`, where `runtime` is `composeRuntime({ adapter, siteConfig })` (the scaffold exports it
  from its runtime module), and a bare call is now a type error. They read `runtime.roles`
  and `runtime.access`, so their `roles` and `access` options are gone. Declare both as members
  of the adapter (`defineAdapter({ roles, access })`). If the hooks and the adapter held different
  maps, reconcile them first: the adapter's governs every reader now, so a map only the hooks carried
  starts gating the engine's screens. A scaffolded site that kept `src/access.ts` folds the map into
  the adapter and deletes the file. `config.access_unmapped` no longer fires for a map of route keys
  alone.
- **Regenerate the content manifest and commit it.** Run `npx cairn-manifest`. A site that declares an
  image inside an object or an array (`array(image)`, an `object` holding an `image`, or an `array`
  of objects holding an `image`) and has not regenerated fails its build at upgrade with the
  stale-manifest message, because the verify now compares such a site's manifest exactly. A site with
  no nested image shape is not forced, since a manifest that predates `mediaRefs` still builds
  there. A site that calls `verifyManifest` itself passes its adapter as the third argument to get the
  nested-image rule.
- **Move any site route mounted under `/admin/auth/` outside `/admin` if anonymous visitors must reach
  it.** The guard's public paths are exactly `/admin/login` and `/admin/auth/confirm`, so every other
  route that begins `/admin/auth/` redirects an anonymous request to the login page.
- **Mount `tidyAction` and `dictionaryAddAction` only on a route with a `concept` param.** Without
  one, both answer 404. They skipped the access check there before.
- **Review any access rule that names a role of `none` capability.** `canReach`, `requireAccess`,
  `createSectionAction`, and `createAdminAction`'s `access` option now admit that role to the route
  path the rule names. A screen id, an href no rule matches, and `editors` stay refused for it.
- **Remove a dropped role from every access rule, or keep it declared.** An access rule naming a
  role the vocabulary doesn't declare now fails at server start, so dropping a role from
  `defineRoles` can't leave it reachable. `composeRuntime` throws the error, naming the rule's key
  and the role. A stale roster row with a dropped role reads `none` capability, and without the
  check an href rule still naming the role would admit it.
- **Key Turnstile alerting on `missing_secret` for a missing secret.** `turnstile.verify_failed` with
  `reason: 'invalid_input'` now means a bad token only. A blank or non-string secret logs
  `missing_secret`.
- **Expect the runtime's reply address when a full `auth.branding` left it out.** `auth.branding` is a
  partial merged over the runtime's `siteName`, `from`, and `replyTo`, and branding can't clear a
  member. To send no reply address, remove it from the adapter's `email` group or send through a custom
  `auth.send`.
- **Expect a calm conflict from publish and publish-all.** Both, and the Media Library's writes and
  the dictionary add, now fail closed when another commit lands on the default branch while they read
  their snapshots. The entry stays held on its branch, and publishing again succeeds.
- **Optional: answer 503 from `/healthz` when `ok` is false.** Return
  `Response.json(report, { status: report.ok ? 200 : 503 })`, with a catch branch that answers a fixed
  detail and never the thrown message. A backend that isn't a GitHub App now reads `ok: true` with
  `detail: 'not-applicable'`. The scaffold's route also sends `cache-control: no-store` on both answers,
  and `loadHealth` itself now logs a thrown check as `health.failed` before it rethrows.
- **Optional: apply `0001_roles.sql` when you declare custom roles on a site scaffolded before the
  scaffold shipped it.** Copy it from `node_modules/@glw907/cairn-cms/migrations/` into the site's
  `migrations` directory and run `wrangler d1 migrations apply <auth-db> --remote`. It is safe after
  `0004`, and it rebuilds `editor` with the engine's four columns only, so carry across by hand any
  column the site added. Until it runs, a write that names a custom role fails with
  `auth.store-roles-unmigrated`. Once the file sits in the site's `migrations` directory, any
  automated `wrangler d1 migrations apply`, a deploy pipeline's included, runs it and rebuilds
  `editor` the same way, so carry site-added columns across before you copy it in.

The setup tool's changes ask nothing of an existing site. In the showcase and the scaffold template,
the `ORIGIN` constant in `content.ts` became an import of `publicOrigin` from
`src/theme/cairn.config.ts`, which `create-cairn-site` now writes with the site's real address. A site
that keeps its own origin constant still builds, and it can adopt the import when it likes.

See [`CHANGELOG.md`](./CHANGELOG.md#unreleased).

## 0.98.0

- **Import admin components from `@glw907/cairn-cms/admin`.** The `@glw907/cairn-cms/components`
  subpath is removed, and the admin barrel is now `./admin`. Change every
  `from '@glw907/cairn-cms/components'` to `from '@glw907/cairn-cms/admin'`.
- **Import `PreviewBanner` from `@glw907/cairn-cms/public`.** The banner renders on a site's public
  preview route, so it moved to the new `./public` subpath and no longer sits on `./admin`. Change
  the import on your preview route.
- **Move custom admin components into `src/lib/admin`, or keep them and set `static.scope`.** The
  audit's default roots no longer include `src/lib/components`. To move them, put your custom admin
  components under `src/lib/admin` and add `@source "./lib/admin";` to your admin stylesheet
  (`src/admin.css`), so the admin sheet compiles the utilities that only those files use. To keep
  them where they are, set `static.scope` in `cairn-audit.config.json` to the default roots your site
  has plus `src/lib/components`, for example `["src/routes/admin", "src/lib/components"]`. A
  configured list replaces the defaults instead of adding to them, so naming
  `src/lib/components` alone drops `src/routes/admin` from every static rule, and a configured
  root that your tree lacks fails the run. A root you name under `static.scope` counts as an admin
  root, and the audit treats it as one wherever another scope's defaults would also reach it.
- **Change any path into `dist/components/` to `dist/admin/`.** The built files moved, and the
  compiled sheet is now `dist/admin/cairn-admin.css`. Check an audit config's `sheet` (including a
  config you pass with `--config`) and any site script that names the old path.
- **Know what the audit no longer reads.** `src/lib/components` left `DEFAULT_STATIC_SCOPE`, so
  the rules that read it by default stop reading your components there unless you restore the
  root with `static.scope`, as above. `stripe-trim-parity` and `unlayered-font-clobber` read only the admin roots in
  `static.scope`, so they never read your public components.
- **Expect `DEFAULT_ADMIN_SCOPE` to reach `src/lib/admin`.** It is now `src/routes/admin`,
  `src/lib/admin`, and `src/lib/admin-toolkit`, the same three roots as the static default. The
  three admin-only motion rules therefore also read the custom components you move into
  `src/lib/admin`. `motion-property` allows a transition to touch only paint properties and
  composited transforms, `motion-vocabulary` requires a duration and an easing curve to resolve to
  cairn's motion tokens, and `motion-hover-gate` requires a hand-authored `:hover` motion to sit
  inside `@media (hover: hover)`. A component that breaks one of these now reports there.
- **Expect new advisory findings.** `radius-scale` and three new `stock-default-hazards` arms
  report at advisory tier, so a run still exits 0 on them. Each finding names the replacement class
  and the `0.99.0` release that promotes it to error tier. Clear them before then: write
  `rounded-selector`, `rounded-field`, or `rounded-box` for a corner, and `btn btn-neutral` or
  `btn btn-soft btn-primary` for a retired button patch.
- **Fix `log-event-grammar`, `log-secret-field`, and `cairn-btn-guarded` findings before you
  upgrade.** All three moved from advisory to error tier, so each now fails `check:cairn` where it
  used to report and exit 0. Run `npx cairn-audit` first. Rename a log event that does not read as
  `area[.subject].verb_phrase`, drop a secret-named field from a log call (or log a count or a
  boolean instead), and wrap a `cairn-btn-guarded` control in `Tooltip`. A false positive from a
  `console.info` or another library's logger takes a `cairn-audit-disable-next-line` directive that
  names the rule and gives a reason. `radius-scale` and the three retired-button-patch arms stay
  advisory until `0.99.0`.
- **Re-check any custom admin screen.** Nothing is required, but the admin now takes its look
  from daisyUI's theme layer. A plain daisyUI class on your screen renders cairn's corner
  ladder and hairline edges, a plain `btn` is a hairline button, and a checked or pressed `btn`
  renders as the selected segment. Controls also grow one size step: a default control is 45px
  tall instead of 40px, a `btn-sm` or `input-sm` 36px instead of 32px, and badges, checkboxes,
  radios, and toggles grow with them, so a screen laid out around 40px controls is the likeliest
  to shift. A fixed Tailwind radius such as `rounded-lg` still renders,
  but it does not follow the ladder. Write `rounded-selector`, `rounded-field`, or `rounded-box`
  to follow it.
- **Swap your copied roles for the engine's public stylesheet.** Move any key your copied
  `src/chassis/tokens.css` adds beyond the new template's into your theme first. Then replace the
  copied roles, the two `@theme` colors (`--color-muted` and `--color-card-border`), the code-block
  binding (`pre.shiki` and the `.cairn-tok-*` classes), the `.table-scroll` pair, and the
  focus-ring utility with one line: `@import "@glw907/cairn-cms/cairn-public.css";`. It goes after
  `@import "tailwindcss";` and before `@import "./prose.css";`, so a later `@theme` block of yours
  still wins. A chassis file that still redeclares a role the sheet supplies keeps the old value,
  and `theme-conformance` names the file. The `cairn-styling-public-pages` skill's stylesheet
  contract lists every key with its default.
- **Compare your copy's ink, muted, and shadow values before you delete them.** Three defaults
  changed. Each status ink (`--cairn-{info,success,warning,error}-ink`) derives from its fill as a
  50 percent `color-mix` toward `--color-base-content`, where the old copy used the fill itself.
  `--color-muted` is an opaque 80 percent mix of `--color-base-content` into `--color-base-100`,
  where it was a 60 percent mix toward `transparent`. `--cairn-shadow` mixes `black` where it mixed
  `--color-base-content`. If your theme wants the old value, set the key in your daisyUI block (a
  comma-bearing value such as `--cairn-shadow` goes in that scheme's `:root` block, since daisyUI's
  option parser drops commas).
- **Name the old copy under `static.paletteFiles` while it lasts.** A copied `tokens.css` writes
  literal color values down, so a site whose `static.scope` or `static.cssFiles` reads it lists the
  file under `static.paletteFiles` and `token-colors` skips it. Remove the entry when the swap
  deletes the copied block.
- **Install `daisyui` and `tailwindcss` if `check:cairn` names a missing peer.** Both are now
  optional peers (`daisyui` `^5`, `tailwindcss` `^4`), loaded only when a selected rule needs them,
  and `culori` is a runtime dependency of the package. A full audit run without a peer fails with a
  message that names it and `npm install --save-dev <peer>`. A scaffolded site already has both. An
  admin-only `--rule` selection needs neither.
- **Expect advisory findings from three new rules.** `public-literals`, `theme-conformance`, and
  `theme-contrast` audit the public side and report at advisory tier on a consumer, so a run exits
  0 on them. The public scope's default roots are `src/theme`, `src/chassis`, `src/routes`,
  `src/lib/public`, and `src/lib/components`, minus `src/routes/admin` and every admin root. A
  configured `public.scope` replaces the defaults, a configured root your tree lacks fails the
  run, and a configured root that a `public.exclude` path covers fails it too. Name an entry
  stylesheet under `public.stylesheets` when your theme starts elsewhere than `src/theme/theme.css`.
  A site that serves public pages from a root outside the defaults, or that keeps admin screens
  under `src/lib/components`, names it under the right key.
- **Port the template fixes by hand.** A site copied from `templates/waymark` earlier has none of
  these; each is a small edit, and none is required for the site to build.
  - The skip link: an `sr-only` anchor to `#main` with `focus:not-sr-only focus:absolute`, and
    `<main id="main" tabindex="-1">` with `main:focus { outline: none }`, so activating the link
    moves keyboard focus and not only the scroll position.
  - The toggle's `color-scheme` resolution: `resolveTheme` reads the root's computed
    `color-scheme` when no `data-theme` names a theme, splits it into words, drops `only`, and
    treats a single `light` or `dark` as the answer. `only dark` counts as `dark`.
  - Corners on the radius tokens: chrome that writes a fixed radius takes `rounded-selector`,
    `rounded-field`, or `rounded-box`, or reads `var(--radius-box)` in a scoped rule.
  - The heading levers: `--font-weight-heading` in `@theme` and `--cairn-heading-case` in
    `@layer theme` (default `none`) with the `heading-case` utility, applied as
    `font-heading heading-case` in chrome markup and read directly in a scoped `<style>` rule.
  - The CI Node pin: `node-version: 24` in `.github/workflows/check.yml`.
- **Expect three visible changes on a public site.** `PreviewBanner` paints from daisyUI role
  tokens, so a site without daisyUI sets its five `--cairn-preview-*` properties itself. The editor
  preview's ground follows your `--color-base-100`. `cairn-focus-ring` sits in `@layer components`
  and takes no variants, so a utility that sets an outline on the same element wins, and a copied
  `prose.css` whose links read the ring's keys now draws a visible outline.

## 0.97.0

- **Run `npx cairn-manifest` once and commit the new `src/content/.cairn/site-facts.json`.**
  The `cairnManifest` build plugin now also verifies this file, and a missing one only warns, so
  your build keeps working until you run the command. A stale one (edited by hand, or left behind
  after an adapter change) fails the build the same way a stale content manifest does.
- **`createLogger` (`/log`) takes an optional options bag.** Nothing to change: a
  `createLogger<MyEvent>()` call is unaffected. `createLogger<MyEvent>({ redactKeys: ['memberNumber']
  })` adds your field names to the redaction, unioned with `REDACTED_LOG_KEYS` rather than
  replacing it. Redaction also recurses three levels into plain objects and arrays now, so a record
  that nested a secret inside a headers bag or a row array starts reading `<redacted>` where it used
  to carry the value.
- **`cairn-manifest` now exits 2 on an unrecognized command-line flag** instead of silently
  ignoring it, and all four engine bins (`cairn-doctor`, `cairn-audit`, `cairn-media-seed`,
  `cairn-manifest`) now answer `--help`. A CI job piping `cairn-manifest`'s output no longer risks
  a truncated error message. A script that already passes no arguments or only valid flags needs
  no change. `cairn-audit`'s rendered harness also gains a redirect-trap refusal: a run with every
  configured page resolving to the login route's title and landmark now throws and exits 2,
  naming `CAIRN_AUDIT_COOKIES`, instead of silently reporting a clean run.
- **Apply migration `0004` before deploying.** A magic link now only signs in the browser that
  requested it: `cp node_modules/@glw907/cairn-cms/migrations/0004_login_nonce.sql migrations/`,
  then `npx wrangler d1 migrations apply <auth-db> --remote`. An un-migrated `AUTH_DB` is a total
  login outage with no second channel, since every confirm names the new `nonce_hash` column. No
  command checks this before you deploy; confirm the migration applied with
  `npx wrangler d1 migrations list <auth-db> --remote`, valid only after the preceding copy step,
  since it reads your local migrations directory against D1's ledger, not the column itself: a
  database where you hand-ran the SQL instead still reports `0004` unapplied, and re-applying it
  then fails with a duplicate-column error.
- **`createContentRoutes` and `createCairnAdmin` (`/sveltekit`) take one config bag, not two
  arguments.** Change `createContentRoutes(runtime, config)` to
  `createContentRoutes({ runtime, ...config })`, and `createCairnAdmin(runtime, config)` to
  `createCairnAdmin({ runtime, ...config })`; a call with no `config` becomes
  `createContentRoutes({ runtime })` or `createCairnAdmin({ runtime })`.
- **`createNavRoutes` and `createMediaRoute` (`/sveltekit`) take one config bag, not a positional
  runtime.** Change `createNavRoutes(runtime)` to `createNavRoutes({ runtime })`, and
  `createMediaRoute(runtime)` to `createMediaRoute({ runtime })`.
- **Six factory-level parameter and load-data bags are renamed, across both packages.** Rename
  any imported type reference: `AuthGuardOptions` to `AuthGuardConfig` (`/sveltekit`),
  `RendererOptions` to `RendererConfig` (`.`), `FieldsetOptions` to `FieldsetConfig` (`.`),
  `DevBackendOptions` to `DevBackendConfig` (`@glw907/cairn-cms-dev`), `NavLoadData` to `NavData`
  (`/sveltekit`), and `VocabularyLoadData` to `VocabularyData` (`/sveltekit`). A call site passing
  the bag positionally or by inference needs no change.
- **Three functions rename per the engine's verb vocabulary.** Rename `serializeManifest` (`.`) to
  `formatManifest`, `deriveExcerpt` (`/delivery/data`) to `buildExcerpt`, and `diffNewlyPublished`
  (`/delivery/data`) to `buildNewlyPublished` at any call site; every signature and behavior is
  unchanged. `parseManifest`'s canonical home also moves to `.`, beside `formatManifest`, but it
  stays importable from `/delivery/data` too, so this half needs no action.
- **Three noun-first factory functions rename per the engine's verb vocabulary.** Rename
  `cookieName` (`/auth-crypto`) to `buildCookieName`, `githubApp` (`.`) to `createGithubApp`, and
  `adminAction` (`/sveltekit`) to `createAdminAction` at any call site; every signature, return
  type, and thrown error is unchanged. `src/theme/cairn.config.ts` is the site file every consumer
  meets for `createGithubApp`, since every site's adapter calls it directly.
- **Thirteen more functions rename per the engine's verb vocabulary, name-only, no deprecated
  alias.** Rename `buildMediaResolver` (`/media`) to `createMediaResolver`; `buildLinkResolver`
  and `buildFragmentResolver` (`/delivery`, `/delivery/data`) to `createLinkResolver` and
  `createFragmentResolver`; `extractMenu` and `extractVocabulary` (`.`) to `readMenu` and
  `readVocabulary`; `siteDescriptors` to `buildSiteDescriptors`, `newlyPublishedEntries` to
  `buildNewlyPublished` (two renames inside this one window collapse to the final name),
  `sitemapView` to `buildSitemapView`, and `jsonLdScript` to `renderJsonLdScript` (`/delivery`,
  `/delivery/data`); `mediaToken` (`/media`) to `formatMediaToken`; `glyph` (`.`) to
  `renderGlyph`; `fieldset` (`.`) to `defineFieldset`; and `ownerLevelRoles` (`.`) to
  `resolveOwnerLevelRoles`. `createMediaResolver` also drops its dead `opts?: { preset?: string }`
  third parameter; a caller passing `{ preset }` there drops it.
- **`createAuthChannel`'s event and options shapes change.** Replace every `AuthChannelEvent`
  import with `CairnEvent`, from `@glw907/cairn-cms/auth-channel` or
  `@glw907/cairn-cms/sveltekit`. Rewrite `ttl: { X }` as `limits: { <group>: { X } }` per the new
  grouping (for example `ttl: { sessionTtlMs }` becomes `limits: { session: { ttlMs } }`). Add a
  `{ env }` context parameter to a hand-rolled `lookup` and `verify`, reading the D1 binding off
  `ctx.env` instead of a captured closure. Copy
  `node_modules/@glw907/cairn-cms/migrations-channel/0000_channel.sql` into the channel binding's
  `migrations_dir` in place of any file transcribed from `CHANNEL_SCHEMA_SQL`, then run
  `npx wrangler d1 migrations apply <channel-db>`; every statement is idempotent, so applying it
  against an already-provisioned database is a safe no-op. `revokeSessions(db, subject)` is
  unchanged.
- **Three more factory bags rename to `*Config`, and the `deps`/`opts` parameter renames to
  `config`.** Rename `CairnAdminOptions` to `CairnAdminConfig`, `ContentRoutesOptions` to
  `ContentRoutesConfig`, and `EditorRoutesOptions` to `EditorRoutesConfig` in any import from
  `@glw907/cairn-cms/sveltekit`. `AuthRoutes`, `EditorRoutes`, `NavRoutes`, and `SectionAction`
  keep their existing names and shapes; a site annotating `createPublicRoutes`'s return imports
  the newly declared `PublicRoutes` type from `@glw907/cairn-cms/delivery` instead of deriving it
  with `ReturnType<typeof createPublicRoutes>`. A test driving `createAuthGuard`'s returned handle
  with a structural fake event needs an `as unknown as`-style shim, since the factory is now
  annotated `: Handle`.
- **Four preview and health functions rename per the engine's verb vocabulary.** Rename
  `previewMint` (`/sveltekit`) to `mintPreview`, `previewRevoke` (`/sveltekit`) to `revokePreview`,
  `previewLoad` (`/sveltekit`) to `loadPreview`, and `healthLoad` (`/sveltekit`) to `loadHealth` at
  any call site; every signature, return type, and thrown error is unchanged. `loadHealth` reaches
  every site's `src/routes/healthz/+server.ts`; `loadPreview` reaches a site that mounts a
  preview route, in its `src/routes/(site)/preview/[token]/+page.server.ts`.
- **Four discriminated results move onto the `outcome` idiom, every discriminant value restated in
  kebab case.** `RequestResult` (`/sveltekit`) renames to `RequestOutcome`: a login form switches
  from `form.status` to `form.outcome`, and from `'send_error'` to `'send-error'`; `form.sent` is
  unchanged. `ChannelRequestResult` and `ChannelConfirmResult` (`/auth-channel`) rename to
  `ChannelRequestOutcome` and `ChannelConfirmOutcome` and drop their `{ sent | ok: true } | {
  error: ... }` splits for one shape each; a site holding `createAuthChannel`'s return switches its
  `request` and `confirm` handling to the single `outcome` field, including the renamed success
  values `'sent'` and `'confirmed'`. A `result.ok` or `result.error` read fails the build, but `if
  ('error' in result)` still compiles and now always reads false, silently treating every refusal
  as a success; grep for `'error' in` against a held `createAuthChannel` result and rewrite each
  to `result.outcome !== 'sent'` / `result.outcome !== 'confirmed'`. The example site's `src/routes/members/login/+page.server.ts` carried the `'error' in result` pattern before this
  pass rewrote it, so check a copy of that route first. `RevertFailure` (`/sveltekit`) renames to `RevertOutcome`: a
  history screen switches from `form.reason` to `form.outcome`, and from
  `'draft_exists'`/`'ref_unknown'`/`'history_stale'` to
  `'draft-exists'`/`'ref-unknown'`/`'history-stale'`; `draftEditor`, `draftLastSavedAt`, and
  `revertAction`'s HTTP statuses are unchanged.
- **The rate-limit and owner-guard families move onto the `outcome` idiom.** Replace
  `checkRateLimit(binding, key)` and `checkRateLimitKeys(binding, keys)` with
  `resolveRateLimit(binding, keys)` (`/cloudflare`), branching on `result.outcome` (`'allowed'`,
  `'limited'`, `'no-binding'`, `'failed'`) instead of a boolean; a degrade-to-open reader checks
  `result.outcome === 'allowed' || result.outcome === 'no-binding' || result.outcome === 'failed'`
  explicitly. Pass `deleteEditor(db, email, ownerRoles)` and
  `setEditorRole(db, email, role, ownerRoles)` (`/auth-store`) their site's owner-capability role
  names (`[]` keeps today's unconditional-write behavior) and read the returned `outcome` instead
  of relying on a resolved `Promise<void>`. Replace a `removeOwnerIfNotLast`/`demoteOwnerIfNotLast`
  boolean check with `result.outcome === 'ok'`.
- **`ContentFormFailure` (`/sveltekit`) flattens to one interface, and the arm types it used to
  compose retire.** `SaveFailure`, `DeleteRefusal`, `RenameFailure`, `CreateFailure`,
  `PreviewMintFailure`, `MediaDeleteRefusal`, `MediaUpdateFailure`, `MediaReplaceFailure`,
  `MediaAltPropagateFailure`, `MediaBulkFailure`, `MediaUploadFailure`, `VocabularySaveFailure`,
  `SettingsSaveFailure`, and `NavSaveFailure` all retire from `@glw907/cairn-cms/sveltekit`. A
  site importing one to annotate an action's `form` prop replaces it with `ContentFormFailure`,
  which already carries every one of those fields optionally; a site annotating an action outside
  that union (settings, nav, upload, dictionary) reads the return type through inference instead.
  `UsageEntry` also retires: index its element type off the carrier,
  `NonNullable<ContentFormFailure['usage']>[number]`, instead of importing it by name.
  `UploadResult`, `MediaBulkDeleteResult`, `MediaOrphanPurgeResult`, `MediaOrphanScanResult`,
  `MediaReplacePreviewPlan`, `MediaReplacePreviewEntry`, `MediaAltPreviewPlan`,
  `MediaAltPreviewEntry`, `TidyResult`, and `DictionaryAddResult` also retire from `/sveltekit`; a
  site importing one to annotate its action reads the action's return type through inference
  instead, since none of these ten media-janitorial and settings/tidy/dictionary actions are
  reachable outside `createCairnAdmin`'s composition. See `CHANGELOG.md`'s entries for the
  full list, grouped by family.
- **`validateReproFence` (`@glw907/cairn-cms/reproductions/manifest`) gains an
  `options?: ValidateReproFenceOptions` third parameter, and `ReproFenceValidation` retires.** A
  caller that relied on the previous baked-in register (an alt prefix, a length ceiling, an
  unknown-key refusal) now supplies `options` explicitly to keep that behavior; a caller that
  imported `ReproFenceValidation` to annotate the return value annotates the inline
  `{ issues: string[] }` shape instead. `DEFAULT_ROLES` retires from the root barrel: a site that
  imported it to satisfy `defineAccess`'s first parameter now passes `undefined` there directly.
- **`cairn-doctor` gains a fourth status, `UNCHECKED`, and a third exit code, `3`.** A CI job that
  gates on the exit code alone still works unmodified (both `1` and `3` are nonzero), but a pnpm
  or yarn site that previously read a silent SKIP on `config.dependency-floors` now gets a real
  verdict. A job that wants to distinguish a real failure (`1`) from an unchecked environment gap
  (`3`) captures the exit code and branches on it.
- **Four more names narrow to one canonical home.** Import `AuthBranding` from
  `@glw907/cairn-cms/sveltekit` instead of the root package; import `MediaEntry` from
  `@glw907/cairn-cms/media` instead of `/sveltekit`; import `PublishActionEntry` from
  `@glw907/cairn-cms/sveltekit` instead of `/delivery` or `/delivery/data`. `PublishActionsConfig`
  retires: replace it with `PublishActionEntry[]` wherever it annotated `editor.publishActions` or
  a runtime read.
- **`EditorRow` (`/auth-store`) renames to `UnresolvedEditor`.** Rename any imported type
  reference; `findEditor` and `listEditors` return the renamed type, and every field and behavior
  is unchanged.
- **`iconSpan`, `cardShell`, and `headRow` are gone from `/render`**, now type-only
  (`ComponentContext`). Inline `iconSpan`'s body (`role === 'secondary' ? ['cairn-icon',
  'cairn-icon-secondary'] : ['cairn-icon']` then `h('span', { className }, [glyphEl])`) and
  `cardShell`'s body (`h('section', { className: classes }, [h('div', { className:
  ['cairn-alert-body'] }, body)])`) at their call sites, and re-home `headRow` as your code
  with its signature unchanged; see `CHANGELOG.md`'s entry for the exact shape. The removed
  `cardShell` and `headRow` helpers carried the `card-body` and `card-title` literals. The
  preceding worked example already shows the rename the DaisyUI collision requires
  (`cairn-alert-body`/`cairn-head-title`), so if you keep DaisyUI's `card` component enabled for
  other markup, carry that same rename into your re-homed code and update any prose CSS that
  targets it. Re-homing the helpers verbatim, literals included, moves `card-body`/`card-title`
  into your Tailwind-scanned source, where DaisyUI's `.card-body`/`.card-title` rules
  restyle the alert.
- **Seventeen type-only names moved to their canonical home.** The engine now publishes each
  exported name from exactly one subpath. Re-point these imports away from
  `@glw907/cairn-cms/delivery` and `@glw907/cairn-cms/delivery/data`, which no longer carry them:
  to `@glw907/cairn-cms` for `AssetConfig`, `SenderConfig`, `NavMenuConfig`, `PreviewConfig`,
  `SiteRender`, `ComponentRegistry`, `ComponentDef`, `ComponentContext`, `SlotDef`, `IconSet`, and
  `MediaResolve`; to `@glw907/cairn-cms/sveltekit` for `NavLayout`, `NavLayoutEntry`,
  `NavLayoutEngineRef`, and `NavLayoutSection`; to `@glw907/cairn-cms/islands` for `IslandRegistry`;
  and to `@glw907/cairn-cms/media` for `MediaRef`. All are type-only, so a missed one is a type
  error at build, never a runtime failure. `MediaRef`, `MediaResolve`, and `SiteRender` are still
  importable from `@glw907/cairn-cms/delivery`, whose `PublicRoutesConfig` names all three.
- **`LoginData` is now a discriminated union.** `createAuthGuard`'s new `identity` option adds a
  second shape to `LoginData` (`/sveltekit`), the type `loginLoad` returns. A site that typed a
  custom `/admin/login` route against `LoginData` and reads `csrf` or `error` directly now needs
  to narrow on `'identity' in data` first; a site that has not built a custom login route needs
  no change.
- **The `admin.login-probe` doctor check reclassifies two findings from `fail` to `info`.** A
  site that reads the probe's exit status programmatically must treat the workers.dev arm's
  exposure finding as `info`, not `fail`, on a plain magic-link site that still leaves
  `workers_dev` enabled (fix: `workers_dev: false` and `preview_urls: false` in the wrangler
  config, which the info detail now names); and must treat a 401 or 403 answering `GET
  /admin/login` as `info`, not a probe failure, since a WAF rule or a broken deploy answers the
  same way as a real identity gate and the check cannot tell them apart. A site that only reads
  the human-readable report needs no change.
- **`VariantSpec` and `AssetConfig.variants` are retired.** A site's evidence sweep found zero
  reachable runtime consumers: no family site declared a custom transform preset, and
  `presetUrl`, the only reader, had no non-test caller. The built-in `thumb`, `inline`, `card`,
  and `hero` presets are now the whole vocabulary. Drop any `variants:` key from a `media` block
  (it's a type error now, not a silent no-op); a site needing a size beyond the four built-ins
  builds a URL directly against Cloudflare's `/cdn-cgi/image/<options>/<path>` transform-URL
  format, since cairn's URL builder was never public surface.
- **`StatusChip`'s register grammar moved to its second generation.** `register` is now
  `'quiet' | 'warning' | 'outline'` (default `'quiet'`); the `tone` prop, the status dot, and the
  STATUS_CHIP_DOT_CLASS export are all removed. Replace `register="bounded"` with
  `register="outline"` and `.cairn-chip-bounded` with `.cairn-chip-outline`; drop `tone`, mapping
  `neutral`/`info`/`success` to `register="quiet"` (or omit `register`, now the default) and
  `warning`/`danger` to `register="warning"`. A former `tone="danger"` chip now renders identically
  to a `tone="warning"` one (there is no chip-level danger tier in the second generation); the
  chip's label text is the differentiator between the two states, not its color.
- **The `status-<tone>` classes no longer compile into the shipped admin sheet.** Stop relying on
  `status-neutral`/`status-info`/`status-success`/`status-warning`/`status-error` (and their size
  variants) in hand-authored admin markup.
- **The bracketed `text-[var(--cairn-warning-ink)]`/`text-[var(--color-positive-ink)]` arbitrary
  values no longer compile.** Replace `text-[var(--cairn-warning-ink)]` with `cairn-text-warning`
  and `text-[var(--color-positive-ink)]` with `cairn-text-success`, the new named utilities.
- **`createContentRoutes` no longer returns the ten media-janitorial actions**
  (`mediaBulkDeleteAction`, `mediaOrphanScanAction`, `mediaOrphanPurgeAction`,
  `mediaReplaceAction`, `mediaAltPropagateAction`, `mediaDeleteAction`, `mediaUpdateAction`,
  `mediaAltPreviewAction`, `mediaReplacePreviewAction`, `mediaLibraryUploadAction`). A site that
  hand-mounts the public `CairnMediaLibrary` component has lost its public seam for wiring those
  actions; there is no replacement factory for them. Mount the Media Library through
  `createCairnAdmin`, which still serves the component the full action vocabulary it posts to. A
  site that hand-mounts any other admin view is unaffected, `uploadAction` and `mediaLibraryLoad`
  included, and every result and failure type stays exported from `/sveltekit`.
- **The retires pass closed 56 any-site-audit rulings, removing 53 exported names with
  zero remaining public consumers**; the other 3 closed rulings were process/tooling proposals
  with no exported name to remove. The removals span `@glw907/cairn-cms` (the root package),
  `/admin-toolkit`, `/auth-crypto`, `/auth-channel`, `/auth-store`, `/delivery`, `/delivery/data`,
  `/render`, `/reproductions`, and `/sveltekit`. None has a replacement export. A site importing
  one hand-rolls the composition or reads the value structurally off its surviving keep type
  instead. See `CHANGELOG.md`'s
  consolidated entry for the full name list, grouped by subpath, and the row-for-row replacement
  expression for the 18 names that survive only as an unnamed structural member of another
  export's shape, such as `EditData['linkTargets'][number]` in place of `LinkTarget`.
- **A declared access map narrows only the targets it names, and the composition now warns about
  the gap.** `validateAccessComposition` gains a non-throwing `config.access_unmapped` warning
  naming every concept and fixed screen a site's declared map leaves uncovered. Audit your access
  map for coverage: a map you believed was a whitelist may have left a screen or concept open to
  every editor-capability session; the warning names exactly which ones on the next server start,
  and an exhaustive map that names every screen and concept closes the gap.
- **Two log event names change to match the vocabulary's grammar.** taxonomy.unmarked_field
  becomes `content.field_unmarked` and `publish.address_collision` becomes
  `publish.address_collided`. Rename both in any log filter or alert.
- **`mintPreview` replaces `mintPreviewToken`** (`/sveltekit`), taking
  `(runtime, config, event, { concept, entryId })` and performing the entry-scoped authorization
  and draft check itself, rather than leaving them to the caller. It returns a discriminated
  `PreviewMintOutcome` (`minted`, `unknown-concept`, `invalid-id`, `no-draft`) instead of throwing
  for a bad target. A site calling `mintPreviewToken` from its workflow route switches to
  `mintPreview` and its new signature and outcome shape.
- **`TidyClient` (`/sveltekit`) narrows to an engine-owned contract**: `tidy(request, options)`
  takes `{ model, system, text, effort? }` and returns `{ corrected, refused, tokens: { input,
  output } }`, dropping the transcribed Anthropic wire fields (`max_tokens`, `output_config.effort`,
  `stop_reason`, `usage.*`). A hand-rolled `TidyClient` fake (through
  `ContentRoutesConfig.tidy.client`) implements the narrower shape instead of `messages.create`'s
  wire body. `TidyResult.model` (the action's return, separate from `TidyClient`) is unaffected:
  it still names the requested model, never one the client or Anthropic resolved it to.
- **`ComponentContext` (`/render`) gains `attr(key)`; `strAttr` retires.** Replace
  `strAttr(ctx, key)` with `ctx.attr(key)`.
- **`HistoryData.draft.startedAt` renames to `lastSavedAt`, and `RevertFailure`'s
  `draft_exists.draftStartedAt` renames to `draftLastSavedAt`.** Rename both field reads.
- **`formatTimestamp` (`/admin-toolkit`) now accepts only two input shapes**: a SQLite
  `datetime('now')`-shaped string and a full ISO 8601 string carrying a `Z` suffix or an
  explicit `±hh:mm` offset. Supply a zone (`Z` or a `±hh:mm` offset) on any near-ISO timestamp
  passed to `formatTimestamp`; a zone-less near-ISO string now passes through unformatted, where
  published `0.96.0` rendered it as UTC.
- **`cairn-audit`'s five rendered-mode harness failure ids move to a dot-namespace.**
  `rendered-allowlist-stale`, `rendered-allowlist-unprobeable`, `rendered-allowlist-dead`,
  `rendered-page-identity-mismatch`, and `rendered-state-unreachable` become
  `rendered.allowlist-stale`, `rendered.allowlist-unprobeable`, `rendered.allowlist-dead`,
  `rendered.page-identity-mismatch`, and `rendered.state-unreachable`. Update any
  `cairn-audit.config.json` allowlist `rule` value from the old `rendered-*` form to `rendered.*`.
- **`ReproContext` (`/reproductions`) gains a `mediaBase` prop; `fixtureMediaBase` retires from
  `/reproductions/manifest`.** Pass `mediaBase` to `ReproContext` instead of importing
  `fixtureMediaBase`; a site deployed under a SvelteKit `paths.base` composes fixture image URLs
  inside its namespace by passing that prefix.
- **`MarkdownEditor`'s thirteen `register*` props retire in favor of one `registerEditor`
  callback.** `registerInsert`, `registerInsertLink`, `registerInsertImage`,
  `registerCaretCoords`, `registerFocusEditor`, `registerImagePlaceholders`,
  `registerGetSelection`, `registerGetSelectionRange`, `registerTidy`, `registerUndo`,
  `registerFormat`, `registerReplaceRange`, and `registerSelectRange` retire. Replace any of
  them passed directly to `MarkdownEditor` with one `registerEditor` callback that reads the
  matching member off the `EditorApi` it receives (annotatable as `EditorApi | null` from
  `/components`).
- **`MarkdownEditor`'s `registerEditor` now also delivers `null` once, from its real `onDestroy`
  teardown, revoking the mount grant.** A host holding one `editor` reference from a direct
  `MarkdownEditor` mount whose `registerEditor` callback assumed it was only ever called with a
  live `EditorApi` should narrow the parameter (`(api) => { if (!api) return; ... }`) before
  taking this release; the type widens to `EditorApi | null`. The revocation is identity-guarded
  (a host nulls its reference only when the revoked value is the one it still holds), so an
  out-of-order destroy from a superseded `{#key}` instance can never clobber a newer, already-live
  grant.
- **The five classes the render pipeline stamps onto its built-in directives rename from `ec-*`
  to `cairn-*`.** Rename `.ec-head` to `.cairn-head`, `.ec-icon` to `.cairn-icon`,
  `.ec-icon-secondary` to `.cairn-icon-secondary`, `.ec-glyph` to `.cairn-glyph`, and `.ec-grid`
  to `.cairn-grid` in any hand-authored prose CSS that targets `cardShell`/`headRow`/`iconSpan`/
  `renderGlyph`/`markFirstList` output. The `cairn-styling-public-pages` skill's stylesheet contract
  lists every emitted class.
- **Six log events rename onto the `refused` verb.** Rename any log subscriber matching on the
  old string, preview.rejected to `preview.refused`, guard.rejected to `guard.refused`,
  media.delete_blocked to `media.delete_refused`, media.replace_blocked to
  `media.replace_refused`, auth.access.denied to `auth.access.refused`, and
  admin.action.csrf_rejected to `admin.action.csrf_refused`; every record's field set is
  unchanged.
- **One log event moves onto its true area.** Rename admin.action.sink_threw to
  `audit.sink.call_failed` in any log filter, alert, or subscriber; `audit.sink.write_failed` is
  unchanged and every record's field set is unchanged.
- **`OfficeList` (`/admin-toolkit`) is retired.** Replace an `<OfficeList>` composition with
  `PageHeader` beside `AdminTable` inside a bare `overflow-hidden card-shell card-shadow` div (no
  `overflow-x-auto` on that div; `AdminTable`'s wrapper already carries the horizontal
  scroll, and `overflow-hidden` clips the table's square edges to the card's rounded corners):

  ```svelte
  <script lang="ts">
    import { PageHeader, AdminTable } from '@glw907/cairn-cms/admin-toolkit';

    let { data }: { data: { events: { id: string; name: string; status: string }[] } } = $props();
  </script>

  <PageHeader eyebrow="Team" title="Events" meta="12 upcoming">
    {#snippet action()}
      <button type="button" class="btn btn-primary btn-sm">New event</button>
    {/snippet}
  </PageHeader>
  <div class="overflow-hidden card-shell card-shadow">
    <AdminTable rowCount={data.events.length}>
      {#snippet header()}
        <th scope="col">Name</th>
      {/snippet}
      {#snippet children()}
        <!-- rows -->
      {/snippet}
    </AdminTable>
  </div>
  ```

  The packaged admin sheet also drops `gap-0` and `overflow-x-auto`: `OfficeList.svelte` was the
  engine's only user of each.
- **`cairn-audit` gains three error-tier static rules and one advisory rendered rule for
  motion.** `motion-property`, `motion-vocabulary`, and `motion-hover-gate` join the static
  rules; `motion-reduced-delay` joins the rendered ones. A custom admin screen that transitions a
  layout property, writes `transition-all`, writes a literal duration or easing, or declares an
  ungated hand-authored `:hover` transition now fails `npx cairn-audit`. Move onto the
  `--cairn-dur-*`/`--cairn-ease-*` tokens, or suppress with a reason. One layout property is
  allowed, and only by the frame-offset key: an element carrying `data-cairn-motion="frame-offset"`,
  at most one per screen, may transition `margin-left`.
- **`motion-band`'s band widens from `150ms` to `250ms` to `70ms` to `400ms`, and it no longer
  reports a call site that references a token.** A site relying on the narrow band loses that
  check; `motion-vocabulary` is what replaces it. An existing `cairn-audit-disable-next-line
  motion-band` directive that covered a finding inside the old band and outside the new one now
  silences nothing, which `cairn-audit` reports as a dead suppression at error tier that cannot
  itself be suppressed: delete the directive on upgrade. The motion predicate also widens, so a
  `transition-delay` reaches `motion-band`'s band check and a rule declaring only
  `transition-timing-function` now owes a reduced-motion sibling under `reduced-motion`.
- **The admin sheet sets `--default-transition-duration` and
  `--default-transition-timing-function` to cairn tokens on the admin root.** A bare `transition`
  utility on a custom screen changes curve from Tailwind's `cubic-bezier(0.4, 0, 0.2, 1)` to
  Carbon's productive standard `cubic-bezier(0.2, 0, 0.38, 0.9)`. The duration is unchanged at
  `150ms`.
- **The admin's reduced-motion block now zeroes `transition-delay` and `animation-delay`.** A
  custom screen that relied on a delay surviving a reduced-motion preference loses it, which is
  the fix.
- **The edit page's preview pane no longer animates its width when the split changes.** The
  resize snaps.
- **The upload progress fill no longer transitions its `width`, and no motion replaces it.** The
  fill snaps to each new value. The native `<progress>` element is unchanged and keeps its
  implicit `progressbar` role and its `value`/`max` mapping, so nothing changes for assistive
  technology. The reduced-motion pin on `::-webkit-progress-value` goes with the transition it
  pinned.
- **Three utility classes leave the packaged admin sheet, because their last call sites go:**
  `transition-all`, `transition-[width]`, and `duration-[250ms]`. A site whose markup carries
  any of the three was relying on the engine's sheet to compile it; add the class to that site's
  Tailwind content or restate the declaration.
- **A native `title` on an admin action control is replaced by `admin-toolkit`'s `Tooltip`.** No
  action, unless your admin copied the `cairn-btn-guarded` marker class from the engine's markup; no site has. `cairn-audit`'s `stock-default-hazards` rule now names that
  class retired, reported at advisory tier until `0.98.0` promotes the finding to error; the class
  itself stays compiled until a later release removes it.
- **`cairn-doctor` loses `--fix`, the `skill.admin-screens` check, and the
  `skill.admin-screens-stale` condition.** The packaged skill install moves to `cairn-guidance`,
  which installs every packaged skill directory, the read-only review agent, and the `CLAUDE.md`
  fragment, and checks their freshness the same way. Run `npx cairn-guidance install` after the
  bump; `cairn-doctor --fix` is gone.
- **The pre-cut dependency sweep bumps the daisyUI build dependency to `5.7.42`, recompiling the
  shipped `dist/components/cairn-admin.css`.** No call-site change; the fix range (`5.7.35`
  through `5.7.42`) changes the checkbox tick/dash alignment and badge-in-flex shrinking pixels
  the precompiled sheet renders. A site that snapshot-tests the admin visually should refresh
  those baselines after the bump.

### Upgrade order

Most of this window is a rename set of four or five call-site edits. A site that composes
`OfficeList` needs a composition change as well: update every route that imports it, and update
any test that asserts its order. Do the renames first, so the `OfficeList` sweep is the only
edit left.

See [`CHANGELOG.md`](./CHANGELOG.md) for the full entry.

## 0.96.0

The release step sets the version number at the cut and renames this section to match it. This
window raises three toolchain floors.

- **Run Node 24 or later on your build machine.** `create-cairn-site`'s preflight now refuses
  a Node 22 install; the engine, the scaffolder, and the dev backend package all raised
  `engines.node` from `>=22` to `>=24`.
- **The `@sveltejs/kit` and `svelte` floors moved to the versions cairn now develops and tests
  against.** Be on `@sveltejs/kit ^2.70` and `svelte ^5.56.10` (the exact ranges in `package.json`)
  before installing; npm's default peer resolution refuses the install otherwise.
- **`@cloudflare/workers-types` is now a peer dependency at `^5`.** Install
  `@cloudflare/workers-types@^5` as a devDependency, even if you generate binding types
  with `wrangler types`: cairn's shipped `.d.ts` files import named types directly from this
  package, so skipping the install silently loses every cairn-typed binding signature to an
  unresolvable-import `any` under `skipLibCheck: true`, and npm's default peer resolution refuses
  the install without it.

One more entry carries a conditional action. The exported `TidyClient` type gained an optional
`output_config` field, which matters only to a hand-rolled `TidyClient` fake that rejects unknown
body fields.

Three fixes need no consumer action but are worth knowing about. `previewLoad` (`/sveltekit`) now
reads `$app/environment` through a dynamic import guarded by `try`/`catch`, esbuild's documented escape hatch for downgrading an unresolvable specifier from a bundle-time error to a
runtime concern, so a site that added a Wrangler alias for `$app/environment` to work around the
barrel failing to resolve in a raw, non-Vite esbuild bundle (a Cron handler wired outside Vite,
for example) can remove that workaround. `previewLoad` now also strips `canonical`, `og:url`, and
`jsonLd.url` from the `seo` it returns, so a site that already stripped those fields itself before
rendering a preview can drop that strip. `PreviewBanner` (`/components`) now renders its expiry
as a fixed UTC string instead of the visitor's locale, closing a possible hydration mismatch; a
site wanting a different date vocabulary can pass the new optional `formatExpiry` prop.

Nothing else in this window asks anything of a consumer. The dependency bumps stay inside their
ranges. Tidy's default model changed, and a site that set `tidy.model` explicitly is
unaffected. A newly scaffolded site starts on `compatibility_date` `2026-08-21` without the
redundant `nodejs_compat` flag; an existing site keeps its flag. The rest is documentation, gates,
and internal tooling that ships in no tarball.

See [`CHANGELOG.md`](./CHANGELOG.md#0960).

## 0.95.0

This release promotes `0.95.0-rc.1`, which only ever reached the `next` dist-tag, so a site coming
from `0.94.0` crosses the `0.95.0-rc.1` section below as well as this one.

The reproduction seam and its two mounting overrides (`CairnAdminShell.themeOverride`,
`EditPage.spellcheckOverride`) need nothing: every new prop is optional and off by default. The
release-debt pass that followed carries five type-level changes, all of which surface as compile
errors rather than runtime failures, and one operational fact.

- **A cairn site runs on Cloudflare's Workers Paid plan, $5 a month, from its first deploy.** No
  code action. The admin documentation previously described the Worker as running on the free plan,
  which the built bundle's size has outgrown. Nothing about your site changes; the docs now state
  what it costs.
- **`SiteConfig` no longer carries an index signature.** Reading a parsed config by its declared
  fields, the supported way, is unaffected. Code that indexed one with a dynamic key, or passed one
  where a `Record<string, unknown>` was expected, now fails to compile; read the field by name.
  `parseSiteConfig` was already refusing those same unknown keys at runtime.
- **`AdminShellData` gained a required `mediaBase`, and `EditData` a required `singular`.** Both
  arrive populated through `shellLoad` and `editLoad`, so a site reaching them the normal way does
  nothing. A site that hand-builds either payload, including in its tests, adds the field.
- **`DeleteDialog` and `RenameDialog` renamed their `label` prop to `singular`.** Pass the concept's
  singular noun rather than its plural label: these dialogs write sentences about one entry, and the
  plural rendered "Delete this posts?"

See [`CHANGELOG.md`](./CHANGELOG.md#0950).

## 0.95.0-rc.1

- **The tidy action's SDK dependency moved.** `@anthropic-ai/sdk` is now an optional peer
  dependency instead of a plain one. A site using the tidy action adds it to its dependencies
  (`npm install @anthropic-ai/sdk`); a site not using tidy does nothing, and its install gets
  lighter. See [`CHANGELOG.md`](./CHANGELOG.md#0950-rc1).

## 0.94.0

A large, deliberately consolidated breaking release: a rename-and-type sweep across the event
shape, the role type, the deps types, the admin-action refusal channels, the admin-toolkit field
names, and the `navLayout` types finalized after 0.86.0's introduction; a route-factory action-name
rekey; and an access-map rekey for a parameterized `createSectionAction` route. `CHANGELOG.md`
carries an ordered, numbered checklist for this version rather than scattering the steps
across prose, specifically so a consumer crossing it has one list to work from. Read [that
checklist](./CHANGELOG.md#0940) directly rather than this page's summary; it is long enough
that reproducing it here would only create a second copy to keep in sync.

## 0.92.0

- **A field's default label register flipped.** `register="stacked"` is now the default for
  `FieldLabel`/`TextField`/`SelectField`, replacing `register="inline"`. Pass `register="inline"`
  explicitly on any call whose inline label-beside-control layout should survive the upgrade.
- **A stricter `cairn-audit --rendered` finding.** A screen with a filled header action stacked
  above a filled card action now counts as a finding; demote the non-primary fill to `btn-ghost` or
  `btn-outline`.

See [`CHANGELOG.md`](./CHANGELOG.md#0920) for the full entries.

## 0.91.0

- **`badge-ghost` retired from cairn's tree.** Replace any `badge-ghost` usage with
  `StatusChip register="quiet"` (`@glw907/cairn-cms/admin-toolkit`) or the equivalent
  `.cairn-chip-quiet` recipe; `cairn-audit`'s `stock-default-hazards` check now errors on
  `badge-ghost` directly.

See [`CHANGELOG.md`](./CHANGELOG.md#0910) for the full entry, including two informational
changes (a `PageHeader` spacing tightening, a `cairn-audit` finding demoted to advisory) that carry
no required action.

## 0.87.0

- **`routing: 'embedded'` became genuinely enforced.** An embedded concept's entries no longer
  resolve through permalinks, prerender, or appear in the sitemap; before this version the
  shorthand was declarable but not enforced. Check any concept your site declares
  `routing: 'embedded'`: if its entries are meant to have public URLs, declare `routing: 'page'`
  instead; if they were only ever meant to be referenced or included, no action is needed.

See [`CHANGELOG.md`](./CHANGELOG.md#0870).

## 0.86.0

`navLayout` shipped in this version, giving a site one declarative tree for the whole admin
sidebar. Its types were renamed in 0.94.0 (`AdminNavEntry` and its siblings became
`NavLayoutEntry` and its siblings), so a site jumping from before 0.86.0 to past 0.94.0 in one leap
applies this version's shape first and then 0.94.0's rename on top of it.

- Any code reading `AdminShellData` fields directly (`customNav`, `canManageEditors` as a nav
  signal, `navLabel`) moves to the new consolidated `nav` field.
- A declared `navFilter` widens its parameter and return type from `ResolvedNavItem[]` to
  `ResolvedLayoutNode[]`; a filter that only reads `.label` needs no other change.

See [`CHANGELOG.md`](./CHANGELOG.md#0860).
