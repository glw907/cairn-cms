# Exemplar: the plain-class kit

The kit a custom admin screen is written in: plain daisyUI classes plus cairn's role utilities
(`type-*`, `gap-*`, `card-shell`, `rounded-*`), with no per-element idiom and no `<style>` block.
The theme layer carries the look, so every fence below renders correctly as written. Copy the
class strings, not a remembered variant of them.

The page heading is not excerpted here. The `page-title` row of the recipe table in `../SKILL.md`
gives its three classes.

## Buttons

One accent-filled `btn-primary` per surface; the other buttons are the quieter rungs of the
ladder. A disabled button and a small button take only `disabled` and `btn-sm`.

```svelte
<div class="flex flex-wrap items-center gap-control">
  <button class="btn">Plain</button>
  <button class="btn btn-ghost">Ghost</button>
  <button class="btn btn-neutral">Neutral</button>
  <button class="btn btn-primary">Primary</button>
  <button class="btn btn-soft btn-primary">Soft primary</button>
  <button class="btn btn-error">Error</button>
  <button class="btn" disabled>Disabled</button>
  <button class="btn btn-sm">Small</button>
  <button class="btn btn-outline">Outline</button>
  <button class="btn btn-outline btn-active">
    Outline active
  </button>
</div>
```

## Joins

A join is a segmented control. The selected segment takes `btn-active`, or one of the other
selected forms (`aria-current`, a checked radio); a color variant keeps its own fill when
selected.

```svelte
<div class="join">
  <button class="join-item btn">One</button>
  <button class="join-item btn btn-active">Two</button>
  <button class="join-item btn" aria-current="page">Three</button>
</div>
```

```svelte
<div class="join">
  <button class="join-item btn">Draft</button>
  <button class="join-item btn btn-primary btn-active">
    Published
  </button>
</div>
```

```svelte
<div class="join" role="radiogroup" aria-label="Radio join">
  <input
    class="join-item btn"
    type="radio"
    name="tk-radio-join"
    aria-label="First"
    checked
  />
  <input class="join-item btn" type="radio" name="tk-radio-join" aria-label="Second" />
</div>
```

## Alerts

A bare alert and the four colors. An error alert that carries a heading line, a detail line, and
a link stacks its children with the classes below.

```svelte
<section class="flex flex-col gap-group" aria-label="Alerts">
  <div class="alert">A bare alert.</div>
  <div
    class="alert alert-error mb-4 max-sm:grid-flow-row max-sm:grid-cols-1 items-start type-body"
  >
    <p class="m-0 font-medium">This entry could not be deleted.</p>
    <p class="m-0">
      1 page now links to it.
      <a class="link" href="/admin/posts">Review the link</a>
    </p>
  </div>
  <div class="alert alert-warning">A warning alert.</div>
  <div class="alert alert-success">A success alert.</div>
  <div class="alert alert-info">An info alert.</div>
</section>
```

## Controls

A switch, a checkbox, and a radio are each a bare class inside a label that owns the text. A
colored toggle adds only its color modifier.

```svelte
<section class="flex flex-wrap items-center gap-group" aria-label="Controls">
  <label class="flex items-center gap-control">
    <input type="checkbox" class="toggle" checked />
    <span class="type-body">Checked switch</span>
  </label>
  <label class="flex items-center gap-control">
    <input type="checkbox" class="toggle" />
    <span class="type-body">Unchecked switch</span>
  </label>
  <label class="flex items-center gap-control">
    <input type="checkbox" class="toggle toggle-primary" checked />
    <span class="type-body">Colored toggle</span>
  </label>
  <label class="flex items-center gap-control">
    <input type="checkbox" class="checkbox" />
    <span class="type-body">Unchecked checkbox</span>
  </label>
  <label class="flex items-center gap-control">
    <input type="checkbox" class="checkbox" checked />
    <span class="type-body">Checked checkbox</span>
  </label>
  <label class="flex items-center gap-control">
    <input type="radio" name="tk-standalone-radio" class="radio" />
    <span class="type-body">Unchecked radio</span>
  </label>
  <label class="flex items-center gap-control">
    <input type="radio" name="tk-standalone-radio" class="radio" checked />
    <span class="type-body">Checked radio</span>
  </label>
</section>
```

## A chip, a field, and a card

A chip is a bare `badge`; the corner ladder and the theme give it its shape. A field is a label
that owns a `type-body font-medium` caption over a bare `input`. A card is `card-shell` with its
own padding.

```svelte
<span class="badge">Chip</span>

<label class="flex flex-col gap-label">
  <span class="type-body font-medium">Label</span>
  <input class="input" />
</label>

<div class="card-shell p-4">
  <p class="type-body">Card</p>
</div>
```
