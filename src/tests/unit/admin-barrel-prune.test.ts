import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enumerateExports } from '../../../scripts/checks/dts-exports.mjs';

// Names the /admin barrel no longer resolves: the four the surface-pruning pass demoted, then the
// views, their composed parts, and the editor's types, which the engine keeps internally behind
// `CairnAdmin`.
const DEMOTED = [
  'ComponentInsertDialog',
  'ComponentForm',
  'IconPicker',
  'LinkPicker',
  'LoginPage',
  'ConfirmPage',
  'ConceptList',
  'CairnMediaLibrary',
  'CairnTidySettings',
  'HelpHome',
  'EditPage',
  'CairnHistory',
  'ManageEditors',
  'MarkdownEditor',
  'EditorApi',
  'TidyApi',
  'ImagePlaceholderApi',
  'FormatKind',
  'NavTree',
  'DeleteDialog',
  'RenameDialog',
  'VocabularyAdmin',
  'WelcomeView',
];

// The whole /admin subpath: the facade, the shell a custom screen renders inside, and the CSRF field.
const KEPT = ['CairnAdmin', 'CairnAdminShell', 'CsrfField'];

const DTS = resolve(
  fileURLToPath(new URL('../../../dist/admin/index.d.ts', import.meta.url)),
);

const PACKAGE_JSON = resolve(fileURLToPath(new URL('../../../package.json', import.meta.url)));

// The three spellcheck export-map keys the pass removes: MarkdownEditor resolves the worker and both
// assets itself through a module-relative `new URL(..., import.meta.url)`, so no consumer needs a
// frozen public subpath for them (the only prior importer was the showcase spike route).
const DEMOTED_EXPORT_KEYS = [
  './admin/spellcheck-worker',
  './admin/spellcheck-assets/spellchecker-wasm.wasm',
  './admin/spellcheck-assets/dictionary-en-us.txt',
];

describe('admin barrel prune', () => {
  it('resolves the packaged dist output', () => {
    expect(existsSync(DTS), 'missing dist/admin/index.d.ts; run "npm run package" first').toBe(true);
  });

  it('no longer resolves the demoted names from the /admin subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const stillPresent = DEMOTED.filter((name) => names.has(name));
    expect(stillPresent).toEqual([]);
  });

  it('holds exactly the keep list on the /admin subpath', () => {
    expect([...enumerateExports(DTS)].sort()).toEqual([...KEPT].sort());
  });

  it('the packaged exports map carries none of the spellcheck subpath keys', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
    const keys = Object.keys(pkg.exports);
    const stillPresent = DEMOTED_EXPORT_KEYS.filter((key) => keys.includes(key));
    expect(stillPresent).toEqual([]);
  });
});
