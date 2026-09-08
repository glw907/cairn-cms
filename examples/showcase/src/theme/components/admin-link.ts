// SiteHeader and SiteFooter both need to know whether a nav href points into the admin mount, so
// the crawler-facing rel="external" and any future admin-specific chrome decision reads one
// predicate instead of two hand-written checks that could drift apart. Every /admin
// route answers a build-time crawl with a 400 by design (it needs a real request, not a static
// prerender), so this covers the mount itself and everything beneath it, not just the exact path.

/** Whether href is the /admin mount or a path beneath it. */
export function isAdminHref(href: string): boolean {
  return href === '/admin' || href.startsWith('/admin/');
}
