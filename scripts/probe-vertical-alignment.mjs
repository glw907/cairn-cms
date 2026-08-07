#!/usr/bin/env node
// cairn-cms: the vertical-alignment inventory probe. It renders BOTH of the pass's corpora against
// a running showcase preview, measures every candidate row pair through the shared measurement
// module, and writes docs/internal/2026-08-vertical-alignment-inventory.md plus one screenshot crop
// per reported row.
//
// IT MEASURES NOTHING ITSELF. Every number here comes from
// src/lib/audit/rules/rendered/vertical-metrics.ts (through its packaged dist build), the same
// module the rendered `vertical-alignment` rule imports. The three measurement traps and the
// metric-by-class split are encoded there once; this file is the renderer, the walker, and the
// report. A geometry helper appearing in this file would be the start of the drift the split
// exists to prevent.
//
// SELF-CALIBRATION IS BLOCKING. Before either corpus is touched, the probe renders the module's two
// synthetic calibration fixtures and checks that it recovers the expected sign AND magnitude on
// both. A miss refuses to emit and exits non-zero, naming the fixture and the reading. This is the
// guard against the failure the design spec names: an earlier probe got the measurement wrong
// twice, and the middle version reported "this row is fine" on a row whose icons visibly rode high.
// A method that cannot reproduce a known defect has no standing to report a screen clean.
//
// WHY A STANDALONE SCRIPT RATHER THAN `runRendered`. The rendered rule that graduates the firing
// half of this measurement does drive the engine's own runner. This sweep needs three things that
// runner's page x theme x state loop does not express: a per-corpus width sweep (the runner owns
// one viewport per visit), a screenshot crop per row (a RenderedFinding carries a selector and a
// message, not an artifact), and the full numeric record of every measured pair, including the
// sub-bar population the noise floor is derived from.
//
// WHY THE CROPS ARE NOT COMMITTED. They are evidence for one reading of one build, they are large,
// and they go stale the moment a recipe lands. They are written outside the repo and referenced by
// absolute path; CAIRN_VERTICAL_CROP_DIR moves them.
//
// This is a LIVE probe: it needs the showcase preview already answering, and it starts nothing.
// From the repo root:
//   npm run package
//   cd examples/showcase && VITE_CAIRN_E2E=1 npm run build
//   CAIRN_DEV_BACKEND=1 npm run preview -- --port 4173
//   node scripts/probe-vertical-alignment.mjs
// BASE_URL overrides the default http://localhost:4173.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  DEFAULT_ROW_ITEM_MAX_HEIGHT_PX,
  VERTICAL_CALIBRATION_FIXTURES,
  VERTICAL_REPORTING_BAR_PX,
  calibrationMiss,
  measureVerticalMetrics,
} from '../dist/audit/rules/rendered/vertical-metrics.js';
import { repoRoot } from './repo-root.mjs';
import { walk } from './walk-files.mjs';

/** @typedef {import('../src/lib/audit/rules/rendered/vertical-metrics.js').MeasuredPair} MeasuredPair */
/** @typedef {import('../src/lib/audit/rules/rendered/vertical-metrics.js').VerticalCalibrationFixture} Fixture */

const ROOT = repoRoot(import.meta.url);
const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
const DOC_PATH = resolve(ROOT, 'docs/internal/2026-08-vertical-alignment-inventory.md');

/**
 * Where the crops and the full per-pair record land. Outside the repo by default and stable across
 * runs, so the absolute paths this doc prints mean the same thing to whoever re-runs the probe.
 */
const ARTIFACT_DIR = process.env.CAIRN_VERTICAL_CROP_DIR || resolve(tmpdir(), 'cairn-vertical-alignment');

/** The admin visual suite, the file the admin corpus's routes are derived from rather than retyped. */
const ADMIN_VISUAL_SPEC = 'examples/showcase/e2e/admin-visual.spec.ts';

/**
 * Admin widths: the two the visual suite already pins, plus the phone width the family's responsive
 * standard adds. Public widths: the family's five-viewport bar in full.
 */
const ADMIN_WIDTHS = [1440, 768, 390];
const PUBLIC_WIDTHS = [320, 390, 768, 1440, 2560];

/**
 * The admin's theme is chosen SERVER-side from the `cairn-admin-theme` cookie, so the cookie is the
 * lever and `colorScheme` only keeps the client-side media-query CSS in step with the SSR choice.
 * The public site has no such cookie by default and resolves through `prefers-color-scheme`, which
 * is why the two corpora carry different theme machinery.
 */
const ADMIN_THEMES = [
  { id: 'light', cookie: 'cairn-admin', colorScheme: 'light' },
  { id: 'dark', cookie: 'cairn-admin-dark', colorScheme: 'dark' },
];
const PUBLIC_THEMES = [
  { id: 'light', cookie: null, colorScheme: 'light' },
  { id: 'dark', cookie: null, colorScheme: 'dark' },
];

/**
 * Admin routes the design spec's corpus names that the visual suite never navigates to, so no
 * derivation can reach them. Listed rather than derived, and marked as such in the report.
 */
const ADMIN_SPEC_ONLY_ROUTES = ['/admin/pages', '/admin/settings'];

/** The public corpus: the site chrome, the representative rich article, and the styleguide. */
const PUBLIC_SCREENS = [
  { id: 'site-home', path: '/', state: 'rest', note: 'the (site) chrome: masthead, nav, lead, footer' },
  {
    id: 'site-article',
    path: '/posts/the-reading-surface',
    state: 'rest',
    note: 'the representative article: directives, callouts, figures, a table, and code',
  },
  { id: 'styleguide', path: '/styleguide', state: 'rest', note: 'every public recipe, by design' },
];

