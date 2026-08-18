// cairn-cms: the repro fence validator, shared by the engine's check:visuals gate (gate 1) and
// cairn-pub's docsReproBlocks build-time throw (gate 3, Pass 2). One implementation checks a
// `repro` fence body against the manifest so the two gates cannot silently drift apart.
//
// This module stays on the node-safe half of the reproductions seam: nothing here may import
// Svelte, so a bare `node` process (this gate, cairn-pub's build) can run it. The
// `ReproManifestEntry` import below is type-only, erased entirely at compile time, so it adds no
// runtime edge back to ./manifest.js despite manifest.ts re-exporting from here.
import { parse } from 'yaml';
import type { ReproManifestEntry } from './manifest.js';

/** The result of checking one `repro` fence body against the installed manifest. */
export interface ReproFenceValidation {
  /** One line per rule violated, empty when the fence is well-formed. */
  issues: string[];
}

const REQUIRED_KEYS = ['story', 'alt', 'caption'] as const;
const ALLOWED_KEYS = new Set<string>([...REQUIRED_KEYS, 'width']);
const MAX_ALT_LENGTH = 150;

/**
 * Check a `repro` fence body against the spec's fence schema (gate 1): the YAML parses, the
 * required keys are present, no unknown key rides along, `alt` names the kind and stays under the
 * length ceiling, the story id resolves against the installed manifest, and `width`, if given,
 * names a width that story's manifest entry actually declares a height for.
 *
 * `ReproHeights` is the schema for that last rule: nothing here enumerates width names, so a story
 * that later declares a new pinned width needs no matching edit here, and a story that declares
 * only some widths refuses a fence pinned to one it cannot show.
 * @param body - the fence's raw YAML body
 * @param manifest - the installed engine's story manifest
 */
export function validateReproFence(
  body: string,
  manifest: ReproManifestEntry[],
): ReproFenceValidation {
  const issues: string[] = [];

  let parsed: unknown;
  try {
    parsed = parse(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    issues.push(`malformed YAML: ${message}`);
    return { issues };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    issues.push('repro fence body must be a YAML mapping');
    return { issues };
  }

  const data = parsed as Record<string, unknown>;

  for (const key of REQUIRED_KEYS) {
    const value = data[key];
    if (typeof value !== 'string' || value.trim() === '') {
      issues.push(`missing required key "${key}"`);
    }
  }

  for (const key of Object.keys(data)) {
    if (!ALLOWED_KEYS.has(key)) issues.push(`unknown key "${key}"`);
  }

  const alt = data.alt;
  if (typeof alt === 'string') {
    if (alt.length > MAX_ALT_LENGTH) {
      issues.push(`alt text is ${alt.length} characters, over the ${MAX_ALT_LENGTH}-character limit`);
    }
    if (!/^reproduction\b/i.test(alt.trim())) {
      issues.push('alt text must name the kind, starting with "Reproduction"');
    }
  }

  const story = data.story;
  let entry: ReproManifestEntry | undefined;
  if (typeof story === 'string') {
    entry = manifest.find((candidate) => candidate.id === story);
    if (!entry) issues.push(`story "${story}" is not in the installed manifest`);
  }

  const width = data.width;
  if (width !== undefined) {
    let isValid = false;
    let declaredWidths: string[] = [];
    if (entry) {
      const heights = entry.heights as Record<string, number | undefined>;
      declaredWidths = Object.entries(heights)
        .filter((pair): pair is [string, number] => typeof pair[1] === 'number')
        .map(([name]) => name)
        .sort();
      isValid = typeof width === 'string' && typeof heights[width] === 'number';
    }
    if (!isValid) {
      const suffix = declaredWidths.length > 0 ? ` (declared: ${declaredWidths.join(', ')})` : '';
      issues.push(`width ${JSON.stringify(width)} is not a declared height for this story${suffix}`);
    }
  }

  return { issues };
}
