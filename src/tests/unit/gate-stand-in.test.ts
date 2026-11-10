// The stand-in against fixture pages: a fake page walks named fixtures, a fake clock stands in for the
// pauses, and no browser, network, or credential is involved.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Page } from 'playwright';
import { UnrecognisedPageError } from '../../../scripts/gate/browser.mjs';
import { TAB_PAGES, followTab, tabHeading } from '../../../scripts/gate/stand-in.mjs';

const REPO = path.resolve(import.meta.dirname, '..', '..', '..');
const SITE = 'https://gate-site.example.workers.dev';
const creds = { login: 'gate-login', password: 'fixture-password', totp: () => '246810' };
const OWNER = 'owner@probe.example';

type Control = { role: 'button' | 'link'; name: string; goto?: string };
type Fixture = { url: string; h1?: string; text?: string; controls?: Control[] };

/** One page per tab page kind, built from the setup tool's own page source, plus the pages around the tab. */
const FIXTURES: Record<string, Fixture> = {
  wait: { url: 'http://127.0.0.1:4100/', h1: 'Setup in progress', text: 'The next request opens in this tab.' },
  consent: {
    url: 'http://127.0.0.1:4100/',
    h1: 'Approve setup on Cloudflare',
    controls: [{ role: 'link', name: 'Continue to Cloudflare', goto: 'admin' }],
  },
  manifest: {
    url: 'http://127.0.0.1:4100/',
    h1: 'Continue to GitHub',
    controls: [{ role: 'button', name: 'Continue to GitHub', goto: 'admin' }],
  },
  'scope-error': {
    url: 'http://127.0.0.1:4100/error.html',
    h1: 'Select API Tokens: Write',
    controls: [{ role: 'link', name: 'Try again', goto: 'admin' }],
  },
  done: { url: 'http://127.0.0.1:4100/done.html', h1: '✓Approvals complete', text: 'Keep this tab open.' },
  confirm: {
    url: `${SITE}/admin/auth/confirm?token=SECRET-TOKEN`,
    h1: 'Confirm sign-in',
    controls: [{ role: 'button', name: 'Sign in', goto: 'admin' }],
  },
  login: { url: `${SITE}/admin/login`, h1: 'Sign in', controls: [{ role: 'button', name: 'Send sign-in link' }] },
  admin: { url: `${SITE}/admin/posts`, h1: 'Posts' },
  mystery: { url: 'http://127.0.0.1:4100/', h1: 'Something nobody planned', text: 'No control here.', controls: [{ role: 'link', name: 'Other' }] },
};

/** A page that shows one fixture at a time and moves to another when a control is clicked. */
class FakePage {
  clicks: string[] = [];
  shots: string[] = [];
  private fixture: Fixture;
  constructor(start: string, private now: () => number, private evidence: string) {
    this.fixture = FIXTURES[start]!;
  }
  goto(name: string) {
    this.fixture = FIXTURES[name]!;
  }
  url() {
    return this.fixture.url;
  }
  context() {
    return {};
  }
  async waitForLoadState() {}
  async waitForURL(predicate: (url: URL) => boolean) {
    if (!predicate(new URL(this.url()))) throw new Error('timeout');
  }
  locator(selector: string) {
    const fixture = this.fixture;
    const self = {
      first: () => self,
      isVisible: async () => selector === 'h1' && fixture.h1 !== undefined,
      innerText: async () => {
        if (selector === 'h1' && fixture.h1 !== undefined) return fixture.h1;
        throw new Error('no such element');
      },
    };
    return self;
  }
  getByRole(role: string, { name }: { name: string | RegExp }) {
    const found = (this.fixture.controls ?? []).find((control) => control.role === role && (typeof name === 'string' ? control.name === name : name.test(control.name)));
    const self = {
      first: () => self,
      isVisible: async () => found !== undefined,
      click: async () => {
        this.clicks.push(`${found!.name}@${this.now()}`);
        if (found!.goto) this.goto(found!.goto);
      },
    };
    return self;
  }
  async evaluate<T>(fn: () => T): Promise<T> {
    const fixture = this.fixture;
    const elements = (fixture.controls ?? []).map((control) => ({
      tagName: control.role === 'link' ? 'A' : 'BUTTON',
      getAttribute: () => null,
      innerText: control.name,
    }));
    (globalThis as { document?: unknown }).document = { body: { innerText: fixture.text ?? fixture.h1 ?? '' }, querySelectorAll: () => elements };
    try {
      return fn();
    } finally {
      delete (globalThis as { document?: unknown }).document;
    }
  }
  async screenshot({ path: file }: { path: string }) {
    this.shots.push(file);
    await writeFile(file, 'png');
  }
}

