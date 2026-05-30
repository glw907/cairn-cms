import { env } from 'cloudflare:test';
import { it, expect } from 'vitest';

it('exposes a working AUTH_DB binding', async () => {
  const row = await env.AUTH_DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
  expect(row?.ok).toBe(1);
});

it('can create and read a table (proves migration-style DDL works)', async () => {
  await env.AUTH_DB.prepare('CREATE TABLE IF NOT EXISTS _probe (id INTEGER PRIMARY KEY, v TEXT)').run();
  await env.AUTH_DB.prepare('INSERT INTO _probe (v) VALUES (?)').bind('hello').run();
  const row = await env.AUTH_DB.prepare('SELECT v FROM _probe WHERE v = ?').bind('hello').first<{ v: string }>();
  expect(row?.v).toBe('hello');
});
