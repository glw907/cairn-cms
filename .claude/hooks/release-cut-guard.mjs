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
//
// What counts as a release command. The hook has no `if` filter, so it reads every Bash call that
// names `release`. It tokenizes the command and looks for an invocation where the shell would run
// one: in command position (after `env`-style wrappers and assignments), in `$(...)` or backticks,
// in the string of `bash -c`, `eval`, `ssh`, or `source`, in the body of a heredoc that feeds a shell,
// and behind `xargs`. The same words as data (a `grep` pattern, a commit message, a `cat` heredoc)
// are skipped. A variable in command position followed by `release create` is denied as unreadable.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MATCH = /\brelease\b/;
const VERBS = new Set(['create', 'new']);
const GLOBAL_VALUE_FLAGS = new Set(['-R', '--repo', '--hostname']);
const VALUE_FLAGS = new Set([
  '--target', '--title', '-t', '--notes', '-n', '--notes-file', '-F', '--repo', '-R',
  '--discussion-category', '--notes-start-tag'
]);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
const WRAPPERS = new Set(['env', 'command', 'exec', 'sudo', 'time', 'nohup', 'nice', 'builtin']);
const SSH_VALUE_FLAGS = new Set(['-p', '-i', '-l', '-o', '-F', '-J', '-b', '-c', '-D', '-E', '-e', '-I', '-L', '-m', '-O', '-Q', '-R', '-S', '-W', '-w']);
const XARGS_VALUE_FLAGS = new Set(['-I', '-n', '-P', '-d', '-L', '-E', '-s', '-a']);
const MAX_DEPTH = 6;

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

/** @typedef {{ text: string, dynamic: boolean, op: boolean }} Token */

/**
 * The text inside a `$(...)` whose `(` sits at `open`, and the index of its closing `)`.
 * @param {string} s
 * @param {number} open
 */
function captureParen(s, open) {
  let depth = 0;
  let q = null;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '\\' && q === '"') i++;
      else if (c === q) q = null;
    } else if (c === "'" || c === '"') q = c;
    else if (c === '\\') i++;
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return { content: s.slice(open + 1, i), end: i };
  }
  return { content: s.slice(open + 1), end: s.length - 1 };
}

/**
 * Split a command into shell-like tokens. Quotes group; a `$` or backtick outside single quotes marks
 * a token dynamic, and its `$(...)` or backtick body is returned in `subs` to be read as a command. An
 * unquoted `&&`, `||`, `;`, `|`, `(`, `)`, or newline becomes an operator token, a redirection and its
 * target word are dropped, and a heredoc body is captured with the index of the token that follows
 * its operator.
 * @param {string} command
 * @returns {{ tokens: Token[], heredocs: { at: number, body: string }[], subs: string[] }}
 */
