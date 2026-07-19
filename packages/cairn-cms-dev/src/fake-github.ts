// A dev-only GitHub double for the showcase. It is a conforming `Backend` over an in-memory repo,
// so the engine's reads and commits land in that repo instead of the real GitHub API, and it
// records the last commit so the E2E can assert the author, the committer, and the branch the
// commit landed on. Constructed once from hooks.server.ts (via devBackendHandle); never part of
// the published engine.
//
// The repo is branch-aware for the publish workflow: each branch holds a flat path-to-content
// map, creating a branch snapshots its source branch's tree (like a real git ref), and a commit
// lands on whichever branch it names.
//
// The store, the lastCommit recorder, and the committedFile/seed accessors are module-level
// process singletons. createDevBackend returns a thin facade over that one shared store, so a
// commit on one request is visible to the recorder route on the next.
import type { Backend, FileChange, RepoFile, CommitAuthor } from '@glw907/cairn-cms';
import { CommitConflictError } from '@glw907/cairn-cms';

/** The shape the E2E reads from /test/last-commit. */
export interface RecordedCommit {
  path: string;
  /** The branch the commit landed on: a `cairn/<concept>/<id>` pending branch, or `main`. */
  branch: string;
  author: { name: string; email: string };
  /** Absent from the cairn commit body; GitHub attributes the committer to cairn-cms[bot]. */
  committer: unknown;
  content: string;
}

let lastCommit: RecordedCommit | null = null;

/** One branch's working tree: repo path to file content. */
type Tree = Map<string, string>;

// The seeded post path must match the adapter's posts dir plus a valid id filename.
// cairn.config.ts sets dir: 'src/content/posts'; idFromFilename strips the .md suffix.
const SEED_POST = 'src/content/posts/2026-06-hello.md';

let seq = 0;
function nextSha(): string {
  return `sha-${++seq}`;
}

const branches = new Map<string, Tree>([
  [
    'main',
    new Map([[SEED_POST, '---\ntitle: Hello\ndate: 2026-06-01\n---\nThe original body.\n']]),
  ],
]);
const heads = new Map<string, string>([['main', nextSha()]]);

/** Read back the last commit the fake recorded, or null before any commit lands. */
export function lastRecordedCommit(): RecordedCommit | null {
  return lastCommit;
}

/**
 * Read one file's content off a branch's in-memory tree, or null when absent. The media slice's
 * E2E reads the committed `media.json` this way: the last-commit recorder captures only the `.md`
 * entry, so the manifest committed in the same atomic commit needs its own read.
 */
export function committedFile(branch: string, path: string): string | null {
  return branches.get(branch)?.get(path) ?? null;
}

// --- the Media Library seed ---
//
// The Media Library E2E (media-library.spec.ts) drives the real /admin/media screen, which reads
// `media.json` and the content manifest `index.json` from main and unions in every open cairn/*
// branch. The bare seed tree above carries only the post markdown, so the Library would show zero
// assets. seedMediaLibrary writes a realistic set into the in-memory repo: three assets on main
// (a used+described, an orphan+described, and a needs-alt one), a content manifest whose seed-post
// entry references the used asset (so its where-used reads "published"), and one open branch
// carrying a fourth, not-yet-published asset its edited entry references (so the union shows it and
// its where-used names the branch). The R2 bytes for these hashes are seeded separately in
// hooks.server.ts so the thumbnails resolve and the orphan delete removes real bytes.
//
// The seed is consistent with the existing specs: the content manifest lists the seed post
// (2026-06-hello) so listLoad keeps showing it, and the branch is a distinct id that never collides
// with the post the other specs edit.

/** The seed post the other specs edit, listed in the seeded content manifest so listLoad keeps it. */
const SEED_POST_ID = '2026-06-hello';

/**
 * The branch-only asset's open edit branch and the entry that references it. A distinct id so it
 * never collides with the seed post or the per-run posts the other specs create.
 */
