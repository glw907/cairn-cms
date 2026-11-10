// run-gate.sh's start forms against a fake `cleanroom`, a fake `tmux`, and a stub `gate.mjs`:
// what `naive`, `scripted`, `probe`, `grade`, and `shell` run, and every reason `naive` and
// `sweep --apply` refuse. The real clean room is never run, and no secret store is read: the rig's
// HOME holds a secrets file of stub values.
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CF = 'cfut_StubCleanroomTokenNeverPrinted';
const GH = 'ghp_StubMachineTokenNeverPrinted';
const MAIL = 'stub-mail-password-never-printed';
const TEMPLATE = '{"template":true}\n';
const SHA = createHash('sha256').update(TEMPLATE).digest('hex');
const GOAL = 'Set up a new cairn site and sign in as owner. cairn is at https://github.com/glw907/cairn-cms.';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const sh = (body: string) => `#!/usr/bin/env bash\n${body}\n`;

function rig(options: { ledger?: object[]; probes?: object[]; sweepCount?: number } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'gate-run-'));
  dirs.push(base);
  const home = join(base, 'home');
  const bin = join(base, 'bin');
  const gate = join(base, 'gate');
  const root = join(base, 'cr');
  for (const dir of [home, bin, gate, root, join(home, '.local', 'share', 'cleanroom')]) mkdirSync(dir, { recursive: true });
  const exe = (name: string, body: string) => writeFileSync(join(bin, name), sh(body), { mode: 0o755 });
  const log = (name: string) => join(base, `${name}.log`);

  exe('cleanroom', `echo "$@" >> "${log('cleanroom')}"\ncase "$1" in\n  init) mkdir -p "${root}/$2/run" "${root}/$2/home" ;;\n  cost) echo '$1.00' ;;\nesac`);
  // `tmux list-sessions` reads the sessions the test planted, per socket; every other call is logged whole.
  exe(
    'tmux',
    [
      `echo "$@" >> "${log('tmux')}"`,
      'if [ "$1" = -S ]; then sock=scripted; shift 2; else sock=default; fi',
      `if [ "$1" = list-sessions ]; then cat "${base}/sessions-$sock" 2>/dev/null || exit 1; fi`,
    ].join('\n'),
  );
  exe('id', 'exit 1');
  exe('npm', 'case "$2" in\n  @glw907/cairn-cms@gate) echo 0.99.0-rc.4 ;;\n  create-cairn-site@gate) echo 2.0.0-rc.4 ;;\n  *) exit 1 ;;\nesac');
  copyFileSync(resolve('scripts/gate/run-gate.sh'), join(gate, 'run-gate.sh'));
  writeFileSync(
    join(gate, 'gate.mjs'),
    `import { appendFileSync } from 'node:fs';\nappendFileSync(${JSON.stringify(log('gate'))}, process.argv.slice(2).join(' ') + '\\n');\nconsole.log('sweep: ' + (process.env.GATE_STUB_COUNT ?? '0') + ' target(s) to delete, 0 old gate name(s), 0 record(s) on the address');\n`,
  );
  writeFileSync(
    join(gate, 'grade.mjs'),
    `import { appendFileSync } from 'node:fs';\nappendFileSync(${JSON.stringify(log('grade'))}, process.argv.slice(2).join(' ') + ' | ' + Object.keys(process.env).sort().join(',') + '\\n');\n`,
  );
  writeFileSync(join(home, '.local', 'secrets'), `CF_WS_CAIRN_CLEANROOM_TOKEN=${CF}\nGITHUB_TEST_TOKEN=${GH}\nSTALWART_PASSWORD_CAIRN_GATE=${MAIL}\nUNRELATED_SECRET=leaks-if-inherited\n`);
  writeFileSync(join(home, '.local', 'share', 'cleanroom', 'settings.json'), TEMPLATE);
  const write = (name: string, rows: object[]) => writeFileSync(join(root, name), rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
  write('ledger.jsonl', options.ledger ?? []);
  write('probes.jsonl', options.probes ?? [{ sha256: SHA, verdict: 'pass', path: 'x' }]);
  writeFileSync(join(base, 'transcript.jsonl'), '{}\n');

  const env = (extra: Record<string, string> = {}) => ({
    PATH: `${bin}:${process.env.PATH}`,
    HOME: home,
    CLEANROOM_ROOT: root,
    GATE_STUB_COUNT: String(options.sweepCount ?? 0),
    ...extra,
  });
  const run = (args: string[], extra: Record<string, string> = {}) =>
    spawnSync('bash', [join(gate, 'run-gate.sh'), ...args], { env: env(extra), encoding: 'utf8', timeout: 60_000 });
  const read = (name: string) => (existsSync(log(name)) ? readFileSync(log(name), 'utf8') : '');
  const sessions = (names: string[], sock = 'default') => writeFileSync(join(base, `sessions-${sock}`), `${names.join('\n')}\n`);
  return { base, home, bin, gate, root, run, read, sessions, exe, env, transcript: join(base, 'transcript.jsonl') };
}

