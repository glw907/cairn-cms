<!--
@component
The single-mount admin page. A site's catch-all `/admin/[...path]` route renders this one
component for every admin view, feeding it the discriminated `AdminData` from `createCairnAdmin`'s
load. It is a pure switcher on `data.view`: every view renders bare, since the shared chrome now
rides the `/admin/+layout.svelte` shell (CairnAdminShell), not this component. The edit view reads
its `siteName` from the shell payload on `page.data.shell`. No styling or wrapper elements of its own.
@public
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
  import type { RevertOutcome } from '../sveltekit/types.js';
  import type { LoginRequestOutcome } from '../sveltekit/auth-routes.js';
  import type { CairnAdapter } from '../content/types.js';
  import { defineRegistry } from '../render/registry.js';

  interface Props {
    /** The discriminated view data from `createCairnAdmin`'s load. */
    data: AdminData;
    /** The last action's result, forwarded to whichever view rendered, so the route's one `form`
     *  export covers every view. `ContentFormFailure` is `Partial` here because this prop also
     *  carries results with no `error`: the auth and editors successes, and a `?/revert` refusal.
     *  Each view narrows it back to the shape it reads at the point it mounts below. */
    form?:
      | (Partial<ContentFormFailure> & {
          outcome?: 'sent' | 'send-error' | 'throttled' | RevertOutcome['outcome'];
          ok?: boolean;
          draftEditor?: string;
          draftLastSavedAt?: string;
        })
      | null;
    /**
     * The adapter's rendering block (`cairn.rendering`), for the edit view: `render` drives the
     *  preview pane, `blocks` the insert palette, and `icons` the guided form fields. One prop
     *  carries all three, so the palette cannot be dropped while the preview stays wired.
     */
    rendering?: CairnAdapter['rendering'];
    /** Whether the edit view's Share preview group renders; forwarded to `EditPage`. It only hides
     *  the group and leaves the preview actions mounted. Defaults to `true` there when left unset. Presentational
     *  only: see `EditPage`'s `previewMint`. */
    previewMint?: boolean;
  }

  let { data, form = null, rendering, previewMint }: Props = $props();

  // The edit view reads a registry; the adapter carries the plain block list.
  const registry = $derived(rendering?.blocks ? defineRegistry({ blocks: rendering.blocks }) : undefined);

  // The SSR-resolved admin theme the auth views (login, confirm) render under. It rides the shell
  // payload (page.data.shell), a public member on every auth route: the theme cookie carries no
  // auth, so it resolves before sign-in the same way EditPage's siteName resolves after.
  // Optional-chained, since a test render may leave page.data bare.
  const publicTheme = $derived(
    (page.data.shell as (AdminShellData & { public: true }) | undefined)?.theme,
  );
</script>

{#if data.view === 'login'}
  <!-- Only requestAction's wrapped result (a LoginRequestOutcome, or viewAction's generic
       { error } catch-all) ever posts to this view, so the broader merged form union narrows
       here: template narrowing on data.view does not reduce it for us. -->
  <LoginPage
    data={{ ...data.page, theme: publicTheme }}
    form={form as { outcome?: LoginRequestOutcome['outcome']; error?: string } | null}
  />
{:else if data.view === 'confirm'}
  <ConfirmPage data={{ ...data.page, theme: publicTheme }} {form} />
{:else if data.view === 'list'}
  <!-- The single mount reuses this component across /admin/posts -> /admin/pages, so the
       concept id keys the list: crossing concepts remounts it and drops the old query,
       sort, page, and dialog state. -->
  {#key data.page.conceptId}
    <ConceptList data={data.page} form={form as ContentFormFailure | null} />
  {/key}
{:else if data.view === 'edit'}
  <!-- siteName rides the shell payload (page.data.shell), an authed member at every edit route. -->
  <EditPage
    data={{ ...data.page, siteName: (page.data.shell as AdminShellData & { public: false }).siteName }}
    render={rendering?.render}
    {registry}
    icons={rendering?.icons}
    form={form as ContentFormFailure | null}
    {previewMint}
  />
{:else if data.view === 'history'}
  <!-- Only revertAction's wrapped result (a RevertOutcome refusal, or viewAction's generic
       { error } catch-all) ever posts to this view, so the broader merged form union narrows
       here: template narrowing on data.view does not reduce it for us. -->
  <CairnHistory data={data.page} form={form as RevertOutcome | { error: string } | null | undefined} />
{:else if data.view === 'editors'}
  <ManageEditors data={data.page} {form} />
{:else if data.view === 'nav'}
  <NavTree data={data.page} form={form as ContentFormFailure | null} />
{:else if data.view === 'media'}
  <CairnMediaLibrary data={data.page} form={form as ContentFormFailure | null} />
{:else if data.view === 'settings'}
  <CairnTidySettings data={data.page} form={form as ContentFormFailure | null} />
{:else if data.view === 'vocabulary'}
  <VocabularyAdmin data={data.page} form={form as ContentFormFailure | null} />
{:else if data.view === 'help'}
  <HelpHome data={data.page} />
{:else if data.view === 'welcome'}
  <WelcomeView data={data.page} />
{/if}
