// cairn-cms: the status-ink and muted derivation measurement. It picks the share `N` in the derived
// status-ink default, `color-mix(in oklab, var(--color-<status>) N%, var(--color-base-content))`, and
// the share `M` in the opaque muted default, `color-mix(in oklab, var(--color-base-content) M%,
// var(--color-base-100))`, by reading Chromium's computed colors, never by evaluating the mix in JS.
//
// Population: daisyUI's stock themes (read from the installed package), Waymark's two daisyUI blocks
// with the ink overrides ignored, and the fixture theme's two blocks. Grounds: `base-100`,
// `base-200`, and the callout tint the chassis `prose.css` paints for the status (its highest tint
// percentage; `base-100` alone for a status with no tint). A pair passes at 4.5:1 in both sRGB and
// display-p3, the floor `check:public-tokens` measures, clamped the same way (it reuses the audit's
// contrast core, `dualGamutRatio` from src/lib/audit/contrast.ts, read from the packaged dist/audit).
//
// Selection, per status: keep the `N` values where Waymark and the fixture palette pass every pair in
// both schemes on every ground (the hard constraint), then keep those where the median ink-to-fill
// chroma ratio, across themes whose fill has OKLCH chroma of at least CHROMA_FLOOR_FILL, reaches
// CHROMA_FLOOR_RATIO (with CHROMA_TOLERANCE), then take the highest pass count and break ties toward
// the higher `N` (more hue). Muted has no chroma floor, and its pass count rises with `M` until it
// reaches base-content itself, so the pass count alone cannot choose it. Muted takes the lowest `M`
// that meets the hard constraint and whose themes-passing count is at least the highest count among
// the four chosen inks, so muted never fails more stock themes than the least-failing ink does. The
// inks accept their failures only because the chroma floor forces them to; muted has no such force
// and is body-size text, so its default stays as conservative as the best ink. When no value meets the hard constraint the script reports that and exits
// nonzero rather than choosing.
//
// Run from the repository root after `npm run package`: `node scripts/lab/measure-status-inks.mjs`. It prints the markdown
// tables the record embeds, and exits nonzero on a hard-constraint failure.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { parse, converter } from 'culori';
import { dualGamutRatio } from '../../dist/audit/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WAYMARK_CSS = join(ROOT, 'examples/showcase/src/theme/theme.css');
const FIXTURE_CSS = join(ROOT, 'scripts/lab/theme-fixture/theme.css');
const STOCK_DIR = join(ROOT, 'node_modules/daisyui/theme');

/** The floor `check:public-tokens` measures, per gamut. */
const AA = 4.5;
/** Fills below this OKLCH chroma are grey enough that "keeps its hue" has no meaning. */
const CHROMA_FLOOR_FILL = 0.05;
/** The median ink-to-fill chroma ratio a status ink must reach. */
const CHROMA_FLOOR_RATIO = 0.5;
/** Slack on the ratio, so a median of 0.4999 does not move the choice. */
const CHROMA_TOLERANCE = 0.005;
/** The shares measured, 0 to 100 in steps of 5. */
const SHARES = Array.from({ length: 21 }, (_, i) => i * 5);
const STATUSES = ['success', 'warning', 'error', 'info'];
/**
 * The highest callout tint percentage `prose.css` mixes into a status fill over `base-100`, read
 * off that file by hand: `.callout-note` and `.alert` carry info at 10 and 8, `.callout-tip` carries
 * success at 7, and `.callout-warning` and `.alert-caution` carry warning at 9. Error has no tint.
 */
const TINT = { success: 7, warning: 9, info: 10 };
const ROLE_KEYS = [
  'base-100',
  'base-200',
  'base-content',
  ...STATUSES,
];

const toOklch = converter('oklch');

/**
 * The `--color-*` declarations of one CSS block body, comments removed.
 * @param {string} body
 * @returns {Record<string, string>}
 */
