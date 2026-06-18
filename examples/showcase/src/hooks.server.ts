// Showcase fixture backend. Activates only when SHOWCASE_FAKE_BACKEND=1 is set in the environment.
// This flag must never be set in production: without it the hook is a no-op, no auth bypass
// is installed, and the GitHub double is never activated. The Playwright config sets the flag
// so the E2E server process gets the fixture backend without any manual steps.
import type { Handle } from '@sveltejs/kit';
import { installFakeGitHub, seedMediaLibrary, SEED_MEDIA_KEYS } from '$lib/fake-github.js';
import { createFakeAuthDb } from '$lib/fake-auth-db.js';
import { createFakeR2 } from '$lib/fake-r2.js';

const FAKE = process.env.SHOWCASE_FAKE_BACKEND === '1';

if (FAKE) {
  installFakeGitHub();
  // Seed the Media Library fixtures into the in-memory repo so /admin/media has a realistic set.
  seedMediaLibrary();
}

// One instance for the server's lifetime, like the fake GitHub's in-memory repo, so editors
// added through /admin/editors persist across requests.
const fakeAuthDb = FAKE ? createFakeAuthDb() : null;

// One MEDIA_BUCKET double for the server's lifetime, so an asset uploaded through /admin streams
// back from the /media delivery route in the same dev session.
const fakeR2 = FAKE ? createFakeR2() : null;

// Seed the R2 bytes for the Media Library fixtures, so each seeded asset's thumbnail resolves
// through /media and the orphan delete removes a real object.
if (fakeR2) {
  for (const key of SEED_MEDIA_KEYS) fakeR2.seedObject(key);
}

export const handle: Handle = async ({ event, resolve }) => {
  if (FAKE) {
    const path = event.url.pathname;
    const isAdmin = path === '/admin' || path.startsWith('/admin/');
    const isMedia = path === '/media' || path.startsWith('/media/');
    if (isAdmin || isMedia) {
      // The binding doubles ride platform.env the way the Cloudflare adapter would supply the real
      // ones. App.Platform is the bare default under adapter-node, hence the cast; the engine reads
      // the env structurally at runtime. AUTH_DB is admin-only; MEDIA_BUCKET serves both the upload
      // action under /admin and the delivery route under /media.
      event.platform = {
        env: { ...(isAdmin ? { AUTH_DB: fakeAuthDb } : {}), MEDIA_BUCKET: fakeR2 },
      } as App.Platform;
    }
    if (isAdmin) {
      // Editor shape: { email, displayName, role } - see src/lib/auth/types.ts.
      event.locals.editor = {
        email: 'editor@showcase.test',
        displayName: 'Demo Editor',
        role: 'owner',
      };
    }
  }
  return resolve(event);
};
