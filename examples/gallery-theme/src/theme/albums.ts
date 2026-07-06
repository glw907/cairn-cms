// This theme's tree derivation over the one shared `pages` fieldset (cairn.config.ts). Nothing in
// the schema marks a page as "an album" or "a leaf": the theme infers a page's shape from which
// optional fields are populated (`photos.length > 0` is a leaf; another page's `parent` pointing
// at this id makes it an interior node; neither makes it a plain prose page), the sharpest piece
// of this port's capability-test evidence (see this theme's README). Only 8 pages exist, so every
// helper here reads the full typed detail for each rather than threading `summaryFields` through;
// that keeps every read fully typed off the inferred fieldset, with no cast.
import { pages } from '$chassis/content.js';

type PageEntry = NonNullable<ReturnType<typeof pages.byId>>;

/** Every page's full detail, typed off the concept's own inferred fieldset. */
export function allPages(): PageEntry[] {
  return pages
    .all()
    .map((summary) => pages.byId(summary.id))
    .filter((entry): entry is PageEntry => entry !== undefined);
}

/** One resolved photo row: the image leaf's `src`/`alt`, plus the sibling dimension/color/credit
 *  leaves the justified grid needs before any image has loaded (see cairn.config.ts's own note on
 *  why these sit beside the image field rather than inside it). */
export interface Photo {
  src: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
  color?: string;
  credit?: string;
}

/** A leaf album's photo list, or the empty list for an interior node or a prose page. */
export function photosOf(entry: PageEntry): Photo[] {
  const rows = entry.frontmatter.photos ?? [];
  return rows.map((row) => ({
    src: row.photo.src,
    alt: row.photo.alt,
    caption: row.photo.caption,
    width: row.width,
    height: row.height,
    color: row.color,
    credit: row.credit,
  }));
}

/** The other pages whose `parent` points at this one: an interior node's children. Empty for a
 *  leaf or a prose page. */
export function childrenOf(entry: PageEntry, all: PageEntry[] = allPages()): PageEntry[] {
  return all.filter((candidate) => candidate.frontmatter.parent === entry.id);
}

/** True when a page carries its own photos: a leaf album, shown as a photo-grid template. */
export function isLeafAlbum(entry: PageEntry): boolean {
  return photosOf(entry).length > 0;
}

/** True when a page has no photos of its own but other pages point at it as their `parent`: an
 *  interior node, shown as a gallery-listing template (a card grid over its children). */
export function isInteriorAlbum(entry: PageEntry, all: PageEntry[] = allPages()): boolean {
  return !isLeafAlbum(entry) && childrenOf(entry, all).length > 0;
}

/** Every descendant leaf's photo, walked recursively; an interior node's total photo count and
 *  the first one, used as its card cover. */
export function descendantPhotos(entry: PageEntry, all: PageEntry[] = allPages()): Photo[] {
  if (isLeafAlbum(entry)) return photosOf(entry);
  return childrenOf(entry, all).flatMap((child) => descendantPhotos(child, all));
}

/** The plain-data shape a gallery card (a leaf album or an interior node) renders, whichever
 *  album shape it is. */
export interface AlbumCard {
  id: string;
  title: string;
  href: string;
  cover?: Photo;
  photoCount: number;
  /** Set only for an interior node: how many child albums it has. */
  albumCount?: number;
}

export function toAlbumCard(entry: PageEntry, all: PageEntry[] = allPages()): AlbumCard {
  const leaf = isLeafAlbum(entry);
  const photos = leaf ? photosOf(entry) : descendantPhotos(entry, all);
  const children = leaf ? [] : childrenOf(entry, all);
  return {
    id: entry.id,
    title: entry.title,
    href: entry.permalink,
    cover: photos[0],
    photoCount: photos.length,
    albumCount: leaf ? undefined : children.length,
  };
}

/** The top-level pages (no `parent`) that are an album (a leaf or an interior node), excluding
 *  the one flagged `featured` (the home page's own hero card, shown separately) and excluding a
 *  plain prose page (About, Imprint) which is neither. */
export function homeGridAlbums(all: PageEntry[] = allPages()): AlbumCard[] {
  return all
    .filter((entry) => entry.frontmatter.parent === undefined)
    .filter((entry) => entry.frontmatter.featured !== true)
    .filter((entry) => isLeafAlbum(entry) || isInteriorAlbum(entry, all))
    .map((entry) => toAlbumCard(entry, all));
}

/** The one page flagged `featured`, shown as the home's large hero card. */
export function featuredAlbum(all: PageEntry[] = allPages()): AlbumCard | undefined {
  const entry = all.find((candidate) => candidate.frontmatter.featured === true);
  return entry ? toAlbumCard(entry, all) : undefined;
}

/** A leaf or interior album's own back link: its parent's permalink and title, or the home page
 *  when it has none (a top-level album like Nature, Fashion & Beauty, or Animals). This is this
 *  port's own addition: the upstream's header arrow always returns to home regardless of depth
 *  (see SiteHeader.svelte), so a level-by-level link here is the only way back one step, a real
 *  navigation improvement for a tree deeper than the upstream's own two levels. */
export interface BackLink {
  href: string;
  label: string;
}

export function backLink(entry: PageEntry, all: PageEntry[] = allPages()): BackLink {
  const parentId = entry.frontmatter.parent;
  if (!parentId) return { href: '/', label: 'Home' };
  const parent = all.find((candidate) => candidate.id === parentId);
  return parent ? { href: parent.permalink, label: parent.title } : { href: '/', label: 'Home' };
}
