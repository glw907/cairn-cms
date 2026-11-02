import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import RepeatableField from '../../lib/admin/RepeatableField.svelte';
import TwoRepeatableFields from './_TwoRepeatableFields.svelte';
import type { NamedField } from '../../lib/content/types.js';
import type { ArrayField } from '../../lib/content/fields.js';
import { frontmatterFromForm } from '../../lib/content/frontmatter.js';
// The compiled admin sheet, so the wrapper's computed display is the real one (the wrapper is
// classless; only the sheet decides whether `hidden` holds).
import '../../../dist/admin/cairn-admin.css';

// The shared pass-through props a container caller threads down; the media and reference props are
// empty here because these cases exercise the repeatable mechanics (keyed rows, add/remove/reorder,
// the itemLabel summary), not the picker or an upload.
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

// An array of flat objects: the canonical FAQ shape, with question as the row summary label.
const faq = {
  type: 'array',
  name: 'faq',
  label: 'FAQ',
  itemLabel: 'q',
  item: { type: 'object', fields: { q: { type: 'text', label: 'Q' }, a: { type: 'textarea', label: 'A' } } },
} as NamedField & ArrayField;

// An array of a leaf (text), to prove a non-object item renders one FieldInput per row.
const aliases = {
  type: 'array',
  name: 'aliases',
  label: 'Alias',
  item: { type: 'text', label: 'Alias' },
} as NamedField & ArrayField;

function dirtyCounter() {
  let count = 0;
  return { mark: () => { count += 1; }, get: () => count };
}

