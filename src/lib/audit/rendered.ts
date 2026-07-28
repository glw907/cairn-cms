// cairn-audit's rendered runner: drive a real browser against a running admin, both themes always,
// and turn what rules find into the same AuditReport shape the static runner produces. This module
// owns the whole rendered contract, since it is the one file the harness is scoped to: the rule
// model, the Playwright surface a rule reads from, the BASE_URL and Playwright-presence checks, the
// interaction-state seam, and the page+selector+reason allowlist with its staleness check.
//
// Two things this module NEVER does, both load-bearing. It never starts a server: BASE_URL (default
// http://localhost:4173) has to already answer, or the run fails naming the URL it tried. And it
// never imports Playwright at the top level: `import('playwright')` is dynamic and resolves from
// wherever this file executes, which is cairn's own devDependency during cairn's own tests but a
// CONSUMER's install once this ships in dist and a site's own audit run imports it. That is the
// deliberate difference from scripts/generate-norms-manifest.mjs, which imports the ROOT
// `playwright` because it is cairn's own build tool pinned by cairn's own lockfile; do not
// "harmonize" the two import styles, they serve different trees on purpose.
import { renderedRules } from './rules/rendered/index.js';
import type { Rgba } from './color.js';
import type { AuditConfig, RenderedAllowlistEntry } from './config.js';
import type { AuditReport, Finding, Tier } from './types.js';

/** The theme every rendered page is captured under. Both run for every page, unconditionally. */
export type Theme = 'light' | 'dark';

/**
 * A DOM state a rendered rule reads from, beyond a page's own rest render. The runner captures only
 * the states the REGISTERED rules actually declare (see {@link RenderedRule.states}), so a rule that
 * only needs `'rest'` never pays for a menu-open pass nobody asked for.
 */
export type InteractionState = 'rest' | 'menu-open' | 'focus-visible';

/** The cookie cairn's own admin reads to pick its SSR theme (`content-routes-core.ts`). */
const THEME_COOKIE_VALUE: Record<Theme, 'cairn-admin' | 'cairn-admin-dark'> = {
  light: 'cairn-admin',
  dark: 'cairn-admin-dark',
};

// The structural slice of Playwright's API this module drives. Typed narrowly rather than imported
// from the `playwright` package: Playwright is a dynamic import from whichever tree this file
// executes in, so its exact installed version and type shape are not guaranteed, the same reasoning
// that governs carta-md's dynamic import elsewhere in this codebase.

/**
 * The live browser page a rendered rule reads from. Viewport control is part of the surface rather
 * than a rule's private cast: two v1 rules (`touch-targets`, `viewport-overflow`) check a floor
 * that is only meaningful at a stated width, and both independently reached past a narrower
 * interface to Playwright's own method, which is the signal that the width belongs here.
 */
export interface RenderedPage {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<{ status(): number } | null>;
  evaluate<T, Arg = undefined>(fn: (arg: Arg) => T, arg?: Arg): Promise<T>;
  keyboard: { press(key: string): Promise<void> };
  /** The page's current viewport, or `null` when it inherits the context's. */
  viewportSize(): { width: number; height: number } | null;
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  close(): Promise<void>;
}

/** One browser context: one theme and cookie jar, several pages drawn from it. */
export interface RenderedContext {
  addCookies(cookies: { name: string; value: string; url: string }[]): Promise<void>;
  newPage(): Promise<RenderedPage>;
  close(): Promise<void>;
}

/** The launched browser instance. */
export interface RenderedBrowser {
  newContext(options?: { colorScheme?: Theme }): Promise<RenderedContext>;
  close(): Promise<void>;
}

/** The shape `import('playwright')` resolves to, narrowed to what this module calls. */
export interface PlaywrightModule {
  chromium: { launch(): Promise<RenderedBrowser> };
}

