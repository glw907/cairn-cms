// The legs' verdicts and the real sign-in mail read. evaluateLeg fails each leg on each missing
// input and passes with all of them right; the JMAP read runs against a stub server.
import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  CONNECTED_SENTENCE,
  END_TO_END_SENTENCE,
  MAIL_SENDER,
  NOT_CONNECTED_SENTENCE,
  PUBLISHED_ALERT,
  evaluateLeg,
  findSignInMessage,
  guardedRun,
  installName,
  type LegResults,
} from '../../../scripts/gate/legs.mjs';

const found = { found: true, url: 'https://carin-test.org/about', status: 200, fetchedAt: '2026-11-03T10:00:00.000Z', attempts: 1 };
const notFound = { ...found, found: false };
const unchanged = { ...found, found: false, absent: true };

function good(leg: string): LegResults {
  const closing =
    leg === 'A1'
      ? `${NOT_CONNECTED_SENTENCE} To deploy each publish, run npx create-cairn-site --dir /x --connect.`
      : leg === 'A2'
        ? CONNECTED_SENTENCE
        : `${END_TO_END_SENTENCE}\n${CONNECTED_SENTENCE}`;
  return {
    closingText: closing,
    alertText: PUBLISHED_ALERT,
    fetch: leg === 'A1' ? null : found,
    absent: leg === 'A1' ? unchanged : null,
    commitOnDefaultBranch: leg === 'A1',
    robotsHasSitemap: leg === 'A2' || leg === 'B2',
    mail: leg === 'B2' ? { from: MAIL_SENDER, fetch: found } : null,
  };
}

describe('evaluateLeg', () => {
  it.each(['A1', 'A2', 'B1', 'B2'])('passes %s with every input right', (leg) => {
    expect(evaluateLeg(leg, good(leg))).toEqual({ pass: true, failures: [] });
  });

  it('reads a closing sentence the terminal wrapped and prefixed with bars', () => {
    const wrapped = { ...good('A2'), closingText: `│  Each publish from your admin commits to GitHub,\n│  and Workers Builds deploys it, so your live site updates by itself.` };
    expect(evaluateLeg('A2', wrapped).pass).toBe(true);
  });

  it('fails on found: false', () => {
    expect(evaluateLeg('A2', { ...good('A2'), fetch: notFound }).failures[0]).toMatch(/did not find the marker/);
  });

  it('fails on a wrong alert text', () => {
    expect(evaluateLeg('A2', { ...good('A2'), alertText: 'Published. The live site is rebuilding.' }).pass).toBe(false);
  });

  it('fails on a missing closing sentence', () => {
    expect(evaluateLeg('B1', { ...good('B1'), closingText: CONNECTED_SENTENCE }).failures[0]).toMatch(/end-to-end/);
    expect(evaluateLeg('A1', { ...good('A1'), closingText: CONNECTED_SENTENCE }).failures[0]).toMatch(/not-connected/);
  });

  it('fails when there is no fetch result, whatever the CLI exit was', () => {
    expect(evaluateLeg('B1', { ...good('B1'), fetch: null }).failures).toContain('no fetch result');
    expect(evaluateLeg('A1', { ...good('A1'), absent: null }).pass).toBe(false);
  });

  it('fails A1 when --absent saw the marker, and when the commit is missing', () => {
    const saw = { ...found, found: true, absent: false, reason: 'the marker is already live' };
    expect(evaluateLeg('A1', { ...good('A1'), absent: saw }).failures[0]).toMatch(/already live/);
    expect(evaluateLeg('A1', { ...good('A1'), commitOnDefaultBranch: false }).pass).toBe(false);
  });

  it('fails A2 and B2 when robots.txt lacks the domain sitemap', () => {
    expect(evaluateLeg('A2', { ...good('A2'), robotsHasSitemap: false }).pass).toBe(false);
    expect(evaluateLeg('B2', { ...good('B2'), robotsHasSitemap: false }).pass).toBe(false);
  });

  it('fails B2 on a different sender or an unfetched mail-session marker', () => {
    expect(evaluateLeg('B2', { ...good('B2'), mail: { from: 'no-reply@elsewhere.example', fetch: found } }).failures[0]).toMatch(/came from/);
    expect(evaluateLeg('B2', { ...good('B2'), mail: { from: MAIL_SENDER, fetch: notFound } }).failures[0]).toMatch(/marker was not fetched/);
    expect(evaluateLeg('B2', { ...good('B2'), mail: null }).pass).toBe(false);
  });
});

