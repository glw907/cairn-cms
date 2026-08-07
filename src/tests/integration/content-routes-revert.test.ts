// cairn-cms: Task 5 (history and revert plan). revertAction reuses saveToBranch's own commit
// pipeline (readFile at a target ref, createBranch, commit), so this drives it against the REAL
// GithubDouble the way content-routes-publish.test.ts drives publishAction/discardAction, rather
// than a hand-built Backend fake: the acceptance criteria (a full revert-then-publish round trip,
// a createBranch collision under a simulated race, the log fields) all depend on the real
// commit/createBranch/listCommits call shapes landing through the same stateful double.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from '../unit/_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import { runtime as baseRuntime, postsConcept, contentEvent, expectRedirect, expectHttpError } from '../unit/_content-harness.js';
import type { CairnRuntime, NamedField } from '../../lib/content/types.js';
import type { RevertFailure } from '../../lib/sveltekit/types.js';

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const ID = '2026-05-01-hi';
const ENTRY_PATH = `src/content/posts/${ID}.md`;
const BRANCH = `cairn/posts/${ID}`;

const TITLE_FIELD: NamedField = { type: 'text', name: 'title', label: 'Title', required: true };

/** A posts runtime whose validate echoes the decoded frontmatter, so each publish's title/body is
 *  the posted one rather than a fixture constant (revert needs two distinguishable versions). */
function echoRuntime(opts: { fields?: NamedField[]; vocabulary?: { value: string; label: string }[] } = {}): CairnRuntime {
  return baseRuntime({
    concepts: [postsConcept({ fields: opts.fields ?? [TITLE_FIELD], validate: (fm) => ({ ok: true, data: fm }) })],
    manifestPath: MANIFEST_PATH,
    vocabulary: opts.vocabulary ?? [],
  });
}

const OTHER_EDITOR = { email: 'other@t', displayName: 'Other Editor', role: 'editor' as const, capability: 'editor' as const };

function actionEvent(id: string, form: Record<string, string> = {}) {
  return contentEvent({ url: `https://t.example/admin/posts/${id}`, params: { concept: 'posts', id }, form });
}

function actionEventAs(editor: typeof OTHER_EDITOR, id: string, form: Record<string, string>) {
  return contentEvent({ url: `https://t.example/admin/posts/${id}`, params: { concept: 'posts', id }, form, editor });
}

function historyEvent(id: string) {
  return contentEvent({ url: `https://t.example/admin/posts/${id}/history`, params: { concept: 'posts', id } });
}

function revertEvent(id: string, form: { ref: string; head: string }) {
  return contentEvent({ url: `https://t.example/admin/posts/${id}/history`, params: { concept: 'posts', id }, form });
}

/** GET the edit screen at a revert redirect's own location, so a test can read back what
 *  editLoad rehydrates from the query string it carries. */
function editEventAt(id: string, location: string) {
  return contentEvent({ url: `https://t.example${location}`, params: { concept: 'posts', id } });
}

/** Stub fetch so, right before the real POST /git/refs for `branch` lands, another editor's full
 *  save (branch create plus a tracked commit) has already landed on it: the pre-check reads null
 *  (it ran first), and createBranch's own POST then collides for real, the race
 *  `createBranch`'s typed `BranchExistsError` is the authoritative refusal for. */
function injectDraftDuringBranchCreate(
  gh: GithubDouble,
  branch: string,
  path: string,
  draft: { content: string; author: { name: string; email: string } },
): void {
  const double = globalThis.fetch;
  let injected = false;
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (!injected && method === 'POST' && /\/git\/refs$/.test(new URL(url).pathname)) {
      const raw = init?.body;
      const parsed = typeof raw === 'string' && raw ? (JSON.parse(raw) as { ref?: string }) : undefined;
      if (String(parsed?.ref ?? '').endsWith(branch)) {
        injected = true;
        gh.createBranch(branch, 'main');
        gh.commit(branch, path, draft.content);
        gh.history.push({
          branch,
          sha: gh.headSha(branch),
          paths: [path],
          author: draft.author,
          date: '2026-02-01T00:00:00.000Z',
          contentByPath: { [path]: draft.content },
        });
      }
    }
    return double(input, init);
  });
}

/** Stub fetch so a publish of an unrelated entry lands on main right between revertAction's own
 *  staleness read of main's head (step 2) and `createBranch`'s internal re-read of that same ref
 *  (several round trips later): the second GET for main's head is the one createBranch makes, so
 *  landing the publish just before it resolves exercises the exact window the false-conflict bug
 *  occupied. */
