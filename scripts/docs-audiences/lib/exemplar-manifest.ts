// cairn-cms: resolves an audience profile's `exemplars` ids (`<dir>/<slug>`) against the docs
// exemplar corpus manifest (docs/internal/record/docs-exemplars.md, spec section 4, ruling R-e).
// The manifest lives in git; the captures themselves sit outside it at
// ~/.local/share/cairn/exemplars/, so this module only reads the manifest text, never the
// filesystem beyond it.

/** Maps a manifest `## <Heading>` to the `<dir>` segment of the exemplar ids under it. */
const HEADING_TO_DIR: Readonly<Record<string, string>> = {
  Editors: 'editors',
  Operators: 'operators',
  Designers: 'designers',
  Extenders: 'extenders',
  Core: 'core',
  Evaluators: 'evaluators',
};

const HEADING_LINE = /^##\s+(.+?)\s*$/;
const SLUG_IN_BACKTICKS = /`([a-z0-9][\w-]*(?:\/[a-z0-9][\w-]*)?)\/`/gi;

/**
 * True when `id` (`<dir>/<slug>`) resolves against `manifestText`. Resolution needs both: a
 * top-level entry line (starting `- ` at column 0, never a Verdict line, whatever its
 * indentation) in the id's section carries the slug in backticks, either bare or as
 * `<dir>/<slug>/`; and no line in that section carries the pinned rejected Verdict line for the
 * slug. A slug named only in the section's opening paragraph or in indented prose never resolves,
 * since neither is a top-level entry line.
 */
export function idResolves(manifestText: string, id: string): boolean {
  const slashIndex = id.indexOf('/');
  if (slashIndex < 1) return false;
  const wantDir = id.slice(0, slashIndex);
  const wantSlug = id.slice(slashIndex + 1);
  const rejectedLiteral = `**Verdict (\`${wantSlug}/\`):** rejected`;

  let currentDir: string | null = null;
  let found = false;
  let rejected = false;

  for (const line of manifestText.split('\n')) {
    const heading = HEADING_LINE.exec(line);
    if (heading) {
      currentDir = HEADING_TO_DIR[heading[1].trim()] ?? null;
      continue;
    }
    if (currentDir !== wantDir) continue;
    if (line.includes('**Verdict (')) {
      if (line.includes(rejectedLiteral)) rejected = true;
      continue;
    }
    if (!line.startsWith('- ')) continue;
    for (const match of line.matchAll(SLUG_IN_BACKTICKS)) {
      const raw = match[1];
      if (raw.includes('/')) {
        const [dirPart, slugPart] = raw.split('/');
        if (dirPart === wantDir && slugPart === wantSlug) found = true;
      } else if (raw === wantSlug) {
        found = true;
      }
    }
  }

  return found && !rejected;
}
