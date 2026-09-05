# Adversarial review: `examples/showcase` at the exemplar bar

Read-only review, fresh eyes, against the standing mandate that the chassis sets the code bar.
Context read first: `CLAUDE.md` ("What cairn is", "Visual work"),
`docs/internal/what-cairn-is-and-is-not.md`, `docs/internal/public-design-system.md`, and
`docs/internal/engine-rulings.md` (chassis / showcase / `audit-render-iconspan` /
`audit-render-headrow` rows).

All paths are absolute-relative to `/var/home/glw907/Projects/cairn-cms`. Line numbers are from
`main` at `ec2c93f5`.

## Prior art, and what it means for this review

A 2026-08-26 audit already ranked fourteen findings over this exact tree
(`docs/internal/record/2026-08-26-any-site-audit/int-rank-site-chassis.md`, verified in
`int-verify-site-chassis.md`). I found this only after working the tree independently. I
re-derived roughly half of it from scratch, which is corroboration rather than duplication, and
every item I checked is **still unexecuted in the working tree**. Where a finding below restates
one of those ranks I say so, because that changes the meaning: it is no longer "a reviewer thinks
this", it is "the repo already ruled this and the tree still ships it". Findings marked NEW were
not in that record.

One scope note honored throughout: the `ec-*` → `cairn-*` rename is internals-C Task 4 and is
**not** filed here. Task 4's own acceptance criteria cover
`examples/showcase/src/chassis/prose.css` (14 hits), the `templates/waymark` re-emit, and the
`e2e/design-review-fixes.spec.ts` locator. What I do file is residue the mechanical rename will
step over.

---

## 1. Idiom drift from the engine and its docs

### 1.1 The markdown-twin route hand-rolls a second `PublicRoutesConfig` (prior rank 3, open)

`examples/showcase/src/routes/(site)/[...path=md]/+server.ts:13-21` builds its own
`createPublicRoutes({...})` literal instead of importing `publicRoutesConfig` from
`$chassis/public-routes`. The chassis README describes that file as "The one `PublicRoutesConfig`
literal, shared by the prerendered entry route and the preview route so their rendering config can
never drift apart" (`examples/showcase/src/chassis/README.md:28`), and the file's own header says
the same thing twice more (`public-routes.ts:1-6`).

The two literals **already differ**: the chassis copy carries `defaultImage` and `feeds`
(`public-routes.ts:17-18`), the twin route's does not. So the drift the single-source file exists
to prevent is present in the exemplar, in the very tree that teaches the pattern.

What a copying developer learns wrongly: that "one shared config literal" is advice you may
ignore per route, and that the `.md` twin legitimately has a different SEO surface than the HTML
page it twins.

Leanest fix: `import { publicRoutesConfig } from '$chassis/public-routes'` and call
`createPublicRoutes(publicRoutesConfig)`. The twin only calls `markdownEntries`/`markdownLoad`,
neither of which reads `defaultImage` or `feeds`, so the extra members are inert. Then delete the
duplicate imports of `site`/`ORIGIN`/`SITE_DESCRIPTION`/`cairn`/`siteConfig` at lines 3-4.

### 1.2 `siteConfig` is imported through two different doors in sibling routes — NEW

`examples/showcase/src/routes/+layout.server.ts:9-11` carries an explicit comment saying
`site-config.ts`, not `$theme/cairn.config.js`, "is the import here on purpose: the full adapter
also builds the renderer, the icon set, and the registered components, none of which a nav array
needs."

Its sibling `examples/showcase/src/routes/(site)/+page.server.ts:4` then does exactly what that
comment warns against: `import { siteConfig } from '$theme/cairn.config'`, pulling the renderer,
the nine component definitions, the icon set and the committed media manifest into a load whose
only use of it is `readVocabulary(siteConfig)` (line 18).

Both work (`cairn.config.ts:526` re-exports it), which is what makes this teaching-hostile: two
adjacent exemplar files model opposite idioms for the same import, and one of them carries a
comment explaining why the other is wrong.

Leanest fix: `import { siteConfig } from '$theme/site-config'` in `(site)/+page.server.ts`, and
say once, in `site-config.ts`, that it is the lean door every non-adapter reader uses.

### 1.3 `feed.ts` mixes optional chaining and non-null assertions on the same value — NEW

`examples/showcase/src/chassis/feed.ts:10-19`:

```ts
const posts = site.concept('posts');
...
(posts?.all() ?? []).map(async (p) => ({
  ...
  contentHtml: await cairn.rendering.render({ body: posts!.byId(p.id)!.body, resolve }),
```

Line 14 treats `posts` as possibly undefined; line 19 asserts it is not, twice, inside the
callback the first line guarded. A reader cannot tell which posture is the intended one, and the
`byId(...)!` assertion is a real (if currently unreachable) crash surface.

Leanest fix: one early guard, then plain member access.

```ts
const posts = site.concept('posts');
if (!posts) return [];
```

### 1.4 The published design-system doc points at file paths that no longer exist — NEW

`docs/internal/public-design-system.md` names `examples/showcase/src/lib/theme.css`,
`examples/showcase/src/lib/prose.css`, and `examples/showcase/src/lib/components/` in its opening
paragraph and again in its "Pointers" section. The showcase has no `src/lib` at all
(`svelte.config.js:13-14` says so explicitly). The real homes are `src/theme/theme.css`,
`src/chassis/prose.css`, and `src/theme/components/`.

