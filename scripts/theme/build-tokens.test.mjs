import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { chromium } from 'playwright';
import { repoRoot } from '../repo-root.mjs';
import { buildTheme, validateManifest, validateTokens } from './build-tokens.mjs';

const ROOT = repoRoot(import.meta.url);
const SCRIPT = path.join(ROOT, 'scripts/theme/build-tokens.mjs');
const FIXTURE = path.join(ROOT, 'scripts/theme/fixtures/options-theme');

/** @param {string} file @returns {Promise<any>} */
async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

/** @type {string} */
let work;
before(async () => {
  // Inside node_modules so the compile resolves tailwindcss and daisyui from the repository.
  await mkdir(path.join(ROOT, 'node_modules/.cache'), { recursive: true });
  work = await mkdtemp(path.join(ROOT, 'node_modules/.cache/cairn-build-tokens-'));
});
after(async () => {
  await rm(work, { recursive: true, force: true });
});

/** A fresh copy of the fixture theme, so a test may edit it. */
async function copyFixture(name) {
  const dir = path.join(work, name);
  await cp(FIXTURE, dir, { recursive: true });
  return dir;
}

function build(dir, ...flags) {
  return spawnSync(process.execPath, [SCRIPT, dir, ...flags], { encoding: 'utf8' });
}

test('the fixture theme validates', async () => {
  const tokens = await readJson(path.join(FIXTURE, 'tokens/tokens.json'));
  const resolver = await readJson(path.join(FIXTURE, 'tokens/resolver.json'));
  assert.deepEqual(validateTokens({ tokens, resolver }), []);
});

test('a "#fff" color value fails with the token path, and an untyped clamp() string passes', async () => {
  const tokens = await readJson(path.join(FIXTURE, 'tokens/tokens.json'));
  const resolver = await readJson(path.join(FIXTURE, 'tokens/resolver.json'));
  assert.equal(tokens.base['text-step-0'].$type, undefined);
  assert.match(tokens.base['text-step-0'].$value, /^clamp\(/);
  assert.deepEqual(validateTokens({ tokens, resolver }), []);

  tokens.color.light['color-accent'].$value = '#fff';
  const errors = validateTokens({ tokens, resolver });
  assert.ok(errors.length > 0);
  assert.ok(
    errors.some((e) => e.includes('/color/light/color-accent')),
    `an error names the token path: ${errors.join(' | ')}`,
  );
});

test('a resolver modifier with no matching manifest option is an error, and so is the reverse', async () => {
  const tokens = await readJson(path.join(FIXTURE, 'tokens/tokens.json'));
  const resolver = await readJson(path.join(FIXTURE, 'tokens/resolver.json'));
  const manifest = await readJson(path.join(FIXTURE, 'cairn-theme.json'));
  assert.deepEqual(validateTokens({ tokens, resolver, manifest }), []);
  const dropped = structuredClone(manifest);
  dropped.options = [];
  assert.ok(validateTokens({ tokens, resolver, manifest: dropped }).some((e) => e.includes('accent')));
  const extra = structuredClone(resolver);
  delete extra.modifiers.accent;
  extra.resolutionOrder.pop();
  assert.ok(validateTokens({ tokens, resolver: extra, manifest }).some((e) => e.includes('accent')));
});

test('the manifest schema accepts the fixture and rejects each bound the plan names', async () => {
  const manifest = await readJson(path.join(FIXTURE, 'cairn-theme.json'));
  assert.deepEqual(validateManifest(manifest), []);

  const mutate = (fn) => {
    const copy = structuredClone(manifest);
    fn(copy);
    return validateManifest(copy);
  };
  const option = (n) => ({
    key: `opt${'abcdef'[n]}`,
    label: 'Option',
    values: [
      { value: 'one', label: 'One' },
      { value: 'two', label: 'Two' },
    ],
    default: 'one',
  });

  assert.ok(mutate((m) => (m.description = 'x'.repeat(61))).length > 0, '61-character description');
  assert.deepEqual(mutate((m) => (m.description = 'x'.repeat(60))), [], '60 characters is allowed');
  assert.ok(mutate((m) => (m.id = 'Waymark')).length > 0, 'capitalised id');
  assert.ok(mutate((m) => (m.options = [0, 1, 2, 3, 4].map(option))).length > 0, 'five options');
  assert.deepEqual(mutate((m) => (m.options = [0, 1, 2, 3].map(option))), [], 'four options');
  assert.ok(
    mutate((m) => (m.options[0].values = [{ value: 'ember', label: 'Ember' }])).length > 0,
    'an option with one value',
  );
  assert.ok(mutate((m) => (m.options[0].default = 'moss')).length > 0, 'default outside the values');
  assert.ok(mutate((m) => (m.contract = 2)).length > 0, 'contract 2');
  assert.ok(mutate((m) => (m.extra = true)).length > 0, 'an unknown field');
  assert.ok(
    mutate((m) => (m.fonts = [{ name: 'F', license: 'OFL-1.1', source: 'https://x.test', files: ['f.ttf'] }]))
      .length > 0,
    'a font file that is not woff2',
  );
});

test('the manifest schema states that an option key is a contract', async () => {
  const schema = await readJson(path.join(ROOT, 'schema/cairn-theme-1.schema.json'));
  assert.match(JSON.stringify(schema), /option key is a contract/i);
});

test('--check exits 1 after a token edit and 0 after a rebuild', async () => {
  const dir = await copyFixture('check');
  assert.equal(build(dir).status, 0);
  assert.equal(build(dir, '--check').status, 0);

  const tokensFile = path.join(dir, 'tokens/tokens.json');
  const tokens = await readJson(tokensFile);
  tokens.color.light['color-primary'].$value.components[0] = 0.4;
  await writeFile(tokensFile, JSON.stringify(tokens, null, 2));
  const stale = build(dir, '--check');
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /tokens\/tokens\.css/);

  assert.equal(build(dir).status, 0);
  assert.equal(build(dir, '--check').status, 0);
});

