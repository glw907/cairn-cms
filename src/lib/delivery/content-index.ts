// cairn-cms: the per-concept content index (public-delivery design, decisions 1 and 5). It
// takes raw files from a site's glob, parses them with the engine's own parseMarkdown, and
// returns cheap plain-data summaries plus an on-demand detail lookup. It is concept-generic:
// every operation reads the descriptor and its routing rule, never a hardcoded concept id.
import { parseMarkdown } from '../content/frontmatter.js';
import { idFromFilename, slugFromId } from '../content/ids.js';
import { permalink } from '../content/permalink.js';
import { deriveExcerpt, wordCount } from './excerpt.js';
import type { ConceptDescriptor } from '../content/types.js';

/** A raw content file before parsing: the glob key and the file's full markdown text. */
export interface RawFile {
  path: string;
  raw: string;
}

/** The cheap, plain-data view of one entry, for lists, feeds, and the sitemap. */
export interface ContentSummary {
  id: string;
  slug: string;
  permalink: string;
  title: string;
  date?: string;
  updated?: string;
  tags: string[];
  excerpt: string;
  wordCount: number;
  draft: boolean;
}

/** The detail view: a summary plus the frontmatter and the body to render. */
export interface ContentEntry extends ContentSummary {
  frontmatter: Record<string, unknown>;
  body: string;
}

/** The per-concept query surface. */
export interface ContentIndex {
  all(opts?: { includeDrafts?: boolean }): ContentSummary[];
  byId(id: string): ContentEntry | undefined;
  byTag(tag: string, opts?: { includeDrafts?: boolean }): ContentSummary[];
  allTags(): { tag: string; count: number }[];
  adjacent(id: string): { newer?: ContentSummary; older?: ContentSummary };
}

/** Map a Vite eager `?raw` glob record (`{ path: raw }`) to `RawFile[]`. */
export function fromGlob(record: Record<string, string>): RawFile[] {
  return Object.entries(record).map(([path, raw]) => ({ path, raw }));
}

function basename(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(slash + 1) : path;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function asDate(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return undefined;
}

function asTags(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/** Build a concept's index from its raw files and normalized descriptor. */
export function createContentIndex(files: RawFile[], descriptor: ConceptDescriptor): ContentIndex {
  const entries: ContentEntry[] = files.map((file) => {
    const id = idFromFilename(basename(file.path));
    const slug = slugFromId(id, descriptor.routing.dated ? descriptor.datePrefix : null);
    const { frontmatter, body } = parseMarkdown(file.raw);
    const date = asDate(frontmatter.date);
    return {
      id,
      slug,
      permalink: permalink(descriptor, { id, slug, date }),
      title: asString(frontmatter.title) ?? id,
      date,
      updated: asDate(frontmatter.updated),
      tags: asTags(frontmatter.tags),
      excerpt: deriveExcerpt(body, { description: asString(frontmatter.description) }),
      wordCount: wordCount(body),
      draft: frontmatter.draft === true,
      frontmatter,
      body,
    };
  });

  // Dated concepts sort newest-first; undated concepts (Pages) sort by title.
  const sorted = [...entries].sort((a, b) =>
    descriptor.routing.dated ? (b.date ?? '').localeCompare(a.date ?? '') : a.title.localeCompare(b.title),
  );

  const summarize = (entry: ContentEntry): ContentSummary => {
    const { frontmatter: _frontmatter, body: _body, ...summary } = entry;
    return summary;
  };
  const visible = (list: ContentEntry[], includeDrafts?: boolean): ContentEntry[] =>
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
  };
}