function readRoles(body) {
  /** @type {Record<string, string>} */
  const out = {};
  const clean = body.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

/**
 * The daisyUI theme blocks of an authored theme file, by their `name:` option.
 * @param {string} css
 * @returns {Map<string, Record<string, string>>}
 */
function daisyBlocks(css) {
  /** @type {Map<string, Record<string, string>>} */
  const out = new Map();
  for (const m of css.matchAll(/@plugin\s+"daisyui\/theme"\s*\{([\s\S]*?)\n\}/g)) {
    const name = m[1].match(/name:\s*"([^"]+)"/)?.[1];
    if (name) out.set(name, readRoles(m[1]));
  }
  return out;
}

/**
 * The measured population: stock themes, Waymark's two blocks, and the fixture's two blocks.
 * @returns {{ id: string, group: 'stock' | 'waymark' | 'fixture', roles: Record<string, string> }[]}
 */
function population() {
  /** @type {{ id: string, group: 'stock' | 'waymark' | 'fixture', roles: Record<string, string> }[]} */
  const out = [];
  for (const file of readdirSync(STOCK_DIR).filter((f) => f.endsWith('.css')).sort()) {
    const id = file.replace(/\.css$/, '');
    const roles = readRoles(readFileSync(join(STOCK_DIR, file), 'utf8'));
    out.push({ id, group: 'stock', roles });
  }
  for (const [group, file] of /** @type {const} */ ([
    ['waymark', WAYMARK_CSS],
    ['fixture', FIXTURE_CSS],
  ])) {
    const blocks = daisyBlocks(readFileSync(file, 'utf8'));
    for (const [name, suffix] of [
      ['cairn', 'light'],
      ['cairn-dark', 'dark'],
    ]) {
      const roles = blocks.get(name);
      if (!roles) throw new Error(`${file} has no daisyUI block named ${name}`);
      out.push({ id: `${group}-${suffix}`, group, roles });
    }
  }
  for (const theme of out) {
    for (const key of ROLE_KEYS) {
      if (!theme.roles[key]) throw new Error(`${theme.id} lacks --color-${key}`);
    }
  }
  return out;
}

/**
 * Reads, in Chromium, every computed color the analysis needs for every theme. Each theme gets one
 * element carrying its role values as custom properties; each measurement is a probe child whose
 * `color` or `background-color` is the literal mix, so the browser evaluates it.
 * @param {import('playwright').Page} page
 * @param {ReturnType<typeof population>} themes
 * @returns {Promise<Record<string, Record<string, string>>>} theme id to measurement name to the computed color string
 */
async function readComputed(page, themes) {
  return page.evaluate(
    ({ themes, shares, statuses, tint }) => {
      /** @type {Record<string, Record<string, string>>} */
      const out = {};
      for (const theme of themes) {
        const host = document.createElement('div');
        for (const [key, value] of Object.entries(theme.roles)) {
          host.style.setProperty(`--color-${key}`, value);
        }
        document.body.append(host);
        const probe = document.createElement('span');
        host.append(probe);
        /** @param {'color' | 'backgroundColor'} property @param {string} value */
        const read = (property, value) => {
          probe.style.color = '';
          probe.style.backgroundColor = '';
          probe.style[property] = value;
          return getComputedStyle(probe)[property];
        };
        /** @type {Record<string, string>} */
        const values = {};
        for (const key of ['base-100', 'base-200', 'base-content', ...statuses]) {
          values[key] = read('color', `var(--color-${key})`);
        }
        for (const status of statuses) {
          if (tint[status] !== undefined) {
            values[`tint-${status}`] = read(
              'backgroundColor',
              `color-mix(in oklab, var(--color-${status}) ${tint[status]}%, var(--color-base-100))`,
            );
          }
          for (const n of shares) {
            values[`ink-${status}-${n}`] = read(
              'color',
              `color-mix(in oklab, var(--color-${status}) ${n}%, var(--color-base-content))`,
            );
          }
        }
        for (const m of shares) {
          values[`muted-${m}`] = read(
            'color',
            `color-mix(in oklab, var(--color-base-content) ${m}%, var(--color-base-100))`,
          );
        }
        out[theme.id] = values;
        host.remove();
      }
      return out;
    },
    { themes, shares: SHARES, statuses: STATUSES, tint: TINT },
  );
}

/**
 * The lowest of the two gamut ratios for a foreground over a background.
 * @param {string} fg
 * @param {string} bg
 * @returns {number}
 */
function floorRatio(fg, bg) {
  const { srgb, p3 } = dualGamutRatio(fg, bg);
  return Math.min(srgb, p3);
}

