// cairn-core: the better-auth instance. Auth is engine code (engine-fat rule), so the whole
// config lives here: Drizzle/D1 adapter, magic-link (POST-confirm-shaped send), admin roles.
// Instantiated PER REQUEST in hooks.server.ts (the D1 binding is request-scoped); the factory
// is cheap (no I/O at construction).
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { magicLink, admin } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/admin/access';
import type { D1Database } from '@cloudflare/workers-types';
import { sendMagicLink, type EmailSender } from '../email';
import * as schema from './schema';

// Two-tier roles on the admin plugin's access-control system: `owner` holds every admin
// statement (manage editors, revoke sessions); `editor` holds none (content-only). `adminRoles`
// must name a role defined here, so owner (not the plugin's built-in `admin`) is the gate.
const ac = createAccessControl(defaultStatements);
const owner = ac.newRole(defaultStatements);
const editor = ac.newRole({});

/** Worker bindings + vars the auth layer reads (a structural subset of `Platform.env`). */
export interface AuthEnv {
  AUTH_DB?: D1Database;
  AUTH_SECRET?: string;
  /** Canonical origin; `BETTER_AUTH_URL` is accepted as a legacy alias. */
  PUBLIC_ORIGIN?: string;
  /** Legacy alias for `PUBLIC_ORIGIN`; `PUBLIC_ORIGIN` takes precedence when both are set. */
  BETTER_AUTH_URL?: string;
  EMAIL?: EmailSender;
}

/** Branding the magic-link email needs; threaded from the site adapter via hooks. */
export interface AuthBranding {
  siteName: string;
  /** The `From:` address used when sending magic-link emails. */
  sender: string;
}

/** The drizzle adapter result `betterAuth` consumes (same provider/schema everywhere). */
type DrizzleDb = Parameters<typeof drizzleAdapter>[0];

/**
 * The shared better-auth config. Kept separate from `createAuth` so the test harness can run
 * the EXACT plugin set (allowlist semantics, expiry, POST-confirm send) over an in-memory
 * SQLite instead of D1. `disableSignUp:true` makes the `user` table the editor allowlist:
 * magic-link never auto-creates, so the only way in is the owner-gated admin `createUser`
 * (see auth/admins.ts). `adminRoles:['owner']` lets owners (not the default `admin` role)
 * drive the admin API. Tokens are stored hashed and consumed atomically on first verify
 * (better-auth GHSA-hc7v-rggr-4hvx), single-use by construction (C1).
 */
export function buildAuth(opts: {
  database: DrizzleDb;
  baseURL: string;
  secret: string | undefined;
  branding: AuthBranding;
  sendLink: (email: string, token: string) => Promise<void>;
}) {
  return betterAuth({
    appName: opts.branding.siteName,
    secret: opts.secret,
    baseURL: opts.baseURL,
    trustedOrigins: [opts.baseURL],
    database: opts.database,
    plugins: [
      magicLink({
        disableSignUp: true,
        expiresIn: 600,
        storeToken: 'hashed',
        sendMagicLink: async ({ email, token }, ctx) => {
          // Allowlist gate: better-auth always fires this callback (even for unknown emails, to
          // avoid enumeration) and only blocks user creation at verify. So gate the actual send
          // here. Never email a non-editor. The login UI shows neutral copy either way, so this
          // leaks nothing; it just stops strangers receiving a dead link.
          const existing = await ctx?.context.internalAdapter.findUserByEmail(email);
          if (!existing?.user) return;
          await opts.sendLink(email, token);
        },
      }),
      admin({ ac, roles: { owner, editor }, defaultRole: 'editor', adminRoles: ['owner'] }),
    ],
  });
}

/**
 * Build the per-request better-auth instance over the site's D1 binding. The magic-link email
 * points at OUR confirm page carrying only the token; consumption happens when the user clicks
 * "Confirm sign-in" there (a POST), never on a scanner GET (C2 / POST-confirm). The origin is
 * config-derived (`PUBLIC_ORIGIN`/`BETTER_AUTH_URL`), never request-derived (H3).
 */
export function createAuth(env: AuthEnv, branding: AuthBranding) {
  if (!env.AUTH_DB) throw new Error('AUTH_DB (D1) binding is required');
  const origin = env.PUBLIC_ORIGIN || env.BETTER_AUTH_URL || 'http://localhost';
  const db = drizzle(env.AUTH_DB, { schema });
  return buildAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    baseURL: origin,
    secret: env.AUTH_SECRET,
    branding,
    sendLink: async (email, token) => {
      if (!env.EMAIL) throw new Error('EMAIL binding is required to send magic links');
      const link = `${origin}/admin/auth/confirm?token=${encodeURIComponent(token)}`;
      await sendMagicLink(env.EMAIL, email, link, branding.siteName, branding.sender);
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
