// cairn-audit's theme-contrast rule: every text-bearing pair a public theme paints clears WCAG AA,
// 4.5:1, in both sRGB and display-p3, in every scheme the theme defines. It reads the site's real
// import chain (the loader in import-chain.ts), builds each scheme's root values with a static
// cascade (schemes.ts), and resolves each pair with the contrast core (contrast.ts).
//
// The text pairs, at 4.5:1: body text on `base-100` and `base-200`; `primary` on `base-100`, the
// link color; each role's `-content` on its own fill; muted on `base-100` and `base-200`; each
// status ink on `base-100`, `base-200`, and its callout tint; and each `--cairn-code-*` role on
// `--cairn-code-bg`. One non-text pair, at 3:1: `primary`, the focus-ring color, on `base-100` and
// `base-200`. A callout tint is the highest-percentage `color-mix(in oklab, ...)` or
// `color-mix(in oklch, ...)` of the form `var(--color-<status>) N%, var(--color-base-100)` the chain
// declares for that status, the ground a callout title actually sits on; a status the chain never
// tints has none. A status mix in another form (swapped operands, another space) keeps its pair,
// unmeasured, so the pair count never shrinks around a tint the rule cannot read.
//
// A value outside the resolver's bound, and a value the scheme model could not place, are
// reported as unmeasured, never passed. The rendered checks
// (`interactive-contrast`, and the rendered page itself) stay the ground truth; this rule catches a
// failing pair before anything renders. The rule needs `daisyui`, since a block named after a
// built-in theme takes that theme's own values where it is silent.
import { lineAt } from '../../markup.js';
import { compositeOver, dualGamutRatio, resolveColor } from '../../contrast.js';
import { loadDaisyThemeKeys, nodePeers } from '../../peers.js';
import { readThemeCascade } from '../../schemes.js';
import type { ChainFile } from '../../import-chain.js';
import type { PeerAccess } from '../../peers.js';
import type { ResolvedColor } from '../../contrast.js';
import type { Scheme, ThemeCascade } from '../../schemes.js';
import type { Finding, StaticRule } from '../../types.js';

const RULE_ID = 'theme-contrast';

/** The WCAG AA floor for body-size text, applied in both gamuts. */
export const CONTRAST_FLOOR = 4.5;

/** The WCAG floor for a non-text indicator such as the focus ring (SC 1.4.11). */
const NON_TEXT_FLOOR = 3;

const STATUSES = ['info', 'success', 'warning', 'error'] as const;
const ROLES_WITH_CONTENT = ['primary', 'secondary', 'accent', 'neutral', ...STATUSES] as const;
const CODE_ROLES = ['ink', 'keyword', 'string', 'function', 'number', 'comment', 'punct'] as const;

/** One pair the rule measures: a foreground property over a ground expression. */
export interface ContrastPair {
  /** The custom property painted as text. */
  fg: string;
  /** The ground as a CSS expression the resolver reads. */
  ground: string;
  /** How a finding names the ground. */
  groundLabel: string;
  /** The ratio the pair must clear; `CONTRAST_FLOOR` when absent. */
  floor?: number;
  /** Why the pair cannot be measured in any state, when the ground is a form the rule cannot read. */
  unmeasured?: string;
}

/** One status's callout tint, as the chain declares it. */
export interface CalloutTint {
  /** The mix the rule measures on, or the first mix it could not read. */
  expression: string;
  /** The status color's percentage in the mix, or 0 when the mix is not in the read form. */
  share: number;
  /** Why the tint is not measured, when a mix of that status is not in the read form. */
  unmeasured?: string;
}

