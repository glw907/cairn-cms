// Setup for S10-public-theme: a brand brief lands at the site root. The session carries its colors
// into the public theme.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BRAND = `# Trail crew brand

The public site moves from blue to the crew's forest green. Faces, spacing, and layout stay as
they are.

| Role | Light scheme | Dark scheme |
| --- | --- | --- |
| Brand green (links, buttons, focus rings) | oklch(45% 0.1 150) | oklch(74% 0.1 150) |
| Page background | oklch(97.5% 0.012 100) | oklch(22% 0.01 150) |

The tinted bands and panels, and the rules between sections, should sit with the warmer page, not
keep the old cool grey. Body text, the secondary and accent roles, and the status colors stay as
they are.
`;

/** @param {string} root */
export default function setup(root) {
  writeFileSync(join(root, 'BRAND.md'), BRAND);
}
