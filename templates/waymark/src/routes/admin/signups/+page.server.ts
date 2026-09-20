// Archetype: the custom admin screen over the site's own table.
// Atoms: requireAccess, createSectionAction, createLogger.
// Recipe: docs/extend/add-a-custom-admin-screen.md (the docs rewrite writes it).
//
// A developer's own custom admin screen, proving the extension seam. It is a concrete route
// under /admin (so it wins over the catch-all), inherits the guard-populated locals.cairnEditor, renders
// inside the shared CairnAdminShell from the parent layout, and reads and writes its own APP_DB
// binding (the engine never touches it). requireAccess on the load and the section action's own
// access check on each form action resolve against the same site access map, so a denied POST's
// page render exposes nothing the load would already have refused; the ownerOnly nav flag is
// cosmetic only.
import type { PageServerLoad, Actions, RequestEvent } from './$types';
import { createSectionAction, requireAccess } from '@glw907/cairn-cms/sveltekit';
import { error, fail } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { log } from '../../../lib/log.js';

/** A signup row, the developer's own table shape, read from APP_DB. */
interface SignupRow {
  id: number;
  name: string;
  email: string;
}

// A deployed Worker always carries platform.env (wrangler.jsonc binds APP_DB); its absence is a
// deployment misconfiguration, not a request-shaped failure, so it logs with the engine's own
// area.subject.verb_phrase grammar (section-action.ts's admin.action.misconfigured) and fails
// closed with a generic 500 rather than leaking binding detail to the client. The load resolves
// the binding this way because createSectionAction wraps form actions only; requireAccess and
// requireOwner are the documented gates for a load.
function requireAppDb(event: RequestEvent): D1Database {
  const db = event.platform?.env.APP_DB;
  if (!db) {
    log.error('admin.signups.misconfigured', { reason: 'db_not_bound' });
    error(500, 'This screen is not configured.');
  }
  return db;
}

export const load: PageServerLoad = async (event) => {
  requireAccess(event);
  const db = requireAppDb(event);
  const { results } = await db
    .prepare('SELECT id, name, email FROM signups ORDER BY id DESC')
    .all<SignupRow>();
  return { signups: results };
};

// This screen's job is to teach the documented path, so it copies the wrapper rather than the
// minimum that compiles: createSectionAction (@glw907/cairn-cms/sveltekit) is what a site's own
// admin section reaches for, and a developer copying this route should carry it across. It
// composes the editor, CSRF and audit contract onto every action and resolves the section's own
// binding, so no action re-implements a gate the engine already owns.
//
// It is fail-closed on every call, unlike createAdminAction's opt-in access option: the site's access
// declaration (src/access.ts) must carry a rule admitting the session for this route, or the
// action refuses with a 403 it never explains to the browser, and an access map the guard never
// attached refuses with a 500. ownerOnly stacks on top of that map check for the destructive
// action, never in place of it.
const sectionAction = createSectionAction<App.Platform['env'], D1Database>({
  resolveDb: (env: App.Platform['env'] | undefined) => env?.APP_DB,
});

export const actions: Actions = {
  create: sectionAction(
    async ({ form, ctx }) => {
      const name = String(form.get('name') ?? '').trim();
      const email = String(form.get('email') ?? '').trim();
      // A rejected request mutated nothing, so it owes no audit record.
      if (!name || !email) return fail(400, { error: 'missing' });
      await ctx.db
        .prepare('INSERT INTO signups (name, email) VALUES (?, ?)')
        .bind(name, email)
        .run();
      ctx.audit({ detail: email });
      return { created: true };
    },
    { action: 'create', entity: 'signup' },
  ),
  remove: sectionAction(
    async ({ form, ctx }) => {
      const id = Number(form.get('id'));
      await ctx.db.prepare('DELETE FROM signups WHERE id = ?').bind(id).run();
      ctx.audit({ entityId: id });
      return { removed: true };
    },
    // The destructive action keeps the owner gate the map check alone would not supply: every
    // role the map admits may add a signup, only an owner may remove one.
    { action: 'remove', entity: 'signup', ownerOnly: true },
  ),
};