test('--check exits 1 on an option sheet no option value builds (#414)', async () => {
  const dir = await copyFixture('orphan');
  assert.equal(build(dir).status, 0);
  await writeFile(path.join(dir, 'options/accent/moss.css'), '/* left behind */\n');
  const result = build(dir, '--check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /orphaned: options\/accent\/moss\.css/);
});

test('the committed fixture build is current', () => {
  const result = build(FIXTURE, '--check');
  assert.equal(result.status, 0, result.stderr);
});

test('the build writes the values with the same text as the source CSS', async () => {
  const out = await buildTheme(FIXTURE);
  const css = out['tokens/tokens.css'];
  assert.match(css, /--color-primary: oklch\(45% 0\.1 248\);/);
  assert.match(css, /--color-base-100: oklch\(98\.4% 0 0\);/);
  assert.match(css, /--text-step-0: clamp\(1rem, 0\.95rem \+ 0\.2vw, 1\.1rem\);/);
  assert.match(css, /--radius-box: 0\.5rem;/);
  assert.deepEqual(Object.keys(out).sort(), [
    'modes/dark.css',
    'modes/light.css',
    'options/accent/ember.css',
    'options/accent/tide.css',
    'tokens/tokens.css',
  ]);
});

const WAYMARK = path.join(ROOT, 'themes/waymark');

// Waymark's theme.css as it stood before its values moved into tokens (commit 9a193ca, the last
// with the blocks inline), kept as a snapshot so the comparison survives a shallow clone and a
// later main.
const BEFORE = path.join(ROOT, 'scripts/theme/fixtures/waymark-theme-9a193ca.css');
const BEFORE_COMMIT = '9a193ca13269d529aa4c2975d1e66a896deba745';
const BEFORE_PATH = 'examples/showcase/src/theme/theme.css';

const ROOT_SELECTOR = ':root';
const DARK_OS = '@media (prefers-color-scheme: dark) :root:not([data-theme])';
const DARK_EXPLICIT = ':root[data-theme="cairn-dark"]';

/**
 * The declarations that sat in hand-written rules after the `@theme` block and moved into the
 * tokens, by the selector they sat under.
 */
const MOVED = {
  [ROOT_SELECTOR]: [
    '--cairn-shadow',
    '--cairn-cta-bg',
    '--cairn-cta-content',
    '--cairn-cta-border',
    '--cairn-cta-btn-bg',
    '--cairn-cta-btn-content',
    '--cairn-caption-tracking',
  ],
  [DARK_OS]: [
    '--color-card-border',
    '--cairn-shadow',
    '--cairn-cta-bg',
    '--cairn-cta-content',
    '--cairn-cta-border',
    '--cairn-cta-btn-bg',
    '--cairn-cta-btn-content',
  ],
  [DARK_EXPLICIT]: [
    '--color-card-border',
    '--cairn-shadow',
    '--cairn-cta-bg',
    '--cairn-cta-content',
    '--cairn-cta-border',
    '--cairn-cta-btn-bg',
    '--cairn-cta-btn-content',
  ],
};

/** The two roles the chassis defaults, which Waymark's tokens declare at those defaults. */
const NEW_ROLES = ['--cairn-eyebrow-case', '--cairn-scroll-cue'];

const normalize = (value) =>
  value.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();

/**
 * Every top-level declaration in a sheet as `context | property | value`, the context being the
 * daisyUI block's name, `@theme`, a rule's selector, or a media query and its rule's selector.
 */
function declarationsOf(css) {
  const out = [];
  const take = (context, container) =>
    container.each((node) => {
      if (node.type === 'decl') out.push({ context, prop: node.prop, value: normalize(node.value) });
    });
  postcss.parse(css).each((node) => {
    if (node.type === 'atrule' && node.name === 'plugin' && node.params === '"daisyui/theme"') {
      let name = '';
      node.each((d) => {
        if (d.type === 'decl' && d.prop === 'name') name = d.value;
      });
      take(`daisyui/theme ${name}`, node);
    } else if (node.type === 'atrule' && node.name === 'theme') {
      take('@theme', node);
    } else if (node.type === 'rule') {
      take(node.selector.replace(/,\s+/g, ','), node);
    } else if (node.type === 'atrule' && node.name === 'media') {
      node.each((rule) => {
        if (rule.type === 'rule') take(`@media ${node.params} ${rule.selector.replace(/,\s+/g, ',')}`, rule);
      });
    }
  });
  return out;
}

const keyOf = ({ context, prop, value }) => `${context} | ${prop} | ${value}`;

test('the before snapshot is the theme.css of the commit it names, when that commit is reachable', async (t) => {
  const shown = spawnSync('git', ['show', `${BEFORE_COMMIT}:${BEFORE_PATH}`], { cwd: ROOT, encoding: 'utf8' });
  if (shown.status !== 0) {
    t.skip(`commit ${BEFORE_COMMIT} is not in this clone`);
    return;
  }
  assert.equal(await readFile(BEFORE, 'utf8'), shown.stdout);
});

test("Waymark's built tokens.css declares exactly the old blocks, the moved rules, and the two new roles", async () => {
  const before = await readFile(BEFORE, 'utf8');
  const lines = before.split('\n');
  assert.equal(lines[103], '@plugin "daisyui/theme" {', 'line 104 opens the light block');
  assert.equal(lines[272], '}', 'line 273 closes the @theme block');
  const blocks = declarationsOf(lines.slice(103, 273).join('\n'));

  // Every declaration of the hand-written token rules is in the moved list, and only those.
  const handWritten = declarationsOf(lines.slice(273).join('\n')).filter((d) => d.context in MOVED);
  assert.deepEqual(
    handWritten.map((d) => `${d.context} | ${d.prop}`).sort(),
    Object.entries(MOVED)
      .flatMap(([context, props]) => props.map((p) => `${context} | ${p}`))
      .sort(),
  );

  // The new roles at the chassis defaults, under the root selector.
  const roles = [];
  postcss.parse(await readFile(path.join(ROOT, 'examples/showcase/src/chassis/tokens.css'), 'utf8')).walkDecls((d) => {
    if (NEW_ROLES.includes(d.prop)) roles.push({ context: ROOT_SELECTOR, prop: d.prop, value: normalize(d.value) });
  });
  assert.equal(roles.length, NEW_ROLES.length, 'the chassis declares each new role once');

  const want = [...blocks, ...handWritten, ...roles].map(keyOf).sort();
  const built = declarationsOf(await readFile(path.join(WAYMARK, 'tokens/tokens.css'), 'utf8'));
  const got = built.map(keyOf).sort();
  assert.deepEqual(
    got.filter((k) => !want.includes(k)),
    [],
    'no declaration is added or changed',
  );
  assert.deepEqual(
    want.filter((k) => !got.includes(k)),
    [],
    'no declaration is missing',
  );
  assert.deepEqual(got, want);

  const names = built.filter((d) => d.prop === 'name' && d.context.startsWith('daisyui/theme ')).map((d) => d.value);
  assert.deepEqual(names, ['"cairn"', '"cairn-dark"']);
});

test("Waymark's theme.css imports the built tokens after the chassis and fonts, and keeps no moved declaration", async () => {
  const css = await readFile(path.join(WAYMARK, 'theme.css'), 'utf8');
  const imports = [];
  const props = new Set();
  postcss.parse(css).walk((node) => {
    if (node.type === 'atrule' && node.name === 'import') imports.push(node.params);
    if (node.type === 'decl') props.add(node.prop);
    if (node.type === 'atrule' && node.name === 'plugin' && node.params === '"daisyui/theme"') {
      assert.fail('theme.css declares a daisyUI theme block');
    }
    if (node.type === 'atrule' && node.name === 'theme') assert.fail('theme.css declares an @theme block');
  });
  assert.deepEqual(imports, ['"../chassis/tokens.css"', '"./fonts/fonts.css"', '"./tokens/tokens.css"']);
  for (const prop of [...new Set(Object.values(MOVED).flat()), ...NEW_ROLES]) {
    assert.ok(!props.has(prop), `theme.css still declares ${prop}`);
  }
});

test('the committed Waymark build is current', () => {
  const result = build(WAYMARK, '--check');
  assert.equal(result.status, 0, result.stderr);
});

test('renaming the dark colorModes entry renames the built dark block', async () => {
  const dir = await copyFixture('rename');
  const manifestFile = path.join(dir, 'cairn-theme.json');
  const manifest = await readJson(manifestFile);
  manifest.colorModes.dark = 'opts-night';
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2));
  const out = await buildTheme(dir);
  assert.match(out['tokens/tokens.css'], /name: "opts-night";/);
  assert.doesNotMatch(out['tokens/tokens.css'], /opts-dark/);
  assert.match(out['options/accent/tide.css'], /\[data-theme="opts-night"\]/);
});

