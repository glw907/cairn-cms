// cairn-cms: Task 5's fragment rename repoint. renameAction already repoints every inbound linker's
// body `cairn:` links and frontmatter references in one commit (Task 12); this extends the same
// inbound-rewrite pass to `::include{fragment="<old>"}` occurrences, so a consuming entry's body and
// its manifest `includes` row both carry the new id, with no second commit. The fixture drives the
// REAL saveAction/publishAction/renameAction, so the include directive and the manifest's `includes`
// row come from the engine's own extractIncludes/manifestEntryFromFile, never a hand-written entry.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { GithubDouble } from '../unit/_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { parseManifest } from '../../lib/content/manifest.js';
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

function renameEvent(concept: string, id: string, slug: string) {
  return contentEvent({
    url: `https://t.example/admin/${concept}/${id}`,
    params: { concept, id },
    form: { slug },
  });
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

/** Rename the target and either return the thrown redirect location or the fail() result. */
async function rename(
  routes: ReturnType<typeof createContentRoutes>,
  concept: string,
  id: string,
  slug: string,
): Promise<{ location?: string; status?: number; error?: string }> {
  try {
    const result = (await routes.renameAction(renameEvent(concept, id, slug) as never)) as unknown as {
      status: number;
      data: { error: string };
    };
    return { status: result.status, error: result.data.error };
  } catch (e) {
    const loc = (e as { location?: string }).location;
    if (typeof loc === 'string') return { location: loc };
    throw e;
  }
}

afterEach(() => vi.restoreAllMocks());

describe('renameAction: fragment rename repoints ::include directives (Task 5)', () => {
  it('rewrites a consuming entry body, re-upserts its manifest includes row, and moves the fragment', async () => {
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

    const callsBeforeRename = gh.calls.length;
    const out = await rename(routes, 'fragments', 'welcome', 'new-welcome');
    expect(out.location).toBe('/admin/fragments/new-welcome?renamed=1');

    // The fragment's own row moved: old path gone, new path holds the content.
    expect(gh.read('main', 'src/content/fragments/welcome.md')).toBeNull();
    expect(gh.read('main', 'src/content/fragments/new-welcome.md')).toContain('title: Welcome');

    // The consuming entry's body directive was rewritten to the new fragment id.
    const linkerRaw = gh.read('main', 'src/content/posts/2026-05-hi.md');
    expect(linkerRaw).toContain('::include{fragment="new-welcome"}');
    expect(linkerRaw).not.toContain('fragment="welcome"');

    // The consuming entry's manifest row was re-upserted, so its includes carries the new id.
    const committed = parseManifest(gh.read('main', MANIFEST_PATH)!);
    const linkerRow = committed.entries.find((e) => e.id === '2026-05-hi')!;
    expect(linkerRow.includes).toEqual(['new-welcome']);

    // One commit, not two: the moved fragment and its consuming entry's repointed body/manifest row
    // all land in the rename's single existing commit.
    const renameCalls = gh.calls.slice(callsBeforeRename);
    expect(renameCalls.filter((c) => c.method === 'POST' && c.url.endsWith('/git/commits')).length).toBe(1);
  });

  it('keeps today\'s 409 when the rename collides with an existing fragment id', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime());

    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'welcome', { title: 'Welcome', body: 'Hi there.' }) as never),
    );
    await redirectedTo(
      routes.publishAction(saveEvent('fragments', 'taken', { title: 'Taken', body: 'Already here.' }) as never),
    );

    const out = await rename(routes, 'fragments', 'welcome', 'taken');
    expect(out.status).toBe(409);
    expect(out.error).toMatch(/already exists/i);
    // No commit landed: both fragments still exist at their original paths.
    expect(gh.read('main', 'src/content/fragments/welcome.md')).toContain('title: Welcome');
    expect(gh.read('main', 'src/content/fragments/taken.md')).toContain('title: Taken');
  });
});
