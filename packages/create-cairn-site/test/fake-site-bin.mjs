// A fake executable standing in for BOTH npm and wrangler in a test that asserts call order
// against the site's origin on disk. Every call appends one line to a shared log carrying the
// command and the `publicOrigin` literal the scaffold's `src/theme/cairn.config.ts` held at that
// moment, so a test can tell which origin a `run build` saw. Create a file named `fail-build`
// beside the script to make `run build` exit 1.
//
// It answers just enough for the Cloudflare chapter's happy path: a signed-in `whoami`, one
// account, a deploy URL, and a successful seed. `makeFakeBin` cannot read the scaffold, which is
// why this exists beside it.
import { mkdtemp, writeFile, readFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
let origin = 'none';
try {
  const config = readFileSync(join(process.cwd(), 'src/theme/cairn.config.ts'), 'utf8');
  origin = /publicOrigin\\s*=\\s*'([^']*)'/.exec(config)?.[1] ?? 'none';
} catch {}
appendFileSync(join(here, 'order.log'), argv.join(' ') + ' | ' + origin + '\\n');

const joined = argv.join(' ');
if (joined === 'whoami --json') {
  process.stdout.write(JSON.stringify({ loggedIn: true, accounts: [{ id: 'acct-1', name: 'Test' }] }));
} else if (argv[0] === 'whoami') {
  process.stdout.write('You are logged in with an API Token\\n');
} else if (argv[0] === 'deploy') {
  process.stdout.write('Deployed thing triggers (0.1 sec)\\n  https://alpine-club.glw907.workers.dev\\n');
} else if (joined.startsWith('d1 execute')) {
  process.stdout.write(JSON.stringify([
    { results: [], success: true, meta: { changes: 1 } },
    { results: [], success: true, meta: { changes: 0 } },
    { results: [], success: true, meta: { changes: 1 } },
  ]));
} else if (joined === 'run build' && existsSync(join(here, 'fail-build'))) {
  process.stderr.write('ERROR: build exploded\\n');
  process.exitCode = 1;
}
`;

/**
 * Build the fake under a fresh temp directory.
 * @returns {Promise<{ binPath: string,
 *  lines: () => Promise<string[]>, failBuild: () => Promise<void>, close: () => Promise<void> }>}
 *  `lines` is the call log in arrival order, each `"<argv> | <publicOrigin>"`; `failBuild` makes
 *  every later `run build` exit 1
 */
export async function makeSiteBin() {
  const dir = await mkdtemp(join(tmpdir(), 'cairn-fake-site-bin-'));
  const binPath = join(dir, 'site-bin.mjs');
  await writeFile(binPath, SCRIPT, 'utf8');
  await chmod(binPath, 0o755);
  return {
    binPath,
    async lines() {
      try {
        return (await readFile(join(dir, 'order.log'), 'utf8')).split('\n').filter(Boolean);
      } catch {
        return [];
      }
    },
    async failBuild() {
      await writeFile(join(dir, 'fail-build'), '');
    },
    close: () => rm(dir, { recursive: true, force: true }),
  };
}
