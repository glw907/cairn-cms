import type { Locator, Page, Response } from '@playwright/test';

const PORT = process.env.E2E_PORT ?? '4173';

/** The two names the e2e host answers on; the same server is a different origin under each. */
export const ORIGINS = {
  named: `http://localhost:${PORT}`,
  loopback: `http://127.0.0.1:${PORT}`,
} as const;

/** The exact body SvelteKit's own Origin check answers with. */
export const KIT_CROSS_SITE_BODY = 'Cross-site POST form submissions are forbidden';

/** A fragment of the auth channel's own origin refusal, which a cairn-served 403 would carry. */
export const FACTORY_ORIGIN_FRAGMENT = 'origin mismatch';

/** Matches the referrer meta every cairn admin view emits, whatever its attribute spacing. */
const CAIRN_REFERRER_META = /<meta\s+name="referrer"\s+content="strict-origin"\s*\/?>/g;

/**
 * Submit a form the way a browser does with JavaScript out of the picture: a native navigation
 * POST, never a handler's fetch. `action` retargets the form first, which is how a page loaded
 * from one origin posts to another. Resolves with the POST's own response, so a caller can read
 * the status and body of a refusal the browser then renders.
 */
export async function submitNatively(
  page: Page,
  form: Locator,
  action?: string,
): Promise<Response> {
  const posted = page.waitForResponse((response) => response.request().method() === 'POST');
  await form.evaluate((el, target) => {
    const formEl = el as HTMLFormElement;
    if (target) formEl.setAttribute('action', target);
    formEl.submit();
  }, action);
  return posted;
}

/** What {@link rewriteAdminDocument} observed, filled in once the document has been served. */
export interface RewriteCounts {
  /** Cairn referrer metas in the document as the server sent it. */
  before: number;
  /** Cairn referrer metas left after the rewrite. */
  after: number;
}

/**
 * Serve the document at `path` as a site that sets `no-referrer` everywhere would: the response
 * header, and a `no-referrer` meta ahead of everything else in the head. With `stripCairnMeta`
 * the document also loses every cairn referrer meta, which is the page a tab loaded before cairn
 * emitted them would be. Only GETs are rewritten, so a form POST reaches the real server.
 */
export async function rewriteAdminDocument(
  page: Page,
  path: string,
  options: { stripCairnMeta: boolean },
): Promise<RewriteCounts> {
  const counts: RewriteCounts = { before: -1, after: -1 };
  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    let body = await response.text();
    counts.before = (body.match(CAIRN_REFERRER_META) ?? []).length;
    if (options.stripCairnMeta) body = body.replace(CAIRN_REFERRER_META, '');
    counts.after = (body.match(CAIRN_REFERRER_META) ?? []).length;
    body = body.replace('<head>', '<head><meta name="referrer" content="no-referrer">');
    const headers = { ...response.headers(), 'referrer-policy': 'no-referrer' };
    delete headers['content-encoding'];
    delete headers['content-length'];
    await route.fulfill({ response, body, headers });
  });
  return counts;
}
