import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LoginPage from '../../lib/admin/LoginPage.svelte';
import { SIGN_IN_LINK_FAILED, SIGN_IN_LINK_TITLE } from '../../lib/admin/sign-in-copy.js';
import { NO_PENDING_REQUEST_ERROR } from '../../lib/sveltekit/auth-error-codes.js';

describe('LoginPage', () => {
  it('emits exactly one strict-origin referrer meta in the head, so a site mounting it in its own shell still gets it', async () => {
    await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: null });
    const metas = document.head.querySelectorAll('meta[name="referrer"]');
    expect(metas).toHaveLength(1);
    expect(metas[0]).toHaveAttribute('content', 'strict-origin');
  });

  it('renders an email form posting to the request action with a CSRF field', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: null });
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /send|sign in/i })).toBeInTheDocument();
    expect(screen.container.querySelector('form input[name="csrf"]')).toHaveValue('csrf-tok');
  });

  it('shows a neutral success message after a request', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { outcome: 'sent' } });
    await expect.element(screen.getByText(/check your email/i)).toBeInTheDocument();
  });

  it('carries no role="status" on the confirmation block, since it never observes its own first content', async () => {
    // The block mounts fresh on the branch switch to "sent", so a live region on it would never
    // announce; the "Check your email" heading carries the announcement instead.
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { outcome: 'sent' } });
    expect(screen.container.querySelector('[role="status"]')).toBeNull();
  });

  it('guides an editor whose link never arrives without leaking allowlist membership', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { outcome: 'sent' } });
    await expect.element(screen.getByText(/check your spam folder/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/match the one your site owner added/i)).toBeInTheDocument();
  });

  it('returns to the email form when a mistyped address is corrected', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { outcome: 'sent' } });
    await screen.getByRole('button', { name: /use a different email/i }).click();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it('dismisses the confirmation panel for the full engine result shape', async () => {
    // Pins the dismissed-banner branch (form?.outcome === 'sent' && !dismissed);
    // see src/tests/unit/peer-deps.test.ts for the correctness floor this shape guards.
    const screen = await render(LoginPage, {
      data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' },
      form: { outcome: 'sent' },
    });
    await expect.element(screen.getByText(/check your email/i)).toBeInTheDocument();
    await screen.getByRole('button', { name: /use a different email/i }).click();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.container.textContent ?? '').not.toMatch(/check your email/i);
  });

  it('shows the success panel for the engine result shape', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { outcome: 'sent' } });
    await expect.element(screen.getByText(/check your email/i)).toBeInTheDocument();
  });

  it('keeps the email form for a result that carries only a sent flag, since outcome is the one discriminant', async () => {
    const screen = await render(LoginPage, {
      data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' },
      form: { sent: true } as { error?: string },
    });
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.container.textContent ?? '').not.toMatch(/check your email/i);
  });

  it('lets a fresh action result supersede a stale expired-link error', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: 'expired', csrf: 'csrf-tok' }, form: { outcome: 'throttled' } });
    await expect.element(screen.getByText(/requested a link recently/i)).toBeInTheDocument();
    expect(screen.container.textContent).not.toMatch(/didn’t work/i);
  });

  it('renders one sentence and one title for both link-refusal codes', async () => {
    // The engine cannot tell the two causes apart for the reader, so both codes read the same.
    // The title is what a screen reader announces first on a JS-free landing, and tabindex="-1"
    // lets an assistive technology move straight to the refusal.
    for (const error of [NO_PENDING_REQUEST_ERROR, 'expired']) {
      const screen = await render(LoginPage, { data: { siteName: 'Test Site', error, csrf: 'csrf-tok' }, form: null });
      expect(document.title).toBe(SIGN_IN_LINK_TITLE);
      const alert = screen.container.querySelector('[role="alert"]');
      expect(alert?.textContent?.trim()).toBe(SIGN_IN_LINK_FAILED);
      expect(alert).toHaveAttribute('tabindex', '-1');
      await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      screen.unmount();
    }
    await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: null });
    expect(document.title).toBe('Sign in · Cairn');
  });

  it('shows a send-error warning and keeps the form available', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { outcome: 'send-error' } });
    await expect.element(screen.getByRole('alert')).toBeInTheDocument();
    await expect.element(screen.getByText(/trouble sending sign-in links/i)).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it('makes every message panel a focus target, not only the link-error pair', async () => {
    // The component's own comment claims the attribute is on every panel without exception, so
    // the action-result panels are pinned here alongside the load-time ones the landing-signal
    // case covers. A partial application is what this replaced.
    for (const form of [
      { outcome: 'send-error' as const },
      { outcome: 'throttled' as const },
      { error: 'Something went wrong.' },
    ]) {
      const screen = await render(LoginPage, {
        data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' },
        form,
      });
      const panel = screen.container.querySelector('[role="alert"], [role="status"]');
      expect(panel, JSON.stringify(form)).toHaveAttribute('tabindex', '-1');
      screen.unmount();
    }
  });

  it('shows a throttled hint and keeps the form available', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { outcome: 'throttled' } });
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
    expect(screen.container.textContent).not.toMatch(/didn’t work/i);
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

  it('names the email input from its visible label, with no redundant aria-label', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: null });
    const input = screen.container.querySelector('input[name="email"]');
    expect(input).not.toHaveAttribute('aria-label');
    await expect.element(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  it('paints the confirmation mark with the on-surface success ink token', async () => {
    const screen = await render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { outcome: 'sent' } });
    const mark = screen.container.querySelector('.rounded-field');
    expect(mark).toHaveClass('cairn-text-success');
  });

  it('renders the identity hand-off page with a brand, a heading, the marker, a link to /admin, and no form', async () => {
    const screen = await render(LoginPage, { data: { identity: { label: 'Acme SSO' } }, form: null });
    await expect
      .element(screen.getByRole('heading', { name: /sign in through acme sso/i }))
      .toBeInTheDocument();
    await expect.element(screen.getByText('Cairn', { exact: true })).toBeInTheDocument();
    const marker = screen.container.querySelector('[data-cairn-identity]');
    expect(marker).toBeTruthy();
    expect(marker?.textContent).toContain('Acme SSO');
    expect(screen.container.querySelector('form')).toBeNull();
    await expect.element(screen.getByRole('link', { name: /admin/i })).toHaveAttribute('href', '/admin');
  });
});