const SEED_BRANCH = 'cairn/posts/2026-05-draft-gallery';
const SEED_BRANCH_ENTRY = 'src/content/posts/2026-05-draft-gallery.md';

/**
 * The editor copy-edit seed entry (Task 16), backing spellcheck.spec.ts and tidy.spec.ts. Its body
 * carries two real en-US misspellings the dictionary flags ("recieve", "teh") so the spellcheck
 * underline is deterministic, and the canned tidy response (fake-anthropic.ts) corrects exactly those
 * two words so the review diff is two clean single-word hunks. A distinct id from every other spec's
 * entry, so editing it never perturbs the media fixtures.
 */
export const SEED_EDITOR = {
  id: '2026-06-copyedit',
  path: 'src/content/posts/2026-06-copyedit.md',
  title: 'Copy-edit demo',
  body: 'Please recieve this draft. It has teh same idea.',
  /** The deterministic corrected body the stubbed model returns: "recieve" to "receive", "teh" to "the". */
  corrected: 'Please receive this draft. It has the same idea.',
} as const;

/** The four seeded asset hashes, slugs, and alts, named so the spec can assert each role. */
export const SEED_MEDIA = {
  used: { hash: 'aa00bb11cc22dd33', slug: 'mountain-pass', alt: 'A mountain pass at sunrise' },
  orphan: { hash: '1111222233334444', slug: 'sunset-orphan', alt: 'A sunset over still water' },
  needsAlt: { hash: '5555666677778888', slug: 'untagged-shot', alt: '' },
  branchOnly: { hash: '9999aaaabbbbcccc', slug: 'draft-banner', alt: 'A draft banner image' },
} as const;

// --- the Pass B replace + alt-propagation fixture ---
//
// A dedicated asset isolated from the four above, backing both Pass B round-trips (media-pass-b.spec.ts)
// with no interference: the alt round-trip changes only the alt text on its placements, and the replace
// round-trip changes only the content hash. It is one asset referenced by TWO main entries whose
// MARKDOWN carries the real `media:` token (the repoint and alt transforms read the entry markdown, not
// the manifest), so the bulk rewrite has real source to act on:
//
//   - 2026-06-first-empty references it with an EMPTY alt (the alt round-trip's will-fill bucket).
//   - 2026-06-first-custom references it with a CUSTOM alt (the alt round-trip's customized bucket; the
//     replace round-trip repoints both).
//
// Both entries are added to main's content manifest with mediaRefs pointing at the asset, so the usage
// index (which the planner builds from mediaRefs) selects them, then reads their markdown to rewrite it.

/**
 * The Pass B asset's hash, slug, and stored default alt, exported so the spec asserts the alt the
 * push propagates and the hash the replace repoints away from. A distinct 16-hex hash from the four.
 */
export const PASS_B_MEDIA = {
  hash: 'cccc4444dddd5555',
  slug: 'first-light',
  alt: 'Dawn light over the tracks',
} as const;

/**
 * The two main entries that reference the Pass B asset, exported so the spec reads their committed
 * markdown back through the /test/branch-file fixture after each round-trip. `emptyAlt` carries an
 * empty alt (the will-fill bucket); `customAlt` carries a custom alt (the customized bucket).
 */
export const PASS_B_ENTRIES = {
  emptyAlt: {
    id: '2026-06-first-empty',
    title: 'Light on the early track',
    path: 'src/content/posts/2026-06-first-empty.md',
    permalink: '/posts/first-empty',
    customAltText: '',
  },
  customAlt: {
    id: '2026-06-first-custom',
    title: 'A later pass',
    path: 'src/content/posts/2026-06-first-custom.md',
    permalink: '/posts/first-custom',
    customAltText: "A skier's own words",
  },
} as const;

