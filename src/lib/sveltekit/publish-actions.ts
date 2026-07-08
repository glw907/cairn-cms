// cairn-cms: the publish-actions seam, the adminNav grammar applied to the publish-success moment.
// A site declares plain-data next-step links; this module validates them once at construction (the
// same fail-loud-at-startup posture normalizeAdminNav takes) and, per publish, resolves the
// validated set into templated links for the one entry that just went live. No callback crosses the
// publish redirect: the href is a template string substituted server-side, so the data-only shape
// survives the SSR boundary the same way adminNav's resolved items do.
import type { ConceptDescriptor } from '../content/types.js';

/**
 * One developer-declared publish-success next-step link. `href` is a template string: `{concept}`
 *  and `{id}` are substituted with the published entry's identity at resolve time, so a callback
 *  never needs to cross the publish redirect.
 */
export interface PublishActionEntry {
  label: string;
  href: string;
  /** Restricts this link to the named concept ids; absent renders it after every concept's publish. */
  concepts?: string[];
}

/** A site's raw `publishActions` config: next-step links rendered on the publish-success moment. */
export type PublishActionsConfig = PublishActionEntry[];

/**
 * A validated `PublishActionEntry`. The shape is unchanged from the raw entry; only its label, href,
 *  and `concepts` filter have been checked against the site's real concepts.
 */
export type ResolvedPublishAction = PublishActionEntry;

/** One publish-success next-step link, its href already templated for the published entry. */
export interface PublishActionLink {
  label: string;
  href: string;
}

/**
 * Validate a site's raw publishActions config once at construction (server start): every entry
 *  needs a non-empty label and href, and a `concepts` filter must name only concepts the site
 *  actually configures. Throws an actionable error naming the bad entry, so a typo'd concept id or a
 *  blank field fails at server start rather than silently rendering no link, or the wrong one, after
 *  a publish.
 * @param entries - The raw config, or undefined when the site declares none.
 * @param concepts - The site's concepts, so a `concepts` filter can be checked against real ids.
 * @returns The validated entries, in declaration order.
 */
export function normalizePublishActions(
  entries: PublishActionsConfig | undefined,
  concepts: ConceptDescriptor[],
): ResolvedPublishAction[] {
  if (!entries) return [];
  const known = new Set(concepts.map((c) => c.id));
  return entries.map((entry) => {
    if (!entry.label) throw new Error('publishActions entry is missing a label');
    if (!entry.href) throw new Error(`publishActions entry "${entry.label}" is missing an href`);
    for (const id of entry.concepts ?? []) {
      if (!known.has(id)) {
        throw new Error(
          `publishActions entry "${entry.label}" names an unknown concept "${id}"; this site configures ${[...known].join(', ')}`,
        );
      }
    }
    return entry;
  });
}

/**
 * Resolve a validated publishActions config into the next-step links rendered after one entry's
 *  publish: an entry whose `concepts` filter excludes the published concept is dropped, and every
 *  surviving href has `{concept}` and `{id}` substituted with the published entry's identity. The
 *  second argument is the just-published entry's concept id and id.
 * @param entries - The validated config (`normalizePublishActions`'s output).
 * @returns The links to render, in declaration order.
 */
export function resolvePublishActions(
  entries: ResolvedPublishAction[],
  entry: { concept: string; id: string },
): PublishActionLink[] {
  return entries
    .filter((e) => !e.concepts || e.concepts.includes(entry.concept))
    .map((e) => ({
      label: e.label,
      href: e.href.replace(/\{concept\}/g, entry.concept).replace(/\{id\}/g, entry.id),
    }));
}
