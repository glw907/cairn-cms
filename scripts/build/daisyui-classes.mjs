// cairn-cms: generates the full list of daisyUI class names build-admin-css.mjs feeds to one
// `@source inline(...)` in the compiled admin sheet (spec, "One compiler, every component"), so the
// admin's full daisyUI compile tracks a daisyUI upgrade automatically with no hand-kept safelist.
//
// Walks every installed module's own `object.js` under `node_modules/daisyui/{components,utilities}`,
// the CSS-in-JS tree the daisyUI Tailwind plugin itself compiles from: an object whose keys alternate
// between literal CSS selectors (mapped to a declaration object, or to a further nested selector
// object for a `&`-combinator or state clause) and at-rule wrappers (`@layer daisyui.l1.l2.l3`,
// `@media (hover: hover)`) that themselves nest more selectors. Every dotted selector key anywhere
// in that tree names one or more classes; an at-rule key never does, so it is excluded before the
// class-token regex runs (its own dotted layer path, `daisyui.l1.l2.l3`, would otherwise misread as
// three classes named `l1`, `l2`, and `l3`). A declaration VALUE is never scanned, only a key, so a
// decimal CSS value (`0.5rem`) never contributes a false class token.
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoRoot } from '../repo-root.mjs';

const DEFAULT_ROOT = resolve(repoRoot(import.meta.url), 'node_modules/daisyui');
const GROUPS = ['components', 'utilities'];

// A class token inside a selector: a literal dot immediately followed by a CSS identifier. The
// identifier must start with a letter or a dash/underscore, so a decimal fraction's dot (`.5rem`,
// always preceded by a digit's own dot in a VALUE, never a key) cannot match even if a value were
// scanned by mistake.
const CLASS_TOKEN = /\.([a-zA-Z_-][\w-]*)/g;

/**
 * Every module directory name under one daisyUI group (`components/` or `utilities/`), in
 * filesystem order. A bare CSS file sibling (`button.css`) is not a module directory.
 * @param {string} groupDir the group's absolute directory
 * @returns {string[]} each module's directory name
 */
function moduleNames(groupDir) {
  return readdirSync(groupDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Collects every class token a daisyUI `object.js` module's CSS-in-JS tree names, recursing through
 * every nested selector and at-rule wrapper.
 * @param {unknown} node one node of the tree (the module's default export, or one of its values)
 * @param {Set<string>} classes the accumulator every class token found anywhere in the tree joins
 */
function collect(node, classes) {
  if (Array.isArray(node)) {
    for (const item of node) collect(item, classes);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (!key.startsWith('@')) {
      for (const match of key.matchAll(CLASS_TOKEN)) classes.add(match[1]);
    }
    collect(value, classes);
  }
}

/**
 * Every class selector daisyUI's installed component and utility modules define, read from each
 * module's own `object.js`, so the list tracks a daisyUI upgrade with no hand-kept safelist.
 * @param {object} [options] the generator's options
 * @param {string[]} [options.exclude] module directory names to skip entirely, for example
 *   `['calendar']` to omit the third-party date-picker skins
 * @param {string} [options.root] the daisyUI package root; defaults to the installed
 *   `node_modules/daisyui`
 * @returns {Promise<string[]>} every class name (no leading dot), sorted and deduplicated
 */
export async function listDaisyuiClasses({ exclude = [], root = DEFAULT_ROOT } = {}) {
  const excluded = new Set(exclude);
  const classes = new Set();
  for (const group of GROUPS) {
    const groupDir = join(root, group);
    let names;
    try {
      names = moduleNames(groupDir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (excluded.has(name)) continue;
      const objectPath = join(groupDir, name, 'object.js');
      let mod;
      try {
        mod = await import(pathToFileURL(objectPath).href);
      } catch {
        continue;
      }
      collect(mod.default, classes);
    }
  }
  // A missing components/utilities directory, or one with no module carrying an object.js this
  // generator can read, yields zero classes the same way a renamed daisyUI module layout would:
  // silently returning an empty list would be indistinguishable from that failure, so it throws
  // instead, naming the root that produced nothing.
  if (classes.size === 0) {
    throw new Error(`listDaisyuiClasses: found no daisyUI classes under root "${root}"`);
  }
  return [...classes].sort((a, b) => a.localeCompare(b));
}
