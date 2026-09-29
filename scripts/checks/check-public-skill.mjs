// cairn-cms: the coverage gate for the `cairn-public` skill (skills/cairn-public). The skill's
// catalogue teaches a designer the markup and tokens of every public piece cairn ships, so a piece
// with no page, a class that never compiles, or a token that resolves nowhere is a teaching error no
// reader would catch. Three assertions:
//
//   1. Every source has a page. The sources are the showcase registry's component list (counted from
//      the list itself, so a directive with no `preview` still needs its page), the engine's two
//      built-in directives, every hydrating directive (an island), the engine's public components,
//      every `.cairn-*` class the chassis composition sheet defines, and the six prose pages.
//   2. Every class a snippet uses compiles. A snippet is a fenced block; its `class="..."` values
//      must appear in the showcase's public sheet (compiled by the showcase's own Tailwind CLI, its
//      sources the showcase's alone, never the skill's files, or every valid utility would compile
//      and this check would pass vacuously), in the showcase's plain `site.css`, in a `<style>`
//      block of an engine public component, or in the emitted-class registry.
//   3. Every token a page names resolves. A token is a `--name` inside a fenced block or an inline
//      code span. It resolves as `theme-conformance` resolves a `var()`: through the public import
//      chain, Tailwind's theme variables, daisyUI's theme keys, or a custom property the showcase
//      declares. A property an engine public component reads only behind a fallback is an override
//      seam, which the rule never flags, so it resolves too.
//
// A parser that matches nothing fails, since a renamed heading or a moved file would otherwise leave
// every assertion green over zero inputs. The engine's built-in directive names are private to
// src/lib/render/registry.ts, so the gate names them itself and asserts, by reading that source,
// that its list still equals the engine's.
//
// A fourth check guards the packaging boundary: a scaffolded site keeps its agent skills under
// `.claude/`, whose files quote utility classes as worked examples. The compile here proves a
// utility used only under `.claude/skills/cairn-public/` never reaches the site's compiled sheet.
//
// Needs `npm run package` first (the audit and the engine's public stylesheet come from `dist/`) and
// the showcase's installed dependencies. Wired as `npm run check:public-skill`.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { repoRoot } from '../repo-root.mjs';

/**
 * The engine's built-in directive names, which the render step handles and a site cannot register
 * a component under. The gate asserts this list against `RESERVED_DIRECTIVE_NAMES` in
 * `src/lib/render/registry.ts`.
 */
export const ENGINE_BUILTIN_DIRECTIVES = ['figure', 'include'];

/** The six prose pages, one per group of reading-surface elements. */
export const PROSE_PAGES = ['headings-and-lead', 'links', 'lists', 'blockquote', 'code', 'tables-and-figures'];

/** The skill directory, repo-relative. */
const SKILL_DIR = 'skills/cairn-public';

/**
 * One directive of the showcase registry.
 * @typedef {object} DirectiveDef
 * @property {string} name the directive's name
 * @property {string} [previewMarkdown] the markdown `previewMarkdown` builds from the def's preview,
 *   absent when the def declares none
 * @property {boolean} [hydrate] whether the directive mounts as an island
 */

/**
 * One source that needs a catalogue page.
 * @typedef {object} PageSource
 * @property {'directive' | 'island' | 'component' | 'composition' | 'prose'} kind
 * @property {string} name
 * @property {string} file the page's path relative to the skill directory
 */

/**
 * Everything the assertions read, gathered from disk by `runGate` and built by hand in the tests.
 * @typedef {object} Context
 * @property {DirectiveDef[]} directives the showcase registry's component list
 * @property {string[]} gateBuiltins the gate's own list of engine built-in directives
 * @property {string[]} engineBuiltins the list read off `registry.ts`
 * @property {string[]} components the engine's public component names
 * @property {string[]} compositionClasses the `.cairn-*` classes the composition sheet defines
 * @property {Record<string, string>} pages every skill file's text by path relative to the skill
 *   directory, `SKILL.md` and `references/*.md`
 * @property {(name: string) => boolean} mentionsClass whether a compiled sheet carries a class
 * @property {Set<string>} registryClasses the emitted-class registry's names
 * @property {(name: string) => boolean} resolvesToken whether a custom property resolves
 */

