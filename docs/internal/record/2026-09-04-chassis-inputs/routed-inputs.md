# Chassis-pass inputs, compiled verbatim/paraphrased by source

Compiled for the "chassis" slice of the audit-remediation initiative
(`examples/showcase` is the chassis: the seed every theme copy and the
`templates/waymark` scaffold descend from). No evaluation or recommendation below —
compilation only, grouped by source per the request. All paths repo-relative to
`/var/home/glw907/Projects/cairn-cms` unless marked otherwise.

---

## 1. `ROADMAP.md`

**The audit-remediation initiative's "Now" entry** (line 284): "**The any-site audit
remediation (filed 2026-08-26; sequenced before beta, one `Consumers must:` window).**"
No line in ROADMAP.md literally reads "routed to chassis" or "chassis inputs" — that
phrasing appears only in the plan docs (see §3). ROADMAP's chassis-specific bullet sits
inside this Now entry:

> `ROADMAP.md:330-335` — "**The chassis improvement round** (Geoff, 2026-08-26): after
> the engine reshapes land, `examples/showcase` gets its round of improvement against the
> changed engine, as its own pass in this initiative. Its review half is done (14
> findings, none rewrite-tier; rank 1 is the never-executing paginated archive and its
> permanent build-gate exception). Internals-B's own close routes one more item here: the
> showcase exemplar half of audit finding 8."

**The 14-finding chassis improvement round**, found at
`docs/internal/record/2026-08-26-any-site-audit/int-rank-site-chassis.md` (audited at
commit `0406f1d5` against `docs/internal/code-idioms.md`, the TSDoc standard, the
chassis README, and the "two chassis duties: exemplar consumer; starting copy for every
next theme"). Grade: B. All 14 findings, quoted:

1. **`int-rank-site-chassis.md:41`** — "The paginated archive subsystem never executes,
   and buys a permanent build-gate exception to stay green." `src/chassis/archive.ts:8-10`
   sizes `ARCHIVE_PAGE_SIZE = 50` against a 220-post fixture not in the tree;
   `src/content/posts/` holds 14 posts, so `totalPages` is always 1.
   `(site)/archive/[page]/+page.svelte` (188 lines) and its `+page.server.ts` (31 lines)
   never render; the home page's pagination block (`+page.svelte:161-178`) never renders;
   `svelte.config.js:47-50`'s `handleUnseenRoutes` carries a named exception for
   `/(site)/archive/[page]`; no e2e spec visits `/archive/2`.
2. **`:96`** — "The emitted scaffold template ships two internal fixtures to every
   consumer site." (a) `/probe-craft` (design-acceptance fixture, fabricated member
   records, no `+page.server.ts`/no prerender opt-out, so it's a live SSR route on every
   scaffolded site) is absent from `.cairn-template.json`'s exclude list. (b)
   `(site)/+layout.server.ts:15-17` returns `{ siteLayoutSentinel:
   'cairn-showcase-site-layout' }` on every public page payload with no
   `cairn-template:exclude` marker.
3. **`:167`** — "`[...path=md]` hand-rolls its own `PublicRoutesConfig`, defeating the
   single-source guarantee `public-routes.ts` exists to make."
   `src/routes/(site)/[...path=md]/+server.ts:13-21` retypes seven of nine
   `PublicRoutesConfig` fields by hand and silently drops `defaultImage`/`feeds`, even
   though `public-routes.ts:1-6` claims to be the "ONE binding" both routes import. Same
   duplication one level down in `feed.xml/+server.ts:11-13` and `feed.json/+server.ts:11-13`.
4. **`:215`** — "The chassis's pure logic has no unit tests, because the showcase has no
   unit test project." `examples/showcase/src/tests` does not exist;
   `paginateArchive`/`sortNewestFirst` (`archive.ts:36`/`:27`), `formatDate` (`date.ts:15`),
   `isBannerExpired` (`islands/banner-expiry.ts:14`), `isAdminHref`
   (`components/admin-link.ts:9`) are all unasserted.
5. **`:250`** — "Two theme components (464 lines) are imported by nothing, and both
   violate the props idiom." `src/theme/components/IntroLedger.svelte` (267 lines) and
   `Carousel.svelte` (197 lines) have zero `.svelte`/`.ts` referrers in `src/`/`e2e/`;
   both use an inline type-literal `$props()` shape (S1, retired) instead of
   `interface Props`; `docs/extend/what-the-scaffold-wrote.md:130` wrongly describes them
   as registered markdown components.
6. **`:302`** — "The archive entry row is written three times and its CSS twice,
   verbatim." The same 15-line `<article class="entry">` block appears at
   `(site)/+page.svelte:119-131`, `:140-152`, and `archive/[page]/+page.svelte:34-46`;
   ~120 lines of CSS duplicated between `archive/[page]/+page.svelte:68-187` and
   `(site)/+page.svelte:181-424`.
7. **`:343`** — "Site identity is hardcoded in four files while `siteConfig.siteName`
   exists, and the footer nav forks from the header nav." `SiteHeader.svelte:112`,
   `SiteFooter.svelte:52`, `+error.svelte:23`, `archive/[page]/+page.svelte:17` all
   hardcode "Waymark" instead of reading `siteConfig.siteName`. `chassis/content.ts:29-30`
   hardcodes `ORIGIN`/`SITE_DESCRIPTION` on the wrong side of the chassis boundary (site
   identity, not genre-free plumbing). `SiteHeader.svelte:63-67` derives nav from
   `page.data.nav`; `SiteFooter.svelte:33-37` hardcodes its own nav list with no note
   explaining the divergence.
