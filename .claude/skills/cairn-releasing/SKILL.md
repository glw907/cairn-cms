---
name: cairn-releasing
description: >
  Cuts and publishes the cairn-cms npm package (`@glw907/cairn-cms`). Use on any intent to publish,
  ship, cut, release, tag, or push out cairn; when merged-and-green work on `main` is ready to go out;
  when picking the next version or finalizing the CHANGELOG; or when a consumer site needs a new export
  on the registry. Not for a pass that holds unpublished (`cairn-running-passes`) or a site deploy.
---

# Releasing cairn

A cairn-cms release is a deliberate, occasional act. A finished pass finalizes its `CHANGELOG.md` entry
under `## Unreleased`, leaves `package.json` alone, and holds. `main` stays releasable, so completed work
accumulates unpublished until a release is warranted, and this skill is that separate publish step. The
governing rule lives in `CLAUDE.md` ("Working here").

A session loads this skill itself, and the approval sits on the act, not the load. Steps 1 to 7 and 10
cut a candidate and gate it on the `gate` dist-tag, which no `latest` install sees. A session runs them when
Geoff asks for a release or a plan he approved names the cut. A prerelease `tool/v*` tag also publishes to
`gate`, so it and the rerun of a failed publish (under step 9) go with them. Step 8 moves `next` to a passed
candidate, and step 9 puts a stable on `latest`. A session runs those only on Geoff's word in chat or an
approved packet that names the version, and step 9 also waits on his install, as it says. The four owner
steps under step 9 stay Geoff's.

Every mechanical step is a command under `scripts/release/`. Each takes the version, exits 0 or 1, and
ends with one `Next:` line naming what to run after it. This skill keeps four judgment calls (whether a
release is warranted, its size, the notes prose, and what to do when something fails) and the order the
commands run in. Run it from inside the cairn-cms repo.

**Every `--target` is a literal sha.** A cut prints the sha it was made at (`git rev-parse HEAD` after the
push; for a stable, the `sha:` line of `check-stable-source.mjs`). Paste that literal sha into
`gh release create --target`, never a branch name and never a `$( )` or `$SHA` substitution: the session
keeps no shell variable between calls, and the guard hook on `gh release create` expands nothing, so it
denies a target that is not a 40-hex sha.

## 1. Judgment call: is a release warranted?

Stop here unless one of two triggers holds:

