// cairn-cms: the content manifest, a committed JSON projection of the corpus (content-graph
// design). The files in git stay the source of truth; the manifest exists so request-time admin
// code reads the content graph without an N+1 GitHub crawl. The build regenerates and verifies
// it; the save path patches one entry and commits it with the content in one commit. Each entry
// carries its identity and its outbound cairn: edges, so the manifest is the link graph.
import { parseMarkdown } from './frontmatter.js';
import { deriveExcerpt } from './excerpt.js';
import { entryIdentity, asString } from './identity.js';
import { extractCairnLinks, type CairnRef, type LinkResolve } from './links.js';
import { extractMediaRefs } from './media-refs.js';
import { extractReferenceEdges, type ReferenceEdge } from './references.js';
import { resolveTaxonomyField, coerceTags } from './taxonomy.js';
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
  /**
   * The content hashes of the media this entry references (its hero plus its body images). The
   *  main side of the media where-used index. Additive and optional: an entry with no media omits
   *  the key, and a manifest committed before this field still parses (absent reads as no refs).
   */
  mediaRefs?: string[];
  /**
   * The typed frontmatter reference edges this entry declares (`{ field, concept, id }` each). The
   *  main side of the cross-branch reference index and the reverse `inboundReferences` reader.
   *  Additive and optional: an entry with no reference fields omits the key, and a manifest committed
   *  before this field still parses (absent reads as no edges).
   */
  references?: ReferenceEdge[];
  /**
   * The tag values from this entry's marked taxonomy field, the projection the cross-branch tag
   *  usage index reads. Additive and optional: an entry with no taxonomy field or no tags omits the
   *  key, and a manifest committed before this field still parses (absent reads as no tags).
   */
  tags?: string[];
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

/**
 * Build one manifest entry from a content file. Drafts are included and flagged. The id, date, and
 *  permalink come from entryIdentity, the same source content-index uses, so a cairn: link resolves to
 *  one URL whether the admin preview reads the manifest or the public build reads the content index.
 */
export function manifestEntryFromFile(descriptor: ConceptDescriptor, file: { path: string; raw: string }): ManifestEntry {
  const { frontmatter, body } = parseMarkdown(file.raw);
  const { id, date, permalink } = entryIdentity(descriptor, file.path, frontmatter);
  // Set mediaRefs only when non-empty, so an image-free entry's row stays byte-identical to before
  // (matching the optional-spread for date and summary).
  const mediaRefs = extractMediaRefs(frontmatter, body, descriptor.fields);
  // Set references only when non-empty, mirroring mediaRefs, so a reference-free entry's row stays
  // byte-identical to a manifest committed before this field.
  const references = extractReferenceEdges(frontmatter, descriptor.fields);
  // Project the marked taxonomy field's tags with scalar coercion, so a lone topics: svelte
  // projects ['svelte']. A concept with no taxonomy field carries no tags key.
  const taxField = resolveTaxonomyField(descriptor.fields);
  const tags = taxField ? coerceTags(frontmatter[taxField]) : [];
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
    ...(mediaRefs.length ? { mediaRefs } : {}),
    ...(references.length ? { references } : {}),
    ...(tags.length ? { tags } : {}),
  };
}

/** An empty manifest, the starting point when no committed file exists yet. */
export function emptyManifest(): Manifest {
  return { version: 1, entries: [] };
}

function compareRef(a: CairnRef, b: CairnRef): number {
  return a.concept.localeCompare(b.concept) || a.id.localeCompare(b.id);
}

function compareEdge(a: ReferenceEdge, b: ReferenceEdge): number {
  return a.field.localeCompare(b.field) || a.concept.localeCompare(b.concept) || a.id.localeCompare(b.id);
}

