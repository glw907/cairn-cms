// cairn-audit's rendered list-role rule: the static `list-role`'s counterpart, closing the gap its
// own header names. The static rule resolves an item's display change through a class-token-to-
// compiled-declaration lookup, which only sees a class the ITEM ITSELF carries. DaisyUI styles list
// items through descendant selectors scoped to the LIST's own class instead (`.menu :where(li) {
// display: flex }`, `.breadcrumbs > ul > li { display: flex }`), so a classless `<li>` under one of
// those never registers there even though its rendered display is not `list-item`. The robust fix
// is a rendered-mode check of the item's actual computed `display` in a live browser: whatever
// selector produced it, own class or an ancestor's, the computed value is the same fact either way,
// so this rule needs no second class-source lookup at all.
//
// This rule deliberately does NOT re-derive the list's own marker suppression (`list-style-type:
// none`) in rendered mode: daisyUI resets `list-style: none` on every bare `<ul>`/`<ol>` at its base
// layer (`menu,ol,ul{list-style:none}`), so a naive computed-style check on that property alone
// would fire on nearly every list in the admin, a completely different and far larger rule than the
// descendant-selector gap this one exists to close. Marker suppression stays the static rule's job,
// scoped to a class the compiled sheet resolves DIRECTLY (never a bare base-layer element reset).
//
// ARIA's owned-elements rule: role="list" requires listitem-owned children. An item whose own
// computed display already strips its `list-item` box is exposed to the same rendering-engine risk
// the list itself is (the WebKit/VoiceOver bug this whole rule family guards against ties AX
// exposure to CSS box generation), so this rule recommends role="listitem" on each affected item
// alongside role="list" on the list, rather than depending on an implicit-role mapping already
// shown unreliable for the enclosing list in this exact rendering path. An item that already
// carries its own explicit role (a `menu-divider`'s `role="separator"`, say) is left alone: that
// role is a deliberate, different reading, the same carve-out the static rule gives the list itself.
//
// Runs at `rest` only: display is not an interaction-state question, and the harness already visits
// every page under both themes regardless of what any one rule declares.
import { ensurePageHelpers } from '../../rendered.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/** One `<ul>`/`<ol>` whose items render at a display other than `list-item`, with no role attribute. */
interface ListRoleViolation {
  listSelector: string;
  displayValue: string;
  changedCount: number;
  /** Signatures of the changed items that carry no role attribute of their own. */
  listitemCandidates: string[];
}

/**
 * Every list on the current page whose items' actual computed display strips their `list-item`
 * box, and which carries no role attribute of its own. Playwright serializes this into the page,
 * so it stays self-contained: no references outside its own body.
 */
function findListRoleViolations(): ListRoleViolation[] {
  const LIST_ITEM_DISPLAY = 'list-item';
  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());

  const violations: ListRoleViolation[] = [];
  for (const list of document.querySelectorAll('ul, ol')) {
    if (list.hasAttribute('role')) continue;

    // Every `<li>` whose nearest enclosing list is THIS one, not a nested list further in.
    const items = Array.from(list.querySelectorAll('li')).filter((li) => li.closest('ul, ol') === list);
    const changed = items.filter((li) => {
      const display = getComputedStyle(li).display;
      return display !== LIST_ITEM_DISPLAY && display !== 'none';
    });
    if (changed.length === 0) continue;

    violations.push({
      listSelector: signature(list),
      displayValue: getComputedStyle(changed[0]).display,
      changedCount: changed.length,
      listitemCandidates: changed.filter((li) => !li.hasAttribute('role')).map((li) => signature(li)),
    });
  }
  return violations;
}

export const listRoleRendered: RenderedRule = {
  // Shares its id with the static rule: the two are one logical check (a marker-suppressed list
  // with no role) reported through two mechanisms, static for the cheap own-class case, rendered
  // for the descendant-selector case a class lookup structurally cannot see. Static and rendered
  // runs never execute together (the bin's `--rendered` flag selects one or the other), so the
  // shared id carries no suppression or report-merging ambiguity.
  id: 'list-role',
  tier: 'error',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ensurePageHelpers(ctx.page);
    const violations = await ctx.page.evaluate(findListRoleViolations);
    return violations.map((violation) => {
      const itemNote =
        violation.listitemCandidates.length > 0
          ? ` Add role="listitem" to ${violation.listitemCandidates.length === 1 ? 'it' : `each of the ${violation.listitemCandidates.length} affected items`} too (${violation.listitemCandidates.join(', ')}), since role="list" requires listitem-owned children (ARIA's owned-elements rule) and their own implicit role is exposed to the same rendering-engine risk this rule guards the list against.`
          : '';
      return {
        ruleId: 'list-role',
        tier: 'error',
        selector: violation.listSelector,
        message:
          `${violation.changedCount === 1 ? 'an item renders' : `${violation.changedCount} items render`} at ` +
          `display: ${violation.displayValue} instead of list-item, reached through a descendant selector on ` +
          `an ancestor's class rather than the item's own, and a marker-suppressed <ul>/<ol> with no role ` +
          `attribute stops being announced as a list in WebKit/VoiceOver; add role="list" to restore the list ` +
          `semantics (WCAG 1.3.1).${itemNote}`,
      };
    });
  },
};
