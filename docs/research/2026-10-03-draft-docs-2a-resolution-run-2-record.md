# Task 7b resolution run 2: page plans and round-2 findings

Agent-facing stage record for draft docs stage 2a, task 7b's second resolution run. Written 2026-10-03 from the run result JSON and the run journal. Source of truth for what the plan readers and round readers said; nothing here is a ruling. The earlier run's record is `docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md`.

## Run

- Run: `wf_ab29e38c-e13`, on runner dotfiles `526c111`.
- Args: `bothReviewers: true`, `inFlight: 3`, `planModel: fable`; all six pages ran as `rework` pages. The rework texts pointed at `docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md`.
- Started from commit `2aacb280` on `draft-docs-2a`.
- Cost: 68 agents, 8,034,514 subagent tokens, 1,212 tool calls, about 120 minutes; run result `spent` value 1351043.
- Outcome: 0 of 6 pages accepted, all six escalated. One escalated on a second plan-read fix verdict with no drafting (security-model; its page was not redrafted and `docs/extend/security-model.md` is unchanged from `2aacb280`). Five were drafted and escalated after round 2 (add-a-custom-admin-screen, replace-magic-links-with-cloudflare-access, add-cairn-to-a-sveltekit-app, theme-your-public-site, architecture; reason "second fix verdict or red gate").
- The plan step reached an accept verdict on the re-read (or the first read) for five pages and drafted them; the final reader read ran on no page.
- Whole-tree gate after the run, `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs-gate'`: exit 0, `check:docs-gate: OK (17 check(s))` (log `/tmp/cairn-gate-1000/8aa56a1e4724df2b/gate.log`). Green; no page was fixed after the run.
- Round drafter gates (page-scoped `check:docs-gate`): passed on every drafted page and round except theme-your-public-site, which was red in both rounds. Both reds are `check:symbols` on another page, `docs/extend/add-a-custom-admin-screen.md` (`migrations-app/0000_signups.sql`, a file-path span that page carried at :26 and :27 while the add-a-custom-admin-screen drafter was editing it concurrently); the theme drafter reported its own checks green. The whole-tree gate after the run no longer carries that path, so the red is gone from the final tree.
- Seats: S = structural edit, R = register editor, F = fact read, Fig = figure verifier. The plan step has a structural-edit read only.
- Em dashes in reviewer text were replaced with hyphens for this record.

## Verdicts

| Page | Plan reads | Round 1 reads | Round 2 reads |
|---|---|---|---|
| add-a-custom-admin-screen | S fix (1), S accept (0) | S accept (0), R fix (4), F fix (3), Fig accept (0) | S accept (0), R fix (2), F fix (1), Fig accept (0) |
| replace-magic-links-with-cloudflare-access | S fix (1), S accept (0) | S fix (1), R fix (5), F fix (2), Fig accept (0) | S fix (1), R fix (4), F accept (0), Fig accept (0) |
| security-model | S fix (1), S fix (1) | not run | not run |
| add-cairn-to-a-sveltekit-app | S accept (0) | S accept (0), R fix (4), F accept (0) | S accept (0), R fix (1), F accept (0) |
| theme-your-public-site | S fix (1), S accept (0) | S fix (1), R fix (9), F fix (5) | S fix (3), R fix (3), F fix (1) |
| architecture | S accept (0) | S accept (0), R fix (1), F accept (0), Fig accept (0) | S accept (0), R fix (2), F fix (3), Fig accept (0) |

Counts in parentheses are blocking findings. Plan-read rows list the first read, then the re-read after the plan was revised.

## Pages

### add-a-custom-admin-screen

Status: escalate (second fix verdict or red gate). Page: `docs/extend/add-a-custom-admin-screen.md`. Brief: `docs/internal/briefs/extend/add-a-custom-admin-screen.json`. Plan: `docs/internal/briefs/extend/add-a-custom-admin-screen.plan.md`.
Rework: True. Rounds drafted: 2. crossRegression: False.

#### Plan step

Plan revised after the first read: True.

Plan read 1 (structural edit): verdict fix, blocking 1.

````text
This was the third structural read of the add-a-custom-admin-screen page plan, graded at the plan level. These parts pass:
- The order follows the build dependencies: route, gate, wrapper choice, wrapping, sink, toolkit, style, the two optional recipes, motion, verify, failure path, see also.
- The pace and the user goal are right.
- The introduction has all three of Google's parts, plus the task-guide contract and the wrong-place routes.
- All four outline cross-links have a place: restrict-admin-access, arrange-the-admin-sidebar, debug-your-site (under the failure path), and run-cairn-audit-on-your-site.
- The task-guide anatomy holds: preconditions with links, a one-step bulleted gate, a bare-infinitive Verify with numbered checks, a failure path that points at the recovery surface, and See also without the recovery link.
- The departures for covers items 9, 10, 11, and 14 are recorded.

One finding blocks. In Load row detail on demand (lines 420-446), no step creates or connects the open handler that steps 5-9 work inside. The procedure also ends at caching and never renders the detail or a failure in the panel, so the task stops short of its goal. One advisory finding: the toolkit section switches to an Events example, and the plan's wording about it contradicts itself. Verdict: fix.
````

Plan read 2 (structural edit): verdict accept, blocking 0.

````text
I graded the plan (it is at its fourth revision) at the structural-edit level and did not open the page, as the task required. It has no blocking findings, so the verdict is accept. I did not run `npm run check:vale`: there is no page prose to lint yet, and Vale's config excludes internal plan docs.

- **Order:** The page follows the order a developer builds it: route, gate, wrapper choice, wrap, audit sink, toolkit, styling, the two optional recipes, motion, then verify. The task-guide anatomy holds: introduction, preconditions, steps, verify, failure path, see also. The plan states the reason for each placement, including why the nested-route steps moved to Load row detail on demand.
- **Pace:** Every task heading carries at least one step, and explanation hangs under the step it constrains. The detail lists that were cut point to named reference entries.
- **User goal:** The first sentence states the outline's four outcomes, and Verify checks each one.
- **Introduction:** It covers all three of Google's parts (what the page covers, prior knowledge, what it leaves out). It names three wrong-place pages by title. The remaining out-of-scope items get one sentence that defers to See also, which lists the same pages. The plan explicitly drops the sixth out-of-scope item (former audit norm values) and says why.
- **Cross-links:** All four outline cross-links land: restrict-admin-access, arrange-the-admin-sidebar, debug-your-site (under Resolve a missing audit record) and run-cairn-audit-on-your-site.
- **Troubleshooting:** It is covered where needed: the 403 diagnostic on Verify check 1, the dialog's error branches, the fetch error handling, and Resolve a missing audit record.

Two advisory findings remain:
1. Verify check 2 needs an editor account that the preconditions never list.
2. The introduction gives prior knowledge but never says who the page is for, which the anatomy asks for.

Plan file: /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/internal/briefs/extend/add-a-custom-admin-screen.plan.md
````

Plan `couldNotDo`:

- The third plan read asked the final step of Load row detail on demand to render the cached detail or a short failure message with a way to retry when the fetch failed. No fact in the inventory states what a row's panel shows while the fetch is pending or after it fails (f:od9mww states only that a failed row stays retryable, which hangs under the cache step), so step 11 carries the render clause alone, per the read's own fallback, and the page gives no failure display. Filed as a facts-container hole (new this revision).
- No fact in the inventory states ExpandableRow's controlled contract, the expanded prop and the onToggle callback the caller holds (src/lib/admin-toolkit/ExpandableRow.svelte:9-11; the ExpandableRow entry in docs/reference/admin-toolkit.md), which steps 4 and 5 of Load row detail on demand need to render the rows and connect the open handler. Both steps link the entry and claim no prop; the entry states the contract with an example, confirmed this revision. Filed as a facts-container hole (second revision, carried).
- The extend track's recovery surface, docs/extend/debug-your-site.md, carries no auth.access.refused symptom row in its outline covers or fact ids, so the owner's-403 diagnostic on Verify check 1 (f:3lbdl6) points at restrict-admin-access and the auth.access.refused row in docs/reference/log-events.md instead of the recovery surface the task-guide anatomy names. Filed as friction feeding that page's inputs (first revision, carried).
- f:hafpqf is subordinated to docs/reference/sveltekit.md (createSectionAction check order item 2 and the SectionActionConfig type row), which states the rate limit's members, order, and degrade-to-open but not the default 429 copy or the redirect()/error() carve-out. Filed as reference-arm friction; the fact stays subordinated (carried).
- No fact in the inventory states that a custom screen's form mounts CsrfField, though docs/reference/admin.md's CsrfField entry says a form without it fails the guard's token check and the example site mounts it in both signups forms. The plan keeps <CsrfField /> in the dialog snippet's code and lets the page make no prose claim. Filed as a facts-container hole (carried).
- The outline's figure note asks for the signups screen with its dialog; the only shell-hosted story is toolkit/custom-screen (friction already logged 2026-09-30). The plan keeps that story and its Events snippet as the toolkit section's marked, smaller example (carried).
- Covers item 9 asks the motion section to cite admin-design-system by heading; that document is internal, so the page cites the docs/reference/cairn-audit.md headings instead, per the conductor's ruling (carried).

Plan `frictionFiled`:

- docs/internal/docs-friction-log.md, under "Filed 2026-10-03 by the page plan for docs/extend/add-a-custom-admin-screen.md (draft docs stage 2a, task 7c)": `extender`, found by the add-a-custom-admin-screen page plan's second revision on 2026-10-03 (f:vao0dd, f:n2bhjw, f:pswc3n), a hole in docs/internal/facts/: no fact states ExpandableRow's controlled expanded/onToggle contract, so the row-detail markup step links the reference entry and names no prop (new this revision)
- docs/internal/docs-friction-log.md, under "Filed 2026-10-03 by the page plan for docs/extend/add-a-custom-admin-screen.md": `extender`, found by the add-a-custom-admin-screen page plan's third revision on 2026-10-03 (f:od9mww, f:uy7vyc), a hole in docs/internal/facts/: no fact states what a row's ExpandableRow panel shows while the detail fetch is pending or after it fails, so the recipe's final step renders the cached detail alone and the page gives no failure display (new this revision)
- docs/internal/docs-friction-log.md, same group: `extender`, found by the add-a-custom-admin-screen page plan's second revision on 2026-10-03 (f:vao0dd, f:n2bhjw, f:pswc3n), a hole in docs/internal/facts/: no fact states ExpandableRow's controlled expanded/onToggle contract (filed by the prior revision, carried in this report)
- docs/internal/docs-friction-log.md, same group: `extender`, found by the add-a-custom-admin-screen page plan's revision on 2026-10-03 (f:3lbdl6): debug-your-site's outline carries no auth.access.refused symptom row for an owner's 403 on an unmapped custom route (filed by the prior revision, carried in this report)
- docs/internal/docs-friction-log.md, same group: `extender`, found by the add-a-custom-admin-screen page plan on 2026-10-03, a hole in docs/internal/facts/: no fact states that a custom screen's form mounts CsrfField (filed by the prior plan step, carried in this report)
- docs/internal/docs-friction-log.md, same group: `extender`, found by the add-a-custom-admin-screen page plan on 2026-10-03 (f:hafpqf): the createSectionAction reference entry states neither the default 429 copy nor the redirect()/error() carve-out (filed by the prior plan step, carried in this report)

#### Rounds

Round 1: gate pass; index link: present docs/extend/README.md: ./add-a-custom-admin-screen.md under "Extend the admin".
Reads: structural edit accept (blocking 0); register editor fix (blocking 4); fact read fix (blocking 3); figure verifier accept (blocking 0).

Round 1 drafter `couldNotDo`:

- Dropped the plan's prior-knowledge clause naming the scaffolded or add-cairn site from the introduction. Before you begin already states that precondition with its link, so repeating it would restate it.
- Left out the plan's explicit hand-off sentences for Before you begin to Place the route, Wrap the actions to Wire the AuditSink, Wire the AuditSink to markup, and Style the screen to the recipes. Each next section's first sentence already makes the tie, and a separate hand-off would only restate it or describe the page. The Place the route, Gate it, and Compose hand-offs are kept.
- The Choose the action wrapper table leaves out the plan's clauses 'so the form keeps the editor's input' and 'to the nearest error page'. No carried fact states either one.
- The plan's sentence 'a component tied to one site's data stays in the site's src/lib/admin/' is not supported by f:mfa5vi, which is about cairn's content concepts. The page states f:mfa5vi as written and adds the graduation rule (f:asujoi).
- The page says 'the scaffold's signups migration' instead of naming migrations-app/0000_signups.sql, because check:symbols cannot resolve that site path (friction filed).
- Did not dispatch the figure-verifier agent that the cairn-figure skill names. The repro fence is kept exactly as committed, as the plan directs, and this seat has no agent-dispatch tool.

Round 1 drafter `frictionFiled`:

- docs/internal/docs-friction-log.md, under "Filed 2026-10-03 by the resolution redraft of docs/extend/add-a-custom-admin-screen.md": extender, the import step cannot name @glw907/cairn-cms/admin-toolkit because the only fact stating it (f:7ik6ng) is subordinated, and no carried fact names use:enhance (f:7ik6ng, f:5t1i7o, f:clyg9r, f:jra92k)
- docs/internal/docs-friction-log.md, same group: contributor, check:symbols resolves file-path spans against the engine root, so the scaffold path migrations-app/0000_signups.sql (f:onqm6k) fails and the page says "the scaffold's signups migration" instead

Round 1 fact read `frictionFiled`:

- Filed 2026-10-03 by the scoped fact read of docs/extend/add-a-custom-admin-screen.md's resolution redraft: frame-offset allowance counted per run, not per screen as the cairn-audit reference states (f:2khr2m)

Round 2: gate pass; index link: present docs/extend/README.md: ./add-a-custom-admin-screen.md under "Extend the admin".
Reads: structural edit accept (blocking 0); register editor fix (blocking 2); fact read fix (blocking 1); figure verifier accept (blocking 0).

Round 2 redraft drafter `couldNotDo`:

- Fact read blocking finding on S180 (Verify step 1): the fix was to cite f:8anql1, which says requireAccess logs auth.access.refused. That id is not in this dispatch's fact list, so I dropped the claim and the log-events pointer from Verify step 1. The step now reads 'A 403 here means the access map has no rule for the route.' followed by 'Restrict admin access describes how to declare the rule.' Restoring the auth.access.refused pointer the plan wants needs f:8anql1 added to the page inputs.
- Advisory not taken: the register editor asked to shorten the Before you begin list intro to 'The steps assume the following:'. The plan fixes that section's first sentence, and the drafting rules protect a sentence that carries a section's claim, so the sentence stays.
- Advisory not taken: renaming 'Gate it' to 'Gate the screen'. The outline suggests 'Gate it' so a restored reference link can reuse the old slug (outlines/extend.json relink entries), and the plan passed the heading, so it stays. 'Wire the AuditSink' became 'Wire the audit sink' as the blocking finding required. Its slug changes from #wire-the-auditsink to #wire-the-audit-sink, and the relink entries in outlines/extend.json point at 'the heading that now carries the old content', so the restorer should target the new slug. The plan file still names the old heading; I did not edit the plan.
- Structural advisory on the migration precondition: I could not name the file path migrations-app/0000_signups.sql, because check:symbols fails on a scaffold-relative path the repo tree lacks. The bullet names the scaffold's `migrations-app` directory instead, and a separate sentence links Cloudflare's D1 migrations documentation.
- Fact read advisory on step 6 of Load row detail on demand (formerly step 5): no fact states the controlled expanded/onToggle wiring, and that gap is already in the friction log. The step still links the ExpandableRow entry's example and names no prop. The step is now split: step 5 writes the open handler and step 6 connects it, so the procedure has twelve steps, not the plan's eleven.

Round 2 redraft drafter `frictionFiled`:

- (none)

Round 2 fact read `frictionFiled`:

- Filed 2026-10-03 by the fact read of `docs/extend/add-a-custom-admin-screen.md` (draft docs stage 2a, task 7b resolution run 2): extender, the ExpandableRow reference example's bare `<th></th>` contradicts the recipe's sr-only `<th scope="col">` (f:n2bhjw, f:vao0dd)

#### Escalation findings (final, in full)

````text
## structural edit: accept
Structural edit of /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/add-a-custom-admin-screen.md against its plan (docs/internal/briefs/extend/add-a-custom-admin-screen.plan.md), the task-guide anatomy, the Red Hat structure checklist, and Google's large-docs items. Verdict: accept, with no blocking findings. The introduction has the contract first sentence, what the page covers (with the optional sections marked), the prior knowledge, and the three wrong-place routes plus a closing out-of-scope sentence. The sections follow the plan's dependency order: preconditions, route, gate, wrapper choice, wrapping, sink, toolkit, styling, two optional recipes, motion, a bare-infinitive Verify, a failure path pointing at debug-your-site, and See also. Every crossLinks entry whose from is add-a-custom-admin-screen is honored: restrict-admin-access, arrange-the-admin-sidebar, debug-your-site (in the failure path, not repeated in See also, per the anatomy), and run-cairn-audit-on-your-site (rendered run). Two procedures split one step relative to the plan (the dialog form has 8 steps where the plan has 7, row detail 12 where it has 11), and each split is still one action per step. Five advisory findings: (1) the 'Wire the audit sink' heading departs from the plan and outline's 'Wire the AuditSink' without a recorded reason, and Vale raises nothing on the suggested form; (2) Verify check 1 drops the plan's log-events pointer for auth.access.refused; (3) the introduction says the signups example runs through 'its markup', but the toolkit section uses Events; (4) the introduction never says who the page is for; (5) two trailing styling facts follow the steps without a lead-in. npm run check:vale exits 0 with no finding on this page. As the editor seat, I made no edits.
- [advisory] docs/extend/add-a-custom-admin-screen.md:193: The heading reads 'Wire the audit sink', so its slug is #wire-the-audit-sink. The outline suggests 'Wire the AuditSink' so that a restored reference link can reuse the old slug, and the plan (plan.md:66, :246) adopts that heading verbatim. The departure has no recorded reason, and Vale does not force it: a test run with 'Wire the AuditSink' at :193 raised no alert. No page links either slug today, so nothing breaks now. The heading still departs from the plan, though no checklist item fails.
  rewrite: ## Wire the AuditSink
- [advisory] docs/extend/add-a-custom-admin-screen.md:497-498: Verify check 1 gives the 403 diagnosis and the Restrict admin access link. The plan also has this check point at the auth.access.refused row in docs/reference/log-events.md as the event to look for (plan.md, Verify the screen), because the recovery surface has no row for that event. Without the pointer, the reader has no log-side signal for the most likely first failure (Red Hat, troubleshooting and error recognition). The item is advisory because the diagnosis itself is present.
  rewrite: After :498 add: "The [`auth.access.refused`](../reference/log-events.md#authaccessrefused) event records the refusal." (Confirm the anchor against log-events.md.)
- [advisory] docs/extend/add-a-custom-admin-screen.md:8: Under Google's 'check your entire document against the expectations you set' test, the introduction says the signups example runs through 'its markup'. The page never shows the signups +page.svelte table markup, though. Compose the screen from the toolkit switches to the smaller Events screen at :240, and only the dialog at :356 returns to signups. A reader expecting the signups markup will not find it. The plan keeps the Events aside on purpose, so only the intro's wording needs to change.
  rewrite: The example runs from the screen's route through its load, its actions, and their audit calls; a smaller Events screen then shows the toolkit's markup, and the signups create dialog closes the markup.
- [advisory] docs/extend/add-a-custom-admin-screen.md:12: The task-guide anatomy asks the introduction to state who the page is for. The page has a prior-knowledge sentence but never names the reader. The outline names that reader as a Svelte-fluent web developer building an organization's site on cairn's seams. The prior-knowledge sentence nearly covers it, so this item is advisory.
  rewrite: For a developer building a site on cairn's seams, the steps assume familiarity with SvelteKit's form actions and server hooks and with Svelte's snippets and runes.
- [advisory] docs/extend/add-a-custom-admin-screen.md:314-315: The hairline and selected button looks and the cairn-text-warning/success rule come after the numbered steps in Style the screen. No sentence ties them to a step. The anatomy keeps explanation subordinate to steps with a lead-in, and these two read as loose facts after the procedure ends. The placement matches the plan, so the item is advisory.
  rewrite: Open :314 with a tying sentence, such as "Two stock classes cover a screen's buttons and status text.", or hang both sentences under step 2 as companions of the ladder.

## register editor: fix
I graded `docs/extend/add-a-custom-admin-screen.md` in the draft-docs-2a worktree on the Google track, using the developer brief, Names, page anatomies, the extend track, and the deviation rows. `git diff` shows a page-level rewrite: nearly every prose line changed, so all prose was in scope.

**Deterministic floor**
- **Vale:** 0 errors. The warnings are 'admin' (sanctioned by the Names table for the extend track), three Oxford-comma false positives on ', as X describes', and one `Cairn.NamesRetired` on 'with the package' at line 284. That last one is the correct sense, since it's a fact about the tarball.
- **tellgrader:** no findings.

**Measures**

