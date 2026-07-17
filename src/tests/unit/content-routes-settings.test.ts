// Task 15: the two-tier tidy settings save action (spec 2.8). The save mirrors the nav editor's
// read-modify-commit exactly: validate the posted conventions, read the committed YAML, commit the
// document edited with setTidy through commitFile, and bounce a stale-SHA conflict back as a reload
// prompt. Only the conventions block is written, so the developer-tier enabled/model facts are never
// flipped by an editor save. The save 404s when tidy is off (the server half of the truthful gate);
// the route-level 404 outside the settings view is the viewAction gate, covered in the cairn-admin
// actions test.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { parseSiteConfig } from '../../lib/nav/site-config.js';
import { runtime as baseRuntime, contentEvent, expectRedirect } from './_content-harness.js';
import { resetKeyHealthForTest } from '../../lib/sveltekit/tidy-key-health.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { TidyClient } from '../../lib/sveltekit/content-routes.js';

/** A fake tidy client whose `models.list` resolves (a valid key), rejects with a status (invalid),
 *  or has no `models` at all (an unverifiable probe surface, degrading to 'unknown'). The settings
 *  load never calls `messages.create`, so that member is a stub that would fail loudly if reached. */
function fakeTidyClient(models: 'valid' | 'invalid' | 'absent'): () => TidyClient {
  return () => ({
    messages: {
      create: async () => {
        throw new Error('settingsLoad must never call messages.create');
      },
    },
    ...(models === 'absent'
      ? {}
      : {
          models: {
            list: async () => {
              if (models === 'invalid') throw Object.assign(new Error('unauthorized'), { status: 401 });
              return { data: [] };
            },
          },
        }),
  });
}

const CONFIG_PATH = 'src/lib/site.config.yaml';

function runtime(over: Partial<CairnRuntime> = {}): CairnRuntime {
  return baseRuntime({
    concepts: [],
    navMenu: { configPath: CONFIG_PATH, menuName: 'primary', label: 'Primary nav', maxDepth: 2 },
    tidy: { enabled: true, model: 'claude-sonnet-4-6' },
    ...over,
  });
}

function saveEvent(conventionsJson: string) {
  return contentEvent({ url: 'https://t.example/admin/settings', form: { conventions: conventionsJson } });
}

// The committed YAML the read step returns, carrying the developer-tier facts plus a comment, so the
// preserve-comments-and-facts assertion has something to round-trip.
const SEED_YAML = [
  '# the site config',
  'siteName: S',
  'tidy:',
  '  enabled: true',
  '  model: claude-sonnet-4-6',
  '  conventions:',
  '    fixes: true',
  '',
].join('\n');

afterEach(() => vi.restoreAllMocks());

