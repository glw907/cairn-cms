#!/usr/bin/env node
// Builds a theme directory's CSS from its tokens. Usage:
//
//   node scripts/theme/build-tokens.mjs <themeDir> [--check]
//
// It validates cairn-theme.json against the manifest schema, and tokens/tokens.json and
// tokens/resolver.json against the vendored DTCG 2025.10 schema, then writes
//
//   tokens/tokens.css          the two daisyUI theme blocks, the `@theme` scale, and the unlayered
//                              `:root` and dark rules
//   options/<key>/<value>.css  the custom properties one option value changes
//   modes/light.css            the no-cookie default pinned to light
//   modes/dark.css             the no-cookie default pinned to dark
//
// With --check it writes nothing and exits 1 when a built file is stale. The model is Survey's
// scripts/build, in the same one-pass shape.
//
// How the tokens and the resolver fit. tokens.json holds token groups, and each token key is a CSS
// custom property name without its leading dashes. The resolver names the groups: its `base` set is
// the flat tokens every mode shares, its `mode` modifier has a `light` and a `dark` context, each a
// flat token group for that daisyUI block, and every other modifier is a theme option, whose
// contexts are the option's values. An option context holds a `light` and a `dark` group, the
// values that option value sets in each block. Sources are a `$ref` into tokens.json
// (`tokens.json#/color/light`) or an inline group.
//
// Where a mode token lands. A mode token goes in its daisyUI block unless the block cannot carry
// it: a value with a comma does not survive the plugin's option parser, and a token marked
// `"$extensions": { "pub.cairn": { "unlayered": true } }` must beat a layered value, which a
// daisyUI block (emitted into `@layer base`) cannot. Such a token is written unlayered in both
// modes, its light value on `:root` and its dark value under the same two selectors daisyUI gives
// its dark block: the system preference, guarded by `:root:not([data-theme])` so a visitor's choice
// wins, and the explicit `:root[data-theme="<dark name>"]`.
//
// How an option sheet composes with a mode sheet. A mode sheet pins what a visitor with no cookie
// sees: its rule sits on `:root:not([data-theme])`, which the page shell leaves bare until a cookie
// names a theme, so a cookie still wins. An option sheet is chosen apart from the mode, so it cannot
// know whether a mode sheet is present. It declares its values under the three selectors daisyUI
// uses for its blocks (light, dark by explicit choice, dark by system preference) and also publishes
// each value as a private `--cairn-opt-<name>-<mode>` property. The mode sheet reads those private
// properties for every token an option changes, with the base value as the fallback, so the pinned
// state shows the chosen option's value for that mode and no option sheet changes nothing.
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = path.join(HERE, '../../schema');

// WATCH: cairn.pub publishes this schema at this URL in the cairn.pub rebuild; until then the check
// validates against the bundled schema/cairn-theme-1.schema.json and never fetches.
const MANIFEST_SCHEMA_URL = 'https://cairn.pub/schemas/cairn-theme/1.json';

const DTCG_BASE = 'https://www.designtokens.org/schemas/2025.10/';

/** A font family name that is one CSS identifier, such as `Roboto` or `-apple-system`, which the output leaves unquoted. */
const IDENTIFIER_FAMILY = /^-?[A-Za-z_][\w-]*$/;

/** The Tailwind theme namespaces: a base token under one of these goes in `@theme`, so Tailwind generates its utilities. */
const THEME_NAMESPACES = /^(font|text|spacing|leading|tracking|container|color|radius|shadow|ease|animate|breakpoint|blur|aspect)-/;

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const readJsonSync = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** The Ajv instances, compiled on first use: DTCG's draft-07 schemas, and the house draft 2020-12 ones. */
let compiled;
function validators() {
  if (compiled) return compiled;
  const dtcg = new Ajv({ validateFormats: false, strict: false, allErrors: true });
  const resolverSchema = readJsonSync(path.join(SCHEMA_DIR, 'dtcg/2025.10/resolver.json'));
  const resolver = dtcg.compile(resolverSchema);
  const format = dtcg.getSchema(`${DTCG_BASE}format.json`);
  const house = new Ajv2020({ validateFormats: false, allErrors: true });
  const manifestSchema = readJsonSync(path.join(SCHEMA_DIR, 'cairn-theme-1.schema.json'));
  if (manifestSchema.$id !== MANIFEST_SCHEMA_URL) {
    throw new Error(`schema/cairn-theme-1.schema.json has $id ${manifestSchema.$id}, expected ${MANIFEST_SCHEMA_URL}`);
  }
  compiled = { resolver, format, manifest: house.compile(manifestSchema) };
  return compiled;
}

