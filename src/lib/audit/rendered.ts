// cairn-audit's rendered runner: drive a real browser against a running admin, both themes always,
// and turn what rules find into the same AuditReport shape the static runner produces. This module
// owns the whole rendered contract, since it is the one file the harness is scoped to: the rule
// model, the Playwright surface a rule reads from, the BASE_URL and Playwright-presence checks, the
// interaction-state seam, the page+selector+reason allowlist with its staleness check, and the
// post-hydration page-identity guard that refuses a page whose settled DOM no longer matches what
// its server response carried, rather than silently measuring whatever it swapped into.
//
// Two things this module NEVER does, both load-bearing. It never starts a server: BASE_URL (default
// http://localhost:4173) has to already answer, or the run fails naming the URL it tried. And it
// never imports Playwright at the top level: `import('playwright')` is dynamic and resolves from
// wherever this file executes, which is cairn's own devDependency during cairn's own tests but a
// CONSUMER's install once this ships in dist and a site's own audit run imports it. That is the
// deliberate difference from scripts/lab/generate-norms-manifest.mjs, which imports the ROOT
// `playwright` because it is cairn's own build tool pinned by cairn's own lockfile; do not
// "harmonize" the two import styles, they serve different trees on purpose.
import { renderedRules } from './rules/rendered/index.js';
import type { PaintLayer, Rgba } from './color.js';
import type { AuditConfig } from './config.js';
import type { AuditReport, Finding } from './types.js';
import {
  pageIdentityMismatchFinding,
  resolveRenderedFindings,
  stateUnreachableFinding,
  SURFACED_UNREACHED_STATES,
} from './rendered/findings.js';
import { capturePageIdentity, captureSsrIdentity, identitiesMatch, waitForHydrationSettle } from './rendered/identity.js';
import type {
  InteractionState,
  PageIdentity,
  PlaywrightModule,
  RenderedDeps,
  RenderedFinding,
  RenderedPage,
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
export {
  deadFinding,
  identityRefusedFinding,
  pageIdentityMismatchFinding,
  positionless,
  resolveRenderedFindings,
  staleFinding,
  stateUnreachableFinding,
  SURFACED_UNREACHED_STATES,
  toFinding,
  unprobeableFinding,
  unreachedStateFinding,
} from './rendered/findings.js';
export { capturePageIdentity, captureSsrIdentity, identitiesMatch, waitForHydrationSettle } from './rendered/identity.js';

/**
 * The login route every admin path redirects to when no session cookie is present. The
 * redirect-trap refusal (see {@link runRendered}) uses this to tell "genuinely audited a page"
 * from "silently measured the sign-in card instead."
 */
const LOGIN_PAGE_PATH = '/admin/login';

/** The cookie cairn's own admin reads to pick its SSR theme (`content-routes-core.ts`). */
const THEME_COOKIE_VALUE: Record<Theme, 'cairn-admin' | 'cairn-admin-dark'> = {
  light: 'cairn-admin',
  dark: 'cairn-admin-dark',
};

/** The preview server address a rendered run targets absent `BASE_URL`. */
export const DEFAULT_BASE_URL = 'http://localhost:4173';

async function defaultIsReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * The BASE_URL a rendered run targets. The harness never starts a server, so this only checks that
 * one is already answering; a caller supplies `isReachable` to test the failure without a network
 * call.
 */
export async function resolveBaseUrl(isReachable: (url: string) => Promise<boolean> = defaultIsReachable): Promise<string> {
  const baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;
  if (!(await isReachable(baseUrl))) {
    throw new Error(
      `no server answering at ${baseUrl}. The rendered audit never starts one: start the site's dev or ` +
        `preview server (set BASE_URL first if it is not at the default), then re-run.`
    );
  }
  return baseUrl;
}

/**
 * Parse `CAIRN_AUDIT_COOKIES` into the extra cookies a rendered run's browser context carries
 * alongside the theme cookie. The syntax is a Cookie header's: `name=value` entries separated by
 * `;`, each entry trimmed and split on its first `=`, so a value may itself contain one. An unset
 * or all-whitespace value configures none.
 *
 * A malformed entry throws rather than being skipped, holding `loadConfig`'s rule that a typo never
 * degrades into a silently narrower audit: a session cookie that quietly failed to parse would
 * produce a whole run of login-redirect failures blamed on the admin rather than on the env var. An
 * entry naming `cairn-admin-theme` is refused outright, since `runRendered` owns that cookie per
 * theme context.
 */
export function resolveExtraCookies(raw: string | undefined): { name: string; value: string }[] {
  if (raw === undefined || raw.trim() === '') return [];
  return raw.split(';').map((rawEntry) => {
    const entry = rawEntry.trim();
    const eq = entry.indexOf('=');
    if (eq === -1) {
      throw new Error(`CAIRN_AUDIT_COOKIES: malformed entry "${entry}", expected name=value.`);
    }
    const name = entry.slice(0, eq).trim();
    const value = entry.slice(eq + 1);
    if (name === '') {
      throw new Error(`CAIRN_AUDIT_COOKIES: malformed entry "${entry}", the cookie name is empty.`);
    }
    if (name === 'cairn-admin-theme') {
      throw new Error(
        'CAIRN_AUDIT_COOKIES: cannot set "cairn-admin-theme"; the rendered run owns that cookie per ' +
          'browser context (one context per theme), and a caller override would silently invalidate ' +
          'the per-theme measurement.'
      );
    }
    return { name, value };
  });
}

async function defaultLoadPlaywright(): Promise<PlaywrightModule> {
  return (await import('playwright')) as unknown as PlaywrightModule;
}

/**
 * Load Playwright through `loader` (the real dynamic import by default, an injected one for a
 * test), turning any failure into the one-line install instruction. Wrapping happens here, once,
 * rather than inside `defaultLoadPlaywright`, so an injected loader's failure reads the same way a
 * real absent install would.
 */
async function loadPlaywrightModule(loader: () => Promise<PlaywrightModule>): Promise<PlaywrightModule> {
  try {
    return await loader();
  } catch {
    throw new Error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  }
}

/**
 * The interaction states every registered rule actually needs, `'rest'` always included since every
 * page is visited at rest regardless (rules aside, the allowlist staleness check needs it too).
 */
function neededStates(rules: RenderedRule[]): InteractionState[] {
  const states = new Set<InteractionState>(['rest']);
  for (const rule of rules) for (const state of rule.states ?? ['rest']) states.add(state);
  return [...states];
}

/**
 * Put `page` into `state`. Returns whether the state was reached: `rest` always is, `focus-visible`
 * always is (a real Tab keypress), `menu-open` is not on a page that carries no conventional menu
 * trigger, and `row-expanded` is not on a page that carries no `ExpandableRow`. Neither is an error,
 * just a state that page's rules skip.
 */
export async function applyState(state: InteractionState, page: RenderedPage): Promise<boolean> {
  if (state === 'rest') return true;
  if (state === 'focus-visible') {
    await page.keyboard.press('Tab');
    return true;
  }
  if (state === 'row-expanded') {
    // The precedent menu-open sets: click the first live trigger and report whether one existed.
    // ExpandableRow's own summary `<tr>` carries the click handler (its own header comment), a
    // trailing `aria-expanded` button inside it doing the same toggle; clicking the row itself is
    // the simpler, single selector to drive.
    return page.evaluate(() => {
      const row = Array.from(document.querySelectorAll<HTMLElement>('.toolkit-expandable-row-summary')).find(
        (el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        }
      );
      if (!row) return false;
      row.click();
      return true;
    });
  }
  // Refined at Task 15 against the admin's real markup, resolving Task 14's WATCH. Every dialog
  // trigger in the admin (the entry, link, fragment, media, and reference pickers, the rename and
  // web-link dialogs) declares `aria-haspopup="dialog"`, which the original menu-only selector
  // could not reach, so the whole dialog surface was structurally outside every rendered rule while
  // the run reported those pages clean. The state still means "the conventional popup trigger is
  // open"; what widened is which triggers count as conventional.
  return page.evaluate(() => {
    const triggers = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[aria-haspopup="menu"], [aria-haspopup="dialog"], [aria-haspopup="listbox"], [aria-haspopup="true"]'
      )
    ).filter((el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    if (triggers.length === 0) return false;
    triggers[0].click();
    return true;
  });
}

/**
 * Normalize CSS color strings to sRGB by asking the browser to paint them, rather than parsing
 * color syntax in Node.
 *
 * Every rendered rule that compares two colors reads them off `getComputedStyle`, and Chromium
 * serializes a computed color in the AUTHOR's color space: cairn's admin palette is oklch, and
 * Tailwind's opacity modifier compiles to `color-mix(in oklab, ...)`, so a computed background
 * arrives as `oklch(0.965 0.006 75)` or `oklab(0.26 0.0036 0.0135 / 0.08)`. Three rules shipped
 * with an `rgb()`-only regex, and an adversarial pass demonstrated all three reporting clean
 * against the shipped admin because every candidate failed to parse and was skipped. Painting the
 * string onto a canvas hands the question to the one component that cannot be wrong about it.
 *
 * The alpha channel is recovered exactly rather than read back premultiplied: each color is
 * painted twice, over opaque white and over opaque black, and the distance between the two results
 * is `255 * (1 - alpha)` on every channel. A string the browser refuses resolves to `null`, which a
 * caller reports rather than treats as a pass.
 */
export async function resolveColors(page: RenderedPage, colors: string[]): Promise<(Rgba | null)[]> {
  if (colors.length === 0) return [];
  const unique = [...new Set(colors)];
  const resolved = await page.evaluate(resolveColorsInPage, unique);
  const byInput = new Map(unique.map((color, index) => [color, resolved[index]]));
  return colors.map((color) => {
    const entry = byInput.get(color);
    return entry ? { r: entry[0], g: entry[1], b: entry[2], a: entry[3] } : null;
  });
}

/**
 * Runs inside the page. Playwright serializes this by source, so it stays self-contained: no
 * references outside its own body, the same discipline `probeSelectors` follows.
 */
function resolveColorsInPage(colors: string[]): ([number, number, number, number] | null)[] {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return colors.map(() => null);

  // Bound after the null check rather than declared as a hoisted `function`, so the narrowing on
  // `context` reaches inside it and no second alias binding is needed to carry it.
  const paintOver = (backdrop: string, color: string): number[] => {
    context.globalCompositeOperation = 'copy';
    context.fillStyle = backdrop;
    context.fillRect(0, 0, 1, 1);
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data);
  };

  return colors.map((raw) => {
    if (!raw) return null;
    // An invalid value leaves `fillStyle` at whatever it already held, so two different sentinels
    // separate "the browser refused this string" from "this string really is black or white".
    context.fillStyle = '#000000';
    context.fillStyle = raw;
    const asBlack = context.fillStyle;
    context.fillStyle = '#ffffff';
    context.fillStyle = raw;
    const asWhite = context.fillStyle;
    if (asBlack === '#000000' && asWhite === '#ffffff') return null;

    const overWhite = paintOver('#ffffff', raw);
    const overBlack = paintOver('#000000', raw);
    let alpha = 0;
    for (let i = 0; i < 3; i += 1) alpha += 1 - (overWhite[i] - overBlack[i]) / 255;
    alpha = Math.min(1, Math.max(0, alpha / 3));
    if (alpha <= 0) return [0, 0, 0, 0];
    const channel = (value: number) => Math.min(255, Math.max(0, value / alpha));
    return [channel(overBlack[0]), channel(overBlack[1]), channel(overBlack[2]), alpha];
  });
}

