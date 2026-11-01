import { describe, it, expect } from 'vitest';
import { normalizeSignature } from '../../../scripts/checks/normalize-signature.mjs';

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

describe('normalizeSignature optional-artifact stripping', () => {
  it('keeps a required T | undefined parameter with no ? on the name', () => {
    const s = normalizeSignature(
      '(db: D1Database, waitUntil: ((p: Promise<unknown>) => void) | undefined) => AdminActionAuditSink',
    );
    expect(s).toBe(
      '(db: D1Database, waitUntil: ((p: Promise<unknown>) => void) | undefined) => AdminActionAuditSink',
    );
  });

  it('strips the optional artifact on an optional parameter while a required sibling union survives', () => {
    const s = normalizeSignature(
      '(binding: RateLimitLike | undefined, key?: string | undefined) => Promise<boolean>',
    );
    expect(s).toBe('(binding: RateLimitLike | undefined, key?: string) => Promise<boolean>');
  });

  it('strips both nesting levels of a doubly-optional object parameter', () => {
    const s = normalizeSignature(
      '(opts?: { roles?: RolesDeclaration | undefined; access?: AccessMap | undefined } | undefined) => X',
    );
    expect(s).toBe('(opts?: { roles?: RolesDeclaration; access?: AccessMap }) => X');
  });

  it('strips a doubly-nested optional member chain', () => {
    const s = normalizeSignature(
      '(event: { platform?: { env?: CairnEnv | undefined } | undefined }, r: C) => Promise<H>',
    );
    expect(s).toBe('(event: { platform?: { env?: CairnEnv } }, r: C) => Promise<H>');
  });

  it('keeps a required union nested inside a type argument under an optional parameter', () => {
    const s = normalizeSignature('x?: Array<T | undefined> | undefined');
    expect(s).toBe('x?: Array<T | undefined>');
  });
});
