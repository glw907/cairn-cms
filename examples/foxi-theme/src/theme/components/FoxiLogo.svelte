<!-- @component
Foxi's own faceted fox-head brand mark, reproduced verbatim from `public/logo.svg`
(oxygenna-themes/foxi-astro-theme, MIT): this is the theme's own bundled vector artwork, the
same licensing basis `NotFoundIllustration.svelte` already ports its 404 illustration under, not
a third-party trademark this port has no clearance to trace. Its four-tone pink facets are the
brand's own fixed palette (not a chassis token), the same way a real site keeps its logo's colors
constant across light and dark mode.
-->
<script lang="ts">
  interface Props {
    class?: string;
  }
  let { class: className = 'h-[45px] w-[45px]' }: Props = $props();
</script>

<svg class={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M4.11835 27.4639L7.63915 11.491L23.9881 48L4.11835 27.4639Z"
    fill="#EC4899"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M43.8579 27.4639L40.3608 11.491L23.9881 48L43.8579 27.4639Z"
    fill="#EC4899"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M7.63946 11.491L4.11863 0L17.3178 11.491H7.63946Z"
    fill="#EC4899"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M40.3608 11.491L43.8817 0L30.6825 11.491H40.3608Z"
    fill="#EC4899"
  />
  <path d="M23.9881 48L7.63915 11.491H24H40.3608L23.9881 48Z" fill="#EC4899" />
  <path d="M27.5876 39.9735H20.394L23.9882 48.0002L27.5876 39.9735Z" fill="#9D174D" />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M4.11835 27.464L7.63915 11.4911L23.9881 48.0001L4.11835 27.464Z"
    fill="#BE185D"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M43.8579 27.464L40.3608 11.4911L23.9881 48.0001L43.8579 27.464Z"
    fill="#BE185D"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M7.63941 11.491L4.11859 0L17.3177 11.491H7.63941Z"
    fill="#DB2777"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M40.3608 11.491L43.8817 0L30.6825 11.491H40.3608Z"
    fill="#DB2777"
  />
</svg>
