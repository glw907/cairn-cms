# Extend arm: code-first gap sweep (2026-09-30)

The extend fact container was harvested from the old docs pages, so it held what those pages
claimed and nothing they omitted. Stage 2a ran a code-first sweep to find what a developer
building on cairn's seams needs that no fact covered, filed the verified results into
`docs/internal/facts/extend.md` under `## Code sweep (2026-09-30)`, and placed each new fact on
an outline page in `docs/internal/outlines/extend.json`. This record holds the method, the
counts, the placement, and the defects the sweep found (defects are never facts).

## Method

1. **Five surface finders**, read-only, against a shared brief: two over the export list
   (`EXA`, `EXB`), one over the scaffold (`SCF`), and two over the changelog, before and after the
   harvest (`CLO`, `CLN`). Each grepped all five container files before calling something a gap.
2. **Five module deep readers**, a second pass that read the first pass's findings first and then
   read the source of one module area in full: admin (`DAD`), audit and media (`DAU`), content
   (`DCT`), delivery (`DDR`), SvelteKit and auth (`DSK`). This pass also reported `defect`s: code
   that is wrong, or a shipped promise that does not hold.
3. **Three independent verifiers**, read-only, each re-reading every cited source at HEAD,
   re-grepping the container for coverage, and returning a verdict per finding: `confirmed`,
   `corrected` (the claim narrowed or fixed), `refuted`, or `already-covered`. A finding that
   bundled several claims was split (ids like `EXA-5a`). Each verifier also checked any existing
   fact a finder named as wrong.
4. **This filing**: dedupe across the three verified files, file one `[verified]` bullet per
   remaining claim with a freshly minted id, correct the confirmed wrong facts in place (ids
   kept), place every new id on an outline page, add pages where a verified gap had no home, and
   record the defects here. Line pointers were re-checked by `check:facts` at filing; six
   verifier pointers ran past the end of their file and one single-line pointer landed on a
   comment, and all seven were re-anchored to the lines that carry the claim.

## Counts

| Stage | Count |
| --- | --- |
| Raw findings, surface finders | 74 (EXA 14, EXB 12, SCF 25, CLO 8, CLN 15) |
| Raw findings, deep readers | 66 (DAD 11, DAU 15, DCT 13, DDR 16, DSK 11) |
| Raw findings, total | 140 |
| Verifier records after splits | 167 |
| Confirmed | 119 (109 gaps, 10 defects) |
| Corrected | 43 (39 gaps, 4 defects) |
| Refuted | 0 |
| Already covered | 5 (SCF-18 by `f:jtl15v`; DAU-9 by `f:f91jbb`; DAU-10a by `f:eqlssz`, `f:vpk81e`, `f:ve30i2`, `f:yio35u`; DAU-13 by `f:eqsngu`, `f:o4ctu5`; CLN-3a by `f:gvim4v`) |
| Verified gap claims | 148 |
| Merged as cross-file duplicates | 16 |
| Absorbed into a wrong-fact correction | 1 (DCT-7, into `f:7wiuwr`) |
| **Facts filed** | **131**, all `[verified]` |
| **Wrong existing facts corrected** | **4** (`f:kkp5bi`, `f:hdrzxd`, `f:7wiuwr`, `f:i4fj93`); `f:ojydmz` checked and holds |
| Defects recorded | 12, plus 4 verifier notes (below) |

The verifiers reclassified three deep-reader defects as gaps: DAU-7 (the media-seed reference
omits a caveat rather than stating a falsehood), DAU-15 (no install exit code is promised), and
DCT-7 (the code is right; the container fact was wrong).

### Duplicates merged

