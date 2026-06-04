import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
// Spike import: the @glw907/cairn-cms/vite package export does not exist yet (Task 4 adds it), so
// the plugin is imported from the linked package source by relative path. The symlink at
// node_modules/@glw907/cairn-cms points at the worktree root, so ../../src/lib/vite/index.ts is the
// plugin source. Task 4 switches this to `import { cairnManifest } from '@glw907/cairn-cms/vite'`.
import { cairnManifest } from '../../src/lib/vite/index.ts';

export default defineConfig({
  plugins: [
    sveltekit(),
    cairnManifest({
      configModule: '/src/lib/cairn.config.ts',
      content: { posts: '/src/content/posts/*.md', pages: '/src/content/pages/*.md' },
      manifestPath: '/src/content/.cairn/index.json',
    }),
  ],
  // The engine ships Svelte and TS source inside dist through its `svelte` export condition; let Vite process it.
  ssr: { noExternal: ['@glw907/cairn-cms'] },
});
