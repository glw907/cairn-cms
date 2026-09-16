// A field key that exactly matches a REDACTED_LOG_KEYS member: the runtime already redacts its
// value, and this rule exists for the case where the same value is also written into the message.
export function recordWithToken(
  log: { info(event: string, fields?: Record<string, unknown>): void },
  token: string
): void {
  log.info('x.y.z', { token });
}