const naive = (r: ReturnType<typeof rig>, extra: Record<string, string> = {}) => r.run(['naive', '--conductor-transcript', r.transcript], extra);
const row = (name: string, over: Record<string, unknown> = {}) => ({ name, state: 'exited', cost: 1, ...over });
const naiveRows = (count: number, cost = 1) => Array.from({ length: count }, (_, i) => row(`2611${String(i).padStart(2, "0")}0000`, { cost }));

describe('naive', () => {
  it('prints the run id, session, and run directory, then starts the stand-in and the run', () => {
    const r = rig();
    const result = naive(r);
    expect(result.status).toBe(0);
    const id = /^run id: (\d{10})$/m.exec(result.stdout)?.[1] as string;
    expect(id).toMatch(/^\d{10}$/);
    expect(result.stdout).toContain(`session: cleanroom-${id}`);
    expect(result.stdout).toContain(`run dir: ${r.root}/${id}/run`);
    const cleanroom = r.read('cleanroom').split('\n');
    expect(cleanroom).toContain(`init ${id}`);
    expect(cleanroom).toContain(
      `run ${id} --goal ${GOAL} --secret CF_WS_CAIRN_CLEANROOM_TOKEN:CAIRN_CF_SETUP_TOKEN --secret CLAUDE_CLEANROOM_OAUTH_TOKEN:CLAUDE_CODE_OAUTH_TOKEN --env npm_config_tag=gate --cap-usd 20.00 --cap-min 60`,
    );
    const tmux = r.read('tmux');
    expect(tmux).toContain(`new-session -d -s cleanroom-${id}-stand-in`);
    expect(tmux).toContain('stand-in.mjs');
  });

  it('records the leg, the commit, and the candidate versions beside the run', () => {
    const r = rig();
    const id = /run id: (\d{10})/.exec(naive(r).stdout)?.[1] as string;
    const harness = JSON.parse(readFileSync(join(r.root, id, 'run', 'harness.json'), 'utf8'));
    expect(harness).toMatchObject({ leg: 'naive', id, siteName: `Cairn gate ${id}`, candidate: { engine: '0.99.0-rc.4', tool: '2.0.0-rc.4' } });
    expect(Date.parse(harness.begin)).not.toBeNaN();
  });

  it('hands the stand-in its names in a 0600 file, never in argv, and keeps the Cloudflare token out', () => {
    const r = rig();
    const id = /run id: (\d{10})/.exec(naive(r, { GATE_OWNER_EMAIL: 'owner@example.test', DISPLAY: ':7' }).stdout)?.[1] as string;
    const everything = r.read('tmux') + r.read('cleanroom') + r.read('gate');
    for (const value of [CF, GH, MAIL, 'leaks-if-inherited']) expect(everything).not.toContain(value);
    const dir = join(r.home, '.local', 'state', 'cairn-gate', 'cairn-gate');
    const file = join(dir, `${id}-stand-in.env`);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    const text = readFileSync(file, 'utf8');
    expect(text).toContain('export GITHUB_TEST_TOKEN=');
    expect(text).toContain('export STALWART_PASSWORD_CAIRN_GATE=');
    expect(text).toContain(`export GATE_SITE_NAME=Cairn\\ gate\\ ${id}`);
    expect(text).toContain('export GATE_OWNER_EMAIL=owner@example.test');
    expect(text).toContain('export DISPLAY=:7');
    expect(text).not.toContain('CF_WS_CAIRN_CLEANROOM_TOKEN');
    expect(text).not.toContain('UNRELATED_SECRET');
  });

  it('starts without the conductor transcript, which no longer counts against the budget', () => {
    const r = rig();
    expect(r.run(['naive']).status).toBe(0);
    expect(r.read('cleanroom')).not.toContain('cost');
  });

  /** A refusal exits 1 naming what it found, and nothing starts. */
  function refused(r: ReturnType<typeof rig>, extra: Record<string, string> = {}) {
    const result = naive(r, extra);
    expect(result.status).toBe(1);
    expect(r.read('cleanroom')).not.toMatch(/^(init|run) /m);
    expect(r.read('tmux')).not.toContain('new-session');
    return result.stderr;
  }

  it('refuses a live cleanroom tmux session on the default socket, naming it', () => {
    const r = rig();
    r.sessions(['work', 'cleanroom-2611010000']);
    expect(refused(r)).toContain('the tmux session cleanroom-2611010000 is live');
  });

  it('refuses a live cleanroom tmux session on the scripted socket, naming it', () => {
    const r = rig();
    r.sessions(['cleanroom-2611010000-scripted'], 'scripted');
    expect(refused(r)).toContain('cleanroom-2611010000-scripted is live on the scripted socket');
  });

  it('refuses a ledger row that reads running', () => {
    const r = rig({ ledger: [row('2611010000', { state: 'running' })] });
    expect(refused(r)).toContain('the ledger row 2611010000 reads running');
  });

  it('refuses while a process owned by the cleanroom user is alive', () => {
    const r = rig();
    r.exe('id', 'if [ "$1" = -u ] && [ "$2" = cleanroom ]; then echo 999; else exit 1; fi');
    r.exe('pgrep', 'echo 4242');
    expect(refused(r)).toContain('1 process(es) owned by cleanroom are alive (first pid 4242)');
  });

  it('refuses an eleventh naive run, counting a scripted row for nothing', () => {
    const rows = [...naiveRows(10), row('2611990000', { leg: 'scripted' })];
    expect(refused(rig({ ledger: rows }))).toContain('holds 10 naive runs; an eleventh is refused');
    expect(naive(rig({ ledger: [...naiveRows(9), row('2611990000', { leg: 'scripted' })] })).status).toBe(0);
  });

  it('refuses when the remaining budget is under $5, naming the budget stop', () => {
    const stderr = refused(rig({ ledger: [row('2611010000', { cost: 96 })] }));
    expect(stderr).toContain('the budget stop');
    expect(stderr).toContain('under the $5 floor');
  });

  it('sets the cost cap to the remaining budget below $20, counting every ledger row and nothing else', () => {
    const r = rig({ ledger: [row('probe', { cost: 30 }), row('2611010000', { cost: 55 })] });
    expect(naive(r).status).toBe(0);
    // $85 in the ledger leaves $15; the executor's own session is not priced (Geoff, 2026-11-10).
    expect(r.read('cleanroom')).toContain('--cap-usd 15.00 --cap-min 60');
  });

  it('caps at $20 while the remaining budget is larger', () => {
    const r = rig({ ledger: [row('2611010000', { cost: 10 })] });
    expect(naive(r).status).toBe(0);
    expect(r.read('cleanroom')).toContain('--cap-usd 20.00 --cap-min 60');
  });

  it('refuses when the stowed template differs from the last passing probe row, or no probe passed', () => {
    const different = refused(rig({ probes: [{ sha256: 'f'.repeat(64), verdict: 'pass', path: 'x' }] }));
    expect(different).toContain('differs from the last passing probe');
    expect(refused(rig({ probes: [{ sha256: SHA, verdict: 'fail', path: 'x' }] }))).toContain('no passing probe row');
    expect(naive(rig({ probes: [{ sha256: 'old', verdict: 'pass' }, { sha256: SHA, verdict: 'pass' }, { sha256: 'bad', verdict: 'fail' }] })).status).toBe(0);
  });

  it('refuses while the sweep dry run lists any target, and deletes nothing', () => {
    const r = rig({ sweepCount: 2 });
    expect(refused(r)).toContain('lists leftovers');
    expect(r.read('gate').trim().split('\n')).toEqual(['sweep']);
  });

  it('refuses a run id whose directory exists', () => {
    const r = rig();
    const minute = (offset: number) => {
      const t = new Date(Date.now() + offset * 60_000).toISOString();
      return `${t.slice(2, 4)}${t.slice(5, 7)}${t.slice(8, 10)}${t.slice(11, 13)}${t.slice(14, 16)}`;
    };
    for (const id of [minute(0), minute(1)]) mkdirSync(join(r.root, id));
    expect(refused(r)).toContain('already has a directory');
  });
});

