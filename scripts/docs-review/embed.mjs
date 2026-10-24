// cairn-cms: builds a copy of the owner-review page template with one batch of markdown
// files embedded, ready to hand to the Artifact tool (or to self-publish) as the page's source.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeState } from './runtime.mjs';
import { repoRoot } from '../repo-root.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const TEMPLATE_PATH = join(HERE, 'template.html');
export const RUNTIME_PATH = join(HERE, 'runtime.mjs');

const TITLE_PLACEHOLDER = '__CAIRN_REVIEW_TITLE__';
const STATE_PLACEHOLDER = '__CAIRN_REVIEW_STATE__';
const RUNTIME_PLACEHOLDER = '/*__CAIRN_REVIEW_RUNTIME__*/';

/**
 * Strips the module `export` keyword from runtime.mjs's source so its declarations run as plain
 * top-level statements inside the page's inline script. The declarations are otherwise
 * untouched, so the inlined copy runs exactly the code this module exports.
 * @param {string} runtimeSource
 * @returns {string}
 */
export function inlineRuntimeSource(runtimeSource) {
  return runtimeSource.replace(/^export (?=const|function)/gm, '');
}

/**
 * Escapes text for placement inside HTML content, for the title placeholder (the state
 * placeholder sits inside a JSON script element, whose escaping is JSON's, not HTML's).
 * @param {string} str
 * @returns {string}
 */
function escapeHtmlText(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Fills the template's placeholders with one review batch: the inlined runtime helpers, the
 * page title, and the batch's state. `templateSource` and `runtimeSource` are passed
 * explicitly so a test can exercise this without touching the filesystem.
 * @param {string} templateSource
 * @param {string} runtimeSource
 * @param {{ title: string, files: { path: string, markdown: string }[] }} state
 * @returns {string}
 */
export function embedBatch(templateSource, runtimeSource, state) {
  if (!templateSource.includes(STATE_PLACEHOLDER)) {
    throw new Error('docs-review template is missing its state placeholder');
  }
  if (!templateSource.includes(RUNTIME_PLACEHOLDER)) {
    throw new Error('docs-review template is missing its runtime placeholder');
  }
  return templateSource
    .split(RUNTIME_PLACEHOLDER)
    .join(inlineRuntimeSource(runtimeSource))
    .split(TITLE_PLACEHOLDER)
    .join(escapeHtmlText(state.title))
    .split(STATE_PLACEHOLDER)
    .join(encodeState(state));
}

/**
 * Where a docs page's plan sits when it has one, beside the page's brief under
 * `docs/internal/briefs/<track>/`: `<slug>.plan.yaml` when that file exists, else `<slug>.plan.md`.
 * The track is the page's directory under `docs/`; a page directly under `docs/` is a front-door
 * page. Returns null for a path outside `docs/` or not a markdown page.
 * @param {string} pagePath The page's path, absolute or relative to the working directory.
 * @param {string} root The repository root.
 * @returns {string | null} The plan's absolute path. When neither file exists it is the
 *   `.plan.md` path, so a caller's existence check fails as it always has.
 */
export function planPathFor(pagePath, root) {
  const parts = relative(root, resolve(pagePath)).split(sep);
  if (parts[0] !== 'docs' || !parts[parts.length - 1].endsWith('.md')) return null;
  const track = parts.length > 2 ? parts[1] : 'front-door';
  const stem = join(root, 'docs/internal/briefs', track, basename(pagePath, '.md'));
  return existsSync(`${stem}.plan.yaml`) ? `${stem}.plan.yaml` : `${stem}.plan.md`;
}

/**
 * Wraps a YAML plan in a fenced `yaml` block so the page's markdown renderer shows it as code.
 * The fence is longer than any backtick run inside the plan, so no line can close it early.
 * @param {string} yaml
 * @returns {string}
 */
function fenceYaml(yaml) {
  const longest = Math.max(2, ...(yaml.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}yaml\n${yaml.replace(/\n*$/, '\n')}${fence}\n`;
}

/**
 * One review file read from disk: the page's markdown, plus its plan when one sits next to its
 * brief (a YAML plan arrives as a fenced `yaml` block), and no `plan` key at all when none does.
 * @param {string} mdPath The page's path, absolute or relative to the working directory.
 * @param {string} root The repository root.
 * @returns {import('./runtime.mjs').DocsReviewFile}
 */
export function loadReviewFile(mdPath, root) {
  /** @type {import('./runtime.mjs').DocsReviewFile} */
  const file = { path: relative(process.cwd(), mdPath), markdown: readFileSync(mdPath, 'utf8') };
  const planPath = planPathFor(mdPath, root);
  if (planPath !== null && existsSync(planPath)) {
    const plan = readFileSync(planPath, 'utf8');
    file.plan = planPath.endsWith('.yaml') ? fenceYaml(plan) : plan;
  }
  return file;
}

/**
 * CLI entry: reads a batch of markdown files from disk and writes the embedded page to `outPath`.
 * @param {string[]} argv Arguments after the script path: the title, the output path, then one
 *   or more markdown file paths.
 */
export function main(argv) {
  const [title, outPath, ...mdPaths] = argv;
  if (!title || !outPath || mdPaths.length === 0) {
    throw new Error('usage: node embed.mjs <title> <out.html> <file.md> [more.md ...]');
  }
  const root = repoRoot(import.meta.url);
  const files = mdPaths.map((mdPath) => loadReviewFile(mdPath, root));
  const templateSource = readFileSync(TEMPLATE_PATH, 'utf8');
  const runtimeSource = readFileSync(RUNTIME_PATH, 'utf8');
  writeFileSync(outPath, embedBatch(templateSource, runtimeSource, { title, files }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
