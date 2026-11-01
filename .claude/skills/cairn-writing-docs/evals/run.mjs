#!/usr/bin/env node
// cairn-cms: the docs-process eval runner. It runs the cases in `evals.json` against one or two
// refs (arms) and prints a markdown table of pass rates. Each trial is one headless `claude -p`
// session in its own fixture worktree: the pinned commit, the arm's docs-process files laid over
// it, then the case's setup, committed as the fixture base so the graders diff from it.
//
// Usage and flags: README.md. A suite run takes far longer than ten minutes, so start it as a
// background command and wait for it to exit.
//
// Sessions run on the subscription: ANTHROPIC_API_KEY is removed from their environment, and the
// run aborts on the first `init` event whose `apiKeySource` is not `none`.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  appendFileSync, createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, rmdirSync,
  writeFileSync, statSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { rm } from 'node:fs/promises';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSiteBase, copySite, readStripList } from './site-fixture.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVALS_DIR_REL = '.claude/skills/cairn-writing-docs/evals/';
const DEFAULT_TRIALS = 3;
const SESSION_CAP = 120;
const CONCURRENCY = 4;
const SESSION_TIMEOUT_MS = 40 * 60 * 1000;
const STATE_ROOT = join(homedir(), '.local/state/cairn-docs-evals');
/** Built site fixtures, on the fixtures' device so a trial can hard-link `node_modules` from them. */
const SITE_CACHE = join(homedir(), '.cache/cairn-docs-evals/sites');
/** Outside every repository, so no session walks up into a checkout's `CLAUDE.md` or `.claude/`. */
const FIXTURE_ROOT = join(homedir(), '.cache/cairn-docs-evals/fixtures');

/** The tools a docs session gets; the `:*` form is avoided because `check:*` would deny `check:docs-gate`. */
export const ALLOWED_TOOLS = [
  'Read', 'Grep', 'Glob', 'Edit', 'Write', 'Skill', 'Agent',
  'Bash(npm run check*)', 'Bash(node scripts/checks/*)', 'Bash(cairn-run-gate *)',
  'Bash(git -C * diff *)', 'Bash(git -C * grep *)', 'Bash(git -C * show *)',
  'Bash(git diff*)', 'Bash(git status*)', 'Bash(git log*)', 'Bash(git add *)', 'Bash(git commit *)',
  'Bash(jq *)', 'Bash(mkdir *)',
  // The read-only filters a compound command pipes through; a real session's allow rules carry them.
  'Bash(tail *)', 'Bash(head *)', 'Bash(echo *)', 'Bash(sed -n *)', 'Bash(wc *)', 'Bash(cat *)',
  'Bash(ls*)', 'Bash(grep *)', 'Bash(sort*)', 'Bash(uniq*)', 'Bash(cut *)', 'Bash(tr *)',
  'Bash(diff *)', 'Bash(printf *)', 'Bash(git ls-files*)', 'Bash(git rev-parse*)',
  'Bash(git -C * log *)', 'Bash(git -C * status*)', 'Bash(git grep*)', 'Bash(git show*)',
  'Bash(git branch*)',
];

/** What a site or tree fixture adds: it builds, tests, and runs the site, which a docs fixture never does. */
export const BUILD_TOOLS = ['Bash(npm *)', 'Bash(npx *)', 'Bash(node *)', 'Bash(make *)', 'Bash(go *)', 'Bash(cd *)'];

/** Denies win over the user's allow rules in `~/.claude/settings.json`. */
export const DENIED_TOOLS = [
  'Bash(approval-queue *)', 'Bash(gh *)', 'Bash(git push*)', 'Bash(git -C * push*)', 'Bash(ssh *)', 'WebFetch', 'WebSearch',
];

/**
 * Where a denied command is a fault: the gate and check commands the docs process runs. A denied
 * git read or shell filter is friction the session works around, as it would in a real session.
 */
const NEEDED_COMMAND = /^\s*(npm run check|node scripts\/checks\/|cairn-run-gate )/;
/** On a site or tree fixture every build command is needed, so a denied one is a fault too. */
const NEEDED_BUILD_COMMAND = /^\s*(npm|npx|node|make|go|cd)\s/;

/** The fixture kinds: a pinned commit with the arm's overlay, an emitted site, or the arm's whole tree. */
const FIXTURES = ['pin', 'site', 'tree'];

// ---------------------------------------------------------------------------------------------
// Arguments and the cases file

/**
 * Parse the CLI: one or two refs and the flags.
 * @param {string[]} argv
 * @returns {{ refs: string[], suite: string, caseId: string | null, trials: number, max: boolean, keep: boolean }}
 */
