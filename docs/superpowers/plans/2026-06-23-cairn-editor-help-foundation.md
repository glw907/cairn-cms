# Cairn editor-help foundation Implementation Plan

> **For agentic workers:** Execute this with the cairn model: dispatch each task to
> `cairn-implementer` (pinned Sonnet), test-first, and clear the full gate before the next
> dispatch; the main loop reviews each diff and verifies the gate. Steps use checkbox (`- [ ]`)
> syntax for tracking. Upshift a dispatch (`model: opus`) only for a task the plan does not fully
> specify.

**Goal:** Build the engine seams and design-system conventions the in-admin editor help depends on,
before the help itself, so the help lands on real capabilities instead of faked ones.

**Architecture:** A three-pass series sized by blast radius. Pass 1 (this plan, detailed) adds
additive contracts and conventions with a small blast radius: a per-field `description` channel, a
`supportContact` adapter field, and the design-system recipes the help shell needs. Pass 2 adds the
point-of-typing coach seam inside the CodeMirror editor. Pass 3 adds the advisory-validation channel
and the cross-branch address-uniqueness check on the publish path. Onboarding progress derives from
observable content and publish state, so it needs no new store.

**Tech Stack:** TypeScript, Svelte 5 runes, SvelteKit 2, DaisyUI v5 and Tailwind v4, CodeMirror 6,
Cloudflare Workers with D1 and R2, vitest (unit, integration, component).

## Global Constraints

- Svelte 5 runes, DaisyUI v5, Tailwind v4. Match `docs/internal/admin-design-system.md`, including
  the load-bearing rules (`data-theme` on a bare wrapper, scoped overrides in `@layer components`,
  theme-adaptive `--cairn-card-border` and `--cairn-shadow`).
- All user-facing copy meets the voice standard, enforced by `npm run check:prose`: plain, one idea
  per sentence, no em dashes, no "not X but Y" frame, no tacked-on closers, name the concept. Author
  language, never engine language.
- Accessibility holds the admin bar: the non-modal `role="region"` slide-over recipe, focus moved in
  on open and restored on close, Escape closes, live regions announce on fill not per keystroke, the
  WCAG contrast floors and ink tokens.
- Test-first. The full gate per task: `npm run check` 0 errors and 0 warnings, `npm test` exits 0
  (a passing assertion count is not enough; an unhandled rejection can exit 1 on green tests).
- Run on a fresh worktree off `main`, not the `main` checkout.
- Field descriptors are plain serializable data (a `load` hands them to the client), so any new field
  property must stay JSON-serializable.

---

## The pass series

Sized by blast radius so each pass has one verification surface and its own reviewer gate.

- **Pass 1, contracts and conventions** (this plan): the field-description channel, the
  `supportContact` adapter field, the design-system help recipes, and the date field's
  publish-clarity default. Additive, low risk, unblocks the most.
- **Pass 2, the point-of-typing coach seam** (sketched below): the CodeMirror writing-coach
  decoration with a fire-once seen-flag and an announce-once live region. Editor-internal. Svelte and
  a11y reviewers.
- **Pass 3, advisory validation and address collisions** (sketched below): the per-field advisory
  channel (warn and allow) and the cross-branch address-uniqueness check. Publish path. Web-auth and
  Cloudflare reviewers.

After the foundation: the help pass (the standing Help home, the slide-over, the woven layer, the
corpus, all rendering from one help manifest). The starter-content seed rides the `create-cairn-site`
scaffolder. The prose corpus and a rev.2 mockup proceed in parallel with the foundation. The
deficiencies these passes close are in `docs/internal/docs-friction-log.md`; the design artifacts are
under `docs/internal/design/2026-06-23-editor-help-*`.

**Settled decisions:** onboarding progress derives from observable content and publish state, so no
D1 progress row and no schema migration; `localStorage` carries only per-device UI dismissals.
Address collision warns and allows publish.

---

## Pass 1, Task 1: the field-description channel

A site can attach one author-facing sentence to any frontmatter field. The Details panel renders it
under the input and associates it for assistive technology. This is the Sanity and Contentful pattern,
and it is the broadest help affordance the design pass surfaced.

