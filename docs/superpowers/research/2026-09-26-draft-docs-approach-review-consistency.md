# Draft docs approach spec: consistency review

**Target:** `docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md` at `e00fcf70`.
**Lens:** consistency with ratified documents and the accuracy of the spec's citations.
**Result:** 0 blockers, 8 majors, 10 minors. Owner rulings R1 to R7 are treated as authoritative.
The findings below flag only places where R1 to R7 conflict with other text the spec does not
retire, or where the spec conflicts with or omits a ratified requirement.

## Citations checked and found accurate

- Reset rulings 1, 2, 3, 4, and 7 are numbered and worded as the spec says
  (`2026-09-23-docs-reset-design.md:117-132`).
- The 2026-09-08 staged order (reference, extend, admin, editors, front door) matches
  `2026-09-08-docs-standard-design.md:792-798` and the `docs-rebuild-not-edit` memory.
- The 2026-09-21 ruling (draft docs first, then the site round tests them, and site agents may
  change the docs directly) matches the `one-release-then-model-sites` memory's "REVISED ORDER".
- The brief path `docs/internal/briefs/<track>/<page>.json` matches `docs/internal/briefs/README.md`.
- The page counts (9 admin, 8 editors, 33 extend) match the tree, but each count includes the
  arm's README (see m4).
- The Doc Detective spike does say "a few dozen lines" (`2026-09-23-doc-detective-spike.md:68`),
  but it sized a different thing (see m8).
- The "40 percent" figure exists, but its attribution and control are wrong (see M5).

## Majors

### M1. "The 2026-09-08 docs standard stands" is broader than what the spec keeps

**Location:** spec:41-43.

The spec says: "The 2026-09-08 docs standard stands: pages are rebuilt, never edited, with
reference entries edited in place." The standard is much more than direction (a). The spec
silently replaces or omits these ratified parts of it:

- Direction (b), "A fact harvest runs per track before any page brief is written" (standard:10-11).
  The spec runs a per-page harvest inside the chain instead (spec:108-112).
- The two rules above the standard, rule 2 in particular (see M2).
- The coverage diff: "A separate agent, never the drafter, compares the drafted page's claims to
  the ledger after the draft exists and reports the misses" (standard, Rationale). The spec has no
  coverage-diff step.
- The page-type registry, the templates, `check:anatomy`, `check:headings`, `check:prose-read`,
  and the receipt, or the owner's substitute of "a PR artifact plus one ledger row per page"
  (memory `docs-rebuild-not-edit`). None of these were ever built (`docs/internal/templates/`,
  `docs/internal/page-types.md`, and `page-type-rulings.md` do not exist), and the spec neither
  builds nor retires them. The spec's outline does assign "its page type" (spec:87), but no
  registry defines the types.
- Part V, "A page must be tested with a reader before it ships", and the owner-accepted "nine
  reader sittings". R4's two sheets replace this, but the spec does not say so.
- The tuning checkpoint's seven items and stop rules (standard:808-860). The spec's checkpoint
  (spec:155-160) keeps only spend, cost per page, exemplar swaps, and fold rules.
- The figure rules (see m3).

Because the sentence reads as "the whole standard stands", a plan author or reviewer holding the
standard will find a conflict on every item above.

**Proposed fold:** replace spec:41-43 with an explicit ledger. Directions (a) and the quarantine
half of (b) stand. The per-track harvest becomes a per-page harvest. Rule 1 (owner claims) stands,
enforced by the facts owner tier and `check:provenance` (`docs/internal/facts/README.md:39-49`).
State M2's outcome for rule 2. The registry, templates, anatomy and prose-read gates, receipts,
coverage diff, the nine reader sittings, and the seven-item tuning checkpoint are retired, and R4
and this spec's checkpoint replace them. Name the `docs-rebuild-not-edit` memory as updated to
match in stage 0.

### M2. Autonomous whole-page drafting conflicts with the "one section per read" rule. OWNER FORK

**Location:** spec:91 ("Every page goes through the page chain") and spec:113-114.

The standard's rule 2 says: "A page for an outside reader must be drafted one section per read.
No such page may be drafted end to end in an autonomous run." (`2026-09-08-docs-standard-design.md:68-69`).
The global `~/.claude/CLAUDE.md` still carries it: "Any page an outside reader opens leads with a
one-paragraph brief and carries one section per read." The page chain drafts every page, the
front door included, end to end in one `cairn-docs-drafter` dispatch. No owner line retires the
rule, and R3's outline-plus-sample review is a different control.

This is a ratified owner rule, so retiring it is the owner's call.

