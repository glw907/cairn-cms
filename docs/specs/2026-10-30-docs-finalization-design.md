# Docs finalization series

Status: approved by Geoff 2026-10-30 (Approval Queue item 20261030T184230-531750): live capture Saturday when notified, stacked branches, fold #46 and #47. Unattended planning approved. Initiative: none applies (the docs records exclude
content; this is cairn-cms work alone). Inputs: `ROADMAP.md` ("The path to the release"), the
2026-08-14 outlines record, and the 2026-10-30 readiness read and scoped backlog sweep.

## Brief

Five passes finish cairn's docs, up to the one release. A conductor starts at 12:01 AM on Saturday
2026-10-31 and runs them unattended. The run stops only at one live capture sitting and at your
reviews, which queue as it goes. It does not finish overnight: the estimate is about 30 path hours.

### What changes

- Pass 1 closes stage 2b and takes 12 backlog folds.
- Pass 2 is a small engine pass, sized by the 2b boundary test.
- Pass 3 writes the editors arm, 8 pages.
- Pass 4 writes the admin arm, 8 pages, after your capture sitting.
- Pass 5 writes the front door and audits the shipped agent guidance.

### If you approve

1. An unattended planner writes the plan and prompts and closes PR #155, which this replaces.
2. The planner arms the 12:01 AM launch.
3. The conductor runs the series and tells you when the capture sitting is due.

### Decide: When the live capture runs

Saturday once pass 2 lands, about 45 minutes in your browser (recommended), or no sitting, with the
admin arm drafted from the August fixtures and recaptured before the release.

### Decide: Whether the run waits for your reviews

Keep going on stacked branches (recommended), or stop after each pass until you have reviewed it.

### Decide: Whether two pages fold into Content model

Retire Reuse content across entries and Link content with references into Content model, BACKLOG
#46 and #47 (recommended), or keep both pages.

### Standing answers

- A plan's path up to 2,100 minutes launches. Past that it stops.
- A pass past twice its estimate goes on with a reason in its PR. The series ceiling is 4,200 path
  minutes.
