// cairn-cms: the reproduction manifest's shape and its node-safety guarantee.
//
// The manifest is the node-safe half of the reproductions seam: the engine's check:visuals and
// cairn-pub's fence validation both read it from a plain `node` process, so it may hold data and
// nothing else. The import-graph assertion below is what keeps that true against the source tree;
// reproductions-manifest-dist-spawn.test.ts makes the same claim against the emitted dist, where a
// packaging rewrite could reintroduce what the source walk cannot see.
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { staticImportGraph } from './_static-import-graph.js';
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

// The five rows whose page cannot render its subject at every width, and the exact widths each may
// therefore be pinned to. A row declaring only the widths its page can show is what makes the fence
// schema refuse to picture a screen at a size that cannot show it, so these are asserted exactly:
// restoring `column` to any of them is the failure this test exists to catch.
//
// `editor/sidebar-list` and `nav/worked-navlayout` name the shell's sidebar, a drawer that becomes
// persistent at `lg` off a desk path and at `xl` on one (CairnAdminShell.svelte:561-563), so only
// `wide` (1280) shows it. `editor/entry-screen` and `editor/preview-tab` name the Write/Preview
// tablist and the device trigger, both inside an `sm:`-gated wrapper (EditorToolbar.svelte:423), so
// the render needs at least 640 and `desktop` (860) is the pinned width that clears it.
// `editor/toolbar` is the same `sm:` gate seen from the other side: the strip is the whole subject,
// and below 640 it loses that tablist (with no `moreExtra` under this story to compensate) and
// every cluster's micro-eyebrow, so a responsive `column` render would show the subject stripped.
const PINNED_WIDTHS: Record<string, string[]> = {
  'editor/sidebar-list': ['wide'],
  'nav/worked-navlayout': ['wide'],
  'editor/entry-screen': ['desktop'],
  'editor/preview-tab': ['desktop'],
  'editor/toolbar': ['desktop'],
};

const MANIFEST_SOURCE = resolve(process.cwd(), 'src/lib/reproductions/manifest.ts');

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

  it('declares only the widths each width-constrained row can actually render at', () => {
    for (const [id, widths] of Object.entries(PINNED_WIDTHS)) {
      const declared = Object.entries(byId(id).heights)
        .filter(([, height]) => typeof height === 'number')
        .map(([width]) => width)
        .sort();
      expect(declared, `${id} declared widths`).toEqual([...widths].sort());
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
