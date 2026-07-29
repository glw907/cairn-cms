// Ruling 2 (Task 16b, 2026-07-28): the `--cairn-card-border` hairline is RATIFIED and suppressed.
// Geoff ruled it stays as designed (1.11:1 light, 1.43:1 dark, both under WCAG 1.4.11's 3:1 floor),
// so `border-contrast` must stop REPORTING that hairline while still catching every other boundary.
//
// Suppressed, never silent: the exemption is an `exemption` reason on the finding, which
// `resolveRenderedFindings` routes into the report's suppressed list, so the run prints the count
// and the ruling instead of the `0 suppressed` a bare `continue` inside the rule produced. Each
// fixture below therefore asserts on two populations, `reported` and `exempted`, rather than on an
// empty list.
//
// The exemption has two halves and these fixtures pin both, because two successive cuts were broken
// by adversarial passes. IDENTITY: the border is PAINTED THROUGH the page's own
// `--cairn-card-border`, decided by sentinel substitution in the page, so a different property or a
// literal holding the same bytes still reports and a consumer who re-tunes the palette still gets
// the exemption. MEASUREMENT: the boundary still reads at least as well as the rendering Geoff
// signed off on, so the ratified token used where it separates nothing (both surfaces at contrast
// 1.00, invisible to any eye) reports with its number.
//
// The identity half is where the second refutation landed, so every fixture that asserts a border
// still reports declares `--cairn-card-border` on the page. Omitting it is what let a byte-equality
// cut look correct while it swallowed cairn's own dark-theme `border-base-300` boundaries: every
// real admin page carries the token on the theme root, so it inherits everywhere, and a fixture
// without it tests a page that does not exist.
//
// Real Chromium, real cairn markup, and the real Warm Stone oklch values throughout; never a
// hand-written `rgb()` string, the serialization this admin never produces.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { exitCodeFor, formatReport } from '../../../../../lib/audit/report.js';
import { resolveRenderedFindings } from '../../../../../lib/audit/rendered.js';
import { borderContrast } from '../../../../../lib/audit/rules/rendered/border-contrast.js';
import type { RenderedFinding, RenderedPage, Theme } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/** Runs `borderContrast` against `html` in a real page, under the named theme. */
async function findingsFor(html: string, theme: Theme = 'light'): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await borderContrast.check({
      page: page as unknown as RenderedPage,
      pagePath: '/fixture',
      theme,
      state: 'rest',
      config,
    });
  } finally {
    await page.close();
  }
}

function selectors(findings: RenderedFinding[]): string[] {
  return findings.map((finding) => finding.selector);
}

/** The findings that gate or print as findings: everything the exemption did not claim. */
function reported(findings: RenderedFinding[]): RenderedFinding[] {
  return findings.filter((finding) => finding.exemption === undefined);
}

/** The findings the ruling exempts, each carrying the reason the report prints. */
function exempted(findings: RenderedFinding[]): RenderedFinding[] {
  return findings.filter((finding) => finding.exemption !== undefined);
}

/** The hairline token as `cairn-admin.css` declares it in each theme. */
const LIGHT_TOKENS = '--cairn-card-border: oklch(93% 0.008 75)';
const DARK_TOKENS = '--cairn-card-border: oklch(30% 0.014 75)';

/** Runs in the page: every bordered element's own hairline declaration and rendered top border. */
function readProbeState(): [string, string, string][] {
  return [...document.querySelectorAll('div')].map((el) => {
    const style = getComputedStyle(el);
    return [el.className, style.getPropertyValue('--cairn-card-border').trim(), style.borderTopColor];
  });
}

