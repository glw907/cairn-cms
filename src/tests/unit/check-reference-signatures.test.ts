import { describe, it, expect } from 'vitest';
import {
  normalizeSignature,
  compareSignature,
  declaredSignature,
} from '../../../scripts/check-reference-signatures.mjs';

describe('normalizeSignature', () => {
  it('reduces the declare-function form and the arrow form to the same string', () => {
    const declare = normalizeSignature('declare function f(a: string): number');
    const arrow = normalizeSignature('(a: string) => number');
    expect(declare).toBe(arrow);
  });

  it('reduces the declare-const form to the same string as the arrow form', () => {
    const declareConst = normalizeSignature('declare const f: (a: string) => number');
    const arrow = normalizeSignature('(a: string) => number');
    expect(declareConst).toBe(arrow);
  });

  it('collapses multi-line whitespace in a wrapped declaration', () => {
    const wrapped = normalizeSignature(
      'declare function f(\n  a: string,\n  b: number,\n): void',
    );
    const flat = normalizeSignature('declare function f(a: string, b: number): void');
    expect(wrapped).toBe(flat);
  });

  it('does not rewrite a colon inside a nested type as the return head', () => {
    const s = normalizeSignature('declare function f(opts: { a: string }): void');
    expect(s).toBe('(opts: { a: string }) => void');
  });
});

describe('compareSignature', () => {
  it('returns null when the declare form matches the real arrow type', () => {
    const problem = compareSignature(
      'f',
      'declare function f(a: string): number',
      '(a: string) => number',
      '.',
    );
    expect(problem).toBeNull();
  });

  it('flags a drifted argument type, naming the export once', () => {
    const problem = compareSignature(
      'f',
      'declare function f(a: number): number',
      '(a: string) => number',
      '.',
    );
    expect(problem).not.toBeNull();
    expect(problem?.name).toBe('f');
  });

  it('flags a drifted return type, naming the export once', () => {
    const problem = compareSignature(
      'f',
      'declare function f(a: string): string',
      '(a: string) => number',
      '.',
    );
    expect(problem).not.toBeNull();
    expect(problem?.name).toBe('f');
  });

  it('skips an export with no declared block in the page', () => {
    const problem = compareSignature('f', null, '(a: string) => number', '.');
    expect(problem).toBeNull();
  });

  it('skips an allowlisted export even when the signatures differ', () => {
    const allow = new Set(['.#f']);
    const problem = compareSignature(
      'f',
      'declare function f(a: number): number',
      '(a: string) => number',
      '.',
      allow,
    );
    expect(problem).toBeNull();
  });
});

describe('declaredSignature', () => {
  it('extracts a function declaration from a fenced ts block', () => {
    const page = ['Some prose.', '', '```ts', 'declare function f(a: string): number;', '```'].join(
      '\n',
    );
    expect(declaredSignature(page, 'f')).toBe('declare function f(a: string): number;');
  });

  it('extracts a multi-line function declaration whole', () => {
    const page = [
      '```ts',
      'declare function f(',
      '  a: string,',
      '  b: number,',
      '): void;',
      '```',
    ].join('\n');
    expect(declaredSignature(page, 'f')).toBe('declare function f(\n  a: string,\n  b: number,\n): void;');
  });

  it('extracts a const-function declaration', () => {
    const page = ['```ts', 'declare const f: SendThing;', '```'].join('\n');
    expect(declaredSignature(page, 'f')).toBe('declare const f: SendThing;');
  });

  it('returns null when no block declares the name', () => {
    const page = ['```ts', 'declare function other(): void;', '```'].join('\n');
    expect(declaredSignature(page, 'f')).toBeNull();
  });
});
