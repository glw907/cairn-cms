import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FieldInput from '../../lib/components/FieldInput.svelte';
import type { NamedField } from '../../lib/content/types.js';

// The shared pass-through props a container caller threads down. The reference targets and the media
// library are empty here; these cases exercise the name-prefix and the nested image-name contracts,
// not the reference picker or an upload.
function shared() {
  return {
    targets: [],
    markFieldsDirty: () => {},
    mediaLibrary: {},
    conceptId: 'posts',
    id: '2026-05-hello',
    heroFieldRefs: {},
    onuploaded: () => {},
    onheroneedsalt: () => {},
  };
}

describe('FieldInput name-prefix contract', () => {
  it('uses the prefixed name on a leaf input and reads its value from the slice', async () => {
    const field: NamedField = { type: 'text', name: 'q', label: 'Q' };
    render(FieldInput, { field, name: 'faq.0.q', frontmatter: { q: 'hi' }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="faq.0.q"]');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('hi');
  });

  it('builds the image hidden inputs off the prefixed name (gallery.0.src)', async () => {
    const field: NamedField = { type: 'image', name: 'photo', label: 'Photo' };
    render(FieldInput, { field, name: 'gallery.0', frontmatter: {}, ...shared() });
    const src = document.querySelector('input[name="gallery.0.src"]');
    expect(src).not.toBeNull();
  });
});

describe('FieldInput required attribute', () => {
  it('renders required on a required textarea', async () => {
    const field: NamedField = { type: 'textarea', name: 'summary', label: 'Summary', required: true };
    render(FieldInput, { field, frontmatter: {}, ...shared() });
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[name="summary"]');
    expect(textarea?.required).toBe(true);
  });

  it('omits required on an optional textarea', async () => {
    const field: NamedField = { type: 'textarea', name: 'summary', label: 'Summary' };
    render(FieldInput, { field, frontmatter: {}, ...shared() });
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[name="summary"]');
    expect(textarea?.required).toBe(false);
  });

  it('renders required on a required date field', async () => {
    const field: NamedField = { type: 'date', name: 'date', label: 'Date', required: true };
    render(FieldInput, { field, frontmatter: {}, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="date"]');
    expect(input?.required).toBe(true);
  });

  it('omits required on an optional date field', async () => {
    const field: NamedField = { type: 'date', name: 'date', label: 'Date' };
    render(FieldInput, { field, frontmatter: {}, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="date"]');
    expect(input?.required).toBe(false);
  });

  it('renders required on a required open (free-form) multiselect', async () => {
    const field: NamedField = { type: 'multiselect', name: 'tags', label: 'Tags', required: true } as NamedField;
    render(FieldInput, { field, frontmatter: {}, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="tags"]');
    expect(input?.required).toBe(true);
  });
});

describe('FieldInput closed-multiselect orphan flag', () => {
  // A closed taxonomy picker: options sourced from the vocabulary union the orphan, creatable off.
  const field: NamedField = {
    type: 'multiselect',
    name: 'topics',
    label: 'Topics',
    options: ['a', 'legacy'],
    creatable: false,
  } as NamedField;

  it('flags an orphan option as a checked, removable, "not in your tag list" checkbox', async () => {
    render(FieldInput, {
      field,
      frontmatter: { topics: ['a', 'legacy'] },
      orphanTags: ['legacy'],
      ...shared(),
    });
    // The orphan submits under the same name, checked so an untouched save preserves it.
    const orphan = document.querySelector<HTMLInputElement>('input[type="checkbox"][value="legacy"]');
    expect(orphan).not.toBeNull();
    expect(orphan?.name).toBe('topics');
    expect(orphan?.checked).toBe(true);
    // Unchecking it is the removal: it stays a real, toggleable checkbox.
    expect(orphan?.disabled).toBe(false);
    // The flag text marks it as outside the vocabulary.
    expect(document.body.textContent).toContain('not in your tag list');
  });

  it('renders a vocabulary option as a plain checkbox with no orphan flag', async () => {
    render(FieldInput, {
      field,
      frontmatter: { topics: ['a', 'legacy'] },
      orphanTags: ['legacy'],
      ...shared(),
    });
    const vocab = document.querySelector<HTMLInputElement>('input[type="checkbox"][value="a"]');
    expect(vocab).not.toBeNull();
    expect(vocab?.checked).toBe(true);
    // The plain option's label is just its value, with no flag suffix in its own row.
    const row = vocab?.closest('label');
    expect(row?.textContent).toContain('a');
    expect(row?.textContent).not.toContain('not in your tag list');
  });
});
