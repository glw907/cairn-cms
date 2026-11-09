import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (rel) => JSON.parse(readFileSync(path.join(root, rel), 'utf8'));

test('every flag the setup skill names is one the Go tool has', () => {
  const skill = readFileSync(
    path.join(root, 'plugins/cairn/skills/cairn-setting-up-a-site/SKILL.md'),
    'utf8',
  );
  const known = new Set(readJson('tool/testdata/flags.json').flags);
  const named = new Set(skill.match(/--[a-z][a-z-]*/g) ?? []);
  assert.ok(named.size > 0, 'the skill names no flag, so the check proves nothing');
  for (const flag of named) {
    assert.ok(known.has(flag), `SKILL.md names ${flag}, which tool/testdata/flags.json lacks`);
  }
});

test('the site declares exactly the vendor marketplaces, their plugins, and the Svelte server', () => {
  const settings = readJson('scripts/build/setup-overlay/.claude/settings.json');
  const sources = Object.fromEntries(
    Object.entries(settings.extraKnownMarketplaces).map(([name, m]) => [name, m.source.repo]),
  );
  assert.deepEqual(sources, {
    svelte: 'sveltejs/ai-tools',
    cloudflare: 'cloudflare/skills',
    daisyui: 'saadeghi/daisyui',
  });
  assert.deepEqual(Object.keys(settings.enabledPlugins).sort(), [
    'cloudflare@cloudflare',
    'daisyui@daisyui',
    'svelte@svelte',
  ]);
  const mcp = readJson('scripts/build/setup-overlay/.mcp.json');
  assert.deepEqual(Object.keys(mcp.mcpServers), ['svelte']);
});

test('the cairn marketplace lists the one plugin that its manifest names', () => {
  const marketplace = readJson('.claude-plugin/marketplace.json');
  assert.equal(marketplace.name, 'cairn');
  assert.deepEqual(
    marketplace.plugins.map((p) => p.name),
    ['cairn'],
  );
  const plugin = readJson('plugins/cairn/.claude-plugin/plugin.json');
  assert.equal(plugin.name, 'cairn');
  assert.equal(marketplace.plugins[0].source, './plugins/cairn');
});
