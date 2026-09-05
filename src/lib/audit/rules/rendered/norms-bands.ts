// cairn-audit's norms-bands rule: a component's own measurements read against the bands the
// norms manifest observed across the admin. It is the consumer side of the manifest (`norms.ts`
// derives and ships it, `cairn-audit norms` prints it for a builder to read before it composes) and
// it stays advisory BY PRINCIPLE, not by an unfinished promotion: a legitimately novel component may
// step outside a band on purpose, so this rule's job is only to make sure the step was SEEN, never
// to forbid it. `tier: 'advisory'` is set once, here, and every finding this file constructs copies
// it; nothing in this module ever raises `'error'`.
//
// Three disciplines the manifest itself enforces (see norms.ts's header) carry through to how this
// rule reads it, rather than being re-derived here:
//
//  - An entry flagged `open-question` is treated as UNBANDED. Checking a live measurement against a
//    band that rests on an unsettled design question would launder that question as decided, which
//    is exactly what the manifest's own provenance rules exist to prevent.
//  - An entry flagged `ratified-drift` is treated as UNBANDED for the same reason, and this one was
//    demonstrated rather than reasoned: the flag means "a ratified decision governs this pair and
//    the render no longer agrees with it", so the band holds the DRIFTED observation. Honoring it
//    blessed the drift and reported the ratified value as the deviation. An adversarial pass drove
//    exactly that against a drifted `card/border-radius`: the 40px drift passed and cairn's own
//    ratified 16px card was the thing flagged, with the message calling the drifted band "observed
//    across 14 sites".
//  - A band flagged `single-observation` rests on one element site, not a distribution, and the
//    finding says so in those words rather than presenting a one-point band as an observed range.
//
// The measurement half matches spec 6.3's four categories: control heights, padding-to-type ratios,
// radii, and border treatments. It excludes every `relationship` (color) property the manifest
// carries, since `interactive-contrast` and `chip-ground-collision` already measure those against
// the rendered page, and it excludes font-size, font-weight, letter-spacing, and line-height, which
// are typography rather than geometry (`weight-budget` reads font-weight; nothing yet reads the
// rest, a gap for promotion evidence rather than something this rule quietly annexes).
//
// It does NOT exclude the raw padding lengths, which the first cut dropped in favor of the
// padding-to-font-size ratio alone. A ratio is scale-invariant, and `height` was then the only
// absolute length left: an adversarial pass built a chip carrying type at double the manifest's
// only observed size and side padding at double the band, held its height in band, and this rule
// reported clean, as did every other registered rendered rule. Keeping `padding-block` and
// `padding-inline` alongside their ratios restores an absolute anchor without annexing typography.
//
// The four categories only ever appear on the manifest's `control` and `container` families: a
// `text` role's properties are all type recipe, and `icon` carries a box (`width`/`height`) that
// reads as a control height under a bare property-name filter but is not one, so the family is
// checked explicitly rather than trusted to the property name alone.
//
// Geometry moves with the viewport, and the manifest was generated at a pinned 1440x900
// (generate-norms-manifest.mjs), so this rule resizes to the same viewport before measuring and
// restores the caller's original afterward, the same borrow-and-return idiom `touch-targets` and
// `viewport-overflow` use for their own pinned widths. A page whose viewport is the context's
// rather than its own has no original to restore, so the resize is skipped entirely and the run
// says so: borrowing a viewport this rule could never give back left every rule registered after it
// measuring at a width this one chose.
import { loadNormsManifest, NORM_PRECISION, type NormBand, type NormEntry, type NormsManifest } from '../../norms.js';
import { ensurePageHelpers } from '../../rendered.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/** The viewport the manifest was measured at; mirrors the generator's own pinned size. */
const VIEWPORT = { width: 1440, height: 900 };

/**
 * The flags that make a band unusable as a reference. Both mean "this number is not settled ground
 * truth", which is a reason not to measure against it at all, never a caveat to soften a finding
 * with; see this file's header for the drift case an adversarial pass demonstrated.
 */
const UNBANDED_FLAGS = ['open-question', 'ratified-drift'] as const;

/**
 * The manifest properties this rule checks, spec 6.3's four categories in the manifest's own
 * property names. Deliberately narrower than every non-color property the manifest carries; see
 * this file's header for what is excluded and why.
 */
const CHECKED_PROPERTIES = new Set([
  'height',
  'padding-block',
  'padding-inline',
  'padding-block-to-font-size',
  'padding-inline-to-font-size',
  'border-radius',
  'border-width',
  'border-style',
]);

