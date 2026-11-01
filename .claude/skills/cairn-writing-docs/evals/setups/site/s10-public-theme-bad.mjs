// Known-bad for S10-public-theme: the green is written as literals into the site's component CSS
// and a component's own style block, and the theme's role tokens are never touched. The page
// looks green where those rules reach, and the engine's roles (focus rings, code keywords, the
// daisyUI buttons) stay blue in both schemes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} root */
export default function setup(root) {
  mkdirSync(join(root, 'src/theme/components'), { recursive: true });
  writeFileSync(
    join(root, 'src/theme/site.css'),
    `a { color: oklch(45% 0.1 150); }
.btn-primary { background: oklch(45% 0.1 150); }
body { background: oklch(97.5% 0.012 100); }
`,
  );
  writeFileSync(
    join(root, 'src/theme/components/SiteHeader.svelte'),
    `<header>
  <a href="/">Home</a>
</header>

<style>
  header { background: oklch(45% 0.1 150); }
  a { color: white; }
</style>
`,
  );
}
