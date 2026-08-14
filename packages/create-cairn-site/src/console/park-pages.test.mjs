import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudflareError, WAIT_KIND_CODES } from '../cloudflare/catalogue.mjs';
import { escapeHtml } from './render.mjs';
import { renderParkPage } from './park-pages.mjs';

const CHAPTER = 'Chapter 2: Cloudflare';
const HOP = 'Connect your domain to your site';
const DIR = '/tmp/fixture-site';

/**
 * Plausible params for every wait-kind catalogue code, enough to build a real row. This is the
 * completeness list Task 5b's own tests are checked against: a code with no entry here fails the
 * completeness test below rather than silently rendering an incomplete page.
 */
const PARK_FIXTURES = {
  'delegation-propagating': {
    dir: DIR,
    domain: 'example.com',
    nameServers: ['ada.ns.cloudflare.com', 'walt.ns.cloudflare.com'],
  },
  'delegation-pending': {
    dir: DIR,
    domain: 'example.com',
    nameServers: ['ada.ns.cloudflare.com', 'walt.ns.cloudflare.com'],
  },
  'hostname-records-absent': { dir: DIR, domain: 'example.com' },
  'hostname-resolver-lagging': { dir: DIR, domain: 'example.com' },
  'certificate-pending': { dir: DIR, domain: 'example.com' },
  'email-not-ready': { dir: DIR, domain: 'example.com' },
  'email-sender-propagating': { dir: DIR },
  'email-daily-limit': { dir: DIR },
  'builds-app-not-authorized': { dir: DIR },
  'builds-repo-not-selected': { dir: DIR, owner: 'glw907', repo: 'alpine' },
  'build-not-started': { dir: DIR },
  'build-running': { dir: DIR },
  'builds-reconcile-parked': { dir: DIR },
};

/**
 * Split a catalogue row's full printed text the same way its `Next:` line is separated from the
 * body a reader sees above it, mirroring catalogue.mjs's own `extractNext` split direction (the
 * body, not the label-stripped Next text catalogue.mjs already exposes as `err.catalogue.next`).
 * @param {string} message the row's full printed text
 * @returns {string} every line except the trailing `Next:` line
 */
function messageBody(message) {
  return message
    .split('\n')
    .filter((line) => !line.startsWith('Next:'))
    .join('\n');
}

test('every wait-kind catalogue code has a park-page fixture (completeness)', () => {
  for (const code of WAIT_KIND_CODES) {
    assert.ok(code in PARK_FIXTURES, `missing park-page fixture for wait-kind code ${code}`);
  }
});

test('park-page output equality: the rendered page carries the exact printed message and Next: line, for every enumerated wait-kind code', () => {
  for (const code of WAIT_KIND_CODES) {
    const params = PARK_FIXTURES[code];
    const printed = cloudflareError(code, params);
    const page = renderParkPage({ code, params, chapter: CHAPTER, hop: HOP });

    assert.match(page, /<!doctype html>/, `${code}: expected a full document`);
    assert.ok(
      page.includes(escapeHtml(messageBody(printed.message))),
      `${code}: park page is missing the printed row's own message`,
    );
    assert.ok(
      page.includes(`Next: ${escapeHtml(printed.catalogue.next)}`),
      `${code}: park page is missing the printed row's own exact Next: line`,
    );
  }
});

test('renderParkPage carries the chapter/hop header and the serves-during-a-run-only sentence', () => {
  const page = renderParkPage({
    code: 'delegation-pending',
    params: PARK_FIXTURES['delegation-pending'],
    chapter: CHAPTER,
    hop: HOP,
  });
  assert.match(page, /Chapter 2: Cloudflare/);
  assert.match(page, /Connect your domain to your site/);
  assert.match(page, /served only while this run is waiting/);
});

test('renderParkPage renders no refresh meta: a park is a terminal state for the console', () => {
  const page = renderParkPage({
    code: 'build-not-started',
    params: PARK_FIXTURES['build-not-started'],
    chapter: 'Chapter 3: Workers Builds',
    hop: 'Watch your first Workers Builds deploy',
  });
  assert.doesNotMatch(page, /http-equiv="refresh"/);
});
