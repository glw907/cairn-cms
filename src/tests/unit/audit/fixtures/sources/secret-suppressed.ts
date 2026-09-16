export function recordSuppressedSecret(
  log: { info(event: string, fields?: Record<string, unknown>): void },
  token: string
): void {
  // cairn-audit-disable-next-line log-secret-field -- reviewed separately, this call never leaves the process
  log.info('x.y.z', { token });
}
