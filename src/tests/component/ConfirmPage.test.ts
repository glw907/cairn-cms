import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ConfirmPage from '../../lib/components/ConfirmPage.svelte';

describe('ConfirmPage', () => {
  it('renders a POST confirm form carrying the token and a CSRF field', async () => {
    const screen = await render(ConfirmPage, { data: { token: 'tok123', siteName: 'Test Site', error: null, csrf: 'csrf-tok' } });
    await expect.element(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(document.querySelector('input[name="token"]')).toHaveValue('tok123');
    expect(screen.container.querySelector('form input[name="csrf"]')).toHaveValue('csrf-tok');
  });

  it('shows an error when the link was invalid', async () => {
    const screen = await render(ConfirmPage, { data: { token: '', siteName: 'Test Site', error: 'expired', csrf: 'csrf-tok' } });
    await expect.element(screen.getByText(/expired|invalid/i)).toBeInTheDocument();
  });

  it("shows the action's own error, not the generic expired-link copy, on an unexpected confirm failure", async () => {
    // viewAction's generic fail(500) carries only { error }, distinct from the load-time
    // ?error=expired boolean flag. A signed-in-adjacent D1 fault should read as its own message,
    // not the misleading "invalid or expired" copy (the Task 12 review finding this pins).
    const screen = await render(ConfirmPage, {
      data: { token: 'tok123', siteName: 'Test Site', error: null, csrf: 'csrf-tok' },
      form: { error: 'Something went wrong and your changes were not saved. Try again.' },
    });
    await expect.element(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.container.querySelector('[role="alert"]')?.textContent ?? '').not.toMatch(/invalid or expired/i);
  });

  it('applies the SSR-resolved dark theme to its data-theme wrapper (the cookie carries no auth)', async () => {
    const screen = await render(ConfirmPage, {
      data: { token: 'tok123', siteName: 'Test Site', error: null, csrf: 'csrf-tok', theme: 'cairn-admin-dark' },
    });
    expect(screen.container.querySelector('[data-theme="cairn-admin-dark"]')).toBeTruthy();
  });

  it('falls back to the light theme when no theme is given', async () => {
    const screen = await render(ConfirmPage, { data: { token: 'tok123', siteName: 'Test Site', error: null, csrf: 'csrf-tok' } });
    expect(screen.container.querySelector('[data-theme="cairn-admin"]')).toBeTruthy();
  });
});
