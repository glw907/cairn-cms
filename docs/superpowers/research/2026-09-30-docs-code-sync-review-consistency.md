# Docs-code sync amendment: consistency review

Lens: consistency against ratified documents, plus a spot check of every citation and number.
Target: `docs/superpowers/specs/2026-09-30-docs-code-sync-design.md` at `15a71698`. Reviewer is
read-only; nothing else was touched.

Verified clean, no finding: the four corrected fact ids and what each said (sweep record
72-88); DAD-2 as defect 6; EXB-4 = `f:jsh6ae` and EXB-5 = `f:k5uws5` (sweep record 111); DAD-1 =
`f:shv6wv`; the 131 / 4 / 12 / 2-page / "none refuted" figures; the 3M sweep share and the
7.75M and 9.9M page figures against the 2a plan; typescript-eslint `docs.test.mts` with its
named allowlist, TypeDoc `requiredToBeDocumented`, Swimm, API Extractor, Tan et al. EMSE 2023,
Huang ICLR 2024, Chroma, Kubernetes, Rust stabilization, READU, and the deferred table's Go,
rustdoc, Sphinx, and doctest rows, all against the prior-art record; every mechanism-1 option
named has a sweep fact.

## Findings

### CO-1 (major, OWNER FORK): mechanism 2 fails its own lean guard

**Location:** amendment `:105-108` (and the Brief `:13-15`).

The amendment names four failures that the staleness hash "catches": `f:kkp5bi`, `f:hdrzxd`,
`f:7wiuwr`, and `f:i4fj93`. None of them is drift. All four bullets were first filed on
2026-09-15 (`b9282369`). The code each one misdescribes last changed before that date:
`signing.ts:105-121` on 2026-07-13, `content-routes-entry-write.ts:116-118` on 2026-09-09,
`concepts.ts:170-173` on 2026-07-15, and `site-resolver.ts:84-92` on 2026-07-02. So each fact
was wrong when it was filed. A stamp taken at any verification would have hashed code that has
not changed since, and the gate would stay green today. The amendment's own deferred table
(`:180`) says the same thing about `f:7wiuwr`: "real symbols misattributed," which is an error
at authoring time. The sweep found no instance of "Source resolves, code changed underneath."
The guard's rule (`:59`) is that a mechanism failing a condition "is deferred with a trigger,
not built." The prior-art record (`:36-41`) carries the same misreading.

**Options:**
- (a) Defer mechanism 2. Trigger: a release sweep or fact read finds a fact whose cited
  declaration changed after the fact was verified.
- (b) Keep it, and amend the guard openly so condition 2 admits a prospective class with the
  prior art's evidence (Jain, Swimm).

**Recommendation:** (a). Mechanism 2 is the one mechanism that puts a standing gate on every
engine pass (see CO-7). The release sweep is the instrument that would detect real drift, so
the trigger is observable. Under either option, fix the "Failure it catches" line so it stops
citing the four facts as drift.

### CO-2 (major, OWNER FORK): the 2a projection breaks the parent's budgeting rule at plan time, and the arithmetic runs low

**Location:** amendment `:204-210`; parent `:181-182`; plan `:99-112`.

The parent requires the planned total to sit at or below 80 percent of the ceiling, "so the
global 80 percent stop fires only on an overrun." The amendment's own planned projection is
16.5M, which is over S6's 14.4M flag before any overrun happens.

The arithmetic also runs short. After task 1, the plan's remaining non-page shares are:

| Share | Amount |
| --- | --- |
| Task 2 | 0.4M |
| Task 4 | 0.6M |
| Task 6 | 0.8M |
| Task 7 | 0.8M |
| Conductor | 0.4M |
| **Total** | **3.0M** |

With that total, the projection is 4.9 + 1.5 + 7.75 + 3.0 = about 17.2M at planned rates, and
about 19.3M at pass A's rate. The amendment gives 16.5M and 18.7M. That total still leaves out
this spec's review fan-out and the plan re-review.

"4.9M spent" is also unsourced, and it looks low. The sweep alone was about 4.4M. That leaves
about 0.5M for the outline, the prior-art research, the errata, and task 1, and task 1's share
alone is 0.8M. The plan's ledger is empty.

