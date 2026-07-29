// cairn-audit's weight-budget rule: at most two distinct font-weights per CONTENT REGION, not per
// route. The brainstorm's original form counted weights across a whole page and is refuted by
// cairn's own flagship screens: a real admin route legitimately runs 400 (body), 500 (nav item,
// field label), 600 (eyebrow, active nav item), and 700 (the page heading) all at once, so a
// route-level floor of two flags cairn's best work on sight. The rule is only true at the
// granularity the brainstorm actually meant: within one bounded area of prose or data, not across
// the chrome that surrounds it.
//
// A CONTENT REGION, for this rule, is the text inside `<main>` (or the topmost open dialog layer,
// when one is open, which then stands ALONE the way one-filled-action's own surface partition
// treats a layer as replacing the page beneath it), split into one sub-region per heading (h1-h6 or
// `[role="heading"]`): the text before the first heading is its own region, and each heading opens
// a new one that runs until the next, MINUS CHROME.
//
// Ruling 4 (Task 16b, 2026-07-28, Geoff): the region definition above, before this ruling, still
// counted a route's own toolbar, pagination, and column-header furniture as if it were the body
// prose or data the rule exists to test. Every one of the ten advisories the rendered baseline
// raised against cairn's own admin (five routes times two themes, every one at exactly three
// weights) was exactly that furniture, never a real three-weight passage of prose or data. The
// claim stays (two weights per body-content region); only the region's own boundary narrows to
// what the rule was always meant to test.
//
// The definition is SHAPE-based, not component-based, which is the ruling's own instruction, so say
// what that costs rather than claiming a component family is covered. `Pagination` renders its
// item-range `role="status"` line and its "Rows per page" `<label><select>` in a plain `<div>`
// OUTSIDE its `<nav aria-label="Pagination">`, and `ListToolbar`'s count line and filter labels sit
// in plain divs too, so in both components only the parts wearing a chrome shape are chrome and the
// rest still spends the budget. A future recomposition that moves weight out of a button and into a
// sibling `<span>` silently re-fires the rule. That is the trade the ruling took over a
// component-name match, not an oversight.
//
// CHROME, for this rule, is text inside one of the shapes below, each named by the PLATFORM's own
// semantics (an HTML tag or the ARIA role that means the same thing), never a class name or a
// component's own identity, so a rewritten component stays covered the same way a renamed one would
// not be under a class-name match. The ARIA half is not decoration: this file already treats ARIA
// as first class (`[role="heading"]` opens a region, `[role="dialog"]` selects a root), and a
// pagination strip built from `<div role="navigation">` and `<div role="button">` is the same
// furniture as the tag-built one:
//
//  - `<nav>` and `[role="navigation"]`, anywhere they render. The prior cut only ever excluded nav
//    because this admin's shell (`CairnAdminShell`) renders the sidebar and the breadcrumb as
//    siblings of `<main>`, never a descendant, so nav's own weights structurally could not reach a
//    region's tally. That was an accident of THIS admin's shell, not a rule about nav; the admin
//    toolkit's own `Pagination` renders `<nav aria-label="Pagination">` NESTED inside `<main>`, and
//    its own `.btn` page buttons (daisyUI's compiled 600 weight) counted as region content until
//    this ruling.
//  - `<button>`, `[role="button"]`, and `<summary>`. A control the user OPERATES, not text the user
//    READS: every toolbar control (a search box's own filter buttons, a segmented radiogroup, a
//    facet menu trigger), every sort button on a table's own column header, a row's own delete
//    action, `Pagination`'s own page buttons, and `CairnTidySettings`' own disclosure `<summary>`.
//    This reverses the prior cut's stated position ("a button label ... is ordinary region
//    content"); the reversal is Ruling 4 itself, and the axis borrows the WCAG glossary's term
//    "user interface component" to name one side of it. The term only, never a criterion: SC 4.1.2
//    Name, Role, Value is a Level A requirement that a component's name, role, and value be
//    programmatically determinable, it draws no line about typographic weight, and an earlier draft
//    of this header cited it as though it did. The axis is cairn's own.
//  - `<header>` and `[role="banner"]`, ONLY when it contains the heading it introduces. The
//    page-header recipe (`PageHeader.svelte`, and `OfficeList.svelte`'s own pre-toolkit twin of it)
//    wraps an optional eyebrow, the page's one `h1`, and an optional meta line in one `<header>`,
//    which generalizes the heading-text exclusion below to the heading's whole title band. The
//    heading condition is what keeps that from becoming an unbounded exemption: `<header>` is legal
//    inside every article, section, and aside, so an unconditional clause hid any multi-weight
//    byline band in one, on a rule that ships to consumers rendering their own routes inside
//    `<main>` through the `CairnAdminShell` custom-route seam.
//  - `<thead>` and `[role="columnheader"]`. A table's own column-header row is a label FOR the rows
//    below it, not one of the rows: `ConceptList`'s own "Status" column header carries the same
//    eyebrow recipe (`font-semibold`, uppercase, tracking) as a page's title-band eyebrow, but sits
//    in the SAME region as the table's body rows (no heading separates a `<thead>` from its own
//    `<tbody>`), so its 600 weight counted as a third weight beside an ordinary title link (500)
//    and a plain data cell (400) until this ruling.
//
// TWO LIMITS OF THIS CUT, both demonstrated against cairn's own markup, both stated here rather
// than papered over with a heuristic (Ruling 4's own instruction):
//
//  - A `<button>` used as a row WRAPPER takes its whole content out of the rule's reach.
//    `CairnMediaLibrary` wraps an asset row's name, meta line, and status chip in one bare
//    `<button>`, so none of that text spends the budget, while `ConceptList` does the same job with
//    an `<a>` and every weight counts. The platform is why this is not resolvable here: `<button>`
//    takes phrasing content only, and the accessible-name computation makes ALL of it the control's
//    own name, so no structural signal separates a label from a wrapper. The fix belongs in the
//    component, not in this rule.
//  - An `<a class="btn">` spends the budget where the `<button class="btn">` beside it does not.
//    `EditPage`'s advisory-notice row renders exactly that pair from one `{#each}` (`{#if
//    row.href}`), so which branch the data takes decides whether the route reports. A link is a
//    user interface component under WCAG 4.1.2 too, but excluding every `<a>` would blind the rule
//    to a list route's own titles, which are the content a reader came for, and telling a
//    btn-styled anchor from a title link needs the class name this rule refuses to trust. Both
//    behaviors are fixtured in `rulings.weight-budget.test.ts` so neither drifts unnoticed. A link
//    is a user interface component in the glossary's sense too, the same borrowed term as above.
//  - `PageHeader`'s ACTION SLOT is exempt, because it renders inside the same `<header>` as the
//    `h1`. The slot is entirely caller-authored (`ConceptList` puts a create button there,
//    `CairnMediaLibrary` an upload control, a consumer anything at all), so an arbitrary amount of
//    markup is exempt by virtue of sitting in the title band, which is the unbounded hole the
//    heading condition was introduced to bound. Inside that slot neither the `<a class="btn">` nor
//    the `<button class="btn">` above spends the budget, so the limit named just above does not
//    hold there. `querySelector(HEADING_SELECTOR)` also matches a heading anywhere in the header's
//    subtree, so a `<header>` whose only heading sits in its trailing control still exempts
//    everything. Narrowing the clause to the heading's own flow is the repair, filed in ROADMAP.
//
// A heading's OWN text is excluded from the region it opens, independent of whether the heading
// also happens to sit inside a `<header>` (PageHeader's does; a bare `<h2>` mid-page does not).
// Cairn's page-heading recipe (`font-bold`, the display face) is a deliberate departure from body
// weight by design; counting it against the region it introduces would flag the ordinary "bold
// heading over plain body" shape that is the intended reading, not the violation. The heading still
// marks where the next region begins, so a heading changes what "the region" means without ever
// being IN one.
//
// Nothing else is exempted by name. A field label (`font-medium`), an ordinary link's own weight
// (a row's own title, the actual content a reader came for), an inline status tag (a draft row's
// `font-semibold` "Hidden" marker), an emphasized span: all of it is ordinary region content and all
// of it spends the two-weight budget, because letting any of those categories opt out by class name
// is exactly the kind of class-name trust chip-ground-collision and interactive-contrast both had to
// unlearn. Only the shapes above draw that line.
//
// CHROME IS EXCLUDED FROM THE TALLY AND FROM THE PARTITION BOTH. A heading inside chrome does not
// open a region, or a section-index `<nav>` dropped mid-page would split a genuine three-weight
// passage into two clean two-weight halves and silence it, with no signal that it happened. The one
// exception is a title band's own heading, which still opens the region it introduces: that is what
// `<header>` is FOR, and the band's text is excluded either way.
//
// A page with neither a `<main>` landmark nor an open dialog layer (this admin's own login screen,
// which renders outside `CairnAdminShell` and carries no landmark at all) has no content region
// this rule can identify. That is reported as its own advisory finding rather than the rule quietly
// returning no findings, the same fail-loud discipline `indeterminateFinding` establishes for a
// ground this rule cannot resolve: an empty result has to mean "measured, and clean," never "could
// not tell." A region that IS identified but yields no measurable text reports the same way, which
// the first cut did not do: an unhydrated `<main>` returned an empty candidate list and read as a
// clean page.
//
// "Visible" is the shared `isVisible` helper, not a bare nonzero rect. The bare reading counted a
// screen-reader-only element both ways: `ConceptList`'s `<th><span class="sr-only">Actions</span>`
// is the ONLY contributor of the fourth weight this rule reported on three real admin routes, a
// weight no human on the page can see, and cairn's own `<h1 class="sr-only">` on the desk route
// split a region and erased a real violation without changing anything visible.
//
// Advisory tier, by ruling (design spec 6.3): no shipped design system anywhere gates on a
// compositional weight count, so this rule reports and never fails the run. `WEIGHT_BUDGET` itself
// is the spec's stated number, not independently derived here, and is flagged in the same breath as
// a threshold worth revisiting once cairn's and a consumer's own screens have run against it.
import { ensurePageHelpers } from '../../rendered.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/**
 * The most distinct font-weights one content region may render before this rule reports it. The
 * design spec's own number (section 6.3); unvalidated against a false-positive corpus yet, so it is
 * a candidate for revision once cairn's and a consumer's own screens have run against it, not a
 * settled floor.
 */
