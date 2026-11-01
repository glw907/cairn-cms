// cairn-cms: the docs link gate. It walks the live docs tree plus the root project files, resolves
// every relative Markdown link, and confirms the target file exists and any `#anchor` resolves to a
// real heading. A dead link or a stale anchor fails the gate, which is what catches docs drift when a
// pass removes or renames a symbol the prose still points at. The RED output is the fix worklist.
//
// Scope is the docs tree (`docs/`, minus the open plans in `docs/plans`)
// plus the root-level public docs (the migration notes among them), plus every packaged skill's Markdown (`skills/**/*.md`) and the
// packaged Claude Code guidance tree (`claude/**/*.md`, scanned when present). Both ship in the
// tarball, so a dead link inside them is as real as one in `docs/`.
// External links (http, mailto, and the like) are not fetched, and a
// `cairn:` content link is skipped because it is an author's in-post token, not a doc target. Links
// inside fenced or inline code are ignored, since those are examples, not navigation.
//
// The release record keeps the links it was written with, so its links into docs/ pages that no
// longer exist are accepted for good (isDatedRecord); the same link anywhere else is repaired or
// fails.
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, relative, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT_DOCS = ['README.md', 'SECURITY.md', 'ROADMAP.md', 'CHANGELOG.md', 'MIGRATION-NOTES.md', 'CONTRIBUTING.md'];
// Captured third-party pages keep their original links, so the link gate skips them.
// Planning records are write-once history, so their links are never repaired. Matched by path
// from the repo root, never by directory name, so a published `research` folder would be scanned.
const PLANNING_DIRS = ['plans'].map((name) => join('docs', name));

// Recursively collect `.md` files under a directory, skipping a name list.
/**
 * @param {string} dir
 * @param {Set<string>} skip
 * @param {string[]} out
 */
