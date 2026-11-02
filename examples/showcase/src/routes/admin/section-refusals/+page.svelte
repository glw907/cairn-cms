<!-- @component The section-refusals fixture screen: an owner-only, no-nav proof of the copy a
     createSectionAction refusal shows. Each form posts natively to its own action and the shared
     live region renders `form.error`; the `forged` form omits CsrfField on purpose. -->
<script lang="ts">
  import { CsrfField } from '@glw907/cairn-cms/admin';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  const probes = [
    { name: 'allowed', label: 'Allowed', csrf: true },
    { name: 'unbound', label: 'Unbound', csrf: true },
    { name: 'unmapped', label: 'Unmapped', csrf: true },
    { name: 'limited', label: 'Limited', csrf: true },
    { name: 'forged', label: 'Forged', csrf: false },
  ];
</script>

<svelte:head>
  <title>Section refusals</title>
</svelte:head>

<div class="max-w-3xl mx-auto card-shell p-6">
  <h1 class="type-title font-[550]">Section refusals</h1>

  <p role="status" aria-live="polite" class="type-body my-4" data-testid="sr-outcome">
    {#if form?.error}
      {form.error}
    {:else if form?.ok}
      Allowed.
    {/if}
  </p>

  <div class="flex flex-wrap gap-group">
    {#each probes as probe (probe.name)}
      <form method="POST" action={`?/${probe.name}`}>
        {#if probe.csrf}<CsrfField />{/if}
        <button class="btn btn-sm">{probe.label}</button>
      </form>
    {/each}
  </div>
</div>
