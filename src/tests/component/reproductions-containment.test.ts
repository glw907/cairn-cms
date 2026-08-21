// cairn-cms: the containment contract a mounted reproduction story holds from first paint.
//
// Task B0 of the live-reproduction seam Pass 2, built against the ratified design at
// docs/internal/record/2026-08-18-repro-containment-design.md. Containment is a property of the
// mounted render, not of the page that embeds it: `ReproContext` registers a capture-phase focus
// firewall on `document` (M1), wraps all three of its host branches in an `inert`,
// `display: contents` element carrying `data-cairn-picture` (M2), and stops five window-level event
// types before any handler sees them (M3). All three register from the instance body, so they are
// live before any child exists.
//
// This file is the only mechanism in this repo that fails when containment regresses, so every
// assertion here is falsifiable by construction. `reproductions-stories.test.ts` is the companion
// regression net: it exercises all 25 stories through settle and pose, so a containment change that
// breaks a pose or a rendered surface fails there first.
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { cdp, page, userEvent } from 'vitest/browser';
import { manifest, type ReproManifestEntry } from '../../lib/reproductions/manifest.js';
import { getStory, ReproContext, type ReproStory } from '../../lib/reproductions/index.js';
import { renderStory } from './_repro-mount.js';

/** The wrapper M2 puts around everything `ReproContext` mounts. */
const PICTURE = '[data-cairn-picture]';

/** The five window-level event types M3's firewall stops. */
const FIREWALLED_TYPES = ['keydown', 'pointerdown', 'dragover', 'drop', 'beforeunload'] as const;

// The component project's ambient size (src/tests/component/_setup.ts sets it once per file), and
// the restore every pinned mount below returns to, so a pinned story cannot leak its width into a
// later test.
const BASELINE_VIEWPORT = { width: 1280, height: 720 };
let viewportPinned = false;

// A story mount that pays a CodeMirror cold start runs past the browser project's 15s default, the
// same ceiling reproductions-stories.test.ts gives its editor mounts.
const EDITOR_MOUNT_TIMEOUT = 40_000;

/** The viewport size a story's manifest entry declares it can render at. */
function viewportFor(entry: ReproManifestEntry | undefined) {
  const heights = entry?.heights;
  if (heights?.wide !== undefined) return { width: 1280, height: heights.wide };
  if (heights?.desktop !== undefined) return { width: 860, height: heights.desktop };
  if (heights?.narrow !== undefined) return { width: 390, height: heights.narrow };
  return BASELINE_VIEWPORT;
}

/**
 * Mount a story the way both its consumers do: the declared viewport, then the shared `renderStory`
 * harness. The same shape `reproductions-stories.test.ts` uses, so a containment assertion is made
 * against exactly the render a docs page captures.
 */
async function mountPosed(story: ReproStory) {
  const size = viewportFor(manifest.find((candidate) => candidate.id === story.id));
  if (size.width !== BASELINE_VIEWPORT.width || size.height !== BASELINE_VIEWPORT.height) {
    await page.viewport(size.width, size.height);
    viewportPinned = true;
  }
  return renderStory(story);
}

// The elements a test appended to the document itself, torn down after it. `appendChild`, not
// `append`: this repo's shared tsconfig merges the Workers HTMLRewriter `Element` into the global
// one, so `append` resolves to that interface's own string-or-Response signature.
const strays: HTMLElement[] = [];

/** Append an element outside the mounted story, for a focus or tab-order probe. */
function outside<T extends HTMLElement>(element: T, before?: HTMLElement): T {
  if (before) before.parentElement?.insertBefore(element, before);
  else document.body.appendChild(element);
  strays.push(element);
  return element;
}

afterEach(async () => {
  for (const stray of strays.splice(0)) stray.remove();
  if (!viewportPinned) return;
  viewportPinned = false;
  await page.viewport(BASELINE_VIEWPORT.width, BASELINE_VIEWPORT.height);
});

/** One paint's worth of wait, for an assertion that must also hold after the frame settles. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** Whether a modal dialog still paints its backdrop, which `inert` must not take away. */
function backdropPainted(dialog: Element): boolean {
  return getComputedStyle(dialog, '::backdrop').display !== 'none';
}

