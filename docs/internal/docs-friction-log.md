# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it.

Record each finding with its perspective and a short note. The perspective is one of the five
audience profiles ([`2026-08-14-audience-profiles.md`](./record/2026-08-14-audience-profiles.md)): `editor`
(the non-technical author working in `/admin`), `admin` (the technical non-developer who sets up
and runs the default site; `operator` retired into this tag 2026-08-14), `extender` (the
Svelte-fluent developer building on cairn's seams; formerly tagged `developer`), `contributor`
(the engine contributor working on cairn itself; formerly tagged `maintainer`), or `scripter`
(anyone automating against `cairn`, a person writing a script or an agent; the profile the
2026-08-14 record's dated note added for the three tool contract pages under
`docs/reference/`).

Open findings sit in three groups by who clears them (Geoff, 2026-10-08). **Engine** entries feed
the docs-stage boundary test and are cleared by it at each stage close, riding `ROADMAP.md`'s
batched engine friction entry or an engine pass. **Docs content** is any way a page fails its
reader: a wrong claim, a missing working example, step, or failure case, too much or too little
detail for the task, content in the wrong track or page or unfindable from where a reader looks, or
drift since writing. The filing test is whether the reader can finish the page's job from the
page. The pass that meets a small docs item fixes it on the page, except on an arm whose stage is
in flight or a page the running plan freezes, where it is filed here; a larger docs rework moves
to a `ROADMAP.md` row in the tier where it bites.
**Repo tooling** is gates, scripts, fixtures, and tooling comments: a pass that meets a small
tooling item fixes it there, and anything larger moves to a `ROADMAP.md` row in the tier where it
bites.

This log holds only live findings and the tombstones below. Resolved findings are pruned here once
shipped; their detail lives in git, PR bodies, and `docs/STATUS.md`, the homes for shipped
history. The append-only prose that accumulated through 2026-06-26 was pruned on 2026-06-28
(extensibility Plan 1), and the full backlog was cleared on 2026-07-16 by the friction-triage pass:
every open finding was verified against the code and then either shipped, filed into `ROADMAP.md`
with its trigger, or found already resolved and pruned. Git history holds the full record of both
clearings.

## Tombstones (decided, do not resurface)

- **Point-of-typing writing coach.** KILLED 2026-06-26. The help-shell adversarial review discarded it
  as the Clippy pattern. Do not re-propose a per-keystroke formatting coach.
- **`runtime.publicMediaResolver`.** DROPPED 2026-06-24. An adversarial review, verified first-hand,
  found it inverts the prerender/Worker boundary and that the "three wire-points" was a miscount of two,
  both prerender-side and already sharing one `cairn.config` export. The real wart (silently broken
  public images) is fixed instead by the `media.resolver_absent` warn event at `createPublicRoutes`
  construction. Do not re-propose the runtime member.
- **`CairnMediaLibrary`'s dormant "type facet" (a hidden Images/Documents filter).** RESOLVED
  2026-07-20, admin-toolkit review-fixes round. The pass's T8 drift-hunt had filed this as a live
  open finding, attributing the facet's absence to T6's `ListToolbar` re-expression; `git log`/`git
  show` on `CairnMediaLibrary.svelte` instead confirm the facet was removed three weeks earlier, in
  the 2026-06-28 charter-adherence pass (`23abe438`, "the speculative Media Library type-facet is
  removed"), as inert scaffolding for a second stored asset type that has never existed. T6 never
  carried it forward because it was already gone at the branch point. The delivery route is still
  image-only today, so the charter's "we don't accommodate that universe" stands: do not re-add it
  speculatively. `ListToolbarFilter`'s `promoted: false` seam covers the same hidden-until-needed
  shape if a real second asset type ever ships.

## Open findings

New findings start in the group they belong to, one per finding, with its perspective and a short note.

### Engine

The 94 engine entries moved to `record/2026-10-31-engine-friction-2b-close.md` at the 2b close, each with its boundary-test verdict. New engine findings start here.

- **`extender`.** The `installation-not-covering-repo` remedy sends the reader to "Only select repositories" (`packages/create-cairn-site/src/github/catalogue.mjs:131`), the option that left a first run without the repository it was about to create (found while writing the capture runbook, 2026-10-31). A resume after `createRepo` also stops with `repo-name-collision` (`src/github/repo.mjs:70`) instead of adopting a repository the tool made. Fix candidates: name "All repositories" for a first run, and adopt an empty repository the run itself created.
- **`editor`.** The trash button on a list row submits `?/delete` at once, with no confirmation, unless other entries link to the entry (`src/lib/admin/ConceptList.svelte:446`), while the delete on the entry's screen confirms in `DeleteDialog.svelte`. `publish-and-history` tells editors to delete from the entry's screen (found while fact-checking the editors arm, 2026-10-31).
- **`editor`.** The tag-vocabulary save redirects to `/admin/vocabulary?saved=1` (`src/lib/sveltekit/content-routes-settings.ts:444`), but `VocabularyAdmin.svelte` never reads the flag, so the editor sees no confirmation after **Save changes** (found while writing `manage-your-tag-vocabulary`, 2026-10-31).
- **`editor`.** The media delete-in-use dialog says "Type the name to delete it anyway" (`src/lib/admin/CairnMediaLibrary.svelte:1183`), while its field's placeholder and the typed check use the asset's address (`:1231`). The two disagree about what to type (found writing `manage-the-media-library`, 2026-10-31).
- **`editor`.** The editor track's docs call a `:::` block a component (Geoff, 2026-10-31, `docs-register.md` Names), but the admin still says "block": **Insert block** (`ComponentInsertDialog.svelte:320`, `EditPage.svelte:2010`), **Edit block**, `MarkdownHelpDialog.svelte:45` ("layout blocks"), and `editor-highlight.ts:57` ("Layout marker"). Rename them to component in the final engine batch, then drop the quoted exceptions from `write-in-the-editor`.
- **`editor`.** The live reproduction fixtures carry outdoor-club names (`trailhead-view`, `trail-guide`, `volunteer-spotlight`, `src/lib/reproductions/`), and the media and tags captions repeat them. Geoff ruled on 2026-10-31 to rename them generically in the final engine batch; the captions follow.

Boundary test at the pass 3 close: all three are ordinary-class changes with no `auth-data` path, and none changes a page the admin arm teaches, so they ride the final engine batch.

### Docs content

The docs-content entries cleared at the 2b close (2026-10-31): each was fixed on its page, found overtaken, or promoted to the `ROADMAP.md` rows named in "Docs content carried from the 2b close". New findings start here.

### Repo tooling

The repo-tooling entries cleared at the 2b close: five became `ROADMAP.md` rows (same entry) and the alignment-triage entry is done. New findings start here.
