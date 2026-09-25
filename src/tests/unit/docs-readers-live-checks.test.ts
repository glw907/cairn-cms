import { describe, it, expect } from 'vitest';
import { denialsWhere, fill, tornDown } from '../../../scripts/docs-readers/live-checks.js';
import type { JobReport } from '../../../scripts/docs-readers/lib/types.js';

// This file's only job is to pull scripts/docs-readers/live-checks.ts into the type-checked
// program: nothing else imports it, so npm run check never reached it before this test existed.

describe('fill', () => {
  it('replaces every {{name}} with its value, leaving an unknown name untouched', () => {
    expect(fill('Hello {{name}}, job {{job}}.', { name: 'reader' })).toBe('Hello reader, job {{job}}.');
  });
});

describe('denialsWhere', () => {
  it('names each denial a predicate matches, with its index and source', () => {
    const job = {
      denials: [
        { source: 'permission', tool: 'Read', input: '/host/secret' },
        { source: 'unavailable-tool', tool: 'Bash', input: 'ls' },
      ],
    } as unknown as JobReport;
    expect(denialsWhere(job, (d) => d.tool === 'Read')).toEqual(['denials[0] (permission: Read)']);
  });
});

describe('tornDown', () => {
  it('is true only when the run directory is gone and no container is left', () => {
    const clean = { teardown: { runDirRemoved: true, containersLeft: 0, networksLeft: 0 } };
    const dirty = { teardown: { runDirRemoved: false, containersLeft: 1, networksLeft: 0 } };
    expect(tornDown(clean as Parameters<typeof tornDown>[0])).toBe(true);
    expect(tornDown(dirty as Parameters<typeof tornDown>[0])).toBe(false);
  });
});
