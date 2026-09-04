// cairn-audit's rendered runner: drive a real browser against a running admin, both themes always,
// and turn what rules find into the same AuditReport shape the static runner produces. This file
// holds `runRendered` itself, the loop over every configured page, both themes, and each needed
// interaction state, plus the redirect-trap refusal only that loop can raise. The rest of the
// rendered contract lives in ./rendered/: the rule model and the Playwright surface a rule reads
// from in types.ts, the BASE_URL and Playwright-presence checks in bootstrap.ts, the
// page+selector+reason allowlist with its staleness check in findings.ts, the interaction-state
// and color-probing surface a rule reads from in page-surface.ts, and in identity.ts the
// post-hydration page-identity guard that refuses a page whose settled DOM no longer matches what
// its server response carried, rather than silently measuring whatever it swapped into. What is
// re-exported below is only the subset an importer outside this file and ./rendered/ actually
// reaches through this path; everything else in ./rendered/ is imported directly by its own
// siblings and stays there.
//
// One rule the whole harness holds, load-bearing: it never starts a server. BASE_URL (default
// http://localhost:4173) has to already answer, or the run fails naming the URL it tried. The
// second standing rule, never importing Playwright at the top level, moved to bootstrap.ts with the
// loader it governs and is stated there.
import { renderedRules } from './rules/rendered/index.js';
import type { AuditConfig } from './config.js';
import type { AuditReport, Finding } from './types.js';
import {
  defaultIsReachable,
  defaultLoadPlaywright,
  loadPlaywrightModule,
  neededStates,
  resolveBaseUrl,
  resolveExtraCookies,
} from './rendered/bootstrap.js';
import {
  pageIdentityMismatchFinding,
  resolveRenderedFindings,
  stateUnreachableFinding,
  SURFACED_UNREACHED_STATES,
} from './rendered/findings.js';
import { capturePageIdentity, captureSsrIdentity, identitiesMatch, waitForHydrationSettle } from './rendered/identity.js';
import { applyState, ensurePageHelpers, probeSelectors } from './rendered/page-surface.js';
import type {
  InteractionState,
  PageIdentity,
  RenderedDeps,
  RenderedFinding,
  RenderedPageVisit,
  RenderedRule,
  ResolvedRenderedFinding,
  Theme,
} from './rendered/types.js';

export type {
  CairnAuditPageHelpers,
  InteractionState,
  PageIdentity,
  PlaywrightModule,
  RenderedBrowser,
  RenderedContext,
  RenderedDeps,
  RenderedFinding,
  RenderedPage,
  RenderedPageVisit,
  RenderedRule,
  RenderedRuleContext,
  ResolvedRenderedFinding,
  Theme,
} from './rendered/types.js';
export { resolveRenderedFindings } from './rendered/findings.js';
export { capturePageIdentity, waitForHydrationSettle } from './rendered/identity.js';
export { DEFAULT_BASE_URL, resolveBaseUrl, resolveExtraCookies } from './rendered/bootstrap.js';
export { applyState, ensurePageHelpers, resolveColors } from './rendered/page-surface.js';

/**
 * The login route every admin path redirects to when no session cookie is present. The
 * redirect-trap refusal (see {@link runRendered}) uses this to tell "genuinely audited a page"
 * from "silently measured the sign-in card instead."
 */
const LOGIN_PAGE_PATH = '/admin/login';

/** The cookie cairn's own admin reads to pick its SSR theme (`content-routes-shell.ts`). */
const THEME_COOKIE_VALUE: Record<Theme, 'cairn-admin' | 'cairn-admin-dark'> = {
  light: 'cairn-admin',
  dark: 'cairn-admin-dark',
};

/**
 * The refusal `runRendered` throws when every configured page besides {@link LOGIN_PAGE_PATH}
 * settled on the login page's own identity (rank-32(c): "a silent green the run should exit 2
 * on"). Without a session cookie, every authenticated admin route server-redirects to the sign-in
 * card, and the redirect happens before hydration, so the post-hydration page-identity guard sees
 * agreement (the SSR and hydrated captures both ARE the login page) and never fires: the run would
 * otherwise measure the same card once per configured page and report it clean.
 */
