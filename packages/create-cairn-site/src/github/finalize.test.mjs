import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { finalizeGithubIdentity, TEMPLATE_GITHUB_APP_LITERAL } from './finalize.mjs';

const CONFIG_RELATIVE = 'src/theme/cairn.config.ts';

/**
 * Build a fixture scaffold directory carrying a `cairn.config.ts` with the given body around
 * the config's `backend:` line, mirroring the showcase's real file shape closely enough for
 * finalize's exact-string lookup.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {string} backendLine the literal text to place after `backend: `
 * @returns {Promise<string>} the fixture directory's absolute path
 */
async function fixtureScaffoldDir(t, backendLine) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-finalize-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'src/theme'), { recursive: true });
  await writeFile(
    path.join(dir, CONFIG_RELATIVE),
    `import { defineAdapter, githubApp } from '@glw907/cairn-cms';\n\n` +
      `export default defineAdapter({\n  backend: ${backendLine},\n});\n`,
  );
  return dir;
}

test('finalizeGithubIdentity writes the real owner, repo, appId, and installationId', async (t) => {
  const dir = await fixtureScaffoldDir(t, TEMPLATE_GITHUB_APP_LITERAL);

  await finalizeGithubIdentity(dir, {
    owner: 'alpine-club-owner',
    repo: 'alpine-club',
    appId: 12345,
    installationId: 67890,
  });

  const content = await readFile(path.join(dir, CONFIG_RELATIVE), 'utf8');
  assert.ok(
    content.includes(
      "githubApp({ owner: 'alpine-club-owner', repo: 'alpine-club', branch: 'main', appId: '12345', installationId: '67890' })",
    ),
  );
  assert.ok(!content.includes("owner: 'showcase'"));
});

test('finalizeGithubIdentity keeps every value single-quoted', async (t) => {
  const dir = await fixtureScaffoldDir(t, TEMPLATE_GITHUB_APP_LITERAL);

  await finalizeGithubIdentity(dir, {
    owner: 'alpine-club-owner',
    repo: 'alpine-club',
    appId: 12345,
    installationId: 67890,
  });

  const content = await readFile(path.join(dir, CONFIG_RELATIVE), 'utf8');
  const match = content.match(/githubApp\(\{[^}]+\}\)/);
  assert.ok(match, 'expected a githubApp({ ... }) call in the rewritten file');
  assert.ok(!match[0].includes('"'), `expected no double quotes in the rewritten call: ${match[0]}`);
  assert.match(match[0], /branch: 'main'/);
});

test('finalizeGithubIdentity is a no-op on a second call', async (t) => {
  const dir = await fixtureScaffoldDir(t, TEMPLATE_GITHUB_APP_LITERAL);
  const values = { owner: 'alpine-club-owner', repo: 'alpine-club', appId: 12345, installationId: 67890 };

  await finalizeGithubIdentity(dir, values);
  const firstPass = await readFile(path.join(dir, CONFIG_RELATIVE), 'utf8');

  await finalizeGithubIdentity(dir, values);
  const secondPass = await readFile(path.join(dir, CONFIG_RELATIVE), 'utf8');

  assert.equal(secondPass, firstPass);
});

test('finalizeGithubIdentity throws naming the file and the missing string when the template has drifted', async (t) => {
  const dir = await fixtureScaffoldDir(
    t,
    "githubApp({ owner: \"showcase\", repo: \"demo\", branch: \"main\", appId: \"1\", installationId: \"2\" })",
  );

  await assert.rejects(
    () =>
      finalizeGithubIdentity(dir, {
        owner: 'alpine-club-owner',
        repo: 'alpine-club',
        appId: 12345,
        installationId: 67890,
      }),
    (err) => {
      assert.match(err.message, /cairn\.config\.ts/);
      assert.ok(err.message.includes(TEMPLATE_GITHUB_APP_LITERAL), 'the error must name the missing literal');
      return true;
    },
  );
});
