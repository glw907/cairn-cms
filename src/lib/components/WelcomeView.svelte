<!--
@component
The welcome view: the calm, minimal signed-in screen a none-capability role with no declared
`home` lands on at the admin root (spec section 4, the "none contract"). It renders inside
`CairnAdminShell` like any other view, so it carries no `data-theme` wrapper and imports no CSS; the
name, the role, and the sign-out control already live in the shell's own sidebar footer. This screen
adds only what the shell does not already say: a greeting and one calm line naming the account's
current standing, in the same empty-state idiom as `ConceptList`'s first-run state, with no create
action since there is nothing here to create.
-->
<script lang="ts">
  import CairnLogo from './CairnLogo.svelte';
  import type { WelcomeData } from '../sveltekit/content-routes.js';

  let { data }: { data: WelcomeData } = $props();
</script>

<div class="flex min-h-[56vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
  <CairnLogo class="h-12 w-12 text-primary opacity-30" />
  <div class="space-y-1">
    <p class="font-semibold text-base-content">Welcome, {data.displayName}</p>
    <p class="text-sm text-balance text-muted">
      There's no content here for this account to manage. If that's unexpected, check with whoever
      administers {data.siteName}.
    </p>
  </div>
</div>
