/**
 * The transcript scrubber. Nothing from a reader transcript reaches the repository, or any
 * output file, before it passes through here: every secret value the runner handed a container is
 * replaced literally, and anything shaped like a known token format is replaced by pattern.
 */

/** The marker a scrubbed value becomes. */
export const REDACTED = '[REDACTED]';

/** Token shapes replaced wherever they appear. */
const TOKEN_PATTERNS = [
  // Anthropic API keys and OAuth tokens.
  /sk-ant-[A-Za-z0-9_-]{8,}/g,
  // GitHub personal, OAuth, user-to-server, server-to-server, and refresh tokens.
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  // JSON web tokens.
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
];

/** A credential that follows a label keeps the label and loses the value. */
const LABELLED_PATTERNS = [
  /(\bBearer\s+)[A-Za-z0-9._~+/=-]{16,}/gi,
  /(\b(?:authorization|x-api-key|api[_-]?key|access[_-]?token|auth[_-]?token|secret|password)["']?\s*[:=]\s*["']?)[A-Za-z0-9._~+/=-]{16,}/gi,
];

/**
 * Escape a literal for use inside a regular expression.
 * @param text - The literal.
 * @returns The escaped pattern source.
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scrub secrets from text.
 * @param text - A transcript, log, or report.
 * @param secrets - The literal secret values the run used; values under eight characters are
 *   ignored, since replacing them would shred ordinary text without protecting anything.
 * @returns The text with every secret and token-shaped string replaced.
 */
export function scrub(text: string, secrets: readonly unknown[] = []): string {
  let out = text;
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length >= 8) {
      out = out.replace(new RegExp(escapeRegExp(secret), 'g'), REDACTED);
    }
  }
  for (const pattern of TOKEN_PATTERNS) out = out.replace(pattern, REDACTED);
  for (const pattern of LABELLED_PATTERNS) out = out.replace(pattern, `$1${REDACTED}`);
  return out;
}
