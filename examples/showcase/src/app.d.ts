// See https://svelte.dev/docs/kit/types#app.d.ts
import type { D1Database, R2Bucket, ExecutionContext } from '@cloudflare/workers-types';
// AuthEnv ships from the /sveltekit subpath (since 0.51); the app.d.ts Platform block names it there.
import type { AuthEnv } from '@glw907/cairn-cms/sveltekit';
// App.Locals.editor (set by the engine's auth guard) ships with the engine.
import '@glw907/cairn-cms/ambient';

declare global {
  namespace App {
    interface Platform {
      env: {
        // cairn-cms self-owned magic-link auth store (editor allowlist, sessions, tokens).
        AUTH_DB: D1Database;
        // Email Sending binding for magic links (arbitrary recipients).
        EMAIL: NonNullable<AuthEnv['EMAIL']>;
        // Canonical origin for magic-link confirmation links (never from a request header).
        PUBLIC_ORIGIN: string;
        // R2 bucket backing the media library; the /media route streams bytes from here.
        MEDIA_BUCKET: R2Bucket;
        // GitHub App credentials for the commit signer.
        GITHUB_APP_ID: string;
        GITHUB_APP_INSTALLATION_ID: string;
        GITHUB_APP_PRIVATE_KEY_B64: string;
      };
      context: ExecutionContext;
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
