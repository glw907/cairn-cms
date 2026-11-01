// Known-bad for `E2-add-audit-rule`: the rule matches `<img` tags with a regex over the raw
// source instead of the parsed markup, so it misreads a single-quoted or multi-line tag and flags
// a tag inside a comment or a string. It is registered, but it has no test, no tier-map entry, and
// no changelog line.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = {
  'src/lib/audit/rules/static/img-alt.ts': `import type { Finding, StaticRule } from '../../types.js';

const IMG_WITHOUT_ALT = /<img(?![^>]*\\balt=)[^>]*>/g;

export const imgAlt: StaticRule = {
  id: 'img-alt',
  tier: 'error',
  check(ctx) {
    const findings: Finding[] = [];
    for (const file of ctx.files) {
      for (const match of file.source.matchAll(IMG_WITHOUT_ALT)) {
        const start = match.index ?? 0;
        findings.push({
          ruleId: 'img-alt',
          tier: 'error',
          file: file.file,
          line: file.source.slice(0, start).split('\\n').length,
          start,
          end: start + match[0].length,
          message: 'img is missing alt',
        });
      }
    }
    return findings;
  },
};
`,
  'src/lib/audit/rules/static/index.ts': `import { imgAlt } from './img-alt.js';
import type { StaticRule } from '../../types.js';

/** The static rules a run executes, in report order. */
export function staticRules(): StaticRule[] {
  return [imgAlt];
}
`,
};

/** @param {string} root */
export default function knownBad(root) {
  for (const [path, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
}
