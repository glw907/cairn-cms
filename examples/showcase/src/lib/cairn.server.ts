// The one server-side composition point. The runtime composes once here, and every server
// route that needs it (the /admin mount, /healthz) imports it instead of re-running
// composeRuntime per route.
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from '$lib/cairn.config.js';
import { createFakeAnthropic } from '$lib/fake-anthropic.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });

// Under the fake backend the tidy action calls a deterministic stub instead of the real Anthropic
// SDK, so the showcase tidy E2E never makes a network call or needs a real key. A real deployment
// leaves this unset and the content routes build the real client from ANTHROPIC_API_KEY.
const anthropic = process.env.SHOWCASE_FAKE_BACKEND === '1' ? createFakeAnthropic() : undefined;

// The dev-token stub pairs with the fake GitHub double in fake-github.ts and must never reach
// a deployed site; a real site mints installation tokens from its GitHub App key. /admin/editors
// runs against the in-memory AUTH_DB double in fake-auth-db.ts, which hooks.server.ts injects as
// platform.env. One mounted view still runs degraded under the fake backend: /admin/nav reads
// site.config.yaml through the GitHub API, which the double's seeded tree lacks, so the nav
// editor opens with an empty tree.
export const admin = createCairnAdmin(runtime, { mintToken: async () => 'dev-token', anthropic });
