import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FieldInput from '../../lib/components/FieldInput.svelte';
import FieldInputHeroRefHarness from './_FieldInputHeroRefHarness.svelte';
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
    registerHeroField: () => {},
    onuploaded: () => {},
    onheroneedsalt: () => {},
  };
}

describe('FieldInput name-prefix contract', () => {
  it('uses the prefixed name on a leaf input and reads its value from the slice', async () => {
    const field: NamedField = { type: 'text', name: 'q', label: 'Q' };
    await render(FieldInput, { field, name: 'faq.0.q', frontmatter: { q: 'hi' }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="faq.0.q"]');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('hi');
  });

  it('builds the image hidden inputs off the prefixed name (gallery.0.src)', async () => {
    const field: NamedField = { type: 'image', name: 'photo', label: 'Photo' };
    await render(FieldInput, { field, name: 'gallery.0', frontmatter: {}, ...shared() });
    const src = document.querySelector('input[name="gallery.0.src"]');
    expect(src).not.toBeNull();
  });
});

describe('FieldInput image arm hero-ref registration', () => {
  // The parent (DetailsPanel, once extracted) owns the hero-ref map; the image arm's own
  // bind:this must stay LOCAL to this component and register itself out through a callback,
  // never mutate a Record prop drilled in from two components up. Svelte's dev-mode
  // ownership_invalid_mutation warning is the observable symptom of getting that wrong; the
  // harness mounts the image arm through the same registerHeroField callback contract
  // DetailsPanel uses and asserts the mount logs no such warning. A plain object literal
  // (this file's own `shared()`) never trips the ownership check, which is why this case
  // needs the harness rather than a direct render() call.
  it('logs no ownership_invalid_mutation warning when an image field mounts', async () => {
    const warnings: string[] = [];
    const spy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      warnings.push(args.join(' '));
    });
    await render(FieldInputHeroRefHarness);
    spy.mockRestore();
    expect(warnings.some((w) => w.includes('ownership_invalid_mutation'))).toBe(false);
  });
});

describe('FieldInput hint id uniqueness across a shared local name', () => {
  it('keys the hint id off the prefixed name, not the leaf field name, so two rows never collide', async () => {
    const field: NamedField = { type: 'text', name: '_value', label: 'Value', help: 'A hint.' };
    const rowOne = await render(FieldInput, { field, name: 'gallery.0', frontmatter: { _value: 'a' }, ...shared() });
    const rowTwo = await render(FieldInput, { field, name: 'gallery.1', frontmatter: { _value: 'b' }, ...shared() });

    const inputOne = document.querySelector<HTMLInputElement>('input[name="gallery.0"]')!;
    const inputTwo = document.querySelector<HTMLInputElement>('input[name="gallery.1"]')!;
    const describedByOne = inputOne.getAttribute('aria-describedby')!;
    const describedByTwo = inputTwo.getAttribute('aria-describedby')!;

    expect(describedByOne).not.toBe(describedByTwo);
    expect(document.getElementById(describedByOne)?.textContent?.trim()).toBe('A hint.');
    expect(document.getElementById(describedByTwo)?.textContent?.trim()).toBe('A hint.');

    await rowOne.unmount();
    await rowTwo.unmount();
  });
});