| Measure | Value |
|---|---|
| Sentences (scanner) | 138 |
| `hinged_pair_share` | 0.33 |
| `short_sentence_share` | 0.087 |
| Average sentence length (my count) | about 16 words |
| Longest sentence | 31 words (the contract, the CairnAdminShell definition, and the Verify lead) |
| Paragraphs, including list blocks | 98 |

No paragraph is disproportionate. The longest block is the step-2 explanation under Style the screen, at six sentences.

**Plan reads.** All three blocking plan-read findings are closed on the page:
- See also now carries Configure media.
- Build the dialog form is an eight-step procedure, with each rule placed under the step it applies to.
- Load row detail on demand has a step that renders `ExpandableRow`, with the three markup rules under it.

The introduction has the contract and Google's three parts. The order follows the plan.

**Blocking.** Two precondition bullets in Before you begin are over the 26-word limit for a list item: line 23 (28 words) and line 26 (44 words). Under the deviation row that is a blocking guide finding.

**Non-blocking**
- The introduction claims the running example covers 'its markup, and its styles', but the page never shows the signups markup.
- The page heading 'Wire the audit sink' differs from the plan's verbatim 'Wire the AuditSink'.
- Verify step 1 dropped the `auth.access.refused` log-events link that the plan placed there.
- The status-text sentence is a possible non-sequitur for the claims checker.
- There are two restatements.
- The corner ladder is used one sentence before it is introduced.
- The 'and never' second beat recurs six times.

**Verdict.** The draft reads as a plausible human author in the cairn docs voice. It is measured and precise, with no marketing, figurative language, or virtue claims, and every task section has its step. The change that would help most is mechanical: move the hand-built-site sentence and the `APP_DB` migration detail out of the precondition bullets into sentences after the list. That clears both blocking findings and stops the list mixing bullet forms.
- [BLOCKING] docs/extend/add-a-custom-admin-screen.md:26-28 (Before you begin, third bullet): Base-guide finding on a brief rule: 'A step, a list item, and each sentence in a task section stay under 26 words.' This precondition bullet runs three sentences and 44 words: "A D1 binding for the screen's data, as Cloudflare's [D1 Workers Binding API](...) describes. The scaffold binds `APP_DB`, whose `signups` table exists only after the signups migration in the scaffold's `migrations-app` directory is applied. Cloudflare's [D1 migrations](...) documentation describes how to apply a migration." The deviation row says a list item over 26 words is a blocking guide finding. The bullet also breaks 'Every item in a list shares one form', since bullets 2 and 4 are single noun-phrase items. The scaffold detail is a statement about the example and doesn't belong in a precondition, so it moves out of the list.
  rewrite: Keep the bullet as: "- A D1 binding for the screen's data, as Cloudflare's [D1 Workers Binding API](https://developers.cloudflare.com/d1/worker-api/) describes." After the list, ahead of the tree paragraph, add: "The scaffold binds `APP_DB`. Its `signups` table exists only after the signups migration in the scaffold's `migrations-app` directory is applied, as Cloudflare's [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/) documentation describes."
- [BLOCKING] docs/extend/add-a-custom-admin-screen.md:23-24 (Before you begin, first bullet): Base-guide finding on the same brief rule: at 28 words this list item is over the limit. "A site that `create-cairn-site` scaffolded, whose `cairn-audit.config.json` names both compiled admin sheets. For a hand-built site, [Add cairn to a SvelteKit app](...) brings it to the same shape." The second sentence is an alternative route to the precondition, not part of the precondition.
  rewrite: Keep the bullet as: "- A site that `create-cairn-site` scaffolded, whose `cairn-audit.config.json` names both compiled admin sheets." After the list, add: "For a hand-built site, [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) brings it to the same shape."
- [advisory] docs/extend/add-a-custom-admin-screen.md:21: Restatement tell ('No restatement or filler'), plus a 27-word sentence in a task section. "The steps assume a scaffolded site, an access-map rule for the screen, a D1 binding for the screen's data, and a D1 database for the audit trail:" repeats all four bullets of the list it introduces, which gives list cadence in prose. Google wants a complete introductory sentence, not an inventory.
  rewrite: The steps assume the following:
- [advisory] docs/extend/add-a-custom-admin-screen.md:8 (Introduction): Overclaim in the introduction's scope statement (Russell: a claim the page doesn't deliver). "The example runs from the screen's route through its load, its actions, their audit calls, its markup, and its styles." The signups markup never appears on the page. Compose the screen from the toolkit deliberately uses a separate Events screen, and Style the screen shows no signups markup. Only the dialog snippet touches signups, and only through the create action. Google's intro check ('accurate overview of the topics you cover') applies here.
  rewrite: The example runs from the screen's route through its load, its actions, and their audit calls, and its create action backs the dialog form.
- [advisory] docs/extend/add-a-custom-admin-screen.md:193 (heading): Departure from the committed page plan. The plan states that its headings are the page's headings verbatim and names this heading `Wire the AuditSink` (plan :66, :246, and the dispositions table). The page reads 'Wire the audit sink'. The page's form is the better heading under Google, because 'AuditSink' is a code identifier that would need code font. Still, a page that departs from its plan without the plan recording it breaks the 'drafted from its committed page plan' rule.
  rewrite: Keep 'Wire the audit sink' and amend the plan's heading and its dispositions rows to match, recording why (a code identifier in a heading needs code font, and the plain noun phrase serves). Alternatively, use 'Wire the `AuditSink`'.
- [advisory] docs/extend/add-a-custom-admin-screen.md:497-498 (Verify, step 1): Plan departure on a cross-link. The plan's Verify check 1 places the `auth.access.refused` row of `docs/reference/log-events.md` beside `restrict-admin-access` as the diagnostic for an owner's 403, because the recovery surface has no such row (couldNotDo, friction filed). The page carries only the Restrict admin access link, so the event a reader looks for goes unnamed.
  rewrite: A 403 here means the access map has no rule for the route, and the [log events](../reference/log-events.md) reference lists the `auth.access.refused` record it leaves. [Restrict admin access](restrict-admin-access.md) describes how to declare the rule.
- [advisory] docs/extend/add-a-custom-admin-screen.md:315: Facts-adjacent non-sequitur, flagged for the claims checker. Line 291 says that the screen's utility classes compile only through the site admin sheet. This sentence then justifies `cairn-text-warning` by what the packaged sheet doesn't compile: "since that sheet does not compile the bracketed `text-[var(--cairn-warning-ink)]` ... forms". `f:q4jyat` states the packaged sheet's behavior. Whether the site sheet, which scans `./routes/admin`, would compile the bracketed form from site markup is not stated, so the 'since' may give the wrong reason.
  rewrite: For warning or success text, the screen uses `cairn-text-warning` and `cairn-text-success`, the classes the packaged admin sheet defines for those inks. (Keep the bracketed-form clause only if the claims checker confirms that the site sheet also omits it.)
- [advisory] docs/extend/add-a-custom-admin-screen.md:292 and 302: Restatement tell. "The screen matches the admin's design by using stock daisyUI classes." (292) and "The admin is built in daisyUI and Tailwind, the idiom a custom screen extends." (302, under step 1) state one fact twice within ten lines. The step-1 explanation also doesn't explain step 1. The step is about where the markup lives, and its reason is the `@source` roots stated at 293.
  rewrite: Cut line 292. Under step 1, write: "The site admin sheet scans only these two roots, so markup elsewhere never compiles. The admin is built in daisyUI and Tailwind, and every daisyUI component and utility class except calendar compiles into the admin sheet, so the screen uses any of them without a safelist entry."
- [advisory] docs/extend/add-a-custom-admin-screen.md:307-308 (Style, step 2 explanation): A missing middle step in the order. "A fixed radius still compiles in the admin sheet but does not follow the corner ladder." refers to 'the corner ladder' one sentence before "Both admin themes set daisyUI's radius tokens as a three-step ladder" introduces it.
  rewrite: Both admin themes set daisyUI's radius tokens as a three-step ladder. `--radius-selector` covers chips and small markers, `--radius-field` covers controls, and `--radius-box` covers cards and dialogs. A fixed radius still compiles in the admin sheet but does not follow that ladder.
- [advisory] docs/extend/add-a-custom-admin-screen.md:112, 131, 280, 305, 332, 336: Cadence tic, a mild balanced-halves relative. 'X and never Y' recurs as a sentence's second beat six times: 'inherits the guard and never the screen's `requireAccess` rule', 'an access-map key and never a request path', 'and never `overflow-x-auto`', 'never a fixed Tailwind radius', 'and never inside a `<form method="dialog">`', 'and never call `update()` on `'error'`'. Each one is true. Repeated, they become a signature rhythm.
  rewrite: Vary at least two of them. Line 280: "The wrapping `<div>` carries `overflow-hidden card-shell card-shadow`. It omits `overflow-x-auto`, because `AdminTable` sets its own horizontal scroll." Line 112: "A route nested under the screen inherits the guard but not the screen's `requireAccess` rule."
- [advisory] docs/extend/add-a-custom-admin-screen.md:439 (Load row detail, step 7 explanation): Restatement. "Fetching on open and caching per row costs only the rows a reader opens." repeats the section's opening claim at 415-416 almost word for word.
  rewrite: Cut the sentence. The step needs no explanation beyond its own action.
- [advisory] docs/extend/add-a-custom-admin-screen.md:59: Ambiguous pronoun. In "Every `/admin/**` route renders as the shell's children with its nav, user, and theme", 'its' grammatically binds to 'route'. The nav, user, and theme are the shell's.
  rewrite: Every `/admin/**` route renders as the shell's children, inside the shell's nav, user, and theme, so the screen needs no wrapper code.

## fact read: fix
I graded the page against its claims as it stands after rework run 2. The rework rewrote most of the page (221 insertions, 119 deletions), so I checked all of it, not only the changed lines. What passed:
- All 218 brief sentences appear verbatim on the page, and no page line lacks a brief sentence.
- Every one of the 77 outline ids is either cited or cut with a reason. No id is both cut and cited.
- Every claim the inventory marks "carried" is cited on the page in its planned section. The one naming difference is that the plan calls a section "Wire the AuditSink" and the page calls it "Wire the audit sink"; all six of its facts are there.
- The topics of the retired animate-a-custom-screen page are handled. Each verified fact is carried, cut with a reason, or covered by the links to the cairn-audit reference headings. The ids not in the outline are [rejected] facts.
- No row in docs/internal/option-map.json reads "pending add-a-custom-admin-screen", so I retagged no fact [docs-drift].
- I checked the sources behind the cited facts: the template and showcase signups routes, src/admin.css, the scaffold's package scripts, the CI workflow, cairn-audit.config.json, the radius and motion tokens, the reduced-motion rule, DEFAULT_ADMIN_SCOPE, exitCodeFor, the fail()-exempt unaudited check, the section-action audit defaults and refusal comment, the sink's fail-open and waitUntil behavior, the audit_log migration, the chrome guard, and the shell's siteName and favicon. All match.
- Every reference anchor the page links exists.

One blocking finding: the first sentence of "Animate the screen" changed in the rework and claims "error-tier" rules with no fact behind it. The facts that state the tier are now cut, and f:06bmkq is rejected. The fix is to drop the qualifier or mint and cite a verified fact. Four advisories are listed, including the heading-name mismatch.

I filed one friction entry. The ExpandableRow reference example uses a bare `<th></th>`, which contradicts the page's `<th scope="col">` with an `sr-only` span (f:n2bhjw).
- [BLOCKING] docs/extend/add-a-custom-admin-screen.md:472 (Animate the screen, first sentence; brief sentence S171, ids f:326755, f:017qss): This sentence changed in the rework, and its "error-tier" claim now has no fact behind it. Neither cited fact states a tier. f:326755 says the custom screen and the engine's screens run the same static rule objects and one motion ruleset. f:017qss states the token set and that motion-vocabulary accepts only those names. The three facts that state "error tier" (f:09g8ev, f:0aa9tp, f:0mbj5n) are cut in the inventory, and the retired page's f:06bmkq is [rejected]. Before the rework the sentence was backed by the three-rule list, which is now cut. The code does run all three rules at tier 'error' (motion-property.ts:430, motion-vocabulary.ts:411, motion-hover-gate.ts:74), but the claim must cite a fact.
  rewrite: When a screen animates, `cairn-audit` holds its motion to the same rules as the engine's screens, so each transition names its duration and easing with the admin's motion tokens. (Keep ids f:326755 and f:017qss. If the tier must stay, mint a [verified] fact that states the three admin-only motion rules run at error tier and cite it. Do not cite the cut ids.)
- [advisory] docs/extend/add-a-custom-admin-screen.md:193 (heading): The plan says its headings are the page's headings verbatim. It names this section "Wire the AuditSink" (plan lines 64-67, 246, and the Dispositions rows for f:68h31z, f:rurhey, f:6quvqm, f:ph6kjg, f:ff3l1u, f:da6d2z). The page keeps the committed "Wire the audit sink". All six facts sit in this section at the planned position, so nothing is omitted. Only the inventory's section name and the page heading disagree, and no record explains the departure. The relink rows in docs/internal/outlines/extend.json:1070,1079 restore to whichever heading carries the content, so neither slug breaks a link.
  rewrite: Record the departure in the plan, since sentence case without a bare type name in the heading is the Google-register reading. Change the plan's heading, its Dispositions rows, and the slug note to "Wire the audit sink". The other option is to rename the page heading to the plan's wording.
- [advisory] docs/extend/add-a-custom-admin-screen.md:490 (Verify the screen, first sentence; brief S182): "clears the error tier of `cairn-audit`" cites f:9xthnq, f:10ojk8, f:wnvqlz, and f:326755. None of them states the error tier or the exit code. f:1md5oj does, and the section cites it under S196 and S200.
  rewrite: Add f:1md5oj to S182's ids in the brief.
- [advisory] docs/extend/add-a-custom-admin-screen.md:319 (Build the dialog form, first sentence; brief S124): "survives every result only when its callback handles each of the four result types" claims a necessary condition. f:jra92k states only a sufficient one ("survives every result when its callback ..."). f:9fwsz5 shows that the default callback destroys the dialog on 'error', which supports the reading. The plan fixed this claim, so this note is advisory.
  rewrite: Leave as is, or cite f:9fwsz5 on S124 as well, so the "only" rests on a stated failure.
- [advisory] docs/extend/add-a-custom-admin-screen.md:436 (Load row detail on demand, step 6; brief S161): "connect the open handler as the `ExpandableRow` entry's example shows." The entry's example (docs/reference/admin-toolkit.md:835-861) wires `onToggle` to flip `expandedId` and contains no fetch handler, so it shows where the handler connects, not the handler itself. The link is accurate enough because the plan has the page claim no prop. The friction entry on the controlled-contract hole is already filed.

## figure verifier: accept
The page has one figure: the `repro` fence at line 274 for the toolkit/custom-screen story. It earns its place. It passes the removal test because it shows the composed screen inside the admin shell, which the snippet cannot show. It follows the repro fence rules: the caption is in the fence body and the default column width keeps it under the 320/390 bar. Its source is a checked-in story with a manifest entry, and its alt and caption meet the length, kind-first, and complete-sentence rules. No paragraph fails the missing-figure test. The step sequences are already numbered lists, the comparison of the two action wrappers is already a table, and the layering of the auth guard, requireAccess, and the action wrapper reads as short linear statements. The one difference from the outline (Events screen instead of the signups screen with a dialog) is a recorded plan decision and is already in the friction log, so it is noted but not blocking. One figure graded, one earns its place, none fail; verdict accept.
- [advisory] /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/add-a-custom-admin-screen.md:274: Earns its place. It passes the removal test: the snippet and the three-primitive list give the code, but only the reproduction shows how the composed screen sits inside CairnAdminShell under its topbar, which is hard to say in words. The source rule is met by the checked-in story (src/lib/reproductions/stories/CustomScreen.svelte, plus the manifest entry at src/lib/reproductions/manifest.ts:298 with host 'shell'). Omitting `width` selects the default column width, so the fence stays bound by the 320/390 bar as the ruling requires. The alt is 134 characters, under the 150 cap, and starts by naming the kind, 'Reproduction'. The caption is in the fence body, written in complete sentences, with no spatial reference.
- [advisory] /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/add-a-custom-admin-screen.md:274: The figure departs from the outline's figure note. The note asks for the signups screen with its dialog form; the page shows the smaller Events screen with no dialog. The departure is deliberate. The page plan records it (docs/internal/briefs/extend/add-a-custom-admin-screen.plan.md:300 and :820), and the friction log files the missing signups story (docs/internal/docs-friction-log.md:276). The prose marks the switch with 'A smaller screen shows the toolkit alone', and the snippet matches the story, so figure and text agree. This is noted, not graded down. The Build the dialog form section stays without a picture until a signups story exists.
- [advisory] /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/add-a-custom-admin-screen.md:277: Minor caption polish, not blocking. The caption names the page header and the status chips again, which partly repeats the alt's list of primitives. The alt also leans toward listing what is pictured rather than what the reader learns. One option is to have the alt state the takeaway and leave the per-part detail to the caption.
  rewrite: alt: Reproduction of a custom screen built only from toolkit primitives, rendering inside the admin shell with no wrapper code.
````

### replace-magic-links-with-cloudflare-access

Status: escalate (second fix verdict or red gate). Page: `docs/extend/replace-magic-links-with-cloudflare-access.md`. Brief: `docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.json`. Plan: `docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.plan.md`.
Rework: True. Rounds drafted: 2. crossRegression: False.

#### Plan step

Plan revised after the first read: True.

Plan read 1 (structural edit): verdict fix, blocking 1.

````text
I graded the plan at the structural level only and read the plan, never the page. The verdict is fix, on one blocking finding.

