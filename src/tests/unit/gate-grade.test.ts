// The grader on fixture run directories with known values: it names the missed relay by its
// sentence, the permission prompt's command, the over-10 and overhead flags, each deploy phase and
// the HTTPS wait, splits provider waits from agent time, fails the timing check naming a gap, diffs
// against the last record, fails a mailbox error and a wrong candidate, and fails a scan match.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { findSignInMessage } from '../../../scripts/gate/mail.mjs';
import { gateFetch } from '../../../scripts/gate/fetch-check.mjs';
import { LIVE_ORIGIN, grade, missedRelays, parseTranscript, permissionPrompts, setupEvents } from '../../../scripts/gate/grade.mjs';

const roots: string[] = [];
afterEach(async () => {
  for (const dir of roots.splice(0)) await rm(dir, { recursive: true, force: true });
});

const T0 = Date.parse('2026-11-09T12:00:00.000Z');
const at = (minutes: number) => new Date(T0 + minutes * 60_000).toISOString();
const GOAL = 6; // minutes after the harness began, so 6 minutes of overhead
const SENTENCE_RELAYED = 'Select Create to add a GitHub App for Cairn gate 2611091200. The admin saves changes to your site through the App.';
const SENTENCE_MISSED = 'Select Approve to give the App access to cairn-gate-2611091200 only. Setup uses this access to push your site and store the deploy key.';
const BUILD = '2026-11-09T12:00:00Z';

const event = (kind: string, minute: number, extra: Record<string, unknown> = {}) => ({ schemaVersion: 1, kind, timestamp: at(GOAL + minute), ...extra });
const resultLine = (minute: number, events: unknown[], id = `tu-${minute}`) => ({
  type: 'user',
  timestamp: at(GOAL + minute),
  message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: events.map((e) => JSON.stringify(e)).join('\n') }] },
});
const assistantText = (minute: number, text: string, id: string) => ({ type: 'assistant', timestamp: at(GOAL + minute), message: { id, role: 'assistant', content: [{ type: 'text', text }], usage: { input_tokens: 10, output_tokens: 5 } } });

interface Options {
  id?: string;
  withEvents?: boolean;
  withStandIn?: boolean;
  withElapsed?: boolean;
  launcher?: string;
  jobs?: { name: string; started: number; ended: number }[];
  scanCode?: number;
  mail?: 'found' | 'throws';
  deployMinutes?: number;
  local?: boolean;
  /** Leaves out the npx cache, so the launcher and the platform package read as missing. */
  noNpx?: boolean;
}

