// Contract v1 as code: the contract data, the path globs, and the token names a theme's built sheets
// declare. The theme check and the contract test share this one reader, so the rules and the test
// cannot drift apart.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);

/** The contract's data: required, allowed, and generated paths, and the required token names. */
export const CONTRACT = JSON.parse(readFileSync(path.join(ROOT, 'schema/cairn-theme-contract-1.json'), 'utf8'));

/**
 * A contract path glob as a regular expression: `*` stays inside one segment, `**` spans any.
 * @param {string} glob
 * @returns {RegExp}
 */
export function globRegExp(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (glob.startsWith('**/', i)) {
      source += '(?:.*/)?';
      i += 2;
    } else if (glob.startsWith('**', i)) {
      source += '.*';
      i += 1;
    } else if (c === '*') source += '[^/]*';
    else source += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

/**
 * Every file under a directory, as paths relative to it with forward slashes.
 * @param {string} dir
 * @returns {string[]}
 */
export function filesUnder(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();
}

/**
 * The custom property names each top-level context of a sheet declares.
 * @param {string} css
 * @returns {Map<string, Set<string>>}
 */
function contexts(css) {
  /** @type {Map<string, Set<string>>} */
  const out = new Map();
  const add = (context, container) => {
    const set = out.get(context) ?? new Set();
    container.each((node) => {
      if (node.type === 'decl' && node.prop.startsWith('--')) set.add(node.prop);
    });
    out.set(context, set);
  };
  postcss.parse(css).each((node) => {
    if (node.type === 'atrule' && node.name === 'plugin' && node.params === '"daisyui/theme"') {
      let name = '';
      node.each((d) => {
        if (d.type === 'decl' && d.prop === 'name') name = JSON.parse(d.value);
      });
      add(`block ${name}`, node);
    } else if (node.type === 'atrule' && node.name === 'theme') {
      add('@theme', node);
    } else if (node.type === 'rule') {
      add(node.selector, node);
    } else if (node.type === 'atrule' && node.name === 'media' && /prefers-color-scheme:\s*dark/.test(node.params)) {
      node.each((rule) => {
        if (rule.type === 'rule') add(`dark-os ${rule.selector}`, rule);
      });
    }
  });
  return out;
}

const union = (...sets) => new Set(sets.flatMap((s) => (s ? [...s] : [])));
const both = (a = new Set(), b = new Set()) => new Set([...a].filter((x) => b.has(x)));

/**
 * The names a theme's built sheets declare in each mode, for one option value per option: the
 * daisyUI block of that mode, the `@theme` scale and the root rule in both, and a dark value
 * declared under both the system-preference and the explicit-choice selectors.
 * @param {string} dir the theme directory
 * @param {{ colorModes: { light: string, dark: string } }} manifest
 * @param {Record<string, string>} picks one value per option key
 * @returns {{ light: Set<string>, dark: Set<string> }}
 */
export function declaredByMode(dir, manifest, picks) {
  const { light, dark } = manifest.colorModes;
  const explicitDark = `:root[data-theme="${dark}"]`;
  const tokens = contexts(readFileSync(path.join(dir, 'tokens/tokens.css'), 'utf8'));
  const shared = union(tokens.get('@theme'), tokens.get(':root'));
  const modes = {
    light: union(tokens.get(`block ${light}`), shared),
    dark: union(
      tokens.get(`block ${dark}`),
      shared,
      both(tokens.get('dark-os :root:not([data-theme])'), tokens.get(explicitDark)),
    ),
  };
  for (const [key, value] of Object.entries(picks)) {
    const sheet = contexts(readFileSync(path.join(dir, `options/${key}/${value}.css`), 'utf8'));
    const lightRule = [...sheet.keys()].find((k) => k.startsWith(':where(:root)'));
    const darkRule = [...sheet.keys()].find((k) => !k.startsWith('dark-os') && k.includes(`[data-theme="${dark}"]`));
    modes.light = union(modes.light, sheet.get(lightRule));
    modes.dark = union(modes.dark, both(sheet.get('dark-os :root:not([data-theme])'), sheet.get(darkRule)));
  }
  return modes;
}

/**
 * Every combination of one value per option; one empty pick when the theme has no options.
 * @param {{ options: { key: string, values: { value: string }[] }[] }} manifest
 * @returns {Record<string, string>[]}
 */
export function picksOf(manifest) {
  /** @type {Record<string, string>[]} */
  let picks = [{}];
  for (const option of manifest.options) {
    picks = picks.flatMap((pick) => option.values.map((v) => ({ ...pick, [option.key]: v.value })));
  }
  return picks;
}
