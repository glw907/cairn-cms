// cairn-cms: what the repo's own cairn-audit gate wrappers share. Each wrapper
// (check-invisible-craft, check-admin-css-classes) runs the full engine and reports on the rules it
// owns, so the narrowing lives here once rather than once per gate.
/** @typedef {import('../../src/lib/audit/types.js').AuditReport} AuditReport */
/** @typedef {import('../../src/lib/audit/types.js').Finding} Finding */

/**
 * Restrict a full audit report to one gate's own rule ids. A directive naming a rule this gate does
 * not own must never read as dead just because this gate did not ask for that rule, so the
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
