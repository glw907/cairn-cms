// cairn-cms: the symbol sweep's allowlist. A real design element, not an escape hatch: every
// entry is a token this gate's extraction has no reliable way to distinguish from a genuine
// hallucination, evidenced by hand and excused here with the reason it is legitimate. An entry
// with no reason is how a gate quietly stops gating, so review one on sight if it ever appears.
//
// Keyed `<class>:<token>`, matching the class and exact token text `check-symbols.mjs` extracts
// (a CLI flag keeps its leading `--`; an environment variable, file path, and log event are the
// bare token; an export carries just the identifier, not its resolved subpath).
export const ALLOWLIST = new Set([
  // Third-party CLI flags: npm, npx' passthrough to a script, wrangler, and cairn's other
  // CLIs (cairn-audit, cairn-media-seed), none of which this gate resolves against
  // (only `packages/create-cairn-site`'s parser is ground truth here).
  'cli-flag:--prefix', // npm's flag, not create-cairn-site's
  'cli-flag:--local', // wrangler d1's flag
  'cli-flag:--remote', // wrangler d1's flag
  'cli-flag:--command', // wrangler d1 execute's flag
  'cli-flag:--env-file', // wrangler types' flag, the regenerate command a scaffold's worker-configuration.d.ts records
  'cli-flag:--include-runtime', // wrangler types' flag, the same recorded command
  'cli-flag:--port', // wrangler dev's flag, shown after `npm run preview --`
  'cli-flag:--var', // wrangler dev's flag, shown after `npm run preview --`
  'cli-flag:--rendered', // cairn-audit's flag, not create-cairn-site's
  'cli-flag:--rule', // cairn-audit's flag, not create-cairn-site's
  'cli-flag:--fail-on', // cairn-audit's flag, not create-cairn-site's
  'cli-flag:--from', // cairn-media-seed's flag, not create-cairn-site's
  'cli-flag:--header', // cairn-media-seed's flag, not create-cairn-site's
  'cli-flag:--help', // cairn-audit's, cairn-media-seed's, and cairn-manifest's flag, not create-cairn-site's
  'cli-flag:--template', // sv create's flag, not create-cairn-site's
  'cli-flag:--types', // sv create's flag, not create-cairn-site's
  'cli-flag:--no-add-ons', // sv create's flag, not create-cairn-site's
  'cli-flag:--strict', // cairn-guidance check's flag, not create-cairn-site's

  // SCREAMING_SNAKE_CASE tokens that are not environment variables cairn reads, so the source
  // tree never carries the literal string.
  'env-var:ERR_UNSUPPORTED_ESM_URL_SCHEME', // MIGRATION-NOTES.md, Node's error code for `vite preview` serving adapter 8 output (sveltejs/kit#17271), never a cairn variable

  // Dotted-lowercase tokens sharing an area with the log-event/condition-id/check-id union
  // (auth, admin, config, editor, entry, preview, tidy) without being a member of any of the
  // three: a nested property path on a config object, a data shape, or a variable, all real,
  // none a registered event, condition, or check.
  'log-event:auth.branding', // MIGRATION-NOTES.md, CairnAdminOptions.auth.branding property path
  'log-event:auth.send', // MIGRATION-NOTES.md, CairnAdminOptions.auth.send property path
  'log-event:editor.nav', // MIGRATION-NOTES.md, the adapter's `editor.nav` config field
  'log-event:tidy.client', // MIGRATION-NOTES.md, ContentRoutesOptions' `tidy.client` field
  'log-event:tidy.model', // MIGRATION-NOTES.md, the site config's `tidy.model` field
  'log-event:config.csrf-disable-missing', // MIGRATION-NOTES.md, a retired condition id a removal entry must still name
  'log-event:auth.csrf-origin-mismatch', // MIGRATION-NOTES.md, a retired condition id a removal entry must still name
  'log-event:auth.channel.delivery_inline', // MIGRATION-NOTES.md, the retired log event name a removal entry must still name to say what changed
  'log-event:publish.address_collision', // MIGRATION-NOTES.md, the retired name a rename entry must still name to say what changed

  // Site-relative illustrative file paths: the conventional layout a worked example shows for a
  // reader's site, never a path in cairn's own repo, so the filesystem check correctly
  // never finds them here. `examples/showcase/` is this repo's OWN worked site and would carry
  // its analogues at different paths (its adapter lives at `src/theme/cairn.config.ts`, not
  // `src/lib/cairn.config.ts`), which is why these are not resolved against it either.
  'file-path:src/app.d.ts', // a site's SvelteKit ambient-types file
  'file-path:src/app.html', // a site's SvelteKit app shell
  'file-path:src/app.css', // a hand-built site's global style sheet, Tailwind's SvelteKit guide's location
  'file-path:src/hooks.server.ts', // a site's SvelteKit server hooks file
  'file-path:src/lib/cairn.config.ts', // a site's adapter file, by convention, not a fixed path
  'file-path:src/lib/cairn.server.ts', // a site's server-only adapter half, by convention
  'file-path:src/lib/cairn.access.ts', // a site's access-map module, by convention
  'file-path:src/lib/site.config.yaml', // a site's non-secret config file, by convention
  // One of three spots `cairn doctor` looks for a site config; cairn doctor looks there by
  // convention, so no repo carries the path and nothing can resolve it.
  'file-path:src/site.config.yaml',
  'file-path:src/theme/site.config.yaml', // the scaffolded site's site-config file, the engine's default for editor.siteConfigPath (templates/waymark/src/theme/site.config.yaml)
  'file-path:src/access.ts', // MIGRATION-NOTES.md's scaffolded site's access map (templates/waymark/src/access.ts)
  'file-path:src/content/.cairn/index.json', // a site's generated manifest, by convention
  'file-path:src/content/.cairn/media.json', // a site's generated media manifest, by convention
  'file-path:src/content/.cairn/site-facts.json', // a site's generated site-facts contract, by convention
  'file-path:src/content/.cairn/dictionary.txt', // a site's spellcheck dictionary, by convention
  'file-path:.cairn/admin.css', // a scaffolded site's gitignored compiled admin sheet
  'file-path:dist/components/cairn-admin.css', // MIGRATION-NOTES.md's per-version record of a pre-rename release, which must keep the path that was real when it shipped
  'file-path:src/admin.css', // a site's admin-stylesheet entry file, by convention
  'file-path:@glw907/cairn-cms/cairn-public.css', // MIGRATION-NOTES.md's real published subpath, cited by its import specifier rather than its installed dist path
  // Real paths in this repo's examples/showcase/ tree, cited without that prefix because the
  // prose describes the equivalent path in a reader's scaffolded site (the same convention
  // `src/theme/cairn.config.ts` above already carries).
  'file-path:src/params/md.ts', // examples/showcase/src/params/md.ts's convention path
  'file-path:src/chassis/README.md', // examples/showcase/src/chassis/README.md's convention path
  'file-path:src/routes/robots.txt', // examples/showcase/src/routes/robots.txt/+server.ts; the `+server.ts` filename splits the extractor's run at the `+`, leaving this bare directory-shaped remainder as its candidate
  // The literal `main` value from a Cloudflare `wrangler.jsonc`, a build output rather than a
  // tracked file.
  'file-path:.svelte-kit/cloudflare/_worker.js', // MIGRATION-NOTES.md's wrangler.jsonc `main` field

  // Real paths in a named production consumer site's repo, not this repo's tree.
  // MIGRATION-NOTES.md's closing "upgrade order" subsection names them so a site
  // owner can find the call sites the breaking window touches; the bracketed/parenthesized route
  // segments in the same subsection (`[...path]`, `(site)`, `[token]`) already split the
  // extractor's run and never form a whole candidate, so only these five need listing here.
  'file-path:src/chassis/cairn.server.ts', // ecxc-ski and 907-life's adapter module
  'file-path:src/tests/adapter.test.ts', // aksailingclub-org's adapter test
  'file-path:src/member-auth/lib/crypto.ts', // aksailingclub-org's member-auth cookie module
  'file-path:src/admin-club/lib/announcements.ts', // aksailingclub-org's announcements module
  'file-path:src/tests/announce-list-order.test.ts', // aksailingclub-org's announcement-order test

  // A vendor hostname in backticked prose, dotted-lowercase like a log event but a domain name,
  // not a registered one. docs/admin/setup-recovery.md cites the literal path an admin visits
  // to fix a GitHub App installation's repository access.
  'log-event:github.com', // GitHub's hostname, cited in `github.com/settings/installations`

]);
