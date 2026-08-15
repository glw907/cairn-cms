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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
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

// The one file whose links are read against LEGACY_PATH_MAP. A release record is immutable: its
// historical entries keep the paths that were real when they shipped, and rewriting them to chase
// a later reorganization would falsify the record.
const LEGACY_HOST = 'CHANGELOG.md';

// Pass D's docs reset (2026-08-14) deleted the guides, tutorial, and explanation arms and folded
// every page into the admin, editors, and extend tracks. CHANGELOG.md carries 45 links to the 29
// retired paths below, and every one would fail this gate for as long as the file exists. Each
// entry names the page that inherited the old page's job, taken from the cutover's own redirect
// map (docs/internal/record/2026-08-14-pass-d-target-manifest.md, section 2).
//
// A translation table that quietly maps to nothing is how a gate stops gating, so this one is
// checked rather than trusted: legacyMapProblems() holds three invariants on every run. A value
// must name a file that exists, so a later rename of a replacement page fails here instead of
// passing. A key must NOT name a file that exists, so a resurrected page goes back to being
// checked normally rather than being shadowed by a stale entry. And every key must still be cited
// by a LEGACY_HOST link, so an entry nothing reaches gets removed rather than carried forever.
//
// Only the path half is translated. The anchor half is deliberately left unchecked for a mapped
// link: these headings described the old page's own structure, and the fold did not preserve them
// (none of the three anchors CHANGELOG.md carries on a legacy path survives on its new page).
/** @type {Record<string, string>} */
const LEGACY_PATH_MAP = {
  'docs/explanation/auth-channel-security-model.md': 'docs/extend/auth-channel-security-model.md',
  'docs/explanation/editor-copyedit.md': 'docs/extend/enable-tidy.md',
  'docs/explanation/enforced-design.md': 'docs/extend/add-a-custom-admin-screen.md',
  'docs/explanation/media-storage.md': 'docs/extend/data-tiers.md',
  'docs/explanation/security-model.md': 'docs/extend/security-model.md',
  'docs/guides/add-a-custom-admin-screen.md': 'docs/extend/add-a-custom-admin-screen.md',
  'docs/guides/add-a-login-channel.md': 'docs/extend/add-a-second-audience.md',
  'docs/guides/add-an-image.md': 'docs/editors/add-an-image.md',
  'docs/guides/add-an-island.md': 'docs/extend/add-an-island.md',
  'docs/guides/add-authors.md': 'docs/extend/declare-your-own-concept.md',
  'docs/guides/announce-on-publish.md': 'docs/extend/announce-on-publish.md',
  'docs/guides/cloudflare-readiness.md': 'docs/admin/is-it-working.md',
  'docs/guides/configure-auth-and-d1.md': 'docs/extend/add-cairn-to-a-sveltekit-app.md',
  'docs/guides/define-an-adapter-and-schema.md': 'docs/extend/define-an-adapter-and-schema.md',
  'docs/guides/enable-tidy.md': 'docs/extend/enable-tidy.md',
  'docs/guides/iterate-your-design-locally.md': 'docs/extend/design-your-site.md',
  'docs/guides/link-content-with-references.md': 'docs/extend/link-content-with-references.md',
  'docs/guides/manage-the-media-library.md': 'docs/editors/manage-the-media-library.md',
  'docs/guides/organize-your-admin-nav.md': 'docs/extend/organize-your-admin-nav.md',
  'docs/guides/publish-and-discard.md': 'docs/editors/publish-and-history.md',
  'docs/guides/read-cairn-logs.md': 'docs/admin/troubleshooting.md',
  'docs/guides/restrict-admin-access.md': 'docs/extend/restrict-admin-access.md',
  'docs/guides/reuse-content-across-entries.md': 'docs/extend/reuse-content-across-entries.md',
  'docs/guides/share-a-draft-preview.md': 'docs/extend/share-a-draft-preview.md',
  'docs/guides/structured-fields.md': 'docs/reference/core.md',
  'docs/guides/upgrade-cairn.md': 'docs/extend/upgrade-cairn.md',
  'docs/guides/wire-the-delivery-surface.md': 'docs/extend/wire-the-delivery-surface.md',
  'docs/guides/write-in-the-editor.md': 'docs/editors/write-in-the-editor.md',
  'docs/reference/authoring-syntax.md': 'docs/editors/write-in-the-editor.md',
};

