// Compiles a preview admin stylesheet for the design-mockup HTML under docs/internal/design/, then
// copies the self-hosted fonts beside it, so a mockup serves with the real admin look. It reuses the
// shipped buildAdminCss pipeline (one scoping and font path, no drift from production) but widens the
// Tailwind @source scan to the design HTML, so a mockup authored in the SAME DaisyUI/Tailwind utility
// classes the components carry compiles those classes into this sheet. The output and the copied fonts
// are gitignored (see docs/internal/design/.gitignore); only the mockup HTML is the tracked record.
//
// Run it with `npm run design:mockup-css`, then serve the folder (see docs/internal/design/README.md).
// A mockup must never hand-author CSS against the design tokens: author it in utility classes so the
// screenshot renders what ships and the Svelte port is a transcription, not a re-derivation.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildAdminCss } from './build-admin-css.mjs';

const repoRoot = new URL('../', import.meta.url);
const designDir = fileURLToPath(new URL('docs/internal/design', repoRoot));
const fontsSrc = fileURLToPath(new URL('dist/components/fonts', repoRoot));

// The glob is relative to the input CSS (scripts/), the base buildAdminCss resolves @source against.
const css = await buildAdminCss({ extraSources: ['../docs/internal/design/*.html'] });
writeFileSync(`${designDir}/cairn-admin.css`, css);

// The fonts ship from dist/components/fonts after `npm run package`; copy them beside the sheet so the
// mockup's @font-face ./fonts/ urls resolve when the folder is served.
mkdirSync(`${designDir}/fonts`, { recursive: true });
cpSync(fontsSrc, `${designDir}/fonts`, { recursive: true });

console.log(`wrote ${designDir}/cairn-admin.css (${css.length} bytes) and copied fonts`);
