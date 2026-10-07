import { describe, it, expect } from 'vitest';
import * as fake from '../helpers/cloudflare-workers-fake.js';
import * as aliased from 'cloudflare:workers';

const { env, withEnv, waitUntil, setFakeEnv, resetFakeEnv, flushWaitUntil, setFakeEnvThrowing } = fake;

describe('cloudflare:workers fake', () => {
  it('is what the cloudflare:workers specifier resolves to in this project', () => {
    expect(aliased.env).toBe(env);
    expect(aliased.withEnv).toBe(withEnv);
    expect(aliased.waitUntil).toBe(waitUntil);
  });

  it('reads the bindings setFakeEnv installed', () => {
    setFakeEnv({ A: 1, B: 'two' });
    expect(env.A).toBe(1);
    expect('B' in env).toBe(true);
    expect(Object.keys(env)).toEqual(['A', 'B']);
    expect(env.MISSING).toBeUndefined();
  });

  it('is empty again in the test after one that set bindings, because a setup file resets it', () => {
    expect(Object.keys(env)).toEqual([]);
  });

  describe('withEnv', () => {
    it('runs the callback against the swapped env and returns its result', () => {
      setFakeEnv({ A: 'outer' });
      const seen = withEnv({ A: 'inner' }, () => env.A);
      expect(seen).toBe('inner');
      expect(env.A).toBe('outer');
    });

    it('restores the outer env after a nested call', () => {
      setFakeEnv({ A: 'outer' });
      withEnv({ A: 'one' }, () => {
        withEnv({ A: 'two' }, () => {
          expect(env.A).toBe('two');
        });
        expect(env.A).toBe('one');
      });
      expect(env.A).toBe('outer');
    });

    it('restores the outer env after the callback throws, and rethrows', () => {
      setFakeEnv({ A: 'outer' });
      expect(() =>
        withEnv({ A: 'inner' }, () => {
          throw new Error('boom');
        }),
      ).toThrow('boom');
      expect(env.A).toBe('outer');
    });

    it('restores the outer env once an async callback settles, resolved or rejected', async () => {
      setFakeEnv({ A: 'outer' });
      const value = await withEnv({ A: 'inner' }, async () => {
        await Promise.resolve();
        return env.A;
      });
      expect(value).toBe('inner');
      expect(env.A).toBe('outer');
      await expect(
        withEnv({ A: 'inner' }, async () => {
          throw new Error('async boom');
        }),
      ).rejects.toThrow('async boom');
      expect(env.A).toBe('outer');
    });
  });

  describe('waitUntil and flushWaitUntil', () => {
    it('settles every collected promise, including one that rejects and one queued mid-flush', async () => {
      const settled: string[] = [];
      waitUntil(
        (async () => {
          await Promise.resolve();
          settled.push('a');
          waitUntil(Promise.resolve().then(() => settled.push('queued')));
        })(),
      );
      waitUntil(Promise.reject(new Error('ignored')));
      waitUntil(new Promise((resolve) => setTimeout(() => resolve(settled.push('slow')), 5)));
      expect(settled).toEqual([]);
      await flushWaitUntil();
      expect([...settled].sort()).toEqual(['a', 'queued', 'slow']);
    });

    it('a second flush has nothing left to settle', async () => {
      waitUntil(Promise.resolve());
      await flushWaitUntil();
      await expect(flushWaitUntil()).resolves.toBeUndefined();
    });
  });

  describe('setFakeEnvThrowing', () => {
    it('makes every env access and withEnv call throw until resetFakeEnv', () => {
      setFakeEnv({ A: 1 });
      setFakeEnvThrowing();
      expect(() => env.A).toThrow();
      expect(() => 'A' in env).toThrow();
      expect(() => Object.keys(env)).toThrow();
      expect(() => withEnv({ A: 2 }, () => 'ran')).toThrow();
      resetFakeEnv();
      expect(Object.keys(env)).toEqual([]);
      expect(withEnv({ A: 2 }, () => env.A)).toBe(2);
    });
  });

  it('resetFakeEnv clears bindings and forgets collected promises', async () => {
    setFakeEnv({ A: 1 });
    let slowRan = false;
    waitUntil(new Promise((resolve) => setTimeout(() => resolve((slowRan = true)), 20)));
    resetFakeEnv();
    expect(env.A).toBeUndefined();
    // The forgotten promise is not awaited, so the flush returns before it runs.
    await flushWaitUntil();
    expect(slowRan).toBe(false);
  });
});