describe('settingsSave', () => {
  it('commits the conventions block to the committed YAML, preserving the developer-tier facts', async () => {
    // The settings save is a head-guarded atomic commit (Git Data API), so the stateful double
    // seeds main with the YAML and answers the ref read, the head-guarded commit, and the write.
    const gh = new GithubDouble({ main: { [CONFIG_PATH]: SEED_YAML } });
    gh.install();
    const routes = createContentRoutes(runtime());
    const conventions = JSON.stringify({ fixes: true, oxfordComma: 'always', timeFormat: '5 PM' });
    const { location } = await expectRedirect(() => routes.settingsSave(saveEvent(conventions) as never));
    expect(location).toBe('/admin/settings?saved=1');
    // The commit names the session editor as author.
    const commitPost = gh.calls.find((c) => c.method === 'POST' && c.url.endsWith('/git/commits'))!;
    expect((commitPost.body as { author: unknown }).author).toEqual({ name: 'Ed Editor', email: 'ed@t' });
    // The committed content carries the new conventions and keeps the developer-tier facts and comment.
    const committed = gh.read('main', CONFIG_PATH)!;
    expect(committed).toContain('# the site config');
    expect(committed).toContain('enabled: true');
    expect(committed).toContain('model: claude-sonnet-4-6');
    const reparsed = parseSiteConfig(committed);
    expect(reparsed.tidy?.enabled).toBe(true);
    // The boolean toggles (enDashRanges/smartQuotes/brandCaps) are non-optional, so the validator
    // fills their false default; a collapsed multi-position toggle is dropped (none here).
    expect(reparsed.tidy?.conventions).toEqual({
      fixes: true,
      oxfordComma: 'always',
      timeFormat: '5 PM',
      enDashRanges: false,
      smartQuotes: false,
      brandCaps: false,
    });
  });

  it('404s when tidy is not enabled and never reads or commits (the server half of the gate)', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime({ tidy: { enabled: false } }));
    await expect(routes.settingsSave(saveEvent('{"fixes":true}') as never)).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bounces a malformed conventions payload back to the form and never commits', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime());
    // oxfordComma carries a value outside its allowed set.
    const { status, location } = await expectRedirect(() => routes.settingsSave(saveEvent('{"oxfordComma":"sometimes"}') as never));
    expect(status).toBe(303);
    expect(location).toMatch(/\/admin\/settings\?error=/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a head-moved conflict as a reload prompt without overwriting', async () => {
    // The save is now head-guarded: settingsSave reads the head, then commit(expectedHead) re-reads
    // it. Return a different head on the second ref read so the fail-closed commit raises
    // CommitConflictError, which settingsSave maps to the reload prompt. The raw read serves the YAML.
    let refReads = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      const accept = String((init?.headers as Record<string, string> | undefined)?.Accept ?? '');
      if (method === 'GET' && accept.includes('raw')) return new Response(SEED_YAML, { status: 200 });
      if (method === 'GET' && url.includes('/git/ref/heads/')) {
        refReads += 1;
        return new Response(JSON.stringify({ object: { sha: refReads === 1 ? 'h1' : 'h2' } }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    }));
    const routes = createContentRoutes(runtime());
    const { location } = await expectRedirect(() => routes.settingsSave(saveEvent('{"fixes":true}') as never));
    expect(location).toMatch(/error=.*changed%20since/i);
  });

  it('404s when the config file is gone at save time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime());
    await expect(routes.settingsSave(saveEvent('{"fixes":true}') as never)).rejects.toMatchObject({ status: 404 });
  });

  it('fails 400 with the parser\'s own message on a malformed committed config, rather than throwing', async () => {
    // An unrecognized top-level key is the documented way to trigger SiteConfigError. The committed
    // file fails to parse before the write, so the action must return a fail(400) envelope, not the
    // generic 500 an uncaught throw would produce.
    const gh = new GithubDouble({ main: { [CONFIG_PATH]: 'siteName: S\nweird: true\n' } });
    gh.install();
    const routes = createContentRoutes(runtime());
    const result = await routes.settingsSave(saveEvent('{"fixes":true}') as never);
    expect(result).toMatchObject({ status: 400 });
    expect((result as unknown as { data: { error: string } }).data.error).toMatch(/unrecognized key "weird"/);
    expect(gh.calls.some((c) => c.method === 'POST' && c.url.endsWith('/git/commits'))).toBe(false);
  });
});

