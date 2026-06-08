// The "this admin needs HTTPS" page. The auth guard serves it when a request reaches a deployed
// Worker over http, which is the one case that makes the magic-link sign-in fail: the JS-free login
// form posts over http, and the framework's CSRF guard rejects a form POST whose origin scheme does
// not match, so the editor would otherwise hit an opaque 403. This page names the problem, says why
// https is needed, and gives the exact Cloudflare fix. The shared shell lives in
// static-admin-page.ts. See guard.ts.
import { escapeHtml, renderStaticAdminPage } from './static-admin-page.js';

/**
 * Render the full HTML document for the HTTPS-required page.
 * @param httpsUrl The same request rebuilt over https, offered as the one-click recovery link.
 */
export function httpsRequiredPage(httpsUrl: string): string {
  const href = escapeHtml(httpsUrl);
  const inner = `
  <span class="eyebrow">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    Secure connection required
  </span>
  <h1>This admin needs a secure connection</h1>
  <p>You opened this page over http. Sign-in only works over https, so open the secure version to continue.</p>

  <a class="cta" href="${href}">
    Open over HTTPS
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  </a>

  <div class="fix">
    <h2>If you run this site</h2>
    <p>Turn on Always Use HTTPS in Cloudflare. It upgrades every request to https before it reaches the site:</p>
    <span class="path">SSL/TLS<span class="arrow">&rsaquo;</span>Edge Certificates<span class="arrow">&rsaquo;</span>Always Use HTTPS</span>
    <p>Keep HSTS on too. The browser then stays on https and sign-in works.</p>
  </div>
`;
  return renderStaticAdminPage({ title: 'HTTPS required · Cairn', innerHtml: inner });
}