**Options:**
- (a) Carry the ceiling question in this spec's approval sitting, now.
- (b) Defer it to the pilot checkpoint, as written.

**Recommendation:** (a). The approval sitting is already happening. The parent's rule exists
so that the flag means an overrun and not a planned state. Source the spent figure from
`/cost` plus the dispatch usage blocks, per the plan's counting rule (`:116`).

### CO-3 (major): the parent's ratified meaning changes without errata

**Location:** amendment `:3-7`, `:62-79`; parent `:17-18`, `:155-157`, `:39`.

"Where it and the parent disagree, this spec governs" does not name the disagreements. The
amendment changes four ratified points silently:

- The parent's Brief says "No new check is built," and the amendment adds an option-coverage
  gate.
- The parent's Brief says "The budget goes to pages" (reset ruling 7 was replaced by "spend on
  the pages"). About 6M of 2a now goes to non-page work.
- Each stage's planning allowance of "about 1M" becomes a sweep measured at 4.4M (`:78-79`).
  Across stages 3, 4, and 5 that is roughly +10M to +13M against R8's 30M. The amendment
  records the measurement but never states the initiative-level consequence.
- Extend grows by two pages for 2b.

**Fold:** add an "Owed errata to the parent" list naming each changed passage: the Brief's
two sentences, the Budget's per-stage overhead, the stage flow's new step 0 (the sweep before
the outline), and the stage table's stage 2 page count. Also state the projected initiative
total against R8.

### CO-4 (major): the release sweep's filing step has no target once an arm has merged

**Location:** amendment `:137-139`, `:72-74`; harvest spec H4 (`:19`); 2a plan `:15-16`.

Mechanism 3 "runs the planning-phase shape above," and that shape's filer "places each fact on
an outline page or adds a page (S5)." Under H4 and the 2a plan, outlines are scaffolding that is
deleted at the arm's merge. After the rebuild, no outline exists to place facts on, and no R10
page exists for an S5 keep-or-cut decision.

