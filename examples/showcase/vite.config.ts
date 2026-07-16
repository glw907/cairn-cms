import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { cairnManifest } from '@glw907/cairn-cms/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
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