export function parseArgs(argv) {
  const out = {
    refs: [], suite: 'all', caseId: null, trials: DEFAULT_TRIALS, max: false, keep: false, control: false,
    fixture: null, strip: null, treePluginDir: null, pluginDir: null, concurrency: CONCURRENCY,
    baselineFirst: false, reuseBaseline: null, resume: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--suite') out.suite = argv[++i];
    else if (a === '--case') out.caseId = argv[++i];
    else if (a === '--trials') out.trials = Number(argv[++i]);
    else if (a === '--max') out.max = true;
    else if (a === '--keep') out.keep = true;
    else if (a === '--control') out.control = true;
    else if (a === '--fixture') out.fixture = argv[++i];
    else if (a === '--strip') out.strip = argv[++i];
    else if (a === '--tree-plugin-dir') out.treePluginDir = argv[++i];
    else if (a === '--plugin-dir') out.pluginDir = argv[++i];
    else if (a === '--concurrency') out.concurrency = Number(argv[++i]);
    else if (a === '--baseline-first') out.baselineFirst = true;
    else if (a === '--reuse-baseline') out.reuseBaseline = argv[++i];
    else if (a === '--resume') out.resume = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown flag ${a}`);
    else out.refs.push(a);
  }
  if (out.refs.length < 1 || out.refs.length > 2) throw new Error('give one or two refs');
  if (out.control && out.refs.length !== 2) throw new Error('--control takes two refs: the first is the control arm');
  if ((out.baselineFirst || out.reuseBaseline) && out.refs.length !== 2) throw new Error('--baseline-first and --reuse-baseline take two refs: the first is the baseline');
  if (!['regression', 'capability', 'site', 'all'].includes(out.suite)) throw new Error(`bad --suite ${out.suite}`);
  if (out.fixture !== null && !FIXTURES.includes(out.fixture)) throw new Error(`bad --fixture ${out.fixture}`);
  if (!Number.isInteger(out.trials) || out.trials < 1) throw new Error('--trials takes a positive integer');
  if (!Number.isInteger(out.concurrency) || out.concurrency < 1) throw new Error('--concurrency takes a positive integer');
  return out;
}

const CHECK_TYPES = new Set([
  'contains', 'absent', 'changed', 'unchanged', 'noNewFiles', 'bash', 'agent', 'read', 'skillNotCalled',
  'npm', 'verdicts',
]);

/**
 * Report every way a parsed `evals.json` breaks the case schema.
 * @param {any} data
 * @returns {string[]}
 */
export function validateEvals(data) {
  const problems = [];
  if (!data || typeof data.skill_name !== 'string') problems.push('skill_name is missing');
  if (!Array.isArray(data?.evals)) return [...problems, 'evals is not an array'];
  const seen = new Set();
  for (const c of data.evals) {
    const id = c?.id ?? '(no id)';
    if (typeof c.id !== 'string' || seen.has(c.id)) problems.push(`${id}: id missing or repeated`);
    seen.add(c.id);
    if (typeof c.prompt !== 'string' || !c.prompt) problems.push(`${id}: prompt missing`);
    if (!Array.isArray(c.expectations) || c.expectations.length === 0) problems.push(`${id}: expectations missing`);
    if (!['regression', 'capability', 'site'].includes(c.suite)) problems.push(`${id}: suite must be regression, capability, or site`);
    if (c.fixture !== undefined && !FIXTURES.includes(c.fixture)) problems.push(`${id}: fixture must be one of ${FIXTURES.join(', ')}`);
    // A site or tree case takes its tree from the arm's ref, so only a pin fixture names a commit.
    if ((c.fixture ?? 'pin') === 'pin' && (typeof c.pin !== 'string' || !/^[0-9a-f]{7,40}$/.test(c.pin))) problems.push(`${id}: pin must be a commit sha`);
    if (c.bar !== undefined && ![4, 5].includes(c.bar)) problems.push(`${id}: bar must be 4 or 5`);
    if (c.setup !== undefined && (typeof c.setup !== 'string' || !existsSync(join(HERE, c.setup)))) {
      problems.push(`${id}: setup file ${c.setup} is missing`);
    }
    if (!Array.isArray(c.checks) || c.checks.length === 0) problems.push(`${id}: checks missing`);
    for (const k of c.checks ?? []) {
      if (!CHECK_TYPES.has(k.type)) problems.push(`${id}: unknown check type ${k.type}`);
    }
    if (c.maxTurns !== undefined && !(Number.isInteger(c.maxTurns) && c.maxTurns > 0)) problems.push(`${id}: maxTurns must be a positive integer`);
    if (c.judge !== undefined && !(Array.isArray(c.judge) && c.judge.every((j) => typeof j.n === 'number' && typeof j.text === 'string'))) {
      problems.push(`${id}: judge must be a list of {n, text}`);
    }
  }
  return problems;
}

/**
 * Fill a prompt template's `{repo}`, `{base}`, and `{commit}` placeholders.
 * @param {string} template
 * @param {Record<string, string>} vars
 */
export function renderPrompt(template, vars) {
  return template.replace(/\{(repo|base|commit)\}/g, (_, k) => vars[k]);
}

/**
 * The `claude -p` arguments for one case. A case that names an agent runs as that agent and keeps
 * the agent's own model, as in real use.
 * @param {{ readOnly?: boolean, agent?: string, maxTurns?: number, fixture?: string }} c
 * @param {{ pluginDirs?: string[] }} [opts] plugin directories the session loads
 */
export function claudeArgs(c, opts = {}) {
  const denied = [...DENIED_TOOLS, ...(c.readOnly ? ['Edit', 'Write', 'NotebookEdit'] : [])];
  const built = c.fixture === 'site' || c.fixture === 'tree';
  const args = ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits'];
  if (c.maxTurns) args.push('--max-turns', String(c.maxTurns));
  if (c.agent) args.push('--agent', c.agent);
  else args.push('--model', 'sonnet', '--effort', 'medium');
  // A built fixture loads only the project's own settings, so no user skill or plugin reaches it.
  if (built) args.push('--setting-sources', 'project');
  for (const dir of opts.pluginDirs ?? []) args.push('--plugin-dir', dir);
  // The variadic tool flags would swallow a trailing prompt, so the prompt goes in on stdin.
  args.push('--allowedTools', [...ALLOWED_TOOLS, ...(built ? BUILD_TOOLS : [])].join(','), '--disallowedTools', denied.join(','));
  return args;
}

// ---------------------------------------------------------------------------------------------
// The overlay

const OVERLAY_DIR = '.claude/skills/cairn-writing-docs/';
/** The skill's folder before pass 3 renamed it, so a fixture at an older pin loses it before an arm's overlay lands. */
const LEGACY_OVERLAY_DIR = '.claude/skills/cairn-docs/';
const OVERLAY_FILES = ['.claude/agents/docs-fact-checker.md', 'CLAUDE.md'];
const OVERLAY_RULE = /^\.claude\/rules\/docs[^/]*\.md$/;

/**
 * The docs-process paths in a tree listing, leaving the skill's `evals/` out.
 * @param {string[]} names repo-relative file paths
 */
export function overlayPaths(names) {
  return names.filter((n) => {
    if (n.startsWith(EVALS_DIR_REL) || n.startsWith(`${LEGACY_OVERLAY_DIR}evals/`)) return false;
    return n.startsWith(OVERLAY_DIR) || n.startsWith(LEGACY_OVERLAY_DIR) || OVERLAY_FILES.includes(n) || OVERLAY_RULE.test(n);
  });
}

/** The overlay paths present in a fixture. The overlay lives only under `.claude/` and at `CLAUDE.md`. */
function overlayFilesIn(root) {
  const names = filesUnder(root, '.claude');
  if (existsSync(join(root, 'CLAUDE.md'))) names.push('CLAUDE.md');
  return overlayPaths(names);
}

/** Delete files and any directory that empties, stopping at the first one that still holds something. */
function removeFiles(root, paths) {
  for (const p of paths) {
    rmSync(join(root, p), { force: true });
    for (let d = dirname(p); d !== '.'; d = dirname(d)) {
      try { rmdirSync(join(root, d)); } catch { break; }
    }
  }
}

/**
 * Delete the skill's files from a fixture, leaving `evals/`, so the arm runs without `cairn-writing-docs`.
 * `.claude/skills/` stays even when empty: a session in a linked worktree with no such directory
 * loads the main checkout's skills instead, and the control arm would see `cairn-writing-docs`.
 * @param {string} root
 */
export function deleteSkill(root) {
  removeFiles(root, overlayFilesIn(root).filter((p) => p.startsWith(OVERLAY_DIR) || p.startsWith(LEGACY_OVERLAY_DIR)));
  mkdirSync(join(root, '.claude/skills'), { recursive: true });
}

/**
 * The paths from `start` up to `/` that would load into a session as project instructions: any
 * `CLAUDE.md` or `.claude/`, except the user scope at `home/.claude`, which loads in both arms.
 * @param {string} start
 * @param {string} home
 * @returns {string[]}
 */
export function ancestorConflicts(start, home) {
  const found = [];
  let dir = resolve(start);
  for (;;) {
    for (const name of ['CLAUDE.md', '.claude']) {
      const path = join(dir, name);
      if (existsSync(path) && path !== join(home, '.claude')) found.push(path);
    }
    const up = dirname(dir);
    if (up === dir) return found;
    dir = up;
  }
}

/**
 * Delete the overlay paths from a fixture: the skill's files except `evals/`, the agent, the docs
 * rules, and CLAUDE.md.
 * @param {string} root
 */
export function deleteOverlay(root) {
  removeFiles(root, overlayFilesIn(root));
}

function git(args, cwd, opts = {}) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

/**
 * Run a command to completion without blocking the event loop. A failure rejects with the
 * command's stderr in the message.
 * @returns {Promise<Buffer>} stdout
 */
function exec(command, args, { cwd, input } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    const out = [];
    const err = [];
    child.stdout.on('data', (d) => out.push(d));
    child.stderr.on('data', (d) => err.push(d));
    child.on('error', (e) => rejectRun(new Error(`${command} ${args[0] ?? ''}: ${e.message}`)));
    child.on('close', (status) => {
      if (status === 0) resolveRun(Buffer.concat(out));
      else rejectRun(new Error(`${command} ${args.join(' ').slice(0, 200)} exited ${status}: ${Buffer.concat(err).toString().trim()}`));
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

async function gitAsync(args, cwd) {
  return (await exec('git', args, { cwd })).toString();
}

/**
 * Extract the overlay paths of `ref` into a fixture, leaving `evals/` out.
 * @param {string} repo
 * @param {string} ref
 * @param {string} root
 * @returns {Promise<string[]>}
 */
export async function extractOverlay(repo, ref, root) {
  const names = (await gitAsync(['ls-tree', '-r', '--name-only', ref], repo)).split('\n').filter(Boolean);
  const paths = overlayPaths(names);
  if (paths.length === 0) return [];
  const tar = await exec('git', ['archive', '--format=tar', ref, '--', ...paths], { cwd: repo });
  await exec('tar', ['-x', '-C', root], { input: tar });
  return paths;
}

/**
 * A short hash of the arm's overlay set (each path and its blob), recorded in the results.
 * @param {string} repo
 * @param {string} ref
 */
export function overlayHash(repo, ref) {
  const lines = git(['ls-tree', '-r', ref], repo).split('\n').filter(Boolean)
    .filter((l) => overlayPaths([l.split('\t')[1]]).length === 1);
  return createHash('sha256').update(lines.sort().join('\n')).digest('hex').slice(0, 12);
}

// ---------------------------------------------------------------------------------------------
// Reading a session's stream

/**
 * Reduce a stream-json transcript to what the graders read.
 * @param {string} text newline-delimited JSON events
 */
export function summarizeStream(text) {
  const events = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* a truncated final line */ }
  }
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init') ?? null;
  const result = [...events].reverse().find((e) => e.type === 'result') ?? null;
  const tools = [];
  const byId = new Map();
  let lastText = '';
  for (const e of events) {
    for (const part of e.message?.content ?? []) {
      if (e.type === 'assistant' && part.type === 'tool_use') {
        const call = { id: part.id, name: part.name === 'Task' ? 'Agent' : part.name, input: part.input ?? {}, sub: Boolean(e.parent_tool_use_id), output: '' };
        tools.push(call);
        byId.set(part.id, call);
      }
      if (e.type === 'assistant' && part.type === 'text' && !e.parent_tool_use_id) lastText = part.text;
      if (e.type === 'user' && part.type === 'tool_result' && byId.has(part.tool_use_id)) {
        const c = part.content;
        byId.get(part.tool_use_id).output = typeof c === 'string' ? c : (c ?? []).map((x) => x.text ?? '').join('');
      }
    }
  }
  const u = result?.usage;
  return {
    init: init && { apiKeySource: init.apiKeySource, skills: init.skills ?? [], cwd: init.cwd, plugins: (init.plugins ?? []).map((p) => p.name) },
    result: result && {
      isError: Boolean(result.is_error), subtype: result.subtype,
      denials: result.permission_denials ?? [], reply: result.result ?? lastText,
      durationMs: result.duration_ms ?? null,
      usage: u ? { input: u.input_tokens ?? 0, cacheCreation: u.cache_creation_input_tokens ?? 0, output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0 } : null,
    },
    tools,
    reply: result?.result ?? lastText,
  };
}

/**
 * Whether a session ended in an error the standing answers exclude from the rates.
 * @param {ReturnType<typeof summarizeStream>} s
 */
export function sessionErrored(s) {
  if (!s.result) return true;
  // Claude Code 2.1.310 marks an error_max_turns result is_error, but a turn cap is a graded outcome.
  if (s.result.subtype === 'error_max_turns') return false;
  return s.result.isError || s.result.subtype !== 'success';
}

/**
 * Why a control arm's session is a harness fault: the skill was listed at init, or a call to it
 * did not fail as an unknown skill. A call with no result was cut off, so it counts as neither.
 * Null when the arm is truly without the skill.
 * @param {ReturnType<typeof summarizeStream>} s
 * @param {string[]} [names] the skill names the control must lack
 * @returns {string | null}
 */
export function controlFault(s, names = ['cairn-writing-docs']) {
  const listed = names.find((n) => s.init?.skills.includes(n));
  if (listed) return `the control arm lists ${listed} in its session skills`;
  const leaked = s.tools.find((t) => t.name === 'Skill' && names.some((n) => (t.input.skill ?? '').includes(n)) && t.output && !/Unknown skill/.test(t.output));
  return leaked ? `the control arm launched ${leaked.input.skill}: ${leaked.output.replace(/\s+/g, ' ').slice(0, 120)}` : null;
}

/**
 * What a finished session's stream says before any grading: null when it is gradable, otherwise
 * the `{ status, detail }` of the error or fault. A control leak is read before an error, so a
 * control session that errored after launching the skill still shows the leak (#93).
 * @param {{ s: ReturnType<typeof summarizeStream>, control: boolean, skills: string[], timedOut: boolean, code?: number | null, signal?: string | null, plugins?: { standards?: number } }} a
 * @returns {{ status: string, detail: string } | null}
 */
export function sessionVerdict({ s, control, skills, timedOut, code = null, signal = null, plugins }) {
  if (control) {
    const leak = controlFault(s, skills);
    if (leak) return { status: 'fault', detail: leak };
  }
  if (timedOut || sessionErrored(s)) return { status: 'error', detail: timedOut ? 'timed out' : `${s.result?.subtype ?? 'no result'} (exit ${code}, signal ${signal})` };
  if (!control && skills.length && !skills.some((n) => s.init?.skills.includes(n))) {
    return { status: 'fault', detail: `none of ${skills.join(', ')} is among the session skills` };
  }
  if (plugins?.standards !== undefined) {
    const n = (s.init?.plugins ?? []).filter((p) => p === 'standards').length;
    if (n !== plugins.standards) return { status: 'fault', detail: `${n} standards plugin(s) loaded, expected ${plugins.standards}` };
  }
  return null;
}

/**
 * The record for a trial that threw, keeping the end-of-session record the trial had written
 * before the throw (#92).
 * @param {{ caseDef: { id: string }, arm: { label: string }, trial: number }} job
 * @param {Error & { record?: { end?: object, transcript?: string } }} e
 */
export function faultRecord(job, e) {
  return {
    caseId: job.caseDef.id, arm: job.arm.label, trial: job.trial, status: 'fault', detail: `runner: ${e.message}`,
    transcript: e.record?.transcript ?? '', end: e.record?.end, checks: [], judge: [],
  };
}

/**
 * Whether a session stopped on the account's usage limit, which pauses the run for a resume.
 * @param {ReturnType<typeof summarizeStream>} s
 */
export function isUsageLimit(s) {
  return Boolean(s.result?.isError) && /usage limit|limit reached|rate.?limit|resets? (at )?\d/i.test(s.result.reply ?? '');
}

/** Tokens as the lean bar counts them: input plus cache creation plus output, with cache reads reported beside. */
export function tokensOf(u) {
  return u ? u.input + u.cacheCreation + u.output : 0;
}

/**
 * The denied commands that are harness faults: a gate or check command the process needs, or on a
 * site or tree fixture any build command.
 * @param {{ tool_name: string, tool_input?: { command?: string } }[]} denials
 * @param {{ id: string, name: string, input: any }[]} tools the session's calls, to see a denied command reissued
 * @param {string} [fixture] the case's fixture kind
 * @returns {string[]}
 */
export function deniedFaults(denials, tools = [], fixture = 'pin') {
  const faults = [];
  const deniedIds = new Set(denials.map((d) => d.tool_use_id));
  const lead = (c) => c.split(/[;&|]/)[0].trim();
  const needed = fixture === 'pin' ? NEEDED_COMMAND : new RegExp(`${NEEDED_COMMAND.source}|${NEEDED_BUILD_COMMAND.source}`);
  for (const d of denials) {
    const cmd = d.tool_input?.command ?? '';
    if (d.tool_name !== 'Bash') continue;
    if (!needed.test(cmd)) continue;
    // A compound command the permission check could not verify is denied whole. The session
    // reissuing its leading command and getting through leaves the process unharmed.
    const recovered = tools.some((t) => t.name === 'Bash' && !deniedIds.has(t.id) && lead(t.input.command ?? '') === lead(cmd));
    if (!recovered) faults.push(cmd);
  }
  return faults;
}

/**
 * The end-of-session record a lost session leaves for tracing (#89): how the process ended, the
 * last stream event it wrote, how much transcript it wrote, and the runner's worst event-loop stall
 * so far.
 * @param {{ code: number | null, signal: string | null, lastEvent: { type?: string, subtype?: string } | null, bytes: number, maxDelayNs: number }} end
 */
export function endRecord({ code, signal, lastEvent, bytes, maxDelayNs }) {
  const last = lastEvent?.type ? `${lastEvent.type}${lastEvent.subtype ? `/${lastEvent.subtype}` : ''}` : null;
  return { exitCode: code, signal, lastEvent: last, transcriptBytes: bytes, peakLoopDelayMs: Math.round(maxDelayNs / 1e4) / 100 };
}

/**
 * Create the run's state directory. The leaf is made without `recursive`, so an existing folder
 * refuses the run instead of two runs sharing it.
 * @param {string} root
 * @param {string} runId
 */
export function makeRunDir(root, runId) {
  mkdirSync(root, { recursive: true });
  const dir = join(root, runId);
  mkdirSync(dir);
  return dir;
}

// ---------------------------------------------------------------------------------------------
// Grading

/**
 * Walk a path in the tree for the files under it, skipping dependency and git directories.
 * @param {string} root
 * @param {string} rel
 */
function filesUnder(root, rel) {
  const abs = join(root, rel);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return [rel];
  const out = [];
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === '.git') continue;
    out.push(...filesUnder(root, join(rel, name)));
  }
  return out;
}

/**
 * Parse the JSON array a fact-checker replies with, tolerating a code fence around it.
 * @param {string} reply
 */
export function parseVerdicts(reply) {
  const m = reply.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try { const v = JSON.parse(m[0]); return Array.isArray(v) ? v : null; } catch { return null; }
}

/**
 * Score a fact-checker reply against the key: a `wrong` or `imprecise` verdict on a false claim's
 * line is found, and on a true claim's line a false positive.
 * @param {string} reply
 * @param {{ claim: string, true: boolean }[]} key
 * @param {string} pageText the seed page as the checker saw it
 */
export function gradeVerdicts(reply, key, pageText) {
  const verdicts = parseVerdicts(reply);
  if (!verdicts) return { ok: false, detail: 'the reply holds no JSON array' };
  const lines = pageText.split('\n');
  let found = 0;
  let falsePositives = 0;
  const falseCount = key.filter((k) => !k.true).length;
  for (const k of key) {
    const line = lines.findIndex((l) => l.includes(k.claim)) + 1;
    if (line === 0) return { ok: false, detail: `claim ${JSON.stringify(k.claim)} is not on the seed page` };
    const flagged = verdicts.some((v) => v.line === line && ['wrong', 'imprecise'].includes(v.verdict));
    if (flagged && !k.true) found++;
    if (flagged && k.true) falsePositives++;
  }
  return { ok: found === falseCount && falsePositives <= 1, detail: `${found}/${falseCount} false claims found, ${falsePositives} false positives` };
}

/**
 * Run one deterministic check against a finished trial.
 * @param {any} check
 * @param {{ root: string, changed: { status: string, path: string }[], tools: any[], reply: string, runGate: (script: string) => boolean }} ctx
 * @returns {{ ok: boolean, detail: string }}
 */
export function runCheck(check, ctx) {
  const read = (p) => readFileSync(join(ctx.root, p), 'utf8');
  const matches = (text) => (check.regex ? new RegExp(check.regex, 'm').test(text) : text.includes(check.text));
  switch (check.type) {
    case 'contains':
    case 'absent': {
      const hits = filesUnder(ctx.root, check.path).filter((f) => matches(read(f)));
      const ok = check.type === 'contains' ? hits.length > 0 : hits.length === 0;
      return { ok, detail: `${check.type} ${JSON.stringify(check.text ?? check.regex)} under ${check.path}: ${hits.length} file(s)` };
    }
    case 'changed':
    case 'unchanged': {
      const hit = ctx.changed.some((c) => c.path === check.path || c.path.startsWith(check.path.endsWith('/') ? check.path : `${check.path}/`));
      return { ok: check.type === 'changed' ? hit : !hit, detail: `${check.type} ${check.path}` };
    }
    case 'noNewFiles': {
      const added = ctx.changed.filter((c) => c.status === 'A' && c.path.startsWith(check.under));
      return { ok: added.length === 0, detail: `new files under ${check.under}: ${added.map((a) => a.path).join(', ') || 'none'}` };
    }
    case 'bash': {
      const re = new RegExp(check.pattern);
      const ok = ctx.tools.some((t) => t.name === 'Bash' && re.test(t.input.command ?? ''));
      return { ok, detail: `a Bash call matching /${check.pattern}/ ${ok ? 'ran' : 'never ran'}` };
    }
    case 'agent': {
      const ok = ctx.tools.some((t) => t.name === 'Agent' && t.input.subagent_type === check.name);
      return { ok, detail: `${check.name} ${ok ? 'was' : 'was never'} dispatched` };
    }
    case 'read': {
      const firstEdit = ctx.tools.findIndex((t) => ['Edit', 'Write'].includes(t.name));
      // Any way of looking at the file counts: a Read, a Grep over it, or a shell command naming it.
      const sees = (t) => (t.name === 'Read' && (t.input.file_path ?? '').endsWith(check.path))
        || (t.name === 'Grep' && `${t.input.path ?? ''} ${t.input.glob ?? ''}`.includes(check.path))
        || (t.name === 'Bash' && (t.input.command ?? '').includes(check.path));
      const at = ctx.tools.findIndex(sees);
      const ok = at !== -1 && (!check.beforeEdit || firstEdit === -1 || at < firstEdit);
      return { ok, detail: `${check.path} ${ok ? 'was read' : 'was not read'}${check.beforeEdit ? ' before the first edit' : ''}` };
    }
    case 'skillNotCalled': {
      const ok = !ctx.tools.some((t) => t.name === 'Skill' && (t.input.skill ?? '').includes(check.name));
      return { ok, detail: `${check.name} ${ok ? 'was not' : 'was'} loaded` };
    }
    case 'npm': {
      const ok = ctx.runGate(`npm run ${check.script}`);
      return { ok, detail: `npm run ${check.script} ${ok ? 'passed' : 'failed'}` };
    }
    case 'verdicts': {
      const key = JSON.parse(readFileSync(join(HERE, check.key), 'utf8'));
      const r = gradeVerdicts(ctx.reply, key, read(check.page));
      return { ok: r.ok, detail: r.detail };
    }
    default:
      return { ok: false, detail: `unknown check ${check.type}` };
  }
}

/**
 * The checks a case that edits docs always owes: the docs gate ran, and the fact-checker was
 * dispatched.
 * @param {{ path: string }[]} changed
 */
export function implicitDocsChecks(changed) {
  if (!changed.some((c) => c.path.startsWith('docs/'))) return [];
  return [
    { type: 'bash', pattern: 'check:docs-gate', implicit: true },
    { type: 'agent', name: 'docs-fact-checker', implicit: true },
  ];
}

// ---------------------------------------------------------------------------------------------
// Rates and the table

/**
 * One cell's counts: errored sessions leave the rates, and pass^k holds when every graded trial passed.
 * @param {{ status: string, pass?: boolean }[]} trials
 */
export function rates(trials) {
  const graded = trials.filter((t) => t.status === 'graded');
  const passed = graded.filter((t) => t.pass).length;
  return {
    graded: graded.length,
    passed,
    errors: trials.filter((t) => t.status === 'error').length,
    faults: trials.filter((t) => t.status === 'fault').length,
    passAll: graded.length > 0 && passed === graded.length,
  };
}

/**
 * The markdown table: one row per case and arm.
 * @param {{ caseId: string, arm: string, status: string, pass?: boolean, transcript: string }[]} results
 * @param {string[]} arms
 */
export function renderTable(results, arms) {
  const rows = ['| case | arm | pass rate | pass^k | errors | faults | failing transcripts |', '| --- | --- | --- | --- | --- | --- | --- |'];
  const caseIds = [...new Set(results.map((r) => r.caseId))];
  for (const id of caseIds) {
    for (const arm of arms) {
      const trials = results.filter((r) => r.caseId === id && r.arm === arm);
      const r = rates(trials);
      const failing = trials.filter((t) => t.status === 'graded' && !t.pass).map((t) => `\`${t.transcript}\``);
      const k = r.graded ? `${r.passAll ? '✓' : '✗'} (k=${r.graded})` : 'n/a';
      rows.push(`| ${id} | ${arm} | ${r.passed}/${r.graded} | ${k} | ${r.errors} | ${r.faults} | ${failing.join('<br>') || '-'} |`);
    }
  }
  return rows.join('\n');
}

