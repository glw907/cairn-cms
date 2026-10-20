# Style-guide ordering audit: the published guides versus cairn's register

Date: 2026-09-28. Scope is read-only apart from this file. The branch audited is the `draft-docs-0` worktree at `b8bfd30f`.

Owner directions (Geoff, 2026-09-28):

- The docs follow the appropriate style guide first. The register is an overlay on top of it and never supplants the guide.
- "since we have two style guide in use (MS for users and Google for developers) the register documentation can address both."
- Settled: the base guide follows whether the reader works in a terminal. A reader who types commands gets Google: installing with the setup command, running the `cairn` CLI, building on the seams. A reader who only uses the product's UI gets Microsoft: editors in `/admin`.
- Writing the register itself in the register should help Claude write in it.

Trigger: an approved page wrote a failure path's ordered checks as prose. Google says sequential steps are a numbered list. Nothing in the chain caught it. The instance is `docs/extend/choose-an-ai-posture.md:99-103` ("Check first that the robots route passes ... If both hold, look for a managed layer ...").

Short names for the paths cited below:

| Short name | Path |
|---|---|
| R | `.claude/worktrees/draft-docs-0/docs/internal/docs-register.md` |
| STD | `docs/superpowers/specs/2026-09-08-docs-standard-design.md` |
| APP | `.claude/worktrees/draft-docs-0/docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md` |
| CHAIN | `~/.claude/workflows/docs-page-chain.js` (identical to the `~/.dotfiles/claude/.claude/workflows/` source) |
| DRAFTER | `~/.claude/agents/cairn-docs-drafter.md` |
| EDITOR | `~/.claude/agents/cairn-register-editor.md` |
| WV | `~/.claude/skills/writing-voice/SKILL.md` |
| WEB | `~/.claude/docs/voice/technical-doc-web.md` |
| ED | `~/.claude/docs/voice/editor.md` |
| CHARTER | `~/.claude/docs/authoring-charter.md` |

The guide pages are cited by URL: G-highlights `developers.google.com/style/highlights`, G-procedures `/style/procedures`, G-lists `/style/lists`, G-headings `/style/headings`, G-tone `/style/tone`, G-a11y `/style/accessibility`, G-code `/style/code-in-text`, G-tables `/style/tables`, G-links `/style/link-text`, G-notices `/style/notices`, M-steps `learn.microsoft.com/style-guide/procedures-instructions/writing-step-by-step-instructions`, M-lists `/style-guide/scannable-content/lists`, M-headings `/style-guide/scannable-content/headings`, M-top10 `/style-guide/top-10-tips-style-voice`.

---

## 0. The root cause, in one paragraph

The register defines the guide as whatever its Vale package enforces. R:12-17 says "The Google Developer Documentation Style Guide is the Vale-enforced floor ... This standard sits on top of whichever floor a track carries, and governs register, the thing Vale cannot grade." Vale's Google package holds no structural rule for procedures, lists, tables, or notices. The gate runs Vale at error level only (`package.json:50`, `scripts/checks/docs-gate.mjs:63-66`), so even the heading-case rule, a warning, never fails a page. Everything the guide says that Vale cannot see therefore falls into the register's territory, and the register has no procedure rule. The 2026-09-08 standard did have one ("Steps, numbered, one action each, at most nine", STD:345; "A linear sequence must be a numbered list", STD:483). It also specified `check:headings`, `check:anatomy`, and markdownlint (STD:430-448, 600-616). APP:75-88 retired those gates unbuilt, and the numbered-steps rule died with the templates. No chain prompt names Google or Microsoft (section 3). The guide reaches the drafter only as Vale's error tier, and the reviewers do not see it at all.

---

## 1. Conflicts: register rules that contradict or loosen a guide rule

The guide wins unless Geoff rules otherwise. Items marked **(Geoff)** look like deliberate, evidenced deviations and go to him. The rest are proposed as straight fixes.

### C1. The deviation clause lets any writer depart from the guide (loosens every rule) **(Geoff: confirm the tightening)**

