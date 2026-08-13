// Tests for the Workers Builds routes added to fake-cloudflare.mjs (T4c task 4). Split into its
// own file rather than appended to fake-cloudflare.test.mjs, matching the existing convention of
// keeping each fixture domain's captured-body assertions independent (see that file's own
// "Email Sending routes" section, which repastes its fixtures rather than importing them). Every
// captured body here is pasted independently from docs/internal/2026-08-12-t4c-builds-spike.md,
// rather than imported from fake-cloudflare.mjs, so a drift in the implementation's own copy
// fails this suite instead of passing silently.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startFakeCloudflare,
  APP_NOT_AUTHORIZED_REFUSED_BODY,
  REPO_NOT_SELECTED_REFUSED_BODY,
  BUILD_LOGS_FIXTURE,
} from './fake-cloudflare.mjs';

const ACCOUNT_ID = '120c269ad6d3dfbe6d63a0bb53758ca0';

/** PUT a connections upsert and return its parsed `result`. */
async function putConnection(cloudflare, overrides = {}) {
  const res = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/repos/connections`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      provider_type: 'github',
      provider_account_id: '14229321',
      provider_account_name: 'glw907',
      repo_id: '1332620835',
      repo_name: 'cairn-t4c-spike',
      ...overrides,
    }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

/** POST a trigger create and return its parsed `result`. */
async function createTrigger(cloudflare, overrides = {}) {
  const res = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/triggers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      external_script_id: 'ec60995bd99d4c28a8a3a4dc7ce64c10',
      trigger_name: 'Deploy default branch',
      branch_includes: ['main'],
      ...overrides,
    }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

test('the connections PUT upsert returns a stable uuid across two calls, only modified_on advancing', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const first = await putConnection(cloudflare);
  assert.equal(first.status, 200);
  assert.equal(first.body.success, true);
  assert.equal(first.body.result.repo_name, 'cairn-t4c-spike');
  assert.equal(first.body.result.provider_account_name, 'glw907');
  assert.equal(first.body.result.deleted_on, null);

  const second = await putConnection(cloudflare);
  assert.equal(second.body.result.repo_connection_uuid, first.body.result.repo_connection_uuid);
  assert.notEqual(second.body.result.modified_on, first.body.result.modified_on);
  assert.equal(second.body.result.created_on, first.body.result.created_on);
});

test('a different repo on the same provider account gets its own connection', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const first = await putConnection(cloudflare, { repo_id: '1' , repo_name: 'one' });
  const second = await putConnection(cloudflare, { repo_id: '2', repo_name: 'two' });
  assert.notEqual(first.body.result.repo_connection_uuid, second.body.result.repo_connection_uuid);
});

test('failNext reproduces the captured app-not-authorized refusal, HTTP 404 code 8000008', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  cloudflare.failNext('builds_connection_put', 404, APP_NOT_AUTHORIZED_REFUSED_BODY);

  const { status, body } = await putConnection(cloudflare);
  assert.equal(status, 404);
  assert.equal(body.errors[0].code, 8000008);
  assert.match(body.errors[0].message, /disconnected from your Git account/);

  // One-shot: the next PUT succeeds.
  const after = await putConnection(cloudflare);
  assert.equal(after.status, 200);
});

test('failNext reproduces the captured repo-not-selected refusal, HTTP 404 code 8000012', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  cloudflare.failNext('builds_connection_put', 404, REPO_NOT_SELECTED_REFUSED_BODY);

  const { status, body } = await putConnection(cloudflare);
  assert.equal(status, 404);
  assert.equal(body.errors[0].code, 8000012);
  assert.match(body.errors[0].message, /no longer exists/);
});

test('a worker with no triggers reads back an empty list, matching the captured shape', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const res = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/workers/some-tag/triggers`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { result: [], success: true, errors: [], messages: [] });
});

test('a created trigger embeds the whole repo_connection, discoverable with no list route', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const connection = (await putConnection(cloudflare)).body.result;

  const { status, body } = await createTrigger(cloudflare, { repo_connection_uuid: connection.repo_connection_uuid });
  assert.equal(status, 200);
  assert.equal(body.result.trigger_name, 'Deploy default branch');
  assert.equal(body.result.branch_includes[0], 'main');
  assert.equal(body.result.deploy_command, 'npx wrangler deploy');
  assert.deepEqual(body.result.repo_connection, connection);

  const list = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/workers/ec60995bd99d4c28a8a3a4dc7ce64c10/triggers`);
  const listBody = await list.json();
  assert.equal(listBody.result.length, 1);
  assert.equal(listBody.result[0].trigger_uuid, body.result.trigger_uuid);
  assert.deepEqual(listBody.result[0].repo_connection, connection);
});

test('a created trigger carries its build token name, looked up from the registered token', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const tokenRes = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/tokens`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      build_token_name: 'cairn t4c spike token',
      build_token_secret: 'super-secret-token-value',
      cloudflare_token_id: 'd07b2a25f05151591830c45053186979',
    }),
  });
  const token = (await tokenRes.json()).result;

  const { body } = await createTrigger(cloudflare, { build_token_uuid: token.build_token_uuid });
  assert.equal(body.result.build_token_uuid, token.build_token_uuid);
  assert.equal(body.result.build_token_name, 'cairn t4c spike token');
});

