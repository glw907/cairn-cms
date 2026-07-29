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
import type { PaintLayer, Rgba } from './color.js';
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
  /**
   * Why this finding is exempt, when a rule holds a ratified exception the two suppression idioms
   * cannot express: a design token every recipe shares, on every page, which no page+selector
   * allowlist entry names and no source-positioned directive can reach. On an ADVISORY finding,
   * present means suppressed, so the text is what the report prints in place of a justification a
   * reader could look up, and it states the ruling, the measurement, and the token it turns on.
   *
   * On an `error`-tier finding it is refused: {@link resolveRenderedFindings} keeps the finding in
   * the gating list and prints the refusal beside it. Unlike the allowlist, which is a config file
   * the consumer owns and reviews, and unlike a source directive, which shows up in a diff, this
   * reason is written by the engine, applies to every page automatically, and is discoverable only
   * by reading the suppressed block. A one-line way to quiet a gate is not a thing to leave lying
   * around, and the symmetry is deliberate: {@link unprobeableFinding} forces itself advisory so no
   * suppression can turn a non-gating rule into a gating one, and this forces the other direction.
   *
   * The alternative a rule reaches for first is `continue`, and that is the defect this field
   * exists to make impossible: `border-contrast`'s ratified hairline silenced 135 findings against
   * cairn's own admin while the report said `0 suppressed`. An engine whose premise is that silent
   * green is the enemy counts its own exceptions.
   */
  exemption?: string;
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
  /**
   * Selectors the browser refused to parse, so no staleness verdict is possible either way.
   * Optional: a caller assembling a visit by hand (a unit test, a consumer driving the resolver
   * directly) has nothing to record here.
   */
  selectorsUnprobeable?: Set<string>;
  /**
   * Interaction states the run declared but could not put this page into, so the rules that read
   * only those states never ran here. A page with no popup trigger cannot reach `menu-open`, which
   * is ordinary rather than an error, and it means this page's findings are a SUBSET of what a full
   * run would raise. {@link deadFinding} needs that, since "nothing raised a finding for it" is
   * only true of what the run reached.
   */
  statesUnreached?: Set<InteractionState>;
}

const STALE_ALLOWLIST_RULE_ID = 'rendered-allowlist-stale';
const UNPROBEABLE_ALLOWLIST_RULE_ID = 'rendered-allowlist-unprobeable';
const DEAD_ALLOWLIST_RULE_ID = 'rendered-allowlist-dead';

/**
 * A rendered finding in the report's own `Finding` shape. A live page carries no source text, so
 * every position is zero; this is the one place that fact is written down.
 */
function positionless(finding: Pick<Finding, 'ruleId' | 'tier' | 'file' | 'message'>): Finding {
  return { ...finding, line: 0, start: 0, end: 0 };
}

/**
 * A rendered finding in the report's `Finding` shape. `exemptionHonored` is false for a rule-declared
 * exemption this resolver refused, which prints as a refusal rather than as an exemption: a reader
 * of a gating line needs to know a rule asked for silence and did not get it, and printing
 * `(exempt: ...)` beside a finding that gates would be a report contradicting itself.
 */
function toFinding(rf: ResolvedRenderedFinding, exemptionHonored = true, allowlisted = false): Finding {
  // The exemption rides in the message rather than in a field of its own on `Finding`, because
  // the report's whole job with a suppressed line is to print it: an allowlisted finding's reason
  // lives in the config a reader can open, and a rule's own exception has no such file.
  let note = '';
  if (rf.exemption !== undefined) {
    if (exemptionHonored) {
      note = ` (exempt: ${rf.exemption})`;
    } else if (allowlisted) {
      // A refused exemption on a finding the ALLOWLIST then suppressed used to print "refused
      // because an error-tier finding gates" from under the report's `Suppressed:` header, which is
      // the report contradicting itself, the one thing this function exists to prevent. Where the
      // line actually ends up decides which sentence it carries.
      note = ` (the allowlist suppressed this; the rule's own exemption was refused, since an error-tier finding gates: ${rf.exemption})`;
    } else {
      note = ` (the rule claimed an exemption, refused because an error-tier finding gates: ${rf.exemption})`;
    }
  }
  return positionless({
    ruleId: rf.ruleId,
    tier: rf.tier,
    file: `${rf.page} [${rf.theme}, ${rf.state}]`,
    message: `${rf.selector}: ${rf.message}${note}`,
  });
}

function staleFinding(entry: RenderedAllowlistEntry, tier: Tier): Finding {
  return positionless({
    ruleId: STALE_ALLOWLIST_RULE_ID,
    tier,
    file: entry.page,
    message:
      `the rendered allowlist names ${entry.selector} on ${entry.page}, but nothing there matched it in ` +
      `any captured theme or state. A stale entry is how a real finding disappears: fix the selector or ` +
      `remove the entry. (reason on file: ${entry.reason})`,
  });
}