- **Option A:** keep the rule for the front door (stage 5) only. The drafter writes
  `why-cairn.md` and the READMEs one section per dispatch, with a read between sections.
- **Option B:** keep the rule for every outside-reader arm (front door, editors, admin).
- **Option C:** retire the rule. R3's owner sample and the consistency read replace it, and the
  global `CLAUDE.md` line changes to match.

**Recommendation:** Option A. The rule was born from the front-door failure, and stage 5 is small.
Whichever option Geoff picks, the spec states it, and stage 0 edits the global line if needed.

### M3. The freeze-lift list misses three places that enforce the freeze, and the site-agent write path is unruled

**Location:** spec:67-70 (Stage 0 acceptance).

The spec lists `CLAUDE.md`, the `site-pass` and `engine-consult` skills, STATUS, and the
`docs-rebuild-not-edit` memory. The freeze and the old cross-repo rule are also enforced in these
places:

- `docs/internal/facts/README.md:119-140`: "frozen against rewrites ... the docs rebuild after the
  site round does that from this container, once". It also carries the cross-repo rule, "A
  site-pass agent never edits the cairn-cms checkout directly ... `site-docs/<site>-<pass>`".
- `docs/internal/docs-register.md:225-226`: "Existing pages on the three frozen narrative arms ...
  are swept at the docs rebuild, never before".
- `~/.claude/skills/cairn-pass/SKILL.md:153-163`: "narrative arms frozen against rewrites". This
  skill is the one every cairn pass loads, so it is the strongest execution-path home.
- The `docs-reset-initiative` memory still lists "the six-audience ruling" as a survivor, which R1
  drops.

The `one-release-then-model-sites` memory also records the write path for site agents as open:
"the write path for site agents (a branch and PR per site pass was the conductor's suggestion,
unruled)". Spec:70 says only "site-pass agents follow the 2026-09-21 ruling", which does not
settle it. The `CLAUDE.md` rule that "A site-pass agent never edits the cairn-cms checkout" stays
in force until the spec replaces it.