/** The three traps, verbatim from the ratified design spec. The next probe author reads them here. */
const TRAPS = [
  '**Pair with the line, not the block.** An icon beside a multi-line text block aligns with the ' +
    "block's FIRST LINE BOX, not the block. Comparing against the whole block reported 29 to 68px " +
    'of phantom delta on rows that were correctly composed.',
  '**Read type metrics off the element that renders the line.** Reading font metrics from the text ' +
    'CONTAINER rather than the rendering element returned -0.4px ("this row is fine") on the row ' +
    'whose icons visibly ride high. Resolve the metrics from the computed style of the element that ' +
    'owns the line box.',
  '**Measure ink, not element boxes.** An SVG\'s element box centres while its drawn ink rides ' +
    'high. Icon geometry is the ink bounds: `getBBox()` mapped through the screen CTM. Text ' +
    'geometry is the glyph box: `getClientRects()` on a `Range`, with cap-centre for title-class ' +
    'comparisons. Element boxes are acceptable ONLY for controls whose border box is the visual ' +
    'object.',
];

/** States a rendered sweep structurally cannot reach, listed so the zero-rows claim stays honest. */
const UNRENDERED_STATES = [
  ['hover', 'no pointer is over any element in a headless sweep, so no `:hover` row is composed here'],
  [
    'focus / focus-visible',
    'nothing is tabbed to, so a focus ring (which can change a border width and therefore a border-box centre) is never on screen',
  ],
  [
    'validation / error',
    'no form is submitted, so no error line renders below a control; this is exactly the shape the FieldRow caveat names, and it is unmeasured here',
  ],
  ['loading / pending', 'no in-flight action is held open, so spinner and skeleton rows are unmeasured'],
];

/**
 * Whether `url` answers with anything short of a server error. A 404 still means something is
 * listening, which is all this needs before opening a browser at it.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function isReachable(url) {
  try {
    const res = await fetch(url);
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * The admin routes the visual suite navigates to, in its own order. Derived rather than retyped, so
 * a route added to the suite joins this inventory without an edit here.
 * @returns {string[]}
 */
function adminRoutesFromVisualSuite() {
  const text = readFileSync(resolve(ROOT, ADMIN_VISUAL_SPEC), 'utf8');
  const routes = [...text.matchAll(/page\.goto\('([^']+)'\)/g)]
    .map((match) => match[1])
    .filter((path) => path.startsWith('/admin'));
  if (routes.length === 0) {
    throw new Error(
      `${ADMIN_VISUAL_SPEC} yielded no /admin route: the derivation this corpus rests on has broken, ` +
        'and measuring a silently shorter page list is the failure this check exists to prevent.'
    );
  }
  return [...new Set(routes)];
}

/**
 * The admin corpus: every route the visual suite renders at rest, the routes the design spec names
 * that the suite does not reach, and the interaction states the spec calls for on top.
 * @returns {{ id: string, path: string, state: string, note: string }[]}
 */
function adminCorpus() {
  const derived = adminRoutesFromVisualSuite();
  const editPath = derived.find((path) => /^\/admin\/posts\/[^/]+$/.test(path));
  const mediaPath = derived.find((path) => path === '/admin/media');
  const officePath = derived.find((path) => path === '/admin/posts') ?? derived[0];

  const screenId = (path) => slug(path);
  const screens = derived.map((path) => ({
    id: screenId(path),
    path,
    state: 'rest',
    note: `derived from ${ADMIN_VISUAL_SPEC}`,
  }));
  for (const path of ADMIN_SPEC_ONLY_ROUTES) {
    if (derived.includes(path)) continue;
    screens.push({
      id: screenId(path),
      path,
      state: 'rest',
      note: 'named by the design spec corpus; the visual suite does not navigate here',
    });
  }
  if (editPath) {
    screens.push({
      id: 'admin-edit-details-open',
      path: editPath,
      state: 'details-open',
      note: 'the edit desk with the Details disclosure expanded',
    });
  }
  if (mediaPath) {
    screens.push({
      id: 'admin-media-detail',
      path: mediaPath,
      state: 'media-detail',
      note: 'the media slide-over detail panel',
    });
  }
  screens.push(
    { id: 'admin-palette-open', path: officePath, state: 'palette-open', note: 'the command palette, open' },
    { id: 'admin-dialog-open', path: officePath, state: 'dialog-open', note: 'the first dialog trigger, open' },
    { id: 'admin-menu-open', path: officePath, state: 'menu-open', note: 'the first menu trigger, open' }
  );
  return screens;
}

/**
 * Put `page` into `state`, returning whether the state was reached. An unreached state is recorded
 * in the report rather than treated as a clean render: a row nobody looked at is not a row nobody
 * found a defect on.
 * @param {import('playwright').Page} page
 * @param {string} state
 * @returns {Promise<boolean>}
 */
async function applyState(page, state) {
  if (state === 'rest') return true;
  if (state === 'details-open') {
    const toggle = page.getByRole('button', { name: /details/i }).first();
    if ((await toggle.count()) === 0 || !(await toggle.isVisible())) return false;
    await toggle.click();
    await page.waitForTimeout(400);
    return true;
  }
  if (state === 'media-detail') {
    const tile = page.getByRole('option').first();
    if ((await tile.count()) === 0 || !(await tile.isVisible())) return false;
    await tile.click();
    await page.waitForTimeout(400);
    return true;
  }
  if (state === 'palette-open') {
    // The palette opens on the same shortcut a keyboard user reaches for, which is the only
    // affordance that exists at every admin width; the trigger button itself is width-conditional.
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(400);
    return (await page.locator('dialog[open]').count()) > 0;
  }
  if (state === 'dialog-open' || state === 'menu-open') {
    // The engine's own definition of an open popup (rendered.ts's `applyState`), split by trigger
    // kind so the spec's "dialogs" and "one open-menu state" are two readings rather than whichever
    // one happened to come first in the DOM.
    const selector =
      state === 'dialog-open'
        ? '[aria-haspopup="dialog"]'
        : '[aria-haspopup="menu"], [aria-haspopup="listbox"], [aria-haspopup="true"]';
    const opened = await page.evaluate((popupSelector) => {
      const triggers = Array.from(document.querySelectorAll(popupSelector)).filter((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      });
      if (triggers.length === 0) return false;
      triggers[0].click();
      return true;
    }, selector);
    if (!opened) return false;
    await page.waitForTimeout(400);
    return true;
  }
  throw new Error(`unknown interaction state "${state}"`);
}

/**
 * Open one screen at one width under one theme, settled enough to measure: fonts resolved, the
 * network drained, and two frames painted. A metric read against a fallback face or a half-streamed
 * DOM is a number no later run reproduces.
 * @param {import('playwright').Browser} browser
 * @param {{ path: string }} screen
 * @param {{ colorScheme: string, cookie: string | null }} theme
 * @param {number} width
 * @returns {Promise<{ context: import('playwright').BrowserContext, page: import('playwright').Page }>}
 */
async function openScreen(browser, screen, theme, width) {
  const context = await browser.newContext({
    colorScheme: /** @type {'light' | 'dark'} */ (theme.colorScheme),
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
  });
  if (theme.cookie) {
    await context.addCookies([{ name: 'cairn-admin-theme', value: theme.cookie, url: BASE_URL }]);
  }
  const page = await context.newPage();
  const response = await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'load', timeout: 45_000 });
  const status = response?.status();
  if (status === undefined || status < 200 || status >= 300) {
    await context.close();
    throw new Error(`${screen.path}: rendered ${status ?? 'no response'} (expected 2xx) at ${width}px`);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  return { context, page };
}