/**
 * The finding an allowlist entry raises when the browser could not parse its selector at all. A
 * refused selector is not evidence of staleness, so reporting it as one both misnames the problem
 * and, because the staleness finding gates, lets an ADVISORY rule reach the exit code: an
 * adversarial pass demonstrated exactly that, allowlisting an advisory finding whose selector
 * carried a Tailwind variant class (`div.flex.lg:ml-56`) and getting `exit 1`. This one is
 * advisory, so no suppression a developer writes can turn a non-gating rule into a gating one.
 */
function unprobeableFinding(entry: RenderedAllowlistEntry): Finding {
  return positionless({
    ruleId: UNPROBEABLE_ALLOWLIST_RULE_ID,
    tier: 'advisory',
    file: entry.page,
    message:
      `the rendered allowlist names ${entry.selector} on ${entry.page}, but the browser refused to parse it ` +
      `as a CSS selector, so neither a match nor a staleness verdict is possible. Escape the selector ` +
      `(CSS.escape covers Tailwind's \`:\` and \`[]\` class syntax) so the entry can be checked. ` +
      `(reason on file: ${entry.reason})`,
  });
}

/**
 * The finding an allowlist entry raises when its selector still matches an element but no rule
 * raised anything for it. The staleness check keys on the SELECTOR, so a fix that removed the
 * finding while the element stayed put leaves an entry that suppresses nothing and can never be
 * reported: it reads as a legitimate exemption forever, and the next real finding on that selector
 * disappears into it. `suppress.ts` calls the static twin of this a dead directive and errors on it
 * for the same reason. Tiered like the staleness finding, so a dead entry covering an advisory rule
 * cannot become the path by which a non-gating rule reaches the exit code.
 */
function deadFinding(entry: RenderedAllowlistEntry, tier: Tier): Finding {
  return positionless({
    ruleId: DEAD_ALLOWLIST_RULE_ID,
    tier,
    file: entry.page,
    message:
      `the rendered allowlist names ${entry.selector} on ${entry.page}, and it still matches an element, but ` +
      `nothing there raised a finding for it in any captured theme or state, so the entry suppresses nothing. ` +
      `An exemption that has outlived its finding is where the next real one goes to hide: remove the entry. ` +
      `(reason on file: ${entry.reason})`,
  });
}

/**
 * The finding an allowlist entry raises when its selector still matches but the run could not reach
 * every interaction state the rules declare, so "nothing raised a finding for it" is a claim about
 * an incomplete run rather than about the page. Advisory and worded as a withheld verdict, because
 * the remedy {@link deadFinding} prescribes, removing the entry, is the WRONG move here: the next
 * run that does reach the state would then gate on the real finding the entry covers.
 *
 * `runRendered` produces exactly this subset on any page with no popup trigger, which the default
 * page list includes, so the gating verdict had to be conditional on coverage rather than on the
 * caller doing something unusual.
 */
function unreachedStateFinding(entry: RenderedAllowlistEntry, unreached: InteractionState[]): Finding {
  return positionless({
    ruleId: DEAD_ALLOWLIST_RULE_ID,
    tier: 'advisory',
    file: entry.page,
    message:
      `the rendered allowlist names ${entry.selector} on ${entry.page}, and it still matches an element, but ` +
      `nothing raised a finding for it in what this run reached. The run never reached ${unreached.join(', ')} ` +
      `on that page, so whether the entry is dead cannot be decided here: check it against a page that reaches ` +
      `that state before removing it. (reason on file: ${entry.reason})`,
  });
}

/**
 * Resolve raw rendered findings against the allowlist: an exact page+selector match suppresses, and
 * every allowlist entry that never matched anything the run actually visited becomes its own
 * finding rather than silently doing nothing. An entry whose selector the browser refused to parse
 * is reported separately and advisory, since "unreadable" is a different claim from "stale" (see
 * {@link unprobeableFinding}), and an entry that still matches an element while suppressing nothing
 * is reported as dead (see {@link deadFinding}).
 *
 * An ADVISORY rule may also exempt its own finding by giving it a reason
 * ({@link RenderedFinding.exemption}), which suppresses it here rather than inside the rule. The
 * routing is deliberately the same one the allowlist takes: an exception is a finding that was
 * raised, counted, and printed, never a branch a rule took before constructing one. On an
 * `error`-tier finding the reason is refused and the finding still gates, so no rule can write
 * itself out of the exit code.
 *
 * A stale entry is reported at the tier of the rule it names, which `ruleTiers` supplies, and at
 * `error` when it names none. Without that, suppressing an ADVISORY finding gated the build the
 * moment its selector churned, which is the one path by which a non-gating rule could reach the
 * exit code.
 *
 * This is a pure function over already-collected data, so the allowlist contract is testable
 * without a browser.
 */
