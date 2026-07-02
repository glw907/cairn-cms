import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import FieldInput from '../../lib/components/FieldInput.svelte';
import ComponentForm from '../../lib/components/ComponentForm.svelte';
import { defineComponent } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';
import type { NamedField } from '../../lib/content/types.js';

// Guard suite for the leaf-field-rendering family (FieldInput, ComponentForm, ObjectGroupField,
// RepeatableField). It pins the OBSERVABLE behavior of BOTH leaf dispatchers before any merge, so a
// shared-renderer refactor that homogenizes one of the two divergent conventions fails here. The two
// conventions are deliberately different and the charter keeps both: FieldInput does native form
// participation (name-carrying uncontrolled inputs, native `required`, an aria-describedby HINT), and
// ComponentForm does controlled state with inline touched-tracking validation (no form `name`, an
// asterisk, aria-invalid, a role=alert error span, live values bound out for the dialog preview). The
// per-instance focus behavior of the repeatable arms is the phase-3a hazard the merge must preserve.

const shared = () => ({
  targets: [],
  markFieldsDirty: () => {},
  mediaLibrary: {},
  conceptId: 'posts',
  id: '2026-05-hello',
  heroFieldRefs: {},
  onuploaded: () => {},
  onheroneedsalt: () => {},
});

const icons = { snowflake: 'M10 10h20', leaf: 'M5 5h30' };

// ---------------------------------------------------------------------------
// FieldInput: per-field-type rendering, the whole content-field vocabulary.
// ---------------------------------------------------------------------------

