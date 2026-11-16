import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { site } from '#chassis/content.js';
import { publicRoutesConfig } from '#chassis/public-routes.js';
import { withReferences } from '#chassis/entry-data.js';

export const prerender = true;

const routes = createPublicRoutes(publicRoutesConfig);

export const entries: EntryGenerator = () => routes.entries();

// A published page whose id is `home` is served at "/", so its own path redirects there. The
// entries keep `/home`, which makes the build write the redirect into `_redirects`.
export const load: PageServerLoad = async ({ url }) => {
  const hasHomePage = site
    .concept('pages')
    ?.all()
    .some((page) => page.id === 'home');
  if (hasHomePage && url.pathname === '/home') redirect(308, '/');
  const data = await routes.entryLoad({ url });
  return withReferences(data);
};
