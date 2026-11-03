// The gate's pass bar, against a local HTTP server and a fake clock so the polling runs in
// milliseconds: the marker must be in a 200 body, and the unchanged-page mode must see every poll.
import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fetchCheck, fetchCheckAbsent } from '../../../scripts/gate/fetch-check.mjs';

const servers: Server[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.close();
});

/** Serve `answers[n]` to the nth request (the last repeats); returns the URL and the requested paths. */
async function serve(answers: Array<{ status?: number; body: string }>) {
  const requested: string[] = [];
  const server = createServer((request, response) => {
    requested.push(request.url ?? '');
    const answer = answers[Math.min(requested.length - 1, answers.length - 1)];
    response.writeHead(answer.status ?? 200, { 'content-type': 'text/html' });
    response.end(answer.body);
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/post`, requested };
}

/** A clock that advances only when the poller sleeps. */
function fakeClock() {
  let t = 1_000_000;
  return { now: () => t, sleep: async (ms: number) => void (t += ms) };
}

const CONTROL = 'a line from before the edit';
const MARKER = 'gate-0.99.0-rc.3-A1-1';

describe('fetchCheck', () => {
  it('finds the marker on the third poll and reports three attempts', async () => {
    const { url, requested } = await serve([{ body: 'old' }, { body: 'old' }, { body: `new ${MARKER}` }]);
    const result = await fetchCheck(url, MARKER, { intervalMs: 15_000, budgetMs: 600_000, ...fakeClock() });
    expect(result).toMatchObject({ found: true, url, status: 200, attempts: 3 });
    expect(result.fetchedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(requested.every((path) => /gate-poll=/.test(path))).toBe(true);
  });

  it('fails when the marker never appears within the budget', async () => {
    const { url } = await serve([{ body: 'a 200 page with no marker' }]);
    const result = await fetchCheck(url, MARKER, { intervalMs: 15_000, budgetMs: 60_000, ...fakeClock() });
    expect(result.found).toBe(false);
    expect(result.status).toBe(200);
    expect(result.attempts).toBe(5);
  });

  it('does not count the marker on a non-200 answer', async () => {
    const { url } = await serve([{ status: 404, body: MARKER }]);
    const result = await fetchCheck(url, MARKER, { intervalMs: 15_000, budgetMs: 30_000, ...fakeClock() });
    expect(result.found).toBe(false);
    expect(result.status).toBe(404);
  });
});

describe('fetchCheckAbsent', () => {
  const window = { intervalMs: 15_000, budgetMs: 60_000 };

  it('passes when every poll is 200, holds the control, and lacks the marker', async () => {
    const { url } = await serve([{ body: `<p>${CONTROL}</p>` }]);
    const result = await fetchCheckAbsent(url, MARKER, CONTROL, { ...window, ...fakeClock() });
    expect(result).toMatchObject({ absent: true, found: false, status: 200, attempts: 5 });
  });

  it('fails when the marker is present', async () => {
    const { url } = await serve([{ body: `${CONTROL} ${MARKER}` }]);
    const result = await fetchCheckAbsent(url, MARKER, CONTROL, { ...window, ...fakeClock() });
    expect(result).toMatchObject({ absent: false, found: true });
  });

  it('fails on a 404', async () => {
    const { url } = await serve([{ status: 404, body: CONTROL }]);
    const result = await fetchCheckAbsent(url, MARKER, CONTROL, { ...window, ...fakeClock() });
    expect(result).toMatchObject({ absent: false, status: 404 });
  });

  it('fails when the control string is missing', async () => {
    const { url } = await serve([{ body: 'a different page' }]);
    const result = await fetchCheckAbsent(url, MARKER, CONTROL, { ...window, ...fakeClock() });
    expect(result.absent).toBe(false);
    expect(result.reason).toContain('control');
  });

  it('fails when the page changes partway through the window', async () => {
    const { url } = await serve([{ body: CONTROL }, { body: CONTROL }, { body: `${CONTROL} ${MARKER}` }]);
    const result = await fetchCheckAbsent(url, MARKER, CONTROL, { ...window, ...fakeClock() });
    expect(result).toMatchObject({ absent: false, found: true, attempts: 3 });
  });
});
