// Test support for the viewer: a copy of the options fixture theme that a site can lay in. The
// fixture holds what the tokens build needs, and the copy adds the two things a rendered page needs
// that it lacks: the islands registry the site's adapter imports (Waymark's), and one rule that
// paints the accent, since nothing in the standard content or the fixture's sheets uses
// `--color-accent` and an option that no rule reads cannot change a pixel.
import { appendFileSync, cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Copy the options fixture, with the additions above, into a fresh temporary directory.
 * @returns {{ dir: string, root: string }} the theme copy's directory, and the scratch parent to remove
 */
export function copyOptionsFixture() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const parent = mkdtempSync(path.join(tmpdir(), 'cairn-viewer-fixture-'));
  const dir = path.join(parent, 'options-theme');
  cpSync(path.join(root, 'scripts/theme/fixtures/options-theme'), dir, { recursive: true });
  cpSync(path.join(root, 'themes/waymark/directives/islands'), path.join(dir, 'directives/islands'), { recursive: true });
  appendFileSync(path.join(dir, 'site.css'), '\nbody {\n  border-top: 1rem solid var(--color-accent);\n}\n');
  return { dir, root: parent };
}
