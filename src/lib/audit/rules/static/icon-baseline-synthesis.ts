// cairn-audit's icon-baseline-synthesis rule: a flex item whose OWN display is inline-flex, and
// whose first rendered child is an icon, placed directly inside a container that declares
// items-baseline (any breakpoint prefix), synthesises a flex baseline from the icon rather than
// from its own text. A flex container with no item that is itself baseline-aligned reports a
// baseline from its FIRST item, so the icon (never the word beside it) supplies the row's
// baseline, and the label's own text lands wherever the icon's cross-axis placement leaves it,
// not on the row's shared text baseline (docs/internal/admin-design-system.md, "The recipes",
// `.cairn-icon-label`). This is the mechanic the 2026-08 inventory confirmed at three call sites
// in `CairnTidySettings.svelte`, fixed by giving the label `.cairn-icon-label` instead of a bare
// `inline-flex`, before this rule existed to hold the fix.
//
// This is deliberately structural, never measured: the defect IS the markup shape, an inline-flex
// wrapper that turns an icon-plus-word pair into its own flex context, so no rendered geometry is
// needed to see it. That is the same authored-vs-rendered line that kept motion-band, gap-scale
// and token-colors static after touch-targets and interactive-contrast graduated to rendered
// because a regex could not read computed geometry; this mechanic never needed to measure
// anything; the class list and the first child's tag name are the whole finding.
//
// Four guards keep the structural read from becoming a false positive. (1) A label that carries
// its own `items-baseline` has already applied the recipe's load-bearing half (the recipe
// baseline-aligns the label's own items so the word, not the icon, supplies the label's baseline);
// a label that opts out of the row's `align-items` entirely with a `self-*` utility is exempt for
// the same reason a value never reaches the row's alignment in the first place. (2) A container
// whose own effective flex-direction at the `items-baseline` token's breakpoint is `column`, not
// `row`, never synthesises a baseline this way: `align-items: baseline` on a column-direction
// container behaves as `flex-start` along the inline axis. (3) A class token sourced from a
// Svelte `class:` directive, or one that shares its variant prefix with another member of the
// same mutually exclusive utility group (two `display` values, two `align-items` values), is the
// shape a conditional expression's two branches leave once `markup.ts` merges both into one
// element's class set; such a token is read as unreliable rather than proof the class always
// applies. All three only make the rule quieter, never louder: the finding withheld may still be
// a real defect at runtime, which is the acceptable direction of error for an error-tier rule.
// (4) Icon detection also reads a bare sizing wrapper one level deep, a common way to give an icon
// its own size box; it remains a naming and shape convention, never an import resolution, so an
// icon imported under an alias that drops the `*Icon` suffix stays a documented miss, not a wrong
// flag.
import { utilityBase } from './utility.js';
import type { ClassToken, ParsedComponent, SourceNode } from '../../markup.js';
import type { Finding, StaticRule } from '../../types.js';

const MESSAGE =
  'this label is its own inline-flex flex context with an icon as its first child, inside a row ' +
  'declaring items-baseline; a flex container with no baseline-aligned item synthesises the row\'s ' +
  'baseline from its FIRST item, the icon, not from the label\'s own word, so the declared ' +
  'items-baseline alignment cannot hold. Give the label .cairn-icon-label instead of inline-flex ' +
  '(docs/internal/admin-design-system.md, "The recipes")';

const ICON_COMPONENT_NAME = /Icon$/;

// The Tailwind utility groups this rule treats as mutually exclusive: at most one member of a
// group applies to a real, non-conditional element, so two members sharing a variant prefix mark
// the shape a ternary's two branches leave behind.
const DISPLAY_GROUP = new Set([
  'flex',
  'inline-flex',
  'block',
  'inline-block',
  'grid',
  'inline-grid',
  'hidden',
]);
const ALIGN_ITEMS_GROUP = new Set([
  'items-start',
  'items-end',
  'items-center',
  'items-baseline',
  'items-baseline-last',
  'items-stretch',
]);
const DIRECTION_GROUP = new Set(['flex-row', 'flex-row-reverse', 'flex-col', 'flex-col-reverse']);

// Tailwind's default breakpoint names, narrowest first, index 0 reserved for the unprefixed base.
const BREAKPOINTS = ['', 'sm', 'md', 'lg', 'xl', '2xl'];

/** The class tokens written on one element, grouped by the element's own start offset. */
function classesByElement(file: ParsedComponent): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  for (const token of file.classTokens) {
    const set = map.get(token.elementStart);
    if (set) set.add(token.value);
    else map.set(token.elementStart, new Set([token.value]));
  }
  return map;
}