/**
 * The page path for a source.
 * @param {PageSource['kind']} kind
 * @param {string} name a directive or island name, a component name, a `.cairn-*` class, or a prose page
 * @returns {string} the path relative to the skill directory
 */
export function pagePath(kind, name) {
  if (kind === 'component') return `references/component-${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}.md`;
  if (kind === 'composition') return `references/composition-${name.replace(/^cairn-/, '')}.md`;
  return `references/${kind}-${name}.md`;
}

/**
 * Every source that needs a page, in a stable order.
 * @param {object} input
 * @param {DirectiveDef[]} input.directives the registry's component list
 * @param {string[]} input.builtins the engine's built-in directives
 * @param {string[]} input.components the engine's public component names
 * @param {string[]} input.compositionClasses the composition sheet's `.cairn-*` classes
 * @returns {PageSource[]}
 */
export function expectedPages({ directives, builtins, components, compositionClasses: classes }) {
  /** @type {PageSource[]} */
  const sources = [];
  const add = (/** @type {PageSource['kind']} */ kind, /** @type {string} */ name) =>
    sources.push({ kind, name, file: pagePath(kind, name) });
  for (const def of directives) add('directive', def.name);
  for (const name of builtins) add('directive', name);
  for (const def of directives) if (def.hydrate) add('island', def.name);
  for (const name of components) add('component', name);
  for (const name of classes) add('composition', name);
  for (const name of PROSE_PAGES) add('prose', name);
  return sources;
}

/**
 * The names `RESERVED_DIRECTIVE_NAMES` holds in the engine's registry source.
 * @param {string} source `src/lib/render/registry.ts`
 * @returns {string[]}
 */
export function parseReservedDirectives(source) {
  const set = /RESERVED_DIRECTIVE_NAMES\s*=\s*new Set\(\[([^\]]*)\]\)/.exec(source);
  const names = set ? [...set[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]) : [];
  if (names.length === 0) throw new Error('no reserved directive names parsed from registry.ts; the gate cannot compare its built-in list');
  return names;
}

/**
 * Compare the gate's built-in list with the engine's, in both directions.
 * @param {string[]} gate
 * @param {string[]} engine
 * @returns {string | undefined} the disagreement, or undefined when the lists are equal
 */
export function checkBuiltinList(gate, engine) {
  const problems = [
    ...gate.filter((name) => !engine.includes(name)).map((name) => `the gate names built-in directive "${name}", which registry.ts's reserved list lacks`),
    ...engine.filter((name) => !gate.includes(name)).map((name) => `registry.ts reserves "${name}", which the gate's built-in list lacks`),
  ];
  return problems.length === 0 ? undefined : problems.join('; ');
}

/**
 * The `.cairn-*` classes a stylesheet defines, comments excluded.
 * @param {string} css
 * @returns {string[]}
 */
export function compositionClasses(css) {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const names = [...new Set([...bare.matchAll(/\.(cairn-[a-z0-9-]+)/g)].map((match) => match[1]))].sort();
  if (names.length === 0) throw new Error('no composition class parsed: the composition sheet defines no .cairn-* class');
  return names;
}

/**
 * The class names the emitted-class registry lists, read from the reference page's section.
 * @param {string} renderMd `docs/reference/render.md`
 * @returns {Set<string>}
 */
