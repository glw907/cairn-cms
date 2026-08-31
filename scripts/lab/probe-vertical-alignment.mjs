#!/usr/bin/env -S npx tsx
// cairn-cms: the vertical-alignment inventory probe. It renders BOTH of the pass's corpora against
// a running showcase preview, measures every candidate row pair through the shared measurement
// module, and writes docs/internal/2026-08-vertical-alignment-inventory.md plus one screenshot crop
// per reported row.
//
// IT MEASURES NOTHING ITSELF. Every number here comes from src/tests/lab/vertical-metrics.ts, the
// same module the shared vertical-alignment recipes test drives. The three measurement traps and
// the metric-by-class split are encoded there once; this file is the renderer, the walker, and the
// report. A geometry helper appearing in this file would be the start of the drift the split
// exists to prevent.
//
// EVERY READING IS DECOMPOSED, AND THE DISPOSITION IS TAKEN ON THE RESIDUAL. Two alignments
// displace a reading with nothing misconfigured, and each emission of this inventory has failed by
// reading one of them as a defect. A row that CENTRES its members and wraps its text has
// deliberately put the other member half a block below the line the reading was taken on, so the
// raw delta grows with the line count and swings with the viewport width. A row that TOP-ALIGNS
// them levelled their own boxes and asked for nothing else, so a member read at its centre sits
// half its own box below the line beside it, and the reading scales with the member box. The module
// splits each delta into both terms and the residual left over (`compositionPx`), this probe
// reports both columns, and the reporting bar applies to the residual. The first emission reported
// 37 rows, hand-declined 13 as "trap 1 doing its job", and called the identical arithmetic a defect
// whenever the member was an icon. The second reported four top-aligned icon tiles and a
// top-aligned page-header button as defects whose recipe would have lifted them clear of the blocks
// they label.
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
//   npx tsx scripts/lab/probe-vertical-alignment.mjs
// The measurement module lives at src/tests/lab/vertical-metrics.ts, outside src/lib, so plain
// `node` cannot import it without a build step; `tsx` (a devDependency) resolves the NodeNext
// `.js`-suffixed imports back to their `.ts` sources the way vitest already does.
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
  isStartAlignment,
  measureVerticalMetrics,
} from '../../src/tests/lab/vertical-metrics.ts';
import { repoRoot } from '../repo-root.mjs';
import { walk } from '../walk-files.mjs';

/** @typedef {import('../../src/tests/lab/vertical-metrics.ts').MeasuredPair} MeasuredPair */
/** @typedef {import('../../src/tests/lab/vertical-metrics.ts').VerticalCalibrationFixture} Fixture */

const ROOT = repoRoot(import.meta.url);
const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
const DOC_PATH = resolve(ROOT, 'docs/internal/2026-08-vertical-alignment-inventory.md');

/**
 * Where the crops and the full per-pair record land. Outside the repo by default and stable across
 * runs, so the absolute paths this doc prints mean the same thing to whoever re-runs the probe.
 */
const ARTIFACT_DIR = process.env.CAIRN_VERTICAL_CROP_DIR || resolve(tmpdir(), 'cairn-vertical-alignment');

/**
 * The residual a row has to reach before it is worth a screenshot. Below the reporting bar on
 * purpose: task 4 picks a threshold inside the window between the noise floor and the smallest
 * confirmed defect, and it cannot size what sits down there without opening the crops. A run that
 * cropped only what it inventories would leave that choice to be made from arithmetic alone, which
 * is how a family of fifteen list rows spent an emission looking like latent work.
 */
const BAND_CROP_FLOOR_PX = 1;

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
    'no form is submitted, so no error line renders below a control; this is exactly the shape the bottom-aligned field row recipe\'s caveat names (FieldLabel.svelte\'s own header comment), and it is unmeasured here',
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
          `${reading ? reading.residualPx : 'nothing'}px residual, ` +
          `${reading ? reading.compositionPx : 'nothing'}px composition ` +
          `(bound ${fixture.maxCompositionPx}px). PASS.`
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
  return candidates.reduce((best, next) =>
    next.residualMagnitudePx > best.residualMagnitudePx ? next : best
  );
}

/** Every `.svelte` file a rendered row could have come from, read once for attribution. */
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

/** @param {string} value */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The source file a row came from, resolved from the TEXT the row renders and verified by finding
 * that text in exactly one file. A class run cannot do this: several components share a Tailwind
 * literal, `index.find` returns whichever file the walk reached first, and the first emission of
 * this inventory named the wrong component on at least three rows that way.
 *
 * The rendered text arrives truncated, and the source may wrap it across lines, so each run is
 * matched word by word with `\s+` between. An attribution that resolves to more than one file says
 * so rather than picking one.
 * @param {{ file: string, text: string }[]} index
 * @param {string[]} texts
 * @returns {{ files: string[], how: string, verified: boolean } | null}
 */
function attributeByText(index, texts) {
  for (const text of texts) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length < 2 || text.trim().length < 8) continue;
    const pattern = new RegExp(words.map(escapeRegExp).join('\\s+'));
    const hits = index.filter((entry) => pattern.test(entry.text)).map((entry) => entry.file);
    if (hits.length === 1) return { files: hits, how: `the rendered text "${text}"`, verified: true };
    if (hits.length > 1) {
      return { files: hits, how: `the rendered text "${text}", which appears in ${hits.length} files`, verified: false };
    }
  }
  return null;
}

/**
 * Every run of consecutive class tokens in `classes`, longest first. A Tailwind component writes
 * its class list as one literal, so a run that appears in a file is a real signal that the file
 * authored that element.
 * @param {string} classes
 * @returns {string[]}
 */
function classRuns(classes) {
  const tokens = classes.split(/\s+/).filter((token) => token && !token.startsWith('svelte-'));
  const runs = [];
  for (let length = Math.min(tokens.length, 8); length >= 3; length -= 1) {
    for (let start = 0; start + length <= tokens.length; start += 1) {
      runs.push(tokens.slice(start, start + length).join(' '));
    }
  }
  return runs;
}

/**
 * The file the ROW CONTAINER is authored in, resolved from the container's own class run.
 *
 * THE ROW'S RENDERED TEXT DELIBERATELY PLAYS NO PART. An alignment recipe lives with the container,
 * and where that container is a shared toolkit component fed by props (`PageHeader`, used by every
 * admin page), the text it renders lives in the CONSUMER. Resolving from text names the consumer on
 * every such row, and an implementer dispatched from that name edits the wrong file and never sees
 * the shared recipe. Narrowing a multi-file class run by the row's own words has the same defect for
 * the same reason, so a run that lands in more than one file reports every candidate instead.
 * @param {{ file: string, text: string }[]} index
 * @param {string} classes
 * @returns {{ files: string[], how: string, verified: boolean } | null}
 */
function attributeContainer(index, classes) {
  for (const run of classRuns(classes)) {
    const hits = index.filter((entry) => entry.text.includes(run)).map((entry) => entry.file);
    if (hits.length === 1) return { files: hits, how: `the container class run \`${run}\``, verified: true };
    if (hits.length > 1) {
      return {
        files: hits,
        how: `the container class run \`${run}\`, which appears in ${hits.length} files`,
        verified: false,
      };
    }
  }
  return null;
}

