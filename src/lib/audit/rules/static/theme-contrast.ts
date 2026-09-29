// cairn-audit's theme-contrast rule: every text-bearing pair a public theme paints clears WCAG AA,
// 4.5:1, in both sRGB and display-p3, in every scheme the theme defines. It reads the site's real
// import chain (the loader in import-chain.ts), builds each scheme's root values with a static
// cascade (schemes.ts), and resolves each pair with the contrast core (contrast.ts).
//
// The pairs: body text on `base-100` and `base-200`; `primary` on `base-100`, the link and focus-ring
// color; each role's `-content` on its own fill; muted on `base-100` and `base-200`; and each status
// ink on `base-100`, `base-200`, and its callout tint. A callout tint is the highest-percentage
// `color-mix(in oklab, var(--color-<status>) N%, var(--color-base-100))` the chain declares for that
// status, the ground a callout title actually sits on; a status the chain never tints has none.
//
// A value outside the resolver's bound is reported as unmeasured, never passed. The rendered checks
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
import type { Scheme } from '../../schemes.js';
import type { Finding, StaticRule } from '../../types.js';

const RULE_ID = 'theme-contrast';

/** The WCAG AA floor for body-size text, applied in both gamuts. */
export const CONTRAST_FLOOR = 4.5;

const STATUSES = ['info', 'success', 'warning', 'error'] as const;
const ROLES_WITH_CONTENT = ['primary', 'secondary', 'accent', 'neutral', ...STATUSES] as const;

/** One pair the rule measures: a foreground property over a ground expression. */
export interface ContrastPair {
  /** The custom property painted as text. */
  fg: string;
  /** The ground as a CSS expression the resolver reads. */
  ground: string;
  /** How a finding names the ground. */
  groundLabel: string;
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
  pass: boolean;
  /** Why the pair could not be measured, when it could not. */
  unmeasured?: string;
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

const TINT = /color-mix\(\s*in\s+(?:oklab|oklch)\s*,\s*var\(\s*--color-(info|success|warning|error)\s*\)\s+([\d.]+)%\s*,\s*var\(\s*--color-base-100\s*\)\s*\)/gi;

/** Each status's callout tint: the highest-percentage status-over-`base-100` mix the chain declares. */
export function calloutTints(files: ChainFile[]): Map<string, { expression: string; share: number }> {
  const best = new Map<string, { share: number; expression: string }>();
  for (const file of files) {
    for (const rule of file.sheet.rules) {
      for (const decl of rule.declarations) {
        for (const match of decl.value.matchAll(TINT)) {
          const status = match[1].toLowerCase();
          const share = Number(match[2]);
          const current = best.get(status);
          if (!current || share > current.share) best.set(status, { share, expression: match[0] });
        }
      }
    }
  }
  return best;
}

/** The pairs a scheme is measured on, given the chain's callout tints. */
export function contrastPairs(tints: Map<string, { expression: string; share: number }>): ContrastPair[] {
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
    if (tint) pairs.push({ fg: ink, ground: tint.expression, groundLabel: `the ${status} callout tint (${tint.share}%)` });
  }
  return pairs;
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
function measureScheme(scheme: Scheme, pairs: ContrastPair[], valuesIn: (state: Scheme['states'][number]['state']) => Map<string, string>): SchemeContrast {
  const rows: ContrastRow[] = [];
  for (const { state, label } of scheme.states) {
    const values = valuesIn(state);
    const lookup = (name: string) => values.get(name);
    for (const pair of pairs) {
      const base = { scheme: scheme.block.name, state: label, fg: pair.fg, ground: pair.groundLabel };
      const fg = resolveColor(`var(${pair.fg})`, lookup);
      if (!fg.ok) {
        rows.push({ ...base, pass: false, unmeasured: fg.reason });
        continue;
      }
      const ground = opaqueGround(pair, lookup);
      if ('reason' in ground) {
        rows.push({ ...base, pass: false, unmeasured: ground.reason });
        continue;
      }
      const { srgb, p3 } = dualGamutRatio(fg.color, ground.color);
      rows.push({ ...base, srgb, p3, pass: srgb >= CONTRAST_FLOOR && p3 >= CONTRAST_FLOOR });
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

/** A ratio as a finding prints it. */
function ratio(value: number | undefined): string {
  return `${(value ?? 0).toFixed(2)}:1`;
}

/** The findings of one scheme: one per failing foreground, and one per unmeasured reason. */
function schemeFindings(scheme: SchemeContrast, at: Pick<Finding, 'file' | 'line' | 'start' | 'end'>): Finding[] {
  const findings: Finding[] = [];
  const stateCount = scheme.states.length;
  const finding = (message: string): Finding => ({ ruleId: RULE_ID, tier: 'advisory', ...at, message });

  // Failing pairs, grouped by foreground, each ground once per distinct pair of ratios.
  const failing = new Map<string, Map<string, { row: ContrastRow; states: string[] }>>();
  for (const row of scheme.rows) {
    if (row.pass || row.unmeasured) continue;
    const byGround = failing.get(row.fg) ?? new Map<string, { row: ContrastRow; states: string[] }>();
    failing.set(row.fg, byGround);
    const key = `${row.ground}|${ratio(row.srgb)}|${ratio(row.p3)}`;
    const entry = byGround.get(key);
    if (entry) entry.states.push(row.state);
    else byGround.set(key, { row, states: [row.state] });
  }
  for (const [fg, byGround] of failing) {
    const parts = [...byGround.values()].map(({ row, states }) => {
      const where = states.length === stateCount ? '' : ` (${states.join(', ')})`;
      return `${fg} on ${row.ground} is ${ratio(row.srgb)} in sRGB and ${ratio(row.p3)} in display-p3${where}`;
    });
    findings.push(
      finding(`theme "${scheme.name}": below ${CONTRAST_FLOOR}:1: ${parts.join('; ')}. Darken or lighten the value this theme sets for it, or set a tuned value in this block`)
    );
  }

  // Unmeasured pairs, grouped by the reason the resolver gave.
  const unmeasured = new Map<string, Set<string>>();
  for (const row of scheme.rows) {
    if (!row.unmeasured) continue;
    const pairs = unmeasured.get(row.unmeasured) ?? new Set<string>();
    unmeasured.set(row.unmeasured, pairs);
    pairs.add(`${row.fg} on ${row.ground}`);
  }
  for (const [reason, pairs] of unmeasured) {
    findings.push(
      finding(
        `theme "${scheme.name}": unmeasured: ${reason}, so ${[...pairs].join(', ')} could not be measured. The resolver follows var() chains to a literal and evaluates color-mix(in oklab or in oklch, one operand with a percentage, one without); check a value in another form in the rendered audit`
      )
    );
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
    const measured = measureScheme(scheme, pairs, cascade.valuesIn);
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

/** A measurement as an aligned table: one row per pair per state, for a script's report. */
export function formatContrastTable(measurement: ContrastMeasurement): string {
  const rows = measurement.schemes.flatMap((scheme) => scheme.rows);
  const pairWidth = Math.max(4, ...rows.map((row) => `${row.fg} on ${row.ground}`.length));
  const stateWidth = Math.max(5, ...rows.map((row) => `${row.scheme} ${row.state}`.length));
  const head = `${'SCHEME'.padEnd(stateWidth)}  ${'PAIR'.padEnd(pairWidth)}  ${'sRGB'.padStart(7)}  ${'P3'.padStart(7)}  RESULT`;
  const body = rows.map((row) => {
    const result = row.unmeasured ? `UNMEASURED (${row.unmeasured})` : row.pass ? 'PASS' : 'FAIL';
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
