// cairn-audit's vertical-alignment measurement module: the one place the geometry of "do these two
// things in a row line up" is defined. Both callers share it, the standalone inventory probe
// (scripts/probe-vertical-alignment.mjs) and the rendered `vertical-alignment` rule, so the three
// measurement traps below are encoded once rather than relearned per artifact.
//
// THE THREE TRAPS, each one a wrong answer a real probe already produced against a real screen.
//
// 1. PAIR WITH THE LINE, NOT THE BLOCK. An icon beside a multi-line text block aligns with the
//    block's FIRST LINE box. Comparing against the block reported 29 to 68px of phantom delta on
//    rows that were composed correctly. `firstTextLeaf` plus `getClientRects()[0]` is the whole fix:
//    the first rect a Range yields over a text run IS that run's first line box.
// 2. READ TYPE METRICS OFF THE ELEMENT THAT RENDERS THE LINE. Resolving font metrics from the text
//    CONTAINER rather than the element that owns the line box returned -0.4px, "this row is fine",
//    on the row whose icons visibly ride high. Every metric here comes from
//    `getComputedStyle(lineOwner)`, where `lineOwner` is the text node's own parent element.
// 3. MEASURE INK, NOT ELEMENT BOXES. An SVG's element box centres while its drawn ink rides high:
//    a 24x24 glyph whose art occupies rows 2 through 14 of its viewBox reads as centred by
//    `getBoundingClientRect` and 4px high by its ink. Icon geometry is therefore `getBBox()` mapped
//    through `getScreenCTM()`, and text geometry is the glyph box off a Range. An element box is
//    used only where the border box IS the visual object (a control), or as an explicitly MARKED
//    fallback for an icon that carries no SVG geometry (an `<img>`, a background-image tile), which
//    a caller can tell apart through {@link MemberAnchor.geometry}.
//
// THE METRIC IS CHOSEN BY THE PAIR'S CLASS, and that split is not a refinement, it is the
// difference between a useful rule and a rule nobody can leave on. A mixed-size text pair sharing a
// baseline is CORRECT typography whose glyph centres diverge by design; measuring it by centre
// reports every well-set heading-plus-eyebrow row as broken. See {@link metricForPairClass}.
//
// SPLIT BY DESIGN: {@link collectVerticalPairsInPage} runs inside the browser and only reads
// geometry; classification and the delta are pure functions over what it returns. Playwright
// serializes an evaluated function by source, so it can reference nothing outside its own body,
// and a module that computed the class in-page would have to keep a second copy of the rules.
// Keeping the judgment on the Node side keeps it single, and unit-testable without a browser.
import { ensurePageHelpers } from '../../rendered.js';
import type { RenderedPage } from '../../rendered.js';

/** The delta magnitude a pair must exceed, in its own metric, to be worth reporting at all. */
export const VERTICAL_REPORTING_BAR_PX = 2;

/**
 * The tallest a row member may be and still be measured as a row member. A vertical-alignment row
 * is a band of content sharing one line: a stacked field (label, gap, control) reaches about 57px
 * and a table cell about 49px, so 96px clears every composition this module is about while
 * excluding a page's layout columns, whose "alignment" is a layout question rather than a row one.
 * Pairs excluded this way are counted rather than dropped silently.
 */
export const DEFAULT_ROW_ITEM_MAX_HEIGHT_PX = 96;

/**
 * The recipes whose glyph is expected to sit optically centred inside its own padding box. These
 * are the shapes where CSS centres the line box while the eye centres the glyphs, so the two
 * disagree by the font's own descent budget even when nothing is misconfigured.
 */
export const DEFAULT_OPTICAL_SELECTOR = '.btn, .badge, .status-chip, .type-chip, .type-label, kbd';

/** What a row member's vertical reading is anchored on, which decides which metric can read it. */
export type MemberKind =
  /** A run of rendered text; carries a baseline and a cap centre. */
  | 'text'
  /** A drawn glyph (an SVG, an `<img>`, a background-image tile). */
  | 'icon'
  /** A form control or button, on its own or as the single control inside a composite field. */
  | 'control'
  /** The padding box a glyph is meant to sit optically centred in; only ever the `b` of an optical pair. */
  | 'box';

/**
 * Where a member's vertical numbers actually came from. `element-box` on an `icon` member is the
 * marked fallback: the reading is the border box, so it cannot see ink that rides high inside it,
 * and a caller reporting that member should say so rather than present it as an ink measurement.
 */
