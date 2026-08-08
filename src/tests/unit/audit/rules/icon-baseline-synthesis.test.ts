import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_STATIC_SCOPE, resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { iconBaselineSynthesis } from '../../../../lib/audit/rules/static/icon-baseline-synthesis.js';
import { walk } from '../../../../../scripts/walk-files.mjs';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

// The rule reads only class tokens and node ranges; it never resolves through the sheet.
const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return iconBaselineSynthesis.check({ files, sheet: SHEET, config: CONFIG });
}

/**
 * The shape the rule is about, as one parsed component: a row container holding an icon-plus-word
 * label beside a plain value. The defaults are the flagged case, so each test overrides only the
 * attribute or the children its own case turns on, and what varies is what it is testing.
 */
function fixture(over: { row?: string; label?: string; children?: string; value?: string } = {}): ParsedComponent {
  const row = over.row ?? 'class="flex items-baseline gap-2"';
  const label = over.label ?? 'class="inline-flex items-center gap-1"';
  const children = over.children ?? '<CheckIcon class="h-3 w-3" />Label';
  const value = over.value ?? 'Value';
  return parseComponent(
    'Fixture.svelte',
    `<div ${row}><span ${label}>${children}</span><span>${value}</span></div>\n`
  );
}

// The pre-fix `CairnTidySettings.svelte` shape, verbatim: three sibling rows, each declaring
// `sm:items-baseline`, each labeled with a bare `inline-flex` span whose first child is a lucide
// icon. Task 2 of this pass (commit 68d622a1) replaced `inline-flex items-center` with
// `cairn-icon-label` at all three; this fixture reproduces the markup those three lines carried
// before that fix, so it is the vacuous-pass guard: a rule that silently matched nothing here
// would report a clean pass over a tree that ships the defect it exists to catch.
const PRE_FIX_TIDY_SETTINGS = `
<div class="mt-2.5 flex flex-col gap-1.5">
  <div class="flex flex-col gap-1 type-meta sm:flex-row sm:items-baseline sm:gap-2">
    <span class="inline-flex items-center gap-1.5 text-muted sm:min-w-[8.5rem] sm:flex-none sm:font-medium sm:text-base-content"><CheckIcon class="h-3.5 w-3.5 flex-none text-muted" aria-hidden="true" />Tidy</span>
    <span>On for this site</span>
  </div>
  <div class="flex flex-col gap-1 type-meta sm:flex-row sm:items-baseline sm:gap-2">
    <span class="inline-flex items-center gap-1.5 text-muted sm:min-w-[8.5rem] sm:flex-none sm:font-medium sm:text-base-content"><CheckIcon class="h-3.5 w-3.5 flex-none text-muted" aria-hidden="true" />API key</span>
    <span>Set, and kept on the server</span>
  </div>
  <div class="flex flex-col gap-1 type-meta sm:flex-row sm:items-baseline sm:gap-2">
    <span class="inline-flex items-center gap-1.5 text-muted sm:min-w-[8.5rem] sm:flex-none sm:font-medium sm:text-base-content"><CheckIcon class="h-3.5 w-3.5 flex-none text-muted" aria-hidden="true" />Model</span>
    <span>claude-sonnet-4-5</span>
  </div>
</div>
`;

describe('icon-baseline-synthesis: the vacuous-pass guard', () => {
  it('flags all three pre-fix CairnTidySettings.svelte rows, never a subset', () => {
    const file = parseComponent('Fixture.svelte', PRE_FIX_TIDY_SETTINGS);
    const findings = check(file);
    expect(findings).toHaveLength(3);
    for (const finding of findings) {
      expect(finding.ruleId).toBe('icon-baseline-synthesis');
      expect(finding.tier).toBe('advisory');
      expect(finding.message).toContain('items-baseline');
      expect(finding.message).toContain('cairn-icon-label');
    }
  });

  it('flags a bare, unprefixed items-baseline row the same way', () => {
    expect(check(fixture())).toHaveLength(1);
  });

  it('flags an inline <svg> icon the same way a lucide *Icon component is flagged', () => {
    expect(check(fixture({ children: '<svg aria-hidden="true"></svg>Label' }))).toHaveLength(1);
  });

  it('flags an icon wrapped one level deep in a bare sizing span', () => {
    const wrapped = '<span class="flex-none"><CheckIcon class="h-3 w-3" /></span>Label';
    expect(check(fixture({ children: wrapped }))).toHaveLength(1);
  });
});

