<!-- @component
The ratified round-2 front-page hero: a head lockup (the cairn mark beside the "What is cairn?"
question, rendered as `headingTag`, `h1` by default so it becomes the page's one heading), a
one-line answer, a numbered ledger of lead/body rows, and a small-caps footline. The markup and
the CSS below reproduce the ratified round-2 probe (`scratchpad/probe/mock-all.html`'s
`mock-compact` block) exactly: every color and font size reads a cairn theme token
(`--text-step-*`, `--font-display`/`--font-sans`, `--font-weight-*`, `--color-primary`,
`--color-muted`), and the handful of values with no design-scale token (the ledger's
grid-column widths, its row padding and gap, the three distinct tracking widths) are ad hoc
layout literals, the same idiom `(site)/+page.svelte`'s own listing rows already use. The
row and footline hairlines share one `--hero-hairline`, a `color-mix` off
`--color-base-content` so it holds its contrast in both color schemes with no dark-mode
override. Below 480px the ledger's grid tightens, matching the probe's own narrow-frame
adjustment; the answer line needs no step change at any width, so it carries no responsive rule.
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
    title = 'What is cairn?',
    answer,
    summary,
    leadIn,
    items,
    foot,
    headingTag = 'h1',
  }: {
    /** Render the cairn mark (the Temaki cairn) beside the title. */
    mark?: boolean;
    /** The head lockup's question, rendered as `headingTag`. */
    title?: string;
    /** The one-line answer below the head lockup. */
    answer: string;
    /** An optional opening summary paragraph between the answer and the ledger. */
    summary?: string;
    /** An optional short paragraph leading into the numbered ledger. */
    leadIn?: string;
    /** The numbered ledger rows, rendered in order, one to a `<li>`. */
    items: LedgerItem[];
    /** The footline phrases, joined by a centered dot. */
    foot: string[];
    /** The title's element. Defaults to `h1`, the page's own single heading. */
    headingTag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  } = $props();
</script>

<section class="hero">
  <div class="head">
    {#if mark}<svg class="mark" viewBox="0 0 15 15" fill="currentColor" aria-hidden="true"><path d="M6.28 14C5.56 14 1 13.89 1 12.91C1 11.46 2.16 11.07 3.2 10.81C4.36 10.51 13.18 9.77 13.76 10.07C14.46 10.43 13.52 12.49 12.44 12.77C11.28 13.07 10.21 14 8.48 14C7.05 14 9.69 14 6.28 14ZM6.92 4.5C6.67 4.5 5 4.43 5 3.88C5 3.07 5.75 2.51 5.96 2.35C6.36 2.03 6.32 1.62 6.54 1.27C6.84 0.79 7.61 0.5 7.88 0.5C8.1 0.5 8.75 0.9 9.23 1.42C9.45 1.66 10 2.77 10 3.12C10 4.22 9.36 4.5 8.85 4.5C8.33 4.5 8.15 4.5 6.92 4.5ZM3.68 8.22C3 7.73 3.67 6.86 4.57 6.21C5.38 5.63 5.92 5.96 6.79 5.7C8.33 5.24 9.02 5.72 9.02 5.72L10.9 6.82C12.03 7.63 10.99 7.67 10.38 8.56C9.79 9.42 8.18 9.11 7.42 9.33C6.78 9.53 5.75 9.71 4.62 8.9L3.68 8.22Z"/></svg>{/if}
    <svelte:element this={headingTag} class="title">{title}</svelte:element>
  </div>
  <p class="answer">{answer}</p>
  {#if summary}<p class="summary">{summary}</p>{/if}
  {#if leadIn}<p class="lead-in">{leadIn}</p>{/if}
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

  .hero .head {
    display: flex; align-items: center; gap: 0.8rem; margin: 0 0 0.5rem;
  }
  .hero .mark {
    width: 2.1rem; height: 2.1rem; color: var(--color-primary); flex-shrink: 0;
  }
  .hero .title {
    font-family: var(--font-display);
    font-size: var(--text-step-2);
    font-weight: var(--font-weight-semibold);
    letter-spacing: -0.01em;
    margin: 0;
  }

  .hero .answer {
    font-family: var(--font-display);
    font-size: var(--text-step-1);
    font-weight: var(--font-weight-medium);
    line-height: 1.35;
    text-wrap: balance;
    margin: 0 0 0.55rem;
  }

  .hero .summary {
    font-size: var(--text-step-0);
    line-height: 1.55;
    color: var(--color-muted);
    max-width: 38rem;
    margin: 0 0 0.8rem;
  }

  .hero .lead-in {
    font-size: var(--text-step-0);
    line-height: 1.55;
    max-width: 38rem;
    margin: 0 0 0.9rem;
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
    padding-block: 0.72rem;
    color: inherit;
    text-decoration: none;
    transition: color 180ms ease;
  }
  .hero a.row:hover .lead {
    text-decoration-color: currentColor;
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
    transition: color 180ms ease;
  }

  .hero .lead {
    font-family: var(--font-display);
    font-size: var(--text-step-1);
    font-weight: var(--font-weight-semibold);
    line-height: 1.22;
    letter-spacing: -0.005em;
    text-wrap: balance;
    margin: 0 0 0.35rem;
    text-decoration: underline;
    text-decoration-color: transparent;
    text-underline-offset: 0.2em;
    transition: text-decoration-color 180ms ease;
  }

  .hero .body {
    grid-column: 2;
    font-size: var(--text-step-0);
    line-height: 1.5;
    color: var(--color-muted);
    max-width: 36rem;
    margin: 0;
  }

  .hero .foot {
    border-top: 1px solid var(--hero-hairline);
    margin-top: 0;
    padding-top: 0.75rem;
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

  @media (prefers-reduced-motion: reduce) {
    .hero .num,
    .hero .lead {
      transition: none;
    }
  }

  @media (max-width: 480px) {
    .hero .row {
      grid-template-columns: 2.1rem 1fr;
      gap: 0 0.8rem;
    }
  }
</style>
