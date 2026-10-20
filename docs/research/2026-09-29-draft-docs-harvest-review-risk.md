# Draft docs harvest: data integrity and domain risk review

**Lens:** data integrity and domain risk. **Targets:** `docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md`
(spec) and `docs/superpowers/plans/2026-09-29-draft-docs-harvest.md` (plan), at `7e57601d`.
**Question:** can knowledge or a shipped contract be lost or silently corrupted, and is any
guard over-built for what it protects?

Evidence gathered for this review (read-only): `git diff main...theme-identity-b` and
`...theme-identity-c`, pass C's plan on `theme-c-plan`, `scripts/checks/check-facts.mjs`,
`scripts/checks/check-readiness.mjs`, `scripts/checks/shipped-anchors.json`, the facts container,
`packages/create-cairn-site/src/substitute.mjs`, the `tool/` docs constants, cairn-pub's
`package.json` and `src/lib/docs/loader.ts`, and a live probe of `cairn.pub`.

Counts: 2 blocker, 6 major, 4 minor correctness; 2 over-ceremony.

## Correctness findings, by consequence

### DR-1 (blocker): nothing checks that a ledger lists every claim on its page

**Location:** spec:39-41, spec:81-88; plan:3-4, plan:110-112.

**Defect.** The verifier proves every *listed* claim has a valid disposition. It cannot tell a
complete ledger from one that skipped a paragraph, a table row, a callout, or a code block. The
plan's goal ("prove every claim") therefore rests entirely on the auditor's diligence and a
sampled reviewer read. This is also the crash case: an auditor that dies after writing half a
ledger leaves a file the verifier passes, because the verifier checks shape, not coverage. A
skipped claim is the one loss the program cannot recover, since drafters never see the old page.

**Fold.** Give each claim a `lines` field: the line or range it comes from in the audited blob.
The verifier adds one rule: every non-blank line of the page at `blob`, front matter excluded, is
covered by some claim's range. That includes headings, which become `navigation` cuts or slug
facts. The check is mechanical and cheap, and the blob pin keeps line numbers stable. It turns
H1's "disposes of every one" into a gate. It also makes a partial ledger from a crashed or
abandoned chain fail by name. Add a fixture case for an uncovered line to task 1's acceptance.

### DR-2 (blocker, OWNER FORK): the "file-disjoint from pass C" premise is false, and pass B is unaccounted for

**Location:** spec:17 (H5), spec:141-144; plan:185-188.

**Defect.** The spec says the pass is "file-disjoint from theme pass C except for facts-file
appends". Geoff approved "no ordering constraint" (H5) on that basis. The branches show otherwise:

