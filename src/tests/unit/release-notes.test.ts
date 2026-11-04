import { describe, it, expect } from 'vitest';
import { buildNotes, SUMMARY_MARKER } from '../../../scripts/release/notes.mjs';

const CHANGELOG = `## 0.99.0

Released 2026-11-05.

### Changed

- Something.

Consumers must: nothing.

  Consumers must: rename the \`foo\` option to \`bar\`.

Consumers must: run the new migration.

## 0.98.0

Consumers must: leave this older line out.
`;

describe('buildNotes', () => {
  it('holds the section, a summary marker, and exactly the actionable Consumers must lines', () => {
    const r = buildNotes(CHANGELOG, '0.99.0');
    if (!r.ok) throw new Error(r.error);
    expect(r.text.startsWith(SUMMARY_MARKER)).toBe(true);
    expect(r.text).toContain('### Changed');
    expect(r.text).not.toContain('older line');
    const listed = r.text.split('## Consumers must\n')[1].split('\n\n')[0].trim().split('\n');
    expect(listed).toEqual(['- rename the `foo` option to `bar`.', '- run the new migration.']);
  });

  it('reports a version with no section', () => {
    expect(buildNotes(CHANGELOG, '1.0.0')).toEqual({ ok: false, error: expect.stringContaining('1.0.0') });
  });
});
