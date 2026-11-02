// The engine write that runs after the response: the D1 audit sink's insert. It hands its promise
// to the `waitUntil` that `cloudflare:workers` exports, which the unit project resolves to a fake
// that collects each promise for a test to flush. The case proves the write has not landed when
// the request returns and has landed once the collected promises settle.
import { describe, it, expect } from 'vitest';
import { waitUntil } from 'cloudflare:workers';
import type { D1Database } from '@cloudflare/workers-types';
import { createD1AuditSink } from '../../lib/sveltekit/audit-sink.js';
import { flushWaitUntil } from '../helpers/cloudflare-workers-fake.js';

/** One macrotask: long enough for any write the request itself awaited to have finished. */
function nextTask(): Promise<void> {
  return new Promise((done) => setTimeout(done, 0));
}

describe('the D1 audit sink writes through waitUntil', () => {
  it('returns before the insert lands, and the row lands once waitUntil settles', async () => {
    const written: unknown[][] = [];
    const db = {
      prepare: () => ({
        bind: (...args: unknown[]) => ({
          run: async () => {
            await nextTask();
            written.push(args);
            return { meta: { changes: 1 } };
          },
        }),
      }),
    } as unknown as D1Database;
    const sink = createD1AuditSink(db, waitUntil);

    sink({ actor: 'ed@x.dev', action: 'approve', entity: 'event', entityId: 'evt-1' });

    expect(written).toEqual([]);
    await flushWaitUntil();
    expect(written).toHaveLength(1);
    expect(written[0]).toContain('ed@x.dev');
  });
});
