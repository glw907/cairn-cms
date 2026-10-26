#!/usr/bin/env node
// cairn-cms: the docs-process eval runner. It runs the cases in `evals.json` against one or two
// refs (arms) and prints a markdown table of pass rates. Each trial is one headless `claude -p`
// session in its own fixture worktree: the pinned commit, the arm's docs-process files laid over
// it, then the case's setup, committed as the fixture base so the graders diff from it.
//
// Interface: `node .claude/skills/cairn-docs/evals/run.mjs <ref> [<ref>] [--suite regression|
// capability|all] [--case <id>] [--trials n] [--max]`. A suite run takes far longer than ten
// minutes, so start it as a background command and wait for it to exit.
//
// Sessions run on the subscription: ANTHROPIC_API_KEY is removed from their environment, and the
// run aborts on the first `init` event whose `apiKeySource` is not `none`.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync,
  writeFileSync, copyFileSync, statSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVALS_DIR_REL = '.claude/skills/cairn-docs/evals/';
const DEFAULT_TRIALS = 3;
const SESSION_CAP = 120;
const CONCURRENCY = 4;
const SESSION_TIMEOUT_MS = 40 * 60 * 1000;
const STATE_ROOT = join(homedir(), '.local/state/cairn-docs-evals');

/** The tools a docs session gets; the `:*` form is avoided because `check:*` would deny `check:docs-gate`. */
export const ALLOWED_TOOLS = [
  'Read', 'Grep', 'Glob', 'Edit', 'Write', 'Skill', 'Agent',
  'Bash(npm run check*)', 'Bash(node scripts/checks/*)', 'Bash(cairn-run-gate *)',
  'Bash(git -C * diff *)', 'Bash(git -C * grep *)', 'Bash(git -C * show *)',
  'Bash(git diff*)', 'Bash(git status*)', 'Bash(git log*)', 'Bash(git add *)', 'Bash(git commit *)',
  'Bash(jq *)', 'Bash(mkdir *)',
  // The read-only filters a compound command pipes through; a real session's allow rules carry them.
  'Bash(tail *)', 'Bash(head *)', 'Bash(echo *)', 'Bash(sed -n *)', 'Bash(wc *)', 'Bash(cat *)',
  'Bash(ls*)', 'Bash(grep *)', 'Bash(awk *)', 'Bash(sort*)', 'Bash(uniq*)', 'Bash(cut *)', 'Bash(tr *)',
  'Bash(diff *)', 'Bash(printf *)', 'Bash(git ls-files*)', 'Bash(git rev-parse*)',
  'Bash(git -C * log *)', 'Bash(git -C * status*)',
];

/** Denies win over the user's allow rules in `~/.claude/settings.json`. */
export const DENIED_TOOLS = [
  'Bash(approval-queue *)', 'Bash(gh *)', 'Bash(git push*)', 'Bash(ssh *)', 'WebFetch', 'WebSearch',
];

/** Where a denied command is a fault: the allow list was meant to cover it. */
const NEEDED_COMMAND = /^\s*(npm run check|node scripts\/checks\/|cairn-run-gate |git (-C \S+ )?(diff|grep|show|status|log|add|commit)\b|jq |mkdir )/;
/** Where a denied command is an attempt at something the harness forbids. */
const FORBIDDEN_COMMAND = /^\s*(approval-queue|gh|ssh|git push)\b/;

// ---------------------------------------------------------------------------------------------
// Arguments and the cases file

/**
 * Parse the CLI: one or two refs and the flags.
 * @param {string[]} argv
 * @returns {{ refs: string[], suite: string, caseId: string | null, trials: number, max: boolean, keep: boolean }}
 */
