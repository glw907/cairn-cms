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

/**
 * The caller-supplied register a fence body is checked against, on top of the engine-owned rules
 * (required keys, story resolves, width declared). Each member is independently optional, and
 * omitting one skips the check it backs entirely: none of the three carries a baked-in default,
 * since a "Reproduction"-prefixed English alt, a 150-character ceiling, and a closed key set are
 * cairn-pub's own register, not a rule the engine imposes on every consumer.
 */
export interface ValidateReproFenceOptions {
  /** When given, `alt` must match this pattern; omit to skip the alt-prefix check. */
  altPrefix?: RegExp;
  /** When given, `alt` may not exceed this length; omit to skip the alt-length check. */
  maxAltLength?: number;
  /**
   * Key names admitted beyond the engine-owned `story`/`alt`/`caption`/`width`; when given, any
   * other key is flagged. Omit to skip the unknown-key check entirely.
   */
  extraKeys?: string[];
}

/**
 * The `ReproHeights` key that is not a pinnable width.
 *
 * It is excluded from `width` by its role rather than by absence from a list: `column` IS the
 * responsive default, which a fence asks for by leaving `width` out, so naming it explicitly is a
 * second way to say one thing and the spec's schema does not admit it. Excluding by role keeps the
 * amendment that removed the old width allowlist intact, since a story that later declares a new
 * PINNED width still needs no edit here.
 */
const RESPONSIVE_WIDTH = 'column';

const REQUIRED_KEYS = ['story', 'alt', 'caption'] as const;

/**
 * Check a `repro` fence body against the spec's fence schema (gate 1): the YAML parses, the
 * required keys are present, the story id resolves against the installed manifest, and `width`,
 * if given, names a width that story's manifest entry actually declares a height for. Those rules
 * are engine-owned and always run. `options` layers a caller's own register on top: an unknown
 * key, an alt-text prefix, and an alt-text length ceiling, each checked only when the caller
 * supplies the option that backs it.
 *
 * `ReproHeights` is the schema for the width rule: nothing here enumerates width names, so a story
 * that later declares a new pinned width needs no matching edit here, and a story that declares
 * only some widths refuses a fence pinned to one it cannot show.
 * @param body - the fence's raw YAML body
 * @param manifest - the installed engine's story manifest
 * @param options - the caller's own register, layered on top of the engine-owned rules
 */
export function validateReproFence(
  body: string,
  manifest: ReproManifestEntry[],
  options: ValidateReproFenceOptions = {},
): { issues: string[] } {
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

  if (options.extraKeys !== undefined) {
    const allowedKeys = new Set<string>([...REQUIRED_KEYS, 'width', ...options.extraKeys]);
    for (const key of Object.keys(data)) {
      if (!allowedKeys.has(key)) issues.push(`unknown key "${key}"`);
    }
  }

  const alt = data.alt;
  if (typeof alt === 'string') {
    if (options.maxAltLength !== undefined && alt.length > options.maxAltLength) {
      issues.push(
        `alt text is ${alt.length} characters, over the ${options.maxAltLength}-character limit`,
      );
    }
    if (options.altPrefix !== undefined && !options.altPrefix.test(alt.trim())) {
      issues.push(`alt text does not match the required prefix (${options.altPrefix})`);
    }
  }

  const story = data.story;
  let entry: ReproManifestEntry | undefined;
  if (typeof story === 'string') {
    entry = manifest.find((candidate) => candidate.id === story);
    if (!entry) issues.push(`story "${story}" is not in the installed manifest`);
  }

  const width = data.width;
  if (width === RESPONSIVE_WIDTH) {
    issues.push(
      `width "${RESPONSIVE_WIDTH}" is the responsive default, which a fence names by omitting "width"`,
    );
  } else if (width !== undefined) {
    // Read off the story's own ReproHeights entry, never a list of width names kept here: a story
    // that later declares a new pinned width needs no matching edit in this file. An unresolved
    // story leaves the set empty, so its fence fails on the id above and on the width here.
    const heights = (entry?.heights ?? {}) as Record<string, number | undefined>;
    const pinnedWidths = Object.keys(heights)
      .filter((name) => name !== RESPONSIVE_WIDTH && typeof heights[name] === 'number')
      .sort();
    if (typeof width !== 'string' || !pinnedWidths.includes(width)) {
      // A story with no pinned width at all is the common case (twenty of twenty-five rows), and
      // "declared: " followed by nothing reads as a bug, so that case names the remedy instead.
      const suffix =
        pinnedWidths.length > 0
          ? ` (declared: ${pinnedWidths.join(', ')})`
          : entry
            ? ' (this story pins no width; omit "width" for the responsive embed)'
            : '';
      issues.push(`width ${JSON.stringify(width)} is not a declared height for this story${suffix}`);
    }
  }

  return { issues };
}