This is the doc an implementing agent is told to read before any public-theme work, so the drift
costs a wrong-file edit or a wasted search on every use. It also mis-teaches the chassis/theme
split the restructure created: `prose.css` is chassis, `theme.css` is theme, and the doc's old
paths flatten both into `lib`.

Leanest fix: three path corrections in that doc. Low cost, high leverage, and it belongs to this
pass because the pass is the thing that re-reads it.

### 1.5 The chassis carries one theme's identity — NEW (boundary observation, not a defect)

`examples/showcase/src/chassis/prose.css:32-37` keeps the three Waymark signature gestures (the
cairn-glyph `hr`, the diamond bullet, the margin-hanging pull-quote) inside the *genre-free*
layer, behind `.prose[data-flourish]`. The chassis README's own boundary rule is that "a specific
look ... belongs to the theme" (`src/chassis/README.md:205-207`).

This is a ratified design (the 2026-07-04 neutral-by-default ruling put them there deliberately),
so I am not asking to move them. I flag it because a theme author reading the boundary rule and
then reading `prose.css` gets contradictory instruction. Leanest fix: one sentence in the chassis
README's `prose.css` row naming the flourish block as the single, deliberate exception and why.

---

## 2. Structure

### 2.1 `cairn.config.ts` is a 526-line monolith doing five jobs (prior rank 10, open)

`examples/showcase/src/theme/cairn.config.ts` holds: the icon set (18-35), a URL parser (77-92),
nine `defineComponent` definitions (37-346), the registry and renderer (348-354), the media wiring
(356-378), and the adapter itself (380-521). The adapter — the thing every guide points a
developer at, the thing the file is named for — starts at 73% of the way down.

The chassis README makes "one concern per file" a stated organizing principle
(`src/chassis/README.md:178-180`). The theme's single most-read file is the one place it does not
hold.

Compounding it, the header is **stale**: line 1-2 says "It declares one post-like concept, a render
that runs the engine pipeline, and a backend the dev GitHub double answers for." The file declares
three concepts (`posts`, `pages`, `fragments`), nine components, a media manifest, an admin nav
layout, and a preview config.

Leanest fix: move the nine components plus `icons` and `parseVideoUrl` into
`src/theme/components/directives.ts` (or one file per group), leaving `cairn.config.ts` as the
adapter plus its imports — roughly 150 lines that read top to bottom as "here is my site". Rewrite
the two-line header against what remains.

### 2.2 The emitted scaffold ships two internal fixtures to every consumer site (prior rank 2, open)

`examples/showcase/.cairn-template.json` excludes `src/routes/test`, `src/members`, `e2e`,
`scripts`, and `.claude`. It does not exclude two things that are just as internal.

**`src/routes/probe-craft/`** (a 119-line `+page.svelte` plus its own CSS) is verified present in
the baked scaffold at `templates/waymark/src/routes/probe-craft/`. Its own doc block
(`examples/showcase/src/routes/probe-craft/+page.svelte:1-26`) says it is "The craft chapter's
acceptance fixture (design infrastructure Pass 3, Task 11)", that it exists "only to prove the
craft chapter's acceptance test (spec section 12, criterion 5)", that it is "Deliberately
un-cairn", and that three of its markup choices are **known defects kept on purpose** (a
`data-theme` on a styled wrapper, an unlabeled search input, an empty `<th>`). Every scaffolded
site therefore ships a public route carrying fake member records, a documented accessibility
defect, and a pointer to `docs/internal/admin-design-system.md`, a file that is not in the npm
tarball.

**`(site)/+layout.server.ts`** returns `{ siteLayoutSentinel: 'cairn-showcase-site-layout' }`
(line 16), verified present at `templates/waymark/src/routes/(site)/+layout.server.ts:16`. Its own
doc block calls it "A minimal fixture field for the preview pass's leak-sentinel e2e
(preview.spec.ts)". Every public page of every scaffolded site serializes that string into its
payload, and nothing in the scaffold reads it.

Leanest fix: add `src/routes/probe-craft` to the exclude list; wrap the sentinel return in the
`cairn-template:exclude-start`/`-end` markers the same file family already uses (see
`src/app.d.ts:44-49` and `src/hooks.server.ts:21-30` for the established idiom), leaving the
scaffold with a load that returns `{}` or no load at all. Re-emit.

### 2.3 The paginated archive subsystem never executes, and buys a build-gate exception to stay green (prior rank 1, open)

`examples/showcase/src/chassis/archive.ts:10` sets `ARCHIVE_PAGE_SIZE = 50`. The showcase has 14
posts. `paginateArchive` therefore always returns `totalPages: 1`, `/archive/[page]`'s
`EntryGenerator` (`(site)/archive/[page]/+page.server.ts:16-21`) always returns an empty array, and
the route never prerenders a single page.

To keep that green, `examples/showcase/svelte.config.js:47-50` carries a permanent
`handleUnseenRoutes` exception naming `/(site)/archive/[page]` by id, with a comment
(lines 39-46) saying the case was "found in a 14-post merge rehearsal; the 220-post fixture here
never triggers it" — a comment describing a fixture the tree no longer has.

So the exemplar ships: 51 lines of chassis logic that never runs in it, a 188-line route component
that renders in no build and appears in no visual baseline, and a permanent weakening of a build
gate to hide the fact.

