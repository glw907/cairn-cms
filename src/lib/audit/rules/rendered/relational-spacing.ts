// cairn-audit's relational-spacing rule: the admin's own gap-role scale
// (`--cairn-gap-label/control/group/section`, 4/8/16/24px, `docs/internal/admin-design-system.md`'s
// grammar-tokens section) encodes a claim about HIERARCHY, not just about which literal a
// declaration uses. A field's label sits closer to its control than one field sits to the next, and
// one field sits closer to its neighbor than one section sits to the next; that ordering is what
// makes the "spacing rhythm" the craft chapter names as invisible-feel actually visible. The static
// `gap-scale` rule (spec 6.2) already proves a literal resolves to SOME named token; this rule
// proves the token chosen matches the RELATIONSHIP the markup renders, which a single declaration
// can never see on its own.
//
// Advisory by the spec's own ruling (6.3), and the reason is stated as a warning about this rule's
// own confidence, not a formality: no shipped design-system linter infers hierarchy from an
// arbitrary live DOM (the adversarial review, M5, names this rule by name as unsolved in general).
// Three narrow, DOM-shape heuristics carry the actual measurement, and each is named here exactly
// because a wrong guess here is not "camouflaged text" or "unreachable focus", it is a false claim
// about what a builder's markup means:
//
//  1. GAP-ROLE NESTING, PER AXIS. An element is a "gap-role container" only when it is a flex or
//     grid box whose own resolved `gap` lands, within a small tolerance, on one of the four token
//     values read live off the page's own `--cairn-gap-*` custom properties (never hardcoded, so a
//     consumer's own re-tuned structural scale, should one ever exist, is still what gets measured
//     against). A container whose gap does not land on the scale at all is out of scope for this
//     rule entirely; that off-scale literal is `gap-scale`'s finding, not this one's. Row gap and
//     column gap are read as two independent rhythms and each is compared only to the SAME axis on
//     the nearest ancestor that declares one. The first cut required the two to agree within half a
//     pixel and skipped the box otherwise, which is the normal shape of a grid: on the shipped
//     admin that dropped 13 boxes without a word against the 8 it compared.
//     The check compares MEASURED pixel values directly, never an asserted category order (a
//     `label` role is not coded as "smaller than" a `control` role by fiat): the four tokens are
//     already strictly ordered by the design that named them (4 < 8 < 16 < 24), so the only claim
//     is "a nested rhythm should not open wider than the rhythm that contains it".
//     An `absolute` or `fixed` box is never judged against a DOM ancestor, and the walk stops at
//     one: an out-of-flow panel is not laid out by that ancestor's gap at all. The daisyUI dropdown
//     idiom and a fixed command palette both reported a containment violation for a panel nothing
//     visually contains.
//     A bare form control (`<input>`/`<select>`/`<textarea>`) never plays the container role
//     itself, even when its own display is flex: a real admin run caught daisyUI's own `.input`
//     (`gap: .5rem` for its internal icon slot) as a spurious "gap-control rhythm nested inside
//     gap-label" on every text field in the admin. A widget's own chrome is not a layout region.
//  2. LABEL-TO-CONTROL DISTANCE, VERTICAL ONLY. Scoped to cairn's own shipped shape (FieldInput's
//     `<label class="flex flex-col gap-label"><span>Field name</span><input></label>`): a
//     column-direction flex box with EXACTLY two painted children, the first carrying its own
//     visible text and no form control ANYWHERE in its subtree, the second being the control itself
//     or its one wrapped child. The distance between them is geometric rather than the declared
//     `gap`, so a margin-driven mismatch is caught the same as a wrong gap utility, and each side's
//     own margins are SUBTRACTED, so a user-agent default no author wrote never counts against the
//     design: Chromium ships `input[type=checkbox] { margin: 3px 3px 3px 4px }`, and a correctly
//     authored `gap-label` checkbox row therefore measured 8px and was reported as `gap-control`,
//     with the verdict changing on the control type rather than on anything the author wrote.
//     The horizontal form is not checked at all. The design system states the label-gap distance
//     for a label above its control; extending it to any text-then-control row on either axis
//     flagged every caption/control pair in the admin under a message claiming the grammar names
//     that distance, and it does not. An overlap (a negative measured distance) IS reported, which
//     also covers the `dir="rtl"` render that made every horizontal measurement negative and
//     reported an entire document direction clean.
//     This deliberately does not reach a `for`/`id`-associated label rendered apart from its
//     control, a label with a third slot (a required marker, an inline hint), or a `column-reverse`
//     box (DOM order and paint order diverge there); those shapes are not checked, not passed.
//  3. SAME-LEVEL SIBLING EQUALITY. A "same level" is read structurally: four or more elements
//     sharing one parent and the same signature, with at least one class or id token so a bare,
//     unstyled `<div>` never seeds a group. Four, not three: two gaps are not a rhythm, and the
//     median of two put the OUTLIER at the norm and blamed a conforming row. Each consecutive pair
//     is classified before it is measured. Boxes that do not overlap on the cross axis straddle a
//     WRAP and carry no rhythm claim; boxes that do overlap and still measure negative are an
//     OVERLAP and are reported as one. The remaining gaps are compared against the group's own
//     median, and an outlier beyond the larger of 2px or 20% of that median is reported.
//     A median of zero (the flush, divider-separated list idiom) is a legitimate rhythm rather than
//     a reason to abstain; the absolute floor carries that case.
//
// Every measurement runs inside one `page.evaluate` call, which the serializer forbids from closing
// over anything: every constant arrives through the `arg` parameter, every helper is nested, and
// the shared measurement helpers are reached through the `globalThis.__cairnAudit` the rule installs
// on the page first. No color arithmetic is involved, so unlike this family's other rules there is
// no `resolveColors` half to this rule at all.
import { ensurePageHelpers } from '../../rendered.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/**
 * Two measured pixel values within this distance of each other are treated as the same
 * measurement, absorbing the sub-pixel rounding a browser's own layout engine introduces. The four
 * gap tokens are spaced at least 4px apart, so this tolerance cannot conflate two different roles.
 */
