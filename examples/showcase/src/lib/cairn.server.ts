// The one server-side composition point. The runtime composes once here, and every server
// route that needs it (the /admin mount, /healthz) imports it instead of re-running
// composeRuntime per route.
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from '$lib/cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });

// The dev-token stub pairs with the fake GitHub double in fake-github.ts and must never reach
// a deployed site; a real site mints installation tokens from its GitHub App key. /admin/editors
// runs against the in-memory AUTH_DB double in fake-auth-db.ts, which hooks.server.ts injects as
// platform.env. One mounted view still runs degraded under the fake backend: /admin/nav reads
// site.config.yaml through the GitHub API, which the double's seeded tree lacks, so the nav
// editor opens with an empty tree.
export const admin = createCairnAdmin(runtime, { mintToken: async () => 'dev-token' });
