import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { logEventGrammar } from '../../../../lib/audit/rules/static/log-event-grammar.js';
import type { SourceFile } from '../../../../lib/audit/types.js';

const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);
const FIXTURES = fileURLToPath(new URL('../fixtures/sources/', import.meta.url));

/** One fixture read from disk, as the plain-text source the rule reads. */
function fixture(name: string): SourceFile {
  return { file: name, source: readFileSync(`${FIXTURES}${name}`, 'utf8') };
}

function check(...sources: SourceFile[]) {
  return logEventGrammar.check({ files: [], sheet: SHEET, config: CONFIG, sources });
}

describe('log-event-grammar', () => {
  it('passes a grammar-conforming event name that reserves no name cairn already takes', () => {
    expect(check(fixture('passing.ts'))).toEqual([]);
  });

  it('flags a literal that collides with a name CairnLogEvent already reserves', () => {
    const findings = check(fixture('collision.ts'));
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('log-event-grammar');
    expect(findings[0].tier).toBe('advisory');
    expect(findings[0].message).toContain('"auth.link.requested"');
    expect(findings[0].message).toContain('already names a member');
  });

  it('flags a literal that does not read as area[.subject].verb_phrase', () => {
    const findings = check(fixture('bad-shape.ts'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('"Signup failed"');
    expect(findings[0].message).toContain('does not read as area[.subject].verb_phrase');
  });

  // The rule's own documented miss: a template literal carries no readable string, so a computed
  // name never raises a finding, correct or not.
  it('raises nothing for a template-literal event name, the documented false negative', () => {
    expect(check(fixture('computed.svelte'))).toEqual([]);
  });

  // The rule's own documented false positive: the name heuristic has no way to tell console's
  // logger from cairn's, so the finding's own message says as much.
  it('flags console.info the same way, and says so in the finding', () => {
    const findings = check(fixture('console-caveat.ts'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('console.info');
  });

  // The promotion version is stated verbatim, as a string, in every finding this rule raises.
  it('ends every message with the promotion version', () => {
    const findings = [...check(fixture('collision.ts')), ...check(fixture('bad-shape.ts'))];
    for (const finding of findings) {
      expect(finding.message.endsWith('0.98.0')).toBe(true);
    }
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const source = fixture('grammar-suppressed.ts');
    const split = applySuppressions(check(source), [source]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['log-event-grammar']);
  });

  it('defaults sources to an empty list when a caller omits it entirely', () => {
    expect(logEventGrammar.check({ files: [], sheet: SHEET, config: CONFIG })).toEqual([]);
  });
});
