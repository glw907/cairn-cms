import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveConfig } from '../../../lib/audit/config.js';
import { resolveBaseUrl, resolveExtraCookies, resolveRenderedFindings, runRendered } from '../../../lib/audit/rendered.js';
import { exitCodeFor, formatReport } from '../../../lib/audit/report.js';
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

  // The staleness check keys on whether an entry's SELECTOR still matches, so an entry whose
  // element survived a fix that removed the finding could never be reported: it suppresses nothing
  // and reads as legitimate forever. That is the same invisible exception the counted-suppression
  // contract exists to forbid, one layer out, and it is what `suppress.ts` calls a dead directive.
  it('reports an allowlist entry whose selector still matches but which suppressed nothing', () => {
    const visits: RenderedPageVisit[] = [{ page: '/admin/x', selectorsSeen: new Set(['.legacy']) }];
    const allowlist = [{ page: '/admin/x', selector: '.legacy', reason: 'ships next pass' }];
    const { findings, suppressed } = resolveRenderedFindings([], visits, allowlist);
    expect(suppressed).toEqual([]);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('rendered-allowlist-dead');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('.legacy');
    expect(findings[0].message).toContain('ships next pass');
  });

  // Same tiering as the staleness finding, for the same reason: a dead entry covering an ADVISORY
  // rule must not be the path by which a non-gating rule reaches the exit code.
  it('reports a dead entry at the tier of the rule it names', () => {
    const visits: RenderedPageVisit[] = [{ page: '/admin/x', selectorsSeen: new Set(['.legacy']) }];
    const allowlist = [{ page: '/admin/x', selector: '.legacy', reason: 'held', rule: 'border-contrast' }];
    const { findings } = resolveRenderedFindings([], visits, allowlist, new Map([['border-contrast', 'advisory']]));
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('rendered-allowlist-dead');
    expect(findings[0].tier).toBe('advisory');
  });

  it('stays quiet about an entry that is still suppressing a finding', () => {
    const visits: RenderedPageVisit[] = [{ page: '/admin/x', selectorsSeen: new Set(['.legacy']) }];
    const allowlist = [{ page: '/admin/x', selector: '.legacy', reason: 'ships next pass' }];
    const { findings } = resolveRenderedFindings([finding()], visits, allowlist);
    expect(findings).toEqual([]);
  });

  // A duplicated row is what a hand edit or a config merge produces, and the first cut spent only
  // the FIRST matching entry, so the second fell into the dead branch and gated the build with a
  // message asserting nothing raised a finding for that selector, printed one line under the
  // finding that had just been suppressed for it. A report contradicting itself on the same page of
  // output spends the audit's credibility, which is the currency the geometric-adjacency rewrite
  // was undertaken to protect.
  it('spends every entry a finding matches, so a duplicated row raises nothing', () => {
    const visits: RenderedPageVisit[] = [{ page: '/admin/x', selectorsSeen: new Set(['.legacy']) }];
    const entry = { page: '/admin/x', selector: '.legacy', reason: 'ratified hairline' };
    const { findings, suppressed } = resolveRenderedFindings([finding()], visits, [entry, { ...entry }]);
    expect(findings).toEqual([]);
    expect(suppressed).toHaveLength(1);
  });

  // `runRendered` skips a whole state pass on a page it cannot put into that state, so the rules
  // reading only that state never run there and the findings it collected are a SUBSET. Accusing a
  // live entry of being dead on that evidence is a false statement, and the remedy the dead message
  // prescribes, removing the entry, is the wrong move: the next run that does reach the state would
  // gate on the real finding.
  it('withholds the dead verdict on a page whose declared states were not all reached', () => {
    const visits: RenderedPageVisit[] = [
      { page: '/admin/x', selectorsSeen: new Set(['.legacy']), statesUnreached: new Set(['menu-open' as const]) },
    ];
    const allowlist = [{ page: '/admin/x', selector: '.legacy', reason: 'the panel chip is deliberate' }];
    const { findings } = resolveRenderedFindings([], visits, allowlist);
    expect(findings).toHaveLength(1);
    expect(findings[0].tier).toBe('advisory');
    expect(findings[0].message).toContain('never reached menu-open');
    expect(findings[0].message).not.toContain('remove the entry');
    expect(exitCodeFor({ findings, suppressed: [], filesScanned: 1, ruleIds: ['probe'] })).toBe(0);
  });

  it('still reports a dead entry once every declared state was reached', () => {
    const visits: RenderedPageVisit[] = [
      { page: '/admin/x', selectorsSeen: new Set(['.legacy']), statesUnreached: new Set() },
    ];
    const allowlist = [{ page: '/admin/x', selector: '.legacy', reason: 'held' }];
    const { findings } = resolveRenderedFindings([], visits, allowlist);
    expect(findings[0].ruleId).toBe('rendered-allowlist-dead');
    expect(findings[0].tier).toBe('error');
  });
});

