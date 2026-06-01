import { describe, it, expect } from 'vitest';
import { glyph } from '../../lib/render/glyph.js';

const icons = { snowflake: 'M1 1L2 2' };

describe('glyph unknown-icon guard', () => {
  it('omits the path for an unknown icon so it never serializes d="undefined"', () => {
    const out = glyph('missing', icons);
    // The svg shell stays so callers that wrap it never dereference a missing return.
    expect(out.tagName).toBe('svg');
    // No <path> child: an unknown icon contributes no path-data, so nothing can carry
    // an undefined d. The empty <path></path> from a stamped-but-undefined d is gone.
    expect(out.children).toHaveLength(0);
    expect(JSON.stringify(out)).not.toContain('undefined');
  });

  it('emits the path for a known icon', () => {
    const out = glyph('snowflake', icons);
    expect(out.children).toHaveLength(1);
    expect(out.children[0]).toMatchObject({ tagName: 'path', properties: { d: 'M1 1L2 2' } });
  });
});
