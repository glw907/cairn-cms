<!--
@component
The welcome view: the calm, minimal signed-in screen a none-capability role with no declared
`home` lands on at the admin root (spec section 4, the "none contract"). It renders inside
`CairnAdminShell` like any other view, so it carries no `data-theme` wrapper and imports no CSS; the
name, the role, and the sign-out control already live in the shell's own sidebar footer. This screen
adds only what the shell does not already say: a greeting and one calm line naming the account's
current standing, on the admin toolkit's `EmptyState` (the admin-toolkit organization pass's T7
adoption sweep, the recipe this screen itself originated per the pass's adoption map), with no
action since there is nothing here to create. This screen renders no `PageHeader` of its own, so
it passes `headingLevel="h1"`: the greeting is the page's only heading.
-->
<script lang="ts">
  import type { WelcomeData } from '../sveltekit/content-routes.js';
  import { EmptyState } from '../admin-toolkit/index.js';

  let { data }: { data: WelcomeData } = $props();
</script>

<EmptyState
  heading={`Welcome, ${data.displayName}`}
  headingLevel="h1"
  message={`There's no content here for this account to manage. If that's unexpected, check with whoever administers ${data.siteName}.`}
/>