describe('scripted and probe', () => {
  it('starts only the scripted driver, which owns the stand-in, and refuses on a live session', () => {
    const r = rig();
    const result = r.run(['scripted']);
    expect(result.status).toBe(0);
    const id = /run id: (\d{10})/.exec(result.stdout)?.[1] as string;
    expect(r.read('cleanroom')).toContain(`init ${id}`);
    const tmux = r.read('tmux');
    expect(tmux).not.toContain(`cleanroom-${id}-stand-in`);
    expect(tmux).toMatch(new RegExp(`new-session -d -s cleanroom-${id} .*scripted\\.mjs ${r.root}/${id}/run --shots \\S+/runs/\\S+-scripted/shots`));
    const live = rig();
    live.sessions(['cleanroom-x']);
    expect(live.run(['scripted']).status).toBe(1);
    expect(live.read('cleanroom')).toBe('');
  });

  it('runs the probe from a fresh probe home with the three secrets by name, and refuses on a ledger row running', () => {
    const r = rig();
    const result = r.run(['probe'], { CLEANROOM_PROBE_COMMANDS: '/x/commands.md' });
    expect(result.status).toBe(0);
    const lines = r.read('cleanroom').split('\n');
    expect(lines).toContain('init probe --fresh --discard');
    expect(lines).toContain(
      'probe probe --commands /x/commands.md --secret CLAUDE_CLEANROOM_OAUTH_TOKEN:CLAUDE_CODE_OAUTH_TOKEN --secret CF_WS_CAIRN_CLEANROOM_TOKEN:CAIRN_CF_SETUP_TOKEN --secret GITHUB_TEST_TOKEN:GH_TOKEN --env npm_config_tag=gate',
    );
    expect(result.stdout).toContain('session: cleanroom-probe');
    const busy = rig({ ledger: [row('probe', { state: 'running' })] });
    expect(busy.run(['probe']).status).toBe(1);
    expect(busy.read('cleanroom')).toBe('');
  });
});

