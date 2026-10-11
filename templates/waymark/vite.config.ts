import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { cairnManifest } from '@glw907/cairn-cms/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    // The whole SvelteKit config lives here, so the site carries no svelte.config.js. The
    // #chassis, #theme, and #lib specifiers are subpath imports declared in package.json:
    // #chassis is the genre-free layer (src/chassis/), the plumbing and composition primitives any
    // cairn theme mounts onto; #theme is the Waymark theme's own content (src/theme/), the chrome,
    // the adapter config, the token values, and the starter component looks (see
    // src/chassis/README.md for the boundary rule); #lib is the site's own helpers (src/lib/).
    sveltekit({
      preprocess: vitePreprocess(),
      // remoteBindings: false keeps `vite dev`'s platform proxy local, so a binding marked
      // `remote` never asks for Cloudflare account credentials during development.
      adapter: adapter({ platformProxy: { remoteBindings: false } }),
      prerender: {
        // The cairnManifest() plugin verifies the manifest in buildStart, outside the prerender
        // lifecycle, so a stale manifest fails the build red regardless of the policy below.
        //
        // SvelteKit's own default ('fail') already throws on every prerender HTTP error. /admin is
        // excluded from the crawl at the source (rel="external" on every /admin link, decided by
        // the shared isAdminHref predicate SiteHeader and SiteFooter both read), so the crawler
        // never reaches it, and nothing else in the site links to a route that legitimately
        // answers non-2xx during a build-time crawl. A custom handler stands in for the bare
        // 'fail' string anyway, matching the throw-unless-named idiom handleUnseenRoutes already
        // uses below: today there is nothing to name, so it throws on everything, and a future
        // legitimate case has to be added here by name rather than reintroducing a blanket 'warn'.
        handleHttpError: ({ message }) => {
          throw new Error(message);
        },
        // /archive/[page]'s own `entries` export (archive.ts's paginateArchive) enumerates the real
        // page numbers 2..N from the content index at build time. On a small or early-stage corpus
        // this legitimately returns zero entries: the whole corpus fits on page one, so no page 2
        // exists yet. This showcase's own corpus now crosses that boundary and produces /archive/2,
        // but a smaller site's still returns none, and SvelteKit's crawl-completeness check has no
        // way to tell "correctly empty" from "misconfigured entries", so it fails the whole build
        // on that route alone. Scope the exception to that one route by id; any other unseen
        // prerenderable route still fails the build, same as the default.
        handleUnseenRoutes: ({ routes, message }) => {
          const hasUnexpected = routes.some((route) => route !== '/(site)/archive/[page]');
          if (hasUnexpected) throw new Error(message);
        },
      },
    }),
    cairnManifest({
      configModule: '/src/theme/cairn.config.ts',
      content: {
        posts: '/src/content/posts/*.md',
        pages: '/src/content/pages/*.md',
        fragments: '/src/content/fragments/*.md',
      },
      manifestPath: '/src/content/.cairn/index.json',
    }),
  ],
  // The engine ships Svelte and TS source inside dist through its `svelte` export condition; let Vite process it.
  ssr: { noExternal: ['@glw907/cairn-cms'] },
  // The showcase consumes the engine through a file:../.. dist symlink. dedupe keeps Vite from
  // resolving a second @sveltejs/kit instance (which breaks the engine's `instanceof Redirect`
  // check), and fs.allow lets the dev server read the engine's dist client assets one level up.
  resolve: { dedupe: ['@sveltejs/kit'] },
  server: { fs: { allow: ['..', '../..'] } },
});
