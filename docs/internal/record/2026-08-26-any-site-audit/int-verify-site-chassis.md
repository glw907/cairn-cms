# Verification notes: site-chassis (examples/showcase) internals findings

Fresh-context verification, 2026-08-26. Each finding tested in both directions against the code
on `main`, plus `docs/internal/code-idioms.md` and the `docs/internal/record/` rulings.

---

## 1. chassis-archive-unexercised — STANDS, tier revised refactor -> note

**Confirmed facts.**
- `examples/showcase/src/content/posts` holds 14 files. `(site)/+page.server.ts:13-15` and
  `(site)/archive/[page]/+page.server.ts:11` both paginate `sortNewestFirst(posts.all()).slice(1)`,
  so 13 entries against `ARCHIVE_PAGE_SIZE = 50` gives `totalPages === 1`.
- `entries` in `archive/[page]/+page.server.ts:16-21` loops `for (page = 2; page <= totalPages)`,
  so it returns `[]`. The route (server 30 lines + `+page.svelte`) prerenders nothing.
- The home's pagination `<nav>` is gated `{#if !filtered && data.archive.totalPages > 1}`
  (`(site)/+page.svelte:161`), so it never renders either.
- `paginateArchive`'s clamp branch and `load`'s `archive.page !== requested` 404 never execute.
- No e2e touches `/archive/N`: `grep -rn archive examples/showcase/e2e` returns only tag-filter and
  vocabulary hits (a *tag named* "archive"). No unit test exists at all (see finding 4).

**Counter-case found, and it defeats the remediation, not the observation.**
- `docs/superpowers/plans/2026-07-17-waymark-final-review-fixes.md:5` — "The fixture corpus (220
  posts) stays on this branch". The 220-post corpus was deliberately review-branch-only; `main` was
  always meant to carry the small corpus. Line 183 records the weight measurement that set the size
  ("home document 53.1KB (was 195KB)"). So `ARCHIVE_PAGE_SIZE = 50` is a measured real-site default,
  not an accident, and the finding's "lower it to 6" would degrade the shipped scaffold's default
  purely to light up a code path.
- `docs/internal/record/2026-08-20-xcathletes-pass-1-harvest.md:28-36` rules on the
  `handleUnseenRoutes` exemption in the opposite direction from the finding: all three engine-owned
  prerenderable routes correctly enumerate zero targets against an empty corpus, "the template
  already carries a hand-written `handleUnseenRoutes` exemption for the archive route alone, which
  is the tell: this was hit once and patched at the instance rather than the class... Shipping the
  exemption covering all three engine-owned routes in the template's `svelte.config.js` is a
  one-line fix." The exemption is load-bearing for every scaffolded site's first build. Deleting it,
  as the finding proposes, would ship a build that fails on an empty corpus.

**Verdict.** The observation (a whole subsystem with zero runtime and zero test exercise on `main`)
stands and is worth acting on. The diagnosis ("buys a permanent build-gate exception to stay green")
misreads a sanctioned consumer-facing exemption, and the remediation is wrong on both halves. What
remains is coverage, which is exactly finding 4's scope: a table-driven `paginateArchive` unit test
plus, if wanted, one e2e over a purpose-built small `pageSize` argument (the function already takes
`pageSize` as a parameter, so a test needs no fixture corpus and no change to the shipped default).
Tier drops to **note**: record it, fold the coverage into finding 4, change no shipped constant.

---

## 2. chassis-template-ships-fixtures — STANDS, refactor (unchanged)

**Confirmed by artifact, not by inference.** A baked template tree exists at
`packages/create-cairn-site/template/` (gitignored, produced by `bake-template.mjs` through
`scripts/build/emit-template.mjs`):
- `packages/create-cairn-site/template/src/routes/probe-craft/` is present in the emitted tree.
- `packages/create-cairn-site/template/src/routes/(site)/+layout.server.ts:16` carries
  `siteLayoutSentinel: 'cairn-showcase-site-layout'` verbatim.

`.cairn-template.json` excludes `src/routes/test`, `src/members`, `src/routes/members`,
`migrations-members`, `e2e`, `playwright.config.ts`, `.claude`, `scripts`, `README.md`, and neither
`emit-template.mjs`'s `alwaysSkip` nor `bake-template.mjs`'s `PRUNED_SCRIPTS` /
`PRUNED_DEV_DEPENDENCIES` covers `probe-craft`. The fixture's own header calls it "the craft
chapter's acceptance fixture... Deliberately un-cairn", and it holds invented member records
(`Owen Fitzgerald`, `$1,240.00`, `Overdue`).

