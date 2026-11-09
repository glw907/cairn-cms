// The theme check's rules, each broken one at a time on a copy of the options fixture. A defect must
// fail exactly the rule that owns it, so a theme author reads one cause per failure. The `render`
// rule builds a site and has its own tests (check-render.test.mjs); every test here runs the rest.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { repoRoot } from '../repo-root.mjs';
import { buildTheme } from './build-tokens.mjs';
import { RULE_IDS, catalogThemes, checkTheme } from './check.mjs';

const ROOT = repoRoot(import.meta.url);
const FIXTURE = path.join(ROOT, 'scripts/theme/fixtures/options-theme');
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

test('the directive-styled rule names the sheet that styled each class', async () => {
  const result = await checkTheme(copy(), { rules: ['directive-styled'] });
  const banner = result.notes.find((note) => note.message.startsWith('.banner '));
  assert.match(banner.message, /site\.css$/);
  assert.equal(result.notes.length, 9);
});

/** [label, rule, edit]: one defect and the one rule that must report it. */
const CASES = [
  ['a required path is dropped', 'paths-required', (dir) => rmSync(path.join(dir, 'icons.ts'))],
  ['an unlisted file is added', 'paths-unlisted', (dir) => write(dir, 'notes.txt', 'stray\n')],
  ['the description runs to 61 characters', 'manifest-schema', (dir) => editJson(dir, 'cairn-theme.json', (m) => { m.description = 'x'.repeat(61); })],
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

test('--catalog fails an empty catalog and a catalog entry whose directory is missing', () => {
  const empty = path.join(scratch, 'empty-catalog.json');
  writeFileSync(empty, JSON.stringify({ themes: [] }));
  assert.deepEqual(catalogThemes(empty).problems, ['templates/catalog.json names no theme']);
  const missing = path.join(scratch, 'missing-catalog.json');
  writeFileSync(missing, JSON.stringify({ themes: [{ id: 'ghost', name: 'Ghost', description: 'x', path: 'ghost', source: 'engine' }] }));
  assert.match(catalogThemes(missing).problems[0], /ghost.*missing/);
});

test('the catalog names only themes that exist', () => {
  const { dirs, problems } = catalogThemes();
  assert.deepEqual(problems, []);
  assert.ok(dirs.some((entry) => entry.id === 'waymark'));
});
