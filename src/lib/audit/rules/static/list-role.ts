// cairn-audit's list-role rule: a <ul>/<ol> whose marker is suppressed stops being announced as a
// list by WebKit/VoiceOver unless it carries role="list". Marker suppression arrives two ways: the
// list's own classes remove it (a `list-style`/`list-style-type: none` declaration, Tailwind's
// `list-none`), or an ITEM's classes change its rendered display away from `list-item` to another
// display that still renders the item (`flex`, `grid`, `block`, `inline-flex`; daisyUI's own
// `.list-row` renders `display: grid`, documented at `cairn-admin.css`'s `.list` ruling comment).
// `display: none` is excluded: a hidden item never reaches the accessibility tree, so it cannot
// strip the enclosing list's implicit role. A list already carrying SOME explicit role attribute
// is left alone regardless of its value: an explicit role overrides the implicit host-language
// role entirely, so `role="listbox"` (say) is already an intentional, legitimate reading the
// WebKit bug never touches, and asking for a second, conflicting role would be the wrong remedy.
// The broad "any utility class" condition is rejected on purpose: only a class the compiled sheet
// actually resolves to a marker- or display-changing declaration counts, never a class present
// for some unrelated reason.
//
// This rule only sees marker suppression an element's OWN classes cause: a class the compiled
// sheet resolves DIRECTLY on that element's own selector position, never a descendant selector
// scoped to some ANCESTOR's class (daisyUI's `.menu :where(li)`, `.breadcrumbs > li`). That gap is
// closed by the rendered-mode counterpart (`rules/rendered/list-role.ts`), which reads each item's
// actual computed `display` in a live browser instead of a second class-source lookup here; this
// static half stays the cheap, no-browser-required first pass.
import { conditionalConditions, selectorClassNames, splitSelectorList } from '../../sheet.js';
import type { ParsedComponent, SourceNode } from '../../markup.js';
import type { Finding, StaticRule, StaticRuleContext } from '../../types.js';

// HTML-AAM maps `<menu>` to role `list` too (daisyUI styles breadcrumbs and other chrome with it),
// so a `<menu>` whose marker or item display is suppressed is exposed to the same WebKit/VoiceOver
// risk as a `<ul>`/`<ol>`.
const LIST_TAGS = new Set(['ul', 'ol', 'menu']);
const LIST_STYLE_PROPERTY = /^list-style(-type)?$/;
const LIST_ITEM_DISPLAY = 'list-item';
const COMBINATOR_CHARS = new Set(['>', '+', '~']);

/** A cause-lookup match: the class that caused it, and any at-rule condition it is scoped under. */
interface CauseMatch {
  name: string;
  conditions: string[];
}

/** The class tokens one element in a file writes, keyed by the element's own start offset. */
function classesOf(file: ParsedComponent, elementStart: number): string[] {
  return file.classTokens
    .filter((token) => token.elementStart === elementStart)
    .map((token) => token.value);
}

/** Whether a node carries a `role` attribute at all, regardless of its value. */
function hasRoleAttribute(node: SourceNode): boolean {
  return (node.attributes ?? []).some((attr) => attr.name === 'role');
}

/**
 * The segment of a selector branch after its final descendant, child, or sibling combinator (a
 * bare space, `>`, `+`, or `~`, outside any bracket or paren group): the compound that names the
 * element the branch actually styles, as opposed to an ancestor the branch merely gates on.
 * `.menu :where(li)` styles the `<li>`, gated by a `.menu` ancestor; it declares nothing about an
 * element that happens to carry the class "menu" itself, so a cause-lookup keyed on "does this
 * class appear anywhere in the selector text" would misattribute this declaration to that element.
 */
