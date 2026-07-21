import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NavTree from '../../lib/components/NavTree.svelte';

function data(over = {}) {
  return {
    menu: { name: 'primary', label: 'Primary nav', maxDepth: 2 },
    tree: [
      { label: 'Home', url: '/' },
      { label: 'Guides', children: [{ label: 'Start', url: '/start' }] },
    ],
    pages: [{ label: 'about', url: '/about' }],
    saved: false,
    error: null,
    ...over,
  };
}

function treeFromForm(container: HTMLElement): unknown {
  const field = container.querySelector<HTMLInputElement>('input[name="tree"]')!;
  return JSON.parse(field.value);
}

describe('NavTree', () => {
  it('renders its header through the admin toolkit', async () => {
    // The admin-toolkit organization pass's T7 adoption sweep: the header band renders through
    // PageHeader, not a bare h1; the sortable-list card stays untouched.
    const screen = render(NavTree, { data: data() });
    const header = screen.container.querySelector('header.mb-10');
    expect(header).not.toBeNull();
    expect(header?.textContent).toContain('Primary nav');
  });

  it('renders a row per node with its label and url', async () => {
    const screen = render(NavTree, { data: data() });
    // Three nodes: Home (0), Guides (1), Start nested at (2).
    // vitest-browser uses @vitest/browser Locator API (not Testing Library), so we
    // use getByLabelText + nth to check each row's label input by position.
    await expect.element(screen.getByLabelText('Label').nth(0)).toHaveValue('Home');
    await expect.element(screen.getByLabelText('Label').nth(1)).toHaveValue('Guides');
    await expect.element(screen.getByLabelText('Label').nth(2)).toHaveValue('Start');
  });

  it('carries a CSRF field in every POST form', async () => {
    const screen = render(NavTree, { data: data() });
    const postForms = screen.container.querySelectorAll('form[method="POST"]');
    const csrfFields = screen.container.querySelectorAll('form[method="POST"] input[name="csrf"]');
    expect(postForms.length).toBeGreaterThan(0);
    expect(csrfFields.length).toBe(postForms.length);
  });

  it('serializes the flat rows back into a nested tree in the hidden field', async () => {
    const screen = render(NavTree, { data: data() });
    expect(treeFromForm(screen.container)).toEqual([
      { label: 'Home', url: '/' },
      { label: 'Guides', children: [{ label: 'Start', url: '/start' }] },
    ]);
  });

  it('adds a row', async () => {
    const screen = render(NavTree, { data: data({ tree: [], pages: [] }) });
    await screen.getByRole('button', { name: /add item/i }).click();
    await expect.element(screen.getByLabelText('Label').nth(0)).toHaveValue('New item');
  });

  it('outdent on the nested child flattens it in the serialized tree', async () => {
    const screen = render(NavTree, { data: data() });
    // Three rows: Home (0), Guides (1), Start (2). outdents[2] is the Start row's Outdent button.
    const outdents = screen.container.querySelectorAll<HTMLButtonElement>('button[aria-label="Outdent"]');
    outdents[2].click();
    await expect.poll(() => treeFromForm(screen.container)).toEqual([
      { label: 'Home', url: '/' },
      { label: 'Guides' },
      { label: 'Start', url: '/start' },
    ]);
  });

  it('shows a saved confirmation', async () => {
    const screen = render(NavTree, { data: data({ saved: true }) });
    await expect.element(screen.getByText(/navigation saved/i)).toBeInTheDocument();
  });
});
