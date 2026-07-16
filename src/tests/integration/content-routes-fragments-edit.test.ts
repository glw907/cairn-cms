// cairn-cms: Task 6's edit-load fragment bodies, the linkTargets/routable projections, and the
// nested-include save bounce. editLoad reads a fragments-concept entry's usage the same inbound
// surface every other concept rides for the delete guard (inboundIncludes feeding EditData.inboundLinks),
// and reads every published fragment's body from the default branch only, so a fragment's own
// pending edits never leak into another entry's preview. saveToBranch refuses a fragments-concept
// body that itself contains an ::include directive, since the engine resolves an include only one
// pass deep. The fixture drives the REAL saveAction/publishAction, so the manifest projections and
// the include extraction come from the engine's own machinery, never a hand-written entry, mirroring
// content-routes-fragments-delete.test.ts.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { GithubDouble } from '../unit/_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';
import { runtime as baseRuntime, postsConcept, contentEvent } from '../unit/_content-harness.js';
import type { CairnRuntime, ConceptDescriptor } from '../../lib/content/types.js';

/** A minimal fragments concept: embedded routing, one required title field. */
function fragmentsConcept(): ConceptDescriptor {
  const schema = fieldset({ title: fields.text({ label: 'Title', required: true }) });
  return {
    id: 'fragments',
    label: 'Fragments',
    singular: 'Fragment',
    dir: 'src/content/fragments',
    routing: { routable: false, dated: false, inFeeds: false },
    permalink: '/fragments/:slug',
    datePrefix: 'day',
    fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
    schema,
    summaryFields: [],
    validate: (fm, body) => schema.validate(fm, body),
  };
}

function runtime(overrides: Partial<CairnRuntime> = {}): CairnRuntime {
  return baseRuntime({ concepts: [postsConcept(), fragmentsConcept()], ...overrides });
}

function saveEvent(concept: string, id: string, form: Record<string, string>) {
  return contentEvent({ url: `https://t.example/admin/${concept}/${id}`, params: { concept, id }, form });
}

function editEvent(concept: string, id: string) {
  return contentEvent({ url: `https://t.example/admin/${concept}/${id}`, params: { concept, id } });
}

/** Drive an action that redirects on success and return the redirect location. */
async function redirectedTo(action: Promise<unknown>): Promise<string> {
  try {
    await action;
  } catch (e) {
    return (e as { location: string }).location;
  }
  throw new Error('expected a redirect');
}

/** The `?error=` query param off a redirect location, decoded. */
function errorParam(location: string): string | null {
  const [, query] = location.split('?');
  return new URLSearchParams(query ?? '').get('error');
}

afterEach(() => vi.restoreAllMocks());

describe('editLoad: fragmentTargets (Task 6)', () => {
  it('is null when the site declares no fragments concept', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(baseRuntime({ concepts: [postsConcept()] }));
    await redirectedTo(
      routes.publishAction(saveEvent('posts', '2026-05-hi', { title: 'Hi', date: '2026-05-01', body: 'See.' }) as never),
    );
    const data = await routes.editLoad(editEvent('posts', '2026-05-hi') as never);
    expect(data.fragmentTargets).toBeNull();
  });

  // The null covers two cases, and this is the second: a fragment cannot include a fragment, so
  // its own edit screen offers none. Resolving them here would render a nested include in the
  // preview that the save then refuses, and the batch of reads would be pure waste besides.
  it("is null on a fragment's own edit screen, even with fragments published", async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());
    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'welcome', { title: 'Welcome', body: 'Hi there.' }) as never),
    );
    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'address', { title: 'Address', body: 'Somewhere.' }) as never),
    );
    await redirectedTo(
      routes.publishAction(saveEvent('posts', '2026-05-hi', { title: 'Hi', date: '2026-05-01', body: 'See.' }) as never),
    );

    // A post sees both, so the corpus really is there to offer.
    const post = await routes.editLoad(editEvent('posts', '2026-05-hi') as never);
    expect(post.fragmentTargets).toHaveLength(2);

    const fragment = await routes.editLoad(editEvent('fragments', 'welcome') as never);
    expect(fragment.fragmentTargets).toBeNull();
  });

  it('is empty when fragments are declared but none are published', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());
    await redirectedTo(
      routes.publishAction(saveEvent('posts', '2026-05-hi', { title: 'Hi', date: '2026-05-01', body: 'See.' }) as never),
    );
    const data = await routes.editLoad(editEvent('posts', '2026-05-hi') as never);
    expect(data.fragmentTargets).toEqual([]);
  });

  it('populates fragmentTargets from the default branch only, ignoring a pending fragment edit', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());
    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'welcome', { title: 'Welcome', body: 'Hi there.' }) as never),
    );
    await redirectedTo(
      routes.publishAction(saveEvent('posts', '2026-05-hi', { title: 'Hi', date: '2026-05-01', body: 'See.' }) as never),
    );
    // A pending (unpublished) edit to the fragment must never leak into another entry's targets:
    // fragmentTargets reads bodies from the default branch only.
    await redirectedTo(
      routes.saveAction(saveEvent('fragments', 'welcome', { title: 'Welcome', body: 'Pending edit body.' }) as never),
    );

    const data = await routes.editLoad(editEvent('posts', '2026-05-hi') as never);
    expect(data.fragmentTargets).toContainEqual({ id: 'welcome', title: 'Welcome', body: 'Hi there.\n' });
  });

  it('degrades a fragment target out when its file is absent rather than failing the whole load', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());
    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'welcome', { title: 'Welcome', body: 'Hi there.' }) as never),
    );
    await redirectedTo(
      routes.publishAction(saveEvent('posts', '2026-05-hi', { title: 'Hi', date: '2026-05-01', body: 'See.' }) as never),
    );
    // The fragment file vanishes out of band while the manifest still lists it. A 404 reads as a
    // genuine absence (readFile returns null), which is a different branch from a transport failure.
    delete gh.branches.get('main')!['src/content/fragments/welcome.md'];

    const data = await routes.editLoad(editEvent('posts', '2026-05-hi') as never);
    expect(data.fragmentTargets).toEqual([]);
  });

  // A transport failure and a genuine absence both drop the target, and downstream the preview
  // reports it missing either way. Only the log tells them apart, so an editor saying "it says the
  // fragment is missing" is diagnosable as a blip rather than a content problem they should fix by
  // deleting the include.
  it('logs include.read_failed when a fragment read throws, and still serves the load', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());
    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'welcome', { title: 'Welcome', body: 'Hi there.' }) as never),
    );
    await redirectedTo(
      routes.publishAction(saveEvent('posts', '2026-05-hi', { title: 'Hi', date: '2026-05-01', body: 'See.' }) as never),
    );

    // A 500 on the fragment's own path only: readRaw throws, unlike the 404 above. Everything else
    // (the manifest, the entry) still resolves, so the load has to survive the one bad read.
    const real = globalThis.fetch as typeof fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('src/content/fragments/welcome.md')) {
          return new Response('boom', { status: 500 });
        }
        return real(input, init);
      }),
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const data = await routes.editLoad(editEvent('posts', '2026-05-hi') as never);
    expect(data.fragmentTargets).toEqual([]);
    // The sink takes the record object, not a string.
    const records = warn.mock.calls.map((c) => c[0] as { event?: string; fragment?: string });
    const record = records.find((r) => r?.event === 'include.read_failed');
    expect(record).toBeDefined();
    expect(record?.fragment).toBe('welcome');
  });
});

