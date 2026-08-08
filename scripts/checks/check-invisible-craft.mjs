// cairn-cms: the invisible-craft gate, graduated into the packaged cairn-audit engine's
// motion-band, gap-scale, and token-colors static rules
// (src/lib/audit/rules/static/{motion-band,gap-scale,token-colors}.ts). The regex substrate this
// gate used to carry (a hand-rolled comment stripper plus five duration/bracket/color patterns)
// is gone; svelte/compiler and the built-sheet resolver are the substrate now, exercised by the
// audit's own fixture suite
// (src/tests/unit/audit/rules/{motion-band,gap-scale,token-colors}.test.ts).
//
// The budget this gate used to read from scripts/invisible-craft-budget.json is gone too, its
// eleven entries each resolved one of three ways in the graduation's no-drift proof (see the
// graduation commit for the full accounting): a genuine false positive the new rules' own
// scale/remit computation now recognizes as compliant, needing no suppression at all
// (MediaHeroField's `pl-[3.875rem]`, CairnAdminShell's `mt-[12vh]`, EditPage's safe-area
// `pb-[calc(0.5rem+env(safe-area-inset-bottom))]`); a site outside the graduated engine's audited
// scope (`preview-doc.ts`'s embedded iframe-srcdoc string, a `.ts` module rather than a `.svelte`
// component or a named CSS file); the showcase theme's own ratified 650ms carousel crossfade,
// migrated to a co-located `cairn-audit-disable-next-line motion-band` directive at the site
// (Spec 6.1's replacement for a budget-file entry); or the showcase theme's own achromatic
// `--color-base-*` ladder and `--cairn-shadow` color-mix blacks, resolved by naming `theme.css` in
// `paletteFiles` below, the same declared-palette-site exclusion `cairn-admin.css` already carries
// from `token-colors` (config.ts's `DEFAULT_PALETTE_CSS_FILES`).
//
// The scan scope is this gate's own, named here rather than inherited from the engine's consumer
// defaults, because a graduation may not shrink the ground the gate covered. The engine's default
// scope is a consumer site's admin surfaces; this gate also owns the showcase chassis, routes, and
// theme, which the pre-graduation gate walked and the default scope does not name. One root the old
// gate walked is deliberately absent: `.ts` modules with an embedded style string (outside the
// engine's CSS-family substrate). Every named root must exist, so a rename fails the gate rather
// than quietly narrowing it.
//
// Wired as `npm run check:invisible-craft`.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scopeReport } from './audit-gate.mjs';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const RULE_IDS = ['gap-scale', 'token-colors', 'motion-band'];
/** The directories this gate audits, every one of which must exist in the tree. */
export const SCAN_SCOPE = [
  'src/lib/components',
  'src/lib/admin-toolkit',
  'examples/showcase/src/chassis',
  'examples/showcase/src/routes',
  'examples/showcase/src/theme',
];
/**
 * Standalone CSS files this gate's CSS-family rules scan, beyond a component's own scoped
 * `<style>` block. `theme.css` is Waymark's own palette declaration site (the achromatic
 * `--color-base-*` ladder and the `--cairn-shadow` color-mix blacks are the point, not a hazard),
 * so `main` also passes it as a declared palette site (`static.paletteFiles`), which excludes it
 * from `token-colors` while every other CSS-family rule still scans it.
 */
export const CSS_FILES = ['examples/showcase/src/theme/theme.css'];

async function main() {
  try {
    const { DEFAULT_PALETTE_CSS_FILES, exitCodeFor, formatReport, resolveConfig, runStatic } = await import(
      '../../dist/audit/index.js'
    );
    const config = resolveConfig(
      ROOT,
      {
        static: {
          scope: SCAN_SCOPE,
          cssFiles: CSS_FILES,
          paletteFiles: [...DEFAULT_PALETTE_CSS_FILES, ...CSS_FILES],
        },
      },
      (candidate) => existsSync(resolve(ROOT, candidate))
    );
    const report = scopeReport(runStatic(config), RULE_IDS);
    console.log(formatReport(report));
    process.exitCode = exitCodeFor(report);
  } catch (err) {
    console.error(`check-invisible-craft: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