export function resolveRenderedFindings(
  raw: ResolvedRenderedFinding[],
  visits: RenderedPageVisit[],
  allowlist: RenderedAllowlistEntry[],
  ruleTiers: Map<string, Tier> = new Map()
): { findings: Finding[]; suppressed: Finding[] } {
  const findings: Finding[] = [];
  const suppressed: Finding[] = [];
  const spent = new Set<RenderedAllowlistEntry>();
  for (const rf of raw) {
    // EVERY matching entry is spent, not just the first. Marking one left a duplicated row, an
    // ordinary result of a hand edit or a config merge, falling into the dead branch and gating the
    // build with a message asserting nothing raised a finding for that selector, one line under the
    // finding that had just been raised and suppressed for it.
    const matches = allowlist.filter((candidate) => candidate.page === rf.page && candidate.selector === rf.selector);
    for (const entry of matches) spent.add(entry);
    const allowlisted = matches.length > 0;
    const selfExempt = rf.exemption !== undefined && rf.tier !== 'error';
    const destination = allowlisted || selfExempt ? suppressed : findings;
    destination.push(toFinding(rf, selfExempt, allowlisted));
  }
  for (const entry of allowlist) {
    if (spent.has(entry)) continue;
    const visit = visits.find((candidate) => candidate.page === entry.page);
    const tier = (entry.rule === undefined ? undefined : ruleTiers.get(entry.rule)) ?? 'error';
    if (visit?.selectorsSeen.has(entry.selector)) {
      const unreached = [...(visit.statesUnreached ?? [])].sort();
      findings.push(unreached.length > 0 ? unreachedStateFinding(entry, unreached) : deadFinding(entry, tier));
      continue;
    }
    findings.push(
      visit?.selectorsUnprobeable?.has(entry.selector) ? unprobeableFinding(entry) : staleFinding(entry, tier)
    );
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
 * The measurement helpers every rendered rule shares, installed on the page rather than closed
 * over. A function handed to `page.evaluate` is serialized by source and cannot reference anything
 * outside its own body, which is why five rules each grew their own copy of "is this visible" and
 * "name this element"; the copies then drifted, and an adversarial pass demonstrated the drift as
 * shipped defects (an `sr-only` heading counted as a rendered heading, an unescaped Tailwind class
 * signature that no `querySelectorAll` could parse). Installing one implementation on `window` and
 * calling it from inside each rule's own evaluate keeps the definition single without reintroducing
 * the closure the serializer forbids.
 */
export interface CairnAuditPageHelpers {
  /**
   * A valid CSS selector naming `el`: its tag, its id, and up to four of its classes, every
   * identifier escaped. Tailwind's own class syntax (`lg:ml-56`, `max-w-[30%]`) is not a legal
   * identifier unescaped, and an unescaped signature throws inside `querySelectorAll`.
   */
  signature(el: Element): string;
  /**
   * Whether `el` renders to a sighted user: it and every ancestor pass `display`, `visibility`,
   * and cumulative `opacity`, it is not inside a screen-reader-only container, and it occupies a
   * box (measured through a Range, so `display: contents` and inline text still count).
   */
  isVisible(el: Element): boolean;
  /** Whether `el` carries the visually-hidden recipe (a clipped 1px box), on its own or by ancestry. */
  isScreenReaderOnly(el: Element): boolean;
  /** `el`'s own paint layer, then each ancestor's up to the document root. */
  paintLayers(el: Element): PaintLayer[];
  /** The color the browser paints where nothing in the document ever paints, as a CSS string. */
  canvasColor(): string;
}

declare global {
  var __cairnAudit: CairnAuditPageHelpers | undefined;
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

  const browser = await chromium.launch();
  try {
    for (const pagePath of pages) {
      const visit = visits.find((candidate) => candidate.page === pagePath);
      const relevantAllowlist = config.renderedAllowlist.filter((entry) => entry.page === pagePath);
      for (const theme of themes) {
        const context = await browser.newContext({ colorScheme: theme });
        await context.addCookies([
          { name: 'cairn-admin-theme', value: THEME_COOKIE_VALUE[theme], url: baseUrl },
          ...extraCookies.map((cookie) => ({ ...cookie, url: baseUrl })),
        ]);
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
      }
    }
  } finally {
    await browser.close();
  }

  const { findings, suppressed } = resolveRenderedFindings(
    raw,
    visits,
    config.renderedAllowlist,
    new Map(rules.map((rule) => [rule.id, rule.tier]))
  );
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
