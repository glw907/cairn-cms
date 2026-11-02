// A fixture screen for the refusal copy createSectionAction returns: one action per refusal, each
// built from its own factory so the refusal comes from the factory's config, not shared state.
// The e2e dev handle replaces the real guard, so the `forged` action proves createAdminAction's
// own CSRF check, which the page deliberately never satisfies.
import type { PageServerLoad, Actions } from './$types';
import { createSectionAction, requireAccess } from '@glw907/cairn-cms/sveltekit';

export const load: PageServerLoad = (event) => {
  requireAccess(event);
};

// A stand-in binding: the handlers never query it, they only need resolveDb to answer non-null.
const stubDb: object = {};
const opts = { action: 'probe', entity: 'refusal' };

const bound = createSectionAction<Env, object>({ resolveDb: () => stubDb });
const unbound = createSectionAction<Env, object>({ resolveDb: () => undefined });
const limited = createSectionAction<Env, object>({
  resolveDb: () => stubDb,
  rateLimit: {
    resolve: () => ({ limit: async () => ({ success: false }) }),
    key: (ctx) => ctx.editor.email,
  },
});

const ok = async () => ({ ok: true });

export const actions: Actions = {
  allowed: bound(async ({ ctx }) => {
    ctx.audit({ detail: 'control' });
    return { ok: true };
  }, opts),
  unbound: unbound(ok, opts),
  // Outside the route on purpose: hasAccessRule matches by prefix, so a path under
  // /admin/section-refusals would inherit this route's rule.
  unmapped: bound(ok, { ...opts, target: '/admin/no-such-rule' }),
  limited: limited(ok, opts),
  forged: bound(ok, opts),
};
