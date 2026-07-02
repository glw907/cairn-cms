import { describe, it, expect, vi, afterEach } from 'vitest';
import { githubApp } from '../../lib/doctor/checks-github.js';
import { liveSendCheck } from '../../lib/doctor/check-send.js';
import { CF_API } from '../../lib/doctor/cloudflare-api.js';
import type { DoctorContext } from '../../lib/doctor/types.js';

const GH_API = 'https://api.github.com';

// The same throwaway 2048-bit PKCS#1 key the signing suite uses (NOT a real credential).
// The github.app check signs a real JWT through the engine's chain, so the auth and pass
// cases need a key Web Crypto can import.
const PKCS1_PRIV =
  'MIIEogIBAAKCAQEAqjuCSTwR1eEzy1khaD5Oy9uPlxeJvsza116ROQbLp67InfIdv80t7UmskRt/MkMF3zAxpaVJUnarpVpx4kFnVYmmCOyFKyhPt6tkEp6x9ROf5BYmWtJ44cxnfi4ghdLrPBZ5g+RZ6cA5WcuqVSjAh87qnjGWrZflooOdJaBd40Mt5ZyyT5IpeH7dnAg8CrQkx2fA+rQsejQj0Vp3XViR3TIG2d89H2I2VkjkfZMsFg3+MSmD8iYrU87DywtxQPXIkczOl7WzrJv19ggL5SgtF/KzIuAwEWfie0f7OehzfBp7wnCF1gG+O+df3FvuHsdxtUFRtyhnk/W7Uw9CQvEmyQIDAQABAoIBADu+FsNM6ZV+K4c6CJdlBpJUw9fq0tS7YDIlZiH1WJPIq2+DAR3HDE8yg/WJCOLC0tS5PTM9BraCH0swqrcU7Qb//90x5Kp4w0FaTQyb1SiFcp/BhkRpiTL1YXzPA2rz0sqLuKmpAkUeyQHSkDzCyI7g90X9cTwLCvQ17HjABzMyVG/CK68dn+pMMphE/bl7Ifzla/dTrY/QQmZP7DjxI2zGfMNkJFANWQcxiifgELCv9kxF8gfL/G+knHNVvjQprMptFZEmB6p1RlyRuU7+oKkMCYBJ7czeuzbO+Psmi/WzMlQx0F1q/E+veOgZdA3dlKeWDlbdZjB/CL28Ggea5OECgYEA8JdAxq8o2GATpc/8weLTYlOUbSr5wpUHaEqWrVug6zyklXt4bvN1CLk0IsiFZ7rvFCEcbmwevD+g1q/3GovcPpI0/AL56TBWwVS3rWn8ngAjs9RCkDJhriWvaJqBKjEBzDDCPsjV8d5WE2oppXE3UezfpdHM1q3xu85mZAh+yC8CgYEAtSKneuIcZN0ovLByKqguGYlhbmHxCCz30Omqj8M8/Uoot7EzspxH5sYDMzjQO09FTae75TK01+6Amh4r6whbVOICfyq7VjBweLpVjqVJ1muioBJLjDS5ALduML2BYs0yxnXDmOQVsj77ybwqUBN/4+NU307r8DLNT8hHXjtISocCgYA6XcdGLBoxm+VIVZPRCZEUiog4j7N1xCe+4lF5jwAT8WtQJFsMN53N1vhR8+mBR7VWYc3+79Xo/1qqmpfM5d8xgtC9zo8IRkTVtBK3TD4PqqL+rmDTkJVn5RaPvuPU83ynJ7EIADr+6Vxia1/dFgFAq8F5/dK+xgYd9K2cWP9A2wKBgBwIrAERw7E8pVRmvpSpiND8+S5bTDGmvAgCUhqD7gmJk7myXDz1gQ9PcClaTqgPQbueDS+Q5HpS+GZh6wwqM/B0Nky2MV5Kiu20cQ9tt3rPF9FMY5Lkigl5Wj2C5uaCuawLh+U+z7jRlKiJTccs7Ws4wOb60PtQ8YO6jIkiBbM7AoGAQSMGE+LTnKLHLEp/D4UIAyRGjR2qMGeyxm2q4Y6B29Ou81JutJDPRZu080GeTIGBfg8A/dYUTRkNLlr5eWhB6n6FyQML3saqxOJNuoyWrXfv38S4Smpa/3q55idUX2+7QytRlPMcf9AHbNa/uKQOrlyKS2MTunIBTonUJ4unCeo=';
