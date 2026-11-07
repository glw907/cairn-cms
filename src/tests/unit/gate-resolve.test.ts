// The gate's authoritative lookup and its pinned fetch, against injected resolvers and a local HTTPS
// server with a throwaway certificate, so no test touches the network or this machine's resolver.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createServer, type Server } from 'node:https';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { authoritativeAddress } from '../../../scripts/gate/resolve.mjs';
import { gateFetch } from '../../../scripts/gate/fetch-check.mjs';

type Reader = { resolveNs: (n: string) => Promise<string[]>; resolve4: (n: string) => Promise<string[]> };

describe('authoritativeAddress', () => {
  it('asks the zone nameservers directly for the A record', async () => {
    const asked: Array<{ servers?: string[]; name: string }> = [];
    const makeResolver = (servers?: string[]): Reader => ({
      resolveNs: async (name) => {
        asked.push({ servers, name });
        if (name === 'carin-test.org') return ['ns1.example.net'];
        throw new Error('ENODATA');
      },
      resolve4: async (name) => {
        asked.push({ servers, name });
        if (name === 'ns1.example.net') return ['198.51.100.9'];
        if (name === 'carin-test.org' && servers?.[0] === '198.51.100.9') return ['104.21.0.5'];
        throw new Error('ENOTFOUND');
      },
    });
    expect(await authoritativeAddress('carin-test.org', { makeResolver })).toBe('104.21.0.5');
    expect(asked[0].servers).toEqual(['1.1.1.1', '8.8.8.8']);
    expect(asked.at(-1)).toEqual({ servers: ['198.51.100.9'], name: 'carin-test.org' });
  });

  it('finds the zone from a subdomain by trying each parent', async () => {
    const makeResolver = (servers?: string[]): Reader => ({
      resolveNs: async (name) => (name === 'carin-test.org' ? ['ns1.example.net'] : []),
      resolve4: async (name) => (name === 'ns1.example.net' ? ['198.51.100.9'] : servers?.[0] === '198.51.100.9' ? ['104.21.0.6'] : []),
    });
    expect(await authoritativeAddress('www.carin-test.org', { makeResolver })).toBe('104.21.0.6');
  });

  it('tries the next nameserver when one gives no answer', async () => {
    const makeResolver = (servers?: string[]): Reader => ({
      resolveNs: async () => ['ns1.example.net', 'ns2.example.net'],
      resolve4: async (name) => {
        if (name === 'ns1.example.net') return ['198.51.100.1'];
        if (name === 'ns2.example.net') return ['198.51.100.2'];
        if (servers?.[0] === '198.51.100.2') return ['104.21.0.7'];
        throw new Error('SERVFAIL');
      },
    });
    expect(await authoritativeAddress('carin-test.org', { makeResolver })).toBe('104.21.0.7');
  });

  it('returns null when no nameserver is found or none answers', async () => {
    const none = (): Reader => ({ resolveNs: async () => { throw new Error('ENODATA'); }, resolve4: async () => [] });
    expect(await authoritativeAddress('carin-test.org', { makeResolver: none })).toBeNull();
    const broken = () => { throw new Error('no resolver'); };
    expect(await authoritativeAddress('carin-test.org', { makeResolver: broken })).toBeNull();
  });
});

describe('gateFetch', () => {
  let dir: string;
  const servers: Server[] = [];
  const makeCert = (cn: string, name: string) => {
    const key = path.join(dir, `${name}.key`);
    const cert = path.join(dir, `${name}.crt`);
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', `/CN=${cn}`, '-addext', `subjectAltName=DNS:${cn}`], { stdio: 'ignore' });
    return { key: readFileSync(key), cert: readFileSync(cert) };
  };
  async function serve(tls: { key: Buffer; cert: Buffer }, handler: (url: string, host: string) => { status: number; headers?: Record<string, string>; body: string }) {
    const hosts: string[] = [];
    const server = createServer(tls, (request, response) => {
      hosts.push(request.headers.host ?? '');
      const answer = handler(request.url ?? '', request.headers.host ?? '');
      response.writeHead(answer.status, answer.headers ?? {});
      response.end(answer.body);
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return { port: (server.address() as AddressInfo).port, hosts };
  }
  const failing = (async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'gate-resolve-'));
  });
  afterAll(() => {
    for (const server of servers) server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('retries through a pinned request when the global fetch throws, and reads the body', async () => {
    const tls = makeCert('carin-test.org', 'good');
    const { port, hosts } = await serve(tls, () => ({ status: 200, body: 'marker-live' }));
    const resolved: string[] = [];
    const answer = await gateFetch(`https://carin-test.org:${port}/about`, { headers: { 'cache-control': 'no-cache' } }, {
      fetchImpl: failing,
      resolveAddress: async (domain) => { resolved.push(domain); return '127.0.0.1'; },
      ca: tls.cert,
    });
    expect(answer.status).toBe(200);
    expect(await answer.text()).toBe('marker-live');
    expect(resolved).toEqual(['carin-test.org']);
    expect(hosts).toEqual([`carin-test.org:${port}`]);
  });

  it('follows a same-host redirect and stops at a cross-host one', async () => {
    const tls = makeCert('carin-test.org', 'redirect');
    const { port } = await serve(tls, (url) => {
      if (url === '/old') return { status: 301, headers: { location: '/new' }, body: '' };
      if (url === '/away') return { status: 302, headers: { location: 'https://elsewhere.example/' }, body: '' };
      return { status: 200, body: 'arrived' };
    });
    const options = { fetchImpl: failing, resolveAddress: async () => '127.0.0.1', ca: tls.cert };
    expect(await (await gateFetch(`https://carin-test.org:${port}/old`, {}, options)).text()).toBe('arrived');
    expect((await gateFetch(`https://carin-test.org:${port}/away`, {}, options)).status).toBe(302);
  });

  it('does not pin when the global fetch works', async () => {
    let resolved = false;
    const working = (async () => new Response('plain', { status: 200 })) as unknown as typeof fetch;
    const answer = await gateFetch('https://carin-test.org/', {}, { fetchImpl: working, resolveAddress: async () => { resolved = true; return '127.0.0.1'; } });
    expect(await answer.text()).toBe('plain');
    expect(resolved).toBe(false);
  });

  it('rethrows the original error when no authoritative address is found', async () => {
    await expect(gateFetch('https://carin-test.org/', {}, { fetchImpl: failing, resolveAddress: async () => null })).rejects.toThrow('fetch failed');
  });

  it('rejects a certificate for another name', async () => {
    const tls = makeCert('other.example', 'wrong');
    const { port } = await serve(tls, () => ({ status: 200, body: 'should not be read' }));
    await expect(
      gateFetch(`https://carin-test.org:${port}/`, {}, { fetchImpl: failing, resolveAddress: async () => '127.0.0.1', ca: tls.cert }),
    ).rejects.toThrow(/altnames|certificate|match/i);
  });
});