// --- the Pass C bulk-delete + orphan fixture ---
//
// Three dedicated populations backing the Pass C round-trips (media-pass-c.spec.ts), each isolated
// from every fixture above so they never perturb the name-based assertions of the other specs:
//
//   - PASS_C_UNREF: a committed MAIN media.json row referenced by NOTHING (no mediaRefs anywhere),
//     with its bytes seeded in R2. usageCount 0, so it is deletable: the bulk-delete DELETE target.
//     (The bulk-delete SKIP target reuses the in-use SEED_MEDIA.used asset read-only, so no new row.)
//   - PASS_C_ORPHAN_BYTE: R2 bytes seeded, but NO media.json row anywhere and no reference. A true
//     orphaned byte (the purge target), so it appears in the scan's orphanedBytes.
//   - PASS_C_MISSING: a committed MAIN media.json row whose bytes are NOT seeded and which nothing
//     references. The reconcile reports it as a missing object, so it reads out under Broken references.

/** The unreferenced, byte-seeded asset on main: the bulk-delete DELETE target. */
export const PASS_C_UNREF = {
  hash: 'dddd6666eeee7777',
  slug: 'pass-c-unused',
  name: 'Pass C unused',
  alt: 'A spare frame nothing points at',
} as const;

/**
 * The orphaned byte: bytes in R2 under its key, but no media.json row and no reference. The purge
 * target. Exported as a hash so the spec can build the key and assert the scan lists it.
 */
export const PASS_C_ORPHAN_BYTE = {
  hash: 'eeee7777ffff8888',
} as const;

/**
 * The broken-reference row: a media.json row on main whose R2 bytes are absent and which nothing
 * references. The read-only Broken references readout target, keyed by its slug.
 */
export const PASS_C_MISSING = {
  hash: 'ffff8888aaaa9999',
  slug: 'pass-c-broken',
  alt: 'A record whose file is gone',
} as const;

/**
 * The R2 object keys (media/&lt;aa&gt;/&lt;hash&gt;.&lt;ext&gt;) every seeded asset resolves through, so
 * hooks.server.ts seeds the matching bytes. Kept here so the key derivation lives next to the manifest
 * seed. Includes the Pass B asset so its thumbnail resolves in the replace dialog, the unreferenced
 * Pass C asset so its tile thumbnail resolves, and the Pass C orphaned byte (whose key has NO media.json
 * row, so the scan finds it). PASS_C_MISSING is deliberately ABSENT: its row exists but its bytes do
 * not, which is what makes it a broken reference.
 */
export const SEED_MEDIA_KEYS = [
  ...[...Object.values(SEED_MEDIA), PASS_B_MEDIA, PASS_C_UNREF, PASS_C_ORPHAN_BYTE].map(
    (m) => `media/${m.hash.slice(0, 2)}/${m.hash}.png`,
  ),
];

function mediaRow(slug: string, hash: string, alt: string): Record<string, unknown> {
  return {
    hash,
    sha256: `${hash}${'0'.repeat(64 - hash.length)}`,
    slug,
    displayName: slug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
    originalFilename: `${slug}.png`,
    alt,
    ext: 'png',
    contentType: 'image/png',
    bytes: 20480,
    width: 1200,
    height: 800,
    createdAt: '2026-05-01T00:00:00.000Z',
  };
}

let mediaSeeded = false;

/**
 * Seed the Media Library fixtures into the in-memory repo. Idempotent: a reused dev server (the
 * Playwright reuseExistingServer path) calls this once per process.
 */
