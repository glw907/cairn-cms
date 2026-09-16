// Counts, never the secret's value itself: neither key equals a REDACTED_LOG_KEYS member whole,
// so both survive untouched, the same way the runtime's own whole-key redaction leaves them.
export function recordSafeCounts(
  log: { info(event: string, fields?: Record<string, unknown>): void },
  tokenCount: number,
  tokens: string[]
): void {
  log.info('x.y.z', { tokenCount });
  log.info('x.y.z', { tokens });
}