function redirectTrapRefusal(loginIdentity: PageIdentity): Error {
  const landmark = loginIdentity.landmark ? `, landmark ${loginIdentity.landmark}` : '';
  return new Error(
    `every configured page besides ${LOGIN_PAGE_PATH} settled on the login page's own identity ` +
      `(title "${loginIdentity.title}"${landmark}). Without a session cookie every admin route ` +
      `redirects to the sign-in card before the rules ever see it, so this run would have measured ` +
      `that card once per page while reporting zero errors: a silent green the run refuses instead ` +
      `of reporting. Set CAIRN_AUDIT_COOKIES to a valid session cookie (see the rendered-mode docs) ` +
      `and re-run.`
  );
}

/**
 * Run the rendered audit: every configured page, both themes, every interaction state the
 * registered rules declare. `rules` defaults to the shipped registry and is injectable the same way
 * `runStatic` injects its rule set; `deps` substitutes the BASE_URL and Playwright checks for a test.
 *
 * Throws rather than returning a clean report on every shape of silent-green this harness exists to
 * rule out: no rules registered, no pages configured, BASE_URL not answering, Playwright missing, or
 * any visited page rendering outside 2xx (which also catches a page path that names no real route,
 * since an unmatched SvelteKit route renders as a 404 response).
 */
