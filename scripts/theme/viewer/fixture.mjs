// Test support for the viewer: a copy of the options fixture theme in a scratch directory, for a test
// that edits the theme while a viewer runs. The fixture is a complete theme, so the copy adds nothing.
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Copy the options fixture into a fresh temporary directory.
 * @returns {{ dir: string, root: string }} the theme copy's directory, and the scratch parent to remove
 */
export function copyOptionsFixture() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const parent = mkdtempSync(path.join(tmpdir(), 'cairn-viewer-fixture-'));
  const dir = path.join(parent, 'options-theme');
  cpSync(path.join(root, 'scripts/theme/fixtures/options-theme'), dir, { recursive: true });
  return { dir, root: parent };
}
