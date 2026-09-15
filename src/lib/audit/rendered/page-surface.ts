// What a rendered rule reads once a page is open: putting it into a declared interaction state
// (rest, focus-visible, menu-open, row-expanded), resolving a CSS color string to sRGB by painting
// it, probing whether a selector matches, misses, or cannot be parsed, and installing the shared
// CairnAuditPageHelpers on `window` so five rules stop growing their own copies of "is this
// visible". Several of the functions below run INSIDE the page: Playwright serializes a function
// handed to `page.evaluate` by source, so `resolveColorsInPage`, `probeSelectors`, and
// `installPageHelpers` (plus its own nested helpers) stay self-contained, no reference outside their
// own bodies, the same discipline `identity.ts`'s `capturePageIdentity` follows.
import type { PaintLayer, Rgba } from '../color.js';
import type { InteractionState, RenderedPage } from './types.js';

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
  // Refined against the admin's real markup. Every dialog
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
export function probeSelectors(selectors: string[]): ('matched' | 'absent' | 'unprobeable')[] {
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

  // Splits a selector list on its top-level commas, the only place a comma separates two whole
  // selectors rather than sitting inside a functional pseudo-class's own argument list
  // (`:is(a, b)`, `:where(a, b)`). Depth tracks parens only: CSS selector lists have no other
  // bracket that legitimately nests a comma at this level.
  function splitSelectorList(selectorList: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const char of selectorList) {
      if (char === '(') depth += 1;
      else if (char === ')') depth -= 1;
      if (char === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    const last = current.trim();
    if (last) parts.push(last);
    return parts;
  }

  // A single selector's own trailing `::before`/`::after` (or the one-colon legacy form), split
  // from its element-matching base, since `Element.matches()` only ever matches a real element.
  function stripPseudoElement(selector: string): { base: string; pseudo: '' | '::before' | '::after' } {
    const match = selector.match(/^(.*?)::?(before|after)$/);
    if (!match) return { base: selector, pseudo: '' };
    return { base: match[1], pseudo: match[2] === 'before' ? '::before' : '::after' };
  }

  /**
   * Recorded against `el` (own body: no closure over anything outside this function, the same
   * discipline every other page-side helper here follows), one match per style declaration whose
   * selector reaches `el` under `pseudoElement` and which declares `property`.
   *
   * This walker is the LOCATOR, never the detector: a caller that already knows an element's
   * computed value is wrong asks it to name the authored rule responsible, and it reads that
   * rule's authored (not computed) `value` back only to decide which of several matching rules is
   * the nonzero one. It never re-derives the defect itself. Measured, not assumed: `getPropertyValue`
   * on an authored rule resolves every `var()` reference to its final value, the same as
   * `getComputedStyle` does, so this walk can compare authored values but can never recover the
   * token name (e.g. `--cairn-dur-quick`) a declaration actually cited.
   */
  function findAuthoredRules(
    el: Element,
    pseudoElement: '' | '::before' | '::after',
    property: string
  ): { selector: string; file: string; value: string }[] {
    const matches: { selector: string; file: string; value: string }[] = [];

    function record(selectorList: string, style: CSSStyleDeclaration, file: string): void {
      const value = style.getPropertyValue(property);
      if (!value) return;
      for (const selector of splitSelectorList(selectorList)) {
        const { base, pseudo } = stripPseudoElement(selector);
        if (pseudo !== pseudoElement) continue;
        try {
          if (el.matches(base)) matches.push({ selector, file, value });
        } catch {
          // An unparseable or unsupported selector cannot be matched against; skipped rather than
          // thrown, the same discipline `probeSelectors` follows for the allowlist.
        }
      }
    }

    // `inheritedSelector` is the nearest enclosing style rule's own selector, which a trailing
    // `CSSNestedDeclarations` block (bare declarations after a nested rule, inside the same
    // parent) has no selector of its own and inherits.
    function walk(rules: Iterable<CSSRule>, inheritedSelector: string | null, file: string): void {
      for (const rule of Array.from(rules)) {
        const kind = rule.constructor ? rule.constructor.name : '';
        if (kind === 'CSSStyleRule') {
          const styleRule = rule as CSSStyleRule;
          record(styleRule.selectorText, styleRule.style, file);
          if (styleRule.cssRules) walk(styleRule.cssRules, styleRule.selectorText, file);
        } else if (kind === 'CSSNestedDeclarations') {
          if (inheritedSelector) record(inheritedSelector, (rule as unknown as { style: CSSStyleDeclaration }).style, file);
        } else if (
          kind === 'CSSSupportsRule' ||
          kind === 'CSSContainerRule' ||
          kind === 'CSSLayerBlockRule' ||
          kind === 'CSSStartingStyleRule'
        ) {
          walk((rule as unknown as { cssRules: CSSRuleList }).cssRules, inheritedSelector, file);
        }
        // A @media block is deliberately never descended into; see this method's own doc comment.
      }
    }

    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        // A cross-origin or otherwise opaque sheet throws SecurityError reading its own cssRules;
        // measured on this Chromium install with no other way to probe it, so the sheet is skipped
        // rather than aborting the walk over every other sheet on the page.
        continue;
      }
      walk(rules, null, sheet.href ?? 'inline style');
    }
    return matches;
  }

  globalThis.__cairnAudit = {
    signature,
    isVisible,
    isScreenReaderOnly,
    paintLayers,
    canvasColor,
    findAuthoredRules,
  };
}

/**
 * Install {@link CairnAuditPageHelpers} on `page` if it does not already carry them. Idempotent and
 * cheap, so a rule calls it at the top of its own `check` rather than trusting the runner: that
 * keeps a rule driven directly by a unit test working the same way it works under `runRendered`.
 */
export async function ensurePageHelpers(page: RenderedPage): Promise<void> {
  await page.evaluate(installPageHelpers);
}
