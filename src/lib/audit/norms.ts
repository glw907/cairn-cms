// cairn-audit's norms manifest: the admin's measured design norms as data, derived from a rendered
// admin rather than asserted from a doc. The generator (scripts/generate-norms-manifest.mjs) drives
// a browser and produces raw observations; this module owns everything that is not the browser: the
// role vocabulary the generator queries, the band derivation, the provenance rules, the three
// honesty disciplines, the load, and the query the bin's `norms` subcommand prints.
//
// Splitting it this way is deliberate. Band and provenance logic is where a manifest can quietly
// launder an unsettled number into ground truth, so it lives in a typed, fixture-tested module,
// and the .mjs generator stays a thin driver that renders, extracts, and calls in here.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * A role's structural family, which decides the properties the generator measures for it. A
 * control has a height and a padding-to-type relationship; a container has neither of interest but
 * carries the border and radius vocabulary; a text role is a type recipe; an icon is a glyph box.
 */
export type NormFamily = 'control' | 'container' | 'text' | 'icon';

/** One semantic role in the admin's design language, and the selector that finds it in a render. */
export interface NormRole {
  /** Stable id, the name the CLI query and every manifest entry use. */
  id: string;
  family: NormFamily;
  /** CSS selector the generator matches against a rendered admin page. */
  selector: string;
  /** What the role is, in the design system's own terms. */
  description: string;
}

// The role vocabulary. Every role here is a promise that the rendered page set contains it: a role
// that matches nothing fails the generator loudly (see `buildManifest`), because a manifest that
// silently drops a role is the same silent-green failure the audit engine exists to prevent. Add a
// role only alongside a page that renders it.
/** Every semantic role the manifest covers. */
export const NORM_ROLES: readonly NormRole[] = [
  {
    id: 'button-primary',
    family: 'control',
    selector: '.btn.btn-primary',
    description: 'The primary action button, the one accent-filled control on a surface.',
  },
  {
    id: 'button-ghost',
    family: 'control',
    selector: '.btn.btn-ghost',
    description: 'The quiet button: chrome actions, toolbar controls, and row affordances.',
  },
  {
    id: 'input-text',
    family: 'control',
    selector: 'input.input',
    description: 'A single-line text input.',
  },
  {
    id: 'select',
    family: 'control',
    selector: 'select.select',
    description: 'A native select control.',
  },
  {
    id: 'status-chip',
    family: 'control',
    selector: '.status-chip',
    description: "The publish-state pill, the admin's chip metric.",
  },
  {
    id: 'card',
    family: 'container',
    selector: '.card-shell',
    description: 'The floating card surface: the list table, the editor panes, the auth card.',
  },
  {
    id: 'table-cell',
    family: 'text',
    selector: 'table.table td',
    description: 'An office table body cell.',
  },
  {
    id: 'table-header-cell',
    family: 'text',
    selector: 'table.table th',
    description: 'An office table column label.',
  },
  {
    id: 'nav-item',
    family: 'text',
    // Scoped to the shell's own nav landmark, not a bare `.menu a`. The command palette's result
    // list is a `.menu` too, and folding its type into this role widened the band until the
    // sidebar's ruled 15px step no longer read as the norm.
    selector: 'nav[aria-label="Site content"] .menu a',
    description: 'A sidebar navigation item.',
  },
  {
    id: 'page-title',
    family: 'text',
    selector: 'h1.page-h1',
    description: "The page heading in PageHeader's title slot.",
  },
  {
    id: 'eyebrow',
    family: 'text',
    selector: '.type-label',
    description: 'The eyebrow: sidebar group headers, column labels, and section legends.',
  },
  {
    id: 'icon',
    family: 'icon',
    selector: 'svg.lucide',
    description: 'An inline lucide glyph.',
  },
];

/**
 * The smallest number of distinct element sites a band may rest on before it stops being flagged.
 *
 * Two, not more. One site is not a distribution: it is that one component's value restated as if it
 * were a shared norm, which is exactly the inference the `single-observation` flag exists to block.
 * Two independent sites is the smallest evidence that a value travels between components. A higher
 * bar reads well in the abstract and fails in practice here, because the admin has roughly a dozen
 * semantic roles and several legitimately appear on one screen; a threshold of three or more would
 * flag most bands and the flag would stop carrying information.
 */
export const MIN_OBSERVATION_SITES = 2;