/**
 * Serialize canonically: entries sorted by concept then id, links sorted and deduped, a fixed key
 *  order, two-space pretty, and a trailing newline, so the committed file diffs cleanly in a PR.
 */
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
    ...(e.mediaRefs && e.mediaRefs.length ? { mediaRefs: [...e.mediaRefs].sort() } : {}),
    ...(e.references && e.references.length
      ? { references: [...e.references].sort(compareEdge).map((r) => ({ field: r.field, concept: r.concept, id: r.id })) }
      : {}),
    ...(e.tags && e.tags.length ? { tags: [...e.tags].sort() } : {}),
  }));
  return `${JSON.stringify({ version: 1, entries }, null, 2)}\n`;
}

/**
 * Parse a committed manifest. Throws on malformed JSON, a wrong version, or a malformed entry, so
 *  every reader (the save guard, the delete path, the preview) sees a well-formed graph or a clear
 *  error. The build regenerates the manifest, so a real file is always canonical; this guards a
 *  hand-edited or truncated one.
 */
export function parseManifest(raw: string): Manifest {
  const data = JSON.parse(raw) as unknown;
  if (!data || typeof data !== 'object') {
    throw new Error('cairn: content manifest file is malformed, expected { version, entries: [] }');
  }
  const obj = data as { version?: unknown; entries?: unknown };
  if (obj.version !== 1) {
    throw new Error(`cairn: content manifest version ${String(obj.version)} is unsupported, expected 1`);
  }
  if (!Array.isArray(obj.entries)) {
    throw new Error('cairn: content manifest file is malformed, expected { version, entries: [] }');
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
      (e.mediaRefs === undefined || Array.isArray(e.mediaRefs)) &&
      (e.references === undefined || Array.isArray(e.references)) &&
      (e.tags === undefined || Array.isArray(e.tags)) &&
      Array.isArray(e.links);
    if (!ok) {
      throw new Error(`cairn: content manifest entry ${JSON.stringify(e)} is malformed`);
    }
    // mediaRefs is additive and optional: an entry without it parses (the field reads as absent),
    // so a manifest committed before this field still builds. When present, validate each element
    // is a string, mirroring the link-element validation, so a hand-edited file fails loudly.
    if (e.mediaRefs !== undefined) {
      for (const hash of e.mediaRefs as unknown[]) {
        if (typeof hash !== 'string') {
          throw new Error(`cairn: content manifest mediaRefs element ${JSON.stringify(hash)} in entry ${JSON.stringify(e)} is malformed`);
        }
      }
    }
    // references is additive and optional: an entry without it parses (the field reads as absent), so
    // a manifest committed before this field still builds. When present, validate each edge's shape,
    // mirroring the link-element validation, so a hand-edited file fails loudly rather than dropping a
    // malformed edge to undefined.
    if (e.references !== undefined) {
      for (const edge of e.references as unknown[]) {
        const r = edge as Record<string, unknown> | null;
        if (!r || typeof r !== 'object' || typeof r.field !== 'string' || typeof r.concept !== 'string' || typeof r.id !== 'string') {
          throw new Error(`cairn: content manifest reference ${JSON.stringify(edge)} in entry ${JSON.stringify(e)} is malformed`);
        }
      }
    }
    // tags is additive and optional: an entry without it parses (the field reads as absent), so a
    // manifest committed before this field still builds. When present, validate each element is a
    // string, mirroring the mediaRefs-element validation, so a hand-edited file fails loudly.
    if (e.tags !== undefined) {
      for (const tag of e.tags as unknown[]) {
        if (typeof tag !== 'string') {
          throw new Error(`cairn: content manifest tags element ${JSON.stringify(tag)} in entry ${JSON.stringify(e)} is malformed`);
        }
      }
    }
    // Validate each link element's shape, not just that links is an array. inboundLinks and the
    // delete guard read l.concept and l.id, so a string, null, or id-less element would read as
    // undefined and silently drop a real inbound linker. Reject it here instead.
    for (const link of e.links as unknown[]) {
      const l = link as Record<string, unknown> | null;
      if (!l || typeof l !== 'object' || typeof l.concept !== 'string' || typeof l.id !== 'string') {
        throw new Error(`cairn: content manifest link ${JSON.stringify(link)} in entry ${JSON.stringify(e)} is malformed`);
      }
    }
  }
  return { version: 1, entries: obj.entries as ManifestEntry[] };
}