export function parseArgs(argv) {
  const out = { refs: [], suite: 'all', caseId: null, trials: DEFAULT_TRIALS, max: false, keep: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--suite') out.suite = argv[++i];
    else if (a === '--case') out.caseId = argv[++i];
    else if (a === '--trials') out.trials = Number(argv[++i]);
    else if (a === '--max') out.max = true;
    else if (a === '--keep') out.keep = true;
    else if (a.startsWith('--')) throw new Error(`unknown flag ${a}`);
    else out.refs.push(a);
  }
  if (out.refs.length < 1 || out.refs.length > 2) throw new Error('give one or two refs');
  if (!['regression', 'capability', 'all'].includes(out.suite)) throw new Error(`bad --suite ${out.suite}`);
  if (!Number.isInteger(out.trials) || out.trials < 1) throw new Error('--trials takes a positive integer');
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
    if (!['regression', 'capability'].includes(c.suite)) problems.push(`${id}: suite must be regression or capability`);
    if (typeof c.pin !== 'string' || !/^[0-9a-f]{7,40}$/.test(c.pin)) problems.push(`${id}: pin must be a commit sha`);
    if (c.setup !== undefined && (typeof c.setup !== 'string' || !existsSync(join(HERE, c.setup)))) {
      problems.push(`${id}: setup file ${c.setup} is missing`);
    }
    if (!Array.isArray(c.checks) || c.checks.length === 0) problems.push(`${id}: checks missing`);
    for (const k of c.checks ?? []) {
      if (!CHECK_TYPES.has(k.type)) problems.push(`${id}: unknown check type ${k.type}`);
    }
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
 * @param {{ readOnly?: boolean, agent?: string }} c
 */
export function claudeArgs(c) {
  const denied = [...DENIED_TOOLS, ...(c.readOnly ? ['Edit', 'Write', 'NotebookEdit'] : [])];
  const args = ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits'];
  if (c.agent) args.push('--agent', c.agent);
  else args.push('--model', 'sonnet', '--effort', 'medium');
  // The variadic tool flags would swallow a trailing prompt, so the prompt goes in on stdin.
  args.push('--allowedTools', ALLOWED_TOOLS.join(','), '--disallowedTools', denied.join(','));
  return args;
}

// ---------------------------------------------------------------------------------------------
// The overlay

const OVERLAY_DIR = '.claude/skills/cairn-docs/';
const OVERLAY_FILES = ['.claude/agents/docs-fact-checker.md', 'CLAUDE.md'];
const OVERLAY_RULE = /^\.claude\/rules\/docs[^/]*\.md$/;

/**
 * The docs-process paths in a tree listing, leaving the skill's `evals/` out.
 * @param {string[]} names repo-relative file paths
 */
export function overlayPaths(names) {
  return names.filter((n) => {
    if (n.startsWith(EVALS_DIR_REL)) return false;
    return n.startsWith(OVERLAY_DIR) || OVERLAY_FILES.includes(n) || OVERLAY_RULE.test(n);
  });
}

/**
 * Delete the overlay paths from a fixture: the skill's files except `evals/`, the agent, the docs
 * rules, and CLAUDE.md.
 * @param {string} root
 */
export function deleteOverlay(root) {
  const skill = join(root, OVERLAY_DIR);
  if (existsSync(skill)) {
    for (const name of readdirSync(skill)) if (name !== 'evals') rmSync(join(skill, name), { recursive: true, force: true });
  }
  for (const f of OVERLAY_FILES) rmSync(join(root, f), { force: true });
  const rules = join(root, '.claude/rules');
  if (existsSync(rules)) {
    for (const name of readdirSync(rules)) if (OVERLAY_RULE.test(`.claude/rules/${name}`)) rmSync(join(rules, name), { force: true });
  }
}

function git(args, cwd, opts = {}) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

/**
 * Extract the overlay paths of `ref` into a fixture, leaving `evals/` out.
 * @param {string} repo
 * @param {string} ref
 * @param {string} root
 */
export function extractOverlay(repo, ref, root) {
  const names = git(['ls-tree', '-r', '--name-only', ref], repo).split('\n').filter(Boolean);
  const paths = overlayPaths(names);
  if (paths.length === 0) return [];
  const tar = execFileSync('git', ['archive', '--format=tar', ref, '--', ...paths], { cwd: repo, maxBuffer: 512 * 1024 * 1024 });
  const r = spawnSync('tar', ['-x', '-C', root], { input: tar });
  if (r.status !== 0) throw new Error(`tar extract failed: ${r.stderr}`);
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
  return {
    init: init && { apiKeySource: init.apiKeySource, skills: init.skills ?? [], cwd: init.cwd },
    result: result && {
      isError: Boolean(result.is_error), subtype: result.subtype,
      denials: result.permission_denials ?? [], reply: result.result ?? lastText,
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
  return s.result.isError || !['success', 'error_max_turns'].includes(s.result.subtype);
}

/**
 * Sort a result's permission denials into harness faults (a needed command) and attempts at a
 * forbidden one.
 * @param {{ tool_name: string, tool_input?: { command?: string } }[]} denials
 */
export function classifyDenials(denials, tools = []) {
  const faults = [];
  const attempts = [];
  const deniedIds = new Set(denials.map((d) => d.tool_use_id));
  const lead = (c) => c.split(/[;&|]/)[0].trim();
  for (const d of denials) {
    const cmd = d.tool_input?.command ?? '';
    if (d.tool_name !== 'Bash') continue;
    if (FORBIDDEN_COMMAND.test(cmd)) attempts.push(cmd);
    else if (NEEDED_COMMAND.test(cmd)) {
      // A compound command the permission check could not verify is denied whole. The session
      // reissuing its leading command and getting through leaves the process unharmed.
      const recovered = tools.some((t) => t.name === 'Bash' && !deniedIds.has(t.id) && lead(t.input.command ?? '') === lead(cmd));
      if (!recovered) faults.push(cmd);
    }
  }
  return { faults, attempts };
}

/**
 * The tool-call diagnostics: whether `cairn-docs` loaded before the first edit under `docs/`.
 * @param {{ name: string, input: any }[]} tools
 */
export function skillBeforeDocsEdit(tools) {
  const skillAt = tools.findIndex((t) => t.name === 'Skill' && /cairn-docs/.test(t.input.skill ?? ''));
  const editAt = tools.findIndex((t) => ['Edit', 'Write'].includes(t.name) && /(^|\/)docs\//.test(t.input.file_path ?? ''));
  if (editAt === -1) return null;
  return skillAt !== -1 && skillAt < editAt;
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

function commitAll(root, message) {
  git(['add', '-A'], root);
  git(['-c', 'user.name=docs-eval', '-c', 'user.email=docs-eval@localhost', 'commit', '--allow-empty', '--no-verify', '-q', '-m', message], root);
  return git(['rev-parse', 'HEAD'], root).trim();
}

/**
 * Build a fixture worktree: the pin, the arm's overlay, the case's setup, each committed.
 * @returns {Promise<{ root: string, base: string, commit: string }>}
 */
async function makeFixture({ repo, mainRoot, caseDef, pin, armRef, name, modulesDir }) {
  const root = join(mainRoot, '.claude/worktrees', name);
  git(['worktree', 'add', '--detach', root, pin], repo);
  liveFixtures.set(root, repo);
  deleteOverlay(root);
  extractOverlay(repo, armRef, root);
  const base = commitAll(root, 'fixture overlay');
  if (caseDef.setup) {
    const mod = await import(pathToFileURL(join(HERE, caseDef.setup)).href);
    mod.default(root);
    if (git(['status', '--porcelain'], root).trim() === '') throw new Error(`setup ${caseDef.setup} changed nothing at ${pin}`);
  }
  const commit = commitAll(root, 'fixture setup');
  if (caseDef.install !== false) {
    const r = spawnSync('cp', ['-al', join(modulesDir, 'node_modules'), join(root, 'node_modules')]);
    if (r.status !== 0) throw new Error(`cp -al node_modules failed: ${r.stderr}`);
  }
  return { root, base, commit };
}

/** Remove the fixtures an aborted run left behind: `docs-eval-*` worktrees idle for three hours. */
function pruneFixtures(repo, mainRoot) {
  const dir = join(mainRoot, '.claude/worktrees');
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!/^docs-eval-\d/.test(name) || Date.now() - statSync(path).mtimeMs < 3 * 3600 * 1000) continue;
    removeFixture(repo, path);
  }
}

const liveFixtures = new Map();

function removeFixture(repo, root) {
  liveFixtures.delete(root);
  spawnSync('git', ['worktree', 'remove', '--force', root], { cwd: repo });
  rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------------------------
// Sessions

const children = new Set();
let aborted = null;

function abortRun(reason) {
  if (aborted) return;
  aborted = reason;
  for (const c of children) c.kill('SIGTERM');
}

function sessionEnv(extra = {}) {
  // A headless `-p` run exits soon after the model launches a background subagent, before the
  // result returns (anthropics/claude-code#73453), so sessions run their subagents in the foreground.
  const env = { ...process.env, CAIRN_GATE_LANE: 'light', CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: '1', ...extra };
  delete env.ANTHROPIC_API_KEY;
  return env;
}

/** Run one headless session, saving its stream to `file`; resolves with the exit code. */
function runSession({ cwd, args, prompt, file }) {
  return new Promise((resolveRun) => {
    const out = createWriteStream(file);
    const child = spawn('claude', args, { cwd, env: sessionEnv(), stdio: ['pipe', 'pipe', 'pipe'] });
    children.add(child);
    let buf = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, SESSION_TIMEOUT_MS);
    child.stdout.on('data', (d) => {
      out.write(d);
      buf += d;
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.includes('"subtype":"init"')) continue;
        try {
          const e = JSON.parse(line);
          if (e.type === 'system' && e.subtype === 'init' && e.apiKeySource !== 'none') abortRun(`apiKeySource is ${e.apiKeySource}, not none`);
        } catch { /* not an event */ }
      }
    });
    child.stderr.pipe(createWriteStream(`${file}.stderr`));
    child.on('close', (code, signal) => { clearTimeout(timer); children.delete(child); out.end(() => resolveRun({ code, signal, timedOut })); });
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
  const r = spawnSync('claude', args, { cwd, env: sessionEnv(), input: prompt, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  rmSync(cwd, { recursive: true, force: true });
  writeFileSync(file, r.stdout ?? '');
  try {
    const out = JSON.parse(r.stdout);
    const v = out.structured_output ?? JSON.parse(out.result);
    return v.verdicts;
  } catch {
    return assertions.map((a) => ({ n: a.n, verdict: 'unknown', reason: 'the judge call returned no verdicts' }));
  }
}

/** Run a gate string on the light lane through `cairn-run-gate`, re-issuing on exit 75. */
function runGate(root, gate) {
  for (let i = 0; i < 30; i++) {
    const r = spawnSync('cairn-run-gate', [gate], { cwd: root, env: sessionEnv(), encoding: 'utf8', timeout: 12 * 60 * 1000 });
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
async function runTrial({ job, ctx }) {
  const { caseDef, arm, trial } = job;
  const stem = `${caseDef.id}-${arm.label}-${trial}`;
  const transcript = join(ctx.stateDir, `${stem}.jsonl`);
  const record = { caseId: caseDef.id, arm: arm.label, trial, transcript, status: 'graded', pass: false, checks: [], judge: [], diagnostics: {} };
  let fixture;
  try {
    fixture = await makeFixture({
      repo: ctx.repo, mainRoot: ctx.mainRoot, caseDef, pin: caseDef.pinFull, armRef: arm.ref,
      name: `docs-eval-${ctx.runId}-${caseDef.id}-${arm.label}-${trial}`, modulesDir: ctx.modules.get(caseDef.pinFull),
    });
  } catch (e) {
    return { ...record, status: 'fault', detail: `fixture: ${e.message}` };
  }
  try {
    const prompt = renderPrompt(caseDef.prompt, { repo: fixture.root, base: fixture.base, commit: fixture.commit });
    const { timedOut, code, signal } = await runSession({ cwd: fixture.root, args: claudeArgs(caseDef), prompt, file: transcript });
    if (aborted) return { ...record, status: 'error', detail: `run aborted: ${aborted}` };
    const s = summarizeStream(readFileSync(transcript, 'utf8'));
    record.diagnostics = {
      skillBeforeDocsEdit: skillBeforeDocsEdit(s.tools),
      deniedAttempts: classifyDenials(s.result?.denials ?? []).attempts,
      overlayHash: arm.hash,
      dotfilesCommit: ctx.dotfiles,
    };
    if (timedOut || sessionErrored(s)) return { ...record, status: 'error', detail: timedOut ? 'timed out' : `${s.result?.subtype ?? 'no result'} (exit ${code}, signal ${signal})` };
    const faults = classifyDenials(s.result.denials, s.tools).faults;
    if (!s.init?.skills.includes('cairn-docs')) return { ...record, status: 'fault', detail: 'cairn-docs missing from the session skills' };
    // A read-only case asks about work outside the repo, where a denied `ls` is the right outcome.
    if (!caseDef.readOnly && faults.length) return { ...record, status: 'fault', detail: `a needed command was denied: ${faults[0]}` };

    git(['add', '-A'], fixture.root);
    const changed = git(['diff', '--cached', '--name-status', fixture.commit], fixture.root).split('\n').filter(Boolean)
      .map((l) => { const [status, ...p] = l.split('\t'); return { status: status[0], path: p[p.length - 1] }; });
    const diff = git(['diff', '--cached', fixture.commit], fixture.root);
    writeFileSync(join(ctx.stateDir, `${stem}.diff`), diff);

    const cctx = { root: fixture.root, changed, tools: s.tools, reply: s.reply, runGate: (g) => runGate(fixture.root, g) };
    const checks = [...caseDef.checks, ...(caseDef.readOnly ? [] : implicitDocsChecks(changed))];
    record.checks = checks.map((k) => ({ type: k.type, ...runCheck(k, cctx) }));
    if (caseDef.judge?.length) {
      ctx.judgeCalls++;
      record.judge = await judgeTrial({ assertions: caseDef.judge, diff, reply: s.reply, toolLog: toolLog(s.tools), file: join(ctx.stateDir, `${stem}.judge.json`) });
    }
    record.pass = record.checks.every((c) => c.ok) && caseDef.judge?.every((a) => record.judge.find((v) => v.n === a.n)?.verdict === 'pass') !== false;
    record.unknownJudge = record.judge.some((v) => v.verdict === 'unknown');
    return record;
  } finally {
    if (!ctx.keep) removeFixture(ctx.repo, fixture.root);
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
  const data = JSON.parse(readFileSync(join(HERE, 'evals.json'), 'utf8'));
  const problems = validateEvals(data);
  if (problems.length) throw new Error(`evals.json is invalid:\n${problems.join('\n')}`);

  const repo = git(['rev-parse', '--show-toplevel'], process.cwd()).trim();
  const mainRoot = mainCheckoutRoot(repo);
  const cases = data.evals.filter((c) => (args.suite === 'all' || c.suite === args.suite) && (!args.caseId || c.id === args.caseId));
  if (cases.length === 0) throw new Error('no case matches');
  pruneFixtures(repo, mainRoot);
  const arms = args.refs.map((ref) => ({ ref, label: ref.replace(/[^\w.-]/g, '_'), hash: overlayHash(repo, ref) }));
  const sessions = cases.length * arms.length * args.trials;
  if (sessions > SESSION_CAP && !args.max) throw new Error(`${sessions} case sessions is over the cap of ${SESSION_CAP}; pass --max to run anyway`);

  const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
  const stateDir = join(STATE_ROOT, runId);
  mkdirSync(stateDir, { recursive: true });
  for (const c of cases) c.pinFull = git(['rev-parse', c.pin], repo).trim();
  const modules = new Map();
  for (const c of cases.filter((c) => c.install !== false)) {
    if (!modules.has(c.pinFull)) modules.set(c.pinFull, prepareModules(repo, mainRoot, c.pinFull));
  }
  const dotfiles = spawnSync('git', ['-C', join(homedir(), '.dotfiles'), 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  const ctx = { repo, mainRoot, runId, stateDir, modules, dotfiles, judgeCalls: 0, keep: args.keep };

  const jobs = [];
  for (const caseDef of cases) for (const arm of arms) for (let trial = 1; trial <= args.trials; trial++) jobs.push({ caseDef, arm, trial });
  console.error(`run ${runId}: ${sessions} case sessions, state in ${stateDir}`);
  const results = await pool(jobs, CONCURRENCY, async (job) => {
    const r = await runTrial({ job, ctx });
    console.error(`  ${r.caseId} ${r.arm} #${r.trial}: ${r.status}${r.status === 'graded' ? (r.pass ? ' pass' : ' FAIL') : ` (${r.detail})`}`);
    return r;
  });

  if (aborted) {
    console.error(`run aborted: ${aborted}`);
    process.exitCode = 3;
    return;
  }
  const table = renderTable(results, arms.map((a) => a.label));
  const header = [
    `Run ${runId}: ${sessions} case sessions, ${ctx.judgeCalls} judge calls (not counted against the cap).`,
    ...arms.map((a) => `Arm \`${a.label}\`: ref ${git(['rev-parse', '--short', a.ref], repo).trim()}, overlay ${a.hash}.`),
    `main checkout ${git(['rev-parse', '--short', 'HEAD'], mainRoot).trim()}, ~/.dotfiles ${dotfiles}.`,
  ].join('\n');
  writeFileSync(join(stateDir, 'results.json'), JSON.stringify({ runId, arms, results }, null, 2));
  writeFileSync(join(stateDir, 'table.md'), `${header}\n\n${table}\n`);
  console.log(`${header}\n\n${table}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // A stopped run takes its sessions and fixtures with it.
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      abortRun('interrupted');
      for (const [root, repo] of liveFixtures) removeFixture(repo, root);
      process.exit(3);
    });
  }
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
