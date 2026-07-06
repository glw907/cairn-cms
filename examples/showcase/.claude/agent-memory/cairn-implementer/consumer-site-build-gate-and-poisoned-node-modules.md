---
name: consumer-site-build-gate-and-poisoned-node-modules
description: a consumer site's npm run check + npm test can both be green while npm run build fails; and a prior task's packed-tarball verification can leave node_modules silently mismatched with the committed lockfile.
metadata:
  type: feedback
---

On a consumer site (907-life, ecxc-ski), `npm run check` (svelte-check) and `npm test`
(vitest) do not run SvelteKit's own build-time route-export validation. A `+server.ts`/
`+page.server.ts` module may only export SvelteKit's own recognized names (`GET`, `POST`,
..., `prerender`, `trailingSlash`, `config`, `entries`) or a name prefixed with `_`; any
other export (for example a shared constant re-exported for a test to import) type-checks
fine and unit-tests fine, but fails `npm run build` outright with `Invalid export '<name>'`.
Found in 907-life's sitemap migration (harvest pass 1, task 6): `export const EXTRA_ROUTES`
from `+server.ts` passed check (0/0) and test (18/18) yet broke the production build. Fix:
move the shared constant to a plain lib module (not a route file) and import it from both
the route and the test.

**Why:** the repo's own "check exit codes, never through pipes" discipline is necessary but
not sufficient for a SvelteKit consumer site: `npm run build` is a fourth, distinct gate a
site's own full verification must include, since it is the only one that runs SvelteKit's
route-export analysis.

**How to apply:** when verifying or migrating a consumer site's code (not just cairn-cms
itself), always add `npm run build` to the gate alongside `check`/`test`, especially for any
change touching a `+server.ts` or `+page.server.ts` file's exports.

A second, separate trap on the same task: a prior implementer's `npm pack` +
`npm install --no-save <tarball>` verification technique (see
[[consumer-site-verification-against-unpublished-engine]]) can leave `node_modules`
resolving to the packed unreleased build while `package.json`/`package-lock.json` still
correctly declare the real registry version. `node -e "require(pkg/package.json).version"`
and even the lockfile's `resolved` URL both looked like the real registry version, but the
on-disk `dist/*.js` content was the newer, unpublished build; only diffing the actual file
content against a fresh `npm pack` of the real published version exposed it. Always `rm -rf
node_modules && npm ci` before trusting a site's gate as "the committed state," then
re-install the packed tarball only for the explicit "does the migration work once published"
check, and `npm ci` again afterward to leave the repo's `node_modules` matching its own
lockfile.
