// Every input an adversarial pass demonstrated against Task 16's five advisory rendered rules,
// preserved as the regression fixture for the fix that closed it. All five rules were refuted
// against real Chromium driving the shipped admin, 39 findings in total, and the inputs below are
// the ones that survived adjudication: each is markup that produced a wrong verdict, a silent skip,
// or a leak from advisory into the process exit code.
//
// The suite is real Chromium, never a `page.evaluate` double. That is not a style preference: the
// six error-tier rules shipped GREEN under evaluate doubles, and two of them threw ReferenceError
// on every real page and had never once executed in a browser.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { exitCodeFor } from '../../../../../lib/audit/report.js';
import { borderContrast } from '../../../../../lib/audit/rules/rendered/border-contrast.js';
import { normsBands, evaluateNormsBandCandidate } from '../../../../../lib/audit/rules/rendered/norms-bands.js';
import { relationalSpacing } from '../../../../../lib/audit/rules/rendered/relational-spacing.js';
import { screenAnatomy } from '../../../../../lib/audit/rules/rendered/screen-anatomy.js';
import { weightBudget } from '../../../../../lib/audit/rules/rendered/weight-budget.js';
import { loadNormsManifest } from '../../../../../lib/audit/norms.js';
import { resolveRenderedFindings, runRendered } from '../../../../../lib/audit/rendered.js';
import type {
  RenderedBrowser,
  RenderedContext,
  RenderedFinding,
  RenderedPage,
  RenderedRule,
} from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/** Runs `rule` against `html` in a real page and returns what it found. */
async function findingsFor(
  rule: RenderedRule,
  html: string,
  pagePath = '/fixture',
  contextOptions: Parameters<Browser['newContext']>[0] = {}
): Promise<RenderedFinding[]> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...contextOptions });
  const page = await context.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await rule.check({
      page: page as unknown as RenderedPage,
      pagePath,
      theme: 'light',
      state: 'rest',
      config,
    });
  } finally {
    await context.close();
  }
}

const messages = (findings: RenderedFinding[]) => findings.map((finding) => finding.message);

/** A config that visits exactly `pages` and allows nothing, for the runner-level exit-code proof. */
function configWithPages(pages: string[]) {
  return resolveConfig('/audit-fixture', { rendered: { pages } }, () => true);
}

/** The smallest Playwright stand-in `runRendered` can drive: every page loads and evaluates to nothing. */
function fakePlaywright(): { chromium: { launch: () => Promise<RenderedBrowser> } } {
  const page = {
    async goto() {
      return { status: () => 200 };
    },
    async evaluate() {
      return undefined;
    },
    keyboard: { press: async () => {} },
    viewportSize: () => ({ width: 1280, height: 800 }),
    async setViewportSize() {},
    async close() {},
  } as unknown as RenderedPage;
  const context = {
    async addCookies() {},
    async newPage() {
      return page;
    },
    async close() {},
  } as unknown as RenderedContext;
  const instance = {
    async newContext() {
      return context;
    },
    async close() {},
  } as unknown as RenderedBrowser;
  return { chromium: { launch: async () => instance } };
}

// cairn-admin.css's own grammar-token declaration, so every fixture measures against the four
// values a real admin page renders.
const GAP_TOKENS = `<style>:root{--cairn-gap-label:0.25rem;--cairn-gap-control:0.5rem;--cairn-gap-group:1rem;--cairn-gap-section:1.5rem}</style>`;

