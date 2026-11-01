// Tests for the site and tree fixtures, the resume log, the early-stop rules, and the three
// faults the docs-process harness carried (#92, #93, #94). Run with `npm run test:emit`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  appendRow, claudeArgs, controlFault, deniedFaults, faultRecord, finishedKeys, isUsageLimit, medianTable,
  parseArgs, readRows, sessionVerdict, skipReason, stripPaths, summarizeStream, tokensOf, trialKey,
} from './run.mjs';

test('parseArgs reads the site-suite flags and rejects a bad shape', () => {
  const site = parseArgs(['a', 'b', '--suite', 'site', '--fixture', 'site', '--strip', 'p.txt', '--tree-plugin-dir', '/t',
    '--plugin-dir', '/p', '--concurrency', '6', '--baseline-first', '--reuse-baseline', 'r1', '--resume', 'r2']);
  assert.deepEqual([site.suite, site.fixture, site.strip, site.treePluginDir, site.pluginDir, site.concurrency,
    site.baselineFirst, site.reuseBaseline, site.resume], ['site', 'site', 'p.txt', '/t', '/p', 6, true, 'r1', 'r2']);
  const plain = parseArgs(['a']);
  assert.deepEqual([plain.fixture, plain.concurrency, plain.baselineFirst, plain.resume], [null, 4, false, null]);
  assert.throws(() => parseArgs(['a', '--concurrency', '0']), /--concurrency/);
  assert.throws(() => parseArgs(['a', '--fixture', 'moon']), /--fixture/);
  assert.throws(() => parseArgs(['a', '--reuse-baseline', 'r1']), /two refs/);
  assert.throws(() => parseArgs(['a', '--baseline-first']), /two refs/);
});

const streamWith = (skills, output, extra = []) => summarizeStream([
  { type: 'system', subtype: 'init', apiKeySource: 'none', skills, cwd: '/w', plugins: [{ name: 'standards' }, { name: 'cc-plugin-agents-md' }] },
  { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'u1', name: 'Skill', input: { skill: 'cairn-writing-docs' } }] } },
  ...(output === null ? [] : [{ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'u1', content: output }] } }]),
  ...extra,
].map((e) => JSON.stringify(e)).join('\n'));

const okResult = { type: 'result', subtype: 'success', is_error: false, result: 'done' };
const errResult = { type: 'result', subtype: 'error_during_execution', is_error: true, result: 'boom' };

test('#94 controlFault reads a Skill call with no result as cut off, not launched', () => {
  assert.equal(controlFault(streamWith([], null)), null);
  assert.equal(controlFault(streamWith([], '')), null);
  assert.match(controlFault(streamWith([], 'Launching skill: cairn-writing-docs')), /launched/);
});

test('controlFault names the skills it is given', () => {
  const s = streamWith(['cairn-extend'], 'Unknown skill: x');
  assert.match(controlFault(s, ['cairn-extend', 'cairn-extending-a-site']), /lists cairn-extend/);
  assert.equal(controlFault(s, ['cairn-other']), null);
});

test('summarizeStream keeps the plugin names, usage, and duration of the result', () => {
  const s = streamWith(['x'], 'ok', [{
    type: 'result', subtype: 'success', is_error: false, result: 'done', duration_ms: 147000,
    usage: { input_tokens: 10, cache_creation_input_tokens: 20, output_tokens: 5, cache_read_input_tokens: 900 },
  }]);
  assert.deepEqual(s.init.plugins, ['standards', 'cc-plugin-agents-md']);
  assert.equal(s.result.durationMs, 147000);
  assert.deepEqual(s.result.usage, { input: 10, cacheCreation: 20, output: 5, cacheRead: 900 });
  assert.equal(tokensOf(s.result.usage), 35, 'tokens are input plus cache creation plus output; reads sit beside them');
});

test('#93 sessionVerdict reports a control leak before an error', () => {
  const leaked = streamWith(['cairn-writing-docs'], 'Launching skill', [errResult]);
  const v = sessionVerdict({ s: leaked, control: true, skills: ['cairn-writing-docs'], timedOut: false, code: 1, signal: null });
  assert.equal(v.status, 'fault');
  assert.match(v.detail, /control arm/);
  const plain = sessionVerdict({ s: streamWith([], null, [errResult]), control: true, skills: ['cairn-writing-docs'], timedOut: false, code: 1, signal: null });
  assert.equal(plain.status, 'error');
});

