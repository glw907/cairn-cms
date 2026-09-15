// cairn-audit's motion-vocabulary rule: every transition or animation duration and easing curve a
// component declares must resolve to one of cairn's eight motion tokens, the five durations and
// three curves the admin theme roots carry. motion-band already polices a declaration's raw
// duration span (70-400ms) and `transition: all`; this rule polices the AUTHORING FORM a duration
// or an easing curve is written in, literal versus a `var(--cairn-dur-*)`/`var(--cairn-ease-*)`
// reference, on both surfaces a declaration can appear: a component's own hand-authored CSS (and
// any `static.cssFiles` entry) and the compiled Tailwind class join.
//
// The companion assertion is part of this rule, not a separate check. A `transition-*` class with
// no sibling `duration-*`/`ease-*` class, or a CSS declaration naming only `transition-property`,
// compiles to nothing this rule can classify: it rides Tailwind's `--default-transition-duration`
// and `--default-transition-timing-function`, which the admin's built sheet repoints at
// `var(--cairn-dur-base)` and `var(--cairn-ease-standard)` on both `[data-theme='cairn-admin']`
// and `[data-theme='cairn-admin-dark']`. Without verifying that repointing in the built sheet
// itself, this rule's pass verdict on every such declaration would be a lie resting on an
// assumption nothing here proves. When the assertion fails, the rule reports the assertion rather
// than the relying element, once per run, because the fault is the theme root's, not the class or
// declaration that trusted it.
//
// The `infinite` carve-out is positive. An animation declared `infinite` is exempt from the
// duration check only, its span is deliberately unchecked because a loop has no perceived
// "duration" the token band describes. Its easing is still checked, against the one literal value
// the carve-out permits: `linear`. Declaring any other curve on an infinite loop runs the curve
// backward every repeat, which is why the carve-out names one keyword rather than widening to the
// token set.
//
// Three shapes record a note instead of a finding, each because this rule's own hand-rolled
// parsing genuinely cannot resolve the value, not because the construct is presumed legal: a
// var() occupying the shorthand's own property slot (the first token of `transition`/`animation`
// is dynamic, so which construct is even being described is unknown); a calc() expression over a
// variable this rule does not own (the resolved millisecond value is unknowable statically); and a
// shorthand carrying an `allow-discrete` keyword (CSS Transitions Level 2's extra token, which this
// rule does not attempt to parse around). `motionVocabularyAbstentions` exposes the notes
// separately, since `StaticRule.check` carries only findings.
//
// The vendor-class exemption mirrors motion-property's own discriminator and its own limit: the
// compiled sheet's `conditions` cannot attribute a declaration to DaisyUI's plugin output (cairn's
// own rules share the same `@layer components` prelude), so the working discriminator is the
// explicit DaisyUI class-name list below, not the attribution `conditions` was hoped to carry. Its
// fallback limit is the same limit motion-property's own class-name list carries: a cairn-authored
// class that happens to share a name with a listed DaisyUI component would be wrongly exempted,
// which is why the list stays short and reviewed rather than pattern-matched.
//
// Three join limits, stated as what they miss rather than claimed away, none exercised by a
// fixture below because each is a structural property of the class join itself:
// - A conditional class (`open ? 'duration-base' : 'duration-quick'`) puts two values in one
//   markup slot. This rule reports on EVERY branch the markup expresses as a literal class list,
//   abstaining only where a verdict would need to know which branch is live, which this rule never
//   needs since a bad token is bad on either branch.
// - The token dedup a shared substrate keys on drops the second class owner: two elements sharing
//   one compiled class rule are indistinguishable to `ctx.sheet.declarations()`, so a finding
//   attributes to whichever markup site the walk reaches first. Accepted as a false negative on
//   the second owner, since changing the dedup key changes the shared substrate every static rule
//   reads.
// - A cross-component pair, a duration class on one component and its paired easing class on a
//   sibling component the two never share a file with, is out of reach: this rule (like every
//   static rule) reads one component's own markup and CSS at a time.
import { cssRulePosition, cssScopeRules } from './css-scope.js';
import { animateCustomProperty, customPropertyValue } from './motion.js';
import { utilityBase } from './utility.js';
import type { CompiledSheet } from '../../sheet.js';
import type { ClassToken, ParsedComponent } from '../../markup.js';
import type { Finding, StaticRule, StaticRuleContext } from '../../types.js';

type Surface = 'css' | 'class';