/**
 * The accessible name a control carries only for the accessibility-tree probe below, distinctive
 * enough that no admin component can supply it.
 */
const AX_PROBE_LABEL = 'cairn accessibility tree probe';

/**
 * The CDP surface this file calls, named structurally. Vitest exports `CDPSession` as an empty
 * interface, so the protocol methods have to be declared where they are used.
 */
type ProtocolSession = { send(method: string, params?: Record<string, unknown>): Promise<unknown> };

/** One node of the frame tree `Page.getFrameTree` returns. */
type FrameTreeNode = { frame: { id: string; url: string }; childFrames?: FrameTreeNode[] };

/**
 * How many accessibility nodes in this document carry `name`, read over the Chrome DevTools
 * Protocol. The DOM exposes no accessibility tree, so this is the only way to assert what a screen
 * reader can reach. `Accessibility.getFullAXTree` answers for the top-level frame by default and a
 * browser-mode test runs in a child frame, so the read is addressed to the frame whose URL is this
 * document's.
 */
async function accessibilityNodeCount(name: string): Promise<number> {
  const session = cdp() as unknown as ProtocolSession;
  await session.send('Accessibility.enable');
  await session.send('Page.enable');
  const { frameTree } = (await session.send('Page.getFrameTree')) as { frameTree: FrameTreeNode };
  const frames: FrameTreeNode['frame'][] = [];
  const collect = (node: FrameTreeNode) => {
    frames.push(node.frame);
    for (const child of node.childFrames ?? []) collect(child);
  };
  collect(frameTree);
  const own = frames.find((frame) => frame.url === window.location.href);
  if (!own) throw new Error('No frame in the CDP frame tree matched this test document.');
  const { nodes } = (await session.send('Accessibility.getFullAXTree', { frameId: own.id })) as {
    nodes: { name?: { value?: string } }[];
  };
  return nodes.filter((node) => node.name?.value === name).length;
}

/**
 * Assert that a dialog a story opened is contained and still a real modal: focus is outside the
 * mounted picture, the dialog carries `inert` (M1's permanent containment, which ancestor
 * inertness cannot supply), and `open`, `:modal`, and the backdrop all still hold.
 */
function expectContainedModal(container: HTMLElement, dialog: HTMLDialogElement) {
  expect(container.contains(document.activeElement)).toBe(false);
  expect(dialog.open).toBe(true);
  expect(dialog.matches(':modal')).toBe(true);
  expect(dialog.inert).toBe(true);
  expect(backdropPainted(dialog)).toBe(true);
}

/**
 * A window-level sentinel of each firewalled type. Registered after mount and in the bubble phase
 * by default, so it sits behind `ReproContext`'s own capture listeners in registration order;
 * `capture` puts it in the same phase as the firewall, which is what makes the ordering
 * precondition observable. Behavior, never registration: Svelte compiles
 * `<svelte:window onkeydown={cond ? undefined : h}>` into an unconditional `addEventListener`
 * whose wrapper holds the ternary, so a spy over `window.addEventListener` records the type either
 * way and cannot discriminate.
 */
function windowSentinel(capture = false) {
  const seen: string[] = [];
  const record = (event: Event) => seen.push(event.type);
  for (const type of FIREWALLED_TYPES) window.addEventListener(type, record, capture);
  return {
    seen,
    dispatchAll() {
      for (const type of FIREWALLED_TYPES) {
        window.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
      }
    },
    stop() {
      for (const type of FIREWALLED_TYPES) window.removeEventListener(type, record, capture);
    },
  };
}

/**
 * Which of the five firewalled types reach a window listener registered right now: one sentinel,
 * one dispatch of each type, then removal. Every assertion about the firewall reads it, so the
 * observation is made the same way whether a story is mounted, unmounted, or never mounted.
 */
function typesReachingWindow(): string[] {
  const sentinel = windowSentinel();
  sentinel.dispatchAll();
  sentinel.stop();
  return sentinel.seen;
}

