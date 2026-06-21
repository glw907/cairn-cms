import { describe, it, expect } from 'vitest';
import { frontmatterSpan } from '../../lib/components/markdown-directives.js';

// The span bound under test: from = start of the opening `---` line (offset 0 when frontmatter
// is at the very top), to = end of the closing `---` line (its last character, no trailing
// newline). So text.slice(from, to) is the whole frontmatter block, both fences included. The
// spellcheck skip (Task 4) and the tidy byte-for-byte validator (Task 13) both read this bound.

describe('frontmatterSpan', () => {
  it('returns the whole block, both fences included, for leading frontmatter', () => {
    const text = '---\ntitle: Hello\nslug: hello\n---\n\nBody prose here.\n';
    const span = frontmatterSpan(text);
    expect(span).not.toBeNull();
    // from is the document start; to lands on the newline after the closing fence, so the slice
    // is exactly the two fence lines and the keys between them.
    expect(span).toEqual({ from: 0, to: text.indexOf('---\n\n') + 3 });
    expect(text.slice(span!.from, span!.to)).toBe('---\ntitle: Hello\nslug: hello\n---');
  });

  it('covers a single-line (empty) frontmatter block', () => {
    const text = '---\n---\nBody.\n';
    const span = frontmatterSpan(text);
    expect(span).toEqual({ from: 0, to: 7 });
    expect(text.slice(span!.from, span!.to)).toBe('---\n---');
  });

  it('returns null for text with no frontmatter', () => {
    expect(frontmatterSpan('# Just a heading\n\nSome prose.\n')).toBeNull();
  });

  it('returns null for an empty document', () => {
    expect(frontmatterSpan('')).toBeNull();
  });

  it('does not treat a body --- thematic break as frontmatter', () => {
    const text = 'Some intro prose.\n\n---\n\nMore prose after the break.\n';
    expect(frontmatterSpan(text)).toBeNull();
  });

  it('returns null when --- is not the very first line (leading blank lines)', () => {
    const text = '\n---\ntitle: Hello\n---\n\nBody.\n';
    expect(frontmatterSpan(text)).toBeNull();
  });

  it('returns null when the first line has leading whitespace before ---', () => {
    const text = '  ---\ntitle: Hello\n---\n\nBody.\n';
    expect(frontmatterSpan(text)).toBeNull();
  });

  it('returns null for an unterminated leading fence (no closing ---)', () => {
    const text = '---\ntitle: Hello\nslug: hello\n\nBody with no closing fence.\n';
    expect(frontmatterSpan(text)).toBeNull();
  });

  it('handles a closing fence on the last line with no trailing newline', () => {
    const text = '---\ntitle: Hello\n---';
    const span = frontmatterSpan(text);
    expect(span).toEqual({ from: 0, to: text.length });
    expect(text.slice(span!.from, span!.to)).toBe(text);
  });
});
