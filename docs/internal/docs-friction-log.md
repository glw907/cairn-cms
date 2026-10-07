# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it. A hole in `docs/internal/facts/` (something a
pass needed and didn't find, found wrong, or found only as an unverified `[candidate]`) is filed
here too, the same as any other finding.

Record each finding with its perspective and a short note. The perspective is one of the five
audience profiles ([`2026-08-14-audience-profiles.md`](./record/2026-08-14-audience-profiles.md)): `editor`
(the non-technical author working in `/admin`), `admin` (the technical non-developer who sets up
and runs the default site; `operator` retired into this tag 2026-08-14), `extender` (the
Svelte-fluent developer building on cairn's seams; formerly tagged `developer`), `contributor`
(the engine contributor working on cairn itself; formerly tagged `maintainer`), or `scripter`
(anyone automating against `cairn`, a person writing a script or an agent; the profile the
2026-08-14 record's dated note added for the three tool contract pages under
`docs/reference/`).

This log holds only live findings and the tombstones below. Resolved findings are pruned here once
shipped; their detail lives in the per-plan post-mortems and `docs/STATUS.md`, the homes for shipped
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

New findings start below this line, one per finding, with its perspective and a short note.

- **`tooling`.** `examples/showcase/e2e/admin-visual.spec.ts:490` ("zen toggle: the frame offset animates through more
  than two margin-left values") asserts more than two distinct samples inside a 400 ms window. It failed once in a
  full local gate (received 2) and passed 3 of 3 alone (SvelteKit 3 pass, close Task C4, 2026-10-06): timing-sensitive
  under load. Fix with a readiness or sampling approach that does not depend on frame timing (sample until the
  animation reports finished, or assert start and end values), never a longer window.

- **`go`.** `tool/internal/doctor` (graded "workmanlike" by the SvelteKit 3 pass's close `go-architecture-reader`,
  2026-10-06) carries pre-existing debt the pass did not cause: eleven exported check values plus `Snapshot.ReadFile`,
  the `RobotsAbsent*` constants, and `doctor.Results` have no caller outside the package (unexport them; `Verdicts`
  can take `[]CheckedResult`); `check_origin.go`'s `isLocal` and `check_csrf.go`'s `isLocalOrigin` disagree on `::1`;
  `labelFor`, `severityFor`, and `conditionText` triplicate one lookup; `resultFromFloorsVerdict` rebuilds `failResult`;
  three loops each read the first existing file; `siteConfigOutcome.Path` and `Snapshot.At` are test-only; about 55
  comment lines cite deleted TypeScript files by line range (`checks-local.ts` and siblings). Also `spine.Conditions()`
  is test-only behind a "2.0 seam" comment. A tool cleanup pass, not a SvelteKit concern.
- **`extend`.** SvelteKit 3 remote functions (`/_app/remote/...`) are not `/admin` paths, so a site-built admin
  remote command gets no guard session, no Rule 1 token check, and no security headers (Kit's `is_remote_forbidden`
  gives same-origin protection only). The extend arm should say a site-built admin remote function resolves the
  session itself. Close `web-auth-security-reviewer`, 2026-10-06.
- **`engine`.** Kit 3 loads `node:async_hooks` only under the `nodejs_als` compatibility flag, so without it
  `getRequestEvent` works only synchronously. Nothing in cairn, the showcase, or Waymark calls it today, so the
  configs deliberately carry no flag (no flag for an unused feature); revisit with the remote-functions watch
  (`trig_0193pPNoyxsTGeUhF1xx7woa`). Close `cloudflare-workers-reviewer`, 2026-10-06.
- **`admin`.** Error documents on public admin paths (a thrown 404 on `/admin/auth/<unknown>`, a
  failed admin layout load) render the root `+error.svelte` outside the shell, so they carry no
  referrer meta; the guard's header covers production but not the dev-backend handle. No form, so no
  lockout risk. Optional fix: an `admin/+error.svelte` that emits the meta. Close `svelte-reviewer`,
  2026-10-06. Extended by `docs/extend/restrict-admin-access.md` (the 2a unattended run, R5,
  2026-10-07, the page's final reader): the same missing `admin/+error.svelte` sends every admin
  403, from `requireAccess` or an engine screen's `requireEngineAccess`
  (`src/lib/sveltekit/guard.ts:442-446`), to the root `templates/waymark/src/routes/+error.svelte`,
  which rebuilds the public chrome (`SiteHeader`, `SiteFooter`, `:16-17,27,48`), so a refused editor
  leaves the admin shell for a public-site error page. One `admin/+error.svelte` inside the shell
  fixes both.
- **`chassis`.** `examples/showcase/src/theme/components/SiteHeader.svelte:66` starts `$state(browser ?
  resolveTheme(...) : light)`, so server and client start from different values (a hydration-mismatch risk for the
  theme toggle's icon and label); start from `light` and resolve in `onMount`. And `members/login/+page.svelte:48-50`
  names its field twice (a `<legend>` and an sr-only `<label>`). Close `svelte-reviewer`, 2026-10-06.
- **`engine`.** `createAuthChannel`'s dev-backend tripwire no longer sees a flag set only in the shell (it reads the
  Worker env), so under `vite dev --host` a LAN request with a shell-only `CAIRN_DEV_BACKEND=1` no longer trips the
  member-action refusal; dev-only, and `captureDeliver` still refuses. Close `web-auth-security-reviewer`, 2026-10-06.

- **`tooling`.** Two showcase e2e specs time out on a slow CI runner while waiting on an admin list link, the same
  slow-runner pattern as the known `spellcheck.spec.ts:20` flake: `e2e/tidy.spec.ts:20` (line 24, waiting for the
  seeded `a[href="/admin/posts/2026-06-copyedit"]`) and `e2e/preview.spec.ts:371` (line 398, waiting for the "Delete
  Broken link sibling" button). Both failed every attempt in CI run e2e on `7722ab44` (11.6 minutes against 5.7 on the
  passing rerun of the next commit). Candidates for the same readiness-signal fix the zen test took (wait on a real
  ready signal, never a longer timeout). Found by the SvelteKit 3 pass's CI diagnosis, 2026-10-06.

- **`tooling`.** `scripts/lab/theme-fixture.mjs` defaults `THEME_FIXTURE_PORT` to 4393 (`:59`), which the
  SvelteKit 3 pass's e2e host now pins as its `wrangler dev` inspector port (`E2E_PORT` + 1,
  `examples/showcase/playwright.config.ts:48`), and `RESERVED_PORTS` (`:63`) lists neither 4393 nor
  any fixture `PORT + 1` inspector port. A concurrent run fails loudly at the `listening()` check
  rather than colliding, so the cost is a confusing refusal. Fix: move the default and reserve the
  inspector ports. Found by the Task 6 diff review, conductor-verified, 2026-10-05 (on branch
  `sveltekit-3` until it merges).
- **`tooling`.** `npm run test:theme-fixture -- --arm both --build-only` exceeds the light gate
  lane's 3G cap: two runs were SIGKILLed (exit 137) during the fixture copy's `vite build`, and it
  passed only with `CAIRN_GATE_MEMORY_HIGH=5G CAIRN_GATE_MEMORY_MAX=6G`. It launches no browser, so
  the lane rule puts it on light, where it cannot fit. Fix: document the override in the script's
  header, or have it run on the heavy lane. Found by Task 6's implementer, conductor-verified
  against `cairn-run-gate`'s caps, 2026-10-05.

The draft docs harvest's close (2026-09-30) triaged the whole log and found four open entries,
all filed by the harvest itself, each verified against the tree first. The stale `/components`
subpath in `src/lib/islands/index.ts`'s header comment was fixed on the spot (it now names
`/admin`) and deleted. `cli-cairn-media-seed.md`'s `vite dev` claim against the scaffold's dev
backend and `requiredDocsPaths`'s on-disk filter over the kept pages were promoted whole to
`ROADMAP.md`'s Next tier, and the `tool/internal/health` package debt to Later, each with its
trigger. No open entry named a deleted page's prose. The harvest's class X residue, the
non-link mentions of deleted pages in `ROADMAP.md` and this log, was triaged in the same step:
this log's mentions are all dated triage history and stay, and `ROADMAP.md`'s were retired or
reworded there. See Clearings.

Theme identity pass B's close (2026-09-29) triaged the whole log and found one open entry, the
`contributor` finding that the showcase's `wrangler.jsonc:61` hardcodes `PUBLIC_ORIGIN` to
`http://localhost:4173`. It was verified against the tree (still present) and promoted whole to
`ROADMAP.md`'s Next tier beside the `rendered.test.ts` half, which draft docs pass 0+1 had already
promoted. The pass routed its own findings straight to `ROADMAP.md` in the same step: the
`viewport-overflow` timing defect to Now, and the dev backend's `APP_DB` overwrite, the promotion
at `0.99.0`, `transformSelection`'s whole-document dispatch, and the imperative internal-doc
pointer in `cairn-extend` to Next, and the `rounded-t-full` gap to Later. The probe's emitter
trap went to `docs/internal/durable-gotchas.md`. See Clearings.

Theme identity pass C's close (2026-09-29) triaged the whole log and found one open entry, the
`admin` finding on the media library's orphan purge. Geoff ruled on it and it was promoted whole to
`ROADMAP.md`'s Later tier (an owner-restrictable purge). The two chores the pass
fixed on the spot (the scaffold's Node 22 CI pin, now Node 24, and the signups page's stale
Tailwind comment) are already gone from the log. The pass routed its own findings straight to `ROADMAP.md` in the same step:
four `theme-contrast` and public-scope edge cases to Next, the
promotion of the two theme rules to error tier to Toward 1.0, and the docs standing order to Next.
See Clearings.

The style-guide sync's close (2026-09-29) triaged the whole log and found two open entries, both
its own, each verified against the tree first. Tidy's pinned default model
(`DEFAULT_TIDY_MODEL = 'claude-sonnet-5'`, still at `src/lib/nav/site-config.ts:133`) was promoted
whole to `ROADMAP.md`'s Next tier with Geoff's ruling that Tidy track the latest Sonnet. The
entry on the stale Vale suppression comment in `docs/editors/when-something-goes-wrong.md` (the
comment still sits at lines 43-55, naming a 3.15.1 pin and a 3.19.0 false fire) was deleted as
overtaken: the harvest-then-delete program deletes that page, so no fix is owed. See Clearings.

Theme identity pass A's close (2026-09-28) triaged the whole log and found no open entry. The
pass routed its own findings straight to `ROADMAP.md` in the same step: its carried cosmetics,
review minors, batched coverage notes, and the showcase `theme.css` scoping leak to one Now entry beside the theme identity initiative, and the pinned-rule
ratchet shrink and the `ADMIN_CSS_SAFELIST` retirement to Later. The Waymark citation entry in
Next was narrowed to the `site.css` and `prose.css` cites the pass did not touch. See Clearings.

Draft docs pass 0+1's close (2026-09-28) triaged the whole log and found two open entries, both
verified against the code and promoted whole to `ROADMAP.md`'s Next tier: the `admin-toolkit.md`
outline-chip contrast ratios needing re-measurement, and the page-chain claim inventory's missing
disposition for a claim a redraft relocates to a linked reference entry. The close's own two
findings, carried from the segment A ledger boundary and re-verified against the current tree in
the same step (`check:symbols`'s attached-redirect and dropped-continuation gaps, still present
after the 2026-09-26 hardening; `rendered.test.ts`'s hardcoded `localhost:4173` assumption), were
also filed straight to the Next tier rather than opened here first, per the pattern earlier closes
use for a finding discovered and routed in the same step. The segment A boundary's third carried
item, the duplicate-shipped-anchor gap, was re-checked and found already fixed by the same
2026-09-26 hardening commit (`2d960720`) and needed no filing.

Docs reset pass 1's close (2026-09-24) triaged the whole log and found no open entry. The pass
routed its own findings straight to `ROADMAP.md` in the same step, so none opens here. The docs
reset itself went to the Now tier, with pass 1b next. The pass's deferred chain and harness items,
the Waymark template's `contributor` finding (theme comments citing cairn-internal documents), and
the real page defects its readers found went to the Next tier, each with a trigger. Its candidate
triage covered every page-only bullet (retained, rejected, or excluded), so the Next-tier entry
"Re-source the page-only `[candidate]` bullets" was reworded to the 25 excluded bullets that still
carry verification debt. See Clearings.

retire-2b's close (2026-09-22) triaged the whole log and found no open entry. It routed the five
findings retire-2a's post-mortem carried forward, each re-verified against the tree first, to
`ROADMAP.md`'s Next tier: `cairn doctor`'s PASS lines titled with the failure condition joined the
"Go tool 1.1 items" entry, and the other four (`contributor` and `admin` findings: the unpinned
install literal in the scaffolder's tests, `cairn-guidance`'s realpath-less containment,
`is-it-working.md`'s contributor-register symlink paragraph, and both lockfiles' stale
`cairn-doctor` bin mapping) went into one new entry beside the doctor-retirement items, each with
its trigger. The close's own `contributor` finding, that no CI workflow runs retire-2a's
`check:tool-heuristics`, joined the same entry. See Clearings.

Draft docs pass A's close (2026-09-22) triaged the whole log and found one open finding, its own
`scripter` entry from the json-output page's task, already overtaken by the branch that filed it:
the `logs` golden's `publish.commit.failed` event now has an allowlist entry in
`scripts/checks/check-symbols-allowlist.mjs`, beside three `CAIRN_*` variables the same page
cites, and `check:symbols` is green, so the page ships with no known gate red and the entry is
deleted rather than re-filed. The pass surfaced no finding of its own. Every other entry below was
re-read against the code and each was already cleared by the pass named beside it.

The rest of this section is triage history. retire-1's close (2026-09-22) triaged the whole log and
routed the one entry it carried, the Names one (filed 2026-09-21), to `ROADMAP.md`'s Next tier
with its trigger, since the draft-docs pass that writes those strings is the one that pays for it.
retire-1's own `contributor` finding was filed in the same step, also to Next: `link:consumer`
cannot measure a production site against unreleased engine work, because every site is pinned to a
released version and calls the released export names. See Clearings.

The doctor-retirement pre-task's close (2026-09-21) triaged the whole log again and found no
finding left open by an earlier pass: every entry below was re-read against the code and each was
already cleared by the pass named beside it. The pre-task's own three `contributor` findings were
surfaced and routed in the same step, all to `ROADMAP.md`'s Next tier,
since the next pass to change the public surface or read the facts container is the one that pays
for each: `npm run check:surface -- --update` forwards the flag to `check-surface-leaks.mjs` only,
so a surface regen takes `node scripts/checks/check-surface.mjs --update` by hand;
`check:facts` range-checks a `Source:` pointer and matches an anchor within ten lines, so an
off-by-one pointer stays green, which is how two stale pointers survived into this pass; and
`cairn-run-gate` has no silence watchdog, so a browser-lane gate that stops making progress holds
the heavy lock until someone kills it. See Clearings.

The Go tool's Pass B2 close (2026-09-21) surfaced three `admin` findings
and routed all three in the same step, to `ROADMAP.md`'s "Three docs items for the draft-docs
pass" entry, since that pass is the one that leans on them: the tool's four public pages moving
from `tool/docs/` under `docs/`; the drafts needing to avoid a hard-wired scaffold-first order,
because 2.0's provisioning makes installing `cairn` the first step; and the admin track gaining
the tool inside its existing "is my site working" job rather than as a page of its own. The
whole log was triaged at the same close: the sections below carry no open finding, each earlier
entry having been verified cleared by the pass named beside it. See Clearings.

The extend-2 pass's close (2026-09-20) surfaced and cleared two findings
in the same step: (`contributor`) `docs/reference` has no dedicated page for the
`./admin-sources.css` subpath export, only a section inside `cairn-audit.md`, promoted whole to
`ROADMAP.md`'s Later tier; (`contributor`) the facts container is sectioned one file per docs
page, and `docs/reference/guidance.md` had no section in `docs/internal/facts/reference.md`, so
the `cairn-guidance install` symlink-containment bullet sat under `docs/extend/what-the-scaffold-wrote.md`
instead, fixed by moving the bullet to a new `## docs/reference/guidance.md` section in
`facts/reference.md`. See Clearings.

The extend-1 pass's whole-log triage (2026-09-20) cleared every open
finding: the three 2026-09-15 facts-harvest verification-debt entries folded into `ROADMAP.md`'s
existing "Re-source the page-only `[candidate]` bullets" entry, which already carries their trigger,
and extend-1's own three findings filed into the `ROADMAP.md` tiers where each bites. See Clearings.

The identity-seam pass's own two findings, discovered and shipped in the same pass
(the locals hand-off pattern from Task 2, the doctor probe's missing `redirect: 'manual'` from
Task 4), are cleared already; the internals-C whole-log triage (2026-09-05) cleared the two
entries this section previously carried: the `check:snippets` stub finding promoted whole to
`ROADMAP.md`'s Later tier with its trigger, and the `ctx.logCommitFailed` call-style contradiction
folded into `ROADMAP.md`'s existing polish-slice bullet. The 2026-09-07 charter audit's five
findings (record `docs/internal/record/2026-09-04-cairn-case/27-charter-gap-audit.md`) cleared the
same day (Geoff accepted the routing): the two charter sentences rewritten
(`what-cairn-is-and-is-not.md`, `CLAUDE.md`: the concept SET is the site's and the seams are
disclosed, not enforced, until 1.0); the email-sender and backend "bring your own" doors and the
auth-store widening promoted whole to `ROADMAP.md`'s identity-seam entry; the upgrade contract
left on the 1.0 path where it already sits. The internals-pass whole-log triage (2026-09-03)
cleared four earlier entries: the ASC CSRF 403 entry deleted (every named mechanism verified
shipped; the residual WATCH now lives in `docs/STATUS.md`'s active watches, not here);
`fixtureCsrf`, the rulings-ledger flat-read scaling note, and `presetUrl`/`BUILT_IN_PRESETS` all
promoted whole to `ROADMAP.md`'s Later tier with their triggers. See Clearings below.

Filed 2026-09-30 from the extend arm's code-first gap sweep (finder: the sweep, each finding verified by an independent Opus verifier; record `docs/superpowers/research/2026-09-30-extend-gap-sweep.md` on the `draft-docs-2a` branch, commit `86fd134c`). Line numbers were re-checked on `main` at `5c47a6e3`. Twelve code defects follow, then four misleading-text notes.

- **`extender`.** Found by the 2026-09-30 extend gap sweep. Severity major. `src/lib/content/media-refs.ts:44-51` and `src/lib/content/media-rewrite.ts:158-171` read only top-level image fields and body images, so an image inside an `array` or `object` field (the scaffold's own `gallery: fields.array(fields.image())`, `templates/waymark/src/theme/cairn.config.ts:116`; a documented shape at `docs/reference/core.md:471`) is invisible to the where-used index, the replace rewrite, and the safe-delete gate, which can then delete an asset a page still uses. A fix walks nested array and object image values in both readers.
- **`extender`.** Found by the 2026-09-30 extend gap sweep. Severity major. `templates/waymark/src/chassis/feed.ts:20` renders bodies with no `resolveFragment`, so the seeded post's `::include` (`templates/waymark/src/content/posts/2026-03-10-callout.md:17`) ships as literal text in `feed.xml` and `feed.json`. A fix passes `createFragmentResolver(site)` to the render call.
- **`extender`.** Found by the 2026-09-30 extend gap sweep. Severity minor. `templates/waymark/src/chassis/feed.ts:13-20` passes no origin-anchored `resolveMedia`, so `media:` images in `contentHtml` resolve to root-relative `/media/...` paths a feed reader cannot fetch. A fix passes a `resolveMedia` that prefixes `siteMeta.origin`, as `resolve` already does for links.
- **`editor`.** Found by the 2026-09-30 extend gap sweep. Severity major. The `address-collision` advisory at `src/lib/sveltekit/content-routes-entry-read.ts:412` tells an editor "Publish this one and it replaces the other at that address", but two published routable entries on one permalink make `createSiteResolver` throw (`src/lib/delivery/site-resolver.ts:84-90`), so following the advice fails the next deploy build. A fix rewords the advice to say the other entry must be unpublished or renamed first.
- **`extender`.** Found by the 2026-09-30 extend gap sweep. Severity minor. `FieldBehavior.itemLabel` (`src/lib/content/fieldset.ts#FieldBehavior`, documented at `docs/reference/core.md:1137`) is declared as an array row's label deriver, but nothing in `src/lib` reads `behavior[field].itemLabel`, so the behavior table never reaches the editor. A fix either wires it into the array row label or removes the member and its doc.
- **`extender`.** Found by the 2026-09-30 extend gap sweep. Severity minor. Nothing in `src/lib/sveltekit/admin-dispatch.ts#parseAdminPath` or `src/lib/content/concepts.ts#normalizeConcepts` rejects a concept id that collides with an engine admin segment: `login`, `auth`, `editors`, `nav`, `settings`, `vocabulary`, and `help` make the concept's admin views unreachable, and `media` loses its list view to the Library (its edit views still dispatch). A fix makes `normalizeConcepts` throw on a reserved id.
- **`editor`.** Found by the 2026-09-30 extend gap sweep. Severity minor. The nav editor's page suggestions at `src/lib/sveltekit/nav-routes.ts:63-73` build each url as `/${id}` from the default branch with no permalink resolution and no draft filter, so a suggestion for any concept whose permalink is not `/:slug` 404s, and each nav load reads every page-like concept's directory. A fix derives the url from the site resolver's permalink and skips unpublished entries.
- **`extender`.** Found by the 2026-09-30 extend gap sweep. Severity minor. `normalizePublishActions` (`src/lib/sveltekit/publish-actions.ts`) never checks label uniqueness, while `src/lib/admin/EditPage.svelte:1689` keys its `{#each}` by label, so two same-label actions that apply to one concept hit Svelte's duplicate-key error. A fix rejects duplicate labels in validation or keys the each block by index.
- **`scripter`.** Found by the 2026-09-30 extend gap sweep. Severity minor. `cairn-media-seed` downloads from the fixed path `<from>/media/<slug>.<hash>.<ext>` (`src/lib/media-seed/assemble.ts:117-123`) and reads a fixed `src/content/.cairn/media.json` (`src/lib/media-seed/bin.ts:135`), ignoring `assets.publicBase`, so a site that mounted its media route elsewhere cannot seed and the tool has no flag for it. A fix adds a base-path flag, or reads `assets.publicBase` from the config.
- **`contributor`.** Found by the 2026-09-30 extend gap sweep. Severity minor. Comments at `src/lib/sveltekit/health.ts:1,9` and `src/lib/github/signing.ts:126` name `GET /admin/healthz`, but `parseAdminPath` resolves no such engine view; the scaffold mounts `/healthz` at the site root. A fix rewords the comments to name the site-mounted route.
- **`extender`.** Found by the 2026-09-30 extend gap sweep. Severity minor. `docs/reference/sveltekit.md:1207` says `vocabularySaveAction` writes "the same committed `src/lib/site.config.yaml`" the tidy settings write, but it writes `editor.nav.configPath` when declared (`src/lib/sveltekit/content-routes-settings.ts:198-199`), and the scaffold's file is `src/theme/site.config.yaml`. A fix rewords the sentence to name the configured path.
- **`extender`.** Found by the 2026-09-30 extend gap sweep. Severity minor. `docs/reference/sveltekit.md:805` and `src/lib/sveltekit/section-action.ts:147-149` say an uninferred `Env` "collapses to `{}`", but tsc 6.0.3 under `--strict` infers `unknown`; the same wording sits at `docs/reference/auth-channel.md:38` and `src/lib/auth-channel/factory.ts:573` (same mechanism, not separately probed). A fix corrects all four to `unknown` after probing the second pair.
- **`contributor`.** Found by the 2026-09-30 extend gap sweep. Severity minor (stale comment). The `setMenu` doc comment at `src/lib/nav/site-config.ts:354-356` says "YAML comments are not preserved", but a probe with the repo's `yaml` package showed comments outside the replaced block survive and only those inside it are lost. A fix narrows the comment to the replaced block.
- **`extender`.** Found by the 2026-09-30 extend gap sweep. Severity minor (misleading scaffold comment). The comment at `templates/waymark/src/theme/markdown-components.ts:124-129` says `resolveMedia` shares the throwing "build-backstop posture" with `resolveLinks`, but `createMediaResolver` returns `undefined` on a miss and the build succeeds. A fix drops `resolveMedia` from the comment's list.
- **`extender`.** Found by the 2026-09-30 extend gap sweep. Severity minor (misleading doc example). The `createSiteIndexes` doc example at `src/lib/delivery/site-indexes.ts:33` writes `import.meta.glob('...?raw', { eager: true })`, omitting `import: 'default'`, the form that makes the index build throw. A fix adds `import: 'default'` to the example.
- **`admin`.** Found by the 2026-09-30 extend gap sweep. Severity minor (misleading README line). `packages/create-cairn-site/README.md:337` tells the reader to "run this CLI's own update path" to apply a new migration, but `create-cairn-site` has no update path that applies migrations. A fix names the real migration procedure the sweep's container fact `f:jtl15v` states.

Filed 2026-09-30 by the S1 boundary step of draft docs stage 2a, from the sync spec's design-review examples (`docs/superpowers/specs/2026-09-30-docs-code-sync-design.md`, "What stage 2a inherits") and the gap sweep's `[verified]` gap facts. Each was re-checked against the code at the branch's HEAD (`3e19de2a`) before filing. The premise test runs at promotion, not here.

- **`extender`.** Found by the 2026-09-30 extend gap sweep (DAD-1, `f:shv6wv`), filed as design friction by the S1 boundary step. The settings (tidy conventions) save, the Tags (vocabulary) load, and the vocabulary save all read and commit the file at `runtime.navMenu?.configPath`, falling back to `DEFAULT_SITE_CONFIG_PATH = 'src/lib/site.config.yaml'` (`src/lib/sveltekit/content-routes-settings.ts:123,198-199`; read and commit at `:289,336,409`). `runtime.navMenu` is the adapter's `editor.nav` (`src/lib/content/compose.ts:49`), so a site that keeps its config elsewhere and does not declare `editor.nav` gets a 404 "Site config not found" on a save and an empty Tags list. The scaffold's file is `src/theme/site.config.yaml`, which the showcase names through `editor.nav.configPath` (`examples/showcase/src/theme/cairn.config.ts:182`). A setting that needs an unrelated nav option to find its file is a seam that needs a caveat. A fix gives the site-config path its own adapter member, or derives the fallback from the scaffold's path.
- **`extender`.** Found by the 2026-09-30 extend gap sweep (EXB-4, `f:jsh6ae`), filed as design friction by the S1 boundary step. `readSeoFields` reads `description`, `image`, `robots`, and `author` off an entry's normalized frontmatter (`src/lib/delivery/seo-fields.ts:18,27`), and validation keeps only declared keys (`src/lib/content/fieldset.ts:452-456`), so `image`, `robots`, and `author` reach the head only when the concept's fieldset declares them and an undeclared key is silently dropped (the doc comment at `seo-fields.ts:24-25` says so). A developer who adds `robots: noindex` to a page's frontmatter without declaring the field sees no error and no tag. A fix warns at `defineConcept` when a known SEO key is missing, or documents the declaration as the contract.
- **`extender`.** Found by the 2026-09-30 extend gap sweep (EXB-5, `f:k5uws5`), filed as design friction by the S1 boundary step. `deriveHeroImage` reads `frontmatter.image` only (`src/lib/delivery/public-routes.ts:99`, called at `:149`), and the social image falls back to `fields.image` (`:153-154`). An image field under another name (for example `cover`) with `seo: true` validates and renders in the editor (`src/lib/content/fieldset.ts:319-339` enforces at most one top-level `seo` image) but is never read at delivery. The function's own doc comment (`public-routes.ts:80-92`) already calls honoring a renamed `seo` field "a carried follow-up". The premise test applies before any fix: `engine-rulings.md` records `audit-adapter-imagefield` (keep, because the `seo` marker designates the social-card image), so the ruling's "reopens on" clause and the charter's leanest-seam question come first. The leanest fix may be to drop the free key choice for the `seo` image rather than wire the delivery read path to the field declarations.
- **`contributor`.** Found by the task 2 implementer on 2026-09-30. `scripts/` sits outside every comment and type gate. `eslint.config.js` scopes its comment rules to `src/lib`, the dev-package source, and the showcase's `.ts` and `.svelte` (`eslint.config.js:35-40,82`), and `scripts/checks/check-comments.sh:10` lints `src/lib examples/showcase/src examples/showcase/e2e` only. `tsconfig.json:18` includes `src/lib`, `src/tests`, and `src/types` only, so `svelte-check` never reaches `scripts/**/*.mjs` despite `checkJs: true`, and no `jsconfig.json` or `@ts-check` header covers them. The JSDoc and comments in `scripts/checks/*.mjs` (for example `check-options.mjs`, with its `@param` and `@returns` blocks) are checked by no gate, and the em-dash ban does not reach them. A fix adds `scripts/**/*.mjs` to `COMMENT_GLOBS` and to the `eslint` invocation, and either adds the directory to a `tsc --noEmit` pass or drops the JSDoc type tags the scripts carry.

Filed 2026-09-30 by the page-inputs step for `docs/extend/security-model.md` (draft docs stage 2a).

- **`extender`.** Found by the security-model page inputs on 2026-09-30 (`f:arr13a`). The tidy action and the personal-dictionary action gate on the access map only inside `if (event.params.concept)` (`src/lib/sveltekit/content-routes-tidy.ts:123`, `src/lib/sveltekit/content-routes-dictionary.ts:106`), so a site that mounts either on a route with no `concept` parameter gets an action any editor-capability session can post, whatever the map says. Every other engine write action gates unconditionally (`f:cvv6to`), so the security page has to state an access-map exception that depends on how a route is mounted. A fix gates on a fixed target when the param is absent, or refuses the call.
- **`extender`.** Found by the security-model page inputs on 2026-09-30 (`f:8rnym5`, `f:0vofop`, `f:9ik061`). On the magic-link path the CSRF value rotates at login and logout, but under `identity` nothing rotates it: `issueCsrfToken` reuses a present cookie and `confirmAction` is a 404 (`src/lib/sveltekit/csrf.ts#issueCsrfToken`, `src/lib/sveltekit/auth-routes.ts:319-322`), so a change of gate identity in one browser keeps the old value until a cairn logout or the thirty-day `Max-Age`. The page must caveat that the login-moment rotation it describes for magic links does not hold for the identity seam. A fix rotates the value when the resolved identity changes.
- **`extender`.** Found by the security-model page inputs on 2026-09-30 (`f:horkxq`, `f:g22dnw`, `f:t976f1`). The guard applies its security headers only on `/admin` paths (`src/lib/sveltekit/guard.ts:203-210,371-374`) and serves the https help page only there, so a cairn load that issues a CSRF token or cookie from a route mounted outside `/admin` sends it without `Cache-Control: private, no-store`, and over http on a non-local host under an https `PUBLIC_ORIGIN` mints a `__Host-` cookie the browser discards (`src/lib/sveltekit/csrf.ts#csrfSecure`). The page has to hedge the admin's defenses on where a site mounts the loads. A fix applies the headers by the load's own response, or refuses a mount outside `/admin`.
- **`extender`.** Found by the security-model draft on 2026-09-30 (`f:an087n`, `f:5iqvmt`, `f:k3gfbi`). The setup command's bootstrap sign-in row is written without a `nonce_hash` (`packages/create-cairn-site/src/cloudflare/bootstrap.mjs:107-109`), and `consumeToken` matches `nonce_hash IS NULL OR nonce_hash = ?` (`src/lib/auth/store.ts:182`), so the first owner's sign-in link, the one link every new site issues, carries none of the same-browser binding that closes login CSRF and scanner burn for every later link. The security page has to name that first link as an exception to the binding it describes. A fix binds the bootstrap row to a nonce the setup command hands the browser, or accepts the residual on the record since the link goes only to the owner-to-be.

Filed 2026-09-30 by the page-inputs step for `docs/extend/replace-magic-links-with-cloudflare-access.md` (draft docs stage 2a).

- **`extender`.** Found by the replace-magic-links page inputs on 2026-09-30 (`f:ojr3qm`, `f:iaqcq6`). The public doc comments on `IdentityResolver` and its `label` member (`src/lib/sveltekit/guard.ts:71-87`) say `logoutUrl` and `label` back "the admin.login-probe-failed condition", but no check emits that condition since the npm-era doctor's `--probe` retired (`tool/internal/spine/condition.go:44` declares it, nothing raises it). The page can state only the hand-off, identity-unresolved, and unknown-identity pages as the label's reach, and the reference type contradicts it. A fix drops the condition from both comments, or restores a login probe in the `cairn` CLI.
- **`extender`.** Found by the replace-magic-links page inputs on 2026-09-30 (`f:ig5pn3`, `f:8xxe3b`, `f:pwmybh`). The shell's logout posts to the bare `/admin`, a guarded path, so under `identity` the guard runs `identity.resolve` before `logoutAction` can clear cairn's cookies and redirect to `logoutUrl` (`src/lib/sveltekit/auth-routes.ts:428-436,474`, `src/lib/sveltekit/guard.ts:287`). An editor whose gate session already ended gets the identity-unresolved page instead of a logout, and cairn's cookies stay set. The page has to caveat that logging out needs a live gate session. A fix posts logout to a public admin path under `identity`, or lets the logout action through the identity branch.
- **`extender`.** Found by the replace-magic-links draft on 2026-09-30 (`f:fu4uis`, `f:s9s8mw`, `f:lyaf6p`). The guard picks an identity refusal's log level by matching the site's free-form `reason` string against `audience`, `issuer`, `keys`, and `error` (`src/lib/sveltekit/guard.ts:112-115`), and `IdentityRefusal.reason` is typed `string`, so nothing tells a verifier which words raise a roster-wide lockout to error. Cloudflare's sample verifier rejects a wrong AUD tag and a wrong issuer through one `jwtVerify` throw, and cairn does not depend on `jose`, so the page's illustrative module returns `invalid` for every failure and a misconfigured gate logs at warn. The page has to caveat that the log level depends on the site mapping `jose`'s failures itself. A fix types `reason` as a union with an open escape, or exports the operator-fault set so a verifier can name it.

Filed 2026-09-30 by the page-inputs step for `docs/extend/add-cairn-to-a-sveltekit-app.md` (draft docs stage 2a).

- **`extender`.** Found by the add-cairn page inputs on 2026-09-30 (`f:v72g9z`, `f:2gtftn`). `createCairnAdmin` defaults the sign-in email's branding field by field from the runtime, but a supplied `auth.branding` replaces the default whole (`src/lib/sveltekit/cairn-admin.ts:103-110`), and `AuthBranding` requires `siteName` and `from` (`src/lib/email.ts#AuthBranding`). A site that only wants a different sender has to restate the site name, and one that leaves `replyTo` off silently drops the reply-to its adapter's `email` group sets. The page has to caveat that `branding` is all-or-nothing. A fix merges a partial branding over the runtime default.
- **`extender`.** Found by the add-cairn page inputs on 2026-09-30 (`f:ebx4pv`, `f:em69ru`). `KNOWN_TOP_LEVEL_KEYS` is commented as "the top-level keys the engine reads from site.config.yaml" (`src/lib/nav/site-config.ts:293`), but no `src/lib` module reads `description`, `author`, or `locale`: `parseSiteConfig` accepts them and `composeRuntime` carries only `siteName`, `spellcheck`, `tidy`, and the vocabulary (`src/lib/content/compose.ts:38,60-67`). A developer who sets `locale` expects the engine to act on it, and the page can only say the keys are the site's own to read. A fix rewords the comment and the `SiteConfig` doc to say the three keys are site-owned pass-through, or drops them from the engine's config type.
- **`extender`.** Found by the add-cairn page inputs on 2026-09-30 (`f:t4pwpw`, `f:75hawi`). Two container facts give different triggers for Cloudflare's Workers Paid plan. `f:t4pwpw` ties it to sending sign-in mail to a second person, and `f:75hawi` says a cairn site needs it from the first deploy that carries the admin, sourced to the setup command's consent copy (`packages/create-cairn-site/src/cloudflare/chapter.mjs:108-116`), whose reason is the scaffold's bundle running over the Workers Free script limit (`CHANGELOG.md:3340-3344`). No fact measures a hand-built site's bundle, so the page's prerequisites line has to hedge which trigger applies to the reader. `f:t4pwpw` also restates a vendor price the container's rules say to link instead. A fix measures a minimal hand-built bundle and files the result, then retires whichever fact it contradicts.

Filed 2026-09-30 by the drafter for `docs/extend/add-cairn-to-a-sveltekit-app.md` (draft docs stage 2a).

- **`contributor`.** Found by the add-cairn draft on 2026-09-30. The register's tutorial-milestone anatomy asks for a disclosure block, the Astro "Show me the steps" device, but `check:provenance` cannot carry one. `pageProse` sets aside comments, fences, images, and headings, never an HTML tag (`scripts/checks/check-provenance.mjs:411-419`), so `<details>` is unclassified page text, and `PROSE_PATH_RE` (`:113-114`) reads `</details>` and `</summary>` as the rooted paths `/details` and `/summary`, which no fact carries. The page renders the answer as an open `Show me the steps` subsection instead of a collapsed one. A fix sets aside a fixed allowlist of disclosure tags in `pageProse` and in the extractor.
- **`contributor`.** Found by the add-cairn draft on 2026-09-30. `check:snippets` matches a fence opener only at column 0 (`FENCE_OPEN_RE`, `scripts/checks/check-snippets.mjs:59`, read unindented at `:224`), so a `ts` or `svelte` fence indented under a numbered step is never typechecked and never needs a skip marker. A task page that nests each file's code in its step, as the Google procedure form suggests, silently drops out of the gate. This page moves every TypeScript and Svelte block out of its step list to keep them checked. A fix strips a list item's indentation before matching, the way `pageProse` already does for fences.
- **`extender`.** Found by the add-cairn draft on 2026-09-30. The scaffold's admin layout imports a compiled admin stylesheet, `.cairn/admin.css`, built by a Tailwind CLI script from `src/admin.css`, which imports `@glw907/cairn-cms/admin-sources.css` (`templates/waymark/package.json:8,13`, `templates/waymark/src/admin.css:11`, `templates/waymark/src/routes/admin/+layout.svelte:11`). None of the page's facts covers that step, so the hand-built admin this tutorial mounts has no stylesheet wired. The container needs a fact for the admin sheet a hand-built site must compile and import, and the page a step for it.
- **`extender`.** Found by the add-cairn draft on 2026-09-30 (`f:72mctx`, `f:9mx680`). The dev-backend fence depends on a `__CAIRN_DEV_BUILD__` define that each site supplies through a Vite plugin it writes itself and declares in its ambient types (`templates/waymark/vite.config.ts:19-28`, `templates/waymark/src/app.d.ts`), and the fold only works when every call site names the define directly. A hand-built site copies this plugin and the naming rule by hand, and a copy that routes the flag through a shared constant ships the dev package in the deployed Worker with no build error. A fix ships the define plugin from `@glw907/cairn-cms/vite` beside `cairnManifest`, so the site imports one plugin instead of writing it.

Filed 2026-09-30 by the fact read for `docs/extend/security-model.md` (draft docs stage 2a).

- **`extender`.** Found by the security-model fact read on 2026-09-30 (`f:2fwybn`, `f:gi3keo`). `RendererConfig.sanitizeSchema` is documented as an extension point that preserves the dangerous strip, and `buildSanitizeSchema`'s comment says a site "can add to the allowlist but not weaken the core strip" (`src/lib/render/sanitize-schema.ts:22-24`), but the callback's return replaces the floor's schema wholesale (`:62`) with no check. A probe adding `script` to `tagNames` and emptying `strip` rendered author `<script>` to the page, and the sink guard removes no script element (`:189-191`), while its URL check still strips `javascript:` because `SAFE_SCHEMES` derives from `defaultSchema` (`:129-140`). The security page has to state the additive rule as a contract the site keeps, with a residual that reaches every visitor. A fix re-applies the core strip after `extend` (drop `script` from `tagNames`, restore `strip`), or corrects both comments to name the callback's reach.

- **`extender`.** Found by the security-model second fact read on 2026-09-30 (`f:n3k03a`, `f:7qqhda`). Under `identity`, every refusal the resolver produces logs `guard.refused` with reason `identity` through `refuseIdentity` (`src/lib/sveltekit/guard.ts:290-299`), but a proven email that matches no roster row logs `auth.identity.unknown` instead (`:328-333`), so the one identity refusal an attacker asserting an off-roster address triggers sits outside the `guard.refused` filter an operator uses for every other guard refusal. The security page has to name the exception to state the log accurately. A fix either routes the roster miss through `refuseIdentity` with its own detail word, keeping `auth.identity.unknown` as a companion, or the log-events reference names the split beside `guard.refused`.

Filed 2026-09-30 by the redraft of `docs/extend/security-model.md` (draft docs stage 2a).

- **`extender`.** Found by the security-model redraft on 2026-09-30 (`f:r7sbt1`, `f:wgovy6`). `RendererConfig.unsafeDisableSanitize` (`src/lib/render/pipeline.ts:54`) is a public option that removes both the sanitize floor and the sink guard, yet no page under `docs/reference/` names it: the `createRenderer` entry in `docs/reference/core.md` describes `RendererConfig` as carrying "the sanitize and anchor controls" and details only `sanitizeSchema`, and the option map satisfies `check:options` by pointing the row at a fact (`docs/internal/option-map.json`, `RendererConfig.unsafeDisableSanitize` to `f:wgovy6`). The security page tells a site to leave the switch unset and has no reference entry to link for its contract. A fix adds the option to the `createRenderer` entry with its consequence stated, and points the option-map row at that entry.

Filed 2026-09-30 by the fact read for `docs/extend/add-cairn-to-a-sveltekit-app.md` (draft docs stage 2a).

- **`extender`.** Found by the add-cairn fact read on 2026-09-30 (`f:dqjkci`, `f:c7nyan`). The dev backend serves an in-memory repository seeded with fixed fixtures and never reads the site's own `src/content`, and its `seedContent` option "has no effect yet" (`packages/cairn-cms-dev/src/handle.ts:26-33`). One fixture is itself a `hello` post (`packages/cairn-cms-dev/src/fake-github.ts:35`), so a tutorial whose one sample post is `hello` lands its dev-backend check on a fixture that only looks like the reader's entry. The page has to caveat that the dev admin lists fixture posts, not the files the reader wrote. A fix ships the `seedContent` hook, so the dev admin lists the site's own committed content.
- **`extender`.** Found by the add-cairn second fact read on 2026-09-30 (`f:m0ouh8`, `f:q13lck`). The page's production check runs `cairn doctor` and asks the reader to confirm only that `config.bindings` passes, but the same run also judges `config.observability`, which fails whenever `wrangler.jsonc` lacks `observability.enabled = true` (`tool/internal/doctor/check_observability.go:12-28`). The minimal `wrangler.jsonc` the page builds from `f:q13lck` carries no `observability` block, so a reader who follows the page exactly sees a FAIL line the tutorial never mentions. The page can only tell the reader to ignore the rest of the report. A fix either adds `observability` to the minimal config the facts describe, or has the doctor grade observability as advisory rather than a failure.

Filed 2026-09-30 by the redraft of `docs/extend/add-cairn-to-a-sveltekit-app.md` (draft docs stage 2a).

- **`extender`.** Found by the add-cairn redraft on 2026-09-30 (`f:e8dr5r`, `f:f21bcz`). In `cmd.exe`, the unquoted `set CAIRN_DEV_BACKEND=1 && npm run dev` that `f:e8dr5r` records stores the value `1 ` with a trailing space, and both the scaffold's hooks test (`process.env.CAIRN_DEV_BACKEND === '1'`, `templates/waymark/src/hooks.server.ts`) and `isDevBackendFlagSet` (`src/lib/dev-flag.ts`, `raw === '1' || raw === true`) read that as unset, so a Windows developer silently gets the real guard and its missing-bindings page instead of the dev backend. The page prints the quoted `set "CAIRN_DEV_BACKEND=1"` form without a fact for why the quotes matter, and `f:e8dr5r` itself states the broken form. A fix corrects the fact, and either trims the value in the flag read or has the dev server log a hint when the variable is present but not `'1'`.

Filed 2026-09-30 by the page-inputs step for `docs/extend/add-a-custom-admin-screen.md` (draft docs stage 2a).

- **`extender`.** Found by the add-a-custom-admin-screen page inputs on 2026-09-30 (`f:10ojk8`, `f:xbjxit`, `f:bcybve`). One authorization predicate refuses through three channels that differ in shape. `requireAccess` in a `load` throws `error(403, 'Access denied')` and logs without auditing (`src/lib/sveltekit/guard.ts:476-484`). `createSectionAction` returns `fail(403, { error: 'You do not have access to this action.' })` and audits under the call site's own `action` and `entity` (`src/lib/sveltekit/section-action.ts:216-220`). `createAdminAction`'s opt-in `access` throws `error(403, ...)` with the same copy and audits under the fixed `deny` and `admin-action` verbs (`src/lib/sveltekit/admin-action.ts:306-311`). The target defaults differ too: `requireAccess` and `SectionActionOptions.target` default to the route id, while `AdminActionOptions.access.target` is required. A page that teaches "one fail-closed predicate on the read and the write" has to caveat each difference. A fix aligns the copy and the audit verbs, or states the three channels in one reference table.
- **`contributor`.** Found by the add-a-custom-admin-screen page inputs on 2026-09-30 (`f:g7zuji`). The dev-only chrome-wrap check's console error points at `docs/admin-route-structure.md` (`src/lib/admin/chrome-guard.ts:11`), a path that does not exist in the repo or the package. The check also fires on a width-constraining ancestor only, folding host siblings such as a header or footer into the message as context rather than raising on them (`src/lib/admin/chrome-guard.ts:25-40`), so a root layout that renders a header and footer with no width cap draws no error. A fix repoints the constant at the published page that states the rule, once the extend arm ships it.

Filed 2026-09-30 by the page-inputs step for `docs/extend/architecture.md` (draft docs stage 2a).

- **`extender`.** Found by the architecture page inputs on 2026-09-30 (`f:0gihxq`, `f:0oyrh6`, `f:025q6u`). The head-merge retry re-parents the same precomputed file contents onto the new head, so it preserves only the paths the commit does not name. `commitFiles` builds its tree once from `changes` and reuses it on every retry (`src/lib/github/repo.ts:283-303`), and each change carries a whole file (`treeChanges`). The media delete and metadata commits send a whole `media.json` computed from a pre-commit read with no `expectedHead` (`src/lib/sveltekit/content-routes-media-delete.ts:189-193`, `src/lib/sveltekit/content-routes-media-metadata.ts:187-191`). The media upload commit is head-guarded for exactly this reason: its comment says `media.json` "has no regenerate-from-files backstop, so a concurrent upload fails closed rather than last-writer-wins dropping a row" (`src/lib/sveltekit/content-routes-media-ingest.ts:236-238`). Publish and publish-all likewise retry with a whole content manifest computed before the race (`src/lib/sveltekit/content-routes-entry-write.ts:349-352`), where the build's `verifyManifest` is the backstop that fails the deploy on drift. A page that says "the retry preserves a concurrent commit" has to caveat that it preserves the concurrent commit's other files, never its change to a manifest this commit also rewrites. A fix head-guards the media delete and metadata commits the way upload is, or re-reads and re-merges the manifest inside the retry loop.

Filed 2026-09-30 by the drafter for `docs/extend/add-a-custom-admin-screen.md` (draft docs stage 2a).

- **`contributor`.** Found by the add-a-custom-admin-screen draft on 2026-09-30 (`f:pyt58u`). The outline's figure note asks for a reproduction of the showcase signups screen showing the shell, the toolkit table, and the dialog form, but the only shell-hosted custom-screen story, `toolkit/custom-screen` (`src/lib/reproductions/manifest.ts:298`), mounts `CustomScreen.svelte`, an Events table with `PageHeader`, `AdminTable`, and `StatusChip` and no dialog. Its `@component` comment (`src/lib/reproductions/stories/CustomScreen.svelte:1-15`) says it transcribes the "Compose the screen" snippet of the deleted guide and must stay in lockstep with it. The page embeds that story beside a minimal composition snippet copied from the story, so the running example and the figure are two different screens. A fix adds a signups story that renders the table and the open dialog form, or repoints the story's comment at the new page's snippet.
- **`extender`.** Found by the add-a-custom-admin-screen draft on 2026-09-30 (`f:q4jyat`, `f:vkfd7b`). `f:q4jyat` says the packaged admin sheet does not compile the bracketed `text-[var(--cairn-warning-ink)]` and `text-[var(--color-positive-ink)]` forms, while `f:vkfd7b` says the site admin sheet compiles every utility in a file under `./routes/admin` or `./lib/admin` (`templates/waymark/src/admin.css:3-5`). A bracketed form written in a site's own route may therefore compile after all, through the site sheet, so the page can state only the packaged sheet's side and cannot say whether a site route needs `cairn-text-warning` at all. A fix records whether the site sheet emits the bracketed forms, then states the rule for both sheets in one fact.
- **`extender`.** Found by the add-a-custom-admin-screen draft on 2026-09-30 (`f:68h31z`). The outline and `f:68h31z` name the audit seam `AuditSink`, but the exported type is `AdminActionAuditSink` (`src/lib/sveltekit/admin-action.ts:43`) and the locals field is `cairnAuditSink` (`src/lib/ambient.ts:47`), so no symbol named `AuditSink` exists. The page keeps the heading "Wire the AuditSink" to reuse the old anchor and names `AdminActionAuditSink` in its prose. A fix renames the fact's term to the exported type, and either exports an `AuditSink` alias or retires the heading's term at the next anchor change.
- **`contributor`.** Found by the add-a-custom-admin-screen draft on 2026-09-30. `check:symbols`'s `extractFilePaths` strips leading dots and slashes from every path token (`scripts/checks/check-symbols.mjs:319`), so `.cairn/admin.css`, a scaffolded site's compiled admin sheet, is checked as `cairn/admin.css`. The allowlist entry that admits it has to be keyed on the stripped form (`scripts/checks/check-symbols-allowlist.mjs`), which names no real path. A fix keeps a leading dot-directory on the token, as the comment at `:311-313` already does for a dot-directory mid-path.

Filed 2026-09-30 by the fact read for `docs/extend/add-a-custom-admin-screen.md` (draft docs stage 2a).

- **`extender`.** Found by the add-a-custom-admin-screen fact read on 2026-09-30 (`f:1x8r1x`, `f:22odbz`, `f:t767qb`). Five error-tier static rules check a custom screen's motion, but they resolve over two different keys: `motion-property`, `motion-vocabulary`, and `motion-hover-gate` declare `adminOnly` and read `static.adminScope`, while `motion-band` and `reduced-motion` read `static.scope` and every `static.cssFiles` entry (`src/lib/audit/run.ts:209-210`, `src/lib/audit/config.ts:15,28`). The two defaults are the same three roots today, so a site that moves its admin screens and sets only `static.adminScope` gets three of the five motion rules over them. A page on screen motion has to name both keys, or say "three rules" and leave out two that also convict the screen. A fix either makes the motion family share one scope key or documents the split beside `DEFAULT_ADMIN_SCOPE`.
- **`extender`.** Found by the add-a-custom-admin-screen fact read on 2026-09-30 (`f:da6d2z`, `f:lblh3u`). `createSectionAction` audits every refusal its own checks make, the access-map, owner, and binding refusals, but the session and CSRF refusals `createAdminAction` makes underneath it redirect or throw before `ctx` exists (`src/lib/sveltekit/admin-action.ts:214-215,246-252`), so they leave only a log line and no audit record. "It audits every refusal" is true only of the wrapper's own checks, and a site reading its `audit_log` as the full refusal record misses the CSRF case. A fix either audits the CSRF refusal or states the boundary in `createSectionAction`'s module comment.

Filed 2026-09-30 by the draft of `docs/extend/architecture.md` (draft docs stage 2a).

- **`extender`.** Found by the architecture draft on 2026-09-30 (`f:c1ujrl`, `f:549u00`, `f:zm9tp4`). The reference index calls Extension API "The frozen contract" (`docs/reference/README.md:21`) and the tier gate's comment says "Extension and Scaffold API are the frozen contract" (`scripts/checks/reference-coverage.mjs:70`), yet `navLayout`'s shell types changed shape at `0.86.0` and its own types were renamed at `0.94.0`, both inside that tier. The README's qualifier ("after the beta freeze") names a freeze no release or doc dates, so a reader of one tier cell cannot tell whether an Extension-tier name can break in the next minor. The architecture page has to caveat every tier statement with "pre-1.0, so the tiers are a target discipline". A fix states the pre-1.0 meaning in the reference index's tier definitions, or dates the freeze the README names.

Filed 2026-09-30 by the page-inputs step for `docs/extend/theme-your-public-site.md` (draft docs stage 2a).

- **`extender`.** Found by the theme-your-public-site page inputs on 2026-09-30 (`f:faofr4`, `f:blhd7f`). The preview frame paints `body{margin:0;background:var(--color-base-100,#fff)}` (`src/lib/admin/preview-doc.ts:99-105`), so its ground follows the site's `base-100`, but `PreviewConfig`'s public doc comment (`src/lib/content/types.ts:145-147`), the inline comment above the reset (`src/lib/admin/preview-doc.ts:80-81`), and the reference page (`docs/reference/core.md:174-176`) all say the frame pins a white body background that a site with a non-white ground must override in its own sheet. The theme page states the base-100 behavior, and the reference type contradicts it. A fix rewords the three to the base-100 ground with its `#fff` fallback.
- **`extender`.** Found by the theme-your-public-site page inputs on 2026-09-30 (`f:kt0epf`). The scaffold's re-skin recipe says "About fourteen role values" and then names six keys, light and dark, which is twelve (`templates/waymark/src/theme/theme.css:58-61`), and the styleguide's own copy says "About fourteen values cover a full re-brand" (`templates/waymark/src/routes/(site)/styleguide/+page.svelte:105`) where `theme.css:61-64` says a full status rebrand costs more. The page has to hedge the count with "about" and keep the headline recipe apart from the status rebrand. A fix states the count the list actually names in both files, and says the styleguide's figure covers the brand-and-base re-skin only.
- **`extender`.** Found by the theme-your-public-site page inputs on 2026-09-30 (`f:xv2ien`). A scaffolded site's `theme.css` says "The CI contrast gate (`check:public-tokens`) proves the re-skinned theme still clears AA" and that its token-resolution check "fails the build" (`templates/waymark/src/theme/theme.css:66-68`, again at `:126`, and in the styleguide's header comment at `templates/waymark/src/routes/(site)/styleguide/+page.svelte:13`), but `check:public-tokens` is an engine-repo script the scaffold does not carry; the site's own `check:cairn` runs the three public rules at advisory tier, which fails nothing (`templates/waymark/package.json:16`). The page has to tell a site owner that their theme's own comments name a gate they do not have. A fix points the scaffold's comments at `npm run check:cairn` and its advisory tier.
- **`extender`.** Found by the theme-your-public-site page inputs on 2026-09-30 (`f:18qj2u`). The public-css reference's site-owned token table sets the five `--cairn-cta-*` keys in "Each daisyUI block" (`docs/reference/public-css.md:67-71`), but Waymark declares them unlayered in `:root` and repeats the dark values in a media-guarded `:root:not([data-theme])` block and a `:root[data-theme="cairn-dark"]` block kept identical by hand (`templates/waymark/src/theme/theme.css:328-393`), and its comment gives the unlayered declaration as the reason they sit outside the daisyUI blocks (`:314-323`). A porting developer reads two different homes for the same keys, and the hand-synced dark pair is a workaround with no gate. A fix makes the reference name the home Waymark uses, or moves the CTA pair into the daisyUI blocks if nothing forces it out.

Filed 2026-09-30 by the draft of `docs/extend/theme-your-public-site.md` (draft docs stage 2a).

- **`extender`.** Found by the theme-your-public-site draft on 2026-09-30 (`f:gzw7os`). The chassis names five spacing keys (`--spacing-3xs`, `--spacing-2xs`, `--spacing-xs`, `--spacing-xl`, `--spacing-2xl`) with suffixes Tailwind already uses for `--container-*`, so `max-w-2xl` in a scaffolded site compiles to `max-width: var(--spacing-2xl)`, about 4rem, not Tailwind's 42rem (`templates/waymark/src/chassis/tokens.css:113-120`, documented as a trap at `templates/waymark/src/chassis/README.md:107-118`). The page has to warn a Tailwind-fluent developer off five stock utilities that silently change meaning, and no gate flags a `max-w-<shadowed key>` class. A fix renames the five spacing keys off the container suffixes, or adds an audit rule that flags the shadowed `max-w-*` classes in the public scope.
- **`extender`.** Found by the theme-your-public-site draft on 2026-09-30 (`f:i3rn6f`, `f:i9pgd2`). Renaming a daisyUI theme edits three places by hand: `theme-names.ts`, the inline no-flash script's cookie regular expression in `src/app.html`, and the two `@plugin "daisyui/theme"` names in `theme.css` (`templates/waymark/src/app.html:6-18`, `templates/waymark/src/theme/theme-names.ts:1-22`). `theme-names.test.ts` catches the drift, but only after the edit, so the page states a three-file procedure where one config value would serve. A fix generates the no-flash script's names from `theme-names.ts` at build time, leaving `theme.css` as the one hand-synced touchpoint.
- **`extender`.** Found by the theme-your-public-site resolver on 2026-09-30 (`f:h5e8d4`, `f:s4prb0`). The daisyUI component set is scoped to the chrome markup Waymark renders, yet it lives in the chassis file `tokens.css` (`templates/waymark/src/chassis/tokens.css:21-35,57-72`), whose own comment calls it "about the template's markup, not a theme's look". A port replaces that markup, so a port whose chrome renders a `.tooltip` or a `.modal` has to edit a chassis file the boundary otherwise tells it to keep, and nothing warns when the new chrome uses an excluded component. The page has to carry that chassis edit as an exception inside the port procedure. A fix moves the `exclude` list to the theme's side, or has the theme's sheet declare the component set the chassis activates.

Filed 2026-09-30 by the redraft of `docs/extend/theme-your-public-site.md` (draft docs stage 2a).

- **`extender`.** Found by the theme-your-public-site redraft on 2026-09-30 (`f:p8hsnz`, `f:hva8r5`). The two heading keys a theme sets have two different homes: `--font-weight-heading` is a Tailwind `@theme` key, while `--cairn-heading-case` is a plain role in `@layer theme`, because `text-transform` has no Tailwind namespace (`templates/waymark/src/chassis/tokens.css:41-43,75-89`). A porter sets the pair in two places, the `@theme` block and an unlayered `:root` rule or a daisyUI block, so the port procedure splits one design decision into two steps. Separately, no fact ranks a daisyUI block against a theme's `@theme` redeclaration: daisyUI emits its theme blocks through `addBase` (`node_modules/daisyui/theme/index.js:49,56`), which should land in `@layer base` above `@layer theme`, so the page states the role order and the design-scale order apart instead of one four-rank cascade. A fix documents the heading-case home beside `--font-weight-heading` in the chassis README, and files a fact for the daisyUI block's layer.

Filed 2026-09-30 by the fact read of `docs/extend/architecture.md` (draft docs stage 2a).

- **`extender`.** Found by the architecture fact read on 2026-09-30 (`f:pzbmhq`, `f:b6gquz`, `f:pgy0mr`). The auth store hashes a magic-link token and a preview token before storing and looking it up (`migrations/0000_auth.sql:10`, `migrations/0003_preview.sql:10`, `src/lib/sveltekit/auth-routes.ts:240,346`), but it stores the session id raw: `generateSessionId()` feeds `createSession` directly (`src/lib/sveltekit/auth-routes.ts:365-366`) and the guard passes the cookie value straight to `resolveSession`, which matches `session.id` as-is (`src/lib/sveltekit/guard.ts:353-354`, `src/lib/auth/store.ts:223-231`). The two bearer credentials in one D1 schema behave differently, and `f:pzbmhq` (cited by the security model's inputs) still claims both are looked up by SHA-256 hash. A page stating the D1 keys has to split the session row out of the "hashed" rows. A fix either hashes the session id at rest like the tokens, or records the raw-id choice and its reason and corrects `f:pzbmhq`.

Filed 2026-09-30 by the redraft of `docs/extend/architecture.md` (draft docs stage 2a).

- **`extender`.** Found by the architecture redraft on 2026-09-30 (`f:70mf58`, `f:0xxou5`). `f:70mf58` says every save and every publish is a git commit with the editor as author, "so the repository's history records who changed each entry and when." A publish never merges the holding branch: `publishAction` writes the posted markdown to the default branch as one new commit and then deletes the holding branch (`src/lib/sveltekit/content-routes-entry-write.ts:376-381,404-406`), so the save commits become unreachable, and publish-all folds many entries into one commit (`:476-486`). The default branch's history records who published each change, never who saved each intermediate edit, so an entry two editors worked on shows only the publisher. The page states the narrower claim and cites the broader fact. A fix corrects `f:70mf58` to the publisher-only record, or merges the holding branch on publish if per-save authorship is meant to survive.
- **`extender`.** Found by the architecture redraft on 2026-09-30 (`f:hk24xs`, `f:fhit7f`). `f:hk24xs` says "The one swappable seam is the content store", through `BackendProvider`, but the `identity` option on `createAuthGuard` replaces the whole built-in sign-in path (`src/lib/sveltekit/guard.ts:285-293`), which is a second replaceable piece below the admin. A page that repeats the fact contradicts its own seams table. The page states only that no seam replaces the host. A fix narrows `f:hk24xs` to "the only swappable storage seam" or names both replaceable pieces.
- **`extender`.** Found by the architecture redraft on 2026-09-30 (`f:e69d0l`). The build-verification step's consequence has no fact: `f:e69d0l` says the `cairnManifest` plugin verifies the manifest in `buildStart`, but not what a mismatch does, while the plugin's module comment says "a drift throws there and fails the build as a hard build error" (`src/lib/vite/internal.ts:7-9`). The page can state the check and not its guarantee, which is the step's whole point on a follow-one-edit page. A fix extends `f:e69d0l`, or files a separate fact, with the hard-build-error behavior.

Filed 2026-09-30 by the redraft of `docs/extend/add-a-custom-admin-screen.md` (draft docs stage 2a).

- **`extender`.** Found by the add-a-custom-admin-screen redraft on 2026-09-30 (`f:017qss`, `f:2p5otw`, `f:09g8ev`). The admin's motion language, the eight `--cairn-dur-*` and `--cairn-ease-*` tokens, the reduced-motion opt-back-in rule, and `motion-property`'s allowlist, has no published home. It lives only in `docs/internal/admin-design-system.md` ("Motion", "Reduced motion, by property class"), which `package.json` `files` does not ship, and `docs/reference/cairn-audit.md:91,241` links into that file, so both links break on cairn.pub and in the shipped docs. A custom screen's author is held to that language by five error-tier rules, so the extend page states the tokens and the rule inline with no link to where they are defined. A fix moves the motion tokens and the reduced-motion rule onto a reference page, `admin-grammar-tokens.md` or `cairn-audit.md`, and repoints the two reference links.

Filed 2026-09-30 by the second fact read of `docs/extend/add-a-custom-admin-screen.md` (draft docs stage 2a).

- **`extender`.** Found by the add-a-custom-admin-screen second fact read on 2026-09-30 (`f:qtm9y2`, `f:onqm6k`, `f:b8rkq9`, `f:pyt58u`). Every scaffolded site already carries the custom-screen example: the setup command writes `src/routes/admin/signups/` beside the layout and the catch-all, plus an `APP_DB` binding and `migrations-app/0000_signups.sql` for its table (`templates/waymark/src/routes/admin/signups/+page.server.ts:1-91`, `examples/showcase/.cairn-template.json` excludes neither). A page that teaches "add a screen" through the signups example has to tell a scaffolded reader that the files already exist, and a site that does not want the demo deletes a route, a binding, and a migration directory by hand. A fix either keeps the example out of the scaffold (a `.cairn-template.json` exclude plus the binding) or names it as a removable demo in the scaffold's own README.

Filed 2026-09-30 by the fact read of `docs/extend/theme-your-public-site.md` (draft docs stage 2a).

- **`extender`.** Found by the theme-your-public-site fact read on 2026-09-30 (`f:l2mbcj`, `f:s4prb0`). The daisyUI component set is a design choice, scoped to the four components Waymark's chrome renders (button, badge, alert, card), but it lives in the chassis: `src/chassis/tokens.css` activates `@plugin "daisyui"` with an `exclude` list of every other component (`templates/waymark/src/chassis/tokens.css:18-22,57-72`). A port "keeps `src/chassis/` unchanged" by the chassis's own boundary, yet a new chrome that renders a daisyUI menu, navbar, or modal must edit that chassis file's exclude list, so the page has to attribute the plugin to Waymark or add an exception to the port procedure. A fix moves the component selection to the theme's side (the theme's own `@plugin "daisyui"` options), leaving the chassis only the `themes: false` mechanism.

Filed 2026-10-03 by the resolution-run fact read of `docs/extend/theme-your-public-site.md` (draft docs stage 2a).

- **`extender`.** Found by the theme-your-public-site resolution-run fact read on 2026-10-03 (`f:hgal3e`, `f:s4prb0`, `f:kj37zz`). The site's date format and locale are a presentation choice, yet `formatDate` hard-codes `en-GB` and UTC inside the chassis file `date.ts` (`templates/waymark/src/chassis/date.ts:4-17`), so a theme that wants another format or locale edits a chassis file. With the `exclude` list in `tokens.css` and the dependents-table deletions, that makes three chassis edits a port may make, while the boundary tells a theme to keep `src/chassis/` whole, so the page cannot state the boundary without exceptions. A fix moves the locale and format options to the theme's side (a `theme-names.ts`-style config the chassis reads), or the chassis README names which chassis files a theme is expected to edit.

Filed 2026-09-30 by the stage 2a pilot's post-run step, each verified against the tree first.

- **`extender`.** Found by the add-a-custom-admin-screen fact reads (`f:5stbq2`, `f:gc0hx3`). No `docs/reference` entry lists the five forms that render a `btn` as the selected segment (`.btn-active`, `aria-pressed="true"`, `aria-checked="true"`, a non-empty non-false `aria-current`, `:checked`; `src/lib/admin/cairn-admin.css:1189-1304`) or the bare-`btn` hairline look (`cairn-admin.css:954-994`). `docs/reference/admin-toolkit.md` names `btn-active` only inside the `Pagination` and toolbar class inventories, so an extender writing a custom screen's own toggle finds the forms only in the facts container. A fix adds both to a reference page for the admin sheet (`admin-grammar-tokens.md` or `admin-toolkit.md`).
- **`extender`.** Found by the add-a-custom-admin-screen fact read (`f:qz4gj2`). `docs/reference/admin.md` does not record that the shell's favicon and sidebar brand mark are fixed to the cairn glyph and wordmark, with `siteName` the only site identity shown (`src/lib/admin/CairnAdminShell.svelte:680-681,845,1063-1068`). A fix adds the statement to the `CairnAdminShell` entry.
- **`contributor`.** Found by the pilot's resolution passes (2026-09-30). A provenance brief sentence holds one fact id, and the brief has no cut field (`docs/internal/briefs/extend/*.json` carry only `page` and `sentences`; `scripts/checks/check-provenance.mjs` reads a single `sentence.id`). The admin-screen and theme resolvers split sentences to cite several facts and pushed each page's cuts to the stage record, so a page's cuts live only in `docs/superpowers/research/2026-09-30-draft-docs-2a-pilot-record.md`. A fix lets a sentence carry several ids and a brief record its cuts, with `check:provenance` reading both.
- **`contributor`.** Workstation-tool finding, not a cairn defect. `tellgrader --register docs` reports `slop-hard` on the proper noun "showcase" (`examples/showcase`), which five hits on `security-model.md`'s first review traced to; a one-sentence probe reproduces it. The lexicon false positive is in the dotfiles tool. A fix exempts the proper noun there, through the dotfiles friction path.

Filed 2026-09-30 by the restructure of `docs/extend/add-cairn-to-a-sveltekit-app.md` (draft docs stage 2a).

- **`extender`.** Found by the add-cairn restructure on 2026-09-30 (`f:m0ouh8`, `f:k16chc`, `f:9ug9mo`). The tutorial deploys only by hand with `npx wrangler deploy` and connects no build to a push on `main`, while its entry route is prerendered, so the origin and content are written into the build output at build time (`src/lib/delivery/public-routes.ts:144-154`). Its production check therefore ends with a publish whose commit lands on `main` (`f:m0ouh8`), but the deployed page keeps the old body until the developer builds and deploys again. The owner-ruled introduction says an editor can "publish it to the deployed site", which the walkthrough does not deliver on its own. The page's summary says the edit reaches the deployed site with the next build and deploy. A fix either adds a fact-backed milestone step that connects the repository to Cloudflare's build on push, or accepts the manual deploy and has the introduction say so.

Filed 2026-09-30 by the scoped fact read of `docs/extend/security-model.md`'s restructure (draft docs stage 2a).

- **`extender`.** Found by the security-model fact read on 2026-09-30 (`f:v85shm`). The owner's threat position says an anonymous visitor reaches nothing behind `/admin` except the sign-in form (`docs/internal/what-cairn-is-and-is-not.md:107`), but the guard's public admin paths are `/admin/login` and every path under `/admin/auth/` (`src/lib/sveltekit/guard.ts:25-27`), and `GET /admin/auth/confirm` renders a confirm page to an anonymous browser (`src/lib/sveltekit/auth-routes.ts:284`). The two statements name the anonymous surface differently, so a page that restates the owner's line as "the one admin page an anonymous visitor reaches" overstates the code. A fix either widens the threat position to "the sign-in form and its confirm page" or narrows the guard's public prefix to the paths the sign-in flow needs.

Filed 2026-09-30 by the second redraft of `docs/extend/add-cairn-to-a-sveltekit-app.md` (draft docs stage 2a).

- **`contributor`.** Found by the add-cairn second redraft on 2026-09-30. The register's tutorial milestone anatomy requires a disclosure block, the Astro "Show me the steps" device (`docs/internal/docs-register.md`, "The page anatomies"), and the engine's sanitize schema admits `details` and `summary` (`src/lib/render/sanitize-schema.ts:50`). `check:provenance` cannot pass one, though. `pageProse` sets aside HTML comments but not HTML tags (`scripts/checks/check-provenance.mjs:411-419`), so a `<details>` wrapper must appear in the brief, and `PROSE_PATH_RE` (`:116-117`) reads the closing tags `</details>` and `</summary>` as the rooted paths `/details` and `/summary`, which fail every no-claim line and match no fact. The page fell back to a `#### Show me the steps` heading, which does not collapse. Candidate fixes: set aside the disclosure tags in `pageProse`, or skip a path token that a `<` precedes.

Filed 2026-09-30 by the scoped fact read of `docs/extend/theme-your-public-site.md`'s restructure (draft docs stage 2a).

- **`extender`.** Found by the theme fact read on 2026-09-30 (`f:kq6ud3`, `f:c4nnu9`). Waymark's `theme.css` lists the code-highlight binding as Tier 2, the theme's "owned, documented floor" (`examples/showcase/src/theme/theme.css:78-82`), but the theme declares none of it: the `pre.shiki` and `.cairn-tok-*` rules and every `--cairn-code-*` role they read live in the engine's `cairn-public.css` (`src/lib/public/cairn-public.css:28-36,65-90`), and `theme.css` sets no `--cairn-code-*` key. A page that follows the tier comment calls the binding "a Tier 2 token in `theme.css`", which the file does not hold. A fix either moves the binding out of the Tier 2 list (naming the `--cairn-code-*` roles as the override point) or has Waymark declare the roles it owns.

Filed 2026-10-03 by the page plan for `docs/extend/add-a-custom-admin-screen.md` (draft docs stage 2a, task 7c), each verified against the tree first.

- **`extender`.** Found by the add-a-custom-admin-screen page plan on 2026-10-03, a hole in `docs/internal/facts/`. The page's fact ids carry no statement that a custom screen's form mounts `CsrfField`, yet the `CsrfField` entry in `docs/reference/admin.md` says a form that renders none fails the guard's token check, and the showcase signups screen mounts it in both of its forms (`examples/showcase/src/routes/admin/signups/+page.svelte:8,64,145`). The committed page's dialog-form snippet posts `?/create` through `use:enhance` with no `CsrfField`, so a reader who copies it builds a form the guard refuses. The plan keeps `<CsrfField />` in the snippet's code and makes no prose claim about it, since no fact backs one. A fix mints a `[verified]` fact from `src/lib/admin/CsrfField.svelte` and the guard's check and cites it from the dialog-form section. Fact filed 2026-10-03 as `f:fers77` by the scoped redraft of the page (task 7b), cited from a `CsrfField` step in "Compose the screen from the toolkit" that covers every action form on the screen.
- **`extender`.** Found by the add-a-custom-admin-screen page plan on 2026-10-03 (`f:hafpqf`), while subordinating the rate limit to `docs/reference/sveltekit.md`. The `createSectionAction` entry (check order item 2) and the `SectionActionConfig` type row state the three `rateLimit` members, that the limit runs before the access-map checks, and that an unresolved binding or a throwing `key()` or `limit()` degrades to open, but neither states the default 429 copy (`Too many requests. Wait a moment and try again.`, `src/lib/sveltekit/section-action.ts`) or that a SvelteKit `redirect()` or `error()` thrown from `key()` or `limit()` propagates instead of degrading. A fix adds both clauses to the `createSectionAction` entry's check-order item 2.
- **`extender`.** Found by the add-a-custom-admin-screen page plan's revision on 2026-10-03 (`f:3lbdl6`), while placing the page's most likely first failure. An owner who opens a new custom screen before the access map carries a rule for its route gets a 403 and an `auth.access.refused` record with the resolved target, since `hasAccessRule` carries no owner exemption (`src/lib/sveltekit/guard.ts:476-482`), and `config.access_unmapped` reports only an unmapped concept id or fixed engine screen, never a site's own route (`docs/reference/log-events.md`, its row). The extend track's recovery surface, `docs/extend/debug-your-site.md`, lists no `auth.access.refused` symptom row in its outline covers or its fact ids (`docs/internal/outlines/extend.json`), so the page's diagnostic sentence points at `docs/extend/restrict-admin-access.md` and the `auth.access.refused` row in `docs/reference/log-events.md` instead of the surface the task-guide anatomy names. A fix adds an `auth.access.refused` row, with an owner's 403 on an unmapped custom route among its causes, to debug-your-site's page inputs ahead of its draft.
- **`extender`.** Found by the add-a-custom-admin-screen page plan's second revision on 2026-10-03 (`f:vao0dd`, `f:n2bhjw`, `f:pswc3n`), a hole in `docs/internal/facts/`. The page's row-detail recipe now carries a step that renders each row as an `ExpandableRow` and a step that wires the panel's open handler, but no fact in the page's inventory states the component's controlled contract: `expanded` and `onToggle` are caller-held props, with the caller deriving `expanded={expandedId === row.id}` per instance (`src/lib/admin-toolkit/ExpandableRow.svelte:9-11`; the `ExpandableRow` entry in `docs/reference/admin-toolkit.md`). The five `ExpandableRow` facts name its job, graduation, `colspan`, the `header` snippet, and `data-cairn-inert-cell`, so the page links the entry for the props and names none, and a reader learns which prop opens the panel only off the page. A fix mints a `[verified]` fact for the `expanded`/`onToggle` contract from the component's `@component` comment and cites it from the row-detail step.
- **`extender`.** Found by the add-a-custom-admin-screen page plan's third revision on 2026-10-03 (`f:od9mww`, `f:uy7vyc`), a hole in `docs/internal/facts/`. The row-detail recipe's final step renders a row's cached detail in its `ExpandableRow` panel, and the third plan read asked that step to also show a short failure message with a way to retry when the fetch fails. No fact in the page's inventory states what the panel shows while the fetch is pending or after it fails: `f:od9mww` states only that a failed row stays retryable, and the committed handler snippet (`docs/extend/add-a-custom-admin-screen.md`, "Load row detail on demand") returns `undefined` on either failure and leaves the panel's rendering unstated. The page therefore gives no failure display, and a reader who follows the recipe gets a panel that renders nothing on a failed fetch with no stated idiom for saying so. A fix mints a `[verified]` fact for the panel's pending and failed states, from whatever idiom the engine's own screens use for an inline fetch failure, and cites it from the recipe's final step.

Filed 2026-10-03 by the resolution redraft of `docs/extend/add-a-custom-admin-screen.md` (draft docs stage 2a, task 7b).

- **`extender`.** Found by the add-a-custom-admin-screen resolution redraft on 2026-10-03 (`f:7ik6ng`, `f:5t1i7o`, `f:clyg9r`, `f:jra92k`). The page's import step in "Compose the screen from the toolkit" cannot name the subpath it imports from, `@glw907/cairn-cms/admin-toolkit`, because the only fact that states it, `f:7ik6ng`, is subordinated to `docs/reference/admin-toolkit.md` as the export list, and the carried toolkit facts name primitives and never the subpath. The step therefore says "from the admin toolkit" and leaves the subpath to the snippet. The dialog-form recipe has the same shape: no carried fact names `use:enhance` (`f:jra92k` and `f:xgy3iu` say "submitted with `enhance`"), so step 3 reads "with `enhance` applied". A fix mints a narrow `[verified]` fact that a custom screen imports its primitives from `@glw907/cairn-cms/admin-toolkit` (`examples/showcase/src/routes/admin/signups/+page.svelte:9`), separate from the export list, and lets a page plan carry it apart from `f:7ik6ng`.
- **`contributor`.** Found by the add-a-custom-admin-screen resolution redraft on 2026-10-03 (`f:onqm6k`). `check:symbols` resolves a file-path code span against the engine repository's root, so `migrations-app/0000_signups.sql`, a path in every scaffolded site (`templates/waymark/migrations-app/0000_signups.sql`, `examples/showcase/migrations-app/0000_signups.sql`), fails as unresolved on an extend page. The page says "the scaffold's signups migration" instead of naming the file the reader applies. A fix resolves a site-relative path against `templates/waymark/` as well, the way the allowlist already admits `.cairn/admin.css`.

Filed 2026-10-03 by the fact read of `docs/extend/add-a-custom-admin-screen.md` (draft docs stage 2a, task 7b resolution run 2), verified against the tree first.

- **`extender`.** Found by the add-a-custom-admin-screen fact read on 2026-10-03 (`f:n2bhjw`, `f:vao0dd`). The page's row-detail recipe tells a reader to head `ExpandableRow`'s trailing trigger cell with a `<th scope="col">` holding an `sr-only` span, the pattern the showcase signups table uses (`examples/showcase/src/routes/admin/signups/+page.svelte:106`), and its next step sends the reader to the `ExpandableRow` entry's example for the handler wiring. That example heads the same cell with a bare `<th></th>` (`docs/reference/admin-toolkit.md:840`), so a reader who copies the linked example builds the unlabeled column header the recipe warns against. A fix gives the reference example the `<th scope="col"><span class="sr-only">...</span></th>` header the recipe and the showcase use.

Filed 2026-10-03 by the page plan for `docs/extend/add-cairn-to-a-sveltekit-app.md` (draft docs stage 2a, task 7c), verified against the reference arm first.

- **`extender`.** Found by the add-cairn page plan on 2026-10-03 (`f:gffvfd`, `f:hft8s8`, `f:rn62i1`, `f:pkrwom`). The five shipped migrations under `migrations/` and which of them a site applies (`0000_auth.sql` and `0004_login_nonce.sql` for every site, `0001_roles.sql` and `0003_preview.sql` opt-in, `0002_audit.sql` on a separate audit binding) have no reference page. `docs/reference/auth-store.md` documents the D1 roster functions over the same tables and names no migration, `docs/reference/sveltekit.md` names `0002_audit.sql` only inside its `createD1AuditSink` entry (`:639-667`) and `0003_preview.sql` only inside `loadPreview` (`:1174`), and no other reference page names a migration file. The tutorial has to carry the whole catalogue itself where a link would serve, and the plan could subordinate the table-per-file detail of `f:gffvfd` to no page. A fix adds a migrations section to `docs/reference/auth-store.md`, the D1 schema's home, listing each file, what it creates or alters, and which sites apply it.

Filed 2026-10-03 by the page plan of `docs/extend/security-model.md` (draft docs stage 2a, task 7c).

- **`extender`.** Found by the security-model fact read on 2026-10-03 (`f:ubuj1w`, `f:t976f1`,
  `f:n3k03a`). The guard's admin security headers reach only the response `resolve` returns
  (`src/lib/sveltekit/guard.ts:370-371`). The branded rejection pages re-apply them less
  `Strict-Transport-Security` (`src/lib/sveltekit/admin-response.ts:67`), but the 303 redirect to
  `/admin/login` for a missing or invalid session is thrown before `resolve`
  (`src/lib/sveltekit/guard.ts:355`), so it carries no `nosniff`, no frame denial, no
  `no-referrer`, and no `Cache-Control: private, no-store`. A page cannot say "every admin
  response carries" the list without two exceptions on different terms. A fix catches the redirect
  in the guard and applies the HSTS-less header set to it, the same as a rejection page.

- **`extender`.** Found by the security-model page plan on 2026-10-03 (`f:9pmipf`). The
  `NO_PENDING_REQUEST_ERROR` entry in `docs/reference/sveltekit.md` says `confirmAction` redirects
  with the code "when the confirming browser carries no pending-login cookie and the submitted
  token is bound to another browser's nonce", but the code (`src/lib/sveltekit/auth-routes.ts:346-362`)
  sends `no-pending-request` for every failed confirm from a browser holding no cookie, whether
  the row was bound, missing, expired, or replayed; only a browser that holds the cookie reads
  `expired`. The plan subordinates the fact to that entry, which states the condition narrower
  than the code it now stands in for. Reference-arm fix: widen the entry's first sentence to the
  cookie-less case as a whole.
- **`extender`.** Found by the security-model page plan on 2026-10-03 (`f:zzbzo8`). The
  `createRenderer` entry in `docs/reference/core.md` lists the hast-stage steps a site's rehype
  plugin runs after as "dispatch, the sanitize floor, heading slugs, highlighting, anchor
  hardening, the sink guard, the default table-scroll wrap", which puts the dispatch before the
  floor and omits `rehype-raw`; the pipeline runs `rehype-raw`, then the floor, then the `build()`
  dispatch (`src/lib/render/pipeline.ts:93-140`). The floor-before-dispatch position is the render
  section's load-bearing claim, so a reader who checks the page against the reference finds the
  two in different orders. Reference-arm fix: list the steps in pipeline order and name
  `rehype-raw`. The plan carries the fact on the page, so no page leans on the entry's order.
- **`extender`.** Found by the security-model redraft on 2026-10-03 (`f:cvv6to`, `f:arr13a`).
  Two engine surfaces share the word "tidy" and gate on different terms: the tidy settings save
  always gates through the access map against `settings`
  (`src/lib/sveltekit/content-routes-settings.ts`), while the tidy action runs its check only when
  the route carries a `concept` parameter (`src/lib/sveltekit/content-routes-tidy.ts:123`). A page
  that excludes "the tidy action" from the map's coverage reads as excluding the settings save too,
  so the security model has to name the settings save back in by qualifier. A fix either gates the
  tidy and dictionary actions against a fixed target when no `concept` is mounted, which removes the
  exception, or names the two surfaces apart in the reference.
- **`extender`.** Found by the security-model page plan's resolution revision on 2026-10-03
  (`f:r0cv6e`). The outline's sixth out-of-scope item for `docs/extend/security-model.md`
  (`docs/internal/outlines/extend.json`, `outOfScope`: "When the sanitize floor shipped; state the
  floor as it is (migration-notes, kept)") hands the floor's history to
  `docs/extend/migration-notes.md`, and the concept anatomy asks the introduction to name the page
  that covers what it leaves out, but no published page holds that record: the oldest entry in
  `docs/extend/migration-notes.md` is 0.86.0, the oldest in `CHANGELOG.md` is 0.22.0, and the floor
  shipped in v0.17.0 (git `40d466ad`, `f:r0cv6e`). The round-2 structural read asked the
  introduction to name Migration notes as that record, which the file cannot back, so the page
  states the floor as it stands and names no page for its history, and the Concepts gloss for
  Migration notes names only the access-map warning it does record. A fix either adds a
  pre-0.86.0 note to `docs/extend/migration-notes.md` for the floor's arrival, or re-points the
  outline's sixth item at no page so the anatomy's "pages that cover it" clause is not owed where
  no page exists.
- **`extender`.** Found by the security-model page plan's targeted close on 2026-10-03
  (`f:8u4iiv`, `f:tkpmxr`, `f:irs7fg`). The facts container holds no bullet stating what an auth
  channel is for. Every channel fact is mechanism-level (the governing rule, the origin check,
  hashing, code generation, the dev-backend refusal), and the only words for the seam's purpose
  are asides, `f:tkpmxr`'s "second-audience" and `f:8u4iiv`'s "the site's own member routes",
  which the round-2 fact read called indirect support for "signs the site's members in". The
  reference lede states the purpose in full (`docs/reference/auth-channel.md:3-8`: a factory for a
  site's own second-audience login channel, over any transport the site's `deliver` sends, for
  members, athletes, boosters, or any roster the owner/editor auth was never meant to model). The
  page has to introduce the channel where it first depends on it, in the dev-backend section, and
  the plan assembles that sentence from four mechanism facts' asides; the round-1 drafter dropped
  the purpose clause from a hand-off for the same want. A fix harvests one `[verified]` fact for
  the channel's purpose from that lede and `src/lib/auth-channel/factory.ts`'s module comment, so
  an orienting sentence has one citation.
- **`extender`.** Found by the security-model page plan's third structural revision on 2026-10-03
  (`f:21by9u`, `f:zzbzo8`). The page's fact inputs (`docs/internal/outlines/extend.json`, the
  `security-model` entry's `factIds`) carry no bullet stating what a `build()` is, though the
  container does: `f:htxey1` (`defineComponent` declares one container directive with a required
  `build` returning a hast `Element`) and `f:tg9e0z` (a site's component is declared with
  `defineComponent`, collected by `defineRegistry`, and invoked as a container directive the
  pipeline stamps for dispatch) sit under the component pages' sections
  (`docs/internal/facts/extend.md:309,504`). The structural read blocked on `build()` used as a
  known term in Render safety, and the plan's introducing sentence is assembled from two
  render-safety facts' asides, `f:21by9u`'s "registered `build()` component" and "running
  site-developer code" and `f:zzbzo8`'s "`build()` dispatch", with the `defineComponent` reference
  entry linked for the contract, the same want the channel entry above records. A fix either adds
  `f:htxey1` and `f:tg9e0z` to the security-model entry's `factIds`, or lets a page plan cite a
  container bullet outside its page's inputs when the page depends on the concept, which
  `check:provenance` already accepts, since it resolves any container bullet.

Filed 2026-10-03 by the page plan of `docs/extend/replace-magic-links-with-cloudflare-access.md`
(draft docs stage 2a, task 7c).

- **`extender`.** Found by the replace-magic-links page plan on 2026-10-03 (`f:q0icwk`, `f:s9s8mw`,
  `f:pwmybh`). The resolver's `logoutUrl` is the one value in the Access recipe the reader sets
  from Cloudflare's side, and the facts container holds no fact stating Access's logout address:
  `f:q0icwk` cites the session management page for what a logout does, `f:s9s8mw` gives the team
  domain's form, and `f:pwmybh` gives the guard's validation of whatever the site passes. The page
  can only link the session management page at the step that sets the value, and the sample
  imports it from a config module without spelling it. A fix harvests the address from
  https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/
  as a vendor fact (`[external: Cloudflare]`), so the config module step can state it.
- **`extender`.** Found by the replace-magic-links page plan on 2026-10-03 (`f:qhmydf`). Identity
  mode has no owner bootstrap: `bootstrapOwner` lives only in the magic-link routes
  (`src/lib/sveltekit/auth-routes.ts:44,201-203`), which the guard's `identity` branch never
  reaches (`src/lib/sveltekit/guard.ts:287-293`), so a site that goes live behind a gate before
  any magic-link sign-in has no owner and no admin path that could create one. The page has to
  carry the first owner as a precondition seeded out of band (`create-cairn-site` or
  `wrangler d1 execute` against `AUTH_DB`), and the reference says the same
  (`docs/reference/sveltekit.md`, the "Under identity mode" paragraph). A fix lets the `identity`
  branch honor a `bootstrapOwner` on `AuthGuardConfig` for the first proven email when the roster
  is empty, or records the out-of-band seed as the ruling.
- **`extender`.** Found by the replace-magic-links page plan's second revision on 2026-10-03
  (`f:fu4uis`, `f:sbv5xj`; `src/lib/sveltekit/guard.ts:288-313`; `docs/reference/log-events.md`,
  the `guard.refused` row). The guard writes `detail: "error"` on `guard.refused` for two
  different events: a resolver that threw (the `catch` at `guard.ts:309-312`, with the thrown
  message in a separate `error` field) and a resolver that returned `{ ok: false, reason: 'error'
  }` (the `!resolved.ok` branch, no `error` field), and both log at error, since
  `IDENTITY_OPERATOR_FAULT_REASONS` lists `error`. `IdentityRefusal.reason` is typed `string`, so
  nothing stops a site from returning the literal, and a reader diagnosing `error` cannot tell a
  crash from a site-chosen reason except by whether the `error` field is present, which the
  reference row states and no fact carries. The page's sample works around it by rethrowing any
  `jose` failure its mapping does not name, so under the sample `error` always means a throw and
  always carries a message, and the failure path's `error` step holds only for a site that keeps
  that shape. A fix reserves the literal: coerce a returned `error` to another word before the
  log, or name a thrown resolver with its own `detail` word such as `threw`, and say in the
  `IdentityRefusal.reason` doc comment and the reference row which words are the guard's own.
- **`extender`.** Found by the replace-magic-links page plan's third revision on 2026-10-03
  (`f:agif8l`, `f:k40l86`), a hole in `docs/internal/facts/`. The page argues that the Access
  application's policy and cairn's roster are two admission lists that must agree on the editor's
  email, and the structural edit found that no step set the policy. `f:agif8l` states only that
  users who match the application's policies reach the Worker, and `f:k40l86` only that the
  application decides who reaches `/admin` at all; no fact states what a policy is made of, the
  action that admits or the rule selectors a roster maps onto (an email, an email domain, or an
  identity-provider group), so the policy step can name the policy's job and link Cloudflare's
  policies page for the rest, spelling neither. A fix harvests the Allow action and the selectors
  from https://developers.cloudflare.com/cloudflare-one/access-controls/policies/ as a vendor fact
  (`[external: Cloudflare]`), so the step can tell the reader which selector to pick for a roster
  of named editors.
- **`extender`.** Found by the replace-magic-links fact read on 2026-10-03 (`f:fu4uis`,
  `f:lyaf6p`, `f:s9s8mw`), a hole in `docs/internal/facts/`. The page's sample verifier now maps
  `jose` error codes (`ERR_JWT_EXPIRED`, `ERR_JWT_CLAIM_VALIDATION_FAILED` with its `claim`,
  the three `ERR_JWKS_*` codes, and the signature and malformed-token codes) to the refusal
  reasons the guard logs at error, and the sentence after the sample says a wrong AUD tag or team
  domain therefore logs at error. No fact states `jose`'s error codes or the `claim` property, so
  the mapping the page's whole log-level argument rests on traces to nothing in the container.
  The codes match `jose`'s own `src/util/errors.ts` on `main` (read 2026-10-03). A fix harvests
  them from https://github.com/panva/jose/blob/main/src/util/errors.ts as a vendor fact
  (`[external: jose]`), so the sample and its follow-on sentence can cite it; the deeper fix is
  the earlier entry's, a typed `reason` union, which would let the guard own the mapping. Until
  that harvest lands, the 2026-10-03 redraft keeps the mapping in the sample and drops the prose
  claim that a wrong AUD tag or team domain logs at error. The earlier 2026-09-30 entry's account
  of the page (a module returning `invalid` for every failure) no longer describes it, though its
  proposed fix stands.

Filed 2026-10-03 by the page plan of `docs/extend/architecture.md` (draft docs stage 2a, task
7c), verified against the tree first.

- **`extender`.** Found by the architecture page plan on 2026-10-03 (`f:70mf58`, `f:0xxou5`,
  `f:qehbx3`). `f:70mf58` says every save and every publish is a git commit with the editor as
  author, so the repository's history records who changed each entry and when. A publish is a
  fresh commit on the default branch carrying the entry file and the manifest
  (`src/lib/sveltekit/content-routes-entry-write.ts:350-378`), never a merge of the holding
  branch, and the branch is deleted once that commit lands with the branch head unmoved
  (`src/lib/sveltekit/content-routes-entry-write.ts:401-405`), after which no ref keeps the save
  commits. The default branch therefore holds one commit per publish, and stating git history as
  the edit record takes a caveat the fact does not carry: the record is at publish granularity,
  and the save-by-save trail lasts only as long as the holding branch. The plan has the page state
  the publish record alone and makes no claim about the save trail. A fix either narrows
  `f:70mf58` to the publish record, or has the publish carry the save trail onto the default
  branch, a design decision for the write path.

Filed 2026-10-03 by the page plan of `docs/extend/theme-your-public-site.md` (draft docs stage
2a, task 7c).

- **`extender`.** Found by the theme-your-public-site page plan on 2026-10-03 (`f:4xptbu`). The
  plan subordinates the media-seed download path to `docs/reference/cli-cairn-media-seed.md`,
  whose `--from` row and "What it writes" section state the fixed
  `<base-url>/media/<slug>.<hash>.<ext>` path, but no sentence on that page says the command
  never reads the adapter's `assets.publicBase`, so a site whose media route is mounted at
  another path cannot seed with it (`src/lib/media-seed/assemble.ts#downloadUrl`). The theme
  page links the reference and states nothing about the path, so a reader with a relocated media
  route learns the limit only from a failed run. A fix adds the sentence to the `--from` row; the
  tool-side finding (no flag for the path) is the `scripter` entry of 2026-09-30 above and is not
  refiled.
- **`extender`.** Found by the theme-your-public-site page plan on 2026-10-03 (`f:faofr4`,
  `f:i9pgd2`). The editor's preview frame emits `<html data-cairn-preview>` with no `data-theme`,
  so only the OS color scheme reaches it (`src/lib/admin/preview-doc.ts:99-105`), while the public
  site resolves its scheme from the visitor's cookie and the live `data-theme` through the
  chassis's `resolveTheme` (`examples/showcase/src/chassis/theme-toggle.ts:28-42`). An editor who
  chose the site's dark scheme on the public site previews an entry in the scheme the OS picks,
  and a theme whose two schemes differ in more than color (Waymark's inverted CTA panel, its
  dark card border) cannot be proofed in the other scheme from the editor. The theme page states
  the OS-only behavior as a caveat beside the base-100 ground. A fix lets the preview document
  carry a `data-theme` the editor can set, or reads the site's theme cookie into the frame.
- **`extender`.** Found by the theme-your-public-site page plan on 2026-10-03 (`f:lwrqfd`). A
  theme file reaches the chassis only through the `$chassis` alias or a relative `@import`, and
  the engine repository gates that boundary on its example site with `check:chassis-boundary`
  (`scripts/checks/check-chassis-boundary.mjs:2-13`), but the scaffold a site receives carries no
  such script (`templates/waymark/package.json`), so the boundary the page describes as the
  reason a port can keep `src/chassis/` across engine upgrades is a convention a site can break
  without notice. The page has to say "by convention" and "no gate enforces it". A fix ships the
  check in the scaffold's `check:cairn` chain, or as a `cairn-audit` static rule over the public
  scope, reading the same seam table in `src/chassis/README.md`.

Filed 2026-10-03 by the scoped fact read of `docs/extend/add-a-custom-admin-screen.md`'s
resolution redraft (draft docs stage 2a, task 7b).

- **`extender`.** Found by the add-a-custom-admin-screen fact read on 2026-10-03 (`f:2khr2m`,
  rejected). The page's motion section sends a reader to `docs/reference/cairn-audit.md`, "What the
  motion rules don't cover", for the frame-offset allowance, and that section says "The allowance
  is one element per screen, in document order. A screen is one component file; the first carrying
  element passes and a second is convicted." The rule counts across the whole run instead:
  `checkFrameOffset` collects the carrying nodes from every file the run parses and exempts only
  index 0 (`src/lib/audit/rules/static/motion-property.ts:354-374,395-396`), so a custom screen that carries one `data-cairn-motion="frame-offset"` element
  is convicted whenever a carrier in another scanned admin file sorts first. The allowance's name
  ("per screen") and its behavior (per run) differ. A fix either counts per file, matching the
  reference, or rewrites the reference bullet to the per-run count.
- **`extender`.** Found by the add-cairn page plan's resolution revision on 2026-10-03
  (`f:vpieos`, `f:w78j1b`). Two bullets in `docs/internal/facts/extend.md` give opposite reasons
  for the one-line form of `GITHUB_APP_PRIVATE_KEY_B64`. `f:vpieos` (`[verified]`) says the engine
  decodes the secret with `atob()` before signing, "so a multi-line encoding will not parse", a
  causal clause its source does not state: `src/lib/env.ts:31` documents the form ("base64 of the
  PEM on one line, decoded with `atob()` before signing") and `src/lib/github/signing.ts:67,132`
  show the decode, neither a rejection of a wrapped value. `f:w78j1b` (`[rejected]`) records a
  workerd run from 2026-09-29 in which `atob()` ignored ASCII whitespace and a two-line value
  decoded to the same bytes as one line, and `pemToPkcs8` strips whitespace from the decoded PEM
  as well (`src/lib/github/signing.ts:42-43`). The tutorial therefore states the documented form,
  keeps `tr -d '\n'` as the step that produces it, and gives no reason, since the only reason on
  record is the one the container rejects. A fix retraces `f:vpieos` against the workerd run and
  either narrows it to the documented form, tagging its causal clause `[docs-drift]`, or finds the
  decode path that rejects whitespace and cites it.
- **`contributor`.** Found by the add-cairn resolution redraft on 2026-10-03 (the register editor's
  round-2 blocking finding at `docs/extend/add-cairn-to-a-sveltekit-app.md:792, 882, 887, 1055`).
  The brief's code-font rule wants the running example's repository name, `field-notes`, in code
  font where the reader types it, and the page plan's drafting constraint extends that to every
  prose mention. `check:provenance` reads a code span holding one hyphenated identifier as a name
  fact (`scripts/checks/check-provenance.mjs`, `codeSpanFacts` and `NAME_RE`), so every sentence
  carrying `` `field-notes` `` must cite a fact bullet containing the string, and no bullet does,
  since the name is the page's own invention; a `no-claim` sentence fails on it too. The gate
  leaves a page-defined identifier no citable form in prose. The page therefore puts the typed name
  in a fenced block, where the gate does not read, and names the repository elsewhere as "the
  site's repository". A fix teaches the gate a page-scoped allowlist of running-example names (the
  plan already lists them), or exempts a name the page's own fenced blocks define.
- **`extender`.** Found by the architecture page's fact read on 2026-10-03 (`f:0gihxq`,
  `docs/extend/architecture.md`, Concurrent writes). The personal-dictionary add commit
  (`src/lib/sveltekit/content-routes-dictionary.ts:67,133-148`) omits `expectedHead`, so it takes
  the head-merge retry, and its action then catches a conflict and re-merges and commits once more,
  a third concurrency behavior beside the plain retry and the head guard. `f:0gihxq` lists neither
  the dictionary commit nor the extra caller retry, so the page's list of commits under each rule is
  short one commit. A fix either adds the dictionary commit to `f:0gihxq` with its caller retry, or
  drops the caller retry so the commit keeps the one shared rule.

- **`extender`.** Found by the add-cairn final reader re-test on 2026-10-03
  (`docs/extend/add-cairn-to-a-sveltekit-app.md`, Add a second post; engine 0.98.0). The
  manifest-drift build error, thrown by `verifyManifest` (`src/lib/content/manifest.ts:373-377`),
  ends "Regenerate it (npm run cairn:manifest) and commit the result.", but a hand-built site
  defines no `cairn:manifest` script; the tutorial writes the manifest with `npx cairn-manifest`,
  the package's `bin` (`package.json:199`). A reader who follows the error's own instruction gets
  npm's missing-script error. A fix either names `npx cairn-manifest` in the message, which every
  site can run, or the docs tell a hand-built site to add the script.

- **`extender`.** Found by the theme-your-public-site reader re-test on 2026-10-03
  (`docs/extend/theme-your-public-site.md`; engine 0.98.0). The Waymark template's
  `src/theme/theme.css` header comment (line 66) names the `check:public-tokens` CI gate as proof
  the re-skinned theme still clears AA, but a scaffolded `package.json` carries no such script, and
  the page states that correctly, so the comment contradicts it. A template fix, emitted from
  `examples/showcase`: reword the comment to say the engine repo's gate checks the shipped theme, or
  drop the claim from the scaffold.

- **`extender`.** Found by the scaffolded-site-files page inputs on 2026-10-07
  (`docs/extend/scaffolded-site-files.md`; engine 0.98.0). The baked scaffold keeps showcase-only
  config the template's exclude list does not reach (`f:n2skkz`): `templates/waymark/vite.config.ts:91-95`
  explains `resolve.dedupe` and `server.fs.allow: ['..', '../..']` as serving "the showcase['s]
  file:../.. dist symlink", which a registry-installed site has no use for; `:65-72` says "This
  showcase's own corpus"; `:26-29` reads `VITE_CAIRN_E2E` for an e2e run the bake pruned; and
  `templates/waymark/package.json:23-24` globs `e2e/**/*.ts` in `format` and `format:check` with no
  `e2e/` in the tree. A page that annotates `vite.config.ts` for a new owner has to hedge which of
  its lines belong to the site. A fix strips or rewrites those lines at bake time
  (`packages/create-cairn-site/scripts/bake-template.mjs`), or reframes the comments so they hold in
  both trees.

- **`contributor`.** Found by the scaffolded-site-files page inputs on 2026-10-07 (a facts-container
  hole). Five verified scaffold facts cite stale pointers the gate does not catch: `f:mrv24k`
  (`templates/waymark/package.json:16`, now line 21), `f:666eg6` (`:7,10,15`, now 12, 15, 20), and
  `f:690k0p` (`:12,18-20`, now 17, 23-25) predate the `imports` field that shifted the scripts block,
  and `f:j7fha2` and `f:jd54ph` cite `packages/create-cairn-site/template/`, a directory that no
  longer exists (the baked tree is `templates/waymark/`), which `check:facts` skips as a dropped
  directory. The claims still hold against `templates/waymark/`. A fix repoints the five sources,
  and an unanchored `path:line` pointer into `package.json` could carry a quoted anchor so the
  gate's window check catches the next shift.

- **`extender`.** Found by the restrict-admin-access page inputs on 2026-10-07 (`f:cvzb8z`,
  `f:iwf4nu`). One access map has two wiring points that nothing checks agree: the engine's screens,
  write actions, and sidebar read the adapter's `access` (`src/lib/content/compose.ts:41`,
  `src/lib/sveltekit/content-routes-media-library.ts:67`), while `requireAccess` and
  `createSectionAction` read the guard's `locals.cairnAccess` (`src/lib/sveltekit/guard.ts:479`,
  `src/lib/sveltekit/section-action.ts:275`). The scaffold passes its map only to the guard
  (`templates/waymark/src/hooks.server.ts:22`) and its `src/access.ts` comment calls that map the
  site's whole access declaration, so a developer who adds `media: ['owner']` there sees no effect
  on the media screen, with no error and no warning. Roles have the matching check
  (`auth.role-wiring-missing`, `src/lib/diagnostics/conditions.ts:168-176`); the access map has
  none. A fix has the guard read the adapter's map, or adds an `auth.access-wiring-missing`
  condition beside the roles one. Extended by `docs/extend/restrict-admin-access.md` (the 2a
  unattended run, R5, 2026-10-07, the page's round-2 fact read): the stock scaffold already ships
  the split. Its adapter's `navLayout` lists Signups
  (`templates/waymark/src/theme/cairn.config.ts:214`), and the sidebar resolves that entry against
  the adapter's map (`src/lib/sveltekit/content-routes-shell.ts:187`), which the scaffold never
  sets, so every editor sees Signups. The route admits only owners through the guard's map
  (`templates/waymark/src/hooks.server.ts:20,22`, `templates/waymark/src/access.ts:22-24`). The
  `src/access.ts` comment (`:3-5`) names both hook branches and never the adapter. Promote with this
  entry to `ROADMAP.md`.

- **`extender`.** Found by the add-a-second-sign-in-group page inputs on 2026-10-07 (`f:fcqs22`,
  `f:tnvu0a`, `f:l2xruc`, `f:0l7si2`). `createChannelDb` is the documented double for a site's
  channel tests, but nothing in the tree wires it into `createAuthChannel`: the factory resolves
  its binding as `config.resolveDb(siteEnv())`, read from `cloudflare:workers`
  (`src/lib/sveltekit/workers-env.ts:12,35-37`), a module a plain Node vitest run does not provide,
  and the engine's own channel tests run on miniflare D1 through `cloudflare:test`
  (`src/tests/integration/auth-channel-session.test.ts:4`). Since the showcase moved to local D1 the
  double has no in-repo consumer (`docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md:130`),
  so the page can state its contract and its Node-only limit but cannot show a verified recipe
  that drives a channel action against it. The Node floor also needs a hedge: the dev package
  declares `engines.node` `>=24` (`packages/cairn-cms-dev/package.json:12-14`) while `node:sqlite`
  works from 22.13, and neither floor is enforced at runtime. A fix ships a tested exemplar
  (a channel test under vitest on Node that stubs `cloudflare:workers` and resolves `createChannelDb`
  through `resolveDb`), or retires the double in favor of miniflare D1 and says so.
- **`extender`.** Found by the add-a-second-sign-in-group page inputs on 2026-10-07 (`f:ybg62t`,
  `f:hafpqf`). Two public configs share the option name `rateLimit` with different shapes:
  `AuthChannelConfig.rateLimit.key` is optional, takes a `CairnEvent`, and defaults to the requester
  bucket (`src/lib/auth-channel/factory.ts:320-325`), while `SectionActionConfig.rateLimit.key` is
  required and takes an `AdminActionContext`, beside a `message` member the channel lacks
  (`src/lib/sveltekit/section-action.ts:42-46`). A developer who wires both on one site meets the
  same name with two contracts, and each page has to state its own shape rather than point at one.
  A fix aligns the two (an optional `key` with a documented default in both), or the reference
  names the difference beside each entry.
- **`extender`.** Found by the add-a-second-sign-in-group page inputs on 2026-10-07 (`f:mfmmof`,
  `f:lncjdr`). A channel's member area lives outside `/admin`, and no admin-toolkit component reads
  an editor session, so the toolkit looks reusable there, but its daisyUI classes compile into
  `cairn-admin.css`, scoped under the admin `data-theme` root, and only `CairnAdminShell` imports
  that sheet (`src/lib/admin/CairnAdminShell.svelte:43`, `scripts/build/admin-css.input.css:1-3`).
  Outside the shell the components render unstyled unless the site's own stylesheet supplies the
  classes. The page can only hedge on building the member area from the toolkit. A fix either
  documents the toolkit as admin-shell-only or ships a stylesheet a site can import for it.
- **`extender`.** Found by the restrict-admin-access page plan on 2026-10-07 (`f:iwf4nu`,
  `f:2zytgf`). The reference snippets that declare the role vocabulary import `roles` from the
  adapter module: `docs/reference/core.md:1015-1017` (the `defineAccess` example's
  `src/lib/cairn.access.ts` imports it from `#theme/cairn.config.js`) and
  `docs/reference/sveltekit.md:131` (the `createAuthGuard` example). The same `defineAccess` entry
  then says to pass the map to the adapter's `access` member (`docs/reference/core.md:1026`). An
  adapter module that imports the map from a module that imports the adapter forms an import
  cycle, which throws at module evaluation (`Cannot access 'roles' before initialization`,
  reproduced with two plain ES modules under Node). The scaffold avoids it only because its
  adapter carries no map (`templates/waymark/src/theme/cairn.config.ts`). The page plan declares
  both in `src/access.ts`, which the adapter and the hooks both import. A fix moves the reference
  snippets to that layout, or has the engine read one declaration (see the two-wiring-points entry
  above).
- **`contributor`.** Found by the restrict-admin-access page plan on 2026-10-07 (a facts-container
  conflict, `f:lmtfkt`, `f:uhoyun`). `f:lmtfkt` says a detail endpoint nested under a gated
  `/admin` page needs "its own access-map entry", while `f:uhoyun` says a route key governs every
  path beneath it by deepest path-segment prefix. The code bears out `f:uhoyun`: `matchHrefKey`
  (`src/lib/auth/access.ts:107`) matches the route id `/admin/signups/[id]` against a key
  `/admin/signups` unless the map holds a deeper key. `docs/extend/add-a-custom-admin-screen.md:447`
  carries `f:lmtfkt`'s wording as a required step. The nested route does need its own
  `requireAccess` call, but the separate entry is optional, and a deeper literal key under the
  screen's key would instead make a dynamic sibling route refuse every session (`f:8anql1`). A fix
  narrows `f:lmtfkt` to the `requireAccess` call and rewords that step.
- **`extender`.** Found by the restrict-admin-access page plan on 2026-10-07 (`f:8anql1`,
  `f:uhoyun`). Adding a deeper route key turns a route with a dynamic or rest parameter under the
  shallower key into a refusal for every session, owner included (`src/lib/auth/access.ts:107-130`,
  `matchHrefKey`). The site sees the change only as 403s at request time, since composition never
  sees the site's route ids. The reference entries a developer reads for keys omit the case:
  `docs/reference/sveltekit.md:388` says a parameterized route id resolves verbatim "so a map keyed
  by its prefix still matches", and `docs/reference/core.md:1048` describes deepest-prefix matching
  without the refusal. Only the `createSectionAction` entry asks a rest-parameter route to declare
  `target`. The page has to carry the caveat itself. A fix adds the refusal to both entries.
- **`extender`.** Found by the restrict-admin-access page plan's revision on 2026-10-07 (a
  facts-container hole, `f:qca0t0`, `f:9ug9mo`, `f:jtl15v`). An extend page whose checks run on the
  deployed site needs a step that redeploys a scaffolded site, and neither the extend track nor the
  facts container gives one. The Workers Builds connection is optional at setup
  (`packages/create-cairn-site/src/cloudflare/catalogue.mjs:706-715`, the declined path), so a
  scaffolded site redeploys either by a push to the default branch (`f:qca0t0`) or by `npm run
  build` and `npx wrangler deploy` from the site's directory, the same two commands the trigger
  runs (`packages/create-cairn-site/src/cloudflare/chapter3.mjs:88-91`). The page has to hedge
  between the two. It assembles them from an admin-track fact, a vendor fact (`f:9ug9mo`), and the
  hand-built tutorial's "Deploy a change" exercise
  (`docs/extend/add-cairn-to-a-sveltekit-app.md:169-186`). A fix adds a fact for a scaffolded
  site's two redeploy paths and gives the extend track one linkable redeploy section.
- **`extender`.** Found by the scaffolded-site-files page plan on 2026-10-07 (`f:4ax489`,
  `f:jd54ph`). A fresh scaffold's `npx cairn-guidance check` prints `.claude/ is not excluded from
  the Tailwind build; add @source not "./.claude";`, and the scaffold's CI workflow prints the same
  line on every push (run against `templates/waymark/` at engine 0.98.0). The line is a false
  positive. `judgeSourceExclusion` reads only `src/admin.css` or `src/theme/admin.css` and matches
  the literal `@source not "./.claude";` (`src/lib/guidance/check.ts:21,26,73-88`), while the
  scaffold's `src/admin.css` imports Tailwind's utilities with `source(none)` and names its sources
  explicitly (`templates/waymark/src/admin.css:3-5`), and the public build already excludes the
  tree with `@source not "../../.claude"` (`templates/waymark/src/chassis/tokens.css:55`). The
  suggested line would also resolve to `src/.claude` inside `src/admin.css`. No fact states the
  false positive, so the page cannot tell a new owner the line is safe to ignore. A fix teaches the
  check to accept `source(none)` or a sheet-relative path, or has the bake write a line the check
  accepts.
- **`extender`.** Found by the scaffolded-site-files page plan on 2026-10-07 (`f:dy5cfj`,
  `f:4ax489`). Two writers stamp `.claude/cairn/VERSION` differently: the bake writes the
  caret-stripped engine spec (`packages/create-cairn-site/scripts/bake-template.mjs:213`), and
  `cairn-guidance install` writes the installed package's version
  (`src/lib/guidance/install.ts:52,208`). `cairn-guidance check` judges freshness by one hash over
  the whole flattened tree, `VERSION` included (`src/lib/guidance/install.ts:191-210`,
  `src/lib/guidance/check.ts:49-56`), so a scaffold whose `npm install` resolves the caret range
  above its floor reads as stale on its first check even when no skill file changed, and `--strict`
  would fail it. `docs/reference/guidance.md:28` says `VERSION` is "stamped from the installed
  package's own version", which a baked tree's stamp is not. A fix hashes the tree without
  `VERSION`, or leaves the stamp to the first install.
- **`contributor`.** Found by the scaffolded-site-files page plan on 2026-10-07 (`f:3m0oxs`), a
  hole in `docs/internal/facts/`. `f:3m0oxs` says the setup command saves its progress, the pasted
  Cloudflare token included, in `~/.config/cairn/sites/<id>.json`, but the command deletes the
  saved token at each terminal outcome: chapter 2 at its terminal steps
  (`packages/create-cairn-site/src/cloudflare/chapter2.mjs:21-26,131-151`), chapter 3 at
  `builds-live`, `builds-connect-declined`, and the `--yes` reconcile park
  (`packages/create-cairn-site/src/cloudflare/chapter3.mjs:17-29`), and `retireSite` scrubs it from
  a retired record (`packages/create-cairn-site/src/state.mjs:162-191`). A page that states the
  fact alone implies a finished run leaves a live token on disk, so the plan has the page make no
  claim about how long the token stays. A fix extends `f:3m0oxs` with the deletion, so the page can
  say a completed run leaves no token in the file.
- **`contributor`.** Found by the scaffolded-site-files page plan on 2026-10-07 (`f:jd54ph`,
  `f:4ax489`). `f:jd54ph` gives the workflow's `continue-on-error: true` as the reason a stale or
  missing guidance tree surfaces without failing the build, but `cairn-guidance check` already
  exits 0 on a stale or missing tree without `--strict` (`f:4ax489`), and the workflow's own comment
  says `continue-on-error` covers only a crash or a resolution failure
  (`templates/waymark/.github/workflows/check.yml:23-24`). The plan has the page give the default
  exit code as the reason. A fix rewords the fact's causal clause, together with the stale source
  the page-inputs entry above names.
- **`extender`.** Found by the scaffolded-site-files page plan on 2026-10-07 (`f:n2skkz`,
  `f:38pjqy`, `f:gj96px`, `f:paotzb`). Beyond the `vite.config.ts` and `package.json` lines the
  page-inputs entry above names, more scaffold comments describe the showcase the bake pruned.
  `templates/waymark/src/chassis/archive.ts:7-9` says the page size is set so "this site's own
  corpus crosses one page boundary", but the scaffold seeds 14 posts, a lead plus one full page of
  13, so a new site has no `/archive/2`. `templates/waymark/src/routes/+layout.server.ts:3-5,13-14`
  names `/members/**` routes the scaffold lacks. `templates/waymark/src/hooks.server.ts:14` cites an
  e2e workflow and `templates/waymark/src/routes/healthz/+server.ts:4-5` an E2E assertion, and
  neither ships. `templates/waymark/.gitignore:10-11` ignores Playwright output. A new owner reading
  these files meets claims the page cannot confirm or correct without a fact for each. A fix extends
  the page-inputs entry's bake-time strip or reframe to these files.
- **`extender`.** Found by the scaffolded-site-files page plan on 2026-10-07 (`f:paotzb`). The
  scaffold's `/healthz` answers 200 whether its check passes or fails
  (`templates/waymark/src/routes/healthz/+server.ts:4-5,14-20`), so an uptime monitor that reads
  only the status code reports a site with a broken App key as healthy; only the body's `ok` field
  carries the verdict. The route's comment justifies the 200 by an E2E assertion the scaffold does
  not ship. The page states that `ok` carries the verdict. A fix answers 503 when `ok` is false and
  keeps the JSON body, which still tells an operator a missing key from a crash.
- **`extender`.** Found by the add-a-second-sign-in-group page plan on 2026-10-07 (`f:p1xmp5`,
  `f:8anql1`, `f:xbjxit`, `f:altcjp`, `f:bvfs3e`, `f:pvs115`, `f:16paho`). A `none`-capability
  role's own screen cannot use the access map, the gate `docs/extend/add-a-custom-admin-screen.md`
  teaches for every custom screen: `canReach` refuses every `none` session before it reads the map
  (`src/lib/auth/access.ts:157-159`), so `requireAccess` (`src/lib/sveltekit/guard.ts:476-485`) and
  `createSectionAction` 403 the role the screen exists for, and a map rule for the screen's href
  hides its sidebar link from that role (`src/lib/sveltekit/admin-nav.ts:477-480`). Meanwhile
  `RoleDeclaration.home` sends the role there and a `navLayout` entry's `roles` admits it. Two
  seams admit the role and the documented gate refuses it, and `f:bvfs3e`'s "denied via the access
  map" cannot hold for a `none` role. The page has the screen call `requireSession` and check the
  role by hand, use `createAdminAction` with no `access` option, and keep the href out of the map.
  A fix lets an access-map rule admit a named `none` role on a site route, or documents the
  hand-rolled role check as the `none` role's gate on the reference entries for `requireAccess` and
  `defineAccess`.
- **`extender`.** Found by the add-a-second-sign-in-group page plan on 2026-10-07 (`f:rn62i1`,
  `f:hwffph`, `f:hcjb3o`). A role vocabulary beyond owner and editor depends on `0001_roles.sql`,
  and nothing checks it. On a database without the migration, `/admin/editors` offers the declared
  role, `editorAddAction` validates it against the vocabulary
  (`src/lib/sveltekit/editors-routes.ts:93-108`), and `insertEditor`
  (`src/lib/auth/store.ts:263-273`) meets `0000_auth.sql`'s `CHECK (role IN ('owner', 'editor'))`
  (`migrations/0000_auth.sql:5`) as an unhandled D1 error, with no condition id and no named
  remedy. `auth.role-wiring-missing` checks that the guard received the vocabulary, but no check
  pairs a declared vocabulary with the migration. The page puts the migration beside the add step
  and gives the failure a check without naming its shape. A fix catches the constraint failure
  and answers `fail(400)` naming the migration, or adds a `cairn doctor` condition beside
  `auth.role-wiring-missing`.
- **`extender`.** Found by the add-a-second-sign-in-group page plan's revision on 2026-10-07
  (`f:69xbyh`, `f:vo4m61`, `f:86h9o6`). A channel whose Turnstile secret is unset answers every
  code request `challenge-required`, and nothing names the missing secret. The reference's worked
  `challenge` passes `env.TURNSTILE_SECRET ?? ''` (`docs/reference/auth-channel.md:66`),
  construction checks only that `challenge` is a function (`src/lib/auth-channel/factory.ts:560`),
  and no `cairn doctor` condition reads a channel's secret. The one record is
  `turnstile.verify_failed` with `reason: 'invalid_input'` and the token's length, the reason a
  blank token also logs (`src/lib/cloudflare/turnstile.ts:92-104`), so a missing secret reads like
  a form that never posted the widget's token. The factory's own TSDoc example adds a third shape,
  `challenge: verifyTurnstile` (`src/lib/auth-channel/factory.ts:547`), whose `(token, secret)`
  parameters cannot take the `(event, form)` a `challenge` receives. The page's failure check has
  to name both the secret and the token field, and its two secret steps (`.dev.vars` for
  `wrangler dev`, a Worker secret for the deployed site) rest on a name only the sample fixes. A
  fix gives the blank-secret refusal its own reason, such as `missing_secret`, and corrects the
  TSDoc example to wrap `verifyTurnstile` the way the reference does.
- **`extender`.** Found by the rotate-the-github-app-key page inputs on 2026-10-07 (`f:5dwnh1`,
  `f:jjava3`, `f:vg42j3`, `f:ejuoh6`, `f:bffsa9`). No single signal confirms that GitHub accepts a
  rotated key before the old one is deleted. `/healthz`'s signing self-test makes no network call
  (`src/lib/github/signing.ts:130-138`), so a parseable key from the wrong App, or a key already
  deleted on GitHub, reports `ok: true`. A real publish, the runbook's confirm step, can succeed
  on an installation token a warm isolate minted before the swap and cached for 55 minutes
  (`src/lib/github/signing.ts:105-121`). A refused mint on the save path is an unhandled error
  rather than a `commit.failed` record (`f:bffsa9`'s rejection); the one named record is
  `github.unreachable` with `scope: 'shell'` from the admin shell's best-effort read
  (`src/lib/sveltekit/content-routes-shell.ts:158-176`). The page states what each signal proves
  and has the reader wait out the cache window before deleting the old key. A fix gives `/healthz` an opt-in live check that mints an installation
  token from the current secret without caching it.
- **`extender`.** Found by the rotate-the-github-app-key page plan on 2026-10-07 (`f:olofdb`,
  `f:z97ilc`, `f:dbue4k`, `f:97fxdx`). Putting a `.pem` into `GITHUB_APP_PRIVATE_KEY_B64` takes a
  platform matrix. The page carries a Node form for Linux and macOS, `base64 -w 0` for Linux only
  (BSD `base64` on a Mac rejects `-w`, per `f:97fxdx`'s rejection), and `[Convert]::ToBase64String`
  for PowerShell, whose `Out-File` route writes UTF-16LE under Windows PowerShell 5.1.
  `docs/extend/add-cairn-to-a-sveltekit-app.md:934` uses a fourth form,
  `base64 < <file> | tr -d '\n'`. No fact verifies the Windows leg end to end: `f:dbue4k` covers
  only `Out-File`'s default encoding, so the page's PowerShell pipe into `npx wrangler secret put`
  rests on no fact. The setup command already owns a tested encode-and-push,
  `movePemToWorkerSecret` (`packages/create-cairn-site/src/cloudflare/secret.mjs:23-48`), but it
  reads the key only from its own state. A fix exposes that step as a command that takes a `.pem`
  path, so both pages give one cross-platform command; short of that, a verified Windows run
  lands in the facts container as a bullet.
- **`extender`.** Found by the rotate-the-github-app-key page plan on 2026-10-07 (`f:sszb7b`,
  `f:72yc97`, `f:ejuoh6`). The rollback before deletion re-pushes the old key's base64, which only
  a developer who kept the old `.pem` holds. A site the setup command created never had a key file
  on disk: the App manifest flow returns the PEM into the setup command's state
  (`packages/create-cairn-site/src/github/manifest.mjs:213`), `movePemToWorkerSecret` clears that
  copy once the secret is written (`packages/create-cairn-site/src/cloudflare/secret.mjs:42`), and
  Cloudflare hides a secret's value after it is set
  (https://developers.cloudflare.com/workers/configuration/secrets/). On such a site the rollback
  is unavailable and the recovery is a third key, so the page states the rollback as conditional
  on a kept copy. The same step's closing message tells the developer to regenerate a lost key
  and "re-run this step" (`secret.mjs:43-46`), but with no PEM in state the step logs that the key
  is already a Worker secret and returns (`secret.mjs:25-28`), so a re-run cannot take a
  regenerated key. A fix points the message at the rotation page, or gives the step a `.pem` input
  (the entry above).
- **`extender`.** Found by the rotate-the-github-app-key page plan on 2026-10-07 (`f:9xqudi`,
  `f:nls26c`). The App id and the installation id have two names. The engine reads both only from
  the adapter's `createGithubApp({ appId, installationId })` (`src/lib/github/backend.ts:162`), but
  the `github.app-unreachable` remediation says to check `GITHUB_APP_ID` and
  `GITHUB_APP_INSTALLATION_ID` (`src/lib/diagnostics/conditions.ts:198`), and the scaffold's
  `templates/waymark/.dev.vars.example:7-8` declares them as variables. No engine or scaffold code
  reads either name, so a developer following the remediation after a failed rotation checks two
  values that change nothing. A fix drops both names from the remediation and the example file and
  names the adapter's `createGithubApp` values instead.
- **`extender`.** Found by the rotate-the-github-app-key page plan on 2026-10-07 (`f:5dwnh1`,
  `f:paotzb`, `f:ixr3ny`). No signal says which key the Worker holds. `/healthz` signs with
  whatever key `GITHUB_APP_PRIVATE_KEY_B64` carries (`src/lib/sveltekit/health.ts:24-31`), and the
  old key keeps signing until it is deleted, so a push that reached a different Worker leaves every
  check on the page passing on the old key; deleting the old key then stops publishing with no
  rollback left. The page can only have the reader push from the site's directory. A fix has the
  signing self-test report a fingerprint of the configured key's public half, which discloses
  nothing secret, for the reader to compare with the key list on GitHub (confirm that GitHub shows
  a fingerprint per key before building on it).
- **`extender`.** Found by the rotate-the-github-app-key page plan's structural-edit revision on
  2026-10-07 (`f:ejuoh6`, `f:9sk0at`, `f:7u49xs`). The rotation's confirming publish has to ship a
  content edit. Publish acts only on an unsaved edit, a held draft branch, or a new entry
  (`src/lib/admin/EditPage.svelte:198`, `publishActionable`), so on a site with nothing pending
  the reader changes a line of real content and publishes it, a commit on the default branch, to
  test a credential. The reads that reach GitHub with no content change are the admin's
  best-effort reads, and they prove acceptance only by the absence of a `github.unreachable`
  record (`src/lib/sveltekit/content-routes-shell.ts:158-176`). The facts container has no bullet
  for the Publish guard, so the page can tell the reader to make the edit but not why. A fix is
  the opt-in live check the page-inputs entry above proposes, which makes the publish
  unnecessary; short of it, a container bullet for `publishActionable` lets the page give the
  reason.
- **`extender`.** Found by the scaffolded-site-files framing step on 2026-10-07 (`f:kouawx`,
  `f:0ygumq`). Nothing the setup command prints or writes points a new owner at the page that maps
  its tree. The hand-over text names `.github/workflows/check.yml`, `.claude/`, and
  `npx cairn-guidance check` and links no documentation page
  (`packages/create-cairn-site/src/scaffold.mjs:230-264`). The baked `README.md` links only the
  engine's GitHub repository (`packages/create-cairn-site/scripts/bake-template.mjs:31-34`). The
  guidance fragment's "Where the docs are" names only the reference index
  (`templates/waymark/.claude/cairn/CLAUDE.md:79-81`), though the package's `files` list ships the
  extend arm (`package.json:204,216`). A developer who ran the command, or who took over its site,
  reaches the file map only by search or by browsing the docs, so the page's framing cannot count
  the command's output as an arrival path. A fix adds one line to the baked README and the
  hand-over naming the page, at its installed path
  `node_modules/@glw907/cairn-cms/docs/extend/scaffolded-site-files.md` or its cairn.pub URL, and
  can ride the hand-over rewrite `ROADMAP.md` already carries (first-run defect 4).
- **`contributor`.** Found by the scaffolded-site-files page draft on 2026-10-07 (a facts-container
  hole; `f:qlgggh`, `f:qnf469`, `f:n7t4bn`). Three scaffold entries a new owner meets have a fact
  that names them and none that states their role: `src/theme/theme-names.ts` (named in `f:qnf469`
  and `f:qlgggh`), `src/lib/log.ts` (named in `f:qlgggh`), and the `PUBLIC_ORIGIN` variable in
  `wrangler.jsonc` (named in `f:n7t4bn`, whose source shows the template value
  `http://localhost:4173`, with no fact on what reads it or whether the setup command rewrites it).
  The page lists `theme-names.ts` bare, collapses `src/lib/` to one tree line, and calls
  `PUBLIC_ORIGIN` only "a plain variable". A fix files one verified fact per entry, traced to its
  readers in `templates/waymark/` and to `packages/create-cairn-site/src/substitute.mjs` for the
  origin, so the page can say what each does and whether the owner changes it.
- **`extender`.** Found by the add-a-second-sign-in-group framing step on 2026-10-07 (`f:qqy4uq`,
  `f:nz890r`, `f:b3l3t0`). The people a channel signs in carry three names. The engine's TSDoc
  (`src/lib/auth-channel/factory.ts:1,531`, `src/lib/auth-crypto/index.ts:2`), the reference
  (`docs/reference/auth-channel.md:3,10,31,74`, `docs/reference/README.md:52-53`,
  `docs/reference/auth-crypto.md:15,18`), the scaffold's guidance
  (`templates/waymark/.claude/cairn/CLAUDE.md:26`,
  `templates/waymark/.claude/skills/cairn-extend/SKILL.md:33,43`), and the extend outline's
  glossary entry for "auth channel" say "second audience". The extend page for the task is titled
  "Add a second sign-in group", `docs/extend/replace-magic-links-with-cloudflare-access.md:34` says
  "a second population", and `docs/extend/security-model.md:257` says "a second sign-in audience".
  The terms also differ in reach: the reference's "second audience" means a channel's people only,
  while the restrict-admin-access page plan uses it for a `none`-capability role
  (`docs/internal/briefs/extend/restrict-admin-access.plan.md:206-207`). A reader who follows a
  reference link to the page meets a new name for the same people, and the page's introduction has
  to pick one. A fix sanctions one term in the "Names" section of `docs/internal/docs-register.md`
  and brings the reference ledes, the TSDoc, and the guidance to it.
- **`extender`.** Found by the add-a-second-sign-in-group framing step on 2026-10-07 (`f:b3l3t0`,
  `f:4673n6`, `f:p1xmp5`). The scaffold's guidance offers a second group only the channel. The
  `cairn-extend` skill's router (`templates/waymark/.claude/skills/cairn-extend/SKILL.md:29-33`)
  has a row for "A second audience's own login channel" and none for a declared `none`-capability
  role with a `home`, and its custom-screen row prescribes `createSectionAction` and
  `requireAccess`, which refuse every `none` session (the gate mismatch an earlier entry from this
  page's plan records). That row, the channel row, and the guidance fragment's channel line
  (`templates/waymark/.claude/cairn/CLAUDE.md:26-27`) all point at reference pages, so a scaffolded
  site's developer and its agent reach `createAuthChannel` without meeting the choice between the
  two mechanisms, and the page's framing cannot count the guidance as an arrival path. A fix adds a
  router row for a role that signs in to its own `/admin` screen and points both second-group rows
  at `node_modules/@glw907/cairn-cms/docs/extend/add-a-second-sign-in-group.md`, which the
  package's `files` list ships (`package.json:216`), once the page lands.
- **`extender`.** Found by the rotate-the-github-app-key framing step on 2026-10-07 (`f:s90j7l`,
  `f:ixr3ny`, `f:ejuoh6`, `f:vg42j3`, `f:72yc97`). A rotation after a suspected compromise keeps
  the exposed key valid for at least 55 minutes. GitHub names a compromise as the occasion for the
  two-key order (`f:s90j7l`), and the old key signs for anyone who holds it until it is deleted
  (`f:ixr3ny`). The page deletes it only after a publish confirms the new key (`f:ejuoh6`), and
  that publish proves nothing until the per-isolate token cache has turned over
  (`src/lib/github/signing.ts:105-121`). A reader rotating an exposed key therefore leaves it live
  through the cache window and the checks, and the page offers no shorter order, since deleting
  first risks an outage with no rollback; on a site the setup command created the rollback is
  already gone (`f:72yc97`). The introduction can only name the trade. A fix is the opt-in live
  check the page-inputs entry above proposes, which confirms GitHub's acceptance at once and lets
  the old key go minutes after the push.
- **`extender`.** Found by the rotate-the-github-app-key redraft on 2026-10-07 (`f:vg42j3`,
  `f:86h9o6`). The container cannot say whether a warm isolate survives `wrangler secret put`.
  The token cache is module-global per isolate (`src/lib/github/signing.ts:105-121`), and the
  secret write deploys a new Worker version (`f:86h9o6`), which normally runs in fresh isolates
  with an empty cache. No fact states whether an isolate of the old version keeps serving after
  the deploy, or for how long. The page's 55-minute wait and its "at least 55 minutes" exposure
  cost rest on `f:vg42j3` alone, as the plan's drafting constraints require, so they may
  overstate the window. A fix files a verified fact on isolate turnover at a version deploy, from
  Cloudflare's documentation or a recorded run, and the page restates the wait as that bound.
- **`contributor`.** Found by the add-a-second-sign-in-group draft on 2026-10-07. `check:snippets`
  never typechecks a fenced block nested under a list item. `FENCE_OPEN_RE` and `SKIP_RE` in
  `scripts/checks/check-snippets.mjs:58-60` anchor at column zero, and `extractBlocks`
  (`:218-235`) matches the raw line, so a step's indented ```` ```ts ```` fence, and the
  `snippet-check-skip` comment above it, are invisible to the gate. Every snippet a task guide puts
  inside a numbered step escapes the check that the extend track's success criterion rests on
  ("every documented snippet typechecks against the built package"); `docs/extend/add-cairn-to-a-sveltekit-app.md`'s
  step snippets are in the same state. The draft proved its five checked blocks by a temporary
  dedent, which passed. A fix trims the leading indentation before both matches and dedents the
  body by the fence's own indent.
- **`contributor`.** Found by the add-a-second-sign-in-group draft on 2026-10-07 (`f:0l7si2`).
  `check:symbols` reads `@glw907/cairn-cms-dev` as a `-dev` subpath of the engine. The import
  regex in `extractImportedIdentifiers` (`scripts/checks/check-symbols.mjs:290-292`) captures
  everything after `@glw907/cairn-cms` as the subpath, so `import { createChannelDb } from
  '@glw907/cairn-cms-dev'` resolves against a `-dev` entry the API surface snapshot never has and
  fails, though the dev package's `src/index.ts:8` exports the name. The draft allowlisted
  `export:createChannelDb` with the reason; the tutorial's `devBackendHandle` escapes only because
  it is a dynamic import. A fix requires the suffix to start with `/` and resolves a dev-package
  import against `packages/cairn-cms-dev/src/index.ts`.
- **`extender`.** Found by the add-a-second-sign-in-group draft on 2026-10-07 (`f:69xbyh`,
  `f:86h9o6`). No fact names the Turnstile secret's variable. The reference's worked example
  (`docs/reference/auth-channel.md`, `createAuthChannel`) reads `env.TURNSTILE_SECRET`, and the page
  stores and reads that name in three places, but no container bullet carries it, so the page's
  prose says "the name the module reads" and the name itself appears only inside code fences. A
  fix files a reference-tier fact for the worked example's `Env` (its `MEMBER_DB` and
  `TURNSTILE_SECRET` members) so a page can name the secret in prose.
- **`extender`.** Found by the add-a-second-sign-in-group fact read on 2026-10-07 (`f:0l7si2`).
  `createChannelDb` returns a `ChannelDb` that declares only `prepare` and `withSession`
  (`packages/cairn-cms-dev/src/channel-db.ts:26-29`), while `createAuthChannel`'s `resolveDb` must
  return a `D1Database` (`src/lib/auth-channel/factory.ts:232`). The double is the documented test
  stand-in for that exact binding, yet its type is not assignable to it, so the page's channel
  test puts it on the mocked env through `as unknown as D1Database`, a cast every site's test
  repeats. A fix types the double's return as a `D1Database`-compatible shape (or exports a typed
  helper that returns one), so the test needs no double cast.

- **`extender`.** Found by the debug-your-site page inputs on 2026-10-07 (`f:qdfs37`,
  `src/lib/content/fieldset.ts:458-471`). A field's `behavior.validate()` that throws is caught,
  logged as `content.field_behavior_failed`, and the field is treated as valid, so the save lands
  the very value the validator existed to refuse. The page has to warn that a buggy validator
  fails open. A fix fails the field (or the save) closed on a throw, keeping the warn record.

- **`extender`.** Found by the debug-your-site page inputs on 2026-10-07 (`f:vs9g9e`,
  `src/lib/vite/internal.ts#checkSiteFacts`). When the adapter throws while the build derives the
  site facts, `checkSiteFacts` returns `ok` with no record, so a stale `site-facts.json` passes
  silently and the page cannot name any signal a developer would see. The doc comment argues the
  manifest verify already gates an adapter that cannot load; a fix still emits one build-log
  warning on this degrade so the skipped comparison is visible.

- **`extender`.** Found by the debug-your-site page inputs on 2026-10-07 (`f:ogz5eu`,
  `f:swjwxb`, `f:o7mr6f`). `CAIRN_FIXED_TODAY` carries the engine's `CAIRN_` prefix, yet no engine
  code reads it: it is a site-authored testing recipe. Beside `CAIRN_DEV_BACKEND`, which the engine
  does read, the page must hedge that this one is the site's own name. Either give it a site-owned
  name in the recipe or ship the fixed-today reader as a narrow seam.

- **`extender`.** Found by the debug-your-site page plan on 2026-10-07 and corrected by
  `docs/extend/debug-your-site.md`'s fact read (the 2a unattended run, R5, 2026-10-07; `f:nup3og`,
  `f:u78zg6`). `admin.action.misconfigured` with `reason: 'access_map_not_attached'` is documented
  as "the guard never ran on this route": `docs/reference/sveltekit.md:825-827`,
  `docs/reference/log-events.md:80`, and the code comments at `src/lib/sveltekit/guard.ts:364-367`
  and `src/lib/sveltekit/section-action.ts:129-130`. `sveltekit.md:826` adds that only
  `createAuthGuard` may write `locals.cairnEditor` and `locals.cairnAccess`. Behind the guard the
  reason cannot fire: the guard sets both together (`guard.ts:363-368`), and a request with no
  editor stops at `createAdminAction`'s session check first
  (`src/lib/sveltekit/admin-action.ts:207-211`). It fires under `devBackendHandle` called without
  `access`, which mints `cairnEditor` and leaves `cairnAccess` undefined on purpose
  (`packages/cairn-cms-dev/src/handle.ts:64-75`). A fix rewords both reference rows and both
  comments to name a hook that sets the editor without the map, `devBackendHandle` without `access`
  first, with `devBackendHandle({ access })` as the fix. A route the guard never handles logs
  `admin.action.session_absent` and redirects to `/admin/login` instead, which reads as a lapsed
  session; a second fix lets the wrapper tell a missing guard from a lapsed session.

- **`extender`.** Found by the debug-your-site page plan on 2026-10-07 (`f:rkj7tn`, `f:mreycz`).
  The page has to tell a developer where a record appears under `vite dev` and `wrangler dev`,
  and it cannot. No container fact states it, and `docs/reference/log.md:14-15` says the sink a
  record reaches (`console` today) is not promised and may change. The page names only the
  deployed surfaces (Workers Logs, `wrangler tail`, `cairn logs`), so the development half of its
  job has no reading surface. A fix promises a local sink, or files a fact on where records
  surface in each development server and states the promise it rests on.

- **`extender`.** Found by the debug-your-site page plan on 2026-10-07 (`f:ogz5eu`, `f:o7mr6f`,
  `f:i8pbhc`, `f:f7tkkw`). The fixed-today recipe has two legs no fact verifies. `.dev.vars` is
  the local home for the pin (`f:o7mr6f`), but no fact states how a CI job hands
  `CAIRN_FIXED_TODAY` to the Worker env that `cloudflare:workers` reads; `f:f7tkkw`'s rejection
  names "the CI job's own environment" with no verified route into that env. A prerendered route
  that reads the pin also meets the `env` read that throws while the build prerenders
  (`f:i8pbhc`), so the reader must check `building` and fall back to the clock, and prerendered
  output stays unpinned. The page states the local home and the guard and says nothing about CI.
  A fix files a verified CI route, or ships the fixed-today reader as the narrow seam the entry
  above proposes, settling both legs in one place.

- **`extender`.** Found by the debug-your-site page plan on 2026-10-07. Sibling extend pages
  route recoveries to this page that its outline does not cover:
  `docs/extend/add-cairn-to-a-sveltekit-app.md:562` (the dev backend's other failures), `:792`
  (each content build failure), `:1106` (each production failure), and `:1214` (a sign-in email
  that does not arrive or keeps the engine's defaults), and
  `docs/extend/replace-magic-links-with-cloudflare-access.md:400` (a persisting `guard.refused`).
  The outline's own route for operator-facing symptoms, `docs/admin/troubleshooting.md`, sits in
  no committed outline, so `check:docs` (`scripts/checks/docs-links.mjs:14-16`) refuses a link to
  it. The `auth.access.refused` entry above is the same gap for one event. A fix rules, promise
  by promise, whether this page gains a row backed by facts or the sibling routes elsewhere, and
  links the admin troubleshooting page once its outline lands.

- **`contributor`.** Found by the debug-your-site page plan on 2026-10-07. The symptom-row
  anatomy in `docs/internal/docs-register.md` ("The page anatomies") names no closing section,
  though the same section's 2026-10-01 ruling says every page type ends with one for its type.
  The plan borrowed the task guide's see-also section, the nearest anatomy and the one whose
  failure paths route to this page. A fix names the symptom row's ending in the anatomy.

- **`contributor`.** Found by the debug-your-site page plan on 2026-10-07 (`f:wi766c`). The
  repo's `CLAUDE.md:271-272` says a log record "is safe to read and paste", while `cairn logs` prints
  "this output carries identifiers and is not safe to paste in public"
  (`tool/cmd/cairn/messages.go:155`) and `docs/reference/log.md` tells a reader to read any
  record before pasting it. Records carry an editor's email, so the tool and the reference are
  right. A fix narrows the `CLAUDE.md` sentence to what `f:wi766c` states.

Filed 2026-10-07 by stage 2a's R5 post-run step (the 2a unattended run, R5), each verified
against the tree at `bd78ad83` plus the R5 closes.

- **`extender`.** Found by `docs/extend/debug-your-site.md`'s fact read (the 2a unattended run, R5,
  2026-10-07). The add-cairn tutorial wires the dev backend as `handle = devBackendHandle();` with
  no `access` (`docs/extend/add-cairn-to-a-sveltekit-app.md:532`), so under the dev backend every
  `createSectionAction` call returns `fail(500)` with `access_map_not_attached`
  (`packages/cairn-cms-dev/src/handle.ts:64-75`). The scaffold passes `devBackendHandle({ access })`
  (`templates/waymark/src/hooks.server.ts:20`). The page belongs to stage 2a, and R6 carries the
  fix.
- **`contributor`.** Found by `docs/extend/restrict-admin-access.md`'s round-2 fact read (the 2a
  unattended run, R5, 2026-10-07). Two code comments say route enforcement and sidebar visibility
  cannot drift apart: `src/lib/auth/access.ts:3-4` and `src/lib/index.ts:21-23`.
  `docs/extend/security-model.md:288` says the same. They can: an unkeyed `navLayout` href stays
  visible while `requireAccess` refuses its route (`src/lib/sveltekit/admin-nav.ts:477-480`), and a
  map given to one reader gates only that one (see the two-wiring-points entry). R5 rewrote
  `f:vqh4a9` and `f:altcjp` to match. A fix narrows both comments; the security-model sentence is an
  R6 carry.
- **`editor`.** Found by `docs/extend/rotate-the-github-app-key.md`'s final reader (the 2a
  unattended run, R5, 2026-10-07; `f:ogokfy`). The admin's action wrapper turns an unexpected throw
  into `fail(500)` with a calm message that says the writing is kept
  (`src/lib/sveltekit/cairn-admin.ts:199-200,236-251`), but the edit form posts full-page with no
  `use:enhance` (`src/lib/admin/EditPage.svelte:199`). SvelteKit then reruns the page's load to
  render the failure, and when that load throws the same error (a refused GitHub App key), the
  editor gets a bare 500 error page and never sees the message. A fix enhances the edit form or
  catches the load's GitHub reads.
- **`extender`.** Found by `docs/extend/restrict-admin-access.md`'s final reader (the 2a unattended
  run, R5, 2026-10-07; `f:thnbyp`). The scaffold's signups screen renders its outcome region,
  `role="status"`, outside the remove dialog
  (`templates/waymark/src/routes/admin/signups/+page.svelte:92`), and the dialog opens modal
  (`:132-137`, `aria-modal="true"`). A refused remove leaves the dialog open, so the denial text
  lands behind the modal, where a screen reader may not announce it and a sighted editor cannot see
  it. A fix renders the refusal inside the dialog, or closes the dialog on any result.
- **`extender`.** Found by `docs/extend/debug-your-site.md` and
  `docs/extend/add-a-second-sign-in-group.md` re-tests (the 2a unattended run, R5, 2026-10-07;
  `f:pe4vuc`). The scaffold records its type generation as `wrangler types
  --env-file=.dev.vars.example --include-runtime=false`
  (`templates/waymark/worker-configuration.d.ts:2`), but no `package.json` script runs it
  (`templates/waymark/package.json`), so each page restates a command. The second-sign-in page says
  `npx wrangler types` (`docs/extend/add-a-second-sign-in-group.md:351-354`), which reads
  `.dev.vars` and writes runtime types into a file of about 616 KB. The debug page adds `--env-file
  .dev.vars.example` without `--include-runtime=false` (`docs/extend/debug-your-site.md:340`). A
  variable set only in `.dev.vars` is typed only when `--env-file` names a file that carries it. A
  fix adds a `types` script to the scaffold, and both pages run it (an R6 carry).
- **`extender`.** Found by `docs/extend/scaffolded-site-files.md`'s final reader (the 2a unattended
  run, R5, 2026-10-07). The scaffold's `src/lib/log.ts` still describes itself as the showcase's
  logger (`:1,7,10`) and declares `members.login.requested` (`:8`), an event from the members
  fixture the bake prunes (no `members` route under `templates/waymark/src/routes/`). A fix rewrites
  the comments for the scaffold in the bake and drops the event.
- **`extender`.** Found by `docs/extend/add-a-second-sign-in-group.md`'s close (the 2a unattended
  run, R5, 2026-10-07). The scaffold's admin catch-all exports `prerender = false` with the reason,
  that a site defaulting to prerender would bake a session-gated page
  (`templates/waymark/src/routes/admin/[...path]/+page.server.ts:5-7`), but its custom signups
  screen exports nothing (`templates/waymark/src/routes/admin/signups/+page.server.ts`), and
  `docs/extend/add-a-custom-admin-screen.md` never says whether a custom screen needs it. The
  second-sign-in page tells its member routes to export it. An open question for the custom-screen
  recipe: export it on every custom screen, or state why a screen needs none.
- **`extender`.** Found by `docs/extend/add-a-second-sign-in-group.md`'s plan and draft (the 2a
  unattended run, R5, 2026-10-07), three holes in `docs/internal/facts/`. No fact records that a
  channel action answers `unavailable` when `resolveDb` returns no binding or the schema check fails
  (`src/lib/auth-channel/factory.ts:231,624-640,685`), the likeliest first-run failure. No fact
  records that the example site's `challenge` is the CI stand-in `insecureTestChallenge`
  (`examples/showcase/src/members/channel.ts:31-41`). No fact states that a blank Turnstile secret
  logs `turnstile.verify_failed` with `reason: 'invalid_input'`, the same reason as a blank token
  (`src/lib/cloudflare/turnstile.ts:92-105`). The page's failure section omits all three. A fix
  files the three `[verified]` facts.
- **`contributor`.** Found across the R5 closes (the 2a unattended run, R5, 2026-10-07; rotate's
  `crossRegression`, restrict's round-2 seats). The register's sentence cap reads as a whole-item
  cap: `docs/internal/docs-register.md:90` says "A step, a list item, and each sentence in a task
  section stay under 26 words", and the overlay row at `:1041` says steps, list items, and task
  sections stay under 26 words. Google's rule is per sentence, and the R5 conductor ruled it so,
  with introduction and explanation sentences exempt. Page plans wrote 40-word Before-you-begin
  items, a structural rewrite on rotate ignored the cap and regressed it, and a dispatch that stated
  the cap too broadly drew three false blocking findings on restrict. A fix states "per sentence"
  and the exemption in both places and in the chain's plan and structural prompts.
- **`contributor`.** Found by `docs/extend/scaffolded-site-files.md`'s chain run (the 2a unattended
  run, R5, 2026-10-07). Section hand-offs have three owners who disagree. The page plan requires
  each hand-off as the last sentence of a section's final paragraph, "never a paragraph of its own"
  (`docs/internal/briefs/extend/scaffolded-site-files.plan.md:158-160`). The round-1 register seat
  blocked every section-closing bridge as a tell, and the drafter deleted all nine. The round-2
  structural seat blocked their loss and asked for standalone closing paragraphs. The final reader's
  advisory 5 asked to move them under the next heading. The run hit its round cap, and three plan
  hand-offs also overclaimed their facts (`scaffolded-site-files.plan.md:228,266,411`). A fix gives
  hand-offs one owner, the plan, and tells the register seat a planned hand-off is not a tell.
- **`contributor`.** Found by `docs/extend/add-a-second-sign-in-group.md`'s re-test (the 2a
  unattended run, R5, 2026-10-07; `f:pgeeq3`). `check:snippets` rewrites every SvelteKit alias
  import, `$lib` included, to an untyped stand-in (`scripts/checks/check-snippets.mjs:21-23,69-70`),
  so a snippet that imports from `$lib` passes, though SvelteKit 3 refuses the alias. The page's
  first draft carried three such imports, and only the reader's hands-on compile caught them. A fix
  fails a `$lib` specifier outright.
- **`contributor`.** Found by `docs/extend/add-a-second-sign-in-group.md` and
  `docs/extend/restrict-admin-access.md` (the 2a unattended run, R5, 2026-10-07). `check:provenance`
  reads every path-shaped or identifier-shaped code span as a fact to cite
  (`scripts/checks/check-provenance.mjs:46-55`), so a page cannot name in prose a file or identifier
  the reader creates: no fact can cite a path the repo does not hold. The second-sign-in close named
  `src/lib/server/members.ts` in a code block's first line instead, with a `check:symbols` allowlist
  entry, and restrict moved an invented identifier out of code font. A fix lets a brief declare its
  page-local names, which the extractor skips and the fact read reviews.
- **`contributor`.** Found by `docs/extend/add-a-second-sign-in-group.md`'s targeted close (the 2a
  unattended run, R5, 2026-10-07). The chain's plan step marks a sentence `no-claim` though its
  wording names a token the extractor reads: the plan's Before-you-begin precondition names
  `AUTH_DB` and is marked `no-claim`
  (`docs/internal/briefs/extend/add-a-second-sign-in-group.plan.md:224-226`), and `check:provenance`
  fails any extractable fact in a `no-claim` sentence (`scripts/checks/check-provenance.mjs:38-39`).
  The close spent a fix on it. A fix has the plan step run the extractor over its planned wording.
- **`contributor`.** Workstation-tool finding, not a cairn defect. Found by the R5 conductor (the 2a
  unattended run, R5, 2026-10-07). Re-issuing `cairn-run-gate` while a run was live returned "gate
  vanished" (exit 75) instead of attaching. The vanish path
  (`~/.local/bin/cairn-run-gate:13-18,124-129`) fires only when the tracked pid is gone with no
  status file, so the re-issue misread a live run. Observed once, not reproduced.

## Clearings

The detail of a cleared finding lives in the pass post-mortem that cleared it and in
`docs/STATUS.md`, never here; this ledger exists only so a reader can find which pass to open. Git
history holds every pruned entry in full.

| Cleared | By | What went where |
| --- | --- | --- |
| 2026-06-28 | extensibility Plan 1 | the append-only prose accumulated through 2026-06-26, pruned |
| 2026-07-16 | the friction-triage pass | every open finding verified against the code, then shipped, filed to `ROADMAP.md` with a trigger, or pruned as already resolved |
| 2026-07-19 | the dev-backend pass | same rule |
| 2026-07-29 | the post-0.91.0 clearing | four gate tightenings shipped; the field-label weight question moved to `ROADMAP.md` |
| 2026-07-29 | the 0.91.1 hotfix pass | the ASC Assets-trial harvest, ten findings: one shipped as the hotfix, one folded into a ROADMAP entry, eight filed |
| 2026-07-30 | the design-ratchet pass | the Assets-trial BUILD harvest, six findings: five shipped (the `base` cascade layer, the exemplar compile gate, `register` on the field components, the one-filled-action ruling), one filed to Next |
| 2026-08-14 | Pass D | the setup-walk entry, five blind vantages and four classes of gap, answered by the docs rebuild's admin track and front-door task |
| 2026-08-17 | the capture pass | three live-run `create-cairn-site` defects plus one register-gate finding, all moved whole to `ROADMAP.md`'s Now tier |
| 2026-08-18 | seam Pass 1b (A8b) | six live-reproduction seam findings: one folded into the extending-developer lens, five filed across all three ROADMAP tiers |
| 2026-08-18 | seam Pass 1b (A8b) | eleven backfill findings from the unharvested 2026-08-04 to 08-16 window, filed across all three tiers; the Windows finding ruled and disclosed rather than fixed |
| 2026-08-18 | seam Pass 2 Task B0 | the cost-preamble finding, the last live one. Geoff ruled the copy hedges rather than waiting on a browser glance; `money.mjs` and two admin pages now scope the total to the confirmed figures, with a test pinning the hedge |
| 2026-08-19 | the release-debt pass | **supersedes the B0 cost ruling above.** A measured build put the deployable bundle at 3,246,163 bytes gzipped, over Cloudflare's 3 MiB Workers Free script limit, so "free, and stays free" was not a hedge to tune but a false claim. Geoff ruled Workers Paid is the expectation, stated plainly and without apology. `money.mjs`, its transcript fixture, and three admin pages now say so; the CLI's own consent prompt still does not, and is filed to `ROADMAP.md` as its own pass |
| 2026-08-22 | the aksailingclub-org 0.95.0 adoption fix pass (`15a2c979`) | five `extender` findings from a real production adoption of 0.95.0, all shipped: `previewLoad`'s static `$app/environment` import broke a raw, non-Vite Wrangler bundle of the `/sveltekit` barrel (now a dynamic import, gated by a new static-import-graph walker test over the built barrel); `previewLoad` now strips `canonical`/`og:url`/`jsonLd.url` from its `seo` instead of leaving every adopter to rediscover the strip; `PreviewBanner`'s four `--cairn-preview-*` custom properties are now documented as the site-override seam; `PreviewBanner` renders the expiry as a fixed UTC `<time>` string instead of `Intl.DateTimeFormat(undefined, ...)`, closing a possible hydration mismatch, with an optional `formatExpiry` prop; `@cloudflare/workers-types` is now a `peerDependency` at `^5`, so a `wrangler types`-only consumer's install now surfaces the requirement instead of silently losing every cairn-typed binding signature to `any` |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | toolkit-seams T1–T6, all verified shipped against the code: T1 `MediaPicker`/`MediaLibraryEntry` now export from `/admin-toolkit` (and `MediaLibraryEntry` from `/sveltekit`); T2 `StatusChip`'s tone dot retired and the `quiet`/`warning`/`outline` registers ship (`docs/internal/probes/2026-08-26-chip-registers-v2`); T3 `ExpandableRow`'s trigger measured inside the engine's own 24x24 floor (no fix needed) and the documented `data-cairn-inert-cell` escape ships; T4 `ToolbarDisclosure` ships and exports; T5 `CsrfField` sets `defaultValue` explicitly (the reset-blanking theory itself did not hold, per the csrf-hardening entry above, but the component still carries the fix); T6 the checkbox/select/radio edge-contrast fix, the `cairn-text-warning`/`cairn-text-success` utilities, and the `.toolkit-list` padding-only opt-in all ship in `cairn-admin.css` |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | toolkit-seams T7 (`isUniqueViolation` in `/cloudflare`) verified NOT shipped: the plan deferred it at review (membership did not clear the gate) with recorded reopen triggers, but the plan's own commitment to record that defer in `docs/internal/engine-rulings.md` was never carried out (no ledger entry found). Promoted to `ROADMAP.md`'s Next tier with its reopen triggers rather than re-queued here |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | harvest-detection T1–T7, all verified against the code: T1 the blanket-`no-referrer` doctor check ships (`checks-local.ts`); T2 `sheet` became a list of compiled-class sources (`b82f06b5`); T3 `stripe-trim-parity` and `unlayered-font-clobber` ship as static rules; the "bare-tag hover parity" sub-item was dropped at the pre-approval review as a falsified premise (`focus-parity.ts` already catches it) and the "DaisyUI dead class" sub-item was dropped as unbuildable on its own motivating case (both recorded in the plan's "second-round review record", not silently missed); `list-role` ships and is explicitly routed to the any-site audit remediation initiative for its own known descendant-selector gap; T4 `panel-width` ships as a rendered rule; T5 (oklch falsification) was cut at the same pre-approval review as a proven no-op, since `border-contrast` already carries an extensive real-Chromium oklch red-path suite (`rulings.border-contrast.test.ts`) and the other two contrast rules already route through the shared canvas normalizer; T6 (chassis+docs) ships the smooth-scroll halves and the dialog-form-failure/load-when-the-panel-opens recipes |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | `StatusChip`'s `outline`-register border-contrast gap verified already covered: the general `border-contrast` rendered rule (pre-existing, `border-contrast.ts`) geometrically resolves any rendered border's real computed color, `currentColor` inheritance included, against its true surroundings, so it already catches the "outline chip inside a muted-ink ancestor" case the finding asked for a new rule to build |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | the showcase chip-blindness finding folded into the existing "showcase visual suite... corpus gap" entry in `ROADMAP.md`'s Now tier as a second instance of the same gap; `cairn-text-error` and `MediaPicker`'s empty-state `<li>` findings, having no other home, promoted whole to `ROADMAP.md`'s Next tier; `list-role`'s and `panel-width`'s own already-recorded routing to the any-site audit remediation initiative (confirmed by the harvest-detection pass's post-mortem) is why those two entries are deleted rather than re-filed; `AdminTable`'s scroll-wrapper finding folded as a refinement into the pre-existing "Three admin-toolkit accessibility gaps" `ROADMAP.md` entry (filed 2026-08-18, predating this finding) |
| 2026-09-02 | the internals pass Task 4 | the editors-page quote-drift finding shipped: `check:editor-quotes` extracts every bolded double-quoted sentence from `docs/editors/when-something-goes-wrong.md` and fails when no shipped `src/lib` string grounds it, wired into `npm test` and CI |
| 2026-09-03 | the internals pass's whole-log sweep | the ASC CSRF entry deleted (every named mechanism verified shipped; the residual WATCH moved to `docs/STATUS.md`'s active watches); the Platform-watch-heading entry deleted as a duplicate of `ROADMAP.md`'s own inline trigger; `fixtureCsrf`, the rulings-ledger flat-read scaling note, and `presetUrl`/`BUILT_IN_PRESETS` promoted whole to `ROADMAP.md`'s Later tier with their triggers |
| 2026-09-05 | the internals-C pass's whole-log triage | the `check:snippets` stub finding promoted whole to `ROADMAP.md`'s Later tier with its trigger; the `ctx.logCommitFailed` call-style contradiction (filed at internals-C's Task 10 close, 2026-09-04) folded into `ROADMAP.md`'s existing polish-slice bullet |
| 2026-09-08 | chassis-A's whole-log triage (Task 12) | the `contributor` finding (2026-09-04, the cairn-case round-2 review) fixed: `what-cairn-is-and-is-not.md:48` said "all 23 registered rules" against the tree's actual 28; the sentence now reads 28 |
| 2026-09-08 | the identity-seam pass, Task 6 | its own two findings, both shipped in the pass that found them and recorded in `docs/internal/record/2026-09-07-identity-seam/harvest.md`: the locals hand-off pattern (Task 2) and the doctor probe's `redirect: 'manual'` fix (Task 4) |
| 2026-09-09 | chassis-B2's whole-log triage (Task 8) | its own Task 7 finding (the two `showcase`-flavored strings surviving in a scaffolded site's shipped content), never open here since it was found and routed in the same pass, promoted whole to `ROADMAP.md`'s Next tier with its trigger; the second-menu editing question (Task 4) filed to `ROADMAP.md`'s Later tier as a consultation candidate |
| 2026-09-20 | the extend-1 pass's whole-log triage | the three 2026-09-15 facts-harvest entries (the untraced `sveltekit.md` sections, the `migrate-existing-content.md` validation workflow, and the candidate-tagged `sveltekit.md`/`delivery.md`/`delivery-data.md` group) folded whole into `ROADMAP.md`'s Next-tier `[candidate]` re-sourcing entry; extend-1's own three findings filed to `ROADMAP.md`, two in Next (the line-pinned container anchors a pass's own edits invalidate, the showcase `dev` script compiling the admin sheet without watching it) and one in Later (the showcase's public route map, which extend-1's seam proof assumed wrongly) |
| 2026-09-21 | the Go tool Pass B2 close | its own three `admin` findings, all promoted whole to `ROADMAP.md`'s "Three docs items for the draft-docs pass" entry: the tool's public pages moving under `docs/`, the drafts' scaffold-first order against 2.0's provisioning, and the admin track carrying the tool inside "is my site working". The whole-log sweep found no other open finding to resolve |
| 2026-09-20 | the extend-2 pass's close | its own two findings, discovered and cleared in the same step: the `./admin-sources.css` subpath's missing dedicated reference page promoted whole to `ROADMAP.md`'s Later tier; the misplaced `cairn-guidance install` symlink-containment fact bullet moved from `docs/internal/facts/extend.md` into a new `## docs/reference/guidance.md` section in `facts/reference.md` |
| 2026-09-21 | the doctor-retirement pre-task's close | its own three `contributor` findings, all promoted whole to `ROADMAP.md`'s Next tier with their triggers: the `check:surface -- --update` argument-forwarding quirk, `check:facts`'s blindness to an off-by-one `Source:` pointer, and the missing `cairn-run-gate` silence watchdog (a dotfiles chore, filed in the roadmap because cairn passes are what hit it). The whole-log sweep found no open finding left by an earlier pass |
| 2026-09-22 | draft docs pass A's close | its own `scripter` finding (the `logs` golden's `publish.commit.failed` event failing `check:symbols`'s log-event class) deleted as overtaken: the branch added the allowlist entry, and three `CAIRN_*` entries beside it, and `check:symbols` is green. The whole-log sweep found no other open finding |
| 2026-09-22 | retire-1's close | the Names finding (mermaid `accDescr:`/`accTitle:` text, image alt text, and nav labels carrying no code font for Vale to read) promoted whole to `ROADMAP.md`'s Next tier with its trigger; retire-1's own `contributor` finding, the pinned-site limit on `link:consumer` plus `cairn-manifest`, filed beside it. The whole-log sweep found no other open finding |
| 2026-09-22 | retire-2b's close | retire-2a's five carried findings, all promoted to `ROADMAP.md`'s Next tier: the `cairn doctor` PASS-line title into the "Go tool 1.1 items" entry; the scaffolder install-literal test gap, `cairn-guidance`'s containment, the `is-it-working.md` register slip, and the stale lockfile bin mapping into one new entry with a trigger each, beside the close's own finding that CI never runs `check:tool-heuristics`. The whole-log sweep found no other open finding |
| 2026-09-24 | docs reset pass 1's close | no open finding in the log; the pass's own findings routed to `ROADMAP.md` (the docs reset to Now; the deferred chain and harness items, the Waymark theme comments, and the readers' real page defects to Next); the page-only `[candidate]` re-sourcing entry in Next reworded to the 25 bullets the triage excluded |
| 2026-09-28 | theme identity pass A's close | no open finding in the log; the pass's own findings routed to `ROADMAP.md` (the carried items to Now, the pinned-rule shrink and the safelist retirement to Later); the Waymark citation entry in Next narrowed |
| 2026-09-28 | draft docs pass 0+1's close | two open entries, both verified and promoted whole to `ROADMAP.md`'s Next tier: the `admin-toolkit.md` outline-chip contrast ratios needing re-measurement, and the page-chain claim inventory's missing disposition for a relocated claim; the close's own two carried findings (`check:symbols`'s attached-redirect and dropped-continuation gaps, `rendered.test.ts`'s hardcoded port 4173) filed straight to the same tier; the segment A boundary's third carried item, the duplicate-shipped-anchor gap, verified already fixed by the 2026-09-26 hardening commit and needed no filing |
| 2026-09-29 | theme identity pass B's close | one open entry, the showcase's hardcoded `PUBLIC_ORIGIN` on port 4173 (found again by pass B's task 1), verified and promoted whole to `ROADMAP.md`'s Next tier; the pass's own findings filed straight to Now, Next, and Later, and the probe emitter trap to `durable-gotchas.md` |
| 2026-09-29 | the style-guide sync's close | two open entries, both its own: Tidy's pinned default model promoted whole to `ROADMAP.md`'s Next tier; the entry on the stale `Microsoft.Quotes` suppression comment in `docs/editors/when-something-goes-wrong.md` deleted as overtaken, since the harvest-then-delete program deletes the page. The whole-log sweep found no other open finding |
| 2026-09-29 | theme identity pass C's close | one open entry, the media library's orphan purge open to every editor, verified against the tree, then ruled on by Geoff and promoted to `ROADMAP.md` Later (an owner-restrictable purge); the pass's own findings routed to `ROADMAP.md` (the four edge cases to Next, the rule promotion to Toward 1.0, the docs standing order to Next) |
| 2026-09-30 | the draft docs harvest's close | four open entries, all its own: the `src/lib/islands/index.ts` `/components` comment fixed and deleted; `cli-cairn-media-seed.md`'s `vite dev` claim and `requiredDocsPaths`'s kept-page existence filter promoted whole to `ROADMAP.md`'s Next tier; the `tool/internal/health` package debt promoted whole to Later. The whole-log sweep found no other open finding |

**Three carry-forwards were audited 2026-08-18 and judged not worth filing**, recorded here so they
are not re-mined: `packages/create-cairn-site` having neither a comment nor a type gate (the package
is plain JS by design and its own suite is the real gate, and no pass has reported a defect slipping
through), the `paid-plan-missing` mapping keyed on entitlement wording (the call site's docstring and
its test name both already state the risk and the reason), and the root `CLAUDE.md` context-headroom
note (housekeeping, outside this log's charter). STATUS shed all three at the B0 close.
