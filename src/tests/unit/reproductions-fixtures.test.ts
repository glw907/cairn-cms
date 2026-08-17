// cairn-cms: the live-reproduction seam's fixture set holds itself to internal consistency, since
// nothing else checks that an id one fixture names actually exists in another. Also holds ./fixtures.ts
// to the same node-safety contract ./manifest.ts already proves for itself
// (reproductions-manifest.test.ts): both halves of the reproductions module load from a plain `node`
// process with no `.svelte` in the static graph.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  fixtureConcept,
  fixtureEditor,
  fixtureEntries,
  fixtureMediaLibrary,
  fixtureVocabulary,
  fixtureNavLayout,
  fixtureCaptureFile,
} from '../../lib/reproductions/fixtures.js';
import { fixtureMediaBase, fixtureMediaFiles } from '../../lib/reproductions/manifest.js';
import { publicPath } from '../../lib/media/naming.js';

const FIXTURES_SOURCE = resolve(process.cwd(), 'src/lib/reproductions/fixtures.ts');
const FIXTURES_DIR = resolve(process.cwd(), 'src/lib/reproductions/fixtures');

// Mirrors reproductions-manifest.test.ts's own graph walk: a bound specifier and a side-effect one
// are both static edges, and a `.svelte` specifier resolving anywhere in the graph is exactly the
// failure this exists to catch.
const BOUND_IMPORT = /(?:^|\n)\s*(?:import|export)[\s\S]*?\bfrom\s*['"](\.[^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT = /(?:^|\n)\s*import\s*['"](\.[^'"]+)['"]/g;

function relativeImports(source: string): string[] {
  const out: string[] = [];
  for (const pattern of [BOUND_IMPORT, SIDE_EFFECT_IMPORT]) {
    for (const match of source.matchAll(pattern)) out.push(match[1]);
  }
  return out;
}

function staticImportGraph(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const specifier of relativeImports(source)) {
      const resolved = resolve(dirname(file), specifier.replace(/\.js$/, '.ts'));
      queue.push(resolved);
    }
  }
  return [...seen];
}

describe('reproduction fixtures', () => {
  it('imports no .svelte module anywhere in its static graph', () => {
    const graph = staticImportGraph(FIXTURES_SOURCE);
    expect(graph.filter((f) => f.endsWith('.svelte'))).toEqual([]);
  });

  it('gives every entry the fixture concept', () => {
    expect(fixtureEntries.length).toBeGreaterThan(0);
    for (const entry of fixtureEntries) {
      expect(entry.concept, entry.id).toBe(fixtureConcept.id);
    }
  });

  it('credits the open draft to the signed-in fixture editor', () => {
    const withDraft = fixtureEntries.filter((e) => e.history?.draft);
    expect(withDraft.length, 'entries carrying an open draft').toBeGreaterThan(0);
    for (const entry of withDraft) {
      expect(entry.history?.draft?.editor).toBe(fixtureEditor.displayName);
    }
  });

  it('marks one media asset in use by a real fixture entry, for media/delete-in-use', () => {
    const usageRows = Object.values(fixtureMediaLibrary.usage);
    expect(usageRows.length, 'assets with a usage overlay').toBeGreaterThan(0);
    const entryIds = new Set(fixtureEntries.map((e) => e.id));
    for (const usage of usageRows) {
      expect(usage.count).toBe(usage.entries.length);
      for (const row of usage.entries) {
        expect(row.concept).toBe(fixtureConcept.id);
        expect(entryIds.has(row.id), `usage row names entry "${row.id}"`).toBe(true);
      }
    }
  });

  it('every fixtureMediaLibrary asset composes a URL from fixtureMediaBase, matching a real file', () => {
    const onDisk = new Set(fixtureMediaFiles);
    for (const asset of fixtureMediaLibrary.assets) {
      const url = publicPath(asset.slug, asset.hash, asset.ext, 'slug', fixtureMediaBase);
      expect(url.startsWith(`${fixtureMediaBase}/`), url).toBe(true);
      const filename = url.slice(fixtureMediaBase.length + 1);
      expect(onDisk.has(filename), `${filename} is a served fixture file`).toBe(true);
    }
  });

  it('never hardcodes /repro-assets or /media in its own source', () => {
    const source = readFileSync(FIXTURES_SOURCE, 'utf8');
    expect(source.includes('/repro-assets')).toBe(false);
    expect(source.includes("'/media'")).toBe(false);
  });

  it('matches fixtureMediaFiles to the bytes actually on disk, both directions', () => {
    const onDisk = readdirSync(FIXTURES_DIR).filter((f) => !f.startsWith('.'));
    expect(new Set(fixtureMediaFiles)).toEqual(new Set(onDisk));
    // readdirSync could mask a duplicate; the manifest list itself must carry no repeats either.
    expect(fixtureMediaFiles.length).toBe(new Set(fixtureMediaFiles).size);
  });

  it('exposes a synchronously constructible File for media/upload-form, with a real filename stem', () => {
    expect(fixtureCaptureFile).toBeInstanceOf(File);
    expect(fixtureCaptureFile.size).toBeGreaterThan(0);
    // A generic camera stem (IMG_1234, DSC0001, a bare number) suppresses MediaCaptureCard's
    // Suggested tag; the fixture's stem must read as a real, specific name instead.
    const stem = fixtureCaptureFile.name.replace(/\.[^.]+$/, '');
    expect(stem).not.toMatch(/^(img|dsc|dscn|dsc_|photo|image)[_-]?\d+$/i);
    expect(stem).not.toMatch(/^\d+$/);
  });

  it('gives the roster (fixtureEditor) a well-formed, addressable identity', () => {
    expect(fixtureEditor.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    expect(fixtureEditor.displayName.length).toBeGreaterThan(0);
    expect(fixtureEditor.capability).toBe('editor');
  });

  it('carries an unused tag and an unlisted tag, for tags/screen', () => {
    const values = new Set(fixtureVocabulary.vocabulary.map((v) => v.value));
    expect(Object.values(fixtureVocabulary.usage).some((count) => count === 0)).toBe(true);
    expect(fixtureVocabulary.unlisted.length).toBeGreaterThan(0);
    for (const unlisted of fixtureVocabulary.unlisted) {
      expect(values.has(unlisted.value), `${unlisted.value} is genuinely unlisted`).toBe(false);
    }
  });

  it('resolves the organize-your-admin-nav.md worked example, with an unreferenced trailing group', () => {
    const referenced = new Set(
      fixtureNavLayout.items.flatMap((node) => ('children' in node ? node.children : [node])).map((child) =>
        'screen' in child ? child.screen : null,
      ),
    );
    expect(referenced.has('posts')).toBe(true);
    expect(referenced.has('media')).toBe(true);
    expect(referenced.has('settings')).toBe(true);
    expect(fixtureNavLayout.fallback.length, 'the trailing group after the divider').toBeGreaterThan(0);
    for (const child of fixtureNavLayout.fallback) {
      expect('screen' in child, 'fallback carries only engine references').toBe(true);
    }
  });
});