const WEIGHT_BUDGET = 2;

/**
 * The step distinct weights are counted at. A variable-font ramp serializes its own authored
 * numbers, so a 400/410/420 progression counted as three violations of a two-weight budget while
 * reading as one weight to any eye. The ladder every static face ships on is the hundreds.
 */
const WEIGHT_STEP = 100;

/** One text-bearing element the in-page walk found, with the region it belongs to. */
interface WeightCandidate {
  selector: string;
  /** The element's own computed `font-weight`, unparsed (never a color, so no canvas round trip). */
  weight: string;
  /** Stable per-region key: which root, which heading-delimited span within it. */
  regionId: string;
  /** The region's own name for a finding's message: the root plus the heading that opened it. */
  regionLabel: string;
  /**
   * A real CSS selector for the region, which the rendered allowlist matches on. The first cut
   * reported the region LABEL here (`main › Posts`), which `querySelectorAll` throws on, so
   * suppressing an advisory finding minted an error-tier staleness finding and exit code 1.
   */
  regionSelector: string;
}

/** One region the walk opened, whether or not any body content turned up inside it. */
interface WeightRegionRoster {
  regionId: string;
  label: string;
  selector: string;
  /** The root this region belongs to, so a root already reported empty does not report twice. */
  rootSelector: string;
  /**
   * Whether a heading opened this region. The implicit region before a root's first heading is not
   * one an author declared, and on this admin it holds the title band's eyebrow and nothing else,
   * so reporting it empty would fire on every page that renders a `PageHeader`.
   */
  openedByHeading: boolean;
  /** Body-content elements measured in this region. */
  candidates: number;
  /**
   * Text-bearing elements skipped as chrome. What separates "this region rendered only furniture"
   * from "nothing rendered here at all", two conditions the fail-loud report used one wrong
   * sentence for.
   */
  chrome: number;
}