- **Pass B** (`theme-identity-b`, unmerged, PR #95, merging together with C) edits two
  deletion-list pages, `docs/extend/build-a-site-by-hand.md` and `share-a-draft-preview.md`. It
  also *rewrites* existing bullets rather than appending: about 57 `editors.md` bullets are
  re-sourced for the `components` to `admin` rename, plus bullets in `admin.md`, `extend.md`, and
  `reference.md` (222+/127-). The spec never mentions pass B.
- **Pass C's plan** edits `docs/extend/design-your-site.md` in task 13, another deletion-list page
  (chain Z). It adds a routing line to `skills/cairn-extend/SKILL.md` in task 12, which task 8
  retargets. It edits `scripts/checks/check-public-tokens.mjs` in task 2, which task 8 narrows. It
  re-emits `templates/waymark/**` and edits `CHANGELOG.md`.

If the harvest merges first, B+C's merge meets a modify/delete conflict on three pages. Taking
the delete silently drops B's and C's page edits, none of them audited. Keeping the file
resurrects an old page in the emptied arm, the exact leak the program exists to prevent. The
facts conflicts are same-bullet rewrites, not appends, so task 7's "keep both sides" rule does
not apply. Nothing tells B+C's conductor how to resolve them. After the deletion no verifier
runs, so a ledger `fact` id whose bullet B reworded or removed stops meaning its claim with no gate
noticing.

If B+C merge first, the harvest's blob check and task 7's re-audit catch the page edits. That
path is safe as designed.

**OWNER FORK: sequencing against theme passes B and C.**
- (a) Keep H5 and add a merge rule to pass C's plan for B+C landing after the deletion: take the
  delete, audit the changed hunks into facts, and re-run a ledgers-only verifier.
- (b) Run tasks 1 to 6 now, but hold task 7 (merge `main`, full verifier) and task 8 until B+C
  are merged on `main`.
- **Recommendation: (b).** It costs clock time only, no tokens, and it moves every conflict
  into the one place built to absorb it: task 7's blob check plus a targeted re-audit. STATUS
  already says "Pass C's `0.98.0` cut is first", so `0.98.0` carries the old arms one last time
  and the release question goes away. Whichever option Geoff picks, correct spec:141-144 to name
  pass B and the real overlaps.

### DR-3 (major): 39 facts cite a page this pass deletes, and nothing assigns their re-sourcing

**Location:** spec:59-71 (the audit steps); plan:57-60, plan:208-210.

**Defect.** In today's container, 39 bullets name a deletion-list page in their `Source:`. Fourteen
of them are `path:line` pointers, such as `docs/admin/own-your-domain.md "Turn on sign-in email"`
beside code, or a bare basename. `check:facts` resolves those pointers, so it fails the moment
task 8 deletes the pages. The rest are doc-only citations the gate does not resolve. Some are
tagged `[verified]` and `[external]`, which the verifier accepts as a valid disposition target
while their only cited evidence disappears. The audit's step 4 covers `[candidate]` and
`[docs-drift]` only. That leaves task 8, an implementer told to "repair links inside
`docs/internal/`". It will retarget or strip these `Source:` fields as if they were links, which
corrupts provenance without re-verification.

**Fold.** Add a step 5 to the audit: every bullet in the arm's facts file whose `Source:` names a
deletion-list page is re-sourced to code or a vendor URL and re-traced. If the page was its only
evidence, it is retagged `[candidate]` and then resolved. Add a verifier rule: no bullet anywhere
in the container names a deletion-list path in its `Source:`. Task 8 then never touches a
`Source:` field.

### DR-4 (major): task 8's residue allowlist contradicts the shipped-contract constraint

**Location:** plan:66-67 versus plan:229-230; spec:117-122.

**Defect.** Acceptance says the discovery grep returns only `relink.json`, `CHANGELOG.md`, the
ledgers, and "Go constants naming `cairn.pub` anchors". The grep also matches contract files the
plan forbids changing, and none of them is on that list:

- `tool/internal/doctor/check_referrer.go:36`, which holds a *repo path*
  (`docs/admin/is-it-working.md#...`), not a `cairn.pub` URL, and which the doctor prints.
- `tool/internal/spine/conditions.json`, with its `is-it-working.md#...` docsAnchors.
- `scripts/checks/shipped-anchors.json`.
- The `tool/internal/render/testdata/json/*.json` goldens and the Go tests that assert these
  strings.

An Opus implementer that must satisfy both clauses will either fail acceptance or "repair" a
shipped contract to empty the grep. The second outcome is silent: `check_referrer.go`'s constant
is covered by no conditions gate.

**Fold.** Define the residue as an explicit path list in task 8 covering every contract file
above. Record each one in `relink.json` with the action `contract, unchanged`, so the acceptance
grep checks against that list.

### DR-5 (major): wrong cuts and wrong rejections go unsampled, and `duplicate-of:<id>` is never resolved

**Location:** spec:43-50, spec:73-74, spec:85-88; plan:76-78.

**Defect.** A `cut` or a `[rejected]` retag is where a true claim disappears for good. A `fact`
disposition at least points at something. The review focus samples five `fact` dispositions per
batch and no cuts. The verifier checks only that a cut reason is on the list, so
`duplicate-of:f:zzzzzz` passes with a bogus id. The spec also leaves open whether `<id>` names a
fact or another claim, and claims carry no ids. Near-miss mappings hide mostly where many claims
fan in to one broad bullet.

**Fold.**
- **Verifier:** `duplicate-of:<id>` must name a fact id that resolves, defined as such in the
  spec.
- **Per-batch `diff-reviewer` sample:** five judgment cuts (`marketing`, `illustrative`,
  `external-trivia`, `stance-without-owner-basis`), every `[rejected]` retag the batch made, and
  every fact id with three or more claims fanning in. The verifier already prints the counts
  that locate these, so the added read stays small.

### DR-6 (major): the blob check expires at task 7, but `main` keeps moving until the PR merges

**Location:** spec:85; plan:73-75, plan:188-190, plan:240.

**Defect.** The verifier compares each ledger's `blob` to the working-tree page, which task 8
deletes. Between task 7's `main` merge and the PR merge (tasks 8 and 9, plus review and Geoff's
go), a site pass's `site-docs/<site>-<pass>` branch or pass B/C can land an edit to a
deletion-list page. The final merge resolves that as a modify/delete conflict with no audit.

