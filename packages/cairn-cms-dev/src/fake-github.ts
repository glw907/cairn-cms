// A dev-only GitHub double for the showcase. It intercepts api.github.com so the engine's reads
// and commits land in an in-memory repo instead of the real API, and records the last commit so
// the E2E can assert the author, the committer, and the branch the commit landed on. Installed
// once from hooks.server.ts; never part of the published engine.
//
// The repo is branch-aware for the publish workflow: each branch holds a flat path-to-content
// map, creating a ref snapshots its source branch's tree (like a real git ref), and the Git Data
// commit sequence lands on whichever branch its final ref PATCH names.
//
// URL patterns reconciled against src/lib/github/repo.ts and src/lib/github/branches.ts:
//   listMarkdown  -> GET    /repos/o/r/git/trees/<branch>?recursive=1
//   readRaw       -> GET    /repos/o/r/contents/<path>?ref=<branch>, Accept: application/vnd.github.raw
//   fileSha       -> GET    /repos/o/r/contents/<path>?ref=<branch>, Accept: application/vnd.github+json -> { sha }
//   commitFile    -> PUT    /repos/o/r/contents/<path>   body: { message, content, branch, author, sha? }
//                    (single-file path, still used by nav-routes.ts)
//   branchHeadSha -> GET    /repos/o/r/git/ref/heads/<branch> -> { object: { sha } }, 404 when absent
//   createBranch  -> POST   /repos/o/r/git/refs               body: { ref, sha }
//   deleteBranch  -> DELETE /repos/o/r/git/refs/heads/<branch>
//   listBranches  -> GET    /repos/o/r/git/matching-refs/heads/<prefix>
//   commitFiles   -> the atomic Git Data sequence (content + manifest in one commit):
//                    GET /git/ref/heads/<branch>, GET /git/commits/<sha>, POST /git/trees,
//                    POST /git/commits, PATCH /git/refs/heads/<branch> (applies the staged tree)
//                    (no committer field; GitHub attributes commits to cairn-cms[bot])
//
// Branch names arrive encodeURIComponent'd in ref URLs (cairn%2Fposts%2Fid), so every captured
// segment decodes before the branch lookup.

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
let installed = false;

/** One branch's working tree: repo path to file content. */
type Tree = Map<string, string>;

/** A Git Trees API change entry: a content write, or a `sha: null` delete. */
interface TreeChange {
  path: string;
  content?: string;
  sha?: string | null;
}

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

/** Tree-create payloads keyed by their returned sha, applied at ref PATCH time. */
const stagedTrees = new Map<string, TreeChange[]>();
/** Commit-create payloads keyed by their returned sha: the tree to apply plus the recorded author. */
const stagedCommits = new Map<
  string,
  { treeSha: string; author: { name: string; email: string }; committer: unknown }
>();

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

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

