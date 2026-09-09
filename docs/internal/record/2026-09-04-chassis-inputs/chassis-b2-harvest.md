# Chassis-B2 harvest

What this pass learned, banked for the next theme or site chassis pass and for polish, which
inherits the second-menu editing question named below. Read alongside chassis-B1's own harvest
in the same directory; the two together cover the whole chassis-B split.

## The corpus decision and its trade

Proving a paginated archive needed a real corpus past one page, and the ruled input chose
thirteen real, voiced posts over a synthetic one. The trade: thirteen real posts cost a full
content-review pass (each checked against the four hard gates: a banned word or phrase, an
unverified or false claim, a safety or standard-of-care promise, a cost misstatement; recorded
in `chassis-b2-content-review.md`) that a lorem-ipsum or templated corpus would not have
needed, and they cost review judgment on borderline lines (three posts' trail-conditions
language read as descriptive rather than promissory, declined rather than fixed). What it
bought: the archive baselines now show a corpus a reader would recognize as real trail notes,
not fifty near-identical stub paragraphs, so a screenshot doubles as a demonstration of the
theme's actual reading experience, and the review's own findings are reusable evidence that the
site's own voice guide produces gate-clean copy at scale. The corpus is excluded from the
scaffold by path (`.cairn-template.json`) rather than shipped, so the trade is paid once, by
this pass, and not by every site `create-cairn-site` bakes.

## The content method on a fixture corpus

Running the two content skills (`content-draft`, `content-review`) against a corpus whose sole
purpose is a pagination fixture, not a real publication, surfaced one gap worth naming for the
next pass that fabricates content: `vale` matches zero files under `src/content/posts/` (the
content-post path carries no Vale section), so the four hard gates have no deterministic gate
on this tree and were checked by direct read against the web-content-method definitions
instead. That is fine for thirteen posts read by one implementer in one sitting; it would not
scale to a much larger fixture corpus without either a Vale section for content posts or a
smaller sampled read. The existing fourteen posts' trail-notes voice was the only brief; no
separate voice document was drafted, and the review found the new thirteen consistent with it
without needing one.

## The second-menu editing question

`/admin/nav`'s `createNavRoutes` binds to exactly one menu (`menus.primary`), so moving the
footer nav to `site.config.yaml`'s `menus.footer` made it a developer-edited yaml block, not a
second admin-editable menu; the yaml carries a comment saying so. No consuming site has asked
to edit a second menu from `/admin` yet, so widening `createNavRoutes` to bind more than one
menu is an engine consultation candidate, not a site-side patch, and is filed to
`ROADMAP.md`'s Later tier with that trigger.

## The `check-public-tokens` scope argument

`site.css` had never been in the gate's scanned set; bringing it in produced exactly one real
hit, the root `html { font-size: clamp(...) }` fluid-type formula, which the gate's own color
and absolute-size rules cannot express as a token (it is the formula the tokens themselves are
built from) and which `theme.css` and `tokens.css` already carry the same exemption for. The
argument for scanning `site.css` at all, given it produces one unavoidable exemption and no
real fix: a theme's own root stylesheet is exactly the kind of file most likely to accumulate a
literal color or size over time, since it is the file a site owner edits most often, and a gate
that skips the file a developer touches most is the weakest possible gate. The three literal
sizes the plan review named (`max-height: 32rem`, `border-left: 3px`, `border-radius: 0.25rem`)
were invisible to the gate's own rules either way; naming them as `--site-*` custom properties
was hygiene the gate does not enforce, done because the gate's presence in the file prompted a
closer read of it, not because the gate demanded it. That second-order effect, a gate's mere
presence in a file inviting a closer look at the rest of the file, is worth remembering the next
time a scope-widening question comes up: the value is not only what the gate catches.

## The CI regen loop's cost

The pass ran the CI baseline regen once, after Task 2, per the plan's global constraints. It
rewrote 20 files (`site-home-*` and `archive2-*`, both surfaces Task 2 touched,
commit `4de378ec`) with CI-canonical renders that differ from this workstation's own renders of
the identical markup: every regenerated file's byte size grew by tens of bytes with no visible
content change, consistent with a font-hinting or subpixel-rounding difference between the
workstation's ImageMagick/browser stack and the CI runner's. From that commit onward, every
later task's local `CI=1` e2e run failed on exactly those 20 baselines (never more, never
fewer) even though no later task's own files touched either surface, and the conductor ruling
recorded in the plan (2026-09-08, after Task 3) treats that fixed 20-name set as the gate's
expected local failure list rather than a real regression. The cost: every task from 3 onward
spent one comparison step (grep the failing names, confirm they equal 4de378ec's own file
list) that a fully workstation-reproducible baseline would not have needed, and the pass could
not locally regenerate its way out of the drift, since a local `--update-snapshots` run would
only reintroduce the same drift against the next real CI regen. The lesson for a future pass:
budget one CI regen's worth of permanent local/CI drift per baseline touched, name the exact
file list the drift produces at the regen, and treat any local e2e failure outside that named
list, not any failure at all, as the real gate.

## Two cosmetic findings from the pass-end visual-verifier

The six-surface `visual-verifier` grading returned `pass: true` (every intended move present
and correct, structural findings empty) but named two pre-existing CSS shapes that this pass
was the first to render, both filed to `ROADMAP.md`'s Next tier rather than fixed here since
neither is a paint regression this pass caused and both cost a rendered baseline to touch:
`EntryRow`'s `border-bottom` and `.pagination`'s own `margin-top` plus `border-top` read as a
double hairline with a 32 to 40px empty strip between the last entry row and the pagination
block on `home` and `archive2` at every width and scheme, and the index head's "N entries"
count reads the current page's row count rather than the archive's total next to "Page 1 of
2," which a reader could take as the whole archive. Recorded here because the verifier itself
flagged the hairline gap as "worth a chassis harvest note"; this pass's own Task 8 harvest
commit landed before the verifier ran, which is why the note was missing until pass close.
