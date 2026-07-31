import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import FieldLabel from '../../lib/admin-fields/FieldLabel.svelte';
import SelectField from '../../lib/admin-fields/SelectField.svelte';
import TextField from '../../lib/admin-fields/TextField.svelte';
import StackedFieldGrid from './_StackedFieldGrid.svelte';
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
    const inputs = Array.from(screen.container.querySelectorAll('input')) as HTMLInputElement[];
    expect(inputs).toHaveLength(2);
    const [first, second] = inputs.map((el) => el.getBoundingClientRect());
    expect(first.left).toBeCloseTo(second.left, 1);
    expect(first.right).toBeCloseTo(second.right, 1);
    const column = screen.container.querySelector('.grid > div')!.getBoundingClientRect();
    expect(first.width).toBeCloseTo(column.width, 1);
    expect(first.width).toBeGreaterThan(320);
  });
});
