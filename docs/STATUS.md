# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.

## Immediate next action (2026-06-10): the publish-workflow plan, then execution (jumps the queue)

**Diagnostics Pass 2 (email-delivery) LANDED on `main` 2026-06-10 as `0.38.0`.** Seven plan tasks
plus the simplifier (`6c5ea1e`) and the review fold-in (`3f1d8f8`), commits `5d5c865..3f1d8f8`. The
send is awaited, `requestAction` returns the `RequestResult` discriminant (now exported from the
`/sveltekit` barrel), `LoginPage` renders the `send_error`/`throttled` states, and
`auth.link.send_failed` carries `code` plus `conditionId`. Gate green at the tip, run first-hand:
`npm run check` 854 files 0/0, `npm test` 136 files / 846 tests exit 0, all doc gates exit 0. Three
reviewers, no Critical; the fold-in scrubs the send-failure log field, adds the message-scan
fallback for the unproven `E_*` shape, and fixes two stale auth reference pages. The live smoke was
skipped with justification: the ecxc `^0.38.0` bump is the designed live proof. The post-mortem with
six carry-forwards (the live `E_*` shape proof, the cooldown race, the disconnect tether, the
missing-binding condition for Pass 3, the reference signature-currency gate idea, the per-IP limit)
is in the plan (`docs/superpowers/plans/2026-06-09-cairn-diagnostics-02-email-delivery.md`).

**EXECUTION IN PROGRESS (2026-06-10): resume the publish-workflow plan at Task 3.** Tasks 1
(`36bddc3`, the pending-branch codec) and 2 (`2d4fda4`, the stateful in-memory GitHub double) are
done, each gate-green, dispatched to the Sonnet-pinned `cairn-implementer` per the model-economy
policy (the main loop orchestrates, reviews each diff, and verifies the gate; see the global
CLAUDE.md "Model economy" section). Tasks 3 through 11 remain. One plan defect was found and
fixed in place: the draft tests' `RepoRef` literal carried `appId`/`installationId`, which the
real `RepoRef` does not.

**The initiative (context for the resume):**
The approved spec is `docs/superpowers/specs/2026-06-10-cairn-publish-workflow-design.md`
(committed `3734fd9`): edits hold on per-entry `cairn/<conceptKey>/<id>` branches until a
deliberate Publish (per page, plus a site-wide publish-all in the topbar); publish is a content
copy to `main`, never a merge; discard deletes the branch; the `draft:` flag stays, re-presented as
Hidden. The implementation plan is WRITTEN:
`docs/superpowers/plans/2026-06-10-cairn-publish-workflow.md`, eleven tasks, engine-first, with two
plan-time reconciliations recorded up top (consumer shims must add the new actions; branches carry
no manifest copy). Execute main-loop, test-first, full gate per task, on `main` directly (the
initiative precedent); bump `0.39.0` in the docs task. After it, the order resumes: diagnostics
Pass 3, the gates-and-tooling pass, the gallery, P4. The site-track ecxc bump to `^0.38.0` (Pass
2's live proof) stays queued as its own `site-pass` and can run any time after the `0.38.0`
publish.

## Backlog resequenced (2026-06-09): five engine passes instead of six

The queued work was re-cut on 2026-06-09, recorded here and in `ROADMAP.md`. The engine order is now
diagnostics Pass 2 (landed above), then diagnostics Pass 3, then one
consolidated gates-and-tooling pass, then the gallery initiative, then the P4 scaffolder. Three
changes from the prior sequence:

- **The site track is already clear, so Pass 2's live proof rides a small ecxc bump.** The second
  retrofit happened the same day as this re-cut: ecnordic-ski rebranded and renamed to ecxc-ski
  (repo `glw907/ecxc-ski`, domain `ecxc.ski`, auth D1 `cairn-ecxc-auth`
  `a47c56d2-25ef-4131-a505-8c9fd5a92f1f`) and bumped to `^0.37.1` with observability on; a live
  login POST logged `auth.link.requested` and `auth.token.minted` with no send failure. After Pass
  2 publishes, a bump-and-deploy to `^0.38.0` on ecxc.ski puts the `send_error`/`throttled` states
  live where the originating finding was filed, the same proof role the 907.life retrofit played
  for CSRF ownership.
- **DX-sweep Passes B and C collapse into one gates-and-tooling pass.** Pass B's scope (the
  manifest-bin `cwd` versus Vite `config.root` fix, the plain-Node dist-spawn test, the E2E gate
  wiring) and Pass C's gate-shaped remnants (the admin DOM render check, the showcase composer
  alignment, the link-picker narrowing, the `mintToken` widening) share one verification surface
  (scripts and gates run in CI), and each item is small and mechanical. One spec, plan, review
  gate, and publish replaces two of each. Pass C's non-gate remnants (the action `fail` payload
  types, the `App.Locals.editor` ambient type) move to P4 and the extension seam, where they are
  naturally exercised.
- **Pass 3 stays ahead of the gates pass.** It closes the diagnostics initiative while the
  registry and spec are warm, and its `check:readiness` gate is part of its own design. The gates
  pass still lands before the gallery and P4, which is where the protection matters.

## Immediate next action (2026-06-09): execute the diagnostics Pass 2 plan (the email-delivery runtime arm)

The **cairn diagnostics initiative** is a 1:1:1 model where one condition registry is the single source
of truth for the readiness checklist, the `cairn doctor` probe, and the runtime error. It answers the
ecxc magic-link-swallowed finding (`docs/cairn-dx-feedback-2026-06-08-ecxc-magic-link-send-swallowed.md`)
and the recurring class of silent Cloudflare setup failures behind it (email not onboarded, HTTPS not
forced, `checkOrigin: false` missing, observability off). It is decomposed foundation first across three
passes, designed in `docs/superpowers/specs/2026-06-08-cairn-diagnostics-initiative-design.md` (umbrella
plus the Pass 1 detail) and
`docs/superpowers/specs/2026-06-08-cairn-email-delivery-and-environment-preflight-design.md` (Passes 2 and 3).

**Pass 1 (foundation) LANDED on `main` 2026-06-09, published in `0.37.1` (2026-06-09; the
patch also carried the docs reorganization and voice rewrite, with no consumer action).** It stood up the internal
`src/lib/diagnostics/` module (the `CairnCondition` registry with three guard conditions, the `CairnError`
throw primitive, the internal barrel) plus `src/lib/sveltekit/admin-response.ts` (extracted
`applySecurityHeaders`/`brandedAdminPage`) and `src/lib/sveltekit/condition-response.ts`
(`renderConditionResponse` + `REASON_CONDITION`), then routed the auth guard's three rejection responses
through the renderer with no behavior change. The two CSRF reasons are two conditions
(`auth.csrf-token-invalid`, `auth.csrf-origin-mismatch`) alongside `edge.https-not-forced`. The module is
internal (no public subpath), so the docs dimension was "nothing public to document" and
`check:reference`/`check:package`/`check:docs` stayed green with no edit. It ran subagent-driven, one
`cairn-implementer` per task (Tasks 1-6 each a fresh implementer, Task 7 verification inline), seven task
commits `35825cb..8cbeacb`. Gate green at the tip `8cbeacb`, run first-hand: `npm run check` 853 files 0/0,
`npm test` 135 files / 832 tests exit 0. The pre-existing `auth-guard.test.ts` is the regression proof the
guard migration changed no behavior: 20/20 before and after, unchanged. The simplifier made no change and
both reviewers (`web-auth-security-reviewer`, `cloudflare-workers-reviewer`) returned no Critical/Important.
The live admin smoke was judged not proportionate (behavior-preserving re-home, no rendering change, the
workerd integration suite already pins the responses). Post-mortem with the three carry-forwards (freeze
`REGISTRY`; tie the renderer/registry 1:1 with one coverage test; the pre-existing untested
https-vs-csrf branch ordering) is in the plan
(`docs/superpowers/plans/2026-06-08-cairn-diagnostics-01-foundation.md`).

**Pass 2 (the email-delivery runtime arm) HAS A WRITTEN PLAN, ready to execute:**
`docs/superpowers/plans/2026-06-09-cairn-diagnostics-02-email-delivery.md`. Execute with
`superpowers:subagent-driven-development`, one `cairn-implementer` per task, on `main` directly (the
established precedent for this initiative). Seven tasks, each ending on the full gate (`npm run check`
0/0, `npm test` exit 0). It consumes the Pass 1 model: await the send (remove the `waitUntil`
backgrounding), a typed `status` result (`sent`/`send_error`/`throttled`) additive over the existing
`sent` boolean, the logged binding `code` plus a new `conditionId` on `auth.link.send_failed`, and the
`LoginPage` `send_error` and `throttled` states on top of the `0.37.0` confirmation polish. The non-leak
posture is deliberately relaxed for editor feedback (the neutral and send-ok paths stay byte-identical;
`send_error`/`throttled` reveal editor membership by design), and the await-the-send timing side-channel
is noted not mitigated (flagged to `web-auth-security-reviewer`). Two email conditions
(`email.sender-not-onboarded`, `email.send-failed`) join the Pass 1 registry, seeding Pass 3's doctor.
The minor bumps `0.38.0` (additive). **Scope/reconciliation calls baked into the plan (settled with
Geoff 2026-06-09):** Pass 2 also corrects the stale `CLAUDE.md` Cloudflare-email gotcha (a known-wrong
durable gotcha should not wait), while the readiness checklist and the deploy-guide onboarding section
stay Pass 3; and `CairnError`'s first use here is as the *carrier* of the mapped condition (Arm A has no
rendered-error boundary), with its first thrown-and-rendered site moving to the Pass 3 doctor. The
throwaway `examples/showcase/src/routes/_login-preview/` route (still untracked) is the eyeballing
surface; Pass 2's last task deletes it.

**Pass 1 docs split reconciled in the spec (2026-06-09).** The email-delivery design spec now records the
Pass 2/3 docs split and the timing side-channel decision, committed as `370488e`.

**The ecxc production outage is already fixed.** The `ecxc.ski` sending domain was onboarded to
Cloudflare Email Sending live on 2026-06-08 (subdomain `ecxc.ski`, return path `cf-bounce.ecxc.ski`,
status `ready`), so login there is unblocked. The renamed-domain gap (`ecnordic.ski` was onboarded,
`ecxc.ski` was not) was the surface fault. Email Sending reaches arbitrary recipients once the per-zone
sending subdomain is onboarded; cairn stays Cloudflare-native with `cloudflareSend`, no second provider.

**Pass 3 (after Pass 2).** `cairn doctor` and the generated, gated (`check:readiness`) Cloudflare
readiness checklist that starts a developer from a default 2026 Cloudflare setup and links out to
Cloudflare for the generic steps. The 0.37.0 login-confirmation polish was committed standalone as
`d2cf014` (the brand snippet and the inset help note), so Pass 2 builds its `send_error`/`throttled`
states on top of it.

## Login-confirmation UX shipped as `0.37.0` (2026-06-08)

The magic-link sign-in confirmation became a branded panel in place of the flat DaisyUI success bar:
a mail icon in a soft success tile (the Warm Stone `--color-success` token, not stock green), a "Check
your email" heading, the ten-minute expiry note, and, below a divider, guidance for the link that never
arrives (spam folder, then confirm the address matches the one the site owner added). This answers the
fat-finger case, where a mistyped or unlisted email gets the same neutral confirmation and no email. A
"Use a different email" action flips a client-only `dismissed` state back to the form. The confirmation
copy stays identical whether or not the email is on the allowlist, so the page still never leaks
membership. The change is internal to the `LoginPage` component, additive, and needs no consumer action.

It landed on `main` directly (not a numbered plan): the `LoginPage.svelte` rebuild plus two new
component tests (the help copy renders, and "Use a different email" returns to the form). Gate green at
the source tip: `npm run check` 0/0, `npm test` 130 files / 816 tests exit 0, `check:prose` clean, and
the visual was verified on the showcase against the compiled admin sheet in both states. The `v0.37.0`
GitHub Release fires the OIDC trusted-publishing workflow over the prior `0.36.0` `latest`. The next
engine action below (resume the queued backlog) is unchanged.

## Engine next action (2026-06-08): the engine-logging pass LANDED and PUBLISHED as `0.36.0` (registry `latest`)

cairn's first logging infrastructure LANDED on `main` 2026-06-08 as `0.36.0`, and PUBLISHED the same day
as the registry `latest`. The `v0.36.0` GitHub Release fired the OIDC trusted-publishing workflow (run
`27175127215` green, `check:package` plus `npm publish` both passed) over the prior `0.35.0` `latest`;
`main` is clean at the `v0.36.0` tag with nothing unpublished. An internal
`src/lib/log/` module owns one logger that assembles a structured JSON record
(`{ level, event, timestamp, ...fields }`) and writes it to `console`, where Workers Logs ingests and
indexes it when a site sets `observability.enabled`. Nine events route through it: the auth flow
(`auth.link.requested`, `auth.token.minted`, `auth.link.send_failed`, `auth.token.confirmed`,
`auth.session.created`, `auth.session.destroyed`), the commit pipeline (`commit.succeeded`,
`commit.failed`), and the guard's three pre-resolve refusals (`guard.rejected` with `reason`
`csrf`/`origin`/`https`). The module is exported from no package subpath, so its API stays free to
grow; the event names are the public-observable contract. The forward-compat invariants (structured
records from the first call, one chokepoint) keep the deferred admin-extension affordances additive.

It ran subagent-driven, one `cairn-implementer` per task on `main` directly, Tasks 2/3/4 on Opus and
1/5/6 on Sonnet. Six task commits `231476a..f87af99`, a simplifier `2be2105`, a review fold-in
`6be795b`, the release commit `f699ea7` (the `0.36.0` bump, changelog, upgrade-guide, reference note),
and an infra commit `941cfa2` (a CLAUDE.md "Diagnosing a running site" section pointing troubleshooting
at the logs first). Gate green at the source tip `6be795b`, run first-hand: `npm run check` 841 files
0/0, `npm test` 130 files / 814 tests exit 0, and `check:docs`/`check:reference`/`check:package` exit 0.
The post-mortem (the four-not-five commit-site plan gap, the three-reviewer-converged email-bounding
fold-in, and the carry-forwards) is in the plan
(`docs/superpowers/plans/2026-06-08-cairn-engine-logging.md`); the design spec is
`docs/superpowers/specs/2026-06-08-cairn-engine-logging-design.md`.

**The review gate ran clean.** Three reviewers, no Critical or Important. `web-auth-security-reviewer`
confirmed no token, session id, or magic-link content reaches a field, and that `String(err)` cannot
transitively carry the GitHub token or the link. `cloudflare-workers-reviewer` confirmed
`console.log(object)` is the right shape for Workers Logs field indexing and that the send-failed
`.catch` log lands on the existing `ctx.waitUntil`. `svelte-reviewer` confirmed every log sits correctly
around the throw/return boundaries with no action or hook contract change. All three flagged the
unvalidated `auth.link.requested` email; the fold-in bounds it to 320 chars and documents it, and a
mint-path redaction test was added and proven a real guard.

**Carry-forwards.** (1) The `auth.link.requested` route is unauthenticated and unrate-limited, so a
flood of distinct emails inflates Workers Logs volume; the length cap bounds record size, not volume.
Bounding volume needs edge rate-limiting, a broader change. (2) `render.failed` stays deferred until a
server-side render path exists. (3) The three admin-extension affordances (`event.locals.cairn.log`,
`onEvent`, per-extension namespacing) stay deferred to the undesigned `CairnExtension` seam. (4) Each
site retrofit gets a site-side "check Workers Logs" pointer when it runs.

**Next engine action: resume the queued engine backlog.** `0.36.0` is published and `main` is clean at
the `v0.36.0` tag with nothing held. The queued engine backlog (the DX-sweep tooling/CI robustness work
and the scaffolder track) is unchanged by this pass. The two prod-site retrofits stay the separate
`site-pass` track and now pick up `0.36.0` (additive) alongside the `0.35.0` CSRF action.

The two site retrofits below stay the separate `site-pass` track and are unaffected by this engine pass.

## Site track (2026-06-09): both retrofits DONE (907.life `^0.36.0`; ecnordic-ski renamed ecxc-ski, `^0.37.1`)

**907.life was retrofitted to `^0.36.0` and deployed 2026-06-09, and its live site verified cairn's CSRF
ownership end to end. The second retrofit is also DONE: ecnordic-ski rebranded and renamed to ecxc-ski
the same day (repo `glw907/ecxc-ski`, domain `ecxc.ski`), bumped to `^0.37.1` with observability on,
and a live login POST logged `auth.link.requested` and `auth.token.minted` with no send failure
(details in `ecxc-ski/docs/STATUS.md`). The remaining site action is a small ecxc bump to `^0.38.0`
after Pass 2 publishes; see the resequencing entry at the top.** 907 crossed the
`0.24.0` → `0.36.0` window in one pass (`composeRuntime` object form, a `(site)` route group for
chrome-free admin, `csrf: { checkOrigin: false }`, and `[observability]`); the commit and post-mortem are
in `907-life/docs/STATUS.md` and `907-life/docs/architecture.md`. The deployed `https://907.life/admin/login`
returns `200`, renders chrome-free with the `cairn-admin` shell, sets the `__Host-cairn_csrf` cookie, and
carries the `name="csrf"` field, so the real-runtime CSRF loop the engine deferred to the first retrofit is
now proven live (only the magic-link email click stays manual). The retrofit filed two engine DX findings,
`docs/cairn-dx-feedback-2026-06-09-907-0.36-retrofit.md`: the `csrf.checkOrigin` deprecation in SvelteKit
2.61 (cairn documents a spelling on a removal path), and the `custom_domain` local-smoke gap (`wrangler
dev` presents `event.url` as the production https origin, so the documented local http admin smoke hits the
`0.34.0` HTTPS-required page). Both sites have now crossed; the ecxc-ski upgrade landed 2026-06-09
at `^0.37.1`.

**Window context (historical; both sites have crossed).** The login-CSRF-ownership plan PUBLISHED 2026-06-08 as
`0.35.0`, and the engine-logging pass PUBLISHED 2026-06-09 as `0.36.0` (now `latest`). A retrofit pins
`^0.36.0` and adds `csrf: { checkOrigin: false }` to `kit` in `svelte.config.js`, along with the other
breaking-window actions noted below.

**What `0.35.0` did.** It moved login-CSRF ownership from SvelteKit's global `checkOrigin` to cairn's auth
guard, closing the second source of the admin lockout that `0.34.0`'s force-HTTPS work did not reach: a
privacy browser that sends no `Origin` header tripped the same opaque SvelteKit 403. A consuming site now
disables the framework's global check, and the guard enforces two rules: every unsafe `/admin` form POST
carries a valid `__Host-cairn_csrf` double-submit token (lazy and stable, HttpOnly, SameSite=Strict,
session-scoped, bare `cairn_csrf` on local http), and every non-admin unsafe form POST keeps a strict `Origin`
check, so disabling the global check is not a net loss. The token is issued by the login, confirm, and
admin-shell loads, rendered by a new public `CsrfField` component, validated centrally with a constant-time
compare, and a failed admin check serves a branded 403 page (not the raw framework text) built through a
shared static-page shell extracted from the HTTPS-required page. Spec:
`docs/superpowers/specs/2026-06-08-cairn-login-csrf-ownership-design.md`. Plan with the full post-mortem:
`docs/superpowers/plans/2026-06-08-cairn-login-csrf-ownership.md`.

It ran subagent-driven, one `cairn-implementer` per task on `main` directly, Tasks 5 and 10 on Opus and the
rest on Sonnet. Thirteen commits `93774a6..b165df3`: eleven task commits, a simplifier commit `cbd8b31` (a
shared branded-page response builder in the guard), and a svelte-review fold-in `b165df3` (the context hands a
live token getter instead of a once-captured value, so a future mid-session rotation cannot leave a stale
field). Gate green at the tip `b165df3`, run first-hand: `npm run check` 836 files 0/0, `npm test` 128 files /
796 tests exit 0, `check:docs`/`check:reference`/`check:package` exit 0, and the `examples/showcase`
production build exit 0. The new `CsrfField` export carries a `0.35.0` reference entry, and the deploy guide,
upgrade guide, changelog, and security-model docs document cairn-owned CSRF.

**The execution caught one plan gap, now closed.** The plan's Task 10 list missed two real admin mutation
forms, `DeleteDialog.svelte` (`?/delete`) and `RenameDialog.svelte` (`?/rename`), which render as descendants
of `EditPage` and `ConceptList`; both now carry a `CsrfField`. Without that, those two mutations would have
failed closed at runtime (the branded 403) the moment a site enabled cairn's CSRF ownership. The implementer
found them by surveying the real markup, the intended discipline for a broad task.

**The review gate ran clean.** `web-auth-security-reviewer`: no Critical or Important (it confirmed the
`__Host-` cookie fixation resistance, the constant-time compare with empty-token rejection, the body clone
that leaves the action's body readable, and the guard ordering that gates every unsafe `/admin` POST before
`resolve()`). `daisyui-a11y-reviewer`: both branded pages clear WCAG 2.2 AA in light and dark with margin.
`svelte-reviewer`: one Important on the once-captured context token, folded in as `b165df3`.

**Three `0.35.0` carry-forwards (recorded, not fixed).** (1) Bare `<CsrfField />` depends on an ancestor
`setContext`, an undiscoverable coupling: a new admin form rendered outside `AdminLayout` (the coming
`CairnExtension` seam) would ship an empty field and surface only as a submit-time 403; a dev-time warning
when both the prop and the context getter are absent would make it loud. (2) The branded-page CTA hover has an
ungated `transform` transition; a `prefers-reduced-motion` guard is optional polish (AAA, not required for AA).
(3) `LayoutData.csrf` admits `''` for non-route callers; fail-closed either way, a clarity nit only.

**`0.34.0` PUBLISHED 2026-06-08, now the registry `latest`.** The `v0.34.0` GitHub Release fired the OIDC
trusted-publishing workflow (run `27156079198` green, `check:package` plus `npm publish` both passed),
putting the login-CSRF hardening over the prior `0.33.0` `latest`. The held window had published earlier
the same day as `0.33.0` (run `27117496588` green), folding `0.30.0` (DX-A render-authoring), `0.31.0`
(self-styling foundation), `0.32.0` (UX rebuild plus the polish and design-identity arc), and `0.33.0`
(chrome isolation) over the prior `0.29.0`. `main` is now clean at the `v0.34.0` tag with nothing
unpublished. The next action is the two production-site retrofits (907.life, ecnordic.ski), each a
separate `site-pass`.

**Login-CSRF hardening LANDED on `main` 2026-06-07 as `0.34.0`, PUBLISHED 2026-06-08 (over the `0.33.0`
`latest`).**
Filed from the first real ecnordic admin login: a magic-link sign-in over http failed with SvelteKit's
opaque CSRF 403, because the JS-free form POST needs a matching https origin
(`docs/cairn-dx-feedback-2026-06-07-ecnordic-0.33-login-csrf.md`). Two commits on `main`, `5ef1d73` then
`69a67f3` (plus the version bump). The auth guard now detects a deployed, non-local admin request over
http and serves a self-contained, design-system-matched help page (status 400, light and dark) that names
the problem, links to the https version for one-click recovery, and gives the Cloudflare fix, returned
before `resolve()` runs the CSRF check; `wrangler dev` over http is exempt
(`src/lib/sveltekit/https-required-page.ts`, wired in `guard.ts`). The login copy lost a tacked-on
closer, and a new `npm run check:prose` (`scripts/check-admin-prose.mjs`, now in CI) scans the admin
components' user-facing strings for AI tells, since the component copy ships compiled and a consuming
site's `prose-guard` never sees it. The deploy guide now requires forcing HTTPS, the admin design system
records the brand-prose standard, and the `web-auth-security-reviewer` cleared the guard change (no XSS in
the escaped href, no session-gate bypass, no redirect primitive). Gate green, run first-hand: `npm run
check` 825 files 0/0, `npm test` 122 files / 765 tests exit 0, `check:docs` and `check:prose` clean.

