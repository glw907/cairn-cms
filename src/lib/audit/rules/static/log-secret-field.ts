// cairn-audit's log-secret-field rule: the same `<ident>.info(`, `.warn(`, `.error(` name
// heuristic log-event-grammar reads, this time over each call's second, fields argument. A
// property whose key normalizes (lowercased, compared whole, never a substring) to a member of
// `REDACTED_LOG_KEYS` (`src/lib/log/create.js`) already has its VALUE replaced at runtime, so
// this rule is not catching an unredacted field: it is catching the case redaction cannot reach,
// a caller who also writes the same secret's value directly into the message string, where no
// redaction ever runs. `tokenCount` and `tokens` are not a match, since the comparison is against
// the whole key, exactly as the runtime's own redaction works.
import { REDACTED_LOG_KEYS } from '../../../log/create.js';
import { lineAt } from '../../markup.js';
import type { Finding, SourceFile, StaticRule } from '../../types.js';

// The promotion version stated in every finding this rule raises: the minor release that moves
// consumer-facing findings out of advisory tier.
const PROMOTION_VERSION = '0.98.0';

const CALL = /[A-Za-z_$][\w$]*\.(?:info|warn|error)\(/g;

const REDACTED = new Set(REDACTED_LOG_KEYS.map((key) => key.toLowerCase()));

interface Span {
  start: number;
  end: number;
}

/** One `{ key ... }` field name, positioned at its own key text. */
interface FieldKey {
  name: string;
  start: number;
  end: number;
}

/** Advance past a quoted or templated string starting at `i`, whose first character is `quote`. */
function skipStringLike(source: string, i: number, quote: string): number {
  let j = i + 1;
  while (j < source.length) {
    if (source[j] === '\\') {
      j += 2;
      continue;
    }
    if (source[j] === quote) return j + 1;
    j++;
  }
  return j;
}

/**
 * The top-level, comma-separated argument spans of one call, given the source position right
 * after its opening `(`. Depth counts every bracket kind together, which is exact for
 * well-formed source and never worse than a missed argument on malformed input; a rule this
 * advisory has no obligation to recover from source that would fail to parse anyway.
 */
function splitArgs(source: string, openIndex: number): Span[] | null {
  const args: Span[] = [];
  let depth = 1;
  let argStart = openIndex;
  let i = openIndex;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipStringLike(source, i, ch);
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      i++;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) {
        args.push({ start: argStart, end: i });
        return args;
      }
      i++;
      continue;
    }
    if (ch === ',' && depth === 1) {
      args.push({ start: argStart, end: i });
      argStart = i + 1;
      i++;
      continue;
    }
    i++;
  }
  return null; // the call's own closing paren never showed up: a truncated or unparsed fixture
}

/** The property keys one `{ ... }` object literal declares at its own top level. */
function objectLiteralKeys(source: string, brace: Span): FieldKey[] {
  const keys: FieldKey[] = [];
  let depth = 0;
  let segStart = brace.start + 1;
  const flush = (end: number): void => {
    const raw = source.slice(segStart, end);
    const leading = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('...')) return;
    const colon = trimmed.indexOf(':');
    const keyText = (colon === -1 ? trimmed : trimmed.slice(0, colon)).trim();
    const keyStart = segStart + leading;
    keys.push({
      name: keyText.replace(/^['"]|['"]$/g, ''),
      start: keyStart,
      end: keyStart + keyText.length,
    });
  };
  // `brace.end - 1` is the object literal's own closing brace, excluded from the scan: the loop
  // only ever walks the literal's inner content, so that brace is never mistaken for a nested
  // close and folded into the last property's own key text.
  let i = brace.start + 1;
  while (i < brace.end - 1) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipStringLike(source, i, ch);
      continue;
    }
    if (ch === '{' || ch === '[' || ch === '(') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}' || ch === ']' || ch === ')') {
      depth--;
      i++;
      continue;
    }
    if (ch === ',' && depth === 0) {
      flush(i);
      segStart = i + 1;
      i++;
      continue;
    }
    i++;
  }
  flush(brace.end - 1);
  return keys;
}

/** An argument span trimmed of its surrounding whitespace, so a leading/trailing brace check is exact. */
function trimSpan(source: string, span: Span): Span {
  const raw = source.slice(span.start, span.end);
  const leading = raw.length - raw.trimStart().length;
  const trailing = raw.length - raw.trimEnd().length;
  return { start: span.start + leading, end: span.end - trailing };
}

function findingsFor(file: SourceFile): Finding[] {
  const findings: Finding[] = [];
  for (const match of file.source.matchAll(CALL)) {
    const args = splitArgs(file.source, match.index + match[0].length);
    const fieldsArg = args?.[1];
    if (!fieldsArg) continue; // no second, fields argument at all
    const { start, end } = trimSpan(file.source, fieldsArg);
    if (file.source[start] !== '{' || file.source[end - 1] !== '}') continue; // not an object literal
    for (const key of objectLiteralKeys(file.source, { start, end })) {
      if (!REDACTED.has(key.name.toLowerCase())) continue;
      findings.push({
        ruleId: 'log-secret-field',
        tier: 'advisory',
        file: file.file,
        line: lineAt(file.source, key.start),
        start: key.start,
        end: key.end,
        message:
          `the field "${key.name}" matches cairn's own REDACTED_LOG_KEYS list; the runtime ` +
          `already replaces its value with <redacted> in the record, and this rule exists for ` +
          `the case where the same secret value is also written directly into the message ` +
          `string, which redaction never reaches. Findings here stay advisory until ${PROMOTION_VERSION}`,
      });
    }
  }
  return findings;
}

export const logSecretField: StaticRule = {
  id: 'log-secret-field',
  tier: 'advisory',
  check(ctx) {
    return (ctx.sources ?? []).flatMap(findingsFor);
  },
};
