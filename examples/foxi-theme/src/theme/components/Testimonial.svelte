<!-- @component
A full-bleed dark testimonial band, styled after `src/components/blocks/testimonials/BasicDark.astro`
(oxygenna-themes/foxi-astro-theme, MIT): a large quote over an attribution, on a dark portrait-tinted
background. Expressed with the chassis's `.cairn-band` recipe for the full-bleed strip, overridden
locally to the neutral (dark) role instead of the recipe's default `base-200` fill, one of the
documented per-instance override seams (composition.css's own `--cairn-band-bg` custom property).
-->
<script lang="ts">
  interface Props {
    quote: string;
    name: string;
    role: string;
  }
  let { quote, name, role }: Props = $props();
</script>

<section class="cairn-band" style="--cairn-band-bg: var(--color-neutral);">
  <div class="site-wide">
    <blockquote class="mx-auto max-w-3xl text-center text-neutral-content">
      <p class="m-0 text-step-3 font-semibold leading-snug">&#8220;{quote}&#8221;</p>
      <footer class="mt-m text-step--1 font-medium uppercase tracking-eyebrow text-neutral-content/70">
        {name}, {role}
      </footer>
    </blockquote>
  </div>
</section>
