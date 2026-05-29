// Showcase fixture backend. Activates only when SHOWCASE_FAKE_BACKEND=1 is set in the environment.
// This flag must never be set in production: without it the hook is a no-op, no auth bypass
// is installed, and the GitHub double is never activated. The Playwright config sets the flag
// so the E2E server process gets the fixture backend without any manual steps.
import type { Handle } from '@sveltejs/kit';
import { installFakeGitHub } from '$lib/fake-github.js';

const FAKE = process.env.SHOWCASE_FAKE_BACKEND === '1';

if (FAKE) {
  installFakeGitHub();
}

export const handle: Handle = async ({ event, resolve }) => {
  if (FAKE && (event.url.pathname === '/admin' || event.url.pathname.startsWith('/admin/'))) {
    // Editor shape: { email, displayName, role } - see src/lib/auth/types.ts.
    event.locals.editor = {
      email: 'editor@showcase.test',
      displayName: 'Demo Editor',
      role: 'owner',
    };
  }
  return resolve(event);
};
