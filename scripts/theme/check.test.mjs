// The theme check's rules, each broken one at a time on a copy of the options fixture. A defect must
// fail exactly the rule that owns it, so a theme author reads one cause per failure. The `render`
// rule builds a site and has its own tests (check-render.test.mjs); the tests here run the rest, and
// check only which builds a render run asks for.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import postcss from 'postcss';
import semver from 'semver';
import { crestInitials } from '../../themes/pennant/components/crest.ts';
import { splitHomeBanner } from '../../themes/pennant/components/home-split.ts';
import { repoRoot } from '../repo-root.mjs';
import { buildTheme } from './build-tokens.mjs';
import { RULE_IDS, catalogThemes, checkTheme } from './check.mjs';
import { renderBuilds } from './check-render.mjs';

const ROOT = repoRoot(import.meta.url);
const FIXTURE = path.join(ROOT, 'scripts/theme/fixtures/options-theme');
const PENNANT = path.join(ROOT, 'themes/pennant');
const NO_RENDER = RULE_IDS.filter((id) => id !== 'render');
const scratch = mkdtempSync(path.join(tmpdir(), 'cairn-theme-check-'));
let count = 0;
after(() => rmSync(scratch, { recursive: true, force: true }));

/** A fresh copy of the options fixture. */
function copy() {
  const dir = path.join(scratch, `theme-${count++}`);
  cpSync(FIXTURE, dir, { recursive: true });
  return dir;
}

const read = (dir, rel) => readFileSync(path.join(dir, rel), 'utf8');
const write = (dir, rel, text) => {
  mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  writeFileSync(path.join(dir, rel), text);
};
const editJson = (dir, rel, edit) => {
  const json = JSON.parse(read(dir, rel));
  edit(json);
  write(dir, rel, `${JSON.stringify(json, null, 2)}\n`);
};

/** Rebuild a theme's CSS from its tokens, so an edit to the tokens leaves no stale file. */
async function rebuild(dir) {
  for (const [rel, text] of Object.entries(await buildTheme(dir))) write(dir, rel, text);
}

/** The rule ids a check run failed, in order and without repeats. */
async function failedRules(dir) {
  const result = await checkTheme(dir, { rules: NO_RENDER });
  return [...new Set(result.failures.map((failure) => failure.rule))];
}

test('the unbroken options fixture passes every rule but render', async () => {
  const result = await checkTheme(copy(), { rules: NO_RENDER });
  assert.deepEqual(result.failures, []);
  assert.equal(result.verdict, 'pass');
});

test('waymark passes every rule but render', async () => {
  const result = await checkTheme(path.join(ROOT, 'themes/waymark'), { rules: NO_RENDER });
  assert.deepEqual(result.failures, []);
});

test('pennant passes every rule but render, and its audit measures every pair under each of its ten states', async () => {
  const result = await checkTheme(PENNANT, { rules: NO_RENDER });
  assert.deepEqual(result.failures, []);
  const notes = result.notes.map((note) => note.message).filter((message) => message.startsWith('colors='));
  assert.equal(notes.length, 10);
  for (const message of notes) assert.match(message, /, 0 unmeasured$/);
});

test("pennant's manifest names three OFL-1.1 fonts, the organization kind, and its exact description", () => {
  const manifest = JSON.parse(read(PENNANT, 'cairn-theme.json'));
  assert.deepEqual(manifest.fonts.map((font) => font.license), ['OFL-1.1', 'OFL-1.1', 'OFL-1.1']);
  assert.deepEqual(manifest.kinds, ['organization']);
  assert.equal(manifest.description, "A two-color club and team look that's easy to recolor.");
  assert.ok(manifest.description.length <= 60);
});