export type GeometrySource = 'ink' | 'glyph' | 'element-box';

/** One row member's vertical geometry, everything a metric might need, resolved once in the page. */
export interface MemberAnchor {
  kind: MemberKind;
  /** A valid CSS selector naming the element the reading came off, for a finding's own report. */
  selector: string;
  /** The element's `class` attribute verbatim, which the probe attributes back to a source file. */
  classes: string;
  geometry: GeometrySource;
  /** Top of the measured content: ink for an icon, glyph box for text, border box for a control. */
  topPx: number;
  bottomPx: number;
  /** Centre of that same measured content. The reading `content-centre` reads for a non-text member. */
  contentCentrePx: number;
  /** Centre of the element's own border box, kept beside the content reading so a caller can show both. */
  elementCentrePx: number;
  /** The alphabetic baseline, or null on a member that renders no line box. */
  baselinePx: number | null;
  /**
   * The midpoint of the cap band (baseline to cap height), or null on a member with no line box.
   * This is the optical centre of a title or a label: a descender is below the visual mass the eye
   * centres on, so the glyph box's own midpoint sits too low to compare an icon against.
   */
  capCentrePx: number | null;
  /** The member's text run, truncated, so a report can name a row a reader will recognize. */
  text: string;
  /**
   * The member is a composite whose label ink finishes above its control's box: the `0.92.0`
   * stacked-register shape. Read off rendered geometry rather than a class name, so it holds for
   * whatever markup produced it.
   */
  stacked: boolean;
}

/** Where a pair was found, which decides how a finding describes it. */
export type RowKind = 'flex-grid-row' | 'table-row' | 'optical-suspect';

/**
 * A pair's class, named `<kind>-beside-<kind>` with the kinds in alphabetical order, so the spec's
 * own vocabulary (`icon-beside-text`, `control-beside-text`, `text-beside-text`) falls out
 * unchanged. `control-beside-control` is the stacked-field season row, which the spec's three
 * pairing names have no home for; it takes the same metric as `control-beside-text`.
 */
export type PairClass =
  | 'control-beside-control'
  | 'control-beside-icon'
  | 'control-beside-text'
  | 'icon-beside-icon'
  | 'icon-beside-text'
  | 'text-beside-text'
  | 'optical-suspect';

/** The reading a pair's delta is taken over. */
export type PairMetric =
  /** Alphabetic baselines, the only correct metric for two runs of text. */
  | 'baseline'
  /** Visible-content centres: ink for an icon, cap band for text, border box for a control. */
  | 'content-centre'
  /** A glyph's cap centre against the padding box it is meant to sit centred in. */
  | 'optical-centre';

/** One candidate pair as the page reported it, before any classification or delta. */
export interface RawPair {
  rowKind: RowKind;
  /** A selector naming the container the pair was found in, or the element itself for an optical pair. */
  rowSelector: string;
  rowClasses: string;
  /** The container's computed `align-items`, the property a recipe fix usually changes. */
  alignItems: string;
  /** The union box of both members, which the probe crops a screenshot from. */
  rowBox: { topPx: number; bottomPx: number; leftPx: number; rightPx: number };
  /** The left-hand member. For an optical pair, the glyph. */
  a: MemberAnchor;
  /** The right-hand member. For an optical pair, the padding box of the same element. */
  b: MemberAnchor;
}

/** A {@link RawPair} with its class, its metric, and the delta that metric reads. */
export interface MeasuredPair extends RawPair {
  pairClass: PairClass;
  metric: PairMetric;
  /**
   * `a`'s reading minus `b`'s, in CSS pixels. NEGATIVE means the left-hand member's visual content
   * rides HIGH, above the right-hand member's; positive means it sits low. On an optical pair,
   * negative means the glyph rides high inside its own padding box.
   *
   * The sign is oriented this way so a reading matches the evidence this module was calibrated
   * against: the `/join` card icons measured -2.80 to -5.10px, icon ink centre against title cap
   * centre, with the icon on the left.
   */
  deltaPx: number;
  /** `Math.abs(deltaPx)`, which is what the reporting bar is applied to. */
  magnitudePx: number;
}

