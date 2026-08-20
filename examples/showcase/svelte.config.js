import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    // remoteBindings: false keeps the build-time platform proxy from connecting to Cloudflare
    // during prerender, which has no account credentials in CI.
    adapter: adapter({ platformProxy: { remoteBindings: false } }),
    // $chassis resolves the genre-free layer (src/chassis/): the plumbing and composition
    // primitives any cairn theme mounts onto. $theme resolves the Waymark theme's own content
    // (src/theme/): the chrome, the adapter config, the token values, the starter component
    // looks (see src/chassis/README.md for the boundary rule). $lib is unused; the showcase
    // keeps no src/lib.
    alias: {
      $chassis: 'src/chassis',
      '$chassis/*': 'src/chassis/*',
      $theme: 'src/theme',
      '$theme/*': 'src/theme/*',
    },
    prerender: {
      // The cairnManifest() plugin verifies the manifest in buildStart, outside the prerender
      // lifecycle, so a stale manifest fails the build red regardless of the policy below.
      //
      // SvelteKit's own default ('fail') already throws on every prerender HTTP error; this used
      // to override that to 'warn' across the board, which is exactly how the crawler's original
      // 400 into /admin sat unnoticed in every build log, alongside anything else that might have
      // gone wrong. /admin is now excluded from the crawl at the source (rel="external" on every
      // /admin link, decided by the shared isAdminHref predicate SiteHeader and SiteFooter both
      // read), so the crawler never reaches it to be told to ignore the result, and nothing else
      // in the site links to a route that legitimately answers non-2xx during a build-time crawl.
      // A custom handler stands in for the bare 'fail' string anyway, matching the
      // throw-unless-named idiom handleUnseenRoutes already uses below: today there is nothing to
      // name, so it throws on everything, and a future legitimate case has to be added here by
      // name rather than reintroducing a blanket 'warn'.
      handleHttpError: ({ message }) => {
        throw new Error(message);
      },
      // /archive/[page]'s own `entries` export (archive.ts's paginateArchive) enumerates the real
      // page numbers 2..N from the content index at build time, and legitimately returns zero
      // entries when the whole corpus fits on page one (no page 2 exists yet, a small site or an
      // early-stage one). SvelteKit's crawl-completeness check has no way to tell "correctly
      // empty" from "misconfigured entries", so it fails the whole build on that route alone
      // (found in a 14-post merge rehearsal; the 220-post fixture here never triggers it). Scope
      // the exception to that one route by id; any other unseen prerenderable route still fails
      // the build, same as the default.
      handleUnseenRoutes: ({ routes, message }) => {
        const hasUnexpected = routes.some((route) => route !== '/(site)/archive/[page]');
        if (hasUnexpected) throw new Error(message);
      },
    },
    // cairn's guard owns CSRF for the admin with its own double-submit token, tolerant of the
    // missing Origin header a JS-free form POST sometimes sends. SvelteKit's own checkOrigin
    // runs ahead of any handle and would reject that POST first, so hand the authority over
    // (see docs/extend/build-a-site-by-hand.md, "Wire the dev backend and the CSRF handoff").
    csrf: { checkOrigin: false },
  },
};
