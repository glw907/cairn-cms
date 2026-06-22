// Transpiles the TypeScript in every shipped .svelte file's `<script>` block to plain JavaScript, so
// the published components carry no TypeScript syntax where a non-Svelte parser can reach it.
//
// svelte-package emits .svelte with `<script lang="ts">` and the TypeScript intact. Vite 8 / Rolldown's
// builtin dynamic-import-vars parses that `<script>` as JavaScript before the consumer's Svelte plugin
// compiles the file, and it chokes on TS syntax: an optional parameter `registry?: T` keeps its `?`
// after the type is stripped, which is invalid JavaScript (`registry?`). Pre-stripping the `<script>`
// types removes that hazard for every consumer regardless of their bundler.
//
// The `lang="ts"` tag stays. The Svelte compiler still needs it to parse the TypeScript that lives in
// the markup (typed `{#snippet}` parameters and `{@const x = y as T}` casts), and that markup
// TypeScript is the Svelte compiler's job, not the bundler's, so it is left untouched. The bundler only
// ever parses the `<script>` block, which is now plain JavaScript.
//
// The transpile runs esbuild with verbatimModuleSyntax, so only `import type` (and inline `type`
// specifiers) are removed and every value import is kept, even one referenced solely in the markup. The
// default TypeScript import elision drops those markup-only imports and breaks the component at runtime;
// that elision is the regression behind `vitePreprocess({ script: true })` on Vite 8, so this step
// strips the types itself with the safe option set.
import { preprocess } from 'svelte/compiler';
import { transform } from 'esbuild';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const distDir = fileURLToPath(new URL('../dist', import.meta.url));

/**
 * @param {string} dir a directory to walk
 * @returns {string[]} every .svelte file under dir, recursively
 */
function svelteFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...svelteFiles(full));
    else if (entry.name.endsWith('.svelte')) found.push(full);
  }
  return found;
}

/**
 * A Svelte `script` preprocessor that strips TypeScript while keeping every value import. A non-TS
 * block returns undefined so Svelte leaves it untouched.
 * @param {{ content: string, attributes: Record<string, string | boolean> }} block
 * @returns {Promise<{ code: string } | undefined>}
 */
async function transpileScript({ content, attributes }) {
  if (attributes.lang !== 'ts') return undefined;
  const { code } = await transform(content, {
    loader: 'ts',
    // verbatimModuleSyntax removes only `import type`, never a value import (see the header: a
    // markup-only import looks unused in the script but must survive). Load-bearing; do not drop.
    tsconfigRaw: { compilerOptions: { verbatimModuleSyntax: true } },
    target: 'es2022',
    charset: 'utf8',
  });
  return { code };
}

const files = svelteFiles(distDir);
let transpiled = 0;
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const { code } = await preprocess(source, { script: transpileScript }, { filename: file });
  // preprocess returns the source verbatim when no `<script lang="ts">` block matched, so an
  // unchanged file is one with nothing to transpile and is left on disk untouched.
  if (code === source) continue;
  writeFileSync(file, code);
  transpiled += 1;
}
console.log(`transpiled ${transpiled} of ${files.length} dist .svelte files to JavaScript`);