describe('the stand-in', () => {
  let dir: string;
  let time: number;
  let records: Array<[string, string, number]>;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'stand-in-'));
    time = 1_000_000;
    records = [];
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const options = (extra: Record<string, unknown> = {}) => ({
    creds,
    evidenceDir: dir,
    log: () => {},
    record: (kind: string, action: string) => {
      records.push([kind, action, time]);
    },
    mail: { login: OWNER, password: 'mail-password', siteName: 'gate-site', owner: OWNER },
    sleep: async (ms: number) => {
      time += ms;
    },
    now: () => time,
    pauseMs: 0,
    ...extra,
  });
  const follow = (page: FakePage, extra?: Record<string, unknown>) => followTab(page as unknown as Page, options(extra));

  it.each(['consent', 'manifest', 'scope-error'])('reads the %s page, pauses 3 seconds, clicks its control by name, and logs it', async (kind) => {
    const page = new FakePage(kind, () => time, dir);
    const start = time;
    await follow(page);
    expect(page.clicks).toHaveLength(1);
    expect(Number(page.clicks[0]!.split('@')[1]) - start).toBeGreaterThanOrEqual(3000);
    expect(records[0]).toEqual([kind, `click ${FIXTURES[kind]!.controls![0]!.role}`, expect.any(Number)]);
    expect(records.at(-1)![0]).toBe('admin');
  });

  it('waits on the waiting and done pages without failing, however long they last', async () => {
    const page = new FakePage('done', () => time, dir);
    let polls = 0;
    // The page moves on after twenty minutes of fake time, far past the 2 minute limit.
    await follow(page, {
      sleep: async (ms: number) => {
        time += ms;
        if (time - 1_000_000 > 20 * 60_000 && polls++ === 0) page.goto('admin');
      },
    });
    expect(records.map((record) => record[0])).toEqual(['admin']);
  });

  it('clicks the confirm page sign-in button and ends on the admin page', async () => {
    const page = new FakePage('confirm', () => time, dir);
    await follow(page, { readPauseMs: 0 });
    expect(page.clicks).toHaveLength(1);
    expect(records.map((record) => record[1])).toEqual(['click sign in', 'signed-in']);
  });

  it('fails an unknown page at 2 minutes with a screenshot and a controls file', async () => {
    const page = new FakePage('mystery', () => time, dir);
    const start = time;
    await expect(follow(page)).rejects.toBeInstanceOf(UnrecognisedPageError);
    expect(time - start).toBeGreaterThanOrEqual(120_000);
    expect(time - start).toBeLessThan(121_000);
    const files = await readdir(dir);
    expect(files.some((file) => file.endsWith('.png'))).toBe(true);
    const controls = files.find((file) => file.endsWith('.controls.txt'))!;
    expect(await readFile(path.join(dir, controls), 'utf8')).toContain('link\tOther');
    expect(page.clicks).toEqual([]);
  });

  it('never shoots a sign-in page, and the failure message names no token', async () => {
    const page = new FakePage('login', () => time, dir);
    await expect(
      follow(page, {
        requestLink: async () => time,
        findMail: async () => ({ found: false, reason: 'no matching sign-in message arrived within the budget' }),
      }),
    ).rejects.toThrow(/no sign-in message/);
    expect(page.shots).toEqual([]);
    expect((await readdir(dir)).filter((file) => file.endsWith('.png'))).toEqual([]);
    expect((await readdir(dir)).some((file) => file.endsWith('.controls.txt'))).toBe(true);
  });

  it('never shoots a page whose address carries a token', async () => {
    FIXTURES['stuck'] = { url: 'http://127.0.0.1:4100/?token=SECRET-TOKEN', h1: 'Something nobody planned' };
    try {
      const page = new FakePage('stuck', () => time, dir);
      await expect(follow(page)).rejects.toThrow(/unrecognised page/);
      expect(page.shots).toEqual([]);
    } finally {
      delete FIXTURES['stuck'];
    }
  });

  describe('the mail path', () => {
    const SINCE = 1_800_000_000_000;
    const message = (receivedAt: string, to: string, token: string) => ({
      receivedAt,
      from: [{ email: 'no-reply@carin-test.org' }],
      to: [{ email: to }],
      subject: 'Sign in to gate-site',
      textBody: [{ partId: '1' }],
      bodyValues: { '1': { value: `Sign in: ${SITE}/admin/auth/confirm?token=${token}` } },
    });
    const iso = (ms: number) => new Date(ms).toISOString();
    const jmap = (list: unknown[]): typeof fetch =>
      (async (input: URL | string) => {
        const url = String(input);
        if (url.endsWith('/.well-known/jmap')) {
          return new Response(JSON.stringify({ apiUrl: 'https://ward.907.life/jmap/api', primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acct' } }));
        }
        return new Response(JSON.stringify({ methodResponses: [['Email/query', { ids: [] }, 'q'], ['Email/get', { list }, 'g']] }));
      }) as typeof fetch;

    it('opens the newest message for the owner after the request, never the newest message', async () => {
      const page = new FakePage('login', () => time, dir);
      const opened: string[] = [];
      let queried: { owner?: string; sinceMs?: number; expectedOrigin?: string } = {};
      const realFind = (await import('../../../scripts/gate/mail.mjs')).findSignInMessage;
      await follow(page, {
        requestLink: async () => SINCE,
        findMail: async (query: Parameters<typeof realFind>[0]) => {
          queried = query;
          return realFind({
            ...query,
            now: () => SINCE + 10_000,
            fetchImpl: jmap([
              message(iso(SINCE - 60_000), OWNER, 'before-the-request'),
              message(iso(SINCE + 8_000), 'someone-else@probe.example', 'for-another-address'),
              message(iso(SINCE + 5_000), OWNER, 'the-right-one'),
              message(iso(SINCE + 9_000), 'someone-else@probe.example', 'newest-of-all'),
            ]),
          });
        },
        openLink: async (url: string) => {
          opened.push(url);
          page.goto('admin');
        },
      });
      expect(queried).toMatchObject({ owner: OWNER, sinceMs: SINCE, expectedOrigin: SITE });
      expect(opened).toEqual([`${SITE}/admin/auth/confirm?token=the-right-one`]);
      expect(records.map((record) => record[1])).toEqual(['read sign-in mail', 'open sign-in link', 'signed-in']);
      expect(JSON.stringify(records)).not.toContain('the-right-one');
    });
  });
});

describe('the tab page kinds', () => {
  it('has a fixture for every page kind in the Go source', async () => {
    const sources = ['tool/internal/setup/tab.go', 'tool/internal/setup/loopback/pages.go'];
    const kinds = new Set<string>();
    for (const file of sources) {
      const text = await readFile(path.join(REPO, file), 'utf8');
      for (const match of text.matchAll(/^\t[Pp]age([A-Z]\w*)(?:\s+[Pp]ageKind)?(?:\s*=\s*iota)?\s*$/gm)) kinds.add(match[1]!);
    }
    // The guard is only as good as its read: the source names at least these.
    expect([...kinds]).toEqual(expect.arrayContaining(['Redirect', 'Manifest', 'ScopeError', 'Done', 'Consent', 'Wait']));
    const fixtureKinds = new Set(Object.keys(FIXTURES));
    const missing = [...kinds].filter((kind) => {
      if (!(kind in TAB_PAGES)) return true;
      const entry = TAB_PAGES[kind as keyof typeof TAB_PAGES];
      // A redirect is a 302 the browser follows, so it has no page to fixture.
      return entry !== null && !fixtureKinds.has(entry.kind);
    });
    expect(missing).toEqual([]);
  });

  it('matches each fixture heading and control to the page source', async () => {
    for (const [name, entry] of Object.entries(TAB_PAGES)) {
      if (!entry) continue;
      const fixture = FIXTURES[entry.kind]!;
      expect(entry.heading.test(tabHeading(fixture.h1!)), name).toBe(true);
      expect(entry.control === null ? undefined : fixture.controls?.[0]?.name, name).toSatisfy((controlName?: string) => (entry.control ? entry.control.name.test(controlName ?? '') : controlName === undefined));
    }
    const pagesDir = path.join(REPO, 'tool/internal/setup/loopback/pages');
    // Every page's real <h1> text, tags dropped and glyphs kept, as the browser's innerText reads it,
    // is a heading the stand-in knows once its leading glyph is stripped (run 2611101829: the done page's
    // check mark made it an unknown page, and the stand-in failed after two minutes).
    const unknown: string[] = [];
    // These stop the setup, so the stand-in is meant to fail on them rather than click through.
    const stops = new Set(['oldbrowser.html', 'otherbrowser.html', 'stopped.html']);
    for (const file of (await readdir(pagesDir)).filter((name) => name.endsWith('.html') && !stops.has(name))) {
      const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(await readFile(path.join(pagesDir, file), 'utf8'))?.[1];
      if (!h1) continue;
      const heading = tabHeading(h1.replace(/<[^>]+>/g, ''));
      if (!Object.values(TAB_PAGES).some((entry) => entry && entry.heading.test(heading))) unknown.push(`${file}: ${heading}`);
    }
    expect(unknown).toEqual([]);
    const consent = await readFile(path.join(pagesDir, 'consent.html'), 'utf8');
    expect(consent).toContain('<h1>Approve setup on Cloudflare</h1>');
    expect(consent).toContain('>Continue to Cloudflare</a>');
    const github = await readFile(path.join(pagesDir, 'github.html'), 'utf8');
    expect(github).toContain('<button class="button" type="submit">Continue to GitHub</button>');
    const error = await readFile(path.join(pagesDir, 'error.html'), 'utf8');
    expect(error).toContain('>Try again</a>');
  });
});
