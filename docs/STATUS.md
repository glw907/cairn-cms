# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is the workspace `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`.

## Where the work is (2026-05-31, post-dated-slug)

- The dated-slug identity pass landed on `main` (commits `dd2a265..77d9bf2`), bumping the local
  version to `0.8.0` (not yet published). It gives dated concepts a split id/slug identity (id is the
  filename stem, slug is the date-stripped id), adds a per-concept `datePrefix` granularity knob,
  moves per-concept URL policy (`permalink`, `datePrefix`) into the admin-editable YAML site-config
  under an SSG model, and unifies public delivery behind a site-level `byPermalink` resolver one
  catch-all `[...path]` route serves. Green at close: `npm run check` 0/0 over `src/`, 315 tests exit
  0, `npm run check:package` clean. Three review subagents returned no blockers; four small findings
  were folded in. Design: `docs/superpowers/specs/2026-05-31-cairn-dated-slug-design.md`; plan and
  post-mortem: `docs/superpowers/plans/2026-05-31-cairn-dated-slug.md`. The pass ran directly on
  `main` (user-authorized), not a worktree. Not yet published to npm and not yet smoke-tested against
  a live Worker.
- Rebuild plans 00 through 08 landed earlier. The public content delivery layer landed too. It merged
  to `main` (merge `6080496`) and published as `0.7.0`, the `latest` tag on npm. The delivery layer is
  additive over the 0.6.0 admin and auth surfaces, so it shipped as a minor. Green at that merge:
  `npm run check` 0/0, 285 tests exit 0, `npm run check:package` passing. The publish ran through the
  OIDC trusted-publishing workflow off the `v0.7.0` GitHub Release.
- Both consumer sites (907-life, ecnordic-ski) still run `0.6.0`. They cut over to it, merged to
  their mains, deploy via CI, and passed a full live magic-link smoke. The dormant better-auth
  tables and AUTH_KV are deleted. Neither site has migrated onto the delivery surface yet.

## Worktree topology

- `~/Projects/cairn/cairn-cms` is the `main` checkout, canonical, and the only worktree. STATUS.md
  is canonical here.
- The two merged feature worktrees are gone. `cairn-public-delivery` (`feat/public-delivery`) was
  pruned at the 0.7.0 landing; `cairn-cms-rebuild` (`feat/rise-data-attr`) was removed and its branch
  deleted in the teardown pass (2026-05-30).
- Structural decision (settled): keep the `~/Projects/cairn` meta-workspace through the site
  co-evolution phase. The sites are about to migrate onto the `0.7.0` delivery surface, which is the
  strongest case for zero-publish symlink dev. Dissolving the workspace to standalone top-level
  repos is deferred until cairn-cms stabilizes after the scaffolder (Plan 10).
- Symlink dev is documented and proven, currently off. The runbook is
  `docs/runbooks/symlink-dev.md`. npm links a member only when its version satisfies the consumer's
  range, so the link engages per-site at first migration, when a site moves to `^0.7.0` (which also
  forces the `renderPreview`-to-`render` adapter rename and a deploy). The teardown pass proved the
  end-to-end link against 907-life and found two conditions the original plan missed, both now in the
  runbook: the local cairn-cms version must run a proper patch *ahead* of the published one (an exact
  `0.7.0 == registry 0.7.0` makes npm prefer the tarball; a prerelease like `0.7.1-dev` fails to
  satisfy `^0.7.0`), and the root `package-lock.json` must be deleted after the bump so npm
  re-resolves instead of honoring the stale registry pin. A member-local `node_modules` copy also
  shadows the link and must be removed. A root-level `npm install` was verified not to drift either
  site's committed lock, and standalone `npm ci` stayed green for both. See
  [[workspace-symlink-and-next-pass]].

## Open decisions and next steps

Do these in order.

0. Publish `0.8.0` to npm before any site consumes the new exports. Push `main`, cut a `v0.8.0`
   GitHub Release, and let the OIDC trusted-publishing workflow run (same path as `0.7.0`). The
   migration in step 1 imports `createSiteIndex`, `urlPolicyFrom`, `parseSiteConfig`, and the
   dated-slug types, so the registry must carry `0.8.0` first or site CI `npm ci` breaks.
1. Migrate each site onto `^0.8.0` and the delivery surface, one per-site `site-pass`, from that
   site's own directory. Each applies the `renderPreview`-to-`render` rename, adopts feeds, sitemap,
   SEO, and the catch-all `[...path]` public route, sets its per-concept URL policy in the YAML
   (`907`: `datePrefix: day`, `/:year/:month/:day/:slug`; `ecnordic`: `datePrefix: month`,
   `/:year/:month/:slug`), and drops its hand-rolled `posts.ts`/`feed.ts`. Existing filenames and
   URLs are preserved with zero redirects. This is where the symlink engages
   (`docs/runbooks/symlink-dev.md`) and where the production deploys happen. The live `/admin` smoke
   for the dated create flow is best run here, against the real Worker.
2. Next cairn engine passes, each its own brainstorm-then-plan: a content-lifecycle pass (atomic
   Git Data API move primitive, delete, rename, internal-link rewriting; external redirects stay the
   site's job) and a settings-editor pass (the admin web UI to edit the YAML URL policy and other
   settings). Then the still-pending CairnExtension dispatch and the `create-cairn-site` scaffolder.
   Both deferred passes are scoped in the dated-slug design doc's future-work section.

Launch directory: start Claude inside the repo a pass targets (cairn-cms or a site), so that repo's
own `.claude/` hooks and per-project memory stay active. The workspace `CLAUDE.md` still loads as a
parent. Reserve `~/Projects/cairn` for cross-repo or workspace-config chores. The launch-directory
table also lives in `docs/runbooks/symlink-dev.md`.

The teardown pass settled the carried loose ends: the content-concepts design doc is committed as
history (`5c10058`), and the stale in-progress breadcrumb in `docs/PLAN.md` was discarded (its
outcome is in the functional spec).

## Carried follow-ups (latent, not bugs under current conventions)

- Dated slug: the admin create date-in-slug guard rejects any slug opening with `^\d{4}-` on a dated
  concept, broader than the `datePrefix` strip (a `day` concept strips only a full `YYYY-MM-DD-`). A
  post deliberately slugged `2026-recap` is refused with the "leave the date out" hint. Acceptable
  since the date is captured separately; revisit if a real title trips it.
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