export function parseEmittedRegistry(renderMd) {
  const start = renderMd.indexOf('## Emitted classes');
  if (start === -1) throw new Error('no emitted-class registry parsed: render.md has no "Emitted classes" section');
  const rest = renderMd.slice(start + 3);
  const end = rest.search(/\n## /);
  const section = end === -1 ? rest : rest.slice(0, end);
  const names = new Set([...section.matchAll(/`([^`]+)`/g)].map((match) => match[1]).filter((span) => /^[a-z][a-z0-9-]*$/.test(span)));
  if (names.size === 0) throw new Error('no emitted-class registry parsed: the "Emitted classes" section names no class');
  return names;
}

/**
 * The 1-based line an offset sits on.
 * @param {string} text
 * @param {number} offset
 * @returns {number}
 */
function lineAt(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text[i] === '\n') line++;
  return line;
}

/**
 * The fenced blocks of a markdown text, each with its offset.
 * @param {string} text
 * @returns {{ start: number, end: number }[]}
 */
function fences(text) {
  return [...text.matchAll(/```[\s\S]*?```/g)].map((match) => ({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length }));
}

/**
 * The class tokens the fenced snippets of a page use, from `class="..."` values. A value with a
 * `{` in it mixes a template expression in and is skipped whole.
 * @param {string} text
 * @returns {{ token: string, line: number }[]}
 */
export function snippetClasses(text) {
  /** @type {{ token: string, line: number }[]} */
  const found = [];
  for (const { start, end } of fences(text)) {
    const block = text.slice(start, end);
    for (const match of block.matchAll(/class="([^"]*)"/g)) {
      if (match[1].includes('{')) continue;
      const line = lineAt(text, start + (match.index ?? 0));
      for (const token of match[1].split(/\s+/).filter(Boolean)) found.push({ token, line });
    }
  }
  return found;
}

/**
 * The custom-property names a page names inside a fenced block or an inline code span. A name that
 * ends in a hyphen is a prefix in prose, never a token.
 * @param {string} text
 * @returns {{ token: string, line: number }[]}
 */
export function namedTokens(text) {
  const blocks = fences(text);
  /** @type {{ token: string, line: number, at: number }[]} */
  const found = [];
  const collect = (/** @type {string} */ chunk, /** @type {number} */ base) => {
    for (const match of chunk.matchAll(/(?<![A-Za-z0-9_-])--[a-z][a-z0-9-]*/g)) {
      if (match[0].endsWith('-')) continue;
      const at = base + (match.index ?? 0);
      found.push({ token: match[0], line: lineAt(text, at), at });
    }
  };
  for (const { start, end } of blocks) collect(text.slice(start, end), start);
  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    const at = match.index ?? 0;
    if (blocks.some((block) => at >= block.start && at < block.end)) continue;
    collect(match[1], at + 1);
  }
  return found.sort((a, b) => a.at - b.at).map(({ token, line }) => ({ token, line }));
}

/**
 * Run the three assertions over a context.
 * @param {Context} ctx
 * @returns {string[]} every problem found, empty when the skill covers its sources
 */
export function evaluate(ctx) {
  /** @type {string[]} */
  const problems = [];
  if (ctx.directives.length === 0) problems.push('no directive read from the showcase registry: the walk matched nothing');
  if (ctx.components.length === 0) problems.push('no public component found: the walk matched nothing');
  if (ctx.compositionClasses.length === 0) problems.push('no composition class found: the walk matched nothing');
  const drift = checkBuiltinList(ctx.gateBuiltins, ctx.engineBuiltins);
  if (drift) problems.push(drift);

  const sources = expectedPages({
    directives: ctx.directives,
    builtins: ctx.gateBuiltins,
    components: ctx.components,
    compositionClasses: ctx.compositionClasses,
  });
  const index = ctx.pages['references/README.md'];
  if (index === undefined) problems.push('references/README.md is missing: the catalogue has no reader index');
  for (const source of sources) {
    const text = ctx.pages[source.file];
    if (text === undefined) {
      problems.push(`no page for ${source.kind} "${source.name}": expected ${SKILL_DIR}/${source.file}`);
      continue;
    }
    if (index !== undefined && !index.includes(`(${basename(source.file)})`)) {
      problems.push(`references/README.md does not link ${basename(source.file)}`);
    }
    if (source.kind === 'directive' && !new RegExp(`:{2,}${source.name}\\b`).test(text)) {
      problems.push(`${source.file} never shows the authoring form :::${source.name}`);
    }
  }
  for (const def of ctx.directives) {
    if (def.previewMarkdown !== undefined && !new RegExp(`^:{3,}${def.name}\\b`).test(def.previewMarkdown)) {
      problems.push(`the preview markdown for directive "${def.name}" does not open a :::${def.name} container`);
    }
  }

  let classCount = 0;
  let tokenCount = 0;
  for (const [file, text] of Object.entries(ctx.pages)) {
    const classes = snippetClasses(text);
    classCount += classes.length;
    for (const { token, line } of classes) {
      if (ctx.mentionsClass(token) || ctx.registryClasses.has(token)) continue;
      problems.push(`${file}:${line} class "${token}" is in no compiled public sheet and no emitted-class registry`);
    }
    const tokens = namedTokens(text);
    tokenCount += tokens.length;
    for (const { token, line } of tokens) {
      if (token.startsWith('--tw-') || ctx.resolvesToken(token)) continue;
      problems.push(`${file}:${line} token ${token} resolves nowhere in the public resolution set`);
    }
  }
  if (classCount === 0) problems.push('no class found in any snippet: the extraction matched nothing');
  if (tokenCount === 0) problems.push('no token found in any page: the extraction matched nothing');
  return problems;
}

/**
 * Compile the showcase's chassis into a standalone copy that also carries a skill file under
 * `.claude/skills/cairn-public/`, and report whether a utility used only in that file reached the
 * compiled sheet. A control utility used in a plain source file must reach it, so a compile that
 * generates nothing cannot pass.
 * @param {string} root the repository root
 * @param {object} [options]
 * @param {string} [options.exclusionLine] a replacement for the chassis `@source not` line, for
 *   proving the compile can see a leak
 * @returns {{ leaked: boolean, control: boolean }}
 */
export function compileClaudeExclusion(root, { exclusionLine } = {}) {
  const showcase = resolve(root, 'examples/showcase');
  // Outside the repository, so Tailwind's gitignore-aware detection sees a standalone site the way a
  // scaffolded one is, with no ancestor ignore file.
  const dir = mkdtempSync(join(tmpdir(), 'cairn-public-skill-'));
  try {
    cpSync(join(showcase, 'src'), join(dir, 'src'), { recursive: true });
    cpSync(join(showcase, 'package.json'), join(dir, 'package.json'));
    symlinkSync(join(showcase, 'node_modules'), join(dir, 'node_modules'), 'dir');
    if (exclusionLine !== undefined) {
      const tokens = join(dir, 'src/chassis/tokens.css');
      const css = readFileSync(tokens, 'utf8');
      if (!/^@source not .*;$/m.test(css)) throw new Error('the chassis tokens.css carries no @source not line to replace');
      writeFileSync(tokens, css.replace(/^@source not .*;$/m, exclusionLine));
    }
    mkdirSync(join(dir, '.claude/skills/cairn-public/references'), { recursive: true });
    writeFileSync(join(dir, '.claude/skills/cairn-public/references/exclusion-probe.md'), '```html\n<p class="bg-[#0c1d2e]">probe</p>\n```\n');
    writeFileSync(join(dir, 'src/exclusion-control.svelte'), '<p class="bg-[#2e1d0c]">control</p>\n');
    const out = join(dir, 'out.css');
    execFileSync(join(dir, 'node_modules/.bin/tailwindcss'), ['-i', 'src/theme/theme.css', '-o', out], { cwd: dir, stdio: 'pipe' });
    const css = readFileSync(out, 'utf8');
    return { leaked: css.includes('0c1d2e'), control: css.includes('2e1d0c') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Every file under a directory whose name matches, as absolute paths.
 * @param {string} dir
 * @param {RegExp} pattern
 * @returns {string[]}
 */
function walkFiles(dir, pattern) {
  /** @type {string[]} */
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkFiles(path, pattern));
    else if (pattern.test(entry.name)) found.push(path);
  }
  return found;
}

/**
 * The skill's markdown files by path relative to the skill directory.
 * @param {string} root
 * @returns {Record<string, string>}
 */
function readSkillPages(root) {
  const dir = resolve(root, SKILL_DIR);
  if (!existsSync(dir)) throw new Error(`${SKILL_DIR} does not exist`);
  /** @type {Record<string, string>} */
  const pages = {};
  for (const path of walkFiles(dir, /\.md$/)) pages[relative(dir, path).split('\\').join('/')] = readFileSync(path, 'utf8');
  return pages;
}

/**
 * The classes declared in the `<style>` blocks of Svelte files.
 * @param {string[]} files
 * @returns {Set<string>}
 */
function styleBlockClasses(files) {
  const names = new Set();
  for (const file of files) {
    for (const block of readFileSync(file, 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
      const css = block[1].replace(/\/\*[\s\S]*?\*\//g, '');
      for (const match of css.matchAll(/\.([A-Za-z_][\w-]*)/g)) names.add(match[1]);
    }
  }
  return names;
}

/**
 * Load the showcase registry's component list, through a Vite server that resolves the showcase's
 * own aliases, and the engine's `previewMarkdown`.
 * @param {string} root
 * @returns {Promise<DirectiveDef[]>}
 */
async function loadRegistry(root) {
  const showcase = resolve(root, 'examples/showcase');
  const { createServer } = await import('vite');
  const cacheDir = mkdtempSync(join(tmpdir(), 'cairn-public-skill-vite-'));
  const server = await createServer({
    root: showcase,
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    clearScreen: false,
    cacheDir,
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    resolve: {
      alias: {
        $chassis: join(showcase, 'src/chassis'),
        $theme: join(showcase, 'src/theme'),
        $lib: join(showcase, 'src/lib'),
      },
    },
  });
  try {
    const list = await server.ssrLoadModule('/src/theme/markdown-components.ts');
    const engine = await server.ssrLoadModule('@glw907/cairn-cms');
    return /** @type {{ name: string, hydrate?: boolean, preview?: unknown }[]} */ (list.components).map((def) => ({
      name: def.name,
      hydrate: def.hydrate === true,
      previewMarkdown: engine.previewMarkdown(def),
    }));
  } finally {
    await server.close();
    rmSync(cacheDir, { recursive: true, force: true });
  }
}

/**
 * Compile the showcase's public entry sheet with the showcase's own Tailwind CLI.
 * @param {string} showcase
 * @returns {string} the compiled CSS
 */
function compilePublicSheet(showcase) {
  const dir = mkdtempSync(join(tmpdir(), 'cairn-public-skill-css-'));
  try {
    const out = join(dir, 'public.css');
    execFileSync(join(showcase, 'node_modules/.bin/tailwindcss'), ['-i', 'src/theme/theme.css', '-o', out], { cwd: showcase, stdio: 'pipe' });
    return readFileSync(out, 'utf8');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Run the whole gate over a repository.
 * @param {string} root the repository root
 * @returns {Promise<{ problems: string[], pageCount: number, summary: string }>}
 */
export async function runGate(root) {
  const showcase = resolve(root, 'examples/showcase');
  const audit = await import(pathToFileURL(resolve(root, 'dist/audit/index.js')).href);
  const raw = JSON.parse(readFileSync(resolve(root, 'scripts/checks/public-scope.config.json'), 'utf8'));
  const config = audit.resolveConfig(showcase, raw, (/** @type {string} */ candidate) => existsSync(resolve(showcase, candidate)));
  const chain = audit.loadImportChain(showcase, config.publicStylesheets);

  const compiled = audit.parseSheet(compilePublicSheet(showcase));
  const siteSheet = audit.parseSheet(readFileSync(resolve(showcase, 'src/theme/site.css'), 'utf8'));
  const componentFiles = [
    ...walkFiles(resolve(root, 'src/lib/public'), /\.svelte$/),
    ...walkFiles(resolve(root, 'src/lib/delivery'), /\.svelte$/),
  ];
  const scopedClasses = styleBlockClasses(componentFiles);

  // The resolution set: what `theme-conformance` counts as a definition, plus the override seams the
  // engine's public components read behind a fallback.
  const declared = new Set([...audit.loadTailwindVariables(showcase, audit.nodePeers)]);
  for (const key of audit.loadDaisyThemeKeys(showcase, audit.nodePeers).keys) if (key.startsWith('--')) declared.add(key);
  for (const file of chain.files) {
    for (const rule of file.sheet.rules) {
      for (const declaration of rule.declarations) if (declaration.property.startsWith('--')) declared.add(declaration.property);
    }
  }
  for (const file of walkFiles(resolve(showcase, 'src'), /\.(css|svelte|ts)$/)) {
    for (const match of readFileSync(file, 'utf8').matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) declared.add(match[1]);
  }
  for (const file of componentFiles) {
    for (const match of readFileSync(file, 'utf8').matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*,/g)) declared.add(match[1]);
  }

  const directives = await loadRegistry(root);
  const components = componentFiles.map((file) => basename(file, '.svelte')).sort();
  const ctx = {
    directives,
    gateBuiltins: [...ENGINE_BUILTIN_DIRECTIVES],
    engineBuiltins: parseReservedDirectives(readFileSync(resolve(root, 'src/lib/render/registry.ts'), 'utf8')),
    components,
    compositionClasses: compositionClasses(readFileSync(resolve(showcase, 'src/chassis/composition.css'), 'utf8')),
    pages: readSkillPages(root),
    mentionsClass: (/** @type {string} */ name) => compiled.mentions(name) || siteSheet.mentions(name) || scopedClasses.has(name),
    registryClasses: parseEmittedRegistry(readFileSync(resolve(root, 'docs/reference/render.md'), 'utf8')),
    resolvesToken: (/** @type {string} */ name) => declared.has(name),
  };
  const problems = evaluate(ctx);

  const exclusion = compileClaudeExclusion(root);
  if (!exclusion.control) problems.push('the .claude exclusion compile generated no utility for its control file, so it proves nothing');
  if (exclusion.leaked) problems.push('a utility used only under .claude/skills/cairn-public reached a scaffolded site sheet: the chassis @source not line does not exclude the project-root .claude');

  const sources = expectedPages({
    directives,
    builtins: ctx.gateBuiltins,
    components,
    compositionClasses: ctx.compositionClasses,
  });
  const withPreview = directives.filter((def) => def.previewMarkdown !== undefined).length;
  const pageTexts = Object.values(ctx.pages);
  const classCount = pageTexts.reduce((sum, text) => sum + snippetClasses(text).length, 0);
  const tokenCount = pageTexts.reduce((sum, text) => sum + namedTokens(text).length, 0);
  return {
    problems,
    pageCount: sources.length,
    summary:
      `${sources.length} pages cover ${directives.length} registry directives (${withPreview} with a preview) and ` +
      `${ctx.gateBuiltins.length} built-ins, ${directives.filter((def) => def.hydrate).length} islands, ${components.length} components, ` +
      `${ctx.compositionClasses.length} composition classes, and ${PROSE_PAGES.length} prose pages; ` +
      `${classCount} snippet classes and ${tokenCount} token names checked`,
  };
}

async function main() {
  const { problems, summary } = await runGate(repoRoot(import.meta.url));
  if (problems.length > 0) {
    for (const problem of problems) console.error(`check-public-skill: ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`check-public-skill: ${summary}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`check-public-skill: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  });
}
