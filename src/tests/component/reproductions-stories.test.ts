// cairn-cms: the story-mount harness Task A4 of
// docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md builds. This file's structure
// is the contract tasks A5a through A6b extend: as each group's story module registers into
// src/lib/reproductions/index.ts's `stories` array, the "universal story contract" block below
// exercises it automatically with no further edits here, and the pending-inventory block only
// needs its PENDING_STORY_IDS set to shrink.
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { Component } from 'svelte';
import { fixtureMediaBase, manifest, type ReproManifestEntry } from '../../lib/reproductions/manifest.js';
import { stories, getStory, ReproContext, type ReproStory } from '../../lib/reproductions/index.js';
import { waitFor } from '../../lib/reproductions/stories/support.js';
import ProbeComponent, { PROBE_CONTEXT_KEY } from './_ReproContextProbe.svelte';

// The manifest ids not yet backed by a registered story, named explicitly (not derived from
// `stories`) so a task that registers a group without updating this set is caught by the "keeps
// the pending list honest" test below rather than silently passing. A5a through A6b each remove
// their own group's ids here as they land; A6b (the last group) empties this set, so the
// inventory tests below bind the full 25.
const PENDING_STORY_IDS = new Set<string>([]);

/**
 * Whether a story is registered under this id, asked through `getStory` (whose throw is the only
 * answer the seam gives) rather than by reading `stories` behind its back.
 */
function isRegistered(id: string): boolean {
  try {
    getStory(id);
    return true;
  } catch {
    return false;
  }
}

/** The rendered `data-theme` root's own attribute value, for a story that owns its theme root. */
function renderedTheme(container: HTMLElement): string | null {
  return container.querySelector('[data-theme]')?.getAttribute('data-theme') ?? null;
}

/**
 * Every `img` src the mounted story rendered, excluding a local object-URL preview (`blob:`), which
 * carries no media base at all. Reads the attribute rather than the resolved property, since the
 * property widens a relative path to an absolute URL on the test origin.
 * @param container - the mounted story's root
 * @returns each non-blob `img` src attribute
 */
function mediaImageSrcs(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLImageElement>('img[src]')]
    .map((img) => img.getAttribute('src') ?? '')
    .filter((src) => !src.startsWith('blob:'));
}

/**
 * Assert that every image the mounted story rendered composes from `fixtureMediaBase`, the docs
 * origin's own asset route, never the real admin's hardcoded `/media` default.
 * @param container - the mounted story's root
 * @returns the srcs checked, so a story that guarantees a rendered image can assert on the count
 */
function expectMediaBaseSrcs(container: HTMLElement): string[] {
  const srcs = mediaImageSrcs(container);
  for (const src of srcs) {
    expect(src.startsWith(fixtureMediaBase), `"${src}" does not compose from fixtureMediaBase`).toBe(true);
  }
  return srcs;
}

// A story that is not part of the real registry: it mounts the local probe component, so the
// obligations ReproContext owns for every story (a story's own context, the fixture media base, the
// CSRF getter, the theme root a bare story does not carry itself) are each exercised directly
// rather than only implicitly through whichever future story happens to read them.
const probeStory: ReproStory = {
  id: 'test/probe',
  component: ProbeComponent as Component<Record<string, unknown>>,
  host: 'bare',
  props: {},
  context: { [PROBE_CONTEXT_KEY]: 'story-supplied-value' },
};

// The component project's own ambient size (src/tests/component/_setup.ts sets it once per file).
// Every viewport this suite pins is restored to it, so a pinned story cannot leak its width into a
// later test in this file or the next.
const BASELINE_VIEWPORT = { width: 1280, height: 720 };

// Whether a test moved the viewport off the baseline, so the restore below only pays for a resize
// that actually happened (a resize per test measurably slows the component run).
let viewportPinned = false;

/**
 * The viewport size a story's manifest entry declares it can render at.
 *
 * A pinned width is not decoration. `editor/entry-screen` and `editor/preview-tab` declare
 * `desktop` alone because the Write/Preview tablist and the preview device trigger sit inside the
 * toolbar's `sm:`-gated wrapper, which a viewport under 640 hides outright; `editor/sidebar-list`
 * declares `wide` alone because the shell's sidebar is a drawer that only sits persistently open
 * from `lg`, and from `xl` on a desk path. Mounting either at the ambient width would fail for a
 * reason that has nothing to do with the story. A `column` story pins nothing, since the responsive
 * embed fills whatever the docs column gives it, so it takes the baseline; its declared height is a
 * first-paint hint the docs page refines at hydration, never a width the render depends on.
 */
