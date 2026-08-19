// cairn-cms: the gate that binds a story's numbered callout chips to the crop its own manifest
// entry declares. The seam's first gate counts manifest marker keys against the keyed prose list
// on the embedding page, which is a naming check: it cannot see WHERE a chip lands. A declared
// height is a hard crop (cairn-pub's boundHeight takes the smaller of declared and measured, so
// refinement only ever removes dead space), so a marker anchored below the declared height is a
// chip the reader never sees, against a prose list that still numbers it. `tags/screen` shipped
// exactly that: five keyed entries, three visible chips.
//
// The check is deliberately geometric rather than structural, which is the half no manifest read
// can reach: mount the story at the width its embed renders at, resolve each anchor against the
// posed DOM, and assert the chip that would be centred on the anchor's top-left corner fits inside
// the declared box.
import { describe, it, expect, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { manifest, type ReproManifestEntry } from '../../lib/reproductions/manifest.js';
import { getStory } from '../../lib/reproductions/index.js';
import { renderStory } from './_repro-mount.js';

// The component project's own ambient size, restored after any test that pins a viewport.
const BASELINE_VIEWPORT = { width: 1280, height: 720 };

let viewportPinned = false;

// The CSS pixel width a responsive `column` embed renders at on a desk-width reader, and so the
// width every `column` height is declared against: cairn-pub's docs measure, `--container-measure:
// 44rem` in its theme.css, against that site's 16px root. Hardcoded here rather than imported,
// since it belongs to the consuming site's type scale, not to this package's public surface; a
// change there is a re-measurement of these heights, which is the point of failing loudly.
const COLUMN_EMBED_WIDTH = 704;

// Half a chip's rendered box, the distance its own `translate(-50%, -50%)` carries it past the
// anchor corner it is pinned to. The chip sizes off the admin theme's `--size-selector` (0.25rem)
// times seven, so 28px square at a 16px root, and the bottom half is what has to clear the crop.
const CHIP_HALF_PX = 14;

/**
 * The viewport a story's declared embed renders at: its pinned width when the manifest declares
 * one, and the docs measure for a responsive `column` story. Height is the declared height itself,
 * so the rendered box is exactly the crop a reader gets.
 */
function embedViewport(entry: ReproManifestEntry): { width: number; height: number } {
  const { heights } = entry;
  if (heights.wide !== undefined) return { width: 1280, height: heights.wide };
  if (heights.desktop !== undefined) return { width: 860, height: heights.desktop };
  if (heights.narrow !== undefined) return { width: 390, height: heights.narrow };
  return { width: COLUMN_EMBED_WIDTH, height: heights.column ?? 0 };
}

afterEach(async () => {
  if (!viewportPinned) return;
  viewportPinned = false;
  await page.viewport(BASELINE_VIEWPORT.width, BASELINE_VIEWPORT.height);
});

// Every story that declares callout keys. Derived from the manifest rather than listed, so a story
// that grows markers later is covered with no edit here.
const MARKERED = manifest.filter((entry) => entry.markerKeys.length > 0);

describe('a story with numbered callouts', () => {
  // Every case below is generated from MARKERED, so an empty list would report a green file that
  // measured nothing. Whether a story's markers match its manifest entry's keys is a separate
  // contract, asserted per story by reproductions-stories.test.ts.
  it('generates a case for at least one story', () => {
    expect(MARKERED.length).toBeGreaterThan(0);
  });

  for (const entry of MARKERED) {
    it(
      `${entry.id} renders every chip inside its declared crop`,
      async () => {
        const size = embedViewport(entry);
        await page.viewport(size.width, size.height);
        viewportPinned = true;

        const story = getStory(entry.id);
        const screen = await renderStory(story);
        const picture = screen.container.querySelector<HTMLElement>('[data-cairn-picture]');
        expect(picture, 'the containment wrapper chips mount inside').not.toBeNull();

        // The frame's own top, so an anchor's offset is measured from the same origin the crop is.
        // The `[data-cairn-picture]` wrapper is `display: contents` and generates no box of its
        // own, so the render container is what stands in for it.
        const frameTop = screen.container.getBoundingClientRect().top;

        const overflowing: string[] = [];
        for (const marker of story.markers ?? []) {
          const anchor = picture!.querySelector<HTMLElement>(marker.anchor);
          expect(anchor, `${entry.id} marker "${marker.key}" anchor "${marker.anchor}"`).not.toBeNull();
          const chipBottom = anchor!.getBoundingClientRect().top - frameTop + CHIP_HALF_PX;
          if (chipBottom > size.height) {
            overflowing.push(`${marker.n} ${marker.key} at ${Math.round(chipBottom)}px`);
          }
        }

        expect(
          overflowing,
          `${entry.id} declares a ${size.height}px crop at ${size.width}px wide, but these chips ` +
            `fall outside it: ${overflowing.join(', ')}`,
        ).toEqual([]);
      },
      30_000,
    );
  }
});
