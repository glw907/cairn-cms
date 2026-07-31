import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import FieldLabel from '../../lib/admin-fields/FieldLabel.svelte';
import SelectField from '../../lib/admin-fields/SelectField.svelte';
import TextField from '../../lib/admin-fields/TextField.svelte';
import StackedFieldGrid from './_StackedFieldGrid.svelte';
import StackedCompactRow from './_StackedCompactRow.svelte';
// The stacked register's width hook lives only in the built sheet's dedicated unlayered rule, so
// this suite loads the real compiled artifact rather than the source partial the other tests here
// import.
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';

describe('FieldLabel', () => {
  it('renders the label beside its control', async () => {
    const control = createRawSnippet(() => ({ render: () => '<input name="x" />' }));
    const screen = render(FieldLabel, { label: 'Instructor', children: control });
    await expect.element(screen.getByText('Instructor')).toBeInTheDocument();
    expect(screen.container.querySelector('input[name="x"]')).not.toBeNull();
  });

  // Design ratchet fix A2, item (2): the two registers used to render as separate {#if}/{:else}
  // branches, so a live register flip destroyed and recreated the label, including the composed
  // control, dropping the control's focus and any in-progress IME composition. This fails against
  // the two-branch shape (a new input element and a cleared document.activeElement) and passes
  // once FieldLabel renders one label with a conditional class list.
  it('keeps the control element and its focus across a live register flip', async () => {
    const control = createRawSnippet(() => ({ render: () => '<input name="x" />' }));
    const screen = render(FieldLabel, { label: 'Instructor', children: control, register: 'inline' });
    const input = screen.container.querySelector('input[name="x"]') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    await screen.rerender({ label: 'Instructor', children: control, register: 'stacked' });

    const inputAfter = screen.container.querySelector('input[name="x"]') as HTMLInputElement;
    expect(inputAfter).toBe(input);
    expect(document.activeElement).toBe(input);
    // Confirms the rerender actually applied the new register, so this test cannot pass vacuously
    // against a component that ignores the prop.
    const label = screen.container.querySelector('label')!;
    expect(label.className).toContain('cairn-field-stacked');
  });
});

describe('SelectField', () => {
  const options = [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
  ];

  it('renders a labeled select with the given options and posts by name', async () => {
    const screen = render(SelectField, { label: 'Status', name: 'status', value: 'open', options });
    await expect.element(screen.getByText('Status')).toBeInTheDocument();
    const select = screen.container.querySelector('select[name="status"]') as unknown as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe('open');
    expect([...select.options].map((o) => o.value)).toEqual(['open', 'closed']);
  });

});

describe('TextField', () => {
  it('renders a labeled text input, defaulting the type', async () => {
    const screen = render(TextField, { label: 'Search', name: 'q', value: '' });
    await expect.element(screen.getByText('Search')).toBeInTheDocument();
    const input = screen.container.querySelector('input[name="q"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.getAttribute('type')).toBe('text');
  });

  it('applies a narrower type and a placeholder', async () => {
    const screen = render(TextField, { label: 'Search', name: 'q', value: '', type: 'search', placeholder: 'Find a member' });
    const input = screen.container.querySelector('input[name="q"]') as HTMLInputElement;
    expect(input.getAttribute('type')).toBe('search');
    expect(input.getAttribute('placeholder')).toBe('Find a member');
  });
});

// Design ratchet Task 3 (closes finding 3): the stacked register (label above control) is the
// default on FieldLabel/TextField/SelectField, and its sheet hook forces a contained control to
// fill its grid cell rather than clamping to daisyUI's fixed 20rem default. This proves the
// register against the REAL compiled sheet, the same way AdminReset.test.ts proves the base layer.
describe('the stacked register', () => {
  let sheet: HTMLStyleElement;

  beforeAll(() => {
    document.documentElement.setAttribute('data-theme', 'cairn-admin');
    sheet = document.createElement('style');
    sheet.textContent = compiledAdminCss;
    document.head.appendChild(sheet);
  });

  afterAll(() => {
    document.documentElement.removeAttribute('data-theme');
    sheet.remove();
  });

  it('is the default: a bare TextField renders the label above the control', async () => {
    const screen = render(TextField, { label: 'Search', name: 'q', value: '' });
    const label = screen.container.querySelector('label')!;
    expect(label.className).toContain('flex-col');
  });

  it('opts into the inline register explicitly', async () => {
    const screen = render(TextField, { label: 'Search', name: 'q', value: '', register: 'inline' });
    const label = screen.container.querySelector('label')!;
    expect(label.className).toContain('items-center');
  });

  it('aligns two stacked controls sharing a grid column, regardless of label length, and fills the cell', async () => {
    const screen = render(StackedFieldGrid);
    const inputs = Array.from(screen.container.querySelectorAll('input'));
    expect(inputs).toHaveLength(2);
    const [first, second] = inputs.map((el) => el.getBoundingClientRect());
    expect(first.left).toBeCloseTo(second.left, 1);
    expect(first.right).toBeCloseTo(second.right, 1);
    const column = screen.container.querySelector('.grid > div')!.getBoundingClientRect();
    expect(first.width).toBeCloseTo(column.width, 1);
    expect(first.width).toBeGreaterThan(320);
  });

  // Fix A2, item (1): the width hook's selector matched EVERY descendant control, so a
  // compact row nested inside a stacked label (two controls side by side, rather than one control
  // composing the label directly) had each control forced to `width: 100%` of the row, which
  // flex-shrink then had to fight over, instead of each control keeping daisyUI's own 20rem
  // preferred width. Scoping the hook to a direct child lets the nested row escape: with the fix,
  // both controls fit at their unshrunk ~320px default inside the harness's 900px container; with
  // the pre-fix descendant selector, the pair overflows the row and shrinks well past 400px each.
  it("lets a nested compact row keep daisyUI's default width instead of filling the label", async () => {
    const screen = render(StackedCompactRow);
    const inputs = Array.from(screen.container.querySelectorAll('input'));
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      const width = input.getBoundingClientRect().width;
      expect(width).toBeGreaterThan(250);
      expect(width).toBeLessThan(400);
    }
  });
});
