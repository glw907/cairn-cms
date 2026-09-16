// A literal that collides with a CairnLogEvent member cairn's own union already reserves.
export function recordRequested(log: { info(event: string): void }): void {
  log.info('auth.link.requested');
}
