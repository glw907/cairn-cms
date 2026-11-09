# Migration notes

How to move a site onto a newer `@glw907/cairn-cms` version, then a short record of what a consumer
must do to take each upgrade. `CHANGELOG.md` is the authoritative, gate-checked source: its
`Consumers must:` lines state the action a release asks, or state nothing. This file adds the
procedure and the operator-facing steps that a changelog line does not carry. The record starts with
the release that asks every site to rebuild.

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
   repository itself) and carries the section for the release you install, stating what a
   consumer must do. The sections of earlier releases live in their git tags. A caret range admits only its minor, so a
   site more than one minor behind crosses several of these lists in one jump, and each applies in
   order. [The per-version notes](#per-version-notes) below carry the steps a changelog line
   leaves out.

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

Only the release in this file has notes here. The notes of earlier releases live in their git tags.

## Unreleased

A new site's starter content is a standard set of pages and posts in place of the showcase's trail demo. This asks nothing of a site that already exists. A site you start after this lands replaces the sample content with its own, as [Make a scaffolded site yours](./skills/cairn-extending-a-site/references/make-it-yours.md) lists.

The engine package also ships the Waymark site template and its theme catalog beside `dist`, for the
`cairn new` command that a later release adds. A site that already deploys is unaffected, and no
export, entry point, or migration changes.

A new site's template also carries a `.claude/settings.json` that offers the Svelte, Cloudflare, and
daisyUI Claude Code plugins, and a `.mcp.json` for the Svelte MCP server. A site that already exists
keeps its settings and is unaffected.

`cairn new` replaces the JavaScript wizard, and `npm create cairn-site` now installs the prebuilt `cairn`
binary and runs `cairn new` with it. A site the wizard made keeps working: nothing in a site changes.
The wizard's setup records, kept under the operator's state directory, hold the GitHub App's secrets in
plaintext on disk until the operator removes them by hand. `cairn new` stores them in the system
keyring and never writes them to a record, so delete a wizard record once its site is set up. The
launcher and its six platform packages version with the Go tool, not the engine.

A site's adapter, site config, and site stylesheets move out of the theme directory. A site that
already exists makes these changes, in order:

1. Move `cairn.config.ts`, `site-config.ts`, and `site.config.yaml` from `src/theme/` to `src/site/`,
   and repoint every `#theme/cairn.config.js` and `#theme/site-config.js` import to `#site/...`. Keep
   `cairn.config.ts` importing the theme's pieces (its icons, its stylesheets, its island registry)
   through `#theme/*`.
2. Add `"#site/*": "./src/site/*"` to the `imports` in `package.json`, and set `configModule` in
   `vite.config.ts` to `/src/site/cairn.config.ts`.
3. Create `src/site/theme-options.css` and `src/site/overrides.css`, and link them after the theme's
   sheets: theme, site, theme-options, overrides, in that order. Link them in the layout, in the error
   page, and in the adapter's preview `stylesheets`.
4. Expect the engine to read only `src/site/site.config.yaml`. A site config left at the old path is
   not read, and the nav, settings, and vocabulary loads log a `config.missing` warning naming the path.
5. Move the directive pieces. The nine standard directives now live in the chassis, so the adapter
   builds `blocks` with `composeBlocks(icons, renderers)`, a block only your site has is added to that
   array, and the theme's old block module is gone. A theme's islands sit in
   `src/theme/directives/islands/`.
6. Swap an `uppercase` class on an eyebrow for the `eyebrow-case` utility, which reads
   `--cairn-eyebrow-case`. The code block's scroll cue is the `--cairn-scroll-cue` role.
7. If you seed a fake backend with `@glw907/cairn-cms-dev`, seed the site config at
   `src/site/site.config.yaml`.

Fonts are self-hosted from woff2 files in the theme, so a site can drop the three
`@fontsource-variable` devDependencies.

A theme is now a directory with a contract. Waymark is `themes/waymark/`, with a manifest
(`cairn-theme.json`), its values as DTCG tokens in `tokens/`, and the sheets `scripts/theme/build-tokens.mjs`
builds from them. The showcase's `src/theme/` is generated from it by `npm run theme:lay-in` and no
longer tracked, so edit `themes/waymark/` and lay it in again. A site that already exists keeps the
`src/theme/` it has: nothing reads the manifest or the contract data file
(`schema/cairn-theme-contract-1.json`) yet, and `theme.css` imports the built tokens sheet
in place of the two daisyUI blocks and the `@theme` scale it held.

The release gate is rebuilt around three legs, and the setup docs describe a token option for
`cairn new`: a Cloudflare API token in `CAIRN_CF_SETUP_TOKEN` replaces the Cloudflare approval.
Consumers must: nothing.

## 0.99.0-rc.4

This release has no upgrade path from an earlier version. Rebuild the site from `create-cairn-site`,
carry your content and theme across, and read [`CHANGELOG.md`](./CHANGELOG.md#0990-rc4) for every name
and behavior that changed. The steps below are the ones that fall on whoever deploys the rebuilt site.

- **Expect every editor to sign in again once.** Session ids are stored as a SHA-256 digest, so a
  session row written before the deploy no longer resolves. A script that inserts `session` rows by hand
  inserts the lowercase-hex SHA-256 of the id it gives the browser.
- **Bind a rate limiter for sign-in if you want one.** `createCairnAdmin`'s `auth.rateLimit` is a
  resolver that returns a Workers rate-limit binding, keyed `login:<CF-Connecting-IP>`. With none, sign-in
  requests are not limited.
- **Apply migrations by hand.** A rebuilt site carries `0000_auth.sql`, `0001_roles.sql`,
  `0003_preview.sql`, and `0004_login_nonce.sql`; run `npx wrangler d1 migrations apply AUTH_DB --remote`
  for a database that predates them. A Workers Builds deploy applies none.
- **Fix `radius-scale` and retired-button-patch findings before `cairn-audit` gates a deploy.** They
  were advisory and are now errors: use `rounded-selector`, `rounded-field`, or `rounded-box`, and
  `btn btn-neutral`, `btn btn-soft btn-primary`, or no `shadow-none`.
- **Grant the GitHub App Contents read and write,** and set `repo` to the repository's current name.
  `/healthz?live=1` reports a refusal as `token_request_refused`.
- **Set HSTS in the zone if you want a policy other than the admin's.** A Cloudflare zone's own
  Strict-Transport-Security setting overrides the admin's `max-age=63072000`.
- **Serve a built site with `wrangler dev .svelte-kit/cloudflare/_worker.js`,** not `vite preview`, and
  add your own caching if you relied on the old adapter's `caches.default`.
- **Replace the Stop hook command in `.claude/settings.json`** with the one in the
  `adopt-cairn.md` reference's "Agent tooling" section. The old command exits 1, which does not block.
- **A site e2e finds controls by their new names:** `Edit block`, `Insert a block`, and a media tile's
  checkbox as the input under the option. A handler keyed on a 409 from rename expects 503.
- **Regenerate the manifest if an image sits in an object or an array.** Manifest verification now reads
  a nested image, so a site that declares one runs `npx cairn-manifest` and commits the result, or the
  build fails with `content manifest is stale`. A site that calls `verifyManifest` directly passes its
  adapter as the third argument.
- **Run the `cairn` tool at `v2`.** Its Go module path is `github.com/glw907/cairn-cms/tool/v2`.
- **Keep `tailwindcss` and every `@tailwindcss/*` package at exactly `4.3.3`.** tailwindcss 4.3.4 and
  4.3.5 compile daisyUI 5.7.50's `.join` rule to `@scope (:is(.join))`, which lightningcss rejects with
  "Invalid empty selector", so the site's build fails. A site from `create-cairn-site` already pins
  4.3.3. Hold that pin, and don't let a dependency update move it, until a cairn release lifts it.
- **A `--yes` run with no `--domain` now goes on to Workers Builds.** `create-cairn-site --yes` used to stop
  at the live site when it skipped the domain. It now continues into Workers Builds and, with no saved
  token, exits 1 at the token step where it exited 0 before. A script that passes no token should set
  `CAIRN_CF_API_TOKEN`, or stop the script at the live site. With a token, the run connects Workers
  Builds and parks at the first reconcile, which needs a sign-in trip that `--yes` never opens.
- **A site set up on an earlier release on workers.dev with no domain can connect Workers Builds.**
  Re-run `npx create-cairn-site --dir <dir>` and answer no to the domain to reach the Builds offer, or
  run `npx create-cairn-site --dir <dir> --connect` directly. A domain or email sign-in turned on
  afterward is committed to the repository and deployed by Builds.
- **Move a site connected to Workers Builds by an earlier candidate onto the narrow build token if
  you want.** The site keeps deploying unchanged without this. An earlier `create-cairn-site`
  registered the token you pasted for the Builds step, which reaches every account and zone you own,
  as the Workers Builds build token, under the name `cairn create-cairn-site build token`. New runs
  register a narrow token named `cairn-build` instead. To move the site:
  1. In Cloudflare's dashboard, create an API token with Workers Scripts, D1, and Workers R2
     Storage at edit, and no other permission. Name it `cairn-build`.
  2. Open the Worker, then **Settings**, **Builds**, and under **API token** select the new token.
  3. Delete the old `cairn create-cairn-site build token`, since it is the wide one.
  4. Push a commit and confirm the build deploys.

## 0.98.0

The notes for this version and earlier are in the tag, where the file was `docs/extend/migration-notes.md`:
https://github.com/glw907/cairn-cms/blob/v0.98.0/docs/extend/migration-notes.md

The detail of `## Unreleased` before it was consolidated sits in no tag. Read it at commit
`c074feff5d32ad790bbf1272c0c41dfacccc1258`:
https://github.com/glw907/cairn-cms/blob/c074feff5d32ad790bbf1272c0c41dfacccc1258/MIGRATION-NOTES.md