The two production zones were set to force the scheme at the edge as the immediate site-side fix: **Always
Use HTTPS and HSTS (`max-age` two years, `includeSubDomains`, preload off) are now on for ecnordic.ski and
907.life** (via the Cloudflare API). The HSTS header the feedback saw earlier came from cairn's own
`/admin` responses; the zone-level setting was off until now. `0.34.0` is additive (the help page only
triggers on a misconfigured http request), so it published with no required consumer action beyond forcing
HTTPS: `0.34.0` is now the registry `latest`.

**Site-retrofit gotchas the published window carries (for each `site-pass`).** Both sites pin an older
range and cross several breaking minors at once, so an upgrade reads the actions off the `Consumers must:`
lines. The two breaking minors in this window: `0.30.0` moved the render-authoring helpers (`iconSpan`,
`cardShell`, `headRow`, `isElement`, `strAttr`) to the `@glw907/cairn-cms/render` subpath and removed
`rehypeDispatch` (use `createRenderer`), and a component with `defaultIconByRole` and no `type:'icon'`
attribute now fails `defineRegistry`; `0.33.0` requires a chrome-free root layout with the public chrome
plus `app.css` moved into a `(site)` route group. Both sites also still carry the pre-existing
`composeRuntime` positional-call break against their `^0.24.0` pin (the `0.24.0` object form), to fix at
the same retrofit. `0.31.0` and `0.32.0` are additive.

**Plan 3 LANDED on `main` 2026-06-07 as `0.33.0`, unpublished.** It ran subagent-driven, one
`cairn-implementer` per task on `main` directly, all seven tasks on Sonnet (mechanical, well-specified).
Ten commits `c0280e9..b87cfd3`: seven task commits, a pre-existing-defect fix `89abb78`, a simplifier pass
`373f24a`, and a review fold-in `b87cfd3`. A dev-only `chrome-guard.ts` (`detectChromeWrap` plus the
`import.meta.env.DEV`-gated `warnIfChromeWrapped`) walks the admin root's ancestor chain on mount and logs
one `console.error` when a width-constraining ancestor wraps the admin; both admin roots call it against a
`bind:this`-bound `data-theme` wrapper. A boundary test pins that `cairn-admin.css` is imported only by the
admin roots, so its document-global `@keyframes`/`@property` rules load only on `/admin`. The showcase
gained a `(site)` route group with plain-CSS chrome, proving the admin self-styles on a framework-free
site. The route pattern is documented (`docs/admin-route-structure.md`) and taught in the tutorial. Gate
green at the tip `b87cfd3`, run first-hand: `npm run check` 823 files 0/0, `npm test` 121 files / 758 tests
exit 0, `check:reference`/`check:package`/`check:docs` exit 0. The post-mortem is in the plan
(`docs/superpowers/plans/2026-06-07-cairn-admin-chrome-isolation.md`).

**This closes the plan-1 global at-rule carry-forward** by isolation rather than name-mangling: the sheet
is code-split to the admin roots, so it loads only on `/admin`, and the route pattern keeps host CSS off
`/admin` from the other side. **Two reconciliations the execution surfaced.** (1) `cairn-admin.css` is
imported by THREE roots, not two: `ConfirmPage.svelte` also imports it, so the boundary test asserts all
three (the guard wiring stays on `AdminLayout` and `LoginPage` per the plan; the confirm page is a brief
interstitial). (2) `main` carried two pre-existing `svelte-check` errors in `AdminLayout.test.ts`
(`dialog.modal` `.open` typed as `Element`) from the design-identity arc fold-in `a76aa8b`; the arc's
reported "0/0 at a76aa8b" was inaccurate. They blocked the plan's 0/0 gate and were fixed first as
`89abb78` (a typed `querySelector<HTMLDialogElement>`).

The review gate ran the simplifier plus the `svelte-reviewer` (no Critical/Important; confirmed the
runes/SSR pattern and `(site)` routing) and the `daisyui-a11y-reviewer` (one Important: the showcase header
links lacked a `<nav>` landmark). The fold-in `b87cfd3` added the `<nav aria-label="Site">` landmark, a
skip of non-constraining `max-width` values (`100%`, `100vw`) so a host's defensive wrapper does not trip
the dev guard, and a fixture-only note on the test marker. The live `wrangler dev` admin smoke was judged
not proportionate (the only runtime change is a dev-only `console.error` that compiles out of production
and changes no rendering; the showcase preview smoke already proved `/admin` renders outside the chrome),
the same call plan 1 made.

The admin-stands-alone initiative spec is `docs/superpowers/specs/2026-06-07-cairn-admin-stands-alone-design.md`.
Plans 1, 2, and 3 have all landed; the polish and design-identity arc ran between plans 2 and 3. The
remaining initiative work is the two site retrofits, after the held window publishes.

**The polish pass LANDED 2026-06-07 (commit `97ff069`), folded into `0.32.0` (no version bump, the window
is unpublished).** It refined the look with the Playwright render-and-compare loop, direction warm
editorial utility: refined Warm Stone light and dark tokens for clearer surface layering, a soft
`bg-primary/10` active-nav state, the site name instead of a redundant single breadcrumb on a bare list
page, a refined list table (uppercase muted column labels, row hover, cleaner title links, card
elevation), a newest-first default sort, and a scoped `prefers-reduced-motion` guard. A scoped anchor
reset in `@layer components` restores the no-underline inherit-color default the omitted Preflight used to
provide. The a11y review's contrast pass cleared AA in both themes; the dark active-nav at 4.53:1 is the
one locked margin, so dark `--color-primary` and the `/10` tint opacity must not move without re-checking.
A real cascade-layer lesson landed: an unlayered reset beats every layered utility because layers resolve
before specificity, so the reset had to go in the `components` layer (below `utilities`). The pass-end
post-mortem is in the plan file.

**The design-identity arc LANDED 2026-06-07 (final fold-in `a76aa8b`), folded into `0.32.0` (no version
bump, still unpublished).** A long user-driven sequence after the polish gave the admin a distinct
identity: a Bricolage Grotesque wordmark over a Figtree body, both self-hosted as variable woff2 under
the SIL OFL (the `@font-face` is appended after the Tailwind compile so the `url()` is not rebased); an
app-icon brand tile with the CC0 Temaki cairn glyph; softer radii and floating cards; a flat opaque
sidebar-plus-topbar header strip; nav grouped into a core group and custom-named developer-extension
groups, each a collapsible `<details>` whose state persists through a `cairn-admin-nav-collapsed` cookie
that `layoutLoad` reads for a no-flash first paint; and a Cmd/Ctrl+K command palette in the topbar. The
login and confirm screens were rebranded to match, with the favicon from `cairn-favicon.ts`. Two latent
rendering bugs were fixed in the window: the auth screens centered on the `data-theme` element instead of
a wrapper (the same defect class as the plan-2 drawer), and the command palette cancelled its own
navigation by closing the dialog from a result link's `onclick` (internal links now navigate and the
pathname effect closes the palette; a regression test pins it). The pass wrote an agent-facing design
system at `docs/internal/admin-design-system.md`, with a `CLAUDE.md` "Admin interface design" pointer and
the `cairn-admin-design-system` memory, so continued interface work stays consistent. Gate green at
`a76aa8b`: `npm run check` 821 files 0/0, `npm test` 120 files / 751 tests exit 0, and
`check:reference`/`check:package`/`check:docs` exit 0. The full post-mortem is in the plan file.

**Carry-forwards still open (for a later touch).** (3) `use:enhance` with `applyAction` for the list
delete, deferred because `$app/forms` does not resolve in the component test project. (4) The
first-ever-visit dark-OS first-paint flash, which needs an inline head script in the host `app.html` and so
suits a showcase or scaffolder touch. (6) The plan-1 global at-rule leak is CLOSED by plan 3's chrome
isolation (the sheet is code-split to the admin roots, so it loads only on `/admin`, and the route pattern
keeps host CSS off `/admin`; a boundary test pins the import side). The held window PUBLISHED 2026-06-08 as
`0.33.0`, now the registry `latest` over the prior `0.29.0` (`0.30.0` through `0.33.0` folded in).

**Plan 2 LANDED on `main` 2026-06-07 as `0.32.0`, unpublished.** It ran subagent-driven, one
`cairn-implementer` per task on `main` directly, Tasks 4, 6, 8, and 10 on Opus and the rest on Sonnet.
Eleven task commits `01751ae..1929b21` plus three fold-ins: the self-styling render fix `ed0d50a`, the
simplifier `129ba6d`, and the review fold-in `73cf8a7`. The admin list is now a searchable, sortable
DaisyUI data-table (status badges, formatted dates, per-row delete reusing the inbound-link guard,
pagination, a header create dialog), the sidebar has Lucide nav icons and a footer user menu, the topbar is
sticky with breadcrumbs, and the admin has a dark mode persisted through a `cairn-admin-theme` cookie that
`layoutLoad` reads for a no-flash first paint. `@lucide/svelte` is a new runtime dependency; `lightningcss`
is a new build-only devDependency. The minor bumps `0.32.0` with a "Consumers may:" line (additive;
`listDeleteAction` is the one new opt-in action). Gate green at the tip `73cf8a7`, run first-hand: `npm run
check` 816 files 0/0, `npm test` 120 files / 745 tests exit 0 (one re-run cleared the known
`delivery-*-split` parallel-load flake), and `check:reference`/`check:package`/`check:docs` exit 0. The
post-mortem is in the plan (`docs/superpowers/plans/2026-06-07-cairn-admin-ux-rebuild.md`).

**The verification gate caught a latent plan-1 defect, fixed as `ed0d50a`.** Task 10's light-and-dark
showcase proof found the admin sidebar never rendered at desktop width and the root background never
filled. Two causes, both in the plan-1 self-styling foundation and unscrutinized until this pass rendered
the full shell. First, `postcss-prefix-selector` prepended the scope to the front of every rule including
the nested rules Tailwind v4 and DaisyUI emit, so a nested selector starting with a combinator became
`:where(scope) > .x`, which native nesting composed as `& :where(scope) > .x` and severed the
`lg:drawer-open` reveal from its parent. The fix flattens the nesting with lightningcss before scoping.
Second, the admin root carried `data-theme` and the drawer classes on the same element, but every rule
scopes as a descendant of the theme root, so `.drawer` on the theme element never matched; moving
`data-theme` onto a bare wrapper makes the drawer a scoped descendant. A regression test in
`admin-css-build.test.ts` pins both. The fix is proven on the showcase in both themes.

**The review gate caught one Critical and two Important issues, folded in as `73cf8a7`.** The per-row
delete-refusal UI was dead: the action returns a flat `fail(409, { inboundLinks, id })`, but `ConceptList`
read a nested `form.deleteRefused` the action never produces, and the showcase shim never forwarded the
`form` prop. The server still refused the unsafe delete, so data was safe, but the author saw no reason.
The fold-in reads the flat shape, forwards `form` from the shim, and surfaces the refusal as a visible
`role="alert"` banner for editor parity, with a new component test. The two a11y fixes add `aria-sort` to
the sortable headers and a load-present `role="status"` live region for the filter result count and the
empty state. Two cheap minors rode along: the breadcrumb `{#each}` key and a `btn-sm` delete target.

The admin-stands-alone initiative spec is `docs/superpowers/specs/2026-06-07-cairn-admin-stands-alone-design.md`.
It decomposes into three engine plans by verification surface (self-styling foundation, the UX rebuild plus
dark mode, chrome isolation plus the route-structure pattern and dev guard), then two site retrofits. Plans
1 and 2 have landed; the polish pass runs between plan 2 and plan 3.

**Plan 1 (self-styling CSS foundation) LANDED on `main` 2026-06-07 as `0.31.0`, unpublished.** The admin
now ships its own stylesheet from the engine. A new `scripts/build-admin-css.mjs` compiles the admin's
Tailwind utilities and DaisyUI components (built-in themes off, no global Preflight) plus the Warm Stone
variables, scopes every rule under `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])`
with `postcss-prefix-selector`, and writes the sheet to `dist/components/cairn-admin.css`, where the admin
components already import it. The `package` script runs the compile after `svelte-package`; the theme
partial gained a box-sizing reset scoped to the admin roots in place of the omitted global Preflight. It
ran subagent-driven, one `cairn-implementer` per task on `main` directly, Tasks 5 and 7 on Opus and the
rest on Sonnet. Six task commits `2e7cf0d..968999f`, a review fold-in `fda004e`, and the upgrade-guide doc
`bb6d1bd`. Gate green at Task 8, run first-hand: `npm run check` 797 files 0/0, `npm test` 119 files / 723
tests exit 0, `check:reference`/`check:package`/`check:docs` exit 0. The compiled sheet is 168,236 bytes
(23 `.btn`, 0 surviving raw directives, 623 scoped selectors). The minor bumps `0.31.0` with a "Consumers
may:" line (the change is additive, no required action). The post-mortem is in the plan
(`docs/superpowers/plans/2026-06-07-cairn-admin-self-styling-foundation.md`).

**The review gate caught one real defect, folded in as `fda004e`.** The run-as-script guard that compared
`import.meta.url` against a `file://`-prefixed `process.argv[1]` was fragile: `import.meta.url`
percent-encodes path characters and resolves symlinks while `process.argv[1]` does neither, so on a
checkout path with a space or reached through a symlink the guard is false, `npm run package` exits 0
having shipped only the 2KB variables-only partial, and the admin renders unstyled with no error. The fix
uses the standard `pathToFileURL(process.argv[1]).href` idiom with an `argv[1]` presence guard. The
simplifier made no change; the `svelte-reviewer`, `daisyui-a11y-reviewer`, Worker, and auth reviewers and
the live `/admin` smoke did not apply (no component markup, auth, or Worker change).

**Plan-1 carry-forwards (recorded, not fixed).** (1) Global at-rule leaks: the review confirmed every
style rule (621+) is correctly scoped, but `postcss-prefix-selector` rewrites rule selectors only, never
at-rule identifiers, so DaisyUI's global `@keyframes` (the common name `spin`, plus `progress`, `toast`,
`menu`, `dropdown`, `skeleton`) and its `@property` registrations (the unprefixed `--radialprogress` with
`inherits:true`, and 41 prefixed `--tw-*` ones) stay document-global. The realistic collision is a host
that defines `@keyframes spin` while the admin sheet loads document-wide. The risk is bounded today (the
sheet is route-scoped to `/admin`, and plan 3 isolates the chrome), and a fix is keyframe and property
name-mangling, a different mechanism from the selector scoping plan 1 locked; it belongs with plan 2 (the
UX rebuild adds the bulk of DaisyUI keyframes) or plan 3. (2) The showcase mounts no `/admin/login` route,
so the Task 7 visual proof ran against `/admin/posts` (the same `AdminLayout.svelte` self-styling path);
wiring the login route into the showcase is a showcase gap, a candidate for a later showcase touch.

## Deferred behind the admin initiative: DX-sweep Pass B (tooling and CI robustness)

**DX-sweep Pass A (render authoring) LANDED on `main` 2026-06-06 as `0.30.0`, unpublished.** It carved the
public `@glw907/cairn-cms/render` authoring subpath (`iconSpan`, `cardShell`, `headRow`, the re-homed
`isElement`, and the new `strAttr`), added a configurable `headRow` heading level (default 2), a
`registry.iconField(name)` accessor, and a `defineRegistry` guard that fails a component declaring
`defaultIconByRole` with no `type:'icon'` attribute, and dropped `rehypeDispatch` from the public surface
(`createRenderer` is the one public render pipeline). It ran subagent-driven, one `cairn-implementer` per
task on `main` directly (no worktree), Tasks 3, 4, 5 on Opus and Tasks 1, 2, 6, 7 on Sonnet. Seven task
commits `e219335..48b83d8`, a simplifier commit `7ee7c7b` (a shared `findIconField` helper), and a review
fold-in `c69079e`. The minor bumps `0.30.0` with a `Consumers must:` line (the render-authoring imports
moved and `rehypeDispatch` is gone). Gate green at the source tip `7ee7c7b`, run first-hand: `npm run check`
793 files 0/0, `npm test` 118 files / 720 tests exit 0, `check:reference` and `check:package` exit 0; the
render-pipeline snapshot stayed byte-identical; the showcase `check` 0 errors in `src/` and a production
build exit 0. The post-mortem (with the three carry-forwards and the review triage) is in the plan
(`docs/superpowers/plans/2026-06-05-cairn-render-authoring-surface.md`); the design spec is
`docs/superpowers/specs/2026-06-05-cairn-render-authoring-surface-design.md`.

**The review gate caught one real doc-framing issue, folded in as `c69079e`.** The `defineRegistry` icon
guard was filed under "additive (non-breaking)" in the upgrade guide, but it converts a previously silent
no-op into a hard throw at registry construction: a component with `defaultIconByRole` and no icon attribute
never rendered its default icon before (the default only stamps through an icon attribute), so a consumer
build that succeeded before can now fail. The fold-in moved the guard out of the non-breaking heading and
states the conditional consumer action in both `CHANGELOG.md` and `docs/guides/upgrade-cairn.md`.

**Three Pass A carry-forwards (recorded, not fixed).** (1) `headRow`'s `level` is a plain `number` with no
1..6 validation, so an explicit `headRow(title, icon, 0)` or `7` emits an invalid `<h0>`/`<h7>` (the
default fires only for `undefined`); no current caller passes a non-default level, so it is a latent
robustness gap on the new authoring helper, to clamp in a future render touch. (2) The icon guard checks an
icon field exists, not that every `defaultIconByRole` role is a reachable `role` option. (3) The guard
iterates every `components` entry while `byName` is last-wins, so on a duplicate component name it can throw
on a shadowed def the engine would never dispatch (duplicate names are already an authoring error).

**Immediate next action: DX-sweep Pass B (tooling and CI robustness).** Brainstorm and spec it first (it has
no plan yet), then execute subagent-driven on `main`. Its scope is sketched in the "Sequence to the
scaffolder" split below (the DX-B-engine manifest-bin `cwd`-versus-Vite-`config.root` fix, a plain-Node
dist-spawn test for the `/delivery/data` node-safety guarantee, wiring the showcase golden-path E2E into a
gate). After Pass B comes Pass C (admin and consumer alignments), then the gallery initiative, then P4.
Publishing stays held: `0.29.0` is the registry `latest`, and `main` now carries the unpublished `0.30.0`;
the window publishes before any site or the scaffolder consumes the `/render` subpath.

The **engine-hardening series is COMPLETE and PUBLISHED.** All three release-gate improvements landed and
the held window published together as `0.29.0`: pass 1 (surface-narrowing, `0.27.0`), pass 2 (render
attribute-sink hardening, `0.28.0`), and pass 3 (URL-identity consolidation, `0.29.0`). The `v0.29.0` GitHub
Release fired the OIDC trusted-publishing workflow (run `27057249585` green), and `0.29.0` is now the
registry `latest` over the prior `0.26.0`. The pre-publish gate was green: both production sites'
`site.config.yaml` `content:` blocks pass pass 3's new URL-policy validation (verified by running the real
`parseSiteConfig` to `urlPolicyFrom` to `normalizeConcepts` chain against each site's config). The series
ran before P4 so the scaffolder templates the clean surface.

**A docs anti-drift gate landed alongside the publish (2026-06-06).** Verifying docs currency for the
published window found five drifts passes 1 and 2 had shipped (the upgrade guide missed `0.28.0`/`0.29.0`,
`security-model.md` and `architecture.md` still called the render attribute-sink an open residual that
`0.28.0` closed, and four reference anchors that `0.27.0` moved or removed were still linked across three
pages and a guide), all now fixed. A new `npm run check:docs` link gate (`scripts/docs-links.mjs` plus a
unit test) fails on any dead relative link or stale `#anchor` under `docs/`, and CI now runs both
`check:reference` and `check:docs`. The `cairn-pass` step-5 ritual was hardened (the three doc gates, a
whole-`docs/` drift-grep on a removed or renamed symbol, an upgrade-guide entry for any behavior change, and
a release-notes convention); that edit is in `~/.dotfiles` (`091e33f`). See the
`docs-is-a-pass-dimension` memory.

**Pass 3 (URL-identity consolidation) LANDED on `main` 2026-06-05 as `0.29.0`, unpublished.** It ran
subagent-driven, one `cairn-implementer` per task on `main` directly (no worktree), Tasks 1 and 5 on Opus and
Tasks 2, 3, 4, 6 on Sonnet, plus a simplifier pass and a review fold-in. Six task commits `6554673..ababec2`,
a simplifier commit `8c57c52`, and a review fold-in `b9f025c`. `entryIdentity` (in the new
`src/lib/content/identity.ts`) is the one home for an entry's id, slug, date, and permalink, and
`createContentIndex` and `manifestEntryFromFile` both derive through it, with a `content-permalink-parity`
test pinning that they agree. `resolveConcepts(content, siteConfig)` is the one concept-resolution path
`composeRuntime` and `siteDescriptors` share. `normalizeConcepts` now validates the YAML URL policy at build
(root-relative permalink, known tokens only, a date token requires a dated concept, an in-range `datePrefix`,
and a declared concept key). No public surface changed, so `check:reference`/`check:package` stayed green with
no reference edit. The minor bumps `0.29.0`, no `Consumers must:` line (a valid config needs no action). Gate
green at the tip `b9f025c`, run first-hand: `npm run check` 790 files 0/0, `npm test` 117 files / 701 tests
exit 0, `check:reference` and `check:package` exit 0. The post-mortem is in the plan
(`docs/superpowers/plans/2026-06-05-cairn-url-identity-consolidation.md`); the design spec is
`docs/superpowers/specs/2026-06-05-cairn-url-identity-consolidation-design.md`.

**The review gate caught one real regression, folded in as `b9f025c`.** Routing `createContentIndex` through
`entryIdentity` moved the throwing `permalink()` call before the `descriptor.validate` gate. For a dated
concept that declares `date` required and uses a date-token permalink (the shape both production sites use),
an entry missing its `date` previously degraded to a recorded `ContentProblem` and the build continued, but
the reorder made that one bad entry abort the whole index build. The fold-in restored the
validate-before-permalink ordering (id via the new `entryId` before the gate, the rest from `entryIdentity`
after it) with a regression test, and tightened the unknown-concept guard to treat a declared-but-undefined
content key as undeclared.

**Two pass-3 carry-forwards (recorded, not fixed).** (1) `siteDescriptors` resolves concepts from
`adapter.content` with no extension-content merge, while `composeRuntime` merges extensions first, so an
extension concept keyed in the YAML URL policy would throw in the delivery build under the new
unknown-concept guard while the admin runtime accepts it. The combination is unused today; fixing it means
deciding whether the delivery layer should see extension concepts at all. (2) The validator and the
`permalink()` resolver each restate the permalink token vocabulary, and the validator and `ids.ts` each
restate the date-prefix granularity set; the duplication is small and left separate by intent, derivable from
one source in a future touch.

The previous "engine-hardening before P4" framing is preserved below for history.

The documentation initiative is COMPLETE. The work now is the **engine-hardening series**, the three
release-gate improvements the docs initiative surfaced, sequenced **before P4** so the scaffolder templates
the clean surface. Geoff settled the scope and sequence: the three run as a just-in-time series,
**surface-narrowing first, then render attribute-sink hardening, then URL-identity consolidation**, with
the small engine-side DX riders handled separately (`mintToken` type widening as a trivial standalone, the
`App.Locals.editor` type deferred to P4). Bucket C (the scaffolder-bound install findings) stays in P4.

