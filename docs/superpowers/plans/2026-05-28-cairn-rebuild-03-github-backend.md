# GitHub Read-and-Commit Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build cairn's GitHub backend: list a concept's directory through the Git Trees API, read a single file, mint a short-lived GitHub App install token signed in-Worker with Web Crypto, and commit an edit with the author set to the editor and the committer left to `cairn-cms[bot]`. A stale-SHA 409 fails safe as a typed conflict.

**Architecture:** I/O at the edge of the engine, under `src/lib/github/`. The module talks to the GitHub REST API over `fetch` and signs App JWTs with Web Crypto, so it runs unchanged in workerd. It reads its repo coordinates from `BackendConfig` (Plan 02) and its private key from a Worker secret. Three concerns split into three modules: signing (the App JWT, the PKCS#1-to-PKCS#8 conversion Web Crypto requires, the install-token exchange, a deploy-time self-test), repo access (Trees-API listing, the single-file read, the SHA-checked commit), and a small credentials bridge that assembles the signer's input from the adapter's backend config and the Worker's secret. The commit path fails safe on a lost SHA race rather than merging. Ported from `legacy/src/lib/github.ts`, with listing moved off the contents API and onto the Trees API.

**Tech Stack:** TypeScript 6 (strict, NodeNext), Web Crypto (`crypto.subtle`), the GitHub REST API over `fetch`. No octokit. Every test runs in the node `unit` project against a mocked `fetch` and real Web Crypto; the integration project is untouched this plan.

---

## Spec mapping

This plan implements spec §7.3 (read and list) and the commit half of §7.4 (App signing, `commitFile` with editor-as-author and `cairn-cms[bot]`-as-committer, the 409 fail-safe). It consumes `BackendConfig` from §8 (Plan 02). Plan 02 already landed the model half of §7.4 (frontmatter forms, server-side validation); the save action that wires validation to `commitFile`, the editor surface (§7.6), and `/admin/healthz` calling the self-test (§7.8) are Plan 05; nav editing's reuse of `commitFile` (§7.7) is Plan 06; the render pipeline (§7.5) is Plan 04.

The acceptance scenarios this plan's logic underpins are §10 scenarios 14 (commit attribution and a clean diff) and 15 (the conflict fail-safe). Plan 05 covers the full save round-trip through the form; this plan proves the backend in isolation against the spec §9 unit layer (the JWT signing and PKCS#1-to-PKCS#8 conversion, the `commitFile` request body shape, the 409 path), all against a mocked `fetch`.

## File structure

New engine modules:

- `src/lib/github/types.ts`: the backend's plain types and the typed conflict error (`RepoRef`, `RepoFile`, `CommitAuthor`, `AppCredentials`, `CommitConflictError`). `RepoRef` is the `{ owner, repo, branch }` subset of `BackendConfig`, so an adapter's `backend` is assignable wherever a `RepoRef` is wanted, with no conversion.
- `src/lib/github/signing.ts`: the GitHub App auth path (`appJwt`, `installationToken`, `signingSelfTest`) and the in-Worker key conversion (`pemToPkcs8`, `pkcs1ToPkcs8`, kept private). Ported from legacy.
- `src/lib/github/repo.ts`: repo reads and the commit (`treeUrl`, `markdownFilesIn`, `listMarkdown`, `contentsUrl`, `readRaw`, `fileSha`, `commitFile`). Listing uses the Trees API; the rest port from legacy.
- `src/lib/github/credentials.ts`: the bridge `appCredentials(backend, env)`, which assembles `AppCredentials` from a `BackendConfig` and the Worker's `GITHUB_APP_PRIVATE_KEY_B64` secret, throwing a named error when the secret is unset.

Modified:

- `src/lib/index.ts`: re-export the GitHub backend surface under the `.` subpath.

Tests (all in the `unit` project):

- `src/tests/unit/github-types.test.ts`
- `src/tests/unit/github-signing.test.ts`
- `src/tests/unit/github-read.test.ts`
- `src/tests/unit/github-commit.test.ts`
- `src/tests/unit/github-credentials.test.ts`

## Divergences from the legacy backend, by design

Two deliberate changes from `legacy/src/lib/github.ts`:

- **Listing moves to the Git Trees API.** Legacy listed a directory through the contents API, which silently truncates at 1,000 entries (spec §7.3). This plan fetches the branch tree recursively and filters to the markdown blobs directly under the concept directory. Tree entries carry full repo paths, so the basename is stripped before deriving the id; `idFromFilename` (Plan 02) expects a basename, not a path. The recursive-tree cap (100,000 entries) sits far beyond any concept directory, and sharding is deferred until one approaches it (spec §7.3).
- **The credentials bridge is new.** Legacy assembled `AppCredentials` inline at the call site. This plan adds `appCredentials(backend, env)` so the `BackendConfig`-to-`AppCredentials` join, and the named failure when the key secret is missing, live in one tested place rather than in the save action (engine-fat rule). It mirrors `requireDb`/`requireOrigin` in `env.ts`: a missing binding gets a clear error, not a deep `TypeError`.

The signing path is carried over unchanged. GitHub issues PKCS#1 private keys, and Web Crypto's `importKey` takes only PKCS#8, so the key is wrapped in-process. The self-test exercises that brittle conversion so `/admin/healthz` (Plan 05) catches a bad or rotated key before an editor's save fails.

---

## Task 1: Backend types and the typed conflict error

**Files:**
- Create: `src/lib/github/types.ts`
- Test: `src/tests/unit/github-types.test.ts`

The backend's data shapes and its one runtime value, `CommitConflictError`. The error is defined and caught inside the package so an `instanceof` check is reliable; a kit-style `error`/`redirect` would split identity across the peer boundary. `RepoRef` is the `{ owner, repo, branch }` subset of `BackendConfig`, so the commit and read functions take a `RepoRef` and an adapter's `backend` passes straight in.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/github-types.test.ts
import { describe, it, expect } from 'vitest';
import { CommitConflictError, type RepoRef } from '../../lib/github/types.js';
import type { BackendConfig } from '../../lib/content/types.js';

describe('CommitConflictError', () => {
  it('carries the path and a stable name, and is an Error', () => {
    const err = new CommitConflictError('src/content/posts/x.md');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CommitConflictError);
    expect(err.name).toBe('CommitConflictError');
    expect(err.path).toBe('src/content/posts/x.md');
    expect(err.message).toContain('src/content/posts/x.md');
  });
});

