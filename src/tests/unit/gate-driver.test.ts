// The gate driver, proven against a stub CLI that prints clack-shaped prompts on a real pty and
// records every byte it receives. The stub is the contract's other half: it consumes a confirm on
// one keystroke the way @clack/core does, so a stray carriage return lands on the next prompt.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDriver, findActivePrompt } from '../../../scripts/gate/driver.mjs';

type Step =
  | { kind: 'confirm' | 'select' | 'text' | 'password'; message: string; options?: string[] }
  | { kind: 'line'; text: string }
  | { kind: 'pause'; ms: number }
  | { kind: 'hang' };

/** A stub CLI: runs a JSON scenario, then writes what each prompt received to STUB_OUT. */
const STUB = String.raw`
const fs = require('node:fs');
const steps = JSON.parse(process.env.STUB_SCENARIO);
const received = [];
let queue = '';
let wake = null;
process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { queue += d; if (wake) { const w = wake; wake = null; w(); } });
const until = (ready) => new Promise((resolve) => { const tick = () => (ready() ? resolve() : (wake = tick)); tick(); });
const out = (s) => process.stdout.write(s);
(async () => {
  for (const step of steps) {
    if (step.kind === 'line') { out(step.text + '\n'); continue; }
    if (step.kind === 'pause') { await new Promise((r) => setTimeout(r, step.ms)); continue; }
    if (step.kind === 'hang') await new Promise(() => {});
    const body = step.kind === 'select'
      ? step.options.map((o, i) => '│  ' + (i === 0 ? '●' : '○') + ' ' + o)
      : [step.kind === 'confirm' ? '│  ● Yes / ○ No' : '│  ' + (step.kind === 'password' ? '' : '_')];
    const lines = ['│', '◆  ' + step.message, ...body, '└'];
    out(lines.join('\n') + '\n');
    let got = '';
    if (step.kind === 'confirm') {
      await until(() => queue.length > 0);
      got = queue[0]; queue = queue.slice(1);
    } else {
      await until(() => queue.includes('\r'));
      const end = queue.indexOf('\r') + 1;
      got = queue.slice(0, end); queue = queue.slice(end);
    }
    received.push({ message: step.message, got });
    out('\x1b[' + lines.length + 'A\x1b[J◇  ' + step.message + '\n│\n');
  }
  await new Promise((r) => setTimeout(r, 250));
  fs.writeFileSync(process.env.STUB_OUT, JSON.stringify({ received, stray: queue }));
  process.exit(0);
})();
`;

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

async function drive(steps: Step[], table: Parameters<typeof runDriver>[0]['table'], extra: Partial<Parameters<typeof runDriver>[0]> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'gate-driver-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'stub.cjs'), STUB);
  const chunks: string[] = [];
  const result = await runDriver({
    command: process.execPath,
    args: [join(dir, 'stub.cjs')],
    env: {
      PATH: process.env.PATH ?? '',
      LANG: 'C.UTF-8',
      TERM: 'xterm-256color',
      STUB_SCENARIO: JSON.stringify(steps),
      STUB_OUT: join(dir, 'out.json'),
    },
    table,
    out: { write: (chunk: string) => chunks.push(chunk) },
    logPath: join(dir, 'driver.log'),
    capturePath: join(dir, 'capture.bin'),
    settleMs: 60,
    ...extra,
  });
  const read = (name: string) => {
    try {
      return readFileSync(join(dir, name), 'utf8');
    } catch {
      return '';
    }
  };
  const stub = read('out.json') ? JSON.parse(read('out.json')) : null;
  return { result, stub, stdout: chunks.join(''), log: read('driver.log'), capture: read('capture.bin') };
}

describe('findActivePrompt', () => {
  it('reads the active prompt and the select options from a rendered frame', () => {
    const frame = ['│', '◆  Pick one', '│  ○ alpha', '│  ● beta', '└'].join('\n');
    expect(findActivePrompt(frame)).toEqual({ row: 1, line: 'Pick one', options: ['alpha', 'beta'], selected: 1 });
  });

  it('finds no prompt once the bar-end line is gone', () => {
    expect(findActivePrompt('◇  Pick one\n│  alpha')).toBeNull();
  });
});

