// cairn-audit's motion-property rule: the closed property allowlist the admin's motion language
// permits a transition or an animation to touch. Paint (opacity, color, shadow, outline, and the
// composited transforms) never judders and never triggers layout; nine named layout properties are
// the errors this admin has already shipped and removed once, so their message names the hazard
// directly, and anything neither allowlisted nor named still fails as outside the language, with a
// different message, because it is a construct nobody has reasoned about yet. `transition: all` and
// `transition-all` are motion-band's own construct and are never re-reported here.
//
// Three surfaces feed the same classification. Hand-authored CSS (a component's own scoped
// `<style>` block, or a file `static.cssFiles` names) is read in full: authored code owns its own
// property choice. A Tailwind class the built admin sheet compiles is read through the class join,
// exempting the four recorded vendor component classes rather than fixing them: `conditions` alone
// cannot attribute a declaration to DaisyUI's own plugin output, since cairn's own rules share the
// same `@layer components` and the same theme-root prelude, so the fallback is the explicit class
// list below. The class join also exempts Tailwind's own compiled `transition-property` utility
// group (`transition`, `transition-all`, `transition-colors`, `transition-opacity`,
// `transition-shadow`, `transition-transform`): the same vendor category as the DaisyUI classes,
// since `.transition-colors` compiles to ten names the shipped sheet chose, not the class author.
// The exemption is keyed on the utility name alone, never on what its compiled list contains, so an
// arbitrary-value class such as `transition-[width]`, whose bracket names the property the author
// typed, keeps its ordinary conviction. And an `animate-*` utility is checked through its
// `--animate-*` custom property's keyframes, since animating a snap-list property is the same
// judder as transitioning one.
//
// The frame offset is the one documented exception, keyed on the attribute plus the property: an
// element carrying `data-cairn-motion="frame-offset"` may transition `margin-left`, and only the
// first such element in a file earns the allowance. There is no file key and no selector key, so a
// consumer claims the identical allowance the shell does.
import { cssRulePosition, cssScopeRules } from './css-scope.js';
import { animateCustomProperty, customPropertyValue } from './motion.js';
import { utilityBase } from './utility.js';
import type { CompiledSheet } from '../../sheet.js';
import type { ClassToken, ParsedComponent, SourceNode } from '../../markup.js';
import type { Finding, StaticRule, StaticRuleContext } from '../../types.js';

const PAINT_ALLOWLIST = new Set([
  'opacity',
  'color',
  'background-color',
  'border-color',
  'box-shadow',
  'outline-color',
  'outline-width',
  'outline-offset',
  'rotate',
  'translate',
  'scale',
  'transform',
  'grid-template-rows',
]);

const MARGIN_LONGHANDS = [
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'margin-inline',
  'margin-inline-start',
  'margin-inline-end',
  'margin-block',
  'margin-block-start',
  'margin-block-end',
];
const PADDING_LONGHANDS = MARGIN_LONGHANDS.map((name) => name.replace('margin', 'padding'));

const NAMED_ERROR = new Set([
  'width',
  'height',
  'top',
  'left',
  'right',
  'bottom',
  'margin',
  'padding',
  'font-size',
  ...MARGIN_LONGHANDS,
  ...PADDING_LONGHANDS,
]);

// The four recorded DaisyUI component disagreements, never convicted, each measured against the
// shipped admin sheet: `.drawer-side` transitioning `width`, `.filter input`
// transitioning `margin`, `padding`, and `border-width`, `.collapse ::details-content` transitioning
// `min-height`, `padding`, and `height`, and `.toggle:before` transitioning `inset-inline-start`.
const DAISYUI_VENDOR_CLASSES = new Set(['drawer-side', 'filter', 'collapse', 'toggle']);

// Tailwind's own compiled `transition-property` utility group. Each name here compiles a fixed,
// vendor-chosen property list the class author does not type; `transition-[width]` and any other
// bracketed arbitrary form are deliberately absent, since their bracket names the property the
// author chose, the same authored decision the allowlist exists to check.
const TAILWIND_TRANSITION_UTILITIES = new Set([
  'transition',
  'transition-all',
  'transition-colors',
  'transition-opacity',
  'transition-shadow',
  'transition-transform',
]);

const FRAME_OFFSET_ATTRIBUTE = 'data-cairn-motion';
const FRAME_OFFSET_VALUE = 'frame-offset';
const FRAME_OFFSET_SELECTOR = '[data-cairn-motion="frame-offset"]';
const FRAME_OFFSET_PROPERTY = 'margin-left';