describe('RepeatableField', () => {
  it('lays its rows out as a bullet-free list that keeps its list role', async () => {
    await render(RepeatableField, { field: faq, name: 'faq', rows: [{ q: 'first', a: '' }], ...shared() });
    const list = document.querySelector('fieldset ul')!;
    expect(list.getAttribute('role')).toBe('list');
    // The compiled sheet scopes every rule under the admin theme root.
    document.documentElement.setAttribute('data-theme', 'cairn-admin');
    try {
      const style = getComputedStyle(list);
      expect(style.listStyleType).toBe('none');
      expect(style.paddingLeft).toBe('0px');
    } finally {
      document.documentElement.removeAttribute('data-theme');
    }
  });
  it('keeps an edited row and its focus when an earlier row is removed (B1)', async () => {
    await render(RepeatableField, {
      field: faq,
      name: 'faq',
      rows: [{ q: 'first', a: '' }, { q: 'second', a: '' }],
      ...shared(),
    });
    // Expand both rows so their inputs are in the DOM, then type into row B's question.
    const expanders = document.querySelectorAll<HTMLButtonElement>('[data-cairn-row-toggle]');
    expect(expanders.length).toBe(2);
    expanders[0].click();
    expanders[1].click();
    await expect.poll(() => document.querySelector('input[name="faq.1.q"]')).not.toBeNull();
    const rowB = document.querySelector<HTMLInputElement>('input[name="faq.1.q"]')!;
    await page.elementLocator(rowB).fill('second edited');
    rowB.focus();
    // Remove row A.
    document.querySelector<HTMLButtonElement>('[data-cairn-row-remove]')!.click();
    // Row B's value survives, now re-indexed to faq.0, and focus is retained on a live input.
    await expect.poll(() => document.querySelectorAll('[data-cairn-row-remove]').length).toBe(1);
    const survivor = document.querySelector<HTMLInputElement>('input[name="faq.0.q"]')!;
    expect(survivor.value).toBe('second edited');
    expect(document.activeElement).not.toBe(document.body);
  });

  it('reorders rows via the move controls and re-sequences the input name indices', async () => {
    await render(RepeatableField, {
      field: faq,
      name: 'faq',
      rows: [{ q: 'alpha', a: '' }, { q: 'beta', a: '' }],
      ...shared(),
    });
    document.querySelectorAll<HTMLButtonElement>('[data-cairn-row-toggle]').forEach((b) => b.click());
    await expect.poll(() => document.querySelector<HTMLInputElement>('input[name="faq.0.q"]')?.value).toBe('alpha');
    // Move the first row down.
    document.querySelector<HTMLButtonElement>('[data-cairn-row-down]')!.click();
    await expect.poll(() => document.querySelector<HTMLInputElement>('input[name="faq.0.q"]')?.value).toBe('beta');
    expect(document.querySelector<HTMLInputElement>('input[name="faq.1.q"]')!.value).toBe('alpha');
  });

  it('appends a row on Add and focuses its first input', async () => {
    await render(RepeatableField, { field: faq, name: 'faq', rows: [], ...shared() });
    expect(document.querySelectorAll('[data-cairn-row-remove]').length).toBe(0);
    await page.getByRole('button', { name: /add faq/i }).click();
    expect(document.querySelectorAll('[data-cairn-row-remove]').length).toBe(1);
    const first = document.querySelector<HTMLInputElement>('input[name="faq.0.q"]');
    expect(first).not.toBeNull();
    expect(document.activeElement).toBe(first);
  });

  it('shows the itemLabel value as the collapsed row summary', async () => {
    await render(RepeatableField, {
      field: faq,
      name: 'faq',
      rows: [{ q: 'How do I publish?', a: '' }],
      ...shared(),
    });
    const toggle = document.querySelector<HTMLElement>('[data-cairn-row-toggle]')!;
    await expect.element(toggle).toHaveTextContent('How do I publish?');
  });

  it('marks the form dirty on a structural mutation', async () => {
    const dirty = dirtyCounter();
    await render(RepeatableField, {
      field: faq,
      name: 'faq',
      rows: [{ q: 'one', a: '' }],
      ...shared(),
      markFieldsDirty: dirty.mark,
    });
    await page.getByRole('button', { name: /add faq/i }).click();
    expect(dirty.get()).toBeGreaterThan(0);
  });

  it('renders one FieldInput per row for a leaf item', async () => {
    await render(RepeatableField, {
      field: aliases,
      name: 'aliases',
      rows: ['one', 'two'],
      ...shared(),
    });
    document.querySelectorAll<HTMLButtonElement>('[data-cairn-row-toggle]').forEach((b) => b.click());
    await expect.poll(() => document.querySelector<HTMLInputElement>('input[name="aliases.0"]')?.value).toBe('one');
    expect(document.querySelector<HTMLInputElement>('input[name="aliases.1"]')!.value).toBe('two');
  });

  it('announces add and remove through the polite live region', async () => {
    await render(RepeatableField, { field: faq, name: 'faq', rows: [], ...shared() });
    const region = document.querySelector('[role="status"][aria-live="polite"]');
    expect(region).not.toBeNull();
    // Mounted empty so the first add is a genuine text change a screen reader re-announces.
    expect(region!.textContent).toBe('');

    await page.getByRole('button', { name: /add faq/i }).click();
    await expect.poll(() => region!.textContent).toBe('Row added');

    document.querySelector<HTMLButtonElement>('[data-cairn-row-remove]')!.click();
    await expect.poll(() => region!.textContent).toBe('Row removed');
  });
});

