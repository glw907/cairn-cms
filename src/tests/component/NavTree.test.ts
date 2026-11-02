import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NavTree from '../../lib/admin/NavTree.svelte';
import { FAILURE_NOTICE } from '../../lib/admin/refusal.js';
import { enhanceRuns, resetEnhance, settleEnhance } from './_app-forms.js';

function data(over = {}) {
  return {
    menu: { name: 'primary', label: 'Primary nav', maxDepth: 2 },
    tree: [
      { label: 'Home', url: '/' },
      { label: 'Guides', children: [{ label: 'Start', url: '/start' }] },
    ],
    pages: [{ label: 'about', url: '/about' }],
    saved: false,
    ...over,
  };
}

function treeFromForm(container: HTMLElement): unknown {
  const field = container.querySelector<HTMLInputElement>('input[name="tree"]')!;
  return JSON.parse(field.value);
}

describe('NavTree', () => {
  beforeEach(resetEnhance);

  it('renders its header through the admin toolkit', async () => {
    // The admin-toolkit organization pass's T7 adoption sweep: the header band renders through
    // PageHeader, not a bare h1; the sortable-list card stays untouched.
    const screen = await render(NavTree, { data: data() });
    const header = screen.container.querySelector('header.mb-10');
    expect(header).not.toBeNull();
    expect(header?.textContent).toContain('Primary nav');
  });

  it('renders a row per node with its label and url', async () => {
    const screen = await render(NavTree, { data: data() });
    // Three nodes: Home (0), Guides (1), Start nested at (2).
    // vitest-browser uses @vitest/browser Locator API (not Testing Library), so we
    // use getByLabelText + nth to check each row's label input by position.
    await expect.element(screen.getByLabelText('Label').nth(0)).toHaveValue('Home');
    await expect.element(screen.getByLabelText('Label').nth(1)).toHaveValue('Guides');
    await expect.element(screen.getByLabelText('Label').nth(2)).toHaveValue('Start');
  });

  it('carries a CSRF field in every POST form', async () => {
    const screen = await render(NavTree, { data: data() });
    const postForms = screen.container.querySelectorAll('form[method="POST"]');
    const csrfFields = screen.container.querySelectorAll('form[method="POST"] input[name="csrf"]');
    expect(postForms.length).toBeGreaterThan(0);
    expect(csrfFields.length).toBe(postForms.length);
  });

  it('serializes the flat rows back into a nested tree in the hidden field', async () => {
    const screen = await render(NavTree, { data: data() });
    expect(treeFromForm(screen.container)).toEqual([
      { label: 'Home', url: '/' },
      { label: 'Guides', children: [{ label: 'Start', url: '/start' }] },
    ]);
  });

  it('adds a row', async () => {
    const screen = await render(NavTree, { data: data({ tree: [], pages: [] }) });
    await screen.getByRole('button', { name: /add item/i }).click();
    await expect.element(screen.getByLabelText('Label').nth(0)).toHaveValue('New item');
  });

  it('outdent on the nested child flattens it in the serialized tree', async () => {
    const screen = await render(NavTree, { data: data() });
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
    const screen = await render(NavTree, { data: data({ saved: true }) });
    await expect.element(screen.getByText(/navigation saved/i).first()).toBeInTheDocument();
  });

  it('fills the saved status region only after mount, and the visible alert carries no role', async () => {
    const screen = await render(NavTree, { data: data({ saved: true }) });
    const status = screen.container.querySelector('[role="status"]');
    await expect.poll(() => status?.textContent).toBe('Navigation saved.');
    expect(screen.container.querySelector('.alert-success')?.hasAttribute('role')).toBe(false);
  });

  it('mounts the saved status region before any save happens, empty', async () => {
    const screen = await render(NavTree, { data: data({ saved: false }) });
    const status = screen.container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent).toBe('');
  });

  it('surfaces a refused save\'s fail() error read from form, not only from data', async () => {
    // A validation or conflict refusal now answers in place through `form`, not a ?error= redirect
    // read back into `data.error`; the shell must wire `form` through for the message to reach here.
    const screen = await render(NavTree, {
      data: data(),
      form: { error: 'Someone else changed these settings. Saving again replaces their change.' },
    });
    const alert = screen.container.querySelector('.alert-error');
    expect(alert?.textContent).toContain('Someone else changed these settings. Saving again replaces their change.');
  });

  it('answers a refused save in place: the edited row survives, the alert takes focus, Save frees up', async () => {
    const screen = await render(NavTree, { data: data(), form: null });
    const label = screen.getByLabelText('Label').nth(0);
    await label.fill('Start here');
    const save = screen.container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    save.click();
    await expect.poll(() => enhanceRuns.length).toBe(1);
    expect(save.disabled).toBe(true);
    expect(save.getAttribute('aria-busy')).toBe('true');

    settleEnhance({ type: 'failure', status: 400, data: { error: 'Each item needs a label' } });
    await screen.rerender({ data: data(), form: { error: 'Each item needs a label' } });
    const alert = screen.container.querySelector<HTMLElement>('.alert-error')!;
    expect(alert.textContent).toContain('Each item needs a label');
    expect(alert.getAttribute('tabindex')).toBe('-1');
    await expect.poll(() => document.activeElement).toBe(alert);
    await expect.element(label).toHaveValue('Start here');
    await expect.poll(() => save.disabled).toBe(false);
  });

  it('shows the failure notice for an error result and keeps the edited row', async () => {
    const screen = await render(NavTree, { data: data(), form: null });
    const label = screen.getByLabelText('Label').nth(0);
    await label.fill('Start here');
    screen.container.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await expect.poll(() => enhanceRuns.length).toBe(1);

    settleEnhance({ type: 'error', error: new Error('boom') });
    await expect.poll(() => screen.container.querySelector('.alert-error')?.textContent).toContain(FAILURE_NOTICE);
    await expect.poll(() => document.activeElement).toBe(screen.container.querySelector('.alert-error'));
    await expect.element(label).toHaveValue('Start here');
  });

  it('shows the empty state with no rows, and its action adds the first row and focuses its label', async () => {
    const screen = await render(NavTree, { data: data({ tree: [], pages: [] }) });
    await expect.element(screen.getByText('No menu items yet')).toBeInTheDocument();
    await expect
      .element(screen.getByText('Add your first item and it will show up in your site’s menu.'))
      .toBeInTheDocument();
    expect(screen.container.querySelector('button[type="submit"]')).toBeNull();
    await screen.getByRole('button', { name: /add item/i }).click();
    const label = screen.getByLabelText('Label').nth(0);
    await expect.element(label).toHaveValue('New item');
    await expect.element(label).toHaveFocus();
    expect(screen.container.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('keeps Save after the last row of a saved tree is removed', async () => {
    const screen = await render(NavTree, { data: data({ tree: [{ label: 'Home', url: '/' }] }) });
    await screen.getByRole('button', { name: 'Remove Home' }).click();
    await expect.element(screen.getByText('No menu items yet')).toBeInTheDocument();
    expect(screen.container.querySelector('button[type="submit"]')).not.toBeNull();
    expect(treeFromForm(screen.container)).toEqual([]);
  });
});
