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

  it('guides an editor whose link never arrives without leaking allowlist membership', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { sent: true } });
    await expect.element(screen.getByText(/check your spam folder/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/match the one your site owner added/i)).toBeInTheDocument();
  });

  it('returns to the email form when a mistyped address is corrected', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { sent: true } });
    await screen.getByRole('button', { name: /use a different email/i }).click();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it('dismisses the confirmation panel for the full engine result shape', async () => {
    // Pins the dismissed-banner branch ((form?.status === 'sent' || form?.sent) && !dismissed),
    // the exact expression svelte 5.56.1 miscompiled by dropping the parentheses.
    const screen = render(LoginPage, {
      data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' },
      form: { sent: true, status: 'sent' },
    });
    await expect.element(screen.getByText(/check your email/i)).toBeInTheDocument();
    await screen.getByRole('button', { name: /use a different email/i }).click();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.container.textContent ?? '').not.toMatch(/check your email/i);
  });

  it('shows the success panel for the engine result shape', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { status: 'sent', sent: true } });
    await expect.element(screen.getByText(/check your email/i)).toBeInTheDocument();
  });

  it('lets a fresh action result supersede a stale expired-link error', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: 'expired', csrf: 'csrf-tok' }, form: { status: 'throttled', sent: false } });
    await expect.element(screen.getByText(/requested a link recently/i)).toBeInTheDocument();
    expect(screen.container.textContent).not.toMatch(/that link expired/i);
  });

  it('shows a send-error warning and keeps the form available', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { status: 'send_error', sent: false } });
    await expect.element(screen.getByRole('alert')).toBeInTheDocument();
    await expect.element(screen.getByText(/trouble sending sign-in links/i)).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it('shows a throttled hint and keeps the form available', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { status: 'throttled', sent: false } });
    await expect.element(screen.getByText(/requested a link recently/i)).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });
});
