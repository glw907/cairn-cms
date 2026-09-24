import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractProcedures } from '../../../scripts/docs-readers/harness/extract.js';
import { commandPath, isReadOnly } from '../../../scripts/docs-readers/harness/classify.js';
import { listOperatorPages } from '../../../scripts/docs-readers/harness/pages.js';
import { runProcedure, runProcedures, type HarnessDeps } from '../../../scripts/docs-readers/harness/run.js';
import { checkTitles, type Condition } from '../../../scripts/docs-readers/harness/titles.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FIXTURES = join(ROOT, 'scripts/docs-readers/fixtures/harness');
const read = (name: string) => readFileSync(join(FIXTURES, name), 'utf8');

/** The docs-and-binary class's own read-only allowlist, `classes/docs-and-binary.json`. */
const ALLOWLIST = ['cairn sites list', 'cairn health*', 'cairn logs*', 'cairn doctor*', 'cairn auth list', 'cairn auth check*'];

describe('extractProcedures', () => {
  it('finds a bare cairn command inside a fenced block', () => {
    const procs = extractProcedures('fixture.md', read('broken-command.md'));
    expect(procs).toEqual([{ page: 'fixture.md', line: 6, command: 'cairn doctor --no-such-flag', expectJson: false }]);
  });

  it('skips a fenced block a `<!-- transcript: -->` comment precedes, including a cairn-shaped line inside it', () => {
    const procs = extractProcedures('fixture.md', read('transcript-and-command.md'));
    expect(procs).toEqual([{ page: 'fixture.md', line: 6, command: 'cairn doctor', expectJson: false }]);
  });

  it('pairs a command with the next fenced block when that block parses as JSON', () => {
    const procs = extractProcedures('fixture.md', read('json-output.md'));
    expect(procs).toEqual([{ page: 'fixture.md', line: 6, command: 'cairn auth check --json', expectJson: true }]);
  });

  it('finds nothing on a page with no cairn command block', () => {
    expect(extractProcedures('fixture.md', '# No commands here\n\nJust prose.\n')).toEqual([]);
  });
});

describe('classify', () => {
  it('matches a read-only command against the docs-and-binary allowlist', () => {
    expect(isReadOnly('cairn doctor', ALLOWLIST)).toBe(true);
    expect(isReadOnly('cairn doctor --no-such-flag', ALLOWLIST)).toBe(true);
    expect(isReadOnly('cairn auth check --json', ALLOWLIST)).toBe(true);
    expect(isReadOnly('cairn sites list', ALLOWLIST)).toBe(true);
  });

  it('does not match a state-changing command against the allowlist', () => {
    expect(isReadOnly('cairn auth set CAIRN_GH_READ_TOKEN', ALLOWLIST)).toBe(false);
    expect(isReadOnly('cairn adopt', ALLOWLIST)).toBe(false);
  });

  it('reads the subcommand path up to the first flag or value', () => {
    expect(commandPath('cairn auth set CAIRN_GH_READ_TOKEN')).toEqual(['auth', 'set']);
    expect(commandPath('cairn doctor --json')).toEqual(['doctor']);
    expect(commandPath('cairn')).toEqual([]);
  });
});

