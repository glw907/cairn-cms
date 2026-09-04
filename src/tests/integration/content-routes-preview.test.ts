// cairn-cms: Task 2a (preview pass, spec part 3, "Public preview for a non-editor"):
// previewMint, the previewMint/previewRevoke actions, and the lifecycle cleanup wired into
// rename/discard/delete/list-delete. Publish deliberately leaves rows intact (the ended page needs
// them). Driven against the real GithubDouble the way content-routes-revert.test.ts and
// content-routes-publish.test.ts are, plus the real D1 AUTH_DB the workerd integration project
// provides, since previewMint and the actions under test write real rows.
import { env } from 'cloudflare:test';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { GithubDouble } from '../unit/_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { previewMint, previewRevoke } from '../../lib/sveltekit/preview.js';
import { findPreviewToken, insertPreviewToken } from '../../lib/auth/preview-store.js';
import { hashToken } from '../../lib/auth/crypto.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import { defineRoles } from '../../lib/auth/roles.js';
import { defineAccess } from '../../lib/auth/access.js';
import {
  runtime as baseRuntime,
  postsConcept,
  contentEvent,
  backend,
  expectRedirect,
  expectHttpError,
} from '../unit/_content-harness.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { Backend } from '../../lib/github/backend.js';
import type { ContentFormFailure } from '../../lib/sveltekit/content-routes.js';
import type { D1Database } from '@cloudflare/workers-types';

/** A minimal D1Database double whose every prepared statement's `run()` throws `message`, for
 *  proving clearPreviewTokens's two-tier catch against a non-benign D1 fault without corrupting
 *  the real harness database. */
function throwingDb(message: string): D1Database {
  return {
    prepare: () => ({
      bind: () => ({
        run: async () => {
          throw new Error(message);
        },
      }),
    }),
  } as unknown as D1Database;
}

const db = env.AUTH_DB;

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const ID = '2026-08-06-hello';
const ENTRY_PATH = `src/content/posts/${ID}.md`;
const BRANCH = `cairn/posts/${ID}`;
const ORIGIN = 'https://site.example';

function runtime(overrides: Partial<CairnRuntime> = {}): CairnRuntime {
  return baseRuntime({
    concepts: [
      postsConcept({
        fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
        validate: () => ({ ok: true, data: {} }),
      }),
    ],
    manifestPath: MANIFEST_PATH,
    ...overrides,
  });
}

/** A driven request for `id`, with the AUTH_DB and PUBLIC_ORIGIN env every action under test needs.
 *  The request's own host is deliberately a different origin than PUBLIC_ORIGIN, so a test that
 *  asserts the minted URL derives from config, not the host, has a real divergence to catch. */
function actionEvent(id: string, form: Record<string, string> = {}) {
  return contentEvent({
    url: `https://attacker.example/admin/posts/${id}`,
    params: { concept: 'posts', id },
    form,
    env: { AUTH_DB: db, PUBLIC_ORIGIN: ORIGIN },
  });
}

function seedToken(id: string, hash: string, editor = 'ed@t') {
  return insertPreviewToken(db, { concept: 'posts', entryId: id, editor, tokenHash: hash, expiresAt: Date.now() + 60_000 });
}

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM preview_tokens')]);
});

afterEach(() => vi.restoreAllMocks());

/** Every console record captured while `run` executes, the log-redaction test file's own idiom. */
async function records(run: () => Promise<unknown>): Promise<Record<string, unknown>[]> {
  const captured: Record<string, unknown>[] = [];
  const grab = (c: unknown[]) => captured.push(c[0] as Record<string, unknown>);
  vi.spyOn(console, 'log').mockImplementation((...c) => grab(c));
  vi.spyOn(console, 'warn').mockImplementation((...c) => grab(c));
  vi.spyOn(console, 'error').mockImplementation((...c) => grab(c));
  await run();
  return captured;
}

