// cairn-audit's suppression idiom: a co-located comment silences one rule over one construct, and
// the run counts every one of them. The design replaces the file-plus-token JSON allowlists the repo
// gates used, whose entries orphaned silently on rename and exempted whole files. Three properties
// carry the weight, and each is a finding of its own when it fails: a directive names a reason, a
// directive that silences nothing is dead, and neither of those errors can itself be suppressed. An
// agent under completion pressure silences gates, so a build that passes by suppression has to read
// as one.
//
// "Next line" resolves to the next AST NODE, not the next physical line. Cairn's EditPage document
// title is the proving case: the directive sits above `<input`, whose class attribute lands three
// lines further down, so a line-literal reading scores one correctly annotated site as a dead
// directive AND an unsuppressed finding. Script and CSS comments have no template node to attach to,
// so they resolve to the next non-blank line, extended through a brace block when that line opens
// one, which is the same intent in the substrate those sources offer.
import { lineAt } from './markup.js';
import type { SourceNode } from './markup.js';
import type { Finding } from './types.js';

/** The comment text a suppression opens with. */
export const DIRECTIVE_MARKER = 'cairn-audit-disable-next-line';

/** The rule id the suppression system reports its own findings under. */
export const SUPPRESSION_RULE_ID = 'suppression';

const SEPARATOR = '--';
const SYNTAX = `${DIRECTIVE_MARKER} <rule-id> ${SEPARATOR} <reason>`;

/** Which comment syntax a directive was written in. */
export type DirectiveForm = 'html' | 'block' | 'line';

/** One suppression directive as written, before it is resolved against the source. */
export interface Directive {
  /** Path as the report prints it, relative to the audited root. */
  file: string;
  /** The rule the directive silences, or null when the directive names none. */
  ruleId: string | null;
  /** The justification the author gave, or null when the directive gives none. */
  reason: string | null;
  form: DirectiveForm;
  /** Character offset of the comment's first character. */
  start: number;
  /** Character offset just past the comment. */
  end: number;
  /** 1-based line of `start`. */
  line: number;
}

/** A source a directive can be written in and a finding can land in. */
export interface SuppressionSource {
  file: string;
  source: string;
  /** Template nodes in document order, present when the source is a parsed component. */
  nodes?: SourceNode[];
}

/** One run's findings split by whether a directive silenced them. */
export interface SuppressionSplit {
  /** Findings no directive covered, plus the suppression system's own findings. */
  findings: Finding[];
  /** Findings a directive silenced, counted and never gating. */
  suppressed: Finding[];
}

interface CommentSpan {
  form: DirectiveForm;
  start: number;
  end: number;
  body: string;
}

interface Range {
  start: number;
  end: number;
}

