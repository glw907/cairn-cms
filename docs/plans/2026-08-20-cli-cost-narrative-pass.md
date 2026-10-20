# CLI Cost-Narrative Pass (the tool's own money story)

> **For agentic workers:** execute task-by-task via `cairn-implementer` per the `cairn-pass` skill,
> the main loop reviewing each diff and verifying the full CI-derived gate list between dispatches.
> Steps use checkbox (`- [ ]`) syntax. **Read the two open questions at the bottom before task 2;
> they are Geoff's calls and they change what task 2 builds.**

**Goal:** make `create-cairn-site` tell the truth about money at every point it speaks, so a reader
consents to a deploy that actually works.

**Why this is its own pass (Geoff, 2026-08-19):** the release-debt pass corrected cairn's cost story
in the engine docs and the CLI's opening preamble, then found the same false premise in the tool's
interactive consent flow. That half is flow and prompt-order work rather than copy, so absorbing it
would have been the pass's fourth scope growth. It was deliberately cut. See that pass's post-mortem
in `docs/superpowers/plans/2026-08-19-release-debt-pass.md`.

**Why it is urgent rather than merely filed:** this gates a release decision. The cut has to decide
whether `create-cairn-site` ships or holds, and today the tool promises a free deploy that fails. If
the tool holds, this pass lands before it ever publishes.

## The fact everything must agree with

Measured 2026-08-19 against the real deployable artifact (fresh showcase install, `npm run build`,
`npx wrangler deploy --dry-run`, `gzip -9`): **3,246,163 bytes gzipped against Cloudflare's
3,145,728-byte (3 MiB) Workers Free script limit.** Over by 100,435 bytes.

A cairn site needs Workers Paid ($5/month) from its first deploy. **Re-measure at the start of this
pass rather than trusting this number**; it is a measurement, and measurements move.

**The stance, ruled by Geoff 2026-08-19 and non-negotiable in this pass:** Workers Paid is the
expectation, not an overage to explain away. State the plan, the number, and what it runs on. No
apology, no hedge ("only", "just", "a modest"), no argument that the price is good value, and no
comparison to other platforms. Confidence reads as brevity. And **do not justify the price by the
bundle measurement in reader-facing copy**: copy pinned to a number 3% over a line rots the moment
the bundle drops under it.

## What is already correct, and must not be undone

The release-debt pass already fixed these. Verify, do not rewrite:

- `packages/create-cairn-site/src/money.mjs`, `costPreamble()`: leads with Workers Paid at $5/month
  and what it runs on.
- `packages/create-cairn-site/test/fixtures/transcripts/01-create-cairn-site.txt`: matches, pinned by
  `npm run check:transcripts`.
