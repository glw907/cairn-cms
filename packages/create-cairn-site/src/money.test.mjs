import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { costPreamble, printCostPreamble } from './money.mjs';
import { saveSite } from './state.mjs';

const execFileAsync = promisify(execFile);
const MONEY_SOURCE_PATH = fileURLToPath(new URL('./money.mjs', import.meta.url));
const BIN_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin.mjs');

// --- costPreamble: the copy itself -------------------------------------------------------------

test('costPreamble names the $5 monthly figure, billed per account', () => {
  const text = costPreamble();
  assert.ok(text.includes('$5'), `expected the $5 figure, got: ${text}`);
  assert.ok(text.includes('per account'), `expected "per account", got: ${text}`);
});

test('costPreamble names the $10 to $15 a year domain range', () => {
  const text = costPreamble();
  assert.ok(text.includes('$10 to $15'), `expected the $10 to $15 range, got: ${text}`);
});

test('costPreamble dates every figure "as of 2026-08-11" and links a source', () => {
  const text = costPreamble();
  const dateOccurrences = text.split('as of 2026-08-11').length - 1;
  assert.ok(dateOccurrences >= 2, `expected the date beside both dollar figures, got: ${text}`);
  assert.ok(text.includes('https://'), `expected at least one link, got: ${text}`);
});

test('costPreamble names all four things: free to build, the domain cost, the plan cost, and the all-in total', () => {
  const text = costPreamble();
  assert.ok(text.toLowerCase().includes('free'), `expected the free claim, got: ${text}`);
  assert.ok(text.includes('domain'), `expected the domain cost, got: ${text}`);
  assert.ok(text.includes('Workers Paid'), `expected the Workers Paid plan named, got: ${text}`);
  assert.ok(text.includes('$6'), `expected the all-in total, got: ${text}`);
});

test('costPreamble hedges the total with the certificate line item nobody has confirmed', () => {
  const text = costPreamble();
  // The T4b research (docs/internal/record/2026-08-11-t4b-email-console-cost-research.md) left one
  // number open: whether the certificate a Workers custom domain issues bills as an add-on. It said
  // of this exact figure that it would not put an inference in owner-facing money copy, so the
  // total may not stand here as if the question were closed.
  assert.ok(text.includes('certificate'), `expected the certificate line item named, got: ${text}`);
  assert.ok(text.includes('not confirmed'), `expected the item marked unconfirmed, got: ${text}`);
  assert.ok(text.includes('bill'), `expected the owner told where it would appear, got: ${text}`);
});

test('costPreamble never promises a new account 3,000 messages in month one', () => {
  const text = costPreamble();
  assert.equal(text.includes('3,000'), false, `expected no "3,000" figure, got: ${text}`);
});

test('costPreamble never presents the free verified-destination path as an option', () => {
  const text = costPreamble();
  for (const phrase of ['verified destination', 'verification link', 'Email Routing', 'routing']) {
    assert.equal(
      text.toLowerCase().includes(phrase.toLowerCase()),
      false,
      `expected no verified-destination language ("${phrase}"), got: ${text}`,
    );
  }
});

test('costPreamble never contains an em dash', () => {
  assert.equal(costPreamble().includes('—'), false);
});

// --- The module source itself: banned strings must not hide in a comment ------------------------

test('money.mjs never mentions "3,000" or verified-destination language anywhere, including comments', async () => {
  const source = await readFile(MONEY_SOURCE_PATH, 'utf8');
  assert.equal(source.includes('3,000'), false, 'the source must never mention 3,000, not even in a comment');
  for (const phrase of ['verified destination', 'verification link', 'Email Routing']) {
    assert.equal(
      source.toLowerCase().includes(phrase.toLowerCase()),
      false,
      `the source must never mention "${phrase}", not even in a comment`,
    );
  }
});

test('money.mjs prompts nothing: it never imports the prompt library', async () => {
  const source = await readFile(MONEY_SOURCE_PATH, 'utf8');
  assert.equal(source.includes('@clack/prompts'), false, 'the preamble must not import a prompt seam');
});

// --- printCostPreamble: the print gate -----------------------------------------------------------

