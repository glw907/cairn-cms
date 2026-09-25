// Covers Task 6 (4a) of the docs reset pass 2a spec: render-profile.ts's rendered `profile`
// string, pinned against a synthetic fixture profile since no authored profile exists yet.
import { describe, expect, it, vi } from 'vitest';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { main, renderProfile } from '../../../scripts/docs-audiences/render-profile.js';
import type { JsonSchema } from '../../../scripts/docs-audiences/lib/profile-schema.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SCHEMA_PATH = join(ROOT, 'docs/internal/audiences/profile.schema.json');
const FIXTURES_DIR = join(ROOT, 'scripts/docs-audiences/fixtures');

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as JsonSchema;

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
}

describe('renderProfile', () => {
  it('matches the pinned fixture text for the synthetic profile', () => {
    const { data } = matter(readFixture('profile-valid.md'));
    const expected = readFixture('profile-valid.rendered.txt').replace(/\n$/, '');
    expect(renderProfile(data, schema)).toBe(expected);
  });

  it('names the profile id and persona on the first line', () => {
    const { data } = matter(readFixture('profile-valid.md'));
    expect(renderProfile(data, schema).split('\n')[0]).toBe(
      'profile-valid: A reader used only by the schema and render fixtures, never a real audience.',
    );
  });

  it('renders exemplar ids as bare ids, never a resolved manifest path', () => {
    const { data } = matter(readFixture('profile-valid.md'));
    const rendered = renderProfile(data, schema);
    expect(rendered).toContain('- editors/govuk-publishing-guidance-home');
    expect(rendered).not.toContain('~/.local/share/cairn/exemplars');
  });

  it('omits the provisionalReason block when the profile carries no reason', () => {
    const { data } = matter(readFixture('profile-valid.md'));
    expect(renderProfile(data, schema)).not.toContain('Provisional reason');
  });

  it('renders a present provisionalReason as its own block', () => {
    const data = {
      id: 'provisional-example',
      persona: 'A profile carrying a provisionalReason, for the block-placement check.',
      vocabulary: { use: [], avoid: [] },
      ceiling: 'Knows how to open a saved draft.',
      arrivalStates: [],
      success: 'Finishes the task.',
      exemplars: [],
      provisional: true,
      provisionalReason: 'evidence pending a human read',
    };
    expect(renderProfile(data, schema)).toContain('Provisional reason: evidence pending a human read');
  });
});

describe('main (the CLI entry point)', () => {
  it('returns 0 and prints the rendered profile for a profile that passes every check', () => {
    const path = join(FIXTURES_DIR, 'profile-valid.md');
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    let exitCode = -1;
    let written = '';
    try {
      exitCode = main([path]);
      // Read the call history before mockRestore(), which also clears it (mockRestore is
      // mockReset plus restoring the original implementation).
      written = stdoutSpy.mock.calls.map((call) => String(call[0])).join('');
    } finally {
      stdoutSpy.mockRestore();
    }
    expect(exitCode).toBe(0);
    expect(written).toContain(
      'profile-valid: A reader used only by the schema and render fixtures, never a real audience.',
    );
  });

  it('exits 1 and names the file on broken YAML frontmatter, without throwing an uncaught stack trace', () => {
    const path = join(FIXTURES_DIR, 'profile-broken-yaml.md');
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    let exitCode = -1;
    let written = '';
    try {
      exitCode = main([path]);
      // Read the call history before mockRestore(), which also clears it (mockRestore is
      // mockReset plus restoring the original implementation).
      written = stderrSpy.mock.calls.map((call) => String(call[0])).join('');
    } finally {
      stderrSpy.mockRestore();
    }
    expect(exitCode).toBe(1);
    expect(written).toContain(`${path} fails its checks:`);
    expect(written).toContain('frontmatter does not parse:');
  });
});