describe('editLoad: linkTargets excludes non-routable concepts (Task 6)', () => {
  it('excludes the fragments-concept rows while a routable concept stays', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());
    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'welcome', { title: 'Welcome', body: 'Hi there.' }) as never),
    );
    await redirectedTo(
      routes.publishAction(saveEvent('posts', '2026-05-hi', { title: 'Hi', date: '2026-05-01', body: 'See.' }) as never),
    );

    const data = await routes.editLoad(editEvent('posts', '2026-05-hi') as never);
    expect(data.linkTargets.map((t) => t.concept)).not.toContain('fragments');
    expect(data.linkTargets.map((t) => t.id)).toContain('2026-05-hi');
  });
});

describe('editLoad: routable (Task 6)', () => {
  it('reads true for a routable concept and false for the fragments concept', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());
    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'welcome', { title: 'Welcome', body: 'Hi there.' }) as never),
    );
    await redirectedTo(
      routes.publishAction(saveEvent('posts', '2026-05-hi', { title: 'Hi', date: '2026-05-01', body: 'See.' }) as never),
    );

    const postData = await routes.editLoad(editEvent('posts', '2026-05-hi') as never);
    expect(postData.routable).toBe(true);
    const fragmentData = await routes.editLoad(editEvent('fragments', 'welcome') as never);
    expect(fragmentData.routable).toBe(false);
  });
});

describe('editLoad: usage visibility for a fragments-concept entry (Task 6)', () => {
  it('feeds inboundIncludes through EditData.inboundLinks', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());
    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'welcome', { title: 'Welcome', body: 'Hi there.' }) as never),
    );
    await redirectedTo(
      routes.publishAction(
        saveEvent('posts', '2026-05-hi', { title: 'Hi', date: '2026-05-01', body: 'See.\n\n::include{fragment="welcome"}' }) as never,
      ),
    );

    const data = await routes.editLoad(editEvent('fragments', 'welcome') as never);
    expect(data.inboundLinks.some((l) => l.id === '2026-05-hi')).toBe(true);
  });
});

describe('saveToBranch: the nested-include bounce (Task 6)', () => {
  it("refuses a fragments-concept save whose body contains an include, with the fixed copy", async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());
    const location = await redirectedTo(
      routes.saveAction(saveEvent('fragments', 'nested', { title: 'Nested', body: '::include{fragment="other"}' }) as never),
    );
    expect(errorParam(location)).toBe("A fragment can't include another fragment.");
    // No commit landed: the bounce throws before saveToBranch touches the backend.
    expect(gh.read('cairn/fragments/nested', 'src/content/fragments/nested.md')).toBeNull();
  });

  it('saves a Posts body with an include directive normally (not bounced)', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());
    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'welcome', { title: 'Welcome', body: 'Hi.' }) as never),
    );
    const location = await redirectedTo(
      routes.saveAction(
        saveEvent('posts', '2026-05-hi', { title: 'Hi', date: '2026-05-01', body: '::include{fragment="welcome"}' }) as never,
      ),
    );
    expect(location).toMatch(/^\/admin\/posts\/2026-05-hi\?saved=1/);
    expect(gh.read('cairn/posts/2026-05-hi', 'src/content/posts/2026-05-hi.md')).toContain(
      '::include{fragment="welcome"}',
    );
  });
});