/** What the in-page walk saw, so a caller can state its own coverage rather than imply it. */
export interface VerticalMetricsDiagnostics {
  rowsWalked: number;
  pairsFound: number;
  /** Pairs dropped because a member was taller than the row-member cap. */
  pairsSkippedTooTall: number;
  /** Row members whose visible content resolved to no anchor at all. */
  anchorsUnresolved: number;
  /** Icon members measured by their element box because no SVG geometry was reachable. */
  iconElementBoxFallbacks: number;
  /** Text members whose font metrics the browser would not resolve, so no baseline was read. */
  textMetricsUnresolved: number;
  /** Pairs whose class had no reading on one member, so no delta exists. */
  pairsUnmeasurable: number;
}

/** Everything the in-page walk needs, since a serialized function closes over nothing. */
export interface VerticalMetricsArgs {
  /** The subtree to walk. Defaults to `body`. */
  rootSelector?: string;
  maxItemHeightPx?: number;
  /** The recipes to take an optical reading on. Defaults to {@link DEFAULT_OPTICAL_SELECTOR}. */
  opticalSelector?: string;
}

/** What {@link collectVerticalPairsInPage} hands back across the browser boundary. */
export interface VerticalMetricsPageResult {
  pairs: RawPair[];
  diagnostics: VerticalMetricsDiagnostics;
}

/**
 * The structural slice of SVG geometry this module calls. Typed here rather than reached for
 * through `SVGGraphicsElement`, because the walk holds plain `Element`s and only one branch ever
 * asks for geometry: a narrow local shape makes that branch's cast a stated assumption rather than
 * a blanket assertion about the whole DOM.
 */
interface SvgInkGeometry {
  getBBox(): { x: number; y: number; width: number; height: number };
  getScreenCTM(): { b: number; d: number; f: number } | null;
}

/**
 * Walk `rootSelector`'s subtree and return every candidate sibling pair with both members' vertical
 * geometry resolved. Runs inside the page: Playwright serializes it by source, so every helper is
 * nested and every parameter arrives through `args`.
 *
 * BASELINE DERIVATION AND ITS ERROR BOUND. A run's baseline is
 * `rect.top + (rect.height - (fontAscent + fontDescent)) / 2 + fontAscent`, where `rect` is the
 * run's first client rect and the font metrics come from a canvas `measureText` under the line
 * owner's own resolved font. Chromium hands back the FONT box for a text run (height
 * `fontAscent + fontDescent`), where the half-leading term is zero and the formula reduces to
 * `rect.top + fontAscent`; the term keeps it exact on an engine that returns the line box instead,
 * since CSS distributes leading evenly above and below. The one shape it does not model is a run
 * sharing its line with a taller inline sibling that grew the line box: there the reading can trail
 * the true baseline, which is why a caller reports a magnitude and a crop rather than a bare number.
 *
 * Cap height is MEASURED, not approximated: `measureText('H').actualBoundingBoxAscent` under the
 * same font is the resolved face's own cap height, so no per-font ratio is assumed anywhere here.
 */