/** @param {string} label @param {import('ajv').ErrorObject[] | null | undefined} errors */
const describe = (label, errors) =>
  (errors ?? []).map((e) => `${label}${e.instancePath || '/'} ${e.message}`);

/**
 * Validates a manifest against the schema, plus the rules a schema cannot state: each option's
 * `default` is one of its values, and keys and values are unique.
 * @param {unknown} manifest
 * @returns {string[]} one message per problem; empty when the manifest is valid
 */
export function validateManifest(manifest) {
  const { manifest: validate } = validators();
  if (!validate(manifest)) return describe('cairn-theme.json', validate.errors);
  const problems = [];
  const keys = new Set();
  for (const option of manifest.options) {
    if (keys.has(option.key)) problems.push(`cairn-theme.json option key "${option.key}" is repeated`);
    keys.add(option.key);
    const values = option.values.map((v) => v.value);
    if (new Set(values).size !== values.length) problems.push(`cairn-theme.json option "${option.key}" repeats a value`);
    if (!values.includes(option.default)) {
      problems.push(`cairn-theme.json option "${option.key}" default "${option.default}" is not one of its values`);
    }
  }
  if (manifest.colorModes.light === manifest.colorModes.dark) {
    problems.push('cairn-theme.json colorModes names the same theme for light and dark');
  }
  return problems;
}

/** The token map at a `tokens.json#/a/b` reference, or undefined. */
function pointer(tokens, ref) {
  const [file, fragment = ''] = ref.split('#');
  if (file !== 'tokens.json') return undefined;
  let node = tokens;
  for (const part of fragment.split('/').filter(Boolean)) {
    node = node?.[part.replaceAll('~1', '/').replaceAll('~0', '~')];
  }
  return node;
}

/** Merges a modifier context's or set's sources into one flat map of tokens, or throws. */
function flatten(tokens, resolver, sources, where) {
  const merged = {};
  for (const source of sources) {
    let group = source;
    if (typeof source.$ref === 'string') {
      if (source.$ref.startsWith('#/sets/')) {
        const set = resolver.sets?.[source.$ref.slice('#/sets/'.length)];
        if (!set) throw new Error(`${where}: ${source.$ref} names no set`);
        Object.assign(merged, flatten(tokens, resolver, set.sources, where));
        continue;
      }
      group = pointer(tokens, source.$ref);
      if (!group || typeof group !== 'object') throw new Error(`${where}: ${source.$ref} names no token group in tokens.json`);
    }
    for (const [name, token] of Object.entries(group)) {
      if (name.startsWith('$')) continue;
      if (!token || typeof token !== 'object' || !('$value' in token)) {
        throw new Error(`${where}: "${name}" is a group, and a token set holds only tokens`);
      }
      merged[name] = token;
    }
  }
  return merged;
}

/**
 * Reads the resolver into the build's model: the base tokens, the two modes' tokens, and each
 * option's values as `{ light, dark }` token maps.
 * @returns {{ base: object, modes: { light: object, dark: object }, options: Record<string, Record<string, { light: object, dark: object }>> }}
 */
function resolve(tokens, resolver) {
  const base = {};
  for (const set of Object.keys(resolver.sets ?? {})) {
    Object.assign(base, flatten(tokens, resolver, resolver.sets[set].sources, `resolver set "${set}"`));
  }
  const modifiers = resolver.modifiers ?? {};
  const mode = modifiers.mode;
  if (!mode || !mode.contexts.light || !mode.contexts.dark) {
    throw new Error('resolver needs a "mode" modifier with a "light" and a "dark" context');
  }
  const modes = {
    light: flatten(tokens, resolver, mode.contexts.light, 'resolver mode "light"'),
    dark: flatten(tokens, resolver, mode.contexts.dark, 'resolver mode "dark"'),
  };
  const options = {};
  for (const [key, modifier] of Object.entries(modifiers)) {
    if (key === 'mode') continue;
    options[key] = {};
    for (const [value, sources] of Object.entries(modifier.contexts)) {
      const where = `resolver option "${key}" value "${value}"`;
      const group = {};
      for (const source of sources) {
        const node = typeof source.$ref === 'string' ? pointer(tokens, source.$ref) : source;
        if (!node || typeof node !== 'object') throw new Error(`${where}: ${source.$ref} names no token group in tokens.json`);
        for (const m of ['light', 'dark']) {
          if (node[m]) group[m] = { ...group[m], ...flatten(tokens, resolver, [node[m]], `${where} ${m}`) };
        }
      }
      options[key][value] = { light: group.light ?? {}, dark: group.dark ?? {} };
    }
  }
  return { base, modes, options };
}