**What passes:** The introduction meets Google's three parts and the task guide anatomy's introduction. Paragraph 1 states the contract, the when and why, and who it is for. Paragraph 2 states the reader's prior knowledge and every "read instead" redirect. Paragraph 3 states what the page does not cover, naming security-model and add-cairn-to-a-sveltekit-app, which matches the outline's outOfScope. Both outline crossLinks are placed (security-model; add-cairn-to-a-sveltekit-app#customize-the-sign-in-email). Every outline cover is delivered, and each departure from the cover order is recorded with its reason. Pace, the step shape, the verification section, the failure path ending at debug-your-site, and See also all hold.

**Blocking finding:** The plan argues that the task is making two admission lists agree. No step in the Access section sets the application's policy, which is the second list, so that half of the join is never a step the reader performs. The fix is one added policy step with renumbering.

**Advisory findings:**
- The failure path has no step for an editor stopped at Cloudflare's block page, where no cairn log record exists.
- "The gate goes live" names the deploy, but Access is already live when the application is saved.
- The "Decide whether to switch" section sits ahead of the preconditions, against the anatomy's order.

`npm run check:vale` reports 0 errors; the plan itself is outside Vale's globs.

Plan: /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.plan.md
````

Plan read 2 (structural edit): verdict accept, blocking 0.

````text
Read the plan at docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.plan.md and checked it against the outline entry, its two cross-links (security-model, add-cairn-to-a-sveltekit-app), and the task guide anatomy in docs-register.md. The plan passes every Block 1 and Block 2 item, so there are no blocking findings and the verdict is accept. Module types: one task guide, with explanation tied to its steps and none ahead of the preconditions. Order: the introduction, then Before you begin, the roster, the Access application with its policy step, the exposures outside the application, the verifier, wiring and deploy, verify, the failure path, and See also. Each section hands the next its input. Departures from the outline's cover order are each given a reason. Pace: values are collected before they are used, and the two go-live moments are named apart. The user goal matches the outline's job. The introduction's three parts are present: covers (paragraphs 1 and 2), prior knowledge (paragraph 3), and doesn't cover (paragraph 4, naming security-model and the magic-link tutorial, the outline's outOfScope items). Both outline cross-links are placed. Troubleshooting is complete: the failure path covers both no-log refusals, every reason in the logged vocabulary, and ends at debug-your-site. Two advisories: Access step 7 has no location before its action, and the introduction is heavy, so it needs a per-paragraph sentence budget.
````

Plan `couldNotDo`:

- (none)

Plan `frictionFiled`:

- extender: Found by the replace-magic-links page plan's second revision on 2026-10-03 (f:fu4uis, f:sbv5xj; src/lib/sveltekit/guard.ts:288-313; docs/reference/log-events.md, the guard.refused row). The guard writes detail "error" on guard.refused both for a resolver that threw (message in a separate error field) and for a resolver that returned the literal error as its reason (no error field), at the same level, so a reader cannot tell a crash from a site-chosen reason except by the field's presence; the page's sample rethrows an unmapped jose failure instead of defaulting to error. A fix reserves the literal or gives a thrown resolver its own detail word.
- extender: Found by the replace-magic-links page plan's third revision on 2026-10-03 (f:agif8l, f:k40l86), a hole in docs/internal/facts/. No fact states what an Access policy is made of (the action that admits, or the rule selectors a roster maps onto), so the policy step names the policy's job and links Cloudflare's policies page for the rest, spelling neither. A fix harvests the Allow action and the selectors as a vendor fact so the step can name the selector for a roster of named editors.

#### Rounds

Round 1: gate pass; index link: present docs/extend/README.md: ./replace-magic-links-with-cloudflare-access.md under "Auth and access".
Reads: structural edit fix (blocking 1); register editor fix (blocking 5); fact read fix (blocking 2); figure verifier accept (blocking 0).

Round 1 drafter `couldNotDo`:

- The resolution run record's section for this page (docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md, '### replace-magic-links-with-cloudflare-access') holds only the escalation status line: no plan-read findings and no couldNotDo dispositions. The committed plan's 'Plan read 1/2/3 findings, disposed' tables were taken as the authoritative record of the blocking findings, and the page follows them: the failure path's step order, the deploy step that marks when identity mode goes live, and the policy step.
- Policy step (Create the Access application, step 3): no fact names the Access policy action or its rule selectors, so the step states only what the policy must do and links Cloudflare's policies page. The plan already filed this facts gap in the friction log.
- Logout address (Access step 7 and the config module): no fact gives Access's logout address, so the page links the session management page and never writes the address out. The plan already filed this gap too.
- Block-page wording: no fact describes what an editor sees when Access refuses them, so the plan's 'Cloudflare's block page' is drafted as 'stopped by Access' (Access step 3's sub-paragraph and failure step 2), which f:agif8l supports.
- The plan's 'npm run build' wording is drafted as 'build the site', with only `npx wrangler deploy` in a code span. f:9ug9mo states the deploy command but no cited fact states the build command, and the deploy step links the tutorial's step, which carries both commands.
- Added f:hilyos to Access step 3's sub-paragraph, alongside the plan's [f:agif8l, f:k40l86], because the sentence says the guard refuses an unrostered user 'as unknown' and only f:hilyos states that.

Round 1 drafter `frictionFiled`:

- (none)

Round 1 fact read `frictionFiled`:

- extender: Found by the replace-magic-links fact read on 2026-10-03 (f:fu4uis, f:lyaf6p, f:s9s8mw), a hole in docs/internal/facts/: no fact states jose's error codes the sample maps

Round 1 figure verifier `frictionFiled`:

- src/lib/sveltekit/health.ts:1 and :9 comments say `/admin/healthz`, but the scaffold route and the verified fact f:paotzb put `/healthz` at the site root. The source comment is stale (not this page's defect).

Round 2: gate pass; index link: present docs/extend/README.md: ./replace-magic-links-with-cloudflare-access.md under "Auth and access".
Reads: structural edit fix (blocking 1); register editor fix (blocking 4); fact read accept (blocking 0); figure verifier accept (blocking 0).

Round 2 redraft drafter `couldNotDo`:

- Fact read BLOCKING 1 is only partly closed. The jose error-code mapping (ERR_JWT_CLAIM_VALIDATION_FAILED with claim 'aud'/'iss', the ERR_JWKS_* codes, and the rest) has no fact among the dispatched ids. The fix needs a vendor fact harvested from https://github.com/panva/jose/blob/main/src/util/errors.ts ([external: jose]) listing those codes and the `claim` property. I filed no fact. Done so far: the prose claim that a wrong AUD tag or team domain logs at error is dropped; the sentence after the sample now cites only f:fu4uis (the guard logs a rethrown failure at error); the unsourced minification clause is cut from the code comment. The code sample still holds the reasonFor mapping, because the plan requires it. The conductor should re-run page inputs for the jose fact, then restore the wrong-AUD-tag consequence sentence and cite the new fact beside the sample.
- Plan departures, taken on the reviewers' findings because the register outranks the plan on voice and anatomy: (1) In Before you begin, the connector and one-time-PIN sentence is cut (vendor specifics get a link), and the compose-section link for bootstrapOwner is dropped to reduce overlinking. (2) The verifier's stateless and display-name qualifications moved out of the list items into sentences after the list. (3) Three hand-offs are cut as restatement or inaccurate: the verifier's go-live hand-off, the wire section's 'Verify the gate confirms...', and Resolve's closing log-events sentence. (4) The wire section's 'three things differently' paragraph is now a bulleted list. (5) The Access application's first sentence now rests on the guard trusting the asserted email (cites f:33upyd and f:vnm1p5, no longer f:agif8l). (6) The Close-exposures first sentence is split, and its 'before the deploy' clause moved into the steps' lead-in sentence.

Round 2 redraft drafter `frictionFiled`:

- Amended the existing 2026-10-03 jose fact-hole entry (extender, filed by the fact read) in docs/internal/docs-friction-log.md: it now records that the redraft drops the wrong-AUD-tag prose claim until the harvest lands, and that the 2026-09-30 entry's description of the page is stale while its proposed fix stands. No new entry filed.

#### Escalation findings (final, in full)

````text
## structural edit: fix
I graded the page at the structural level against its plan, the task-guide anatomy, Red Hat's Structure Checklist, and Google's introduction and navigation items. The verdict is fix, for one blocking finding. Vale's error tier is clean (0 errors). The page follows the plan's nine-section order. The introduction meets the anatomy: a contract first sentence, when and why, who the page is for, the decision input, prior knowledge, the three wrong-place redirects, and the out-of-scope pages that match outOfScope. Both outline cross-links are present (security-model, and add-cairn-to-a-sveltekit-app#customize-the-sign-in-email). Every section heading is a bare infinitive except the template's own names. Each section opens with a lead-in and closes on a hand-off. The verification section names observable results. The failure path ends at debug-your-site, and See also does not repeat that link. The blocking finding is in Write the verifier: the paragraph at line 187 gathers three qualifications away from the requirement bullets they belong to. The plan places them inside those bullets, so the explanation sits apart from what it explains. Three advisories cover the orphaned owner-row sentence at line 74, the policy step losing its block-page consequence at line 114, and the post-sample sentence at line 267 dropping its reason. File: /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/replace-magic-links-with-cloudflare-access.md
- [BLOCKING] docs/extend/replace-magic-links-with-cloudflare-access.md:187: Fails Red Hat "Information is presented in the most logical order and location" and departs from the plan's section 5. The paragraph at lines 187-190 gathers three unrelated qualifications, each detached from the requirement bullet it qualifies. The stateless, no-revocation residual belongs to the signature bullet at 177-178, which the plan names as f:fe0dyh's primary home with "its qualification whole". The display-name rule belongs to the return bullet at 182-183. The misconfigured-gate reading of the four error-level reasons belongs to the refusal-reason bullet at 184-185. The paragraph has no subject of its own, so the reader has to map each sentence back to a bullet before reaching the steps, and the steps' lead-in ("To write the verifier") arrives after a stray explanation block.
  rewrite: Delete the paragraph and fold each sentence into its bullet. Signature bullet: "It checks the signature against the team's /cdn-cgi/access/certs keys and checks the iss and aud claims. The check is stateless and has no revocation step, so a logout or revoke takes effect only where Access sits in the request path." Return bullet: "...never a role, since the guard takes the role from the roster row and uses the display name only when the row's name is empty." Reason bullet: "...since the guard logs audience, issuer, keys, and error at error level, each marking a misconfigured gate that would refuse the whole roster, and other reasons at warn." The requirements list then leads straight into "To write the verifier, follow these steps:".
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:74: Advisory (logical location). "Identity mode can't create that row" sits after the precondition list, and its antecedent is the second of three bullets. The plan puts this reason inside the owner-row bullet, beside its producer links.
  rewrite: Move the sentence into the second bullet, for example: "The first owner's row in AUTH_DB. Identity mode can't create it, since bootstrapOwner runs only in the magic-link routes, so seed it with create-cairn-site or wrangler d1 execute if no magic-link sign-in has created it." Then the list stands alone before the hand-off at line 77.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:114: Advisory (Red Hat "error recognition steps are included where appropriate"; the plan's departure 10). The policy step's sub-paragraph drops the two consequences the plan assigns it. An editor the policy leaves out is stopped at Cloudflare's own page and never reaches the guard. A user the policy admits but the roster lacks is refused as unknown. The block-page consequence is the cue that failure-path step 2 (line 363) expects the reader to recognize, so the reader first meets it only during recovery.
  rewrite: "This policy is the application's admission list, so it must admit the same editors as the roster. An editor it leaves out stops at Cloudflare's own block page and never reaches the guard. A user it admits whom the roster lacks is refused by the guard as unknown."
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:267: Advisory (pace; plan section 5). The sentence after the sample restates what the code does but leaves out the reason the plan gives it: mapping jose's codes means a wrong AUD tag or team domain alerts as a misconfigured gate rather than as a wave of invalid tokens. Without that reason, the paragraph ties the sample back to the refusal-reason requirement only weakly.
  rewrite: "The helper maps jose's error codes to the reasons the guard logs at error, so a wrong AUD tag or team domain alerts as a misconfigured gate rather than as a wave of invalid tokens, and the resolver rethrows any failure the mapping doesn't name."

## register editor: fix
The rework is real: `git diff` shows the page restructured against the plan. The sections now follow the plan's order, with the new 'Before you begin', the policy step, 'Close the exposures outside the application', and the deploy step. The introduction carries the one-line contract, the decision inputs, the reader's prior knowledge, and the right-page redirects.

**Deterministic floor**
- Vale: 0 errors, 46 warnings, 15 suggestions.
  - The 'application' to 'app' and 'admin' to 'administrator' warnings are word-list noise against product terms.
  - The Headings warning on 'Create the Access application' is a false positive, since Access is a proper noun.
  - The OxfordComma warning on line 292 is also a false positive.
- tellgrader: 0 findings. It reported a measures object:

| Measure | Value |
|---|---|
| Sentences | 81 (prose selector) |
| `hinged_pair_share` | 0.457 |
| `short_sentence_share` | 0.049 |
| Average sentence length (my estimate) | about 20 words |
| Longest sentence | about 38 words, intro paragraph 2, sentence 2 ('Under `identity`, the guard mints no token...') |
| Prose paragraphs, step sub-paragraphs included (my count) | about 45 |
| Disproportionate paragraph | the step-2 sub-paragraph in 'Close the exposures' (lines 158-162), five sentences under one step |

The hinged share is high and consistent with the 'X, and Y' / 'X, so Y' pairs flagged below. It is reported only and gates nothing.

**Four blocking findings**
- **Two actions in one deploy step.** The step says 'build the site and deploy it' and names only `npx wrangler deploy`, though the plan has both commands.
- **Detached qualifications in 'Write the verifier'.** A three-sentence paragraph collects qualifications cut off from their requirements, which breaks the rule that a qualified claim stays whole.
- **Policy step restates itself.** The sub-paragraph under the policy step repeats the step and drops the plan's mismatch consequence.
- **False claim in the Access hand-off.** 'Deliver an admin response around it' is untrue for the cache rule, which bypasses the guard, not the application.

The advisory findings cover:
- a garden-path time clause in the roster section
- an overstated 'trusts whatever email'
- a balanced-halves sub-paragraph in step 2 and a two-beat closer in the wire section's intro
- a hand-off that describes the page's order ('so it comes first')
- 'yet' in Verify
- an apposition that reads as three items
- the location placed after the action in failure step 2
- repeated links
- an accDescr thinner than the plan specifies
- AUD unexpanded at first prose mention

**Verdict**
The page mostly reads as the register's plausible author: measured, precise, and with no marketing slop. Where it slips, it is because it is following its plan too mechanically, with one-line hand-offs, restatements, and qualifications pooled where the length limits pushed them. The change that would help most is to put each qualification back beside the claim it qualifies. That means folding the paragraph at lines 187-190 into its bullets and giving the policy step its consequence instead of a restatement. Then split the deploy step into build and deploy.
- [BLOCKING] docs/extend/replace-magic-links-with-cloudflare-access.md:292-293 (Wire the resolver and deploy the Worker, step 2): Base-guide finding, brief checklist item 'Each step holds one action'. The text is "In the project directory, build the site and deploy it with `npx wrangler deploy`, as in [Describe the Worker and deploy it](...)". That is two actions in one step, and it names only one of the two commands. A reader can take it to mean that `npx wrangler deploy` also builds the site. The plan names both commands (`npm run build` and `npx wrangler deploy`, the tutorial's same two). The Google.OxfordComma alert on this line is a false positive and needs no change.
  rewrite: 2. In the project directory, build the site with `npm run build`.
3. In the same directory, deploy the Worker with `npx wrangler deploy`, as in [Describe the Worker and deploy it](add-cairn-to-a-sveltekit-app.md#describe-the-worker-and-deploy-it).

   This deploy uploads the hooks option and the `workers_dev` and `preview_urls` settings ... (sub-paragraph unchanged)
- [BLOCKING] docs/extend/replace-magic-links-with-cloudflare-access.md:187-190 (Write the verifier, paragraph after the requirements list): Register voice rule 'Qualified claims stay whole', plus the 'list cadence in prose' tell. The text is "The signature check is stateless and has no revocation step, so a logout or revoke takes effect only where Access sits in the request path. The guard uses the resolver's display name only when the roster row's name is empty. The four reasons logged at error mark a misconfigured gate that would refuse the whole roster." These three sentences are unrelated qualifications, one each for bullets 2, 5, and 6. They have been cut off from the claims they qualify and stacked into one paragraph with no tie sentence, which is the failure shown in the brief's killed specimen. The plan puts each qualification inside its requirement.
  rewrite: Fold two of them back into their bullets, keeping each bullet under 26 words:
- It returns the email and, optionally, a display name that the guard uses only when the roster row's name is empty, never a role.
- It returns a refusal reason that names the failure, since the guard logs `audience`, `issuer`, `keys`, and `error` at error as a misconfigured gate.
Then keep only the stateless residual as the paragraph after the list, tied to its requirement: "Because the signature check is stateless and has no revocation step, a logout or revoke takes effect only where Access sits in the request path."
- [BLOCKING] docs/extend/replace-magic-links-with-cloudflare-access.md:114-115 (Create the Access application, step 3 sub-paragraph): 'No restatement or filler' tell, plus a departure from the plan. The text is "This policy is the application's admission list, so it must admit the same editors that the roster holds." It repeats the step it sits under ("add a policy that admits every editor in the roster") and adds nothing. The plan keeps this sub-paragraph as the page's one back-reference to the two-lists claim, and it carries the consequence of each mismatch, which failure-path step 2 depends on. The draft drops that consequence.
  rewrite: An editor this policy leaves out is stopped at Cloudflare's block page and never reaches the guard, and a user it admits whom the roster lacks is refused by the guard as unknown.
- [BLOCKING] docs/extend/replace-magic-links-with-cloudflare-access.md:141-142 (Create the Access application, closing hand-off): Truth-adjacent: the claim is false for one of its two cases (flagged for the claims checker). The text is "Two settings outside the application can still deliver an admin response around it." A cache rule doesn't route around the Access application, since Access runs before the cache. What a cache rule bypasses is the guard: it serves one editor's cached page to the next matching request, as line 146 says correctly. The plan's wording was "around the gate or the guard", and the draft narrowed it to the application alone.
  rewrite: Two settings outside the application can still deliver an admin response that the application or the guard never checked.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:82-84 (Prepare the roster, second sentence): Brief checklist item 'A sentence states its condition before its instruction', and a garden path. The text is "Each roster email must match the address the identity provider asserts before the deploy that switches the guard to identity." The time clause attaches to "asserts", so on first read the provider asserts something before the deploy.
  rewrite: Before the deploy that switches the guard to identity, each roster email must match the address the identity provider asserts.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:97-98 (Create the Access application, lead sentence): Overstated universal and an imprecise subject (flag for the claims checker). The text is "The guard trusts whatever email the application asserts". The guard admits an email only when it matches a roster row, which the page's own roster section says. The email is the identity provider's claim, which the application's token carries and the resolver returns. The application doesn't assert it.
  rewrite: The guard admits the email that the application's token carries once it matches a roster row, so the application must cover every admin path and take that email from your identity provider.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:107-108 (Create the Access application, step 2 sub-paragraph): Balanced-halves tell. The text is "The `/admin/__data.json` path is SvelteKit's data-only fetch, and `/preview/<token>` stays uncovered." It joins two unrelated claims with "and" for the rhythm. The second half is also an instruction rewritten as a declarative, so the reader never sees it as something to do.
  rewrite: The `/admin/__data.json` path is SvelteKit's data-only fetch. The `/preview/<token>` route stays outside the application, as [Share a draft preview](share-a-draft-preview.md) sets it up. Where application paths overlap, Access applies the most specific path first.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:77: Brief checklist item 'A reference names its target, never its position on the page', and the anatomy's rule against a page describing itself. The text is "The roster is the admission list that cairn holds, so it comes first." The hand-off justifies the page's own order instead of stating a fact about the task.
  rewrite: The roster is the admission list that cairn holds, and correcting it needs no Zero Trust change.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:273-275 (Wire the resolver and deploy the Worker, intro second sentence): Balanced-halves two-beat closer. The text is "The resolver goes in as one option, and a deploy puts it into effect." Both beats repeat the numbered steps that follow it, so the sentence is there for its symmetry and makes no claim.
  rewrite: Cut the sentence. The intro's first sentence and the two steps carry the same facts.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:267-268 (sentence after the sample): Restatement. The text is "The sample returns the reason its mapping gives and rethrows any other failure, which the guard logs at error." The code comment at line 259 already says this, and failure-path step 10 says it again. The plan wanted this sentence to give the reason for the mapping, which the draft dropped: a wrong AUD tag or team domain then alerts as a misconfigured gate instead of as a wave of invalid tokens.
  rewrite: The `reasonFor` helper maps `jose`'s error codes to the reasons the guard logs at error, so a wrong AUD tag or team domain alerts as a misconfigured gate instead of as a run of invalid tokens.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:146-147 (Close the exposures, intro): Vague closer. The text is "... and an ungated `workers.dev` hostname answers `/admin` too." "Too" leaves the reader to work out what the hostname bypasses. The plan names it: the hostname answers outside the application.
  rewrite: A cache rule that matches `/admin` can serve one editor's page to the next matching request, and an ungated `workers.dev` hostname answers `/admin` outside the application.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:318-319 (Verify the gate, intro): Promissory qualifier. The text is "No tool checks the login redirect or the `workers.dev` exposure yet". "Yet" implies a future tool that no fact states.
  rewrite: No tool checks the login redirect or the `workers.dev` exposure, so you check both by hand against the deployed site.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:134-137 (Create the Access application, step 7): Ambiguous apposition. The text is "note the team domain, `https://<your-team-name>.cloudflareaccess.com`, and the logout address". It reads as a list of three items rather than a domain and its form.
  rewrite: 7. In Zero Trust, note the team domain, which takes the form `https://<your-team-name>.cloudflareaccess.com`, and the logout address that Cloudflare's [session management page](...) gives.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:363-364 (Resolve a refused sign-in, step 2): Brief checklist item 'A step names where the action happens before it names the action'. The text is "... add the editor in the application's policies." The location comes after the action.
  rewrite: 2. If the editor saw Cloudflare's Access block page rather than one of the guard's refusal pages, open the application's policies and add the editor.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:24, 199; 31, 121, 398; 327, 370, 387; 32, 66; 71, 103: Overlinking (Wikipedia's first-occurrence rule). Five targets are linked more than once:
- `IdentityResolver`: twice.
- Identity mode's threat surface: three times.
- `log-events.md`: three times, in consecutive sections.
- Add cairn to a SvelteKit app: in intro paragraph 4 and again in the first bullet of 'Before you begin'.
- Cloudflare's self-hosted application guide: in the precondition bullet and again in step 1 of the Access section.
The precondition link also points at the app guide for the job of connecting an identity provider, which is a different page's subject.
  rewrite: Keep the first link to each target and leave the later mentions as plain text, except for See also. Cut intro paragraph 4's second sentence ("[Add cairn to a SvelteKit app] sets up magic-link sign-in itself."): the 'Before you begin' bullet already states that precondition with its link, and the sentence also reads as a link title made into a sentence subject.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:36-37 (figure accDescr): Visuals rule and a departure from the plan. The plan says the accDescr names every node and edge in order, ending with the two routes that reach the Worker without passing the application. The draft's accDescr covers only the /admin path. The accTitle is close to the 150-character limit (about 146).
  rewrite: accDescr: A browser's /admin request passes the Access application's policies and reaches the Worker's guard carrying Cf-Access-Jwt-Assertion, then the roster lookup and the admin shell; /preview/<token> and /healthz requests reach the Worker directly.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:129 (first prose mention of AUD): Vale Google.Acronyms suggestion (AUD). The first prose mention of the AUD tag doesn't expand it. The extend reader knows JWT and CORS, but not Cloudflare's AUD.
  rewrite: 6. In the application's **Additional settings**, copy the Application Audience (AUD) tag.

## fact read: accept
Verdict: accept. No blocking findings. 101 claims traced.

The diff is non-empty (+260/-164), so this was a full page-level rework. The read covered all 129 brief sentences:
- **Coverage:** every brief sentence appears verbatim on the page. 101 cite facts and 28 are tagged no-claim (transitions and links). All 30 outline ids are covered: 28 are cited, and f:mjedcx and f:pwmybh are subordinated in the brief's `cuts` with reasons that name a reference row. Both reference rows exist (log-events.md line 63, sveltekit.md line 2016). The two added carried facts, f:paotzb and f:9ug9mo, are cited where the plan places them. Every section the plan names is present.
- **Code-backed facts:** I retraced these against src/lib/sveltekit/guard.ts, auth-routes.ts and crypto.ts, and all match:
  - f:fu4uis and the error-level reason set at guard.ts:114.
  - The rethrow path: a thrown resolve becomes detail 'error' with an `error` field capped at 300 characters (guard.ts:307-310), as the log-events.md row states.
  - f:emrebl (trim plus lowercase), f:hilyos (display-name fallback, `auth.identity.unknown` with the normalized email) and f:jha9f7 (no hostname check).
  - f:ig5pn3 (logout posts to `/admin`), f:8xxe3b (identity skips the row delete and redirects to `logoutUrl`) and f:qhmydf (`bootstrapOwner` exists only in auth-routes).
  - f:2glcaf (SESSION_TTL_MS is 30 days), f:dwc4kp (returns `Handle`), f:lyaf6p (no jose in package.json) and f:paotzb (templates/waymark/src/routes/healthz).
  - `isPublicAdminPath`: `/admin/login` is public, so the verify step's redirect comes from Access, which is consistent with f:iaqcq6.
- **Links:** the anchors resolve (#createauthguard, #identityresolver, #resolveratelimit, #customize-the-sign-in-email, #describe-the-worker-and-deploy-it, #identity-modes-threat-surface). The jose error codes in the new sample are all real (checked against jose's errors.ts).
- **Option map:** no row reads "pending replace-magic-links-with-cloudflare-access" (pendingCount is 126). Nothing needed a [docs-drift] retag.

Non-blocking items:
- The figure's accDescr dropped the preview and health edges.
- The plan's code-vs-name comment and the jose errors link are missing from the sample.
- 'The verifier consumes…' should read 'resolver'.
- The 'from the moment you save it' timing has no fact behind it.

No new friction was filed. The one inconsistency I met, health.ts naming GET /admin/healthz while the template mounts /healthz, is already logged at docs-friction-log.md:205. The reference row for IdentityResolver (sveltekit.md:2016) still says `label` names 'the doctor probe', which f:iaqcq6 records as retired. That is drift on the reference page, not on this page.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:37 (mermaid accDescr): The plan places f:paotzb in 'The figure (accDescr and caption)'. The caption (line 57-59) carries it, but the rewritten accDescr describes only the /admin path and drops both the /preview and /healthz edges the diagram draws. The accTitle names them, so the fact is on the page. The text alternative is still incomplete for a screen-reader user.
  rewrite: accDescr: An /admin request passes the Access application's policies before it reaches the Worker, where the guard admits it only when the proven email holds a roster row. A /preview/<token> request and a /healthz request reach the Worker without passing the application.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:211-239 (reasonFor sample) and :267: This is a plan departure, not a fact defect. The plan (lines 548-556) asks for two things the page lacks: a code comment to branch on `code` and never on `name`, and a link to jose's errors module in the sentence after the block. I checked every jose code in the sample against panva/jose src/util/errors.ts on main: ERR_JWT_EXPIRED, ERR_JWT_CLAIM_VALIDATION_FAILED with its `claim` property, the three ERR_JWKS_* codes, ERR_JWS_SIGNATURE_VERIFICATION_FAILED, ERR_JWT_INVALID and ERR_JWS_INVALID. All of them are real. The rethrow-on-undefined matches guard.ts:307-310, where a throw becomes detail 'error' at error level.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:179-180 (section 'Close the exposures', closing sentence): 'The verifier consumes the team domain, the AUD tag, and the logout address' is tagged no-claim. The logout address is consumed by the resolver's `logoutUrl` field, not by the verification. The wording is loose but harmless.
  rewrite: The resolver consumes the team domain, the AUD tag, and the logout address that you noted while creating the application.
- [advisory] docs/extend/replace-magic-links-with-cloudflare-access.md:144-146 (Create the Access application, closing paragraph): The sentence 'From the moment you save it, the application challenges every request to `/admin` on the site's hostname, magic-link editors included' cites f:agif8l and f:vnm1p5. Those facts back the path coverage and the policy admission. Neither states the immediacy ('from the moment you save it'). This is a reasonable reading of Cloudflare's behavior, but no fact holds it.

## figure verifier: accept
The page has one figure, the mermaid request-flow diagram at line 34, and it earns its place (verdict: accept). It passes the remove-it test because only the diagram shows the path split: /admin goes through the Access application's policies, while /preview/<token> and /healthz reach the Worker without passing it. It also meets the routing, source, complexity, alt (143 characters, kind named first), and caption rules. One non-blocking nit: the caption's second sentence partly repeats the end of accTitle. No paragraph on the page needs a figure it doesn't have.
- [advisory] /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/replace-magic-links-with-cloudflare-access.md:34: EARNS ITS PLACE. Remove-it test: without the figure, the intro prose still says that the resolver turns the Access token into an email the roster checks. Nothing in the prose shows the path layout: /admin passes the application's policies, while /preview/<token> and /healthz reach the Worker without passing it. /healthz is not mentioned anywhere else on the page. Routing and source rules: it is inline mermaid committed with its prose, and it has 6 nodes, well under the ~15-node budget. Alt and caption rules: accTitle is 143 characters, which is within the 150 cap. It names the kind first ('Diagram of...') and says what the reader learns. accDescr carries the gist. The emphasis caption right after the fence is complete sentences with no spatial reference. The page's figure note asked for each element (browser, Access application with policies and AUD tag, guard calling identity.resolve, roster lookup by email, admin shell, preview and healthz outside), and all of them are drawn.
- [advisory] /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/replace-magic-links-with-cloudflare-access.md:57: Minor, not blocking. The caption's second sentence (preview and healthz reach the Worker without passing the application) repeats the end of accTitle ('with preview and health requests outside the application'). That edges toward the 'never redundant with the alt' rule. Fix it by trimming the clause from accTitle, which also leaves more room under the cap, or by giving the caption the reason the two routes stay uncovered (the token-holder preview and the health probe).
  rewrite: accTitle: Diagram of an admin request passing the Access application, the guard, and the roster before the admin shell opens
- [advisory] /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/replace-magic-links-with-cloudflare-access.md:350: Missing-figure test passed. The 'Resolve a refused sign-in' steps branch, but a numbered conditional procedure follows the register's task anatomy and is the right form. The 'Prepare the roster' paragraph about two admission lists (lines 81-85) is already covered by the diagram. No paragraph is a text stand-in for a diagram that was never drawn.
````

### security-model

Status: escalate (second fix verdict on the plan read). Page: `docs/extend/security-model.md`. Brief: `docs/internal/briefs/extend/security-model.json`. Plan: `docs/internal/briefs/extend/security-model.plan.md`.
Rework: True. Rounds drafted: 0. crossRegression: not reported (no drafting).

#### Plan step

Plan revised after the first read: True.

Plan read 1 (structural edit): verdict fix, blocking 1.

````text
Verdict: fix, with one blocking finding. The guard is used as a known term in introduction paragraph 3 (:182), section 3's Limits (:312), and section 4 (:322-333). Nothing says what it is until section 5 (:356), and the definition paragraph (:225-237) names `createAuthGuard` only as the place the identity option sits. That fails Block 1's 'most logical order' item and Google's 'introduces information when it's most relevant'. The fix is one sentence in paragraph 4 defining the guard (cite f:7qqhda, link The auth guard). The rest of the plan holds. Its departure from the outline's order (render safety and the GitHub App placed before the two seam sections, the logs claim folded into sign-in) is justified, and the introduction states it. The user goal is clear for both readers. All three of Google's introduction parts are present, and the doesn't-cover list now carries all six outline items. All four outline cross-links land, in hand-offs and in Related resources. The concept anatomy is met: introduction, definition, one subtopic per section, and a grouped related-resources ending. The troubleshooting item does not apply to a concept page. Four non-blocking findings: the 'described here' self-reference in the third doesn't-cover sentence (:209); a forward reference by section number in section 5's Limits (:371); identity-mode logout detail placed in section 3 (:306); and paragraph 3's density (:178). npm run check:vale: 0 errors.
````

Plan read 2 (structural edit): verdict fix, blocking 1.

````text
I graded the plan as a structural edit, before any prose exists, and the verdict is fix. There is one blocking finding and two advisories. `npm run check:vale` reports 0 errors.

**Blocking (plan line 262):** the plan says no section before section 11 depends on the auth channel, but section 6 does. It uses `createAuthChannel`, "dev transport", and the channel's `deliver`/`lookup` config, and nothing has explained them yet. The only earlier mention is the covers gloss in paragraph 3. This is the same introduced-before-defined defect the previous edit found for the guard. The suggested fix is one orienting clause in section 6, linked to The auth channel's threat surface.

**What passes:**
- **Order:** the outline's inventory order is changed to: taking the account, riding it, its reach, the replaced seams, then responsibilities. The plan justifies this, the introduction states the grouping, and the group turn at section 9 marks the move in the body.
- **Introduction:** it has Google's three parts (covers and prior knowledge in paragraph 3, doesn't-cover in paragraph 4, which names all six out-of-scope items), a definition (paragraph 5), and a related-resources ending.
- **Cross-links:** all four `crossLinks` entries from security-model appear as how-to guides.
- **Module types:** none are mixed. The allowlist subsection links out to Restrict admin access for the steps.

**Advisories:**
- Line 250: no planned sentence carries the outline's "floors, not ceilings".
- Line 244: paragraph 5 is dense.

The plan is at /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/internal/briefs/extend/security-model.plan.md.
````

Plan `couldNotDo`:

- (none)

Plan `frictionFiled`:

- Filed 2026-10-03 by the page plan of `docs/extend/security-model.md` (resolution revision): extender, f:r0cv6e, the outline's sixth out-of-scope item hands the sanitize floor's history to docs/extend/migration-notes.md, which holds no such record (oldest entry 0.86.0; CHANGELOG.md oldest 0.22.0; the floor shipped in v0.17.0), so the introduction can name no page for it

#### Escalation findings (final, in full)

````text
## structural edit: fix
I graded the plan as a structural edit, before any prose exists, and the verdict is fix. There is one blocking finding and two advisories. `npm run check:vale` reports 0 errors.

**Blocking (plan line 262):** the plan says no section before section 11 depends on the auth channel, but section 6 does. It uses `createAuthChannel`, "dev transport", and the channel's `deliver`/`lookup` config, and nothing has explained them yet. The only earlier mention is the covers gloss in paragraph 3. This is the same introduced-before-defined defect the previous edit found for the guard. The suggested fix is one orienting clause in section 6, linked to The auth channel's threat surface.

**What passes:**
- **Order:** the outline's inventory order is changed to: taking the account, riding it, its reach, the replaced seams, then responsibilities. The plan justifies this, the introduction states the grouping, and the group turn at section 9 marks the move in the body.
- **Introduction:** it has Google's three parts (covers and prior knowledge in paragraph 3, doesn't-cover in paragraph 4, which names all six out-of-scope items), a definition (paragraph 5), and a related-resources ending.
- **Cross-links:** all four `crossLinks` entries from security-model appear as how-to guides.
- **Module types:** none are mixed. The allowlist subsection links out to Restrict admin access for the steps.

**Advisories:**
- Line 250: no planned sentence carries the outline's "floors, not ceilings".
- Line 244: paragraph 5 is dense.

The plan is at /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/internal/briefs/extend/security-model.plan.md.
- [BLOCKING] docs/internal/briefs/extend/security-model.plan.md:262: Block 1, "Information is presented in the most logical order and location", and Google's "introduces information when it's most relevant". This is the same defect class as the guard finding the last edit blocked on. The plan says the auth channel needs no introduction before section 11 because "no earlier section depends on it". Section 6 does depend on it. Its Draws on (lines 424-426) has "every `createAuthChannel` action refuses with a 503" and calls the flag "a dev transport's enable contract". Its Limits (lines 431-433) talks about "a dev-shaped transport" and "`deliver`, `lookup`, and the rest of the channel's config". The only earlier mention is paragraph 3's covers gloss ("an auth channel that signs the site's own members in from an anonymous form"), which says nothing about transports or site-supplied functions. A reader therefore meets channel transports and `deliver`/`lookup` five sections before the channel's own section explains them. The evaluator, who reads end to end, gets an unexplained actor in the middle of the built-in group.
  rewrite: Remove the false claim at lines 262-264. Choose one fix and record it in the structural-edit dispositions table. (a) Recommended: give section 6's Draws on a single orienting clause where `createAuthChannel` first appears, such as "an auth channel, the seam a site adds to sign its own members in, delivers codes through transport functions the site supplies", linked to the heading The auth channel's threat surface. Then the refusal and the Limits sentence about `deliver` and `lookup` have a referent. Section 11's first sentence then restates nothing. (b) Alternatively, move the channel half of `f:tkpmxr` and the dev-transport half of `f:irs7fg` into section 11, cited a second time, and keep section 6 to the guard's refusal and the dev-branch bundle residual. Either way, section 6's Takes still says two refusals, so (a) fits the order better.
- [advisory] docs/internal/briefs/extend/security-model.plan.md:250: Advisory, Block 2 introduction against the outline's first covers item: "Scope and who the realistic attacker is; floors, not ceilings." The plan sets the citation rule for the phrase "floors, not ceilings", but no planned sentence uses the phrase or states the floor idea outright. The restored sentence in paragraph 5 says a developer can replace the defaults. That only implies the defaults are floors. The check that the introduction matches the outline's scope item depends on how the drafter reads it.
  rewrite: State in paragraph 5 whether the restored sentence alone delivers "floors, not ceilings" (and say so in the plan), or fix one short clause that carries it and cites `f:y3ljm0`.
- [advisory] docs/internal/briefs/extend/security-model.plan.md:244: Advisory, Block 1 "Information is provided at the right pace". Paragraph 5 now holds four things: the roster and store definition, the restored replace-the-defaults sentence, the guard definition with two links, and the `identity` hand-off. The previous edit raised the same density concern about paragraph 3. Paragraph 5 now packs as many duties into one paragraph.
  rewrite: Consider splitting paragraph 5. Put the store and the guard (what cairn is and where every admin request passes) in one paragraph. Put the replaceable defaults and the `identity` hand-off in the next.
````

### add-cairn-to-a-sveltekit-app

Status: escalate (second fix verdict or red gate). Page: `docs/extend/add-cairn-to-a-sveltekit-app.md`. Brief: `docs/internal/briefs/extend/add-cairn-to-a-sveltekit-app.json`. Plan: `docs/internal/briefs/extend/add-cairn-to-a-sveltekit-app.plan.md`.
Rework: True. Rounds drafted: 2. crossRegression: False.

#### Plan step

Plan revised after the first read: False.

Plan read 1 (structural edit): verdict accept, blocking 0.

````text
I read only the plan (936 lines), never the page, at the structural-edit level. I checked it against the outline entry, the extend.json crossLinks from add-cairn-to-a-sveltekit-app, and the tutorial and tutorial-milestone anatomies in docs-register.md. The verdict is accept: there are no blocking findings.

The plan passes the Block 1 and Block 2 items:
- **User goal and tasks:** the goal is clear, the job is restated, and the tasks serve it.
- **Order:** the departures from the outline's order are each justified by a dependency. The adapter must exist before the admin, the dev backend before the milestone 2 check, and the GitHub repository before the App.
- **Milestone shape:** each milestone has objectives, a start state, steps, a check, failure steps, a "Show me the steps" exercise and an "I can" checklist.
- **Introduction:** it has all three parts. Coverage is Geoff's two paragraphs plus the milestone path. Prior knowledge is one sentence. The does-not-cover list names an owning page for each item.
- **Cross-links:** all seven are placed.
- **Ending:** a summary in new words, then next steps.

There are six advisories, none blocking:
- **Milestone 3 order:** it puts a build step (the push) after its failure section, unlike milestone 4.
- **Introduction map:** the milestone 3 path item leaves out the push to GitHub.
- **Two out-of-scope items left out on purpose:** the retired doctor and the removed `/components` subpath. The plan records why.
- **Key rotation link:** rotate-the-github-app-key is linked only from the introduction, not from the key step.
- **Production check pace:** it is about fourteen steps; two lead-in lists would pace it better.
- **Closing how-to section:** the sign-in email section sits before the summary. The outline requires it there.

I ran `npm run check:vale` from the worktree: 0 errors in 1189 files. The plan is an internal doc, so Vale's error-tier rules don't reach it.
````

Plan `couldNotDo`:

- Subordinating f:gffvfd: docs/reference/auth-store.md does not state which migration files run a CREATE TABLE or which tables each creates (re-verified this run; its only 'migration' mention is a generic word in the lede). The fact stays subordinated, not kept on the page; the reference-arm gap is already filed in docs/internal/docs-friction-log.md (the add-cairn page plan's 2026-10-03 entry naming f:gffvfd, f:hft8s8, f:rn62i1, f:pkrwom), so no new entry.
- Did not retrace or retag f:vpieos in docs/internal/facts/extend.md. Its causal clause ('so a multi-line encoding will not parse') is contradicted by the rejection record f:w78j1b, and the register editor routed the conflict to the claims checker; the plan step filed it as friction and carries only the fact's one-line form. A fact edit is the fact read's or the claims checker's call.
- Did not take the round's advisories, per the ruling's scope (BLOCKING findings only). Two are worth the conductor's eye before the next draft: the structural edit and register editor both advised amending the plan's two heading lines ('Give the adapter the identity and the Worker the key', 'What you built') to the page's shorter headings ('Store the App's credentials', 'The finished site'), which the register editor judged the better register; the plan's headings stand, so the next drafter may repeat the mismatch or the balanced-halves heading. No inbound anchor targets either slug.

Plan `frictionFiled`:

- `extender`. Found by the add-cairn page plan's resolution revision on 2026-10-03 (`f:vpieos`, `f:w78j1b`): two facts give opposite reasons for the one-line form of GITHUB_APP_PRIVATE_KEY_B64; f:vpieos's 'a multi-line encoding will not parse' clause goes beyond its source (src/lib/env.ts:31 documents the form only), while the rejection record f:w78j1b's workerd run found atob() ignores whitespace and pemToPkcs8 strips it (src/lib/github/signing.ts:42-43); the tutorial states the documented form, keeps tr -d '\n', and gives no reason. Filed at docs/internal/docs-friction-log.md:559.

#### Rounds

Round 1: gate pass; index link: present docs/extend/README.md: ./add-cairn-to-a-sveltekit-app.md under "Start".
Reads: structural edit accept (blocking 0); register editor fix (blocking 4); fact read accept (blocking 0).

Round 1 drafter `couldNotDo`:

- Blocking finding at :792, 882, 887, 1055 (the name `field-notes` in code font): the plan says to put `field-notes` in code font at every prose mention, and I could not do that as written. check:provenance reads a code span holding one hyphenated identifier as a name fact. No fact bullet contains `field-notes`, so any prose sentence with `field-notes` in code font fails the gate, even a no-claim one. I met the finding another way. The name the reader types into GitHub's form now sits in a fenced `text` block under step 1 of "Push the site to GitHub". The other three mentions (the installable-by step, the installation-grant step, and the publish check) now say "the site's repository". No prose mention of `field-notes` is left in plain text, and the only ones remaining are in code blocks. The plan's drafting constraint and the gate disagree here, and I filed that in the friction log.
- Register-caution blocking finding (:890): the plan's wording ends "...write the site's code in `field-notes`". I could not use that form for the same gate reason. The page says "...so the App's token can also write the site's code in the repository this tutorial builds" (cited [f:gglwt4, f:l5gx1t]). That still describes the reader's own repository, not someone else's setup.
- f:gffvfd stays subordinated to docs/reference/auth-store.md, but that page does not yet state which migration creates which table, so the page has nowhere to link for it. The plan step's 2026-10-03 friction entry already records the gap, so I added nothing new. The cut's reason in the brief is verbatim.
- One non-blocking advisory deliberately not taken: the register editor proposed keeping the page's own headings "Store the App's credentials" and "The finished site" and updating the plan to match. The plan governs, so the page now uses its headings "Give the adapter the identity and the Worker the key" and "What you built". No inbound anchor targets either slug.
- Two depth advisories deliberately not taken: the `App.Platform` clause and the `CairnHead` clause. The plan keeps both, and the reviewer said to raise them with the plan step before cutting.

Round 1 drafter `frictionFiled`:

- contributor: check:provenance reads a code-font running-example name (`field-notes`) as an uncitable name fact, so the plan's code-font constraint and the gate conflict (found by the add-cairn resolution redraft, 2026-10-03)

Round 2: gate pass; index link: present docs/extend/README.md: ./add-cairn-to-a-sveltekit-app.md under "Start".
Reads: structural edit accept (blocking 0); register editor fix (blocking 1); fact read accept (blocking 0).

Round 2 redraft drafter `couldNotDo`:

- I fixed all four blocking findings from the register editor.
- (1) I shortened prerequisite items 4 and 7 to under 26 words each. The Paid-plan item now links Cloudflare's pricing page through its link text. The CLI item is two sentences that total 25 words.
- (2) The Workers Paid condition is now a sentence of its own, placed before the refusal procedure. Step 1 is now only the action.
- (3) I renamed the heading 'Give the adapter the identity and the Worker the key' to '### Store the App's credentials'. I made the same change in the plan: its Heading line and all six mentions.
- (4) I renamed '## What you built' to '## The finished site' in the page and in the plan's Ending Heading line. I chose this over '## Summary' because the plan records that tellgrader flags 'Summary'. The plan now has a short 'Resolution run 3 findings, disposed' section.
- I could not take the structural edit's `field-notes` advisory (page lines :891, :896, :899, :1064). check:provenance fails any cited sentence that contains `field-notes`, because no fact bullet holds that string. With the advisory applied, the gate failed four sentences, so I put back 'the site's repository'. The friction log already records this conflict (its code-font entry on the running example's repository name, near line 575), so I filed nothing new. I added the reason to the plan's run-3 section.
- I took these advisories: the out-of-scope lead-in ('The following pages cover what this tutorial leaves out:'); the intro's existing-app sentence, rewritten so it no longer understates which steps an existing app skips; the env-read sentence moved ahead of the refusal procedure, with the trailing paragraph and the 'That page shows' sentence removed; the restating `.pem` note deleted (step 2 still cites f:vpieos); the 'if' branch antecedent at :445; the scrub sentence, rewritten so it states that the scrub removes token values only; the milestone 4 map sentence now has the reader as its subject; the domain echo at :978; and the observability and prerender reasons moved into steps 3 and 5.
- I did not add a link for the release archive in the CLI prerequisite. Nothing has verified that the releases page URL exists.

Round 2 redraft drafter `frictionFiled`:

- (none)

#### Escalation findings (final, in full)

````text
## structural edit: accept
I graded docs/extend/add-cairn-to-a-sveltekit-app.md against its plan, the outline entry, the tutorial-milestone anatomy, Red Hat's Structure Checklist and Google's large-docs items. The verdict is accept: no blocking findings and four advisories.

Vale at error level reports 0 errors. `npx vale` failed because no npm package by that name exists, so I ran the installed `vale` binary directly. That is the same command `check:vale` runs, limited to this one page.

What I checked:
- **Introduction.** It covers all three of Google's parts:
  - Coverage: two paragraphs plus the four-milestone list, with the closing email section named.
  - Prior knowledge: line 7.
  - Doesn't cover: four bulleted pages, with the setup command and the scaffolded tree handled by sentence 3's link.
- **Out of scope.** The two outline items left off the intro (the retired doctor and the removed `/components` subpath) are left out on purpose; the plan records the reason.
- **Order.** The page follows the plan's order and all eight departures, including:
  - The adapter and site config in milestone 2.
  - The dev-backend section closing milestone 2 under the slug the outline asks for.
  - The branded-500 refusal opening milestone 4.
  - The "Push the site to GitHub" section closing milestone 3.
  - "Customize the sign-in email" as a closing H2 after the production checklist.
- **Anatomy.** Each milestone states its objectives and start state, its steps, a checklist, and an exercise under the fallback `#### Show me the steps` heading. The page ends with "The finished site", a summary worded differently from the overview, then Next steps.
- **Cross-links.** All seven entries in the outline's crossLinks for this page are linked where they are relevant. The failure checks in milestones 1 and 2 are present, and the "Resolve a content build failure" and "Resolve a production failure" sections are present.

The four advisories are all non-blocking:
- **Lines 865-867:** the refusal section's lead-in runs past the plan's two-sentence limit, because the Paid-plan sentence sits in its own paragraph.
- **Line 199:** one dense six-sentence paragraph before a three-step install procedure.
- **The four exercises:** nothing in their headings or lead sentences marks them as try-first exercises.
- **Rendered-entry check:** no failure check for a permalink that does not load.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:865-867: Advisory (drafting constraint, not a checklist item): the plan holds every milestone 4 section to a lead-in of one or two sentences. This section opens with two sentences, then adds a separate one-sentence paragraph on the Workers Paid plan. The plan does put the Paid-plan trigger here (departure 3), so the information is in the right place. Only the paragraph split goes beyond the plan.
  rewrite: Fold the Paid-plan sentence into the lead-in, or move it into step 1 as a condition-first clause ("Because this deploy is the first to carry the admin, it needs the Workers Paid plan."), so the lead-in stays at two sentences before the procedure.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:199: Advisory (Red Hat, information at the right pace): this is one six-sentence paragraph that carries three separate setups: the peer and its `.d.ts` reason, `noExternal` and the source-shipped `.svelte` files, and the ambient import plus the `App.Platform` note. It comes before a three-step procedure that already pairs one step with each setup. The order is correct, but the density is high for a tutorial.
  rewrite: Keep the first sentence as the lead-in and move each reason under the step it explains: the peer reason after step 1, the `noExternal` reason after step 2, and the `App.Locals` and `App.Platform` sentences after step 3.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:160-164, 556-560, 809-813, 1098-1102: Advisory (Google, headings that help users understand the subject): the four exercise headings (Deploy a change, Rename the site, Add a second post, Apply an opt-in migration locally) look like required procedure. The only sign that a section is a try-first exercise is the `#### Show me the steps` subheading below it. The plan removed the recycled "This exercise is optional" phrase, and nothing replaced it as a cue.
  rewrite: Put a short try-first cue in each exercise's lead sentence, such as "Try it yourself: change one line of the scaffold's home page...". Word each cue differently so no phrase repeats, as the plan requires.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:760-776: Advisory (Red Hat, troubleshooting and error recognition): the rendered-entry check has no failure path for a permalink that does not load on the dev server. The next section covers build failures only, and its third case (a concept left out of `content`) produces no error.
  rewrite: Add one ordered failure check after step 3, for example: the file sits under the concept's `dir`, and the content module's glob matches it. Use only facts the plan already carries (f:pdgkex, f:6ebew3).

## register editor: fix
I graded the rework's changed sentences in /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/add-cairn-to-a-sveltekit-app.md against the developer brief, which covers the tutorial and milestone anatomies, the Names table, and the deviation rows. The diff is non-empty: 58 lines added and 47 removed. All four round-2 blocking findings are resolved:
- **Before you begin** is now one lead-in and one list, the shape the plan prescribes.
- **The `atob()` sentence** is cut.
- **The repository-wide write sentence** (:899) now describes the reader's own repository.
- **The repository name** now sits in a `text` block, and later mentions say "the site's repository".

The fact-read citation fix sits in the brief JSON and is outside this read. Most round-2 advisories were also taken correctly: the location prefixes on steps, the Names fix at :442, the manifest path at :696, the Paid-plan line at :867, the failure-list lead-in, and the second-person summary. The plan's headings now match the page.

**Deterministic floor.**
- Vale: 0 errors. The warnings are the known false positives: "admin", the Cloudflare product name "Email Sending", contractions under the measured-tone deviation row, and "the package" used for tarball facts at :199 and :935.
- tellgrader: 0 findings.

**Measures** (docs-register profile):

| Measure | Value |
|---|---|
| sentences | 305 |
| hinged_pair_share | 0.531 |
| short_sentence_share | 0.193 |
| Average prose sentence length (my estimate) | about 20 words |
| Longest changed sentence | :865, about 38 words, explanatory |
| Prose paragraphs (approximate) | about 95 |
| Disproportionate paragraphs | None among the changed ones |

**Blocking finding.** One newly introduced falsity: the intro's "each step that creates the project or its repository says when your app skips it" (:7). Two of the four skip notes on the page sit in section prose rather than steps (:49 and :790), and the `sv create` step says nothing. The plan's prior-knowledge line also still prescribes the old sentence, so the page and the plan disagree.

**Advisories.** A triad at :855 that restates the list above it; an overstated "each section" at :861; a scrub rationale at :1164 that still needs the claims checker; a presupposed "onboarded domain" at :976; link text cut to "domain configuration" at :980; and small wording at :899 and :445.

**Verdict.** The page reads as a careful developer's tutorial in the register's voice, and I found no balanced-halves or marketing slips in the changed sentences. The change that would help most is rewriting :7 so the skip promise is literally true, then amending the plan's prior-knowledge line to match.
- [BLOCKING] docs/extend/add-cairn-to-a-sveltekit-app.md:7 (introduction, prior knowledge): The rework added a false universal: "each step that creates the project or its repository says when your app skips it." Two of the four skip notes on the page are not in steps. The project skip is in milestone 1's start-state paragraph (:49), and the GitHub push skip is in the lead-in to Push the site to GitHub (:790). Step 1 at :57, the `sv create` step, says nothing about an existing app. Only the git-init note at :72 is inside a step. This breaks the developer brief's tell 'Every factual claim is literally true', the Russell overstated-universal check. Separately, the plan's prior-knowledge line still prescribes the old sentence ('the tutorial serves a web developer who builds with SvelteKit and TypeScript...'), so the page and the plan now disagree. This sentence also runs 29 words with two 'and' hinges.
  rewrite: The tutorial assumes working knowledge of SvelteKit, TypeScript, and a terminal. An existing app works through the same milestones, and the page notes where it skips creating the project or its repository. (Amend the plan's 'What prior knowledge the reader has' line to match.)
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:855: Restatement and list cadence in prose. "You register the App, create the database, and set one Worker secret, and the site's files take three edits:" repeats in a reflexive triad the 'In this milestone, you do the following' list four lines above. The repeat is also incomplete, since it leaves out the domain onboarding that list names. The clause was added to fix the round-2 'three edits' map, but the secret was the only thing missing from that map, and this sentence re-inventories the whole milestone to add it.
  rewrite: Besides one Worker secret, the milestone edits three of the site's files:
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:861: Overstated universal. "Each section of this milestone makes its edit once the value it needs exists." Deploy the production build, Register the GitHub App, and Verify the production site make none of the three edits. The sentence also states the rule before the facts that explain it.
  rewrite: The App yields the App ID, the Installation ID, and the private key, and the database's create output carries the id the `AUTH_DB` entry needs, so each edit lands in the section where its value first exists.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:1164: The logic is still murky after the rewording, so this goes to the claims checker. "That scrub removes token values only, so a thrown message must never embed the message body or the sign-in link." The sign-in link carries the token, so a scrub of token values would already remove the link's secret part. The 'so' therefore gives no reason for banning the link, and the sentence does not say what danger is left over (the address in the body, or a link the scrub fails to match). The previous sentence's 'and truncates it, before logging it' also stacks three 'it's around a comma-fenced clause.
  rewrite: Before it logs the text of anything the sender throws, the engine scrubs token values from that text and truncates it. A thrown message still never embeds the message body or the sign-in link. (Restore a causal clause only if the claims checker names the residual risk from the fact.)
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:976: Presupposition in the reworded antecedent fix. "so the production site runs on the onboarded domain" calls the domain onboarded before step 1 at :980 onboards it. The round-2 rewrite, 'the domain you control', was accurate and reused the sentence's own earlier phrase.
  rewrite: A `workers.dev` subdomain has no zone to onboard for Email Sending, so the production site runs on the domain you control.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:980 (link text): This breaks the brief's checklist item 'Link text names its destination and makes sense read alone'. The rework cut the link text to "domain configuration", which does not name Cloudflare's product when read alone. It also hides, instead of resolving, the round-2 note that the page says 'Email Sending' but links an 'Email Service' page. Advisory, because the sentence does name Cloudflare.
  rewrite: In the project directory, onboard the domain for Email Sending, following Cloudflare's [Email Service domain configuration](https://developers.cloudflare.com/email-service/configuration/domains/) page:  (and file the Sending/Service product-name question for the claims checker)
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:899: The blocking finding is resolved: the sentence now tells the reader the truth about their own repository. Small register slip: in "the repository this tutorial builds", the page describes itself, and the reader, not the tutorial, builds the repository.
  rewrite: The **Contents** permission is repository-wide, and only engine code confines writes to the declared content directories, so the App's token can also write the site's code in your site's repository. The [security model](security-model.md) sets out the reasoning.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:445 (last sentence): The new sentence "The `if`'s other branch calls `createAuthGuard()` with no options, which the guard accepts." says the guard accepts the call, but the call is to the factory that builds the guard. The sentence carries little of the section's argument.
  rewrite: The `if`'s other branch calls `createAuthGuard()` with no options, which the factory accepts.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:35 (Before you begin, item 7): The blocking finding is resolved, and the section is now one lead-in and one list, the shape the plan prescribes. Residual link note carried from round 2: 'from a release archive' names a source with no link. Propose a URL only once the claims checker confirms the releases page exists.
  rewrite: The `cairn` CLI, which runs [`cairn doctor`](../reference/cli-cairn-doctor.md) in the production milestone. Install it once per machine with the following command or from a [release archive](<verified releases URL>):

## fact read: accept
I found no blocking findings in this scoped fact read of docs/extend/add-cairn-to-a-sveltekit-app.md in the draft-docs-2a worktree, so the verdict is accept. The page's git diff is not empty. It changed about 76 sentences, and I graded each against its brief entry. Of those, 57 cite facts (spanning 31 fact ids) and the rest are tagged no-claim. Every cited fact still matches the page and its source.

The less obvious claims I checked against source:
- **Default manifest path:** `cairn-manifest` writes to `src/content/.cairn/index.json` (src/lib/vite/internal.ts:48 and :232-235, behind f:vrue1g and f:fj28xs).
- **Bare guard call:** the page's hooks snippet at :526 calls `createAuthGuard()` with no options, which f:f21bcz says the guard accepts.
- **First Paid-plan deploy:** "This deploy is the first to carry the admin" holds. The only `wrangler deploy` steps before it are the two in the bare-site milestone, at :142 and :173.
- **Error scrub:** the "scrubs token values only, and truncates" sentence matches scrubSendError (src/lib/sveltekit/auth-routes.ts:150-154) and f:1b54g7.
- **Existing-app promise:** the introduction says each step that creates the project or repository tells an existing app when to skip it. The page keeps that promise at :49 and :790.
- **Removed `atob()` sentence:** this matches the plan, which keeps that clause off the page (the f:vpieos row; rejection record f:w78j1b).

Coverage and the option map:
- **Outline ids:** all 67 are either cited in the brief or listed as cut with a reason (f:gffvfd, f:pg2smj, f:xyizai, f:fekvhi, f:dzmj90, plus f:tkpmxr). No cut id is also cited.
- **Brief sentences:** all 357 appear on the page.
- **Introduction:** it matches the owner-written text in the job-read record. f:v85shm is not cited. It is the security-model threat-position fact, not one of this introduction's claims.
- **Retired page:** 43 facts sit under the build-a-site-by-hand.md heading. Only 7 are neither cited nor cut (f:a16ekj, f:ar5jp3, f:c4rgtj, f:c7nyan, f:cnnb5q, f:gs1wzb, f:ib9rp5), and all 7 are tagged [rejected] in the facts file, so leaving them off is correct.
- **Option map:** docs/internal/option-map.json has no row left at "pending add-cairn-to-a-sveltekit-app" (pendingCount is 126).

Nothing needed a [docs-drift] retag or a friction-log entry.
````

### theme-your-public-site

Status: escalate (second fix verdict or red gate). Page: `docs/extend/theme-your-public-site.md`. Brief: `docs/internal/briefs/extend/theme-your-public-site.json`. Plan: `docs/internal/briefs/extend/theme-your-public-site.plan.md`.
Rework: True. Rounds drafted: 2. crossRegression: False.

#### Plan step

Plan revised after the first read: True.

Plan read 1 (structural edit): verdict fix, blocking 1.

````text
The plan needs a fix: one blocking finding and two advisory ones. Most checks pass:
- The introduction opens with the contract and then has Google's three parts, naming all six out-of-scope pages.
- Before you begin routes both readers.
- The departures from the covers order are argued.
- Both outline cross-links (scaffolded-site-files and run-cairn-audit-on-your-site) are in See also.
- The verification is numbered checks with observable results.
- The failure path goes to debug-your-site.
- The module types are not mixed: the two exposition sections each open with a sentence tying them to the task.

Blocking: the re-skin recipe has no route into Rebrand the status colors. Step 6 and the hand-off from Style rendered markdown both send the reader to Verify, past the rebrand subsection. The subsection's own hand-off then sends a rebrand reader into the port instead of to Verify. This is the same dead-end route the previous read caught on port step 10.

Advisory:
- The introduction's in-order list leaves out the hand-built section and Resolve an audit finding.
- The flourish step makes a long round trip for a one-line edit.

I did not run Vale: no page prose exists yet, and the plan file is in an internal path that Vale excludes.
````

Plan read 2 (structural edit): verdict accept, blocking 0.

````text
I read the plan only, never the page, and graded it at the developmental level against Block 1 (Red Hat structure checklist) and Block 2 (Google's introduction and navigation items). I found no blocking finding, so the verdict is accept.

What passes:
- **Introduction:** it has the contract first sentence and Google's three parts. All six out-of-scope pages are named once, and both readers are routed through Before you begin.
- **Order:** it departs from the outline's covers order in argued, dependency-driven ways. The hand-built on-ramp comes early. Boundary and tiers come before the local loop, and the loop comes before any edit. The re-skin comes before the port.
- **Routing:** it closes without dead ends:
  - Re-skin: step 5 makes the flourish edit inline, step 6 is the only route into the status rebrand, and the rebrand hands back to step 7, Verify.
  - Port: step 10 goes through Style rendered markdown and Style the editor preview before Verify, so check 3 reads an updated preview config (`editor.preview`).
  - Hand-built: its hand-off list names each later section that applies to it.
- **Task-guide anatomy:** preconditions link what produces them, numbered steps name the location first, Verify has observable results, and the failure path goes to `docs/extend/debug-your-site.md`. See also is grouped and does not repeat the recovery link. The two exposition sections each open with a sentence tying them to the task.
- **Cross-links:** both outline cross-links (`scaffolded-site-files` and `run-cairn-audit-on-your-site`) appear in See also.
- **Vale:** `npm run check:vale` reports 0 errors across 1189 files.

Four advisory findings, none blocking:
1. Port step 10's Content carries the plan's own counterfactual defense, which a drafter could put on the page (:436-444).
2. The heading-keys paragraph serves only the port while sitting ahead of both recipes (:273-278).
3. :142 says See also repeats "four" adjacent-work pages, but :624-631 lists five, including a required cross-link.
4. The introduction is heavy and names its audience only by implication (:97-142).

Plan file: /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/internal/briefs/extend/theme-your-public-site.plan.md
````

Plan `couldNotDo`:

- f:4xptbu is subordinated to docs/reference/cli-cairn-media-seed.md, whose --from row and What it writes state the fixed <base-url>/media/<slug>.<hash>.<ext> download path but say nothing about the command never reading the adapter's assets.publicBase, so a site whose media route is mounted elsewhere cannot seed with it. Re-confirmed in this revision against the reference page (grep for publicBase finds nothing). The fact stays subordinated; the reference-arm friction entry was filed in this plan's first run (docs/internal/docs-friction-log.md, 'Filed 2026-10-03 by the page plan of docs/extend/theme-your-public-site.md', the f:4xptbu entry) and is not refiled.

Plan `frictionFiled`:

- (none new in resolution run 2; the three extender entries this plan filed on its first run, on f:4xptbu, on f:faofr4 with f:i9pgd2, and on f:lwrqfd, remain in docs/internal/docs-friction-log.md and are not refiled)

#### Rounds

Round 1: gate fail; index link: present docs/extend/README.md: ./theme-your-public-site.md under "Public site".
Reads: structural edit fix (blocking 1); register editor fix (blocking 9); fact read fix (blocking 5).

Gate failure lines (from the gate tail):

````text
check-symbols: 1 unresolved symbol(s)
  docs/extend/add-a-custom-admin-screen.md:26  [file-path]  migrations-app/0000_signups.sql
check:docs-gate: 1 check(s) failed: check:symbols
````

Drafter note on the red gate:

````text
This page has no failures of its own. The one red component is check:symbols, a whole-tree check that the --page and --brief scoping does not narrow. It names another in-flight page, docs/extend/add-a-custom-admin-screen.md:26 (the file path migrations-app/0000_signups.sql). That page was not edited. Every other component passed, including check:provenance (182 sentences: 146 cited, 36 no-claim, with the four cuts recorded), check:vale with no errors on this page, and check:docs. This page's own three check:symbols hits from the first run (src/theme/components/ArticleView.svelte, and editor.preview twice) were fixed by rewording the page, not by touching the allowlist.
````

Round 1 drafter `couldNotDo`:

- The plan's hand-built hand-off reason, that the hand-built tutorial's hooks read the same CAIRN_DEV_BACKEND variable, has no fact among the dispatched ids (f:7pv6se and f:j2qzct state only the scaffold's dev script). The bullet says the media seed and dev-server steps run the same way, but it does not draft the reason clause. A fact on the hand-built hooks reading CAIRN_DEV_BACKEND (docs/extend/add-cairn-to-a-sveltekit-app.md, Wire the dev backend) is needed for that clause.
- The plan names the `--cairn-code-*` roles in Style rendered markdown and in the hand-built hand-off, but no dispatched fact contains that family (it is in docs/internal/facts/reference.md around line 418, which is not in this page's ids). Both places say 'the engine's roles' instead, and the code span is not drafted.
- Per the plan, the hand-built adapter path `src/lib/cairn.config.ts` is not drafted: no dispatched fact carries it, so the page says 'the site's adapter file'.
- Carried forward from the plan, not refiled: f:4xptbu stays subordinated to docs/reference/cli-cairn-media-seed.md, whose --from row and What it writes state the fixed /media/ download path but not that the command ignores assets.publicBase (reference-arm friction already filed 2026-10-03).

Round 1 drafter `frictionFiled`:

- (none)

Round 1 fact read `frictionFiled`:

- Filed 2026-10-03 by the resolution-run fact read of docs/extend/theme-your-public-site.md: extender entry on f:hgal3e, f:s4prb0, f:kj37zz (the date format and locale, a presentation choice, are hard-coded in the chassis file date.ts, the third chassis edit a port may make against a boundary that says keep src/chassis/ whole)

Round 2: gate fail; index link: present docs/extend/README.md: ./theme-your-public-site.md under "Public site".
Reads: structural edit fix (blocking 3); register editor fix (blocking 3); fact read fix (blocking 1).

Gate failure lines (from the gate tail):

````text
check:docs-gate: 1 check(s) failed: check:symbols
The red component is check:symbols, a whole-tree check that --page and --brief do not narrow. It names another in-flight page: docs/extend/add-a-custom-admin-screen.md:27 [file-path] migrations-app/0000_signups.sql. I did not edit that page. An earlier run of the same gate in this task passed all 16 checks ("check:docs-gate: OK (16 check(s))"). The other page was being edited at the same time, so its symbol hit came and went between the two runs. This page's own checks are green. check:provenance passed: 183 sentences, 140 cited and 43 no-claim, with all four cuts recorded. Vale reports 0 errors, 0 warnings, and 0 suggestions on this page. tellgrader reports no findings.
````

Drafter note on the red gate:

````text
The red component is check:symbols, a whole-tree check that --page and --brief do not narrow. It names another in-flight page: docs/extend/add-a-custom-admin-screen.md:27 [file-path] migrations-app/0000_signups.sql. I did not edit that page. An earlier run of the same gate in this task passed all 16 checks ("check:docs-gate: OK (16 check(s))"). The other page was being edited at the same time, so its symbol hit came and went between the two runs. This page's own checks are green. check:provenance passed: 183 sentences, 140 cited and 43 no-claim, with all four cuts recorded. Vale reports 0 errors, 0 warnings, and 0 suggestions on this page. tellgrader reports no findings.
````

Round 2 redraft drafter `couldNotDo`:

- Advisory not taken (the register editor's note on the code-highlight roles at :355-358): the code-highlight sentence in Style rendered markdown still says 'the engine's roles' and does not name the `--cairn-code-*` roles. No fact among this page's ids names them. f:c4nnu9 lists the engine sheet's contents without the code-role names, and the names sit in f:lqtwdt (docs/internal/facts/reference.md:411-419), which this page was not handed. The conductor should re-run page inputs to add f:lqtwdt, or a fact that names the roles, if the page should name them.
- Advisory partly taken (the structural edit's note on the hand-built hand-off at :90-99): the reasons that bullets 2 and 5 dropped were not restored. Those are the hand-built tutorial's hooks reading `CAIRN_DEV_BACKEND`, and its adapter file at `src/lib/cairn.config.ts`. No handed fact id states either one, and the fact read flagged the matching 'runs the same way' claim as going beyond f:j2qzct. The bullet now scopes the Iterate locally steps to seeding media and starting the dev server with the dev backend off (f:7pv6se, f:j2qzct). It names 'the site's adapter file' without a path.
- Structural choice the conductor should know about: in See also, the four adjacent-work pages and Scaffolded site files are dropped, following the register editor's option against recycled descriptions. The introduction now names all six out-of-scope pages as a bulleted list. See also keeps the two reference pages (public-css.md and cairn-audit.md) and adds Add cairn to a SvelteKit app. The plan had See also repeat the four adjacent-work pages.
- Forward links to sibling pages that don't exist yet are unchanged: configure-rendering.md, build-the-public-routes.md, configure-media.md, run-cairn-audit-on-your-site.md, scaffolded-site-files.md, and debug-your-site.md. The page's own docs gate checks passed with them in place. The conductor should confirm those pages land in this stage before the page merges.

Round 2 redraft drafter `frictionFiled`:

- (none)

#### Escalation findings (final, in full)

````text
## structural edit: fix
I graded docs/extend/theme-your-public-site.md at the structural level against its plan, the outline entry, the task-guide anatomy, and the Red Hat and Google checklists. The verdict is fix, with three blocking findings.

**Blocking**
1. **See also (:469-478):** neither of the outline's two cross-links (scaffolded-site-files, run-cairn-audit-on-your-site) appears there. The plan's guide bullets are also missing, so the section gives no next-step link.
2. **Introduction overview (:17-19):** it leaves out Style rendered markdown, Style the editor preview, and Resolve an audit finding. It is also wrong for a port reader, whose step 11 goes through the two styling sections before Verify.
3. **Resolve check 2 (:459-460):** "that status ink" has no antecedent. The plan's Ink derivation fix is missing, so a hand-built reader, whose only theme-contrast case is a failing derived ink, gets no fix.

**Advisory**
- The port section opens with a separate one-step "check a deletion" procedure ahead of its main steps.
- The out-of-scope pages are framed as adjacent work rather than as what the page excludes.

**What passes**
- Module types are not mixed.
- The contract sentence, the prior-knowledge statement, and the routing of both readers through Before you begin.
- The re-skin's route into and out of the status rebrand, and the port's route through the two styling sections to Verify.
- The numbered checks with observable results, and the failure path to debug-your-site.

Vale's error tier is clean (0 errors).
- [BLOCKING] docs/extend/theme-your-public-site.md:469-478: Red Hat 'Cross-references are used appropriately' and Google 'links to what to learn next' both fail here, and the section departs from the plan's See also. The outline's two crossLinks from this page, scaffolded-site-files ('The file map behind the theme') and run-cairn-audit-on-your-site ('Running the public-scope rules as a gate'), are the page's see-also links, yet neither appears in See also. They are linked only in the introduction. The plan (plan.md:620-633) puts the four adjacent-work guides plus scaffolded-site-files and both references in See also, guides first. The page instead lists the hand-built tutorial and the two references. A reader who has just passed Verify gets no pointer to the natural next step, running the public rules as a site-wide gate.
  rewrite: Rebuild See also to the plan's shape. Put the guides first, each bullet a complete sentence: Configure rendering, Build the public routes, Configure media, Run cairn-audit on your site (it makes the three public rules a site-wide gate), and Scaffolded site files (it maps every file the setup command writes). The Add cairn to a SvelteKit app bullet may stay. Then list the two references. Change the lead-in sentence to match, for example: 'The following pages cover the work around a theme.'
- [BLOCKING] docs/extend/theme-your-public-site.md:17-19: Google's 'Does your introduction provide an accurate overview of the topics you cover?' fails here. The sentence says a scaffolded site 'works through the chassis boundary, the token tiers, the local loop, and one recipe, then verifies the theme'. That leaves out Style rendered markdown, Style the editor preview, and Resolve an audit finding. It is also wrong for a port reader, because port step 11 routes through the two styling sections before Verify. The plan (plan.md:111-120) requires an in-order list that predicts every body section, closing with the fix for each audit finding, and two earlier plan reads raised the same gap.
  rewrite: A scaffolded site skips that section and works through the chassis boundary, the token tiers, and the local loop, then one of the two recipes, the styling of rendered markdown and of the editor preview, the verification, and the fix for each finding the audit raises. (Split it into two sentences at the one-idea rule if needed.)
- [BLOCKING] docs/extend/theme-your-public-site.md:459-460: Red Hat 'Troubleshooting and error recognition steps are included where appropriate' fails here, and the step departs from the plan. Check 2 says 'retune that status ink', but 'that' has no antecedent in the check. The step also drops the plan's link to Ink derivation, the fix for a derived ink that fails on the theme's own fills (plan.md:610-613). The hand-built hand-off at :97 routes that reader to this section. The hand-built reader has no ink override, so their only theme-contrast case is a failing derived ink, and this check gives them no fix. Their only route is check 4's generic debug page.
  rewrite: 2. If `theme-contrast` flags directive text or code highlighting after a status fill change, retune the overridden status ink beside its fill, or delete the override so the derived ink follows. If a derived ink fails on the theme's own fills, apply the fix in [Ink derivation](../reference/public-css.md#ink-derivation).
- [advisory] docs/extend/theme-your-public-site.md:262-269: Red Hat 'Module types are used correctly' and 'Information is provided at the right pace' are borderline here. The port section opens with a one-step procedure ('To check a deletion, follow this step') ahead of its main eleven-step procedure. The reader meets two procedures in one section, and the first is a pre-deletion caution, not a port step. The plan (plan.md:394-399) keeps the dependents-table instruction as the closing clause of the dependents paragraph.
  rewrite: Fold the bullet into the paragraph: '...in the same change. Before you delete any chassis file, read its row in the dependents table in `src/chassis/README.md`.' Then drop the one-step procedure heading.
- [advisory] docs/extend/theme-your-public-site.md:24-33: This is a departure from the plan, and it is not blocking. The plan (plan.md:127-142) names the six out-of-scope pages in prose with no list cadence. The page uses a bulleted list framed as 'the work next to theming', which states adjacency more than exclusion. Google's 'what the document doesn't cover' is met only implicitly.
  rewrite: Frame the lead-in as exclusion, for example: 'Theming leaves the following work to other pages:'. Or render the six as the plan's two prose sentences.

## register editor: fix
The page needs fixes before it passes: 3 blocking findings and 10 non-blocking ones. Almost the whole page changed in this rework, so I graded it end to end.

Checks run:
- **Diff:** `git diff` shows changes in every section.
- **Vale:** 0 errors, 5 warnings, 7 suggestions. All are dispositioned in the findings; the 'admin' warnings are overruled by the extend track's vocabulary contract.
- **tellgrader:** no findings.

| Measure | Value |
|---|---|
| Sentences (scanner, prose only) | 122 |
| Hinged-pair share | 0.50 |
| Short-sentence share | 0.074 |
| Average sentence length (my count) | about 21 words |
| Longest sentence | 41 words, the Port lead at line 253 |
| Paragraphs (my count) | about 60 |
| Disproportionate paragraphs | the hand-built list of which sections apply (lines 84-101) and the closing frame-facts paragraph of Style the editor preview (lines 408-413) |

**What the rework fixed.** Both blocking findings from the plan reads are closed:
- Port step 11 now sends the reader through Style rendered markdown and Style the editor preview before Verify the theme.
- Style the editor preview now opens by saying who acts there: a re-skin does nothing, a port updates the setting, a hand-built site adds it.
- The qualified `theme-contrast` claim stays whole and keeps its link to "What theme-contrast doesn't cover".
- The `assets.publicBase` limit on `cairn-media-seed` stays left to the reference, as that run's record said it would (the reference gap is already filed).

**Blocking findings:**
1. **Long sentences in task sections.** Several were lengthened by joining two separate claims, at lines 160, 253, 308 (inside a step), 362, 368 and 420.
2. **See also departs from the page plan.** It drops the five how-to guides the plan places there, including `scaffolded-site-files` and `run-cairn-audit-on-your-site`, which both plan reads checked for.
3. **"Role" means two things.** Line 133 lists `--color-muted` and `--color-card-border` as roles. Hand-built step 2 and the public-css reference treat them as `@theme` colors that win by source order, which contradicts "a role resolves by layer". The claims checker should confirm this one.

**Non-blocking:** a balanced-halves pair followed by a restatement in Token tiers, a claim that every theme shares the daisyUI component set (which port step 4 contradicts), an introduction routing sentence that skips sections, a pivot in the introduction, and some reference-depth detail that could move to the reference pages.

**Verdict.** The page reads as the cairn docs voice's plausible author: measured, precise, no marketing, no figurative language. Its slips come from joining claims to satisfy routing findings, not from slop. The change that would help most is splitting the joined task-section sentences back into one claim each, especially the Port lead at line 253 and the Iterate locally lead at line 160, and restoring the plan's See also.
- [BLOCKING] docs/extend/theme-your-public-site.md:160-162, 253-256, 308-311, 362-364, 368-371, 417-422 (task-section sentences over 26 words): Guide finding (brief checklist: "A step, a list item, and each sentence in a task section stay under 26 words"; the Accessibility deviation row keeps task sections under 26). The rework lengthened several sentences in task sections by joining two separate claims with ", and" or a trailing participle. None of them is a single qualified claim, so the qualified-claims exception doesn't apply. Iterate locally:160 runs 39 words ('The local loop is the dev server with `/styleguide` open, which renders ... and Vite's hot module replacement shows each saved change there without a reload.'). Port:253 runs 41 words and ends on a participial tail ('..., and keeps `src/chassis/`, reaching it through its exported seams and editing or deleting a chassis file only where a step or a convention names the edit.'). Port step 9's note at :308 runs 39 words inside a step, which is blocking on its own. Editor preview:368 runs 33 words, Style rendered markdown:362 runs 31, and Verify:420 runs 38 ('The cairn repository gates its example site ... so a theme that clears the three rules meets the bar the example site meets.'). The step 2 note at :435 (36 words) is the qualified contrast claim the rework said to keep whole, so it is exempt.
  rewrite: :160 → "The local loop is the dev server with `/styleguide` open. That route renders every registered directive, the type scale, and the component recipes against the current `theme.css`, and Vite's hot module replacement shows each saved change without a reload." (Split again at ", and" if the second sentence still runs over 26 words.)
:253 → "A port replaces Waymark's style sheets, chrome components, and page compositions with the new theme's, and keeps `src/chassis/`. The port reaches the chassis through its exported seams, and it edits or deletes a chassis file only where a step or a convention names the edit."
:308 → "The toggle's `resolveTheme` returns the live `data-theme` when it names one of the two themes. Otherwise it reads the root's computed `color-scheme`, so a dark-first theme resolves dark on a light OS with no edit to the page shell."
:368 → "A port that adds or renames a compiled style sheet, or changes the classes that wrap an entry, updates the `preview` member of the adapter's `editor` group. A hand-built site adds the member."
:420 → "The cairn repository gates its example site on the same three rules as `check:public-tokens`, a script that a scaffolded `package.json` doesn't carry." (Cut the "meets the bar" clause as restatement.)
- [BLOCKING] docs/extend/theme-your-public-site.md:469-478 (See also): The page doesn't follow its plan here. Plan lines 142 and 620-631 list seven See also bullets: configure-rendering, build-the-public-routes, configure-media, run-cairn-audit-on-your-site, scaffolded-site-files, and the two reference pages. Both plan reads passed the page partly on 'Both outline cross-links (scaffolded-site-files and run-cairn-audit-on-your-site) are in See also.' The draft drops all five guides and adds the hand-built tutorial, which is already linked in Before you begin. The anatomy (task guide item 6) asks See also to link related how-to guides, and the section now holds none. The page plan governs placement, so this is blocking.
  rewrite: The following pages cover the work around a theme:

- [Configure rendering](configure-rendering.md) builds the components a theme styles.
- [Build the public routes](build-the-public-routes.md) wires the delivery routes the chassis feeds.
- [Configure media](configure-media.md) sets up the media storage that seeded images come from.
- [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) configures `cairn-audit` for the whole site.
- [Scaffolded site files](scaffolded-site-files.md) maps every file the setup command writes.
- [The public style sheet reference](../reference/public-css.md) lists every key the engine's sheet declares, with its default.
- [The `cairn-audit` reference](../reference/cairn-audit.md) documents the three public rules and the public scope.
- [BLOCKING] docs/extend/theme-your-public-site.md:133-134 vs 61-62 and 142-146: Cross-section contradiction and equivocation on "role". This is a changed sentence: the old text read 'such as `--color-muted`'. Line 133 now gives a closed list of roles that includes `--color-muted` and `--color-card-border`. Hand-built step 2 (:61-62) calls those same two keys 'the sheet's two `@theme` colors', which a later `@theme` declaration overrides by source order. Lines 142-146 say 'A role resolves by layer' and is declared in `@layer theme`. The public-css reference agrees with step 2: it lists those two keys under 'Theme colors', apart from '## Roles'. Its Roles section also includes `--flow-space` and the `--cairn-code-*` keys, so the closed list leaves real roles out. Flag this for the claims checker.
  rewrite: "The roles, such as the status inks, the shadow, and the focus ring, come from the engine's `cairn-public.css`, which `tokens.css` imports right after Tailwind, along with two `@theme` colors, `--color-muted` and `--color-card-border`."
- [advisory] docs/extend/theme-your-public-site.md:122-124 and 138-143: Balanced-halves tell ('for X, A; for Y, B'), followed by a restatement. 'two orders decide which declaration of a key wins, source order for a design-scale key and layer order for a role' sets up a symmetric pair. The bulleted list at :138-143 then restates both halves under 'The two orders work as follows:'. The opening sentence also packs two separate claims (the tiers and the orders) into 34 words.
  rewrite: :122 → "Waymark's `theme.css` names three token tiers by how far a re-skin reaches, as follows:" Then at :138 → "Two orders decide which declaration of a key wins:" Keep the two existing bullets.
- [advisory] docs/extend/theme-your-public-site.md:280-281 (port step 4 note): Logic. The note says the four components are 'a component set every theme on the chassis shares'. The step it explains tells a port to remove a component from the `exclude` list, which changes that set. The universal contradicts the step.
  rewrite: "The chassis's `tokens.css` activates the daisyUI plugin with only the button, badge, alert, and card."
- [advisory] docs/extend/theme-your-public-site.md:15-19: The introduction's routing sentence doesn't predict the page. It says a scaffolded site works 'through the chassis boundary, the token tiers, the local loop, and one recipe, then verifies the theme'. It leaves out Style rendered markdown and Style the editor preview, which port step 11 sends that reader through, and Resolve an audit finding. Plan line 113 asks for a sentence that predicts every body section in order.
  rewrite: "A scaffolded site skips that section and works through the chassis boundary, the token tiers, the local loop, one recipe, rendered markdown, and the editor preview, then verifies the theme and resolves any finding."
- [advisory] docs/extend/theme-your-public-site.md:9-10, 12-13: Crafted pivot, plus restatement of the contract. 'so owning the design is a matter of how far the theme reaches' is an aphoristic turn that tells the reader nothing the next two sentences don't already say. 'Both end at the same check, the three public-scope rules that `cairn-audit` ships.' is a two-beat closer that repeats the contract sentence. It also defines the endpoint more narrowly than Verify the theme does, since passing there also requires the preview check (:417-418). The phrase is in the plan, so I'm flagging it softly.
  rewrite: "The site's look is a set of token values that Waymark declares over roles the engine defaults." Then cut the 'Both end at the same check' sentence, because the contract and Verify the theme carry it.
- [advisory] docs/extend/theme-your-public-site.md:105-109 (The chassis boundary): Two problems in this section. First, 'since' implies a cause where there is none: working on the theme's side doesn't follow from the chassis holding shared modules. Second, the next sentence is a list in prose ('from content indexing in `content.ts` and dates in `date.ts` to the theme toggle in ..., the token system in ..., and the reading and composition CSS in ...'), the file inventory that plan read 1 said belongs in reference. Scaffolded site files already maps every file.
  rewrite: "A re-skin or a port works on the theme's side of a boundary the scaffold draws. `src/chassis/` holds the modules every scaffolded site shares regardless of design, one concern per file, and [Scaffolded site files](scaffolded-site-files.md) maps each one. Waymark's side holds the adapter config, the chrome components, the color and type values, and the page compositions."
- [advisory] docs/extend/theme-your-public-site.md:88-89: Fact-adjacent inaccuracy. The item says Iterate locally's first two steps 'seed media and start the dev server with the dev backend off'. Step 2 now branches: it runs `npm run dev`, which has the dev backend on, when no media was seeded.
  rewrite: "- [Iterate locally](#iterate-locally) applies in its first two steps, which seed media and start the dev server."
- [advisory] docs/extend/theme-your-public-site.md:357-360 vs 218-222: The same procedure appears twice. Style rendered markdown's one-step procedure (add `data-flourish` to `<article class="prose">` in `ArticleView.svelte`) repeats re-skin step 5 nearly word for word. The paragraph at :362-364 then sends the re-skin reader back. For a re-skin, step 5 already carries the action, so the section's step only needs to serve a port.
  rewrite: "To turn the three styles on, follow this step:

- On the theme's `.prose` root, add a `data-flourish` attribute."
- [advisory] docs/extend/theme-your-public-site.md:166, 175-176: Vale Google.Passive (suggestion) flags 'is deployed' at :166. Step 2 at :175-176 holds three sentences and two imperatives with a branch. That's one action (start the server) with a choice of command, so it can be a single sentence.
  rewrite: Step 1: "If you deployed the site with a media library, then in the site directory, seed Wrangler's local R2 state from that library with `cairn-media-seed`:" Step 2: "In the site directory, start the dev server with `npm run dev`, or, if you seeded media, with `wrangler dev` or `npx vite dev` without `CAIRN_DEV_BACKEND`."
- [advisory] docs/extend/theme-your-public-site.md:408-413: Depth. The closing paragraph of Style the editor preview lists frame facts that don't serve the task: the `data-cairn-preview` animation hook and 'Every link click in the frame is inert.' The page-plan diagnosis says to subordinate facts that don't carry the argument. Keep only what Verify check 4 reads: the `base-100` fallback and the missing `data-theme`.
  rewrite: "The last two checks in [Verify the theme](#verify-the-theme) read this frame. The frame paints its body with `var(--color-base-100,#fff)`, so its background follows the site's `base-100` once the style sheet loads, and its `<html>` carries no `data-theme`, so only the OS color scheme reaches it." The [`preview` entry](../reference/core.md#preview-adapter-editor-member) then carries the rest.
- [advisory] docs/extend/theme-your-public-site.md:32-33, 364, 368, 444 (Vale Google.WordListCase 'admin'), 128 (Google.Acronyms CTA), 355/421/438 (Google.Contractions): Vale alerts, read and dispositioned. The 'admin' warnings are overruled by the extend track's vocabulary contract ('an extend page says "admin" ... freely'). CTA is spelled out on the same line, so that alert is a false positive. The contractions are inconsistent: 'don't' at :179 but 'does not' at :421 and 'cannot' at :438. Pick one form.
  rewrite: :421 "doesn't carry"; :438 "can't place".

## fact read: fix
I graded the sentences changed in the rework (git diff -- docs/extend/theme-your-public-site.md shows 288 additions and 247 deletions). I traced 140 claim sentences in the brief against their facts in docs/internal/facts/extend.md and reference.md. I spot-checked sources: the readers of the CTA and caption-tracking keys in the Waymark styleguide and SiteHeader, the theme.css excerpt values, ArticleView.svelte:108, and the anchors in public-css.md, cairn-audit.md, cli-cairn-media-seed.md, and core.md. Every cited fact still matches its source, so no fact was retagged [docs-drift]. All 33 outline ids are disposed. 32 are cited on the page, and f:w6pqic is cut with a reason. The other inventory cuts are recorded in the brief's cuts list: f:4xptbu, f:blhd7f, and f:tbq6gh. Every carried claim appears in the section the plan assigns it. That includes f:ctognq, f:nz87b3, f:i9pgd2, and f:i3rn6f, which moved from the dissolved Page shell behavior section into the port steps. The theme-contrast qualification is whole, and the link to 'What theme-contrast doesn't cover' is kept. docs/internal/option-map.json has no row pending theme-your-public-site. One blocking finding: the new opener of Resolve an audit finding (line 450) is tagged no-claim but makes an uncited claim, and part of it is false, since a theme-conformance finding about a stale chassis copy is fixed in a chassis file, not the theme. The other findings are advisory: a loose summary of Iterate locally step 2 in the hand-built list, 'a port that keeps prose.css', two loose citation tags, and two plan-conformance points about the introduction. I filed no friction entry; the friction these sentences touch already has entries (f:18qj2u, f:kt0epf, and the vite dev item on ROADMAP).
- [BLOCKING] docs/extend/theme-your-public-site.md:450-451 (Resolve an audit finding, first sentence): This changed sentence makes a claim, but the brief tags it no-claim and cites no fact for it. The claim is also not true for every rule. theme-conformance raises a finding when a chassis file redeclares a default that cairn-public.css sets, and the fix for that finding edits a chassis file, not the theme (docs/reference/cairn-audit.md, theme-conformance row). It also raises a finding when the chain never imports cairn-public.css, and that fix adds an import. No fact backs the 'names its file or theme block' half for public-literals or theme-conformance either. The reference only says that a theme-contrast finding names the block.
  rewrite: Each check below names one public rule's finding and the edit that clears it. The three rules read the files that [The public scope](../reference/cairn-audit.md#the-public-scope) in the audit reference lists.
- [advisory] docs/extend/theme-your-public-site.md:88-89 (Theme a hand-built site, Iterate locally bullet): The bullet says the first two steps of Iterate locally 'start the dev server with the dev backend off'. Step 2 now branches: it says 'Otherwise, run npm run dev', and in the scaffold that command sets CAIRN_DEV_BACKEND=1, so the backend is on. The summary is accurate only when the reader seeded media.
  rewrite: [Iterate locally](#iterate-locally) applies in its first two steps, which seed media and start the dev server, with the dev backend off when media was seeded.
- [advisory] docs/extend/theme-your-public-site.md:342 (Style rendered markdown, first paragraph): 'A port that keeps prose.css' suggests that a port might drop prose.css. The chassis boundary section (line 114) says a port edits a chassis file only where a step or convention names the edit, and prose.css is a chassis file. No fact covers a port dropping it. The plan fixes this sentence's claim, so the finding is advisory.
- [advisory] docs/extend/theme-your-public-site.md:362-364 and the brief entry: The brief tags this hand-off sentence (the re-skin returns to its status-rebrand option, the port continues to Style the editor preview) as f:gnn3pv. Only its final clause relates to that fact. Most of the sentence is routing, so the tag is loose. It is not a wrong claim.
- [advisory] docs/extend/theme-your-public-site.md:290 (port step 6) and the brief entry: Step 6 sets --cairn-heading-case in the theme's unlayered :root rule and cites only f:p8hsnz. That fact says the key is a role in @layer theme but does not say where a theme sets it. The placement follows from f:hva8r5, which says an unlayered :root declaration overrides a role. Add f:hva8r5 to the step's citation.
- [advisory] docs/extend/theme-your-public-site.md:15-19 (Introduction, routing sentence): This is plan conformance, not a fact read. The plan's Introduction asks for a sentence that names every body section in order: rendered markdown, the editor preview, the verification, and the fixes for audit findings. The page names only the chassis boundary, the token tiers, the local loop, one recipe, and the verification. The plan also asks for the out-of-scope pages in prose with no list cadence, and the page puts them in a bulleted list. A structural review should rule on both.
````

### architecture

Status: escalate (second fix verdict or red gate). Page: `docs/extend/architecture.md`. Brief: `docs/internal/briefs/extend/architecture.json`. Plan: `docs/internal/briefs/extend/architecture.plan.md`.
Rework: True. Rounds drafted: 2. crossRegression: True.

#### Plan step

Plan revised after the first read: False.

Plan read 1 (structural edit): verdict accept, blocking 0.

````text
I graded the plan at the structural level and accept it. No blocking finding.

**Order:** The plan keeps the job's order (subpaths, seams, state, tiers) and sets the mechanics between seams and state. It gives reasons for its three departures from the outline's cover order:
- Commit concurrency sits inside the write path, between the publish commit and the build.
- The edit record folds into Data tiers.
- The Backend contract follows Hard dependencies.

**Pace:** The hand-offs are turns in the subject, never positional references. The body closes on a synthesis sentence before Related resources.

**User goal:** It is clear. The plan names one reader in two situations, an evaluator and a developer taking over a scaffolded site.

**Introduction:** It meets the anatomy. It has the one-line contract, a six-item covers list in body order that maps onto the sections, a prior-knowledge sentence, a five-item out-of-scope list, and then the definition. The outline's other out-of-scope items (media settings, the role CHECK constraint) are either linked from the body or disposed in the dispositions table.

**Module type:** The page stays a concept page. Troubleshooting does not apply.

**Related resources:** The groups follow the register's 3-to-5 rule. Of the seven outline crossLinks, five are in Related resources. The other two, the reference index and configure-media, are linked from the body.

**Three advisories, none blocking:**
- The covers lead-in, 'The architecture has the following subjects', edges toward the page describing itself.
- The ruling at :228-234 claims the duplication between the intro pointers and Related resources is answered, but it remains.
- The prior-knowledge sentence leaves out the git and GitHub App vocabulary the write path assumes, and it doesn't cover the fifth external link.

I did not run `npm run check:vale`. This seat never edits, and the plan is an internal brief rather than a published page.
````

Plan `couldNotDo`:

- The register editor's blocking finding at docs/extend/architecture.md:14 asked the conductor to rule on the plan conflict (prose versus list for the out-of-scope pointers). The dispatch delegated each blocking finding to this plan, so the plan rules: a bulleted list of five items under a complete lead-in. If the conductor prefers the register editor's three-sentence prose alternative instead, the Introduction section's 'Doesn't cover' bullet is the one place to change.
- Left untouched, per the ruling not to widen: the register editor's and fact read's non-blocking page-level advisories (the identity row's relative clause, the seams table cell lengths, the dangling 'since' in the R2 sentence, the missing 0.94.0 migration-notes link, the two universals flagged for the claims checker, the figure's added publish-copy edge). The plan's new table names them as the drafter's and the line-edit read's to take on the page; none changes a section, claim, or placement.

Plan `frictionFiled`:

- (none)

#### Rounds

Round 1: gate pass; index link: present docs/extend/README.md: ./architecture.md under "Start".
Reads: structural edit accept (blocking 0); register editor fix (blocking 1); fact read accept (blocking 0); figure verifier accept (blocking 0).

Round 1 drafter `couldNotDo`:

- I fixed both blocking findings from the round-2 register read in the introduction, following the revised plan. (1) The covers lead-in is now 'The architecture has the following subjects:'. It drops the 'parts of the boundary' frame and keeps the six-item list. (2) The 70-word out-of-scope sentence is now a lead-in, 'Separate pages cover the following related subjects:', and a five-item bulleted list, each item giving the subject first and its page last. The contract paragraph is now three sentences, as the plan specifies.
- I left out three hand-offs the plan asks for. Each would have had to stand alone as a one-sentence paragraph after a table, a figure caption, or a list, which the plan's Sections preamble forbids. They are Seams (the section ends on its table), the Write path lead-in (it ends on the figure caption before the first H3), and Concurrent writes (it ends on its list). I added hand-offs as closing sentences everywhere else, including the four sections the structural edit flagged: Build verification, Read path, Data tiers, and Backend contract.
- I reworded some plan sentences to keep claims accurate. Seams hand-off: rewritten so it no longer says every seam feeds the edit path. Data tiers hand-off: I did not use the plan's 'each tier is a service the engine depends on outright', because it contradicts the swappable content store. Backend contract hand-off: it no longer claims the Backend's tier, because no fact in my list states it. I also left out the plan's 'which is why it sits in git' clause about the media manifest, because f:4t707i does not state that reason. The git paragraph instead names what reads each manifest: the corpus reads and the build read the content manifest, and an upload reads the media manifest.
- Non-blocking advisories I took: the opening sentences of Entry points and Export map now say exactly what the facts support. The identity row's relative clause is reordered. The roles, custom-routes, and BackendProvider table cells are shorter. 'No committer' moved into the holding branch's opening sentence. The caption no longer repeats 'a save commits no manifest change'. Concurrent writes now opens without restating the publish section and without the balanced-halves shape. 'Target discipline' is replaced by its concrete meaning. The 0.94.0 claim now links migration-notes.md#0940. The closing sentence is no longer an overstated universal and no longer makes the page the actor. The R2 sentence no longer has a dangling 'since'. The Related resources lead-in is reworded. Migration notes is back in the concepts group, as the plan lists it. The mermaid diagram, accTitle, and accDescr are unchanged; only the caption text changed, so the figure verifier may want to re-read it.
- I kept the round-2 form of Related resources: three group lead-ins, with no general lead-in before them. Two reads had flagged that general sentence as a doubled lead-in.
- Checks: Vale reports 0 errors and 0 warnings at error level. tellgrader found 0 findings. check-provenance passes for the brief: 181 sentences, 124 cited and 57 no-claim. I set the f:4b3rhm cut reason to the inventory's reason verbatim. Nothing was committed.

Round 1 drafter `frictionFiled`:

- (none)

Round 1 fact read `frictionFiled`:

- extender: the personal-dictionary add commit layers a caller retry on the head-merge retry and is missing from f:0gihxq's commit lists (architecture fact read, 2026-10-03)

Round 2: gate pass; index link: present docs/extend/README.md: ./architecture.md under "Start".
Reads: structural edit accept (blocking 0); register editor fix (blocking 2); fact read fix (blocking 3); figure verifier accept (blocking 0).

Round 2 redraft drafter `couldNotDo`:

- Did not add the Seams hand-off the structural read raised as advisory (the plan's 'Every seam feeds the one path an edit takes from a save to the live site'). Seams ends on its table, and the plan's Sections preamble forbids a hand-off as a paragraph of its own. The sentence is also not literally true for every seam (navLayout and the identity option do not feed the write path), so adding it would trade an advisory for a literal-truth finding.
- Did not add the Write path hand-off the structural read raised as advisory ('The path starts where an editor saves'). The section's lead-in ends on the figure caption, so the sentence would have to be a one-sentence paragraph, which the plan rules out. The structural read itself rated this optional.
- Left Vale's Google.OxfordComma warning at docs/extend/architecture.md:17 in place. I rewrote the item to 'Each adapter field, in [Define an adapter and schema]' as the register editor suggested, but the warning still fires on the 'and' inside the linked page title. It is a false positive at warning tier, and Vale shows 0 errors.

Round 2 redraft drafter `frictionFiled`:

- (none)

#### Escalation findings (final, in full)

````text
## structural edit: accept
I graded docs/extend/architecture.md against its plan, the concept-page anatomy, and both checklists, and the verdict is accept. npm run check:vale reports 0 errors.

**Introduction**
- It opens with the plan's three-sentence contract.
- The covers list has six subjects that match the body's subjects and order.
- The prior-knowledge sentence is there, followed by a five-item out-of-scope list under a lead-in that never names the page.
- The definition paragraph comes after the summary, as the anatomy requires.
- Media settings and the migration record are linked from the body sections that use them (Data tiers and Stability tiers).

**Body order** follows the plan: Entry points, Export map, Seams, Write path (holding branch, publish commit, Concurrent writes, Build verification), Read path, Data tiers, Hard dependencies, Backend contract, Stability tiers. Each section has a short lead-in under its heading. Most sections close on the plan's hand-off sentence. Stability tiers ends on the closing summary sentence the plan asked for.

**Related resources** has three groups: five how-to guides, four concepts, and five external resources. All seven crossLinks from architecture in docs/internal/outlines/extend.json are linked: add-cairn-to-a-sveltekit-app, scaffolded-site-files, security-model, content-model, upgrade-cairn, the reference index, and configure-media.

**Red Hat and Google items**
- No module types are mixed.
- The reader's goal of mapping the engine's boundary is clear.
- Pacing and order hold.
- Troubleshooting steps are not expected on a concept page.

**Advisory findings (none blocking)**
- Two plan hand-offs are missing: the one after the Seams table and the one closing the Write path lead-in. The following heading carries the turn in both places.
- The Seams table's third column is headed "Documented in" rather than the plan's wording.
- The expectedHead-to-head-guard tie sits in the paragraph after the Backend contract list instead of inside the commit bullet.
- [advisory] docs/extend/architecture.md:72: Advisory, not a failed checklist item. The plan's Seams hand-off is missing: "Every seam feeds the one path an edit takes from a save to the live site." The section ends on its table and Write path opens cold. Write path's first sentence orients the reader on its own, so the Google 'clear, logical development' item still passes.
  rewrite: After the table, add one closing sentence in its own short paragraph or as a table-follow sentence, per the plan's hand-off: "Every seam feeds the one path an edit takes from a save to the live site."
- [advisory] docs/extend/architecture.md:105: Advisory. The plan's Write path hand-off is missing: "The path starts where an editor saves." The section's lead-in ends on the figure caption, and the H3 follows. The order is still logical, because the H3 heading carries the turn.
  rewrite: Optionally close the lead-in after the caption with the plan's hand-off sentence, or leave it, since the H3 does the navigation.
- [advisory] docs/extend/architecture.md:63: Advisory. The plan asked for the third column to name 'the guide that configures it'. The page uses "Documented in", and the BackendProvider row points at a reference entry rather than a guide, so the column is precise enough as written. The plan's BackendProvider cell also named createGithubApp as the one shipped provider. The page states that fact in Hard dependencies (:154) instead, which is an acceptable placement.
- [advisory] docs/extend/architecture.md:167: Advisory. The plan put the expectedHead-to-head-guard tie inside the commit bullet. The page states it in the paragraph after the list. The tie the earlier structural edit asked for is present, so this is a placement variance only.

## register editor: fix
Scoped register edit of the changed sentences in /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/architecture.md. The diff is not empty: 39 lines added and 28 removed.

**Gates**
- Plain Vale: 0 errors, 23 warnings, 3 suggestions. All 21 `admin`→`administrator` warnings fall under the register's extend vocabulary, which leaves "admin" free. "Email Sending" is a product name. The Oxford-comma warning at :17 is a false positive on a link title. The 3 suggestions are SHA acronyms.
- tellgrader: 0 findings.

**Measures**

| Measure | Value | Source |
|---|---|---|
| Sentences | 99 | tellgrader (prose selector) |
| `hinged_pair_share` | 0.29 | tellgrader (no band) |
| `short_sentence_share` | 0.09 | tellgrader (no band) |
| Average sentence length | about 23 words | my count |
| Longest sentence | about 44 words (:57, the root barrel and `cairnManifest` sentence) | my count |
| Paragraphs | about 31 | my count |

The introduction is now four blocks with two back-to-back lists, and it is the heaviest unit. The :144 manifest paragraph, at about 110 words over five sentences, is the other disproportionate block.

**Resolved from round 2**
- Both blocking findings: the "parts of the boundary" lead-in is replaced, and the 70-word out-of-scope inventory is now a list.
- These advisories: the 50-word contract, the identity-row referent, the cell lengths, "target discipline", the 0.94.0 link (`#0940` resolves at migration-notes.md:623), the R2 reason clause, the duplicate caption, "each place reaches a different subpath", and "build a site".

**Blocking findings**
1. :109 now says a save has "no committer". The code leaves the committer to the App, and the rework dropped the "for a save and a publish alike" consequence, so the claim is false.
2. The new Entry points hand-off at :34 says "these four" right after a list of three subpaths. It also claims placement rules "fix what each one may contain", but the three rules cover only four subpaths.

**Restored hand-offs**
The rework restored the plan's hand-offs as section-closing sentences. That form follows the plan and I don't grade it as a tell. Several of them restate the next section's opening sentence, at :132, :154, and :150, which is the restatement tell, so I've listed them as advisories.

**Verdict**
The page reads as a plausible measured systems-paper author: plain lead-ins, qualified claims kept whole, and no marketing or virtue language. The single change that would help most is to restore the committer consequence where the save is introduced and fix the :34 hand-off's referent and universal. After that, trimming the three hand-offs that repeat their next section's opener would remove the last register residue.
- [BLOCKING] docs/extend/architecture.md:109, first sentence (The holding branch): Changed sentence: "...with the signed-in editor as author and no committer." The register's first tell says every factual claim is literally true, and this one isn't. The engine sets no committer, but the commit still has one: `src/lib/github/types.ts:20` says "The committer is left to the App", and :113 says GitHub attributes the commit to the App. The rework also cut the publish section's "For a save and a publish alike", so the page no longer says the App is the committer on a save. The structural advisory asked for the move, but its own wording was "with no committer, so GitHub attributes the commit to the App", and the consequence clause was dropped when the sentence moved.
  rewrite: A save commits the edit to a per-entry branch named `cairn/<concept>/<id>` through the site's GitHub App installation token, with the signed-in editor as author. The engine sets no committer, so GitHub attributes the commit to the App. (At :113, keep "As on a save, the engine sets no committer, so GitHub attributes the publish commit to the App.", or cut :113's sentence and let the save sentence cover both.)
- [BLOCKING] docs/extend/architecture.md:34, last sentence (Entry points hand-off): Added sentence: "The export map holds more subpaths than these four, and placement rules fix what each one may contain." This is a logic finding with two defects. (1) Ambiguous referent: the sentence just before names three subpaths (`/render`, `/sveltekit`, `/auth-crypto`), so "these four" points at nothing in its own paragraph. The reader has to reach back to :26. (2) Overstated universal: the three placement rules at :53-55 govern only the root barrel, `/sveltekit`, `/admin`, and `/public`. They fix nothing about `/render`, `/log`, `/media`, or the other subpaths, so "each one" is false. The plan's hand-off wording carries the same overclaim, but the brief's literal-truth rule outranks the plan's phrasing.
  rewrite: The full export map holds more subpaths than the four a site imports, and three placement rules decide which kind of module may sit on the root barrel, `/sveltekit`, `/admin`, and `/public`.
- [advisory] docs/extend/architecture.md:132, last sentence (Read path hand-off): Added sentence: "That manifest is one kind of state the engine keeps in git, and git is one of three stores the engine chooses by what reads the state." It trips the restatement tell, because the next section's first sentence (:136) says the same thing: "The engine keeps state in three tiers, git, D1, and R2, and places each kind of state by what reads it." "Chooses by what reads the state" also garbles the claim. The engine doesn't choose a store for state; it places state in a store. The sentence also switches between "stores" and "tiers" one line before the section that names them tiers, which is minor equivocation.
  rewrite: That manifest is one of the kinds of state the engine keeps in git.
- [advisory] docs/extend/architecture.md:154, last sentence, and :150, last sentence (hand-offs): Two added hand-offs restate what a neighbouring sentence already says (restatement tell). At :154, "A replacement content store keeps the contract the `Backend` interface fixes." is repeated by :158's opener, "the `Backend` interface fixes the semantics any provider keeps." At :150, "...the content store in git is the only tier a site can replace" repeats :154's "the one swappable dependency is the content store". It also sits at the end of a paragraph about where extension data goes, which is a different subject. The round-2 drafter cut the "only tier a site can replace" universal on advisory, and this rework brings it back. Flag it for the claims checker: the `media` seam configures the media store, so check that "only" holds for R2.
  rewrite: :150 - "D1 and R2 are Cloudflare services, which Hard dependencies covers with the host." Or cut the sentence and let :154 carry the swappable-store claim. :154 - cut, since :158 opens on the same contract.
- [advisory] docs/extend/architecture.md:57, last sentence (Export map hand-off): Added sentence: "Beside the map's placement rules, a short list of seams fixes where a site hands the engine code or data." It has three problems. "Beside" is a spatial connector opener with no spatial referent, so it borders on the figurative-language tell. "A short list of seams" recycles the introduction's phrase (:3). And "fixes where" misstates the relation, because a seam is the point of hand-off; it doesn't fix one. The plan's own wording is plainer.
  rewrite: The map says where each export lives, and the seams say which of them a site hands its own code or data to.
- [advisory] docs/extend/architecture.md:124, second sentence, and :175 (closing synthesis): These are flagged for the claims checker. At :124, "The publish commit that lands under the retry is the one the deploy builds." The deploy builds the default branch's head. If a later commit lands, the deploy builds that one, so "the one" may overclaim. At :175, "Code a site writes against the Extension tier therefore meets each break as a named change" depends on `check:surface` catching every break. A snapshot gate catches changes to the type surface, not changes in behavior, so "each break" may overclaim. "Meets" is also mildly figurative.
  rewrite: :175 - "Because `check:surface` discloses each Extension-tier change to the export surface, code a site writes against that tier needs an edit only where a release names one, and [Upgrade cairn](upgrade-cairn.md) describes how a site applies each crossed release's named changes in order."
- [advisory] docs/extend/architecture.md:5-12 (covers lead-in and list): The lead-in "The engine's architecture includes the following:" removes the blocked "parts of the boundary" frame. This finding is resolved. Two smaller points: (a) "includes" reads as partial, while the list is the page's whole coverage, and the plan's model lead-in was "The architecture has the following subjects." (b) Items 3 and 5 are compound items joined by "and" ("...to the deploy, and how the admin reads content back"). Item 3 joins a noun phrase to a clause, which strains the guide's rule that every list item shares one form.
  rewrite: The architecture has the following subjects. Item 3: "The path an edit takes from a save to the deploy, and the path the admin reads content back by" (or split it into two items).
- [advisory] docs/extend/architecture.md:14-20 (out-of-scope list): Resolved. The 70-word chained inventory is now a bulleted list under a complete lead-in, and every item has the same form. Vale's Google.OxfordComma warning at :17 is a false positive, because it reads the link title "Define an adapter and schema" as a series, so no change is needed. One overlinking advisory carries forward: Security model, Content model, and Upgrade cairn are each linked here, again in the body (:146, :65, :175), and again in Related resources.
  rewrite: No rewrite. Optionally drop the body re-links where the introduction already gives the page (Wikipedia's guidance is to link at first occurrence).
- [advisory] docs/extend/architecture.md:187-192 (Related resources, second group): Added item: [Migration notes](migration-notes.md) under the lead-in "The following pages take one part of the architecture in more depth." Migration notes is a per-version change record, not a concept page, so the lead-in's claim is false for this item. The anatomy groups this section as how-to guides, linked concepts, and external resources. The page also links two migration-notes sections inline at :173. The plan placed the item here, so this is advisory.
  rewrite: Move [Migration notes](migration-notes.md) to the guides group beside Upgrade cairn, or drop it, since :173 already links it twice.
- [advisory] docs/extend/architecture.md:115 (paragraph split of The publish commit): The new second paragraph holds three subjects: the delete or rename manifest rule, the branch deletion after a publish, and the stray concurrency sentence "A save or a publish can land on a head that another commit moved...". Its last sentence is the plan's hand-off, but :119 opens by restating the same case, so the round-2 advisory on this hand-off still stands. These sentences are carried over from round 2, not new, and are noted for the record only.
  rewrite: Let Concurrent writes open on the moved-head case: "Any commit the admin makes can land on a head that another commit moved after the admin read it, and the save and publish commits handle that case with a head-merge retry." Then cut the last sentence of :115.

## fact read: fix
I graded the scoped rework in docs/extend/architecture.md: the diff changes 35 sentences across 39 insertions and 28 deletions. Thirty-two of those sentences trace cleanly to their cited facts. Three changed sentences claim more than their cited facts state, so the verdict is fix. Line 167 says the `Backend` contract is Extension-tier, and no cited fact states that tier. Line 150 says R2 is a Cloudflare service, and the R2 fact (f:2hnxsr) is cut on this page. Line 34 says placement rules fix what every subpath may contain, while f:0duu5p covers only three rules. Each finding comes with a one-line rewrite. Coverage is complete: all 48 outline ids are cited in the brief or appear in its cuts, all 184 brief sentences appear on the page, and every carried claim sits in its planned section. The absorbed data-tiers.md topics are all carried or cut, and f:db0cx6 was moved to configure-media by the outline fold. check:provenance, check:facts, and docs-links pass. The option map has no row pending architecture and holds pendingCount 126. No fact needed a [docs-drift] retag, and no friction entry was filed.
- [BLOCKING] docs/extend/architecture.md:167 (Backend contract, closing sentence; brief cites f:c1ujrl, f:gcd8h7): "The contract is one Extension-tier surface among many" states that `Backend`/`BackendProvider` are Extension API. Neither cited fact says so. f:c1ujrl defines the three tiers, and f:gcd8h7 describes the provider's shape. The tier is true per docs/reference/core.md:1077-1078, but no fact in docs/internal/facts/ records it, so the claim has no cited fact behind it.
  rewrite: The contract is one exported surface among many, and its stability tier decides what a provider written against it can expect across versions. (cite f:c1ujrl, f:gcd8h7; or file a verified fact for the Backend/BackendProvider Extension API tier, source docs/reference/core.md:1077-1078 and the reference-coverage gate, then cite it)
- [BLOCKING] docs/extend/architecture.md:150 (Data tiers, closing sentence; brief cites f:i74t7g, f:hk24xs): "D1 and R2 are Cloudflare services" has no cited fact for R2. f:i74t7g names only the `AUTH_DB` D1 binding and the Email Sending binding. f:hk24xs covers the content store as the one swappable seam. The R2-binding fact (f:2hnxsr) is cut on this page, so the R2 half of the sentence has no fact behind it. The second clause, that the content store is the only tier a site can replace, matches f:hk24xs. src/lib/content/types.ts:183 confirms that `AssetConfig.bucketBinding` is R2-only, so the clause stays true.
  rewrite: D1 and R2 are bindings the engine depends on outright, and the content store in git is the only tier a site can replace. (cite f:i74t7g, f:pgy0mr, f:hk24xs; or simply: "The content store in git is the only tier a site can replace." citing f:hk24xs)
- [BLOCKING] docs/extend/architecture.md:34 (Entry points hand-off; brief cites f:a7qx4m, f:0duu5p): "placement rules fix what each one may contain" claims a rule for every subpath. f:0duu5p (with f:bmxw7w) states rules only for the root barrel (no SvelteKit import), `/sveltekit` (no .svelte file), and where Svelte components live (`/admin`, `/public`, no `/components`). Most of the map's subpaths carry no placement rule, so the universal claim goes beyond the cited facts.
  rewrite: The export map holds more subpaths than these four, and placement rules fix where each kind of export lives. (cite f:a7qx4m, f:0duu5p, f:bmxw7w)
- [advisory] docs/extend/architecture.md (whole page) and docs/internal/briefs/extend/architecture.json: Traced as clean. All 48 outline ids are cited in the brief or appear in its cuts. All 184 brief sentences appear verbatim on the page. Every inventory claim marked carried is still in the section the plan places it in. The retired data-tiers.md topics are carried or cut, and the outline fold moved f:db0cx6 to configure-media. The 35 changed sentences were checked against their cited facts, and the other 32 match their sources (f:99f221, f:bhyvqg, f:gknz29, f:3rb362, f:a7qx4m, f:i87sd3, f:3pposq/f:p1xmp5, f:fhit7f, f:03zj56/f:brfitv/f:6a32oy, f:cjonmm, f:qehbx3, f:e69d0l, f:w379wu, f:0gihxq, f:cng7dr, f:pgy0mr, f:lu67dk, f:gcd8h7/f:025q6u, f:549u00, f:zm9tp4; the #0940 anchor resolves). check:provenance, check:facts, and docs-links pass. The option map has no row pending architecture, and no fact needed a [docs-drift] retag.

## figure verifier: accept
The page /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/architecture.md has one figure, the write-path mermaid diagram at line 78, and it earns its place. It shows which admin action reaches git, D1, or R2, and the prose alone does not show this as directly. It stays under the node budget and follows the mermaid routing rule. Its source is committed in the fence. Its accTitle and accDescr meet the alt rule, and the caption at line 105 meets the caption rule. One figure earned its place and none failed. Every other enumerable passage is already a table or a list: the export map, seams, data tiers, the concurrent-write rules, and the Backend semantics. No paragraph fails the missing-figure test. The entry-points paragraph at line 32 came closest but still reads cleanly. Verdict: accept.
- [advisory] /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/architecture.md:78: EARNS ITS PLACE. It passes the removal test. Line 76 names the three stores in one sentence, but only the diagram shows which admin action reaches which store and through what. That includes the Worker's per-request session lookup in D1, the App's three commit targets, the publish copy from the holding branch to main, and R2 feeding the delivery route. The surrounding prose and the subsections restate that information, so the two-part text alternative is met. It has 9 nodes and one subgraph, well under the budget of about 15, and it shows topology only with no branding, as the outline asked. Routing: it is mermaid, the corpus default. The fence is its source and is committed with the page. Alt: the accTitle starts with 'Diagram', runs to about 100 characters, and states what the reader learns. The accDescr carries the gist. Caption: the emphasis paragraph at line 105 uses complete sentences and adds a fact the alt lacks, that the manifest row lands in the same publish commit. It points at #data-tiers rather than referring to the figure's position. No source, alt, or caption defect.
- [advisory] /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/architecture.md:32: Not a missing figure (advisory). This paragraph describes how the /sveltekit layer sits between the admin and the Backend, the render pipeline, and the media and auth stores. It is the closest candidate for the missing-figure test, but it reads in one pass, and the list at lines 28-30 already enumerates the entry points. No re-read is needed to trace it, so it does not fail the test.
````

## Convergence

Facts only. Blocking counts are the `blocking` value of each read. "Prior run" is `wf_fe61a650-884`, from `docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md`; "this run" is `wf_ab29e38c-e13`. R1 and R2 are the first and second round reads. "n/r" means the page had no round in that run (it escalated on its plan reads). "-" means that seat did not read that page.

### Blocking counts per page and reader

| Page | Reader | Prior R1 | Prior R2 | This R1 | This R2 |
|---|---|---|---|---|---|
| add-a-custom-admin-screen | S | n/r | n/r | 0 | 0 |
| add-a-custom-admin-screen | R | n/r | n/r | 4 | 2 |
| add-a-custom-admin-screen | F | n/r | n/r | 3 | 1 |
| add-a-custom-admin-screen | Fig | n/r | n/r | 0 | 0 |
| replace-magic-links-with-cloudflare-access | S | n/r | n/r | 1 | 1 |
| replace-magic-links-with-cloudflare-access | R | n/r | n/r | 5 | 4 |
| replace-magic-links-with-cloudflare-access | F | n/r | n/r | 2 | 0 |
| replace-magic-links-with-cloudflare-access | Fig | n/r | n/r | 0 | 0 |
| security-model | S | 2 | 2 | n/r | n/r |
| security-model | R | 4 | 2 | n/r | n/r |
| security-model | F | 4 | 0 | n/r | n/r |
| add-cairn-to-a-sveltekit-app | S | 0 | 0 | 0 | 0 |
| add-cairn-to-a-sveltekit-app | R | 2 | 4 | 4 | 1 |
| add-cairn-to-a-sveltekit-app | F | 0 | 1 | 0 | 0 |
| theme-your-public-site | S | n/r | n/r | 1 | 3 |
| theme-your-public-site | R | n/r | n/r | 9 | 3 |
| theme-your-public-site | F | n/r | n/r | 5 | 1 |
| architecture | S | 1 | 0 | 0 | 0 |
| architecture | R | 3 | 2 | 1 | 2 |
| architecture | F | 0 | 0 | 0 | 3 |
| architecture | Fig | 0 | 0 | 0 | 0 |
| Total, all readers | | 16 | 11 | 35 | 21 |

Plan-read blocking counts, first read then re-read (structural edit only), for the same two runs:

| Page | Prior run plan reads | This run plan reads |
|---|---|---|
| add-a-custom-admin-screen | 2, 3 | 1, 0 |
| replace-magic-links-with-cloudflare-access | 1, 1 | 1, 0 |
| security-model | 0 | 1, 1 |
| add-cairn-to-a-sveltekit-app | 1, 0 | 0 |
| theme-your-public-site | 1, 1 | 1, 0 |
| architecture | 2, 0 | 0 |

### How each round-2 blocking finding in this run relates to the round-1 redraft

Method. A round-1 reader read the page as the round-1 drafter left it, and the redraft drafter then edited it for round 2. The working tree holds only the final page, and `git diff 2aacb280 -- <page>` is cumulative across both rounds, so it cannot separate the redraft from round 1. The round-1 page text was recovered instead from each redraft agent's first read of the page in the run journal (`~/.claude/projects/-var-home-glw907-Projects-cairn-cms/f54ad81c-ce11-46bb-8a52-e88797966121/subagents/workflows/wf_ab29e38c-e13/`, redraft agent transcripts). Its line numbers match the round-1 findings' file:lines (for example add-a-custom-admin-screen :190 and :344, theme-your-public-site :255-258), so it is the text round 1 read. For add-cairn-to-a-sveltekit-app the recovered text covers lines 1-120 and 430-460 and 780-1214 only, which includes the one cited line (:7).

- "Unchanged" means the cited sentence appears verbatim, ignoring whitespace, in the round-1 text, so the redraft did not touch it and round 1 read it in its final form.
- "Changed" means it does not appear verbatim: the redraft wrote or reworded it.
- "Mixed" means the finding cites several sentences and some fall in each class.
- The `2aacb280` column is the same verbatim test against the page at the run's start commit. It is "new" for every unchanged sentence below except one, so round 1 wrote them.
- "Round-1 finding" names a round-1 finding on the same lines, when one exists, and whether it named the defect the round-2 finding names.
- No finding was left "unclear". Mixed findings are split sentence by sentence.

| # | Page | Reader | Cited lines (final) | Cited sentence | vs `2aacb280` | Round-1 finding on the same lines |
|---|---|---|---|---|---|---|
| 1 | theme-your-public-site | S | :469-478 See also lacks the two outline cross-link pages | Changed. Round 1's list held seven bullets (the four guides, scaffolded-site-files, both references); the redraft cut it to three and rewrote the lead-in | changed | None on the list's composition. R advisories at r1 :156-157, :247-248, :286-288, :474, :480-486 concerned unlinked reference sections and forward links; the redraft's `couldNotDo` says it dropped the guides following the register editor's advice against recycled descriptions |
| 2 | theme-your-public-site | S | :17-19 introduction names too few sections | Changed. Round 1's sentence listed every body section; the redraft shortened it | changed | R blocking at r1 :27-33 and R advisory at r1 :15-18 were on the same introduction (out-of-scope routing, hand-built routing said three times); neither named the omission |
| 3 | theme-your-public-site | S | :459-460 check 2, "retune that status ink" | Changed (round 1: "retune the overridden ink beside its fill, or delete the override") | changed | R blocking at r1 :462-463 named this step (28 words, repeats Rebrand step 2); the redraft reworded it |
| 4 | theme-your-public-site | R | :160, :253, :308, :362, :368, :420 task-section sentences over 26 words | Mixed. Unchanged: :160, :308, :362, :368 (4 sentences). Changed: :253, :420 (2 sentences) | new (all six) | R blocking at r1 applied the same rule to other items (:86-102, :145-148, :325-342, :462-463); none named the four unchanged sentences |
| 5 | theme-your-public-site | R | :469-478 See also not following the plan | Changed (same text as #1) | changed | As #1 |
| 6 | theme-your-public-site | R | :133-134 vs :61-62 and :142-146, "role" used two ways | Mixed. Unchanged: :133-134 and :61-62 (2 sentences). Changed: :142-146 bullet (1) | :61-62 present; :133-134 and the :142-146 bullet new | R blocking at r1 :145-148 (the 51-word role bullet) was rewritten by the redraft; R advisory at r1 :118-119 vs :137 (restatement) touched :133-137 and did not name the contradiction |
| 7 | theme-your-public-site | F | :450-451 first sentence of Resolve an audit finding, claim with no fact | Unchanged (r1 :453-455) | new | None at those lines. R1 fact-read blocking findings were on the chassis boundary, the port first sentence, the token-tiers paragraph, the hand-off third bullet and the chassis-conventions lead |
| 8 | add-a-custom-admin-screen | R | :26-28 third precondition bullet, 44 words over three sentences | Changed in part. Round 1's bullet (r1 :25-26) held two sentences; the D1 binding sentence is unchanged, the "scaffold binds `APP_DB`" sentence was reworded, and the D1 migrations sentence was added by the redraft | new | S advisory at r1 :26 asked for the migration to be named and linked; the redraft's additions answered it |
| 9 | add-a-custom-admin-screen | R | :23-24 first precondition bullet, 28 words | Unchanged (r1 :22-23, both sentences) | new | R advisory at r1 :14, :15, :23, :33-35 concerned forward links to missing pages, not length; no finding on the length |
| 10 | add-a-custom-admin-screen | F | :472 "error-tier" claim with no fact | Unchanged (r1 :463) | new | None at those lines. R1 fact-read blocking findings (:489, :3, :481) were the same defect class on other sentences |
| 11 | replace-magic-links-with-cloudflare-access | S | :187-190 three qualifications stacked in one paragraph | Changed (all three sentences) | changed | R blocking at r1 :188-197 (four requirement bullets over 26 words); the redraft restructured the bullets and the qualifications landed here |
| 12 | replace-magic-links-with-cloudflare-access | R | :292-293 step 2, two actions in one step | Unchanged (r1 :303-304) | new | R blocking at r1 :306-310 named the sub-paragraph under this step (sentences over 26 words), not the step line |
| 13 | replace-magic-links-with-cloudflare-access | R | :187-190 same paragraph as #11, qualifications cut off | Changed (all three sentences) | changed | As #11 |
| 14 | replace-magic-links-with-cloudflare-access | R | :114-115 step 3 sub-paragraph restates the step | Changed | changed | R blocking at r1 :121-123 named this sub-paragraph (a long sentence); the redraft shortened it |
| 15 | replace-magic-links-with-cloudflare-access | R | :141-142 "Two settings outside the application can still deliver an admin response around it" | Unchanged (r1 :148-151; the two sentences before it in the paragraph were changed) | new | None at those lines. R advisory at r1 :330-331 (overstated universal) was on another sentence |
| 16 | architecture | R | :109 "with the signed-in editor as author and no committer" | Unchanged (r1 :109) | new (base had the `For a save and a publish alike, the engine sets no committer` form at base :107; round 1 moved it) | None at that line. S advisory at r1 :105 was a missing hand-off |
| 17 | architecture | R | :34 last sentence, "these four" and "each one" | Changed (round 1: "than the ones a site's entry points import, under rules that fix what each subpath may contain") | changed | R advisory at r1 :34 (dangling phrase, same sentence); the redraft reworded it |
| 18 | architecture | F | :167 "one Extension-tier surface among many" | Changed | changed | R advisory at r1 :163 (restatement of the stability-tier sentence); the redraft rewrote the closing sentence |
| 19 | architecture | F | :150 "D1 and R2 are Cloudflare services" | Changed | changed | R advisory at r1 :146 and :150 (restatement across a section boundary); the redraft rewrote the closing sentence |
| 20 | architecture | F | :34 "placement rules fix what each one may contain" | Changed (same sentence as #17) | changed | As #17 |
| 21 | add-cairn-to-a-sveltekit-app | R | :7 "each step that creates the project or its repository says when your app skips it" | Changed | changed | R advisory at r1 :7 (understated count of skipped steps) and F advisory at r1 :7 (no-claim scope sentence); the redraft rewrote the sentence in answer |

security-model has no row: it had no round in this run.

Tally of the 21 round-2 blocking findings in this run:

- Target only sentences the redraft left unchanged, so round 1 read them in their final form: 6 (#7, #9, #10, #12, #15, #16). By reader: register editor 4, fact read 2. None of the six had a round-1 finding naming the defect the round-2 finding names.
- Mixed, citing both unchanged and changed sentences: 2 (#4, with 4 of 6 cited sentences unchanged; #6, with 2 of 3 unchanged).
- Target only sentences the redraft wrote or reworded: 13 (#1, #2, #3, #5, #8, #11, #13, #14, #17, #18, #19, #20, #21). For 10 of them (#3, #8, #11, #13, #14, #17, #18, #19, #20, #21) a round-1 finding sat on the same sentence or step and the redraft's change answered it. For the other 3 (#1, #2, #5) the round-1 findings on those lines named other defects.
- The six unchanged-only findings plus the unchanged share of the two mixed findings are the sentences that round 1 read as they stand and did not flag for the defect round 2 names.
