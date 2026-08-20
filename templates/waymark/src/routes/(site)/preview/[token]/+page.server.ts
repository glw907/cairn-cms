// The reference preview mount every consumer copies (spec part 3, "Public preview for a
// non-editor"). It lives INSIDE the `(site)` layout group deliberately: the group's own layout
// carries the theme stylesheets and chrome (`(site)/+layout.svelte`), and mounting outside it would
// reproduce the unstyled page the rejected preview shape was rejected for. `previewLoad` takes the
// SAME `publicRoutesConfig` object `(site)/[...path]/+page.server.ts` composes its public routes
// from, so a site can never wire the preview page to a different rendering config than its public
// pages by editing one copy and forgetting the other.
import type { PageServerLoad } from './$types';
import { previewLoad } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '$chassis/cairn.server.js';
import { publicRoutesConfig } from '$chassis/public-routes.js';
import { withReferences } from '$chassis/entry-data.js';

// REQUIRED: a preview link is a bearer credential (whoever holds the URL can read the draft with no
// session). Prerendering this route would bake a token into a static asset every build ships;
// previewLoad itself throws a descriptive build-time error if this line is ever dropped, but the
// line stays the documented, load-bearing default rather than relying on that backstop alone.
export const prerender = false;

export const load: PageServerLoad = (event) => previewLoad(runtime, publicRoutesConfig, event).then(withReferences);
