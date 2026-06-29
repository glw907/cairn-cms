// A developer's own custom admin screen, the Plan 1 extension-seam proof. It is a concrete route
// under /admin (so it wins over the catch-all), inherits the guard-populated locals.editor, renders
// inside the shared CairnAdminShell from the parent layout, and reads and writes its own APP_DB
// binding (the engine never touches it). requireOwner is the real server-side gate; the ownerOnly
// nav flag is cosmetic only.
import type { PageServerLoad, Actions } from './$types';
import { requireOwner } from '@glw907/cairn-cms/sveltekit';
import { fail } from '@sveltejs/kit';

/** A signup row, the developer's own table shape, read from APP_DB. */
interface SignupRow {
  id: number;
  name: string;
  email: string;
}

export const load: PageServerLoad = async (event) => {
  requireOwner(event);
  const { results } = await event
    .platform!.env.APP_DB.prepare('SELECT id, name, email FROM signups ORDER BY id DESC')
    .all<SignupRow>();
  return { signups: results };
};

export const actions: Actions = {
  create: async (event) => {
    requireOwner(event);
    // The guard already rejected a tokenless POST; the bare CsrfField rides the shell's context token.
    const form = await event.request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    if (!name || !email) return fail(400, { error: 'missing' });
    await event.platform!.env.APP_DB.prepare('INSERT INTO signups (name, email) VALUES (?, ?)')
      .bind(name, email)
      .run();
    return { created: true };
  },
  remove: async (event) => {
    // The owner-gated destructive action.
    requireOwner(event);
    const id = Number((await event.request.formData()).get('id'));
    await event.platform!.env.APP_DB.prepare('DELETE FROM signups WHERE id = ?').bind(id).run();
    return { removed: true };
  },
};