/** One content region the in-page walk identified, whether or not it had anything to measure. */
interface WeightRegionScan {
  /** Every root the walk judged, as a real CSS selector, for the fail-loud empty-root report. */
  roots: { selector: string; candidates: number; chrome: number }[];
  regions: WeightRegionRoster[];
  candidates: WeightCandidate[];
}

/**
 * Runs inside the page. Playwright serializes this by source, so it stays self-contained: every
 * helper and constant is declared inside this function's own body, and `WEIGHT_BUDGET` is read back
 * in Node rather than passed in, since the threshold decision belongs with the comparison, not the
 * collection.
 *
 * Walks the chosen root (the topmost open dialog layer, or `<main>` when none is open) in document
 * order, incrementing a region counter at each heading and recording every other visible
 * text-bearing element's computed weight against the current region, excluding chrome (a nav
 * landmark, a native button control, the page's own `<header>` title band, and a table's own
 * `<thead>` column-header row; see the file header for why each one is chrome). `hasRoot: false` is
 * the signal this admin's own login screen produces: no `<main>`, no open dialog, nothing to
 * measure.
 */
function collectWeightCandidates(): WeightRegionScan {
  const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
  // Chrome the user operates or navigates by, per the file header. Matched by tag or by the ARIA
  // role that means the same thing, never a class name, so it holds against a rewritten component.
  // A heading inside one of these does not open a region either (see `regionBlocking` below).
  const CONTROL_CHROME = 'nav, [role="navigation"], button, [role="button"], summary, thead, [role="columnheader"]';
  // A title band is chrome only when it carries the heading it introduces, which is the shape
  // PageHeader renders. Unconditional, the clause exempts any <header> in any article or section,
  // which is an unbounded hole in a rule consumers run against their own routes.
  const TITLE_BAND = 'header, [role="banner"]';
  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());
  const isVisible = (el: Element) => (helpers ? helpers.isVisible(el) : true);

  // Both tests are bounded to the subtree being walked. `closest` includes the element itself and
  // walks past the walk root all the way to `<html>`, so a root that IS one of these shapes made
  // every text node under it chrome and the region reported "rendered only chrome" instead of being
  // measured. cairn's shell renders exactly that root: `CairnAdminShell` is a `<nav>` carrying
  // `role="dialog"` below the persistent-sidebar breakpoint, and the layer selector picks a
  // `[role="dialog"]` outside `<main>` as a second root, so the sidebar's own three-weight stack was
  // structurally unmeasurable there. The 1280px default keeps the sidebar persistent so it never
  // fired in cairn's own run; `touch-targets` resizes the shared page to 390, and a consumer's
  // mobile-menu `<nav role="dialog">` hits it directly. The root, and anything above it, is context
  // rather than chrome inside the region.
  /** Whether `el` sits inside chrome the user operates, which also stops a heading opening a region. */
  function regionBlocking(el: Element | null, root: Element): boolean {
    if (el === null) return false;
    const match = el.closest(CONTROL_CHROME);
    return match !== null && match !== root && root.contains(match);
  }

  /** Whether `el`'s text is chrome: operable furniture, or a title band introducing its own heading. */
  function isChrome(el: Element, root: Element): boolean {
    if (regionBlocking(el, root)) return true;
    for (let node: Element | null = el; node && node !== root; node = node.parentElement) {
      if (node.matches(TITLE_BAND) && node.querySelector(HEADING_SELECTOR) !== null) return true;
    }
    return false;
  }

  // An open dialog layer is judged as its OWN region set, and `<main>` keeps being judged too. The
  // first cut let the topmost layer REPLACE main, and an adversarial pass showed what that costs:
  // opening any picker on `/admin/posts` took main's real four-weight violation from reported to
  // silent, and a 10x10 `role="dialog"` div anywhere on the page did the same. A layer standing
  // alone means it is not merged INTO main's tally, not that main stops being measured.
  //
  // A dialog rendered INSIDE main is part of main, not a layer over it: cairn's own
  // MediaInsertPopover is a `role="dialog"` panel nested in the page, and treating it as a
  // replacement layer deleted the region it belongs to.
  const mainEl = document.querySelector('main');
  const layers = Array.from(document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]'))
    .filter((el) => isVisible(el))
    .filter((el) => !mainEl || !mainEl.contains(el));
  const roots: Element[] = [];
  if (mainEl) roots.push(mainEl);
  if (layers.length > 0) roots.push(layers[layers.length - 1]);

  const candidates: WeightCandidate[] = [];
  const regions: WeightRegionRoster[] = [];
  const scanned: WeightRegionScan['roots'] = [];

  for (const root of roots) {
    const rootSelector = signature(root);
    const rootLabel = root === mainEl ? 'main' : rootSelector;
    let found = 0;
    let chromeFound = 0;
    const visited = new Set<Element>();
    let regionIndex = 0;
    // Every region the walk opens is rostered as it opens, including one that turns out to hold no
    // body content at all. Carrying only the regions that produced a candidate is how a region that
    // became entirely chrome vanished from the report, which reads as "measured, and clean".
    const openRegion = (label: string, selector: string, openedByHeading: boolean): WeightRegionRoster => {
      const opened = {
        regionId: `${rootLabel}::${regionIndex}`,
        label,
        selector,
        rootSelector,
        openedByHeading,
        candidates: 0,
        chrome: 0,
      };
      regions.push(opened);
      return opened;
    };
    let region = openRegion(`${rootLabel} (before any heading)`, rootSelector, false);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.matches(HEADING_SELECTOR) && isVisible(el) && !regionBlocking(el, root)) {
          regionIndex += 1;
          const headingSelector = signature(el);
          const headingName = (el.textContent ?? '').trim().slice(0, 40) || headingSelector;
          region = openRegion(`${rootLabel} › ${headingName}`, headingSelector, true);
        }
        continue;
      }
      const text = (node.textContent ?? '').trim();
      if (text.length === 0) continue;
      const el = node.parentElement;
      if (!el || visited.has(el)) continue;
      if (!isVisible(el)) continue;
      visited.add(el);
      // A heading's own text is excluded from the region it opens: it is heading chrome by design,
      // not content spending the budget. `closest` reaches the heading whether the text sits
      // directly in it or in an inline wrapper (an icon span) inside it. `isChrome` excludes the
      // other shapes the same way, by ancestor, so text nested arbitrarily deep inside a toolbar's
      // own control or a table's own header row is still caught, and it is COUNTED rather than
      // dropped so an all-chrome region can say what it is.
      if (el.closest(HEADING_SELECTOR) || isChrome(el, root)) {
        chromeFound += 1;
        region.chrome += 1;
        continue;
      }
      found += 1;
      region.candidates += 1;
      candidates.push({
        selector: signature(el),
        weight: getComputedStyle(el).fontWeight,
        regionId: region.regionId,
        regionLabel: region.label,
        regionSelector: region.selector,
      });
    }
    scanned.push({ selector: rootSelector, candidates: found, chrome: chromeFound });
  }
  return { roots: scanned, regions, candidates };
}

