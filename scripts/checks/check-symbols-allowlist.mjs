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
  // CLIs (cairn-audit, and cairn-media-seed from the dev package), none of which this gate resolves against
  // (only `packages/create-cairn-site`'s parser is ground truth here).
  'cli-flag:--prefix', // npm's flag, not create-cairn-site's
  'cli-flag:--local', // wrangler d1's flag
  'cli-flag:--remote', // wrangler d1's flag
  'cli-flag:--command', // wrangler d1 execute's flag
  'cli-flag:--env-file', // wrangler types' flag, the regenerate command a scaffold's worker-configuration.d.ts records
  'cli-flag:--include-runtime', // wrangler types' flag, the same recorded command
  'cli-flag:--port', // wrangler dev's flag, shown after `npm run preview --`
  'cli-flag:--var', // wrangler dev's flag, shown after `npm run preview --`
  'cli-flag:--rule', // cairn-audit's flag, not create-cairn-site's
  'cli-flag:--fail-on', // cairn-audit's flag, not create-cairn-site's
  'cli-flag:--from', // cairn-media-seed's flag, not create-cairn-site's
  'cli-flag:--header', // cairn-media-seed's flag, not create-cairn-site's
  'cli-flag:--help', // cairn-audit's, cairn-media-seed's, and cairn-manifest's flag, not create-cairn-site's
  'cli-flag:--template', // sv create's flag, not create-cairn-site's
  'cli-flag:--types', // sv create's flag, not create-cairn-site's
  'cli-flag:--no-add-ons', // sv create's flag, not create-cairn-site's
  'cli-flag:--strict', // cairn-guidance check's flag, not create-cairn-site's

  'cli-flag:--user', // systemctl's flag, in docs/admin/tripwire.md's systemd example
  'cli-flag:--now', // systemctl enable's flag, in docs/admin/tripwire.md's systemd example
  'env-var:XDG_CONFIG_HOME', // the XDG base-directory variable docs/admin/credentials.md names for the Linux registry path

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
  'file-path:src/theme/site.config.yaml', // the scaffolded site's site-config file, the engine's fixed site-config path (templates/waymark/src/theme/site.config.yaml)
  'file-path:src/content/.cairn/index.json', // a site's generated manifest, by convention
  'file-path:src/content/.cairn/media.json', // a site's generated media manifest, by convention
  'file-path:src/content/.cairn/site-facts.json', // a site's generated site-facts contract, by convention
  'file-path:src/content/.cairn/dictionary.txt', // a site's spellcheck dictionary, by convention
  'file-path:.cairn/admin.css', // a scaffolded site's gitignored compiled admin sheet
  'file-path:src/admin.css', // a site's admin-stylesheet entry file, by convention
  // Real paths in this repo's examples/showcase/ tree, cited without that prefix because the
  // prose describes the equivalent path in a reader's scaffolded site (the same convention
  // `src/theme/cairn.config.ts` above already carries).
  'file-path:src/params/md.ts', // examples/showcase/src/params/md.ts's convention path
  'file-path:src/chassis/README.md', // examples/showcase/src/chassis/README.md's convention path
  'file-path:src/routes/robots.txt', // examples/showcase/src/routes/robots.txt/+server.ts; the `+server.ts` filename splits the extractor's run at the `+`, leaving this bare directory-shaped remainder as its candidate
  // The literal `main` value from a Cloudflare `wrangler.jsonc`, a build output rather than a
  // tracked file.
  'file-path:.svelte-kit/cloudflare/_worker.js', // MIGRATION-NOTES.md's wrangler dev command for a built site

  // The path of the migration notes inside the v0.98.0 tag, where the file had another name; the
  // notes' 0.98.0 stub links to it.
  'file-path:docs/extend/migration-notes.md',

  // A vendor hostname in backticked prose, dotted-lowercase like a log event but a domain name,
  // not a registered one. docs/admin/setup-recovery.md cites the literal path an admin visits
  // to fix a GitHub App installation's repository access.
  'log-event:github.com', // GitHub's hostname, cited in `github.com/settings/installations`

]);