const TOLERANCE_PX = 1.5;

/**
 * A same-level sibling's gap must deviate from its group's median by more than this fraction of
 * the median (or {@link TOLERANCE_PX_FLOOR}, whichever is larger) to be reported, so a design that
 * is merely a pixel or two uneven under real font rendering does not read as broken rhythm.
 */
const SIBLING_REL_TOLERANCE = 0.2;

/** The absolute floor under {@link SIBLING_REL_TOLERANCE}'s relative check, for a small median. */
const TOLERANCE_PX_FLOOR = 2;

/** One raw finding, read entirely in-browser and left unclassified; the caller adds `ruleId`/`tier`. */
interface SpacingCandidate {
  selector: string;
  message: string;
}

/**
 * Runs inside the page. Playwright serializes this by source, so it stays self-contained: every
 * helper is nested and every constant arrives through `args` rather than closing over module scope.
 *
 * Resolves the four `--cairn-gap-*` tokens by painting each onto a detached flex box and reading
 * its computed `gap` back, the same "ask the browser, never parse the declaration" discipline
 * `resolveColors` uses for color: a token's authored value (`0.25rem`) is not what a page actually
 * renders once the root font-size or a zoom level is in play, and the computed `gap` is.
 */
function readRelationalSpacing(args: { tolerancePx: number; siblingRelTolerance: number; siblingFloorPx: number }): SpacingCandidate[] {
  const { tolerancePx, siblingRelTolerance, siblingFloorPx } = args;
  const findings: SpacingCandidate[] = [];
  const ROLES = ['label', 'control', 'group', 'section'] as const;

  // The built admin sheet scopes the grammar tokens' :root rule down to
  // `[data-theme='cairn-admin'/-dark']` at compile time (the same scoper `one-filled-action`
  // ran into for --color-primary): a scratch element parented on document.body sits OUTSIDE
  // that wrapper and inherits nothing. Reading through the wrapper when one exists, falling back
  // to body for a page (or a fixture) that declares the tokens on a bare :root instead, is what
  // reaches both shapes.
  const themeRoot =
    document.querySelector<HTMLElement>("[data-theme='cairn-admin'], [data-theme='cairn-admin-dark']") ??
    document.body;
  const tokenPx: Partial<Record<(typeof ROLES)[number], number>> = {};
  for (const role of ROLES) {
    const scratch = document.createElement('div');
    scratch.style.cssText = `position:absolute;visibility:hidden;display:flex;gap:var(--cairn-gap-${role})`;
    themeRoot.appendChild(scratch);
    const value = Number.parseFloat(getComputedStyle(scratch).columnGap);
    scratch.remove();
    if (Number.isFinite(value) && value > 0) tokenPx[role] = value;
  }
  const missing = ROLES.filter((role) => tokenPx[role] === undefined);
  if (missing.length > 0) {
    return [
      {
        selector: 'html',
        message:
          `could not resolve --cairn-gap-${missing.join(', --cairn-gap-')} on this page, so no gap-role ` +
          `measurement could be made. Declare cairn's grammar tokens (or allowlist this page if it ` +
          `deliberately renders outside the admin theme root) rather than leaving the check unanswered.`,
      },
    ];
  }
  const resolved = tokenPx as Record<(typeof ROLES)[number], number>;

  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());
  const isPainted = (el: Element) => (helpers ? helpers.isVisible(el) : true);

  /** The named role a measured pixel gap resolves to, or `null` when it lands on none of the four. */
  function roleFor(px: number): (typeof ROLES)[number] | null {
    for (const role of ROLES) {
      if (Math.abs(px - resolved[role]) <= tolerancePx) return role;
    }
    return null;
  }

  function outOfFlow(el: Element): boolean {
    const position = getComputedStyle(el).position;
    return position === 'absolute' || position === 'fixed';
  }

  /**
   * A margin's contribution to the edge-to-edge distance, for the purpose of removing user-agent
   * defaults from a design measurement. Only a POSITIVE margin is removed: no user agent ships a
   * negative one, so a negative margin is authored intent, and subtracting it cancelled out the
   * very overlap the measurement is meant to catch.
   */
  function uaMargin(value: string): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  const CONTROL_SELECTOR = 'input, select, textarea, [role="combobox"]';
  // Excluding the label slot searches the whole subtree deliberately (a label part that hides a
  // stray control anywhere inside it is not the two-slot shape this heuristic means to read at
  // all). MATCHING the control slot is intentionally narrower: the control itself, or its sole
  // wrapped child (an icon-affordance wrapper around a bare input). A real admin run demonstrated
  // why the wide form is wrong: CairnAdminShell's whole `.drawer-content` reads as exactly two
  // painted children (the topbar, the routed page), and the page happens to contain a search
  // input dozens of nodes deep, so the topbar's entire aggregated text was read as a "label"
  // sitting "0px from its control." A close match reaches FieldInput's real shape and nothing
  // wider than it.
  const isControlAnywhere = (el: Element) => el.matches(CONTROL_SELECTOR) || el.querySelector(CONTROL_SELECTOR) !== null;
  const isCloseControl = (el: Element) =>
    el.matches(CONTROL_SELECTOR) || (el.children.length === 1 && el.children[0].matches(CONTROL_SELECTOR));

  // Heuristic 1: gap-role nesting, read PER AXIS. A box's row gap and its column gap are two
  // independent rhythms, and the first cut skipped any box whose two differed by more than half a
  // pixel, which is the normal shape of a grid: on the shipped admin that dropped 13 boxes
  // silently against 8 it actually compared, including three `/admin/vocabulary` grids whose 16px
  // column gap is exactly `gap-group`. Comparing each axis to the same axis one level up keeps the
  // asymmetric case measurable without ever comparing a column rhythm to a row one.
  //
  // A bare form control never plays the container role, even when its own display is flex:
  // daisyUI's `.input` sets `gap: .5rem` for its own icon slot, an implementation detail of one
  // leaf widget, and a real admin run reported it as "a gap-control rhythm nested inside gap-label"
  // on every text field in the admin. A widget's own chrome is not a layout region.
  type Axis = 'row' | 'column';
  interface GapBox {
    el: Element;
    axis: Axis;
    role: (typeof ROLES)[number];
    px: number;
  }
  const gapBoxes: GapBox[] = [];
  const gapBoxesByEl = new Map<Element, GapBox[]>();
  for (const el of document.querySelectorAll('*')) {
    if (!isPainted(el) || el.matches(CONTROL_SELECTOR)) continue;
    const style = getComputedStyle(el);
    if (!['flex', 'inline-flex', 'grid', 'inline-grid'].includes(style.display)) continue;
    for (const axis of ['row', 'column'] as Axis[]) {
      const value = Number.parseFloat(axis === 'row' ? style.rowGap : style.columnGap);
      if (!Number.isFinite(value) || value <= 0) continue;
      const role = roleFor(value);
      if (!role) continue;
      const box: GapBox = { el, axis, role, px: value };
      gapBoxes.push(box);
      const list = gapBoxesByEl.get(el) ?? [];
      list.push(box);
      gapBoxesByEl.set(el, list);
    }
  }
  // A shorthand `gap` sets both axes, so the usual violation is found twice. One containment claim
  // about one pair of boxes is one finding, naming the axes it holds on.
  const nested = new Map<string, { box: GapBox; ancestor: GapBox; axes: Axis[] }>();
  for (const box of gapBoxes) {
    // An out-of-flow box is not laid out by any ancestor's gap, so no containment claim holds over
    // it. The daisyUI dropdown idiom (an `absolute` `.dropdown-content` inside a `relative`
    // `.dropdown`) and a `fixed` command palette both reported "a nested rhythm opening wider than
    // what contains it" for panels that are not visually inside anything.
    if (outOfFlow(box.el)) continue;
    let ancestorEl: Element | null = box.el.parentElement;
    let reachable = true;
    while (ancestorEl && !gapBoxesByEl.get(ancestorEl)?.some((candidate) => candidate.axis === box.axis)) {
      if (outOfFlow(ancestorEl)) {
        reachable = false;
        break;
      }
      ancestorEl = ancestorEl.parentElement;
    }
    if (!reachable || !ancestorEl) continue;
    const ancestor = gapBoxesByEl.get(ancestorEl)?.find((candidate) => candidate.axis === box.axis);
    if (!ancestor || box.px <= ancestor.px + tolerancePx) continue;
    const key = `${signature(box.el)}|${signature(ancestor.el)}|${box.px}|${ancestor.px}`;
    const merged = nested.get(key);
    if (merged) merged.axes.push(box.axis);
    else nested.set(key, { box, ancestor, axes: [box.axis] });
  }
  for (const { box, ancestor, axes } of nested.values()) {
    findings.push({
      selector: signature(box.el),
      message:
        `renders a gap-${box.role} ${axes.join('/')} rhythm (${Math.round(box.px)}px) nested inside a ` +
        `gap-${ancestor.role} container (${signature(ancestor.el)}, ${Math.round(ancestor.px)}px); a nested ` +
        `rhythm should not open wider than what contains it`,
    });
  }

  // Heuristic 2: label-to-control distance, cairn's own two-slot label shape, VERTICAL ONLY.
  //
  // The horizontal form is dropped, and the evidence for dropping it is that the design system
  // never states it. The label-gap rule names the distance from a label to the control BELOW it;
  // extrapolating "exactly 4px between any text-then-control flex pair on either axis" produced a
  // finding on every horizontal caption/control row in the admin (a pagination count beside its
  // page-size select) with a message claiming the grammar names that distance. It does not.
  //
  // The measurement also subtracts each side's own margins, so a user-agent default no author
  // wrote never counts against the design. Chromium ships `input[type=checkbox] { margin: 3px 3px
  // 3px 4px }`, and a perfectly-authored `gap-label` checkbox row therefore measured 8px
  // edge-to-edge and was reported as `gap-control`: the finding's own diagnosis was wrong, and the
  // verdict changed with the control TYPE rather than with anything the author wrote.
  for (const container of document.querySelectorAll('*')) {
    if (!isPainted(container)) continue;
    const style = getComputedStyle(container);
    if (style.display !== 'flex' && style.display !== 'inline-flex') continue;
    if (style.flexDirection !== 'column') continue;
    const kids = Array.from(container.children).filter((child) => isPainted(child));
    if (kids.length !== 2) continue;
    const [labelPart, controlPart] = kids;
    if (isControlAnywhere(labelPart) || !isCloseControl(controlPart)) continue;
    const text = (labelPart.textContent ?? '').trim();
    if (text.length === 0) continue;
    const labelRect = labelPart.getBoundingClientRect();
    const controlRect = controlPart.getBoundingClientRect();
    const labelStyle = getComputedStyle(labelPart);
    const controlStyle = getComputedStyle(controlPart);
    const measured =
      controlRect.top - labelRect.bottom - uaMargin(labelStyle.marginBottom) - uaMargin(controlStyle.marginTop);
    if (!Number.isFinite(measured)) continue;
    if (measured < -tolerancePx) {
      findings.push({
        selector: signature(container),
        message:
          `label "${text.slice(0, 40)}" OVERLAPS its control by ${Math.round(-measured)}px; a label sits at ` +
          `the ${Math.round(resolved.label)}px gap-label distance above its control, never on top of it`,
      });
      continue;
    }
    if (Math.abs(measured - resolved.label) <= tolerancePx) continue;
    const role = roleFor(measured);
    findings.push({
      selector: signature(container),
      message:
        `label "${text.slice(0, 40)}" sits ${Math.round(measured)}px from its control` +
        `${role ? ` (resolves to gap-${role})` : ' (off the gap scale entirely)'}, not the ` +
        `${Math.round(resolved.label)}px gap-label distance the grammar names for a label`,
    });
  }

  // Heuristic 3: same-level sibling equality, groups of three or more identically-signed siblings.
  //
  // Three things the first cut got wrong, all demonstrated on the shipped admin, all of which
  // silenced the whole group rather than the one pair that could not be read:
  //
  //  - ONE negative gap discarded the entire group. A wrapping same-signature card grid (the media
  //    library's own shape) produces one negative gap per wrap, so every such group abstained no
  //    matter how broken its rhythm was, and an overlap earlier in a list erased a genuine finding
  //    later in it. A pair is now classified: boxes that do not overlap on the cross axis are a
  //    WRAP boundary and carry no rhythm claim, while boxes that do overlap and still measure
  //    negative are an OVERLAP, which is a worse spacing defect than the one this heuristic was
  //    written for and is now reported as one.
  //  - A median of zero disabled the check. Flush rows separated by dividers are a legitimate
  //    rhythm, and an outlier against it is exactly the finding worth making; the floor carries
  //    that case instead.
  //  - Two gaps were enough to declare a norm, and the upper-median then made the OUTLIER the norm
  //    and blamed a conforming row. Three gaps (four siblings) is the floor for a rhythm to exist.
  const parents = new Set<Element>();
  for (const el of document.querySelectorAll('*')) if (el.parentElement) parents.add(el.parentElement);
  for (const parent of parents) {
    const children = Array.from(parent.children).filter((child) => isPainted(child));
    if (children.length < 4) continue;
    const groups = new Map<string, Element[]>();
    for (const child of children) {
      const sig = signature(child);
      if (!sig.includes('#') && !sig.includes('.')) continue;
      const list = groups.get(sig) ?? [];
      list.push(child);
      groups.set(sig, list);
    }
    for (const [sig, group] of groups) {
      if (group.length < 4) continue;
      const rects = group.map((child) => child.getBoundingClientRect());
      const vertical = rects[1].top - rects[0].bottom >= rects[1].left - rects[0].right;
      const measured: { index: number; gap: number }[] = [];
      for (let i = 1; i < rects.length; i += 1) {
        const previous = rects[i - 1];
        const current = rects[i];
        // Collinear on the cross axis: the two boxes share a line. When they do not, the pair
        // straddles a wrap and the axis assumption does not hold, so it carries no claim.
        const collinear = vertical
          ? Math.min(previous.right, current.right) - Math.max(previous.left, current.left) > 0
          : Math.min(previous.bottom, current.bottom) - Math.max(previous.top, current.top) > 0;
        if (!collinear) continue;
        const gap = vertical ? current.top - previous.bottom : current.left - previous.right;
        if (!Number.isFinite(gap)) continue;
        if (gap < -tolerancePx) {
          findings.push({
            selector: signature(group[i]),
            message:
              `OVERLAPS its preceding same-level sibling by ${Math.round(-gap)}px (${sig} under ` +
              `${signature(parent)}); same-level siblings sit apart on the gap scale, never on top of each other`,
          });
          continue;
        }
        measured.push({ index: i, gap: Math.max(0, gap) });
      }
      if (measured.length < 3) continue;
      const sorted = measured.map((entry) => entry.gap).sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
      const floor = Math.max(siblingFloorPx, median * siblingRelTolerance);
      for (const entry of measured) {
        if (Math.abs(entry.gap - median) <= floor) continue;
        findings.push({
          selector: signature(group[entry.index]),
          message:
            `sits ${Math.round(entry.gap)}px from its preceding same-level sibling (${sig} under ` +
            `${signature(parent)}), while the group's other gaps measure ~${Math.round(median)}px`,
        });
      }
    }
  }

  return findings;
}

/**
 * Gap monotonicity (a nested rhythm never opens wider than the rhythm containing it), label-to-
 * control distance, and same-level sibling gap equality, over cairn's own `--cairn-gap-*` scale.
 * Advisory by spec ruling: every measurement here rests on a DOM-shape heuristic inferring which
 * elements play "label", "same level", or "nested rhythm" (documented above, in this file's own
 * header), and no shipped design-system linter has ever attempted that inference, so a wrong guess
 * is a real, standing possibility rather than a settled edge case. Reporting the guess rather than
 * gating on it is what lets it be graded honestly.
 */
export const relationalSpacing: RenderedRule = {
  id: 'relational-spacing',
  tier: 'advisory',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ensurePageHelpers(ctx.page);
    const candidates = await ctx.page.evaluate(readRelationalSpacing, {
      tolerancePx: TOLERANCE_PX,
      siblingRelTolerance: SIBLING_REL_TOLERANCE,
      siblingFloorPx: TOLERANCE_PX_FLOOR,
    });
    return candidates.map((candidate) => ({
      ruleId: 'relational-spacing',
      tier: 'advisory' as const,
      selector: candidate.selector,
      message: candidate.message,
    }));
  },
};
