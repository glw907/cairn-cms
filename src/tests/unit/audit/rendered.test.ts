import { describe, it, expect, vi } from 'vitest';
import { resolveConfig } from '../../../lib/audit/config.js';
import { resolveBaseUrl, resolveRenderedFindings, runRendered } from '../../../lib/audit/rendered.js';
import type {
  RenderedBrowser,
  RenderedContext,
  RenderedFinding,
  RenderedPage,
  RenderedRule,
  ResolvedRenderedFinding,
  RenderedPageVisit,
} from '../../../lib/audit/rendered.js';
import type { AuditConfig } from '../../../lib/audit/config.js';

/** A minimal AuditConfig with real defaults, `rendered.pages`/`rendered.allowlist` overridden. */
function configWith(rendered: { pages?: string[]; allowlist?: unknown[] } = {}): AuditConfig {
  return resolveConfig('/fake-root', { rendered }, () => true);
}

const trivialRule: RenderedRule = {
  id: 'trivial',
  tier: 'advisory',
  check: async () => [],
};

describe('resolveRenderedFindings', () => {
  const finding = (over: Partial<ResolvedRenderedFinding> = {}): ResolvedRenderedFinding => ({
    ruleId: 'probe',
    tier: 'error',
    selector: '.legacy',
    message: 'flagged',
    page: '/admin/x',
    theme: 'light',
    state: 'rest',
    ...over,
  });

  it('suppresses a finding an allowlist entry exactly matches on page and selector', () => {
    const visits: RenderedPageVisit[] = [{ page: '/admin/x', selectorsSeen: new Set(['.legacy']) }];
    const allowlist = [{ page: '/admin/x', selector: '.legacy', reason: 'ships next pass' }];
    const { findings, suppressed } = resolveRenderedFindings([finding()], visits, allowlist);
    expect(findings).toEqual([]);
    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].ruleId).toBe('probe');
  });

  it('leaves an unmatched finding in findings, not suppressed', () => {
    const { findings, suppressed } = resolveRenderedFindings([finding({ selector: '.new-thing' })], [], []);
    expect(suppressed).toEqual([]);
    expect(findings).toHaveLength(1);
  });

  // The stale-allowlist contract: an entry whose selector matched nothing the run actually visited
  // is reported as its own error, never silently dropped. A rename or a typo is how a real finding
  // disappears behind an allowlist entry that no longer does anything.
  it('reports a stale allowlist entry whose selector matched nothing on its named page', () => {
    const visits: RenderedPageVisit[] = [{ page: '/admin/x', selectorsSeen: new Set() }];
    const allowlist = [{ page: '/admin/x', selector: '.renamed-away', reason: 'stale' }];
    const { findings } = resolveRenderedFindings([], visits, allowlist);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('rendered-allowlist-stale');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('.renamed-away');
  });

  it('reports a stale allowlist entry naming a page the run never visited at all', () => {
    const allowlist = [{ page: '/admin/never-visited', selector: '.x', reason: 'stale' }];
    const { findings } = resolveRenderedFindings([], [], allowlist);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('rendered-allowlist-stale');
  });
});

describe('the BASE_URL contract', () => {
  // The harness never starts a server, so an unanswering BASE_URL (explicit or the default) is a
  // clear, actionable failure naming the URL it tried, not a hang or a silent empty report.
  it('fails naming the URL it tried when nothing answers there', async () => {
    delete process.env.BASE_URL;
    await expect(resolveBaseUrl()).rejects.toThrow(/http:\/\/localhost:4173/);
  });

  it('runRendered surfaces the same failure before ever touching Playwright', async () => {
    delete process.env.BASE_URL;
    const config = configWith({ pages: ['/admin/posts'] });
    await expect(runRendered(config, [trivialRule])).rejects.toThrow(/no server answering/);
  });
});

describe('the Playwright-presence contract', () => {
  it('fails with the one-line install instruction when Playwright cannot load, default or injected', async () => {
    const config = configWith({ pages: ['/admin/posts'] });
    await expect(
      runRendered(config, [trivialRule], {
        isReachable: async () => true,
        loadPlaywright: async () => {
          throw new Error('Cannot find package "playwright"');
        },
      })
    ).rejects.toThrow(/npm i -D playwright/);
  });
});

describe('fail-loud shapes that need no browser at all', () => {
  it('refuses to run against an empty rule registry rather than reporting a clean pass', async () => {
    const config = configWith({ pages: ['/admin/posts'] });
    await expect(runRendered(config, [])).rejects.toThrow(/rule registry is empty/);
  });

  it('refuses to run against an empty page list', async () => {
    const config = configWith({ pages: [] });
    await expect(runRendered(config, [trivialRule])).rejects.toThrow(/page list is empty/);
  });
});

/**
 * A test double for Playwright's surface, typed structurally against `RenderedPage`/`RenderedContext`/
 * `RenderedBrowser` and cast at the boundary: its `evaluate` is not generic (a test double has no
 * need to be), so it satisfies the interface's shape rather than its exact generic signature, the
 * same "structural type, cast the dynamic import" idiom the module itself uses for the real
 * Playwright import.
 */