| Kept (filed as) | Merged into it |
| --- | --- |
| EXA-1 (`f:ohq7b9`) | EXB-2, CLO-2 |
| EXA-2 (`f:gnn3pv`) | SCF-3a, CLO-3 |
| EXA-3 (`f:rnwver`) | EXB-9, SCF-4 |
| EXB-1 (`f:rshs6k`) | CLO-1 |
| EXB-3b (`f:j81xye`) | DDR-8b |
| EXB-6a (`f:kv3qen`) | CLN-1 |
| EXB-6b (`f:ky39tz`) | CLN-2 |
| EXB-8 (`f:mc3n4w`) | CLO-4 (its noindex clause moved to DDR-9, `f:ms7l5u`) |
| DAD-1 (`f:shv6wv`) | DSK-1 |
| DAD-6 (`f:rzfdqw`) | CLN-4 |
| DAU-1 (`f:enuyhg`) | DAD-4 |
| DAU-5 (`f:frgg7d`) | DDR-1 |
| DAU-11 (`f:vsbkl6`) | CLN-8a |

### Wrong facts corrected

- `f:kkp5bi` (extend.md, security-model): said the key signs an installation token "per
  request"; the token is cached per Worker isolate for 55 minutes (`src/lib/github/signing.ts:105-121`,
  `src/lib/github/backend.ts:177`). Claim and source rewritten.
- `f:hdrzxd` (extend.md, content-model): said invalid input "bounces back with field-keyed error
  messages"; the save returns only the first message as one banner
  (`src/lib/sveltekit/content-routes-entry-write.ts:116-118,181-184`, `src/lib/admin/EditPage.svelte:1030`).
  The content-model outline cover that repeated the old wording was rewritten too.
- `f:7wiuwr` (extend.md, reuse-content-across-entries): said `defineConcept` throws for a
  non-embedded `fragments` concept; `normalizeConcepts` throws, when the runtime composes.
- `f:i4fj93` (editors.md): said a hidden (`draft: true`) entry stays reachable by direct address
  after publishing; the permalink map drops drafts, so its address returns 404 and only a preview
  link shows it (`src/lib/delivery/site-resolver.ts:84-92`, `src/lib/delivery/public-routes.ts:214-217`).
  This was the deep reader's DDR-5, filed there as a defect.
- `f:ojydmz` (extend.md): named by a finder alongside `f:7wiuwr`; it makes no `defineConcept`
  claim and holds, unchanged.

## Placement

Every new id sits in its page's `factIds`; each page's `covers` gained a bullet for each new topic
(marked "(sweep)" in the review copy). Three existing facts were cross-listed onto a second page
where a new page needs them: `f:kv3qen` also on migrate-existing-content, `f:69rw88` and
`f:2hnxsr` on configure-media, and `f:1md5oj`, `f:mrv24k`, `f:j7fha2`, `f:326755` on
gate-your-site-with-cairn-audit.

