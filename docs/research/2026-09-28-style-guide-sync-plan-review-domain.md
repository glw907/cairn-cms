# Style-guide sync plan review: domain risk

**Lens:** docs standards, prose voice, and agent-instruction design. **Reviewer:** one adversarial
`claude-opus-5-5` read at high effort, 2026-09-28. **Read against:** plan `44e20e61`
(`docs/superpowers/plans/2026-09-28-style-guide-sync.md`), the spec beside it, the register at HEAD,
`~/.claude/agents/cairn-{docs-drafter,register-editor,implementer,site-implementer}.md`,
`~/.claude/workflows/docs-page-chain.js`, the `writing-voice` skill and output style,
`~/.claude/docs/voice/technical-doc-web.md`, the authoring charter, `register-check`, and
cairn-pub.

**Counts:** 1 blocker, 6 major, 7 minor, 1 owner fork.

The plan's structure is sound: sources layered, drafter flattened, a sync check, a ratchet. The
findings below concern what the drafter actually receives, which specimens carry the voice, and
which writers the routing still misses. Ranked by consequence.

## Blocker

### B1. The drafter's input is undefined for everything that is not guide structure, voice, or tells

- **Where:** plan:87-94 (R1 brief order), plan:128-131 (W1); spec:129-140, spec:286-289;
  `docs-page-chain.js` `common` ("read the universal contract and the track section before
  anything else").
- **Defect.** A brief holds three things in a fixed order: structure, voice, tells. The Google
  brief serves four tracks (admin, extend, reference, front door) whose register sections differ
  in what matters most: the vocabulary contracts (admin bans "adapter, seam, schema,
  frontmatter"), the arrival state, the counterpart question, the page anatomies (task guide,
  condition entry, symptom row), the keystone, the vendor-link rule, the Diátaxis ban, Names,
  Visuals, and the front-door rules. None of these is structure, voice, or a tell. The plan
  never states whether the drafter still receives them. Either reading of W1 produces a defect.
  - If W1 drops the register pointer from the drafter's `common` to honor "the drafter sees only
    its brief," stage 2a's drafter loses the track contract and anatomy. The register editor
    catches the damage, so every page spends its one redraft round on content the old prompt
    supplied.
  - If W1 keeps the pointer, the drafter (which has Read) opens the whole register, provenance
    and exceptions included. W1's guard checks only the rendered prompt text, so it passes on
    this reading too.
- **Fold.**
  - R1 states what is guide-level (the brief) and what is track-level (the track section, the page
    anatomy for the page type, and a short universal block covering the keystone, vendor links,
    Diátaxis, and Names).
  - W1 extracts the track-level sections the same way as the brief and renders them into the
    drafter prompt after the brief. The drafter's `common` then names no register path, and W2
    says "do not open the register."
  - W1's drafter-prompt guard asserts that the brief and the track section are present and that no
    provenance or exceptions text appears.
  - The editor brief can absorb the editor track section outright, since one guide maps to one
    track there.

## Major

### M1. Google captures become exemplars the drafter is told to imitate "for register"

- **Where:** plan:163-167 (R9), spec:355-365; `docs-page-chain.js` draftPrompt ("Exemplars to
  imitate for anatomy and register") and pageInputsPrompt ("imitate for anatomy, register, and
  per-step detail"); `cairn-docs-drafter.md` ("Imitate its anatomy, its sentence rhythm, and its
  register").
- **Defect.** The spec's intent is split: anatomy from the Google and Microsoft captures,
  register from the rebuilt `choose-an-ai-posture.md`. The chain has no way to express that split.
  Every exemplar is imitated for register, and the drafter definition adds "sentence rhythm." When
  a stage 2a page takes a Google Cloud capture as an `exemplarSources` entry, the strongest
  attractor in the prompt is Google's conversational register. This is the G3 flattening path,
  and `writing-voice` itself says an exemplar outpulls a rule list. W1's excerpt note flags
  departures "from the base guide", never departures from the cairn docs voice.
- **Fold.**
  - W1 adds a per-entry role to `exemplarSources`: `anatomy` or `voice`.
  - The draft prompt wraps anatomy excerpts as "imitate the section order and step form only;
    their sentences are not the voice."
  - W2 drops "sentence rhythm, and its register" for anatomy-role exemplars.
  - W1's test covers the role rendering.

### M2. The voice has one in-brief specimen, and it is the wrong genre for most pages

- **Where:** plan:85 and plan:197-198 (R1 without the specimen; R1b adds it at the join); register
  "Calibration specimens".
- **Defect.** Ruling 11 defines the voice positively. The only ratified-good prose, though, is the
  why-cairn opener: front-door, first person, author's evidence. Stage 2a drafts extend task and
  concept pages, where first person is out of register. R1b adds one task lead-in and one step.
  No specimen covers a concept section, the most voice-bearing section in the extend arm. The
  comparison set (SQLite, a systems paper) is named, not quoted, and the drafter cannot open it.
  No Killed specimen shows the flattening failure either: every current Killed entry is an
  over-writing tell, while the keystone calls flat prose "the other way to fail." A Sonnet or
  Opus drafter with a list of long verbatim Google rules and one first-person paragraph will
  default to Google's register or copy the first person.
- **Fold.**
  - R1 carries, in the developer brief's voice section, one concept-section paragraph lifted
    verbatim from `choose-an-ai-posture.md` at `8bbe78f5`. That prose is the proof whose tone
    Geoff's ruling says worked.
  - R1 also adds one Killed "flattened" specimen: the same paragraph rewritten in Google's
    default conversational register, tagged with why it fails.
  - The why-cairn opener is labeled front-door and first-person-only.
  - This changes no ruling and costs about ten lines.

### M3. The R1b specimen is authored by a Sonnet structural edit and enters the brief before Geoff's tone read

- **Where:** plan:190-198 (J1, then J3), plan:220 (Geoff's read at the close); spec:182-184.
- **Defect.** R1b takes "a task section's lead-in sentence and a numbered step" from R5's page.
  R5's new sentences are exactly the ones the structural edit writes: the list lead-ins the
  colon-triad remedy requires. The J1 dispatch defaults to `cairn-implementer` on Sonnet. So the
  permanent voice specimen for every later drafter comes from a Sonnet edit. It lands in the brief
  at J3, and Geoff's only tone read comes afterward at the close. The register calls its
  specimens "ratified," and this one would not be.
- **Fold.**
  - J1 runs at `model: opus`, or as a `cairn-docs-drafter` redraft.
  - R1b prefers a lead-in sentence from the byte-identical set.
  - Geoff's single close read explicitly covers the R1b specimen lines in the same sitting, so no
    new sitting is needed. A rejected specimen reverts R1b before merge.

### M4. Forced `blocking` on every `source: guide` finding turns guide recommendations into redraft churn

- **Where:** plan:131 and plan:60-61 (Review focus 3); spec:290-293; criterion 7(c).
- **Defect.** Google and Microsoft mix requirements with soft guidance ("generally," "consider,"
  "we recommend"). The register editor is instructed to "assume the draft contains AI register
  slips and hunt them," which is the same over-reporting pressure Anthropic's reviewer warning
  names. When the runner forces blocking on any guide citation, a nitpick against an unbriefed
  recommendation consumes the page's one redraft and then escalates. J2's criterion 7(c)
  requires zero blocking guide findings on the rebuilt page, with "stop on any failure," so the
  same pressure can halt the join. The register's own rule says over-firing is a defect equal to
  missing.
- **Fold.**
  - FINDING gains an optional `rule` field.
  - The runner forces `blocking` only when `source: guide` cites a rule id that the brief carries
    (R1's quote markers).
  - Any other guide finding keeps the reviewer's own blocking value.
  - W1's coercion test pins both cases.
  - This ties the enforcement to the flattened standard the drafter actually saw.

### M5. The workstation's top-level voice documents still say "no house voice" and "short sentences"

- **Where:** plan:171-174 (W4 scope); `~/.claude/docs/authoring-charter.md` ("keeps no house
  voice," developer-docs exemplars "Google's own docs"); global `CLAUDE.md` "Writing voice" ("not a
  house voice"); repo `CLAUDE.md` Authoring ("with no house voice"); `technical-doc-web.md` ("Applies
  to ... cairn-cms," "One idea per sentence, short sentences");
  `~/.claude/output-styles/writing-voice.md` ("Bullet lists where prose belongs").
- **Defect.** The cairn docs voice is a recorded repo-level house voice. The three documents
  loaded in every session deny that such a voice can exist, and `technical-doc-web.md` names
  cairn-cms as governed by a register whose sentence rule contradicts ruling 3. The always-on
  output style carries the "paragraphs over bullets" pressure that produced the prose procedures
  (C6), and W4 adds the numbered-list clause only to the skill. W4's one generic line ("a repo's
  register may record voice deltas") is correct but reaches only one of these five files. J5 would
  probably find the rest, but J5 is one unbounded implementer dispatch per repo at the very end,
  which is the accretion path the plan-sizing rule warns about. Geoff's "we failed on that front
  earlier" is about exactly these files.
- **Fold.** Name the known mismatches in W4 now, and leave J5 to discover only unknowns:
  - The charter and the global `CLAUDE.md` gain one clause: a repo register may define a voice
    with recorded deltas against its base guide, and cairn's docs voice is one.
  - `technical-doc-web.md`'s "Applies to" sentence routes cairn-cms docs to the register's
    developer brief.
  - The output style gains "a sequence of actions is a numbered list."
  - The repo `CLAUDE.md` "no house voice" clause joins the owed erratum at J5.

### M6. `site-implementer` writes cairn docs and no task reaches it

- **Where:** plan:176-177 (W5 is `cairn-implementer` only); `~/.claude/agents/site-implementer.md`
  lines 65-69 ("docs keep the technical voice") and line 115 (edits cairn-cms docs on
  `site-docs/<site>-<pass>`); `site-pass` SKILL.md lines 31-41.
- **Defect.** Every site round's engine-docs fixes are written by `site-implementer`, and its only
  voice guidance is "the technical voice." Nothing routes it to the drafting brief. Its gate list
  (`check:docs`, `check:vale`, `check:facts`) also skips the `--page` promoted-rule pass. Tree
  mode in CI still catches a regression on a promoted page, but only after the PR is open. W7's
  list says "the agents" without naming it.
- **Fold.**
  - W5 covers both implementers with the same line.
  - The `site-implementer` gate line adds `check:docs-gate --page` for the page it touches.
  - W7's list names `site-implementer` explicitly.

## Minor

### m1. The drafter keeps its own tell list beside the brief's

- **Where:** plan:134-135 (W2); `cairn-docs-drafter.md` "Five rules for this draft."
- **Defect.** W2 adds a precedence note, but the drafter's seven-item tell list stays. That list
  is a digest the spec says the definition must not carry. With the brief's tells and the output
  style's tells, the drafter sees three copies. The C5 conflict (the "fold into the sentence" remedy
  against the list remedy) happened because two copies drifted apart, and R7 cannot check the
  agent file.
- **Fold.** W2 deletes the tell list and keeps the first-sentence rule, the padding rule, and the
  `sentences` procedure. The brief's tells section becomes the one source. W3 states that a new
  tell lands in the register first and the editor's catalogue second.

### m2. Brief extraction by an LLM is not tested for fidelity

- **Where:** plan:128-130 (the page-inputs agent extracts the brief); plan:58-59 (Review focus 2).
- **Defect.** W1's test can prove that a missing heading fails. It cannot prove that an Opus
  agent returned about 200 lines verbatim instead of a paraphrase or a truncation. The whole
  standard passes through that transcription on every page.
- **Fold.**
  - The page-inputs agent runs a deterministic emitter (`register-briefs.mjs --emit <brief>`, a
    flag R7's script already has the parsing for) and returns stdout unmodified, with the
    emitter's end sentinel and line count.
  - The runner rejects a brief that lacks the sentinel or whose line count differs from the count
    the emitter reports.
  - The runner strips the HTML-comment quote markers before rendering, since they carry no
    meaning for the drafter.

### m3. W6's tree is not clean at landing

- **Where:** plan:179-183 (W6 scope includes `docs/` with no record exclusion);
  `~/.dotfiles/claude/.claude/docs/record/2026-09-19-docs-infra-audit.md:33` contains "A floor is
  not a ceiling."
- **Defect.** W6's acceptance ("passes on the tree") fails on a dated record, and the implementer
  will improvise an exclusion. After R1, the register's own provenance or rationale may also name
  a retired clause in order to record its withdrawal, and R8 scans the register. The "Killed:"
  specimens are prose tells, not rule phrases, so they do not collide today, but J5 adds phrases
  by judgment.
- **Fold.**
  - W6 mirrors R8's exclusions (`docs/record/`, dated files, `skills/synced/`, and
    `evals/research/`).
  - Both checks honor one inline allow marker (for example, `<!-- retired-ok -->` on the line)
    for a line that records a retirement.
  - Fenced and quoted blocks tagged "Killed:" are skipped.

### m4. The "25-40-word baseline" seed contradicts W3's own scoping

- **Where:** spec:311-313 (Noir overcorrection "scopes to the Google arms," and its text carries
  the baseline); plan:138-139 ("no retired phrase from W6's seed list remains").
- **Defect.** Noir overcorrection stays for the Google arms, yet its baseline sentence is on the
  seed list. The plan does not say whether the number is deleted everywhere. If it is, Noir loses
  its anti-flattening anchor, the one G3 lever in the editor file. The corpus it points to
  (`~/.claude/docs/register-exemplars/cairn/`) does not exist on this machine.
- **Fold.** W3 deletes the number and anchors Noir to the brief's "qualified claims stay whole"
  delta instead. That keeps the editor consistent with ruling 3, where more than 26 words is
  licensed only for qualification and never as a baseline.

### m5. The register editor's "What is sanctioned" list is an unrecorded exceptions table

- **Where:** `cairn-register-editor.md` "What is sanctioned" ("voiced headings with exclamation
  points," "the authorial first person throughout," "What could be better?"); "Genre determines
  the exemplar" ("developer how-tos answer to the SvelteKit-ecosystem craft exemplars"); plan:137-139.
- **Defect.** Under ruling 2, a departure from the guide exists only as a register row. The
  sanctioned list grants first person "throughout," which contradicts ruling 3's restrained first
  person. It also grants exclamation headings, which the register records only as a dormant
  README sanction. The genre line names a third standard for developer docs. W3's spec text does
  not touch either section.
- **Fold.** W3 scopes "What is sanctioned" to positioning and site copy, and says docs sanctions
  live only in the exceptions tables. The developer-docs genre line points at the developer
  brief.

### m6. `register-check` names a superseded rule set as outranking everything

- **Where:** `~/.claude/skills/register-check/SKILL.md` "Standing rules" ("The living rule set is
  the register section of `docs/superpowers/plans/2026-07-01-docs-rewrite-stage-2.md`; it outranks
  everything here") and "bound into the plan's rule set and the `cairn-register-editor`
  definition."
- **Defect.** The skill points at a July plan instead of the register, and it tells the session
  to bind new tells into an agent file, the copy the plan forbids. W7 lists the skill, but no
  phrase tripwire catches a stale pointer.
- **Fold.** Fix it in W4, not J5. The rule set is `docs/internal/docs-register.md`, and new tells
  go to the register first.

### m7. The admin voice surfaces keep a metaphor rule and a stale route

- **Where:** `docs/internal/admin-design-system.md:1236-1243` ("Lean on the cairn/stacking metaphor
  where it fits naturally," "friendly-but-professional"); `scripts/checks/check-admin-prose.mjs:6-14`
  (points to `prose-guard` and "the content-review skill" for the release-time read).
- **Defect.** R6's outcome covers "the Voice section," but the spec names only line 56 and the
  pointer near line 1236. The metaphor line and "friendly" can survive a narrow reading of R6,
  although ruling 5 ("no cute, no chatty") and ruling 8's direction contradict them. The script
  header routes the admin copy read to `content-review`, which serves site web-content copy, not
  Microsoft UI text.
- **Fold.** Name both lines in R6's outcome. Add the script header to W7's list; since it is
  comment-only, a one-line change keeps `check:prose` green.

### m8. Voice-bearing work runs on the default Sonnet seat, and R1 has no fetch tool

- **Where:** plan:4-6 (implementer `sonnet`); plan:84-100 (R1 rewrites 524 lines in the cairn docs
  voice and must fetch every quote live).
- **Defect.** `cairn-implementer` has no WebFetch. "Fetched and matched" then rests on curl and
  HTML scraping, or on recall, and the report can claim a match that never happened. Voice is also
  the reason the chain pins its drafter to Opus.
- **Fold.** Dispatch R1 at `model: opus` with WebFetch (`general-purpose`, or `cairn-implementer`
  plus a curl-and-extract recipe). The report records each quote's URL and fetch timestamp.

## Owner fork

### F1. cairn.pub is a Google surface by ruling 1, and nothing routes its writers to the brief

- **Where:** spec:49-52 (ruling 1); cairn-pub has no `CLAUDE.md`, no `.vale.ini`, and no content
  guide, and its `docs/architecture.md:37-39` gates prose through the register editor.
- **Defect.** A writer on cairn-pub's own posts and pages who follows `writing-voice` is routed to
  "site content," then to `content-draft`, then to a content guide that does not exist. They never
  reach the developer brief. The plan's J5 fixes only this repo and dotfiles.
- **Options.**
  - (a) Route only. W4's cairn-docs row names "cairn.pub's own prose" explicitly, and a cairn-pub
    `CLAUDE.md` with a `.vale.ini` goes on the ROADMAP.
  - (b) Widen J5 to one cairn-pub dispatch, adding a `CLAUDE.md` line and Vale adoption.
  - (c) Rule that cairn.pub's posts are site content under their own content guide, and narrow
    ruling 1 to the rendered doc arms.
- **Recommendation:** (a). It honors ruling 1 at no cost to the pass's scope. Option (c) is a
  genuine product question about whether a cairn.pub post is documentation, so it belongs to
  Geoff.

## Not raised (checked and sound)

- **Brief size.** Several hundred lines is well within an Opus drafter's attention. The risk lies
  in proportion and register, which M2 and m1 address, not in length. Keep each quote to the
  operative sentence or two, since verbatim Google prose is itself written in the conversational
  register the voice departs from.
- **Cross-repo regression.** The W4 edits add rules and qualify two routing lines. No other repo
  depends on the prose-procedure exemplars, and `writing-voice/evals` are advisory. One gap
  remains: plan:173 records whether the evals re-ran but sets no pass bar. Adding "no eval
  regression, or the delta named" would close it.
- **The two retired-phrase lists.** Keeping them as two copies is forced, since cairn-cms CI
  cannot read dotfiles. J5's "both lists" rule keeps them in step.
