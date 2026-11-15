// The kinds data the catalog and the installer share: five closed ids, each with a plain label and
// a description an editor reads. The fourth row is wording the owner approved, so it is pinned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const { kinds } = JSON.parse(readFileSync(path.join(ROOT, 'sets/kinds.json'), 'utf8'));

test('sets/kinds.json lists the five kind ids in order', () => {
  assert.deepEqual(
    kinds.map((kind) => kind.id),
    ['blog', 'portfolio', 'docs', 'landing', 'organization'],
  );
  for (const kind of kinds) assert.deepEqual(Object.keys(kind), ['id', 'label', 'description']);
});

test('each label is present and each description fits in 160 characters, except the approved fourth', () => {
  for (const kind of kinds) {
    assert.ok(kind.label.length > 0, `${kind.id} label`);
    assert.ok(kind.description.endsWith('.'), `${kind.id} description is a sentence`);
    assert.ok(!/[—–]/.test(kind.description), `${kind.id} description has no dash`);
    if (kind.id !== 'landing') assert.ok(kind.description.length <= 160, `${kind.id} description length`);
  }
});

test('the landing row is the owner-approved wording', () => {
  assert.deepEqual(kinds[3], {
    id: 'landing',
    label: 'Product or event page',
    description:
      'One long home page in sections (what it is, what it offers, pricing, questions) that leads to one action. For a product, a project, or an event.',
  });
});