/**
 * Render both calibration fixtures and check that the pipeline recovers each one's expected sign and
 * magnitude. Returns a line per fixture for the report, or throws naming the fixture and the reading.
 * @param {import('playwright').Browser} browser
 * @returns {Promise<string[]>}
 */
async function calibrate(browser) {
  const lines = [];
  for (const fixture of VERTICAL_CALIBRATION_FIXTURES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage();
      await page.setContent(`<!doctype html><html><body>${fixture.html}</body></html>`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const { pairs } = await measureVerticalMetrics(page);
      const miss = calibrationMiss(fixture, pairs);
      const reading = bestCalibrationReading(fixture, pairs);
      const expected =
        `expected sign ${fixture.expectedSign > 0 ? '+' : '-'}, magnitude ` +
        `${fixture.minMagnitudePx} to ${fixture.maxMagnitudePx}px`;
      if (miss) {
        throw new Error(
          `calibration MISSED on "${fixture.id}" (${expected}). ${miss}\n` +
            'Refusing to emit: a method that cannot reproduce a known defect has no standing to ' +
            'report a screen clean.'
        );
      }
      lines.push(
        `- \`${fixture.id}\` (${fixture.pairClass}): ${expected}; measured ` +
          `${reading ? reading.deltaPx : 'nothing'}px. PASS.`
      );
    } finally {
      await context.close();
    }
  }
  return lines;
}

/**
 * The pair a fixture's calibration verdict is taken on: the largest-magnitude pair of the fixture's
 * own class inside the fixture's own row, which is the same selection `calibrationMiss` makes.
 * @param {Fixture} fixture
 * @param {MeasuredPair[]} pairs
 * @returns {MeasuredPair | null}
 */
function bestCalibrationReading(fixture, pairs) {
  const candidates = pairs.filter(
    (pair) => pair.pairClass === fixture.pairClass && pair.rowClasses.split(/\s+/).includes(fixture.rowClass)
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, next) => (next.magnitudePx > best.magnitudePx ? next : best));
}

/** Every `.svelte` file a rendered row could have come from, read once for class attribution. */
function sourceIndex() {
  const entries = [];
  for (const dir of ['src/lib', 'examples/showcase/src']) {
    const base = resolve(ROOT, dir);
    for (const file of walk(base, (name) => name.endsWith('.svelte'))) {
      entries.push({ file: relative(ROOT, file), text: readFileSync(file, 'utf8') });
    }
  }
  return entries;
}

/**
 * The source file a row most likely came from, by matching the longest run of CONSECUTIVE class
 * tokens the element carries. A Tailwind-authored component writes its class list as one literal,
 * so a run of three or more consecutive tokens is a checkable signal; nothing shorter is claimed.
 * @param {{ file: string, text: string }[]} index
 * @param {string[]} classStrings
 * @returns {{ file: string, run: string } | null}
 */