describe('icon-baseline-synthesis: silent cases', () => {
  it('is silent on the fixed cairn-icon-label recipe: baseline row, label not inline-flex', () => {
    const file = fixture({
      row: 'class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2"',
      label: 'class="cairn-icon-label gap-1.5 sm:min-w-[8.5rem]"',
      children: '<CheckIcon class="h-3.5 w-3.5" aria-hidden="true" />Tidy',
      value: 'On for this site',
    });
    expect(check(file)).toEqual([]);
  });

  it('is silent on an inline-flex label with no leading icon', () => {
    expect(check(fixture({ children: 'Label' }))).toEqual([]);
  });

  it('is silent on the same inline-flex-plus-icon label under a non-baseline container', () => {
    expect(check(fixture({ row: 'class="flex items-start gap-2"' }))).toEqual([]);
  });

  // A documented structural limitation, not a false negative this rule claims to close: a label
  // rendered through a Svelte block (`{#if}`) is a real DOM child of the row (Svelte blocks add no
  // wrapper element), but its AST parent is the block, not the row, since the row's own `<div>`
  // never directly encloses it in the template. The rule's own header comment names this scope
  // boundary; a block-transparent read is the kind of extension a wider pass, not this one, takes
  // on.
  it('is silent on the same label when a conditional block sits between it and the row', () => {
    const file = parseComponent(
      'Fixture.svelte',
      '<div class="flex items-baseline gap-2">' +
        '{#if true}<span class="inline-flex items-center gap-1"><CheckIcon class="h-3 w-3" />Label</span>{/if}' +
        '<span>Value</span>' +
        '</div>\n'
    );
    expect(check(file)).toEqual([]);
  });

  it('is silent when the label opts out of the row alignment with self-center', () => {
    expect(check(fixture({ label: 'class="inline-flex items-center gap-1 self-center"' }))).toEqual([]);
  });

  it('is silent when the label opts out of the row alignment with self-start', () => {
    expect(check(fixture({ label: 'class="inline-flex items-center gap-1 self-start"' }))).toEqual([]);
  });

  it('is silent when the label declares its own items-baseline, the recipe\'s load-bearing half', () => {
    expect(check(fixture({ label: 'class="inline-flex items-baseline gap-1"' }))).toEqual([]);
  });

  it('is silent under a column-direction container, where items-baseline behaves as flex-start', () => {
    expect(check(fixture({ row: 'class="flex flex-col items-baseline gap-2"' }))).toEqual([]);
  });

  it('is silent on a row-then-column responsive container: unprefixed flex-row overridden by sm:flex-col', () => {
    expect(check(fixture({ row: 'class="flex flex-row sm:flex-col sm:items-baseline gap-2"' }))).toEqual([]);
  });

  it('is silent when the container declares items-baseline only through a class: directive', () => {
    expect(check(fixture({ row: 'class="flex gap-2" class:items-baseline={dense}' }))).toEqual([]);
  });

  it('is silent when the container alignment is a ternary between items-baseline and items-center', () => {
    const row = 'class={dense ? "flex items-baseline gap-2" : "flex items-center gap-2"}';
    expect(check(fixture({ row }))).toEqual([]);
  });

  it('is silent when the label inline-flex is a ternary against a flex alternate', () => {
    const label = 'class={dense ? "inline-flex items-center gap-1" : "flex items-center gap-1"}';
    expect(check(fixture({ label }))).toEqual([]);
  });

  // A documented structural limitation, not a false negative the icon-wrapper widening closes:
  // isIconNode still keys off a name or tag shape, never an import graph, so an icon imported
  // under an alias that drops the *Icon convention reads as an ordinary component. Resolving it
  // needs an import table this substrate does not build; the rule's own header names the gap.
  it('is silent on an icon imported under a non-Icon-suffixed binding, a documented convention gap', () => {
    expect(check(fixture({ children: '<Check class="h-3 w-3" />Label' }))).toEqual([]);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<div class="flex items-baseline gap-2">',
        '<!-- cairn-audit-disable-next-line icon-baseline-synthesis -- migrating this row next -->',
        '<span class="inline-flex items-center gap-1"><CheckIcon class="h-3 w-3" />Label</span>',
        '<span>Value</span>',
        '</div>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['icon-baseline-synthesis']);
  });
});

