// The media delivery route: the engine factory streams content-addressed bytes from the R2 bucket
// the adapter named (MEDIA_BUCKET). It sits outside /admin and owns its own security headers. In
// dev the fake R2 double rides platform.env (hooks.server.ts); a real site binds the bucket in
// wrangler.jsonc.
import { createMediaRoute } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '$lib/cairn.server.js';

export const GET = createMediaRoute(runtime);