function viewportFor(entry: ReproManifestEntry | undefined) {
  const heights = entry?.heights;
  if (heights?.wide !== undefined) return { width: 1280, height: heights.wide };
  if (heights?.desktop !== undefined) return { width: 860, height: heights.desktop };
  if (heights?.narrow !== undefined) return { width: 390, height: heights.narrow };
  return BASELINE_VIEWPORT;
}

/**
 * Mount a story and bring it to the state its page contract names: the declared viewport first
 * (the widths above), then `settle` (the contracted surface that only exists after hydration), then
 * `pose` (the state that lives in internal component state). Both of a story's consumers, this
 * suite and cairn-pub's capture, run settle before pose, so the harness expresses it once here.
 */
async function mountPosed(story: ReproStory) {
  const size = viewportFor(manifest.find((candidate) => candidate.id === story.id));
  if (size.width !== BASELINE_VIEWPORT.width || size.height !== BASELINE_VIEWPORT.height) {
    await page.viewport(size.width, size.height);
    viewportPinned = true;
  }
  const screen = render(ReproContext, { props: { story } });
  if (story.settle) await story.settle(screen.container);
  if (story.pose) await story.pose(screen.container);
  return screen;
}

afterEach(async () => {
  if (!viewportPinned) return;
  viewportPinned = false;
  await page.viewport(BASELINE_VIEWPORT.width, BASELINE_VIEWPORT.height);
});

// A story mount that pays a CodeMirror cold start (every EditPage story and the bare editor one)
// runs past the browser project's 15s default, so those tests carry their own ceiling. A real hang
// still trips it; an assertion failure still fails at once.
const EDITOR_MOUNT_TIMEOUT = 40_000;

// Swap the global Worker constructor for one that records its calls and speaks to nobody, so the
// spellcheck Worker an editor story must NOT start is counted rather than assumed absent. The real
// constructor would start a module worker and fetch a wasm binary and a 1.5MB dictionary.
const realWorker = globalThis.Worker;
let workersConstructed = 0;

class CountingWorker {
  constructor() {
    workersConstructed += 1;
  }
  postMessage() {}
  addEventListener() {}
  removeEventListener() {}
  terminate() {}
}

function countWorkers() {
  workersConstructed = 0;
  globalThis.Worker = CountingWorker as unknown as typeof Worker;
  return () => workersConstructed;
}

afterEach(() => {
  globalThis.Worker = realWorker;
});

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
      .filter((id) => !isRegistered(id));
    expect(missing).toEqual([]);
  });

  it('keeps the pending list honest: every pending id is still unregistered', () => {
    const wronglyPending = [...PENDING_STORY_IDS].filter((id) => isRegistered(id));
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
  it('applies the story context, the fixture media base, and the CSRF getter', async () => {
    const screen = render(ReproContext, { props: { story: probeStory } });
    await expect.element(screen.getByTestId('story-context')).toHaveTextContent('story-supplied-value');
    await expect.element(screen.getByTestId('media-base')).toHaveTextContent('/repro-assets');
    await expect.element(screen.getByTestId('csrf')).toHaveTextContent('repro-fixture-csrf');
  });
});

describe('ReproStory.settle: the hydration wait a props-only story cannot express', () => {
  it('runs against the mounted root, and before the pose', async () => {
    const seen: string[] = [];
    const story: ReproStory = {
      ...probeStory,
      id: 'test/settle-probe',
      settle: async (root) => {
        // The probe's own markup proves the root handed to settle is the mounted tree, not an
        // empty container: a settle that ran too early could not find anything to wait for.
        seen.push(root.querySelector('[data-testid="csrf"]') ? 'settle' : 'settle-before-mount');
      },
      pose: async () => {
        seen.push('pose');
      },
    };

    await mountPosed(story);

    expect(seen).toEqual(['settle', 'pose']);
  });
});

describe('ReproContext: the surface a bare story mounts on', () => {
  it('paints the admin surface under the theme root, so a story is not left on the host page ink', async () => {
    const screen = render(ReproContext, { props: { story: probeStory } });

    // The theme root stays a bare classless wrapper, since the admin's scoped rules are descendant
    // selectors and a class on the theme element itself would never match. So the paint goes one
    // level in, the way CairnAdminShell, LoginPage, and ConfirmPage each pair their own root with a
    // bg-base-200/text-base-content child. cairn-admin.css declares neither background-color nor
    // color on either theme root, so without this child a story inherits the host document's ink
    // over the host's background wherever it mounts. The assertion reads the class rather than the
    // computed style because the source sheet ships the tokens, not the compiled utilities.
    const surface = screen.container.querySelector('[data-theme]')?.firstElementChild;
    expect(surface?.className).toContain('bg-base-200');
    expect(surface?.className).toContain('text-base-content');
  });
});