// ---------------------------------------------------------------------------------------------
// The resume log, early stops, and medians

/** The key a finished trial is skipped by on a resume. */
export const trialKey = (caseId, arm, trial) => `${caseId}|${arm}|${trial}`;

/** Append one finished trial to the run's JSONL log. */
export function appendRow(file, row) {
  appendFileSync(file, `${JSON.stringify(row)}\n`);
}

/**
 * Read a run's JSONL log; a missing file is no rows, and a truncated last line is dropped.
 * @param {string} file
 * @returns {any[]}
 */
export function readRows(file) {
  if (!existsSync(file)) return [];
  const rows = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { /* a line cut off by a kill */ }
  }
  return rows;
}

/** The keys a resume skips: graded and fault rows are final, and an error row runs again. */
export function finishedKeys(rows) {
  return new Set(rows.filter((r) => r.status === 'graded' || r.status === 'fault').map((r) => trialKey(r.caseId, r.arm, r.trial)));
}

/**
 * Why a job need not run, or null. A case counts when its baseline passes four of five, so a
 * baseline that cannot reach that stops, and the treatment skips the case; the treatment arm stops
 * at the failure that decides its bar (the case's `bar`, or four of five).
 * @param {{ caseDef: { id: string, bar?: number }, arm: { label: string, role?: string }, trial: number }} job
 * @param {{ caseId: string, arm: string, status: string, pass?: boolean }[]} rows
 * @param {{ trials: number, earlyStop: boolean, baselineLabel?: string }} opts
 * @returns {string | null}
 */