/** What one rendered rule may read: the live page, already in its declared interaction state. */
export interface RenderedRuleContext {
  page: RenderedPage;
  /** The route this page was navigated to, e.g. `/admin/posts`. What the allowlist's `page` matches. */
  pagePath: string;
  theme: Theme;
  state: InteractionState;
  config: AuditConfig;
}

/**
 * One rendered rule's raw verdict about one element. `selector` is the same signature idiom the
 * graduating live probes use today (a tag plus a handful of classes, or whatever a rule's own DOM
 * walk names the element): it is what the page+selector+reason allowlist matches against, since a
 * live-page finding has no source line a suppression comment could sit beside.
 */
export interface RenderedFinding {
  ruleId: string;
  tier: Tier;
  selector: string;
  message: string;
}

/** A rendered rule: an id, a tier, the interaction states it needs, and a pure-per-state check. */
export interface RenderedRule {
  id: string;
  tier: Tier;
  /**
   * Interaction states this rule reads from. Defaults to `['rest']` when omitted, so a rule that
   * never mentions the field costs the run nothing beyond the rest-state pass every rule shares.
   */
  states?: InteractionState[];
  check(ctx: RenderedRuleContext): Promise<RenderedFinding[]>;
}

/** A `RenderedFinding` resolved with the page, theme, and state it was raised under. */
export interface ResolvedRenderedFinding extends RenderedFinding {
  page: string;
  theme: Theme;
  state: InteractionState;
}

/** One page's worth of allowlist bookkeeping: which named selectors were actually seen there. */
export interface RenderedPageVisit {
  page: string;
  /**
   * Selectors an allowlist entry named for this page that matched at least one element, in any
   * theme or state the run visited. Only the selectors an allowlist entry names are probed; this is
   * not a survey of the whole page.
   */
  selectorsSeen: Set<string>;
}

const STALE_ALLOWLIST_RULE_ID = 'rendered-allowlist-stale';

function toFinding(rf: ResolvedRenderedFinding): Finding {
  return {
    ruleId: rf.ruleId,
    tier: rf.tier,
    file: `${rf.page} [${rf.theme}, ${rf.state}]`,
    line: 0,
    start: 0,
    end: 0,
    message: `${rf.selector}: ${rf.message}`,
  };
}

function staleFinding(entry: RenderedAllowlistEntry): Finding {
  return {
    ruleId: STALE_ALLOWLIST_RULE_ID,
    tier: 'error',
    file: entry.page,
    line: 0,
    start: 0,
    end: 0,
    message:
      `the rendered allowlist names ${entry.selector} on ${entry.page}, but nothing there matched it in ` +
      `any captured theme or state. A stale entry is how a real finding disappears: fix the selector or ` +
      `remove the entry. (reason on file: ${entry.reason})`,
  };
}

/**
 * Resolve raw rendered findings against the allowlist: an exact page+selector match suppresses, and
 * every allowlist entry that never matched anything the run actually visited becomes its own error
 * finding rather than silently doing nothing. This is a pure function over already-collected data,
 * so the allowlist contract is testable without a browser.
 */
export function resolveRenderedFindings(
  raw: ResolvedRenderedFinding[],
  visits: RenderedPageVisit[],
  allowlist: RenderedAllowlistEntry[]
): { findings: Finding[]; suppressed: Finding[] } {
  const findings: Finding[] = [];
  const suppressed: Finding[] = [];
  for (const rf of raw) {
    const entry = allowlist.find((candidate) => candidate.page === rf.page && candidate.selector === rf.selector);
    (entry ? suppressed : findings).push(toFinding(rf));
  }
  for (const entry of allowlist) {
    const visit = visits.find((candidate) => candidate.page === entry.page);
    if (!visit || !visit.selectorsSeen.has(entry.selector)) findings.push(staleFinding(entry));
  }
  return { findings, suppressed };
}

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

