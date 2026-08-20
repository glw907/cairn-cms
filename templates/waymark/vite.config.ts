import { sveltekit } from '@sveltejs/kit/vite';
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