/**
 * The manifest families this rule reads. `control` carries the height and padding-to-type
 * relationship, `container` carries the border and radius vocabulary, per `norms.ts`'s own
 * `NormFamily` doc. `text` and `icon` are excluded: a `text` role has no property in
 * {@link CHECKED_PROPERTIES} at all, and `icon` has `height`, which would read as a control height
 * under a bare property-name filter without this.
 */
const CHECKED_FAMILIES = new Set(['control', 'container']);

/** One element's raw measurement of one checked property, read in-browser and left unrounded. */
export interface NormsBandCandidate {
  role: string;
  /** Tag, id, and up to four classes, the same signature idiom every rendered rule reports under. */
  selector: string;
  property: string;
  kind: 'length' | 'ratio' | 'keyword';
  /** `null` when the computed value did not resolve to a readable length, ratio, or keyword. */
  value: number | string | null;
  /**
   * Which box side this measurement came from, when a property has four of them. Absent for a
   * property read once per element.
   */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /**
   * The sides that share this exact measurement, once the per-side reads are merged. A uniform
   * border collapses to one entry naming all four, so a component keeps reporting one finding for
   * one visual boundary.
   */
  sides?: string[];
}

/**
 * Runs inside the page. Playwright serializes this by source, so it stays self-contained: every
 * helper is nested and `roles` arrives as an argument rather than a closed-over reference.
 *
 * Reads the same computed-style declarations the generator reads, so a live measurement and the
 * band it is checked against came from the same recipe. Two deliberate departures from that
 * parity, both demonstrated rather than assumed:
 *
 *  - Candidacy is the generator's own predicate, a nonzero box and nothing more, NOT the shared
 *    `isVisible`. The rule shipped with the stricter reading and therefore audited a strict subset
 *    of the population its own bands were derived from: the admin's picker dialogs render their
 *    contents at `visibility: hidden` with a full box, so the generator measured them and the rule
 *    could not. On `/admin/posts` and `/admin/pages` that left ZERO auditable `button-primary` and
 *    `input-text` elements, and the `button-primary/height` band's own 30.5px minimum came from an
 *    element the rule refused to look at. A rule and its reference must see the same population.
 *  - Border treatments are read on all four sides, where the generator reads only the top. The band
 *    is still the generator's, and a uniform border is the norm it encodes; reading one side let
 *    `border-width: 1px 12px 12px 12px` and `border-radius: 16px 60px 60px 60px` through clean.
 */
function measureNormsBandCandidates(
  roles: { id: string; family: string; selector: string }[]
): NormsBandCandidate[] {
  const helpers = globalThis.__cairnAudit;

  function isMeasurable(el: Element): boolean {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function asPx(value: string): number | null {
    const match = /^(-?[\d.]+)px$/.exec(value.trim());
    return match ? Number(match[1]) : null;
  }

  const SIDES = ['top', 'right', 'bottom', 'left'] as const;
  const CORNERS = {
    top: 'border-top-left-radius',
    right: 'border-top-right-radius',
    bottom: 'border-bottom-right-radius',
    left: 'border-bottom-left-radius',
  } as const;

  const out: NormsBandCandidate[] = [];
  for (const role of roles) {
    for (const el of document.querySelectorAll(role.selector)) {
      if (!isMeasurable(el)) continue;
      const rect = el.getBoundingClientRect();
      const computed = getComputedStyle(el);
      const sel = helpers ? helpers.signature(el) : el.tagName.toLowerCase();
      const record = (
        property: string,
        kind: 'length' | 'ratio' | 'keyword',
        value: number | string | null,
        side?: (typeof SIDES)[number]
      ) => out.push({ role: role.id, selector: sel, property, kind, value, side });

      if (role.family === 'control') {
        record('height', 'length', rect.height);
        const paddingTop = asPx(computed.getPropertyValue('padding-top'));
        const paddingLeft = asPx(computed.getPropertyValue('padding-left'));
        const fontSize = asPx(computed.getPropertyValue('font-size'));
        record('padding-block', 'length', paddingTop);
        record('padding-inline', 'length', paddingLeft);
        record(
          'padding-block-to-font-size',
          'ratio',
          paddingTop !== null && fontSize ? paddingTop / fontSize : null
        );
        record(
          'padding-inline-to-font-size',
          'ratio',
          paddingLeft !== null && fontSize ? paddingLeft / fontSize : null
        );
      }
      for (const side of SIDES) {
        record('border-radius', 'length', asPx(computed.getPropertyValue(CORNERS[side])), side);
        record('border-width', 'length', asPx(computed.getPropertyValue(`border-${side}-width`)), side);
        record('border-style', 'keyword', computed.getPropertyValue(`border-${side}-style`).trim(), side);
      }
    }
  }
  return out;
}

// Rounding through a step multiplier reintroduces binary floating-point noise, matching the same
// fix norms.ts's own private `roundTo` applies; a live measurement has to round exactly the way the
// band's own edges were rounded, or a value that is genuinely inside the band reads as outside it by
// a fraction of a step.
function roundToStep(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(4));
}

