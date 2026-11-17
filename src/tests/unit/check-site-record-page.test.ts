import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkSiteRecordPage,
  pageFields,
  schemaFields,
} from '../../../scripts/checks/check-site-record-page.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const schema = JSON.parse(readFileSync(resolve(ROOT, 'schema/cairn-site-1.schema.json'), 'utf8'));
const page = readFileSync(resolve(ROOT, 'docs/admin/site-record.md'), 'utf8');

describe('schemaFields', () => {
  it('walks nested properties as dotted paths and skips the groups', () => {
    expect(schemaFields(schema)).toEqual(
      expect.arrayContaining(['kind', 'scaffold.engine', 'deploy.github.appId', 'deploy.publicOrigin']),
    );
    expect(schemaFields(schema)).not.toContain('deploy');
    expect(schemaFields(schema)).not.toContain('deploy.github');
  });
});

describe('checkSiteRecordPage', () => {
  it('passes the real page against the real schema', () => {
    expect(checkSiteRecordPage(schema, page)).toEqual([]);
  });

  it('names the field whose row is dropped', () => {
    const dropped = page
      .split('\n')
      .filter((line) => !line.startsWith('| `deploy.github.installationId` |'))
      .join('\n');
    expect(dropped).not.toBe(page);
    const problems = checkSiteRecordPage(schema, dropped);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('deploy.github.installationId');
  });

  it('names a row the schema does not have', () => {
    const problems = checkSiteRecordPage(schema, `${page}\n| \`deploy.region\` | x | x | x |\n`);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('deploy.region');
  });

  it('reads only rows that open on a code-formatted path', () => {
    expect(pageFields('| Field | Meaning |\n| --- | --- |\n| `a.b` | x |\n| plain | y |')).toEqual(['a.b']);
  });
});
