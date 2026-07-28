// cairn-audit's report: one line per finding, then a summary that always states the suppression
// total. Plain text, no ANSI color, so the output reads the same in a terminal and a CI log.
// Suppressions are printed even when the count is zero, because a build that passes by suppression
// is a disguised failure and the number is what makes that visible.
import type { AuditReport, Finding } from './types.js';

function counted(total: number, one: string, many = `${one}s`): string {
  return `${total} ${total === 1 ? one : many}`;
}

function line(finding: Finding): string {
  return `${finding.file}:${finding.line}  ${finding.tier}  ${finding.ruleId}  ${finding.message}`;
}

/** Render a report for a terminal or a CI log. */
export function formatReport(report: AuditReport): string {
  const lines = report.findings.map(line);
  if (report.suppressed.length > 0) {
    lines.push('', 'Suppressed:', ...report.suppressed.map((finding) => `  ${line(finding)}`));
  }
  const errors = report.findings.filter((finding) => finding.tier === 'error').length;
  const advisories = report.findings.length - errors;
  lines.push(
    '',
    `${counted(report.filesScanned, 'file')} scanned, ${counted(report.ruleIds.length, 'rule')} run`,
    `${counted(errors, 'error')}, ${counted(advisories, 'advisory', 'advisories')}, ${report.suppressed.length} suppressed`
  );
  return lines.join('\n');
}

/** The bin's exit code: nonzero if and only if an unsuppressed error-tier finding survived. */
export function exitCodeFor(report: AuditReport): number {
  return report.findings.some((finding) => finding.tier === 'error') ? 1 : 0;
}
