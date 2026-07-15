<!--
@component
The Help home admin screen, the standing place an author comes to get their bearings and look up
how things work. It renders inside `CairnAdminShell` (the office shell), so it carries no `data-theme`
wrapper and imports no CSS: the layout owns the theme and `cairn-admin.css`, and this component
consumes the Warm Stone tokens through its scoped `<style>` block.

The content is one calm column: a masthead, then three co-equal eyebrow-plus-display sections.

  - Getting started reads `data.gettingStarted`, the count derived from the committed manifest and
    the open edit branches (never a stored count). At 3 of 3 the whole section is omitted, never
    shown as a done checklist. A per-device localStorage flag hides it on request.
  - Formatting renders `data.reference` (the everyday text and links rows) as a real semantic table.
  - Get help reads the optional `data.supportContact`. Unset is the canonical self-serve default,
    with no control; set renders the hand-off shaped by the contact (email, URL, or a note).
-->
<script lang="ts">
  import type { MarkdownReferenceRow } from './markdown-reference.js';
  import type { HelpData } from '../sveltekit/content-routes.js';

  let { data }: { data: HelpData } = $props();

  // The everyday reference rows, split into the two reading columns. The blocks group stays in the
  // editor's full Ctrl+/ sheet; the Help home shows only the nine text and links rows.
  const textRows = $derived(data.reference.filter((r) => r.group === 'text'));
  const linkRows = $derived(data.reference.filter((r) => r.group === 'links'));

  // The three getting-started steps, mapped from the derived booleans in fixed order. The done and
  // todo copy is the owned voice; a not-done step routes to where it completes, a done step keeps a
  // quiet "Open it" so every row carries an affordance.
  const steps = $derived([
    {
      title: 'Write your first post',
      done: data.gettingStarted.wrotePost,
      doneDesc: 'You have a post started. Open it any time to keep going.',
      todoDesc: 'A post is for news and updates. Start your first one whenever you are ready.',
      actionLabel: 'Write a post',
      href: '/admin/posts',
    },
    {
      title: 'Publish it',
      done: data.gettingStarted.publishedPost,
      doneDesc: 'Your post is on the live site. Edit it and publish again any time.',
      todoDesc:
        'Publishing puts your post on the live site. You can change it and publish again any time.',
      actionLabel: 'Publish a post',
      href: '/admin/posts',
    },
    {
      title: 'Create a page',
      done: data.gettingStarted.createdPage,
      doneDesc: 'You have a page. Open it any time to keep going.',
      todoDesc: 'A page is for the parts that stay put, like About or Contact.',
      actionLabel: 'Add a page',
      href: '/admin/pages',
    },
  ]);

  // The decorative progress-bar width tracks the count. At 0 it drops to a faint seed so the rail
  // reads as a track, never as fake progress.
  const doneCount = $derived(data.gettingStarted.doneCount);
  const barWidth = $derived(doneCount === 0 ? '3%' : `${(doneCount / 3) * 100}%`);

  /**
   * Classify a freeform support contact into the hand-off shape it should render: a mailto for an
   *  email, an external link for a URL, or a plain note for anything else.
   */
  function supportLink(
    contact: string,
  ): { kind: 'email'; href: string } | { kind: 'url'; href: string } | { kind: 'text' } {
    const c = contact.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return { kind: 'email', href: `mailto:${c}` };
    if (/^https?:\/\/\S+$/.test(c)) return { kind: 'url', href: c };
    return { kind: 'text' };
  }

  const contact = $derived(data.supportContact?.trim() ?? '');
  const support = $derived(contact ? supportLink(contact) : null);

  // The per-device dismiss for the getting-started section. The admin is client-rendered, but read
  // the flag inside an effect so SSR never touches localStorage; the setter writes it on click.
  const HIDDEN_KEY = 'cairn-help-getting-started-hidden';
  let hidden = $state(false);
  $effect(() => {
    hidden = localStorage.getItem(HIDDEN_KEY) === '1';
  });
  function hideSteps() {
    hidden = true;
    localStorage.setItem(HIDDEN_KEY, '1');
  }
  function showSteps() {
    hidden = false;
    localStorage.removeItem(HIDDEN_KEY);
  }