**Fold.** Let the verifier read page blobs from a git ref when the page is absent (`--ref
origin/main`, via `git rev-parse <ref>:<path>`). Task 9 runs it against `origin/main` right before
merging. Any mismatch sends the named pages back to task 7's targeted re-audit.

### DR-7 (major): the readiness re-arm keys on the page, so a moved checklist disarms the gate for good

**Location:** spec:117-122; plan:217-219.

**Defect.** `check:readiness` and `fixes_test.go` fall back to the committed anchor list "while
the page is absent" and re-arm "once it exists". Suppose the admin stage's outline, drawn fresh
from jobs, renames or splits `is-it-working.md`. The gate then stays in list mode forever and
passes. Released binaries print `https://cairn.pub/docs/admin/is-it-working#<slug>`, a path plus
fragments, so the rebuilt arm must keep that path or ship a redirect, and every shipped anchor
must resolve. Spec:108 already scopes the other gates to "the arm's absence". This one is scoped
to the page's absence instead.

**Fold.** Allow list mode only while `docs/admin/` holds no `.md` file. Once the admin arm has any
page, `docs/admin/is-it-working.md` must exist, and every `shipped-anchors.json` entry must
resolve on it. Pin that in task 8's two-way test and in `relink.json`'s stage-3 re-arm entry.

### DR-8 (major): the cairn.pub premise is wrong, and the real exposure is the pending repin

**Location:** spec:117-118, spec:124-127; parent amendment "Release".

**Defect.** cairn-pub's `package.json` pins `0.94.0-rc.1`, not `0.97.0`, and STATUS records it as
un-pinnable since `0.95.0`. A live probe returns 404 for `https://cairn.pub/docs/admin/is-it-working`
today, and its loader expects `guides`/`reference`/`explanation` arms. The harvest therefore
breaks no live link. It is wrong, though, to claim that the pin "shields readers" and that "no
shipped link breaks": the links are already broken. The real risk lies ahead. The cairn-pub pass
that fixes the pin (`docs/internal/record/2026-09-22-cairn-pub-docs-handoff.md`) will pick a
version, and if it picks any release cut after the deletion, cairn.pub relaunches its docs with
the reference arm only.

**Fold.** Correct spec:117 and the changelog wording to state the actual pin and the live 404s.
Add one line to the cairn-pub handoff record: repin to the last release cut before the deletion
(or hold) until the rebuilt arms ship. The handoff record is the only artifact that pass reads.

### DR-9 (minor): the facts container still carries old-page text that drafters will read

**Location:** spec:69-71, spec:56-57.

**Defect.** Drafters read facts bullets. Today's container quotes old pages in
`[docs-drift: page says "..."]` qualifiers, in some `[candidate: ...]` qualifiers, in `Source:`
fields citing old headings in quotes, and in `## Harvest record` notes. The spec retags drift
bullets but never says to drop the quote, so old framing survives the deletion inside the
drafters' own input.

