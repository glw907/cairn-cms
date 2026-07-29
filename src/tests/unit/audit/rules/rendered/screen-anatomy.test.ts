// The screen-anatomy rule against a real browser, in the shape browser-regressions.test.ts
// establishes for the six error-tier rules: no page.evaluate test double, every in-page function
// executed for real, fixtures built from cairn's own real markup and real token values (the Warm
// Stone palette is oklch end to end).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { exitCodeFor } from '../../../../../lib/audit/report.js';
import { screenAnatomy } from '../../../../../lib/audit/rules/rendered/screen-anatomy.js';
import type { RenderedFinding, RenderedPage, RenderedRule } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/** Runs `rule` against `html` in a real page at `pagePath` and returns what it found. */
async function findingsFor(rule: RenderedRule, html: string, pagePath = '/admin/posts'): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await rule.check({ page: page as unknown as RenderedPage, pagePath, theme: 'light', state: 'rest', config });
  } finally {
    await page.close();
  }
}

function selectors(findings: RenderedFinding[]): string[] {
  return findings.map((finding) => finding.selector);
}

// The admin's own theme shape: `data-theme` on a bare wrapper INSIDE body, with every palette token
// in oklch (`--color-base-100` is the quiet office surface tone, distinct from both the accent and
// the ink fill, the exact shade `CairnMediaLibrary`'s "Find orphaned files" button paints).
const THEME = `
  <style>
    [data-theme='cairn-admin'] {
      --color-primary: oklch(52% 0.2 293);
      --color-neutral: oklch(26% 0.014 75);
      --color-base-100: oklch(99% 0.004 75);
    }
    .btn { border: 0; padding: 6px 14px; font: 500 13px system-ui; border-radius: 6px; }
    .btn-primary { background-color: var(--color-primary); color: white; }
    .btn-neutral { background-color: var(--color-neutral); color: white; }
    .btn-ghost { background-color: transparent; color: inherit; }
    .btn-quiet { background-color: var(--color-base-100); color: inherit; border: 1px solid #ccc; }
  </style>`;

// PageHeader's own real markup shape (PageHeader.svelte): a <header> wrapping the display-face h1
// and, when passed, a right-aligned action snippet. ConceptList's own real ink-New recipe
// (ConceptList.svelte's headerAction snippet) for the header's own action.
const HEADER_WITH_NEW_ACTION = `
  <header class="mb-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="flex flex-col gap-0.5">
      <h1 class="page-h1 m-0 type-title font-bold">Posts</h1>
    </div>
    <button type="button" class="btn btn-sm btn-neutral" aria-haspopup="dialog">New post</button>
  </header>`;

// AdminTable's own real card wrapper (ConceptList.svelte: `<div class="mb-2 overflow-hidden
// card-shell card-shadow">`).
const CARD_WITH_TABLE = `
  <div class="mb-2 overflow-hidden card-shell card-shadow">
    <table><tbody><tr><td>Nordic season opener</td></tr></tbody></table>
  </div>`;

/** Wraps `body` in the admin's own data-theme shape so `--color-primary`/`--color-neutral` inherit. */
function page(body: string): string {
  return `${THEME}<body style="margin:0"><div data-theme="cairn-admin">${body}</div></body>`;
}