const PKCS1_PEM = `-----BEGIN RSA PRIVATE KEY-----${PKCS1_PRIV}-----END RSA PRIVATE KEY-----`;

const GITHUB = { appId: '3847496', installationId: '135372268', privateKeyB64: btoa(PKCS1_PEM) };

interface Call {
  url: string;
  init?: RequestInit;
}

/** A scripted fetch that records every call. A plain object return becomes a 200 JSON
 *  response; return a Response directly for non-ok cases. */
function scripted(handler: (url: string, init?: RequestInit) => unknown) {
  const calls: Call[] = [];
  const impl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const out = handler(url, init);
    return out instanceof Response ? out : new Response(JSON.stringify(out), { status: 200 });
  };
  return { fetch: impl as typeof fetch, calls };
}

function ctx(over: Partial<DoctorContext> = {}): DoctorContext {
  return {
    cwd: '/site',
    fetch: (() => {
      throw new Error('unexpected fetch');
    }) as never,
    readFile: async () => null,
    ...over,
  };
}

function header(call: Call, name: string): string | undefined {
  return new Headers(call.init?.headers).get(name) ?? undefined;
}

/** Stub the GLOBAL fetch the signing chain uses for the token mint (installationToken does
 *  its own fetching; only the repo read routes through ctx.fetch). */
