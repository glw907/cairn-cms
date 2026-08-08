// cairn-audit's vertical-alignment measurement module: the one place the geometry of "do these two
// things in a row line up" is defined. Both callers share it, the standalone inventory probe
// (scripts/probe-vertical-alignment.mjs) and the rendered `vertical-alignment` rule, so the three
// measurement traps below are encoded once rather than relearned per artifact.
//
// THE THREE TRAPS, each one a wrong answer a real probe already produced against a real screen.
//
// 1. PAIR WITH THE LINE, NOT THE BLOCK. An icon beside a multi-line text block aligns with the
//    block's FIRST LINE box. Comparing against the block reported 29 to 68px of phantom delta on
//    rows that were composed correctly. {@link principalRun} plus `getClientRects()[0]` is the fix:
//    the first rect a Range yields over a text run IS that run's first line box. The line is found
//    by VISUAL position, never by document order, since `order`, `column-reverse`, an explicit
//    `grid-row` and an absolutely positioned flag all put the first run in the DOM somewhere other
//    than the top of the member.
// 2. READ TYPE METRICS OFF THE ELEMENT THAT RENDERS THE LINE. Resolving font metrics from the text
//    CONTAINER rather than the element that owns the line box returned -0.4px, "this row is fine",
//    on the row whose icons visibly ride high. Every metric here comes from
//    `getComputedStyle(lineOwner)`, and `lineOwner` is the parent of the line's PRINCIPAL run, the
//    biggest type on it. A small inline leading a heading ("DRAFT Winter schedule", "3. Publish the
//    post") owns the first text node without owning any of the line's visual mass, and reading its
//    face reproduces the same -0.4px answer with the sign free to invert.
// 3. MEASURE INK, NOT ELEMENT BOXES. An SVG's element box centres while its drawn ink rides high:
//    a 24x24 glyph whose art occupies rows 2 through 14 of its viewBox reads as centred by
//    `getBoundingClientRect` and 4px high by its ink. Icon geometry is therefore per-shape
//    `getBBox()` mapped through that shape's own `getScreenCTM()`, and text geometry is the glyph
//    box off a Range. Ink is what PAINTS, which the root element's own bbox is not: a non-painting
//    spacer path inflates it to the full viewBox, a stroked one-dimensional glyph measures zero
//    tall inside it, and art that bleeds past the viewBox reads outside the drawn crop. An element
//    box is used only where the border box IS the visual object (a control), or as an explicitly
//    MARKED fallback for an icon that carries no reachable geometry (an `<img>`, a background-image
//    tile), which a caller can tell apart through {@link MemberAnchor.geometry}.
//
// THE METRIC IS CHOSEN BY THE PAIR'S CLASS, and that split is not a refinement, it is the
// difference between a useful rule and a rule nobody can leave on. A mixed-size text pair sharing a
// baseline is CORRECT typography whose glyph centres diverge by design; measuring it by centre
// reports every well-set heading-plus-eyebrow row as broken. See {@link metricForPairClass}.
//
// TRAP 1 ANSWERS "WHICH LINE", NEVER "SHOULD THIS PAIR WITH A LINE AT ALL". Every reading is
// therefore split into a COMPOSITION term, what that row's own alignment asks for, and a RESIDUAL,
// what is left over. See {@link compositionPx}: the residual is the defect, and the raw delta is
// not. Two alignments displace a reading, and reading either one as a defect is a phantom.
// Where the row CENTRES its members and the text block wraps, the composition deliberately centres
// the other member on the WHOLE block, and the first-line reading is short by half the block's
// extra height: a reading that grows with the line count and swings 3x between viewport widths on
// identical, correctly composed pixels. Where the row TOP-ALIGNS them, it levelled their boxes and
// asked for nothing else, so a member read at its centre sits half its own box below the line
// beside it: a reading that scales with that member's height, 11.5px on a 36px icon tile and 5.5px
// on a 28px one, again with nothing to fix. What survives both terms is a member whose visible
// content does not sit where its own box puts it, which is the defect this module was built on.
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
 * The tallest a row member's own READING may be and still count as a row member. A stacked field
 * (label, gap, control) reaches about 57px and a table cell about 49px, so 96px clears every
 * composition this module is about while excluding a reading that is itself a layout object, a
 * full-bleed image or a page-tall control.
 *
 * The cap applies to the anchor, never to the member's block box. A text member is read off its
 * FIRST LINE (trap 1), so an icon beside a five-line paragraph is a row whatever the paragraph
 * measures; capping the block instead made the module's own calibration shape vanish at one extra
 * wrapped line. Pairs excluded this way are counted rather than dropped silently.
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
  /**
   * The tag the reading came off, lowercased. Kept beside {@link MemberAnchor.selector} because the
   * selector carries classes, and a caller that has to name this member across a recipe change
   * needs an identity the recipe does not rewrite.
   */
  tag: string;
  /**
   * How this member is aligned in its row: its own `align-self`, resolved against the container's
   * `align-items` when it computes to `auto` (which is what Chromium returns for an unset one).
   * This is the property that decides whether a wrapped block was centred on purpose.
   */
  alignSelf: string;
  geometry: GeometrySource;
  /** Top of the measured content: ink for an icon, glyph box for text, border box for a control. */
  topPx: number;
  bottomPx: number;
  /** Centre of that same measured content. The reading `content-centre` reads for a non-text member. */
  contentCentrePx: number;
  /** Centre of the element's own border box, kept beside the content reading so a caller can show both. */
  elementCentrePx: number;
  /**
   * Top of the ROW MEMBER's own border box, which is the box the row's alignment placed. It differs
   * from {@link MemberAnchor.topPx} whenever the reading was taken off something inside the member:
   * an icon centred in a 36px tile, or the one control inside a stacked composite.
   *
   * This is the geometry a top-aligned row is judged against. Under `flex-start` the row put these
   * boxes level and nothing else, so a reading taken at a member's CENTRE is displaced from a
   * reading taken on a line by exactly the difference in where those two sit inside their own boxes.
   */
  memberTopPx: number;
  /** Bottom of that same member box. */
  memberBottomPx: number;
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
  /** How many line bands of text this member renders, whatever kind it is. `0` on a bare icon. */
  lineCount: number;
  /**
   * How far this member's whole text extent sits BELOW its first line, centre to centre. Zero
   * unless the member is a text member rendering more than one line, which makes it exactly the
   * distance a centring row moves the member away from the line the reading was taken on.
   *
   * It is a displacement rather than a second reading on purpose: subtracting it from a delta
   * leaves both sides of that delta in the same metric, so a baseline pair stays a baseline pair.
   */
  blockLiftPx: number;
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
  /** The container's tag, lowercased: the half of its identity a recipe change leaves alone. */
  rowTag: string;
  /**
   * Every member of the visual row this pair was taken from, in left-to-right order, each named
   * `kind:text` (or `kind:tag` where the member renders no text). A three-member row yields two
   * pairs, and this is what lets a caller recognize them as two readings of ONE row rather than
   * inventory the same row twice.
   */
  rowMembers: string[];
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
  /** `Math.abs(deltaPx)`. The RAW magnitude, which is not what the reporting bar is applied to. */
  magnitudePx: number;
  /** The part of {@link MeasuredPair.deltaPx} this row's own composition asks for. {@link compositionPx} */
  compositionPx: number;
  /** `deltaPx` less the composition: the part no alignment choice explains, and the only defect. */
  residualPx: number;
  /** `Math.abs(residualPx)`, which is what the reporting bar is applied to. */
  residualMagnitudePx: number;
}

