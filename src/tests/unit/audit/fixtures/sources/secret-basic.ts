// A field key that exactly matches a REDACTED_LOG_KEYS member. This rule can't tell whether `log`
// here is a cairn `createLogger` instance, so it exists for the case where the same value is also
// written into the message, whether or not the runtime redacts the field itself.
export function recordWithToken(
  log: { info(event: string, fields?: Record<string, unknown>): void },
  token: string
): void {
  log.info('x.y.z', { token });
}
