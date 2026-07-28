// cairn-cms: the admin-CSS class-compilation gate, graduated into the packaged cairn-audit
// engine's no-uncompiled-class rule (src/lib/audit/rules/static/no-uncompiled-class.ts): every
// class token an admin component's markup references has to compile into the built
// cairn-admin.css, or be a name the component's own scoped <style> block defines locally. The
// regex substrate this gate used to carry (a hand-rolled brace-matched class-attribute scanner)
// is gone; svelte/compiler and the built-sheet resolver are the substrate now, exercised by the
// audit's own fixture suite (src/tests/unit/audit/rules/no-uncompiled-class.test.ts).
//
// The allowlist this gate used to read from scripts/admin-css-classes-allowlist.json is gone
// too: the graduation's no-drift proof found all twelve of its entries already dead (the
// CairnMediaLibrary/ComponentInsertDialog/IconPicker/MediaPicker/EditPage/EditorToolbar
// test-selector and glyph-sharing hooks each now carry their own local <style> block marker
// declaring the class, a genuine fix rather than a suppression), so both the old regex substrate
// and this one already find zero uncompiled classes with no allowlist at all. See the graduation
// commit for the no-drift proof.
//
// Wired as `npm run check:admin-css-classes`.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const RULE_ID = 'no-uncompiled-class';

/** @typedef {import('../src/lib/audit/types.js').AuditReport} AuditReport */
/** @typedef {import('../src/lib/audit/types.js').Finding} Finding */

/**
 * Restrict a full audit report to one rule's own findings. A directive naming a rule this gate
 * does not own must never read as dead just because this gate did not ask for that rule, so the
 * restriction happens here, after `runStatic` has already resolved every suppression against the
 * full rule set, never by handing `runStatic` a narrowed rule list itself.
 * @param {AuditReport} report
 * @param {string} ruleId the rule id this gate owns
 * @returns {AuditReport}
 */
export function scopeReport(report, ruleId) {
  /** @param {Finding} finding */
  const owns = (finding) => finding.ruleId === ruleId;
  return {
    findings: report.findings.filter(owns),
    suppressed: report.suppressed.filter(owns),
    filesScanned: report.filesScanned,
    ruleIds: report.ruleIds.filter((id) => id === ruleId),
  };
}

async function main() {
  try {
    const { exitCodeFor, formatReport, loadConfig, runStatic } = await import('../dist/audit/index.js');
    const report = scopeReport(runStatic(loadConfig(ROOT)), RULE_ID);
    console.log(formatReport(report));
    process.exitCode = exitCodeFor(report);
  } catch (err) {
    console.error(`check-admin-css-classes: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