// The tier is evidence-driven, so the evidence is pinned here rather than only described in the
// rule's header. A 2026-08-07 adversarial verification measured 59 probes in Chromium: five markup
// shapes that read exactly 0.00px, the correct result, still trip this rule, and the identical
// defect in several adjacent spellings is silent. Neither set is a bug to fix at this tier; both
// are the reason the tier is advisory, and a test is the only form of that claim that cannot rot.
describe('icon-baseline-synthesis: the advisory boundary', () => {
  it('registers at advisory tier and stamps every finding with it', () => {
    expect(iconBaselineSynthesis.tier).toBe('advisory');
    expect(check(fixture()).map((f) => f.tier)).toEqual(['advisory']);
  });

  it('hedges the claim, names both blind spots, and conditions the recipe on a word', () => {
    const [finding] = check(fixture());
    expect(finding.message).toContain('may synthesise');
    expect(finding.message).toContain('Advisory');
    expect(finding.message).toContain('position:absolute');
    expect(finding.message).toContain('order-*');
    expect(finding.message).toContain('component applies the class');
    expect(finding.message).toContain('If a word sits beside the icon');
    expect(finding.message).toContain('icon-only label the recipe');
  });

  describe('measured-correct shapes it still reports, which is why it does not gate', () => {
    it('reports a first child taken out of flow by absolute positioning', () => {
      expect(check(fixture({ children: '<CheckIcon class="absolute h-3 w-3" />Label' }))).toHaveLength(1);
    });

    it('reports a first child display:none removes from the flex item list entirely', () => {
      expect(check(fixture({ children: '<CheckIcon class="hidden sm:block h-3 w-3" />Label' }))).toHaveLength(1);
    });

    it('reports a first child an order utility moves out of first position', () => {
      expect(check(fixture({ children: '<CheckIcon class="order-last h-3 w-3" />Label' }))).toHaveLength(1);
    });

    it('reports a class handed to a component, which may apply it anywhere in its own markup', () => {
      const file = parseComponent(
        'Fixture.svelte',
        '<div class="flex items-baseline gap-2">' +
          '<Badge class="inline-flex items-center gap-1"><CheckIcon class="h-3 w-3" />Label</Badge>' +
          '<span>Value</span>' +
          '</div>\n'
      );
      expect(check(file)).toHaveLength(1);
    });

    it('reports an icon-only label, where the prescribed recipe measures identically either way', () => {
      expect(check(fixture({ children: '<CheckIcon class="h-3 w-3" />' }))).toHaveLength(1);
    });
  });

  describe('the identical defect in a spelling it does not read', () => {
    it('is silent on a label spelled flex rather than inline-flex, measured at -1.75px', () => {
      expect(check(fixture({ label: 'class="flex items-center gap-1"' }))).toEqual([]);
    });

    it('is silent on an <img> icon', () => {
      expect(check(fixture({ children: '<img src="/check.svg" alt="" />Label' }))).toEqual([]);
    });

    it('is silent on an icon-font <i>', () => {
      expect(check(fixture({ children: '<i class="fa fa-check"></i>Label' }))).toEqual([]);
    });

    it('is silent on an icon-font <span> carrying no child', () => {
      expect(check(fixture({ children: '<span class="icon-check"></span>Label' }))).toEqual([]);
    });

    it('reads a max-* variant as unprefixed, so max-sm:flex-col silences the row everywhere', () => {
      expect(check(fixture({ row: 'class="flex max-sm:flex-col items-baseline gap-2"' }))).toEqual([]);
    });

    it('is silent at every breakpoint once the label carries a single sm:self-* opt-out', () => {
      expect(check(fixture({ label: 'class="inline-flex items-center gap-1 sm:self-center"' }))).toEqual([]);
    });

    it('is silent on a label one level below the row, since it reads direct AST children only', () => {
      const file = parseComponent(
        'Fixture.svelte',
        '<div class="flex items-baseline gap-2">' +
          '<div><span class="inline-flex items-center gap-1"><CheckIcon class="h-3 w-3" />Label</span></div>' +
          '<span>Value</span>' +
          '</div>\n'
      );
      expect(check(file)).toEqual([]);
    });
  });

  // Corrected 2026-08-07 against an earlier review that filed this as a false positive. The rule
  // is right here and only the earlier reason was wrong: an inline-flex box synthesises its
  // baseline from the icon in an inline formatting context too, measured at -1.75px. Nothing here
  // should acquire a flex-display precondition on the container.
  it('reports the same label under a display:block container, a real -1.75px defect', () => {
    expect(check(fixture({ row: 'class="block items-baseline gap-2"' }))).toHaveLength(1);
  });
});

// The ordering criterion this pass's Task 4b names directly: Task 2 already fixed the three
// confirmed call sites, so the real integration proof is that the rule runs CLEAN over the
// current, fixed engine source, not merely that a fixture reproducing the old markup trips it.
describe("icon-baseline-synthesis: cairn's own admin tree", () => {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

  function realFiles(): ParsedComponent[] {
    return DEFAULT_STATIC_SCOPE.map((dir) => resolve(ROOT, dir))
      .filter((dir) => existsSync(dir))
      .flatMap((dir) => walk(dir, (name) => name.endsWith('.svelte')))
      .map((path) => parseComponent(relative(ROOT, path), readFileSync(path, 'utf8')));
  }

  it('finds no icon-baseline-synthesis defect across the whole tree', () => {
    const files = realFiles();
    // A vacuous pass is the failure mode a skipped directory could hide, so the scan proves it
    // reached real components before it proves they are clean.
    expect(files.length).toBeGreaterThan(0);
    expect(check(...files)).toEqual([]);
  });
});