describe('RepoRef', () => {
  it('accepts a BackendConfig wherever a RepoRef is wanted', () => {
    const backend: BackendConfig = {
      owner: 'glw907',
      repo: 'ecnordic-ski',
      branch: 'main',
      appId: '1',
      installationId: '2',
    };
    // A BackendConfig is structurally a RepoRef; this assignment must type-check.
    const ref: RepoRef = backend;
    expect(ref.owner).toBe('glw907');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- github-types`
Expected: FAIL, cannot resolve `../../lib/github/types.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/github/types.ts
// cairn-cms: the GitHub backend's plain data types and its one typed error. The backend
// reads repo coordinates from the adapter's `BackendConfig` (spec §8); `RepoRef` is the
// `{ owner, repo, branch }` subset, so `backend` is assignable wherever a `RepoRef` is
// wanted with no conversion.

/** Repo coordinates pinned to a branch: the structural subset of `BackendConfig` the read and commit paths need. */
export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

/** A markdown file in a concept directory. `id` is the filename without `.md`. */
export interface RepoFile {
  id: string;
  name: string;
  path: string;
}

/** A commit author: the signed-in editor (spec §7.4). The committer is left to the App. */
export interface CommitAuthor {
  name: string;
  email: string;
}

/** What the App signer needs: the app id, the installation, and the base64 PEM secret. */
export interface AppCredentials {
  appId: string;
  installationId: string;
  /** The stored `GITHUB_APP_PRIVATE_KEY_B64`: base64 of the PEM, single line. */
  privateKeyB64: string;
}

/**
 * A concurrent edit lost the SHA race: the file changed between the read and the PUT, from
 * another editor or the site's own CI. Thrown so the save fails safe (re-fetch and ask the
 * editor to reapply) instead of surfacing a raw 409. Defined and caught inside the package
 * so `instanceof` is reliable, unlike kit's `redirect`/`error` across the peer boundary.
 */
export class CommitConflictError extends Error {
  constructor(public readonly path: string) {
    super(`Commit conflict on ${path}: it changed since it was opened`);
    this.name = 'CommitConflictError';
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- github-types`
Expected: PASS, two tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/github/types.ts src/tests/unit/github-types.test.ts
git commit -m "feat(github): add backend types and the typed conflict error"
```

---

## Task 2: GitHub App signing and the install token

**Files:**
- Create: `src/lib/github/signing.ts`
- Test: `src/tests/unit/github-signing.test.ts`

The App auth path: mint an RS256 JWT signed in-Worker, exchange it for a short-lived install token, and a self-test that exercises the conversion without a network call. GitHub issues PKCS#1 keys and Web Crypto imports only PKCS#8, so the key is wrapped in-process (see the `[[github-app-key-pkcs1-pkcs8]]` decision). Ported from legacy. The test mints a JWT from a throwaway PKCS#1 key and verifies it against the matching public key, so the whole conversion-and-sign path runs.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- github-signing`
Expected: FAIL, cannot resolve `../../lib/github/signing.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/github/signing.ts
// cairn-cms: the GitHub App auth path. Mint an RS256 App JWT signed in-Worker with Web
// Crypto, exchange it for a short-lived installation access token, and self-test the
// brittle key conversion. GitHub issues PKCS#1 private keys and Web Crypto's importKey
// takes only PKCS#8, so the key is wrapped in-process. No octokit: it is heavy and pulls
// Node built-ins the Worker bundle should not carry.
import type { AppCredentials } from './types.js';

const API = 'https://api.github.com';
const encoder = new TextEncoder();

/** Encode bytes as unpadded base64url (RFC 4648 §5), the JWT wire format. */
function bytesToB64url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

// TextEncoder/atob produce Uint8Arrays whose generic buffer type no longer satisfies Web
// Crypto's BufferSource under strict lib types; hand the underlying ArrayBuffer over.
function buf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** DER length octets for a value of `n` bytes (short form < 128, else long form). */
function derLength(n: number): number[] {
  if (n < 0x80) return [n];
  const out: number[] = [];
  for (let v = n; v > 0; v >>= 8) out.unshift(v & 0xff);
  return [0x80 | out.length, ...out];
}

// AlgorithmIdentifier for rsaEncryption (OID 1.2.840.113549.1.1.1) with NULL parameters.
const RSA_ALG_ID = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];

/** Wrap a PKCS#1 RSAPrivateKey (DER) as PKCS#8 (the only RSA form Web Crypto importKey takes). */
function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  const octet = [0x04, ...derLength(pkcs1.length), ...pkcs1];
  const body = [0x02, 0x01, 0x00, ...RSA_ALG_ID, ...octet];
  return Uint8Array.from([0x30, ...derLength(body.length), ...body]);
}

/** Decode a PEM private key to PKCS#8 DER, converting from PKCS#1 (GitHub's format) if needed. */
function pemToPkcs8(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return pem.includes('RSA PRIVATE KEY') ? pkcs1ToPkcs8(der) : der;
}

/** Mint a GitHub App JWT (RS256), valid ~9 min, with `iat` backdated for clock skew. */
export async function appJwt(appId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = bytesToB64url(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = bytesToB64url(encoder.encode(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId })));
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    buf(pemToPkcs8(privateKeyPem)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, buf(encoder.encode(signingInput)));
  return `${signingInput}.${bytesToB64url(new Uint8Array(sig))}`;
}

/** Exchange the App JWT for a short-lived installation access token. */
export async function installationToken(creds: AppCredentials): Promise<string> {
  const jwt = await appJwt(creds.appId, atob(creds.privateKeyB64));
  const res = await fetch(`${API}/app/installations/${creds.installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${jwt}`,
      'User-Agent': 'cairn-cms',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`GitHub installation token failed: ${res.status}`);
  return ((await res.json()) as { token: string }).token;
}

/**
 * Deploy-time self-test for the App signer: sign a dummy JWT with the configured key. It
 * exercises the brittle PKCS#1-to-PKCS#8 conversion and the Web Crypto import and sign with
 * no network call and no secret in the result, so `/admin/healthz` (Plan 05) catches a bad
 * or rotated key before an editor's save fails. Returns `{ ok: false, detail }`, never throws.
 */
export async function signingSelfTest(appId: string, privateKeyB64: string): Promise<{ ok: boolean; detail?: string }> {
  try {
    const jwt = await appJwt(appId, atob(privateKeyB64));
    if (jwt.split('.').length !== 3) return { ok: false, detail: 'malformed JWT' };
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'sign failed' };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- github-signing`
Expected: PASS, JWT verify, install-token exchange and its error path, and both self-test cases green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/github/signing.ts src/tests/unit/github-signing.test.ts
git commit -m "feat(github): add App JWT signing, the install token, and the self-test"
```

---

## Task 3: Read and list through the Git Trees API

**Files:**
- Create: `src/lib/github/repo.ts`
- Test: `src/tests/unit/github-read.test.ts`

Listing a concept directory uses the Git Trees API, not the contents API, because the contents API silently truncates a directory at 1,000 entries (spec §7.3). The branch tree is fetched recursively and filtered to the markdown blobs directly under the directory. Tree entries carry full repo paths, so the basename is stripped before `idFromFilename`, which expects a basename (Plan 02 carryover). A single-file read uses the contents API with the raw media type, returning null on 404; content over 1 MB is the documented cap, with sharding deferred.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/github-read.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  treeUrl,
  markdownFilesIn,
  listMarkdown,
  contentsUrl,
  readRaw,
} from '../../lib/github/repo.js';
import type { RepoRef } from '../../lib/github/types.js';

const REPO: RepoRef = { owner: 'glw907', repo: 'ecnordic-ski', branch: 'main' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('treeUrl', () => {
  it('targets the recursive Git Trees API at the configured branch', () => {
    expect(treeUrl(REPO)).toBe(
      'https://api.github.com/repos/glw907/ecnordic-ski/git/trees/main?recursive=1',
    );
  });
});

describe('markdownFilesIn', () => {
  it('keeps markdown blobs directly in the directory and strips the path to an id', () => {
    const files = markdownFilesIn('src/content/posts', [
      { path: 'src/content/posts/2026-05-new.md', type: 'blob' },
      { path: 'src/content/posts/2025-01-old.md', type: 'blob' },
      { path: 'src/content/posts/.gitkeep', type: 'blob' }, // not markdown
      { path: 'src/content/posts/drafts', type: 'tree' }, // a subtree
      { path: 'src/content/posts/drafts/wip.md', type: 'blob' }, // nested, excluded
      { path: 'src/content/pages/about.md', type: 'blob' }, // another directory
    ]);
    expect(files).toEqual([
      { id: '2026-05-new', name: '2026-05-new.md', path: 'src/content/posts/2026-05-new.md' },
      { id: '2025-01-old', name: '2025-01-old.md', path: 'src/content/posts/2025-01-old.md' },
    ]);
  });

  it('sorts newest id first', () => {
    const files = markdownFilesIn('p', [
      { path: 'p/2025-01-old.md', type: 'blob' },
      { path: 'p/2026-05-new.md', type: 'blob' },
    ]);
    expect(files.map((f) => f.id)).toEqual(['2026-05-new', '2025-01-old']);
  });

  it('tolerates a directory given with surrounding slashes', () => {
    const files = markdownFilesIn('/p/', [{ path: 'p/a.md', type: 'blob' }]);
    expect(files.map((f) => f.id)).toEqual(['a']);
  });
});

describe('listMarkdown', () => {
  it('fetches the recursive tree and returns its markdown files', async () => {
    const tree = {
      truncated: false,
      tree: [
        { path: 'src/content/posts/a.md', type: 'blob' },
        { path: 'src/content/posts/b', type: 'tree' },
      ],
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(tree), { status: 200 }),
    );
    const files = await listMarkdown(REPO, 'src/content/posts');
    expect(files).toEqual([{ id: 'a', name: 'a.md', path: 'src/content/posts/a.md' }]);
    expect(fetchMock.mock.calls[0][0]).toBe(treeUrl(REPO));
  });

  it('throws on a non-OK tree response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('rate limited', { status: 403 }));
    await expect(listMarkdown(REPO, 'd')).rejects.toThrow(/403/);
  });
});

describe('contentsUrl', () => {
  it('targets the contents API at the configured branch and trims slashes', () => {
    expect(contentsUrl(REPO, '/src/content/posts/a.md/')).toBe(
      'https://api.github.com/repos/glw907/ecnordic-ski/contents/src/content/posts/a.md?ref=main',
    );
  });
});

describe('readRaw', () => {
  it('returns the raw file body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('# Hello', { status: 200 }));
    expect(await readRaw(REPO, 'd/a.md')).toBe('# Hello');
  });

  it('returns null for a missing file', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not found', { status: 404 }));
    expect(await readRaw(REPO, 'd/missing.md')).toBeNull();
  });

  it('sends a bearer token when one is supplied', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('x', { status: 200 }));
    await readRaw(REPO, 'd/a.md', 'tok123');
    const headers = new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get('Authorization')).toBe('Bearer tok123');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- github-read`
Expected: FAIL, cannot resolve `../../lib/github/repo.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/github/repo.ts
// cairn-cms: repo reads and the commit, over the GitHub REST API. Listing a concept
// directory uses the Git Trees API (the contents API silently truncates at 1,000 entries,
// spec §7.3); a single-file read uses the contents API. The commit and its 409 fail-safe
// land in Task 4. An optional token lifts reads to the authenticated rate limit and unlocks
// private repos; ecnordic's repo is public, 907's is not.
import { idFromFilename } from '../content/ids.js';
import { CommitConflictError } from './types.js';
import type { CommitAuthor, RepoFile, RepoRef } from './types.js';

const API = 'https://api.github.com';

/** Standard GitHub API headers, with a bearer token when one is supplied. */
function ghHeaders(accept: string, token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    'User-Agent': 'cairn-cms',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** The recursive Git Trees API URL for the configured branch. */
export function treeUrl(repo: RepoRef): string {
  return `${API}/repos/${repo.owner}/${repo.repo}/git/trees/${encodeURIComponent(repo.branch)}?recursive=1`;
}

/** A Git Trees API entry: a full repo path and whether it is a blob or a subtree. */
interface TreeEntry {
  path: string;
  type: string;
}

/** The basename of a repo path: the segment after the last slash. */
function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * Markdown files directly in `dir`, newest id first. Tree entries carry full repo paths, so
 * the directory prefix is stripped to a basename before deriving the id. Nested files, non
 * markdown, and other directories are dropped.
 */
export function markdownFilesIn(dir: string, tree: TreeEntry[]): RepoFile[] {
  const clean = dir.replace(/^\/+|\/+$/g, '');
  const prefix = `${clean}/`;
  return tree
    .filter((entry) => entry.type === 'blob' && entry.path.startsWith(prefix) && entry.path.endsWith('.md'))
    .filter((entry) => !entry.path.slice(prefix.length).includes('/'))
    .map((entry) => {
      const name = basename(entry.path);
      return { id: idFromFilename(name), name, path: entry.path };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

/** List the markdown files in a concept directory through the Git Trees API. */
export async function listMarkdown(repo: RepoRef, dir: string, token?: string): Promise<RepoFile[]> {
  const res = await fetch(treeUrl(repo), { headers: ghHeaders('application/vnd.github+json', token) });
  if (!res.ok) throw new Error(`GitHub tree ${repo.branch} failed: ${res.status}`);
  const body = (await res.json()) as { tree: TreeEntry[] };
  return markdownFilesIn(dir, body.tree);
}

/** The contents-API URL for a repo path, pinned to the configured branch. */
export function contentsUrl(repo: RepoRef, path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `${API}/repos/${repo.owner}/${repo.repo}/contents/${clean}?ref=${encodeURIComponent(repo.branch)}`;
}

/**
 * Fetch a file's raw markdown, or null if it does not exist. The contents API caps a raw
 * read at 1 MB; a concept's files sit far below that, and sharding is deferred until one
 * approaches it (spec §7.3).
 */
export async function readRaw(repo: RepoRef, path: string, token?: string): Promise<string | null> {
  const res = await fetch(contentsUrl(repo, path), { headers: ghHeaders('application/vnd.github.raw', token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read ${path} failed: ${res.status}`);
  return res.text();
}

export { ghHeaders, API, CommitConflictError };
export type { CommitAuthor };
```

Note: `ghHeaders`, `API`, the `CommitConflictError` re-export, and the `CommitAuthor` type re-export are kept module-local for Task 4's commit functions, which land in this same file. Task 4 removes the temporary re-exports of `CommitConflictError`/`CommitAuthor` once `commitFile` uses them directly; the final exported surface is set when the package barrel is wired in Task 6.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- github-read`
Expected: PASS, the Trees-API URL, the filtering and basename stripping, the sort, both list cases, the contents URL, and the three read cases green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/github/repo.ts src/tests/unit/github-read.test.ts
git commit -m "feat(github): list through the Trees API and read a single file"
```

---

## Task 4: Commit with editor-as-author and the 409 fail-safe

**Files:**
- Modify: `src/lib/github/repo.ts`
- Test: `src/tests/unit/github-commit.test.ts`

A valid save reads the current blob SHA, then PUTs the new content with the author set to the editor and the committer omitted, so GitHub records the committer as `cairn-cms[bot]` (spec §7.4). When the file is new there is no SHA. When the file changed between the read and the PUT, GitHub returns 409, which becomes a `CommitConflictError`; the save fails safe and does not merge.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/github-commit.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fileSha, commitFile } from '../../lib/github/repo.js';
import { CommitConflictError, type RepoRef } from '../../lib/github/types.js';

const REPO: RepoRef = { owner: 'glw907', repo: 'ecnordic-ski', branch: 'main' };

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fileSha', () => {
  it('returns the current blob sha', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ sha: 'abc' }), { status: 200 }),
    );
    expect(await fileSha(REPO, 'd/a.md', 'tok')).toBe('abc');
  });

  it('returns null for a file that does not yet exist', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('missing', { status: 404 }));
    expect(await fileSha(REPO, 'd/new.md', 'tok')).toBeNull();
  });
});

describe('commitFile', () => {
  it('updates an existing file: author = editor, committer omitted, sha passed', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'oldsha' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ commit: { sha: 'newsha' } }), { status: 200 }));

    const sha = await commitFile(
      REPO,
      'src/content/posts/2026-05-x.md',
      '# hi',
      { message: 'Update posts: 2026-05-x', author: { name: 'Geoff Wright', email: 'g@907.life' } },
      'tok',
    );

    expect(sha).toBe('newsha');
    const put = fetchMock.mock.calls[1];
    expect(put[0]).toBe('https://api.github.com/repos/glw907/ecnordic-ski/contents/src/content/posts/2026-05-x.md');
    expect((put[1] as RequestInit).method).toBe('PUT');
    const sent = JSON.parse((put[1] as RequestInit).body as string);
    expect(sent.author).toEqual({ name: 'Geoff Wright', email: 'g@907.life' });
    expect(sent.committer).toBeUndefined();
    expect(sent.sha).toBe('oldsha');
    expect(sent.branch).toBe('main');
    expect(new TextDecoder().decode(b64ToBytes(sent.content))).toBe('# hi');
  });

  it('creates a new file: no sha in the request body', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ commit: { sha: 'created' } }), { status: 201 }));

    await commitFile(REPO, 'src/content/pages/new.md', 'x', { message: 'm', author: { name: 'n', email: 'e' } }, 'tok');
    const sent = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect('sha' in sent).toBe(false);
  });

  it('throws CommitConflictError on a stale-sha 409', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'oldsha' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{"message":"is at abc but expected def"}', { status: 409 }));

    await expect(
      commitFile(REPO, 'src/content/posts/2026-05-x.md', '# hi', { message: 'm', author: { name: 'n', email: 'e' } }, 'tok'),
    ).rejects.toBeInstanceOf(CommitConflictError);
  });

  it('throws on any other non-OK commit response', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response('server error', { status: 500 }));

    await expect(
      commitFile(REPO, 'd/a.md', 'x', { message: 'm', author: { name: 'n', email: 'e' } }, 'tok'),
    ).rejects.toThrow(/500/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- github-commit`
Expected: FAIL, `fileSha` and `commitFile` are not exported from `repo.ts`.

- [ ] **Step 3: Write the implementation**

Append the commit path to `src/lib/github/repo.ts`, and drop the temporary `CommitConflictError`/`CommitAuthor` re-exports from Task 3 (they are used directly here, and the package barrel in Task 6 sets the exported surface). Add to the file:

```ts
/** Standard (padded) base64 of UTF-8 text, the form the contents API expects. */
function toBase64(text: string): string {
  return btoa(Array.from(new TextEncoder().encode(text), (b) => String.fromCharCode(b)).join(''));
}

/** The current blob sha for a path, or null if the file does not yet exist. */
export async function fileSha(repo: RepoRef, path: string, token: string): Promise<string | null> {
  const res = await fetch(contentsUrl(repo, path), { headers: ghHeaders('application/vnd.github+json', token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub stat ${path} failed: ${res.status}`);
  return ((await res.json()) as { sha: string }).sha;
}

/**
 * Commit `content` to `path` on the configured branch through the contents API. The author is
 * the editor; the committer is omitted, so GitHub attributes it to the App (`cairn-cms[bot]`).
 * Updates the file in place when it exists (passing its sha), creates it otherwise. Returns the
 * commit sha. A stale-sha 409 (someone committed in between) becomes a `CommitConflictError`,
 * so the save fails safe: re-fetch and ask the editor to reapply, never a merge.
 */
export async function commitFile(
  repo: RepoRef,
  path: string,
  content: string,
  opts: { message: string; author: CommitAuthor },
  token: string,
): Promise<string> {
  const sha = await fileSha(repo, path, token);
  const url = `${API}/repos/${repo.owner}/${repo.repo}/contents/${path.replace(/^\/+|\/+$/g, '')}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders('application/vnd.github+json', token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: opts.message,
      content: toBase64(content),
      branch: repo.branch,
      author: opts.author,
      ...(sha ? { sha } : {}),
    }),
  });
  if (res.status === 409) throw new CommitConflictError(path);
  if (!res.ok) throw new Error(`GitHub commit ${path} failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { commit: { sha: string } }).commit.sha;
}
```

After appending, the `export { ghHeaders, API, CommitConflictError }` and `export type { CommitAuthor }` re-export lines from Task 3 are removed; `CommitConflictError` and `CommitAuthor` stay imported from `./types.js` and used directly. The module's exported surface is then `treeUrl`, `markdownFilesIn`, `listMarkdown`, `contentsUrl`, `readRaw`, `fileSha`, `commitFile`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- github-commit`
Expected: PASS, the update path with editor-as-author and omitted committer, the create path, the 409 fail-safe, and the other-error path green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/github/repo.ts src/tests/unit/github-commit.test.ts
git commit -m "feat(github): commit with editor-as-author and a 409 fail-safe"
```

---

## Task 5: The credentials bridge

**Files:**
- Create: `src/lib/github/credentials.ts`
- Test: `src/tests/unit/github-credentials.test.ts`

`appCredentials(backend, env)` joins the adapter's `BackendConfig` (the app id and installation) with the Worker's private-key secret into the `AppCredentials` the signer takes. A missing secret throws a named error, so a misconfigured Worker fails clearly rather than deep in signing. It mirrors `requireDb`/`requireOrigin` in `env.ts`, and keeps the join out of the save action (engine-fat rule).

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/github-credentials.test.ts
import { describe, it, expect } from 'vitest';
import { appCredentials } from '../../lib/github/credentials.js';
import type { BackendConfig } from '../../lib/content/types.js';

const backend: BackendConfig = {
  owner: 'glw907',
  repo: 'ecnordic-ski',
  branch: 'main',
  appId: '3847496',
  installationId: '135372268',
};

describe('appCredentials', () => {
  it('assembles AppCredentials from the backend config and the key secret', () => {
    const creds = appCredentials(backend, { GITHUB_APP_PRIVATE_KEY_B64: 'a2V5' });
    expect(creds).toEqual({ appId: '3847496', installationId: '135372268', privateKeyB64: 'a2V5' });
  });

  it('throws a named error when the key secret is unset', () => {
    expect(() => appCredentials(backend, {})).toThrow(/GITHUB_APP_PRIVATE_KEY_B64/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- github-credentials`
Expected: FAIL, cannot resolve `../../lib/github/credentials.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/github/credentials.ts
// cairn-cms: the bridge from the adapter's backend config and the Worker's secret to the
// App signer's input. One tested place owns the join and the missing-secret failure, so the
// save action (Plan 05) stays thin and a misconfigured Worker fails by name, not with a deep
// TypeError. Mirrors requireDb/requireOrigin in env.ts.
import type { BackendConfig } from '../content/types.js';
import type { AppCredentials } from './types.js';

/** The Worker secret holding the GitHub App private key: base64 of the PEM, single line. */
export interface GithubKeyEnv {
  GITHUB_APP_PRIVATE_KEY_B64?: string;
}

/**
 * Assemble the `AppCredentials` the signer needs from the adapter's `backend` (app id,
 * installation) and the Worker's private-key secret. Throws when the secret is unset.
 */
export function appCredentials(
  backend: Pick<BackendConfig, 'appId' | 'installationId'>,
  env: GithubKeyEnv,
): AppCredentials {
  const privateKeyB64 = env.GITHUB_APP_PRIVATE_KEY_B64;
  if (!privateKeyB64) {
    throw new Error('GITHUB_APP_PRIVATE_KEY_B64 is not configured');
  }
  return { appId: backend.appId, installationId: backend.installationId, privateKeyB64 };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- github-credentials`
Expected: PASS, the assembly and the missing-secret error green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/github/credentials.ts src/tests/unit/github-credentials.test.ts
git commit -m "feat(github): add the backend credentials bridge"
```

---

## Task 6: Wire the package exports and run the gate

**Files:**
- Modify: `src/lib/index.ts`

- [ ] **Step 1: Re-export the GitHub backend surface**

Add the GitHub exports to `src/lib/index.ts`, after the content block:

```ts
// GitHub read-and-commit backend (Plan 03).
export type { RepoRef, RepoFile, CommitAuthor, AppCredentials } from './github/types.js';
export { CommitConflictError } from './github/types.js';
export { appJwt, installationToken, signingSelfTest } from './github/signing.js';
export {
  treeUrl,
  markdownFilesIn,
  listMarkdown,
  contentsUrl,
  readRaw,
  fileSha,
  commitFile,
} from './github/repo.js';
export { appCredentials } from './github/credentials.js';
export type { GithubKeyEnv } from './github/credentials.js';
```

Update the file's header comment so it reads that auth, the content model, and the GitHub backend have landed, with render and nav to follow.

- [ ] **Step 2: Run the full gate**

Run:
```bash
npm run check
npm test
npm run package
```
Expected: `svelte-check` 0 errors (the one "no svelte input files" warning stays until Plan 05); both vitest projects pass, including every new GitHub test; `svelte-package` builds `dist/` with the `github/` modules under the `.` subpath.

- [ ] **Step 3: Commit**

```bash
git add src/lib/index.ts
git commit -m "feat(github): export the read-and-commit backend surface"
```

---

## Task 7: Exit criteria

**Files:** none (verification only).

- [ ] **Step 1: Confirm no octokit dependency crept in**

Run:
```bash
grep -rn "octokit\|@octokit" src/lib package.json && echo "LEAK" || echo "clean: bespoke Web-Crypto signing, no octokit"
```
Expected: "clean: bespoke Web-Crypto signing, no octokit".

- [ ] **Step 2: Confirm listing uses the Trees API, not the contents API**

Run:
```bash
grep -n "git/trees" src/lib/github/repo.ts && echo "trees-api listing in place"
```
Expected: `treeUrl` builds a `git/trees/...?recursive=1` URL; `listMarkdown` calls it.

- [ ] **Step 3: Confirm the commit attribution and fail-safe shape**

The two §10 scenarios this plan's logic underpins map to passing tests:

| Scenario | Spec | Test |
|---|---|---|
| 14 commit attribution (editor author, App committer, clean diff) | §7.4 | `github-commit` (author set, committer omitted, sha passed) |
| 15 the conflict fail-safe | §7.4 | `github-commit` (a 409 becomes `CommitConflictError`, no merge) |

The full save round-trip through the form and validation is Plan 05; this plan proves the backend in isolation.

- [ ] **Step 4: Confirm the full suite and gate are green**

Run:
```bash
npm run check
npm test
```
Expected: 0 errors; all unit and integration projects pass.

**Plan 03 is complete when every step passes.** The engine now reads and commits through GitHub: it lists a concept directory through the Git Trees API past the contents-API truncation cap, reads a single file, signs an App JWT in-Worker and exchanges it for an install token, and commits an edit with the editor as author and `cairn-cms[bot]` as committer, failing safe on a 409. Plan 04 builds the render engine on the Plan 02 registry, and Plan 05 wires the save action: validate, then `commitFile`, with `/admin/healthz` calling `signingSelfTest`.

---

## Self-review notes

- **Spec coverage.** §7.3 read and list is Tasks 3; the §7.4 commit half (signing, `commitFile`, the 409 fail-safe) is Tasks 2 and 4; the credentials join consuming §8's `BackendConfig` is Task 5. The model half of §7.4 landed in Plan 02. The save action (§7.6), `/admin/healthz` (§7.8), nav's reuse of `commitFile` (§7.7), and the render pipeline (§7.5) are explicitly deferred to their plans.
- **Divergences are deliberate.** Listing moves to the Trees API to clear the 1,000-entry contents cap, and the credentials bridge is added so the `BackendConfig`-to-`AppCredentials` join and the missing-secret failure live in one tested place. Both are stated in the divergences section. The signing path carries over unchanged.
- **Edge discipline.** This is the engine's I/O edge: `fetch` to GitHub and Web Crypto signing. It depends downward on Plan 02 (`idFromFilename`, `BackendConfig`) and nothing upward. No Svelte, no D1, no Worker binding beyond the key secret typed in the credentials bridge.
- **No forward references.** `types.ts` (Task 1) defines `RepoRef`, `AppCredentials`, and `CommitConflictError` before `signing.ts` (Task 2) and `repo.ts` (Tasks 3 and 4) import them; `credentials.ts` (Task 5) imports `BackendConfig` from Plan 02 and `AppCredentials` from Task 1. `repo.ts` is built in two passes in one file: read and list first (Task 3), the commit appended (Task 4).
- **Deferred by design.** The save action that calls `validate` then `commitFile`, the editor that loads `readRaw` plus `fileSha`, and `/admin/healthz` calling `signingSelfTest` all arrive in Plan 05. The 1 MB read cap and the recursive-tree cap are documented with sharding deferred until a directory approaches them (spec §7.3).

---

## Execution record (2026-05-28)

Plan 03 executed end to end in one session via subagent-driven-development, one fresh implementer per task against the suite. Final gate: `svelte-check` 0 errors (the one "no svelte input files" warning stays until Plan 05), `npm test` 111 passing (110 from the verbatim plan plus 1 regression test from the review gate), and `npm run package` builds `dist/github/` (types, signing, repo, credentials) under the `.` subpath. The five GitHub test files add 25 tests: types 2, signing 5, read 11, commit 6, credentials 2. All six implementation tasks landed as their own commits on branch `rebuild`, plus two review-gate commits.

**No deviations during implementation.** Each task's verbatim test and implementation went in as written; the temporary re-exports `repo.ts` carried after Task 3 were removed in Task 4 as the plan specified, leaving the exported surface at `treeUrl`, `markdownFilesIn`, `listMarkdown`, `contentsUrl`, `readRaw`, `fileSha`, `commitFile`. A leak check confirms no octokit dependency or import (only the comment that explains its absence) and that listing uses `git/trees?recursive=1`.

**Review gate.** The code-simplifier ran first and found the code clean, with one fix: a stale "lands in Task 4" forward-reference in the `repo.ts` header, removed once the commit path lived in the same file. Two specialized reviewers then ran in parallel (opus, read-only): `cloudflare-workers-reviewer` and `web-auth-security-reviewer`. `svelte-reviewer` and `daisyui-a11y-reviewer` did not apply (no Svelte, no DaisyUI surface), and the live admin smoke is not relevant (this plan does not touch `/admin`). Three findings folded in:

- `listMarkdown` now throws on a truncated Git Trees response instead of returning a silent partial list, with a regression test. The cap sits near 100,000 entries, far beyond any concept directory, so this is a loud-failure guard rather than a real limit.
- `signingSelfTest` returns a fixed classifier (`'key import or sign failed'`) rather than the raw Web Crypto error message, so the `/admin/healthz` result cannot echo key-related bytes to a log aggregator. A trusted operator still learns the key is bad, which is the actionable signal.
- `commitFile`'s TSDoc now states the two caller preconditions this layer cannot enforce: `path` confined to the concept's configured directory, and `author` derived from the verified server-side session.

**Carried follow-ups for Plan 05 (and one for later).** Each maps to a reviewer finding accepted as out of scope here:

- **Path containment (security, Plan 05).** The App token can write anywhere in the repo. The save action must reject any `path` outside the concept's configured directory, since `commitFile` interpolates the path into the API URL with only slash-trimming. Building the path as `${dir}/${id}.md` from an `isValidId`-checked id satisfies this.
- **Author provenance (security, Plan 05).** The save action must set `author` from the verified session, never from request input, or an editor could forge attribution.
- **Conflict identity across the bundle boundary (Plan 05).** A SvelteKit action that bundles the library in a separate chunk could see an aliased `CommitConflictError` class and miss the `instanceof`. The save action should also match `err.name === 'CommitConflictError'` as a fallback.
- **Install-token caching (availability, later).** `installationToken` mints a fresh token per call. Installation tokens last an hour; caching in KV with a TTL from the response `expires_at` removes two round-trips per save and avoids token-creation throttling under load. Out of scope for the backend primitives.
- **Test gaps (low).** The PKCS#8 passthrough branch of `pemToPkcs8` is untested (GitHub issues only PKCS#1), and the `appJwt` `iat` backdating is not separately asserted. Both are low-risk regression guards to add when convenient.
- **Adapter-config validation (low).** `owner` and `repo` reach the API URL unencoded. They come from static `BackendConfig`, not user input, so there is no runtime attack path; a later plan can validate them at adapter registration.