/** What the in-page walk saw, so a caller can state its own coverage rather than imply it. */
export interface VerticalMetricsDiagnostics {
  rowsWalked: number;
  pairsFound: number;
  /** Pairs dropped because a member was taller than the row-member cap. */
  pairsSkippedTooTall: number;
  /** Row members whose visible content resolved to no anchor at all. */
  anchorsUnresolved: number;
  /** Icon members measured by their element box because no painting SVG geometry was reachable. */
  iconElementBoxFallbacks: number;
  /**
   * Painting shapes whose drawn extent a `mask` or an unresolvable `clip-path` makes unknowable.
   * Their geometry box was used as the best available reading, so a caller seeing a non-zero count
   * on a row it cares about should look at the crop before trusting the number.
   */
  iconInkClipsUnresolved: number;
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

/** A vertical extent in whichever coordinate space its producer names. */
interface VerticalBand {
  top: number;
  bottom: number;
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
  // The SVG element kinds that put paint on the screen. `getBBox` answers for more than these, and
  // for their definition-only containers too, so unioning everything reports geometry as ink.
  const PAINTING_SVG_SELECTOR = 'path, rect, circle, ellipse, line, polyline, polygon, text, image, use';
  const SVG_DEFINITION_SELECTOR = 'defs, clipPath, symbol, mask, marker, pattern';
  // A bound on the runs one member's principal-line search reads, so a pathological subtree cannot
  // turn the walk quadratic. Well past any real row; a member needing more is not a row member.
  const MAX_TEXT_RUNS_PER_MEMBER = 200;

  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());
  const isVisible = (el: Element) => (helpers ? helpers.isVisible(el) : true);
  const paint = document.createElement('canvas').getContext('2d');
  const capHeightByFont = new Map<string, number>();
  // Nested row containers mean the same member is asked for its principal run several times over
  // one walk, and finding that run costs a subtree traversal plus a rect per run.
  const principalRunByElement = new Map<Element, { node: Text; lineOwner: Element } | null>();
  const lineBandsByMember = new Map<Node, VerticalBand[]>();

  const diagnostics: VerticalMetricsDiagnostics = {
    rowsWalked: 0,
    pairsFound: 0,
    pairsSkippedTooTall: 0,
    anchorsUnresolved: 0,
    iconElementBoxFallbacks: 0,
    iconInkClipsUnresolved: 0,
    textMetricsUnresolved: 0,
    pairsUnmeasurable: 0,
  };

