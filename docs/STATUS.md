# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is the workspace `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`.

## Where the work is (2026-05-30)

- Rebuild plans 00 through 08 landed. The public content delivery layer landed too. It merged to
  `main` (merge `6080496`) and published as `0.7.0`, now the `latest` tag on npm. The delivery
  layer is additive over the 0.6.0 admin and auth surfaces, so it shipped as a minor. Green at the
  merge: `npm run check` 0/0, 285 tests exit 0, `npm run check:package` passing. The publish ran
  through the OIDC trusted-publishing workflow off the `v0.7.0` GitHub Release.
- Both consumer sites (907-life, ecnordic-ski) still run `0.6.0`. They cut over to it, merged to
  their mains, deploy via CI, and passed a full live magic-link smoke. The dormant better-auth
  tables and AUTH_KV are deleted. Neither site has migrated onto the delivery surface yet.

## Worktree topology

- `~/Projects/cairn/cairn-cms` is the `main` checkout, canonical. STATUS.md is canonical here.
- `~/Projects/cairn/cairn-public-delivery` (`feat/public-delivery`) is merged and pruned.
- `~/Projects/cairn/cairn-cms-rebuild` (`feat/rise-data-attr`) is merged. It is still the anchor
  cwd of the landing session, so its teardown is deferred to the workspace-relocation pass.
- Open structural decision: the rebuild is done, so the `~/Projects/cairn` meta-workspace (the
  root `package.json` that symlinks cairn-cms into the sites for zero-publish dev) has outlived its
  purpose now that `0.7.0` publishes. A focused pass should relocate cairn-cms to a standalone
  `~/Projects/cairn-cms`, point the sites at published `@glw907/cairn-cms` for local dev, and
  update the path references across the skills, memories, and these docs. Treat it as its own pass,
  not a mv, because it rewires both sites' dependency resolution.

## Open decisions and next steps

1. Relocate cairn-cms to a standalone `~/Projects/cairn-cms` and dissolve the meta-workspace (see
   the structural decision above). Tear down the merged worktrees as part of it.
2. Migrate each site off its hand-rolled `posts.ts`/`feed.ts` onto the new delivery surface, one
   per-site `site-pass`. Keep a dated permalink pattern to preserve existing URLs. Unblocked now
   that `0.7.0` is published.
3. Next engine design is the site-settings sibling spec, then Plan 09 (CairnExtension dispatch),
   then Plan 10 (scaffolder).

## Carried follow-ups (latent, not bugs under current conventions)

- Public delivery: the feed date formatters throw on a malformed date (the index normalizes
  upstream); a dateless entry sorts last in a dated concept; `deriveExcerpt`/`wordCount` assume
  whitespace-delimited words; the permalink date parse accepts a shape-valid but impossible date.
- Render hardening: `splitHead` dereferences a missing `<h2>`; `glyph` serializes `d="undefined"`
  for an unknown icon. Both inherited from legacy, unreachable under the sites' content.
- Auth hardening: install-token KV caching, rate-limit plus `waitUntil` on the request endpoint,
  `/admin` security headers, the `__Host-` session cookie prefix.

## Durable operational traps

- Both sites deploy on push to `main`. An editor SAVE commits content to `main` and triggers a
  redeploy, so a cutover must merge to `main` rather than run from an unmerged branch.
- The npm workspace root makes `npm install` from a member update the root lock, leaving the
  member's committed lock stale and failing CI `npm ci`. Relock standalone: temp-move the root
  `package.json` and lock, `rm -rf node_modules package-lock.json`, `npm install`, restore the
  root, commit the lock.
- npm 11 does not apply `publishConfig.exports` on pack, so `exports` point at `dist/` always with
  a `prepare` build.
- `npm run check` exits non-zero locally on the showcase `svelte.config.js` (it imports
  `@sveltejs/adapter-node`) unless the showcase deps are installed (`cd examples/showcase &&
  npm install`). CI checks out cairn-cms standalone and stays green. The svelte-check scan itself
  is 0 errors 0 warnings either way.
- Durable cross-cutting gotchas are the focused `cairn-*` memories (email send vs routing, the
  GitHub App PKCS#1 to PKCS#8 wrap, DaisyUI v5 form classes, carta-md NodeNext typing, the
  subagent model assignment, prose-guard tiers, dispatch discipline, the code-simplifier rule).
