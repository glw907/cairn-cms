import type { LayoutServerLoad } from './$types';

/**
 * A minimal fixture field for the preview pass's leak-sentinel e2e (preview.spec.ts).
 *
 * @remarks
 * A parent layout load runs on every route under it, the preview route included, with no session
 * and no route-specific gate: SvelteKit serializes its returned data into the page payload the same
 * way it does for any other load in the chain, so this value reaches an anonymous preview holder
 * exactly as it reaches a public visitor. It carries no secret; it exists so the e2e can assert
 * WHAT a group layout legitimately exports to a preview page's payload, the documented boundary a
 * site with privileged layout data must mind (branch on the route, or mount preview in a sibling
 * group) rather than a leak this engine could plug.
 */
export const load: LayoutServerLoad = () => {
  return { siteLayoutSentinel: 'cairn-showcase-site-layout' };
};