function nodeAt(file: ParsedComponent, start: number): SourceNode | undefined {
  return file.nodes.find((node) => node.start === start);
}

/** Whether any class an element carries resolves, variant prefix stripped, to the given utility. */
function hasUtility(classes: Set<string> | undefined, utility: string): boolean {
  if (!classes) return false;
  for (const value of classes) {
    if (utilityBase(value) === utility) return true;
  }
  return false;
}

/** Whether any class an element carries opts it out of the container's `align-items` outright. */
function hasSelfAlign(classes: Set<string> | undefined): boolean {
  if (!classes) return false;
  for (const value of classes) {
    if (utilityBase(value).startsWith('self-')) return true;
  }
  return false;
}

/** The variant chain a class token carries before its utility, `''` for an unprefixed token. */
function variantPrefix(token: string): string {
  return token.slice(0, token.length - utilityBase(token).length);
}

/** A variant chain's own responsive breakpoint: base level (`0`) when it names none. */
function breakpointIndex(prefix: string): number {
  const segments = prefix.split(':').filter((segment) => segment.length > 0);
  for (const segment of segments) {
    const index = BREAKPOINTS.indexOf(segment);
    if (index !== -1) return index;
  }
  return 0;
}

/**
 * The row's own flex-direction at the breakpoint an `items-baseline` token itself applies from:
 * the highest breakpoint at or below the token's own that also declares a direction utility,
 * defaulting to `row`, flex's initial value, when none does. Tailwind's responsive variants are
 * all min-width media queries, so this is the direction that actually governs once the viewport
 * reaches the token's own breakpoint.
 */
function effectiveDirectionAt(classes: Set<string>, atPrefix: string): 'row' | 'column' {
  const at = breakpointIndex(atPrefix);
  let direction: 'row' | 'column' = 'row';
  let winnerIndex = -1;
  for (const value of classes) {
    const base = utilityBase(value);
    if (!DIRECTION_GROUP.has(base)) continue;
    const index = breakpointIndex(variantPrefix(value));
    if (index > at || index < winnerIndex) continue;
    winnerIndex = index;
    direction = base.startsWith('flex-col') ? 'column' : 'row';
  }
  return direction;
}

/** Whether `token` was written as a `class:<utility>` directive rather than inside `class="..."`. */
function isDirectiveSourced(node: SourceNode, token: ClassToken, utility: string): boolean {
  const name = `class:${utility}`;
  return (node.attributes ?? []).some(
    (attr) => attr.name === name && token.start >= attr.start && token.start < attr.end
  );
}

/**
 * Whether `classes` carries another member of `group`, distinct from `token`'s own utility, at
 * the exact same variant prefix. Two conflicting values at one prefix is the shape a conditional
 * expression's two branches leave behind once `markup.ts` merges both into one element's class
 * set, so a match makes `token`'s own presence unreliable rather than a real, always-applied
 * class. Two different prefixes (`flex-col` and `sm:flex-row`) are ordinary responsive design and
 * never trip this.
 */
function hasSamePrefixConflict(classes: Set<string>, token: ClassToken, group: Set<string>): boolean {
  const prefix = variantPrefix(token.value);
  const own = utilityBase(token.value);
  for (const value of classes) {
    if (variantPrefix(value) !== prefix) continue;
    const base = utilityBase(value);
    if (base !== own && group.has(base)) return true;
  }
  return false;
}

/**
 * Whether a class token is trustworthy enough to justify a finding. Skipping an unreliable token
 * only makes the rule quieter, never louder: the finding it withholds may still be a real defect
 * at runtime, which is the acceptable direction of error for a structural, error-tier rule.
 */
function isReliablyDeclared(
  node: SourceNode,
  classes: Set<string>,
  token: ClassToken,
  utility: string,
  group: Set<string>
): boolean {
  if (isDirectiveSourced(node, token, utility)) return false;
  return !hasSamePrefixConflict(classes, token, group);
}

/**
 * A node's direct template children: every node whose nearest enclosing element or block is this
 * one. `parentEnd` already resolves through an intervening `Fragment`, which carries no range of
 * its own (`markup.ts`, `collect()`), so this reads as the real DOM child list for a plain
 * element or component; a child sitting inside a `{#if}`/`{#each}` block reads as that block's
 * child instead; that block, not this rule, decides what actually renders beside the icon, which
 * is a real DOM-shape question this structural rule does not attempt to answer.
 */
