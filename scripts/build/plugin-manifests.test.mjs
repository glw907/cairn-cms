import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (rel) => JSON.parse(readFileSync(path.join(root, rel), 'utf8'));

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

test('the root readme opens with the agent setup section', () => {
  const firstH2 = readFileSync(path.join(root, 'README.md'), 'utf8')
    .split('\n')
    .find((line) => line.startsWith('## '));
  assert.equal(firstH2, '## Setting up with an agent', 'README.md opens with the wrong section');
});
