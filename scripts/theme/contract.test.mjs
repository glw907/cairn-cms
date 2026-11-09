// Contract v1 over the two themes that must meet it: Waymark and the options fixture. Each file
// in the theme directory matches an allowed path, every required path exists, and the theme's
// built sheets declare every required token name in each color mode and each option value.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const CONTRACT = JSON.parse(readFileSync(path.join(ROOT, 'schema/cairn-theme-contract-1.json'), 'utf8'));
const THEMES = {
  waymark: path.join(ROOT, 'themes/waymark'),
  'options fixture': path.join(ROOT, 'scripts/theme/fixtures/options-theme'),
};
const COMPUTED = path.join(ROOT, 'examples/showcase/e2e/fixtures/public-theme-computed.json');

/** A contract path glob as a regular expression: `*` stays inside one segment, `**` spans any. */
function globRegExp(glob) {
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

/** Every file under a directory, as paths relative to it with forward slashes. */
function filesUnder(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();
}

/** The custom property names each top-level context of a sheet declares. */
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
 */
function declaredByMode(dir, manifest, picks) {
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

/** Every combination of one value per option; one empty pick when the theme has no options. */
function picksOf(manifest) {
  let picks = [{}];
  for (const option of manifest.options) {
    picks = picks.flatMap((pick) => option.values.map((v) => ({ ...pick, [option.key]: v.value })));
  }
  return picks;
}

test('the required token names are the computed-fixture names minus the chassis-only ones, plus the two new roles', () => {
  const computed = JSON.parse(readFileSync(COMPUTED, 'utf8'));
  const chassisOnly = CONTRACT.tokens.chassisOnly.map((entry) => entry.name);
  for (const entry of CONTRACT.tokens.chassisOnly) assert.ok(entry.reason, `${entry.name} has a reason`);
  for (const state of Object.values(computed.states)) {
    const names = Object.keys(state.root).filter((name) => !chassisOnly.includes(name));
    assert.deepEqual(
      [...CONTRACT.tokens.required].sort(),
      [...names, '--cairn-eyebrow-case', '--cairn-scroll-cue'].sort(),
    );
  }
});

for (const [label, dir] of Object.entries(THEMES)) {
  test(`every ${label} file is an allowed contract path`, () => {
    const allowed = CONTRACT.paths.allowed.map(globRegExp);
    const strays = filesUnder(dir).filter((file) => !allowed.some((re) => re.test(file)));
    assert.deepEqual(strays, []);
  });

  test(`${label} holds every required path and each file its manifest names`, () => {
    const manifest = JSON.parse(readFileSync(path.join(dir, 'cairn-theme.json'), 'utf8'));
    const named = [
      ...manifest.fonts.flatMap((font) => font.files),
      ...manifest.screenshots.map((shot) => shot.path),
      ...manifest.options.flatMap((option) => option.values.map((v) => `options/${option.key}/${v.value}.css`)),
    ];
    const missing = [...CONTRACT.paths.required, ...named].filter((rel) => !existsSync(path.join(dir, rel)));
    assert.deepEqual(missing, []);
  });

  test(`${label} declares every required token name in each mode and option value`, () => {
    const manifest = JSON.parse(readFileSync(path.join(dir, 'cairn-theme.json'), 'utf8'));
    for (const pick of picksOf(manifest)) {
      const modes = declaredByMode(dir, manifest, pick);
      for (const [mode, declared] of Object.entries(modes)) {
        const missing = CONTRACT.tokens.required.filter((name) => !declared.has(name));
        assert.deepEqual(missing, [], `${mode} mode, options ${JSON.stringify(pick)}`);
      }
    }
  });
}

test('a generated path is never shipped in a theme directory', () => {
  for (const dir of Object.values(THEMES)) {
    for (const rel of CONTRACT.paths.generated) assert.ok(!existsSync(path.join(dir, rel)), `${dir}/${rel}`);
  }
});