/** One measured pair in one root state of a scheme. */
export interface ContrastRow {
  scheme: string;
  /** The phrase naming the root state, as a finding prints it. */
  state: string;
  fg: string;
  ground: string;
  /** Both ratios, absent when the pair was unmeasured. */
  srgb?: number;
  p3?: number;
  /** The ratio the pair must clear. */
  floor: number;
  pass: boolean;
  /** Why the pair could not be measured, when it could not. */
  unmeasured?: string;
  /**
   * What stopped the measurement: `value` when the resolver could not evaluate a value, `cascade`
   * when the scheme model could not place a declaration the pair reads, and `tint` when the
   * callout tint is not in the form the rule reads.
   */
  unmeasuredBy?: 'value' | 'cascade' | 'tint';
  /** The custom property the scheme model could not place, for a `cascade` row. */
  unplaced?: string;
}

/** One scheme's measurement. */
export interface SchemeContrast {
  /** The daisyUI block's name. */
  name: string;
  /** The root states measured, as findings name them. */
  states: string[];
  /** The number of pairs the scheme should measure. */
  expected: number;
  /** The number of pairs measured in every state. */
  measured: number;
  rows: ContrastRow[];
}

/** A whole chain's measurement: every scheme, and the findings it raises. */
export interface ContrastMeasurement {
  schemes: SchemeContrast[];
  findings: Finding[];
}

const TINT = /^color-mix\(\s*in\s+(?:oklab|oklch)\s*,\s*var\(\s*--color-(info|success|warning|error)\s*\)\s+([\d.]+)%\s*,\s*var\(\s*--color-base-100\s*\)\s*\)$/i;
const STATUS_READ = /var\(\s*--color-(info|success|warning|error)\s*\)/i;
const BACKGROUND = /^background(?:-color)?$/i;

/** Each `color-mix()` call a value makes, outermost calls only, as written. */
function mixCalls(value: string): string[] {
  const calls: string[] = [];
  const opener = /color-mix\(/gi;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(value))) {
    let depth = 0;
    let end = -1;
    for (let i = match.index + match[0].length - 1; i < value.length; i++) {
      if (value[i] === '(') depth++;
      else if (value[i] === ')' && --depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end === -1) break;
    calls.push(value.slice(match.index, end));
    opener.lastIndex = end;
  }
  return calls;
}

/**
 * Each status's callout tint: the highest-percentage status-over-`base-100` mix the chain declares.
 * A mix of a status color over `base-100` in another form, or any status mix painted as a
 * background, is a tint the rule cannot read, and it marks that status's tint unmeasured.
 */
export function calloutTints(files: ChainFile[]): Map<string, CalloutTint> {
  const best = new Map<string, CalloutTint>();
  const unread = new Map<string, string>();
  for (const file of files) {
    for (const rule of file.sheet.rules) {
      for (const decl of rule.declarations) {
        for (const call of mixCalls(decl.value)) {
          const tint = TINT.exec(call);
          if (tint) {
            const status = tint[1].toLowerCase();
            const share = Number(tint[2]);
            const current = best.get(status);
            if (!current || share > current.share) best.set(status, { share, expression: call });
            continue;
          }
          const status = STATUS_READ.exec(call)?.[1].toLowerCase();
          if (!status || unread.has(status)) continue;
          if (/--color-base-100\b/i.test(call) || BACKGROUND.test(decl.property)) unread.set(status, call);
        }
      }
    }
  }
  for (const [status, expression] of unread) {
    best.set(status, {
      expression,
      share: 0,
      unmeasured: `the ${status} callout tint ${expression} is not in the form color-mix(in oklab or in oklch, var(--color-${status}) N%, var(--color-base-100))`,
    });
  }
  return best;
}