export function skipReason(job, rows, opts) {
  if (!opts.earlyStop) return null;
  const need = Math.ceil(0.8 * opts.trials);
  const failures = (arm) => rows.filter((r) => r.caseId === job.caseDef.id && r.arm === arm && r.status === 'graded' && !r.pass).length;
  const maxFail = opts.trials - need;
  if (job.arm.role === 'baseline') {
    return failures(job.arm.label) > maxFail ? 'baseline cannot count: it can no longer reach four of five' : null;
  }
  if (opts.baselineLabel && failures(opts.baselineLabel) > maxFail) return 'baseline did not pass four of five, so the case does not count';
  const bar = job.caseDef.bar === 5 ? opts.trials : need;
  return failures(job.arm.label) > opts.trials - bar ? `decided: the arm already missed the ${job.caseDef.bar === 5 ? 'five of five' : 'four of five'} bar` : null;
}

const median = (xs) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Tokens and wall time per case and arm: the median over passing trials, summed into a total, with
 * the all-trial sums beside it (cache reads in their own column).
 * @param {any[]} rows
 * @param {string[]} arms
 */
export function medianTable(rows, arms) {
  const out = ['| case | arm | median tokens | median seconds | all-trial tokens | all-trial seconds | cache reads |', '| --- | --- | --- | --- | --- | --- | --- |'];
  const ids = [...new Set(rows.map((r) => r.caseId))];
  for (const arm of arms) {
    const tot = { tokens: 0, secs: 0, allTokens: 0, allSecs: 0, reads: 0 };
    for (const id of ids) {
      const graded = rows.filter((r) => r.caseId === id && r.arm === arm && r.status === 'graded' && r.usage);
      if (graded.length === 0) continue;
      const passing = graded.filter((r) => r.pass);
      const mt = median(passing.map((r) => tokensOf(r.usage)));
      const ms = median(passing.map((r) => (r.durationMs ?? 0) / 1000));
      const allT = graded.reduce((n, r) => n + tokensOf(r.usage), 0);
      const allS = graded.reduce((n, r) => n + (r.durationMs ?? 0) / 1000, 0);
      const reads = graded.reduce((n, r) => n + r.usage.cacheRead, 0);
      out.push(`| ${id} | ${arm} | ${Math.round(mt)} | ${Math.round(ms)} | ${Math.round(allT)} | ${Math.round(allS)} | ${reads} |`);
      Object.assign(tot, { tokens: tot.tokens + mt, secs: tot.secs + ms, allTokens: tot.allTokens + allT, allSecs: tot.allSecs + allS, reads: tot.reads + reads });
    }
    out.push(`| total | ${arm} | ${Math.round(tot.tokens)} | ${Math.round(tot.secs)} | ${Math.round(tot.allTokens)} | ${Math.round(tot.allSecs)} | ${tot.reads} |`);
  }
  return out.join('\n');
}

