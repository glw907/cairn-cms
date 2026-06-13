// cairn-cms: the content manifest, a committed JSON projection of the corpus (content-graph
// design). The files in git stay the source of truth; the manifest exists so request-time admin
// code reads the content graph without an N+1 GitHub crawl. The build regenerates and verifies
// it; the save path patches one entry and commits it with the content in one commit. Each entry
// carries its identity and its outbound cairn: edges, so the manifest is the link graph.
import { parseMarkdown } from './frontmatter.js';
import { deriveExcerpt } from './excerpt.js';
import { entryIdentity, asString } from './identity.js';
import { extractCairnLinks, type CairnRef, type LinkResolve } from './links.js';
import type { ConceptDescriptor } from './types.js';

/** One entry's projection: its identity, routing, draft flag, and outbound cairn: edges. */
export interface ManifestEntry {
  id: string;
  concept: string;
  title: string;
  date?: string;
  permalink: string;
  summary?: string;
  draft: boolean;
  links: CairnRef[];
}

/** The whole corpus as one committed file. `version` guards a future shape migration. */
export interface Manifest {
  version: 1;
  entries: ManifestEntry[];
}

/** The minimal entry view the preview resolver and (later) the picker read. */
export interface LinkTarget {
  concept: string;
  id: string;
  permalink: string;
  title: string;
  date?: string;
  draft: boolean;
}

/** Build one manifest entry from a content file. Drafts are included and flagged. The id, date, and
 *  permalink come from entryIdentity, the same source content-index uses, so a cairn: link resolves to
 *  one URL whether the admin preview reads the manifest or the public build reads the content index. */
export function manifestEntryFromFile(descriptor: ConceptDescriptor, file: { path: string; raw: string }): ManifestEntry {
  const { frontmatter, body } = parseMarkdown(file.raw);
  const { id, date, permalink } = entryIdentity(descriptor, file.path, frontmatter);
  return {
    id,
    concept: descriptor.id,
    title: asString(frontmatter.title) ?? id,
    date,
    permalink,
    // Coalesce an empty excerpt to undefined, so an empty-body entry carries no summary key at all
    // (matching serialize's optional-spread) and the in-memory and serialized shapes agree.
    summary: deriveExcerpt(body, { description: asString(frontmatter.description) }) || undefined,
    draft: frontmatter.draft === true,
    links: extractCairnLinks(body),
  };
}

/** An empty manifest, the starting point when no committed file exists yet. */
export function emptyManifest(): Manifest {
  return { version: 1, entries: [] };
}

function compareRef(a: CairnRef, b: CairnRef): number {
  return a.concept.localeCompare(b.concept) || a.id.localeCompare(b.id);
}

/** Serialize canonically: entries sorted by concept then id, links sorted and deduped, a fixed key
 *  order, two-space pretty, and a trailing newline, so the committed file diffs cleanly in a PR. */
export function serializeManifest(manifest: Manifest): string {
  const entries = [...manifest.entries].sort(compareRef).map((e) => ({
    id: e.id,
    concept: e.concept,
    title: e.title,
    ...(e.date ? { date: e.date } : {}),
    permalink: e.permalink,
    ...(e.summary ? { summary: e.summary } : {}),
    draft: e.draft,
    links: [...e.links].sort(compareRef).map((r) => ({ concept: r.concept, id: r.id })),
  }));
  return `${JSON.stringify({ version: 1, entries }, null, 2)}\n`;
}

/** Parse a committed manifest. Throws on malformed JSON, a wrong version, or a malformed entry, so
 *  every reader (the save guard, the delete path, the preview) sees a well-formed graph or a clear
 *  error. The build regenerates the manifest, so a real file is always canonical; this guards a
 *  hand-edited or truncated one. */
export function parseManifest(raw: string): Manifest {
  const data = JSON.parse(raw) as unknown;
  if (!data || typeof data !== 'object') {
    throw new Error('content manifest: malformed file, expected { version, entries: [] }');
  }
  const obj = data as { version?: unknown; entries?: unknown };
  if (obj.version !== 1) {
    throw new Error(`content manifest: unsupported version ${String(obj.version)}, expected 1`);
  }
  if (!Array.isArray(obj.entries)) {
    throw new Error('content manifest: malformed file, expected { version, entries: [] }');
  }
  for (const entry of obj.entries) {
    const e = entry as Record<string, unknown>;
    const ok =
      e &&
      typeof e.id === 'string' &&
      typeof e.concept === 'string' &&
      typeof e.title === 'string' &&
      typeof e.permalink === 'string' &&
      typeof e.draft === 'boolean' &&
      (e.date === undefined || typeof e.date === 'string') &&
      (e.summary === undefined || typeof e.summary === 'string') &&
      Array.isArray(e.links);
    if (!ok) {
      throw new Error(`content manifest: malformed entry ${JSON.stringify(e)}`);
    }
    // Validate each link element's shape, not just that links is an array. inboundLinks and the
    // delete guard read l.concept and l.id, so a string, null, or id-less element would read as
    // undefined and silently drop a real inbound linker. Reject it here instead.
    for (const link of e.links as unknown[]) {
      const l = link as Record<string, unknown> | null;
      if (!l || typeof l !== 'object' || typeof l.concept !== 'string' || typeof l.id !== 'string') {
        throw new Error(`content manifest: malformed link ${JSON.stringify(link)} in entry ${JSON.stringify(e)}`);
      }
    }
  }
  return { version: 1, entries: obj.entries as ManifestEntry[] };
}