</script>

<div class="cairn-help-content">
  <div class="help-col">
    <!-- masthead: a real-sentence h1, the page's single display beat -->
    <div class="page-head">
      <span class="eyebrow">Help</span>
      <h1 class="page-h1">Find formatting help and get your site set up.</h1>
      <p class="page-lede">If you need more, the get-help section below names who to ask.</p>
    </div>

    <!-- SECTION 1: getting started (omitted at 3 of 3) -->
    {#if doneCount < 3}
      {#if hidden}
        <div class="start-restore">
          <button type="button" onclick={showSteps}>Show getting started</button>
        </div>
      {:else}
        <section class="section" aria-labelledby="cairn-help-start-eye">
          <div class="section-head">
            <div class="section-titles">
              <span class="eyebrow" id="cairn-help-start-eye">Getting started</span>
              <h2 class="section-h">Your first steps</h2>
            </div>
          </div>

          <div class="card start" class:start-empty={doneCount === 0}>
            <div class="start-top">
              {#if doneCount === 0}
                <span class="start-mark" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor"
                    ><ellipse cx="12" cy="18.2" rx="7" ry="2.5" /><ellipse
                      cx="12"
                      cy="13"
                      rx="5.2"
                      ry="2.1"
                    /><ellipse cx="12" cy="8.6" rx="3.7" ry="1.7" /><ellipse
                      cx="12"
                      cy="5"
                      rx="2"
                      ry="1.2"
                    /></svg
                  >
                </span>
              {/if}
              <div class="start-lead">
                <p class="start-lead-sub">Three small steps to get going.</p>
              </div>
              <!-- the count is the source of truth; the bar is decorative only -->
              <div class="prog">
                <div class="prog-count"><b>{doneCount}</b> of 3 done</div>
                <div class="prog-bar" class:is-seed={doneCount === 0} role="presentation">
                  <i style="width:{barWidth}"></i>
                </div>
              </div>
            </div>

            <ol class="steps">
              {#each steps as step (step.title)}
                <li class="step" class:is-done={step.done}>
                  <span class="step-box" aria-hidden="true">
                    {#if step.done}
                      <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg
                      >
                    {/if}
                  </span>
                  <span class="step-body">
                    <span class="step-title">{step.title}</span>
                    <span class="step-desc">{step.done ? step.doneDesc : step.todoDesc}</span>
                  </span>
                  {#if step.done}
                    <span class="step-done-tag">
                      <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg
                      >
                      Done
                    </span>
                    <a class="step-open" href={step.href}>Open it</a>
                  {:else}
                    <span class="sr-only">not done</span>
                    <a class="step-act" href={step.href}>
                      {step.actionLabel}
                      <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg
                      >
                    </a>
                  {/if}
                </li>
              {/each}
            </ol>

            <div class="start-foot">
              <span>These steps follow what is really on your site.</span>
              <button type="button" onclick={hideSteps}>Hide these steps</button>
            </div>
          </div>
        </section>
      {/if}
    {/if}

    <!-- SECTION 2: formatting reference -->
    <section class="section" aria-labelledby="cairn-help-ref-eye">
      <div class="section-head">
        <div class="section-titles">
          <span class="eyebrow" id="cairn-help-ref-eye">Formatting</span>
          <h2 class="section-h">How to format text</h2>
        </div>
        <span class="section-meta">Type the characters on the left</span>
      </div>

      {#snippet refTable(caption: string, rows: MarkdownReferenceRow[])}
        <table class="ref-table">
          <caption>{caption}</caption>
          <thead>
            <tr><th scope="col">Type this</th><th scope="col">What it makes</th></tr>
          </thead>
          <tbody>
            {#each rows as row (row.syntax)}
              <tr>
                <th scope="row">{row.syntax}</th>
                <td>{row.makes}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/snippet}

      <div class="card ref-card">
        <div class="ref-cols">
          {@render refTable('Text', textRows)}
          {@render refTable('Links and lists', linkRows)}
        </div>

        <p class="ref-foot">
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            ><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg
          >
          <span
            >This same sheet opens beside the editor while you write. Press <span class="kbd"
              >Ctrl</span
            >
            <span class="kbd">/</span>.</span
          >
        </p>
      </div>
    </section>

    <!-- SECTION 3: get help -->
    <section class="section" aria-labelledby="cairn-help-eye">
      <div class="section-head">
        <div class="section-titles">
          <span class="eyebrow" id="cairn-help-eye">Get help</span>
          <h2 class="section-h">
            {support ? 'Ask the person who set up your site' : 'If you need more help'}
          </h2>
        </div>
      </div>

      <div class="card help-card">
        {#if !support}
          <div class="help-card-body">
            <p class="help-card-sub">
              Check the formatting guide above, or ask whoever set up your site.
            </p>
          </div>
        {:else if support.kind === 'text'}
          <div class="help-card-body">
            <p class="help-card-sub">Whoever set up your site left this note: {contact}</p>
          </div>
        {:else}
          <div class="help-card-body">
            <p class="help-card-sub">
              Whoever set up your site can change things you cannot change here, like the menu and
              who can sign in.
              {#if support.kind === 'email'}Reach them at <b>{contact}</b>.{:else}Find help at
                <b>{contact}</b>.{/if}
            </p>
          </div>
          {#if support.kind === 'email'}
            <a class="btn-quiet" href={support.href}>
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                ><rect x="2" y="4" width="20" height="16" rx="2" /><path
                  d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
                /></svg
              >
              Email support
            </a>
          {:else}
            <a class="btn-quiet" href={support.href} target="_blank" rel="noopener">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                ><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path
                  d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                /></svg
              >
              Get help
            </a>
          {/if}
        {/if}
      </div>
    </section>
  </div>
</div>

<style>
  /* The Help home content column. The styles consume the Warm Stone tokens the CairnAdminShell theme
     root owns; this block never redefines :root or [data-theme]. Ported from the rev.2 polished
     mockup (docs/internal/design/2026-06-23-help-shell-mockup-rev2-polished.html), adapted to the
     three co-equal eyebrow-plus-display sections and the derived getting-started state. */

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  .cairn-help-content {
    flex: 1 1 auto;
    padding: 2.75rem 2.5rem 3.5rem;
    overflow: auto;
  }
  .help-col {
    max-width: 58rem;
    margin: 0 auto;
    width: 100%;
  }

  .eyebrow {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  /* the masthead: a plain eyebrow over a real-sentence h1, the page's single display beat */
  .page-head {
    margin-bottom: 30px;
  }
  .page-h1 {
    font-family: var(--font-display);
    font-size: 1.875rem;
    font-weight: 700;
    letter-spacing: -0.025em;
    margin: 5px 0 0;
  }
  .page-lede {
    font-size: 0.9375rem;
    color: var(--color-muted);
    margin: 8px 0 0;
    max-width: 54ch;
    line-height: 1.55;
  }

  /* the shared section-head rhythm: an eyebrow over a display title, with an optional trailing meta */
  .section {
    margin-top: 36px;
  }
  .section-head {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 16px;
  }
  .section-titles {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .section-h {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.12;
    margin: 0;
  }
  .section-meta {
    margin-left: auto;
    align-self: center;
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  /* the floating-card recipe: rounded-box, hairline plus soft shadow, on base-100 */
  .card {
    border: 1px solid var(--cairn-card-border);
    border-radius: var(--radius-box);
    background: var(--color-base-100);
    box-shadow: var(--cairn-shadow);
    overflow: hidden;
  }

  /* SECTION 1: getting started */
  .start {
    padding: 22px 24px 18px;
  }
  /* the 0-of-3 empty state composition: the cairn mark presides above a warmer frame */
  .start-empty {
    background: color-mix(in oklab, var(--color-primary) 2.5%, var(--color-base-100));
  }
  .start-mark {
    flex: none;
    height: 40px;
    width: 40px;
    border-radius: 0.75rem;
    background: color-mix(in oklab, var(--color-primary) 12%, transparent);
    color: var(--color-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .start-mark svg {
    width: 22px;
    height: 22px;
  }
  .start-top {
    display: flex;
    align-items: flex-start;
    gap: 18px;
    flex-wrap: wrap;
  }
  .start-lead {
    flex: 1 1 20rem;
    min-width: 0;
  }
  .start-lead-sub {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin: 0;
    max-width: 46ch;
    line-height: 1.5;
  }

  /* the progress readout: the count is the source of truth, the bar is decorative only */
  .prog {
    flex: 0 0 auto;
    min-width: 11rem;
    text-align: right;
  }
  .prog-count {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-base-content);
  }
  .prog-count b {
    color: var(--color-positive-ink);
    font-weight: 700;
  }
  .prog-bar {
    height: 6px;
    border-radius: 999px;
    margin-top: 8px;
    background: color-mix(in oklab, var(--color-base-content) 8%, transparent);
    overflow: hidden;
  }
  .prog-bar > i {
    display: block;
    height: 100%;
    min-width: 6px;
    border-radius: 999px;
    background: var(--color-primary);
  }
  /* the 0-of-3 seed: a faint desaturated fill, so the rail reads as a track, never as progress */
  .prog-bar.is-seed > i {
    background: color-mix(in oklab, var(--color-base-content) 22%, transparent);
  }

  /* the steps: quiet rows inside the single card, never nested cards */
  .steps {
    list-style: none;
    margin: 18px 0 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .step {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 12px 14px;
    border: 1px solid var(--cairn-card-border);
    border-radius: 0.75rem;
    background: var(--color-base-100);
  }
  /* the unchecked ring is content-55% (about 3:1 on base-100), a control state perceivable on its
     own (WCAG 1.4.11), and kept a thin ring rather than a filled box so it never reads as checked */
  .step-box {
    flex: none;
    height: 24px;
    width: 24px;
    border-radius: 7px;
    border: 2px solid color-mix(in oklab, var(--color-base-content) 55%, transparent);
    background: var(--color-base-100);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: transparent;
  }
  .step-box svg {
    width: 13px;
    height: 13px;
  }
  .step-body {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .step-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-base-content);
  }
  .step-desc {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin-top: 2px;
    line-height: 1.45;
  }

  /* a not-done step routes to where it completes through its own short action link */
  .step-act {
    flex: none;
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 30px;
    padding: 0 12px;
    border: 1px solid var(--cairn-card-border);
    border-radius: var(--radius-field);
    background: var(--color-base-100);
    color: var(--color-primary);
    font: 600 0.78125rem/1 var(--font-body);
    cursor: pointer;
    text-decoration: none;
    transition: border-color 120ms ease, background-color 120ms ease;
  }
  .step-act:hover {
    border-color: color-mix(in oklab, var(--color-primary) 40%, var(--cairn-card-border));
    background: color-mix(in oklab, var(--color-primary) 6%, transparent);
  }
  .step-act svg {
    width: 13px;
    height: 13px;
  }

  /* the done state. The cue reaches three ways and never by color alone (WCAG 1.4.1): the filled
     glyph box, a visible "Done" tag, and the open step's sr-only "not done". A done step keeps a
     quiet "Open it" so every row carries an affordance. */
  .step.is-done {
    background: color-mix(in oklab, var(--color-positive-ink) 4%, var(--color-base-100));
  }
  .step.is-done .step-box {
    background: var(--color-positive-ink);
    border-color: var(--color-positive-ink);
    color: var(--color-primary-content);
  }
  .step.is-done .step-title {
    color: var(--color-muted);
  }
  .step-done-tag {
    flex: none;
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-positive-ink);
  }
  .step-done-tag svg {
    width: 13px;
    height: 13px;
  }
  .step-open {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font: 600 0.78125rem/1 var(--font-body);
    color: var(--color-muted);
    padding: 4px 6px;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .step-open:hover {
    color: var(--color-base-content);
  }

  .start-foot {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  .start-foot button {
    color: var(--color-muted);
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    font: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .start-foot button:hover {
    color: var(--color-base-content);
  }

  /* the restore affordance shown once the section is hidden */
  .start-restore {
    margin-top: 36px;
  }
  .start-restore button {
    color: var(--color-muted);
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    font: 500 0.8125rem/1 var(--font-body);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .start-restore button:hover {
    color: var(--color-base-content);
  }

  /* SECTION 2: formatting reference */
  .ref-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .ref-cols > table:first-child {
    border-right: 1px solid var(--cairn-card-border);
  }
  .ref-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .ref-table caption {
    text-align: left;
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--color-muted);
    padding: 16px 22px 6px;
  }
  .ref-table thead th {
    text-align: left;
    width: 50%;
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--color-muted);
    font-family: var(--font-body);
    padding: 6px 22px 10px;
    border-bottom: 1px solid color-mix(in oklab, var(--cairn-card-border) 70%, transparent);
  }
  .ref-table tbody tr + tr td,
  .ref-table tbody tr + tr th {
    border-top: 1px solid color-mix(in oklab, var(--cairn-card-border) 65%, transparent);
  }
  /* the "type this" cell renders the literal syntax in the iA Writer Mono editor face */
  .ref-table th[scope='row'] {
    font-weight: 400;
    text-align: left;
    padding: 10px 22px;
    font-family: var(--font-editor);
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--color-base-content);
    white-space: nowrap;
  }
  /* the "what it makes" cell: the plain gloss in the body face */
  .ref-table td {
    padding: 10px 22px;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--color-base-content);
  }

  /* the reference foot points at the present, working help beside the editor */
  .ref-foot {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 12px 22px;
    border-top: 1px solid var(--cairn-card-border);
    background: color-mix(in oklab, var(--color-base-content) 1.5%, transparent);
    font-size: 0.8125rem;
    color: var(--color-muted);
  }
  .ref-foot svg {
    width: 15px;
    height: 15px;
    flex: none;
    color: var(--color-muted);
  }
  .kbd {
    font-family: var(--font-editor);
    font-size: 0.6875rem;
    border: 1px solid var(--cairn-card-border);
    border-radius: 0.25rem;
    padding: 1px 5px;
    background: var(--color-base-100);
    color: var(--color-base-content);
  }

  /* SECTION 3: get help. A calm text-plus-action row, no decorative icon tile. */
  .help-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 20px;
  }
  .help-card-body {
    flex: 1 1 auto;
    min-width: 0;
  }
  .help-card-sub {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin: 0;
    line-height: 1.45;
    max-width: 48ch;
  }
  .help-card-sub b {
    color: var(--color-base-content);
    font-weight: 600;
  }

  /* a quiet bordered control (the get-help hand-off) */
  .btn-quiet {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border: 1px solid var(--cairn-card-border);
    border-radius: var(--radius-field);
    background: var(--color-base-100);
    color: var(--color-base-content);
    font: 600 0.8125rem/1 var(--font-body);
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
    transition: border-color 120ms ease, color 120ms ease;
  }
  .btn-quiet:hover {
    border-color: color-mix(in oklab, var(--color-primary) 38%, var(--cairn-card-border));
    color: var(--color-primary);
  }
  .btn-quiet svg {
    width: 15px;
    height: 15px;
  }

  @media (max-width: 900px) {
    .ref-cols {
      grid-template-columns: 1fr;
    }
    .ref-cols > table:first-child {
      border-right: 0;
      border-bottom: 1px solid var(--cairn-card-border);
    }
  }
  @media (max-width: 760px) {
    .cairn-help-content {
      padding: 1.75rem 1.25rem 2.5rem;
    }
    .start-top {
      flex-direction: column;
    }
    .prog {
      text-align: left;
      min-width: 0;
      width: 100%;
    }
    .step {
      flex-wrap: wrap;
    }
    .step-act,
    .step-done-tag,
    .step-open {
      margin-left: 37px;
    }
    .ref-table th[scope='row'] {
      white-space: normal;
    }
    .help-card {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .btn-quiet,
    .step-act {
      transition: none;
    }
  }
</style>
