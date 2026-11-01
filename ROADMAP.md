# Roadmap

cairn-cms is `0.x` and breaks between minor versions; the latest published
release is `0.98.0`. The author is still working through the core-feature roadmap, and the project stays
closely held until that core lands.

This roadmap is a direction, not a commitment. Priorities shift as consumer sites surface needs,
and items move up from lower tiers as the core fills in.

**This file is a pass dimension.** A pass that ships a roadmap item marks it done and removes it from the
live tiers, and a pass that surfaces a new direction files it into the right tier, the same way a pass
updates its reference docs. Shipped history lives in git, PR bodies, and `docs/STATUS.md`, not
here, so this file stays a forward view.

## Toward 1.0

cairn is `0.x` on purpose: it still breaks public seams between minors while the core lands, and SemVer
reserves `0.x` for exactly that. `1.0` is not a maturity badge; it is the commitment that breaking a public
seam becomes a major-version (`2.0`) event, which the charter already calls "a deliberate major-version
event, not an everyday one." Cut it when the surface stops moving, not on a date.

**Beta waits for the new ASC site and ecxc, deliberately (Geoff, 2026-08-26, the consultation
sitting).** Their remaining work runs inside the pre-beta window specifically to maximize engine
quality: every one of their passes consults the engine through the `engine-consult` protocol while
reshaping is a cheap `0.x` event, and the "seams have held across an initiative or two" clock below
starts only after those consultations stop producing accepts. The consultation runway is what the
two-site condition buys; rulings accumulate in `docs/internal/engine-rulings.md`.

**Release mechanics per phase (Geoff, 2026-08-05, the harvest sitting).** The `0.94.0-rc.1`
candidate **published 2026-08-05** to the `next` dist-tag, a one-time guard for the current window,
which is the largest breaking window to date and is proven only against the self-authored showcase;
it is not a pattern, and later pre-beta cuts go straight to the final number with patches as the
correction channel. The publish workflow now derives its dist-tag from the version, so any
prerelease lands on `next` and `latest` keeps serving the last stable, and `check:version` sizes a
prerelease against the nearest earlier heading whose numeric core differs. At beta the scheme
switches to `1.0.0-beta.N` prereleases under that same `next` tag: breaking changes stay allowed
between
betas, each carrying migration notes, while the seam surface hardens against its first outside
consumers. From `1.0.0` on the number carries compatibility under strict SemVer: breaking changes
batch into majors with one migration guide, minors are additive, patches are fixes, `Consumers
must:` lines appear only in majors, and a release candidate exists only ahead of a major.

Readiness checklist:

- [ ] **The public seams have held across an initiative or two with no breaking change**: the adapter and
  field schema, `render`, the admin mount (`createCairnAdmin`, the `CairnAdminShell` custom-route seam, the
  `navLayout` seam), the route factories (`createContentRoutes`, `createPublicRoutes`), the admin design
  vocabulary (the `text-muted` / `text-subtle` role layer), the log event names, `/log`, and
  `/admin-toolkit`.
- [ ] **No known breaking change is pending** on the public surface, or each is consciously deferred to the
  first post-1.0 major. The SvelteKit 3 move took the `checkOrigin` removal and the `event.platform` retirement
  ahead of 1.0; the standing candidate is SvelteKit's remote functions, which stay experimental in Kit 3, so
  decide at their stable release whether adopting them lands before 1.0 or becomes the first 2.0 driver.
- [ ] **Both consumer sites run the latest published cairn on the v2 adapter**, with their URL policies
  transcribed onto `defineConcept` (the per-site cutover watch items), so the real surface is exercised and
  needs no engine break to serve them.
- [ ] **The enforced boundary is green and complete**: `check:surface`, `check:tiers` (every export
  carries a tier tag), `check:package`, and the packaging boundary test (`src/tests/unit/packaging-boundary.test.ts`, the
  deep-import lock) pass, and the surface they enumerate is the whole intended public API with
  nothing accidental.
- [ ] **Every export carries its contract in its doc comment**, the packaged skills and the migration notes are current, and the
  extending-developer seams (the thin seams plus the admin design vocabulary) are documented as the versioned
  contract a developer builds on.
