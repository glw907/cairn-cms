// Ruling 4 (Task 16b, 2026-07-28, Geoff): `weight-budget`'s content region excludes chrome. Task
// 16's rendered baseline raised ten advisories against cairn's own admin, five routes times two
// themes, every one at exactly three weights, and every one of them was toolbar, pagination, or
// eyebrow chrome that happens to live inside `<main>`. These fixtures are built from the REAL
// shapes those three chrome families render in cairn's own admin, read off the source rather than
// invented: `PageHeader.svelte`/`OfficeList.svelte`'s own `<header>` band (an eyebrow span
// immediately before the page's one `<h1>`), the admin toolkit's `Pagination.svelte` own
// `<nav aria-label="Pagination">` page-number strip nested inside `<main>` (never a sibling of it,
// unlike the shell's own nav), and daisyUI's own compiled `.btn` recipe (`font-weight:600`), which
// is what turns ListToolbar's filter controls, a table's sort buttons, and Pagination's own page
// buttons into a third weight beside a route's ordinary 400/500 body and label text.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { weightBudget } from '../../../../../lib/audit/rules/rendered/weight-budget.js';
import type { RenderedFinding, RenderedPage, RenderedRule } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/** Runs `rule` against `html` in a real page and returns what it found. */
async function findingsFor(rule: RenderedRule, html: string): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await rule.check({
      page: page as unknown as RenderedPage,
      pagePath: '/fixture',
      theme: 'light',
      state: rule.states?.[0] ?? 'rest',
      config,
    });
  } finally {
    await page.close();
  }
}