/** Everything a rendered run may substitute for testability. Every field defaults to the real thing. */
export interface RenderedDeps {
  /** Whether BASE_URL answers; defaults to a real `fetch`. */
  isReachable?: (url: string) => Promise<boolean>;
  /** Loads Playwright; defaults to a dynamic import of the caller's own install. */
  loadPlaywright?: () => Promise<PlaywrightModule>;
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
 * always is (a real Tab keypress), and `menu-open` is not on a page that carries no conventional
 * menu trigger, which is not an error, just a state that page's rules skip.
 */
async function applyState(state: InteractionState, page: RenderedPage): Promise<boolean> {
  if (state === 'rest') return true;
  if (state === 'focus-visible') {
    await page.keyboard.press('Tab');
    return true;
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
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return colors.map(() => null);
  const context = ctx;

  function paintOver(backdrop: string, color: string): number[] {
    context.globalCompositeOperation = 'copy';
    context.fillStyle = backdrop;
    context.fillRect(0, 0, 1, 1);
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data);
  }

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
 * Whether each of `selectors` matches at least one element on the current page. Playwright
 * serializes this into the page, so it stays self-contained: no references outside its own body.
 */
function probeSelectors(selectors: string[]): boolean[] {
  return selectors.map((selector) => {
    try {
      return document.querySelectorAll(selector).length > 0;
    } catch {
      return false;
    }
  });
}

/**
 * Run the rendered audit: every configured page, both themes, every interaction state the
 * registered rules declare. `rules` defaults to the shipped registry (empty until Tasks 15 and 16
 * register the eleven rendered rules) and is injectable the same way `runStatic` injects its rule
 * set; `deps` substitutes the BASE_URL and Playwright checks for a test.
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

  const baseUrl = await resolveBaseUrl(deps.isReachable ?? defaultIsReachable);
  const { chromium } = await loadPlaywrightModule(deps.loadPlaywright ?? defaultLoadPlaywright);
  const states = neededStates(rules);
  const themes: Theme[] = ['light', 'dark'];

  const visits: RenderedPageVisit[] = pages.map((page) => ({ page, selectorsSeen: new Set<string>() }));
  const raw: ResolvedRenderedFinding[] = [];

  const browser = await chromium.launch();
  try {
    for (const pagePath of pages) {
      const visit = visits.find((candidate) => candidate.page === pagePath);
      const relevantAllowlist = config.renderedAllowlist.filter((entry) => entry.page === pagePath);
      for (const theme of themes) {
        const context = await browser.newContext({ colorScheme: theme });
        await context.addCookies([{ name: 'cairn-admin-theme', value: THEME_COOKIE_VALUE[theme], url: baseUrl }]);
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
              if (!reached) continue;

              if (relevantAllowlist.length > 0 && visit) {
                const present = await page.evaluate(probeSelectors, relevantAllowlist.map((entry) => entry.selector));
                relevantAllowlist.forEach((entry, index) => {
                  if (present[index]) visit.selectorsSeen.add(entry.selector);
                });
              }

              for (const rule of rules) {
                if (!(rule.states ?? ['rest']).includes(state)) continue;
                const found = await rule.check({ page, pagePath, theme, state, config });
                for (const f of found) raw.push({ ...f, page: pagePath, theme, state });
              }
            } finally {
              await page.close();
            }
          }
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }

  const { findings, suppressed } = resolveRenderedFindings(raw, visits, config.renderedAllowlist);
  const byPosition = (a: Finding, b: Finding) => (a.file === b.file ? 0 : a.file.localeCompare(b.file));
  return {
    findings: [...findings].sort(byPosition),
    suppressed: [...suppressed].sort(byPosition),
    // Pages, not files: rendered mode reuses the static runner's AuditReport shape (so the bin's
    // report formatter and exit-code logic stay agnostic between the two modes) rather than
    // inventing a second report type for one renamed field.
    filesScanned: pages.length,
    ruleIds: rules.map((rule) => rule.id),
  };
}