export function seedMediaLibrary(): void {
  if (mediaSeeded) return;
  mediaSeeded = true;

  const main = branches.get('main');
  if (!main) return;

  // The main-side asset rows, keyed by hash (the MediaManifest shape). The three Library assets plus
  // the dedicated Pass B asset (first-light), which two main entries reference in their markdown.
  const mainMedia: Record<string, unknown> = {
    [SEED_MEDIA.used.hash]: mediaRow(SEED_MEDIA.used.slug, SEED_MEDIA.used.hash, SEED_MEDIA.used.alt),
    [SEED_MEDIA.orphan.hash]: mediaRow(SEED_MEDIA.orphan.slug, SEED_MEDIA.orphan.hash, SEED_MEDIA.orphan.alt),
    [SEED_MEDIA.needsAlt.hash]: mediaRow(SEED_MEDIA.needsAlt.slug, SEED_MEDIA.needsAlt.hash, SEED_MEDIA.needsAlt.alt),
    [PASS_B_MEDIA.hash]: mediaRow(PASS_B_MEDIA.slug, PASS_B_MEDIA.hash, PASS_B_MEDIA.alt),
    // Pass C: the unreferenced row (bytes seeded, no mediaRefs anywhere), the bulk-delete DELETE
    // target. Its displayName is the asset name the spec selects by, so set it explicitly rather than
    // deriving it from the slug.
    [PASS_C_UNREF.hash]: {
      ...mediaRow(PASS_C_UNREF.slug, PASS_C_UNREF.hash, PASS_C_UNREF.alt),
      displayName: PASS_C_UNREF.name,
    },
    // Pass C: the broken-reference row (NO bytes seeded), the read-only Broken references readout
    // target. reconcile reports it as a missing object because nothing in R2 carries its hash.
    [PASS_C_MISSING.hash]: mediaRow(PASS_C_MISSING.slug, PASS_C_MISSING.hash, PASS_C_MISSING.alt),
  };
  main.set('src/content/.cairn/media.json', `${JSON.stringify(mainMedia, null, 2)}\n`);

  // The two Pass B entries' markdown on main: each carries a real `media:` token the bulk transforms
  // rewrite (the planner reads the entry markdown, not the manifest). One with an empty alt (will-fill),
  // one with a custom alt (customized). The token is `media:<slug>.<hash>`, the canonical form.
  const passBToken = `media:${PASS_B_MEDIA.slug}.${PASS_B_MEDIA.hash}`;
  main.set(
    PASS_B_ENTRIES.emptyAlt.path,
    `---\ntitle: ${PASS_B_ENTRIES.emptyAlt.title}\ndate: 2026-06-05\n---\nFirst run of the season: ![](${passBToken})\n`,
  );
  main.set(
    PASS_B_ENTRIES.customAlt.path,
    `---\ntitle: ${PASS_B_ENTRIES.customAlt.title}\ndate: 2026-06-07\n---\nA quieter lap: ![${PASS_B_ENTRIES.customAlt.customAltText}](${passBToken})\n`,
  );

  // The editor copy-edit seed entry (Task 16): its body carries the two misspellings the spellcheck
  // and tidy specs act on. No media reference, so it never touches the usage index.
  main.set(SEED_EDITOR.path, `---\ntitle: ${SEED_EDITOR.title}\ndate: 2026-06-09\n---\n${SEED_EDITOR.body}\n`);

  // A seed pages entry: the reference e2e (golden-path.spec.ts) needs a pages target so the author
  // reference picker (scoped to the pages concept) has something to pick. The manifest entry below
  // lists it so editLoad's linkTargets surface it in the picker; the markdown backs its own editor.
  main.set('src/content/pages/about.md', '---\ntitle: About\n---\nThe showcase about page.\n');

  // The content manifest on main: the seed post entry, carrying a non-empty summary (the office
  // triage spec asserts it) and a mediaRefs pointing at the used asset (so its where-used reads
  // published), plus the two Pass B entries whose mediaRefs point at first-light (so the usage index
  // selects them for the bulk rewrite). The Manifest shape from src/lib/content/manifest.ts.
  const manifest = {
    version: 1,
    entries: [
      {
        id: SEED_POST_ID,
        concept: 'posts',
        title: 'Hello',
        date: '2026-06-01',
        permalink: '/posts/hello',
        summary: 'The original body.',
        draft: false,
        links: [],
        mediaRefs: [SEED_MEDIA.used.hash],
      },
      {
        id: PASS_B_ENTRIES.emptyAlt.id,
        concept: 'posts',
        title: PASS_B_ENTRIES.emptyAlt.title,
        date: '2026-06-05',
        permalink: PASS_B_ENTRIES.emptyAlt.permalink,
        summary: 'First run of the season.',
        draft: false,
        links: [],
        mediaRefs: [PASS_B_MEDIA.hash],
      },
      {
        id: PASS_B_ENTRIES.customAlt.id,
        concept: 'posts',
        title: PASS_B_ENTRIES.customAlt.title,
        date: '2026-06-07',
        permalink: PASS_B_ENTRIES.customAlt.permalink,
        summary: 'A quieter lap.',
        draft: false,
        links: [],
        mediaRefs: [PASS_B_MEDIA.hash],
      },
      {
        id: SEED_EDITOR.id,
        concept: 'posts',
        title: SEED_EDITOR.title,
        date: '2026-06-09',
        permalink: '/posts/copyedit',
        summary: SEED_EDITOR.body,
        draft: false,
        links: [],
        mediaRefs: [],
      },
      // The pages target the reference e2e's author picker selects (scoped to the pages concept).
      {
        id: 'about',
        concept: 'pages',
        title: 'About',
        permalink: '/about',
        summary: 'The showcase about page.',
        draft: false,
        links: [],
        mediaRefs: [],
      },
    ],
  };
  main.set('src/content/.cairn/index.json', `${JSON.stringify(manifest, null, 2)}\n`);
  heads.set('main', nextSha());

  // The open edit branch: a snapshot of main plus its own media.json (carrying the fourth asset) and
  // its edited entry markdown (which references that asset in its body). The usage builder reads the
  // entry markdown off the branch; the loader unions the branch media.json by hash.
  const branchTree: Tree = new Map(main);
  const branchMedia: Record<string, unknown> = {
    [SEED_MEDIA.branchOnly.hash]: mediaRow(
      SEED_MEDIA.branchOnly.slug,
      SEED_MEDIA.branchOnly.hash,
      SEED_MEDIA.branchOnly.alt,
    ),
  };
  branchTree.set('src/content/.cairn/media.json', `${JSON.stringify(branchMedia, null, 2)}\n`);
  branchTree.set(
    SEED_BRANCH_ENTRY,
    `---\ntitle: Draft gallery\ndate: 2026-05-15\n---\nA work in progress: ![${SEED_MEDIA.branchOnly.alt}](media:${SEED_MEDIA.branchOnly.slug}.${SEED_MEDIA.branchOnly.hash})\n`,
  );
  branches.set(SEED_BRANCH, branchTree);
  heads.set(SEED_BRANCH, nextSha());
}

