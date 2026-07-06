---
name: consumer-site-verification-against-unpublished-engine
description: how to verify a consumer site (907-life, ecxc-ski) against an unpublished cairn-cms change without leaving package.json pointing at a scratch path.
metadata:
  type: feedback
---

907-life and ecxc-ski depend on `@glw907/cairn-cms` by registry semver range
(`^0.80.0`), never `file:`. A harvest-pass engine task routinely needs a site
to consume a change that is committed on cairn-cms's `main` but not yet
`npm publish`ed. To verify the site's own gate (`npm run check` /
`npm test`) against that unpublished code without corrupting the site's
committed dependency declaration:

1. `cd cairn-cms && npm pack` to a scratch dir (produces a real tarball of the
   current `dist`, exercising the real package boundary rather than raw
   source).
2. `cd <site> && npm install <path-to-tarball>` (this rewrites `package.json`
   and `package-lock.json` to a `file:` path pointing at the tarball; that is
   expected and temporary).
3. Run the site's gate. Green here means the change is genuinely consumable
   once published.
4. `git checkout -- package.json package-lock.json` to revert the dependency
   declaration back to the registry range. `node_modules` is left holding
   the tarball's content (harmless; it is gitignored and irrelevant to what
   gets committed), so a check/test run immediately after the revert still
   passes even though `package.json` again says `^0.80.0`.

Avoid `npm link` for this: it symlinks the whole cairn-cms working directory
into the site's `node_modules`, and cairn-cms's own nested `node_modules` can
carry a different version of a shared dependency (seen: `vfile-message`
2.0.4 in the site vs 4.0.3 in cairn-cms) than the site's hoisted copy. Under
Vite/Rolldown SSR bundling this produced a real
`does not provide an export named 'X'` build failure that had nothing to do
with the actual code change; the `npm pack`/tarball-install path does not
hit this, because npm resolves and hoists the tarball's dependencies through
the site's own install like any real published package would.

**Why:** discovered mid-task chasing what looked like a titleTemplate
regression in 907-life's `npm run build`; unlinking and reinstalling from a
tarball made the false failure disappear, and the two real, unrelated,
pre-existing defects underneath it (907-life's `sitemap.xml/+server.ts`
exporting a non-reserved `EXTRA_ROUTES` name, which SvelteKit's export
validator rejects at build time) surfaced cleanly on their own.

**How to apply:** whenever a plan task requires proving a site-repo change
against a cairn-cms commit that has not been published yet.
