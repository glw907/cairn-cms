// Covers Task 6 (4a) of the docs reset pass 2a spec: the audience profile schema and the
// exemplar-id resolver it depends on. Every case here runs against a synthetic fixture profile
// and a fixture manifest cut from real lines, never against the (not-yet-authored)
// docs/internal/audiences/*.md profiles the schema will gate once Task 7 writes them.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { validateAgainstSchema, type JsonSchema } from '../../../scripts/docs-audiences/lib/profile-schema.js';
import { idResolves, unresolvedExemplarIds } from '../../../scripts/docs-audiences/lib/exemplar-manifest.js';
import { checkProfileFile } from '../../../scripts/docs-audiences/lib/check-profile-file.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SCHEMA_PATH = join(ROOT, 'docs/internal/audiences/profile.schema.json');
const AUDIENCES_DIR = join(ROOT, 'docs/internal/audiences');
const FIXTURES_DIR = join(ROOT, 'scripts/docs-audiences/fixtures');
const REAL_MANIFEST_PATH = join(ROOT, 'docs/internal/record/docs-exemplars.md');

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as JsonSchema;

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
}

function fixturePath(name: string): string {
  return join(FIXTURES_DIR, name);
}

describe('profile.schema.json', () => {
  it('declares required, properties, and additionalProperties: false for the pinned frontmatter keys', () => {
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(
      expect.arrayContaining([
        'id',
        'persona',
        'vocabulary',
        'ceiling',
        'arrivalStates',
        'success',
        'exemplars',
        'provisional',
      ]),
    );
    expect(Object.keys(schema.properties ?? {})).toEqual(
      expect.arrayContaining([
        'id',
        'persona',
        'vocabulary',
        'ceiling',
        'arrivalStates',
        'success',
        'exemplars',
        'provisional',
        'provisionalReason',
      ]),
    );
  });
});

describe('validateAgainstSchema, on the synthetic fixture profile', () => {
  it('accepts the valid synthetic profile', () => {
    const { data } = matter(readFixture('profile-valid.md'));
    expect(validateAgainstSchema(data, schema)).toEqual([]);
  });

  it('passes the full check (schema plus exemplar resolution) against the fixture manifest', () => {
    const manifest = readFixture('manifest-fixture.md');
    const { errors } = checkProfileFile(fixturePath('profile-valid.md'), schema, manifest);
    expect(errors).toEqual([]);
  });

  it('fails a profile missing a required key, naming it', () => {
    const { data } = matter(readFixture('profile-missing-key.md'));
    const errors = validateAgainstSchema(data, schema);
    expect(errors).toContain('frontmatter: missing required key "success"');
  });

  it('fails a profile carrying a key the schema does not declare, naming it', () => {
    const { data } = matter(readFixture('profile-extra-key.md'));
    const errors = validateAgainstSchema(data, schema);
    expect(errors).toContain('frontmatter: unknown key "unexpected-extra-key"');
  });

  it('fails a profile with no frontmatter block, naming every required key as missing', () => {
    const { data } = matter(readFixture('profile-no-frontmatter.md'));
    const errors = validateAgainstSchema(data, schema);
    expect(errors.length).toBe((schema.required ?? []).length);
  });

  it('throws parsing a profile whose frontmatter is broken YAML', () => {
    expect(() => matter(readFixture('profile-broken-yaml.md'))).toThrow();
  });

  it('fails provisional: true carrying no provisionalReason', () => {
    const { data } = matter(readFixture('profile-provisional-no-reason.md'));
    const errors = validateAgainstSchema(data, schema);
    expect(errors).toContain('frontmatter: missing required key "provisionalReason" (conditionally required)');
  });

  it('fails provisional: false carrying a provisionalReason', () => {
    const { data } = matter(readFixture('profile-provisional-reason-not-allowed.md'));
    const errors = validateAgainstSchema(data, schema);
    expect(errors).toContain('frontmatter: key "provisionalReason" must not be present (conditionally forbidden)');
  });

  it('passes the shape check but fails on an exemplar id with no manifest entry', () => {
    const { data } = matter(readFixture('profile-unknown-exemplar.md'));
    expect(validateAgainstSchema(data, schema)).toEqual([]);
    const manifest = readFixture('manifest-fixture.md');
    expect(unresolvedExemplarIds(data.exemplars as string[], manifest)).toEqual(['editors/no-such-capture']);
  });
});

describe('checkProfileFile, on the fixture profiles', () => {
  const manifest = readFixture('manifest-fixture.md');

  it('fails a profile missing a required key, naming both the key and the file', () => {
    const path = fixturePath('profile-missing-key.md');
    const { errors } = checkProfileFile(path, schema, manifest);
    expect(errors).toContain(`${path}: frontmatter: missing required key "success"`);
  });

  it('fails a profile carrying an unknown key, naming both the key and the file', () => {
    const path = fixturePath('profile-extra-key.md');
    const { errors } = checkProfileFile(path, schema, manifest);
    expect(errors).toContain(`${path}: frontmatter: unknown key "unexpected-extra-key"`);
  });

  it('fails a profile with no frontmatter block, naming the file on every missing key', () => {
    const path = fixturePath('profile-no-frontmatter.md');
    const { errors } = checkProfileFile(path, schema, manifest);
    expect(errors.length).toBe((schema.required ?? []).length);
    for (const error of errors) expect(error.startsWith(`${path}:`)).toBe(true);
  });

  it('fails a profile whose frontmatter is broken YAML, naming the file instead of throwing', () => {
    const path = fixturePath('profile-broken-yaml.md');
    const { errors, data } = checkProfileFile(path, schema, manifest);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain(`${path}: frontmatter does not parse:`);
    expect(data).toBeUndefined();
  });

  it('fails a profile whose id does not match its file name, naming the file', () => {
    const path = fixturePath('profile-id-mismatch.md');
    const { errors } = checkProfileFile(path, schema, manifest);
    expect(errors).toContain(`${path}: id "not-the-file-name" does not match file name "profile-id-mismatch"`);
  });

  it('returns the parsed frontmatter alongside an empty errors array for a profile that passes every check', () => {
    const { errors, data } = checkProfileFile(fixturePath('profile-valid.md'), schema, manifest);
    expect(errors).toEqual([]);
    expect(data?.id).toBe('profile-valid');
  });
});

