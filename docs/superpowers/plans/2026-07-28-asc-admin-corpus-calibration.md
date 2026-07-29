# ASC authenticated-admin corpus: closing the calibration's evidence gap

> **For agentic workers:** this is one measurement task, not a numbered pass. Main-loop
> orchestrated, because it is measurement and judgment rather than build. Run it on a worktree
> off `main` (`asc-admin-corpus`), since the corpus is likely to surface rule defects the way
> every prior corpus did, and `main` stays releasable.

## Why this exists

Design-infrastructure Pass 2's Task 17 calibrated `cairn-audit` on two corpora and concluded that
none of the five compositional rules can be promoted from advisory to error.

**That verdict skipped the one corpus that matters most, and this should be read as a significant
failure of the calibration rather than as a tidy limitation.** ASC's admin is the only living example
of an extended cairn interface: cairn's own admin components underneath, roughly 31 custom admin
routes built on top by a developer who is not cairn's author. It is also the corpus that produced the
diagnosis this entire initiative answers, the Members finding that contracted decisions repeated
across three uncoordinated build sessions while precedent-only decisions were reinvented every time.
The initiative exists because of what that interface demonstrated. Calibrating the enforcement engine
against everything except it leaves the central claim untested, and the promotion verdict resting on
public marketing pages and a login screen.

**The recorded reason for the gap is also wrong, and correcting it is part of this task.** Pass 2
recorded the authenticated admin as structurally unreachable. It is not. The calibration ran ASC
under `vite dev`, which loads no Cloudflare bindings at all, correctly observed that ASC ships no
`@glw907/cairn-cms-dev` dev-backend hook, and then drew the wrong conclusion: that no path to an
authenticated local admin existed. ASC documents a different path, in the very file the run read.

## What is actually true (verified 2026-07-28, read-only)

- `~/Projects/asc-site/wrangler.toml` declares `AUTH_DB = cairn-asc-auth`
  (`e8ebb275-bd87-4e9f-b1f8-685c460e7629`), alongside `EVENTS_DB` and `CLUB_DB`. The binding
  exists locally; it is only the DEPLOYED `asc-staging` worker that lacks it.
- `~/Projects/asc-site/src/hooks.server.ts`, lines 2 through 5, states it outright: the site has no
  registry-only dev-backend hook, and "a local admin smoke test seeds a D1 session row directly
  instead," pointing at `docs/internal/admin-smoke-test.md` in this repo.
- ASC's `wrangler.toml` declares **no `custom_domain` route**, so the smoke doc's custom-domain
  caveat does not apply. The local http path is available, and the session cookie is therefore
  `cairn_session` with no `__Host-` prefix.
- `main = ".svelte-kit/cloudflare/_worker.js"`, so a build precedes `wrangler dev`.
- ASC's git working tree was clean at the time of writing. Record a fresh baseline before starting.

What remains genuinely blocked, and must stay blocked:

- **Deployed dev and staging.** The `asc-staging` worker serving both hostnames binds only
  `ASSETS`, `DB`, and an R2 bucket. Cloudflare Access lets you through the outer door, and cairn's
  guard then bounces every `/admin` route because there is no auth store to read. Seeding a session
  row cannot help; no binding reaches it.
- **Production.** The `asc-site` worker does bind `AUTH_DB`, and auditing it is still out of bounds:
  the rendered rules click triggers to capture an open-menu state, which is not an observation on a
  live members' site.

## Constraints, all absolute

- Local only. Nothing points at `aksailingclub.org`, `dev.`/`staging.aksailingclub.org`, or the
  `asc-site` worker.
- Local D1 only. `wrangler dev` without `--remote`, and every `wrangler d1 execute` carries
  `--local`. No write of any kind reaches a remote database.
- No ASC code changes, no commits in that repo, no `npm install` that could move its lockfile.
  Capture `git status --porcelain` in `~/Projects/asc-site` before starting and confirm it is
  byte-identical at the end. Any audit config file lives in the scratchpad, never in the ASC repo.

## The task

- [ ] **Step 1: reach the authenticated admin.** Build ASC (`npm run build`), start
  `npx wrangler dev` on a free port, seed an `editor` row and a `session` row in the LOCAL D1 per
  `docs/internal/admin-smoke-test.md` (the cookie value is the opaque session `id` itself; nothing
  is signed), and prove an authed request renders by fetching an `/admin` route and getting 200 with
  real admin markup rather than a redirect to `/admin/login`. Do not proceed on a 303.
- [ ] **Step 2: enumerate the corpus.** cairn's own admin routes as installed on a consumer, plus
  ASC's custom admin routes under `src/routes/admin/club/**` (roughly 31: members, classes, events,
  money, email, documents, committees, assets, settings). Record the exact route list in the
  calibration doc so the run is reproducible.
- [ ] **Step 3: run the audit**, both themes, static and rendered, with the config in the scratchpad
  and `--config`. Run `npm run package` in cairn first; the bin runs from `dist`.
- [ ] **Step 4: classify every finding true or false positive BY EYE**, per finding, to the same
  standard corpora A and B were held to. Screenshots where seeing the screen decides it. A genuine
  defect in ASC's interface is a TRUE positive; this task does not fix ASC.
- [ ] **Step 5: re-examine the five verdicts.** The existing calibration concluded no compositional
  rule is promotable. This corpus is the evidence that can confirm or overturn it, so state which
  happened, per rule, with numbers. Pay particular attention to the ONE-DIRECTION asymmetry Pass 2
  found: `interactive-contrast`, `relational-spacing`, and `norms-bands` fired only on the consumer's
  public pages and were silent on cairn's own admin. On a consumer's ADMIN screens, built from
  cairn's own components, that asymmetry either reproduces or dissolves, and either answer is
  informative.
- [ ] **Step 6: correct the record in four places**, all of which currently say the gap was
  structural: `docs/internal/2026-07-design-infrastructure-audit-calibration.md` (its corpus B
  section and section 7), `docs/STATUS.md`, the initiative memory
  (`cairn-design-infrastructure-initiative`), and the Task 17 Step 2 note in
  `docs/superpowers/plans/2026-07-27-design-infrastructure-pass-2-enforcement.md`. Say the run
  stopped short and why, rather than that the door was locked.
- [ ] **Step 7:** full gate if any rule changed; commit; ASC repo verified untouched.

## Acceptance

The promotion verdict rests on the corpus the spec's bar actually names, the four wrong records are
corrected, and `~/Projects/asc-site` is byte-identical to how it was found.

## The lessons worth carrying regardless of the outcome

**A tool reporting "unreachable" is a claim about the path tried, not about the destination.** The
run that concluded ASC's admin was unreachable had already read the file that names the reachable
path. Before recording a blocker as structural, check whether the thing you are trying to reach
documents its own way in.

**A dispatch that offers a fallback will get the fallback.** The cause was not the agent's judgment;
it was the instruction. The Task 17 dispatch said, in effect, "if ASC ships no dev-auth backend, do
not add one, audit what is reachable and record the gap honestly," and the agent did exactly that,
including the honest recording. What the instruction never demanded was that documented paths be
exhausted before the fallback was taken. When one input to a measurement is the whole point of the
measurement, the dispatch has to say so and treat failure to obtain it as a blocker to escalate, not
as a branch to take.