describe('sweep --apply', () => {
  it('refuses while a cleanroom session is live, before the gate starts', () => {
    const r = rig();
    r.sessions(['cleanroom-2611010000']);
    const result = r.run(['sweep', '--apply']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('cleanroom-2611010000');
    expect(r.read('gate')).toBe('');
  });

  it('runs the dry run and the scope check without the refusal', () => {
    const r = rig();
    r.sessions(['cleanroom-2611010000']);
    expect(r.run(['sweep']).status).toBe(0);
    expect(r.run(['sweep', '--check-scopes']).status).toBe(0);
    expect(r.read('gate').trim().split('\n')).toEqual(['sweep', 'sweep --check-scopes']);
  });

  it('applies when nothing is live, and writes the exit file', () => {
    const r = rig();
    const result = r.run(['sweep', '--apply']);
    expect(result.status).toBe(0);
    expect(r.read('gate').trim()).toBe('sweep --apply');
    const dir = /^run dir: (.+)$/m.exec(result.stdout)?.[1] as string;
    expect(readFileSync(join(dir, 'exit'), 'utf8').trim()).toBe('0');
  });
});

describe('grade and shell', () => {
  it('runs grade.mjs on the run directory with the allowlisted names and no other', () => {
    const r = rig();
    const result = r.run(['grade', '/x/run', '--end', 'stall'], { UNRELATED: 'x' });
    expect(result.status).toBe(0);
    const [args, names] = r.read('grade').trim().split(' | ');
    expect(args).toBe('/x/run --end stall');
    expect(names).toContain('GITHUB_TEST_TOKEN');
    expect(names).toContain('STALWART_PASSWORD_CAIRN_GATE');
    expect(names).not.toContain('UNRELATED');
    expect(existsSync(join(r.home, '.local', 'state', 'cairn-gate', 'lock'))).toBe(false);
  });

  it('hands shell to cleanroom shell with its arguments', () => {
    const r = rig();
    expect(r.run(['shell', '2611010000', '-c', 'id -un']).status).toBe(0);
    expect(r.read('cleanroom').trim()).toBe('shell 2611010000 -c id -un');
  });
});