/**
 * Validates tokens and the resolver against DTCG 2025.10, and the resolver's modifiers against the
 * manifest's options when a manifest is given.
 * @param {{ tokens: object, resolver: object, manifest?: object }} input
 * @returns {string[]} one message per problem, each naming the path it concerns
 */
export function validateTokens({ tokens, resolver, manifest }) {
  const v = validators();
  const problems = [];
  if (!v.format(tokens)) problems.push(...describe('tokens/tokens.json', v.format.errors));
  if (!v.resolver(resolver)) problems.push(...describe('tokens/resolver.json', v.resolver.errors));
  if (problems.length) return problems;
  try {
    resolve(tokens, resolver);
  } catch (error) {
    problems.push(`tokens/resolver.json ${error.message}`);
  }
  for (const [name, modifier] of Object.entries(resolver.modifiers ?? {})) {
    if (modifier.default !== undefined && !(modifier.default in modifier.contexts)) {
      problems.push(`tokens/resolver.json modifier "${name}" default "${modifier.default}" is not one of its contexts`);
    }
  }
  if (manifest) {
    const modifiers = Object.keys(resolver.modifiers ?? {}).filter((k) => k !== 'mode');
    const keys = manifest.options.map((o) => o.key);
    for (const key of modifiers) {
      if (!keys.includes(key)) problems.push(`tokens/resolver.json modifier "${key}" has no option "${key}" in cairn-theme.json`);
    }
    for (const option of manifest.options) {
      const modifier = resolver.modifiers?.[option.key];
      if (!modifier) {
        problems.push(`cairn-theme.json option "${option.key}" has no modifier "${option.key}" in tokens/resolver.json`);
        continue;
      }
      const values = option.values.map((x) => x.value).sort().join(',');
      const contexts = Object.keys(modifier.contexts).sort().join(',');
      if (values !== contexts) {
        problems.push(`cairn-theme.json option "${option.key}" values (${values}) differ from the modifier's contexts (${contexts})`);
      }
    }
  }
  return problems;
}

const fmt = (n) => String(Number(Number(n).toFixed(6)));

/** The CSS text of a DTCG color object. Lightness is a percent at the source's precision. */
function colorCss({ colorSpace, components, alpha }) {
  const [a, b, c] = components.map((x) => (typeof x === 'number' ? fmt(x) : String(x)));
  const tail = alpha === undefined || alpha === 1 ? '' : ` / ${fmt(alpha * 100)}%`;
  const num = (x) => (typeof x === 'number' ? fmt(x) : String(x));
  switch (colorSpace) {
    case 'oklch':
    case 'oklab': {
      const l = typeof components[0] === 'number' ? `${fmt(components[0] * 100)}%` : String(components[0]);
      return `${colorSpace}(${l} ${num(components[1])} ${num(components[2])}${tail})`;
    }
    case 'lab':
    case 'lch':
      return `${colorSpace}(${a} ${b} ${c}${tail})`;
    case 'hsl':
    case 'hwb':
      return `${colorSpace}(${a} ${typeof components[1] === 'number' ? `${fmt(components[1])}%` : b} ${typeof components[2] === 'number' ? `${fmt(components[2])}%` : c}${tail})`;
    default:
      return `color(${colorSpace} ${a} ${b} ${c}${tail})`;
  }
}

