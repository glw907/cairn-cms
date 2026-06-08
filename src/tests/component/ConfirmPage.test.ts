import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ConfirmPage from '../../lib/components/ConfirmPage.svelte';

describe('ConfirmPage', () => {
  it('renders a POST confirm form carrying the token and a CSRF field', async () => {
    const screen = render(ConfirmPage, { data: { token: 'tok123', siteName: 'Test Site', error: null, csrf: 'csrf-tok' } });
    await expect.element(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(document.querySelector('input[name="token"]')).toHaveValue('tok123');
    expect(screen.container.querySelector('form input[name="csrf"]')).toHaveValue('csrf-tok');
  });

  it('shows an error when the link was invalid', async () => {
    const screen = render(ConfirmPage, { data: { token: '', siteName: 'Test Site', error: 'expired', csrf: 'csrf-tok' } });
    await expect.element(screen.getByText(/expired|invalid/i)).toBeInTheDocument();
  });
});
