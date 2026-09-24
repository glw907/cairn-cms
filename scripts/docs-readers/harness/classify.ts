/**
 * Classifying a `cairn` command line against the docs-and-binary class's own read-only
 * `bashAllowlist`: a command the allowlist covers runs literally against the scratch site;
 * anything else is state-changing and is checked only as a dry run, its own `--help` on its own
 * subcommand path, never executed.
 */

/**
 * Turn one allowlist pattern (`cairn health*`, `cairn auth check*`, `cairn sites list`) into a
 * matcher over a full command line. The only wildcard the docs-and-binary class's patterns use is
 * a trailing `*`; every other character matches literally.
 * @param pattern - One `bashAllowlist` entry.
 * @returns A predicate over a command line.
 */
function patternMatcher(pattern: string): (command: string) => boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  const re = new RegExp(`^${escaped}$`);
  return (command) => re.test(command);
}

/**
 * Whether a command line is one of the read-only subcommands the docs-and-binary class already
 * allowlists.
 * @param command - The full command line, starting with `cairn`.
 * @param allowlist - The docs-and-binary class's own `bashAllowlist` patterns.
 * @returns True when any pattern matches the command line.
 */
export function isReadOnly(command: string, allowlist: string[]): boolean {
  return allowlist.some((pattern) => patternMatcher(pattern)(command));
}

/**
 * The subcommand path a state-changing command names, the words that come before its first flag
 * or positional argument: `cairn auth set FOO` names `["auth", "set"]`, and `cairn` alone names
 * `[]`. A word counts as part of the path while it looks like a bare subcommand name (lowercase
 * letters and hyphens only); the first flag (`-...`) or anything else ends the path.
 * @param command - The full command line, starting with `cairn`.
 * @returns The subcommand path, `cairn` itself excluded.
 */
export function commandPath(command: string): string[] {
  const words = command.trim().split(/\s+/).slice(1);
  const path: string[] = [];
  for (const word of words) {
    if (!/^[a-z][a-z-]*$/.test(word)) break;
    path.push(word);
  }
  return path;
}