/** A changed entry and the fields that differ between the built and committed manifests. */
interface ManifestEntryDiff {
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

/**
 * Compare a built manifest against a committed one, keyed by concept+id (the same identity
 *  upsertEntry and removeEntry use). A changed entry names the fields that differ. Pure, so it is
 *  unit-tested apart from any build.
 */
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

/**
 * Throw if the committed manifest drifts from what the corpus says. The canonical serialized form
 *  is the fast-path equality guard, so semantic equality never spuriously fails. On a mismatch the
 *  error names the added, removed, and changed entries, so a raw-git content edit that leaves the
 *  committed manifest stale fails the build loudly with what drifted.
 */
export function verifyManifest(built: Manifest, committedRaw: string): void {
  const builtRaw = serializeManifest(built);
  if (committedRaw === builtRaw) return;
  // mediaRefs is additive: a site whose committed manifest predates the field must still build,
  // even when its content references media (open risk 3, the migration landmine). Before diffing,
  // normalize the built manifest against the committed one: for any built entry whose committed
  // counterpart carries no mediaRefs key, drop mediaRefs from the built entry. An un-regenerated
  // site (committed omits mediaRefs) then matches; a regenerated site (committed carries mediaRefs)
  // still detects real drift in that field. The normalization is per entry and per missing key, so
  // it never masks drift in any other field or in an entry the committed manifest already tracks.
  const committed = parseManifest(committedRaw);
  const committedByKey = new Map(committed.entries.map((e) => [keyOf(e), e]));
  const normalized: Manifest = {
    version: 1,
    entries: built.entries.map((b) => {
      const c = committedByKey.get(keyOf(b));
      let entry = b;
      if (entry.mediaRefs && c && c.mediaRefs === undefined) {
        const { mediaRefs: _dropped, ...rest } = entry;
        entry = rest;
      }
      // references is additive: a site whose committed manifest predates the field must still build,
      // even when its content carries reference edges. Drop the built entry's references only when the
      // committed counterpart omits the key, so an un-regenerated site matches while a regenerated one
      // (committed carries references) still detects real drift in that field.
      if (entry.references && c && c.references === undefined) {
        const { references: _dropped, ...rest } = entry;
        entry = rest;
      }
      // tags is additive: a site whose committed manifest predates the field must still build, even
      // when its content carries tag values. Drop the built entry's tags only when the committed
      // counterpart omits the key, so an un-regenerated site matches while a regenerated one
      // (committed carries tags) still detects real drift in that field.
      if (entry.tags && c && c.tags === undefined) {
        const { tags: _dropped, ...rest } = entry;
        entry = rest;
      }
      return entry;
    }),
  };
  const normalizedRaw = serializeManifest(normalized);
  if (committedRaw === normalizedRaw) return;
  // Diff the canonical built form, not the raw one. serializeManifest sorts each entry's links, so a
  // build whose links are in extraction order would otherwise report a false (links) drift for an
  // entry whose link set is identical and only the order differs. Reuse the serialized form so both
  // sides are canonical.
  const diff = diffManifests(parseManifest(normalizedRaw), committed);
  throw new Error(
    'content manifest is stale: the committed file does not match the corpus.\n' +
      formatDiff(diff) +
      '\nRegenerate it (npm run cairn:manifest) and commit the result.',
  );
}

/**
 * Throw if any entry's reference edge points at a target absent from the corpus. The match is the
 *  `(concept, id)` pair, never id alone, since ids are unique only within a concept. The error names
 *  the source entry, the field the edge was declared on, and the missing target, so a build failure
 *  reads as a content fix. References have no prerender backstop the way body links do, so this build
 *  gate is the only integrity authority; it runs inside the generated virtual-module source (where the
 *  built manifest is in scope), beside `verifyManifest`.
 */
export function verifyReferences(manifest: Manifest): void {
  const present = new Set(manifest.entries.map(keyOf));
  for (const entry of manifest.entries) {
    for (const edge of entry.references ?? []) {
      const target = `${edge.concept}/${edge.id}`;
      if (!present.has(target)) {
        throw new Error(
          `content reference is dangling: ${entry.concept}/${entry.id} field "${edge.field}" points at ${target}, which does not exist.`,
        );
      }
    }
  }
}

/**
 * Replace the entry with the same concept and id, or add it. Order does not matter, since
 *  serializeManifest sorts. This is the save path's incremental patch.
 */
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

/**
 * Every entry whose outbound edges point at the target, excluding the target itself. The delete
 *  guard reads this to name "what links here"; the backlinks panel will reuse it. Pure over the
 *  manifest, so the request-time delete path and a unit test call it the same way.
 */
export function inboundLinks(manifest: Manifest, concept: string, id: string): InboundLink[] {
  return manifest.entries
    .filter((e) => !(e.concept === concept && e.id === id))
    .filter((e) => e.links.some((l) => l.concept === concept && l.id === id))
    .map((e) => ({ concept: e.concept, id: e.id, title: e.title, permalink: e.permalink }));
}

/** One inbound referencer: its identity plus the distinct fields through which it references the target. */
export interface InboundReference {
  concept: string;
  id: string;
  title: string;
  permalink: string;
  /** The distinct fields whose reference edges point at the target, in first-seen order. */
  fields: string[];
}

/**
 * Every entry holding a reference edge at the target, excluding the target itself. The match is the
 *  `(concept, id)` pair, never id alone, since ids are unique only within a concept (the same keyOf
 *  identity upsertEntry and removeEntry use). Each referencer carries the distinct fields through
 *  which it points at the target, for the rename repoint and the delete refusal. Pure over the
 *  manifest, so the request-time paths and a unit test call it the same way.
 */
export function inboundReferences(manifest: Manifest, concept: string, id: string): InboundReference[] {
  const out: InboundReference[] = [];
  for (const e of manifest.entries) {
    if (e.concept === concept && e.id === id) continue;
    const fields: string[] = [];
    for (const edge of e.references ?? []) {
      if (edge.concept === concept && edge.id === id && !fields.includes(edge.field)) {
        fields.push(edge.field);
      }
    }
    if (fields.length > 0) {
      out.push({ concept: e.concept, id: e.id, title: e.title, permalink: e.permalink, fields });
    }
  }
  return out;
}

/** One entry that carries a tag value: enough to name it and link to its edit page in the delete gate. */
export interface TagUsageRow {
  concept: string;
  id: string;
  title: string;
  permalink: string;
}

/**
 * Every published entry whose taxonomy tags include the value, keyed on the bare value (a tag is
 *  corpus-global, unlike a reference whose key is a concept/id pair, since a value means the same
 *  thing in every concept). The cross-branch `buildTagUsageIndex` unions this main read with the open
 *  branches; this pure reader is the published arm and the delete gate's manifest-only query. Pure
 *  over the manifest, so the request-time delete path and a unit test call it the same way.
 */
export function deriveTagUsage(manifest: Manifest, value: string): TagUsageRow[] {
  return manifest.entries
    .filter((e) => e.tags?.includes(value))
    .map((e) => ({ concept: e.concept, id: e.id, title: e.title, permalink: e.permalink }));
}

/**
 * A resolver backed by manifest targets, for the admin preview. A miss returns undefined, so the
 *  render step marks the link broken rather than throwing. The build resolver throws instead.
 */
export function manifestLinkResolver(targets: { concept: string; id: string; permalink: string }[]): LinkResolve {
  const byKey = new Map(targets.map((t) => [`${t.concept}/${t.id}`, t.permalink]));
  return (ref) => byKey.get(`${ref.concept}/${ref.id}`);
}
