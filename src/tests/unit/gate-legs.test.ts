// The legs' verdicts and the real sign-in mail read. evaluateLeg fails each leg on each missing
// input and passes with all of them right; the JMAP read runs against a stub server.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import {
  CONNECTED_SENTENCE,
  END_TO_END_SENTENCE,
  MAIL_SENDER,
  NOT_CONNECTED_SENTENCE,
  PUBLISHED_ALERT,
  cliFailureMessage,
  DEFAULT_OWNER_EMAIL,
  ownerEmailFor,
  evaluateLeg,
  findSignInMessage,
  guardedRun,
  installName,
  promptTable,
  readRecord,
  runLeg,
  LEG_PLANS,
  type LegResults,
} from '../../../scripts/gate/legs.mjs';
import { teardownRun, teardownStale } from '../../../scripts/gate/gate.mjs';

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

describe('cliFailureMessage', () => {
  it('names the exit code and the last output lines, stripped of escapes and spinners', () => {
    const capture = '\u001b[2K\u280b Resolving\r\n\u001b[31mnpm error code ETARGET\u001b[39m\r\n\n\u2502  npm error notarget No matching version\r\n';
    expect(cliFailureMessage({ code: 1 }, capture)).toBe(
      'the CLI run failed: exit code 1\nLast output:\nResolving\nnpm error code ETARGET\nnpm error notarget No matching version',
    );
  });

  it('keeps the driver\'s reason line and only the last lines', () => {
    const capture = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    const message = cliFailureMessage({ code: -1, failure: 'no output for 10 minutes\nLast screen:\nx' }, capture, 3);
    expect(message).toBe('the CLI run failed: no output for 10 minutes\nLast output:\nline 17\nline 18\nline 19');
  });

  it('reports the exit alone when there is no capture', () => {
    expect(cliFailureMessage({ code: 2 }, '')).toBe('the CLI run failed: exit code 2');
  });
});

describe('ownerEmailFor', () => {
  it('defaults to the gate mailbox and lets a non-empty GATE_OWNER_EMAIL override it', () => {
    expect(ownerEmailFor({})).toBe(DEFAULT_OWNER_EMAIL);
    expect(ownerEmailFor({ GATE_OWNER_EMAIL: '' })).toBe(DEFAULT_OWNER_EMAIL);
    expect(ownerEmailFor({ GATE_OWNER_EMAIL: 'me@example.com' })).toBe('me@example.com');
  });
});

describe('readRecord', () => {
  it('returns the record whose dir is the install\'s, skipping other installs and retired files', async () => {
    const state = mkdtempSync(path.join(tmpdir(), 'gate-state-'));
    writeFileSync(path.join(state, '.retired-x.json'), JSON.stringify({ dir: '/mine', n: 'retired' }));
    writeFileSync(path.join(state, 'a.json'), JSON.stringify({ dir: '/other', n: 'other' }));
    writeFileSync(path.join(state, 'b.json'), JSON.stringify({ dir: '/mine', n: 'mine' }));
    expect((await readRecord(state, '/mine')).n).toBe('mine');
    expect(await readRecord(state, '/none')).toBeNull();
  });
});

describe('promptTable', () => {
  it('answers the account select with the gate account name', () => {
    const table = promptTable({ siteName: 's', dir: '/d', ownerEmail: 'o@x', token: 't', accountName: 'glw907', plan: LEG_PLANS.A1 });
    expect(table.find((e) => e.match === 'Which Cloudflare account')).toMatchObject({ label: 'glw907' });
  });
});