const DURATION_BEARING = new Set(['transition', 'transition-duration', 'animation', 'animation-duration']);
// The shorthand and list forms the companion clause keys on: a declaration naming one of these and
// no explicit duration or easing is an element riding the theme root's Tailwind defaults.
const MOTION_SHORTHAND_OR_LIST = new Set(['transition', 'transition-property', 'animation', 'animation-name']);
const EASING_BEARING = new Set([
  'transition',
  'transition-timing-function',
  'animation',
  'animation-timing-function',
]);

const DURATION_TOKENS = [
  { name: '--cairn-dur-instant', ms: 70 },
  { name: '--cairn-dur-quick', ms: 110 },
  { name: '--cairn-dur-base', ms: 150 },
  { name: '--cairn-dur-shift', ms: 240 },
  { name: '--cairn-dur-settle', ms: 400 },
];

const DURATION_VAR = /var\(\s*--cairn-dur-(?:instant|quick|base|shift|settle)\s*\)/;
const EASE_VAR = /var\(\s*--cairn-ease-(?:standard|entrance|exit)\s*\)/;
const LITERAL_TIME = /(-?\d*\.?\d+)(m?s)\b/g;
const BARE_EASE_KEYWORD = /(?<![\w-])(ease-in-out|ease-in|ease-out|ease|linear|step-start|step-end|steps\(|cubic-bezier\()/;
const INFINITE_WORD = /\binfinite\b/;
const ALLOW_DISCRETE = /\ballow-discrete\b/;
const CALC_FOREIGN_VAR = /calc\([^;]*var\(\s*--(?!cairn-dur-|cairn-ease-)/;

// Every compiled Tailwind transition utility carries `transition-duration: var(--tw-duration, var(
// --default-transition-duration))` and the easing equivalent: the value never resolves statically,
// it rides whichever default the theme root sets. Such a value is treated as riding the default
// rather than as an explicit literal or token reference, so the companion assertion (not this
// per-declaration check) is what stands behind it.
const DEFAULT_RIDING_VAR = /var\(\s*--(?:tw-duration|tw-ease|default-transition-duration|default-transition-timing-function)\b/;

// The same discriminator motion-property uses, reproduced rather than imported (this rule owns no
// file that re-exports it): the built sheet's `conditions` cannot attribute a rule to DaisyUI's
// plugin output, so the explicit class-name list is the only discriminator that actually works.
// `.btn` is measured at five properties across 19 elements at rest on `/admin/posts`, added
// beside motion-property's own four vendor classes.
const DAISYUI_VENDOR_CLASSES = new Set(['btn', 'drawer-side', 'filter', 'collapse', 'toggle']);

const ADMIN_ROOT_SELECTORS = ["[data-theme='cairn-admin']", "[data-theme='cairn-admin-dark']"];

/** Normalizes a selector's quote character so a double-quoted build output matches a single-quoted one. */
function normalizeSelectorQuotes(selector: string): string {
  return selector.replace(/"/g, "'");
}

interface VocabEvent {
  message: string;
  abstain: boolean;
  file: string;
  line: number;
  start: number;
  end: number;
}

interface DeclarationVerdict {
  messages: string[];
  abstain?: string;
  ridesDefault?: boolean;
}

/** The nearest of the five duration tokens to a literal millisecond value, by absolute difference. */
function nearestDurationToken(ms: number): { name: string; ms: number } {
  return DURATION_TOKENS.reduce((best, candidate) =>
    Math.abs(candidate.ms - ms) < Math.abs(best.ms - ms) ? candidate : best
  );
}

function durationAuthoringForm(tokenName: string, surface: Surface): string {
  return surface === 'css' ? `var(${tokenName})` : `duration-(${tokenName})`;
}

function easingAuthoringForm(surface: Surface): string {
  return surface === 'css' ? 'var(--cairn-ease-standard)' : 'ease-(--cairn-ease-standard)';
}

function durationMessage(declProperty: string, declValue: string, literalText: string, ms: number, surface: Surface): string {
  const nearest = nearestDurationToken(ms);
  return (
    `"${declProperty}: ${declValue}" declares a literal ${literalText} duration, outside cairn's closed motion ` +
    `vocabulary; the nearest cairn duration token is ${nearest.name} (${nearest.ms}ms), so write ` +
    `${durationAuthoringForm(nearest.name, surface)} instead`
  );
}

function easingMessage(declProperty: string, declValue: string, literalKeyword: string, surface: Surface): string {
  return (
    `"${declProperty}: ${declValue}" declares a literal easing curve "${literalKeyword}", outside cairn's closed ` +
    `motion vocabulary; write ${easingAuthoringForm(surface)} instead`
  );
}

function infiniteEasingMessage(declProperty: string, declValue: string, found: string): string {
  return (
    `"${declProperty}: ${declValue}" is an infinite animation, which must declare the literal easing keyword ` +
    `"linear" (found "${found}"); any other curve runs the perceived motion backward every loop`
  );
}

function companionAssertionMessage(): string {
  return (
    "cairn-audit's companion assertion could not confirm that both [data-theme='cairn-admin'] and " +
    "[data-theme='cairn-admin-dark'] set --default-transition-duration and " +
    '--default-transition-timing-function to cairn motion tokens in the built sheet, so an element ' +
    'whose class declares no explicit duration or easing cannot be trusted to inherit a legal one; ' +
    'fix the theme root declarations rather than this element'
  );
}

/** Whether the built sheet's two admin theme roots repoint the Tailwind transition defaults at cairn tokens. */
function companionAssertionOk(sheet: CompiledSheet): boolean {
  return ADMIN_ROOT_SELECTORS.every((selector) =>
    sheet.rules.some(
      (rule) =>
        normalizeSelectorQuotes(rule.selector) === selector &&
        rule.declarations.some((decl) => decl.property === '--default-transition-duration' && DURATION_VAR.test(decl.value)) &&
        rule.declarations.some(
          (decl) => decl.property === '--default-transition-timing-function' && EASE_VAR.test(decl.value)
        )
    )
  );
}

/** The one of the three abstention shapes a declaration's value carries, or none. */
function abstentionReason(property: string, value: string): string | undefined {
  if (ALLOW_DISCRETE.test(value)) {
    return 'a shorthand carrying an allow-discrete keyword; this rule does not parse around the extra CSS Transitions Level 2 token and abstains rather than guess';
  }
  if ((property === 'transition' || property === 'animation') && /^\s*var\(/.test(value)) {
    return 'a var() occupying the shorthand property slot, so which property or keyframe is being animated cannot be read statically';
  }
  if (CALC_FOREIGN_VAR.test(value)) {
    return "a calc() expression over a variable this rule does not own, so the resolved duration cannot be checked";
  }
  return undefined;
}

/** Whether an infinite animation's easing carries the one permitted literal, `linear`. */
function infiniteEasingOk(value: string): { ok: boolean; found: string } {
  const match = BARE_EASE_KEYWORD.exec(value);
  const found = match ? match[0] : 'no easing keyword';
  return { ok: found === 'linear', found };
}

/** One declaration's duration/easing verdict, or `undefined` when it names neither property. */
function evaluateDeclaration(property: string, value: string, surface: Surface): DeclarationVerdict | undefined {
  const durationBearing = DURATION_BEARING.has(property);
  const easingBearing = EASING_BEARING.has(property);
  if (!durationBearing && !easingBearing) return undefined;

  const abstain = abstentionReason(property, value);
  if (abstain) return { messages: [], abstain };

  if (DEFAULT_RIDING_VAR.test(value)) return { messages: [], ridesDefault: true };

  const infinite = property === 'animation' && INFINITE_WORD.test(value);
  const messages: string[] = [];

  if (durationBearing && !infinite && !DURATION_VAR.test(value)) {
    for (const match of value.matchAll(LITERAL_TIME)) {
      const amount = Number(match[1]);
      const ms = match[2] === 's' ? amount * 1000 : amount;
      messages.push(durationMessage(property, value, `${match[1]}${match[2]}`, ms, surface));
    }
  }

  if (easingBearing) {
    if (infinite) {
      const { ok, found } = infiniteEasingOk(value);
      if (!ok) messages.push(infiniteEasingMessage(property, value, found));
    } else if (!EASE_VAR.test(value)) {
      const match = BARE_EASE_KEYWORD.exec(value);
      if (match) messages.push(easingMessage(property, value, match[0], surface));
    }
  }

  return { messages };
}

interface DeclarationScanResult {
  messages: string[];
  abstains: string[];
  sawMotionShorthand: boolean;
  sawDurationOrEasing: boolean;
}

function scanDeclarations(declarations: { property: string; value: string }[], surface: Surface): DeclarationScanResult {
  const messages: string[] = [];
  const abstains: string[] = [];
  let sawMotionShorthand = false;
  let sawDurationOrEasing = false;
  for (const decl of declarations) {
    if (MOTION_SHORTHAND_OR_LIST.has(decl.property)) sawMotionShorthand = true;
    const verdict = evaluateDeclaration(decl.property, decl.value, surface);
    if (!verdict) continue;
    if (verdict.abstain) {
      abstains.push(verdict.abstain);
      continue;
    }
    if (verdict.ridesDefault) continue;
    sawDurationOrEasing = true;
    if (verdict.messages.length > 0) messages.push(verdict.messages.join('; '));
  }
  return { messages, abstains, sawMotionShorthand, sawDurationOrEasing };
}

function tokenPosition(file: ParsedComponent, token: ClassToken): Pick<Finding, 'file' | 'line' | 'start' | 'end'> {
  return { file: file.file, line: token.line, start: token.start, end: token.end };
}

/** The companion assertion's verdict, plus whether this run has already reported it once. */
interface CompanionState {
  ok: boolean;
  emitted: boolean;
}

type EventPosition = Pick<VocabEvent, 'file' | 'line' | 'start' | 'end'>;

/**
 * One scanned surface's events, in report order: its findings, then its abstention notes, then the
 * companion assertion when this is the first declaration in the run to rely on the theme root's
 * defaults while that assertion is failing.
 */
function* scanEvents(
  result: DeclarationScanResult,
  position: EventPosition,
  companion: CompanionState
): Generator<VocabEvent> {
  for (const message of result.messages) yield { message, abstain: false, ...position };
  for (const reason of result.abstains) yield { message: reason, abstain: true, ...position };
  if (result.sawMotionShorthand && !result.sawDurationOrEasing && !companion.ok && !companion.emitted) {
    companion.emitted = true;
    yield { message: companionAssertionMessage(), abstain: false, ...position };
  }
}

function* walkCssFamily(ctx: StaticRuleContext, companion: CompanionState): Generator<VocabEvent> {
  for (const scope of cssScopeRules(ctx)) {
    const result = scanDeclarations(scope.rule.declarations, 'css');
    yield* scanEvents(result, cssRulePosition(scope), companion);
  }
}

function* walkClassJoin(ctx: StaticRuleContext, companion: CompanionState): Generator<VocabEvent> {
  for (const file of ctx.files) {
    for (const token of file.classTokens) {
      const base = utilityBase(token.value);
      if (DAISYUI_VENDOR_CLASSES.has(base)) continue;
      const position = tokenPosition(file, token);

      if (base.startsWith('animate-')) {
        for (const decl of ctx.sheet.declarations(token.value)) {
          if (decl.property !== 'animation' && decl.property !== 'animation-name') continue;
          const customProperty = animateCustomProperty(decl.value);
          if (!customProperty) continue;
          const animationValue = customPropertyValue(ctx.sheet, customProperty);
          if (!animationValue) continue;
          const verdict = evaluateDeclaration('animation', animationValue, 'class');
          if (!verdict) continue;
          if (verdict.abstain) {
            yield { message: verdict.abstain, abstain: true, ...position };
            continue;
          }
          if (verdict.messages.length > 0) {
            yield { message: verdict.messages.join('; '), abstain: false, ...position };
          }
        }
        continue;
      }

      const result = scanDeclarations(ctx.sheet.declarations(token.value), 'class');
      yield* scanEvents(result, position, companion);
    }
  }
}

function* walkMotionVocabulary(ctx: StaticRuleContext): Generator<VocabEvent> {
  const companion: CompanionState = { ok: companionAssertionOk(ctx.sheet), emitted: false };
  yield* walkCssFamily(ctx, companion);
  yield* walkClassJoin(ctx, companion);
}

export const motionVocabulary: StaticRule = {
  id: 'motion-vocabulary',
  tier: 'error',
  adminOnly: true,
  check(ctx) {
    const findings: Finding[] = [];
    for (const event of walkMotionVocabulary(ctx)) {
      if (event.abstain) continue;
      findings.push({
        ruleId: 'motion-vocabulary',
        tier: 'error',
        file: event.file,
        line: event.line,
        start: event.start,
        end: event.end,
        message: event.message,
      });
    }
    return findings;
  },
};

/**
 * The abstention notes {@link motionVocabulary} records instead of a finding, one per declaration
 * matching one of the rule's own doc comment's three abstention shapes. Exposed separately because
 * {@link StaticRule.check} carries only findings, and a check that skips itself needs a visible
 * trace for a test to hold it to.
 */
export function motionVocabularyAbstentions(ctx: StaticRuleContext): { file: string; line: number; reason: string }[] {
  const notes: { file: string; line: number; reason: string }[] = [];
  for (const event of walkMotionVocabulary(ctx)) {
    if (event.abstain) notes.push({ file: event.file, line: event.line, reason: event.message });
  }
  return notes;
}
