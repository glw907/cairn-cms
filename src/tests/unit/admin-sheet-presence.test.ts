import { describe, it, expect, beforeAll } from 'vitest';
// The build script is plain ESM under scripts/; the unit project runs in Node.
import { buildAdminCss } from '../../../scripts/build/build-admin-css.mjs';
import { listDaisyuiClasses } from '../../../scripts/build/daisyui-classes.mjs';

// The full-compile proof (spec, "One compiler, every component"): a representative set of daisyUI
// classes cairn's own admin markup never calls, so their only route into the shipped sheet is the
// generated `@source inline(...)` in admin-css.input.css, never a scanned call site. If
// daisyui-classes.mjs drifts (an emptied list, a broken placeholder swap) or daisyUI renames a
// module, these classes silently stop compiling with no other gate to catch it.
describe('the compiled admin sheet compiles every daisyUI component', () => {
  let css: string;

  beforeAll(async () => {
    css = await buildAdminCss();
  }, 60_000);

  it('carries a representative set of classes cairn never references directly', () => {
    for (const cls of [
      'timeline',
      'rating',
      'radial-progress',
      'countdown',
      'alert-info',
      'toggle-primary',
      'toggle-sm',
      'rounded-selector',
      'rounded-field',
      'rounded-box',
    ]) {
      expect(css, `expected .${cls} in the compiled sheet`).toContain(`.${cls}`);
    }
  });

  it('carries none of the classes the excluded calendar module defines', async () => {
    const withCalendar = await listDaisyuiClasses();
    const withoutCalendar = new Set(await listDaisyuiClasses({ exclude: ['calendar'] }));
    const calendarOnly = withCalendar.filter((name) => !withoutCalendar.has(name));
    expect(calendarOnly.length).toBeGreaterThan(0);
    for (const cls of calendarOnly) {
      expect(css, `expected .${cls}, a calendar-only class, to be excluded`).not.toContain(`.${cls}`);
    }
  });
});
