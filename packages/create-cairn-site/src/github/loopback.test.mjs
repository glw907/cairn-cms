import test from 'node:test';
import assert from 'node:assert/strict';
import { startLoopback } from './loopback.mjs';

test('binds an ephemeral port on 127.0.0.1', async () => {
  const loopback = await startLoopback();
  assert.ok(loopback.port > 0);
  assert.equal(loopback.url, `http://127.0.0.1:${loopback.port}`);
  await loopback.close();
});

test('waitFor resolves with the query params of the first matching GET', async () => {
  const loopback = await startLoopback();
  const waitPromise = loopback.waitFor('/callback', {
    landingHtml: '<p>Step 1 of 2 done. Return to the terminal.</p>',
  });

  const response = await fetch(`${loopback.url}/callback?code=xyz&state=abc`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/html');
  assert.equal(await response.text(), '<p>Step 1 of 2 done. Return to the terminal.</p>');

  const params = await waitPromise;
  assert.equal(params.get('code'), 'xyz');
  assert.equal(params.get('state'), 'abc');

  await loopback.close();
});

test('a GET on a different path does not resolve the wait', async () => {
  const loopback = await startLoopback();
  const waitPromise = loopback.waitFor('/callback', { landingHtml: '<p>done</p>' });

  const otherResponse = await fetch(`${loopback.url}/other`);
  assert.equal(otherResponse.status, 404);

  const PENDING = Symbol('pending');
  const raceResult = await Promise.race([
    waitPromise.then(() => 'resolved'),
    new Promise((resolve) => setTimeout(() => resolve(PENDING), 50)),
  ]);
  assert.equal(raceResult, PENDING, 'the wrong path must not resolve the wait');

  const hitResponse = await fetch(`${loopback.url}/callback?code=abc`);
  assert.equal(hitResponse.status, 200);
  assert.equal(await hitResponse.text(), '<p>done</p>');

  const params = await waitPromise;
  assert.equal(params.get('code'), 'abc');

  await loopback.close();
});

test('waitFor rejects with LOOPBACK_TIMEOUT after the timeout elapses', async () => {
  const loopback = await startLoopback();
  await assert.rejects(
    () => loopback.waitFor('/callback', { timeoutMs: 50, landingHtml: '<p>timeout</p>' }),
    (err) => {
      assert.equal(err.code, 'LOOPBACK_TIMEOUT');
      return true;
    },
  );
  await loopback.close();
});

test('close frees the port', async () => {
  const loopback = await startLoopback();
  const { url } = loopback;
  await loopback.close();
  await assert.rejects(() => fetch(url));
});

test('serveForm serves its html at /', async () => {
  const loopback = await startLoopback();
  loopback.serveForm('<html><body>form</body></html>');

  const response = await fetch(`${loopback.url}/`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/html');
  assert.equal(await response.text(), '<html><body>form</body></html>');

  await loopback.close();
});