describe('relational-spacing: the refuted inputs', () => {
  // One overlapping pair earlier in a list discarded the WHOLE group, so a genuine 24px break
  // later in the same list disappeared. On the shipped admin this swallowed four of the five
  // sibling groups the rule ever found.
  it('keeps reporting a group\'s real gap break when an earlier pair overlaps', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0"><div>
         <div class="field-row" style="height:20px">One</div>
         <div class="field-row" style="height:20px;margin-top:-30px">Two</div>
         <div class="field-row" style="height:20px;margin-top:8px">Three</div>
         <div class="field-row" style="height:20px;margin-top:8px">Four</div>
         <div class="field-row" style="height:20px;margin-top:24px">Five</div>
       </div></body>`
    );
    expect(messages(findings)).toEqual([
      expect.stringContaining('OVERLAPS its preceding same-level sibling'),
      expect.stringContaining('sits 24px from its preceding same-level sibling'),
    ]);
  });

  // A median of zero (flush rows separated by dividers, a real list idiom) disabled the check
  // entirely, and the arity decided the verdict: three rows reported, four reported nothing.
  it('reads a flush row group as a rhythm rather than abstaining on a zero median', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0"><ul style="margin:0;padding:0;list-style:none">
         <li class="row" style="height:20px"></li>
         <li class="row" style="height:20px"></li>
         <li class="row" style="height:20px"></li>
         <li class="row" style="height:20px"></li>
         <li class="row" style="height:20px;margin-top:24px"></li>
       </ul></body>`
    );
    expect(messages(findings)).toEqual([
      expect.stringContaining("sits 24px from its preceding same-level sibling"),
    ]);
  });

  // A wrapping same-signature card grid (the media library's own shape) produces one negative gap
  // per wrap, and one was enough to abstain on the whole group no matter how broken its rhythm.
  it('excludes the wrap boundary rather than the whole wrapping group', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0"><div style="display:block;width:300px">
         <span class="card" style="display:inline-block;width:80px;height:40px"></span>
         <span class="card" style="display:inline-block;width:80px;height:40px;margin-left:64px"></span>
         <span class="card" style="display:inline-block;width:80px;height:40px"></span>
         <span class="card" style="display:inline-block;width:80px;height:40px"></span>
         <span class="card" style="display:inline-block;width:80px;height:40px"></span>
       </div></body>`
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(messages(findings).join(' ')).toContain('from its preceding same-level sibling');
  });

  // Row gap and column gap differing by more than half a pixel skipped the box outright, which is
  // the normal shape of a grid: 13 real admin boxes were dropped without a word against the 8 the
  // heuristic actually compared, including `/admin/vocabulary`'s 16px gap-group column rhythm.
  it('measures a nested rhythm on an axis whose sibling axis differs', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0">
         <div class="outer" style="display:flex;flex-direction:column;row-gap:16px;column-gap:16px">
           <div style="height:20px">A</div>
           <div class="inner" style="display:grid;row-gap:24px;column-gap:8px">
             <div style="height:20px">1</div><div style="height:20px">2</div>
           </div>
         </div></body>`
    );
    expect(messages(findings)).toEqual([expect.stringContaining('gap-section row rhythm (24px)')]);
  });

  // Chromium ships `input[type=checkbox] { margin: 3px 3px 3px 4px }`, so perfectly-authored
  // gap-label markup measured 8px edge to edge and was reported as gap-control: the finding's own
  // diagnosis was wrong, and the verdict changed with the control TYPE, not with the authoring.
  it('subtracts a control\'s user-agent margins before judging the label distance', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0">
         <label class="check-row" style="display:flex;flex-direction:column;gap:4px">
           <span>Published</span><input type="checkbox">
         </label>
         <label class="radio-row" style="display:flex;flex-direction:column;gap:4px">
           <span>Draft</span><input type="radio">
         </label></body>`
    );
    expect(findings).toEqual([]);
  });

  // The design system states the label-gap distance for a label ABOVE its control. Extending it to
  // any text-then-control row on either axis flagged every horizontal caption/control pair in the
  // admin under a message claiming the grammar names that distance, and it does not. The same
  // extrapolation reported an entire `dir="rtl"` document clean, since every horizontal
  // measurement there is negative.
  it('makes no claim about a horizontal caption-and-control row, in either direction', async () => {
    const html = (dir: string) =>
      `${GAP_TOKENS}<body style="margin:0" dir="${dir}">
         <div class="page-size" style="display:flex;flex-direction:row;align-items:center;gap:8px">
           <span>Rows per page</span><select><option>25</option></select>
         </div></body>`;
    expect(await findingsFor(relationalSpacing, html('ltr'))).toEqual([]);
    expect(await findingsFor(relationalSpacing, html('rtl'))).toEqual([]);
  });

  // An overlap is a worse spacing defect than the wrong-token case this heuristic was written for,
  // and it reported clean: a negative measured distance was silently skipped.
  it('reports a label that overlaps its own control', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0">
         <label class="field" style="display:flex;flex-direction:column;gap:4px">
           <span>Title</span><input type="text" style="margin-top:-14px">
         </label></body>`
    );
    expect(messages(findings)).toEqual([expect.stringContaining('OVERLAPS its control')]);
  });

  // An out-of-flow panel is not laid out by the ancestor's gap at all. The daisyUI dropdown idiom
  // and a fixed command palette both reported a containment violation for a panel nothing visually
  // contains.
  it('makes no containment claim about an absolute or fixed panel', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0">
         <div class="dropdown" style="position:relative;display:flex;flex-direction:column;gap:4px">
           <button>Actions</button>
           <ul class="dropdown-content" style="position:absolute;top:100%;left:0;display:flex;flex-direction:column;gap:24px">
             <li style="height:20px">Rename</li><li style="height:20px">Delete</li>
           </ul>
         </div>
         <div class="shell" style="display:flex;flex-direction:column;gap:4px">
           <span class="palette" style="position:fixed;top:10px;left:10px;display:flex;flex-direction:column;gap:24px">
             <span style="height:20px">One</span><span style="height:20px">Two</span>
           </span>
         </div></body>`
    );
    expect(findings).toEqual([]);
  });
});

describe('screen-anatomy: the refuted inputs', () => {
  const THEME = `<style>
    [data-theme='cairn-admin']{--color-primary:oklch(52% 0.2 293);--color-neutral:oklch(26% 0.014 75)}
    .btn{border:0;padding:8px 16px;font:500 14px system-ui}
    .btn-primary{background-color:var(--color-primary);color:#fff}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}
  </style>`;
  const office = (main: string, theme = "cairn-admin") =>
    `${THEME}<body style="margin:0"><div data-theme="${theme}"><div class="drawer lg:drawer-open">${main}</div></div></body>`;
  const HEADER = '<header><h1 class="page-h1">Posts</h1></header>';
  const CARD = '<div class="card-shell"><p>Rows go here.</p></div>';

  // A fill the rule could not read was dropped with no trace. Both of these render a visibly
  // accent-filled control outside header and card, and both reported clean.
  it('reports an accent fill delivered as a gradient rather than dropping it', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      office(`<main>${HEADER}${CARD}
        <button class="btn">New post</button></main>`).replace(
        '<button class="btn">',
        '<button class="btn" style="background-color:transparent;background-image:linear-gradient(var(--color-primary),var(--color-primary))">'
      )
    );
    expect(messages(findings)).toEqual([expect.stringContaining('could not measure this element\'s ground')]);
  });

  it('reports a filled control on a page where the theme tokens do not resolve', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      `${THEME}<body style="margin:0"><div class="drawer lg:drawer-open"><main>${HEADER}${CARD}
        <button style="background-color:oklch(52% 0.2 293);color:#fff">New post</button></main></div></body>`
    );
    expect(messages(findings)).toEqual([expect.stringContaining('could not measure this element\'s ground')]);
  });

  // `label.btn` is daisyUI's canonical dialog opener and cairn's own shell ships one; a hand-rolled
  // accent-filled anchor carries no `.btn` at all. Neither could be seen.
  it('sees a label.btn and a bare accent anchor as actions', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      office(`<main>${HEADER}${CARD}
        <label class="btn btn-primary">New post</label>
        <a href="/admin/posts/new" style="background-color:var(--color-primary);color:#fff">Also new</a></main>`)
    );
    expect(findings).toHaveLength(2);
    expect(messages(findings).join(' ')).toContain('renders outside both the header and any .card-shell region');
  });

  // `closest` includes the element itself, so a control carrying `card-shell` exempted ITSELF.
  it('does not let a control exempt itself by carrying card-shell', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      office(`<main>${HEADER}${CARD}
        <button class="btn btn-primary card-shell">New post</button></main>`)
    );
    expect(findings).toHaveLength(1);
  });

  // Any section-level `<header>` a developer writes laundered a buried primary action.
  it('exempts only PageHeader\'s own header, not any nested one', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      office(`<main>${HEADER}${CARD}
        <section><header><button class="btn btn-primary">New post</button></header></section></main>`)
    );
    expect(findings).toHaveLength(1);
  });

  // A hidden card satisfied "content sits in the card region": the card test used a plain
  // querySelector where every other check in the same walk applied a visibility filter.
  it('does not accept a hidden card as the card region', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      office(`<main>${HEADER}<div class="card-shell" style="display:none"><p>Rows.</p></div></main>`)
    );
    expect(messages(findings)).toEqual([expect.stringContaining('no .card-shell region')]);
  });

  // `sr-only` is a 1x1 clipped box, and counting it as rendered produced a false "2 <h1> elements"
  // on the real desk route and, in the mirror case, reported a page whose ONLY heading is invisible
  // as clean.
  it('counts neither an sr-only h1 nor an h1 outside main', async () => {
    const extra = await findingsFor(
      screenAnatomy,
      office(`<main>${HEADER}${CARD}<h1 class="sr-only">Posts</h1></main>`)
    );
    expect(extra).toEqual([]);

    const outside = await findingsFor(
      screenAnatomy,
      `${THEME}<body style="margin:0"><div class="drawer lg:drawer-open"><h1>Custom shell heading</h1>
         <main>${HEADER}${CARD}</main></div></body>`
    );
    expect(outside).toEqual([]);

    const onlyHidden = await findingsFor(
      screenAnatomy,
      office(`<main><header><h1 class="sr-only">Posts</h1></header>${CARD}</main>`)
    );
    expect(messages(onlyHidden)).toEqual([expect.stringContaining('no <h1> renders')]);
  });

  // An unnamed control was dropped by an unspecified filter, so an icon-only accent button was
  // outside the audit entirely.
  it('reports an icon-only accent control under its own selector', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      office(`<main>${HEADER}${CARD}
        <button class="btn btn-primary" id="add"><svg width="16" height="16"></svg></button></main>`)
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].selector).toContain('#add');
  });
});

describe('weight-budget: the refuted inputs', () => {
  const SR_ONLY = `<style>.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}</style>`;

  // `ConceptList` ships `<th><span class="sr-only">Actions</span>`, a UA-bold cell whose only text
  // is screen-reader-only, and it was the SOLE contributor of the fourth weight this rule reported
  // on three real admin routes.
  it('does not let screen-reader-only or fully transparent text spend the budget', async () => {
    const findings = await findingsFor(
      weightBudget,
      `${SR_ONLY}<body><main>
         <p style="font-weight:400">Body copy.</p>
         <p style="font-weight:500">Second weight.</p>
         <span class="sr-only" style="font-weight:700">Actions</span>
         <div style="opacity:0"><strong style="font-weight:800">Invisible</strong></div>
       </main></body>`
    );
    expect(findings).toEqual([]);
  });

  // cairn ships `<h1 class="sr-only">` on the desk route. Counting it as a region splitter erased a
  // real violation without changing anything visible.
  it('does not let an sr-only heading split a region', async () => {
    const findings = await findingsFor(
      weightBudget,
      `${SR_ONLY}<body><main>
         <p style="font-weight:400">Body copy.</p>
         <h1 class="sr-only">Untitled post</h1>
         <label style="font-weight:500">Field label.</label>
         <strong style="font-weight:700">Emphasis.</strong>
       </main></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('3 distinct font-weights');
  });

  // `MediaInsertPopover` is a `role="dialog"` panel rendered INSIDE main. Treating it as a layer
  // over the page deleted the region it belongs to.
  it('does not let a dialog nested inside main delete main', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <p style="font-weight:400">Body copy.</p>
         <label style="font-weight:500">Field label.</label>
         <strong style="font-weight:700">Emphasis.</strong>
         <div role="dialog" aria-label="Insert image"><p style="font-weight:400">Pick an image.</p></div>
       </main></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].selector).toBe('main');
  });

  // An unhydrated `<main>` returned an empty candidate list, and an empty result reads exactly like
  // "measured, and clean" in the report.
  it('says so when an identified region carries nothing to measure', async () => {
    const findings = await findingsFor(weightBudget, `<body><main><div id="app"></div></main></body>`);
    expect(messages(findings)).toEqual([expect.stringContaining('no visible text at all')]);
  });

  // A variable-font ramp serialized 400/410/420 and read as three violations of a two-weight
  // budget while reading as one weight to any eye.
  it('counts a variable-font ramp on the hundreds ladder', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <p style="font-weight:400">One.</p>
         <p style="font-weight:410">Two.</p>
         <p style="font-weight:420">Three.</p>
       </main></body>`
    );
    expect(findings).toEqual([]);
  });
});

describe('border-contrast: the refuted inputs', () => {
  // The verdict flip measured on `/admin/media` in both themes: the type badge is overlaid on a
  // thumbnail, and its border was scored against the card fill behind the thumbnail. Reported 1.15
  // where the painted pixels measure 3.63.
  it('measures an overlaid badge against the thumbnail it actually sits on', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background:rgb(249,246,243)">
         <div style="position:relative;width:240px;height:140px">
           <div style="position:absolute;inset:0;background:rgb(187,93,31)"></div>
           <span class="badge" style="position:absolute;right:12px;top:12px;padding:2px 6px;border:1px solid rgb(249,246,243)">JPG</span>
         </div></body>`
    );
    expect(findings.filter((finding) => finding.selector.includes('badge'))).toEqual([]);
  });

  // The mirror case, and the worse one: a divider between two opaque rows whose painted contrast is
  // 1.00, invisible to any user, reported clean because neither adjacent row is an ancestor.
  it('catches a divider that vanishes between the two rows it separates', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background:oklch(99% 0.004 75)">
         <table style="border-collapse:separate;border-spacing:0;width:400px"><tbody>
           <tr><td style="background:oklch(26% 0.014 75);color:#fff;height:60px;border-bottom:4px solid oklch(27% 0.014 75)">Row 1</td></tr>
           <tr><td style="background:oklch(26% 0.014 75);color:#fff;height:60px">Row 2</td></tr>
         </tbody></table></body>`
    );
    expect(messages(findings)).toEqual([expect.stringContaining('renders no visible boundary on either side')]);
  });

  // `background-clip` defaults to `border-box`, so an element's own fill paints under its own
  // border. Compositing the stroke over the ancestor instead reported 1.08 for a boundary the
  // painted pixels measure at 21:1.
  it('composites a translucent stroke over the element\'s own fill', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background:#000000">
         <div id="card" style="background:#ffffff;border:12px solid rgba(255,255,255,0.05);width:200px;height:100px;margin:40px"></div></body>`
    );
    expect(findings).toEqual([]);
  });

  // `relativeLuminance` discards alpha, so a translucent ground measured as a color nobody sees: a
  // black border on a 50%-black panel over white reported 1.00 where the pixels measure 5.24.
  it('resolves a translucent ground onto the canvas before measuring', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0"><div style="background:rgba(0,0,0,0.5);padding:30px;width:300px">
         <div id="b" style="border:6px solid #000000;width:150px;height:60px"></div></div></body>`
    );
    expect(findings.filter((finding) => finding.selector.includes('#b'))).toEqual([]);
  });

  // The canvas is not white under `color-scheme: dark`, and assuming it was reported an invisible
  // 1.09 boundary as clean.
  it('reads the page canvas from the used color-scheme', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<html style="color-scheme:dark"><body style="margin:0">
         <div id="panel" style="border:8px solid #1b1b1b;width:200px;height:100px;margin:40px"></div></body></html>`,
      '/fixture',
      { colorScheme: 'dark' }
    );
    expect(messages(findings)).toEqual([expect.stringContaining('renders no visible boundary on either side')]);
  });

  // `border-image` paints OVER `border-color`, so the computed color is not what renders: a
  // near-white border under a black gradient border image reported 1.01 where the pixel is black.
  it('does not judge a border whose paint comes from a border-image', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background:#ffffff">
         <div id="bi" style="border:8px solid #fefefe;border-image:linear-gradient(90deg,#000,#000) 8;width:120px;height:60px"></div></body>`
    );
    expect(findings.filter((finding) => finding.selector.includes('#bi'))).toEqual([]);
  });

  // An element invisible under an ancestor `opacity: 0` still raised a finding, because the
  // visibility test read the element's own opacity while the ground arithmetic read the chain's.
  it('does not judge an element hidden by an ancestor opacity', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background:#ffffff"><div style="opacity:0">
         <div class="ghost" style="border:2px solid #fdfdfd;width:100px;height:40px"></div></div></body>`
    );
    expect(findings).toEqual([]);
  });

  // The one border-contrast refutation this suite REJECTS, kept as the evidence for rejecting it. A
  // sub-pixel width was reported as a false positive on the reasoning that `border-width: 0.05px`
  // renders nothing. Chromium computes it as `1px` and paints it, so a near-white 1px line on white
  // is a boundary no user can see, and reporting it is correct.
  it('reports a width Chromium rounds up to a painted pixel', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background:#ffffff">
         <div id="hair" style="border:0.05px solid #fdfdfd;width:100px;height:40px"></div></body>`
    );
    expect(findings.map((finding) => finding.selector)).toContain('div#hair');
  });

  // The ratified hairline still reports under the two-sided reading, and the number on record
  // (1.11 in light) is still the number in the message. Do not allowlist this into silence.
  it('still reports the ratified card hairline at its number on record', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background:oklch(96.5% 0.006 75)">
         <div class="card-shell" style="background:oklch(99% 0.004 75);border:1px solid oklch(93% 0.008 75);width:300px;height:120px;margin:20px"></div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('contrast 1.11');
  });
});

describe('norms-bands: the refuted inputs', () => {
  const manifest = loadNormsManifest();

  // The generator rejects only a zero box; the rule rejected `visibility: hidden` too. The admin's
  // picker dialogs render their contents hidden with a full box, so the generator measured them and
  // the rule could not: on /admin/posts and /admin/pages that left ZERO auditable button-primary
  // and input-text elements, and the button-primary/height band's own 30.5px minimum came from an
  // element the rule refused to look at.
  it('audits the same population the manifest\'s bands were derived from', async () => {
    const findings = await findingsFor(
      normsBands,
      `<body style="margin:0"><div style="visibility:hidden">
         <button class="btn btn-primary" style="height:240px">Save</button></div></body>`
    );
    expect(messages(findings)).toContainEqual(expect.stringContaining('button-primary/height measures 240.0px'));
  });

  // `ratified-drift` means the band holds the DRIFTED observation and disagrees with a ratified
  // decision. Honoring it blessed the drift and flagged the ratified value as the deviation, with
  // the message calling the drifted band "observed across 14 sites".
  it('treats a ratified-drift band as unbanded, not as authority', async () => {
    const drifted = {
      ...manifest,
      entries: manifest.entries.map((entry) =>
        entry.role === 'card' && entry.property === 'border-radius'
          ? {
              ...entry,
              band: { kind: 'length' as const, unit: 'px' as const, values: [40], min: 40, max: 40 },
              provenance: 'observed' as const,
              flags: ['ratified-drift' as const],
            }
          : entry
      ),
    };
    const ratifiedValue = evaluateNormsBandCandidate(
      { role: 'card', selector: 'div.card-shell', property: 'border-radius', kind: 'length', value: 16 },
      drifted
    );
    expect(ratifiedValue).toBeNull();
  });

  // The kept measurements were all scale-invariant apart from height, so a chip carrying type at
  // double the manifest's observed size and side padding at double the band held its height and
  // reported clean, as did every other registered rendered rule.
  it('anchors padding in absolute pixels, not only as a ratio', async () => {
    const findings = await findingsFor(
      normsBands,
      `<body style="margin:0">
         <span class="status-chip" style="display:inline-block;height:16px;font-size:20px;padding:0 14px"></span></body>`
    );
    expect(messages(findings)).toContainEqual(expect.stringContaining('status-chip/padding-inline'));
  });

  // Border treatments were read from `border-top-*` only, so three of four sides could be
  // arbitrarily wrong and report clean.
  it('reads border treatments on all four sides', async () => {
    const findings = await findingsFor(
      normsBands,
      `<body style="margin:0">
         <div class="card-shell" style="width:200px;height:80px;border-style:solid;border-color:#ccc;border-width:1px 12px 12px 12px;border-radius:16px 60px 60px 60px"></div></body>`
    );
    const text = messages(findings).join(' | ');
    expect(text).toContain('card/border-width');
    expect(text).toContain('card/border-radius');
  });

  // The viewport restore was conditional, so a page inheriting the context's viewport had one
  // borrowed permanently and every rule registered after this one measured at a width this rule
  // chose.
  it('never borrows a viewport it cannot give back', async () => {
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();
    try {
      await page.setContent('<body><div class="card-shell" style="width:100px;height:40px"></div></body>', {
        waitUntil: 'load',
      });
      const before = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
      const findings = await normsBands.check({
        page: page as unknown as RenderedPage,
        pagePath: '/fixture',
        theme: 'light',
        state: 'rest',
        config,
      });
      const after = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
      expect(after).toEqual(before);
      expect(messages(findings)).toContainEqual(expect.stringContaining('inherits its viewport'));
    } finally {
      await context.close();
    }
  });
});

// The plan's exit criterion, proved rather than asserted: none of Task 16's five advisory rules can
// change the process exit code, through any path. Four paths exist and all four are covered here.
// The first cut proved only the first of them, which is why the other three all leaked.
describe('the advisory-cannot-gate proof', () => {
  const THEME = `<style>
    [data-theme='cairn-admin']{--color-primary:oklch(52% 0.2 293);--color-neutral:oklch(26% 0.014 75)}
    .btn{border:0;padding:8px 16px;font:500 14px system-ui}
    .btn-primary{background-color:var(--color-primary);color:#fff}
  </style>`;

  // One page shaped like the real admin that trips all five rules at once: Tailwind variant classes
  // in the signatures, a buried accent action, an over-budget region, a vanishing border, a nested
  // rhythm wider than its container, and an off-band control.
  const OFFENDING_PAGE = `${GAP_TOKENS}${THEME}<body style="margin:0;background:oklch(96.5% 0.006 75)">
    <div data-theme="cairn-admin"><div class="drawer lg:drawer-open">
      <main class="flex-1 lg:px-10">
        <div class="card-shell max-w-[30%]" style="background:oklch(99% 0.004 75);border:1px solid oklch(93% 0.008 75)">
          <p style="font-weight:400">Body copy.</p>
          <label style="font-weight:500">Field label.</label>
          <strong style="font-weight:700">Emphasis.</strong>
        </div>
        <div class="outer lg:ml-56" style="display:flex;flex-direction:column;gap:16px">
          <div class="inner" style="display:flex;flex-direction:column;gap:24px">
            <div style="height:20px">1</div><div style="height:20px">2</div>
          </div>
        </div>
        <button class="btn btn-primary" style="height:240px">Save changes</button>
      </main>
    </div></div></body>`;

  const RULES = [relationalSpacing, screenAnatomy, weightBudget, borderContrast, normsBands];

  // Path 1: a rule's own findings. Every one carries `advisory`, and a report of all of them
  // together exits 0.
  it('raises only advisory findings, and a report of every one of them exits 0', async () => {
    const all: RenderedFinding[] = [];
    for (const rule of RULES) all.push(...(await findingsFor(rule, OFFENDING_PAGE, '/admin/posts')));
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((finding) => finding.tier === 'advisory')).toBe(true);
    const report = {
      findings: all.map((finding) => ({ ...finding, file: '/admin/posts', line: 0, start: 0, end: 0 })),
      suppressed: [],
      filesScanned: 1,
      ruleIds: RULES.map((rule) => rule.id),
    };
    expect(exitCodeFor(report)).toBe(0);
  });

  // Path 2: the selector. `resolveRenderedFindings` feeds every allowlist selector to
  // `querySelectorAll` in the page, and a selector the browser refuses reads as "never matched",
  // which mints an ERROR-tier staleness finding. Two rules shipped selectors that always threw: a
  // class signature carrying Tailwind's `lg:ml-56` and `max-w-[30%]`, and a prose region label
  // (`main > Posts`). Every selector these rules emit now parses.
  it('emits selectors a browser can parse, so the staleness path is never reached by a refusal', async () => {
    const all: RenderedFinding[] = [];
    for (const rule of RULES) all.push(...(await findingsFor(rule, OFFENDING_PAGE, '/admin/posts')));
    const selectors = [...new Set(all.map((finding) => finding.selector))];
    expect(selectors.length).toBeGreaterThan(0);

    const page = await browser.newPage();
    try {
      await page.setContent(OFFENDING_PAGE, { waitUntil: 'load' });
      const refused = await page.evaluate((list: string[]) => {
        return list.filter((selector) => {
          try {
            document.querySelectorAll(selector);
            return false;
          } catch {
            return true;
          }
        });
      }, selectors);
      expect(refused).toEqual([]);
      // And the signatures really do carry the variant classes, so this is not a vacuous check.
      expect(selectors.join(' ')).toContain('\\:');
    } finally {
      await page.close();
    }
  });

  // Path 3: the suppression escape hatch these rules' own messages recommend. A stale entry that
  // names its rule is reported at that rule's tier, and an entry whose selector cannot be parsed is
  // advisory rather than a misnamed staleness error. Both exit 0.
  it('never gates through the allowlist, whether an entry goes stale or cannot be parsed', () => {
    const visits = [
      { page: '/admin/posts', selectorsSeen: new Set<string>(), selectorsUnprobeable: new Set(['div.bad[['] ) },
    ];
    const tiers = new Map(RULES.map((rule) => [rule.id, rule.tier] as const));
    const resolved = resolveRenderedFindings(
      [],
      visits,
      [
        { page: '/admin/posts', selector: 'div.gone', reason: 'ratified', rule: 'weight-budget' },
        { page: '/admin/posts', selector: 'div.bad[[', reason: 'ratified' },
      ],
      tiers
    );
    expect(resolved.findings.map((finding) => finding.tier)).toEqual(['advisory', 'advisory']);
    expect(exitCodeFor({ ...resolved, filesScanned: 1, ruleIds: RULES.map((rule) => rule.id) })).toBe(0);
  });

  // Path 4: a throw. `norms-bands` reads a file inside `check`, and a pruned or corrupt manifest in
  // a consumer install took the whole run to exit code 2, from the one rule that is advisory BY
  // PRINCIPLE. A rule that throws now reports at its own tier instead of aborting the run.
  it('turns a rule that throws into a finding at that rule\'s own tier', async () => {
    const thrower: RenderedRule = {
      id: 'advisory-thrower',
      tier: 'advisory',
      async check() {
        throw new Error('the shipped manifest is missing');
      },
    };
    const report = await runRendered(
      configWithPages(['/admin/posts']),
      [thrower],
      { isReachable: async () => true, loadPlaywright: async () => fakePlaywright() }
    );
    // One per theme: every page is captured under both, unconditionally.
    expect(report.findings).toHaveLength(2);
    expect(report.findings.every((finding) => finding.tier === 'advisory')).toBe(true);
    expect(report.findings[0].message).toContain('the shipped manifest is missing');
    expect(exitCodeFor(report)).toBe(0);
  });
});
