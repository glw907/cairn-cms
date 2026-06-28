import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createCairnAdmin } from '../../lib/sveltekit/cairn-admin.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import { fieldset } from '../../lib/content/fieldset.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'Test Site',
    concepts: [
      { id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, permalink: '/posts/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [], validate: ok },
      { id: 'pages', label: 'Pages', singular: 'Pages', dir: 'src/content/pages', routing: { routable: true, dated: false, inFeeds: false }, permalink: '/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [], validate: ok },
    ],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
  };
}

// The dev double rides event.locals.backend; createCairnAdmin no longer takes a backend dep.
const backend = makeGithubBackend(REPO, async () => 'tok');
const deps = {};

/** A scriptable D1 stand-in: `first()` answers from the substring-keyed map, `run()` and
 *  `batch()` resolve and record, so the auth and editor store calls execute for real. */
function fakeD1(firstResults: Record<string, unknown> = {}) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      const stmt = {
        sql,
        args: [] as unknown[],
        bind(...args: unknown[]) {
          stmt.args = args;
          return stmt;
        },
        async first() {
          calls.push({ sql, args: stmt.args });
          const key = Object.keys(firstResults).find((k) => sql.includes(k));
          return key ? firstResults[key] : null;
        },
        async run() {
          calls.push({ sql, args: stmt.args });
          return { meta: { changes: 1 } };
        },
        async all() {
          calls.push({ sql, args: stmt.args });
          return { results: [] };
        },
      };
      return stmt;
    },
    async batch(stmts: { sql: string; args: unknown[] }[]) {
      for (const s of stmts) calls.push({ sql: s.sql, args: s.args });
      return [];
    },
  };
  return { db, calls };
}

/** Build the catch-all POST event an action receives. Cookie writes are recorded for the
 *  auth assertions; the form rides a real Request body so formData() reads it. */
function actionEvent(
  pathname: string,
  opts: {
    form?: Record<string, string>;
    editor?: { email: string; displayName: string; role: 'owner' | 'editor' } | null;
    env?: Record<string, unknown>;
    cookies?: Record<string, string>;
  } = {},
) {
  const cookieSets: { name: string; value: string }[] = [];
  const cookieDeletes: string[] = [];
  return {
    url: new URL(`https://t.example${pathname}`),
    request: new Request(`https://t.example${pathname}`, { method: 'POST', body: new URLSearchParams(opts.form ?? {}) }),
    locals: { editor: opts.editor === undefined ? { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } : opts.editor, backend },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x', ...opts.env } },
    cookies: {
      get: (name: string) => opts.cookies?.[name],
      set: (name: string, value: string) => cookieSets.push({ name, value }),
      delete: (name: string) => cookieDeletes.push(name),
    },
    setHeaders: () => {},
    _cookieSets: cookieSets,
    _cookieDeletes: cookieDeletes,
  };
}

async function expectRedirect(promise: Promise<unknown>, location: string) {
  try {
    await promise;
    throw new Error('should have redirected');
  } catch (e) {
    expect(e).toMatchObject({ status: 303, location });
  }
}

afterEach(() => vi.restoreAllMocks());

describe('path validation', () => {
  it('404s save posted to a list path', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.actions.save(actionEvent('/admin/posts') as never)).rejects.toMatchObject({ status: 404 });
  });

  it('404s create posted to an edit path', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.actions.create(actionEvent('/admin/posts/2026-05-01-hi') as never)).rejects.toMatchObject({ status: 404 });
  });

  it('404s publishAll posted to the login path', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.actions.publishAll(actionEvent('/admin/login') as never)).rejects.toMatchObject({ status: 404 });
  });

  it('404s request posted to a non-login path', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.actions.request(actionEvent('/admin/posts') as never)).rejects.toMatchObject({ status: 404 });
  });

  it('404s logout posted to a path the parser refuses', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.actions.logout(actionEvent('/admin/bogus') as never)).rejects.toMatchObject({ status: 404 });
  });

  // The Help screen is an authed non-desk route, so the topbar's Publish-site button (publishAll)
  // and the sidebar's Sign-out form (logout) both render and post to /admin/help. Neither may 404
  // from the view gate, which means 'help' must sit in both the authedViews and anyView allow-lists.
  it('publishAll posted from the help path does not 404 (it reaches the action and redirects)', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/2026-05-01-hi': { 'src/content/posts/2026-05-01-hi.md': '---\ntitle: Hi\ndate: 2026-05-01\n---\nbody' },
    });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/help', { editor: { email: 'own@t', displayName: 'Own', role: 'owner' } });
    await expectRedirect(admin.actions.publishAll(event as never), '/admin/posts?publishedAll=1');
  });

  it('logout posted from the help path does not 404 (it reaches the action and redirects)', async () => {
    const { db } = fakeD1();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/help', {
      env: { AUTH_DB: db },
      cookies: { '__Host-cairn_session': 'sid' },
    });
    await expectRedirect(admin.actions.logout(event as never), '/admin/login');
  });
});

