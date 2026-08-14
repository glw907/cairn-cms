import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { BUILD_HOLD_CLASS, consoleUrlLine, createWaitForClear } from '../hold-loop.mjs';
import { createConsoleServer } from './server.mjs';
import { renderBuildsView } from './views.mjs';

/**
 * A bare GET against a running console, the same raw-request idiom server.test.mjs uses (a
 * request against a socket the test expects to already be closed must not go through `fetch`'s
 * own connection pooling, which can mask a closed listener behind a cached socket).
 * @param {number} port the port to connect to
 * @param {string} pathname the request path
 * @returns {Promise<{ status: number, body: string }>}
 */
function rawRequest(port, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: pathname }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
  });
}

test('the console is closed by the time the hold\'s caller resumes: nothing downstream could proxy a prompt through it', async () => {
  const record = { id: 'site-x1y2z3', cloudflare: { domain: 'example.com', workerName: 'example-worker' } };
  const server = createConsoleServer({
    chapter: 'Chapter 3: Workers Builds',
    hop: 'Watch your first Workers Builds deploy',
    record,
    renderView: renderBuildsView,
    graceMs: 30,
  });

  const results = [
    { cleared: false, detail: { buildUuid: null, status: null, outcome: null, commitSha: null } },
    {
      cleared: true,
      detail: { buildUuid: 'b-1', status: 'stopped', outcome: 'success', commitSha: 'abc123' },
    },
  ];
  let calls = 0;
  const probe = async () => results[Math.min(calls++, results.length - 1)];

  const lines = [];
  const waitForClear = createWaitForClear({
    holdClass: BUILD_HOLD_CLASS,
    server,
    log: (line) => lines.push(line),
    pollIntervalMs: 10,
    budgetMs: 10_000,
    signals: new EventEmitter(),
  });

  const observation = await waitForClear(probe);
  assert.equal(observation.cleared, true, 'the hold must have cleared for this test to prove the right thing');

  const urlLine = lines.find((line) => line.startsWith('Watch progress at'));
  assert.ok(urlLine, 'expected the console URL to have been printed');
  const [, url] = urlLine.match(/^Watch progress at (\S+) /) ?? [];
  assert.equal(urlLine, consoleUrlLine(url));
  const parsed = new URL(url);

  // waitForClear already resolved, which is exactly the point the caller would resume into its
  // own next prompting hop (a chapter's confirm/select). By construction (hold-loop.mjs awaits
  // stop() in its own finally block before returning), the console is already closed here: the
  // caller could not proxy a prompt through it even if it tried, because there is nothing left
  // listening.
  await assert.rejects(() => rawRequest(Number(parsed.port), parsed.pathname));
});
