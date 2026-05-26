// Dev-only: feeds `@better-auth/cli generate`. Mirrors the plugin set in
// src/lib/auth/config.ts so the generated schema matches production exactly.
// Never imported by shipped code, never bundled.
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink, admin } from 'better-auth/plugins';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const db = drizzle(new Database(':memory:'));

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  plugins: [magicLink({ sendMagicLink: async () => {} }), admin()],
});
