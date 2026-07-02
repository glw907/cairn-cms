import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enumerateExports } from '../../../scripts/reference-coverage.mjs';

// The four names the surface-pruning pass demotes from the /components barrel (Task 3), verbatim
// from `docs/superpowers/plans/2026-07-01-surface-pruning-pass.md` and the audit verdicts doc's
// `## ./components` section (`docs/superpowers/plans/2026-07-01-surface-pruning-audit-verdicts.md`).
const DEMOTED = ['ComponentInsertDialog', 'ComponentForm', 'IconPicker', 'LinkPicker'];

// The keep list for the /components subpath: the twelve KEEP-verdict page-level components plus
// DeleteDialog/RenameDialog (also KEEP) plus MarkdownEditor, which the audit RESHAPEs (a narrower
// prop contract, a later task) but keeps exported. Fifteen names in total, the current barrel's
// nineteen minus the four demotions above.
const KEPT = [
  'CairnAdmin',
  'CairnAdminShell',
  'LoginPage',
  'ConfirmPage',
  'CsrfField',
  'ConceptList',
  'CairnMediaLibrary',
  'CairnTidySettings',
  'HelpHome',
  'EditPage',
  'ManageEditors',
  'NavTree',
  'MarkdownEditor',
  'DeleteDialog',
  'RenameDialog',
];

const DTS = resolve(
  fileURLToPath(new URL('../../../dist/components/index.d.ts', import.meta.url)),
);

const PACKAGE_JSON = resolve(fileURLToPath(new URL('../../../package.json', import.meta.url)));

// The three spellcheck export-map keys the pass removes: MarkdownEditor resolves the worker and both
// assets itself through a module-relative `new URL(..., import.meta.url)`, so no consumer needs a
// frozen public subpath for them (the only prior importer was the showcase spike route).
const DEMOTED_EXPORT_KEYS = [
  './components/spellcheck-worker',
  './components/spellcheck-assets/spellchecker-wasm.wasm',
  './components/spellcheck-assets/dictionary-en-us.txt',
];

describe('components barrel prune', () => {
  it('resolves the packaged dist output', () => {
    expect(existsSync(DTS), 'missing dist/components/index.d.ts; run "npm run package" first').toBe(true);
  });

  it('no longer resolves the demoted names from the /components subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const stillPresent = DEMOTED.filter((name) => names.has(name));
    expect(stillPresent).toEqual([]);
  });

  it('still resolves every keep-list name from the /components subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const missing = KEPT.filter((name) => !names.has(name));
    expect(missing).toEqual([]);
  });

  it('the packaged exports map carries none of the spellcheck subpath keys', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
    const keys = Object.keys(pkg.exports);
    const stillPresent = DEMOTED_EXPORT_KEYS.filter((key) => keys.includes(key));
    expect(stillPresent).toEqual([]);
  });
});
