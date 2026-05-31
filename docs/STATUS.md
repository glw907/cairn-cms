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
  cwd of the landing session, so its teardown is deferred to the next pass (run that pass from the
  workspace root, not from this worktree).
- Structural decision (settled): keep the `~/Projects/cairn` meta-workspace through the site
  co-evolution phase. The sites are about to migrate onto the `0.7.0` delivery surface, which is the
  strongest case for zero-publish symlink dev. Dissolving the workspace to standalone top-level
  repos is deferred until cairn-cms stabilizes after the scaffolder (Plan 10).
- Symlink dev is currently off and cannot be flipped on by config alone. npm links a member only
  when its version satisfies the consumer's range. Local cairn-cms is `0.7.0`; both sites pin
  `0.6.0`, so npm fetches the published tarball instead of linking. The symlink engages per-site at
  first migration, when a site moves to `^0.7.0` (which also forces the `renderPreview`-to-`render`
  adapter rename and a deploy). See [[workspace-symlink-and-next-pass]].

## Open decisions and next steps

Do these in order. Steps 2 and 3 do not block each other.

1. Run the teardown + symlink-dev pass. Start the session in `~/Projects/cairn` (the workspace
   root), not in `cairn-cms-rebuild`, because the pass deletes that worktree. The plan is
   `docs/superpowers/plans/2026-05-30-rebuild-teardown-and-symlink-dev.md`. It tears down the
   merged worktree, proves and documents the symlink workflow, and adds `docs/runbooks/symlink-dev.md`
   with the launch-directory guidance. No site deploys. First, settle the loose ends below so they
   do not ride along on this pass's commits.
2. Migrate each site onto `0.7.0` and the delivery surface, one per-site `site-pass`, started from
   that site's own directory. Each bumps to `^0.7.0`, applies the `renderPreview`-to-`render`
   rename, adopts the feeds, sitemap, SEO, and permalink surface, and drops its hand-rolled
   `posts.ts`/`feed.ts`. Keep a dated permalink pattern to preserve existing URLs. This is where the
   symlink engages and where the production deploys happen.
3. Next engine design is the site-settings sibling spec, then Plan 09 (CairnExtension dispatch),
   then Plan 10 (scaffolder). Run from `~/Projects/cairn/cairn-cms`.

Launch directory: start Claude inside the repo a pass targets (cairn-cms or a site), so that repo's
own `.claude/` hooks and per-project memory stay active. The workspace `CLAUDE.md` still loads as a
parent. Reserve `~/Projects/cairn` for cross-repo or workspace-config chores like step 1.

Loose ends in `main`'s working tree, carried from an earlier session and untouched by the landing
pass: `docs/PLAN.md` is modified and `docs/superpowers/specs/2026-05-28-content-concepts-design.md`
is untracked. The spec is the locked Posts-and-Pages content model the rebuild already shipped, so
it reads as a historical design record now. Decide whether to commit it as history or discard it,
and do that before step 1's own commits.

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
