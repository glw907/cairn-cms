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
-->
<script lang="ts">
  import { setContext, untrack } from 'svelte';
  import CairnAdminShell from '../components/CairnAdminShell.svelte';
  import { MEDIA_BASE_CONTEXT_KEY } from '../components/media-base-context.js';
  import { CSRF_CONTEXT_KEY } from '../components/csrf-context.js';
  import type { AdminShellData } from '../sveltekit/content-routes-core.js';
  import { fixtureConcept, fixtureCsrf, fixtureEditor, fixtureNavLayout, fixtureSiteName } from './fixtures.js';
  import { fixtureMediaBase, manifest } from './manifest.js';
  import type { ReproStory } from './index.js';
  import '../components/cairn-admin.css';

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
  }

  let { story, theme }: Props = $props();

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

  // Unconditional: every mounted story's media surfaces resolve their base through this context
  // rather than the real admin's hardcoded default, and every mounted story's CSRF-reading form
  // gets a getter. A shell-hosted story's own CairnAdminShell instance sets a more specific CSRF
  // getter for its own descendants (from its fixture `data.csrf`), which simply shadows this one.
  setContext(MEDIA_BASE_CONTEXT_KEY, fixtureMediaBase);
  setContext(CSRF_CONTEXT_KEY, () => fixtureCsrf);

  const manifestEntry = manifest.find((entry) => entry.id === story.id);

  /**
   * `props` with the resolved theme merged into its `data` field, for a `bare` story that owns its
   * theme root. Returns `props` unchanged when there is no `data` object to merge it into.
   */
  function withTheme(props: Record<string, unknown>, resolvedTheme: 'cairn-admin' | 'cairn-admin-dark') {
    const data = props.data;
    if (typeof data !== 'object' || data === null) return props;
    return { ...props, data: { ...data, theme: resolvedTheme } };
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
  // treated as owning none, which is the case that needs the wrapper below.
  const ownThemeRoot = $derived(manifestEntry?.ownThemeRoot ?? false);

  const bareProps = $derived(
    story.host === 'bare' && ownThemeRoot ? withTheme(story.props, resolvedTheme) : story.props,
  );

  // The shell payload every `host: 'shell'` story mounts against: one signed-in editor, the
  // worked navLayout example, a resolved (already-Promise) pending set. `data.theme` is the SSR
  // seed CairnAdminShell reads untracked; `themeOverride` is what actually drives the render, so
  // this field's own value never shows through.
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
    // The office default: a list, roster, or library screen sits at /admin/<concept>. A story that
    // mounts an open document overrides it with the desk pathname, since the shell reads the path
    // (not its child) to decide desk versus office chrome. Read once with the story's context, for
    // the same reason: a story does not change identity across this component's lifetime.
    pathname: untrack(() => story.shellPathname) ?? `/admin/${fixtureConcept.id}`,
    theme: 'cairn-admin',
    collapsedNav: null,
    csrf: fixtureCsrf,
    pendingEntries: Promise.resolve(null),
    attention: {},
  };
</script>

{#if story.host === 'shell'}
  <CairnAdminShell data={shellData} themeOverride={resolvedTheme}>
    <story.component {...story.props} />
  </CairnAdminShell>
{:else if ownThemeRoot}
  <story.component {...bareProps} />
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
      <story.component {...bareProps} />
    </div>
  </div>
{/if}
