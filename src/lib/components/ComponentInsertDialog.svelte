<!--
@component
The Insert control and its modal. The picker lists each actionable component with its description and
intended use. A component with a schema opens the guided ComponentForm; a template-only component
inserts directly; a component with neither is not listed. Built on a native <dialog> for focus
trapping and Escape, following the dropdown's a11y conventions used elsewhere in the admin.
-->
<script module lang="ts">
  import type { ComponentRegistry, ComponentDef } from '../render/registry.js';

  /** Past this many actionable components, the catalog grows a search input. Below it search is
   *  noise over a list short enough to scan. */
  const SEARCH_THRESHOLD = 8;

  /** Whether a def carries a schema (any attribute or slot), so it opens the guided form rather
   *  than inserting a bare template. Exported so a host deciding on its own guided-edit affordance
   *  (the edit page's Edit-block control) reads the same notion the dialog lists and chooses by. */
  export function hasSchema(def: ComponentDef): boolean {
    return Object.keys(def.attributes ?? {}).length > 0 || (def.slots?.length ?? 0) > 0;
  }
  /** The registry's pickable components. A def is actionable when a schema opens the guided form or
   *  a template inserts directly; a def with neither is not listed. A `hidden` def is then dropped,
   *  so the hidden filter applies after the actionable one. Exported so a host rendering its own
   *  trigger (the edit page's toolbar) can hide it under the same condition the dialog uses. */
  export function insertableDefs(registry?: ComponentRegistry): ComponentDef[] {
    return (registry?.defs ?? []).filter(
      (def) => (hasSchema(def) || Boolean(def.insertTemplate)) && !def.hidden,
    );
  }

  /** A heading-bearing group of rows. A group with an empty heading renders without an eyebrow.
   *  Groups appear in first-declared order, and rows keep declaration order within each group. */
  interface CatalogGroup {
    heading: string;
    defs: ComponentDef[];
  }

  /** Partition the defs into groups by `def.group`, preserving declaration order of both the
   *  groups (first time a group name is seen) and the rows within a group. A def with no `group`
   *  collects into one leading default group with no heading. */
  function groupDefs(defs: ComponentDef[]): CatalogGroup[] {
    const order: string[] = [];
    const byHeading = new Map<string, ComponentDef[]>();
    for (const def of defs) {
      const heading = def.group ?? '';
      if (!byHeading.has(heading)) {
        byHeading.set(heading, []);
        order.push(heading);
      }
      byHeading.get(heading)!.push(def);
    }
    return order.map((heading) => ({ heading, defs: byHeading.get(heading)! }));
  }
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import type { IconSet } from '../render/glyph.js';
  import type { ComponentValues } from '../render/registry.js';
  import type { ResolvedPreview, SiteRender } from '../content/types.js';
  import { serializeComponent } from '../render/component-grammar.js';
  import { buildPreviewDoc } from './preview-doc.js';
  import ComponentForm from './ComponentForm.svelte';

  interface Props {
    /** The site's component registry. */
    registry?: ComponentRegistry;
    /** Insert markdown at the editor cursor. */
    insert: (text: string) => void;
    /** Replace the placed component's source span with new markdown. Edit mode routes submit here
     *  instead of insert. Optional: a host that never opens edit mode passes none. */
    update?: (range: { from: number; to: number }, markdown: string) => void;
    /** The site's icon set, for icon fields. */
    icons?: IconSet;
    /** The site's design-accurate render pipeline. When present and the picked component declares a
     *  `preview`, the configure step splits to two panes and renders the configured directive
     *  through this into a sandboxed iframe (the same path EditPage's preview uses). Optional: a
     *  host that passes none simply gets no preview pane. */
    render?: SiteRender;
    /** The adapter's resolved preview knob (stylesheets and container class), threaded to
     *  buildPreviewDoc so the preview frame links the site's own CSS, the same as EditPage. */
    preview?: ResolvedPreview | null;
    /** Disable the trigger; the host sets it while Preview shows. */
    disabled?: boolean;
    /** Render the built-in Insert block trigger. False mounts only the dialog, for a host that
     *  supplies its own trigger and opens the dialog through the exported open(). */
    trigger?: boolean;
  }

  let { registry, insert, update, icons, render, preview = null, disabled = false, trigger = true }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  let picked = $state<ComponentDef | null>(null);
  let query = $state('');
  let searchInput = $state<HTMLInputElement | null>(null);

  // Edit mode re-opens a placed component into the same guided form. editValues seeds the form from
  // the parsed block (not the catalog pick path), and editRange is the source span Update replaces.
  // Both are null in the catalog insert flow. resetPreview clears them so a fresh open is clean.
  let editValues = $state<ComponentValues | null>(null);
  let editRange = $state<{ from: number; to: number } | null>(null);
  const editing = $derived(editValues !== null);

  // The form's live values and its required-empty state, bound out of ComponentForm so the preview
  // pane can render from them and mirror the incomplete state.
  let formValues = $state<ComponentValues | undefined>(undefined);
  let formIncomplete = $state(false);

  // Two-pane configure is opt-in: it appears only when the picked component declares a `preview`
  // AND a render function is threaded. Otherwise the configure step stays single column.
  const twoPane = $derived(Boolean(picked?.preview) && Boolean(render));

  // The preview pane's settle state, the honest chip the mockup names. The empty/incomplete state
  // wins over settling so the pane never claims to settle a fabricated block.
  type PreviewState = 'settling' | 'settled' | 'failed';
  let previewState = $state<PreviewState>('settled');
  let previewDoc = $state('');

  // The required regions left empty, named for the incomplete-state callout. A boolean attribute is
  // always met; a text/select/icon attribute or a slot is unmet when empty.
  const emptyRequired = $derived.by(() => {
    if (!picked || !formValues) return [] as string[];
    const out: string[] = [];
    for (const [name, field] of Object.entries(picked.attributes ?? {})) {
      if (!field.required || field.type === 'boolean') continue;
      const v = formValues.attributes[name];
      // A scalar attribute always carries a label; the `?? name` only satisfies the union type, whose
      // object/array members have an optional label that checkComponentAttributes already rejects.
      if (typeof v !== 'string' || v === '') out.push(field.label ?? name);
    }
    for (const slot of picked.slots ?? []) {
      if (!slot.required) continue;
      const v = formValues.slots[slot.name];
      const filled = Array.isArray(v) ? v.some((i) => i !== '') : typeof v === 'string' && v !== '';
      if (!filled) out.push(slot.label);
    }
    return out;
  });

  // The debounced, latest-wins preview render, the same shape EditPage's preview effect uses: a
  // setTimeout debounce (~200ms) guarded by a plain counter so a slow earlier render that resolves
  // after a newer one started is discarded, one persistent iframe whose srcdoc is replaced. The
  // incomplete state short-circuits the render (the skeleton renders from the template, not the
  // pipeline), so a required-empty block never reaches the site render as a fabricated finish.
  let previewRun = 0;
  $effect(() => {
    if (!twoPane || !render || !picked || !formValues) return;
    if (formIncomplete) {
      previewState = 'settled';
      previewRun++;
      return;
    }
    const md = serializeComponent(picked, formValues);
    const run = ++previewRun;
    previewState = 'settling';
    const handle = setTimeout(async () => {
      try {
        const html = await render({ body: md });
        if (run === previewRun) {
          previewDoc = buildPreviewDoc(html, preview);
          previewState = 'settled';
        }
      } catch {
        if (run === previewRun) {
          previewState = 'failed';
        }
      }
    }, 200);
    return () => {
      clearTimeout(handle);
      previewRun++;
    };
  });

  const defs = $derived(insertableDefs(registry));
  /** The catalog grows a search input only once the actionable count crosses the threshold. */
  const showSearch = $derived(defs.length > SEARCH_THRESHOLD);
  /** The defs matching the live query, by label or description (case-insensitive). With no query
   *  the whole catalog shows. */
  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return defs;
    return defs.filter(
      (def) =>
        def.label.toLowerCase().includes(q) || (def.description ?? '').toLowerCase().includes(q),
    );
  });
  const groups = $derived(groupDefs(filtered));

  /** Clear the four preview-coupled state cells so no stale preview HTML or settle state survives a
   *  re-open, a step back, or a fresh pick. Called from every transition that leaves the configure
   *  step or starts a new one. */
  function resetPreview() {
    formValues = undefined;
    formIncomplete = false;
    previewState = 'settled';
    previewDoc = '';
    editValues = null;
    editRange = null;
  }

  /** Open the picker. Exported so a trigger={false} host can drive the dialog itself. */
  export function open() {
    picked = null;
    query = '';
    resetPreview();
    dialog?.showModal();
    // Focus the search box on open when it shows, so an editor with a large catalog types straight
    // into the filter. The dialog's own focus trap already lands focus on the first row otherwise.
    if (showSearch) {
      void tick().then(() => searchInput?.focus());
    }
  }
  /** Re-open a placed component into the same guided form. Skips the catalog: seeds the form from
   *  the parsed values, stores the source range for Update, and shows the configure step straight
   *  away. Exported so the host (the edit page's Edit-block control) drives it. */
  export function editComponent(
    def: ComponentDef,
    values: ComponentValues,
    range: { from: number; to: number },
  ) {
    resetPreview();
    query = '';
    editValues = values;
    editRange = range;
    picked = def;
    dialog?.showModal();
  }

  function back() {
    picked = null;
    resetPreview();
  }
  function close() {
    picked = null;
    dialog?.close();
  }
  function onClose() {
    picked = null;
    resetPreview();
  }
  function choose(def: ComponentDef) {
    if (hasSchema(def)) {
      resetPreview();
      picked = def;
      // ComponentForm focuses its own first field on mount.
    } else {
      insert(def.insertTemplate ?? '');
      close();
    }
  }
  // The form's submit routes here. In edit mode it replaces the stored source span through update;
  // otherwise it inserts at the cursor. Either way the dialog closes.
  function onSubmit(markdown: string) {
    if (editing && editRange) {
      update?.(editRange, markdown);
    } else {
      insert(markdown);
    }
    close();
  }

  // The native <dialog> turns Escape into a close. At the configure step Escape should step back to
  // the catalog instead (one level), matching the catalog's own Back control; from the catalog it
  // closes. Handling cancel (the event the dialog fires on Escape) lets us preventDefault and
  // intercept the first level.
  function onCancel(e: Event) {
    // In edit mode there is no catalog to step back to, so Escape closes (the default). At the
    // configure step of the insert flow, intercept the first Escape and step back to the catalog.
    if (picked && !editing) {
      e.preventDefault();
      back();
    }
  }

  // Arrow keys roam the rows: each row is a real <button>, so Enter chooses for free and Escape
  // closes through the native <dialog>. Up/Down (and Left/Right) move focus between the row buttons
  // in DOM order across every group, wrapping at the ends, the list-navigation model an editor
  // expects. The handler sits on each row button (an interactive element), and finds its siblings
  // through the shared scroll region so navigation crosses group boundaries.
  function onRowKeydown(e: KeyboardEvent) {
    const isNext = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    const isPrev = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
    if (!isNext && !isPrev) return;
    const region = (e.currentTarget as HTMLElement).closest('[data-cairn-pk-list]');
    if (!region) return;
    const rows = [...region.querySelectorAll<HTMLButtonElement>('[data-testid="cairn-pk-row"]')];
    const from = rows.indexOf(e.currentTarget as HTMLButtonElement);
    if (from < 0) return;
    e.preventDefault();
    const next = (from + (isNext ? 1 : -1) + rows.length) % rows.length;
    rows[next].focus();
  }

  // ArrowDown from the search input enters the list at the first row, ArrowUp at the last, so the
  // keyboard model is whole: type to filter, then arrow into the results without reaching for the
  // mouse. From a row, onRowKeydown takes over.
  function onSearchKeydown(e: KeyboardEvent) {
    const isNext = e.key === 'ArrowDown';
    const isPrev = e.key === 'ArrowUp';
    if (!isNext && !isPrev) return;
    const rows = dialog?.querySelectorAll<HTMLButtonElement>('[data-testid="cairn-pk-row"]');
    if (!rows || rows.length === 0) return;
    e.preventDefault();
    rows[isNext ? 0 : rows.length - 1].focus();
  }
