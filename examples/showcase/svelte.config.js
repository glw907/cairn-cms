import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  // handleHttpError: 'warn' downgrades a prerender error to a warning. The cairnManifest() plugin
  // verifies the manifest in buildStart, outside the prerender lifecycle, so a stale manifest still
  // fails the build red even under this policy (the ecnordic #4 condition).
  kit: { adapter: adapter(), prerender: { handleHttpError: 'warn' } },
};
