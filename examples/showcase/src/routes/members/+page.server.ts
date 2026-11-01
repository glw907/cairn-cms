// The showcase's gated members page, the shape "Gate the member area" in
// the cairn-extending-a-site skill's second-sign-in-group reference builds: its load resolves the signed-in subject and
// redirects a visitor without one, and sign-out lives here as the page's named action.
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
  /** Ends the caller's session and clears both cookies, then returns to the login page. */
  logout: async (event) => {
    await memberChannel.actions.logout(event);
    redirect(303, '/members/login');
  },
};