describe('border-contrast, Ruling 2: the ratified hairline is quiet', () => {
  // The exact light-theme recipe: base-200 ambient, base-100 card fill, the hairline reached the
  // way every card recipe in the admin reaches it, through the token. Measured 1.11 against the
  // ambient and 1.19 against the card's own fill; it must now report NOTHING, and account for the
  // exception in the one place a reader of the report can see it.
  it('suppresses the ratified light-theme hairline entirely', async () => {
    const findings = await findingsFor(
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75);${LIGHT_TOKENS}">
         <div class="card-shell" style="background-color:oklch(99% 0.004 75);
              border:1px solid var(--cairn-card-border);border-radius:12px;padding:16px;
              width:200px;height:80px">Card</div>
       </body>`,
      'light'
    );
    expect(reported(findings)).toEqual([]);
    expect(selectors(exempted(findings))).toEqual(['div.card-shell']);
    // The reason has to stand alone in a report: the ruling, the measurement, and the token.
    expect(exempted(findings)[0].exemption).toContain('RULING 2');
    expect(exempted(findings)[0].exemption).toContain('--cairn-card-border');
    expect(exempted(findings)[0].exemption).toContain('1.19');
  });

  // The dark half of the same recipe, measured 1.43 and 1.20.
  it('suppresses the ratified dark-theme hairline entirely', async () => {
    const findings = await findingsFor(
      `<body style="margin:0;background-color:oklch(15.5% 0.009 75);${DARK_TOKENS}">
         <div class="card-shell" style="background-color:oklch(24% 0.01 75);
              border:1px solid var(--cairn-card-border);border-radius:12px;padding:16px;
              width:200px;height:80px">Card</div>
       </body>`,
      'dark'
    );
    expect(reported(findings)).toEqual([]);
    expect(selectors(exempted(findings))).toEqual(['div.card-shell']);
  });

  // A dark card on the base-200 ambient rather than base-100 measures 1.33 and 1.20, a different
  // pair from the two numbers the ruling cites and still the ratified rendering. The floor sits
  // under the card-fill pairing, the invariant one, precisely so a card landing on another surface
  // does not drag the whole flood back.
  it('suppresses the ratified hairline on a card sitting on a different ambient', async () => {
    const findings = await findingsFor(
      `<body style="margin:0;background-color:oklch(20% 0.01 75);${DARK_TOKENS}">
         <div class="card-shell" style="background-color:oklch(24% 0.01 75);
              border:1px solid var(--cairn-card-border);border-radius:12px;padding:16px;
              width:200px;height:80px">Card</div>
       </body>`,
      'dark'
    );
    expect(reported(findings)).toEqual([]);
    expect(selectors(exempted(findings))).toEqual(['div.card-shell']);
  });

  // A consumer site re-tunes Warm Stone, and the exemption has to follow their token rather than
  // cairn's bytes. The first cut stored cairn's own resolved sRGB value, so a consumer whose
  // hairline is a few hundredths warmer got the entire flood the ruling exists to stop, and their
  // advisory tier was as unusable as cairn's had been. This is `norms.ts`'s own stated discipline:
  // a stored resolved value teaches a consumer a number their theme never produces.
  it('suppresses a consumer re-tuned hairline reached through the same token', async () => {
    const findings = await findingsFor(
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75);--cairn-card-border: oklch(93% 0.01 60)">
         <div class="card-shell" style="background-color:oklch(99% 0.004 75);
              border:1px solid var(--cairn-card-border);border-radius:12px;padding:16px;
              width:200px;height:80px">Card</div>
       </body>`,
      'light'
    );
    expect(reported(findings)).toEqual([]);
    expect(selectors(exempted(findings))).toEqual(['div.card-shell']);
  });
});

// The identity test mutates the page to ask its question, so what it leaves behind is part of the
// contract: every later rule in the run measures this same DOM, and a stray `--cairn-card-border`
// or a repainted border would be an audit reporting on its own probe.
describe('border-contrast, Ruling 2: the derivation probe leaves the page as it found it', () => {
  it('restores the token and the rendered border after checking', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await page.setContent(
        `<body style="margin:0;background-color:oklch(96.5% 0.006 75);${LIGHT_TOKENS}">
           <div class="card-shell" style="background-color:oklch(99% 0.004 75);
                border:1px solid var(--cairn-card-border);border-radius:12px;padding:16px;
                width:200px;height:80px">Card</div>
           <div class="card-inline" style="--cairn-card-border: oklch(80% 0.02 75);
                background-color:oklch(99% 0.004 75);border:1px solid var(--cairn-card-border);
                width:200px;height:80px">Inline</div>
         </body>`,
        { waitUntil: 'load' }
      );
      const before = await page.evaluate(readProbeState);
      await borderContrast.check({
        page: page as unknown as RenderedPage,
        pagePath: '/fixture',
        theme: 'light',
        state: 'rest',
        config,
      });
      expect(await page.evaluate(readProbeState)).toEqual(before);
    } finally {
      await page.close();
    }
  });
});

