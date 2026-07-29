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
  OpenDesignQuestion,
  RatifiedNorm,
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

// A fixture-owned open question and ratified norm, deliberately independent of whatever the
// production OPEN_DESIGN_QUESTIONS/RATIFIED_NORMS tables currently hold. Pinning the open-question
// discipline's tests to a real row (the card-border hairline, before Ruling 2 settled it) meant a
// settled ruling silently emptied the table and stopped proving anything; a fixture proves the
// mechanics no matter how many real questions are open right now. Sharing one role/property between
// the two also lets a single fixture prove that an open question overrides an otherwise-ratified
// band, not merely that it sits beside an unrelated one.
const FIXTURE_OPEN_QUESTION: OpenDesignQuestion = {
  role: 'select',
  property: 'fixture-open-question',
  question: 'a fixture-owned question with no production meaning, used only to prove the discipline',
  reference: 'fixture only, not a real design record',
};

const FIXTURE_RATIFIED_NORM: RatifiedNorm = {
  role: FIXTURE_OPEN_QUESTION.role,
  property: FIXTURE_OPEN_QUESTION.property,
  values: ['thin'],
  reference: 'fixture only, not a real design record',
};

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
  // A manifest that presented an open question's band as a norm would launder it into a settled
  // one; this proves the guard holds, and that an open question wins over an otherwise-agreeing
  // ratified band rather than the two merely coexisting.
  it('flags an entry an open design question governs, overriding an otherwise-ratified provenance', () => {
    const manifest = buildManifest(
      sourceOf([
        observe(FIXTURE_OPEN_QUESTION.role, FIXTURE_OPEN_QUESTION.property, 'keyword', 'thin'),
        observe(FIXTURE_OPEN_QUESTION.role, FIXTURE_OPEN_QUESTION.property, 'keyword', 'thin'),
      ]),
      { ratifiedNorms: [FIXTURE_RATIFIED_NORM], openQuestions: [FIXTURE_OPEN_QUESTION] }
    );
    const entry = entryOf(manifest, FIXTURE_OPEN_QUESTION.role, FIXTURE_OPEN_QUESTION.property);
    expect(entry.flags).toContain('open-question');
    expect(entry.flags).not.toContain('ratified-drift');
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

  it('passes a manifest that honors every discipline', () => {
    expect(
      checkManifestDisciplines(
        manifestWith([
          {
            role: FIXTURE_OPEN_QUESTION.role,
            property: FIXTURE_OPEN_QUESTION.property,
            band: { kind: 'relationship', expressions: ['var(--fixture-token)'] },
            observations: 4,
            provenance: 'observed',
            flags: ['open-question'],
          },
        ]),
        { openQuestions: [FIXTURE_OPEN_QUESTION] }
      )
    ).toEqual([]);
  });

  it('reports an open-question entry presented as a settled norm', () => {
    const violations = checkManifestDisciplines(
      manifestWith([
        {
          role: FIXTURE_OPEN_QUESTION.role,
          property: FIXTURE_OPEN_QUESTION.property,
          band: { kind: 'relationship', expressions: ['var(--fixture-token)'] },
          observations: 4,
          provenance: 'ratified',
          flags: [],
        },
      ]),
      { openQuestions: [FIXTURE_OPEN_QUESTION] }
    );
    // Three, because the reverse direction sees the same entry too: no ratified decision governs
    // this role/property in the production table it was checked against.
    expect(violations).toHaveLength(3);
    expect(violations.join('\n')).toMatch(/not flagged/);
    expect(violations.join('\n')).toMatch(/claims ratified provenance/);
    expect(violations.join('\n')).toMatch(/no ratified decision governs it/);
  });

  // The reverse disciplines. A table-to-entry lookup only ever notices a row it already knows
  // about, so an entry claiming a flag or a provenance that nothing behind it supports could live
  // in the committed manifest indefinitely, which is exactly what happened to `card/border-color`
  // after Ruling 2 emptied the open-question table: the CLI printed `[open-question]` with no
  // `OPEN:` line, so the one row Geoff had ruled on read as an unsettled question with the question
  // redacted. The disciplines exist to stop an unsettled number reading as settled; this is that
  // laundering inverted.
  it('reports an entry flagged open-question that no open question governs', () => {
    const violations = checkManifestDisciplines(
      manifestWith([
        {
          role: 'select',
          property: 'height',
          band: { kind: 'length', unit: 'px', values: [40], min: 40, max: 40 },
          observations: 4,
          provenance: 'observed',
          flags: ['open-question'],
        },
      ]),
      { openQuestions: [] }
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/no open design question governs it/);
  });

  it('reports an entry a ratified decision settles that still claims observed provenance', () => {
    const violations = checkManifestDisciplines(
      manifestWith([
        {
          role: FIXTURE_RATIFIED_NORM.role,
          property: FIXTURE_RATIFIED_NORM.property,
          band: { kind: 'keyword', values: ['thin'] },
          observations: 4,
          provenance: 'observed',
          flags: [],
        },
      ]),
      { ratifiedNorms: [FIXTURE_RATIFIED_NORM], openQuestions: [] }
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/still claims observed provenance/);
  });

  it('reports a drifted band that never says so', () => {
    const violations = checkManifestDisciplines(
      manifestWith([
        {
          role: FIXTURE_RATIFIED_NORM.role,
          property: FIXTURE_RATIFIED_NORM.property,
          band: { kind: 'keyword', values: ['thick'] },
          observations: 4,
          provenance: 'observed',
          flags: [],
        },
      ]),
      { ratifiedNorms: [FIXTURE_RATIFIED_NORM], openQuestions: [] }
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/not flagged ratified-drift/);
  });

  it('accepts a drifted band that carries the flag', () => {
    expect(
      checkManifestDisciplines(
        manifestWith([
          {
            role: FIXTURE_RATIFIED_NORM.role,
            property: FIXTURE_RATIFIED_NORM.property,
            band: { kind: 'keyword', values: ['thick'] },
            observations: 4,
            provenance: 'observed',
            flags: ['ratified-drift'],
          },
        ]),
        { ratifiedNorms: [FIXTURE_RATIFIED_NORM], openQuestions: [] }
      )
    ).toEqual([]);
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

  it('prints the band, the site count, and the provenance, citing where a ratified band is recorded', () => {
    const printed = formatNormsQuery(queryNorms(manifest, 'card'));
    expect(printed).toContain('card  (container)');
    expect(printed).toContain('border-radius');
    expect(printed).toContain('ratified by');
  });

  // The shipped manifest carries no open question once Ruling 2 settled the last one, so the
  // OPEN: line is proved against a fixture question rather than the manifest's live contents, the
  // same reasoning FIXTURE_OPEN_QUESTION exists for above.
  it('prints an open question governing an entry', () => {
    const fixtureManifest = buildManifest(
      sourceOf([
        observe(FIXTURE_OPEN_QUESTION.role, FIXTURE_OPEN_QUESTION.property, 'keyword', 'thin'),
        observe(FIXTURE_OPEN_QUESTION.role, FIXTURE_OPEN_QUESTION.property, 'keyword', 'thin'),
      ]),
      { openQuestions: [FIXTURE_OPEN_QUESTION] }
    );
    const printed = formatNormsQuery(queryNorms(fixtureManifest, FIXTURE_OPEN_QUESTION.role), {
      openQuestions: [FIXTURE_OPEN_QUESTION],
    });
    expect(printed).toContain('OPEN:');
    expect(printed).toContain(FIXTURE_OPEN_QUESTION.question);
  });
});

describe('the shipped manifest', () => {
  const manifest = loadNormsManifest();

  it('covers every role in the vocabulary', () => {
    const covered = new Set(manifest.entries.map((entry) => entry.role));
    expect([...NORM_ROLES].map((role) => role.id).filter((id) => !covered.has(id))).toEqual([]);
  });

  // The production-anchored check. Every other discipline test hands `checkManifestDisciplines` its
  // own fixture tables, which proves the mechanics and proves nothing about whether production
  // still reads the production tables; a mutation pass cut `OPEN_DESIGN_QUESTIONS` out of all four
  // call sites and the whole suite stayed green. This one passes no tables, so it reads
  // `RATIFIED_NORMS` and `OPEN_DESIGN_QUESTIONS` on every run and holds the committed manifest
  // against them in both directions. It needs no browser and no preview server, unlike
  // `npm run norms:check`, which is why the stale row it now catches survived every gate that runs
  // in CI.
  //
  // One limit is worth stating rather than papering over: while the open-question table is empty,
  // no test can tell `?? OPEN_DESIGN_QUESTIONS` from `?? []`. The wiring becomes load-bearing again
  // the moment a question is opened, because a severed table would then fire the reverse discipline
  // on every real open question and turn this red.
  it('honors its own disciplines against the production tables', () => {
    expect(checkManifestDisciplines(manifest)).toEqual([]);
  });

  // The flag and the decision are two files that have to agree. Ruling 2 is the live example: the
  // hairline moved from open question to ratified norm, and a manifest that still called it a
  // question would print `[open-question]` at a builder with nothing behind it.
  it('carries no open-question flag the production table cannot explain', () => {
    for (const entry of manifest.entries) {
      if (!entry.flags.includes('open-question')) continue;
      expect(
        OPEN_DESIGN_QUESTIONS.some(
          (question) => question.role === entry.role && question.property === entry.property
        )
      ).toBe(true);
    }
  });

  // What a builder actually reads. A `ratified` row prints the document that settles it, and a
  // flagged row prints the question, so neither can appear as a bare word with no authority behind
  // it. `card/border-color` is the row Ruling 2 moved, and it prints the ruling now.
  it('prints a decision behind every provenance the CLI shows', () => {
    const printed = formatNormsQuery(queryNorms(manifest, 'card'));
    expect(printed).not.toContain('[open-question]');
    expect(printed).toContain('border-color  var(--cairn-card-border)');
    expect(printed).toMatch(/border-color .*ratified/);
    expect(printed).toContain('Ruling 2');
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