const ALLOWLIST_PHRASE =
  "cairn's motion property allowlist (opacity, color, background-color, border-color, box-shadow, " +
  'outline-color, outline-width, outline-offset, rotate, translate, scale, transform, and ' +
  'grid-template-rows)';

type Verdict = 'ok' | 'named-error' | 'outside';

/** Where one transition or animation property name sits against the closed allowlist. */
function classifyProperty(name: string): Verdict {
  const property = name.trim();
  if (PAINT_ALLOWLIST.has(property)) return 'ok';
  if (NAMED_ERROR.has(property)) return 'named-error';
  return 'outside';
}

function propertyMessage(
  declProperty: string,
  declValue: string,
  name: string,
  verdict: 'named-error' | 'outside'
): string {
  if (verdict === 'named-error') {
    return (
      `"${declProperty}: ${declValue}" transitions "${name}", a layout property whose change forces reflow and judders under a transition; it is not on ${ALLOWLIST_PHRASE}, ` +
      'so move the change onto an allowlisted paint property, or claim the one documented frame-offset exception if this is the persistent-frame case it covers'
    );
  }
  return (
    `"${declProperty}: ${declValue}" transitions "${name}", which is neither on ${ALLOWLIST_PHRASE} nor named as a known layout hazard; ` +
    'express the change through a property the motion language already covers'
  );
}

function capMessage(declProperty: string, declValue: string, count: number): string {
  return (
    `"${declProperty}: ${declValue}" names ${count} properties in one declaration, over the ` +
    'three-property cap; split the transition so each property change stays independently reviewable'
  );
}

/** Whether a declaration's own property carries a comma list of transitioned property names. */
function isTransitionListProperty(property: string): boolean {
  return property === 'transition' || property === 'transition-property';
}

/** The transitioned property names a `transition`/`transition-property` value lists, `all` cleared. */
function propertyNamesIn(value: string): string[] {
  const names = value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter((name) => name.length > 0);
  return names.length === 1 && names[0] === 'all' ? [] : names;
}

function isFrameOffsetSelector(selector: string): boolean {
  return selector.includes(FRAME_OFFSET_SELECTOR);
}

function carriesFrameOffset(node: SourceNode): boolean {
  return (node.attributes ?? []).some(
    (attribute) => attribute.name === FRAME_OFFSET_ATTRIBUTE && attribute.value === FRAME_OFFSET_VALUE
  );
}

/**
 * Every message one declaration earns: the three-property cap first, then one per transitioned
 * name the allowlist rejects. A declaration that names no property list earns nothing.
 */
function declarationMessages(decl: { property: string; value: string }): string[] {
  if (!isTransitionListProperty(decl.property)) return [];
  const names = propertyNamesIn(decl.value);
  const messages: string[] = [];
  if (names.length > 3) messages.push(capMessage(decl.property, decl.value, names.length));
  for (const name of names) {
    const verdict = classifyProperty(name);
    if (verdict !== 'ok') messages.push(propertyMessage(decl.property, decl.value, name, verdict));
  }
  return messages;
}

/** The CSS-family surface: a component's own `<style>` block, plus every `cssFiles` entry. */
function checkCssFamily(ctx: StaticRuleContext): Finding[] {
  const findings: Finding[] = [];
  for (const scope of cssScopeRules(ctx)) {
    if (isFrameOffsetSelector(scope.rule.selector)) continue; // the frame-offset check owns this rule
    for (const decl of scope.rule.declarations) {
      for (const message of declarationMessages(decl)) {
        findings.push({
          ruleId: 'motion-property',
          tier: 'error',
          ...cssRulePosition(scope),
          message,
        });
      }
    }
  }
  return findings;
}

/** One markup class token's compiled declarations, the class-join surface. */
function checkClassJoin(ctx: StaticRuleContext): Finding[] {
  const findings: Finding[] = [];
  for (const file of ctx.files) {
    for (const token of file.classTokens) {
      const base = utilityBase(token.value);
      if (DAISYUI_VENDOR_CLASSES.has(base)) continue;
      if (TAILWIND_TRANSITION_UTILITIES.has(base)) continue;
      for (const decl of ctx.sheet.declarations(token.value)) {
        for (const message of declarationMessages(decl)) {
          findings.push(tokenFinding(file, token, message));
        }
      }
    }
  }
  return findings;
}

