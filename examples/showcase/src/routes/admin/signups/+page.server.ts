// A developer's own custom admin screen, proving the extension seam. It is a concrete route
// under /admin (so it wins over the catch-all), inherits the guard-populated locals.cairnEditor, renders
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
  const db = event.platform!.env.APP_DB;
  const { results } = await db
    .prepare('SELECT id, name, email FROM signups ORDER BY id DESC')
    .all<SignupRow>();
  return { signups: results };
};

// The raw requireOwner/formData/fail shape is kept deliberately: this route has no audit
// requirement. createSectionAction (@glw907/cairn-cms/sveltekit) is the documented path for a
// site that needs one, since it wraps the same guard with a logged before/after diff.
export const actions: Actions = {
  create: async (event) => {
    requireOwner(event);
    const db = event.platform!.env.APP_DB;
    // The guard already rejected a tokenless POST; the bare CsrfField rides the shell's context token.
    const form = await event.request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    if (!name || !email) return fail(400, { error: 'missing' });
    await db.prepare('INSERT INTO signups (name, email) VALUES (?, ?)').bind(name, email).run();
    return { created: true };
  },
  remove: async (event) => {
    // The owner-gated destructive action.
    requireOwner(event);
    const db = event.platform!.env.APP_DB;
    const id = Number((await event.request.formData()).get('id'));
    await db.prepare('DELETE FROM signups WHERE id = ?').bind(id).run();
    return { removed: true };
  },
};