describe('runDriver', () => {
  it('answers every shown prompt in the order shown, skips a table entry never shown, and exits 0', async () => {
    const { result, stub } = await drive(
      [
        { kind: 'text', message: 'Which domain?' },
        { kind: 'confirm', message: 'Connect Builds now?' },
        { kind: 'text', message: 'Site name' },
      ],
      [
        { match: 'Site name', kind: 'text', value: 'Gate' },
        { match: 'Never shown', kind: 'confirm', answer: true },
        { match: 'Connect Builds', kind: 'confirm', answer: true },
        { match: 'Which domain', kind: 'text', value: 'carin-test.org' },
      ],
    );
    expect(result.failure).toBeUndefined();
    expect(result.code).toBe(0);
    expect(stub.received).toEqual([
      { message: 'Which domain?', got: 'carin-test.org\r' },
      { message: 'Connect Builds now?', got: 'y' },
      { message: 'Site name', got: 'Gate\r' },
    ]);
    expect(stub.stray).toBe('');
  });

  it('sends a confirm answer as one keystroke with no carriage return', async () => {
    const { result, stub } = await drive(
      [
        { kind: 'confirm', message: 'Connect a domain?' },
        { kind: 'text', message: 'Site name' },
      ],
      [
        { match: 'Connect a domain', kind: 'confirm', answer: false },
        { match: 'Site name', kind: 'text', value: 'Gate' },
      ],
    );
    expect(result.code).toBe(0);
    expect(stub.received[0]).toEqual({ message: 'Connect a domain?', got: 'n' });
    // A stray CR would have submitted the text prompt empty and left its answer in the stray input.
    expect(stub.received[1]).toEqual({ message: 'Site name', got: 'Gate\r' });
    expect(stub.stray).toBe('');
  });

  it('presses the arrow keys to a named select option, then a carriage return', async () => {
    const { result, stub } = await drive(
      [{ kind: 'select', message: 'Which account?', options: ['alpha', 'beta', 'gamma (default)'] }],
      [{ match: 'Which account', kind: 'select', label: 'gamma' }],
    );
    expect(result.code).toBe(0);
    expect(stub.received[0].got).toBe('\x1b[B\x1b[B\r');
  });

  it('fails naming a marked prompt that has no table entry', async () => {
    const { result } = await drive(
      [{ kind: 'confirm', message: 'Delete everything?' }],
      [{ match: 'Something else', kind: 'confirm', answer: true }],
    );
    expect(result.code).toBe(-1);
    expect(result.failure).toContain('Delete everything?');
  });

  it('never answers an unmarked line that matches a table key', async () => {
    const { result, stub } = await drive(
      [
        { kind: 'line', text: 'Paste your Cloudflare API token' },
        { kind: 'line', text: '│  Paste your Cloudflare API token' },
        { kind: 'confirm', message: 'Connect a domain?' },
        { kind: 'pause', ms: 300 },
      ],
      [
        { match: 'Paste your Cloudflare API token', kind: 'password', value: 'would-be-typed' },
        { match: 'Connect a domain', kind: 'confirm', answer: false },
      ],
    );
    expect(result.code).toBe(0);
    expect(stub.received).toEqual([{ message: 'Connect a domain?', got: 'n' }]);
    expect(stub.stray).toBe('');
  });

  it('keeps the typed token out of stdout, the log, and the capture', async () => {
    const token = 'cfut_NeverAppearsAnywhere0123456789abcdef';
    const { result, stub, stdout, log, capture } = await drive(
      [{ kind: 'password', message: 'Paste your Cloudflare API token' }],
      [{ match: 'Paste your Cloudflare API token', kind: 'password', value: () => token }],
    );
    expect(result.code).toBe(0);
    expect(stub.received[0].got).toBe(`${token}\r`);
    expect(stdout).not.toContain(token);
    expect(log).not.toContain(token);
    expect(capture).not.toContain(token);
    expect(result.screen).not.toContain(token);
    expect(log).toContain('answered "Paste your Cloudflare API token" (password)');
  });

  it('fails an idle run with the last screen, and lets a held progress page wait longer', async () => {
    const idle = await drive([{ kind: 'line', text: 'Working' }, { kind: 'hang' }], [], { idleMs: 400 });
    expect(idle.result.code).toBe(-1);
    expect(idle.result.failure).toContain('no output');
    expect(idle.result.failure).toContain('Working');

    const held = await drive(
      [{ kind: 'line', text: 'Watch progress at http://127.0.0.1:1/ (held)' }, { kind: 'pause', ms: 900 }],
      [],
      { idleMs: 300, holdIdleMs: 5000 },
    );
    expect(held.result.failure).toBeUndefined();
    expect(held.result.code).toBe(0);
  });
});