  function round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /** A length off a computed style, falling back rather than propagating a `NaN` into geometry. */
  function styleNumber(value: string, fallback: number): number {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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
      tag: lineOwner.tagName.toLowerCase(),
      alignSelf: '',
      geometry: 'glyph',
      topPx: round(inkTop),
      bottomPx: round(inkBottom),
      contentCentrePx: round((inkTop + inkBottom) / 2),
      elementCentrePx: round((elementRect.top + elementRect.bottom) / 2),
      memberTopPx: round(inkTop),
      memberBottomPx: round(inkBottom),
      baselinePx: round(baseline),
      capCentrePx: round(baseline - capHeightFor(font) / 2),
      text: text.slice(0, 40),
      lineCount: 0,
      blockLiftPx: 0,
      stacked: false,
    };
  }

  /** Whether `shape` and every ancestor up to `root` is itself painted at all. */
  function paints(shape: Element, root: Element): boolean {
    for (let node: Element | null = shape; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
      // `opacity` does not inherit, so a fully transparent `<g>` has to be read on the group itself.
      if (styleNumber(style.opacity, 1) <= 0) return false;
      if (node === root) break;
    }
    return true;
  }

  /**
   * The user-space band a `clip-path` confines `shape` to, or null when nothing clips it.
   * `unresolved` means something clips it that this cannot compute (a mask's alpha, a basic-shape
   * function, an object-bounding-box clip), which the caller counts rather than quietly trusting.
   */
  function clipBand(style: CSSStyleDeclaration): VerticalBand | 'unresolved' | null {
    const mask = style.getPropertyValue('mask-image').trim();
    if (mask !== '' && mask !== 'none') return 'unresolved';
    const clip = style.clipPath.trim();
    if (!clip || clip === 'none') return null;
    const reference = /^url\(["']?#([^"')]+)["']?\)$/.exec(clip);
    if (!reference) return 'unresolved';
    const target = document.getElementById(reference[1]);
    if (!target || target.tagName !== 'clipPath') return 'unresolved';
    if ((target.getAttribute('clipPathUnits') ?? 'userSpaceOnUse') !== 'userSpaceOnUse') return 'unresolved';
    let top = Infinity;
    let bottom = -Infinity;
    for (const child of Array.from(target.children)) {
      const geometry = child as unknown as Partial<SvgInkGeometry>;
      if (typeof geometry.getBBox !== 'function') continue;
      try {
        const box = geometry.getBBox();
        top = Math.min(top, box.y);
        bottom = Math.max(bottom, box.y + box.height);
      } catch {
        return 'unresolved';
      }
    }
    return bottom > top ? { top, bottom } : 'unresolved';
  }

  /** One painting shape's drawn band in client coordinates, or null when it paints nothing. */
  function shapeInk(shape: Element, root: Element): VerticalBand | null {
    // The one narrow cast in this module: the walk holds plain Elements, and only an SVG shape
    // carries the two geometry methods. `Partial` keeps the presence check honest.
    const geometry = shape as unknown as Partial<SvgInkGeometry>;
    if (typeof geometry.getBBox !== 'function' || typeof geometry.getScreenCTM !== 'function') return null;
    if (!paints(shape, root)) return null;
    const style = getComputedStyle(shape);
    const fills = style.fill !== 'none' && styleNumber(style.fillOpacity, 1) > 0;
    const strokeWidth = styleNumber(style.strokeWidth, 0);
    const strokes = style.stroke !== 'none' && strokeWidth > 0 && styleNumber(style.strokeOpacity, 1) > 0;
    if (!fills && !strokes) return null;

    let box: { x: number; y: number; width: number; height: number };
    let ctm: { b: number; d: number; f: number } | null;
    try {
      box = geometry.getBBox();
      ctm = geometry.getScreenCTM();
    } catch {
      return null;
    }
    if (!ctm) return null;

    let left = box.x;
    let right = box.x + box.width;
    let top = box.y;
    let bottom = box.y + box.height;
    if (strokes) {
      // `getBBox` is the GEOMETRY box and excludes the stroke, so a one-dimensional glyph measures
      // zero tall while painting a stroke-width band: the three round-cap dots of an ellipsis icon
      // read as no ink at all, and a vertical rule reads as no ink either. Half the stroke width
      // each side is the drawn extent for a butt cap and understates a round or square cap only
      // along the path's own direction, which leaves the CENTRE this module compares exact.
      const half = strokeWidth / 2;
      left -= half;
      right += half;
      top -= half;
      bottom += half;
    } else if (!(box.width > 0) || !(box.height > 0)) {
      // A fill over a degenerate shape paints nothing at all.
      return null;
    }

    const clip = clipBand(style);
    if (clip === 'unresolved') diagnostics.iconInkClipsUnresolved += 1;
    else if (clip) {
      top = Math.max(top, clip.top);
      bottom = Math.min(bottom, clip.bottom);
      if (!(bottom > top)) return null;
    }

    const ys = [
      ctm.b * left + ctm.d * top + ctm.f,
      ctm.b * right + ctm.d * top + ctm.f,
      ctm.b * left + ctm.d * bottom + ctm.f,
      ctm.b * right + ctm.d * bottom + ctm.f,
    ];
    let inkTop = Math.min(...ys);
    let inkBottom = Math.max(...ys);

    // An `<svg>` clips to its own viewport by default, so art that bleeds past the viewBox is drawn
    // cropped. Reading the geometry past that edge reported a 15px phantom on a mildly off row.
    const viewport = shape.closest('svg');
    if (viewport) {
      const clips = getComputedStyle(viewport).overflow !== 'visible';
      const rect = viewport.getBoundingClientRect();
      if (clips && rect.height > 0) {
        inkTop = Math.max(inkTop, rect.top);
        inkBottom = Math.min(inkBottom, rect.bottom);
      }
    }
    return inkBottom >= inkTop ? { top: inkTop, bottom: inkBottom } : null;
  }

  /**
   * An icon's drawn ink in client coordinates, unioned over the shapes that actually paint, or
   * null where no painting geometry is reachable (an `<img>`, a background-image tile).
   *
   * Unioning the shapes rather than reading the root's own bbox is what makes this INK. One
   * `fill="none"` sizing path, the idiom Material Symbols ships on every glyph, inflates the root
   * bbox to the whole viewBox and turns a 4px-high icon into a clean reading with nothing in the
   * record to say so.
   */
  function inkBounds(el: Element): VerticalBand | null {
    const shapes = Array.from(el.querySelectorAll(PAINTING_SVG_SELECTOR)).filter(
      (shape) => !shape.closest(SVG_DEFINITION_SELECTOR)
    );
    let top = Infinity;
    let bottom = -Infinity;
    for (const shape of shapes) {
      const band = shapeInk(shape, el);
      if (!band) continue;
      top = Math.min(top, band.top);
      bottom = Math.max(bottom, band.bottom);
    }
    return top === Infinity ? null : { top, bottom };
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
      tag: el.tagName.toLowerCase(),
      alignSelf: '',
      geometry: ink ? 'ink' : 'element-box',
      topPx: round(top),
      bottomPx: round(bottom),
      contentCentrePx: round((top + bottom) / 2),
      elementCentrePx: round((rect.top + rect.bottom) / 2),
      memberTopPx: round(rect.top),
      memberBottomPx: round(rect.bottom),
      baselinePx: null,
      capCentrePx: null,
      text: '',
      lineCount: 0,
      blockLiftPx: 0,
      stacked: false,
    };
  }

  /**
   * A control's anchor. Its border box IS the visual object, the one case an element box is right.
   *
   * Its label is carried as the member's text even though no reading is taken off it: a caller
   * naming this member in a report or keying a ruling on it needs "Upload", not "button".
   */
  function controlAnchor(el: Element): MemberAnchor | null {
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return null;
    return {
      kind: 'control',
      selector: signature(el),
      classes: classesOf(el),
      tag: el.tagName.toLowerCase(),
      alignSelf: '',
      geometry: 'element-box',
      topPx: round(rect.top),
      bottomPx: round(rect.bottom),
      contentCentrePx: round((rect.top + rect.bottom) / 2),
      elementCentrePx: round((rect.top + rect.bottom) / 2),
      memberTopPx: round(rect.top),
      memberBottomPx: round(rect.bottom),
      baselinePx: null,
      capCentrePx: null,
      text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
      lineCount: 0,
      blockLiftPx: 0,
      stacked: false,
    };
  }

  function visibleMatches(el: Element, selector: string): Element[] {
    return Array.from(el.querySelectorAll(selector)).filter((node) => isVisible(node));
  }

  /**
   * Whether `lineOwner` sits outside `member`'s normal flow, so its run belongs beside the
   * composition rather than in it. A floated price and an absolutely positioned "New" flag are
   * both first in the DOM and neither is the line the eye pairs the row against.
   */
  function isOutOfFlow(lineOwner: Element, member: Element): boolean {
    for (let node: Element | null = lineOwner; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.position === 'absolute' || style.position === 'fixed') return true;
      if (style.cssFloat !== 'none') return true;
      if (node === member) break;
    }
    return false;
  }

  /** One rendered text run inside a member, with what it takes to place and rank it on a line. */
  interface TextRun {
    node: Text;
    lineOwner: Element;
    /** The run's FIRST line box, the rect that decides which line the run belongs to. */
    rect: DOMRect;
    /** The line owner's own cap height, which ranks a run by the visual mass it puts on the line. */
    capHeightPx: number;
    outOfFlow: boolean;
  }

  /** Every non-whitespace run inside `el` that actually paints, in document order. */
  function textRuns(el: Element): TextRun[] {
    const runs: TextRun[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node && runs.length < MAX_TEXT_RUNS_PER_MEMBER; node = walker.nextNode()) {
      const text = node as Text;
      const lineOwner = text.parentElement;
      if (!lineOwner || !isVisible(lineOwner)) continue;
      const range = trimmedRange(text);
      if (!range) continue;
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
      range.detach();
      if (rects.length === 0) continue;
      runs.push({
        node: text,
        lineOwner,
        rect: rects[0],
        capHeightPx: capHeightFor(fontOf(lineOwner)),
        outOfFlow: isOutOfFlow(lineOwner, el),
      });
    }
    return runs;
  }

  /**
   * The run a row is composed against: the biggest type on `el`'s topmost in-flow line. Traps 1
   * and 2 are the same question asked twice, WHICH run, and answering it by document order gets
   * both wrong. A reordered column anchors the pair on a line that is not the first one (up to
   * 23.5px of phantom delta on identical pixels), and a small inline leading a heading owns the
   * first text node while owning none of the line's visual mass, which is the -0.4px "this row is
   * fine" reading on a row whose icons visibly ride high.
   */
  function principalRun(el: Element): { node: Text; lineOwner: Element } | null {
    const cached = principalRunByElement.get(el);
    if (cached !== undefined) return cached;
    const resolved = resolvePrincipalRun(el);
    principalRunByElement.set(el, resolved);
    return resolved;
  }

  function resolvePrincipalRun(el: Element): { node: Text; lineOwner: Element } | null {
    const runs = textRuns(el);
    if (runs.length === 0) return null;
    const inFlow = runs.filter((run) => !run.outOfFlow);
    // A member made entirely of out-of-flow runs still has to be readable, so the exclusion only
    // applies where it leaves something behind.
    const candidates = inFlow.length > 0 ? inFlow : runs;
    const opener = candidates.reduce((best, next) => (next.rect.top < best.rect.top ? next : best));
    const onFirstLine = candidates.filter((run) => {
      const overlap = Math.min(opener.rect.bottom, run.rect.bottom) - Math.max(opener.rect.top, run.rect.top);
      return overlap >= Math.min(opener.rect.height, run.rect.height) * 0.5;
    });
    const principal = onFirstLine.reduce((best, next) => (next.capHeightPx > best.capHeightPx ? next : best));
    return { node: principal.node, lineOwner: principal.lineOwner };
  }

  /**
   * Every line of text a row MEMBER puts on the screen, top to bottom, each band the union of the
   * rects that share it. This is the member's whole block, not the one run the reading was taken
   * off: a wrapped run contributes a rect per line, and a member made of a title plus a paragraph
   * contributes bands from both.
   *
   * The out-of-flow exclusion {@link principalRun} makes applies here too, so an absolutely
   * positioned flag does not read as an extra line of the block.
   */
  function lineBands(member: Node): VerticalBand[] {
    const cached = lineBandsByMember.get(member);
    if (cached) return cached;
    const rects: VerticalBand[] = [];
    const collect = (node: Text): void => {
      const range = trimmedRange(node);
      if (!range) return;
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width > 0.5 && rect.height > 0.5) rects.push({ top: rect.top, bottom: rect.bottom });
      }
      range.detach();
    };
    if (member.nodeType === Node.TEXT_NODE) {
      collect(member as Text);
    } else {
      const el = member as Element;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let seen = 0;
      for (let node = walker.nextNode(); node && seen < MAX_TEXT_RUNS_PER_MEMBER; node = walker.nextNode()) {
        const text = node as Text;
        const lineOwner = text.parentElement;
        if (!lineOwner || !isVisible(lineOwner)) continue;
        if (isOutOfFlow(lineOwner, el)) continue;
        seen += 1;
        collect(text);
      }
    }
    rects.sort((one, other) => one.top - other.top);
    const bands: VerticalBand[] = [];
    for (const rect of rects) {
      const current = bands[bands.length - 1];
      if (current) {
        const overlap = Math.min(current.bottom, rect.bottom) - Math.max(current.top, rect.top);
        const smaller = Math.min(current.bottom - current.top, rect.bottom - rect.top);
        if (overlap >= smaller * 0.5) {
          current.top = Math.min(current.top, rect.top);
          current.bottom = Math.max(current.bottom, rect.bottom);
          continue;
        }
      }
      bands.push({ top: rect.top, bottom: rect.bottom });
    }
    lineBandsByMember.set(member, bands);
    return bands;
  }

  /** How far a member's whole text extent sits below its first line, centre to centre. */
  function blockLift(bands: VerticalBand[]): number {
    if (bands.length < 2) return 0;
    const first = bands[0];
    const last = bands[bands.length - 1];
    return round((first.top + last.bottom) / 2 - (first.top + first.bottom) / 2);
  }

  /**
   * How `member` is aligned inside a row whose container resolved `align-items` to
   * `containerAlignItems`. Chromium reports an unset `align-self` as `auto` rather than resolving
   * it, and an anonymous text item has no style of its own, so both fall back to the container.
   */
  function alignmentOf(member: Node, containerAlignItems: string): string {
    if (member.nodeType !== Node.ELEMENT_NODE) return containerAlignItems;
    const self = getComputedStyle(member as Element).alignSelf;
    return !self || self === 'auto' ? containerAlignItems : self;
  }

  /**
   * The border box of the row member itself, which is the box the row's alignment placed. A text
   * node member has no box of its own, so its line bands are its extent.
   */
  function memberBox(member: Node, bands: VerticalBand[]): VerticalBand | null {
    if (member.nodeType === Node.ELEMENT_NODE) {
      const rect = (member as Element).getBoundingClientRect();
      return rect.bottom > rect.top ? { top: rect.top, bottom: rect.bottom } : null;
    }
    return bands.length > 0 ? { top: bands[0].top, bottom: bands[bands.length - 1].bottom } : null;
  }

  /**
   * The fields that belong to the ROW MEMBER rather than to the element the reading came off. A
   * text member's reading is one line of a block the row may have chosen to centre as a whole, and
   * nothing at the reading's own element can see that. Nor can it see the box the row aligned: an
   * icon centred in a tile and the one control inside a stacked composite are both read off
   * something smaller than the member the row placed.
   */
  function withMemberContext(anchor: MemberAnchor, member: Node, containerAlignItems: string): MemberAnchor {
    const bands = lineBands(member);
    anchor.alignSelf = alignmentOf(member, containerAlignItems);
    anchor.lineCount = bands.length;
    const box = memberBox(member, bands);
    if (box) {
      anchor.memberTopPx = round(box.top);
      anchor.memberBottomPx = round(box.bottom);
    }
    // Only a text member reads one line. An icon, a control, and a padding box are each read whole,
    // so a row centring them has already been given what it asked for.
    anchor.blockLiftPx = anchor.kind === 'text' ? blockLift(bands) : 0;
    return anchor;
  }

  /**
   * One row member's anchor. A bare control or icon anchors on itself; a composite carrying exactly
   * one control anchors on THAT control, which is the whole stacked-field case (the composite's own
   * box centres correctly while the control inside it does not); anything else anchors on its
   * principal run.
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
    const leaf = principalRun(el);
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

  /** What to call a member in the row's own member list when no anchor resolved for it. */
  function nameOf(node: Node): string {
    return node.nodeType === Node.ELEMENT_NODE ? (node as Element).tagName.toLowerCase() : '#text';
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
      // `display: contents` generates no box of its own, so ITS children are the row's real
      // members and the wrapper measures 0x0. Reading the wrapper dropped whole rows out of the
      // walk with every diagnostic still reading zero, the showcase header's `contents md:flex`
      // nav group among them.
      if (style.display === 'contents') {
        members.push(...rowMembers(el, elementSelector));
        continue;
      }
      if (!isVisible(el)) continue;
      members.push(el);
    }
    return members;
  }

  /**
   * Members split into visual rows by vertical band, each row then ordered left to right.
   *
   * The band split runs FIRST. Sorting by `left` up front is what broke a wrapped flex row: a
   * second-row member sharing the first member's left edge sorted between the two members of row
   * one, every cluster came out a singleton, and the row reported clean with `rowsWalked` at zero.
   */
  function clusterRows(members: Node[]): { node: Node; box: DOMRect }[][] {
    const boxed: { node: Node; box: DOMRect }[] = [];
    for (const node of members) {
      const box = itemBox(node);
      if (box) boxed.push({ node, box });
    }
    boxed.sort((one, other) => one.box.top - other.box.top || one.box.left - other.box.left);
    const bands: { items: { node: Node; box: DOMRect }[]; top: number; bottom: number }[] = [];
    for (const item of boxed) {
      const current = bands[bands.length - 1];
      if (current) {
        const overlap = Math.min(current.bottom, item.box.bottom) - Math.max(current.top, item.box.top);
        const smaller = Math.min(current.bottom - current.top, item.box.height);
        if (overlap >= smaller * 0.5) {
          current.items.push(item);
          current.top = Math.min(current.top, item.box.top);
          current.bottom = Math.max(current.bottom, item.box.bottom);
          continue;
        }
      }
      bands.push({ items: [item], top: item.box.top, bottom: item.box.bottom });
    }
    return bands
      .filter((band) => band.items.length >= 2)
      .map((band) => band.items.slice().sort((one, other) => one.box.left - other.box.left));
  }

  const pairs: RawPair[] = [];

  function walkContainer(container: Element, rowKind: RowKind, elementSelector: string | null): void {
    const members = rowMembers(container, elementSelector);
    if (members.length < 2) return;
    const containerStyle = getComputedStyle(container);
    for (const cluster of clusterRows(members)) {
      diagnostics.rowsWalked += 1;
      const readings = cluster.map((item) => {
        const anchor = anchorFor(item.node);
        if (!anchor) {
          diagnostics.anchorsUnresolved += 1;
          return { anchor: null, tooTall: false };
        }
        withMemberContext(anchor, item.node, containerStyle.alignItems);
        // The cap reads the ANCHOR's extent, not the member's block box: a text member is read off
        // one line, so a tall block is still a row member while a page-tall control is not.
        return { anchor, tooTall: anchor.bottomPx - anchor.topPx > maxItemHeightPx };
      });
      const rowMembers = cluster.map((item, index) => {
        const anchor = readings[index].anchor;
        if (!anchor) return `unresolved:${nameOf(item.node)}`;
        return `${anchor.kind}:${anchor.text || anchor.tag}`;
      });
      for (let index = 1; index < cluster.length; index += 1) {
        const left = readings[index - 1];
        const right = readings[index];
        if (left.tooTall || right.tooTall) {
          diagnostics.pairsSkippedTooTall += 1;
          continue;
        }
        if (!left.anchor || !right.anchor) continue;
        diagnostics.pairsFound += 1;
        pairs.push({
          rowKind,
          rowSelector: signature(container),
          rowClasses: classesOf(container),
          rowTag: container.tagName.toLowerCase(),
          rowMembers,
          alignItems: containerStyle.alignItems,
          rowBox: {
            topPx: round(Math.min(cluster[index - 1].box.top, cluster[index].box.top)),
            bottomPx: round(Math.max(cluster[index - 1].box.bottom, cluster[index].box.bottom)),
            leftPx: round(Math.min(cluster[index - 1].box.left, cluster[index].box.left)),
            rightPx: round(Math.max(cluster[index - 1].box.right, cluster[index].box.right)),
          },
          a: left.anchor,
          b: right.anchor,
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
    const leaf = principalRun(el);
    if (!leaf) continue;
    const glyph = textAnchor(leaf.node, leaf.lineOwner);
    if (!glyph) continue;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const padTop = rect.top + parseFloat(style.borderTopWidth || '0');
    const padBottom = rect.bottom - parseFloat(style.borderBottomWidth || '0');
    if (padBottom <= padTop) continue;
    withMemberContext(glyph, el, style.alignItems);
    const box: MemberAnchor = {
      kind: 'box',
      selector: signature(el),
      classes: classesOf(el),
      tag: el.tagName.toLowerCase(),
      alignSelf: alignmentOf(el, style.alignItems),
      geometry: 'element-box',
      topPx: round(padTop),
      bottomPx: round(padBottom),
      contentCentrePx: round((padTop + padBottom) / 2),
      elementCentrePx: round((rect.top + rect.bottom) / 2),
      memberTopPx: round(rect.top),
      memberBottomPx: round(rect.bottom),
      baselinePx: null,
      capCentrePx: null,
      text: '',
      lineCount: glyph.lineCount,
      blockLiftPx: 0,
      stacked: false,
    };
    diagnostics.pairsFound += 1;
    pairs.push({
      rowKind: 'optical-suspect',
      rowSelector: signature(el),
      rowClasses: classesOf(el),
      rowTag: el.tagName.toLowerCase(),
      rowMembers: [`text:${glyph.text || glyph.tag}`, `box:${el.tagName.toLowerCase()}`],
      alignItems: style.alignItems,
      rowBox: {
        topPx: round(rect.top),
        bottomPx: round(rect.bottom),
        leftPx: round(rect.left),
        rightPx: round(rect.right),
      },
      a: glyph,
      b: box,
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

/** Whether an alignment keyword centres a member on its own box inside its row. */
export function isCentredAlignment(alignment: string): boolean {
  const keyword = alignment.replace(/^(safe|unsafe)\s+/, '');
  return keyword === 'center';
}

/**
 * Whether an alignment keyword puts a member's own box at the row's start edge, which is what makes
 * a size difference between two members displace their centres by construction.
 *
 * `stretch` and the `normal` that resolves to it are deliberately NOT start alignments here. A
 * stretched member's box is the row's own height, so its box centre says nothing about where its
 * content was asked to sit, and a term built on it would be a term built on the row.
 */
export function isStartAlignment(alignment: string): boolean {
  const keyword = alignment.replace(/^(safe|unsafe)\s+/, '');
  return keyword === 'flex-start' || keyword === 'start' || keyword === 'self-start';
}

/**
 * Where a member's reading sits when the row places its box at the start edge and nothing inside
 * the member is misplaced, or null when the member carries no such reading.
 *
 * The two kinds answer differently because they are READ differently, not because of what they are.
 * A member read WHOLE (an icon, a control, a padding box) is read at its centre, which top
 * alignment puts half its own box below the row's start edge. A member read off ONE LINE (trap 1)
 * is read near its own top, and top alignment put that line where the reading found it. This is the
 * same asymmetry {@link MemberAnchor.blockLiftPx} already carries, for the same reason.
 */
function placedReadingPx(anchor: MemberAnchor, metric: PairMetric): number | null {
  if (anchor.kind === 'text') return referenceForMetric(anchor, metric);
  if (anchor.memberBottomPx <= anchor.memberTopPx) return null;
  return (anchor.memberTopPx + anchor.memberBottomPx) / 2;
}

/**
 * The part of a pair's delta the row's own composition asks for, which is therefore not a defect.
 * Two alignments displace a reading, and each gets its own term.
 *
 * CENTRING, and the wrapped block. A text member is read off its FIRST LINE (trap 1), so where the
 * row centres its members and that member's text wraps, the row has deliberately put the OTHER
 * member half a block lower than the line the reading was taken on. That distance is
 * {@link MemberAnchor.blockLiftPx}. An OPTICAL suspect always carries it, since its padding box
 * spans every line by construction while its glyph reading is the first line.
 *
 * TOP ALIGNMENT, and the taller box. Under `flex-start` the row put the members' own boxes level
 * and asked for nothing else. A member read at its centre therefore sits half its own box below
 * that edge, while a member read off one line sits a line's worth below it, so the two readings
 * differ by exactly the difference in where each sits inside its own box: a 36px icon tile beside a
 * 13px line reads 11.5px apart with the ink dead centre in the tile and nothing to fix. The term is
 * that difference, so what survives it is a member whose visible content does NOT sit where its own
 * box puts it, which is the `/join` ink defect this module was built on and which the `icon-card`
 * fixture proves still survives the subtraction. It is taken only under `content-centre`: a
 * baseline pair compares two baselines, which no box geometry enters.
 *
 * A row where only one member takes the alignment carries no term at all, in either case.
 *
 * NOT MODELLED, and stated rather than silently folded in. An `end`-aligned row pairs with the
 * block's LAST line. A grid member spanning several rows centres on the span. Under top alignment
 * the term also absorbs generous leading: a small icon level with a text member whose first line
 * sits low inside its own line box reads clean here, because the row got the tops it asked for and
 * choosing `items-center` instead is a design call rather than a measurement. Each leaves a
 * composition in the residual or takes one out of it, which is why a caller keeps room for a
 * reviewed ruling.
 */
export function compositionPx(pair: RawPair): number {
  const lift = Math.round((pair.b.blockLiftPx - pair.a.blockLiftPx) * 100) / 100;
  if (pair.rowKind === 'optical-suspect') return lift;
  if (isCentredAlignment(pair.a.alignSelf) && isCentredAlignment(pair.b.alignSelf)) return lift;
  if (isStartAlignment(pair.a.alignSelf) && isStartAlignment(pair.b.alignSelf)) {
    const metric = metricForPairClass(classifyPair(pair.a, pair.b));
    if (metric !== 'content-centre') return 0;
    const a = placedReadingPx(pair.a, metric);
    const b = placedReadingPx(pair.b, metric);
    if (a === null || b === null) return 0;
    return Math.round((a - b) * 100) / 100;
  }
  return 0;
}

/**
 * Classify `pair`, take its class's delta, and split that delta into the part its composition asks
 * for and the part left over. Pure over what the page already reported, so the sign convention, the
 * metric split, and the decomposition live in one testable place.
 *
 * The RESIDUAL is what a caller dispositions on. The raw delta answers "how far apart do these two
 * readings sit", which on a centred row with a wrapped block is a number that grows with the line
 * count and swings with the viewport on pixels nobody should touch.
 */
export function measurePair(pair: RawPair): MeasuredPair | null {
  const pairClass = classifyPair(pair.a, pair.b);
  const metric = metricForPairClass(pairClass);
  const left = referenceForMetric(pair.a, metric);
  const right = referenceForMetric(pair.b, metric);
  if (left === null || right === null) return null;
  const deltaPx = Math.round((left - right) * 100) / 100;
  const composition = compositionPx(pair);
  const residualPx = Math.round((deltaPx - composition) * 100) / 100;
  return {
    ...pair,
    pairClass,
    metric,
    deltaPx,
    magnitudePx: Math.abs(deltaPx),
    compositionPx: composition,
    residualPx,
    residualMagnitudePx: Math.abs(residualPx),
  };
}

/**
 * Every pair whose RESIDUAL reads further apart than `barPx`, the caller's reporting bar. The bar
 * is applied to the residual rather than the raw delta on purpose: a correctly composed row can
 * carry an arbitrarily large raw delta, and reporting it is the phantom-defect failure this module
 * exists to prevent.
 */
export function pairsAboveBar(pairs: MeasuredPair[], barPx: number = VERTICAL_REPORTING_BAR_PX): MeasuredPair[] {
  return pairs.filter((pair) => pair.residualMagnitudePx > barPx);
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
  /**
   * The largest composition term this shape's own alignment can honestly ask for. A term beyond it
   * means the decomposition has started explaining the defect away rather than accounting for the
   * row, which is the failure that would quietly empty an inventory.
   *
   * A fixture whose bound is above zero is a POSITIVE CONTROL on the term: the row takes a
   * composition and the defect survives it. `icon-card` is one, since it top-aligns.
   */
  maxCompositionPx: number;
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
 * run split by a `<br>` gives the walk a single-line node that would pass either way. It also
 * TOP-ALIGNS, so it is the positive control on the top-alignment composition term: the row takes a
 * term of about half a pixel and the 4px ink defect survives it whole.
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
    maxCompositionPx: 0,
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
    maxCompositionPx: 1,
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
 *
 * The verdict is taken on the RESIDUAL, the same number a caller dispositions on, and the
 * composition term is bounded by {@link VerticalCalibrationFixture.maxCompositionPx}, which makes
 * this check the guard on the decomposition too: a rule that started explaining these two defects
 * away as composition would fail here rather than quietly emptying the inventory. `icon-card`
 * top-aligns, so it DOES take a term and the defect survives it, which is the one positive control
 * the term has.
 */
export function calibrationMiss(fixture: VerticalCalibrationFixture, pairs: MeasuredPair[]): string | null {
  const candidates = pairs.filter(
    (pair) => pair.pairClass === fixture.pairClass && pair.rowClasses.split(/\s+/).includes(fixture.rowClass)
  );
  if (candidates.length === 0) {
    return `${fixture.id}: no ${fixture.pairClass} pair was found in .${fixture.rowClass} at all.`;
  }
  const pair = candidates.reduce((best, next) =>
    next.residualMagnitudePx > best.residualMagnitudePx ? next : best
  );
  if (Math.abs(pair.compositionPx) > fixture.maxCompositionPx) {
    return (
      `${fixture.id}: measured a composition term of ${pair.compositionPx}px, expected at most ` +
      `${fixture.maxCompositionPx}px.`
    );
  }
  if (Math.sign(pair.residualPx) !== fixture.expectedSign) {
    return `${fixture.id}: measured ${pair.residualPx}px, expected the sign to be ${fixture.expectedSign}.`;
  }
  if (pair.residualMagnitudePx < fixture.minMagnitudePx || pair.residualMagnitudePx > fixture.maxMagnitudePx) {
    return (
      `${fixture.id}: measured ${pair.residualMagnitudePx}px, expected ` +
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