describe('auth actions', () => {
  it('request delegates on the login view and answers neutrally for an unknown email', async () => {
    const { db } = fakeD1();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/login', {
      editor: null,
      form: { email: 'who@t' },
      env: { PUBLIC_ORIGIN: 'https://t.example', AUTH_DB: db },
    });
    await expect(admin.actions.request(event as never)).resolves.toEqual({ status: 'sent', sent: true });
  });

  it('confirm delegates on the confirm view: consumes the token, sets the session cookie, redirects', async () => {
    const { db } = fakeD1({ 'DELETE FROM magic_token': { email: 'ed@t' } });
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/auth/confirm', { editor: null, form: { token: 'tok' }, env: { AUTH_DB: db } });
    await expectRedirect(admin.actions.confirm(event as never), '/admin');
    expect(event._cookieSets).toEqual([expect.objectContaining({ name: '__Host-cairn_session' })]);
  });

  it('logout works from any parsed view: clears the session cookie and redirects to login', async () => {
    const { db, calls } = fakeD1();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/posts', {
      env: { AUTH_DB: db },
      cookies: { '__Host-cairn_session': 'sid' },
    });
    await expectRedirect(admin.actions.logout(event as never), '/admin/login');
    expect(calls.some((c) => c.sql.includes('DELETE FROM session') && c.args[0] === 'sid')).toBe(true);
    expect(event._cookieDeletes).toEqual(['__Host-cairn_session']);
  });
});

