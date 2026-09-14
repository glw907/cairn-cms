import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postcss from 'postcss';
import prefixSelector from 'postcss-prefix-selector';
import { transform, Features } from 'lightningcss';
import { chromium } from 'playwright';
// The build script is plain ESM under scripts/; the unit project runs in Node.
import { buildAdminCss } from '../../../scripts/build/build-admin-css.mjs';
import type { Browser } from 'playwright';

describe('admin css build', () => {
  // Compile the sheet once and share it across the assertions. Each case used to run its own full
  // Tailwind+DaisyUI compile, so seven compiles raced the default 5s per-test timeout and flaked
  // under the CPU contention of the full tri-project run. One compile in beforeAll, with a generous
  // timeout for the compile step, makes the suite both faster and robust under load.
  let css: string;
  beforeAll(async () => {
    css = await buildAdminCss();
  }, 60_000);

  // INVARIANT DISCIPLINE (do not weaken). The assertions in this suite guard the embed-anywhere and
  // cascade-layer contracts. As the sheet shrinks, a present-class LIST may lose an entry, but no
  // invariant assertion may be removed or relaxed. Dropping a `not.toMatch` re-opens a real shipped bug
  // (the drawer display:block, the auth-page centering). check:custom-surface guards the same rules
  // structurally; this test guards the compiled output.
  it('keeps two of the pinned unlayered rules (menu-focus, guarded-button) by exact selector, out of the unlayered allowlist scripts/checks/custom-surface-budget.json enumerates', () => {
    expect(css).toContain('.menu li > :is(button, a):focus-visible'); // the unlayered focus ring (full selector: a Preflight-substitute rule also starts `.menu li`)
    expect(css).toContain('.cairn-btn-guarded'); // the unlayered pointer-events restore
  });

  it('keeps the named role utilities resolving to their guaranteed-value vars', () => {
    // The frozen `text-muted` / `text-subtle` interface (the guaranteed-value branch from
    // role-layer-contrast.test.ts) is what the sweep migrates the arbitrary `text-[var(--color-muted)]`
    // references onto. The utilities are `@utility` definitions Tailwind tree-shakes, so a standing guard
    // (not the one-time Task-2 grep) must confirm they still compile and still point at their vars; a
    // dropped utility would silently strand every migrated call site with a dead class.
    expect(css).toMatch(/\.text-muted\s*\{\s*color:\s*var\(--color-muted\)/);
    expect(css).toMatch(/\.text-subtle\s*\{\s*color:\s*var\(--color-subtle\)/);
  });

  it('ships the DaisyUI components and Tailwind utilities the admin uses', () => {
    for (const cls of ['.btn', '.drawer', '.navbar', '.menu', '.input', '.alert', '.badge', '.checkbox', '.flex', '.min-h-screen', '.p-4']) {
      expect(css, `missing ${cls}`).toContain(cls);
    }
  });

  it('scopes every rule under the admin theme and leaks no global selector', () => {
    expect(css).toContain("[data-theme='cairn-admin']");
    // No bare global :root/html/body/* rule that would reach the host's public pages.
    expect(css).not.toMatch(/(^|\})\s*(:root|html|body|\*)\s*\{/);
    // No global Preflight margin reset (the admin uses a scoped box-sizing reset instead).
    expect(css).not.toMatch(/\*\s*,[^{]*\{[^}]*margin:\s*0/);
  });

  it('keeps @keyframes step selectors intact', () => {
    // A scoped keyframe step like ":where(...) 0% {" would be a scoping bug.
    expect(css).not.toMatch(/:where\([^{]*\)\s*(0%|100%|from|to)\s*\{/);
  });

  it('self-hosts the brand fonts with an output-relative woff2 url', () => {
    // The fonts ship beside the compiled sheet, so the url must stay relative to the output, not the
    // source tree. A url rebased to `../src/...` would 404 for a consumer loading the dist sheet.
    expect(css).toContain('@font-face');
    expect(css).toContain("font-family:'IBM Plex Sans Variable'");
    expect(css).toContain("url('./fonts/ibm-plex-sans.woff2')");
    expect(css).toContain("url('./fonts/bricolage-grotesque.woff2')");
  });

  it('self-hosts iA Writer Mono in four static faces for the editor surface', () => {
    // The editor face is static, not variable: regular and bold, upright and italic, four files.
    // Each declared the same way as the brand faces, output-relative and swap-displayed.
    for (const face of ['400-normal', '700-normal', '400-italic', '700-italic']) {
      expect(css, `missing ${face}`).toContain(`url('./fonts/ia-writer-mono-latin-${face}.woff2')`);
    }
    expect(css.match(/font-family:'iA Writer Mono'/g)).toHaveLength(4);
  });

  it('carries the scoped Preflight substitute for .menu button items', () => {
    // The sheet omits Preflight, and daisyUI's menu rules assume it: without the substitute a
    // .menu button item renders with the UA chrome (outset border, gray fill) while its anchor
    // siblings render flat. The reset must reach the compiled sheet, scoped and excluding .btn.
    expect(css).toContain('.menu li > button:not(.btn)');
  });

  it('prepends the scope to a flat selector, never in front of a nested combinator', () => {
    // Tailwind/DaisyUI emit native nesting; we flatten it before scoping. A selector that begins
    // ":where(scope) > .x" (scope immediately followed by a combinator) is the signature of the
    // pre-flatten bug that severed the lg:drawer-open sidebar reveal from its parent. There must be
    // none, and the flat desktop reveal rule must survive intact.
    expect(css).not.toMatch(/:where\(\[data-theme=[^)]*\)\s*[>~+]/);
    expect(css).toContain('.lg\\:drawer-open > .drawer-toggle ~ .drawer-side');
  });

  it('fixes the desktop sidebar to the viewport, overriding daisyUI\'s own sticky position', () => {
    // The unlayered override (PINNED unlayered rule 3 of the unlayered allowlist scripts/checks/
    // custom-surface-budget.json enumerates) that stops the desktop sidebar drifting
    // with a document scroll on a host whose body margin is unreset (the embed-anywhere default).
    // The minifier merges this rule with its xl companion below into one comma-joined selector list
    // (identical declarations), so the match allows an optional second selector before the brace.
    expect(css).toMatch(
      /\.lg\\:drawer-open > \.drawer-toggle ~ \.drawer-side(?:,[^{]*)?\s*\{\s*position:\s*fixed/,
    );
  });

  it('fixes the desk-route sidebar to the viewport at xl, its own persist breakpoint', () => {
    // The unlayered `xl:drawer-open` companion (PINNED unlayered rule 4 of the unlayered
    // allowlist scripts/checks/custom-surface-budget.json enumerates, spec §5's desk rider):
    // a desk route persists its sidebar at xl instead of lg, and needs the identical fixed-position
    // fix so it does not scroll-bleed either. Confirms Tailwind 4 actually generates the xl:drawer-open
    // utility this rule overrides (the locked build assumption verified at first touch).
    expect(css).toContain('.xl\\:drawer-open > .drawer-toggle ~ .drawer-side');
    expect(css).toMatch(
      /\.xl\\:drawer-open > \.drawer-toggle ~ \.drawer-side(?:,[^{]*)?\s*\{\s*position:\s*fixed/,
    );
  });

  // The admin build must scan ONLY the admin components, never the whole repo. These tokens exist only in
  // examples/showcase and in docs that discuss the showcase rename; if the sheet carries them, Tailwind's
  // automatic source detection is scanning outside src/lib/components and compiling foreign candidates into
  // the shipped artifact. Do not weaken this: a hit means the content scope regressed.
  it('compiles no foreign token from outside the admin components', () => {
    for (const foreign of ['--text-step', '--container-measure', '--cairn-step', '--cairn-space', '--cairn-measure']) {
      expect(css, `foreign token ${foreign} leaked into the shipped admin sheet`).not.toContain(foreign);
    }
  });

  // The blessed daisyUI 5 safelist (admin-css-safelist.ts): the pass-B "admin CSS class-inventory
  // gap" harvest finding generalized. A daisy class only works in the admin once cairn's build
  // compiles it, so a site-authored admin screen (the ASC admin toolkit, first) can reach for this
  // vocabulary before any shipped cairn component references it. Curated, not exhaustive: these are
  // the families the safelist source documents, not every daisyUI class.
  it('compiles the blessed daisyUI safelist for the admin-toolkit vocabulary', () => {
    for (const cls of [
      '.table-zebra',
      '.table-xs',
      '.stats',
      '.stat-title',
      '.stat-value',
      '.stat-desc',
      '.stat-figure',
      '.stat-actions',
      '.toast-start',
      '.toast-end',
      '.toast-top',
      '.toast-bottom',
      '.indicator-start',
      '.indicator-end',
      '.join-item',
      '.join-horizontal',
      '.join-vertical',
      '.badge-soft',
      '.badge-outline',
      '.badge-dash',
      '.badge-error',
      '.badge-success',
    ]) {
      expect(css, `missing blessed class ${cls}`).toContain(cls);
    }
  });

  // The stock ghost badge retired from cairn's own tree (design infrastructure Pass 3, corpus C) in
  // favor of the two chip registers, then restored to the SHIPPED sheet as a compatibility safelist
  // entry (issue #12, 0.91.1): the shipped sheet's class inventory is a de facto public API, and a
  // consumer's own admin markup may still ride `badge-ghost` even after cairn's tree moved on.
  // admin-sheet-inventory.test.ts is the standing gate against losing this (or any of the other
  // eighteen classes 0.91.0 silently dropped) again.
  it('ships the compatibility-safelisted stock ghost badge modifier', () => {
    expect(css).toContain('.badge-ghost');
  });

  // ConceptList's sort-button touch-target expansion (design infrastructure Pass 3 review triage)
  // deliberately carries no explicit before-content utility, relying instead on two other rules:
  // every `before:`-prefixed utility itself emits `content: var(--tw-content)`, and a universal
  // reset (this test's second assertion) sets that custom property to an empty string on every
  // element. If a future Tailwind release drops either half, the pseudo-element stops painting and
  // the hit-area expansion silently stops working; this fails HERE instead, naming the missing
  // mechanism, rather than surfacing as an unexplained touch-target regression.
  it('keeps the before: content mechanism the touch-target hit-area expansion depends on', () => {
    // Literal string search, not a regex: the compiled selector carries a real backslash
    // character (Tailwind's CSS escaping of the colon in a variant-prefixed class name), and a
    // regex built from these strings would need its own double-escaping to match that backslash
    // rather than silently swallowing it as an escape sequence.
    for (const selector of ['.before\\:absolute:before', '.before\\:inset-x-0:before', '.before\\:-inset-y-1\\.5:before', '.before\\:-z-10:before']) {
      const start = css.indexOf(`${selector} {`);
      expect(start, `expected a :before rule for ${selector}`).toBeGreaterThan(-1);
      const end = css.indexOf('}', start);
      expect(css.slice(start, end)).toContain('content: var(--tw-content)');
    }
    // The universal reset that resolves --tw-content to an empty string absent any utility
    // overriding it (e.g. a tooltip's own `--tw-content: attr(data-tip)`).
    expect(css).toMatch(/--tw-content:\s*("");/);
  });

  // The authoring-form proof: --default-transition-duration and --default-transition-timing-function
  // point at the token custom properties, not at a millisecond or cubic-bezier literal. This is what
  // makes the override an unlayered restatement of Tailwind's own theme-layer default rather than a
  // hand-copied value that could drift from the token table.
  it('points the Tailwind transition defaults at a --cairn-dur- token reference, not a literal', () => {
    expect(css).toMatch(/--default-transition-duration:\s*var\(--cairn-dur-base\)/);
    expect(css).toMatch(/--default-transition-timing-function:\s*var\(--cairn-ease-standard\)/);
  });
});

// The source-order proof (adapted from the shipped pipeline's own three stages: Tailwind/postcss,
// lightningcss's nesting flatten, then postcss-prefix-selector): a class-bearing restatement placed
// AFTER the blanket reduced-motion rule, inside the same guard, with a DIFFERENT declaration value,
// stays after it in the compiled output. Both selectors tie at (0,1,0) specificity and both carry
// !important, so only source order decides which one an element matching both ends up computing;
// this is measured against the actual toolchain rather than asserted as a general CSS fact, because a
// future restatement (the floor clause a later task adds) depends on winning that tie by staying
// later in the file.
describe('the reduced-motion guard: source order between tied-specificity !important rules', () => {
  const SCOPE = ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])";

  async function compileLikePipeline(source: string): Promise<string> {
    // Stage 1b/2 only: the risk this proof measures is whether the nesting-flatten step or the
    // selector-prefix step reorders same-specificity rules, not whether Tailwind's own utility
    // generation does, so the fixture skips the Tailwind stage and hands plain CSS straight to the
    // same two transforms build-admin-css.mjs applies.
    const flattened = new TextDecoder().decode(
      transform({
        filename: 'fixture.css',
        code: new TextEncoder().encode(source),
        include: Features.Nesting,
        minify: false,
      }).code,
    );
    const scoped = await postcss([
      prefixSelector({
        prefix: SCOPE,
        transform(_prefix, selector, prefixed) {
          return selector.includes('[data-theme=') ? selector : prefixed;
        },
      }),
    ]).process(flattened, { from: undefined });
    return scoped.css;
  }

  it('keeps a later class-bearing restatement after the blanket rule in the compiled output', async () => {
    const source = [
      "@media (prefers-reduced-motion: reduce) {",
      "  [data-theme='cairn-admin'], [data-theme='cairn-admin'] * {",
      '    transition-duration: 0.01ms !important;',
      '  }',
      '  .cairn-caret {',
      '    transition-duration: 150ms !important;',
      '  }',
      '}',
    ].join('\n');
    const out = await compileLikePipeline(source);
    const blanketAt = out.indexOf('.01ms !important');
    const restatementAt = out.indexOf('.cairn-caret');
    expect(blanketAt, 'expected the blanket rule in the compiled fixture').toBeGreaterThan(-1);
    expect(restatementAt, 'expected the restatement rule in the compiled fixture').toBeGreaterThan(-1);
    expect(restatementAt).toBeGreaterThan(blanketAt);
  });
});

// The runtime proof: a resting frame carries no curve, so the source-text assertions above cannot
// show the largest visual delta this task makes (the default easing curve). This drives a headless
// browser (already a project dependency) to read the actual COMPUTED transition-duration and
// transition-timing-function Tailwind's own transition-colors utility resolves to under each admin
// theme root, proving the cascade genuinely lands on the token values rather than on Tailwind's stock
// 150ms/cubic-bezier(.4, 0, .2, 1) pair.
describe('the admin transition defaults: runtime computed style', () => {
  let css: string;
  let browser: Browser;

  beforeAll(async () => {
    css = await buildAdminCss();
    browser = await chromium.launch();
  }, 60_000);

  afterAll(async () => {
    await browser.close();
  });

  async function computedTransition(theme: string): Promise<{ duration: string; timing: string }> {
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><html><head><style>${css}</style></head>` +
        `<body><div data-theme="${theme}"><button class="transition-colors">x</button></div></body></html>`,
    );
    const result = await page.evaluate(() => {
      const el = document.querySelector('button')!;
      const style = getComputedStyle(el);
      return { duration: style.transitionDuration, timing: style.transitionTimingFunction };
    });
    await page.close();
    return result;
  }

  it('resolves to the base duration and the standard curve under the light theme root', async () => {
    const { duration, timing } = await computedTransition('cairn-admin');
    expect(duration).toBe('0.15s');
    expect(timing).toBe('cubic-bezier(0.2, 0, 0.38, 0.9)');
  });

  it('resolves to the base duration and the standard curve under the dark theme root', async () => {
    const { duration, timing } = await computedTransition('cairn-admin-dark');
    expect(duration).toBe('0.15s');
    expect(timing).toBe('cubic-bezier(0.2, 0, 0.38, 0.9)');
  });
});
