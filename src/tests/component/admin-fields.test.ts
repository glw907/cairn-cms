import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import FieldLabel from '../../lib/admin-fields/FieldLabel.svelte';
import SelectField from '../../lib/admin-fields/SelectField.svelte';
import TextField from '../../lib/admin-fields/TextField.svelte';

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