// T0. The platform claims the rest of this file rests on, asserted against the browser rather than
// against the engine, with no cairn component involved. Kept permanently: this is the tripwire if a
// future Chromium changes the modal-dialog carve-out or what `inert` costs a dialog.
describe('the platform assumptions containment rests on', () => {
  it('fires a click listener on a button inside an inert subtree', () => {
    const wrapper = outside(document.createElement('div'));
    wrapper.inert = true;
    const button = document.createElement('button');
    let clicks = 0;
    button.addEventListener('click', () => (clicks += 1));
    wrapper.appendChild(button);

    button.click();

    // Every pose in the corpus drives state through `clickWhenPresent`, which calls
    // `HTMLElement.click()`. Inert governs hit testing, not scripted activation, so a posed story
    // still reaches its state inside the picture wrapper.
    expect(clicks).toBe(1);
  });

  it('contributes no accessibility node from an inert subtree', async () => {
    const wrapper = outside(document.createElement('div'));
    // M2's exact shape: an inert wrapper that generates no box of its own. `display: contents` does
    // not soften what inert costs the accessibility tree, which is the half worth pinning, since
    // the wrapper carries both.
    wrapper.style.display = 'contents';
    const button = document.createElement('button');
    button.textContent = AX_PROBE_LABEL;
    wrapper.appendChild(button);

    expect(await accessibilityNodeCount(AX_PROBE_LABEL)).toBeGreaterThan(0);

    wrapper.inert = true;

    // An inert subtree is absent from the accessibility tree, not merely ignored inside it. This is
    // what makes the alt text a page authors for an embedded reproduction the whole accessible
    // content of that embed, and it is asserted here because the DOM offers no way to observe it.
    expect(await accessibilityNodeCount(AX_PROBE_LABEL)).toBe(0);
  });

  it('still moves focus into a modal dialog whose ancestor is inert', () => {
    const wrapper = outside(document.createElement('div'));
    const dialog = document.createElement('dialog');
    const button = document.createElement('button');
    button.textContent = 'Confirm';
    dialog.appendChild(button);
    wrapper.appendChild(dialog);

    wrapper.inert = true;
    dialog.showModal();

    // The escape-inertness carve-out (ruling R1): the HTML inert algorithm exempts the topmost
    // modal dialog and its flat-tree descendants from an ancestor's inertness. This is why M2's
    // wrapper alone cannot contain a dialog and M1 exists at all. Asserting the opposite here is
    // the only way to watch this test fail, since it describes the browser and not the engine.
    expect(dialog.contains(document.activeElement)).toBe(true);
    dialog.close();
  });

  it('keeps a modal dialog modal when the dialog itself is inert, and lands focus outside it', () => {
    const wrapper = outside(document.createElement('div'));
    const elsewhere = document.createElement('input');
    const dialog = document.createElement('dialog');
    const button = document.createElement('button');
    button.textContent = 'Confirm';
    dialog.appendChild(button);
    wrapper.appendChild(elsewhere);
    wrapper.appendChild(dialog);
    elsewhere.focus();

    dialog.inert = true;
    dialog.showModal();

    // Ruling R2, at no fidelity cost: the dialog stays open, stays top-layered, and still paints a
    // backdrop. What changes is only where focus lands.
    expect(dialog.open).toBe(true);
    expect(dialog.matches(':modal')).toBe(true);
    expect(backdropPainted(dialog)).toBe(true);
    expect(dialog.contains(document.activeElement)).toBe(false);
    dialog.close();
  });
});

