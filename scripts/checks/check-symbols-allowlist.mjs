// cairn-cms: the symbol sweep's allowlist. A real design element, not an escape hatch: every
// entry is a token this gate's extraction has no reliable way to distinguish from a genuine
// hallucination, evidenced by hand and excused here with the reason it is legitimate. An entry
// with no reason is how a gate quietly stops gating, so review one on sight if it ever appears.
//
// Keyed `<class>:<token>`, matching the class and exact token text `check-symbols.mjs` extracts
// (a CLI flag keeps its leading `--`; an environment variable, file path, and log event are the
// bare token; an export carries just the identifier, not its resolved subpath).
export const ALLOWLIST = new Set([
  // Third-party CLI flags: npm, npx' passthrough to a script, wrangler, and cairn's other own
  // CLIs (cairn-audit, cairn-doctor, cairn-media-seed), none of which this gate resolves against
  // (only `packages/create-cairn-site`'s own parser is ground truth here).
  'cli-flag:--prefix', // npm's own flag, not create-cairn-site's
  'cli-flag:--local', // wrangler d1's own flag
  'cli-flag:--remote', // wrangler d1's own flag
  'cli-flag:--command', // wrangler d1 execute's own flag
  'cli-flag:--port', // vite preview's own flag, shown after `npm run preview --`
  'cli-flag:--rendered', // cairn-audit's own flag, not create-cairn-site's
  'cli-flag:--fix', // cairn-doctor's own flag, not create-cairn-site's
  'cli-flag:--from', // cairn-doctor's and cairn-media-seed's own flag, not create-cairn-site's
  'cli-flag:--repo', // cairn-doctor's own flag, not create-cairn-site's
  'cli-flag:--header', // cairn-media-seed's own flag, not create-cairn-site's
  'cli-flag:--template', // sv create's own flag, not create-cairn-site's
  'cli-flag:--types', // sv create's own flag, not create-cairn-site's
  'cli-flag:--no-add-ons', // sv create's own flag, not create-cairn-site's

  // Illustrative binding and secret names a reader chooses for their own site: real D1
  // bindings, rate limiters, and GitHub Actions secrets a worked example names, never a cairn
  // export or fixed convention, so the source tree never carries the literal string.
  'env-var:AUDIT_DB', // docs/reference/sveltekit.md's worked audit-sink example binding name
  'env-var:MY_RATE_LIMITER', // docs/reference/cloudflare.md's illustrative Rate Limiting binding
  'env-var:SECTION_RATE_LIMIT', // docs/reference/sveltekit.md's illustrative SectionEnv binding
  'env-var:TURNSTILE_SECRET', // docs/reference/auth-channel.md's illustrative Turnstile secret binding
  'env-var:CAIRN_GITHUB_APP_ID', // docs/reference/doctor.md's illustrative repo-secret name in a CI workflow
  'env-var:CAIRN_GITHUB_APP_INSTALLATION_ID', // same CI workflow, the installation id secret
  'env-var:CAIRN_GITHUB_APP_PRIVATE_KEY_B64', // same CI workflow, the private key secret
  'env-var:SOME_UNSET_VAR', // docs/reference/cloudflare.md's illustrative name for an omitted config key
  'env-var:CLUB_DB', // docs/extend/add-a-custom-admin-screen.md's illustrative section D1 binding

  // Dotted-lowercase tokens sharing an area with the log-event/condition-id/check-id union
  // (auth, admin, config, editor, entry, preview, tidy) without being a member of any of the
  // three: a nested property path on a config object, a data shape, or a variable, all real,
  // none a registered event, condition, or check.
  'log-event:auth.branding', // docs/reference/sveltekit.md, CairnAdminOptions.auth.branding property path
  'log-event:auth.send', // docs/reference/sveltekit.md, CairnAdminOptions.auth.send property path
  'log-event:entry.frontmatter.image.src', // docs/reference/delivery.md, a manifest entry's field-access path
  'log-event:preview.published.permalink', // docs/reference/sveltekit.md, a preview-state data field-access path
  'log-event:admin.load', // docs/reference/admin-routes.md and sveltekit.md, the `admin.load` re-export property
  'log-event:admin.actions', // docs/reference/admin-routes.md and sveltekit.md, the `admin.actions` re-export property
  'log-event:editor.nav', // docs/reference/admin-routes.md, the adapter's `editor.nav` config field
  'log-event:editor.email', // docs/reference/doctor.md, an `editor` table row's `email` column
  'log-event:editor.role', // docs/reference/sveltekit.md, a variable's own `.role` field access
  'log-event:config.ttl', // docs/reference/auth-channel.md, verifyTurnstile's options `config.ttl` field
  'log-event:config.site', // docs/reference/delivery.md, the render config's `site` field
  'log-event:config.branding', // docs/reference/sveltekit.md, an auth config's `branding` field
  'log-event:config.send', // docs/reference/sveltekit.md, an auth config's `send` field
  'log-event:entry.status', // docs/reference/components.md, a ListData row's `status` field
  'log-event:entry.title', // docs/reference/delivery-data.md, a manifest entry's `title` field
  'log-event:entry.excerpt', // docs/reference/delivery-data.md, a manifest entry's `excerpt` field
  'log-event:entry.permalink', // docs/reference/delivery-data.md, a manifest entry's `permalink` field
  'log-event:entry.date', // docs/reference/delivery-data.md, a manifest entry's `date` field
  'log-event:entry.frontmatter', // docs/reference/delivery-data.md, a manifest entry's `frontmatter` field
  'log-event:preview.state', // docs/reference/sveltekit.md, PreviewData's `state` field
  'log-event:preview.published', // docs/reference/sveltekit.md and components.md, PreviewData's `published` field
  'log-event:tidy.enabled', // docs/reference/doctor.md, the site config's `tidy.enabled` field
  'log-event:tidy.client', // docs/reference/sveltekit.md, ContentRoutesOptions' `tidy.client` field
  'log-event:tidy.conventions', // docs/extend/enable-tidy.md, the site config's `tidy.conventions` field
  'log-event:tidy.model', // docs/extend/enable-tidy.md, migration-notes.md, and log-events.md, the site config's `tidy.model` field

  // Site-relative illustrative file paths: the conventional layout a worked example shows for a
  // reader's own site, never a path in cairn's own repo, so the filesystem check correctly
  // never finds them here. `examples/showcase/` is this repo's OWN worked site and would carry
  // its own analogues at different paths (its adapter lives at `src/theme/cairn.config.ts`, not
  // `src/lib/cairn.config.ts`), which is why these are not resolved against it either.
  'file-path:src/app.d.ts', // a site's own SvelteKit ambient-types file
  'file-path:src/app.html', // a site's own SvelteKit app shell
  'file-path:src/hooks.server.ts', // a site's own SvelteKit server hooks file
  'file-path:src/lib/cairn.config.ts', // a site's own adapter file, by convention, not a fixed path
  'file-path:src/lib/cairn.server.ts', // a site's own server-only adapter half, by convention
  'file-path:src/lib/cairn.access.ts', // a site's own access-map module, by convention
  'file-path:src/lib/site.config.yaml', // a site's own non-secret config file, by convention
  // A spot the doctor's `config.site-config` SKIP line names as one of three it looked in, quoted
  // verbatim by is-it-working.md's transcript block from 03-doctor-credentialed.txt. The doctor
  // looks there by convention; no repo carries the path, so nothing can resolve it.
  'file-path:src/site.config.yaml',
  'file-path:src/theme/cairn.config.ts', // docs/reference/vite.md's illustrative adapter location
  'file-path:src/theme/theme.css', // docs/extend/design-your-site.md's own convention path, the reader's re-skin file
  'file-path:src/content/.cairn/index.json', // a site's own generated manifest, by convention
  'file-path:src/content/.cairn/media.json', // a site's own generated media manifest, by convention
  'file-path:src/content/.cairn/dictionary.txt', // a site's own spellcheck dictionary, by convention
  'file-path:src/lib/club/section.ts', // docs/extend/add-a-custom-admin-screen.md's illustrative section module
  'file-path:src/lib/members/channel.ts', // docs/extend/add-a-second-audience.md's illustrative auth-channel module
  'file-path:src/lib/content.ts', // docs/extend/build-a-site-by-hand.md and wire-the-delivery-surface.md's illustrative content-index module, by convention
  'file-path:src/theme/islands/Converter.svelte', // docs/extend/add-an-island.md's illustrative island component location
  'file-path:src/content/posts/2026-08-14-hello.md', // docs/extend/build-a-site-by-hand.md's illustrative sample entry
  'file-path:old-site/content/posts/my-post.md', // docs/extend/migrate-existing-content.md's illustrative pre-migration source path
  'file-path:src/content/posts/2024-01-15-my-post.md', // docs/extend/migrate-existing-content.md's illustrative migrated output path
  'file-path:src/content/fragments/trail-safety.md', // docs/extend/reuse-content-across-entries.md's illustrative fragment entry
  'file-path:dist/site.css', // docs/reference/cairn-audit.md's illustrative site-compiled stylesheet in a list-valued `sheet`
  'file-path:node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css', // docs/reference/cairn-audit.md's real installed-package sheet path, cited literally rather than resolved against this repo's own tree
  // Real paths in this repo's own examples/showcase/ tree, cited without that prefix because the
  // prose describes the equivalent path in a reader's own scaffolded site (the same convention
  // `src/theme/cairn.config.ts` above already carries).
  'file-path:src/params/md.ts', // examples/showcase/src/params/md.ts's own convention path
  'file-path:src/chassis/README.md', // examples/showcase/src/chassis/README.md's own convention path
  'file-path:src/routes/robots.txt', // examples/showcase/src/routes/robots.txt/+server.ts; the `+server.ts` filename splits the extractor's run at the `+`, leaving this bare directory-shaped remainder as its own candidate
  // A leading-dot directory name (`.svelte-kit`) is stripped by the extractor's own
  // leading-dot/slash trim, so the literal `main` value from a Cloudflare `wrangler.jsonc`
  // (`.svelte-kit/cloudflare/_worker.js`) is checked here as the token the trim actually produces.
  'file-path:svelte-kit/cloudflare/_worker.js', // docs/extend/build-a-site-by-hand.md's wrangler.jsonc `main` field, mangled by the leading-dot trim

  // A vendor hostname in backticked prose, dotted-lowercase like a log event but a domain name,
  // not a registered one. docs/admin/setup-recovery.md cites the literal path an admin visits
  // to fix a GitHub App installation's repository access.
  'log-event:github.com', // GitHub's own hostname, cited in `github.com/settings/installations`
]);