describe('installName', () => {
  it.each(['0.99.0-rc.3', '1.0.0'])('keeps %s within 34 characters', (version) => {
    const name = installName(version, 'a', new Date(Date.UTC(2026, 10, 3, 9, 5)));
    expect(name.length).toBeLessThanOrEqual(34);
    expect(name).toMatch(/^cairn-e2e-gate-[0-9a-z]+-a-030905$/);
  });

  it('strips every non-alphanumeric character from the version', () => {
    expect(installName('0.99.0-rc.3', 'b', new Date(Date.UTC(2026, 10, 3, 9, 5)))).toBe('cairn-e2e-gate-0990rc3-b-030905');
  });

  it('refuses a name over the limit', () => {
    expect(() => installName('0.99.0-rc.3.long.suffix', 'a')).toThrow(/limit is 34/);
  });
});

describe('guardedRun', () => {
  it('tears down only after the work throws', async () => {
    const calls: string[] = [];
    await guardedRun(async () => void calls.push('work'), async () => void calls.push('teardown'));
    expect(calls).toEqual(['work']);
    await expect(
      guardedRun(
        async () => {
          throw new Error('leg failed');
        },
        async () => void calls.push('teardown'),
      ),
    ).rejects.toThrow('leg failed');
    expect(calls).toEqual(['work', 'teardown']);
  });
});