function attribute(index, classStrings) {
  for (const classes of classStrings) {
    const tokens = classes.split(/\s+/).filter((token) => token && !token.startsWith('svelte-'));
    for (let length = Math.min(tokens.length, 8); length >= 3; length -= 1) {
      for (let start = 0; start + length <= tokens.length; start += 1) {
        const run = tokens.slice(start, start + length).join(' ');
        const hit = index.find((entry) => entry.text.includes(run));
        if (hit) return { file: hit.file, run };
      }
    }
  }
  return null;
}

/**
 * The composition shape a row belongs to. The disposition is taken per shape rather than per row:
 * a recipe fixes a shape, so a row's shape is what decides which task owns it.
 * @param {MeasuredPair} pair
 * @returns {string}
 */
function shapeOf(pair) {
  if (pair.pairClass === 'optical-suspect') return 'optical-suspect';
  if (pair.a.stacked || pair.b.stacked) return 'stacked-field row';
  if (pair.a.kind === 'icon' || pair.b.kind === 'icon') return 'icon beside text';
  if (pair.pairClass === 'text-beside-text') return 'text beside text';
  if (pair.rowKind === 'table-row') return 'control in a table cell';
  return 'control beside text';
}

/**
 * Whether a row's reading rests on a marked element-box fallback rather than on ink. Such a row is
 * declined rather than dispositioned to a recipe task: the number is real, but it cannot see ink
 * riding high inside the box it measured, so it is not evidence a recipe should act on.
 * @param {MeasuredPair} pair
 * @returns {boolean}
 */
function restsOnElementBoxFallback(pair) {
  return [pair.a, pair.b].some((anchor) => anchor.kind === 'icon' && anchor.geometry === 'element-box');
}

/**
 * The compositions a human read a crop of and ruled on, keyed by {@link keyDigest} of the row's own
 * identity. This table is the pass's JUDGMENT, and it is here rather than in the emitted doc because
 * the probe overwrites that doc on every run: a ruling kept in the output would be erased by the
 * re-run that is supposed to verify it.
 *
 * A DECLINE is a composition the measurement reports correctly and a recipe should nonetheless
 * leave alone. Every one of them is the same underlying disagreement, stated per row: the module
 * pairs a member with the text block's FIRST LINE (trap 1, which is what makes a leading icon
 * measurable at all), while these compositions deliberately centre a trailing action or a decorative
 * glyph on the WHOLE block. Nothing in the geometry can tell those apart, which is exactly why the
 * ruling is a reviewed list and not another rule.
 *
 * A row whose key is absent takes its shape's default, so a composition that appears after a recipe
 * lands is still dispositioned rather than reported unknown.
 */
const TRAILING_ACTION_DECLINE =
  'DECLINE: a trailing action centred on the whole block it acts on, which is the correct ' +
  'composition for this row. The reading is trap 1 doing its job (the control is paired with the ' +
  "block's first line); no recipe should move it.";
const OPTICAL_MULTI_LINE_DECLINE =
  'DECLINE: the optical reading is taken on a MULTI-LINE paragraph, so the glyph is the first ' +
  "line's cap centre while the padding box spans every line. Half a line of offset is arithmetic, " +
  'not an optical defect. Input to task 4: scope the optical metric to a single-line glyph.';
const CHIP_NOT_COPY_DECLINE =
  'DECLINE: the right-hand member is a CHIP, a padded box optically centred against the line, not ' +
  'a run of copy sharing its baseline, so the baseline metric is the wrong reading for it. Input ' +
  'to task 4: a chip beside a run of text is not a text-beside-text pair.';

const REVIEWED_DISPOSITIONS = {
  '3cf1e40a':
    'DECLINE: the row declares `items-end` and bottom-aligns a trailing action against a ' +
    'multi-line heading block on purpose. Measured against the block first line by convention.',
  '0fcf96df':
    'DECLINE: a monogram avatar centred against the identity block beside it. The monogram is a ' +
    'glyph inside a decorative circle, not a run of copy sharing the name line baseline.',
  d302f1be:
    'DECLINE: the delete control spans both grid rows of the tag entry and centres on the pair, ' +
    'which is why it reads high against the input on the first row alone.',
  '21db619c': TRAILING_ACTION_DECLINE,
  d3c42eb8: TRAILING_ACTION_DECLINE,
  cd9aaff2: TRAILING_ACTION_DECLINE,
  '1a77b8c1': TRAILING_ACTION_DECLINE,
  '8d2ca62d': TRAILING_ACTION_DECLINE,
  '925d0196': TRAILING_ACTION_DECLINE,
  edee3887: TRAILING_ACTION_DECLINE,
  '4fa6315e': TRAILING_ACTION_DECLINE,
  e4b61409: TRAILING_ACTION_DECLINE,
  '81f6d9a1': TRAILING_ACTION_DECLINE,
  f0c5cd3b: TRAILING_ACTION_DECLINE,
  fb82873f: TRAILING_ACTION_DECLINE,
  '59c31af6': TRAILING_ACTION_DECLINE,
  '87d0cd4a': OPTICAL_MULTI_LINE_DECLINE,
  '48eafe60': OPTICAL_MULTI_LINE_DECLINE,
  '17caed5b': OPTICAL_MULTI_LINE_DECLINE,
  '169c7ca8': CHIP_NOT_COPY_DECLINE,
  dcd99e37: CHIP_NOT_COPY_DECLINE,
};

/**
 * The disposition for one row: the reviewed ruling if it has one, otherwise the recipe task that
 * owns its shape, otherwise an explicit decline with the reason. Every branch returns one of those,
 * which is what keeps "unknown" off the report.
 * @param {{ surface: string, pair: MeasuredPair, shape: string, key: string }} row
 * @returns {string}
 */