function formatCandidateValue(kind: NormsBandCandidate['kind'], value: number | string): string {
  if (kind === 'keyword') return `"${value}"`;
  const unit = kind === 'length' ? 'px' : '';
  return `${Number(value).toFixed(kind === 'ratio' ? 2 : 1)}${unit}`;
}

// Only ever called with a length, ratio, or keyword band: `isOutsideBand` guards every call site by
// first checking `band.kind` against the candidate's own kind, and a candidate's kind is never
// `'relationship'` (this rule measures geometry, never a color). The exhaustive branch on
// `'relationship'` exists for the type checker, not a reachable case.
function formatBand(band: NormBand): string {
  if (band.kind === 'keyword') return band.values.map((value) => `"${value}"`).join(', ');
  if (band.kind === 'relationship') return band.expressions.join(', ');
  const unit = band.kind === 'length' ? 'px' : '';
  return band.min === band.max ? `${band.min}${unit}` : `${band.min}${unit} to ${band.max}${unit}`;
}

/** Whether `value` falls outside `band`, rounded to the same precision the band was derived under. */
function isOutsideBand(kind: NormsBandCandidate['kind'], value: number | string, band: NormBand): boolean {
  if (kind === 'keyword') return band.kind === 'keyword' && !band.values.includes(String(value));
  if (band.kind !== kind) return false;
  const step = kind === 'length' ? NORM_PRECISION.lengthPx : NORM_PRECISION.ratio;
  const rounded = roundToStep(Number(value), step);
  return rounded < band.min - 1e-6 || rounded > band.max + 1e-6;
}

/**
 * Judge one measured candidate against the manifest it was measured to conform to. Pure over
 * already-collected data, so this is the half of the rule a unit test reaches with no browser in the
 * loop, the same split `interactive-contrast` and `chip-ground-collision` draw between their DOM
 * walk and their color arithmetic.
 *
 * Returns `null` when there is nothing to report: no norm was ever recorded for this role and
 * property (nothing to check against), the norm is unbanded by contract ({@link UNBANDED_FLAGS}),
 * or the measurement falls inside the band. A candidate whose value never resolved to a readable
 * length, ratio, or keyword is reported rather than dropped, the same fail-loud posture every
 * rendered rule takes on an unreadable value.
 */
export function evaluateNormsBandCandidate(
  candidate: NormsBandCandidate,
  manifest: NormsManifest
): RenderedFinding | null {
  const at = candidate.sides && candidate.sides.length < 4 ? ` (${candidate.sides.join('/')})` : '';
  if (candidate.value === null) {
    return {
      ruleId: 'norms-bands',
      tier: 'advisory',
      selector: candidate.selector,
      message:
        `could not measure ${candidate.role}/${candidate.property}${at}: its computed value did not resolve to a ` +
        `readable ${candidate.kind}. Give the element a concrete ${candidate.kind === 'ratio' ? 'padding and font-size' : candidate.kind}, or this step goes unseen. ` +
        `A percentage or elliptical radius is a legitimate pill or circle; allowlist it with that reason rather than converting it.`,
    };
  }

  const entry: NormEntry | undefined = manifest.entries.find(
    (candidateEntry) => candidateEntry.role === candidate.role && candidateEntry.property === candidate.property
  );
  if (!entry) return null;
  if (UNBANDED_FLAGS.some((flag) => entry.flags.includes(flag))) return null;
  if (!isOutsideBand(candidate.kind, candidate.value, entry.band)) return null;

  const measured = formatCandidateValue(candidate.kind, candidate.value);
  const where = `${entry.role}/${entry.property}${at}`;

  if (entry.flags.includes('single-observation')) {
    return {
      ruleId: 'norms-bands',
      tier: 'advisory',
      selector: candidate.selector,
      message:
        `${where} measures ${measured}; the manifest's only other observed value, from a single element site, ` +
        `is ${formatBand(entry.band)}. That is one example, not a settled distribution, so a deliberate, novel ` +
        `choice here may be correct; this finding exists to make sure it was seen, not to forbid it.`,
    };
  }

  return {
    ruleId: 'norms-bands',
    tier: 'advisory',
    selector: candidate.selector,
    message:
      `${where} measures ${measured}, outside the manifest's observed band of ${formatBand(entry.band)} across ` +
      `${entry.observations} sites. A legitimately novel component may step outside a band deliberately; this ` +
      `finding exists to make sure the step was seen, not to forbid it.`,
  };
}

