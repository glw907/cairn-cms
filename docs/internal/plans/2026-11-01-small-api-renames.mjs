// Re-runnable mechanical renames for small-api T10 and T14. Plan scaffolding: it leaves with the plan
// files at close. Run from the worktree root: `node docs/internal/plans/2026-11-01-small-api-renames.mjs routing`
// or `... block`. It rewrites tracked text files in place and prints the changed count. A second run
// changes nothing, so a merge that takes main's side re-runs it. The task hand-edits what isn't here.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const ROUTING = [
  [/^[ \t]*inFeeds: (?:true|false),?\n/gm, ''],
  [/,\s*inFeeds: (?:true|false)/g, ''],
  [/routing: (['"])feed\1/g, 'routing: $1dated$1'],
  [/resolveRouting\('feed', 'posts'\)\)\.toEqual/g, "resolveRouting('dated', 'posts')).toEqual"],
  [/'feed' \| 'page' \| 'embedded'/g, "'dated' | 'page' | 'embedded'"],
  [/must be one of feed, page, embedded/g, 'must be one of dated, page, embedded'],
];

const BLOCK = [
  [/\bdefineComponent\b/g, 'defineBlock'],
  [/\bComponentDef\b/g, 'BlockDef'],
  [/\bComponentRegistry\b/g, 'BlockRegistry'],
  [/\bComponentContext\b/g, 'BlockContext'],
  [/\bonComponentAtCaret\b/g, 'onBlockAtCaret'],
  [/\bmarkdown-components\b/g, 'markdown-blocks'],
  [/\brendering(\??)\.components\b/g, 'rendering$1.blocks'],
  [/\b(defineRegistry|createRenderer)\(\{(\s*)components\b/g, '$1({$2blocks'],
  [/Insert a component/g, 'Insert a block'],
  [/Search components/g, 'Search blocks'],
  [/Back to components/g, 'Back to blocks'],
  [/Edit the component at the cursor/g, 'Edit the block at the cursor'],
  [/Place the cursor in a component to edit it/g, 'Place the cursor in an editable block to edit it'],
  [/(Unf|F)old this section/g, '$1old this block'],
  [/Layout marker\./g, 'Block marker.'],
  [/\b([Ll])ayout blocks\b/g, (_, l) => (l === 'L' ? 'Blocks' : 'blocks')],
];

const TABLES = { routing: ROUTING, block: BLOCK };
const table = TABLES[process.argv[2]];
if (!table) {
  console.error('usage: renames.mjs routing|block');
  process.exit(1);
}

const roots = ['src', 'examples/showcase', 'skills', 'docs', 'packages', 'scripts/checks', '.claude/skills', '.vale'];
const skip = /^(docs\/internal\/|scripts\/checks\/api-surface\.md$|.*-snapshots\/|packages\/create-cairn-site\/template\/)/;
const text = /\.(ts|svelte|js|mjs|json|md|yml|yaml)$/;
const paths = execFileSync('git', ['ls-files', '--', ...roots], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n')
  .filter((p) => p && text.test(p) && !skip.test(p));

let changed = 0;
for (const path of paths) {
  const before = readFileSync(path, 'utf8');
  const after = table.reduce((s, [from, to]) => s.replace(from, to), before);
  if (after !== before) {
    writeFileSync(path, after);
    changed++;
  }
}
console.log(`renames ${process.argv[2]}: ${changed} files changed of ${paths.length}`);
