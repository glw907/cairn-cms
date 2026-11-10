// The mailbox reader: the sign-in message read and the smoke's mailbox check, against stub JMAP servers.
import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { checkMailbox, findSignInMessage, isTrustedRedirect } from '../../../scripts/gate/mail.mjs';

const MAIL_SENDER = 'no-reply@carin-test.org';

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
    expect(result).toEqual({ found: false, reason: 'no matching sign-in message arrived within the budget; the mailbox held 0 messages since the request' });
  });

  it('names the sender and subject of what the mailbox held when nothing matches, never a body or a link', async () => {
    const github: Mail = { ...signIn(), receivedAt: '2026-11-03T10:05:00Z', from: 'noreply@github.com', subject: '[GitHub] A new SSH key was added', text: `https://github.com/settings/keys ${link('https://carin-test.org', 'SECRET')}` };
    const earlier: Mail = signIn({ receivedAt: '2026-11-03T09:00:00Z' });
    const stub = await serve([github, earlier]);
    const result = await findSignInMessage({ ...base, sessionUrl: stub.sessionUrl, budgetMs: 30_000, ...clock() });
    expect(result.found).toBe(false);
    const reason = (result as { reason: string }).reason;
    expect(reason).toContain('the mailbox held 1 message since the request');
    expect(reason).toContain('noreply@github.com');
    expect(reason).toContain('A new SSH key was added');
    expect(reason).not.toContain('SECRET');
    expect(reason).not.toContain('settings/keys');
  });

  /** A server that answers every request with `handler`, returning its origin. */
  async function listen(handler: (request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse, origin: string) => void) {
    const server = createServer((request, response) => handler(request, response, `http://127.0.0.1:${(server.address() as AddressInfo).port}`));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  it('re-sends the credentials when the session URL redirects to another origin, which fetch would strip', async () => {
    // The real session URL (907.life) answers 308 to ward.907.life; a fetch that follows it drops Authorization.
    const wanted = signIn();
    const target = await listen((request, response, origin) => {
      if (!request.headers.authorization) {
        response.statusCode = 200;
        response.end(JSON.stringify({ apiUrl: `${origin}/api`, primaryAccounts: {} }));
        return;
      }
      if (request.url === '/.well-known/jmap') {
        response.end(JSON.stringify({ apiUrl: `${origin}/api`, primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acct' } }));
        return;
      }
      let body = '';
      request.on('data', (chunk) => (body += String(chunk)));
      request.on('end', () => {
        // Like ward, answer an unknown account with a method error, not an HTTP error.
        if (!body.includes('"accountId":"acct"')) {
          response.end(JSON.stringify({ methodResponses: [['error', { type: 'accountNotFound' }, 'q']] }));
          return;
        }
        const list = [{ id: 'm0', receivedAt: wanted.receivedAt, from: [{ email: wanted.from }], to: [{ email: wanted.to }], subject: wanted.subject, textBody: [{ partId: '1' }], bodyValues: { '1': { value: wanted.text } }, mailboxIds: { inbox: true } }];
        response.end(JSON.stringify({ methodResponses: [['Email/query', { ids: ['m0'] }, 'q'], ['Email/get', { list }, 'g']] }));
      });
    });
    const front = await listen((_request, response) => {
      response.statusCode = 308;
      response.setHeader('location', `${target}/.well-known/jmap`);
      response.end();
    });
    // A different hostname, as 907.life to ward.907.life is: that is what makes fetch drop Authorization.
    const result = await findSignInMessage({ ...base, sessionUrl: `${front.replace('127.0.0.1', 'localhost')}/.well-known/jmap`, trustedHosts: ['127.0.0.1'], ...clock() });
    expect(result).toMatchObject({ found: true, from: MAIL_SENDER });
  });

  it('does not take the credentials to a redirect target it does not trust', async () => {
    const target = await listen((request, response) => {
      response.end(JSON.stringify({ seen: request.headers.authorization ?? 'none' }));
    });
    const front = await listen((_request, response) => {
      response.statusCode = 308;
      response.setHeader('location', `${target}/.well-known/jmap`);
      response.end();
    });
    const result = await findSignInMessage({ ...base, sessionUrl: `${front.replace('127.0.0.1', 'localhost')}/.well-known/jmap`, ...clock() });
    expect(result.found).toBe(false);
    expect((result as { reason: string }).reason).toContain('not a trusted host');
  });

  it('throws naming the error type when a JMAP method answers an error, never reading it as an empty mailbox', async () => {
    const origin = await listen((request, response, here) => {
      if (request.url === '/.well-known/jmap') {
        response.end(JSON.stringify({ apiUrl: `${here}/api`, primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acct' } }));
        return;
      }
      response.end(JSON.stringify({ methodResponses: [['error', { type: 'accountNotFound' }, 'q'], ['error', { type: 'accountNotFound' }, 'g']] }));
    });
    await expect(findSignInMessage({ ...base, sessionUrl: `${origin}/.well-known/jmap`, budgetMs: 30_000, ...clock() })).rejects.toThrow('accountNotFound');
  });

  it('fails when the session holds no mail account, naming that and not an empty mailbox', async () => {
    const origin = await listen((_request, response, here) => {
      response.end(JSON.stringify({ apiUrl: `${here}/api`, primaryAccounts: {} }));
    });
    const result = await findSignInMessage({ ...base, sessionUrl: `${origin}/.well-known/jmap`, ...clock() });
    expect(result).toEqual({ found: false, reason: 'the JMAP session holds no mail account for this login' });
  });

  it('fails naming the status when the API call itself is refused', async () => {
    const origin = await listen((request, response, here) => {
      if (request.url === '/.well-known/jmap') {
        response.end(JSON.stringify({ apiUrl: `${here}/api`, primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acct' } }));
        return;
      }
      response.statusCode = 401;
      response.end('no');
    });
    const result = await findSignInMessage({ ...base, sessionUrl: `${origin}/.well-known/jmap`, budgetMs: 30_000, ...clock() });
    expect(result.found).toBe(false);
    expect((result as { reason: string }).reason).toContain('401');
  });

  describe('isTrustedRedirect, the rule that decides where credentials may go', () => {
    const from = new URL('https://907.life/.well-known/jmap');
    const trusted = ['907.life'];
    const allows = (to: string, start: URL = from) => isTrustedRedirect(start, new URL(to), trusted);

    it('trusts the same host and the session host\'s own subdomains over https', () => {
      expect(allows('https://907.life/other')).toBe(true);
      expect(allows('https://ward.907.life/.well-known/jmap')).toBe(true);
    });

    it('refuses a look-alike host, a longer host that ends in the domain, and userinfo that names the real one', () => {
      expect(allows('https://evil907.life/')).toBe(false);
      expect(allows('https://907.life.evil.com/')).toBe(false);
      expect(allows('https://907.life@evil.com/')).toBe(false);
      expect(allows('https://user:pw@ward.907.life/')).toBe(false);
    });

    it('refuses a downgrade from https to http, even on the same host', () => {
      expect(allows('http://907.life/.well-known/jmap')).toBe(false);
      expect(allows('http://ward.907.life/.well-known/jmap')).toBe(false);
    });

    it('lets a plain-http local server redirect within itself, which only the tests use', () => {
      const local = new URL('http://127.0.0.1:8080/a');
      expect(isTrustedRedirect(local, new URL('http://127.0.0.1:9090/b'), [])).toBe(true);
    });
  });

  it('refuses a redirect from https to http on the same host, and never re-sends the credentials in the clear', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      calls.push(String(input));
      return new Response(null, { status: 308, headers: { location: 'http://ward.907.life/.well-known/jmap' } });
    }) as typeof fetch;
    const result = await findSignInMessage({ ...base, sessionUrl: 'https://ward.907.life/.well-known/jmap', fetchImpl, ...clock() });
    expect(result.found).toBe(false);
    expect((result as { reason: string }).reason).toContain('not a trusted host');
    expect(calls).toEqual(['https://ward.907.life/.well-known/jmap']);
  });

  it('refuses an API URL on a host the session does not trust, before any credentialed request reaches it', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      calls.push(String(input));
      return Response.json({ apiUrl: 'https://evil.example/jmap/api', primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acct' } });
    }) as typeof fetch;
    const result = await findSignInMessage({ ...base, sessionUrl: 'https://ward.907.life/.well-known/jmap', fetchImpl, ...clock() });
    expect(result.found).toBe(false);
    expect((result as { reason: string }).reason).toContain('not a trusted host');
    expect(calls).toEqual(['https://ward.907.life/.well-known/jmap']);
  });

  it('refuses an API URL that downgrades the session\'s https to http', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      calls.push(String(input));
      return Response.json({ apiUrl: 'http://ward.907.life/jmap/api', primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acct' } });
    }) as typeof fetch;
    const result = await findSignInMessage({ ...base, sessionUrl: 'https://ward.907.life/.well-known/jmap', fetchImpl, ...clock() });
    expect(result.found).toBe(false);
    expect(calls).toHaveLength(1);
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

describe('checkMailbox', () => {
  const servers: Server[] = [];
  afterEach(() => {
    for (const server of servers.splice(0)) server.close();
  });

  async function listen(api: (body: string) => { status?: number; json?: unknown }, session: unknown = null) {
    const server = createServer((request, response) => {
      const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      if (request.url === '/.well-known/jmap') {
        response.end(JSON.stringify(session ?? { apiUrl: `${origin}/api`, primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acct' } }));
        return;
      }
      let body = '';
      request.on('data', (chunk) => (body += String(chunk)));
      request.on('end', () => {
        const answer = api(body);
        response.statusCode = answer.status ?? 200;
        response.end(JSON.stringify(answer.json ?? {}));
      });
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}/.well-known/jmap`;
  }

  const creds = { login: 'l', password: 'p' };

  it('passes when the account answers its query', async () => {
    const sessionUrl = await listen(() => ({ json: { methodResponses: [['Email/query', { ids: ['m1'] }, 'q']] } }));
    expect(await checkMailbox({ ...creds, sessionUrl })).toEqual({ messages: 1 });
  });

  it('throws on a JMAP method error', async () => {
    const sessionUrl = await listen(() => ({ json: { methodResponses: [['error', { type: 'accountNotFound' }, 'q']] } }));
    await expect(checkMailbox({ ...creds, sessionUrl })).rejects.toThrow('accountNotFound');
  });

  it('throws when the API refuses the call', async () => {
    const sessionUrl = await listen(() => ({ status: 401 }));
    await expect(checkMailbox({ ...creds, sessionUrl })).rejects.toThrow('401');
  });

  it('throws when the session holds no mail account', async () => {
    const sessionUrl = await listen(() => ({}), { apiUrl: 'http://127.0.0.1:1/api', primaryAccounts: {} });
    await expect(checkMailbox({ ...creds, sessionUrl })).rejects.toThrow('no mail account');
  });
});