describe('previewMint', () => {
  const TARGET = { concept: 'posts', entryId: ID };
  const ROLES = defineRoles({ owner: 'owner', 'other-editor': 'editor', publisher: 'editor' });
  const DENY_POSTS = defineAccess(ROLES, { posts: ['publisher'] });

  /** A backend whose branchHead answers `head` and records every branch it was asked about, for
   *  proving the draft check never runs for a session the authorization sequence already refused. */
  function recordingBackend(reads: string[], head: string | null): Backend {
    return { ...backend, branchHead: async (branch: string) => (reads.push(branch), head) };
  }

  /** An event for a direct previewMint call. Deliberately OFF `/admin/[concept]/[id]` and carrying
   *  no route params at all: a target read from params rather than from the argument fails here,
   *  which is what keeps previewMint usable from a site's own workflow route. */
  function mintEvent(
    opts: { role?: string; capability?: 'owner' | 'editor' | 'none'; email?: string; eventBackend?: Backend } = {},
  ) {
    const { role = 'editor', capability = 'editor', email = `${role}@t`, eventBackend = backend } = opts;
    const url = 'https://site.example/queue/share';
    return {
      url: new URL(url),
      params: {},
      route: { id: '/queue/share' },
      request: new Request(url, { method: 'POST' }),
      locals: { cairnEditor: { email, displayName: role, role, capability }, cairnBackend: eventBackend },
      platform: { env: { AUTH_DB: db, PUBLIC_ORIGIN: ORIGIN } },
      cookies: { get: () => undefined, set: () => {}, delete: () => {} },
      setHeaders: () => {},
    };
  }

  /** A GithubDouble carrying the entry's pending branch, the draft a mint shares. */
  function ghWithDraft(): GithubDouble {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.createBranch(BRANCH, 'main');
    return gh;
  }

  it('mints for an authorized editor with a pending draft, defaulting to a seven-day TTL', async () => {
    ghWithDraft().install();
    const before = Date.now();
    const result = await previewMint(runtime(), {}, mintEvent() as never, TARGET);
    expect(result.outcome).toBe('minted');
    if (result.outcome !== 'minted') return;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(result.expiresAt).toBeGreaterThanOrEqual(before + sevenDays);
    expect(result.expiresAt).toBeLessThan(before + sevenDays + 5_000);
    expect(await findPreviewToken(db, await hashToken(result.token))).toEqual({
      concept: 'posts',
      entryId: ID,
      editor: 'editor@t',
      expiresAt: result.expiresAt,
    });
  });

  it('honors a configured ttlMs', async () => {
    ghWithDraft().install();
    const before = Date.now();
    const result = await previewMint(runtime(), { ttlMs: 60_000 }, mintEvent() as never, TARGET);
    if (result.outcome !== 'minted') throw new Error(`expected a mint, got ${result.outcome}`);
    expect(result.expiresAt).toBeGreaterThanOrEqual(before + 60_000);
    expect(result.expiresAt).toBeLessThan(before + 60_000 + 5_000);
  });

  it.each([
    ['non-finite', Number.POSITIVE_INFINITY],
    ['zero', 0],
    ['negative', -1],
    ['under one minute', 30_000],
    ['over thirty days', 31 * 24 * 60 * 60 * 1000],
  ])('rejects a %s ttlMs with a PreviewTokenConfig-prefixed error', async (_label, ttlMs) => {
    ghWithDraft().install();
    await expect(previewMint(runtime(), { ttlMs }, mintEvent() as never, TARGET)).rejects.toThrow(
      /^PreviewTokenConfig:/,
    );
  });

  it('stores the resolved session editor as the attribution, so the removal cascade always matches', async () => {
    ghWithDraft().install();
    const first = await previewMint(runtime(), {}, mintEvent({ email: 'alice@t' }) as never, TARGET);
    const second = await previewMint(runtime(), {}, mintEvent({ email: 'bob@t' }) as never, TARGET);
    if (first.outcome !== 'minted' || second.outcome !== 'minted') throw new Error('expected two mints');
    expect((await findPreviewToken(db, await hashToken(first.token)))?.editor).toBe('alice@t');
    expect((await findPreviewToken(db, await hashToken(second.token)))?.editor).toBe('bob@t');
  });

  it('refuses no-draft when the entry carries no pending branch', async () => {
    new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } }).install();
    const result = await previewMint(runtime(), {}, mintEvent() as never, TARGET);
    expect(result).toEqual({ outcome: 'no-draft' });
  });

  it('refuses an undeclared concept, and a malformed entry id, without minting', async () => {
    ghWithDraft().install();
    expect(await previewMint(runtime(), {}, mintEvent() as never, { concept: 'ghosts', entryId: ID })).toEqual({
      outcome: 'unknown-concept',
    });
    expect(await previewMint(runtime(), {}, mintEvent() as never, { concept: 'posts', entryId: '../etc' })).toEqual({
      outcome: 'invalid-id',
    });
  });

  it('refuses a none-capability session the same way the engine’s own actions do', async () => {
    ghWithDraft().install();
    const refusal = await expectHttpError(() =>
      previewMint(runtime(), {}, mintEvent({ role: 'reader', capability: 'none' }) as never, TARGET),
    );
    expect(refusal.status).toBe(403);
  });

  it('refuses an editor the access map denies', async () => {
    ghWithDraft().install();
    const refusal = await expectHttpError(() =>
      previewMint(runtime({ access: DENY_POSTS }), {}, mintEvent({ role: 'other-editor' }) as never, TARGET),
    );
    expect(refusal.status).toBe(403);
  });

  it('authorizes before it looks for the draft, so a refusal is never an entry-existence oracle', async () => {
    const withDraft: string[] = [];
    const withoutDraft: string[] = [];
    const denied = runtime({ access: DENY_POSTS });
    const refusals = [];
    for (const [reads, head] of [
      [withDraft, 'sha'],
      [withoutDraft, null],
    ] as const) {
      refusals.push(
        await expectHttpError(() =>
          previewMint(
            denied,
            {},
            mintEvent({ role: 'other-editor', eventBackend: recordingBackend(reads, head) }) as never,
            TARGET,
          ),
        ),
      );
    }
    expect(refusals[0]).toEqual(refusals[1]);
    // The draft check never ran for either, so the refusal cannot report whether a draft exists.
    expect(withDraft).toEqual([]);
    expect(withoutDraft).toEqual([]);
  });
});