describe('ReproContext: one theme resolution for both hosts', () => {
  // A docs page that carries both kinds of story must not render half of them light and half dark
  // for a dark-OS reader: with no theme prop the bare branch falls back to the light admin theme,
  // so the shell branch has to be handed that same resolved value rather than an undefined override
  // it answers with a cookie read and a prefers-color-scheme read on the docs origin.
  // Captured once, before any test overrides it: this browser exposes `matchMedia` as an own
  // property of `window` rather than one inherited through `Window.prototype`, so a bare `delete`
  // in the restore below (the seam's original form) does not un-shadow a prototype method, it
  // erases the only definition there ever was, for the rest of this file's shared browser page.
  // `EditPage`'s own `narrow` state reads `window.matchMedia` and silently no-ops when it is
  // missing (`if (!window.matchMedia) return;`), so that erasure surfaces far downstream, as every
  // later `EditPage` story mount rendering permanently desktop-shaped regardless of viewport.
  const originalMatchMedia = window.matchMedia;

  function probeDarkOs(): string[] {
    const queries: string[] = [];
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string): MediaQueryList => {
        queries.push(query);
        return {
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        } as unknown as MediaQueryList;
      },
    });
    return queries;
  }

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: originalMatchMedia });
  });

  it('renders a bare and a shell story at the same theme when no theme prop is supplied', async () => {
    const queries = probeDarkOs();

    const bare = render(ReproContext, { props: { story: probeStory } });
    expect(renderedTheme(bare.container)).toBe('cairn-admin');

    const shell = await mountPosed(getStory('editor/sidebar-list'));
    expect(renderedTheme(shell.container)).toBe('cairn-admin');
    // The prop's whole point is that a docs origin's cookie and the reader's OS never reach a
    // mounted story, so the shell must not have asked either.
    expect(queries).not.toContain('(prefers-color-scheme: dark)');
  });
});

describe('ReproContext: the theme root a bare story does not own', () => {
  it('mounts a bare story with no theme root of its own under a cairn-admin root', async () => {
    const screen = render(ReproContext, { props: { story: probeStory } });
    expect(renderedTheme(screen.container)).toBe('cairn-admin');
  });

  it('follows the theme prop rather than shadowing it with a value of its own', async () => {
    const screen = render(ReproContext, { props: { story: probeStory, theme: 'cairn-admin-dark' } });
    expect(renderedTheme(screen.container)).toBe('cairn-admin-dark');

    await screen.rerender({ story: probeStory, theme: 'cairn-admin' });

    expect(renderedTheme(screen.container)).toBe('cairn-admin');
  });

  it('adds no second root to a story that already owns one', async () => {
    const screen = render(ReproContext, { props: { story: getStory('auth/login') } });
    expect(screen.container.querySelectorAll('[data-theme]')).toHaveLength(1);
  });
});

// The eight editor stories (Task A5a). The universal loop below already binds every marker anchor,
// every settle, and every pose, so what these add is the one thing each page contract names
// specifically: the face the reader is being shown, which a mount that merely did not throw would
// not prove.

describe('editor/entry-screen', () => {
  it(
    'settles onto the real editing surface and starts no spellcheck Worker',
    async () => {
      const workers = countWorkers();
      const screen = await mountPosed(getStory('editor/entry-screen'));

      // CodeMirror, not the pre-hydration fallback: MarkdownEditor's server render is a hidden
      // input, an empty div, and a textarea, so a story with no settle would picture the fallback.
      expect(screen.container.querySelector('#cairn-pane-write .cm-content')).not.toBeNull();
      expect(screen.container.querySelector('#cairn-pane-write textarea')).toBeNull();

      // The lint plugin schedules its first run shortly after mount and that run is what reaches
      // ensureWorker, so the absence is only real after the same wait the override test uses.
      await new Promise((resolve) => setTimeout(resolve, 2000));
      expect(workers()).toBe(0);
    },
    EDITOR_MOUNT_TIMEOUT,
  );
});