export async function runRendered(
  config: AuditConfig,
  rules: RenderedRule[] = renderedRules(),
  deps: RenderedDeps = {}
): Promise<AuditReport> {
  if (rules.length === 0) {
    throw new Error('the rendered rule registry is empty; nothing would be checked. Pass a rule set to run.');
  }
  const pages = config.renderedPages;
  if (pages.length === 0) {
    throw new Error(
      'the rendered page list is empty; name pages in rendered.pages, or rely on the default core admin routes.'
    );
  }

  const extraCookies = resolveExtraCookies(process.env.CAIRN_AUDIT_COOKIES);
  const baseUrl = await resolveBaseUrl(deps.isReachable ?? defaultIsReachable);
  const { chromium } = await loadPlaywrightModule(deps.loadPlaywright ?? defaultLoadPlaywright);
  const states = neededStates(rules);
  const themes: Theme[] = ['light', 'dark'];

  const visits: RenderedPageVisit[] = pages.map((page) => ({
    page,
    selectorsSeen: new Set<string>(),
    statesUnreached: new Set<InteractionState>(),
  }));
  const raw: ResolvedRenderedFinding[] = [];
  const identityFindings: Finding[] = [];
  // What each configured page's SSR response actually served, by theme, feeding the
  // redirect-trap refusal below. Populated regardless of whether the page-identity guard later
  // refuses the page, since that guard compares SSR against hydrated and stays content when a
  // redirect lands both sides on the same (wrong) page.
  const settledIdentities = new Map<string, PageIdentity[]>();

  const browser = await chromium.launch();
  try {
    for (const pagePath of pages) {
      const visit = visits.find((candidate) => candidate.page === pagePath);
      const relevantAllowlist = config.renderedAllowlist.filter((entry) => entry.page === pagePath);
      for (const theme of themes) {
        const cookies = [
          { name: 'cairn-admin-theme', value: THEME_COOKIE_VALUE[theme], url: baseUrl },
          ...extraCookies.map((cookie) => ({ ...cookie, url: baseUrl })),
        ];
        const ssrIdentity = await captureSsrIdentity(browser, theme, baseUrl, pagePath, cookies);
        const perPageIdentities = settledIdentities.get(pagePath) ?? [];
        perPageIdentities.push(ssrIdentity);
        settledIdentities.set(pagePath, perPageIdentities);
        const context = await browser.newContext({ colorScheme: theme });
        await context.addCookies(cookies);
        // The settled identity that disagreed with `ssrIdentity`, null while the guard is content.
        // Held rather than reported inline so the finding is raised after the context closes.
        let mismatchedIdentity: PageIdentity | null = null;
        try {
          for (const state of states) {
            const page = await context.newPage();
            try {
              const response = await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'load', timeout: 45_000 });
              const status = response?.status();
              if (status === undefined || status < 200 || status >= 300) {
                throw new Error(
                  `${pagePath}: rendered ${status ?? 'no response'} (expected 2xx) under ${theme}, ` +
                    `state=${state}. A non-2xx response also covers a configured page that names no real route.`
                );
              }
              const reached = await applyState(state, page);
              if (!reached) {
                // Recorded, never swallowed: the rules that read only this state did not run here,
                // so this page's findings are a subset and the allowlist's dead verdict has to know
                // it before accusing a live entry.
                visit?.statesUnreached?.add(state);
                continue;
              }
              await ensurePageHelpers(page);

              if (state === 'rest') {
                // The page-identity guard checks once per (page, theme), on the state every page
                // reaches: a settle window, then a re-capture compared against the SSR baseline. A
                // mismatch means this page hydrated into chrome that is not the route it was asked
                // for, so no rule below this point may run against it.
                await page.evaluate(waitForHydrationSettle);
                const hydratedIdentity = await page.evaluate(capturePageIdentity);
                if (!identitiesMatch(ssrIdentity, hydratedIdentity)) {
                  mismatchedIdentity = hydratedIdentity;
                  break;
                }
              }

              if (relevantAllowlist.length > 0 && visit) {
                const present = await page.evaluate(probeSelectors, relevantAllowlist.map((entry) => entry.selector));
                visit.selectorsUnprobeable ??= new Set<string>();
                relevantAllowlist.forEach((entry, index) => {
                  if (present[index] === 'matched') visit.selectorsSeen.add(entry.selector);
                  else if (present[index] === 'unprobeable') visit.selectorsUnprobeable?.add(entry.selector);
                });
              }

              for (const rule of rules) {
                if (!(rule.states ?? ['rest']).includes(state)) continue;
                // A rule that throws reports at its OWN tier rather than aborting the run with exit
                // 2. An advisory rule taking the whole process down on a substrate condition (a
                // pruned manifest in a consumer install) is the leak this pass's exit criterion
                // forbids, and an error-tier rule still gates through the finding it raises here.
                let found: RenderedFinding[];
                try {
                  found = await rule.check({ page, pagePath, theme, state, config });
                } catch (err) {
                  found = [
                    {
                      ruleId: rule.id,
                      tier: rule.tier,
                      selector: 'html',
                      message: `the rule threw while checking this page: ${err instanceof Error ? err.message : String(err)}`,
                    },
                  ];
                }
                for (const f of found) raw.push({ ...f, page: pagePath, theme, state });
              }
            } finally {
              await page.close();
            }
          }
        } finally {
          await context.close();
        }
        if (mismatchedIdentity) {
          identityFindings.push(pageIdentityMismatchFinding(pagePath, theme, ssrIdentity, mismatchedIdentity));
          // A page the guard refused was never actually probed, so its allowlist entries cannot be
          // told stale from dead: {@link identityRefusedFinding} withholds that verdict instead of
          // accusing a live entry of staleness on a run that never really looked.
          if (visit) visit.identityRefused = true;
        }
      }
      // Surfaced once per page, after both themes ran, rather than once per theme: the state is
      // either reachable on this page's markup or it isn't, and a reader wants one line, not a
      // duplicate per theme.
      for (const state of visit?.statesUnreached ?? []) {
        if (SURFACED_UNREACHED_STATES.has(state)) identityFindings.push(stateUnreachableFinding(pagePath, state));
      }
    }
  } finally {
    await browser.close();
  }

  // The redirect-trap refusal (rank-32(c)): only meaningful when the login page is itself one of
  // the configured pages, since that is the only way this run has a ground-truth login identity
  // to compare the rest against, and only when at least one OTHER page is configured, since a run
  // auditing the login page alone trivially "settles on login" without being a trap at all.
  const loginIdentities = settledIdentities.get(LOGIN_PAGE_PATH);
  if (loginIdentities && loginIdentities.length > 0) {
    const [loginIdentity] = loginIdentities;
    const otherPages = pages.filter((page) => page !== LOGIN_PAGE_PATH);
    const allSettledOnLogin =
      otherPages.length > 0 &&
      otherPages.every((page) =>
        (settledIdentities.get(page) ?? []).every((identity) => identitiesMatch(identity, loginIdentity))
      );
    if (allSettledOnLogin) throw redirectTrapRefusal(loginIdentity);
  }

  const { findings, suppressed } = resolveRenderedFindings(
    raw,
    visits,
    config.renderedAllowlist,
    new Map(rules.map((rule) => [rule.id, rule.tier]))
  );
  const byPosition = (a: Finding, b: Finding) => (a.file === b.file ? 0 : a.file.localeCompare(b.file));
  return {
    findings: [...findings, ...identityFindings].sort(byPosition),
    suppressed: [...suppressed].sort(byPosition),
    // Pages, not files: rendered mode reuses the static runner's AuditReport shape (so the bin's
    // report formatter and exit-code logic stay agnostic between the two modes) rather than
    // inventing a second report type for one renamed field.
    filesScanned: pages.length,
    ruleIds: rules.map((rule) => rule.id),
  };
}
