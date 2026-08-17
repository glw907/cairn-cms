// cairn-cms: the deliberately minimal fixture set the live-reproduction seam's stories mount
// against. One sample concept, a handful of entries, a small media library, a tag vocabulary, one
// signed-in editor, and the nav/worked-navlayout example, typed against the engine's own load-time
// shapes (ListData's EntrySummary, HistoryData, MediaLibraryData, VocabularyLoadData,
// ResolvedNavLayout) so a story's props are exactly what a real admin route would hand the same
// component. Node-safe like ./manifest.ts: no `.svelte` import, no @sveltejs/kit, no DOM outside the
// `atob`/`File` globals both Node and a browser carry. Every module this file value-imports
// (./fixtures.js excepted) is plain data or a pure function with the same guarantee; every heavier
// shape (ConceptDescriptor, EntrySummary, HistoryData, MediaLibraryData, VocabularyLoadData,
// ResolvedNavLayout) is a type-only import, so a file that pulls in @sveltejs/kit or the GitHub
// client to declare its interface never drags that weight in here.
//
// docs/internal/record/repro-story-audit.md is the per-story mechanism record these fixtures serve;
// its "Note for A2" paragraphs on `media/upload-form` and `media/delete-in-use` are load-bearing
// here. src/tests/unit/reproductions-fixtures.test.ts holds this module to its own consistency.
import { fieldset } from '../content/fieldset.js';
import type { ConceptDescriptor } from '../content/types.js';
import type { Editor } from '../auth/types.js';
import type { EntrySummary } from '../sveltekit/content-routes-core.js';
import type { HistoryData } from '../sveltekit/types.js';
import type { MediaLibraryData, MediaUsageInfo } from '../sveltekit/content-routes-media.js';
import type { MediaLibraryEntry } from '../media/library-entry.js';
import type { VocabularyLoadData } from '../sveltekit/content-routes-settings.js';
import type { ResolvedNavLayout } from '../sveltekit/admin-nav.js';

/** The one sample concept every fixture entry belongs to: a dated, routable "posts" concept. */
export const fixtureConcept: ConceptDescriptor = {
  id: 'posts',
  label: 'Posts',
  singular: 'Post',
  dir: 'src/content/posts',
  routing: { routable: true, dated: true, inFeeds: true },
  permalink: '/posts/:slug',
  datePrefix: 'day',
  fields: [],
  schema: fieldset({}),
  summaryFields: [],
  validate: () => ({ ok: true, data: {} }),
};

/**
 * The signed-in identity every story mounts as: `roster/own-row` matches its `data.self` to this
 *  email, and the history entries below credit it as the editor of the most recent publish and the
 *  open draft.
 */
export const fixtureEditor: Editor = {
  email: 'jamie@example.com',
  displayName: 'Jamie Torres',
  role: 'editor',
  capability: 'editor',
};

/**
 * One fixture entry: a real admin route's `EntrySummary` row, plus the concept it belongs to and,
 *  for the one entry `publish/history-list` renders, its own publish history.
 */
export interface FixtureEntry extends EntrySummary {
  /** The concept id this entry belongs to. Every entry in this fixture set carries `fixtureConcept.id`. */
  concept: string;
  /** This entry's own `CairnHistory` data, present only on the entry `publish/history-list` mounts. */
  history?: HistoryData;
}

/**
 * A handful of entries, one sample concept: a published pair, the entry `media/delete-in-use`
 * marks as in-use by an image, and the entry `publish/history-list` renders (an open draft on top
 * of two past publishes).
 */
export const fixtureEntries: FixtureEntry[] = [
  {
    concept: fixtureConcept.id,
    id: '2026-06-02-trailhead-guide',
    title: 'A Guide to the North Ridge Trailhead',
    date: '2026-06-02',
    draft: false,
    status: 'published',
    summary: 'Where to park, what to bring, and the first mile.',
  },
  {
    concept: fixtureConcept.id,
    id: '2026-06-10-welcome-to-the-club',
    title: 'Welcome to the Club',
    date: '2026-06-10',
    draft: false,
    status: 'published',
    summary: 'What to expect at your first meetup.',
  },
  {
    concept: fixtureConcept.id,
    id: '2026-06-18-team-retreat-recap',
    title: 'Team Retreat Recap',
    date: '2026-06-18',
    draft: false,
    status: 'published',
    summary: 'Photos and notes from the spring retreat.',
  },
  {
    concept: fixtureConcept.id,
    id: '2026-06-24-spring-newsletter',
    title: 'Spring Newsletter',
    date: '2026-06-24',
    draft: false,
    status: 'edited',
    summary: "This month's trail conditions and volunteer calls.",
    history: {
      entries: [
        { ref: '5ad9324471b6068be6320f6cad9528d7b314019d', editor: 'Robin Lake', date: '2026-05-20T14:32:00Z' },
        { ref: '2ee5c349b5c9ba9b911bceb9b2eb46effc2485df', editor: 'Jamie Torres', date: '2026-04-02T09:15:00Z' },
      ],
      draft: { editor: 'Jamie Torres', startedAt: '2026-06-24T16:45:00Z' },
      truncated: false,
      head: '5ad9324471b6068be6320f6cad9528d7b314019d',
    },
  },
];