- Register, R:19-33: "Google and Microsoft set the standard, and cairn may deviate from either, or improve on it, where real-world evidence says the result is better documentation ... A deviation is **evidenced** ... And a deviation is **recorded** ... in this document if it governs a register or a track, and in the page's own contract if it is local."
- Guide: the guides do not address this clause. Geoff's 2026-09-28 direction does: the register must never supplant the guide.
- Problem: any drafter or reviewer can authorize a deviation by citing evidence and writing it into a page contract. The ownership test is absent.
- Resolution: a deviation from a named base rule exists only as Geoff's recorded ruling, in a per-guide "Recorded exceptions" table in the register. A page-local deviation needs the same ruling. Evidence is what the writer brings to Geoff, and it is not a licence to deviate. The "When a Vale finding is wrong" procedure (R:162-205) stands unchanged, because it corrects a misfiring regex, not the guide.

### C2. The technical and academic voice versus Google's conversational tone and sentence length **(Geoff)**

- Register, R:65-78: "The voice is technical and academic ... longer sentences than a blog, fewer of them ... Chatty asides, imperatives to the reader outside a task's own steps, and staccato runs of short sentences are out of register." EDITOR:97-99 goes further: "Geoff's baseline is unhurried 25-40-word compound sentences."
- Google, G-tone: "Write in a conversational, friendly, and respectful tone"; "Use a voice that's casual, natural, and approachable, not pedantic or pushy." G-a11y: "Try to use fewer than 26 words per sentence." G-highlights: "Be conversational and friendly without being frivolous."
- Evidence it is deliberate: the voice carries Geoff's dated ruling (2026-09-08, scope restated 2026-09-28) and a named comparison set (R:73-75). It is still unrecorded against the specific Google rules it overrides. The 25-40-word baseline in EDITOR sits wholly above Google's 26-word guidance.
- Resolution: ask Geoff to record it as a Google exception covering tone and sentence length, scoped by arm. Evaluator and extend pages are the strongest case. Admin task steps are the weakest, since G-a11y is an accessibility rule. Change EDITOR:97-99 from a "baseline" to a description of the recorded exception, or delete it.

### C3. The editors track: an academic overlay on Microsoft's friendly voice **(Geoff)**