// A colors value sets these four on `:where(:root)`, which an unlayered `:root` rule naming them
// would outrank with no cookie, so the value would never show (#412).
test("pennant's unlayered rules in tokens.css declare none of the four option tokens", () => {
  const OPTION_TOKENS = ['--color-neutral', '--color-neutral-content', '--color-secondary', '--color-secondary-content'];
  const rules = [];
  postcss.parse(read(PENNANT, 'tokens/tokens.css')).walkRules((rule) => rules.push(rule));
  assert.ok(rules.some((rule) => rule.selector === ':root'), 'tokens.css has an unlayered :root rule');
  for (const rule of rules) {
    const declared = rule.nodes.filter((node) => node.type === 'decl').map((decl) => decl.prop);
    assert.deepEqual(declared.filter((prop) => OPTION_TOKENS.includes(prop)), [], rule.selector);
  }
});

test('a README.md at the theme root passes paths-unlisted, and one elsewhere still fails', async () => {
  const dir = copy();
  write(dir, 'README.md', '# A theme\n');
  assert.deepEqual((await checkTheme(dir, { rules: ['paths-unlisted'] })).failures, []);
  write(dir, 'tokens/README.md', '# Tokens\n');
  write(dir, 'NOTES.md', 'stray\n');
  const files = (await checkTheme(dir, { rules: ['paths-unlisted'] })).failures.map((failure) => failure.file);
  assert.deepEqual(files.sort(), ['NOTES.md', 'tokens/README.md']);
});

for (const [name, initials] of [
  ['The Turnagain Geographic Society', 'TGS'],
  ['Anchorage FC', 'AF'],
  ['4321', ''],
]) {
  test(`the crest of "${name}" reads "${initials}"`, () => {
    assert.equal(crestInitials(name), initials);
  });
}

/** The organization home body ahead of its last rule, as the viewer build renders it. */
const HOME_BEFORE = JSON.parse(read(ROOT, 'scripts/theme/fixtures/pennant-home-before.json'));
const BANNER_WRAPPER = /^<div data-cairn-island="banner"[^>]*>[\s\S]*<\/div><\/div>$/;

test('the home split lifts a live banner off the start of the body', () => {
  const html = `\n  <div data-cairn-island="banner" data-cairn-props="{}"><div class="banner" role="status"><p class="banner-message">Open</p></div></div>\n<h2>Next</h2>`;
  assert.deepEqual(splitHomeBanner(html), {
    banner: '<div data-cairn-island="banner" data-cairn-props="{}"><div class="banner" role="status"><p class="banner-message">Open</p></div></div>',
    rest: '<h2>Next</h2>',
  });
});

test('the home split lifts an expired banner, which renders its hidden fallback', () => {
  const banner = '<div data-cairn-island="banner" data-cairn-props="{}"><div hidden class="banner-expired"></div></div>';
  assert.deepEqual(splitHomeBanner(`${banner}<p>Body</p>`), { banner, rest: '<p>Body</p>' });
});

test('the home split leaves a body that opens with no banner whole', () => {
  const html = '<h2>What we do</h2><div data-cairn-island="banner" data-cairn-props="{}"><div class="banner"></div></div>';
  assert.deepEqual(splitHomeBanner(html), { banner: '', rest: html });
});

test("the home split lifts the organization set's rendered banner, live and expired", () => {
  const message = /:::banner\{message="([^"]+)"/.exec(read(ROOT, 'sets/organization/src/content/pages/home.md'))[1];
  const live = splitHomeBanner(HOME_BEFORE.live);
  assert.match(live.banner, BANNER_WRAPPER);
  assert.ok(live.banner.includes(`<p class="banner-message">${message}</p>`), 'the fixture carries the set home page banner');
  assert.ok(live.rest.startsWith('<h2 id="what-we-do">'));
  const expired = splitHomeBanner(HOME_BEFORE.expired);
  assert.match(expired.banner, BANNER_WRAPPER);
  assert.ok(expired.banner.includes('class="banner-expired"'));
  assert.equal(expired.rest, live.rest);
});

test('the directive-styled rule names the sheet that styled each class', async () => {
  const result = await checkTheme(copy(), { rules: ['directive-styled'] });
  const banner = result.notes.find((note) => note.message.startsWith('.banner '));
  assert.match(banner.message, /site\.css$/);
  assert.equal(result.notes.length, 10);
});