/**
 * The one entry `media/delete-in-use` marks the image below as in use by, named once here so the
 * fixture stays internally consistent by construction rather than by two hand-typed ids agreeing.
 */
const IN_USE_ENTRY = fixtureEntries[2]!;

/**
 * A small media library: five real, small PNGs (bytes under `./fixtures/`, named
 * `<slug>.<hash>.<ext>`, the same shape `publicPath`'s `'slug'` form composes), one of them
 * (`team-photo`) marked in use by {@link IN_USE_ENTRY} for `media/delete-in-use`.
 */
const trailheadView: MediaLibraryEntry = {
  hash: '4dcfd814c4ebd018',
  slug: 'trailhead-view',
  ext: 'png',
  contentType: 'image/png',
  displayName: 'Trailhead View',
  alt: 'A gravel trailhead parking area at the edge of a pine forest, morning light through the trees.',
  width: 320,
  height: 200,
  bytes: 1607,
  createdAt: '2026-05-28T09:12:00Z',
};

const cabinPorch: MediaLibraryEntry = {
  hash: '53bf374ac4d3c1fc',
  slug: 'cabin-porch',
  ext: 'png',
  contentType: 'image/png',
  displayName: 'Cabin Porch',
  alt: 'A weathered wooden porch overlooking a green valley.',
  width: 320,
  height: 200,
  bytes: 3082,
  createdAt: '2026-05-30T11:40:00Z',
};

const teamPhoto: MediaLibraryEntry = {
  hash: '25bb1ae176664419',
  slug: 'team-photo',
  ext: 'png',
  contentType: 'image/png',
  displayName: 'Team Photo',
  alt: "The club's spring retreat group photo on a hillside overlook.",
  width: 320,
  height: 200,
  bytes: 1717,
  createdAt: '2026-06-17T08:05:00Z',
};

const lakeSunrise: MediaLibraryEntry = {
  hash: 'f0225d64bbac1d37',
  slug: 'lake-sunrise',
  ext: 'png',
  contentType: 'image/png',
  displayName: 'Lake Sunrise',
  alt: 'Sunrise over a still alpine lake, warm orange sky reflected on the water.',
  width: 320,
  height: 200,
  bytes: 5286,
  createdAt: '2026-06-05T07:20:00Z',
};

const trailMap: MediaLibraryEntry = {
  hash: '59be2d4d416f67cf',
  slug: 'trail-map',
  ext: 'png',
  contentType: 'image/png',
  displayName: 'Trail Map',
  alt: "A hand-drawn map of the club's three most-used trailheads.",
  width: 240,
  height: 150,
  bytes: 936,
  createdAt: '2026-06-01T15:50:00Z',
};

/**
 * {@link teamPhoto}'s where-used overlay: the one row `media/delete-in-use`'s what-would-break
 *  list renders.
 */
const teamPhotoUsage: MediaUsageInfo = {
  count: 1,
  entries: [
    {
      concept: IN_USE_ENTRY.concept,
      id: IN_USE_ENTRY.id,
      title: IN_USE_ENTRY.title,
      permalink: `/posts/${IN_USE_ENTRY.id}`,
      origin: { kind: 'published' },
    },
  ],
};

/** The Media Library screen's fixture data: `CairnMediaLibrary`'s whole `data` prop. */
export const fixtureMediaLibrary: MediaLibraryData = {
  assets: [trailheadView, cabinPorch, teamPhoto, lakeSunrise, trailMap],
  usage: { [teamPhoto.hash]: teamPhotoUsage },
  error: null,
  flash: null,
};

/**
 * A tag vocabulary carrying one unused tag (the trash icon reads active), one in-use tag (the
 *  guarded delete), and one in-use-but-unlisted tag (the not-on-this-list section).
 */
export const fixtureVocabulary: VocabularyLoadData = {
  vocabulary: [
    { value: 'trail-guide', label: 'Trail Guide' },
    { value: 'gear', label: 'Gear' },
    { value: 'community-news', label: 'Community News' },
  ],
  usage: { 'trail-guide': 2, gear: 0, 'community-news': 1 },
  unlisted: [{ value: 'volunteer-spotlight', count: 3 }],
};