8. **`:403`** — "The site-shell mechanic lives at three altitudes and the chassis
   primitive built for it is unused." `composition.css:107-116` ships
   `.cairn-site-shell`/`.cairn-site-main`; the showcase's own `(site)/+layout.svelte:45`
   hand-rolls the same flex column in Tailwind utilities instead, `+error.svelte:26`
   repeats it, and `site.css:61-64` re-derives the same fix by hand with a comment citing
   the chassis recipe it doesn't use. `composition.css` is 117 lines never painted by any
   visual baseline.
9. **`:456`** — "Import specifiers fork between `.js` and bare across the same modules."
   Four `$chassis`/`$theme` modules are imported both with and without `.js`, sometimes
   from sibling files (`(site)/[...path]/+page.server.ts:3-4` bare vs.
   `(site)/preview/[token]/+page.server.ts:11-12` `.js`, for the same two modules).
10. **`:491`** — "`cairn.config.ts` is a 520-line monolith whose adapter is buried under
    nine component definitions." Lines 18-346 are the icon set plus nine
    `defineComponent` declarations; the adapter/concepts/backend/`navLayout` content
    starts at line 375. Minor idiom residue: `:9-11` imports via `$theme` alias while
    `:15-16`/`:520` import relatively.
11. **`:526`** — "`sortNewestFirst` re-implements a guarantee the engine already makes."
    `archive.ts:26-29`'s comparator is byte-identical to `content-index.ts:139-142`'s;
    `posts` is already `routing: 'feed'` (dated), so both call sites re-sort an
    already-sorted array.
12. **`:563`** — "Route-handler and error idioms fork inside one directory." Untyped bare
    `export async function GET()` (`test/last-commit/+server.ts:9`) vs. typed
    `RequestHandler` (`test/last-otp/+server.ts:23`); `throw error(404, ...)`
    (`archive/[page]/+page.server.ts:25`) vs. bare `error(404, ...)`
    (`test/last-otp/+server.ts:25`); `isLocalHost` copied verbatim in three files
    (`last-otp`, `reset-members`, `revoke-member-session`), while its own comment claims
    only two.
13. **`:615`** — "Module headers fork on the `cairn-cms:` prefix, and the members tree
    reaches back by relative path." Only 2 of 12 `src/chassis/` modules carry the `//
    cairn-cms:` header prefix (idiom M1). `src/routes/members/+page.server.ts:7` etc.
    reach `src/members/` via `../../` traversal with no `$members` alias, though
    `$chassis`/`$theme` exist for exactly this purpose.
14. **`:645`** — "Idiom residue: tab indentation, an ad hoc `fail` literal, an unwrapped
    app shell, an un-flagged watch item." (a) `playwright.config.ts` lines 4-14 are
    tab-indented against idiom M4 (2-space everywhere). (b)
    `admin/signups/+page.server.ts:32` uses `fail(400, { error: 'missing' })` against
    idiom E4's named-`*Failure`-interface convention, and this route is "the repo's
    advertised proof of the custom-screen seam" — the shape a developer copies; the same
    file uses `event.platform!.env` non-null assertions three times. (c) `app.html:19`
    wraps the app in a bare `<div>%sveltekit.body%</div>` instead of
    `<div style="display: contents">`. (d) `svelte.config.js:52-56`'s `csrf: {
    checkOrigin: false }` comment carries no `// WATCH:` marker for kit#15992's removal.

The audit's own summary of this round (`docs/internal/record/2026-08-26-any-site-audit.md:192-195`):
"**The chassis.** Fourteen findings, none rewrite-tier. Rank 1: the paginated archive
subsystem never executes on the showcase's own corpus and buys a permanent build-gate
exception (`svelte.config.js:48`) to stay green, teaching every theme that inherits it to
carry the same dead subsystem and exception."

**The render trio re-homing (`cardShell`/`headRow`/`iconSpan`).** Not named as such in
ROADMAP.md's prose, but referenced at `ROADMAP.md:745-757` ("Decide whether the chassis
safelists the classes the engine's rendered markdown emits" — `rehype-dispatch.ts` writes
`card-body`/`card-title`, the alert directive writes `alert` + variants, Tailwind never
scans runtime output, and "The showcase chassis keeps the `card` and `alert` families
expecting those declarations to be there; they are not."). The trio's chassis-deferral
itself is recorded in `docs/internal/engine-rulings.md` (§4 below) and the pass plans
(§3 below), not in ROADMAP.md directly.

