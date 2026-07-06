<!-- @component
A dark, rounded call-to-action panel, styled after `src/components/blocks/CTA/BasicDark.astro`
(oxygenna-themes/foxi-astro-theme, MIT): a headline, a short line, an optional trust badge, and
a button, on a gradient-tinted dark card. Expressed with the chassis's own `.cairn-cta-*` tokens
(the same pair the engine's built-in CTA prose device reads), so this port's marketing banner and
any future in-content CTA directive share one color contract.
-->
<script lang="ts">
  interface Props {
    title: string;
    text: string;
    badge?: string;
    buttonLabel: string;
    buttonHref: string;
  }
  let { title, text, badge, buttonLabel, buttonHref }: Props = $props();
</script>

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