function walkMarkdown(dir, skip, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(full, skip, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

// A root-relative directory scanned whole when it exists, empty otherwise.
/**
 * @param {string} root
 * @param {string} dirName
 */
function walkIfPresent(root, dirName) {
  const dir = join(root, dirName);
  return existsSync(dir) ? walkMarkdown(dir, new Set(), []) : [];
}

// Every Markdown file in scope, as repo-relative paths, sorted.
/** @param {string} root */
export function filesInScope(root = ROOT) {
  const docs = walkIfPresent(root, 'docs').filter((p) => {
    const rel = relative(root, p);
    return !PLANNING_DIRS.some((dir) => rel.startsWith(dir + sep));
  });
  const rootDocs = ROOT_DOCS.map((p) => join(root, p)).filter(existsSync);
  const skills = walkIfPresent(root, 'skills');
  const claude = walkIfPresent(root, 'claude');
  // Repo skills link into docs/ and each other. Captured exemplar pages keep their original links.
  const repoSkills = walkIfPresent(root, join('.claude', 'skills')).filter((p) => !basename(p).startsWith('exemplar-'));
  return [...rootDocs, ...docs, ...skills, ...claude, ...repoSkills].map((p) => relative(root, p)).sort();
}

// Strip fenced code blocks (``` and ~~~), keeping line count stable so reported lines stay right.
/** @param {string} text */
export function blankCodeFences(text) {
  let fence = /** @type {string | null} */ (null);
  return text
    .split('\n')
    .map((line) => {
      const open = line.match(/^(\s*)(```+|~~~+)/);
      if (fence) {
        if (open && open[2][0] === fence) fence = null;
        return '';
      }
      if (open) {
        fence = open[2][0];
        return '';
      }
      return line;
    })
    .join('\n');
}

// Blank inline code spans on one line, so a link-shaped example in backticks is not read as a link.
/** @param {string} line */
export function blankInlineCode(line) {
  return line.replace(/``[^`]*``/g, ' ').replace(/`[^`]*`/g, ' ');
}

// GitHub-style heading slug: lowercase, drop punctuation, spaces to hyphens, dedup with -1, -2.
/** @param {string} text */
export function headingAnchors(text) {
  /** @type {Map<string, number>} */
  const seen = new Map();
  const anchors = new Set();
  for (const line of blankCodeFences(text).split('\n')) {
    const head = line.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
    if (head) {
      const base = head[1]
        .replace(/`/g, '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      anchors.add(n === 0 ? base : `${base}-${n}`);
    }
    for (const m of line.matchAll(/(?:name|id)="([^"]+)"/g)) anchors.add(m[1]);
  }
  return anchors;
}

// The inline links in a file as { line, dest } pairs, code fences and inline code removed.
/** @param {string} text */
export function linksIn(text) {
  /** @type {{line: number, dest: string}[]} */
  const out = [];
  blankCodeFences(text)
    .split('\n')
    .forEach((line, i) => {
      // Inline `[text](dest)` and `[text](dest "title")`. Images count too: a broken image path is
      // still drift. The leading `]` excludes reference-style `[a][b]`.
      for (const m of blankInlineCode(line).matchAll(/\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g)) {
        out.push({ line: i + 1, dest: m[1] });
      }
    });
  return out;
}

// `cairn:` is the content internal-link scheme an author writes in a post, not a doc navigation target.
const EXTERNAL = /^(https?:|mailto:|tel:|ftp:|cairn:|\/\/)/i;

// Whether a link destination points outside the docs tree, so the gate leaves it unchecked.
/** @param {string} dest */
export function isExternal(dest) {
  return EXTERNAL.test(dest);
}

// The release record. It is immutable: its historical entries keep the paths that were real when
// they shipped, and rewriting them to chase a later reorganization would falsify the record.
const RELEASE_RECORD = 'CHANGELOG.md';

// Whether a CHANGELOG-shaped Markdown text carries an `## Unreleased` heading, the window a pass
// writes before a cut assigns it a version number.
/** @param {string} text */
export function hasUnreleasedHeading(text) {
  return /^## Unreleased\b/m.test(text);
}

// The per-version migration record CHANGELOG.md pairs with. It keys its entries by version and
// therefore carries the `## Unreleased` window too.
const UNRELEASED_PARTNER = 'MIGRATION-NOTES.md';

/**
 * Whether CHANGELOG.md and the migration notes agree on having (or not having) an open
 * `## Unreleased` window. The migration notes key their entries by version the same way the
 * CHANGELOG does, and a human renames each heading by hand at the cut; nothing else notices when
 * one side is renamed and the other is not. That drift already shipped once: the 0.91.0 cut
 * renamed the CHANGELOG's heading but left the paired page's "## Unreleased" heading in place.
 * Returns null when the two sides agree, an error string naming the mismatch otherwise.
 * @param {string} changelogText the full CHANGELOG.md text
 * @param {string} migrationNotesText the full {@link UNRELEASED_PARTNER} text
 * @returns {string | null}
 */
export function unreleasedParityMismatch(changelogText, migrationNotesText) {
  const changelogHas = hasUnreleasedHeading(changelogText);
  const partnerHas = hasUnreleasedHeading(migrationNotesText);
  if (changelogHas === partnerHas) return null;
  return changelogHas
    ? `CHANGELOG.md carries an "## Unreleased" heading but ${UNRELEASED_PARTNER} does not; add the matching window before the next cut renames it`
    : `${UNRELEASED_PARTNER} carries an "## Unreleased" heading but CHANGELOG.md does not; rename it to the version it shipped in, or reopen the CHANGELOG window`;
}

// The release record is dated evidence. It is read as it was written, so a link from it into a
// docs/ page that no longer exists, or to a docs/ directory that is gone, is accepted permanently
// rather than chased to a later page. A link from it to any other missing path still fails.

/**
 * Whether a repo-relative link target sits under docs/ and no longer exists.
 * @param {string} root
 * @param {string} target
 */
function isRetiredDocsTarget(root, target) {
  return target.startsWith('docs/') && !existsSync(join(root, target));
}

/**
 * Whether a repo-relative file is a dated record whose links into retired docs pages stand.
 * @param {string} file
 */
function isDatedRecord(file) {
  return file === RELEASE_RECORD;
}

/**
 * Check every relative link in the scoped files. `broken` holds the dead ones with file, line, dest,
 * and a reason: a target file that does not exist or a `#anchor` with no matching heading.
 * @param {string} root
 */
export function checkLinks(root = ROOT) {
  /** @type {{file: string, line: number, dest: string, reason: string}[]} */
  const broken = [];
  /** @type {Map<string, Set<string>>} */
  const anchorCache = new Map();
  /** @param {string} abs */
  const anchorsFor = (abs) => {
    let set = anchorCache.get(abs);
    if (!set) {
      set = headingAnchors(readFileSync(abs, 'utf8'));
      anchorCache.set(abs, set);
    }
    return set;
  };

  for (const file of filesInScope(root)) {
    const abs = join(root, file);
    const text = readFileSync(abs, 'utf8');
    const ownAnchors = headingAnchors(text);
    for (const { line, dest } of linksIn(text)) {
      if (isExternal(dest)) continue;
      const hash = dest.indexOf('#');
      const path = hash === -1 ? dest : dest.slice(0, hash);
      const anchor = hash === -1 ? '' : dest.slice(hash + 1);

      if (path === '') {
        if (anchor && !ownAnchors.has(anchor)) {
          broken.push({ file, line, dest, reason: `no heading "#${anchor}" in this file` });
        }
        continue;
      }
      const targetAbs = resolve(dirname(abs), path);
      const target = relative(root, targetAbs).split(sep).join('/');
      if (isDatedRecord(file) && isRetiredDocsTarget(root, target)) continue;
      if (!existsSync(targetAbs)) {
        broken.push({ file, line, dest, reason: `target not found: ${path}` });
        continue;
      }
      if (anchor && statSync(targetAbs).isFile() && targetAbs.endsWith('.md') && !anchorsFor(targetAbs).has(anchor)) {
        broken.push({ file, line, dest, reason: `no heading "#${anchor}" in ${path}` });
      }
    }
  }
  return { broken };
}

/**
 * The broken links alone.
 * @param {string} root
 */
export function findBrokenLinks(root = ROOT) {
  return checkLinks(root).broken;
}

function main() {
  const scanned = filesInScope().length;
  const { broken } = checkLinks();
  const unreleasedMismatch = unreleasedParityMismatch(
    readFileSync(join(ROOT, RELEASE_RECORD), 'utf8'),
    readFileSync(join(ROOT, UNRELEASED_PARTNER), 'utf8'),
  );

  if (broken.length === 0 && !unreleasedMismatch) {
    console.log(`docs-links: OK (${scanned} files, every relative link and anchor resolves)`);
    return;
  }
  if (unreleasedMismatch) {
    console.error(`docs-links: ${unreleasedMismatch}\n`);
  }
  if (broken.length > 0) {
    console.error(`docs-links: ${broken.length} broken link(s) across ${scanned} files\n`);
    let last = '';
    for (const b of broken.sort((a, c) => a.file.localeCompare(c.file) || a.line - c.line)) {
      if (b.file !== last) {
        console.error(`  ${b.file}`);
        last = b.file;
      }
      console.error(`    :${b.line}  ${b.dest}  -- ${b.reason}`);
    }
  }
  process.exitCode = 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
