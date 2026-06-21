<!--
@component
The two-tier tidy settings screen (spec 2.8, Task 15). It follows the approved settings mockup
(2026-06-20-editor-copyedit-settings-final-mockup.html).

Two tiers with a truthful visibility gate:
  - The DEVELOPER tier (the master switch, the API key, the model) is shown READ-ONLY: an editor sees
    that tidy is enabled, a key is configured, and which model runs, but cannot edit any of it. The
    literal deploy-time tokens sit in a marked "For your developer" sub-block.
  - The EDITOR tier (the per-convention config) renders ONLY when tidy is enabled AND the key is
    present (`data.enabled`). When tidy is not enabled, the editor tier is genuinely ABSENT, replaced
    by an honest labelled gate region with a read-only "what your developer needs to do" checklist and
    a "spellcheck still works" reassurance. No teasing disabled controls sit in the tab order.

The resting state is the safe default: Fixes on, every style convention off, every variant collapsed.
Each binary toggle is the shipped check-and-tint aria-pressed button; each variant chooser is the
shipped pick-one recipe (role="radiogroup" over role="radio" with aria-checked, roving tabindex, the
check glyph as the non-color cue), never aria-pressed for a pick-one. A generated summary line and the
section counts live in always-present role="status" / aria-live="polite" regions, so a toggle
announces the new total; the per-keystroke diff examples are aria-hidden so the region is not chatty.