describe('border-contrast, Ruling 2: everything else still answers the measurement', () => {
  // The adversarial proof the ruling itself demands: a blanket disable would silence this neighbor
  // too. Same page, same ambient, a second card whose border is a visibly different, un-ratified
  // gray. The two cards sit in a gapped row so every side's hit test resolves to the shared body
  // ambient rather than to each other.
  it('still reports a neighboring border whose color merely resembles the ratified token', async () => {
    const findings = await findingsFor(
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75);${LIGHT_TOKENS};display:flex;gap:40px;padding:40px">
         <div class="card-shell" style="background-color:oklch(99% 0.004 75);
              border:1px solid var(--cairn-card-border);border-radius:12px;padding:16px;
              width:200px;height:80px">Ratified</div>
         <div class="card-shell-drifted" style="background-color:oklch(99% 0.004 75);
              border:1px solid oklch(88% 0.01 75);border-radius:12px;padding:16px;
              width:200px;height:80px">Drifted</div>
       </body>`,
      'light'
    );
    expect(selectors(reported(findings))).toEqual(['div.card-shell-drifted']);
  });

  // The identity is which property PAINTS the line, not the bytes it resolves to.
  // `src/lib/sveltekit/static-admin-page.ts` ships its own `--border`, a separate decision that
  // happens to land on the same value, on the `/admin/login` page the default page list includes.
  // The ratified token is declared here too, as it is on every real admin page, which is exactly the
  // condition a byte-equality cut could not survive: it exempted this card and printed a reason
  // naming a ruling Geoff never made about `--border`.
  it('still reports a different token that happens to resolve to the same value', async () => {
    const findings = await findingsFor(
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75);${LIGHT_TOKENS};--border: oklch(93% 0.008 75)">
         <div class="standalone-card" style="background-color:oklch(99% 0.004 75);
              border:1px solid var(--border);border-radius:16px;padding:24px;
              width:360px;height:80px">Sign in</div>
       </body>`,
      'light'
    );
    expect(selectors(reported(findings))).toEqual(['div.standalone-card']);
    expect(exempted(findings)).toEqual([]);
  });

  // The live collision, and the one that made the byte-equality cut a fail-open against cairn's own
  // admin: `cairn-admin.css` declares `--color-base-300` and `--cairn-card-border` with identical
  // bytes in the same dark block (lines 268 and 381). `border-base-300` paints real boundaries in
  // CairnAdminShell's CMS pill, CairnMediaLibrary's clear-selection button, RepeatableField and
  // MediaHeroField, and a flat `border-base-300` on a floating surface is the hazard
  // `stock-default-hazards` exists to flag, so exempting it inverts the engine's job.
  it('still reports a dark-theme border-base-300 boundary whose token shares the hairline bytes', async () => {
    const findings = await findingsFor(
      `<body style="margin:0;background-color:oklch(24% 0.01 75);
            --color-base-100: oklch(20% 0.01 75);--color-base-200: oklch(24% 0.01 75);
            --color-base-300: oklch(30% 0.014 75);${DARK_TOKENS}">
         <span class="badge-cms" style="display:inline-block;background-color:var(--color-base-100);
              border:1px solid var(--color-base-300);border-radius:6px;padding:2px 6px;margin:24px">CMS</span>
       </body>`,
      'dark'
    );
    expect(selectors(reported(findings))).toEqual(['span.badge-cms']);
    expect(exempted(findings)).toEqual([]);
  });

  // No token at all: the hard-coded literal population the exemption must never reach, on a page
  // that declares the ratified token the way every admin page does.
  it('still reports a hard-coded literal equal to the ratified hairline bytes', async () => {
    const findings = await findingsFor(
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75);${LIGHT_TOKENS}">
         <input class="hardcoded-input" style="background-color:oklch(99% 0.004 75);
              border:1px solid rgb(235, 231, 226);border-radius:8px;padding:8px;
              width:360px;height:40px">
       </body>`,
      'light'
    );
    expect(selectors(reported(findings))).toEqual(['input.hardcoded-input']);
    expect(exempted(findings)).toEqual([]);
  });

  // The case a colour-only exemption could not see: the ratified token used where it separates
  // nothing. Two rows painted the token's own color, with the token as the divider between them,
  // measures 1.00 on both sides and renders no boundary any user can see. This is verbatim the
  // defect the file header says the geometric-adjacency rewrite exists to catch, and the hairline is
  // used as exactly this kind of divider in CairnAdminShell, HelpHome, and ListToolbar.
  it('still reports the ratified token where it renders no boundary at all', async () => {
    const findings = await findingsFor(
      `<body style="margin:0;${DARK_TOKENS};background-color:oklch(30% 0.014 75)">
         <div class="row-a" style="background-color:oklch(30% 0.014 75);height:40px;
              border-bottom:1px solid var(--cairn-card-border)"></div>
         <div class="row-b" style="background-color:oklch(30% 0.014 75);height:40px"></div>
       </body>`,
      'dark'
    );
    expect(selectors(reported(findings))).toEqual(['div.row-a']);
    expect(reported(findings)[0].message).toContain('contrast 1.00');
  });

  // The same bound on the other surface: a card whose own fill drifts onto the hairline's color
  // still reads 1.11 against the ambient outside but 1.00 against its own fill, which is worse than
  // the rendering Geoff ratified, so it reports rather than riding the exemption.
  it('still reports the ratified token when a change makes one of its two surfaces vanish', async () => {
    const findings = await findingsFor(
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75);${LIGHT_TOKENS}">
         <div class="card-drifted-fill" style="background-color:oklch(93% 0.008 75);
              border:1px solid var(--cairn-card-border);border-radius:12px;padding:16px;
              width:200px;height:80px">Card</div>
       </body>`,
      'light'
    );
    expect(selectors(reported(findings))).toEqual(['div.card-drifted-fill']);
  });

  // The ratification is of the token's own undiminished rendering. `opacity` on the bordered
  // element itself is a plausible future regression, a card accidentally styled half transparent,
  // and it renders a fainter, worse boundary than the one Geoff signed off on.
  it('still reports the ratified color when the element itself is dimmed', async () => {
    const findings = await findingsFor(
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75);${LIGHT_TOKENS}">
         <div class="card-shell" style="opacity:0.5;background-color:oklch(99% 0.004 75);
              border:1px solid var(--cairn-card-border);border-radius:12px;padding:16px;
              width:200px;height:80px">Dimmed</div>
       </body>`,
      'light'
    );
    expect(selectors(reported(findings))).toEqual(['div.card-shell']);
  });

  // The half the first cut got wrong while claiming in prose it had got right. `opacity` composites
  // an element WITH its subtree, so an ancestor's dims this hairline exactly as much as it dims the
  // ground beside it. Reading only the element's own opacity left a full-strength stroke over a
  // washed-out ground, so a hairline at 8% strength, which renders as barely there, measured as if
  // nothing had touched it and rode the exemption out of the report.
  it('still reports the ratified color when an ANCESTOR dims it', async () => {
    const findings = await findingsFor(
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75);${LIGHT_TOKENS}">
         <div style="opacity:0.08">
           <div class="card-shell" style="background-color:oklch(99% 0.004 75);
                border:1px solid var(--cairn-card-border);border-radius:12px;padding:16px;
                width:200px;height:80px">Ghost</div>
         </div>
       </body>`,
      'light'
    );
    expect(selectors(reported(findings))).toEqual(['div.card-shell']);
  });
});

