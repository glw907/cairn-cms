// Regenerates the committed class-inventory fixture src/tests/unit/fixtures/admin-sheet-inventory.txt
// that src/tests/unit/admin-sheet-inventory.test.ts diffs the shipped admin sheet against. The
// shipped sheet's class inventory is a de facto public API (issue #12): a consumer's admin markup
// rides the compiled dist/components/cairn-admin.css, and Tailwind tree-shakes an @utility or DaisyUI
// component rule out of that sheet the moment cairn's own tree stops using it, with no build error to
// mark the loss. Regenerating this fixture is therefore a deliberate disclosure moment, not a routine
// step: record the intended addition or removal in CHANGELOG.md first, then run this script and
// review the diff it produces before committing the fixture.
//
// Wired as `npm run update-admin-sheet-inventory` (which packages first, so `parseSheet` resolves
// from the compiled `dist/audit`; a plain node script cannot import a `.ts` module directly the way
// the vitest-run test file does). Deliberately its own script rather than a vitest `-u` flag: a
// snapshot test's `-u` regenerates silently as a side effect of running the suite, which is exactly
// the silent-drift failure mode this gate exists to close.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildAdminCss } from './build-admin-css.mjs';
import { parseSheet } from '../../dist/audit/index.js';

const FIXTURE_PATH = fileURLToPath(
  new URL('../../src/tests/unit/fixtures/admin-sheet-inventory.txt', import.meta.url),
);

const sheet = parseSheet(await buildAdminCss());
const names = new Set(sheet.rules.flatMap((rule) => rule.classNames));
const sorted = [...names].sort((a, b) => a.localeCompare(b));

writeFileSync(FIXTURE_PATH, `${sorted.join('\n')}\n`);
console.log(`update-admin-sheet-inventory: wrote ${sorted.length} classes to ${FIXTURE_PATH}`);
