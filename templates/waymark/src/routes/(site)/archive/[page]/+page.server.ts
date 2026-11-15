import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';
import { posts, site } from '#chassis/content.js';
import { paginateArchive } from '#chassis/archive.js';

export const prerender = true;

// With a published page whose id is `home`, that page is "/" and lists only the newest posts, so
// the archive starts at the newest post on page one. Without one, "/" is archive page one with
// its lead, and this route serves page two on.
const hasHomePage = () =>
  site
    .concept('pages')
    ?.all()
    .some((page) => page.id === 'home') ?? false;

// The full archive, minus the page-one lead when "/" carries one (the same slice the home route
// paginates page one from), so this route's page count always agrees with the home page's. posts.all() is already
// newest-first (a dated concept's engine ordering contract, documented in
// the concept reader's doc comment), so no re-sort is needed here.
function archiveEntries() {
  return hasHomePage() ? posts.all() : posts.all().slice(1);
}

// The generator starts at the first page this route serves and stops at the last real page. A
// home page with no posts yields no page, since an empty /archive/1 would list nothing.
export const entries: EntryGenerator = () => {
  const first = hasHomePage() ? 1 : 2;
  const all = archiveEntries();
  if (all.length === 0 && first === 1) return [];
  const { totalPages } = paginateArchive(all, first);
  const pages: { page: string }[] = [];
  for (let page = first; page <= totalPages; page++) pages.push({ page: String(page) });
  return pages;
};

export const load: PageServerLoad = ({ params }) => {
  const home = hasHomePage();
  const requested = Number(params.page);
  if (!Number.isInteger(requested) || requested < (home ? 1 : 2)) error(404, 'Not found');
  const all = archiveEntries();
  if (home && all.length === 0) error(404, 'Not found');
  const archive = paginateArchive(all, requested);
  // paginateArchive clamps an out-of-range page into range rather than returning nothing; a
  // request past the last real page must 404 instead of silently re-serving the last one.
  if (archive.page !== requested) error(404, 'Not found');
  return home ? { archive, home: true } : { archive };
};