test('sessionVerdict faults a treatment arm that lacks every expected skill and passes one that has any', () => {
  const none = sessionVerdict({ s: streamWith(['x'], null, [okResult]), control: false, skills: ['a', 'b'], timedOut: false });
  assert.equal(none.status, 'fault');
  assert.match(none.detail, /a, b/);
  assert.equal(sessionVerdict({ s: streamWith(['b'], null, [okResult]), control: false, skills: ['a', 'b'], timedOut: false }), null);
  assert.equal(sessionVerdict({ s: streamWith([], null, [okResult]), control: false, skills: [], timedOut: false }), null, 'no expectation, no fault');
  assert.equal(sessionVerdict({ s: streamWith(['b'], null, []), control: false, skills: [], timedOut: true }).detail, 'timed out');
});

test('sessionVerdict checks the standards plugin count when a case expects it', () => {
  const ok = [okResult];
  assert.equal(sessionVerdict({ s: streamWith([], null, ok), control: false, skills: [], timedOut: false, plugins: { standards: 1 } }), null);
  assert.match(sessionVerdict({ s: streamWith([], null, ok), control: false, skills: [], timedOut: false, plugins: { standards: 0 } }).detail, /standards/);
  assert.match(sessionVerdict({ s: streamWith([], null, ok), control: false, skills: [], timedOut: false, plugins: { standards: 2 } }).detail, /standards/);
});

test('#92 faultRecord keeps the end-of-session record a throwing trial carried', () => {
  const job = { caseDef: { id: 'c' }, arm: { label: 'main' }, trial: 2 };
  const end = { exitCode: 0, lastEvent: 'result/success' };
  const withEnd = faultRecord(job, Object.assign(new Error('git add failed'), { record: { end, transcript: '/t.jsonl' } }));
  assert.deepEqual([withEnd.status, withEnd.end, withEnd.transcript], ['fault', end, '/t.jsonl']);
  assert.match(withEnd.detail, /runner: git add failed/);
  assert.equal(faultRecord(job, new Error('x')).end, undefined);
});

test('isUsageLimit reads a usage-limit result and nothing else', () => {
  const lim = streamWith([], null, [{ type: 'result', subtype: 'success', is_error: true, result: "You've hit your usage limit. Resets 5pm." }]);
  assert.equal(isUsageLimit(lim), true);
  assert.equal(isUsageLimit(streamWith([], null, [okResult])), false);
  assert.equal(isUsageLimit(streamWith([], null, [errResult])), false);
});