describe('previewRevoke', () => {
  const TARGET = { concept: 'posts', entryId: ID };
  const ROLES = defineRoles({ owner: 'owner', 'other-editor': 'editor', publisher: 'editor' });
  const DENY_POSTS = defineAccess(ROLES, { posts: ['publisher'] });

  /** An event for a direct previewRevoke call, mirroring previewMint's own mintEvent: off
   *  `/admin/[concept]/[id]` and carrying no route params at all, so the target read from the
   *  argument rather than the route is what a site's own workflow route relies on. `db` defaults
   *  to the real harness AUTH_DB and is overridable to prove the authorization-before-delete
   *  ordering against a DB that would throw if ever reached. */
  function revokeEvent(
    opts: { role?: string; capability?: 'owner' | 'editor' | 'none'; email?: string; db?: D1Database } = {},
  ) {
    const { role = 'editor', capability = 'editor', email = `${role}@t`, db: authDb = db } = opts;
    const url = 'https://site.example/queue/revoke';
    return {
      url: new URL(url),
      params: {},
      route: { id: '/queue/revoke' },
      request: new Request(url, { method: 'POST' }),
      locals: { cairnEditor: { email, displayName: role, role, capability } },
      platform: { env: { AUTH_DB: authDb, PUBLIC_ORIGIN: ORIGIN } },
      cookies: { get: () => undefined, set: () => {}, delete: () => {} },
      setHeaders: () => {},
    };
  }

  it('revokes for an authorized editor, deleting every row for the entry and reporting the count', async () => {
    await seedToken(ID, 'hash-x1', 'ed@t');
    await seedToken(ID, 'hash-x2', 'other@t');
    const result = await previewRevoke(runtime(), revokeEvent() as never, TARGET);
    expect(result).toEqual({ outcome: 'revoked', count: 2 });
    expect(await findPreviewToken(db, 'hash-x1')).toBeNull();
    expect(await findPreviewToken(db, 'hash-x2')).toBeNull();
  });

  it('is idempotent: revoking with nothing minted succeeds with a count of zero', async () => {
    const result = await previewRevoke(runtime(), revokeEvent() as never, TARGET);
    expect(result).toEqual({ outcome: 'revoked', count: 0 });
  });

  it('refuses an undeclared concept, and a malformed entry id, without revoking', async () => {
    expect(await previewRevoke(runtime(), revokeEvent() as never, { concept: 'ghosts', entryId: ID })).toEqual({
      outcome: 'unknown-concept',
    });
    expect(await previewRevoke(runtime(), revokeEvent() as never, { concept: 'posts', entryId: '../etc' })).toEqual({
      outcome: 'invalid-id',
    });
  });

  it('refuses a none-capability session the same way the engine’s own actions do', async () => {
    const refusal = await expectHttpError(() =>
      previewRevoke(runtime(), revokeEvent({ role: 'reader', capability: 'none' }) as never, TARGET),
    );
    expect(refusal.status).toBe(403);
  });

  it('refuses an editor the access map denies', async () => {
    const refusal = await expectHttpError(() =>
      previewRevoke(runtime({ access: DENY_POSTS }), revokeEvent({ role: 'other-editor' }) as never, TARGET),
    );
    expect(refusal.status).toBe(403);
  });

  it('authorizes before it deletes, so a denied session never reaches AUTH_DB (the 4b lesson)', async () => {
    // A throwing AUTH_DB would surface as an uncaught Error, not an HttpError, if the delete ever
    // ran: the 403 alone proves requireEditor/requireEngineAccess short-circuited first.
    const refusal = await expectHttpError(() =>
      previewRevoke(
        runtime({ access: DENY_POSTS }),
        revokeEvent({ role: 'other-editor', db: throwingDb('boom') }) as never,
        TARGET,
      ),
    );
    expect(refusal.status).toBe(403);
  });

  it('logs preview.token.revoked from inside the function, with the right fields', async () => {
    await seedToken(ID, 'hash-x3');
    const captured = await records(() => previewRevoke(runtime(), revokeEvent() as never, TARGET));
    const record = captured.find((r) => r.event === 'preview.token.revoked');
    expect(record).toMatchObject({ concept: 'posts', id: ID, editor: 'editor@t', count: 1 });
  });
});

