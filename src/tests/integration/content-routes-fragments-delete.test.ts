// cairn-cms: Task 4's fragments delete guard. deleteEntry refuses (409) when a published entry's
// body still includes the fragment, naming the includers with inclusion copy ("entry includes it.
// Remove the include first."), and proceeds when nothing includes it, mirroring the body-link gate's
// degrade-to-allow posture on an absent manifest (the build's include-resolver backstop covers the
// dangling case). The fixture drives the REAL saveAction/publishAction, so the manifest's `includes`
// row comes from the engine's own extractIncludes, never a hand-written entry: extraction-to-guard
// runs end to end.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { GithubDouble } from '../unit/_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';
import { runtime as baseRuntime, postsConcept, contentEvent } from '../unit/_content-harness.js';
import type { CairnRuntime, ConceptDescriptor } from '../../lib/content/types.js';

const MANIFEST_PATH = 'src/content/.cairn/index.json';

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

function deleteEvent(concept: string, id: string) {
  return contentEvent({ url: `https://t.example/admin/${concept}/${id}`, params: { concept, id }, method: 'POST' });
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

/** Delete the target and either return the thrown redirect location or the fail() result. */
async function del(
  routes: ReturnType<typeof createContentRoutes>,
  concept: string,
  id: string,
): Promise<{ location?: string; status?: number; data?: { error: string; inboundLinks?: { id: string }[]; inboundKind?: string } }> {
  try {
    const result = (await routes.deleteAction(deleteEvent(concept, id) as never)) as unknown as {
      status: number;
      data: { error: string; inboundLinks?: { id: string }[]; inboundKind?: string };
    };
    return { status: result.status, data: result.data };
  } catch (e) {
    const loc = (e as { location?: string }).location;
    if (typeof loc === 'string') return { location: loc };
    throw e;
  }
}

afterEach(() => vi.restoreAllMocks());

describe('deleteEntry: fragments inclusion guard (Task 4)', () => {
  it('refuses (409) with inclusion-naming copy when a published entry includes the fragment', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());

    // Publish the fragment itself, then a post whose body includes it. manifestEntryFromFile's real
    // extractIncludes computes the includes row from this body; nothing here hand-writes the manifest.
    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'welcome', { title: 'Welcome', body: 'Hi there.' }) as never),
    );
    await redirectedTo(
      routes.publishAction(
        saveEvent('posts', '2026-05-hi', {
          title: 'Hi',
          date: '2026-05-01',
          body: 'See.\n\n::include{fragment="welcome"}',
        }) as never,
      ),
    );
    expect(gh.read('main', MANIFEST_PATH)).toContain('"includes"');

    const out = await del(routes, 'fragments', 'welcome');
    expect(out.status).toBe(409);
    expect(out.data?.error).toMatch(/entry includes it/i);
    expect(out.data?.error).toMatch(/remove the include first/i);
    expect(out.data?.inboundLinks?.some((l) => l.id === '2026-05-hi')).toBe(true);
    // The refusal names its own gate, so the admin copy cannot blame the wrong blocker. The links
    // gate runs first and leaves this unset, and a fragment can trip either gate.
    expect(out.data?.inboundKind).toBe('include');
    // No commit landed: the fragment file still exists on main.
    expect(gh.read('main', 'src/content/fragments/welcome.md')).toContain('title: Welcome');
  });

  it('proceeds when nothing includes the fragment', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());
    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'lonely', { title: 'Lonely', body: 'No one needs me.' }) as never),
    );

    const out = await del(routes, 'fragments', 'lonely');
    expect(out.location).toBe('/admin/fragments');
    expect(gh.read('main', 'src/content/fragments/lonely.md')).toBeNull();
  });

  it('degrades to allow when the manifest is absent', async () => {
    // The fragment file exists directly on main (committed out of band), but no manifest.json was
    // ever committed. Same posture as the body-link gate: an absent manifest degrades to allow,
    // since the build's include-resolver backstop catches a real dangling reference.
    const gh = new GithubDouble({ main: { 'src/content/fragments/orphan.md': '---\ntitle: Orphan\n---\nbody' } });
    gh.install();
    const routes = createContentRoutes(runtime());
    const out = await del(routes, 'fragments', 'orphan');
    expect(out.location).toBe('/admin/fragments');
    expect(gh.read('main', 'src/content/fragments/orphan.md')).toBeNull();
  });
});

describe('saveAction/publishAction: the write-path round trip for includes (Task 4)', () => {
  it('saves the include directive to the pending branch, then publishes an includes row to main', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());
    const form = { title: 'Hi', date: '2026-05-01', body: 'See.\n\n::include{fragment="welcome"}' };

    // saveAction: the branch commit is real (the entry's own file), and nothing lands on main yet,
    // since save never touches the content manifest (only publish does).
    await redirectedTo(routes.saveAction(saveEvent('posts', '2026-05-hi', form) as never));
    expect(gh.read('cairn/posts/2026-05-hi', 'src/content/posts/2026-05-hi.md')).toContain(
      '::include{fragment="welcome"}',
    );
    expect(gh.read('main', MANIFEST_PATH)).toBeNull();

    // publishAction re-holds the same body (publish-what-you-see) and lands the manifest row on
    // main with its includes computed by the engine's own extractIncludes, not a hand-written entry.
    await redirectedTo(routes.publishAction(saveEvent('posts', '2026-05-hi', form) as never));
    const manifestRaw = gh.read('main', MANIFEST_PATH);
    expect(manifestRaw).not.toBeNull();
    const manifest = JSON.parse(manifestRaw as string) as { entries: { id: string; includes?: string[] }[] };
    const row = manifest.entries.find((e) => e.id === '2026-05-hi');
    expect(row?.includes).toEqual(['welcome']);
  });
});