describe('findSignInMessage', () => {
  const servers: Server[] = [];
  afterEach(() => {
    for (const server of servers.splice(0)) server.close();
  });

  const OWNER = 'cairn-gate@probe.907.life';
  const SINCE = Date.parse('2026-11-03T10:00:00Z');
  const SITE = 'cairn-e2e-gate-0990rc3-b-031200';

  type Mail = { receivedAt: string; from: string; to: string; subject: string; text: string; mailbox?: string };
  const link = (origin: string, token = 'tok') => `${origin}/admin/auth/confirm?token=${token}`;
  const signIn = (overrides: Partial<Mail> = {}): Mail => ({
    receivedAt: '2026-11-03T10:00:30Z',
    from: MAIL_SENDER,
    to: OWNER,
    subject: `Sign in to ${SITE}`,
    text: `${SITE}\n\nSign in: ${link('https://carin-test.org')}\n\nThe link expires in 10 minutes.`,
    ...overrides,
  });

  /** A JMAP stub that ignores the query filter, so only the client's own filtering decides. */
  async function serve(mail: Mail[], options: { laterMail?: Mail[]; afterPolls?: number } = {}) {
    let polls = 0;
    const server = createServer((request, response) => {
      const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      expect(request.headers.authorization).toMatch(/^Basic /);
      if (request.url === '/.well-known/jmap') {
        response.end(JSON.stringify({ apiUrl: `${origin}/api`, primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acct' } }));
        return;
      }
      polls++;
      const visible = options.laterMail && polls > (options.afterPolls ?? 1) ? [...mail, ...options.laterMail] : mail;
      const list = visible.map((message, i) => ({
        id: `m${i}`,
        receivedAt: message.receivedAt,
        from: [{ email: message.from }],
        to: [{ email: message.to }],
        subject: message.subject,
        textBody: [{ partId: '1' }],
        bodyValues: { '1': { value: message.text } },
        mailboxIds: { [message.mailbox ?? 'inbox']: true },
      }));
      response.end(JSON.stringify({ methodResponses: [['Email/query', { ids: list.map((m) => m.id) }, 'q'], ['Email/get', { list }, 'g']] }));
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return { sessionUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/.well-known/jmap`, polls: () => polls };
  }

  const clock = () => {
    let t = 0;
    return { now: () => t, sleep: async (ms: number) => void (t += ms) };
  };

  const base = { login: OWNER, password: 'pw', siteName: SITE, owner: OWNER, sinceMs: SINCE, expectedOrigin: 'https://carin-test.org' };

  it('skips a newer GitHub message and an earlier run\'s sign-in, reading only the matching one', async () => {
    const github: Mail = { ...signIn(), receivedAt: '2026-11-03T10:05:00Z', from: 'noreply@github.com', subject: '[GitHub] A new SSH key was added', text: 'https://github.com/settings/keys' };
    const earlier: Mail = signIn({ receivedAt: '2026-11-03T09:00:00Z', text: `Sign in: ${link('https://carin-test.org', 'OLD')}` });
    const wanted = signIn({ text: `Sign in: ${link('https://carin-test.org', 'NEW')}` });
    const stub = await serve([github, earlier, wanted]);
    const result = await findSignInMessage({ ...base, sessionUrl: stub.sessionUrl, ...clock() });
    expect(result).toEqual({ found: true, from: MAIL_SENDER, url: link('https://carin-test.org', 'NEW') });
  });

  it('finds nothing when the only sign-in message is an earlier run\'s, however newer the GitHub mail is', async () => {
    const github: Mail = { ...signIn(), receivedAt: '2026-11-03T10:05:00Z', from: 'noreply@github.com', subject: '[GitHub] A new SSH key was added', text: 'https://github.com/settings/keys' };
    const earlier: Mail = signIn({ receivedAt: '2026-11-03T09:00:00Z' });
    const stub = await serve([github, earlier]);
    const result = await findSignInMessage({ ...base, sessionUrl: stub.sessionUrl, budgetMs: 30_000, ...clock() });
    expect(result.found).toBe(false);
  });

  it('skips a sign-in addressed to someone else', async () => {
    const stub = await serve([signIn({ to: 'other@example.com' })]);
    const result = await findSignInMessage({ ...base, sessionUrl: stub.sessionUrl, budgetMs: 30_000, ...clock() });
    expect(result.found).toBe(false);
  });

  it('finds a message that sits in Junk', async () => {
    const stub = await serve([signIn({ mailbox: 'junk' })]);
    const result = await findSignInMessage({ ...base, sessionUrl: stub.sessionUrl, ...clock() });
    expect(result.found).toBe(true);
  });

  it('keeps polling until the message arrives', async () => {
    const stub = await serve([], { laterMail: [signIn()], afterPolls: 3 });
    const result = await findSignInMessage({ ...base, sessionUrl: stub.sessionUrl, ...clock() });
    expect(result.found).toBe(true);
    expect(stub.polls()).toBe(4);
  });

  it('fails when none arrives within the budget', async () => {
    const stub = await serve([]);
    const result = await findSignInMessage({ ...base, sessionUrl: stub.sessionUrl, budgetMs: 60_000, ...clock() });
    expect(result).toEqual({ found: false, reason: 'no matching sign-in message arrived within the budget' });
  });

  it('refuses a sign-in link on another origin', async () => {
    const stub = await serve([signIn({ text: `Sign in: ${link('https://evil.example')}` })]);
    await expect(findSignInMessage({ ...base, sessionUrl: stub.sessionUrl, ...clock() })).rejects.toThrow(/refusing to open it/);
  });

  it('takes the link from the text body, not elsewhere in the message', async () => {
    const stub = await serve([signIn({ text: `Unsubscribe: https://carin-test.org/unsubscribe\nSign in: ${link('https://carin-test.org', 'TXT')}` })]);
    const result = await findSignInMessage({ ...base, sessionUrl: stub.sessionUrl, ...clock() });
    expect(result).toMatchObject({ found: true, url: link('https://carin-test.org', 'TXT') });
  });
});
