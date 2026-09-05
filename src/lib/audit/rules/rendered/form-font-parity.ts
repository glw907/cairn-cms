// cairn-audit's form-font-parity rule: every rendered `input`, `select`, `textarea`, and `button`
// computes the same first `font-family` as the admin's own `[data-theme]` root. This is the UA
// reset layer's regression tripwire, closing findings 1 and 6: the reset's
// `button, input, select, textarea, optgroup { font: inherit; ... }` rule is what stops a bare
// control from falling back to the browser's UA monospace/serif default, and this rule is what
// notices if that reset ever fails to load, whether cairn's own build drops it or a consumer's
// bundler strips the sheet before the page renders.
//
// The comparison is string equality on the FIRST family in the computed list, never a threshold: a
// font either loaded and applied, or it did not, so there is no "close enough" here the way a color
// or a spacing measurement carries one. Comparing only the first family (rather than the whole
// stack) is deliberate: a control that resolves the same primary face as the root, with a different
// fallback chain behind it, is not the regression this rule exists to catch.
//
// SCOPE. The walk is scoped to the theme root's own subtree, not the
// whole document: a page that mounts more than one theme wrapper, or that renders unthemed chrome
// alongside the admin surface, has no business comparing a control outside the root against a face
// declared on the root. A control that opts INTO a different face on purpose is exempt for the same
// reason a color the developer chose deliberately is never a regression: CairnMediaLibrary's slug
// input and its two type-to-confirm inputs, and MarkdownEditor's no-JS fallback textarea, all
// declare their own monospace face this way and are mismatches by construction, not by omission.
//
// EXEMPTION NET CLOSED, THREE SHAPES: the net used to match only a bare `font-mono` class or the
// Tailwind v3 arbitrary-value form `font-[family-name:...]`, which false-positived on three
// shapes an any-site audit surfaced: a variant-prefixed utility (`md:font-mono`,
// `dark:font-mono`), the `font-serif`/`font-sans` families, and Tailwind 4's
// `font-(family-name:--x)` shorthand. `hasExplicitFace` now strips a leading run of bare
// word-character variant prefixes (`md:`, `dark:md:`) before testing the base utility, so all
// three named shapes close.
//
// STILL OPEN, not docket-named, found while closing the net above: a bracketed arbitrary variant
// (`[&:hover]:font-mono`, `has-[:checked]:font-mono`) is not a bare word-character run, so the
// strip above leaves it whole and the base-utility test misses it; a trailing Tailwind 4
// important-modifier bang (`font-mono!`) fails the exact `base === 'font-mono'` match for the same
// reason. Both would still false-positive as a mismatch today; neither blocks the docket's own
// closure, since the docket named neither.
//
// Registered PROVISIONALLY at advisory. The intended tier is error, since a
// consumer whose sheet never loaded is exactly the silent-fail-open shape this engine exists to
// rule out, but a rule validated only on this workstation is not trusted to gate a build until a
// CI re-check confirms the rendered suite is green against cairn's own admin and showcase on
// the CI runner (the local visual suite diverges from CI by dozens of threshold-marginal
// comparisons, and font resolution is exactly the kind of measurement a runner's installed font set
// can move). If CI disagrees with the workstation, this stays advisory and the divergence is
// recorded rather than promoted anyway. Closing the exemption net above is
// a false-positive fix, not new evidence toward that promotion, so the tier stays advisory
// regardless.
import { ensurePageHelpers } from '../../rendered.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/** One rendered control whose first font-family disagrees with the admin root's. */
interface FontMismatch {
  selector: string;
  family: string;
}

/** What the in-page walk found: the root's own first family, and every control that disagrees. */
interface FontParityResult {
  rootFamily: string;
  mismatches: FontMismatch[];
}

/**
 * Reads the admin root's first `font-family` and every rendered form control's own, reporting the
 * controls whose first family differs. Playwright serializes this into the page, so it stays
 * self-contained: every helper is nested and nothing outside the function body is referenced.
 */
function readFontParity(): FontParityResult {
  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());
  const isVisible = (el: Element) => (helpers ? helpers.isVisible(el) : true);

  /** The first entry of a computed `font-family` list, unquoted and lowercased for comparison. */
  function firstFamily(value: string): string {
    const first = value.split(',')[0] ?? '';
    return first.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
  }

  /** A control carrying a class that declares its own face on purpose, exempt from the reset check. */
  function hasExplicitFace(el: Element): boolean {
    for (const className of el.classList) {
      // Strip any leading variant prefixes (`md:`, `dark:md:`) before testing the base utility, so
      // a variant-prefixed exemption class reads the same as its unprefixed form. Only matches a run
      // of bare word characters followed by a colon, so it never touches the colon inside an
      // arbitrary-value class's brackets (`font-[family-name:...]`, `font-(family-name:--x)`).
      const base = className.replace(/^(?:[a-z0-9-]+:)+/, '');
      if (base === 'font-mono' || base === 'font-serif' || base === 'font-sans') return true;
      if (base.startsWith('font-[family-name:')) return true;
      if (base.startsWith('font-(family-name:')) return true;
    }
    return false;
  }

  // The admin's own theme shape: `data-theme` sits on a bare wrapper inside body
  // (docs/internal/admin-design-system.md's load-bearing rule), which is where the reset's own
  // body-face declaration lands. A page with no such wrapper (a bespoke route rendering outside the
  // admin theme entirely) falls back to body, then the document root, so the rule still answers.
  const themeRoot =
    document.querySelector<HTMLElement>("[data-theme='cairn-admin'], [data-theme='cairn-admin-dark']") ??
    document.body ??
    document.documentElement;
  const rootFamily = firstFamily(getComputedStyle(themeRoot).fontFamily);

  const mismatches: FontMismatch[] = [];
  if (rootFamily !== '') {
    for (const el of themeRoot.querySelectorAll('input, select, textarea, button')) {
      if (!isVisible(el)) continue;
      if (hasExplicitFace(el)) continue;
      const family = firstFamily(getComputedStyle(el).fontFamily);
      if (family === '' || family === rootFamily) continue;
      mismatches.push({ selector: signature(el), family });
    }
  }
  return { rootFamily, mismatches };
}

export const formFontParity: RenderedRule = {
  id: 'form-font-parity',
  tier: 'advisory',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ensurePageHelpers(ctx.page);
    const result = await ctx.page.evaluate(readFontParity);
    // A root with no readable font-family (an unstyled fixture, a page rendering outside any theme
    // wrapper) has nothing to compare against; saying so beats silently reporting zero mismatches,
    // which is exactly how a page the reset never reaches would read as clean.
    if (result.rootFamily === '') {
      return [
        {
          ruleId: 'form-font-parity',
          tier: 'advisory',
          selector: 'html',
          message:
            'the admin root computes no readable font-family, so no control here can be compared against it. ' +
            'Give the [data-theme] wrapper a resolvable font stack, or allowlist this page with a reason.',
        },
      ];
    }
    return result.mismatches.map((mismatch) => ({
      ruleId: 'form-font-parity',
      tier: 'advisory' as const,
      selector: mismatch.selector,
      message:
        `computes font-family "${mismatch.family}", not the admin root's "${result.rootFamily}". A bare ` +
        `control that misses the reset layer falls back to the browser's UA face: check that the built ` +
        `admin sheet actually loaded (cairn-admin.css's base-layer "font: inherit" rule on button, input, ` +
        `select, textarea, optgroup). If this control opts into its own face on purpose, this finding may ` +
        `be an exemption miss: allowlist the selector with a reason.`,
    }));
  },
};
