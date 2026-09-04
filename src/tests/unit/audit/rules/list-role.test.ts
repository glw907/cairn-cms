import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { runStatic } from '../../../../lib/audit/run.js';
import { staticRules } from '../../../../lib/audit/rules/static/index.js';
import { listRole } from '../../../../lib/audit/rules/static/list-role.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

const SHEET = parseSheet(
  [
    '.list-none { list-style-type: none; }',
    '.list { display: flex; }',
    '.list-row { display: grid; }',
    '.toolkit-list { padding-inline-start: 0; }',
    '.sm\\:hidden { display: none; }',
  ].join('\n')
);

function check(...files: ParsedComponent[]) {
  return listRole.check({ files, sheet: SHEET, config: resolveConfig('/site', null, () => true), cssFiles: [] });
}

function component(markup: string): ParsedComponent {
  return parseComponent('Fixture.svelte', markup);
}

describe('list-role', () => {
  it('flags a marker-suppressed <ul> (own class removes the marker) with no role', () => {
    const findings = check(component('<ul class="list-none"><li>One</li></ul>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('list-role');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('WebKit');
    expect(findings[0].message).toContain('role="list"');
    expect(findings[0].message).toContain('"list-none"');
  });

  it('passes the same own-class-suppressed markup once role="list" is added', () => {
    expect(check(component('<ul class="list-none" role="list"><li>One</li></ul>\n'))).toEqual([]);
  });

  it('flags a marker-suppressed <ul> (an item changes used display) with no role', () => {
    const findings = check(component('<ul class="list"><li class="list-row">One</li></ul>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('"list-row"');
    expect(findings[0].message).toContain('display: grid');
  });

  it('passes the item-display case once role="list" is added', () => {
    expect(
      check(component('<ul class="list" role="list"><li class="list-row">One</li></ul>\n'))
    ).toEqual([]);
  });

  // The no-false-positive fixture: a styled list that keeps its marker (`.list` sets flex on the
  // UL itself, never a `list-style` reset, and its items carry no display-changing class).
  it('never flags a marker-keeping styled list', () => {
    expect(check(component('<ul class="list"><li>One</li></ul>\n'))).toEqual([]);
  });

  // The toolkit-seams padding-only opt-in: it resets `padding-inline-start` alone, never
  // `list-style`, so it must stay silent exactly like a bare styled list.
  it('never flags the padding-only .toolkit-list opt-in', () => {
    expect(check(component('<ul class="toolkit-list"><li>One</li></ul>\n'))).toEqual([]);
  });

  it('never flags a plain <ul> with no marker-removing or display-changing class', () => {
    expect(check(component('<ul class="mt-1 w-full"><li>One</li></ul>\n'))).toEqual([]);
  });

  // display: none removes the item from rendering and from the accessibility tree entirely, so
  // it cannot strip the enclosing list's implicit role, the only mechanism this rule guards
  // against. Tailwind's `hidden` and every responsive variant (`sm:hidden`, `max-sm:hidden`)
  // compile to `display: none`, and an ordinary conditionally-hidden row must stay silent.
  it('never flags a list whose only display-changing item class is display: none', () => {
    expect(
      check(component('<ul class="mt-1"><li class="sm:hidden">One</li></ul>\n'))
    ).toEqual([]);
  });

  // An element already carrying an explicit role, of any value, has already had its implicit host
  // role overridden on purpose: the WebKit bug this rule guards against only strips an IMPLICIT
  // list role, so a second, conflicting role="list" would be the wrong remedy, not a missing one.
  it('never flags a marker-suppressed <ul> that already carries a different explicit role', () => {
    expect(
      check(component('<ul role="listbox" class="list-none"><li>One</li></ul>\n'))
    ).toEqual([]);
  });

  it('attributes an <li> to its nearest enclosing list, not an outer ancestor', () => {
    const findings = check(
      component(
        [
          '<ul class="mt-1">',
          '  <li>',
          '    <ul class="list"><li class="list-row">Nested</li></ul>',
          '  </li>',
          '</ul>',
          '',
        ].join('\n')
      )
    );
    // Only the inner list, whose own item changes display, is flagged; the outer list carries no
    // marker-removing class of its own and none of ITS direct items change display.
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(3);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<!-- cairn-audit-disable-next-line list-role -- filed for the next pass -->',
        '<ul class="list-none"><li>One</li></ul>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['list-role']);
  });

  // The dogfooding proof: the rule runs against the engine's own real markup and its real
  // compiled admin stylesheet, and reports nothing. That is a narrower claim than "every
  // marker-suppressed list carries role=list": the rule only sees marker suppression an
  // element's OWN classes cause, never a descendant-selector rule keyed on some ancestor's class
  // (daisyUI's `.menu :where(li)`, breadcrumbs' `> li`), so a list suppressed that way is outside
  // what this run can catch and outside what this assertion proves. That gap is now covered by
  // the rendered-mode counterpart (`rules/rendered/list-role.ts`), which reads each item's actual
  // computed `display` in a live browser instead; the nine engine lists it found were fixed
  // in-tree (`role="list"` plus `role="listitem"` on their unroled items), which is what lets this
  // static half stay clean here too, on the same markup, through its narrower own-class lens. The
  // full registry runs (not just this rule alone), so a suppression directive naming some OTHER
  // rule still resolves against that rule's own findings instead of reading as dead only because
  // this narrower run never raised it; the assertion below still isolates this rule's own findings.
  it('runs clean on the engine\'s own tree', () => {
    const root = resolve(process.cwd());
    const config = resolveConfig(root, null, (path) => existsSync(resolve(root, path)));
    const report = runStatic(config, staticRules());
    expect(report.findings.filter((finding) => finding.ruleId === 'list-role')).toEqual([]);
  });

  // Defect fixture 1 (mis-attribution among shared-selector declarations): `.menu :where(li)`
  // styles the `<li>`, gated by an ancestor's `.menu` class; it declares nothing about an element
  // that merely carries the class "menu" itself. Reading "does declarations('menu') contain a
  // display decl" without checking the declaration's own SUBJECT compound would misattribute this
  // ancestor-gated rule to an item wearing that class, flagging a list that this declaration never
  // actually touches.
  it('does not misattribute an ancestor-gated descendant declaration to an item merely sharing its class name', () => {
    const sheet = parseSheet('.menu :where(li) { display: flex; }');
    const findings = listRole.check({
      files: [component('<ul class="mt-1"><li class="menu">One</li></ul>\n')],
      sheet,
      config: resolveConfig('/site', null, () => true),
      cssFiles: [],
    });
    expect(findings).toEqual([]);
  });

  // Defect fixture 2 (a dropped at-rule condition): a class whose marker-removing declaration
  // lives inside a media query is still a real, findable cause, but reporting it as if it applied
  // unconditionally is misleading: the class only suppresses the marker under that condition. The
  // message must carry the condition rather than silently dropping it.
  it("names an at-rule's own condition in the message rather than dropping it", () => {
    const sheet = parseSheet(
      '@media (prefers-color-scheme: dark) { .dark\\:list-none { list-style-type: none; } }'
    );
    const findings = listRole.check({
      files: [component('<ul class="dark:list-none"><li>One</li></ul>\n')],
      sheet,
      config: resolveConfig('/site', null, () => true),
      cssFiles: [],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('only under @media (prefers-color-scheme: dark)');
  });

  // @layer is a cascade-scoping at-rule, not a condition: its block always applies, so naming it
  // as an "only under" gate would be false. Filtered out entirely here, leaving no suffix at all.
  it('never names @layer as a condition, since a layer always applies', () => {
    const sheet = parseSheet('@layer components { .list-none { list-style-type: none; } }');
    const findings = listRole.check({
      files: [component('<ul class="list-none"><li>One</li></ul>\n')],
      sheet,
      config: resolveConfig('/site', null, () => true),
      cssFiles: [],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).not.toContain('@layer');
    expect(findings[0].message).not.toContain('only under');
  });

  // A declaration nested in both a layer and a media query keeps the media query in its message
  // (the real condition) while still dropping the layer (never a condition at all).
  it('keeps the media condition but drops the enclosing @layer from the same declaration', () => {
    const sheet = parseSheet(
      '@layer components { @media (min-width: 40rem) { .list-none { list-style-type: none; } } }'
    );
    const findings = listRole.check({
      files: [component('<ul class="list-none"><li>One</li></ul>\n')],
      sheet,
      config: resolveConfig('/site', null, () => true),
      cssFiles: [],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('only under @media (min-width: 40rem)');
    expect(findings[0].message).not.toContain('@layer');
  });

  // The item-level remedy, aligned with the rendered rule's own: when the cause is an item's own
  // display change, the message also recommends role="listitem" on the affected items, grounded in
  // the same HTML-AAM parent-relationship hedge the rendered rule carries.
  it('recommends role="listitem" too when the cause is an item display change, matching the rendered rule', () => {
    const findings = check(component('<ul class="list"><li class="list-row">One</li></ul>\n'));
    expect(findings[0].message).toContain('role="listitem"');
    expect(findings[0].message).toContain("HTML-AAM's implicit li-to-listitem mapping");
  });

  // The own-marker-suppressor cause never adds the item-level remedy: no item display changed, so
  // there is no item to recommend role="listitem" on.
  it('does not recommend role="listitem" when the cause is the list\'s own marker suppression', () => {
    const findings = check(component('<ul class="list-none"><li>One</li></ul>\n'));
    expect(findings[0].message).not.toContain('role="listitem"');
  });

  // HTML-AAM maps <menu> to role list too, and daisyUI styles chrome (breadcrumbs, menus) with it.
  it('flags a marker-suppressed <menu> the same way it flags a <ul>', () => {
    const findings = check(component('<menu class="list-none"><li>One</li></menu>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('<menu>');
  });
});