async function makeRun(opts: Options = {}) {
  const { id = '2611091200', withEvents = true, withStandIn = true, withElapsed = true, launcher = '2.0.0-rc.4' } = opts;
  const root = await mkdtemp(path.join(tmpdir(), 'gate-grade-'));
  roots.push(root);
  const base = path.join(root, id);
  const runDir = path.join(base, 'run');
  const home = path.join(base, 'home');
  await mkdir(runDir, { recursive: true });
  await mkdir(path.join(home, '.local', 'share', 'keyrings'), { recursive: true });
  await writeFile(path.join(home, '.local', 'share', 'keyrings', 'login.keyring'), 'x');
  await writeFile(path.join(runDir, 'harness.json'), JSON.stringify({ leg: 'naive', id, siteName: `Cairn gate ${id}`, begin: at(0), commit: 'abc1234def', candidate: { engine: '0.99.0-rc.4', tool: opts.local ? 'local build at abc1234def' : '2.0.0-rc.4' }, ...(opts.local ? { local: true } : {}) }));
  const transcript: unknown[] = [
    { type: 'user', timestamp: at(GOAL), message: { role: 'user', content: 'Set up a new cairn site and sign in as owner.' } },
    assistantText(0.5, 'I will read the README first.', 'a1'),
  ];
  if (withEvents) {
    transcript.push(
      resultLine(1, [event('step_started', 1, { step: 'opening-checks' }), event('step_done', 1.5, { step: 'opening-checks' })]),
      resultLine(2, [event('step_started', 2, { step: 'approve-create-app' }), event('waiting', 2, { step: 'approve-create-app', waiting: 'approve-create-app', sentence: SENTENCE_RELAYED })]),
      assistantText(2.2, `Please do this next. ${SENTENCE_RELAYED}`, 'a2'),
      resultLine(3, [event('step_done', 3, { step: 'approve-create-app' }), event('step_started', 3, { step: 'approve-install-repo' }), event('waiting', 3, { step: 'approve-install-repo', waiting: 'approve-install-repo', sentence: SENTENCE_MISSED })]),
      assistantText(3.2, 'Still waiting on the browser.', 'a3'),
      resultLine(3.5, [event('step_done', 3.5, { step: 'approve-install-repo' }), event('step_started', 4, { step: 'first-deploy' })]),
      resultLine(8, [event('step_done', 8, { step: 'first-deploy' }), event('step_started', 8, { step: 'domains' })]),
      resultLine(10, [event('step_done', 10, { step: 'domains' })]),
      assistantText(11, 'Setup is done.', 'a4'),
    );
  }
  await writeFile(path.join(runDir, 'transcript.jsonl'), `${transcript.map((line) => JSON.stringify(line)).join('\n')}\n`);
  const standIn = withStandIn ? [{ kind: 'consent', action: 'click link', at: at(GOAL + 2) }, { kind: 'admin', action: 'signed-in', at: at(GOAL + 12) }] : [];
  await writeFile(path.join(runDir, 'stand-in.jsonl'), standIn.map((line) => JSON.stringify(line)).join('\n'));
  await writeFile(path.join(runDir, 'state.json'), JSON.stringify({ state: 'exited', ...(withElapsed ? { elapsedMinutes: 18 } : {}), statuslineCost: 3.25, transcriptCost: 3.1 }));
  await writeFile(
    path.join(runDir, 'session.log'),
    '\u001b[1mBash command\u001b[0m\r\n   npm view cairn-thing version\r\n   Look up a version\r\n Do you want to proceed?\r\n 1. Yes\r\n',
  );
  await mkdir(path.join(home, '.config', 'cairn', 'sites'), { recursive: true });
  await writeFile(path.join(home, '.config', 'cairn', 'sites', 'site.json'), JSON.stringify({ name: 'Cairn gate', step: 'live', github: { repo: { owner: 'glw907-test', repo: `cairn-gate-${id}` } } }));
  const npx = path.join(home, '.npm', '_npx', 'abc', 'node_modules');
  await mkdir(path.join(home, '.npm', '_npx'), { recursive: true });
  if (!opts.noNpx) {
    await mkdir(path.join(npx, 'create-cairn-site'), { recursive: true });
    await mkdir(path.join(npx, '@glw907', 'cairn-linux-x64'), { recursive: true });
    await writeFile(path.join(npx, 'create-cairn-site', 'package.json'), JSON.stringify({ version: launcher }));
    await writeFile(path.join(npx, '@glw907', 'cairn-linux-x64', 'package.json'), JSON.stringify({ version: '2.0.0-rc.4' }));
  }

  const jobs = opts.jobs ?? [
    { name: 'Run npm install', started: 0, ended: 1.5 },
    { name: 'Run npm run check', started: 1.5, ended: 2 },
    { name: 'Run npm run build', started: 2, ended: 3 },
    { name: 'Run npx wrangler d1 migrations apply AUTH_DB --remote', started: 3, ended: 3.5 },
    { name: 'Run npx wrangler deploy', started: 3.5, ended: 4 },
  ];
  const stamp = (minute: number) => new Date(Date.parse(BUILD) + minute * 60_000).toISOString();
  const githubFetch = async (url: string | URL | Request) => {
    const target = String(url);
    const reply = (body: unknown, status = 200) => ({ status, json: async () => body }) as Response;
    if (target.endsWith('/contents/package.json')) return reply({ content: Buffer.from(JSON.stringify({ dependencies: { '@glw907/cairn-cms': '0.99.0-rc.4' } })).toString('base64') });
    if (target.includes('/actions/runs?')) return reply({ workflow_runs: [{ id: 22, name: 'deploy', created_at: stamp(5) }, { id: 11, name: 'deploy', created_at: stamp(0) }, { id: 33, name: 'check', created_at: stamp(0) }] });
    if (target.endsWith('/actions/runs/11/jobs')) return reply({ jobs: [{ steps: jobs.map((job) => ({ name: job.name, started_at: stamp(job.started), completed_at: stamp(job.ended) })) }] });
    return reply({}, 404);
  };
  const cleanroomCalls: string[][] = [];
  const cleanroom = async (args: string[]) => {
    cleanroomCalls.push(args);
    if (args[0] === 'cost') return { code: 0, stdout: '$0.50\n' };
    if (args[0] === 'scan') return { code: opts.scanCode ?? 0, stdout: opts.scanCode ? `${args[2]}\n` : '' };
    return { code: 0, stdout: 'cairn-gate: finished at live\n' };
  };
  const provingDir = path.join(root, 'proving');
  const deps = {
    cleanroom,
    githubFetch: githubFetch as typeof fetch,
    siteFetch: (async () => ({ status: 200, text: async () => '' })) as unknown as typeof gateFetch, // the grader reads only status and text()
    findMail: (async () => {
      if (opts.mail === 'throws') throw new Error('JMAP Email/query answered an error');
      return { found: true, from: 'noreply@carin-test.org', url: 'https://gate.carin-test.org/admin/auth/confirm?token=SECRET' };
    }) as unknown as typeof findSignInMessage, // the stub answers the shape the grader reads
    provingDir,
    env: { GITHUB_TEST_TOKEN: 'stub-gh', STALWART_PASSWORD_CAIRN_GATE: 'stub-mail' },
  };
  return { runDir, home, provingDir, deps, cleanroomCalls, root };
}

