import type { D1Database } from '@cloudflare/workers-types';

export type Role = 'owner' | 'editor';

/** The session shape the whole admin reads: guard, loads, content fns, manage-editors. */
export interface Editor {
  email: string;
  displayName: string;
  role: Role;
}

/** A session's trust tier, set at mint time. See the extensibility spec, "Sessions and the trust-tier partition". */
export type AuthTier = 'admin' | 'member';

/**
 * The identity the engine reads on any route: an email, a display name, the granted scopes, and the
 * session's trust tier. Replaces `Editor` as the runtime identity; `Editor`/`Role` remain the
 * allowlist-row shape behind editor management.
 */
export interface Principal {
  email: string;
  displayName: string;
  scopes: string[];
  tier: AuthTier;
}

/** Worker bindings and vars the auth layer reads; a structural subset of `Platform.env`. */
export interface AuthEnv {
  AUTH_DB?: D1Database;
  /** Canonical origin for confirmation links, never read from a request header (spec 7.1, risk H3). */
  PUBLIC_ORIGIN?: string;
  /**
   * Dev-backend tripwire flag. The dev backend sets this in local development; if it is ever set in
   * a deployed runtime the guard refuses (the build-foldable `dev` gate should have eliminated the
   * dev backend, so a set flag signals a polluted environment). A string from a Worker var or a
   * boolean.
   */
  CAIRN_DEV_BACKEND?: string | boolean;
  /** Cloudflare Email Sending binding. */
  EMAIL?: {
    send(message: {
      to: string;
      from: string;
      subject: string;
      html: string;
      text: string;
    }): Promise<void>;
  };
}
