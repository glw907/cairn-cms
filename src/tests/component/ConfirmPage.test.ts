import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ConfirmPage from '../../lib/admin/ConfirmPage.svelte';
import { SIGN_IN_LINK_FAILED, SIGN_IN_LINK_TITLE } from '../../lib/admin/sign-in-copy.js';
import { NO_PENDING_REQUEST_ERROR } from '../../lib/sveltekit/auth-error-codes.js';

describe('ConfirmPage', () => {
  it('emits exactly one strict-origin referrer meta in the head, so a site mounting it in its own shell still gets it', async () => {
    await render(ConfirmPage, { data: { token: 'tok123', siteName: 'Test Site', error: null, csrf: 'csrf-tok' } });
    const metas = document.head.querySelectorAll('meta[name="referrer"]');
    expect(metas).toHaveLength(1);
    expect(metas[0]).toHaveAttribute('content', 'strict-origin');
  });

  it('renders a POST confirm form carrying the token and a CSRF field', async () => {
    const screen = await render(ConfirmPage, { data: { token: 'tok123', siteName: 'Test Site', error: null, csrf: 'csrf-tok' } });
    await expect.element(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(document.querySelector('input[name="token"]')).toHaveValue('tok123');
    expect(screen.container.querySelector('form input[name="csrf"]')).toHaveValue('csrf-tok');
  });

  it('shows the one sign-in sentence and title when no token arrives, in a focusable alert', async () => {
    const screen = await render(ConfirmPage, { data: { token: '', siteName: 'Test Site', error: 'expired', csrf: 'csrf-tok' } });
    expect(document.title).toBe(SIGN_IN_LINK_TITLE);
    await expect.element(screen.getByRole('heading', { name: 'This link didn’t work' })).toBeInTheDocument();
    const alert = screen.container.querySelector('[role="alert"]');
    expect(alert?.textContent?.trim()).toBe(SIGN_IN_LINK_FAILED);
    expect(alert).toHaveAttribute('tabindex', '-1');
    await expect.element(screen.getByRole('link', { name: 'Request a new link' })).toBeInTheDocument();
  });

  it('reads the same for the no-pending-request code, which no longer has its own branch', async () => {
    const screen = await render(ConfirmPage, {
      data: { token: 'tok123', siteName: 'Test Site', error: NO_PENDING_REQUEST_ERROR, csrf: 'csrf-tok' },
    });
    expect(document.title).toBe(SIGN_IN_LINK_TITLE);
    expect(screen.container.querySelector('[role="alert"]')?.textContent?.trim()).toBe(SIGN_IN_LINK_FAILED);
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
    expect(screen.container.querySelector('[role="alert"]')).toHaveAttribute('tabindex', '-1');
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