Leanest fix, pick one and commit to it: either drop `ARCHIVE_PAGE_SIZE` to a number the corpus
crosses (5 or 6 gives two or three real pages, exercises the year grouping, and puts
`/archive/2` in the visual matrix), or delete the `/archive/[page]` route, the pagination markup,
and the `handleUnseenRoutes` exception together. The first is better: pagination is a real thing a
starter site needs, and proving it costs one constant.

### 2.4 The archive route's entire stylesheet is a verbatim copy, and the entry row is written three times (prior rank 6, open)

Measured: `(site)/archive/[page]/+page.svelte`'s `<style>` block is 121 lines and has **zero**
lines that are not also in `(site)/+page.svelte`'s 244-line block. The `<article class="entry">`
row markup appears at `(site)/+page.svelte:119`, `(site)/+page.svelte:140` (twice in one file), and
`(site)/archive/[page]/+page.svelte:34`.

A developer copying this learns that a shared row is copy-pasted per route, in a tree whose
chassis README makes "anything load-bearing for more than one element lives in its own file" a
rule (`src/chassis/README.md:179-180`).

Leanest fix: one `src/theme/components/EntryRow.svelte` owning the row markup and its scoped
styles, used at all three sites. That also removes the archive route's whole style block.

### 2.5 464 lines of theme components that nothing imports (prior rank 5, open)

`grep` over `src` and `e2e` finds zero importers of
`examples/showcase/src/theme/components/Carousel.svelte` (197 lines) and
`examples/showcase/src/theme/components/IntroLedger.svelte` (267 lines). Both are harvested from
cairn.pub and both ship into every scaffold. `IntroLedger.svelte:27` even defaults its title to
`'What is cairn?'`, and `Carousel.svelte:124` carries a `cairn-audit-disable-next-line` suppression
for a rule that can never fire on a component that never renders.

Leanest fix: delete both, or adopt one on the home page or the styleguide so it is rendered,
baselined, and taught. Deletion is cheaper and the harvest is recoverable from git.

### 2.6 A leftover one-off script whose own header says it was to be deleted — NEW

`examples/showcase/scripts/reference-capture.mjs:1-2`: "One-off driver for the 2026-08-15
writer-facing reference capture pass. Not part of the package or the e2e suite; **deleted after
the pass**." It is 531 lines, still present. (`scripts/` is excluded from the template, so this
does not reach a consumer — it is exemplar-tree hygiene only.)

Leanest fix: delete it. Its sibling `design-probe.mjs` explicitly says it is *not* pass-scoped
(line 5-6) and should stay.

### 2.7 The theme hand-rolls the shell the chassis exists to provide, and says so (prior rank 8, open)

`composition.css:95-116` defines `.cairn-site-shell` / `.cairn-site-main`, baking in the flex
cross-axis width fix. `(site)/+layout.svelte:70` and `+error.svelte:26` both hand-roll
`class="site-shell flex min-h-screen flex-col"` instead. `site.css:78-91` then re-derives the same
fix on `.site-main`, and its comment at line 89 admits it: "Chassis's own `.cairn-site-main` recipe
(composition.css) documents and bakes in this exact fix; this hand-rolled shell needs the same
explicit width."

The identical gotcha prose is now written three times: `src/chassis/README.md:132-141`,
`composition.css:95-106`, and `site.css:78-90`.

Not one of the seven composition primitives (`.cairn-card`, `.cairn-band`, `.cairn-section`,
`.cairn-hero`, `.cairn-sidebar-layout`, `.cairn-site-shell`, `.cairn-site-main`) is used anywhere
in the showcase's markup — I grepped `src/routes` and `src/theme` and found only that one comment
mention. The chassis README concedes it (line 125) and `composition.css:5-6` concedes it again.

I accept the "generous, not minimal" ruling (Geoff, 2026-07-05) as the reason the primitives
exist. It is not a reason for the exemplar to *ignore* them: an unused primitive is unrendered,
un-baselined, unproven at 320 and 2560, and reads to a copying developer as dead code with an
apology attached.

Leanest fix: adopt the two that have an obvious home — `.cairn-site-shell`/`.cairn-site-main` on
the `(site)` layout and the root error page, `.cairn-hero` on the home masthead
(`composition.css:52-54` already names both as the intended adopters). That deletes the triplicated
gotcha prose down to one copy, deletes `site.css`'s hand-rolled `width: 100%` block, and puts two
primitives into the visual baselines.

### 2.8 `platform!` asserted three times in the custom-screen exemplar — NEW

`src/routes/admin/signups/+page.server.ts:20`, `:33`, `:42` each write
`event.platform!.env.APP_DB`. This is the file the docs point at as the worked example of a
developer's own admin screen, so the non-null assertion is the idiom a developer copies into their
own D1 route.

Leanest fix: one narrowing at the top of each handler (or a small `appDb(event)` helper in the
same file) that throws a real 503 when `platform` is absent, which is also the honest behavior
under `vite preview`.

---

## 3. Comment and prose register

The tree is mostly disciplined — only two em dashes in all of `src`. The failures are
concentrated and systematic.

### 3.1 Pass, plan, and spec citations in shipped exemplar code (partly prior rank 13, open)

Fourteen sites cite internal process. The worst offenders, each in a file a developer reads first:

