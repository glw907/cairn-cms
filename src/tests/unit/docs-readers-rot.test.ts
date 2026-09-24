import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { measureRot } from '../../../scripts/docs-readers/rot.js';

/** Write a small text file, creating its parent directories. */
function write(file: string, content: string): void {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, content);
}

describe('measureRot', () => {
  it('counts an anchored pointer as rotted when its tokens are not on the cited line or range, and skips harvest-record and no-anchor bullets', () => {
    const root = mkdtempSync(join(tmpdir(), 'docs-readers-rot-'));
    try {
      write(
        join(root, 'src/example.ts'),
        ['export function foo() {', '  return 1;', '}', 'export function bar() {', '  return 2;', '}', 'export function baz() {', '  return 3;', '}'].join('\n'),
      );
      write(
        join(root, 'docs/internal/facts/example.md'),
        [
          '## Example',
          '',
          '- Foo claim, right line. Source: `src/example.ts:1` (`foo`) [verified]',
          '- Bar claim, wrong line. Source: `src/example.ts:1` (`bar`) [verified]',
          '- Bar claim, right range. Source: `src/example.ts:4-6` (`bar`) [verified]',
          '- Missing path claim. Source: `src/missing.ts:1` (`nope`) [verified]',
          '- No anchor claim. Source: `src/example.ts:1` [verified]',
          '',
          '## Harvest record',
          '',
          '- Skipped entirely, would otherwise rot. Source: `src/example.ts:1` (`bar`) [verified]',
        ].join('\n'),
      );

      const report = measureRot(root);

      // Only the four anchored, non-harvest-record bullets count; the no-anchor bullet and the
      // harvest-record bullet are both excluded.
      expect(report.totalAnchored).toBe(4);
      expect(report.rotted).toBe(2);
      expect(report.rotShare).toBeCloseTo(0.5);

      const byPath = (path: string, lineSpec: string) => report.findings.find((f) => f.path === path && f.lineSpec === lineSpec);
      expect(byPath('src/example.ts', '1')?.onCitedLine).toBe(true);
      const wrongLine = report.findings.filter((f) => f.path === 'src/example.ts' && f.lineSpec === '1' && f.anchor === 'bar')[0];
      expect(wrongLine.onCitedLine).toBe(false);
      expect(wrongLine.missingTokens).toEqual(['bar']);
      expect(byPath('src/example.ts', '4-6')?.onCitedLine).toBe(true);
      const missingPath = byPath('src/missing.ts', '1');
      expect(missingPath?.onCitedLine).toBe(false);
      expect(missingPath?.missingTokens).toEqual(['nope']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports zero share when a facts file carries no anchored pointer at all', () => {
    const root = mkdtempSync(join(tmpdir(), 'docs-readers-rot-empty-'));
    try {
      write(join(root, 'docs/internal/facts/example.md'), ['## Example', '', '- A claim with no pointer at all. [external: a vendor page]'].join('\n'));
      const report = measureRot(root);
      expect(report.totalAnchored).toBe(0);
      expect(report.rotted).toBe(0);
      expect(report.rotShare).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