describe('content actions', () => {
  const raw = '---\ntitle: Hi\ndate: 2026-05-01\n---\nbody';

  it('create delegates on the list view with the concept synthesized from the URL', async () => {
    new GithubDouble({ main: {} }).install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/posts', { form: { slug: 'hello', date: '2026-06-11' } });
    await expectRedirect(admin.actions.create(event as never), '/admin/posts/2026-06-11-hello?new=1');
  });

  it('save delegates on the edit view: commits to the pending branch and redirects saved', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/posts/2026-05-01-hi', { form: { title: 'Hi', body: 'body' } });
    await expectRedirect(admin.actions.save(event as never), '/admin/posts/2026-05-01-hi?saved=1');
    expect(gh.read('cairn/posts/2026-05-01-hi', 'src/content/posts/2026-05-01-hi.md')).toContain('body');
    expect(gh.read('main', 'src/content/posts/2026-05-01-hi.md')).toBeNull();
  });

  it('publish delegates on the edit view: lands the entry on main and redirects published', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/posts/2026-05-01-hi', { form: { title: 'Hi', body: 'body' } });
    await expectRedirect(admin.actions.publish(event as never), '/admin/posts/2026-05-01-hi?published=1');
    expect(gh.read('main', 'src/content/posts/2026-05-01-hi.md')).toContain('body');
    expect(gh.branches.has('cairn/posts/2026-05-01-hi')).toBe(false);
  });

  it('discard delegates on the edit view: drops the branch and redirects discarded', async () => {
    const gh = new GithubDouble({
      main: { 'src/content/posts/2026-05-01-hi.md': raw },
      'cairn/posts/2026-05-01-hi': { 'src/content/posts/2026-05-01-hi.md': raw + ' edited' },
    });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/posts/2026-05-01-hi');
    await expectRedirect(admin.actions.discard(event as never), '/admin/posts/2026-05-01-hi?discarded=1');
    expect(gh.branches.has('cairn/posts/2026-05-01-hi')).toBe(false);
  });

  it('rename delegates on the edit view: moves the file and redirects to the new id', async () => {
    const gh = new GithubDouble({ main: { 'src/content/posts/2026-05-01-hi.md': raw } });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/posts/2026-05-01-hi', { form: { slug: 'bye' } });
    await expectRedirect(admin.actions.rename(event as never), '/admin/posts/2026-05-01-bye?renamed=1');
    expect(gh.read('main', 'src/content/posts/2026-05-01-bye.md')).toContain('title: Hi');
    expect(gh.read('main', 'src/content/posts/2026-05-01-hi.md')).toBeNull();
  });

  it('delete on the edit view takes the id from the path', async () => {
    const gh = new GithubDouble({ main: { 'src/content/posts/2026-05-01-hi.md': raw } });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/posts/2026-05-01-hi');
    await expectRedirect(admin.actions.delete(event as never), '/admin/posts');
    expect(gh.read('main', 'src/content/posts/2026-05-01-hi.md')).toBeNull();
  });

  it('delete on the list view takes the id from the form body', async () => {
    const gh = new GithubDouble({ main: { 'src/content/posts/2026-05-01-hi.md': raw } });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/posts', { form: { id: '2026-05-01-hi' } });
    await expectRedirect(admin.actions.delete(event as never), '/admin/posts');
    expect(gh.read('main', 'src/content/posts/2026-05-01-hi.md')).toBeNull();
  });

  it('publishAll delegates from any authed view, here the editors page', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/2026-05-01-hi': { 'src/content/posts/2026-05-01-hi.md': raw },
    });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/editors', { editor: { email: 'own@t', displayName: 'Own', role: 'owner' } });
    await expectRedirect(admin.actions.publishAll(event as never), '/admin/posts?publishedAll=1');
    expect(gh.read('main', 'src/content/posts/2026-05-01-hi.md')).toBe(raw);
  });

  // Gap closer (Task 16): createCairnAdmin must forward `deps.anthropic` to the content routes so the
  // tidy action calls the injected client, not the real SDK. The tidy action reads the CSRF header, the
  // ANTHROPIC_API_KEY from platform.env, and `runtime.tidy.enabled`, so a forwarded factory that is
  // invoked proves the dep crossed the composition boundary.
  it('forwards deps.anthropic to the tidy action', async () => {
    const create = vi.fn(async () => ({
      content: [{ type: 'text' as const, text: 'the trail' }],
      model: 'claude-test',
      stop_reason: 'end_turn' as const,
      usage: { input_tokens: 3, output_tokens: 3 },
    }));
    const anthropic = vi.fn(() => ({ messages: { create } }));
    const tidyRuntime = { ...runtime(), tidy: { enabled: true, model: 'claude-test', conventions: {} } } as CairnRuntime;
    const admin = createCairnAdmin(tidyRuntime, { ...deps, anthropic });

    // A CSRF-valid raw POST: the token rides the X-Cairn-CSRF header and the __Host-cairn_csrf cookie.
    const csrf = 'csrf-token-value-0123456789abcdef';
    const url = new URL('https://t.example/admin/posts/2026-05-01-hi');
    const event = {
      url,
      request: new Request(url, {
        method: 'POST',
        body: JSON.stringify({ text: 'teh trail', scope: 'document' }),
        headers: { 'content-type': 'text/plain', 'x-cairn-csrf': csrf },
      }),
      locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
      platform: { env: { ANTHROPIC_API_KEY: 'sk-test-key' } },
      cookies: {
        get: (name: string) => (name === '__Host-cairn_csrf' ? csrf : undefined),
        set: () => {},
        delete: () => {},
      },
      setHeaders: () => {},
    };

    const res = (await admin.actions.tidy(event as never)) as { corrected?: string };
    expect(anthropic).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(res.corrected).toBe('the trail');
  });
});

describe('media view load', () => {
  it('returns the layout plus the media library data', async () => {
    new GithubDouble({ main: {} }).install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/media');
    const data = (await admin.load({ ...event, setHeaders: () => {} } as never)) as {
      view: string;
      layout: unknown;
      page: { assets: unknown[]; usage: Record<string, unknown>; error: string | null };
    };
    expect(data.view).toBe('media');
    expect(data.layout).toBeDefined();
    expect(Array.isArray(data.page.assets)).toBe(true);
    expect(data.page.usage).toEqual({});
  });

  it('lets publishAll post from the media view', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/2026-05-01-hi': { 'src/content/posts/2026-05-01-hi.md': '---\ntitle: Hi\ndate: 2026-05-01\n---\nbody' },
    });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/media');
    await expectRedirect(admin.actions.publishAll(event as never), '/admin/posts?publishedAll=1');
  });
});

