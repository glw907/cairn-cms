// cairn-cms: the story-mount harness Task A4 of
// docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md builds. This file's structure
// is the contract tasks A5a through A6b extend: as each group's story module registers into
// src/lib/reproductions/index.ts's `stories` array, the "universal story contract" block below
// exercises it automatically with no further edits here, and the pending-inventory block only
// needs its PENDING_STORY_IDS set to shrink.
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Component } from 'svelte';
import { manifest } from '../../lib/reproductions/manifest.js';
import { stories, getStory, ReproContext, type ReproStory } from '../../lib/reproductions/index.js';
import ProbeComponent, { PROBE_CONTEXT_KEY } from './_ReproContextProbe.svelte';

// The manifest ids not yet backed by a registered story, named explicitly (not derived from
// `stories`) so a task that registers a group without updating this set is caught by the "keeps
// the pending list honest" test below rather than silently passing. A5a through A6b each remove
// their own group's ids here as they land; by A6b this set is empty.
const PENDING_STORY_IDS = new Set([
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
]);

/** The rendered `data-theme` root's own attribute value, for a story that owns its theme root. */
function renderedTheme(container: HTMLElement): string | null {
  return container.querySelector('[data-theme]')?.getAttribute('data-theme') ?? null;
}

describe('the manifest-to-story inventory', () => {
  it('has a pending list naming only real manifest ids', () => {
    const manifestIds = new Set(manifest.map((entry) => entry.id));
    const bogus = [...PENDING_STORY_IDS].filter((id) => !manifestIds.has(id));
    expect(bogus).toEqual([]);
  });

  it('registers a story for every manifest entry not marked pending', () => {
    const missing = manifest
      .filter((entry) => !PENDING_STORY_IDS.has(entry.id))
      .map((entry) => entry.id)
      .filter((id) => {
        try {
          getStory(id);
          return false;
        } catch {
          return true;
        }
      });
    expect(missing).toEqual([]);
  });

  it('keeps the pending list honest: every pending id is still unregistered', () => {
    const wronglyPending = [...PENDING_STORY_IDS].filter((id) => {
      try {
        getStory(id);
        return true;
      } catch {
        return false;
      }
    });
    expect(wronglyPending).toEqual([]);
  });

  it('throws on an unknown id', () => {
    expect(() => getStory('nonexistent/story')).toThrow();
  });
});

describe('auth/login through ReproContext', () => {
  it('renders without error, showing the resting sign-in form at the baked theme', async () => {
    const screen = render(ReproContext, { props: { story: getStory('auth/login') } });
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /send sign-in link/i })).toBeInTheDocument();
    expect(renderedTheme(screen.container)).toBe('cairn-admin');
  });

  it('routes an override theme into data.theme, since the story owns its own theme root', async () => {
    const screen = render(ReproContext, {
      props: { story: getStory('auth/login'), theme: 'cairn-admin-dark' },
    });
    expect(renderedTheme(screen.container)).toBe('cairn-admin-dark');
  });
});

describe('auth/confirm through ReproContext', () => {
  it('renders without error, showing the resting confirm button at the baked theme', async () => {
    const screen = render(ReproContext, { props: { story: getStory('auth/confirm') } });
    await expect.element(screen.getByRole('button', { name: /confirm sign-in/i })).toBeInTheDocument();
    expect(renderedTheme(screen.container)).toBe('cairn-admin');
  });

  it('routes an override theme into data.theme, since the story owns its own theme root', async () => {
    const screen = render(ReproContext, {
      props: { story: getStory('auth/confirm'), theme: 'cairn-admin-dark' },
    });
    expect(renderedTheme(screen.container)).toBe('cairn-admin-dark');
  });
});

describe('ReproContext: the context and fixture obligations every story relies on', () => {
  // A story that is not part of the real registry: it mounts the local probe component so the
  // three obligations ReproContext owns unconditionally (a story's own context, the fixture
  // media base, the CSRF getter) are each exercised directly, rather than only implicitly through
  // whichever future story happens to read them.
  const probeStory: ReproStory = {
    id: 'test/probe',
    component: ProbeComponent as Component<Record<string, unknown>>,
    host: 'bare',
    props: {},
    context: { [PROBE_CONTEXT_KEY]: 'story-supplied-value' },
  };

  it('applies the story context, the fixture media base, and the CSRF getter', async () => {
    const screen = render(ReproContext, { props: { story: probeStory } });
    await expect.element(screen.getByTestId('story-context')).toHaveTextContent('story-supplied-value');
    await expect.element(screen.getByTestId('media-base')).toHaveTextContent('/repro-assets');
    await expect.element(screen.getByTestId('csrf')).toHaveTextContent('repro-fixture-csrf');
  });
});

// The universal contract every registered story must satisfy, exercised for whichever stories are
// registered today (2 of 25) and automatically covering the rest as A5a through A6b add them.
for (const story of stories) {
  const entry = manifest.find((candidate) => candidate.id === story.id);

  describe(`${story.id}: the universal story contract`, () => {
    it('has a matching manifest entry', () => {
      expect(entry).toBeDefined();
    });

    it('declares marker keys matching its manifest entry', () => {
      expect((story.markers ?? []).map((marker) => marker.key)).toEqual(entry?.markerKeys ?? []);
    });

    it('resolves every marker anchor and runs its pose without throwing', async () => {
      const screen = render(ReproContext, { props: { story } });
      if (story.pose) await story.pose(screen.container);
      for (const marker of story.markers ?? []) {
        const anchorEl = screen.container.querySelector(marker.anchor);
        expect(anchorEl, `marker "${marker.key}" anchor "${marker.anchor}" did not resolve`).not.toBeNull();
      }
    });
  });
}
