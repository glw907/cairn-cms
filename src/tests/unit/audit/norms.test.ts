import { describe, it, expect } from 'vitest';
import {
  buildManifest,
  checkManifestDisciplines,
  formatNormsQuery,
  isTokenDerived,
  loadNormsManifest,
  queryNorms,
  unknownTermMessage,
  MIN_OBSERVATION_SITES,
  NORM_ROLES,
  OPEN_DESIGN_QUESTIONS,
} from '../../../lib/audit/norms.js';
import type {
  NormEntry,
  NormObservation,
  NormsManifest,
  NormsSource,
} from '../../../lib/audit/norms.js';

// One observation per line, so a fixture reads as the measurements it is rather than as nested
// object literals. The site defaults to a distinct one per call, which keeps a fixture that means
// "several independent sites" from accidentally counting as one.
let siteCounter = 0;
function observe(
  role: string,
  property: string,
  kind: NormObservation['kind'],
  value: number | string,
  site?: string
): NormObservation {
  siteCounter += 1;
  return { role, property, kind, value, site: site ?? `/fixture#${siteCounter}` };
}

// Every role has to appear or `buildManifest` refuses the run, so a fixture that cares about one
// role still carries a cheap observation for the rest. The synthetic property name keeps these
// filler observations out of whatever band the fixture is actually about.
function everyRoleCovered(): NormObservation[] {
  return NORM_ROLES.map((role) => observe(role.id, 'fixture-coverage', 'length', 1));
}

function sourceOf(observations: NormObservation[]): NormsSource {
  return { pages: ['/admin/posts'], themes: ['cairn-admin'], observations: [...everyRoleCovered(), ...observations] };
}

function entryOf(manifest: NormsManifest, role: string, property: string): NormEntry {
  const entry = manifest.entries.find((candidate) => candidate.role === role && candidate.property === property);
  if (!entry) throw new Error(`fixture is missing ${role}/${property}`);
  return entry;
}

describe('buildManifest band derivation', () => {
  it('derives a length band from the distinct rounded values', () => {
    const manifest = buildManifest(
      sourceOf([
        observe('button-primary', 'height', 'length', 40),
        observe('button-primary', 'height', 'length', 32),
        observe('button-primary', 'height', 'length', 40),
      ])
    );
    const entry = entryOf(manifest, 'button-primary', 'height');
    expect(entry.band).toEqual({ kind: 'length', unit: 'px', values: [32, 40], min: 32, max: 40 });
  });

  // Sub-pixel layout jitter is the reason the manifest can be freshness-checked at all: two runs
  // that measure 39.98 and 40.01 have to serialize the same number or the check is pure noise.
  it('rounds a length to the documented half-pixel precision', () => {
    const manifest = buildManifest(
      sourceOf([
        observe('button-primary', 'height', 'length', 39.98),
        observe('button-primary', 'height', 'length', 40.24),
      ])
    );
    expect(entryOf(manifest, 'button-primary', 'height').band).toMatchObject({ values: [40] });
  });

  it('rounds a ratio without leaving binary floating-point noise in the manifest', () => {
    const manifest = buildManifest(
      sourceOf([observe('button-primary', 'padding-inline-to-font-size', 'ratio', 0.857142)])
    );
    const band = entryOf(manifest, 'button-primary', 'padding-inline-to-font-size').band;
    expect(band).toMatchObject({ kind: 'ratio', values: [0.85] });
    expect(JSON.stringify(band)).not.toContain('0.8500000000000001');
  });

  // A theme repeat measures the same element twice. Counting it twice would let a one-component
  // band clear the observation floor purely because the generator renders light and dark.
  it('counts distinct element sites, not repeated measurements of one site', () => {
    const manifest = buildManifest(
      sourceOf([
        observe('card', 'border-width', 'length', 1, '/admin/posts#0'),
        observe('card', 'border-width', 'length', 1, '/admin/posts#0'),
      ])
    );
    const entry = entryOf(manifest, 'card', 'border-width');
    expect(entry.observations).toBe(1);
    expect(entry.flags).toContain('single-observation');
  });

  it('sorts entries and keeps a keyword band as a vocabulary', () => {
    const manifest = buildManifest(
      sourceOf([
        observe('table-cell', 'line-height', 'keyword', 'normal'),
        observe('table-cell', 'line-height', 'keyword', '19px'),
        observe('table-cell', 'line-height', 'keyword', 'normal'),
      ])
    );
    expect(entryOf(manifest, 'table-cell', 'line-height').band).toEqual({
      kind: 'keyword',
      values: ['19px', 'normal'],
    });
    const roles = manifest.entries.map((entry) => entry.role);
    expect(roles).toEqual([...roles].sort());
  });
});