/** The keyframe name a `--animate-*` custom property names, read off its own declared value. */
function resolveKeyframeName(sheet: CompiledSheet, customProperty: string): string | undefined {
  return customPropertyValue(sheet, customProperty)?.split(/\s+/)[0];
}

/** Every declaration inside a named `@keyframes` block, across all its steps. */
function keyframeDeclarations(sheet: CompiledSheet, name: string): { property: string; value: string }[] {
  const marker = new RegExp(`^@keyframes\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  return sheet.rules
    .filter((rule) => rule.conditions.some((condition) => marker.test(condition.trim())))
    .flatMap((rule) => rule.declarations);
}

/** An `animate-*` utility checked through its `--animate-*` custom property's keyframes. */
function checkAnimateKeyframes(ctx: StaticRuleContext): Finding[] {
  const findings: Finding[] = [];
  for (const file of ctx.files) {
    for (const token of file.classTokens) {
      if (!utilityBase(token.value).startsWith('animate-')) continue;
      for (const decl of ctx.sheet.declarations(token.value)) {
        if (decl.property !== 'animation' && decl.property !== 'animation-name') continue;
        const customProperty = animateCustomProperty(decl.value);
        if (!customProperty) continue;
        const keyframeName = resolveKeyframeName(ctx.sheet, customProperty);
        if (!keyframeName) continue;
        for (const kfDecl of keyframeDeclarations(ctx.sheet, keyframeName)) {
          const verdict = classifyProperty(kfDecl.property);
          if (verdict === 'ok') continue;
          findings.push(tokenFinding(file, token, propertyMessage(kfDecl.property, kfDecl.value, kfDecl.property, verdict)));
        }
      }
    }
  }
  return findings;
}

interface FrameOffsetProperty {
  name: string;
  declProperty: string;
  declValue: string;
}

/** The properties the frame-offset declaring rule transitions, from every CSS-family scope. */
function frameOffsetProperties(ctx: StaticRuleContext): FrameOffsetProperty[] {
  const out: FrameOffsetProperty[] = [];
  for (const scope of cssScopeRules(ctx)) {
    if (!isFrameOffsetSelector(scope.rule.selector)) continue;
    for (const decl of scope.rule.declarations) {
      if (!isTransitionListProperty(decl.property)) continue;
      for (const name of propertyNamesIn(decl.value)) {
        out.push({ name, declProperty: decl.property, declValue: decl.value });
      }
    }
  }
  return out;
}

/**
 * The frame-offset exception: an element carrying `data-cairn-motion="frame-offset"` may
 * transition `margin-left`, and only the first such element in a file (one screen) earns the
 * allowance. A second layout property on the declaring rule is never exempt, and a second
 * carrying element loses the allowance entirely, both convicted the same as an ordinary finding.
 */
function checkFrameOffset(ctx: StaticRuleContext): Finding[] {
  const declared = frameOffsetProperties(ctx);
  if (declared.length === 0) return [];
  const findings: Finding[] = [];
  for (const file of ctx.files) {
    const carrying = file.nodes.filter(carriesFrameOffset);
    carrying.forEach((node, index) => {
      const isFirstOnScreen = index === 0;
      for (const property of declared) {
        if (isFirstOnScreen && property.name === FRAME_OFFSET_PROPERTY) continue;
        const verdict = classifyProperty(property.name);
        if (verdict === 'ok') continue;
        findings.push({
          ruleId: 'motion-property',
          tier: 'error',
          file: file.file,
          line: node.startLine,
          start: node.start,
          end: node.end,
          message: propertyMessage(property.declProperty, property.declValue, property.name, verdict),
        });
      }
    });
  }
  return findings;
}

function tokenFinding(file: ParsedComponent, token: ClassToken, message: string): Finding {
  return {
    ruleId: 'motion-property',
    tier: 'error',
    file: file.file,
    line: token.line,
    start: token.start,
    end: token.end,
    message,
  };
}

export const motionProperty: StaticRule = {
  id: 'motion-property',
  tier: 'error',
  adminOnly: true,
  check(ctx) {
    return [
      ...checkCssFamily(ctx),
      ...checkClassJoin(ctx),
      ...checkAnimateKeyframes(ctx),
      ...checkFrameOffset(ctx),
    ];
  },
};