- [ ] **The docs claims-verification audit has run** (Geoff, 2026-08-02): an adversarial sweep of the
  whole docs corpus tracing every factual claim a page makes about engine behavior to the code, the
  defect class no mechanical gate catches (the five-channels model, the `handleError` requirement that
  never worked, and the falsified `csrf_rejected` log row all passed every gate). Workflow-shaped:
  extract claims per page, verify each against source, fold what fails. Runs AFTER `beta.1` so its
  inputs exist (stranger issues, the friction log, Topo's docs-effectiveness signal) and BEFORE
  `1.0.0` ships; it is a blocking gate on the final release, not a someday sweep.
- [x] **The admin reads as an idiomatic exemplar**: the admin idiomatic re-expression initiative is done
  (the admin sweep, the starter-template fold, and the docs phase), so the surface a developer copies is
  native, not bespoke, and the developer-facing design vocabulary is a documented, versioned seam.
- [ ] **`create-cairn-site` ships**, so a new consumer starts from a scaffold rather than hand-copying the
  showcase. (Weigh whether this gates 1.0 or rides the first 1.x.) Running as Passes T1 to T3 under the
  admin-setup umbrella. **Pass T1 is complete**: the package, the dry-run action frame, the state
  store, pre-flight, the pack-time template bake, the substitution pass, the wired command, and a CI
  gate that builds the site the CLI actually produces. **Pass T2 is complete**: the GitHub chapter
  (manifest-first own-App creation, one-trip install and authorize, repo create with coverage
  verify, the no-git-binary push, the resume frame with `--start-over`, the dev shim making bare
  `npm run dev` reach the local admin), proven by a recorded live e2e on a personal account and a
  scratch org. **Pass T3 is complete**: the Cloudflare chapter, which deploys the site to the
  admin's own free `workers.dev` hostname, provisions and migrates both D1 databases and the R2
  bucket from an id-less config, moves the GitHub App's key out of local state into a Worker
  secret, and seeds a bootstrap sign-in so the first login is one click with no email. It also
  writes the App's real identity into the scaffold before the push, so the repository is born able
  to publish. **Pass T4a is complete**: the domain half of chapter 2, token-prefill, zone create
  or adopt, the DNS carry-over gate that preserves MX priority, nameserver delegation with
  park-and-resume, and a rollback-safe custom-hostname cutover, proven end to end against a live
  scratch domain. **Pass T4b is complete**: the email chapter and the money framing, sending a
  site's own sign-in mail once the owner opts in. **Pass T4c is complete**: Workers Builds
  connect, a trigger bound to the site's existing Worker, and deploy-config reconciliation,
  closing the silent `PUBLIC_ORIGIN` reconciliation defect through an admin-attributed `base_tree`
  commit, with the first Builds deploy watched to `success` end to end against a live scratch site
  (the account's existing 907-life Builds usage was left untouched throughout). **T4d shipped the
  localhost console and T5 split, leaving one open item: T5a'**, the browser door's public-repo
  half (the public template repo, the Deploy button, C3 `--template` compatibility), which rides
  release one's cut. **Pass D is done** (`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-08-14-pass-d-docs-reset.md`,
  post-mortem appended there); the tool and template still publish in the same cut as release
  one.

  **T5 split at execution** (Geoff, 2026-08-13). **T5a is done**: the sync script that generates the
  template repo wholesale from the bake plus an overlay, its GitHub Actions wiring (a release job,
  a manual dispatch, and a weekly drift cron), a build gate that proves the tree the sync would
  push actually builds, and the deploy guide's three-door framing. **T5a' waits for release one**:
  the public repo, its first sync, the live button spike, the spike-derived overlay content and
  completion checklist, and the C3 `--template` verification. The reason is a finding, not a
  scheduling preference: the bake emits the showcase's current tree while the emitted engine spec
  resolves to the last published version, so a template synced today imports engine symbols the
  registry does not serve. Release one resolves it by definition, and the ordering above already
  put the template repo in that cut.

  **Why the console is its own pass** (Geoff, 2026-08-11): it was bundled with email because the
  email chapter was assumed to have a long wait worth watching, and the research found that
  onboarding a Cloudflare-DNS domain takes minutes. The wait that earns a console is chapter 2's
  nameserver delegation, which can run for hours, so the console attaches to no single chapter and
  bundling it with email was adjacency rather than design. It sits after Builds because it improves
  a flow that already works through terminal parks, where Builds closed a real capability gap
  including the silent `PUBLIC_ORIGIN` reconciliation defect. T4c, now shipped, added two inputs
  to the console's own brief: the build watch as a second long wait worth rendering, and the grown
  fake-server surface its plumbing extraction must now cover (recorded in the T4c spec's own "What
  follows" section, `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-08-12-create-cairn-site-t4c-design.md`). The T4a
  spec carries the T4b and T4c briefs:
  [`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-08-11-create-cairn-site-t4a-design.md`](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-08-11-create-cairn-site-t4a-design.md),
  and the banked research behind the split is
  [`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-11-t4b-email-console-cost-research.md`](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-11-t4b-email-console-cost-research.md).

  **The baseline walk is recorded** at
  [`docs/internal/2026-08-unagented-setup-baseline.md`](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-unagented-setup-baseline.md).
  It measured the path no one had measured, the tutorial's `wrangler`-plus-dashboard setup walked cold,
  since every site so far was provisioned by an agent holding account-wide access (Geoff, 2026-08-05,
  the harvest sitting). Geoff first ruled he would walk it himself, then revised that the same day: a
  persona agent run several times fresh from several vantage points beats one human walk, because
  independent runs buy agreement. Five blind walks ran; their findings are triaged in the friction log,
  and the documentation half is Pass D's work list.
  **`@glw907/cairn-cms-dev` must publish in the same cut as the tool**: a scaffolded site cannot build
  without it, and the bake refuses to run while it sits unpublished at `0.0.0`.
- [ ] **The core-feature roadmap has landed** to the point the author opens the project up: the intro's
  "closely held until the core lands" condition is the same condition as 1.0. Named contents (Geoff,
  2026-08-01): entry history, revert, and public preview for a non-editor, all three ratified as
  landing BEFORE the public beta, and all three implemented (the design sitting's
  `createPreviewRoute(runtime): RequestHandler` reservation is superseded by the shipped
  `loadPreview`, a site-mounted `Load` under R1's grammar; see
  `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-08-06-history-revert-preview-design.md`, "Part 3"), holding
  unpublished for release one. Release intent (Geoff, 2026-08-01): the three bundle into one
  release, the next cut after the ASC-seams window publishes, however many passes they take to
  land.

**Churn stays free until the public beta (Geoff, 2026-07-30).** The design-ratchet pass broke two
public seams outright (the admin-fields `register` default flip, the tightened
`one-filled-action` partition) in service of the better long-term engine design, and that is
correct at this stage, not a lapse against the first checklist item above. `0.x` exists
precisely so a public seam can move when it demonstrably improves the engine; the "no known
breaking change is pending" bullet starts mattering once cairn approaches the beta cut, and the
"public seams have held across an initiative or two" bullet measures the stretch of stability
leading into beta, not the whole history before it. Treat any further pre-beta seam break the
same way: ship it, batch its `Consumers must:` line, and let this note stand as the ruling
rather than re-litigating it pass by pass.

**Clean breaks, no aliases, until the Waymark rebuilds land (Geoff, 2026-09-27).** Every
consumer site (ecxc-ski, 907-life, aksailingclub-org, xcathletes-org, cairn-pub) is to be
rebuilt from the Waymark theme, re-skinned to each site's personality. A site rebuilt from the
template carries no migration burden, so a breaking rename (the `./components` to `./admin`
case) is cheap now: take the clean break with one `Consumers must:` line rather than a
compatibility alias or a compromise that keeps a confusing name or seam. Once the rebuilt sites
are live, each break costs one migration per site again, so re-check this with Geoff when the first
rebuilt site goes live.

**Promote the two public theme rules to error tier (theme identity pass C, 2026-09-29; a roadmap
intent, not a shipped promise).** `theme-conformance` and `theme-contrast` ship at advisory tier on a
consumer, and the changelog makes no promise about their tier. Promote both to error at the first
minor cut after all five sites (the four consumer sites and cairn.pub) report zero advisory
findings from them, counted by the `cairn-releasing` step that runs the audit's public scope over each
site at every cut. `public-literals` stays advisory. A site that reports findings is asked to clear
them first; no calendar date is attached.

When these hold, cut `1.0` deliberately, retire the `0.x` "minor = new subsystem / patch = everything else"
scale heuristic, and switch the numbers to their compatibility meaning (patch = fix, minor = additive,
major = breaking). The scheme and cadence live in `CLAUDE.md` ("Releases") and the
`cairn-release-process-and-versioning` memory.

### The pre-beta pass series, now the one-release path (organized 2026-08-01; rewritten 2026-10-09)

The 2026-08-01 series recommended two releases: release one carrying everything that impacts a
current consumer site, then release two as `1.0.0-beta.1`. Geoff's 2026-10-07 rulings replace that
shape. **One release follows docs stage 5, and it is a `0.x` minor, the old "release one".**
`1.0.0-beta.1` cannot be that cut: beta waits for the new ASC site and ecxc by Geoff's 2026-08-26
ruling ("Toward 1.0"), and no site migrates before the release, so the sites reach the release first
and the beta follows their migrations. Engine passes land on `main` and never release. The path, with
each pass in its slot, is the boundary-test entry in the Now tier. "Release one" elsewhere in this file
means the one release.

What the old series carried, as it stands:

- **Done.** Phase C (the contract and the renames) and phase F (the history and revert views, and
  public preview) landed in the `0.9x` releases. So did the pre-RC block: the ambient-defaults audit
  ran on 2026-08-03 (its report enumerates P8), the auth seam shipped as `createAuthChannel`, and the
  AI-posture pass landed.
- **Phase P, polish and docs: the open items, each named to a destination.** P6 and P7 were absorbed
  by Pass D and need none.
  - **The final engine batch:** P1 mechanical hardening (ci-parity, the `commitFiles` test, the
    surface machine artifact, the error-message sweep, and a small showcase route exercising
    `createAdminAction` and its converged refusal paths end to end); **P8 the ambient-defaults
    remediation**, the phase-P bucket of the 2026-08-03 audit, enumerated in
    [its report](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-03-ambient-defaults-audit.md) rather than restated here,
    thirteen additive items ordered by consequence in the report (its effective-state checks still
    overlap the credential story the tool's chapter 1 absorbed, so weigh it alongside the admin arm's
    rebuild at stage 3); **P9 the `Consumers must:` machine-readable contract** (Geoff, 2026-08-13),
    which makes the changelog convention a parseable shape so the `cairn` tool's cross-site upgrade verb
    can read it. It is scoped forward-only with no backfill of the historical entries, which is why it
    has to land before the release rather than after; and the admin design items P2 the zero-state
    pass, P3 the admin at the viewport extremes, and P4 the sign-in touchpoints with the
    keyboard-and-screen-reader walkthrough (the release is now the forcing function the public beta
    was). The editors arm's screenshots show the zero states and the sign-in screens, so stage 4's
    close pulls forward whichever of these changes what they show.
  - **After the release:** P5, the `CairnMediaLibrary` split. It changes no page, and it needs its own
    designed pass against the `admin-visual` baseline and the e2e media suite.
- **After the release and the site migrations:** the widened go-public pass, the dress rehearsal, and
  `1.0.0-beta.1` itself, under the beta gate below.

### The beta gate — DECIDED (Geoff, 2026-07-02; step 10 is now mechanics)

All four rulings, ratified in advance: **(1) Versioning** — compatibility-meaning SemVer from
beta day; the pre-beta cut is the last `0.x`; beta ships `1.0.0-beta.1` under an npm `beta`
dist-tag, iterating `-beta.N` with `Consumers must:` on breaking bumps; `1.0.0` when the
checklist holds; the `0.x` scale heuristic retires at beta. **(2) Posture** — public at beta:
repo public, issues on with minimal triage, docs live on cairn.pub; the go-public pass is the
gate. **(3) Support** — latest beta only; fixes land in the next `-beta.N`, no backports;
SECURITY.md's wording updates to match at its go-public trim. **(4) Naming** — the package goes
UNSCOPED `cairn-cms` at beta day (reserve the free npm name with a placeholder publish before
then — an interactive act for Geoff, npm auth is passkey-bound); the repo stays
`glw907/cairn-cms` (GitHub redirects keep a future org move cheap; the npm name does not have
that luxury, hence deciding it now).

The original decision framing, for the record:

- [x] **Define the beta release as an event, and adopt the long-term numbering scheme at it**
  (Geoff, 2026-07-02: from beta on, version numbers carry durable, useful meaning). Standing
  recommendation: strict SemVer with compatibility meaning from beta day — beta ships as
  `1.0.0-beta.1` and iterates as `-beta.N` under an npm `beta` dist-tag (`latest` stays on `0.x`
  until `1.0.0`), a pre-release bump that breaks a consumer carries its `Consumers must:` line, and
  `1.0.0` lands when this checklist holds. The test the scheme must pass: a consumer reads the
  number correctly with zero cairn-specific documentation, which only compatibility-meaning SemVer
  does (the `0.x` scale heuristic was scaffolding; CalVer says when, never whether it breaks you).
  Adopting at beta rather than `1.0` is deliberate: beta users are exactly who needs the number to
  mean something. Also in this decision: what the accumulated `## Unreleased` window rolls into the
  beta cut, whether beta flips the "closely held until the core lands" posture, and the support
  promise to beta users (SECURITY.md's latest-minor line becomes real once strangers depend on it).
- [x] **Close the naming window deliberately.** The package (`@glw907/cairn-cms` vs an unscoped name)
  and the repo home (personal account vs a `cairn` org) are cheapest to change before any external
  user pins them and maximally painful after. Staying with the current names is fine, but as a
  decision, not a default; check name availability first.

## Now

- **Stage 2b part 2: the items part 1 carried (PR #117 triage, Geoff, 2026-10-12).** Part 1's
  "Found, not done" table (the PR #117 triage) filed these as defers; Geoff submitted the triage unchanged. What stays names its trigger:
  - One whole-tree gate run failed the reference coverage gate on `admin-toolkit.md` (28 stale exports) and
    passed on rerun; unexplained and not reproduced. Trigger: a second occurrence.

- **Docs content carried from the 2b close (docs finalization pass 1, 2026-10-31).** The friction log's
  docs-content and repo-tooling entries were verified against the pages and code; 17 were fixed on
  their pages, 5 found overtaken, and 10 became the rows below, which also carry the five tooling entries that stay, each with its trigger:
  - Unify the tutorial and scaffold layout and name "the adapter". The add-cairn tutorial builds
    `src/lib/` where the scaffold uses `src/theme/`, and uses "adapter" for both the engine's adapter
    and SvelteKit's. A Names row, and the `CairnAdapter` doc comments that name only
    `src/lib/cairn.config.ts` (`src/lib/content/types.ts:5,223`, an engine comment change). Trigger:
    the final engine batch.
  - Re-capture the create-cairn-site transcripts live: `01c-resume.txt`, `01d-resume.txt`, and
    `01-create-cairn-site.txt:9` still show the two-database provisioning lines. Trigger: the capture
    sitting of the docs finalization series.
  - A plan-pinned gate string bypasses the classifier and can omit `check`
    (`scripts/checks/gate-tier.mjs:56`). Trigger: the next gate-tier pass.
  - A caught red's record names no failing step; add a `failing step` field to the PR score.
    Trigger: the next replay of the gate.
  - The classifier selects no unit test for a deletion under `examples/showcase/`
    (`gate-tier.mjs:173-177,680`); add a bucket for the exclude paths in
    `examples/showcase/.cairn-template.json`. Trigger: the next gate-tier pass.

- **Docs tooling before stage 2b: the residue (pre-2b tooling pass, 2026-10-12).** The pass fixed
  the register, `check:snippets`, `check:symbols`, and `link:consumer`, and fixed the showcase tell in the dotfiles repo. What stays, each with its trigger:
  - The second-sign-in-group rename in `src/lib/auth-channel/factory.ts:1` and `:537`,
    `src/lib/auth-crypto/index.ts:2`, and `examples/showcase/src/members/channel.ts:53`: the next engine pass, since those comments sit on the `auth-data` path map.
  - A per-unit type environment in `check:snippets`, for a reader on a create-cairn-site scaffold,
    which names `node`: all units share one program, so a vite-importing block exposes Node's
    globals to every unit.
  - Resolving `@glw907/cairn-cms-dev` import identifiers in `check:symbols`, which has no surface
    snapshot for the dev package.
  - `tellgrader` in CI (vendoring the binary), and the unreproduced `cairn-run-gate` "gate vanished".

- **Tell outside developers how the docs stay true (Geoff, 2026-09-30).** Split by reader. A
  contributor needs the mechanics: the option doc comments, `check:options`, and what a change must update to pass the docs gate. An evaluator or site developer needs only the promise: every public option is documented or
  excluded with a reason, CI fails otherwise, and the docs match the installed engine version.
  That claim belongs in `docs/why-cairn.md`, written from the shipped mechanism, never an extend
  page, since no extend job needs it. Trigger: stage 5's outline of the front door.

- **Theme identity pass A's carried items (pass A close, 2026-09-28; settled by the S3
  correction round, 2026-09-28, except the two below).** Trigger for what remains: the first pass
  after this one that edits `cairn-admin.css` or the named component (retargeted past the
  `0.98.0` cut at pass C's close, because the items are cosmetic and the scoping fix moves the
  pinned Waymark render).
  - Coverage notes the `paint` class batched rather than blocked on (ruling at pass C
    close: cosmetic, so they ride past the `0.98.0` cut): the destructive-edge contrast
    test proves the ratio but not that `border-error` wins the cascade over the 55% field edge;
    the disabled-stock switch test covers the `:checked` form only; `::before` carries no
    `transition: none`; the bare `.alert` oracle does not prove `--alert-color` unset;
    `alert-ink-contrast.test.ts` copies its tone and ink values by hand; no component test
    covers `alert-outline` or `alert-dash` on a colored variant; `screen-anatomy.test.ts`'s
    fixture still reads `type-title font-bold` where the page heading is now 550.
  - The showcase's public `theme.css` carries an unscoped `.btn-outline` rule that reaches the
    admin's outline-button edges too, whichever order the sheets load in. Scope it to the public
    site when a theme next touches the button recipe.

- **Draft documentation on a conventional approach (Geoff, 2026-09-25; spec
  https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-09-26-draft-docs-approach-design.md).** Inputs it inherits, each to keep or drop on its own merits:
  - The exemplar corpus (68 captures at `~/.local/share/cairn/exemplars/`, manifest
    https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/docs-exemplars.md), never reviewed as a set.
  - One content input for the designer's theme guide (Geoff, 2026-09-24): a short general section
    on giving a DaisyUI-built site its own identity through a theme, so it does not read as stock
    DaisyUI. It links to DaisyUI's theme docs rather than restating them. Required topic in the stage 2
    outline.

- **Geoff's open hand steps from the scaffolder spikes (none urgent, all his to do).** Delete the
  three scratch GitHub Apps (`cairn-t4b-live-03cd31`, `cairn-t5-scratch` id `4585219`,
  `cairn-cairn-capture-scratch`); revoke the T4c spike API token and the three Cloudflare API
  tokens named for `create-cairn-site`; confirm the Workers Paid opt-in from T5 run 2; fix
  907-life's broken push-to-deploy. The full list with dates sits in https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/HISTORY.md (the
  2026-08-17 teardown entry). Trigger: Geoff's next credential-hygiene sitting. Remove this entry
  when the list is empty.

- **TypeScript 7 is held on the toolchain, not the code; the hold ends when `svelte-check --tsgo`
  goes green (2026-08-21).** TypeScript 7.0 (stable 2026-07-08) shipped without a programmatic
  compiler API, and 7.1 (October 2026) is the first release that adds one. Three dependencies call
  that API and so pin `typescript` to 6: `svelte-check` 4.7.6 (its `--tsgo` mode mis-types `.ts`
  imports of `.svelte`, scans template trees, and fights `outDir`/`rootDir`), `svelte2tsx` 0.7.61
  under `@sveltejs/package` (it builds the shipped `.d.ts`), and `typescript-estree` 8.56 under
  `eslint-plugin-tsdoc` (peer `<6.1.0`; it gates `check:comments` only). The gain is speed alone, roughly 3 to 4x
  on a 38-second `check`. Geoff's ruling: resolve the 7.x edges before beta, or stay on 6 a long
  time. The crossing is a bump: install `typescript@~6` beside
  `@typescript/native@npm:typescript@7` (the layout `svelte-check` documents), run
  `svelte-check --tsgo`, and when it matches the TS 6 result drop the alias, bump, and run the
  full `test.yml` gate list plus the clean-install showcase proof. Manual check meanwhile:
  `npx -y @typescript/native-preview -p tsconfig.json --noEmit | grep -c 'error TS'`, where any
  count past the `.svelte` errors is a new finding. **The advisory `check-tsgo` job lives in its
  own `.github/workflows/tsgo.yml`, run weekly (`schedule`, Monday 16:00 UTC) plus
  `workflow_dispatch` rather than on every push: it installs the side-by-side layout with
  `--no-save --no-package-lock` and runs `svelte-check --tsgo`, and a green run is the signal that
  the crossing above is ready.**

- **A pre-existing media-chip test is flaky and will redden `main` at random (release-debt pass,
  2026-08-19).** `src/tests/component/media-public-base.test.ts:86`, "renders the editor media chip
  thumbnail under the injected base", polls for a CodeMirror decoration (`.cm-cairn-media-thumb`) to
  mount and asserts exactly one. It failed once across five full-suite runs during this pass,
  exhausting both retries at 6.9s (`expected +0 to be 1`, "Matcher did not succeed in time"), then
  passed 3/3 when the file was run in isolation. The assertion is verbatim at `5a6a4901`, so this
  pass did not cause it; the suite simply ran it under enough load to lose the race. Its sibling at
  `:115` ("keeps the editor media chip thumbnail under /media") has the identical shape and the same
  exposure. This is a different mechanism from the already-filed story-suite image race below: that
  one is a 404 swapping an `img` out, this one is a CodeMirror decoration not having mounted yet.
  A poll with no upper bound on decoration mount is the wrong shape for a gate; wait on a signal
  CodeMirror actually emits, or raise the timeout deliberately and say why. **Trigger: fired once
  already. The next unexplained red `main` on a media test is this.**

- **Two reproduction-authoring rules have no home yet.** Both surfaced at the containment pass's
  accessibility review and both bind the editors rewrite rather than the engine. Numbered marker chips
  must render *inside* `[data-cairn-picture]`, because a chip appended as a sibling of the inert wrapper
  becomes the only accessibility-tree content in the frame and a screen reader hears "1 2 3" with no
  context; inside, the chips are silent and the page's keyed prose list carries them. And a 150-character
  accessible name is thin for the three locate-many-controls screens, so a reproduction whose surrounding
  prose does not already describe the screen needs a longer description than its name (WCAG 1.1.1,
  techniques G73/G74). **Trigger: the editors rewrite, which authors the alt and caption text.**

- **A numbered callout is only proven to fit at ONE width.** The new crop gate
  (`src/tests/component/reproductions-marker-crop.test.ts`) mounts a markered story at the width its
  embed renders at and fails when a chip falls outside the declared height, which is what caught
  `tags/screen` cutting two of its five callouts. For a responsive `column` story that width is the
  docs measure, 704px, hardcoded in the test from cairn-pub's `--container-measure`. A phone renders
  the same embed at roughly 320, where the same content reflows taller against the same fixed
  declared height, so a chip that clears the crop on a desk can fall out of it on a phone and no gate
  sees it. Two ways out, and the choice is a framing decision rather than a bug fix: declare a height
  per width the way `publish/header-band` already declares two, or let a callout-carrying story pin a
  width so it stops being responsive at all. **Trigger: the editors rewrite, which is the first pass
  to publish a callout-carrying reproduction.**

- **`cairn-audit`'s rendered focus-indicator rule passes vacuously on a page with no tab stops.**
  `src/lib/audit/rules/rendered/focus-renders.ts:181` returns `[]` when the tab order is empty, which is
  indistinguishable from "checked everything and found nothing". Containment makes this reachable for the
  first time: point the audit at a `/repro` route and every tab stop is gone, so the rule reports green
  having checked nothing. The repo's own preference is a gate that fails over a note that waits, so the
  fix is to report "no tab stops to check" as its own outcome rather than folding it into no-findings.
  Found at the containment pass's review gate. **Trigger: the next pass that touches `cairn-audit`.**

- **The story suite proves the media reproductions against images it never serves.** Nothing maps
  `/repro-assets/*` in the browser test project, so every fixture image 404s during the engine's own
  story-mount run and `CairnMediaLibrary`'s `onerror` swaps the tile for its "Image missing" block,
  which renders no `img` at all. The media-base assertions read `img[src]` at first paint to beat that
  swap, which is a deliberate race and the flaky-gate shape: on a slower runner, or on the second
  story to request an already-404-cached URL, the read loses and three stories fail for a reason that
  has nothing to do with them. Worse, nothing anywhere proves a fixture image decodes, so a cairn-pub
  asset-route regression would ship "Image missing" chips into published docs past a green gate. Fix:
  serve `src/lib/reproductions/fixtures/` at `/repro-assets/` from the browser project (the filenames
  are already enumerated in `manifest.ts`), then assert `complete && naturalWidth > 0` rather than
  the composed string. Found by the seam pass's Svelte review.

- **The published docs have no visual layer at all, and half of that was never decided
  (Geoff, 2026-08-15, reading the editors track).**

  **This is a rewrite of the affected pages, not a layer added on top of them (Geoff, 2026-08-15).**
  Prose written to stand alone without a picture is substantially different prose, and it does not
  survive the picture arriving. The clearest case was the old editor-screen page, whose
  screen-description sections were a screenshot rendered in words; with a reproduction, what
  remains is a caption plus the handful of facts an image cannot carry (that Write is the default
  tab, that the preview width choice is remembered per device). The harvest deleted the old pages
  (2026-09-30), so this now lands as a drafting input: stage 4 outlines the editors arm with its
  reproductions from the start, and the extend stages do the same for their visual half. **Expect
  the editors word count to fall rather than grow.**

  What remains owed here is the editors arm's rebuild (stage 4), which renders in
  cairn-pub against the built seam.

- **The template repo's pre-release notice comes off when `create-cairn-site` publishes.**
  `packages/create-cairn-site/template-repo/README.md` still opens "generated, pre-release" and
  defers the Deploy button and completion checklist to a live button verification. `0.95.0` was
  written to retire it (the obligation rides that release's own changelog entry), and the release
  deliberately did not: the tool is held on the defects below, and the live button spike that
  supplies the replacement content is unrun, so dropping the notice would promise a button that
  does not exist. A `WATCH` comment sits on the notice itself. Retire both in the change that
  publishes the tool.

- **Four first-run defects in `create-cairn-site`, found by the 2026-08-17 capture run, all
  owed before release one publishes the tool.** The run took four invocations to reach a live
  site where the plan expected one, and only a live run could have surfaced the first two. The
  fourth surfaced later, at the pass's own register gate, reading the committed fixture against
  the tool's behavior. The evidence throughout is the committed fixtures under
  `packages/create-cairn-site/test/fixtures/transcripts/`.

  3. **Every scaffold ships the placeholder sign-in from-address `cms@showcase.test`.** The
     domain chapter never personalizes it on the workers.dev path (`writeEmailFrom` in
     `packages/create-cairn-site/src/cloudflare/config.mjs` runs only once a domain is connected).
     The retired npm doctor's credentialed run reported three red zone-derived failures on a site
     working exactly as built (the evidence transcript left with it). Its live successor is
     `cairn health`'s `email` check (`tool/internal/health/check_email.go`), which reads the
     adoption record's domain rather than the adapter's from-address; whether it reproduces the
     false reds on a workers.dev site is unverified. The scaffolder defect stands either way.
     Candidate: derive the from-address, or have `cairn health` report the email check as
     not-applicable until a domain is connected.
  4. **The scaffold hand-over still says the GitHub and Cloudflare steps have not shipped.**
     `packages/create-cairn-site/src/scaffold.mjs:250` prints "Those steps arrive with the next
     release", and the same run then walks the reader straight through both of them. The string
     predates the chapters and nothing caught it, because no gate reads the tool's own prose
     against the tool's own behavior. Evidence: `01-create-cairn-site.txt`. Candidate: rewrite the
     hand-over to name what comes next in this run. Two more instances of the same root surfaced
     in the 2026-08-18 backfill mining: `bin.mjs:258` calls `printLiveInfo` unconditionally on any
     chapter-2 park, so "Connect your own domain any time by re-running..." prints directly after
     the park message that just said the connection is in progress, and `chapter3.mjs:975` titles
     a step "Get a fresh Cloudflare API token" before `collectBuildsToken` has had the chance to
     revalidate a saved one, with no prompt and no browser trip. Both belong to this entry's root
     rather than as unrelated copy bugs.

- **The DMARC instruction in `own-your-domain.md` was a faithful mirror of a bug in the CLI's own
  closing copy, filed off Pass D's Task 13 production gate (2026-08-14).**
  `packages/create-cairn-site/src/cloudflare/chapter2.mjs:801-804` prints "add it to that
  [DMARC] record too" to the admin's terminal at the end of a real run, and
  `packages/create-cairn-site/README.md:253-255` repeats it; both are wrong the same way the
  docs page was (Cloudflare's `_dmarc` TXT record is `v=DMARC1; p=reject;`, a policy with no
  sender field to add anything to — the real mechanism is SPF/DKIM, which neither string names).
  The docs half was fixed on the old admin page the harvest has since deleted; the CLI's terminal
  output (`chapter2.mjs:806-809` today) and its own README still print the unexecutable
  instruction. `chapter2.test.mjs:1830-1857`'s assertions
  (`/_dmarc\./`, `/reject/i`, `/newsletter/`) do not block a corrected string. Full evidence:
  https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-14-pass-d-task-13-production-gate.md, claims-sweep rank 4 under
  `docs/admin`.

- **The media allow-list permits AVIF; no editor upload path can ever produce one, filed off Pass
  D's Task 13 production gate (2026-08-14).** `DEFAULT_ALLOWED_TYPES`
  (`src/lib/media/config.ts:37`) includes `image/avif`, and the server-side sniffer and its
  content-route check (`content-routes-media.ts:520`) both honor it, but every editor upload runs
  through `ingestFile` (`src/lib/admin/client-ingest.ts`) first, which accepts only JPEG,
  PNG, WebP, GIF, and HEIC-via-re-encode; an AVIF sniffs correctly and then falls through to
  `throw new IngestError('decode-unsupported')`. An editor who drops an AVIF gets a failure card
  with no explanation the allow-list would predict. AVIF is reachable only through developer-side
  paths (the seeding assembler, delivery of already-stored objects), never through the editor UI.
  The old editors media-library page, since deleted, correctly omitted AVIF from what the editor
  can upload (confirmed by the gate's own verifier, which refuted a proposed docs fix that would
  have added it); the fix belongs in the engine, either an AVIF passthrough branch in `ingestFile` (AVIF is
  web-native and `createImageBitmap` decodes it in current browsers) or a documented note in the
  extend track that the server allow-list exceeds what the editor UI can submit. Full evidence:
  https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-14-pass-d-task-13-production-gate.md, "The refutations" section
  (claims:editors rank 9).

- **Vertical alignment's declared follow-up, filed off the cairn-wide pass (2026-08-07).** A
  cairn-wide inventory measured both the admin and the public surface for vertical-alignment
  defects and closed the two entries this replaces: the optical-centring engine default Geoff asked
  for on 2026-07-30, and the both-axes field-row defect found by ASC's `rc.2` verification. The measured defect surface came in far smaller than either closed entry
  assumed; two things carry forward rather than a broader repair:
  - **The sub-bar `ConceptList` family:** fifteen rows reading exactly 1.55px, the same shape as the
    three confirmed defects but under the pass's 2px reporting bar. A firing threshold anywhere in
    that window either adopts all fifteen in one step or leaves a visible family untouched, so this
    is a decision to take deliberately, not a number to pick when a future rule graduates.
  - **A precomputed icon-ink table, filed as the pre-beta pass's first target.** An icon's ink offset
    inside its own viewBox is a property of the icon FILE, computable offline from path data with no
    rendering, so a static rule built on it reaches ASC's `/join` icon-card defect class the same way
    the dropped rendered `cairn-audit` rule would have, with no browser. ASC already fixed its own
    instance by hand, so this closes future recurrence rather than a live defect.
  - **Two more `/admin-toolkit` components carry layout in Tailwind classes with no scoped
    `<style>`, so they silently collapse outside `[data-theme='cairn-admin']`,** exactly as
    `FieldRow` did before this pass fixed it. The compiled admin sheet scopes every rule under the
    theme root, and a cairn-only `@utility` (`gap-label`, `gap-control`, the `type-*` roles) is not
    even defined in a consumer's own Tailwind build, so an extending developer composing these in
    a custom route outside the shell gets `display: block` and no gap. The two:
    `FieldLabel`'s stacked register (`flex flex-col gap-label`, on the `$derived` class string at
    line 52) and `EmptyState.svelte:57`. This is a live defect on
    shipped consumer surface, not a documented gap. The convention to follow is a bespoke
    `toolkit-*` class in a scoped `<style>` carrying the measured literal as a `var()` fallback,
    and `ListToolbar.svelte:510` (`.toolkit-toolbar-band`) is the only real precedent in the
    toolkit.
  Full measurement: https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-07-vertical-alignment-harvest-findings.md.

- **The showcase visual suite cannot see a vertical-alignment regression, and its admin corpus is
  missing the screen most of them landed on (measured 2026-08-07, off the same pass).** Two
  independent gaps. Either one alone would have hidden every fix this pass made from every baseline,
  and together they explain why CI's regeneration changed zero admin baselines while the fixes were
  real.

  **The tolerance floor.** `examples/showcase/playwright.config.ts` sets
  `expect.toHaveScreenshot.maxDiffPixels: 120` for the whole suite. Replicating the `admin edit
  page — 1440` test exactly, the shipped render against itself differs by 0 pixels, so the render is
  deterministic, and the fixed render against the pre-fix one differs by 51 pixels, all inside
  x 1027-1038 by y 245-254, which is the check glyph and nothing else. The comparison passes and the
  baseline is never rewritten. 120 is roughly 2.4x the entire pixel footprint of a 1.5px shift on a
  16px icon, so this defect class sits wholly under the floor, and a passing visual suite is not
  evidence that alignment is intact. Changing the number was deliberately left out of the closing
  pass: it touches every existing baseline and every unrelated test, and 120 is presumably where it
  is because a much lower allowance goes flaky on font antialiasing. Options worth costing, rather
  than a number to pick: a per-test tolerance for the captures that watch a small control, a mask no
  wider than the control being watched, or leaving the tolerance alone and treating the real-layout
  component tests as the net for this class. Today that net is
  `src/tests/component/vertical-alignment-recipes.test.ts`, which renders the real components and
  reads geometry directly, so it has the resolution the screenshot lacks. The general form of the
  finding, which outlives this pass: a pixel-tolerance gate has a defect-size floor, and any defect
  class smaller than that floor needs a measuring gate rather than a screenshot.

  **The corpus gap.** `examples/showcase/e2e/admin-visual.spec.ts` holds 18 tests over 7 routes:
  `/admin/posts`, `/admin/vocabulary`, `/admin/login`, `/admin/auth/confirm`, `/admin/editors`,
  `/admin/posts/2026-06-hello`, and `/admin/media`. `/admin/settings` is absent, and that is where
  `CairnTidySettings` renders, so four of this pass's five fixed rows are captured nowhere in the
  admin corpus and could not have moved a baseline at any tolerance. Adding the captures needs a CI
  regeneration and a human read of the new baselines, which is why they did not ride the closing
  pass. The asymmetry is the part worth carrying: the same pass widened the public site suite to the
  five-viewport bar as its own task, while the admin suite's own route coverage went unexamined, and
  nobody asked which admin screens the corpus actually contains.

  **A second, independent instance of the same corpus gap (`extender`, 2026-08-27, promoted from
  the friction log at the 4b close).** The admin visual specs passed unchanged through the
  StatusChip regrammar (dot removed, register renamed, grounds retuned) because no captured
  screen renders a chip within the 120px diff budget (`playwright.config`'s
  `maxDiffPixels: 120`). That pass's visual verification had to be a hand-built probe read by the
  session. Candidate fix, riding the same regeneration-and-human-read work the corpus gap above
  already owes: a chip-bearing admin screen (a list with status rows, or a dedicated probe route)
  joins `admin-visual.spec.ts` in both themes.

- **Exercise a server-only subpath under real Wrangler in cairn's own CI.** The `0.94.0-rc.1`
  Workers blocker (a `browser` condition with no `worker` ahead of it, so the server bundle got the
  client stub and the Worker never started) shipped past every gate this repo runs, and the two
  gates added with its fix are both Node `--conditions` proxies for Wrangler's esbuild. If Wrangler
  changes its condition set, both stay green while every consumer breaks the same way. Nothing in
  `examples/showcase/src` imports `/auth-crypto` or `/cloudflare`. The showcase e2e now starts a
  real workerd through `wrangler dev`, but it exercises the showcase's own bindings, not these
  subpaths, so closing this needs a server-only subpath exercised under that host, not one more
  import. The cheapest shape is a small fixture Worker that imports one subpath, built and
  started with `wrangler dev --local`, asserting it answers rather than refusing the connection.
  Filed 2026-08-06 from the fix's own review; the defect filing is
  [`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/feedback/2026-08-05-rc1-worker-condition-defect.md`](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/feedback/2026-08-05-rc1-worker-condition-defect.md).

- **The ambient-defaults audit: RUN 2026-08-03.** Report:
  [`docs/internal/2026-08-03-ambient-defaults-audit.md`](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-03-ambient-defaults-audit.md).

  **The audit's answer to the AI-posture pass's question: the ambient defaults do NOT share one
  shape.** They split into behavior the engine emits (headers, cache directives, cookie attributes)
  and behavior the engine can only observe (Cloudflare's managed robots layer, zone TLS settings, DNS
  mail authentication). A posture config belongs to the first group and should not try to absorb the
  second. The second wants a check, which is the same conclusion the setup work reaches independently.

  **What owning the whole chain unlocks (Geoff, 2026-08-03), now with evidence behind it.** cairn is
  Cloudflare-specific, and the comparables survey makes that a capability rather than a limitation:
  nothing among 22 tools fetches its own live deployed site and reports what it is actually serving,
  with WordPress Site Health the cautionary case, since two of its three checks read configuration
  back to itself while looking like live probes. `cairn health`'s `https-forced` check
  (`tool/internal/health/check_https.go`) still sits on the same side of that line: it reads the
  zone's settings back rather than observing the redirect and the header. The audit established the cost is low: every finding that
  needed measuring rather than reading was reachable with `curl` and `dig` and **no credential at
  all**, including HSTS presence, the http-to-https redirect, the TLS floor, the served robots.txt,
  the trailing-slash status, and the full DKIM and return-path SPF picture. Directions, still
  direction rather than commitment:

  - **Effective-state checks, credential-optional.** Run everything reachable without a
    token, and do more when one is present, so a developer is never blocked waiting on access. The
    Cloudflare checks belong to `cairn health` (`tool/internal/health/`), whose `email` DNS half
    and `serving` check already run credential-free; `cairn doctor` (`tool/internal/doctor/`)
    holds the credential-free local half, where `ai.posture-effective` already observes the served
    `/robots.txt`. This
    replaces config readback with behavior probing and is strictly more truthful, since a Cloudflare
    toggle reading one way while the edge behaves another is documented in the comparables research.
  - **Publish-chain verification end to end.** Confirm the published entry is genuinely live at its
    permalink rather than assuming the chain worked. No surveyed CMS controls enough of the path to try.

- **Help screen first-steps card overlap (pre-existing, found 2026-07-21).** The getting-started
  steps card on `/admin/help` renders its three step columns overlapping at desktop widths (the
  step text collides with the checkbox rail and the step CTAs). Reproduced identically on the
  pre-toolkit engine, so it predates the admin-toolkit pass; the section is hand-written scoped
  CSS in `HelpHome.svelte`, untouched by the sweep. Needs a design-bearing fix against the
  intended card layout, plus a visual-suite baseline for `/admin/help` so the screen stops being
  the one admin surface with no render coverage.

- **Docs-effectiveness infrastructure from the Superforms study (2026-07-03), Topo-era:**
  Pagefind-class Ctrl+K search on the docs site (the single biggest perceived-quality lever
  at zero infra), a FAQ/help top-nav page, a task-tagged examples gallery, an /llms
  machine-consumption page, and the CHANGELOG's Consumers-must lines compiled into a durable
  upgrade page. Timed to Topo carrying the docs; the drafting-level practices are already in
  the craft references.

- **Shortcut-table drift gate (from the 2026-07-03 docs benchmark).** The editor guide's
  keyboard tables and the in-product sheet (`editor-shortcuts.ts`) share content that nothing
  machine-checks; a small `check:*`-idiom script diffing the doc tables against the keymap
  source closes the classic docs-drift hole before it opens.

- **The engine's own record of who commits contradicts a live commit (docs friction log,
  backfill mining, 2026-08-18; docs half overtaken by the harvest, 2026-09-30).** The Git Data API
  falls back to the author when `committer` is omitted, so both fields read the editor, which two
  independent live runs recorded (T3's `/admin` save, and every tool-made commit in T5's Task 8
  e2e). The docs half is overtaken: the two extend pages that said `cairn-cms[bot]` commits are
  deleted, and the rebuild drafts the true claim. The engine half stays open.
  `src/lib/github/repo.ts:261` ("GitHub attributes the commit to the App") and
  `src/lib/github/types.ts:20` ("The committer is left to the App") tell the next contributor the
  opposite, and `CLAUDE.md` states "committer = `cairn-cms[bot]`" as design. Whether
  `cairn-cms[bot]` should actually be the committer needs an engine ruling before the code or
  either comment changes. **Trigger:** the next pass touching `src/lib/github/`, or a site asking
  why its history shows no bot committer.

- **Two sites whose names slug alike silently adopt each other's Worker, databases, and bucket
  (docs friction log, backfill mining, 2026-08-18).**
  `packages/create-cairn-site/src/cloudflare/config.mjs:55` derives the worker name as a pure
  function of the typed display name, with no site id and no account lookup, and `deploy.mjs` then
  runs `wrangler deploy` and `d1 migrations apply` against id-less by-name bindings with no
  existence or ownership probe. The consent copy does print the derived names, and frames reuse as
  reassurance ("deploying again later updates it") rather than warning that an existing resource
  belonging to a different site will be taken over. T3's review named this and proposed three
  fixes; none landed. Account-safety, and it outlives the Node CLI.

## Next

- **Rename component to block across the engine, in the final engine batch (Geoff, 2026-10-31).**
  Geoff ruled "block" the one name for the `:::` content unit in every track, because "component" is
  off-putting and too generic for editors, and most surveyed systems (WordPress, Notion, Payload,
  Sanity) say block. The docs say block now, and the engine still says component, so the batch makes
  the code match. Public API: `defineComponent` to `defineBlock`;
  `ComponentDef`, `ComponentRegistry`, and `ComponentContext` to `BlockDef`, `BlockRegistry`, and
  `BlockContext`; `defineRegistry({ components })` to `({ blocks })`; `rendering.components` to
  `rendering.blocks`; `onComponentAtCaret` to `onBlockAtCaret`; the scaffold's
  `src/theme/markdown-components.ts` to `markdown-blocks.ts`. UI strings: "Insert a component",
  "Search components", "Back to components", "Edit the component at the cursor", "Layout marker." and
  the help dialog's "layout blocks" say block, and "Fold this section" becomes "Fold this block".
  "Place the cursor in a component to edit it" needs rewording, since it misdescribes a caret inside
  a figure or an unregistered block. Docs: `write-a-markdown-component.md` becomes
  `write-a-markdown-block.md`, and the reference, `add-an-island.md`, the register, the Vale rules,
  the skills, and the story `editor/collapsed-layout-block` follow; "component" in the Svelte sense
  stays. This breaks the public contract with no content migration, because stored entries and the
  directive grammar do not change. The CHANGELOG entry carries a `Consumers must:` list, and
  `migration-notes.md` and `upgrade-cairn.md` record it. Until then the editor page paraphrases the
  tooltips, and the rename pass quotes the real strings, including "Fold this block". The editor
  page keeps an `<a id="add-components-and-fragments">` anchor for `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/core.md:129`; the
  rename repoints that link to `#add-blocks-and-fragments` and drops the anchor.

- **Gate economy follow-ups (Geoff, 2026-10-08; audit and adversarial review of the per-task gate).**
  Three items deferred from the change that made the per-task gate the diff's blast radius. (a)
  Per-task test selection via `vitest --changed <base>`. Selection for the node projects stays open.

  Four more, filed from the gate economy pass (2026-10-10), none a defect of the new gate. (e) The CI build-once rewire: CI keeps its
  per-step checks while `check:close` is the local build-once runner; rewiring CI to build once
  saves about 2 minutes a cycle, but its check list differs from `check:close`'s and it would lose
  the per-step timing. (f) A docs task that touches a package README
  under an engine-bucket prefix (`packages/cairn-cms-dev/README.md`) runs the whole component
  project, since `**/*.md` does not override the package prefix and no `src/` path exists for the
  related selection, so the classifier fails closed; a bucket entry for package READMEs would make
  such a docs task cheap. (g) The emitted gate builds `dist`
  twice, once in leg 1 (`npm run package`) and again inside `check:close`, which has no flag to
  skip its build. (h) `.github/actions/` (bounded-install, install-diagnostics) is CI machinery
  that is not on the table's protected list, so a change there does not wait for CI green. A pass
  B candidate. Three older tooling items stay filed from the pass's original row, none taken by it.
  (j) `cairn-run-gate`'s light lane caps the scope at 3G, so `npm
  run check` dies out of memory at about 1 GB (1,174 MB seen on Task 2) unless
  `NODE_OPTIONS=--max-old-space-size=6144` is set; a lane-level default or a larger cap fixes it, and a
  plan that fixes a light gate string must still name `npm run check` (the Task 4a CI red). (l) `gate-tier.mjs --pin` returns `TIER_GATES[pin]` before `--class auth-data` applies
  (`scripts/checks/gate-tier.mjs:535-540`), so a pinned `auth-data` task silently drops the three auth e2e
  specs. The workaround is documented in `pass-core` (pin `full`, or append the three auth specs).

- **Repo tooling and docs-gate friction from the friction log (triaged at the gate economy pass's close,
  2026-10-10).** Seventeen entries moved whole, each re-checked against the tree at `4ef0fdbb`; a pass
  that touches the named file clears the entry. Every entry is a `contributor` finding unless marked.
  - The `ci-e2e` flake. Three pending-dictionary-word specs retry on CI: pass A's merged head
    (`b5953af8`, run 37991578654) failed `edit-save-failure.spec.ts:207` three times, and this pass's
    CI reads showed `edit-save-failure.spec.ts` (twice), `publish-pending-word.spec.ts`, and
    `spellcheck.spec.ts` retrying on `b835fe30`, plus `EditorToolbar` tab sizing in the component
    project. The likely seat is the wait on the spellcheck underline before the save, which CI's
    slower runner can outpace. The retry notices from `ci-green` now surface each case. Trigger: a
    retried test appears on three consecutive CI reads.
  - No gate checks a `docs/internal/...` path cited in a comment under `src/lib`; the design-arc log
    moved to `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/` and nothing flagged the stale citations in `EditorToolbar.svelte`
    and `EditPage.svelte`. A check that every cited path exists would catch the next move.
  - The sample outputs in `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/cairn-audit.md` (the `norms card` output near line 598 and
    the border-contrast exemption sample) are hand-copied from `src/lib/audit/norms.ts` and
    `src/lib/audit/border-contrast.ts`; nothing ties them, and they drifted once into a merge conflict.
  - `packages/create-cairn-site/` is not in `check:leaks`' scan roots (`SCAN_ROOTS`,
    `scripts/checks/check-leaks.mjs:473`; only `templates/waymark` is a template root), and its `src`
    ships in the package's `files`. Trigger: before that package's first publish.
  - `packages/create-cairn-site/test/fixtures/transcripts/01d-resume.txt` still holds the maintainer's
    home path and a `glw907.workers.dev` URL (12 matches), lists the scaffold migrations as `0000` and
    `0003` with no `0001` (line 837), and ends the key step with "re-run this step" (line 942, where
    the step now points at the rotation page). Fixing them needs a transcript regeneration that
    `check:transcripts` replays.
  - `scripts/checks/check-symbols.mjs` (`extractFilePaths`, `:308`) reads the inline import specifier
    `#theme/cairn.config.js` as the file path `theme/cairn.config.js`, so prose cannot name the
    scaffold's real import; fenced blocks strip import specifiers and inline spans do not.
  - Reaching an older auth schema in an integration test means slicing statements out of
    `env.TEST_MIGRATIONS` by hand (`src/tests/integration/_apply-migrations.ts:7`,
    `vitest.config.ts:131`, `auth-store-roles-unmigrated.test.ts:19`); a harness helper that applies
    migrations up to a named file would remove the slicing.
  - `check:surface` reports a new exported type whose members name unexported interfaces as
    unrecorded closure leaks (`scripts/checks/check-surface-leaks.mjs:480-486`), and the message
    offers only the registry entry as the remedy; exporting the named types also clears it, which
    pass A's Task 5 chose (`ChannelSessionLike`, `ChannelStatementLike`).
  - The regeneration command on line 2 of `examples/showcase/worker-configuration.d.ts` (`wrangler
    types --env-file=... --include-runtime=false`) was not reproducible by hand on pass A's Task 7:
    a local run with `.svelte-kit` present added a `GlobalProps { mainModule }` block the committed
    file does not carry. No workflow or package script regenerates the file to say which output CI
    expects.
  - The `GithubDouble` ref PATCH handler (`src/tests/unit/_github-double.ts:222-231`) lands any staged
    commit without comparing its parent to the branch head, so it can never answer the real 422
    non-fast-forward; a head-guard race test wraps `fetch` instead (`_inject-after-read.ts`). A
    parent check that returns 422 when the head moved would let each test stage the race directly.

- **Engine writes to `main` still unguarded (data-loss class; pass A's close, 2026-10-09).** Pass A's
  C11 head guard covers publish, publish-all, Library delete, metadata, replace, alt, and the
  dictionary. The security reviewer found two writers it missed: entry delete and entry rename
  commit to the default branch with no head passed (`backend.commit` takes
  no head argument; `src/lib/sveltekit/content-routes-entry-destructive.ts:174-181`, `:392-397`), the stale-write
  data-loss risk C11 closed elsewhere. The guard
  itself reads each snapshot by branch name, not at the head SHA it just read
  (`src/lib/github/repo.ts:72-86`, `contentsUrl` pins `?ref=<branch>`), so replica lag could return
  a snapshot older than the head and defeat it; the hardening reads each file at the head SHA.
  Trigger: the final engine batch (path item 7 above) at the latest, and sooner if any engine
  pass touches these files.

- **Reference-arm corrections the extend rebuild surfaced (stage 2a's close, 2026-10-07).** Trigger:
  stage 2b, whose pages link these entries, or the engine pass's own docs step, whichever comes
  first. `createRenderer` omits `unsafeDisableSanitize` and lists its hast steps out of pipeline
  order (`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/core.md:616`); the reference index calls the Extension API "the frozen
  contract" (`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/README.md:21`, `scripts/checks/reference-coverage.mjs:70`) though it
  broke at `0.86.0` and `0.94.0`; `core.md:174-176` and two comments say the preview frame pins a
  white ground (it follows `base-100`); `public-css.md:67-71` names a different home for the
  `--cairn-cta-*` keys than Waymark uses; the admin motion tokens have no published home and
  `cairn-audit.md:91,241` link into `docs/internal/`; the motion rules read two scope keys
  (`src/lib/audit/run.ts:226`) and `frame-offset` counts per run while the reference says per screen
  (`motion-property.ts:395-396`; fix `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/cairn-audit.md`); no entry lists the five selected-segment forms of
  a `btn` or the shell's fixed brand mark; `createSectionAction`'s entry omits the 429 copy and a thrown
  `redirect()`'s path; the `ExpandableRow` example heads its trigger column with a bare `<th></th>`
  (`admin-toolkit.md:840`); no page catalogues the five migrations (`auth-store.md`);
  `NO_PENDING_REQUEST_ERROR`'s entry states its condition too narrowly; the `cli-cairn-media-seed`
  `--from` row never says the path ignores `assets.publicBase`; `cairn logs`, `cairn health`, and
  `cairn sites` have no command page; the roster is called an "allowlist" 14 times
  (`log-events.md`, `auth-store.md`, `admin.md`, `sveltekit.md`).

- **`cairn-audit` and the public theme contract, from the cairn-themes Survey (2026-10-07).** The
  audit has no recipe for a standalone theme package (a contrast-only entry sheet that imports
  `cairn-public.css`, named in `public.stylesheets`); daisyUI 5 gives a form field no ground or
  border variable, so a field ground and a field border are invisible to `theme-contrast` and fall
  under 3:1 by default; and `card-border`, `input`, `select`, and `textarea` hard-wire `base-200`
  while `.list-row` mixes 5% `base-content`, so a theme's `base-300` border role misses them. A fix
  adds field-ground and field-border roles to the public theme contract with `theme-contrast` pairs,
  and maps the component borders onto one role. Trigger: the theme initiative's next pass. The
  audit's exit code and report gaps are in the engine pass entry (Now).

- **The tidy model catalog does not know `claude-haiku-5-5` or `claude-sonnet-5-5` (October dependency
  sweep, 2026-10-07; record https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-10-07-dependency-sweep.md).** `@anthropic-ai/sdk`
  0.132 lists both ids. `claude-sonnet-5-5` already resolves by prefix in `EFFORT_TIER_PREFIXES`
  (`src/lib/sveltekit/content-routes-tidy.ts:58`), but `TIDY_MODEL_LABELS`
  (`content-routes-settings.ts:130-132`) has no label for it, and a Haiku 5.5 id would fall to the
  no-effort branch of `supportsEffort` without anyone having checked that it rejects the parameter.
  Which models the editor setting offers is a product call. Trigger: the next pass that touches the
  tidy model setting, or an owner asking for a newer default.

- **Held dependency majors (October dependency sweep, 2026-10-07).** Each waits on a condition a
  tripwire can read. `devalue` 6: `@sveltejs/kit` declares `devalue` `^6` (cairn's
  `client-action.ts` and `MediaInsertPopover.svelte` parse what SvelteKit stringifies, so the two
  must agree). TypeScript 7: the `svelte-check --tsgo` entry under Now and `@sveltejs/kit`'s
  `typescript` peer admitting `^7`. Vitest 5 with `@vitest/browser*`: `@cloudflare/vitest-plugin`
  declares a `vitest` peer that admits `^5` (its latest, 1.3.7, peers `^4.1.0`). `@types/node` 26:
  Node 26 reaches Active LTS (the engine floor decision in `docs/STATUS.md`). Go: `xo/terminfo`
  `v1.x` (it also holds `charmbracelet/ultraviolet`), `x/exp/golden`, and `check.v1` move when
  Geoff accepts the tagged-release scheme or an upstream we require pulls them in.

- **`wrangler types --check` agrees with a committed `worker-configuration.d.ts` only on a tree with
  no build output (2026-10-05, SvelteKit 3 pass, S4; record
  https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/research/2026-10-05-sveltekit-3-bump-survey.md).** wrangler adds
  `GlobalProps.mainModule` (an import of `.svelte-kit/cloudflare/_worker.js`) to the generated file
  when that build output exists, so a regeneration after a build differs from the committed file.
  The `sv` adapter-cloudflare scaffold's `build: wrangler types --check && vite build` fails a second
  build the same way. Trigger: a site or the scaffold wiring `--check` into a script that can run
  after a build.

- **`cli-cairn-media-seed.md` says `vite dev` serves seeded media, but the scaffold's dev script
  hides it (draft docs harvest, task 6b, 2026-09-30).** The reference page (lines 4, 8, and 23)
  says `vite dev` or `wrangler dev` sees the seeded objects. The scaffold's `npm run dev` sets
  `CAIRN_DEV_BACKEND=1` (`templates/waymark/scripts/dev.mjs:28`), which swaps `MEDIA_BUCKET` for an
  in-memory fake (`packages/cairn-cms-dev/src/handle.ts`), so seeded objects show only under bare
  `vite dev` or `wrangler dev`, not the command a scaffolded site runs. Doc bug or engine bug is
  undecided, and the reading is from code only. Fix: say so on the page, or let the dev backend
  read through to a seeded bucket. Verdict (engine pass B, ruling 5): the in-memory R2 double stays, the
  dev package README states the limit, and reading local R2 through is batched, tagged add-cairn. Trigger: the next pass touching `media-seed` or
  `packages/cairn-cms-dev`, or a site that seeds media and sees none. The SvelteKit 3 move changed how
  the doubles reach the Worker (`withEnv` over the Worker env) and not which exist, so this defers,
  re-armed to the next pass that changes the dev package's double set or `DevBackendConfig`.

- **Docs improve-as-we-go standing order (Geoff, 2026-09-29).** Once the first-draft docs are
  complete, every agent working on cairn fixes docs deficiencies, inaccuracies, and improvement
  openings as it finds them, and republishes to cairn.pub. The standing order needs a design before
  it runs: which pages an agent may edit in place, which gates it runs, how a fix reaches cairn.pub
  between releases, and how the gates stay in step. Trigger: the first-draft docs complete (the draft
  documentation entry's site round). Open with a brainstorm that designs it.

- **`theme-contrast`'s unreadable-tint detection can over-trigger (theme identity pass C,
  2026-09-29).** A status `color-mix()` painted as a `background` keeps that status's tint pair and
  marks it unmeasured, so a status color-mix background that is not a callout tint reports a pair the
  theme does not paint. Fix: tie the unmeasured tint to the selectors the chassis paints callouts
  with, or read the mix's owning rule. Trigger: the first consumer finding that names an unmeasured
  tint on a non-callout background.

- **A bare class-based dark block is ignored, not reported (theme identity pass C, 2026-09-29).** A
  `.dark { ... }` block (no `data-theme`, no daisyUI block) in a public stylesheet is not modeled by
  `theme-contrast`, and the rule does not say so. Fix: report the block as unmeasured, the way a
  `root` option that is not the root element already is. Trigger: the first site that themes dark
  with a bare class block.

- **A preprocessed `<style lang=scss>` block that parses as plain CSS is audited with no advisory
  (theme identity pass C, 2026-09-29).** A public `.svelte` file whose preprocessed style block the
  Svelte parser rejects raises the named "unparsed style block" advisory, but a block that happens to
  parse as CSS is read as CSS with no note that it was preprocessed. Fix: raise the advisory for any
  `lang` attribute other than `css`. Trigger: the first consumer that authors a public component in
  Sass or Less.

- **A `public.scope` that names `src/routes/admin` still loses it to the non-removable default
  exclude (theme identity pass C, 2026-09-29).** The admin root stays in the admin scope by design,
  but the config gives no message when a site lists it under `public.scope`. Fix: a named advisory,
  or a config error like the covered-root one. Trigger: the first site that broadens `public.scope`
  to `src`.

- **The theme toggle's first-paint icon and label mismatch on a dark-first theme (theme identity
  pass C, 2026-09-29).** `SiteHeader` resolves the scheme only on the client, so a dark-first
  theme on a light OS paints the light icon and label until hydration corrects them. Fix: select
  the icon and label by CSS from the root's `data-theme` and `color-scheme`, so the first paint
  is right with no script. Trigger: the next pass that touches `SiteHeader.svelte` or
  `theme-toggle.ts`, or the first dark-first theme a site ships.

- **The header carries two focus-ring languages, and its two-row layout needs scroll-padding at
  narrow widths (theme identity pass C, 2026-09-29).** The nav links use a scoped rule and the
  brand link takes the UA ring. Fix: unify both on `cairn-focus-ring`, which moves the pinned
  header render, so the change re-baselines the header captures deliberately. The two-row header
  also covers the top of an anchored target at narrow widths, so `scroll-padding-top` follows the
  header's height there. Trigger: the next pass that touches the site header.

- **`@glw907/cairn-cms-dev`'s `devBackendHandle` breaks a D1-backed admin screen (theme identity
  pass B probe, 2026-09-29).** It overwrites the platform proxy's `APP_DB` with a fake D1 that
  answers only the signups SQL. `DevBackendConfig` has no binding hook, and no shipped page says
  so, so a site's own D1-backed admin screen returns a 500 under the dev backend. Fix: a binding
  option, or stop overwriting a binding the site already provides; add a line to the
  `cairn-building-admin-screens` skill either way, and state it on the custom-screen page.
  Trigger: the next pass that changes the dev package's double set or `DevBackendConfig`, and before any
  site is told to build a D1-backed screen against the dev backend. The SvelteKit 3 move changed how the
  doubles reach the Worker (`withEnv` over the Worker env), not which exist, so this defers.
  Verdict (engine pass B, 2026-10-11): batched, tagged add-cairn and the custom admin screen page. The scaffold
  no longer binds `APP_DB`, so only the example site ships a D1-backed screen; the one-line fix (keep a binding
  the site provides) would change the example site's e2e, which runs on the fake, so it waits for a pass that
  owns that spec. Pass B changed `DevBackendConfig` (`content`, no `seedContent`) and left the double set alone.

- **Promote `radius-scale` and the three retired-patch arms to error tier at `0.99.0` (theme
  identity pass B, 2026-09-29).** They ship at advisory tier in `0.98.0` and every finding names
  `0.99.0`. `src/tests/unit/audit/promotion-versions.test.ts` enforces it: it reads every
  `*PROMOTION_VERSION` constant under `src/lib/audit` and fails once the package version reaches
  one, naming the choice owed (promote and delete the constant, or re-date with a disclosed
  changelog line). The three older `0.98.0` promises (`log-event-grammar`,
  `log-secret-field`, the guarded-retirement arm) landed in `facc5fcf`, so the `0.98.0` version
  commit no longer turns it red; `radius-scale` and the retired-patch arms stay advisory until
  `0.99.0`. Trigger: the `0.99.0` version commit.

- **`MarkdownEditor`'s `transformSelection` still replaces the whole document (theme identity pass
  B, 2026-09-29).** `insertLink` and `insertImage` dispatch `from: 0, to: doc.length`, the pattern
  the block insert dropped for a changed-span dispatch. The same consequences apply: every folded
  block unfolds and an in-flight upload placeholder moves to the end. Fix: dispatch only the span
  the format transform changed. Trigger: the next pass that edits `MarkdownEditor.svelte`, or the
  first report of a fold or a placeholder moving after a link or image insert.

- **Real defects the pass 1 readers found (2026-09-24; narrowed at the harvest's close,
  2026-09-30).** Two remain: the missing Email
  Sending price for the admin arm's "What it costs" job, a Cloudflare price no page holds, which stage 3 sources when it drafts that job; and seven contradictions on the
  three `cli-cairn-*` reference pages, which still ship. Trigger: stage 3 for the price, the next
  pass touching a `cli-cairn-*` page for the contradictions.

- **`cairn-run-gate` needs a silence watchdog for browser gates (doctor-retirement pre-task,
  2026-09-21; a dotfiles chore, filed here because cairn passes are what hit it).** This pass lost
  over an hour to a stock `npm test` that held the heavy lock while producing no output, because
  the gate runner waits on exit and nothing watches for a run that has stopped making progress.
  A watchdog that fails a browser-lane gate after a bounded silence would have surfaced it in
  minutes. Trigger: the next gate run that has to be killed by hand.

- **`check:symbols` still misses an attached shell redirect and drops a continuation left pending
  at a fence close (draft docs pass 0+1, segment A, 2026-09-26).** The 2026-09-26 hardening
  (`2d960720`) truncates a `cairn` line's word list at a shell operator or `#` comment written as
  its own word, so `cairn logs --json | jq --arg x y` no longer blames `cairn` for `jq`'s flag, but
  an operator glued to its target with no space (`2>&1`, `>out.json`) still tokenizes as one word
  and is read as a `cairn` argument. Separately, when a fence's last line ends with a `\`
  continuation and the fence then closes with no further line, `extractCairnLines` sets `pending`
  to `null` without ever pushing it to `lines`, so that invocation's flags are never checked at
  all. Trigger: a docs page whose `cairn` line actually is silently unchecked this way, or the next
  pass that touches `extractCairnLines`.

- **`admin-toolkit.md`'s outline-chip contrast ratios need re-measuring (draft docs stage 1,
  2026-09-28).** The outline-chip contrast paragraph once cited two specific ratios (about 2.4:1
  against a card ground, 2.97:1 against a page ground) for the
  `color-mix(in oklab, currentColor 55%, transparent)` hairline inside a `text-muted` ancestor;
  neither traced to a source in the repo (no test, no audit rule output, no computed constant), so
  stage 1's batch 4/5 fact review removed them and the page now states only the traceable claim
  (the mix reads under the audit's own 3:1 border-contrast floor against both grounds). Trigger:
  re-measure the actual ratios, ideally with the rendered `border-contrast` rule itself against a
  `text-muted` ancestor fixture, before restoring specific numbers to the page.

- **cairn-pub adopts Vale and routes its own prose to the developer brief (style-guide sync ruling
  13, 2026-09-28).** cairn.pub's own prose, everything it serves outside the engine's shipped doc
  arms, takes the Google base, and the workstation `writing-voice` skill already routes it to the
  developer brief in `.claude/skills/cairn-writing-docs/references/docs-register.md`. No gate reads it: cairn-pub carries no Vale
  config. The work is cairn-pub's: vendor the same Google package and `Cairn.*` styles this repo
  pins (Vale 3.23.0), point its repo guidance at the brief, and fix what the first run reports.
  Trigger: cairn-pub's next pass that edits its own prose, or its pin bump to the rebuilt arms.

- **Promote each warning Vale rule to error as its tree count reaches zero (style-guide sync,
  2026-09-28; GitLab's warning-then-error practice).** `Cairn.Headings` (49 alerts) and
  `Cairn.ProseProcedure` (31 at landing, 30 at the pass close) ship at `warning`, each with its
  count in a `WATCH` comment at the top of its file under `.vale/styles/Cairn/`. The docs gate and
  `check:vale` filter at `--minAlertLevel=error`, so a warning rule shows only under plain
  `vale <path>` and CI never sees it. Trigger: each arm stage's merge, and the deletion itself, re-measure with
  plain `vale` over the tree; a rule at zero moves to `level: error` in the same merge, and its
  `WATCH` comment goes.

- **Adopt stock `markdownlint-cli2` at the first rebuilt arm (style-guide sync, deferred
  2026-09-28).** The re-scope deferred markdownlint. On today's tree, nine stock rules fire (MD013
  alone 7,203 times), so adopting it now means disabling each, and every rule left enabled has
  zero hits and catches nothing. An arm drafted from empty starts clean instead. Adopt the stock
  configuration, with a custom rule only for a defect measured on a rebuilt page. Trigger: the first
  arm stage that drafts pages into an emptied arm.

- **Tidy's default model should track the latest Sonnet (Geoff, 2026-09-29; promoted from the
  friction log).** `DEFAULT_TIDY_MODEL` is pinned to `'claude-sonnet-5'`
  (`src/lib/nav/site-config.ts:133`), and Sonnet 5.5 has shipped. The fix is the
  engine's: an Anthropic model alias that resolves to the newest Sonnet, if the API offers one,
  or a default that moves with each Sonnet release. `supportsEffort()`'s prefix list
  (`src/lib/sveltekit/content-routes-tidy.ts`) and the Tidy page follow, and that page names no version. Trigger: the next engine pass that touches Tidy, or before
  `0.98.0`'s successor ships if no pass touches it first.