**Files:**
- Modify: `src/lib/content/types.ts` (the `FieldBase` interface, lines 18-25).
- Modify: `src/lib/components/EditPage.svelte` (the details-panel field loop that renders each
  concept field's label and input).
- Test: `src/tests/component/edit-page-field-hint.test.ts` (a new component test in the browser
  project).

**Interfaces:**
- Produces: `FieldBase.description?: string`. Because every field type extends `FieldBase` and the
  schema projects `fields: FrontmatterField[]` as plain data (`src/lib/content/schema.ts:64`), the
  value reaches the editor form with no further threading. It is validation-irrelevant: `applyRules`
  and `validateFields` ignore it.

- [ ] **Step 1: Write the failing component test**

In `src/tests/component/edit-page-field-hint.test.ts`, render the edit form with a concept whose
schema has a text field carrying a `description`, and a second field with none. Assert:

```ts
// A field with a description renders the hint and associates it.
const hint = page.getByText('Shown in search results and when the post is shared.');
await expect.element(hint).toBeInTheDocument();
const summary = page.getByRole('textbox', { name: 'Summary' });
await expect.element(summary).toHaveAttribute('aria-describedby', expect.stringContaining('summary'));
// The hint id the input points at is the hint element's id.
// A field with no description renders no hint and sets no aria-describedby.
const title = page.getByRole('textbox', { name: 'Title' });
await expect.element(title).not.toHaveAttribute('aria-describedby');
```

Build the concept fixture with `defineFields([{ name: 'title', label: 'Title', type: 'text' }, { name: 'summary', label: 'Summary', type: 'text', description: 'Shown in search results and when the post is shared.' }])`, mounted the way the existing edit-page component tests mount the form (follow the nearest existing test under `src/tests/component/` for the mount and the details-panel open).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --project component edit-page-field-hint`
Expected: FAIL. The `description` property is a type error on the fixture, and no hint renders.

- [ ] **Step 3: Add `description` to `FieldBase`**

In `src/lib/content/types.ts`, add the property to `FieldBase`:

```ts
interface FieldBase {
  /** Frontmatter key and form input name. */
  name: string;
  /** Form label. */
  label: string;
  /** A required field fails validation when empty (spec §7.4). */
  required?: boolean;
  /**
   * One author-facing sentence shown under the field in the editor, in plain end-user language.
   * Optional; render nothing when absent. Not a validation rule.
   */
  description?: string;
}
```

- [ ] **Step 4: Render the hint and associate it in the Details panel**

In `src/lib/components/EditPage.svelte`, in the per-field block of the details-panel field loop,
after the field's input, render the hint and point the input at it only when a description is set.
The hint id derives from the field name so it is stable and unique:

```svelte
{#if field.description}
  <p id={`${field.name}-hint`} class="fld-hint mt-1 text-sm text-[var(--color-muted)]">
    {field.description}
  </p>
{/if}
```

Add `aria-describedby={field.description ? `${field.name}-hint` : undefined}` to the field's input
element. The hint sits outside the `<label>` element's name computation, so it describes the field
without bloating its accessible name. Apply the same to the textarea, date, tags, freetags, and
boolean inputs in the loop; the image field's help stays with `MediaHeroField`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- --project component edit-page-field-hint`
Expected: PASS.

- [ ] **Step 6: Gate and commit**

Run: `npm run check` (0/0) and `npm test` (exits 0).

```bash
git add src/lib/content/types.ts src/lib/components/EditPage.svelte src/tests/component/edit-page-field-hint.test.ts
git commit -m "feat: add an author-facing description channel to frontmatter fields"
```

---

## Pass 1, Task 2: the supportContact adapter field

A site can declare one contact a stuck editor is pointed to. The help renders the hand-off only when
it is set, so there is never a button to a blank `mailto`.

**Files:**
- Modify: `src/lib/content/types.ts` (the `CairnAdapter` interface).
- Modify: `src/lib/content/runtime.ts` or the composition module that builds `CairnRuntime` from the
  adapter (the `composeRuntime` aggregation point; grep for `composeRuntime` and follow where
  `siteName` is copied from the adapter onto the runtime).
- Test: extend the nearest existing `composeRuntime` unit test under `src/tests/unit/`.

**Interfaces:**
- Produces: `CairnAdapter.supportContact?: string` and `CairnRuntime.supportContact?: string`. A
  free-form string (an email, a URL, or a name and instruction), passed through verbatim. The help
  reads it from the runtime in the later help pass; this task only carries it.

- [ ] **Step 1: Write the failing unit test**

In the `composeRuntime` unit test, add a case: an adapter with `supportContact: 'help@example.org'`
produces a runtime whose `supportContact` is `'help@example.org'`, and an adapter that omits it
produces a runtime whose `supportContact` is `undefined`.

```ts
expect(composeRuntime({ ...baseAdapter, supportContact: 'help@example.org' }).supportContact)
  .toBe('help@example.org');
expect(composeRuntime(baseAdapter).supportContact).toBeUndefined();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --project unit composeRuntime`
Expected: FAIL. `supportContact` is a type error on the adapter and is absent on the runtime.

- [ ] **Step 3: Add the field to the adapter and the runtime**

In `src/lib/content/types.ts`, add to `CairnAdapter` (beside `sender`):

```ts
  /**
   * Optional contact a stuck editor is pointed to from the in-admin help (an email address, a URL,
   *  or a name and instruction). The help renders the hand-off only when this is set. Plain string,
   *  passed through verbatim.
   */
  supportContact?: string;
```

Add the same property to `CairnRuntime`, and copy it through in `composeRuntime` alongside
`siteName`:

```ts
  supportContact: adapter.supportContact,
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --project unit composeRuntime`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `npm run check` (0/0) and `npm test` (exits 0).

```bash
git add src/lib/content/types.ts src/lib/content/runtime.ts src/tests/unit/<composeRuntime test file>
git commit -m "feat: carry an optional supportContact from the adapter onto the runtime"
```

---

## Pass 1, Task 3: the design-system help recipes (docs)

Document the conventions the help shell will follow, so the shell is built right the first time and a
future surface cannot pick the wrong pattern. Docs-only: no engine test, but the change runs the doc
gates and the prose bar.

**Files:**
- Modify: `docs/internal/admin-design-system.md` (add a "Help surfaces" subsection under the component
  recipes).

**Steps:**

- [ ] **Step 1: Add the five recipes**

Add a "Help surfaces" subsection to `admin-design-system.md` stating each rule, in the doc's existing
voice:

1. **A help or reference panel is a non-modal `role="region"` with an `aria-label`, no scrim.** It
   reuses the details-slide-over geometry (`top:64px; right:0; bottom:0`, `19rem`, hairline-plus-shadow,
   on `base-200`). Focus moves in on open and back to the trigger on close; a window Escape closes it;
   it leaves the a11y tree and the tab order via the `hidden` attribute when closed. Only a destructive
   or commit surface is a modal `<dialog>`. A help cheat sheet is not destructive, so it is non-modal.
2. **The right slide-over region holds one panel at a time.** Help and the Details panel claim the
   same slot, so opening one closes the other. State this so two right panels never stack.
3. **The disclosure button for a slide-over** carries `aria-haspopup="dialog"` (or
   `aria-controls` for the non-modal region) and an `aria-expanded` mirrored from open state, and a
   visible text label at its primary home. A bare glyph is allowed only for a secondary, contextual
   instance, never as the sole standing trigger.
4. **The getting-started progress recipe** is built from the existing segmented check-and-tint
   control and the `--color-positive-ink` token: a short checklist, each item glyph-backed when done
   (never color alone, WCAG 1.4.1), the count carried in text with the visual bar as
   `role="presentation"`. Steps derive from observable content and publish state, so the recipe shows
   a real count, never a stored one.
5. **The empty-state recipe gains an optional starter-content slot:** beside the create CTA, a site
   may surface labeled, openable starter entries. The label marks them as starters so they read as
   removable, not as the author's own work.

- [ ] **Step 2: Run the doc gates**

Run: `npm run check:docs` (the link gate) and `npm run check:prose` (the voice gate). Both exit 0.

- [ ] **Step 3: Commit**

```bash
git add docs/internal/admin-design-system.md
git commit -m "docs: add the help-surface recipes to the admin design system"
```

---

## Pass 1, Task 4: the date field publish-clarity default

The date field reads as if it might schedule publishing, so the design pass had to write reassurance
copy on each site (the "it does not publish on its own" crutch). Ship one built-in, overridable
default so every site gets the clarity for free and no per-site copy is load-bearing. This is the
in-place clarity fix; a deeper affordance change is not warranted at this severity.

**Files:**
- Modify: `src/lib/components/EditPage.svelte` (the per-field hint rendering from Task 1, the date
  branch).
- Test: extend `src/tests/component/edit-page-field-hint.test.ts`.

**Interfaces:**
- Consumes: Task 1's per-field hint rendering and `aria-describedby` wiring. Land Task 1 first.
- Produces: a `date` field with no `description` renders a built-in default hint; a `date` field with
  a `description` renders the site's, not the default; non-date fields are unchanged.

- [ ] **Step 1: Write the failing test (extend the Task 1 test)**

Add cases to `edit-page-field-hint.test.ts`. Declare one `date` field with no `description` and a
second `date` field with `description: 'Custom date help.'`, then assert:

```ts
// A date field with no description shows the built-in publish-clarity default.
const dateDefault = page.getByText('Sets the date for this post. Publishing is a separate step you choose.');
await expect.element(dateDefault).toBeInTheDocument();
const dateInput = page.getByLabelText('Date');
await expect.element(dateInput).toHaveAttribute('aria-describedby', expect.stringContaining('date'));
// A date field with a description shows the site's copy, not the default.
await expect.element(page.getByText('Custom date help.')).toBeInTheDocument();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --project component edit-page-field-hint`
Expected: FAIL. The date field shows no hint until the default is added.

- [ ] **Step 3: Add the date default to the hint rendering**

In `EditPage.svelte`, define the default once near the field loop:

```ts
const DATE_PUBLISH_HINT = 'Sets the date for this post. Publishing is a separate step you choose.';
```

In the per-field block, a date field carries a hint that falls back to the default when the site sets
no `description`:

```svelte
{#if field.description || field.type === 'date'}
  <p id={`${field.name}-hint`} class="fld-hint mt-1 text-sm text-[var(--color-muted)]">
    {field.description ?? (field.type === 'date' ? DATE_PUBLISH_HINT : '')}
  </p>
{/if}
```

Set `aria-describedby` to the hint id when `field.description || field.type === 'date'`. Non-date
fields keep the Task 1 behavior (a hint only when a description is set).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --project component edit-page-field-hint`
Expected: PASS.

- [ ] **Step 5: Check the default copy against the voice bar**

Run: `npm run check:prose`. The built-in default is admin copy the gate scans, so it must clear the
voice bar (exits 0).

- [ ] **Step 6: Gate and commit**

Run: `npm run check` (0/0) and `npm test` (exits 0).

```bash
git add src/lib/components/EditPage.svelte src/tests/component/edit-page-field-hint.test.ts
git commit -m "feat: give the date field a built-in publish-clarity hint"
```

---

## Pass 1 exit criteria

`npm run check` 0/0, `npm test` exits 0, `check:docs` and `check:prose` pass. The field-description
channel renders and associates a hint; `supportContact` reaches the runtime; the five help recipes are
in the design system; the date field carries a built-in publish-clarity default. Run the code-simplifier over the changed code, fan out the svelte and a11y
reviewers (Task 1 touches the editor form), update `CHANGELOG.md` and the adapter reference for the two
new adapter and field properties (both additive, no `Consumers must:` line), and append any friction
the work surfaces.

---

## Pass 2 (sketch): the point-of-typing coach seam

Detail this just-in-time after Pass 1 lands. Scope: a CodeMirror seam in
`src/lib/components/MarkdownEditor.svelte` (and its editor modules) that teaches markdown where the
author types it, the one strength no competitor holds.

- A decoration that detects the first formatting attempt per editor (the first `## ` on a line, say)
  and pins a quiet widget at the caret line, in the gutter or as a non-overlapping inline widget, never
  a shadowed card over the measure.
- Fire-once: a per-editor `localStorage` seen-flag, so it shows once and never nags. Per-device is fine;
  seeing it once more on a new device is harmless.
- A debounced, announce-once polite live region, modeled on the `MediaPicker` and tidy settle-cue
  discipline, so it never clobbers on every keystroke.
- An Escape and next-keystroke dismiss, with the dismiss control keyboard-reachable, following the
  `MediaInsertPopover` at-caret focus precedent.

Reviewers: svelte, daisyui-a11y. The live-region discipline is the closest-review part. Friction-log
entries: the coach decoration seam and its trigger discipline.

## Pass 3 (sketch): advisory validation and address collisions

Detail this just-in-time after Pass 2 lands. Scope: a per-field advisory channel and a real
cross-branch address check, both warn-and-allow.

- An advisory-validation surface in the editor, distinct from the hard commit gates: a field can carry
  a non-blocking warning the author publishes past (the missing social image is the existing model;
  the address collision is the new one). It never gates Publish.
- A cross-branch address-uniqueness check that unions `main` and every open `cairn/*` branch, reusing
  the media usage-index union-across-branches pattern, so the warning "another post already uses this
  address" is real, not cosmetic.
- The collision stays last-write-wins at publish (the settled decision), but the warning makes it
  visible and honest ("the newer one will win") instead of silent.

Reviewers: web-auth-security (the publish path), cloudflare-workers (the cross-branch read), svelte,
daisyui-a11y. Friction-log entries: the advisory channel and the silent last-write-wins behavior.

---

## Self-review

- **Coverage.** Pass 1 closes four friction-log items (the field-description channel, the
  support-contact field, the design-system help recipes, and the date-versus-publish clarity). Passes 2 and 3 are scoped to the remaining
  engine seams; the help manifest, the Help shell, and the corpus are the help pass after the
  foundation; the starter seed rides the scaffolder.
- **No placeholders.** Each Pass 1 task carries the real type change, the test intent with assertions,
  and exact files. The EditPage field-loop wiring is specified as the hint markup plus the
  `aria-describedby` attribute, applied to the existing per-field inputs.
- **Type consistency.** `description` lands once on `FieldBase` and flows through the existing
  `fields` projection. `supportContact` lands on both `CairnAdapter` and `CairnRuntime` and is copied
  in `composeRuntime`. The names match across the tasks.