The save commits the conventions block to the same committed YAML the nav editor writes (one config
home), diffable and shared across editors.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import CsrfField from './CsrfField.svelte';
  import CheckIcon from '@lucide/svelte/icons/check';
  import CircleIcon from '@lucide/svelte/icons/circle';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import LockIcon from '@lucide/svelte/icons/lock';
  import CodeIcon from '@lucide/svelte/icons/code-xml';
  import ListIcon from '@lucide/svelte/icons/list';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import InfoIcon from '@lucide/svelte/icons/info';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import type { SettingsData } from '../sveltekit/content-routes.js';
  import type { TidyConventions } from '../nav/site-config.js';

  interface Props {
    /** The two-tier settings load: the read-only developer facts, the truthful gate flag, and the
     *  resolved editor-tier conventions. */
    data: SettingsData;
  }

  let { data }: Props = $props();

  // The working copy of the editor-tier conventions: every control binds to this, and the save posts
  // it. Seeded once from the load's resolved conventions, so the resting state IS the committed state.
  // A fresh load remounts the screen (the route key), so seeding from the initial prop is correct.
  let conv = $state<TidyConventions>(untrack(() => ({ ...data.conventions })));

  // A multi-position style row: its config key, label, the variants (value + short label), and the
  // diff example for the chosen variant.
  type Variant = { value: string; label: string };
  type StyleRow = {
    key: keyof TidyConventions;
    name: string;
    /** The variants when the row is a multi-position toggle; absent for a plain on/off (en-dash). */
    variants?: Variant[];
    /** The radiogroup's label ("Write times as"). */
    variantLabel?: string;
    /** The generic "what it does" example, shown when the row is off (a hypothetical). */
    egBefore: string;
    egAfter: string;
  };

  // The style conventions, in mockup order. Each maps to one config field. The multi-position rows
  // carry their variants; en-dash is a plain on/off.
  const styleRows: StyleRow[] = [
    {
      key: 'oxfordComma',
      name: 'Oxford comma',
      variantLabel: 'Use the Oxford comma',
      variants: [
        { value: 'always', label: 'Always' },
        { value: 'complex-only', label: 'Only in complex lists' },
        { value: 'never', label: 'Never' },
      ],
      egBefore: 'wax, skins and poles',
      egAfter: 'wax, skins, and poles',
    },
    {
      key: 'emDash',
      name: 'Em-dash style',
      variantLabel: 'Write em dashes as',
      variants: [
        { value: 'spaced', label: 'Spaced' },
        { value: 'closed', label: 'Closed' },
      ],
      egBefore: 'grooming--early',
      egAfter: 'grooming—early',
    },
    { key: 'enDashRanges', name: 'En-dash in number ranges', egBefore: '9-11 am', egAfter: '9–11 am' },
    {
      key: 'ellipsis',
      name: 'Ellipsis',
      variantLabel: 'Write ellipses as',
      variants: [
        { value: 'single-char', label: 'One character' },
        { value: 'three-dots', label: 'Three dots' },
      ],
      egBefore: 'later...',
      egAfter: 'later…',
    },
    {
      key: 'timeFormat',
      name: 'Time format',
      variantLabel: 'Write times as',
      variants: [
        { value: '5 PM', label: '5 PM' },
        { value: '5pm', label: '5pm' },
        { value: '5 p.m.', label: '5 p.m.' },
      ],
      egBefore: 'doors at 5pm',
      egAfter: 'doors at 5 PM',
    },
    {
      key: 'numberStyle',
      name: 'Number style',
      variantLabel: 'Write numbers as',
      variants: [
        { value: 'under-ten', label: 'Spell out under ten' },
        { value: 'under-hundred', label: 'Spell out under 100' },
        { value: 'always-numerals', label: 'Always numerals' },
      ],
      egBefore: '7 inches of snow',
      egAfter: 'seven inches of snow',
    },
    {
      key: 'measurements',
      name: 'Measurements and units',
      variantLabel: 'Write units as',
      variants: [
        { value: 'abbreviate', label: 'Abbreviate' },
        { value: 'spell-out', label: 'Spell out' },
      ],
      egBefore: '15 centimeters',
      egAfter: '15 cm',
    },
    {
      key: 'percent',
      name: 'Percent',
      variantLabel: 'Write percent as',
      variants: [
        { value: 'sign', label: 'Sign (%)' },
        { value: 'word', label: 'Word (percent)' },
      ],
      egBefore: '30 percent',
      egAfter: '30%',
    },
  ];

  // The advanced (higher-risk) rows: plain on/off booleans behind a disclosure.
  const advancedRows: { key: keyof TidyConventions; name: string; egBefore: string; egAfter: string }[] = [
    { key: 'smartQuotes', name: 'Curly quotes', egBefore: '"groomed"', egAfter: '“groomed”' },
    { key: 'brandCaps', name: 'Brand and proper-noun capitals', egBefore: 'github', egAfter: 'GitHub' },
  ];

  // --- whether a row is on, generic over the config shape ---
  // A boolean field is on when true; a multi-position field is on when it carries a variant.
  function rowOn(key: keyof TidyConventions): boolean {
    const v = conv[key];
    return typeof v === 'boolean' ? v : v !== undefined;
  }

  // The default variant a multi-position toggle takes when turned on: the first listed (the mockup's
  // leading position). A plain on/off uses true.
  function defaultVariant(row: StyleRow): string | boolean {
    return row.variants ? row.variants[0].value : true;
  }

  function toggleStyle(row: StyleRow) {
    if (rowOn(row.key)) {
      // Off: a multi-position field collapses to undefined; a boolean field to false.
      (conv[row.key] as unknown) = row.variants ? undefined : false;
    } else {
      (conv[row.key] as unknown) = defaultVariant(row);
    }
  }

  function toggleBool(key: keyof TidyConventions) {
    (conv[key] as unknown) = !rowOn(key);
  }

  function pickVariant(key: keyof TidyConventions, value: string) {
    (conv[key] as unknown) = value;
  }

  // --- the live counts and the generated summary, in the role="status" regions ---
  const styleOnCount = $derived(
    styleRows.filter((r) => rowOn(r.key)).length + advancedRows.filter((r) => rowOn(r.key)).length,
  );

  // The "fix" clause names the always-on objective set plus any on style convention; the "leaves
  // alone" clause names what stays untouched. Both are generated from the live config, so the line is
  // always true for any combination.
  const summaryFixes = $derived.by(() => {
    const parts: string[] = [];
    if (conv.fixes) parts.push('spelling', 'grammar', 'doubled words', 'spacing', 'capitals', 'end punctuation');
    if (rowOn('oxfordComma')) parts.push('commas');
    if (rowOn('timeFormat')) parts.push('time format');
    if (rowOn('numberStyle')) parts.push('number style');
    if (rowOn('measurements')) parts.push('units');
    if (rowOn('percent')) parts.push('percent');
    if (rowOn('emDash') || rowOn('enDashRanges')) parts.push('dashes');
    if (rowOn('ellipsis')) parts.push('ellipses');
    if (rowOn('smartQuotes')) parts.push('quotes');
    if (rowOn('brandCaps')) parts.push('brand names');
    return parts.length ? joinList(parts) : 'nothing yet';
  });
  const summaryLeaves = $derived.by(() => {
    const parts: string[] = [];
    if (!rowOn('oxfordComma')) parts.push('commas');
    if (!rowOn('emDash') && !rowOn('enDashRanges')) parts.push('dashes');
    if (!rowOn('numberStyle')) parts.push('number style');
    if (!rowOn('measurements')) parts.push('units');
    if (!rowOn('percent')) parts.push('percent');
    if (!rowOn('smartQuotes')) parts.push('quotes');
    if (!rowOn('brandCaps')) parts.push('brand names');
    return parts.length ? joinList(parts) : 'nothing';
  });

  function joinList(parts: string[]): string {
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
    return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
  }

  // --- section masters and the safe-default reset ---
  function styleAllOn() {
    for (const row of styleRows) if (!rowOn(row.key)) (conv[row.key] as unknown) = defaultVariant(row);
    for (const row of advancedRows) (conv[row.key] as unknown) = true;
  }
  function styleAllOff() {
    for (const row of styleRows) (conv[row.key] as unknown) = row.variants ? undefined : false;
    for (const row of advancedRows) (conv[row.key] as unknown) = false;
  }
  function fixesAllOff() {
    conv.fixes = false;
  }
  function fixesAllOn() {
    conv.fixes = true;
  }
  // Reset to the safe resting default: Fixes on, every style and advanced toggle off, every variant
  // collapsed. Never named a house style.
  function resetSafeDefault() {
    conv = { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false };
  }

  // --- the radiogroup roving-tabindex handler, the CairnMediaLibrary triage recipe ---
  // The selected radio is the only tab stop; Arrow/Home/End move the selection and the focus with
  // wraparound. A declared radiogroup owes this keyboard model.
  let radioEls = $state<Record<string, HTMLButtonElement[]>>(
    Object.fromEntries(styleRows.filter((r) => r.variants).map((r) => [String(r.key), []])),
  );
  function onRadioKeydown(e: KeyboardEvent, row: StyleRow, i: number) {
    if (!row.variants) return;
    const n = row.variants.length;
    let next = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    pickVariant(row.key, row.variants[next].value);
    radioEls[String(row.key)]?.[next]?.focus();
  }

  // The conventions payload the save posts: the live working copy as JSON.
  const conventionsJson = $derived(JSON.stringify(conv));

  // The shared class for a check-and-tint on/off button (the binary-state idiom, no DaisyUI .toggle).
  function onoffClass(on: boolean): string {
    return `inline-flex h-[30px] items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold ${
      on
        ? 'border-primary/30 bg-primary/10 text-primary'
        : 'border-[var(--cairn-card-border)] bg-base-100 text-[var(--color-muted)] hover:border-primary/35 hover:text-base-content'
    }`;
  }
  function segClass(on: boolean): string {
    return `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs ${on ? 'bg-primary/10 text-primary font-medium' : 'text-[var(--color-muted)]'}`;
  }
