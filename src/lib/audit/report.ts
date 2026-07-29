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

/**
 * The suppressed block, with an identical line printed once and multiplied. One ratified exemption
 * inside a rendered rule covers every element that carries a shared token, which on cairn's own
 * admin is scores of identical lines; that block reads as noise rather than as the exception count
 * it is. Only an exactly identical line collapses, so no distinct selector is lost (a rendered
 * finding's selector is part of its message), and the summary below still counts every finding.
 */
function suppressedBlock(suppressed: Finding[]): string[] {
  const counts = new Map<string, number>();
  for (const finding of suppressed) {
    const text = line(finding);
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  return [...counts].map(([text, count]) => `  ${text}${count > 1 ? `  (x${count})` : ''}`);
}

/** Render a report for a terminal or a CI log. */
export function formatReport(report: AuditReport): string {
  const lines = report.findings.map(line);
  if (report.suppressed.length > 0) {
    lines.push('', 'Suppressed:', ...suppressedBlock(report.suppressed));
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
