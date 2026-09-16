export function recordSuppressed(log: { info(event: string): void }): void {
  // cairn-audit-disable-next-line log-event-grammar -- reviewed separately, the collision is deliberate
  log.info('auth.link.requested');
}
