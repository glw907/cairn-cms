import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { logSecretField } from '../../../../lib/audit/rules/static/log-secret-field.js';
import type { SourceFile } from '../../../../lib/audit/types.js';

const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);
const FIXTURES = fileURLToPath(new URL('../fixtures/sources/', import.meta.url));

/** One fixture read from disk, as the plain-text source the rule reads. */
function fixture(name: string): SourceFile {
  return { file: name, source: readFileSync(`${FIXTURES}${name}`, 'utf8') };
}

function check(...sources: SourceFile[]) {
  return logSecretField.check({ files: [], sheet: SHEET, config: CONFIG, sources });
}

describe('log-secret-field', () => {
  it('flags a fields object whose key whole-matches a REDACTED_LOG_KEYS member', () => {
    const findings = check(fixture('secret-basic.ts'));
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('log-secret-field');
    expect(findings[0].tier).toBe('advisory');
    expect(findings[0].message).toContain('"token"');
    expect(findings[0].message).toContain('already replaces its value with <redacted>');
    // The message says plainly that nothing leaked: the rule is a name-awareness notice.
    expect(findings[0].message).toContain('nothing leaked here');
  });

  it('passes tokenCount and tokens, neither of which whole-matches a redacted key', () => {
    expect(check(fixture('secret-safe.ts'))).toEqual([]);
  });

  it('normalizes separators the way the runtime does, so apiKey matches api_key', () => {
    const source: SourceFile = {
      file: 'Fixture.ts',
      source: "log.info('x.y.z', { apiKey: value, 'set-cookie': header, xApiKey: other });",
    };
    const findings = check(source);
    // `xApiKey` normalizes to `xapikey`, not `apikey`, so a prefixed name is not a whole-key match.
    expect(findings.map((finding) => finding.message)).toHaveLength(2);
    expect(findings[0].message).toContain('"apiKey"');
    expect(findings[1].message).toContain('"set-cookie"');
  });

  it('ends every message with the promotion version', () => {
    for (const finding of check(fixture('secret-basic.ts'))) {
      expect(finding.message.endsWith('0.98.0')).toBe(true);
    }
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const source = fixture('secret-suppressed.ts');
    const split = applySuppressions(check(source), [source]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['log-secret-field']);
  });

  it('normalizes case: a differently-cased key still whole-matches', () => {
    const source: SourceFile = {
      file: 'Fixture.ts',
      source: "log.info('x.y.z', { Token: value });",
    };
    const findings = check(source);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('"Token"');
  });

  it('ignores a call with no second, fields argument at all', () => {
    const source: SourceFile = { file: 'Fixture.ts', source: "log.info('x.y.z');" };
    expect(check(source)).toEqual([]);
  });

  it('defaults sources to an empty list when a caller omits it entirely', () => {
    expect(logSecretField.check({ files: [], sheet: SHEET, config: CONFIG })).toEqual([]);
  });
});
