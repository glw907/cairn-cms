import { describe, it, expect } from 'vitest';
import { segmentTintClass } from '../../lib/components/segmented-control.js';

// The active-segment ring is the WCAG 1.4.11 non-text contrast cue (a 1px inset hairline), and the
// design system's measured figures put a 20% base-content mix under the 3:1 floor and a 55% mix
// above it (docs/internal/admin-design-system.md, "Tokens (Warm Stone)"). This asserts the fragment
// carries the 55% mix and never regresses to the sub-floor one.
describe('segmentTintClass', () => {
  it('rings the active segment at the 55% base-content mix, not the sub-floor 20% mix', () => {
    const active = segmentTintClass(true);
    expect(active).toContain('ring-base-content/55');
    expect(active).not.toContain('ring-base-content/20');
  });

  it('leaves the inactive segment untinted', () => {
    expect(segmentTintClass(false)).toBe('text-muted');
  });
});
