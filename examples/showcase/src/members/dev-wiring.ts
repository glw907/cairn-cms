// cairn-cms: dev-only wiring for the showcase's members login channel, excluded from every
// scaffolded site (see .cairn-template.json and the cairn-template:exclude markers in
// wrangler.jsonc and hooks.server.ts). Reachable only from inside hooks.server.ts's
// __CAIRN_DEV_BUILD__ branch via a dynamic import(), so createChannelDb never rides into a
// default production bundle (the e2e workflow greps `wrangler deploy --dry-run` output to prove
// it; see $chassis/dev-gate.ts).
import type { Handle } from '@sveltejs/kit';
import { createChannelDb, type ChannelDb } from '@glw907/cairn-cms-dev';
import schemaSql from '../../migrations-members/0000_channel.sql?raw';

// A module-level lazy singleton, not a per-request database: a fresh database on every request
// would lose the pending code row between `request` and `confirm`, and would stale the
// factory's own cached identity salt (provisioned once per channel instance, not per database).
let channelDb: Promise<ChannelDb> | undefined;

/** Resolve the one MEMBER_DB double for this server process's lifetime, creating it on first use. */
function resolveChannelDb(): Promise<ChannelDb> {
  if (!channelDb) {
    channelDb = createChannelDb(schemaSql);
  }
  return channelDb;
}

/**
 * Merge the member channel's D1 double into `event.platform.env`, never replacing
 * `event.platform` wholesale.
 *
 * @remarks
 * `devBackendHandle` (`@glw907/cairn-cms-dev`) builds a fresh `event.platform` for `/admin` and
 * `/media`, discarding whatever was there. hooks.server.ts therefore composes
 * `sequence(devBackendHandle(), membersDevHandle)`, putting this handle second: the merge layers
 * onto whatever platform is in hand, so neither handle clobbers the other on any path.
 *
 * It also stamps `CAIRN_DEV_BACKEND: '1'` onto `platform.env`, mirroring how a real deployment
 * would carry it as a Worker var. hooks.server.ts only reaches this handle once its own
 * `__CAIRN_DEV_BUILD__ && devBackendOptIn()` guard has already read `process.env.CAIRN_DEV_BACKEND`
 * as `'1'`, so this is a truthful mirror, not a bypass; it exists because the harness's local
 * preview server (`examples/showcase/vite.config.ts`; no `wrangler dev`) has no mechanism to carry
 * a dynamic OS env var onto the platform-proxy env it otherwise builds from `wrangler.jsonc`.
 * `captureDeliver` and the `/test` harness routes both gate on this platform-level flag, never
 * `process.env`, so without this line neither one would ever see it set.
 */
export const membersDevHandle: Handle = async ({ event, resolve }) => {
  const db = await resolveChannelDb();
  event.platform = {
    ...event.platform,
    env: {
      ...event.platform?.env,
      MEMBER_DB: db,
      CAIRN_DEV_BACKEND: '1',
    },
  } as unknown as App.Platform;
  return resolve(event);
};
