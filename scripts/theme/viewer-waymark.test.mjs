// The viewer's headless mode over every page under Waymark at 1440, in both modes: one entry per
// route and mode, the draft hidden everywhere, and no console error.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import path from 'node:path';
import { runHeadless } from './viewer.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');
const DRAFT_TITLE = 'A draft that stays hidden';
const NOT_FOUND = '/viewer-missing-page';

/** The entries of a committed content manifest. */
function manifestEntries(file) {
  return JSON.parse(readFileSync(path.join(REPO, file), 'utf8')).entries;
}

test('every page renders under Waymark at 1440 in both modes, and the draft stays hidden', { timeout: 1_000_000 }, async () => {
  const starter = manifestEntries('scripts/build/starter-overlay/src/content/.cairn/index.json');
  const conformance = manifestEntries('scripts/theme/conformance/src/content/.cairn/index.json');
  const entries = [...starter, ...conformance];
  const live = entries.filter((e) => e.concept === 'posts' && !e.draft).length;
  const archivePages = Math.ceil(live / 13) - 1;
  assert.ok(archivePages >= 2, 'the conformance set paginates the archive');
  // Routes: the home page, archive pages after the first, every page and post (the draft's too), the
  // two feeds, and one address that does not exist. Fragments are not routes.
  const routeCount = 1 + archivePages + entries.filter((e) => e.concept !== 'fragments').length + 2 + 1;

  /** @type {{ route: string, body: string }[]} */
  const bodies = [];
  /** @type {number[]} */
  const composed = [];
  const shots = await runHeadless({
    root: REPO,
    pages: 'all',
    widths: [1440],
    inspect: (shot, body, siteDir) => {
      bodies.push({ route: shot.page, body });
      if (shot.page === '/') {
        composed.push(JSON.parse(readFileSync(path.join(siteDir, 'src/content/.cairn/index.json'), 'utf8')).entries.length);
      }
    },
  });

  assert.equal(shots.length, routeCount * 2, 'one entry per route and mode');
  assert.deepEqual(composed, [entries.length, entries.length], 'the composed manifest lists the starter and conformance entries');
  const draft = conformance.find((e) => e.draft && e.title === DRAFT_TITLE);
  assert.ok(draft, 'the conformance set holds the titled draft');
  for (const shot of shots) {
    const expected = shot.page === draft.permalink || shot.page === NOT_FOUND ? 404 : 200;
    assert.equal(shot.status, expected, `${shot.page} (${shot.mode})`);
    assert.deepEqual(shot.consoleErrors, [], `${shot.page} (${shot.mode})`);
  }
  const listings = bodies.filter(({ route }) => route === '/' || route.startsWith('/archive/') || route.startsWith('/feed.'));
  assert.equal(listings.length, (1 + archivePages + 2) * 2, 'every archive page and feed was read in both modes');
  for (const { route, body } of listings) assert.ok(!body.includes(DRAFT_TITLE), `${route} lists the draft`);
});
