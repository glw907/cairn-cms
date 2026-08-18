// cairn-cms: the repro fence validator's rule coverage, one violating fixture per rule (spec's
// gate 1), proved red before the implementation existed.
import { describe, it, expect } from 'vitest';
import { validateReproFence } from '../../lib/reproductions/validate.js';
import type { ReproManifestEntry } from '../../lib/reproductions/manifest.js';

const MANIFEST: ReproManifestEntry[] = [
  {
    id: 'media/library',
    heights: { column: 720 },
    markerKeys: ['count-header', 'search'],
    pose: false,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    id: 'editor/sidebar-list',
    heights: { wide: 620 },
    markerKeys: [],
    pose: false,
    host: 'shell',
    ownThemeRoot: true,
  },
];

const VALID_BODY = [
  'story: media/library',
  'alt: Reproduction of the media library in grid view.',
  'caption: The library shows five images in a grid.',
].join('\n');

describe('validateReproFence', () => {
  it('accepts a well-formed fence with no width', () => {
    const { issues } = validateReproFence(VALID_BODY, MANIFEST);
    expect(issues).toEqual([]);
  });

  it('accepts a well-formed fence pinning a width the story declares a height for', () => {
    const body = [
      'story: editor/sidebar-list',
      'alt: Reproduction of the sidebar list view.',
      'caption: The sidebar lists four entries.',
      'width: wide',
    ].join('\n');
    const { issues } = validateReproFence(body, MANIFEST);
    expect(issues).toEqual([]);
  });

  it('names the problem when the YAML does not parse', () => {
    const body = 'story: [unterminated';
    const { issues } = validateReproFence(body, MANIFEST);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toMatch(/malformed YAML/);
  });

  it('flags a missing required key', () => {
    const body = ['story: media/library', 'alt: Reproduction of the media library.'].join('\n');
    const { issues } = validateReproFence(body, MANIFEST);
    expect(issues).toContain('missing required key "caption"');
  });

  it('flags an unknown key', () => {
    const body = [
      VALID_BODY,
      'extra: not a real key',
    ].join('\n');
    const { issues } = validateReproFence(body, MANIFEST);
    expect(issues).toContain('unknown key "extra"');
  });

  it('flags alt text that does not name the kind', () => {
    const body = [
      'story: media/library',
      'alt: Screenshot of the media library in grid view.',
      'caption: The library shows five images in a grid.',
    ].join('\n');
    const { issues } = validateReproFence(body, MANIFEST);
    expect(issues).toContain('alt text must name the kind, starting with "Reproduction"');
  });

  it('flags alt text over the 150-character limit', () => {
    const longAlt = `Reproduction of ${'a'.repeat(150)}`;
    const body = [
      'story: media/library',
      `alt: ${longAlt}`,
      'caption: The library shows five images in a grid.',
    ].join('\n');
    const { issues } = validateReproFence(body, MANIFEST);
    expect(issues).toContain(
      `alt text is ${longAlt.length} characters, over the 150-character limit`,
    );
  });

  it('flags a story id the manifest does not carry', () => {
    const body = [
      'story: nonexistent/story',
      'alt: Reproduction of a screen that does not exist.',
      'caption: This story is not registered.',
    ].join('\n');
    const { issues } = validateReproFence(body, MANIFEST);
    expect(issues).toContain('story "nonexistent/story" is not in the installed manifest');
  });

  it('flags a width the story does not declare a height for', () => {
    const body = [VALID_BODY, 'width: narrow'].join('\n');
    const { issues } = validateReproFence(body, MANIFEST);
    expect(issues).toContain(
      'width "narrow" is not a declared height for this story (declared: column)',
    );
  });

  it('accepts a wide-only story pinning wide even though a two-width row also exists', () => {
    const body = [
      'story: editor/sidebar-list',
      'alt: Reproduction of the sidebar list view.',
      'caption: The sidebar lists four entries.',
      'width: wide',
    ].join('\n');
    const { issues } = validateReproFence(body, MANIFEST);
    expect(issues).toEqual([]);
  });
});