// The computed-value tests compile the fixture with Tailwind and daisyUI, as a theme's sheet is
// compiled, and read what Chromium computes.
const LIGHT_BASE = 'oklch(98.4% 0 0)';
const DARK_BASE = 'oklch(24% 0 0)';
const ACCENT = {
  ember: { light: 'oklch(55% 0.16 40)', dark: 'oklch(78% 0.13 50)' },
  tide: { light: 'oklch(50% 0.12 200)', dark: 'oklch(75% 0.1 195)' },
};

/**
 * Compiles the fixture's tokens sheet, the given option and mode sheets concatenated as
 * `theme-options.css` holds them, and `site.css`.
 */
async function compile(name, sheets) {
  const dir = path.join(work, name);
  await cp(FIXTURE, dir, { recursive: true });
  const parts = [];
  for (const sheet of sheets) parts.push(await readFile(path.join(FIXTURE, sheet), 'utf8'));
  await writeFile(path.join(dir, 'theme-options.css'), parts.join('\n'));
  const entry = [
    '@import "tailwindcss";',
    '@import "./tokens/tokens.css";',
    '@import "./theme-options.css";',
    '@import "./site.css";',
    '@plugin "daisyui" { themes: false; }',
  ].join('\n');
  const from = path.join(dir, 'entry.css');
  await writeFile(from, entry);
  const result = await postcss([tailwind({ base: ROOT })]).process(entry, { from });
  return result.css;
}