- `docs/admin/create-your-site.md`, `docs/admin/before-you-start.md` ("What it costs" and "What a
  second editor needs"), `docs/admin/own-your-domain.md`.

---

### Task 1: re-measure, and pin the measurement somewhere a gate can see it

**Files:** Add: a note in the pass record. Possibly modify: `.github/workflows/e2e.yml`.

- [ ] Re-run the measurement end to end and record the real number in this plan before task 2 writes
  any copy. The method is in the release-debt post-mortem.
- [ ] The e2e workflow already reports the gzipped size against the free-tier line on every run
  (release-debt, commit `fa4f5437`, then reframed). Confirm it still reports and that the number it
  prints matches your measurement. If they disagree, that discrepancy is the finding and the rest of
  the pass waits on it.
- [ ] Acceptance: one number, reproduced twice by different routes. Deliverables: a measurement and a
  confirmation.

### Task 2: the deploy consent prompt stops promising a free deploy

**Files:** Modify: `packages/create-cairn-site/src/cloudflare/chapter.mjs`. Test: the package's own
suite. Fixtures: `packages/create-cairn-site/test/fixtures/transcripts/01c-resume.txt`,
`01d-resume.txt`.

**The defect:** `chapter.mjs:106-113` builds the `consentDetail` a reader reads and answers before
the tool deploys. It says the tool will deploy to "Cloudflare's **free** workers.dev hosting" and
that "The free plan is enough; nothing in this step costs money." At the measured size that deploy
fails on a free plan, so the tool breaks a promise at the exact moment it asks for consent. Both
resume fixtures carry the same text.

- [ ] Failing test first: assert the consent text does not claim the step is free, and does state the
  plan the deploy needs. Prove it red.
- [ ] Rewrite `consentDetail` to the ruled stance. It must still do its original job: name what gets
  created (one Worker, two databases, one storage bucket) and set up the browser trips.
- [ ] Regenerate or hand-update both resume fixtures; `check:transcripts` proves they agree with any
  doc block that quotes them.
- [ ] Acceptance: the new assertion red then green; `npm --prefix packages/create-cairn-site test`;
  `npm run check:transcripts`. Deliverables: one copy block, two fixtures, one test.

### Task 3: the email-admission prompt stops implying Paid arrives later

**Files:** Modify: `packages/create-cairn-site/src/cloudflare/chapter2.mjs`. Test: the package's suite.

**The defect:** `EMAIL_ADMISSION_DETAIL` at `:191-196` says Workers Paid "is what sends this site's
sign-in email, so it is needed once anyone other than you needs to sign in." Every clause is true in
isolation and the whole is misleading: it frames Paid as a later, editor-triggered bill, when the
site is already on Paid because it deployed. The prompt at `:665` ("Turn on email sign-in") inherits
that framing.

- [ ] Failing test first, proving the copy no longer presents Paid as newly required here.
- [ ] Rewrite so the plan is a fact already established and this step is about a **capability**:
  turning on sign-in email for a domain. The release-debt pass made exactly this move in
  `docs/admin/before-you-start.md`, converting "the free-until boundary" into "what a second editor
  needs"; read that section and keep the tool consistent with it.
- [ ] Check the rest of `chapter2.mjs` for any other sentence resting on "nothing up to here costs
  money". Its JSDoc reportedly does; fix every one you find, and say how many there were.
- [ ] Acceptance: the assertion red then green; the package suite; `check:transcripts`.
  Deliverables: one copy block, its JSDoc, one test, plus however many siblings turn up.

### Task 4: decide the prompt order, then make it match

**Files:** Depends entirely on open question 1 below. Possibly
`packages/create-cairn-site/src/cloudflare/chapter.mjs`, `chapter2.mjs`, `bin.mjs`.

**The question this task answers:** today the tool deploys first and asks about Workers Paid later,
because the old story said the free plan carried you until a second editor. That order is now
backwards: the deploy is the thing that needs Paid.

- [ ] **Do not start this task until Geoff has answered open question 1.** Its whole shape depends on
  the answer, and building the wrong one is worse than waiting.
- [ ] Whatever the answer, the tool must never reach `wrangler deploy` having told the reader
  something the deploy will contradict.
- [ ] Acceptance: a real end-to-end run, not only the unit suite. `create-site.yml` builds the real
  scaffolded site on CI; state plainly in the post-mortem how the flow was verified.

### Task 5: pass close

- [ ] `code-simplifier` over everything the pass changed.
- [ ] The full CI-derived gate list, derived from the workflows, run before committing. Note that
  `packages/create-cairn-site` is plain JS with its own suite as the real gate.
- [ ] Reviewer fan-out. This pass is copy and flow rather than components, so the four standing
  reviewers fit poorly; consider a fresh-context read of the whole run's printed output instead,
  judged as one document a reader experiences in order. **The defect this pass exists to fix was
  invisible to every gate and to four reviewers, and surfaced only because a real transcript was
  read next to the prose around it.** Reproduce that condition deliberately.
- [ ] Docs: `CHANGELOG.md` under `## Unreleased`, `docs/extend/migration-notes.md`, and any admin
  page whose text quotes a changed transcript.
- [ ] `ROADMAP.md`: remove the CLI money-narrative entry from Now. Check whether the four
  `create-cairn-site` first-run defects are still accurately described.
- [ ] Post-mortem appended here; `docs/STATUS.md` updated to point at the release with this pass's
  answer folded into the ship-or-hold question.
- [ ] Score both budgets: tokens spent, and the human interaction points the pass cost.

---

## Open questions for Geoff, to settle at plan approval

**1. Should the tool ask about Workers Paid before it deploys, or keep deploying first?**

Asking first is honest: the deploy needs the plan, so consenting to the deploy means consenting to
the cost. It also risks a reader abandoning at a paywall before they have seen anything work, and it
means the tool must handle "no" at a point where today it has a working free path to fall back on.

Keeping the current order means the reader's first deploy fails unless they already have Paid, which
is the status quo defect. A middle path exists: keep the order, but have the consent prompt state the
plan requirement plainly and check the account's entitlement before attempting the deploy, so the
failure becomes a clear message rather than a wrangler error.

This is a product-shape call about a reader's first five minutes, not a code question.

**2. Does the tool verify the account is on Workers Paid, and what does it do when it is not?**

Related but separable. There is an existing `paid-plan-missing` mapping in the codebase keyed on
entitlement wording (noted in the friction log's audited carry-forwards), so some of this machinery
may already exist. Options run from doing nothing, through a preflight check that refuses early with
a clear message, to a check that offers to open the upgrade page. The heavier the answer, the more
this pass grows, so it is worth bounding deliberately.

**A note on sizing.** This plan is four working tasks. Its predecessor grew four times and split
late. If task 4 turns out to carry a flow redesign rather than a reordering, that is the signal to
split this pass rather than to split task 4.