/**
 * At most {@link WEIGHT_BUDGET} distinct font-weights per content region (this rule's own
 * definition of that term; see the file header). Advisory tier: no shipped design system anywhere
 * gates on a compositional weight count, so a violation here reports for a designer to weigh rather
 * than blocking a run outright.
 */
export const weightBudget: RenderedRule = {
  id: 'weight-budget',
  tier: 'advisory',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ensurePageHelpers(ctx.page);
    const result = await ctx.page.evaluate(collectWeightCandidates);
    const findings: RenderedFinding[] = [];
    if (result.roots.length === 0) {
      return [
        {
          ruleId: 'weight-budget',
          tier: 'advisory',
          selector: 'html',
          message:
            `${ctx.pagePath} renders no <main> landmark and no open dialog layer, so this rule has no content ` +
            'region to measure font-weights against. Wrap the rendered content in <main>, or allowlist this ' +
            'page with a reason.',
        },
      ];
    }
    // An identified region that yielded no measurement is reported, never returned as clean. An
    // unhydrated `<main>` and an empty dialog both produced an empty candidate list, and an empty
    // result read exactly like "measured, and clean" in the report.
    //
    // The two ways that happens are different problems and say so separately. "No visible text at
    // all" is the unhydrated-root condition, a fix-in-the-app signal; a root or region that renders
    // only chrome is fully hydrated and covered in text this rule deliberately does not count. One
    // message for both was factually false about the second, which after Ruling 4's narrowing is
    // the common case: a heading followed by a toolbar or a pagination strip.
    const unmeasured = (selector: string, label: string, chrome: number): RenderedFinding => ({
      ruleId: 'weight-budget',
      tier: 'advisory',
      selector,
      message:
        chrome > 0
          ? `${label} rendered only chrome (${chrome} text-bearing element${chrome === 1 ? '' : 's'} inside a nav, ` +
            'a control, a title band, or a column-header row), so no body content was measurable in it. ' +
            'An empty result here means unmeasured, not clean.'
          : `${label} carries no visible text at all, so no font-weight could be measured in it. ` +
            'An empty result here means unmeasured, not clean.',
    });
    for (const root of result.roots) {
      if (root.candidates > 0) continue;
      findings.push(unmeasured(root.selector, 'this content region', root.chrome));
    }
    // A region a heading opened, that then held nothing but chrome, reports on its own: the root
    // above cannot speak for it, since one measurable region elsewhere keeps the root's own count
    // above zero. The implicit region before a root's first heading is excluded, since on this
    // admin it holds a `PageHeader` title band and nothing else on every single page.
    for (const region of result.regions) {
      if (!region.openedByHeading || region.candidates > 0 || region.chrome === 0) continue;
      if (result.roots.some((root) => root.candidates === 0 && root.selector === region.rootSelector)) continue;
      findings.push(unmeasured(region.selector, region.label, region.chrome));
    }

    const byRegion = new Map<string, { label: string; selector: string; candidates: WeightCandidate[] }>();
    for (const candidate of result.candidates) {
      const region =
        byRegion.get(candidate.regionId) ??
        { label: candidate.regionLabel, selector: candidate.regionSelector, candidates: [] };
      region.candidates.push(candidate);
      byRegion.set(candidate.regionId, region);
    }

    for (const { label, selector, candidates } of byRegion.values()) {
      const byWeight = new Map<number, string[]>();
      for (const candidate of candidates) {
        const parsed = Number.parseFloat(candidate.weight);
        const bucket = Number.isFinite(parsed) ? Math.round(parsed / WEIGHT_STEP) * WEIGHT_STEP : 400;
        const selectors = byWeight.get(bucket) ?? [];
        selectors.push(candidate.selector);
        byWeight.set(bucket, selectors);
      }
      if (byWeight.size <= WEIGHT_BUDGET) continue;

      findings.push({
        ruleId: 'weight-budget',
        tier: 'advisory',
        selector,
        message:
          `${label} renders ${byWeight.size} distinct font-weights against the ${WEIGHT_BUDGET}-weight budget: ` +
          [...byWeight.entries()]
            .map(
              ([weight, selectors]) =>
                `${weight} (${selectors.slice(0, 2).join(', ')}${selectors.length > 2 ? ', …' : ''})`
            )
            .join('; '),
      });
    }
    return findings;
  },
};