export function collectVerticalPairsInPage(args: Required<VerticalMetricsArgs>): VerticalMetricsPageResult {
  const { rootSelector, maxItemHeightPx, opticalSelector } = args;
  const CONTROL_SELECTOR =
    'input, select, textarea, button, [role="button"], [role="checkbox"], [role="switch"], ' +
    '.btn, .input, .select, .textarea, .checkbox, .toggle, .radio';
  const ICON_SELECTOR = 'svg, img, [data-icon]';

  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());
  const isVisible = (el: Element) => (helpers ? helpers.isVisible(el) : true);
  const paint = document.createElement('canvas').getContext('2d');
  const capHeightByFont = new Map<string, number>();

  const diagnostics: VerticalMetricsDiagnostics = {
    rowsWalked: 0,
    pairsFound: 0,
    pairsSkippedTooTall: 0,
    anchorsUnresolved: 0,
    iconElementBoxFallbacks: 0,
    textMetricsUnresolved: 0,
    pairsUnmeasurable: 0,
  };

  function round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  function classesOf(el: Element): string {
    return (el.getAttribute('class') ?? '').trim();
  }

  /** The canvas font string for the element that OWNS the line box, never an ancestor's (trap 2). */
  function fontOf(lineOwner: Element): string {
    const style = getComputedStyle(lineOwner);
    return style.font || `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  }

  /** The resolved face's own cap height, measured off a capital under that exact font. */
  function capHeightFor(font: string): number {
    if (!paint) return 0;
    const cached = capHeightByFont.get(font);
    if (cached !== undefined) return cached;
    paint.font = font;
    const measured = paint.measureText('H').actualBoundingBoxAscent;
    const height = Number.isFinite(measured) ? measured : 0;
    capHeightByFont.set(font, height);
    return height;
  }

  /** The trimmed span of a text node as a Range, or null when the node is only whitespace. */
  function trimmedRange(node: Text): Range | null {
    const raw = node.textContent ?? '';
    const start = raw.length - raw.trimStart().length;
    const end = raw.trimEnd().length;
    if (end <= start) return null;
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    return range;
  }

  /**
   * A text run's anchor, read off its FIRST line box (trap 1) with metrics from the element that
   * owns that line (trap 2).
   */
  function textAnchor(node: Text, lineOwner: Element | null): MemberAnchor | null {
    if (!lineOwner || !paint) return null;
    const range = trimmedRange(node);
    if (!range) return null;
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
    range.detach();
    if (rects.length === 0) return null;
    const rect = rects[0];
    const font = fontOf(lineOwner);
    paint.font = font;
    const text = (node.textContent ?? '').trim();
    const metrics = paint.measureText(text);
    const fontAscent = metrics.fontBoundingBoxAscent;
    const fontDescent = metrics.fontBoundingBoxDescent;
    if (!Number.isFinite(fontAscent) || !Number.isFinite(fontDescent)) {
      diagnostics.textMetricsUnresolved += 1;
      return null;
    }
    const baseline = rect.top + (rect.height - (fontAscent + fontDescent)) / 2 + fontAscent;
    const inkTop = baseline - metrics.actualBoundingBoxAscent;
    const inkBottom = baseline + metrics.actualBoundingBoxDescent;
    const elementRect = lineOwner.getBoundingClientRect();
    return {
      kind: 'text',
      selector: signature(lineOwner),
      classes: classesOf(lineOwner),
      geometry: 'glyph',
      topPx: round(inkTop),
      bottomPx: round(inkBottom),
      contentCentrePx: round((inkTop + inkBottom) / 2),
      elementCentrePx: round((elementRect.top + elementRect.bottom) / 2),
      baselinePx: round(baseline),
      capCentrePx: round(baseline - capHeightFor(font) / 2),
      text: text.slice(0, 40),
      stacked: false,
    };
  }

  /** An icon's drawn ink in client coordinates, or null where no SVG geometry is reachable. */
  function inkBounds(el: Element): { top: number; bottom: number } | null {
    // The one narrow cast in this module: the walk holds plain Elements, and only an SVG carries
    // the two geometry methods. `Partial` keeps the presence check honest rather than asserting it.
    const geometry = el as unknown as Partial<SvgInkGeometry>;
    if (typeof geometry.getBBox !== 'function' || typeof geometry.getScreenCTM !== 'function') return null;
    let box: { x: number; y: number; width: number; height: number };
    let ctm: { b: number; d: number; f: number } | null;
    try {
      box = geometry.getBBox();
      ctm = geometry.getScreenCTM();
    } catch {
      return null;
    }
    if (!ctm || !(box.width > 0) || !(box.height > 0)) return null;
    const ys = [
      ctm.b * box.x + ctm.d * box.y + ctm.f,
      ctm.b * (box.x + box.width) + ctm.d * box.y + ctm.f,
      ctm.b * box.x + ctm.d * (box.y + box.height) + ctm.f,
      ctm.b * (box.x + box.width) + ctm.d * (box.y + box.height) + ctm.f,
    ];
    return { top: Math.min(...ys), bottom: Math.max(...ys) };
  }

  function iconAnchor(el: Element): MemberAnchor | null {
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return null;
    const ink = inkBounds(el);
    if (!ink) diagnostics.iconElementBoxFallbacks += 1;
    const top = ink ? ink.top : rect.top;
    const bottom = ink ? ink.bottom : rect.bottom;
    return {
      kind: 'icon',
      selector: signature(el),
      classes: classesOf(el),
      geometry: ink ? 'ink' : 'element-box',
      topPx: round(top),
      bottomPx: round(bottom),
      contentCentrePx: round((top + bottom) / 2),
      elementCentrePx: round((rect.top + rect.bottom) / 2),
      baselinePx: null,
      capCentrePx: null,
      text: '',
      stacked: false,
    };
  }

  /** A control's anchor. Its border box IS the visual object, the one case an element box is right. */
  function controlAnchor(el: Element): MemberAnchor | null {
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return null;
    return {
      kind: 'control',
      selector: signature(el),
      classes: classesOf(el),
      geometry: 'element-box',
      topPx: round(rect.top),
      bottomPx: round(rect.bottom),
      contentCentrePx: round((rect.top + rect.bottom) / 2),
      elementCentrePx: round((rect.top + rect.bottom) / 2),
      baselinePx: null,
      capCentrePx: null,
      text: '',
      stacked: false,
    };
  }

  function visibleMatches(el: Element, selector: string): Element[] {
    return Array.from(el.querySelectorAll(selector)).filter((node) => isVisible(node));
  }

  /** The first non-whitespace text run inside `el`, in document order, that actually paints. */
  function firstTextLeaf(el: Element): { node: Text; lineOwner: Element } | null {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node as Text;
      if (!(text.textContent ?? '').trim()) continue;
      const lineOwner = text.parentElement;
      if (!lineOwner || !isVisible(lineOwner)) continue;
      return { node: text, lineOwner };
    }
    return null;
  }

  /**
   * One row member's anchor. A bare control or icon anchors on itself; a composite carrying exactly
   * one control anchors on THAT control, which is the whole stacked-field case (the composite's own
   * box centres correctly while the control inside it does not); anything else anchors on its first
   * text run.
   */
  function anchorFor(node: Node): MemberAnchor | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node as Text;
      return textAnchor(text, text.parentElement);
    }
    const el = node as Element;
    if (!isVisible(el)) return null;
    if (el.matches(CONTROL_SELECTOR)) return controlAnchor(el);
    if (el.matches(ICON_SELECTOR)) return iconAnchor(el);

    const controls = visibleMatches(el, CONTROL_SELECTOR);
    if (controls.length > 1) return null;
    const leaf = firstTextLeaf(el);
    if (controls.length === 1) {
      const anchor = controlAnchor(controls[0]);
      if (!anchor) return null;
      const label = leaf && !controls[0].contains(leaf.node) ? textAnchor(leaf.node, leaf.lineOwner) : null;
      anchor.stacked = Boolean(label && label.bottomPx <= anchor.topPx + 1);
      return anchor;
    }
    const icons = visibleMatches(el, ICON_SELECTOR);
    if (!leaf && icons.length > 0) return iconAnchor(icons[0]);
    if (!leaf) return null;
    return textAnchor(leaf.node, leaf.lineOwner);
  }

  function itemBox(node: Node): DOMRect | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const range = trimmedRange(node as Text);
      if (!range) return null;
      const rect = range.getBoundingClientRect();
      range.detach();
      return rect.height > 0 ? rect : null;
    }
    const rect = (node as Element).getBoundingClientRect();
    return rect.height > 0 ? rect : null;
  }

  function isRowContainer(el: Element): boolean {
    const style = getComputedStyle(el);
    if (style.display === 'flex' || style.display === 'inline-flex') return style.flexDirection.startsWith('row');
    return style.display === 'grid' || style.display === 'inline-grid';
  }

  /** A container's in-flow, visible row members: element children plus anonymous text items. */
  function rowMembers(container: Element, elementSelector: string | null): Node[] {
    const members: Node[] = [];
    for (const node of Array.from(container.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!elementSelector && (node.textContent ?? '').trim()) members.push(node);
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const el = node as Element;
      if (elementSelector && !el.matches(elementSelector)) continue;
      const style = getComputedStyle(el);
      if (style.position === 'absolute' || style.position === 'fixed') continue;
      if (!isVisible(el)) continue;
      members.push(el);
    }
    return members;
  }

  /** Members sorted left to right and split into visual rows by vertical overlap. */
  function clusterRows(members: Node[]): { node: Node; box: DOMRect }[][] {
    const boxed: { node: Node; box: DOMRect }[] = [];
    for (const node of members) {
      const box = itemBox(node);
      if (box) boxed.push({ node, box });
    }
    boxed.sort((one, other) => one.box.left - other.box.left || one.box.top - other.box.top);
    const clusters: { node: Node; box: DOMRect }[][] = [];
    for (const item of boxed) {
      const current = clusters[clusters.length - 1];
      const previous = current?.[current.length - 1];
      if (previous) {
        const overlap = Math.min(previous.box.bottom, item.box.bottom) - Math.max(previous.box.top, item.box.top);
        const smaller = Math.min(previous.box.height, item.box.height);
        if (overlap >= smaller * 0.5) {
          current.push(item);
          continue;
        }
      }
      clusters.push([item]);
    }
    return clusters.filter((cluster) => cluster.length >= 2);
  }

  const pairs: RawPair[] = [];

  function walkContainer(container: Element, rowKind: RowKind, elementSelector: string | null): void {
    const members = rowMembers(container, elementSelector);
    if (members.length < 2) return;
    const containerStyle = getComputedStyle(container);
    for (const cluster of clusterRows(members)) {
      diagnostics.rowsWalked += 1;
      const anchors = cluster.map((item) => {
        if (item.box.height > maxItemHeightPx) return null;
        const anchor = anchorFor(item.node);
        if (!anchor) diagnostics.anchorsUnresolved += 1;
        return anchor;
      });
      for (let index = 1; index < cluster.length; index += 1) {
        const left = anchors[index - 1];
        const right = anchors[index];
        if (!left || !right) {
          if (cluster[index - 1].box.height > maxItemHeightPx || cluster[index].box.height > maxItemHeightPx) {
            diagnostics.pairsSkippedTooTall += 1;
          }
          continue;
        }
        diagnostics.pairsFound += 1;
        pairs.push({
          rowKind,
          rowSelector: signature(container),
          rowClasses: classesOf(container),
          alignItems: containerStyle.alignItems,
          rowBox: {
            topPx: round(Math.min(cluster[index - 1].box.top, cluster[index].box.top)),
            bottomPx: round(Math.max(cluster[index - 1].box.bottom, cluster[index].box.bottom)),
            leftPx: round(Math.min(cluster[index - 1].box.left, cluster[index].box.left)),
            rightPx: round(Math.max(cluster[index - 1].box.right, cluster[index].box.right)),
          },
          a: left,
          b: right,
        });
      }
    }
  }

  const root = document.querySelector(rootSelector);
  if (!root) return { pairs, diagnostics };

  // The root itself, then its subtree. A caller scoping the walk to one container (a rule narrowing
  // to a region, a fixture measuring a single row) means that container's own children, so leaving
  // the root out would answer an unscoped question with an empty result.
  for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
    if (el.tagName === 'TR') {
      walkContainer(el, 'table-row', 'td, th');
      continue;
    }
    if (isRowContainer(el)) walkContainer(el, 'flex-grid-row', null);
  }

  // The optical suspects, modelled as a self-pair: a glyph member against the padding box of the
  // same element. One record shape keeps the reporting bar, the crop, and the caller's own table
  // uniform across every reading this module produces.
  for (const el of Array.from(root.querySelectorAll(opticalSelector))) {
    if (!isVisible(el)) continue;
    const leaf = firstTextLeaf(el);
    if (!leaf) continue;
    const glyph = textAnchor(leaf.node, leaf.lineOwner);
    if (!glyph) continue;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const padTop = rect.top + parseFloat(style.borderTopWidth || '0');
    const padBottom = rect.bottom - parseFloat(style.borderBottomWidth || '0');
    if (padBottom <= padTop) continue;
    diagnostics.pairsFound += 1;
    pairs.push({
      rowKind: 'optical-suspect',
      rowSelector: signature(el),
      rowClasses: classesOf(el),
      alignItems: style.alignItems,
      rowBox: {
        topPx: round(rect.top),
        bottomPx: round(rect.bottom),
        leftPx: round(rect.left),
        rightPx: round(rect.right),
      },
      a: glyph,
      b: {
        kind: 'box',
        selector: signature(el),
        classes: classesOf(el),
        geometry: 'element-box',
        topPx: round(padTop),
        bottomPx: round(padBottom),
        contentCentrePx: round((padTop + padBottom) / 2),
        elementCentrePx: round((rect.top + rect.bottom) / 2),
        baselinePx: null,
        capCentrePx: null,
        text: '',
        stacked: false,
      },
    });
  }

  return { pairs, diagnostics };
}

/**
 * The class of a pair of members. Pure, so both callers classify identically and a unit test can
 * exercise every branch without a browser.
 *
 * A `box` member only ever arrives from the optical self-pair path, which is what makes it the
 * discriminator here rather than a flag the walk has to carry alongside.
 */
export function classifyPair(a: MemberAnchor, b: MemberAnchor): PairClass {
  if (a.kind === 'box' || b.kind === 'box') return 'optical-suspect';
  const [first, second] = [a.kind, b.kind].sort();
  return `${first}-beside-${second}` as PairClass;
}

/**
 * The metric a class is measured by. The split is the rule's whole credibility: two runs of text at
 * different sizes sharing one baseline is CORRECT typography whose glyph centres diverge by design,
 * so measuring that pair by centre reports every well-set row as a defect. Everything with an icon
 * or a control in it compares visible content, since a control has no baseline to share.
 */
export function metricForPairClass(pairClass: PairClass): PairMetric {
  if (pairClass === 'text-beside-text') return 'baseline';
  if (pairClass === 'optical-suspect') return 'optical-centre';
  return 'content-centre';
}

/**
 * The number a metric reads off one member, or null when that member carries no such reading (a
 * control has no baseline, a text run whose font metrics the browser refused has no cap centre).
 *
 * A text member reads its CAP centre under `content-centre`, not its glyph-box centre: a descender
 * hangs below the visual mass the eye centres an icon against, and the `/join` evidence this module
 * is calibrated on was measured icon ink centre against title cap centre.
 */
export function referenceForMetric(anchor: MemberAnchor, metric: PairMetric): number | null {
  if (metric === 'baseline') return anchor.baselinePx;
  if (metric === 'optical-centre') return anchor.kind === 'box' ? anchor.contentCentrePx : anchor.capCentrePx;
  return anchor.kind === 'text' ? anchor.capCentrePx : anchor.contentCentrePx;
}

/**
 * Classify `pair` and take its class's delta, or null when either member has no reading for that
 * metric. Pure over what the page already reported, so the sign convention and the metric split
 * live in one testable place.
 */
export function measurePair(pair: RawPair): MeasuredPair | null {
  const pairClass = classifyPair(pair.a, pair.b);
  const metric = metricForPairClass(pairClass);
  const left = referenceForMetric(pair.a, metric);
  const right = referenceForMetric(pair.b, metric);
  if (left === null || right === null) return null;
  const deltaPx = Math.round((left - right) * 100) / 100;
  return { ...pair, pairClass, metric, deltaPx, magnitudePx: Math.abs(deltaPx) };
}

/** Every pair whose own metric reads further apart than `barPx`, the caller's reporting bar. */
export function pairsAboveBar(pairs: MeasuredPair[], barPx: number = VERTICAL_REPORTING_BAR_PX): MeasuredPair[] {
  return pairs.filter((pair) => pair.magnitudePx > barPx);
}

/**
 * One synthetic shape a measuring artifact proves itself against before it is allowed to report on
 * a real corpus. Neither of this pass's corpora still exhibits the defects the method was built to
 * catch (`FieldLabel`, `TextInput`, and `SelectInput` have zero call sites in the engine's admin
 * components and zero in the showcase routes, and the one composing consumer already fixed its
 * instances), so these fixtures ARE the calibration.
 */
export interface VerticalCalibrationFixture {
  id: 'season-row' | 'icon-card';
  /** What the shape is and which real defect it reproduces, for a report to print verbatim. */
  description: string;
  /** A complete `<body>` fragment, self-styled so it measures the same wherever it is rendered. */
  html: string;
  /** The class on the fixture's row container, so a caller can ignore pairs the fixture also produces. */
  rowClass: string;
  pairClass: PairClass;
  /** `1` when the left member is expected to sit low, `-1` when it is expected to ride high. */
  expectedSign: 1 | -1;
  minMagnitudePx: number;
  maxMagnitudePx: number;
}

/**
 * The two calibration shapes, both drawn from measured defects.
 *
 * SEASON ROW: the `0.92.0` stacked register drops a field's control by the label's height, so a
 * bare sibling control in the same flex row rides high. Every length here is explicit, so the
 * 12.5px it produces is layout, not type, and holds under any installed font.
 *
 * ICON CARD: an SVG whose element box centres on the title's first line while its drawn art rides
 * high inside that box, the `/join` card shape measured at -2.80 to -5.10px. The art occupies rows
 * 2 through 14 of a 24-unit viewBox, so its ink centre sits exactly 4px above its element box
 * centre: an element-box reading lands under the 2px reporting bar while the ink reading does not,
 * which is the whole of trap 3 in one fixture. The title is one text node held to a narrow column
 * so it WRAPS rather than breaking on markup: trap 1 is about the first line box of a run, and a
 * run split by a `<br>` gives the walk a single-line node that would pass either way.
 */
export const VERTICAL_CALIBRATION_FIXTURES: VerticalCalibrationFixture[] = [
  {
    id: 'season-row',
    description:
      'a stacked-register field beside a bare control in one `align-items: center` flex row; the ' +
      'bare control rides high by half the label-plus-gap band',
    rowClass: 'cairn-calibration-season-row',
    pairClass: 'control-beside-control',
    expectedSign: 1,
    minMagnitudePx: 11.5,
    maxMagnitudePx: 13.5,
    html: `<div class="cairn-calibration-season-row"
        style="display:flex;align-items:center;gap:8px;padding:16px;font-family:sans-serif">
  <label style="display:flex;flex-direction:column;gap:5px">
    <span style="font-size:14px;line-height:20px">Season</span>
    <select name="season" class="select"
            style="box-sizing:border-box;height:32px;font-size:14px"><option>2025-26</option></select>
  </label>
  <button type="button" class="btn"
          style="box-sizing:border-box;height:32px;font-size:14px">Add crew</button>
</div>`,
  },
  {
    id: 'icon-card',
    description:
      'an SVG icon beside a multi-line title block; the icon element box centres on the first line ' +
      'while its drawn ink rides 4px above that centre',
    rowClass: 'cairn-calibration-icon-card',
    pairClass: 'icon-beside-text',
    expectedSign: -1,
    minMagnitudePx: 2.8,
    maxMagnitudePx: 5.1,
    html: `<div class="cairn-calibration-icon-card"
        style="display:flex;align-items:flex-start;gap:12px;width:320px;padding:16px;font-family:sans-serif">
  <span style="display:flex;align-items:center;flex:none;height:24px">
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style="display:block">
      <rect x="4" y="2" width="16" height="12" fill="currentColor"></rect>
    </svg>
  </span>
  <div>
    <h3 style="margin:0;width:110px;font-size:18px;line-height:24px;font-weight:600">Club Boats and moorage</h3>
    <p style="margin:0;font-size:14px;line-height:20px">Keelboats and a summer mooring.</p>
  </div>
</div>`,
  },
];

/**
 * Why `fixture` failed to calibrate against `pairs`, or null when it calibrated. A caller that
 * measures a real corpus runs this first and refuses to emit on a non-null answer: a method that
 * cannot reproduce a known defect has no standing to report a screen clean.
 */
export function calibrationMiss(fixture: VerticalCalibrationFixture, pairs: MeasuredPair[]): string | null {
  const candidates = pairs.filter(
    (pair) => pair.pairClass === fixture.pairClass && pair.rowClasses.split(/\s+/).includes(fixture.rowClass)
  );
  if (candidates.length === 0) {
    return `${fixture.id}: no ${fixture.pairClass} pair was found in .${fixture.rowClass} at all.`;
  }
  const pair = candidates.reduce((best, next) => (next.magnitudePx > best.magnitudePx ? next : best));
  if (Math.sign(pair.deltaPx) !== fixture.expectedSign) {
    return `${fixture.id}: measured ${pair.deltaPx}px, expected the sign to be ${fixture.expectedSign}.`;
  }
  if (pair.magnitudePx < fixture.minMagnitudePx || pair.magnitudePx > fixture.maxMagnitudePx) {
    return (
      `${fixture.id}: measured ${pair.magnitudePx}px, expected ` +
      `${fixture.minMagnitudePx} to ${fixture.maxMagnitudePx}px.`
    );
  }
  return null;
}

/**
 * Measure every candidate pair on `page`: install the shared audit helpers, run the in-page walk,
 * then classify and take each delta on the Node side. This is the entry point both the inventory
 * probe and the rendered rule call, so neither owns a copy of the traps or the metric split.
 *
 * The helpers are installed here rather than trusted from the runner, the same reasoning
 * `field-edge-alignment` follows: a caller driving this directly from a unit test then behaves
 * exactly like a caller driving it under `runRendered`.
 */
export async function measureVerticalMetrics(
  page: RenderedPage,
  args: VerticalMetricsArgs = {}
): Promise<{ pairs: MeasuredPair[]; diagnostics: VerticalMetricsDiagnostics }> {
  await ensurePageHelpers(page);
  const resolved: Required<VerticalMetricsArgs> = {
    rootSelector: args.rootSelector ?? 'body',
    maxItemHeightPx: args.maxItemHeightPx ?? DEFAULT_ROW_ITEM_MAX_HEIGHT_PX,
    opticalSelector: args.opticalSelector ?? DEFAULT_OPTICAL_SELECTOR,
  };
  const result = await page.evaluate(collectVerticalPairsInPage, resolved);
  const pairs: MeasuredPair[] = [];
  for (const raw of result.pairs) {
    const measured = measurePair(raw);
    if (measured) pairs.push(measured);
    else result.diagnostics.pairsUnmeasurable += 1;
  }
  return { pairs, diagnostics: result.diagnostics };
}
