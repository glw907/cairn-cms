// The one wording for a sign-in link that did not work. The engine cannot tell an expired link
// from a link opened in another browser for the reader, and one instruction fixes both, so every
// refusal surface shares this sentence and title. Internal: never exported from a barrel.

/** The sentence shown for any failed sign-in link, on the login and confirm pages. */
export const SIGN_IN_LINK_FAILED =
  'That sign-in link didn’t work. A link works once, for 10 minutes, in the browser that requested it. Request a new link below and open it in this browser.';

/** The page title for any failed sign-in link, on the login and confirm pages. */
export const SIGN_IN_LINK_TITLE = 'Sign-in link didn’t work · Cairn';
