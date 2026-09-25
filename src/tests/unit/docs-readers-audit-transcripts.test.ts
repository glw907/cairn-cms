import { describe, it, expect } from 'vitest';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditToolCall, auditTranscript, main } from '../../../scripts/docs-readers/audit-transcripts.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FIXTURES = join(ROOT, 'scripts/docs-readers/fixtures/audit-transcripts');
const HOME = '/home/fixture';
const GRANTED = ['/tmp/granted'];

describe('auditToolCall', () => {
  it('flags a Read outside every granted directory', () => {
    const { hits } = auditToolCall('Read', { file_path: '/var/home/glw907/Projects/cairn-cms/docs/internal/record/x.md' }, GRANTED, undefined, HOME);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ source: 'tool', tool: 'Read' });
  });

  it('passes a Read confined to the granted directory', () => {
    expect(auditToolCall('Read', { file_path: '/tmp/granted/spec.md' }, GRANTED, undefined, HOME).hits).toEqual([]);
  });

  it('is silent on a tool with no path-bearing field', () => {
    expect(auditToolCall('SubagentHandback', { message: 'done' }, GRANTED, undefined, HOME).hits).toEqual([]);
  });

  it('flags a Bash command mentioning a forbidden path even without a leading slash', () => {
    const { hits } = auditToolCall('Bash', { command: 'cat docs/internal/record/note.md' }, GRANTED, undefined, HOME);
    expect(hits.some((h) => h.reason.includes('docs/internal/record'))).toBe(true);
  });

  it('passes a Bash command confined to the granted directory', () => {
    expect(auditToolCall('Bash', { command: 'cd /tmp/granted/out && ls -la' }, GRANTED, undefined, HOME).hits).toEqual([]);
  });

  it('never flags a bare /dev/null redirect, quote-stripped or glued to a trailing semicolon', () => {
    expect(auditToolCall('Bash', { command: 'grep -c "x" *.md 2>/dev/null' }, GRANTED, undefined, HOME).hits).toEqual([]);
    expect(auditToolCall('Bash', { command: 'foo() { : ; } > /dev/null;' }, GRANTED, undefined, HOME).hits).toEqual([]);
  });

  it('never flags a URL token, whose slashes are not a filesystem path', () => {
    expect(auditToolCall('Bash', { command: 'curl -s https://example.com/x' }, GRANTED, undefined, HOME).hits).toEqual([]);
  });

  describe('resolving a relative reference against the effective cwd', () => {
    it('a Grep call with no path checks the effective cwd itself', () => {
      expect(auditToolCall('Grep', { pattern: 'P01' }, GRANTED, '/tmp/granted/out', HOME).hits).toEqual([]);
      const { hits } = auditToolCall('Grep', { pattern: 'P01' }, GRANTED, '/var/home/glw907/Projects/cairn-cms', HOME);
      expect(hits).toHaveLength(1);
      expect(hits[0]).toMatchObject({ tool: 'Grep' });
    });

    it('an absolute Glob pattern is checked by its own directory prefix', () => {
      const { hits } = auditToolCall('Glob', { pattern: '/var/home/glw907/Projects/cairn-cms/docs/internal/record/*.md' }, GRANTED, '/tmp/granted', HOME);
      expect(hits).toHaveLength(1);
      expect(hits[0]).toMatchObject({ tool: 'Glob' });
    });

    it('an absolute Grep glob is checked the same way', () => {
      const { hits } = auditToolCall('Grep', { pattern: 'x', glob: '/var/home/glw907/Projects/cairn-cms/docs/*.md' }, GRANTED, '/tmp/granted', HOME);
      expect(hits.some((h) => h.tool === 'Grep')).toBe(true);
    });

    it('a plain Glob pattern with no real directory component (only a wildcard) is not checked as a path', () => {
      expect(auditToolCall('Glob', { path: '/tmp/granted', pattern: '**/*.ts' }, GRANTED, '/tmp/granted', HOME).hits).toEqual([]);
    });

    it('a relative Bash token resolves against the effective cwd, flagging when that cwd is out of bounds', () => {
      const { hits } = auditToolCall('Bash', { command: 'cat scripts/docs-readers/prompts/catch-judge.md' }, GRANTED, '/var/home/glw907/Projects/cairn-cms', HOME);
      expect(hits.some((h) => h.source === 'bash' && h.reason.includes('outside every granted directory'))).toBe(true);
    });

    it('a leading cd sets the effective cwd for the rest of the command', () => {
      expect(auditToolCall('Bash', { command: 'cd /tmp/granted && cat spec.md' }, GRANTED, '/var/home/glw907/Projects/cairn-cms', HOME).hits).toEqual([]);
      const { hits } = auditToolCall('Bash', { command: 'cd /var/home/glw907/Projects/cairn-cms && cat docs/README.md' }, GRANTED, '/tmp/granted', HOME);
      expect(hits.length).toBeGreaterThan(0);
    });

    it('a relative parent-traversal token escapes a granted cwd', () => {
      const { hits } = auditToolCall('Bash', { command: 'cat ../../.claude/projects/x/y.jsonl' }, GRANTED, '/tmp/granted/out', HOME);
      expect(hits.some((h) => h.source === 'bash' && h.reason.includes('outside every granted directory'))).toBe(true);
    });

    it('flags a relative reference when the record carries no cwd at all, rather than guessing', () => {
      const { hits } = auditToolCall('Read', { file_path: 'spec.md' }, GRANTED, undefined, HOME);
      expect(hits[0]).toMatchObject({ reason: expect.stringContaining('carries no cwd') });
    });

    it('a Bash glob token with no directory component is not checked (nothing real to resolve)', () => {
      expect(auditToolCall('Bash', { command: 'ls *.md' }, GRANTED, '/var/home/glw907/Projects/cairn-cms', HOME).hits).toEqual([]);
    });

    it('a Bash glob token’s own directory prefix is checked, out of bounds or in', () => {
      const outOfBounds = auditToolCall('Bash', { command: 'cat scripts/docs-readers/prompts/*.md' }, GRANTED, '/var/home/glw907/Projects/cairn-cms', HOME);
      expect(outOfBounds.hits.some((h) => h.source === 'bash' && h.reason.includes('outside every granted directory'))).toBe(true);
      expect(auditToolCall('Bash', { command: 'cat prompts/*.md' }, GRANTED, '/tmp/granted', HOME).hits).toEqual([]);
    });

    it('every cd in an && chain is tracked in order, not just the first', () => {
      const { hits } = auditToolCall('Bash', { command: 'cd /tmp/granted && cd .. && cat other/secret.md' }, GRANTED, undefined, HOME);
      expect(hits.some((h) => h.source === 'bash' && h.reason.includes('outside every granted directory'))).toBe(true);
    });

    it('a relative token after a glob-carrying token resolved against a traversed cwd is still checked', () => {
      const { hits } = auditToolCall('Bash', { command: 'cd /tmp/granted && cat ../../var/x/*.jsonl' }, GRANTED, undefined, HOME);
      expect(hits.some((h) => h.source === 'bash' && h.reason.includes('outside every granted directory'))).toBe(true);
    });
  });

  describe('unaudited interpreter calls', () => {
    it('lists a python3 -c call apart from any hit, without changing the result', () => {
      const { hits, interpreterCalls } = auditToolCall('Bash', { command: 'python3 -c "print(1)"' }, GRANTED, '/tmp/granted', HOME);
      expect(hits).toEqual([]);
      expect(interpreterCalls).toHaveLength(1);
      expect(interpreterCalls[0].command).toContain('python3 -c');
    });

    it('lists a python3 - call (a script piped over stdin)', () => {
      const { interpreterCalls } = auditToolCall('Bash', { command: 'python3 - <<PY\nprint(1)\nPY' }, GRANTED, '/tmp/granted', HOME);
      expect(interpreterCalls.length).toBeGreaterThan(0);
    });

    it('lists a node -e call', () => {
      const { interpreterCalls } = auditToolCall('Bash', { command: "node -e \"console.log(1)\"" }, GRANTED, '/tmp/granted', HOME);
      expect(interpreterCalls).toHaveLength(1);
    });

    it('lists a heredoc feeding a command its own script text', () => {
      const { interpreterCalls } = auditToolCall('Bash', { command: 'bash <<EOF\necho hi\nEOF' }, GRANTED, '/tmp/granted', HOME);
      expect(interpreterCalls).toHaveLength(1);
    });

    it('lists nothing for an ordinary command', () => {
      expect(auditToolCall('Bash', { command: 'ls -la' }, GRANTED, '/tmp/granted', HOME).interpreterCalls).toEqual([]);
    });
  });
});

