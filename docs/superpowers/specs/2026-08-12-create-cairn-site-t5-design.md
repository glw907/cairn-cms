# create-cairn-site Pass T5: the browser door (template repo plus Deploy button) (design)

The seventh tool pass, planned in its own sitting, and **re-sequenced in that sitting (Geoff,
2026-08-12): T5 jumps ahead of T4d**, so the queue is now T5, T4d, Pass D, release one. Parent
docs: the umbrella design (`2026-08-09-admin-setup-and-docs-reset-design.md`, "Two doors, one
house"), the T3 spec's T5 brief (`2026-08-10-create-cairn-site-t3-design.md`), and the T4c
post-mortem, which hands this pass the unrun live CLI e2e. The central platform claim this pass
rests on, that the Deploy-to-Cloudflare button clones the template into the admin's account,
auto-provisions the D1 and R2 bindings from `wrangler.jsonc`, prompts for secrets, and wires
Workers Builds, is the umbrella's, dated 2026-08-09, and has never been observed live. This
spec therefore names its assumptions and puts the spike first in execution; expect amendments
the way T4c's spike produced thirteen.

**Prerequisite: T4c merges to `main` before T5 execution cuts its worktree.** T4c is built and
green on `worktree-t4c-builds-connect` (draft PR #29) but unmerged, and this pass's live e2e
proves chapter 3, which exists only on that branch.

## Rulings made this sitting

1. **T5 precedes T4d** (Geoff, this sitting). No dependency runs in either direction; the
   ordering is value and risk. Three grounds. First, the same value ordering that put the
   console behind Builds: T4d improves a flow whose parks are already terminal, exit 0, and
   self-resuming, while T5 closes capability gaps (no public door exists, C3's `--template`
   contract is unmet, and the button is the only entry for an admin without a terminal).
   Second, information flows one way: the spike's findings can amend chapter 3's role and the
   admin-track story, while nothing T5 can find reshapes the console, whose delegation wait
   and build watch survive every outcome. Running T5 first means the folded live e2e proves
   chapter 3's final shape once. Third, the e2e economics are order-neutral only if the passes
   share one estate, and the T5-first order gets the proof-once benefit on top. **The live CLI
   e2e (T4c plan Task 10) folds into this pass**, and the scratch estate, the minted GitHub
   App, and `~/.config/cairn/sites` persist across T5 and T4d, with one teardown after T4d.
2. **The bootstrap answer is the checklist; the adopt path is T5b** (answers the brief's
   second open question). What the button cannot do becomes a printed checklist in the
   template README and the deploy guide, presented as the button door's completion story. The
   CLI's adopt-existing-repo path, real new surface with its own admission, dedupe, and
   park-and-resume semantics, is deferred to a **T5b brief written at this pass's end from the
   spike's findings**, because its right shape depends on what the button actually leaves
   undone. The umbrella's "the CLI then finishes what the button cannot" stays a stated
   intention with a named home, not a T5 deliverable.
3. **The brief's other two open questions close by live spike, not by ruling.** The button's
   actual behavior against a cairn-shaped `wrangler.jsonc` and where the flow leaves secrets
   are observable facts, and the T4b and T4c pattern (evidence before design lock) is the
   proven way to get them. The spike is execution Task 1 and a gate: no template-repo content
   or checklist copy is finalized until its findings land. Its question list is below.
4. **Gallery shape only** (Geoff, this sitting). The repo's layout, metadata, and README
   follow the current `cloudflare/templates` contribution conventions from the start, since
   restructuring a published repo later churns the button URL and every C3 invocation. The
   submission assets, preview images and the gallery Playwright e2e, serve only the submission
   itself and wait for that moment; the submission is filed on the roadmap, not here. The
   conventions are read from Cloudflare's own contribution docs at execution time and linked,
   never restated.
5. **The single source is enforced, not aspired to.** The template repo is generated
   wholesale: the sync regenerates the entire tree from the bake plus the overlay and commits
   the result as a normal commit (never a force push, per the standing git rule), so a hand
   edit to the template repo survives at most one release. Running the sync twice in a row
   produces no second commit; that idempotence is asserted by test.
6. **The spike copy strips the dev backend.** The baked template's `@glw907/cairn-cms-dev`
   devDependency is unpublished, so a button deploy's `npm install` cannot succeed against
   the real graph today. The dev backend serves only `npm run dev`, which a Builds deploy
   never runs, so the spike copy drops it (and the bake's honesty check stays intact for the
   real artifact). Fallback, only if stripping proves insufficient: a `next`-tagged prerelease
   (npm defaults every publish to `latest`; the tag is mandatory). Full public installability
   arrives with release one, which publishes the engine, the dev backend, and the tool in the
   same cut; until then the template repo's README states its pre-release status.

Standing rulings carried forward unchanged: no secret under the project directory; every exit
prints a next step; every wait prints a heartbeat; tokens opaque; `--dry-run` prints and
performs nothing; no suite may touch the operator's desktop; every platform claim carries a
date and the plan re-verifies its own at implementation time; read before write for every
non-idempotent Cloudflare call.

## Scope

T5 ships the browser door: the public **`glw907/cairn-waymark-template`** repo carrying the
Deploy-to-Cloudflare button, generated from the same emitter output the CLI scaffolds from
(single source holds), synced by a release-time workflow, satisfying C3's `--template`
contract (`npm create cloudflare -- --template glw907/cairn-waymark-template`), shaped to
gallery conventions, and finished by a printed checklist. The pass also runs the live CLI e2e
T4c deliberately left unrun, and ends by writing the T5b brief. The runtime library is
untouched.

Out of scope: the adopt-existing-repo CLI path (T5b); the localhost console (T4d, which now
follows this pass); preview images and the gallery e2e (roadmap, at submission time); the
`cloudflare/templates` submission itself; any change to the engine's public API; the
fake-server plumbing extraction (still T4d's); build-time environment variables, deploy
hooks, and preview-branch triggers (unchanged from T4c's exclusions).

## The template repo

Content is the bake's output (`emitTemplate` over the showcase, pruned exactly as
`bake-template.mjs` prunes for the tarball) plus a repo-only overlay:

- **README**: the Deploy button at the top, what the button does and does not do, the
  completion checklist, the C3 invocation for extenders, and, until release one, a
  pre-release notice. This README replaces the bake's `SITE_README` in the repo; the
  scaffolded-site README the CLI writes is unchanged.
- **Gallery metadata** per the current contribution conventions (verified and linked at
  execution time).
- **A license** matching the engine's (MIT).

The overlay lives in `packages/create-cairn-site/` beside the bake, versioned with the tool.
The repo keeps the bake's default identity (`cairn-showcase` names, zero-UUID database ids):
the CLI substitutes identity at scaffold time, C3's flow prompts for a directory name, and
whether the button flow renames anything is a spike question. The template's
`PUBLIC_ORIGIN` stays the bake's localhost default; correcting it is a checklist item (and
chapter 3's reconcile fixes it for any site the CLI later touches).

## The sync workflow

A cairn-cms GitHub Actions workflow, fired by the release publish (the same cut that runs the
OIDC npm publish) and by manual dispatch (which the spike and this pass's own verification
use). It checks out the repo, runs the bake, applies the overlay, and pushes the regenerated
tree to the template repo's `main` as a normal commit, skipping the commit when the tree is
unchanged. Write access rides a fine-grained PAT scoped to the single template repo, minted by
Geoff, installed through the standing secret flow (age store origin, registry entry, GitHub
Actions secret), never a broad token. The workflow lives beside the existing create-site CI
and its script is unit-tested like any other.

## The spike (execution Task 1, a gate)

A live button run against a scratch copy of the template repo, Geoff in the browser, findings
recorded in a dated internal doc that becomes the fixture source for anything later faked.
Must answer, at minimum:

1. Does the button provision the **two** D1 databases from placeholder ids, and the R2
   bucket? With what names and ids, and written back where?
2. What does it do with the `send_email` binding it cannot onboard a sending domain for:
   fail, skip, or prompt?
3. Does it prompt for repo and Worker names, and does it rewrite `wrangler.jsonc` (names,
   ids, `account_id`) in the created repo?
4. Where do prompted secrets land, and does the flow respect the no-secret rules (nothing
   in the repo, nothing echoed)?
5. What Builds wiring does it leave (connection, trigger, build token), in exactly the
   shapes chapter 3 would later find via its idempotent upserts?
6. Does the deployed site build and serve on `workers.dev`, and if the build dies, where?
   (T4c's probe died at the first D1 binding; that shape is known.)
7. What does the flow cost and require: plan, GitHub authorization moment, browser-moment
   count for the carry-forward ledger.

Questions 1, 3, 4, and 5 gate the README, the checklist, and the T5b brief. The spike also
records the button URL format actually honored.

## The checklist

The gap between what the button leaves and a finished site, written from the spike's answer
rather than the umbrella's claim, expected to cover: the GitHub App (sign-in and publishing),
the owner, email onboarding and its Workers Paid cost (the T4b framing), the domain, and a
real `PUBLIC_ORIGIN`. It appears twice, once in the template README and once in
`docs/guides/deploy-to-cloudflare.md`, which gains the button as its second door; the two
copies state the same steps and the guide carries the detail. Each item names its surface
(dashboard page or CLI command) and its cost, in the admission-copy register T4b set.

## The folded live CLI e2e

The full cold CLI run against real services that T4c named as its one gap: chapters 1 through
3 on a scratch site, proving the tool's own orchestration and the `reauthorize` OAuth trip,
reaching `builds-live` with the marker checks passing. It mints the **fifth** GitHub App;
`~/.config/cairn/sites` is empty, so nothing is reused going in, and everything is preserved
coming out: the site, the App, and the saved state persist for T4d's live work, and teardown
happens once, after T4d, by re-listing rather than by trusting deletes (the T4c teardown
standard). Evidence lands in the pass post-mortem per hop, the T4a acceptance idiom.

## Testing

What runs without a browser is tested mechanically: the overlay application (bake plus
overlay produces the expected tree; the README carries the button URL and the checklist), the
sync script's idempotence (a second run on an unchanged tree commits nothing), and the
spike-copy strip (the dev backend absent, everything else intact). The create-site CI
workflow carries the new test files in its existing glob. The button flow itself and the C3
clone are live verifications with evidence in the post-mortem, not suite members; the gallery
e2e is explicitly deferred.

## Docs

`docs/guides/deploy-to-cloudflare.md` gains the button door and the checklist.
`docs/tutorial/build-your-first-cairn-site.md` and the readiness guide get one-line pointers
only if their current copy contradicts the two-door story (verify, do not assume). ROADMAP:
the T5 line moves to done at pass end; the gallery submission and T5b are filed into the
tiers where they bite. STATUS records the reorder now (this sitting) and the pass state at
pass end. The T3 spec's T5 brief and the T4a spec's T4d brief each get a one-line dated
amendment pointing here, so no future sitting reads the stale order.

## Acceptance criteria

The template repo exists, is public, and is byte-identical to what the sync generates
(asserted by a clean re-run); a hand edit would not survive a sync. The button on its README,
run live against the spike copy, reaches a serving `workers.dev` site or every divergence
from the umbrella's claim is recorded with evidence. `npm create cloudflare -- --template
glw907/cairn-waymark-template` produces a tree that installs and builds, verified against the
spike copy now and re-verified at release one against the real graph. The checklist in README
and guide states every step the spike proved the button cannot do, each with surface and
cost. The live CLI e2e reaches `builds-live` cold with per-hop evidence, and the estate
survives for T4d. The T5b brief exists, written from spike findings. The sync workflow is
green on manual dispatch, its idempotence test passing. The runtime library is untouched, and
`package.json` is untouched.

## The T5b brief (a deliverable, not yet written)

T5b is the adopt-existing-repo path: the CLI running against a button-created repo it did not
scaffold, finishing what the button cannot. Its brief is written at this pass's end from the
spike's findings, because its admission rules (what states a button site can be in), its
dedupe obligations (what the button already provisioned), and its park shapes all depend on
observed button behavior. The brief lands in this file as a dated addition, the queue slot is
after T4d unless the sitting that writes it argues otherwise, and until it ships the
checklist is the completion story.

## T4d, unchanged but re-anchored

T4d's brief stays as the T4a spec wrote it (plus its two T4c inputs, the build watch and the
grown fake surface); only its position changes. It now follows T5, inherits a live site, a
minted App, and saved state instead of minting its own, and owns the single teardown.