Filing facts alone leaves published pages stale. That conflicts with `CLAUDE.md` ("a public-API
change is not done until its reference page matches") and with cairn.pub rendering the tarball
the release cuts.

**Fold:** for a merged arm, the release sweep files each verified gap as a fact and names the
rebuilt page it affects. The page fix runs under "Edits after the chain" before the version is
set. A gap with no page home becomes a friction entry, not a new page.

### CO-5 (major, OWNER FORK): a release sweep on every cut conflicts with the urgent release trigger

**Location:** amendment `:134-135`; `cairn-release` §1 (`:27-31`); `CLAUDE.md` "Releases".

Trigger (1) is a consumer that needs an export now, which forces the publish-before-push order.
A fanned-out sweep with a verifier before every cut puts a multi-million-token, multi-hour step
in front of that urgent path. Nothing budgets release sweeps.

**Options:**
- (a) Sweep on every cut.
- (b) Sweep only on trigger (2) cuts. A trigger (1) cut carries its window into the next sweep.
- (c) Sweep once at the close of the docs initiative, then on trigger (2) cuts.

**Recommendation:** (b). It keeps the urgent path intact and still windows every change into
some sweep.

### CO-6 (minor): the design-review examples misstate their filing, and one touches a ruling

**Location:** amendment `:148-152`; sweep record `:111`, `:116`; `engine-rulings.md:935-940`.

The amendment says the four examples were "found as defects." Only DAD-2 is a defect. DAD-1,
EXB-4, and EXB-5 were filed as `[verified]` gap facts (`f:shv6wv`, `f:jsh6ae`, `f:k5uws5`).
They are not in the friction log, so the triage stream this section relies on never sees them.

EXB-5 (the hero and social image are read only under the key `image`) also sits against the
ruling `audit-adapter-imagefield`, which says `ImageField` "carries the seo marker designating
the social-card image." `CLAUDE.md` requires reading the rulings ledger before re-arguing an
item.

**Fold:**
- Say "found as gaps or defects."
- File the three as friction entries now.
- Have the stage-close triage check `engine-rulings.md` and the charter premise test before it
  promotes an engine change.

### CO-7 (major): mechanism 2's rules do not live where they execute

**Location:** amendment `:120-125`, `:212-223`.

"An engine pass that changes a stamped declaration re-verifies those facts in the same pass" is
a rule for every engine pass. "The reviewer checks each re-stamp against a fact-read record" is
a rule for `diff-reviewer`. The acceptance list edits neither place:

- `cairn-pass` "Documentation (step 5)".
- The `pass-core` chain.
- The `diff-reviewer` or `cairn-implementer` definitions.

Implementers "never stamp," so the first engine pass after 2a meets a red `check:facts` at
close with no skill step telling the conductor to dispatch a fact read.

The facts README also owes three edits. Its filer roles (`:76-82`) do not name the sweep's
filer, which files `[verified]` facts. The README has no mention of the lockfile or stamp, and
it states no stamp rule.

**Fold:** add acceptance lines for these edits. The whole finding lapses if CO-1 defers
mechanism 2.

### CO-8 (minor): Design-review prior art is outside the record, and one citation is stale

**Location:** amendment `:152-154`, `:54`.

Guard condition 1 is defined as "the prior-art record's methods table." The Rust RFC, Amazon's
working-backwards practice, and Stripe's docs-led API review are not in the record.

The current `rust-lang/rfcs` `0000-template.md` also has no "How do we teach this?" section.
RFC 1636 added that heading, and it was later replaced by "Guide-level explanation" (fetched
2026-09-30).

**Fold:** cite "Guide-level explanation" (or RFC 1636 by date). Either add the three sources
to the record with URLs or loosen condition 1's wording.

### CO-9 (minor): the "one exception" has no referent and no format

**Location:** amendment `:163-165`, `:195-197`; facts README `:13-17`.

"Handled as above" points at nothing. The handling appears later, as "a one-line note on its
fact." The fact grammar has no note slot: one claim, `Source:`, and one trailing tag.

"The drafter documents the intended behavior only where the code honors it" restates the rule,
so the passage names no exception.

**Fold:** delete the exception. The fact records the code's behavior, including a defect's
consequence, and the page states that behavior as it is.

### CO-10 (minor): the stage close "fixes in the engine" while engine fixes never land in a docs stage

**Location:** amendment `:168-169` against `:172`.

**Fold:** reword the stage-close outcomes as "routed to an engine pass (ROADMAP tier)," "promoted,"
or "deleted."

### CO-11 (minor): the coverage gate sits outside the docs gate list

**Location:** amendment `:88`; parent `:266-272`; `test.yml:115`.

The parent makes `docs-gate.mjs` the one list that the chain gate and CI both read. A gate that
reads facts and reference entries belongs in that list, not only in `check:close`, which CI
does not run whole.

**Fold:** name `docs-gate.mjs`.

### CO-12 (minor): the lock simplification is assigned to the wrong tool and scope

**Location:** amendment `:198-200`.

`cairn-docs-outline` lives in `~/.dotfiles`, outside the pass's repo diff that the close's
`code-simplifier` covers (plan `:296`). Removing race handling changes behavior. That goes past
the global rule's remit for `code-simplifier`, which preserves functionality.

**Fold:** make it a one-line dotfiles task with a `diff-reviewer` read, or drop it.

### CO-13 (minor): the Brief's counts misstate the sweep

**Location:** amendment `:15-18`.

"140 gaps that independent verifiers confirmed" is wrong. 140 is the raw finding count,
defects included. After splits the verifiers returned 167 records: 148 verified gap claims, 14
defect verdicts, and 5 already covered. "Most of the majors were options inside types..." has
no source. The only severity count on record is 27 majors among the 74 surface findings (plan
`:36`), with no breakdown by class.

**Fold:** use "140 raw findings (167 after splits), 148 verified gaps." Cut the majors sentence,
or source it.

## Over-ceremony note

Beyond CO-1 and CO-5, the design-review section is the lightest addition: one report field,
riding the existing friction log. Its unbudgeted cost is the conductor verifying every entry
against code. Cap it: entries that name no fact id or `file:line` are dropped unverified.