**The hand-mounted `+page.server.ts` against generated `./$types`.** Not in ROADMAP.md
directly either; carried in `docs/HISTORY.md:261` ("No compile in the repo exercises the
hand-mount path against generated `./$types` (carried follow-up)") and repeated in the
foundations-B and conformance pass hands-forward sections (§3 below).

**The showcase visual suite corpus gap** — `ROADMAP.md:690-731`, "**The showcase visual
suite cannot see a vertical-alignment regression, and its admin corpus is missing the
screen most of them landed on (measured 2026-08-07, off the same pass).**" Two gaps:

- **The tolerance floor** (`:696-712`): `examples/showcase/playwright.config.ts` sets
  `expect.toHaveScreenshot.maxDiffPixels: 120`; a real 1.5px icon-glyph shift measured 51
  pixels of diff, all under the 120 floor, so "this defect class sits wholly under the
  floor, and a passing visual suite is not evidence that alignment is intact."
- **The corpus gap** (`:714-731`): `examples/showcase/e2e/admin-visual.spec.ts` holds 18
  tests over 7 routes (`/admin/posts`, `/admin/vocabulary`, `/admin/login`,
  `/admin/auth/confirm`, `/admin/editors`, `/admin/posts/2026-06-hello`, `/admin/media`);
  `/admin/settings` is absent, so "four of this pass's five fixed rows are captured
  nowhere in the admin corpus." A second instance (`:724-731`, extender/2026-08-27): the
  StatusChip regrammar passed the admin visual specs unchanged because no captured screen
  renders a chip within the 120px budget.

---

## 2. `docs/STATUS.md`

**Parallel tracks bullet, chassis sentences** (`docs/STATUS.md:67-83`, "## Parallel
tracks"):

> "**Audit remediation (ROADMAP Now).** Slices 1, 2a, 2b, 3, 4a, 4b, 5 (internals), and 6
> (internals-B) MERGED. Next: internals-C (coherence; immediate next action above), then
> chassis, then the final **polish** slice (Geoff, 2026-09-01: a full-surface
> cleanliness-and-beauty sweep, reading the exports as a family, the docs cover to cover,
> and the rendered admin against the design system; it also carries the OfficeList
> outright-retire question ruling-first, the `aria-disabled`-versus-native-`disabled`
> busy-idiom ruling, and the items ROADMAP's polish sub-bullet lists); ONE release cut
> after polish. `content-routes-media.ts` at 1,447 lines is the one file left from the
> audit's monolith list; ROADMAP's audit-remediation entry is the canonical routing
> record."

**The standing chassis mandate (Geoff, 2026-09-01), verbatim** (`docs/STATUS.md:78-83`):

> "Standing chassis mandate (Geoff, 2026-09-01): the chassis is the most developer-visible
> part of cairn and SETS the code bar, so its quality bar equals the engine's; the chassis
> plan opens with a fresh showcase review at the exemplar bar and treats the ROADMAP's
> older 14-finding list as input, never the ceiling; chassis precedes polish because
> polish's cover-to-cover docs read must see the chassis that teaches the surface."

---

## 3. Pass plans' "What this pass hands forward" — chassis items

**`docs/superpowers/plans/2026-09-01-internals-pass.md:791-793`:**

> "- **Chassis:** unchanged (the render trio re-homing—Task 3 allowlists their
> narrative-context block until then; the showcase hand-mount against generated
> `./$types`)."

Same plan, Task 3 (`:283-308`) is the source of the render-trio deferral mechanic: "The
render trio is F-1 list (c) Tier 4, deferred to the CHASSIS pass, so this task cannot fix
it by re-homing: it gets a per-page allowlist entry with that reason" (`:296-298`).

**`docs/superpowers/plans/2026-09-03-internals-b-pass.md:623`:**

> "- **Chassis:** the showcase exemplar half of audit finding 8; the render trio
> re-homing."

**`docs/superpowers/plans/2026-09-03-internals-c-pass.md:499-502`:**

> "## What this pass hands forward
>
> - **Chassis:** the showcase exemplar realization; the standing chassis mandate in
>   full; the four consumer sites' chassis-copy `ec-*` renames ride their own site
>   passes."

**Also relevant, not "hands forward" but chassis-owned execution in the same plan:**
Task 4 (`:255-296`, "`ec-*` → `cairn-*`") is internals-C's own consumer-facing change; it
touches `examples/showcase/src/chassis/prose.css` directly ("this is a CHASSIS change,
the seed every theme copy descends from, gated by `check:chassis-boundary` and read by
`check-public-tokens.mjs`") and re-emits `templates/waymark/src/chassis/prose.css` via
`npm run emit:template`, and appends annotations to the `audit-render-iconspan`/
`audit-render-headrow` ledger rows (`docs/internal/engine-rulings.md:3907-3918`,
`:3920-3931`) stating "these are OPEN rulings whose execution is owned by the CHASSIS
pass, not history rows; the annotation states the class vocabulary those helpers bake was
renamed here, so the chassis re-homing re-teaches `cairn-*` names."

**Internals-C's Task 10 "chassis-inputs record" reference**
(`docs/superpowers/plans/2026-09-03-internals-c-pass.md:470-483`, "### Task 10: Exemplar
drift, the monolith line, records (last)"):

> "**Files:** Modify: the `createSectionAction` docs (verify the call-site count — the
> audit measured zero non-test callers; reposition or demote per what the docs claim
> TODAY, and route the showcase half to chassis inputs either way), `ROADMAP.md`
> (`content-routes-media.ts` at **1,447** lines recorded as the remaining tracked
> monolith; shipped coherence items leave the tiers), **the chassis-inputs record**
>
> - [ ] **Step 1:** the `createSectionAction` verification and doc fix; chassis routing.
> - [ ] **Step 2:** ROADMAP; full gate; commit.
>
> **Acceptance criteria:** docs teach the sanctioned shape; ROADMAP's monolith accounting
> matches the tree; chassis inputs carry the showcase half."

**What record file this means, and whether it exists yet:** searched the whole repo
(`find`/`grep` over `docs/`) for any file named or referencing `chassis-inputs`; the only
hit anywhere is this Task 10 line itself. **No `chassis-inputs` record file exists yet**
in `docs/internal/record/` or anywhere else in the repo — internals-C's Task 10 is the
first task that names creating/populating one, and this compiled brief (written to the
scratchpad, not the repo) is the first assembly of its would-be contents. The relevant
"showcase half" it should carry, per Task 10's own text, is the `createSectionAction`
docs finding — traced to `int-coherence.md`'s finding 8 (§5 below): the showcase's custom
admin screen (`admin/signups/+page.server.ts`) uses `requireOwner`/raw `formData()`/
`fail(400, {error})` instead of the documented `createSectionAction`, which "has **zero
non-test call sites**."

Also relevant from `docs/superpowers/plans/2026-09-01-conformance-pass.md:962-974`:

> "- **Chassis pass:** the render trio re-homing (`cardShell`/`headRow`/`iconSpan` —
>   explicitly untouched by Task 7), and the carried showcase hand-mounted
>   `+page.server.ts` against generated `./$types`.
> - **Release:** the window still holds; ONE cut after the chassis slice per the
>   initiative design."

And `docs/superpowers/plans/2026-08-28-foundations-b-pass.md:528-532` (the origin of the
hand-mount carry-forward): "**Carried follow-ups (routed, not floating).** (1) No compile
in the repo exercises the hand-mount path against generated `./$types`; a hand-mounted
`+page.server.ts` in the showcase is the close (routed to STATUS carry-forwards)."

---

## 4. `docs/internal/engine-rulings.md`

**`audit-render-iconspan` row, in full (`:3907-3918`):**

> "## audit-render-iconspan: `iconSpan`  (retire, 2026-08-26, any-site audit)
>
> - **Verdict:** retire. None. The whole body is one family site's class vocabulary
>   ('ec-icon'), and every family site already wraps it in its own makeIconRenderer
>   factory anyway.
> - **Reopens on:** open; not executed by the retires pass. The r4-rederivation addendum
>   ruling defers this name to list (c) Tier 4 (chassis-coupled): it is value-imported by
>   `examples/showcase/src/theme/cairn.config.ts` / `src/chassis/render.ts` and the baked
>   `templates/waymark` twins, and taught as `docs/extend/configure-rendering.md`'s
>   worked example, so its deletion requires the chassis re-homing, `emit:template`
>   re-bake, and guide rewrite in the same change. The chassis pass (slice 6) owns the
>   re-homing, the re-emit, the guide rewrite, and then the deletion.
> - **Record:** [rank-render-build-tooling.md](../2026-08-26-any-site-audit/rank-render-build-tooling.md),
>   rank 2; [r4-rederivation](../2026-08-30-r4-rederivation.md), section 7 (ADDENDUM
>   RULINGS).
> - **Verified:** [verify-render-build-tooling.md](../2026-08-26-any-site-audit/verify-render-build-tooling.md)."

**`audit-render-headrow` row, in full (`:3920-3931`):**

> "## audit-render-headrow: `headRow`  (retire, 2026-08-26, any-site audit)
>
> - **Verdict:** retire. Weak. Real logic (optional icon, level), but bakes 'ec-head' and
>   'card-title'; a stranger whose design lacks those classes must override or abandon it.
> - **Reopens on:** open; not executed by the retires pass. The r4-rederivation addendum
>   ruling defers this name to list (c) Tier 4 (chassis-coupled): it is value-imported by
>   `examples/showcase/src/theme/cairn.config.ts` / `src/chassis/render.ts` and the baked
>   `templates/waymark` twins, and taught as `docs/extend/configure-rendering.md`'s
>   worked example, so its deletion requires the chassis re-homing, `emit:template`
>   re-bake, and guide rewrite in the same change. The chassis pass (slice 6) owns the
>   re-homing, the re-emit, the guide rewrite, and then the deletion.
> - **Record:** [rank-render-build-tooling.md](../2026-08-26-any-site-audit/rank-render-build-tooling.md),
>   rank 3; [r4-rederivation](../2026-08-30-r4-rederivation.md), section 7 (ADDENDUM
>   RULINGS).
> - **Verified:** [verify-render-build-tooling.md](../2026-08-26-any-site-audit/verify-render-build-tooling.md)."

**The sibling `audit-render-cardshell` row (`:3894-3905`)** carries the identical
"chassis pass (slice 6) owns the re-homing" language and is the third member of the
render trio (not asked for by name but load-bearing context for both rows above):

> "## audit-render-cardshell: `cardShell`  (retire, 2026-08-26, any-site audit)
>
> - **Verdict:** retire. None. It hands a stranger a baked `<div class="card-body">`
>   they did not choose, saving one `h()` call in a file that already imports hastscript.
> - **Reopens on:** open; not executed by the retires pass. [... same chassis-coupled /
>   slice 6 language as above] ...
> - **Record:** rank-render-build-tooling.md, rank 1; r4-rederivation, section 7."

**Other rows whose execution is owned by the chassis pass (grep `chassis`):**

- `f1-return-position-leak-sanction` row (`:5210-5223`): "if a later edit moves the trio
  into a Types-table row or a signature-only block (re-homing onto `/render`'s own page
  is deferred to the chassis pass; this ledger's `f1-return-position-leak-sanction` row
  carries the same trio as list (c) Tier 4, chassis-coupled), the move is carried by a
  reasoned entry rather than a silent pass" (`:5214-5218`).
- The general F-1 rider's summary earlier in the ledger (`:111-116`) restates the same
  ruling: "The render trio (`cardShell` `headRow` `iconSpan`) defers to the chassis pass
  as list (c) Tier 4 (chassis-coupled). All three are value-imported by the showcase
  theme/chassis and the baked `templates/waymark` twins and taught as
  `docs/extend/configure-rendering.md`'s worked example; deleting them requires the
  chassis re-homing, `emit:template` re-bake, and guide rewrite in one change."
- No other engine-rulings.md row states its execution is owned by the chassis pass; the
  remaining `chassis` grep hits (lines ~383-394, 494, 910-915, 1351-1354, 3645-3676,
  3708-3711, 3829-3832) cite chassis modules only as the "any-site case" shape precedent
  for an unrelated keep verdict (e.g. "the exact shape three family chassis modules
  already have in `src/chassis/render.ts`"), not as chassis-pass-owned work.

---

## 5. `docs/internal/record/2026-08-26-any-site-audit/` — findings routed to chassis/showcase

**The audit record's own chassis section** (`docs/internal/record/2026-08-26-any-site-audit.md:137-202`,
"## The internals and chassis audit (Task 8b; Geoff's mid-pass directives)"): "the chassis
(`examples/showcase`) aggressively reviewed on the same limbs plus its two chassis
duties." 175 total internals findings (10 rewrite, 108 refactor, 57 note); the chassis's
own 14 are summarized at `:192-195` (quoted in full in §1 above).

**Audit finding 8 and its "showcase exemplar half."** Traced to
`docs/internal/record/2026-08-26-any-site-audit/int-coherence.md:265-291`, coherence
finding "### 8. The exemplar tier teaches a different codebase than the docs do":

> "An agent's dominant instinct is to find a working example and pattern-match it. In
> this repo the working examples systematically disagree with the guidance:
>
> - `docs/extend/add-a-custom-admin-screen.md` is unambiguous: `createSectionAction` for
>   a section, `requireAccess` in the load, 'a section built on it never calls
>   `adminAction` directly.' `examples/showcase/src/routes/admin/signups/+page.server.ts`
>   — the repo's only custom admin screen, self-described as 'the Plan 1 extension-seam
>   proof' — uses `requireOwner`, a raw `formData()` read, no audit call, and
>   `fail(400, { error: 'missing' })`, the literal shape E4 names as a convergence
>   target. `createSectionAction` has **zero non-test call sites** and no e2e; the
>   discouraged shape has one.
> - The showcase's paginated archive (~270 lines across two routes) cannot render with
>   the shipped 14-post corpus, and buys a named `handleUnseenRoutes` exception in
>   `svelte.config.js` to stay green. Two theme components (464 lines) are imported by
>   nothing, and both use the props idiom S1 retired. `composition.css`'s primitive set
>   is unused by its own README's admission — including `.cairn-site-shell`, whose fix
>   the showcase's own `site.css` then hand-rolls with a comment saying so.
> - The showcase has no unit test project, so `paginateArchive`, `isBannerExpired` (a
>   fail-closed rule two independent code paths must agree on), and `isAdminHref` (which
>   the prerender crawler's correctness depends on) are asserted nowhere — and this tree
>   is the starting copy every next theme receives.
> - `skills/cairn-admin-screens/` defines a three-step done-gate. CI runs step 1 in
>   narrowed wrappers, never runs `cairn-audit --rendered`, and the two npm targets that
>   proxy rendered rules (`check:interactive-contrast`, `check:touch-targets`) run in
>   **no workflow at all**. Meanwhile `CONTRIBUTING.md` instructs the reader to treat CI
>   as the authority. The two authorities disagree and the agent is told to trust the
>   weaker one."

The "showcase exemplar half" (per `internals-b-pass.md:623`'s and `internals-c-pass.md`
Task 10's own routing language) is the three showcase-specific bullets — the paginated
archive/theme components/`composition.css` bullet and the no-unit-test bullet, both of
which duplicate chassis findings 1, 4, 5, 8 above — as distinct from the
`createSectionAction` bullet (engine docs half, verified/routed separately in Task 10)
and the `cairn-audit`/CI-authority bullet (a separate CI-gating finding).

**Other chassis/showcase-relevant material found by grep across the audit directory**
(full list of files grepped: `coherence.md`, `coherence-v2.md`, `int-coherence.md`,
`int-rank-site-chassis.md`, `int-verify-site-chassis.md`, `int-rank-tests-and-scripts.md`,
`int-rank-delivery-media-render.md`, `int-rank-components-primitives.md`, and 20 more
`rank-*`/`verify-*`/`int-*` files):

- `int-verify-site-chassis.md` — the verification pass over all 14 chassis findings
  (finding 1 "STANDS, tier revised refactor -> note"; confirms the 14-post corpus count
  and the missing e2e coverage for `/archive/N`).
- `int-rank-delivery-media-render.md:122-123` — "`docs/reference/delivery-data.md:546`
  publishes the signature verbatim, and the showcase chassis constructs one to satisfy it
  (`examples/showcase/src/chassis/entry-data.ts:11`)."
- `int-verify-delivery-media-render internals.md:29-46` — the `ec-glyph` finding: "The
  live residue is `ec-glyph`, and it is the strongest instance. `glyph` is ruled **keep**
  ... and stamps `ec-glyph` on every rendered icon of every cairn site. The shipped
  showcase chassis — the starting chassis every new theme copies — carries a dozen
  `.ec-glyph` rules (`examples/showcase/src/chassis/prose.css:546, 559, 572, 578, 628,
  708, 759, 810, …`)... **Revision to the remediation, not the verdict.** Rename
  `ec-glyph` → `cairn-glyph` across `glyph.ts`, the three admin components, the tests,
  `docs/reference/render.md`, and the showcase chassis CSS, with one `Consumers must:`
  line. Sequence it with (or after) the `cardShell`/`iconSpan`/`headRow` retire so the
  `ec-icon`/`ec-head` half is deleted rather than renamed."
- `rank-render-build-tooling.md:19-40` — "The rules live on the site side, in each site's
  copied chassis: `examples/showcase/src/chassis/prose.css:25`... reached every other
  site by chassis copy, not by independent derivation. ... The `cardShell`/`headRow`
  counts are almost entirely one chassis-copied `alert` component, byte-identical" across
  sites.
- `verify-render-build-tooling.md:34-45` — "chassis-copy argument" for the render trio's
  keep-vs-retire reasoning; confirms `templates/waymark/src/chassis/prose.css:520` also
  carries the `.card-body` rule "a different repo from the [showcase's]... `card-body` is
  a DaisyUI class the chassis happens to use, ratified nowhere."
- `rank-cli-surface.md:880,1075-1114` — confirms `examples/showcase` and
  `packages/create-cairn-site/template` both declare `site.config.yaml` and that
  "`examples/showcase`, the tree the engine's own test suite runs against" is what a
  consumer actually receives.

---

## 6. Harvest records with `harvest`, `chassis`, or `showcase` in the filename

Under `docs/internal/` and `docs/internal/record/` (one line each on chassis-relevant
carry):

- `docs/internal/engine-harvest-candidates.md` — engine-harvest candidates from ASC/ecxc;
  no chassis-specific content (0 chassis/showcase hits).
- `docs/internal/pre-beta-harvest.md` — carries a dedicated **"## Chassis" section**
  (`:245` on), "Per-port harvest at the chassis layer (theme-ports-1-3, step 5),
  evidence-based against `examples/showcase/src/chassis` and mirrored into each theme's
  own verbatim copy": records `.cairn-site-shell`/`.cairn-site-main` LANDED as a chassis
  recipe (originated from an AstroPaper port bug, now in `composition.css` and the
  chassis README), the code-card device QUEUED (not yet promoted to chassis, pending a
  second port's proof point), the `sanitizeSchema` extension point CONFIRMED WORKING
  with no chassis change needed, and the `--spacing-xs`/`-xl`/`-2xl` vs. Tailwind
  `max-w-*` collision LANDED as documentation in `tokens.css`.
- `docs/internal/design/2026-06-30-showcase-custom-surface-ledger.md` — "The committed
  audit artifact for the starter-template track of the admin idiomatic re-expression
  initiative," a Tier 1/2/3 ledger of the showcase's DaisyUI theme (Tier 1, keep
  verbatim), owned design (Tier 2), and folded template chrome (Tier 3, done); carries the
  `check:custom-surface` gate definition for the showcase tree.
- `docs/internal/record/2026-08-04-auth-channel-consumer-proof-harvest.md` — findings
  from the pass that built the showcase `/members` fixture; the fixture itself
  (`examples/showcase/src/members/`) is chassis-adjacent (site-owned, not `src/chassis/`)
  but the pass's finding 1 is what later drove `ROADMAP.md:745-757`'s
  card-title/alert-class safelisting question.
- `docs/internal/record/2026-08-07-vertical-alignment-harvest-findings.md` — the
  cairn-wide vertical-alignment measurement pass; source of the showcase visual-suite
  corpus-gap finding quoted in §1 above (measured off the same pass).
- `docs/internal/record/2026-08-16-diagram-theme-harvest-findings.md` — docs-diagram
  merge-gate findings; no chassis/showcase content (0 hits), engine-level UI-mechanics
  filing only.
- `docs/internal/record/2026-08-20/21/22/25-xcathletes-pass-N-harvest.md` — xcathletes
  consumer-harvest ledgers; scattered showcase mentions as the scaffold-origin reference
  point (xcathletes scaffolded "from the Waymark template"), not chassis-specific
  findings of their own.
- `docs/internal/record/2026-08-26-asc-harvest-triage.md` — adversarial triage of four
  ASC harvest documents; decides which ASC findings reach the engine, not
  chassis-specific on its own.
- `docs/internal/record/2026-08-26-any-site-audit/int-rank-site-chassis.md` and
  `int-verify-site-chassis.md` — the 14-finding chassis round and its verification (full
  content in §1 and §5 above).

**`aksailingclub-org/docs/2026-07-30-assets-substrate-harvest-findings.md`**
(`/var/home/glw907/Projects/aksailingclub-org`, confirmed present): carries no literal
"chassis" or "showcase" mention, but its six findings are chassis-relevant by shape.
Geoff's own routing principle in the file ("a design **choice**... is the site's, and a
UI **mechanic**... is the engine's") is the same test the chassis README's boundary rule
applies at the theme/chassis seam. Three of the six findings propose new engine-level
primitives that, if built, would land in or beside the chassis the way `theme-toggle.ts`
already did (per `pre-beta-harvest.md`'s own citation of that precedent): finding 1
(vertical centering of padded labels, with a measured baseline-offset methodology and a
`text-box-trim`/`text-box-edge` candidate mechanism), finding 2 (a toggle-action control
primitive — fixed-size two-state slot, `use:enhance` wiring, reduced-motion crossfade,
accessible-name handling), and finding 3 (a label-and-value row primitive with an
explicit wrap contract). All three pair their primitive proposal with a `cairn-audit`
mechanical check (centering, sibling-consistency, and — from finding 5 — interactive
contrast against immediate ground, and — from finding 6 — duplicate accessible names on
repeated per-row controls). Findings 4 (migration foreign-key recipe) and 5 (DaisyUI
plain-`.btn` dark-ground contrast, patched three times site-side) are engine/docs-level
rather than chassis-specific.

---

## 7. `docs/internal/public-design-system.md`

This file (the Waymark/agent reference for the public design system) has no section
literally titled "the responsive standard" or "the chassis harvest rule"; the closest
matching content, quoted:

**Responsive/scaling content** — "## The ultrawide posture (locked)" (`:107-116`):

> "Above ~1440px the root font-size scales smoothly via a `clamp()` on `html`
> (`site.css`) to ~112.5% at ~2200px and holds flat past that cap; at or below 1440px it
> floors at exactly 1rem, so a laptop or a standard desktop renders unchanged. Because the
> whole theme is rem-based, the reading measure (`--container-measure: 44rem`) included,
> this one root value grows the entire surface proportionally rather than the layout
> reflowing into a wider grid or new columns at the ultrawide breakpoint."

And "## Type" (`:98-105`), the fluid clamp scale: "The scale is fluid `clamp()` on a
~1.24 ratio, body a comfortable 17px across its own vw range (its floor keeps the
pre-existing mobile size; only its ceiling is anchored...): Every step's ceiling,
including body, is anchored so it does not compound with the root clamp below: the root
carries body the rest of the way to about 19px at ultrawide, while each step's floor
stays at its original, pre-anchor size so the mobile end never shrinks."

**Chassis harvest / transfer content** — "## Transferable rules from the admin design
arc (2026-07-15)" (`:223-230`):

> "The admin refinement arc ruled several grammars that are METHOD, not admin values, and
> Geoff ratified the family direction: cairn's own artifacts (Waymark, the chassis, the
> admin) express one design system — an editor moving between admin and a scaffolded site
> should feel one hand. These rules apply here in the theme's own palette and faces; the
> admin's values (Warm Stone, the violet, its component recipes) never cross over. **The
> Waymark/chassis alignment pass in ROADMAP executes the application; until it runs,
> these are the standard new theme work is held to**" — followed by five named rules:
> the proximity spacing scale, tracking-keys-to-optical-size, the display-face keming
> audit, the accent budget, and the taste-fork method.

Also "## Vertical alignment mechanics" (`:253-258`): "The same doctrine as the admin's
own (`docs/internal/admin-design-system.md`, 'Vertical alignment mechanics'), stated here
in Waymark's register because it governs a public row the same way it governs an admin
one. **These are chassis mechanics**: how a row's declared alignment resolves in the
browser, never a constraint on a consumer's own `render`." And `:260-262`: "The measured
public corpus found ZERO rows above the 2px bar. The 2026-08 cairn-wide inventory
rendered the `(site)` chrome, the representative article page, and `/styleguide` at all
five viewports in both themes and found nothing to fix."

No explicit amendment or "harvest rule" heading beyond the above was found by grep.

---

## 8. The showcase's own docs, and the `templates/waymark` relationship

**`examples/showcase/README.md`** (full text):

> "# cairn showcase
>
> This is Waymark, cairn's starter template: a complete, working cairn site built in the
> DaisyUI and Tailwind idiom. The engine's own e2e and design suites run against this
> directory in CI, and it's the companion to
> [`docs/extend/build-a-site-by-hand.md`](../../../extend/build-a-site-by-hand.md):
> every file that page builds by hand already exists here and runs.
>
> The showcase depends on cairn through the relative `file:../..` path, so it always
> builds against the engine version in this checkout, not a published release.
>
> ## Run it locally
> ...
> ## What to do with it
>
> Read it as the worked example every guide in `docs/` refers back to. Once you have your
> own site, restyle or replace it however you like. For the rest of the docs, start at
> [`docs/README.md`](../../../README.md)."

**`examples/showcase/src/chassis/README.md`** — no other `docs/` subdirectory exists
under `examples/showcase` (only these two README files carry showcase-specific docs).
Full content summarized: opens with the boundary rule "**a theme is everything that
isn't chassis**"; a 13-row table of every chassis file and what it is (`content.ts`,
`feed.ts`, `public-routes.ts`, `entry-data.ts`, `cairn.server.ts`, `dev-gate.ts`,
`render.ts`, `archive.ts`, `date.ts`, `theme-toggle.ts`, `tokens.css`, `prose.css`,
`composition.css`); states "The chassis is deliberately generous, not minimal (Geoff,
2026-07-05)"; documents "Every override seam" in detail (adapter/delivery wiring, the
token system including the Tailwind `--spacing-xs`/`-xl`/`-2xl` vs. `max-w-*` collision,
cascade-layer unlayered-beats-layered rule, the prose foundation, `render.ts`'s
component-grammar and prose-typography seams, `theme-toggle.ts`, `composition.css`'s
primitives including `.cairn-site-shell`/`.cairn-site-main` "harvested from the
AstroPaper port's own hand-rolled shape"); "The themed-404 pattern" section (root-level
`+error.svelte` plus `assets.not_found_handling: "none"`); "Subtracting an element," a
removal-note table per file, verified verbatim for `composition.css` and
`theme-toggle.ts` "as part of the chassis restructure's own acceptance pass"; and "Adding
a new primitive or seam."

**`templates/waymark`'s relationship, from `scripts/build/emit-template.mjs`'s header and
`package.json`'s scripts:**

`scripts/build/emit-template.mjs:1-13` (header, in full):

> "// Emit a deployable cairn-starter template from examples/showcase. The showcase is
> the single source (Reversal 2); this script copies it out, drops the paths the
> emission manifest excludes, and rewrites the workspace-relative engine/dev dependency
> specs to a packaged engine. CI runs it against npm-packed tarballs to prove the
> scaffolded output still builds (the rot gate). Part C's generator reuses the manifest
> and this transform.
>
> // Path exclusion (.cairn-template.json) cannot reach a line inside a kept file, so a
> second pass, marker-based line stripping, runs after the copy. A start/end marker
> pair is matched as a substring of a line, so any comment form carries it: `//
> cairn-template:exclude-start`, a JSONC `//`, a shell `#`, `<!-- cairn-template:exclude-start
> -->`, or `/* cairn-template:exclude-start */`. Every line from the start marker
> through the end marker, inclusive, is dropped. The pass is fail-loud by design: an
> unterminated start, a nested start, or an end with no start throws, naming the file,
> because a silently dropped end marker would truncate the rest of the file."

`package.json:81-82`:

> `"emit:template": "node packages/create-cairn-site/scripts/emit-template-dir.mjs",`
> `"check:template": "node packages/create-cairn-site/scripts/emit-template-dir.mjs --check",`

The npm scripts target `packages/create-cairn-site/scripts/emit-template-dir.mjs`, whose
own header (`:1-13`) states: "Emit the public Waymark template into `templates/waymark/`
at the repo root, from this package's own bake output plus the repo-only overlay (README,
LICENSE, .dev.vars.example, the .gitignore negation). The tree is generated wholesale:
every emit regenerates it, so a hand edit survives at most one run, and `--check` fails
when the committed tree and a fresh emit disagree." That script's `bake()` (imported from
`packages/create-cairn-site/scripts/bake-template.mjs:10`) in turn imports `emitTemplate`
from `scripts/build/emit-template.mjs:10` — so `npm run emit:template` composes: showcase
→ (`emit-template.mjs`'s exclude-list + marker-strip transform, run via `bake-template.mjs`)
→ overlay-applied → written to `templates/waymark/`; `npm run check:template` runs the
same pipeline with `--check` and fails on drift between the committed `templates/waymark`
tree and a fresh emit. This is the mechanism cited by `internals-c-pass.md`'s Task 4
("the baked template is generated wholesale from the showcase... re-emit, never
hand-edit") and by the `audit-render-iconspan`/`-headrow`/`-cardshell` ledger rows'
"chassis re-homing, `emit:template` re-bake" language.

---

## 9. `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`

**The chassis slice's definition** (`:109-115`, "**6. The chassis pass.**"):

> "**6. The chassis pass.** `examples/showcase` improves against the changed engine
> (review half done: 14 findings, none rewrite-tier). PLUS the second in-tree consumer
> the original spec left unassigned: `templates/waymark` (20+ engine imports, compiled by
> the scaffold CI job, the tree `create-cairn-site` bakes, and the base for the beta-path
> site rebuilds). Each earlier slice keeps waymark compiling as part of its own gate
> (`check:consumers` and the scaffold job make breakage loud); this slice does waymark's
> deliberate adaptation and the final rebake before the cut."

**The publish ruling** (`:117-121`), which names the chassis pass as the release gate:

> "**One cut, after the chassis pass.** Geoff's call: the whole remediation ships in a
> single release with one `Consumers must:` list; `main` stays releasable throughout and
> the already-open window (toolkit-seams, harvest-detection) rolls into the same cut."

**Amendment check (grep `chassis`, `polish` across the whole file):** no other `chassis`
hit exists in this file beyond slice 6 and the publish ruling above — no `chassis`
mention in the six earlier slice descriptions. No `polish` hit exists anywhere in this
file at all: the "polish" slice (and the standing chassis mandate reordering chassis
before polish, per §2's `docs/STATUS.md` quote) is not present in this design doc as
written on 2026-08-27; it appears to have been introduced later, in `ROADMAP.md` and
`docs/STATUS.md` only (both dated/attributed 2026-09-01), without a corresponding
amendment edit to this spec file.


---

## 10. Internals-C Task 10 ruling (2026-09-04): the `createSectionAction` bullet

Verified against the tree at the internals-C branch point: `createSectionAction` has zero
non-test call sites (`grep -rln "createSectionAction" --include="*.ts" --include="*.svelte"
src/lib examples templates` returns only `src/lib` itself; no hit under `examples/` or
`templates/`), confirming §5's audit-finding-8 count. `examples/showcase/src/routes/admin/signups/+page.server.ts`
still uses the raw `requireOwner`/`formData()`/`fail(400, ...)` shape the finding names.

**Ruling: reposition, not demote.** `docs/extend/add-a-custom-admin-screen.md` keeps
`createSectionAction` as the recommended path; the guide now says so explicitly even though no
shipped example wires it, so a reader does not mistake the showcase's own signups route for
the sanctioned shape. `docs/reference/sveltekit.md`'s `createSectionAction` entry cross-links
the guide with the same "sanctioned shape regardless of what any given site's own routes show"
framing. The evidence favors keeping the recommendation rather than softening it: on branch
`experiment-screen` (not merged), a measured experiment built a custom admin screen following
the showcase's raw exemplar shape instead of the documented `createSectionAction` path, and its
reviewer flagged the deviation, an independent data point that the docs' guidance is right and
the showcase exemplar is what is out of date.

**Routed to chassis:** adopting `createSectionAction` in `examples/showcase`'s signups route is
showcase-exemplar work, not a docs fix, and belongs to the chassis pass that touches that route.
The chassis-A plan (`docs/superpowers/plans/2026-09-04-chassis-a-pass.md`) keeps the showcase's
raw shape as written and defers adoption to chassis-B on this ruling.