/** Rounding the derivation applies, so a band's edges mean the same thing on every run. */
export const NORM_PRECISION = {
  /** Lengths round to the nearest half pixel, which absorbs sub-pixel layout jitter. */
  lengthPx: 0.5,
  /** Ratios round to the nearest twentieth, the finest step a padding-to-type ratio reads at. */
  ratio: 0.05,
} as const;

/** One measured value's kind, which decides how its band is derived and printed. */
export type NormKind = 'length' | 'ratio' | 'keyword' | 'relationship';

/** One measurement of one property on one element, as the generator hands it over. */
export interface NormObservation {
  role: string;
  /** The manifest's property name, not necessarily the CSS property the generator read. */
  property: string;
  kind: NormKind;
  /** A number for `length` and `ratio`; the keyword or authored expression otherwise. */
  value: number | string;
  /**
   * One element on one page, as `<page>#<index>`. A theme repeat shares its site, so an
   * observation count measures distinct elements rather than how many themes were rendered.
   */
  site: string;
}

/** The values a property was observed to take, in the form its kind reads at. */
export type NormBand =
  | { kind: 'length'; unit: 'px'; values: number[]; min: number; max: number }
  | { kind: 'ratio'; values: number[]; min: number; max: number }
  | { kind: 'keyword'; values: string[] }
  | { kind: 'relationship'; expressions: string[] };

/** A caveat on an entry. Every flag narrows what a reader may conclude from the band. */
export type NormFlag =
  /** The band rests on fewer than {@link MIN_OBSERVATION_SITES} sites. */
  | 'single-observation'
  /** An open design question governs this norm, so the band is not settled ground truth. */
  | 'open-question'
  /** A ratified decision governs this pair, and the render no longer agrees with it. */
  | 'ratified-drift'
  /** At least one observation resolved to a palette literal and was dropped. */
  | 'literal-dropped';

/** One norm: what a role's property measures across the render, and how far to trust it. */
export interface NormEntry {
  role: string;
  property: string;
  band: NormBand;
  /** Distinct element sites behind the band. */
  observations: number;
  provenance: 'ratified' | 'observed';
  flags: NormFlag[];
}

/** The generated manifest, shipped in the package and queried through the CLI. */
export interface NormsManifest {
  /** The rounding the bands were derived under. */
  precision: { lengthPx: number; ratio: number };
  minObservationSites: number;
  /** The admin paths the generator rendered. */
  pages: string[];
  /** The theme names the generator rendered each page under. */
  themes: string[];
  roles: NormRole[];
  entries: NormEntry[];
}

/** A norm a ratified decision already settles, and the document that settles it. */
export interface RatifiedNorm {
  role: string;
  property: string;
  /** Every value the ratified decision allows, in the manifest's own units. */
  values: readonly (number | string)[];
  /** Where the decision is on record. */
  reference: string;
}

// The ratified table. A pair listed here is `ratified` ONLY while the render still agrees with the
// recorded value; a drifted band falls back to `observed` and carries `ratified-drift`, so the word
// ratified in a manifest entry always means a decision AND a render that still matches it.
/** Every norm a ratified decision settles. */
export const RATIFIED_NORMS: readonly RatifiedNorm[] = [
  {
    role: 'page-title',
    property: 'font-size',
    values: [24],
    reference: 'docs/reference/admin-grammar-tokens.md (--cairn-type-title)',
  },
  {
    role: 'page-title',
    property: 'line-height',
    values: ['32px'],
    reference: 'docs/reference/admin-grammar-tokens.md (--cairn-type-title--leading)',
  },
  {
    role: 'eyebrow',
    property: 'font-size',
    values: [11],
    reference: 'docs/reference/admin-grammar-tokens.md (--cairn-type-label)',
  },
  {
    role: 'eyebrow',
    property: 'line-height',
    values: ['14px'],
    reference: 'docs/reference/admin-grammar-tokens.md (--cairn-type-label--leading)',
  },
  {
    role: 'nav-item',
    property: 'font-size',
    values: [15],
    reference: 'docs/reference/admin-grammar-tokens.md (--cairn-type-subtitle)',
  },
  {
    role: 'button-primary',
    property: 'border-radius',
    values: [10],
    reference: 'docs/internal/admin-design-system.md (--radius-field)',
  },
  {
    role: 'button-ghost',
    property: 'border-radius',
    values: [10],
    reference: 'docs/internal/admin-design-system.md (--radius-field)',
  },
  {
    role: 'input-text',
    property: 'border-radius',
    values: [10],
    reference: 'docs/internal/admin-design-system.md (--radius-field)',
  },
  {
    role: 'select',
    property: 'border-radius',
    values: [10],
    reference: 'docs/internal/admin-design-system.md (--radius-field)',
  },
  {
    role: 'card',
    property: 'border-radius',
    values: [16],
    reference: 'docs/internal/admin-design-system.md (--radius-box)',
  },
  {
    role: 'card',
    property: 'border-width',
    values: [1],
    reference: 'docs/internal/admin-design-system.md (the card-shell hairline)',
  },
  {
    role: 'card',
    property: 'border-color',
    values: ['var(--cairn-card-border)'],
    reference:
      'docs/superpowers/plans/2026-07-27-design-infrastructure-pass-2-enforcement.md (Ruling 2, Task 16b): the --cairn-card-border hairline measures 1.11 against the ambient beside it and 1.19 against the card\'s own fill in light, 1.43 and 1.20 in dark, and stays by design. The border-contrast rule applies a house floor of 3:1, the number WCAG 1.4.11 sets for a control-identifying boundary rather than for a card hairline, and exempts this one on the better of its two ratios against a ratified floor of 1.15',
  },
];

