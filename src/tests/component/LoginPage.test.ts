import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LoginPage from '../../lib/components/LoginPage.svelte';

describe('LoginPage', () => {
  it('renders an email form posting to the request action with a CSRF field', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: null });
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /send|sign in/i })).toBeInTheDocument();
    expect(screen.container.querySelector('form input[name="csrf"]')).toHaveValue('csrf-tok');
  });

  it('shows a neutral success message after a request', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { sent: true } });
    await expect.element(screen.getByText(/check your email/i)).toBeInTheDocument();
  });
});