// --- the fragments seed ---
//
// The fragments E2E (fragments.spec.ts) drives /admin/fragments and the include-picker on a real
// post's edit screen, both of which read the committed content manifest and, for the picker's
// candidate list, each fragment's body off `main` (content-routes-core.ts's fragmentTargets reads
// backend.defaultBranch only, so a pending edit never leaks into another entry's preview). The bare
// seed tree and the media seed carry no `fragments` rows, so without this the picker offers nothing
// and /admin/fragments lists empty. seedFragments writes two PUBLISHED fragments onto main: one
// mirrors the showcase's own on-disk fixture (src/content/fragments/trail-safety-notice.md) so the
// two content universes (disk corpus vs. this in-memory dev backend, entirely separate per the
// spec's own comment) agree on id and title, and one distinct fragment so the picker's list is more
// than a single row. Both ids and titles are static and never collide with the E2E's own
// dynamically-authored fragment (`picker-fragment-<timestamp>`, titled "Picker fragment").
//
// It must run AFTER seedMediaLibrary (which writes the whole content manifest), so this reads that
// manifest back and appends rows to it rather than racing the rewrite, the same discipline
// seedVocabulary follows for its own patch.

/**
 * The two seeded fragments, exported so the spec asserts against real ids and titles. `trailSafety`
 * mirrors the showcase's on-disk fixture (same id and title, distinct in-memory body) so both
 * content universes agree on identity; `gearChecklist` is a second, distinct fragment so the picker
 * offers a real list rather than a single row.
 */