| Location | Text |
| --- | --- |
| `src/chassis/prose.css:2` | "cairn bespoke reading surface — the signature **B2 deliverable**" |
| `src/routes/(site)/styleguide/+page.svelte:3,5,9,216` | "**B3 and B4** add their feature and option components", "the manual light/dark toggle is **B4**", "the **B2** core component set" |
| `src/routes/admin/signups/+page.server.ts:1` | "the **Plan 1** extension-seam proof" |
| `src/theme/cairn.config.ts:484` | "(**spec §2**, the organize-your-admin-nav guide's own worked shape)" and "Two taxonomy rulings (**design arc 2026-07-15**)" |
| `src/theme/cairn.config.ts:223` | "a bigger design call **the design review owns**" |
| `src/theme/site.css:102,119` | "the `:::figure` role classes (**media 3a**)" |
| `src/chassis/archive.ts:8` | "Derived against the **220-post review fixture**" (a fixture the tree does not have) |
| `e2e/design-review-fixes.spec.ts` | the whole **filename** is a process name |

Two of these are stale, not merely off-register. `styleguide/+page.svelte:5` says "the manual
light/dark toggle is B4" — it shipped, in `SiteHeader.svelte`. `archive.ts:8` justifies a page size
against a fixture that is not in the repo.

Leanest fix: restate each as what the code does, dropping the pass name. "The reading surface, hand
authored, not `@tailwindcss/typography`." "The type scale, the color tokens, the reading surface,
and the component set." "A developer's own custom admin screen." Rename
`design-review-fixes.spec.ts` to what it asserts (`prose-icon-sizing.spec.ts` on its content).

### 3.2 History narration: comments about code that is no longer there — NEW (partly prior rank 13)

Fourteen sites narrate a change rather than state the contract. Representative:

- `src/theme/site.css:3-4` — "The chrome ... **moved to** owned token-driven components ...; this
  sheet **now carries only** the centered `.site-main` measure".
- `src/chassis/cairn.server.ts:13` — "The dev content backend **now rides** `event.locals.cairnBackend`
  ... so there is **no token stub here**." A comment about absent code.
- `src/hooks.server.ts:6-9` — "**No handleError hook**: ... so this hook **has nothing left to do**."
  Four lines documenting a function that does not exist.
- `src/theme/components/admin-link.ts:3-4` — "SiteHeader **used to** compare the URL directly;
  SiteFooter **used to** carry a separate `crawl: false` flag per nav entry."
- `src/theme/components/SiteHeader.svelte:62` — "the same shape the **hardcoded list used to be**".
- `src/routes/+layout.svelte:18` — "importing that client-side is what **used to ship** the whole
  adapter to every public page."
- `src/chassis/date.ts:3` — "(the archive and the article **disagreed before this module existed**)".
- `src/chassis/dev-gate.ts:9-13` — "**was the earlier shape** ... **Verified against** `wrangler
  deploy --dry-run` output **on 2026-08-04**".
- `src/routes/admin/+layout.server.ts:2-3` — "The per-view catch-all load **no longer** carries
  chrome; it **rides this one** layout load instead."

The mechanism explanations inside several of these (the Vite `define` fold in `dev-gate.ts`, the
client-bundle reason in `+layout.svelte`) are genuinely load-bearing and must stay. What should go
is the tense: state the rule, not the repair. `dev-gate.ts` is the clearest case — keep every word
about why a shared `const` does not fold, drop "was the earlier shape" and the dated verification.

### 3.3 A 35-line derivation narrative in the file a site owner is told to edit — NEW

`src/theme/theme.css:191-225` is thirty-five lines of how the type scale was arrived at: "the two
clamps **used to compound**", "**the old** 1.22rem step-0 ceiling to **the new** 1.0625rem one",
"Step--2 is **a later addition**, outside the rescale above". The file's own header (line 2-3)
calls it "The one file a site owner edits to re-skin."

Leanest fix: keep the two facts a re-skinner needs (each step's ceiling is anchored so it does not
compound with the root clamp in `site.css`; each step's floor is the unscaled mobile value) in about
five lines. Move the derivation to `docs/internal/public-design-system.md`, which is where a reader
looking for it would go.

### 3.4 The `cairn-cms:` header prefix forks (prior rank 13, open)

Eight modules open with `// cairn-cms:` (`src/chassis/dev-gate.ts:1`, `src/chassis/feed.ts:1`, and
the six under `src/members/` and `src/routes/members/`); roughly thirty do not. The prefix carries
no information inside a file that lives in a cairn site.

Leanest fix: drop the prefix from all eight.

### 3.5 `@component` blocks running to 46 lines — NEW

`src/theme/components/SiteHeader.svelte:1-46` and `src/routes/(site)/+layout.svelte:1-34` narrate
layout mechanics, browser bugs, and vendored-source verification inside the component doc block.
The `svelte-conventions` standard puts purpose, contract, and failure mode in `@component` and
sends the rest to the code it describes.

Leanest fix: keep the contract in `@component` (what the header renders, where nav comes from,
what the toggle persists), and move each mechanism note to the rule or the statement it explains —
the `contents`/`order` explanation already has a home in the markup comment at lines 116-121, so
the header's copy of it at lines 31-40 is a second copy.

### 3.6 `ec-*` rename residue (filed narrowly, per the brief)

internals-C Task 4 covers the selectors, the template re-emit, and the e2e locator. What it will
step over:

