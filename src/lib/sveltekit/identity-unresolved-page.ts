// The "the sign-in gate did not confirm who you are" page. The auth guard serves it when a
// site's identity resolver refuses the request or throws while resolving it, so cairn never
// learns who is asking. A sibling to https-required-page and csrf-required-page, built through
// the shared shell. See guard.ts.
import { escapeHtml } from '../escape.js';
import { renderStaticAdminPage } from './static-admin-page.js';

/**
 * Render the full HTML document for the identity-unresolved page.
 * @param label - The site's own name for its sign-in gate, escaped before interpolation.
 */
export function identityUnresolvedPage(label = "your organization's sign-in"): string {
  const inner = `
  <span class="eyebrow">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    Sign-in gate
  </span>
  <h1>This admin needs ${escapeHtml(label)}</h1>
  <p>This request did not carry a confirmed identity from the site's sign-in gate, so cairn could not start a session.</p>

  <div class="fix">
    <h2>If it keeps happening</h2>
    <p>Sign in through ${escapeHtml(label)} again. If it still fails, ask whoever runs this site to check the gate configuration.</p>
  </div>`;
  return renderStaticAdminPage({ title: 'Sign-in required · Cairn', innerHtml: inner });
}
