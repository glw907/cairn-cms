import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILD_HOLD_CLASS,
  DISPLAY_REFRESH_SECONDS,
  PROPAGATION_HOLD_CLASS,
  makeObservation,
} from '../hold-loop.mjs';
import { renderPage, SERVES_DURING_RUN_SENTENCE } from './render.mjs';
import { renderBuildsView, renderPropagationView } from './views.mjs';

const CHAPTER = 'Chapter 2: Cloudflare';
const HOP = 'Connect your domain to your site';

/** A record shaped like the propagation hold's own seam (cutOverHostname's own record shape). */
const PROPAGATION_RECORD = {
  id: 'site-a1b2c3',
  dir: '/tmp/site-a1b2c3',
  cloudflare: {
    domain: 'example.com',
    apiToken: 'SECRET-SHOULD-NEVER-RENDER',
    accountId: 'acct-1',
  },
};

/** A record at exactly the `delegated` step: delegation just went active, no cutover attempted yet. */
const DELEGATED_STEP_RECORD = {
  id: 'site-delegated',
  dir: '/tmp/site-delegated',
  step: 'delegated',
  cloudflare: {
    domain: 'example.com',
    apiToken: 'SECRET-SHOULD-NEVER-RENDER',
    nameServers: ['ada.ns.cloudflare.com', 'walt.ns.cloudflare.com'],
  },
};

const BUILDS_RECORD = {
  id: 'site-x1y2z3',
  dir: '/tmp/site-x1y2z3',
  cloudflare: {
    domain: 'example.com',
    workerName: 'example-worker',
    apiToken: 'SECRET-SHOULD-NEVER-RENDER',
  },
};

