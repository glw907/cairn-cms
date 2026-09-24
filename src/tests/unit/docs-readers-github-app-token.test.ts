import { describe, it, expect } from 'vitest';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { mintInstallationToken, signAppJwt } from '../../../scripts/docs-readers/lib/github-app-token.js';

/** A fresh RSA keypair, generated once per test file run, for a real RS256 round trip. */
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

/** Decode a JWT's header or payload segment. */
function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as Record<string, unknown>;
}

describe('signAppJwt', () => {
  it('signs a header and payload GitHub itself accepts: RS256, the App id as issuer, a ten-minute window', () => {
    const now = Date.parse('2026-09-23T12:00:00.000Z');
    const jwt = signAppJwt('3847496', privateKey, now);
    const [headerPart, payloadPart, signaturePart] = jwt.split('.');
    expect(decodeSegment(headerPart)).toEqual({ alg: 'RS256', typ: 'JWT' });
    const payload = decodeSegment(payloadPart);
    expect(payload.iss).toBe('3847496');
    expect((payload.exp as number) - (payload.iat as number)).toBe(600);
    // 60 seconds of clock-drift allowance subtracted from the requested `now`.
    expect(payload.iat).toBe(Math.floor(now / 1000) - 60);

    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${headerPart}.${payloadPart}`);
    verifier.end();
    expect(verifier.verify(publicKey, Buffer.from(signaturePart, 'base64url'))).toBe(true);
  });
});

describe('mintInstallationToken', () => {
  it('signs a JWT, posts to the installation access-tokens endpoint, and returns the granted token', async () => {
    const calls: Array<{ url: string; init: { method: string; headers: Record<string, string>; body: string } }> = [];
    const fetchImpl = async (url: string, init: { method: string; headers: Record<string, string>; body: string }) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 201,
        json: async () => ({ token: 'ghs_fake', expires_at: '2026-09-23T13:00:00Z', repositories: [{ name: 'cairn-scratch-b' }] }),
      };
    };
    const result = await mintInstallationToken({
      appId: '3847496',
      privateKeyPem: privateKey,
      installationId: 135372268,
      repositories: ['cairn-scratch-b'],
      permissions: { contents: 'read', metadata: 'read' },
      fetchImpl,
    });
    expect(result).toEqual({ token: 'ghs_fake', expiresAt: '2026-09-23T13:00:00Z', repositories: ['cairn-scratch-b'] });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.github.com/app/installations/135372268/access_tokens');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers.Authorization).toMatch(/^Bearer /);
    expect(JSON.parse(calls[0].init.body)).toEqual({ repositories: ['cairn-scratch-b'], permissions: { contents: 'read', metadata: 'read' } });
  });

  it('throws when GitHub refuses the mint', async () => {
    const fetchImpl = async () => ({ ok: false, status: 404, json: async () => ({}) });
    await expect(
      mintInstallationToken({
        appId: '3847496',
        privateKeyPem: privateKey,
        installationId: 135372268,
        repositories: ['cairn-scratch-b'],
        permissions: { contents: 'read' },
        fetchImpl,
      }),
    ).rejects.toThrow(/status 404/);
  });

  it('throws when the granted repositories differ from what was requested, even though the request succeeded', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 201,
      json: async () => ({ token: 'ghs_fake', expires_at: '2026-09-23T13:00:00Z', repositories: [{ name: 'cairn-scratch-b' }, { name: '907-life' }] }),
    });
    await expect(
      mintInstallationToken({
        appId: '3847496',
        privateKeyPem: privateKey,
        installationId: 135372268,
        repositories: ['cairn-scratch-b'],
        permissions: { contents: 'read' },
        fetchImpl,
      }),
    ).rejects.toThrow(/scope mismatch/);
  });
});