/** Patch globalThis.fetch so GitHub API calls hit the in-memory repo. Idempotent per process. */
export function installFakeGitHub(): void {
  if (installed) return;
  installed = true;
  const real = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input instanceof Request ? input.url : input);

    if (!url.includes('api.github.com')) return real(input, init);

    const u = new URL(url);
    // pathname keeps %2F intact, so an encoded branch name stays one segment until decoded.
    const route = u.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const accept = headers['Accept'] ?? headers['accept'] ?? '';
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;

    // listBranches: every ref under the prefix (the prefix arrives unencoded, slashes literal).
    const matching = route.match(/\/git\/matching-refs\/heads\/(.*)$/);
    if (method === 'GET' && matching) {
      const prefix = decodeURIComponent(matching[1]);
      const refs = [...branches.keys()]
        .filter((name) => name.startsWith(prefix))
        .sort()
        .map((name) => ({ ref: `refs/heads/${name}`, object: { sha: heads.get(name) } }));
      return json(refs);
    }

    // branchHeadSha / commitFiles head read: the single-ref read, 404 when the branch is absent.
    const refRead = route.match(/\/git\/ref\/heads\/(.+)$/);
    if (method === 'GET' && refRead) {
      const branch = decodeURIComponent(refRead[1]);
      if (!branches.has(branch)) return new Response('Not Found', { status: 404 });
      return json({ object: { sha: heads.get(branch) } });
    }

    // createBranch: snapshot the source branch's tree (the branch whose head matches the sha).
    if (method === 'POST' && route.endsWith('/git/refs')) {
      const name = String(body.ref ?? '').replace(/^refs\/heads\//, '');
      if (branches.has(name)) return new Response('Reference already exists', { status: 422 });
      const source = [...heads.entries()].find(([, sha]) => sha === body.sha)?.[0] ?? 'main';
      branches.set(name, new Map(branches.get(source)));
      heads.set(name, nextSha());
      return json({ ref: `refs/heads/${name}` }, 201);
    }

    const refWrite = route.match(/\/git\/refs\/heads\/(.+)$/);

    // deleteBranch: 404 when already gone (the engine treats that as success).
    if (method === 'DELETE' && refWrite) {
      const branch = decodeURIComponent(refWrite[1]);
      if (!branches.has(branch)) return new Response('Not Found', { status: 404 });
      branches.delete(branch);
      heads.delete(branch);
      return new Response(null, { status: 204 });
    }

    // The atomic-commit landing: apply the staged tree to the named branch and record the
    // content file (the .md entry, not the manifest) as the last commit.
    if (method === 'PATCH' && refWrite) {
      const branch = decodeURIComponent(refWrite[1]);
      const tree = branches.get(branch);
      const staged = stagedCommits.get(String(body.sha ?? ''));
      const changes = staged ? stagedTrees.get(staged.treeSha) : undefined;
      if (!tree || !staged || !changes) return new Response('Unprocessable', { status: 422 });
      for (const change of changes) {
        if (change.sha === null) tree.delete(change.path);
        else if (typeof change.content === 'string') tree.set(change.path, change.content);
      }
      heads.set(branch, String(body.sha));
      const fileEntry =
        changes.find((e) => e.path.endsWith('.md') && typeof e.content === 'string') ??
        changes.find((e) => typeof e.content === 'string');
      if (fileEntry) {
        lastCommit = {
          path: fileEntry.path,
          branch,
          author: staged.author,
          committer: staged.committer,
          content: fileEntry.content ?? '',
        };
      }
      return json({ object: { sha: body.sha } });
    }

    // listMarkdown: all blobs on the branch, so the engine can filter by dir prefix.
    const treeList = route.match(/\/git\/trees\/([^/]+)$/);
    if (method === 'GET' && treeList) {
      const tree = branches.get(decodeURIComponent(treeList[1]));
      if (!tree) return new Response('Not Found', { status: 404 });
      return json({ tree: [...tree.keys()].map((path) => ({ path, type: 'blob' })), truncated: false });
    }

    // Tree create: stage the changes; they apply to a branch only at ref PATCH time.
    if (method === 'POST' && route.endsWith('/git/trees')) {
      const sha = nextSha();
      stagedTrees.set(sha, (body.tree ?? []) as TreeChange[]);
      return json({ sha });
    }

    // commitTreeSha: the parent commit's tree (the sha itself stands in for it here).
    if (method === 'GET' && /\/git\/commits\/[^/]+$/.test(route)) {
      return json({ tree: { sha: route.split('/').pop() } });
    }

    // Commit create: stage the tree pointer and the author for the ref PATCH that lands it.
    if (method === 'POST' && route.endsWith('/git/commits')) {
      const sha = nextSha();
      stagedCommits.set(sha, {
        treeSha: String(body.tree ?? ''),
        author: body.author as { name: string; email: string },
        // committer is not set by cairn; record null so the E2E can assert its absence.
        committer: body.committer ?? null,
      });
      return json({ sha });
    }

    // Contents API: PUT (commitFile) or GET (readRaw / fileSha), honoring ?ref= for any branch.
    const contentsMatch = route.match(/\/contents\/(.+)$/);
    const path = contentsMatch ? decodeURIComponent(contentsMatch[1]) : '';

    if (method === 'PUT' && path) {
      const branch = String(body.branch ?? 'main');
      const tree = branches.get(branch);
      if (!tree) return new Response('Not Found', { status: 404 });
      const encoded = String(body.content ?? '');
      const decoded =
        typeof atob === 'function' ? atob(encoded) : Buffer.from(encoded, 'base64').toString('utf-8');
      tree.set(path, decoded);
      heads.set(branch, nextSha());
      lastCommit = {
        path,
        branch,
        author: body.author as { name: string; email: string },
        committer: body.committer ?? null,
        content: decoded,
      };
      return json({ commit: { sha: heads.get(branch) } });
    }

    // GET: distinguish readRaw (Accept: application/vnd.github.raw) from fileSha (JSON).
    if (method === 'GET' && path) {
      const branch = u.searchParams.get('ref') ?? 'main';
      const content = branches.get(branch)?.get(path);
      if (content === undefined) return new Response('Not Found', { status: 404 });
      if (accept.includes('raw')) return new Response(content, { status: 200 });
      return json({ sha: 'old-sha', name: path.split('/').pop() });
    }

    // Fallthrough: installation token exchange and other GitHub API calls.
    if (url.includes('/access_tokens')) {
      return json({ token: 'dev-token' }, 201);
    }

    return new Response('Not Found', { status: 404 });
  }) as typeof fetch;
}