**Pass 1 (surface-narrowing) LANDED on `main` 2026-06-05.** It ran subagent-driven, one
`cairn-implementer` per task on `main` directly (no worktree, Geoff's call), Tasks 1 and 4 on Opus and
Tasks 2-3 on Sonnet. Four task commits `15035b5..04ce38b` plus a simplifier comment `8bbbf6a`. The root
barrel dropped 34 names (90 to 56 runtime exports): the delivery read surface, the GitHub signing and repo
plumbing, and three internal hast helpers (`isElement`, `strProp`, `markFirstList`). `/sveltekit` stopped
re-exporting the public route surface (the `PublicListData` alias is gone, its `ListData` is now the admin
type), and `GithubKeyEnv` relocated to `/sveltekit`. The two reference pages were pruned to match. The
minor bumps `0.27.0`. Gate green at the tip: `npm run check` 786 files 0/0, `npm test` 114 files / 661
tests exit 0, `check:reference` and `check:package` exit 0. Both production sites build green against the
`0.27.0` `npm pack` tarball (ecnordic and 907 each `check` 0/0 and `build` exit 0). The review gate was the
simplifier (one comment edit) plus a high-effort `/code-review` (no finding). The post-mortem is in the
plan (`docs/superpowers/plans/2026-06-05-cairn-surface-narrowing.md`); the design spec is
`docs/superpowers/specs/2026-06-05-cairn-surface-narrowing-design.md`.

**Three carry-forwards from pass 1.** (1) The import audit had one miss, now fixed in the site:
ecnordic-ski root-imported `isElement` and `markFirstList`, so the fix inlined local copies in the site
(both are pure hast helpers, so the barrel was not weakened), committed in ecnordic as `5183b3f`; 907-life
imported neither. (2) An open design question for pass 2 or P4: `isElement` is a general hast type guard in
the same category as the kept `iconSpan`/`cardShell`/`headRow`/`rehypeDispatch`, and the approved spec drew
it on the internal side, so `0.27.0` ships as designed; whether to add a small public component-authoring
render helper surface (a `/render` authoring subpath) is worth settling where that surface is next in
scope, not widened reflexively now. (3) Both sites carry a pre-existing `composeRuntime` break against their
own `^0.24.0` pin (the positional call predates the `0.24.0` object form), unrelated to this narrowing; a
site-migration pass must update both call sites before either site builds against `0.24.0` or later.

**Pass 2 (render attribute-sink hardening) LANDED on `main` 2026-06-05 as `0.28.0`, unpublished.** It ran
subagent-driven, one `cairn-implementer` per task on `main` directly (no worktree), Tasks 1 and 2 on Opus
and Task 3 on Sonnet, plus a simplifier pass and a review fold-in. Five commits: `dcd3c5a` (the
`rehypeSinkGuard` transform and its 14-case unit suite), `310a85c` (the guard wired last in
`createRenderer`, gated with the floor, three integration tests), `cde9e27` (the `0.28.0` bump, the
changelog, the sanitize-floor doc), `f176e9a` (simplifier: extracted `isSafeUrlProp`), and `701ddab`
(review fold-in). The guard walks the fully-built hast tree and neutralizes the sinks a component `build()`
can route a raw author attribute value into: it scheme-checks the URL-bearing properties (`href`, `src`,
`srcSet`, `xLinkHref`, `poster`, `formAction`, `action`, `data`, `background`), removes every inline `on*`
handler, and strips inline `style` wholesale. The safe-scheme set is derived from `defaultSchema.protocols`
plus `cairn`, so the floor and the guard cannot drift. It runs last, gated by the same `unsafeDisableSanitize`
switch as the floor, and is added to no public barrel. Gate green at the tip `701ddab`: `npm run check` 787
files 0/0, `npm test` 115 files / 684 tests exit 0, `check:reference` and `check:package` exit 0. The
render-pipeline snapshot stayed byte-identical across the pass. The post-mortem is in the plan
(`docs/superpowers/plans/2026-06-05-cairn-render-sink-hardening.md`); the design spec is
`docs/superpowers/specs/2026-06-05-cairn-render-sink-hardening-design.md`.

**The review gate caught one real bug, folded in as `701ddab`.** The `URL_PROPS` set first listed
`xlinkHref`, but `property-information` camelCases `xlink:href` to `xLinkHref` with a capital L, so the SVG
xlink entry was dead code that never matched a real tree, and an SVG anchor carrying a `javascript:`
`xlink:href` from a `build()` would have survived. The high-effort `/code-review` found it, the fold-in
corrected the casing, and the same review surfaced that the set covered `formAction` but not the form-level
`action` and missed `<object>`'s `data` and `background`, all URL sinks the existing scheme check handles, so
those three were added with regression tests. The fold-in confirmed empirically that `data-*` attributes
camelCase to `dataFoo`, so adding `data` catches only the genuine `<object data>` and leaves cairn's
`data-attr-*` dispatch routing untouched, pinned by a test.

**Two pass-2 carry-forwards (the guard's documented boundary).** (1) The guard scheme-checks URL attributes
and strips `on*` and inline `style`. It does not remove a `build()`-emitted raw `<script>`, `<style>`, or
`<iframe srcdoc>` element node, since a `build()` that emits those is running site-developer code and author
markdown is cleaned by the pre-dispatch floor; this is recorded in `docs/render-sanitize-floor.md`. A future
pass that wants parity with the floor for `build()`-emitted element nodes would strip such nodes wholesale,
a different mechanism from the scheme check. (2) The anchor `ping` beacon attribute is left out as a
lower-severity exfiltration sink rather than a script vector; revisit it if a site surfaces a need.

**Pass 3 (URL-identity consolidation) LANDED on `main` 2026-06-05 as `0.29.0`, unpublished.** See the
top entry "Immediate next action" for the landed result, the review fold-in, the carry-forwards, and the
gate evidence. The design spec is `docs/superpowers/specs/2026-06-05-cairn-url-identity-consolidation-design.md`
and the plan with its post-mortem is `docs/superpowers/plans/2026-06-05-cairn-url-identity-consolidation.md`.
This was the last of the three-pass engine-hardening series, so the series is now complete. Publishing stays
held; `main` carries the unpublished `0.27.0`, `0.28.0`, and `0.29.0` over the `0.26.0` `latest`, and the
window publishes together before any site or the scaffolder consumes the new surface.

The engine-adjacent showcase E2E regression the Phase 5 reproduction flagged is confirmed and FIXED
(`ba25359`): the golden-path E2E had drifted on two fronts (a Carta-era editor selector and the single-file
`fake-github` double), both now updated for CodeMirror and the atomic `commitFiles` path, both tests green.
The open follow-up is to wire that E2E into a gate so it stops rotting silently (ROADMAP Later). P4 framing
stays in the "Queued engine capstone" section below; it now follows the three hardening passes.

**The documentation initiative landed across six phases (2026-06-04 through 2026-06-05).** It built a
self-contained docs set for external adopters plus the project-legibility files, and it made
documentation a standing pass dimension. The design spec is
`docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md`. The six phases: 1 legibility and
split, 2 reference, 3 explanation, 4 guides, 5 tutorial, 6 process and infra. It published nothing and
touched no engine code.

**Phase 6 (process and infra) landed 2026-06-05.** It baked the docs-as-a-pass-dimension rule into the
process surfaces, executed inline (cross-repo, process-doc editing, no test-first code). Four edits: the
`cairn-pass` pass-end ritual gained a Documentation step (new step 5, leaning on `npm run check:reference`
and `check:package` for the public-API-matches-reference rule, the rest renumbered to 9); `cairn-cms/CLAUDE.md`
gained a "Documentation is a pass dimension" section; `site-pass` gained a one-line docs-currency note; and
the `docs-is-a-pass-dimension` memory was updated to past tense. The initiative spec's friction-triage line
was reconciled to ROADMAP and STATUS (no backlog). The two skill edits committed in the dotfiles repo
(`~/.dotfiles`, `7b4194e` and `05031e7`); the in-repo edits committed in cairn-cms. The plan is
`docs/superpowers/plans/2026-06-04-cairn-docs-phase-6-process.md` (post-mortem appended there); the design
spec is `docs/superpowers/specs/2026-06-04-cairn-docs-phase-6-process-design.md`. Gate: prose-guard clean on
all four authored files, the CLAUDE.md links resolve, the ritual reads 1 through 9.

**Phase 5 (Tutorial) landed on `main` 2026-06-04.** It built the learning-oriented arm: one page,
`docs/tutorial/build-your-first-cairn-site.md`, milestones 0 through 10, carrying a newcomer from an
empty directory to a working `Field Notes` site running locally and touching the full feature set
(adapter and schema, rendering, a custom `callout` component, the delivery surface, feeds, the nav
menu, the local admin loop through a fenced `CAIRN_DEV_BACKEND` dev backend, and the rot-proof
`cairn:` internal link). It ran subagent-driven, one `cairn-implementer` per task (Tasks 1-4 and 6 on
Opus, Tasks 5 and 7 on Sonnet), ten commits `b46bbeb..cd64cff` on `main`, with `docs/README.md`
flipped to the live tutorial. The plan is
`docs/superpowers/plans/2026-06-04-cairn-docs-phase-5-tutorial.md` (post-mortem appended there); the
design spec is `docs/superpowers/specs/2026-06-04-cairn-docs-phase-5-tutorial-design.md`.

The docs gate ran per writing task and at phase end: no blocking prose tell on the page or the flipped
index, every relative link resolves, each worked example cross-checked against `examples/showcase`. The
capstone (Task 6) is the proof that matters: it followed the finished page literally in a throwaway
`/tmp/field-notes` on the published `@glw907/cairn-cms@0.26.0` (no `main` tarball fallback), and `npm run
cairn:manifest` plus `npm run build` exit 0, the home prerenders both post summaries, the packing-list
page renders the callout and the resolved internal link `/2026/05/01/first-trail`, `npm run check` is
0/0, and the admin loop drives headless (the editor and nav serve, a save commits through the dev
GitHub). The reproduction folded back real page defects as `1eef926` so a newcomer succeeds (`async`
`mintToken`, a dev-GitHub fixture grown to answer the atomic `commitFiles` Git Data API path, and the
project-setup pieces a registry consumer needs that the symlinked showcase hides). Two friction entries
landed: the missing first-class local admin dev mode and the reproduction note, both pointing at P4.

**Carry-forward (engine-adjacent, found by the Phase 5 reproduction), RESOLVED 2026-06-05 (`ba25359`).**
The showcase golden-path E2E (`examples/showcase/e2e/golden-path.spec.ts`) was confirmed broken against the
current engine on two fronts, both masked because Playwright E2E is not in `npm test`. The proximate failure
was a Carta-era editor selector (the editor swapped to CodeMirror at 0.9.0, which removes the SSR textarea).
Behind it, `fake-github.ts` answered only single-file `PUT /contents` while content saves now commit through
the atomic `commitFiles` Git Data API. The fix drives `.cm-content` in the E2E and grows the double to model
the atomic endpoints, recording the `.md` content entry. Both golden-path tests pass. Open follow-up: wire
the showcase E2E into a gate so it stops rotting silently (ROADMAP Later). Detail in the friction log.

Phase 6 (the process phase) then landed and closed the initiative; see the top entry. The canonical next
action is P4.

**The rolled version window is PUBLISHED.** `0.26.0` is now the registry `latest` (the `v0.26.0`
GitHub Release triggered the OIDC trusted-publishing workflow, run `26978850083` green), folding the
unpublished `0.25.0` (DX-A) and `0.26.0` (DX-B) over the prior `0.24.0`. Provenance was disabled in
the publish workflow for this release because the repo is now private and provenance attestation
requires a public repo; restore it when the repo goes public. P4 (the scaffolder) stays queued behind
the docs initiative.

**Phase 1 (legibility and split) landed on `main` 2026-06-04.** It rewrote the README as the adopter
hub, added `SECURITY.md` and `ROADMAP.md`, fixed the npm packaging metadata (ships `CHANGELOG.md`,
adds `homepage`/`bugs`), relocated the historical docs under `docs/internal/` with a banner, added the
`docs/README.md` index, and seeded `docs/internal/docs-friction-log.md`. Eight commits `3323eb8..` on
`main`. Post-mortem at the end of the Phase 1 plan
(`docs/superpowers/plans/2026-06-04-cairn-docs-phase-1-legibility.md`). One carry-forward: private
vulnerability reporting could not be enabled because the repo is private (the API 404s); `SECURITY.md`
describes the intended public-state channel, and the gap is logged in the friction log.

**Phase 2 (Reference) landed on `main` 2026-06-04.** It added an export-coverage gate plus seven
hand-curated reference pages, one per package export subpath, behind an automated check. Nine commits
`47092f8..03c1c3d` on `main`. The gate (`scripts/reference-coverage.mjs`) enumerates each subpath's
real exports from the built `.d.ts` through the TypeScript compiler API and fails when a page omits a
name; `npm run check:reference` builds `dist` first, then checks all seven subpaths. The pages live
under `docs/reference/`: `core.md` (the `.` root, 174 exports tiered Stable / Low-level / Types),
`sveltekit.md`, `components.md`, `delivery.md` (with `/delivery/head` folded in), `delivery-data.md`,
`vite.md`, and the `cli-cairn-manifest.md` bin page, plus a reference index that flips the docs-index
Reference line. Task 1 added the gate and its unit test and cleared the full engine gate (`npm run
check` 786 files 0/0, `npm test` 658 tests exit 0); the seven page tasks each cleared the docs gate
(coverage `OK`, no blocking prose tell, links resolve). The gate was verified fail-closed at the
phase end. Post-mortem at the end of the Phase 2 plan
(`docs/superpowers/plans/2026-06-04-cairn-docs-phase-2-reference.md`).

The pass surfaced three design-friction findings, all in `docs/internal/docs-friction-log.md` and all
pointing at one future surface-narrowing engine pass: the `.` root over-exports 174 names with
internal helpers leaked through `export *`; the `.` root re-exports the whole delivery builder set, so
those symbols document on two pages; and `/sveltekit` re-exports the public route-data types whose
home is `/delivery`, forcing a `PublicListData` alias off a `ListData` collision.

**Phase 3 (Explanation) landed on `main` 2026-06-04.** It built the understanding-oriented arm under
`docs/explanation/`: four pages plus an index, with the functional spec reconciled to point at the arm.
It ran subagent-driven, one `cairn-implementer` per page (Opus for the three synthesis pages, Sonnet
for the relocate and the wiring), five task commits `eab6c61..69ba190` on `main` directly. The plan is
`docs/superpowers/plans/2026-06-04-cairn-docs-phase-3-explanation.md` (post-mortem appended there); the
design spec is `docs/superpowers/specs/2026-06-04-cairn-docs-phase-3-explanation-design.md`. The pages:
`data-tiers.md` (relocated from `docs/data-architecture.md`, `git mv` with history preserved, light
refresh, no drift found), `architecture.md` (the layered model and the commit/publish flow, two Mermaid
diagrams), `security-model.md` (auth, GitHub-App commit trust, render safety, origin and CSRF, with
`SECURITY.md` repointed to the new hub), `content-model.md` (fixed concepts, URL identity, schema as the
source of truth, the content graph, one Mermaid diagram), and `explanation/README.md` (the arm index,
flipping the `docs/README.md` Explanation line). Three Mermaid diagrams total across the arm, inside the
two-to-three budget.

The arm corrected the stale source docs against the current engine where it drew on them: CodeMirror not
Carta, the `render` adapter method not `renderPreview`, self-owned D1 magic-link not better-auth, fixed
concepts not `collections[]`. The render-sink honesty check confirmed the documented residual stays
site-developer-controlled (a component `build()` reaching a URL or style sink), not reachable by an author
through markdown alone, so no escalation; the existing friction entry stands. Phase 3 added one friction
entry (the URL-identity spread, corroborated firsthand while writing `content-model.md`).

The page gate ran per page and again at the phase end: `prose-guard` shows no blocking tell on any of the
seven authored files (advisory tells only: tricolon, low burstiness, anaphora, passive), every relative
link across the arm and the flipped `docs/README.md` and the repointed `SECURITY.md` resolves, and
`grep -rn data-architecture docs/README.md SECURITY.md` is clean (the old path is retired from the live
public docs; historical references under `docs/superpowers/` and dated `docs/STATUS.md` entries stay as
records). No `npm run check`, `npm test`, review subagent, or `/admin` smoke applied, because the arm
changes no engine code and adds no test.

The three release-gated engine improvements the brainstorm surfaced stand unchanged (see `ROADMAP.md`
"Engine hardening before the next release", the friction log, and the `cairn-engine-hardening-release-gate`
memory): narrow the public export surface, harden render attribute sinks, consolidate the URL-identity
model. They must land before the next `0.x` publish. The docs initiative publishes nothing, so it does not
trip the gate.

**Phase 4 (Guides) landed on `main` 2026-06-04.** It built the task-oriented arm under `docs/guides/`:
seven how-to guides plus an index, with the docs-index How-to-guides line flipped to point at the arm. It
ran subagent-driven, one `cairn-implementer` per task (Opus for the three full engine-surface guides,
Sonnet for the three lean guides, the relocate, and the index), eight task commits `f11b370..455b356` on
`main` directly. The plan is `docs/superpowers/plans/2026-06-04-cairn-docs-phase-4-guides.md`
(post-mortem appended there); the design spec is
`docs/superpowers/specs/2026-06-04-cairn-docs-phase-4-guides-design.md`.

The three-tier split held. The three lean setup guides (`set-up-the-github-app.md`,
`configure-auth-and-d1.md`, `deploy-to-cloudflare.md`) state goal, steps, and verify, then link the
authoritative ops docs (`github-app-key-rotation`, `admin-smoke-test`, `admin-route-structure`) and draw
their facts from the engine source and `CLAUDE.md`, because `examples/showcase` runs `adapter-node` and
cannot validate the Cloudflare/D1/GitHub-App loop. The three full guides (`define-an-adapter-and-schema.md`,
`configure-rendering.md`, `wire-the-delivery-surface.md`) carry a worked example copied from the real
showcase config, content, routes, and Vite plugin. `upgrade-cairn.md` relocated from `docs/upgrading.md`
with `git mv` (history preserved, no CHANGELOG drift, no content edit). The arm index groups the seven by
reading sequence (set up the backend, build the site, maintain).

The page gate ran per task and again at the phase end: `prose-guard` shows no blocking tell on any of the
eight authored files (advisory tells only: tricolon and anaphora on two of them), every relative link
across the arm and the flipped `docs/README.md` resolves, and `grep -n upgrading.md docs/README.md` is
clean (the old path is retired from the live public docs; historical references under `docs/superpowers/`
and dated `docs/STATUS.md` entries stay as records). No `npm run check`, `npm test`, review subagent, or
`/admin` smoke applied, because the arm changes no engine code and adds no test.

The arm surfaced one design-friction finding (in `docs/internal/docs-friction-log.md`): the adapter guide
asked for an adapter step setting the slug codec and `datePrefix`, but the real showcase adapter carries
neither, because the URL policy and `datePrefix` live in the YAML site config. The implementer wrote the
guide to the real showcase shape rather than invent adapter fields. This corroborates the URL-spread
finding already release-gated under the surface-narrowing pass; it extends no backlog. The three
release-gated engine improvements stand unchanged (`ROADMAP.md`, the friction log, the
`cairn-engine-hardening-release-gate` memory).

**Phase 5 (Tutorial) planning record (2026-06-04), executed; see the top entry for the landed result.** The
design spec is `docs/superpowers/specs/2026-06-04-cairn-docs-phase-5-tutorial-design.md` (`a0d5a27`); the
plan is `docs/superpowers/plans/2026-06-04-cairn-docs-phase-5-tutorial.md` (`5e34d5a`). Seven tasks build one page,
`docs/tutorial/build-your-first-cairn-site.md`, a teach-once Diátaxis tutorial that carries a newcomer from
an empty directory to a first working `Field Notes` site running locally. The forks settled with Geoff: the
spine is a minimal-slice local loop widened to touch the full feature set (custom components, the
link-picker search, feeds, the admin loop); the admin-only features run locally through a fenced, copy-paste
dev-backend fixture (a fake-GitHub double plus a fake-editor hook behind `CAIRN_DEV_BACKEND=1`, mirroring
the showcase's `SHOWCASE_FAKE_BACKEND` and handed to the deploy guides for the real App and D1); the start is
build-from-scratch with copy-paste blocks for the scaffolder-bound route boilerplate; and the capstone is a
build-and-run reproduction (Task 6 scaffolds the target site in a throwaway directory and runs a real build).
The missing first-class local admin dev mode is logged as friction for P4.

This plan executed as written on `main` (Tasks 1-4 and 6 on Opus, Tasks 5 and 7 on Sonnet, the docs-gate
override honored, Task 6 the one real `vite build`). The landed result, the verification evidence, and the
engine-adjacent carry-forward are in the top entry; the post-mortem is in the plan file.

## Sequence to the scaffolder (resequenced 2026-06-05): cleanup, then gallery, then P4 last

Geoff resequenced the run to the scaffolder on 2026-06-05: clear all the cleanup, then build the image
and gallery initiative, then the `create-cairn-site` scaffolder (P4) last. The driving rule is that P4
is the true capstone, so it must template a surface that is already hardened, DX-complete, and
image-aware. The scaffolder runs after the gallery so the template ships image support baked in, and
after the pre-scaffold DX is cleared so it does not bake a stale surface.

**The split that makes "all the DX before the scaffold" concrete.** Most of the ecnordic DX backlog
(`docs/internal/dx-backlog-ecnordic-migration.md`) is the scaffolder's OWN output, so those items land
in P4, not ahead of it: item 4 (do not emit `prerender.handleHttpError: 'warn'`, so a dangling link
fails the build), item 14 (the route stub registers all four admin actions by default), item 16 and the
backlog's "Scaffolder checklist" (emit the manifest wiring whole, one obvious import surface with a
component-free node path, teach the single sanitize floor, state the `cairn:` link constraint in the
scaffolded README), plus the tutorial-reproduction worklist (a fenced local dev backend, the
`App.Locals.editor` type augmentation, omit `static/robots.txt`, declare `@types/node`). These are done
BY P4.

**The pre-scaffold engine DX, to clear during cleanup so P4 templates the final shape:**
- P3 ergonomics carry-forwards the scaffolder seed and components use: a `strAttr(ctx, key)` context
  helper, a `registry.iconField(name)` hoist, a `defineRegistry` guard for `defaultIconByRole` without an
  icon attribute, a configurable `headRow` heading level, and multiple `type:'icon'` fields resolving to
  first-wins.
- DX-B engine carry-forwards: the manifest-bin `cwd` versus Vite `config.root` principled fix (separate
  the config-file location from the Vite root), and a plain-Node dist-spawn test that rot-proofs the
  `/delivery/data` node-safety guarantee.
- The `mintToken` async signature alignment in the docs and the showcase composer, a small fix.
- Item 5's engine half: the editor link picker offers only real content targets, so a `cairn:` token
  cannot be minted for a hand-built route (the doc half rides along).
- The open `/render` public component-authoring surface question (pass-1 carry-forward): decide it before
  the scaffolder templates component authoring, since the answer changes what the template imports.
- Infra: wire the showcase golden-path E2E into a gate (ROADMAP Later) so a surface-growing change cannot
  rot it silently; best done before the surface grows under the gallery and P4.

**The cleanup phase, in order:** execute pass 3 (URL-identity consolidation, the immediate next action
above), publish the held window (`0.27.0` + `0.28.0` + `0.29.0` over the `0.26.0` `latest`), then the
DX-completeness sweep. The sweep is decomposed (2026-06-05) into three passes by verification surface, run
A then B then C: **Pass A (render authoring)**, **Pass B (tooling and CI robustness)**, **Pass C (admin and
consumer alignments)**. Then the gallery initiative (a `superpowers:brainstorming` first for the
git-versus-R2 storage fork). Then P4, authored just-in-time once the surface it templates is final.

**DX-sweep Pass A is EXECUTED (landed 2026-06-06 as `0.30.0`, unpublished); see the top entry for the
landed result, the review fold-in, and the carry-forwards.** The design spec
is `docs/superpowers/specs/2026-06-05-cairn-render-authoring-surface-design.md`; the plan is
`docs/superpowers/plans/2026-06-05-cairn-render-authoring-surface.md`. It carves a public
`@glw907/cairn-cms/render` authoring subpath (relocating `iconSpan`/`cardShell`/`headRow`, re-homing
`isElement`, adding `strAttr`, with a reference page), lands the P3 render ergonomics (`strAttr`, a
configurable `headRow` level, a `registry.iconField` hoist, a `defineRegistry` icon guard, first-wins icon
resolution), and drops `rehypeDispatch` from the public surface (reasoning recorded in the spec:
`createRenderer` is the one public render pipeline). Seven tasks, a breaking minor (`0.30.0`), with a
`Consumers must:` line. The keystone fork (carve `/render` over keeping authoring helpers on root) was
settled against cairn's own coupling-boundary splits and the ecosystem norm. Passes B and C are scoped in
the "Sequence to the scaffolder" split above and get their own specs when their turn comes. Pass A executes
only after pass 3 ships and the window publishes, so its version step bumps the next minor above the
published baseline.

The workspace-flatten infra task is DONE (executed inline 2026-06-04, post-mortem in
`docs/superpowers/plans/2026-06-04-workspace-flatten-and-claude-infra.md`). cairn-cms is a standalone
repo at `~/Projects/cairn-cms`, both sites resolve the published package from the registry, and the
per-project memory moved to the new working-directory keys.

## Absorbed into the docs initiative: docs-refresh items (documented 2026-06-04)

A docs-accuracy sweep during the workspace flatten found cairn-cms documentation that predates later
engine passes. The two consumer sites and the durable front-door docs (README, CLAUDE.md) were fixed in
that pass. The items below are now scheduled within the documentation initiative's later phases
(reference, explanation, guides, tutorial) rather than a separate pass.

- **Functional spec** (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`): accurate on
  auth and the fixed-concepts model, but it predates the `0.9.0` editor swap, so it describes a Carta
  editor throughout (lines 30, 51, 57, 89, 101, 144, 196, 267, 310, 338) when the `MarkdownEditor` seam
  is now CodeMirror 6, and it names the old `renderPreview` adapter method (lines 168, 268, 374) that the
  public-delivery pass renamed to `render`. Planned action: a targeted update of the Carta-to-CodeMirror
  references and `renderPreview`-to-`render`, plus a dated note that the editor swapped at `0.9.0`. Keep
  the rest as the locked design record.
- **`docs/creating-a-cairn-site.md`** (537 lines): broadly pre-rebuild (better-auth, a generic
  `collections[]` array, `renderPreview`, `AUTH_SECRET`, a pointer to the superseded ARCHITECTURE.md
  section 4). Decision (Geoff): MARK SUPERSEDED. Add a header pointing at the functional spec,
  `examples/showcase`, and the forthcoming P4 create-cairn-site scaffolder, and leave the body as history
  rather than rewriting a doc the scaffolder will replace.
- **`cairn-implementer` agent** (`~/.dotfiles/claude/.claude/agents/cairn-implementer.md`): the body
  still carries a `carta-md` client-only note (now CodeMirror) and a `rebuild`-branch assumption (the
  branch merged; later work runs on feature worktrees off `main`). Refresh both in the dotfiles checkout.
- `docs/PLAN.md` and `docs/ARCHITECTURE.md` stay as labeled history (CLAUDE.md and README mark them so);
  no rewrite intended.

## Where the work is (2026-06-04, DX-B manifest Vite plugin executed; 0.26.0 unpublished)

**DX-B is executed and review-gated, landed on local `main`.** It ran subagent-driven, one
`cairn-implementer` per task (Opus for the Task 1 spike, the Task 4 package entry, the Task 5 bin, and the
Task 6 showcase finalize; Sonnet for the barrel split, the diff, and the version bump), on a feature
worktree off `main` (`dx-b-manifest-plugin`). Seven task commits `26fee41..bb4823b`, a review fold-in
`fce30ab`, and the post-mortem `8403981`, fast-forward merged to `main` at `8403981`, worktree removed.
**Local only, not pushed, not published.** The minor bumps to `0.26.0`.

The pass replaces the per-consumer manifest boilerplate with a `cairnManifest()` Vite plugin from a new
`@glw907/cairn-cms/vite` entry. The plugin owns a `virtual:cairn-manifest` module that runs
`import.meta.glob` over the configured content globs inside the app's own Vite graph, builds the manifest,
and verifies it against the committed file in `buildStart` through a nested Vite SSR load, so a drift fails
the build as a hard error outside the prerender lifecycle (ecnordic #4 closed by construction, even under
`handleHttpError: 'warn'`). A shipped `cairn-manifest` bin evaluates the same virtual module in write mode
to regenerate (907 #2). A node-safe `@glw907/cairn-cms/delivery/data` barrel re-exports the pure
projections with no `@sveltejs/kit` in the graph, so the plugin and the bin import the builder from plain
Node (907 #3). `verifyManifest` now names the added, removed, and changed entries through a pure
`diffManifests` (907 #7). The in-graph virtual module is the one shared resolver the build and the
regenerate both use (ecnordic #13). The showcase drops `scripts/build-manifest.mjs`, wires the plugin, and
removes its in-`content.ts` verify.

Gate at the fold-in tip `fce30ab`, run first-hand: `npm run check` 781 files 0/0, `npm test` 113 files /
655 tests exit 0, `npm run check:package` all entries green including the new `./vite` and `./delivery/data`
subpaths. The headline end-to-end proof is the showcase production build with `handleHttpError: 'warn'` set:
clean build exit 0, a deliberately stale manifest fails the build exit 1 in `buildStart` at `0 modules
transformed` with the structured diff printed, and a regenerate goes green. The Task 1 spike proved the
nested-SSR verify mechanism against the real showcase toolchain before the public surface was built. The
review gate was the simplifier (no change) plus a high-effort three-angle `/code-review` (no critical bug;
node-safety verified empirically by importing the built `dist/delivery/data.js` from plain Node). Two
confirmed findings folded in as `fce30ab`: the diff now canonicalizes the built side so a links reorder no
longer reports a false `links` drift, and the recursion-avoidance plugin strip is now recursive so a nested
`cairnManifest()` cannot survive into the nested verify server. The Worker, auth, Svelte, and a11y reviewers
and the live `/admin` smoke did not apply. The full post-mortem is in
`docs/superpowers/plans/2026-06-04-cairn-dx-b-manifest-plugin.md`.

**Migration gotchas this pass lands** (all in the `0.26.0` changelog with `Consumers must:` lines). A
consumer adds `cairnManifest({ configModule, content, manifestPath })` to its Vite config, switches the
regenerate script to `"cairn:manifest": "cairn-manifest"` and deletes the hand-written
`scripts/build-manifest.mjs`, and moves any plain-Node import of a delivery data helper (such as
`buildSiteManifest`) from `@glw907/cairn-cms/delivery` to `@glw907/cairn-cms/delivery/data`.

**Carry-forwards (for P4 or a later touch).** The `cairn-manifest` bin resolves its paths against
`process.cwd()` while the plugin verifies against the resolved Vite `config.root`; they agree for every
SvelteKit consumer run from its project root, and diverge only under a custom Vite `root` (the principled
fix separates the config-file location from the Vite root, deferred). The node-safety guarantee is proven
empirically this pass, so a plain-Node dist-spawn test would rot-proof it. A first build before
`cairn:manifest` has ever run (a freshly scaffolded site with no manifest file) fails with a cryptic Vite
resolve error rather than a "run cairn:manifest" message, which P4 should address since it emits the wiring.
The DX-A showcase-install carry-forward (pin or dedupe the SvelteKit toolchain against the linked package)
now also covers a symlink-dev artifact this pass surfaced: the showcase `npm run check` reports about 24
type errors in a dev worktree, all in `node_modules` or the `vite.config.ts` plugin-type line and none in
showcase `src/`, because the worktree-root install carries a second physical SvelteKit toolchain that
`svelte-check` reaches through the package symlink. The proven `main` checkout has no root vite, so its
showcase check is clean, and a published consumer is unaffected. The acceptance proof for the showcase
tasks is the production build, which is green.

**Immediate next action: brainstorm and write P4, the `create-cairn-site` scaffolder, in a fresh session.**
P4 is the capstone of the DX sequence, authored just-in-time now that DX-A and DX-B have corrected the
engine surface. Run `superpowers:brainstorming` first to settle the scaffolder's open design decisions with
the user (the template contract, the two reference templates, what defaults and docs it emits), since the
spec leaves the scaffolder open; do not auto-write the plan without the user's design calls. P4 consumes the
DX-B plugin and emits the `cairnManifest()` wiring plus the `cairn:manifest` script, and it carries the
remaining ecnordic items (5, 6, 14), the DX-A showcase-install carry-forward, and the DX-B carry-forwards
above. Publishing stays held: `0.24.0` is the registry `latest`, and `main` carries the unpublished `0.25.0`
(DX-A) and `0.26.0` (DX-B); publish the rolled window before any site or the scaffolder consumes
`@glw907/cairn-cms/vite`, `@glw907/cairn-cms/delivery/data`, or the `cairn-manifest` bin.

## Where the work is (2026-06-04, DX-A engine-surface ergonomics executed; 0.25.0 unpublished)

**DX-A is executed and review-gated, landed on local `main`.** It ran subagent-driven, one
`cairn-implementer` per task (Sonnet throughout, the tasks were mechanical), on a feature worktree off
`main` (`dx-a-ergonomics`). Six task commits `38499ef..e867ab5` plus a review-gate fold-in `3cb5860`,
fast-forward merged to `main` at `3cb5860`, worktree removed. **Local only, not pushed, not published.**
The minor bumps to `0.25.0`.

The pass closes five small 907-migration findings. `createRenderer()` now defaults its registry to the
empty registry, so a plain-prose blog calls it with no argument (907 #1). `composeRuntime` takes one
`ComposeInput` object, `composeRuntime({ adapter, siteConfig, extensions? })`, and derives the per-concept
URL policy from `siteConfig` through the same `urlPolicyFrom` call the delivery path uses, so the runtime
and delivery permalinks cannot diverge and a missing `siteConfig` throws (907 #6); the showcase wires the
single shared `siteConfig` at every call, the pattern the scaffolder will emit. The `freetags` two-layer
invariant is pinned with regression tests and named in the type and validator comments, no behavior change
(907 #4). `docs/render-sanitize-floor.md` documents what the floor keeps, strips, and rewrites (907 #8).
`docs/upgrading.md` plus a "Consumers must:" `CHANGELOG.md` convention collect the `0.x` renames with a
consumer action each (907 #5).

Gate at the merge tip `3cb5860`, run first-hand: `npm run check` 775 files 0/0, `npm test` 110 files /
643 tests exit 0; the showcase carries its own gate (Task 3), `check` 405 files 0 errors and a production
build exit 0. The review gate was the simplifier (no change, the compose rewrite mirrors the delivery path
by construction) plus a high-effort Opus `/code-review` that returned SHIP with no Critical and no
Important; two minor accuracy nits folded in as `3cb5860` (the sanitize-floor doc scopes the `data:` strip
to `href` since an image `src` still admits a `data:` URI under `defaultSchema`, and the validator comment
names `freetags` alongside `tags`). The Svelte, a11y, Worker, and auth reviewers and the live `/admin`
smoke did not apply. The full post-mortem is in the plan file
`docs/superpowers/plans/2026-06-04-cairn-dx-a-ergonomics.md`.

**One carry-forward for the scaffolder (from Task 3).** A naive `npm install` inside `examples/showcase`
pulls a newer `@sveltejs/kit`/`vite` than the linked root pins, and `svelte-check` then reports
duplicate-identifier errors inside `node_modules` (two physical kit/vite copies), none in showcase `src/`.
The scaffolder or a showcase install doc should pin or dedupe the SvelteKit toolchain against the linked
package so the gate stays reproducible.

**The `cairn-pass` ritual gained the "Consumers must:" step.** The pass-end consolidation now enforces a
"Consumers must:" line on any breaking change in `CHANGELOG.md`. That skill file lives outside this repo,
so it was edited at pass-end (the DX-A handoff item), not committed here.

**DX-B is brainstormed, specced, and planned on `main` (2026-06-04), not yet executed.** The design spec is
`docs/superpowers/specs/2026-06-04-cairn-dx-b-manifest-plugin-design.md` (`9690537`), sharpening the DX-B
section of the combined hardening spec; the plan is
`docs/superpowers/plans/2026-06-04-cairn-dx-b-manifest-plugin.md` (`44e1990`). Seven tasks, bumps `0.26.0`.
Four forks settled in the brainstorm: the build-time verify reads the corpus through a plugin-owned
**in-graph virtual module** (uses the build's exact `import.meta.glob` resolution, closing ecnordic #13 by
construction, at the cost that regenerate must also run in a Vite context); the node-safe entry is the
**`@glw907/cairn-cms/delivery/data` barrel** (chosen on architecture merit over a narrow `/manifest` entry,
since it isolates the kit coupling generally, matches the P1 `/delivery/head` split run deeper, and removes
the dual-barrel drift); a pure **`diffManifests`** names what drifted (907 #7); and regenerate is a shipped
**`cairn-manifest` bin** (907 #2). Task 1 is a toolchain spike that proves the Vite evaluation mechanism (the
verify as a build error outside prerender, and the bin's write evaluation) against a real SvelteKit build
before the rest leans on it, the Plan-07 locked-build-assumption lesson applied first.

**Immediate next action: execute DX-B,
`docs/superpowers/plans/2026-06-04-cairn-dx-b-manifest-plugin.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task), on a feature worktree off
`main`. Start at Task 1.** Dispatch Task 1 (the spike), Task 5 (the bin), and Task 6 (showcase finalize)
`model: opus` (judgment-heavy); the rest fit the Sonnet default. The design is settled and approved, so skip
brainstorming. The pass-end review gate is the simplifier plus a high-effort `/code-review` (attention to the
Vite mechanism and the node-safety guarantee); `cloudflare-workers-reviewer` and `web-auth-security-reviewer`
do not apply, `svelte-reviewer` only if a `.svelte` file changes, and the live `/admin` smoke does not apply
(no auth, Worker, or admin-UI surface change). After DX-B lands, P4 (the `create-cairn-site` scaffolder) is
the capstone, carrying the remaining ecnordic items (5, 6, 14) and the DX-A showcase-install carry-forward
above. Publishing stays held: `0.24.0` is the registry `latest`, and `main` carries the unpublished `0.25.0`
(DX-A) and will carry `0.26.0` (DX-B) until the window publishes together before a site consumes the new
entries.

## Where the work is (2026-06-04, 907 migration landed; DX-A spec + plan written, not executed)

**The 907-life migration shipped** (907 Pass 16, 2026-06-04) on `^0.24.0` with `datePrefix: 'day'`, the
second proving ground on the corrected surface. It produced a DX feedback doc at the workspace root,
`cairn-dx-feedback-2026-06-04.md`, eight findings from the `0.6` to `0.24` jump.

**The 907 feedback is triaged into two engine passes before the scaffolder.** Most of it sharpens the
existing ecnordic backlog; three items are new to the engine surface. The design spec covering both
passes is `docs/superpowers/specs/2026-06-04-cairn-dx-907-hardening-design.md` (`7c44eae`). Two locked
forks settled with the user: the manifest toolchain is rebuilt as a Vite plugin (verify-on-build, fail
the build red with a real diff, one resolver shared with the build), and the work splits into two passes
rather than one.

- **DX-A (engine-surface ergonomics and docs)** is the immediate next action. The plan is
  `docs/superpowers/plans/2026-06-04-cairn-dx-a-ergonomics.md` (`ee4a124`), six tasks closing 907 #1
  (`createRenderer` defaults to the empty registry), #6 (`composeRuntime` takes one object input and
  derives the URL policy from the site config, the loose third argument gone, a missing config throws),
  #4 (the `freetags` two-layer invariant pinned and documented, no behavior change), #8 (a sanitize-floor
  reference doc), and #5 (a "Consumers must:" changelog convention plus `docs/upgrading.md`). It bumps
  `0.25.0`. The `composeRuntime` object form breaks every caller; Task 2 updates the engine and the
  compose tests, Task 3 the showcase. The root `npm run check` does not cover the showcase, so Task 3
  carries its own check and build.
