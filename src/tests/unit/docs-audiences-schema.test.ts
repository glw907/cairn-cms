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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SCHEMA_PATH = join(ROOT, 'docs/internal/audiences/profile.schema.json');
const AUDIENCES_DIR = join(ROOT, 'docs/internal/audiences');
const FIXTURES_DIR = join(ROOT, 'scripts/docs-audiences/fixtures');
const REAL_MANIFEST_PATH = join(ROOT, 'docs/internal/record/docs-exemplars.md');

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as JsonSchema;

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
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

  it('passes the shape check but fails on an exemplar id with no manifest entry', () => {
    const { data } = matter(readFixture('profile-unknown-exemplar.md'));
    expect(validateAgainstSchema(data, schema)).toEqual([]);
    const manifest = readFixture('manifest-fixture.md');
    expect(unresolvedExemplarIds(data.exemplars as string[], manifest)).toEqual(['editors/no-such-capture']);
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
    it(`${file} conforms to profile.schema.json and its exemplar ids all resolve`, () => {
      const { data } = matter(readFileSync(join(AUDIENCES_DIR, file), 'utf8'));
      expect(validateAgainstSchema(data, schema)).toEqual([]);
      const manifest = readFileSync(REAL_MANIFEST_PATH, 'utf8');
      expect(unresolvedExemplarIds((data.exemplars ?? []) as string[], manifest)).toEqual([]);
    });
  }
});

describe('idResolves, against the fixture manifest', () => {
  const manifest = readFixture('manifest-fixture.md');

  it('resolves a "Local path:" entry', () => {
    expect(idResolves(manifest, 'editors/govuk-publishing-guidance-home')).toBe(true);
  });

  it('resolves the un-rejected slug of a two-slug "Local paths:" entry', () => {
    expect(idResolves(manifest, 'editors/substack-app-login-link')).toBe(true);
  });

  it('fails the rejected slug of that same "Local paths:" entry, its Verdict line in the exact pinned form', () => {
    expect(manifest).toContain('- **Verdict (`substack-log-in/`):** rejected (too thin for the profile)');
    expect(idResolves(manifest, 'editors/substack-log-in')).toBe(false);
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

  it('never resolves the method source, named only in the section\'s opening paragraph', () => {
    expect(idResolves(manifest, 'editors/mozilla-kb-writing-guide')).toBe(false);
  });

  it('still fails the method source with its column-0 "kept" Verdict line present', () => {
    expect(manifest).toContain('- **Verdict (`mozilla-kb-writing-guide/`):** kept');
    expect(idResolves(manifest, 'editors/mozilla-kb-writing-guide')).toBe(false);
  });

  it('never resolves a slug named only in indented prose', () => {
    expect(idResolves(manifest, 'editors/tool')).toBe(false);
  });

  it('never resolves an id whose section is absent from the manifest', () => {
    expect(idResolves(manifest, 'operators/github-pat')).toBe(false);
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
