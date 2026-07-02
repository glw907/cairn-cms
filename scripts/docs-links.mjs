// cairn-cms: the docs link gate. It walks the live docs tree plus the root project files, resolves
// every relative Markdown link, and confirms the target file exists and any `#anchor` resolves to a
// real heading. A dead link or a stale anchor fails the gate, which is what catches docs drift when a
// pass removes or renames a symbol the prose still points at. The RED output is the fix worklist.
//
// Scope is the published docs (`docs/`, minus the historical `docs/superpowers/` plan and spec records)
// plus the root-level public docs. External links (http, mailto, and the like) are not fetched, and a
// `cairn:` content link is skipped because it is an author's in-post token, not a doc target. Links
// inside fenced or inline code are ignored, since those are examples, not navigation.
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_DOCS = ['README.md', 'SECURITY.md', 'ROADMAP.md', 'CHANGELOG.md', 'CONTRIBUTING.md'];

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

// Every Markdown file in scope, as repo-relative paths, sorted.
/** @param {string} root */
export function filesInScope(root = ROOT) {
  const docs = walkMarkdown(join(root, 'docs'), new Set(['superpowers']), []);
  const rootDocs = ROOT_DOCS.map((p) => join(root, p)).filter(existsSync);
  return [...rootDocs, ...docs].map((p) => relative(root, p)).sort();
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

/**
 * Check every relative link in the scoped files. Returns the broken ones with file, line, dest, and a
 * reason. A target file that does not exist or a `#anchor` with no matching heading is broken.
 * @param {string} root
 */
export function findBrokenLinks(root = ROOT) {
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
      if (!existsSync(targetAbs)) {
        broken.push({ file, line, dest, reason: `target not found: ${path}` });
        continue;
      }
      if (anchor && statSync(targetAbs).isFile() && targetAbs.endsWith('.md') && !anchorsFor(targetAbs).has(anchor)) {
        broken.push({ file, line, dest, reason: `no heading "#${anchor}" in ${path}` });
      }
    }
  }
  return broken;
}

function main() {
  const scanned = filesInScope().length;
  const broken = findBrokenLinks();
  if (broken.length === 0) {
    console.log(`docs-links: OK (${scanned} files, every relative link and anchor resolves)`);
    return;
  }
  console.error(`docs-links: ${broken.length} broken link(s) across ${scanned} files\n`);
  let last = '';
  for (const b of broken.sort((a, c) => a.file.localeCompare(c.file) || a.line - c.line)) {
    if (b.file !== last) {
      console.error(`  ${b.file}`);
      last = b.file;
    }
    console.error(`    :${b.line}  ${b.dest}  -- ${b.reason}`);
  }
  process.exitCode = 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
