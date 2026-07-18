<!-- @component
A front-page hero: a tracked eyebrow, a display lede (rendered as `headingTag`, `h1` by
default so it becomes the page's one heading), a numbered ledger of lead/body rows, and a
small-caps footline. Banked here from cairn.pub, where it launched as the ratified front page
hero; this copy is the template's reusable original. It is unused by the showcase's own routes
today and exists for a scaffolded site to compose into its own front page. Every color and
font size reads a cairn theme token (`--text-step-*`, `--font-display`/`--font-sans`,
`--font-weight-*`, `--color-primary`, `--color-muted`), and the handful of values with no
design-scale token (the ledger's grid-column widths, its row padding and gap, the three
distinct tracking widths) are ad hoc layout literals, the same idiom this showcase's own
listing rows use. The row and footline hairlines share one `--hero-hairline`, a `color-mix`
off `--color-base-content` so it holds its contrast in both color schemes with no dark-mode
override. Below 480px the ledger's grid tightens and the lede drops one text step.
-->
<script lang="ts">
  /** One ledger row: a bold lead line and its supporting sentence. */
  interface LedgerItem {
    lead: string;
    body: string;
  }

  let {
    eyebrow,
    lede,
    items,
    foot,
    headingTag = 'h1',
  }: {
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
  <p class="eyebrow">{eyebrow}</p>
  <svelte:element this={headingTag} class="lede">{lede}</svelte:element>
  <ol>
    {#each items as item, i (item.lead)}
      <li>
        <span class="num">{String(i + 1).padStart(2, '0')}</span>
        <div>
          <p class="lead">{item.lead}</p>
          <p class="body">{item.body}</p>
        </div>
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
    display: grid;
    grid-template-columns: 2.6rem 1fr;
    gap: 0 1.1rem;
    padding: 1.3rem 0;
    border-top: 1px solid var(--hero-hairline);
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
    .hero li {
      grid-template-columns: 2.1rem 1fr;
      gap: 0 0.8rem;
      padding: 1.1rem 0;
    }
    .hero .lede {
      font-size: var(--text-step-1);
    }
  }
</style>
