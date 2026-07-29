// The rendered rules against a real browser. This is the suite the six rules should have had from
// the start: each of them shipped green under a `page.evaluate` test double that returned canned
// records, so no in-page function ever executed and no real computed style was ever read. An
// adversarial pass then demonstrated, against real Chromium, that two rules threw `ReferenceError`
// on every page they had ever been pointed at, that three could not read cairn's own oklch palette
// and reported clean against the interface they exist to audit, and that four raised error-tier
// false positives on cairn's own components. Every case below is one of those demonstrations,
// preserved as the regression fixture for the substrate fix that closed it.
//
// The fixtures are deliberately built from real cairn markup and real cairn token values (the Warm
// Stone palette is oklch end to end, Tailwind's opacity modifier compiles to `color-mix(in
// oklab, ...)`), because the previous suite's hand-written `rgb()` strings are precisely the
// serialization this admin never produces.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { exitCodeFor } from '../../../../../lib/audit/report.js';
import { renderedRules } from '../../../../../lib/audit/rules/rendered/index.js';
import { borderContrast } from '../../../../../lib/audit/rules/rendered/border-contrast.js';
import { chipGroundCollision } from '../../../../../lib/audit/rules/rendered/chip-ground-collision.js';
import { focusRenders } from '../../../../../lib/audit/rules/rendered/focus-renders.js';
import { interactiveContrast } from '../../../../../lib/audit/rules/rendered/interactive-contrast.js';
import { oneFilledAction } from '../../../../../lib/audit/rules/rendered/one-filled-action.js';
import { relationalSpacing } from '../../../../../lib/audit/rules/rendered/relational-spacing.js';
import { touchTargets } from '../../../../../lib/audit/rules/rendered/touch-targets.js';
import { viewportOverflow } from '../../../../../lib/audit/rules/rendered/viewport-overflow.js';
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
async function findingsFor(
  rule: RenderedRule,
  html: string,
  viewport = { width: 1280, height: 800 }
): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport });
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

/** The selectors a run reported, for the assertions that care about which element was named. */
function selectors(findings: RenderedFinding[]): string[] {
  return findings.map((finding) => finding.selector);
}

// The admin's own theme shape: `data-theme` on a bare wrapper INSIDE body, with every palette token
// in oklch. Both halves matter. A rule that resolves the accent anywhere but on the element it is
// judging reads `transparent`, and a rule that parses color syntax reads nothing at all.
const THEME = `
  <style>
    [data-theme='cairn-admin'] {
      --color-primary: oklch(52% 0.2 293);
      --color-neutral: oklch(26% 0.014 75);
      --color-base-100: oklch(99% 0.004 75);
      --color-base-200: oklch(96.5% 0.006 75);
    }
    .btn { border: 0; padding: 8px 16px; font: 500 14px system-ui; }
    .btn-primary { background-color: var(--color-primary); color: white; }
    .btn-neutral { background-color: var(--color-neutral); color: white; }
    .btn-ghost { background-color: transparent; color: inherit; }
  </style>`;