/** A changed entry and the fields that differ between the built and committed manifests. */
export interface ManifestEntryDiff {
  concept: string;
  id: string;
  fields: string[];
}

/** The drift between a freshly built manifest and the committed one, keyed by concept+id. */
export interface ManifestDiff {
  added: ManifestEntry[];
  removed: ManifestEntry[];
  changed: ManifestEntryDiff[];
}

const keyOf = (e: ManifestEntry) => `${e.concept}/${e.id}`;

/** Compare a built manifest against a committed one, keyed by concept+id (the same identity
 *  upsertEntry and removeEntry use). A changed entry names the fields that differ. Pure, so it is
 *  unit-tested apart from any build. */
export function diffManifests(built: Manifest, committed: Manifest): ManifestDiff {
  const builtByKey = new Map(built.entries.map((e) => [keyOf(e), e]));
  const committedByKey = new Map(committed.entries.map((e) => [keyOf(e), e]));
  const added = built.entries.filter((e) => !committedByKey.has(keyOf(e)));
  const removed = committed.entries.filter((e) => !builtByKey.has(keyOf(e)));
  const changed: ManifestEntryDiff[] = [];
  for (const b of built.entries) {
    const c = committedByKey.get(keyOf(b));
    if (!c) continue;
    // ManifestEntry has no index signature, so read its keys through an unknown-cast record.
    const br = b as unknown as Record<string, unknown>;
    const cr = c as unknown as Record<string, unknown>;
    const fields = [...new Set([...Object.keys(b), ...Object.keys(c)])].filter(
      (k) => JSON.stringify(br[k]) !== JSON.stringify(cr[k]),
    );
    if (fields.length > 0) changed.push({ concept: b.concept, id: b.id, fields });
  }
  return { added, removed, changed };
}

/** Format a diff into a short human-readable block for a build error. */
function formatDiff(d: ManifestDiff): string {
  const lines: string[] = [];
  for (const e of d.added) lines.push(`  + ${keyOf(e)}`);
  for (const e of d.removed) lines.push(`  - ${keyOf(e)}`);
  for (const e of d.changed) lines.push(`  ~ ${e.concept}/${e.id} (${e.fields.join(', ')})`);
  return lines.join('\n');
}

/** Throw if the committed manifest drifts from what the corpus says. The canonical serialized form
 *  is the fast-path equality guard, so semantic equality never spuriously fails. On a mismatch the
 *  error names the added, removed, and changed entries, so a raw-git content edit that leaves the
 *  committed manifest stale fails the build loudly with what drifted. */
export function verifyManifest(built: Manifest, committedRaw: string): void {
  const builtRaw = serializeManifest(built);
  if (committedRaw === builtRaw) return;
  // Diff the canonical built form, not the raw one. serializeManifest sorts each entry's links, so a
  // build whose links are in extraction order would otherwise report a false (links) drift for an
  // entry whose link set is identical and only the order differs. Reuse the serialized form so both
  // sides are canonical.
  const diff = diffManifests(parseManifest(builtRaw), parseManifest(committedRaw));
  throw new Error(
    'content manifest is stale: the committed file does not match the corpus.\n' +
      formatDiff(diff) +
      '\nRegenerate it (npm run cairn:manifest) and commit the result.',
  );
}

/** Replace the entry with the same concept and id, or add it. Order does not matter, since
 *  serializeManifest sorts. This is the save path's incremental patch. */
export function upsertEntry(manifest: Manifest, entry: ManifestEntry): Manifest {
  const entries = manifest.entries.filter((e) => !(e.concept === entry.concept && e.id === entry.id));
  entries.push(entry);
  return { version: 1, entries };
}

/** Drop the entry with the given concept and id, if present. The delete path's patch. */
export function removeEntry(manifest: Manifest, concept: string, id: string): Manifest {
  return { version: 1, entries: manifest.entries.filter((e) => !(e.concept === concept && e.id === id)) };
}

/** One inbound linker: enough to name it and link to its edit page in the delete guard. */
export interface InboundLink {
  concept: string;
  id: string;
  title: string;
  permalink: string;
}

/** Every entry whose outbound edges point at the target, excluding the target itself. The delete
 *  guard reads this to name "what links here"; the backlinks panel will reuse it. Pure over the
 *  manifest, so the request-time delete path and a unit test call it the same way. */
export function inboundLinks(manifest: Manifest, concept: string, id: string): InboundLink[] {
  return manifest.entries
    .filter((e) => !(e.concept === concept && e.id === id))
    .filter((e) => e.links.some((l) => l.concept === concept && l.id === id))
    .map((e) => ({ concept: e.concept, id: e.id, title: e.title, permalink: e.permalink }));
}

/** A resolver backed by manifest targets, for the admin preview. A miss returns undefined, so the
 *  render step marks the link broken rather than throwing. The build resolver throws instead. */
export function manifestLinkResolver(targets: { concept: string; id: string; permalink: string }[]): LinkResolve {
  const byKey = new Map(targets.map((t) => [`${t.concept}/${t.id}`, t.permalink]));
  return (ref) => byKey.get(`${ref.concept}/${ref.id}`);
}
