<!-- @component
The /styleguide route: the single growing demo surface that shows every part of the public theme
shipped so far, so the template is a working component library, not a blog skeleton. B3 and B4 add
their feature and option components to this same page. It auto-themes through `prefers-color-scheme`
(the manual light/dark toggle is B4), so a reader in dark mode sees the dark theme here too.

Four sections: the color tokens (a swatch per DaisyUI role and on-surface ink), the type scale (each
named step at size, plus the three faces), the reading surface (the real prose output, rendered
server-side through the adapter `render` and wrapped in `.prose`), and the B2 core component set (the
markdown directive components plus the own-it components a page composes from).

Token-backed throughout: every color reads a DaisyUI role utility or a `var(--color-*)`/`var(--cairn-*)`
token, every type size reads a `--text-step-*` token, so the no-literals gate (`check:public-tokens`)
stays green over this file. A site owner reads this page to learn what is available and how to adopt
or extend it; nothing here is a literal a re-skin would miss.
-->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  /** One color swatch: the CSS custom property to paint, and the label shown under it. */
  type Swatch = { token: string; label: string };

  /** The base ladder, the brand roles, neutral, and the four status fills, each with its `-content`. */
  const baseLadder: Swatch[] = [
    { token: '--color-base-100', label: 'base-100' },
    { token: '--color-base-200', label: 'base-200' },
    { token: '--color-base-300', label: 'base-300' },
    { token: '--color-base-content', label: 'base-content' },
  ];
  const brandRoles: Swatch[] = [
    { token: '--color-primary', label: 'primary' },
    { token: '--color-primary-content', label: 'primary-content' },
    { token: '--color-secondary', label: 'secondary' },
    { token: '--color-secondary-content', label: 'secondary-content' },
    { token: '--color-accent', label: 'accent' },
    { token: '--color-accent-content', label: 'accent-content' },
    { token: '--color-neutral', label: 'neutral' },
    { token: '--color-neutral-content', label: 'neutral-content' },
  ];
  const statusRoles: Swatch[] = [
    { token: '--color-success', label: 'success' },
    { token: '--color-success-content', label: 'success-content' },
    { token: '--color-warning', label: 'warning' },
    { token: '--color-warning-content', label: 'warning-content' },
    { token: '--color-error', label: 'error' },
    { token: '--color-error-content', label: 'error-content' },
    { token: '--color-info', label: 'info' },
    { token: '--color-info-content', label: 'info-content' },
  ];
  /** The on-surface inks: a fill tone fails as small text, so each status word reads its own ink. */
  const inks: Swatch[] = [
    { token: '--color-muted', label: 'color-muted' },
    { token: '--cairn-success-ink', label: 'cairn-success-ink' },
    { token: '--cairn-warning-ink', label: 'cairn-warning-ink' },
    { token: '--cairn-error-ink', label: 'cairn-error-ink' },
    { token: '--cairn-info-ink', label: 'cairn-info-ink' },
  ];

  /** One type step: the size token to apply, the step name, and a short note on where it is used. */
  type TypeStep = { token: string; label: string; use: string };
  const typeSteps: TypeStep[] = [
    { token: '--text-step-5', label: 'step-5', use: 'h1, masthead' },
    { token: '--text-step-4', label: 'step-4', use: 'section display, stat' },
    { token: '--text-step-3', label: 'step-3', use: 'h2' },
    { token: '--text-step-2', label: 'step-2', use: 'h3, index title' },
    { token: '--text-step-1', label: 'step-1', use: 'lead, h4' },
    { token: '--text-step-0', label: 'step-0', use: 'body' },
    { token: '--text-step--1', label: 'step--1', use: 'caption, meta' },
  ];

  /** One labeled face: the font token, the family role name, and what it sets. */
  type Face = { token: string; label: string; use: string; sample: string };
  const faces: Face[] = [
    { token: '--font-display', label: 'display (Figtree)', use: 'headings, pull-quotes', sample: 'Stacked one stone at a time' },
    { token: '--font-body', label: 'body (Source Sans 3)', use: 'body, UI, captions', sample: 'The quick brown fox jumps over the lazy dog' },
    { token: '--font-mono', label: 'mono (Source Code Pro)', use: 'code', sample: 'const cairn = renderMarkdown(md);' },
  ];

  /** The accordion is a native <details>; track which is open only for the demo, not for behavior. */
  const accordion = [
    { summary: 'What is a callout?', body: 'A callout pulls one idea out of the flow of a post. It ships in three tones: note, tip, and warning.' },
    { summary: 'How do I re-skin the theme?', body: 'Edit the role tokens in theme.css. About fourteen values cover a full re-brand, the prose surface included.' },
  ];

  /** A small tab bar following the APG pattern: roving state, arrow keys, aria-controls to a panel. */
  const tabs = [
    { id: 'write', label: 'Write', body: 'The editing surface. You type raw markdown on the left.' },
    { id: 'preview', label: 'Preview', body: 'The rendered output, on the same reading surface your readers see.' },
    { id: 'publish', label: 'Publish', body: 'A deliberate step that copies your draft to the live site.' },
  ];
  let activeTab = $state(tabs[0].id);

  /** Move the tab selection with the arrow keys (the APG tablist roving-focus pattern). */
  function onTabKeydown(event: KeyboardEvent, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
    activeTab = tabs[next].id;
    const el = document.getElementById(`cairn-sg-tab-${tabs[next].id}`);
    el?.focus();
  }