describe('media replace and alt actions (composer wiring)', () => {
  const mediaActions = ['mediaUpload', 'mediaReplacePreview', 'mediaReplace', 'mediaAltPreview', 'mediaAltPropagate'] as const;

  for (const name of mediaActions) {
    it(`404s ${name} posted outside the media view`, async () => {
      const admin = createCairnAdmin(runtime(), deps);
      await expect(admin.actions[name](actionEvent('/admin/posts') as never)).rejects.toMatchObject({ status: 404 });
    });
  }

  it('mediaUpload on the media view reaches uploadAction (refused 503 when media is off)', async () => {
    new GithubDouble({ main: {} }).install();
    const admin = createCairnAdmin(runtime(), deps);
    const result = await admin.actions.mediaUpload(actionEvent('/admin/media') as never);
    expect(result).toMatchObject({ status: 503 });
  });

  it('mediaReplace on the media view reaches the apply (400 on a missing hash)', async () => {
    new GithubDouble({ main: {} }).install();
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.actions.mediaReplace(actionEvent('/admin/media') as never)).rejects.toMatchObject({ status: 400 });
  });

  it('mediaReplacePreview on the media view reaches the preview (403 without the CSRF header)', async () => {
    new GithubDouble({ main: {} }).install();
    const admin = createCairnAdmin(runtime(), deps);
    const result = await admin.actions.mediaReplacePreview(actionEvent('/admin/media') as never);
    expect(result).toMatchObject({ status: 403 });
  });

  it('mediaAltPropagate on the media view reaches the apply (400 on a missing hash)', async () => {
    new GithubDouble({ main: {} }).install();
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.actions.mediaAltPropagate(actionEvent('/admin/media') as never)).rejects.toMatchObject({ status: 400 });
  });
});

describe('addDictionaryWord action (composer wiring)', () => {
  it('404s addDictionaryWord posted outside the edit view', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.actions.addDictionaryWord(actionEvent('/admin/posts') as never)).rejects.toMatchObject({ status: 404 });
  });

  it('reaches the content action on the edit view (403 without the CSRF header)', async () => {
    new GithubDouble({ main: {} }).install();
    const admin = createCairnAdmin(runtime(), deps);
    // The composer's actionEvent posts no X-Cairn-CSRF header, so the content action refuses with a
    // 403 csrf envelope: proof the route parsed the edit view and reached addDictionaryWord.
    const result = await admin.actions.addDictionaryWord(actionEvent('/admin/posts/2026-05-01-hi') as never);
    expect(result).toMatchObject({ status: 403 });
  });
});

describe('media bulk-delete, orphan-scan, and purge actions (composer wiring)', () => {
  const newMediaActions = ['mediaBulkDelete', 'mediaOrphanScan', 'mediaPurge'] as const;

  for (const name of newMediaActions) {
    it(`404s ${name} posted outside the media view`, async () => {
      const admin = createCairnAdmin(runtime(), deps);
      await expect(admin.actions[name](actionEvent('/admin/posts') as never)).rejects.toMatchObject({ status: 404 });
    });
  }

  it('mediaBulkDelete on the media view reaches the content action (refused 503 when media is off)', async () => {
    new GithubDouble({ main: {} }).install();
    const admin = createCairnAdmin(runtime(), deps);
    const result = await admin.actions.mediaBulkDelete(actionEvent('/admin/media') as never);
    expect(result).toMatchObject({ status: 503 });
  });

  it('mediaOrphanScan on the media view reaches the content action (refused 503 when media is off)', async () => {
    new GithubDouble({ main: {} }).install();
    const admin = createCairnAdmin(runtime(), deps);
    const result = await admin.actions.mediaOrphanScan(actionEvent('/admin/media') as never);
    expect(result).toMatchObject({ status: 503 });
  });

  it('mediaPurge on the media view reaches mediaPurgeOrphans (refused 503 when media is off)', async () => {
    new GithubDouble({ main: {} }).install();
    const admin = createCairnAdmin(runtime(), deps);
    const result = await admin.actions.mediaPurge(actionEvent('/admin/media') as never);
    expect(result).toMatchObject({ status: 503 });
  });
});

describe('save on the nav view', () => {
  it('delegates to navSave when a navMenu is configured', async () => {
    // navSave is a head-guarded atomic commit, so the stateful double seeds main with the YAML and
    // answers the ref read, the head-guarded commit sequence, and the write.
    const gh = new GithubDouble({ main: { 'src/lib/site.config.yaml': 'siteName: S\nmenus:\n  primary: []\n' } });
    gh.install();
    const rt = runtime();
    rt.navMenu = { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 };
    const admin = createCairnAdmin(rt, deps);
    const event = actionEvent('/admin/nav', { form: { tree: JSON.stringify([{ label: 'Home', url: '/' }]) } });
    await expectRedirect(admin.actions.save(event as never), '/admin/nav?saved=1');
  });

  it('404s when the runtime configures no navMenu', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/nav', { form: { tree: '[]' } });
    await expect(admin.actions.save(event as never)).rejects.toMatchObject({ status: 404 });
  });
});

