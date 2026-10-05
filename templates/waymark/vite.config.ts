import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { cairnManifest } from '@glw907/cairn-cms/vite';

/**
 * Supply `__CAIRN_DEV_BUILD__`, the build-time half of the dev-backend gate (its runtime half lives
 * in src/chassis/dev-gate.ts). Vite substitutes the name as a `true`/`false` literal into the text
 * of every module that reads it, so each `if (__CAIRN_DEV_BUILD__ && ...)` folds where it is
 * written and Rollup drops the dead branch together with its dynamic `@glw907/cairn-cms-dev`
 * import. A shared exported constant cannot do this: SvelteKit's SSR build folds the constant
 * inside its own chunk but never propagates the value across the module boundary, so the consuming
 * chunk keeps the branch and the dev package ships in the deployed Worker.
 *
 * @remarks
 * The define rides a plugin `config` hook rather than `defineConfig(({ command }) => ...)` because
 * the function form makes TypeScript compare the whole inferred config against `UserConfig`, which
 * overflows its comparison depth on this plugin array.
 */
function devBuildDefine(): Plugin {
  return {
    name: 'cairn-dev-build-define',
    config(_config, { command, mode }) {
      // True while Vite is serving (`npm run dev`) or when a build opts in with VITE_CAIRN_E2E=1,
      // the flag the e2e run builds with so its specs exercise the dev backend on production output.
      const devBuild =
        command === 'serve' || loadEnv(mode, process.cwd(), 'VITE_').VITE_CAIRN_E2E === '1';
      return { define: { __CAIRN_DEV_BUILD__: JSON.stringify(devBuild) } };
    },
  };
}

export default defineConfig({
  plugins: [
    devBuildDefine(),
    tailwindcss(),
    // The whole SvelteKit config lives here, so the site carries no svelte.config.js. The
    // #chassis, #theme, and #lib specifiers are subpath imports declared in package.json:
    // #chassis is the genre-free layer (src/chassis/), the plumbing and composition primitives any
    // cairn theme mounts onto; #theme is the Waymark theme's own content (src/theme/), the chrome,
    // the adapter config, the token values, and the starter component looks (see
    // src/chassis/README.md for the boundary rule); #lib is the site's own helpers (src/lib/).
    sveltekit({
      preprocess: vitePreprocess(),
      // remoteBindings: false keeps the build-time platform proxy from connecting to Cloudflare
      // during prerender, which has no account credentials in CI.
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
      // cairn's guard owns CSRF for the admin with its own double-submit token, tolerant of the
      // missing Origin header a JS-free form POST sometimes sends. SvelteKit's own checkOrigin
      // runs ahead of any handle and would reject that POST first, so hand the authority over.
      // WATCH: kit#15992 deprecates checkOrigin in favour of csrf.trustedOrigins; revisit this
      // handoff when that lands.
      csrf: { checkOrigin: false },
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
