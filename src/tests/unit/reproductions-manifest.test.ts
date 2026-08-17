// cairn-cms: the reproduction manifest's shape and its node-safety guarantee.
//
// The manifest is the node-safe half of the reproductions seam: the engine's check:visuals and
// cairn-pub's fence validation both read it from a plain `node` process, so it may hold data and
// nothing else. The import-graph assertion below is what keeps that true against the source tree;
// reproductions-manifest-dist-spawn.test.ts makes the same claim against the emitted dist, where a
// packaging rewrite could reintroduce what the source walk cannot see.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { manifest, type ReproManifestEntry } from '../../lib/reproductions/manifest.js';

// The 25 ids the spec's story inventory freezes (cairn-pub
// docs/superpowers/specs/2026-08-15-live-reproduction-seam-design.md). Changing one is a spec edit,
// so this list is written out rather than derived from the manifest it checks.
const IDS = [
  'auth/login',
  'auth/confirm',
  'editor/entry-screen',
  'editor/toolbar',
  'editor/sidebar-list',
  'editor/preview-tab',
  'editor/details-panel',
  'editor/figure-dialog',
  'editor/tidy-review',
  'editor/collapsed-layout-block',
  'publish/header-band',
  'publish/history-list',
  'publish/pending-list',
  'publish/refusal-banner',
  'media/insert-panel',
  'media/upload-form',
  'media/lead-picture-dialog',
  'media/library',
  'media/details-panel',
  'media/bulk-selection',
  'media/delete-in-use',
  'tags/screen',
  'roster/own-row',
  'nav/worked-navlayout',
  'toolkit/custom-screen',
];

// The three locate-many-controls screens the spec gives numbered callouts.
const MARKED = ['editor/entry-screen', 'media/library', 'tags/screen'];

const MANIFEST_SOURCE = resolve(process.cwd(), 'src/lib/reproductions/manifest.ts');

// A bound specifier (`import x from './a.js'`, `export * from './b.js'`) and a side-effect one
// (`import './c.svelte'`) are both static graph edges, and the side-effect form is the one that
// pulls in a stylesheet or a component for its effects alone. Matching only the `from` shape let
// `import './probe.svelte'` walk straight past this test, so both forms are matched.
const BOUND_IMPORT = /(?:^|\n)\s*(?:import|export)[\s\S]*?\bfrom\s*['"](\.[^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT = /(?:^|\n)\s*import\s*['"](\.[^'"]+)['"]/g;

/** Every relative specifier a module names. A dynamic import is not a static graph edge. */
function relativeImports(source: string): string[] {
  const out: string[] = [];
  for (const pattern of [BOUND_IMPORT, SIDE_EFFECT_IMPORT]) {
    for (const match of source.matchAll(pattern)) out.push(match[1]);
  }
  return out;
}

/** Walk the manifest's static import graph, resolving each NodeNext `.js` specifier to its `.ts`. */
function staticImportGraph(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const specifier of relativeImports(source)) {
      // NodeNext specifiers name the emitted `.js`; the source beside it is `.ts`. A `.svelte`
      // specifier resolves to itself, which is exactly the case this test exists to catch.
      const resolved = resolve(dirname(file), specifier.replace(/\.js$/, '.ts'));
      queue.push(resolved);
    }
  }
  return [...seen];
}

function byId(id: string): ReproManifestEntry {
  const entry = manifest.find((e) => e.id === id);
  if (!entry) throw new Error(`no manifest entry for ${id}`);
  return entry;
}

describe('reproductions manifest', () => {
  it('carries exactly the 25 frozen story ids, in the inventory order', () => {
    expect(manifest.map((e) => e.id)).toEqual(IDS);
  });

  it('gives every marked story a non-empty marker key set', () => {
    for (const id of MARKED) {
      expect(byId(id).markerKeys.length, `${id} markerKeys`).toBeGreaterThan(0);
    }
  });

  it('leaves every unmarked story without marker keys', () => {
    for (const entry of manifest) {
      if (MARKED.includes(entry.id)) continue;
      expect(entry.markerKeys, `${entry.id} markerKeys`).toEqual([]);
    }
  });

  it('declares both pinned heights for publish/header-band', () => {
    const band = byId('publish/header-band');
    expect(band.heights.desktop).toBeTypeOf('number');
    expect(band.heights.narrow).toBeTypeOf('number');
  });

  it('declares at least one height per story', () => {
    for (const entry of manifest) {
      const declared = Object.values(entry.heights).filter((h) => typeof h === 'number');
      expect(declared.length, `${entry.id} heights`).toBeGreaterThan(0);
    }
  });

  it('marks ownThemeRoot on the two auth stories and on every shell-hosted story', () => {
    for (const entry of manifest) {
      const owns = entry.id === 'auth/login' || entry.id === 'auth/confirm' || entry.host === 'shell';
      expect(entry.ownThemeRoot, `${entry.id} ownThemeRoot`).toBe(owns);
    }
  });

  it('hosts every story in the shell or bare', () => {
    for (const entry of manifest) {
      expect(['shell', 'bare'], `${entry.id} host`).toContain(entry.host);
    }
  });

  it('imports no .svelte module anywhere in its static graph', () => {
    const graph = staticImportGraph(MANIFEST_SOURCE);
    expect(graph.filter((f) => f.endsWith('.svelte'))).toEqual([]);
  });
});