describe('buildManifest fails loudly rather than emitting a confident empty manifest', () => {
  it('refuses a run that produced no observations at all', () => {
    expect(() => buildManifest({ pages: ['/admin/posts'], themes: ['cairn-admin'], observations: [] })).toThrow(
      /no observations/
    );
  });

  // The Phase 2 lesson, applied to the generator: a selector that matches nothing is exactly the
  // shape of a typo'd scan path, and a manifest that quietly omitted the role would report a clean
  // generation for ground it never covered.
  it('refuses a run in which a role matched nothing', () => {
    const observations = everyRoleCovered().filter((observation) => observation.role !== 'select');
    expect(() => buildManifest({ pages: ['/admin/posts'], themes: ['cairn-admin'], observations })).toThrow(
      /matched these norm roles: select/
    );
  });

  it('refuses an observation naming a role outside the vocabulary', () => {
    expect(() => buildManifest(sourceOf([observe('button-secondary', 'height', 'length', 40)]))).toThrow(
      /not a known norm role/
    );
  });

  it('refuses one property whose observations disagree about their kind', () => {
    expect(() =>
      buildManifest(
        sourceOf([
          observe('card', 'border-width', 'length', 1),
          observe('card', 'border-width', 'keyword', 'thin'),
        ])
      )
    ).toThrow(/disagree about their kind/);
  });
});

describe('provenance', () => {
  it('marks a pair a ratified decision settles, and cites nothing it does not', () => {
    const manifest = buildManifest(
      sourceOf([
        observe('page-title', 'font-size', 'length', 24),
        observe('page-title', 'font-size', 'length', 24),
        observe('page-title', 'font-weight', 'keyword', '700'),
      ])
    );
    expect(entryOf(manifest, 'page-title', 'font-size').provenance).toBe('ratified');
    expect(entryOf(manifest, 'page-title', 'font-weight').provenance).toBe('observed');
  });

  // Ratified has to mean a decision AND a render that still matches it. A drifted band that kept
  // the word would teach the decision's number while the admin renders another one.
  it('drops a drifted band back to observed and flags the drift', () => {
    const manifest = buildManifest(
      sourceOf([
        observe('page-title', 'font-size', 'length', 24),
        observe('page-title', 'font-size', 'length', 28),
      ])
    );
    const entry = entryOf(manifest, 'page-title', 'font-size');
    expect(entry.provenance).toBe('observed');
    expect(entry.flags).toContain('ratified-drift');
  });

  it('flags a band under the observation floor as a single observation', () => {
    const manifest = buildManifest(sourceOf([observe('select', 'height', 'length', 40, '/admin/posts#0')]));
    const entry = entryOf(manifest, 'select', 'height');
    expect(MIN_OBSERVATION_SITES).toBe(2);
    expect(entry.observations).toBe(1);
    expect(entry.flags).toContain('single-observation');
  });

  it('leaves a band on the floor unflagged', () => {
    const manifest = buildManifest(
      sourceOf([
        observe('select', 'height', 'length', 40, '/admin/posts#0'),
        observe('select', 'height', 'length', 40, '/admin/pages#0'),
      ])
    );
    expect(entryOf(manifest, 'select', 'height').flags).toEqual([]);
  });
});