| Page | Findings | New ids |
| --- | --- | --- |
| architecture | EXA-12, DSK-4a, DSK-4b, DSK-4c | `f:025q6u` `f:0gihxq` `f:0oyrh6` `f:0xxou5` |
| add-cairn-to-a-sveltekit-app | EXA-11, DSK-6 | `f:1b54g7` `f:2gtftn` |
| what-the-scaffold-wrote | SCF-1, 5, 6, 7, 9, 17, 19, 20a, 20b, 23a, 23b, 24, 25a, 25b, DAU-15 | `f:2qnqkm` `f:2s8u70` `f:2zl3qz` `f:34rsss` `f:38pjqy` `f:3bbeia` `f:3m0oxs` `f:3my5c1` `f:498l97` `f:4ax489` `f:4h9fz4` `f:4nccq6` `f:5ohm23` `f:666eg6` `f:690k0p` |
| content-model | DCT-2, 5, 8a, 8b, 8c, 10, 11a, 11b, 13, CLO-7 | `f:69j91g` `f:7ak73t` `f:7ci1fm` `f:7l7y5l` `f:7lo8fe` `f:7m8nd4` `f:8b21y6` `f:8igohk` `f:8zdux6` `f:9270mo` |
| define-an-adapter-and-schema | EXA-4, 5a, 6, 10a, 10b, 14, DCT-4, 9, 12 | `f:93iwom` `f:97c6g1` `f:9ro4u5` `f:9sba8e` `f:a81e6y` `f:adsn4l` `f:aj5c4z` `f:apoa3k` `f:ar5p72` |
| link-content-with-references | DDR-2, DDR-6 | `f:aulk5e` `f:bf47a8` |
| reuse-content-across-entries | CLN-10 | `f:bfiuem` |
| configure-rendering | EXA-5c, 7, 8, 9, DDR-13, 14, 15, 16, SCF-8, CLO-6 | `f:bnqj5z` `f:c7ruij` `f:cefzv5` `f:cgwyp6` `f:co54dg` `f:dat0dd` `f:db26u3` `f:dni13r` `f:dw4rbb` `f:e11npv` |
| configure-media (new) | DAU-1, 2, 3a, 3b, 4, 5, 6, DSK-8 | `f:enuyhg` `f:ett331` `f:ex4hss` `f:f4ulxz` `f:fjnszk` `f:frgg7d` `f:fxit31` `f:g4cwcw` |
| migrate-existing-content | DCT-1, DCT-3 | `f:ggzzur` `f:gh4ckg` |
| design-your-site | EXA-2, SCF-3b, 10-16, DAD-5, DAU-7 | `f:gnn3pv` `f:gtg454` `f:guthtp` `f:gzw7os` `f:h1qxlq` `f:hectgs` `f:hgal3e` `f:i3rn6f` `f:i80vsl` `f:ivp8wl` `f:j2qzct` |
| wire-the-delivery-surface | EXB-3a, 3b, 3c, 4, 5, 6a, 6b, 7, 8, 12, DDR-7, 8a, 9, 10, 11, 12a, 12b, CLN-13, SCF-2 | `f:j2rndg` `f:j81xye` `f:jguiox` `f:jsh6ae` `f:k5uws5` `f:k7nln3` `f:kdo96n` `f:kv3qen` `f:ky39tz` `f:m9z6sr` `f:mc3n4w` `f:ms7l5u` `f:mt7qcl` `f:mtltw7` `f:n07oiu` `f:n33lwb` `f:nbn6j0` `f:nibegw` `f:nnup2g` |
| share-a-draft-preview | DSK-3 | `f:nssepj` |
| announce-on-publish | EXA-1, DAD-8b | `f:ohq7b9` `f:ozz6fs` |
| add-a-custom-admin-screen | EXA-13, EXB-10, EXB-11a, CLN-3b, 5, 6, 7, 14, CLO-8a, 8b, DAD-11 | `f:pb0vh9` `f:ph6kjg` `f:pmmtdv` `f:ppqu4v` `f:pswc3n` `f:pyfbqv` `f:q4jyat` `f:qk0l7p` `f:qkr057` `f:qmhbgs` `f:qz4gj2` |
| organize-your-admin-nav | EXA-3, EXB-1, DAD-3, DAD-6, DAD-10 | `f:rnwver` `f:rshs6k` `f:rx9v6d` `f:rzfdqw` `f:seum1o` |
| enable-tidy | DAD-1, DAD-9a, CLN-15, CLO-5 | `f:shv6wv` `f:sl0igk` `f:tcadyk` `f:tcvrgk` |
| restrict-admin-access | DSK-2, DSK-7 | `f:uhoyun` `f:uotol3` |
| rotate-the-github-app-key | DSK-5 | `f:vg42j3` |
| debug-your-site | SCF-21, SCF-22, CLN-11a, CLN-11b, CLN-12, DAU-10b | `f:vg5zt8` `f:vi9xh0` `f:vih1k1` `f:vq634h` `f:vq8cta` `f:vs9g9e` |
| gate-your-site-with-cairn-audit (new) | DAU-11, 12, 14, CLN-8b, 9a, 9b | `f:vsbkl6` `f:wfv8qm` `f:x84fah` `f:xj180v` `f:xjp2mx` `f:y1mjsk` |

Placement calls worth a second look:

- **publishActions on announce-on-publish.** The finders split it between announce-on-publish and
  add-a-custom-admin-screen. It is an in-admin way to act on a publish (a next-step link), so it
  sits beside the manifest-diff method, and the page's job was widened by one clause to carry it.
- **Customizing the sign-in email as a section, not a page.** A finder proposed
  `customize-the-sign-in-email`. The job is two facts (EXA-11, DSK-6) and the add-cairn tutorial
  already names a custom sender through `auth.send`, so it became a section there.
