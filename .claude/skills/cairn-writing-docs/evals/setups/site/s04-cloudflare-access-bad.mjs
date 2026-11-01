// Known-bad for `S04-cloudflare-access`: the identity resolver trusts the email header Access
// forwards and never verifies the Access JWT, so any request that reaches the Worker without
// passing Access (a workers.dev hostname, a preview URL) can claim any roster address.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = {
  'src/lib/access-identity.ts': `import type { IdentityResolver } from '@glw907/cairn-cms/sveltekit';

export const accessIdentity: IdentityResolver = {
  label: 'Trail Crew sign-in',
  logoutUrl: 'https://trailcrew.cloudflareaccess.com/cdn-cgi/access/logout',
  async resolve(event) {
    const email = event.request.headers.get('cf-access-authenticated-user-email');
    if (!email) return { ok: false, reason: 'missing' };
    return { ok: true, email };
  },
};
`,
  'src/hooks.server.ts': `import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import type { Handle } from '@sveltejs/kit/hooks';
import { runtime } from '#chassis/cairn.server.js';
import { accessIdentity } from '#lib/access-identity.js';

export const handle: Handle = createAuthGuard({ runtime, identity: accessIdentity });
`,
};

/** @param {string} root */
export default function bad(root) {
  for (const [rel, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
}
