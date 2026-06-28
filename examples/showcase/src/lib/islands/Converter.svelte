<!--
@component
Showcase island: a live two-way unit converter mounted over its static fallback by the cairn islands
runtime. Props are the `:::converter` directive's scalar attributes; the engine coerces the `rate` number
field, so it arrives as a number. Uses `$derived` for the converted value (never `$effect`), so it cannot
loop. Every prop is author-controlled and untrusted, so they only ever reach text bindings, never `{@html}`.
-->
<script lang="ts">
  let { from = '', to = '', rate = 1 }: { from?: string; to?: string; rate?: number } = $props();
  let amount = $state(1);
  const converted = $derived(Math.round(amount * rate * 1000) / 1000);
</script>

<div class="island-converter" data-testid="converter-live">
  <label>
    {from}
    <input type="number" bind:value={amount} data-testid="converter-input" />
  </label>
  <span class="equals">=</span>
  <output data-testid="converter-output">{converted} {to}</output>
</div>
