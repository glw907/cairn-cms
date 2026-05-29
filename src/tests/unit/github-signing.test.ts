// src/tests/unit/github-signing.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { appJwt, installationToken, signingSelfTest } from '../../lib/github/signing.js';

// A throwaway 2048-bit RSA keypair (NOT a real credential). The private key is PKCS#1, the
// exact form GitHub issues, so verifying a JWT minted from it exercises the in-Worker
// PKCS#1-to-PKCS#8 conversion Web Crypto's importKey requires.
const PKCS1_PRIV =
  'MIIEogIBAAKCAQEAqjuCSTwR1eEzy1khaD5Oy9uPlxeJvsza116ROQbLp67InfIdv80t7UmskRt/MkMF3zAxpaVJUnarpVpx4kFnVYmmCOyFKyhPt6tkEp6x9ROf5BYmWtJ44cxnfi4ghdLrPBZ5g+RZ6cA5WcuqVSjAh87qnjGWrZflooOdJaBd40Mt5ZyyT5IpeH7dnAg8CrQkx2fA+rQsejQj0Vp3XViR3TIG2d89H2I2VkjkfZMsFg3+MSmD8iYrU87DywtxQPXIkczOl7WzrJv19ggL5SgtF/KzIuAwEWfie0f7OehzfBp7wnCF1gG+O+df3FvuHsdxtUFRtyhnk/W7Uw9CQvEmyQIDAQABAoIBADu+FsNM6ZV+K4c6CJdlBpJUw9fq0tS7YDIlZiH1WJPIq2+DAR3HDE8yg/WJCOLC0tS5PTM9BraCH0swqrcU7Qb//90x5Kp4w0FaTQyb1SiFcp/BhkRpiTL1YXzPA2rz0sqLuKmpAkUeyQHSkDzCyI7g90X9cTwLCvQ17HjABzMyVG/CK68dn+pMMphE/bl7Ifzla/dTrY/QQmZP7DjxI2zGfMNkJFANWQcxiifgELCv9kxF8gfL/G+knHNVvjQprMptFZEmB6p1RlyRuU7+oKkMCYBJ7czeuzbO+Psmi/WzMlQx0F1q/E+veOgZdA3dlKeWDlbdZjB/CL28Ggea5OECgYEA8JdAxq8o2GATpc/8weLTYlOUbSr5wpUHaEqWrVug6zyklXt4bvN1CLk0IsiFZ7rvFCEcbmwevD+g1q/3GovcPpI0/AL56TBWwVS3rWn8ngAjs9RCkDJhriWvaJqBKjEBzDDCPsjV8d5WE2oppXE3UezfpdHM1q3xu85mZAh+yC8CgYEAtSKneuIcZN0ovLByKqguGYlhbmHxCCz30Omqj8M8/Uoot7EzspxH5sYDMzjQO09FTae75TK01+6Amh4r6whbVOICfyq7VjBweLpVjqVJ1muioBJLjDS5ALduML2BYs0yxnXDmOQVsj77ybwqUBN/4+NU307r8DLNT8hHXjtISocCgYA6XcdGLBoxm+VIVZPRCZEUiog4j7N1xCe+4lF5jwAT8WtQJFsMN53N1vhR8+mBR7VWYc3+79Xo/1qqmpfM5d8xgtC9zo8IRkTVtBK3TD4PqqL+rmDTkJVn5RaPvuPU83ynJ7EIADr+6Vxia1/dFgFAq8F5/dK+xgYd9K2cWP9A2wKBgBwIrAERw7E8pVRmvpSpiND8+S5bTDGmvAgCUhqD7gmJk7myXDz1gQ9PcClaTqgPQbueDS+Q5HpS+GZh6wwqM/B0Nky2MV5Kiu20cQ9tt3rPF9FMY5Lkigl5Wj2C5uaCuawLh+U+z7jRlKiJTccs7Ws4wOb60PtQ8YO6jIkiBbM7AoGAQSMGE+LTnKLHLEp/D4UIAyRGjR2qMGeyxm2q4Y6B29Ou81JutJDPRZu080GeTIGBfg8A/dYUTRkNLlr5eWhB6n6FyQML3saqxOJNuoyWrXfv38S4Smpa/3q55idUX2+7QytRlPMcf9AHbNa/uKQOrlyKS2MTunIBTonUJ4unCeo=';
const SPKI_PUB =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqjuCSTwR1eEzy1khaD5Oy9uPlxeJvsza116ROQbLp67InfIdv80t7UmskRt/MkMF3zAxpaVJUnarpVpx4kFnVYmmCOyFKyhPt6tkEp6x9ROf5BYmWtJ44cxnfi4ghdLrPBZ5g+RZ6cA5WcuqVSjAh87qnjGWrZflooOdJaBd40Mt5ZyyT5IpeH7dnAg8CrQkx2fA+rQsejQj0Vp3XViR3TIG2d89H2I2VkjkfZMsFg3+MSmD8iYrU87DywtxQPXIkczOl7WzrJv19ggL5SgtF/KzIuAwEWfie0f7OehzfBp7wnCF1gG+O+df3FvuHsdxtUFRtyhnk/W7Uw9CQvEmyQIDAQAB';
const PKCS1_PEM = `-----BEGIN RSA PRIVATE KEY-----${PKCS1_PRIV}-----END RSA PRIVATE KEY-----`;

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function b64urlToBytes(s: string): Uint8Array {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  return b64ToBytes(norm + '='.repeat((4 - (norm.length % 4)) % 4));
}
// Hand Web Crypto the underlying ArrayBuffer: Uint8Array<ArrayBufferLike> is not a
// BufferSource under the strict workers-types lib (the same wrinkle the signer works around).
function ab(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('appJwt', () => {
  it('mints an RS256 JWT that verifies against the PKCS#1 key', async () => {
    const jwt = await appJwt('3847496', PKCS1_PEM);
    const [header, payload, sig] = jwt.split('.');

    const pubKey = await crypto.subtle.importKey(
      'spki',
      ab(b64ToBytes(SPKI_PUB)),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      pubKey,
      ab(b64urlToBytes(sig)),
      ab(new TextEncoder().encode(`${header}.${payload}`)),
    );
    expect(ok).toBe(true);

    const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
    expect(claims.iss).toBe('3847496');
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(600); // GitHub caps App JWTs at 10 min
  });
});

describe('installationToken', () => {
  it('exchanges the App JWT for an installation token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ token: 'ghs_install' }), { status: 201 }),
    );
    const token = await installationToken({
      appId: '3847496',
      installationId: '135372268',
      privateKeyB64: btoa(PKCS1_PEM),
    });
    expect(token).toBe('ghs_install');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.github.com/app/installations/135372268/access_tokens',
    );
  });

  it('throws on a non-OK token exchange', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('forbidden', { status: 403 }));
    await expect(
      installationToken({ appId: '1', installationId: '2', privateKeyB64: btoa(PKCS1_PEM) }),
    ).rejects.toThrow(/403/);
  });
});

describe('signingSelfTest', () => {
  it('reports ok for a valid key (exercises the PKCS#1 to PKCS#8 path)', async () => {
    expect(await signingSelfTest('3847496', btoa(PKCS1_PEM))).toEqual({ ok: true });
  });

  it('reports a failure detail for a bad key, without throwing', async () => {
    const result = await signingSelfTest('3847496', btoa('not a pem'));
    expect(result.ok).toBe(false);
    expect(result.detail).toBeTruthy();
  });
});
