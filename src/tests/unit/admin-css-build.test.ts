import { describe, it, expect, beforeAll } from 'vitest';
// The build script is plain ESM under scripts/; the unit project runs in Node.
import { buildAdminCss } from '../../../scripts/build-admin-css.mjs';

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
  it('keeps the two load-bearing unlayered rules by exact selector', () => {
    expect(css).toContain('.menu li > :is(button, a):focus-visible'); // the unlayered focus ring (full selector: a Preflight-substitute rule also starts `.menu li`)
    expect(css).toContain('.cairn-btn-guarded'); // the unlayered pointer-events restore
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
});
