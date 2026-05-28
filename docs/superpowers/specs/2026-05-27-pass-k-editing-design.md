# Pass K design: differentiated editing, component palette, formatting toolbar, preview toggle

**Date:** 2026-05-27
**Initiative:** cairn-cms (see `docs/PLAN.md`)
**Covers:** R4 (differentiated editing), R10/R10a (component palette), R11 (formatting toolbar), R12 (preview toggle).
**Parent spec:** `docs/superpowers/specs/2026-05-26-admin-ui-design.md` (the holistic admin requirements).

## Purpose

Pass J gave the admin a collections-first IA and a per-collection entries list. Pass K turns the
editor itself into a differentiated, capable surface: page versus story editing, an insert-component
palette driven by the site registry, the standard formatting toolbar, and a toggleable site preview.
This is the in-editor experience pass. It reuses things that already exist (the component registry
and `insertTemplate` from the render extraction, Carta's built-in toolbar) and adds one small adapter
field plus editor UI. It deliberately stops at the adapter-contract line: the icon and asset pickers
(R9), which need a new adapter contract and a GitHub asset-listing read path, are the next pass (K2),
and navigation-tree management is scheduled separately (Pass L, below).

## Scope decision (sized for one effective pass)

The five editor requirements split at the adapter-contract boundary:

- **Pass K (this spec):** R4 + R10 + R11 + R12. All touch `EditPage`/`editLoad`, reuse the existing
  registry, and establish the cursor-insert pattern. No new read path, one tiny contract addition.
- **Pass K2 (later):** R9 icon and asset pickers. New adapter contract (asset roots, public URL base,
  icon-set exposure) and a GitHub contents-API listing read path, plus DaisyUI modal pickers. Reuses
  the cursor-insert pattern Pass K establishes.

Rationale: R9 is the heaviest piece and the only one that adds a new contract and a new read path.
Keeping it out leaves Pass K as a coherent, reviewable editor change.

## Research that shaped R4

Surveyed how established CMSes differentiate the editing experience between content types:

| System | Kind declared? | UI changes between types | Taxonomy conditional on type |
|---|---|---|---|
| Decap / Sveltia | Yes (`folder` vs `files`) | Minimal (only the create affordance) | No, field-driven |
| WordPress | Yes (`supports`, `taxonomies`) | Substantial (different sidebar panels) | Yes, declarative per post type |
| Ghost | Yes (`page` boolean) | Minimal (same panel, one toggle) | Soft (tags assignable, hidden from archives) |
| Keystatic | Yes (`collection`/`singleton`, `entryLayout`) | Yes (form stack vs content-forward) | No, field-driven |
| TinaCMS | No (inference only) | No (always a form stack) | No, field-driven |

Takeaways applied below: declare the kind explicitly (every system but Tina does, and Tina is the
outlier with no kind-specific guidance); WordPress shows that the declared type can drive which
metadata appears (posts get date and taxonomy, pages get page attributes like parent and order);
Keystatic's `entryLayout: 'content'` is the right shape for a markdown CMS, a prominent body editor
with frontmatter in a side column.

User direction that further shaped R4:

- Pages tend toward complex, highly formatted content (the directive components); stories tend toward
  pure Markdown. This is a tendency, not a rule: pages can be simple and stories can carry formatting.
  So `kind` must never gate editing capability. The palette and the formatting toolbar are available to
  both kinds; `kind` shifts only emphasis and defaults.
- The most obvious real difference is slugs and navigation. Stories are dated feed entries; pages are
  navigation-placed with path-like, stable slugs. So `kind` drives slug and identity treatment, and
  pages can carry navigation metadata.

## R4: differentiated editing

Add an optional `kind` to the collection contract:

```ts
// in CairnCollection
kind?: 'page' | 'story';   // absent => 'story' (the feed default; keeps existing sites working)
```

`kind` drives exactly two things and never gates capability:

1. **Slug and identity treatment.**
   - `story`: a dated feed entry. The "New entry" flow composes the id as `YYYY-MM-DD-slug` from a date
     input plus a title-derived stem, and the editor header surfaces the date as the organizing element.
   - `page`: a path-like, stable slug. The "New entry" flow takes a plain slug stem (no date), and the
     header presents the slug as the page's stable identity.
   - The filename-based id from Pass E already supports both shapes. This pass adds the create-time
     composition and the presentation; it does not introduce a slug codec.

2. **Metadata emphasis (one content-forward layout for both kinds).**
   - The editor adopts a Keystatic-style content-forward layout: the Carta editor is the prominent
     element, and the frontmatter fields sit in a side column (DaisyUI grid; collapses to stacked on
     narrow screens). One layout serves both kinds.
   - The kind difference is only in what populates the metadata column, which already falls out of the
     adapter's per-collection `fields` (date and tags for stories, slug and nav-label for pages). No
     per-kind layout fork.

Pages may carry navigation metadata (for example a nav label and an order) as ordinary adapter
`fields`. This needs no new contract and demonstrates the seam. Actual nav-tree placement is Pass L.

## Editor engine: stay on Carta, behind a thin interface (P3 reassessment)

Risk #17 named this pass as the point to reassess Carta, because the R10 palette needs a reliable
cursor-insert hook and the thin `MarkdownEditor` interface (decision P3) was deferred to the editor
pass. Both were checked here against the installed `carta-md@4.11.2` types.

**Finding: Carta's hooks are sufficient.** `carta.input` (an `InputEnhancer` over the textarea)
exposes, as public API:

- `insertAt(position, string)`: direct cursor insertion. This is the hook the palette needs.
- `getSelection(): TextSelection` (`{ start, end, slice, direction }`): the current cursor or selection.
- `toggleSelectionSurrounding(delimiter)` and `toggleLinePrefix(prefix)`: formatting primitives.
- `getCursorXY()` and `bindToCaret(el)`: caret positioning, if a caret-anchored menu is ever wanted.

Carta also has a real extension API (`Plugin`): custom `icons` (toolbar buttons) and `components`
mounted into `editor`/`input`/`renderer`/`preview`. The palette does not need it; a cairn-owned
DaisyUI control calling `carta.input.insertAt` is simpler and keeps the control in our component tree.

**Correction to record:** the plan and ARCHITECTURE docs describe Carta as "a thin wrapper over
CodeMirror 6." That is wrong. Carta is textarea-based (`InputEnhancer` over an `HTMLTextAreaElement`).
The fallback reasoning still holds in spirit (Carta wraps a swappable lower editing layer), but the
fallback is "drop to a bare editor," not "drop to CM6, which Carta already uses." Fix this note in
`docs/PLAN.md` (risk #17) and `docs/ARCHITECTURE.md` at close-out.

**Decision: stay on Carta and introduce the thin `MarkdownEditor` interface now** (the locked P3
decision). The interface is small, because the only Carta coupling the palette adds is the cursor
seam:

```ts
// the seam a future engine swap would reimplement
interface MarkdownEditor {
  getSelection(): { start: number; end: number };
  insertAt(position: number, text: string): void;
  // value binding stays via the component's bound `body`
}
```

The Carta implementation wraps `carta.input.getSelection()` and `carta.input.insertAt()`. The palette
and any later insert control (the Pass K2 pickers) talk to this interface, not to Carta directly, so a
swap to a bare editor is contained to one adapter file. Mounting the editor component stays Carta-specific
in `EditPage` (client-only, as today); the interface covers the programmatic editing surface, not the
Svelte component mount.

## R10 / R10a: component palette

A cairn-owned control row sits above the Carta editor and hosts an "Insert" component palette. It
reads `adapter.registry.defs` (the registry already shipped with the render extraction; each
`ComponentDef` already carries `label`, `description`, and `insertTemplate`). Selecting a component
inserts its `insertTemplate` at the cursor.

- **DaisyUI:** the palette is a DaisyUI `dropdown` with a `menu` of components (label plus
  description). This keeps it consistent with the Warm Stone admin theme and restyleable, per the
  opinionated-stack rule.
- **Availability:** shown only when `adapter.registry` is present and non-empty. ecnordic shows its
  seven components; 907 (no registry components) shows no palette.
- **Insertion:** the control inserts at the current cursor position through the `MarkdownEditor`
  interface (`getSelection()` then `insertAt(start, template)`), backed by `carta.input`. The editor
  binds `body`; Carta's `insertAt` updates the textarea and the bound value, then focus returns.
- **Kind-agnostic:** available for both page and story collections (per the tendency-not-rule point).
- cairn-core stays directive-agnostic: the palette renders whatever the site's registry declares.

## R11: standard formatting toolbar

Keep Carta's built-in toolbar (bold, italic, heading, link, list, quote, code) rather than building a
custom one. The work is to confirm the toolbar is surfaced in our `MarkdownEditor` mount and that it
reads correctly under the Warm Stone theme. Typing raw Markdown still works for those who prefer it.
The toolbar writes Markdown, so the raw-markdown and directive-safe model is preserved.

The cairn control row (palette, preview toggle) is separate from Carta's formatting toolbar. Basic
formatting stays on Carta's toolbar (free, Carta-styled); the cairn-specific controls are DaisyUI and
live in the cairn row. Two rows is acceptable and keeps each tool in its natural home.

## R12: toggle the preview

A persisted toggle in the cairn control row shows or hides the directive-safe site-preview pane, so
the editor can expand to full width when the author does not need the preview.

- **DaisyUI:** a DaisyUI `btn` (or `join` segmented control) with an icon and label.
- **State:** persisted per user in `localStorage` (client-only), so the choice survives across edits.
- **Mechanism:** the preview pane already runs the site plugin set (the directive-safe preview from
  Pass B and the render extraction). R12 controls its visibility. Concretely this toggles Carta's
  `mode` between a side-by-side preview and an editor-only view. This is distinct from Carta's internal
  Write and Preview tabs; R12 governs cairn's site-preview column.

## Adapter contract change (summary)

One optional field added to `CairnCollection`:

```ts
kind?: 'page' | 'story';   // default 'story' when absent
```

No other adapter contract change. `adapter.registry` already exists. Sites opt pages into
`kind: 'page'`; everything else keeps working unchanged.

Separately, the package gains the internal `MarkdownEditor` interface (the cursor seam above) with a
Carta-backed implementation. This is a package-internal abstraction, not part of the site-facing
adapter contract, so sites are unaffected.

## Deferred: Pass L (navigation management)

Scheduled, not built this pass. Motivated by the page/story research above (pages are
navigation-placed). A nav-tree editor lets owners place and reorder pages in the site navigation.

Open decisions for the Pass L design round:

- **Storage of the nav structure.** Candidates: (a) derive from per-page frontmatter (nav label,
  parent, order) that the site assembles, keeping everything in git with no new store; (b) a committed
  nav manifest (for example `nav.json`) edited through the existing GitHub-App commit path, one file to
  reason about; (c) D1 (now sanctioned for non-content state), queryable but a second source of truth.
- **The tree-editing UI** (reorder, assign parent and children), likely DaisyUI plus a drag affordance.
- **Adapter contract addition** for the nav config.

This is the same weight class as R9 and the R8 collection-CRUD round, which is why it is its own pass
rather than part of Pass K.

## Verification (per the cairn-pass ritual)

- Package: `svelte-package` clean (emits the updated `EditPage` and any new component), vitest green
  including new tests for the `kind`-driven slug composition and `frontmatterFromForm` coverage.
- Both sites: `svelte-check` 0/0 and Cloudflare `npm run build` OK against the workspace symlink.
- Live admin smoke (the step-3 ritual) on both sites under `wrangler dev` with a minted owner session:
  open a story and a page entry; confirm the content-forward layout, the date-composed story slug
  versus the path-like page slug, the Insert palette present on ecnordic (seven components) and absent
  on 907, the formatting toolbar present, and the preview toggle hiding and showing the preview with
  the state persisted.
- Visual confirmation in Firefox stays the standing user step.

## Release

Folds into the same cairn-cms minor as Pass I (Warm Stone theme) and Pass J (collections nav), the
established Pass P pattern: publish via OIDC Trusted Publishing, both sites repoint and regenerate
lockfiles, both CI deploys green. None of I, J, K alone is worth a release.