export const SEED_FRAGMENTS = {
  trailSafety: {
    id: 'trail-safety-notice',
    title: 'Trail safety notice',
    body: 'Check current avalanche and trail conditions before you head out on the dev backend.',
  },
  gearChecklist: {
    id: 'winter-gear-checklist',
    title: 'Winter gear checklist',
    body: 'Pack layers, a headlamp, and a repair kit before every winter outing.',
  },
} as const;

let fragmentsSeeded = false;

/**
 * Seed the fragments fixtures into the in-memory repo. Idempotent, like the other seeds, so a
 * reused dev server (the Playwright reuseExistingServer path) seeds once per process. Writes each
 * seeded fragment's markdown body under `src/content/fragments/` on main and appends a matching
 * manifest row (concept `fragments`), so the include picker and /admin/fragments both read a
 * populated, published set.
 */
export function seedFragments(): void {
  if (fragmentsSeeded) return;
  fragmentsSeeded = true;

  const main = branches.get('main');
  if (!main) return;

  for (const fragment of Object.values(SEED_FRAGMENTS)) {
    main.set(
      `src/content/fragments/${fragment.id}.md`,
      `---\ntitle: ${fragment.title}\n---\n${fragment.body}\n`,
    );
  }

  const manifestRaw = main.get('src/content/.cairn/index.json');
  if (manifestRaw) {
    const manifest = JSON.parse(manifestRaw) as {
      version: number;
      entries: { id: string; concept: string; [key: string]: unknown }[];
    };
    for (const fragment of Object.values(SEED_FRAGMENTS)) {
      manifest.entries.push({
        id: fragment.id,
        concept: 'fragments',
        title: fragment.title,
        permalink: `/fragments/${fragment.id}`,
        summary: fragment.body,
        draft: false,
        links: [],
        mediaRefs: [],
      });
    }
    main.set('src/content/.cairn/index.json', `${JSON.stringify(manifest, null, 2)}\n`);
  }
  heads.set('main', nextSha());
}

// --- the tag-vocabulary seed ---
//
// The vocabulary-admin E2E (vocabulary-admin.spec.ts) and the pilot visual baseline drive the real
// /admin/vocabulary screen, which reads the committed `site.config.yaml` vocabulary, the content
// manifest's per-entry tags (the in-use count, through buildTagUsageIndex over main), and every open
// cairn/* branch's tagged markdown (the in-use-but-unlisted seed candidates). The bare seed tree and
// the media seed carry no `site.config.yaml` and no `tags:` on any entry, so without this the screen
// loads an empty list, finds no usage, and the first save 404s on a missing config (the route's
// `throw error(404, 'Site config not found')`). seedVocabulary writes a realistic vocabulary into the
// in-memory repo so the screen renders the populated states the spec and the baseline assert.
//
// It must run AFTER seedMediaLibrary (which writes the whole content manifest), so this reads that
// manifest back and patches `tags:` onto its entries rather than racing the rewrite.

/**
 * The site-config path the vocabulary route reads and commits. It mirrors the showcase adapter's
 * `editor.nav.configPath`, the default the route resolves through `runtime.navMenu?.configPath`.
 */
const SEED_SITE_CONFIG_PATH = 'src/theme/site.config.yaml';

/**
 * The seeded vocabulary, exported so the spec asserts against the real slugs. `trail-reports` and
 * `gear` are in use on main (their delete is guarded); `archive` is listed with zero usage (the
 * spec deletes it). `weather-notes` is deliberately absent: it rides one open branch as the in-use
 * unlisted seed candidate.
 */
