import { describe, it, expect } from 'vitest';
// The build script is plain ESM under scripts/; the unit project runs in Node.
import { buildAdminCss } from '../../../scripts/build-admin-css.mjs';

describe('admin css build', () => {
  it('ships the DaisyUI components and Tailwind utilities the admin uses', async () => {
    const css = await buildAdminCss();
    for (const cls of ['.btn', '.drawer', '.navbar', '.menu', '.input', '.alert', '.badge', '.checkbox', '.flex', '.min-h-screen', '.p-4']) {
      expect(css, `missing ${cls}`).toContain(cls);
    }
  });

  it('scopes every rule under the admin theme and leaks no global selector', async () => {
    const css = await buildAdminCss();
    expect(css).toContain("[data-theme='cairn-admin']");
    // No bare global :root/html/body/* rule that would reach the host's public pages.
    expect(css).not.toMatch(/(^|\})\s*(:root|html|body|\*)\s*\{/);
    // No global Preflight margin reset (the admin uses a scoped box-sizing reset instead).
    expect(css).not.toMatch(/\*\s*,[^{]*\{[^}]*margin:\s*0/);
  });

  it('keeps @keyframes step selectors intact', async () => {
    const css = await buildAdminCss();
    // A scoped keyframe step like ":where(...) 0% {" would be a scoping bug.
    expect(css).not.toMatch(/:where\([^{]*\)\s*(0%|100%|from|to)\s*\{/);
  });
});