/** The pairs a scheme is measured on, given the chain's callout tints. */
export function contrastPairs(tints: Map<string, CalloutTint>): ContrastPair[] {
  const on = (fg: string, role: string): ContrastPair => ({ fg, ground: `var(--color-${role})`, groundLabel: `--color-${role}` });
  const pairs: ContrastPair[] = [
    on('--color-base-content', 'base-100'),
    on('--color-base-content', 'base-200'),
    on('--color-primary', 'base-100'),
    ...ROLES_WITH_CONTENT.map((role) => on(`--color-${role}-content`, role)),
    on('--color-muted', 'base-100'),
    on('--color-muted', 'base-200'),
  ];
  for (const status of STATUSES) {
    const ink = `--cairn-${status}-ink`;
    pairs.push(on(ink, 'base-100'), on(ink, 'base-200'));
    const tint = tints.get(status);
    if (!tint) continue;
    if (tint.unmeasured) pairs.push({ fg: ink, ground: tint.expression, groundLabel: `the ${status} callout tint`, unmeasured: tint.unmeasured });
    else pairs.push({ fg: ink, ground: tint.expression, groundLabel: `the ${status} callout tint (${tint.share}%)` });
  }
  for (const role of CODE_ROLES) pairs.push({ fg: `--cairn-code-${role}`, ground: 'var(--cairn-code-bg)', groundLabel: '--cairn-code-bg' });
  for (const role of ['base-100', 'base-200']) {
    pairs.push({ ...on('--color-primary', role), groundLabel: `--color-${role} as a focus ring`, floor: NON_TEXT_FLOOR });
  }
  return pairs;
}

/** Every custom property an expression reads, following each `var()` through the state's values. */
function readsOf(expression: string, lookup: (name: string) => string | undefined): Set<string> {
  const seen = new Set<string>();
  const pending = [expression];
  while (pending.length > 0) {
    for (const match of (pending.pop() ?? '').matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (seen.has(match[1])) continue;
      seen.add(match[1]);
      const value = lookup(match[1]);
      if (value !== undefined) pending.push(value);
    }
  }
  return seen;
}

/** A ground resolved to an opaque color: a translucent ground is laid over `base-100` first. */
function opaqueGround(pair: ContrastPair, lookup: (name: string) => string | undefined): { color: ResolvedColor } | { reason: string } {
  const ground = resolveColor(pair.ground, lookup);
  if (!ground.ok) return { reason: ground.reason };
  if ((ground.color.alpha ?? 1) >= 1) return { color: ground.color };
  const page = resolveColor('var(--color-base-100)', lookup);
  if (!page.ok) return { reason: page.reason };
  if ((page.color.alpha ?? 1) < 1) return { reason: 'the ground and --color-base-100 are both translucent, so nothing opaque lies beneath the pair' };
  return { color: compositeOver(ground.color, page.color) };
}

/** Every pair of one scheme in each of its states. */
function measureScheme(scheme: Scheme, pairs: ContrastPair[], cascade: ThemeCascade): SchemeContrast {
  const rows: ContrastRow[] = [];
  for (const { state, label } of scheme.states) {
    const values = cascade.valuesIn(state);
    const unmodeled = cascade.unmodeledIn(state);
    const lookup = (name: string) => values.get(name);
    for (const pair of pairs) {
      const floor = pair.floor ?? CONTRAST_FLOOR;
      const base = { scheme: scheme.block.name, state: label, fg: pair.fg, ground: pair.groundLabel, floor };
      if (pair.unmeasured) {
        rows.push({ ...base, pass: false, unmeasured: pair.unmeasured, unmeasuredBy: 'tint' });
        continue;
      }
      const unplaced = [...readsOf(`var(${pair.fg}) ${pair.ground}`, lookup)].find((name) => unmodeled.has(name));
      if (unplaced) {
        rows.push({ ...base, pass: false, unmeasured: unmodeled.get(unplaced), unmeasuredBy: 'cascade', unplaced });
        continue;
      }
      const fg = resolveColor(`var(${pair.fg})`, lookup);
      if (!fg.ok) {
        rows.push({ ...base, pass: false, unmeasured: fg.reason, unmeasuredBy: 'value' });
        continue;
      }
      const ground = opaqueGround(pair, lookup);
      if ('reason' in ground) {
        rows.push({ ...base, pass: false, unmeasured: ground.reason, unmeasuredBy: 'value' });
        continue;
      }
      const { srgb, p3 } = dualGamutRatio(fg.color, ground.color);
      rows.push({ ...base, srgb, p3, pass: srgb >= floor && p3 >= floor });
    }
  }
  const unmeasuredPairs = new Set(rows.filter((row) => row.unmeasured).map((row) => `${row.fg}|${row.ground}`));
  return {
    name: scheme.block.name,
    states: scheme.states.map((entry) => entry.label),
    expected: pairs.length,
    measured: pairs.filter((pair) => !unmeasuredPairs.has(`${pair.fg}|${pair.groundLabel}`)).length,
    rows,
  };
}

