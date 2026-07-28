import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { stockDefaultHazards } from '../../../../lib/audit/rules/static/stock-default-hazards.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

// The rule reads only class tokens and node attributes; it never resolves through the sheet.
const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return stockDefaultHazards.check({ files, sheet: SHEET, config: CONFIG });
}

describe('stock-default-hazards: badge-ghost', () => {
  it('flags the stock ghost badge unconditionally', () => {
    const file = parseComponent('Fixture.svelte', '<span class="badge badge-ghost">New</span>\n');
    const findings = check(file);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('stock-default-hazards');
    expect(findings[0].message).toContain('badge-ghost');
  });

  // The shape the hazard actually ships in: the class name is chosen in the script and
  // interpolated into the attribute, which used to contribute no class token at all, so the
  // rule's flagship hazard read as absent from a tree that carried it.
  it('flags a ghost badge a script binding names and the markup interpolates', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<script>',
        '  const statusBadge = $derived.by(() => {',
        "    if (status === 'Edited') return 'badge-warning';",
        "    return 'badge-ghost';",
        '  });',
        '</script>',
        '<span class="badge badge-sm font-medium shrink-0 {statusBadge}">{status}</span>',
        '',
      ].join('\n')
    );
    const findings = check(file);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('badge-ghost');
  });

  it('passes the sanctioned badge-outline recipe', () => {
    const file = parseComponent('Fixture.svelte', '<span class="badge badge-outline">New</span>\n');
    expect(check(file)).toEqual([]);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<!-- cairn-audit-disable-next-line stock-default-hazards -- migrating this screen next -->',
        '<span class="badge badge-ghost">New</span>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['stock-default-hazards']);
  });
});

describe('stock-default-hazards: bare .dropdown', () => {
  it('flags a .dropdown wrapper with neither a popover attribute nor a state toggle', () => {
    const file = parseComponent(
      'Fixture.svelte',
      '<div class="dropdown"><ul class="dropdown-content">x</ul></div>\n'
    );
    const findings = check(file);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('focus-driven');
  });

  it('passes a DaisyUI v5 popover dropdown, the popover attribute on the same element', () => {
    const file = parseComponent(
      'Fixture.svelte',
      '<ul popover="auto" class="dropdown menu">x</ul>\n'
    );
    expect(check(file)).toEqual([]);
  });

  // cairn's admin-toolkit ListToolbar recipe: an explicit $state-driven class:dropdown-open
  // toggle neutralizes the same focus-in-transit/Escape failure the popover form solves, by a
  // documented, different mechanism.
  it('passes a .dropdown wrapper carrying its own class:dropdown-open state toggle', () => {
    const file = parseComponent(
      'Fixture.svelte',
      '<div class="dropdown" class:dropdown-open={open}>x</div>\n'
    );
    expect(check(file)).toEqual([]);
  });
});

describe('stock-default-hazards: native disabled on a guarded button', () => {
  it('flags a hardcoded disabled shorthand on a guarded button', () => {
    const file = parseComponent(
      'Fixture.svelte',
      '<button class="btn cairn-btn-guarded" disabled>Publish</button>\n'
    );
    const findings = check(file);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('aria-disabled');
  });

  it('flags a hardcoded disabled={true} on a guarded button', () => {
    const file = parseComponent(
      'Fixture.svelte',
      '<button class="btn cairn-btn-guarded" disabled={true}>Publish</button>\n'
    );
    expect(check(file)).toHaveLength(1);
  });

  // The one case the guidance sanctions: native disabled reserved for the mid-submit busy state,
  // a bound condition rather than a hardcoded value.
  it('passes a bound disabled expression, the sanctioned busy-state case', () => {
    const file = parseComponent(
      'Fixture.svelte',
      '<button class="btn cairn-btn-guarded" aria-disabled={true} disabled={busy}>Publish</button>\n'
    );
    expect(check(file)).toEqual([]);
  });

  it('passes native disabled on a button that is not a guarded button at all', () => {
    const file = parseComponent('Fixture.svelte', '<button class="btn" disabled>Cancel</button>\n');
    expect(check(file)).toEqual([]);
  });
});

describe('stock-default-hazards: flat base-300 card border', () => {
  it('flags a floating card shell with a flat border-base-300', () => {
    const file = parseComponent(
      'Fixture.svelte',
      '<div class="rounded-box bg-base-100 border border-base-300">x</div>\n'
    );
    const findings = check(file);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('--cairn-card-border');
  });

  it('passes the theme-adaptive hairline recipe', () => {
    const file = parseComponent(
      'Fixture.svelte',
      '<div class="rounded-box bg-base-100 border border-[var(--cairn-card-border)]">x</div>\n'
    );
    expect(check(file)).toEqual([]);
  });

  // The upload dropzone affordance: a dashed border is a different, sanctioned visual language,
  // not the floating-card recipe border-base-300 stands in for.
  it('passes a dashed border-base-300, the upload-dropzone affordance', () => {
    const file = parseComponent(
      'Fixture.svelte',
      '<div class="rounded-box bg-base-100 border border-dashed border-base-300">x</div>\n'
    );
    expect(check(file)).toEqual([]);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<!-- cairn-audit-disable-next-line stock-default-hazards -- migrating this card next -->',
        '<div class="rounded-box bg-base-100 border border-base-300">x</div>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['stock-default-hazards']);
  });
});