describe('previewMintAction', () => {
  function ghWithManifest(): GithubDouble {
    return new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
  }

  it('refuses on the page when the entry has no pending draft', async () => {
    ghWithManifest().install();
    const routes = createContentRoutes(runtime());
    const result = (await routes.previewMintAction(actionEvent(ID) as never)) as unknown as {
      status: number;
      data: ContentFormFailure;
    };
    expect(result.status).toBe(400);
    expect(result.data.error).toMatch(/no unpublished draft/i);
    // conventions pass, Task 5: previewMintAction now declares ActionFailure<ContentFormFailure>
    // (the flattened, all-optional type); this holds the key set a PreviewMintFailure carried.
    expect(Object.keys(result.data)).toEqual(['error']);
  });

  it('mints against the pending branch and returns the configured origin, never the request host', async () => {
    const gh = ghWithManifest();
    gh.createBranch(BRANCH, 'main');
    gh.install();
    const routes = createContentRoutes(runtime());
    const result = (await routes.previewMintAction(actionEvent(ID) as never)) as unknown as {
      url: string;
      expiresAt: number;
    };
    expect(result.url.startsWith(`${ORIGIN}/preview/`)).toBe(true);
    expect(result.url).not.toContain('attacker.example');
    const token = result.url.slice(`${ORIGIN}/preview/`.length);
    const hash = await hashToken(token);
    expect(await findPreviewToken(db, hash)).toEqual({
      concept: 'posts',
      entryId: ID,
      editor: 'ed@t',
      expiresAt: result.expiresAt,
    });
  });

  it('mints two independently valid rows for two calls (multi-reviewer sharing)', async () => {
    const gh = ghWithManifest();
    gh.createBranch(BRANCH, 'main');
    gh.install();
    const routes = createContentRoutes(runtime());
    const first = (await routes.previewMintAction(actionEvent(ID) as never)) as unknown as { url: string };
    const second = (await routes.previewMintAction(actionEvent(ID) as never)) as unknown as { url: string };
    expect(first.url).not.toBe(second.url);
    const hash1 = await hashToken(first.url.slice(`${ORIGIN}/preview/`.length));
    const hash2 = await hashToken(second.url.slice(`${ORIGIN}/preview/`.length));
    expect(await findPreviewToken(db, hash1)).not.toBeNull();
    expect(await findPreviewToken(db, hash2)).not.toBeNull();
  });

  it('sets cache-control: no-store on a successful mint', async () => {
    const gh = ghWithManifest();
    gh.createBranch(BRANCH, 'main');
    gh.install();
    const routes = createContentRoutes(runtime());
    const headers: Record<string, string>[] = [];
    const event = { ...actionEvent(ID), setHeaders: (h: Record<string, string>) => headers.push(h) };
    await routes.previewMintAction(event as never);
    expect(headers).toContainEqual({ 'cache-control': 'no-store' });
  });

  it('logs preview.token.minted with the right fields, and the token appears in no log record', async () => {
    const gh = ghWithManifest();
    gh.createBranch(BRANCH, 'main');
    gh.install();
    const routes = createContentRoutes(runtime());
    let url = '';
    const captured = await records(async () => {
      const result = (await routes.previewMintAction(actionEvent(ID) as never)) as unknown as {
        url: string;
        expiresAt: number;
      };
      url = result.url;
    });
    const token = url.slice(`${ORIGIN}/preview/`.length);
    const record = captured.find((r) => r.event === 'preview.token.minted');
    expect(record).toMatchObject({ concept: 'posts', id: ID, editor: 'ed@t' });
    expect(typeof record?.expiresAt).toBe('number');
    expect(JSON.stringify(captured)).not.toContain(token);
  });

  it('answers an actionable failure naming the migration when the table is missing', async () => {
    const gh = ghWithManifest();
    gh.createBranch(BRANCH, 'main');
    gh.install();
    const routes = createContentRoutes(runtime());
    await db.exec('DROP TABLE preview_tokens');
    try {
      const result = (await routes.previewMintAction(actionEvent(ID) as never)) as unknown as {
        status: number;
        data: ContentFormFailure;
      };
      expect(result.status).toBe(500);
      expect(result.data.error).toContain('migrations/0003_preview.sql');
    } finally {
      // D1's exec() splits on newlines and runs each as its own statement, so the DDL must be one
      // physical line.
      await db.exec(
        'CREATE TABLE preview_tokens (token_hash TEXT PRIMARY KEY, concept TEXT NOT NULL, entry_id TEXT NOT NULL, editor TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)',
      );
    }
  });
});

