import { describe, it, expect } from 'vitest';
import { validateNavTree, NavValidationError, type NavNode } from '../lib/nav';

describe('validateNavTree', () => {
  it('accepts a flat list', () => {
    const tree: NavNode[] = [{ label: 'Home', url: '/' }, { label: 'About', url: '/about' }];
    expect(validateNavTree(tree, 2)).toEqual(tree);
  });

  it('accepts nesting within the depth cap and a label-only parent', () => {
    const tree = [{ label: 'About', children: [{ label: 'Team', url: '/about/team' }] }];
    expect(validateNavTree(tree, 2)).toEqual(tree);
  });

  it('rejects nesting past the depth cap', () => {
    const tree = [{ label: 'A', children: [{ label: 'B', children: [{ label: 'C', url: '/c' }] }] }];
    expect(() => validateNavTree(tree, 2)).toThrow(NavValidationError);
  });

  it('rejects a node with an empty label', () => {
    expect(() => validateNavTree([{ label: '  ', url: '/x' }], 2)).toThrow(NavValidationError);
  });

  it('rejects a non-array root', () => {
    expect(() => validateNavTree({ label: 'x' }, 2)).toThrow(NavValidationError);
  });

  it('rejects more nodes than the cap', () => {
    const many = Array.from({ length: 201 }, (_, i) => ({ label: `n${i}`, url: `/${i}` }));
    expect(() => validateNavTree(many, 2)).toThrow(NavValidationError);
  });

  it('strips unknown keys and normalizes a missing url to undefined', () => {
    const dirty = [{ label: 'Home', url: '/', extra: 'x' } as unknown];
    expect(validateNavTree(dirty, 2)).toEqual([{ label: 'Home', url: '/' }]);
  });
});
