<!--
@component
The figure control form: the caption and placement an author gives an inline media image. The host
(EditPage) opens it over the media image at the caret, in `wrap` mode for a bare image or `edit` mode
for an existing `:::figure`. It is the form CONTENT only; the host mounts it inside the Edit-block
dialog. On submit it emits the chosen caption and role through `onapply`; in edit mode it also offers
`onunwrap` to strip the figure back to the bare image.

The caption is the visible line under the image, distinct from the alt text. The control surfaces the
image's alt state (Described or Needs alt) that the host derives and passes; the deep needs-alt wiring
is the host's. When the image is decorative AND the author gives it a caption, the control warns: a
decorative image is hidden from screen readers, so a visible caption on it is a contradiction.

The placement is a roving-tabindex radiogroup (Measure, Center, Wide, Full): one bordered group, the
active segment tinted with a check glyph (the non-color state cue, WCAG 1.4.1), arrow keys move and
select. Measure maps to the null role (the measure default, no role brace); the others map to their
own name.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import type { FigureRole } from './markdown-format.js';

  /** The roles the segmented control offers, with Measure standing for the null (measure-default)
   *  role. Declared as a const tuple so the segment loop and the keyboard handler share one source. */
  const ROLE_OPTIONS: { value: FigureRole | null; label: string }[] = [
    { value: null, label: 'Measure' },
    { value: 'center', label: 'Center' },
    { value: 'wide', label: 'Wide' },
    { value: 'full', label: 'Full' },
  ];

  interface Props {
    /** The initial caption; the field seeds from it and the author edits a local copy. */
    caption?: string;
    /** The initial placement role, or null for the measure default. */
    role?: FigureRole | null;
    /** `wrap` for a bare image (the primary action wraps it), `edit` for an existing figure (the
     *  primary action updates it and a ghost action unwraps it). */
    mode?: 'wrap' | 'edit';
    /** Whether the image's alt is empty or marked decorative; the host derives it. Drives the
     *  alt-status row and the decorative-plus-caption warning. */
    decorative?: boolean;
    /** Emit the chosen caption and role: the host wraps (wrap mode) or updates (edit mode). */
    onapply: (choice: { caption: string; role: FigureRole | null }) => void;
    /** Emit the unwrap action (edit mode only); the host replaces the figure with its bare image. */
    onunwrap?: () => void;
  }

  let { caption = '', role = null, mode = 'wrap', decorative = false, onapply, onunwrap }: Props =
    $props();

  // The author's working copies, seeded once from the props the control opened with. untrack marks
  // the read a deliberate one-time seed (the control mounts fresh per image), not a reactive miss.
  let captionValue = $state(untrack(() => caption));
  let roleValue = $state<FigureRole | null>(untrack(() => role));

  // The index of the active role in ROLE_OPTIONS, the roving-tabindex focus target.
  const activeIndex = $derived(ROLE_OPTIONS.findIndex((o) => o.value === roleValue));

  // The decorative-plus-caption contradiction: a decorative image is hidden from screen readers, so a
  // visible caption on it is a state to flag (never blocked, surfaced for the author to resolve).
  const decorativeWithCaption = $derived(decorative && captionValue.trim() !== '');

  // The segment refs, so arrow-key navigation can move focus to the newly selected segment.
  let segmentEls = $state<HTMLButtonElement[]>([]);

  function pickRole(value: FigureRole | null) {
    roleValue = value;
  }

  // Arrow keys move and select within the radiogroup (the roving-tabindex pattern); Home/End jump to
  // the ends. Selection follows focus, the standard radiogroup behavior.
  function onSegmentKeydown(e: KeyboardEvent, index: number) {
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % ROLE_OPTIONS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (index - 1 + ROLE_OPTIONS.length) % ROLE_OPTIONS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = ROLE_OPTIONS.length - 1;
    else return;
    e.preventDefault();
    pickRole(ROLE_OPTIONS[next].value);
    segmentEls[next]?.focus();
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    onapply({ caption: captionValue.trim(), role: roleValue });
  }
</script>

<form class="flex flex-col gap-4" onsubmit={submit}>
  <div class="flex flex-col gap-1">
    <label for="cairn-figure-caption" class="text-sm font-medium">Caption</label>
    <input
      id="cairn-figure-caption"
      class="input w-full"
      type="text"
      placeholder="Describe what the image adds to the post"
      aria-describedby="cairn-figure-caption-hint"
      bind:value={captionValue}
    />
    <p id="cairn-figure-caption-hint" class="text-xs text-[var(--color-muted)]">
      Shown under the image, for everyone. This is not the alt text.
    </p>
  </div>

  <!-- The alt-status row: the image's alt state the host derives. Described or Needs alt, the latter
       in the warning ink with a glyph so the state never rides hue alone (WCAG 1.4.1). -->
  <div class="flex items-center gap-2 text-sm">
    <span class="font-medium">Alt text</span>
    {#if decorative}
      <span
        class="inline-flex items-center gap-1 font-medium text-[var(--cairn-warning-ink)]"
        data-cairn-alt-status="needs"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Needs alt
      </span>
    {:else}
      <span class="inline-flex items-center gap-1 text-[var(--color-muted)]" data-cairn-alt-status="described">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Described
      </span>
    {/if}
  </div>

  <div class="flex flex-col gap-1">
    <span id="cairn-figure-placement-label" class="text-sm font-medium">Placement</span>
    <!-- The segmented control: one bordered group, borderless segments, the active one tinted with a
         check glyph. A roving-tabindex radiogroup, so arrow keys move and select and one Tab stop
         reaches the group. -->
    <div
      role="radiogroup"
      aria-labelledby="cairn-figure-placement-label"
      class="bg-base-100 inline-flex items-center self-start overflow-hidden rounded-lg border border-[var(--cairn-card-border)]"
    >
      {#each ROLE_OPTIONS as option, index (option.label)}
        {@const pressed = roleValue === option.value}
        <button
          bind:this={segmentEls[index]}
          type="button"
          role="radio"
          aria-checked={pressed}
          tabindex={index === activeIndex ? 0 : -1}
          class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-normal {index > 0
            ? 'border-l border-[var(--cairn-card-border)]'
            : ''} {pressed ? 'bg-primary/10 text-primary font-medium' : 'text-[var(--color-muted)]'}"
          onclick={() => pickRole(option.value)}
          onkeydown={(e) => onSegmentKeydown(e, index)}
        >
          {#if pressed}
            <svg
              class="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          {/if}
          {option.label}
        </button>
      {/each}
    </div>
    <p class="text-xs text-[var(--color-muted)]">
      Center suits an image narrower than the text column. Measure keeps it at the column width.
    </p>
  </div>

  {#if decorativeWithCaption}
    <div
      role="note"
      class="flex items-start gap-2 rounded-[0.55rem] p-2.5 text-[var(--cairn-warning-ink)]"
      style="background: color-mix(in oklab, var(--cairn-warning-ink) 8%, transparent);"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="mt-0.5 flex-none"
        aria-hidden="true"
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <p class="m-0 text-xs leading-relaxed">
        A decorative image is hidden from screen readers, but this one has a caption. Describe it, or
        remove the caption.
      </p>
    </div>
  {/if}

  <div class="flex justify-end gap-2">
    {#if mode === 'edit'}
      <button type="button" class="btn btn-sm btn-ghost" onclick={() => onunwrap?.()}>Unwrap</button>
      <button type="submit" class="btn btn-sm btn-primary">Update figure</button>
    {:else}
      <button type="submit" class="btn btn-sm btn-primary">Wrap in figure</button>
    {/if}
  </div>
</form>