- **DX-B (the manifest Vite plugin)** is scoped in the spec and its detailed plan is authored
  just-in-time after DX-A lands, because the plugin design sharpens once the node-safe subpath (907 #3)
  is real. It folds 907 #2/#3/#7 and ecnordic #13/#4.
- **P4 (the scaffolder)** stays the capstone after DX-B, carrying the remaining ecnordic items (5, 6, 14).

**Immediate next action: execute DX-A, `docs/superpowers/plans/2026-06-04-cairn-dx-a-ergonomics.md`,
`subagent-driven` (`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet
default; the tasks are mechanical, no Opus dispatch needed), on a feature worktree off `main`. Start at
Task 1.** The design is settled and approved, so skip brainstorming. The pass-end review gate is the
simplifier plus a `/code-review`; `svelte-reviewer`, `daisyui-a11y-reviewer`, the Worker/auth reviewers,
and the live `/admin` smoke do not apply (no auth, Worker, or admin-UI surface changes; the showcase
admin routes change only their `composeRuntime` call shape). One handoff item lands with this pass: the
`cairn-pass` pass-end ritual gains a step enforcing the "Consumers must:" changelog line on any breaking
change, a skill edit outside this repo, applied at pass-end. After DX-A lands, draft and execute DX-B.

## Where the work is (2026-06-03, DX pass P3 / render and component authoring executed; 0.24.0 unpublished)

**P3, the render and component-authoring touch-ups, is executed and review-gated on `main`.** It ran
subagent-driven, one `cairn-implementer` per task (Sonnet for the mechanical tasks, Opus for Task 2's
byte-identical snapshot migration and Task 6's showcase build gate), seven task commits
`4a9cf55..7afb031` plus a review-gate fold-in `c6ecdbc`. **Local only, not pushed, not published.** The
minor bumps to `0.24.0`.

The pass closes five render and component-authoring findings from the ecnordic DX backlog (items 7, 8,
9, 11, 15). The unifying correction (item 9) routes a component's resolved icon through the declared
`type: 'icon'` attribute: the stamper reads the author value, falls back to `defaultIconByRole`, and
folds the result into that field's `data-attr-<key>`, so a role default now reaches the build through
the one declared path. The dead `dataIcon` marker is gone (dropped from the stamp, `FIXED_MARKERS`, and
the doc comment; `grep -rn "dataIcon" src/` is empty). The new `headRow(title, icon?)` helper builds the
icon-plus-heading head and is exported beside `cardShell`/`iconSpan`. `createRenderer` gained an
`anchorRel` option (`string | false`) over the `target="_blank"` rel policy (default `noopener
noreferrer`). The engine drops an unclaimed directive `[label]` on a title-less component. The site
guide states the declared-attribute contract, the icon-attribute requirement, `headRow`, `anchorRel`,
and the no-`[]` template rule. The showcase wires an `alert` proving items 7 and 9 through a real build.

Gate at the fold-in tip (`c6ecdbc`), run first-hand: `npm run check` 779 files 0/0, `npm test`
110 files / 638 tests exit 0, `npm run check:package` exit 0. The render-pipeline snapshot stayed
byte-identical across the pass (no `-u`). The showcase production build exits 0, the home still lists
its post summaries, and the hello post carries `class="ec-head"` and the `caution` role-default
`leaf` glyph (`class="ec-icon"`). The review gate was the simplifier (no change) plus a high-effort
seven-angle `/code-review`, which found one actionable defect, folded in as `c6ecdbc`: a blank
`icon=""` was kept and defeated the resolved role default (`?? icon` preserved the empty string), while
a missing `icon` resolved it. The fix writes the already-resolved `icon` directly, so blank and missing
behave alike, and it collapsed the icon double-read the simplification angle flagged. A regression test
locks it. The Svelte, a11y, Worker, and auth reviewers and the live `/admin` smoke did not apply. The
full post-mortem with the review triage and the carried follow-ups is in
`docs/superpowers/plans/2026-06-03-cairn-render-authoring.md`.

**The rolled window is PUBLISHED.** `main` is pushed (`d9bf1b6..7e9d49f`) and the
`0.22.0`/`0.23.0`/`0.24.0` window published together as `0.24.0`, now `latest` on npm (OIDC
trusted-publishing workflow off the `v0.24.0` GitHub Release, run `26916856627` green, build provenance
attached), rolling over the prior `0.21.0`. P1 (delivery read-model), P2 (schema validation), and P3
(render and component authoring) are all live.

**Immediate next action: the 907-life migration.** Run it as a `site-pass` in the 907-life repo, pinning
`^0.24.0`, with `datePrefix: 'day'`. It is the second proving ground on the corrected surface (the first
was the ecnordic `0.21` migration that produced this DX backlog). After 907 lands, draft and execute
**P4, the `create-cairn-site` scaffolder** (the capstone, DX items 4, 5, 6, 13, 14, 16), authored
just-in-time once 907 has exercised the corrected surface. There is no new cairn-cms engine plan to draft
right now: the 907 migration is a site pass authored in the 907 repo, not a cairn-cms plan. The migration
gotchas in the entries below still apply (pass every declared concept's glob, declare every read
frontmatter key, the P2 strict-date and closed-tags failures, resolve `cairn:` links wherever a body
renders to HTML).

The carried P3 follow-ups (a `strAttr(ctx, key)` context helper, a `registry.iconField(name)` hoist, a
`defineRegistry` guard for `defaultIconByRole` without an icon attribute, a configurable `headRow` heading
level) feed P4 and later DX touches.

## Where the work is (2026-06-03, DX pass P2 / schema validation executed; 0.23.0 unpublished)

**P2, the schema-validation touch-ups, is executed and review-gated on `main`.** It ran
subagent-driven, one `cairn-implementer` per task (Sonnet throughout, the tasks were mechanical),
seven task commits `a3015a0..2160c42` plus a simplifier commit `4add8d7`. **Local only, not pushed,
not published.** The minor bumps to `0.23.0`.

The pass restores the four validations the schema cutover dropped and tightens two declaration-time
contracts. A `date` field now validates a real `YYYY-MM-DD` calendar date through the new pure
`isCalendarDate` helper in `frontmatter.ts`, rejecting an impossible date such as `2026-02-30`, an
unpadded value, or a value carrying a time, while still coercing a parsed YAML `Date`. A `tags` field
enforces its declared `options` as a closed vocabulary (`freetags` stays open). `normalizeConcepts`
throws at config load on a `summaryFields` key that names no declared field. `AttributeField.options`
widened to `readonly string[]`, so a site can share one frozen `as const` vocabulary with no call-site
change. At-least-one-tag was already covered by `required: true` and needed no code.

Gate at the simplifier tip (`4add8d7`), run first-hand: `npm run check` 779 files 0/0, `npm test`
110 files / 631 tests exit 0, `npm run check:package` exit 0. The package and showcase builds exit 0
and the prerendered home still renders all three posts, proving the stricter checks dropped no
showcase entry. The review gate was the simplifier (one consistency fix folding the `summaryFields`
guard onto the same `.find()` shape as the tags check) plus a high-effort four-angle `/code-review`,
which surfaced no actionable defect within cairn's content domain. The Svelte, Worker, auth, and a11y
reviewers and the live `/admin` smoke did not apply. The full post-mortem with the review triage and
the carried follow-ups is in `docs/superpowers/plans/2026-06-03-cairn-schema-validation.md`.

**Two migration gotchas land with this pass** (both intended, documented in the `0.23.0` changelog).
A migrating site whose committed content holds a non-canonical string `date` (an ISO datetime, an
unpadded value) will see that entry fail validation on its next `/admin` save; the save path
canonicalizes a `Date` instance, so the exposure is a hand-edited or migrated string date. A post
carrying a `tags` value the site has since removed or renamed from its `options` fails the same way.
Both are the loud failure P2 restores. One recorded known limitation: `isCalendarDate` rejects years
0000 through 0099 because of JavaScript's two-digit-year `Date` coercion, outside the cairn date
domain and left unfixed by design.

**P3 is brainstormed, specified, and planned on `main` (2026-06-03), not yet executed.** The design
spec is `docs/superpowers/specs/2026-06-03-cairn-render-authoring-design.md` (`abdb6ef`); the plan is
`docs/superpowers/plans/2026-06-03-cairn-render-authoring.md` (`a9a627c`). Seven test-first tasks
covering DX items 7, 8, 9, 11, 15: the `headRow` head helper (item 7), routing the `defaultIconByRole`
default through the declared `type: 'icon'` attribute and dropping the dead `dataIcon` marker (item 9,
the unifying correction), the `anchorRel` `createRenderer` option (item 11), dropping an unclaimed
directive label (item 15), and the declared-attribute contract in docs (item 8, docs-only). The pass
bumps `0.24.0`, runs on `main`, and is additive plus two output bugfixes. One design call settled with
the user: item 8 is resolved by documentation, not a runtime dev warning (the item-9 fix removes the
concrete footgun, and a build is site-developer code with immediate feedback). Tasks 2 and 6 are
judgment-heavy (the byte-identical snapshot-fixture migration; the showcase build gate), so dispatch
them `model: opus`; the rest fit the Sonnet default.

**Immediate next action: execute P3,
`docs/superpowers/plans/2026-06-03-cairn-render-authoring.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task; Sonnet default, `model: opus`
for Tasks 2 and 6), from the cairn-cms directory on `main`. Start at Task 1.** The design is settled and
approved, so skip brainstorming. It runs on `main` directly (no site deploys). The pass-end review gate
is the simplifier plus a high-effort `/code-review` (attention to the icon-resolution edge cases and the
snapshot migration); `svelte-reviewer`, `daisyui-a11y-reviewer`, the Worker/auth reviewers, and the live
`/admin` smoke do not apply. After P3 lands, **publish** the rolled `0.22.0`/`0.23.0`/`0.24.0` window
together, then run the **907-life migration** (the second proving ground, `site-pass` in that repo,
`datePrefix: 'day'`), then **P4, the `create-cairn-site` scaffolder** (the capstone).

**Publishing stays held.** `0.21.0` is the registry `latest`. `main` carries the unpublished `0.22.0`
(P1) and `0.23.0` (P2), and will carry the P3 bump, until the window publishes together before the
907 migration. A site pins a range only after the publish.

## Where the work is (2026-06-03, DX pass P1 / delivery read-model executed; 0.22.0 unpublished)

The DX backlog triaged into the P1 through P4 engine-pass sequence (the entry below has the full triage and
the P2 through P4 scope). **P1, the delivery read-model touch-ups, is now executed and review-gated on
`main`.** It ran subagent-driven, one `cairn-implementer` per task (Sonnet throughout, the tasks were
mechanical), nine task commits `4ff9f56..c85c9d9` plus a simplifier commit `b2a1b19` and a review fold-in
`36d92a7`. **Local only, not pushed, not published.** The minor bumps to `0.22.0` (additive read-model
surface plus one breaking import move).

The pass delivers DX items 1, 2, 3: `ContentSummary.concept` and `EntryData.concept` (the read model carries
its resolved concept id, so a list or page branches per concept without sniffing `entry.date`); the
`summaryFields` descriptor knob feeding `ContentSummary.fields` (a list card reads an authored frontmatter
key with no per-entry detail read); the package root re-exporting the delivery route loaders and response
helpers; and `CairnHead` moved to its own `@glw907/cairn-cms/delivery/head` entry so the `/delivery` data
barrel loads in node with no Svelte plugin (the one breaking import move). The showcase wires the whole
surface end to end (a prerendered home listing summaries from `summary.fields` and `data.concept`).

Gate at the tip: `npm run check` 779 files 0/0, `npm test` 110 files / 616 tests exit 0, `npm run
check:package` all entries green including the new `./delivery/head` subpath. End-to-end, the showcase
production build exits 0 and the prerendered home carries `class="summary"` and `data-concept="posts"`. The
review gate (simplifier, `svelte-reviewer` Opus, a high-effort four-angle `/code-review`) found no Critical,
no Important, and no confirmed correctness bug; the one convergent finding (a `fields` doc comment overselling
"Namespaced") folded in as `36d92a7`. The full post-mortem with the four carried follow-ups (the
`makeDescriptor` test factory, the per-entry empty-`{}` allocation, the dual-barrel export-list drift, and
`summaryFields` failing open on an undeclared key) is in
`docs/superpowers/plans/2026-06-03-cairn-delivery-readmodel.md`.

**Immediate next action: execute P2,
`docs/superpowers/plans/2026-06-03-cairn-schema-validation.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default; the tasks are
mechanical and well-specified, so Opus is not needed), from the cairn-cms directory on `main`. Start at
Task 1.** The design is settled and approved (spec
`docs/superpowers/specs/2026-06-03-cairn-schema-validation-design.md`), so skip brainstorming. P2 covers DX
items 10 and 12 plus the folded-in P1 `summaryFields` follow-up. The three design calls are locked: date
validation is strict by default (a real `YYYY-MM-DD` calendar date, no flag, no custom `pattern`); closed
`tags` membership is enforced by default (no `enforced` flag, since `freetags` is the open escape hatch);
and no tag count bounds (at-least-one is `required: true`, already working). Seven test-first tasks: the
`isCalendarDate` helper, the date check and the tags membership check in `validateFields`, the
`summaryFields` declaration guard in `normalizeConcepts`, the `readonly` widening of `AttributeField.options`,
the docs, and the `0.23.0` bump. It runs on `main` directly (no site deploys). The pass-end review gate is
the simplifier plus a high-effort `/code-review` (attention to the `isCalendarDate` round-trip and the tags
edge cases); `svelte-reviewer` runs only if a form component changes, and the Worker/auth/a11y reviewers and
the live `/admin` smoke do not apply. After P2, brainstorm and write P3 (render and component authoring),
then publish the rolled `0.22.0`/`0.23.0`/P3 window, then the 907-life migration, then P4 (the scaffolder).

**Publishing is held** (consistent with the held window the entry below describes): `0.21.0` is the registry
`latest`, and `main` will carry `0.22.0` (P1) plus the later P2/P3 bumps until the window publishes together
before the 907 migration. A site pins a range only after the publish.

## Where the work is (2026-06-03, DX backlog triaged into engine passes; P1 spec and plan written)

The content-graph initiative is COMPLETE and `0.21.0` is the registry `latest` (see the entry below). This
session triaged the DX backlog from the ecnordic `0.21` migration
(`docs/dx-backlog-ecnordic-migration.md`, 16 findings) into a sequenced set of engine passes, with the
`create-cairn-site` scaffolder as the organizing goal:

- **P1, delivery read-model** (DX items 1, 2, 3): the `concept` stamp on `ContentSummary`/`EntryData`, the
  `summaryFields` knob, the root superset and the `CairnHead` `/delivery/head` split. Spec and plan written
  this session.
- **P2, schema validation** (items 10, 12): declarative serializable field options to restore the four
  validations the cutover dropped; `readonly` options.
- **P3, render and component authoring** (items 7, 8, 9, 11, 15): the `splitHead` replacement head helper
  (moved here from P1 during design, since it lives beside `cardShell`/`iconSpan`), the `rel` policy option,
  the alert role default, the empty-slot drop, the declared-attribute read signal.
- Then **publish** the rolled window, then the **907-life migration** as the second proving ground on the
  corrected surface (user's call: P1 through P3 first, then 907, then the scaffolder).
- **P4, create-cairn-site scaffolder** (items 4, 5, 6, 13, 14, 16): the capstone, emitting the corrected
  defaults and the canonical setup and migration docs.

P1 is specified and planned. The spec is
`docs/superpowers/specs/2026-06-02-cairn-delivery-readmodel-design.md`; the plan is
`docs/superpowers/plans/2026-06-03-cairn-delivery-readmodel.md` (nine test-first tasks, additive surface
plus one breaking import path, bumps `0.22.0`). Two design calls made and recorded: `CairnHead` stays off
the root barrel so root stays node-importable for the unit suite (it resolves from `/delivery/head`), and
`ConceptDescriptor.summaryFields` is non-optional (matching `datePrefix`/`permalink`), so Task 3 adds the
field to all 13 hand-built descriptor literals in the unit tests (churn accepted under aggressive
development; the recurring-literal smell is logged as a test-factory follow-up in the plan).

**Immediate next action: execute P1,
`docs/superpowers/plans/2026-06-03-cairn-delivery-readmodel.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default; Opus is not
needed, the tasks are mechanical and well-specified), from the cairn-cms directory on `main`. Start at
Task 1.** The design is settled (skip brainstorming). It runs on `main` directly (additive, no site
deploys) and bumps `0.22.0`. The pass-end review gate is the simplifier plus `svelte-reviewer` (the
`EntryData` change and the showcase `+page.svelte`) and a high-effort `/code-review`;
`cloudflare-workers-reviewer`, `web-auth-security-reviewer`, and the live `/admin` smoke do not apply. After
P1 lands, brainstorm and write P2 (schema validation).