/** What an unmeasured finding tells the author to do, by what stopped the measurement. */
const UNMEASURED_ADVICE: Record<NonNullable<ContrastRow['unmeasuredBy']>, string> = {
  value:
    'The resolver follows var() chains to a literal and evaluates color-mix(in oklab or in oklch, one operand with a percentage, one without); check a value in another form in the rendered audit',
  cascade: 'Set the value in a daisyUI theme block or a plain :root rule the scheme model reads, or check the pair in the rendered audit',
  tint: 'Write the tint in that form, or check the pair in the rendered audit',
};

/** A ratio as a finding prints it. */
function ratio(value: number | undefined): string {
  return `${(value ?? 0).toFixed(2)}:1`;
}

/** The findings of one scheme: one per failing foreground, and one per unmeasured reason. */
function schemeFindings(scheme: SchemeContrast, at: Pick<Finding, 'file' | 'line' | 'start' | 'end'>): Finding[] {
  const findings: Finding[] = [];
  const stateCount = scheme.states.length;
  const finding = (message: string): Finding => ({ ruleId: RULE_ID, tier: 'advisory', ...at, message });

  // Failing pairs, grouped by foreground and floor, each ground once per distinct pair of ratios.
  const failing = new Map<string, Map<string, { row: ContrastRow; states: string[] }>>();
  for (const row of scheme.rows) {
    if (row.pass || row.unmeasured) continue;
    const group = `${row.fg}|${row.floor}`;
    const byGround = failing.get(group) ?? new Map<string, { row: ContrastRow; states: string[] }>();
    failing.set(group, byGround);
    const key = `${row.ground}|${ratio(row.srgb)}|${ratio(row.p3)}`;
    const entry = byGround.get(key);
    if (entry) entry.states.push(row.state);
    else byGround.set(key, { row, states: [row.state] });
  }
  for (const byGround of failing.values()) {
    const entries = [...byGround.values()];
    const { fg, floor } = entries[0].row;
    const parts = entries.map(({ row, states }) => {
      const where = states.length === stateCount ? '' : ` (${states.join(', ')})`;
      return `${fg} on ${row.ground} is ${ratio(row.srgb)} in sRGB and ${ratio(row.p3)} in display-p3${where}`;
    });
    findings.push(
      finding(`theme "${scheme.name}": below ${floor}:1: ${parts.join('; ')}. Darken or lighten the value this theme sets for it, or set a tuned value in this block`)
    );
  }

  // Unmeasured pairs, grouped by the reason the resolver, the scheme model, or the tint gave.
  const unmeasured = new Map<string, { by: ContrastRow['unmeasuredBy']; unplaced: Set<string>; pairs: Set<string> }>();
  for (const row of scheme.rows) {
    if (!row.unmeasured) continue;
    const entry = unmeasured.get(row.unmeasured) ?? { by: row.unmeasuredBy, unplaced: new Set<string>(), pairs: new Set<string>() };
    unmeasured.set(row.unmeasured, entry);
    if (row.unplaced) entry.unplaced.add(row.unplaced);
    entry.pairs.add(`${row.fg} on ${row.ground}`);
  }
  for (const [reason, { by, unplaced, pairs }] of unmeasured) {
    const names = [...unplaced];
    const cause = names.length === 0 ? reason : `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} ${reason}`;
    findings.push(finding(`theme "${scheme.name}": unmeasured: ${cause}, so ${[...pairs].join(', ')} could not be measured. ${UNMEASURED_ADVICE[by ?? 'value']}`));
  }
  return findings;
}