describe('the picture wrapper (M2)', () => {
  it('wraps every host branch in one inert element that generates no box', async () => {
    // One story per host branch: the shell branch, the bare branch whose component owns its theme
    // root, and the bare branch ReproContext gives a theme root to. All three go inside the wrapper,
    // which is why the wrapper cannot be a styled box.
    for (const id of ['roster/own-row', 'auth/login', 'editor/toolbar']) {
      const screen = await mountPosed(getStory(id));
      const picture = screen.container.querySelector<HTMLElement>(PICTURE);
      expect(picture, `${id} rendered no ${PICTURE} wrapper`).not.toBeNull();
      expect(picture!.inert, `${id}'s wrapper is not inert`).toBe(true);
      expect(getComputedStyle(picture!).display).toBe('contents');
      expect(picture!.childElementCount).toBeGreaterThan(0);
      await screen.unmount();
    }
  });

  it('refuses focus to a control inside it, and is skipped by Tab', async () => {
    const screen = await mountPosed(getStory('editor/sidebar-list'));
    const button = screen.container.querySelector('button');
    expect(button).not.toBeNull();

    button!.focus();
    expect(document.activeElement).not.toBe(button);

    const lead = outside(document.createElement('input'), screen.container);
    lead.focus();
    expect(document.activeElement).toBe(lead);
    await userEvent.tab();

    expect(screen.container.contains(document.activeElement)).toBe(false);
  });

  it('adds no box and changes no geometry, at a pinned story viewport', async () => {
    const screen = await mountPosed(getStory('editor/entry-screen'));
    const picture = screen.container.querySelector<HTMLElement>(PICTURE)!;
    const root = screen.container.querySelector<HTMLElement>('[data-theme]')!;
    const rect = root.getBoundingClientRect();

    // The falsifiable half of the `display: contents` assumption. Dropping the rule leaves the
    // wrapper a block box, which this catches; the shell root's own rect does not move either way,
    // since a block wrapper between `body > div` and a block child is layout-neutral for width and
    // top. Both halves are asserted: the box claim is what discriminates, the geometry claim is
    // what the assumption is actually about.
    expect(picture.getClientRects().length).toBe(0);
    expect(rect.width).toBe(window.innerWidth);
    expect(rect.top).toBe(0);
  }, EDITOR_MOUNT_TIMEOUT);
});

describe('the focus firewall (M1)', () => {
  it('contains editor/tidy-review, which opens its modal in its own mount effect', async () => {
    const screen = await mountPosed(getStory('editor/tidy-review'));
    const dialog = screen.container.querySelector<HTMLDialogElement>('dialog[open]');
    expect(dialog).not.toBeNull();

    // This is also the proof for the ordering assumption. `TidyReview` calls `showModal()` from its
    // own mount `$effect`, so if ReproContext registered M1 from `onMount` or from an `$effect`
    // instead of from its instance body, the focus move would already be over, no `focusin` would
    // reach the handler, and the assertions below would fail. Do not weaken this by moving the
    // registration.
    expectContainedModal(screen.container, dialog!);
    await nextFrame();
    expectContainedModal(screen.container, dialog!);
  });

  it('contains a dialog a pose opens, not only one that opens at mount', async () => {
    const pending = await mountPosed(getStory('publish/pending-list'));
    const publishDialog = pending.container.querySelector<HTMLDialogElement>(
      'dialog[aria-labelledby="cairn-shell-publish-all-title"]',
    );
    expect(publishDialog).not.toBeNull();
    expectContainedModal(pending.container, publishDialog!);
    await nextFrame();
    expectContainedModal(pending.container, publishDialog!);
    await pending.unmount();

    // The second half is what the superseded "apply inert after the pose resolves" design had no
    // hook to hang on: ReproContext does not run poses, its consumer does.
    const deleting = await mountPosed(getStory('media/delete-in-use'));
    const deleteDialog = deleting.container.querySelector<HTMLDialogElement>('dialog[role="alertdialog"][open]');
    expect(deleteDialog).not.toBeNull();
    expectContainedModal(deleting.container, deleteDialog!);
    await nextFrame();
    expectContainedModal(deleting.container, deleteDialog!);
  });
});

