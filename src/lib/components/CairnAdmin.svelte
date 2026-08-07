<!--
@component
The single-mount admin page. A site's catch-all `/admin/[...path]` route renders this one
component for every admin view, feeding it the discriminated `AdminData` from `createCairnAdmin`'s
load. It is a pure switcher on `data.view`: every view renders bare, since the shared chrome now
rides the `/admin/+layout.svelte` shell (CairnAdminShell), not this component. The edit view reads
its `siteName` from the shell payload on `page.data.shell`. No styling or wrapper elements of its own.
-->
<script lang="ts">
  import { page } from '$app/state';
  import type { AdminShellData } from '../sveltekit/content-routes.js';
  import LoginPage from './LoginPage.svelte';
  import ConfirmPage from './ConfirmPage.svelte';
  import ConceptList from './ConceptList.svelte';
  import EditPage from './EditPage.svelte';
  import CairnHistory from './CairnHistory.svelte';
  import ManageEditors from './ManageEditors.svelte';
  import NavTree from './NavTree.svelte';
  import CairnMediaLibrary from './CairnMediaLibrary.svelte';
  import CairnTidySettings from './CairnTidySettings.svelte';
  import VocabularyAdmin from './VocabularyAdmin.svelte';
  import HelpHome from './HelpHome.svelte';
  import WelcomeView from './WelcomeView.svelte';
  import type { AdminData } from '../sveltekit/cairn-admin.js';
  import type { ContentFormFailure } from '../sveltekit/content-routes.js';
  import type { RevertFailure } from '../sveltekit/types.js';
  import type { ComponentRegistry } from '../render/registry.js';
  import type { IconSet } from '../render/glyph.js';
  import type { SiteRender } from '../content/types.js';

  interface Props {
    /** The discriminated view data from `createCairnAdmin`'s load. */
    data: AdminData;
    /** The last action's result, forwarded to whichever view rendered: the shared content-action
     *  failure family (every failure carries `error`), merged with the auth and editors results,
     *  so the route's one `form` export covers every view. `RevertFailure`'s own fields fold into
     *  the same merged bag, composed the same way `ContentFormFailure` itself Partial-merges every
     *  other action's failure fields, so a real `?/revert` refusal type-carries through this one
     *  prop; the history view narrows it back to the strict disjoint shape at the point it mounts
     *  `CairnHistory` below. */
    form?:
      | (ContentFormFailure & {
          sent?: boolean;
          status?: 'sent' | 'send_error' | 'throttled';
          ok?: boolean;
          reason?: RevertFailure['reason'];
          draftEditor?: string;
          draftStartedAt?: string;
        })
      | null;
    /** The site's design-accurate render pipeline, for the edit view's preview pane. */
    render?: SiteRender;
    /** The site's component registry, for the edit view's insert palette. */
    registry?: ComponentRegistry;
    /** The site's icon set, for the edit view's guided form fields. */
    icons?: IconSet;
    /** Whether the edit view's Share preview group renders (spec part 3, "Public preview for a
     *  non-editor"); forwarded to `EditPage`. Defaults to `true` there when left unset. */
    previewMint?: boolean;
  }

  let { data, form = null, render, registry, icons, previewMint }: Props = $props();

  // The SSR-resolved admin theme the auth views (login, confirm) render under. It rides the shell
  // payload (page.data.shell), a public member on every auth route: the theme cookie carries no
  // auth, so it resolves before sign-in the same way EditPage's siteName resolves after.
  // Optional-chained, since a test render may leave page.data bare.
  const publicTheme = $derived(
    (page.data.shell as (AdminShellData & { public: true }) | undefined)?.theme,
  );
</script>

{#if data.view === 'login'}
  <LoginPage data={{ ...data.page, theme: publicTheme }} {form} />
{:else if data.view === 'confirm'}
  <ConfirmPage data={{ ...data.page, theme: publicTheme }} {form} />
{:else if data.view === 'list'}
  <!-- The single mount reuses this component across /admin/posts -> /admin/pages, so the
       concept id keys the list: crossing concepts remounts it and drops the old query,
       sort, page, and dialog state. -->
  {#key data.page.conceptId}
    <ConceptList data={data.page} {form} />
  {/key}
{:else if data.view === 'edit'}
  <!-- siteName rides the shell payload (page.data.shell), an authed member at every edit route. -->
  <EditPage
    data={{ ...data.page, siteName: (page.data.shell as AdminShellData & { public: false }).siteName }}
    {render}
    {registry}
    {icons}
    {form}
    {previewMint}
  />
{:else if data.view === 'history'}
  <!-- Only revertAction's own wrapped result (a RevertFailure refusal, or viewAction's generic
       { error } catch-all) ever posts to this view, so the broader merged form union narrows
       here: template narrowing on data.view does not reduce it for us. -->
  <CairnHistory data={data.page} form={form as RevertFailure | { error: string } | null | undefined} />
{:else if data.view === 'editors'}
  <ManageEditors data={data.page} {form} />
{:else if data.view === 'nav'}
  <NavTree data={data.page} {form} />
{:else if data.view === 'media'}
  <CairnMediaLibrary data={data.page} {form} />
{:else if data.view === 'settings'}
  <CairnTidySettings data={data.page} {form} />
{:else if data.view === 'vocabulary'}
  <VocabularyAdmin data={data.page} {form} />
{:else if data.view === 'help'}
  <HelpHome data={data.page} />
{:else if data.view === 'welcome'}
  <WelcomeView data={data.page} />
{/if}