/** Serves one page that mimics the page shell: the cookie picks the theme before first paint. */
async function serve(css, names) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style><script>
    var match = document.cookie.match(/(?:^|; )theme=(${names.dark}|${names.light})(?:;|$)/);
    if (match) document.documentElement.setAttribute('data-theme', match[1]);
  </script></head><body><div class="banner"><p class="banner-message">Banner</p></div></body></html>`;
  const server = createServer((_req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end(html);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

/**
 * Loads the compiled page under a system scheme and an optional theme cookie, and returns the
 * computed text of the named custom properties on the root.
 */
async function computed(browser, page, { scheme, cookie }, props) {
  const context = await browser.newContext({ colorScheme: scheme });
  try {
    if (cookie) await context.addCookies([{ name: 'theme', value: cookie, url: page.url }]);
    const tab = await context.newPage();
    await tab.goto(page.url);
    return await tab.evaluate((names) => {
      const style = getComputedStyle(document.documentElement);
      return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()]));
    }, props);
  } finally {
    await context.close();
  }
}

test('option and mode sheets read the right values in every state', async (t) => {
  const manifest = await readJson(path.join(FIXTURE, 'cairn-theme.json'));
  const names = manifest.colorModes;
  const browser = await chromium.launch();
  const pages = [];
  t.after(async () => {
    await browser.close();
    for (const p of pages) p.server.close();
  });
  const open = async (name, sheets) => {
    const css = await compile(name, sheets);
    const page = await serve(css, names);
    pages.push(page);
    return page;
  };
  const read = (page, state, ...props) => computed(browser, page, state, props);

  for (const value of ['ember', 'tide']) {
    const page = await open(`opt-${value}`, [`options/accent/${value}.css`]);
    const want = ACCENT[value];
    assert.equal((await read(page, { scheme: 'light' }, '--color-accent'))['--color-accent'], want.light, `${value} light`);
    assert.equal(
      (await read(page, { scheme: 'light', cookie: names.dark }, '--color-accent'))['--color-accent'],
      want.dark,
      `${value} dark, explicit`,
    );
    assert.equal((await read(page, { scheme: 'dark' }, '--color-accent'))['--color-accent'], want.dark, `${value} dark, system`);
    assert.equal(
      (await read(page, { scheme: 'dark', cookie: names.light }, '--color-accent'))['--color-accent'],
      want.light,
      `${value} light, explicit under a dark system`,
    );
  }

  const darkPinned = await open('mode-dark', ['modes/dark.css']);
  assert.equal((await read(darkPinned, { scheme: 'light' }, '--color-base-100'))['--color-base-100'], DARK_BASE);
  assert.equal(
    (await read(darkPinned, { scheme: 'light', cookie: names.light }, '--color-base-100'))['--color-base-100'],
    LIGHT_BASE,
  );
  assert.equal((await read(darkPinned, { scheme: 'dark' }, '--color-base-100'))['--color-base-100'], DARK_BASE);

  const lightPinned = await open('mode-light', ['modes/light.css']);
  assert.equal((await read(lightPinned, { scheme: 'dark' }, '--color-base-100'))['--color-base-100'], LIGHT_BASE);
  assert.equal(
    (await read(lightPinned, { scheme: 'dark', cookie: names.dark }, '--color-base-100'))['--color-base-100'],
    DARK_BASE,
  );
  assert.equal((await read(lightPinned, { scheme: 'light' }, '--color-base-100'))['--color-base-100'], LIGHT_BASE);

  // The mode sheet alone, with no option sheet, still carries the base accent.
  assert.equal((await read(darkPinned, { scheme: 'light' }, '--color-accent'))['--color-accent'], 'oklch(76% 0.08 235)');

  // Each option sheet composed with each mode sheet, as theme-options.css holds them.
  for (const value of ['ember', 'tide']) {
    const want = ACCENT[value];
    const dark = await open(`both-dark-${value}`, [`options/accent/${value}.css`, 'modes/dark.css']);
    assert.equal((await read(dark, { scheme: 'light' }, '--color-accent'))['--color-accent'], want.dark, `${value} + dark pin, no cookie`);
    assert.equal(
      (await read(dark, { scheme: 'light', cookie: names.light }, '--color-accent'))['--color-accent'],
      want.light,
      `${value} + dark pin, light cookie`,
    );
    const light = await open(`both-light-${value}`, [`options/accent/${value}.css`, 'modes/light.css']);
    assert.equal((await read(light, { scheme: 'dark' }, '--color-accent'))['--color-accent'], want.light, `${value} + light pin, no cookie`);
    assert.equal(
      (await read(light, { scheme: 'dark', cookie: names.dark }, '--color-accent'))['--color-accent'],
      want.dark,
      `${value} + light pin, dark cookie`,
    );
  }

  // The pin holds when the mode sheet comes first in the concatenation too.
  const reversed = await open('both-reversed', ['modes/light.css', 'options/accent/tide.css']);
  assert.equal((await read(reversed, { scheme: 'dark' }, '--color-accent'))['--color-accent'], ACCENT.tide.light);

  // The fixture's site.css banner rule reads the built tokens.
  const banner = await open('banner', []);
  const context = await browser.newContext();
  const tab = await context.newPage();
  await tab.goto(banner.url);
  assert.equal(await tab.evaluate(() => getComputedStyle(document.querySelector('.banner')).borderLeftWidth), '3px');
  await context.close();
});