describe('screen-anatomy against a real browser', () => {
  // The canonical catch: ConceptList's own removed defect, "the old trailing foot row that
  // duplicated it and read as a content row" (docs/internal/admin-design-system.md, "Office list
  // (the concept list view)"). A second, accent-filled "New post" renders after the card, neither
  // in the header nor in the card region.
  it('catches a filled action buried below the card, the ConceptList trailing-foot-row defect', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      page(`<main>
        ${HEADER_WITH_NEW_ACTION}
        ${CARD_WITH_TABLE}
        <button type="button" class="btn btn-primary mt-3">New post</button>
      </main>`)
    );
    const buried = findings.filter((finding) => finding.message.includes('buried-primary-action'));
    expect(buried).toHaveLength(1);
    expect(buried[0].selector).toContain('button.btn.btn-primary');
    expect(buried[0].message).toContain('accent-filled');
  });

  // The ink-fill half of the same defect: a stray duplicate of the header's own INK-filled New
  // button (not accent) is just as buried, since `one-filled-action`'s two sanctioned fills are
  // both "loud" primary paint.
  it('catches an ink-filled duplicate of the header action', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      page(`<main>
        ${HEADER_WITH_NEW_ACTION}
        ${CARD_WITH_TABLE}
        <button type="button" class="btn btn-neutral mt-3">New post</button>
      </main>`)
    );
    const buried = findings.filter((finding) => finding.message.includes('buried-primary-action'));
    expect(buried).toHaveLength(1);
    expect(buried[0].message).toContain('ink-filled');
  });

  // Two h1 elements is itself an anatomy break, whichever component produced the second one.
  it('catches a second rendered h1 outside the header', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      page(`<main>
        ${HEADER_WITH_NEW_ACTION}
        <h1 class="type-heading font-bold">A stray second heading</h1>
        ${CARD_WITH_TABLE}
      </main>`)
    );
    expect(findings.some((finding) => selectors([finding])[0] === 'main' && finding.message.includes('2 <h1>'))).toBe(
      true
    );
  });

  // A bespoke h1 with no <header> wrapper at all: not PageHeader's own recipe.
  it('catches an h1 rendered with no <header> ancestor', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      page(`<main>
        <h1 class="page-h1">Posts</h1>
        ${CARD_WITH_TABLE}
      </main>`)
    );
    expect(findings.some((finding) => finding.message.includes('does not render inside a <header> landmark'))).toBe(
      true
    );
  });

  // No card-shell anywhere in main: office content composes outside the floating card.
  it('catches an office route with no card-shell region at all', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      page(`<main>
        ${HEADER_WITH_NEW_ACTION}
        <table><tbody><tr><td>Nordic season opener</td></tr></tbody></table>
      </main>`)
    );
    expect(findings.some((finding) => finding.message.includes('no .card-shell region'))).toBe(true);
  });

  // The sanctioned recipe: PageHeader's own header with its ink New action, a card-shell holding
  // the table, and nothing loose outside either. Zero findings, so the rule is not "everything
  // fails".
  it('passes the sanctioned PageHeader-plus-card-shell recipe', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      page(`<main>
        ${HEADER_WITH_NEW_ACTION}
        ${CARD_WITH_TABLE}
      </main>`)
    );
    expect(findings).toEqual([]);
  });

  // A ghost/outline action outside the header and the card (a plain text-styled link, or a
  // near-transparent button) is not a filled action and is left alone: the rule proves location for
  // KNOWN-filled controls, not every stray interactive element.
  it('does not flag a ghost action outside the header and the card', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      page(`<main>
        ${HEADER_WITH_NEW_ACTION}
        ${CARD_WITH_TABLE}
        <button type="button" class="btn btn-ghost mt-3">Cancel</button>
      </main>`)
    );
    expect(findings).toEqual([]);
  });

  // The real-admin false positive an adversarial pass demonstrated: CairnMediaLibrary's own "Find
  // orphaned files" control is opaque (bg-base-100) but deliberately neither accent nor ink ("NEVER
  // the danger family", its own comment), a quiet secondary office button. A floor keyed to opacity
  // alone flagged it; matching only the two sanctioned fills does not.
  it('does not flag a merely-opaque quiet control that is neither accent nor ink filled', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      page(`<main>
        ${HEADER_WITH_NEW_ACTION}
        ${CARD_WITH_TABLE}
        <button type="button" class="btn btn-quiet mt-3">Find orphaned files</button>
      </main>`)
    );
    expect(findings).toEqual([]);
  });

  // ListToolbar's own real segmented filter (ListToolbar.svelte: `role="radiogroup"` wrapping
  // `role="radio"` options, the active one accent-filled via `.btn-active`) sits outside the card by
  // design. Real-admin evidence: this exact shape fired five false positives per theme on
  // /admin/posts before the role="radio" exclusion landed.
  it('does not flag a filled option inside a role="radiogroup" segmented filter', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      page(`<main>
        ${HEADER_WITH_NEW_ACTION}
        <div class="join toolkit-toolbar-segmented" role="radiogroup" aria-label="Status">
          <button type="button" role="radio" aria-checked="true" class="join-item btn btn-sm btn-primary">All</button>
          <button type="button" role="radio" aria-checked="false" class="join-item btn btn-sm">Pending edits</button>
        </div>
        ${CARD_WITH_TABLE}
      </main>`)
    );
    expect(findings).toEqual([]);
  });

  // A filled row action INSIDE the card (a per-row Publish button, say) is exactly where the
  // recipe puts it and is left alone.
  it('does not flag a filled control that lives inside the card region', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      page(`<main>
        ${HEADER_WITH_NEW_ACTION}
        <div class="mb-2 overflow-hidden card-shell card-shadow">
          <table><tbody><tr><td>Nordic season opener</td>
            <td><button type="button" class="btn btn-primary btn-xs">Publish</button></td>
          </tr></tbody></table>
        </div>
      </main>`)
    );
    expect(findings).toEqual([]);
  });

  // Desk routes are exempt by the office/desk context model: the editor's own
  // topbar-and-manuscript shape carries no PageHeader at all. The exemption reads the shell's own
  // SSR answer out of the DOM (CairnAdminShell.svelte:534-535 puts `xl:drawer-open` on a desk
  // route and `lg:drawer-open` on an office one), never the path. Every check this rule can raise
  // would otherwise fire on this fixture; the exemption alone is what keeps it clean.
  it('exempts a desk route even when every other check would fail', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      `<body style="margin:0"><div class="drawer xl:drawer-open"><main><p>No header, no card, nothing.</p></main></div></body>`,
      '/admin/posts/entry-123'
    );
    expect(findings).toEqual([]);
  });

  // The demonstrated defect the DOM signal closes. Path depth alone is the signal
  // `CairnAdminShell.svelte:395-402` names by name as wrong, because "a developer's own custom nav
  // can route just as deep (a section entry like /admin/club/events) without opening a document".
  // An adversarial pass drove exactly that: identical broken markup reported three findings under a
  // two-segment path and ZERO under a three-segment one.
  it('judges a three-deep CUSTOM office route as the office screen it renders as', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      `<body style="margin:0"><div class="drawer lg:drawer-open"><main><p>No header, no card, nothing.</p></main></div></body>`,
      '/admin/club/events'
    );
    expect(findings.map((finding) => finding.message)).toEqual([
      expect.stringContaining('no <h1> renders'),
      expect.stringContaining('no .card-shell region'),
    ]);
  });

  // A page rendered with no <main> landmark at all (LoginPage's own shape: a standalone auth card
  // outside CairnAdminShell) carries no office/desk anatomy to judge in the first place.
  it('is not applicable to a page with no <main> landmark', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      `<body style="margin:0"><h1>Sign in to this site</h1><p>No main landmark here.</p></body>`
    );
    expect(findings).toEqual([]);
  });

  // The exit-criterion proof: an advisory finding never changes the process exit code.
  it('never lets a screen-anatomy finding change the exit-code verdict', async () => {
    const findings = await findingsFor(
      screenAnatomy,
      page(`<main>
        ${HEADER_WITH_NEW_ACTION}
        ${CARD_WITH_TABLE}
        <button type="button" class="btn btn-primary mt-3">New post</button>
      </main>`)
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => finding.tier === 'advisory')).toBe(true);
    const report = {
      findings: findings.map((finding) => ({ ...finding, file: '/fixture', line: 0, start: 0, end: 0 })),
      suppressed: [],
      filesScanned: 1,
      ruleIds: [screenAnatomy.id],
    };
    expect(exitCodeFor(report)).toBe(0);
  });
});
