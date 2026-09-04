// The rendered list-role rule against a real browser, closing the gap the static list-role names
// in its own header: daisyUI styles list items through descendant selectors scoped to the LIST's
// own class (`.menu :where(li) { display: flex }`, `.breadcrumbs > ul > li { display: flex }`), so
// a class-less `<li>` never registers there even though its rendered display is not `list-item`.
// This rule reads each item's ACTUAL computed display in a live browser instead, whatever selector
// produced it.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { listRoleRendered } from '../../../../../lib/audit/rules/rendered/list-role.js';
import type { RenderedFinding, RenderedPage } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/** The real daisyUI rule this file's own fixtures reproduce, so a fixture proves the same fact a
 *  live admin page would: `.menu :where(li)` and `.breadcrumbs > ul > li` both compile to
 *  `display: flex`, scoped to an ANCESTOR's class, never the item's own. */
const DESCENDANT_SELECTOR_CSS = `
  .menu :where(li) { display: flex; }
  .breadcrumbs > ul > li { display: flex; }
`;

/** Runs `listRoleRendered` against `html` in a real page and returns what it found. */
async function findingsFor(html: string): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(`<style>${DESCENDANT_SELECTOR_CSS}</style>${html}`, { waitUntil: 'load' });
    return await listRoleRendered.check({
      page: page as unknown as RenderedPage,
      pagePath: '/fixture',
      theme: 'light',
      state: 'rest',
      config,
    });
  } finally {
    await page.close();
  }
}

describe('list-role (rendered) against a real browser', () => {
  // The acceptance-criteria fixture: a class-less <li> under a `.menu`-classed <ul> registers,
  // even though the static rule's own class-token lookup can never see it (the item carries no
  // class of its own for that lookup to resolve).
  it('flags a class-less <li> under .menu, which the static class-lookup rule cannot see', async () => {
    const findings = await findingsFor('<ul class="menu"><li>One</li><li>Two</li></ul>');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: 'list-role', tier: 'error' });
    expect(findings[0].message).toContain('display: flex');
    expect(findings[0].message).toContain('2 items render');
  });

  // The breadcrumbs shape: the item's own display changes via an ancestor two classes up
  // (`.breadcrumbs`'s own descendant selector on its child <ul>'s <li>), not the <ul>'s own class
  // at all, so even a check keyed on "the enclosing list's own class" would miss it.
  it('flags a breadcrumb item whose display changes through the nav ancestor, not the list itself', async () => {
    const findings = await findingsFor(
      '<nav class="breadcrumbs"><ul class="min-w-0"><li class="min-w-0">Home</li></ul></nav>'
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('display: flex');
  });

  // HTML-AAM's implicit li-to-listitem mapping depends on the parent relationship, and this rule
  // recommends role="listitem" on each item whose own computed display already strips its
  // list-item box, since that item is exposed to the same rendering-engine risk the list itself is.
  it("recommends role=\"listitem\" on the affected items alongside role=\"list\" on the list", async () => {
    const findings = await findingsFor('<ul class="menu"><li>One</li></ul>');
    expect(findings[0].message).toContain('role="listitem"');
  });

  // An item that already carries its own explicit role (a menu-divider's role="separator", the
  // real shape EditorToolbar and EditPage ship) is a deliberate, different reading; it must not be
  // recommended for role="listitem", even though the list itself still needs role="list" for its
  // other, unroled items.
  it('does not recommend role="listitem" for an item that already carries its own role', async () => {
    const findings = await findingsFor(
      '<ul class="menu"><li role="separator">-</li><li>One</li></ul>'
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).not.toContain('role="separator"');
    expect(findings[0].message).toContain('role="listitem"');
  });

  // The no-false-positive fixture: a plain list with no descendant-selector styling keeps its
  // items at list-item and is left alone.
  it('never flags a plain list whose items stay at display: list-item', async () => {
    const findings = await findingsFor('<ul class="mt-1"><li>One</li></ul>');
    expect(findings).toEqual([]);
  });

  // A list that already carries an explicit role, of any value, is left alone: the WebKit bug this
  // rule guards against only strips an IMPLICIT role, so an already-explicit one is out of scope.
  it('never flags a list that already carries an explicit role', async () => {
    const findings = await findingsFor('<ul class="menu" role="list"><li>One</li></ul>');
    expect(findings).toEqual([]);
  });

  // display: none removes the item from rendering and the accessibility tree entirely, so it
  // cannot strip the enclosing list's implicit role, the only mechanism this rule guards against.
  it('never flags a list whose only display-changing item is display: none', async () => {
    const findings = await findingsFor('<ul class="mt-1"><li style="display:none">One</li></ul>');
    expect(findings).toEqual([]);
  });

  // A flex CONTAINER's own display does not itself blockify a child <li>'s default `list-item`
  // display (measured directly, Chromium): only a rule that targets the item, or a descendant
  // selector reaching it, changes what the item computes to. This proves the rule stays quiet on
  // the list's OWN display change alone, matching the static rule's item-only contract.
  it('does not flag a list whose own display is flex when its items carry no display-changing rule', async () => {
    const findings = await findingsFor('<ul class="flex flex-col gap-1"><li>One</li></ul>');
    expect(findings).toEqual([]);
  });

  // Nested lists: an inner list's own item is attributed to the INNER list, not the outer one,
  // mirroring the static rule's nearest-enclosing-list association.
  it('attributes a nested list item to its own nearest enclosing list', async () => {
    const findings = await findingsFor(
      '<ul class="mt-1"><li><ul class="menu"><li>Nested</li></ul></li></ul>'
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].selector).toContain('menu');
  });

  it('declares rest and menu-open, so it reaches lists that mount only inside an opened dialog or popover', () => {
    expect(listRoleRendered.states).toEqual(['rest', 'menu-open']);
  });

  // The measured-fact rewording (round B): the message states what the check actually measures
  // (the computed display) and offers the descendant selector as the likely, not asserted, source.
  it('names the descendant selector as a likely cause, not an asserted one', async () => {
    const findings = await findingsFor('<ul class="menu"><li>One</li></ul>');
    expect(findings[0].message).toContain('display: flex');
    expect(findings[0].message).toContain('likely cause');
    expect(findings[0].message).not.toContain('reached through a descendant selector');
  });

  // The softened hedge (round B): HTML-AAM's parent-relationship mapping, not ARIA's "requires"
  // framing, and the same core clause the static rule's own item-level remedy carries.
  it('grounds the listitem remedy in the HTML-AAM parent-relationship mapping, not a "requires" claim', async () => {
    const findings = await findingsFor('<ul class="menu"><li>One</li></ul>');
    expect(findings[0].message).toContain("HTML-AAM's implicit li-to-listitem mapping");
    expect(findings[0].message).not.toContain('requires listitem-owned children');
  });

  // The mixed-display honesty fixture (round B): a list whose changed items compute to two
  // different displays reports the set, never just the first item's value.
  it('reports the set of displays when a list mixes them across its changed items', async () => {
    const findings = await findingsFor(
      '<ul class="menu"><li style="display:grid">One</li><li>Two</li></ul>'
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('one of several displays');
    expect(findings[0].message).toContain('flex');
    expect(findings[0].message).toContain('grid');
  });

  // <menu> maps to role list under HTML-AAM too, and daisyUI styles chrome with it.
  it('flags a classless <li> under a <menu> the same way it flags one under a <ul>', async () => {
    const findings = await findingsFor('<menu class="menu"><li>One</li></menu>');
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('display: flex');
  });
});