describe('one-filled-action against a real browser', () => {
  // The accent was read off a scratch element appended to document.body, but --color-primary is
  // declared on the [data-theme] wrapper nested inside body, so var(--color-primary) was invalid at
  // computed-value time and the accent resolved to rgba(0, 0, 0, 0). Two competing accent fills
  // reported clean.
  it('catches two accent fills on one surface when the theme lives on a nested wrapper', async () => {
    const findings = await findingsFor(
      oneFilledAction,
      `${THEME}<body><div data-theme="cairn-admin"><main>
        <button type="submit" class="btn btn-primary" id="save">Save changes</button>
        <button type="submit" class="btn btn-primary" id="publish">Publish site</button>
      </main></div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: 'one-filled-action', tier: 'error', selector: 'main' });
    expect(findings[0].message).toContain('button#save');
  });

  // The mirror image of the same defect: with the accent resolving transparent, every ghost button
  // matched instead, and a correctly designed surface (one accent, two ghosts) was reported as two
  // competing accent fills.
  it('leaves ghost buttons alone beside a single accent fill', async () => {
    const findings = await findingsFor(
      oneFilledAction,
      `${THEME}<body><div data-theme="cairn-admin"><main>
        <button type="submit" class="btn btn-primary" id="save">Save changes</button>
        <button type="button" class="btn btn-ghost" id="cancel">Cancel</button>
        <button type="button" class="btn btn-ghost" id="back">Back</button>
      </main></div></body>`
    );
    expect(findings).toEqual([]);
  });

  // The sanctioned ink fill is exempt by construction rather than by name: it resolves
  // --color-neutral, which is not the accent, so it never competes.
  it('does not count the sanctioned ink fill as an accent fill', async () => {
    const findings = await findingsFor(
      oneFilledAction,
      `${THEME}<body><div data-theme="cairn-admin"><main>
        <button class="btn btn-primary">Publish</button>
        <button class="btn btn-neutral">New post</button>
      </main></div></body>`
    );
    expect(findings).toEqual([]);
  });

  it('partitions by landmark, so one accent fill per landmark stands', async () => {
    const findings = await findingsFor(
      oneFilledAction,
      `${THEME}<body><div data-theme="cairn-admin">
        <nav><button class="btn btn-primary">New</button></nav>
        <main><button class="btn btn-primary">Publish</button></main>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // Reporting nothing because the rule could not resolve its own reference value is the failure
  // shape this whole pass exists to rule out, so the absence is stated rather than swallowed.
  it('says so, rather than reporting clean, when no accent resolves at all', async () => {
    const findings = await findingsFor(
      oneFilledAction,
      `<body><main><button>Save</button><button>Publish</button></main></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].tier).toBe('advisory');
    expect(findings[0].message).toContain('could not measure');
  });
});

describe('focus-renders against a real browser', () => {
  // The harness presses Tab exactly once, and the rule read document.activeElement once, so it
  // inspected only the first tab stop on every page. The .menu items it was written for sit at stop
  // five and beyond in CairnAdminShell's real head-of-document order, so the rule shipped green on
  // a page carrying the exact cascade it exists to catch.
  it('walks past the first tab stop to a menu item whose outline the cascade quieted', async () => {
    const findings = await findingsFor(
      focusRenders,
      `<style>
         a:focus-visible, button:focus-visible { outline: 2px solid oklch(52% 0.2 293); }
         .menu li > a:focus-visible { outline-style: none; }
       </style>
       <body>
         <a href="#" id="crumb">Admin</a>
         <button id="drawer">Menu</button>
         <button id="theme">Theme</button>
         <a href="#" id="brand">cairn</a>
         <nav class="menu"><ul>
           <li><a href="#" id="posts">Posts</a></li>
           <li><a href="#" id="pages">Pages</a></li>
         </ul></nav>
       </body>`
    );
    expect(selectors(findings)).toEqual(['a#posts', 'a#pages']);
  });

  // The transparency test matched an rgba()/hsla() prefix only, which is the one serialization this
  // admin never produces. cairn-admin.css's own doc-title hairline is
  // `color-mix(in oklab, var(--color-primary) 70%, transparent)`, and the one-character regression
  // of that line to 0% is invisible to a sighted user and was invisible to the rule.
  it('catches an outline whose color is transparent in a modern color space', async () => {
    const findings = await findingsFor(
      focusRenders,
      `<style>
         button:focus-visible {
           outline: 1px solid color-mix(in oklab, oklch(52% 0.2 293) 0%, transparent);
         }
       </style>
       <body><button id="only">Rename</button></body>`
    );
    expect(selectors(findings)).toEqual(['button#only']);
  });

  // Four shipped components (MediaPicker, ComponentInsertDialog, CairnMediaLibrary,
  // MediaHeroField) render a Tailwind ring, which compiles to box-shadow, and three of them clear
  // the outline explicitly. An outline-only check raises an error-tier false positive on every one.
  it('accepts a box-shadow ring as a rendered focus indicator', async () => {
    const findings = await findingsFor(
      focusRenders,
      `<style>
         input:focus-visible {
           outline: none;
           box-shadow: 0 0 0 2px color-mix(in oklab, oklch(52% 0.2 293) 70%, transparent);
         }
       </style>
       <body><input id="search" type="text" placeholder="Search media"></body>`
    );
    expect(findings).toEqual([]);
  });

  // A decorative shadow an element already carries at rest is not a focus indicator, which is why
  // the comparison is against that element's own resting paint rather than against `none`.
  it('still flags an element whose box-shadow is the same at rest and on focus', async () => {
    const findings = await findingsFor(
      focusRenders,
      `<style>
         button { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }
         button:focus-visible { outline: none; }
       </style>
       <body><button id="quiet">Save</button></body>`
    );
    expect(selectors(findings)).toEqual(['button#quiet']);
  });

  // daisyUI renders an input's focus ring on the WRAPPING label through :focus-within and clears
  // the input's own outline, which is what cairn's own ListToolbar search field renders. Judging the
  // focused element alone reported an error-tier false positive on a ring a keyboard user can
  // plainly see, on four admin screens.
  it('accepts a ring an ancestor renders through focus-within', async () => {
    const findings = await findingsFor(
      focusRenders,
      `<style>
         label.input { display:inline-flex; align-items:center; gap:8px; padding:4px 8px; }
         label.input:focus-within { outline: 2px solid oklch(52% 0.2 293); outline-offset: 2px; }
         label.input input { outline-style: none; outline-width: 2px; outline-color: oklch(52% 0.2 293);
                             border: 0; background: transparent; }
       </style>
       <body><label class="input"><input type="search" aria-label="Search Posts"></label></body>`
    );
    expect(findings).toEqual([]);
  });

  it('accepts the ordinary opaque outline the admin ring convention renders', async () => {
    const findings = await findingsFor(
      focusRenders,
      `<style>button:focus-visible { outline: 2px solid oklch(52% 0.2 293); }</style>
       <body><button id="ok">Save</button></body>`
    );
    expect(findings).toEqual([]);
  });
});

describe('interactive-contrast against a real browser', () => {
  // The graduated probe's rgb()-only parser was ported verbatim onto a palette that is oklch end to
  // end, so every themed candidate failed to parse and was dropped with no finding and no trace.
  it('catches near-white link text on the oklch base surface', async () => {
    const findings = await findingsFor(
      interactiveContrast,
      `<style>
         html, body { margin: 0; background-color: oklch(99% 0.004 75); }
         a.cta { color: oklch(97% 0.006 75); font: 700 20px system-ui; }
       </style>
       <body><div style="padding:24px"><a class="cta" href="/admin/posts/new">Publish this post</a></div></body>`
    );
    expect(selectors(findings)).toEqual(['a.cta']);
  });

  // The ground half of the same defect, and the more insidious one: an unparseable ancestor was
  // treated as unpainted, so the walk stepped past a dark opaque panel and scored the text against
  // a fallback white. That does not merely skip the check, it manufactures a confident pass.
  it('catches near-black text on an oklch panel instead of scoring it against a fallback white', async () => {
    const findings = await findingsFor(
      interactiveContrast,
      `<style>
         .panel { background-color: oklch(26% 0.014 75); padding: 24px; }
         .panel a { color: rgb(20, 20, 20); font: 700 20px system-ui; }
       </style>
       <body><div class="panel"><a href="/admin/settings">Open settings</a></div></body>`
    );
    expect(selectors(findings)).toEqual(['a']);
  });

  // hasOwnText required a DIRECT text child, which misses ComponentInsertDialog's picker rows,
  // whose entire label lives in nested spans.
  it('reaches a label wrapped in a span inside a button', async () => {
    const findings = await findingsFor(
      interactiveContrast,
      `<style>
         button.row { background: #ffffff; border: 0; padding: 10px 16px; font: 20px system-ui; }
         button.row > span { color: #ffffff; }
       </style>
       <body><button class="row" type="button"><span class="label">Publish this post</span></button></body>`
    );
    expect(selectors(findings)).toEqual(['span.label']);
  });

  // An <input> has no child nodes at all, so a direct-text-child requirement excluded every form
  // control in the admin from a rule about interactive text.
  it('reads an input value that renders against its own background', async () => {
    const findings = await findingsFor(
      interactiveContrast,
      `<body><input class="cairn-input" type="text" value="Publish this post"
         style="color:#ffffff;background-color:#ffffff;font:20px system-ui;border:0"></body>`
    );
    expect(selectors(findings)).toEqual(['input.cairn-input']);
  });

  // A gradient band keeps background-color: rgba(0, 0, 0, 0), so the walk continued past a solid
  // dark surface to the white body underneath and reported invisible text as clean. A gradient has
  // no single value to composite, so the honest answer is that the check could not be made.
  it('reports an unmeasurable ground rather than walking past a gradient surface', async () => {
    const findings = await findingsFor(
      interactiveContrast,
      `<style>
         html, body { margin: 0; background-color: #ffffff; }
         .band { background-image: linear-gradient(90deg, #1c1917, #292524); padding: 24px; }
         .band a { color: #1c1917; font: 700 20px system-ui; text-decoration: none; }
       </style>
       <body><div class="band"><a href="/admin/posts/new">Publish this post</a></div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].tier).toBe('advisory');
    expect(findings[0].message).toContain('background-image');
  });

  // Gradient-clipped text takes its paint from the background, not from `color`, which computes
  // transparent. Measuring `color` there reports ratio 1.00 on a wordmark that renders in crisp
  // legible orange, at error tier.
  it('does not flag gradient-clipped text whose color is transparent by design', async () => {
    const findings = await findingsFor(
      interactiveContrast,
      `<style>
         a.brand {
           font: 700 32px system-ui;
           background-image: linear-gradient(90deg, #b4530a, #7c2d12);
           -webkit-background-clip: text; background-clip: text; color: transparent;
         }
       </style>
       <body><a class="brand" href="/admin">cairn</a></body>`
    );
    expect(findings).toEqual([]);
  });

  // A disabled control's quiet text is the deliberate signal that it is inactive, and WCAG 1.4.3
  // exempts inactive components. cairn's own editors screen renders exactly this shape, and it was
  // the one error-tier finding standing between the rule and a clean own-tree contrast run.
  it('does not flag a disabled control whose text is quiet by design', async () => {
    const findings = await findingsFor(
      interactiveContrast,
      `<style>
         body { background-color: oklch(99% 0.004 75); }
         button[disabled] { color: oklch(26% 0.014 75 / 0.2); background: transparent; border: 0; }
       </style>
       <body><button class="btn btn-ghost btn-xs" disabled>Make editor</button></body>`
    );
    expect(findings).toEqual([]);
  });

  it('passes ordinary dark text on the light surface', async () => {
    const findings = await findingsFor(
      interactiveContrast,
      `<style>
         body { background-color: oklch(99% 0.004 75); }
         a { color: oklch(26% 0.014 75); font: 16px system-ui; }
       </style>
       <body><a href="/admin/posts">Posts</a></body>`
    );
    expect(findings).toEqual([]);
  });
});

describe('touch-targets against a real browser', () => {
  // The expansion arithmetic was inverted: a POSITIVE inset reaches inward and widens nothing, but
  // the rule expanded on it. A 20px button with a decorative inset dot (below Geoff's ruled 24x24
  // AA floor, Task 16b) inflated past the floor and its real 20x20 hit area went unreported.
  it('catches a small control whose decorative ::before reaches inward', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<style>
         button.icon-btn { display:inline-flex; width:20px; height:20px; position:relative;
                           padding:0; border:0; background:transparent; }
         button.icon-btn::before { content:""; position:absolute; inset:6px;
                                   border-radius:999px; background:rgba(0,0,0,.08); }
       </style>
       <body><button class="icon-btn" aria-label="Dismiss">x</button></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('20x20');
  });

  // The same inversion against third-party CSS already on the admin's dependency path: daisyUI's
  // .tab::before is a decorative 3px underline at bottom:0; left:10%, whose positive computed left
  // and right widened a below-floor tab past it.
  it('catches a tab whose decorative underline pseudo-element sits inside its box', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<style>
         a.tab { display:inline-flex; align-items:center; width:20px; height:20px;
                 position:relative; text-decoration:none; }
         a.tab::before { content:""; background-color:#999; border-radius:4px; width:80%;
                         height:3px; position:absolute; bottom:0; left:10%; }
       </style>
       <body><a class="tab" href="#">All</a></body>`
    );
    expect(selectors(findings)).toEqual(['a.tab']);
  });

  // The rule's whole reason to exist over the graduated script: a visually small control widened by
  // a real negative-inset hit area clears the floor. The inverted arithmetic flagged exactly this.
  it('passes a small control whose ::before genuinely expands the hit area', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<style>
         button.expanded-btn { display:inline-flex; width:20px; height:20px; position:relative;
                               padding:0; border:0; }
         button.expanded-btn::before { content:""; position:absolute; inset:-12px; }
       </style>
       <body><button class="expanded-btn" aria-label="Expand">v</button></body>`
    );
    expect(findings).toEqual([]);
  });

  // Correcting the signs alone still trusted offsets measured against the wrong box: a ::before on
  // a STATIC control is laid out against a positioned ancestor and can paint nowhere near it.
  it('ignores a ::before whose offsets resolve against an ancestor, not the control', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<style>
         .card { position:relative; padding:40px; width:300px; }
         button.static-btn { display:inline-flex; width:20px; height:20px; padding:0; border:0; }
         button.static-btn::before { content:""; position:absolute; inset:-12px; }
       </style>
       <body><div class="card"><button class="static-btn" aria-label="Static">s</button></div></body>`
    );
    expect(selectors(findings)).toEqual(['button.static-btn']);
  });

  // The graduated script's off-canvas exemption compared against `window.innerHeight`, so on any
  // page taller than one screenful every control below the fold was skipped before the floor was
  // applied. That is why both implementations reported the showcase styleguide clean while its
  // buttons render at 40px and 32px, and why the gate's own four allowlist rows had gone inert. The
  // control itself is sized below the 24x24 AA floor (Task 16b ruling 1) so the off-canvas defect
  // being demonstrated does not depend on which floor is in force.
  it('applies the floor to a control below the fold', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<body style="margin:0"><div style="height:2000px"></div>
       <button class="btn btn-sm" style="width:20px;height:20px;padding:0;border:0">x</button></body>`
    );
    expect(selectors(findings)).toEqual(['button.btn.btn-sm']);
  });

  // The exemption still holds for what it was written for: a skip link parked above the document.
  it('still exempts a control parked off-canvas at rest', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<body style="margin:0"><a class="skip-link" href="#main"
         style="position:absolute;top:-64px;left:0;width:129px;height:40px">Skip to content</a></body>`
    );
    expect(findings).toEqual([]);
  });

  it('passes a control that clears the floor on its own box', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<body><button style="width:48px;height:48px" aria-label="Big">B</button></body>`
    );
    expect(findings).toEqual([]);
  });
});

describe('viewport-overflow against a real browser', () => {
  // A block element's border box is clamped to its container, so overflowing TEXT has no element
  // whose rect exceeds the viewport, and text nodes are not elements. For a CMS this is the primary
  // overflow vector: the overflowing string is what an editor typed.
  it('catches an unbreakable string that overflows its own clamped block', async () => {
    const findings = await findingsFor(
      viewportOverflow,
      `<body style="margin:0"><h1 class="page-title" style="white-space:nowrap">
         Editing: Nordic season opener recap and results roundup</h1></body>`
    );
    expect(selectors(findings)).toContain('h1.page-title');
  });

  // An absolutely positioned pseudo-element is unreachable by querySelectorAll and does not stretch
  // its parent's border box, but it does widen the parent's scrollable content.
  it('catches a decorative pseudo-element bleeding past the viewport', async () => {
    const findings = await findingsFor(
      viewportOverflow,
      `<style>
         body { margin: 0; }
         .section-head { position: relative; }
         .section-head::before { content:""; position:absolute; left:0; top:8px;
                                 width:640px; height:1px; background:#999; }
       </style>
       <body><h2 class="section-head">Posts</h2></body>`
    );
    expect(selectors(findings)).toContain('h2.section-head');
  });

  // getBoundingClientRect reports unclipped geometry, so every child of a deliberate
  // overflow-x: auto wrapper was flagged. Both instances are cairn's own idioms (AdminTable and
  // OfficeList's table wrapper, EditorToolbar's small-screen rail), and allowlisting the false
  // positive would have silenced the real defect that shares its selector signature.
  it('does not flag a table inside its own horizontal scroll container', async () => {
    const findings = await findingsFor(
      viewportOverflow,
      `<body style="margin:0"><div style="overflow-x:auto">
         <table class="admin-table" style="width:900px"><tbody><tr><td>Title</td></tr></tbody></table>
       </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // The parent-already-overflows shortcut did not ask whether the parent was itself reportable, so
  // a hidden wrapper silenced a visible overflowing child.
  it('still reports a visible wide child under a visibility:hidden wrapper', async () => {
    const findings = await findingsFor(
      viewportOverflow,
      `<body style="margin:0"><div class="skeleton-wrap" style="visibility:hidden;width:900px">
         <span class="chip" style="visibility:visible;display:inline-block;width:820px;height:24px"></span>
       </div></body>`
    );
    expect(selectors(findings)).toContain('span.chip');
  });

  it('passes a page that composes inside both widths', async () => {
    const findings = await findingsFor(
      viewportOverflow,
      `<body style="margin:0"><main style="padding:16px"><p>Posts</p></main></body>`
    );
    expect(findings).toEqual([]);
  });

  it('reports both widths when only the narrower one breaks', async () => {
    const findings = await findingsFor(
      viewportOverflow,
      `<body style="margin:0"><div style="width:360px;height:20px;background:#333"></div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('320px viewport');
  });
});

describe('chip-ground-collision against a real browser', () => {
  // The rule's own header names this exact case, and against the real stylesheet it passed with
  // zero findings: the built sheet carries no rgb() background declaration at all, so the parser
  // dropped every chip.
  it('catches a ghost chip whose oklch fill equals its oklch zebra row', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<style>
         tr.zebra { background-color: oklch(96.5% 0.006 75); }
         .badge { background-color: oklch(96.5% 0.006 75); border-radius: 999px;
                  padding: 2px 8px; font: 11px system-ui; display: inline-block; }
       </style>
       <body><table><tbody>
         <tr class="zebra"><td>even row <span class="badge badge-ghost">Draft</span></td></tr>
       </tbody></table></body>`
    );
    expect(selectors(findings)).toEqual(['span.badge.badge-ghost']);
  });

  // Half a parse is worse than none: one parseable chip fill over unparseable ancestors was scored
  // against opaque white and passed at roughly 13:1 on a real dark-on-dark collision.
  it('catches a dark chip on a dark oklch panel instead of scoring it against white', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="background-color: oklch(21% 0.008 75)">
         <div style="background-color: oklch(25% 0.01 75)">
           <span class="badge" style="background-color:rgb(63,61,58);border-radius:999px;
                 padding:2px 8px;font:11px system-ui;display:inline-block">Draft</span>
         </div>
       </body>`
    );
    expect(selectors(findings)).toEqual(['span.badge']);
  });

  // The dark half of this rule went silent for a whole commit: resolving the chip's own translucent
  // fill against an assumed white canvas handed back a lightened chip, which cleared the floor at a
  // manufactured 1.51 where the painted pixels measure 1.11. The values are /admin/media's, read off
  // the running admin: a 90%-alpha oklab fill on the dark media card. The light-theme twin of the
  // same chip kept firing throughout, because white is close enough to a light ground to leave the
  // verdict intact, which is exactly how one theme's fail-open hid behind the other's green.
  it('catches a translucent chip on a dark card, not the same chip lightened by the canvas', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="background-color: oklch(14% 0.008 75)">
         <div style="background-color: oklch(14% 0.008 75); padding: 24px; position: relative">
           <span class="absolute right-2 top-2 inline-flex"
                 style="background-color: oklab(0.24 0.00258819 0.00965926 / 0.9);
                        border-radius: 9999px; padding: 1px 6px; font: 10px system-ui">image</span>
         </div>
       </body>`
    );
    expect(selectors(findings)).toEqual(['span.absolute.right-2.top-2.inline-flex']);
    expect(findings[0]?.message).toContain('contrast 1.1');
  });

  // Seven shipped sites render a filled rounded-full pill with no daisyUI badge class, so a
  // class-name selector missed cairn's own chips. A chip is now a rendered shape.
  it('catches a filled pill that carries no badge class', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body>
         <div style="background-color: rgb(246,244,242); padding: 8px">
           <span class="rounded-full type-chip" style="background-color:rgb(246,244,242);
                 border-radius:9999px;padding:1px 6px;font:10px system-ui;display:inline-block">image</span>
         </div>
       </body>`
    );
    expect(selectors(findings)).toEqual(['span.rounded-full.type-chip']);
  });

  // opacity was tested for exactly zero and never composited, so a chip painted at 4% opacity was
  // scored as if it were an opaque fill.
  it('catches a chip painted at four percent opacity', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body>
         <div style="background-color: rgb(246,244,242)">
           <span class="badge" style="background-color:rgb(90,60,200);opacity:0.04;border-radius:999px;
                 padding:2px 8px;font:11px system-ui;display:inline-block">Draft</span>
         </div>
       </body>`
    );
    expect(selectors(findings)).toEqual(['span.badge']);
  });

  // StatusChip's sanctioned recipe: the border carries the tone and the fill is transparent by
  // design, so the ground showing through is the intended outcome, not a collision.
  it('passes an outline chip with no fill of its own', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<style>
         tr.zebra { background-color: oklch(96.5% 0.006 75); }
         .badge { background-color: transparent; border: 1px solid oklch(26% 0.014 75);
                  border-radius: 999px; padding: 2px 8px; font: 11px system-ui; display: inline-block; }
       </style>
       <body><table><tbody>
         <tr class="zebra"><td><span class="badge badge-outline">Draft</span></td></tr>
       </tbody></table></body>`
    );
    expect(findings).toEqual([]);
  });

  it('passes a strongly toned filled chip on the base surface', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<style>
         body { background-color: oklch(99% 0.004 75); }
         .badge { background-color: oklch(52% 0.2 293); color: white; border-radius: 999px;
                  padding: 2px 8px; font: 11px system-ui; display: inline-block; }
       </style>
       <body><span class="badge badge-primary">Published</span></body>`
    );
    expect(findings).toEqual([]);
  });
});

describe('border-contrast against a real browser', () => {
  // The ratified --cairn-card-border hairline, at its real light-theme oklch value, against the
  // real base-200 ambient the admin's cards sit on. This is the exact case spec 6.3 names, and the
  // ratio this test asserts is the same 1.11:1 the ruling was measured against, reproduced against
  // real Chromium rather than taken on faith.
  //
  // Ruling 2 (Task 16b) settled that question and suppressed the hairline, and this fixture still
  // reports, on purpose: the exemption is keyed to the value the page's own `--cairn-card-border`
  // resolves to, and every fixture in this block authors the color as a literal without declaring
  // the token. The measurement therefore stays pinned here while the ruling reaches the admin's own
  // card recipe, which paints through `var(--cairn-card-border)`. That half lives in
  // `rulings.border-contrast.test.ts`.
  it('catches the ratified light-theme hairline at its documented 1.11:1', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75)">
         <div class="card-shell" style="background-color:oklch(99% 0.004 75);
              border:1px solid oklch(93% 0.008 75);border-radius:12px;padding:16px;
              width:200px;height:80px">Card</div>
       </body>`
    );
    expect(selectors(findings)).toEqual(['div.card-shell']);
    const ratio = Number(findings[0].message.match(/contrast (\d+\.\d+)/)?.[1]);
    expect(ratio).toBeCloseTo(1.11, 1);
  });

  // The dark-theme half of the same ratified hairline, at its own documented 1.43:1.
  it('catches the ratified dark-theme hairline at its documented 1.43:1', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background-color:oklch(15.5% 0.009 75)">
         <div class="card-shell" style="background-color:oklch(24% 0.01 75);
              border:1px solid oklch(30% 0.014 75);border-radius:12px;padding:16px;
              width:200px;height:80px">Card</div>
       </body>`
    );
    expect(selectors(findings)).toEqual(['div.card-shell']);
    const ratio = Number(findings[0].message.match(/contrast (\d+\.\d+)/)?.[1]);
    expect(ratio).toBeCloseTo(1.43, 1);
  });

  // Proof the rule discriminates rather than flagging every border: cairn's own --color-primary
  // token at full strength (not mixed down toward the hairline the way a hover state uses it)
  // clears the floor by a wide margin.
  it('passes a border toned with cairn\'s own --color-primary token at full strength', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75)">
         <div style="background-color:oklch(99% 0.004 75);border:2px solid oklch(52% 0.2 293);
              border-radius:12px;padding:16px;width:200px;height:80px">Selected</div>
       </body>`
    );
    expect(findings).toEqual([]);
  });

  // A border painted fully transparent (the common zero-shift spacer trick: reserve the box a
  // hover border will later occupy) is not a rendered boundary at all, so flagging it at ratio
  // ~1 would be a false positive on a component that paints no edge on purpose.
  it('does not flag a border painted fully transparent', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background-color:#ffffff">
         <div style="border:1px solid transparent;padding:8px;width:100px;height:40px">Spacer</div>
       </body>`
    );
    expect(findings).toEqual([]);
  });

  // A gradient ancestor has no single background-color to composite into a ground, the same gap
  // interactive-contrast and chip-ground-collision report rather than walk past.
  it('reports an unmeasurable ground rather than walking past a gradient ancestor', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<style>
         .band { background-image: linear-gradient(90deg, #1c1917, #292524); padding: 24px; }
       </style>
       <body style="margin:0"><div class="band">
         <div class="chip" style="background-color:#ffffff;border:1px solid #e5e5e5;
              width:80px;height:24px">x</div>
       </div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].tier).toBe('advisory');
    expect(findings[0].message).toContain('background-image');
  });

  // Sides sharing one color are one boundary and report once; a side painted in a genuinely
  // different, passing color is not swept into the same finding just because it shares an
  // element with a failing one.
  it('reports only the sides whose own color fails, not the whole element', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75)">
         <div style="background-color:oklch(99% 0.004 75);border-style:solid;border-width:1px;
              border-top-color:oklch(52% 0.2 293);border-right-color:oklch(93% 0.008 75);
              border-bottom-color:oklch(93% 0.008 75);border-left-color:oklch(93% 0.008 75);
              padding:16px;width:200px;height:80px">Mixed</div>
       </body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toMatch(/right\/bottom\/left|right|bottom|left/);
    expect(findings[0].message).not.toContain('top/right');
  });
});

describe('weight-budget against a real browser', () => {
  // The defect this rule exists for: three font-weights doing no structural work in one content
  // region, nothing here excused by heading, nav, or landmark boundaries.
  it('catches three unstructured font-weights inside one main region', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <p style="font-weight:400">Ordinary paragraph text explaining the field below.</p>
         <label style="font-weight:500">Display name</label>
         <strong style="font-weight:700">Warning: this action cannot be undone.</strong>
       </main></body>`
    );
    expect(findings).toHaveLength(1);
    // The selector is a real CSS selector, not the region LABEL. The label was reported here at
    // first, and `probeSelectors` throws on `main (before any heading)`, so allowlisting this
    // advisory finding minted an error-tier staleness finding and took the run to exit code 1.
    expect(findings[0]).toMatchObject({ ruleId: 'weight-budget', tier: 'advisory', selector: 'main' });
    expect(findings[0].message).toContain('main (before any heading)');
    expect(findings[0].message).toContain('3 distinct font-weights');
  });

  // The money case: cairn's own flagship screens legitimately run 400/500/600/700 across body,
  // nav, eyebrows, and heading chrome, which refutes the route-level form of this rule. Here the
  // page heading is 700, the eyebrow is 600, and the body is 400, three weights on the page, but
  // the heading is chrome (excluded from the region it opens) so only 600 and 400 spend the
  // region's budget.
  it('passes cairn\'s own sanctioned recipe: a bold page heading over an eyebrow and body', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><div data-theme="cairn-admin"><main>
         <h1 style="font-weight:700">Posts</h1>
         <p style="font-weight:600" class="eyebrow">Recently updated</p>
         <p style="font-weight:400">A list of every post on this site.</p>
       </main></div></body>`
    );
    expect(findings).toEqual([]);
  });

  // Nav lives outside <main> in this admin's own shell (a sibling, never a descendant), so its
  // weights structurally cannot reach main's tally. Two weights sit in nav (500, 600) and one sits
  // in main (400): if nav were wrongly folded in, that is three distinct weights and a violation;
  // scoped correctly to main alone, it is one weight.
  it('never counts nav\'s own weights toward main\'s budget', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body>
         <nav>
           <a style="font-weight:500">Posts</a>
           <a style="font-weight:600" aria-current="page">Pages</a>
         </nav>
         <main><p style="font-weight:400">Body copy only, nothing else in here.</p></main>
       </body>`
    );
    expect(findings).toEqual([]);
  });

  // An open dialog is its own content region, standing alone the way one-filled-action's own
  // surface partition treats a layer: while the dialog is open, its content is judged
  // independently of main, not merged with it. Both main and the dialog carry three weights that
  // would violate on their own; if the scan folded both together (or scanned main instead of the
  // dialog), this would report on main too, or report a six-weight combined region. It reports on
  // the dialog alone.
  it('treats an open dialog as its own region, independent of main underneath it', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <p style="font-weight:400">Body copy that would trip the floor on its own.</p>
         <label style="font-weight:500">Field label.</label>
         <strong style="font-weight:700">Random bold emphasis.</strong>
       </main>
       <dialog open>
         <h2 style="font-weight:700">Rename</h2>
         <label style="font-weight:500">New name</label>
         <p style="font-weight:400">Body copy.</p>
         <strong style="font-weight:600">A bold aside.</strong>
       </dialog>
       </body>`
    );
    // Both regions are judged. The first cut let the dialog REPLACE main, and an adversarial pass
    // showed the cost on the real admin: opening any picker on /admin/posts took main's own
    // four-weight violation from reported to silent, and a 10x10 `role="dialog"` div anywhere on
    // the page did the same. "Standing alone" means not merged into main's tally, not that main
    // stops being measured.
    expect(findings).toHaveLength(2);
    expect(findings.map((finding) => finding.selector)).toEqual(['main', 'h2']);
    expect(findings[1].message).toContain('dialog');
    expect(findings[1].message).toContain('Rename');
  });

  // The fail-loud case: this admin's own login screen renders outside CairnAdminShell and carries
  // no <main> landmark at all, so this rule has no content region to identify. Reporting nothing
  // would read as "measured, and clean", the exact silent-pass shape the whole pass exists to rule
  // out, so the absence of a landmark is itself the finding.
  it('says so, rather than reporting clean, when no main landmark and no open dialog exist', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><div class="card-shell"><h1 style="font-weight:700">Sign in</h1>
         <p style="font-weight:400">Check your email for a link.</p>
       </div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].tier).toBe('advisory');
    expect(findings[0].message).toContain('no <main> landmark');
  });

  it('never lets an advisory finding change the exit-code verdict', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <p style="font-weight:400">Body copy.</p>
         <label style="font-weight:500">Label.</label>
         <strong style="font-weight:700">Emphasis.</strong>
       </main></body>`
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => finding.tier === 'advisory')).toBe(true);
    const report = {
      findings: findings.map((finding) => ({ ...finding, file: '/fixture', line: 0, start: 0, end: 0 })),
      suppressed: [],
      filesScanned: 1,
      ruleIds: [weightBudget.id],
    };
    expect(exitCodeFor(report)).toBe(0);
  });
});

