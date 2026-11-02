// A fixture for the example site alone. The dev backend always mints an owner session, so a role
// refusal is unreachable in the e2e; this load throws the 403 the admin error page must render.
// `?case=no-rule` instead calls requireAccess for a target no rule matches, the one refusal the
// dev backend does reach, and its 403 names the missing rule.
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireAccess } from '@glw907/cairn-cms/sveltekit';

export const load: PageServerLoad = (event) => {
  if (event.url.searchParams.get('case') === 'no-rule') {
    requireAccess(event, '/admin/no-such-rule-target');
  }
  error(403, 'forbidden fixture');
};
