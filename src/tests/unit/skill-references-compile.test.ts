import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// The build script is plain ESM under scripts/; the unit project runs in Node.
import { buildAdminCss } from '../../../scripts/build/build-admin-css.mjs';
import { parseSheet, type CompiledSheet } from '../../lib/audit/sheet.js';

// CONTRACT (ASC Assets-trial harvest finding 2): `cairn-admin-screens`'s own reference docs
// prescribe class recipes for a developer to copy, and nothing ever checked those recipes
// against the sheet they ride. `form-anatomy.md` taught `gap-x-6 gap-y-4`, a pair the built
// sheet never compiled, and `cairn-audit`'s own `no-uncompiled-class` rule then convicted the
// two builders who copied it verbatim. This is `no-uncompiled-class`'s claim pointed at the
// teaching material instead of at a component: every class token the skill's references teach
// has to resolve against the same compiled sheet a consumer's admin markup rides.
//
// The references are markdown, not Svelte, so there is no AST to lean on. A candidate class
// token comes from two grammars only: a static `class="..."` attribute inside a fenced code
// block (a value mixing in a Svelte expression, `class="badge {chip.cls}"`, is skipped whole,
// since its static portion is ambiguous without a real parser), and an inline code span outside
// a fence that parses as a pure class list, two or more whitespace-separated tokens, every one
// matching the class-token shape below. Extraction over-catches on plain English prose that
// happens to look class-shaped (a CLI invocation, a two-word button label); the small, commented
// allowlists below are exactly the acceptable escape hatch the finding calls for.
//
// One compile for the whole file, and deliberately the PLAIN build, byte-identical to what
// `npm run package` ships. Keep this to ONE buildAdminCss() call: @tailwindcss/postcss caches
// its compiler per `from` path across calls within one process (keyed on disk mtime, not the
// in-memory input string), so a second call against the same input path replays the first
// call's compiled output instead of re-scanning (grammar-tokens.test.ts documents the same trap).
const REFERENCES_DIR = fileURLToPath(
  new URL('../../../skills/cairn-admin-screens/references', import.meta.url)
);

/** One candidate class token this file's extraction found, with the position a failure prints. */
interface Candidate {
  file: string;
  line: number;
  token: string;
  context: string;
}

// A compiled class name's own character set, lowercase only (no rule in the built sheet ever
// carries an uppercase letter), digits, `_`/`-`, a colon-separated variant chain, and at most one
// bracketed or parenthesised arbitrary value. A bare leading or trailing colon is a "property:
// value" CSS aside quoted in prose (`` `min-width: auto` ``), never a real variant, which always
// carries a class after it (`sm:grid-cols-2`).
const CLASS_TOKEN_SHAPE = /^[a-z0-9_:/.\-[\]()%#!]+$/;

function isClassShaped(token: string): boolean {
  if (!CLASS_TOKEN_SHAPE.test(token)) return false;
  if (token.startsWith(':') || token.endsWith(':')) return false;
  if (!/[a-z]/.test(token)) return false;
  let brackets = 0;
  let parens = 0;
  for (const ch of token) {
    if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
    else if (ch === '(') parens++;
    else if (ch === ')') parens--;
    if (brackets < 0 || parens < 0) return false;
  }
  return brackets === 0 && parens === 0;
}

// A hand-authored CSS class an exemplar leaves to the reader's own component, never a class the
// admin sheet ships: `exemplar-list.md`'s expand panel names its own grid (`household-panel`,
// `household-panel-grid`) the way a component's own scoped `<style>` block would, which
// `no-uncompiled-class` excludes through `file.styleClassNames`. Markdown carries no such block
// to check against, so this is the small, commented allowlist the finding anticipates for a
// genuine placeholder.
const CONSUMER_DEFINED_CLASSES = new Set(['household-panel', 'household-panel-grid']);

// An inline span whose first word is the audit CLI's own binary name is a command example
// (`` `npx cairn-audit` ``, `` `cairn-audit norms destination` ``), never a class list; every
// word in both is otherwise class-shaped and would false-positive without this exclusion.
const CLI_INVOCATION_PREFIXES = new Set(['npx', 'cairn-audit']);

function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text[i] === '\n') line++;
  return line;
}

/**
 * The candidate class tokens one reference doc contributes, per the two grammars documented
 * above.
 */
function extractCandidates(file: string, text: string): Candidate[] {
  const candidates: Candidate[] = [];
  const fenceRanges: { start: number; end: number }[] = [];
  const proseRanges: { start: number; end: number }[] = [];
  const fenceRe = /```[\s\S]*?```/g;
  let cursor = 0;
  let fence: RegExpExecArray | null;
  while ((fence = fenceRe.exec(text))) {
    if (fence.index > cursor) proseRanges.push({ start: cursor, end: fence.index });
    fenceRanges.push({ start: fence.index, end: fence.index + fence[0].length });
    cursor = fence.index + fence[0].length;
  }
  if (cursor < text.length) proseRanges.push({ start: cursor, end: text.length });

  for (const range of fenceRanges) {
    const segment = text.slice(range.start, range.end);
    const classAttrRe = /class="([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = classAttrRe.exec(segment))) {
      if (match[1].includes('{')) continue;
      for (const token of match[1].split(/\s+/).filter(Boolean)) {
        if (CONSUMER_DEFINED_CLASSES.has(token)) continue;
        candidates.push({
          file,
          line: lineAt(text, range.start + match.index),
          token,
          context: `class="${match[1]}"`,
        });
      }
    }
  }

  for (const range of proseRanges) {
    const segment = text.slice(range.start, range.end);
    const spanRe = /`([^`]+)`/g;
    let match: RegExpExecArray | null;
    while ((match = spanRe.exec(segment))) {
      const normalized = match[1].replace(/\s+/g, ' ').trim();
      const tokens = normalized.split(' ').filter(Boolean);
      if (tokens.length < 2) continue;
      if (CLI_INVOCATION_PREFIXES.has(tokens[0])) continue;
      if (!tokens.every(isClassShaped)) continue;
      for (const token of tokens) {
        candidates.push({
          file,
          line: lineAt(text, range.start + match.index),
          token,
          context: `\`${normalized}\``,
        });
      }
    }
  }

  return candidates;
}

let sheet: CompiledSheet;
let candidates: Candidate[];

beforeAll(async () => {
  sheet = parseSheet(await buildAdminCss());
  candidates = readdirSync(REFERENCES_DIR)
    .filter((name) => name.endsWith('.md'))
    .flatMap((name) => extractCandidates(name, readFileSync(`${REFERENCES_DIR}/${name}`, 'utf8')));
}, 60_000);

describe("the skill's own exemplars compile", () => {
  it('carries at least one candidate class token to check', () => {
    // A guard against the extraction silently finding nothing: a regex or directory rename that
    // quietly stops scanning would otherwise leave this suite green with zero assertions made.
    expect(candidates.length).toBeGreaterThan(0);
  });

  it('resolves every exemplar class token against the built admin sheet', () => {
    const misses = candidates.filter((candidate) => !sheet.mentions(candidate.token));
    if (misses.length === 0) return;
    const lines = misses.map((m) => `  ${m.file}:${m.line} "${m.token}" (from ${m.context})`);
    expect.fail(
      [
        'the skill teaches a class that never compiles into the built admin sheet:',
        ...lines,
        '',
        'either the recipe is deliberate (join the labeled compatibility safelist in',
        'scripts/build/admin-css.input.css, naming the reference doc) or the exemplar needs a class',
        'that actually compiles.',
      ].join('\n')
    );
  });
});
