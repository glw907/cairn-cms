// A bare `as never` cast in a test file, banned outright (rule 7).
export const bareCast = (value: unknown) => value as never;
// The same cast, escaped with its required reason (rule 7's allowance).
export const escapedCast = (value: unknown) => value as never; // idioms-allow: as-never  feeds the runtime guard an off-union value
// A backtick-quoted MENTION of the phrase, never a real cast, and not flagged.
export const mention = 'see the `as never` discussion above';
