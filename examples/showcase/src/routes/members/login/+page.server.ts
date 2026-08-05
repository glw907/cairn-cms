// cairn-cms: the showcase's member login route, the guide's separate request/confirm/logout
// routes (docs/guides/add-a-login-channel.md) folded onto one page as two named form actions,
// since this fixture needs no route beyond it. Both actions pass the raw SvelteKit `RequestEvent`
// straight to `memberChannel.actions.*`: it satisfies `AuthChannelEvent` structurally, and the
// factory owns every cookie, origin, and challenge check itself.
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { memberChannel } from '../../../members/channel.js';

export const prerender = false;

/** A visitor with a live session has nothing to do here; the gated page is the right landing spot. */
export const load: PageServerLoad = async (event) => {
  const subject = await memberChannel.resolveSubject(event);
  if (subject) {
    redirect(303, '/members');
  }
};

export const actions: Actions = {
  /**
   * Mint and deliver a code for the posted `contact`. Always answers `sent` for a well-formed
   * contact, known or not (the factory's own anti-enumeration discipline), so this action never
   * distinguishes a roster hit from a miss either.
   */
  request: async (event) => {
    // A clone, never the original request: `memberChannel.actions.request` reads its own clone
    // of the same body, and a request's `formData()` can only be consumed once.
    const form = await event.request.clone().formData();
    const contact = String(form.get('contact') ?? '');
    const result = await memberChannel.actions.request(event);
    if ('error' in result) {
      return fail(400, { contact, requestError: result.error });
    }
    return { contact, requested: true };
  },
  /** Consume the posted `code` against the pending nonce cookie and mint a session on success. */
  confirm: async (event) => {
    const result = await memberChannel.actions.confirm(event);
    if ('error' in result) {
      return fail(400, { confirmError: result.error });
    }
    redirect(303, '/members');
  },
};