</script>

<div class="mx-auto max-w-3xl px-2 py-2">
  <!-- The office heading recipe: the display face, no eyebrow above the h1 -->
  <h1 class="text-2xl font-bold tracking-tight">Tidy</h1>
  <p class="mt-1.5 max-w-prose text-[0.9375rem] leading-relaxed text-[var(--color-muted)]">
    A light copy-edit from Claude. Choose what tidy is allowed to change. You always review every
    change as a diff before it lands.
  </p>

  {#if data.saved}
    <div role="status" class="alert alert-success mt-4 text-sm">Tidy settings saved.</div>
  {/if}
  {#if data.error}
    <div role="alert" class="alert alert-error mt-4 text-sm">{data.error}</div>
  {/if}

  <!-- DEVELOPER TIER, read-only: the three deploy-time facts the editor depends on, model included as
       a stated fact (never an editable control). Shown in both the enabled and gate states. -->
  {#if data.enabled}
    <div class="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--cairn-card-border)] bg-base-200 p-4">
      <span class="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-base-content/[0.07] text-[var(--color-muted)]">
        <CodeIcon class="h-5 w-5" aria-hidden="true" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="text-[0.8125rem] font-semibold">Tidy is set up for this site</div>
        <div class="mt-0.5 text-xs leading-relaxed text-[var(--color-muted)]">
          Your developer turned tidy on and chose how it runs. You cannot change these here.
        </div>
        <div class="mt-2.5 flex flex-col gap-1.5">
          <div class="flex items-baseline gap-2 text-[0.8125rem]">
            <span class="inline-flex min-w-[8.5rem] flex-none items-center gap-1.5 font-semibold text-[var(--color-positive-ink)]"><CheckIcon class="h-3.5 w-3.5 flex-none" aria-hidden="true" />Tidy</span>
            <span>On for this site</span>
          </div>
          <div class="flex items-baseline gap-2 text-[0.8125rem]">
            <span class="inline-flex min-w-[8.5rem] flex-none items-center gap-1.5 font-semibold text-[var(--color-positive-ink)]"><CheckIcon class="h-3.5 w-3.5 flex-none" aria-hidden="true" />API key</span>
            <span>Set, and kept on the server</span>
          </div>
          <div class="flex items-baseline gap-2 text-[0.8125rem]">
            <span class="inline-flex min-w-[8.5rem] flex-none items-center gap-1.5 font-semibold text-[var(--color-positive-ink)]"><CheckIcon class="h-3.5 w-3.5 flex-none" aria-hidden="true" />Model</span>
            <span>{data.modelLabel} <span class="text-[var(--color-muted)]">&middot; the careful default for a light copy-edit</span></span>
          </div>
        </div>
        <div class="mt-3 border-t border-dashed border-[var(--cairn-card-border)] pt-2.5">
          <span class="inline-flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]"><CodeIcon class="h-3 w-3" aria-hidden="true" />For your developer</span>
          <div class="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
            Tidy is on (<code class="rounded bg-[var(--cairn-code-chip)] px-1 font-mono text-[0.9em]">tidy.enabled</code>), the key rides in an Anthropic Worker secret (<code class="rounded bg-[var(--cairn-code-chip)] px-1 font-mono text-[0.9em]">ANTHROPIC_API_KEY</code>), and the model is <code class="rounded bg-[var(--cairn-code-chip)] px-1 font-mono text-[0.9em]">{data.model}</code>. Switch to <code class="rounded bg-[var(--cairn-code-chip)] px-1 font-mono text-[0.9em]">claude-haiku-4-5</code> for a cheaper, faster run.
          </div>
        </div>
      </div>
      <span class="mt-0.5 inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--cairn-card-border)] px-2.5 py-1 text-[0.625rem] font-semibold text-[var(--color-muted)]"><LockIcon class="h-3 w-3" aria-hidden="true" />Set by your developer</span>
    </div>

    <!-- THE GENERATED SUMMARY LINE, inside the live region. Rendered unconditionally so it can
         announce when it changes. -->
    <div role="status" aria-live="polite" class="mb-6 mt-6 flex items-start gap-3 rounded-2xl border border-primary/[0.16] bg-primary/[0.05] p-3.5">
      <span class="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-primary/[0.12] text-primary" aria-hidden="true"><ListIcon class="h-4 w-4" /></span>
      <div class="min-w-0 flex-1 text-[0.8125rem] leading-relaxed">
        <span class="font-semibold">Tidy will fix</span> {summaryFixes}.
        <span class="text-[var(--color-muted)]"><b class="font-semibold text-[var(--color-subtle)]">It leaves alone</b> {summaryLeaves}.</span>
      </div>
    </div>

    <form method="POST" action="?/saveSettings">
      <CsrfField />
      <input type="hidden" name="conventions" value={conventionsJson} />

      <!-- SECTION: FIXES (the objective errors, one group toggle) -->
      <section class="mb-6">
        <div class="mb-3 flex items-end gap-3 px-0.5">
          <div class="min-w-0 flex-1">
            <h2 class="flex items-center gap-2 text-lg font-bold tracking-tight">
              Fixes
              <span role="status" aria-live="polite" class="rounded-full bg-base-content/[0.06] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--color-muted)]">{conv.fixes ? 'On' : 'Off'}<span class="sr-only">, the fixes group is {conv.fixes ? 'on' : 'off'}</span></span>
            </h2>
            <p class="mt-1 max-w-prose text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">Plain errors, not style choices. On by default. Leave them on unless you have a reason not to.</p>
          </div>
          <div class="flex flex-none items-center gap-1">
            <button type="button" class="px-0.5 py-1 text-xs text-[var(--color-muted)] underline underline-offset-2 hover:text-primary" onclick={conv.fixes ? fixesAllOff : fixesAllOn}>{conv.fixes ? 'Turn off' : 'Turn on'}</button>
          </div>
        </div>
        <div class="overflow-hidden rounded-2xl border border-[var(--color-positive-ink)]/[0.22] bg-base-100 shadow-[var(--cairn-shadow)]">
          <div class="flex items-center gap-4 p-3.5 {conv.fixes ? '' : 'opacity-60'}">
            <div class="min-w-0 flex-1">
              <div class="text-[0.9375rem] font-semibold leading-snug {conv.fixes ? '' : 'text-[var(--color-muted)]'}">Spelling, grammar, doubled words, spacing, capitals, end punctuation</div>
              <div class="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[0.8125rem] leading-snug" aria-hidden="true">
                <span class="mr-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">changes</span>
                <span class="rounded-sm bg-[color-mix(in_oklab,var(--cairn-error-ink)_18%,transparent)] px-0.5 text-[var(--cairn-error-ink)] line-through">accomodate</span>
                <span class="text-[0.6875rem] text-[var(--color-muted)]">to</span>
                <span class="rounded-sm bg-[color-mix(in_oklab,var(--color-positive-ink)_20%,transparent)] px-0.5 text-[var(--color-positive-ink)]">accommodate</span>
              </div>
              <!-- the "kept as written" cue: regional spelling is never normalized, dialect-aware -->
              <div class="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[0.8125rem] leading-snug" aria-hidden="true">
                <span class="mr-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-positive-ink)]">keeps</span>
                <span class="rounded-sm bg-[var(--cairn-code-chip)] px-1">colour</span>
                <span class="text-[0.6875rem] text-[var(--color-muted)]">and</span>
                <span class="rounded-sm bg-[var(--cairn-code-chip)] px-1">organise</span>
                <span class="text-[0.6875rem] text-[var(--color-muted)]">as written, following your site's English</span>
              </div>
            </div>
            <span class="flex-none">
              <button type="button" class={onoffClass(conv.fixes)} aria-pressed={conv.fixes} aria-label="Fixes" onclick={() => toggleBool('fixes')}>
                {#if conv.fixes}<CheckIcon class="h-3.5 w-3.5" aria-hidden="true" />On{:else}<CircleIcon class="h-3 w-3 opacity-60" aria-hidden="true" />Off{/if}
              </button>
            </span>
          </div>
        </div>
      </section>

      <!-- SECTION: STYLE CONVENTIONS (default off; on reveals an inline variant chooser) -->
      <section class="mb-6">
        <div class="mb-3 flex items-end gap-3 px-0.5">
          <div class="min-w-0 flex-1">
            <h2 class="flex items-center gap-2 text-lg font-bold tracking-tight">
              Style conventions
              <span role="status" aria-live="polite" class="rounded-full bg-base-content/[0.06] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--color-muted)]">{styleOnCount} on<span class="sr-only">, {styleOnCount} style {styleOnCount === 1 ? 'convention' : 'conventions'} on</span></span>
            </h2>
            <p class="mt-1 max-w-prose text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">Optional. cairn leaves your style alone until you turn one of these on. Turn one on to pick how it should read everywhere.</p>
          </div>
          <div class="flex flex-none items-center gap-1">
            <button type="button" class="px-0.5 py-1 text-xs text-[var(--color-muted)] underline underline-offset-2 hover:text-primary" onclick={styleAllOn}>Turn all on</button>
            <span class="text-xs text-[var(--color-muted)] opacity-40" aria-hidden="true">&middot;</span>
            <button type="button" class="px-0.5 py-1 text-xs text-[var(--color-muted)] underline underline-offset-2 hover:text-primary" onclick={styleAllOff}>Turn all off</button>
            <span class="text-xs text-[var(--color-muted)] opacity-40" aria-hidden="true">&middot;</span>
            <button type="button" class="px-0.5 py-1 text-xs text-[var(--color-muted)] underline underline-offset-2 hover:text-primary" onclick={resetSafeDefault}>Reset to typos only</button>
          </div>
        </div>
        <div class="overflow-hidden rounded-2xl border border-[var(--cairn-card-border)] bg-base-100 shadow-[var(--cairn-shadow)]">
          {#each styleRows as row, ri (row.key)}
            {@const on = rowOn(row.key)}
            <div class="flex gap-4 p-3.5 {ri > 0 ? 'border-t border-[var(--cairn-card-border)]' : ''} {on && row.variants ? 'items-start' : 'items-center'}">
              <div class="min-w-0 flex-1">
                <div class="text-[0.9375rem] font-semibold leading-snug">{row.name}</div>
                {#if on && row.variants}
                  <!-- the inline variant chooser, revealed when the row is on: the shipped pick-one
                       recipe (radiogroup + radio + aria-checked + roving tabindex + check glyph) -->
                  <div class="mt-3 flex flex-col gap-2">
                    <div id={`tidy-var-${String(row.key)}`} class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">{row.variantLabel}</div>
                    <div role="radiogroup" aria-labelledby={`tidy-var-${String(row.key)}`} class="inline-flex flex-wrap self-start overflow-hidden rounded-lg border border-[var(--cairn-card-border)] bg-base-100">
                      {#each row.variants as variant, vi (variant.value)}
                        {@const checked = conv[row.key] === variant.value}
                        <button
                          bind:this={radioEls[String(row.key)][vi]}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          tabindex={checked ? 0 : -1}
                          class="{segClass(checked)} {vi > 0 ? 'border-l border-[var(--cairn-card-border)]' : ''}"
                          onclick={() => pickVariant(row.key, variant.value)}
                          onkeydown={(e) => onRadioKeydown(e, row, vi)}
                        >
                          {#if checked}<CheckIcon class="h-3 w-3 flex-none" aria-hidden="true" />{/if}{variant.label}
                        </button>
                      {/each}
                    </div>
                  </div>
                {:else}
                  <div class="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[0.8125rem] leading-snug {on ? '' : 'opacity-55'}" aria-hidden="true">
                    <span class="mr-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">changes</span>
                    <span class="rounded-sm bg-[color-mix(in_oklab,var(--cairn-error-ink)_18%,transparent)] px-0.5 text-[var(--cairn-error-ink)] line-through">{row.egBefore}</span>
                    <span class="text-[0.6875rem] text-[var(--color-muted)]">to</span>
                    <span class="rounded-sm bg-[color-mix(in_oklab,var(--color-positive-ink)_20%,transparent)] px-0.5 text-[var(--color-positive-ink)]">{row.egAfter}</span>
                  </div>
                {/if}
              </div>
              <span class="flex-none {on && row.variants ? 'mt-0.5' : ''}">
                <button type="button" class={onoffClass(on)} aria-pressed={on} aria-label={row.name} onclick={() => toggleStyle(row)}>
                  {#if on}<CheckIcon class="h-3.5 w-3.5" aria-hidden="true" />On{:else}<CircleIcon class="h-3 w-3 opacity-60" aria-hidden="true" />Off{/if}
                </button>
              </span>
            </div>
          {/each}
        </div>
      </section>

      <!-- ADVANCED (default off, gated behind a disclosure, with a short risk note) -->
      <section class="mb-6">
        <details class="overflow-hidden rounded-2xl border border-[var(--cairn-card-border)] bg-base-100 shadow-[var(--cairn-shadow)]">
          <summary class="flex cursor-pointer list-none items-center gap-3 p-3.5">
            <span class="inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-base-content/[0.06] text-[var(--color-muted)]"><SettingsIcon class="h-4 w-4" aria-hidden="true" /></span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2 text-[0.9375rem] font-semibold">Advanced <span class="rounded-full bg-warning/[0.14] px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--cairn-warning-ink)]">Higher risk</span></span>
              <span class="mt-0.5 block text-[0.8125rem] leading-snug text-[var(--color-muted)]">Two more changes that need a careful eye. Off by default. Open this only if you want them.</span>
            </span>
            <ArrowRightIcon class="h-4 w-4 flex-none text-[var(--color-muted)]" aria-hidden="true" />
          </summary>
          <div class="border-t border-[var(--cairn-card-border)]">
            <div class="flex items-start gap-2.5 border-b border-[var(--cairn-card-border)] bg-warning/[0.08] p-3.5 text-[0.8125rem] leading-relaxed">
              <TriangleAlertIcon class="mt-0.5 h-4 w-4 flex-none text-[var(--cairn-warning-ink)]" aria-hidden="true" />
              <span>These two reach a little further than the rest, so check the diff with care. <b class="font-semibold">Curly quotes can trip on apostrophes</b>, and brand names only fix from a list cairn keeps. Review every change before it lands, the same as always.</span>
            </div>
            {#each advancedRows as row, ai (row.key)}
              {@const on = rowOn(row.key)}
              <div class="flex items-center gap-4 p-3.5 {ai > 0 ? 'border-t border-[var(--cairn-card-border)]' : ''}">
                <div class="min-w-0 flex-1">
                  <div class="text-[0.9375rem] font-semibold leading-snug">{row.name}</div>
                  <div class="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[0.8125rem] leading-snug {on ? '' : 'opacity-55'}" aria-hidden="true">
                    <span class="mr-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">changes</span>
                    <span class="rounded-sm bg-[color-mix(in_oklab,var(--cairn-error-ink)_18%,transparent)] px-0.5 text-[var(--cairn-error-ink)] line-through">{row.egBefore}</span>
                    <span class="text-[0.6875rem] text-[var(--color-muted)]">to</span>
                    <span class="rounded-sm bg-[color-mix(in_oklab,var(--color-positive-ink)_20%,transparent)] px-0.5 text-[var(--color-positive-ink)]">{row.egAfter}</span>
                  </div>
                </div>
                <span class="flex-none">
                  <button type="button" class={onoffClass(on)} aria-pressed={on} aria-label={row.name} onclick={() => toggleBool(row.key)}>
                    {#if on}<CheckIcon class="h-3.5 w-3.5" aria-hidden="true" />On{:else}<CircleIcon class="h-3 w-3 opacity-60" aria-hidden="true" />Off{/if}
                  </button>
                </span>
              </div>
            {/each}
          </div>
        </details>
      </section>

      <!-- THE "NOT HERE YET" NOTE: honest, non-interactive -->
      <div class="mb-2 rounded-2xl border border-dashed border-[var(--cairn-card-border)] bg-base-content/[0.015] p-4">
        <div class="flex items-center gap-2 text-[0.8125rem] font-semibold"><InfoIcon class="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />Not here yet</div>
        <div class="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">Two more conventions are held back for now. Both can change how your writing sounds, not just how it looks, so cairn leaves them out until they are safe to offer.</div>
        <ul class="mt-2 flex flex-col gap-1.5">
          <li class="flex items-start gap-2 text-[0.8125rem] leading-snug text-[var(--color-muted)]"><span class="flex-none font-semibold text-base-content">Your own custom rules</span><span class="flex-none opacity-50" aria-hidden="true">&middot;</span><span>free-text instructions can reach into voice</span></li>
          <li class="flex items-start gap-2 text-[0.8125rem] leading-snug text-[var(--color-muted)]"><span class="flex-none font-semibold text-base-content">Heading capitals</span><span class="flex-none opacity-50" aria-hidden="true">&middot;</span><span>retitling your headings is a bigger change than it looks</span></li>
        </ul>
      </div>

      <div class="flex items-center gap-3 pt-4">
        <span class="flex min-w-0 flex-1 items-center gap-1.5 text-xs leading-snug text-[var(--color-muted)]">
          <ArrowRightIcon class="h-3.5 w-3.5 flex-none" aria-hidden="true" />Saving commits your choices to the site config, so every editor shares them.
        </span>
        <button type="submit" class="btn btn-primary btn-sm">Save changes</button>
      </div>
    </form>
  {:else}
    <!-- THE VISIBILITY GATE: tidy NOT enabled by the developer. The convention list is genuinely
         absent, not disabled. One honest labelled region names the deploy-time task and who does it,
         with no disabled controls in the tab order. -->
    <div role="region" aria-label="Tidy is not set up" class="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-[var(--cairn-card-border)] bg-base-100 p-10 text-center shadow-[var(--cairn-shadow)]">
      <span class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-base-content/[0.06] text-[var(--color-muted)]"><SparklesIcon class="h-6 w-6" aria-hidden="true" /></span>
      <div class="text-xl font-bold tracking-tight">Tidy is not set up yet</div>
      <div class="max-w-[50ch] text-sm leading-relaxed text-[var(--color-muted)]">
        Tidy uses Claude to copy-edit your drafts, so it sends your writing to Anthropic and costs a
        little per use. That makes it a developer setup, not a switch in here. Once it is on, this page
        is where you choose what it can change.
      </div>
      <div class="mt-1.5 flex w-full max-w-md flex-col gap-2.5 text-left">
        <div class="flex items-start gap-2.5 rounded-xl border border-[var(--cairn-card-border)] bg-base-200 p-3 {data.tidyEnabled ? 'opacity-60' : ''}">
          <span class="flex-none {data.tidyEnabled ? 'text-[var(--color-positive-ink)]' : 'text-[var(--color-subtle)]'}">
            {#if data.tidyEnabled}<CheckIcon class="mt-0.5 h-4 w-4" aria-hidden="true" />{:else}<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-base-content/[0.09] text-[0.6875rem] font-semibold">1</span>{/if}
          </span>
          <span class="text-[0.8125rem] leading-snug">Your developer turns tidy on for the site.<span class="mt-0.5 block text-[var(--color-muted)]">It is one setting in the site config.</span></span>
        </div>
        <div class="flex items-start gap-2.5 rounded-xl border border-[var(--cairn-card-border)] bg-base-200 p-3 {data.keyConfigured ? 'opacity-60' : ''}">
          <span class="flex-none {data.keyConfigured ? 'text-[var(--color-positive-ink)]' : 'text-[var(--color-subtle)]'}">
            {#if data.keyConfigured}<CheckIcon class="mt-0.5 h-4 w-4" aria-hidden="true" />{:else}<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-base-content/[0.09] text-[0.6875rem] font-semibold">2</span>{/if}
          </span>
          <span class="text-[0.8125rem] leading-snug">Your developer adds an Anthropic API key.<span class="mt-0.5 block text-[var(--color-muted)]">It stays on the server and never reaches the browser.</span></span>
        </div>
      </div>
      <div class="w-full max-w-md text-left">
        <span class="inline-flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]"><CodeIcon class="h-3 w-3" aria-hidden="true" />For your developer</span>
        <div class="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">Set <code class="rounded bg-[var(--cairn-code-chip)] px-1 font-mono text-[0.9em]">tidy.enabled: true</code> in the site config and add the Anthropic key as the <code class="rounded bg-[var(--cairn-code-chip)] px-1 font-mono text-[0.9em]">ANTHROPIC_API_KEY</code> Worker secret. The setup guide has the steps.</div>
      </div>
      <div class="mt-1 flex max-w-lg items-center gap-2.5 rounded-xl border border-[color-mix(in_oklab,var(--color-positive-ink)_22%,var(--cairn-card-border))] bg-[color-mix(in_oklab,var(--color-positive-ink)_8%,var(--color-base-100))] p-3 text-[0.8125rem] text-[var(--color-muted)]">
        <CheckIcon class="h-4 w-4 flex-none text-[var(--color-positive-ink)]" aria-hidden="true" />
        <span><b class="font-semibold text-base-content">Spellcheck is already working.</b> It runs in your browser, so it needs no setup and underlines misspellings as you type.</span>
      </div>
    </div>
  {/if}
</div>