describe('a scripted run', () => {
  const asScripted = async (run: Awaited<ReturnType<typeof makeRun>>, lines: string[]) => {
    const file = path.join(run.runDir, 'harness.json');
    await writeFile(file, JSON.stringify({ ...JSON.parse(await readFile(file, 'utf8')), leg: 'scripted' }));
    await writeFile(path.join(run.runDir, 'scripted.jsonl'), `${lines.join('\n')}\n`);
  };

  it('is judged on the end state and the done screen, with no transcript or session state to time', async () => {
    const run = await makeRun();
    await asScripted(run, ['{"screen":"watch","action":"seen"}', '{"screen":"done","action":"seen"}']);
    await rm(path.join(run.runDir, 'transcript.jsonl'), { force: true });
    expect((await grade({ runDir: run.runDir, deps: run.deps })).outcome).toEqual({ result: 'pass' });
  });

  it('still fails a published-snapshot run whose launcher or platform package is unread', async () => {
    const run = await makeRun({ noNpx: true });
    await asScripted(run, ['{"screen":"done","action":"seen"}']);
    const outcome = (await grade({ runDir: run.runDir, deps: run.deps })).outcome;
    expect(outcome).toMatchObject({ result: 'fail', detail: expect.stringContaining('launcher unread') });
  });

  it('fails when the leg never reached the done screen', async () => {
    const run = await makeRun();
    await asScripted(run, ['{"screen":"watch","action":"seen"}']);
    const outcome = (await grade({ runDir: run.runDir, deps: run.deps })).outcome;
    expect(outcome).toMatchObject({ result: 'fail', detail: expect.stringContaining('never reached the done screen') });
  });
});

describe('the live origin', () => {
  it('is the gate subdomain, never the bare domain, where any record is a standing stop', () => {
    expect(new URL(LIVE_ORIGIN).hostname).toBe('gate.carin-test.org');
  });
});