function directChildren(file: ParsedComponent, parent: SourceNode): SourceNode[] {
  return file.nodes
    .filter((node) => node.parentEnd === parent.end && node.start > parent.start)
    .sort((a, b) => a.start - b.start);
}

/** A node's direct rendered children: a comment or whitespace-only text contributes nothing. */
function renderedChildren(file: ParsedComponent, parent: SourceNode): SourceNode[] {
  return directChildren(file, parent).filter((node) => {
    if (node.type === 'Comment') return false;
    if (node.type === 'Text') return !/^\s*$/.test(node.data ?? '');
    return true;
  });
}

/** The first child that renders something, the child a reader's eye meets first. */
function firstRealChild(file: ParsedComponent, parent: SourceNode): SourceNode | undefined {
  return renderedChildren(file, parent)[0];
}

/**
 * Whether a node is an icon: an inline `<svg>`, a `*Icon` component (the lucide-svelte import
 * convention this tree uses throughout, `@lucide/svelte/icons/*`), an explicit `data-icon`
 * marker, or a bare sizing wrapper (`<span>`/`<div>`) one level deep around exactly one of those,
 * a common way to give an icon its own size box without changing what supplies the row's
 * baseline. This is a naming and shape convention, never an import resolution: an icon imported
 * under an alias that drops the `*Icon` suffix (`import Check from '@lucide/svelte/icons/check'`,
 * rendered `<Check />`) reads as an ordinary component, since this substrate builds no import
 * table. That gap is a missed finding, not a wrong one, so it does not threaten the rule's
 * error-tier precision bar the way a false positive would.
 */
function isIconNode(file: ParsedComponent, node: SourceNode): boolean {
  if (node.type === 'RegularElement' && node.name === 'svg') return true;
  if (node.type === 'Component' && typeof node.name === 'string' && ICON_COMPONENT_NAME.test(node.name)) {
    return true;
  }
  if ((node.attributes ?? []).some((attr) => attr.name === 'data-icon')) return true;
  if (node.type === 'RegularElement' && (node.name === 'span' || node.name === 'div')) {
    const kids = renderedChildren(file, node);
    if (kids.length === 1) return isIconNode(file, kids[0]);
  }
  return false;
}

/** Every `inline-flex` class token written on one element, in document order. */
function inlineFlexTokens(file: ParsedComponent, elementStart: number): ClassToken[] {
  return file.classTokens.filter(
    (token) => token.elementStart === elementStart && utilityBase(token.value) === 'inline-flex'
  );
}

/** Every `items-baseline` class token written on one element, in document order. */
function baselineTokens(file: ParsedComponent, elementStart: number): ClassToken[] {
  return file.classTokens.filter(
    (token) => token.elementStart === elementStart && utilityBase(token.value) === 'items-baseline'
  );
}

export const iconBaselineSynthesis: StaticRule = {
  id: 'icon-baseline-synthesis',
  tier: 'error',
  check(ctx) {
    const findings: Finding[] = [];
    for (const file of ctx.files) {
      const byElement = classesByElement(file);
      for (const [elementStart, classes] of byElement) {
        const container = nodeAt(file, elementStart);
        if (!container) continue;

        const reliableRowBaseline = baselineTokens(file, elementStart).some(
          (token) =>
            isReliablyDeclared(container, classes, token, 'items-baseline', ALIGN_ITEMS_GROUP) &&
            effectiveDirectionAt(classes, variantPrefix(token.value)) === 'row'
        );
        if (!reliableRowBaseline) continue;

        for (const child of directChildren(file, container)) {
          if (child.type !== 'RegularElement' && child.type !== 'Component') continue;
          const childClasses = byElement.get(child.start);
          if (!childClasses) continue;
          const inlineToken = inlineFlexTokens(file, child.start).find((token) =>
            isReliablyDeclared(child, childClasses, token, 'inline-flex', DISPLAY_GROUP)
          );
          if (!inlineToken) continue;
          const first = firstRealChild(file, child);
          if (!first || !isIconNode(file, first)) continue;
          // The label's own items-baseline is the recipe's load-bearing half, and a self-*
          // utility opts the label out of the row's align-items outright; either way the row's
          // declared alignment is no longer what places this label.
          if (hasUtility(childClasses, 'items-baseline')) continue;
          if (hasSelfAlign(childClasses)) continue;
          findings.push({
            ruleId: 'icon-baseline-synthesis',
            tier: 'error',
            file: file.file,
            line: inlineToken.line,
            start: inlineToken.start,
            end: inlineToken.end,
            message: MESSAGE,
          });
        }
      }
    }
    return findings;
  },
};
