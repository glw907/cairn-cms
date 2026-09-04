// cairn-audit's rendered list-role rule: the static `list-role`'s counterpart, closing the gap its
// own header names. The static rule resolves an item's display change through a class-token-to-
// compiled-declaration lookup, which only sees a class the ITEM ITSELF carries. DaisyUI often
// styles list items through descendant selectors scoped to the LIST's own class instead (`.menu
// :where(li) { display: flex }`, `.breadcrumbs > ul > li { display: flex }`), so a classless <li>
// under one of those never registers there even though its rendered display is not `list-item`.
// The robust fix is a rendered-mode check of the item's actual computed `display` in a live
// browser: this check measures the computed VALUE, never the selector that produced it, so a
// finding names a descendant selector as the LIKELY source (the shape this rule exists to catch),
// not an asserted one; the same computed value could in principle come from an inline style or a
// class the static rule's own lookup already covers.
//
// This rule deliberately does NOT re-derive the list's own marker suppression (`list-style-type:
// none`) in rendered mode: a consumer that imports daisyUI's base layer gets `list-style: none` on
// every bare <ul>/<ol>/<menu> for free (`menu,ol,ul{list-style:none}`), and a naive computed-style
// check on that property alone would fire on nearly every list on such a site, a completely
// different and far larger rule than the descendant-selector gap this one exists to close. That
// claim scopes to a daisyUI-base-importing consumer: cairn's OWN admin sheet carries no bare
// ul/ol/menu reset, deliberately, so it is not itself an instance of the exemption it is arguing
// for. Marker suppression stays the static rule's job, scoped to a class the compiled sheet
// resolves DIRECTLY (never a bare base-layer element reset).
//
// HTML-AAM maps a bare <li> to role listitem by its parent relationship: a direct child of
// <ul>/<ol>/<menu>, or of an element carrying role="list". An item whose own computed display
// already strips its `list-item` box is exposed to the same rendering-engine risk the list itself
// is (the WebKit/VoiceOver bug this whole rule family guards against ties AX exposure to CSS box
// generation), so this rule recommends role="listitem" on each affected item alongside role="list"
// on the list, as a defensive fix rather than relying on the parent-relationship mapping alone. An
// item that already carries its own explicit role (a `menu-divider`'s `role="separator"`, say) is
// left alone: that role is a deliberate, different reading, the same carve-out the static rule
// gives the list itself.
//
// States: `rest` and `menu-open`. Four of the admin's lists (DeleteDialog, EntryPicker,
// ComponentInsertDialog, the command palette's results) mount only inside an opened dialog or
// popover, so a `rest`-only run never reaches them. This check stays data-dependent even at the
// states it runs: an empty list (no rows yet, no matching results) reads clean regardless of what
// its CSS would do to a populated one, so a clean run here is not a guarantee no such list exists,
// only that none was observed with items to measure.
import { ensurePageHelpers } from '../../rendered.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/**
 * One `<ul>`/`<ol>`/`<menu>` whose items render at a display other than `list-item`, with no role
 * attribute of its own.
 */
interface ListRoleViolation {
  listSelector: string;
  /**
   * The distinct computed `display` values among the list's changed items, sorted for a stable
   * message; more than one entry means the changed items are not all styled alike.
   */
  displayValues: string[];
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
  const LIST_SELECTOR = 'ul, ol, menu';
  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());

  const violations: ListRoleViolation[] = [];
  for (const list of document.querySelectorAll(LIST_SELECTOR)) {
    if (list.hasAttribute('role')) continue;

    // Every `<li>` whose nearest enclosing list is THIS one, not a nested list further in.
    const items = Array.from(list.querySelectorAll('li')).filter((li) => li.closest(LIST_SELECTOR) === list);
    const changed = items.filter((li) => {
      const display = getComputedStyle(li).display;
      return display !== LIST_ITEM_DISPLAY && display !== 'none';
    });
    if (changed.length === 0) continue;

    const displayValues = Array.from(new Set(changed.map((li) => getComputedStyle(li).display))).sort();

    violations.push({
      listSelector: signature(list),
      displayValues,
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
  states: ['rest', 'menu-open'],
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ensurePageHelpers(ctx.page);
    const violations = await ctx.page.evaluate(findListRoleViolations);
    return violations.map((violation) => {
      const candidates = violation.listitemCandidates;
      let itemNote = '';
      if (candidates.length > 0) {
        const target = candidates.length === 1 ? 'it' : `each of the ${candidates.length} affected items`;
        itemNote =
          ` Add role="listitem" to ${target} too (${candidates.join(', ')}): HTML-AAM's implicit ` +
          "li-to-listitem mapping depends on the parent relationship, which this exact display " +
          'change already disrupts, so an explicit role is the defensive fix rather than relying ' +
          'on that mapping alone.';
      }
      const subject = violation.changedCount === 1 ? 'an item renders' : `${violation.changedCount} items render`;
      const displayFact =
        violation.displayValues.length === 1
          ? `display: ${violation.displayValues[0]}`
          : `one of several displays (${violation.displayValues.join(', ')})`;
      return {
        ruleId: 'list-role',
        tier: 'error',
        selector: violation.listSelector,
        message:
          `${subject} at ` +
          `${displayFact} instead of list-item; the likely cause is a descendant selector on an ` +
          "ancestor's class rather than the item's own (this check measures only the computed " +
          'value, never which selector produced it), and a marker-suppressed list with no role ' +
          'attribute stops being announced as a list in WebKit/VoiceOver; add role="list" to ' +
          `restore the list semantics (WCAG 1.3.1).${itemNote}`,
      };
    });
  },
};
