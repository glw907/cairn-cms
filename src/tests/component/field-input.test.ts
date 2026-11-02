import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FieldInput from '../../lib/admin/FieldInput.svelte';
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

describe('FieldInput length warning while typing', () => {
  async function mount(type: 'text' | 'textarea', bounds: { min?: number; max?: number }) {
    const field = { type, name: 'q', label: 'Q', ...bounds } as NamedField;
    await render(FieldInput, { field, name: 'q', frontmatter: { q: '' }, ...shared() });
    return document.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="q"]')!;
  }

  function enter(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  for (const kind of ['text', 'textarea'] as const) {
    it(`${kind}: keeps a too-long paste whole and reports the server's message`, async () => {
      const el = await mount(kind, { max: 10 });
      expect(el.hasAttribute('maxlength')).toBe(false);
      enter(el, '123456789012');
      expect(el.value).toBe('123456789012');
      expect(el.validationMessage).toBe('Q must be at most 10 characters');
    });

    it(`${kind}: checks the trimmed value, not the raw one`, async () => {
      const el = await mount(kind, { min: 3 });
      expect(el.hasAttribute('minlength')).toBe(false);
      enter(el, '  ab  ');
      expect(el.validationMessage).toBe('Q must be at least 3 characters');
      enter(el, '  abc  ');
      expect(el.validationMessage).toBe('');
    });

    it(`${kind}: clears the message when an optional field is emptied`, async () => {
      const el = await mount(kind, { min: 3 });
      enter(el, 'ab');
      expect(el.validationMessage).not.toBe('');
      enter(el, '');
      expect(el.validationMessage).toBe('');
    });
  }
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

describe('FieldInput renders length and date bounds as input attributes', () => {
  async function control(field: NamedField, selector: string, value = '') {
    await render(FieldInput, { field, name: field.name, frontmatter: { [field.name]: value }, ...shared() });
    return document.querySelector<HTMLElement>(selector)!;
  }

  it('renders no length attribute on a text input or textarea, whatever the bounds', async () => {
    const t = await control({ type: 'textarea', name: 'i', label: 'I', length: 5, min: 2, max: 9 }, 'textarea[name="i"]');
    const i = await control({ type: 'text', name: 'j', label: 'J', length: 5, min: 2, max: 9 }, 'input[name="j"]');
    for (const el of [t, i]) {
      expect(el.hasAttribute('minlength')).toBe(false);
      expect(el.hasAttribute('maxlength')).toBe(false);
    }
  });

  it('warns on an exact length while typing', async () => {
    const el = (await control({ type: 'text', name: 'b', label: 'B', length: 5 }, 'input[name="b"]')) as HTMLInputElement;
    el.value = 'abc';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.validationMessage).toBe('B must be exactly 5 characters');
  });

  it('sets min and max on a date input', async () => {
    const el = await control({ type: 'date', name: 'd', label: 'D', min: '2026-01-01', max: '2026-12-31' }, 'input[name="d"]');
    expect(el.getAttribute('min')).toBe('2026-01-01');
    expect(el.getAttribute('max')).toBe('2026-12-31');
  });

  it('carries no maxlength on a url field', async () => {
    const el = await control({ type: 'url', name: 'e', label: 'E' }, 'input[name="e"]');
    expect(el.hasAttribute('maxlength')).toBe(false);
    expect(el.hasAttribute('minlength')).toBe(false);
  });
});

describe('FieldInput bound hints', () => {
  async function hintFor(field: NamedField) {
    await render(FieldInput, { field, name: field.name, frontmatter: {}, ...shared() });
    const control = document.querySelector<HTMLElement>(`[name="${field.name}"]`)!;
    const id = control.getAttribute('aria-describedby');
    const hint = id ? document.getElementById(id) : null;
    return { control, hint };
  }

  it.each([
    [{ type: 'text', name: 'a', label: 'A', min: 3 }, 'At least 3 characters.'],
    [{ type: 'text', name: 'a', label: 'A', max: 80 }, 'At most 80 characters.'],
    [{ type: 'text', name: 'a', label: 'A', min: 3, max: 80 }, '3 to 80 characters.'],
    [{ type: 'text', name: 'a', label: 'A', length: 5 }, 'Exactly 5 characters.'],
    [{ type: 'textarea', name: 'a', label: 'A', min: 3, max: 80 }, '3 to 80 characters.'],
    [{ type: 'textarea', name: 'a', label: 'A', length: 5 }, 'Exactly 5 characters.'],
    [{ type: 'number', name: 'a', label: 'A', min: 3 }, 'At least 3.'],
    [{ type: 'number', name: 'a', label: 'A', max: 80 }, 'At most 80.'],
    [{ type: 'number', name: 'a', label: 'A', min: 3, max: 80 }, '3 to 80.'],
  ] as [NamedField, string][])('renders and links the hint for %j', async (field, text) => {
    const { control, hint } = await hintFor(field);
    expect(hint?.textContent?.trim()).toBe(text);
    expect(control.classList.contains('validator')).toBe(true);
  });

  it('shows the help, then the bound, in the one linked hint', async () => {
    const { hint, control } = await hintFor({ type: 'text', name: 'a', label: 'A', help: 'Shown in search.', max: 60 });
    expect(hint?.textContent?.trim()).toBe('Shown in search. At most 60 characters.');
    expect(control.getAttribute('aria-describedby')).toBe(hint?.id);
  });

  it('renders no hint and no link for a bound-free control', async () => {
    const { control, hint } = await hintFor({ type: 'text', name: 'a', label: 'A' });
    expect(hint).toBeNull();
    expect(control.hasAttribute('aria-describedby')).toBe(false);
    expect(document.querySelector('p[id$="-hint"]')).toBeNull();
  });
});
