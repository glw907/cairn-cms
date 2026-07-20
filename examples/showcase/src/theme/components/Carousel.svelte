<!-- @component
A quiet, accessible carousel of stacked slides, cross-fading on opacity, with a label/note row
and a dot row for manual navigation. Generalized from cairn.pub's site-screenshot carousel: the
label under each slide and the section's `aria-label` are caller-supplied, so this component
carries no assumption about what it is a carousel OF.

Motion contract: the carousel auto-advances every 7000ms for exactly ONE cycle. Once it advances
past the last slide back to the first, it stops permanently; a reader who clicks a dot has taken
control, and auto-advance stops for good right there too. Auto-advance pauses while the pointer
sits over the frame or focus is inside the section, and resumes on leave or blur, unless the
cycle already finished or the reader already took control. When the OS reports
`prefers-reduced-motion: reduce`, the carousel never auto-advances, and the slide swap carries no
transition.
-->
<script lang="ts">
  interface Slide {
    src: string;
    alt: string;
    /** The slide's short label, shown next to its optional note. */
    label: string;
    /** An optional supporting note shown after the label. */
    note?: string;
    width: number;
    height: number;
  }

  let {
    slides,
    ariaLabel,
    caption,
  }: {
    slides: Slide[];
    /** The carousel section's `aria-label`, naming what these slides are of. */
    ariaLabel: string;
    /** An optional caption line below the carousel. Rendered only when set. */
    caption?: string;
  } = $props();

  let active = $state(0);
  let pointerOver = $state(false);
  let focusWithin = $state(false);
  let userControlled = $state(false);
  let cycleDone = $state(false);

  let paused = $derived(pointerOver || focusWithin);

  function selectSlide(i: number) {
    userControlled = true;
    active = i;
  }

  $effect(() => {
    if (typeof window === 'undefined' || slides.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = setInterval(() => {
      if (paused || userControlled || cycleDone) return;
      const next = (active + 1) % slides.length;
      active = next;
      if (next === 0) {
        cycleDone = true;
        clearInterval(id);
      }
    }, 7000);

    return () => clearInterval(id);
  });
</script>

<section
  aria-roledescription="carousel"
  aria-label={ariaLabel}
  onfocusin={() => (focusWithin = true)}
  onfocusout={() => (focusWithin = false)}
>
  <div
    class="frame"
    role="group"
    aria-label="Slides"
    style="aspect-ratio: {slides[0].width} / {slides[0].height}"
    onpointerenter={() => (pointerOver = true)}
    onpointerleave={() => (pointerOver = false)}
  >
    {#each slides as slide, i (slide.src)}
      <img
        src={slide.src}
        alt={slide.alt}
        width={slide.width}
        height={slide.height}
        loading={i === 0 ? undefined : 'lazy'}
        class:active={i === active}
      />
    {/each}
  </div>
  <div class="info-row">
    <div class="info" aria-live="polite">
      <span class="label">{slides[active].label}</span
      >{#if slides[active].note}<span class="note">{slides[active].note}</span>{/if}
    </div>
    <div class="dots">
      {#each slides as slide, i (slide.src)}
        <button
          type="button"
          class="dot"
          class:active={i === active}
          aria-label="Show {slide.label}"
          onclick={() => selectSlide(i)}
        ></button>
      {/each}
    </div>
  </div>
  {#if caption}<p class="caption">{caption}</p>{/if}
</section>

<style>
  .frame {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-box);
    border: 1px solid var(--color-card-border);
    box-shadow: var(--cairn-shadow);
    background: var(--color-base-200);
  }
  .frame img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 650ms ease;
  }
  .frame img.active {
    opacity: 1;
  }

  .info-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-top: 0.8rem;
  }
  .info .label {
    font-family: var(--font-sans);
    font-size: var(--text-step--1);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-base-content);
    margin-right: 0.7em;
  }
  .info .note {
    font-size: var(--text-step--1);
    color: var(--color-muted);
  }

  .dots {
    display: flex;
    gap: 0.5rem;
  }
  .dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    border: 0;
    /* The visible dot stays 0.55rem; the padding grows the actual hit target past the WCAG
       2.5.8 24px floor without changing the design's dot size, background-clip keeping the
       fill inside the original circle. Content-box sizing is load-bearing: under the global
       border-box preflight the 0.55rem width would be consumed by the padding and the visible
       dot would collapse to nothing. */
    box-sizing: content-box;
    padding: 0.6rem;
    background-clip: content-box;
    background-color: var(--color-base-300);
    cursor: pointer;
  }
  .dot.active {
    background-color: var(--color-primary);
  }
  .dot:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .caption {
    font-size: var(--text-step--1);
    color: var(--color-muted);
    margin: 0.55rem 0 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .frame img {
      transition: none;
    }
  }
</style>