describe('weight-budget, ruling 4: the content region excludes chrome', () => {
  // ConceptList's own real table-header shape: a plain <th> (no button, just text) carrying the
  // eyebrow recipe (font-semibold, 600), read directly off `headerLabel` in ConceptList.svelte.
  // Unlike PageHeader's own title-band eyebrow (isolated into its own single-weight region by the
  // heading boundary, so it never independently trips the floor), a table's column-header row
  // shares its region with the body rows below it, so its 600-weight label sits beside a title
  // link (500) and a plain data cell (400) in the SAME region: three weights, on a table with no
  // real typographic defect at all.
  it('does not count a table\'s own <thead> column-header label against the rows it labels', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <table>
           <thead><tr><th style="font-weight:600">Status</th></tr></thead>
           <tbody><tr>
             <td><a href="/admin/posts/1" style="font-weight:500">Season opener recap</a></td>
             <td style="font-weight:400">Published</td>
           </tr></tbody>
         </table>
       </main></body>`
    );
    expect(findings).toEqual([]);
  });

  // PageHeader's/OfficeList's own real shape: an eyebrow span (font-semibold, 600) sitting
  // immediately before the page's one h1, both wrapped in one <header>. This case happens to pass
  // even before this ruling too, since the heading boundary already isolates the eyebrow into its
  // own single-candidate region; it is asserted anyway because the chrome definition names
  // `header` as its own clause (the page's title band never spends the budget, on principle, not
  // as an accident of which region it lands in), and a future region-boundary change must not
  // silently start counting it.
  it('does not count a PageHeader/OfficeList eyebrow against the region its header introduces', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <header>
           <span style="font-weight:600">Settings</span>
           <h1 style="font-weight:700">Editors</h1>
         </header>
         <label style="font-weight:500">Display name</label>
         <p style="font-weight:400">Ordinary body copy describing the field above.</p>
       </main></body>`
    );
    expect(findings).toEqual([]);
  });

  // Pagination's own real markup: <nav aria-label="Pagination" class="join"> nested INSIDE main,
  // never a sibling of it the way the shell's own sidebar/breadcrumb nav is. The existing nav
  // exclusion only ever fired because the shell's nav lives outside <main>; a nav rendered inside
  // main was never exempted before this ruling, so Pagination's own .btn buttons (600) counted as
  // a third weight beside a route's ordinary 400/500 body and label text.
  it('does not count Pagination\'s own in-main <nav> page buttons against the region', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <p style="font-weight:400">A list of every post on this site.</p>
         <label style="font-weight:500">Title</label>
         <nav aria-label="Pagination" class="join">
           <button type="button" style="font-weight:600">1</button>
           <button type="button" style="font-weight:600">2</button>
         </nav>
       </main></body>`
    );
    expect(findings).toEqual([]);
  });

  // ListToolbar's own real shape: no landmark, no ARIA role on its own root, just daisyUI .btn
  // controls (a segmented filter, an overflow trigger) at the compiled 600 weight, sitting between
  // a route's ordinary body and label text. This is the case a landmark-only reading (nav alone)
  // cannot close: the toolbar carries no nav, so the control itself (the native <button> element)
  // has to be the chrome signal.
  it('does not count a ListToolbar-shaped filter button against the region', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <div class="toolkit-toolbar">
           <div class="join" role="radiogroup" aria-label="Status">
             <button type="button" role="radio" style="font-weight:600">All</button>
             <button type="button" role="radio" style="font-weight:600">Drafts</button>
           </div>
         </div>
         <label style="font-weight:500">Title</label>
         <p style="font-weight:400">A list of every post on this site.</p>
       </main></body>`
    );
    expect(findings).toEqual([]);
  });

  // The combined real shape: PageHeader's header band, a ListToolbar-shaped filter row, a table
  // with its own <thead> column-header label, body text and a title link, and a Pagination-shaped
  // nav, all in one region, reproducing the actual five-routes-times-two-themes advisory the
  // rendered baseline raised. Chrome excluded, only the table's own 400 (date text) and 500 (title
  // link) remain.
  it('passes the full real shape: header, toolbar, thead, table body, and pagination together', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <header>
           <span style="font-weight:600">Posts</span>
           <h1 style="font-weight:700">All posts</h1>
         </header>
         <div class="toolkit-toolbar">
           <button type="button" style="font-weight:600">New post</button>
         </div>
         <table>
           <thead><tr><th style="font-weight:600">Status</th></tr></thead>
           <tbody><tr>
             <td><a href="/admin/posts/1" style="font-weight:500">Season opener recap</a></td>
             <td style="font-weight:400">May 18, 2026</td>
           </tr></tbody>
         </table>
         <nav aria-label="Pagination" class="join">
           <button type="button" style="font-weight:600">Next</button>
         </nav>
       </main></body>`
    );
    expect(findings).toEqual([]);
  });

  // The narrowing must not swallow a genuine violation living outside chrome: three weights in
  // ordinary paragraph/label/emphasis text, none of it inside a nav, a button, or a header, still
  // reports exactly as it did before this ruling.
  it('still reports three weights running in ordinary content outside any chrome', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <p style="font-weight:400">Ordinary paragraph text explaining the field below.</p>
         <label style="font-weight:500">Display name</label>
         <strong style="font-weight:700">Warning: this action cannot be undone.</strong>
       </main></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('3 distinct font-weights');
  });

  // A link is not a control by this rule's own chrome definition, so a row's own title link keeps
  // spending the region's budget the way it always has: the title is the row's actual content, not
  // furniture around it.
  it('still counts an ordinary link\'s own weight as region content, not chrome', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <a href="/admin/posts/1" style="font-weight:500">Season opener recap</a>
         <p style="font-weight:400">May 18, 2026</p>
         <strong style="font-weight:700">Draft, not yet published.</strong>
       </main></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('3 distinct font-weights');
  });

  // CairnTidySettings' own disclosure shape: a <details> whose <summary> carries the subtitle
  // recipe (600) and a status pill (600) over a 500-weight row in the panel. A <summary> is HTML's
  // own disclosure control, operated rather than read, and is chrome under every word of the button
  // clause; leaving it out of the set kept cairn's own settings screen emitting a three-weight
  // advisory whose extra weight was a control label.
  it('does not count a <summary> disclosure control against the region it opens', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <details class="card-shell" open>
           <summary>
             <span class="type-subtitle" style="font-weight:600">Tidy</span>
             <span class="type-chip" style="font-weight:600">Needs care</span>
             <span class="type-meta" style="font-weight:400">Last run 3 days ago</span>
           </summary>
           <p style="font-weight:500">Review the queue before running it again.</p>
         </details>
       </main></body>`
    );
    expect(findings).toEqual([]);
  });

  // A pagination strip built from ARIA rather than tags is the same furniture, and this file
  // already treats ARIA as first class elsewhere ([role="heading"] opens a region, [role="dialog"]
  // selects a root). A tag-only cut made the doc's own stated principle wrong about its own code.
  it('does not count a role-built navigation strip against the region', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <p style="font-weight:400">A list of every post on this site.</p>
         <label style="font-weight:500">Title</label>
         <div role="navigation" aria-label="Pagination">
           <div role="button" class="btn" style="font-weight:600">1</div>
           <div role="button" class="btn" style="font-weight:600">2</div>
         </div>
       </main></body>`
    );
    expect(findings).toEqual([]);
  });
});

describe('weight-budget, ruling 4: the chrome clauses are bounded', () => {
  // The <header> clause was justified on <header> being used exactly once in this codebase, which
  // is a fact about cairn's tree today rather than about the tag. It is legal inside every article,
  // section, and aside, unbounded in size, and this rule ships to consumers rendering their own
  // routes inside <main> through the CairnAdminShell custom-route seam. A byline band carrying
  // three weights is ordinary body content and reports.
  it('still counts a byline <header> that introduces no heading of its own', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main><article>
         <header>
           <p style="font-weight:600">Field notes</p>
           <p style="font-weight:500">By Geoff Wilson</p>
           <p style="font-weight:400">Posted 28 July 2026</p>
         </header>
         <p style="font-weight:400">The body of the post follows here.</p>
       </article></main></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('3 distinct font-weights');
  });

  // The same band inside a <header> that DOES carry the heading it introduces is a title band, the
  // shape PageHeader renders, and stays chrome.
  it('does not count a title band that carries its own heading', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main><article>
         <header>
           <p style="font-weight:600">Field notes</p>
           <h2 style="font-weight:700">Season opener recap</h2>
           <p style="font-weight:500">By Geoff Wilson</p>
         </header>
         <p style="font-weight:400">The body of the post follows here.</p>
       </article></main></body>`
    );
    expect(findings).toEqual([]);
  });

  // Chrome was excluded from the tally but stayed visible to the region boundary, so a heading
  // inside a section-index nav split one genuine three-weight passage into two clean two-weight
  // halves and the violation vanished. A developer trips this by adding a jump-links nav, with no
  // signal it happened.
  it('does not let a heading inside chrome partition the body around it', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <p style="font-weight:400">Ordinary paragraph text explaining the field below.</p>
         <p style="font-weight:500">A second line at the label weight.</p>
         <nav aria-label="Section index">
           <h2 style="font-weight:700">On this page</h2>
           <a href="#later" style="font-weight:400">Jump to drafts</a>
         </nav>
         <p style="font-weight:600">A third weight after the jump links.</p>
       </main></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('3 distinct font-weights');
  });
});

