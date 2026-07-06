<!-- @component
An abstract app-screenshot illustration: a generic dashboard's window chrome, sidebar, and one of
a few content variants (a calendar grid, a chart, a chat thread, or a stat-card row). Foxi's own
live demo fills these panels with real product photography; this port draws an original,
schematic stand-in instead; a reproduction of Foxi's own marketing photography is not something
this port has clearance to redistribute, and every one of this theme's "screenshot" panels
(the hero, the highlight rows, the blog covers, the changelog entries) reads as this same
family of illustration rather than an empty placeholder, which is the structural gap a fresh-context
visual review of this port flagged.
-->
<script lang="ts">
  interface Props {
    variant?: 'calendar' | 'chat' | 'chart' | 'stats' | 'kanban';
    class?: string;
  }
  let { variant = 'chart', class: className = '' }: Props = $props();
</script>

<svg viewBox="0 0 400 300" class="w-full h-auto {className}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect x="0" y="0" width="400" height="300" rx="12" class="fill-base-100" />
  <rect x="0" y="0" width="400" height="28" rx="12" class="fill-base-200" />
  <circle cx="18" cy="14" r="4" class="fill-primary/40" />
  <circle cx="32" cy="14" r="4" class="fill-base-300" />
  <circle cx="46" cy="14" r="4" class="fill-base-300" />

  {#if variant === 'calendar'}
    <rect x="16" y="44" width="368" height="20" rx="4" class="fill-base-200" />
    {#each Array(21) as _, i (i)}
      <rect x={16 + (i % 7) * 52} y={76 + Math.floor(i / 7) * 40} width="44" height="32" rx="4" class={i === 9 ? 'fill-primary/70' : 'fill-base-200'} />
    {/each}
  {:else if variant === 'chat'}
    <rect x="16" y="44" width="90" height="240" rx="8" class="fill-base-200" />
    {#each Array(5) as _, i (i)}
      <circle cx="40" cy={72 + i * 40} r="12" class="fill-primary/30" />
      <rect x="60" y={64 + i * 40} width="36" height="8" rx="4" class="fill-base-300" />
      <rect x="60" y={78 + i * 40} width="24" height="6" rx="3" class="fill-base-300" />
    {/each}
    <rect x="124" y="52" width="260" height="180" rx="8" class="fill-base-200" />
    <rect x="140" y="72" width="140" height="40" rx="8" class="fill-base-100" />
    <rect x="220" y="132" width="140" height="40" rx="8" class="fill-primary/60" />
    <rect x="140" y="192" width="100" height="24" rx="8" class="fill-base-100" />
  {:else if variant === 'stats'}
    {#each Array(3) as _, i (i)}
      <rect x={16 + i * 128} y="44" width="112" height="64" rx="8" class="fill-base-200" />
      <circle cx={44 + i * 128} cy="76" r="18" class="fill-none stroke-primary/60" stroke-width="6" />
    {/each}
    <rect x="16" y="124" width="368" height="152" rx="8" class="fill-base-200" />
    {#each Array(12) as _, i (i)}
      <rect x={32 + i * 29} y={260 - (i % 5) * 24 - 20} width="16" height={(i % 5) * 24 + 20} rx="3" class={i % 3 === 0 ? 'fill-primary/70' : 'fill-base-300'} />
    {/each}
  {:else if variant === 'kanban'}
    {#each Array(3) as _, i (i)}
      <rect x={16 + i * 128} y="44" width="112" height="232" rx="8" class="fill-base-200" />
      <rect x={28 + i * 128} y="56" width="60" height="10" rx="5" class="fill-base-300" />
      {#each Array(3 - i) as _, j (j)}
        <rect x={28 + i * 128} y={80 + j * 52} width="88" height="40" rx="6" class={j === 0 && i === 1 ? 'fill-primary/70' : 'fill-base-100'} />
      {/each}
    {/each}
  {:else}
    <rect x="16" y="44" width="368" height="90" rx="8" class="fill-base-200" />
    <path d="M32 108 L72 76 L112 96 L152 60 L192 84 L232 52 L272 92 L312 68 L352 88" class="fill-none stroke-primary" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    <rect x="16" y="146" width="176" height="130" rx="8" class="fill-base-200" />
    {#each Array(6) as _, i (i)}
      <rect x={32 + i * 26} y={260 - (i % 4) * 22 - 14} width="14" height={(i % 4) * 22 + 14} rx="3" class={i % 2 === 0 ? 'fill-primary/70' : 'fill-base-300'} />
    {/each}
    <rect x="208" y="146" width="176" height="130" rx="8" class="fill-base-200" />
    <circle cx="296" cy="211" r="42" class="fill-none stroke-primary/70" stroke-width="12" stroke-dasharray="140 264" stroke-linecap="round" />
  {/if}
</svg>
