<!--
@component
Test harness: mounts EditPage the way CairnAdmin does, joined to a topbar through the same context
portal CairnAdminShell uses. EditPage registers its desk snippet into the shared holder; this harness
renders that snippet inside a stand-in band, so a single render tree carries both the document body
and the band controls (Save, Publish, the status badge, the overflow) the way the running admin
does. The band is a plain wrapper, not the shell's full chrome, to keep the component tests fast
and focused on EditPage's own behavior. The drawer-toggle and theme-toggle stand-ins on either side
of the desk snippet mirror CairnAdminShell's real desk-route navbar siblings (same classes, so the
compiled admin sheet gives them production width) so a width-driven collision between the desk
snippet's own content and its real neighbors reproduces here, not just in the running shell. Below
sm the band mirrors CairnAdminShell's desk-route ruling to 48px (max-sm:h-12/min-h-12); EditPage is
always a desk route, so the harness applies it unconditionally rather than gating on isDeskRoute.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import { provideTopbar, type TopbarHolder } from '../../lib/components/topbar-context.js';
  import EditPage from '../../lib/components/EditPage.svelte';

  let props: ComponentProps<typeof EditPage> = $props();

  // theme/toggleTheme are mirrored the way CairnAdminShell mirrors them, so a test can exercise
  // EditPage's narrow-width fold of the standalone control (the desk band collision fix).
  let holder = $state<TopbarHolder>({
    desk: null,
    zen: false,
    theme: 'cairn-admin',
    toggleTheme: () => {
      holder.theme = holder.theme === 'cairn-admin' ? 'cairn-admin-dark' : 'cairn-admin';
    },
  });
  provideTopbar(holder);
</script>

<!-- Mirror the shell's zen lever: the whole band element drops when the document registers zen,
     so a zen test sees the band gone (not merely emptied), the way the running admin does. -->
{#if !holder.zen}
<div
  data-testid="cairn-band"
  class="navbar bg-base-100 border-b border-[var(--cairn-card-border)] h-16 min-h-16 gap-2 px-4 py-0 lg:px-8 max-sm:px-2 max-sm:h-12 max-sm:min-h-12"
>
  <span data-testid="drawer-toggle-stub" class="btn btn-square btn-ghost flex-none xl:hidden" aria-hidden="true"></span>
  {@render holder.desk?.()}
  <span data-testid="theme-toggle-stub" class="btn btn-square btn-ghost flex-none max-sm:hidden" aria-hidden="true"></span>
</div>
{/if}
<main>
  <EditPage {...props} />
</main>