- **Reference-only findings were filed anyway**, since the container lacked them; they sit on the
  page a reader would reach them from, and the drafter decides whether the page states or links
  them.
- **SCF-17** (the Workers Builds token) was suggested for upgrade-cairn, a kept per-version
  record the outline does not rebuild; it went to what-the-scaffold-wrote with the other things
  the setup command registers outside the tree.

## Pages added

Both carry `"origin": "gap-sweep"`, batch `2b`, and the full page schema; the review copy marks
each "Added by the code sweep: keep or cut?" for Geoff's ruling (owner ruling 2026-09-30: add a
page wherever a verified gap has no home).

- **configure-media** (model-content, after configure-rendering). No page owned media setup: the
  R2 binding and the adapter's media block, what `allowedTypes` can and cannot widen, the upload
  size ceiling, `publicBase` not moving the route, the route's headers, a missing asset's render,
  and usage tracking's reach. Eight new facts plus two cross-listed architecture facts. Exemplars:
  Cloudflare's Workers bindings page and Django's custom-command how-to.
- **gate-your-site-with-cairn-audit** (operate, after debug-your-site). The audit's site-wide
  configuration (rendered pages, `CAIRN_AUDIT_COOKIES`, suppressions, allowlists, `sourceScope`,
  `sheet`) had no home; add-a-custom-admin-screen covers only auditing one screen, and
  `docs/reference/cairn-audit.md` holds the rules and flags. Six new facts plus four
  cross-listed. Exemplars: the rustc-dev-guide CI page and restic's scripting reference.

Two terms were added (`media token` on configure-media, `rendered pass` on the audit page) and
fifteen cross-links.

## Defects

Defects are never facts. Each is recorded with where it lives, what is wrong, and a severity
(major: a developer following the code or docs builds it wrong or loses data; minor: a detail,
a stale comment, or a doc error with a workaround).

