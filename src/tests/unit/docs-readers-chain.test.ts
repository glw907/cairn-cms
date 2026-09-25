import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { appendEntry, chainPrefixLength, hashFile, latestEntry, readChain, verifyChain } from '../../../scripts/docs-readers/lib/chain.js';

let dir: string;
let chainFile: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'docs-readers-chain-'));
  chainFile = join(dir, 'chain.jsonl');
});

/** Write a small file under the scratch root and return its path and sha256. */
function artifact(name: string, content: string): { path: string; sha256: string } {
  const file = join(dir, name);
  writeFileSync(file, content);
  return { path: name, sha256: hashFile(file) };
}

describe('appendEntry', () => {
  it('gives the genesis entry a null prior', () => {
    const { path, sha256 } = artifact('manifest.json', '{}');
    const entry = appendEntry(chainFile, { path, sha256, commit: 'c1' });
    expect(entry).toEqual({ path, sha256, commit: 'c1', prior: null });
  });

  it('chains a second entry to the first, without rewriting the first line', () => {
    const a = artifact('a.json', '{"a":1}');
    const b = artifact('b.json', '{"b":2}');
    appendEntry(chainFile, { path: a.path, sha256: a.sha256, commit: 'c1' });
    const rawFirstLine = readFileSync(chainFile, 'utf8').split('\n')[0];
    const second = appendEntry(chainFile, { path: b.path, sha256: b.sha256, commit: 'c2' });
    expect(second.prior).toBe(createHash('sha256').update(rawFirstLine).digest('hex'));
    const entries = readChain(chainFile);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ path: a.path, sha256: a.sha256, commit: 'c1', prior: null });
  });

  it('keeps the first entry for a path when a second entry supersedes it', () => {
    const a1 = artifact('a.json', '{"a":1}');
    appendEntry(chainFile, { path: 'a.json', sha256: a1.sha256, commit: 'c1' });
    writeFileSync(join(dir, 'a.json'), '{"a":2}');
    const a2sha = hashFile(join(dir, 'a.json'));
    appendEntry(chainFile, { path: 'a.json', sha256: a2sha, commit: 'c2' });
    const entries = readChain(chainFile);
    expect(entries).toHaveLength(2);
    expect(entries[0].commit).toBe('c1');
    expect(latestEntry(chainFile, 'a.json')?.commit).toBe('c2');
  });
});

describe('verifyChain', () => {
  it('passes when every entry links and every file on disk matches its latest entry', () => {
    const a = artifact('a.json', '{"a":1}');
    appendEntry(chainFile, { path: a.path, sha256: a.sha256, commit: 'c1' });
    const result = verifyChain(chainFile, dir);
    expect(result).toEqual({ ok: true, brokenLinks: [], fileMismatches: [] });
  });

  it('fails, naming the path, when the file on disk changed after append', () => {
    const a = artifact('a.json', '{"a":1}');
    appendEntry(chainFile, { path: a.path, sha256: a.sha256, commit: 'c1' });
    writeFileSync(join(dir, 'a.json'), '{"a":999}');
    const result = verifyChain(chainFile, dir);
    expect(result.ok).toBe(false);
    expect(result.fileMismatches).toHaveLength(1);
    expect(result.fileMismatches[0].path).toBe('a.json');
  });

  it('fails when a path in the chain has no file on disk', () => {
    const a = artifact('a.json', '{"a":1}');
    appendEntry(chainFile, { path: a.path, sha256: a.sha256, commit: 'c1' });
    const missingRoot = mkdtempSync(join(tmpdir(), 'docs-readers-chain-empty-'));
    const result = verifyChain(chainFile, missingRoot);
    expect(result.ok).toBe(false);
    expect(result.fileMismatches[0].path).toBe('a.json');
  });

  it('fails on a broken link between two entries', () => {
    const a = artifact('a.json', '{"a":1}');
    const b = artifact('b.json', '{"b":2}');
    const line1 = JSON.stringify({ path: a.path, sha256: a.sha256, commit: 'c1', prior: null });
    const line2 = JSON.stringify({ path: b.path, sha256: b.sha256, commit: 'c2', prior: 'not-the-right-hash' });
    writeFileSync(chainFile, `${line1}\n${line2}\n`);
    const result = verifyChain(chainFile, dir);
    expect(result.ok).toBe(false);
    expect(result.brokenLinks).toHaveLength(1);
    expect(result.brokenLinks[0].line).toBe(2);
  });
});

describe('latestEntry', () => {
  it('returns undefined for a path never appended', () => {
    expect(latestEntry(chainFile, 'never.json')).toBeUndefined();
  });
});

describe('chainPrefixLength', () => {
  it('finds the line count a head taken after two of four entries identifies', () => {
    for (const name of ['a.json', 'b.json']) {
      const a = artifact(name, `{"n":"${name}"}`);
      appendEntry(chainFile, { path: a.path, sha256: a.sha256, commit: `c-${name}` });
    }
    const headAfterTwo = createHash('sha256').update(readFileSync(chainFile, 'utf8')).digest('hex');
    for (const name of ['c.json', 'd.json']) {
      const a = artifact(name, `{"n":"${name}"}`);
      appendEntry(chainFile, { path: a.path, sha256: a.sha256, commit: `c-${name}` });
    }
    expect(chainPrefixLength(chainFile, headAfterTwo)).toBe(2);
  });

  it('throws on a head that matches no prefix', () => {
    const a = artifact('a.json', '{"a":1}');
    appendEntry(chainFile, { path: a.path, sha256: a.sha256, commit: 'c1' });
    expect(() => chainPrefixLength(chainFile, 'deadbeef')).toThrow(/no chain prefix/);
  });
});

describe('the chain CLI', () => {
  it('appends, verifies, finds the latest entry, and finds a head prefix', async () => {
    const { main } = await import('../../../scripts/docs-readers/chain.js');
    const a = artifact('manifest.json', '{}');
    const writes: string[] = [];
    const original = process.stdout.write;
    process.stdout.write = ((text: string) => {
      writes.push(text);
      return true;
    }) as typeof process.stdout.write;
    try {
      expect(main(['append', '--chain', chainFile, '--path', a.path, '--commit', 'c1', '--sha256', a.sha256])).toBe(0);
      writes.length = 0;
      expect(main(['verify', '--chain', chainFile, '--root', dir])).toBe(0);
      const verifyOutput = JSON.parse(writes.join(''));
      expect(verifyOutput.ok).toBe(true);
      writes.length = 0;
      expect(main(['latest', '--chain', chainFile, '--path', a.path])).toBe(0);
      const latestOutput = JSON.parse(writes.join(''));
      expect(latestOutput.commit).toBe('c1');
      writes.length = 0;
      const head = createHash('sha256').update(readFileSync(chainFile, 'utf8')).digest('hex');
      expect(main(['prefix', '--chain', chainFile, '--head', head])).toBe(0);
      const prefixOutput = JSON.parse(writes.join(''));
      expect(prefixOutput.k).toBe(1);
    } finally {
      process.stdout.write = original;
    }
  });

  it('exits 1 on an unknown subcommand', async () => {
    const { main } = await import('../../../scripts/docs-readers/chain.js');
    expect(main(['bogus'])).toBe(1);
  });
});
