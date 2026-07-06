import { describe, it, expect } from 'vitest';
import {
  seamBaseName,
  parseSeams,
  referencesChassis,
  reachInsInSource,
} from '../../../scripts/check-chassis-boundary.mjs';

describe('seamBaseName', () => {
  it('strips a single trailing extension, including from a dotted filename', () => {
    expect(seamBaseName('cairn.server.ts')).toBe('cairn.server');
    expect(seamBaseName('$chassis/cairn.server.js')).toBe('cairn.server');
    expect(seamBaseName('tokens.css')).toBe('tokens');
  });
});

describe('parseSeams', () => {
  it('reads every backtick-quoted filename out of a table row', () => {
    const readme = `
# The chassis

| File | What it is |
| --- | --- |
| \`content.ts\` | The delivery content layer. |
| \`cairn.server.ts\` | The runtime composition point. |
| \`tokens.css\` | The token system. |
`;
    expect(parseSeams(readme)).toEqual(new Set(['content', 'cairn.server', 'tokens']));
  });
});

describe('referencesChassis', () => {
  it('recognizes the $chassis alias and a relative chassis/ path', () => {
    expect(referencesChassis('$chassis/content.js')).toBe(true);
    expect(referencesChassis('../chassis/tokens.css')).toBe(true);
    expect(referencesChassis('../../chassis/render.js')).toBe(true);
  });

  it('ignores an unrelated specifier', () => {
    expect(referencesChassis('$theme/cairn.config.js')).toBe(false);
    expect(referencesChassis('svelte')).toBe(false);
  });
});

describe('reachInsInSource', () => {
  const seams = new Set(['content', 'tokens']);

  it('passes a $chassis import naming a documented seam', () => {
    const source = "import { something } from '$chassis/content.js';";
    expect(reachInsInSource('good.ts', source, seams)).toEqual([]);
  });

  it('passes a relative CSS @import naming a documented seam', () => {
    const source = "@import '../chassis/tokens.css';";
    expect(reachInsInSource('good.css', source, seams)).toEqual([]);
  });

  it('flags a $chassis import naming an undocumented file', () => {
    const source = "import { secret } from '$chassis/secret-helper.js';";
    const violations = reachInsInSource('bad.ts', source, seams);
    expect(violations).toEqual([{ file: 'bad.ts', spec: '$chassis/secret-helper.js' }]);
  });

  it('ignores an import that never touches chassis', () => {
    const source = "import { x } from '$theme/cairn.config.js';";
    expect(reachInsInSource('fine.ts', source, seams)).toEqual([]);
  });
});