// The end of the path, proved on what the real rule really emits rather than on a hand-built
// finding: a ratified hairline and an un-ratified neighbor on one page, run through the resolver
// the runner uses and printed by the formatter the bin prints with. The three properties an
// exception has to have here are all visible in that one output.
describe('border-contrast, Ruling 2: the exemption reaches the report as a counted suppression', () => {
  const TWO_CARDS = `<body style="margin:0;background-color:oklch(96.5% 0.006 75);${LIGHT_TOKENS};display:flex;gap:40px;padding:40px">
      <div class="card-shell" style="background-color:oklch(99% 0.004 75);
           border:1px solid var(--cairn-card-border);border-radius:12px;padding:16px;
           width:200px;height:80px">Ratified</div>
      <div class="card-shell-drifted" style="background-color:oklch(99% 0.004 75);
           border:1px solid oklch(88% 0.01 75);border-radius:12px;padding:16px;
           width:200px;height:80px">Drifted</div>
    </body>`;

  it('counts the exemption, prints its reason, and leaves the exit code to the real finding', async () => {
    const findings = await findingsFor(TWO_CARDS, 'light');
    const resolved = resolveRenderedFindings(
      findings.map((finding) => ({ ...finding, page: '/admin/posts', theme: 'light' as const, state: 'rest' as const })),
      [{ page: '/admin/posts', selectorsSeen: new Set<string>() }],
      []
    );
    // Counted: the exemption is a suppressed finding, not an absence.
    expect(resolved.suppressed).toHaveLength(1);
    expect(resolved.findings.map((finding) => finding.message)).toHaveLength(1);
    expect(resolved.findings[0].message).toContain('div.card-shell-drifted');

    // Printed: the summary states the total, and the line carries the ruling, the token, and the
    // measurement, so a reader who has never opened the rule can tell what was let through.
    const report = { ...resolved, filesScanned: 1, ruleIds: ['border-contrast'] };
    const text = formatReport(report);
    expect(text).toMatch(/1 suppressed/);
    expect(text).toContain('Suppressed:');
    expect(text).toContain('RULING 2');
    expect(text).toContain('--cairn-card-border');
    expect(text).toContain('div.card-shell:');

    // Out of the exit math: this rule is advisory, so the honest proof is that the suppressed
    // finding is not in `findings`, which is the only list `exitCodeFor` reads.
    expect(exitCodeFor(report)).toBe(0);
    expect(exitCodeFor({ ...report, findings: report.suppressed.map((f) => ({ ...f, tier: 'error' as const })) })).toBe(1);
    expect(exitCodeFor({ ...report, suppressed: report.suppressed.map((f) => ({ ...f, tier: 'error' as const })) })).toBe(0);
  });
});
