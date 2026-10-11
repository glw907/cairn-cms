// A fixture for the example site alone: the dev backend always mints an owner session, so no access-map refusal
// is reachable in the e2e, and this load throws the 403 the admin error page must render.
import { error } from '@sveltejs/kit';

export const load = () => {
  error(403, 'forbidden fixture');
};