describe('every real audience profile (none exist yet at Task 6)', () => {
  const files = existsSync(AUDIENCES_DIR)
    ? readdirSync(AUDIENCES_DIR).filter((f) => f.endsWith('.md') && f !== 'README.md')
    : [];

  if (files.length === 0) {
    it('has no authored profiles yet', () => {
      expect(files).toEqual([]);
    });
  }
  for (const file of files) {
    it(`${file} conforms to profile.schema.json, its exemplar ids resolve, and its id matches its file name`, () => {
      const path = join(AUDIENCES_DIR, file);
      const manifest = readFileSync(REAL_MANIFEST_PATH, 'utf8');
      // checkProfileFile's own id-basename check already fails naming the file on a mismatch,
      // so an empty `errors` array here proves the id matches too; no separate assertion needed.
      const { errors } = checkProfileFile(path, schema, manifest);
      expect(errors).toEqual([]);
    });
  }
});

describe('idResolves, against the fixture manifest', () => {
  const manifest = readFixture('manifest-fixture.md');

  it('resolves a "Local path:" entry', () => {
    expect(idResolves(manifest, 'editors/govuk-publishing-guidance-home')).toBe(true);
  });

  it('resolves one slug of a two-slug "Local paths:" entry', () => {
    expect(idResolves(manifest, 'editors/substack-app-login-link')).toBe(true);
  });

  it('resolves the other slug of that same two-slug entry too, since neither slug carries the rejected verdict', () => {
    expect(idResolves(manifest, 'editors/substack-log-in')).toBe(true);
  });

  it('fails a rejected id, its Verdict line in the exact pinned form', () => {
    expect(manifest).toContain('- **Verdict (`google-docs-get-started/`):** rejected (too thin for the profile)');
    expect(idResolves(manifest, 'editors/google-docs-get-started')).toBe(false);
  });

  it('resolves an id carrying a "kept" Verdict line', () => {
    expect(manifest).toContain('- **Verdict (`govuk-publishing-guidance-home/`):** kept');
    expect(idResolves(manifest, 'editors/govuk-publishing-guidance-home')).toBe(true);
  });

  it('resolves a "Local copy:" entry', () => {
    expect(idResolves(manifest, 'evaluators/sqlite-about')).toBe(true);
  });

  it('resolves a `<dir>/<slug>/` entry', () => {
    expect(idResolves(manifest, 'designers/shopify-create-theme')).toBe(true);
  });

  it('resolves a bare slug after the URL', () => {
    expect(idResolves(manifest, 'extenders/payload-custom-components')).toBe(true);
  });

  it('resolves the newly added Operators entry, the exemplar the valid synthetic profile depends on', () => {
    expect(idResolves(manifest, 'operators/github-pat')).toBe(true);
  });

  it('resolves the newly added Core section\'s dir/slug entry', () => {
    expect(idResolves(manifest, 'core/rust-analyzer-architecture')).toBe(true);
  });

  it('never resolves the method source, named only in the section\'s opening paragraph', () => {
    expect(idResolves(manifest, 'editors/mozilla-kb-writing-guide')).toBe(false);
  });

  it('still fails the method source with its column-0 "kept" Verdict line present', () => {
    expect(manifest).toContain('- **Verdict (`mozilla-kb-writing-guide/`):** kept');
    expect(idResolves(manifest, 'editors/mozilla-kb-writing-guide')).toBe(false);
  });

  it('never resolves a slug named only in indented prose', () => {
    expect(idResolves(manifest, 'core/tool')).toBe(false);
    expect(idResolves(manifest, 'core/templates')).toBe(false);
  });

  it('never resolves an id whose section has no heading in the manifest at all', () => {
    expect(idResolves(manifest, 'nonexistent-audience/some-slug')).toBe(false);
  });
});

describe('manifest-fixture.md carries only real lines below its preamble', () => {
  it('has every non-Verdict, non-blank line appear verbatim as a line of the real exemplar manifest', () => {
    const fixtureLines = readFixture('manifest-fixture.md').split('\n');
    const startIndex = fixtureLines.findIndex((line) => line === '## Editors');
    const bodyLines = fixtureLines.slice(startIndex);
    const realLines = new Set(readFileSync(REAL_MANIFEST_PATH, 'utf8').split('\n'));
    const offenders = bodyLines.filter(
      (line) => line.trim() !== '' && !line.includes('**Verdict (') && !realLines.has(line),
    );
    expect(offenders).toEqual([]);
  });
});

describe('idResolves, against the real exemplar manifest', () => {
  const manifest = readFileSync(REAL_MANIFEST_PATH, 'utf8');

  it.each([
    ['editors', 'editors/govuk-publishing-guidance-home'],
    ['operators', 'operators/github-pat'],
    ['designers', 'designers/shopify-create-theme'],
    ['extenders', 'extenders/payload-custom-components'],
    ['core', 'core/rust-analyzer-architecture'],
    ['evaluators', 'evaluators/sqlite-about'],
  ])('resolves one known id in %s', (_dir, id) => {
    expect(idResolves(manifest, id)).toBe(true);
  });
});