describe('runProcedure', () => {
  const proc = (over: Partial<Parameters<typeof runProcedure>[0]> = {}) => ({
    page: 'docs/admin/fixture.md',
    line: 5,
    command: 'cairn doctor',
    expectJson: false,
    ...over,
  });

  it('runs a read-only command literally and passes on a clean exit', async () => {
    const execCairn = vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'PASS  everything\n' });
    const execHelp = vi.fn();
    const deps: HarnessDeps = { allowlist: ALLOWLIST, execCairn, execHelp };
    const step = await runProcedure(proc(), deps);
    expect(step).toEqual({ page: 'docs/admin/fixture.md', line: 5, command: 'cairn doctor', kind: 'run', outcome: 'pass', detail: 'exit 0' });
    expect(execCairn).toHaveBeenCalledWith(['doctor']);
    expect(execHelp).not.toHaveBeenCalled();
  });

  it('fails a deliberately broken read-only command that writes nothing to stdout', async () => {
    // A real `cairn doctor --bogus` writes its "unknown flag" usage error to stderr and leaves
    // stdout empty; exit code alone (0 to 3, Nagios-style) cannot tell that apart from a real
    // report, so an empty stdout is what actually marks the run broken.
    const execCairn = vi.fn().mockResolvedValue({ exitCode: 3, stdout: '' });
    const deps: HarnessDeps = { allowlist: ALLOWLIST, execCairn, execHelp: vi.fn() };
    const step = await runProcedure(proc({ command: 'cairn doctor --no-such-flag' }), deps);
    expect(step.outcome).toBe('fail');
    expect(step.detail).toMatch(/stdout was empty/);
  });

  it('passes a read-only command that exits non-zero with a real report on stdout (a Nagios-style verdict, not a broken command)', async () => {
    const execCairn = vi.fn().mockResolvedValue({ exitCode: 2, stdout: 'FAIL  Wrangler bindings are missing: ...\n1 failed\n' });
    const deps: HarnessDeps = { allowlist: ALLOWLIST, execCairn, execHelp: vi.fn() };
    const step = await runProcedure(proc(), deps);
    expect(step.outcome).toBe('pass');
    expect(step.detail).toBe('exit 2');
  });

  it('fails a read-only command whose stdout does not parse as JSON when the page expects it to', async () => {
    const execCairn = vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'not json' });
    const deps: HarnessDeps = { allowlist: ALLOWLIST, execCairn, execHelp: vi.fn() };
    const step = await runProcedure(proc({ command: 'cairn auth check --json', expectJson: true }), deps);
    expect(step.outcome).toBe('fail');
    expect(step.detail).toMatch(/did not parse as JSON/);
  });

  it('checks a state-changing command only as a --help dry run, and never runs it', async () => {
    const execCairn = vi.fn();
    const execHelp = vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'Usage: cairn auth set ...\n' });
    const deps: HarnessDeps = { allowlist: ALLOWLIST, execCairn, execHelp };
    const step = await runProcedure(proc({ command: 'cairn auth set CAIRN_GH_READ_TOKEN' }), deps);
    expect(step).toEqual({
      page: 'docs/admin/fixture.md',
      line: 5,
      command: 'cairn auth set CAIRN_GH_READ_TOKEN',
      kind: 'help-checked',
      outcome: 'pass',
      detail: 'cairn auth set --help exited 0',
    });
    expect(execHelp).toHaveBeenCalledWith(['auth', 'set']);
    expect(execCairn).not.toHaveBeenCalled();
  });

  it('fails a state-changing command whose --help itself errors, still never running it', async () => {
    const execCairn = vi.fn();
    const execHelp = vi.fn().mockResolvedValue({ exitCode: 1, stdout: 'unknown command\n' });
    const deps: HarnessDeps = { allowlist: ALLOWLIST, execCairn, execHelp };
    const step = await runProcedure(proc({ command: 'cairn bogus set FOO' }), deps);
    expect(step.outcome).toBe('fail');
    expect(execCairn).not.toHaveBeenCalled();
  });

  it('runs every procedure on a page in order through runProcedures', async () => {
    const execCairn = vi.fn().mockResolvedValue({ exitCode: 0, stdout: '' });
    const deps: HarnessDeps = { allowlist: ALLOWLIST, execCairn, execHelp: vi.fn() };
    const steps = await runProcedures([proc({ line: 5 }), proc({ line: 9, command: 'cairn health' })], deps);
    expect(steps.map((s) => s.line)).toEqual([5, 9]);
  });
});

describe('checkTitles', () => {
  const conditions: Condition[] = [
    { id: 'config.bindings-missing', title: 'Wrangler bindings are missing' },
    { id: 'auth.role-wiring-missing', title: 'Guard is missing the declared role vocabulary' },
  ];

  it('passes a page whose jump-list title matches its condition’s own title', () => {
    const text = '- `Wrangler bindings are missing`-[Deploy](#deploy), `config.bindings-missing`\n';
    expect(checkTitles(text, 'fixture.md', conditions)).toEqual([]);
  });

  it('fails a page whose jump-list title does not match its condition’s own title', () => {
    const text = '- `Wrangler bindings`-[Deploy](#deploy), `config.bindings-missing`\n';
    const findings = checkTitles(text, 'fixture.md', conditions);
    expect(findings).toEqual([
      { page: 'fixture.md', line: 1, pageTitle: 'Wrangler bindings', conditionId: 'config.bindings-missing', registryTitle: 'Wrangler bindings are missing' },
    ]);
  });

  it('fails today’s is-it-working.md on its two drifted-title mentions and its jump-list bullet (lines 67, 74, 102)', () => {
    const text = readFileSync(join(ROOT, 'docs/admin/is-it-working.md'), 'utf8');
    const registry = JSON.parse(readFileSync(join(ROOT, 'tool/internal/spine/conditions.json'), 'utf8')) as Condition[];
    const findings = checkTitles(text, 'docs/admin/is-it-working.md', registry);
    const lines = new Set(findings.map((f) => f.line));
    expect(lines.has(67)).toBe(true);
    expect(lines.has(74)).toBe(true);
    expect(lines.has(102)).toBe(true);
  });
});

describe('listOperatorPages', () => {
  it('names is-it-working.md, the one docs/admin page with a runnable cairn procedure today', () => {
    expect(listOperatorPages(join(ROOT, 'docs/admin'))).toEqual(['docs/admin/is-it-working.md']);
  });

  it('finds only the pages carrying a procedure in a fixture directory', () => {
    expect(listOperatorPages(FIXTURES)).toEqual([
      'docs/admin/broken-command.md',
      'docs/admin/json-output.md',
      'docs/admin/state-changing.md',
      'docs/admin/transcript-and-command.md',
    ]);
  });
});