</script>

<svelte:head>
  <title>Styleguide · Waymark</title>
  <meta
    name="description"
    content="The cairn public theme: color tokens, the type scale, the reading surface, and the component set."
  />
</svelte:head>

<div class="sg">
  <header class="sg-masthead">
    <h1 class="sg-title">Styleguide</h1>
    <p class="sg-lead">
      Everything the public theme ships so far, on the tokens a site owner re-skins. The page
      auto-themes with your system light or dark setting.
    </p>
  </header>

  <!-- 1. Color tokens. Every role and on-surface ink as a labeled swatch, painted from its token so
       no color is hard-coded. The -content swatches sit beside their fill so the pairing reads. -->
  <section class="sg-section" aria-labelledby="sg-color">
    <h2 id="sg-color" class="sg-h2">Color tokens</h2>
    <p class="sg-note">
      The DaisyUI 5 oklch role tokens and the cairn on-surface inks. A re-skin edits these in
      <code>theme.css</code>; every surface reads them, so the whole site recolors together.
    </p>

    <!-- One swatch grid per role group, each a labeled chip painted from its own token. -->
    {#snippet swatchGrid(items: Swatch[])}
      <div class="sg-swatches">
        {#each items as s (s.token)}
          <figure class="sg-swatch">
            <div class="sg-chip" style="background: var({s.token})"></div>
            <figcaption class="sg-swatch-label">{s.label}</figcaption>
          </figure>
        {/each}
      </div>
    {/snippet}

    <h3 class="sg-h3">Base ladder</h3>
    {@render swatchGrid(baseLadder)}

    <h3 class="sg-h3">Brand and neutral</h3>
    {@render swatchGrid(brandRoles)}

    <h3 class="sg-h3">Status fills and their content</h3>
    {@render swatchGrid(statusRoles)}

    <h3 class="sg-h3">On-surface inks</h3>
    <p class="sg-note">
      A fill tone fails as small text, so each status word reads a darker ink than its matching fill.
      Each sample below is the ink painted as text on the page paper.
    </p>
    <div class="sg-inks">
      {#each inks as s (s.token)}
        <p class="sg-ink-line" style="color: var({s.token})">
          {s.label} &mdash; the quick brown fox
        </p>
      {/each}
    </div>
  </section>

  <!-- 2. Type scale. Each named step rendered at its size in the display face, with its token name
       and where it is used, then the three faces labeled. Sizes read the --text-step-* tokens. -->
  <section class="sg-section" aria-labelledby="sg-type">
    <h2 id="sg-type" class="sg-h2">Type scale</h2>
    <p class="sg-note">
      A fluid editorial scale on a fixed ratio, authored with <code>clamp()</code> so the display
      scales while the body stays readable. Each row is one named step.
    </p>
    <div class="sg-steps">
      {#each typeSteps as step (step.token)}
        <div class="sg-step-row">
          <div class="sg-step-meta">
            <span class="sg-step-name">{step.label}</span>
            <span class="sg-step-use">{step.use}</span>
          </div>
          <div class="sg-step-sample" style="font-size: var({step.token})">
            Stacked one stone at a time
          </div>
        </div>
      {/each}
    </div>

    <h3 class="sg-h3">The faces</h3>
    <div class="sg-faces">
      {#each faces as face (face.token)}
        <div class="sg-face">
          <div class="sg-face-meta">
            <span class="sg-step-name">{face.label}</span>
            <span class="sg-step-use">{face.use}</span>
          </div>
          <p class="sg-face-sample" style="font-family: var({face.token})">{face.sample}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- 3. The reading surface. The real prose output, rendered server-side through the adapter render
       so the styleguide shows the genuine surface the article route produces. Wrapped in .prose. -->
  <section class="sg-section" aria-labelledby="sg-prose">
    <h2 id="sg-prose" class="sg-h2">The reading surface</h2>
    <p class="sg-note">
      A representative markdown sample run through the same <code>render</code> the article route
      calls. This is the bespoke, token-bound prose surface, not stock typography.
    </p>
    <div class="prose">
      {@html data.proseHtml}
    </div>
  </section>

  <!-- 4. Components: the B2 core set. The directive components are shown in the reading surface above
       (callout note/tip/warning, alert); here are the own-it components a page composes from. Every
       one is a DaisyUI primitive styled on the tokens, an editable file a site owner adopts. -->
  <section class="sg-section" aria-labelledby="sg-components">
    <h2 id="sg-components" class="sg-h2">Components</h2>
    <p class="sg-note">
      The own-it component set, built on DaisyUI primitives and the tokens. Adopt them as shipped or
      edit the source; nothing is locked in <code>node_modules</code>. The directive components
      (callout and alert) render in the reading surface above.
    </p>

    <h3 class="sg-h3">Buttons</h3>
    <div class="flex flex-wrap items-center gap-s">
      <button class="btn btn-primary">Primary</button>
      <button class="btn btn-outline">Outline</button>
      <button class="btn btn-ghost">Ghost</button>
    </div>
    <p class="sg-note">
      Shown at DaisyUI's stock 2.5rem (40px) height. A site that wants every button to clear the
      WCAG 2.5.8 44px touch-target floor sizes up with <code>btn-lg</code>.
    </p>

    <h3 class="sg-h3">Tags and a badge</h3>
    <div class="flex flex-wrap items-center gap-s">
      <span class="badge badge-outline">Markdown</span>
      <span class="badge badge-outline">Cloudflare</span>
      <span class="badge badge-primary">New</span>
    </div>

    <h3 class="sg-h3">Card</h3>
    <div class="sg-card">
      <h4 class="sg-card-title">A floating card</h4>
      <p class="sg-card-body">
        A card uses the elevation pair (a hairline border plus a soft shadow), never a flat border.
        It groups related content without a heavy box.
      </p>
      <div class="flex flex-wrap items-center gap-s">
        <button class="btn btn-primary btn-sm">Read more</button>
      </div>
    </div>

    <h3 class="sg-h3">Tabs</h3>
    <div class="sg-tabs">
      <div role="tablist" aria-label="Editor surfaces" class="sg-tablist">
        {#each tabs as tab, i (tab.id)}
          <button
            id="cairn-sg-tab-{tab.id}"
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            aria-controls="cairn-sg-panel-{tab.id}"
            tabindex={activeTab === tab.id ? 0 : -1}
            class="sg-tab"
            class:sg-tab-active={activeTab === tab.id}
            onclick={() => (activeTab = tab.id)}
            onkeydown={(e) => onTabKeydown(e, i)}
          >
            {tab.label}
          </button>
        {/each}
      </div>
      {#each tabs as tab (tab.id)}
        <div
          id="cairn-sg-panel-{tab.id}"
          role="tabpanel"
          aria-labelledby="cairn-sg-tab-{tab.id}"
          hidden={activeTab !== tab.id}
          class="sg-tabpanel"
        >
          {tab.body}
        </div>
      {/each}
    </div>

    <h3 class="sg-h3">Accordion</h3>
    <div class="sg-accordion">
      {#each accordion as item (item.summary)}
        <details class="sg-details">
          <summary class="sg-summary">{item.summary}</summary>
          <p class="sg-details-body">{item.body}</p>
        </details>
      {/each}
    </div>

    <h3 class="sg-h3">Call to action</h3>
    <!-- The CTA reads its own token pair, never --color-neutral directly: neutral inverts to a light
         value in dark mode, which would turn the panel into the brightest slab on the page. -->
    <div class="sg-cta">
      <div>
        <p class="sg-cta-title">Start writing on cairn</p>
        <p class="sg-cta-sub">A static site you edit in markdown and publish from your browser.</p>
      </div>
      <a href="/admin" class="sg-cta-btn">Open the editor</a>
    </div>

    <h3 class="sg-h3">Stat</h3>
    <div class="sg-stats">
      <div class="sg-stat">
        <span class="sg-stat-num">14</span>
        <span class="sg-stat-label">role values to re-skin</span>
      </div>
      <div class="sg-stat">
        <span class="sg-stat-num">0</span>
        <span class="sg-stat-label">client JS on the reading route</span>
      </div>
      <div class="sg-stat">
        <span class="sg-stat-num">2</span>
        <span class="sg-stat-label">themes, light and dark</span>
      </div>
    </div>
  </section>
</div>

<style>
  /* The styleguide's own layout chrome. Every color reads a token, every size reads a --cairn-* token
     or a relative unit, so the no-literals gate stays green. The page sits inside .site-main, which
     caps the reading column; the styleguide widens its own sections to the wide measure for the
     swatch grids while the prose block keeps the narrow measure. */
  .sg {
    max-width: var(--container-measure-wide);
    margin-inline: auto;
  }

  .sg-masthead {
    margin-bottom: var(--spacing-xl);
  }
  .sg-title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--text-step-5);
    line-height: var(--leading-tight);
    letter-spacing: var(--tracking-tight);
    color: var(--color-base-content);
  }
  .sg-lead {
    margin: var(--spacing-s) 0 0;
    max-width: var(--container-measure);
    font-size: var(--text-step-1);
    line-height: var(--leading-snug);
    color: var(--color-muted);
  }

  .sg-section {
    padding-top: var(--spacing-xl);
    margin-top: var(--spacing-xl);
    border-top: var(--border) solid var(--color-base-300);
  }
  .sg-h2 {
    margin: 0 0 var(--spacing-xs);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--text-step-3);
    line-height: var(--leading-tight);
    letter-spacing: var(--tracking-tight);
    color: var(--color-base-content);
  }
  .sg-h3 {
    margin: var(--spacing-l) 0 var(--spacing-s);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--text-step-1);
    color: var(--color-base-content);
  }
  .sg-note {
    margin: 0 0 var(--spacing-s);
    max-width: var(--container-measure);
    font-size: var(--text-step-0);
    line-height: var(--leading-snug);
    color: var(--color-muted);
  }
  .sg-note code {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: var(--color-base-200);
    border: var(--border) solid var(--color-base-300);
    border-radius: var(--radius-selector);
    padding: 0.1em 0.36em;
  }

  /* Color swatches: a responsive grid of chips, each painted from its token via an inline var(). */
  .sg-swatches {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: var(--spacing-s);
    margin: 0 0 var(--spacing-m);
  }
  .sg-swatch {
    margin: 0;
  }
  .sg-chip {
    height: 4rem;
    border-radius: var(--radius-field);
    border: var(--border) solid var(--color-card-border);
  }
  .sg-swatch-label {
    margin-top: var(--spacing-3xs);
    font-family: var(--font-mono);
    font-size: var(--text-step--1);
    color: var(--color-muted);
  }
  .sg-inks {
    display: grid;
    gap: var(--spacing-3xs);
  }
  .sg-ink-line {
    margin: 0;
    font-weight: 650;
    font-size: var(--text-step-0);
  }

  /* Type scale rows: a fixed meta column and the sample at the step's size. */
  .sg-steps {
    display: grid;
    gap: var(--spacing-m);
  }
  .sg-step-row,
  .sg-face {
    display: grid;
    grid-template-columns: 9rem 1fr;
    gap: var(--spacing-m);
    align-items: baseline;
  }
  .sg-step-meta,
  .sg-face-meta {
    display: flex;
    flex-direction: column;
  }
  .sg-step-name {
    font-family: var(--font-mono);
    font-size: var(--text-step--1);
    color: var(--color-base-content);
  }
  .sg-step-use {
    font-size: var(--text-step--1);
    color: var(--color-muted);
  }
  .sg-step-sample {
    font-family: var(--font-display);
    font-weight: 600;
    line-height: var(--leading-tight);
    letter-spacing: var(--tracking-tight);
    color: var(--color-base-content);
  }
  .sg-faces {
    display: grid;
    gap: var(--spacing-m);
  }
  .sg-face-sample {
    margin: 0;
    font-size: var(--text-step-2);
    line-height: var(--leading-snug);
    color: var(--color-base-content);
  }

  /* The floating card: the elevation pair, never a flat base-300 border (the admin convention). */
  .sg-card {
    max-width: var(--container-measure);
    padding: var(--spacing-m);
    border-radius: var(--radius-box);
    border: var(--border) solid var(--color-card-border);
    background: var(--color-base-100);
    box-shadow: var(--cairn-shadow);
  }
  .sg-card-title {
    margin: 0 0 var(--spacing-2xs);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--text-step-1);
    color: var(--color-base-content);
  }
  .sg-card-body {
    margin: 0 0 var(--spacing-s);
    font-size: var(--text-step-0);
    line-height: var(--leading-snug);
    color: var(--color-muted);
  }

  /* Tabs: the APG pattern (roving tabindex, arrow keys, aria-controls to a panel). The active tab
     carries an accent underline; the rest read muted. */
  .sg-tablist {
    display: flex;
    gap: var(--spacing-m);
    border-bottom: var(--border) solid var(--color-base-300);
  }
  .sg-tab {
    appearance: none;
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    /* The 44px WCAG 2.5.8 touch-target floor: vertical padding grows the tab's own hit box (what a
       tap measures), the matching negative vertical margin keeps the tablist's visual row height
       unchanged, so the underline still sits exactly where it did before (the trailing -1px keeps
       the prior border-overlap trick). The small horizontal padding is left uncompensated: a touch
       target this narrow (five- to seven-letter labels) needs the extra width to clear 44px, and a
       few px of added tab spacing reads as looser, not broken. */
    padding: var(--spacing-xs) var(--spacing-2xs);
    margin-top: calc(var(--spacing-xs) * -1);
    margin-bottom: calc((var(--spacing-xs) * -1) - 1px);
    font-family: var(--font-body);
    font-size: var(--text-step-0);
    font-weight: 500;
    color: var(--color-muted);
    cursor: pointer;
    transition: color 0.15s;
  }
  .sg-tab-active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
    font-weight: 600;
  }
  .sg-tab:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .sg-tabpanel {
    padding-top: var(--spacing-s);
    font-size: var(--text-step-0);
    line-height: var(--leading-body);
    color: var(--color-base-content);
  }

  /* Accordion: native <details> with a +/- marker. The open transition is gated behind reduced
     motion, the floor the bar requires for every animation. */
  .sg-accordion {
    display: grid;
    gap: var(--spacing-2xs);
    max-width: var(--container-measure);
  }
  .sg-details {
    border: var(--border) solid var(--color-base-300);
    border-radius: var(--radius-field);
    padding: var(--spacing-xs) var(--spacing-s);
  }
  .sg-summary {
    cursor: pointer;
    font-weight: 600;
    font-size: var(--text-step-0);
    color: var(--color-base-content);
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* The 44px WCAG 2.5.8 touch-target floor: the summary's own box, not `.sg-details`'s padded
       card around it, is what a tap measures. Padding-only, so the closed card grows a little
       taller but nothing about the row's look (weight, marker, color) changes. */
    padding-block: var(--spacing-xs);
  }
  .sg-summary::-webkit-details-marker {
    display: none;
  }
  .sg-summary::after {
    content: '+';
    color: var(--color-primary);
    font-weight: 600;
  }
  .sg-details[open] .sg-summary::after {
    content: '\2212';
  }
  .sg-summary:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .sg-details-body {
    margin: var(--spacing-2xs) 0 0;
    font-size: var(--text-step-0);
    line-height: var(--leading-snug);
    color: var(--color-muted);
  }

  /* The CTA: its own token pair, so it inverts correctly in dark mode (a recessed bordered panel)
     instead of painting a bright slab from neutral. */
  .sg-cta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-m);
    max-width: var(--container-measure);
    padding: var(--spacing-l) var(--spacing-m);
    border-radius: var(--radius-box);
    background: var(--cairn-cta-bg);
    color: var(--cairn-cta-content);
    border: var(--border) solid var(--cairn-cta-border);
  }
  .sg-cta-title {
    margin: 0 0 var(--spacing-3xs);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--text-step-2);
  }
  .sg-cta-sub {
    margin: 0;
    font-size: var(--text-step-0);
    opacity: 0.85;
  }
  .sg-cta-btn {
    display: inline-flex;
    align-items: center;
    /* The 44px floor: the visual padding stays, the box grows invisibly to the touch minimum. */
    min-height: 2.75rem;
    flex-shrink: 0;
    padding: var(--spacing-2xs) var(--spacing-m);
    border-radius: var(--radius-field);
    background: var(--cairn-cta-btn-bg);
    color: var(--cairn-cta-btn-content);
    font-weight: 600;
    text-decoration: none;
  }
  .sg-cta-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* Stat: a display-face number over a muted label, the index/landing accent treatment. */
  .sg-stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xl);
  }
  .sg-stat {
    display: flex;
    flex-direction: column;
  }
  .sg-stat-num {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--text-step-4);
    line-height: var(--leading-tight);
    color: var(--color-primary);
    font-variant-numeric: tabular-nums;
  }
  .sg-stat-label {
    font-size: var(--text-step--1);
    color: var(--color-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .sg-tab {
      transition: none;
    }
  }

  /* The swatch and step grids collapse to one column on a narrow screen. */
  @media (max-width: 34rem) {
    .sg-step-row,
    .sg-face {
      grid-template-columns: 1fr;
      gap: var(--spacing-2xs);
    }
  }
</style>
