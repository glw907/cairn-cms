<!-- @component
A rounded call-to-action panel, styled after `src/components/blocks/CTA/BasicDark.astro` and
`BasicLight.astro` (oxygenna-themes/foxi-astro-theme, MIT): a headline, a short line, and a
button, over either a gradient-tinted dark card with a trust badge (`variant: 'dark'`, the
default) or a plain light card with a 5-star rating row (`variant: 'light'`, used by the
changelog's closing CTA, the one page that carries no Product Hunt badge upstream either).
Expressed with the chassis's own `.cairn-cta-*` tokens (the same pair the engine's built-in CTA
prose device reads), so this port's marketing banner and any future in-content CTA directive
share one color contract.
-->
<script lang="ts">
  interface Props {
    title: string;
    text: string;
    badge?: string;
    variant?: 'dark' | 'light';
    ratingText?: string;
    buttonLabel: string;
    buttonHref: string;
  }
  let { title, text, badge, variant = 'dark', ratingText, buttonLabel, buttonHref }: Props = $props();
</script>

{#if variant === 'light'}
  <div class="cairn-card mx-auto max-w-4xl bg-base-200 p-l text-center">
    <h2 class="mb-2xs text-step-3 font-bold text-base-content">{title}</h2>
    <p class="mx-auto mb-s max-w-measure text-step-0 text-muted">{text}</p>
    {#if ratingText}
      <p class="mb-s flex items-center justify-center gap-2 text-step--1 text-muted">
        <span class="flex text-warning" aria-hidden="true">
          {#each Array(5) as _, i (i)}
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.3l-5.8 3.2 1.1-6.5-4.8-4.6 6.6-.9Z" />
            </svg>
          {/each}
        </span>
        {ratingText}
      </p>
    {/if}
    <a
      href={buttonHref}
      class="inline-flex h-12 items-center justify-center rounded-field bg-primary px-6 text-step-0 font-bold text-primary-content no-underline hover:opacity-90"
    >
      {buttonLabel}
    </a>
  </div>
{:else}
  <div
    class="cairn-card mx-auto max-w-4xl bg-[var(--cairn-cta-bg)] p-l text-center text-[var(--cairn-cta-content)] shadow-[var(--cairn-shadow)]"
  >
    <h2 class="mb-2xs text-step-3 font-bold">{title}</h2>
    <p class="mx-auto mb-s max-w-measure text-step-0 opacity-80">{text}</p>
    {#if badge}
      <p class="mb-s inline-flex items-center gap-2 rounded-field bg-black/20 px-3 py-1 text-step--1">
        🏆 {badge}
      </p>
    {/if}
    <div>
      <a
        href={buttonHref}
        class="inline-flex h-12 items-center justify-center rounded-field bg-[var(--cairn-cta-btn-bg)] px-6 text-step-0 font-bold text-[var(--cairn-cta-btn-content)] no-underline hover:opacity-90"
      >
        {buttonLabel}
      </a>
    </div>
  </div>
{/if}