/** [label, rule, edit]: one defect and the one rule that must report it. */
const CASES = [
  ['a required path is dropped', 'paths-required', (dir) => rmSync(path.join(dir, 'icons.ts'))],
  ['an unlisted file is added', 'paths-unlisted', (dir) => write(dir, 'notes.txt', 'stray\n')],
  ['the description runs to 61 characters', 'manifest-schema', (dir) => editJson(dir, 'cairn-theme.json', (m) => { m.description = 'x'.repeat(61); })],
  ['the engine range is a caret range', 'manifest-schema', (dir) => editJson(dir, 'cairn-theme.json', (m) => { m.engine = '^0.99.0'; })],
  ['the engine range excludes the engine in this repository', 'engine-range', (dir) => editJson(dir, 'cairn-theme.json', (m) => { m.engine = '>=1.0.0'; })],
  ['the engine range stops below this engine', 'engine-range', (dir) => editJson(dir, 'cairn-theme.json', (m) => { m.engine = '>=0.1.0 <0.2.0'; })],
  ['the contract is 2', 'contract-version', (dir) => editJson(dir, 'cairn-theme.json', (m) => { m.contract = 2; })],
  ['tokens.json holds an invalid token', 'tokens-schema', (dir) => editJson(dir, 'tokens/tokens.json', (t) => { t.base.broken = { $type: 'color', $value: '#fff' }; })],
  [
    'a resolver context has no manifest value',
    'resolver-options',
    (dir) => editJson(dir, 'tokens/resolver.json', (r) => { r.modifiers.accent.contexts.moss = r.modifiers.accent.contexts.tide; }),
  ],
  [
    'a manifest option has no resolver modifier',
    'resolver-options',
    (dir) => {
      editJson(dir, 'cairn-theme.json', (m) => {
        m.options.push({ key: 'density', label: 'Density', values: [{ value: 'snug', label: 'Snug' }, { value: 'roomy', label: 'Roomy' }], default: 'snug' });
      });
      for (const value of ['snug', 'roomy']) write(dir, `options/density/${value}.css`, read(dir, 'options/accent/tide.css'));
    },
  ],
  [
    'a token is edited without a rebuild',
    'tokens-stale',
    (dir) => editJson(dir, 'tokens/tokens.json', (t) => { t.base['text-step-0'] = { $value: 'clamp(1rem, 0.5rem + 1vw, 1.25rem)' }; }),
  ],
  [
    'an option sheet is left behind after its value was removed (#414)',
    'tokens-stale',
    (dir) => write(dir, 'options/accent/moss.css', read(dir, 'options/accent/tide.css')),
  ],
  [
    'a required token is missing in dark',
    'tokens-required',
    async (dir) => {
      editJson(dir, 'tokens/tokens.json', (t) => {
        t.color.light['cairn-caption-tracking'] = t.base['cairn-caption-tracking'];
        delete t.base['cairn-caption-tracking'];
      });
      await rebuild(dir);
    },
  ],
  [
    '--cairn-scroll-cue is missing under one option value only',
    'tokens-required',
    async (dir) => {
      editJson(dir, 'tokens/tokens.json', (t) => {
        const cue = t.base['cairn-scroll-cue'];
        delete t.base['cairn-scroll-cue'];
        t.options.accent.ember.light['cairn-scroll-cue'] = cue;
        t.options.accent.ember.dark['cairn-scroll-cue'] = cue;
      });
      await rebuild(dir);
    },
  ],
  [
    'the banner rules are removed from site.css',
    'directive-styled',
    (dir) => write(dir, 'site.css', ':root {\n  --site-note: 1;\n}\n'),
  ],
  ['a color literal sits in theme.css', 'audit', (dir) => write(dir, 'theme.css', `${read(dir, 'theme.css')}\n.card-edge {\n  border-color: #3a7bd5;\n}\n`)],
  [
    'the audit scope measures nothing',
    'audit',
    (dir) => write(dir, 'theme.css', read(dir, 'theme.css').replace('@import "./tokens/tokens.css";\n', '')),
  ],
  ['tokens.json is not JSON', 'tokens-schema', (dir) => write(dir, 'tokens/tokens.json', '{')],
  ['resolver.json is not JSON', 'tokens-schema', (dir) => write(dir, 'tokens/resolver.json', '{')],
  [
    'two faces, each under 400 KB, total more than 400 KB',
    'fonts',
    (dir) => {
      write(dir, 'fonts/second-wght-normal.woff2', 'x'.repeat(250 * 1024));
      write(dir, 'fonts/third-wght-normal.woff2', 'x'.repeat(250 * 1024));
      editJson(dir, 'cairn-theme.json', (m) => {
        m.fonts.push(
          { name: 'Second', license: 'OFL-1.1', source: 'https://example.com/second', files: ['fonts/second-wght-normal.woff2'] },
          { name: 'Third', license: 'OFL-1.1', source: 'https://example.com/third', files: ['fonts/third-wght-normal.woff2'] },
        );
      });
    },
  ],
  ['a .ttf font is added', 'fonts', (dir) => write(dir, 'fonts/extra.ttf', 'x')],
  ['a font has no license', 'fonts', (dir) => write(dir, 'fonts/orphan-wght-normal.woff2', 'x')],
  [
    'a font pairing runs over 400 KB',
    'fonts',
    (dir) => {
      write(dir, 'fonts/big-wght-normal.woff2', 'x'.repeat(401 * 1024));
      editJson(dir, 'cairn-theme.json', (m) => {
        m.fonts.push({ name: 'Big', license: 'OFL-1.1', source: 'https://example.com/big', files: ['fonts/big-wght-normal.woff2'] });
      });
    },
  ],
  [
    'a font is imported from another host',
    'external-host',
    (dir) => write(dir, 'theme.css', `@import url(https://fonts.googleapis.com/css2?family=Inter);\n${read(dir, 'theme.css')}`),
  ],
  [
    'a component loads an image from another host',
    'external-host',
    (dir) => write(dir, 'components/Badge.svelte', '<img src="https://example.com/badge.png" alt="" />\n'),
  ],
];

