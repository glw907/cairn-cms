// Compiles the cairn admin stylesheet: Tailwind utilities plus DaisyUI component classes (built-in
// themes off, no global Preflight) plus the Warm Stone theme variables, then scopes every rule under
// the admin data-theme so nothing leaks onto the host's pages. The admin components import the
// result at dist/components/cairn-admin.css, so the admin styles itself on any host with no host CSS.
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import prefixSelector from 'postcss-prefix-selector';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repoRoot = new URL('../', import.meta.url);
const inputPath = fileURLToPath(new URL('scripts/admin-css.input.css', repoRoot));
const outDir = fileURLToPath(new URL('dist/components', repoRoot));
const outPath = fileURLToPath(new URL('dist/components/cairn-admin.css', repoRoot));

// Both admin theme roots, kept low-specificity with :where so the host can always override and the
// scoped utilities never outrank a host rule on equal class names.
const SCOPE = ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])";

export async function buildAdminCss() {
  const input = readFileSync(inputPath, 'utf8');
  // Stage 1: Tailwind and DaisyUI compile. `from` is the input path so @source and @import resolve
  // relatively and the plugins resolve from the repo's node_modules.
  const compiled = await postcss([tailwind()]).process(input, { from: inputPath });
  // Stage 2: scope every rule under the admin theme roots.
  const scoped = await postcss([
    prefixSelector({
      prefix: SCOPE,
      /**
       * @param {string} prefix the scope selector this plugin prepends
       * @param {string} selector the original rule selector
       * @param {string} prefixed the selector already prefixed with the scope
       * @returns {string} the selector to emit
       */
      transform(prefix, selector, prefixed) {
        // A rule already rooted at a theme (the hand-authored variables and the reset) stays as-is.
        if (selector.includes('[data-theme=')) return selector;
        // Tailwind emits its theme tokens under :root (and :host); map those to the theme root.
        if (selector === ':root' || selector === 'html' || selector === 'body') return prefix;
        return prefixed;
      },
    }),
  ]).process(compiled.css, { from: undefined });
  return scoped.css;
}

// When run as a script, write the compiled sheet into dist, overwriting the variables-only partial
// that svelte-package copied there.
if (import.meta.url === `file://${process.argv[1]}`) {
  const css = await buildAdminCss();
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, css);
  console.log(`wrote ${outPath} (${css.length} bytes)`);
}