1. A consumer site needs a published export now (this also forces the publish-before-push ordering: a
   site's `main` must never reference an export the registry lacks).
2. A coherent capability or initiative has landed and is worth making available, at its natural boundary.

A finished pass is not itself a trigger. An internal-only change a consumer never imports (for example the
admin idiomatic re-expression, which re-expresses admin CSS and components) does not warrant a release; it
rides the next consumer-facing cut. If neither trigger holds, do not release: confirm the work sits under
`## Unreleased` and stop. A version number is a public, immutable signal, so cutting one for every small
change just burns numbers. When in doubt, hold.

## 2. Confirm the window is on `main` and the gate is green

The release publishes from `main`. Each pass in the window reaches `main` through its own PR
(`standards:running-passes` "Close"), so confirm each is merged; a pass branch is never pushed to `main` to
stage a cut.

Dependencies are current before the gate runs. A release starts from the newest production version of
everything, so the last merge before the cut is the `standards:dependency-upgrade` skill's sweep on `main`
with no worktree live (its lockfiles collide with a live branch): every minor and patch taken, every major
held with its unblock trigger recorded, the survey and the refactor decision on record. Skip this only when
the window already contains such a sweep and `npm outdated` at every manifest returns only the held majors.

Then run the preflight:

```bash
node scripts/release/preflight.mjs <x.y.z>            # add --stable for a stable
```

It checks a clean tree, `HEAD` equal to `origin/main` (and prints that sha), a version absent from the
registry on both packages, both installs present, and a non-empty `## Unreleased` (a stable skips that
last check). Fix what it names and rerun.

## 3. Release sweep (capability releases only)

Run this step only for a cut under trigger 2. An urgent trigger 1 cut skips it, keeps its fast path, and
rolls its window into the next sweep. The sweep never blocks the cut: a run that finds nothing, finds only
gaps it cannot place, or stops at its cap still proceeds to step 4.

The sweep catches the docs-code drift that option coverage (`check:options`) cannot see: scaffold
behavior and changelog-described behavior outside option-bearing types. It finds new gaps; it does not
re-check existing pages whose code changed.

- **Window.** From the last engine tag whose release commit body carries a "Doc-code sweep" record, to `main`. Find the tags
  with `git tag --list 'v[0-9]*' --sort=-v:refname | grep -v -e '-'`: the `v[0-9]*` glob skips the
  repo's `tool/v*` tags, and the `grep` drops prerelease tags. A cut that ran no sweep leaves no record,
  so its range rolls into the next window. The first window is seeded at `v0.98.0`, since the planning
  sweep (`86fd134c`) ran after that cut and no release commit records one yet.
- **Finders.** Work from three inputs: the `scripts/checks/api-surface.md` diff over the window, the
  scaffold's emitted-template diff (`templates/`), and the changelog's `Consumers must:` and behavior
  lines. One module or one surface per agent context, never a per-file window (the `v0.97.0..v0.98.0`
  window alone spanned about 192 files). Independent verifiers confirm, correct, or refute each finding
  against source at `main`; a finder never verifies its own finding. For the first sweep after the changelog
  reset only, the changelog input is `git show c074feff5d32ad790bbf1272c0c41dfacccc1258:CHANGELOG.md`,
  since the reset consolidated `## Unreleased`.
- **Filing.** Fix a verified gap on the page it affects, through the `cairn-writing-docs` skill, in a docs PR
  reviewed as a `docs` review; the cut never waits on it. A gap with no page home becomes a
  `BACKLOG.md` item, never a new page. A code defect is a `BACKLOG.md` item, never a page fix.
- **Cap.** 1M tokens per cut, counted across every sweep subagent. At the cap, stop, report the modules
  left unswept, and carry them into the next window's record. Never extend the cap to finish.
- **Yield record.** Put a "Doc-code sweep" paragraph in the release commit body per run, so git and the commit carry the yield: the tag the window started from, the verified
  gaps found beside the modules swept (so window size does not confound the measure), how each gap was
  filed, the unswept modules, and the tokens spent. The next sweep's window starts at this cut's tag.
- **Retire rule.** After two consecutive capability releases whose sweeps found zero verified gaps, the
  sweep moves to on-demand: run it only when a site round finds a doc gap in a surface changed since the
  last sweep. A steady nonzero yield says option coverage misses a class; name the next mechanism to
  consider in the entry.

## 4. Judgment call: the size

Published numbers are global and immutable, and `preflight` refuses one the registry already holds, so
never assume the next number is free. Size the bump under SemVer, which in `0.x` is cairn's own scale:

- A **minor** (`0.X.0`) is a new subsystem or public surface that did not exist before, or a breaking
  change. A breaking change is any entry carrying a `Consumers must:` line other than `nothing.`.
- A **patch** is everything else: refinement, fix, DX, internal, even new optional exports on an existing
  surface. A patch never carries a breaking line, and `check:version` fails one that does.
- Every minor or major carries a `<!-- release-size: minor -->` marker in its CHANGELOG section, which
  `check:version` requires. When unsure whether a change is breaking, it is.

**Derive the size here, at the cut, against this rule and the actual `## Unreleased` window, never
from the conversation.** A number or size named earlier (in the launch prompt, a plan, or by
the maintainer in passing: "minor point release", "this'll be 0.90") is a hypothesis to re-derive, not an
instruction; phrases like "point release" are ambiguous and a passing size call predates the window's
final content anyway. When the derived size disagrees with what was said earlier, state the rule, name
the derived number, and confirm the mismatch in one sentence.

Set the version only now, at the cut. Never pre-number a held pass, since a later pass can roll
into the same release and leave that number unpublished.

## 5. Judgment call: the notes

Fold the window first. When an earlier candidate of the same version exists, `## Unreleased` is folded
into that candidate's section (the way the `0.99.0-rc.3` cut did) and committed on its own, because `bump`
refuses while `## Unreleased` sits above a heading on the same numeric core. `bump` renames the heading. Scrub any stale "stays unpublished
until then" or "set at release time" phrasing from the section, and add the matching entry to
`MIGRATION-NOTES.md` if the pass did not. A stable's diff from its final candidate may change only
version fields, pins, and headings, so the scrub belongs at the candidate cut, and a stable that would
need one cuts another candidate.

Group the changelog entries by topic. That is a house departure from Keep a Changelog, which sorts
entries into six types (Added, Changed, Deprecated, Removed, Fixed, Security;
<https://keepachangelog.com/en/1.1.0/>). A reader upgrading cairn asks "what happened to the editor?"
more often than "what was added?", so a section reads by surface, with `Consumers must:` lines carrying
the compatibility signal the types would. Geoff's ruling, 2026-11-03.

Then write the notes file:

```bash
node scripts/release/notes.mjs <x.y.z>                 # --out <file> to choose the path
```

It writes the version's CHANGELOG section plus every `Consumers must:` line other than `nothing.`, and
leaves a marker where the summary paragraph goes. The summary is the call: say what the release is for in
a short paragraph, in plain prose. Several held minors that roll into one publish each get a sentence.

A window touching an admin surface (`src/lib/admin/**`, `cairn-admin.css`) also earns a
re-read of the reproduction stories and docs pages the change reaches: check every affected story's
caption against what it now renders, and, on a page carrying a keyed callout list, that the list still
matches. A reproduction pictures a live render, so an admin change can silently falsify the prose
sitting next to it, and this is the last point before the change ships where the mismatch is still
cheap to catch.

Beware the Tailwind-scans-docs gotcha: an arbitrary-value class written in CHANGELOG or doc prose with a
non-value placeholder inside the brackets (an ASCII `...`, a `*`, or a `|`) compiles to malformed CSS and
breaks `npm run package`. Write the concrete token. A quick check:
`grep -rnE '[a-z-]+-\[[^]]*(\||\*|\.\.\.)[^]]*\]' docs/ CHANGELOG.md ROADMAP.md`.

## 6. Cut the candidate

**An rc is cut only for an actual release candidate, once the install process is effective and tested.**
A build made to prove something, such as a proving round or a probe, is a dev snapshot on `gate`: a
`<x.y.z>-dev.<n>` prerelease published by a `workflow_dispatch` of `publish.yml` (engine) or `tool.yml`
(tool) on `main` with `snapshot` set, with no GitHub release, no `v*` or `tool/v*` tag, and no CHANGELOG
release heading, and `latest` and `next` never move. Otherwise a polish loop publishes 10 or 20 rcs. Cut
the rc once, at the end of the loop. The snapshot procedure is in `cairn-proving-setup`. Geoff, 2026-11-09,
recorded in the setup tooling plan (initiatives `782a946`).

A stable is cut only from the final gated candidate's tree, so every release starts as a candidate
(`<x.y.z>-rc.N`). The transcript recapture and every quoted docs block it updates land before the final
candidate is cut; a recapture merged after it fails the stable check by design and means one more
candidate. The order, each step waiting on the one before:

1. `node scripts/release/preflight.mjs <x.y.z-rc.N>`, then fold the window (step 5) and commit the fold.
2. `node scripts/release/bump.mjs <x.y.z-rc.N>` writes the seven files a cut touches: the two manifest
   versions, the lockfile version lines, the template pins and `VERSION`, the CHANGELOG heading with its
   `Released` line, and the MIGRATION-NOTES heading and anchors. It refuses a dirty tree and does nothing
   on a tree already at the version. `--date YYYY-MM-DD` sets the date. It replaces
   the hand edits to each package.
3. `node scripts/build/build-guidance-hashes.mjs`, so `cairn-guidance install` can delete a file the last
   release shipped and this one does not. Then `npm run check:close`, the repo's own close gate. Run it
   sequentially with `npm test`, since both repackage `dist`. Local Playwright reuses a stale preview off
   CI, so the consumer-build proof is a CI `e2e` run, not a local "all green".
4. Commit the cut and push `main` by fast-forward, never force. Print `git rev-parse HEAD`: that is the
   literal sha for every later `--target`.
5. Wait for `test` on the cut commit, because the tag ruleset makes a tag on a red commit permanent.
   List the run until an id prints, then watch it:

   ```bash
   gh run list --workflow test.yml --commit <sha> --json databaseId --jq '.[0].databaseId'
   gh run watch <run-id> --exit-status
   ```

   A red `test` is rerun once. A real red is fixed on `main` before any tag exists.
6. Write the notes (step 5), then create the release. A candidate takes `--prerelease`, and the hook
   refuses an `-rc` tag without it:

   ```bash
   gh release create v<x.y.z-rc.N> --prerelease --target <sha> \
     --title "v<x.y.z-rc.N>: <one-line summary of the window>" \
     --notes-file <notes-file>
   ```

   Creating the release fires `publish.yml`. Publishing runs only from a GitHub release, under OIDC
   trusted publishing in the `npm-publish` environment. The workflow derives the dist-tag from the
   version: a stable goes to `latest`, and any prerelease goes to `gate`, which no install command reads,
   so a candidate never reaches a bare `npm install` and never reaches `next` until it passes the gate.
7. Watch the publish run (list it with `gh run list --workflow publish.yml --event release --commit <sha>
   --json databaseId --jq '.[0].databaseId'`, then `gh run watch <run-id> --exit-status`), then:

   ```bash
   node scripts/release/wait.mjs <x.y.z-rc.N> gate
   node scripts/release/verify.mjs <x.y.z-rc.N>
   ```

   `wait` polls the registry with no cache until the tag holds the version on both packages.
   `verify` checks the tag and a provenance attestation on each.

A consumer cannot reach a prerelease through its caret range: `^0.93.0` does not resolve
`0.94.0-rc.1`, by SemVer's own rule. A site testing a candidate pins the exact version and moves back to
a caret when the stable lands.

## 7. Gate the candidate

A candidate on `gate` is judged by three legs before anyone installs it, each proving setup the way an
owner meets it:

- **`naive`**: an agent with no context sets up a site from the public docs while a conductor plays the
  owner (`cairn-proving-setup`; `run-gate.sh naive`).
- **`scripted`**: a scripted human drives the interactive `cairn new` and the browser half
  (`run-gate.sh scripted`).
- **`owner`**: Geoff installs a site in his own browser, with his own accounts, from the final
  candidate.

Before the first leg, run `bash scripts/gate/run-gate.sh --smoke` and `bash scripts/gate/run-gate.sh
sweep --check-scopes`, and check that the account's Email Sending product is live and that the account
is on Workers Paid (the estate inventory records both). A candidate for a gate round runs `npm run
check:close` on the default lane, since the light lane runs out of memory on it (#370).

The `## Gate` table in the candidate's release body has one row per leg, each carrying the cairn-cms
commit the leg ran against with the engine and tool versions. A tool-only round publishes a new
`tool/v2.0.0-rc.<n>` and no engine version, which is why the rows are keyed on commits.
`scripts/gate/verdict.mjs <x.y.z-rc.N>` exits 0 only with one `pass` row per leg: `scripted` at the
release's own commit, and `naive` and `owner` at commits with no change under a rerun path up to it.
`node scripts/gate/record.mjs carry --version <x.y.z-rc.N> --from <commit> --to <commit>` copies the
`naive` and `owner` rows forward only across a diff that touches none of the rerun paths, which
`RERUN_PATHS` in `scripts/gate/record.mjs` names. A change under a rerun path reruns the legs it
touches. Never carry a row by hand.

The standing answers when a leg fails:

- A failure fixes forward to the next candidate, and the rows carry only across a diff that the rule
  allows.
- A harness-only fix, one that changes only paths that ship in no package, does not force a new
  candidate (see the ruling 10 carve-out in `cairn-running-passes`), and the gate reruns on the candidate
  already out.
- A first deploy that fails on a provider outage gets one rerun after 15 minutes.
- A GitHub page the harness cannot pass is never defeated: rerun once headed, and if it holds, ask
  Geoff once and file the fix.
- A `naive` run that stalls, runs past its caps, or hits the budget stop (five naive runs or $100) is
  graded with `--end stall` or `--end budget` and follows `cairn-proving-setup`.

**Standing rule (#349).** A pass that changes `scripts/gate/` ends with one run against the current
`gate` candidate, through each leg its change touches, so the harness and the new product code are
proven together before anything publishes. Any unexpected failure is a harness gap, fixed before the
next cut. The retired wizard's candidate cannot serve for the pass that rebuilt the gate around `cairn
new`, so that pass's live proof is the first round of the setup-tooling loop.

## 8. Promote a passed candidate

Promotion is dispatched on the candidate's own tag, after `verdict.mjs` exits 0:

```bash
gh workflow run publish.yml --ref v<x.y.z-rc.N> -f promote=<x.y.z-rc.N>
```

Note the newest publish `workflow_dispatch` run id first (`gh run list --workflow publish.yml --event
workflow_dispatch --json databaseId,headBranch`), since the dispatch may not print its run URL. The
`promote` job refuses unless the gate table passes `verdict.mjs`, then moves `next` to the
version on the engine and the dev package. A `latest` never moves to a candidate: the engine packages'
stays on the last stable, and the launcher's is set by the tool release (see "The launcher and its
platform packages"). Then:

```bash
gh run watch <run-id> --exit-status
node scripts/release/wait.mjs <x.y.z-rc.N> next
node scripts/release/status.mjs <x.y.z-rc.N>
```

`status` prints a JSON checklist (tag, release and its prerelease flag, dist-tags, provenance, CHANGELOG
heading, and the gate verdict) and exits non-zero until all of it holds. A split `next` recovers by
dispatching the same version again, since `dist-tag add` is idempotent. If the run reports that the
trusted publisher cannot manage dist-tags, `verdict.mjs` must still exit 0 first, then Geoff runs
`npm dist-tag add <pkg>@<x.y.z-rc.N> next` for each package by hand, and the packet records the fallback.

## 9. Cut the stable

The stable waits on Geoff's word that his own install passed. Then:

1. `node scripts/release/preflight.mjs <x.y.z> --stable`, then `node scripts/release/bump.mjs <x.y.z>`,
   then `node scripts/build/build-guidance-hashes.mjs --check`. The bump on a tree at the final candidate
   changes version fields, pins, and headings only.
2. Commit, push `main` by fast-forward, and wait for `test` and `e2e` on the commit.
3. `node scripts/checks/check-stable-source.mjs`. It refuses unless `HEAD` is `origin/main` and the diff
   from the final candidate's tree is only the cut's own edits, ignoring paths that ship in no package. It
   prints a `sha:` line. Do not cut on a failure.
4. Create the release at that literal sha, with no `--prerelease`. The hook runs the same check and denies
   a `--target` that differs from the sha it prints:

   ```bash
   gh release create v<x.y.z> --target <sha> \
     --title "v<x.y.z>: <one-line summary of the window>" \
     --notes-file <notes-file>
   ```

5. Watch the publish run, then `node scripts/release/wait.mjs <x.y.z> latest` and
   `node scripts/release/verify.mjs <x.y.z> --from <final-candidate>`. For a stable, `verify` fetches both
   versions' tarballs and fails on any differing line outside the cut's own edits. Then
   `node scripts/release/status.mjs <x.y.z>` must exit 0.

If the publish job fails on authorization (an OIDC error rather than a code failure), the trusted-publisher
config on npmjs.org is the suspect, not the code: the org/user, repository, workflow filename
(`publish.yml`), and environment (`npm-publish`) must match the running workflow exactly. A new
trusted-publisher configuration defaults to `npm stage publish`, so it needs publish chosen as its
allowed action. Do not bump the version again to retry; fix the config and rerun the same release's
workflow with `gh run rerun <run-id> --failed`.

### The launcher and its platform packages

`create-cairn-site` and the six `@glw907/cairn-<os>-<cpu>` packages (`darwin`, `linux`, `win32`, each on
`x64` and `arm64`) are not part of the engine's lockstep and `publish.yml` never touches them. They version
with the Go tool and publish from `tool.yml`'s `publish-npm` job when a `tool/vX.Y.Z` tag is pushed: the
release job packs them with `scripts/release/pack-platforms.mjs` at the tag's version, and `publish-npm`
publishes the six platform packages first and the launcher last, with provenance, to `gate` for a
prerelease and `latest` for a stable. Only a push of a `tool/v*` tag publishes. A `workflow_dispatch`
run, on a branch or on a tag ref, packs and dry-runs without publishing.

Four owner steps come before the first tool tag, and none can be done by the workflow:

1. **Allow the tag in the `npm-publish` environment.** Its deployment policy allows tags matching `v*`
   only, and `*` does not cross `/`, so `tool/v1.2.0` is refused at the gate after the GitHub Release is
   already created. Add a second tag policy, `tool/v*`. Never widen it to `*`: that lets any branch
   deploy to the environment that holds trusted publishing for the engine too. Prove it with one
   prerelease tag before the real cut.
2. **Protect the tags.** The `release-tags` ruleset covers `refs/tags/v*` only. Add `refs/tags/tool/v*`
   (update and deletion rules), so a published version's tag cannot be moved or recreated.
3. **Publish each new package once by hand**, because npm cannot bind a trusted publisher to a package
   that does not exist. The six platform packages are new. `create-cairn-site` already exists, with its
   trusted publisher bound to `publish.yml`, so it needs only the rebind in 3.3. For each package:
   1. Pack with `node scripts/release/pack-platforms.mjs --version <x.y.z> --binaries <dir> --out <dir>`,
      from binaries laid out `<os>-<cpu>/cairn` (`cairn.exe` on Windows), or take the tarballs from the
      `npm-tarballs` artifact of a dispatch run on `main`, verified first with `gh attestation verify
      <archive> --repo glw907/cairn-cms --source-ref refs/heads/main`.
   2. Publish with the owner's npm login: `npm publish <tarball> --access public`.
   3. Bind the trusted publisher: `npm trust github <package> --repo glw907/cairn-cms --file tool.yml
      --env npm-publish --allow-publish`. The `--env` is load-bearing: `tool.yml`'s release job holds an
      id-token for the attestation, and only the environment binding keeps it from publishing.
4. **Retire the wizard's dist-tags.** After the first tool publish, `next` and `gate` still point at
   `create-cairn-site@0.99.0-rc.4`, the wizard that writes the GitHub App's secrets to disk in plaintext.
   Run `npm dist-tag rm create-cairn-site next` and `npm deprecate create-cairn-site@"<1.0.0" "Retired:
   use the latest version, which installs the cairn tool."`.

Do the six platform packages, then `create-cairn-site`. After that every tool tag publishes by itself, and
the already-published guard lets a re-run recover a release that failed partway. A stable tool tag moves
`latest` for all seven packages, so never tag an older stable after a newer one.

## 10. Judgment call: when something fails

Triage by where it failed, and fix forward unless the version is poisoned.

- **Before the tag exists:** nothing is permanent. Fix on `main` and recut.
- **A published candidate that fails the gate or `verify`:** it stays on `gate`. Fix forward to the next
  candidate. `node scripts/release/withdraw.mjs <x.y.z-rc.N>` prints the `npm deprecate` and `npm dist-tag`
  commands for the dead one (and, with `--promote-run <id>`, the moves that put `next` back). It runs
  none of them: Geoff runs the printed lines with his own npm login, since trusted publishing does not
  cover `deprecate`.
- **A half-published candidate** (one package out, others not): `withdraw` deprecates only the half that
  landed.
- **A failed stable:** one more candidate, never a retry of the number.

## 11. After the publish

Run the audit's public scope over each consuming site you maintain and record the counts. In each
site's checkout:

```bash
npm exec --package=@glw907/cairn-cms@<new version> -- cairn-audit
```

The command writes no `package.json` or lockfile. Record, per site, the advisory count from
`public-literals`, `theme-conformance`, and `theme-contrast`, plus the site's installed `daisyui` and
`tailwindcss` versions against the engine's peer ranges (`daisyui` `^5`, `tailwindcss` `^4`). The counts
are the evidence for the roadmap's promotion entry ("Toward 1.0": promote the two theme rules to error
at the first minor cut after every site reports zero).

Then update `docs/STATUS.md` to the shipped state.

The sites pin `@glw907/cairn-cms` by range and run `npm ci`, so the publish must precede any site code that
imports new exports. Order: publish, verify on the registry, repoint each site and regenerate its
standalone lockfile (in an isolated temp dir so it resolves from the registry, not the workspace symlink),
then push the sites. Flag any deferred live admin smoke tied to a site cutover.

### The retrospective

Each release leaves the next one smoother (Geoff, 2026-11-03). File every friction point met during the
cut, the gate, or the publish to `BACKLOG.md` as it happens, with its mechanism, and prefer a script,
check, or gate over a prose step. The stable's release commit body ends with a fixed paragraph headed
"Release retrospective", in this order: how many candidates the version took, how many friction items
were filed, how many of those were fixed before the stable, and the backlog numbers of the rest.

## References

- The release rule: `CLAUDE.md`, "Working here".
- The commands: `scripts/release/` (each file's header states its interface), and `.github/workflows/publish.yml`.
- The gate harness: `scripts/gate/README.md`.
- The path to 1.0 and its readiness checklist: `ROADMAP.md` ("Toward 1.0").
- The pass that produces the held window, and the carve-out for harness-only fixes: `cairn-running-passes`.