for (const [label, rule, edit] of CASES) {
  test(`${label}: only ${rule} fails`, async () => {
    const dir = copy();
    await edit(dir);
    assert.deepEqual(await failedRules(dir), [rule]);
  });
}

/** Set one value's `--color-accent-content` in one mode to a value that fails on its accent. */
function breakAccentContent(dir, value, mode) {
  editJson(dir, 'tokens/tokens.json', (t) => {
    const accent = t.options.accent[value][mode]['color-accent'].$value.components;
    t.options.accent[value][mode]['color-accent-content'].$value.components = [accent[0] + 0.02, accent[1], accent[2]];
  });
}

for (const [broken, intact] of [['dark', 'light'], ['light', 'dark']]) {
  test(`an option value whose accent text fails in ${broken} mode only fails audit, naming the value and the mode`, async () => {
    const dir = copy();
    breakAccentContent(dir, 'tide', broken);
    await rebuild(dir);
    const result = await checkTheme(dir, { rules: NO_RENDER });
    assert.deepEqual([...new Set(result.failures.map((failure) => failure.rule))], ['audit']);
    assert.ok(result.failures.some((failure) => failure.message.startsWith(`accent=tide ${broken} `)));
    assert.ok(!result.failures.some((failure) => failure.message.startsWith(`accent=tide ${intact}`)));
    assert.ok(!result.failures.some((failure) => failure.message.startsWith('accent=ember')));
  });
}

