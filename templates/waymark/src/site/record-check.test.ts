import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkSiteRecord } from './record-check.js';

const schemaFile = path.join(
  path.dirname(createRequire(import.meta.url).resolve('@glw907/cairn-cms/package.json')),
  'schema/cairn-site-1.schema.json',
);
const recordFile = fileURLToPath(new URL('../../cairn-site.json', import.meta.url));

describe('checkSiteRecord', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'record-check-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const write = (value: unknown) => {
    const file = path.join(dir, 'cairn-site.json');
    writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
    return file;
  };
  const valid = () => JSON.parse(readFileSync(recordFile, 'utf8')) as Record<string, unknown>;

  it('accepts the showcase record', () => {
    expect(checkSiteRecord(recordFile, schemaFile)).toBeUndefined();
  });

  it('names a missing file', () => {
    const file = path.join(dir, 'cairn-site.json');
    expect(checkSiteRecord(file, schemaFile)).toBe(`cairn-site.json: not found at ${file}`);
  });

  it('names invalid JSON', () => {
    expect(checkSiteRecord(write('{ nope'), schemaFile)).toMatch(/^cairn-site\.json: not valid JSON \(.+\)$/);
  });

  it('names an unknown key', () => {
    expect(checkSiteRecord(write({ ...valid(), colour: 'red' }), schemaFile)).toBe(
      'cairn-site.json: colour must NOT have additional properties',
    );
  });

  it('names a missing deploy.publicOrigin', () => {
    const base = valid();
    const { publicOrigin: _gone, ...deploy } = base.deploy as Record<string, unknown>;
    expect(checkSiteRecord(write({ ...base, deploy }), schemaFile)).toBe(
      "cairn-site.json: deploy.publicOrigin must have required property 'publicOrigin'",
    );
  });
});
