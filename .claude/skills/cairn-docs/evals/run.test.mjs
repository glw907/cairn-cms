// Tests for the eval runner: the grader, the overlay's delete-then-extract, the pass^k arithmetic,
// and the cases file, all over canned input. Run with `npm run test:emit`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  claudeArgs, classifyDenials, deleteOverlay, extractOverlay, gradeVerdicts, implicitDocsChecks,
  overlayHash, overlayPaths, parseArgs, rates, renderPrompt, renderTable, runCheck,
  sessionErrored, skillBeforeDocsEdit, summarizeStream, validateEvals,
} from './run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });

/** A repo with an old docs-process set, then a new one on `new`, evals kept in both. */
function overlayRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'evals-overlay-'));
  const put = (p, text) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), text); };
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  put('.claude/skills/cairn-docs/SKILL.md', 'old skill');
  put('.claude/skills/cairn-docs/references/old.md', 'old ref');
  put('.claude/skills/cairn-docs/evals/keep.json', 'keep');
  put('.claude/rules/docs.md', 'old rule');
  put('.claude/rules/other.md', 'unrelated');
  put('CLAUDE.md', 'old claude');
  put('src/a.ts', 'code');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'old');
  git(dir, 'tag', 'old');
  put('.claude/skills/cairn-docs/SKILL.md', 'new skill');
  rmSync(join(dir, '.claude/skills/cairn-docs/references'), { recursive: true });
  put('.claude/skills/cairn-docs/evals/new-eval-file.json', 'must not extract');
  put('.claude/rules/docs-with-code.md', 'new rule');
  put('.claude/agents/docs-fact-checker.md', 'agent');
  put('CLAUDE.md', 'new claude');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'new');
  git(dir, 'tag', 'new');
  return dir;
}

test('overlayPaths takes the skill, agent, docs rules, and CLAUDE.md, and never evals', () => {
  const names = [
    '.claude/skills/cairn-docs/SKILL.md', '.claude/skills/cairn-docs/evals/run.mjs', '.claude/skills/other/SKILL.md',
    '.claude/agents/docs-fact-checker.md', '.claude/agents/other.md', '.claude/rules/docs.md',
    '.claude/rules/docs-with-code.md', '.claude/rules/evals-docs-process.md', 'CLAUDE.md', 'docs/CLAUDE.md',
  ];
  assert.deepEqual(overlayPaths(names), [
    '.claude/skills/cairn-docs/SKILL.md', '.claude/agents/docs-fact-checker.md', '.claude/rules/docs.md',
    '.claude/rules/docs-with-code.md', 'CLAUDE.md',
  ]);
});