- The boundary test's verdict is applied without you when each fix is reversible and inside the
  ceiling. A fix needing a product design (such as BACKLOG #31) stays in the batch, and the page
  says nothing the engine contradicts.
- A usage limit pauses the run, and the API-drop wake-up resumes it.
- A page that cannot be verified from code or a recorded run is held out of its PR and listed there.
  A page a gate needs ships with only what is verified, plus an escalation in the PR.

## Outcome

`docs/admin/`, `docs/editors/`, `docs/README.md`, `docs/why-cairn.md`, and the root `README.md` are
published on reviewed PRs, every open docs defect the sweep folded is fixed, and the final engine
batch and release are the only steps left. No version bump on `main`, no publish except the capture's prerelease, no site migration.

## Passes and estimates

Estimates are path minutes. Recent actuals ran from 34% to 124% of plan (#154, #149), so these use
the upper end.

| Pass | Scope | Class | Path min |
| --- | --- | --- | --- |
| 1. 2b close | 53 relinks, 10 fact re-arms, reference corrections, final arm index, consistency read, boundary test, friction triage, the folds below | `runner` | 600 |
| 2. Engine | Sidebar figure fixture; doctor PASS lines; retiring two conditions with their anchors kept; what the boundary test pulls forward | `runner` | 300 |
| 3. Editors | README, welcome, write-in-the-editor, publish-and-history, when-something-goes-wrong, add-an-image, manage-the-media-library, manage-your-tag-vocabulary | `runner` | 480 |
| 4. Admin | README, before-you-start, create-your-site, own-your-domain, is-it-working, setup-recovery, invite-editors, troubleshooting; `tool/docs/credentials.md` and `tripwire.md` move in | `runner` | 480 |
| 5. Front door | `docs/README.md`, `why-cairn.md`, root `README.md`, BACKLOG #70, the series close | `runner` | 240 |

The total is 2,100 with both halves of each pair counted; the true path is 1,710. The class is `runner` because each pass edits `scripts/checks` or a gate list.

The editors arm moves ahead of admin. It needs no account, and admin waits on the sitting, so the
run keeps working through the wait. The ROADMAP's order had no dependency between them. The front
door stays last because it links both arms.

## Calls made in this design

- **Stacking.** Each pass has one branch and one PR, based on the branch under it. Passes 1, 3, 4,
  and 5 go to you as `docs` reviews, whose view shows the code diff beside the pages, and pass 2 as a
  packet. The fold dropped a split into tooling and pages PRs, because the gates tie the two together.
  A send-back stays on its own branch, and merges run bottom-up.
- **Capture.** The admin arm is drafted from a fresh live run. The 2026-08-17 fixtures carry five
  logged staleness notes, and the register requires commands to trace to a recorded run. The source
  is a `--tag next` prerelease cut from pass 2's head on its own branch, leaving `main` and `latest`
  alone (revised 2026-10-30: the design said a local pack, which repeats what you ruled out on
  2026-08-16). See the capture ask.
- **Doctor recapture.** ROADMAP calls for a tool release before stage 3 quotes the PASS lines, which
  conflicts with no release before stage 5. Pass 2 fixes the lines and recaptures from a local build
  of `main`. The tag rides the one release.
- **Retired conditions.** The shipped-anchors list is append-only because released binaries print
  those anchors. The two headings stay on `is-it-working` as short notes.
- **The live seam.** The engine half shipped in `0.95.0`, so it needs no pass of its own. Rendering
  lives on an unmerged cairn-pub branch that cannot land before the release. Pass 3 uses `repro`
  fences checked by `check:visuals`. `figure-verifier` reads each story rendered in a throwaway
  route. A real render on cairn.pub is checked at that site's migration, and no pass touches
  cairn-pub.
- **Engine friction.** Every pass files what it finds under "Engine" in
  `docs/internal/docs-friction-log.md`, verified first (Geoff, 2026-10-30). Each close runs the
  boundary test and states the verdict in STATUS.
- **Sidebar fixture.** It does not block 2b's close, which settles PR #155's open decision.
- **The monthly docs cycle.** It starts from the main checkout on this host on Sunday 2026-11-01
  around midnight and can leave it dirty. It stays on: each pass starts by merging the branch under
  it, so no launch depends on a clean main after the first.

## Scoped sweep verdicts

Of 42 items, 12 fold, 20 keep, 6 reword, 1 is done, and 3 drop. All folds land in pass 1, 395
minutes in all.

- **Fold:** #1, #6, #33, #43, #46, #47, #62, #78, #79, #80, #81, #82. #22's docs half rides along.
- **Reword:** #22, #24, #45, #55, #59, #70.
- **Done:** #44. No local cairn-pub file links the old anchors.
- **Drop:** #10 (the key limit is 25, and rotation deletes keys as it goes), #63 (the allowlist
  covers it), #77 (every arm is already registered).
- **Keep:** #31, #32, #39, #41, #42, #48, #49, #50, #57, #58, #64, #69, #73, #84, #85, #90, #92,
  #93, #94, #95.

All 45 open items lack a sweep stamp, so a full sweep is due. The planner sweeps the other three
(#74, #75, #86) and sends the triage after the launch.

## Pre-flight

Nothing is needed from you before the launch. The one foreseen step is the capture sitting, at the
end of pass 2. The plan writes its exact steps (GitHub App creation, repository creation, and the
Cloudflare consent screens), and the conductor sends them when it is due.

## Out of scope

The final engine batch, the release, every site migration, cairn-pub, the docs cycle's human gate
design, and BACKLOG items outside the folds.

## End-to-end check

Pass 5's head passes `npm run check:docs-gate` and `check:close` with every arm rebuilt, and
`check:options` reports `pendingCount` 0. Fresh `docs-fact-checker` runs cover every new page.
