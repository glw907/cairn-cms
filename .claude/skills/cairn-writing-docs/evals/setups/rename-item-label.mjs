// Setup for `rename-item-label`: rename `ArrayField.itemLabel` to `itemTitle` in the engine and its
// callers. The admin toolkit's `itemLabel` (ListToolbar, Pagination, list-toolbar.ts) and
// `SlotDef.itemLabel` are different options and stay.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FILES = [
  'src/lib/content/fields.ts',
  'src/lib/admin/RepeatableField.svelte',
  'examples/showcase/src/theme/cairn.config.ts',
  'templates/waymark/src/theme/cairn.config.ts',
  'src/tests/component/edit-page-v2-fields.test.ts',
  'src/tests/component/repeatable-field.test.ts',
  'src/tests/component/form-renderer-family-guard.test.ts',
];

/** @param {string} root */
export default function setup(root) {
  for (const f of FILES) {
    const text = readFileSync(join(root, f), 'utf8');
    if (!text.includes('itemLabel')) throw new Error(`${f} holds no itemLabel`);
    writeFileSync(join(root, f), text.replaceAll('itemLabel', 'itemTitle'));
  }
  const fields = readFileSync(join(root, 'src/lib/content/fields.ts'), 'utf8');
  if (!/itemTitle\?: string;/.test(fields)) throw new Error('the rename did not apply to ArrayField');
}
