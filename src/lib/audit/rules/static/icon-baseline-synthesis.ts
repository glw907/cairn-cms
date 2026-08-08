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

/**
 * The first child that renders something: a comment contributes nothing, whitespace-only text
 * contributes nothing visible, so neither counts as "the first child" a reader's eye meets.
 */
function firstRealChild(file: ParsedComponent, parent: SourceNode): SourceNode | undefined {
  return directChildren(file, parent).find((node) => {
    if (node.type === 'Comment') return false;
    if (node.type === 'Text') return !/^\s*$/.test(node.data ?? '');
    return true;
  });
}

/**
 * Whether a node is an icon: an inline `<svg>`, a `*Icon` component (the lucide-svelte import
 * convention this tree uses throughout, `@lucide/svelte/icons/*`), or an explicit `data-icon`
 * marker.
 */
function isIconNode(node: SourceNode): boolean {
  if (node.type === 'RegularElement' && node.name === 'svg') return true;
  if (node.type === 'Component' && typeof node.name === 'string' && ICON_COMPONENT_NAME.test(node.name)) {
    return true;
  }
  return (node.attributes ?? []).some((attr) => attr.name === 'data-icon');
}

/** The class token declaring `inline-flex` on an element, for the finding's own source position. */
function inlineFlexToken(file: ParsedComponent, elementStart: number): ClassToken | undefined {
  return file.classTokens.find(
    (token) => token.elementStart === elementStart && utilityBase(token.value) === 'inline-flex'
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
        if (!hasUtility(classes, 'items-baseline')) continue;
        const container = nodeAt(file, elementStart);
        if (!container) continue;

        for (const child of directChildren(file, container)) {
          if (child.type !== 'RegularElement' && child.type !== 'Component') continue;
          if (!hasUtility(byElement.get(child.start), 'inline-flex')) continue;
          const first = firstRealChild(file, child);
          if (!first || !isIconNode(first)) continue;
          const token = inlineFlexToken(file, child.start);
          if (!token) continue;
          findings.push({
            ruleId: 'icon-baseline-synthesis',
            tier: 'error',
            file: file.file,
            line: token.line,
            start: token.start,
            end: token.end,
            message: MESSAGE,
          });
        }
      }
    }
    return findings;
  },
};
