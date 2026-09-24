/**
 * Minting a GitHub App installation token scoped to one repository. The operator class never
 * carries a long-lived GitHub credential: the runner mints a short-lived, narrowly scoped token
 * once per batch and hands it to the reader as `CAIRN_GH_READ_TOKEN`, the same variable name the
 * Go tool itself resolves (`tool/cmd/cairn/env.go`).
 */
import { createSign } from 'node:crypto';

/** The JWT lifetime GitHub's own manifest flow documents as the maximum it will accept. */
const APP_JWT_LIFETIME_SECONDS = 600;

/** The clock-drift allowance subtracted from `iat`, so a slow container clock still validates. */
const CLOCK_DRIFT_SECONDS = 60;

/**
 * Base64url-encode a value with no padding, the form a JWT segment and GitHub's own installation
 * token payload both require.
 * @param input - The bytes or text to encode.
 * @returns The base64url text.
 */
function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * Sign a GitHub App JWT (RS256), the identity every installation-token mint authenticates with.
 * @param appId - The App's own id, GitHub's JWT `iss` claim.
 * @param privateKeyPem - The App's private key, PEM-encoded.
 * @param now - The current time in milliseconds, injected for a deterministic test.
 * @returns The signed JWT.
 */
export function signAppJwt(appId: string, privateKeyPem: string, now: number = Date.now()): string {
  const iat = Math.floor(now / 1000) - CLOCK_DRIFT_SECONDS;
  const exp = iat + APP_JWT_LIFETIME_SECONDS;
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat, exp, iss: appId };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = base64url(signer.sign(privateKeyPem));
  return `${signingInput}.${signature}`;
}

/** One repository entry in GitHub's installation-token response. */
interface InstallationTokenRepo {
  name: string;
}

/** The installation-token endpoint's response body. */
interface InstallationTokenResponse {
  token: string;
  expires_at: string;
  repositories?: InstallationTokenRepo[];
}

/** A minted installation token: the value, its expiry, and the repositories it actually covers. */
export interface InstallationToken {
  token: string;
  expiresAt: string;
  repositories: string[];
}

/** The subset of the Fetch API this module needs, so a test injects a fixture instead of a socket. */
export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

/**
 * Mint a GitHub App installation token scoped to exactly the named repositories and permissions,
 * then verify the response covers exactly that scope before returning it: a token whose granted
 * repositories differ from what was requested (a wider installation, a renamed repository) fails
 * loudly here rather than reaching a reader with more access than the class declares. `appId` is
 * the App's own id (the JWT issuer); `privateKeyPem` is the App's private key, PEM-encoded;
 * `installationId` is the installation covering `repositories`; `repositories` are the repository
 * names the token must be scoped to, exactly; `permissions` are the permission scopes to request;
 * `fetchImpl` is the fetch implementation, defaulting to the global `fetch`, overridden in tests.
 * @returns The minted token, its expiry, and the repositories it covers.
 * @throws When the mint request fails, or the granted repositories differ from what was requested.
 */
export async function mintInstallationToken({
  appId,
  privateKeyPem,
  installationId,
  repositories,
  permissions,
  fetchImpl = fetch,
}: {
  appId: string;
  privateKeyPem: string;
  installationId: number | string;
  repositories: string[];
  permissions: Record<string, string>;
  fetchImpl?: FetchLike;
}): Promise<InstallationToken> {
  const jwt = signAppJwt(appId, privateKeyPem);
  const response = await fetchImpl(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repositories, permissions }),
  });
  if (!response.ok) {
    throw new Error(`github: installation token mint failed for installation ${installationId} (status ${response.status})`);
  }
  const body = (await response.json()) as InstallationTokenResponse;
  const granted = (body.repositories ?? []).map((repo) => repo.name).sort();
  const expected = [...repositories].sort();
  if (granted.length !== expected.length || granted.some((name, i) => name !== expected[i])) {
    throw new Error(
      `github: installation token scope mismatch, expected exactly ${JSON.stringify(expected)} but got ${JSON.stringify(granted)}`,
    );
  }
  return { token: body.token, expiresAt: body.expires_at, repositories: granted };
}
