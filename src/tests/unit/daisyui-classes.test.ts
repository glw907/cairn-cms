import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// The build script is plain ESM under scripts/; the unit project runs in Node.
import { listDaisyuiClasses } from '../../../scripts/build/daisyui-classes.mjs';

describe('listDaisyuiClasses', () => {
  it('reaches classes that no shipped cairn component references, against the installed daisyUI', async () => {
    const classes = await listDaisyuiClasses();
    for (const name of ['timeline', 'rating', 'rounded-selector']) {
      expect(classes, `expected ${name} in the full class list`).toContain(name);
    }
  });

  it('finds the calendar classes as exactly the difference between excluding and not excluding it', async () => {
    const withCalendar = await listDaisyuiClasses();
    const withoutCalendar = await listDaisyuiClasses({ exclude: ['calendar'] });
    const withoutSet = new Set(withoutCalendar);
    const calendarOnly = withCalendar.filter((name) => !withoutSet.has(name));
    expect(calendarOnly.length).toBeGreaterThan(0);

    // Read as text, not a static import: TS has no declaration for daisyUI's own object.js modules,
    // and the generator itself only ever needs the text a class token regex can search, never the
    // live object.
    const calendarSource = readFileSync(
      new URL('../../../node_modules/daisyui/components/calendar/object.js', import.meta.url),
      'utf8',
    );
    for (const name of calendarOnly) {
      expect(calendarSource, `expected calendar's object.js to define .${name}`).toContain(`.${name}`);
    }
  });

  it('throws naming the root when pointed at a fixture with no daisyUI modules', async () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), 'daisyui-classes-empty-'));
    mkdirSync(join(emptyRoot, 'components'));
    mkdirSync(join(emptyRoot, 'utilities'));
    try {
      await expect(listDaisyuiClasses({ root: emptyRoot })).rejects.toThrow(emptyRoot);
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true });
    }
  });
});
