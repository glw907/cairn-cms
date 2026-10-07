import { defineParams } from '@sveltejs/kit/params';

// The route param matchers. `md` matches a rest-param segment ending in .md, so `(site)/[...path=md]`
// claims only the raw-markdown twin path and the existing `(site)/[...path]` catch-all keeps every
// other route. A matcher returns the param's value to match, or undefined to pass.
export const params = defineParams({
  md: (param) => (param.endsWith('.md') ? param : undefined),
});
