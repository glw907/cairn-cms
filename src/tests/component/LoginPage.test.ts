import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LoginPage from '../../lib/components/LoginPage.svelte';
import { NO_PENDING_REQUEST_ERROR } from '../../lib/sveltekit/auth-routes.js';

describe('LoginPage', () => {
  it('renders an email form posting to the request action with a CSRF field', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: null });
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /send|sign in/i })).toBeInTheDocument();
    expect(screen.container.querySelector('form input[name="csrf"]')).toHaveValue('csrf-tok');
  });

  it('shows a neutral success message after a request', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { sent: true } });
    await expect.element(screen.getByText(/check your email/i)).toBeInTheDocument();
  });

  it('guides an editor whose link never arrives without leaking allowlist membership', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { sent: true } });
    await expect.element(screen.getByText(/check your spam folder/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/match the one your site owner added/i)).toBeInTheDocument();
  });

  it('returns to the email form when a mistyped address is corrected', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { sent: true } });
    await screen.getByRole('button', { name: /use a different email/i }).click();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it('dismisses the confirmation panel for the full engine result shape', async () => {
    // Pins the dismissed-banner branch ((form?.status === 'sent' || form?.sent) && !dismissed);
    // see src/tests/unit/peer-deps.test.ts for the correctness floor this shape guards.
    const screen = await render(LoginPage, {
      data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' },
      form: { sent: true, status: 'sent' },
    });
    await expect.element(screen.getByText(/check your email/i)).toBeInTheDocument();
    await screen.getByRole('button', { name: /use a different email/i }).click();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.container.textContent ?? '').not.toMatch(/check your email/i);
  });

  it('shows the success panel for the engine result shape', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { status: 'sent', sent: true } });
    await expect.element(screen.getByText(/check your email/i)).toBeInTheDocument();
  });

  it('lets a fresh action result supersede a stale expired-link error', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: 'expired', csrf: 'csrf-tok' }, form: { status: 'throttled', sent: false } });
    await expect.element(screen.getByText(/requested a link recently/i)).toBeInTheDocument();
    expect(screen.container.textContent).not.toMatch(/that link expired/i);
  });

  it('names the same-browser requirement when this browser holds no pending sign-in', async () => {
    // Distinct from the expired copy on purpose: "request a new one" is exactly the instruction
    // that reproduces the failure for someone who asks on a desktop and clicks on a phone.
    const screen = await render(LoginPage, {
      data: { siteName: 'Test Site', error: NO_PENDING_REQUEST_ERROR, csrf: 'csrf-tok' },
      form: null,
    });
    await expect.element(screen.getByText(/no pending sign-in/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/open it in this browser/i)).toBeInTheDocument();
    expect(screen.container.textContent).not.toMatch(/that link expired/i);
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it('gives each refusal its own title and a focusable alert, the JS-free landing signal', async () => {
    // A redirect lands here carrying its reason only in a query string. The title is what a
    // screen reader announces first, and tabindex="-1" lets an assistive technology move straight
    // to the refusal instead of reading down to it.
    const noPending = await render(LoginPage, {
      data: { siteName: 'Test Site', error: NO_PENDING_REQUEST_ERROR, csrf: 'csrf-tok' },
      form: null,
    });
    expect(document.title).toBe('No pending sign-in · Cairn');
    expect(noPending.container.querySelector('[role="alert"]')).toHaveAttribute('tabindex', '-1');
    noPending.unmount();

    const expired = await render(LoginPage, {
      data: { siteName: 'Test Site', error: 'expired', csrf: 'csrf-tok' },
      form: null,
    });
    expect(document.title).toBe('Sign-in link expired · Cairn');
    expect(expired.container.querySelector('[role="alert"]')).toHaveAttribute('tabindex', '-1');
    expired.unmount();

    await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: null });
    expect(document.title).toBe('Sign in · Cairn');
  });

  it('shows a send-error warning and keeps the form available', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { status: 'send_error', sent: false } });
    await expect.element(screen.getByRole('alert')).toBeInTheDocument();
    await expect.element(screen.getByText(/trouble sending sign-in links/i)).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it('shows a throttled hint and keeps the form available', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { status: 'throttled', sent: false } });
    await expect.element(screen.getByText(/requested a link recently/i)).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it("shows the action's own error and keeps the form available on an unexpected send failure", async () => {
    // viewAction's generic fail(500) carries only { error }, no status, so an unexpected failure
    // must not read as the neutral no-op it previously silently was (the Task 12 review finding
    // this pins).
    const screen = await render(LoginPage, {
      data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' },
      form: { error: 'Something went wrong. Try again.' },
    });
    await expect.element(screen.getByRole('alert')).toBeInTheDocument();
    await expect.element(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it('lets an unexpected-failure error supersede a stale expired-link error', async () => {
    const screen = await render(LoginPage, {
      data: { siteName: 'Test Site', error: 'expired', csrf: 'csrf-tok' },
      form: { error: 'Something went wrong. Try again.' },
    });
    await expect.element(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.container.textContent).not.toMatch(/that link expired/i);
  });

  it('applies the SSR-resolved dark theme to its data-theme wrapper (the cookie carries no auth)', async () => {
    const screen = await render(LoginPage, {
      data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok', theme: 'cairn-admin-dark' },
      form: null,
    });
    expect(screen.container.querySelector('[data-theme="cairn-admin-dark"]')).toBeTruthy();
  });

  it('falls back to the light theme when no theme is given', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: null });
    expect(screen.container.querySelector('[data-theme="cairn-admin"]')).toBeTruthy();
  });
});
