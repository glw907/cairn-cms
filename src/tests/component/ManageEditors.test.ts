import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ManageEditors from '../../lib/components/ManageEditors.svelte';

function data() {
  return {
    editors: [
      { email: 'owner@t', displayName: 'Owner One', role: 'owner' as const },
      { email: 'ed@t', displayName: 'Ed Two', role: 'editor' as const },
    ],
    self: 'owner@t',
    siteName: 'Test Site',
  };
}

describe('ManageEditors', () => {
  it('lists editors with their roles', async () => {
    const screen = render(ManageEditors, { data: data(), form: null });
    await expect.element(screen.getByText('Owner One')).toBeInTheDocument();
    await expect.element(screen.getByText('Ed Two')).toBeInTheDocument();
  });

  it('disables the remove control for the acting owner (anti-lockout affordance)', async () => {
    const screen = render(ManageEditors, { data: data(), form: null });
    const selfRemove = screen.getByRole('button', { name: /remove owner one/i });
    await expect.element(selfRemove).toBeDisabled();
  });

  it('renders an add-editor form', async () => {
    const screen = render(ManageEditors, { data: data(), form: null });
    await expect.element(screen.getByRole('button', { name: /add editor/i })).toBeInTheDocument();
  });

  it('surfaces an action error', async () => {
    const screen = render(ManageEditors, { data: data(), form: { error: 'That editor already exists' } });
    await expect.element(screen.getByText(/already exists/i)).toBeInTheDocument();
  });
});
