import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { validateNavTree, NavValidationError, type NavNode, readNavTree, writeNavTree, loadNav } from '../lib/nav';

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

// A minimal D1Database-shaped shim over better-sqlite3 so the async D1 store contract can be
// exercised in-process (the same "real SQLite" approach the auth integration test uses).
function d1(sqlite: import('better-sqlite3').Database) {
  return {
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql);
      let args: unknown[] = [];
      const api = {
        bind(...a: unknown[]) { args = a; return api; },
        async first<T>() { return (stmt.get(...args) as T) ?? null; },
        async run() { stmt.run(...args); return { success: true }; },
      };
      return api;
    },
  } as unknown as import('@cloudflare/workers-types').D1Database;
}

function freshDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec('CREATE TABLE nav_menu (name TEXT PRIMARY KEY, tree_json TEXT NOT NULL, updated_at INTEGER NOT NULL)');
  return d1(sqlite);
}

describe('nav D1 store', () => {
  it('writes then reads a tree back', async () => {
    const db = freshDb();
    const tree = [{ label: 'Home', url: '/' }];
    await writeNavTree(db, 'primary', tree);
    expect(await readNavTree(db, 'primary')).toEqual(tree);
  });

  it('upserts (a second write replaces the first)', async () => {
    const db = freshDb();
    await writeNavTree(db, 'primary', [{ label: 'A', url: '/a' }]);
    await writeNavTree(db, 'primary', [{ label: 'B', url: '/b' }]);
    expect(await readNavTree(db, 'primary')).toEqual([{ label: 'B', url: '/b' }]);
  });

  it('readNavTree returns null for an absent menu', async () => {
    expect(await readNavTree(freshDb(), 'missing')).toBeNull();
  });

  it('loadNav returns [] when the binding is absent', async () => {
    expect(await loadNav({}, 'primary')).toEqual([]);
  });

  it('loadNav returns [] for an absent menu and a parsed tree when present', async () => {
    const db = freshDb();
    expect(await loadNav({ AUTH_DB: db }, 'primary')).toEqual([]);
    await writeNavTree(db, 'primary', [{ label: 'Home', url: '/' }]);
    expect(await loadNav({ AUTH_DB: db }, 'primary')).toEqual([{ label: 'Home', url: '/' }]);
  });
});
