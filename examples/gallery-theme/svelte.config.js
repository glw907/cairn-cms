import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    // remoteBindings: false keeps the build-time platform proxy from connecting to Cloudflare
    // during prerender, which has no account credentials in CI.
    adapter: adapter({ platformProxy: { remoteBindings: false } }),
    // $chassis resolves the genre-free layer (src/chassis/), copied verbatim from the showcase's
    // canonical copy at port time (see src/chassis/README.md). $theme resolves this theme's own
    // content: the Gallery chrome, the adapter config, the token values. This port ships no
    // admin, so it keeps no $lib either.
    alias: {
      $chassis: 'src/chassis',
      '$chassis/*': 'src/chassis/*',
      $theme: 'src/theme',
      '$theme/*': 'src/theme/*',
    },
    prerender: { handleHttpError: 'warn' },
  },
};