test('delete-then-extract swaps the arm in, drops what the arm lacks, and leaves evals and other files', () => {
  const repo = overlayRepo();
  const root = mkdtempSync(join(tmpdir(), 'evals-fixture-'));
  try {
    git(repo, 'worktree', 'add', '--detach', join(root, 'wt'), 'old');
    const wt = join(root, 'wt');
    deleteOverlay(wt);
    assert.equal(existsSync(join(wt, '.claude/skills/cairn-docs/SKILL.md')), false);
    assert.equal(existsSync(join(wt, '.claude/skills/cairn-docs/references')), false);
    assert.equal(existsSync(join(wt, '.claude/skills/cairn-docs/evals/keep.json')), true);
    assert.equal(existsSync(join(wt, '.claude/rules/other.md')), true);
    const got = extractOverlay(repo, 'new', wt);
    assert.equal(readFileSync(join(wt, '.claude/skills/cairn-docs/SKILL.md'), 'utf8'), 'new skill');
    assert.equal(readFileSync(join(wt, 'CLAUDE.md'), 'utf8'), 'new claude');
    assert.equal(readFileSync(join(wt, '.claude/rules/docs-with-code.md'), 'utf8'), 'new rule');
    assert.equal(existsSync(join(wt, '.claude/rules/docs.md')), true, 'docs.md exists in both arms');
    assert.equal(existsSync(join(wt, '.claude/skills/cairn-docs/references')), false, 'the old arm file is gone');
    assert.equal(existsSync(join(wt, '.claude/skills/cairn-docs/evals/new-eval-file.json')), false, 'evals/ is never extracted');
    assert.ok(got.includes('.claude/agents/docs-fact-checker.md'));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});

test('overlayHash differs between arms with different overlays and ignores other files', () => {
  const repo = overlayRepo();
  try {
    assert.notEqual(overlayHash(repo, 'old'), overlayHash(repo, 'new'));
    assert.equal(overlayHash(repo, 'new'), overlayHash(repo, 'new'));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('parseArgs reads refs and flags and rejects a bad shape', () => {
  assert.deepEqual(parseArgs(['main', '--suite', 'regression', '--trials', '5', '--max']),
    { refs: ['main'], suite: 'regression', caseId: null, trials: 5, max: true, keep: false });
  assert.deepEqual(parseArgs(['a', 'b', '--case', 'x']).refs, ['a', 'b']);
  assert.throws(() => parseArgs([]), /one or two refs/);
  assert.throws(() => parseArgs(['a', 'b', 'c']), /one or two refs/);
  assert.throws(() => parseArgs(['a', '--suite', 'nope']), /--suite/);
  assert.throws(() => parseArgs(['a', '--trials', '0']), /positive integer/);
  assert.throws(() => parseArgs(['a', '--wat']), /unknown flag/);
});

test('rates drops errors from the denominator, and pass^k needs every graded trial to pass', () => {
  const t = (status, pass) => ({ status, pass });
  assert.deepEqual(rates([t('graded', true), t('graded', true), t('graded', true)]), { graded: 3, passed: 3, errors: 0, faults: 0, passAll: true });
  assert.deepEqual(rates([t('graded', true), t('graded', false), t('graded', true)]), { graded: 3, passed: 2, errors: 0, faults: 0, passAll: false });
  assert.deepEqual(rates([t('graded', true), t('error'), t('fault')]), { graded: 1, passed: 1, errors: 1, faults: 1, passAll: true });
  assert.equal(rates([t('error'), t('error')]).passAll, false, 'no graded trial is not a pass');
});

test('renderTable prints one row per case and arm, linking each failing transcript', () => {
  const rows = [
    { caseId: 'c1', arm: 'main', status: 'graded', pass: true, transcript: '/s/c1-main-1.jsonl' },
    { caseId: 'c1', arm: 'main', status: 'graded', pass: false, transcript: '/s/c1-main-2.jsonl' },
    { caseId: 'c1', arm: 'br', status: 'graded', pass: true, transcript: '/s/c1-br-1.jsonl' },
  ];
  const table = renderTable(rows, ['main', 'br']);
  assert.match(table, /\| c1 \| main \| 1\/2 \| ✗ \(k=2\) \| 0 \| 0 \| `\/s\/c1-main-2\.jsonl` \|/);
  assert.match(table, /\| c1 \| br \| 1\/1 \| ✓ \(k=1\) \| 0 \| 0 \| - \|/);
});

const STREAM = [
  { type: 'system', subtype: 'hook_started' },
  { type: 'system', subtype: 'init', apiKeySource: 'none', skills: ['cairn-docs', 'x'], cwd: '/w' },
  { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/w/src/lib/sveltekit/content-routes-tidy.ts' } }] } },
  { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'cairn-docs' } }] } },
  { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: '/w/docs/extend/a.md' } }] } },
  { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'npm run check:docs-gate' } }] } },
  { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Task', input: { subagent_type: 'docs-fact-checker' } }] } },
  { type: 'assistant', parent_tool_use_id: 't', message: { content: [{ type: 'text', text: 'sub reply' }] } },
  { type: 'result', subtype: 'success', is_error: false, result: 'done', permission_denials: [
    { tool_name: 'Bash', tool_input: { command: 'gh pr list' } },
    { tool_name: 'Bash', tool_input: { command: 'npm run check:docs-gate -- --page x | tee y' } },
    { tool_name: 'Bash', tool_input: { command: 'curl example.com' } },
  ] },
].map((e) => JSON.stringify(e)).join('\n') + '\n{"type":"assis';

test('summarizeStream reads init, tool calls (Task as Agent), reply, and survives a truncated line', () => {
  const s = summarizeStream(STREAM);
  assert.equal(s.init.apiKeySource, 'none');
  assert.deepEqual(s.init.skills, ['cairn-docs', 'x']);
  assert.deepEqual(s.tools.map((t) => t.name), ['Read', 'Skill', 'Edit', 'Bash', 'Agent']);
  assert.equal(s.reply, 'done');
  assert.equal(sessionErrored(s), false);
  assert.equal(skillBeforeDocsEdit(s.tools), true);
});

test('summarizeStream pairs each tool call with its result for the judge', () => {
  const events = [
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'u1', name: 'Bash', input: { command: 'git grep -n x' } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'u1', content: [{ type: 'text', text: 'docs/a.md:1:x' }] }] } },
  ].map((e) => JSON.stringify(e)).join('\n');
  assert.equal(summarizeStream(events).tools[0].output, 'docs/a.md:1:x');
});