describe('editor/toolbar', () => {
  it('renders the three labelled clusters with the host insert controls in place', async () => {
    const screen = await mountPosed(getStory('editor/toolbar'));

    const groups = [...screen.container.querySelectorAll('[role="toolbar"] [role="group"]')].map(
      (group) => group.getAttribute('aria-label'),
    );
    expect(groups).toEqual(['Format', 'Structure', 'Insert']);
    // The Insert cluster is the one thing this row's props have to supply, and its contents are a
    // transcription, so the assertion is the whole roster in order rather than "a button exists".
    // Seven controls is what EditPage renders for this story's own fixture: Insert block and Edit
    // block from `hasComponents` (fixtureRegistry declares an insertable two-up), Web link, Link to
    // page, Insert image, Tidy from `tidy.enabled`, and the always-rendered figure control. Only
    // "Include a fragment" is absent, gated off by the fixture's `fragmentTargets: null`. A gate
    // this story's fixture opens but the transcription drops is exactly the drift a reader would
    // see as a reproduction with fewer controls than the editor open beside it.
    const insertNames = [...screen.container.querySelectorAll('[role="group"][aria-label="Insert"] button')].map(
      (button) => button.getAttribute('aria-label'),
    );
    expect(insertNames).toEqual([
      'Insert block',
      'Place the cursor in a component to edit it',
      'Web link (Ctrl+K)',
      'Link to page',
      'Insert image',
      'Tidy',
      'Place the cursor on an image to add a figure',
    ]);
    // The one Insert control that opens a popover rather than a dialog carries no aria-haspopup in
    // the real toolbar (EditPage.svelte's Insert image), and a reproduction that advertised the
    // property anyway would be drift of exactly the kind this seam exists to prevent.
    const byName = (name: string) =>
      screen.container.querySelector(`[role="group"][aria-label="Insert"] button[aria-label="${name}"]`);
    expect(byName('Insert image')?.hasAttribute('aria-haspopup')).toBe(false);
    expect(byName('Insert block')?.getAttribute('aria-haspopup')).toBe('dialog');
  });
});

describe('editor/sidebar-list', () => {
  it('renders the persistent concept sidebar beside the Posts list', async () => {
    const screen = await mountPosed(getStory('editor/sidebar-list'));

    // Half this row's contract is the sidebar, and at its declared width the drawer is persistent
    // rather than an overlay: an overlay drawer carries role="dialog", a persistent one does not.
    const sidebar = screen.container.querySelector('nav[aria-label="Site content"]');
    expect(sidebar).not.toBeNull();
    expect(sidebar?.getAttribute('role')).toBeNull();

    await expect.element(screen.getByRole('link', { name: /North Ridge Trailhead/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /new post/i })).toBeInTheDocument();
  });
});

describe('editor/preview-tab', () => {
  it(
    'poses onto the Preview pane with its width control',
    async () => {
      const screen = await mountPosed(getStory('editor/preview-tab'));

      expect(screen.container.querySelector('#cairn-tab-preview')?.getAttribute('aria-selected')).toBe('true');
      expect(screen.container.querySelector('#cairn-pane-preview')).not.toBeNull();
      // The width control joins the capsule only while Preview shows; it is what the page's own
      // sentence about checking a phone width points at.
      await expect.element(screen.getByRole('button', { name: /preview width/i })).toBeInTheDocument();
    },
    EDITOR_MOUNT_TIMEOUT,
  );
});

describe('editor/details-panel', () => {
  it(
    'poses the Details panel open over the entry settings',
    async () => {
      const screen = await mountPosed(getStory('editor/details-panel'));

      const panel = screen.container.querySelector('[aria-label="Entry details"]');
      expect(panel).not.toBeNull();
      expect(panel?.hasAttribute('hidden')).toBe(false);
      // The enumeration the page contract turns from prose into visible content: the panel's own
      // groups, plus the fields the fixture concept declares. Read off the panel rather than the
      // page, since several of these words also appear in the dialogs the panel's triggers open.
      const groups = [...(panel?.querySelectorAll('legend') ?? [])].map((legend) => legend.textContent?.trim());
      expect(groups).toContain('Visibility');
      expect(groups).toContain('Address');
      for (const field of ['Date', 'Tags', 'Lead picture']) {
        expect(panel?.textContent, `the Details panel does not name "${field}"`).toContain(field);
      }
    },
    EDITOR_MOUNT_TIMEOUT,
  );
});

