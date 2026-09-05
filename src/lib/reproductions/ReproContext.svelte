<!--
@component
The one mounting wrapper both a docs route and the engine's own story-mount test render a
reproduction story through, so the two consumers can never disagree about what a story needs to
render correctly. It applies the story's own `context` entries, supplies the fixture media base
and a CSRF-token getter every media surface reads (so no call site injects either itself), hosts
`shell` stories inside `CairnAdminShell` with the fixture `navLayout`, and carries the admin
stylesheet unconditionally. A bare story that resolves no theme root of its own also gets one here,
from the same `theme` prop, plus the surface the theme root itself does not paint: between the
three, such a story renders styled on the admin's own ground wherever it mounts, rather than only
inside a host that happens to provide a root.

It also contains what it mounts, so a reader cannot drive a reproduction as if it were a live admin
screen. Three mechanisms hold that. Everything it mounts sits inside an `inert`, `display: contents`
element carrying `data-cairn-picture`, so no control in it is focusable, tabbable, or hit-testable,
and, since an inert subtree contributes no node to the accessibility tree, nothing in it reaches
assistive technology either: the alt text an embedding page authors is the whole accessible content
of the embed. A capture-phase `focusin` listener marks a modal dialog inert as it opens and releases
the focus the dialog took, which is the only way to contain one: the HTML inert algorithm exempts
the topmost modal dialog from an ancestor's inertness. And capture-phase listeners on `window` stop
`keydown`, `pointerdown`, `dragover`, `drop`, and `beforeunload` before any handler sees them,
cancelling the two drag types as well, since stopping the media library's own `dragover` handler
without taking over its `preventDefault` would leave the browser to navigate to a dropped file.
Between them they cover the window-level bindings the shell, the editor, the media library, and the
list toolbar each register.

All three register from the instance body, so they are live before any child exists and hold from
first paint. None depends on a pose, which a consumer runs and this component never does.

Mount this in a document dedicated to one reproduction, its own route inside an `<iframe>`, never
beside a live admin surface. The window firewall reaches the whole document rather than the wrapper,
and it wins by registration order rather than by phase, so a listener already on `window` when this
component mounts still answers first. On a shared page it takes away every keyboard shortcut, every
pointer-dismissed control, and the unsaved-work guard `beforeunload` carries, which is how an editor
loses work with no signal.

Containment is otherwise frame-local, with one deliberate reach outward: focus landing inside a
same-origin frame pins the host document's `activeElement` to the `<iframe>` element, and the focus
listener calls `blur()` on that element to release it. That works in Chromium and Firefox, not in
WebKit. What no code in here can do is give a reader back the focus the load took. Measured across
all three engines, a frame that loads and focuses a control blurs whatever the reader had focused,
and neither `inert` nor `tabindex="-1"` on the host's `<iframe>` prevents it: `tabindex="-1"` only
takes the frame out of the host's tab order, `inert` also blocks hit-testing on it, and only Firefox
under `inert` even changes where the stolen focus lands. The page that embeds a reproduction owns
that repair, by recording `document.activeElement` before the frame loads and restoring it after.