/**
 * The OKLCH chroma of a computed color string, at the precision the string carries.
 * @param {string} color
 * @returns {number}
 */
function chromaOf(color) {
  const parsed = parse(color);
  if (!parsed) throw new Error(`cannot parse ${color}`);
  return toOklch(parsed).c ?? 0;
}

/**
 * The median of a non-empty list.
 * @param {number[]} values
 * @returns {number}
 */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * One theme's grounds for a status ink: `base-100`, `base-200`, and the status tint when it has one.
 * @param {Record<string, string>} values
 * @param {string} status
 * @returns {{ name: string, color: string }[]}
 */
function inkGrounds(values, status) {
  const grounds = [
    { name: 'base-100', color: values['base-100'] },
    { name: 'base-200', color: values['base-200'] },
  ];
  if (values[`tint-${status}`]) grounds.push({ name: `tint-${TINT[status]}`, color: values[`tint-${status}`] });
  return grounds;
}

/**
 * Every theme's pass and fail for one status at one share.
 * @param {ReturnType<typeof population>} themes
 * @param {Record<string, Record<string, string>>} computed
 * @param {string} status
 * @param {number} n
 * @returns {{ id: string, group: string, failures: { ground: string, ratio: number }[], grounds: number }[]}
 */
function inkResults(themes, computed, status, n) {
  return themes.map((theme) => {
    const values = computed[theme.id];
    const ink = values[`ink-${status}-${n}`];
    const grounds = inkGrounds(values, status);
    const failures = grounds
      .map((g) => ({ ground: g.name, ratio: floorRatio(ink, g.color) }))
      .filter((g) => g.ratio < AA);
    return { id: theme.id, group: theme.group, failures, grounds: grounds.length };
  });
}

/**
 * Every theme's pass and fail for muted at one share.
 * @param {ReturnType<typeof population>} themes
 * @param {Record<string, Record<string, string>>} computed
 * @param {number} m
 * @returns {{ id: string, group: string, failures: { ground: string, ratio: number }[], grounds: number }[]}
 */
function mutedResults(themes, computed, m) {
  return themes.map((theme) => {
    const values = computed[theme.id];
    const muted = values[`muted-${m}`];
    const grounds = ['base-100', 'base-200'];
    const failures = grounds
      .map((name) => ({ ground: name, ratio: floorRatio(muted, values[name]) }))
      .filter((g) => g.ratio < AA);
    return { id: theme.id, group: theme.group, failures, grounds: grounds.length };
  });
}

/**
 * The tally of a share's results: themes passing every ground, pairs passing, and whether the hard
 * constraint (Waymark and the fixture, both schemes) holds.
 * @param {ReturnType<typeof inkResults>} results
 */
function tally(results) {
  const total = results.length;
  const themesPassing = results.filter((r) => r.failures.length === 0).length;
  const pairsTotal = results.reduce((sum, r) => sum + r.grounds, 0);
  const pairsPassing = results.reduce((sum, r) => sum + r.grounds - r.failures.length, 0);
  const hardFailures = results.filter((r) => r.group !== 'stock' && r.failures.length > 0);
  return { total, themesPassing, pairsTotal, pairsPassing, hardFailures, hard: hardFailures.length === 0 };
}

/**
 * The median ink-to-fill chroma ratio across themes whose fill is chromatic enough.
 * @param {ReturnType<typeof population>} themes
 * @param {Record<string, Record<string, string>>} computed
 * @param {string} status
 * @param {number} n
 * @param {(theme: { group: string }) => boolean} include
 * @returns {{ median: number, count: number }}
 */
function chromaRatio(themes, computed, status, n, include) {
  const ratios = [];
  for (const theme of themes.filter(include)) {
    const fill = chromaOf(computed[theme.id][status]);
    if (fill < CHROMA_FLOOR_FILL) continue;
    ratios.push(chromaOf(computed[theme.id][`ink-${status}-${n}`]) / fill);
  }
  return { median: median(ratios), count: ratios.length };
}

/**
 * Applies the selection rule to a status's table.
 * @param {{ n: number, themesPassing: number, hard: boolean, chromaOk: boolean }[]} rows
 * @returns {number | null} the chosen share, or null when none satisfies the constraints
 */