function injectPublishDuringCreateBranchReread(gh: GithubDouble): void {
  const double = globalThis.fetch;
  let mainHeadReads = 0;
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (method === 'GET' && /\/git\/ref\/heads\/main$/.test(new URL(url).pathname)) {
      mainHeadReads++;
      if (mainHeadReads === 2) gh.commit('main', 'src/content/posts/unrelated.md', 'an unrelated publish');
    }
    return double(input, init);
  });
}

/** Stub fetch so the revert commit's own tree-create call fails with a plain 500, an unexpected
 *  non-conflict failure rather than a lost-head race, right after `createBranch` has landed for
 *  `branch`. Exercises the best-effort branch cleanup on a non-conflict commit failure. */
function injectNonConflictCommitFailure(gh: GithubDouble, branch: string): void {
  const double = globalThis.fetch;
  let branchCreated = false;
  let failed = false;
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const pathname = new URL(url).pathname;
    if (!branchCreated && method === 'POST' && /\/git\/refs$/.test(pathname)) {
      const raw = init?.body;
      const parsed = typeof raw === 'string' && raw ? (JSON.parse(raw) as { ref?: string }) : undefined;
      if (String(parsed?.ref ?? '').endsWith(branch)) branchCreated = true;
      return double(input, init);
    }
    if (branchCreated && !failed && method === 'POST' && /\/git\/trees$/.test(pathname)) {
      failed = true;
      return new Response('Internal Server Error', { status: 500 });
    }
    return double(input, init);
  });
}

afterEach(() => vi.restoreAllMocks());