describe('the event firewall (M3)', () => {
  it('lets the sentinel observe all five types when no story is mounted', () => {
    // The control that keeps the two assertions below falsifiable: with nothing mounted there is no
    // firewall, so the sentinel must see every type it later must not see.
    expect(typesReachingWindow()).toEqual([...FIREWALLED_TYPES]);
  });

  it('does not reach a capture listener that was already registered before the mount', async () => {
    // The firewall's mechanism is registration order, not phase precedence, and this is where that
    // distinction is visible. A capture listener already on `window` when ReproContext mounts sits
    // ahead of the firewall in window's capture queue and runs first, so it sees every type. The
    // firewall beats a story's own bindings only because a parent's instance body runs before any
    // child template creates one, which makes "ReproContext owns its document" a precondition of
    // containment rather than a deployment preference. CairnAdminShell's own `onkeydowncapture` is
    // the live case: mount a story beside a shell that is already there and the shell's capture
    // handler answers first.
    const sentinel = windowSentinel(true);
    try {
      await mountPosed(getStory('roster/own-row'));
      sentinel.dispatchAll();
      expect(sentinel.seen).toEqual([...FIREWALLED_TYPES]);
    } finally {
      sentinel.stop();
    }
  });

  it('stops every firewalled type reaching a listener, over the media stack', async () => {
    await mountPosed(getStory('media/delete-in-use'));

    // media/delete-in-use stacks CairnAdminShell, CairnMediaLibrary, and ListToolbar, three of the
    // four components that bind window-level handlers.
    expect(typesReachingWindow()).toEqual([]);
  });

  it('stops every firewalled type reaching a listener, over the editor stack', async () => {
    await mountPosed(getStory('editor/entry-screen'));

    // EditPage registers its keydown and beforeunload handlers imperatively, which no per-component
    // context flag would have covered.
    expect(typesReachingWindow()).toEqual([]);
  }, EDITOR_MOUNT_TIMEOUT);

  it('cancels a dragover and a drop, and cancels nothing else', async () => {
    await mountPosed(getStory('media/delete-in-use'));

    const dispatch = (type: string) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    // Stopping an event and cancelling it are separate acts, and for a drag the second one is what
    // containment needs. CairnMediaLibrary's own window `dragover` handler is the only thing that
    // makes this document a valid drop target, and it is its `preventDefault` that makes it one.
    // Stopping that handler without taking over the cancellation leaves the browser's default
    // action in place, and the default action for a file the page never accepted is to navigate to
    // it: a reader who drops an image on the picture replaces it with the raw file.
    expect(dispatch('dragover'), 'dragover was not cancelled').toBe(true);
    expect(dispatch('drop'), 'drop was not cancelled').toBe(true);

    // The other three must stay uncancelled, and for different reasons. Cancelling `keydown` takes
    // away Tab and space-scroll, which the tab-order probe above depends on. Cancelling
    // `beforeunload` IS the unload prompt, so it would raise the dialog the firewall exists to
    // suppress.
    expect(dispatch('keydown'), 'keydown was cancelled').toBe(false);
    expect(dispatch('pointerdown'), 'pointerdown was cancelled').toBe(false);
    expect(dispatch('beforeunload'), 'beforeunload was cancelled').toBe(false);
  });

  it('opens nothing when a reader presses the shell shortcuts', async () => {
    const screen = await mountPosed(getStory('roster/own-row'));
    const drawerToggle = screen.container.querySelector<HTMLInputElement>('#cairn-shell-drawer');
    expect(drawerToggle).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    await nextFrame();
    expect(screen.container.querySelector('dialog[aria-label="Search or jump to"][open]')).toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
    await nextFrame();
    expect(drawerToggle!.checked).toBe(false);
  });

  it('leaves a posed state alone when a reader presses Escape', async () => {
    const screen = await mountPosed(getStory('editor/details-panel'));
    expect(screen.container.querySelector('[aria-label="Entry details"]:not([hidden])')).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextFrame();
    await nextFrame();

    // Uncontained, EditPage's window keydown handler closes the panel, so a reader pressing Escape
    // anywhere on the docs page would change the picture.
    expect(screen.container.querySelector('[aria-label="Entry details"]:not([hidden])')).not.toBeNull();
  }, EDITOR_MOUNT_TIMEOUT);
});