- `e2e/design-review-fixes.spec.ts` — the **filename** and its lines 5-7 comment, which describe a
  design-review finding rather than an assertion.
- `src/chassis/tokens.css:17` — "`cairn.config.ts`'s `cardShell`/`headRow`, emits real
  `card-body`/`card-title`/`alert` classes". This is chassis CSS reaching into the theme's config
  by name, and it goes stale the moment section 6's re-homing lands.
- `src/chassis/prose.css:23` — "NOT **the mockup's** BEM names". A copying developer has no mockup.

---

## 4. CSS and design-system conformance

### 4.1 Two degenerate `clamp()` declarations, preserved for shape symmetry — NEW

`src/theme/theme.css:227-228`:

```css
--text-step--1: clamp(0.84rem, 0.84rem, 0.80rem);   /* min EXCEEDS max */
--text-step-0:  clamp(1.06rem, 1.06rem, 1.0625rem); /* min == preferred */
```

Both are correct-by-accident: CSS resolves a `clamp()` whose minimum exceeds its maximum to the
minimum, and both collapse to a constant. Both are also, on sight, bugs, and the file spends lines
209-221 explaining that they are not. A copying theme author either propagates the shape into their
own scale or "fixes" one and changes the rendered size.

Leanest fix: write the constants (`--text-step--1: 0.84rem;`) with a one-line comment saying the
step is deliberately flat below 1440px and grows only with the root clamp in `site.css`. The scale
loses nothing; the file loses fifteen lines of defense.

Related, smaller: `--text-step-1` (line 229) and `--text-step-2` (line 230) are byte-identical
clamps. Two named rungs at one size, with no comment saying it is deliberate.

### 4.2 The focus ring is hand-written 22 times across 9 files — NEW

`outline: 2px solid var(--color-primary)` with `outline-offset: 2px` appears 22 times, in
`prose.css`, `(site)/+page.svelte`, `(site)/archive/[page]/+page.svelte`,
`(site)/styleguide/+page.svelte`, `SiteHeader.svelte`, `SiteFooter.svelte`, `ArticleView.svelte`,
`Carousel.svelte`, and `IntroLedger.svelte`.

`docs/internal/public-design-system.md` calls this "A consistent `:focus-visible` language ...
across the chrome, the reading surface, and the styleguide, with the `base-100` halo on tinted
grounds" — a named design device with twenty-two hand-maintained copies and no single source. A
re-skin that wants a thicker ring or a different offset edits nine files, and the base-100 halo is
present in only some of them.

Leanest fix: one recipe in `composition.css` (`.cairn-focus-ring`, or a Tailwind v4 `@utility`)
reading `--cairn-focus-ring-*` tokens, applied at the 22 sites. This is the single highest-value
composition primitive the chassis could add, and unlike the seven it already ships, it has 22
proven call sites.

### 4.3 Two chrome tokens are theme-only, so a second theme dangles them — NEW

`SiteHeader.svelte:184-185` and `SiteFooter.svelte:82` read `--cairn-caption-tracking` and
`--cairn-focus-ring-radius`. Both are declared **only** in `src/theme/theme.css:311-312`, with no
generic default in `src/chassis/tokens.css`.

The chassis README's promise is that every semantic binding gets a chassis default "so they resolve
to something reasonable under any theme's own colors with zero tuning"
(`src/chassis/README.md:59-63`). These two break it, and the token-resolution gate does not catch
it (see 5.2).

Leanest fix: add both to `tokens.css`'s `:root` block with generic defaults
(`--cairn-caption-tracking: var(--tracking-eyebrow); --cairn-focus-ring-radius: 2px;`), keeping
theme.css's values as the override.

### 4.4 Literals in `site.css`, in the one theme sheet the token gate does not read — NEW

`src/theme/site.css:194` `border-radius: 0.25rem` (the radius scale offers
`--radius-selector`/`--radius-field`/`--radius-box`), `:193` `border-left: 3px solid`, `:140`
`max-height: 32rem`. Small on their own. They matter because `site.css` is the one theme stylesheet
outside the no-literals walk (see 5.2), so it is precisely where drift accumulates unobserved.

### 4.5 No class namespace convention — NEW

The tree runs four namespaces at once: `cairn-*` (chassis primitives, engine-emitted contracts),
bare `site-*` (`.site-main`, `.site-header`, `.site-shell`), `sg-*` (styleguide), and bare
directive classes (`.callout`, `.alert`, `.cta`, `.banner`, `.entry`, `.lead`). The bare directive
names are the risk: `.alert` and `.card-body` collide directly with DaisyUI's own component
classes, which is exactly why `tokens.css:49-60` must keep `alert` and `card` in the DaisyUI build
and why `prose.css:26-27` has to explain that `.prose` scoping is what wins the specificity race.

internals-C is in the middle of establishing `cairn-*` as the engine's emitted namespace. That
makes this the moment to say what a *theme* should namespace and what it should not, in one
paragraph in the chassis README. A copying developer currently has four examples and no rule.

### 4.6 Two page-title separators — NEW

`+error.svelte:23` uses `{page.status} | Waymark`;
`(site)/archive/[page]/+page.svelte:17` and `(site)/styleguide/+page.svelte:107` use `·`. One tree,
two conventions, in the smallest possible surface.

### 4.7 Site identity hardcoded while `siteConfig.siteName` exists (prior rank 7, open)