One thing changes because containment holds: the seven stories that focused a control on open no
longer paint the admin's `:focus-visible` ring, so each shows the mouse face of its screen rather
than the keyboard one. `docs/internal/record/repro-story-audit.md` records which seven.
-->
<script lang="ts">
  import { onDestroy, setContext, untrack } from 'svelte';
  import { BROWSER } from 'esm-env';
  import CairnAdminShell from '../components/CairnAdminShell.svelte';
  import { MEDIA_BASE_CONTEXT_KEY } from '../components/media-base-context.js';
  import { CSRF_CONTEXT_KEY } from '../components/csrf-context.js';
  import type { AdminShellData } from '../sveltekit/content-routes-shell.js';
  import { fixtureConcept, fixtureCsrf, fixtureEditor, fixtureNavLayout, fixtureSiteName } from './fixtures.js';
  import { manifest } from './manifest.js';
  import type { ReproStory } from './index.js';
  import '../components/cairn-admin.css';

  // The media base every mounted story gets when its mounting page passes none: cairn-pub's own
  // asset route, `/repro-assets`. Module-internal rather than exported: a docs site deployed
  // under a SvelteKit `paths.base` cannot override a hardcode, and the `mediaBase` prop below is
  // the fix, not a second name for it.
  const DEFAULT_REPRO_MEDIA_BASE = '/repro-assets';

  // `ReproInstance` unexported (a sanctioned NavIcon-class leak); the
  // mounted component's own exports, read structurally off `ReproStory.pose`'s own signature
  // rather than by the retired name.
  type ReproInstance = Parameters<NonNullable<ReproStory['pose']>>[1];

  interface Props {
    /** The story to mount. */
    story: ReproStory;
    /**
     * The admin theme the mounting page owns. Resolved once below and then routed by host:
     * `CairnAdminShell`'s `themeOverride` for a `shell` host (every `shell` entry is
     * `ownThemeRoot: true` in `manifest.ts`, since the shell resolves its own theme root); merged
     * into the story's own `data.theme` for a `bare` host whose manifest entry is also
     * `ownThemeRoot: true` (the two auth pages, which render their wrapper from `data.theme`);
     * carried by this component's own theme root for every other `bare` story, which owns none.
     * Absent, every one of those falls back to the light admin theme, so a page carrying both kinds
     * of story cannot render half of them light and half dark.
     */
    theme?: 'cairn-admin' | 'cairn-admin-dark';
    /**
     * Called once with the mounted component's own exports, as the mount happens. A host that runs
     * poses passes this and hands the value back to `story.pose`, which is how a pose reaches a
     * state the real admin reaches by calling an exported method rather than by clicking (see
     * `ReproStory.pose`). A host that only renders a resting story needs none of it.
     */
    oninstance?: (instance: ReproInstance) => void;
    /**
     * The path segment every fixture media URL mounts under, so a docs site deployed under a
     * SvelteKit `paths.base` composes URLs inside its own namespace instead of the engine's fixed
     * default. Threaded to both places a mounted story reaches its media base: the
     * `MEDIA_BASE_CONTEXT_KEY` context every story reads directly, and the shell payload's own
     * `mediaBase` field, which feeds `CairnAdminShell`'s own shadowing `setContext` for a `'shell'`
     * story. Defaults to `'/repro-assets'`.
     */
    mediaBase?: string;
  }

  let { story, theme, oninstance, mediaBase }: Props = $props();

  // The mounted component's exports, handed out through a property setter rather than assigned to
  // a plain variable. `bind:this` writes to any assignable target and a member expression is one,
  // so the handoff below runs synchronously inside the mount's own render effect. An $effect would
  // not: a host that mounts and then immediately poses (the engine's own story suite does exactly
  // that) would read the instance before any effect had flushed. `bind:this` also writes undefined
  // on teardown, which is not a mount, so only a truthy value is handed on.
  //
  // `$state.raw`, not a plain `let`: Svelte's dev-mode binding validation reads the bound property
  // inside an effect and warns `binding_property_non_reactive` when that read registers no
  // dependency, which a plain variable behind a getter does not. Raw rather than deep, so the
  // instance handed on is the component's own exports object and not a proxy of it.
  let mountedInstance = $state.raw<ReproInstance | undefined>(undefined);
  const mount = {
    get instance(): ReproInstance | undefined {
      return mountedInstance;
    },
    set instance(value: ReproInstance | undefined) {
      mountedInstance = value;
      if (value) oninstance?.(value);
    },
  };

  // The teardown handle for the containment listeners below, declared out here so the rest of init
  // can release them if it throws. Undefined on the server, where none of them registers.
  let release: (() => void) | undefined;

  // Containment, registered here in the instance body rather than in onMount or an $effect. The
  // placement is load-bearing: the instance body runs before the template creates any child, so a
  // child that opens a modal from its own mount effect (TidyReview does) is already covered by the
  // time it runs, and no parent-versus-child effect ordering question arises.
  // src/tests/component/reproductions-containment.test.ts is what proves that ordering holds.
  if (BROWSER) {
    // A modal dialog escapes the wrapper's inertness: the HTML inert algorithm exempts the topmost
    // modal dialog and its flat-tree descendants from an ancestor's, so showModal() still lands
    // focus inside the dialog and the dialog's own buttons stay tabbable. Marking the dialog itself
    // inert is what removes them, and it costs the picture nothing: the dialog stays open, stays
    // top-layered, and still paints its backdrop.
    const containFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('[data-cairn-picture]')) return;
      const dialog = target.closest<HTMLDialogElement>('dialog[open]');
      if (dialog) dialog.inert = true;
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
      // Across documents the host's activeElement becomes the <iframe> element, which a same-frame
      // blur does not release. window.frameElement resolves in the PARENT realm, so it fails an
      // `instanceof HTMLElement` check in exactly the engines where the blur works; feature-test the
      // method instead. The try guards an engine that throws rather than returning null for a
      // cross-origin embed. This releases the pin in Chromium and Firefox and nothing in WebKit,
      // and even where it works it resets focus to <body> rather than restoring what the reader
      // had, which is the repair the embedding page owns and no attribute on the frame supplies.
      try {
        const frame = window.frameElement as { blur?: () => void } | null;
        if (typeof frame?.blur === 'function') frame.blur();
      } catch {
        // Cross-origin: frameElement is unreachable, and no code inside the frame can reach the pin.
      }
    };
    document.addEventListener('focusin', containFocus, true);

    // One capture listener per type, registered here so it is first in window's capture queue and
    // stops the event before anything a child registers later. That is registration order, not
    // phase precedence: capture listeners on one target fire in the order they were added, and
    // CairnAdminShell binds a capture handler of its own (`onkeydowncapture`), so the firewall wins
    // only because a parent's instance body runs before any child template exists. The precondition
    // is that no window listener is already registered when ReproContext mounts, which holds on a
    // page whose only job is to be a picture and is why this component must own its document.
    // src/tests/component/reproductions-containment.test.ts records the boundary with a capture
    // sentinel registered before the mount.
    //
    // This covers more than a per-component opt-out could: EditPage registers its keydown and
    // beforeunload handlers imperatively, ListToolbar arrives through a shared toolkit primitive
    // rather than as a story's own component, and a component that grows a window binding in one of
    // these five types later is covered with nobody remembering to gate it. Scoping to the wrapper
    // is not available, since the shell's Ctrl/Cmd+K handler fires whatever the event target is.
    const firewalled = ['keydown', 'pointerdown', 'dragover', 'drop', 'beforeunload'] as const;
    // A drag is the one case where stopping the handler is not enough to contain it. The media
    // library's window dragover handler is what makes this document a valid drop target, and its
    // own preventDefault is what makes it one; stopping that handler and leaving the default action
    // in place means the browser navigates to the dropped file, replacing the picture with a raw
    // image. So the firewall takes over the cancellation for those two types, and only those two:
    // cancelling keydown would take away Tab and space-scroll, and cancelling beforeunload IS the
    // unload prompt, which is the thing suppressing beforeunload exists to avoid.
    const cancelled = new Set<string>(['dragover', 'drop']);
    const stopEvent = (event: Event) => {
      event.stopImmediatePropagation();
      if (cancelled.has(event.type)) event.preventDefault();
    };
    for (const type of firewalled) window.addEventListener(type, stopEvent, true);

    release = () => {
      document.removeEventListener('focusin', containFocus, true);
      for (const type of firewalled) window.removeEventListener(type, stopEvent, true);
    };
    onDestroy(release);
  }

  /**
   * Everything this instance takes from the story it was created to mount, resolved once here:
   * the story's own context entries applied, the media base and CSRF getter every mounted story
   * gets, the id its one-story invariant is checked against, its manifest entry, and its shell
   * payload. One call, so the containment listeners have one failure path to be released on.
   */
  function resolveMount() {
    try {
      // Context application runs once, during initialization: setContext must be called while this
      // component is being created, so the story's own value (read once here, since a story does not
      // change identity across ReproContext's lifetime) is enough. untrack makes that one-time read
      // explicit rather than leaving it a warned-about accident of reading a prop outside a tracking
      // context.
      const storyContext = untrack(() => story.context);
      if (storyContext) {
        for (const key of Reflect.ownKeys(storyContext)) {
          setContext(key, storyContext[key]);
        }
      }

      // Resolved once, the same way theme is: a `mediaBase` prop change mid-lifetime is not a
      // thing this component supports (see the one-story-per-instance invariant below).
      const resolvedMediaBase = untrack(() => mediaBase) ?? DEFAULT_REPRO_MEDIA_BASE;

      // Unconditional: every mounted story's media surfaces resolve their base through this context
      // rather than the real admin's hardcoded default, and every mounted story's CSRF-reading form
      // gets a getter. A shell-hosted story's own CairnAdminShell instance sets a more specific CSRF
      // getter for its own descendants (from its fixture `data.csrf`), which simply shadows this one.
      setContext(MEDIA_BASE_CONTEXT_KEY, resolvedMediaBase);
      setContext(CSRF_CONTEXT_KEY, () => fixtureCsrf);

      // The id of the story this instance was created to mount, read once and never again:
      // everything this function resolves (the context above, the manifest entry, the shell payload)
      // is resolved for THIS story only. The guard effect below is what makes that an enforced
      // invariant rather than an assumption a caller could quietly violate by swapping the `story`
      // prop in place.
      const mountedStoryId = untrack(() => story.id);

      const manifestEntry = untrack(() => manifest.find((entry) => entry.id === story.id));

      // The shell payload every `host: 'shell'` story mounts against: one signed-in editor, the
      // worked navLayout example, the office default pathname, a resolved-null pending set, and
      // `story.shellData`'s fields laid over that default. `data.theme` is the SSR seed
      // CairnAdminShell reads untracked; `themeOverride` is what actually drives the render, so this
      // field's own value never shows through.
      //
      // The merge is read once, non-reactively (the same `untrack` precedent this field used for the
      // pathname before `shellData` existed), and the whole object below is computed exactly once
      // during initialization rather than derived: CairnAdminShell runs its own `$effect` that reads
      // `shell?.pathname` off this `data` prop and closes the posed publish dialog on any change to it
      // (sweep finding 9). A `$derived` here would re-run that effect on every one of ReproContext's
      // own reactive updates (a theme flip, for instance) and silently undo `publish/pending-list`'s
      // pose the moment a capture read it.
      const shellOverride = untrack(() => story.shellData);
      const shellData: Extract<AdminShellData, { public: false }> = {
        public: false,
        siteName: fixtureSiteName,
        user: {
          displayName: fixtureEditor.displayName,
          email: fixtureEditor.email,
          role: fixtureEditor.role,
          capability: fixtureEditor.capability,
        },
        concepts: [{ id: fixtureConcept.id, label: fixtureConcept.label }],
        nav: fixtureNavLayout,
        pathname: `/admin/${fixtureConcept.id}`,
        theme: 'cairn-admin',
        collapsedNav: null,
        csrf: fixtureCsrf,
        pendingEntries: Promise.resolve(null),
        attention: {},
        // The same resolved value the setContext call above already hands every mounted story
        // directly: CairnAdminShell now sets its own MEDIA_BASE_CONTEXT_KEY from this field too
        // (shadowing the one above for its own descendants, the way its CSRF getter already does),
        // so this keeps that shadow carrying the identical value rather than reverting to /media.
        mediaBase: resolvedMediaBase,
        ...definedOnly(shellOverride),
      };

      return { mountedStoryId, manifestEntry, shellData };
    } catch (error) {
      // The containment listeners above are live from the instance body, while their onDestroy
      // teardown is not: Svelte compiles onDestroy to a mount effect whose return value is the
      // cleanup, so nothing can remove them until effects flush. A throw in that window (a story
      // whose own init fails, a fixture that does not resolve) aborts the mount with the focus
      // firewall and five window capture listeners installed and no handle left on them, which
      // costs the document its keyboard, pointer, and drag handling for the rest of its life.
      // Release them, then rethrow: swallowing the error would hide the defect that caused it.
      release?.();
      throw error;
    }
  }

  const { mountedStoryId, manifestEntry, shellData } = resolveMount();

  // One ReproContext instance mounts exactly one story for its lifetime; every read `resolveMount`
  // makes, including the untracked shell payload, is only correct under that invariant. A consumer that
  // reuses one instance across a story change (SvelteKit reusing a `/repro/[id]` page component
  // across a param change, for instance) would otherwise silently keep the previous story's
  // context, manifest entry, and shell payload while swapping in the new story's component. Throw
  // loudly instead of drifting: the fix at the call site is `{#key story.id}` around the mount.
  $effect(() => {
    if (story.id !== mountedStoryId) {
      throw new Error(
        `ReproContext mounted story "${mountedStoryId}", but its story prop changed to ` +
          `"${story.id}". One ReproContext instance mounts exactly one story for its lifetime; ` +
          'wrap the mount in {#key story.id} to remount instead of swapping the story in place.',
      );
    }
  });

  /**
   * `props` with the resolved theme merged into its `data` field, for a `bare` story that owns its
   * theme root. Returns `props` unchanged when there is no `data` object to merge it into.
   */
  function withTheme(props: Record<string, unknown>, resolvedTheme: 'cairn-admin' | 'cairn-admin-dark') {
    const data = props.data;
    if (typeof data !== 'object' || data === null) return props;
    return { ...props, data: { ...data, theme: resolvedTheme } };
  }

  /**
   * Drops every explicitly-`undefined`-valued key from a partial override before it is spread over
   * a default object. A bare `{ ...overrides }` spread type-checks fine against a `Partial` and
   * still overwrites the default with `undefined` for any key the caller mentions but leaves
   * unset, which reads at the call site as "no opinion" and behaves as "erase this field".
   */
  function definedOnly<T extends object>(overrides: T | undefined): Partial<T> {
    if (!overrides) return {};
    const result: Partial<T> = {};
    for (const key of Object.keys(overrides) as (keyof T)[]) {
      const value = overrides[key];
      if (value !== undefined) result[key] = value;
    }
    return result;
  }

  // One resolution for all three host branches below. Resolving here rather than per branch is what
  // keeps a page that carries both kinds of story from rendering half of them light and half dark:
  // an undefined override handed to CairnAdminShell falls through to the shell's own resolution,
  // which reads the theme cookie on the docs origin and then prefers-color-scheme, while a bare
  // story would have taken the light fallback. Passing the resolved value suppresses both reads,
  // which is what this prop is for.
  const resolvedTheme = $derived(theme ?? 'cairn-admin');

  // Whether the mounted component resolves a theme root itself: the shell for a `shell` story, the
  // two auth pages' own wrappers for a `bare` one. A story with no manifest entry (a test probe) is
  // treated as owning none, which is the case that needs the wrapper below. A plain `const`, not
  // `$derived`: `manifestEntry` is itself resolved once at init from the mounted story's id, so
  // marking this reactive would misstate a value that never actually recomputes.
  const ownThemeRoot = manifestEntry?.ownThemeRoot ?? false;

  const bareProps = $derived(
    story.host === 'bare' && ownThemeRoot ? withTheme(story.props, resolvedTheme) : story.props,
  );
