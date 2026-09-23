# Plan 1 review: domain-risk lens

Reviewer: `claude-opus-5-5`, 2026-09-23. Plan: `docs/superpowers/plans/2026-09-23-docs-reset-pass-1.md`.

## Critical

**C1. The copied plan credentials can log the owner out, and readers can read them (lines 100-102, 65).**
Evidence: each container gets "a per-run writable copy of the plan credentials". The plan login is an
OAuth pair with a rotating refresh token. The first container that refreshes invalidates the token
that the host and every sibling container hold. Parallel batches make that likely, and the result is
the owner's interactive sessions failing mid-pass, including a possible 0.97.0 cut session. Review
focus 3 covers only the batch side. The copy also sits inside a container where docs-and-site readers
have Write plus `npm run`. A reader can edit a `package.json` script, so the Bash allowlist does not
confine it, and it can `cat` the credential file or `env` the scratch tokens into a transcript.
Fix: mint one dedicated plan token with `claude setup-token` and store it through `secret-set.sh`
with a registry row. Pass it as `CLAUDE_CODE_OAUTH_TOKEN`, so nothing refreshes and the owner can
revoke it alone. Mount no credential file inside the working directory. Restrict container egress to
the Anthropic API and the npm registry. Redact token patterns from every transcript before anything
from it reaches the repository. Keep transcripts under the cache path and delete them at teardown.

**C2. Dotfiles edits go live before cairn-cms `main` can accept them (lines 195-202, 239-269).**
Evidence: stow makes agent, skill, and workflow edits live at once. The id rule in
`cairn-implementer` and `site-implementer` then reaches every session. Those sessions include site
rounds, in-place deficiency fixes (spec, Sequencing), and the cut. `main`'s `check:facts` still
runs the old grammar, so an id-bearing bullet may fail it. Task 8 rewrites `docs-page-chain.js` in
place: it changes the default `drafterType`, adds `check:provenance`, which does not exist on
`main`, and removes the profile grader. The unmerged draft-docs pass B/C plans and the
`register-check` skill depend on the current chain and the current register editor.
Fix: land the Task 8 chain as a new file, or behind an args flag whose default keeps today's
behavior, until pass 2a rules. Commit the agent-definition id rule and push it only after the
cairn-cms PR merges, and make that ordering part of the Task 11 acceptance. Add a compatibility note
to each changed shared artifact's header.

**C3. Validation has no false-positive measure, so a reader that flags everything passes (lines 292-302).**
Evidence: the acceptance reads "catches every planted defect in 2 of 3 runs" and "≥12 of 14", with
no clean control and no precision count. Several planted types cannot be checked from the class's
contents. A docs-only reader has no ground truth for a "wrong flag" or a "stale path", so passing
rewards over-reporting. The one fix round is tuned on the same 14 defects and the same planted set
it is then graded on. Opus 5.5 drafts, plants, and reads.
Fix: add unmodified control pages and fail any class whose false-positive rate exceeds a stated
bound. Split pass A's 14 into a tuning half and a held-out half, and grade on the held-out half. Have
an agent that has not seen the reader prompts author the planted set, and include defects that
surface only by acting. Plant only defect types that the class's contents can reveal.

## Major

**M1. The Task 3 token mints cannot run as written (lines 150-152, 160).** The estate inventory
records the Admin token as "API-token management ✗ (deliberate: cannot self-extend)". Cloudflare's
Workers Scripts and D1 permissions are granted per account, not per script. GitHub has no API for
creating fine-grained PATs. So "minted by API" fails, and the "denied call on another Worker" check
will either fail or get waived quietly. A read token scoped to the account can read production logs,
which carry editor emails. Fix: plan one owner sitting up front for both tokens, and give each an
expiry date (`expires_on`; fine-grained PATs require one). Rewrite the acceptance to state the
residual honestly: the Cloudflare token is read-only for the account, and `CAIRN_STATE_DIR` names
only the scratch site. Keep the denied check for the GitHub repository only.

**M2. The migration's rewrite of 845 bullets collides with concurrent filers (lines 198-208).** Other
worktrees keep filing bullets under the freeze rule. Every line of every container file changes, so
each concurrent branch conflicts. A bullet that lands on `main` after the migration without an id
turns `main` red, even though both PRs were green alone. Fix: make the migration script idempotent
and re-run it on a rebase right before merge. Announce a facts freeze window in STATUS. Consider a
grace mode that warns on an id-less bullet for one release.

**M3. The candidate triage deletes facts, and those facts have no other surviving record (line 224).** Ruling 1 makes
the facts container the only thing that survives the reset. A Sonnet implementer that fails to find
code for a bullet is not proof that the bullet is false. Fix: delete only on positive evidence of
falsehood, with the code line cited. Everything untraced becomes `excluded`, with a reason. Record
each rejected bullet's full verbatim text and source. Have an Opus read cover the rejected list, not
only the diff.

**M4. The repository-class reader can see the answer key (lines 133, 294).** A clean checkout "at a
named commit" contains `docs/internal/record/` (the planted-defect record, the baseline failure
record) and `docs/superpowers/plans/` (pass A's list of the 14 defects, this plan). Fix: prepare the
checkout with `git archive`, excluding `docs/internal/record/`, `docs/superpowers/`, and `.git`.
Make the init or preparation check fail if those paths are present.

**M5. Reader spend has no hard stop and draws on a shared pool (lines 26-27, 107).** The runner
totals usage after the fact. Plan-login runs share the owner's rate window with every other session,
so a parallel batch can throttle the cut or a site round. Fix: give the runner a per-batch budget
that aborts the batch, and a concurrency limit declared in the batch file. Before Tasks 4 and 10,
estimate each batch (runs times the per-run figure) against the remaining ceiling.

## Minor

- **m1 (lines 148-149).** Creating `glw907/cairn-scratch-b` is an outward-facing act. Specify
  private visibility. If the cairn GitHub App uses selected-repository installation, adding the repo
  edits the production App's installation, so record it. Leave email sending off or restrict it to
  the allowlist.
- **m2 (line 156).** Teardown waits on pass 2a's close. Set token expiry as the backstop. Give the
  deletion of the repository and D1 a dry-run listing and an owner confirmation (destructive-ops
  rule).
- **m3 (line 36).** Pre-flight should check whether a 0.97.0 cut session is live (`pgrep`, STATUS)
  before Task 5 or any dotfiles push.
- **m4 (lines 70-71).** Neutral paths persist under `$XDG_CACHE_HOME`. Make teardown shred the
  per-run directory, including any `.claude/` state the CLI writes.