describe('previewRevokeAction', () => {
  it('deletes every row for the entry and reports the count', async () => {
    await seedToken(ID, 'hash-a1', 'ed@t');
    await seedToken(ID, 'hash-a2', 'other@t');
    const routes = createContentRoutes(runtime());
    const result = (await routes.previewRevokeAction(actionEvent(ID) as never)) as unknown as { count: number };
    expect(result.count).toBe(2);
    expect(await findPreviewToken(db, 'hash-a1')).toBeNull();
    expect(await findPreviewToken(db, 'hash-a2')).toBeNull();
  });

  it('is idempotent: revoking with nothing minted succeeds with a count of zero', async () => {
    const routes = createContentRoutes(runtime());
    const result = (await routes.previewRevokeAction(actionEvent(ID) as never)) as unknown as { count: number };
    expect(result.count).toBe(0);
  });

  it('logs preview.token.revoked with the count', async () => {
    await seedToken(ID, 'hash-r1');
    const routes = createContentRoutes(runtime());
    const captured = await records(() => routes.previewRevokeAction(actionEvent(ID) as never));
    const record = captured.find((r) => r.event === 'preview.token.revoked');
    expect(record).toMatchObject({ concept: 'posts', id: ID, editor: 'ed@t', count: 1 });
  });

  it('answers the same actionable failure as mint when the table is missing (ships to every upgraded site)', async () => {
    const routes = createContentRoutes(runtime());
    await db.exec('DROP TABLE preview_tokens');
    try {
      const result = (await routes.previewRevokeAction(actionEvent(ID) as never)) as unknown as {
        status: number;
        data: ContentFormFailure;
      };
      expect(result.status).toBe(500);
      expect(result.data.error).toContain('migrations/0003_preview.sql');
      // conventions pass, Task 5: previewRevokeAction now declares ActionFailure<ContentFormFailure>
      // (the flattened, all-optional type); this holds the key set a PreviewMintFailure carried.
      expect(Object.keys(result.data)).toEqual(['error']);
    } finally {
      await db.exec(
        'CREATE TABLE preview_tokens (token_hash TEXT PRIMARY KEY, concept TEXT NOT NULL, entry_id TEXT NOT NULL, editor TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)',
      );
    }
  });
});

