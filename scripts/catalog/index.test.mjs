// The catalog file's contract: its schema refuses the shapes a reader cannot show, and the index
// generator turns the previous index plus new release records into the next one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { repoRoot } from '../repo-root.mjs';
import { buildIndex } from './index.mjs';

const ROOT = repoRoot(import.meta.url);
const read = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const schema = read('schema/cairn-catalog-1.schema.json');
const { kinds: KINDS } = read('definitions/kinds.json');
const example = read('scripts/catalog/fixtures/index/design-example.json');

const validate = new Ajv2020({ allErrors: true }).compile(schema);
const clone = (value) => structuredClone(value);
const errorsOf = (doc) => (validate(doc) ? [] : validate.errors.map((e) => `${e.instancePath} ${e.message}`));

test('the schema has the published id and draft', () => {
  assert.equal(schema.$id, 'https://cairn.pub/schemas/cairn-catalog/1.json');
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
});

test("the design's example file validates", () => {
  assert.deepEqual(errorsOf(example), []);
});

test('an index with no kinds and no sets validates, as the first catalog does', () => {
  const doc = clone(example);
  doc.kinds = [];
  doc.sets = [];
  assert.deepEqual(errorsOf(doc), []);
});

/** Each case edits the example into a shape the schema must refuse. */
const refused = {
  'a theme with no demo': (d) => delete d.themes[0].demo,
  'a theme with no card': (d) => delete d.themes[0].card,
  'a release with no screenshot': (d) => (d.themes[0].releases[0].screenshots = []),
  'a release with no screenshots field': (d) => delete d.themes[0].releases[0].screenshots,
  'a release with no notes': (d) => delete d.themes[0].releases[0].notes,
  'a set release with no notes': (d) => delete d.sets[0].releases[0].notes,
  'a relative archive URL': (d) => (d.themes[0].releases[0].url = '/themes/survey/1.0.0.tgz'),
  'a relative demo URL': (d) => (d.themes[0].demo = 'demo-survey.cairn.pub/'),
  'a relative screenshot URL': (d) => (d.themes[0].releases[0].screenshots[0].url = 'light.png'),
  'a relative card URL': (d) => (d.themes[0].card.url = './card.webp'),
  'a screenshot with no width': (d) => delete d.themes[0].releases[0].screenshots[0].width,
  'a screenshot with no height': (d) => delete d.themes[0].releases[0].screenshots[0].height,
  'a card with no width': (d) => delete d.themes[0].card.width,
  'a release with no integrity': (d) => delete d.themes[0].releases[0].integrity,
  'an integrity that is not sha512': (d) => (d.themes[0].releases[0].integrity = 'sha256-abc'),
  'a theme with no releases': (d) => (d.themes[0].releases = []),
  'an engine range of an unlisted form': (d) => (d.themes[0].releases[0].engine = '^1.0.0'),
  'a theme with four kinds': (d) => (d.themes[0].kinds = ['blog', 'portfolio', 'docs', 'landing']),
  'a theme with an unknown kind': (d) => (d.themes[0].kinds = ['shop']),
  'a format that is not an integer': (d) => (d.format = '1'),
  'a missing format': (d) => delete d.format,
  'a set with no kind': (d) => delete d.sets[0].kind,
};
for (const [name, edit] of Object.entries(refused)) {
  test(`the schema refuses ${name}`, () => {
    const doc = clone(example);
    edit(doc);
    assert.notDeepEqual(errorsOf(doc), []);
  });
}

test('the schema ignores fields it does not know, so a later field never breaks an old reader', () => {
  const doc = clone(example);
  doc.extra = 1;
  doc.themes[0].extra = 1;
  doc.themes[0].releases[0].extra = 1;
  assert.deepEqual(errorsOf(doc), []);
});

// ---- the generator ----

const digest = (ch) => `sha512-${ch.repeat(86)}==`;
const base = 'https://catalog.cairn.pub';