describe('FieldInput required attribute', () => {
  it('renders required on a required textarea', async () => {
    const field: NamedField = { type: 'textarea', name: 'summary', label: 'Summary', required: true };
    await render(FieldInput, { field, frontmatter: {}, ...shared() });
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[name="summary"]');
    expect(textarea?.required).toBe(true);
  });

  it('omits required on an optional textarea', async () => {
    const field: NamedField = { type: 'textarea', name: 'summary', label: 'Summary' };
    await render(FieldInput, { field, frontmatter: {}, ...shared() });
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[name="summary"]');
    expect(textarea?.required).toBe(false);
  });

  it('renders required on a required date field', async () => {
    const field: NamedField = { type: 'date', name: 'date', label: 'Date', required: true };
    await render(FieldInput, { field, frontmatter: {}, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="date"]');
    expect(input?.required).toBe(true);
  });

  it('omits required on an optional date field', async () => {
    const field: NamedField = { type: 'date', name: 'date', label: 'Date' };
    await render(FieldInput, { field, frontmatter: {}, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="date"]');
    expect(input?.required).toBe(false);
  });

  it('renders required on a required open (free-form) multiselect', async () => {
    const field: NamedField = { type: 'multiselect', name: 'tags', label: 'Tags', required: true } as NamedField;
    await render(FieldInput, { field, frontmatter: {}, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="tags"]');
    expect(input?.required).toBe(true);
  });
});

describe('FieldInput closed-multiselect required signal', () => {
  // A closed taxonomy picker offers no honest native `required`: checking every box would lie.
  // The arm sets a custom validity message by hand instead, so the browser's own invalid report
  // still fires, the same as every other required arm.
  const field: NamedField = {
    type: 'multiselect',
    name: 'tags',
    label: 'Tags',
    options: ['a', 'b'],
    creatable: false,
    required: true,
  } as NamedField;

  it('is invalid with a custom message when the required group has no box checked', async () => {
    await render(FieldInput, { field, frontmatter: {}, ...shared() });
    const boxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="tags"]');
    expect(boxes.length).toBe(2);
    let invalidFired = false;
    boxes[0].addEventListener('invalid', () => {
      invalidFired = true;
    });
    expect(boxes[0].checkValidity()).toBe(false);
    expect(boxes[0].validationMessage).not.toBe('');
    expect(invalidFired).toBe(true);
  });

  it('clears the custom validity the instant a box is checked, and re-sets it when unchecked', async () => {
    await render(FieldInput, { field, frontmatter: {}, ...shared() });
    const boxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="tags"]');
    boxes[1].checked = true;
    boxes[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(boxes[0].validationMessage).toBe('');
    expect(boxes[0].checkValidity()).toBe(true);
    // A stale message would block submit forever; unchecking must re-arm it, not leave it clear.
    boxes[1].checked = false;
    boxes[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(boxes[0].validationMessage).not.toBe('');
    expect(boxes[0].checkValidity()).toBe(false);
  });

  it('never sets a custom validity message on an optional closed multiselect', async () => {
    const optional: NamedField = { ...field, required: false } as NamedField;
    await render(FieldInput, { field: optional, frontmatter: {}, ...shared() });
    const boxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="tags"]');
    expect(boxes[0].checkValidity()).toBe(true);
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
    await render(FieldInput, {
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
    await render(FieldInput, {
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

// Characterization of every FieldDescriptor arm this dispatcher branches on. text, textarea,
// date, and both multiselect shapes are covered above; this fills in the rest, one arm each.
describe('FieldInput arm dispatch (characterization: every FieldDescriptor arm)', () => {
  it('renders a number input for a number field', async () => {
    const field: NamedField = { type: 'number', name: 'count', label: 'Count', min: 1, max: 5 };
    await render(FieldInput, { field, frontmatter: { count: 3 }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="count"]');
    expect(input?.type).toBe('number');
    expect(input?.value).toBe('3');
  });

  it('renders a select with its options for a select field', async () => {
    const field: NamedField = { type: 'select', name: 'status', label: 'Status', options: ['draft', 'live'] };
    await render(FieldInput, { field, frontmatter: { status: 'live' }, ...shared() });
    const select = document.querySelector('select[name="status"]') as HTMLSelectElement | null;
    expect(select).not.toBeNull();
    expect(Array.from(select?.options ?? []).map((o) => o.value)).toEqual(['', 'draft', 'live']);
  });

  it('renders a url input for a url field', async () => {
    const field: NamedField = { type: 'url', name: 'site', label: 'Site' };
    await render(FieldInput, { field, frontmatter: { site: 'https://example.com' }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="site"]');
    expect(input?.type).toBe('url');
    expect(input?.value).toBe('https://example.com');
  });

  it('renders an email input for an email field', async () => {
    const field: NamedField = { type: 'email', name: 'contact', label: 'Contact' };
    await render(FieldInput, { field, frontmatter: { contact: 'a@b.c' }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="contact"]');
    expect(input?.type).toBe('email');
  });

  it('renders a datetime-local input for a datetime field', async () => {
    const field: NamedField = { type: 'datetime', name: 'when', label: 'When' };
    await render(FieldInput, { field, frontmatter: { when: '2026-06-26T14:30' }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="when"]');
    expect(input?.type).toBe('datetime-local');
  });

  it('renders a checkbox for a boolean field', async () => {
    const field: NamedField = { type: 'boolean', name: 'draft', label: 'Draft' };
    await render(FieldInput, { field, frontmatter: { draft: true }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[type="checkbox"][name="draft"]');
    expect(input?.checked).toBe(true);
  });

  it('renders the icon picker radiogroup when an icon set is supplied', async () => {
    const field: NamedField = { type: 'icon', name: 'glyph', label: 'Glyph' };
    await render(FieldInput, { field, frontmatter: { glyph: 'leaf' }, icons: { leaf: 'M1 1h2' }, ...shared() });
    expect(document.querySelector('[role="radiogroup"]')).not.toBeNull();
  });

  it('falls back to a plain text input for an icon field when no icon set is supplied', async () => {
    const field: NamedField = { type: 'icon', name: 'glyph', label: 'Glyph' };
    await render(FieldInput, { field, frontmatter: { glyph: 'leaf' }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="glyph"]');
    expect(input?.type).toBe('text');
    expect(document.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it('renders a reference chooser for a reference field', async () => {
    const field: NamedField = { type: 'reference', name: 'author', label: 'Author', concept: 'pages' };
    await render(FieldInput, { field, frontmatter: { author: '' }, ...shared() });
    expect(document.querySelector('button[aria-label="Author"]')).not.toBeNull();
    expect(document.querySelector('input[type="hidden"][name="author"]')).toBeNull();
  });

  it('renders a reference chooser for an array(reference) field', async () => {
    const field: NamedField = {
      type: 'array',
      name: 'related',
      label: 'Related',
      item: { type: 'reference', concept: 'posts', label: '' },
    };
    await render(FieldInput, { field, frontmatter: { related: [] }, ...shared() });
    expect(document.querySelector('button[aria-label="Add Related"]')).not.toBeNull();
  });

  it('renders an object group for an object field', async () => {
    const field: NamedField = {
      type: 'object',
      name: 'meta',
      label: 'Meta',
      fields: { note: { type: 'text', label: 'Note' } },
    };
    await render(FieldInput, { field, frontmatter: { meta: { note: 'x' } }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="meta.note"]');
    expect(input?.value).toBe('x');
  });

  it('renders a repeatable list for an array(non-reference) field', async () => {
    const field: NamedField = {
      type: 'array',
      name: 'aliases',
      label: 'Alias',
      item: { type: 'text', label: 'Alias' },
    };
    await render(FieldInput, { field, frontmatter: { aliases: ['x'] }, ...shared() });
    // Each row starts collapsed; expand it to reach the nested leaf input.
    document.querySelector<HTMLButtonElement>('[data-cairn-row-toggle]')?.click();
    await expect.poll(() => document.querySelector<HTMLInputElement>('input[name="aliases.0"]')?.value).toBe('x');
  });
});