/** A design question still on the queue, and the norm a reader must not settle from the manifest. */
export interface OpenDesignQuestion {
  role: string;
  property: string;
  /** What is unsettled, in one line. */
  question: string;
  /** Where the question is on record. */
  reference: string;
}

// The open-question table. An entry matching a row here is flagged and forced to `observed`
// provenance, and the `norms-bands` rule treats a flagged entry as unbanded rather than checking
// against it. The manifest still carries the measurement, because hiding it would leave a builder
// inventing a number instead; what the flag removes is the entry's authority.
//
// Empty is the ordinary state, not a stale one: it means every design question a spec raised has
// been ruled. The table's last resident, the `--cairn-card-border` hairline, moved to
// {@link RATIFIED_NORMS} once Ruling 2 settled it; that move is the discipline working, not a gap
// in it.
/** Every open design question the manifest must not present as settled. */
export const OPEN_DESIGN_QUESTIONS: readonly OpenDesignQuestion[] = [];

// A palette-dependent value is admitted only in token-derived form. The test is deliberately
// inverted: an expression qualifies when it reaches the palette through a custom property or is one
// of the keywords that names no color at all. Anything else counts as a resolved literal, so a
// color notation nobody has thought of yet fails closed rather than riding into the manifest.
const PALETTE_NEUTRAL_KEYWORDS = new Set([
  'transparent',
  'currentcolor',
  'none',
  'inherit',
  'initial',
  'unset',
  'revert',
]);

/**
 * Whether a palette-dependent expression stays a relationship rather than a resolved Warm Stone
 * value. A consumer re-tunes the palette, so a manifest that stored the resolved value would teach
 * that consumer a number their own theme never produces.
 *
 * A custom property is the usual route, and `currentcolor` is the other one: StatusChip's hairline
 * is `color-mix(in oklab, currentColor 35%, transparent)`, which names no palette value at all and
 * follows whatever ink the chip inherits. That is a relationship, and the mix formula is exactly
 * the form the spec asks a palette-dependent norm to be stored in.
 */
export function isTokenDerived(expression: string): boolean {
  const trimmed = expression.trim();
  if (trimmed === '') return false;
  const lowered = trimmed.toLowerCase();
  if (PALETTE_NEUTRAL_KEYWORDS.has(lowered)) return true;
  return lowered.includes('var(--') || lowered.includes('currentcolor');
}

// Rounding through a step multiplier reintroduces binary floating-point noise (0.85 arrives as
// 0.8500000000000001), which would serialize into the manifest and break a byte-comparison
// freshness check. The fixed-precision pass afterwards is what makes the rounding actually round.
function roundTo(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(4));
}

function sortedUnique<T>(values: T[], compare: (a: T, b: T) => number): T[] {
  return [...new Set(values)].sort(compare);
}

function byNumber(a: number, b: number): number {
  return a - b;
}

function byText(a: string, b: string): number {
  return a.localeCompare(b);
}

