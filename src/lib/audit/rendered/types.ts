// The type vocabulary the rendered runner and every rendered rule share: the Playwright surface
// this module drives (typed narrowly rather than imported from the `playwright` package, since
// Playwright is a dynamic import from whichever tree the caller executes in), the finding and
// allowlist-bookkeeping shapes, the page-identity guard's own contract, and the substitution seam
// (`RenderedDeps`) a test injects. No logic lives here, only the interfaces `rendered.ts`,
// `findings.ts`, `identity.ts`, and every rendered rule build against.
import type { PaintLayer } from '../color.js';
import type { AuditConfig } from '../config.js';
import type { Tier } from '../types.js';

/** The theme every rendered page is captured under. Both run for every page, unconditionally. */
export type Theme = 'light' | 'dark';

/**
 * A DOM state a rendered rule reads from, beyond a page's own rest render. The runner captures only
 * the states the REGISTERED rules actually declare (see {@link RenderedRule.states}), so a rule that
 * only needs `'rest'` never pays for a menu-open pass nobody asked for. `row-expanded` clicks the
 * first `ExpandableRow` summary trigger it finds, the precedent `menu-open` set for a real
 * interaction state; a page that carries no `ExpandableRow` cannot reach it, same as a page with no
 * menu trigger cannot reach `menu-open`.
 */
export type InteractionState = 'rest' | 'menu-open' | 'focus-visible' | 'row-expanded';

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
  /**
   * `javaScriptEnabled: false` is the page-identity guard's own option: a context opened with it
   * never runs the page's own scripts, so `evaluate` reads back whatever the server actually sent,
   * with no race against hydration. Playwright still serves `evaluate` through its own runtime
   * binding regardless of the flag, so a page opened this way is otherwise ordinary.
   */
  newContext(options?: { colorScheme?: Theme; javaScriptEnabled?: boolean }): Promise<RenderedContext>;
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
  /**
   * The page-identity guard refused this page: its post-hydration DOM did not match its SSR
   * identity, so no rule ever ran here and no selector was ever probed. An allowlist entry naming
   * this page cannot be told stale from dead on that evidence, only withheld, the same reasoning
   * {@link statesUnreached} carries one layer in.
   */
  identityRefused?: boolean;
}

/**
 * What a route's identity looks like to the post-hydration guard: enough to say whether the DOM that
 * settles after hydration still belongs to the page that was navigated to. Generic across any route
 * cairn or a consumer might serve, including a consumer's own custom route and the shell-less login
 * page: neither carries cairn-only markup, and both still produce one, `landmark` simply reading null
 * where no `<main>`/`[role="main"]` region exists on either side.
 */
export interface PageIdentity {
  title: string;
  landmark: string | null;
}

/** Everything a rendered run may substitute for testability. Every field defaults to the real thing. */
export interface RenderedDeps {
  /** Whether BASE_URL answers; defaults to a real `fetch`. */
  isReachable?: (url: string) => Promise<boolean>;
  /** Loads Playwright; defaults to a dynamic import of the caller's own install. */
  loadPlaywright?: () => Promise<PlaywrightModule>;
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
