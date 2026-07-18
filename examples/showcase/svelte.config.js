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
    // handleHttpError: 'warn' downgrades a prerender error to a warning. The cairnManifest() plugin
    // verifies the manifest in buildStart, outside the prerender lifecycle, so a stale manifest still
    // fails the build red even under this policy.
    prerender: {
      handleHttpError: 'warn',
      // /archive/[page]'s own `entries` export (archive.ts's paginateArchive) enumerates the real
      // page numbers 2..N from the content index at build time, and legitimately returns zero
      // entries when the whole corpus fits on page one (no page 2 exists yet, a small site or an
      // early-stage one). SvelteKit's crawl-completeness check has no way to tell "correctly
      // empty" from "misconfigured entries", so it fails the whole build on that route alone
      // (found in a 14-post merge rehearsal; the 220-post fixture here never triggers it). Scope
      // the exception to that one route by id; any other unseen prerenderable route still fails
      // the build, same as the default.
      handleUnseenRoutes: ({ routes, message }) => {
        const unexpected = routes.filter((route) => route !== '/(site)/archive/[page]');
        if (unexpected.length > 0) throw new Error(message);
      },
    },
    // cairn's guard owns CSRF for the admin with its own double-submit token, tolerant of the
    // missing Origin header a JS-free form POST sometimes sends. SvelteKit's own checkOrigin
    // runs ahead of any handle and would reject that POST first, so hand the authority over
    // (see docs/guides/deploy-to-cloudflare.md#disable-checkorigin).
    csrf: { checkOrigin: false },
  },
};