test('build tokens: create returns the captured shape and never echoes the secret', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const res = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/tokens`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      build_token_name: 'cairn t4c spike token',
      build_token_secret: 'super-secret-token-value',
      cloudflare_token_id: 'd07b2a25f05151591830c45053186979',
    }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.result.owner_type, 'user');
  assert.equal(body.result.build_token_name, 'cairn t4c spike token');
  assert.equal(body.result.cloudflare_token_id, 'd07b2a25f05151591830c45053186979');
  assert.ok(body.result.build_token_uuid);
  assert.equal('build_token_secret' in body.result, false);
});

test('build tokens: create rejects a body missing any of the three required fields, code 12002', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const missingSecret = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/tokens`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ build_token_name: 'x', cloudflare_token_id: 'y' }),
  });
  assert.equal(missingSecret.status, 400);
  const missingSecretBody = await missingSecret.json();
  assert.equal(missingSecretBody.errors[0].code, 12002);

  const empty = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/tokens`, { method: 'POST' });
  assert.equal(empty.status, 400);
});

test('build tokens: list paginates with the captured next_page field and a default page size of 50', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  for (let i = 0; i < 3; i += 1) {
    cloudflare.state.buildTokens.push({
      build_token_uuid: `uuid-${i}`,
      owner_type: 'user',
      build_token_name: `token-${i}`,
      cloudflare_token_id: `cf-${i}`,
    });
  }

  const res = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/tokens`);
  const body = await res.json();
  assert.equal(body.result.length, 3);
  assert.deepEqual(body.result_info, { page: 1, per_page: 50, total_pages: 1, count: 3, total_count: 3, next_page: false });
});

test('GET /user/tokens/verify returns the captured envelope and a configurable id', async (t) => {
  const defaultCloudflare = await startFakeCloudflare();
  t.after(() => defaultCloudflare.close());
  const res = await fetch(`${defaultCloudflare.apiBase}/user/tokens/verify`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.result.id, 'd07b2a25f05151591830c45053186979');
  assert.equal(body.result.status, 'active');
  assert.equal(body.messages[0].code, 10000);

  const namedCloudflare = await startFakeCloudflare({ tokenVerifyId: 'custom-id-123' });
  t.after(() => namedCloudflare.close());
  const namedBody = await (await fetch(`${namedCloudflare.apiBase}/user/tokens/verify`)).json();
  assert.equal(namedBody.result.id, 'custom-id-123');
});

test('workers/scripts list reads back a seeded tag per script', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  cloudflare.state.workerScripts.push({ id: 'cairn-t4c-spike', tag: 'ec60995bd99d4c28a8a3a4dc7ce64c10' });

  const res = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/workers/scripts`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.result.length, 1);
  assert.equal(body.result[0].id, 'cairn-t4c-spike');
  assert.equal(body.result[0].tag, 'ec60995bd99d4c28a8a3a4dc7ce64c10');
});

test('kicking a build requires a body: an empty body is rejected with code 12002', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const { body: trigger } = await createTrigger(cloudflare);

  const res = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/triggers/${trigger.result.trigger_uuid}/builds`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
  const responseBody = await res.json();
  assert.equal(responseBody.errors[0].code, 12002);
});

