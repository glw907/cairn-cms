<!-- @component
A full-bleed dark testimonial band, styled after `src/components/blocks/testimonials/BasicDark.astro`
(oxygenna-themes/foxi-astro-theme, MIT): a large quote over an attribution, over a gradient-tinted
dark background with a big decorative quote glyph and a plain portrait silhouette (this port draws
an original silhouette rather than reproducing Foxi's own portrait photography, which this port has
no clearance to redistribute). Expressed with the chassis's `.cairn-band` recipe for the full-bleed
strip, overridden locally to the neutral (dark) role instead of the recipe's default `base-200` fill,
one of the documented per-instance override seams (composition.css's own `--cairn-band-bg` custom
property).
-->
<script lang="ts">
  interface Props {
    quote: string;
    name: string;
    role: string;
  }
  let { quote, name, role }: Props = $props();
</script>

<section
  class="cairn-band relative overflow-hidden"
  style="--cairn-band-bg: var(--color-neutral); background-image: radial-gradient(ellipse at top right, color-mix(in oklch, var(--color-primary) 35%, transparent), transparent 60%);"
>
  <svg class="pointer-events-none absolute -right-8 -top-8 h-48 w-48 text-primary/20 lg:h-64 lg:w-64" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9.5 6C6 6 3 9 3 13c0 3 2 5 4.5 5S12 16 12 13c0-2-1.2-3.6-3-4.2C9.3 8 10 6.8 11.5 6.2 12 6 11.5 6 9.5 6Zm10 0c-3.5 0-6.5 3-6.5 7 0 3 2 5 4.5 5S22 16 22 13c0-2-1.2-3.6-3-4.2C19.3 8 20 6.8 21.5 6.2 22 6 21.5 6 19.5 6Z" />
  </svg>
  <div class="site-wide relative">
    <blockquote class="mx-auto max-w-3xl text-center text-neutral-content">
      <p class="m-0 text-step-3 font-semibold leading-snug">&#8220;{quote}&#8221;</p>
      <footer class="mt-m flex items-center justify-center gap-2xs text-step--1 font-medium uppercase tracking-eyebrow text-neutral-content/70">
        <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/30 text-neutral-content" aria-hidden="true">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke-linecap="round" />
          </svg>
        </span>
        {name}, {role}
      </footer>
    </blockquote>
  </div>
</section>