test('printCostPreamble prints the preamble on a fresh run', () => {
  const lines = [];
  printCostPreamble({ log: (line) => lines.push(line), isFreshRun: true });
  assert.deepEqual(lines, [costPreamble()]);
});

test('printCostPreamble prints nothing on a resume', () => {
  const lines = [];
  printCostPreamble({ log: (line) => lines.push(line), isFreshRun: false });
  assert.deepEqual(lines, []);
});

// --- bin.mjs: the preamble prints ahead of the site-name prompt, and only on a fresh run --------

/**
 * Point CAIRN_STATE_DIR at a fresh temporary directory for the duration of one test, mirroring
 * resume-chapter2.test.mjs's own helper.
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>} the state directory's absolute path
 */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-money-preamble-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
    return rm(dir, { recursive: true, force: true });
  });
  return dir;
}

/**
 * Run create-cairn-site as a real child process. `input: ''` closes stdin immediately, so a
 * regression that reaches a real interactive prompt fails fast instead of hanging the suite.
 * @param {string[]} args the CLI arguments
 * @param {{ stateDir: string }} options the env seam to set
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>} the run's outcome
 */
async function runCli(args, { stateDir }) {
  const env = { ...process.env, CAIRN_STATE_DIR: stateDir };
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [BIN_PATH, ...args], {
      env,
      input: '',
      timeout: 60000,
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

// A whole-chapter dry run touches no network and shells out to nothing (the plan's own
// --dry-run constraint), so it is the only fresh-run path this file can drive without a fake
// GitHub or Cloudflare server.
test('bin.mjs prints the cost preamble before the site-name prompt on a fresh dry run', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-money-preamble-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const result = await runCli(
    ['--dry-run', '--yes', '--dir', path.join(dir, 'site'), '--name', 'Money Preamble Test'],
    { stateDir },
  );

  assert.equal(result.code, 0, `expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
  const preambleIndex = result.stdout.indexOf('Before you start, the honest cost picture.');
  // Two leading spaces distinguish clack's own intro banner ("<box char>  create-cairn-site",
  // collectAnswers's first line) from the preflight finding that also names the tool
  // ("...that create-cairn-site requires."), which is preceded by a single space.
  const promptIndex = result.stdout.indexOf('  create-cairn-site');
  assert.ok(preambleIndex >= 0, `expected the preamble to print, got: ${result.stdout}`);
  assert.ok(promptIndex >= 0, `expected the name-prompt banner to print, got: ${result.stdout}`);
  assert.ok(
    preambleIndex < promptIndex,
    `expected the preamble before the name prompt, got preamble at ${preambleIndex} and prompt at ${promptIndex}`,
  );
});

test('bin.mjs does not print the cost preamble on a resume', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-money-preamble-resume-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  // `email-live` (chapter 2's real finish line, since T4b) rather than `domain-live`: the latter
  // is no longer a stopping point for bin.mjs's dispatcher (it now continues straight into
  // chapter 2's own admission prompt, which needs a `confirm` seam this file has none of), while
  // `email-live` still returns immediately with no prompt, which is what this test needs to
  // observe a resume's stdout without hanging.
  await saveSite('money-preamble-resume-emlive', {
    name: 'Money Preamble Resume Site',
    dir,
    step: 'email-live',
    ownerEmail: 'owner@example.com',
    github: {
      appId: 1,
      appSlug: 'cairn-money-preamble-resume',
      repo: { owner: 'money-preamble-owner', repo: 'money-preamble-site' },
      installationId: 1,
    },
    cloudflare: {
      url: 'https://money-preamble-site.glw907.workers.dev',
      workerName: 'money-preamble-site',
      accountId: 'acct-1',
      domain: 'money-preamble-test.example',
      emailFrom: 'no-reply@money-preamble-test.example',
    },
  });

  const result = await runCli(['--dir', dir], { stateDir });

  assert.equal(result.code, 0, `expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
  assert.equal(
    result.stdout.includes('Before you start, the honest cost picture.'),
    false,
    `expected no cost preamble on a resume, got: ${result.stdout}`,
  );
});
