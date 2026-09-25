import { describe, it, expect } from 'vitest';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditToolCall, auditTranscript, main } from '../../../scripts/docs-readers/audit-transcripts.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FIXTURES = join(ROOT, 'scripts/docs-readers/fixtures/audit-transcripts');
const HOME = '/home/fixture';

describe('auditToolCall', () => {
  it('flags a Read outside every granted directory', () => {
    const hits = auditToolCall('Read', { file_path: '/var/home/glw907/Projects/cairn-cms/docs/internal/record/x.md' }, ['/tmp/granted'], HOME);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ source: 'tool', tool: 'Read' });
  });

  it('passes a Read confined to the granted directory', () => {
    expect(auditToolCall('Read', { file_path: '/tmp/granted/spec.md' }, ['/tmp/granted'], HOME)).toEqual([]);
  });

  it('is silent on a tool with no path-bearing field', () => {
    expect(auditToolCall('SubagentHandback', { message: 'done' }, ['/tmp/granted'], HOME)).toEqual([]);
  });

  it('flags a Bash command mentioning a forbidden path even without a leading slash', () => {
    const hits = auditToolCall('Bash', { command: 'cat docs/internal/record/note.md' }, ['/tmp/granted'], HOME);
    expect(hits.some((h) => h.reason.includes('docs/internal/record/'))).toBe(true);
  });

  it('passes a Bash command confined to the granted directory', () => {
    expect(auditToolCall('Bash', { command: 'cd /tmp/granted/out && ls -la' }, ['/tmp/granted'], HOME)).toEqual([]);
  });

  it('never flags a bare /dev/null redirect, quote-stripped or glued to a trailing semicolon', () => {
    expect(auditToolCall('Bash', { command: 'grep -c "x" *.md 2>/dev/null' }, ['/tmp/granted'], HOME)).toEqual([]);
    expect(auditToolCall('Bash', { command: 'foo() { : ; } > /dev/null;' }, ['/tmp/granted'], HOME)).toEqual([]);
  });
});

describe('auditTranscript', () => {
  it('flags a fixture transcript that reads docs/internal/record/', () => {
    const hits = auditTranscript(join(FIXTURES, 'reads-forbidden.jsonl'), ['/tmp/granted-fixture']);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('passes a fixture transcript confined to its granted directory', () => {
    expect(auditTranscript(join(FIXTURES, 'confined.jsonl'), ['/tmp/granted-fixture'])).toEqual([]);
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