- **Report the drawer `:where()` specificity defect upstream to daisyUI (pre-cut, 2026-09-21).**
  `components/drawer.css` releases its open panel's `will-change` through a rule whose prelude is
  wrapped in `:where()`, which zeroes the prelude, so the release measures (0,1,0) against its own
  base rule's (0,2,0) in the same layer and never applies; the `drawer-open` persistent forms carry
  no release at all. Present unchanged in 5.7.20 and 5.7.42. cairn carries a pinned unlayered
  override (`daisyui-drawer-will-change-where-wrapper` in the rulings ledger), which retires the day
  upstream fixes it. Trigger: this is a standing item until the issue is filed.

- **Decide whether `e2e.yml`'s baseline regen should stay on Playwright's `changed` preset (pre-cut,
  2026-09-21).** The `changed` preset skips a baseline that still passes its threshold, and the
  `admin drawer overlay` cases carry a local `maxDiffPixels: 1000` rather than the suite's 120. When
  the drawer's raster moved, four of the six affected baselines still passed at 1000, so the regen
  would have left them stale and only a hand `git rm` forced them to be rewritten. The alternative
  is a delete-then-regen by spec, which costs a full rewrite of every baseline the named spec owns.
  Trigger: the next regen that a pass has to hand-force, or a third stale baseline found in a
  loose-threshold spec.

- **Add a computed-style guard for the `xl:drawer-open` arm of pinned unlayered rule 5 of 14
  (pre-cut, 2026-09-21).** The e2e suite covers the overlay and `lg:drawer-open` forms of the
  `will-change` release; the third selector arm, `xl:drawer-open`, has no guard on the desk
  route. Trigger: the next pass that touches the desk route's viewport coverage.