| # | Where | What is wrong | Severity | Finding |
| --- | --- | --- | --- | --- |
| 1 | `src/lib/content/media-refs.ts:44-51`, `src/lib/content/media-rewrite.ts:158-171` | The media where-used index and the replace rewrite read only top-level image fields and body images, so an image inside an `array` or `object` field (the scaffold's own `gallery: fields.array(fields.image())`, `templates/waymark/src/theme/cairn.config.ts:116`) is invisible to them and to the safe-delete gate, which can then delete an asset a page still uses. `array(image)` is a documented shape (`docs/reference/core.md:471`). | major | DCT-6 |
| 2 | `templates/waymark/src/chassis/feed.ts:20` | `buildFeedItems` renders bodies with no `resolveFragment`, so the seeded post's `::include` (`templates/waymark/src/content/posts/2026-03-10-callout.md:17`) ships as literal text in `feed.xml` and `feed.json`. Fix: pass `createFragmentResolver(site)`. | major | DDR-3 |
| 3 | `templates/waymark/src/chassis/feed.ts:13-20` | The feed passes no origin-anchored `resolveMedia`, so `media:` images in `contentHtml` resolve to root-relative `/media/...` paths a feed reader cannot fetch. | minor | DDR-4 |
| 4 | `src/lib/sveltekit/content-routes-entry-read.ts:412` | The `address-collision` advisory tells an editor "Publish this one and it replaces the other at that address", but two published routable entries on one permalink make `createSiteResolver` throw (`src/lib/delivery/site-resolver.ts:84-90`), so following the advice fails the next deploy build. | major | CLO-7, CLN-2 note |
| 5 | `src/lib/content/fieldset.ts#FieldBehavior`, `docs/reference/core.md:1137` | `FieldBehavior.itemLabel` is declared and documented as an array row's label deriver, but nothing in `src/lib` reads `behavior[field].itemLabel`; the behavior table never reaches the editor. The promise fails. | minor | EXA-5b |
| 6 | `src/lib/sveltekit/admin-dispatch.ts#parseAdminPath`, `src/lib/content/concepts.ts#normalizeConcepts` | No validation rejects a concept id that collides with an engine admin segment: `login`, `auth`, `editors`, `nav`, `settings`, `vocabulary`, and `help` make the concept's admin views unreachable, and `media` loses its list view to the Library (its edit views still dispatch). | minor | DAD-2 |
| 7 | `src/lib/sveltekit/nav-routes.ts:63-73` | The nav editor's page suggestions build each url as `/${id}` from the default branch with no permalink resolution and no draft filter, so a suggestion for any concept whose permalink is not `/:slug` 404s; each nav load also reads every page-like concept's directory. | minor | DAD-7, DSK-9 |
| 8 | `src/lib/sveltekit/publish-actions.ts#normalizePublishActions`, `src/lib/admin/EditPage.svelte:1689` | Validation never checks label uniqueness, while the edit page keys its `{#each}` by label, so two same-label actions that apply to one concept hit Svelte's duplicate-key error. | minor | DAD-8a |
| 9 | `src/lib/media-seed/assemble.ts:117-123`, `src/lib/media-seed/bin.ts:135` | `cairn-media-seed` downloads from the fixed path `<from>/media/<slug>.<hash>.<ext>` and reads a fixed `src/content/.cairn/media.json`, ignoring `assets.publicBase`, so a site that mounted its media route elsewhere cannot seed (every row fails) and the tool has no flag for it. | minor | DAU-8 |
| 10 | `src/lib/sveltekit/health.ts:1,9`, `src/lib/github/signing.ts:126` | Comments name `GET /admin/healthz`, but `parseAdminPath` resolves no such engine view; the scaffold mounts `/healthz` at the site root (`f:paotzb`). | minor | DSK-10 |
| 11 | `docs/reference/sveltekit.md:1207` | Says `vocabularySaveAction` writes "the same committed `src/lib/site.config.yaml`" the tidy settings write; it writes `editor.nav.configPath` when declared (`src/lib/sveltekit/content-routes-settings.ts:198-199`), and the scaffold's file is `src/theme/site.config.yaml`. | minor | DSK-11 |
| 12 | `docs/reference/sveltekit.md:805`, `src/lib/sveltekit/section-action.ts:147-149` | Both say an uninferred `Env` "collapses to `{}`"; tsc 6.0.3 under `--strict` infers `unknown`. The same wording sits at `docs/reference/auth-channel.md:38` and `src/lib/auth-channel/factory.ts:573` (same mechanism, not separately probed). | minor | EXB-11b |

### Verifier notes (misleading text, no failing code path)

- `src/lib/nav/site-config.ts:354-356`: `setMenu`'s doc comment says "YAML comments are not
  preserved"; a probe with the repo's `yaml` package showed comments outside the replaced block
  survive (only those inside it are lost). Stale source comment. Minor. (DAD-9b)
- `templates/waymark/src/theme/markdown-components.ts:124-129`: the comment says `resolveMedia`
  shares the throwing "build-backstop posture" with `resolveLinks`; `createMediaResolver` returns
  `undefined` on a miss and the build succeeds (`f:frgg7d`). Misleading scaffold comment. Minor.
  (DDR-1 note)
- `src/lib/delivery/site-indexes.ts:33`: `createSiteIndexes`' doc example writes
  `import.meta.glob('...?raw', { eager: true })`, omitting `import: 'default'`, the form that makes
  the index build throw (`f:n07oiu`). Minor. (DDR-12a note)
- `packages/create-cairn-site/README.md:337`: tells the reader to "run this CLI's own update path"
  to apply a new migration, but `create-cairn-site` has no update path that applies migrations
  (`f:jtl15v` states the real procedure). Minor. (SCF-18 note)

`f:i4fj93` (DDR-5) was a wrong container fact, not a code defect, and is corrected above. The
media-seed reference (`docs/reference/cli-cairn-media-seed.md:3-8,23`) omits the `npm run dev`
caveat that `f:j2qzct` now records; the verifier ruled it an omission, not a falsehood.

## Findings not filed

None. Every confirmed or corrected gap is filed or merged into a filed fact, and the five
already-covered findings were skipped.