function numericValues(observations: NormObservation[], step: number): number[] {
  return observations.map((observation) => {
    if (typeof observation.value !== 'number' || !Number.isFinite(observation.value)) {
      throw new Error(
        `${observation.role}/${observation.property}: a ${observation.kind} observation needs a finite number, got ${JSON.stringify(observation.value)}`
      );
    }
    return roundTo(observation.value, step);
  });
}

function textValues(observations: NormObservation[]): string[] {
  return observations.map((observation) => {
    if (typeof observation.value !== 'string') {
      throw new Error(
        `${observation.role}/${observation.property}: a ${observation.kind} observation needs a string, got ${JSON.stringify(observation.value)}`
      );
    }
    return observation.value.trim();
  });
}

function bandFor(kind: NormKind, observations: NormObservation[]): NormBand {
  if (kind === 'length' || kind === 'ratio') {
    const step = kind === 'length' ? NORM_PRECISION.lengthPx : NORM_PRECISION.ratio;
    const values = sortedUnique(numericValues(observations, step), byNumber);
    const band = { values, min: values[0], max: values[values.length - 1] };
    return kind === 'length' ? { kind, unit: 'px', ...band } : { kind, ...band };
  }
  const values = sortedUnique(textValues(observations), byText);
  return kind === 'keyword' ? { kind, values } : { kind, expressions: values };
}

function bandValues(band: NormBand): (number | string)[] {
  return band.kind === 'relationship' ? band.expressions : band.values;
}

/**
 * An override of the production {@link RATIFIED_NORMS}/{@link OPEN_DESIGN_QUESTIONS} tables, for a
 * fixture that must prove a discipline without depending on whichever real design questions happen
 * to be open. Every derivation and query entry point defaults to the production tables when this
 * is omitted, so nothing outside a test ever needs to pass one.
 */
export interface NormsTables {
  ratifiedNorms?: readonly RatifiedNorm[];
  openQuestions?: readonly OpenDesignQuestion[];
}

function findRatified(
  role: string,
  property: string,
  table: readonly RatifiedNorm[] = RATIFIED_NORMS
): RatifiedNorm | undefined {
  return table.find((norm) => norm.role === role && norm.property === property);
}

function findOpenQuestion(
  role: string,
  property: string,
  table: readonly OpenDesignQuestion[] = OPEN_DESIGN_QUESTIONS
): OpenDesignQuestion | undefined {
  return table.find((question) => question.role === role && question.property === property);
}

/** The raw material one generator run hands the derivation. */
export interface NormsSource {
  pages: string[];
  themes: string[];
  observations: NormObservation[];
}

/**
 * Derive the manifest from a run's observations.
 *
 * Throws when a run produced nothing, when an observation names a role outside
 * {@link NORM_ROLES}, when a role's selector matched nothing anywhere, or when one property's
 * observations disagree about their kind. Each of those is a generator that measured less than it
 * claims, and a manifest is worse than useless when it is confidently incomplete.
 *
 * `tables` overrides the production ratified/open-question tables; the generator never passes one.
 */
