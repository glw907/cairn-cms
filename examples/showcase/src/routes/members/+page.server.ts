// cairn-cms: the showcase's gated members page. Folds the documented `+layout.server.ts` guard,
// which reads the signed-in subject (docs/extend/add-a-second-audience.md, Path B), into this
// single page's load, since the fixture has exactly one member-facing view.
// Sign-out lives here too, as the page's own named action.
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { memberChannel } from '../../members/channel.js';

export const prerender = false;

/**
 * Resolve the caller's session; an absent, expired, or `verify`-refused one redirects to the
 * login page rather than rendering (`resolveSubject` itself never throws).
 */
export const load: PageServerLoad = async (event) => {
  const subject = await memberChannel.resolveSubject(event);
  if (!subject) {
    redirect(303, '/members/login');
  }
  return { subject };
};

export const actions: Actions = {
  /** Ends the caller's own session and clears both cookies, then returns to the login page. */
  logout: async (event) => {
    await memberChannel.actions.logout(event);
    redirect(303, '/members/login');
  },
};
