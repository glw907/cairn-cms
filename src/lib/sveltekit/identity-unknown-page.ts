// The "you're not on this site's editor roster" page. The auth guard serves it when a site's
// identity gate confirms who is asking, but the confirmed email matches no row in cairn's
// editor allowlist. A sibling to https-required-page and csrf-required-page, built through the
// shared shell. See guard.ts.
import { escapeHtml } from '../escape.js';
import { renderStaticAdminPage } from './static-admin-page.js';

/**
 * Render the full HTML document for the unrostered-identity page.
 * @param email - The confirmed, normalized email, capped at 320 characters before this call and
 *  escaped before interpolation.
 * @param label - The site's own name for its sign-in gate, escaped before interpolation.
 */
export function identityUnknownPage(email: string, label = "your organization's sign-in"): string {
  const inner = `
  <span class="eyebrow">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    Not on the roster
  </span>
  <h1>You're not on this site's editor roster</h1>
  <p>${escapeHtml(label)} confirmed you as <strong>${escapeHtml(email)}</strong>, but that address is not in cairn's editor roster, so you cannot sign in to the admin.</p>

  <div class="fix">
    <h2>If you should have access</h2>
    <p>Ask an owner to add your email to the roster through Manage editors.</p>
  </div>`;
  return renderStaticAdminPage({ title: "You're not on the roster · Cairn", innerHtml: inner });
}