function fakeBrowser(page: {
  status?: number;
  hasMenuTrigger?: boolean;
  matchedSelectors?: Set<string>;
  unprobeableSelectors?: Set<string>;
}): {
  chromium: { launch: () => Promise<RenderedBrowser> };
} {
  const status = page.status ?? 200;
  const hasMenuTrigger = page.hasMenuTrigger ?? false;
  const matchedSelectors = page.matchedSelectors ?? new Set<string>();
  const unprobeableSelectors = page.unprobeableSelectors ?? new Set<string>();

  const fakePage = {
    async goto() {
      return { status: () => status };
    },
    async evaluate(_fn: unknown, arg?: unknown) {
      if (Array.isArray(arg)) {
        return (arg as string[]).map((selector) =>
          unprobeableSelectors.has(selector) ? 'unprobeable' : matchedSelectors.has(selector) ? 'matched' : 'absent'
        );
      }
      return hasMenuTrigger;
    },
    keyboard: { press: async () => {} },
    async close() {},
  } as unknown as RenderedPage;

  const context = {
    async addCookies() {},
    async newPage() {
      return fakePage;
    },
    async close() {},
  } as unknown as RenderedContext;

  const browser = {
    async newContext() {
      return context;
    },
    async close() {},
  } as unknown as RenderedBrowser;

  return { chromium: { launch: async () => browser } };
}

describe('runRendered against a fake browser', () => {
  it('visits both themes for a rule that declares no states, and resolves the allowlist end to end', async () => {
    const config = configWith({
      pages: ['/admin/x'],
      allowlist: [{ page: '/admin/x', selector: '.legacy', reason: 'ships next pass' }],
    });
    const restRule: RenderedRule = {
      id: 'rest-rule',
      tier: 'error',
      check: vi.fn(async (): Promise<RenderedFinding[]> => [
        { ruleId: 'rest-rule', tier: 'error', selector: '.legacy', message: 'flagged' },
        { ruleId: 'rest-rule', tier: 'error', selector: '.new-thing', message: 'not allowed' },
      ]),
    };

    const report = await runRendered(config, [restRule], {
      isReachable: async () => true,
      loadPlaywright: async () => fakeBrowser({ matchedSelectors: new Set(['.legacy']) }),
    });

    expect(restRule.check).toHaveBeenCalledTimes(2);
    const themesSeen = (restRule.check as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0].theme);
    expect(new Set(themesSeen)).toEqual(new Set(['light', 'dark']));

    // .legacy matches the allowlist exactly and the harness saw it present, so it is suppressed and
    // not stale; .new-thing carries no allowlist entry, so it survives as a real finding.
    expect(report.findings.map((f) => f.message)).toEqual(
      expect.arrayContaining([expect.stringContaining('.new-thing')])
    );
    expect(report.findings.some((f) => f.ruleId === 'rendered-allowlist-stale')).toBe(false);
    expect(report.suppressed.map((f) => f.message)).toEqual(
      expect.arrayContaining([expect.stringContaining('.legacy')])
    );
  });

  it('only evaluates a rule during the interaction state it declares, and skips it when the state is unreachable', async () => {
    const config = configWith({ pages: ['/admin/x'] });
    const restRule: RenderedRule = { id: 'rest-rule', tier: 'error', check: vi.fn(async () => []) };
    const menuRule: RenderedRule = {
      id: 'menu-rule',
      tier: 'advisory',
      states: ['menu-open'],
      check: vi.fn(
        async (): Promise<RenderedFinding[]> => [
          { ruleId: 'menu-rule', tier: 'advisory', selector: '.menu-item', message: 'seen' },
        ]
      ),
    };

    const reached = await runRendered(config, [restRule, menuRule], {
      isReachable: async () => true,
      loadPlaywright: async () => fakeBrowser({ hasMenuTrigger: true }),
    });
    expect(restRule.check).toHaveBeenCalledTimes(2);
    expect((restRule.check as ReturnType<typeof vi.fn>).mock.calls.every((call) => call[0].state === 'rest')).toBe(true);
    expect(menuRule.check).toHaveBeenCalledTimes(2);
    expect((menuRule.check as ReturnType<typeof vi.fn>).mock.calls.every((call) => call[0].state === 'menu-open')).toBe(true);
    expect(reached.findings.some((f) => f.ruleId === 'menu-rule')).toBe(true);

    vi.mocked(menuRule.check).mockClear();
    const unreached = await runRendered(config, [restRule, menuRule], {
      isReachable: async () => true,
      loadPlaywright: async () => fakeBrowser({ hasMenuTrigger: false }),
    });
    // Not every admin page carries a menu trigger; a rule declaring 'menu-open' simply does not run
    // on this page rather than the harness treating an unreachable state as an error.
    expect(menuRule.check).not.toHaveBeenCalled();
    expect(unreached.findings.some((f) => f.ruleId === 'menu-rule')).toBe(false);
  });

  it('fails loudly when a visited page renders outside 2xx', async () => {
    const config = configWith({ pages: ['/admin/missing'] });
    await expect(
      runRendered(config, [trivialRule], {
        isReachable: async () => true,
        loadPlaywright: async () => fakeBrowser({ status: 404 }),
      })
    ).rejects.toThrow(/rendered 404/);
  });
});