/** A theme manifest at a version, with only the fields the index reads. */
function manifest(version, over = {}) {
  return {
    id: 'survey',
    name: 'Survey',
    description: 'One line an owner sees at setup.',
    summary: 'A few sentences for a catalog page.',
    version,
    notes: `Notes for ${version}.`,
    engine: '>=0.99.0-0',
    kinds: ['blog'],
    repository: 'https://github.com/glw907/cairn-cms',
    license: 'MIT',
    author: { name: 'glw907', url: 'https://github.com/glw907' },
    contract: 1,
    colorModes: { light: 'survey-light', dark: 'survey-dark' },
    options: [],
    ...over,
  };
}

/** The hosting facts the publish job adds to a theme release. */
function themeRecord(version, over = {}) {
  return {
    theme: manifest(version),
    date: '2026-12-01',
    url: `${base}/themes/survey/${version}.tgz`,
    integrity: digest('C'),
    size: 1000,
    demo: 'https://demo-survey.cairn.pub/',
    card: { url: `${base}/themes/survey/${version}/card.webp`, width: 720, height: 480 },
    screenshots: [{ url: `${base}/themes/survey/${version}/light.png`, shows: 'Home page, light', width: 1440, height: 960 }],
    ...over,
  };
}

function setRecord(kind, version, over = {}) {
  return {
    set: { kind, version, engine: '>=0.99.0-0', notes: `Set notes ${version}.`, license: 'MIT', images: [] },
    date: '2026-12-01',
    url: `${base}/sets/${kind}/${version}.tgz`,
    integrity: digest('D'),
    size: 2000,
    ...over,
  };
}

const NOW = '2026-12-01T10:00:00Z';
const previous = () => {
  const doc = clone(example);
  doc.kinds = [];
  doc.sets = [];
  return doc;
};
const build = (args) => buildIndex({ kinds: KINDS, now: NOW, previous: null, releases: [], ...args });

test('the generator makes a valid first index from no previous index and no releases', () => {
  const next = build({});
  assert.deepEqual(errorsOf(next), []);
  assert.deepEqual(next.themes, []);
  assert.deepEqual(next.sets, []);
  assert.deepEqual(next.kinds, []);
  assert.equal(next.generated, NOW);
  assert.equal(next.format, 1);
});

test('a first theme release builds a valid index', () => {
  const next = build({ releases: [themeRecord('1.0.0')] });
  assert.deepEqual(errorsOf(next), []);
  const [theme] = next.themes;
  assert.equal(theme.id, 'survey');
  assert.equal(theme.demo, 'https://demo-survey.cairn.pub/');
  assert.equal(theme.card.width, 720);
  assert.deepEqual(theme.releases.map((r) => r.version), ['1.0.0']);
  assert.deepEqual(theme.releases[0].colorModes, { light: 'survey-light', dark: 'survey-dark' });
  assert.equal(theme.releases[0].contract, 1);
});

test('adding 1.1.0 to an index holding 1.0.0 puts it first and moves the top-level fields', () => {
  const next = build({
    previous: previous(),
    releases: [
      themeRecord('1.1.0', {
        theme: manifest('1.1.0', { name: 'Survey Two', description: 'A newer line.', kinds: ['blog', 'docs'] }),
        card: { url: `${base}/themes/survey/1.1.0/card.webp`, width: 720, height: 480 },
      }),
    ],
  });
  assert.deepEqual(errorsOf(next), []);
  const [theme] = next.themes;
  assert.deepEqual(theme.releases.map((r) => r.version), ['1.1.0', '1.0.0']);
  assert.equal(theme.name, 'Survey Two');
  assert.equal(theme.description, 'A newer line.');
  assert.deepEqual(theme.kinds, ['blog', 'docs']);
  assert.equal(theme.card.url, `${base}/themes/survey/1.1.0/card.webp`);
  assert.equal(theme.releases[1].integrity, example.themes[0].releases[0].integrity);
});

