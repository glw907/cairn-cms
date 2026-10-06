# Upgrade cairn

Move your site onto a newer `@glw907/cairn-cms` version, and confirm nothing broke.

## Precondition

A `0.x` minor can break a documented seam, so an upgrade is never a blind bump.

## Steps

1. **Bump the version range** in `package.json` and install:

   ```bash
   npm install @glw907/cairn-cms@latest
   ```

   or edit the version range by hand and run `npm install`. [Supported
   toolchain](../reference/supported-toolchain.md) names the Node, SvelteKit, and Svelte targets
   this install checks against.

2. **Read every `Consumers must:` line your range crossed**, not just the version you landed on.
   `CHANGELOG.md` ships in the package (`node_modules/@glw907/cairn-cms/CHANGELOG.md`, or the
   repository itself) and carries one dated section per released version, each stating what a
   consumer must do or explicitly stating nothing. A caret range admits only its own minor, so a
   site more than one minor behind crosses several of these lists in one jump, and each applies in
   order. [Migration notes](./migration-notes.md) is the running record of which recent versions
   carried a real action, if you want the short list before opening the full file.

3. **Make the changes each crossed `Consumers must:` line names.** Most are a rename, a type
   widening, or a config addition; a few are structural. Do them in the order the changelog states
   them when a version's own list is ordered, since a later rename sometimes depends on an earlier
   one already compiling. If a version shipped a D1 migration, apply it by hand with `wrangler d1
   migrations apply`: a Cloudflare Workers Builds deploy on push has no equivalent step for a
   database schema change, so nothing runs a new migration for you.

4. **Refresh the engine's guidance:**

   ```bash
   npx cairn-guidance install
   ```

   Writes `.orig` beside any local edit the new version's guidance tree diverges from, so you keep
   what you changed. See [The `cairn-guidance` CLI](../reference/guidance.md).

5. **Run the doctor:**

   ```bash
   cairn doctor
   ```

   A clean run confirms your bindings and your site config still resolve the way the new version
   expects. It doesn't reach the GitHub App or the auth store; publish an edit and confirm a
   `cairn-cms[bot]` commit lands on `main` to prove those. See [`cairn
   doctor`](../reference/cli-cairn-doctor.md) for what each check verifies.

6. **Typecheck and test your own site** before deploying. The doctor checks configuration; it does
   not typecheck your adapter or your custom routes against the new version's types.

## When your range crosses the public stylesheet export

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
   [migration notes](./migration-notes.md) item "Fix `log-event-grammar`, `log-secret-field`, and
   `cairn-btn-guarded` findings before you upgrade" has the fixes.
5. Port the template fixes you want by hand: the skip-link idiom, the toggle's `color-scheme`
   resolution (including `only dark`), radius-token corners, the heading levers, and the CI Node 24
   pin.

[Migration notes](./migration-notes.md) carries each item with its reason, and [the public
stylesheet reference](../reference/public-css.md) lists every key and default.

## When your range crosses SvelteKit 3

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
5. Run `wrangler types --env-file .dev.vars.example`, so `worker-configuration.d.ts` carries the secret
   names.
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

[Migration notes](./migration-notes.md) carries each item with its reason, and
[`CairnPlatformBindings`](../reference/sveltekit.md#cairnplatformbindings) states what the generated
`Env` must carry.

## You know it worked when

`npm run check` (or your site's own type-check script) passes, `cairn doctor` reports every check
passed or skipped, and the admin loads and saves an entry without a new error.

## If something goes wrong

A doctor failure names its own condition and remedy. A type error after the bump usually traces
directly to a `Consumers must:` line you haven't applied yet; re-read the changelog section for the
version the error's import or field name last appeared in.
