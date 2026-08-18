<!--
@component
The one mounting wrapper both a docs route and the engine's own story-mount test render a
reproduction story through, so the two consumers can never disagree about what a story needs to
render correctly. It applies the story's own `context` entries, supplies the fixture media base
and a CSRF-token getter every media surface reads (so no call site injects either itself), hosts
`shell` stories inside `CairnAdminShell` with the fixture `navLayout`, and carries the admin
stylesheet unconditionally so a `bare` story renders styled wherever it mounts.
-->
<script lang="ts">
  import { setContext, untrack } from 'svelte';
  import CairnAdminShell from '../components/CairnAdminShell.svelte';
  import { MEDIA_BASE_CONTEXT_KEY } from '../components/media-base-context.js';
  import { CSRF_CONTEXT_KEY } from '../components/csrf-context.js';
  import type { AdminShellData } from '../sveltekit/content-routes-core.js';
  import { fixtureConcept, fixtureEditor, fixtureNavLayout } from './fixtures.js';
  import { fixtureMediaBase, manifest } from './manifest.js';
  import type { ReproStory } from './index.js';
  import '../components/cairn-admin.css';

  /** The fixture CSRF token every mounted story's forms and media surfaces see. */
  const FIXTURE_CSRF_TOKEN = 'repro-fixture-csrf';

  interface Props {
    /** The story to mount. */
    story: ReproStory;
    /**
     * The admin theme the mounting page owns. Routed to `CairnAdminShell`'s `themeOverride` for a
     * `shell` host (every `shell` entry is `ownThemeRoot: true` in `manifest.ts`, since the shell
     * resolves its own theme root); merged into the story's own `data.theme` for a `bare` host
     * whose manifest entry is also `ownThemeRoot: true` (the two auth pages, which render their
     * wrapper from `data.theme`). Absent for every other `bare` story, which inherits the ambient
     * `[data-repro-root]` theme instead and needs nothing from this prop.
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
  setContext(CSRF_CONTEXT_KEY, () => FIXTURE_CSRF_TOKEN);

  const manifestEntry = manifest.find((entry) => entry.id === story.id);

  /**
   * `props` with `theme` merged into its `data` field, for a `bare` story that owns its theme
   * root. Returns `props` unchanged when there is nothing to merge (no override, or no `data`
   * object to merge it into).
   */
  function withTheme(props: Record<string, unknown>, override: 'cairn-admin' | 'cairn-admin-dark' | undefined) {
    if (override === undefined) return props;
    const data = props.data;
    if (typeof data !== 'object' || data === null) return props;
    return { ...props, data: { ...data, theme: override } };
  }

  const bareProps = $derived(
    story.host === 'bare' && manifestEntry?.ownThemeRoot ? withTheme(story.props, theme) : story.props,
  );

  // The shell payload every `host: 'shell'` story mounts against: one signed-in editor, the
  // worked navLayout example, a resolved (already-Promise) pending set. `data.theme` is the SSR
  // seed CairnAdminShell reads untracked; `themeOverride` is what actually drives the render, so
  // this field's own value never shows through.
  const shellData: Extract<AdminShellData, { public: false }> = {
    public: false,
    siteName: 'Reproduction fixtures',
    user: {
      displayName: fixtureEditor.displayName,
      email: fixtureEditor.email,
      role: fixtureEditor.role,
      capability: fixtureEditor.capability,
    },
    concepts: [{ id: fixtureConcept.id, label: fixtureConcept.label }],
    nav: fixtureNavLayout,
    pathname: '/admin/posts',
    theme: 'cairn-admin',
    collapsedNav: null,
    csrf: FIXTURE_CSRF_TOKEN,
    pendingEntries: Promise.resolve(null),
    attention: {},
  };
</script>

{#if story.host === 'shell'}
  <CairnAdminShell data={shellData} themeOverride={theme}>
    <story.component {...story.props} />
  </CairnAdminShell>
{:else}
  <story.component {...bareProps} />
{/if}
