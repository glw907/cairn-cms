import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { publicRoutesConfig } from '$chassis/public-routes.js';
import { withReferences } from '$chassis/entry-data.js';

export const prerender = true;

const routes = createPublicRoutes(publicRoutesConfig);

export const entries: EntryGenerator = () => routes.entries();

export const load: PageServerLoad = async ({ url }) => {
  const data = await routes.entryLoad({ url });
  return withReferences(data);
};