// A link destination's path half, with the leading `./` some CHANGELOG entries carry stripped, so
// `./docs/guides/x.md` and `docs/guides/x.md` reach the same map key. LEGACY_HOST sits at the repo
// root, so a path written there is already repo-relative, the form the map's keys take.
/** @param {string} dest */
function normalizeLinkPath(dest) {
  const hash = dest.indexOf('#');
  return (hash === -1 ? dest : dest.slice(0, hash)).replace(/^\.\//, '');
}

/**
 * The page a legacy docs path folded into, or null when the link is not one this map answers for.
 * A link is answered only when it appears in {@link LEGACY_HOST}; the same dead path written in
 * any other file stays broken, which is the point.
 * @param {string} file the repo-relative path of the file the link was written in
 * @param {string} dest the link destination as written
 * @returns {string | null}
 */
export function legacyTarget(file, dest) {
  if (file !== LEGACY_HOST) return null;
  return LEGACY_PATH_MAP[normalizeLinkPath(dest)] ?? null;
}

/**
 * The map's own three invariants, checked against the tree and against {@link LEGACY_HOST}'s
 * links. An empty array means the map still describes reality. See {@link LEGACY_PATH_MAP} for
 * why each invariant exists.
 * @param {string} root
 * @param {Record<string, string>} map The table to check. Defaults to the real one; a test passes
 *   a two-entry map so each invariant gets a red proof that names one entry instead of eighty.
 *   A gate whose failure path has never been executed is a claim, not a check.
 * @returns {string[]} one message per broken invariant, each naming the entry and its fix
 */
export function legacyMapProblems(root = ROOT, map = LEGACY_PATH_MAP) {
  /** @type {string[]} */
  const problems = [];
  const hostText = readFileSync(join(root, LEGACY_HOST), 'utf8');
  const cited = new Set(
    linksIn(hostText)
      .filter(({ dest }) => !isExternal(dest))
      .map(({ dest }) => normalizeLinkPath(dest))
  );
  for (const [legacyPath, replacement] of Object.entries(map)) {
    if (!existsSync(join(root, replacement))) {
      problems.push(
        `LEGACY_PATH_MAP sends ${legacyPath} to ${replacement}, which no longer exists; repoint the entry at the page that carries that job now`
      );
    }
    if (existsSync(join(root, legacyPath))) {
      problems.push(
        `LEGACY_PATH_MAP still carries ${legacyPath}, but that file exists again; drop the entry so ${LEGACY_HOST}'s links to it are checked like every other link`
      );
    }
    if (!cited.has(legacyPath)) {
      problems.push(
        `LEGACY_PATH_MAP carries ${legacyPath}, which no ${LEGACY_HOST} link names; drop the entry rather than carrying a rule nothing reaches`
      );
    }
  }
  return problems;
}

// Whether a CHANGELOG-shaped Markdown text carries an `## Unreleased` heading, the window a pass
// writes before a cut assigns it a version number.
/** @param {string} text */
export function hasUnreleasedHeading(text) {
  return /^## Unreleased\b/m.test(text);
}

// The page that carries the per-version migration record CHANGELOG.md pairs with. Pass D's docs
// reset split the old upgrade guide in two: the short bump-and-doctor task kept the
// `upgrade-cairn` name under the extend track, and the per-version record, the half that keys its
// entries by version and therefore carries the `## Unreleased` window, moved here.
const UNRELEASED_PARTNER = 'docs/extend/migration-notes.md';

/**
 * Whether CHANGELOG.md and the migration-notes page agree on having (or not having) an open
 * `## Unreleased` window. The migration notes key their own entries by version the same way the
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
      // A path the legacy map answers for is left unchecked here, since legacyMapProblems() proves
      // separately that the page which inherited its job exists. The anchor is not checked at all;
      // see LEGACY_PATH_MAP.
      if (legacyTarget(file, dest) !== null) continue;

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
  const unreleasedMismatch = unreleasedParityMismatch(
    readFileSync(join(ROOT, LEGACY_HOST), 'utf8'),
    readFileSync(join(ROOT, UNRELEASED_PARTNER), 'utf8'),
  );
  const mapProblems = legacyMapProblems();

  if (broken.length === 0 && !unreleasedMismatch && mapProblems.length === 0) {
    console.log(
      `docs-links: OK (${scanned} files, every relative link and anchor resolves; ${Object.keys(LEGACY_PATH_MAP).length} legacy ${LEGACY_HOST} paths mapped)`
    );
    return;
  }
  if (unreleasedMismatch) {
    console.error(`docs-links: ${unreleasedMismatch}\n`);
  }
  if (mapProblems.length > 0) {
    console.error(`docs-links: ${mapProblems.length} LEGACY_PATH_MAP problem(s)\n`);
    for (const problem of mapProblems) console.error(`  ${problem}`);
    console.error('');
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