describe('RepeatableField scopes focus to its own instance', () => {
  // Two lists on one page, the showcase posts shape: an array(object) FAQ and a second array. A
  // structural mutation in the second list must move focus within the second list, never the first.
  function twoLists() {
    return {
      fieldA: faq,
      rowsA: [{ q: 'first', a: '' }, { q: 'second', a: '' }],
      fieldB: { ...faq, name: 'gallery', label: 'Gallery', itemLabel: 'q' } as NamedField & ArrayField,
      rowsB: [{ q: 'g-one', a: '' }, { q: 'g-two', a: '' }],
    };
  }

  /** The fieldset for a given harness list slot. */
  function listFor(slot: 'a' | 'b'): HTMLElement {
    return document.querySelector(`[data-list="${slot}"] fieldset`) as HTMLElement;
  }

  it('focuses the second list on Add in the second list', async () => {
    await render(TwoRepeatableFields, twoLists());
    const listB = listFor('b');
    // The Add button is the trailing button in the list; query by its text.
    const addBtns = Array.from(listB.querySelectorAll<HTMLButtonElement>('button')).filter((b) =>
      /add gallery/i.test(b.textContent ?? ''),
    );
    expect(addBtns.length).toBe(1);
    addBtns[0].click();
    await expect.poll(() => listB.querySelectorAll('[data-cairn-row-remove]').length).toBe(3);
    // Focus lands inside the second list, not the first.
    expect(listB.contains(document.activeElement)).toBe(true);
    expect(listFor('a').contains(document.activeElement)).toBe(false);
  });

  it('keeps focus in the second list on a remove in the second list', async () => {
    await render(TwoRepeatableFields, twoLists());
    const listB = listFor('b');
    const firstRemoveB = listB.querySelector<HTMLButtonElement>('[data-cairn-row-remove]')!;
    firstRemoveB.focus();
    firstRemoveB.click();
    await expect.poll(() => listB.querySelectorAll('[data-cairn-row-remove]').length).toBe(1);
    expect(listB.contains(document.activeElement)).toBe(true);
    expect(listFor('a').contains(document.activeElement)).toBe(false);
  });
});

describe('RepeatableField keeps a collapsed row in the form', () => {
  /** Moves the rendered list into a real form, the way the editor's form owns it. */
  function intoForm(): HTMLFormElement {
    const form = document.createElement('form');
    document.body.appendChild(form);
    form.appendChild(document.querySelector('fieldset')!);
    return form;
  }

  const requiredFaq = {
    ...faq,
    item: { type: 'object', fields: { q: { type: 'text', label: 'Q', required: true }, a: { type: 'textarea', label: 'A' } } },
  } as NamedField & ArrayField;

  it('submits a collapsed object row through a real FormData', async () => {
    await render(RepeatableField, {
      field: faq,
      name: 'faq',
      rows: [{ q: 'first', a: 'one' }, { q: 'second', a: 'two' }],
      ...shared(),
    });
    const data = frontmatterFromForm([faq], new FormData(intoForm()));
    expect(data.faq).toEqual([{ q: 'first', a: 'one' }, { q: 'second', a: 'two' }]);
  });

  it('submits a collapsed text leaf row through a real FormData', async () => {
    await render(RepeatableField, {
      field: aliases,
      name: 'aliases',
      rows: ['x', 'y'],
      ...shared(),
    });
    const data = frontmatterFromForm([aliases], new FormData(intoForm()));
    expect(data.aliases).toEqual(['x', 'y']);
  });

  it('opens a collapsed row whose required control is empty when the form reports validity', async () => {
    await render(RepeatableField, {
      field: requiredFaq,
      name: 'faq',
      rows: [{ q: '', a: '' }],
      ...shared(),
    });
    const form = intoForm();
    const toggle = form.querySelector('[data-cairn-row-toggle]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(form.reportValidity()).toBe(false);
    await expect.poll(() => toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('hides the collapsed body by computed style', async () => {
    document.documentElement.setAttribute('data-theme', 'cairn-admin');
    try {
      await render(RepeatableField, {
        field: faq,
        name: 'faq',
        rows: [{ q: 'first', a: '' }],
        ...shared(),
      });
      const wrapper = document.querySelector('[data-cairn-row-body]')!.parentElement as HTMLElement;
      await expect.element(page.elementLocator(wrapper)).not.toBeVisible();
      document.querySelector<HTMLButtonElement>('[data-cairn-row-toggle]')!.click();
      await expect.element(page.elementLocator(wrapper)).toBeVisible();
    } finally {
      document.documentElement.removeAttribute('data-theme');
    }
  });

  it('drops the key once every row is removed', async () => {
    await render(RepeatableField, {
      field: faq,
      name: 'faq',
      rows: [{ q: 'first', a: 'one' }],
      ...shared(),
    });
    const form = intoForm();
    form.querySelector<HTMLButtonElement>('[data-cairn-row-remove]')!.click();
    await expect.poll(() => form.querySelectorAll('[data-cairn-row]').length).toBe(0);
    expect('faq' in frontmatterFromForm([faq], new FormData(form))).toBe(false);
  });
});
