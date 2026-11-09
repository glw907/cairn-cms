// The control page's "Run the check" action: the page offers it, and its answer is the check's JSON
// document, valid against schema/cairn-theme-check.schema.json.
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { test } from 'node:test';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { startInteractive } from './viewer/interactive.mjs';
import { copyOptionsFixture } from './viewer/fixture.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');

test('the check action runs on the loaded theme and answers a document that matches the schema', { timeout: 400_000 }, async () => {
  const fixture = copyOptionsFixture();
  const viewer = await startInteractive({ root: REPO, theme: fixture.dir });
  try {
    const html = await (await fetch(viewer.controlUrl)).text();
    assert.ok(html.includes('action="/api/check"') && html.includes('>Run the check</button>'), 'the page offers the action');

    // `audit` makes a showcase copy, which a check run inside the viewer's own process would delete
    // along with the site the viewer serves; the action runs the check as a child process.
    const rules = ['manifest-schema', 'paths-required', 'paths-unlisted', 'tokens-stale', 'tokens-required', 'fonts', 'external-host', 'audit'];
    const response = await fetch(`${viewer.controlUrl}/api/check`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ rules: rules.join(',') }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();

    const schema = JSON.parse(readFileSync(path.join(REPO, 'schema/cairn-theme-check.schema.json'), 'utf8'));
    const validate = new Ajv2020({ strict: false }).compile(schema);
    assert.ok(validate(body), JSON.stringify(validate.errors));
    assert.equal(body.theme, 'options-theme');
    assert.deepEqual([...body.rules].sort(), [...rules].sort());
    assert.equal(body.verdict, 'pass');
    assert.equal((await fetch(`${viewer.siteUrl}/`)).status, 200, 'the viewer still serves its site after the check');
  } finally {
    viewer.stop();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