function disposition(row) {
  const { surface, pair, shape, key } = row;
  const reviewed = REVIEWED_DISPOSITIONS[keyDigest(key)];
  if (reviewed) return reviewed;
  const task = surface === 'admin' ? 'task 2 (admin toolkit)' : 'task 3 (Waymark chassis)';
  if (restsOnElementBoxFallback(pair)) {
    return (
      'DECLINE: the icon member carries no reachable painting geometry, so this reading is the ' +
      'marked element-box fallback, not ink. Not evidence a recipe should act on.'
    );
  }
  switch (shape) {
    case 'stacked-field row':
      return `${task}: compose with FieldRow / items-end; the control drops by the label band.`;
    case 'optical-suspect':
      return `${task}: text-box trim-both on the label-like recipe carrying this glyph.`;
    case 'icon beside text':
      return `${task}: the icon-beside-text row mechanic (pair the ink centre to the line's cap centre).`;
    case 'control beside text':
      return `${task}: centre the control against the line it sits beside, not against the block.`;
    case 'control in a table cell':
      return `${task}: the table-row cell treatment for a control beside its cell's text.`;
    case 'text beside text':
      return `${task}: the two runs share a row but not a baseline; set them on one baseline.`;
    default:
      throw new Error(`no disposition rule for shape "${shape}"`);
  }
}

/**
 * A row's identity: the same container, the same two members, measured the same way. The SCREEN is
 * deliberately not part of it, so a chrome row that renders on eleven screens at three widths in two
 * themes is one composition carrying every place it was seen, not sixty-six rows. The inventory
 * sizes recipe work, and a recipe fixes a composition once.
 * @param {MeasuredPair} pair
 * @returns {string}
 */
function rowKey(pair) {
  return [pair.rowSelector, pair.a.selector, pair.a.text, pair.b.selector, pair.b.text, pair.metric].join('|');
}

/** A short stable name for `key`, so two rows sharing a selector cannot overwrite each other's crop. */
function keyDigest(key) {
  return createHash('sha256').update(key).digest('hex').slice(0, 8);
}

/**
 * @param {string} value
 * @returns {string}
 */
function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

/**
 * @param {number[]} values
 * @param {number} fraction
 * @returns {number}
 */
function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

/**
 * @param {number} value
 * @returns {number}
 */
function round(value) {
  return Math.round(value * 100) / 100;
}

/** A markdown table cell: the pipe is the one character that would break the row. */
function cell(value) {
  return String(value).replace(/\|/g, '\\|');
}

/**
 * Measure one render and fold it into the run's accumulators.
 * @param {object} args
 * @returns {Promise<void>}
 */
async function measureRender(args) {
  const { page, surface, screen, theme, width, run, index } = args;
  const { pairs, diagnostics } = await measureVerticalMetrics(page);
  run.renders += 1;
  for (const [key, value] of Object.entries(diagnostics)) {
    run.diagnostics[key] = (run.diagnostics[key] ?? 0) + value;
  }

  // Repeatability: one page measured twice in the same session, so the noise floor rests on
  // observed jitter rather than on an assumption about it.
  if (run.repeatability.length === 0) {
    const second = await measureVerticalMetrics(page);
    const first = new Map(pairs.map((pair) => [rowKey(pair), pair.deltaPx]));
    for (const pair of second.pairs) {
      const before = first.get(rowKey(pair));
      if (before !== undefined) run.repeatability.push(round(Math.abs(before - pair.deltaPx)));
    }
  }

  for (const pair of pairs) {
    run.measured += 1;
    run.magnitudes.push(pair.magnitudePx);
    run.record.push({
      surface,
      screen: screen.id,
      path: screen.path,
      state: screen.state,
      width,
      theme: theme.id,
      pairClass: pair.pairClass,
      metric: pair.metric,
      deltaPx: pair.deltaPx,
      rowSelector: pair.rowSelector,
      rowClasses: pair.rowClasses,
      a: pair.a.selector,
      b: pair.b.selector,
    });
    if (pair.magnitudePx <= VERTICAL_REPORTING_BAR_PX) continue;

    const key = rowKey(pair);
    const existing = run.rows.get(key);
    if (existing) {
      existing.screens.add(screen.id);
      existing.widths.add(width);
      existing.themes.add(theme.id);
      existing.minDelta = Math.min(existing.minDelta, pair.deltaPx);
      existing.maxDelta = Math.max(existing.maxDelta, pair.deltaPx);
      continue;
    }
    const shape = shapeOf(pair);
    const row = {
      key,
      surface,
      screen,
      pair,
      shape,
      screens: new Set([screen.id]),
      widths: new Set([width]),
      themes: new Set([theme.id]),
      minDelta: pair.deltaPx,
      maxDelta: pair.deltaPx,
      attribution: attribute(index, [pair.a.classes, pair.b.classes, pair.rowClasses]),
      crop: null,
    };
    row.disposition = disposition({ surface, pair, shape, key });
    run.rows.set(key, row);

    const name = `${keyDigest(key)}-${slug(`${screen.id}-${pair.a.text || pair.b.text || pair.a.selector}`)}-${width}.png`;
    const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    try {
      await page.screenshot({
        path: resolve(ARTIFACT_DIR, 'crops', name),
        fullPage: true,
        clip: {
          x: Math.max(0, pair.rowBox.leftPx + scroll.x - 12),
          y: Math.max(0, pair.rowBox.topPx + scroll.y - 12),
          width: Math.max(8, pair.rowBox.rightPx - pair.rowBox.leftPx + 24),
          height: Math.max(8, pair.rowBox.bottomPx - pair.rowBox.topPx + 24),
        },
      });
      row.crop = name;
    } catch {
      // A row scrolled outside the captured page (an open dialog's backdrop pins the body) yields
      // no crop; the row still reports, without one, rather than being dropped.
      row.crop = null;
    }
  }
}