/**
 * Delete each listed path from an unpacked package, returning the ones that existed. A path that
 * leaves the package folder is refused.
 * @param {string} dir
 * @param {string[]} paths package-relative paths
 * @returns {string[]}
 */
export function stripPaths(dir, paths) {
  const removed = [];
  for (const p of paths) {
    const abs = resolve(dir, p);
    if (abs !== dir && !abs.startsWith(`${resolve(dir)}/`)) throw new Error(`${p} is outside the package`);
    if (existsSync(abs)) {
      rmSync(abs, { recursive: true, force: true });
      removed.push(p);
    }
  }
  return removed;
}

// ---------------------------------------------------------------------------------------------
// Fixtures

function mainCheckoutRoot(repo) {
  const common = git(['rev-parse', '--path-format=absolute', '--git-common-dir'], repo).trim();
  return dirname(common);
}

/**
 * The prepared `node_modules` for a pin, reused only while its lockfile hash matches. It sits on
 * the same device as the fixtures so `cp -al` can hard-link it.
 */
function prepareModules(repo, mainRoot, pin) {
  const dir = join(mainRoot, '.claude/worktrees', `docs-eval-nm-${pin.slice(0, 9)}`);
  const lockHash = createHash('sha256').update(git(['show', `${pin}:package-lock.json`], repo)).digest('hex');
  const marker = join(dir, '.eval-lock-hash');
  if (existsSync(marker) && readFileSync(marker, 'utf8') === lockHash && existsSync(join(dir, 'node_modules'))) return dir;
  if (existsSync(dir)) {
    spawnSync('git', ['worktree', 'remove', '--force', dir], { cwd: repo });
    rmSync(dir, { recursive: true, force: true });
  }
  git(['worktree', 'add', '--detach', dir, pin], repo);
  const r = spawnSync('npm', ['ci', '--ignore-scripts'], { cwd: dir, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`npm ci at ${pin} failed:\n${r.stderr}`);
  writeFileSync(marker, lockHash);
  return dir;
}

async function commitAll(root, message) {
  await gitAsync(['add', '-A'], root);
  await gitAsync(['-c', 'user.name=docs-eval', '-c', 'user.email=docs-eval@localhost', 'commit', '--allow-empty', '--no-verify', '-q', '-m', message], root);
  return (await gitAsync(['rev-parse', 'HEAD'], root)).trim();
}

/**
 * Build a fixture worktree: the pin, the arm's overlay, the case's setup, each committed.
 * @returns {Promise<{ root: string, base: string, commit: string }>}
 */
async function makeFixture({ repo, caseDef, pin, arm, name, modulesDir }) {
  const root = join(FIXTURE_ROOT, name);
  const kind = caseDef.fixture ?? 'pin';
  let base;
  if (kind === 'site') {
    // The arm's emitted site, copied; it is its own repository, so `git status` shows only the session's work.
    await copySite(arm.site.dir, root);
    liveFixtures.set(root, null);
    await gitAsync(['init', '-q'], root);
    base = await commitAll(root, 'fixture site');
  } else if (kind === 'tree') {
    // The arm's whole tree without the project settings, so the plugin arrives only through `--plugin-dir`.
    await gitAsync(['worktree', 'add', '--detach', root, arm.sha], repo);
    liveFixtures.set(root, repo);
    rmSync(join(root, '.claude/settings.json'), { force: true });
    base = await commitAll(root, 'fixture tree');
  } else {
    await gitAsync(['worktree', 'add', '--detach', root, pin], repo);
    liveFixtures.set(root, repo);
    deleteOverlay(root);
    await extractOverlay(repo, arm.ref, root);
    if (arm.control) deleteSkill(root);
    base = await commitAll(root, 'fixture overlay');
  }
  if (caseDef.setup) {
    const mod = await import(pathToFileURL(join(HERE, caseDef.setup)).href);
    mod.default(root);
    if ((await gitAsync(['status', '--porcelain'], root)).trim() === '') throw new Error(`setup ${caseDef.setup} changed nothing at ${pin}`);
  }
  const commit = await commitAll(root, 'fixture setup');
  if (kind !== 'site' && caseDef.install !== false) await exec('cp', ['-al', join(modulesDir, 'node_modules'), join(root, 'node_modules')]);
  return { root, base, commit };
}

/**
 * Name a run by its UTC start second plus a random suffix. Two runs started in the same second
 * would otherwise share one state directory and overwrite each other's results.
 */
export function newRunId(date = new Date(), suffix = randomBytes(2).toString('hex')) {
  return `${date.toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-')}-${suffix}`;
}

/** Remove the fixtures an aborted run left behind: `docs-eval-*` worktrees idle for three hours. */
function pruneFixtures(repo) {
  const dir = FIXTURE_ROOT;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!/^docs-eval-\d/.test(name) || Date.now() - statSync(path).mtimeMs < 3 * 3600 * 1000) continue;
    removeFixtureSync(repo, path);
  }
}