- **`cairn-guidance install` write-hardening candidates, from the security re-read (extend-2,
  2026-09-20).** The blocking read that found the symlink-containment defect (fixed in `9aa7765a`)
  also named six smaller items, verified against the code as it stands after that fix. Four remain open:
  (1) each directory level should be created with a non-recursive `mkdir` that refuses on
  `EEXIST` when the existing entry is a symlink, closing a race between the `lstat` walk and the
  `mkdir` call where a planted symlink lands between the two; this needs a concurrent local writer
  in the same working tree, out of the threat model for a developer's own checkout, which is why
  it is filed rather than fixed now; (2) a destination whose `nlink > 1` (a hard link) should be
  refused the same way a symlink is, since a hard link bypasses the symlink check entirely; (3)
  `readIfExists` and `mkdir` should move inside the same `try` as the write, so an `EACCES` on
  either refuses the destination rather than aborting the whole install; (4) `cairn-guidance
  check`'s read side should reuse the same `lstat` walk `install` uses, rather than a separate,
  looser read path; (5) `cairn-guidance install` (`src/lib/guidance/bin.ts:94-99`) never sets
  `process.exitCode`, so a run that reports refusals or write errors still exits 0, and a
  disk-failed install should exit non-zero instead of looking like a clean run in CI or a script;
  (6) the pre-cut pass's fix A (`writeErrors` carrying `err.code`) means an `ELOOP` from
  `O_NOFOLLOW` losing the check-to-open race between `resolveWritableDest`'s `lstat` and
  `writeWithoutFollowing`'s open (`src/lib/guidance/install.ts:387`) now reports under
  `writeErrors`, not `refused`, but `installGuidance`'s own doc block near `install.ts:339` still
  says a symlink is refused by name at every point of the write, which is no longer true of that
  one race window; the doc needs a carve-out, or the race needs to resolve to a refusal instead.
  Trigger: the next pass that touches `src/lib/guidance/install.ts`'s write path, or a second
  independent report of any of the six.

- **Blueprint pre-cut admin audit findings, five items over the whole admin surface (pre-cut
  pass, 2026-09-21).** Full record:
  https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-09-21-blueprint-pre-cut-admin-audit.md. (1) `CairnAdminShell.svelte:1046`
  builds a dynamic nav-menu class string with an interpolated `extraClass`; verify every caller
  passes a static string, since Tailwind's scanner cannot see a truly dynamic one. (2)
  `HelpHome.svelte:230` and `MarkdownHelpDialog.svelte:29` carry tables with no local overflow
  strategy; check both at 320px against the five-viewport standard and wrap in `overflow-x-auto`
  if either scrolls the page. (3) `CairnMediaLibrary.svelte:781` and `:992` size thumbnails with
  `max-h-full max-w-full object-contain` inside a sized tile; confirm the tile reserves the space
  so a slow-loading thumbnail cannot shift layout. (4) `EditPage.svelte` carries fifteen inline
  `<path>` elements (`:1529` to `:2282`) beside the project's `@lucide/svelte` icon library;
  decide which are hand-drawn Lucide icons that should swap to the library and which are
  deliberate custom glyphs. (5) `EditPage.svelte:2429` and `:2491` write
  `hover:text-[var(--color-primary)]` and `text-[var(--color-accent)]` where the semantic
  utilities `hover:text-primary` and `text-accent` already cover the same token; a plain swap.
  Trigger: the next pass that touches `src/lib/admin/`.

- **Two admin glyphs are drawn as bare text characters, not icons (pre-cut pass fix round,
  2026-09-21).** `DeleteDialog.svelte`'s dialog close button is a bare `✕` character
  (`src/lib/admin/DeleteDialog.svelte:75`), and the command palette's keyboard hint is a bare
  `&#8984;` inside a `<kbd>` (`src/lib/admin/CairnAdminShell.svelte:851`). Neither pins a
  font, so both resolve through whatever fallback font the rendering environment supplies, which
  made the visual baselines depend on the CI runner's font fallback for `U+2318` rather than on
  cairn's own markup. Draw both from the icon library (`@lucide/svelte`) or a pinned symbol font
  instead. Trigger: the next pass that touches either component.

- **The showcase's `npm run dev` compiles the admin sheet once and does not watch it (extend-1,
  2026-09-20).** Only the scaffold's baked `scripts/dev.mjs` shim carries the watch compile, so
  editing `examples/showcase/src/admin.css` during a dev session has no effect until the next
  `npm run build:admin-css`. Candidate: mirror the scaffold's shim in the showcase. Trigger: the
  next pass that edits the showcase's own admin sheet.

- **One register for cairn.pub and the admin; waymark stays neutral (Geoff, 2026-09-13).**
  cairn.pub adopts the admin's Warm Stone system (tokens, Bricolage Grotesque display and IBM Plex Sans body,
  the design-system recipes and voice) as a public reading surface; today its theme is byte-identical
  to waymark's unskinned default (record https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-09-13-blueprint-design-spike.md).
  That lands with the front-door rewrite after the docs rewrite. Waymark, the scaffold every site
  reskins, stays neutral: its "not stock DaisyUI" work after extend-1 is craft (type scale, spacing,
  restraint) graded against the public design standard, never a cairn identity a site would strip
  out; the spike's moves that would brand it (rotate its primary hue, adopt the admin type pairing)
  are out.

- **Five admin defaults from the Carbon survey, accepted (Geoff, 2026-09-13; record
  https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-09-13-carbon-patterns-survey.md, Part 5b).** Three were slated to
  land as one bounded task in the pre-cut window; they did not land there (the pre-cut pass's five
  tasks did not include this one) and remain filed here, unstarted, since each is a few lines with
  no new surface: `Pagination`'s selected
  page gains a non-color cue (the design-system gap below, sweep finding 23); `DeleteDialog`
  drops its `method="dialog"` backdrop form so a stray click no longer dismisses a destructive
  confirm (Carbon forbids outside-click dismissal on a danger modal; cairn's safe-delete recipe
  already agrees); `AdminTable` takes an optional accessible-name prop and every engine screen
  passes one; and, from the daisyUI Blueprint audit (record
  https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-09-13-blueprint-audit.md), `EditPage`'s flash strip drops
  `transition-all` for the two properties it animates. Two survey calls
  stand unless reopened: "sign in" stays over Carbon's "log in" (the editor docs grade under
  Microsoft), and Carbon Charts is rejected outright (its stylesheet force-loads IBM Plex);
  Carbon's chart guidance is a recipe reference only.

- **The window after the cut, sequenced (Geoff, 2026-09-13, re-ruled 2026-09-21).**

  **What follows is governed by
  [the after-1.0 framing](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-09-21-cairn-tool-after-1-0-framing.md)**
  (Geoff, 2026-09-21): use it through the site round before building on it; 1.1 is headed by the
  agent-permission check; a terminal HUD is a 1.x minor under `cairn hud`, not a 2.0; 2.0 is
  reserved for a break of a frozen surface, and its goal is provisioning, with the second site
  as the credential design test. The HUD imports the render package's theme
  (`NewTheme(dark, profile)`), its glyph set, its named width rungs, and its sectioned `Frame`
  unchanged, and adds only the cursor, the selection channel, the viewport, and the
  generation-counted refresh. The HUD's look is a design deliverable, never an implementer
  default (Geoff, 2026-09-20: best-quality CLI and TUI output is a top priority for the tool):
  draw real-terminal renderings in both grounds and at 80 and 120 columns, let Geoff pick, cut
  the goldens from the pick, and write every operator-facing string to
  `tool/docs/design/copy-standard.md`. An MCP front end is declined (2026-09-20): a skill on disk reaches
  every agent while an MCP server helps only agents with a fixed tool list, and `cairn help agents`
  already covers the same ground. The architectural rule stands whatever the front end: the spine's API
  is the product, every front end is a view over it, and no logic lives in a view.

- **`cairn doctor`'s three deferred checks, filed beside the agent-permission check
  (doctor-retirement, retire-2b, 2026-09-21).** Ruling 8 of the doctor-retirement spec defers the
  three D1 reads (`auth.store`, `auth.role-vocabulary`, `auth.email-normalization`), the
  `--send-test` any-time re-run, and the `--probe` workers.dev exposure arm to 1.x, each because
  it needs a Cloudflare or D1 credential the pre-adoption, credential-free `cairn doctor` v1.1.0
  contract does not carry. Reopens on the tool gaining the credentialed read filed beside the
  agent-permission check above, where the write-credential question is ruled. Ledger:
  `docs/internal/engine-rulings.md`, `doctor-defer-d1-reads`, `doctor-defer-send-test-rerun`,
  `doctor-defer-workers-dev-exposure`.

- **cairn-pub breaks twice at its next pin bump past the doctor retirement (doctor-retirement,
  retire-2b, 2026-09-21).** Its hardcoded reference-doctor link
  (`src/routes/(site)/docs/+page.svelte:67` in that repo) 404s once the engine's own
  `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/doctor.md` is gone, and its `docs/STATUS.md` scripts `cairn-doctor` in gate
  prose that no longer runs. This pass never edits another repo; both need a fix in cairn-pub's
  own next pass, filed here since no engine record reaches that repo.

- **Three small items retire-2a left, filed at retire-2b's close (2026-09-22).** Verified against
  the tree at filing.
  - **`cairn-guidance`'s containment is a text-prefix check.** `readFileUnderCwd` in
    `src/lib/guidance/bin.ts` compares `resolve(cwd, relPath)` against `cwd + sep` with no
    realpath step, so a symlink inside the project can lead the read outside it. It predates the
    retirement. `src/lib/media-seed/bin.ts`'s `realpathNearestAncestor` is the stronger pattern
    to adopt. Trigger: the next pass touching `src/lib/guidance/`.

- **Go tool 1.1 items, filed at B2's close (2026-09-21).**
  - **A per-site hold.** `--ack` matches on check id alone, so holding one site's `email`
    silences real email failures on every other site in the registry. Filed from the owner's
    tripwire on its first day of use. The shape: `--ack <site>:<check>=<date>`, or acks scoped in
    the acknowledgement file.
  - **`--theme auto`,** an OSC 11 background query behind the flag `1.0` shipped as
    `--theme dark|light`. 1.0 performs no detection at all and defaults to dark.
  - **Two release-job nits** the Task 23 review raised and did not block on: the verify step
    prints nothing on success (echo the archive name), and `install-check.sh` prints `--version`
    without asserting it.

- **Go tool architecture, declined and unplanned (2026-09-27).** What the two source entries left
  behind after the Go tool architecture chores pass (thirteen tasks, https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/HISTORY.md) shipped
  their items. Each declined item carries the reason a chore did not fix it:
  - **`spine.FromKind` and `spine.Kind` stay exported**, not unexported as callerless. Both are
    pre-adjudicated 2.0 seams: the 1.0 plan's seams table
    (https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-09-14-cairn-tool-1-0-pass.md:282-305) names `FromKind` with its
    2.0 caller, the HUD's detail view, and `Kind` is its parameter type (Decision 2).
  - **`render`'s `Role` and its eight constants, the `Profile` constants, and `Glyphs`/`GlyphSet`
    stay exported**, not folded into the eighteen names the render cut unexported. Each is load-
    bearing for a seams-table signature: `Role` for `Style(role)`, `Profile` for
    `NewTheme(dark, p Profile)` and `DetectProfile`'s return, the glyph set for the glyph row
    (Decision 5).
  - **`fixtures`'s `Acknowledged` stays scenario data**, not derived against `health.Run` the way
    its `Degraded` now is. `health.Run` derives `Acknowledged` from the acknowledgement file
    (`activeAckIDs`), which a fixture does not have, so the fixture's own list is the scenario's
    statement (Decision 7).
  - **`probe_token.go` keeps its file name**, not renamed to `auth_check.go`. The rename would
    break the test-file allowlist in `messages_test.go:34`; the file's
    actual defect, stale wording naming a retired command, was the chore that shipped (Decision
    10).
  - **The B2 record's nits outside the two source entries' bullets stay unplanned**, the same as
    before this pass (Decision 12): https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-09-21-go-tool-b2-architecture-reads.md.
    None of it blocks a release. **Trigger:** the next pass touching that package.

- **Go tool architecture, round 2 (2026-09-27).** The chores pass's ten Go architecture
  reads, full findings and best passages at
  https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/research/2026-09-27-go-chores-architecture-reads.md. Nine of ten packages read
  sound with nits; most findings predate this pass, since the reader grades a whole package rather
  than a diff. Structural-finding counts per package, descending: `cmd/cairn` 13 (**needs work**,
  first in line: the `deps` seam's one test hook per field, duplicated bodies across `adopt`,
  `auth check`, and the health paths, and a two-path process-exit split), `health` 11, `render` 9,
  `providers` 7, `spine` 5, `store` 4, `mangen` 4, `fixtures` 2, `copylist` 2, `exe` 1. **Trigger:**
  the next pass
  touching any of these packages, or a dedicated architecture pass before tool `1.2`.

- **`design.yml` uploads no Playwright report artifact on failure (found closing the 2026-09-27
  chores batch, the same gap `e2e.yml` had).** The design gate's styleguide e2e job
  (`.github/workflows/design.yml`) runs `npm --prefix examples/showcase run test:e2e -- styleguide`
  with no reporter selection and no upload-on-failure step, so a CI-only failure (a token or
  axe regression) leaves no downloadable report, the same diagnosability hole `e2e.yml` had before
  this batch closed it. Apply the same fix: `--reporter=dot,html` plus an `actions/upload-artifact`
  step scoped to the job, bounded retention, `if: failure()`. Trigger: the next pass that touches
  `design.yml`, or the next CI-only design-gate failure nobody can reproduce locally.

- **The Names convention reaches only prose Vale lints (promoted from the friction log,
  2026-09-22).** `docs-register.md`'s "Names" section and the `Cairn.Names`
  rule grades prose. Mermaid `accDescr:`/`accTitle:` text, image alt text, and nav labels carry no
  code font and sit inside fences, attributes, or config strings, so Vale never reads them (the
  deleted admin setup page's diagram text "The tool moves through four stages" was one). The
  shape: a small text scan in `scripts/checks/` over alt attributes, the two mermaid directives,
  and nav-label strings, or a manual sweep folded into each stage's drafting brief. **Trigger:** the
  first rebuild stage that writes those strings (stage 2a).

- **Three docs items for the draft-docs pass, filed at B2's close (2026-09-21).**
  - **The drafts must not hard-wire a scaffold-first order.** 2.0's goal is provisioning, which
    makes installing `cairn` the first step, ahead of `npm create`. A getting-started page
    written around `npx create-cairn-site` as step one has to be rewritten rather than amended
    when that lands.
  - The admin track gains the tool as part of "is my site working", woven into the existing jobs
    rather than given a page of its own.

- **Items filed at Pass B1's close (2026-09-20), still open after B2.**
  - The engine's condition registry (`tool/internal/spine/condition.go`, ported from
    `src/lib/diagnostics/conditions.ts`) has no condition id for an HSTS-off finding (the
    `https-forced` check reports it under `ConditionNone`) and none for a stale publish-path
    draft (the publish-path check declares no condition at all). Both need an owner decision on
    the id and its registry entry before a check can carry one.
  - Go's resolver consults `/etc/hosts` before the authoritative dial
    `providers.Probe.LookupAuthoritative` performs, so a machine with a local hosts-file override
    for the probed domain sees a diagnosis that does not reflect the live DNS.
  - A DNS transport failure (a down resolver, an offline machine) reports Unknown under
    `reason.timeout` in every check that reads `providers.Probe`, which misdescribes a resolver
    that is refusing rather than timing out; the two failure modes share one reason today.
  - The engine check's releases-behind count reads the declared dependency range's base version
    from `package.json` rather than the resolved version a lockfile would carry, so a site pinned
    loosely reports behind-ness relative to its floor, not its installed version.

- **Four follow-ups for extend-1's gates layer, filed from the admin motion language pass
  (2026-09-15), still open.** (1) the rendered half of `motion-hover-gate`, triggered by a
  consumer's hand-authored `:hover` rule the static half cannot see because the motion sits on a
  descendant selector or a base rule the class join does not resolve; (2) the DaisyUI `.tooltip`
  touch defect (long-press opens and sticks), whose fix the review found is gating the tooltip's
  **visibility**, not its transition, a behavioral override of a vendor component extend-1 decides
  on its own terms; (3) the same follow-up for DaisyUI `.menu`; (4) the `.modal-box` scale
  override's reopen trigger, carried as a `WATCH:` comment beside the recipe in
  `.claude/skills/cairn-following-admin-design/references/admin-design-system.md`'s Motion section rather than filed here, since the
  trigger (the admin adopting `modal-bottom` at narrow widths) is a markup change a future pass
  makes rather than an external event.

- **Follow-up from the 3c escalate ruling (extend-2, 2026-09-20): `cairn-audit.config.json`'s
  `sheet` entry still names the engine's `dist/admin/cairn-admin.css` layout.** The
  engine-owned Tailwind sources file closed the `@source` line's own "no site names dist" gap, but
  each site's audit config still points `sheet` at the precompiled path under `dist/admin/`,
  a different artifact the amendment did not grant scope to relocate. Resolve the audit's `sheet`
  entry by package subpath so no site config names the dist layout either.

- **Two `showcase`-flavored strings survive in what a scaffolded site ships (chassis-B2's
  Task 7 read, filed rather than fixed since both sit outside a docs task's scope and one
  would move a rendered baseline).** `src/routes/(site)/+page.svelte`'s home masthead copy
  ("The cairn showcase. You write in markdown...") and two content fixtures
  (`src/content/pages/about.md`, `src/content/pages/the-trail-crew.md`) describe themselves
  as the showcase rather than a scaffolded site's own sample content; a new developer keeps
  this copy verbatim until they edit it. **Trigger:** the next pass that touches the home
  masthead or the sample pages, or a scaffold-facing docs pass.

- **Two cosmetic gaps the chassis-B2 pass-end `visual-verifier` named, neither a paint
  regression this pass caused (both pre-existing CSS the archive page size change was the
  first to render past one page).** `EntryRow`'s `border-bottom` and `.pagination`'s own
  `margin-top` plus `border-top` read as a double hairline with a 32 to 40px empty strip
  between the last entry row and the pagination block on `home` and `archive2`, every width
  and scheme; the index head's "N entries" count reads the current page's row count rather
  than the archive's total next to "Page N of 2," which a reader could take as the whole
  archive. Full detail:
  https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-09-04-chassis-inputs/chassis-b2-harvest.md. **Trigger:** the
  polish slice's rendered-surface read.

- **Four engine defects the measured build surfaced (filed 2026-09-05, from
  https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-09-04-cairn-case/16-measured-build/experiment-review-2.md's second
  review and `inference-traps-to-fix.md`).** A dispatched implementer built a real custom admin
  screen against the published seams under review, twice; four things it hit belong to the
  engine, not the experiment, and no doc warns of any of them today.
  4. Mixing a static and a dynamic import of the engine's `sveltekit` barrel emits a Rollup
     facade artifact on the page chunk; no doc mentions the trap.

  The same record's `inference-traps-to-fix.md` names two more traps with no owner yet assigned
  to a filed pass: **shipped behavior must never change to satisfy a test** (the first round
  dropped native `required` and `type="email"` from a form so its own e2e could reach server
  validation; the skill and the custom-screen guide need a line saying the test changes, never
  the product) and **admin-visual baselines are CI-canonical, never workstation-regenerated**
  (the same skill and the extend arm's rebuilt scaffold page need to say so in the place an agent
  reads before running e2e). The record's other three traps (exemplar-over-doc, the
  done-gate checklist, and the scaffold-leak exclusion convention) already have owners named in
  `inference-traps-to-fix.md` inside the chassis-A/chassis-B pass series; a tandem-maintenance
  gate keeping the exemplar, the skill, and the custom-screen guide in agreement is filed there
  too, to `ROADMAP.md`, which is this entry. **Trigger:** the next pass that changes the dev
  package's double set or `DevBackendConfig`, or touches the showcase's `cairn-audit.config.json` or
  the skill, or the extend stage that outlines the custom-screen page. Verdict (engine pass B, 2026-10-11): defect 1 is closed, since the dev
  handle attaches `runtime.access ?? {}` to `locals.cairnAccess` on every `/admin` request
  (`packages/cairn-cms-dev/src/handle.ts`); defects 3 and 4 and the two untracked traps re-arm to the extend stage
  that outlines the custom-screen page.

- **Test-harness fidelity (filed 2026-09-01, conventions-pass close).** The integration
  cookie jar has no expiry semantics, the old double-mint test shared one jar in-process, and
  the e2e reuses stale preview servers off CI; each hid a real bug this pass's fresh-context
  reviewers had to catch instead. Make the doubles model the browser and D1 contracts
  honestly (cookie maxAge, per-request jars, no server reuse) so the cheap layer sees what
  the expensive layer currently compensates for.

