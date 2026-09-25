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
    const hits = auditToolCall('Read', { file_path: '/var/home/glw907/Projects/cairn-cms/docs/internal/record/x.md' }, GRANTED, undefined, HOME);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ source: 'tool', tool: 'Read' });
  });

  it('passes a Read confined to the granted directory', () => {
    expect(auditToolCall('Read', { file_path: '/tmp/granted/spec.md' }, GRANTED, undefined, HOME)).toEqual([]);
  });

  it('is silent on a tool with no path-bearing field', () => {
    expect(auditToolCall('SubagentHandback', { message: 'done' }, GRANTED, undefined, HOME)).toEqual([]);
  });

  it('flags a Bash command mentioning a forbidden path even without a leading slash', () => {
    const hits = auditToolCall('Bash', { command: 'cat docs/internal/record/note.md' }, GRANTED, undefined, HOME);
    expect(hits.some((h) => h.reason.includes('docs/internal/record'))).toBe(true);
  });

  it('passes a Bash command confined to the granted directory', () => {
    expect(auditToolCall('Bash', { command: 'cd /tmp/granted/out && ls -la' }, GRANTED, undefined, HOME)).toEqual([]);
  });

  it('never flags a bare /dev/null redirect, quote-stripped or glued to a trailing semicolon', () => {
    expect(auditToolCall('Bash', { command: 'grep -c "x" *.md 2>/dev/null' }, GRANTED, undefined, HOME)).toEqual([]);
    expect(auditToolCall('Bash', { command: 'foo() { : ; } > /dev/null;' }, GRANTED, undefined, HOME)).toEqual([]);
  });

  it('never flags a URL token, whose slashes are not a filesystem path', () => {
    expect(auditToolCall('Bash', { command: 'curl -s https://example.com/x' }, GRANTED, undefined, HOME)).toEqual([]);
  });

  describe('resolving a relative reference against the effective cwd', () => {
    it('a Grep call with no path checks the effective cwd itself', () => {
      expect(auditToolCall('Grep', { pattern: 'P01' }, GRANTED, '/tmp/granted/out', HOME)).toEqual([]);
      const hits = auditToolCall('Grep', { pattern: 'P01' }, GRANTED, '/var/home/glw907/Projects/cairn-cms', HOME);
      expect(hits).toHaveLength(1);
      expect(hits[0]).toMatchObject({ tool: 'Grep' });
    });

    it('an absolute Glob pattern is checked by its own directory prefix', () => {
      const hits = auditToolCall('Glob', { pattern: '/var/home/glw907/Projects/cairn-cms/docs/internal/record/*.md' }, GRANTED, '/tmp/granted', HOME);
      expect(hits).toHaveLength(1);
      expect(hits[0]).toMatchObject({ tool: 'Glob' });
    });

    it('an absolute Grep glob is checked the same way', () => {
      const hits = auditToolCall('Grep', { pattern: 'x', glob: '/var/home/glw907/Projects/cairn-cms/docs/*.md' }, GRANTED, '/tmp/granted', HOME);
      expect(hits.some((h) => h.tool === 'Grep')).toBe(true);
    });

    it('a plain Glob pattern with no real directory component (only a wildcard) is not checked as a path', () => {
      expect(auditToolCall('Glob', { path: '/tmp/granted', pattern: '**/*.ts' }, GRANTED, '/tmp/granted', HOME)).toEqual([]);
    });

    it('a relative Bash token resolves against the effective cwd, flagging when that cwd is out of bounds', () => {
      const hits = auditToolCall('Bash', { command: 'cat scripts/docs-readers/prompts/catch-judge.md' }, GRANTED, '/var/home/glw907/Projects/cairn-cms', HOME);
      expect(hits.some((h) => h.source === 'bash' && h.reason.includes('outside every granted directory'))).toBe(true);
    });

    it('a leading cd sets the effective cwd for the rest of the command', () => {
      expect(auditToolCall('Bash', { command: 'cd /tmp/granted && cat spec.md' }, GRANTED, '/var/home/glw907/Projects/cairn-cms', HOME)).toEqual([]);
      const hits = auditToolCall('Bash', { command: 'cd /var/home/glw907/Projects/cairn-cms && cat docs/README.md' }, GRANTED, '/tmp/granted', HOME);
      expect(hits.length).toBeGreaterThan(0);
    });

    it('a relative parent-traversal token escapes a granted cwd', () => {
      const hits = auditToolCall('Bash', { command: 'cat ../../.claude/projects/x/y.jsonl' }, GRANTED, '/tmp/granted/out', HOME);
      expect(hits.some((h) => h.source === 'bash' && h.reason.includes('outside every granted directory'))).toBe(true);
    });

    it('flags a relative reference when the record carries no cwd at all, rather than guessing', () => {
      const hits = auditToolCall('Read', { file_path: 'spec.md' }, GRANTED, undefined, HOME);
      expect(hits[0]).toMatchObject({ reason: expect.stringContaining('carries no cwd') });
    });
  });
});

describe('auditTranscript', () => {
  it('flags a fixture transcript that reads docs/internal/record', () => {
    const hits = auditTranscript(join(FIXTURES, 'reads-forbidden.jsonl'), ['/tmp/granted-fixture']);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('passes a fixture transcript confined to its granted directory', () => {
    expect(auditTranscript(join(FIXTURES, 'confined.jsonl'), ['/tmp/granted-fixture'])).toEqual([]);
  });

  describe('one fixture per bypass', () => {
    const cases: Array<[string, string[]]> = [
      ['bypass-grep-no-path.jsonl', ['/tmp/granted-fixture']],
      ['bypass-glob-absolute-pattern.jsonl', ['/tmp/granted-fixture']],
      ['bypass-bash-relative-record-dir.jsonl', ['/tmp/granted-fixture']],
      ['bypass-bash-relative-prompt-file.jsonl', ['/tmp/granted-fixture']],
      ['bypass-bash-relative-parent-dir.jsonl', ['/tmp/granted-fixture']],
      ['bypass-bash-parent-traversal.jsonl', ['/tmp/granted-fixture']],
    ];
    for (const [name, granted] of cases) {
      it(`flags ${name}`, () => {
        expect(auditTranscript(join(FIXTURES, name), granted).length).toBeGreaterThan(0);
      });
    }
  });
});

describe('audit-transcripts.ts CLI', () => {
  it('exits 1 on a hit and 0 when confined', () => {
    expect(main(['--transcript', join(FIXTURES, 'reads-forbidden.jsonl'), '--granted', '/tmp/granted-fixture'])).toBe(1);
    expect(main(['--transcript', join(FIXTURES, 'confined.jsonl'), '--granted', '/tmp/granted-fixture'])).toBe(0);
  });

  it('refuses a missing flag', () => {
    expect(main(['--transcript', join(FIXTURES, 'confined.jsonl')])).toBe(2);
  });
});