test('releases sort by SemVer precedence, not by string order or arrival order', () => {
  const next = build({ releases: [themeRecord('1.2.0'), themeRecord('1.10.0'), themeRecord('1.9.0'), themeRecord('1.10.0-rc.1')] });
  assert.deepEqual(next.themes[0].releases.map((r) => r.version), ['1.10.0', '1.10.0-rc.1', '1.9.0', '1.2.0']);
});

test('an older release added later does not move the top-level fields', () => {
  const next = build({
    previous: previous(),
    releases: [themeRecord('0.9.0', { theme: manifest('0.9.0', { name: 'Old Name' }) })],
  });
  assert.equal(next.themes[0].name, 'Survey');
  assert.deepEqual(next.themes[0].releases.map((r) => r.version), ['1.0.0', '0.9.0']);
});

test('a release already in the index is refused, since a release path is written once', () => {
  assert.throws(() => build({ previous: previous(), releases: [themeRecord('1.0.0')] }), /1\.0\.0/);
});

test('a set release for blog makes the blog kind appear and no other', () => {
  const next = build({ releases: [themeRecord('1.0.0'), setRecord('blog', '1.0.0')] });
  assert.deepEqual(errorsOf(next), []);
  assert.deepEqual(next.kinds, [KINDS[0]]);
  assert.deepEqual(next.sets.map((s) => s.kind), ['blog']);
  assert.equal(next.sets[0].releases[0].url, `${base}/sets/blog/1.0.0.tgz`);
  assert.equal(next.sets[0].releases[0].notes, 'Set notes 1.0.0.');
  assert.equal('contract' in next.sets[0].releases[0], false);
});

test('kinds follow the kinds data order, and only kinds with a set release appear', () => {
  const next = build({ releases: [setRecord('docs', '1.0.0'), setRecord('blog', '1.0.0'), setRecord('docs', '1.1.0')] });
  assert.deepEqual(next.kinds.map((k) => k.id), ['blog', 'docs']);
  assert.deepEqual(next.sets.find((s) => s.kind === 'docs').releases.map((r) => r.version), ['1.1.0', '1.0.0']);
});

test('a set release for a kind the kinds data lacks is refused', () => {
  assert.throws(() => build({ releases: [setRecord('shop', '1.0.0')] }), /shop/);
});

test('a previous set keeps its kind listed with no new set release', () => {
  const first = build({ releases: [setRecord('blog', '1.0.0')] });
  const next = build({ previous: first, releases: [themeRecord('1.0.0')] });
  assert.deepEqual(next.kinds.map((k) => k.id), ['blog']);
});

test('unknown fields in the previous index survive, at every level', () => {
  const prev = previous();
  prev.futureTop = { keep: true };
  prev.themes[0].futureTheme = 'keep';
  prev.themes[0].releases[0].futureRelease = 7;
  const next = build({ previous: prev, releases: [themeRecord('1.1.0')] });
  assert.deepEqual(next.futureTop, { keep: true });
  assert.equal(next.themes[0].futureTheme, 'keep');
  assert.equal(next.themes[0].releases.find((r) => r.version === '1.0.0').futureRelease, 7);
});

test('the generator does not change its inputs', () => {
  const prev = previous();
  const before = clone(prev);
  const records = [themeRecord('1.1.0')];
  const recordsBefore = clone(records);
  build({ previous: prev, releases: records });
  assert.deepEqual(prev, before);
  assert.deepEqual(records, recordsBefore);
});

test('the generator copies fonts from the release manifest', () => {
  const fonts = [{ name: 'Figtree', license: 'OFL-1.1', source: 'https://fontsource.org/fonts/figtree', files: ['fonts/a.woff2'] }];
  const next = build({ releases: [themeRecord('1.0.0', { theme: manifest('1.0.0', { fonts }) })] });
  assert.deepEqual(next.themes[0].releases[0].fonts, fonts);
});

test('a theme release without a demo, card, or screenshot is refused before an index is written', () => {
  for (const key of ['demo', 'card', 'screenshots']) {
    const record = themeRecord('1.0.0');
    delete record[key];
    assert.throws(() => build({ releases: [record] }), new RegExp(key));
  }
});
