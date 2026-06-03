// cairn-cms: the content manifest, a committed JSON projection of the corpus (content-graph
// design). The files in git stay the source of truth; the manifest exists so request-time admin
// code reads the content graph without an N+1 GitHub crawl. The build regenerates and verifies
// it; the save path patches one entry and commits it with the content in one commit. Each entry
// carries its identity and its outbound cairn: edges, so the manifest is the link graph.
import { idFromFilename, slugFromId } from './ids.js';
import { parseMarkdown } from './frontmatter.js';
import { permalink } from './permalink.js';
import { extractCairnLinks, type CairnRef, type LinkResolve } from './links.js';
import type { ConceptDescriptor } from './types.js';

/** One entry's projection: its identity, routing, draft flag, and outbound cairn: edges. */
export interface ManifestEntry {
  id: string;
  concept: string;
  title: string;
  date?: string;
  permalink: string;
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

function basename(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(slash + 1) : path;
}

/** Mirror content-index's frontmatter coercion: a present non-empty string, else undefined. */
function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Mirror content-index's date coercion: an unquoted YAML date is a JS Date, a string is sliced. */
function asDate(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return undefined;
}

/** Build one manifest entry from a content file. Drafts are included and flagged. */
export function manifestEntryFromFile(descriptor: ConceptDescriptor, file: { path: string; raw: string }): ManifestEntry {
  const id = idFromFilename(basename(file.path));
  // Use the same slug rule content-index uses, so the manifest's permalink for an entry always
  // equals content-index's permalink for it. A cairn link must resolve to one URL whether the
  // admin preview reads the manifest or the public build reads the content index.
  const slug = slugFromId(id, descriptor.routing.dated ? descriptor.datePrefix : null);
  const { frontmatter, body } = parseMarkdown(file.raw);
  const date = asDate(frontmatter.date);
  return {
    id,
    concept: descriptor.id,
    title: asString(frontmatter.title) ?? id,
    date,
    permalink: permalink(descriptor, { id, slug, date }),
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
    draft: e.draft,
    links: [...e.links].sort(compareRef).map((r) => ({ concept: r.concept, id: r.id })),
  }));
  return `${JSON.stringify({ version: 1, entries }, null, 2)}\n`;
}

/** Parse a committed manifest. Throws on malformed JSON or the wrong shape. */
export function parseManifest(raw: string): Manifest {
  const data = JSON.parse(raw) as unknown;
  if (!data || typeof data !== 'object' || !Array.isArray((data as { entries?: unknown }).entries)) {
    throw new Error('content manifest: malformed file, expected { version, entries: [] }');
  }
  return { version: 1, entries: (data as Manifest).entries };
}

/** Throw if the committed manifest drifts from what the corpus says. Both sides are compared in the
 *  canonical serialized form, so semantic equality never spuriously fails. The build calls this so a
 *  raw-git content edit, which leaves the committed manifest stale, fails the build loudly. */
export function verifyManifest(built: Manifest, committedRaw: string): void {
  if (committedRaw !== serializeManifest(built)) {
    throw new Error(
      'content manifest is stale: the committed file does not match the corpus. Regenerate it (npm run cairn:manifest) and commit the result.',
    );
  }
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
