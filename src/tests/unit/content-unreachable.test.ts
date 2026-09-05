import { describe, it, expect } from 'vitest';
import { unreachable } from '../../lib/content/unreachable.js';

describe('unreachable', () => {
  it('throws a cairn-prefixed error naming the context and the descriptor\'s field type', () => {
    // A real caller only ever reaches this line once every union arm is handled, so the argument
    // is `never` at the type level; a test proving the runtime half of the guard must defeat that
    // proof with a cast, the same as a stray `as never` would in production. The message reads
    // `type` off the offending value rather than serializing the whole thing, since a real
    // descriptor can carry an author-supplied `label` not safe to echo back.
    expect(() => unreachable({ type: 'bogus', label: 'secret' } as never, 'test.context')).toThrow( // idioms-allow: as-never  feeds the runtime guard an argument off the (empty) union it types
      'cairn: unreachable arm in test.context: field type "bogus"',
    );
  });
});
