// A grammar-conforming, unreserved event name: log-event-grammar raises nothing here.
export function recordMisconfiguration(log: { info(event: string): void }): void {
  log.info('admin.signups.misconfigured');
}
