import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    // remoteBindings: false keeps the build-time platform proxy from connecting to Cloudflare
    // during prerender, which has no account credentials in CI.
    // fallback: 'spa' generates a static client-hydrated shell for any request that matches no
    // prerendered file (this port is fully prerendered, so an arbitrary bad path has no static
    // page of its own); paired with `assets.not_found_handling: "404-page"` in wrangler.jsonc, Cloudflare
    // serves that shell directly, which then boots the client router and renders this port's own
    // themed `(site)/+error.svelte` inside its chrome, instead of the framework's bare built-in
    // fallback.
    adapter: adapter({ platformProxy: { remoteBindings: false }, fallback: 'spa' }),
    // $chassis resolves the genre-free layer (src/chassis/), copied verbatim from the showcase's
    // canonical copy at port time (see src/chassis/README.md). $theme resolves this theme's own
    // content: the Foxi chrome, the adapter config, the token values, the composed-page
    // components. This port ships no admin, so it keeps no $lib either.
    alias: {
      $chassis: 'src/chassis',
      '$chassis/*': 'src/chassis/*',
      $theme: 'src/theme',
      '$theme/*': 'src/theme/*',
    },
    prerender: { handleHttpError: 'warn' },
  },
};