**Fold.** When an auditor retags or re-sources a bullet (step 4 and DR-3), it drops any quotation
of the old page. Each arm file's `## Harvest record` moves under `docs/internal/record/harvest/`,
which drafters never read.

### DR-10 (minor): task 8's gate omits the scaffold package's tests

**Location:** plan:197-199, plan:207.

**Defect.** `packages/create-cairn-site/src/substitute.mjs:62-82` exact-matches a template comment
that names `docs/extend/wire-the-delivery-surface.md`. Task 8 changes the showcase comment,
re-emits the template, and must change the constant in lockstep. `npm test` and `check:close`
do not run `npm --prefix packages/create-cairn-site test`, so a mismatch shows up only in CI's
`create-site.yml`.

**Fold.** Add `npm --prefix packages/create-cairn-site test` to task 8's gate.

### DR-11 (minor): the deletion list is a frozen constant, so a page added after task 1 escapes both audit and deletion

**Location:** plan:53-56, plan:103-104, plan:213.

**Defect.** A narrative page that lands on `main` after task 1 appears on no list. Pass C, a site
pass, or a `site-docs` branch could add one. It gets no ledger, and "nothing else under `docs/` is
deleted" keeps it, so it survives as unaudited old-style content in the emptied arm.

**Fold.** The verifier asserts that the glob (every `.md` under the three arms plus the two front
doors, minus the three kept pages) equals the exported constant, and fails naming any
difference.

### DR-12 (minor): the basename grep in task 8 cannot meet its own acceptance criterion as written

**Location:** plan:201-203, plan:229.

**Defect.** Grepping bare basenames such as `README`, `architecture`, `content-model`, or
`security-model` matches thousands of unrelated lines. The "returns only the allowed residue"
post-condition can never be satisfied literally, which invites the implementer to relax it
informally.

**Fold.** Grep `<basename>.md` for each page, and for the four indexes grep path-qualified forms
(`(admin|editors|extend)/README`, `docs/README`, `../README.md` inside the arms).

## Over-ceremony, by cost

### OC-1 (minor, about 0.3 to 0.5M tokens): two-way test-first pinning on every narrowed gate

**Location:** spec:105-109; plan:228-229.

Pinning all nine or so narrowed gates both ways, each with its own fixture pages, is the bulk of
task 8's cost. Most of these gates share one condition: whether the arm is empty. **Fold:** write
one shared `armHasPages(arm)` predicate with its own two-way test, and give each gate a single
empty-arm test. Keep full two-way pinning only where a contract rides on the gate:
`check:readiness` with `fixes_test.go` (DR-7), and `check:arm-indexes`.

### OC-2 (minor, negligible tokens, real reader cost): `relink.json` records file and line

**Location:** spec:111-113; plan:223-225.

Line numbers go stale at the next commit that touches the file, which will be weeks before stages
2a to 5 consume the entries. **Fold:** record the file plus a short grep-able context string
instead of a line.

## Checked and sound

- **Crash or abandoned chain mid-audit.** A missing ledger fails `--arm` and the full verifier by
  name. An orphan fact filed before the crash is a valid `[verified]` bullet and harmless. The one
  silent case is a partial ledger, which DR-1 closes.
- **Parallel chain facts merges (X, Y, Z).** New bullets go into disjoint page sections, and a
  duplicate id or a malformed bullet from a bad resolution fails `check:facts` loudly. Only
  pass B's same-bullet rewrites (DR-2) fall outside this.
- **Fact id collisions across worktrees.** `mintFactId` draws from `crypto.randomBytes`, and
  `check:facts` fails a duplicate across files.
- **Consumer sites.** No consumer imports a doc path. Installed skill copies re-sync through
  `cairn-guidance`'s tree-hash freshness, so task 8's retargeted `cairn-extend` router table
  reaches consumers on upgrade.
- **Proportionality of the ledger, blob, and verifier design.** Sized right for a deletion whose
  subject drafters can never consult again.
