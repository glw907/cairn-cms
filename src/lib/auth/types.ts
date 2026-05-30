import type { D1Database } from '@cloudflare/workers-types';

export type Role = 'owner' | 'editor';

/** The session shape the whole admin reads: guard, loads, content fns, manage-editors. */
export interface Editor {
  email: string;
  displayName: string;
  role: Role;
}

/** Worker bindings and vars the auth layer reads; a structural subset of `Platform.env`. */
export interface AuthEnv {
  AUTH_DB?: D1Database;
  /** Canonical origin for confirmation links, never read from a request header (spec 7.1, risk H3). */
  PUBLIC_ORIGIN?: string;
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
