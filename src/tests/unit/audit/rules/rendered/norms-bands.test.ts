// norms-bands's pure judgment logic: given an already-measured candidate and a manifest, does it
// report, and what does it say. This is the half of the rule that needs no browser, the same split
// interactive-contrast and chip-ground-collision draw between their DOM walk and their color
// arithmetic (color.test.ts is the precedent). The DOM walk itself, and the fact that the rule can
// never gate a real run, are proven against real Chromium in norms-bands.browser.test.ts.
import { describe, expect, it } from 'vitest';
import { evaluateNormsBandCandidate, type NormsBandCandidate } from '../../../../../lib/audit/rules/rendered/norms-bands.js';
import { exitCodeFor } from '../../../../../lib/audit/report.js';
import type { NormEntry, NormsManifest } from '../../../../../lib/audit/norms.js';

/** A minimal manifest carrying exactly the entries a test names, nothing buildManifest requires. */
function manifestOf(entries: NormEntry[]): NormsManifest {
  return {
    precision: { lengthPx: 0.5, ratio: 0.05 },
    minObservationSites: 2,
    pages: ['/fixture'],
    themes: ['cairn-admin'],
    roles: [],
    entries,
  };
}

function lengthEntry(role: string, property: string, values: number[], overrides: Partial<NormEntry> = {}): NormEntry {
  return {
    role,
    property,
    band: { kind: 'length', unit: 'px', values, min: Math.min(...values), max: Math.max(...values) },
    observations: overrides.observations ?? values.length + 1,
    provenance: overrides.provenance ?? 'observed',
    flags: overrides.flags ?? [],
  };
}

function ratioEntry(role: string, property: string, values: number[], overrides: Partial<NormEntry> = {}): NormEntry {
  return {
    role,
    property,
    band: { kind: 'ratio', values, min: Math.min(...values), max: Math.max(...values) },
    observations: overrides.observations ?? values.length + 1,
    provenance: overrides.provenance ?? 'observed',
    flags: overrides.flags ?? [],
  };
}

function keywordEntry(role: string, property: string, values: string[], overrides: Partial<NormEntry> = {}): NormEntry {
  return {
    role,
    property,
    band: { kind: 'keyword', values },
    observations: overrides.observations ?? values.length + 1,
    provenance: overrides.provenance ?? 'observed',
    flags: overrides.flags ?? [],
  };
}

function candidate(over: Partial<NormsBandCandidate> = {}): NormsBandCandidate {
  return { role: 'button-primary', selector: 'button.btn.btn-primary', property: 'height', kind: 'length', value: 40, ...over };
}

