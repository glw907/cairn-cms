// cairn-audit's log-event-grammar rule: a name heuristic over `<ident>.info(`, `.warn(`, and
// `.error(` calls whose first argument is a plain string literal. It checks the literal against
// two things: whether it already collides with a name cairn's own CairnLogEvent union reserves,
// and whether its shape reads as `area[.subject].verb_phrase` (two or more snake_case segments,
// the last a past-tense verb or a known state adjective), the grammar `src/lib/log/events.ts`'s
// own header states.
//
// This is a NAME heuristic, not a type check: it has no way to know whether `<ident>` is cairn's
// own logger, so it flags `console.info('a.b.c')` and another library's differently-shaped
// logger the same way it flags a real cairn call, and it never resolves a computed event name, a
// template literal, or a re-exported logger, since none of those carry a string literal this
// rule can read. Every finding says so, so a false positive is never mistaken for the engine
// asserting the call is cairn's own.
import { CAIRN_LOG_EVENTS } from '../../../log/events-list.js';
import { lineAt } from '../../markup.js';
import type { Finding, SourceFile, StaticRule } from '../../types.js';

// The promotion version stated in every finding this rule raises: the minor release that moves
// consumer-facing findings out of advisory tier.
const PROMOTION_VERSION = '0.98.0';

const CALL = /[A-Za-z_$][\w$]*\.(?:info|warn|error)\(/g;

// The header's past-tense-or-adjective closing segments this rule recognizes as grammar
// conforming when the last segment does not simply end in "ed": the state adjectives among
// CAIRN_LOG_EVENTS's own members that name a detected condition rather than an occurrence.
const STATE_ADJECTIVES = new Set([
  'unknown',
  'invalid',
  'unreachable',
  'missing',
  'absent',
  'empty',
  'unavailable',
]);

const RESERVED = new Set(CAIRN_LOG_EVENTS.map((event) => event.toLowerCase()));

const CAVEAT =
  'This is a name heuristic over <ident>.info/.warn/.error(<string>) calls: it also flags ' +
  'console.info and another library\'s logger, and it misses a computed event name, a template ' +
  'literal, and a re-exported logger. Findings here stay advisory until';

/** Whether every dot-separated segment is a valid snake_case identifier. */
function isSnakeCaseSegment(segment: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(segment);
}

/** `area[.subject].verb_phrase`: two or more snake_case segments, the last past-tense or a state adjective. */
function isGrammarConforming(value: string): boolean {
  const segments = value.split('.');
  if (segments.length < 2 || !segments.every(isSnakeCaseSegment)) return false;
  const last = segments[segments.length - 1];
  return last.endsWith('ed') || STATE_ADJECTIVES.has(last);
}

/** The first argument's literal content and span, when it is a plain single- or double-quoted string. */
function readStringArg(source: string, from: number): { value: string; start: number; end: number } | null {
  let i = from;
  while (i < source.length && /\s/.test(source[i])) i++;
  const quote = source[i];
  if (quote !== "'" && quote !== '"') return null;
  const start = i;
  i++;
  let value = '';
  while (i < source.length && source[i] !== quote) {
    if (source[i] === '\\') {
      value += source[i + 1];
      i += 2;
      continue;
    }
    value += source[i];
    i++;
  }
  return { value, start, end: i + 1 };
}

function findingsFor(file: SourceFile): Finding[] {
  const findings: Finding[] = [];
  for (const match of file.source.matchAll(CALL)) {
    const arg = readStringArg(file.source, match.index + match[0].length);
    if (!arg) continue; // a template literal, a computed name, or any other non-literal argument
    const lowered = arg.value.toLowerCase();
    let message: string | null = null;
    if (RESERVED.has(lowered)) {
      message =
        `"${arg.value}" already names a member of cairn's own CairnLogEvent union; choose a ` +
        `different event name so two call sites never report under one name. ${CAVEAT} ${PROMOTION_VERSION}`;
    } else if (!isGrammarConforming(arg.value)) {
      message =
        `"${arg.value}" does not read as area[.subject].verb_phrase (two or more snake_case ` +
        `segments, the last a past-tense verb or a state adjective). ${CAVEAT} ${PROMOTION_VERSION}`;
    }
    if (message) {
      findings.push({
        ruleId: 'log-event-grammar',
        tier: 'advisory',
        file: file.file,
        line: lineAt(file.source, arg.start),
        start: arg.start,
        end: arg.end,
        message,
      });
    }
  }
  return findings;
}

export const logEventGrammar: StaticRule = {
  id: 'log-event-grammar',
  tier: 'advisory',
  check(ctx) {
    return (ctx.sources ?? []).flatMap(findingsFor);
  },
};
