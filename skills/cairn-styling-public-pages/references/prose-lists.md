# Lists

Bulleted, numbered, and task lists. Bullets are discs by default, and numbers are a counter in the display face.

Rendered markup:

```html
<div class="prose">
  <ul><li>First</li><li>Second</li></ul>
  <ol><li>One</li><li>Two</li></ol>
  <ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"> Done</li></ul>
</div>
```

Reads:

- Item spacing reads `--spacing-2xs`. Numbers read `--font-display` and `--color-primary`. A task checkbox reads `--color-primary` as its accent.

Override seams:

- The diamond bullet is the opt-in `data-flourish` attribute on the `.prose` root, so it is off by default.
- A task list drops its marker and its indent, so the checkbox sits at the left edge of the column.