/**
 * The fallback: the longest run of CONSECUTIVE class tokens the row's elements carry, narrowed to
 * the files that ALSO render one of the row's own words. A Tailwind component writes its class list
 * as one literal, so the run is a real signal, but several components share one and the first
 * emission resolved that ambiguity by taking whichever file the walk reached first.
 *
 * A run that lands in exactly one file, or narrows to exactly one, is a checkable claim and reports
 * as verified. Anything else lists every candidate rather than picking.
 * @param {{ file: string, text: string }[]} index
 * @param {string[]} classStrings
 * @param {string[]} texts
 * @returns {{ files: string[], how: string, verified: boolean } | null}
 */
function attributeByClassRun(index, classStrings, texts) {
  const words = texts
    .flatMap((text) => text.trim().split(/\s+/))
    .filter((word) => word.replace(/[^\p{L}\p{N}]/gu, '').length >= 4);
  for (const classes of classStrings) {
    const tokens = classes.split(/\s+/).filter((token) => token && !token.startsWith('svelte-'));
    for (let length = Math.min(tokens.length, 8); length >= 3; length -= 1) {
      for (let start = 0; start + length <= tokens.length; start += 1) {
        const run = tokens.slice(start, start + length).join(' ');
        const hits = index.filter((entry) => entry.text.includes(run));
        if (hits.length === 0) continue;
        if (hits.length === 1) {
          return { files: [hits[0].file], how: `the class run \`${run}\`, in exactly one file`, verified: true };
        }
        for (const word of words) {
          const pattern = new RegExp(`\\b${escapeRegExp(word)}`);
          const narrowed = hits.filter((entry) => pattern.test(entry.text));
          if (narrowed.length === 1) {
            return {
              files: [narrowed[0].file],
              how: `the class run \`${run}\`, narrowed to the one file also rendering "${word}"`,
              verified: true,
            };
          }
        }
        return { files: hits.map((entry) => entry.file), how: `the class run \`${run}\``, verified: false };
      }
    }
  }
  return null;
}

/**
 * A row's source files: the container the alignment recipe lives in, and the file its text comes
 * from, which are the same file on a row a component composes itself and different files on a row a
 * shared toolkit component composes from a consumer's props.
 *
 * BOTH ARE REPORTED, container first. The first corrected emission printed one file per row,
 * resolved from the rendered text, and named the media library on a row whose `sm:items-start`
 * lives in `PageHeader` and is shared by every admin page.
 * @param {{ file: string, text: string }[]} index
 * @param {object} row
 * @returns {{ container: object | null, text: object | null }}
 */
function attributeRow(index, row) {
  const readings = [...row.readings.values()];
  const texts = [...new Set(readings.flatMap((reading) => [reading.sample.a.text, reading.sample.b.text]))]
    .filter(Boolean)
    .sort((one, other) => other.length - one.length);
  const byText = attributeByText(index, texts);
  const classStrings = [...new Set(readings.flatMap((reading) => [reading.sample.a.classes, reading.sample.b.classes]))];
  const container =
    attributeContainer(index, row.rowClasses) ?? attributeByClassRun(index, classStrings, texts) ?? null;
  return { container, text: byText };
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
  if (pair.pairClass === 'control-beside-control') return 'control beside control';
  return 'control beside text';
}

/**
 * The compositions a human read a crop of and ruled on, keyed by {@link rowId}. This table is the
 * pass's JUDGMENT, and it is here rather than in the emitted doc because the probe overwrites that
 * doc on every run: a ruling kept in the output would be erased by the re-run that is supposed to
 * verify it.
 *
 * EVERY ENTRY HERE IS A DESIGN CALL THE ARITHMETIC CANNOT REACH, and each one says which shape it
 * is. The composition term ({@link compositionPx}) now decides the mechanical cases, so a row whose
 * reading is explained by its own alignment never reaches this table: it measures within the bar
 * and drops out of the inventory. Sixteen of the first emission's twenty-one rulings were exactly
 * that, and a ruling that restates a rule is where a hand list starts disagreeing with itself.
 *
 * A row whose key is absent takes its shape's default, so a composition that appears after a recipe
 * lands is still dispositioned rather than reported unknown.
 */
const INLINE_FLEX_LABEL_MECHANIC =
  'task 2 (admin toolkit), ONE MECHANIC AT THREE CALL SITES: the label is an `inline-flex` span ' +
  'wrapping an icon and its word, and an inline-flex flex item synthesises its baseline from its ' +
  'FIRST item, the svg, rather than from its text. The row does declare `sm:items-baseline`, so it ' +
  'asked for the right thing and misses it by 2.5px, a quarter of the 10px cap height both members ' +
  'measure; this is not a mixed-size artifact. Crop read, one crop per row: the label with its ' +
  'check icon rides visibly high against the value beside it, on all three ("Tidy" against "On for ' +
  'this site", "API key" against "Set, and kept on the server", "Model" against "Claude Sonnet"). ' +
  'FIX IT AT THE RECIPE, not as three row fixes: the same span shape appears at ' +
  'CairnTidySettings.svelte lines 367, 372 and 380, and a repeated local workaround is the signal ' +
  'that the label-with-icon shape belongs in the toolkit.';

const REVIEWED_DISPOSITIONS = {
  '52225d2e':
    'DECLINE (reviewed, a design call): the row declares `items-end` and bottom-aligns its trailing ' +
    "action against a three-line block on purpose, so the reading pairs the control with the block's " +
    'FIRST line while the composition pairs it with the last. `end` alignment is the case the ' +
    'composition term does not model, stated as a limitation rather than folded in. Crop read: the ' +
    '"Turn off" control sits about 11px BELOW the last line of the card body ("to." has ink rows ' +
    '97 to 105 and baseline 106; "Turn off" has ink rows 107 to 116 and baseline 117), as a ' +
    'bottom-right card action. It is bottom-flush with the block exactly as `items-end` asks, which ' +
    'is what makes the reading composition rather than a defect.',
  a1f335e1:
    'DECLINE (reviewed, a design call): the delete control spans BOTH grid rows of the tag entry and ' +
    'centres on the pair, while the input occupies the first row alone. A multi-row grid span is the ' +
    'other case the composition term does not model. Crop read: the trash control sits between the ' +
    'input and the slug line, which is correct as built.',
  '22a0e709':
    'task 2 (admin toolkit): the pill sits low against the heading it labels, and low against every ' +
    "candidate target: its box centre is 5px below the heading's cap centre, 5px below that " +
    "heading's first line box (249 to 266px at 1440, centre 257.5) and its baseline is 4px below " +
    "the heading's. LEVEL THE PILL'S BOX ON THE HEADING'S FIRST LINE BOX, which is the target the " +
    'other chip rows already hit; do NOT set the two on one baseline. The row is `items-start` ' +
    'against a 237px block and the pill carries a deliberate `mt-0.5`, so a baseline fix would move ' +
    'the wrong thing.',
  '76d4cd3e':
    "task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's " +
    'cap centre). REAL BUT MARGINAL, and it clears the bar by 0.33px: thirteen sibling icon-in-btn ' +
    "rows across the admin cluster in [-0.75, -0.5], and lucide's check glyph carries about 0.33px " +
    'of ink-bbox bias of its own, which leaves roughly 1.5px of genuine placement offset. Worth ' +
    'fixing with the mechanic, not worth a bespoke nudge.',
  '290376a5': INLINE_FLEX_LABEL_MECHANIC,
  '24a343fe': INLINE_FLEX_LABEL_MECHANIC,
  c2ab4dc7: INLINE_FLEX_LABEL_MECHANIC,
};

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
 * The disposition for one row: the reviewed ruling if it has one, otherwise the recipe task that
 * owns its shape, otherwise an explicit decline with the reason. Every branch returns one of those,
 * which is what keeps "unknown" off the report.
 *
 * The mechanical branches are blind to member kind by construction: an icon member and a control
 * member with the same geometry reach the same branch, and the shape only picks which recipe
 * sentence names the fix. Only the recipe wording differs, never the ruling.
 * @param {object} row
 * @returns {string}
 */