## Where the work is (2026-06-02, content-graph Plan 5 / slug-only rename executed and review-remediated; the content-graph initiative is COMPLETE)

Content-graph Plan 5 (slug-only rename plus the atomic inbound-link rewrite) executed subagent-driven on `main`, one
`cairn-implementer` per task (Sonnet for the mechanical tasks, Opus for the judgment-heavy `renameAction` and the
review fold-ins), commits `7b31e2c..eda6340` (the ten plan tasks), then a simplifier commit `9ab890a` and a review-gate
fold-in `80fd6ff`. **`main` is pushed and the window is PUBLISHED as `0.21.0`, now `latest` on npm** (OIDC
trusted-publishing workflow off the `v0.21.0` GitHub Release, build provenance attached), rolling the `0.19.0` (picker),
`0.20.0` (delete and the guards), and `0.21.0` (rename) window over the registry's prior `0.18.0`. It bumps the minor to
`0.21.0` (additive route surface, a new `RenameDialog`, the `EditData` `slug`/`renamed` fields, the pure helpers).
**Plan 5 is the last plan of the
content-graph initiative, so the initiative is now complete:** the atomic commit primitive, the committed manifest and
the `cairn:` resolver, the editor link picker, content delete with the integrity guards, and now content rename all
landed.

**Recovered after a battery interruption.** The prior session lost battery mid-Task-6, with the `EditPage` rename wiring
and its two tests written but uncommitted. The recovered diff was complete and correct (targeted test 16/16, full gate
green), so it committed as `f75a234` with no rework; Tasks 1 through 5 had already committed. No work was lost. The
remaining Tasks 7 through 10 and the full review gate then ran this session.

The pass delivers: slug-only rename (a page renames its whole id; a dated post keeps its date prefix and swaps the
date-stripped slug), the file move plus the self-token rewrite plus every inbound linker's body rewrite plus each touched
manifest row, all in one atomic `commitFiles` commit, so no internal link breaks. New code: `renameId` (`ids.ts`),
`rewriteCairnLink` (`markdown-format.ts`), `renameAction` plus the `editLoad` `slug` field, the `renamed` field, and the
parallel reads (`content-routes.ts`), the `commitFiles` tree-create 422-to-`CommitConflictError` hardening (`repo.ts`),
`RenameDialog.svelte`, the `EditPage` rename wiring, and the persistent polite/assertive `aria-live` regions that replace
the per-banner roles so each alert announces once.

Gate at the tip (`80fd6ff`): `npm run check` 777 files 0/0, `npm test` 109 files / 606 tests exit 0, `check:package`
all-green with no export-condition change. The showcase production build exits 0 with the rename action registered. The
five `renameAction` unit cases pass (no-inbound rename, inbound-linker rewrite with its manifest edge, self-token rewrite,
collision refused with no commit, no-op slug refused with no commit), and the `commitFiles` tree-create 422 throws
`CommitConflictError`.

**Review gate.** The simplifier replaced the Task 7 nested-ternary live-region derivations with `$derived.by` if-chains
(`9ab890a`, behavior identical). Three Opus reviewers ran (`svelte-reviewer`, `daisyui-a11y-reviewer`,
`cloudflare-workers-reviewer`); the workers reviewer returned clean on the atomicity, token rewriting, path safety, and
the 422 fail-safe, and no reviewer found a Critical bug. Four findings folded in as `80fd6ff`: the successful rename was
silent because `editLoad` never read the `?renamed=1` redirect (now read and confirmed visibly and through the polite
region); `RenameDialog` now seeds focus into the slug input on open (WCAG 2.4.3) instead of the Close button; the
redundant `aria-label` on the labelled slug input was dropped; and the 409 collision branch carries a comment that it also
covers the concurrent-rename race. The separate high-effort `/code-review` was not run this pass: the three scoped Opus
reviewers covered exactly this pass's surface, and a `/code-review` would diff the whole unpushed branch (the
`0.19`/`0.20`/`0.21` window) and re-surface landed work. `web-auth-security-reviewer` did not apply.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, so there is no `wrangler dev` admin Worker.
The browser component tests cover the dialog, the focus seeding, the live region, and the collision banner; the
content-route unit tests cover the rewrite-and-commit path. The interactive smoke (rename an entry with an inbound link,
confirm the link still resolves on the linking page, confirm a collision is refused) is best run during the ecnordic
migration.

**Carried follow-ups (from the review gate).** The persistent assertive region does not re-announce an identical repeat
error (a colliding slug typed twice), since the derived string is unchanged; a nonce keyed off the action-result identity
would force it, and the fix spans the whole Task 7 live-region design. The `RenameDialog` slug echo shows the raw typed
value, so it can preview a slug the action rejects; running it through the shared `slugify` would match the create form,
and tying it with `aria-describedby` would carry it to assistive tech. The collision read is a third sequential
round-trip before the parallel pair; folding it into the `Promise.all` shaves one edge latency hop at the cost of one
wasted read on the no-collision path. The manifest last-writer-wins races stay the documented posture, caught by the
build's fail-closed backstop.

**Immediate next action: the content-graph initiative is complete and `0.21.0` is published, so the next work is the
site migrations.** Publishing is DONE: the registry's `latest` is `0.21.0` (the `v0.21.0` GitHub Release published via the
OIDC workflow, build provenance attached), rolling the `0.19.0`/`0.20.0`/`0.21.0` window over the prior `0.18.0`, and
`main` is pushed. The site migrations run per-site (`site-pass`, ecnordic then 907, from each site's own repo), pinning
`^0.21.0`, where each site
wires its complete content layer (delivery, resolver, manifest, the editor link surface) in one site-pass and the
scaffolder template captures the full picture. The migration gotchas in the entries below still apply (pass every
declared concept's glob, declare every read frontmatter key, coerce an unquoted YAML date, resolve `cairn:` links
wherever a body renders to HTML). There is no new cairn-cms engine plan to draft: the initiative roadmap is exhausted, so
the next plan is a site's own migration pass, authored in that site's repo.

**DX backlog from the first site migration.** The ecnordic `^0.10` to `^0.21` migration (the first full-surface
consumer migration) ran as a DX audit. The ranked engine backlog it produced is `docs/dx-backlog-ecnordic-migration.md`
(evidence in `ecnordic-ski/docs/cairn-dx-findings.md`). The high-cost items, ranked by what they cost a SvelteKit
developer new to cairn: the delivery root-versus-`/delivery` import split (and the `/delivery` barrel pulling
`CairnHead.svelte` into a node test), `EntryData` carrying no resolved concept, `ContentSummary` omitting the authored
summary field, and two build-time guarantees that lean on scaffold defaults a real SvelteKit site overrides (a `cairn:`
token resolves content concepts only, not routes; the dangling-token backstop goes silent under an inherited
`handleHttpError: 'warn'`). The file also carries the `create-cairn-site` scaffolder checklist. Fold these into the
scaffolder pass and the next engine touch-ups.

## Where the work is (2026-06-02, content-graph Plan 4 / content delete and the integrity guards executed and review-remediated)

Content-graph Plan 4 (content delete, the delete and save integrity guards, and four carried link-integrity
fixes) executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet, Opus for the
judgment-heavy save guard, `deleteAction`, and `EditPage` wiring), commits `19e8c0b..b63ac2e` (the fifteen
plan tasks), then a simplifier commit `30d363d` and a review-gate fold-in `afbf08b`. **Local only, not pushed,
not published.** It bumps the minor to `0.20.0` (additive route surface, a new `DeleteDialog`, the pure
helpers). The pass delivers: a Delete control that blocks until clean and names the inbound links, a save guard
that hard-blocks a dangling `cairn:` link with a one-click unwrap-to-text fix and warns a draft target, and the
four fold-ins (`escapeLinkText`, the hardened `parseManifest`, the manifest/site-index validation-exclusion
reconciliation in `buildSiteManifest`, and the three Plan 3 editor nits: the `insertLink` pre-mount fallback,
the `[[` code-block skip, the `LinkPicker` heading tiebreak).

New code: `escapeLinkText` (`links.ts`), `unwrapCairnLink` (`markdown-format.ts`), `inboundLinks`/`InboundLink`
(`manifest.ts`), `deleteAction` plus the `saveAction` guard and `editLoad` inbound field
(`content-routes.ts`), and `DeleteDialog.svelte`. Gate at the fold-in tip (`afbf08b`): `npm run check` 774
files 0/0, `npm test` 570 tests exit 0, `check:package` all-green.

**The review gate found real bugs, all now fixed (commits `2cf82ee`, `5bd8718`, `64ffdc4`, `2640e71`).** Three
Opus reviewers ran (`svelte-reviewer`, `daisyui-a11y-reviewer`, `cloudflare-workers-reviewer`; the workers one
returned ship-it). The svelte and a11y reviewers converged on a broken post-action feedback flow, folded in as
`afbf08b` (surface the `deleteAction` 409, clear a fixed broken-link row, kill the double "Saved" banner). A
high-effort seven-angle `/code-review` then surfaced a cluster of CONFIRMED bugs that meant the save-guard
recovery flow, the pass's headline feature, did not actually work. The remediation batch:

- `2cf82ee` the keystone. A blocked save re-seeded the editor from the committed body and discarded the
  author's edits (and the broken link to fix); `EditPage` now seeds from the returned `form.body`.
  `unwrapCairnLink` was a raw regex that no-opped on the escaped-bracket and titled links the picker produces
  and could rewrite a link inside a code span; it is now an mdast-located offset splice that unescapes the
  display text and leaves code and the rest of the document exact. The banner row hides only on a real change,
  and the refused-delete banner names the linkers itself instead of pointing at a stale dialog.
- `5bd8718` `parseManifest` validated entry scalars but only that `links` was an array; a malformed link
  element (a missing id, a string, or null) passed and `inboundLinks` silently dropped a real inbound linker,
  letting the delete guard strand a link. It now validates each link element as a `{ concept, id }` string pair
  and type-checks an optional `date`.
- `64ffdc4` the save guard draft-warned a self-link on a draft entry; it now skips the entry being saved before
  classifying, mirroring `inboundLinks`.
- `2640e71` the showcase admin edit route registered only the `save` action, so the shipped delete 404'd in the
  reference consumer and any site scaffolded from it; it now registers `delete: routes.deleteAction`. Showcase
  production build exits 0.

Gate at the remediation tip (`2640e71`): `npm run check` 774 files 0/0, `npm test` 579 tests exit 0, showcase
build exit 0.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, so there is no `wrangler dev`
admin Worker to smoke. The browser component tests cover the dialogs, the banner, and the unwrap fix; the
interactive smoke (block a delete on a linked-to page, delete an unlinked page, recover a blocked save via the
unwrap fix) is best run during the ecnordic migration against that site's real Worker.

**Carried follow-ups (from the review gate, for Plan 5 or a later pass).** Folded into the Plan 5 design where
noted: the `commitFiles` 422-on-absent-path delete edge (a delete of a path already absent from the tree
surfaces as a raw 500, not the friendly conflict redirect; rename deletes the old path, so it folds into Plan
5). Recorded as known limitations: the manifest concurrency races (a concurrent save adding an inbound link can
be missed by a delete gate, and a concurrent delete of a target can be missed by a save guard; both are
last-writer-wins on the git-committed manifest with no compare-and-swap, caught by the build's fail-closed
`verifyManifest`/resolver backstop, which is the designed safety net for cairn's tiny write volume; rename
shares the race). Smaller follow-ups: `buildSiteManifest` silently drops an invalid draft (a linked-to invalid
draft reds the build far from root cause, since the site gate skips drafts but the manifest validate has no
draft exception), a persistent always-present live region for the page alerts (the success/error/broken/draft
banners are `{#if}`-gated and announced inconsistently), and a perf-and-reuse cleanup (double `extractCairnLinks`
per save, double `parseMarkdown` per file at build, sequential `editLoad` reads, the `byKey`/resolver
key-shape duplication).