describe('weight-budget, ruling 4: an unmeasured region says which kind it is', () => {
  // The fail-loud branch's own words were written for an unhydrated <main>, a fix-in-the-app
  // condition. After the narrowing they also fired on a fully hydrated page covered in visible
  // text, where every word of it happened to be chrome, and the two became indistinguishable in the
  // report. A skip is a claim, and that one made the wrong claim.
  it('says a region rendered only chrome rather than that it carries no text', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <nav aria-label="Pagination">
           <button type="button" style="font-weight:600">Previous</button>
           <button type="button" style="font-weight:600">Next</button>
         </nav>
         <table><thead><tr><th style="font-weight:600">Status</th></tr></thead></table>
       </main></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('rendered only chrome');
    expect(findings[0].message).not.toContain('no visible text at all');
  });

  // The unhydrated-root condition the branch was written for still reads the way it always did.
  it('still says a region carries no visible text when it truly carries none', async () => {
    const findings = await findingsFor(weightBudget, `<body><main></main></body>`);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('no visible text at all');
  });

  // A heading-delimited region that becomes entirely chrome used to vanish: the root-level check
  // could not fire, since another region supplied candidates, so nothing at all was reported for
  // it. Silence reads as "measured, and clean", which is the reading this whole file forbids. After
  // the narrowing, a heading followed by a toolbar or a pagination strip is the normal way to reach
  // this state.
  it('reports a heading-opened region that turned out to be entirely chrome', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <h2 style="font-weight:700">Drafts</h2>
         <p style="font-weight:400">Ordinary paragraph text.</p>
         <p style="font-weight:500">A label-weight line.</p>
         <p style="font-weight:600">A third weight.</p>
         <h2 style="font-weight:700">Recently published</h2>
         <nav aria-label="Pagination"><button type="button" style="font-weight:600">Next</button></nav>
       </main></body>`
    );
    expect(findings).toHaveLength(2);
    expect(findings.some((finding) => finding.message.includes('3 distinct font-weights'))).toBe(true);
    expect(findings.some((finding) => finding.message.includes('rendered only chrome'))).toBe(true);
  });

  // The implicit region before a root's first heading is not one an author declared, and on this
  // admin it holds a PageHeader title band and nothing else on every single page. Reporting it
  // empty would fire everywhere and mean nothing.
  it('stays quiet about the implicit region a title band occupies before the first heading', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <header><span style="font-weight:600">Posts</span><h1 style="font-weight:700">All posts</h1></header>
         <p style="font-weight:400">A list of every post on this site.</p>
       </main></body>`
    );
    expect(findings).toEqual([]);
  });
});

