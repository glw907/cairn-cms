import type { ParamMatcher } from '@sveltejs/kit';

// Matches a rest-param segment ending in .md, so `(site)/[...path=md]` claims only the
// raw-markdown twin path and the existing `(site)/[...path]` catch-all keeps every other route.
export const match: ParamMatcher = (param) => param.endsWith('.md');
