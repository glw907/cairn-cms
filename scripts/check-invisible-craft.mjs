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
// scope (the showcase demo tree, never part of cairn's own tree; `preview-doc.ts`'s embedded
// iframe-srcdoc string, a `.ts` module rather than a `.svelte` component or a named CSS file); or
// `cairn-admin.css`'s own two reduced-motion-guarded durations, which motion-band's reduced-motion
// exemption would recognize as compliant were that file in the graduated engine's CSS-family
// scope, but it deliberately is not (it is the grammar's own token declaration site, the same
// exclusion `grammar-boundary` draws for the same file).
//
// The scan scope is this gate's own, named here rather than inherited from the engine's consumer
// defaults, because a graduation may not shrink the ground the gate covered. The engine's default
// scope is a consumer site's admin surfaces; this gate also owns the showcase chassis and routes,
// which the pre-graduation gate walked and the default scope does not name. Two roots the old gate
// walked are deliberately absent, each for a reason on record: `examples/showcase/src/theme` (the
// showcase theme's own palette declaration site plus its ratified 650ms carousel crossfade, the
// same trivial-failure exclusion `cairn-admin.css` already carries) and `.ts` modules with an
// embedded style string (outside the engine's CSS-family substrate). Every named root must exist,
// so a rename fails the gate rather than quietly narrowing it.
//
// Wired as `npm run check:invisible-craft`.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const RULE_IDS = ['gap-scale', 'token-colors', 'motion-band'];
/** The directories this gate audits, every one of which must exist in the tree. */
export const SCAN_SCOPE = [
  'src/lib/components',
  'src/lib/admin-toolkit',
  'src/lib/admin-fields',
  'examples/showcase/src/chassis',
  'examples/showcase/src/routes',
];

/** @typedef {import('../src/lib/audit/types.js').AuditReport} AuditReport */
/** @typedef {import('../src/lib/audit/types.js').Finding} Finding */

/**
 * Restrict a full audit report to this gate's own rule ids. A directive naming a rule this gate
 * does not own must never read as dead just because this gate did not ask for that rule, so the
 * restriction happens here, after `runStatic` has already resolved every suppression against the
 * full rule set, never by handing `runStatic` a narrowed rule list itself.
 * @param {AuditReport} report
 * @param {string[]} ruleIds the rule ids this gate owns
 * @returns {AuditReport}
 */
export function scopeReport(report, ruleIds) {
  /** @param {Finding} finding */
  const owns = (finding) => ruleIds.includes(finding.ruleId);
  return {
    findings: report.findings.filter(owns),
    suppressed: report.suppressed.filter(owns),
    filesScanned: report.filesScanned,
    ruleIds: report.ruleIds.filter((id) => ruleIds.includes(id)),
  };
}

async function main() {
  try {
    const { exitCodeFor, formatReport, resolveConfig, runStatic } = await import('../dist/audit/index.js');
    const config = resolveConfig(ROOT, { static: { scope: SCAN_SCOPE } }, (candidate) =>
      existsSync(resolve(ROOT, candidate))
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
