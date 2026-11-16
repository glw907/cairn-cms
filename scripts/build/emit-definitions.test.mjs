// The definitions generator and its drift check, run on copies of definitions/ and schema/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { repoRoot } from '../repo-root.mjs';
import { writeSchemas, TARGETS } from './emit-definitions.mjs';
import { checkDefinitions } from '../checks/check-definitions.mjs';

const REPO = repoRoot(import.meta.url);

/** A scratch root holding copies of `definitions/` and `schema/`. */
function scratchRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'cairn-definitions-'));
  cpSync(path.join(REPO, 'definitions'), path.join(root, 'definitions'), { recursive: true });
  cpSync(path.join(REPO, 'schema'), path.join(root, 'schema'), { recursive: true });
  return root;
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const editJson = (file, edit) => {
  const data = readJson(file);
  edit(data);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};

test('the committed schemas match definitions/', () => {
  assert.deepEqual(checkDefinitions(REPO), []);
});

test('a sixth kind reaches $defs.kindId in all three schemas', () => {
  const root = scratchRoot();
  editJson(path.join(root, 'definitions/kinds.json'), (data) => {
    data.kinds.push({ id: 'gallery', label: 'Gallery', description: 'Pictures.', defaultFeatures: [] });
  });
  writeSchemas(root);
  for (const { file } of TARGETS) {
    assert.ok(readJson(path.join(root, file)).$defs.kindId.enum.includes('gallery'), file);
  }
  assert.deepEqual(checkDefinitions(root), []);
});

test('a schema changed by hand fails the check and is named', () => {
  const root = scratchRoot();
  editJson(path.join(root, 'schema/cairn-set-1.schema.json'), (schema) => {
    schema.$defs.kindId.enum = schema.$defs.kindId.enum.filter((id) => id !== 'docs');
  });
  const problems = checkDefinitions(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^schema\/cairn-set-1\.schema\.json:/);
});

test('a default feature that features.json does not list fails, naming the kind and the id', () => {
  const root = scratchRoot();
  editJson(path.join(root, 'definitions/kinds.json'), (data) => {
    data.kinds.find((kind) => kind.id === 'blog').defaultFeatures = ['comments'];
  });
  const problems = checkDefinitions(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /"blog"/);
  assert.match(problems[0], /"comments"/);
});

test('an empty feature list is accepted as the empty set by the theme schema', async () => {
  const { default: Ajv2020 } = await import('ajv/dist/2020.js');
  const ajv = new Ajv2020({ validateFormats: false, allErrors: true });
  const featureId = readJson(path.join(REPO, 'schema/cairn-theme-1.schema.json')).$defs.featureId;
  const validate = ajv.compile({ type: 'array', items: featureId });
  assert.equal(validate([]), true);
  assert.equal(validate(['x']), false);
});

/** The Ajv keywords a manifest breaks against the theme schema in a scratch root. */
async function keywordsIn(root, edit) {
  const { default: Ajv2020 } = await import('ajv/dist/2020.js');
  const schema = readJson(path.join(root, 'schema/cairn-theme-1.schema.json'));
  const validate = new Ajv2020({ validateFormats: false, allErrors: true }).compile(schema);
  const manifest = readJson(path.join(REPO, 'scripts/theme/fixtures/options-theme/cairn-theme.json'));
  edit(manifest);
  validate(manifest);
  return (validate.errors ?? []).map((error) => error.keyword);
}

test('six distinct kinds are refused with maxItems once a sixth kind exists', async () => {
  const root = scratchRoot();
  editJson(path.join(root, 'definitions/kinds.json'), (data) => {
    data.kinds.push({ id: 'gallery', label: 'Gallery', description: 'Pictures.', defaultFeatures: [] });
  });
  writeSchemas(root);
  const six = ['blog', 'portfolio', 'docs', 'landing', 'organization', 'gallery'];
  assert.deepEqual(await keywordsIn(root, (m) => (m.kinds = six)), ['maxItems']);
});

test('a feature listed in features.json is accepted by the theme schema and another is refused with enum', async () => {
  const root = scratchRoot();
  editJson(path.join(root, 'definitions/features.json'), (data) => {
    data.features.push({ id: 'test-feature', label: 'Test', kinds: ['blog'], layer: 'features/test-feature' });
  });
  writeSchemas(root);
  assert.deepEqual(await keywordsIn(root, (m) => (m.features = ['test-feature'])), []);
  assert.deepEqual(await keywordsIn(root, (m) => (m.features = ['other'])), ['enum']);
});