function select(rows) {
  const eligible = rows.filter((r) => r.hard && r.chromaOk);
  if (eligible.length === 0) return null;
  const best = Math.max(...eligible.map((r) => r.themesPassing));
  const tied = eligible.filter((r) => r.themesPassing === best).map((r) => r.n);
  return Math.max(...tied);
}

/**
 * Applies the muted rule: the lowest share that meets the hard constraint and passes at least as
 * many themes as the best chosen ink.
 * @param {{ n: number, themesPassing: number, hard: boolean }[]} rows
 * @param {number} passFloor
 * @returns {number | null} the chosen share, or null when none satisfies the constraints
 */
function selectMuted(rows, passFloor) {
  const eligible = rows.filter((r) => r.hard && r.themesPassing >= passFloor);
  return eligible.length === 0 ? null : Math.min(...eligible.map((r) => r.n));
}

/**
 * The chroma-floor cell of one table row: exempt when the row has no ratio.
 * @param {{ ratio?: number, chromaOk: boolean }} r
 * @returns {string}
 */
function chromaFloorCell(r) {
  if (r.ratio === undefined) return 'exempt';
  return r.chromaOk ? 'met' : 'below';
}

/**
 * Formats one status's or muted's table as markdown.
 * @param {string} title
 * @param {{ n: number, themesPassing: number, total: number, pairsPassing: number, pairsTotal: number, hard: boolean, ratio?: number, chromaOk: boolean }[]} rows
 * @param {number | null} chosen
 * @param {string} shareName
 * @returns {string}
 */
function table(title, rows, chosen, shareName) {
  const lines = [
    `#### ${title}`,
    '',
    `| ${shareName} | themes passing | pairs passing | hard constraint | median chroma ratio | chroma floor |`,
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const r of rows) {
    const mark = r.n === chosen ? ' **(chosen)**' : '';
    lines.push(
      `| ${r.n}${mark} | ${r.themesPassing}/${r.total} | ${r.pairsPassing}/${r.pairsTotal} | ${r.hard ? 'met' : 'fails'} | ${
        r.ratio === undefined ? 'exempt' : r.ratio.toFixed(3)
      } | ${chromaFloorCell(r)} |`,
    );
  }
  return lines.join('\n');
}

/**
 * Formats the failing themes and grounds at a chosen share.
 * @param {ReturnType<typeof inkResults>} results
 * @returns {string}
 */
function failureList(results) {
  const failing = results.filter((r) => r.failures.length > 0);
  if (failing.length === 0) return '- none';
  return failing
    .map(
      (r) =>
        `- ${r.id} (${r.group}): ${r.failures.map((f) => `${f.ground} ${f.ratio.toFixed(3)}`).join(', ')}`,
    )
    .join('\n');
}

const themes = population();
const browser = await chromium.launch();
let computed;
try {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  computed = await readComputed(page, themes);
} finally {
  await browser.close();
}

const out = [];
out.push(`Population: ${themes.filter((t) => t.group === 'stock').length} stock themes, Waymark light and dark (inks stripped), fixture light and dark.`);
out.push('');
let hardFailed = false;
/** @type {Record<string, number | null>} */
const chosenInk = {};
const failureSections = [];
for (const status of STATUSES) {
  const rows = SHARES.map((n) => {
    const results = inkResults(themes, computed, status, n);
    const t = tally(results);
    const ratio = chromaRatio(themes, computed, status, n, () => true).median;
    return {
      n,
      themesPassing: t.themesPassing,
      total: t.total,
      pairsPassing: t.pairsPassing,
      pairsTotal: t.pairsTotal,
      hard: t.hard,
      ratio,
      chromaOk: ratio >= CHROMA_FLOOR_RATIO - CHROMA_TOLERANCE,
    };
  });
  const chosen = select(rows);
  chosenInk[status] = chosen;
  if (rows.every((r) => !r.hard)) hardFailed = true;
  if (chosen === null) hardFailed = true;
  out.push(table(`${status} ink`, rows, chosen, 'N'));
  out.push('');
  const stockOnly = chromaRatio(themes, computed, status, chosen ?? 50, (t) => t.group !== 'fixture');
  out.push(
    `Chroma check at the chosen N: median ratio ${
      chosen === null ? 'n/a' : rows.find((r) => r.n === chosen)?.ratio.toFixed(3)
    } across ${chromaRatio(themes, computed, status, chosen ?? 50, () => true).count} chromatic-fill themes (${stockOnly.median.toFixed(3)} over stock plus Waymark only).`,
  );
  out.push('');
  if (chosen !== null) {
    failureSections.push(`##### ${status} ink at N=${chosen}: failing themes and grounds`);
    failureSections.push('');
    failureSections.push(failureList(inkResults(themes, computed, status, chosen)));
    failureSections.push('');
  }
}