**Immediate next action: execute content-graph Plan 5,
`docs/superpowers/plans/2026-06-02-cairn-content-graph-05-rename.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default), from the cairn-cms
directory on `main`. Start at Task 1.** The design is settled and approved (spec
`docs/superpowers/specs/2026-06-02-cairn-content-graph-05-rename-design.md`), so skip brainstorming. It runs on
`main` directly (additive, no site deploys) and bumps `0.21.0`. The pass is slug-only rename (a page renames its
id=slug; a dated post renames the date-stripped slug, keeping its date prefix) with the atomic inbound-link
rewrite through `commitFiles`, and no cascade-unwrap-on-delete. Ten test-first tasks: `renameId` and the mdast
`rewriteCairnLink` helpers, the `commitFiles` tree-create 422 hardening, `renameAction` plus the `editLoad` slug
field and parallel reads, the `RenameDialog` and `EditPage` wiring, a persistent edit-page live region, the
showcase rename action, and the version bump. Two Plan 4 review carries fold in (the absent-path delete edge in
Task 3, the alert live region in Task 7), and Task 9 wires the action into the showcase, the Plan 4 lesson. The
pass-end review gate is the simplifier plus `svelte-reviewer` (the dialog and the live region),
`daisyui-a11y-reviewer` (the dialog, the live region, the keyboard path), and `cloudflare-workers-reviewer` (the
`renameAction` read-rewrite-commit path and the `commitFiles` hardening), all Opus, plus a high-effort
`/code-review`; the live `/admin` smoke is a carried fast-follow for the ecnordic migration.

**Deferred (user's call 2026-06-02): publishing is held.** The registry's `latest` is `0.18.0`; `main` carries
the unpublished `0.19.0` (picker) and `0.20.0` (this lifecycle pass with its remediation). Publish the rolled
window before the site migrations, since a site pins a range only after the publish. The whole content-graph
initiative still precedes the site migrations.

## Where the work is (2026-06-02, content-graph Plan 3 / the editor link picker executed)

Content-graph Plan 3 (the editor link picker) executed subagent-driven on `main`, one `cairn-implementer` per
task (Sonnet), commits `9614b0a..d6aad7e` (the ten plan tasks), plus a simplifier commit `0c43fb0` and a
test-hardening commit `6485e37`, then the post-mortem `ac31a32`. **Local only, not pushed, not published.** It bumps
the minor to `0.19.0` (additive). The pass delivers the editor link picker end to end: an author inserts a `cairn:`
internal link two ways, a "Link to page" dialog and a `[[` autocomplete, both reading the `linkTargets` Plan 2 ships
to the editor and both writing `[Display](cairn:<concept>/<id>)`.

New code: `formatCairnToken(ref)` in `src/lib/content/links.ts` (the inverse of `parseCairnToken`).
`insertInlineLink(doc, from, to, href, title)` in `src/lib/components/markdown-format.ts` (a pure inline transform,
selection-wrap or title-insert, no block padding). `src/lib/components/link-completion.ts` holds the pure
`matchCairnTrigger` (the `[[query` matcher) and `linkCompletions` (title substring filter, grouped by concept,
drafts marked, the full link as the apply text), plus `cairnLinkCompletionSource(targets)`, a thin CodeMirror
`CompletionSource` adapter. `MarkdownEditor` gained two seams, `registerInsertLink` (an inline, selection-aware
insert) and a generic `completionSources` prop wired through `autocompletion({ override, interactionDelay: 0 })`.
`src/lib/components/LinkPicker.svelte` is the "Link to page" dialog, mirroring `ComponentInsertDialog`'s
native-`<dialog>` a11y. `EditPage` registers the completion source and the inline insert and renders the picker
beside the component dialog. `formatCairnToken` and `LinkPicker` are exported from the package.

Final gate at the tip (`6485e37`): `npm run check` 771 files 0/0, `npm test` 105 files / 537 tests exit 0 (green
across three consecutive full-suite runs after the flake fix), `check:package` all-green across all five entries with
no export-condition change. The simplifier made one cosmetic fix (`0c43fb0`) and reasoned against extracting the
concept-section logic shared across two layers. `svelte-reviewer` (Opus) and `daisyui-a11y-reviewer` (Opus) both
returned ship-it, no Critical or Important: the runes seams are correct, and the dialog plus the autocomplete popup
match or extend the `ComponentInsertDialog` a11y baseline (native `<dialog>` focus trap and Escape, the searchbox
label, the draft conveyed as text, CodeMirror's built-in combobox ARIA). A high-effort seven-angle `/code-review`
surfaced no Critical or Important; its two convergent findings are the carried bracket-escaping and pre-mount items
below. `cloudflare-workers-reviewer` and `web-auth-security-reviewer` did not apply.

**Flake fixed at the gate.** The Task 6 autocomplete end-to-end test accepted the completion with Enter, which under
full parallel browser load races CodeMirror's accept handler and falls through to a newline (green in isolation, red
under load, about half the time). The fix (`6485e37`) accepts by clicking the option, which drives CodeMirror's
mousedown-apply deterministically and proves the same seam without the keystroke race; the Enter contract is
CodeMirror's own built-in. Three consecutive full-suite runs are green after the change.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, so there is no `wrangler dev` admin
Worker to smoke. The browser component tests cover the dialog and the autocomplete; the interactive smoke (open the
dialog, pick a target, type `[[` and accept, confirm the inserted link in a real browser) is best run during the
ecnordic migration.

**Carried follow-ups for Plan 4 (recorded in the Plan 3 post-mortem):** unescaped brackets in an author title flowing
into the link display text (CommonMark tolerates balanced brackets, so only an unbalanced `[`/`]` breaks it, and it
self-corrects in the preview; the fix escapes title-derived text but not a live selection, so it wants its own
test-first task); `insertLink` no-ops before the editor mounts (matches `applyFormat`, only the block-insert path has
a raw-value fallback); `matchCairnTrigger` has no syntax-tree awareness, so `[[` triggers inside a code block; and the
section-order tiebreak uses the raw concept id, cosmetic past the two built-in concepts.

**Content-graph Plan 4 is WRITTEN (brainstormed and authored 2026-06-02): content delete and the integrity guards,**
`docs/superpowers/plans/2026-06-02-cairn-content-graph-04-lifecycle.md` (design spec
`docs/superpowers/specs/2026-06-02-cairn-content-graph-04-lifecycle-design.md`, approved). The brainstorm split the
spec's single lifecycle plan: **Plan 4 takes delete plus the two guards, and rename plus the multi-file inbound rewrite
move to Plan 5** (the highest-blast-radius op, isolated). Decisions locked, each grounded against the field (Sanity,
Contentful, Hugo, Docusaurus, WordPress, Notion): the delete guard is block-until-clean (refuse while inbound links
exist, name them), and the save guard hard-blocks a dangling link (one-click unwrap-to-text fix) and warns a draft
target. The posture is "keep `main` always deployable", since a cairn save is a deploy and a non-technical author will
not see a failed build. Cascade-unwrap-on-delete defers to Plan 5 with rename. Four carried follow-ups fold in
(bracket-escaping in link text, the `parseManifest` guard, validation-failing-entry consistency, the three minor Plan 3
editor nits). Fifteen test-first tasks, additive, bumps `0.20.0`. The plan corrects the spec's test-layer note: the
content-route guards are unit-tested against a `fetch` double, since the routes have no D1.

**Plan 4 is DONE (executed and review-remediated 2026-06-02).** See the top entry for the landing detail, the
review remediation, and the authoritative next action (write Plan 5). The description below stays as the pass's
design record.

**Deferred (user's call 2026-06-02): publishing `0.19.0` is held.** The user chose to brainstorm Plan 4 rather than
publish the picker pass. The registry's `latest` is `0.18.0`; `main` carries the unpublished `0.19.0` (picker) and will
carry `0.20.0` (this lifecycle pass) on top. Publish the rolled window (`0.20.0`) before the site migrations, since a
site pins a range only after the publish. Plan 5 is rename plus the multi-file inbound rewrite (and cascade-unwrap-on-
delete), where the remaining content-graph follow-ups land. The whole content-graph initiative still precedes the site
migrations.

## Where the work is (2026-06-02, content-graph Plan 2 / the committed manifest and link resolution executed)

Content-graph Plan 2 (the committed manifest plus the `cairn:` link resolver) executed subagent-driven on
`main`, one `cairn-implementer` per task (Sonnet for the mechanical tasks, Opus for the atomic-save Task 10 and
the showcase end-to-end Task 11), commits `cdabeef..c50fc47` (fifteen: thirteen plan tasks plus two review-gate
commits). **`main` is pushed and the window is PUBLISHED as `0.18.0`, now `latest` on npm** (OIDC trusted-publishing
workflow off the `v0.18.0` GitHub Release, build provenance attached), rolling the content-graph manifest work over the
registry's prior `0.17.0`. It bumps the minor to `0.18.0` (additive surface). The pass
delivers internal links end to end: an author writes `[guide](cairn:posts/<id>)`, it renders as the live
permalink on the public page, a dangling target fails the build, and the editor preview marks a broken target.

New pure modules carry the work. `src/lib/content/links.ts` owns the `cairn:<concept>/<id>` token grammar
(`parseCairnToken`, `extractCairnLinks`, the latter parsing the body as mdast so a token in a code span is never
matched). `src/lib/content/manifest.ts` holds the manifest types, `manifestEntryFromFile` (one row per file,
identity plus outbound cairn edges, drafts flagged), the canonical serialize/parse (sorted, fixed key order,
trailing newline so the committed file diffs cleanly), `verifyManifest` (the build backstop, a canonical-form
comparison that throws on drift), the `upsertEntry`/`removeEntry` patch helpers, and `manifestLinkResolver` (the
preview lookup, undefined on a miss). `src/lib/delivery/manifest.ts` adds `buildSiteManifest` (the whole-corpus
projection mirroring `createSiteIndexes`) and `buildLinkResolver` (site-index-backed, throws on a miss).
`src/lib/render/resolve-links.ts` is the `remarkResolveCairnLinks` mdast step, before remark-rehype, so a rewritten
href passes the sanitize floor like any anchor; the per-call resolver rides on a VFile so the processor is still
built once. `entryLoad` resolves cairn links at build against the site index (the throw-on-miss backstop).
`saveAction` moved off `commitFile` onto the Plan 1 `commitFiles`: it reads the manifest, upserts the saved row,
and commits content and manifest in one commit. `editLoad` ships the manifest `linkTargets` to the client, and
`EditPage` builds a manifest resolver from them to resolve and mark links in the preview. The sanitize floor now
admits the inert `cairn:` href scheme (extend-only, the `javascript:`/`data:` strip preserved). The showcase wires
the whole path: a regenerate script (`npm run cairn:manifest`), a build-time `verifyManifest`, a real
`cairn:pages/about` link in the hello post, and both feeds resolving links to absolute URLs.

Final gate at the tip (`c50fc47`): `npm run check` 762 files 0/0, `npm test` 103 files / 519 tests exit 0,
`check:package` all-green across all five entries with no export-condition change. The end-to-end gate is the
showcase production build: the prerendered hello post renders `<a href="/about">about page</a>` with no
unresolved token, the feeds render `href="https://showcase.test/about"`, and the committed manifest matched the
corpus. The backstop was proven: pointing the link at `cairn:pages/does-not-exist` and rebuilding failed with
`cairn link target not found` (exit 1); reverting went green. The simplifier found nothing. Three Opus reviewers
ran (`cloudflare-workers-reviewer` ship-it on the atomic save, `svelte-reviewer` clean on the preview resolver,
`daisyui-a11y-reviewer` on the broken-link cue); three findings folded in as `81ec429` (the corrected stale-manifest
comment, the tracked `resolveLink` effect read, the `title="Broken internal link"` text cue). A high-effort
`/code-review` surfaced one real regression folded in as `c50fc47`: the floor now admits `cairn:`, so the showcase
feeds shipped dead `cairn:` links until threaded a resolver. Plan and full post-mortem (with the carried
follow-ups): `docs/superpowers/plans/2026-06-02-cairn-content-graph-02-manifest-and-resolution.md`.

- Design: `docs/superpowers/specs/2026-06-02-cairn-content-graph-design.md` (approved). This plan implemented its
  Plan 2 (the committed manifest) and Plan 3 (the token, resolver, build backstop, preview cue) together.

**One key correction locked in: the manifest slug rule matches `content-index.ts` exactly**
(`slugFromId(id, descriptor.routing.dated ? descriptor.datePrefix : null)`), so the manifest permalink equals the
content-index permalink by construction and the preview resolver and the build resolver never disagree. An early
hardcoded `'day'` granularity (to pass a malformed fixture) was reverted; the Task 2 and Task 4 fixtures were fixed
to pair a day-prefixed filename with `datePrefix: 'day'`.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, not a Worker, so there is no
`wrangler dev` admin Worker to smoke. The `integration` project exercises the save path in workerd against a real
miniflare D1. The browser smoke (an editor saving an entry, confirming the commit carries both files) is best run
during the ecnordic migration against that site's real Worker.

**Content-graph Plan 3 is WRITTEN (brainstormed and authored 2026-06-02): the editor link picker,**
`docs/superpowers/plans/2026-06-02-cairn-content-graph-03-picker.md` (design spec
`docs/superpowers/specs/2026-06-02-cairn-content-graph-03-picker-design.md`, approved). It builds the "Link to page"
dialog and the `[[` autocomplete, both writing the `cairn:` token through two new `MarkdownEditor` seams (a generic
`completionSources` prop wired through `@codemirror/autocomplete`, and a `registerInsertLink` inline insert), reading
the `linkTargets` Plan 2 ships. Brainstorm decisions locked: drafts shown flagged, the completion seam is generic, and
substring (not fuzzy) search. Ten test-first tasks, additive, bumps `0.19.0`.

**Immediate next action: execute content-graph Plan 3,
`docs/superpowers/plans/2026-06-02-cairn-content-graph-03-picker.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default), from the cairn-cms
directory on `main`. Start at Task 1.** The design is settled (skip brainstorming). It runs on `main` directly
(additive, no site deploys). Task 1 adds the `@codemirror/autocomplete` dependency (this plan does change a
dependency, unlike Plan 2). The pass-end review gate is the simplifier plus `svelte-reviewer` (the completion-source
`$derived` and the picker reactivity) and `daisyui-a11y-reviewer` (the dialog, the search box, the keyboard and focus
path, the autocomplete popup), both Opus, plus a high-effort `/code-review`; the live `/admin` interactive smoke is a
carried fast-follow for the ecnordic migration (the showcase runs `adapter-node`).

After the picker, Plan 4 is the lifecycle guards (delete/rename with inbound-link rewriting), which is where several
Plan 2 carried follow-ups land (a link to a draft or invalid target, the resolver-vs-index divergence). The other
carried follow-ups, in the Plan 2 post-mortem, include a render-without-resolver contract caveat for the site
migrations (resolve cairn links wherever a body renders to HTML), a `parseManifest` per-entry/version guard, and an
`editLoad` two-read parallelize. The whole content-graph initiative still precedes the site migrations.

## Where the work is (2026-06-02, content-graph Plan 1 / the atomic commit primitive executed)

Content-graph Plan 1 (the atomic multi-file commit primitive) executed subagent-driven on `main`, one
`cairn-implementer` per task (Sonnet), commits `51f36de..2e4cfde`, plus one review-gate fold-in `3ba73af`. Local
only, not pushed. No version bump (additive and internal, `commitFiles` is unexported from the package entry). It
is the foundation of the content-graph initiative and the highest-stakes code in it (it writes to `main` and a
later caller will trigger site deploys), so it landed and was verified in isolation before anything builds on it.

`commitFiles(repo, changes, opts, token)` lives in `src/lib/github/repo.ts` beside the single-file `commitFile`.
It commits several path changes in one commit over the Git Data API: read the branch head, read its base tree,
POST a new tree on `base_tree` (so an unnamed path is preserved, including a concurrent commit's on a retry), POST
one commit parented on the head with the editor as author and the committer omitted, then PATCH the ref with
`force: false`. The exported `FileChange` is `{ path, content: string | null }`, where a null content encodes a
delete as a `sha: null` tree entry, so one commit mixes writes and deletes (what a rename needs). A `422`
non-fast-forward retries the whole sequence on the re-read head up to three times, rebuilding the tree on the new
base, and exhaustion throws the existing `CommitConflictError` so the caller fails safe. A non-422 ref failure
throws immediately. An empty change set is rejected before any network call (the review-gate fold-in).

Final gate at the tip (`3ba73af`): `npm run check` 754 files 0/0, `npm test` 99 files / 489 tests exit 0. The
eight-case `github-atomic-commit.test.ts` pins the URL sequence (GET singular `ref/`, PATCH plural `refs/`), the
`base_tree`/parent wiring, the write and delete tree shapes, the retry-then-succeed, the
exhaustion-to-`CommitConflictError`, the non-422 immediate throw, and the empty-set guard. The simplifier found
nothing to change. `cloudflare-workers-reviewer` (Opus) returned a ship-it verdict, no Critical or Important. A
high-effort seven-angle `/code-review` confirmed the diff is cleanly additive with no caller, collision, or barrel
leak; its one folded finding is the empty-set guard. The `svelte-reviewer`, `web-auth-security-reviewer`,
`daisyui-a11y-reviewer`, and the live admin smoke did not apply (no Svelte, auth, session, cookie, or DaisyUI code,
and no route calls `commitFiles` yet). Plan and full post-mortem (with the locked decisions and the latent
follow-ups): `docs/superpowers/plans/2026-06-02-cairn-content-graph-01-atomic-commit.md`.

**Content-graph Plan 2 is WRITTEN (brainstormed and authored 2026-06-02), merging the design's old Plan 2 and Plan
3 into one pass:** `docs/superpowers/plans/2026-06-02-cairn-content-graph-02-manifest-and-resolution.md`. The
manifest (build-verified projection, committed) and the `cairn:` link resolver land together, since they share the
token parser and a manifest-only pass would ship infrastructure nothing reads yet; together they resolve internal
links end to end (build resolves against the site index and fails closed on a dangling token, the preview marks a
broken target). Thirteen test-first tasks. Brainstorm decisions locked into the plan: the outbound edge list is
populated now (the shared `extractCairnLinks`), drafts are included and flagged, the build reads the site index
while the preview reads the manifest shipped to the client (one render with an injected resolver), drift fails the
build with a `npm run cairn:manifest` regenerate command, and the `commitFiles` 422 retry re-sends the manifest
blob last-writer-wins (accepted: the build reconciles). The picker is now Plan 3, the lifecycle guards Plan 4 (the
design spec's plan list is annotated with the resequence). The pass is additive and bumps `0.18.0`.

**Plan 2 is DONE (executed 2026-06-02).** See the top entry for the landing detail and the authoritative next
action (brainstorm then write Plan 3, the picker). The description below remains as the pass's design record: it ran
`subagent-driven` on `main` (additive, no site deploys), and its review gate was the simplifier plus
`cloudflare-workers-reviewer`, `svelte-reviewer`, `daisyui-a11y-reviewer`, and a high-effort `/code-review`.

**Latent follow-ups carried from Plan 1** (unreachable under current conventions, recorded in the post-mortem): the
file-wide `encodeURIComponent(repo.branch)` in a ref path position would break a slashed branch name (cairn commits
only to `main`); the retry treats every ref-PATCH `422` as a non-fast-forward; the GET helpers throw with the
status alone and do not read the error body.

### The content-graph initiative (design)

The content-graph initiative is the active engine work, sequenced **before** the site migrations (decided this
session, migration is unhurried so the slot ahead of it is the accepted trade). It gives cairn a committed,
build-verified manifest projection of the corpus that request-time admin code reads without an N+1 GitHub crawl,
and it powers rot-proof internal links between posts and pages, a link-aware editor picker, and safe
delete/rename with inbound-link rewriting. It absorbs and supersedes the retired internal-links design and the
dated-slug deferred lifecycle items.

The spec is written and approved: `docs/superpowers/specs/2026-06-02-cairn-content-graph-design.md`. The spine is
"files are truth, the manifest is a build-verified projection, every content mutation commits content and manifest
atomically." Two rationales are recorded in it so they are not re-litigated: why a stable-id `cairn:<concept>/<id>`
token rather than the Obsidian `[[wikilink]]` format (grounded in a verified 2026 competitive survey: not a
portable standard, name-based rot, literal-text degradation; the `[[` trigger is kept only as an insert gesture
that writes the id token), and why the link graph is a git-committed manifest rather than D1 (the resolver and
build-fail backstop run at build, where a runtime D1 binding is unreachable). The git-versus-D1 placement rule is
now its own canonical reference, `docs/data-architecture.md` (the build-versus-runtime test plus the three worked
precedents: config/nav to git, the manifest to git, the editor allowlist staying in D1).

The initiative is five foundation-first plans, each written just-in-time after the prior lands: (1) the atomic
multi-file commit primitive, (2) the committed manifest, (3) the token + build-time resolver + build backstop +
preview broken-link flag, (4) the picker (toolbar dialog + `[[` autocomplete), (5) content delete/rename + the
save and delete integrity guards. **Plan 1 is written and committed:**
`docs/superpowers/plans/2026-06-02-cairn-content-graph-01-atomic-commit.md` (three test-first tasks adding
`commitFiles` to `src/lib/github/repo.ts`: the write-only Git Data API sequence, delete encoding, and the
non-fast-forward retry with a `CommitConflictError` backstop). It is the highest-stakes code in the initiative
(it writes to `main` and triggers site deploys), so it lands and is verified in isolation before anything builds
on it. Plan 1 is internal and additive (no package export, no version bump). One spec correction baked into the
plan: the GitHub layer is unit-tested by stubbing `fetch` (the `github-commit.test.ts` pattern), not in the
integration project, which has no GitHub double.

**Plan 1 is DONE (executed 2026-06-02).** See the top entry for the landing detail and the authoritative next
action (brainstorm then write Plan 2, the committed manifest). The plan series detail below remains as the
initiative's roadmap.

The site migrations (ecnordic then 907, `^0.17.0`) follow the whole initiative, so each site wires its complete
content layer (delivery, resolver, manifest) in one site-pass and the scaffolder template captures the full
picture. The migration gotchas in the entries below still apply.

## Where the work is (2026-06-02, render-safety pass executed, PUBLISHED 0.17.0)

The render-safety pass executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet), commits
`ae69a50..d86788a`. **`main` is pushed (`dbbef00..5074476`) and the window is PUBLISHED as `0.17.0`, now `latest`
on npm** (OIDC trusted-publishing workflow off the `v0.17.0` GitHub Release, build provenance attached). The single
publish rolled the unpublished `0.15.0` (delivery robustness), `0.16.0` (auth hardening), and `0.17.0`
(render safety) window into one release over the registry's prior `0.14.0`. That is the five plan-task commits, one review-gate doc fold-in (`8aee8a7`), and the
post-mortem (`d86788a`). Local only, not pushed, not published. It closes the escalated render-safety gap: the
engine render pipeline now sanitizes author content by default. `createRenderer` inserts `rehype-sanitize` after
`rehype-raw` and before the component dispatch, so author markdown (raw HTML, link URLs, slot bodies) is cleaned
while the site's trusted `build()` output and its inline SVG icons run after the floor untouched. The new
`src/lib/render/sanitize-schema.ts` builds the schema from `hast-util-sanitize`'s `defaultSchema` plus the
directive markers (so the dispatch still reads its stamps), the benign tags real content uses (`nav`, `details`,
`summary`), and free-form `className`/`target`/`rel` on anchors; `rehypeAnchorRel` forces `rel="noopener
noreferrer"` on every `target="_blank"` anchor. Two `RendererOptions` members carry the posture: `sanitizeSchema`
extends the allowlist from the safe base (extend-only, cannot weaken the core strip), and `unsafeDisableSanitize`
is the developer-only off switch. The admin preview collapsed onto the one floor, dropping the redundant DOMPurify
pass and the `dompurify` dependency, so the preview mirrors the published page. The additive surface bumps the
minor to `0.17.0`.

Final gate at the tip (`d86788a`): `npm run check` 753 files 0/0, `npm test` 98 files / 482 tests exit 0,
`check:package` all-green with no export-condition change. The new `render-sanitize.test.ts` (ten cases) proves
the strip and the preserve behavior, and the showcase production build (exit 0) prerenders the `callout` to
`<aside class="callout callout-warning">` through the floor with no `onerror`/`<script>` in the output, the proof
the before-dispatch placement preserves the directive markers. A `code-simplifier` pass found nothing to change.
`svelte-reviewer` (Opus) returned clean on the `EditPage` change (the `$effect` debounce and `previewRun`
latest-wins guard correct, no new race, `{@html}` safe under the single-floor model). A high-effort `/code-review`
with a security angle surfaced one Important finding, folded in as `8aee8a7`: the floor runs before the dispatch,
so a component `build()` that routes a directive **attribute value** (raw author input) into an `href`, `src`,
`style`, or event-handler position re-opens the `javascript:` vector. The build code is trusted, its inputs are
not. Not a regression (delivery had no sanitization before this pass), and the planned sites route attribute
values into class positions, so the fix is a documented `build()` contract caveat in the render-safety section,
not engine code. A possible URL-coercing build helper is a carried follow-up. Plan and full post-mortem:
`docs/superpowers/plans/2026-06-02-cairn-render-sanitize.md`.

- Spec: `docs/superpowers/specs/2026-06-02-cairn-render-sanitize-design.md` (approved).

**Live admin smoke:** no `/admin` server surface changed, so it does not apply. The editor preview is covered by
the browser component tests, and the showcase prerender covers the delivery path.

**Superseded next action (see the top entry):** the site migrations now follow the content-graph initiative, which
was sequenced ahead of them this session. The migration detail below stays accurate for when that time comes.

The site migrations (per-site `site-pass`, ecnordic then 907, from each site's own
repo), pinning `^0.17.0`. Publishing is DONE (`0.17.0` is `latest`), so a site can pin the range now. Each site
imports from `@glw907/cairn-cms/delivery`, applies the `renderPreview`-to-`render` rename, builds its content layer
with `siteDescriptors` + `createSiteIndexes`, adopts the `responses.ts` feed/sitemap/robots helpers and the
`<CairnHead>` head, wires the catch-all `[...path]` route, and sets its per-concept URL policy in the YAML. The
migration gotchas apply: every declared concept must pass its `import.meta.glob` to `createSiteIndexes` (an empty
`{}` for an intentionally empty concept), every frontmatter key a site reads must be declared in its concept
schema, and a hand-rolled `validate` must coerce an unquoted YAML `date` (a JS `Date`). A site that needs a benign
tag the default sanitize allowlist omits extends it through `createRenderer(registry, { sanitizeSchema })`. The
render-safety gap is closed, so the delivery surface is now safe for a site to adopt. Breaking notes a consuming
site honors at the bump: the `MarkdownEditor` `preview` prop is gone (since `0.9.0`), `ComponentDef.build` is
`build(ctx)` (since `0.12.0`), and the adapter takes one `schema` member via `defineFields`/`defineAdapter` (since
`0.13.0`).

## Where the work is (2026-06-02, auth-hardening pass executed, unpublished 0.16.0)

The auth-hardening pass executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet for the seven
mechanical tasks, Opus for Task 7's prose-and-memory rewrite), commits `ad19f0e..443ab01`. That is the eight
plan-task commits, one simplifier refinement (`9f9d5f5`), and one review-gate fold-in (`443ab01`). Local only, not
pushed, not published. Six units landed: the `__Host-` session cookie name derived from the request protocol
(`__Host-cairn_session` with `Secure` on https, plain `cairn_session` on local http, derived identically at set,
read, and clear); six baseline security headers on every admin response through `resolve()` (`nosniff`,
`X-Frame-Options: DENY`, a matching `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy: no-referrer`,
HSTS, a conservative `Permissions-Policy`), with non-admin responses untouched; a per-isolate `Map` memo of the GitHub
installation token (55-minute TTL under the one-hour lifetime, keyed by `installationId`, injected mint and clock);
a per-email magic-link cooldown (60 seconds, response unchanged so non-enumeration holds) plus a `platform.ctx.waitUntil`
background send with an inline fallback; lazy expired-row sweeps folded into `issueToken` and `createSession`; and an
https `requireOrigin` guard that allows http only for an exact `localhost` or `127.0.0.1` hostname. The smoke doc was
rewritten for the self-owned D1 model. The additive surface bumps the minor to `0.16.0`.

Final gate at the tip (`443ab01`): `npm run check` 753 files 0/0, `npm test` 98 files / 477 tests exit 0,
`check:package` all-green with no export-condition change. A simplifier pass made one cosmetic doc-comment fix
(`9f9d5f5`). Both applicable Opus reviewers ran: `web-auth-security-reviewer` (no Critical, no in-scope Important;
CSRF verification item PASS) and `cloudflare-workers-reviewer` (no Critical or Important; confirmed `db.batch`
atomicity, the per-isolate memo, the TTL margin, the `waitUntil` keep-alive). Two minor findings in this pass's own new
code folded in as `443ab01`: prefer the supported `platform.ctx` over the deprecated `platform.context` alias, and
match the localhost origin hostname exactly so `localhost.evil.com` cannot skip the https requirement. Plan and full
post-mortem: `docs/superpowers/plans/2026-06-02-cairn-auth-hardening.md`.

- Spec: `docs/superpowers/specs/2026-06-02-cairn-auth-hardening-design.md` (approved).

**Render-safety verification item: FAIL, escalated to its own pass (the plan's intended handling, not a blocker for
this pass).** The auth reviewer confirmed the reference delivery render path in `src/lib/render/pipeline.ts` composes
`remarkRehype({ allowDangerousHtml: true })` with `rehypeRaw` and no `rehype-sanitize`, and the showcase delivers its
output through `{@html}`, so author markdown carrying a `<script>`, an `onerror`, or a `javascript:` URI reaches the
published page verbatim. The deferred-CSP decision rested on render safety being the real XSS control, and that control
is absent on the reference path. Cairn's trusted-editor model lowers the likelihood (an owner-curated allowlist
committing through the GitHub App with history), so this is a malicious-or-compromised-editor and paste-mistake
exposure, not anonymous input. See the `cairn-render-sanitize-gap` memory.

**Live admin smoke:** the showcase runs on `@sveltejs/adapter-node`, not a Worker with a `wrangler` config, so there is
no `wrangler dev` admin Worker to smoke here. Real-Worker coverage for every changed behavior is the `integration` test
project (workerd against a real miniflare D1), green across `auth-guard`, `auth-confirm`, `auth-request`, and
`auth-cleanup`. The deployed-https browser smoke (a real browser round-tripping the `__Host-` cookie, an editor clicking
a real magic link) stays a human fast-follow, consistent with this project's precedent.

The render-safety pass was brainstormed and planned on 2026-06-02. The brainstorm settled the design forks, grounded in
a competitive survey (WordPress, GitHub, Hugo, Decap, Astro, and others): cairn belongs to the authors-but-filtered
camp, where the dominant override posture is an extend-only allowlist. Locked: the floor is `rehype-sanitize` inside
`createRenderer`, on by default, placed after `rehype-raw` and before the component dispatch so it cleans the untrusted
author content while the site's trusted `build()` output and its inline SVG icons are never sanitized; the schema is
`hast-util-sanitize`'s `defaultSchema` extended with the registry-derived directive markers and the benign tags real
content uses; the posture is extend-only with a developer-only `unsafeDisableSanitize` hatch; the admin preview collapses
onto the one floor, dropping the redundant DOMPurify pass and the `dompurify` dependency; and CSP stays a documented
site-level recommendation, not engine code.

**The render-safety pass is DONE (executed 2026-06-02).** See the top entry for the landing detail and the
authoritative next action (publish the `0.16.0`/`0.17.0` window, then the site migrations). The summary below
remains as the pass's design record.

## Where the work is (2026-06-02, delivery-robustness pass executed, unpublished 0.15.0)

The delivery-robustness pass executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet),
commits `aefabc6..40eb4d1` (the five plan-task commits, one simplifier refinement, one review fold-in). Local
only, not pushed, not published. It hardens the delivery surface against the misconfigurations and edge inputs
a migrating site can trip: `createContentIndex` excludes a validation-failed entry from the typed read (records
it in `problems()`, serves only `result.data`, the `raw as F` cast gone); `createSiteIndexes` throws at build
on an absent glob key for a declared concept and on a concept named `site`; `FeedItem.date` is optional and
the feed builders omit the date rather than emit `Invalid Date` (RSS) or throw a `RangeError` (JSON); and
`entryLoad` passes `feeds` to the head builder only for a dated entry, so an undated Page stops advertising the
post feed. The additive surface bumps the minor to `0.15.0`.

Final gate at the tip (`40eb4d1`): `npm run check` 751 files 0/0, `npm test` 96 files / 461 tests exit 0,
`check:package` all-green across the existing entries with no export-condition change. The end-to-end gate is
the showcase production prerender: the dated `hello` post carries both feed `rel="alternate"` links, the
`about` page carries none, and the feeds still render dated items (3 `<pubDate>`, 3 `date_published`). A
`code-simplifier` pass extracted a shared `parseFeedDate` (`022a0e1`). A `svelte-reviewer` (Opus) confirmed the
`entryLoad` spread is prerender-safe and the invalid-entry exclusion cannot serve raw frontmatter or break the
catch-all, no Critical or Important findings; the other three reviewers did not apply. A high-effort
`/code-review` (four angles) surfaced no confirmed bug: its two most-cited findings (the `validate:false`
exclusion and the `entry.date` feed gate) are both the plan's locked design, and `problems()` still records
every dropped entry. One review finding folded in as `40eb4d1`: the showcase feed routes now pass `p.date`
directly instead of the stale `?? ''` empty-string fallback, so the reference teaches the optional-date
contract a migrating site copies. No `/admin` surface changed, so the live admin smoke does not apply. Plan and
full post-mortem: `docs/superpowers/plans/2026-06-01-cairn-delivery-robustness.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-delivery-robustness-design.md` (approved).

**Migration gotcha to honor (Task 2's intended behavior):** `createSiteIndexes` now hard-fails when a declared
concept has no glob key. The ecnordic and 907 migrations must pass every declared concept's `import.meta.glob`
(an empty `{}` for an intentionally empty concept). A conditionally-omitted glob that used to default to an
empty index now throws at build. This is the loud-failure the guard exists for, a migration step to honor.

**Decision (2026-06-02): hold the `0.15.0` publish, and do the auth-hardening pass next.** The user chose to
keep `0.15.0` local and unpushed for now (engine work needs no publish; a publish can batch with the
auth-hardening landing later), and to sequence auth-hardening ahead of the site migrations.

The auth-hardening pass was brainstormed and planned on 2026-06-02. The brainstorm settled the design forks,
each grounded rather than defaulted. Install-token caching is an in-isolate memo, mirroring the
`@octokit/auth-app` default, with no new binding and no pluggable seam, since cross-isolate stores (KV, D1)
solve a sharing problem cairn's tiny write volume does not have. CSP is deferred: a correct admin CSP would
thread a SvelteKit nonce into CodeMirror's runtime styles and spans the library/site boundary, and the threat
it mitigates on `/admin` is weak, so the pass ships the five zero-cost enforcing headers and records the
render-path sanitization invariant as the real XSS control. The magic-link rate limit is a per-email cooldown
on the existing `magic_token` row, zero-migration, since the endpoint only sends to allowlisted editors. The
pass grew one unit during brainstorming, a lazy expired-row sweep, the single auth-adjacent backlog item.

**Immediate next action: execute the auth-hardening plan,
`docs/superpowers/plans/2026-06-02-cairn-auth-hardening.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default), from the
cairn-cms directory on `main`. Start at Task 1.** The plan is fully written (eight test-first tasks) and the
design is settled (spec `docs/superpowers/specs/2026-06-02-cairn-auth-hardening-design.md`, approved), so skip
brainstorming. It runs on `main` directly (additive or internal, no site deploys on a cairn-cms push) and bumps
`0.16.0`. The eight tasks: the `__Host-` cookie prefix (protocol-derived name), the five `/admin` security
headers in the guard, the in-isolate install-token memo, the magic-link per-email cooldown plus `waitUntil`
send, the lazy expired-row sweep, the https `PUBLIC_ORIGIN` guard, the admin smoke-doc rewrite, and the version
bump. The pass touches auth, session, cookie, and Worker code, so the pass-end review gate adds
`web-auth-security-reviewer` and `cloudflare-workers-reviewer` (both Opus), and the live admin smoke runs
against the rewritten doc (mint a D1 session row, send `Cookie: __Host-cairn_session=<id>`). Two verification
items run at the gate rather than as tasks: the SvelteKit CSRF origin check stays on, and the showcase
reference `render(md)` is confirmed not to emit raw author HTML.

After auth-hardening lands, the site migrations follow (per-site `site-pass`, ecnordic then 907, from each
site's own repo), which need `0.16.0` published first so a site can pin the range. The migration gotcha above
(pass every declared concept's glob) applies there.

## Where the work is (2026-06-02, schema Plan 3 / the SEO head consumer executed, PUBLISHED 0.14.0)

Schema-source-of-truth Plan 3 (the per-entry SEO head consumer) executed subagent-driven on `main`,
one `cairn-implementer` per task (Sonnet), commits `60e2d0c..bfeca52` (four plan-task commits plus one
review-gate hardening commit). **Pushed to origin and PUBLISHED as `0.14.0` (`latest` on npm via the OIDC
release `v0.14.0`, 2026-06-02), covering the whole unpublished `0.12.0`/`0.13.0`/`0.14.0` window in one
release.** **The schema-source-of-truth
initiative is now complete:** one `defineFields` declaration drives the editor form, the validator, the
inferred frontmatter type, and now the SEO head end to end. The additive surface bumped the version to
`0.14.0`, rolling on the unpublished window over `0.13.0`.

A new pure `src/lib/delivery/seo-fields.ts` holds `readSeoFields` (reads the four known head fields,
`description`/`image`/`robots`/`author`, off an entry's normalized frontmatter, keeping a present string
trimmed and omitting an absent, empty, or non-string value) and `resolveImageUrl` (turns an
author-supplied path absolute against the origin, returning `undefined` for a malformed string rather
than throwing at build), both re-exported from the delivery and root entries. `entryLoad` reads the SEO
fields once, applies the description fallback (`fields.description || entry.excerpt || description`) and
the default-image fallback (`fields.image ?? defaultImage`), resolves the chosen image absolute, and
spreads `image`/`robots`/`author` into the unchanged `buildSeoMeta`. `PublicRoutesDeps` gained an
optional `defaultImage`, the one site-wide OG image. The showcase declares the SEO fields, sets values on
the hello post and the about page, and passes a `defaultImage`.

Final gate at the tip (`bfeca52`): `npm run check` 751 files 0/0, `npm test` 96 files / 450 tests exit 0,
`check:package` all-green across the existing entries with no export-condition change. The end-to-end gate
is the showcase production prerender: the hello post carries its own `og:image`
`https://showcase.test/og/hello.png` and `article:author` `Showcase Author`, the second post (no declared
image) carries the default `og:image` `https://showcase.test/og/default.png`, and the about page carries
`robots` `noindex`. A code-simplifier pass found nothing to change. A `svelte-reviewer` (Opus) confirmed
the load is prerender-safe with correct fallback precedence and non-throwing error handling, no Critical or
Important findings; the other three reviewers did not apply (no Worker, D1, auth, session, cookie, or
DaisyUI code). Three reviewer findings folded in as `bfeca52`: `readSeoFields` now stores the trimmed
value (a stray `robots: "  noindex  "` had reached the head with surrounding whitespace), and two
docstrings now state the scope (`author` renders only for a dated entry's `article:author`, and the
bare-path image anchoring holds for the sites' bare-domain origin). No `/admin` surface changed, so the
live admin smoke does not apply. Plan and full post-mortem:
`docs/superpowers/plans/2026-06-01-cairn-schema-03-seo.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md` (initiative), design
  reference `docs/superpowers/specs/2026-06-01-cairn-schema-03-seo-design.md` (this plan).

**Immediate next action: execute the delivery-robustness plan,
`docs/superpowers/plans/2026-06-01-cairn-delivery-robustness.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default), from the
cairn-cms directory on `main`.** The plan is fully written (five test-first tasks) and the design is settled
(spec `docs/superpowers/specs/2026-06-01-cairn-delivery-robustness-design.md`, approved), so skip
brainstorming and start at Task 1. It runs on `main` directly (additive, no site deploys on a cairn-cms
push). The five tasks: keep invalid entries out of the typed read (`content-index.ts`, the Astro/Velite
model, delete the `raw as F` cast), guard a missing or reserved-`site`-key glob at build
(`site-indexes.ts`), omit a feed date rather than throw on a bad one (`feeds.ts`), scope feed autodiscovery
to dated entries (`public-routes.ts`), then bump to `0.15.0` with the showcase production prerender as the
end-to-end gate. Two items are deferred to the backlog (the permalink impossible-date and the excerpt CJK
counting), near-unreachable for the English sites.

After this pass lands, the remaining engine-backlog item is the auth-hardening pass (`__Host-` cookie
prefix, `/admin` security headers, rate-limit + `waitUntil` on the request endpoint, install-token KV
caching), independent and schedulable anytime. Then the site migrations onto the delivery surface, unblocked
on the registry side (the `0.13.0`/`0.14.0` window is published as `0.14.0`, `latest`, so a site pins
`^0.15.0` once this pass publishes).

## Where the work is (2026-06-01, schema Plan 2 / the contract cutover executed, unpublished)

Schema-source-of-truth Plan 2 (the adapter-contract cutover) executed and landed on `main`, commits
`a49c928..526b5b0` (six: five plan-task commits plus one review-gate hardening commit), local only and
not yet pushed or published. It is breaking on the adapter contract, so the version bumped to `0.13.0`,
rolling together with the unpublished `0.12.0` slot-render bump. One `defineFields` declaration is now the
single source of truth end to end: `ConceptConfig` dropped `fields`/`validate` for one generic `schema: S`
member, `defineAdapter<const A>` preserves each concept's concrete schema type, and `normalizeConcepts`
unpacks the schema onto the unchanged `ConceptDescriptor`, so the admin form, the save path, and
`siteDescriptors` needed no change. `validateFields` now omits empty optional values from a successful
result, so committed frontmatter stays minimal and the inferred optional-key type reads back accurate.
`createContentIndex` validates each entry once at build, keeps the cheap summary raw-derived, stores the
normalized `result.data` on the typed `frontmatter` detail field, and records a `ContentProblem` verdict via
`problems()` instead of throwing. `createSiteIndex` reads those verdicts, skips drafts, and throws one
combined report, so a half-finished draft no longer fails the build. The new `createSiteIndexes(adapter,
config, globs)` maps over a `defineAdapter`-typed adapter for one typed index per concept (`frontmatter`
typed as the concept's inferred schema) plus a `site` resolver; the showcase content layer migrated to it.
`validateFields` is no longer re-exported from the package entry.

Final gate at the tip: `npm run check` 749 files 0/0, `npm test` 95 files / 440 tests exit 0, `check:package`
all-green across all five entries (no export-condition change), and the showcase production build prerenders
the catch-all, feeds, sitemap, and robots. The `defineAdapter` type proof held with no constraint relaxation,
and Task 4's `expectTypeOf` (compile-checked by the 0/0 check) confirms the concrete schema type survives into
typed reads. A simplifier pass (no changes) and a high-effort seven-angle `/code-review` ran at the gate; none
of the four specialized reviewers applied (no Svelte, Worker, D1, auth, session, cookie, or DaisyUI code). The
review found one confirmed regression, folded in as `526b5b0`: the migrated showcase `posts` schema declared
only `title`/`date`, but the post files carry a `description` the SEO head reads, so validate-once dropped it
and the prerendered meta description silently fell back to the excerpt. Declaring the field restored it
(verified in the prerendered HTML). Plan and full post-mortem (with the carried follow-ups and the type-proof
detail): `docs/superpowers/plans/2026-06-01-cairn-schema-02-cutover.md`.

**The lesson for the site migrations: every frontmatter key a site reads must be declared in its concept
schema.** Validate-once serves only declared fields on `.frontmatter`, so a migrating site reading an
undeclared key gets `undefined` and a silent degrade, not an error. The ecnordic and 907 migrations each audit
their content for every read key before declaring the schema.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md`.

**Plan 3 is DONE (executed 2026-06-01).** See the top entry for the landing detail and the authoritative
next action (a sequencing fork: the residual delivery follow-up, auth hardening, or the site migrations,
each design-bearing). The design record below remains as the initiative's history.

Design settled (2026-06-01 brainstorm): the site-level default is the OG image only (`deps.defaultImage`), per
the absence-is-meaningful test and the convention across comparable tools; `robots` and `author` stay strictly
per-entry, with a `defaultAuthor` knob as a cheap symmetric addition later only if a real site asks. The
cross-concept catch-all reads the SEO fields by name off the normalized `.frontmatter` through a small typed
reader; the typed payoff is the full schema-to-head loop, not a statically typed catch-all.

After Plan 3 lands, the schema initiative is complete. The residual delivery items (the feed/excerpt/permalink
guards, the failure-path `frontmatter` typing, the reserved-`site`-key guard, the silent-empty-glob warning) stay
a small separate follow-up pass, after the schema initiative and before the site migrations. Publishing the
`0.13.0`/`0.14.0` window stays a separate release step, not urgent until the backlog clears.

## Where the work is (2026-06-01, schema Plan 1 / the schema primitive executed, unpublished)

Schema-source-of-truth Plan 1 (the additive `defineFields` primitive) executed and landed on `main`,
commits `80d2b84..c5ab533` (seven: five plan-task commits, one simplifier pass, one review-gate
hardening commit), local only and not yet pushed. It is additive and zero-blast, so it bumps no version;
the breaking `ConceptConfig` cutover is Plan 2. The new `src/lib/content/schema.ts` turns one `const`
field tuple into three faces from a single declaration: a plain `fields` array for the editor form, a
generated `validate` that delegates to the existing `validateFields` baseline and then layers the
declarative per-field rules (`min`/`max`/`length`/`pattern` on text and textarea, `min`/`max` on date)
and an optional validation-only `refine(data, body)` cross-field hook, and an inferred frontmatter type
via `InferFields`/`Infer`. A `~standard` Standard Schema v1 property gives ecosystem interop as a thin
adapter over `validate`, with a local types-only copy of the interface and no runtime dependency. The
primitive is re-exported from the package main entry; no consumer wires it yet (that is Plan 2).

Final gate at the tip: `npm run check` 745 files 0/0, `npm test` 93 files / 430 tests exit 0,
`check:package` all-green for the existing main entry (no new export condition). A simplifier pass (which
dropped the redundant field-variant casts in `applyRules`, since the discriminated union narrows on the
type guard) and a high-effort `/code-review` ran at the gate. None of the four specialized reviewers
applied, since the pass touched no Svelte, Worker, D1, auth, session, cookie, or DaisyUI code. Two
correctness findings were folded in test-first as the hardening commit: a malformed `pattern` now compiles
once in `defineFields` and fails fast there with a config error naming the field, instead of throwing an
uncaught `SyntaxError` from inside `validate()`; and `~standard.validate` coerces a null frontmatter or body
to the empty form, so it returns issues rather than dereferencing null. Plan and full post-mortem:
`docs/superpowers/plans/2026-06-01-cairn-schema-01-primitive.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md`.

**Plan 2 is DONE (executed 2026-06-01).** See the top entry for the landing detail and the authoritative next
action (brainstorm then write Plan 3, the SEO head consumer). The brainstorm record below remains as the
initiative's design history.

Brainstorm settled (2026-06-01): keep `Infer`'s optional-key shape, and change the absorbed validator to omit
empty optional values (empty string, `false`, empty array), so committed frontmatter stays minimal and the
optional-key type reads back accurate. The SEO consumer stays a separate Plan 3. Drafts are skipped at the
build gate. The emission decision is recorded in the spec's "The schema primitive" section. Plan 3 (the
per-entry SEO head consumer) is written just-in-time after Plan 2 lands.

## Where the work is (2026-06-01, component-completion Pass 1 / slot render executed, unpublished)

Component-completion Pass 1 (the slot render path) executed and landed on `main`, commits `2bca500..d0c3e0a`
(eleven: nine plan-task commits, one simplifier pass, one review-gate hardening commit), local only and not
yet published. It builds the component named-slot render path end to end. `remarkDirectiveStamp` now stamps a
registered component's declared attributes, marks its `[label]` title paragraph, and stamps each nested slot
directive so they survive to hast. The rehype dispatch partitions those into named slots and hands `build` a
`ComponentContext` (`attributes`, `slot(name)`, `items(name)`, `node`), replacing the old `build(node)`
signature. That is the breaking change, so the version bumped to `0.12.0`. The showcase `callout` proves the
path, and the production build prerenders it to `<aside class="callout callout-warning">` with title, body, and
points. The folded hardening all landed: the `glyph` unknown-icon guard, the `validateComponent` single-parse
seam, the `splitHead` retirement, the repeatable-form stable identity, and the form a11y polish.

Final gate at the tip: `npm run check` 742 files 0/0, `npm test` 91 files / 410 tests exit 0, `check:package`
all-green for `0.12.0`. A simplifier pass (which extracted a shared `dataAttrProp` so the stamp/read casing
contract is one source of truth), plus `svelte-reviewer` and `daisyui-a11y-reviewer` (both Opus), ran at the
gate. The `cloudflare-workers-reviewer` and `web-auth-security-reviewer` did not apply, since the pass touched
no Worker, D1, auth, session, or cookie code. Both reviewers converged on one Important finding, the `IconPicker`
roving-tabindex pattern not moving DOM focus on arrow keys; it was folded in test-first (focus follows selection
via `tick()` then the live tab stop, the arrow origin derives from the tab stop, and the group label threads from
the field). Plan and full post-mortem: `docs/superpowers/plans/2026-06-01-cairn-components-03-slot-render.md`.

- Design: `docs/superpowers/specs/2026-06-01-cairn-engine-backlog-and-slot-render-design.md`.

**Carried fast-follow: the live `/admin` guided-insert smoke (Task 10) is unrun.** It needs a human clicking
through the insert dialog in a browser against a real Worker. The render path is proven by the showcase
production build and the form-to-editor flow by the browser component tests, so it is a fast-follow, best run
during the ecnordic component migration against that site's real Worker.

**Pass 2 was reframed (2026-06-01).** Brainstorming the typed-reads item escalated it into a foundational
**schema-source-of-truth** initiative, run before the site migrations while the adapter contract is still
pre-scaffolder and pre-adoption. One per-concept declaration (`defineFields`) becomes the single source of
truth, yielding a plain-data field projection for the editor form, a generated validator, and an inferred
frontmatter type. The design was pressure-tested against nine comparable systems (Keystatic, Tina, Astro,
Velite, Contentlayer, Nuxt Content, Sanity, Payload, Decap), which confirmed the single-declaration unification
and the no-codegen runtime inference, and drove four revisions: a corrected anti-Zod rationale, declarative
per-field rules (`min`/`max`/`length`/`pattern`), Standard Schema (`~standard`) conformance, and the
load-bearing invariants. Decision locked: **own the primitive** (not Zod/Valibot), conform to Standard Schema
for interop. Spec: `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md`. The initiative is
three plans: Plan 1 the additive primitive, Plan 2 the contract cutover (`ConceptConfig` to a `schema` member,
`defineAdapter`, `createSiteIndexes`, validate-once normalized reads, skip-drafts), Plan 3 the per-entry SEO
head consumer. The residual delivery items (feed/excerpt/permalink guards) become a small follow-up; Pass 3
(auth hardening) and the site migrations follow.

**Schema Plan 1 is DONE (executed 2026-06-01).** See the top entry for the landing detail and the
authoritative next action (brainstorm then write Plan 2, the contract cutover). Publishing `0.12.0` stays a
separate release step, not urgent until the backlog clears.

## Where the work is (2026-06-01, delivery-surface DX executed, unpublished)

The delivery-surface developer-experience pass executed and landed on `main`, commits `d606676..27deb16`
(thirteen: ten plan tasks plus three review-gate fixes), local only and not yet published. The delivery
layer is now the blessed, backend-free public path a SvelteKit site wires in a few lines. It adds the
fourth package entry `@glw907/cairn-cms/delivery` (imports no auth, github, or email, enforced by a
boundary test), build-time validation safe-by-default in `createSiteIndex` (`{ validate: false }` opt-out),
a ready `seo: SeoMeta` from the catch-all `entryLoad`, the `responses.ts` feed/sitemap/robots `Response`
helpers, `json-ld.ts` with breakout-safe escaping, the `<CairnHead>` head component (`title={false}` to let
a site own its `<title>`), the `siteDescriptors(adapter, config)` one-liner, `buildSeoMeta` `robots` and
`article:*` tags, and generic-over-frontmatter content reads (`createContentIndex<F>`) for a later
typed-reads pass. The showcase wires every surface (`content.ts`, the `[...path]` route, feed.xml,
feed.json, sitemap.xml, robots.txt) and the production build prerenders them as the end-to-end gate.

Final gate on `main`: `npm run check` 739 files 0/0, `npm test` 88 files / 398 tests exit 0,
`check:package` green (attw all-green for `/delivery`), showcase build prerenders all feeds and the
catch-all. A simplifier pass, a `svelte-reviewer`, a `daisyui-a11y-reviewer` (both Opus), and a
two-angle `/code-review` ran at the gate; three findings were folded in (the U+2028/U+2029 JSON-LD
escape gap, the missing showcase `feed.json` route the head advertised, a repeated concept lookup).
Plan and full post-mortem with the carried open decisions: `docs/superpowers/plans/2026-06-01-cairn-delivery-dx.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-delivery-dx-design.md`.

**Published as `0.11.0` (`latest` on npm, OIDC release `v0.11.0`, 2026-06-01); `main` pushed (commits
`d522dfd..41b7a42`).** The delivery surface is now consumable as `@glw907/cairn-cms/delivery`.

**Decision (2026-06-01): clear the engine backlog before any site migration, as three
surface-focused passes; hold the roadmap initiatives out.** Brainstormed and scoped with the user.
The sites (ecnordic component migration + delivery Pass 1c, 907 catch-up) wait until these land. The
three passes:
1. **Component completion** (next, design written). The component slot render path end to end plus the
   render/grammar hardening, the Plan 2 form fixes, and the live `/admin` smoke. Design:
   `docs/superpowers/specs/2026-06-01-cairn-engine-backlog-and-slot-render-design.md`. The render half
   of the component initiative was never built: `remarkDirectiveStamp` only stamps registered component
   directives, so nested `:::title`/`:::actions` slots are dropped on the way to hast and the Plan 2 form
   can insert markup that renders to nothing. Pass 1 stamps slots at remark, partitions them at dispatch,
   and changes `ComponentDef.build` from `build(node)` to `build(ctx)` (`{ attributes, slots, node }`,
   rendered hast per slot) so a site `build()` arranges hast and never walks the tree. Breaking on
   `ComponentDef.build`, so it bumps the version. Folded hardening: `splitHead` heading-sniffing retires
   (its crash with it), the `glyph` unknown-icon guard, the `validateComponent` double-parse, the form
   repeatable-id + a11y fixes.
2. **Delivery/SEO hardening.** Skip-drafts-at-build, per-entry `image`/`robots`/`author` in the SEO head,
   the feed/excerpt/permalink edge cases, and typed reads (infer `F` from concept fields, apply the
   validator's normalized `data` on read).
3. **Auth hardening.** `__Host-` cookie prefix, `/admin` security headers, rate-limit + `waitUntil` on the
   request endpoint, install-token KV caching.

**Pass 1 status: DONE (executed 2026-06-01).** See the top entry for the landing detail; the authoritative
next action now lives there. The summary below remains as the pass's scope record. It bumped to `0.12.0`
(Task 9) for the breaking `build` change; publishing stays a separate release step after the pass. After Pass 1
lands and publishes, the ecnordic
component migration becomes a site-pass that refactors ecnordic's `build()` to `build(ctx)`. 907-life has
no directive components (plain remark-html, still on `0.6.0`), so it is out of the component initiative;
its only pending work is the version catch-up. Carried for the later delivery migration: the
build-validation date gotcha (an unquoted YAML `date` arrives as a JS `Date`, so a site's hand-rolled
`validate` must route it through `validateFields` or coerce).

Carried out-of-scope follow-ons: typed reads, OpenGraph image generation, redirects, i18n, and the two
delivery-validation refinements in the post-mortem (skip-drafts-at-build and apply-normalized-`data`-on-read).

## Where the work is (2026-05-31, post-component-form)

- Component registry Plan 2 of 3 (admin guided-insert form) executed, landed on `main`, pushed, and
  published as `0.10.0` (`latest` on npm via the OIDC release `v0.10.0`; commits `a3b38a3..008fc33`
  plus the docs and release-bump commits). `0.10.0` is additive over `0.9.0`: it bundles both
  component plans (Plan 1 grammar and Plan 2 form), and `ComponentPalette` was born and removed inside
  the unpublished window so no published export was dropped. It builds the guided-insert flow on
  Plan 1's grammar: `buildComponentInsert(def, values)` (the one pure serialize-then-validate step,
  exported from the main entry), `ComponentForm.svelte` (schema-driven fields, a repeatable
  add-and-remove list, inline validation errors), `ComponentInsertDialog.svelte` (the Insert trigger
  and a native `<dialog>` picker with the schema-vs-template dual path), and `IconPicker.svelte` over
  a site `IconSet` that now threads from the adapter through `composeRuntime` to `EditPage` to the
  form. `ComponentPalette` is removed; the dialog's dual path closes the Plan 1 no-op-def finding.
  The render `build()` path is untouched (that is Plan 3). Green at close: `npm run check` scan 0/0
  over 725 files, `npm test` 375 tests exit 0, `check:package` green, showcase builds. Execution
  deviations locked in: the unions are narrowed with typed accessors (no `any`) and `slotItems`
  returns the live `$state` proxy; `ComponentForm` is `{#key picked}`-wrapped so its `untrack` seed
  cannot go stale; the Insert trigger gets `aria-label="Insert component"` to avoid colliding with the
  form's submit. A review gate (simplifier plus svelte and daisyui-a11y reviewers, both Opus) ran;
  its findings were folded in test-first as the `008fc33` hardening commit (dropped the
  listbox/option roles for a plain button list, named the dialog, `role="alert"` plus `aria-invalid`/
  `aria-describedby` on the validation errors, the `{#key}` guard, the 24px remove-button floor).
  Plan and full post-mortem: `docs/superpowers/plans/2026-05-31-cairn-components-02-form.md`.
  **Queued (sequence against the delivery-surface DX pass above): brainstorm then write Plan 3
  (per-site migration: each site declares its UI components and `build()` reads named slots instead of
  the old heading convention, ecnordic then 907). It is the last of the three-plan component initiative. This is a design-bearing pass, so run
  `superpowers:brainstorming` with the user on the open decisions before `superpowers:writing-plans`;
  do not auto-write it. Parent design: `docs/superpowers/specs/2026-05-31-cairn-site-components-design.md`.
  Before Plan 3 ships, the live interactive `/admin` smoke for the guided-insert flow is the one
  unverified Plan 2 surface (see the carried follow-up).** Plan 3 is where the sites pin `^0.10.0` and
  the symlink dev link can engage.

## Earlier state (2026-05-31, post-component-grammar)

- Component registry Plan 1 of 3 (engine grammar and schema) executed and landed on `main`
  (commits `dbc1b69..174e02c`, not pushed, not published). It extends `ComponentDef` with a
  typed schema (`attributes` + named `slots`, plus `use`), adds the three grammar machines
  (`serializeComponent`, `parseComponent`, `validateComponent`) over one canonical
  `remark-directive` grammar, and `generateComponentReference` for the llms-full author/AI
  reference. Pure node `unit` code; `build()`, the render dispatch, and `insertTemplate` are
  untouched (`insertTemplate` only moved to optional). Green at close: `npm run check` scan 0/0
  over `src/`, `npm test` 360 tests exit 0, `check:package` green. Three corrections locked in
  during execution: `insertTemplate` became optional with a one-line palette guard;
  `remark-stringify` was an undeclared dependency (added and the committed lock relocked);
  and the plan's backslash-escaping premise was wrong (the directive grammar decodes HTML
  entities, so attribute quotes entity-encode instead). A svelte review plus a correctness
  review ran at the gate; the correctness findings were folded in test-first as a Task 9
  hardening pass (entity-encode quotes, escape title brackets, quote-aware unknown-attribute
  detection, repeatable-slot array guard, pinned `bullet: '-'`). Plan and full post-mortem:
  `docs/superpowers/plans/2026-05-31-cairn-components-01-grammar.md`. **Immediate next action:
  execute Plan 2 (the admin guided-insert form),
  `docs/superpowers/plans/2026-05-31-cairn-components-02-form.md`, via `cairn-pass` +
  `subagent-driven-development`, dispatching the `cairn-implementer` per task (Sonnet default fits
  these well-specified tasks). Ten tasks, test-first, building on Plan 1's `serializeComponent`/
  `validateComponent`/`emptyValues` and the editor's `registerInsert` seam. It is engine + admin-UI,
  no site migration; run it on `main` directly (additive, no site deploys on a cairn-cms push) or a
  worktree off `main`. Design: `docs/superpowers/specs/2026-05-31-cairn-components-02-form-design.md`.
  The brainstorm settled a modal dialog that folds in the palette, a visual icon picker fed by a site
  `IconSet` threaded through the adapter (with a None choice when the icon field is optional), reuse
  of `validateComponent` as the form validator, a schema-vs-template dual path (which also resolves
  the Plan 1 no-op-def finding), and body validation deferred.**

## Earlier state (2026-06-01, post-editor-swap-publish)

- The editor foundation swap (Carta to CodeMirror 6) MERGED to `main`, pushed to origin, and PUBLISHED
  as `0.9.0` (now `latest` on npm via the OIDC release `v0.9.0`). It replaces Carta with a
  client-only CodeMirror 6 edit surface behind the unchanged `MarkdownEditor` seam
  (`value`/`name`/`registerInsert`), gives cairn its own house-icon `EditorToolbar.svelte` and a pure
  node-testable `markdown-format.ts`, drops the dead Carta `preview` adapter prop from `EditPage`, and is
  breaking (the `preview` prop and the carta-md peer both left). Green on `main` after the merge: `npm run
  check` 0/0 over 707 files, `npm test` 331 passed exit 0. The showcase production build code-splits
  CodeMirror to client chunks with no `@codemirror/view` in the server bundle. Two review subagents
  (svelte, daisyui-a11y) plus a simplifier pass were folded in (the `$bindable` seam reconciles an external
  value change into the mounted view, a focus ring was restored, toolbar targets reach the 24px floor, and
  the toolbar uses the admin's stroke SVG icon set). Plan and post-mortem:
  `docs/superpowers/plans/2026-05-31-cairn-editor-codemirror-swap.md`. The `feat/editor-codemirror-swap`
  worktree and branch were removed after the merge. Carried follow-up: the interactive browser smoke (live
  typing, the focus ring, toolbar formatting) is the one unverified surface; the automated gate and the prod
  build cover the rest.
- The site UI component registry is designed; Plan 1 of 3 (engine grammar and schema) is now executed
  and landed (see the top entry). Each site will declare its UI components once (typed attributes, named
  slots, description, intended-use, render). One canonical directive grammar drives a guided insert form
  for non-technical editors, save+build validation, and a generated `llms-full`-shaped reference file an
  author points claude.ai at. Research grounded three choices: explicit named slots over an implicit
  heading, a parse-ready grammar for later round-trip editing, and schema validation. Insert-only in v1.
  Design: `docs/superpowers/specs/2026-05-31-cairn-site-components-design.md`; Plan 1 (engine grammar and
  schema, no UI): `docs/superpowers/plans/2026-05-31-cairn-components-01-grammar.md`. Plans 2 (admin guided
  form) and 3 (per-site migration, ecnordic then 907) are written just-in-time after each lands. Builds on
  the editor swap's `registerInsert` seam, now published.
- The dated-slug identity pass landed on `main` (commits `dd2a265..77d9bf2`), bumping the local
  version to `0.8.0` (published to npm). It gives dated concepts a split id/slug identity (id is the
  filename stem, slug is the date-stripped id), adds a per-concept `datePrefix` granularity knob,
  moves per-concept URL policy (`permalink`, `datePrefix`) into the admin-editable YAML site-config
  under an SSG model, and unifies public delivery behind a site-level `byPermalink` resolver one
  catch-all `[...path]` route serves. Green at close: `npm run check` 0/0 over `src/`, 315 tests exit
  0, `npm run check:package` clean. Three review subagents returned no blockers; four small findings
  were folded in. Design: `docs/superpowers/specs/2026-05-31-cairn-dated-slug-design.md`; plan and
  post-mortem: `docs/superpowers/plans/2026-05-31-cairn-dated-slug.md`. The pass ran directly on
  `main` (user-authorized), not a worktree. Not yet published to npm and not yet smoke-tested against
  a live Worker.
- Rebuild plans 00 through 08 landed earlier. The public content delivery layer landed too. It merged
  to `main` (merge `6080496`) and published as `0.7.0`, the `latest` tag on npm. The delivery layer is
  additive over the 0.6.0 admin and auth surfaces, so it shipped as a minor. Green at that merge:
  `npm run check` 0/0, 285 tests exit 0, `npm run check:package` passing. The publish ran through the
  OIDC trusted-publishing workflow off the `v0.7.0` GitHub Release.
- Both consumer sites (907-life, ecnordic-ski) still run `0.6.0`. They cut over to it, merged to
  their mains, deploy via CI, and passed a full live magic-link smoke. The dormant better-auth
  tables and AUTH_KV are deleted. Neither site has migrated onto the delivery surface yet.

## Worktree topology

- `~/Projects/cairn/cairn-cms` is the `main` checkout, canonical, and the only worktree. STATUS.md
  is canonical here.
- The two merged feature worktrees are gone. `cairn-public-delivery` (`feat/public-delivery`) was
  pruned at the 0.7.0 landing; `cairn-cms-rebuild` (`feat/rise-data-attr`) was removed and its branch
  deleted in the teardown pass (2026-05-30).
- Structural decision (settled): keep the `~/Projects/cairn` meta-workspace through the site
  co-evolution phase. The sites are about to migrate onto the `0.7.0` delivery surface, which is the
  strongest case for zero-publish symlink dev. Dissolving the workspace to standalone top-level
  repos is deferred until cairn-cms stabilizes after the scaffolder (Plan 10).
- Symlink dev is documented and proven, currently off. The runbook is
  `docs/runbooks/symlink-dev.md`. npm links a member only when its version satisfies the consumer's
  range, so the link engages per-site at first migration, when a site moves to `^0.7.0` (which also
  forces the `renderPreview`-to-`render` adapter rename and a deploy). The teardown pass proved the
  end-to-end link against 907-life and found two conditions the original plan missed, both now in the
  runbook: the local cairn-cms version must run a proper patch *ahead* of the published one (an exact
  `0.7.0 == registry 0.7.0` makes npm prefer the tarball; a prerelease like `0.7.1-dev` fails to
  satisfy `^0.7.0`), and the root `package-lock.json` must be deleted after the bump so npm
  re-resolves instead of honoring the stale registry pin. A member-local `node_modules` copy also
  shadows the link and must be removed. A root-level `npm install` was verified not to drift either
  site's committed lock, and standalone `npm ci` stayed green for both. See
  [[workspace-symlink-and-next-pass]].

## Open decisions and next steps

Do these in order.

0. Editor swap is merged, pushed, and published as `0.9.0` (`latest` on npm), `0.8.0` published earlier
   (done). The interactive browser smoke remains a fast-follow: live keyboard behavior in the showcase admin
   editor (typing, the focus ring, toolbar formatting, the palette insert, the preview toggle). Pushing
   cairn-cms `main` does not deploy a site (only the site repos deploy on push).
0a. Publishing: the registry carries `0.17.0` (`latest`, published 2026-06-02), which rolled the `0.15.0`
   (delivery robustness), `0.16.0` (auth hardening), and `0.17.0` (render safety) window into one release
   over the prior `0.14.0`. A migrating site can import `@glw907/cairn-cms/delivery` and pin `^0.17.0`.
   Breaking notes a consuming site must honor at the bump: the `MarkdownEditor` `preview` prop is gone
   (since `0.9.0`), `ComponentDef.build` is now `build(ctx)` (since `0.12.0`), and the adapter contract
   takes one `schema` member via `defineFields`/`defineAdapter` (since `0.13.0`).
1. Migrate each site onto the published delivery surface (`^0.17.0`), one per-site
   `site-pass`, from that site's own directory. Each imports from `@glw907/cairn-cms/delivery`, applies
   the `renderPreview`-to-`render` rename, builds the content layer with `siteDescriptors` +
   `createSiteIndex` (which now validates frontmatter at build), adopts the `responses.ts` feed/sitemap/
   robots helpers and the `<CairnHead>` SEO head, wires the catch-all `[...path]` route, sets its
   per-concept URL policy in the YAML (`907`: `datePrefix: day`, `/:year/:month/:day/:slug`; `ecnordic`:
   `datePrefix: month`, `/:year/:month/:slug`), and drops its hand-rolled `posts.ts`/`feed.ts`.
   `examples/showcase` is the complete working reference. **Gotcha to honor (from the delivery DX review):
   the build-time validation feeds `parseMarkdown` frontmatter to the site's `validate`, where an unquoted
   YAML `date:` is a JS `Date`, not a string. A hand-rolled `validate` that string-checks `date` must route
   it through `validateFields` or coerce it, or the build rejects valid dated posts.** Existing filenames and
   URLs are preserved with zero redirects. This is where the symlink engages
   (`docs/runbooks/symlink-dev.md`) and where the production deploys happen. The live `/admin` smoke
   for the dated create flow is best run here, against the real Worker.
2. The internal-link picker is the next editor pass (post-to-post linking via a `cairn:<concept>/<id>`
   token resolved at build). It builds directly on the new CodeMirror surface and the `registerInsert`
   seam, which is why the seam's two-way `value` flow was made correct in this pass.
3. Next cairn engine passes, each its own brainstorm-then-plan: a content-lifecycle pass (atomic
   Git Data API move primitive, delete, rename, internal-link rewriting; external redirects stay the
   site's job) and a settings-editor pass (the admin web UI to edit the YAML URL policy and other
   settings). Then the still-pending CairnExtension dispatch and the `create-cairn-site` scaffolder.
   Both deferred passes are scoped in the dated-slug design doc's future-work section.

Launch directory: start Claude inside the repo a pass targets (cairn-cms or a site), so that repo's
own `.claude/` hooks and per-project memory stay active. The workspace `CLAUDE.md` still loads as a
parent. Reserve `~/Projects/cairn` for cross-repo or workspace-config chores. The launch-directory
table also lives in `docs/runbooks/symlink-dev.md`.

The teardown pass settled the carried loose ends: the content-concepts design doc is committed as
history (`5c10058`), and the stale in-progress breadcrumb in `docs/PLAN.md` was discarded (its
outcome is in the functional spec).

## Carried follow-ups (latent, not bugs under current conventions)

- Delivery DX (mostly RESOLVED across schema Plan 2 and the delivery-robustness pass): the schema Plan 2
  cutover added skip-drafts at the `createSiteIndex` gate and validate-once storing `result.data` on the typed
  read, so the build-over-drafts and serve-raw-frontmatter items are closed. The delivery-robustness pass closed
  the rest: a validation-failed entry is excluded from the typed read (Task 1), `entryLoad` no longer attaches
  feed autodiscovery to undated Pages (Task 4), and the feed builders omit an absent or `Invalid Date` pubDate
  rather than emit it (Task 3). The remaining note is the build-validation date-shape gotcha (an unquoted YAML
  `date` arrives as a JS `Date`), recorded in the site-migration step above, since that is where a hand-rolled
  validator would meet it.
- Component registry (Plan 1, RESOLVED by Plan 2): the old palette rendered a no-op item for a def
  lacking `insertTemplate`. The Plan 2 dialog replaces the palette with a dual path (schema def opens
  the form, template-only inserts directly, a def with neither is omitted), so the no-op is gone.
- Component form (Plan 2): the live interactive `/admin` smoke against a real Worker (open the
  dialog, fill the form, insert into the editor) is unverified; the browser-layer component tests and
  the untouched auth/save flow make it a fast-follow, not a blocker. Repeatable items are bare strings
  keyed by index, so a mid-list removal reuses DOM nodes by position (values stay correct, focus
  identity does not follow an item); a stable per-item id is the fix once multi-field repeatable items
  arrive. Minor a11y polish left: the flat fields carry a redundant `aria-label` alongside their
  visible `<label>`, the per-item input label is generic rather than indexed, and `IconPicker` is an
  `aria-pressed` toggle group that could move to radiogroup semantics.
- Component grammar (latent, low likelihood for the planned sites): an attribute value with a literal
  newline is unsupported (single-line form fields make it unreachable); `validateComponent` parses the
  markdown twice (fine, validation is not hot). Multi-field repeatable items stay deferred by design, and
  `build()` reads the old heading convention until Plan 3 refactors each site to read slots.
- Dated slug: the admin create date-in-slug guard rejects any slug opening with `^\d{4}-` on a dated
  concept, broader than the `datePrefix` strip (a `day` concept strips only a full `YYYY-MM-DD-`). A
  post deliberately slugged `2026-recap` is refused with the "leave the date out" hint. Acceptable
  since the date is captured separately; revisit if a real title trips it.
- Public delivery: the feed date throw is RESOLVED (the robustness pass made `rfc822`/`iso` total, omitting an
  absent or unparseable date). Still latent: a dateless entry sorts last in a dated concept; `deriveExcerpt`/
  `wordCount` assume whitespace-delimited words (the deferred excerpt-CJK item); the permalink date parse
  accepts a shape-valid but impossible date (the other deferred item).
- Render hardening: `splitHead` dereferences a missing `<h2>`; `glyph` serializes `d="undefined"`
  for an unknown icon. Both inherited from legacy, unreachable under the sites' content.
- Auth hardening: RESOLVED by the 2026-06-02 pass (the `__Host-` cookie prefix, `/admin` security headers, the
  install-token in-isolate memo, the magic-link cooldown plus `waitUntil`, the lazy expired-row sweep, the https
  `requireOrigin` guard). Two latent items remain. The guard's own 303 login-redirect skips the security headers,
  since `throw redirect(...)` unwinds before the post-resolve header step (low impact: a bare redirect with a
  `Location` and `Set-Cookie`, and the `/admin/login` page itself does get the headers). The render-safety FAIL is the
  escalated security item, now the immediate next pass (see the top entry and `cairn-render-sanitize-gap`).

## Durable operational traps

- Both sites deploy on push to `main`. An editor SAVE commits content to `main` and triggers a
  redeploy, so a cutover must merge to `main` rather than run from an unmerged branch.
- The npm workspace root makes `npm install` from a member update the root lock, leaving the
  member's committed lock stale and failing CI `npm ci`. Relock standalone: temp-move the root
  `package.json` and lock, `rm -rf node_modules package-lock.json`, `npm install`, restore the
  root, commit the lock.
- npm 11 does not apply `publishConfig.exports` on pack, so `exports` point at `dist/` always with
  a `prepare` build.
- `npm run check` exits non-zero locally on the showcase `svelte.config.js` (it imports
  `@sveltejs/adapter-node`) unless the showcase deps are installed (`cd examples/showcase &&
  npm install`). CI checks out cairn-cms standalone and stays green. The svelte-check scan itself
  is 0 errors 0 warnings either way.
- Durable cross-cutting gotchas are the focused `cairn-*` memories (email send vs routing, the
  GitHub App PKCS#1 to PKCS#8 wrap, DaisyUI v5 form classes, carta-md NodeNext typing, the
  subagent model assignment, prose-guard tiers, dispatch discipline, the code-simplifier rule).
