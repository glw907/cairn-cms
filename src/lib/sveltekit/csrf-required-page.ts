// The branded 403 the guard serves when an admin form POST fails the double-submit token check.
// A sibling to https-required-page, built through the shared shell. It names the likely cause and
// offers a fresh sign-in, and it does not mention Origin headers (the token path does not read them).
import { renderStaticAdminPage } from './static-admin-page.js';

/** Render the full HTML document for the CSRF-failed page. */
export function csrfRequiredPage(): string {
  const inner = `
  <span class="eyebrow">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    Security check
  </span>
  <h1>Let's try that again</h1>
  <p>Your sign-in form could not be verified. This usually means the page was open across a browser restart, or cookies are blocked for this site.</p>

  <a class="cta" href="/admin/login">
    Back to sign-in
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  </a>

  <div class="fix">
    <h2>If it keeps happening</h2>
    <p>Allow cookies for this site, then open the sign-in page fresh and request a new link.</p>
  </div>`;
  return renderStaticAdminPage({ title: 'Security check · Cairn', innerHtml: inner });
}