describe('runLeg', () => {
  /** Test doubles for the injected collaborators, which the real signatures over-constrain. */
  const fake = (deps: Record<string, unknown>) => deps as unknown as Parameters<typeof runLeg>[1];

  /** Rows the injected recordLeg receives. */
  function recorder() {
    const rows: Array<Record<string, string>> = [];
    const recordLeg = async ({ row }: { row: Record<string, string> }) => {
      rows.push(row);
    };
    return { rows, recordLeg };
  }

  function setup() {
    const runDir = mkdtempSync(path.join(tmpdir(), 'gate-run-'));
    const install = { name: 'n', dir: path.join(runDir, 'installs', 'n'), admin: {}, signedIn: false };
    const ctx = {
      accountName: 'glw907', leg: 'A1', version: '1.0.0', runDir, env: {}, cliEnv: { CLOUDFLARE_API_TOKEN: 't' },
      install, launched: { github: {} }, creds: {}, releaseNotesDir: path.join(runDir, 'notes'), log: () => {},
    } as unknown as Parameters<typeof runLeg>[0];
    const writeRecord = () => {
      mkdirSync(path.join(runDir, 'state'), { recursive: true });
      writeFileSync(path.join(runDir, 'state', 'r.json'), JSON.stringify({ dir: install.dir, cloudflare: { url: 'https://x.workers.dev' } }));
    };
    return { runDir, install, ctx, writeRecord };
  }

  it('fails with the CLI failure message on a non-zero exit, before any publish', async () => {
    const { ctx, writeRecord, runDir } = setup();
    let published = false;
    const { rows, recordLeg } = recorder();
    const verdict = await runLeg(ctx, fake({
      recordLeg,
      runDriver: (async (o: { capturePath: string }) => {
        writeRecord();
        writeFileSync(o.capturePath, 'npm error boom\n');
        return { code: 1, screen: '' };
      }),
      publishViaAdmin: async () => { published = true; },
    }));
    expect(verdict.pass).toBe(false);
    expect(verdict.failures[0]).toContain('the CLI run failed: exit code 1');
    expect(published).toBe(false);
    expect(existsSync(path.join(runDir, 'failed'))).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ leg: 'A1', run: path.basename(runDir) });
    expect(rows[0].verdict).toContain('fail: the CLI run failed: exit code 1');
  });

  it('writes a row for a state record with no address', async () => {
    const { ctx, runDir } = setup();
    const { rows, recordLeg } = recorder();
    const verdict = await runLeg(ctx, fake({ recordLeg, runDriver: async () => ({ code: 0, screen: '' }) }));
    expect(verdict.pass).toBe(false);
    expect(rows).toEqual([expect.objectContaining({ leg: 'A1', verdict: 'fail: the state record holds no workers.dev address', run: path.basename(runDir) })]);
  });

  it('writes a row when no admin session came of the sign-in', async () => {
    const { ctx, writeRecord } = setup();
    const { rows, recordLeg } = recorder();
    const verdict = await runLeg(ctx, fake({ recordLeg, runDriver: async () => { writeRecord(); return { code: 0, screen: '' }; } }));
    expect(verdict.pass).toBe(false);
    expect(rows[0].verdict).toMatch(/^fail: no admin session/);
  });

  it('writes a row naming the error when the publish throws, and rethrows it', async () => {
    const { ctx, writeRecord } = setup();
    const { rows, recordLeg } = recorder();
    ctx.install.signedIn = true;
    await expect(
      runLeg(ctx, fake({
        recordLeg,
        runDriver: async () => { writeRecord(); return { code: 0, screen: '' }; },
        publishViaAdmin: async () => { throw new Error('publish exploded'); },
      })),
    ).rejects.toThrow('publish exploded');
    expect(rows).toEqual([expect.objectContaining({ leg: 'A1', verdict: 'fail: publish exploded' })]);
  });

  it('joins every failure in the row with "; "', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    try {
      const { ctx, writeRecord } = setup();
      const { rows, recordLeg } = recorder();
      ctx.leg = 'B1';
      ctx.install.signedIn = true;
      vi.stubGlobal('fetch', async () => new Response('nope', { status: 404 }));
      const running = runLeg(ctx, fake({
        recordLeg,
        tailUrlLog: () => ({ stop: async () => {} }),
        runDriver: async () => { writeRecord(); return { code: 0, screen: '' }; },
        publishViaAdmin: async () => ({ entryPath: '/about', alertText: 'wrong', control: null }),
      }));
      // The leg does real file I/O before it polls, so advance the fake clock until it settles.
      let settled = false;
      void running.then(() => { settled = true; }, () => { settled = true; });
      while (!settled) {
        await vi.advanceTimersByTimeAsync(20_000);
        await new Promise((resolve) => setImmediate(resolve));
      }
      const verdict = await running;
      expect(verdict.failures.length).toBeGreaterThan(2);
      expect(rows[0].verdict).toBe(`fail: ${verdict.failures.join('; ')}`);
      expect(rows[0]).toMatchObject({ path: '/about', url: 'https://x.workers.dev/about' });
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('logs a record write that throws and leaves the verdict and the error as they were', async () => {
    const { ctx, writeRecord } = setup();
    const logged: string[] = [];
    ctx.log = (line: string) => logged.push(line);
    const failing = async () => {
      throw new Error('gh is down');
    };
    const verdict = await runLeg(ctx, fake({ recordLeg: failing, runDriver: async () => ({ code: 1, screen: '' }) }));
    expect(verdict.failures[0]).toContain('exit code 1');
    expect(logged.join('\n')).toContain('gh is down');

    ctx.install.signedIn = true;
    await expect(
      runLeg(ctx, fake({
        recordLeg: failing,
        runDriver: async () => { writeRecord(); return { code: 0, screen: '' }; },
        publishViaAdmin: async () => { throw new Error('publish exploded'); },
      })),
    ).rejects.toThrow('publish exploded');
  });

  it('writes one capture per CLI run and hands each URL to handleUrl once', async () => {
    const { ctx, writeRecord, runDir } = setup();
    const handled: string[] = [];
    let n = 0;
    await expect(
      runLeg(ctx, fake({
        recordLeg: recorder().recordLeg,
        runDriver: (async (o: { capturePath: string }) => {
          n += 1;
          writeRecord();
          writeFileSync(o.capturePath, 'x');
          appendFileSync(path.join(runDir, 'urls.log'), `https://example.com/${n}\n`);
          await new Promise((r) => setTimeout(r, 600));
          return { code: 0, screen: '' };
        }),
        handleUrl: async (url: string) => { handled.push(url); return handled.length === 2 ? 'signin' : 'github'; },
        publishViaAdmin: async () => { throw new Error('stop'); },
      })),
    ).rejects.toThrow('stop');
    expect(existsSync(path.join(runDir, 'capture-A1-1.bin'))).toBe(true);
    expect(existsSync(path.join(runDir, 'capture-A1-2.bin'))).toBe(true);
    expect(handled).toEqual(['https://example.com/1', 'https://example.com/2']);
    expect(existsSync(path.join(runDir, 'failed'))).toBe(true);
  });
});

describe('teardown of a failed run', () => {
  const deps = {} as unknown as Parameters<typeof teardownRun>[1];
  function runWith(failed: boolean) {
    const base = mkdtempSync(path.join(tmpdir(), 'gate-runs-'));
    const dir = path.join(base, 'run1');
    mkdirSync(path.join(dir, 'state'), { recursive: true });
    writeFileSync(path.join(dir, 'capture-A1-1.bin'), 'x');
    if (failed) writeFileSync(path.join(dir, 'failed'), 'A1\n');
    return { base, dir };
  }

  it('keeps the captures of a marked run, through teardownRun and teardownStale', async () => {
    const { base, dir } = runWith(true);
    await teardownRun(dir, deps);
    await teardownStale(path.join(base, 'current'), deps);
    expect(existsSync(path.join(dir, 'capture-A1-1.bin'))).toBe(true);
  });

  it('still deletes the captures of a clean run', async () => {
    const { dir } = runWith(false);
    await teardownRun(dir, deps);
    expect(existsSync(path.join(dir, 'capture-A1-1.bin'))).toBe(false);
  });
});