function lastCompound(selector: string): string {
  let depth = 0;
  let start = 0;
  let subject = selector;
  let i = 0;
  while (i < selector.length) {
    const ch = selector[i];
    if (ch === '"' || ch === "'") {
      i++;
      while (i < selector.length && selector[i] !== ch) {
        if (selector[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === '(' || ch === '[') {
      depth++;
      i++;
      continue;
    }
    if (ch === ')' || ch === ']') {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (depth === 0 && (ch === ' ' || COMBINATOR_CHARS.has(ch))) {
      const compound = selector.slice(start, i).trim();
      if (compound) subject = compound;
      while (i < selector.length && (selector[i] === ' ' || COMBINATOR_CHARS.has(selector[i]))) i++;
      start = i;
      continue;
    }
    i++;
  }
  const tail = selector.slice(start).trim();
  if (tail) subject = tail;
  return subject;
}

/**
 * Every class name a declaration's selector genuinely targets on its own subject element, across
 * every comma-separated branch. Used to reject a declaration whose selector only mentions a class
 * as an ANCESTOR gate (see {@link lastCompound}), which `ctx.sheet.declarations` cannot itself
 * distinguish: it indexes a rule under every class its selector text contains, subject or not.
 */
function subjectClassNames(selector: string): Set<string> {
  const names = new Set<string>();
  for (const branch of splitSelectorList(selector)) {
    for (const name of selectorClassNames(lastCompound(branch))) names.add(name);
  }
  return names;
}

/** The first of an element's own classes the compiled sheet resolves to a marker-removing rule. */
function ownMarkerSuppressor(ctx: StaticRuleContext, classes: string[]): CauseMatch | undefined {
  for (const name of classes) {
    const decl = ctx.sheet
      .declarations(name)
      .find(
        (candidate) =>
          LIST_STYLE_PROPERTY.test(candidate.property) &&
          candidate.value.trim().toLowerCase() === 'none' &&
          subjectClassNames(candidate.selector).has(name)
      );
    if (decl) return { name, conditions: decl.conditions };
  }
  return undefined;
}

/**
 * The first of an item's own classes the compiled sheet resolves to a display that keeps the
 * item rendered but strips its `list-item` box (`flex`, `grid`, `block`, `inline-flex`, and so
 * on). `display: none` is excluded on purpose: a hidden item is removed from rendering and from
 * the accessibility tree entirely, so it cannot strip the enclosing list's implicit role, which
 * is the only mechanism this rule guards against (Tailwind's `hidden` and its responsive variants
 * all compile to `display: none` and must stay silent here).
 */
function itemDisplayChange(
  ctx: StaticRuleContext,
  classes: string[]
): (CauseMatch & { value: string }) | undefined {
  for (const name of classes) {
    for (const decl of ctx.sheet.declarations(name)) {
      if (decl.property !== 'display') continue;
      if (!subjectClassNames(decl.selector).has(name)) continue;
      const value = decl.value.trim().toLowerCase();
      if (value === LIST_ITEM_DISPLAY || value === 'none') continue;
      return { name, value: decl.value.trim(), conditions: decl.conditions };
    }
  }
  return undefined;
}

/** The smallest of `lists` whose range contains `node`, the list a template item actually belongs to. */
function nearestList(lists: SourceNode[], node: SourceNode): SourceNode | undefined {
  let best: SourceNode | undefined;
  for (const list of lists) {
    if (list.start <= node.start && node.end <= list.end && (!best || list.start > best.start)) {
      best = list;
    }
  }
  return best;
}

/** Every `<li>` in a file, grouped by the nearest enclosing `<ul>`/`<ol>` it belongs to. */
function itemsByList(file: ParsedComponent, lists: SourceNode[]): Map<SourceNode, SourceNode[]> {
  const grouped = new Map<SourceNode, SourceNode[]>();
  for (const node of file.nodes) {
    if (node.type !== 'RegularElement' || node.name !== 'li') continue;
    const list = nearestList(lists, node);
    if (!list) continue;
    const bucket = grouped.get(list);
    if (bucket) bucket.push(node);
    else grouped.set(list, [node]);
  }
  return grouped;
}

/**
 * A `CauseMatch`'s conditional group rules (`@media`, `@supports`, `@container`), rendered for the
 * finding message. Dropping this from the message reads as an unconditional cause ("this class
 * always suppresses the marker") when the declaration may only apply under a media query the class
 * is nested inside; a reader chasing the wrong condition cannot reproduce or fix what the message
 * claims. `@layer` is filtered out by {@link conditionalConditions}: a layer always applies, so
 * naming it here would print a false gate (`only under @layer components`) the reader can neither
 * satisfy nor fail.
 */
function conditionSuffix(conditions: string[]): string {
  const groups = conditionalConditions(conditions);
  return groups.length > 0 ? `, only under ${groups.join(' / ')}` : '';
}

export const listRole: StaticRule = {
  id: 'list-role',
  tier: 'error',
  check(ctx) {
    const findings: Finding[] = [];
    for (const file of ctx.files) {
      const lists = file.nodes.filter(
        (node) => node.type === 'RegularElement' && LIST_TAGS.has(node.name ?? '')
      );
      if (lists.length === 0) continue;
      const items = itemsByList(file, lists);

      for (const list of lists) {
        if (hasRoleAttribute(list)) continue;

        const ownSuppressor = ownMarkerSuppressor(ctx, classesOf(file, list.start));
        let cause: string;
        let itemNote = '';
        if (ownSuppressor) {
          cause = `its own class "${ownSuppressor.name}" resolves to a list-style-removing declaration${conditionSuffix(ownSuppressor.conditions)}`;
        } else {
          const hit = (items.get(list) ?? [])
            .map((item) => itemDisplayChange(ctx, classesOf(file, item.start)))
            .find((value) => value !== undefined);
          if (!hit) continue;
          cause = `an item's class "${hit.name}" resolves to "display: ${hit.value}"${conditionSuffix(hit.conditions)}`;
          // Aligned with the rendered rule's own item-level remedy: HTML-AAM maps <li> to listitem
          // by its parent relationship (a direct child of <ul>/<ol>, or of an element with
          // role="list"), a mapping this exact display change already disrupts, so an explicit role
          // on the item is the defensive fix rather than relying on that mapping alone.
          itemNote =
            ` Add role="listitem" to each item whose "${hit.name}" class causes this too: ` +
            "HTML-AAM's implicit li-to-listitem mapping depends on the parent relationship, which " +
            'this exact display change already disrupts, so an explicit role is the defensive fix ' +
            'rather than relying on that mapping alone.';
        }

        findings.push({
          ruleId: 'list-role',
          tier: 'error',
          file: file.file,
          line: list.startLine,
          start: list.start,
          end: list.end,
          message:
            `<${list.name}> suppresses its own marker: ${cause}, and a marker-suppressed <ul>/<ol> ` +
            'with no role attribute stops being announced as a list in WebKit/VoiceOver; add ' +
            `role="list" to restore the list semantics (WCAG 1.3.1).${itemNote}`,
        });
      }
    }
    return findings;
  },
};
