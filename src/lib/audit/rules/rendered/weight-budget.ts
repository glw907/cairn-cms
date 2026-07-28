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
// a new one that runs until the next. Two exclusions fall directly out of that boundary rather than
// needing their own carve-out:
//
//  - `<nav>` is never scanned at all, because it lives OUTSIDE `<main>` in this admin's shell
//    (CairnAdminShell renders the sidebar and the breadcrumb as siblings of `<main>`, never a
//    descendant), so nav's own weights structurally cannot reach any region's tally.
//  - A heading's OWN text is excluded from the region it opens. Cairn's page-heading recipe
//    (`font-bold`, the display face) is a deliberate departure from body weight by design; counting
//    it against the region it introduces would flag the ordinary "bold heading over plain body"
//    shape that is the intended reading, not the violation. The heading still marks where the next
//    region begins, so a heading changes what "the region" means without ever being IN one.
//
// Nothing else is exempted by name. A field label (`font-medium`), an eyebrow legend
// (`font-semibold`), a table header cell styled with the eyebrow recipe, an emphasized span, a
// button label: all of it is ordinary region content and all of it spends the two-weight budget,
// because letting any one of those categories opt out by class name is exactly the kind of
// class-name trust chip-ground-collision and interactive-contrast both had to unlearn. Whether the
// eyebrow/label register specifically deserves its own exemption (cairn's three-level label recipe
// legitimately stacks a 600-weight legend over a 500-weight field label over 400-weight body, which
// is three weights in one region under this definition) is a judgment call this rule takes the
// strict reading on and flags for ratification rather than resolving unilaterally; see the file's
// test suite for the fixture that exercises it.
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

/** One content region the in-page walk identified, whether or not it had anything to measure. */
interface WeightRegionScan {
  /** Every root the walk judged, as a real CSS selector, for the fail-loud empty-root report. */
  roots: { selector: string; candidates: number }[];
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
 * text-bearing element's computed weight against the current region. `hasRoot: false` is the signal
 * this admin's own login screen produces: no `<main>`, no open dialog, nothing to measure.
 */
function collectWeightCandidates(): WeightRegionScan {
  const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());
  const isVisible = (el: Element) => (helpers ? helpers.isVisible(el) : true);

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
  const scanned: { selector: string; candidates: number }[] = [];

  for (const root of roots) {
    const rootSelector = signature(root);
    const rootLabel = root === mainEl ? 'main' : rootSelector;
    let found = 0;
    const visited = new Set<Element>();
    let regionIndex = 0;
    let headingName = '';
    let regionSelector = rootSelector;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.matches(HEADING_SELECTOR) && isVisible(el)) {
          regionIndex += 1;
          headingName = (el.textContent ?? '').trim().slice(0, 40) || signature(el);
          regionSelector = signature(el);
        }
        continue;
      }
      const text = (node.textContent ?? '').trim();
      if (text.length === 0) continue;
      const el = node.parentElement;
      // A heading's own text is excluded from the region it opens: it is heading chrome by design,
      // not content spending the budget. `closest` reaches the heading whether the text sits
      // directly in it or in an inline wrapper (an icon span) inside it.
      if (!el || visited.has(el) || el.closest(HEADING_SELECTOR)) continue;
      if (!isVisible(el)) continue;
      visited.add(el);
      found += 1;
      candidates.push({
        selector: signature(el),
        weight: getComputedStyle(el).fontWeight,
        regionId: `${rootLabel}::${regionIndex}`,
        regionLabel: regionIndex === 0 ? `${rootLabel} (before any heading)` : `${rootLabel} › ${headingName}`,
        regionSelector,
      });
    }
    scanned.push({ selector: rootSelector, candidates: found });
  }
  return { roots: scanned, candidates };
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
    for (const root of result.roots) {
      if (root.candidates > 0) continue;
      findings.push({
        ruleId: 'weight-budget',
        tier: 'advisory',
        selector: root.selector,
        message:
          'this content region carries no visible text at all, so no font-weight could be measured in it. ' +
          'An empty result here means unmeasured, not clean.',
      });
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
