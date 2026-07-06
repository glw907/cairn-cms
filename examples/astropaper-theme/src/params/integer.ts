import type { ParamMatcher } from '@sveltejs/kit';

/** Matches a bare positive integer segment, so `/posts/[page=integer]` claims only a real page
 *  number and falls through to the (site) group's `[...path]` catch-all for anything else (a
 *  post slug under `/posts/`). */
export const match: ParamMatcher = (param) => /^[1-9][0-9]*$/.test(param);