// A rendered rule can carry its own ratified exception, one no page+selector allowlist entry could
// express (a design token every card recipe shares, on every page). The contract is that such an
// exception is COUNTED: it becomes a suppressed finding carrying its reason, never a `continue`
// inside a rule that leaves the report saying `0 suppressed` while 135 findings vanish.
describe('a rule-declared exemption', () => {
  const RULING = 'RULING 2: --cairn-card-border, the ratified hairline, still reading at 1.19';
  const exemptFinding = (over: Partial<ResolvedRenderedFinding> = {}): ResolvedRenderedFinding => ({
    ruleId: 'border-contrast',
    tier: 'advisory',
    selector: 'div.card-shell',
    message: 'reads at contrast 1.11 against the surface beside it',
    exemption: RULING,
    page: '/admin/posts',
    theme: 'light',
    state: 'rest',
    ...over,
  });

  it('routes the finding to suppressed with no allowlist entry involved', () => {
    const { findings, suppressed } = resolveRenderedFindings([exemptFinding()], [], []);
    expect(findings).toEqual([]);
    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].ruleId).toBe('border-contrast');
  });

  it('prints the reason on the suppressed line, so it explains itself to a reader of the report', () => {
    const { suppressed } = resolveRenderedFindings([exemptFinding()], [], []);
    expect(suppressed[0].message).toContain('div.card-shell');
    expect(suppressed[0].message).toContain('reads at contrast 1.11');
    expect(suppressed[0].message).toContain(RULING);
  });

  it('keeps an exempt advisory finding out of the exit-code math', () => {
    const resolved = resolveRenderedFindings([exemptFinding()], [], []);
    expect(exitCodeFor({ ...resolved, filesScanned: 1, ruleIds: ['border-contrast'] })).toBe(0);
  });

  it('counts every exempt finding in the printed total', () => {
    const raw = [exemptFinding(), exemptFinding({ selector: 'div.card-b' }), exemptFinding({ theme: 'dark' })];
    const resolved = resolveRenderedFindings(raw, [], []);
    const text = formatReport({ ...resolved, filesScanned: 1, ruleIds: ['border-contrast'] });
    expect(text).toMatch(/3 suppressed/);
    expect(text).toContain('Suppressed:');
  });

  // The symmetric guard to `unprobeableFinding`'s forced advisory tier. That one exists so no
  // suppression a developer writes turns a non-gating rule into a gating one; this one exists so no
  // rule turns a GATING rule into a non-gating one. An end-to-end run of one `tier: 'error'` rule,
  // identical but for the exemption string, went from exit 1 to exit 0 with `0 errors` printed, and
  // six shipped rendered rules are error tier.
  it('refuses the exemption on an error-tier finding, which still gates', () => {
    const resolved = resolveRenderedFindings([exemptFinding({ tier: 'error' })], [], []);
    expect(resolved.suppressed).toEqual([]);
    expect(resolved.findings).toHaveLength(1);
    expect(exitCodeFor({ ...resolved, filesScanned: 1, ruleIds: ['border-contrast'] })).toBe(1);
  });

  // A refused exemption prints as a refusal. Printing `(exempt: ...)` beside a line that gates
  // would be the report contradicting its own exit code, and the reason is still worth showing: it
  // names the rule that asked for silence.
  it('prints the refusal rather than the exemption on the gating line', () => {
    const { findings } = resolveRenderedFindings([exemptFinding({ tier: 'error' })], [], []);
    expect(findings[0].message).toContain('refused because an error-tier finding gates');
    expect(findings[0].message).toContain(RULING);
    expect(findings[0].message).not.toContain('(exempt:');
  });

  // The allowlist is a different authority: a consumer owns that file and reviews it, so an entry
  // covering an error-tier finding suppresses exactly as before, exemption or not.
  it('still lets an allowlist entry suppress an error-tier finding the rule also exempted', () => {
    const visits: RenderedPageVisit[] = [{ page: '/admin/posts', selectorsSeen: new Set(['div.card-shell']) }];
    const allowlist = [{ page: '/admin/posts', selector: 'div.card-shell', reason: 'held for next pass' }];
    const { findings, suppressed } = resolveRenderedFindings([exemptFinding({ tier: 'error' })], visits, allowlist);
    expect(findings).toEqual([]);
    expect(suppressed).toHaveLength(1);
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

describe('resolveExtraCookies (the CAIRN_AUDIT_COOKIES contract)', () => {
  it('returns no cookies for undefined', () => {
    expect(resolveExtraCookies(undefined)).toEqual([]);
  });

  it('returns no cookies for an all-whitespace value', () => {
    expect(resolveExtraCookies('   ')).toEqual([]);
  });

  it('parses a single cookie', () => {
    expect(resolveExtraCookies('cairn_session=abc123')).toEqual([{ name: 'cairn_session', value: 'abc123' }]);
  });

  it('parses two cookies separated by a semicolon, tolerating surrounding spaces', () => {
    expect(resolveExtraCookies(' cairn_session=abc123 ; cairn_csrf=def456 ')).toEqual([
      { name: 'cairn_session', value: 'abc123' },
      { name: 'cairn_csrf', value: 'def456' },
    ]);
  });

  it('splits on the FIRST = only, so a value containing = survives intact', () => {
    expect(resolveExtraCookies('cairn_session=abc=def')).toEqual([{ name: 'cairn_session', value: 'abc=def' }]);
  });

  it('accepts an empty value as legal', () => {
    expect(resolveExtraCookies('cairn_empty=')).toEqual([{ name: 'cairn_empty', value: '' }]);
  });

  it('throws naming CAIRN_AUDIT_COOKIES and the entry when a segment carries no =', () => {
    expect(() => resolveExtraCookies('not-a-cookie')).toThrow(/CAIRN_AUDIT_COOKIES/);
    expect(() => resolveExtraCookies('not-a-cookie')).toThrow(/not-a-cookie/);
  });

  it('throws when the name is empty after trimming', () => {
    expect(() => resolveExtraCookies('=onlyavalue')).toThrow(/CAIRN_AUDIT_COOKIES/);
  });

  // The run owns cairn-admin-theme per browser context (one context per theme); a caller override
  // would silently invalidate the per-theme measurement, so this is refused rather than merged.
  it('throws when an entry names cairn-admin-theme, the cookie the run itself owns', () => {
    expect(() => resolveExtraCookies('cairn-admin-theme=dark')).toThrow(/cairn-admin-theme/);
    expect(() => resolveExtraCookies('cairn_session=abc; cairn-admin-theme=dark')).toThrow(/cairn-admin-theme/);
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
  /** Every `addCookies` call across every context this browser opens, in call order. */
  addCookiesCalls?: { name: string; value: string; url: string }[][];
}): {
  chromium: { launch: () => Promise<RenderedBrowser> };
} {
  const status = page.status ?? 200;
  const hasMenuTrigger = page.hasMenuTrigger ?? false;
  const matchedSelectors = page.matchedSelectors ?? new Set<string>();
  const unprobeableSelectors = page.unprobeableSelectors ?? new Set<string>();
  const addCookiesCalls = page.addCookiesCalls ?? [];

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
    async addCookies(cookies: { name: string; value: string; url: string }[]) {
      addCookiesCalls.push(cookies);
    },
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

  describe('CAIRN_AUDIT_COOKIES', () => {
    const originalCookies = process.env.CAIRN_AUDIT_COOKIES;

    afterEach(() => {
      if (originalCookies === undefined) delete process.env.CAIRN_AUDIT_COOKIES;
      else process.env.CAIRN_AUDIT_COOKIES = originalCookies;
    });

    it('adds every parsed cookie to each browser context alongside the theme cookie', async () => {
      process.env.CAIRN_AUDIT_COOKIES = 'cairn_session=abc123';
      const config = configWith({ pages: ['/admin/x'] });
      const addCookiesCalls: { name: string; value: string; url: string }[][] = [];

      await runRendered(config, [trivialRule], {
        isReachable: async () => true,
        loadPlaywright: async () => fakeBrowser({ addCookiesCalls }),
      });

      // One context per theme (light, dark), each call carrying the theme cookie plus the extra one.
      expect(addCookiesCalls).toHaveLength(2);
      for (const cookies of addCookiesCalls) {
        expect(cookies).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ name: 'cairn-admin-theme' }),
            { name: 'cairn_session', value: 'abc123', url: expect.any(String) },
          ])
        );
      }
    });

    it('throws before ever launching a context when CAIRN_AUDIT_COOKIES is malformed', async () => {
      process.env.CAIRN_AUDIT_COOKIES = 'cairn-admin-theme=dark';
      const config = configWith({ pages: ['/admin/x'] });
      await expect(
        runRendered(config, [trivialRule], {
          isReachable: async () => true,
          loadPlaywright: async () => fakeBrowser({}),
        })
      ).rejects.toThrow(/cairn-admin-theme/);
    });
  });
});