export function buildManifest(source: NormsSource, tables: NormsTables = {}): NormsManifest {
  if (source.observations.length === 0) {
    throw new Error(
      'the norms render produced no observations; the pages rendered nothing the role selectors match'
    );
  }
  const known = new Set(NORM_ROLES.map((role) => role.id));
  const groups = new Map<string, NormObservation[]>();
  for (const observation of source.observations) {
    if (!known.has(observation.role)) {
      throw new Error(`${observation.role}: not a known norm role`);
    }
    const key = `${observation.role}\u0000${observation.property}`;
    const group = groups.get(key);
    if (group) group.push(observation);
    else groups.set(key, [observation]);
  }

  const entries: NormEntry[] = [];
  for (const group of groups.values()) {
    const { role, property } = group[0];
    const kinds = new Set(group.map((observation) => observation.kind));
    if (kinds.size > 1) {
      throw new Error(`${role}/${property}: observations disagree about their kind (${[...kinds].join(', ')})`);
    }
    const kind = group[0].kind;
    const flags: NormFlag[] = [];

    // Palette-dependent observations are filtered before the band is derived, never after: a
    // literal that reached the band would already have been published.
    let kept = group;
    if (kind === 'relationship') {
      kept = group.filter((observation) => isTokenDerived(String(observation.value)));
      if (kept.length < group.length) flags.push('literal-dropped');
      if (kept.length === 0) continue;
    }

    const band = bandFor(kind, kept);
    const observations = new Set(kept.map((observation) => observation.site)).size;
    if (observations < MIN_OBSERVATION_SITES) flags.push('single-observation');

    const ratified = findRatified(role, property, tables.ratifiedNorms);
    let provenance: NormEntry['provenance'] = 'observed';
    if (ratified) {
      const agrees = bandValues(band).every((value) => ratified.values.includes(value));
      if (agrees) provenance = 'ratified';
      else flags.push('ratified-drift');
    }
    if (findOpenQuestion(role, property, tables.openQuestions)) {
      flags.push('open-question');
      provenance = 'observed';
    }

    entries.push({ role, property, band, observations, provenance, flags: flags.sort(byText) });
  }

  const covered = new Set(entries.map((entry) => entry.role));
  const missing = NORM_ROLES.filter((role) => !covered.has(role.id)).map((role) => role.id);
  if (missing.length > 0) {
    throw new Error(
      `no rendered page matched these norm roles: ${missing.join(', ')}. Add a page that renders the role, or retire the role.`
    );
  }

  entries.sort((a, b) => (a.role === b.role ? byText(a.property, b.property) : byText(a.role, b.role)));
  return {
    precision: { lengthPx: NORM_PRECISION.lengthPx, ratio: NORM_PRECISION.ratio },
    minObservationSites: MIN_OBSERVATION_SITES,
    pages: [...source.pages].sort(byText),
    themes: [...source.themes].sort(byText),
    roles: [...NORM_ROLES].sort((a, b) => byText(a.id, b.id)),
    entries,
  };
}

/**
 * Check a manifest against the disciplines that keep it honest, in BOTH directions: an entry
 * matching an open design question never reads as settled, an entry claiming a flag or a provenance
 * the tables do not support never reads as governed, a band under the observation floor says so,
 * and no palette-dependent entry carries a resolved literal. Returns one message per violation,
 * empty when the manifest is clean.
 *
 * This runs over the FINISHED manifest rather than inside the derivation on purpose. The derivation
 * is one way to produce a manifest; a hand-edited or stale file is another, and both reach the same
 * gate here.
 *
 * The reverse direction is the half an adversarial pass found missing, and it is what makes the
 * shipped manifest a live check on the tables rather than a snapshot beside them. A table-to-entry
 * lookup can only ever notice a row it already knows about, so a flag whose referent had been
 * ruled away survived in the committed file, and `norms card` printed `[open-question]` with no
 * question behind it: the one row Geoff had actually ruled on read to a builder as unsettled with
 * the question redacted. Nothing in `npm test`, `npm run check`, or CI could see it, because the
 * only gate that regenerates the manifest needs a built package and a running preview server. This
 * check needs neither, and it reads the production tables on every run, which is also what keeps
 * the default-parameter wiring below load-bearing the moment a design question is opened.
 *
 * `tables` overrides the production tables; a fixture proving a discipline passes its own rows
 * rather than depending on whichever real question happens to be open.
 */
export function checkManifestDisciplines(manifest: NormsManifest, tables: NormsTables = {}): string[] {
  const violations: string[] = [];
  for (const entry of manifest.entries) {
    const where = `${entry.role}/${entry.property}`;
    const question = findOpenQuestion(entry.role, entry.property, tables.openQuestions);
    if (question) {
      if (!entry.flags.includes('open-question')) {
        violations.push(`${where}: an open design question governs this norm and the entry is not flagged (${question.reference})`);
      }
      if (entry.provenance === 'ratified') {
        violations.push(`${where}: an open design question governs this norm and the entry claims ratified provenance`);
      }
    } else if (entry.flags.includes('open-question')) {
      violations.push(
        `${where}: the entry is flagged open-question and no open design question governs it, so the flag prints with nothing behind it. Regenerate the manifest.`
      );
    }

    const ratified = findRatified(entry.role, entry.property, tables.ratifiedNorms);
    if (ratified) {
      const agrees = bandValues(entry.band).every((value) => ratified.values.includes(value));
      if (!agrees && !entry.flags.includes('ratified-drift')) {
        violations.push(
          `${where}: the render disagrees with the ratified decision and the entry is not flagged ratified-drift (${ratified.reference})`
        );
      }
      if (agrees && !question && entry.provenance !== 'ratified') {
        violations.push(
          `${where}: a ratified decision settles this norm and the render agrees with it, and the entry still claims ${entry.provenance} provenance (${ratified.reference})`
        );
      }
    } else if (entry.provenance === 'ratified') {
      violations.push(`${where}: the entry claims ratified provenance and no ratified decision governs it`);
    }

    if (entry.observations < manifest.minObservationSites && !entry.flags.includes('single-observation')) {
      violations.push(
        `${where}: ${entry.observations} observation site(s) is under the floor of ${manifest.minObservationSites} and the entry is not flagged single-observation`
      );
    }
    if (entry.band.kind === 'relationship') {
      for (const expression of entry.band.expressions) {
        if (!isTokenDerived(expression)) {
          violations.push(`${where}: the palette-dependent band carries a resolved literal (${expression})`);
        }
      }
    }
  }
  return violations;
}