test('renderPropagationView labels both DNS answers honestly and shows the marker outcome', () => {
  const observation = makeObservation(PROPAGATION_HOLD_CLASS, {
    attempt: 2,
    detail: {
      authoritative: [{ type: 'AAAA', address: '100::' }],
      recursive: [],
      lowConfidence: false,
      markerOutcome: 'hostname-resolver-lagging',
    },
  });
  const view = renderPropagationView(observation, PROPAGATION_RECORD);

  assert.match(view.bodyHtml, /Authoritative/);
  assert.match(view.bodyHtml, /your domain's own nameservers/);
  assert.match(view.bodyHtml, /Recursive/);
  assert.match(view.bodyHtml, /your machine's resolver|your system resolver/);
  assert.match(view.bodyHtml, /100::/);
  assert.match(view.bodyHtml, /hostname-resolver-lagging/);
  assert.match(view.bodyHtml, /example\.com/);
});

test('renderPropagationView surfaces lowConfidence so a recursive-fallback answer is never presented as authoritative evidence', () => {
  const observation = makeObservation(PROPAGATION_HOLD_CLASS, {
    attempt: 1,
    detail: {
      authoritative: null,
      recursive: [],
      lowConfidence: true,
      markerOutcome: 'hostname-records-absent',
    },
  });
  const view = renderPropagationView(observation, PROPAGATION_RECORD);

  assert.match(view.bodyHtml, /low confidence/i);
  assert.match(view.bodyHtml, /fell back/i);
  // The authoritative answer must never read as a real authoritative reading when it is really
  // the recursive fallback: it must not print a bare DNS-looking answer in the authoritative row.
  assert.doesNotMatch(view.bodyHtml, /Authoritative[^<]*100::/);
});

test('renderPropagationView never fabricates a certificate status: only the HTTPS marker outcome drives the cert cell', () => {
  const pending = renderPropagationView(
    makeObservation(PROPAGATION_HOLD_CLASS, { detail: { markerOutcome: 'certificate-pending' } }),
    PROPAGATION_RECORD,
  );
  assert.match(pending.bodyHtml, /Certificate/);
  assert.match(pending.bodyHtml, /not yet issued/i);

  const live = renderPropagationView(
    makeObservation(PROPAGATION_HOLD_CLASS, { detail: { markerOutcome: 'live' } }),
    PROPAGATION_RECORD,
  );
  assert.match(live.bodyHtml, /issued/i);

  const unknown = renderPropagationView(
    makeObservation(PROPAGATION_HOLD_CLASS, { detail: { markerOutcome: 'hostname-records-absent' } }),
    PROPAGATION_RECORD,
  );
  assert.match(unknown.bodyHtml, /not yet knowable/i);
});

test('renderPropagationView on the delegated-step no-hold fixture (no probe attempted yet) renders without crashing', () => {
  const noHoldObservation = makeObservation(PROPAGATION_HOLD_CLASS);
  assert.equal(noHoldObservation.attempt, 0, 'the no-hold fixture is the default: no probe has run yet');

  const view = renderPropagationView(noHoldObservation, DELEGATED_STEP_RECORD);
  assert.match(view.bodyHtml, /example\.com/);
  assert.doesNotMatch(view.bodyHtml, /undefined/);
  assert.doesNotMatch(view.bodyHtml, /null/);
});

test('renderPropagationView never renders a secret field off the record', () => {
  const view = renderPropagationView(makeObservation(PROPAGATION_HOLD_CLASS), PROPAGATION_RECORD);
  assert.doesNotMatch(view.bodyHtml, /SECRET-SHOULD-NEVER-RENDER/);
});

test('renderPropagationView refreshes at the propagation display cadence, read from hold-loop.mjs', () => {
  const view = renderPropagationView(makeObservation(PROPAGATION_HOLD_CLASS), PROPAGATION_RECORD);
  assert.equal(view.refreshSeconds, DISPLAY_REFRESH_SECONDS[PROPAGATION_HOLD_CLASS]);
  const html = renderPage({ chapter: CHAPTER, hop: HOP, bodyHtml: view.bodyHtml, refreshSeconds: view.refreshSeconds });
  assert.match(html, new RegExp(`<meta http-equiv="refresh" content="${DISPLAY_REFRESH_SECONDS[PROPAGATION_HOLD_CLASS]}">`));
});

test('renderPropagationView carries the serves-during-a-run-only sentence when wrapped through renderPage', () => {
  const view = renderPropagationView(makeObservation(PROPAGATION_HOLD_CLASS), PROPAGATION_RECORD);
  const html = renderPage({ chapter: CHAPTER, hop: HOP, bodyHtml: view.bodyHtml, refreshSeconds: view.refreshSeconds });
  assert.match(html, new RegExp(SERVES_DURING_RUN_SENTENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('renderBuildsView before discovery reports discovery is still in progress', () => {
  const observation = makeObservation(BUILD_HOLD_CLASS, { attempt: 1 });
  const view = renderBuildsView(observation, BUILDS_RECORD);
  assert.match(view.bodyHtml, /discovering/i);
  assert.doesNotMatch(view.bodyHtml, /undefined/);
});

test('renderBuildsView shows queued, then running, then the settled outcome and the matched commit', () => {
  const queued = renderBuildsView(
    makeObservation(BUILD_HOLD_CLASS, {
      attempt: 2,
      detail: { buildUuid: 'b-1', status: 'queued', outcome: null, commitSha: 'abc123' },
    }),
    BUILDS_RECORD,
  );
  assert.match(queued.bodyHtml, /b-1/);
  assert.match(queued.bodyHtml, /queued/);
  assert.match(queued.bodyHtml, /abc123/);

  const running = renderBuildsView(
    makeObservation(BUILD_HOLD_CLASS, {
      attempt: 3,
      detail: { buildUuid: 'b-1', status: 'running', outcome: null, commitSha: 'abc123' },
    }),
    BUILDS_RECORD,
  );
  assert.match(running.bodyHtml, /running/);

  const settled = renderBuildsView(
    makeObservation(BUILD_HOLD_CLASS, {
      attempt: 4,
      cleared: true,
      detail: { buildUuid: 'b-1', status: 'stopped', outcome: 'success', commitSha: 'abc123' },
    }),
    BUILDS_RECORD,
  );
  assert.match(settled.bodyHtml, /stopped/);
  assert.match(settled.bodyHtml, /success/);
  assert.match(settled.bodyHtml, /abc123/);
});

test('renderBuildsView never renders a secret field off the record', () => {
  const view = renderBuildsView(makeObservation(BUILD_HOLD_CLASS), BUILDS_RECORD);
  assert.doesNotMatch(view.bodyHtml, /SECRET-SHOULD-NEVER-RENDER/);
});

test('renderBuildsView refreshes at the builds display cadence, read from hold-loop.mjs', () => {
  const view = renderBuildsView(makeObservation(BUILD_HOLD_CLASS), BUILDS_RECORD);
  assert.equal(view.refreshSeconds, DISPLAY_REFRESH_SECONDS[BUILD_HOLD_CLASS]);
  const html = renderPage({ chapter: CHAPTER, hop: HOP, bodyHtml: view.bodyHtml, refreshSeconds: view.refreshSeconds });
  assert.match(html, new RegExp(`<meta http-equiv="refresh" content="${DISPLAY_REFRESH_SECONDS[BUILD_HOLD_CLASS]}">`));
});

test('renderBuildsView carries the serves-during-a-run-only sentence when wrapped through renderPage', () => {
  const view = renderBuildsView(makeObservation(BUILD_HOLD_CLASS), BUILDS_RECORD);
  const html = renderPage({ chapter: CHAPTER, hop: HOP, bodyHtml: view.bodyHtml, refreshSeconds: view.refreshSeconds });
  assert.match(html, new RegExp(SERVES_DURING_RUN_SENTENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
