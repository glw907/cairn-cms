/**
 * Extracting the literal `cairn` command lines a docs/admin page asks a reader to run, and the
 * fenced blocks that show a command's JSON output. A fenced block immediately preceded by a
 * `<!-- transcript: ... -->` comment is a captured transcript, not an instruction to run
 * anything, and is skipped.
 */

/** One `cairn` command line a page names as something to run. */
export interface Procedure {
  /** The page's path, relative to the docs root (for example `docs/admin/is-it-working.md`). */
  page: string;
  /** The 1-based line the command sits on. */
  line: number;
  /** The command text, with any leading shell prompt (`$ `) stripped. */
  command: string;
  /** Whether the nearest following fenced block parses as JSON, so the run's own stdout should too. */
  expectJson: boolean;
}

/** One fenced code block: its content, its starting line (the line after the opening fence), and whether a `<!-- transcript: -->` comment immediately precedes it. */
interface FencedBlock {
  content: string;
  startLine: number;
  isTranscript: boolean;
}

/**
 * Find every triple-backtick fenced code block in a page.
 * @param text - The page's raw markdown.
 * @returns Each block, in document order.
 */
function fencedBlocks(text: string): FencedBlock[] {
  const lines = text.split('\n');
  const blocks: FencedBlock[] = [];
  let open: { openIndex: number; bodyLines: string[] } | undefined;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      if (open) {
        const before = lines[open.openIndex - 1] ?? '';
        blocks.push({
          content: open.bodyLines.join('\n'),
          startLine: open.openIndex + 2,
          isTranscript: /^<!--\s*transcript:/.test(before.trim()),
        });
        open = undefined;
      } else {
        open = { openIndex: i, bodyLines: [] };
      }
    } else if (open) {
      open.bodyLines.push(line);
    }
  }
  return blocks;
}

/** A line naming one `cairn` invocation, an optional leading `$ ` prompt stripped. */
const CAIRN_COMMAND = /^\$?\s*(cairn\s+\S.*)$/;

/**
 * Whether a fenced block's trimmed content parses as a JSON value.
 * @param content - The block's raw content.
 * @returns True for a block whose content is exactly one JSON value.
 */
function looksLikeJson(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed === '' || !/^[[{]/.test(trimmed)) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract every `cairn` command line from a page's own non-transcript fenced blocks. A command is
 * marked to expect JSON output when it names `--json` itself, or, failing that, when the nearest
 * following fenced block parses as JSON.
 * @param page - The page's path, relative to the docs root.
 * @param text - The page's raw markdown.
 * @returns One entry per command line found, in document order.
 */
export function extractProcedures(page: string, text: string): Procedure[] {
  const procedures: Procedure[] = [];
  const blocks = fencedBlocks(text);
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.isTranscript) continue;
    const lines = block.content.split('\n');
    for (let offset = 0; offset < lines.length; offset += 1) {
      const match = CAIRN_COMMAND.exec(lines[offset].trim());
      if (!match) continue;
      const command = match[1];
      const next = blocks[i + 1];
      const expectJson = command.includes('--json') || (next !== undefined && !next.isTranscript && looksLikeJson(next.content));
      procedures.push({ page, line: block.startLine + offset, command, expectJson });
    }
  }
  return procedures;
}

/**
 * Whether a page carries at least one runnable procedure, the enumeration `listOperatorPages`
 * filters `docs/admin/*.md` by.
 * @param text - The page's raw markdown.
 * @returns True when `extractProcedures` would find at least one command.
 */
export function hasProcedure(text: string): boolean {
  return extractProcedures('', text).length > 0;
}
