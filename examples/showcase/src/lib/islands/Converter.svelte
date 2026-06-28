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
  // Number.isFinite guards the cleared-input case: bind:value on a number input yields undefined when the
  // field is empty, which would otherwise announce "NaN" through the output live region.
  const converted = $derived(Number.isFinite(amount) ? Math.round(amount * rate * 1000) / 1000 : 0);
</script>

<div class="island-converter" data-testid="converter-live">
  <span class="field">
    <!-- aria-label gives the control a stable accessible name even when `from` is empty; the visible unit
         beside it is decorative. -->
    <input
      id="converter-amount"
      type="number"
      aria-label={from ? `Amount in ${from}` : 'Amount'}
      bind:value={amount}
      data-testid="converter-input"
    />
    <span class="unit" aria-hidden="true">{from}</span>
  </span>
  <span class="equals" aria-hidden="true">=</span>
  <output for="converter-amount" aria-live="polite" data-testid="converter-output">{converted} {to}</output>
</div>