/**
 * Collapse the per-side reads of one element's property into one candidate per distinct value, so a
 * uniform border reports once naming all four sides and a mismatched one reports the sides that
 * differ. A property read once per element passes through untouched.
 */
export function mergeSidedCandidates(candidates: NormsBandCandidate[]): NormsBandCandidate[] {
  const merged = new Map<string, NormsBandCandidate>();
  const out: NormsBandCandidate[] = [];
  for (const candidate of candidates) {
    if (!CHECKED_PROPERTIES.has(candidate.property)) continue;
    if (!candidate.side) {
      out.push(candidate);
      continue;
    }
    const key = `${candidate.role}|${candidate.selector}|${candidate.property}|${String(candidate.value)}`;
    const existing = merged.get(key);
    if (existing) existing.sides?.push(candidate.side);
    else {
      const entry = { ...candidate, sides: [candidate.side] };
      merged.set(key, entry);
      out.push(entry);
    }
  }
  return out;
}

let cachedManifest: NormsManifest | undefined;

/**
 * The shipped manifest, read once per process. `check` runs once per page, theme, and state, and
 * re-reading the file each time paid a filesystem round trip for data that cannot change mid-run.
 */
function manifestOnce(): NormsManifest {
  cachedManifest ??= loadNormsManifest();
  return cachedManifest;
}

/**
 * A component's own control heights, padding-to-type ratios, radii, and border treatments read
 * against the norms manifest's observed bands. Advisory by principle: unlike the
 * error-tier rules, a finding here never states a defect, only a step worth a second look, so the
 * manifest's own honesty disciplines (open-question, single-observation) carry through to the
 * message rather than being smoothed over into a flat pass/fail.
 *
 * Only the `rest` state is read (a component's geometry is a property of its resting render, and the
 * manifest itself was only ever measured at rest), so no `states` field is declared; the runner's
 * default `['rest']` already covers this rule.
 */
export const normsBands: RenderedRule = {
  id: 'norms-bands',
  tier: 'advisory',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    const manifest = manifestOnce();
    const roles = manifest.roles
      .filter((role) => CHECKED_FAMILIES.has(role.family))
      .map((role) => ({ id: role.id, family: role.family, selector: role.selector }));
    if (roles.length === 0) return [];
    await ensurePageHelpers(ctx.page);

    // Every rule registered for one interaction state shares one page in sequence (runRendered's
    // rule loop), so the original viewport is restored before returning and the next rule never
    // inherits a viewport it did not ask for. A page whose viewport is the CONTEXT's carries no
    // original, and Playwright has no way to hand one back, so the resize never happens: borrowing
    // a viewport with no return path is how every later-registered rule ended up measuring at a
    // width this rule picked.
    const original = ctx.page.viewportSize();
    const findings: RenderedFinding[] = [];
    if (!original) {
      findings.push({
        ruleId: 'norms-bands',
        tier: 'advisory',
        selector: 'html',
        message:
          `this page inherits its viewport from the browser context, so the manifest's pinned ` +
          `${VIEWPORT.width}x${VIEWPORT.height} could not be borrowed and given back. Geometry moves with the ` +
          `viewport, so the measurements below were taken at whatever width the context set.`,
      });
    }
    try {
      if (original) await ctx.page.setViewportSize(VIEWPORT);
      const measured = await ctx.page.evaluate(measureNormsBandCandidates, roles);
      for (const candidate of mergeSidedCandidates(measured)) {
        const finding = evaluateNormsBandCandidate(candidate, manifest);
        if (finding) findings.push(finding);
      }
      return findings;
    } finally {
      if (original) await ctx.page.setViewportSize(original);
    }
  },
};