function disposition(row) {
  const reviewed = REVIEWED_DISPOSITIONS[row.id];
  if (reviewed) return reviewed;
  const task = row.surface === 'admin' ? 'task 2 (admin toolkit)' : 'task 3 (Waymark chassis)';
  if (restsOnElementBoxFallback(row.worst.sample)) {
    return (
      'DECLINE: the icon member carries no reachable painting geometry, so this reading is the ' +
      'marked element-box fallback, not ink. Not evidence a recipe should act on.'
    );
  }
  switch (row.worst.shape) {
    case 'stacked-field row':
      return `${task}: compose the bottom-aligned row recipe (\`display: flex; align-items: flex-end; gap: var(--cairn-gap-control, 0.5rem)\`); the control drops by the label band.`;
    case 'optical-suspect':
      return `${task}: text-box trim-both on the label-like recipe carrying this glyph.`;
    case 'icon beside text':
      return `${task}: the icon-beside-text row mechanic (pair the ink centre to the line's cap centre).`;
    case 'control beside text':
      return `${task}: centre the control against the line it sits beside, not against the block.`;
    case 'control beside control':
      return `${task}: two controls in one row whose boxes do not centre on each other.`;
    case 'control in a table cell':
      return `${task}: the table-row cell treatment for a control beside its cell's text.`;
    case 'text beside text':
      return `${task}: the two runs share a row but not a baseline; set them on one baseline.`;
    default:
      throw new Error(`no disposition rule for shape "${row.worst.shape}"`);
  }
}

/**
 * A ROW's identity, which is the identity a ruling is keyed by. Built from the things tasks 2 and 3
 * do not change: the container's tag, and every member of the visual row named by kind and rendered
 * text. The SCREEN is deliberately out of it, so a chrome row rendering on eleven screens at three
 * widths in two themes is one composition carrying every place it was seen.
 *
 * CLASSES ARE OUT OF IT ON PURPOSE. The first emission keyed on `signature()`, which carries the
 * first four classes, and tasks 2 and 3 change exactly those: the verification re-run would have
 * dropped every ruling and re-reported each row as fresh recipe work. Text and tag survive a class
 * change; a recipe that also rewrites the markup breaks the key, which is why an unresolved ruling
 * is reported loudly rather than dropped.
 *
 * All the members, not the pair's two: a leading and a trailing member around one run of text are
 * two READINGS of one row, and keying on the pair emitted that row twice with mirrored signs.
 * @param {MeasuredPair} pair
 * @returns {string}
 */
function rowKey(pair) {
  return [pair.rowKind, pair.rowTag, ...pair.rowMembers].join('|');
}

/** One reading inside a row: which two members, measured how. Also class-free, for the same reason. */
function readingKey(pair) {
  const name = (anchor) => `${anchor.kind}:${anchor.text || anchor.tag}`;
  return [name(pair.a), name(pair.b), pair.metric].join('>');
}

/** A short stable name for `key`, so two rows sharing a selector cannot overwrite each other's crop. */
function keyDigest(key) {
  return createHash('sha256').update(key).digest('hex').slice(0, 8);
}

