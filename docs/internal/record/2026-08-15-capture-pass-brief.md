# The capture pass: runbook brief (2026-08-15)

Scheduled early on Geoff's 2026-08-15 sequencing call, so it leaves the release-one critical
path instead of trailing the diagram waves. Purpose: produce the recorded-run fixtures that the
admin track's transcript blocks and the promised transcript CI gate require, then rewrite the
two waiting pages against them. The 2026-08-15 fixtures sweep (ROADMAP, the transcript-gate
entry) established that no consumable fixtures exist: the T-series runs wrote stdout to
`~/Projects/cairn-scratch/` uncommitted, and no `cairn-doctor` report was ever captured.
Standing rule throughout: no invented output, ever; a transcript is real stdout or it does not
ship.

## Prerequisites, in order

1. **The scaffold `.gitignore` fix lands first** (in flight 2026-08-15). A captured run must
   reflect the tool release one ships; capturing pre-fix behavior would bake a known defect
   into the fixtures.
2. **A tool-freeze check at capture time:** confirm no other `packages/create-cairn-site`
   changes are pending that would alter printed output. If tool output changes after capture,
   the gate turns red and the affected block re-captures; that is the gate working, not a
   protocol failure.
3. **Geoff attended.** The run needs his browser for the GitHub App creation and install
   moments (and a Cloudflare sign-in if the session lacks one). Everything else is
   terminal-watching. This is the only part that needs his calendar.

## The run protocol

- Fresh end-to-end `npx create-cairn-site` against a scratch name on the glw907 account,
  workers.dev only (no custom domain; the domain-connect transcripts are not in the two
  waiting pages' contracts, and a workers.dev-only site is exactly what makes the doctor emit
  skip lines, which the docs need). Capture full stdout/stderr of every invocation verbatim
  (`script` or `tee`), one file per invocation, unedited.
- Run `npx cairn-doctor` against the deployed result BEFORE any teardown, capturing a report
  that shows pass, fail, and skip lines together. If the fresh site is too healthy to show a
  FAIL, induce one deliberately and note which (e.g. capture once before email onboarding);
  the page's contract needs the three line types visible, and an induced failure on a scratch
  site is a real run, not an invented one.
- Interrupt-and-resume: if the T-series interrupt window is cheap to reproduce, capture one
  resume transcript for `setup-recovery.md`'s future use; do not extend the run just for it.
- Commit the raw captures as fixture files in-repo (proposed home:
  `packages/create-cairn-site/test/fixtures/transcripts/`, beside the suite that will diff
  them; the pass plan settles the exact path). The fixture files are the source of truth; docs
  pages quote excerpts from them.
- Teardown per the T-series tables: the scratch worker and databases, the GitHub App, any
  minted token. Append every teardown item to the STATUS hand-steps ledger at once, not at
  pass end.

## Open policy question for the pass plan

**Redaction.** Raw captures carry real scratch identifiers (account id, worker URL, App slug).
Options: keep them verbatim (they are torn down and the fixtures are honest) or
placeholder-rewrite the published excerpts while the committed fixtures stay raw (the gate
diffs docs blocks against fixtures, so any rewrite must be a declared, mechanical mapping the
gate applies, never a hand edit). Decide once, in the pass plan, before the first block ships.

## What the pass then builds

The `create-your-site.md` transcript blocks (its second bounded edit; the setup-journey diagram
lands earlier in the diagram-pages pass), the `is-it-working.md` rewrite with the real doctor
report, and the transcript CI gate the Pass D exit criteria promised and never built (ROADMAP
entry), proven red once by corrupting a block. Branch from `main` after the diagram-pages
branch merges.