export const SEED_VOCABULARY = {
  /** In use on the seed post: the guarded-delete listed tag. */
  inUse: { value: 'trail-reports', label: 'Trail Reports' },
  /** Also in use (on a Pass B entry): a second guarded-delete listed tag. */
  inUseGear: { value: 'gear', label: 'Gear' },
  /** Listed but used by nothing: the deletable listed tag. */
  unused: { value: 'archive', label: 'Archive' },
  /** In use on one open branch, NOT in the vocabulary: the seed-section candidate. */
  unlisted: { value: 'weather-notes' },
} as const;

/**
 * The open branch carrying the unlisted-but-in-use tag. A dedicated id distinct from the media seed
 * branch and every per-run spec entry, so its `topics:` never perturbs the media fixtures.
 */
const SEED_VOCAB_BRANCH = 'cairn/posts/2026-05-vocab-seed';
const SEED_VOCAB_BRANCH_ENTRY = 'src/content/posts/2026-05-vocab-seed.md';

let vocabularySeeded = false;

/**
 * Seed the tag-vocabulary fixtures into the in-memory repo. Idempotent, like seedMediaLibrary, so a
 * reused dev server (the Playwright reuseExistingServer path) seeds once per process. Writes a
 * `site.config.yaml` vocabulary on main, patches `tags:` onto two manifest entries so the usage
 * index reports in-use counts for two listed tags, and seeds one open branch whose tagged markdown
 * carries an in-use-but-unlisted tag (the seed candidate).
 */
export function seedVocabulary(): void {
  if (vocabularySeeded) return;
  vocabularySeeded = true;

  const main = branches.get('main');
  if (!main) return;

  // The committed site config carrying the vocabulary block, mirroring a real site.config.yaml. The
  // route reads this on main, validates it, and commits the edited vocabulary back to the same path.
  const v = SEED_VOCABULARY;
  main.set(
    SEED_SITE_CONFIG_PATH,
    [
      'siteName: Cairn Showcase (dev backend)',
      'vocabulary:',
      `  - value: ${v.inUse.value}`,
      `    label: ${v.inUse.label}`,
      `  - value: ${v.inUseGear.value}`,
      `    label: ${v.inUseGear.label}`,
      `  - value: ${v.unused.value}`,
      `    label: ${v.unused.label}`,
      '',
    ].join('\n'),
  );

  // Patch `tags:` onto two manifest entries on main so buildTagUsageIndex reports usage: the seed
  // post carries the in-use listed tag, and a Pass B entry carries the second. `archive` stays off
  // every entry so its usage is zero (the deletable listed tag). Read the manifest the media seed
  // wrote, add the tags, and rewrite it.
  const manifestRaw = main.get('src/content/.cairn/index.json');
  if (manifestRaw) {
    const manifest = JSON.parse(manifestRaw) as {
      version: number;
      entries: { id: string; tags?: string[]; [key: string]: unknown }[];
    };
    for (const entry of manifest.entries) {
      if (entry.id === SEED_POST_ID) entry.tags = [v.inUse.value];
      if (entry.id === PASS_B_ENTRIES.emptyAlt.id) entry.tags = [v.inUse.value, v.inUseGear.value];
    }
    main.set('src/content/.cairn/index.json', `${JSON.stringify(manifest, null, 2)}\n`);
  }
  heads.set('main', nextSha());

  // One open branch whose entry markdown carries the unlisted-but-in-use tag through the posts
  // concept's `topics:` field (the marked taxonomy field). The branch arm of buildTagUsageIndex
  // reconstructs this path from the branch name, reads the file, and coerces `topics`, so the value
  // surfaces in the load's `unlisted` set as a real seed candidate.
  const branchTree: Tree = new Map(main);
  branchTree.set(
    SEED_VOCAB_BRANCH_ENTRY,
    `---\ntitle: Weather notes draft\ndate: 2026-05-18\ntopics:\n  - ${v.unlisted.value}\n---\nA draft tagged with a value not yet in the vocabulary.\n`,
  );
  branches.set(SEED_VOCAB_BRANCH, branchTree);
  heads.set(SEED_VOCAB_BRANCH, nextSha());
}

