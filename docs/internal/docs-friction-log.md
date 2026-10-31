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
- **`editor`.** The live reproduction fixtures carry outdoor-club names (`trailhead-view`, `trail-guide`, `volunteer-spotlight`, `src/lib/reproductions/`), and the media and tags captions repeat them. Geoff ruled on 2026-10-31 to rename them generically in the final engine batch; the captions follow.
- **`editor`.** Geoff ruled "block" the one name for the `:::` unit in every track (2026-10-31, `record/2026-10-31-block-naming.md`), but the engine still says component: the public API, about 15 UI strings, and the docs under `extend/` and `reference/`. The final engine batch renames them, per the ROADMAP entry "Rename component to block across the engine". Until then `write-in-the-editor` calls the control the edit button beside **Insert block** and paraphrases its tooltips, and it says block where the fold tooltips still say "section". The rename pass quotes the real strings, including "Fold this block". The editor page keeps an `<a id="add-components-and-fragments">` anchor for `docs/reference/core.md:129`; repoint that link to `#add-blocks-and-fragments` in the rename pass and drop the anchor.

Boundary test at the pass 3 close: all three are ordinary-class changes with no `auth-data` path, and none changes a page the admin arm teaches, so they ride the final engine batch.

Found by the live capture and the admin arm (pass 4, 2026-10-31). Each is verified in the code named.

- **`admin`.** The setup run's App trip fails in two quiet ways. `xdg-open` fires detached and swallows its own failure (`packages/create-cairn-site/src/github/open.mjs:52`), so on a machine whose last-used browser profile is not the one the reader works in, no window reaches them; the capture's first run lost an attempt this way, and the cause (Chromium's last-used profile) is likely and unproven. A reader who goes to GitHub directly instead of the printed link gets a blank Homepage URL form, and the App made there never reports back. Nothing printed warns against it, and the only signal is `browser-step-abandoned` after the ten-minute wait (`github/loopback.mjs:84`). Fix candidates: print "use this link, not GitHub's own form" beside the link, and name a profile-free fallback.
- **`admin`.** The install prompt says only "choose where to install it and approve", while a first run needs "All repositories" (the capture runbook, `docs/plans/2026-10-30-capture-runbook.md`, step 2.4; the first Engine entry above holds the remedy-text half). `docs/admin/create-your-site.md` now says it. Fix candidate: the prompt names the choice.
- **`admin`.** Re-clicking a spent sign-in link says "This browser has no pending sign-in. Request a new link below and open it in this browser." `confirmAction` gives every cookie-less refusal that message (`src/lib/sveltekit/auth-routes.ts:363`, `src/lib/admin/ConfirmPage.svelte:67`), so a used or expired link gets advice that does not fix it. This is an `auth-data` path, so the fix is batched and not made by a docs pass. The editors' "four messages, one fix" entry below shares this cause.
- **`admin`.** Setup output copy that misstates or reads oddly, all in `packages/create-cairn-site`:
  - "Your site is live on GitHub:" labels a private repository (`bin.mjs:87`).
  - The step title "Sign you in" reads oddly among the others (`src/cloudflare/chapter.mjs:267`).
  - The default App name doubles the prefix for a site with "cairn" in its name, `cairn-cairn-docs-capture-2` (`src/github/chapter.mjs:161`).
  - "A sign-in page just opened; click Sign in there." prints whether or not a page opened (`src/cloudflare/bootstrap.mjs:29`).
  - A non-interactive `--sign-in` prints the literal placeholder `--dir <dir>` and says a page opened while it withholds the link (`src/github/open.mjs:69`).
  - The scaffold step ends with "This scaffold is local only ... Those steps arrive with the next release" (`src/scaffold.mjs:260`), and the same run then continues to GitHub and Cloudflare.
  - The cost preamble opens "Before you start, the honest cost picture."
- **`admin`.** The doctor's SKIP line keeps a failure-phrased title: "Guard is missing the declared role vocabulary" reports a skip because no custom roles are declared (`04-doctor-report.txt`). The 2b-close engine pass fixed the PASS titles only. Fix candidate: give SKIP its own title, as PASS has.
- **`editor`.** Copy that leaks builder vocabulary on editor screens (rule finds, `~/.local/state/cairn-docs-final/pass-3/rule-finds.md`, 2026-10-31): "the build will flag" (`src/lib/admin/EditPage.svelte:1931`); "This file changed since you opened it" and three other wordings of one stale-head condition (`src/lib/sveltekit/content-routes-entry-write.ts:318`, `content-routes-entry-destructive.ts:186,401`, `content-routes-media-shared.ts:93,99`); "The site config changed ... Re-read the config" on the Tags screen (`content-routes-settings.ts:150`, `nav-routes.ts:166`); and the busy label "Minting..." (`ShareLinkPanel.svelte:193`).
- **`editor`.** Screens whose wording misstates what happens: the link warning says "unpublished pages ... will 404 until published" for a published page marked Hidden (`EditPage.svelte:1926`); the broken-link banner says "no longer exists" for a page never published (`EditPage.svelte:1832`); the **Shown** visibility filter applies no filter (`ConceptList.svelte:143`); choosing **Decorative** in the library stores nothing, so the image reads **Needs alt** again (`CairnMediaLibrary.svelte:419`); and a refused new entry closes the dialog and drops the typed values (`ConceptList.svelte:488`).
- **`editor`.** Library strings disagree: the flash messages say "Asset" and "Orphans" where every other string says "image" (`CairnMediaLibrary.svelte:106`); the filter reads "No references found" while the tile chip still reads "Not referenced" (`:148`, `:773`); and the lead image chooser lists three types where the library accepts four, from a second constant (`MediaHeroField.svelte:608`).
- **`editor`.** Four failure messages for one sign-in problem, with one fix, one of which omits "in this browser" (`LoginPage.svelte:150-170`, `ConfirmPage.svelte:67-75`, `src/lib/sveltekit/refusal-codes.ts:21`).

Boundary test at the pass 4 close: every entry above is an ordinary-class change except the spent-link refusal, which touches an `auth-data` path and stays batched. None changes what an admin page teaches, because each page states the behavior as it is today, so no engine pass is warranted before the front door. All of them ride the final engine batch.

### Docs content

The docs-content entries cleared at the 2b close (2026-10-31): each was fixed on its page, found overtaken, or promoted to the `ROADMAP.md` rows named in "Docs content carried from the 2b close". New findings start here.

### Repo tooling

The repo-tooling entries cleared at the 2b close: five became `ROADMAP.md` rows (same entry) and the alignment-triage entry is done. New findings start here.