/** The CSS text of one token's value. */
function valueCss(token) {
  const value = token.$value;
  switch (token.$type) {
    case 'color':
      return colorCss(value);
    case 'fontFamily':
      return (Array.isArray(value) ? value : [value]).map((f) => (IDENTIFIER_FAMILY.test(f) ? f : `"${f}"`)).join(', ');
    case 'cubicBezier':
      return `cubic-bezier(${value.join(', ')})`;
    case 'dimension':
    case 'duration':
      return `${fmt(value.value)}${value.unit}`;
    default:
      return String(value);
  }
}

const header = (what) => `/* ${what} Built from the theme's tokens by scripts/theme/build-tokens.mjs. Do not edit. */\n`;

const declarations = (map, indent, wrap = (_name, text) => text) =>
  Object.entries(map)
    .map(([name, token]) => `${indent}--${name}: ${wrap(name, valueCss(token))};`)
    .join('\n');

/** The `@plugin "daisyui/theme"` block for one mode. */
function daisyBlock({ name, mode, tokens }) {
  const light = mode === 'light';
  return (
    `@plugin "daisyui/theme" {\n` +
    `  name: "${name}";\n` +
    `  default: ${light};\n` +
    `  prefersdark: ${!light};\n` +
    `  color-scheme: ${mode};\n\n` +
    `${declarations(tokens, '  ')}\n` +
    `}\n`
  );
}

/** Whether a mode token must be written unlayered rather than in its daisyUI block. */
const unlayered = (token) => valueCss(token).includes(',') || token.$extensions?.['pub.cairn']?.unlayered === true;

/** Splits the two modes into the tokens their daisyUI blocks carry and the ones written unlayered. */
function splitModes(modes) {
  const names = new Set(
    ['light', 'dark'].flatMap((m) => Object.entries(modes[m]).filter(([, token]) => unlayered(token)).map(([name]) => name)),
  );
  const pick = (map, keep) => Object.fromEntries(Object.entries(map).filter(([name]) => names.has(name) === keep));
  return {
    blocks: { light: pick(modes.light, false), dark: pick(modes.dark, false) },
    loose: { light: pick(modes.light, true), dark: pick(modes.dark, true) },
  };
}

function tokensCss(manifest, { base, modes }) {
  const themed = Object.fromEntries(Object.entries(base).filter(([name]) => THEME_NAMESPACES.test(name)));
  const plain = Object.fromEntries(Object.entries(base).filter(([name]) => !THEME_NAMESPACES.test(name)));
  const { blocks, loose } = splitModes(modes);
  const root = { ...plain, ...loose.light };
  const parts = [
    header('The daisyUI theme blocks, the `@theme` scale, and the unlayered root and dark rules.'),
    daisyBlock({ name: manifest.colorModes.light, mode: 'light', tokens: blocks.light }),
    daisyBlock({ name: manifest.colorModes.dark, mode: 'dark', tokens: blocks.dark }),
  ];
  if (Object.keys(themed).length) parts.push(`@theme {\n${declarations(themed, '  ')}\n}\n`);
  if (Object.keys(root).length) parts.push(`:root {\n${declarations(root, '  ')}\n}\n`);
  if (Object.keys(loose.dark).length) {
    parts.push(
      `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n${declarations(loose.dark, '    ')}\n  }\n}\n`,
      `:root[data-theme="${manifest.colorModes.dark}"] {\n${declarations(loose.dark, '  ')}\n}\n`,
    );
  }
  return parts.join('\n');
}

const privateName = (name, mode) => `--cairn-opt-${name}-${mode}`;

/**
 * The selectors daisyUI gives the light block, the dark block by choice, and the dark block by
 * system preference. An option or mode sheet is unlayered, because Tailwind emits daisyUI's blocks
 * into `@layer base` after the imported sheets, so source order cannot decide against them while
 * an unlayered rule always does.
 */
function selectors(manifest) {
  const { light, dark } = manifest.colorModes;
  const block = (name) => `:root:has(input.theme-controller[value="${name}"]:checked),[data-theme="${name}"]`;
  return {
    light: `:where(:root),${block(light)}`,
    explicitDark: block(dark),
    systemDark: ':root:not([data-theme])',
  };
}