- Register, R:65-78 applies the technical and academic voice to "every published page on every track ... The editor track keeps its plainer Microsoft floor inside this voice." EDITOR:70-72 says: "The editor register is a professional academic introduction for a college-educated, non-technical writer."
- Microsoft, M-top10: "Write like you speak ... It should sound like a friendly conversation"; "Shorter is always better"; "Project friendliness. Use contractions"; "Most of the time, start each statement with a verb." ED:16-17 (the workstation's own reading of Microsoft): "Warm and relaxed, but plain ... friendly without being chatty."
- Resolution: Microsoft wins on the editors track unless Geoff records an exception. The contradiction sits in the agent: "academic introduction" is not Microsoft's voice. Recommend Microsoft's voice unmodified on `docs/editors/**`, with the register's no-pitch keystone and tell catalogue as the overlay.

### C4. The question-heading ban on the editors track contradicts Microsoft (and STD's own rule) **(Geoff, folded into C3)**

- Register, R:79-84: a heading "is never a conversational, teaser, or question-shaped phrase", on every track.
- Microsoft, M-headings: "A question mark or (rarely) an exclamation point can be used if it's needed for meaning." Its own examples include "Not seeing what you want?". STD:425-426 and 438: "A question heading is allowed only in the editors track, where the question is the reader's own."
- Resolution: keep the ban on Google arms, where Google's heading forms are a bare infinitive or a noun phrase (G-headings). Allow the reader's own question on `docs/editors/**`, per Microsoft and STD rule 7.

### C5. The drafter's tell remedy steers lists back into prose (contradicts Google and Microsoft lists)

- DRAFTER:32-34: "The setup-colon payoff: ... or a short clause followed by a colon-list. Fold the list into the sentence with a word like 'including', or give each item its own sentence." WV:41-43: "Paragraphs over bullets." R:54-55: "No setup-colon triad cadence ... Fold the items into plain sentences."
- Google, G-lists: "Use numbered lists for sequences"; "Introduce a list with a complete sentence." G-procedures: "use one step for each action." Microsoft, M-steps: "Multiple-step procedures: Use a numbered list." M-lists: "Introduce the list with a heading, a complete sentence, or a fragment that ends with a colon."
- Problem: the tell is a real one, an inline colon-triad. The only remedies offered, though, are prose remedies. When the items are a sequence, the guide's remedy is a numbered list with a complete introductory sentence, and no agent is told so. This is the likeliest proximate cause of the trigger.
- Resolution: add the list remedy to DRAFTER:32-34, R:54-55, EDITOR:81-82 ("List cadence"), and WV:41-43. When the items are a sequence of actions or checks, write a numbered list introduced by a complete sentence. When they are parallel options, write a bulleted list. Fold into prose only when the items are not steps or parallel set members.

### C6. The voice exemplars teach multi-step procedures as prose (contradicts both guides)

- WEB:60-63, labelled as the Google register's exemplar: "To add the integration, install the package and register the plugin. In your terminal, run npm install. Then, in vite.config.js, import the plugin and add it to the plugins array." That is three sequential actions in a paragraph. ED:37-41, labelled as Microsoft's exemplar: "select your account picture, and then select Change photo. Choose a new picture ..., and then select Save." That is four actions in prose.
- Guides: G-procedures and M-steps, as quoted in C5. M-steps also says: "Use a separate step for each instruction. It's OK to combine short steps that occur in the same place in the UI."
- Problem: WV:13-14 says "the exemplars are the stronger attractor." EDITOR preloads `writing-voice` (EDITOR:7-8), so the register editor's ear for "correct Google" is trained on a prose procedure.
- Resolution: replace each exemplar with a numbered-list procedure, or relabel it as a one-sentence summary that precedes the list. This file is workstation-wide, so the fix reaches the other repos too.

### C7. The register's task-guide anatomy dropped "numbered, one action each" (loosens the guide)

- Register, R:258-263: "runnable steps, a verification section ..., and failure paths that point at the track's recovery surface." The anatomy says nothing about form.
- Guide: G-procedures, G-lists, M-steps. The predecessor STD:345 read "Steps, numbered, one action each, at most nine."
- Resolution: restore it in the anatomy, citing the guide: "Steps are a numbered list, one action per step, with the location before the action. A single step is a bulleted item (Google) or a bullet (Microsoft). Ordered diagnostic checks in a verification or failure section are a numbered list too."

### C8. Imperatives are restricted to task-step headings (narrows Google's task-heading rule)

- Register, R:80-82: a heading is a noun phrase, "or, for a step in a task, an imperative naming the action."
- Google, G-headings: "For a task-based heading, start with a bare infinitive"; "For a conceptual or non-task-based heading, use a noun phrase that doesn't start with an -ing verb."
- Resolution: reword R:80-82 to Google's split, task-based versus conceptual. A task section that is not a numbered "step" still takes the bare infinitive.

Two items look like conflicts but are already settled:

- **Recorded:** `Google.FirstPerson = NO` (Geoff, 2026-07-02, `.vale.ini:25-27`) and the README exclamation headings at warning (`.vale.ini:43-45`, EDITOR:118-123). Both are sanctioned, but neither sits in the register as a per-guide exception. Move them into the table C1 proposes.
- **Compatible, no conflict:** the no-em-dash-rhythm rule (R:56-58) targets a rhythm, not the glyph, so it tightens without contradicting Google's em-dash guidance (WV:84-85). The vendor-link rule (R:93-105) and the visuals rules (R:115-155) cite or tighten Google.

---

## 2. Structural gaps: guide rules that no gate and no agent checks today

"Chain today" means CHAIN, DRAFTER, EDITOR, the docs gate, and the figure-verifier. The gate runs Vale at error level only. The `vale-hook` surfaces warnings as advisory context on a drafter's Write or Edit (`~/.local/bin/vale-hook` docstring), assuming PostToolUse hooks fire inside workflow subagents. That assumption is unverified. A warning never fails the gate either way.

| # | Guide rule (source) | Checked today? | How it could be checked |
|---|---|---|---|
| S1 | A sequence is a numbered list (G-highlights, G-lists, M-lists, M-steps) | No. The only numbered-list check in the chain is on figures (`figure-verifier.md:76`) | New Vale rule `Cairn.ProseProcedure`: `occurrence` at paragraph scope for sentence-initial imperatives (three or more), plus an `existence` rule for sequence connectors ("check first", "if both hold", "then", "otherwise") beside an imperative. It must fire on `choose-an-ai-posture.md:99-103` and `rotate-the-github-app-key.md:99-102`. Start at warning, promote after measuring. An agent read carries the judgment |
| S2 | One action per step, location before action (G-procedures, M-steps) | No | Vale `list`-scope heuristic (", and then", two imperatives in one item) at warning. Otherwise an agent read |
| S3 | Single-step procedure as a bullet (G-procedures, M-steps) | No | Agent read |
| S4 | List introduced by a complete sentence; parallel items; item capitalization and punctuation (G-lists, M-lists) | No | Capitalization: Vale `list` scope, `^[a-z]` (writable). Intro and parallelism: agent read |
| S5 | Heading sentence case (G-headings, M-headings) | Vendored `Google.Headings` sits at **warning**. `Microsoft.Headings` sits at **suggestion**. Neither gates | Promote both to error in `.vale.ini`. Add proper-noun exceptions first (GitHub App, Workers Builds, CSRF, SEO, Tidy): today's 18 findings are mostly false positives on those terms. Check whether the Cairn vocabulary suppresses them, and prove it with a fixture |
| S6 | No -ing first word; task heading is a bare infinitive, concept heading a noun phrase (G-headings; M-headings "Consider infinitive phrases") | No vendored rule | New `Cairn.HeadingForm` (existence, heading scope): leading `\w+ing\b` with an exception list, a trailing `?` outside editors, teaser openers ("You know", "What ... doesn't"). That makes R:79-84 mechanical. Bare-verb-versus-noun judgment stays with an agent read |
| S7 | No skipped levels, one H1, no heading directly after a heading (G-headings; M-headings "Avoid having two headings in a row") | No. STD:445 assigned MD001 and MD025 to markdownlint, which was never built | markdownlint-cli2 stock rules MD001 and MD025, plus a small custom rule for adjacent headings |
| S8 | No links in headings; avoid code in headings (G-headings) | No | A Vale rule at `raw` scope, `(?m)^#{1,6} .*\]\(`, for links. Code in headings: exempt the reference arm, since the symbol names its entry, and warn elsewhere |
| S9 | Code font for code, files, commands, and output; plain font for product names (G-code) | No | Vale strips code spans, so a `text`-scope existence rule on filename and path patterns (`\b[\w-]+\.(ts|js|json|md|toml|yml)\b`, `src/…`) finds uncoded tokens. Warning level |
| S10 | Tables: a complete introductory sentence, sentence-case headers, no empty or merged cells, not for layout (G-tables) | No | markdownlint MD055, MD056, and MD058 plus a custom intro-sentence rule; Vale `table.header` scope for case |
| S11 | Descriptive link text; no URL as link text; "For more information, see" (G-links, G-a11y) | Partly: EDITOR:128-133 names "Google's link-text rules" in prose only | Vale `raw`-scope rule for `\[(here|this page|this document|click here)\]` and `\[https?://`. `Microsoft.GeneralURL` already exists at warning |
| S12 | Notices: Note, Caution, or Warning, used sparingly and never for prerequisites or steps (G-notices) | No | Agent read. A `raw` rule can flag inconsistent notice markup if cairn picks one form |
| S13 | Put conditions before instructions (G-highlights, G-procedures) | No | Agent read |
| S14 | Sentence length under 26 words (G-a11y) | No on Google arms. `Microsoft.SentenceLength` runs at suggestion on editors | Blocked on C2. Do not gate until Geoff rules |

Totals: 14 gaps. Vale can check 7 fully or partly (S1, S4 partly, S5, S6, S8, S9, S11). markdownlint can check 2 (S7, S10). S12 is partly writable once cairn fixes a notice form. S2, S3, S13, and the judgment half of S1, S4, and S6 need an agent read.

---

## 3. Order of operations: where each guide and the register reach the chain

| Stage | What it receives | Guide present? |
|---|---|---|
| Shared preamble `common` (CHAIN:154-163), prepended to page-inputs and drafter prompts | "The register is ...: read the universal contract and the track section before anything else." Then the Names rules and "Error-tier Vale rules, verbatim" | **Register first, by instruction.** The guide appears only as Vale's error-tier list |
| Page inputs (CHAIN:207-243) | Trims exemplars "for anatomy, register, and per-step detail". Exemplars come from `exemplarSources`, often existing arm pages | **Absent.** No check that an exemplar conforms to the guide. Several existing arm pages carry prose procedures and -ing headings (section 5), and those become the drafter's anatomy model |
| Drafter prompt (CHAIN:246-281) and definition (DRAFTER:9-69) | `common`, the excerpts, the facts, and DRAFTER's "Five rules for this draft" (answer-first, the tell list, no padding, the sentences list) | **Absent.** DRAFTER never names Google or Microsoft. Its one list rule points away from lists (C5). DRAFTER:3 says "nothing may depend on a skill invocation", so it does not load `writing-voice` |
| Gate (CHAIN:195-205; `docs-gate.mjs:61-83`) | Vale `--minAlertLevel=error` on the page, plus the fact, link, and snippet checks | **Subordinate.** Only error-tier guide rules, none of them structural. `Google.Headings` is a warning. Note: CI pins Vale 3.15.1 (`.vale.ini:5-12`) and this workstation runs 3.23.0 |
| Register editor prompt (CHAIN:283-288) | "Read the page, then the register's universal contract and its track section, then grade. Apply the tell catalogue, the Names section, logic, and facts-adjacent phrasing." | **Absent.** No guide-conformance instruction |
| Register editor definition (EDITOR:25-43, 128-133) | Loads the register ("outranks this file"), the craft references, and a voice corpus directory that does not exist on this machine (`~/.claude/docs/register-exemplars/cairn/` is missing). Preloads `writing-voice` (EDITOR:7-8), which routes to WEB and ED | **Subordinate and indirect.** Google appears once, for link text. Through the skill it reaches the editor only via WEB and ED exemplars that model prose procedures (C6). EDITOR:17-23 grades against genre exemplars, never against the guide's structural rules |
| Fact read and figure read (CHAIN:290-310) | Claims and figures | Not applicable. The figure-verifier is the one agent that checks "should be a numbered list" (`figure-verifier.md:76`), and only for figures |
| Register header (R:12-33) | Defines the guide as "the Vale-enforced floor" and the register as governing "the thing Vale cannot grade", with a self-serve deviation clause | **Subordinate by definition** (section 0, C1) |
| Charter (CHARTER:24-28) | "Feedforward is ... name the audience, load that standard's canonical exemplars, draft to it"; "A clean linter run is necessary and never sufficient" | Correct in principle. The chain implements the feedback half (Vale) and none of the standard's feedforward |

Summary: the register reaches every stage and is told to come first. The guide reaches the drafter only as the Vale error tier. It reaches the register editor only as one link-text sentence and a skill whose exemplars model the trigger defect. Its structural half reaches no stage.

---

## 4. Proposed design, strongest form first

The order follows "a rule lives where it executes": tool first, then runner, then agent definitions, then the register text. Costs are per page.

### 4a. Tool: Vale and markdownlint in the repo (zero tokens, about a second of gate time)

1. **Promote heading case to error.** Set `Google.Headings = error` under `[docs/**/*.md]` and `Microsoft.Headings = error` under `[docs/editors/**]` in `.vale.ini`. Add the proper-noun exceptions first, through the vocabulary if Vale honors it for capitalization, else through a Cairn copy of the rule. Prove it with a fixture. This resolves S5.
2. **Write `Cairn.HeadingForm` (error).** It flags a leading -ing word, a question heading outside `docs/editors/**`, and teaser openers. This resolves S6, C4, and the mechanical half of R:79-84.
3. **Write `Cairn.ProseProcedure` (warning, then error once measured).** It flags imperative runs and sequence connectors in a paragraph. It must fire on both trigger passages. This resolves S1.
4. **Write `Cairn.LinkText` (error)** for vague link text and URL link text (S11). **Write `Cairn.CodeFont` (warning)** for uncoded paths and filenames (S9). Add a list-item capitalization rule (S4, partly).
5. **Build `check:markdown` (markdownlint-cli2) into `docs-gate.mjs`, scoped by `--page`.** Stock rules MD001, MD024 (siblings only), MD025, MD029, MD032, MD040, MD055, MD056, and MD058, plus two small custom rules: heading after heading, and table without an introductory sentence (S7, S10). STD:614-616 already specified it, and APP did not retire markdownlint by name.

Every rule ships with a must-fire fixture, as STD:214-216 already requires. The new rules gate chain-scoped pages (`--page`) at once. Tree-wide they run at warning until each frozen arm's stage merge, the same sweep policy the register applies to Names (R:245-247).

### 4b. Runner: `docs-page-chain.js` (small prompt deltas, no new stage)

1. **Reorder `common` (CHAIN:154-163).** Derive the base guide from the page's track (`editors` gives Microsoft, every other arm Google) and open with it: "This page's base style guide is <guide> (<URL>). Structure the page to it first: procedures, lists, headings, code font, tables, link text, and notices. The register at <path> is an overlay. It adds rules the guide is silent on, and it overrides a guide rule only where its Recorded exceptions table names Geoff's ruling." Follow with a digest of 8 to 10 structural rules in the guide's own words, drawn from the S-table's sources. Cost: about 400 prompt tokens per agent call.
2. **Give the register editor a first lens instead of adding a stage (CHAIN:283-288).** "First grade structure against <guide>'s rules (the digest), and mark each finding `source: guide`. A guide violation is blocking. Then apply the register." Add an optional `source` field (`guide` | `register`) to `FINDING` (CHAIN:115-124), so each page record shows which layer caught what. Cost: about 5K to 15K tokens more per editor read, against about 110K for a separate agent (APP:105-110 pricing). A separate conformance agent is rejected on cost, since the lens fits inside an Opus read that already reads the whole page.
3. **Page inputs (CHAIN:232-235).** "Trim each exemplar for anatomy that conforms to the base guide. If the excerpt writes a procedure as prose or breaks a guide heading rule, say so in the excerpt's note so the drafter does not imitate it." Cost: negligible.

### 4c. Agent definitions

- **DRAFTER.** Add a "Structure to the base guide first" section above "Five rules" with the same digest. Amend DRAFTER:32-34 with the list remedy (C5).
- **EDITOR.** In "Load the living contract first", make item 0 "the page's base guide: Google (developers.google.com/style), or Microsoft (learn.microsoft.com/style-guide) for `docs/editors/**`". State that the register overlays the base guide and outranks this file (amending EDITOR:27-30). Add a "Guide conformance, first lens" section. Give the List-cadence family its list remedy (C5). Rewrite EDITOR:70-72 and 97-99 after Geoff rules on C2 and C3.
- **WV:41-43, WEB:60-63, ED:37-41.** Add "a sequence of actions is a numbered list" and replace the prose-procedure exemplars (C6). These files are workstation-wide, so the change lands in `~/.dotfiles` and reaches every repo.

### 4d. The register's header (R:12-33), which answers Geoff's two-guide direction

Replace "floor" with "base" throughout, and restructure the header as follows.

- **Two base guides, picked by one rule.** The proposed header text reads:

  > Each published arm has one base style guide, chosen by whether its reader works in a terminal. A reader who types commands, such as running the setup command, running the `cairn` CLI, or building on the seams, reads under the Google developer documentation style guide. A reader who works only in the product's UI reads under the Microsoft Writing Style Guide. The base guide governs structure, grammar, and mechanics, including every rule Vale cannot check. This register is an overlay on that base: it adds rules where the guide is silent and may tighten a guide rule, but it never loosens or overrides one except through a recorded exception below.

  Then comes a table. `docs/editors/` uses Microsoft (UI only). `docs/admin/`, `docs/extend/`, and `docs/reference/` use Google (terminal). The front door and the root README use Google (their primary reader is the developer, R:434). That matches `.vale.ini`, and each track section's "Style floor" line (R:298, 323, 349) becomes "Base guide", citing the rule.
- **Recorded exceptions, one table per guide.** Each row names the base rule's page and quote, what cairn does instead, the evidence, and Geoff's ruling and date. Seed rows:
  - Google: `Google.FirstPerson` off (2026-07-02); README exclamation headings; the voice, from C2 once ruled.
  - Microsoft: whatever C3 and C4 settle.

  A departure not in the table is a defect, and only Geoff adds a row.
- **Delete the self-serve half of R:19-33 (C1).** Keep "When a Vale finding is wrong" as the separate procedure it already is.
- **Amend the task-guide anatomy (R:258-263)** with C7. **Amend the heading rule (R:79-84)** with C4 and C8.

What this costs: 4a costs no tokens and about a second of gate time per page. 4b and 4c cost about 0.5K prompt tokens per call plus 5K to 15K per editor read, roughly 2% of the priced 0.65M page (APP:112-116). The first sweep of each frozen arm pays its findings at that arm's own stage.

### 4e. The arm-to-guide mapping (settled by Geoff, 2026-09-28)

The terminal rule confirms today's mapping, so nothing moves.

- `docs/editors/` stays on Microsoft. The reader works only in `/admin` (R:310-312).
- `docs/admin/` stays on Google. The reader runs the setup command, since `create-cairn-site` is the setup spine (R:334-336), and "Every command shown is copyable as printed" (R:331-332).
- `docs/extend/` and `docs/reference/` stay on Google.

Two stale texts need fixing:

- The register's current reason for the editors-only split, R:12-15 ("the editor reader is the one audience the Microsoft voice, plainer and more literal than Google's, actually fits"), becomes the terminal rule.
- ED:4-5 lists "someone following a setup guide" as a Microsoft reader. Drop that phrase or qualify it ("a setup guide that runs entirely in a UI") so the workstation voice doc matches the rule.

For the record, before the ruling I measured the cost of moving admin to Microsoft: 8 error findings, all `Microsoft.Contractions`. The number is moot now.

### 4f. Write the register in its own register

Anthropic's prompting guidance supports Geoff's hunch. It says: "The formatting style used in your prompt may influence Claude's response style. ... try matching your prompt style to your desired output style as closely as possible" (platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices, "Match your prompt style to the desired output"). The same page says: "Examples are one of the most reliable ways to steer Claude's output format, tone, and structure" ("Use examples effectively").

Proposed rules for the register's own text:

- **Explanatory prose conforms to the register and to Google**, the register's own base: sentence-case headings as noun phrases, active voice, and no setup-colon payoffs.
  - Today's header breaks its own rules. R:21-24 carries a bolded aphorism ("**Truly excellent documentation matters more than perfectly compliant documentation**") and a "not the same goal" contrast frame.
  - R:40-42 ends on a capper ("it is the other way to fail").
- **Rule lists stay lists**, as both guides write their own rules (G-highlights and M-top10 are both lists). The universal contract (R:44-105) is already a list. The task-guide anatomy (R:258-283) should become a numbered list of sections, since it is a sequence.
- **Anti-pattern specimens stay**, labelled and quoted, in the form the calibration specimens (R:485-510) already use. Each one is fenced or quoted and tagged "Killed:" so an agent cannot mistake it for a model to imitate.
- **Cost:** one editing pass on R, reviewed by the register editor with the new guide lens. No gate changes. The register's own path (`docs/internal/**`) is Vale-exempt (`.vale.ini:59-60`). Run Vale on a temporary copy under a Google glob, as STD:1336-1352 did for its own spec.

### 4g. Choosing and refreshing exemplars

Imitation outweighs rules, and CHAIN:232-235 hands the drafter two excerpts cut from `exemplarSources`, which are existing arm pages. Section 6 shows both named exemplars teach the defects the new rules forbid. The trigger page copied one of them: its `**Precondition:**` run-in (`choose-an-ai-posture.md:6`) is `restrict-admin-access.md:11`'s form.

1. **Gate eligibility.** An in-repo page may serve as `exemplarSources` only after it passes the new structural checks (4a) and the register editor's guide lens. Add this to the chain as a cheap pre-check: before page inputs, run `check:markdown` and the Vale `Cairn.*` structural rules on each exemplar source. Stop with a named reason if one fails, so the conductor substitutes another. Cost: seconds, no tokens.
2. **Prefer external exemplars for anatomy.** The exemplar corpus (`docs/internal/record/docs-exemplars.md`, 68 captures at `~/.local/share/cairn/exemplars/`) holds pages from the guides' own ecosystems. Its manifest says the picks were "never reviewed as a set" (`docs/internal/record/2026-09-26-docs-approach-handoff.md:90-92`). Keep one excerpt from a guide-conformant published page for structure, taken from Google Cloud or Microsoft Learn, which are written to the base guides. Keep one from a chain-accepted cairn page for register and vocabulary.
3. **Refresh as a byproduct.** Each chain-accepted page that passes the new checks becomes an eligible in-repo exemplar for its page type. A pre-chain page leaves the eligible set when it fails. The conductor keeps a short per-type list in the pass plan: two eligible sources per page type, updated at each stage close. No new file is needed, because the plan already carries `exemplarSources`.
4. **Wrap every excerpt in `<example>` tags**, as CHAIN:251 already does. Add a one-line note per excerpt naming what to imitate (anatomy, cadence) and any known deviation not to copy, per 4b.3.

---

## 5. Existing published pages the new checks would flag (sample; no fixes)

A heuristic scan of 82 published pages found 77 headings led by an -ing word, 52 paragraphs with sequence words next to an imperative, 18 heading-after-heading pairs, 25 tables with no introductory sentence, and 1,387 sentences of 26 words or more. These counts are uncalibrated. The scanner is `scratchpad/scan.py`, heuristic only, and code in reference headings is expected.

1. **`docs/admin/create-your-site.md`** (admin, Google). It is a task guide with zero numbered steps. Its -ing headings are "Getting your site onto GitHub" (:53), "Getting your site onto Cloudflare" (:83), and "Getting back in" (:158), and ":134 You know it worked when" is a teaser heading (S1, S6, C7).
2. **`docs/admin/setup-recovery.md`** (admin). Six -ing headings (:36, :46, :57, :73, :83, :97), including "Getting onto GitHub" and "Connecting to Workers Builds", which `Google.Headings` already warns on. Four tables sit directly under a heading with no introductory sentence (:38, :48, :59). The `:26` heading carries code and runs to a full sentence (S6, S8, S10).
3. **`docs/editors/publish-and-history.md`** (editors, Microsoft). "Getting an earlier version back" (:93-109) writes a four-action procedure as prose: open the overflow menu, select **History**, select **Revert**, review and publish. M-steps calls for a numbered list. The sibling headings mix sentence-form ("Save keeps your work, privately", :9) with -ing forms (:47, :54, :62, :72, :79, :93), against M-headings' "Use parallel sentence structure" (S1, S6).
4. **`docs/extend/rotate-the-github-app-key.md`** (extend). Its steps are numbered, correctly. The verification section (:97, "You know it worked when", a teaser heading) writes three ordered diagnostic checks as one prose sentence (:99-102): check Workers Logs first, then re-push, "otherwise" re-check the key. That is the trigger's defect class. "Why there's no downtime window" (:15) is question-shaped (S1, S6). It also shows a `Google.Headings` false positive on "GitHub App" (:1), which 4a.1 must clear before promotion.
5. **`docs/reference/auth-store.md`** (reference). Headings sit directly on headings three times: :80→:82, :94→:96, :162→:164. G-headings says "Never place a heading immediately after another heading." The section headings are -ing forms ("Reading the allowlist", "Adding and removing editors", "Changing roles"), where Google wants noun phrases for conceptual sections (S6, S7).

Beyond the sample, the trigger page itself, **`docs/extend/choose-an-ai-posture.md`** (branch-approved), would fail `Cairn.ProseProcedure`:

- The failure checks at :99-103 are prose.
- The "Verify the served file" section (:80-95) holds two sequential checks (fetch the file, run `cairn doctor`) as paragraphs.
- The precondition is a bold run-in (`**Precondition:**`, :6) where Google and Microsoft would use a list or section.

---

## 6. Exemplar pages the chain feeds the drafter

| Exemplar | Base guide | Violations of the guide or the amended register |
|---|---|---|
| `docs/extend/enable-tidy.md` | Google | Zero numbered steps. "Turn it on" (:10-30) is a three-action procedure in prose ("Install the model SDK ... Then set `tidy.enabled: true` ... and bind ...") (S1, C7). Teaser headings: "What Tidy can't do to a document" (:99), "What a run costs and refuses" (:111), "What Tidy doesn't replace" (:121), all the register's own 2026-09-28 specimen shape (R:83-84). "You know it worked when" (:127). A sentence as a heading: "An editor's own dictionary sits outside this" (:92). `Google.Headings` false positive on "Enable Tidy" (:1). |
| `docs/extend/restrict-admin-access.md` | Google | Zero numbered steps across "Declare the map" (:18) and "Enforce it on your own route" (:63). A bold run-in precondition, `**Precondition:**` (:11), which the trigger page copied. Contrast-frame and aphorism headings: "`ownerOnly` stacks on the map, not the nav" (:102, code in heading plus a "not X" frame) and "Hiding is not denying" (:135). "You know it worked when" (:144). |

The chain's proof page inherited the bold precondition, the prose checks, and the long-sentence verify section. Neither exemplar is eligible under 4g.1 until it is rebuilt.

## Questions for Geoff

1. **Q1, the voice (C2).** Should the technical and academic voice become a recorded Google exception, covering G-tone's conversational register and G-a11y's under-26-word guidance? If so, on which arms? Recommendation: record it for extend, reference, and the front door. On admin task steps, the guide wins.
2. **Q2, the editors voice and headings (C3, C4).** Should Microsoft's voice govern `docs/editors/**` unmodified, with the reader's own question headings allowed, dropping the "professional academic introduction" framing? Recommendation: yes. The no-pitch keystone and the tell catalogue stay as the overlay.
3. **Q3, confirm the tightened deviation clause (C1).** Only your recorded ruling creates an exception, per guide, per base rule. No writer or reviewer may create one. The design assumes yes.

This is a method call, so it is not a question, but it should be visible: the design revives, as Vale and markdownlint rules, part of what APP:88 retired (`check:headings`). It does not revive the templates or the registry.