describe('auditTranscript', () => {
  it('flags a fixture transcript that reads docs/internal/record', () => {
    const { hits } = auditTranscript(join(FIXTURES, 'reads-forbidden.jsonl'), ['/tmp/granted-fixture']);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('passes a fixture transcript confined to its granted directory', () => {
    expect(auditTranscript(join(FIXTURES, 'confined.jsonl'), ['/tmp/granted-fixture']).hits).toEqual([]);
  });

  describe('one fixture per bypass', () => {
    const cases: Array<[string, string[]]> = [
      ['bypass-grep-no-path.jsonl', ['/tmp/granted-fixture']],
      ['bypass-glob-absolute-pattern.jsonl', ['/tmp/granted-fixture']],
      ['bypass-bash-relative-record-dir.jsonl', ['/tmp/granted-fixture']],
      ['bypass-bash-relative-prompt-file.jsonl', ['/tmp/granted-fixture']],
      ['bypass-bash-relative-parent-dir.jsonl', ['/tmp/granted-fixture']],
      ['bypass-bash-parent-traversal.jsonl', ['/tmp/granted-fixture']],
      ['bypass-bash-glob-token.jsonl', ['/tmp/granted-fixture']],
      ['bypass-bash-relative-after-cd.jsonl', ['/tmp/granted-fixture']],
      ['bypass-bash-second-cd.jsonl', ['/tmp/granted-fixture']],
    ];
    for (const [name, granted] of cases) {
      it(`flags ${name}`, () => {
        expect(auditTranscript(join(FIXTURES, name), granted).hits.length).toBeGreaterThan(0);
      });
    }
  });

  it('lists an interpreter call from a fixture transcript, apart from hits', () => {
    const { hits, interpreterCalls } = auditTranscript(join(FIXTURES, 'interpreter-call.jsonl'), ['/tmp/granted-fixture']);
    expect(hits).toEqual([]);
    expect(interpreterCalls.length).toBeGreaterThan(0);
  });
});

describe('audit-transcripts.ts CLI', () => {
  it('exits 1 on a hit and 0 when confined', () => {
    expect(main(['--transcript', join(FIXTURES, 'reads-forbidden.jsonl'), '--granted', '/tmp/granted-fixture'])).toBe(1);
    expect(main(['--transcript', join(FIXTURES, 'confined.jsonl'), '--granted', '/tmp/granted-fixture'])).toBe(0);
  });

  it('an interpreter call does not change the exit code', () => {
    expect(main(['--transcript', join(FIXTURES, 'interpreter-call.jsonl'), '--granted', '/tmp/granted-fixture'])).toBe(0);
  });

  it('refuses a missing flag', () => {
    expect(main(['--transcript', join(FIXTURES, 'confined.jsonl')])).toBe(2);
  });
});