function optionCss(manifest, key, value, { light, dark }) {
  const at = selectors(manifest);
  const rule = (selector, map, indent = '') =>
    `${indent}${selector} {\n${declarations(map, `${indent}  `)}\n${indent}}\n`;
  const published = [
    ...Object.entries(light).map(([name, token]) => `  ${privateName(name, 'light')}: ${valueCss(token)};`),
    ...Object.entries(dark).map(([name, token]) => `  ${privateName(name, 'dark')}: ${valueCss(token)};`),
  ].join('\n');
  const body = [
    Object.keys(light).length ? rule(at.light, light) : '',
    Object.keys(dark).length ? `@media (prefers-color-scheme: dark) {\n${rule(at.systemDark, dark, '  ')}}\n` : '',
    Object.keys(dark).length ? rule(at.explicitDark, dark) : '',
    published ? `:root {\n${published}\n}\n` : '',
  ].filter(Boolean);
  return header(`The "${value}" value of the "${key}" option.`) + body.join('');
}

function modeCss(mode, { base: shared, modes, options }) {
  const optioned = new Set();
  for (const values of Object.values(options)) {
    for (const group of Object.values(values)) for (const name of Object.keys(group[mode])) optioned.add(name);
  }
  // A shared token the other mode overrides unlayered (such as a card border that only the dark
  // mode restates) is pinned back to its shared value, or the other mode's system-preference rule
  // would show through the pin.
  const other = modes[mode === 'light' ? 'dark' : 'light'];
  const restored = Object.fromEntries(
    Object.keys(other)
      .filter((name) => !(name in modes[mode]) && name in shared)
      .map((name) => [name, shared[name]]),
  );
  const base = { ...modes[mode], ...restored };
  const lines = Object.entries(base).map(
    ([name, token]) =>
      `  --${name}: ${optioned.has(name) ? `var(${privateName(name, mode)}, ${valueCss(token)})` : valueCss(token)};`,
  );
  for (const name of optioned) {
    if (!(name in base)) lines.push(`  --${name}: var(${privateName(name, mode)});`);
  }
  // `html:root:not([data-theme])` outranks an option sheet's `:root:not([data-theme])` rules, so the pin
  // wins over them in either concatenation order.
  return (
    header(`The ${mode} default: a visitor with no theme cookie sees the ${mode} block, and the cookie still wins.`) +
    `html:root:not([data-theme]) {\n  color-scheme: ${mode};\n${lines.join('\n')}\n}\n`
  );
}

/**
 * Builds every output of a theme directory, validating its inputs first.
 * @param {string} themeDir
 * @returns {Promise<Record<string, string>>} file text keyed by path relative to the theme directory
 * @throws {Error} listing every validation problem
 */
export async function buildTheme(themeDir) {
  const manifest = await readJson(path.join(themeDir, 'cairn-theme.json'));
  const tokens = await readJson(path.join(themeDir, 'tokens/tokens.json'));
  const resolver = await readJson(path.join(themeDir, 'tokens/resolver.json'));
  const problems = [...validateManifest(manifest)];
  if (!problems.length) problems.push(...(validateTokens({ tokens, resolver, manifest })));
  if (problems.length) throw new Error(problems.join('\n'));

  const model = resolve(tokens, resolver);
  const outputs = { 'tokens/tokens.css': tokensCss(manifest, model) };
  for (const [key, values] of Object.entries(model.options)) {
    for (const [value, group] of Object.entries(values)) {
      outputs[`options/${key}/${value}.css`] = optionCss(manifest, key, value, group);
    }
  }
  outputs['modes/light.css'] = modeCss('light', model);
  outputs['modes/dark.css'] = modeCss('dark', model);
  return outputs;
}

async function main(args) {
  const check = args.includes('--check');
  const [dir] = args.filter((a) => !a.startsWith('--'));
  if (!dir) {
    console.error('usage: build-tokens.mjs <themeDir> [--check]');
    return 2;
  }
  let outputs;
  try {
    outputs = await buildTheme(path.resolve(dir));
  } catch (error) {
    console.error(error.message);
    return 1;
  }
  let stale = 0;
  for (const [rel, text] of Object.entries(outputs)) {
    const file = path.join(path.resolve(dir), rel);
    const current = existsSync(file) ? await readFile(file, 'utf8') : '';
    if (current === text) continue;
    stale++;
    if (check) console.error(`stale: ${rel}`);
    else {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, text);
    }
  }
  if (check && stale) {
    console.error('run scripts/theme/build-tokens.mjs and commit the result');
    return 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