test('kicking a build with a branch returns the full record already queued, empty commit identity, manual source', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const { body: trigger } = await createTrigger(cloudflare);

  const res = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/triggers/${trigger.result.trigger_uuid}/builds`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ branch: 'main' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.result.status, 'queued');
  assert.equal(body.result.build_outcome, null);
  assert.equal(body.result.build_trigger_source, 'manual');
  assert.equal(body.result.build_trigger_metadata.commit_hash, '');
  assert.equal(body.result.build_trigger_metadata.commit_message, '');
  assert.equal(body.result.build_trigger_metadata.author, '');
  assert.equal(body.result.trigger.trigger_uuid, trigger.result.trigger_uuid);
  assert.ok(body.result.build_uuid);
});

test('a kicked build is immediately readable by uuid and shows up in its worker discovery list', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const { body: trigger } = await createTrigger(cloudflare, { external_script_id: 'tag-abc' });

  const kickRes = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/triggers/${trigger.result.trigger_uuid}/builds`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ branch: 'main' }),
  });
  const kicked = (await kickRes.json()).result;

  const getRes = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/builds/${kicked.build_uuid}`);
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.result.build_uuid, kicked.build_uuid);
  assert.equal(getBody.result.status, 'queued');

  const listRes = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/workers/tag-abc/builds`);
  const listBody = await listRes.json();
  assert.equal(listBody.result.length, 1);
  assert.equal(listBody.result[0].build_uuid, kicked.build_uuid);
});

test('a build status sequence is drivable per test: queued -> initializing -> running -> stopped', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const { body: trigger } = await createTrigger(cloudflare, { external_script_id: 'tag-seq' });
  const kickRes = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/triggers/${trigger.result.trigger_uuid}/builds`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ branch: 'main' }),
  });
  const kicked = (await kickRes.json()).result;

  const poll = async () => (await (await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/builds/${kicked.build_uuid}`)).json()).result;

  assert.equal((await poll()).status, 'queued');

  const stored = cloudflare.state.builds.get(kicked.build_uuid);
  stored.status = 'initializing';
  stored.initializing_on = new Date().toISOString();
  assert.equal((await poll()).status, 'initializing');

  stored.status = 'running';
  stored.running_on = new Date().toISOString();
  assert.equal((await poll()).status, 'running');

  stored.status = 'stopped';
  stored.stopped_on = new Date().toISOString();
  stored.build_outcome = 'success';
  const finalRead = await poll();
  assert.equal(finalRead.status, 'stopped');
  assert.equal(finalRead.build_outcome, 'success');
});

test('a build get against an unknown uuid 404s', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const res = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/builds/does-not-exist`);
  assert.equal(res.status, 404);
});

test('a push build is discoverable in the per-worker list by its commit_hash, seeded directly through state', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const pushBuildUuid = 'push-build-uuid';
  cloudflare.state.builds.set(pushBuildUuid, {
    build_uuid: pushBuildUuid,
    status: 'stopped',
    build_outcome: 'success',
    initializing_on: '2026-08-13T02:34:00.000Z',
    running_on: '2026-08-13T02:34:30.000Z',
    stopped_on: '2026-08-13T02:35:00.000Z',
    created_on: '2026-08-13T02:33:59.000Z',
    trigger: { trigger_uuid: 'trigger-1', external_script_id: 'tag-push' },
    build_trigger_source: 'push_event',
    build_trigger_metadata: { commit_hash: '75a90935-fake-sha', commit_message: 'Prove push-to-deploy', author: 'glw907', branch: 'main' },
  });

  const res = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/workers/tag-push/builds`);
  const body = await res.json();
  assert.equal(body.result.length, 1);
  assert.equal(body.result[0].build_trigger_metadata.commit_hash, '75a90935-fake-sha');
});

test('build logs read back the seeded fixture shape, and are settable per test for a failed-build tail', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const { body: trigger } = await createTrigger(cloudflare);
  const kickRes = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/triggers/${trigger.result.trigger_uuid}/builds`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ branch: 'main' }),
  });
  const kicked = (await kickRes.json()).result;

  const res = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/builds/${kicked.build_uuid}/logs`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.result, BUILD_LOGS_FIXTURE);

  cloudflare.state.buildLogs.set(kicked.build_uuid, {
    cursor: 'WzAsNTBd',
    truncated: false,
    lines: [[1784052300000, 'Failed: error occurred while running deploy command']],
    events: [{ type: 'running', started_on: '2026-08-13T02:34:35.117Z', ended_on: '2026-08-13T02:34:40.000Z' }],
  });
  const after = await (await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/builds/${kicked.build_uuid}/logs`)).json();
  assert.match(after.result.lines[0][1], /Failed: error occurred/);
});

test('build logs against an unknown build uuid 404s', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const res = await fetch(`${cloudflare.apiBase}/accounts/${ACCOUNT_ID}/builds/builds/does-not-exist/logs`);
  assert.equal(res.status, 404);
});

test('the Builds routes log into requests alongside every other route', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  await putConnection(cloudflare);

  const putRequest = cloudflare.requests.find(
    (request) => request.method === 'PUT' && request.path.endsWith('/builds/repos/connections'),
  );
  assert.ok(putRequest);
  assert.equal(putRequest.body.repo_name, 'cairn-t4c-spike');
});