test('sessionErrored flags a missing result, is_error, and a usage-limit subtype, but not max turns', () => {
  assert.equal(sessionErrored(summarizeStream('')), true);
  assert.equal(sessionErrored(summarizeStream('{"type":"result","subtype":"success","is_error":true}')), true);
  assert.equal(sessionErrored(summarizeStream('{"type":"result","subtype":"error_during_execution","is_error":false}')), true);
  assert.equal(sessionErrored(summarizeStream('{"type":"result","subtype":"error_max_turns","is_error":false}')), false);
});

test('classifyDenials separates a needed command (fault) from a forbidden attempt and from noise', () => {
  const { faults, attempts } = classifyDenials(summarizeStream(STREAM).result.denials);
  assert.deepEqual(attempts, ['gh pr list']);
  assert.deepEqual(faults, ['npm run check:docs-gate -- --page x | tee y']);
});

test('skillBeforeDocsEdit is null with no docs edit and false when the edit comes first', () => {
  assert.equal(skillBeforeDocsEdit([{ name: 'Read', input: {} }]), null);
  assert.equal(skillBeforeDocsEdit([{ name: 'Edit', input: { file_path: '/w/docs/a.md' } }, { name: 'Skill', input: { skill: 'cairn-docs' } }]), false);
});

test('claudeArgs keeps the prompt out of argv, uses the agent model for an agent case, and denies edits when readOnly', () => {
  const plain = claudeArgs({});
  assert.ok(plain.includes('--model') && plain.includes('sonnet'));
  assert.ok(plain.includes('Bash(git push*)') === false && plain.join(' ').includes('Bash(git push*)'));
  const agent = claudeArgs({ agent: 'docs-fact-checker' });
  assert.ok(agent.includes('--agent') && !agent.includes('--model'));
  const ro = claudeArgs({ readOnly: true });
  assert.match(ro[ro.indexOf('--disallowedTools') + 1], /Edit,Write,NotebookEdit/);
});

test('renderPrompt fills {repo}, {base}, and {commit}', () => {
  assert.equal(renderPrompt('{repo} {base}..{commit} {repo}', { repo: 'R', base: 'B', commit: 'C' }), 'R B..C R');
});

/** A finished tree for the check tests. */
function tree() {
  const root = mkdtempSync(join(tmpdir(), 'evals-tree-'));
  mkdirSync(join(root, 'docs/extend'), { recursive: true });
  writeFileSync(join(root, 'docs/extend/a.md'), 'The cap is 24,000 characters.\nUses itemTitle.\n');
  writeFileSync(join(root, 'docs/extend/seed.md'), 'intro\nclaim one\nclaim two\n');
  return root;
}