function stubMint(response: Response) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('github.app', () => {
  it('skips naming the three env vars when ctx.github is absent', async () => {
    const result = await githubApp.run(ctx({ repo: 'glw907/ecxc-ski' }));
    expect(result.status).toBe('skip');
    expect(result.detail).toContain('GITHUB_APP_ID');
    expect(result.detail).toContain('GITHUB_APP_INSTALLATION_ID');
    expect(result.detail).toContain('GITHUB_APP_PRIVATE_KEY_B64');
  });

  it('skips naming --repo, GITHUB_REPO, and the adapter derivation when ctx.repo is absent', async () => {
    const result = await githubApp.run(ctx({ github: GITHUB }));
    expect(result.status).toBe('skip');
    expect(result.detail).toContain('--repo');
    expect(result.detail).toContain('GITHUB_REPO');
    expect(result.detail).toContain('cairnManifest');
  });

  it('fails on a key that does not parse, before any network call', async () => {
    const mint = stubMint(new Response('unreachable', { status: 500 }));
    const { fetch, calls } = scripted(() => ({}));
    const result = await githubApp.run(
      ctx({ github: { ...GITHUB, privateKeyB64: btoa('not a pem') }, repo: 'glw907/ecxc-ski', fetch })
    );
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('key');
    expect(mint).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it('fails with the mint status when the token exchange is refused', async () => {
    stubMint(new Response('bad credentials', { status: 401 }));
    const { fetch, calls } = scripted(() => ({}));
    const result = await githubApp.run(ctx({ github: GITHUB, repo: 'glw907/ecxc-ski', fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('401');
    expect(calls).toHaveLength(0);
  });

  it('fails naming the repo when the repo read returns non-200', async () => {
    stubMint(new Response(JSON.stringify({ token: 'ghs_install' }), { status: 201 }));
    const { fetch } = scripted(() => new Response('not found', { status: 404 }));
    const result = await githubApp.run(ctx({ github: GITHUB, repo: 'glw907/ecxc-ski', fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('glw907/ecxc-ski');
    expect(result.detail).toContain('404');
  });

  it('passes on 200, minting through the global fetch and reading the repo through ctx.fetch', async () => {
    const mint = stubMint(new Response(JSON.stringify({ token: 'ghs_install' }), { status: 201 }));
    const { fetch, calls } = scripted(() => ({ full_name: 'glw907/ecxc-ski' }));
    const result = await githubApp.run(ctx({ github: GITHUB, repo: 'glw907/ecxc-ski', fetch }));
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('glw907/ecxc-ski');
    expect(String(mint.mock.calls[0][0])).toBe(
      `${GH_API}/app/installations/135372268/access_tokens`
    );
    expect(calls.map((c) => c.url)).toEqual([`${GH_API}/repos/glw907/ecxc-ski`]);
    expect(header(calls[0], 'authorization')).toBe('Bearer ghs_install');
    expect(header(calls[0], 'user-agent')).toBe('cairn-cms');
    expect(header(calls[0], 'x-github-api-version')).toBe('2022-11-28');
  });

  it('never echoes key material in a failure detail', async () => {
    stubMint(new Response('bad credentials', { status: 401 }));
    const { fetch } = scripted(() => ({}));
    const result = await githubApp.run(ctx({ github: GITHUB, repo: 'glw907/ecxc-ski', fetch }));
    expect(result.detail).not.toContain('PRIVATE KEY');
    expect(result.detail).not.toContain(GITHUB.privateKeyB64);
  });

  it('ties to the github.app-unreachable condition', () => {
    expect(githubApp.id).toBe('github.app');
    expect(githubApp.conditionId).toBe('github.app-unreachable');
  });
});

describe('email.live-send', () => {
  const SEND_CREDS = { cfToken: 'tok', cfAccountId: 'acct', from: 'noreply@ecxc.ski' };

  it('skips naming both credential vars when they are absent', async () => {
    const result = await liveSendCheck('geoff@example.com').run(ctx({ from: 'a@ecxc.ski' }));
    expect(result.status).toBe('skip');
    expect(result.detail).toContain('CLOUDFLARE_API_TOKEN');
    expect(result.detail).toContain('CLOUDFLARE_ACCOUNT_ID');
  });

  it('skips naming --from, CAIRN_FROM, and the adapter derivation when the from-address is absent', async () => {
    const result = await liveSendCheck('geoff@example.com').run(
      ctx({ cfToken: 'tok', cfAccountId: 'acct' })
    );
    expect(result.status).toBe('skip');
    expect(result.detail).toContain('--from');
    expect(result.detail).toContain('CAIRN_FROM');
    expect(result.detail).toContain('cairnManifest');
  });

  it('posts the verified send payload and passes on an ok response', async () => {
    const { fetch, calls } = scripted(() => ({ result: { delivered: ['geoff@example.com'] } }));
    const result = await liveSendCheck('geoff@example.com').run(ctx({ ...SEND_CREDS, fetch }));
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('geoff@example.com');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${CF_API}/accounts/acct/email/sending/send`);
    expect(calls[0].init?.method).toBe('POST');
    expect(header(calls[0], 'authorization')).toBe('Bearer tok');
    expect(header(calls[0], 'content-type')).toBe('application/json');
    const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
    expect(body.from).toBe('noreply@ecxc.ski');
    expect(body.to).toBe('geoff@example.com');
    expect(body.subject).toBe('cairn doctor test send');
    expect(typeof body.text).toBe('string');
    expect((body.text as string).length).toBeGreaterThan(0);
  });

  it('fails with the status and a capped body excerpt on a non-ok response', async () => {
    const longBody = JSON.stringify({ errors: [{ code: 1, message: 'x'.repeat(500) }] });
    const { fetch } = scripted(() => new Response(longBody, { status: 403 }));
    const result = await liveSendCheck('geoff@example.com').run(ctx({ ...SEND_CREDS, fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('403');
    expect(result.detail.length).toBeLessThan(300);
  });

  it('fails with the error string when the fetch rejects', async () => {
    const fetch = (async () => {
      throw new Error('socket hang up');
    }) as unknown as typeof globalThis.fetch;
    const result = await liveSendCheck('geoff@example.com').run(ctx({ ...SEND_CREDS, fetch }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('socket hang up');
  });

  it('ties to the email.send-failed condition', () => {
    const check = liveSendCheck('geoff@example.com');
    expect(check.id).toBe('email.live-send');
    expect(check.conditionId).toBe('email.send-failed');
  });
});