describe('FieldInput dispatches each field type to its arm', () => {
  it('renders a plain text input (no type attribute) carrying the form name and value', () => {
    const field = { type: 'text', name: 'title', label: 'Title' } as NamedField;
    render(FieldInput, { field, frontmatter: { title: 'Hello' }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="title"]')!;
    expect(input).not.toBeNull();
    expect(input.getAttribute('type')).toBeNull();
    expect(input.value).toBe('Hello');
  });

  it('renders a textarea with the value as its content and the configured rows', () => {
    const field = { type: 'textarea', name: 'summary', label: 'Summary', rows: 5 } as NamedField;
    render(FieldInput, { field, frontmatter: { summary: 'A paragraph.' }, ...shared() });
    const ta = document.querySelector<HTMLTextAreaElement>('textarea[name="summary"]')!;
    expect(ta).not.toBeNull();
    expect(ta.value).toBe('A paragraph.');
    expect(ta.rows).toBe(5);
  });

  it('renders a number input with min, max, integer step, and the native required attribute', () => {
    const field = { type: 'number', name: 'count', label: 'Count', min: 1, max: 9, integer: true, required: true } as NamedField;
    render(FieldInput, { field, frontmatter: { count: 4 }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[type="number"][name="count"]')!;
    expect(input).not.toBeNull();
    expect(input.min).toBe('1');
    expect(input.max).toBe('9');
    expect(input.step).toBe('1');
    expect(input.required).toBe(true);
    expect(input.value).toBe('4');
  });

  it('renders a select with a leading empty option and the schema options, marked required', () => {
    const field = { type: 'select', name: 'tone', label: 'Tone', options: ['note', 'warn'], required: true } as NamedField;
    render(FieldInput, { field, frontmatter: { tone: 'warn' }, ...shared() });
    const select = document.querySelector('select[name="tone"]') as unknown as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.required).toBe(true);
    // Leading empty option plus the two schema options.
    expect(select.options.length).toBe(3);
    expect(select.options[0].value).toBe('');
    expect(select.value).toBe('warn');
  });

  it('renders a date input that always carries a hint paragraph (the publish-clarity default)', () => {
    const field = { type: 'date', name: 'date', label: 'Date' } as NamedField;
    render(FieldInput, { field, frontmatter: { date: '2026-05-01' }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[type="date"][name="date"]')!;
    expect(input).not.toBeNull();
    expect(input.getAttribute('aria-describedby')).toBe('date-hint');
    const hint = document.getElementById('date-hint')!;
    expect(hint).not.toBeNull();
    expect(hint.textContent).toContain('Publishing is a separate step');
  });

  it('renders a boolean checkbox reflecting the frontmatter truthiness', () => {
    const field = { type: 'boolean', name: 'draft', label: 'Draft' } as NamedField;
    render(FieldInput, { field, frontmatter: { draft: true }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[type="checkbox"][name="draft"]')!;
    expect(input).not.toBeNull();
    expect(input.checked).toBe(true);
  });

  it('renders a closed multiselect as a fieldset of checkboxes, one per option', () => {
    const field = { type: 'multiselect', name: 'topics', label: 'Topics', options: ['a', 'b'], creatable: false } as NamedField;
    render(FieldInput, { field, frontmatter: { topics: ['a'] }, ...shared() });
    expect(document.querySelector('fieldset')).not.toBeNull();
    const boxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="topics"]');
    expect(boxes.length).toBe(2);
    expect([...boxes].find((b) => b.value === 'a')!.checked).toBe(true);
  });

  it('renders an open multiselect as one comma-joined text input with a hint placeholder', () => {
    const field = { type: 'multiselect', name: 'tags', label: 'Tags', creatable: true } as NamedField;
    render(FieldInput, { field, frontmatter: { tags: ['x', 'y'] }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="tags"]')!;
    expect(input).not.toBeNull();
    expect(input.value).toBe('x, y');
    expect(input.placeholder).toBe('Separate values with commas');
  });

  it('renders an image field through MediaHeroField, building the hidden src input off the name', () => {
    const field = { type: 'image', name: 'cover', label: 'Cover' } as NamedField;
    render(FieldInput, { field, name: 'cover', frontmatter: {}, ...shared() });
    expect(document.querySelector('input[name="cover.src"]')).not.toBeNull();
  });

  it('renders a single reference through ReferenceField (a dialog-popup trigger)', () => {
    const field = { type: 'reference', name: 'author', label: 'Author', concept: 'pages' } as NamedField;
    render(FieldInput, { field, frontmatter: {}, ...shared() });
    const trigger = document.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"][aria-label="Author"]');
    expect(trigger).not.toBeNull();
  });

  it('routes an array-of-reference to ReferenceField (an Add popup trigger), not the repeatable list', () => {
    const field = { type: 'array', name: 'related', label: 'Related', item: { type: 'reference', label: '', concept: 'posts' } } as NamedField;
    render(FieldInput, { field, frontmatter: { related: [] }, ...shared() });
    expect(document.querySelector('button[aria-haspopup="dialog"][aria-label="Add Related"]')).not.toBeNull();
    // The repeatable list's live region is absent, proving it did not fall through to RepeatableField.
    expect(document.querySelector('[role="status"][aria-live="polite"]')).toBeNull();
  });

  it('routes a non-reference array to RepeatableField (its polite live region is present)', () => {
    const field = { type: 'array', name: 'aliases', label: 'Alias', item: { type: 'text', label: 'Alias' } } as NamedField;
    render(FieldInput, { field, frontmatter: { aliases: [] }, ...shared() });
    expect(document.querySelector('[role="status"][aria-live="polite"]')).not.toBeNull();
  });

  it('routes an object field to ObjectGroupField (a labeled fieldset legend)', () => {
    const field = { type: 'object', name: 'meta', label: 'Meta', fields: { note: { type: 'text', label: 'Note' } } } as NamedField;
    render(FieldInput, { field, name: 'meta', frontmatter: { note: 'hi' }, ...shared() });
    const legend = document.querySelector<HTMLElement>('legend');
    expect(legend?.textContent).toContain('Meta');
    expect(document.querySelector('input[name="meta.note"]')).not.toBeNull();
  });

  it('renders an icon field through IconPicker when the site ships an icon set', () => {
    const field = { type: 'icon', name: 'marker', label: 'Marker' } as NamedField;
    render(FieldInput, { field, frontmatter: {}, icons, ...shared() });
    expect(document.querySelector('[role="radiogroup"]')).not.toBeNull();
  });

  it('maps url, email, and datetime to their native input types in the fallback arm', () => {
    for (const [type, expected] of [['url', 'url'], ['email', 'email'], ['datetime', 'datetime-local']] as const) {
      const field = { type, name: 'x', label: 'X' } as NamedField;
      const { unmount } = render(FieldInput, { field, frontmatter: {}, ...shared() });
      const input = document.querySelector<HTMLInputElement>('input[name="x"]')!;
      expect(input.getAttribute('type')).toBe(expected);
      unmount();
    }
  });
});

// ---------------------------------------------------------------------------
// FieldInput: the native-participation + aria-describedby-hint convention.
// This is the divergence the charter keeps distinct from ComponentForm's.
// ---------------------------------------------------------------------------

describe('FieldInput validation convention (native required + hint, no inline error chrome)', () => {
  it('surfaces requiredness through the native attribute, with no asterisk or aria-invalid', () => {
    const field = { type: 'text', name: 'title', label: 'Title', required: true } as NamedField;
    render(FieldInput, { field, frontmatter: {}, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="title"]')!;
    expect(input.required).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBeNull();
    // No component-picker asterisk marker: this convention leaves requiredness to the native attribute.
    expect(document.querySelector('[data-testid="cairn-pk-req"]')).toBeNull();
  });

  it('points aria-describedby at a HINT paragraph built from the field help', () => {
    const field = { type: 'text', name: 'title', label: 'Title', help: 'Keep it short.' } as NamedField;
    render(FieldInput, { field, frontmatter: {}, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="title"]')!;
    expect(input.getAttribute('aria-describedby')).toBe('title-hint');
    const hint = document.getElementById('title-hint')!;
    expect(hint.textContent).toContain('Keep it short.');
    // The described element is a hint, not a role=alert error.
    expect(hint.getAttribute('role')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ComponentForm: the controlled-state + touched-validation convention.
// ---------------------------------------------------------------------------

const base = {
  build: () => ({ type: 'element' as const, tagName: 'div', properties: {}, children: [] }),
  description: 'd',
  use: 'u',
};

const iconDef = defineComponent({
  ...base,
  name: 'marker',
  label: 'Marker',
  attributes: {
    glyph: fields.icon({ label: 'Glyph', required: true }),
    when: fields.date({ label: 'When' }),
  },
  slots: [{ name: 'title', label: 'Title', kind: 'inline', required: true }],
});

describe('ComponentForm validation convention (controlled state + inline touched errors)', () => {
  it('renders required markers as visible asterisks and aria-required, never a native required attribute', async () => {
    const screen = render(ComponentForm, { def: iconDef, icons, onInsert: () => {} } as never);
    const title = screen.getByRole('textbox', { name: /title/i });
    await expect.element(title).toHaveAttribute('aria-required', 'true');
    // Controlled convention: no form `name`, no native `required`; requiredness rides aria + asterisk.
    await expect.element(title).not.toHaveAttribute('name');
    await expect.element(title).not.toHaveAttribute('required');
    expect(screen.container.querySelectorAll('[data-testid="cairn-pk-req"]').length).toBeGreaterThanOrEqual(1);
  });

  it('shows a role=alert error span linked by aria-describedby once a required field is touched-empty', async () => {
    const screen = render(ComponentForm, { def: iconDef, icons, onInsert: () => {} } as never);
    const title = screen.getByRole('textbox', { name: /title/i });
    await title.fill('x');
    await title.fill('');
    const alert = screen.container.querySelector('[role="alert"]')!;
    expect(alert).not.toBeNull();
    expect(alert.textContent).toMatch(/title is required/i);
    await expect.element(title).toHaveAttribute('aria-invalid', 'true');
    expect(title.element().getAttribute('aria-describedby')).toBe(alert.id);
  });

  it('binds the working values out live so the host preview reads each keystroke (controlled coupling)', async () => {
    let values: { attributes: Record<string, unknown>; slots: Record<string, unknown> } | undefined;
    const grid = defineComponent({
      ...base,
      name: 'note',
      label: 'Note',
      attributes: { label: fields.text({ label: 'Label' }) },
      slots: [],
    });
    const screen = render(ComponentForm, {
      def: grid,
      onInsert: () => {},
      get values() {
        return values;
      },
      set values(v) {
        values = v;
      },
    } as never);
    await screen.getByRole('textbox', { name: /label/i }).fill('Hi');
    // The controlled write reached working state and mirrored out through the bound prop, with no
    // form submit. A native-participation renderer would leave values unchanged until FormData read.
    expect(values?.attributes.label).toBe('Hi');
  });

  it('folds a date attribute into a plain typed input, without FieldInput publish-hint semantics', async () => {
    const screen = render(ComponentForm, { def: iconDef, icons, onInsert: () => {} } as never);
    // ComponentForm's date attribute is a bare typed input; it must NOT carry FieldInput's
    // post-publish date hint, which is nonsensical in the component-insert context.
    expect(screen.container.querySelector('input[type="date"]')).not.toBeNull();
    expect(screen.container.textContent).not.toContain('Publishing is a separate step');
  });
});

describe('ComponentForm icon attribute renders through IconPicker', () => {
  it('renders a radiogroup and writes the picked glyph into working state', async () => {
    let values: { attributes: Record<string, unknown> } | undefined;
    const screen = render(ComponentForm, {
      def: iconDef,
      icons,
      onInsert: () => {},
      get values() {
        return values;
      },
      set values(v) {
        values = v;
      },
    } as never);
    await expect.element(screen.getByRole('radiogroup', { name: /glyph/i })).toBeInTheDocument();
    await screen.getByRole('radio', { name: /snowflake/i }).click();
    expect(values?.attributes.glyph).toBe('snowflake');
  });
});

// ---------------------------------------------------------------------------
// Multi-instance / uncontrolled-row focus, the phase-3a hazard the merge must
// preserve. RepeatableField keeps rows uncontrolled behind a keyed envelope so
// an in-progress edit survives a sibling structural mutation; a shared
// controlled renderer would re-seed the row and drop the edit.
// ---------------------------------------------------------------------------

const faq = {
  type: 'array',
  name: 'faq',
  label: 'FAQ',
  itemLabel: 'q',
  item: { type: 'object', fields: { q: { type: 'text', label: 'Q' }, a: { type: 'textarea', label: 'A' } } },
} as NamedField;

describe('RepeatableField keeps an uncontrolled in-progress edit across a sibling structural change', () => {
  it('preserves an unsaved row edit when a new row is appended (rows are not re-seeded)', async () => {
    render(FieldInput, { field: faq, name: 'faq', frontmatter: { faq: [{ q: 'first', a: '' }] }, ...shared() });
    document.querySelector<HTMLButtonElement>('[data-cairn-row-toggle]')!.click();
    await expect.poll(() => document.querySelector('input[name="faq.0.q"]')).not.toBeNull();
    const rowInput = document.querySelector<HTMLInputElement>('input[name="faq.0.q"]')!;
    // Type into the row WITHOUT any parent-owned commit; the keyed envelope owns the seed.
    await page.elementLocator(rowInput).fill('first edited');
    // Append a new row: a structural mutation of the sibling list.
    await page.getByRole('button', { name: /add faq/i }).click();
    await expect.poll(() => document.querySelectorAll('[data-cairn-row-remove]').length).toBe(2);
    // The first row's uncontrolled edit is intact; a controlled re-seed would have reset it to 'first'.
    expect(document.querySelector<HTMLInputElement>('input[name="faq.0.q"]')!.value).toBe('first edited');
    // Focus followed the newly added row's body, not the edited row.
    expect(document.activeElement).not.toBe(rowInput);
  });
});