**Proposed fold:** add the three files and the memory to the stage 0 list. State the write path
(a method call, so it is Claude's to make, not a fork). The recommended path is a
`site-docs/<site>-<pass>` branch and a PR per site pass, written by the site pass's own agents
rather than batched by the conductor. The cross-repo rule changes in `CLAUDE.md` and the facts
README to match.

### M4. The pre-draft harvest cannot produce facts the draft is allowed to cite

**Location:** spec:110-112 and spec:115-119.

The spec says a missing fact "is found in code or config and filed as a sourced container bullet
under `check:facts` before drafting". The facts README says: "A drafter or a redraft ... files a
new fact only as `[candidate]` and never retags one. The chain's independent fact read ... traces
it to code and retags it, so a page never vouches for its own citations."
(`docs/internal/facts/README.md:76-80`). `check:provenance` fails any page that cites a
`[candidate]` bullet (`docs/internal/briefs/README.md`, "What the check fails").

In the spec's chain, the fact read that would retag runs at step 4, after the step 3 gate that
runs `check:provenance`. Either every newly harvested fact fails the gate, or the page-inputs
agent tags its own bullets `[verified]`, which breaks the independence rule.

**Proposed fold:** the page-inputs agent files new bullets as `[candidate]`. A separate Opus
verification read retags them before the draft, as one pass over that page's new bullets. The
fact read at step 4 then checks claim-to-fact matching only. Update the facts README's
"New facts from the page chain" paragraph, which still names the removed
`docs-page-chain-v2.js`.

### M5. The 40 percent citation is misattributed, and the cited control was different

**Location:** spec:111-112.

The spec says: "This per-page harvest closes the 40 percent reproduction gap draft docs pass A
measured." The figure comes from the 2026-09-21 draft-docs spec's review, not pass A:
"The review measured the container at 40 percent of the actionable claims on two admin pages,
with step order, success signals, warnings, and prompt strings the usual casualties"
(`2026-09-21-draft-docs-design.md:191-193`). The control that spec adopted was a claim-level
dispositions diff over the old page ("every claim on the old page the container lacks, each with
a disposition", ratified by an Opus read), plus an ordered step skeleton. HISTORY:403-406 records
the same control working in pass A (61 statements, 51 filed, 10 cut).

The new spec's page-inputs agent reads the old page "for its list of topics" only. The
casualties the review named (step order, success signals, warnings, prompt strings) are details
that a topic list does not carry. So the claim that this harvest closes the gap has no evidence
behind it. The 2026-09-08 standard also harvested from the old pages' claims, on the rule that
"A published page is never a proving source." That rule keeps facts, not prose, and is
consistent with reset ruling 1 ("Only verified facts survive").

**Proposed fold:** fix the attribution. Let the page-inputs agent extract the old page's claims
(not its prose or structure) as a verify-or-cut checklist, each claim filed as a sourced bullet or
cut with a reason. That is the measured control, and it fits ruling 1.

### M6. Rebuilt pages break the doctor's anchor contract, and redirect rows cannot fix it

**Location:** spec:88-89 (the outline's rename and redirect rows) and spec:164-165.

The spec protects page URLs with redirect rows because "the `cairn` binary prints
`cairn.pub/docs/<arm>/<page>` URLs". It does not cover fragments. `src/lib/diagnostics/conditions.ts`
carries `docsAnchor` values such as `is-it-working.md#force-https-at-the-edge`, and the Go tool
ships the same contract in `tool/internal/spine/conditions.json`, which is compiled into the
released binary and gated by `check:tool-conditions`. A page rebuilt "from a fresh outline" with
new headings silently breaks those anchors. A server redirect cannot rewrite a fragment. The
`docs-to-facts-reshape` memory also records seven check scripts (`check-snippets`,
`check-symbols`, transcript blocks, `check-arm-indexes`, `check-editor-quotes`,
`check-readiness`, `check-package-files`) that read the arm pages directly. Its rule is to
"repoint those gates deliberately" when a fresh shape replaces the arms.

**Proposed fold:** each outline lists every heading an anchor contract or a check script depends
on. A rebuilt page keeps each one, or the stage changes `conditions.ts`, `conditions.json`, and the
affected script in the same pass. A `conditions.json` change also records that already-shipped
binaries keep the old anchor, which is a tool-release note.

### M7. The per-page cost is below every measured figure, and the counting rule is unstated. OWNER FORK

**Location:** spec:52-63 and spec:157-160.

The shares assume about 350K tokens per page, including planning and close. The ratified evidence
says otherwise:

- HISTORY:407-410: "A contract page costs about 900K tokens through the page chain, not the 300K
  the plan assumed ... Three rounds per page was the shape that converged."
- The reset's pass 2a amendment budgeted "0.7M per page plus 1.5M per pass"
  (`2026-09-23-docs-reset-design.md:87-90`).

The handoff's lesson 2 is "Check that a success bar is reachable from existing evidence before
planning toward it." The spec gives no derivation for 350K. It also does not name its counting
rule. The reset measured pass 1 at "about 9M" recorded against 18.7M counted with cache creation
(`2026-09-23-docs-reset-design.md:61-63`), a factor of two. The shares also sum to exactly 20M, so
the global 80 percent stop fires during stage 3 even if every stage lands on its share. The spec
does not retire the reset's 45M program cap either, though R2 replaces it in effect.

About 55 pages at the 0.7M evidence-based rate is about 38M. R2 fixed about 20M, so this is a
scope-and-budget fork for Geoff.

- **Option A:** keep 20M and let stage 2's measured cost reset every later share, accepting that
  stages 4 and 5 may need a new ceiling. The 25 percent-over rule already stops stage 2 early.
- **Option B:** cut scope to fit 20M. Rebuild only the pages the outline ties to a job, and keep
  the rest as fact-checked edits in place.
- **Option C:** raise the ceiling to an evidence-based figure, about 35M to 40M.

**Recommendation:** Option A. Also state the counting rule (input, output, and cache creation, by
the session ledger script or `/cost`), show the 350K derivation against the chain's stages, and
retire the 45M cap in the "Rulings retired" list.

### M8. Sheet 2 tests cairn.pub, which cannot show the drafts

**Location:** spec:149 and spec:164-166.

Human task reads run "during the site round" from the 2a sheets. Sheet 2 sends the reader to
`https://cairn.pub/` and allows "only the pages on cairn.pub and the pages they link to"
(`2026-09-25-docs-reset-2a-human-reads.md:89-93`). cairn.pub renders the docs from the npm tarball
at its pin. It has been un-pinnable since `0.95.0` (`docs/STATUS.md:15-16`), and the spec puts both
the pin and releases out of scope. So Sheet 2 would test today's frozen pages, not the drafts. The
sheet header also still routes logs to "pass 2a's audience review", which no longer exists.

**Proposed fold:** repoint Sheet 2 to the drafts on GitHub `main`, as Sheet 1 already does with its
help link. Or sequence Sheet 2 after a release and cairn.pub's pass, and say so. Update the sheets'
header to name where logs go now.

## Minors

### m1. The outline approval and the owner read add mid-pass human gates

**Location:** spec:86-99. The global "Conducting a pass" rule says "The plan-approval gate is the
single human gate." R3 is authoritative, but running the outline as step 1 inside an approved pass
makes it a second gate, and the owner read makes a third. **Fold:** write each stage's outline into
that stage's plan, so plan approval is outline approval. Count the owner read as one execution
sitting in the pass score.

### m2. Stage records belong in HISTORY, not STATUS

**Location:** spec:157-158 ("STATUS records spend against the share ..."). The global STATUS rule
says STATUS is "present tense only" and at most 60 lines, with the per-pass ledger in
`docs/HISTORY.md`. **Fold:** the stage close writes its measured record to HISTORY. STATUS carries
only the current shares and the next stage.

### m3. Figures are omitted

**Location:** spec:104-123 (the page chain). At least ten arm pages carry figures (for example
`docs/extend/architecture.md`, `docs/admin/create-your-site.md`). The standard's figure rules, the
`cairn-figure` skill ("the production path for a figure ... on any cairn-family docs page"), the
`figure-verifier` agent, and `check:visuals` are all absent from the chain and its gate list.
**Fold:** add `check:visuals` to the gate list, and add a `figure-verifier` read on pages that carry
a figure. The outline marks which pages keep or gain a figure.

### m4. The front-door scope is narrower than the standard, and READMEs are counted twice

**Location:** spec:59 and spec:61-62. The standard's front-door types also include
`docs/README.md` and the root `README.md` (standard, Docs-set level). The spec's stage 5 lists
only `why-cairn.md` and the four arm READMEs. The arm page counts (9, 8, 33) already include each
README, so stage 5's pages are budgeted twice. **Fold:** state whether `docs/README.md` and the root
`README.md` are in stage 5, and take the READMEs out of the arm counts.

### m5. The extend per-version records are not exempted

**Location:** spec:56. `CLAUDE.md:131-132` keeps `docs/extend/migration-notes.md` and
`docs/extend/upgrade-cairn.md` as "per-version records outside the freeze, maintained every pass".
A fresh-outline rebuild of stage 2 could rename or rewrite them. **Fold:** exempt both from the
rebuild and keep them maintained in place.

### m6. "Audience profiles" out of scope collides with the register's track profiles

**Location:** spec:167. The register grades every page "against its profile"
(`docs/internal/docs-register.md:262-265`) and keeps a scripter-or-agent profile for three
reference pages (`:375-385`). The `cairn-docs-drafter` definition expects "an audience profile" and
calls itself the "v2 docs page chain" drafter. `docs/internal/briefs/README.md` names the removed
`docs-page-chain-v2.js`. **Fold:** say that R1 retires the reset's profile-file format only, and
that the register's four track profiles and the scripter profile stay as the drafter's and
reviewer's input. Add to stage 0 an update of the drafter agent definition (dotfiles) and the
briefs README.

### m7. Some reset rulings are neither kept nor retired

**Location:** spec:32-43. Ruling 5 (organization size), ruling 6 (agentic authorability as a
design criterion), and rulings 8 to 10 (reader confinement, which died with the harness) go
unmentioned. **Fold:** one line each. The likely reading is that rulings 5 and 6 stand as
register inputs and rulings 8 to 10 retire with the harness.

### m8. The Doc Detective citation sized a different check

**Location:** spec:144-146. The spike's "few dozen lines" covered regex extraction plus
classification "against the docs-and-binary class's own `bashAllowlist`", running inside the
reader's podman image (`2026-09-23-doc-detective-spike.md:56-70`). The allowlist and the image are
removed. The spike's reason 2 for rejecting Doc Detective also rested on those confinement
primitives. The new check executes read-only commands for real in CI, which needs the Go binary
built in the docs gate. **Fold:** cite the spike for the build-or-adopt decision only. Name the new
read-only allowlist's home, and state that CI builds `tool/` for the check.

### m9. The ROADMAP inputs lose a content input

**Location:** spec:79. Stage 0 "drops the inputs it retired" from ROADMAP "Now". That entry carries
Geoff's 2026-09-24 content input for the designer's theme guide (a short section on a DaisyUI
site's own theme identity). R1 drops the site-designer audience, so the input has no stated home.
**Fold:** carry it into the stage 2 outline as a required topic. Also state that the Toward 1.0
claims-verification audit (`ROADMAP.md:67-72`) stays a separate post-`beta.1` gate. The 2026-09-08
standard had the harvest absorb that audit.

### m10. The stage 2 owner-read count is not stated

**Location:** spec:94-95. R3 is "the two or three hardest pages" per arm, and the spec says "Stage 2
gets the most". **Fold:** give stage 2 a stated count. If it exceeds three, record it as Geoff's
extension of R3.