const liveFixtures = new Map();

/** Take a fixture out without blocking the event loop. */
async function removeFixture(repo, root) {
  liveFixtures.delete(root);
  if (repo) await exec('git', ['worktree', 'remove', '--force', root], { cwd: repo }).catch(() => {});
  await rm(root, { recursive: true, force: true });
}

/** The synchronous remover for before the pool starts and for the signal handler, which exits at once. */
function removeFixtureSync(repo, root) {
  liveFixtures.delete(root);
  if (repo) spawnSync('git', ['worktree', 'remove', '--force', root], { cwd: repo });
  rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------------------------
// Sessions

const children = new Set();
let aborted = null;
/** The runner's own event-loop stalls, for each session's end-of-session record. */
const loopDelay = monitorEventLoopDelay({ resolution: 20 });

function abortRun(reason) {
  if (aborted) return;
  aborted = reason;
  for (const c of children) c.kill('SIGTERM');
}

function sessionEnv(extra = {}) {
  // A headless `-p` run exits soon after the model launches a background subagent, before the
  // result returns (anthropics/claude-code#73453), so sessions run their subagents in the foreground.
  // Auto-memory is off because a fixture is a linked worktree, which Claude Code maps to the main
  // checkout's project and its memory.
  const env = { ...process.env, CAIRN_GATE_LANE: 'light', CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: '1', CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1', ...extra };
  delete env.ANTHROPIC_API_KEY;
  return env;
}

/**
 * Run one headless session, saving its stream to `file`; resolves with how it ended and the
 * pieces of its end-of-session record: the last event it wrote and the bytes written.
 */
function runSession({ cwd, args, prompt, file }) {
  return new Promise((resolveRun) => {
    const out = createWriteStream(file);
    const child = spawn('claude', args, { cwd, env: sessionEnv(), stdio: ['pipe', 'pipe', 'pipe'] });
    children.add(child);
    let buf = '';
    let lastLine = '';
    let bytes = 0;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, SESSION_TIMEOUT_MS);
    child.stdout.on('data', (d) => {
      out.write(d);
      bytes += d.length;
      buf += d;
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.trim()) lastLine = line;
        if (!line.includes('"subtype":"init"')) continue;
        try {
          const e = JSON.parse(line);
          if (e.type === 'system' && e.subtype === 'init' && e.apiKeySource !== 'none') abortRun(`apiKeySource is ${e.apiKeySource}, not none`);
        } catch { /* not an event */ }
      }
    });
    child.stderr.pipe(createWriteStream(`${file}.stderr`));
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      children.delete(child);
      let lastEvent = null;
      try { lastEvent = JSON.parse(lastLine); } catch { /* nothing was written, or the line was cut off */ }
      out.end(() => resolveRun({ code, signal, timedOut, lastEvent, bytes }));
    });
    child.stdin.end(prompt);
  });
}

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: { n: { type: 'integer' }, verdict: { enum: ['pass', 'fail', 'unknown'] }, reason: { type: 'string' } },
        required: ['n', 'verdict', 'reason'],
      },
    },
  },
  required: ['verdicts'],
};

/** One blind judge call from a neutral directory; `unknown` and any failure count as not passed. */
async function judgeTrial({ assertions, diff, reply, toolLog, file }) {
  const prompt = [
    'You grade one run of a coding session against assertions. You are blind to which configuration produced it.',
    'Judge each assertion from the evidence below. Answer "unknown" when the evidence cannot settle it.',
    '', '## Assertions', ...assertions.map((a) => `${a.n}. ${a.text}`),
    '', '## Final reply', reply || '(empty)',
    '', '## Tool calls', toolLog,
    '', '## Diff from the starting commit', diff.slice(0, 80_000) || '(empty)',
  ].join('\n');
  const cwd = mkdtempSync(join(tmpdir(), 'docs-eval-judge-'));
  const args = ['-p', '--model', 'opus', '--effort', 'medium', '--output-format', 'json', '--json-schema', JSON.stringify(JUDGE_SCHEMA), '--tools', ''];
  const r = await run('claude', args, { cwd, env: sessionEnv(), input: prompt, timeout: 15 * 60 * 1000 });
  await rm(cwd, { recursive: true, force: true });
  writeFileSync(file, r.stdout ?? '');
  try {
    const out = JSON.parse(r.stdout);
    const v = out.structured_output ?? JSON.parse(out.result);
    return v.verdicts;
  } catch {
    return assertions.map((a) => ({ n: a.n, verdict: 'unknown', reason: 'the judge call returned no verdicts' }));
  }
}

/**
 * Run a command to completion without blocking the event loop, so the other sessions' output
 * pipes keep draining while a gate or the judge runs.
 * @returns {Promise<{ status: number | null, stdout: string }>}
 */