/**
 * Whether each of `selectors` matches, misses, or cannot be parsed on the current page. Playwright
 * serializes this into the page, so it stays self-contained: no references outside its own body.
 *
 * The third verdict is the point. Folding "the browser refused this string" into "nothing matched"
 * is what let a rendered allowlist entry mint a gating staleness finding for a selector that was
 * never checkable in the first place.
 */
function probeSelectors(selectors: string[]): ('matched' | 'absent' | 'unprobeable')[] {
  return selectors.map((selector) => {
    try {
      return document.querySelectorAll(selector).length > 0 ? 'matched' : 'absent';
    } catch {
      return 'unprobeable';
    }
  });
}

/**
 * Runs inside the page, installing {@link CairnAuditPageHelpers} on `window` once. Playwright
 * serializes this by source, so every helper is declared inside this function's own body.
 */
function installPageHelpers(): void {
  if (globalThis.__cairnAudit) return;

  function escapeIdentifier(value: string): string {
    return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value;
  }

  function signature(el: Element): string {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${escapeIdentifier(el.id)}` : '';
    const classes = Array.from(el.classList)
      .slice(0, 4)
      .map((name) => `.${escapeIdentifier(name)}`)
      .join('');
    return `${tag}${id}${classes}`;
  }

  function isScreenReaderOnly(el: Element): boolean {
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const tiny = rect.width <= 1.5 && rect.height <= 1.5;
      if (!tiny) continue;
      // The visually-hidden recipe in every form the ecosystem ships it: Tailwind's `sr-only`
      // clips a 1px absolutely-positioned box, and the older `clip-path: inset(50%)` variant
      // collapses it the same way. Either one, on a 1px box, means "read aloud, never painted".
      const clipped =
        style.clip === 'rect(0px, 0px, 0px, 0px)' ||
        style.clipPath.startsWith('inset(50%') ||
        (style.overflow === 'hidden' && (style.position === 'absolute' || style.position === 'fixed'));
      if (clipped) return true;
    }
    return false;
  }

  function isVisible(el: Element): boolean {
    let cumulativeOpacity = 1;
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
      if (style.contentVisibility === 'hidden') return false;
      const opacity = Number(style.opacity);
      cumulativeOpacity *= Number.isFinite(opacity) ? opacity : 1;
      if (cumulativeOpacity <= 0) return false;
    }
    if (isScreenReaderOnly(el)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return true;
    // A `display: contents` box and a bare inline both report a zero own-rect while their text
    // paints normally, so the fallback measures the content itself rather than the element's box.
    const range = document.createRange();
    range.selectNodeContents(el);
    const contents = range.getBoundingClientRect();
    range.detach();
    return contents.width > 0 && contents.height > 0;
  }

  function paintLayers(el: Element): PaintLayer[] {
    const layers: PaintLayer[] = [];
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      layers.push({
        backgroundColor: style.backgroundColor,
        opacity: Number(style.opacity),
        hasImage: style.backgroundImage !== 'none',
      });
    }
    return layers;
  }

  function canvasColor(): string {
    // CSS propagates the root element's background to the canvas, and `<body>`'s when the root
    // declares none. That is not a detail: a hit test just outside an element whose top margin
    // collapsed out of `<body>` returns the root, whose own computed background is transparent,
    // so a page with a black body read as a white canvas.
    const rootStyle = getComputedStyle(document.documentElement);
    if (rootStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') return rootStyle.backgroundColor;
    if (document.body) {
      const bodyStyle = getComputedStyle(document.body);
      if (bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') return bodyStyle.backgroundColor;
    }
    // Where nothing paints at all, the canvas follows the used color-scheme, not white by default.
    // A rule that assumed white read a near-black panel on a dark canvas as high contrast.
    // Chromium's dark canvas is #121212, measured off a rendered page.
    const tokens = rootStyle.colorScheme.trim().split(/\s+/).filter(Boolean);
    const allowsDark = tokens.includes('dark');
    const allowsLight = tokens.includes('light') || tokens.includes('normal') || tokens.length === 0;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return allowsDark && (!allowsLight || prefersDark) ? '#121212' : '#ffffff';
  }

  globalThis.__cairnAudit = { signature, isVisible, isScreenReaderOnly, paintLayers, canvasColor };
}

/**
 * Install {@link CairnAuditPageHelpers} on `page` if it does not already carry them. Idempotent and
 * cheap, so a rule calls it at the top of its own `check` rather than trusting the runner: that
 * keeps a rule driven directly by a unit test working the same way it works under `runRendered`.
 */
export async function ensurePageHelpers(page: RenderedPage): Promise<void> {
  await page.evaluate(installPageHelpers);
}

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