describe('settingsLoad', () => {
  afterEach(() => resetKeyHealthForTest());

  function loadEvent(env: Record<string, unknown> = {}) {
    return contentEvent({ url: 'https://t.example/admin/settings', env });
  }

  it('opens the editor tier when tidy is enabled, the key is present, and the probe confirms it valid', async () => {
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeTidyClient('valid') } });
    const data = await routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-test' }) as never);
    expect(data.enabled).toBe(true);
    expect(data.tidyEnabled).toBe(true);
    expect(data.keyConfigured).toBe(true);
    expect(data.keyStatus).toBe('valid');
    expect(data.modelLabel).toBe('Claude Sonnet');
    expect(data.conventions.fixes).toBe(true);
  });

  it('keeps the gate closed when the key is missing, even with tidy enabled (no probe attempted)', async () => {
    const routes = createContentRoutes(runtime());
    const data = await routes.settingsLoad(loadEvent({}) as never);
    expect(data.enabled).toBe(false);
    expect(data.tidyEnabled).toBe(true);
    expect(data.keyConfigured).toBe(false);
    expect(data.keyStatus).toBe('missing');
  });

  it('closes the gate when the probe confirms the key invalid, though it stays "configured"', async () => {
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeTidyClient('invalid') } });
    const data = await routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-dead' }) as never);
    expect(data.enabled).toBe(false);
    expect(data.keyConfigured).toBe(true);
    expect(data.keyStatus).toBe('invalid');
  });

  it('fails soft to "unknown" and keeps the gate open when the probe cannot verify (no models surface)', async () => {
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeTidyClient('absent') } });
    const data = await routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-test' }) as never);
    expect(data.enabled).toBe(true);
    expect(data.keyStatus).toBe('unknown');
  });

  it('never returns the API key, only a presence flag and the probe verdict', async () => {
    const routes = createContentRoutes(runtime(), { tidy: { client: fakeTidyClient('valid') } });
    const data = await routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-secret-value' }) as never);
    expect(JSON.stringify(data)).not.toContain('sk-secret-value');
  });

  it('keeps the gate closed when tidy is off, and never runs the probe', async () => {
    const routes = createContentRoutes(runtime({ tidy: { enabled: false } }));
    const data = await routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-test' }) as never);
    expect(data.enabled).toBe(false);
    expect(data.tidyEnabled).toBe(false);
  });
});

describe('settingsLoad: probe bound + cached (save-500-hardening)', () => {
  afterEach(() => resetKeyHealthForTest());

  function loadEvent(env: Record<string, unknown> = {}) {
    return contentEvent({ url: 'https://t.example/admin/settings', env });
  }

  /** A fake client whose `models.list` hangs until the probe's own deadline fires the abort, the
   *  way a real fetch honors an AbortSignal. Records the signal it was handed so the test can
   *  assert the probe actually wired one through. */
  function hangingTidyClient(): { factory: () => TidyClient; sawSignal: () => AbortSignal | undefined } {
    let sawSignal: AbortSignal | undefined;
    const factory = (): TidyClient => ({
      messages: {
        create: async () => {
          throw new Error('settingsLoad must never call messages.create');
        },
      },
      models: {
        list: (_params, options) => {
          sawSignal = options?.signal;
          return new Promise((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => {
              const err = new Error('Request was aborted.');
              err.name = 'AbortError';
              reject(err);
            });
          });
        },
      },
    });
    return { factory, sawSignal: () => sawSignal };
  }

  it('bounds the probe with the same deadline as tidy calls, resolving unknown on a timeout', async () => {
    const hanging = hangingTidyClient();
    const routes = createContentRoutes(runtime(), { tidy: { client: hanging.factory, timeoutMs: 20 } });
    const data = await routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-test' }) as never);
    expect(hanging.sawSignal()).toBeInstanceOf(AbortSignal);
    expect(hanging.sawSignal()?.aborted).toBe(true);
    expect(data.keyStatus).toBe('unknown');
    // 'unknown' fails soft and keeps the gate open, same as a client with no probe surface.
    expect(data.enabled).toBe(true);
  });

  it('caches the probe result so a second load within the TTL performs no live call', async () => {
    const list = vi.fn(async () => ({ data: [] }));
    const client = (): TidyClient => ({
      messages: {
        create: async () => {
          throw new Error('settingsLoad must never call messages.create');
        },
      },
      models: { list },
    });
    const routes = createContentRoutes(runtime(), { tidy: { client } });
    const first = await routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-test' }) as never);
    expect(first.keyStatus).toBe('valid');
    expect(list).toHaveBeenCalledTimes(1);

    const second = await routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-test' }) as never);
    expect(second.keyStatus).toBe('valid');
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('re-probes once the cached record ages past the TTL', async () => {
    vi.useFakeTimers();
    try {
      const list = vi.fn(async () => ({ data: [] }));
      const client = (): TidyClient => ({
        messages: {
          create: async () => {
            throw new Error('settingsLoad must never call messages.create');
          },
        },
        models: { list },
      });
      const routes = createContentRoutes(runtime(), { tidy: { client } });
      await routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-test' }) as never);
      expect(list).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(11 * 60 * 1000); // past the 10-minute TTL
      await routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-test' }) as never);
      expect(list).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
