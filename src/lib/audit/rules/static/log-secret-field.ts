// cairn-audit's log-secret-field rule: the same `<ident>.info(`, `.warn(`, `.error(` name
// heuristic log-event-grammar reads, this time over each call's second, fields argument. It is a
// name-awareness advisory and nothing more, and it cannot tell whether `<ident>` is a cairn
// `createLogger` instance, `console`, or another library's logger: only when the call goes through
// a cairn logger does a property whose key matches a member of `REDACTED_LOG_KEYS`
// (`src/lib/log/create.js`) already have its VALUE replaced at runtime. On a bare `console` call
// or another library's own logger, the value ships exactly as written. Either way the finding is
// worth a developer's attention for two reasons the runtime redaction, where it applies, cannot
// cover: the same value is often written into the message string beside the field, where no
// redaction runs, and a field named for a secret usually wants a count or a boolean instead of the
// value at all.
//
// Matching mirrors the runtime: the key is lowercased, its `-` and `_` separators are stripped, and
// the result is compared whole, so `apiKey` and `x-api-key` resolve the same way they do in
// `create.ts`. `tokenCount` and `tokens` are not a match, since the comparison is against the whole
// key. Only the fields object's own top-level keys are read: the runtime redacts three levels deep,
// and matching that here would mean parsing nested object literals out of source text, which is out
// of scope for a heuristic this advisory.
import { REDACTED_LOG_KEYS, normalizeKey } from '../../../log/create.js';
import { lineAt } from '../../markup.js';
import type { Finding, SourceFile, StaticRule } from '../../types.js';

// The promotion version stated in every finding this rule raises: the minor release that moves
// consumer-facing findings out of advisory tier.
const PROMOTION_VERSION = '0.98.0';

const CALL = /[A-Za-z_$][\w$]*\.(?:info|warn|error)\(/g;

const REDACTED = new Set(REDACTED_LOG_KEYS.map(normalizeKey));

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
      if (!REDACTED.has(normalizeKey(key.name))) continue;
      findings.push({
        ruleId: 'log-secret-field',
        tier: 'advisory',
        file: file.file,
        line: lineAt(file.source, key.start),
        start: key.start,
        end: key.end,
        message:
          `the field "${key.name}" matches cairn's own REDACTED_LOG_KEYS list. If this call goes ` +
          `through a cairn createLogger instance, the runtime already replaces the value with ` +
          `<redacted>; this rule cannot tell your logger from console.info or another library's, ` +
          `so on a bare console call the value ships as written. Either way, this is a ` +
          `name-awareness notice, for the two things redaction cannot do even when it applies, ` +
          `namely scrub the same value out of the message string beside the field and turn a ` +
          `secret-shaped field into the count or boolean it usually wants to be. Findings here ` +
          `stay advisory until ${PROMOTION_VERSION}`,
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