describe('the record on a known fixture', () => {
  it('names the missed relay, the prompt, the over-10 flag, the overhead, each phase, and the HTTPS wait', async () => {
    const run = await makeRun();
    const record = await grade({ runDir: run.runDir, deps: run.deps });
    expect(record.outcome).toEqual({ result: 'pass' });
    expect(record.missedRelays).toEqual([{ sentence: SENTENCE_MISSED, waiting: 'approve-install-repo', line: expect.any(Number) }]);
    expect(record.permissionPrompts).toEqual([{ command: 'npm view cairn-thing version' }]);
    expect(record.minutesToSignedIn.minutes).toBe(12);
    expect(record.minutesToSignedIn.overTen).toBe(true);
    expect(record.minutesToSignedIn.slowest[0]).toEqual({ step: 'first-deploy', minutes: 4 });
    expect(record.overhead).toMatchObject({ minutes: 6, over: true });
    expect(record.firstDeploy).toEqual({ install: 1.5, build: 1.5, deploy: 1 });
    expect(record.httpsWaitMinutes).toBe(2);
    expect(record.timing).toMatchObject({ ok: true, source: 'setup events' });
    // 12 minutes: provider wait 4 + 2, owner 1 + 0.5, setup tool 0.5, so the agent held 4.
    expect(record.split).toEqual({ agentMinutes: 4, providerWaitMinutes: 6, ownerMinutes: 1.5, toolMinutes: 0.5 });
    expect(record.stepReached).toBe('live');
    expect(record.installed).toEqual({ engine: '0.99.0-rc.4', tool: '2.0.0-rc.4', launcher: '2.0.0-rc.4' });
    expect(record.commit).toBe('abc1234def');
    expect(record.cost.dollars).toBe(3.25);
    expect(record.cost.byStep.find((row: { step: string }) => row.step === 'agent')).toMatchObject({ turns: 1, dollars: 0.5 });
    for (const check of Object.values(record.endState) as { ok: boolean; evidence: string }[]) {
      expect(check.ok).toBe(true);
      expect(check.evidence.length).toBeGreaterThan(0);
    }
  });

  it('marks a local build in the record and the report, and a registry run as not local', async () => {
    const local = await makeRun({ local: true });
    const record = await grade({ runDir: local.runDir, deps: local.deps });
    expect(record.local).toBe(true);
    // No npx-installed launcher to compare, so a local build is judged on the engine pin alone.
    expect(record.endState.versionsMatchCandidate.ok).toBe(true);
    const registry = await makeRun();
    expect((await grade({ runDir: registry.runDir, deps: registry.deps })).local).toBe(false);
    expect(await readFile(path.join(local.runDir, 'run-record.md'), 'utf8')).toContain('(naive, local build)');
  });

  it('writes both files, never a sign-in link, runs the scan over both, and deletes the keyrings', async () => {
    const run = await makeRun();
    await grade({ runDir: run.runDir, deps: run.deps });
    const md = await readFile(path.join(run.runDir, 'run-record.md'), 'utf8');
    const json = await readFile(path.join(run.runDir, 'run-record.json'), 'utf8');
    expect(md).toContain(SENTENCE_MISSED);
    expect(md).toContain('npm view cairn-thing version');
    expect(md).toContain('OVER 10');
    expect(md).toContain('OVER 5');
    expect(md + json).not.toContain('SECRET');
    expect(run.cleanroomCalls).toContainEqual(['scan', '2611091200', path.join(run.runDir, 'run-record.json'), path.join(run.runDir, 'run-record.md')]);
    expect(run.cleanroomCalls).toContainEqual(['shell', '2611091200', '-c', 'npx --yes create-cairn-site status']);
    await expect(stat(path.join(run.home, '.local', 'share', 'keyrings'))).rejects.toThrow();
  });
});

describe('timing gaps', () => {
  it('fails the timing check naming a missing deploy phase', async () => {
    const run = await makeRun({ jobs: [{ name: 'Run npm install', started: 0, ended: 1 }, { name: 'Run npm run build', started: 1, ended: 2 }] });
    const record = await grade({ runDir: run.runDir, deps: run.deps });
    expect(record.timing.ok).toBe(false);
    expect(record.timing.evidence).toContain("first deploy's deploy phase is missing");
    expect(record.outcome).toMatchObject({ result: 'fail', reason: 'other' });
  });

  it('fails the timing check when there is no timing source, naming the gap', async () => {
    const run = await makeRun({ withEvents: false, withStandIn: false, withElapsed: false });
    const record = await grade({ runDir: run.runDir, deps: run.deps });
    expect(record.timing.source).toBe('none');
    expect(record.timing.ok).toBe(false);
    expect(record.timing.evidence).toContain('no timing source');
  });

  it('falls back to the stand-in lines, then marks the HTTPS wait missing', async () => {
    const run = await makeRun({ withEvents: false });
    const record = await grade({ runDir: run.runDir, deps: run.deps });
    expect(record.timing.source).toBe('stand-in.jsonl');
    expect(record.timing.evidence).toContain('HTTPS wait is missing');
  });
});

