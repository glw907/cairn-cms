// cairn-cms: the per-concept content index (public-delivery design, decisions 1 and 5). It
// takes raw files from a site's glob, parses them with the engine's own parseMarkdown, and
// returns cheap plain-data summaries plus an on-demand detail lookup. It is concept-generic:
// every operation reads the descriptor and its routing rule, never a hardcoded concept id.
import { parseMarkdown } from '../content/frontmatter.js';
import { entryId, entryIdentity, asDate, asString, asTags } from '../content/identity.js';
import { deriveExcerpt, wordCount } from '../content/excerpt.js';
import { resolveTaxonomyField } from '../content/taxonomy.js';
import { log } from '../log/index.js';
import type { ConceptDescriptor } from '../content/types.js';

// A multiselect literally named like a tag field is the likeliest unmarked taxonomy, so an
// unmarked one earns a build advisory rather than silently reading as []. Source: the taxonomy spec.
const TAG_FIELD_NAMES = ['tags', 'freetags', 'categories'];

/** A raw content file before parsing: the glob key and the file's full markdown text. */
export interface RawFile {
  path: string;
  raw: string;
}

/** The cheap, plain-data view of one entry, for lists, feeds, and the sitemap. */
export interface ContentSummary {
  /**
   * The descriptor id this entry belongs to, e.g. "posts". Lets a list or page branch per
   *  concept without re-deriving it from a proxy like `entry.date`.
   */
  concept: string;
  id: string;
  slug: string;
  permalink: string;
  title: string;
  date?: string;
  updated?: string;
  /**
   * The entry's tags, always present as an array and empty when the file declares none. This is the
   *  read-model normalization. It differs on purpose from the validated `frontmatter.tags`, which the
   *  validator omits when empty, so a published file carries no `tags: []` noise. Read `tags` here for
   *  a list; read `frontmatter.tags` only when you need the validated, possibly-absent value.
   */
  tags: string[];
  excerpt: string;
  wordCount: number;
  draft: boolean;
  /**
   * The frontmatter keys the descriptor nominated via `summaryFields`, read off the validated,
   *  normalized frontmatter. Held in a separate record so a nominated key cannot collide with a
   *  typed summary field. Empty when the concept declares no `summaryFields`.
   */
  fields: Record<string, unknown>;
}

/**
 * The detail view: a summary plus the frontmatter and the body to render. The frontmatter
 *  type defaults to `Record<string, unknown>`; the typed-reads pass infers it from the concept
 *  fields. Generic now so that change does not break this signature.
 */
export interface ContentEntry<F = Record<string, unknown>> extends ContentSummary {
  frontmatter: F;
  body: string;
}

/** One entry's validation failure, recorded at build for the site aggregator's gate. */
export interface ContentProblem {
  id: string;
  draft: boolean;
  errors: Record<string, string>;
}

/** The per-concept query surface. */
export interface ContentIndex<F = Record<string, unknown>> {
  all(opts?: { includeDrafts?: boolean }): ContentSummary[];
  byId(id: string): ContentEntry<F> | undefined;
  byTag(tag: string, opts?: { includeDrafts?: boolean }): ContentSummary[];
  allTags(): { tag: string; count: number }[];
  adjacent(id: string): { newer?: ContentSummary; older?: ContentSummary };
  /** Per-entry validation failures recorded at build, for the site-level build gate. */
  problems(): ContentProblem[];
}

/** Map a Vite eager `?raw` glob record (`{ path: raw }`) to `RawFile[]`. */
export function fromGlob(record: Record<string, string>): RawFile[] {
  return Object.entries(record).map(([path, raw]) => ({ path, raw }));
}

/** Build a concept's index from its raw files and normalized descriptor. */
export function createContentIndex<F = Record<string, unknown>>(
  files: RawFile[],
  descriptor: ConceptDescriptor,
): ContentIndex<F> {
  const problems: ContentProblem[] = [];
  const entries: ContentEntry<F>[] = [];
  // Resolve the taxonomy-marked field once for the whole index. Its validated value is the source
  // of every summary's tags; there is no implicit `tags` fallback. When the concept marks no field
  // but carries a multiselect named like a tag field, warn once that the marker is missing.
  const taxonomyField = resolveTaxonomyField(descriptor.fields);
  if (taxonomyField === null) {
    const unmarked = descriptor.fields.find(
      (f) => f.type === 'multiselect' && TAG_FIELD_NAMES.includes(f.name),
    );
    if (unmarked) log.warn('taxonomy.unmarked_field', { concept: descriptor.id, field: unmarked.name });
  }
  for (const file of files) {
    const { frontmatter: raw, body } = parseMarkdown(file.raw);
    const id = entryId(file.path);
    const draft = raw.draft === true;
    // Validate before resolving the permalink. A date-token permalink throws on an entry with no
    // valid date; the validate gate records that as a content problem rather than aborting the whole
    // index build, so one bad entry degrades to a skip, not a crash. A failure is also excluded from
    // the typed read, so every readable entry's frontmatter is the validator's normalized output.
    const result = descriptor.validate(raw, body);
    if (!result.ok) {
      problems.push({ id, draft, errors: result.errors });
      continue;
    }
    const { slug, date, permalink } = entryIdentity(descriptor, file.path, raw);
    const summaryFieldValues: Record<string, unknown> = {};
    for (const key of descriptor.summaryFields) {
      if (key in result.data) summaryFieldValues[key] = result.data[key];
    }
    entries.push({
      concept: descriptor.id,
      id,
      slug,
      permalink,
      title: asString(raw.title) ?? id,
      date,
      updated: asDate(raw.updated),
      tags: taxonomyField ? asTags(result.data[taxonomyField]) : [],
      excerpt: deriveExcerpt(body, { description: asString(raw.description) }),
      wordCount: wordCount(body),
      draft,
      fields: summaryFieldValues,
      frontmatter: result.data as F,
      body,
    });
  }

  // Dated concepts sort newest-first; undated concepts (Pages) sort by title.
  const sorted = [...entries].sort((a, b) =>
    descriptor.routing.dated ? (b.date ?? '').localeCompare(a.date ?? '') : a.title.localeCompare(b.title),
  );

  const summarize = (entry: ContentEntry<F>): ContentSummary => {
    const { frontmatter: _frontmatter, body: _body, ...summary } = entry;
    return summary;
  };
  const visible = (list: ContentEntry<F>[], includeDrafts?: boolean): ContentEntry<F>[] =>
    includeDrafts ? list : list.filter((entry) => !entry.draft);

  return {
    all: (opts = {}) => visible(sorted, opts.includeDrafts).map(summarize),
    byId: (id) => entries.find((entry) => entry.id === id),
    byTag: (tag, opts = {}) =>
      visible(sorted, opts.includeDrafts)
        .filter((entry) => entry.tags.includes(tag))
        .map(summarize),
    allTags: () => {
      const counts = new Map<string, number>();
      for (const entry of sorted) {
        if (entry.draft) continue;
        for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
      return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => a.tag.localeCompare(b.tag));
    },
    adjacent: (id) => {
      const list = visible(sorted, false);
      const i = list.findIndex((entry) => entry.id === id);
      if (i < 0) return {};
      return {
        newer: i > 0 ? summarize(list[i - 1]) : undefined,
        older: i < list.length - 1 ? summarize(list[i + 1]) : undefined,
      };
    },
    problems: () => problems,
  };
}