describe('editor actions', () => {
  const owner = { email: 'own@t', displayName: 'Own', role: 'owner' as const };

  it('addEditor delegates on the editors view and inserts the row', async () => {
    const { db, calls } = fakeD1();
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/editors', {
      editor: owner,
      form: { email: 'new@x.dev', name: 'New', role: 'editor' },
      env: { AUTH_DB: db },
    });
    await expect(admin.actions.addEditor(event as never)).resolves.toEqual({ ok: true });
    expect(calls.some((c) => c.sql.includes('INSERT INTO editor') && c.args[0] === 'new@x.dev')).toBe(true);
  });

  it('removeEditor delegates on the editors view and deletes the row', async () => {
    const { db, calls } = fakeD1({ 'FROM editor': { email: 'gone@t', display_name: 'Gone', role: 'editor' } });
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/editors', { editor: owner, form: { email: 'gone@t' }, env: { AUTH_DB: db } });
    await expect(admin.actions.removeEditor(event as never)).resolves.toEqual({ ok: true });
    expect(calls.some((c) => c.sql.includes('DELETE FROM editor') && c.args[0] === 'gone@t')).toBe(true);
  });

  it('setRole delegates on the editors view and updates the role', async () => {
    const { db, calls } = fakeD1({ 'FROM editor': { email: 'up@t', display_name: 'Up', role: 'editor' } });
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/editors', { editor: owner, form: { email: 'up@t', role: 'owner' }, env: { AUTH_DB: db } });
    await expect(admin.actions.setRole(event as never)).resolves.toEqual({ ok: true });
    expect(calls.some((c) => c.sql.includes('UPDATE editor SET role') && c.args[0] === 'owner' && c.args[1] === 'up@t')).toBe(true);
  });
});

describe('settings view (Task 15)', () => {
  /** A runtime with tidy enabled, so the settings save reaches the commit gate rather than the
   *  tidy-off 404. The nav menu carries the config path the save reads and commits. */
  function tidyRuntime(): CairnRuntime {
    return {
      ...runtime(),
      navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Nav', maxDepth: 2 },
      tidy: { enabled: true, model: 'claude-sonnet-4-6' },
    };
  }

  it('404s saveSettings posted outside the settings view (the viewAction gate)', async () => {
    const admin = createCairnAdmin(tidyRuntime(), deps);
    await expect(admin.actions.saveSettings(actionEvent('/admin/posts') as never)).rejects.toMatchObject({ status: 404 });
  });

  it('saveSettings on the settings view reaches settingsSave (commits the conventions, redirects saved)', async () => {
    // settingsSave is a head-guarded atomic commit, so the stateful double seeds main with the YAML
    // and answers the ref read, the head-guarded commit sequence, and the write.
    new GithubDouble({ main: { 'src/lib/site.config.yaml': 'siteName: S\ntidy:\n  enabled: true\n' } }).install();
    const admin = createCairnAdmin(tidyRuntime(), deps);
    const event = actionEvent('/admin/settings', { form: { conventions: '{"fixes":true,"oxfordComma":"always"}' } });
    await expectRedirect(admin.actions.saveSettings(event as never), '/admin/settings?saved=1');
  });

  it('saveSettings 404s when tidy is off, proving it reached settingsSave (the server half of the gate)', async () => {
    // The default runtime has no tidy block, so the action 404s before any read.
    const admin = createCairnAdmin(runtime(), deps);
    const event = actionEvent('/admin/settings', { form: { conventions: '{"fixes":true}' } });
    await expect(admin.actions.saveSettings(event as never)).rejects.toMatchObject({ status: 404 });
  });

  it('serves the settings view load: the layout plus the read-only developer facts', async () => {
    new GithubDouble({ main: {} }).install();
    const admin = createCairnAdmin(tidyRuntime(), deps);
    const event = actionEvent('/admin/settings', { env: { ANTHROPIC_API_KEY: 'sk-test' } });
    const data = (await admin.load({ ...event, setHeaders: () => {} } as never)) as {
      view: string;
      page: { enabled: boolean; tidyEnabled: boolean; keyConfigured: boolean; modelLabel: string };
    };
    expect(data.view).toBe('settings');
    expect(data.page.enabled).toBe(true);
    expect(data.page.keyConfigured).toBe(true);
    expect(data.page.modelLabel).toBe('Claude Sonnet');
  });
});
