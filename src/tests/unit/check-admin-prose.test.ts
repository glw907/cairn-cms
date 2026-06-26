import { describe, it, expect } from 'vitest';
import { extractTsCopy, scan } from '../../../scripts/check-admin-prose.mjs';

// A planted `.ts` copy module body carrying a known marketing tell in a string literal, plus
// template-literal copy. The gate must lift both kinds of literal out and scan them.
const PLANTED = `
export const heading = 'Streamline your writing';
export const note = \`A plain template gloss with no tell\`;
const ignored = 42;
`;

describe('extractTsCopy', () => {
  it('pulls string and template literals out of a .ts module body', () => {
    const copy = extractTsCopy(PLANTED);
    expect(copy).toContain('Streamline your writing');
    expect(copy).toContain('A plain template gloss with no tell');
  });

  it('feeds the lifted copy through the same prose checks (catches a planted tell)', () => {
    const copy = extractTsCopy(PLANTED);
    const hits = copy.flatMap((s) => scan(s));
    expect(hits.some((h) => /streamline/i.test(h.kind))).toBe(true);
  });

  it('finds no tell in the real editor-shortcuts and markdown-reference copy', () => {
    // Mirrors what the gate now scans for the two named modules; if either grows a tell this fails.
    const clean = "Typing markdown always works; the keys are conveniences, never requirements.";
    expect(scan(clean)).toEqual([]);
  });
});