/**
 * The `navLayout` seam's own worked example, `docs/extend/organize-your-admin-nav.md`, resolved to
 * the shape `CairnAdminShell` renders: two engine references, a "Club" section of two site entries,
 * two more engine references (one relabeled), then an unreferenced trailing group after the divider
 * (`vocabulary`, `editors`, `help`, none of which the worked example's tree names).
 */
export const fixtureNavLayout: ResolvedNavLayout = {
  items: [
    { screen: 'posts', label: 'Posts', href: '/admin/posts', dated: true },
    { screen: 'pages', label: 'Pages', href: '/admin/pages', dated: false },
    {
      label: 'Club',
      children: [
        { label: 'Events', iconName: 'calendar', href: '/admin/club/events', ownerOnly: false },
        { label: 'Members', iconName: 'users', href: '/admin/club/members', ownerOnly: false },
      ],
    },
    { screen: 'media', label: 'Library', href: '/admin/media' },
    { screen: 'settings', label: 'Site settings', href: '/admin/settings' },
  ],
  fallback: [
    { screen: 'vocabulary', label: 'Tags', href: '/admin/vocabulary' },
    { screen: 'editors', label: 'Editors', href: '/admin/editors' },
    { screen: 'help', label: 'Help', href: '/admin/help' },
  ],
};

/**
 * A tiny, real 160x110 PNG, base64-inline so {@link fixtureCaptureFile} can construct a `File`
 *  synchronously wherever this module loads, browser or Node, with no fetch and no filesystem read.
 */
const CAPTURE_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAKAAAABuCAMAAACX8+jbAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAA2UExURXFcMXlk' +
  'On9qQIZwSIl0S4p1TI14UJB6UpJ8VJiDXJ6IYaqUb7ehfbymgsq0kdfAn9vEo+PMrGyU2+EAAAAHdElNRQfqCBEWDCO1pwjDAAACWUlEQVR42u2QC5arIBBE' +
  'W5xkVNTo/jf7EEEBQUBMIG/6nhP6VzRlABAE+Q+piupXDBGqSmmV0q8KBw2iwdx8hUFC2K/iyQKP1eEk252P6oGQuiaCmsMjE/B0z2siLn1WD+sXreN9haAi' +
  '5Jib+u2vsYlJ6n5Ycn5JxB1SE3LMbXpyuLOrU/dDXThoEA3m5isM/izUPFmLdbQktr6ur5Wmutilj90PP4Vzp8GHp760EB4KT8ZyPgzO+k+l4MGoU/fDs3DK' +
  'N/hbONJg45h7+k3TGJLGfuXyfmju4NcTE7jH4Bv5HoOtFg65e956ouNeG9iHlsM6VmTfN48lfB9ce+BzoMFbDHYM2VBSXoXMj329lrkSO4euM/XQCdaxG9fc' +
  '7FvqNnKfNoGucNAgGswNGkw2SGlHZcFSKk9Z++dbZei2iopARYjSA6XyERGNOnDeUVu/U+5d1AMtHDSIBnODBtFgbpIN9nrVW/u9ox+gh54XfZ8S5Tolv60P' +
  '/dvZP+OK/gMG00CDaDA332FwYKzlGuPqYUPmcmb2XfmZHoZBHfRDSm1/IgS3HmLW5OBvGhxv1MPIEcKN8Ho5RT44+lo80Q82PahPjqNuIaRWT1ffNBijB+3y' +
  'aP/qs/n+sGpimw22Gyf6wwswFg4aRIO5QYNoMDdoEA3mBg0mG3wxZGHLfXNRjWpl1iE7XDk3KEszt/WMuei8nNG3w5cLg+pa21P2fF92xvkOXw6vwnm/welW' +
  'g9N0IZ+EC2tcFfJO/H6YCgcN/gWDs0hntT/H9edZX2vW1/fDXDhoEA3mBg2m8g9mFpibGFCYTAAAAABJRU5ErkJggg==';

/**
 * Decode a base64 string to raw bytes: `File`'s own bytes-inline constructor, browser and Node
 * alike via the global `atob`. Returns `Uint8Array<ArrayBuffer>` explicitly (not the bare
 * `Uint8Array<ArrayBufferLike>` a plain `new Uint8Array(n)` widens to), the same narrowing
 * `naming.ts`'s `asArrayBuffer` applies, since `BlobPart` refuses the wider generic.
 */
function bytesFromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * A freshly captured photo, not yet uploaded: `media/upload-form`'s `MediaCaptureCard` prop. The
 * filename's stem, `lighthouse-cove`, is a real name rather than a camera stem, so
 * `proposedNameFor` renders the Suggested tag (`MediaCaptureCard.svelte:52`).
 */
export const fixtureCaptureFile: File = new File([bytesFromBase64(CAPTURE_IMAGE_BASE64)], 'lighthouse-cove.png', {
  type: 'image/png',
});