**Counter-case checked and rejected.** There *is* prior art, and it is a disclosure, not a sanction:
- `docs/internal/record/2026-08-14-pass-d-task-13-production-gate.md:1410` — "Either add a
  `probe-craft/` row to the Public routes table... or, **better**, file the bake gap so the route
  joins the exclusion manifest and the sentence stays true as written." The cheaper half was taken
  (`docs/extend/what-the-scaffold-wrote.md:152` now names it "safe to delete"); the preferred fix was
  never done.
- `docs/internal/record/2026-08-03-ambient-defaults-audit.md:173` lists it in a *gaps* section:
  "`/probe-craft` ships into every scaffolded site, crawlable, because the template exclude list
  does not name it." That is the audit calling it a defect.
- It appears in no live `ROADMAP.md` or `docs/STATUS.md` tier, so nothing tracks it.

The sentinel half is smaller but real: it is documented (`(site)/+layout.server.ts:3-13`) purely as
a fixture for `preview.spec.ts`, and `grep -rn siteLayoutSentinel examples/showcase` finds no reader
outside e2e, so the whole payload field is dead weight in every scaffolded site. Note for the
remediation: wrapping just the `return` in `cairn-template:exclude` markers leaves an empty
`load`; the cleaner shape is to have the emitted load return `{}` or to exclude the file, whichever
keeps `(site)/+layout.svelte` valid.

**Verdict.** Stands as filed. The remediation's third clause (a `check:template` assertion that no
fixture route survives) is the durable half: `src/tests/unit/emit-template-tree.test.ts` already
asserts *manifest entries exist* and *markers balance*, so a positive assertion about the emitted
tree fits the file that is already there.

---

## 3. chassis-md-route-duplicate-config — STANDS, refactor (unchanged), one clause overstated

**Confirmed.** `(site)/[...path=md]/+server.ts:13-21` calls `createPublicRoutes({ ... })` with a
hand-written literal of seven fields (`site`, `render`, `origin`, `siteName`, `description`,
`resolveMedia`, `assetsEnabled`), every one of which `$chassis/public-routes.ts` already binds from
the same imports. It omits `defaultImage` and `feeds`. Nothing prevents importing
`publicRoutesConfig`; the module already imports from `$chassis/content` and `$theme/cairn.config`.

**Two clauses are overstated.**
- "Defeating the single-source guarantee": `public-routes.ts:1-6` scopes its own claim to two named
  routes, `(site)/[...path]` and `(site)/preview/[token]`, and `src/chassis/README.md` repeats that
  scope. The md route is a third consumer the comment never claimed to cover. The duplication is
  real; the guarantee is not literally defeated.
- "Silently drops `defaultImage` and `feeds`": both are optional, and `markdownLoad`
  (`src/lib/delivery/public-routes.ts:239-244`) reads only `site` — it resolves `byPermalink`,
  checks `isNoindex`, returns `entry.body`. `markdownEntries` likewise. So the omission has no
  behavioral effect today. The cost is drift risk on the five fields that *are* duplicated, not a
  live bug.

**The feed half is the weakest part of the finding.** `feed.xml/+server.ts:11-13` and
`feed.json/+server.ts:11-13` each pass `{ title: siteConfig.siteName, description: SITE_DESCRIPTION,
siteUrl: ORIGIN, feedUrl: ORIGIN + '/feed.<ext>' }`. Three of the four fields are read straight from
the same two imported constants in both files, so they cannot drift the way a re-typed literal can —
this is call-site assembly, not a second source of truth. And `docs/internal/code-idioms.md`'s
Structural decisions section already ruled on exactly this pair: "the near-identical
`feed.xml`/`feed.json` routes share one **items** helper" — which `chassis/feed.ts` does. The
charter asked for the items helper and got it; it did not ask for the channel literal.

**Verdict.** Stands on the md route, which is the substantive half and a one-import fix (plus
updating `public-routes.ts`'s and the chassis README's route list to name three consumers). Treat
the feed-channel clause as noise, not a defect.

---

## 4. chassis-no-unit-tests — STANDS, refactor (unchanged)

