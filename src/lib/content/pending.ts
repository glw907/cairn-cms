// The pending-branch codec (publish-workflow spec): a pending entry lives on
// `cairn/<conceptKey>/<id>`, and the ref's existence is the only pending state. Concept ids and
// entry ids are slug-safe, so the name needs no escaping; the parser is the codec's inverse.

/** Every pending branch sits under this prefix; one matching-refs call lists them all. */
export const PENDING_PREFIX = 'cairn/';

/** The branch name holding an entry's pending edits. */
export function pendingBranch(concept: string, id: string): string {
  return `${PENDING_PREFIX}${concept}/${id}`;
}

/** Parse a branch name or fully qualified ref back to its entry, or null for any other ref. */
export function parsePendingBranch(ref: string): { concept: string; id: string } | null {
  const name = ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : ref;
  if (!name.startsWith(PENDING_PREFIX)) return null;
  const rest = name.slice(PENDING_PREFIX.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const concept = rest.slice(0, slash);
  const id = rest.slice(slash + 1);
  if (!id || id.includes('/')) return null;
  return { concept, id };
}