// The admin's own grammar-token declaration (cairn-admin.css's plain :root rule), reproduced
// exactly so these fixtures measure against the same four values a real admin page would.
const GAP_TOKENS = `
  <style>
    :root {
      --cairn-gap-label: 0.25rem;
      --cairn-gap-control: 0.5rem;
      --cairn-gap-group: 1rem;
      --cairn-gap-section: 1.5rem;
    }
  </style>`;

describe('relational-spacing against a real browser', () => {
  // The built admin sheet scopes the grammar tokens' :root rule down to
  // `[data-theme='cairn-admin'/-dark']` at compile time, so a page shaped like the real admin
  // (the theme wrapper nested inside body, matching CairnAdminShell's own markup) resolves nothing
  // for a scratch element parented on document.body: this is the same scoper one-filled-action's
  // own regression fixture demonstrates for --color-primary, reproduced here for the gap tokens.
  it('resolves the gap tokens through the real admin shape, wrapper nested inside body', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS.replace(':root', "[data-theme='cairn-admin']")}<body><div data-theme="cairn-admin">
         <div class="fieldset-group" style="display:flex;flex-direction:column;gap:16px">
           <div style="height:20px">Row A</div>
           <div class="inner-section" style="display:flex;flex-direction:column;gap:24px">
             <div style="height:20px">Inner 1</div>
             <div style="height:20px">Inner 2</div>
           </div>
         </div>
       </div></body>`
    );
    expect(selectors(findings)).toEqual(['div.inner-section']);
  });

  // The headline contract: a nested rhythm should never open wider than the rhythm containing it.
  // EditPage's own real shape nests a gap-label fieldset inside a gap-section wrapper; this is the
  // inversion of that, a gap-section rhythm one level deeper than the gap-group wrapping it.
  it('flags a nested rhythm that opens wider than the container holding it', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0">
         <div class="fieldset-group" style="display:flex;flex-direction:column;gap:16px">
           <div style="height:20px;background:#ccc">Row A</div>
           <div class="inner-section" style="display:flex;flex-direction:column;gap:24px">
             <div style="height:20px;background:#ccc">Inner 1</div>
             <div style="height:20px;background:#ccc">Inner 2</div>
           </div>
         </div>
       </body>`
    );
    expect(selectors(findings)).toEqual(['div.inner-section']);
    expect(findings[0].message).toContain('gap-section');
    expect(findings[0].message).toContain('gap-group');
  });

  // daisyUI's own `.input` sets `display:inline-flex; gap:.5rem` for its internal icon slot, an
  // implementation detail of one leaf control that coincidentally lands on gap-control's own 8px.
  // Against the real shipped admin, every text field's `.input` inside its `label.gap-label`
  // wrapper read as a spurious "gap-control rhythm nested inside gap-label", a widget's own chrome
  // standing in for a layout relationship that was never asserted.
  it("does not read a form control's own internal icon-slot gap as a nested layout region", async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0">
         <label style="display:flex;flex-direction:column;gap:4px">
           <span>Title</span>
           <input class="input" type="text" style="display:inline-flex;gap:8px;align-items:center">
         </label>
       </body>`
    );
    expect(findings).toEqual([]);
  });

  // The sanctioned recipe EditPage.svelte actually ships: a gap-section wrapper holding a
  // gap-label fieldset directly, no gap-group tier in between. Skipping a tier is not a
  // violation; the check compares measured pixels, not an asserted adjacency.
  it('passes the sanctioned section-then-label nesting with no group tier in between', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0">
         <div style="display:flex;flex-direction:column;gap:24px">
           <fieldset style="display:flex;flex-direction:column;gap:4px;border:0;margin:0;padding:0">
             <legend>Group</legend>
             <div style="height:10px">Field</div>
             <div style="height:10px">Field2</div>
           </fieldset>
         </div>
       </body>`
    );
    expect(findings).toEqual([]);
  });

  // FieldInput's own shape (label wraps a text span and its control), but with the wrong specific
  // token: gap-control's 8px instead of gap-label's 4px. gap-scale alone cannot catch this, since
  // gap-control is a valid token; only the RELATIONSHIP, that a label sits at label-gap from its
  // control, tells the two apart.
  it('flags a label sitting at control-gap distance from its control, not label-gap', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0">
         <label class="field-title" style="display:flex;flex-direction:column;gap:8px">
           <span>Title</span>
           <input type="text">
         </label>
       </body>`
    );
    expect(selectors(findings)).toEqual(['label.field-title']);
    expect(findings[0].message).toContain('8px');
    expect(findings[0].message).toContain('gap-control');
    expect(findings[0].message).toContain('4px');
  });

  // CairnAdminShell's own drawer-content shape: exactly two painted children (a topbar, a routed
  // page), the second of which contains a search input many nodes deep. Matching a control
  // ANYWHERE inside the second slot read the whole topbar's aggregated text as a "label" sitting
  // 0px from a control it has nothing to do with, against the real shipped admin.
  it('does not read a whole shell region as a label because a search input sits deep inside it', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0">
         <div class="drawer-content" style="display:flex;flex-direction:column">
           <div class="topbar">Waymark <button>Search or jump to… &#8984;K</button> Publish site</div>
           <main>
             <div class="toolbar"><div class="search-wrap"><input type="search" placeholder="Search"></div></div>
             <p>Posts</p>
           </main>
         </div>
       </body>`
    );
    expect(findings).toEqual([]);
  });

  // Three same-signature rows under one parent that relies on per-child margin instead of the
  // parent's own gap: the third row's margin breaks the otherwise-uniform 8px rhythm.
  it("flags a same-level sibling whose own margin breaks the group's uniform gap", async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0">
         <div style="display:flex;flex-direction:column">
           <div class="field-row" style="height:20px;margin-bottom:8px">Row 1</div>
           <div class="field-row" style="height:20px;margin-bottom:8px">Row 2</div>
           <div class="field-row" style="height:20px;margin-bottom:24px">Row 3</div>
           <div class="field-row" style="height:20px">Row 4</div>
         </div>
       </body>`
    );
    expect(findings).toHaveLength(1);
    expect(selectors(findings)).toEqual(['div.field-row']);
    expect(findings[0].message).toContain('24px');
    expect(findings[0].message).toContain('8px');
  });

  // cairn's own composite recipe (CairnMediaLibrary's gap-group form holding gap-label fields,
  // each shaped like FieldInput's label): all three heuristics read this cleanly at once, so the
  // rule is not "everything fails" against markup built the way the grammar actually recommends.
  it("passes cairn's own gap-group form of gap-label fields across every heuristic at once", async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0">
         <form style="display:flex;flex-direction:column;gap:16px">
           <label class="form-field" style="display:flex;flex-direction:column;gap:4px">
             <span>Title</span><input type="text">
           </label>
           <label class="form-field" style="display:flex;flex-direction:column;gap:4px">
             <span>Slug</span><input type="text">
           </label>
           <label class="form-field" style="display:flex;flex-direction:column;gap:4px">
             <span>Summary</span><input type="text">
           </label>
         </form>
       </body>`
    );
    expect(findings).toEqual([]);
  });

  // Reporting nothing because the page never declares the tokens this rule measures against is the
  // exact failure shape the rest of this family already guards against for their own reference
  // values, so the absence is stated rather than swallowed here too.
  it('says so, rather than reporting clean, when the page declares none of the four gap tokens', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `<body style="margin:0"><div style="display:flex;gap:8px">
         <div>A</div><div>B</div>
       </div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].tier).toBe('advisory');
    expect(findings[0].message).toContain('could not resolve');
  });

  it('never lets a finding change the exit-code verdict', async () => {
    const findings = await findingsFor(
      relationalSpacing,
      `${GAP_TOKENS}<body style="margin:0">
         <div style="display:flex;flex-direction:column;gap:16px">
           <div style="height:20px">Row A</div>
           <div class="inner-section" style="display:flex;flex-direction:column;gap:24px">
             <div style="height:20px">Inner 1</div>
             <div style="height:20px">Inner 2</div>
           </div>
         </div>
       </body>`
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => finding.tier === 'advisory')).toBe(true);
    const report = {
      findings: findings.map((finding) => ({ ...finding, file: '/fixture', line: 0, start: 0, end: 0 })),
      suppressed: [],
      filesScanned: 1,
      ruleIds: [relationalSpacing.id],
    };
    expect(exitCodeFor(report)).toBe(0);
  });
});

// Playwright serializes an in-page function by source, so module scope does not travel with it. Two
// of the six rules referenced module-level bindings from inside `page.evaluate` and threw
// `ReferenceError` on every real page, which no test double could have caught because a double
// never serializes anything. This runs every REGISTERED rule against a real page for exactly that
// reason, so the next rule to make the same mistake fails here rather than in a consumer's run.
describe('the registry', () => {
  it('registers the six error-tier rules spec 6.3 defines, plus border-contrast advisory', () => {
    const rules = renderedRules();
    expect(rules.filter((rule) => rule.tier === 'error').map((rule) => rule.id)).toEqual([
      'one-filled-action',
      'focus-renders',
      'interactive-contrast',
      'touch-targets',
      'viewport-overflow',
      'chip-ground-collision',
    ]);
    expect(rules.filter((rule) => rule.tier === 'advisory').map((rule) => rule.id)).toContain('border-contrast');
    expect(rules.filter((rule) => rule.tier === 'advisory').map((rule) => rule.id)).toContain('weight-budget');
    expect(rules.filter((rule) => rule.tier === 'advisory').map((rule) => rule.id)).toContain('screen-anatomy');
    expect(rules.filter((rule) => rule.tier === 'advisory').map((rule) => rule.id)).toContain('relational-spacing');
  });

  it('never lets an advisory finding change the exit-code verdict', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75)">
         <div style="background-color:oklch(99% 0.004 75);border:1px solid oklch(93% 0.008 75);
              padding:16px;width:200px;height:80px">Card</div>
       </body>`
    );
    // The hairline's own color authored as a literal, without the `--cairn-card-border` token
    // Ruling 2 keyed its exemption to, so this is guaranteed non-empty; the point is what tier it
    // carries.
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => finding.tier === 'advisory')).toBe(true);
    // The exit-criterion proof, not just a tier label: run the same findings through the bin's
    // own gating function and confirm they leave the verdict at zero.
    const report = {
      findings: findings.map((finding) => ({ ...finding, file: '/fixture', line: 0, start: 0, end: 0 })),
      suppressed: [],
      filesScanned: 1,
      ruleIds: [borderContrast.id],
    };
    expect(exitCodeFor(report)).toBe(0);
  });

  it('executes every registered rule against a real page without a serialization failure', async () => {
    const html = `${THEME}<body><div data-theme="cairn-admin"><main>
      <h1>Posts</h1>
      <button class="btn btn-primary">New post</button>
      <a href="/admin/pages">Pages</a>
      <span class="badge">Draft</span>
      <input type="text" placeholder="Search">
    </main></div></body>`;
    for (const rule of renderedRules()) {
      await expect(findingsFor(rule, html)).resolves.toBeInstanceOf(Array);
    }
  }, 60_000);
});