/**
 * Sweep one corpus.
 * @param {object} args
 * @returns {Promise<void>}
 */
async function sweep(args) {
  const { browser, surface, screens, widths, themes, run, index } = args;
  for (const screen of screens) {
    for (const theme of themes) {
      for (const width of widths) {
        const { context, page } = await openScreen(browser, screen, theme, width);
        try {
          if (!(await applyState(page, screen.state))) {
            run.unreached.push(`${screen.id} at ${width}px / ${theme.id}: state "${screen.state}" not reachable`);
            continue;
          }
          await measureRender({ page, surface, screen, theme, width, run, index });
        } finally {
          await context.close();
        }
      }
    }
  }
}

/**
 * The inventory document.
 * @param {object} run
 * @param {object} corpora
 * @returns {string}
 */
function renderDoc(run, corpora) {
  const rows = [...run.rows.values()].sort(
    (a, b) =>
      a.surface.localeCompare(b.surface) ||
      Math.abs(b.maxDelta) - Math.abs(a.maxDelta) ||
      a.screen.id.localeCompare(b.screen.id)
  );
  const adminRows = rows.filter((row) => row.surface === 'admin');
  const publicRows = rows.filter((row) => row.surface === 'public');
  const subBar = run.magnitudes.filter((value) => value <= VERTICAL_REPORTING_BAR_PX);
  const nonZeroSubBar = subBar.filter((value) => value > 0);
  const jitter = run.repeatability.length > 0 ? Math.max(...run.repeatability) : 0;
  const declines = rows.filter((row) => row.disposition.startsWith('DECLINE'));

  const lines = [];
  lines.push('# Vertical-alignment inventory (measured, both corpora)');
  lines.push('');
  lines.push(
    'Emitted by `scripts/probe-vertical-alignment.mjs` against a running showcase preview. Re-run ' +
      'the probe to regenerate this file; it is a measurement record, not a hand-maintained doc.'
  );
  lines.push('');
  lines.push('## The three measurement traps');
  lines.push('');
  lines.push(
    'Verbatim from the ratified design spec, and binding on every artifact that measures vertical ' +
      'alignment (this probe, the shared module, the rendered rule, and every fixture assertion). ' +
      'Each one is a wrong answer a real probe already produced against a real screen.'
  );
  lines.push('');
  TRAPS.forEach((trap, position) => lines.push(`${position + 1}. ${trap}`));
  lines.push('');
  lines.push(
    'The metric follows the pair\'s class: text-beside-text compares BASELINES (a mixed-size pair ' +
      'sharing a baseline is correct typography whose glyph centres diverge by design, and this ' +
      'class must not report such a pair as a defect); icon-beside-text and control-beside-text ' +
      'compare visible-content (ink) centres; the optical suspects compare glyph centre against ' +
      `padding-box centre. Reporting bar: ${VERTICAL_REPORTING_BAR_PX}px.`
  );
  lines.push('');
  lines.push('## Calibration (synthetic, and why)');
  lines.push('');
  lines.push(
    'NEITHER CORPUS STILL EXHIBITS THE CALIBRATION DEFECTS. The stacked-register field components ' +
      'have no call sites in the engine\'s admin components or the showcase routes, and the one ' +
      'consumer that composed the icon-card shape has already fixed its instances. There is ' +
      'therefore no live screen to calibrate against, which is why both calibration cases are ' +
      'SYNTHETIC fixtures reproducing the measured defects. The probe renders both before it ' +
      'touches either corpus and refuses to emit if it misses either one on sign or magnitude.'
  );
  lines.push('');
  for (const line of run.calibration) lines.push(line);
  lines.push('');
  lines.push('## The run');
  lines.push('');
  lines.push(`- Admin corpus: ${corpora.admin.length} screens at ${ADMIN_WIDTHS.join(', ')}px, both themes.`);
  lines.push(`- Public corpus: ${corpora.public.length} screens at ${PUBLIC_WIDTHS.join(', ')}px, both themes.`);
  lines.push(`- Renders measured: ${run.renders}. Pairs measured: ${run.measured}.`);
  lines.push(`- Visual rows walked: ${run.diagnostics.rowsWalked ?? 0}.`);
  lines.push(`- Rows above the ${VERTICAL_REPORTING_BAR_PX}px bar: ${rows.length} (admin ${adminRows.length}, public ${publicRows.length}).`);
  lines.push(`- Crops and the full per-pair record: \`${ARTIFACT_DIR}\`.`);
  lines.push('');
  lines.push(
    'A ROW HERE IS ONE DISTINCT COMPOSITION above the bar, not one render: the same pair seen at ' +
      'several widths or in both themes is one row carrying every width and theme it was seen at. ' +
      `The full per-pair record, all ${run.measured} readings including the sub-bar population, is ` +
      `written to \`${resolve(ARTIFACT_DIR, 'measured-pairs.json')}\` rather than printed here.`
  );
  lines.push('');

  lines.push('## Screens measured');
  lines.push('');
  lines.push('| Surface | Screen | Route | State | Note |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const screen of corpora.admin) {
    lines.push(`| admin | ${screen.id} | \`${screen.path}\` | ${screen.state} | ${screen.note} |`);
  }
  for (const screen of corpora.public) {
    lines.push(`| public | ${screen.id} | \`${screen.path}\` | ${screen.state} | ${screen.note} |`);
  }
  lines.push('');

  lines.push('## Rows above the reporting bar');
  lines.push('');
  lines.push(
    'Delta sign: NEGATIVE means the left-hand member rides HIGH against the right-hand member; on ' +
      'an optical row, negative means the glyph rides high inside its own padding box. Every row ' +
      'carries a disposition: a recipe task, or an explicit decline with its reason. No row reads ' +
      '"unknown".'
  );
  lines.push('');
  if (rows.length === 0) {
    lines.push('No pair on either corpus exceeded the reporting bar.');
  } else {
    lines.push(
      '| # | Id | Surface | Screens / routes | Viewport | Theme | Component file | Pair class | Delta (px) | Crop | Disposition |'
    );
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    rows.forEach((row, position) => {
      const screens = [...row.screens].sort().join(', ');
      const widths = [...row.widths].sort((a, b) => b - a).join(', ');
      const themes = [...row.themes].sort().join(', ');
      const file = row.attribution ? `\`${row.attribution.file}\`` : 'utility classes only, unattributed';
      const delta = row.minDelta === row.maxDelta ? `${row.maxDelta}` : `${row.minDelta} to ${row.maxDelta}`;
      const crop = row.crop ? `\`${resolve(ARTIFACT_DIR, 'crops', row.crop)}\`` : 'none (row off the captured page)';
      lines.push(
        `| ${position + 1} | \`${keyDigest(row.key)}\` | ${row.surface} | ${cell(screens)} (\`${row.screen.path}\`) | ${widths} | ${themes} | ${cell(file)} | ${row.pair.pairClass} | ${delta} | ${cell(crop)} | ${cell(row.disposition)} |`
      );
    });
  }
  lines.push('');
  lines.push('### What each row is');
  lines.push('');
  lines.push('| # | Id | Row container | Left member | Right member | Shape | `align-items` |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  rows.forEach((row, position) => {
    const describe = (anchor) =>
      `${anchor.kind}/${anchor.geometry} \`${anchor.selector}\`${anchor.text ? ` "${anchor.text}"` : ''}`;
    lines.push(
      `| ${position + 1} | \`${keyDigest(row.key)}\` | \`${cell(row.pair.rowSelector)}\` | ${cell(describe(row.pair.a))} | ${cell(describe(row.pair.b))} | ${row.shape} | ${row.pair.alignItems} |`
    );
  });
  lines.push('');

  lines.push('## Disposition summary');
  lines.push('');
  lines.push('| Disposition | Rows |');
  lines.push('| --- | --- |');
  const byDisposition = new Map();
  for (const row of rows) byDisposition.set(row.disposition, (byDisposition.get(row.disposition) ?? 0) + 1);
  for (const [text, count] of [...byDisposition.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${cell(text)} | ${count} |`);
  }
  lines.push('');
  lines.push(
    `Rows owned by task 2 (admin): ${adminRows.length - adminRows.filter((row) => row.disposition.startsWith('DECLINE')).length}. ` +
      `Rows owned by task 3 (chassis): ${publicRows.length - publicRows.filter((row) => row.disposition.startsWith('DECLINE')).length}. ` +
      `Explicit declines: ${declines.length}.`
  );
  lines.push('');
  lines.push(
    'A decline is a REVIEWED ruling: someone read that row\'s crop and decided no recipe should ' +
      'move it. The rulings live in the probe (`REVIEWED_DISPOSITIONS`), keyed by the Id column, ' +
      'because a re-run overwrites this file and a ruling kept only here would be erased by the ' +
      'run that is supposed to verify it. A row whose Id has no ruling takes its shape\'s default, ' +
      'so a composition that appears later is dispositioned rather than reported unknown.'
  );
  lines.push('');

  lines.push('## Optical readings, by recipe');
  lines.push('');
  lines.push(
    'Glyph cap centre against the padding box the glyph sits in, over every optical reading in the ' +
      'run rather than only the ones above the bar. NEGATIVE means the glyph rides high in its own ' +
      'box. This is the evidence a `text-box: trim-both` default rests on, so the sub-bar ' +
      'distribution matters as much as the outliers.'
  );
  lines.push('');
  lines.push('| Recipe | Readings | Median offset (px) | Max magnitude (px) |');
  lines.push('| --- | --- | --- | --- |');
  const opticalByRecipe = new Map();
  for (const entry of run.record) {
    if (entry.pairClass !== 'optical-suspect') continue;
    const recipe = entry.rowClasses.split(/\s+/).filter(Boolean).slice(0, 3).join(' ') || entry.rowSelector;
    const bucket = opticalByRecipe.get(recipe) ?? [];
    bucket.push(entry.deltaPx);
    opticalByRecipe.set(recipe, bucket);
  }
  const opticalRanked = [...opticalByRecipe.entries()]
    .map(([recipe, samples]) => ({
      recipe,
      samples,
      median: round(percentile(samples, 0.5)),
      max: samples.reduce((best, value) => (Math.abs(value) > Math.abs(best) ? value : best), 0),
    }))
    .sort((a, b) => Math.abs(b.median) - Math.abs(a.median) || b.samples.length - a.samples.length);
  for (const bucket of opticalRanked.slice(0, 20)) {
    lines.push(`| \`${cell(bucket.recipe)}\` | ${bucket.samples.length} | ${bucket.median} | ${round(bucket.max)} |`);
  }
  if (opticalRanked.length > 20) lines.push(`| ... ${opticalRanked.length - 20} more recipes | | | |`);
  lines.push('');

  lines.push('## Noise floor');
  lines.push('');
  lines.push(
    'The rendered rule sets its firing threshold from THESE numbers, not from the placeholder 4px. ' +
      'Two independent readings: run-to-run jitter (the same page measured twice in one session), ' +
      'and the distribution of the sub-bar population.'
  );
  lines.push('');
  lines.push(
    `- Repeatability: ${run.repeatability.length} pairs measured twice on one page, max delta-of-deltas ${jitter}px.`
  );
  lines.push(
    `- Sub-bar population: ${subBar.length} pairs at or under ${VERTICAL_REPORTING_BAR_PX}px, ${nonZeroSubBar.length} of them non-zero.`
  );
  lines.push(
    `- Sub-bar distribution (non-zero): p50 ${round(percentile(nonZeroSubBar, 0.5))}px, p90 ${round(percentile(nonZeroSubBar, 0.9))}px, p99 ${round(percentile(nonZeroSubBar, 0.99))}px, max ${nonZeroSubBar.length > 0 ? round(Math.max(...nonZeroSubBar)) : 0}px.`
  );
  lines.push('');

  lines.push('## Unmeasured');
  lines.push('');
  lines.push(
    'Listed rather than omitted, so the zero-rows claim above stays a claim about what was ' +
      'measured. A state absent here is a state no row was found in because none was rendered.'
  );
  lines.push('');
  for (const [state, why] of UNRENDERED_STATES) lines.push(`- **${state}**: ${why}`);
  lines.push(
    `- **Row members taller than ${DEFAULT_ROW_ITEM_MAX_HEIGHT_PX}px**: excluded as layout objects rather than row members; ` +
      `${run.diagnostics.pairsSkippedTooTall ?? 0} pairs fell out this way.`
  );
  lines.push(`- **Members with no resolvable anchor**: ${run.diagnostics.anchorsUnresolved ?? 0}.`);
  lines.push(
    `- **Icons measured by element box** (no reachable painting geometry, so not an ink reading): ${run.diagnostics.iconElementBoxFallbacks ?? 0}.`
  );
  lines.push(
    `- **Icons whose drawn extent a mask or unresolvable clip hides**: ${run.diagnostics.iconInkClipsUnresolved ?? 0}.`
  );
  lines.push(`- **Pairs with no reading for their class's metric**: ${run.diagnostics.pairsUnmeasurable ?? 0}.`);
  if (run.unreached.length > 0) {
    lines.push('- **Interaction states not reachable on some renders**:');
    for (const entry of run.unreached) lines.push(`  - ${entry}`);
  } else {
    lines.push('- **Interaction states**: every configured state was reached on every render.');
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  if (!(await isReachable(BASE_URL))) {
    throw new Error(
      `no server answering at ${BASE_URL}. This probe starts nothing: build and preview the ` +
        'showcase (VITE_CAIRN_E2E=1 npm run build, then CAIRN_DEV_BACKEND=1 npm run preview -- ' +
        '--port 4173), or set BASE_URL, then re-run.'
    );
  }
  const corpora = { admin: adminCorpus(), public: PUBLIC_SCREENS };
  const index = sourceIndex();
  const run = {
    renders: 0,
    measured: 0,
    rows: new Map(),
    magnitudes: [],
    record: [],
    repeatability: [],
    unreached: [],
    diagnostics: {},
    calibration: [],
  };

  const browser = await chromium.launch();
  try {
    run.calibration = await calibrate(browser);
    for (const line of run.calibration) console.log(`probe-vertical-alignment: calibration ${line.slice(2)}`);
    // The previous run's artifacts are cleared only AFTER calibration passes. Clearing them first
    // meant a refusing run destroyed the crops the committed inventory still pointed at, which is a
    // refusal doing damage on its way out.
    rmSync(ARTIFACT_DIR, { recursive: true, force: true });
    mkdirSync(resolve(ARTIFACT_DIR, 'crops'), { recursive: true });
    await sweep({
      browser,
      surface: 'admin',
      screens: corpora.admin,
      widths: ADMIN_WIDTHS,
      themes: ADMIN_THEMES,
      run,
      index,
    });
    await sweep({
      browser,
      surface: 'public',
      screens: corpora.public,
      widths: PUBLIC_WIDTHS,
      themes: PUBLIC_THEMES,
      run,
      index,
    });
  } finally {
    await browser.close();
  }

  writeFileSync(resolve(ARTIFACT_DIR, 'measured-pairs.json'), `${JSON.stringify(run.record, null, 2)}\n`, 'utf8');
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  writeFileSync(DOC_PATH, renderDoc(run, corpora), 'utf8');
  console.log(
    `probe-vertical-alignment: ${run.measured} pairs measured over ${run.renders} renders; ` +
      `${run.rows.size} rows above ${VERTICAL_REPORTING_BAR_PX}px`
  );
  console.log(`probe-vertical-alignment: wrote ${relative(ROOT, DOC_PATH)} and artifacts under ${ARTIFACT_DIR}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`probe-vertical-alignment: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  });
}
