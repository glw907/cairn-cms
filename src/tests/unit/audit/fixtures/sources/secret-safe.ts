// Counts, never the secret's value itself: neither key matches a REDACTED_LOG_KEYS member whole, so
// both survive untouched, the same way the runtime's own whole-key redaction leaves them. Both
// fields are count-shaped on purpose: a log record wants how many tokens were seen, never the
// tokens.
export function recordSafeCounts(
  log: { info(event: string, fields?: Record<string, unknown>): void },
  tokenCount: number,
  tokens: number
): void {
  log.info('x.y.z', { tokenCount });
  log.info('x.y.z', { tokens });
}