- **Fold the auth-channel's cookie-secure derivation and `checkChannelRateLimit` onto `csrfSecure`
  and `resolveRateLimit` (filed 2026-08-31, the conventions pass's own recorded divergences).** The
  channel derives `secure` from a bare `event.url.protocol` and reimplements the rate-limit branch
  inline; both are recorded at their sites as deliberate and safe today (`assertOriginAndScheme`
  fails http closed off localhost), and both are one convergence away from the engine's grammar.

- **Platform features now available and unused (surveyed 2026-08-21).** Tailwind 4.3 ships
  logical-property spacing (`pbs-*`, `mbs-*`, `inset-s-*`), `@container-size`, and stacked
  `@variant`; DaisyUI 5.7 ships `menu-paged` for keyboard travel through nested menus.
  Neither closes a live defect, so neither is a task; each is the sanctioned form to reach
  for when its shape next comes up (an RTL audit, a nested admin menu). Every Cloudflare
  platform item this survey turns up lives in Later's "Platform watch: Cloudflare" list
  instead, so a single heading carries the whole tracked set for the monthly routine that
  reads it. Tailwind 4.3's `scrollbar-*` utilities compile to the identical
  `scrollbar-width`/`scrollbar-color` mix `cairn-admin.css` already hand-writes, but the
  newest-toolchain pass found that sheet is imported raw by `src/lib/reproductions/ReproContext.svelte`
  and the component test project runs no Tailwind step, so an `@apply` there is dropped in the
  browser; the source sheet stays plain CSS until the component project runs the Tailwind step.

- **Declare required Worker secrets without breaking local dev.** A pass on newest-toolchain
  tried declaring `wrangler.jsonc`'s `secrets.required` for `GITHUB_APP_PRIVATE_KEY_B64` and
  withdrew it after the Workers reviewer found three problems. (1) wrangler 4.125 filters
  `.dev.vars` down to only the names already listed in `vars` or `secrets.required` once a
  `secrets` block exists at all, so `wrangler dev` silently stopped seeing `ANTHROPIC_API_KEY`
  and the GitHub App id pair, which the showcase's `.dev.vars` also carries; the same change
  turns on `includeProcessEnv`, so a required secret with no `.dev.vars` entry reads from the
  ambient shell instead of refusing to start. (2) A first `wrangler deploy` of a Worker that
  does not exist yet throws when a required secret is unset (`addRequiredSecretsInheritBindings`),
  which is exactly the order `create-cairn-site`'s automated chapter deploys in, before the App's
  key has anywhere to go. (3) A scaffolded site would never get the guard at all unless the
  scaffolder itself appended the `secrets` block after `wrangler secret put`, since the baked
  template strips anything wrapped in `cairn-template:exclude`. The next `create-cairn-site` pass
  should design: declare every runtime secret a site actually uses (or add the optional ones,
  like `ANTHROPIC_API_KEY`, to `vars` instead so they survive the `.dev.vars` filter), append the
  `secrets` block in `packages/create-cairn-site/src/cloudflare/chapter.mjs` only after the key is
  pushed rather than baking it into the template, and keep a `.dev.vars` present in every
  generated site so the filtered read still resolves locally. That same pass should also
  re-record every transcript fixture under `packages/create-cairn-site/test/fixtures/transcripts/`:
  the `01-*` fixtures still print "Node 22 or later" and `03-doctor-credentialed` predates the
  `@sveltejs/kit` 2.70 and `svelte` 5.56.10 floors. Size: small-to-medium. Trigger: the next
  `create-cairn-site` pass.

- **`.toolkit-toolbar-select`'s and `.toolkit-toolbar-facet`'s edges fall under the WCAG 1.4.11
  3:1 non-text contrast floor** (shipped deferral, measured 2026-08-27, toolkit-seams pass;
  corrected 2026-08-27, fix round). The
  real numbers, measured against `--color-base-100` through the real component (its own Svelte
  scope class applied): `.toolkit-toolbar-select` (the select facet's own `--input-color`
  override) and `.toolkit-toolbar-facet` (`ListToolbar.svelte`, the `'menu'` facet's own trigger
  container, an identical `border: 1px solid var(--cairn-card-border)` hairline) both measure
  1.192:1 light / 1.203:1 dark, deliberately excluded from that pass's field-family edge-contrast
  rule because both harmonize with the surrounding facet chrome, which shares the same border
  treatment. Decision owed: retheme the shared facet chrome to clear 3:1, or record a ruled
  exception in `admin-grammar-tokens.md`; a candidate argument for the exception is the caret glyph
  each control carries (the `'menu'` facet's own `&#9662;` caret, `currentColor`), a non-color
  identifying affordance a plain `<select>` also carries natively, which may be the reasoning a
  ruled exception would rest on. Size: small. Trigger: the next pass touching toolbar facet chrome,
  or a contrast audit that flags this element.

- **Two admin-toolkit accessibility gaps the reproduction seam surfaced.** Both sit in
  primitives a site composes directly. (1) `AdminTable` wraps its table in `overflow-x: auto` with
  no `tabindex="0"`, no role, and no accessible name, and forces `white-space: nowrap` on every
  cell, so
  horizontal overflow at narrow widths is guaranteed and a keyboard-only user cannot scroll to reach
  it (axe-core `scrollable-region-focusable`). Refinement (2026-08-29, toolkit-seams fix round;
  promoted from the
  friction log at the 4b close): Chrome 127+ and Firefox make an overflowing container natively
  focusable, so the gap is partially mitigated on those engines already; it still reaches Safari
  and older Chromium. (2) `StatusChip`'s own prop doc says `'bounded'`'s hairline inherits its
  color from the chip's ancestor and can drop under the 3:1 border-contrast floor inside a muted-text
  ancestor, telling the reader to verify each new call site; the documented example ships a new call
  site (a chip inside a table cell) with no measurement recorded.

- **A marker anchor may bind to a Tailwind class, and the gate only checks that it resolves.** Three
  of `tags/screen`'s five frozen callout anchors select on styling classes
  (`div.overflow-hidden.card-shell.card-shadow`, `div.rounded-box.border-dashed`,
  `button.btn-primary[type="submit"]`), and the first is unique only because one of two cards built
  from the same shared class constant happens to carry `overflow-hidden` as well. The universal
  contract asserts the anchor resolves and nothing more, so a styling refactor that moves a class can
  silently repoint a published numbered callout at the wrong element with every gate green. The same
  story already shows the durable form twice, an id and an `aria-label`. Give the three a stable hook
  and treat a class-shaped anchor as a review smell across the seam.

- **The editor preview frame declares no document language** (WCAG 3.1.1, Level A).
  `buildPreviewDoc` emits `<html data-cairn-preview>` with no `lang`, so a screen-reader user proofing
  in Preview hears the entry read in the synthesizer's default voice. Every cairn site's live preview
  inherits it, and the seam now publishes it through `editor/preview-tab`. The narrow fix is a
  literal; the right one threads the site's language through `ResolvedPreview` so a non-English site
  is correct too.

- **An admin test-send, as engine work for its own pass (split out of T4b, 2026-08-12).** The
  preflight half is `cairn health`'s `email` check (`email.sender-not-onboarded`) plus the
  scaffolder's first-run send: chapter 2's own test send proves the provisioning question at the
  moment it matters. The any-time send re-run the retired npm doctor offered is deferred (ledger
  `doctor-defer-send-test-rerun`). The admin test-send answers a
  different question: an editor reporting months later that no link arrived. It left the T4b pass
  because that pass carries a hard constraint that the runtime library stays untouched, and this is
  runtime work in the admin surface.

  Two findings from T4b's spike shape it. The REST send and the Workers binding carry **different
  error vocabularies**, so an admin-side check written against the binding cannot reuse the
  installer's classification; see https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-11-t4b-email-spike.md. And a send failure
  is ambiguous for the first minute or two after onboarding, so any admin-facing result needs to
  say "still settling" rather than "broken" when the domain was onboarded recently.

- **`npm test` can hang rather than fail (found on the cleanup pass, 2026-08-08).** A run stalled
  for roughly three hours in the browser (component) project instead of exiting non-zero. This is
  distinct from the documented "Browser connection was closed" flake, which fails fast and is
  already a known retry case. Any long-running background gate needs a liveness check rather than
  trusting it to terminate: a stalled run today reads as "still running" indefinitely, costing
  attended time rather than failing loud.

- **`COLLATE NOCASE` on `editor.email`, to ride along with the next auth migration.** The column is a
  BINARY-collated `TEXT PRIMARY KEY` (`migrations/0000_auth.sql:3`), so two case variants of one address
  are two rows. The 2026-08-01 xcathletes seams pass closed this at the store: every email argument in
  `src/lib/auth/store.ts` is trimmed and lowercased before it matches or writes, so no path through the
  engine or the public `/auth-store` subpath can create a shadow row. The residual is a site writing the
  `editor` table with raw `wrangler d1 execute`, which is why this is filed rather than urgent. Closing it
  at the database is a schema change against two consumer sites, so it wants batching with the next
  migration rather than a migration of its own. Found by the pass's review gate while confirming the
  lockout defect the store fix closed.

- **Cairn's own admin's error tier is clean (design infrastructure Pass 3, 2026-07-29).** The advisory-tier
  debt this pass did not touch stands unchanged:
  - **Advisory, `border-contrast` (132 of the 210 in three classes).** Table row
    dividers are `base-content` at 5% alpha, reading 1.10 light and 1.14 dark, 70 findings and the
    largest single class in the corpus: a rule whose whole job is separating rows, doing almost
    none of it.
  - **Advisory, `weight-budget` (2, both true positives and the only two in the corpus).**
    `/admin/login` renders no `<main>` landmark at all, a real landmark gap rather than an audit
    inconvenience. `/admin/media`'s content region renders three font weights against the two-weight
    budget, all three genuine card content: filename 500, reference badge 600, status-chip label
    400. **Sequencing hazard, do not lose:** fixing the login landmark immediately creates two new
    `screen-anatomy` false positives, because that rule's only working exemption today is an
    accidental `if (!mainEl) return null`. Give `screen-anatomy` a positive scope predicate first.

- **The rendered rules' own calibration follow-ups** (design infrastructure Pass 2, 2026-07-28). All six advisory rules stay advisory (`chip-ground-collision`
  joined the group this pass, demoted in from error tier; see below), and the evidence for promotion
  is not close, so what remains is repair rather than promotion.
  `interactive-contrast` is a demotion candidate and the only one that gates: 3 findings on a
  consumer home page, all false positives, and 0 on cairn's own tree. `border-contrast` is the most
  repairable of the advisory five, but its exemption keys on the literal string
  `--cairn-card-border`, which no consumer can reach structurally. `screen-anatomy` judges every
  drawer-less page an office screen, so every consumer page in existence. `touch-targets` omits WCAG
  2.5.8's spacing exception, which would exempt the 62x16 sort button at its measured 47px nearest
  neighbour.

- **The rule repairs Task 18's review gate confirmed but deferred** (design infrastructure Pass 2,
  2026-07-28). Six defects the gate found were fixed with fixtures; these six were confirmed and
  left, each because closing it is a scope expansion or loosens a gating rule and deserves its own
  adversarial pass rather than a gate-stage edit. Each is documented at the code, so a reader meets
  it in context.
  - `touch-targets` samples one 390px viewport, and SC 2.5.8 carries no viewport qualifier. Borrow
    `viewport-overflow`'s width list; the cost of leaving it is a control that passes at 390 and
    fails at 320 going unmeasured.
  - `touch-targets` and `interactive-contrast` hold different definitions of a control. The first
    misses `textarea`, `<area>`, the widget roles, and a `tabindex`-plus-handler custom control; the
    second carries a wider list plus a `cursor: pointer` fallback. One shared selector in the page
    helpers is the repair. Widening a gating rule's net changes the measured baseline, which is why
    it is not taken here.
  - `touch-targets` collapses findings per selector signature, so a count is a count of shapes.
    `interactive-contrast` deliberately refuses the same idiom. Two error-tier rules disagreeing on
    this means a developer cannot read either count as a remediation estimate.
  - `chip-ground-collision`'s overlapping-painter test is a bounding-box intersection with no
    paint-order reading, and daisyUI paints a background-image on every `.btn`, so any chip
    overlapping a button or an icon downgrades from a gating error to an advisory. Narrowing it
    loosens the downgrade path on a gating rule.
  - `border-contrast`'s `RATIFIED_HAIRLINE_FLOOR` is a literal 1.15 sitting 0.04 under the pairing
    its own doc calls invariant, so a consumer re-tune that softens the hairline more than roughly
    4% re-reports every `.card-shell` on every page. Derive the floor from the page's own resolved
    token pairing instead of pinning cairn's number, which also closes the consumer-reachability
    asymmetry the friction log records.
  - `resolveColors` returns `null` for both an empty string and a color the browser refused, so
    `resolveGround` composites a refused color away as if the layer painted nothing. The repair is
    separate sentinels at that boundary, the way `probeSelectors` already separates "nothing
    matched" from "the browser refused this selector". Fixing it inside `resolveGround` is wrong and
    two pinned fixtures in `color.test.ts` demonstrate it.
  - `weight-budget`'s title-band clause exempts `PageHeader`'s whole caller-authored action slot,
    and its heading test matches a heading anywhere in the header's subtree. Narrow the clause to
    the heading's own flow.
  - `derivedSides` forces two style recalcs plus a scroll per bordered element, run twice per page.
    Batching the sentinel probe onto `documentElement` costs one recalc instead of N. Wall-clock
    only, on a consumer's CI.

- **The design ratchet's own reviewer-triage rule repairs (D2, 2026-07-31)**, filed as promotion
  prerequisites rather than fixed at the gate.
  `field-edge-alignment`'s clustering compares each control's left edge only to the PREVIOUS
  member in the sorted sequence, not to a fixed column anchor, so a chain of sub-`CLUSTER_GAP_PX`
  gaps can drift a whole run into one merged column (a false positive on a legitimate
  multi-column stagger) while a single gap over 80px splits what was really one staggered column
  into two (a silent miss). Its finding message also always recommends `register="stacked"`,
  a real remedy only for a control composed inside `FieldLabel`, and a wrong one for a control
  the rule matches (`.input`/`.select`/`.textarea`) that was never wrapped that way.
  `container-inset-asymmetry` reads a raw inset with no floor, so an absolutely positioned or
  negative-margin child can drive the computed inset negative and the asymmetry math with it;
  clamp with `Math.max(0, inset)` on each side. `one-filled-action` reimplements its own
  unescaped `selectorFor` instead of the shared `helpers.signature` the other rendered rules
  install, so its surface key is not reliably a parseable CSS selector, and it keys a surface as
  `` `${selector}#${landmarks.indexOf(landmark)}` ``, which prints the sentinel `#-1` whenever the
  topmost open layer is itself a `nav`/`aside` landmark (`landmarks` is queried from the layer
  root's descendants only, so the layer's own root element is never in the list its own index is
  read against). `form-font-parity` (already advisory, `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/cairn-audit.md`) walks
  only the first `[data-theme='cairn-admin']`/`[data-theme='cairn-admin-dark']` wrapper on the
  page, so a page mounting more than one is only partly checked. Its explicit-face exemption net's
  three named gaps, variant-prefixed forms (`md:font-mono`, `dark:font-mono`), `font-serif`/`font-sans`,
  and Tailwind 4's `font-(family-name:--x)` shorthand, closed in the conformance pass, 2026-09-01;
  the rule stays advisory, and the multi-wrapper walk limitation above is the one gap this line still
  files.