function tokenize(command) {
  /** @type {Token[]} */
  const tokens = [];
  const heredocs = [];
  const subs = [];
  const pending = [];
  let cur = null;
  const start = () => (cur ??= { text: '', dynamic: false, op: false });
  let skipNext = false;
  const flush = () => {
    if (cur && skipNext) skipNext = false;
    else if (cur) tokens.push(cur);
    cur = null;
  };
  /** Read `$(...)` or a backtick body at `i`; returns the index to resume after. */
  const capture = (i) => {
    start().dynamic = true;
    cur.text += '$';
    if (command[i] === '`') {
      let j = i + 1;
      while (j < command.length && command[j] !== '`') j += command[j] === '\\' ? 2 : 1;
      subs.push(command.slice(i + 1, j));
      return j;
    }
    const { content, end } = captureParen(command, i + 1);
    subs.push(content);
    return end;
  };
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote === null && c === '\\' && command[i + 1] === '\n') {
      i++;
    } else if (quote === "'") {
      if (c === "'") quote = null;
      else start().text += c;
    } else if (quote === '"') {
      if (c === '"') quote = null;
      else if (c === '\\' && i + 1 < command.length) start().text += command[++i];
      else if ((c === '$' && command[i + 1] === '(' && command[i + 2] !== '(') || c === '`') i = capture(i);
      else {
        if (c === '$') start().dynamic = true;
        start().text += c;
      }
    } else if (c === "'" || c === '"') {
      quote = c;
      start();
    } else if (c === '\\' && i + 1 < command.length) {
      start().text += command[++i];
    } else if ((c === '$' && command[i + 1] === '(' && command[i + 2] !== '(') || c === '`') {
      i = capture(i);
    } else if (/\s/.test(c) && c !== '\n') {
      flush();
    } else if (c === '<' && command[i + 1] === '<' && command[i + 2] !== '<') {
      flush();
      let j = i + 2;
      const strip = command[j] === '-';
      if (strip) j++;
      while (command[j] === ' ' || command[j] === '\t') j++;
      let word = '';
      while (j < command.length && !/[\s;&|<>()]/.test(command[j])) word += command[j++];
      pending.push({ delim: word.replace(/["'\\]/g, ''), strip, at: tokens.length });
      i = j - 1;
    } else if (c === '<' || c === '>') {
      // A redirection: a leading file-descriptor digit and the target word are not arguments.
      if (cur && /^\d+$/.test(cur.text)) cur = null;
      flush();
      while (command[i + 1] === '<' || command[i + 1] === '>') i++;
      if (command[i + 1] === '&') i++;
      skipNext = true;
    } else if (c === '(' || c === ')') {
      flush();
      tokens.push({ text: c, dynamic: false, op: true });
    } else if (c === '\n' || c === ';' || c === '|' || c === '&') {
      flush();
      const two = command.slice(i, i + 2);
      const text = two === '&&' || two === '||' ? two : c;
      if (text.length === 2) i++;
      tokens.push({ text, dynamic: false, op: true });
      if (c === '\n' && pending.length > 0) {
        for (const h of pending.splice(0)) {
          const lines = [];
          let j = i + 1;
          while (j < command.length) {
            let end = command.indexOf('\n', j);
            if (end === -1) end = command.length;
            const line = command.slice(j, end);
            j = end + 1;
            if ((h.strip ? line.replace(/^\t+/, '') : line) === h.delim) break;
            lines.push(line);
          }
          heredocs.push({ at: h.at, body: lines.join('\n') });
          i = j - 1;
        }
      }
    } else {
      if (c === '$') start().dynamic = true;
      start().text += c;
    }
  }
  flush();
  return { tokens, heredocs, subs };
}

/**
 * Where `release create` (or `release new`) sits in a gh argument list, past any global flags.
 * @param {Token[]} words
 * @returns {number | null}
 */
function releaseVerb(words) {
  let j = 0;
  while (j < words.length && !words[j].dynamic && words[j].text.startsWith('-')) {
    j += GLOBAL_VALUE_FLAGS.has(words[j].text) ? 2 : 1;
  }
  return words[j]?.text === 'release' && VERBS.has(words[j + 1]?.text) ? j : null;
}

/**
 * Read one simple command's words, adding every `gh release create` it would run to `out`.
 * @param {Token[]} words
 * @param {string[]} heredocBodies - Bodies of the heredocs that feed this command.
 * @param {number} depth
 * @param {Token[][]} out
 */
function analyzeWords(words, heredocBodies, depth, out) {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (!w.dynamic && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w.text)) i++;
    else if (!w.dynamic && WRAPPERS.has(w.text)) {
      i++;
      while (i < words.length && !words[i].dynamic && words[i].text.startsWith('-')) i++;
    } else break;
  }
  if (i >= words.length) return;
  const head = words[i];
  const rest = words.slice(i + 1);
  const unreadable = () => deny('could not read the gh release create arguments');

  if (head.dynamic) {
    if (releaseVerb(rest) !== null) unreadable();
    return;
  }
  const name = head.text.split('/').pop();
  if (name === 'gh') {
    const at = releaseVerb(rest);
    if (at !== null) out.push(rest.slice(at + 2));
    else {
      const k = rest.findIndex((t, n) => t.text === 'release' && VERBS.has(rest[n + 1]?.text));
      if (k > 0 && rest.slice(0, k).some((t) => t.dynamic)) unreadable();
    }
  } else if (SHELLS.has(name)) {
    const c = rest.findIndex((t) => /^-[a-z]*c[a-z]*$/.test(t.text));
    if (c !== -1 && rest[c + 1]) analyzeText(rest[c + 1].text, depth + 1, out);
    else for (const body of heredocBodies) analyzeText(body, depth + 1, out);
  } else if (name === 'eval' || name === 'source' || name === '.') {
    analyzeText(rest.map((t) => t.text).join(' '), depth + 1, out);
  } else if (name === 'ssh') {
    let n = 0;
    while (n < rest.length && rest[n].text.startsWith('-')) n += SSH_VALUE_FLAGS.has(rest[n].text) ? 2 : 1;
    analyzeText(rest.slice(n + 1).map((t) => t.text).join(' '), depth + 1, out);
  } else if (name === 'xargs') {
    let n = 0;
    while (n < rest.length && rest[n].text.startsWith('-')) n += XARGS_VALUE_FLAGS.has(rest[n].text) ? 2 : 1;
    analyzeWords(rest.slice(n), [], depth + 1, out);
  }
}

/**
 * Read a command string, adding every `gh release create` it would run to `out`.
 * @param {string} text
 * @param {number} depth
 * @param {Token[][]} out
 */
function analyzeText(text, depth, out) {
  if (depth > MAX_DEPTH) deny('the command nests shells too deeply to read');
  const { tokens, heredocs, subs } = tokenize(text);
  for (const sub of subs) analyzeText(sub, depth + 1, out);
  let start = 0;
  for (let end = 0; end <= tokens.length; end++) {
    if (end < tokens.length && !tokens[end].op) continue;
    const bodies = heredocs.filter((h) => h.at >= start && h.at <= end).map((h) => h.body);
    analyzeWords(tokens.slice(start, end), bodies, depth, out);
    start = end + 1;
  }
}

function run(input) {
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || !MATCH.test(command)) return;
  const invocations = [];
  analyzeText(command, 0, invocations);
  for (const args of invocations) checkRelease(args, input);
}

/** Apply the four rules to one invocation's arguments; returns when it passes, denies otherwise. */
function checkRelease(args, input) {
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