function run(command, args, { cwd, env, input = '', timeout }) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'ignore'] });
    children.add(child);
    let stdout = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), timeout);
    child.stdout.on('data', (d) => { stdout += d; });
    child.on('error', () => { clearTimeout(timer); children.delete(child); resolveRun({ status: null, stdout }); });
    child.on('close', (status) => { clearTimeout(timer); children.delete(child); resolveRun({ status, stdout }); });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

/** Run a gate string on the light lane through `cairn-run-gate`, re-issuing on exit 75. */
async function runGate(root, gate) {
  for (let i = 0; i < 30; i++) {
    const r = await run('cairn-run-gate', [gate], { cwd: root, env: sessionEnv(), timeout: 12 * 60 * 1000 });
    if (r.status === 75) continue;
    return r.status === 0;
  }
  return false;
}

function toolLog(tools) {
  return tools.map((t) => {
    const arg = t.input.command ?? t.input.file_path ?? t.input.skill ?? t.input.subagent_type ?? t.input.pattern ?? '';
    const out = t.output ? `\n    -> ${t.output.replace(/\s+/g, ' ').slice(0, 400)}` : '';
    return `${t.sub ? '  (subagent) ' : ''}${t.name}: ${String(arg).replace(/\s+/g, ' ').slice(0, 300)}${out}`;
  }).join('\n');
}

/**
 * Run and grade one trial.
 * @returns {Promise<object>} the trial's record
 */
async function runTrial({ job, ctx, rerun = false }) {
  const { caseDef, arm, trial } = job;
  // A rerun gets its own stem and fixture name, so it keeps the first attempt's transcript.
  const stem = `${caseDef.id}-${arm.label}-${trial}${rerun ? '-r' : ''}`;
  const transcript = join(ctx.stateDir, `${stem}.jsonl`);
  const record = { caseId: caseDef.id, arm: arm.label, trial, transcript, status: 'graded', pass: false, checks: [], judge: [] };
  const name = `docs-eval-${ctx.runId}-${stem}`;
  let fixture;
  try {
    fixture = await makeFixture({
      repo: ctx.repo, caseDef, pin: caseDef.pinFull, arm,
      name, modulesDir: ctx.modules.get(caseDef.fixture === 'tree' ? arm.sha : caseDef.pinFull),
    });
  } catch (e) {
    // makeFixture may have added the worktree before it threw; take it back out.
    if (!ctx.keep) await removeFixture(ctx.repo, join(FIXTURE_ROOT, name));
    return { ...record, status: 'fault', detail: `fixture: ${e.message}` };
  }
  try {
    const prompt = renderPrompt(caseDef.prompt, { repo: fixture.root, base: fixture.base, commit: fixture.commit });
    const kind = caseDef.fixture ?? 'pin';
    // A tree case takes the standards plugin by directory, a site case from none; a pin case loads neither.
    const pluginDirs = [ctx.pluginDir, kind === 'tree' ? ctx.treePluginDir : null].filter(Boolean);
    const { timedOut, code, signal, lastEvent, bytes } = await runSession({ cwd: fixture.root, args: claudeArgs(caseDef, { pluginDirs }), prompt, file: transcript });
    record.end = endRecord({ code, signal, lastEvent, bytes, maxDelayNs: loopDelay.max });
    if (aborted) return { ...record, status: 'error', detail: `run aborted: ${aborted}` };
    const s = summarizeStream(readFileSync(transcript, 'utf8'));
    if (isUsageLimit(s)) {
      abortRun('usage limit');
      return { ...record, status: 'error', detail: 'usage limit' };
    }
    record.usage = s.result?.usage ?? null;
    record.durationMs = s.result?.durationMs ?? null;
    // The control arm removes the skill on purpose: there its presence is the fault.
    const bad = sessionVerdict({
      s, control: Boolean(arm.control), skills: ctx.skills[kind] ?? [], timedOut, code, signal,
      plugins: kind === 'tree' && ctx.treePluginDir ? { standards: 1 } : kind === 'site' && !ctx.pluginDir ? { standards: 0 } : undefined,
    });
    if (bad) return { ...record, ...bad };
    const faults = deniedFaults(s.result.denials, s.tools, kind);
    // A read-only case asks about work outside the repo, where a denied `ls` is the right outcome.
    if (!caseDef.readOnly && faults.length) return { ...record, status: 'fault', detail: `a needed command was denied: ${faults[0]}` };

    await gitAsync(['add', '-A'], fixture.root);
    const changed = (await gitAsync(['diff', '--cached', '--name-status', fixture.commit], fixture.root)).split('\n').filter(Boolean)
      .map((l) => { const [status, ...p] = l.split('\t'); return { status: status[0], path: p[p.length - 1] }; });
    const diff = await gitAsync(['diff', '--cached', fixture.commit], fixture.root);
    writeFileSync(join(ctx.stateDir, `${stem}.diff`), diff);

    const checks = [...caseDef.checks, ...(caseDef.readOnly || kind !== 'pin' ? [] : implicitDocsChecks(changed))];
    // The npm checks run first and asynchronously; runCheck then reads their results.
    const gates = new Map();
    for (const k of checks.filter((c) => c.type === 'npm')) gates.set(`npm run ${k.script}`, await runGate(fixture.root, `npm run ${k.script}`));
    const cctx = { root: fixture.root, changed, tools: s.tools, reply: s.reply, runGate: (g) => gates.get(g) ?? false };
    record.checks = checks.map((k) => ({ type: k.type, ...runCheck(k, cctx) }));
    if (caseDef.judge?.length) {
      ctx.judgeCalls++;
      record.judge = await judgeTrial({ assertions: caseDef.judge, diff, reply: s.reply, toolLog: toolLog(s.tools), file: join(ctx.stateDir, `${stem}.judge.json`) });
    }
    record.pass = record.checks.every((c) => c.ok) && caseDef.judge?.every((a) => record.judge.find((v) => v.n === a.n)?.verdict === 'pass') !== false;
    return record;
  } catch (e) {
    // The pool wrapper turns this into a fault row; the record keeps the session's end-of-session record (#92).
    throw Object.assign(e, { record });
  } finally {
    if (!ctx.keep) await removeFixture(ctx.repo, fixture.root);
  }
}

/** Run `fn` over `items` with at most `limit` in flight. */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length && !aborted) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out.filter(Boolean);
}