describe('weight-budget, ruling 4: the two stated limits of the chrome cut', () => {
  // STATED LIMIT, not an oversight. CairnMediaLibrary wraps an asset row's whole content in one
  // bare <button>, so the name, meta line, and status chip are all a control's own accessible name
  // by the platform's own rules and none of them spend the budget. Pinned so the behavior is a
  // recorded decision rather than a surprise, and so a later change to it is a deliberate one. The
  // fix belongs in the component.
  it('does not measure content a component wrapped in a structural <button>', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main><table><tbody><tr><td>
         <button type="button" class="flex w-full items-center gap-3 text-left">
           <span class="type-subtitle" style="font-weight:500">autumn-ridge.jpg</span>
           <span class="type-meta" style="font-weight:400">1600x900 240 KB JPEG</span>
           <span class="type-chip" style="font-weight:600">Needs alt</span>
         </button>
       </td></tr></tbody></table></main></body>`
    );
    expect(findings.filter((finding) => finding.message.includes('distinct font-weights'))).toEqual([]);
    // The blindness is at least announced rather than silent: with the row's whole content read as
    // one control's label, the region has no body content left and says so.
    expect(findings.some((finding) => finding.message.includes('rendered only chrome'))).toBe(true);
  });

  // STATED LIMIT, the other half. The same row content under an <a> is measured, which is what
  // makes a list route's own titles count; the cost is that EditPage's advisory-notice row, which
  // renders `<a class="btn">` or `<button class="btn">` from one {#each} depending on the data,
  // gets opposite verdicts for the same control. Telling a btn-styled anchor from a title link
  // needs the class name this rule refuses to trust.
  it('measures the same row content under an <a>, control-styled or not', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main><table><tbody><tr><td>
         <a href="/admin/media/1" class="flex w-full items-center gap-3 text-left">
           <span class="type-subtitle" style="font-weight:500">autumn-ridge.jpg</span>
           <span class="type-meta" style="font-weight:400">1600x900 240 KB JPEG</span>
           <span class="type-chip" style="font-weight:600">Needs alt</span>
         </a>
       </td></tr></tbody></table></main></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('3 distinct font-weights');
  });
});
