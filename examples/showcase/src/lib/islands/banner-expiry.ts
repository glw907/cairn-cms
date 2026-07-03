// The expiring-announcement banner island's one shared rule: cairn.config.ts's build() (the server
// fallback) and Banner.svelte (the live component) both call this, so the two independently agree on
// "expired" without sharing any state across the server/client boundary. Each evaluates it fresh, at
// its own render or hydration moment, which is what lets a banner that expires between build and view
// still hide on the live page: the client's own check overrides a server snapshot taken earlier.

/**
 * Whether a banner's `expires` date (`YYYY-MM-DD`) has passed relative to `now`. The banner shows
 * through the end of `expires`, local time, and counts as expired starting the next day. A missing or
 * unparsable `expires` counts as expired too: a broken date must fail silent-to-hidden, since showing
 * a broken banner forever is worse than showing nothing, and an expiring banner that cannot expire
 * defeats its own purpose.
 */
export function isBannerExpired(expires: string | undefined, now: Date = new Date()): boolean {
  if (!expires) return true;
  const endOfDay = new Date(`${expires}T23:59:59`);
  if (Number.isNaN(endOfDay.getTime())) return true;
  return now.getTime() > endOfDay.getTime();
}