test('runCheck: contains, absent, changed, unchanged, and noNewFiles read the tree and the diff', () => {
  const root = tree();
  try {
    const changed = [{ status: 'M', path: 'docs/extend/a.md' }, { status: 'A', path: 'docs/extend/new.md' }];
    const ctx = { root, changed, tools: [], reply: '', runGate: () => true };
    assert.equal(runCheck({ type: 'contains', path: 'docs', text: '24,000 characters' }, ctx).ok, true);
    assert.equal(runCheck({ type: 'contains', path: 'docs/extend/a.md', regex: 'item(Title|Label)' }, ctx).ok, true);
    assert.equal(runCheck({ type: 'absent', path: 'docs', text: 'itemLabel' }, ctx).ok, true);
    assert.equal(runCheck({ type: 'absent', path: 'docs/extend/a.md', text: 'itemTitle' }, ctx).ok, false);
    assert.equal(runCheck({ type: 'contains', path: 'docs/missing', text: 'x' }, ctx).ok, false);
    assert.equal(runCheck({ type: 'changed', path: 'docs/extend/a.md' }, ctx).ok, true);
    assert.equal(runCheck({ type: 'changed', path: 'docs/extend/' }, ctx).ok, true);
    assert.equal(runCheck({ type: 'unchanged', path: 'src/lib' }, ctx).ok, true);
    assert.equal(runCheck({ type: 'noNewFiles', under: 'docs/extend/' }, ctx).ok, false);
    assert.equal(runCheck({ type: 'noNewFiles', under: 'docs/reference/' }, ctx).ok, true);
    assert.equal(runCheck({ type: 'npm', script: 'check:options' }, { ...ctx, runGate: (g) => g === 'npm run check:options' }).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runCheck: transcript checks read the tool calls', () => {
  const tools = summarizeStream(STREAM).tools;
  const ctx = { root: '/nowhere', changed: [], tools, reply: '', runGate: () => true };
  assert.equal(runCheck({ type: 'bash', pattern: 'check:docs-gate' }, ctx).ok, true);
  assert.equal(runCheck({ type: 'bash', pattern: 'check:surface' }, ctx).ok, false);
  assert.equal(runCheck({ type: 'agent', name: 'docs-fact-checker' }, ctx).ok, true);
  assert.equal(runCheck({ type: 'agent', name: 'other' }, ctx).ok, false);
  assert.equal(runCheck({ type: 'read', path: 'content-routes-tidy.ts', beforeEdit: true }, ctx).ok, true);
  assert.equal(runCheck({ type: 'skillNotCalled', name: 'cairn-docs' }, ctx).ok, false);
  assert.equal(runCheck({ type: 'skillNotCalled', name: 'other-skill' }, ctx).ok, true);
});

test('implicitDocsChecks owes the gate and the fact-check only when docs changed', () => {
  assert.deepEqual(implicitDocsChecks([{ path: 'src/a.ts' }]), []);
  assert.deepEqual(implicitDocsChecks([{ path: 'docs/a.md' }]).map((c) => c.type), ['bash', 'agent']);
});

test('gradeVerdicts counts a wrong or imprecise verdict on a false line as found and on a true line as a false positive', () => {
  const key = [{ claim: 'claim one', true: true }, { claim: 'claim two', true: false }];
  const page = 'intro\nclaim one\nclaim two\n';
  const reply = (v) => `\`\`\`json\n${JSON.stringify(v)}\n\`\`\``;
  assert.equal(gradeVerdicts(reply([{ line: 2, verdict: 'holds' }, { line: 3, verdict: 'wrong' }]), key, page).ok, true);
  assert.equal(gradeVerdicts(reply([{ line: 2, verdict: 'holds' }, { line: 3, verdict: 'imprecise' }]), key, page).ok, true);
  assert.equal(gradeVerdicts(reply([{ line: 2, verdict: 'holds' }, { line: 3, verdict: 'holds' }]), key, page).ok, false);
  const fp = gradeVerdicts(reply([{ line: 2, verdict: 'wrong' }, { line: 3, verdict: 'wrong' }]), key, page);
  assert.equal(fp.ok, true, 'one false positive is allowed');
  assert.equal(gradeVerdicts('no array', key, page).ok, false);
  const two = [{ claim: 'claim one', true: true }, { claim: 'claim two', true: true }, { claim: 'claim x', true: false }];
  assert.equal(gradeVerdicts(reply([{ line: 2, verdict: 'wrong' }, { line: 3, verdict: 'wrong' }]), two, 'i\nclaim one\nclaim two\nclaim x\n').ok, false, 'two false positives and a miss fail');
});

test('evals.json passes the schema and every setup applies at the pin', async (t) => {
  const data = JSON.parse(readFileSync(join(HERE, 'evals.json'), 'utf8'));
  assert.deepEqual(validateEvals(data), []);
  assert.ok(data.evals.every((c) => c.pin === '663ac5aeb'), 'every case pins 663ac5aeb');
  const top = git(HERE, 'rev-parse', '--show-toplevel').trim();
  const pin = '663ac5aeb';
  try { git(top, 'cat-file', '-e', `${pin}^{commit}`); } catch { return t.skip(`${pin} is not in this clone`); }
  for (const c of data.evals.filter((e) => e.setup)) {
    const dir = mkdtempSync(join(tmpdir(), 'evals-setup-'));
    try {
      git(top, 'worktree', 'add', '--detach', join(dir, 'wt'), pin);
      const mod = await import(pathToFileURL(join(HERE, c.setup)).href);
      mod.default(join(dir, 'wt'));
      assert.notEqual(git(join(dir, 'wt'), 'status', '--porcelain').trim(), '', `${c.id}: the setup changed nothing`);
    } finally {
      execFileSync('git', ['worktree', 'remove', '--force', join(dir, 'wt')], { cwd: top });
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('validateEvals reports a bad case', () => {
  const bad = { skill_name: 'x', evals: [{ id: 'a', prompt: 'p', expectations: ['e'], suite: 'nope', pin: 'zz', checks: [{ type: 'wat' }] }] };
  const problems = validateEvals(bad).join('\n');
  assert.match(problems, /suite must be/);
  assert.match(problems, /pin must be a commit sha/);
  assert.match(problems, /unknown check type wat/);
});