describe('revertAction', () => {
  it('reverts to an earlier publish, and the existing publish path publishes the reverted content and deletes the branch', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(echoRuntime());

    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V1', body: 'version one' }) as never));
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V2', body: 'version two' }) as never));

    const history = await routes.historyLoad(historyEvent(ID) as never);
    expect(history.entries).toHaveLength(2);
    const v1Ref = history.entries[1].ref;

    const { location } = await expectRedirect(() =>
      routes.revertAction(revertEvent(ID, { ref: v1Ref, head: history.head! }) as never),
    );
    expect(location).toBe(`/admin/posts/${ID}?saved=1`);

    const branchContent = gh.read(BRANCH, ENTRY_PATH);
    expect(branchContent).toContain('title: V1');
    expect(branchContent).toContain('version one');

    // Publishing what the edit screen now shows (the reverted content) lands it on main and
    // consumes the branch, the same as any other publish.
    const published = await expectRedirect(() =>
      routes.publishAction(actionEvent(ID, { title: 'V1', body: 'version one' }) as never),
    );
    expect(published.location).toBe(`/admin/posts/${ID}?published=1`);
    expect(gh.read('main', ENTRY_PATH)).toContain('version one');
    expect(gh.branches.has(BRANCH)).toBe(false);
  });

  it('refuses with a populated RevertFailure when the fast pre-check finds an existing draft', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(echoRuntime());
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V1', body: 'version one' }) as never));
    const history = await routes.historyLoad(historyEvent(ID) as never);

    // Another editor already has an open draft on this entry.
    await expectRedirect(() =>
      routes.saveAction(actionEventAs(OTHER_EDITOR, ID, { title: 'Blocked', body: 'someone else' }) as never),
    );

    const result = (await routes.revertAction(
      revertEvent(ID, { ref: history.entries[0].ref, head: history.head! }) as never,
    )) as unknown as { status: number; data: RevertFailure };
    expect(result.status).toBe(409);
    expect(result.data).toMatchObject({ reason: 'draft_exists', draftEditor: 'Other Editor' });
    expect((result.data as { draftStartedAt: string }).draftStartedAt).toBeTruthy();
  });

  it('refuses with a populated RevertFailure when createBranch collides under a race the pre-check missed', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(echoRuntime());
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V1', body: 'version one' }) as never));
    const history = await routes.historyLoad(historyEvent(ID) as never);

    injectDraftDuringBranchCreate(gh, BRANCH, ENTRY_PATH, {
      content: '---\ntitle: Raced\n---\nraced content',
      author: { name: 'Racer', email: 'racer@t' },
    });

    const result = (await routes.revertAction(
      revertEvent(ID, { ref: history.entries[0].ref, head: history.head! }) as never,
    )) as unknown as { status: number; data: RevertFailure };
    expect(result.status).toBe(409);
    expect(result.data).toMatchObject({ reason: 'draft_exists', draftEditor: 'Racer' });
    expect((result.data as { draftStartedAt: string }).draftStartedAt).toBeTruthy();
  });

  it('does not falsely conflict when a publish lands between the staleness check and createBranch', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(echoRuntime());
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V1', body: 'version one' }) as never));
    const history = await routes.historyLoad(historyEvent(ID) as never);

    injectPublishDuringCreateBranchReread(gh);

    // createBranch's own internal re-read of main's head lands a moment after revertAction's own
    // staleness read, so createBranch actually creates the branch at a NEWER main head than the
    // one this request validated. That must not read back as a conflict: revertAction pins its
    // fail-closed commit to the sha createBranch itself returned, not the stale earlier read.
    const { location } = await expectRedirect(() =>
      routes.revertAction(revertEvent(ID, { ref: history.entries[0].ref, head: history.head! }) as never),
    );
    expect(location).toBe(`/admin/posts/${ID}?saved=1`);
    expect(gh.read(BRANCH, ENTRY_PATH)).toContain('title: V1');
  });

  it('best-effort deletes the branch it just created when the revert commit fails for a reason other than conflict', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(echoRuntime());
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V1', body: 'version one' }) as never));
    const history = await routes.historyLoad(historyEvent(ID) as never);

    injectNonConflictCommitFailure(gh, BRANCH);

    await expect(
      routes.revertAction(revertEvent(ID, { ref: history.entries[0].ref, head: history.head! }) as never),
    ).rejects.toThrow(/tree create failed/);

    // No orphaned pending branch survives an unexpected, non-conflict commit failure.
    expect(gh.branches.has(BRANCH)).toBe(false);
  });

  it('answers history_stale when main has moved since the history page rendered', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(echoRuntime());
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V1', body: 'version one' }) as never));
    const history = await routes.historyLoad(historyEvent(ID) as never);
    const staleHead = history.head!;

    // Someone else published since the history page rendered.
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V2', body: 'version two' }) as never));

    const result = (await routes.revertAction(
      revertEvent(ID, { ref: history.entries[0].ref, head: staleHead }) as never,
    )) as unknown as { status: number; data: RevertFailure };
    expect(result.status).toBe(409);
    expect(result.data).toEqual({ reason: 'history_stale' });
  });

  it('answers ref_unknown for a sha absent from the fresh history read', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(echoRuntime());
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V1', body: 'version one' }) as never));
    const history = await routes.historyLoad(historyEvent(ID) as never);

    const result = (await routes.revertAction(
      revertEvent(ID, { ref: 'sha-does-not-exist', head: history.head! }) as never,
    )) as unknown as { status: number; data: RevertFailure };
    expect(result.status).toBe(404);
    expect(result.data).toEqual({ reason: 'ref_unknown' });
  });

  it('refuses ref_unknown in place when the listed sha is a delete commit whose content no longer reads', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(echoRuntime());
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V1', body: 'version one' }) as never));

    // Delete removes the entry from main, but its own commit still touched the path, so a
    // fresh listCommits read keeps offering it as a version.
    await expectRedirect(() => routes.deleteAction(actionEvent(ID) as never));
    const deleteSha = gh.headSha('main');

    // Recreate the entry at the same id, the way an editor might after realizing the delete
    // was a mistake; the recreate commit is what makes the entry, and the earlier delete
    // commit, both visible in the same history window.
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V2', body: 'version two' }) as never));
    const history = await routes.historyLoad(historyEvent(ID) as never);
    expect(history.entries.some((e) => e.ref === deleteSha)).toBe(true);

    const result = (await routes.revertAction(
      revertEvent(ID, { ref: deleteSha, head: history.head! }) as never,
    )) as unknown as { status: number; data: RevertFailure };
    expect(result.status).toBe(404);
    expect(result.data).toEqual({ reason: 'ref_unknown' });
  });

  it('refuses an invalid entry id the same way every other entry action does', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(echoRuntime());
    await expectHttpError(() =>
      routes.revertAction(
        contentEvent({
          url: 'https://t.example/admin/posts/not-a-valid-id!!/history',
          params: { concept: 'posts', id: 'not-a-valid-id!!' },
          form: { ref: 'sha1', head: 'sha1' },
        }) as never,
      ),
    );
  });

  it('logs commit.reverted with the exact field set, alongside commit.succeeded for the branch commit', async () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(echoRuntime());
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V1', body: 'version one' }) as never));
    const history = await routes.historyLoad(historyEvent(ID) as never);
    const ref = history.entries[0].ref;

    await expectRedirect(() => routes.revertAction(revertEvent(ID, { ref, head: history.head! }) as never));

    const records = infoSpy.mock.calls.map((c) => c[0] as Record<string, unknown>);
    const succeededCount = records.filter((r) => r.event === 'commit.succeeded' && r.branch === BRANCH).length;
    // One from the initial publish's own branch commit, one from the revert's.
    expect(succeededCount).toBe(2);

    const reverted = records.find((r) => r.event === 'commit.reverted');
    expect(reverted).toEqual(
      expect.objectContaining({
        concept: 'posts',
        id: ID,
        editor: 'ed@t',
        ref,
        branchSha: gh.headSha(BRANCH),
      }),
    );
  });

  it('surfaces a schema-drift advisory when the reverted version carries a field the schema has since retired', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const v1Fields: NamedField[] = [TITLE_FIELD, { type: 'text', name: 'subtitle', label: 'Subtitle' }];
    const routesV1 = createContentRoutes(echoRuntime({ fields: v1Fields }));
    await expectRedirect(() =>
      routesV1.publishAction(actionEvent(ID, { title: 'V1', subtitle: 'Old subtitle', body: 'version one' }) as never),
    );

    // The schema evolves: `subtitle` is retired.
    const routesV2 = createContentRoutes(echoRuntime({ fields: [TITLE_FIELD] }));
    const history = await routesV2.historyLoad(historyEvent(ID) as never);
    const ref = history.entries[0].ref;

    const { location } = await expectRedirect(() =>
      routesV2.revertAction(revertEvent(ID, { ref, head: history.head! }) as never),
    );
    expect(location).toBe(`/admin/posts/${ID}?saved=1&revertRetiredFields=subtitle`);

    const editData = await routesV2.editLoad(editEventAt(ID, location) as never);
    const notice = editData.advisories.find((a) => a.kind === 'reverted-schema-drift');
    expect(notice?.message).toContain('subtitle');
  });

  it('names a retired vocabulary tag rather than silently laundering it back into the allowed set (vocabulary-union interaction)', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const taxField: NamedField = { type: 'multiselect', name: 'topics', label: 'Topics', taxonomy: true, creatable: true };
    const fields = [TITLE_FIELD, taxField];
    const routesV1 = createContentRoutes(
      echoRuntime({ fields, vocabulary: [{ value: 'alpha', label: 'Alpha' }, { value: 'legacy', label: 'Legacy' }] }),
    );
    const form = new URLSearchParams();
    form.append('title', 'V1');
    form.append('topics', 'alpha');
    form.append('topics', 'legacy');
    form.append('body', 'version one');
    await expectRedirect(() =>
      routesV1.publishAction(
        contentEvent({ url: `https://t.example/admin/posts/${ID}`, params: { concept: 'posts', id: ID }, form }) as never,
      ),
    );

    // The vocabulary narrows: `legacy` is retired, leaving only `alpha`.
    const routesV2 = createContentRoutes(echoRuntime({ fields, vocabulary: [{ value: 'alpha', label: 'Alpha' }] }));
    const history = await routesV2.historyLoad(historyEvent(ID) as never);
    const ref = history.entries[0].ref;

    const { location } = await expectRedirect(() =>
      routesV2.revertAction(revertEvent(ID, { ref, head: history.head! }) as never),
    );
    expect(location).toContain('revertRetiredTags=legacy');
    expect(location).not.toContain('revertRetiredFields');

    const editData = await routesV2.editLoad(editEventAt(ID, location) as never);
    const notice = editData.advisories.find((a) => a.kind === 'reverted-schema-drift');
    expect(notice?.message).toContain('legacy');
  });

  it('carries no advisory for description, a builtin frontmatter key the schema never declares', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(echoRuntime());
    const form = new URLSearchParams();
    form.append('title', 'V1');
    form.append('description', 'A hand-written excerpt');
    form.append('body', 'version one');
    await expectRedirect(() =>
      routes.publishAction(
        contentEvent({ url: `https://t.example/admin/posts/${ID}`, params: { concept: 'posts', id: ID }, form }) as never,
      ),
    );
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V2', body: 'version two' }) as never));
    const history = await routes.historyLoad(historyEvent(ID) as never);

    // Revert to the version that carries `description`, a builtin frontmatter key `manifestEntryFromFile`
    // and `summarize` both read directly rather than gating on a declared field: never "retired".
    const { location } = await expectRedirect(() =>
      routes.revertAction(revertEvent(ID, { ref: history.entries[1].ref, head: history.head! }) as never),
    );
    expect(location).toBe(`/admin/posts/${ID}?saved=1`);
  });

  it('carries no advisory query param on a plain revert with no schema drift', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(echoRuntime());
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V1', body: 'version one' }) as never));
    await expectRedirect(() => routes.publishAction(actionEvent(ID, { title: 'V2', body: 'version two' }) as never));
    const history = await routes.historyLoad(historyEvent(ID) as never);

    const { location } = await expectRedirect(() =>
      routes.revertAction(revertEvent(ID, { ref: history.entries[1].ref, head: history.head! }) as never),
    );
    expect(location).toBe(`/admin/posts/${ID}?saved=1`);
  });
});
