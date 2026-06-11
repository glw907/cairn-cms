// cairn-cms: the single path authority for the single-mount admin dispatcher. The dispatcher
// mounts one catch-all route under /admin and asks this parser which view a raw pathname
// names; every admin URL shape is decided here and nowhere else. The parser is pure: it
// returns a discriminated AdminView, or null for any shape it does not recognize, and the
// caller maps null to a 404.
import type { ConceptDescriptor } from '../content/types.js';
import { findConcept } from '../content/concepts.js';
import { isValidId } from '../content/ids.js';

/** The views the single-mount admin can render, discriminated for the dispatcher's switch. */
export type AdminView =
  | { view: 'index' }
  | { view: 'login' }
  | { view: 'confirm' }
  | { view: 'list'; concept: ConceptDescriptor }
  | { view: 'edit'; concept: ConceptDescriptor; id: string }
  | { view: 'editors' }
  | { view: 'nav' };

/**
 * Fixed first segments that never resolve as concepts. The engine only allows posts and pages
 * today, so no collision is possible, but the parser does not depend on that: a reserved
 * segment wins before concept lookup.
 */
const RESERVED_SEGMENTS = new Set(['login', 'auth', 'editors', 'nav']);

/**
 * Parse a raw `URL.pathname` (the caller passes `event.url.pathname`, never a SvelteKit rest
 * param) into the admin view it names. A single trailing slash is tolerated everywhere; empty
 * internal segments are not. Each segment is percent-decoded individually, so an encoded slash
 * stays inside its segment, where it can never match a concept id or pass `isValidId` and so
 * falls through to null.
 */
export function parseAdminPath(
  pathname: string,
  concepts: ConceptDescriptor[],
): AdminView | null {
  if (pathname !== '/admin' && !pathname.startsWith('/admin/')) return null;
  let rest = pathname.slice('/admin'.length);
  // Tolerate exactly one trailing slash; a doubled one leaves an empty segment behind.
  if (rest.endsWith('/')) rest = rest.slice(0, -1);
  if (rest === '') return { view: 'index' };

  const rawSegments = rest.slice(1).split('/');
  if (rawSegments.includes('')) return null;
  let segments: string[];
  try {
    segments = rawSegments.map((segment) => decodeURIComponent(segment));
  } catch {
    // Malformed percent encoding is an unrecognized shape, not a server error.
    return null;
  }

  if (segments.length === 1) {
    const [head] = segments;
    if (head === 'login') return { view: 'login' };
    if (head === 'editors') return { view: 'editors' };
    if (head === 'nav') return { view: 'nav' };
    if (RESERVED_SEGMENTS.has(head)) return null;
    const concept = findConcept(concepts, head);
    return concept ? { view: 'list', concept } : null;
  }

  if (segments.length === 2) {
    const [head, tail] = segments;
    if (head === 'auth') return tail === 'confirm' ? { view: 'confirm' } : null;
    if (RESERVED_SEGMENTS.has(head)) return null;
    const concept = findConcept(concepts, head);
    if (!concept || !isValidId(tail)) return null;
    return { view: 'edit', concept, id: tail };
  }

  return null;
}
