# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is the workspace `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`.

## Where the work is (2026-05-30)

- Rebuild plans 00 through 08 landed. Stable `0.6.0` is the published `latest`. Both consumer
  sites (907-life, ecnordic-ski) cut over to `0.6.0`, merged to their mains, deploy via CI, and
  passed a full live magic-link smoke. The dormant better-auth tables and AUTH_KV are deleted.
- The public content delivery layer is executed on branch `feat/public-delivery` (off `main`
  `1d68e9e`), 16 commits `38ecea2`..`3df67cd`, green (`npm run check` 0/0, 285 tests exit 0,
  `npm run check:package` passing). It is unmerged and unpublished. Detail is in the plan
  post-mortem and the `cairn-public-delivery` memory.

## Worktree topology

- `~/Projects/cairn/cairn-cms` is the `main` checkout, canonical. STATUS.md is canonical here.
- `~/Projects/cairn/cairn-public-delivery` is `feat/public-delivery`, the active pass.
- `~/Projects/cairn/cairn-cms-rebuild` is `feat/rise-data-attr`, stale and already merged, prunable.

## Open decisions and next steps

1. Merge `feat/public-delivery` into `main`.
2. Bump and publish the engine (the delivery layer is additive, so a minor bump).
3. Migrate each site off its hand-rolled `posts.ts`/`feed.ts` onto the new delivery surface, one
   per-site `site-pass`. Keep a dated permalink pattern to preserve existing URLs. Needs the
   publish first.
4. Next engine design is the site-settings sibling spec, then Plan 09 (CairnExtension dispatch),
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