- **Three design-system gaps found in the same triage.** The legend padding
  reset (`cairn-admin.css`'s `base` layer, design ratchet Task 1) is repaired per call site
  rather than structurally: `ComponentForm.svelte` carries its own `px-1` on the one legend that
  needed it, so the next fieldset that needs the same visual balance has to rediscover the fix
  rather than inherit it. A variant-selected control (`btn-primary btn-active`) carries the same
  border-cue gap `Pagination` carries by fill: daisyUI's own hairline resolves to exactly the
  unselected sibling's own fill, measured 1.11:1 dark / 1.17:1 light, well under WCAG 1.4.11's
  3:1 floor (D3 review triage, 2026-07-31; `cairn-admin.css`'s dark selected-state comment). This
  is stock daisyUI, not cairn's own composition, and cairn renders no variant segmented control
  today, so it is a documented gap rather than a live defect; a consumer who builds one on the
  stock composition inherits it silently until this is fixed.

- **The engine debt and rule repairs corpus C confirmed** (ASC authenticated-admin calibration,
  2026-07-28; evidence and per-item mechanisms in
  https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-07-design-infrastructure-audit-calibration.md section 12). Same discipline
  as the entry above: each is confirmed, classified, and adversarially verified, and each waits
  for its own pass rather than a gate-stage patch. Engine defects the audit caught in cairn
  itself: LoginPage renders no `<main>`/`<header>` landmark (already tracked above; corpus C
  re-confirmed it as the rule's only cairn-origin weight-budget error); the daisyUI stock table,
  input, and button hairlines cairn's bundle ships produce 864 true `border-contrast` advisories
  on one consumer (re-tune the stock borders or extend token-derived exemptions to them; this is
  the named blocker on `border-contrast` promotion).  **The floor-recalibration half stays filed**, scoped to two remaining gaps: the near-neutral
  dark-theme class the chroma term cannot see (cairn's own dark tokens measure chroma distance
  0.89 to 2.66 at ratios 1.190 to 1.432, all under both the 1.5 luminance floor and the chroma
  floor, so this class still flags), and a CVD-safe minimum distance term (a red/green,
  deuteranope- or protanope-safe distance check), since the current chroma term models trichromat
  perception only and can call a pair hue-distinct that still collides for that viewer. Both need
  measured pixel data (a real consumer admin audit run for the first, a CVD simulation or
  measured-panel pass for the second) that no pass has carried into this repo yet; a later pass
  with fresh consumer-admin measurement access (a follow-on audit-calibration or polish slice) is
  this line's candidate home, not a gate-stage guess. The quiet chip register stays unguarded
  against its own fifth ground even after the hue repair, since its own tint carries no hue
  distinct from its base-content/base-200/base-300
  neighbors, all the same warm-stone hue: quiet's 14%-tint mix over `--color-base-300` (e.g.
  daisyUI's `.table-zebra` row-hover) measures ~1.34/1.41, under the 1.5 floor the register
  otherwise clears everywhere else, documented rather than retuned in
  `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/admin-toolkit.md` and `skills/cairn-building-admin-screens/SKILL.md` (design
  infrastructure Pass 3, 2026-07-29 review triage);
  `norms-bands` measures inside closed `dialog.modal` boxes (scale .95 artifact) and trips on UA
  button-vs-anchor default padding; the norms manifest generator passes `size='xs'` to StatusChip
  so the bands never saw the component's `sm` default;  RULING 2's exemption floor strands the light-theme kbd chip at 1.143
  against its 1.15 floor. (design infrastructure Pass 2, 2026-07-28). Two files in `src/lib`
  carried a raw NUL as a composite-key separator, which made
  them binary to `grep` and to `file`, so every grep-based gate over `src/lib` skipped them
  silently while reporting success. Both were rewritten to a unicode escape in `40cb6d77` and
  nothing stops a third. The trigger is machine-detectable, so this is a test or a `check:*` script
  rather than a note: scan the tracked source tree for a control byte outside tab, newline, and
  carriage return, and fail naming the file and offset.

- **Small durability notes on the packaged skill, from the Task 6/7 review gates** (design
  infrastructure Pass 3, 2026-07-29). The remaining two stay open, cheap to carry forward: `skills/**/*.md`
  prose sits outside `.vale.ini`'s scope (`docs/**/*.md` and `README.md` only), so its prose is
  unchecked by any repo gate, though `check:docs` now resolves its links; and `SKILL.md`'s
  cross-references into the reference docs resolve through `node_modules/@glw907/cairn-cms/`,
  which is correct once installed but means the links are necessarily relative to an install, not
  to this repo's own tree.

- **From the ASC Assets-trial harvest (2026-07-29, ten findings across two batches, folded at
  the 0.91.1 hotfix pass; full detail in the ASC repo's trial log).** The
  rest were verified against the code (or against ASC's own adversarially-verified evidence) at
  the fold:
  - **The rendered audit's identity guard and its non-2xx precondition leave a hole between
    them, and the status flattening opens it (harness, high).** The 0.91.0 post-hydration
    identity guard catches a swap (SSR identity vs settled identity); a configured path that was
    never a route SSRs the consumer's 404 and hydrates the same 404, so the identities agree and
    the guard passes it. The only check that would catch it is the non-2xx precondition
    (`rendered.ts`), which the admin-shell status flattening (kit#12987 entry below) defeats:
    ASC's twelve-page run would have measured a 404 as a real screen had a configured path been
    wrong. Remedy candidates from the filing: read the page's own embedded status, or compare
    settled identity against the requested route rather than only against what the server sent.
  - **The rendered summary's two totals are computed differently (DX, low).** The advisories
    total counts printed lines while the suppressed total is `(xN)`-weighted, so a reader
    hand-reconciling ASC's 393 advisories against 217 suppressed finds a discrepancy that has no
    meaning. Pick one convention for both.
  - **A CodeMirror decoration throw on a consumer edit desk (defect, medium).** ASC's
    `/admin/bulletins/2026-03-membership-open` throws `Ranges must be added sorted by 'from'
    position and 'startSide'` at 1440 in both themes; the editor still mounts and stays reactive,
    and the post and page desks are clean, so a decoration set is being built out of order
    somewhere in the editing surface for that content shape. A separate rider from the same desk:
    a `source-code-pro-latin-wght-normal.*.woff2` request fails there, which is its own question
    about whether that face ships.
  - **`cairn-audit` cannot scope to a path, but its done-gate asks a builder to (DX, low).** The
    CLI takes `--rendered`, `--config`, and the `norms` subcommand only (verified in
    `src/lib/audit/bin.ts`), so narrowing a run to "the routes you touched" means authoring a
    config file naming `static.scope`. A positional path argument closes it.
  - **The static scan cannot see a class string a plain `.ts` module exports (coverage gap,
    medium).** The substrate is `svelte/compiler` over markup, so a consumer who centralizes
    admin class vocabulary in TypeScript modules gets zero coverage there while the run reports
    clean: 7 of ASC's 21 `badge-ghost` sites lived in such modules, and its most-used label
    recipe (118 uses across 18 screens) carried a never-compiled `text-[0.6875rem]` for its
    entire life under a green gate. Either extend the static substrate to string literals in
    `.ts` files under scope, or state the blind spot in the cairn-audit reference so a consumer
    knows the gate's coverage rather than inferring it.
  - **The closed type scale has no 12px role (design ruling; still open).** The scale steps from
    13px (`meta`) to 11px (`label`), so Tailwind's 12px `text-xs` has no mechanical target; cairn
    resolved its own 120 twelve-pixel sites "by the relationship each site expresses" and ASC
    resolved its 24 the same way, but the upgrade guide's "match that size to a grammar role" step
    has no answer for 12px. Either document the 12px case in the adoption recipe or reconsider
    where the scale closes. This item routed to "the rule-repair pass, with the trial's ratchet
    evidence"; that pass ran as the design-ratchet initiative (2026-07-30) and deliberately left
    the type-role scale untouched (its global constraints rule out changes to type roles), so the
    12px ruling stays unresolved.

- **daisyUI pins every `.list-row` child to `grid-row-start: 1`, so overriding the container's
  grid alone does nothing (from the 2026-07-30 Assets-trial-build harvest, finding 5; the design
  ratchet pass verified it and deliberately did not repair it).** At 390 a long action label
  squeezed a `.list-row` grid's content column toward zero width, wrapping an asset-type name one
  character per line, measured on `/admin/club/asset-requests`. The repair needs two overrides
  rather than one: daisyUI pins every `.list-row` child to `grid-row-start: 1` in a rule separate
  from the container's own `grid-template-columns`, so the child pin has to be released and
  re-pinned per breakpoint alongside the container override. Engine-level because it recurs in any
  consumer using `.list-row` with a variable-width trailing action, the common admin row shape.
  Site-side overrides exist today; the engine-side fix needs its own design rather than riding the
  design-ratchet pass's cap of three new rendered rules.

- **Deferred from the folded-chip verdict (invisible-craft pass, 2026-07-17):** body-snippet
  previews on the folded chip and a phone-reachable what-it's-for affordance. The chip itself
  shipped (label, title, count; includes show their fragment's human title); these two riders
  were explicitly cut from that verdict and wait for a real editor asking.

- **Raw-URL parity for media-adjacent surfaces** (from the friction log, Waymark final review
  T1/T3, 2026-07-17). Two engine surfaces serve `media:` tokens only: `remark-figure` promotes a
  caption to a real `<figcaption>` only when the figure wraps a `media:` token (a figure over a
  raw external URL renders its trailing text as a plain sibling `<p>`, so caption styling
  silently forks by source type), and the `heroImage` projection resolves `media:` tokens only
  (a frontmatter hero with a raw external `image.src` renders nothing without a template-level
  fallback). Whether raw external URLs get parity with `media:` tokens on either surface is one
  product call; take it when either surface next opens.

- **The admin toolkit's harvest wave 1 shipped (2026-07-20).** `@glw907/cairn-cms/admin-toolkit` The next wave holds:
  - **A toggle-device candidate (ruling 7 of the pass's adoption map).** A bare daisy `badge` for
    an identity label and a single-use on/off pill (`CairnTidySettings`'s tidy-convention toggle)
    both stayed bespoke this wave, correctly: neither has a second consumer yet. Mint a shared
    toggle device once a third one demonstrates the repetition, not before.

- **Admin error statuses flatten to 200 under the streamed pending count (upstream kit#12987;
  severity raised at the ASC rendered baseline, 2026-07-29).** A page-load `error(403)`/`error(404)`
  inside `/admin` renders the right error page and emits its log event, but the HTTP status reads
  200 because the shell layout load streams `pendingEntries` and SvelteKit's streaming branch
  builds its `Response` with no `status` (the non-streamed branch passes it through). ASC proved
  the mechanism on the shipped artifact, not just `node_modules`: `.svelte-kit/output/server/index.js`
  carries the single status-passing site, and ETag presence tracks the lost status exactly. The
  blast radius is not only bad paths: `/admin/posts/<deleted-or-mistyped-slug>` reports success to
  crawlers, uptime monitors, and any caller trusting a status code, and the flattening also defeats
  the rendered audit's non-2xx precondition (see the guard-hole entry in the ASC harvest block
  above). Enforcement is intact (no restricted data crosses; the access-map guide documents the
  caveat). The upstream tracking issue is sveltejs/kit#12987 (open); the previously tracked
  kit#12533 CLOSED without the behavior changing on the shipped bundle, and the scheduled
  kit-watch routine was repointed at #12987 on 2026-08-01. Since cairn chooses the streaming that triggers the
  upstream bug, a cairn-side mitigation (passing the status through another channel, or refusing
  to stream on an error path) is worth weighing rather than waiting on upstream.

- **Body-link cross-branch delete protection.** Lift the body-link delete guard from its current main-only
  posture to the strict, fail-closed cross-branch reference index that the reference delete and rename gates
  now use, so deleting a body-linked target refuses across every open branch the same way a referenced
  target does. The reference pass left this asymmetry deliberate (locked decision 9); this closes it.

- **Nested references inside a container.** Lift the reference field into an `object` or `array(object)` leaf;
  phase 3a deferred containers to scalars and image only. Needs the frontmatter-edge extractor to descend into
  object leaves, the byte-preserving rename rewriter to address a nested YAML path (the corruption-prone part
  the references fan-out caught bugs in), and the cross-branch index plus rename and delete gates to cover the
  nested edges.

- **Component-system gaps surfaced by the starter set (2026-07-02, batch A evidence).**
  **DEFERRED PAST LAUNCH (Geoff, 2026-07-03): the gallery** — complex, highly taste-related,
  and gated on a real engine enabler (component attributes reject `image`/`array` types;
  repeatable slots render bare text inputs regardless of `itemFields`; the fix is an
  image-typed repeatable-slot widget in `ComponentForm` or an `image` carve-in for component
  attributes, an additive contract change and its own designed task given the phase-3a focus
  hazard). The launch component set is complete without it; the aksailingclub migration's
  photo debt revisits this after launch.
  (2) **Inline icons** — the directive vocabulary is container-only by design, so the shipped icon
  component is block-level; the aksailingclub migration's 99x inline usage needs either a site-level
  render plugin (charter-clean, the default answer) or a deliberate engine decision to admit text
  directives (a design question, not a task). Figure needs no component at all: the engine owns
  `:::figure` natively, and the name is reserved — the docs pass records this.
  (3) **Glyph rendering is fill-only** (from the friction log, Waymark final review T1,
  2026-07-17) — a line-shaped subpath (the flag glyph's pole) paints nothing under a fill-only
  renderer, reading as an ~14x8px smudge at standalone size; the `snowflake` glyph is stroke-only
  too, and both it and `flag` render as near-invisible dashes in the Insert-block picker
  (`examples/showcase/src/theme/icons.ts:7,14`, copied to `templates/waymark`). Still open: redraw `flag` and `snowflake` as closed-shape paths in the showcase and the
  template, short of the full stroke sweep across all 27 icons. Trigger: when a theme next touches the icon set.

- **Mechanical hardening: gate the `sideEffects` coverage of the server-only browser stubs (from the
  seams pass-two review, 2026-08-01).** `package.json`'s `sideEffects` now lists `dist/*/browser.js`, so
  a bundler cannot tree-shake away the module-level throw that makes `./auth-crypto` and `./cloudflare`
  server-only in practice. Nothing tests it, and the glob is depth-fixed, so the next server-only subpath
  at a different depth silently reopens the hole while its reference page still promises the throw. Add
  an assertion to `scripts/checks/check-package-files.mjs` (already run by `check:package`) that every
  `dist/**/browser.js` the package emits is matched by at least one `sideEffects` glob, failing with the
  offending path. This is a watch converted into a gate, which is the form that cannot be forgotten.

- **Extend `cairn doctor`'s `config.dependency-floors` check beyond the engine's peers (filed by
  the pre-beta C1 toolchain-matrix task, 2026-08-01).** `tool/internal/doctor/check_floors.go`
  reads a consumer's npm, pnpm, or yarn lockfile and compares resolved versions against the
  installed engine's non-optional `peerDependencies`, today `svelte`, `@sveltejs/kit`, and
  `@cloudflare/workers-types`. It is the only floor enforcement that reaches a real consumer site
  (CI only proves the engine's own repo), and it covers only those rows of the
  supported-toolchain matrix's rows (the retired `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/supported-toolchain.md`). Extending it needs a
  source for each additional floor: `typescript`'s 5.0 floor has no `peerDependencies` entry to
  read (it would need a hardcoded constant, since the engine's own devDependency range does not
  describe the consumer floor), and `vite`/`wrangler`/`@cloudflare/workers-types` carry no engine
  floor at all today, only a proven-against version. Scope the check to what the matrix actually
  promises rather than inventing floors the matrix does not assert.

- **Ambient-block drift gate (filed by C2, R2, 2026-08-02).** The `/ambient` reference page states
  `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/ambient.md`'s whole `App.Locals` block by hand off `src/lib/ambient.ts`; R2's
  execution found the page had drifted already (`cairnAccess` was missing from it entirely). A
  gate that diffs the published block against the source declaration, failing on any field the two

  sides disagree on, closes the class the rewrite just fixed by hand.
- **Log-events field and value parity gate (filed by C2, R6, 2026-08-02).** `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/log-events.md`
  enumerates each event's fields and every literal value its `reason`/`scope` columns can carry in
  prose; R6's execution found two rows had drifted from their emit sites (`media.uploaded`'s
  documented `ext` field is never written, and `github.unreachable`'s documented `layout` scope
  never fires). `src/tests/unit/log-events-table.test.ts`, written test-first against Task 11's
  parity claim, is the seed to extend into a general field/value-column-versus-emit-site gate
  rather than a fresh script.

- **Export-rule closure gate (filed by C2, R4, 2026-08-02).** The standing doctrine: every type
  named in a public signature is exported from a subpath the consumer already imports. Task 9's
  execution found the rule transitively closed, not merely a check of each export's own top-level
  signature identifiers: a re-exported type pulls its whole structural closure, so the gate has to
  walk each exported type's own body too. `CairnAdapter` stays the one documented exception,
  exempted at `/delivery` and `/delivery/data` because its body reaches auth- and github-shaped
  types `delivery-entry-boundary.test.ts` forbids that subpath from importing; a gate encoding the
  rule needs the same named exception, not a wider one.

- **Empty-doc-block tripwire (filed by C2, RN, 2026-08-02).** A literal-empty `/** */` block over an
  exported symbol in `src/lib` should fail a gate outright instead of waiting for a docs sweep to
  notice by hand. Task 14a found and filled ten of them, including on `createCairnAdmin` and
  `createAuthRoutes`, the package's two headline factories. A lint rule (an `eslint-plugin-jsdoc`
  empty-tag check, or a small `check:*` script scanning `src/lib` for a bare `/**\s*/`) closes the
  class.

- **Facade action-key vocabulary gate (filed by C2's close-out verification, 2026-08-03).** Nothing
  pins the `createCairnAdmin` `actions` record's key list. Two defects this pass fixed by hand share
  that root: the action tables in `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/admin-routes.md` and `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/sveltekit.md`
  had drifted to 12 and 11 rows against a 29-key record, and seven facade keys renamed in Task 5 with
  no test asserting the resulting wire names. A posted `?/` key is a runtime string with no
  compile-time check, so a stale one 404s at submit. A test
  asserting `Object.keys(admin.actions)` against a committed list, cross-checked against both
  reference tables, closes the table drift and the wire-name drift together.

- **Pre-beta polish: the cold-reader front-door pass, with a visual first impression (Geoff,
  2026-08-01).** README to tutorial to first deploy, read by fresh context with no family
  knowledge, hunting assumed context the register rules cannot catch (they govern tone, not what a
  stranger already knows). And the README currently shows the product nowhere: strangers evaluate a
  CMS with their eyes before their editor, so it needs admin screenshots or a hosted showcase link.
  Distinct from the filed docs-effectiveness infrastructure (search, `/llms`, the upgrade page),
  which adds surfaces; this audits the ones that exist.
- **Pre-beta polish: the error-message actionability sweep (Geoff, 2026-08-01).** One pass over
  every engine `throw` and `fail(...)` string against the standard the conventions already state:
  can a stranger act on this without us. Most comply; the sweep catches the stragglers, and it
  pairs naturally with the dress rehearsal, which is where stragglers bite a zero-context user.
- **Pre-beta design: the zero-state audit (Geoff, 2026-08-01).** Every beta user starts in the
  exact state the passes never look at: a fresh site with no content, no media, no second editor.
  One deliberate pass proves every admin screen renders a designed zero state rather than a blank
  table, and that the first-run path (empty dashboard, first entry, first publish) reads as a
  guided arc. The highest-leverage design item in the pre-beta set because it is every stranger's
  first five minutes.
- **Pre-beta design: the admin at the viewport extremes (Geoff, 2026-08-01).** The five-viewport
  composed standard is enforced for the public artifacts through the showcase's CI matrix; the
  admin has visual baselines but has never been held to composed-at-320-and-2560, never merely
  unbroken, screen by screen. Editors open admins on phones constantly.
- **Pre-beta design: the sign-in touchpoints (Geoff, 2026-08-01).** The login screen, the
  magic-link email itself, and the confirm page are the first impression for every editor a
  developer invites, and the email has never had a design pass; it is the one piece of cairn UI
  that renders in an inbox next to professionally designed mail.
- **Pre-beta design: a keyboard-and-screen-reader walkthrough of the three core flows (Geoff,
  2026-08-01).** Sign in, edit-and-save, publish, run end-to-end the way an assistive-tech user
  experiences them. The per-pass a11y reviewer catches component-level issues; nobody has run the
  flows whole. One attended session with findings filed; the public beta is the forcing function.
- **Pre-beta DX: the zero-credential quickstart (Geoff, 2026-08-01).** The dev backend already
  lets the engine run without the GitHub App; verify the whole first-contact path (scaffold, local
  admin, edit, preview) closes with zero accounts, no GitHub App, no Cloudflare, no email sender,
  then make "try cairn in five minutes" the tutorial's first chapter with provisioning deferred to
  deploy time. Needs verification before documentation; nothing lowers adoption friction more.
- **Pre-beta DX: publish the surface snapshot as a machine artifact (Geoff, 2026-08-01).**
  `scripts/checks/api-surface.md` is already an exact, gate-enforced rendering of the whole public
  contract, precisely what an AI agent wants and cannot get from rendered docs. Ship it (or a JSON
  sibling) in the package or on the docs site; nearly free, and pairs with the filed `/llms` page.
- **Pre-beta DX: make the diagnostic pair consumer-complete (Geoff, 2026-08-01).** `cairn doctor`
  covers config and `cairn-audit` covers the design layer. What remains: verify `cairn-audit` runs cleanly from a consumer site (not only this
  repo), document the two as the first commands to run when something is wrong, and have the
  scaffolder's agent brief (`claude/CLAUDE.md`, which names neither today) tell the AI assistant
  to reach for them before guessing.
- **The public-repo hardening pass (the repo is already public; `main` protection and the history
  scan are the open work).** A real pass, not a settings toggle: a full git-history secrets scan (gitleaks/trufflehog — the loose `.pem` was shredded from
  disk but history was never audited); an exposure review of `docs/internal/` beyond staleness
  (machine paths, account and database identifiers, infrastructure detail — each gets a deliberate
  public/redact/archive ruling); fork-PR CI hardening (Actions permissions, `pull_request` vs
  `pull_request_target`, protecting the OIDC publish path from drive-by PRs); branch protection on
  `main`; the private-vulnerability-reporting toggle plus the SECURITY.md trim (the standing timed
  item); and the issues-on decision with a minimal triage posture. Widened (Geoff, 2026-08-01): the
  exposure review covers everything the flip publishes, not `docs/internal/` alone — the
  `docs/` plans, specs, and post-mortems (written candid, for an audience of us), the
  STATUS archives, and the repo `CLAUDE.md` — and one rule changes meaning at the flip: the docs
  register's never-name-the-ASC-site line currently binds only the published arms, a boundary that
  stops existing when the whole tree is public, so the internal arms' pervasive ASC naming needs
  its own deliberate ruling (scrub, prune, or keep), per arm.
- **The beta dress rehearsal (after the docs rewrite and scaffolder land).** One fresh-environment
  first-hour run: a clean machine or account, only the public docs and scaffolder, zero context,
  through to a deployed site with a working admin. Every artifact will have been individually gated
  by then; this tests the chain the way a beta user experiences it. A cloud agent runs the mechanical
  path and reports friction; the steps needing real accounts (Cloudflare, GitHub App) are a short
  attended session.
- **A second template: Topo, the documentation template.** Derived from Waymark and optimized for
  documentation sites: the sidebar concept tree, in-page table of contents, code-first typography,
  prev/next flow — the docs-site table stakes, curated with Waymark's restraint rather than
  exhaustively. Once Topo exists, cairn's own documentation moves onto it, so the engine publishes
  its own manual (the strongest dogfood available, and the standing proof that the docs-site use
  case is first-class). Inherits Waymark's component set and adds only what documentation demands. Gives the scaffolder its first real template
  choice.
- **The project sites: cairn.pub on Waymark, docs.cairn.pub on Topo (domain DECIDED 2026-07-02: cairn.pub, standard tier, registered via the dashboard since the Registrar API does not yet carry .pub; every single-word alternative was taken and the .pub TLD reads "publish", cairn's signature verb; the cairn.dev acquisition inquiry remains the optional endgame, yielding via redirect if it ever lands).** Two sites, not one, because
  a cairn site carries one design (one adapter, one `render`), so a combined site would compromise
  either the landing pages or the docs chrome. Each site is the living exemplar and standing dogfood
  of its template: the intro site is the Pages-plus-Posts shape cairn targets, and the click-through
  proof a prospective user sees before running the scaffolder; the docs site is the engine
  publishing its own manual. Subdomain-joined with shared header cross-links; Topo's Waymark
  derivation keeps the two reading as one property. The docs now render on cairn.pub itself (`/docs` and `/help`,
  shipped 2026-07-18 from the `0.87.4` in-package docs tree with TOCs and the anchor-compatibility
  gate); the remaining step is the docs.cairn.pub split when Topo exists, a migration of the
  already-portable pipeline, not a rebuild.

- **`/healthz` needs a check that reaches the repository, not only the signing key.** The gap is that the endpoint is named `healthz`, its top-level field is `ok`, and a
  site whose App installation has never carried its own repository answers `{"ok":true}` while
  every save and publish 404s. No preflight catches that case now: the retired npm doctor's
  `github.app` check did, and it was dropped rather than ported (ledger `doctor-drop-github-app`),
  while `cairn health`'s `publish-path` check reads branches and runs no App-installation check. Candidate: a second check that
  mints an installation token and reads the configured repository, reported beside
  `githubAppSigning` rather than folded into it, since the two fail for unrelated reasons and an
  operator wants to know which. Weigh the added latency and the GitHub rate-limit cost against
  making `/healthz` honest about the backend, and consider caching a success. This is the same wall
  the provisioning-script entry above names as non-provisionable (App creation and installation);
  the difference is that this one is about telling an operator the wall is still up.

- **`cairn-audit`'s rendered page-identity guard passes a route that renders an error page.**
  Surfaced 2026-08-05 by the `cairn-pub` migration, the same report. The guard compares a page's
  settled DOM against the identity its server-rendered response carried, which catches a route that
  hydrates into different chrome. It cannot catch a route that renders the same error page in both
  captures: on that run `/admin/signups` was returning the site's public error page under a valid
  session, the two captures agreed, every rule ran against the error page under the screen's name,
  and the run reported zero errors across all seven pages. The findings read as wrong only to a
  human scanning them (`header.site-header`, an accent-filled "Return to homepage"), which is the
  reading a gate exists to spare. Candidate: assert a 2xx response status on the no-JavaScript
  baseline capture the harness already takes, and report a non-2xx as a harness finding at error
  tier the way a stale allowlist entry is. The config docs already promise the run fails on "any
  configured page rendering outside 2xx", so this is closer to a defect than a feature; the case
  that escapes is a page whose framework answers 200 and renders an error boundary, which is
  exactly what SvelteKit did here.

- **A narrowed, manifest-backed resolver for `loadPreview` (filed 2026-08-06, preview pass).** The
  shipped v1 hands `loadPreview` the site's own `PublicRoutesConfig`, globbed build-time corpus
  included, so the never-prerendered preview route pulls that whole corpus into the deployed
  Worker bundle (roughly 1-2 MB at club scale against Cloudflare's 10 MB paid ceiling), a
  deliberate, stated v1 cost (Geoff, 2026-08-06). This would replace the bundled corpus with a
  request-time manifest read, restoring the corpus-stays-out-of-the-Worker invariant the rest of
  the delivery surface holds. **Trigger:** a real site approaching the bundle-size limit; the
  showcase's own bundle-size assertion (`examples/showcase`'s e2e build step) is the tripwire that
  should surface it.

- **A `cairn doctor` check that the preview route is not prerenderable (filed 2026-08-06, preview
  pass).** `loadPreview` itself throws a build-time error when a site lets `/preview/[token]`
  prerender, but that only fires on a build the developer actually runs locally or in CI. A
  file-only `cairn doctor` check (a candidate, needing a tool release) would catch the same
  misconfiguration as a preflight with a heuristic text read of the route files, the same shape
  as `admin.mount-shape`, rather than relying solely on the in-engine backstop.

- **An engine-level rate-limit seam for `loadPreview` (filed 2026-08-06, preview pass).**
  `loadPreview` currently calls no rate limit of its own; the guide's WAF-rule recommendation on
  `/preview/*` is the whole story until this lands. A seam accepting the existing
  `RateLimitLike` (the same structural interface
  `createSectionAction` already takes, degrade-to-open on an absent binding) would let a site wire
  a Workers `RateLimit` binding directly to the load, matching the engine's own idiom rather than
  leaning on the zone's edge rules alone. **Trigger:** real-world spray traffic against a deployed
  `/preview/[token]` route.

- **The refused-action editor cluster: four non-enhanced forms plus a shared announcement gap
  (docs friction log, triaged 2026-08-14; C2b review round).** Four admin forms still post
  full-page with no `use:enhance` (verified: `NavTree.svelte:53`, and the same pattern in
  `VocabularyAdmin`, `CairnTidySettings`, `ConceptList`'s create dialog), so a refused submit
  re-renders a fresh document and drops whatever the editor was mid-typing (a drag-reordered
  tree, an in-progress rename, an edited conventions block, the create dialog's typed
  title/slug/date); only `EditPage` survives this, by echoing the posted body back. The same
  four screens plus `ManageEditors` route their refusal through `aria-live="polite"`
  (`NavTree.svelte:131`, and the same pattern in the other four), while `EditPage` gives a
  refused submit its own assertive region (`EditPage.svelte:1834`) with no screen moving focus
  to the banner (WCAG 3.3.7 Redundant Entry (2.2), 3.3.1, 4.1.3, 2.4.3; ARIA APG). **Verdict:
  this earns its own small pass rather than riding an unrelated one.** The shared root cause
  (no `use:enhance`, so a refusal has no live-region-friendly mutation to announce and no state
  to preserve) means the two candidate mechanisms, `use:enhance` across the four forms or
  echoing the posted payload back per failure type, both close the whole cluster in one design
  rather than five piecemeal patches; picking one mechanism and applying it uniformly is the
  point. Pairs naturally with the pre-beta keyboard-and-screen-reader walkthrough above (Now),
  since the walkthrough would otherwise rediscover this defect live, and belongs before that
  session rather than after it. The refused-save frontmatter gap below is the same shape, one
  screen further along (`EditPage` half-fixed already); fold the two into one pass if the
  sequencing allows.

- **Pre-existing security findings outside the C2b refusal-channel diff (docs friction log,
  triaged 2026-08-14; found by the C2b review round, security MEDIUM 5 and LOW 9).**
  `editLoad`'s `?new=1` create-dialog seed renders an attacker-crafted query value to a
  signed-in editor: `content-routes-entry.ts:519` still seeds `seededTitle` straight from
  `event.url.searchParams.get('title')?.trim()` with no bound, while the sibling `?date=` field
  right beside it (`:524`) is correctly regex-bounded. Svelte escapes the render, so this is
  not XSS, but it is a form field and heading rendering arbitrary attacker text to whoever
  clicked a crafted link. Candidate fix: bound `title` the way `date` already is (a length cap
  plus a conservative character class), or move the create dialog's typed title into a
  short-lived server-side hold instead of the URL. Separately, a rename's 409 conflict still
  lists every open branch's `concept/id` with no access check:
  `content-routes-entry.ts:1370-1371`'s conflict-branch index filters only
  `row.origin.kind === 'branch' && row.origin.branch !== ownBranch`, with no `canReach` filter,
  unlike `publishAllAction`'s own index for the same underlying data (`:1056`), which does
  filter. A role denied a concept still learns that concept has an in-progress, unpublished
  entry and its id. Candidate fix: filter the conflict-branch index through
  `canReach(runtime.access, editor, row.concept)` the same way `publishAllAction` already does,
  collapsing an unreachable branch to a bare count. Neither is urgent (both pre-existing, low
  and medium severity, no known exploitation), so they file together for whoever next touches
  `content-routes-entry.ts`'s create or rename paths.

- **`create-cairn-site` hardening candidates, re-triaged (docs friction log, triaged
  2026-08-14; the T2 review's unverified tail, re-verified against current code since the
  entry's own trigger — "the next pass touching `src/github/`" — had already fired twice with
  no action).** Five items are still live, verified against the
  code as it stands today: (1) the loopback receiver still accepts any hit on a watched
  pathname with no validation that it looks like the expected redirect, and does not re-arm
  after a bogus hit consumes the wait (`oauth.mjs`'s `reauthorize` makes exactly one
  `waitFor('/callback', ...)` call and throws outright on a state mismatch rather than
  re-arming); (2) `verifyInstallationCovers` (`repo.mjs:106`) still destructures `{ json }`
  with no status check, so an auth failure on the covers-check GET reads as "not covered"
  rather than "could not check," and it still does not paginate past the first page of
  `/user/installations/{id}/repositories`; (3) `saveSite` (`state.mjs:55-61`) still writes the
  App PEM with a plain `writeFile` followed by a separate `chmod`, leaving a brief window where
  an overwritten record is more permissive than 0600; (4) `CAIRN_GITHUB_API_BASE` and
  `CAIRN_GITHUB_WEB_BASE` (`api.mjs:20,29`) are still honored unconditionally, with no
  `NODE_ENV=test` gate distinguishing the test seam from a hostile environment variable; (5)
  several inner error messages still leak a raw HTTP status code into user-facing copy
  (`chapter.mjs:388`, `chapter3.mjs:1017`, `repo.mjs:82`, `manifest.mjs:202`, each interpolating
  `status ${status}` into the thrown message). **Trigger, deliberately not "the next pass that
  touches these files" again: before T5a'/the public template repo and Deploy button ship**,
  since that is when this tool's exposure changes from a controlled, dogfooded rollout to
  strangers running it unsupervised against their own GitHub and Cloudflare accounts, which is
  exactly the threat model these five items assume.

- **The shell decides which chrome to render by parsing a pathname string, and is silently wrong
  off the shape it expects (docs friction log, live-reproduction seam harvest, 2026-08-18).**
  `isDeskRoute` wants exactly three segments with a declared concept in the second. Off that path
  it renders office chrome instead: the sidebar breakpoint moves, the narrow band compaction stops
  applying, and the theme toggle stops folding away. Nothing warns. The seam had to freeze a
  fixture pathname to keep three stories from quietly picturing the wrong layout, and a site
  adding a screen at a path of its own choosing gets whatever the parse happens to yield. A custom
  screen has no way to state which chrome it wants. It bites the first extender who mounts a
  custom screen through the documented `CairnAdminShell` seam at a path `isDeskRoute` does not
  expect.

- **Two components seize the page in ways an embedding host cannot undo (docs friction log,
  live-reproduction seam harvest, 2026-08-18).** `TidyReview` calls `showModal()` at mount, which
  pulls the host page's focus into the reproduction, and the HTML inert algorithm exempts the
  topmost modal dialog from an ancestor's inertness, so no wrapper can contain it. Separately, the
  command palette binds its shortcut through `svelte:window`, and `inert` does not remove a window
  listener, so an inert reproduction still answers Ctrl+K. Both are fine for a component that owns
  its page and hostile to one that does not. The reproduction seam no longer suffers either:
  `ReproContext` marks an opening dialog inert and firewalls five window event types from its own
  instance body. That is containment from outside, not consent from the component, so the engine
  question stands for any other embedding host. Whether a component can be asked not to grab focus
  or global keys is still unanswered.

- **`cairn health` does not name the one failure mode the Builds chapter was built around (docs
  friction log, backfill mining, 2026-08-18).** The scaffolder's own README documents that
  revoking or rolling the build token breaks push-to-deploy silently, and says plainly that this
  is not hypothetical because a consumer cairn site was found in exactly that state (STATUS
  hand step tracked 907-life's deploys as broken since 2026-07-14). `cairn health`'s `deploy`
  check (`tool/internal/health/check_deploy.go`) covers part of it: a failed last build reports
  `deploy.build-failed`. It reads no build-token state, though, and a default branch ahead of the
  last successful build is only a `behind` field on an OK verdict, so a token failure that stops
  builds from running reads green. Candidate: have the `deploy` check report `behind` as a
  warning past a window, or read the token's state directly. A scheduled routine is the tripwire
  that would actually catch this in production, not a dashboard an admin has to remember to open.

- **The bootstrap sign-in hand-copies the engine's token contract, and its test is a closed loop
  (docs friction log, backfill mining, 2026-08-18).**
  `packages/create-cairn-site/src/cloudflare/bootstrap.mjs:19` redeclares `TOKEN_TTL_MS` as a
  literal and `:95` re-implements the token hash, each pointing at `src/lib/auth/crypto.ts` in a
  prose comment. The round-trip test hashes the CLI's token with the CLI's algorithm and compares
  it to the CLI's own SQL, so it stays green if the engine changes either. The fix is a
  cross-package contract test, run from the CLI's own suite against the engine's real
  `src/lib/auth/crypto.ts`, so a drift between the two fails loudly instead of passing a closed
  loop.

- **A revert refusal blames the editor's own entry for someone else's publish, and nothing counts
  how often it happens (docs friction log, backfill mining, 2026-08-18).** The staleness
  comparand's breadth is ratified spec and stays closed; this entry is only the two things it did
  not settle. `CairnHistory.svelte`'s refusal reads "The history changed since this page loaded.
  Reload and try again.", written as though the editor's own entry moved, when on this design the
  ordinary cause is an unrelated entry being published; the copy should name that. And the
  deferral's condition, a future refinement if editors hit it, has no detector: `history_stale` is
  not in the log event vocabulary (see `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/log-events.md`), so the trigger can only
  ever arrive as a verbal report today.

- **No `cairn-text-error` utility exists, so error ink is inconsistent across the admin (filed
  2026-08-27, toolkit-seams fix round; promoted from the friction log at the 4b close).** The
  toolkit-seams pass migrated the warning bracket form (`text-[var(--cairn-warning-ink)]`, 27
  sites) to the new `cairn-text-warning` utility and the two positive-ink bracket sites
  (`text-[var(--color-positive-ink)]`) to `cairn-text-success`, but left the error ink on the
  bracket form: 33 in-tree sites still write `text-[var(--cairn-error-ink)]` directly
  (`CairnMediaLibrary.svelte`, `VocabularyAdmin.svelte`, and others). Decision owed: add a
  matching `cairn-text-error` utility, or explicitly bless the bracket form for error ink in
  `admin-grammar-tokens.md`. Trigger: the next admin-grammar-tokens pass, or the next component
  that needs error-ink styling and has to choose which form to copy.

- **`isUniqueViolation` in `/cloudflare` is deferred, not dropped (toolkit-seams pass, former
  Task 7, 2026-08-26; promoted from the friction log at the 4b close, since the plan's own
  intent to record the defer in `docs/internal/engine-rulings.md` was not actually carried out
  at pass close).** Four divergent site copies of a D1 unique-violation matcher motivated the
  proposal, but the membership case did not clear the gate at review: the Cloudflare-specific
  content is the workerd cause-chain nesting alone, four divergent copies in ONE consumer is the
  `site-today-export` decline's own shape, and the engine itself never handles `UNIQUE
  constraint failed` today, so shipping it would have been a fifth engine-unused export (C13).
  The shape is right if it reopens: a type predicate, `is`-prefixed, structure not vocabulary.
  **Reopens on:** a second unrelated consumer hitting the cause-chain nesting, or the cheaper
  decisive check: an engine-side D1 path that can raise a UNIQUE violation and mishandles it
  today (candidates: the `AUTH_DB` editor/invite inserts, `createD1AuditSink`); if one
  qualifies, the engine becomes its own first consumer and the item clears both the gate and
  C13 in one move.

## Later

- **`tool/internal/health` carries package debt (the harvest's close Go read, 2026-09-30; all
  predating the harvest).** The Go architecture read graded it sound with nits.
  `Options.Validate` and `ActorProviderConsole` are exported with no outside caller. The three fix
  tables are walked by hand in three places, and the anchor and actor tests skip `fixesByReason`;
  one `allFixes` iterator would cover all three. `check_creds.go:143-144` prints a raw Reason code
  where `ReasonPhrase` exists. The repo-not-recorded outcome is written three times, and `hasRepo`
  and `DefaultBranch` live in `check_deploy.go` though three checks share them. The zone-read
  block repeats in `check_delegation.go`, and about thirty zero-argument message functions could
  be consts. `diagnoseUnreachable`'s `budget` and `probeServing`'s `domain` are test-only seams.
  Comment density runs 0.49 against `go/build`'s 0.37 (dated incident narratives, per-function
  catalogue citations, rebuttals of designs nobody wrote). Trigger: the next tool pass that
  edits `tool/internal/health` for its own reasons.

- **`viewport-overflow`'s settle check waits the full 500 ms on a page with a scroll-driven
  animation (0.98.0 cut).** A page carrying `animation-timeline: scroll()` keeps an animation
  running and finite, so the settle check never sees the page go quiet and every finding on such a
  page carries the "may be transient" suffix. Fix: exclude animations whose timeline is not a
  `DocumentTimeline` from the settle check. Trigger: a consumer reports the noise.

- **`rounded-t-full` and the other side forms of `full` pass `radius-scale` silently on a `badge`
  (theme identity pass B, 2026-09-29).** The rule flags `rounded-full` on an element that carries
  `badge`, but only the whole-corner form; a side form of `full` falls through. No plan decision
  names it, so no behavior changed. Fix: extend the `FULL_TOKEN` arm in
  `src/lib/audit/rules/static/radius-scale.ts` to the side forms. Trigger: the first real
  `radius-scale` run over a consumer site that shows one, or the `0.99.0` promotion, whichever
  comes first.

- **Let an owner restrict the media purge alone (Geoff, 2026-09-29).** The media library's orphan
  scan and bulk purge sit behind the same `media` engine access as the rest of the library
  (`requireEngineAccess(runtime.access, editor, 'media')` in
  `src/lib/sveltekit/content-routes-media-library.ts:67`). Geoff's ruling: editors keep the purge
  by default, which suits the small, informal organizations most cairn sites serve, but an owner
  should be able to restrict that one operation. Today the only lever is restricting all of
  `media`, which also takes uploading and editing images away from editors. The leanest form is
  probably one narrower key in the access map that covers only the purge and defaults to the
  same roles as `media`. It is an authorization change, so the pass that builds it runs as
  `auth-data`, with the security review and a live sign-in smoke. Trigger: a site asks to restrict
  the purge, or the pre-1.0 authorization review. Found by the draft docs harvest's editors sweep.

- **Move pinned unlayered rules 1 to 9 into the `cairn-idiom` sublayer (theme identity pass A,
  2026-09-28).** Pass A moved rules 10 to 14 into `utilities.cairn-idiom` and retired their pins.
  Rules 1 to 9 stay pinned and unlayered in `src/lib/admin/cairn-admin.css`; rule 2, the
  guarded-button rule, stands under the timing-scoped reading of decision 4
  (`docs/internal/engine-rulings.md`, `motion-conform-to-daisyui-conventions`). Moving the rest is
  a ratchet shrink: each move takes an entry out of `unlayeredAllowlist` in
  `scripts/checks/custom-surface-budget.json` and needs its own full-state test. The nine
  comments still count "of 14"; renumber them in the same pass. Trigger: a pass that edits one of
  those rules, or the pre-1.0 CSS audit.

- **Retire `ADMIN_CSS_SAFELIST` (theme identity pass A, 2026-09-28).** The admin build now compiles
  every daisyUI class except calendar, so the list in `src/lib/admin/admin-css-safelist.ts`
  no longer decides which daisyUI classes ship; its own header says it stays only as a grouped,
  explained vocabulary. Retire it, or reduce it to the non-daisyUI names it still documents, and
  move the explanation to `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/admin-toolkit.md`. Trigger: pass B's rename of
  `src/lib/components/` to `src/lib/admin/` (the file moves anyway), or the next pass that edits it.

- **Five small simplifications the pre-cut dependency sweep found and filed, none taken (Task 1,
  2026-09-20).** Ruling 3 defaults every survey finding to "file" unless it is zero-behavior-change
  with an existing test; none of these five qualified. (1) `ManageEditors.svelte:169-174`'s
  per-option `selected={entry.role === 'editor'}` boolean can become Svelte 5.57's `defaultValue`
  on `<select>`. (2) `MediaOrphanTools.svelte:55-79`'s imperative DOM-property indeterminate
  checkbox has no ARIA mirror; DaisyUI 5.7.25 added native `aria-checked="mixed"` styling it could
  adopt. (3) `packages/create-cairn-site/src/cloudflare/prefill.mjs:265-289`'s manual two-try
  Cloudflare token prompt could use `@clack/prompts` 1.8.0's async `validate` callback, keeping
  the deliberate one-retry ceiling via an explicit attempt counter. (4) `Pagination.svelte:97-101`'s
  manual `btn-active` class alongside `aria-current="page"` is now redundant with DaisyUI 5.7.38's
  native `[aria-current]` styling; dropping it needs a visual-baseline read first. (5) The nav
  `<details>`/`.cairn-caret` groups in `CairnAdminShell.svelte` (documented at
  `admin-design-system.md:369-374`) could become DaisyUI's `collapse`/`collapse-arrow`; cosmetic
  value only. **Trigger:** the next pass that touches any of the five named files.

- **The reference track has no dedicated page for the `./admin-sources.css` subpath export; it gets
  one section inside `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/cairn-audit.md` instead (extend-2 friction, 2026-09-20).**
  The reference coverage gate read only `.d.ts`-typed exports, so a CSS-only subpath is not
  gated either way; grouping the admin-sources documentation with the audit config it feeds is a
  legitimate reading of the reference arm's page structure, not a known bug, but the docs rebuild
  is the point where the arm's page-per-subpath convention gets a deliberate read. Trigger: the
  docs rebuild's reference-arm pass.

- **The showcase's own public route map is written nowhere a plan author reads (extend-1,
  2026-09-20).** extend-1's stylesheet-seam proof was planned against a `/posts` archive route the
  showcase does not serve; it serves `/` and `/archive/[page]`, which cost a fix round to discover.
  Candidate: one sourced statement of the showcase's public routes in the showcase README, so a plan asserts against a read statement rather than an assumed convention. Trigger: the next pass whose
  proof or e2e spec asserts a showcase public route.

- **Carbon for AI's label-plus-explainability pattern on the Tidy surface (filed 2026-09-13
  from the Carbon AI-tooling survey).**
  cairn's in-buffer Tidy copy-edit and the `CairnTidySettings` screen show AI-touched content
  with no visual marker and no "how was this built" affordance; Carbon for AI's pattern (a label
  on AI-generated content plus an explainability disclosure) is the conventional answer and
  copies as a design pattern, never a package. The survey rules out Carbon's MCP server, its
  docs skill, `carbon-ai-chat`, and its `llms.txt` (Carbon's own component vocabulary, or
  chat-widget products outside scope) and keeps `stylelint-plugin-carbon-tokens` watch-only, since
  `cairn-audit`'s token rules already do the same job. **Trigger:** the next pass that touches
  the Tidy surface, or the docs rewrite reaching the AI posture page.

- **The bracketed fill-tone population outside `check:custom-surface`'s reach (polish-11b-i,
  2026-09-13).** The admin tree's `retiredTokenPattern` in
  `scripts/checks/custom-surface-budget.json` only matches `--color-muted` and `--color-subtle`
  wrapped in a bracket utility or an inline style, so it cannot prove a bracketed
  `var(--color-*)` fill tone anywhere else is retired. Widening the pattern to every
  `--color-*` fill tone, measured with the budget file's own regex shape
  (`\[[^][]*var\(--color-[a-z0-9-]+\)[^][]*\]|style="[^"]*var\(--color-`) over
  `src/lib/components/*.svelte` and `src/lib/admin-toolkit/*.svelte`, flagged **27 lines (41
  occurrences) across nine files** at this pass's parent commit, before Task 9 converted
  `LoginPage`'s own bracketed success token onto a named utility. At this pass's head the
  population is **25 lines (38 occurrences) across eight files**: `CairnTidySettings` 1,
  `ComponentInsertDialog` 2, `EditPage` 2, `MediaBulkDeleteDialog` 2, `MediaHeroField` 8,
  `MediaOrphanTools` 5, `RepeatableField` 2, `TidyReview` 3. **Trigger:** a pass willing to widen
  `retiredTokenPattern` to the full `--color-*` family and convert this population onto named
  utilities the way `LoginPage`'s own success token converted in polish-11b-i; until then the
  gate proves only the two tokens it already covers.

- **The 317-comment register sweep over the engine's own admin components.** Polish-11a's
  Svelte lint wiring brought `src/lib/components/**/*.svelte` under the same `check:comments`
  parser the showcase already carries, so the file family's roughly 317 comments are parsed for
  the first time; `jsdoc/informative-docs` (the paraphrase-tell rule) reports zero warnings
  against that population today, so there is nothing the gate can flag toward this sweep.
  **Trigger:** the population is now newly parsed and has never had a register-quality read;
  no `jsdoc/informative-docs` warning count will move to signal that a read is due.

- **Make the local showcase e2e render match the CI runner (Geoff, 2026-09-09).** After a CI
  baseline regen, this workstation's Chromium renders home and archive2 a few pixels off (the 20
  files in `4de378ec`), so every local gate reports those failures and needed a ruling
  to pass. Pin the local Playwright Chromium build and font set to the runner's, or run the e2e
  in a matching container, so local baselines are canonical again. Chore, not a pass; the gotcha
  is recorded in `CLAUDE.md`.

- **The resize stopper (cut from the admin motion language pass, 2026-09-15).** The published
  motion language's resize backstop, suppressing motion while a resize or drag is in progress, is
  cut from that pass: its specified form is a no-op, since a class on the bare `data-theme`
  element never matches the admin sheet's `:where([data-theme]) .thing` scoped rules and
  `transition-*`/`animation-*` properties don't inherit, so even a matching rule on that one
  element would suppress nothing on the drawer or the sidebar. Its working form is a universal
  descendant rule in the reduced-motion block's own shape, which is unlayered and costs one
  `unlayeredAllowlist` entry, a budget cost the motion pass declined everywhere else; the
  components layer measured 19 selectors against a `componentsLayerCap` of 19 at that pass's
  head, so the specified form had no room either. What holds the resize case meanwhile: every
  layout property in the admin is on the motion language's named-error list, so a resize snaps
  structurally, and the one residue is DaisyUI's own drawer transition running at the breakpoint
  flip (recorded as a vendor disagreement, not fixed). **Trigger:** a pass willing to spend one
  `unlayeredAllowlist` entry to suppress the drawer's transition at the breakpoint flip, or a
  `componentsLayerCap` increase that gives the layered form room.

- **The second-menu editing question (chassis-B2 harvest, engine consultation candidate).**
  `/admin/nav`'s `createNavRoutes` binds to one menu (`menus.primary`); chassis-B2 moved the
  showcase's footer nav to `site.config.yaml`'s `menus.footer` as a developer-edited yaml block
  rather than a second admin-editable menu, since no site has asked to edit a second menu from
  `/admin` yet. **Trigger:** a consuming site asking to edit a second menu in the admin UI.
- **An engine-shipped Cloudflare Access verifier**, replacing the recipe the extend track carries in `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/extend/replace-magic-links-with-cloudflare-access.md`
  (`docs/internal/engine-rulings.md`'s `identity-seam-access-verifier` row, declined for now).
  **Trigger:** a second consumer hand-rolling this verifier, an engine-internal consumer of it,
  or an evidenced defect in a family site's own resolver.
- **Group-to-role mapping for the identity seam.** `IdentityResolver` resolves an email today;
  a resolver that also reads its gate's group or claim membership and maps it to a cairn role
  would let a site skip roster maintenance for role assignment, but no consuming site needs it
  yet. **Trigger:** a consuming site that needs group-to-role mapping.

- **Three pieces of engine hygiene the reproduction seam surfaced, none urgent.** `CairnAdminShell`
  writes `<svelte:head><title>`, which is harmless while every reproduction is iframed and would let
  the last-mounted story overwrite a docs page's own title if one were ever mounted inline; the
  reference page should say `ReproContext` belongs in its own document, or the shell should guard it.
  The `editor/toolbar` story's
  `createRawSnippet` transcription wraps its buttons in a `<span style="display:contents">` the real
  toolbar does not have, which is a structural divergence in a file whose whole purpose is fidelity
  and will trip a strict `style-src` CSP on a docs origin. And the story-mount harness pins only the
  first width a manifest entry declares, so a two-width row is proven at one of its two faces by the
  universal contract; the second face is covered today only by a bespoke test.

- **Motion in the docs visual layer, ruled out 2026-08-15 with a named revisit trigger.** The
  visual-layer sitting (https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-15-docs-visual-layer-rulings.md, ruling 5)
  decided the layer ships static: motion assets are the highest-maintenance surface class the
  research studied, and no page contract fails without them. **Trigger:** the editors track
  rewrite, running against the built live-reproduction seam, finds a page where a static
  reproduction demonstrably cannot carry an interaction that matters; the known candidates are
  the Tidy review flow and the figure dialog's cursor-dependent button label. If adopted, the
  form is already banked in the ruling: silent, looping, fluid-width, per-claim, generated from
  the seam against fixture data and pinned to the engine version, never a hand-recorded video.

- **`check:symbols` spawns a `grep` per environment-variable token, and the cost scales with the
  corpus (filed at Pass D Task 10, 2026-08-14).** `envVarInSourceTree` in
  `scripts/checks/check-symbols.mjs` shells out to `grep -rl` once per distinct token, memoized
  within a run. That was cheap over 27 files in Phase 1 and takes about 33 seconds over the 74
  the rebuild ships, which crossed vitest's 30-second default and made
  `src/tests/unit/check-symbols.test.ts` fail on wall-clock rather than on a finding. The test
  now carries an explicit 120-second ceiling, so this is a cost rather than a break, paid twice
  per CI run (once in the suite, once in the gate). The fix is to read the searched tree once
  into memory and resolve tokens against a set, which removes the subprocess entirely. Pass D
  declined it deliberately as adjacent scope rather than folding it into the cutover.
  **Trigger:** the gate passing roughly 60 seconds, or the published corpus growing past about
  120 files.

- **`check:snippets` stubs every `$`-prefixed and relative doc-snippet import specifier to `any`
  (docs friction log, triaged 2026-09-05).** `scripts/checks/check-snippets.mjs` (around :63-66)
  can never catch a wrong adapter path or a misspelled relative import inside a documented
  snippet, since it never typechecks either kind of specifier against a real module; the
  `internals` pass's `cairn.config` spelling misses were invisible to it for exactly this
  reason. Fixing it means resolving `$lib`/`$app`/relative specifiers against the doc's own
  declared project context rather than stubbing them, a real design question this filing does
  not answer. **Trigger:** a doc snippet with a wrong adapter or relative import ships again
  undetected.

- **`check:idioms` walks `src/lib` only (internals-C pass, filed at its 2026-09-04 close).**
  `scripts/checks/check-idioms.mjs:437`'s tab-indentation, exit-idiom, and comment-register rules
  never reach `scripts/`, `examples/showcase/`, or `templates/waymark/`; the pass purged all
  three by hand rather than gating them, so they can silently drift back to the patterns the
  gate exists to ban. **Trigger:** a hardening pass widens the gate's scope to those three trees,
  or a drift is caught by hand in one of them.

- **`CairnAdmin`'s `form` prop is typed as a failure envelope, but SvelteKit hands it whatever
  the last action returned, successes included (docs friction log, triaged 2026-08-14).**
  `ContentFormFailure` (`content-routes-shared.ts:37-56`, a flat interface with every field
  optional) models only the content actions' `fail()` payloads; SvelteKit's generated
  `ActionData` unions every action's awaited return regardless of arm,
  and the assignment type-checks today only because every failure-payload field name happens to
  differ from every success-payload field name. C2b's refusal-channel pass hit this directly:
  sharpening every `fail()` from `ActionFailure<unknown>` to a precise `ActionFailure<T>` turned
  that previously-masked union into a real structural check, and `TidyResult.usage` (token
  counts) collided with `MediaDeleteRefusal.usage` (where-used rows), failing every consumer's
  `svelte-check` on upgrade until the field renamed to `TidyResult.tokens`. A new action whose
  success payload shares a field name with any action's failure payload reproduces this, with no
  warning until a consumer's own build. A type-level assertion in `src/tests/component/CairnAdmin.test.ts`
  now catches a same-repo recurrence at compile time, but the structural gap in the prop's own
  type is unrepaired. Candidate fix: type `form` to model both arms honestly, for example a
  discriminated union or a generic keyed by the last action name, rather than one merged
  failure-shaped intersection.

- **`createD1AuditSink` cannot join a caller's `db.batch()`, so an operation whose audit row
  has to be atomic with the write it describes still hand-rolls its own insert (docs friction
  log, triaged 2026-08-14).** `createD1AuditSink` (`sveltekit/audit-sink.ts:92-158`) still
  builds and dispatches its own `prepare().bind().run()` internally with no way for a caller to
  get the bound `D1PreparedStatement` for its own batch. The sink is fire-and-forget by
  contract, returning before the insert settles, which is exactly what makes it safe to call
  from `createAdminAction` and fail-open, and it is also what puts it out of reach of a transaction.
  On `aksailingclub-org`, the first site to adopt it, four operations (the season rollover, the
  signup statements, two enrollment writes) correctly kept their own insert, because a batch is
  the only way to make the audit row and the write it describes succeed or fail together.
  Candidate fix: export the statement half the sink already composes, a builder returning the
  bound `D1PreparedStatement` for a record, so a caller can push it into its own batch and
  still get the packaged column mapping and truncation; the sink itself then becomes that
  builder plus the fire-and-forget dispatch. Not urgent: the admin path the seam was built for
  fits without a workaround, and the hand-rolled inserts beside it are correct. **Trigger:** the
  same need from a second consumer site.

- **The design spec's "reverted content is validated" paragraph names link/include drift as a
  revert advisory, but the shipped advisory covers only retired fields and retired vocabulary
  tags (docs friction log, triaged 2026-08-14).** [The design
  spec](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-08-06-history-revert-preview-design.md) (Part 2, "Reverted
  content is validated, warn-not-refuse") lists three things an old version can carry that the
  current schema no longer recognizes: retired frontmatter fields, removed vocabulary values,
  and "links or includes to since-deleted targets." `revertSchemaDrift`
  (`content-routes-entry.ts:288-299`) still builds only the first two into
  `retiredContentAdvisory`; a reverted version whose body links or `::include`s a target
  deleted since that version was published gets no warning at revert time, and the dangling
  reference surfaces only at the next build's `verifyReferences` gate or as a live 404 if the
  editor publishes without rebuilding locally first. The scope-out was deliberate, not an
  oversight: `revertAction` already reuses save's `draftLinks`/`referenceWarnings` machinery for
  the *current* manifest, and wiring the same body-link and reference-edge scan against the
  *reverted* version's own content, before the branch exists to scan, was judged a larger,
  separable change. Candidate fix: run the same `extractReferenceEdges`/body-link scan save
  already does against the parsed old version inside `revertAction`, folding any absent or
  draft target into the same advisory channel. **Trigger:** the next time an editor hits this
  in practice.

- **The Go successor tool: a dependency-free binary that is engine and console both (Geoff,
  2026-08-13; pre-design banked).** A single downloaded Go/bubbletea binary succeeds the Node
  `create-cairn-site` CLI post-1.0: it orchestrates the whole install locally as bare REST
  (Builds-first, so no local Node is needed to put a site live), and it is a standing console
  over every site the machine knows: parks held as ambient waits, in-tool resume, doctor, log
  tailing. The pre-design, with the full decision record (why successor rather than protocol
  frontend, the Node-TUI option declined on taste not capability, the parity contract via the
  language-neutral fixture corpus, poplar's three-layer shape) is
  `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-08-13-go-successor-tool-design.md`. Sub-project 2 is provisioning, adopt-to-manage, infra and auth-store settings including user
  management, the `go:embed` bake, and distribution; sub-project 3 is upgrades over P9, ordered
  rollout, upgrade rollback, deploy rollback, and repo-held settings. 

  **Rider: the admin track's missing update page arrives with the upgrade verb (filed at Pass D
  Task 14, 2026-08-15).** Pass D killed `maintain-your-site` from the admin outline because the
  track has no way to tell a non-developer how to move their site to a new cairn version: today
  that is a terminal task the admin cannot do, and a page describing it would either teach the
  extend track's job or describe a verb that does not exist. When the Go tool grows its
  cross-site upgrade verb, that page becomes writable, and it should be written in the same pass
  as the verb rather than filed forward again. Its precondition is P9, the machine-readable
  `Consumers must:` contract the verb reads.

- **Undelete a recently-deleted entry (filed 2026-08-06, history/revert design sitting).** History
  and revert both deliberately leave a deleted entry out of scope: `historyLoad` answers a 404 for
  one exactly as `editLoad` does, so nothing in the admin can name a deleted id to restore it, and
  the escape hatch today is a developer reading git directly. Undelete needs a surface this repo
  doesn't have yet before it can exist at all: some way for an editor to see, and choose from, a
  concept's recently-deleted entries, since a delete's commit removes both the manifest row and the
  file, leaving nothing in the live corpus a screen could list. That recently-deleted surface, its
  retention window, and how it's populated (a bounded read over the manifest's own git history, a
  soft-delete flag, or something else) is itself a design question, deliberately left open rather
  than answered here; it wants its own sitting once a real request for undelete lands, the way entry
  history's own promotion did.

- **A passkey layer on the auth-channel session model, post-1.0 (Geoff, 2026-08-04).** Returning
  members authenticate with a passkey instead of a fresh code, layered on top of
  `createAuthChannel`'s existing session model rather than replacing it: passkeys cannot replace
  the code channel outright, since enrollment and account recovery both still need the
  roster-contact bootstrap the code flow already provides. The `cairn_channel_code` table's `kind`
  column (currently always `'code'`, and `AuthChannelConfig.kind` already rejects any value but
  `'code'` at construction) is the seam this layers through: a `'passkey'` kind on the same tables,
  the same session issuance, the same revocation. Not before 1.0, and not without its own design
  sitting and adversarial review rounds first, the same discipline the code-channel design went
  through (three rounds, v1 through v3.1) before its first implementer dispatch.

- **A packaged component-authoring skill, once the template track supplies the evidence (Geoff,
  2026-08-01; no hurry).** Nothing
  covers the other authoring task a consuming site repeats: defining a content component with
  `defineComponent`, its directive syntax, and the `hydrate`-plus-`rendering.islands` pairing for the
  interactive kind. The extend track carries the mechanism (`write-a-markdown-component` and `add-an-island`), and `defineComponent` is in the core reference, so a
  skill written today would mostly restate those pages, and a skill that restates docs is a second
  copy of one contract that drifts. **The trigger, not a date:** the Waymark rebuilds, Topo, and the
  scaffolder each define components next. Harvest the friction from those, and if the same judgment
  calls recur across them (static versus hydrated as the default, directive naming and attribute
  conventions, how a component behaves in the editor preview under the one-renderer rule, the design
  tokens a component is expected to reach for), that recurrence is both the skill's content and its
  justification, the same way `cairn-building-admin-screens` was born from measured admin-screen drift rather
  than from anticipation. Write it against the same constraints: the always-loaded core stays inside
  the `check:package` token budget, and it points at the docs and `cairn-audit`'s mechanical checks
  rather than restating them. If the harvest shows no recurring judgment call, that is a real answer
  and the entry closes unbuilt.
- **Field-label weight: cairn's 500 vs the consumer ruling's 600 (a design ruling, from the
  friction log 2026-07-29).** The form-anatomy contract keeps `font-medium` (500) as cairn's
  individual-field-label weight, matching the dozen-plus existing call sites, while the consumer
  site's own ratified two-level label ruling uses 600. Whether cairn's field labels bump to match
  is a rendered-probe-plus-eyes-on ruling for whichever admin design pass next opens; reweighting
  moves pixels sitewide, so it never rides another pass's baseline regeneration silently.
- **An engine-side design dev loop (`design:dev` or an optimizeDeps exclusion).** Engine admin
  work breaks the 0.84.0 minutes-per-turn design loop: after `npm run package`, vite's client dep
  optimizer serves a stale pre-bundled shell (SSR reloads fire, the client bundle does not), so
  every component-edit iteration needs a `--force` dev-server restart (~10 rounds of it during the
  2026-07-15 design arc). Candidates: the showcase's vite config excludes the linked package from
  optimizeDeps, or a documented `design:dev` script that watches `src/lib` and repackages +
  restarts. The consumer-site loop is unaffected (site source HMRs directly).

- **`sizes` breakpoints are generic constants** (from the friction log, Waymark final review T4b,
  2026-07-17). The engine's srcset `sizes` emits 800px/1200px, matching the built-in preset
  magnitudes rather than any theme's actual measure; a mismatch costs only srcset-candidate
  efficiency, but a theme with a very different measure may eventually want a seam.
- **`AssetConfig.transformations` doctor corroboration check.** `transformations` is a self-declared
  flag on `AssetConfig` (default `false`); nothing in the engine verifies it matches whether
  Cloudflare Image Transformations are actually enabled on the zone, so a site that flips the flag
  without enabling the feature (or vice versa) gets silently wrong image URLs instead of a build-time
  or preflight signal. A `cairn health` check (a candidate) could corroborate the declared flag
  against a live probe of the zone.
- **Nested-image delivery: seo and needs-alt.** Allow `seo: true` on an image inside a top-level `object`
  (phase 3a forbids it because `seo-fields.ts` reads a hardcoded key list, not the schema), and surface a
  nested image's missing alt in the editor's needs-alt advisory (3a's notice enumerates top-level images
  only). Both unlock when delivery seo resolution walks the concept schema, a fit for the 3b concept work.
- **Details panel default-open heaviness.** The Details slide-over defaults closed and buries every non-title
  field as the vocabulary grows; phase 3a's repeatable rows collapse per row, but the panel itself is
  unrevisited. Look at its default and grouping now that containers add fields.
- **`itemLabel` as a function (concept-array editor with a live-row snapshot).** Phase 3c shipped the cheap
  half of the data-versus-behavior split: the per-field `behavior.validate` runs server-side through the
  unified `fieldset` validator for concepts and component attributes alike. The function-valued `itemLabel`
  was cut (3c plan A14): it must run client-side in `RepeatableField` as the author types, but the rows are
  intentionally uncontrolled (`row.value` is stale between edits by design, to avoid edit loss), so feeding a
  live `itemLabel(item, index)` the row's current values needs a per-keystroke row-input snapshot plus a new
  client behavior channel (a `CairnAdmin` prop and scaffolder wiring). A focused concept-array-editor pass can
  design that live-row snapshot properly. The string `itemLabel` (a sub-field key) still covers the common case.
- **Dedupe the leaf-field family's shared pass-through props, not the renderers themselves.** The
  code-polish pass's guarded rider (`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-07-01-code-polish-pass.md`, Task 7)
  wrote guard tests first
  (`src/tests/component/form-renderer-family-guard.test.ts`) covering both leaf-field dispatchers,
  then found the merge architecturally wrong on four separate walls the guards now pin: the binding
  model (`FieldInput` does native, name-carrying, uncontrolled form participation; `ComponentForm`
  does controlled state with inline touched-tracking), the field-type semantics each switch encodes
  differently for the same nominal type, the validation display (`FieldInput`'s native `required`
  plus an `aria-describedby` hint versus `ComponentForm`'s asterisk, `aria-invalid`, and a
  `role="alert"` error span with live values bound out for the dialog preview), and the phase-3a
  multi-instance focus model (`RepeatableField`'s uncontrolled rows must survive a sibling structural
  mutation without re-seeding, which a shared controlled renderer cannot preserve). A homogenizing
  merge fails the guard suite by design; per the rider's escape hatch, no merge landed. The
  duplication the original entry named is real but narrower than a full merge: `FieldInput.svelte`,
  `ObjectGroupField.svelte`, and `RepeatableField.svelte` pass roughly nine identical props straight
  through to their children (`mediaLibrary`, `heroFieldRefs`, `conceptId`, `id`, `targets`,
  `markFieldsDirty`, `onuploaded`, `onheroneedsalt`, and the field). Folding those into one shared
  field-context object (a prop or a context, not a merged component) is the accurate remaining
  refactor; the guard suite is the standing regression net for it.
- **Build-time icon-name validation against the set.** An icon value is a glyph name from the adapter's
  `rendering.icons`, but the `fieldset` validator only enforces required and non-empty (3c decision 1); it does
  not check the name against the set (the directive icon is not set-validated today either). A build-time check
  that a frontmatter or attribute icon name resolves in the declared set would catch a typo before delivery.
- **Empty-icon-set is a build-detectable config error.** A required `fields.icon()` field declared while the
  adapter ships no `rendering.icons` renders an unsavable picker with zero choices (3c A7). Detecting it
  needs the evaluated adapter, which `cairn doctor` never loads, so the home is a build-time engine check
  beside the plugin's `site-facts.json` verification, reporting the mismatch rather than leaving the editor
  stuck at runtime.
- **Editor-help later slices.** The screen-contextual slide-over, a route- and concept-keyed help-content
  registry, and a standing Help home with a labeled launcher.
- **Per-field advisory seam plus live slug recompute.** An editor-side advisory-validation surface, and a
  slug preview that recomputes as the author retypes.
- **`supportContact` personalization.** A richer shape than the current bare string, a name plus a
  contact, so a self-serve hand-off reads personally.
- **Remaining media work.** Media Pass D, plus the owed live bulk-delete admin smoke.
- **Small DX debt.** Give the component picker dialog a `sm:`-breakpoint bottom-sheet so it is not an
  unconditional `85vh` on a short viewport, and resolve the worktree dual vite/kit install collision
  (the showcase typecheck throws ~12 dependency-`.d.ts` errors under a symlinked-`node_modules` worktree,
  so the local consumer-build proof currently leans on the e2e build; CI's real checkout is clean).
- **A collapsed sidebar section holding the active route's link does not auto-expand.** Landing on a
  route whose nav entry sits inside a section the editor previously collapsed leaves that section
  closed, so the active link is present but hidden. Consider forcing the section open when one of its
  children `isActive`, without overriding a deliberate manual collapse of an inactive section. Review
  finding, 2026-07-14 nav-layout pass.
- **A refused save preserves the body but discards frontmatter field edits (updated with a
  code-verified finding, docs friction log, triaged 2026-08-14; supersedes the 2026-07-03
  framing below).** `ContentFormFailure` (`content-routes-shared.ts:37-56`) carries only
  `error`, `brokenLinks`, and `body` on a refused save, no frontmatter; `EditPage` reseeds the
  body through `form?.body ?? data.body` (`EditPage.svelte:147`), but every frontmatter field
  reloads from the stored record. Converting the save refusal from a `?error=` redirect to
  `fail(400, ...)` was meant to stop discarding an editor's work, and it half succeeds: the
  prose survives, the frontmatter does not. Observed directly: clearing Title and saving
  re-renders with the alert and the body intact, and the Title reverted to its committed value.
  The realistic cost is larger than that single case: an editor who retitles an entry, adds a
  tag that fails taxonomy validation, and saves loses the retitle while keeping the prose. This
  is strictly better than the pre-C2b behavior, where the redirect discarded everything, so it
  is an incomplete improvement rather than a regression. Candidate fix: add a frontmatter field
  to `ContentFormFailure` and reseed the fields from it, which also makes the failure shape
  honest about what it holds. The refused-action editor cluster above (Next tier) shares
  this same "no `use:enhance`, so a refusal loses state" shape one screen further along;
  consider folding the two into one pass.

- **Make required image and reference fields visible to constraint validation.** Both arms submit
  through hidden inputs, which the browser's constraint API ignores regardless of `required`, so a
  required hero image or author reference never trips the capture-phase invalid handler that
  reveals the Details panel; the failure surfaces only server-side. Needs an aria-invalid plus
  focus-target pattern threaded into `MediaHeroField`/`ReferenceField`, not a native attribute.
  (The closed multiselect's honest at-least-one signal, the sibling gap, shipped 2026-07-16.)
- **Remove the e2e suite's cross-spec pagination coupling.** The 2026-07-16 pass converted the
  seed-post convenience clicks to direct navigation, but the underlying class remains: specs
  accumulate entries against a paginated newest-first list, so any future list-click assumption
  re-inherits the fragility. A per-spec content reset, or a seed post dated in the future so it
  stays on page one, removes the whole class.
- **State a host can only reach by calling an instance method is state a host cannot pose (docs
  friction log, live-reproduction seam harvest, 2026-08-18).** `MediaInsertPopover` mounts headless
  and opens through an instance export, with no prop that drives the open state, so a declarative
  host has to synthesize a click instead of describing what it wants. `spellcheckOverride`'s double
  duty (one prop meaning both "start it off" and "the site owns this now") was raised alongside
  this and was decided already: accepted as shipped, with the resulting drift, if any, tracked in
  a reproduction's own caption rather than in a prop redesign.
- **No live run has ever taken an externally registered domain through zone creation (docs
  friction log, backfill mining, 2026-08-18).** `zone.mjs:30` still records that no such domain
  was observed going through `POST /zones`, so the branches that path reaches are unproven. Worth
  a real trigger (the first live run against an externally registered domain) rather than a
  standing note.

- **`fixtureCsrf` is a fixed constant with the same shape `fixtureMediaBase` had (docs friction
  log, conformance pass Task 6, promoted at the internals close 2026-09-03).**
  `ReproContext.svelte` sets `setContext(CSRF_CONTEXT_KEY, () => fixtureCsrf)` unconditionally
  from `src/lib/reproductions/fixtures.ts`'s fixed string, with no override prop. Fixture scope
  only, no live token or reachable auth surface. Trigger: a reproduction needs per-run tokens
  (a consumer reports needing a non-default CSRF fixture value).

### Platform watch: Cloudflare

This is a tracked list of Cloudflare platform features cairn has evaluated and judged not to
adopt, each carrying its status, the reason it was declined, and the trigger that would change
the verdict. A monthly cloud routine (`cairn Cloudflare capability review (monthly)`, created
2026-08-22) reads this list by this exact heading and emails a report; the owner folds any
status change in here, and an item whose trigger fires moves up to Now or Next.

- **Engine-side Cache API caching for `/media`.** Status as of 2026-10-06: not adopted (Geoff,
  2026-10-04). Adapter-cloudflare 7 put every worker response carrying a public `Cache-Control` into
  `caches.default`, `/media` and public SSR pages included, and adapter 8 does not (its worker has no
  `caches` use), so a `/media` read now reaches R2 unless the browser or the zone cache already holds
  it. What cairn does today: `/media/[...path]` answers `Cache-Control: public, max-age=31536000,
  immutable` (`src/lib/sveltekit/media-route.ts:38`) and nothing else. Why not adopted: Cloudflare's
  Cache API page (https://developers.cloudflare.com/workers/runtime-apis/cache/) says "The Cache API
  is available globally but the contents of the cache do not replicate outside of the originating
  data center" and "The `cache.delete` method only purges content of the cache in the data center
  that the Worker was invoked", so a deleted image would linger at every other edge for a year; a
  global purge needs the zone purge API with a per-site token and zone id in config; and browsers
  already hold the bytes for a year, with R2 reads cheap. Trigger: a measured R2 cost or `/media`
  latency problem on a production site.

- **R2 Local Uploads.** Status as of 2026-08-21: open beta since 2026-02-03
  (https://developers.cloudflare.com/changelog/post/2026-02-03-r2-local-uploads/). What cairn does
  today: `MEDIA_BUCKET` uses the default upload path, a plain `bucket.put()` call
  (`src/lib/media/store.ts:59`). Why not adopted: it is an operator's per-bucket switch, not engine
  code, so cairn has nothing to change. Trigger: general availability, at which point
  `docs/admin` gets the one-line tip pointing an operator at the toggle.

- **Secrets Store, for the shared GitHub App key.** Status as of 2026-08-21: beta since
  2025-04-09 (https://developers.cloudflare.com/changelog/post/2025-04-09-secrets-store-beta/).
  What cairn does today: both consumer sites (ecxc.ski, 907.life) hold the same
  `GITHUB_APP_PRIVATE_KEY_B64` value as separate per-Worker secrets. Why not adopted: where a
  secret lives is the operator's domain, not the engine's; `create-cairn-site`'s scaffolder, not
  the runtime library, is where cairn would offer a Secrets Store option. Trigger: general
  availability plus a wrangler binding shape the scaffolder can write into a generated
  `wrangler.jsonc`.

- **Email Sending event subscriptions (bounce, deferred, failed, complained), via Queues.**
  Status as of 2026-08-21: shipped 2026-07-15
  (https://developers.cloudflare.com/changelog/post/2026-07-15-event-subscriptions/). What cairn
  does today: `src/lib/email.ts:75` only sees a synchronous send failure at the moment of
  `env.EMAIL.send()`; a bounce or complaint that arrives later is invisible to the engine. Why not
  adopted: not yet, single-use magic-link mail does not justify standing up a Queue consumer.
  Trigger: a consumer site reports silent bounce loss, or the engine gains any other reason to run
  a Queue consumer.

- **Email Sending named recipients (`{email, name}` on `from`/`to`).** Status as of 2026-08-21:
  GA (https://developers.cloudflare.com/email-service/examples/email-sending/recipients/),
  resolves 200 per `curl -sI`. What cairn does today: `src/lib/email.ts:75` sends `from`/`to` as
  bare address strings, no display name. Why not adopted: a branded sender name is a site's own
  choice, not the engine's, so cairn has nothing to change until a site asks. Trigger: a consumer
  site wants a display name on its login mail.

- **D1 Sessions API and read replication.** Status as of 2026-08-21: public beta since
  2025-04-10 per D1's own release notes
  (https://developers.cloudflare.com/d1/platform/release-notes/); no GA entry as of this writing
  (corrects the "both GA" claim the Next-tier platform-features entry made for this feature).
  What cairn does today: the auth store (`src/lib/auth/store.ts:34`) uses the plain D1 binding, no
  session, no read replica. Why not adopted: not yet, the auth store's traffic is low-volume and
  correctness-critical, exactly where a beta consistency model warrants waiting for GA. Trigger: a
  GA entry appears in D1's release notes.

- **Cloudflare Images binding.** Status as of 2026-08-21: GA since 2026-06-10
  (https://developers.cloudflare.com/changelog/post/2026-06-10-hosted-images-binding/). What
  cairn does today: cairn builds `/cdn-cgi/image/<options>/` transform URLs directly
  (`src/lib/media/transform-url.ts:57`). Why not adopted: the URL design is edge-cached with zero
  Worker CPU per request, and stays; the binding would trade that for CPU time cairn does not need
  to spend. Trigger: a transform a consumer needs that the URL API cannot express.

## Considering

- **Whether `expectTypeOf` assertions should run where they appear to run (found on the cleanup
  pass, 2026-08-08; deliberately left open).** 48 `expectTypeOf` assertions across 9 test files are
  runtime no-ops under `npm test`, because `vitest.config.ts` configures no typecheck project. They
  are not dead: `tsconfig.json` includes `src/tests`, so `npm run check` type-checks them, and a
  real mismatch there is a compile error rather than a silent pass. The open question is whether to
  enable vitest's typecheck project so these assertions run under the test command they visually
  sit inside, or to leave the current split and document what they are, so a reader isn't misled by
  where the assertion lives. No trigger yet; take this up only if the split causes a real miss.
- **A request-time verifier code as the cross-device-preserving alternative to the login nonce
  (filed 2026-08-31, conventions-pass security review).** The nonce binds a link to one browser and
  charges for it: a link requested on a desktop and opened on a phone refuses. A short verifier the
  request page shows and the confirm page asks for would bind the same way while letting the click
  land anywhere, at the cost of one thing the editor has to carry across. The promote trigger is a
  real report of the cross-device refusal biting a site's editors, not the theory.
- **Migrate the engine's own editor default from magic-link to codes.** The auth-channel factory
  design (`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-08-03-auth-channel-factory-design.md`, decision 6) named
  this out of scope on purpose: `magic_token` and the editor magic-link flow are untouched by
  `createAuthChannel`, which serves a second audience only. The open question this entry tracks is
  whether the engine's own zero-config editor auth should someday move from a magic-link URL to an
  OTP code, either on the same `createAuthChannel` session model or its own. No trigger yet:
  magic-link's disciplines (hashed-at-rest tokens, a per-address cooldown, one live token per
  address) already hold on two consumer sites, and a code brings its own guessing-bound
  trade-offs the design spec's residual risks catalogue names for the second-audience case. Take
  this up only if a concrete reason to prefer codes for editors surfaces, not speculatively; email
  magic-link stays the documented, zero-config editor default until then.
- **Inline includes.** Fragments (shipped) resolve block-only: an `::include` stands on its own line
  and splices the fragment's blocks in place, so a fragment cannot supply a phrase mid-sentence. The
  promote trigger is a real production case. Watch ASC's Discord vocabulary, where a recurring inline
  noun (a channel name, a season label) gets retyped by volunteers and drifts. Take
  it up when that case is concrete, not before; the block shape covers every reuse case the design
  brainstorm actually found, and an inline directive is a second grammar to teach and maintain.
- **Narrow `EngineScreenId` so a misspelled built-in screen squiggles in the editor.** The type
  widens to `(string & {})` so a dynamic concept id stays assignable, which means
  `{ screen: 'setings' }` shows no red squiggle and surfaces only when `validateNavLayout` throws
  at server start. The construction throw is loud and names the bad value, so the miss costs a dev
  restart, not a wrong render; a tighter net (a template-literal union over the adapter's own
  concept ids) needs type-level access to the adapter this module does not have today. Take it up
  if that access ever falls out of other type work. From the friction log, triaged 2026-07-16.
- **Admit editor-tooling keys to the site-config allowlist when a real tool asks.** The
  unknown-top-level-key parse error means a YAML-LSP `$schema:` key would fail the parse. Conscious
  strictness, per the loud-boundary posture; add a key to `KNOWN_TOP_LEVEL_KEYS` only when a real
  tool wants it, not preemptively. From the friction log, triaged 2026-07-16.
- **What `draft` means on a non-routable concept.** `draft` is a routing idea: a draft entry's page
  404s and stays out of feeds. A fragment has no page, so the flag has nothing to withhold, and today
  nothing filters it. A site that declares a `draft` field on its fragments concept and sets it would
  find the fragment still listed in the picker and still spliced into every published page that
  includes it. No production case has asked for it, and inventing the semantics without one is how a
  lean concept grows a second meaning. The trigger is a site that declares the field and expects it to
  bite; the answer is then either filtering drafts out of `fragmentTargets` and refusing them in
  `createFragmentResolver`, or rejecting the field on the concept at declaration. Surfaced by two
  reviewers on the fragments pass, 2026-07-16.
- **Fragment bodies on the manifest row.** `editLoad` reads every published fragment's body on every
  edit-page open, one `readFile` per fragment, so the picker can list them and the preview can resolve
  an include the author inserts without a round trip. That is fine at the handful of fragments a small
  site keeps and is the reason the live preview needs no server call. The cost grows with the fragment
  count, one read each, against the installation's GitHub rate limit. The trigger is a real site
  carrying dozens of fragments;
  the fix is a body column on the manifest's fragments rows, which collapses it to zero extra reads at
  the cost of a fatter manifest. Surfaced by the fragments pass's own review, 2026-07-16.
- **Scheduled publishing ("publish at").** Editors expect scheduling from a CMS, and the
  date-vs-publish field redesign note in Later exists precisely because the date field already reads
  as if it schedules. The lean shape, if it lands: a publish-at timestamp on the held per-entry
  branch, a documented Cron Trigger the site adds, and the existing publish action fired at the
  time; no queues and no recurring schedules. It cuts against the deliberate-Publish philosophy, so
  this is a product decision to make explicitly, not an engineering default.
- **Editor find/replace.** A recipe-built find/replace panel on `@codemirror/search`'s `createPanel`,
  keeping CodeMirror's search state and commands but rendering cairn DOM. Bind only the search subset of
  `searchKeymap` (not the stock un-themed `gotoLine` panel or the multi-cursor bindings it also carries),
  and honor the full panel a11y contract (no focus trap, labeled stateful toggles with `aria-pressed`, a
  polite match-count live region reading "3 of 12"). Cut from the CM integration pass as new capability,
  not chrome alignment: cairn edits short Posts and Pages and the browser already finds visible text, so
  scope it only if find/replace is genuinely wanted, on its own merit.
- **Autocomplete dropdown look (conditional).** The link-completion dropdown stays a plain CodeMirror
  default. The CM integration pass deliberately did not align it: CodeMirror offers no public replacement
  for the dropdown container, so skinning it would add internal-class coupling (`.cm-completionLabel`,
  `.cm-completionMatchedText`) on a rarely-seen surface, against the pass's shrink-the-fragility goal.
  Revisit only if the default reads as jarring in practice, and only through the public
  `tooltipClass`/`optionClass` tint (font and surface on the container), never reaching into the internal
  completion classes; hold the selected state to a non-color cue and the contrast floors.
- **A strong/gentle CTA pair in the starter template (DaisyUI Aura).** The template could offer a
  developer two call-to-action treatments to choose from: a strong one using DaisyUI's Aura animated glow
  and a gentle one without. Template only. The admin interface stays restrained and never uses Aura.
- **Export `applySecurityHeaders` for a second audience.** `createAuthGuard` applies cairn's hardened
  admin response-header set only under `/admin`; a site's second authenticated audience built on
  `./auth-crypto` (a member portal, an offer-token flow) has no exported way to apply the same set to
  its own responses and reimplements it by hand. Filed by the 2026-08-01 ASC engine-seams adversarial
  review as a promotion candidate rather than adopted in that pass; take it up when a second audience
  actually needs it.

- **The markdown-versus-WYSIWYG case, and a tool-by-tool competitor comparison, have no home in the
  published docs (Pass D mining sweep, triaged 2026-08-14).** The deleted old corpus carried both:
  `explanation/why-cairn.md`'s academic case for markdown over a rich-text editor (Scribe, TeX, SGML,
  Coombs/Renear/DeRose 1987, iA Writer, Ulysses, Bear) and a tool-by-tool comparison against Sveltia,
  Decap, Keystatic, the hosted headless services, and WordPress, whose strongest argument was that a
  config-driven dashboard has nowhere for a site's growth to go, so a newsletter editor and a
  membership coordinator end up in two different tools. The later `docs/why-cairn.md`, itself
  deleted by the harvest (2026-09-30), carried the trade-offs and the stack commitment but never
  justified markdown itself and dropped the comparison; after the old corpus's deletion, the academic case survives nowhere in the published
  tree or the internal planning docs it once cited
  (`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-07-03-markdown-academic-case.md` remains as history only). This is
  page-shaped, not a sentence to fold into an existing page, and whether it belongs at all is a
  register question for whoever owns the front door: `docs-register.md`'s "keeps the why and the
  honest trade-offs" line for `why-cairn.md` doesn't say which why. **Trigger:** stage 5's outline
  of the front door, or sooner if a reader or reviewer asks why cairn is markdown-first, or why it
  isn't a rich-text or headless-CMS competitor.

- **`check:snippets` cannot see a wrong call through a site-local import stub, which hid a real
  defect (Pass D mining sweep, 2026-08-14).** The gate auto-stubs any site-local import (a name
  imported from a path like `$lib/cairn.config.js`, one the gate cannot resolve) as untyped, so a
  call routed through such a stub typechecks trivially regardless of the real signature it's
  supposed to match. This is exactly how two docs pages (`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/extend/wire-the-delivery-surface.md`,
  since deleted, and `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/reference/delivery-data.md`, both fixed first) called the public `SiteRender` type with
  two positional arguments instead of the one object argument `src/lib/content/types.ts:215`
  actually declares, and the gate never caught it because both call sites went through a
  `cairn.rendering.render` reached off a stubbed site-local import rather than the typed package
  export directly. The gate correctly proves an import resolves from cairn's own subpaths; it has no
  way to prove a call made through a site-local stub matches the real signature the stubbed value
  would have if it resolved. No concrete fix proposed yet; worth a look at whether the snippet
  fixtures can carry a real minimal adapter shape for the common `cairn.*` call sites instead of an
  untyped stub, weighed against the added fixture-maintenance cost.