describe('clearPreviewTokens (two-tier failure handling, discardAction as the vehicle)', () => {
  function ghWithBranch(): GithubDouble {
    return new GithubDouble({ main: {}, [BRANCH]: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nbody' } });
  }

  it('a missing-table error is silent: no preview.cleanup_failed record, and the action still succeeds', async () => {
    ghWithBranch().install();
    const routes = createContentRoutes(runtime());
    const event = {
      ...actionEvent(ID),
      platform: { env: { AUTH_DB: throwingDb('no such table: preview_tokens'), PUBLIC_ORIGIN: ORIGIN } },
    };
    let location = '';
    const captured = await records(async () => {
      const result = await expectRedirect(() => routes.discardAction(event as never));
      location = result.location;
    });
    expect(location).toBe('/admin/posts');
    expect(captured.some((r) => r.event === 'preview.cleanup_failed')).toBe(false);
  });

  it('a non-benign D1 error logs preview.cleanup_failed, and the action still succeeds', async () => {
    ghWithBranch().install();
    const routes = createContentRoutes(runtime());
    const event = {
      ...actionEvent(ID),
      platform: { env: { AUTH_DB: throwingDb('D1_ERROR: disk I/O error'), PUBLIC_ORIGIN: ORIGIN } },
    };
    let location = '';
    const captured = await records(async () => {
      const result = await expectRedirect(() => routes.discardAction(event as never));
      location = result.location;
    });
    expect(location).toBe('/admin/posts');
    const record = captured.find((r) => r.event === 'preview.cleanup_failed');
    expect(record).toMatchObject({ concept: 'posts', id: ID });
    // The stringified throw rides `error`, the field its five siblings use; `reason` is reserved
    // for the snake_case enums the events header rules.
    expect(String(record?.error)).toContain('disk I/O error');
    expect(record).not.toHaveProperty('reason');
  });
});

describe('authorization: the view gate is not authorization (the round High)', () => {
  const ROLES = defineRoles({ owner: 'owner', 'other-editor': 'editor', publisher: 'editor' });
  const DENY_POSTS = defineAccess(ROLES, { posts: ['publisher'] });

  /** A manually-built event, bypassing contentEvent's role type (narrowed to owner/editor), so a
   *  none-capability session and an arbitrary role name are both reachable. */
  function eventAs(role: string, capability: 'owner' | 'editor' | 'none') {
    const url = `https://attacker.example/admin/posts/${ID}`;
    return {
      url: new URL(url),
      params: { concept: 'posts', id: ID },
      route: { id: '/admin/[...path]' },
      request: new Request(url, { method: 'POST' }),
      locals: { cairnEditor: { email: `${role}@t`, displayName: role, role, capability } },
      platform: { env: { AUTH_DB: db, PUBLIC_ORIGIN: ORIGIN } },
      cookies: { get: () => undefined, set: () => {}, delete: () => {} },
      setHeaders: () => {},
    };
  }

  it('refuses a none-capability session the same way saveAction does', async () => {
    const routes = createContentRoutes(runtime());
    expect((await expectHttpError(() => routes.previewMintAction(eventAs('reader', 'none') as never))).status).toBe(403);
    expect((await expectHttpError(() => routes.previewRevokeAction(eventAs('reader', 'none') as never))).status).toBe(403);
  });

  it('refuses an editor the access map denies', async () => {
    const routes = createContentRoutes(runtime({ access: DENY_POSTS }));
    expect(
      (await expectHttpError(() => routes.previewMintAction(eventAs('other-editor', 'editor') as never))).status,
    ).toBe(403);
    expect(
      (await expectHttpError(() => routes.previewRevokeAction(eventAs('other-editor', 'editor') as never))).status,
    ).toBe(403);
  });
});

describe('lifecycle cleanup', () => {
  const publishedManifest = serializeManifest({
    version: 1,
    entries: [{ id: ID, concept: 'posts', title: 'Hi', permalink: '/p/hi', draft: false, links: [] }],
  });

  it('discardAction clears the entry’s preview-token rows when the entry never published (the id frees for reuse)', async () => {
    await seedToken(ID, 'discard-hash');
    const gh = new GithubDouble({ main: {}, [BRANCH]: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nbody' } });
    gh.install();
    const routes = createContentRoutes(runtime());
    await expectRedirect(() => routes.discardAction(actionEvent(ID) as never));
    expect(await findPreviewToken(db, 'discard-hash')).toBeNull();
    // The redirect target is the concept list (the entry is gone entirely), which is what makes
    // clearing correct here and not for the live-entry case below: no page exists at this id for
    // the ended page to describe.
  });

  it('discardAction leaves the entry’s preview-token rows intact when discarding an edit of a LIVE entry (the ended page needs the row)', async () => {
    await seedToken(ID, 'discard-live-hash');
    // The entry's file already exists on main: discarding its pending edit removes only the draft,
    // never the published copy, so an outstanding preview link should still resolve, landing on
    // previewLoad's own branch-gone-but-main-exists "ended" page rather than a bare 404 that would
    // read as the link never having existed.
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nbody' },
      [BRANCH]: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nan edit' },
    });
    gh.install();
    const routes = createContentRoutes(runtime());
    await expectRedirect(() => routes.discardAction(actionEvent(ID) as never));
    expect(await findPreviewToken(db, 'discard-live-hash')).not.toBeNull();
  });

  it('deleteAction (the editor delete) clears the entry’s preview-token rows', async () => {
    await seedToken(ID, 'delete-hash');
    const gh = new GithubDouble({ main: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nbody', [MANIFEST_PATH]: publishedManifest } });
    gh.install();
    const routes = createContentRoutes(runtime());
    await expectRedirect(() => routes.deleteAction(actionEvent(ID) as never));
    expect(await findPreviewToken(db, 'delete-hash')).toBeNull();
  });

  it('listDeleteAction (the bypass path) also clears the entry’s preview-token rows', async () => {
    await seedToken(ID, 'list-delete-hash');
    const gh = new GithubDouble({ main: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nbody', [MANIFEST_PATH]: publishedManifest } });
    gh.install();
    const routes = createContentRoutes(runtime());
    const event = contentEvent({
      url: 'https://t.example/admin/posts',
      params: { concept: 'posts' },
      form: { id: ID },
      env: { AUTH_DB: db, PUBLIC_ORIGIN: ORIGIN },
    });
    await expectRedirect(() => routes.listDeleteAction(event as never));
    expect(await findPreviewToken(db, 'list-delete-hash')).toBeNull();
  });

  it('renameAction clears the OLD id’s preview-token rows', async () => {
    await seedToken(ID, 'rename-hash');
    const gh = new GithubDouble({ main: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nbody', [MANIFEST_PATH]: publishedManifest } });
    gh.install();
    const routes = createContentRoutes(runtime());
    const event = contentEvent({
      url: `https://t.example/admin/posts/${ID}`,
      params: { concept: 'posts', id: ID },
      form: { slug: 'new-slug' },
      env: { AUTH_DB: db, PUBLIC_ORIGIN: ORIGIN },
    });
    await expectRedirect(() => routes.renameAction(event as never));
    expect(await findPreviewToken(db, 'rename-hash')).toBeNull();
  });

  it('publishAction leaves the entry’s preview-token rows intact (the ended page needs them)', async () => {
    await seedToken(ID, 'publish-hash');
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) },
      [BRANCH]: { [ENTRY_PATH]: '---\ntitle: Hi\ndate: 2026-08-06\n---\npending body' },
    });
    gh.install();
    const routes = createContentRoutes(runtime());
    await expectRedirect(() =>
      routes.publishAction(actionEvent(ID, { title: 'Hi', body: 'pending body' }) as never),
    );
    expect(await findPreviewToken(db, 'publish-hash')).not.toBeNull();
  });
});
