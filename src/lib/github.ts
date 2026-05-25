// cairn-core: read and write repository content through the GitHub API.
//
// Reads (Pass B) list a collection directory and fetch a file's raw markdown; the token
// is optional because ecnordic's repo is public. Writes (Pass C) mint a short-lived
// GitHub App installation token — App JWT (RS256) signed with Web Crypto, no octokit
// dependency — and commit through the contents API with author = editor, committer = the
// App (cairn-cms[bot]). The same token also lifts reads to the authenticated rate limit
// and unlocks private repos (e.g. 907-life).

import { bytesToB64url } from './auth';

export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

/** A markdown file in a collection directory. `id` is the slug (filename without `.md`). */
export interface RepoFile {
  id: string;
  name: string;
  path: string;
}

const API = 'https://api.github.com';

function ghHeaders(accept: string, token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    'User-Agent': 'cairn-cms',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Build the contents-API URL for a repo path, pinned to the configured branch. */
export function contentsUrl(repo: RepoRef, path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `${API}/repos/${repo.owner}/${repo.repo}/contents/${clean}?ref=${encodeURIComponent(repo.branch)}`;
}

interface ContentsEntry {
  name: string;
  path: string;
  type: string;
}

/** Keep only markdown files from a contents-API directory listing, newest id first. */
export function markdownFiles(entries: ContentsEntry[]): RepoFile[] {
  return entries
    .filter((entry) => entry.type === 'file' && entry.name.endsWith('.md'))
    .map((entry) => ({ id: entry.name.replace(/\.md$/, ''), name: entry.name, path: entry.path }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

/** List the markdown files in a collection directory. */
export async function listMarkdown(repo: RepoRef, dir: string, token?: string): Promise<RepoFile[]> {
  const res = await fetch(contentsUrl(repo, dir), { headers: ghHeaders('application/vnd.github+json', token) });
  if (!res.ok) throw new Error(`GitHub list ${dir} failed: ${res.status}`);
  return markdownFiles((await res.json()) as ContentsEntry[]);
}

/** Fetch a file's raw markdown, or null if it does not exist. */
export async function readRaw(repo: RepoRef, path: string, token?: string): Promise<string | null> {
  const res = await fetch(contentsUrl(repo, path), { headers: ghHeaders('application/vnd.github.raw', token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read ${path} failed: ${res.status}`);
  return res.text();
}

// --- Write path: GitHub App auth + commit (Pass C) -------------------------------------

const encoder = new TextEncoder();

// TextEncoder/atob produce Uint8Arrays whose generic buffer type no longer satisfies
// Web Crypto's BufferSource under strict lib types; hand the underlying ArrayBuffer over.
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

/** Wrap a PKCS#1 RSAPrivateKey (DER) as PKCS#8 — the only RSA form Web Crypto importKey takes. */
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

export interface AppCredentials {
  appId: string;
  installationId: string;
  /** The stored GITHUB_APP_PRIVATE_KEY_B64 — base64 of the PEM, single line. */
  privateKeyB64: string;
}

/** Exchange the App JWT for a short-lived installation access token. */
export async function installationToken(creds: AppCredentials): Promise<string> {
  const jwt = await appJwt(creds.appId, atob(creds.privateKeyB64));
  const res = await fetch(`${API}/app/installations/${creds.installationId}/access_tokens`, {
    method: 'POST',
    headers: ghHeaders('application/vnd.github+json', jwt),
  });
  if (!res.ok) throw new Error(`GitHub installation token failed: ${res.status}`);
  return ((await res.json()) as { token: string }).token;
}

/** Standard (padded) base64 of UTF-8 text — the encoding the contents API expects. */
function toBase64(text: string): string {
  return btoa(Array.from(encoder.encode(text), (b) => String.fromCharCode(b)).join(''));
}

/** The current blob sha for a path, or null if the file does not yet exist. */
export async function fileSha(repo: RepoRef, path: string, token: string): Promise<string | null> {
  const res = await fetch(contentsUrl(repo, path), { headers: ghHeaders('application/vnd.github+json', token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub stat ${path} failed: ${res.status}`);
  return ((await res.json()) as { sha: string }).sha;
}

export interface CommitAuthor {
  name: string;
  email: string;
}

/**
 * Commit `content` to `path` on the configured branch via the contents API. Author is the
 * editor; committer is omitted so GitHub attributes it to the App (cairn-cms[bot]). Updates
 * the file in place when it exists (passing its sha), creates it otherwise. Returns the
 * commit sha.
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
  if (!res.ok) throw new Error(`GitHub commit ${path} failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { commit: { sha: string } }).commit.sha;
}
