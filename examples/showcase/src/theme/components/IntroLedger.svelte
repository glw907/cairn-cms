<!-- @component
The ratified front-page hero: a tracked eyebrow, a display lede (rendered as `headingTag`,
`h1` by default so it becomes the page's one heading), a numbered ledger of lead/body rows, and
a small-caps footline. The markup and the CSS below reproduce the ratified probe
(`scratchpad/probe/hero-v2.html`) exactly: every color and font size reads a cairn theme token
(`--text-step-*`, `--font-display`/`--font-sans`, `--font-weight-*`, `--color-primary`,
`--color-muted`), and the handful of values with no design-scale token (the ledger's
grid-column widths, its row padding and gap, the three distinct tracking widths) are ad hoc
layout literals, the same idiom `(site)/+page.svelte`'s own listing rows already use. The
row and footline hairlines share one `--hero-hairline`, a `color-mix` off
`--color-base-content` so it holds its contrast in both color schemes with no dark-mode
override. Below 480px the ledger's grid tightens and the lede drops one text step, matching the
probe's own narrow-frame adjustment.
-->
<script lang="ts">
  /** One ledger row: a bold lead line and its supporting sentence. */
  interface LedgerItem {
    lead: string;
    body: string;
    /** An in-page anchor the row links to, making the ledger a table of contents. */
    href?: string;
  }

  let {
    mark = false,
    eyebrow,
    lede,
    items,
    foot,
    headingTag = 'h1',
  }: {
    /** Render the cairn mark (the Temaki cairn) beside the eyebrow. */
    mark?: boolean;
    /** The small tracked label above the lede. */
    eyebrow: string;
    /** The display sentence, rendered as `headingTag`. */
    lede: string;
    /** The numbered ledger rows, rendered in order, one to a `<li>`. */
    items: LedgerItem[];
    /** The footline phrases, joined by a centered dot. */
    foot: string[];
    /** The lede's element. Defaults to `h1`, the page's own single heading. */
    headingTag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  } = $props();
</script>

<section class="hero">
  <div class="eyebrow-row">
    {#if mark}<svg class="mark" viewBox="0 0 15 15" fill="currentColor" aria-hidden="true"><path d="M6.28 14C5.56 14 1 13.89 1 12.91C1 11.46 2.16 11.07 3.2 10.81C4.36 10.51 13.18 9.77 13.76 10.07C14.46 10.43 13.52 12.49 12.44 12.77C11.28 13.07 10.21 14 8.48 14C7.05 14 9.69 14 6.28 14ZM6.92 4.5C6.67 4.5 5 4.43 5 3.88C5 3.07 5.75 2.51 5.96 2.35C6.36 2.03 6.32 1.62 6.54 1.27C6.84 0.79 7.61 0.5 7.88 0.5C8.1 0.5 8.75 0.9 9.23 1.42C9.45 1.66 10 2.77 10 3.12C10 4.22 9.36 4.5 8.85 4.5C8.33 4.5 8.15 4.5 6.92 4.5ZM3.68 8.22C3 7.73 3.67 6.86 4.57 6.21C5.38 5.63 5.92 5.96 6.79 5.7C8.33 5.24 9.02 5.72 9.02 5.72L10.9 6.82C12.03 7.63 10.99 7.67 10.38 8.56C9.79 9.42 8.18 9.11 7.42 9.33C6.78 9.53 5.75 9.71 4.62 8.9L3.68 8.22Z"/></svg>{/if}
    <p class="eyebrow">{eyebrow}</p>
  </div>
  <svelte:element this={headingTag} class="lede">{lede}</svelte:element>
  <ol>
    {#each items as item, i (item.lead)}
      <li>
        {#if item.href}
          <a class="row" href={item.href}>
            <span class="num">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <p class="lead">{item.lead}</p>
              <p class="body">{item.body}</p>
            </div>
          </a>
        {:else}
          <span class="row">
            <span class="num">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <p class="lead">{item.lead}</p>
              <p class="body">{item.body}</p>
            </div>
          </span>
        {/if}
      </li>
    {/each}
  </ol>
  <p class="foot">
    {#each foot as phrase, i (phrase)}
      {#if i > 0}<span class="sep">&middot;</span>{/if}<span class="phrase">{phrase}</span>
    {/each}
  </p>
</section>

<style>
  .hero {
    --hero-hairline: color-mix(in oklab, var(--color-base-content) 14%, transparent);
  }

  .hero .eyebrow-row {
    display: flex; align-items: center; gap: 0.7rem; margin: 0 0 0.85rem;
  }
  .hero .eyebrow-row .eyebrow { margin: 0; }
  .hero .mark {
    width: 1.9rem; height: 1.9rem; color: var(--color-primary); flex-shrink: 0;
  }
  .hero .eyebrow {
    font-family: var(--font-sans);
    font-size: var(--text-step--2);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-primary);
    margin: 0 0 0.85rem;
  }

  .hero .lede {
    font-family: var(--font-display);
    font-size: var(--text-step-2);
    font-weight: var(--font-weight-semibold);
    line-height: 1.28;
    letter-spacing: -0.01em;
    text-wrap: balance;
    margin: 0 0 2.1rem;
  }

  .hero ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .hero li {
    border-top: 1px solid var(--hero-hairline);
  }
  .hero .row {
    display: grid;
    grid-template-columns: 2.6rem 1fr;
    gap: 0 1.1rem;
    padding: 1.3rem 0;
    color: inherit;
    text-decoration: none;
  }
  .hero a.row:hover .lead {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  .hero a.row:hover .num {
    color: var(--color-base-content);
  }
  .hero a.row:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }

  .hero .num {
    font-family: var(--font-sans);
    font-size: var(--text-step--1);
    font-weight: var(--font-weight-semibold);
    font-feature-settings: 'tnum';
    letter-spacing: 0.14em;
    color: var(--color-primary);
    padding-top: 0.42rem;
  }

  .hero .lead {
    font-family: var(--font-display);
    font-size: var(--text-step-1);
    font-weight: var(--font-weight-semibold);
    line-height: 1.22;
    letter-spacing: -0.005em;
    text-wrap: balance;
    margin: 0 0 0.35rem;
  }

  .hero .body {
    grid-column: 2;
    font-size: var(--text-step-0);
    line-height: 1.58;
    color: var(--color-muted);
    max-width: 36rem;
    margin: 0;
  }

  .hero .foot {
    border-top: 1px solid var(--hero-hairline);
    margin-top: 0;
    padding-top: 1.05rem;
    font-family: var(--font-sans);
    font-size: var(--text-step--2);
    font-weight: var(--font-weight-medium);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .hero .foot .sep {
    color: var(--color-primary);
    padding: 0 0.45em;
  }

  .hero .foot .phrase {
    white-space: nowrap;
  }

  @media (max-width: 480px) {
    .hero .row {
      grid-template-columns: 2.1rem 1fr;
      gap: 0 0.8rem;
      padding: 1.1rem 0;
    }
    .hero .lede {
      font-size: var(--text-step-1);
    }
  }
  @media (min-width: 768px) {
    .hero .lede { font-size: var(--text-step-3); }
  }
</style>
