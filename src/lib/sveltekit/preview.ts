// cairn-cms: mintPreviewToken, the public entry point for issuing a preview link (spec part 3,
// "Public preview for a non-editor"). The documented path to it is the previewMint admin action
// (content-routes-core.ts), which carries the entry-scoped authorization; this function itself
// performs no authorization or draft-existence check of its own, so a caller that reaches it
// directly owns both.
import type { D1Database } from '@cloudflare/workers-types';
import { generateToken, hashToken } from '../auth/crypto.js';
import { insertPreviewToken } from '../auth/preview-store.js';

/**
 * A site's preview-token configuration: how long a minted share link stays valid. Every field is
 * optional; an absent config resolves to the default TTL.
 */
export interface PreviewTokenConfig {
  /**
   * The minted link's lifetime in milliseconds. Defaults to seven days. Must be finite, positive,
   * and between one minute and thirty days inclusive; `mintPreviewToken` throws an actionable,
   * `PreviewTokenConfig:`-prefixed error otherwise.
   */
  ttlMs?: number;
}

/** The default preview-link lifetime: seven days, long enough to survive a weekend review. */
const DEFAULT_PREVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** The shortest allowed TTL: one minute. */
const MIN_PREVIEW_TTL_MS = 60 * 1000;

/** The longest allowed TTL: thirty days. */
const MAX_PREVIEW_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Resolve a `PreviewTokenConfig` to its effective TTL, validating it the same fail-fast,
 * descriptively-prefixed way `defineRoles` (`src/lib/auth/roles.ts`) validates a site's declared
 * role vocabulary: a misconfigured value throws here, before any token is generated or written,
 * rather than surfacing later as a silently-wrong expiry.
 */
function resolveTtlMs(config: PreviewTokenConfig): number {
  const ttlMs = config.ttlMs ?? DEFAULT_PREVIEW_TTL_MS;
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new Error(`PreviewTokenConfig: ttlMs must be a finite, positive number, got ${ttlMs}`);
  }
  if (ttlMs < MIN_PREVIEW_TTL_MS || ttlMs > MAX_PREVIEW_TTL_MS) {
    throw new Error(
      `PreviewTokenConfig: ttlMs must be between one minute and thirty days, got ${ttlMs}`,
    );
  }
  return ttlMs;
}

/**
 * Mint a preview token for one entry's pending draft: generate a fresh 256-bit token, store only
 * its hash (`hashToken`) in `AUTH_DB` alongside the entry it shares and the minting editor, and
 * return the plaintext once, since it is never stored and cannot be recovered later. The row
 * carries a numeric `expiresAt` (epoch milliseconds), matching `magic_token` and `session`.
 * @throws Error prefixed `PreviewTokenConfig:` when `config.ttlMs` is invalid.
 */
export async function mintPreviewToken(
  db: D1Database,
  config: PreviewTokenConfig,
  record: { concept: string; entryId: string; editor: string },
): Promise<{ token: string; expiresAt: number }> {
  const ttlMs = resolveTtlMs(config);
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = Date.now() + ttlMs;
  await insertPreviewToken(db, { ...record, tokenHash, expiresAt });
  return { token, expiresAt };
}
