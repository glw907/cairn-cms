import { describe, it, expect } from 'vitest';
import {
  frontmatterFromForm,
  formValues,
  serializeMarkdown,
  parseMarkdown,
} from '../../lib/content/frontmatter.js';
import type { NamedField } from '../../lib/content/types.js';

const fields: NamedField[] = [
  { name: 'author', type: 'reference', concept: 'pages', label: 'Author' },
  { name: 'related', type: 'array', item: { type: 'reference', concept: 'posts', label: '' }, label: 'Related' },
];

describe('reference round-trip, side A (form-authored)', () => {
  it('round-trips a single reference id through decode, serialize, parse, and display', () => {
    const form = new FormData();
    form.set('author', 'jane-doe');
    const fm = frontmatterFromForm(fields, form);
    const reloaded = parseMarkdown(serializeMarkdown(fm, 'body')).frontmatter;
    expect(formValues(fields, reloaded).author).toBe('jane-doe');
  });

  it('round-trips many array reference ids', () => {
    const form = new FormData();
    form.append('related', 'a-post');
    form.append('related', 'b-post');
    const fm = frontmatterFromForm(fields, form);
    const reloaded = parseMarkdown(serializeMarkdown(fm, 'body')).frontmatter;
    expect(formValues(fields, reloaded).related).toEqual(['a-post', 'b-post']);
  });

  it('omits an empty reference key', () => {
    const form = new FormData();
    form.set('author', '   ');
    const fm = frontmatterFromForm(fields, form);
    expect('author' in fm).toBe(false);
  });

  it('omits an empty array key', () => {
    const form = new FormData();
    form.append('related', '');
    const fm = frontmatterFromForm(fields, form);
    expect('related' in fm).toBe(false);
  });
});

describe('reference round-trip, side B (disk-authored, the real loss vectors)', () => {
  it('a disk-authored unquoted date-shaped scalar id survives as its id string', () => {
    const reloaded = parseMarkdown('---\nauthor: 2026-01-02\n---\nbody\n').frontmatter; // js-yaml parses to a Date
    expect(formValues(fields, reloaded).author).toBe('2026-01-02');
  });

  it('a disk-authored bare scalar in an array slot is not dropped to []', () => {
    const reloaded = parseMarkdown('---\nrelated: b-post\n---\nbody\n').frontmatter;
    expect(formValues(fields, reloaded).related).toEqual(['b-post']);
  });

  it('a disk-authored date-shaped id inside a block sequence survives', () => {
    const reloaded = parseMarkdown('---\nrelated:\n  - 2026-01-02\n  - b-post\n---\nbody\n').frontmatter;
    expect(formValues(fields, reloaded).related).toEqual(['2026-01-02', 'b-post']);
  });

  it('documents the js-yaml single-element-array guarantee', () => {
    const back = parseMarkdown(serializeMarkdown({ related: ['a-post'] }, 'b')).frontmatter;
    expect(Array.isArray(back.related)).toBe(true);
    expect(back.related).toEqual(['a-post']);
  });
});