</script>

<!-- The guided form, identical in either layout: the two-pane case wraps it in the left column, the
     single-column case renders it bare. One snippet keeps the prop wiring in one place. -->
{#snippet configureForm(def: ComponentDef)}
  <ComponentForm {def} {icons} onInsert={onSubmit} initial={editValues ?? undefined} submitLabel={editing ? 'Update' : 'Insert'} bind:values={formValues} bind:incomplete={formIncomplete} />
{/snippet}

{#if trigger && defs.length > 0}
  <button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" aria-label="Insert block" {disabled} onclick={open}>Insert block</button>
{/if}

{#if defs.length > 0}
  <dialog class="modal" aria-labelledby="cairn-insert-dialog-title" bind:this={dialog} onclose={onClose} oncancel={onCancel}>
    <!-- The box caps at 85vh and is a flex column so its header holds while only the body scrolls,
         per the design system's dialog-sizing recipe. The cap rides Tailwind utilities (the utilities
         layer) so it beats DaisyUI's `.modal-box` max-height: 100vh; a components-layer rule loses the
         cascade. overflow-hidden keeps the box from being a second scroll container. Matches TidyReview. -->
    <div class="modal-box flex max-h-[85vh] flex-col overflow-hidden {twoPane ? 'max-w-3xl' : ''}">
      <!-- The shared header: at the configure step it carries the Back control and the
           "Insert > group" eyebrow breadcrumb above the component label; while browsing it is the
           plain "Insert a component" title. It holds (flex-none) while the body scrolls, per the
           design system's dialog-sizing recipe. -->
      <div class="mb-3 flex flex-none items-center gap-3">
        {#if picked && !editing}
          <button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="Back to components" onclick={back}>
            <svg class="h-4 w-4" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M165.7 202.3a8 8 0 0 1-11.4 11.4l-80-80a8 8 0 0 1 0-11.4l80-80a8 8 0 0 1 11.4 11.4L91.3 128Z" /></svg>
          </button>
        {/if}
        <div class="min-w-0 flex-1">
          {#if picked}
            <div class="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">{editing ? 'Edit' : 'Insert'}{#if picked.group}&nbsp;&rsaquo;&nbsp;{picked.group}{/if}</div>
            <h2 id="cairn-insert-dialog-title" class="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">{picked.label}</h2>
          {:else}
            <h2 id="cairn-insert-dialog-title" class="text-base font-semibold">Insert a component</h2>
          {/if}
        </div>
        <button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="Close" onclick={close}>✕</button>
      </div>

      {#if picked}
        <!-- The configure body is the box's scroll container (flex-1, min-h-0): the shared header
             above holds while the form scrolls within the 85vh cap. -->
        <div class="-mr-1 flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
        {#key picked}
          {#if twoPane}
            <!-- Two panes: the form on the left, the live preview on the right. Below the breakpoint
                 the preview stacks beneath the form. -->
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div class="overflow-auto">
                {@render configureForm(picked)}
              </div>
              <div data-testid="cairn-pk-preview" class="flex flex-col gap-2 rounded-box border border-[var(--cairn-card-border)] bg-base-200 p-3">
                <div class="flex items-baseline justify-between gap-2">
                  <span class="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">Preview</span>
                  <!-- A silent visual cue, never an announcement: it re-rendered on every debounced
                       keystroke, so a screen reader read "Settling"/"Settled" aloud on each edit. The
                       incomplete and render-failed conditions reach assistive tech through the
                       per-field role="alert" errors and the failed panel text, so nothing is lost. -->
                  <span data-testid="cairn-pk-settle" class="inline-flex items-center gap-1.5 text-[0.7rem] text-[var(--color-muted)]">
                    {#if formIncomplete}
                      Incomplete
                    {:else if previewState === 'failed'}
                      Could not render
                    {:else if previewState === 'settling'}
                      <span class="inline-block h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true"></span>
                      Settling
                    {:else}
                      Settled
                    {/if}
                  </span>
                </div>
                {#if formIncomplete}
                  <!-- The skeleton: never a fabricated finished block. The empty required regions are
                       called out by name so the editor knows exactly what the preview still needs. -->
                  <div class="flex flex-1 flex-col items-center justify-center gap-2 rounded-box border border-dashed border-[var(--cairn-card-border)] p-6 text-center">
                    <p class="text-sm font-medium">Fill the required fields to preview this.</p>
                    <p class="flex flex-wrap justify-center gap-1.5 text-xs">
                      {#each emptyRequired as label (label)}
                        <span class="rounded border border-dashed border-[color-mix(in_oklab,var(--color-error)_55%,var(--cairn-card-border))] px-2 py-0.5 font-medium text-error">{label} needed</span>
                      {/each}
                    </p>
                  </div>
                {:else if previewState === 'failed'}
                  <!-- The render threw. Say so and keep the form intact; the editor can still insert. -->
                  <div data-testid="cairn-pk-preview-failed" class="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-box border border-[color-mix(in_oklab,var(--color-error)_35%,var(--cairn-card-border))] bg-[color-mix(in_oklab,var(--color-error)_5%,transparent)] p-5 text-center text-error">
                    <p class="text-sm font-semibold">Preview could not render</p>
                    <p class="text-xs text-[var(--color-muted)]">Your settings are kept. You can still insert and check it on the page.</p>
                  </div>
                {:else}
                  <div class="flex min-h-64 flex-1 overflow-hidden rounded-box border border-[var(--cairn-card-border)] bg-base-100 shadow-[var(--cairn-shadow)]">
                    <iframe sandbox="" title="Component preview" srcdoc={previewDoc} class="block w-full flex-1"></iframe>
                  </div>
                {/if}
              </div>
            </div>
          {:else}
            {@render configureForm(picked)}
          {/if}
        {/key}
        </div>
      {:else}
        {#if showSearch}
          <div class="mb-3 flex flex-none items-center gap-2 rounded-field border border-[var(--cairn-card-border)] bg-base-100 px-3 py-2">
            <svg class="ec-glyph h-4 w-4 text-[var(--color-muted)]" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M229.7 218.3 179.6 168.2A92.2 92.2 0 1 0 168.2 179.6l50.1 50.1a8 8 0 0 0 11.4-11.4ZM40 112a72 72 0 1 1 72 72 72.1 72.1 0 0 1-72-72Z" /></svg>
            <input
              type="search"
              class="w-full border-0 bg-transparent p-0 text-sm outline-hidden placeholder:text-[var(--color-muted)]"
              placeholder="Search components"
              aria-label="Search components"
              bind:value={query}
              bind:this={searchInput}
              onkeydown={onSearchKeydown}
            />
          </div>
          <p class="sr-only" role="status" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'component' : 'components'} match
          </p>
        {/if}

        {#if filtered.length === 0}
          <!-- The query matched nothing. The components exist; none match. Offer the way back. -->
          <div class="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p class="text-sm text-[var(--color-muted)]">No components match <span class="font-medium text-base-content">"{query.trim()}"</span>.</p>
            <button type="button" class="text-[0.8125rem] font-medium text-primary underline [text-underline-offset:2px]" onclick={() => (query = '')}>Clear search</button>
          </div>
        {:else}
          <!-- One scroll region holds every group, so the arrow keys roam the whole catalog. It
               is the box's scroll container (flex-1, min-h-0): the header above holds while the
               list scrolls within the 85vh cap. -->
          <div data-cairn-pk-list class="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
            {#each groups as group (group.heading)}
              <div class="mt-3 first:mt-0">
                {#if group.heading}
                  <div data-testid="cairn-pk-group-heading" class="px-2 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">{group.heading}</div>
                {/if}
                <ul class="menu w-full p-0">
                  {#each group.defs as def (def.name)}
                    <li>
                      <button type="button" data-testid="cairn-pk-row" class="flex items-start gap-3 py-2" onclick={() => choose(def)} onkeydown={onRowKeydown}>
                        {#if def.icon && icons?.[def.icon]}
                          <span class="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-base-200 text-base-content">
                            <svg class="ec-glyph h-4 w-4" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d={icons[def.icon]} /></svg>
                          </span>
                        {/if}
                        <span class="flex flex-col items-start gap-0.5">
                          <span data-testid="cairn-pk-row-label" class="text-sm font-medium">{def.label}</span>
                          {#if def.description}<span class="text-xs text-[var(--color-muted)]">{def.description}</span>{/if}
                          {#if def.use}<span class="text-xs text-[var(--color-subtle)]">{def.use}</span>{/if}
                        </span>
                      </button>
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
    <form method="dialog" class="modal-backdrop">
      <button tabindex="-1" aria-label="Close">close</button>
    </form>
  </dialog>
{/if}