const mutedRows = SHARES.map((m) => {
  const t = tally(mutedResults(themes, computed, m));
  return {
    n: m,
    themesPassing: t.themesPassing,
    total: t.total,
    pairsPassing: t.pairsPassing,
    pairsTotal: t.pairsTotal,
    hard: t.hard,
    chromaOk: true,
  };
});
/** The highest themes-passing count among the four chosen inks, the bar muted must clear. */
const bestInkPassCount = Math.max(
  ...STATUSES.map((status) => {
    const n = chosenInk[status];
    return n === null ? 0 : tally(inkResults(themes, computed, status, n)).themesPassing;
  }),
);
const chosenMuted = selectMuted(mutedRows, bestInkPassCount);
if (chosenMuted === null) hardFailed = true;
out.push(table('muted', mutedRows, chosenMuted, 'M'));
out.push('');
if (chosenMuted !== null) {
  failureSections.push(`##### muted at M=${chosenMuted}: failing themes and grounds`);
  failureSections.push('');
  failureSections.push(failureList(mutedResults(themes, computed, chosenMuted)));
  failureSections.push('');
}

out.push('#### Chosen values');
out.push('');
out.push(
  STATUSES.map((s) => `- ${s} ink: N=${chosenInk[s] ?? 'none satisfies the hard constraint'}`).join('\n'),
);
out.push(`- muted: M=${chosenMuted ?? 'none satisfies the hard constraint'}`);
out.push('');
out.push('#### Failing themes and grounds at the chosen values');
out.push('');
out.push(...failureSections);
/**
 * The lowest gamut ratio of each pair the hard constraint covers, for the four themes it names, at
 * the chosen shares, so the record shows the margin and not only the verdict.
 * @returns {string}
 */
function hardMargins() {
  const rows = [
    '| theme | ' + [...STATUSES.map((s) => `${s} ink`), 'muted'].join(' | ') + ' |',
    '| --- | ' + [...STATUSES, 'muted'].map(() => '---').join(' | ') + ' |',
  ];
  for (const theme of themes.filter((t) => t.group !== 'stock')) {
    const values = computed[theme.id];
    const cells = STATUSES.map((status) => {
      const n = chosenInk[status];
      if (n === null) return 'n/a';
      const ink = values[`ink-${status}-${n}`];
      const low = inkGrounds(values, status).map((g) => ({ ground: g.name, ratio: floorRatio(ink, g.color) }));
      const worst = low.reduce((a, b) => (b.ratio < a.ratio ? b : a));
      return `${worst.ratio.toFixed(2)} (${worst.ground})`;
    });
    if (chosenMuted === null) cells.push('n/a');
    else {
      const muted = values[`muted-${chosenMuted}`];
      const low = ['base-100', 'base-200'].map((name) => ({ ground: name, ratio: floorRatio(muted, values[name]) }));
      const worst = low.reduce((a, b) => (b.ratio < a.ratio ? b : a));
      cells.push(`${worst.ratio.toFixed(2)} (${worst.ground})`);
    }
    rows.push(`| ${theme.id} | ${cells.join(' | ')} |`);
  }
  return rows.join('\n');
}

out.push('#### The hard constraint at the chosen values');
out.push('');
out.push('The lowest ratio (either gamut, worst ground) for each pair set; every cell must be at least 4.5.');
out.push('');
out.push(hardMargins());
out.push('');
console.log(out.join('\n'));

if (hardFailed) {
  console.error('No value meets the hard constraint for at least one status or muted; not choosing.');
  process.exit(1);
}
