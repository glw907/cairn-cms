<!-- @component The G1 fixture screen: an owner-only, no-nav proof that a custom admin route
written only in plain daisyUI classes and cairn's role utilities (`type-*`, `gap-*`, `card-shell`,
`rounded-*`) gets a consistent look with no per-element idiom of its own. Every probed element
carries a stable `data-testid`, read by `theme-kit.spec.ts` and the `admin-visual` captures; no
`<style>` block anywhere on the page (spec, "G1: a consistent look by default"). The page heading
carries `font-[550]`, the one arbitrary value the ratified page heading itself uses (PageHeader's
own `.page-h1`), since no plain Tailwind weight utility lands on 550. -->
<svelte:head>
  <title>Theme kit</title>
</svelte:head>

<div class="max-w-3xl mx-auto card-shell p-6" data-testid="tk-root">
  <h1 class="type-title font-[550]">Theme kit</h1>

  <div class="flex flex-col gap-section">
    <section
      class="flex flex-col gap-group"
      aria-label="Buttons and joins"
      data-testid="tk-buttons"
    >
      <div class="flex flex-wrap items-center gap-control">
        <button class="btn" data-testid="tk-btn-plain">Plain</button>
        <button class="btn btn-ghost" data-testid="tk-btn-ghost">Ghost</button>
        <button class="btn btn-neutral" data-testid="tk-btn-neutral">Neutral</button>
        <button class="btn btn-primary" data-testid="tk-btn-primary">Primary</button>
        <button class="btn btn-soft btn-primary" data-testid="tk-btn-soft-primary"
          >Soft primary</button
        >
        <button class="btn btn-error" data-testid="tk-btn-error">Error</button>
        <button class="btn" disabled data-testid="tk-btn-disabled">Disabled</button>
        <button class="btn btn-sm" data-testid="tk-btn-sm">Small</button>
        <!-- Review focus 2's host-order probes: an uncolored outline stays daisyUI's own edge, and
             a selected outline keeps rule 11's ink, in either host-sheet order. -->
        <button class="btn btn-outline" data-testid="tk-btn-outline">Outline</button>
        <button class="btn btn-outline btn-active" data-testid="tk-btn-outline-active">
          Outline active
        </button>
      </div>

      <div class="join" data-testid="tk-join-ladder">
        <button class="join-item btn" data-testid="tk-join-ladder-plain">One</button>
        <button class="join-item btn btn-active" data-testid="tk-join-ladder-active">Two</button>
        <button class="join-item btn" aria-current="page" data-testid="tk-join-ladder-current"
          >Three</button
        >
      </div>

      <div class="join" data-testid="tk-join-color">
        <button class="join-item btn" data-testid="tk-join-color-plain">Draft</button>
        <button class="join-item btn btn-primary btn-active" data-testid="tk-join-color-selected">
          Published
        </button>
      </div>

      <div class="join" role="radiogroup" aria-label="Radio join" data-testid="tk-radio-join">
        <input
          class="join-item btn"
          type="radio"
          name="tk-radio-join"
          aria-label="First"
          checked
          data-testid="tk-radio-join-first"
        />
        <input
          class="join-item btn"
          type="radio"
          name="tk-radio-join"
          aria-label="Second"
          data-testid="tk-radio-join-second"
        />
      </div>
    </section>

    <section class="flex flex-col gap-group" aria-label="Alerts" data-testid="tk-alerts">
      <div class="alert" data-testid="tk-alert-bare">A bare alert.</div>
      <!-- The exact refusal-banner shape ConceptList.svelte:330 renders: an error alert carrying a
           nested link, so the fixture proves the same markup the office list uses. -->
      <div
        class="alert alert-error mb-4 max-sm:grid-flow-row max-sm:grid-cols-1 items-start type-body"
        data-testid="tk-alert-error"
      >
        <p class="m-0 font-medium">This entry could not be deleted.</p>
        <p class="m-0">
          1 page now links to it.
          <a class="link" href="/admin/posts" data-testid="tk-alert-error-link">Review the link</a>
        </p>
      </div>
      <div class="alert alert-warning" data-testid="tk-alert-warning">A warning alert.</div>
      <div class="alert alert-success" data-testid="tk-alert-success">A success alert.</div>
      <div class="alert alert-info" data-testid="tk-alert-info">An info alert.</div>
    </section>

    <section
      class="flex flex-wrap items-center gap-group"
      aria-label="Controls"
      data-testid="tk-controls"
    >
      <label class="flex items-center gap-control">
        <input type="checkbox" class="toggle" checked data-testid="tk-switch-checked" />
        <span class="type-body">Checked switch</span>
      </label>
      <label class="flex items-center gap-control">
        <input type="checkbox" class="toggle" data-testid="tk-switch-unchecked" />
        <span class="type-body">Unchecked switch</span>
      </label>
      <label class="flex items-center gap-control">
        <input
          type="checkbox"
          class="toggle toggle-primary"
          checked
          data-testid="tk-toggle-primary"
        />
        <span class="type-body">Colored toggle</span>
      </label>
      <label class="flex items-center gap-control">
        <input type="checkbox" class="checkbox" data-testid="tk-checkbox-unchecked" />
        <span class="type-body">Unchecked checkbox</span>
      </label>
      <label class="flex items-center gap-control">
        <input type="checkbox" class="checkbox" checked data-testid="tk-checkbox-checked" />
        <span class="type-body">Checked checkbox</span>
      </label>
      <label class="flex items-center gap-control">
        <input
          type="radio"
          name="tk-standalone-radio"
          class="radio"
          data-testid="tk-radio-unchecked"
        />
        <span class="type-body">Unchecked radio</span>
      </label>
      <label class="flex items-center gap-control">
        <input
          type="radio"
          name="tk-standalone-radio"
          class="radio"
          checked
          data-testid="tk-radio-checked"
        />
        <span class="type-body">Checked radio</span>
      </label>
    </section>

    <section
      class="flex flex-wrap items-end gap-group"
      aria-label="Chip, field, and card"
      data-testid="tk-misc"
    >
      <span class="badge" data-testid="tk-chip">Chip</span>

      <label class="flex flex-col gap-label" data-testid="tk-field">
        <span class="type-body font-medium">Label</span>
        <input class="input" data-testid="tk-field-input" />
      </label>

      <div class="card-shell p-4" data-testid="tk-card">
        <p class="type-body">Card</p>
      </div>
    </section>

    <!-- daisyUI's own `.modal-box` is `opacity: 0; scale: .95` at rest, visible only nested
         inside an open `.modal`. This fixture renders the box standalone to prove its warm
         shadow, so `opacity-100 scale-100` (plain Tailwind utilities, unlayered against
         daisyUI's nested component layer) hold it visible on its own. -->
    <div class="modal-box opacity-100 scale-100" data-testid="tk-modal-box">
      <p class="type-body">A statically open modal.</p>
    </div>

    <div class="dropdown" class:dropdown-open={true} data-testid="tk-dropdown">
      <button
        type="button"
        class="btn"
        aria-expanded="true"
        aria-controls="tk-dropdown-menu"
        data-testid="tk-dropdown-trigger"
      >
        Menu
      </button>
      <ul
        id="tk-dropdown-menu"
        class="dropdown-content menu bg-base-100 rounded-box p-2"
        data-testid="tk-dropdown-content"
      >
        <li><a href="/admin/posts" data-testid="tk-dropdown-item">Item one</a></li>
        <li><a href="/admin/posts">Item two</a></li>
      </ul>
    </div>
  </div>
</div>
