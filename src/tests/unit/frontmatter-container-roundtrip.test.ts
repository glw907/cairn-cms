import { describe, it, expect } from 'vitest';
import {
  frontmatterFromForm,
  formValues,
  serializeMarkdown,
  parseMarkdown,
} from '../../lib/content/frontmatter.js';
import type { NamedField } from '../../lib/content/types.js';

const faq: NamedField = {
  name: 'faq', type: 'array', label: 'FAQ',
  item: { type: 'object', fields: { q: { type: 'text', label: 'Q' }, a: { type: 'textarea', label: 'A' }, featured: { type: 'boolean', label: 'Featured' } } },
};
const gallery: NamedField = { name: 'gallery', type: 'array', label: 'Gallery', item: { type: 'image', label: 'Image' } };
const meta: NamedField = { name: 'meta', type: 'object', label: 'Meta', fields: { note: { type: 'text', label: 'Note' }, when: { type: 'date', label: 'When' }, tags: { type: 'multiselect', label: 'Tags', creatable: true } } };
const fields = [faq, gallery, meta];

describe('container round-trip', () => {
  it('round-trips an array of objects (side A)', () => {
    const form = new FormData();
    form.set('faq.0.q', 'First?'); form.set('faq.0.a', 'Yes.');
    form.set('faq.1.q', 'Second?'); form.set('faq.1.a', 'Also yes.');
    const fm = frontmatterFromForm(fields, form);
    expect(fm.faq).toEqual([{ q: 'First?', a: 'Yes.' }, { q: 'Second?', a: 'Also yes.' }]);
    const reloaded = parseMarkdown(serializeMarkdown(fm, 'body')).frontmatter;
    expect((formValues(fields, reloaded).faq as unknown[])).toEqual([{ q: 'First?', a: 'Yes.', featured: false }, { q: 'Second?', a: 'Also yes.', featured: false }]);
  });

  it('keeps a checked-boolean-only row, prunes an all-default row', () => {
    const form = new FormData();
    form.set('faq.0.q', '');                 // all-default row 0: q empty, no featured key
    form.set('faq.1.featured', 'on');        // row 1: featured only, checked
    expect(frontmatterFromForm(fields, form).faq).toEqual([{ featured: true }]);
  });

  it('round-trips a date leaf inside a row, and reads a disk-authored Date (side B)', () => {
    const form = new FormData();
    form.set('meta.note', 'hi'); form.set('meta.when', '2026-01-02');
    const fm = frontmatterFromForm(fields, form);
    const reloaded = parseMarkdown(serializeMarkdown(fm, 'body')).frontmatter;
    expect((formValues(fields, reloaded).meta as Record<string, unknown>).when).toBe('2026-01-02');
    // side B: a parsed YAML Date inside a nested object must coerce, not String(Date) drift.
    expect((formValues(fields, { meta: { when: new Date('2026-01-02T00:00:00Z') } }).meta as Record<string, unknown>).when).toBe('2026-01-02');
  });

  it('coerces a disk-authored lone-scalar nested multiselect to a one-element list (side B)', () => {
    expect((formValues(fields, { meta: { tags: 'lone' } }).meta as Record<string, unknown>).tags).toEqual(['lone']);
  });

  it('round-trips an array of images', () => {
    const form = new FormData();
    form.set('gallery.0.src', 'media:a'); form.set('gallery.0.alt', 'A');
    form.set('gallery.1.src', 'media:b'); form.set('gallery.1.alt', 'B');
    expect(frontmatterFromForm(fields, form).gallery).toEqual([{ src: 'media:a', alt: 'A' }, { src: 'media:b', alt: 'B' }]);
  });

  it('omits an empty object and an empty array key', () => {
    expect('meta' in frontmatterFromForm(fields, new FormData())).toBe(false);
    expect('faq' in frontmatterFromForm(fields, new FormData())).toBe(false);
  });
});
