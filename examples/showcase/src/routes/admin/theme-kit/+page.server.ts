// The G1 fixture screen's load: an owner-only gate and nothing else. The screen carries no data
// of its own, so requireAccess is the whole server contract, the same seam a site's own custom
// admin route reaches for (src/routes/admin/signups/+page.server.ts).
import type { PageServerLoad } from './$types';
import { requireAccess } from '@glw907/cairn-cms/sveltekit';

export const load: PageServerLoad = (event) => {
  requireAccess(event);
};