test('the audit measures every option value in each mode and notes the pair counts', async () => {
  const result = await checkTheme(copy(), { rules: ['audit'] });
  assert.deepEqual(result.failures, []);
  const notes = result.notes.map((note) => note.message);
  assert.equal(notes.length, 4);
  for (const label of ['accent=ember light', 'accent=ember dark', 'accent=tide light', 'accent=tide dark']) {
    const line = notes.filter((note) => note.startsWith(`${label}:`));
    assert.equal(line.length, 1, label);
    const [, measured, unmeasured] = /: (\d+) pairs measured, (\d+) unmeasured$/.exec(line[0]);
    assert.ok(Number(measured) > 0, label);
    assert.equal(Number(unmeasured), 0, label);
  }
});

const ENGINE = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

test('an engine range that starts at the next prerelease of this engine passes engine-range', async () => {
  const dir = copy();
  editJson(dir, 'cairn-theme.json', (m) => { m.engine = `>=${semver.inc(ENGINE, 'prerelease')}`; });
  const result = await checkTheme(dir, { rules: ['engine-range'] });
  assert.deepEqual(result.failures, []);
});

test('an engine range that starts two prereleases on fails engine-range', async () => {
  const dir = copy();
  const range = `>=${semver.inc(semver.inc(ENGINE, 'prerelease'), 'prerelease')}`;
  editJson(dir, 'cairn-theme.json', (m) => { m.engine = range; });
  const result = await checkTheme(dir, { rules: ['engine-range'] });
  assert.deepEqual(result.failures.map((failure) => failure.message), [`engine "${range}" does not admit this repository's engine ${ENGINE}`]);
});

test('a full render builds every option value in light and each default in the other modes', () => {
  const manifest = JSON.parse(read(FIXTURE, 'cairn-theme.json'));
  assert.deepEqual(renderBuilds(manifest), [
    { options: { accent: 'ember' }, mode: 'light' },
    { options: { accent: 'tide' }, mode: 'light' },
    { options: { accent: 'ember' }, mode: 'dark' },
  ]);
  assert.deepEqual(renderBuilds(manifest, true), [{ options: { accent: 'ember' }, mode: 'light' }]);
});

test('--rules limits a run to the named rules and rejects an unknown id', async () => {
  const dir = copy();
  write(dir, 'notes.txt', 'stray\n');
  const some = await checkTheme(dir, { rules: ['paths-required'] });
  assert.deepEqual(some.rules, ['paths-required']);
  assert.equal(some.verdict, 'pass');
  await assert.rejects(checkTheme(dir, { rules: ['no-such-rule'] }), /unknown rule id: no-such-rule/);
});

test('--json output has the shape the schema names', async () => {
  const result = await checkTheme(copy(), { rules: ['paths-required'] });
  assert.equal(result.kind, 'theme-check');
  assert.equal(result.schemaVersion, 1);
  assert.deepEqual(Object.keys(result).sort(), ['dir', 'failures', 'kind', 'notes', 'rules', 'schemaVersion', 'theme', 'verdict']);
});

test('--catalog lists every directory under themes/, and fails a themes directory with no theme', () => {
  const themes = path.join(scratch, 'themes');
  mkdirSync(themes);
  assert.deepEqual(catalogThemes(themes).problems, ['themes/ holds no theme']);
  cpSync(FIXTURE, path.join(themes, 'one'), { recursive: true });
  cpSync(FIXTURE, path.join(themes, 'two'), { recursive: true });
  writeFileSync(path.join(themes, 'README.md'), 'not a theme\n');
  const { dirs, problems } = catalogThemes(themes);
  assert.deepEqual(problems, []);
  assert.deepEqual(dirs.map((entry) => entry.id), ['one', 'two']);
});

test('a themes directory entry with no manifest is a problem', () => {
  const themes = path.join(scratch, 'themes-bare');
  mkdirSync(path.join(themes, 'ghost'), { recursive: true });
  assert.match(catalogThemes(themes).problems[0], /ghost.*cairn-theme\.json/);
});

test('the catalog names only themes that exist', () => {
  const { dirs, problems } = catalogThemes();
  assert.deepEqual(problems, []);
  assert.ok(dirs.some((entry) => entry.id === 'waymark'));
});