</script>

<!-- The containment wrapper every host branch below renders inside. It carries `inert`, which
     reaches every flat-tree descendant regardless of layout, and the attribute the focus firewall
     above scopes itself by. Deliberately not `[data-repro-root]`: that is the consuming route's own
     theme-flip hook, it sits outside this wrapper, and it must keep working. -->
<div data-cairn-picture inert>
{#if story.host === 'shell'}
  <CairnAdminShell data={shellData} themeOverride={resolvedTheme}>
    <story.component bind:this={mount.instance} {...story.props} />
  </CairnAdminShell>
{:else if ownThemeRoot}
  <story.component bind:this={mount.instance} {...bareProps} />
{:else}
  <!-- The theme root a bare story does not carry itself. Every admin token is scoped under
       [data-theme='cairn-admin'], so without this the stylesheet above loads and the story takes
       none of it. Bare wrapper, no classes: the admin's scoped rules are descendant selectors, so a
       class on the theme element itself would never match. It follows the prop rather than
       resolving a theme of its own, since a host that flips [data-repro-root] outside this wrapper
       feeds the new value straight back down through it.
       The child paints the surface, which the theme root itself does not: cairn-admin.css declares
       no background-color and no color on either theme root, so a bare story would otherwise render
       the host document's ink over the host's background. Every other theme root in the engine
       pairs the bare wrapper with the same surface child (CairnAdminShell, LoginPage, ConfirmPage);
       this is that pairing for a story that brings no root of its own. -->
  <div data-theme={resolvedTheme}>
    <div class="bg-base-200 text-base-content">
      <story.component bind:this={mount.instance} {...bareProps} />
    </div>
  </div>
{/if}
</div>

<style>
  /* The wrapper must generate no box. Two of the three branches above (a `shell` story and the two
     auth pages) render with no wrapper of their own, so a block here would insert a layout box the
     real admin does not have, and the mounted story would no longer be the flex or grid item its
     host gave it. `inert` is not layout-dependent, so it still applies to every flat-tree
     descendant. Scoped here rather than in cairn-admin.css, which ships to consumer sites and must
     not carry a reproduction-only rule. */
  [data-cairn-picture] {
    display: contents;
  }
</style>
