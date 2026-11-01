// The commit chain against the build gate. An admin media replace, then a save and a publish of a
// second entry, each commit through the real route actions onto an in-memory main. The committed
// tree is then read back and checked the way the build checks it: buildSiteManifest over the files,
// verifyManifest against the committed index, verifyReferences. A unit test per action proves
// its commit in isolation; this proves the sequence leaves a tree the build accepts, and that a
// hand-written key the fieldset does not declare survives the admin save.
//
// The showcase dev backend cannot stand in: a dev commit writes only an overlay and fixtures mode is
// in memory, so neither reaches a production build. The double's main tree is the committed files.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from '../unit/_github-double.js';
import { createContentRoutesInternal } from '../../lib/sveltekit/content-routes.js';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { createGithubApp } from '../../lib/index.js';
import { defineAdapter } from '../../lib/content/adapter.js';
import { defineFieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { buildSiteManifest } from '../../lib/delivery/manifest.js';
import { parseSiteConfig } from '../../lib/nav/site-config.js';
import { formatManifest, parseManifest, verifyManifest, verifyReferences } from '../../lib/content/manifest.js';
import { serializeMediaManifest, type MediaEntry } from '../../lib/media/manifest.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';
import { testEvent } from '../helpers/test-event.js';
import { withTestEnv } from '../helpers/with-test-env.js';

const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };
const MANIFEST_PATH = 'src/content/.cairn/index.json';
const MEDIA_PATH = 'src/content/.cairn/media.json';
const FIRST_PATH = 'src/content/posts/first.md';
const SECOND_PATH = 'src/content/posts/second.md';

const OLD_HASH = '0000000000000aaa';
const NEW_HASH = '0000000000000bbb';

const MEDIA_ON: ResolvedAssetConfig = {
  enabled: true,
  bucketBinding: 'MEDIA_BUCKET',
  publicBase: '/media',
  urlForm: 'slug',
  maxUploadBytes: 25 * 1024 * 1024,
  allowedTypes: ['image/jpeg'],
  transformations: false,
};

const adapter = defineAdapter({
  backend: createGithubApp(REPO),
  rendering: { render: ({ body }) => Promise.resolve(body) },
  email: { from: 'cms@test.example' },
  content: {
    posts: {
      dir: 'src/content/posts',
      fields: defineFieldset({ title: fields.text({ label: 'Title', required: true }) }),
    },
  },
});
const siteConfig = parseSiteConfig('siteName: Test\n');

const FIRST_RAW = `---\ntitle: First\n---\n\n![a photo](media:old-photo.${OLD_HASH})\n`;
// `draft` is hand-written and the fieldset above does not declare it.
const SECOND_RAW = '---\ntitle: Second\ndraft: true\n---\n\nSecond body.\n';

function mediaEntry(hash: string, slug: string): MediaEntry {
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

function runtime(): CairnRuntime {
  return {
    siteName: 'T',
    concepts: normalizeConcepts(adapter.content),
    backend: createGithubApp(REPO),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: MEDIA_PATH,
    resolvedAssets: MEDIA_ON,
    vocabulary: [],
    siteConfigPath: 'src/lib/site.config.yaml',
  };
}

const backend = makeGithubBackend(REPO, () => Promise.resolve('test-token'));
const EDITOR = { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const, capability: 'editor' as const };
const ENV = { GITHUB_APP_PRIVATE_KEY_B64: 'x', MEDIA_BUCKET: {} };

function formEvent(url: string, form: Record<string, string> | FormData, params: Record<string, string> = {}) {
  return testEvent({
    url,
    params,
    body: form instanceof FormData ? form : new URLSearchParams(form),
    locals: { cairnEditor: EDITOR, cairnBackend: backend },
  });
}

/** Run an action that ends in a redirect (a form action's success), returning its location. */
async function redirectedTo(action: () => Promise<unknown>): Promise<string> {
  try {
    await withTestEnv(ENV, action);
  } catch (e) {
    const location = (e as { location?: string }).location;
    if (typeof location === 'string') return location;
    throw e;
  }
  throw new Error('expected a redirect');
}

afterEach(() => vi.restoreAllMocks());

describe('the commit chain against the build gate', () => {
  it('leaves a committed tree the build accepts, with the undeclared key intact', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // The seeded main is what a previous build left: the manifest is built from the files.
    const seeded = buildSiteManifest(adapter, siteConfig, { posts: { [FIRST_PATH]: FIRST_RAW, [SECOND_PATH]: SECOND_RAW } });
    const gh = new GithubDouble({
      main: {
        [FIRST_PATH]: FIRST_RAW,
        [SECOND_PATH]: SECOND_RAW,
        [MEDIA_PATH]: serializeMediaManifest({ [OLD_HASH]: mediaEntry(OLD_HASH, 'old-photo') }),
        [MANIFEST_PATH]: formatManifest(seeded),
      },
    });
    gh.install();
    const routes = createContentRoutesInternal({ runtime: runtime() });

    // 1. Replace the asset the first entry uses.
    const replaceForm = new FormData();
    replaceForm.set('oldHash', OLD_HASH);
    replaceForm.set('newHash', NEW_HASH);
    replaceForm.set('confirmSlug', 'old-photo');
    replaceForm.set('media', JSON.stringify([mediaEntry(NEW_HASH, 'new-photo')]));
    const replaced = await redirectedTo(() =>
      routes.mediaReplaceAction(formEvent('https://t.example/admin/media', replaceForm)),
    );
    expect(replaced).toBe('/admin/media?replaced=1');

    // 2. Save, then 3. publish, the second entry through the editor's form.
    const params = { concept: 'posts', id: 'second' };
    const form = { title: 'Second', body: 'Second body, edited.' };
    await redirectedTo(() => routes.saveAction(formEvent('https://t.example/admin/posts/second', form, params)));
    await redirectedTo(() => routes.publishAction(formEvent('https://t.example/admin/posts/second', form, params)));

    // The committed tree, read back from main the way the build globs the content directory.
    const tree = gh.branches.get('main') ?? {};
    const posts: Record<string, string> = {};
    for (const [path, raw] of Object.entries(tree)) {
      if (path.startsWith('src/content/posts/') && path.endsWith('.md')) posts[path] = raw;
    }
    const committedRaw = tree[MANIFEST_PATH];
    expect(committedRaw).toBeDefined();

    // The hand-written key survives the admin save and publish. Soft, so a failing base still runs
    // the build checks below and reports both.
    expect.soft(posts[SECOND_PATH]).toMatch(/^draft: true$/m);
    expect.soft(posts[SECOND_PATH]).toContain('Second body, edited.');

    // What the build runs: build from the files, verify against the committed index, then references.
    const built = buildSiteManifest(adapter, siteConfig, { posts });
    expect(parseManifest(committedRaw).entries.map((e) => e.id).sort()).toEqual(['first', 'second']);
    expect(() => verifyManifest(built, committedRaw, adapter)).not.toThrow();
    expect(() => verifyReferences(built)).not.toThrow();
  });
});