/** Where the shipped manifest sits, beside this module in both the source tree and `dist`. */
export const NORMS_MANIFEST_PATH = fileURLToPath(new URL('./norms-manifest.json', import.meta.url));

function isManifest(value: unknown): value is NormsManifest {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<NormsManifest>;
  return Array.isArray(candidate.entries) && Array.isArray(candidate.roles);
}

/** Read the shipped manifest. Throws when the file is missing or is not a manifest. */
export function loadNormsManifest(path: string = NORMS_MANIFEST_PATH): NormsManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!isManifest(raw)) throw new Error(`${path}: not a norms manifest`);
  return raw;
}

/** One role the query matched, with that role's entries. */
export interface NormsQueryMatch {
  role: NormRole;
  entries: NormEntry[];
}

// A query term reaches a role three ways: its id, its whole selector, or any class token inside its
// selector, so `status-chip`, `.status-chip`, and `.btn.btn-primary` all land. The class tokens are
// read out of the selector rather than matched with a selector engine, because there is no DOM here
// and a lookup that needed one would be a browser dependency in the query path.
function selectorClasses(selector: string): string[] {
  return [...selector.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((match) => match[1]);
}

/** Every role a term names, by role id, whole selector, or a class token in that selector. */
export function queryNorms(manifest: NormsManifest, term: string): NormsQueryMatch[] {
  const wanted = term.trim();
  if (wanted === '') return [];
  const bare = wanted.replace(/^[.#]/, '');
  const matches = manifest.roles.filter(
    (role) =>
      role.id === bare ||
      role.selector === wanted ||
      selectorClasses(role.selector).includes(bare)
  );
  return matches.map((role) => ({
    role,
    entries: manifest.entries.filter((entry) => entry.role === role.id),
  }));
}

function formatBand(band: NormBand): string {
  if (band.kind === 'relationship') return band.expressions.join(', ');
  if (band.kind === 'keyword') return band.values.join(', ');
  const unit = band.kind === 'length' ? 'px' : '';
  return band.min === band.max ? `${band.min}${unit}` : `${band.min}${unit} to ${band.max}${unit}`;
}

/**
 * Render a query result for a terminal or an agent reading the CLI.
 *
 * `tables` overrides the production ratified/open-question tables; the bin never passes one.
 */
export function formatNormsQuery(matches: NormsQueryMatch[], tables: NormsTables = {}): string {
  const lines: string[] = [];
  for (const match of matches) {
    lines.push(`${match.role.id}  (${match.role.family})  ${match.role.selector}`, `  ${match.role.description}`, '');
    for (const entry of match.entries) {
      const sites = `${entry.observations} site${entry.observations === 1 ? '' : 's'}`;
      const flags = entry.flags.length > 0 ? `  [${entry.flags.join(' ')}]` : '';
      lines.push(`  ${entry.property}  ${formatBand(entry.band)}  ${sites}  ${entry.provenance}${flags}`);
      const ratified =
        entry.provenance === 'ratified' ? findRatified(entry.role, entry.property, tables.ratifiedNorms) : undefined;
      if (ratified) lines.push(`    ratified by ${ratified.reference}`);
      const question = entry.flags.includes('open-question')
        ? findOpenQuestion(entry.role, entry.property, tables.openQuestions)
        : undefined;
      if (question) lines.push(`    OPEN: ${question.question} (${question.reference})`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

/** The message a term that names no role gets, so a miss never reads as a role with no norms. */
export function unknownTermMessage(manifest: NormsManifest, term: string): string {
  const roles = manifest.roles.map((role) => role.id).join(', ');
  return `no norm role matches ${term}. Known roles: ${roles}`;
}
