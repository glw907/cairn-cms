import test from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './open.mjs';

test('openBrowser always logs a plain-text fallback link, so a headless session is never stuck', async () => {
  // PATH is emptied so no real opener can spawn: the suite must never reach the operator's
  // desktop, and the logged fallback line is what this test is about.
  const previousPath = process.env.PATH;
  process.env.PATH = '';
  try {
    const logs = [];
    await openBrowser('http://127.0.0.1:5555/manifest', (line) => logs.push(line));
    assert.ok(
      logs.some((line) => line === 'Open this link if the browser did not open: http://127.0.0.1:5555/manifest'),
      `expected the fallback line, got: ${JSON.stringify(logs)}`,
    );
  } finally {
    process.env.PATH = previousPath;
  }
});

test('openBrowser resolves even when nothing on PATH can open a browser', async () => {
  const previousPath = process.env.PATH;
  process.env.PATH = '';
  try {
    const logs = [];
    await assert.doesNotReject(() => openBrowser('http://127.0.0.1:5555/manifest', (line) => logs.push(line)));
    assert.equal(logs.length, 1);
  } finally {
    process.env.PATH = previousPath;
  }
});

test('openBrowser with secret:true still logs the full URL at an interactive terminal', async () => {
  const previousPath = process.env.PATH;
  process.env.PATH = '';
  const previousTTY = process.stdout.isTTY;
  process.stdout.isTTY = true;
  try {
    const logs = [];
    await openBrowser(
      'http://127.0.0.1:5555/admin/auth/confirm?token=SUPER-SECRET-TOKEN',
      (line) => logs.push(line),
      { secret: true },
    );
    assert.ok(
      logs.some((line) => line.includes('SUPER-SECRET-TOKEN')),
      `expected the full URL at a TTY, got: ${JSON.stringify(logs)}`,
    );
  } finally {
    process.env.PATH = previousPath;
    process.stdout.isTTY = previousTTY;
  }
});

test('openBrowser with secret:true keeps the token out of a non-interactive log', async () => {
  const previousPath = process.env.PATH;
  process.env.PATH = '';
  const previousTTY = process.stdout.isTTY;
  process.stdout.isTTY = false;
  try {
    const logs = [];
    await openBrowser(
      'http://127.0.0.1:5555/admin/auth/confirm?token=SUPER-SECRET-TOKEN',
      (line) => logs.push(line),
      { secret: true },
    );
    assert.ok(
      !logs.some((line) => line.includes('SUPER-SECRET-TOKEN')),
      `expected no line to carry the token, got: ${JSON.stringify(logs)}`,
    );
    assert.ok(
      logs.some((line) => line.includes('http://127.0.0.1:5555')),
      `expected the origin to still print, got: ${JSON.stringify(logs)}`,
    );
    assert.ok(
      logs.some((line) => line.includes('--sign-in')),
      `expected a re-run hint naming --sign-in, got: ${JSON.stringify(logs)}`,
    );
  } finally {
    process.env.PATH = previousPath;
    process.stdout.isTTY = previousTTY;
  }
});

test('openBrowser without secret:true (the GitHub chapter shape) always logs the full URL, TTY or not', async () => {
  const previousPath = process.env.PATH;
  process.env.PATH = '';
  const previousTTY = process.stdout.isTTY;
  process.stdout.isTTY = false;
  try {
    const logs = [];
    await openBrowser('http://127.0.0.1:5555/manifest', (line) => logs.push(line));
    assert.ok(logs.some((line) => line.includes('http://127.0.0.1:5555/manifest')));
  } finally {
    process.env.PATH = previousPath;
    process.stdout.isTTY = previousTTY;
  }
});
