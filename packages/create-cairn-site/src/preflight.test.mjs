// Tests for the credential-free pre-flight checks. Every check here runs before any prompt or
// scaffold action, so a broken machine surfaces its problem before the tool asks for anything.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runPreflight } from './preflight.mjs';

test('old node fails with an upgrade remedy naming the floor', async () => {
  const findings = await runPreflight({ nodeVersion: '18.0.0', platform: 'linux' });
  const node = findings.find((f) => f.check === 'node');
  assert.equal(node.ok, false);
  assert.match(node.remedy, /nodejs\.org|upgrade/i);
});

test('current node passes and loopback binds', async () => {
  const findings = await runPreflight({ nodeVersion: process.versions.node, platform: 'linux' });
  assert.equal(findings.find((f) => f.check === 'node').ok, true);
  assert.equal(findings.find((f) => f.check === 'loopback').ok, true);
});

test('no finding ever lacks a remedy', async () => {
  const findings = await runPreflight({ nodeVersion: '18.0.0', platform: 'win32' });
  for (const f of findings) assert.ok(f.remedy.length > 0, f.check);
});

test('the node check compares numerically, not as strings', async () => {
  const passing = await runPreflight({ nodeVersion: '22.10.0', platform: 'linux' });
  assert.equal(passing.find((f) => f.check === 'node').ok, true, '22.10.0 should meet a >=22 floor');

  const failing = await runPreflight({ nodeVersion: '9.0.0', platform: 'linux' });
  assert.equal(
    failing.find((f) => f.check === 'node').ok,
    false,
    '9.0.0 should fail a >=22 floor even though "9.0.0" > "22.0.0" as a string'
  );
});

test('proxy finding is absent without a proxy env var, present and naming the value with one', async () => {
  const originalUpper = process.env.HTTPS_PROXY;
  const originalLower = process.env.https_proxy;
  delete process.env.HTTPS_PROXY;
  delete process.env.https_proxy;
  try {
    const noProxy = await runPreflight({ nodeVersion: process.versions.node, platform: 'linux' });
    assert.equal(noProxy.find((f) => f.check === 'proxy'), undefined);

    process.env.HTTPS_PROXY = 'http://proxy.example:8080';
    const withProxy = await runPreflight({ nodeVersion: process.versions.node, platform: 'linux' });
    const proxy = withProxy.find((f) => f.check === 'proxy');
    assert.ok(proxy);
    assert.equal(proxy.ok, true);
    assert.match(proxy.remedy, /http:\/\/proxy\.example:8080/);
  } finally {
    if (originalUpper === undefined) delete process.env.HTTPS_PROXY;
    else process.env.HTTPS_PROXY = originalUpper;
    if (originalLower === undefined) delete process.env.https_proxy;
    else process.env.https_proxy = originalLower;
  }
});

test('no powershell finding on linux, exactly one on win32', async () => {
  const linux = await runPreflight({ nodeVersion: process.versions.node, platform: 'linux' });
  assert.equal(linux.filter((f) => f.check === 'powershell-execution-policy').length, 0);

  const win = await runPreflight({ nodeVersion: process.versions.node, platform: 'win32' });
  assert.equal(win.filter((f) => f.check === 'powershell-execution-policy').length, 1);
});

test('runPreflight defaults to the running process version and platform with no arguments', async () => {
  const findings = await runPreflight();
  assert.equal(findings.find((f) => f.check === 'node').ok, true);
  const psFinding = findings.find((f) => f.check === 'powershell-execution-policy');
  if (process.platform === 'win32') {
    assert.ok(psFinding);
  } else {
    assert.equal(psFinding, undefined);
  }
});
