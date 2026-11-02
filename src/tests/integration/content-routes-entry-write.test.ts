// The save refusal names the field a validation error belongs to, so the editor can point at it.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { createGithubApp } from '../../lib/index.js';
import { GithubDouble } from '../unit/_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import { defineFieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';
import { testEvent } from '../helpers/test-event.js';

const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };
const MANIFEST_PATH = 'src/content/.cairn/index.json';

function runtime(): CairnRuntime {
  const schema = defineFieldset({
    title: fields.text({ label: 'Title', required: true, min: 3, max: 10 }),
  });
  return {
    siteName: 'T',
    siteConfigPath: 'src/lib/site.config.yaml',
    concepts: [
      {
        id: 'posts', label: 'Posts', singular: 'Post', dir: 'src/content/posts',
        routing: { routable: true, dated: false, inFeeds: true },
        permalink: '/posts/:slug',
        datePrefix: 'day',
        fields: [{ type: 'text', name: 'title', label: 'Title', required: true, min: 3, max: 10 }],
        schema,
        summaryFields: [],
        validate: (fm, body) => schema.validate(fm, body),
      },
    ],
    backend: createGithubApp(REPO),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: 'src/content/.cairn/media.json',
    media: { enabled: false },
    vocabulary: [],
  } as CairnRuntime;
}

const backend = makeGithubBackend(REPO, () => Promise.resolve('test-token'));

function saveEvent(title: string) {
  return testEvent({
    url: 'https://t.example/admin/posts/my-post',
    method: 'POST',
    body: new URLSearchParams({ title, body: 'Body text.' }),
    params: { concept: 'posts', id: 'my-post' },
    locals: { cairnEditor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const, capability: 'editor' as const }, cairnBackend: backend },
  });
}

function double() {
  const gh = new GithubDouble({ main: { [MANIFEST_PATH]: JSON.stringify({ version: 1, entries: [] }) } });
  gh.install();
  return gh;
}

afterEach(() => vi.restoreAllMocks());

describe('saveAction: a validation refusal names its field', () => {
  it('carries the refused field key in the envelope', async () => {
    double();
    const routes = createContentRoutes({ runtime: runtime() });
    const result = (await routes.saveAction(saveEvent('this is far too long'))) as {
      status: number;
      data: { error: string; field?: string };
    };
    expect(result.status).toBe(400);
    expect(result.data.field).toBe('title');
    expect(result.data.error).toContain('at most 10');
  });

  it('saves a value that is within bounds after trimming', async () => {
    double();
    const routes = createContentRoutes({ runtime: runtime() });
    let thrown: unknown;
    try {
      await routes.saveAction(saveEvent('   abcdefghij   '));
    } catch (e) {
      thrown = e;
    }
    expect(typeof (thrown as { location?: string }).location).toBe('string');
  });
});