describe('the open-question discipline', () => {
  // The live case: the --cairn-card-border hairline is measured, unsettled, and on Geoff's queue.
  // A manifest that presented it as a norm would launder an open question into a settled one.
  it('flags an entry an open design question governs and refuses it ratified provenance', () => {
    expect(OPEN_DESIGN_QUESTIONS.some((q) => q.role === 'card' && q.property === 'border-color')).toBe(true);
    const manifest = buildManifest(
      sourceOf([
        observe('card', 'border-color', 'relationship', 'var(--cairn-card-border)'),
        observe('card', 'border-color', 'relationship', 'var(--cairn-card-border)'),
      ])
    );
    const entry = entryOf(manifest, 'card', 'border-color');
    expect(entry.flags).toContain('open-question');
    expect(entry.provenance).toBe('observed');
  });

  it('leaves an entry no open question governs unflagged', () => {
    const manifest = buildManifest(
      sourceOf([
        observe('card', 'background-color', 'relationship', 'var(--color-base-100)'),
        observe('card', 'background-color', 'relationship', 'var(--color-base-100)'),
      ])
    );
    expect(entryOf(manifest, 'card', 'background-color').flags).toEqual([]);
  });
});

describe('the palette-relationship discipline', () => {
  it('keeps a var reference, a color-mix formula, and currentcolor', () => {
    expect(isTokenDerived('var(--cairn-card-border)')).toBe(true);
    expect(isTokenDerived('color-mix(in oklab, currentColor 35%, transparent)')).toBe(true);
    expect(isTokenDerived('transparent')).toBe(true);
  });

  it('rejects a resolved palette value in any notation', () => {
    expect(isTokenDerived('oklch(52% 0.2 293)')).toBe(false);
    expect(isTokenDerived('#e7e0d8')).toBe(false);
    expect(isTokenDerived('rgb(231 224 216)')).toBe(false);
    expect(isTokenDerived('white')).toBe(false);
  });

  it('drops a resolved literal before it can reach a band, and says so', () => {
    const manifest = buildManifest(
      sourceOf([
        observe('input-text', 'background-color', 'relationship', 'var(--color-base-100)'),
        observe('input-text', 'background-color', 'relationship', 'var(--color-base-100)'),
        observe('input-text', 'background-color', 'relationship', 'oklch(98% 0.005 75)'),
      ])
    );
    const entry = entryOf(manifest, 'input-text', 'background-color');
    expect(entry.band).toEqual({ kind: 'relationship', expressions: ['var(--color-base-100)'] });
    expect(entry.flags).toContain('literal-dropped');
  });

  it('omits an entry whose every observation was a resolved literal', () => {
    const manifest = buildManifest(
      sourceOf([observe('input-text', 'border-color', 'relationship', '#d6cec4')])
    );
    expect(manifest.entries.some((entry) => entry.role === 'input-text' && entry.property === 'border-color')).toBe(
      false
    );
  });
});