describe('the end-state checks and the outcome', () => {
  it('fails the mail check on a mailbox error', async () => {
    const run = await makeRun({ mail: 'throws' });
    const record = await grade({ runDir: run.runDir, deps: run.deps });
    expect(record.endState.signInMail.ok).toBe(false);
    expect(record.endState.signInMail.evidence).toContain('mailbox error');
    expect(record.outcome.result).toBe('fail');
  });

  it('fails a registry run whose launcher and platform package are unread, and passes a local build with none', async () => {
    const registry = await makeRun({ noNpx: true });
    const failed = await grade({ runDir: registry.runDir, deps: registry.deps });
    expect(failed.endState.versionsMatchCandidate.ok).toBe(false);
    expect(failed.outcome.detail).toContain('launcher unread is not 2.0.0-rc.4');
    expect(failed.outcome.detail).toContain('platform unread is not 2.0.0-rc.4');

    const local = await makeRun({ noNpx: true, local: true });
    expect((await grade({ runDir: local.runDir, deps: local.deps })).endState.versionsMatchCandidate.ok).toBe(true);
  });

  it('fails an installed version unlike the candidate as other: wrong candidate', async () => {
    const run = await makeRun({ launcher: '2.0.0-rc.3' });
    const record = await grade({ runDir: run.runDir, deps: run.deps });
    expect(record.outcome.reason).toBe('other');
    expect(record.outcome.detail).toContain('wrong candidate');
    expect(record.outcome.detail).toContain('launcher 2.0.0-rc.3 is not 2.0.0-rc.4');
  });

  it('records a read that failed as a failed check, not an empty one', async () => {
    const run = await makeRun();
    run.deps.githubFetch = (async () => ({ status: 500, json: async () => ({}) })) as unknown as typeof fetch; // only status and json() are read
    const record = await grade({ runDir: run.runDir, deps: run.deps });
    expect(record.reads.filter((read: { ok: boolean }) => !read.ok).map((read: { name: string }) => read.name)).toEqual(['repository package.json', 'first deploy jobs']);
    expect(record.outcome.result).toBe('fail');
  });

  it('reads the watcher state and the conductor flags into the outcome', async () => {
    const run = await makeRun();
    await writeFile(path.join(run.runDir, 'state.json'), JSON.stringify({ state: 'stopped:cost', elapsedMinutes: 30 }));
    expect((await grade({ runDir: run.runDir, deps: run.deps })).outcome.reason).toBe('cost');
    await writeFile(path.join(run.runDir, 'state.json'), JSON.stringify({ state: 'stopped:time', elapsedMinutes: 61 }));
    expect((await grade({ runDir: run.runDir, deps: run.deps })).outcome.reason).toBe('time');
    await writeFile(path.join(run.runDir, 'state.json'), JSON.stringify({ state: 'exited', elapsedMinutes: 10 }));
    expect((await grade({ runDir: run.runDir, deps: run.deps, end: 'stall' })).outcome.reason).toBe('stall');
  });

  it('fails a record whose scan matched, rewrites both files without the content, and keeps no proving copy', async () => {
    const run = await makeRun({ scanCode: 1 });
    const record = await grade({ runDir: run.runDir, deps: run.deps });
    expect(record.outcome).toMatchObject({ result: 'fail', reason: 'other' });
    expect(record.outcome.detail).toContain('value scan');
    const md = await readFile(path.join(run.runDir, 'run-record.md'), 'utf8');
    expect(md).not.toContain(SENTENCE_MISSED);
    const json = await readFile(path.join(run.runDir, 'run-record.json'), 'utf8');
    expect(json + md).not.toContain(path.join(run.runDir, 'run-record.json'));
    expect(await readdir(run.provingDir).catch(() => [])).toEqual([]);
    await expect(stat(path.join(run.home, '.local', 'share', 'keyrings'))).rejects.toThrow();
  });

  it('deletes the keyrings even when the scan throws', async () => {
    const run = await makeRun();
    const deps = {
      ...run.deps,
      cleanroom: async (args: string[]) => {
        if (args[0] === 'scan') throw new Error('scan crashed');
        return run.deps.cleanroom(args);
      },
    };
    await expect(grade({ runDir: run.runDir, deps })).rejects.toThrow('scan crashed');
    await expect(stat(path.join(run.home, '.local', 'share', 'keyrings'))).rejects.toThrow();
  });

  it('keeps the record and says so when the clean room user owns the keyrings', async () => {
    const run = await makeRun();
    const keyrings = path.join(run.home, '.local', 'share', 'keyrings');
    await chmod(keyrings, 0o500);
    const said = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const written = await grade({ runDir: run.runDir, deps: run.deps });
      expect(written.id).toBeDefined();
      expect(said).toHaveBeenCalledWith(expect.stringContaining('left'));
      await expect(stat(path.join(run.runDir, 'run-record.json'))).resolves.toBeDefined();
    } finally {
      said.mockRestore();
      await chmod(keyrings, 0o700);
    }
  });
});

