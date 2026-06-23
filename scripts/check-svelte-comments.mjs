// cairn-cms: the Svelte comment gate. Vale's .svelte handling reaches neither comment home cleanly
// (the html format skips <!-- --> and the script comments live in a code block), and it leaks into
// the component's product copy, which check:prose owns. So this extractor pulls only the comment
// regions, the @component block and the <script>-block comments, into a per-file Markdown buffer
// that preserves line numbers, and runs Vale glw907 over the buffer. It also enforces the structural
// rule: at most one @component block, and a present block carries a sentence.
//
//   node scripts/check-svelte-comments.mjs    extract, lint, and fail on a structural or Vale error
import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS_DIR = join(ROOT, 'src', 'lib', 'components');
const STYLES = join(ROOT, '.vale', 'styles');

// Return the 0-based line spans of comment text to keep, as [line, text] pairs.
function extractComments(src) {
  const lines = src.split('\n');
  const kept = []; // [lineIndex, text]
  let componentBlocks = 0;
  let componentHasProse = false;

  // HTML comments, including @component.
  const htmlRe = /<!--([\s\S]*?)-->/g;
  let m;
  while ((m = htmlRe.exec(src)) !== null) {
    const isComponent = /(^|\s)@component(\s|$)/m.test(m[1]);
    const startLine = src.slice(0, m.index).split('\n').length - 1;
    const body = m[1].split('\n');
    if (isComponent) {
      componentBlocks += 1;
      body.forEach((t, i) => {
        const clean = t.replace(/@component/, '').trim();
        if (clean) { kept.push([startLine + i, clean]); componentHasProse = true; }
      });
    } else {
      body.forEach((t, i) => { if (t.trim()) kept.push([startLine + i, t.trim()]); });
    }
  }

  // Script-block comments: // line, /* */ and /** */ block, inside <script>...</script>.
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
  while ((m = scriptRe.exec(src)) !== null) {
    const scriptStart = src.slice(0, m.index).split('\n').length - 1;
    const scriptLines = m[1].split('\n');
    let inBlock = false;
    scriptLines.forEach((line, i) => {
      const lineNo = scriptStart + i; // 0-based source line, consistent with the HTML path
      let text = '';
      if (inBlock) {
        const end = line.indexOf('*/');
        text = (end === -1 ? line : line.slice(0, end)).replace(/^\s*\*?/, '').trim();
        if (end !== -1) inBlock = false;
      } else {
        const lineComment = line.match(/\/\/(.*)$/);
        const blockOpen = line.match(/\/\*\*?(.*)$/);
        if (lineComment) text = lineComment[1].trim();
        else if (blockOpen) {
          const end = blockOpen[1].indexOf('*/');
          text = (end === -1 ? blockOpen[1] : blockOpen[1].slice(0, end)).replace(/^\*?/, '').trim();
          if (end === -1) inBlock = true;
        }
      }
      if (text) kept.push([lineNo, text]);
    });
  }

  return { kept, componentBlocks, componentHasProse };
}

const files = readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith('.svelte')).sort();
const tmp = mkdtempSync(join(tmpdir(), 'cairn-svelte-'));
// The temp config mirrors cairn's .ts policy: glw907.Judgment is advisory (it over-fires on
// legitimate technical vocab, e.g. a "dedicated" icon), so it never gates the comment text.
writeFileSync(join(tmp, '.vale.ini'),
  `StylesPath = ${STYLES}\nMinAlertLevel = suggestion\n[*.md]\nBasedOnStyles = glw907\nglw907.Judgment = suggestion\n`);

let fail = 0;
const lineMaps = {}; // mdFile -> { component, lineForMdLine: {mdLine: srcLine} }

for (const f of files) {
  const src = readFileSync(join(COMPONENTS_DIR, f), 'utf8');
  const { kept, componentBlocks, componentHasProse } = extractComments(src);

  if (componentBlocks > 1) {
    console.error(`STRUCTURE: ${f} has ${componentBlocks} @component blocks; the LSP reads only the last. Keep one.`);
    fail = 1;
  }
  if (componentBlocks === 1 && !componentHasProse) {
    console.error(`STRUCTURE: ${f} has an empty @component block; give it a sentence or remove it.`);
    fail = 1;
  }

  // Build a line-preserving Markdown buffer: each kept comment sits on its source line.
  const total = src.split('\n').length;
  const buf = new Array(total).fill('');
  const md2src = {};
  for (const [lineIdx, text] of kept) { buf[lineIdx] = text; md2src[lineIdx + 1] = lineIdx + 1; }
  const mdName = `${f}.md`;
  writeFileSync(join(tmp, mdName), buf.join('\n'));
  lineMaps[mdName] = { component: f, md2src };
}

// One Vale run over all extracted buffers, error level only.
let valeOut = '';
try {
  valeOut = execFileSync('vale', ['--config', join(tmp, '.vale.ini'), '--minAlertLevel=error', '--output=line', tmp],
    { encoding: 'utf8' });
} catch (e) {
  valeOut = (e.stdout || '') + (e.stderr || ''); // vale exits non-zero when it finds something
}

for (const line of valeOut.split('\n')) {
  const mm = line.match(/([^/\s]+\.svelte\.md):(\d+):\d+:(.+)/);
  if (!mm) continue;
  const map = lineMaps[mm[1]];
  if (!map) continue;
  console.error(`VALE: ${map.component}:${mm[2]} ${mm[3].trim()}`);
  fail = 1;
}

rmSync(tmp, { recursive: true, force: true });
console.log(fail === 0 ? 'check:svelte-comments OK' : 'check:svelte-comments FAILED');
process.exit(fail);
