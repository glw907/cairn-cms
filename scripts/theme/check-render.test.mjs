// The `render` rule on the options fixture with a one-page list. A page that fails to render, or
// logs an error, fails exactly this rule and no other.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { copyOptionsFixture } from './viewer/fixture.mjs';
import { checkTheme } from './check.mjs';
import { writeFileSync } from 'node:fs';

const scratch = [];
after(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** A fresh copy of the options fixture. */
function copy() {
  const fixture = copyOptionsFixture();
  scratch.push(fixture.root);
  return fixture.dir;
}

/** The ids of the rules a full run (every rule, one page) failed. */
async function failedRules(dir) {
  const result = await checkTheme(dir, { pages: ['/'] });
  return [...new Set(result.failures.map((failure) => failure.rule))];
}

test('the unbroken fixture passes every rule, render included', { timeout: 600_000 }, async () => {
  const result = await checkTheme(copy(), { pages: ['/'] });
  assert.deepEqual(result.failures, []);
  assert.ok(result.rules.includes('render'));
});

test('a component that throws during server rendering fails exactly render', { timeout: 600_000 }, async () => {
  const dir = copy();
  writeFileSync(path.join(dir, 'components/SiteFooter.svelte'), '<script lang="ts">\n  throw new Error("footer exploded");\n</script>\n');
  assert.deepEqual(await failedRules(dir), ['render']);
});

test('a component that logs a console error on mount fails exactly render', { timeout: 600_000 }, async () => {
  const dir = copy();
  writeFileSync(
    path.join(dir, 'components/SiteFooter.svelte'),
    '<script lang="ts">\n  import { onMount } from "svelte";\n  onMount(() => console.error("footer logged"));\n</script>\n<footer></footer>\n',
  );
  assert.deepEqual(await failedRules(dir), ['render']);
});