describe('evaluateNormsBandCandidate: band membership', () => {
  it('reports nothing when the measurement falls inside the band', () => {
    const manifest = manifestOf([lengthEntry('button-primary', 'height', [30.5, 32, 40])]);
    expect(evaluateNormsBandCandidate(candidate({ value: 32 }), manifest)).toBeNull();
  });

  it('reports a length outside the band, naming the band and its site count', () => {
    const manifest = manifestOf([lengthEntry('button-primary', 'height', [30.5, 32, 40], { observations: 11 })]);
    const finding = evaluateNormsBandCandidate(candidate({ value: 96 }), manifest);
    expect(finding).not.toBeNull();
    expect(finding?.tier).toBe('advisory');
    expect(finding?.ruleId).toBe('norms-bands');
    expect(finding?.selector).toBe('button.btn.btn-primary');
    expect(finding?.message).toContain('button-primary/height');
    expect(finding?.message).toContain('96');
    expect(finding?.message).toContain('30.5px to 40px');
    expect(finding?.message).toContain('11 sites');
  });

  it('rounds to the band precision before comparing, so sub-step jitter is not a false positive', () => {
    // 40.24 rounds to 40 at the 0.5px step norms.ts derives bands under; a raw compare would flag it.
    const manifest = manifestOf([lengthEntry('button-primary', 'height', [30.5, 32, 40])]);
    expect(evaluateNormsBandCandidate(candidate({ value: 40.24 }), manifest)).toBeNull();
  });

  it('reports a ratio outside the band', () => {
    const manifest = manifestOf([ratioEntry('status-chip', 'padding-inline-to-font-size', [0.7])]);
    const finding = evaluateNormsBandCandidate(
      candidate({ role: 'status-chip', property: 'padding-inline-to-font-size', kind: 'ratio', value: 2.0 }),
      manifest
    );
    expect(finding?.message).toContain('2.00');
    expect(finding?.message).toContain('0.7');
  });

  it('reports a keyword outside its vocabulary', () => {
    const manifest = manifestOf([keywordEntry('button-ghost', 'border-style', ['solid'])]);
    const finding = evaluateNormsBandCandidate(
      candidate({ role: 'button-ghost', property: 'border-style', kind: 'keyword', value: 'dashed' }),
      manifest
    );
    expect(finding?.message).toContain('"dashed"');
    expect(finding?.message).toContain('"solid"');
  });

  it('passes a keyword that is a member of the vocabulary', () => {
    const manifest = manifestOf([keywordEntry('button-ghost', 'border-style', ['solid', 'none'])]);
    expect(
      evaluateNormsBandCandidate(
        candidate({ role: 'button-ghost', property: 'border-style', kind: 'keyword', value: 'none' }),
        manifest
      )
    ).toBeNull();
  });
});

describe('evaluateNormsBandCandidate: the manifest contracts', () => {
  it('treats an open-question entry as unbanded, even when the measurement would otherwise miss', () => {
    const manifest = manifestOf([
      lengthEntry('card', 'border-radius', [16], { flags: ['open-question'] }),
    ]);
    const finding = evaluateNormsBandCandidate(
      candidate({ role: 'card', property: 'border-radius', kind: 'length', value: 4 }),
      manifest
    );
    expect(finding).toBeNull();
  });

  it('reports a single-observation band as one example, never as a distribution', () => {
    const manifest = manifestOf([
      lengthEntry('select', 'border-radius', [10], { observations: 1, flags: ['single-observation'] }),
    ]);
    const finding = evaluateNormsBandCandidate(
      candidate({ role: 'select', property: 'border-radius', kind: 'length', value: 4 }),
      manifest
    );
    expect(finding?.message).toContain('only other observed value');
    expect(finding?.message).toContain('single element site');
    expect(finding?.message).not.toMatch(/observed band of/);
  });

  it('reports nothing when the manifest carries no entry for this role and property', () => {
    const manifest = manifestOf([lengthEntry('button-primary', 'height', [40])]);
    expect(
      evaluateNormsBandCandidate(candidate({ role: 'button-primary', property: 'border-radius' }), manifest)
    ).toBeNull();
  });
});

describe('evaluateNormsBandCandidate: an unreadable measurement', () => {
  it('reports rather than silently skipping a candidate whose value never resolved', () => {
    const manifest = manifestOf([lengthEntry('button-primary', 'height', [40])]);
    const finding = evaluateNormsBandCandidate(candidate({ value: null }), manifest);
    expect(finding).not.toBeNull();
    expect(finding?.tier).toBe('advisory');
    expect(finding?.message).toContain('could not measure');
  });
});

describe('advisory means advisory', () => {
  it('never affects the audit exit code, even carrying real findings', () => {
    const manifest = manifestOf([lengthEntry('button-primary', 'height', [30.5, 32, 40], { observations: 11 })]);
    const finding = evaluateNormsBandCandidate(candidate({ value: 96 }), manifest);
    expect(finding).not.toBeNull();
    const report = {
      findings: [{ ruleId: finding!.ruleId, tier: finding!.tier, file: '/fixture [light, rest]', line: 0, start: 0, end: 0, message: finding!.message }],
      suppressed: [],
      filesScanned: 1,
      ruleIds: ['norms-bands'],
    };
    expect(exitCodeFor(report)).toBe(0);
  });
});