`site.config.yaml:1` declares `siteName: Waymark`. "Waymark" is then hardcoded in
`SiteHeader.svelte:112`, `SiteFooter.svelte:52`, `+error.svelte:23`,
`(site)/archive/[page]/+page.svelte:17`, and `(site)/styleguide/+page.svelte:107`. A developer who
renames their site in the config file gets a header, footer, and three page titles that still say
Waymark.

Two more origin-shaped literals compound it: `src/chassis/content.ts:29`
`ORIGIN = 'https://showcase.test'` and `wrangler.jsonc:61`
`PUBLIC_ORIGIN: 'http://localhost:4173'`. The ledger has ruled that `ORIGIN` stays a committed
literal (`public-origin-only-origin-source`, decline, 2026-08-26 — env-sourcing collides with
pinned visual baselines), and I am not reopening that. But the file carries **no comment saying
so**, and a scaffolded site now has two different origin values in two files with nothing telling
the developer that one is the canonical/OG/feed origin they must change and the other is the
magic-link origin.

Leanest fix: read `siteConfig.siteName` at the five sites (all already have or can cheaply get
`page.data`); add two lines at `content.ts:29` naming what `ORIGIN` feeds and pointing at
`PUBLIC_ORIGIN` as its distinct sibling.

---

## 5. Tests and gates

### What is covered today

- `check:chassis-boundary` — fails any import resolving into `src/chassis/` that names a file not
  in the README table. Genuinely good, and unusual: the boundary is enforced, not asserted.
- `check:public-tokens` — no literal colors and no absolute font sizes across showcase `.svelte`
  files, `prose.css`, and `composition.css`; dual-gamut AA over every role/`-content` pair parsed
  out of `theme.css`, re-run with the cairn-theme overlay merged.
- `test:reskin` (`scripts/lab/reskin-fixture.mjs`) — a hue rotation still clears AA, prose has no
  second color source, every token resolves.
- `check:template` — the baked `templates/waymark` matches a fresh emit; CI fails on divergence.
- `test:emit` — the exclude-marker stripper's own unit tests.
- The e2e width matrix (`e2e/site-visual.spec.ts:23-56`) — 320/390/768/1440/2560 × light/dark ×
  {home, article, styleguide} = 30 baselines, plus a 1920 mid-slope baseline (lines 66-73), plus a
  footer-pin geometry assertion and a focus-ring computed-style assertion.
- 38 e2e specs covering the golden path, media, preview, fragments, members, islands, spellcheck,
  tidy, and the admin.

That is a strong suite. The gaps below are what an exemplar tree still leaves unproven.

### 5.1 The showcase has no linter and no formatter at all — NEW, and the largest gate gap

The root `lint` script is `eslint src/lib`. `check:comments` is
`bash scripts/checks/check-comments.sh` over `src/lib`. There is no `.prettierrc`, no
`.prettierignore`, and no `format` script anywhere in the repo.

So the entire TSDoc apparatus the engine is held to — `eslint-plugin-tsdoc`, `eslint-plugin-jsdoc`,
`jsdoc/informative-docs` (the paraphrase detector), and the local `house/no-em-dash-in-comments`
rule — **does not run on `examples/showcase`**. The tree the standing mandate says must equal the
engine's bar is held to no mechanical bar at all.

The visible consequences are already in the tree: tab indentation in
`e2e/masthead-responsive.spec.ts` (52 lines), `e2e/site-visual.spec.ts` (62 lines), and
`e2e/theme-toggle.spec.ts` (28 lines) against spaces everywhere else, and
`playwright.config.ts` which is **tab-indented at lines 4-14 and space-indented from line 15
down**, inside one 36-line file.

Leanest fix, and the one structural change that would hold this pass's gains: extend
`eslint.config.js`'s `COMMENT_GLOBS` to `examples/showcase/src/**` (chassis first if the theme's
`.svelte` files are too noisy to fix in one pass), and add a formatter with a single config for
both trees. Without this, every register fix in section 3 is a one-time cleanup that drifts again.

### 5.2 `site.css` is outside the no-literals walk, and no gate resolves a component's `var()`

`scripts/checks/check-public-tokens.mjs:79` selects files by
`name.endsWith('.svelte') || name === 'prose.css' || name === 'composition.css'`. `site.css` is a
real theme stylesheet with 199 lines of rules, and it is scanned by nothing. Finding 4.4's literals
live there for that reason.

The token-**resolution** half runs over `prose.css` and the code ramp. It does not resolve
`var(--token)` inside a `.svelte` scoped `<style>` block, which is how 4.3's two theme-only chrome
tokens went unnoticed.

Leanest fix: add `site.css` to the scanned set (it should pass today except for the three literals
in 4.4), and extend the resolution check to `.svelte` `<style>` blocks.

### 5.3 The width matrix covers three surfaces; four more are unproven at the extremes

Not at any of the five viewports: `/archive/2` (188 lines of markup, and per 2.3 it never renders
at all today), the root `+error.svelte` (which **hand-rebuilds the entire chrome** and can drift
from `(site)/+layout.svelte` silently), `/members`, and `/admin/signups` (the custom-screen
exemplar).

The 404 is the one that matters: it is the single most duplicated layout in the tree and the only
one with no baseline.