// Delimited forms first. A line comment is the weakest claim on its text, so a `//` inside an HTML
// or block comment is part of that comment, and the `//` of a URL never swallows a directive written
// later on the same line.
const COMMENT_FORMS: { form: DirectiveForm; pattern: RegExp }[] = [
  { form: 'html', pattern: /<!--([\s\S]*?)-->/g },
  { form: 'block', pattern: /\/\*([\s\S]*?)\*\//g },
  { form: 'line', pattern: /\/\/([^\n]*)/g },
];

// A directive attaches to the next thing that can raise a finding. Text and comments cannot, so
// resolution passes over them; without that, whitespace between a directive and its element, or a
// second directive stacked above the same element, would resolve to nothing and read as dead.
const TRANSPARENT_NODE_TYPES = new Set(['Text', 'Comment']);

function commentSpans(source: string): CommentSpan[] {
  const spans: CommentSpan[] = [];
  for (const { form, pattern } of COMMENT_FORMS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      // Any overlap with a stronger form disqualifies the match, not just a start inside one: the
      // `//` of a URL begins before an HTML comment written later on the same line and would
      // otherwise swallow it whole.
      if (spans.some((span) => start < span.end && end > span.start)) continue;
      spans.push({ form, start, end, body: match[1] });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}

/** Split a directive's text into the rule it names and the reason it gives, either of which may be absent. */
function readDirectiveText(text: string): { ruleId: string | null; reason: string | null } {
  const parts = /^(\S+)(?:\s+([\s\S]*))?$/.exec(text.trim());
  if (!parts) return { ruleId: null, reason: null };
  const head = parts[1];
  const rest = (parts[2] ?? '').trim();
  if (head === SEPARATOR) return { ruleId: null, reason: rest === '' ? null : rest };
  if (!rest.startsWith(SEPARATOR)) return { ruleId: head, reason: null };
  const reason = rest.slice(SEPARATOR.length).trim();
  return { ruleId: head, reason: reason === '' ? null : reason };
}

/** Every suppression directive written in a source, in document order. */
export function parseDirectives(file: string, source: string): Directive[] {
  return commentSpans(source)
    .filter((span) => span.body.includes(DIRECTIVE_MARKER))
    .map((span) => {
      const at = span.body.indexOf(DIRECTIVE_MARKER) + DIRECTIVE_MARKER.length;
      return {
        file,
        ...readDirectiveText(span.body.slice(at)),
        form: span.form,
        start: span.start,
        end: span.end,
        line: lineAt(source, span.start),
      };
    });
}

/**
 * Where a line-resolved range ends: the end of the line, or the end of the brace block the line
 * opens, which is what makes a directive above a CSS rule or a function cover its whole body. Braces
 * are counted raw, so a brace inside a string widens the range rather than truncating it; a
 * suppression that reaches too far is visible in the count, one that stops short reads as dead.
 */
function lineOrBlockEnd(source: string, start: number, eol: number): number {
  let depth = 0;
  for (let i = start; i < eol; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth = Math.max(0, depth - 1);
  }
  if (depth === 0) return eol;
  for (let i = eol; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return i + 1;
  }
  return source.length;
}

/** The first non-blank line after an offset, extended through the block it opens. */
function nextLineRange(source: string, from: number): Range | null {
  const newline = source.indexOf('\n', from);
  if (newline === -1) return null;
  let cursor = newline + 1;
  while (cursor < source.length) {
    const next = source.indexOf('\n', cursor);
    const eol = next === -1 ? source.length : next;
    if (source.slice(cursor, eol).trim() !== '') {
      return { start: cursor, end: lineOrBlockEnd(source, cursor, eol) };
    }
    cursor = eol + 1;
  }
  return null;
}

/**
 * The source range a directive covers, or null when nothing follows it. An HTML-form directive
 * never reaches past its own parent: `nodes` is a flat document-order list, so a directive whose
 * parent holds nothing after it would otherwise walk out of that parent and attach to whatever
 * element comes next in the file. That is the orphan-on-rename failure the JSON allowlists were
 * replaced to end, and it is silent both ways, silencing an unrelated finding while the directive
 * that no longer covers anything still reads as live.
 */
function targetRange(directive: Directive, source: SuppressionSource): Range | null {
  if (directive.form === 'html' && source.nodes) {
    const comment = source.nodes.find(
      (candidate) => candidate.type === 'Comment' && candidate.start === directive.start
    );
    const limit = comment?.parentEnd ?? Number.MAX_SAFE_INTEGER;
    const node = source.nodes.find(
      (candidate) =>
        candidate.startLine > directive.line &&
        candidate.start < limit &&
        !TRANSPARENT_NODE_TYPES.has(candidate.type)
    );
    return node ? { start: node.start, end: node.end } : null;
  }
  return nextLineRange(source.source, directive.end);
}

const NAMES_NO_RULE = `a suppression must name a rule: ${SYNTAX}`;
const givesNoReason = (ruleId: string) => `the ${ruleId} suppression gives no reason: ${SYNTAX}`;
const isDead = (ruleId: string) =>
  `dead suppression: what follows raises no ${ruleId} finding, so remove the directive or correct its rule id`;

function suppressionFinding(directive: Directive, message: string): Finding {
  return {
    ruleId: SUPPRESSION_RULE_ID,
    tier: 'error',
    file: directive.file,
    line: directive.line,
    start: directive.start,
    end: directive.end,
    message,
  };
}

/**
 * Split findings by the directives their sources carry. A directive with no reason still silences
 * its finding, because the intent is unambiguous and the defect is the missing reason; reporting the
 * finding as well would bury the one line the author has to fix. A directive naming no rule silences
 * nothing, because there is nothing to match.
 */
export function applySuppressions(
  findings: Finding[],
  sources: SuppressionSource[]
): SuppressionSplit {
  const silenced = new Set<Finding>();
  const reported: Finding[] = [];
  for (const source of sources) {
    const own = findings.filter((finding) => finding.file === source.file);
    for (const directive of parseDirectives(source.file, source.source)) {
      const { ruleId } = directive;
      if (ruleId === null) {
        reported.push(suppressionFinding(directive, NAMES_NO_RULE));
        continue;
      }
      if (directive.reason === null) {
        reported.push(suppressionFinding(directive, givesNoReason(ruleId)));
      }
      const range = targetRange(directive, source);
      const matched = own.filter(
        (finding) =>
          finding.ruleId === ruleId &&
          range !== null &&
          finding.start >= range.start &&
          finding.start < range.end
      );
      if (matched.length === 0) reported.push(suppressionFinding(directive, isDead(ruleId)));
      for (const finding of matched) silenced.add(finding);
    }
  }
  // The suppression system's own findings are appended after the split, never offered to a
  // directive. A `suppression` directive that could silence a dead-directive error would make every
  // other guarantee here optional.
  return {
    findings: [...findings.filter((finding) => !silenced.has(finding)), ...reported],
    suppressed: findings.filter((finding) => silenced.has(finding)),
  };
}