describe('editor/figure-dialog', () => {
  it('renders the caption field, the placement choices, and the edit-mode actions', async () => {
    const screen = await mountPosed(getStory('editor/figure-dialog'));

    await expect.element(screen.getByLabelText('Caption')).toBeInTheDocument();
    for (const placement of ['Measure', 'Center', 'Wide', 'Full']) {
      await expect.element(screen.getByRole('radio', { name: placement })).toBeInTheDocument();
    }
    // `mode: 'edit'` is what renders the fold this row exists to picture.
    await expect.element(screen.getByRole('button', { name: 'Unwrap' })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Update figure' })).toBeInTheDocument();
  });
});

describe('editor/tidy-review', () => {
  it('opens the review with exactly one change marked Review this', async () => {
    const screen = await mountPosed(getStory('editor/tidy-review'));

    const hunks = [...screen.container.querySelectorAll('[data-testid="tidy-hunk"]')];
    expect(hunks.length).toBeGreaterThan(1);
    // The judgment hunk is the fixture's whole point: **Review this** is the state a non-objective
    // change gets, and it comes from the joint original/changes/conventions composition, never from
    // an interaction.
    const judgment = hunks.filter((hunk) => hunk.getAttribute('data-objective') === 'false');
    expect(judgment).toHaveLength(1);
    expect(judgment[0]?.textContent).toContain('Review this');
  });
});

describe('editor/collapsed-layout-block', () => {
  it(
    'renders the block collapsed to its labelled pill, with the gutter control beside it',
    async () => {
      const workers = countWorkers();
      const screen = await mountPosed(getStory('editor/collapsed-layout-block'));

      const pill = screen.container.querySelector('.cm-cairn-fold-pill');
      expect(pill).not.toBeNull();
      // The registry resolves the pill's human label; without it the pill reads the raw directive.
      expect(pill?.textContent).toContain('Two-up layout');
      expect(screen.container.querySelector('.cm-cairn-fold-btn')).not.toBeNull();

      await new Promise((resolve) => setTimeout(resolve, 2000));
      expect(workers()).toBe(0);
    },
    EDITOR_MOUNT_TIMEOUT,
  );
});

// The four publish stories (Task A5b). As with the editor stories above, the universal loop below
// already binds every marker anchor, settle, and pose; these add the one thing each page contract
// names specifically.

describe('publish/header-band', () => {
  it(
    'poses the opened overflow menu with its actions, at the desktop width',
    async () => {
      const screen = await mountPosed(getStory('publish/header-band'));

      const trigger = screen.container.querySelector('button[aria-label="More actions"]');
      expect(trigger?.getAttribute('aria-expanded')).toBe('true');

      const menu = screen.container.querySelector('#cairn-edit-actions-menu');
      const actionLabels = [...(menu?.querySelectorAll('li > a, li > button') ?? [])].map((el) => el.textContent?.trim());
      expect(actionLabels).toEqual(['Details', 'History', 'Delete']);

      // The desktop face: the document status cluster and the lifecycle pair, not the narrow
      // width's compacted band. Scoped to the shell's own navbar: EditPage additionally renders a
      // fixed bottom action bar (its own Publish/Save pair, same form attribute) once narrow, so an
      // unscoped count reads the same at both widths.
      expect(screen.container.querySelector('a[aria-label^="Back to"]')).toBeNull();
      expect(screen.container.querySelectorAll('.navbar button[form="cairn-edit-form"]')).toHaveLength(3);
    },
    EDITOR_MOUNT_TIMEOUT,
  );

  it(
    'poses the same opened menu over the compacted band at its narrow width',
    async () => {
      // viewportFor picks `desktop` first when a story declares both, so the narrow face needs its
      // own explicit pin rather than mountPosed's own choice.
      await page.viewport(390, 300);
      viewportPinned = true;

      const story = getStory('publish/header-band');
      const screen = render(ReproContext, { props: { story } });
      // Settle then pose, the order both of the seam's consumers run in: pinning the viewport by
      // hand is the only thing this test does differently from `mountPosed`.
      if (story.settle) await story.settle(screen.container);
      if (story.pose) await story.pose(screen.container);

      // The narrow face this row exists to picture: the back link, the truncating title, and the
      // status pill replace the desktop status cluster (EditPage's `narrow` branch), and the
      // band's own lifecycle pair (Save, Publish) moves out to a separate fixed bottom bar, leaving
      // only the sr-only default-submit button inside the navbar under the same form attribute.
      await waitFor(screen.container, 'a[aria-label^="Back to"]', 'the narrow band\'s back link');
      expect(screen.container.querySelector('span[role="status"].badge')).not.toBeNull();
      expect(screen.container.querySelectorAll('.navbar button[form="cairn-edit-form"]')).toHaveLength(1);

      const trigger = screen.container.querySelector('button[aria-label="More actions"]');
      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    },
    EDITOR_MOUNT_TIMEOUT,
  );
});

describe('publish/history-list', () => {
  it('renders the recent-versions list with the open-draft row and per-publish revert', async () => {
    const screen = await mountPosed(getStory('publish/history-list'));

    await expect.element(screen.getByRole('heading', { name: 'Recent versions' })).toBeInTheDocument();
    // The synthetic draft row pins on top, credits the editor mid-save, and carries no revert
    // affordance of its own, since it is not itself a publish.
    await expect.element(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.container.textContent).toContain('Jamie Torres');
    const revertButtons = screen.container.querySelectorAll('button[aria-label^="Revert to the version"]');
    expect(revertButtons).toHaveLength(2);
  });
});

describe('publish/pending-list', () => {
  it('poses the publish confirm open, showing the count and the grouped entries', async () => {
    const screen = await mountPosed(getStory('publish/pending-list'));

    const dialog = screen.container.querySelector<HTMLDialogElement>('dialog[aria-labelledby="cairn-shell-publish-all-title"]');
    expect(dialog?.open).toBe(true);
    await expect.element(screen.getByRole('button', { name: /Publish site \(2\)/ })).toBeInTheDocument();
    // The grouped list, under the concept's own nav label.
    expect(dialog?.textContent).toContain('Posts');
    expect(dialog?.textContent).toContain('2026-06-24-spring-newsletter');
    expect(dialog?.textContent).toContain('2026-06-10-welcome-to-the-club');
  });
});

describe('publish/refusal-banner', () => {
  it('renders the refusal banner naming the blocking entry, with its inbound-link list', async () => {
    const screen = await mountPosed(getStory('publish/refusal-banner'));

    const banner = screen.container.querySelector('.alert-error');
    expect(banner?.textContent).toContain('could not be deleted');
    // The row the banner is about: the blocked entry, still listed by its own title in the table
    // right below the banner.
    await expect
      .element(screen.getByRole('link', { name: 'A Guide to the North Ridge Trailhead' }))
      .toBeInTheDocument();
    // The inbound linkers the banner names.
    for (const title of ['Welcome to the Club', 'Team Retreat Recap', 'Spring Newsletter']) {
      expect(banner?.textContent, `the refusal banner does not name "${title}"`).toContain(title);
    }
  });
});

// The seven media stories (Task A6a). As with the editor and publish stories above, the universal
// loop below already binds every marker anchor, settle, and pose; these add the one thing each page
// contract names specifically, plus the media-base assertion the task calls out by name: every
// image these stories render composes from `fixtureMediaBase`, the docs origin's own asset route,
// never the real admin's hardcoded `/media` default.

describe('media/insert-panel', () => {
  it('poses the insert panel open with the upload-first chooser and the reuse picker', async () => {
    const screen = await mountPosed(getStory('media/insert-panel'));

    // Read before any polling assertion below runs: an errored image swaps for a broken-image
    // fallback with no `img` tag at all, so the src this row exists to prove must be read at the
    // first paint, not after a wait that could outlast it.
    const srcs = expectMediaBaseSrcs(screen.container);
    expect(srcs.length).toBeGreaterThan(0);

    await expect.element(screen.getByRole('button', { name: 'Upload an image' })).toBeInTheDocument();
    expect(screen.container.textContent).toContain('or reuse an image');
    // The reuse picker's own listbox, populated from the fixture library.
    await expect.element(screen.getByRole('option', { name: /Trailhead View/ })).toBeInTheDocument();
  });
});

describe('media/upload-form', () => {
  it('renders the capture card with the Suggested name tag and both alt choices', async () => {
    const screen = await mountPosed(getStory('media/upload-form'));

    await expect.element(screen.getByText('Suggested')).toBeInTheDocument();
    await expect.element(screen.getByRole('radio', { name: 'Write a description' })).toBeInTheDocument();
    await expect.element(screen.getByRole('radio', { name: 'Mark as decorative' })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Insert image' })).toBeInTheDocument();

    // The card previews the file through a local object URL, never a media-base path; the real
    // /media default never shows through even though there is no fixtureMediaBase image here.
    const srcs = mediaImageSrcs(screen.container);
    expect(srcs.every((src) => !src.startsWith('/media/'))).toBe(true);
  });
});

describe('media/lead-picture-dialog', () => {
  it(
    'poses the placement view open with the 16:9 preview, the alt choice, and the social-card note',
    async () => {
      const screen = await mountPosed(getStory('media/lead-picture-dialog'));

      // Read before any polling assertion below: an errored image swaps for a fallback with no
      // `img` tag, so the src composition this row exists to prove is read at the first paint.
      const srcs = expectMediaBaseSrcs(screen.container);
      expect(srcs.length).toBeGreaterThan(0);

      const dialog = screen.container.querySelector<HTMLDialogElement>('dialog.modal');
      expect(dialog?.open).toBe(true);
      expect(dialog?.textContent).toContain('This image is also the picture shown when the post is shared to social.');
      await expect.element(screen.getByRole('radio', { name: 'Describe it' })).toBeInTheDocument();
      await expect.element(screen.getByRole('radio', { name: 'Decorative' })).toBeInTheDocument();
      await expect.element(screen.getByLabelText('Caption')).toBeInTheDocument();
      await expect.element(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();
      await expect.element(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    },
  );
});

describe('media/library', () => {
  it('renders the resting screen: counts, search, the view toggle, and the three filters', async () => {
    const screen = await mountPosed(getStory('media/library'));

    // Read before any polling assertion below: an errored tile image swaps for a broken-image
    // fallback with no `img` tag, so the src composition this row exists to prove is read first.
    const srcs = expectMediaBaseSrcs(screen.container);
    expect(srcs.length).toBeGreaterThan(0);

    expect(screen.container.querySelector('header p')?.textContent).toMatch(/\d+ images?, \d+ used/);
    await expect.element(screen.getByRole('searchbox', { name: /search the media library/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Grid view' })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'List view' })).toBeInTheDocument();
    for (const label of ['All', 'Needs alt', 'No references found']) {
      await expect.element(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    }
  });
});

describe('media/details-panel', () => {
  it('poses the detail slide-over open over the selected tile, with its where-used link', async () => {
    const screen = await mountPosed(getStory('media/details-panel'));

    // A pose-reached image is already at risk of an early network error swapping it for a
    // fallback (no `img` tag), so this reads whatever is still present rather than asserting a
    // minimum count; media/library and media/insert-panel cover the guaranteed-present case.
    expectMediaBaseSrcs(screen.container);

    const panel = screen.container.querySelector('aside[role="region"]');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain('Team Photo');
    expect(panel?.textContent).toContain('Default alt text');
    await expect.element(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    // The where-used link the fixture's usage overlay names.
    await expect
      .element(screen.getByRole('link', { name: 'Team Retreat Recap' }))
      .toBeInTheDocument();
  });
});

describe('media/bulk-selection', () => {
  it('poses three tiles selected, opening the sticky action bar with its count and controls', async () => {
    const screen = await mountPosed(getStory('media/bulk-selection'));

    expectMediaBaseSrcs(screen.container);

    const bar = screen.container.querySelector('[role="region"][aria-label="Selection actions"]');
    expect(bar).not.toBeNull();
    expect(bar?.textContent).toContain('3 selected');
    await expect.element(screen.getByRole('button', { name: /Select all/ })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /Delete 3/ })).toBeInTheDocument();
  });
});

describe('media/delete-in-use', () => {
  it('poses the in-use face open, naming the fixture entry the asset is used by', async () => {
    const screen = await mountPosed(getStory('media/delete-in-use'));

    expectMediaBaseSrcs(screen.container);

    const dialog = screen.container.querySelector<HTMLDialogElement>('dialog[role="alertdialog"]');
    expect(dialog?.open).toBe(true);
    expect(dialog?.textContent).toContain('These would break');
    // The fixture entry the in-use asset breaks: named by title, under the published grouping.
    expect(dialog?.textContent).toContain('Team Retreat Recap');
    await expect.element(screen.getByRole('button', { name: 'Delete anyway' })).toBeInTheDocument();
    // The typed-confirm gate: disabled until the asset's own slug is typed.
    expect(screen.container.querySelector<HTMLButtonElement>('button[type="submit"].btn-error')?.disabled).toBe(true);
  });
});

// The four site stories (Task A6b), the last group: tags, roster, nav, and the site-authored
// toolkit screen. As with the earlier groups, the universal loop below already binds every marker
// anchor, settle, and pose; these add the one thing each page contract names specifically.

describe('tags/screen', () => {
  it('renders the resting screen: the add field, the tag list, an unused delete, and the unlisted seed', async () => {
    const screen = await mountPosed(getStory('tags/screen'));

    await expect.element(screen.getByRole('heading', { name: 'Your tags' })).toBeInTheDocument();
    // The stored-form line under the Add field is the one contracted detail the audit says is not
    // in the resting render (it appears as the author types), so this row asserts no pose for it.
    expect(screen.container.textContent).toContain('Editors see the name; posts keep a short slug.');

    // The trash icon versus the use count: an in-use tag's delete is guarded (aria-disabled), the
    // fixture's zero-usage tag's own delete stays the active, ungated control.
    const guardedDelete = screen.container.querySelector('button[aria-label^="Cannot remove Trail Guide"]');
    expect(guardedDelete?.getAttribute('aria-disabled')).toBe('true');
    const unusedDelete = screen.container.querySelector('button[aria-label="Remove Gear"]');
    expect(unusedDelete?.hasAttribute('aria-disabled')).toBe(false);

    // The not-on-this-list section, seeded from a tag in use but absent from the vocabulary.
    await expect.element(screen.getByRole('heading', { name: 'Already on your posts' })).toBeInTheDocument();
    expect(screen.container.textContent).toContain('volunteer-spotlight');

    await expect.element(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });
});

describe('roster/own-row', () => {
  it("disables the signed-in editor's own row while leaving another editor's controls active", async () => {
    const screen = await mountPosed(getStory('roster/own-row'));

    // data.self matches the fixture editor's address, so Jamie Torres's own row is disabled: no
    // self role-change, no self-removal, mirroring the anti-lockout rule's own row-level guard.
    const ownToggle = screen.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle role for Jamie Torres"]',
    );
    expect(ownToggle?.disabled).toBe(true);
    const ownRemove = screen.container.querySelector<HTMLButtonElement>('button[aria-label="Remove Jamie Torres"]');
    expect(ownRemove?.disabled).toBe(true);

    // The peer editor is not the signed-in reader, so their row stays fully active.
    const peerToggle = screen.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle role for Robin Lake"]',
    );
    expect(peerToggle?.disabled).toBe(false);
    const peerRemove = screen.container.querySelector<HTMLButtonElement>('button[aria-label="Remove Robin Lake"]');
    expect(peerRemove?.disabled).toBe(false);
  });
});

describe('nav/worked-navlayout', () => {
  it('renders the resolved sidebar: the nested section and the trailing fallback group below the divider', async () => {
    const screen = await mountPosed(getStory('nav/worked-navlayout'));

    // Half this row's contract is the sidebar, and at its declared wide width the drawer is
    // persistent rather than an overlay: an overlay drawer carries role="dialog", a persistent one
    // does not (the same assertion editor/sidebar-list makes for the same reason).
    const sidebar = screen.container.querySelector('nav[aria-label="Site content"]');
    expect(sidebar).not.toBeNull();
    expect(sidebar?.getAttribute('role')).toBeNull();

    // The fixture navLayout's own nested "Club" section, a collapsible group with its two children.
    // Scoped to the sidebar's own <summary>, since the site name ("Trailhead Club") elsewhere on
    // the page also contains the word "Club".
    const sectionLabel = [...(sidebar?.querySelectorAll('summary') ?? [])].find(
      (el) => el.textContent?.trim() === 'Club',
    );
    expect(sectionLabel, 'the "Club" section header did not render').toBeDefined();
    await expect.element(screen.getByRole('link', { name: 'Events' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Members' })).toBeInTheDocument();

    // The unreferenced trailing group after the divider: the three engine screens the worked
    // example's own tree never names.
    const fallback = screen.container.querySelector('[data-testid="cairn-nav-fallback"]');
    expect(fallback).not.toBeNull();
    expect(fallback?.textContent).toContain('Tags');
    expect(fallback?.textContent).toContain('Editors');
    expect(fallback?.textContent).toContain('Help');
  });
});

describe('toolkit/custom-screen', () => {
  it("renders the doc snippet's composed screen: the header, the office list, and each event's status chip", async () => {
    const screen = await mountPosed(getStory('toolkit/custom-screen'));

    await expect.element(screen.getByRole('heading', { name: 'Events', exact: true })).toBeInTheDocument();
    expect(screen.container.textContent).toContain('Club');
    expect(screen.container.textContent).toContain('3 upcoming');

    await expect.element(screen.getByRole('heading', { name: 'All events' })).toBeInTheDocument();
    const rows = [...screen.container.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(3);
    expect(screen.container.textContent).toContain('Spring Cleanup');
    expect(screen.container.textContent).toContain('Trail Work Day');
    expect(screen.container.textContent).toContain('Annual Meeting');
    // Every row's status chip, transcribed straight from the doc snippet's own `tone="info"`.
    expect(screen.container.querySelectorAll('.status-chip')).toHaveLength(3);
    expect(screen.container.textContent).toContain('Confirmed');
    expect(screen.container.textContent).toContain('Pending');
  });
});

// The universal contract every registered story must satisfy, exercised across the full inventory
// now that A4 through A6b have registered all 25.
for (const story of stories) {
  const entry = manifest.find((candidate) => candidate.id === story.id);

  describe(`${story.id}: the universal story contract`, () => {
    it('has a matching manifest entry', () => {
      expect(entry).toBeDefined();
    });

    it('declares marker keys matching its manifest entry', () => {
      expect((story.markers ?? []).map((marker) => marker.key)).toEqual(entry?.markerKeys ?? []);
    });

    it(
      'resolves every marker anchor and runs its settle and pose without throwing',
      async () => {
        const screen = await mountPosed(story);
        for (const marker of story.markers ?? []) {
          const anchorEl = screen.container.querySelector(marker.anchor);
          expect(anchorEl, `marker "${marker.key}" anchor "${marker.anchor}" did not resolve`).not.toBeNull();
        }
      },
      EDITOR_MOUNT_TIMEOUT,
    );
  });
}
