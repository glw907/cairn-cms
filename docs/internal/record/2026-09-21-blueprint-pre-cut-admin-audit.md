# Blueprint pre-cut admin audit, 2026-09-21

The daisyUI Blueprint quality inspector (server 1.6.3) read the whole admin surface before the
`0.97.0` cut: `src/lib/components/cairn-admin.css` plus all 48 `.svelte` components, 49 files and
about 1.0 MB of source. The run was `report_only`, in two calls under one workflow id
(`cairn-pre-cut-admin-audit-20260921`), from the `pre-cut` worktree at the dependency-sweep HEAD
(daisyUI 5.7.42). No file was edited. Rendered review was recorded as unavailable, so every
finding below is a source finding. The audit gates nothing. Owner's ruling 3 applies: every
finding is filed, none is taken in this pass.

The admin design system (`docs/internal/admin-design-system.md`) wins over the tool on conflict.
Most of the tool's error-tier output is that conflict, and is recorded here so the next audit
does not re-derive it.

## Tool errors that are the design system, not defects

| Tool code | Count | What it is | Ruling |
| --- | --- | --- | --- |
| `blueprint.unapproved-custom-css` | 51 selectors | `cairn-admin.css` itself: the two `data-theme` blocks, the motion attributes, the scoped `:where([data-theme=...])` overrides in `@layer components`. | Design system. The admin ships a scoped stylesheet by design; consumers never author against it. No action. |
| `theme.arbitrary-variable-colors` | about 190 sites | `border-[var(--cairn-card-border)]`, `text-[var(--cairn-error-ink)]`, `bg-[var(--cairn-error-tint)]`, `hover:bg-[var(--cairn-ink-hover)]` and siblings: the Warm Stone tokens that have no daisyUI semantic slot. | Design system. See the filed item on token consolidation below for the one part worth a look. |
| `daisyui.unknown-class` | 74 sites | Three groups. Tailwind utilities the tool misreads as daisyUI variants (`list-none`, `table-cell`, `select-none`). The admin's own recipe classes (`card-shell`, `card-shadow`, `btn-quiet`, `menu-divider`). | False positives and design-system recipes. No action. |
| `accessibility.form-control-name` | 1 | `cairn-admin.css:1132` is a CSS comment that quotes `<input type="radio">`. | False positive. No action. |

## Findings filed

Each is a ROADMAP line, filed by the pass's close task. None changes behavior tonight.

1. **Dynamic class string on the nav menu.** `CairnAdminShell.svelte:1046` builds
   `` `menu menu-sm w-full gap-0.5 p-0 ${extraClass}` ``. The daisyUI classes in it are static,
   so Tailwind sees them; the risk is only an `extraClass` value that Tailwind's scanner cannot
   see. Verify the callers pass static strings, then either leave it with a comment or map it.
2. **Two tables with no local overflow strategy.** `HelpHome.svelte:230` (`ref-table`) and
   `MarkdownHelpDialog.svelte:29` (`table table-sm`). Check both at 320 px against the
   five-viewport standard; wrap in `overflow-x-auto` if either scrolls the page.
3. **Two thumbnails without reserved dimensions.** `CairnMediaLibrary.svelte:781` and `:992`
   use `max-h-full max-w-full object-contain` inside a sized tile. Confirm the tile reserves the
   space, so a slow thumbnail cannot shift layout. Likely already true; verify once.
4. **Inline SVG paths in `EditPage.svelte`.** Fifteen `<path>` elements across `:1529` to
   `:2282`, beside a project icon library (`@lucide/svelte`). Decide whether each is a Lucide
   icon drawn by hand or a deliberate custom glyph, and swap the former.
5. **Token consolidation, one narrow question.** `EditPage.svelte:2429` and `:2491` write
   `hover:text-[var(--color-primary)]` and `text-[var(--color-accent)]`, which have exact
   semantic utilities (`hover:text-primary`, `text-accent`). Those two are plain swaps. The
   `--cairn-*` tokens are not.

## Advisory, not filed

- `daisyui.color-treatment` on `EditPage.svelte`: nine primary-colored elements in one
  component. The page carries two CTAs per state across several states that never render
  together, so the density is a source-count artifact.

## What this audit does not cover

Rendered checks (responsive, media, composition) did not run. The showcase's e2e width matrix,
`check:interactive-contrast`, and `check:touch-targets` cover rendered behavior. The
`daisyui-a11y-reviewer` fan-out at the pass close covers changed components only, and this pass
changed none.