describe('against the last record', () => {
  it('copies the record to the proving directory and diffs each step against the earlier one', async () => {
    const first = await makeRun({ id: '2611091200' });
    await grade({ runDir: first.runDir, deps: first.deps });
    expect(await readdir(first.provingDir)).toEqual(['2611091200.json']);
    const second = await makeRun({ id: '2611091300' });
    second.deps.provingDir = first.provingDir;
    const record = await grade({ runDir: second.runDir, deps: second.deps });
    expect(await readdir(first.provingDir)).toEqual(['2611091200.json', '2611091300.json']);
    expect(record.changes.find((row: { step: string }) => row.step === 'first-deploy')).toEqual({ step: 'first-deploy', minutes: 4, previous: 4, change: 0 });
    expect(record.changes.length).toBeGreaterThan(0);
  });

  it('shows a change when a step took longer', async () => {
    const first = await makeRun({ id: '2611091200' });
    await grade({ runDir: first.runDir, deps: first.deps });
    const second = await makeRun({ id: '2611091300' });
    second.deps.provingDir = first.provingDir;
    const text = await readFile(path.join(second.runDir, 'transcript.jsonl'), 'utf8');
    await writeFile(path.join(second.runDir, 'transcript.jsonl'), text.replaceAll(at(GOAL + 8), at(GOAL + 9)));
    const record = await grade({ runDir: second.runDir, deps: second.deps });
    expect(record.changes.find((row: { step: string }) => row.step === 'first-deploy')).toMatchObject({ minutes: 5, previous: 4, change: 1 });
  });
});

describe('the transcript readers', () => {
  it('finds events in tool results and a relay in a later assistant text only', () => {
    const lines = parseTranscript(
      [
        JSON.stringify(resultLine(0, [event('waiting', 0, { waiting: 'approve-cloudflare', sentence: 'On the Cloudflare page, select API Tokens: Write, and then select Allow.' })])),
        JSON.stringify(assistantText(1, 'On the Cloudflare page, select API Tokens: Write, and then select Allow. I will wait.', 'x')),
      ].join('\n'),
    );
    expect(setupEvents(lines)).toHaveLength(1);
    expect(missedRelays(lines, setupEvents(lines))).toEqual([]);
    expect(missedRelays(lines.slice(0, 1), setupEvents(lines))).toHaveLength(1);
  });

  it('reads a command from a redrawn prompt once', () => {
    const log = 'Bash command\n  ls /tmp\n Do you want to proceed?\nBash command\n  ls /tmp\n Do you want to proceed?\nBash command\n  cairn new\n Do you want to proceed?\n';
    expect(permissionPrompts(log)).toEqual([{ command: 'ls /tmp' }, { command: 'cairn new' }]);
  });
});