/**
 * Measure every scheme the chain's daisyUI blocks define, and the findings that raises.
 * `builtInThemes` is daisyUI's theme object; `fallbackFile` is where a finding about the chain as a
 * whole points when the chain read no file.
 */
export function measureThemeContrast(
  files: ChainFile[],
  builtInThemes: Record<string, Record<string, string>>,
  fallbackFile = 'src/theme/theme.css'
): ContrastMeasurement {
  const cascade = readThemeCascade(files, builtInThemes);
  const pairs = contrastPairs(calloutTints(files));
  const schemes: SchemeContrast[] = [];
  const findings: Finding[] = [];
  for (const scheme of cascade.schemes) {
    const measured = measureScheme(scheme, pairs, cascade);
    schemes.push(measured);
    const { file, rule } = scheme.block;
    findings.push(...schemeFindings(measured, { file: file.file, line: lineAt(file.source, rule.start), start: rule.start, end: rule.end }));
  }
  if (cascade.schemes.length === 0) {
    const entry = files.find((file) => file.entry);
    findings.push({
      ruleId: RULE_ID,
      tier: 'advisory',
      file: entry?.file ?? fallbackFile,
      line: 1,
      start: 0,
      end: 0,
      message: 'no daisyUI theme block in the public stylesheet chain, so theme-contrast measured nothing. Define the theme in @plugin "daisyui/theme" blocks',
    });
  }
  return { schemes, findings };
}

/** A row's verdict as the table prints it. */
function resultLabel(row: ContrastRow): string {
  if (row.unmeasured) return `UNMEASURED (${row.unplaced ? `${row.unplaced} is ` : ''}${row.unmeasured})`;
  return row.pass ? 'PASS' : 'FAIL';
}

/** A measurement as an aligned table: one row per pair per state, for a script's report. */
export function formatContrastTable(measurement: ContrastMeasurement): string {
  const rows = measurement.schemes.flatMap((scheme) => scheme.rows);
  const pairWidth = Math.max(4, ...rows.map((row) => `${row.fg} on ${row.ground}`.length));
  const stateWidth = Math.max(5, ...rows.map((row) => `${row.scheme} ${row.state}`.length));
  const head = `${'SCHEME'.padEnd(stateWidth)}  ${'PAIR'.padEnd(pairWidth)}  ${'sRGB'.padStart(7)}  ${'P3'.padStart(7)}  RESULT`;
  const body = rows.map((row) => {
    const result = resultLabel(row);
    const srgb = row.srgb === undefined ? '-' : row.srgb.toFixed(2);
    const p3 = row.p3 === undefined ? '-' : row.p3.toFixed(2);
    return `${`${row.scheme} ${row.state}`.padEnd(stateWidth)}  ${`${row.fg} on ${row.ground}`.padEnd(pairWidth)}  ${srgb.padStart(7)}  ${p3.padStart(7)}  ${result}`;
  });
  return [head, ...body].join('\n');
}

/**
 * Build the theme-contrast rule over a given peer access. The registered rule reads the real
 * installed daisyUI; a test injects its own to drive the missing-peer failure.
 */
export function createThemeContrast(peers: PeerAccess = nodePeers): StaticRule {
  return {
    id: RULE_ID,
    tier: 'advisory',
    publicScope: true,
    importChain: true,
    check(ctx) {
      const { themes } = loadDaisyThemeKeys(ctx.config.root, peers, 'read its built-in theme values to measure a block named after one');
      return measureThemeContrast(ctx.chain?.files ?? [], themes, ctx.config.publicStylesheets[0]).findings;
    },
  };
}

/** The registered rule: `theme-contrast` over the daisyUI installed beside the audited site. */
export const themeContrast: StaticRule = createThemeContrast();