// ---------------------------------------------------------------------------------------------
// Main

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataFile = args.suite === 'site' ? 'evals-site.json' : 'evals.json';
  const data = JSON.parse(readFileSync(join(HERE, dataFile), 'utf8'));
  const problems = validateEvals(data);
  if (problems.length) throw new Error(`${dataFile} is invalid:\n${problems.join('\n')}`);

  const repo = git(['rev-parse', '--show-toplevel'], process.cwd()).trim();
  const mainRoot = mainCheckoutRoot(repo);
  const kindOf = (c) => c.fixture ?? 'pin';
  const cases = data.evals.filter((c) => (args.suite === 'all' || c.suite === args.suite)
    && (!args.caseId || c.id === args.caseId) && (!args.fixture || kindOf(c) === args.fixture));
  if (cases.length === 0) throw new Error('no case matches');
  mkdirSync(FIXTURE_ROOT, { recursive: true });
  const conflicts = ancestorConflicts(FIXTURE_ROOT, homedir());
  if (conflicts.length) throw new Error(`the fixture root sits under project instructions a session would load:\n${conflicts.join('\n')}`);
  pruneFixtures(repo);
  const arms = args.refs.map((ref, i) => {
    const control = args.control && i === 0;
    const role = args.refs.length === 2 ? (i === 0 ? 'baseline' : 'treatment') : 'single';
    return {
      ref, control, role, label: control ? 'control' : ref.replace(/[^\w.-]/g, '_'),
      sha: git(['rev-parse', `${ref}^{commit}`], repo).trim(), hash: `${overlayHash(repo, ref)}${control ? '-control' : ''}`,
    };
  });
  const sessions = cases.length * arms.length * args.trials;
  if (sessions > SESSION_CAP && !args.max) throw new Error(`${sessions} case sessions is over the cap of ${SESSION_CAP}; pass --max to run anyway`);

  const runId = args.resume ?? newRunId();
  const stateDir = args.resume ? join(STATE_ROOT, runId) : makeRunDir(STATE_ROOT, runId);
  if (args.resume && !existsSync(stateDir)) throw new Error(`no run ${runId} to resume`);
  const rowsFile = join(stateDir, 'results.jsonl');
  const rows = readRows(rowsFile);
  if (args.reuseBaseline) {
    // The smoke run's baseline trials stand as this run's, so the A/B does not repeat them.
    const reused = readRows(join(STATE_ROOT, args.reuseBaseline, 'results.jsonl')).filter((r) => r.arm === arms[0].label && r.status === 'graded');
    for (const r of reused) if (!rows.some((x) => trialKey(x.caseId, x.arm, x.trial) === trialKey(r.caseId, r.arm, r.trial))) {
      const row = { ...r, reused: args.reuseBaseline };
      appendRow(rowsFile, row);
      rows.push(row);
    }
  }
  const finished = finishedKeys(rows);
  const modules = new Map();
  for (const c of cases.filter((c) => kindOf(c) === 'pin')) c.pinFull = git(['rev-parse', c.pin], repo).trim();
  for (const c of cases.filter((c) => kindOf(c) === 'pin' && c.install !== false)) {
    if (!modules.has(c.pinFull)) modules.set(c.pinFull, prepareModules(repo, mainRoot, c.pinFull));
  }
  // A site arm builds once: its tarballs, emitted template, install, and guidance, cached by ref and strip list.
  const strip = args.strip ? readStripList(resolve(args.strip)) : [];
  if (cases.some((c) => kindOf(c) === 'site')) {
    for (const arm of arms) {
      if (!modules.has(arm.sha)) modules.set(arm.sha, prepareModules(repo, mainRoot, arm.sha));
      arm.site = await buildSiteBase({ treeDir: modules.get(arm.sha), sha: arm.sha, cacheRoot: SITE_CACHE, strip, stripPathsFn: stripPaths });
      console.error(`site ${arm.label}: ${arm.site.dir}${arm.site.removed.length ? `, stripped ${arm.site.removed.join(', ')}` : ''}`);
    }
  }
  if (cases.some((c) => kindOf(c) === 'tree')) {
    for (const arm of arms) if (!modules.has(arm.sha)) modules.set(arm.sha, prepareModules(repo, mainRoot, arm.sha));
  }
  const dotfiles = spawnSync('git', ['-C', join(homedir(), '.dotfiles'), 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  const dirSha = (d) => (d ? git(['-C', d, 'rev-parse', '--short', 'HEAD'], repo).trim() : null);
  const ctx = {
    repo, runId, stateDir, modules, judgeCalls: 0, keep: args.keep,
    pluginDir: args.pluginDir && resolve(args.pluginDir), treePluginDir: args.treePluginDir && resolve(args.treePluginDir),
    skills: data.expectSkills ?? { pin: [data.skill_name] },
  };

  const jobs = [];
  const add = (caseDef, arm) => { for (let trial = 1; trial <= args.trials; trial++) jobs.push({ caseDef, arm, trial }); };
  if (args.baselineFirst) for (const arm of arms) for (const caseDef of cases) add(caseDef, arm);
  else for (const caseDef of cases) for (const arm of arms) add(caseDef, arm);
  const todo = jobs.filter((j) => !finished.has(trialKey(j.caseDef.id, j.arm.label, j.trial)));
  const stop = { trials: args.trials, earlyStop: args.baselineFirst, baselineLabel: arms.length === 2 ? arms[0].label : undefined };
  console.error(`run ${runId}: ${sessions} case sessions (${todo.length} to run), state in ${stateDir}`);
  // Enabled here, after the synchronous setup, so a cold `npm ci` does not show as a pool stall.
  loopDelay.enable();
  const skipped = [];
  await pool(todo, args.concurrency, async (job) => {
    const why = skipReason(job, rows, stop);
    if (why) {
      skipped.push({ caseId: job.caseDef.id, arm: job.arm.label, trial: job.trial, status: 'skipped', detail: why });
      return null;
    }
    // An exception in one trial is that trial's fault, not the run's: the table keeps every other row.
    const attempt = (rerun) => runTrial({ job, ctx, rerun }).catch((e) => faultRecord(job, e));
    let r = await attempt(false);
    // A headless session sometimes exits 0 with no result event; the standing answer reruns an
    // errored session once, and a second error is reported as an error.
    if (r.status === 'error' && /no result/.test(r.detail) && !aborted) {
      console.error(`  ${r.caseId} ${r.arm} #${r.trial}: ${r.detail}; rerunning once`);
      r = { ...(await attempt(true)), lost: { transcript: r.transcript, ...r.end } };
    }
    console.error(`  ${r.caseId} ${r.arm} #${r.trial}: ${r.status}${r.status === 'graded' ? (r.pass ? ' pass' : ' FAIL') : ` (${r.detail})`}`);
    // A trial an abort cut short is not a result; a resume runs it again.
    if (!aborted) {
      appendRow(rowsFile, r);
      rows.push(r);
    }
    return r;
  });

  if (aborted) {
    console.error(aborted === 'usage limit'
      ? `run paused on the usage limit: resume after the reset with --resume ${runId}`
      : `run aborted: ${aborted}`);
    process.exitCode = aborted === 'usage limit' ? 4 : 3;
    return;
  }
  // A resumed error row is superseded by the rerun, so the table keeps the last row of each trial.
  const results = [...new Map(rows.map((r) => [trialKey(r.caseId, r.arm, r.trial), r])).values()];
  const armLabels = arms.map((a) => a.label);
  const table = renderTable(results, armLabels);
  const header = [
    `Run ${runId}: ${sessions} case sessions, ${ctx.judgeCalls} judge calls (not counted against the cap).`,
    ...arms.map((a) => `Arm \`${a.label}\`: ref ${a.sha.slice(0, 9)}, overlay ${a.hash}.`),
    ...(ctx.treePluginDir ? [`standards plugin at ${dirSha(ctx.treePluginDir)}.`] : []),
    ...(strip.length ? [`Stripped from the engine tarball: ${strip.join(', ')}.`] : []),
    ...(skipped.length ? [`${skipped.length} sessions skipped by the early-stop rules.`] : []),
    `main checkout ${git(['rev-parse', '--short', 'HEAD'], mainRoot).trim()}, ~/.dotfiles ${dotfiles}.`,
  ].join('\n');
  const medians = medianTable(results, armLabels);
  writeFileSync(join(stateDir, 'results.json'), JSON.stringify({ runId, arms: arms.map(({ site, ...a }) => a), results, skipped }, null, 2));
  writeFileSync(join(stateDir, 'table.md'), `${header}\n\n${table}\n\n${medians}\n`);
  console.log(`${header}\n\n${table}\n\n${medians}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // A stopped run takes its sessions and fixtures with it.
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      abortRun('interrupted');
      for (const [root, repo] of liveFixtures) removeFixtureSync(repo, root);
      process.exit(3);
    });
  }
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