/** @param {MeasuredPair} pair */
function rowId(pair) {
  return keyDigest(rowKey(pair));
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

/** One distribution, stated over every value rather than over a slice the bar already defines. */
function distributionLine(label, values) {
  const nonZero = values.filter((value) => value > 0);
  const max = values.length > 0 ? Math.max(...values) : 0;
  return (
    `${label}: p50 ${round(percentile(values, 0.5))}px, p90 ${round(percentile(values, 0.9))}px, ` +
    `p99 ${round(percentile(values, 0.99))}px, max ${round(max)}px ` +
    `(${nonZero.length} of ${values.length} readings non-zero).`
  );
}

/** One number when a reading held still across the run, its span when it did not. */
function range(low, high) {
  return low === high ? `${round(low)}` : `${round(low)} to ${round(high)}`;
}

/** One attribution, named by what it claims and how the claim was checked. */
function attributionPart(label, claim) {
  const files = claim.files.map((file) => `\`${file}\``).join(', ');
  return claim.verified ? `${label} ${files}` : `${label} ${files} (UNVERIFIED, matched on ${claim.how})`;
}

/**
 * What the Component file column says. The container comes first because that is where a recipe
 * lands; the text file is named beside it only when the two differ, which is the signal that the
 * row's composition is shared and its words are not.
 */
function attributionCell(row) {
  const { container, text } = row.attribution;
  const parts = [];
  if (container) parts.push(attributionPart('row container', container));
  if (text && (!container || text.files.join() !== container.files.join())) {
    parts.push(attributionPart('text from', text));
  }
  if (parts.length === 0) return 'unattributed (no class run and no rendered text resolves to a file)';
  return parts.join('; ');
}

/**
 * Measure one render and fold it into the run's accumulators.
 * @param {object} args
 * @returns {Promise<void>}
 */
async function measureRender(args) {
  const { page, surface, screen, theme, width, run } = args;
  const { pairs, diagnostics } = await measureVerticalMetrics(page);
  run.renders += 1;
  for (const [key, value] of Object.entries(diagnostics)) {
    run.diagnostics[key] = (run.diagnostics[key] ?? 0) + value;
  }

  // Repeatability: one page measured twice in the same session, so the noise floor rests on
  // observed jitter rather than on an assumption about it.
  if (run.repeatability.length === 0) {
    const second = await measureVerticalMetrics(page);
    const first = new Map(pairs.map((pair) => [`${rowKey(pair)}|${readingKey(pair)}`, pair.deltaPx]));
    for (const pair of second.pairs) {
      const before = first.get(`${rowKey(pair)}|${readingKey(pair)}`);
      if (before !== undefined) run.repeatability.push(round(Math.abs(before - pair.deltaPx)));
    }
  }

  for (const pair of pairs) {
    run.measured += 1;
    run.magnitudes.push(pair.magnitudePx);
    run.residualMagnitudes.push(pair.residualMagnitudePx);
    const id = rowId(pair);
    // The full anchor geometry, not a summary of it. The first emission persisted selectors and a
    // delta, so no reading could be decomposed or disputed without re-running the whole probe
    // against a live preview, which is the one thing a record exists to make unnecessary.
    run.record.push({
      surface,
      screen: screen.id,
      path: screen.path,
      state: screen.state,
      width,
      theme: theme.id,
      rowId: id,
      rowKind: pair.rowKind,
      rowSelector: pair.rowSelector,
      rowClasses: pair.rowClasses,
      rowTag: pair.rowTag,
      rowMembers: pair.rowMembers,
      alignItems: pair.alignItems,
      rowBox: pair.rowBox,
      pairClass: pair.pairClass,
      metric: pair.metric,
      deltaPx: pair.deltaPx,
      compositionPx: pair.compositionPx,
      residualPx: pair.residualPx,
      a: pair.a,
      b: pair.b,
    });

    // Every walked row is accumulated, not only the ones over the bar, so a row's full reading set
    // is known when the report decides whether it is above the bar at all.
    let row = run.rows.get(id);
    if (!row) {
      row = {
        id,
        key: rowKey(pair),
        surface,
        screen,
        rowSelector: pair.rowSelector,
        rowClasses: pair.rowClasses,
        rowTag: pair.rowTag,
        rowMembers: pair.rowMembers,
        alignItems: pair.alignItems,
        readings: new Map(),
        screens: new Set(),
        widths: new Set(),
        themes: new Set(),
        crop: null,
      };
      run.rows.set(id, row);
    }
    row.screens.add(screen.id);
    row.widths.add(width);
    row.themes.add(theme.id);

    const readingId = readingKey(pair);
    const reading = row.readings.get(readingId);
    if (!reading) {
      row.readings.set(readingId, {
        id: readingId,
        shape: shapeOf(pair),
        pairClass: pair.pairClass,
        metric: pair.metric,
        minDelta: pair.deltaPx,
        maxDelta: pair.deltaPx,
        minComposition: pair.compositionPx,
        maxComposition: pair.compositionPx,
        minResidual: pair.residualPx,
        maxResidual: pair.residualPx,
        worstResidualMagnitude: pair.residualMagnitudePx,
        sample: pair,
      });
    } else {
      reading.minDelta = Math.min(reading.minDelta, pair.deltaPx);
      reading.maxDelta = Math.max(reading.maxDelta, pair.deltaPx);
      reading.minComposition = Math.min(reading.minComposition, pair.compositionPx);
      reading.maxComposition = Math.max(reading.maxComposition, pair.compositionPx);
      reading.minResidual = Math.min(reading.minResidual, pair.residualPx);
      reading.maxResidual = Math.max(reading.maxResidual, pair.residualPx);
      if (pair.residualMagnitudePx > reading.worstResidualMagnitude) {
        reading.worstResidualMagnitude = pair.residualMagnitudePx;
        reading.sample = pair;
      }
    }

    if (pair.residualMagnitudePx <= BAND_CROP_FLOOR_PX || row.crop) continue;
    const name = `${id}-${slug(`${screen.id}-${pair.a.text || pair.b.text || pair.a.tag}`)}-${width}.png`;
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
  const { browser, surface, screens, widths, themes, run } = args;
  for (const screen of screens) {
    for (const theme of themes) {
      for (const width of widths) {
        const { context, page } = await openScreen(browser, screen, theme, width);
        try {
          if (!(await applyState(page, screen.state))) {
            run.unreached.push(`${screen.id} at ${width}px / ${theme.id}: state "${screen.state}" not reachable`);
            continue;
          }
          await measureRender({ page, surface, screen, theme, width, run });
        } finally {
          await context.close();
        }
      }
    }
  }
}

/**
 * How far apart the wrapped and unwrapped renderings of ONE reading leave their residual, for every
 * reading this run rendered both ways, largest first.
 *
 * This is the only population in the run that estimates the METHOD's error rather than a screen's.
 * It is a within-reading comparison, so nothing selects it on either the raw delta or the residual:
 * the same two members, the same metric, the same recipe, measured at a width where the text wraps
 * (a composition term is taken) and at one where it does not (none is). The decomposition claims
 * those leave the same residual, and this is how far off that claim lands.
 *
 * A row's own constant offset cancels, which is the point. The previous emission read the residual
 * SPREAD of the composition-explained rows as a floor, and most of that spread was rows carrying a
 * real 1 to 1.5px offset at every width, term or no term.
 * @param {object[]} record
 * @returns {{ px: number, rowId: string, reading: string, wrapped: number, plain: number, wrappedCount: number, plainCount: number }[]}
 */
function driftAcrossCompositions(record) {
  const groups = new Map();
  for (const entry of record) {
    const key = `${entry.rowId}|${readingKey(entry)}`;
    const group = groups.get(key) ?? { rowId: entry.rowId, reading: readingKey(entry), wrapped: [], plain: [] };
    (entry.compositionPx === 0 ? group.plain : group.wrapped).push(Math.abs(entry.residualPx));
    groups.set(key, group);
  }
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return [...groups.values()]
    .filter((group) => group.wrapped.length > 0 && group.plain.length > 0)
    .map((group) => ({
      px: Math.abs(mean(group.wrapped) - mean(group.plain)),
      rowId: group.rowId,
      reading: group.reading,
      wrapped: mean(group.wrapped),
      plain: mean(group.plain),
      wrappedCount: group.wrapped.length,
      plainCount: group.plain.length,
    }))
    .sort((one, other) => other.px - one.px);
}

/**
 * What the top-alignment composition term actually judged, and what it could not see.
 *
 * Subtract that term and the algebra leaves each member's own content-within-its-own-box offset;
 * the two members' RELATIVE placement drops out. So the branch judges a member read off something
 * INSIDE its box (an icon's ink in a tile, the one control in a stacked composite) and nothing
 * else, and on every other pair its residual is zero whatever the row looks like. Counting both
 * populations here keeps that a measured claim rather than a caveat.
 * @param {object[]} record
 * @returns {{ blind: number, blindNonZero: number, sighted: number, byClass: [string, number][] }}
 */
function topAlignmentCoverage(record) {
  const inBranch = record.filter(
    (entry) =>
      entry.metric === 'content-centre' &&
      isStartAlignment(entry.a.alignSelf) &&
      isStartAlignment(entry.b.alignSelf)
  );
  const canSee = (entry) => [entry.a, entry.b].some((member) => member.kind === 'icon' || member.stacked);
  const blind = inBranch.filter((entry) => !canSee(entry));
  const sighted = inBranch.filter(canSee);
  const byClass = new Map();
  for (const entry of blind) byClass.set(entry.pairClass, (byClass.get(entry.pairClass) ?? 0) + 1);
  return {
    blind: blind.length,
    blindNonZero: blind.filter((entry) => entry.residualPx !== 0).length,
    sighted: sighted.length,
    sightedNonZero: sighted.filter((entry) => entry.residualPx !== 0).length,
    byClass: [...byClass.entries()].sort((one, other) => other[1] - one[1]),
  };
}

/** The largest raw magnitude any of a row's readings reached. */
function rawReachOf(row) {
  return [...row.readings.values()].reduce(
    (best, reading) => Math.max(best, Math.abs(reading.minDelta), Math.abs(reading.maxDelta)),
    0
  );
}

/**
 * The inventory document.
 * @param {object} run
 * @param {object} corpora
 * @param {{ file: string, text: string }[]} index
 * @returns {string}
 */
function renderDoc(run, corpora, index) {
  const walked = [...run.rows.values()];
  for (const row of walked) {
    row.worst = [...row.readings.values()].reduce((best, next) =>
      next.worstResidualMagnitude > best.worstResidualMagnitude ? next : best
    );
  }
  const rows = walked
    .filter((row) => row.worst.worstResidualMagnitude > VERTICAL_REPORTING_BAR_PX)
    .sort(
      (a, b) =>
        a.surface.localeCompare(b.surface) ||
        b.worst.worstResidualMagnitude - a.worst.worstResidualMagnitude ||
        a.screen.id.localeCompare(b.screen.id)
    );
  for (const row of rows) {
    row.attribution = attributeRow(index, row);
    row.disposition = disposition(row);
  }
  // The rows the first emission would have reported and this one does not: their raw delta clears
  // the bar and their residual does not, which is the definition of a composition read as a defect.
  const phantoms = walked.filter(
    (row) => row.worst.worstResidualMagnitude <= VERTICAL_REPORTING_BAR_PX && rawReachOf(row) > VERTICAL_REPORTING_BAR_PX
  );
  const adminRows = rows.filter((row) => row.surface === 'admin');
  const publicRows = rows.filter((row) => row.surface === 'public');
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
    'The metric follows the pair\'s kinds AND what the row declared. icon-beside-text and ' +
      'control-beside-text compare visible-content (ink) centres; the optical suspects compare ' +
      'glyph centre against padding-box centre; two runs of text compare BASELINES, unless the row ' +
      `centred them, in which case they compare centres. Reporting bar: ${VERTICAL_REPORTING_BAR_PX}px.`
  );
  lines.push('');
  lines.push('### The fourth trap: a padded chip is not a text run');
  lines.push('');
  lines.push(
    'TWO RUNS OF TYPE AT DIFFERENT SIZES CANNOT SHARE BOTH A BASELINE AND A CENTRE. The cap-height ' +
      'ratio sets one apart by exactly as much as the other holds together, so the same reading is a ' +
      'defect under one metric and correct typography under the other, and only the row says which. ' +
      'Trap 3 above states half of it, the half a previous emission got wrong: a mixed-size pair ' +
      'sharing a BASELINE has centres that diverge by design. THE CONVERSE IS ALSO TRUE and this ' +
      'emission is the first to hold it: a mixed-size pair sharing a CENTRE has BASELINES that ' +
      'diverge by design.'
  );
  lines.push('');
  lines.push(
    'The shape that made it visible is a padded chip beside a heading. A CHIP IS A BOX, not a run ' +
      'of type: its background and border draw the outline the row levels and the eye follows, and ' +
      'the type inside it only says where the OPTICAL reading should look. The previous emission ' +
      'classed three such rows as text-beside-text, scored them on baselines, and prescribed "set ' +
      'them on one baseline" for each: applied, that recipe would have dropped the admin shell\'s ' +
      'CMS chip 3.5px, the vocabulary count pill 2.5px and the public footer\'s nav links 2.8 to ' +
      '4.4px off centres they already hit to within a pixel at every width in both themes.'
  );
  lines.push('');
  lines.push('Two rules follow, both in the shared module rather than here:');
  lines.push('');
  lines.push(
    '- A pair of runs is read at CENTRES where the row declared a centre, and at baselines ' +
      'otherwise. A table cell counts: it is placed by `vertical-align`, and Chromium reports ' +
      '`align-self: normal` on every cell whatever the row asked for, which read as "nothing was ' +
      'declared" on middle-aligned rows that had asked for centres.'
  );
  lines.push(
    '- A member whose run sits in a PAINTED BOX of its own (a background or a border, plus a ' +
      'padding, a border or a rounded corner) is read at that box, not at its cap band. The row ' +
      "container's own paint never counts: a painted button holding an icon and its label is the " +
      'ground that row is drawn on, not one member\'s object. Keeping the two apart is also what ' +
      'stops a glyph riding high INSIDE a chip being counted twice, once here and once in the ' +
      'optical readings below.'
  );
  lines.push('');
  lines.push(
    'A row that top-aligns a chip beside a heading keeps its baseline reading. Under `flex-start` a ' +
      'centre reading collapses into the top-alignment composition term and measures nothing at all ' +
      '(see the coverage note below), so the baseline is the only relative reading two runs of type ' +
      'have there. `22a0e709` is that row, and it survives this correction as a defect.'
  );
  lines.push('');
  lines.push('## How a reading is decomposed, and why the raw delta is not the defect');
  lines.push('');
  lines.push(
    'Trap 1 answers WHICH LINE a member pairs with. It does not answer what the row asked for, and ' +
      'two alignments displace a reading with nothing misconfigured. Reading either displacement as ' +
      'a defect is a phantom, and the first two emissions of this inventory each reported one of ' +
      'them.'
  );
  lines.push('');
  lines.push(
    'A CENTRED row whose text block WRAPS has deliberately centred the other member on the whole ' +
      "block, so a reading taken against the first line is short by half the block's extra height: " +
      'a number that grows with the line count and swings with the viewport width.'
  );
  lines.push('');
  lines.push(
    'A TOP-ALIGNED row levelled its members\' own boxes and asked for nothing else, so a member ' +
      'read at its CENTRE sits half its own box below the line beside it: a 36px icon tile beside a ' +
      '13px line reads 11.5px apart with its ink dead centre in the tile, and the same recipe in a ' +
      '28px tile reads 5.5px. A reading that scales with the member box rather than with the ink is ' +
      'the signature.'
  );
  lines.push('');
  lines.push('Every reading is therefore split, with no extra measurement:');
  lines.push('');
  lines.push('```');
  lines.push('raw delta = composition + residual');
  lines.push('centred row:     composition = b.blockLift - a.blockLift  (the wrapped block it centres on)');
  lines.push('top-aligned row: composition = placed(a) - placed(b)      (the boxes it levelled)');
  lines.push('blockLift = (text extent centre) - (first line band centre), 0 on a single line');
  lines.push('placed(m) = m read whole ? centre of the MEMBER box : the reading itself');
  lines.push('```');
  lines.push('');
  lines.push(
    'The member box is the box the row placed, which is not always the box the reading came off: an ' +
      'icon centred in a tile and the one control inside a stacked composite are both read off ' +
      'something smaller. What survives the top-alignment term is therefore a member whose visible ' +
      'content does not sit where its own box puts it, which is the `/join` ink defect this method ' +
      'was built on, and the `icon-card` calibration fixture is the positive control: it top-aligns, ' +
      'it takes a term of half a pixel, and its 4px defect survives whole.'
  );
  lines.push('');
  lines.push(
    'Each term is taken where the row asked for it and nowhere else. The wrapped-block term: on an ' +
      'optical suspect always, since its padding box spans every line by construction, and on a row ' +
      'whose two members both resolve `align-self` to `center`. The top-alignment term: on a row ' +
      'whose two members both resolve to `flex-start`, `start` or `self-start`, and only under the ' +
      '`content-centre` metric, since a baseline pair compares two baselines that no box geometry ' +
      'enters. NOT MODELLED, and left to a reviewed ruling rather than folded in silently: an ' +
      "`end`-aligned row pairs with the block's LAST line, and a grid member spanning several rows " +
      'centres on its span. NOT REPORTED, and stated rather than implied: under `stretch` (and the ' +
      '`normal` that resolves to it) a member box is the row\'s own height, so no term is taken; and ' +
      'the top-alignment term absorbs generous leading, since a row that got the tops it asked for ' +
      'is composed as written and choosing `items-center` instead is a design call, not a reading.'
  );
  lines.push('');
  lines.push(
    'THE BAR APPLIES TO THE RESIDUAL, and so does every disposition. The raw delta is kept in its ' +
      'own column because it is what a reader sees on screen, not because it is evidence.'
  );
  lines.push('');
  lines.push('### What the top-alignment branch cannot see');
  lines.push('');
  const coverage = topAlignmentCoverage(run.record);
  lines.push(
    'Stated rather than implied, because a residual of zero here is NOT a clean row. Subtract the ' +
      "top-alignment term and the algebra leaves each member's own content-within-its-own-box " +
      'offset: `residual = inset(a) - inset(b)`. THE TWO MEMBERS\' RELATIVE PLACEMENT DROPS OUT ' +
      'ENTIRELY. What survives is a member read off something INSIDE the box the row placed, which ' +
      'is real and is the defect this method was built on, and nothing else.'
  );
  lines.push('');
  lines.push(
    `- Readings this branch JUDGED (an icon's ink in its tile, a stacked composite's control): ` +
      `${coverage.sighted}, of which ${coverage.sightedNonZero} measured anything other than exactly ` +
      'zero. A zero here is a real verdict: the ink sits where its own box puts it.'
  );
  lines.push(
    `- Readings where it is blind by construction (every member read exactly where its own box ` +
      `puts it, so the inset is structurally zero): ${coverage.blind}, of which ` +
      `${coverage.blindNonZero} measured anything other than exactly zero.` +
      (coverage.byClass.length > 0
        ? ` By class: ${coverage.byClass.map(([name, count]) => `${name} ${count}`).join(', ')}.`
        : '')
  );
  lines.push('');
  lines.push(
    'A control is the clearest case: its border box IS its reading, so `control-beside-text` under ' +
      '`flex-start` measures identically zero however the row is composed. The term is still taken ' +
      'there, because without it the raw delta (a 32px button top-aligned with a 17px line reads ' +
      '9px) is reported as a defect, which is the phantom the previous emission shipped. TASK 4 ' +
      'INHERITS THIS HOLE: the choice is to keep the term and state that a top-aligned pair of ' +
      'boxes is unjudged, or to narrow the branch and give those readings a third disposition that ' +
      'is neither a finding nor a clean bill. This run does the first.'
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
  lines.push(
    'Each fixture declares the largest composition term its own alignment can honestly ask for, ' +
      'which makes this check the guard on the decomposition as well: a rule that started ' +
      'explaining real defects away as composition fails here rather than quietly emptying the ' +
      'inventory. `season-row` centres and wraps nothing, so its bound is zero. `icon-card` ' +
      'TOP-ALIGNS, so it is the one positive control on the live corpus: the row takes a term and ' +
      'the defect survives it.'
  );
  lines.push('');
  for (const line of run.calibration) lines.push(line);
  lines.push('');
  lines.push('## The run');
  lines.push('');
  lines.push(`- Admin corpus: ${corpora.admin.length} screens at ${ADMIN_WIDTHS.join(', ')}px, both themes.`);
  lines.push(`- Public corpus: ${corpora.public.length} screens at ${PUBLIC_WIDTHS.join(', ')}px, both themes.`);
  lines.push(`- Renders measured: ${run.renders}. Pairs measured: ${run.measured}.`);
  lines.push(`- Visual rows walked: ${run.diagnostics.rowsWalked ?? 0}. Distinct compositions: ${walked.length}.`);
  lines.push(
    `- Rows above the ${VERTICAL_REPORTING_BAR_PX}px bar ON THE RESIDUAL: ${rows.length} ` +
      `(admin ${adminRows.length}, public ${publicRows.length}).`
  );
  lines.push(
    `- Rows whose RAW delta clears the bar and whose residual does not: ${phantoms.length}. Their ` +
      'composition explains them in full, and they are not inventoried.'
  );
  lines.push(`- Crops and the full per-pair record: \`${ARTIFACT_DIR}\`.`);
  lines.push('');
  lines.push(
    'A ROW HERE IS ONE VISUAL ROW, not one pair and not one render. A three-member row (a leading ' +
      'icon, a run of text, a trailing control) is two READINGS of one row, both listed under one ' +
      'entry: the first emission keyed on the pair and inventoried that row twice, with mirrored ' +
      'signs and identical magnitudes. The same row seen at several widths or in both themes is ' +
      'likewise one entry carrying every width and theme it was seen at.'
  );
  lines.push('');
  lines.push(
    `The full per-pair record, all ${run.measured} readings including every sub-bar one, is written ` +
      `to \`${resolve(ARTIFACT_DIR, 'measured-pairs.json')}\`. It carries each member's whole ` +
      'anchor (top, bottom, content centre, element centre, MEMBER BOX top and bottom, baseline, ' +
      'cap centre, PAINTED BOX centre, line count, block lift, the keyword that placed it) ' +
      'alongside the delta, the composition and the residual, so a ' +
      'disagreement about any reading here is settled by reading that file rather than by re-running ' +
      'the probe against a live preview.'
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
    'Sign: NEGATIVE means the left-hand member rides HIGH against the right-hand member; on an ' +
      'optical row, negative means the glyph rides high inside its own padding box. The RESIDUAL ' +
      'column is the reading each disposition rests on. Every row carries a disposition: a recipe ' +
      'task, or an explicit decline with its reason. No row reads "unknown".'
  );
  lines.push('');
  if (rows.length === 0) {
    lines.push('No row on either corpus carried a residual above the reporting bar.');
  } else {
    lines.push(
      '| # | Id | Surface | Screens / routes | Viewport | Theme | Component file | Pair class | Raw delta (px) | Composition (px) | Residual (px) | Crop | Disposition |'
    );
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    rows.forEach((row, position) => {
      const screens = [...row.screens].sort().join(', ');
      const widths = [...row.widths].sort((a, b) => b - a).join(', ');
      const themes = [...row.themes].sort().join(', ');
      const crop = row.crop ? `\`${resolve(ARTIFACT_DIR, 'crops', row.crop)}\`` : 'none (row off the captured page)';
      lines.push(
        `| ${position + 1} | \`${row.id}\` | ${row.surface} | ${cell(screens)} (\`${row.screen.path}\`) | ${widths} | ${themes} | ${cell(attributionCell(row))} | ${row.worst.pairClass} | ${range(row.worst.minDelta, row.worst.maxDelta)} | ${range(row.worst.minComposition, row.worst.maxComposition)} | ${range(row.worst.minResidual, row.worst.maxResidual)} | ${cell(crop)} | ${cell(row.disposition)} |`
      );
    });
  }
  lines.push('');
  lines.push('### What each row is');
  lines.push('');
  lines.push(
    'One line per READING. A row with more than one line is one composition measured at more than ' +
      'one pair of members, not more than one row. A row whose member list CHANGES with the viewport ' +
      '(a member hidden below a breakpoint) is two compositions and reports as two rows, which is ' +
      'why the same recipe can appear twice with different widths: the members column shows the ' +
      'difference.'
  );
  lines.push('');
  lines.push(
    '| # | Id | Row container | Members | Reading | Left member | Right member | Shape | `align-items` |'
  );
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  rows.forEach((row, position) => {
    const describe = (anchor) =>
      `${anchor.kind}/${anchor.geometry} \`${anchor.selector}\`${anchor.text ? ` "${anchor.text}"` : ''}` +
      (anchor.lineCount > 1 ? ` (${anchor.lineCount} lines, lift ${anchor.blockLiftPx}px)` : '');
    for (const reading of [...row.readings.values()].sort(
      (one, other) => other.worstResidualMagnitude - one.worstResidualMagnitude
    )) {
      lines.push(
        `| ${position + 1} | \`${row.id}\` | \`${cell(row.rowSelector)}\` | ${cell(row.rowMembers.join(' + '))} | ${range(reading.minResidual, reading.maxResidual)}px residual | ${cell(describe(reading.sample.a))} | ${cell(describe(reading.sample.b))} | ${reading.shape} | ${row.alignItems} |`
      );
    }
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
  if (publicRows.length === 0) {
    lines.push(
      'NO PUBLIC ROW CLEARS THE BAR, so task 3 (the Waymark chassis) inherits no measured row from ' +
        'this inventory. That is a result rather than an omission, and it is worth saying out loud: ' +
        "the one public row a previous emission carried was the footer masthead (`dabaf490`, the " +
        'wordmark beside the nav links), and it left because the metric was corrected, not because ' +
        'a recipe landed. Measured at centres it sits within a pixel of true at 390, 768, 1440 and ' +
        '2560px in both themes.'
    );
    lines.push('');
  }
  lines.push(
    'A decline is one of two things, and each row says which. A MECHANICAL decline is the ' +
      'measurement disqualifying its own reading (an icon with no reachable painting geometry, so ' +
      'the number is a border box rather than ink). A REVIEWED decline is a design call the ' +
      'arithmetic cannot reach, ruled on after reading the crop. The reviewed rulings live in the ' +
      'probe (`REVIEWED_DISPOSITIONS`), keyed by the Id column, because a re-run overwrites this ' +
      'file and a ruling kept only here would be erased by the run that is supposed to verify it.'
  );
  lines.push('');
  lines.push(
    'The Id is built from the row container\'s TAG and its members\' kinds and rendered text, never ' +
      'from classes. Tasks 2 and 3 change classes, so a class-bearing key would silently drop every ' +
      'ruling on the verification re-run and re-report those rows as fresh recipe work. A ruling ' +
      'whose Id no longer resolves is reported below rather than dropped.'
  );
  lines.push('');
  const unresolvedRulings = Object.keys(REVIEWED_DISPOSITIONS).filter((key) => !run.rows.has(key));
  const spentRulings = Object.keys(REVIEWED_DISPOSITIONS).filter(
    (key) => run.rows.has(key) && !rows.some((row) => row.id === key)
  );
  lines.push('### Ruling keys');
  lines.push('');
  if (Object.keys(REVIEWED_DISPOSITIONS).length === 0) {
    lines.push('No reviewed ruling is in force: every row above the bar is dispositioned mechanically.');
  } else if (unresolvedRulings.length === 0 && spentRulings.length === 0) {
    lines.push(`All ${Object.keys(REVIEWED_DISPOSITIONS).length} reviewed rulings resolved to a row in this run.`);
  } else {
    for (const key of unresolvedRulings) {
      lines.push(
        `- \`${key}\`: RULING KEY NO LONGER RESOLVES. No row in this run carries it, so the ruling ` +
          'is not in force and whatever row it described is being dispositioned by its shape. ' +
          'Re-read the composition before trusting this run.'
      );
    }
    for (const key of spentRulings) {
      lines.push(
        `- \`${key}\`: the row still exists and now measures within the bar, so the ruling is no ` +
          'longer needed. Remove it once the recipe that made it unnecessary has landed.'
      );
    }
  }
  lines.push('');
  lines.push('### Rows the composition explains in full');
  lines.push('');
  lines.push(
    `${phantoms.length} rows carry a raw delta above the bar and a residual within it: a row that ` +
      'centres its members on a block its text wraps, or one that top-aligns a member taller than ' +
      'the line beside it, which is what the two composition terms are for. The `align-items` ' +
      'column says which. They are listed rather than omitted, because an earlier emission reported ' +
      'each shape as a defect and a reader comparing the documents is owed the reason they left.'
  );
  lines.push('');
  if (phantoms.length > 0) {
    lines.push('| Id | Surface | Members | Component file | Raw delta reach (px) | Worst residual (px) | `align-items` |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const row of phantoms.sort((one, other) => rawReachOf(other) - rawReachOf(one)).slice(0, 40)) {
      row.attribution = attributeRow(index, row);
      lines.push(
        `| \`${row.id}\` | ${row.surface} | ${cell(row.rowMembers.join(' + '))} | ${cell(attributionCell(row))} | ${round(rawReachOf(row))} | ${round(row.worst.worstResidualMagnitude)} | ${row.alignItems} |`
      );
    }
    if (phantoms.length > 40) lines.push(`| ... ${phantoms.length - 40} more | | | | | | |`);
  }
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
  lines.push(
    'Taken on the RESIDUAL. A recipe whose label wraps has a padding box spanning every line and a ' +
      'glyph reading on the first, which reads as half a block of optical offset with nothing ' +
      'misconfigured; that term is composition and is subtracted here.'
  );
  lines.push('');
  lines.push('| Recipe | Readings | Median offset (px) | Max magnitude (px) |');
  lines.push('| --- | --- | --- | --- |');
  const opticalByRecipe = new Map();
  for (const entry of run.record) {
    if (entry.pairClass !== 'optical-suspect') continue;
    const recipe = entry.rowClasses.split(/\s+/).filter(Boolean).slice(0, 3).join(' ') || entry.rowSelector;
    const bucket = opticalByRecipe.get(recipe) ?? [];
    bucket.push(entry.residualPx);
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

  // The decomposition's own landing error, measured rather than assumed. A reading this run
  // rendered BOTH wrapped (a composition term is taken) and unwrapped (none is) is a within-reading
  // control on the term: the decomposition claims both leave the same residual, so the distance
  // between them is the method's error. No selection on either variable enters, which is what the
  // previous emission's floor could not say.
  const drift = driftAcrossCompositions(run.record);
  const driftMax = drift.length > 0 ? drift[0].px : 0;
  const floor = Math.max(jitter, driftMax);
  const dispositioned = new Set([...rows.map((row) => row.id), ...phantoms.map((row) => row.id)]);
  const confirmedReach = rows
    .filter((row) => !row.disposition.startsWith('DECLINE'))
    .reduce((best, row) => Math.min(best, row.worst.worstResidualMagnitude), Infinity);
  const unsized = walked
    .filter(
      (row) =>
        !dispositioned.has(row.id) &&
        row.worst.worstResidualMagnitude > floor &&
        row.worst.worstResidualMagnitude <= VERTICAL_REPORTING_BAR_PX
    )
    .sort((one, other) => other.worst.worstResidualMagnitude - one.worst.worstResidualMagnitude);
  const undispositionedAboveFloor = unsized.length;

  lines.push('## Noise floor');
  lines.push('');
  lines.push(
    'The rendered rule sets its firing threshold from THESE numbers, not from the placeholder 4px. ' +
      'The distribution is over the UNCENSORED population: every reading in the run, not the slice ' +
      `at or under the ${VERTICAL_REPORTING_BAR_PX}px bar. The first emission reported "p99 ` +
      `${VERTICAL_REPORTING_BAR_PX}px, max ${VERTICAL_REPORTING_BAR_PX}px" over a slice DEFINED as ` +
      'at or under that bar, which is circular and supports no threshold at all.'
  );
  lines.push('');
  lines.push(
    `- Repeatability: ${run.repeatability.length} readings measured twice on one page, max ` +
      `delta-of-deltas ${jitter}px. Nothing above that is measurement noise.`
  );
  lines.push(`- Population: all ${run.residualMagnitudes.length} readings in the run.`);
  lines.push(`- ${distributionLine('Raw magnitude', run.magnitudes)}`);
  lines.push(`- ${distributionLine('Residual magnitude', run.residualMagnitudes)}`);
  lines.push('');
  lines.push('| Candidate threshold | Readings above it | Rows above it | Rows above it this run does not disposition |');
  lines.push('| --- | --- | --- | --- |');
  // A row this run dispositions is one of the two the sections above name: inventoried above the
  // bar, or explained in full by its composition. Anything else above a candidate threshold is work
  // nobody has sized, which is exactly what a threshold below the bar would start reporting.
  for (const candidate of [1, 1.5, 2, 2.5, 3, 4, 5]) {
    const readings = run.residualMagnitudes.filter((value) => value > candidate).length;
    const aboveRows = walked.filter((row) => row.worst.worstResidualMagnitude > candidate);
    const undispositioned = aboveRows.filter((row) => !dispositioned.has(row.id)).length;
    lines.push(`| ${candidate}px | ${readings} | ${aboveRows.length} | ${undispositioned} |`);
  }
  lines.push('');
  lines.push(
    'NEITHER DISTRIBUTION IS A NOISE FLOOR. The full distribution contains the defects, so its own ' +
      'p99 is pulled up by them, and any statistic over "the readings under the bar" is a statistic ' +
      'about the bar. Nor is the residual spread of the composition-explained rows a floor, which ' +
      'is what the previous emission used: that set is defined as raw above the bar AND residual ' +
      'within it, so its maximum is bounded by the bar BY CONSTRUCTION and is a lower bound rather ' +
      'than an estimate of anything. Its largest readings are not method error either; they are ' +
      'constant offsets that the same rows also read at the widths where nothing wraps and no term ' +
      'is taken at all.'
  );
  lines.push('');
  lines.push(
    'The population that does answer the question is a WITHIN-READING one, and it needs no ' +
      'selection at all: any reading this run measured both wrapped (a composition term is taken) ' +
      'and unwrapped (none is). The decomposition claims those two renderings leave the same ' +
      'residual, so how far apart they land IS the method\'s own error, measured on the corpus ' +
      'rather than assumed.'
  );
  lines.push('');
  lines.push(
    `- ${drift.length} readings render both ways in this run. Landing error, wrapped against ` +
      `unwrapped: max ${round(driftMax)}px, median ${round(percentile(drift.map((entry) => entry.px), 0.5))}px.`
  );
  for (const entry of drift.slice(0, 3)) {
    lines.push(
      `  - \`${entry.rowId}\` ${cell(entry.reading)}: ${round(entry.wrapped)}px wrapped over ` +
        `${entry.wrappedCount} readings, ${round(entry.plain)}px unwrapped over ${entry.plainCount}.`
    );
  }
  lines.push('');
  lines.push(
    `The floor this run supports is ${round(floor)}px: the larger of run-to-run jitter (${jitter}px) ` +
      `and the decomposition's own landing error (${round(driftMax)}px). Everything above that is a ` +
      'REPRODUCIBLE offset rather than noise, including the 1 to 1.5px readings the previous ' +
      'emission called a floor, which hold to the hundredth across five widths and both themes.'
  );
  lines.push('');
  lines.push(
    confirmedReach === Infinity
      ? 'No confirmed defect remains above the bar, so this run sets no upper end on the window and ' +
          'a threshold has to be argued from the calibration fixtures instead.'
      : `The smallest confirmed defect measures ${round(confirmedReach)}px, so the window a ` +
        `threshold can sit in is [${round(floor)}, ${round(confirmedReach)}), which is wide. WHAT ` +
        'CONSTRAINS THE CHOICE INSIDE IT IS POLICY, NOT PRECISION: whether an offset of one or two ' +
        'pixels that holds at every width is worth a finding. The cost of each candidate is the ' +
        'last column above, and it is not zero anywhere below the bar: ' +
        `${undispositionedAboveFloor} rows in total sit between the floor and the ` +
        `${VERTICAL_REPORTING_BAR_PX}px bar that this run neither inventories nor explains away, so ` +
        'a threshold under the bar starts reporting work nobody has sized. Task 4 picks inside the ' +
        'window and records what it gives up at the top and takes on at the bottom.'
  );
  lines.push('');
  if (unsized.length > 0) {
    lines.push('### Rows between the floor and the bar, unsized');
    lines.push('');
    lines.push(
      'Neither inventoried nor explained: their residual clears the floor and stays within the bar, ' +
        'so no disposition above covers them. They are listed so a threshold below the bar is chosen ' +
        'with them in view rather than discovered by the re-run, and every row reaching ' +
        `${BAND_CROP_FLOOR_PX}px carries a crop, so sizing one is a matter of opening it.`
    );
    lines.push('');
    lines.push(
      'ONE FAMILY LEFT THIS TABLE AT THIS EMISSION, and how it left is the warning the next reader ' +
        'needs. Fifteen `ConceptList` rows read EXACTLY 1.55px each, in one shape, which looked like ' +
        'a family of latent work sitting just under the bar. They were the metric defect above: a ' +
        'status chip beside a date cell in a `vertical-align: middle` row, scored on baselines, ' +
        'where the 1.55px was the cap-height ratio between 10px chip type and 13px cell type and ' +
        'nothing else. Read at centres they measure 0.05px, the chip box against the date\'s cap ' +
        'band, and the crop shows the chip optically centred on the date. THEY ARE NOT THE SAME ' +
        'DEFECT as the three `CairnTidySettings` rows above, which miss a baseline their own row ' +
        'declared. A row sitting under the bar is not evidence of anything until its metric is right.'
    );
    lines.push('');
    lines.push(
      'ONE FAMILY ARRIVED IN THE SAME CORRECTION, and it is the honest cost of it. The eight ' +
        '`CairnMediaLibrary` rows at the top of this table are an outlined status pill beside a ' +
        'media title in a centred row, and reading the pill at its painted box is what made them ' +
        'visible: the outline sits 1.88px below the title\'s cap band, because the pill is an ' +
        '`inline-flex` on a 16px line box inside a 10px chip. Under the old metric they read as two ' +
        'runs of text on a shared baseline and measured nothing. The crop at 5x shows the pill ' +
        'sitting a touch low, which is what 1.88px looks like. They stay under the bar and stay ' +
        'unsized here, but a threshold at 1.5px adopts all eight and they are one recipe, not eight.'
    );
    lines.push('');
    lines.push('| Id | Surface | Members | Component file | Worst residual (px) | Pair class | `align-items` | Crop |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const row of unsized.slice(0, 25)) {
      row.attribution = attributeRow(index, row);
      const crop = row.crop ? `\`${resolve(ARTIFACT_DIR, 'crops', row.crop)}\`` : 'none';
      lines.push(
        `| \`${row.id}\` | ${row.surface} | ${cell(row.rowMembers.join(' + '))} | ${cell(attributionCell(row))} | ` +
          `${round(row.worst.worstResidualMagnitude)} | ${row.worst.pairClass} | ${row.alignItems} | ${cell(crop)} |`
      );
    }
    if (unsized.length > 25) lines.push(`| ... ${unsized.length - 25} more | | | | | | | |`);
    lines.push('');
  }

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
    residualMagnitudes: [],
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
    });
    await sweep({
      browser,
      surface: 'public',
      screens: corpora.public,
      widths: PUBLIC_WIDTHS,
      themes: PUBLIC_THEMES,
      run,
    });
  } finally {
    await browser.close();
  }

  writeFileSync(resolve(ARTIFACT_DIR, 'measured-pairs.json'), `${JSON.stringify(run.record, null, 2)}\n`, 'utf8');
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  const doc = renderDoc(run, corpora, index);
  writeFileSync(DOC_PATH, doc, 'utf8');
  const above = [...run.rows.values()].filter(
    (row) => row.worst.worstResidualMagnitude > VERTICAL_REPORTING_BAR_PX
  );
  // A ruling that no longer resolves is the one failure a reader of the doc could miss, so it is
  // said on the console too: the re-run that verifies tasks 2 and 3 is where this bites.
  for (const key of Object.keys(REVIEWED_DISPOSITIONS)) {
    if (run.rows.has(key)) continue;
    console.error(
      `probe-vertical-alignment: RULING KEY NO LONGER RESOLVES: ${key}. Its row is absent from ` +
        'this run, so the ruling is not in force.'
    );
  }
  console.log(
    `probe-vertical-alignment: ${run.measured} readings over ${run.renders} renders; ` +
      `${run.rows.size} distinct compositions; ${above.length} rows above ${VERTICAL_REPORTING_BAR_PX}px on the residual`
  );
  console.log(`probe-vertical-alignment: wrote ${relative(ROOT, DOC_PATH)} and artifacts under ${ARTIFACT_DIR}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`probe-vertical-alignment: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  });
}
