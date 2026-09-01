// cairn-cms: the repro fence validator's rule coverage, one violating fixture per rule (spec's
// gate 1), proved red before the implementation existed.
import { describe, it, expect } from 'vitest';
import { validateReproFence, type ValidateReproFenceOptions } from '../../lib/reproductions/validate.js';
import type { ReproManifestEntry } from '../../lib/reproductions/manifest.js';

// cairn-pub's own register, passed explicitly by any caller that wants those checks: the
// engine bakes in no register default (audit-repro-validatereprofence).
const CAIRN_PUB_REGISTER: ValidateReproFenceOptions = {
  altPrefix: /^reproduction\b/i,
  maxAltLength: 150,
  extraKeys: [],
};

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

  it('flags an unknown key when the caller supplies a register (extraKeys)', () => {
    const body = [
      VALID_BODY,
      'extra: not a real key',
    ].join('\n');
    const { issues } = validateReproFence(body, MANIFEST, CAIRN_PUB_REGISTER);
    expect(issues).toContain('unknown key "extra"');
  });

  it('flags alt text that does not match the caller-supplied prefix', () => {
    const body = [
      'story: media/library',
      'alt: Screenshot of the media library in grid view.',
      'caption: The library shows five images in a grid.',
    ].join('\n');
    const { issues } = validateReproFence(body, MANIFEST, CAIRN_PUB_REGISTER);
    expect(issues).toContain(
      `alt text does not match the required prefix (${CAIRN_PUB_REGISTER.altPrefix})`,
    );
  });

  it('flags alt text over a caller-supplied length ceiling', () => {
    const longAlt = `Reproduction of ${'a'.repeat(150)}`;
    const body = [
      'story: media/library',
      `alt: ${longAlt}`,
      'caption: The library shows five images in a grid.',
    ].join('\n');
    const { issues } = validateReproFence(body, MANIFEST, CAIRN_PUB_REGISTER);
    expect(issues).toContain(
      `alt text is ${longAlt.length} characters, over the 150-character limit`,
    );
  });

  it('accepts a localized alt prefix passing under caller options, the English-only cairn-pub register would refuse', () => {
    const body = [
      'story: media/library',
      'alt: Abbildung der Medienbibliothek in der Rasteransicht.',
      'caption: The library shows five images in a grid.',
    ].join('\n');
    const { issues } = validateReproFence(body, MANIFEST, {
      altPrefix: /^abbildung\b/i,
      maxAltLength: 200,
    });
    expect(issues).toEqual([]);

    const { issues: underCairnPubRegister } = validateReproFence(body, MANIFEST, CAIRN_PUB_REGISTER);
    expect(underCairnPubRegister).toContain(
      `alt text does not match the required prefix (${CAIRN_PUB_REGISTER.altPrefix})`,
    );
  });

  it('skips every register check when no options are given: an unknown key, an unprefixed alt, and a long alt all pass', () => {
    const body = [
      'story: media/library',
      `alt: ${'x'.repeat(200)}`,
      'caption: The library shows five images in a grid.',
      'extra: not a real key',
    ].join('\n');
    const { issues } = validateReproFence(body, MANIFEST);
    expect(issues).toEqual([]);
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
      'width "narrow" is not a declared height for this story (this story pins no width; omit "width" for the responsive embed)',
    );
  });

  it('names the story\'s own pinned widths when it has some and the fence picked another', () => {
    const body = [
      'story: editor/sidebar-list',
      'alt: Reproduction of the sidebar list view.',
      'caption: The sidebar lists four entries.',
      'width: desktop',
    ].join('\n');
    const { issues } = validateReproFence(body, MANIFEST);
    expect(issues).toContain(
      'width "desktop" is not a declared height for this story (declared: wide)',
    );
  });

  it('refuses the responsive default named explicitly, which a fence asks for by omission', () => {
    // `column` IS a declared height on this story, so the rule that admits a width by looking it up
    // in ReproHeights would let it through. The spec's schema does not: `width` names a PINNED
    // width, and the responsive embed is what leaving `width` out means. Two spellings of one
    // intent is the drift this refusal exists to stop.
    const body = [VALID_BODY, 'width: column'].join('\n');
    const { issues } = validateReproFence(body, MANIFEST);
    expect(issues).toContain(
      'width "column" is the responsive default, which a fence names by omitting "width"',
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
