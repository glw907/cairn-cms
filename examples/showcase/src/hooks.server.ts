// Dev-only backend for the showcase. It injects a signed-in editor for /admin (the real auth flow
// is covered by the engine's integration tests) and installs the GitHub double. This file lives in
// the showcase, never in the engine, so the published package carries none of it.
import type { Handle } from '@sveltejs/kit';
import { installFakeGitHub } from '$lib/fake-github.js';

installFakeGitHub();

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname === '/admin' || event.url.pathname.startsWith('/admin/')) {
    // Editor shape: { email, displayName, role } - see src/lib/auth/types.ts.
    // The draft used `name`; the real field is `displayName`.
    event.locals.editor = {
      email: 'editor@showcase.test',
      displayName: 'Demo Editor',
      role: 'owner',
    };
  }
  return resolve(event);
};
