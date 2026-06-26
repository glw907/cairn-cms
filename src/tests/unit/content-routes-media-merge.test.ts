// Task 6: the save-time media-manifest merge on the branch and into Publish. A save whose posted
// `media` field carries optimistic records folds a merged media.json into the same branch commit as
// the body; a publish promotes that same merged media.json to main alongside the body and the
// content manifest. The merge reads the default-branch base once and reuses it for both commits
// (decision 1, last-writer-wins by hash). With media off, the no-media path is byte-identical to
// today: no media.json is ever touched.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import {
  parseMediaManifest,
  serializeMediaManifest,
  type MediaEntry,
} from '../../lib/media/manifest.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';
import { fieldset } from '../../lib/content/fieldset.js';

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const MEDIA_PATH = 'src/content/.cairn/media.json';

const MEDIA_ON: ResolvedAssetConfig = {
  enabled: true,
  bucketBinding: 'MEDIA_BUCKET',
  publicBase: '/media',
  urlForm: 'slug',
  maxUploadBytes: 25 * 1024 * 1024,
  allowedTypes: ['image/jpeg'],
  variants: {},
  transformations: false,
};

function runtime(assets: ResolvedAssetConfig): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [
      {
        id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts',
        routing: { routable: true, dated: true, inFeeds: true },
        permalink: '/posts/:slug',
        datePrefix: 'day',
        fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
        schema: fieldset({}),
        summaryFields: [],
        validate: () => ({ ok: true as const, data: { title: 'Hi' } }),
      },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: MEDIA_PATH,
    resolvedAssets: assets,
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

/** A server-owned media record, the shape the upload action returns and the client re-posts. */
function entry(hash: string, slug: string): MediaEntry {
  return {
    hash,
    sha256: `${hash}-full-sha`,
    slug,
    displayName: slug,
    originalFilename: `${slug}.jpg`,
    alt: '',
    ext: 'jpg',
    contentType: 'image/jpeg',
    bytes: 1234,
    width: 800,
    height: 600,
    createdAt: '2026-06-15T00:00:00.000Z',
  };
}

function saveEvent(id: string, form: Record<string, string>) {
  return {
    url: new URL(`https://t.example/admin/posts/${id}`),
    params: { concept: 'posts', id },
    request: new Request(`https://t.example/admin/posts/${id}`, { method: 'POST', body: new URLSearchParams(form) }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

async function redirectedTo(action: Promise<unknown>): Promise<string> {
  try {
    await action;
  } catch (e) {
    return (e as { location: string }).location;
  }
  throw new Error('expected a redirect');
}

const seededManifest = (id: string, draft = false) =>
  serializeManifest({
    version: 1,
    entries: [{ concept: 'posts', id, permalink: `/posts/${id}`, title: 'Hi', date: '2026-05-01', draft, links: [] }],
  });

afterEach(() => vi.restoreAllMocks());

describe('saveToBranch media merge', () => {
  it('commits the body and a media.json with both rows in one branch commit', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: seededManifest('2026-05-hi') } });
    gh.install();
    const routes = createContentRoutes(runtime(MEDIA_ON), deps);
    const media = JSON.stringify([entry('0000000000000001', 'one'), entry('0000000000000002', 'two')]);
    const loc = await redirectedTo(routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b', media }) as never));
    expect(loc).toBe('/admin/posts/2026-05-hi?saved=1');

    // The body and the media.json both land on the pending branch.
    expect(gh.read('cairn/posts/2026-05-hi', 'src/content/posts/2026-05-hi.md')).toContain('title: Hi');
    const onBranch = gh.read('cairn/posts/2026-05-hi', MEDIA_PATH);
    expect(onBranch).not.toBeNull();
    const manifest = parseMediaManifest(JSON.parse(onBranch as string));
    expect(Object.keys(manifest).sort()).toEqual(['0000000000000001', '0000000000000002']);

    // Main is untouched: no media.json on main.
    expect(gh.read('main', MEDIA_PATH)).toBeNull();
  });

  it('promotes both rows to main media.json in the publish commit', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: seededManifest('2026-05-hi') } });
    gh.install();
    const routes = createContentRoutes(runtime(MEDIA_ON), deps);
    const media = JSON.stringify([entry('0000000000000001', 'one'), entry('0000000000000002', 'two')]);
    const loc = await redirectedTo(routes.publishAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b', media }) as never));
    expect(loc).toBe('/admin/posts/2026-05-hi?published=1');

    // The publish commit on main carries the body, the content manifest, and media.json with both rows.
    expect(gh.read('main', 'src/content/posts/2026-05-hi.md')).toContain('title: Hi');
    expect(gh.read('main', MANIFEST_PATH)).not.toBeNull();
    const onMain = gh.read('main', MEDIA_PATH);
    expect(onMain).not.toBeNull();
    const manifest = parseMediaManifest(JSON.parse(onMain as string));
    expect(Object.keys(manifest).sort()).toEqual(['0000000000000001', '0000000000000002']);
  });

  it('merges each save onto the default-branch base, not the pending branch', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: seededManifest('2026-05-hi') } });
    gh.install();
    const routes = createContentRoutes(runtime(MEDIA_ON), deps);

    // First entry saves a row, on its own branch. Main stays empty (not published).
    await redirectedTo(
      routes.saveAction(saveEvent('2026-05-one', { title: 'Hi', body: 'b', media: JSON.stringify([entry('0000000000000001', 'one')]) }) as never),
    );
    // Second entry saves a different row on its own branch.
    await redirectedTo(
      routes.saveAction(saveEvent('2026-05-two', { title: 'Hi', body: 'b', media: JSON.stringify([entry('0000000000000002', 'two')]) }) as never),
    );

    // The second branch's media.json carries only its own row plus the default-branch base (empty),
    // not the first branch's row. The merge reads main, not the sibling pending branch.
    const onTwo = parseMediaManifest(JSON.parse(gh.read('cairn/posts/2026-05-two', MEDIA_PATH) as string));
    expect(Object.keys(onTwo)).toEqual(['0000000000000002']);
    expect(onTwo['0000000000000001']).toBeUndefined();
  });

  it('commits no media.json when media is disabled', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: seededManifest('2026-05-hi') } });
    gh.install();
    const routes = createContentRoutes(runtime({ enabled: false }), deps);
    const media = JSON.stringify([entry('0000000000000001', 'one')]);
    await redirectedTo(routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b', media }) as never));
    expect(gh.read('cairn/posts/2026-05-hi', MEDIA_PATH)).toBeNull();
    expect(gh.read('main', MEDIA_PATH)).toBeNull();
  });

  it('produces a byte-identical media.json on a re-save of the same records (idempotent)', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: seededManifest('2026-05-hi') } });
    gh.install();
    const routes = createContentRoutes(runtime(MEDIA_ON), deps);
    const media = JSON.stringify([entry('0000000000000001', 'one'), entry('0000000000000002', 'two')]);
    await redirectedTo(routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b', media }) as never));
    const first = gh.read('cairn/posts/2026-05-hi', MEDIA_PATH);
    await redirectedTo(routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b', media }) as never));
    const second = gh.read('cairn/posts/2026-05-hi', MEDIA_PATH);
    expect(second).toBe(first);
    expect(first).toBe(serializeMediaManifest(parseMediaManifest(JSON.parse(first as string))));
  });

  it('drops malformed media JSON to no records and commits no media.json', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: seededManifest('2026-05-hi') } });
    gh.install();
    const routes = createContentRoutes(runtime(MEDIA_ON), deps);
    await redirectedTo(routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b', media: 'not json {{{' }) as never));
    expect(gh.read('cairn/posts/2026-05-hi', MEDIA_PATH)).toBeNull();
  });

  it('commits no media.json when media is on but no records are posted', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: seededManifest('2026-05-hi') } });
    gh.install();
    const routes = createContentRoutes(runtime(MEDIA_ON), deps);
    await redirectedTo(routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b' }) as never));
    expect(gh.read('cairn/posts/2026-05-hi', MEDIA_PATH)).toBeNull();
  });
});