Leanest fix: add `/404` (or any unmatched path) and `/archive/2` to `VIEWPORT_WIDTHS`' surface
loop. Two entries in an array; the spec is already written as a matrix so a surface joins by
extension (its own comment at lines 20-22 says so).

### 5.4 The chassis's pure logic has no unit tests (prior rank 4, open)

`paginateArchive` (clamping, year grouping, boundary pages), `sortNewestFirst` (undated sorts
last), `isBannerExpired` (missing and unparsable dates count as expired), `resolveTheme`,
`formatDate`, `isAdminHref` — all pure, all fast, all currently tested only indirectly through
Playwright, if at all. The showcase has no vitest project.

`isBannerExpired`'s contract in particular ("A missing or unparsable `expires` counts as expired
too") is documented in three places and asserted nowhere as a unit.

Leanest fix: one `vitest` project in the showcase covering the six pure chassis modules. It also
gives the tree somewhere cheap to pin future chassis behavior, which is what makes the "generous,
not minimal" chassis maintainable.

### 5.5 The composition primitives are proven by nothing

Following 2.7: seven primitives, 117 lines, zero markup users, therefore zero visual baselines and
zero assertions. `.cairn-sidebar-layout`'s 48rem stacking breakpoint and `.cairn-site-main`'s
cross-axis fix — the two with real behavior — are exactly the kind of thing the width matrix exists
to catch, and neither is in it.

Adopting the two primitives in 2.7 fixes this as a side effect.

### 5.6 A screenshot floor the suite documents but does not compensate for

`playwright.config.ts:4-14` states plainly that `maxDiffPixels: 120` means "a green screenshot run
is not evidence that a small-footprint defect class is absent" (a 1.5px shift on a 16px icon
measured 51 pixels). For the admin, the compensating gate exists:
`src/tests/component/vertical-alignment-recipes.test.ts`. For the public template, it does not —
`docs/internal/public-design-system.md`'s "Vertical alignment mechanics" section is doctrine held
by nothing mechanical, and its own note says the 2026-08 public corpus measured clean.

Not a defect. Worth naming as the one place where the public side is measured more loosely than
the admin, in case the chassis pass wants to close it while it is already in this tree.

---

## 6. The `cardShell` / `headRow` / `iconSpan` re-homing

### Where they live today

Defined in `src/lib/render/rehype-dispatch.ts:20` (`iconSpan`), `:29` (`cardShell`), `:39`
(`headRow`); barrelled onto the `/render` subpath by `src/lib/render/authoring.ts:9`.

**Zero engine-internal callers.** `grep -rn "cardShell(\|headRow(\|iconSpan(" src/lib` returns only
the three definitions. The trio exists solely for consumers.

### Who imports them

| Site | What |
| --- | --- |
| `examples/showcase/src/chassis/render.ts:8` | `import { iconSpan } from '@glw907/cairn-cms/render'`; used once, at line 20, inside `makeIconRenderer` |
| `examples/showcase/src/theme/cairn.config.ts:4` | `import { cardShell, headRow } from '@glw907/cairn-cms/render'`; used **once each**, at lines 106-107, in the `alert` component only |
| `templates/waymark/src/chassis/render.ts`, `templates/waymark/src/theme/cairn.config.ts` | the baked twins of both |
| `docs/extend/configure-rendering.md:49,57-58,84-85` | the worked example, with a real `import` |
| `docs/reference/render.md:11,18-20` and `docs/reference/core.md:696-709` | the reference pages |

Worth naming: of nine components in `cairn.config.ts`, exactly one uses `cardShell`/`headRow`. The
other eight hand-build with `h()`. So the exemplar already teaches two grammars for the same job,
and the minority grammar is the one the docs lead with.

### What the re-homing changes in the showcase

The rulings (`audit-render-cardshell`, `audit-render-iconspan`, `audit-render-headrow`, all
retire, all deferred to the chassis pass as list (c) Tier 4) require the re-homing, the
`emit:template` re-bake, the guide rewrite, and the deletion **in one change**. Concretely:

1. **`src/chassis/render.ts`** gains local `cardShell`/`headRow` beside the existing
   `makeIconRenderer`, and `iconSpan`'s two-line body is inlined into `makeIconRenderer`
   (`iconSpan` has exactly one call site and its body is one `h()` call, so the wrapper buys
   nothing once it is local). The chassis import of `@glw907/cairn-cms/render` disappears entirely.
2. **`src/theme/cairn.config.ts:4`** drops the `/render` import; line 106-107 imports the two
   helpers from `$chassis/render.js` instead — which is also the boundary the chassis README
   already describes for `makeIconRenderer` ("a theme's `defineComponent()` build functions call
   the returned function and never import `iconSpan`/`glyph` directly",
   `src/chassis/README.md:103-106`). Today that rule holds for `iconSpan` and is silently broken
   for `cardShell`/`headRow`, which the theme imports from the engine directly. The re-homing makes
   the README true.
3. **`src/chassis/README.md:190`** (`render.ts`'s row in the removal table) and `:103-114` (its
   override-seam section) gain the two new exports. `src/chassis/tokens.css:17`'s comment naming
   "`cairn.config.ts`'s `cardShell`/`headRow`" needs re-pointing at the chassis.
4. **`templates/waymark`** re-emits from the changed showcase; `check:template` proves it.
5. **`docs/extend/configure-rendering.md`** rewrites its worked example against the chassis-local
   helpers (or against plain `h()`, which is what eight of nine showcase components already do).
   `docs/reference/render.md` and `docs/reference/core.md:696-709` lose the trio.