/** The basename of a repo path: the segment after the last slash. */
function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * Build the dev `Backend`: a thin facade over the module-level in-memory store. Every instance
 * shares that one singleton store, so a commit on one request is visible to the recorder route on
 * the next. The seven methods mirror the GitHub backend's contract: an empty change set rejects,
 * and a supplied `expectedHead` makes the commit fail-closed on a moved head.
 * @returns a {@link Backend} over the in-memory repo, with `main` as its default branch.
 */
export function createDevBackend(): Backend {
  return {
    defaultBranch: 'main',

    async readFile(path: string, ref: string): Promise<string | null> {
      return branches.get(ref)?.get(path) ?? null;
    },

    async readEntries(dir: string, ref: string): Promise<RepoFile[]> {
      const tree = branches.get(ref);
      if (!tree) return [];
      const clean = dir.replace(/^\/+|\/+$/g, '');
      const prefix = `${clean}/`;
      // The markdown entries directly in `dir`, newest id first: the same shape listMarkdown
      // returns (basename id, no nested files, descending id sort).
      return [...tree.keys()]
        .filter((p) => p.startsWith(prefix) && p.endsWith('.md') && !p.slice(prefix.length).includes('/'))
        .map((p) => {
          const name = basename(p);
          return { id: name.replace(/\.md$/, ''), name, path: p };
        })
        .sort((a, b) => b.id.localeCompare(a.id));
    },

    async branchHead(branch: string): Promise<string | null> {
      return heads.get(branch) ?? null;
    },

    async listBranches(prefix: string): Promise<string[]> {
      return [...branches.keys()].filter((name) => name.startsWith(prefix)).sort();
    },

    async commit(
      branch: string,
      changes: FileChange[],
      author: CommitAuthor,
      _message: string,
      expectedHead?: string,
    ): Promise<string> {
      // Mirror the real commitFiles: an empty change set is a programming error, not a no-op.
      if (changes.length === 0) throw new Error('commitFiles: no changes to commit');

      // expectedHead is the fail-closed guard the entry and publish paths use: a single attempt
      // that throws a CommitConflictError-named error (the engine's isConflict matches it) when
      // the branch head moved since the caller read it.
      if (expectedHead !== undefined && heads.get(branch) !== expectedHead) {
        throw new CommitConflictError(`${branch} (head moved)`);
      }

      const tree = branches.get(branch) ?? new Map<string, string>();
      branches.set(branch, tree);
      for (const change of changes) {
        if (change.content === null) tree.delete(change.path);
        else tree.set(change.path, change.content);
      }
      const sha = nextSha();
      heads.set(branch, sha);

      // Record the content file (the .md entry, not the manifest) so the E2E recorder route can
      // assert the author and the landing branch. The committer is left null: cairn never sets it,
      // and GitHub attributes the commit to cairn-cms[bot].
      const fileEntry =
        changes.find((c) => c.path.endsWith('.md') && c.content !== null) ??
        changes.find((c) => c.content !== null);
      if (fileEntry && fileEntry.content !== null) {
        lastCommit = { path: fileEntry.path, branch, author, committer: null, content: fileEntry.content };
      }
      return sha;
    },

    async createBranch(name: string, fromBranch: string): Promise<void> {
      const source = branches.get(fromBranch);
      if (!source) throw new CommitConflictError(`${fromBranch} (unreadable source)`);
      branches.set(name, new Map(source));
      heads.set(name, nextSha());
    },

    async deleteBranch(name: string): Promise<void> {
      branches.delete(name);
      heads.delete(name);
    },
  };
}