**Confirmed.** `examples/showcase/src` contains no `tests` directory. `package.json` scripts are
`dev, build, preview, cairn:manifest, check, pretest:e2e, test:e2e, design:probe` — no unit runner,
no vitest config in the showcase. The root `vitest.config.ts`'s `unit` project includes only
`src/tests/unit/**`, `src/tests/lab/**`, `packages/cairn-cms-dev/src/**`; root tests that mention
`examples/showcase` (`emit-template-tree`, `showcase-pages-singular`, `admin-css-build`,
`check-*`) assert on the tree and the build, never on chassis behavior.

Each named function verified untested and each is genuinely worth a test:
- `paginateArchive` (`archive.ts:36`) — clamping, year grouping, boundary pages. Never executed on
  `main` at all (finding 1).
- `formatDate` (`date.ts:15`) — a bare `DATE_FORMAT.format(new Date(iso))`; a malformed `iso`
  yields the string "Invalid Date" onto the page, and the TSDoc documents no such contract.
- `isBannerExpired` (`banner-expiry.ts:14`) — the module header states its whole reason for
  existing is that `cairn.config.ts`'s `build()` and `Banner.svelte` must independently agree, with
  a deliberate fail-closed rule on a missing/unparsable date. A shared invariant two code paths
  must agree on, with an off-by-one end-of-day boundary, and no test.
- `isAdminHref` (`admin-link.ts:9`) — named in `svelte.config.js:28-31` as the reason
  `handleHttpError` can throw on everything, so a regression here turns every build red or, worse,
  lets the crawler back into `/admin`.

**Counter-case considered.** The showcase doubles as the scaffold template, so a `src/tests`
directory would ship to consumers unless added to `.cairn-template.json`. That is a real design
consequence and the remediation should name it, but it is a migration cost, and the standing ruling
is that migration cost does not discount a finding. No repo doc rules the showcase e2e-only;
`code-idioms.md`'s Tests section (T3, T6) is written to apply to pure-function files generally.

**Verdict.** Stands as filed. Add the `.cairn-template.json` exclusion to the remediation.

---

## 5. chassis-dead-theme-components — STANDS, refactor (unchanged)

**Confirmed.**
- `wc -l`: `IntroLedger.svelte` 267, `Carousel.svelte` 197 (464 total).
- A case-insensitive grep for `carousel|introledger` across `examples/showcase/src` and
  `examples/showcase/e2e`, excluding the two files themselves, returns zero references. Not
  imported by a route, not composed into the styleguide (`(site)/styleguide/+page.svelte` imports
  only `./$types`), not in the markdown component registry:
  `cairn.config.ts:348` is `defineRegistry({ components: [callout, alert, icon, video, pullQuote,
  cta, microCta, faq, banner] })`.
- S1 breach confirmed: both declare props as an inline type literal inside the `$props()`
  destructure (`IntroLedger.svelte:26-51`, eight props; `Carousel.svelte:28-38`), while
  `ArticleView.svelte:23`, `Banner.svelte:15`, and `admin/[...path]/+page.svelte:13` all use
  `interface Props`. `code-idioms.md` S1 mandates the latter for multi-prop components, and its
  Structural-decisions section names the target explicitly: "**Showcase**: ... showcase components
  converge on S1."
- The doc error is worse than the finding says. `docs/extend/what-the-scaffold-wrote.md:130` reads
  "`components/` | The theme's registered markdown components (`ArticleView`, `Carousel`, and the
  rest)". Neither `ArticleView` nor `Carousel` is a registered markdown component; the registry
  lives in `cairn.config.ts` and holds none of the files in `components/`.

**Counter-case checked.** Both were banked deliberately: `git log` shows "Bank the cairn.pub
carousel as a generic showcase component" (cc3ae8f7) and three IntroLedger syncs from cairn.pub's
ratified masthead. `STATUS-archive-2026-07-17-to-2026-07-18.md:17` records "The `IntroLedger`
component is banked in the showcase." So this is intentional banking, not forgotten code — but
banking is a reason they exist, not a ruling that they stay uncomposed, untyped to S1, and
misdescribed in the scaffold doc. Nothing gives them visual-baseline coverage, and the scaffold
ships 464 lines a new developer cannot find a call site for, against bar 2 (inviting and
comprehensible).

**Verdict.** Stands as filed, including the doc-row correction.
