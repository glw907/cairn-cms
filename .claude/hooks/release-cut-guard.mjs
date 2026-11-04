#!/usr/bin/env node
// cairn-cms: the stable-cut guard, a project-scope PreToolUse hook on Bash. For a `gh release
// create` command it applies four rules and otherwise stays silent, so the permission system still
// decides:
//   1. a tag that is not a literal (a shell variable or substitution) is denied;
//   2. a `vX.Y.Z-...` tag without `--prerelease` is denied, any hyphen included;
//   3. a stable `vX.Y.Z` tag needs `--target` to be a 40-hex sha;
//   4. that sha must equal the `sha:` line of `scripts/checks/check-stable-source.mjs`, run from the
//      repo root of the hook's cwd, and the check must exit 0.
// The hook fails closed: any exception emits a deny naming the error, and settings.json sets
// `onFailure: "block"` for a crash before this code runs. A deny is
// `hookSpecificOutput.permissionDecision: "deny"` with a reason; a pass prints nothing.
// Reference: https://code.claude.com/docs/en/hooks
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MATCH = /gh\s+release\s+create/;
const VALUE_FLAGS = new Set([
  '--target', '--title', '-t', '--notes', '-n', '--notes-file', '-F', '--repo', '-R',
  '--discussion-category', '--notes-start-tag'
]);

/** Print a deny decision and stop. */
function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `release-cut-guard: ${reason}`
      }
    })
  );
  process.exit(0);
}

/**
 * Split a command into shell-like tokens. Quotes group, a `$` or backtick outside single quotes marks
 * a token dynamic, and an unquoted `&&`, `||`, `;`, `|` or newline becomes an operator token.
 * @param {string} command
 * @returns {{ text: string, dynamic: boolean, op: boolean }[]}
 */
function tokenize(command) {
  const tokens = [];
  let cur = null;
  const start = () => (cur ??= { text: '', dynamic: false, op: false });
  const flush = () => {
    if (cur) tokens.push(cur);
    cur = null;
  };
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote === "'") {
      if (c === "'") quote = null;
      else start().text += c;
    } else if (quote === '"') {
      if (c === '"') quote = null;
      else if (c === '\\' && i + 1 < command.length) start().text += command[++i];
      else {
        if (c === '$' || c === '`') start().dynamic = true;
        start().text += c;
      }
    } else if (c === "'" || c === '"') {
      quote = c;
      start();
    } else if (c === '\\' && i + 1 < command.length) {
      start().text += command[++i];
    } else if (/\s/.test(c) && c !== '\n') {
      flush();
    } else if (c === '\n' || c === ';' || c === '|' || c === '&') {
      flush();
      const two = command.slice(i, i + 2);
      const text = two === '&&' || two === '||' ? two : c;
      if (text.length === 2) i++;
      tokens.push({ text, dynamic: false, op: true });
    } else {
      if (c === '$' || c === '`') start().dynamic = true;
      start().text += c;
    }
  }
  flush();
  return tokens;
}

/** The arguments after `gh release create`, up to the next operator. */
function releaseArgs(command) {
  const tokens = tokenize(command);
  for (let i = 0; i + 2 < tokens.length; i++) {
    const [a, b, c] = [tokens[i], tokens[i + 1], tokens[i + 2]];
    if (!a.op && a.text === 'gh' && b.text === 'release' && c.text === 'create') {
      const args = [];
      for (let j = i + 3; j < tokens.length && !tokens[j].op; j++) args.push(tokens[j]);
      return args;
    }
  }
  return null;
}

function run(input) {
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || !MATCH.test(command)) return;
  const args = releaseArgs(command);
  if (!args) deny('could not read the gh release create arguments');

  let tag = null;
  let target = null;
  let prerelease = false;
  for (let i = 0; i < args.length; i++) {
    const { text } = args[i];
    if (text === '--prerelease' || text === '-p' || text === '--prerelease=true') prerelease = true;
    else if (text.startsWith('--target=')) target = text.slice('--target='.length);
    else if (text === '--target') target = args[++i]?.dynamic ? '$' : (args[i]?.text ?? null);
    else if (VALUE_FLAGS.has(text)) i++;
    else if (text.startsWith('-')) continue;
    else if (tag === null) tag = args[i];
  }

  if (tag === null) deny('no literal tag argument found');
  if (tag.dynamic) deny(`the tag "${tag.text}" is not a literal; pass the tag as a literal string`);
  if (/^v\d+\.\d+\.\d+-/.test(tag.text) && !prerelease) {
    deny(`${tag.text} is a prerelease tag; pass --prerelease`);
  }
  if (!/^v\d+\.\d+\.\d+$/.test(tag.text)) return;

  if (target === null || !/^[0-9a-f]{40}$/.test(target)) {
    deny(`a stable release needs --target set to a literal 40-hex sha, got ${target ?? 'none'}`);
  }
  const top = spawnSync('git', ['-C', input.cwd ?? process.cwd(), 'rev-parse', '--show-toplevel'], {
    encoding: 'utf8'
  });
  if (top.status !== 0) deny(`cannot find the repo root: ${(top.stderr ?? '').trim()}`);
  const check = spawnSync('node', ['scripts/checks/check-stable-source.mjs'], {
    cwd: top.stdout.trim(),
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 1 << 24
  });
  if (check.status !== 0) {
    deny(`check-stable-source failed (status ${check.status}): ${(check.stderr ?? '').trim().slice(0, 500)}`);
  }
  const sha = /^sha: ([0-9a-f]{40})$/m.exec(check.stdout ?? '')?.[1];
  if (!sha) deny('check-stable-source printed no sha line');
  if (sha !== target) deny(`--target ${target} is not the checked source ${sha}`);
}

try {
  run(JSON.parse(readFileSync(0, 'utf8')));
} catch (e) {
  deny(`internal error: ${e instanceof Error ? e.message : String(e)}`);
}