describe('checkManifestDisciplines', () => {
  // The disciplines run over the FINISHED manifest, so a hand-edited or stale file meets the same
  // gate the derivation does. Each fixture below is a manifest that violates exactly one.
  function manifestWith(entries: NormEntry[]): NormsManifest {
    return {
      precision: { lengthPx: 0.5, ratio: 0.05 },
      minObservationSites: MIN_OBSERVATION_SITES,
      pages: ['/admin/posts'],
      themes: ['cairn-admin'],
      roles: [...NORM_ROLES],
      entries,
    };
  }

  it('passes a manifest that honors all three', () => {
    expect(
      checkManifestDisciplines(
        manifestWith([
          {
            role: 'card',
            property: 'border-color',
            band: { kind: 'relationship', expressions: ['var(--cairn-card-border)'] },
            observations: 4,
            provenance: 'observed',
            flags: ['open-question'],
          },
        ])
      )
    ).toEqual([]);
  });

  it('reports an open-question entry presented as a settled norm', () => {
    const violations = checkManifestDisciplines(
      manifestWith([
        {
          role: 'card',
          property: 'border-color',
          band: { kind: 'relationship', expressions: ['var(--cairn-card-border)'] },
          observations: 4,
          provenance: 'ratified',
          flags: [],
        },
      ])
    );
    expect(violations).toHaveLength(2);
    expect(violations.join('\n')).toMatch(/not flagged/);
    expect(violations.join('\n')).toMatch(/claims ratified provenance/);
  });

  it('reports a band under the floor that never says so', () => {
    const violations = checkManifestDisciplines(
      manifestWith([
        {
          role: 'select',
          property: 'height',
          band: { kind: 'length', unit: 'px', values: [40], min: 40, max: 40 },
          observations: 1,
          provenance: 'observed',
          flags: [],
        },
      ])
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/under the floor of 2/);
  });

  it('reports a resolved palette literal inside a palette-dependent band', () => {
    const violations = checkManifestDisciplines(
      manifestWith([
        {
          role: 'card',
          property: 'background-color',
          band: { kind: 'relationship', expressions: ['oklch(98% 0.005 75)'] },
          observations: 6,
          provenance: 'observed',
          flags: [],
        },
      ])
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/resolved literal/);
  });
});

describe('the query', () => {
  const manifest = loadNormsManifest();

  it('resolves a role id, a bare class, and a whole selector to the same role', () => {
    expect(queryNorms(manifest, 'status-chip').map((match) => match.role.id)).toEqual(['status-chip']);
    expect(queryNorms(manifest, '.status-chip').map((match) => match.role.id)).toEqual(['status-chip']);
    expect(queryNorms(manifest, '.btn.btn-primary').map((match) => match.role.id)).toEqual(['button-primary']);
  });

  it('resolves a class token that several roles share to every role carrying it', () => {
    expect(queryNorms(manifest, 'btn').map((match) => match.role.id).sort()).toEqual([
      'button-ghost',
      'button-primary',
    ]);
  });

  it('returns the queried role only, with its own entries', () => {
    const [match] = queryNorms(manifest, 'card');
    expect(match.role.family).toBe('container');
    expect(match.entries.length).toBeGreaterThan(0);
    expect(match.entries.every((entry) => entry.role === 'card')).toBe(true);
  });

  // A miss that returned an empty result and exited 0 would read as "this role has no norms",
  // which is the same silent green a mistyped scan path produced in Phase 2.
  it('matches nothing for a term that names no role, and names the roles that exist', () => {
    expect(queryNorms(manifest, 'btn-secondary')).toEqual([]);
    expect(queryNorms(manifest, '')).toEqual([]);
    expect(unknownTermMessage(manifest, 'btn-secondary')).toContain('button-primary');
  });

  it('prints the band, the site count, the provenance, and the open question', () => {
    const printed = formatNormsQuery(queryNorms(manifest, 'card'));
    expect(printed).toContain('card  (container)');
    expect(printed).toContain('border-radius');
    expect(printed).toContain('ratified by');
    expect(printed).toContain('OPEN:');
  });
});

describe('the shipped manifest', () => {
  const manifest = loadNormsManifest();

  it('covers every role in the vocabulary', () => {
    const covered = new Set(manifest.entries.map((entry) => entry.role));
    expect([...NORM_ROLES].map((role) => role.id).filter((id) => !covered.has(id))).toEqual([]);
  });

  it('honors its own three disciplines', () => {
    expect(checkManifestDisciplines(manifest)).toEqual([]);
  });

  // The manifest ships to consumers who re-tune the palette, so a resolved Warm Stone value in it
  // would be a number their theme never produces.
  it('carries no resolved palette literal anywhere', () => {
    for (const entry of manifest.entries) {
      if (entry.band.kind !== 'relationship') continue;
      for (const expression of entry.band.expressions) {
        expect(isTokenDerived(expression)).toBe(true);
      }
    }
  });
});