describe('the containment teardown', () => {
  it('removes every listener when a mounted story unmounts', async () => {
    const screen = await mountPosed(getStory('roster/own-row'));
    // The firewall is live while the story is mounted, so the assertion after the unmount is a
    // teardown proof rather than a restatement of the no-mount control above. Both halves belong to
    // this one case: proving teardown by leaning on an earlier describe having mounted and been
    // cleaned up makes the proof an accident of file order, which a reorder silently removes.
    expect(typesReachingWindow()).toEqual([]);

    await screen.unmount();

    expect(typesReachingWindow()).toEqual([...FIREWALLED_TYPES]);
  });

  it('removes every listener when the mount throws during init', async () => {
    // The window the release has to cover. `onDestroy` compiles to a mount effect whose return
    // value is the cleanup, so no teardown exists until effects flush, while the six listeners are
    // live from the instance body. A throw in between aborts the mount with all six installed and
    // nothing holding a handle on them: the document keeps a focus firewall and five window capture
    // listeners for good, which costs it keyboard and pointer handling, and in this project costs
    // every later test in the file the same thing.
    const story: ReproStory = {
      ...getStory('roster/own-row'),
      // Annotated because a getter that only throws infers `void`, which does not satisfy the
      // property it stands in for.
      get context(): ReproStory['context'] {
        throw new Error('story init failed');
      },
    };

    // render is async-only (vitest-browser-svelte 3), so a throw during Svelte's own mount surfaces
    // as a rejection rather than a synchronous throw.
    await expect(render(ReproContext, { props: { story } })).rejects.toThrow('story init failed');

    expect(typesReachingWindow()).toEqual([...FIREWALLED_TYPES]);
  });
});

// The seven stories the design's Fidelity table records: each focuses a control today, either
// through showModal() or through a programmatic .focus(), and cairn-admin.css paints a
// :focus-visible ring on whatever ends up focused. Containment removes the ring, which flips these
// seven from the keyboard face of the screen to the mouse face. The table in
// docs/internal/record/repro-story-audit.md is the record; this is its falsifiable half.
//
// `ringed` is what makes each row discriminate. `:focus-visible` matches nothing in a container
// that rendered nothing at all, so the negative assertion alone passes just as well against a
// broken mount as against a contained one. Each selector names the element the uncontained render
// focused, measured against this suite's own mounts, so a story that stops rendering that element
// fails here rather than reporting containment.
const FOCUS_RING_STORIES = [
  {
    id: 'editor/tidy-review',
    ringed: 'dialog[open] button[aria-label="Cancel review"]',
  },
  {
    id: 'publish/pending-list',
    ringed:
      'dialog[aria-labelledby="cairn-shell-publish-all-title"][open] button[aria-label="Close"]',
  },
  {
    id: 'media/lead-picture-dialog',
    ringed: 'dialog[open] .modal-box button[aria-label="Close"]',
  },
  {
    // The in-use face's first focusable element is the entry link, not a control of the dialog's
    // own: the "These would break" list sits above the form, so showModal() lands on the first
    // breaking entry's <a>.
    id: 'media/delete-in-use',
    ringed: 'dialog[role="alertdialog"][open] ul a[href^="/admin/"]',
  },
  {
    id: 'editor/details-panel',
    ringed: 'aside[aria-label="Entry details"] button[aria-label="Close details"]',
  },
  {
    id: 'media/details-panel',
    ringed: 'aside[aria-label$=" details"] button[aria-label="Close details"]',
  },
  {
    id: 'media/insert-panel',
    ringed: '[role="dialog"][aria-label="Insert image"][tabindex="-1"]',
  },
];

describe('the recorded fidelity change', () => {
  for (const { id, ringed } of FOCUS_RING_STORIES) {
    it(
      `leaves nothing focused in ${id}, so it paints no focus ring`,
      async () => {
        const screen = await mountPosed(getStory(id));
        expect(screen.container.querySelector(ringed), `${id} rendered no ${ringed}`).not.toBeNull();
        expect(screen.container.querySelector(':focus-visible')).toBeNull();
      },
      EDITOR_MOUNT_TIMEOUT,
    );
  }
});

describe('the poses containment must not break', () => {
  it('still lands media/bulk-selection, which clicks three checkboxes', async () => {
    // A guard, not a proof: this passes today and must keep passing. Its falsifiability comes from
    // the platform assumption above, that a scripted click still fires inside an inert subtree.
    const screen = await mountPosed(getStory('media/bulk-selection'));
    const checked = screen.container.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"][aria-label^="Select "]:checked',
    );
    expect(checked.length).toBe(3);
  });
});