test('rows append as JSONL and a resume skips finished keys but reruns errors', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evals-rows-'));
  try {
    const file = join(dir, 'results.jsonl');
    assert.deepEqual(readRows(file), []);
    appendRow(file, { caseId: 'a', arm: 'x', trial: 1, status: 'graded', pass: true });
    appendRow(file, { caseId: 'a', arm: 'x', trial: 2, status: 'error' });
    appendRow(file, { caseId: 'a', arm: 'x', trial: 3, status: 'fault' });
    writeFileSync(file, `${readFileSync(file, 'utf8')}{"caseId":"a","arm":"x","tri`);
    const rows = readRows(file);
    assert.equal(rows.length, 3, 'a truncated last line is dropped');
    assert.deepEqual([...finishedKeys(rows)].sort(), [trialKey('a', 'x', 1), trialKey('a', 'x', 3)].sort());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('skipReason stops an arm at the failure that decides it and skips a treatment case the baseline cannot count', () => {
  const g = (caseId, arm, trial, pass) => ({ caseId, arm, trial, status: 'graded', pass });
  const opts = { trials: 5, earlyStop: true, baselineLabel: 'base' };
  const job = (arm, role, bar = 4) => ({ caseDef: { id: 'c', bar }, arm: { label: arm, role }, trial: 4 });
  assert.equal(skipReason(job('base', 'baseline'), [g('c', 'base', 1, true), g('c', 'base', 2, false)], opts), null, 'one failure still leaves 4 of 5');
  assert.match(skipReason(job('base', 'baseline'), [g('c', 'base', 1, false), g('c', 'base', 2, false)], opts), /cannot count/);
  const baseOk = [1, 2, 3, 4, 5].map((n) => g('c', 'base', n, true));
  const baseBad = [1, 2, 3, 4, 5].map((n) => g('c', 'base', n, n > 3));
  assert.match(skipReason(job('new', 'treatment'), baseBad, opts), /baseline/);
  assert.equal(skipReason(job('new', 'treatment'), baseOk, opts), null);
  const newFail = [g('c', 'new', 1, false), g('c', 'new', 2, false)];
  assert.match(skipReason(job('new', 'treatment'), [...baseOk, ...newFail], opts), /decided/);
  assert.match(skipReason(job('new', 'treatment', 5), [...baseOk, g('c', 'new', 1, false)], opts), /decided/, 'a 5/5 case is decided by one failure');
  assert.equal(skipReason(job('new', 'treatment'), [...baseOk, ...newFail], { ...opts, earlyStop: false }), null);
});

test('medianTable sums each case median over passing trials, with all-trial sums beside', () => {
  const r = (caseId, arm, trial, pass, tokens, ms) => ({ caseId, arm, trial, status: 'graded', pass, usage: { input: tokens, cacheCreation: 0, output: 0, cacheRead: 7 }, durationMs: ms });
  const rows = [r('a', 'x', 1, true, 100, 60000), r('a', 'x', 2, true, 300, 120000), r('a', 'x', 3, false, 9000, 600000), r('b', 'x', 1, true, 50, 30000)];
  const t = medianTable(rows, ['x']);
  assert.match(t, /\| a \| x \| 200 \| 90 \|/);
  assert.match(t, /\| total \| x \| 250 \| 120 \| 9450 \| 810 \|/);
});

test('stripPaths removes listed paths from an unpacked package and leaves the rest', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evals-strip-'));
  try {
    mkdirSync(join(dir, 'docs/extend'), { recursive: true });
    mkdirSync(join(dir, 'docs/admin'), { recursive: true });
    writeFileSync(join(dir, 'docs/extend/a.md'), 'x');
    writeFileSync(join(dir, 'docs/admin/b.md'), 'y');
    writeFileSync(join(dir, 'package.json'), '{}');
    assert.deepEqual(stripPaths(dir, ['docs/extend', 'docs/missing']).sort(), ['docs/extend']);
    assert.equal(existsSync(join(dir, 'docs/extend')), false);
    assert.equal(existsSync(join(dir, 'docs/admin/b.md')), true);
    assert.throws(() => stripPaths(dir, ['../escape']), /outside/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('claudeArgs gives a site or tree case the project-only settings, its plugin dirs, and the build tools', () => {
  const site = claudeArgs({ fixture: 'site' }, { pluginDirs: ['/p/standards'] });
  const at = site.indexOf('--setting-sources');
  assert.deepEqual(site.slice(at, at + 2), ['--setting-sources', 'project']);
  assert.equal(site[site.indexOf('--plugin-dir') + 1], '/p/standards');
  assert.match(site[site.indexOf('--append-system-prompt') + 1], /Write and Edit tools/);
  assert.equal(claudeArgs({}).includes('--append-system-prompt'), false);
  assert.match(site[site.indexOf('--allowedTools') + 1], /Bash\(npm \*\)/);
  const docs = claudeArgs({});
  assert.equal(docs.includes('--setting-sources'), false);
  assert.doesNotMatch(docs[docs.indexOf('--allowedTools') + 1], /Bash\(npm \*\)/);
});

test('deniedFaults counts a denied build command as a fault on a site or tree case only', () => {
  const denial = [{ tool_use_id: 'd', tool_name: 'Bash', tool_input: { command: 'npm install' } }];
  assert.deepEqual(deniedFaults(denial, [], 'site'), ['npm install']);
  assert.deepEqual(deniedFaults(denial, []), []);
});

test('deniedFaults looks past a cd prefix: a denied read compound is friction, a denied build is a fault unless reissued', () => {
  const den = (id, command) => [{ tool_use_id: id, tool_name: 'Bash', tool_input: { command } }];
  assert.deepEqual(deniedFaults(den('d', 'cd /w && git ls-files | grep x'), [], 'site'), []);
  assert.deepEqual(deniedFaults(den('d', 'cd /w && npm test'), [], 'site'), ['cd /w && npm test']);
  const again = [{ id: 'a', name: 'Bash', input: { command: 'npm test' } }];
  assert.deepEqual(deniedFaults(den('d', 'cd /w && npm test'), again, 'site'), []);
  const split = [{ id: 'b', name: 'Bash', input: { command: 'npm run check:cairn' } }];
  assert.deepEqual(deniedFaults(den('d', 'npm run check:cairn >/tmp/c.log 2>&1; echo $?; tail /tmp/c.log'), split, 'site'), [], 'a split compound recovers by its verb');
  assert.equal(deniedFaults(den('d', 'npm run check:cairn >/tmp/c.log 2>&1; echo $?'), [{ id: 'b', name: 'Bash', input: { command: 'npm run build' } }], 'site').length, 1, 'a different script is not a recovery');
});

test('overlayPaths carries the skill folder before and after its rename, and neither one\'s evals', async () => {
  const { overlayPaths } = await import('./run.mjs');
  const got = overlayPaths([
    '.claude/skills/cairn-docs/SKILL.md', '.claude/skills/cairn-docs/evals/run.mjs',
    '.claude/skills/cairn-writing-docs/SKILL.md', '.claude/skills/cairn-writing-docs/evals/run.mjs',
  ]);
  assert.deepEqual(got, ['.claude/skills/cairn-docs/SKILL.md', '.claude/skills/cairn-writing-docs/SKILL.md']);
});

test('every site case fails its recorded known-bad solution on the file checks alone', async () => {
  const { loadEvals, runCheck, validateEvals } = await import('./run.mjs');
  const { execFileSync } = await import('node:child_process');
  const { pathToFileURL, fileURLToPath } = await import('node:url');
  const here = fileURLToPath(new URL('.', import.meta.url));
  const file = join(here, 'evals-site.json');
  if (!existsSync(file)) return;
  const data = loadEvals(file);
  assert.deepEqual(validateEvals(data), []);
  const FILE_CHECKS = new Set(['contains', 'absent', 'changed', 'unchanged', 'noNewFiles']);
  for (const c of data.evals) {
    const root = mkdtempSync(join(tmpdir(), 'evals-bad-'));
    try {
      const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: root, encoding: 'utf8' });
      git('init', '-q');
      git('commit', '-q', '--allow-empty', '-m', 'base');
      const mod = await import(pathToFileURL(join(here, c.knownBad)).href);
      mod.default(root);
      git('add', '-A');
      const changed = git('diff', '--cached', '--name-status', 'HEAD').split('\n').filter(Boolean)
        .map((l) => { const [status, ...p] = l.split('\t'); return { status: status[0], path: p[p.length - 1] }; });
      const ctx = { root, changed, tools: [], reply: '', runGate: () => false };
      const results = c.checks.filter((k) => FILE_CHECKS.has(k.type)).map((k) => runCheck(k, ctx));
      assert.ok(results.some((r) => !r.ok), `${c.id}: the known-bad solution passes every file check`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('loadEvals merges one case per file from casesDir, and validateEvals holds a site case to its seam, bar, and known-bad', async () => {
  const { loadEvals, validateEvals } = await import('./run.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'evals-load-'));
  try {
    mkdirSync(join(dir, 'cases'));
    writeFileSync(join(dir, 'cases/b.json'), JSON.stringify({ id: 'b' }));
    writeFileSync(join(dir, 'cases/a.json'), JSON.stringify({ id: 'a' }));
    writeFileSync(join(dir, 'x.json'), JSON.stringify({ skill_name: 's', casesDir: 'cases', evals: [{ id: 'z' }] }));
    assert.deepEqual(loadEvals(join(dir, 'x.json')).evals.map((c) => c.id), ['z', 'a', 'b']);
    const bare = { id: 's', prompt: 'p', expectations: ['e'], suite: 'site', fixture: 'site', checks: [{ type: 'contains' }] };
    const problems = validateEvals({ skill_name: 's', evals: [bare] }).join('\n');
    assert.match(problems, /seam is missing/);
    assert.match(problems, /bar must be 4 or 5/);
    assert.match(problems, /knownBad is missing/);
    assert.deepEqual(validateEvals({ skill_name: 's', evals: [{ ...bare, seam: 'x', bar: 5, knownBad: 'run.mjs' }] }), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