6. **`check:surface-leaks`' `NARRATIVE_CONTEXT_ALLOWLIST`** carries a preemptively-recorded entry
   for the trio on `core.md` (per the `f1-return-position-leak-sanction` ruling); with the trio
   gone from the docs, that entry should go too, or the allowlist starts accumulating stale
   reasons.
7. Only then does the engine delete the three functions and the `authoring.ts:9` barrel line.

One consequence worth flagging to whoever plans the pass: since the trio has zero engine callers
and one real showcase call site each, "re-home" and "inline at the call site" are nearly the same
change. `headRow` has the only real logic (optional icon, heading level), and `cardShell`'s whole
body is one `h('section', ..., [h('div', {className: ['card-body']}, body)])`. Re-homing all three
as chassis exports is defensible for a "generous chassis"; inlining `cardShell` and `iconSpan` and
keeping only `headRow` is leaner and matches how the rest of the file already builds. Either way
the ruling's requirement (one change carrying re-home, re-bake, guide rewrite, deletion) is met.

---

## Ranked top ten

Severity is what a copying developer would propagate, not effort to fix.

1. **The scaffold ships two internal fixtures to every consumer site** (2.2). `probe-craft/` is a
   design-acceptance fixture with three documented, deliberate defects and a pointer to a doc that
   is not in the tarball; `siteLayoutSentinel` is an e2e fixture serialized into every public page's
   payload. Both verified present in `templates/waymark`. This is the only finding that reaches a
   developer's production site.
2. **No linter or formatter runs on `examples/showcase`** (5.1). The whole TSDoc, informative-docs,
   and em-dash apparatus stops at `src/lib`. Everything in section 3 is a cleanup that will drift
   again without this, and the tab/space fork inside `playwright.config.ts` shows it already has.
3. **`cairn.config.ts` is a 526-line monolith with a stale two-line header** (2.1). The most-read
   file in the tree, describing itself wrongly, with the adapter buried under 340 lines of
   component definitions.
4. **The archive subsystem never executes and buys a permanent build-gate exception** (2.3). 51
   lines of chassis logic, a 188-line route, and a weakened `handleUnseenRoutes`, all to serve a
   page size the corpus cannot reach.
5. **The `.md` twin route defeats the single-source `PublicRoutesConfig`** (1.1), and the two
   literals already differ. The exemplar demonstrates the exact drift the chassis file exists to
   prevent.
6. **The focus ring is hand-written 22 times across 9 files** (4.2). A named design device with no
   single source, in a tree whose chassis exists to hold exactly this.
7. **Pass and plan citations plus stale future-tense in shipped code** (3.1). "B2 deliverable" in
   `prose.css:2`, "B3 and B4 add", "the manual light/dark toggle is B4" (it shipped), "Plan 1
   extension-seam proof", "spec §2". Fourteen sites; two of them factually wrong now.
8. **464 lines of unimported theme components, plus a 531-line script that says it was to be
   deleted** (2.5, 2.6). Dead code in the tree that teaches the bar, one piece of it shipping into
   every scaffold.
9. **Site identity hardcoded in five files while `siteConfig.siteName` exists**, and two
   unexplained origin literals (4.7). A developer renames their site and the chrome does not
   follow.
10. **The theme hand-rolls the shell the chassis provides, and the triplicated gotcha prose that
    goes with it** (2.7); zero of seven composition primitives are used, so none is rendered,
    baselined, or proven at 320 and 2560 (5.5).

Just outside: the two degenerate `clamp()`s (4.1), the archive route's 121 lines of verbatim
copied CSS (2.4), `site.css` sitting outside the token gate (5.2), and the missing 404 baseline
(5.3).

## Verdict

The tree is closer to the exemplar bar than its finding count suggests, and it is failing in a
specific, correctable way rather than a diffuse one. The architecture is genuinely good: the
chassis/theme split is real, `check:chassis-boundary` enforces it mechanically rather than by
convention, the `$chassis`/`$theme` alias pair makes the boundary visible at every import, the
five-viewport matrix is a real responsive gate with committed baselines, and the hard-won
knowledge in the tree — the Vite `define` fold, the flex cross-axis width bug, the themed-404
pattern, the cascade-layer trap, the `?url` stylesheet parity rule — is knowledge a developer
would otherwise pay for twice. Nothing here needs rearchitecting. What has happened instead is
that the showcase carries three jobs at once — exemplar template, engine e2e fixture, and design
scratchpad — and only the first is stated. Every top-ten finding is one of the other two leaking
into the first: fixtures in the scaffold, test-coverage rationales annotating a content model,
pass codenames in a stylesheet header, a design probe route emitted to consumers, a script whose
own header says it should be gone. The second-largest cause is that the exemplar does not use its
own chassis — seven primitives unused, the shell hand-rolled beside a comment admitting it, the
focus ring written 22 times — which is the most damaging possible lesson for a tree whose entire
purpose is to be copied. Both causes are cheap to fix relative to their blast radius, and one
structural change (extending lint and format to `examples/showcase`) is what keeps them fixed. My
estimate: the distance to the bar is one focused pass, not a rebuild, provided the pass treats
"the exemplar must use the chassis it ships" and "the fixture job must be marked or excluded" as
its two organizing rules rather than working the findings as a flat list.
