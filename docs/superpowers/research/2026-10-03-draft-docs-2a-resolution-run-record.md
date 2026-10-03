# Task 7b resolution run: page plans and round-2 findings

Agent-facing stage record for draft docs stage 2a, task 7b's resolution run. Written 2026-10-03 from the run result JSON. Source of truth for what the plan readers and round readers said; nothing here is a ruling.

## Run

- Run: `wf_fe61a650-884`, on runner dotfiles `526c111`.
- Args: `bothReviewers: true`, `inFlight: 3`, `planModel: fable`; all six pages ran as `rework` pages.
- Started from commit `bbfb6788` on `draft-docs-2a`.
- Cost: 50 agents, 6,506,667 subagent tokens, 963 tool calls, about 119 minutes; run result `spent` value 1242176.
- Outcome: 0 of 6 pages accepted, all six escalated. Three escalated on a second plan-read fix verdict with no drafting (add-a-custom-admin-screen, replace-magic-links-with-cloudflare-access, theme-your-public-site). Three were drafted and escalated after round 2 (security-model, add-cairn-to-a-sveltekit-app, architecture; reason "second fix verdict or red gate").
- The final reader read ran on no page.
- Whole-tree gate after the run, `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs-gate'`: exit 0, `check:docs-gate: OK (17 check(s))`. Green; no page was fixed after the run.
- Round-2 drafter gates (page-scoped `check:docs-gate`) passed on all three drafted pages. The escalations are reader verdicts, not red gates.
- Seats: S = structural edit, R = register editor, F = fact read, Fig = figure verifier. The plan step has a structural-edit read only.
- Em dashes in reviewer text were replaced with hyphens for this record.

## Verdicts

| Page | Plan reads | Round 1 reads | Round 2 reads |
|---|---|---|---|
| add-a-custom-admin-screen | S fix (2), S fix (3) | not run | not run |
| replace-magic-links-with-cloudflare-access | S fix (1), S fix (1) | not run | not run |
| security-model | S accept (0) | S fix (2), R fix (4), F fix (4) | S fix (2), R fix (2), F accept (0) |
| add-cairn-to-a-sveltekit-app | S fix (1), S accept (0) | S accept (0), R fix (2), F accept (0) | S accept (0), R fix (4), F fix (1) |
| theme-your-public-site | S fix (1), S fix (1) | not run | not run |
| architecture | S fix (2), S accept (0) | S fix (1), R fix (3), F accept (0), Fig accept (0) | S accept (0), R fix (2), F accept (0), Fig accept (0) |

Counts in parentheses are blocking findings. Plan-read rows list the first read, then the re-read after the plan was revised.

## Pages

### add-a-custom-admin-screen

Status: escalate (second fix verdict on the plan read). Page: `docs/extend/add-a-custom-admin-screen.md`. Brief: `docs/internal/briefs/extend/add-a-custom-admin-screen.json`. Plan: `docs/internal/briefs/extend/add-a-custom-admin-screen.plan.md`.
Rework: True. Rounds drafted: 0. crossRegression: not reported (no drafting).

#### Plan step

Plan revised after the first read: True.

Plan read 1 (structural edit): verdict fix, blocking 2.

````text
I graded the plan at /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/internal/briefs/extend/add-a-custom-admin-screen.plan.md against the outline entry, the four live cross-links, the task-guide anatomy, and Red Hat Block 1 and Google Block 2. Verdict: fix, with two blocking order findings.

Blocking:
- Gate it's step 4 tells the reader to wrap actions in a wrapper that two later sections choose and build, and Wrap the actions repeats the same step.
- Gate it's nested-route steps 2 and 3 come before the reader has any nested route. The only one they build is in the optional lazy-detail recipe much later.

What holds up:
- The overall order matches the outline's covers list: route, gate, wrapper choice, sink, toolkit, styling, recipes, motion, verify.
- Every covers item is delivered or explicitly subordinated, with reasons.
- The introduction has the contract plus all three of Google's parts, and its out-of-scope list matches the outline.
- All four cross-links are placed. debug-your-site sits on the failure path and is correctly kept out of See also.
- The verification, failure-path, and see-also endings follow the anatomy.

Non-blocking:
- The introduction's hand-off list contradicts the plan's own \"no list cadence\" instruction, and it hands off to restrict-admin-access twice.
- The introduction doesn't say that styling, the two recipes, and motion are covered or that the recipes are optional.
- There's no failure path for the most likely first failure: an owner getting a 403 because the route has no access-map rule.
- The switch from npx cairn-audit to check:cairn is not recorded.
- The f:3lbdl6 placement is recorded inconsistently.
- Style the screen carries far more explanation than its one step.

I didn't run Vale. Internal plans fall outside the Vale globs, and this seat never edits.
````

Plan read 2 (structural edit): verdict fix, blocking 3.

````text
I graded the plan at the structural level, against the extend.json outline entry, the task-guide anatomy, the Red Hat Structure Checklist and Google's introduction items. The verdict is fix, with three blocking findings.

What passes:
- **Order and pace:** the route, gate, wrapper choice, actions, audit sink, markup, verify, failure path, see-also order argues itself from dependencies and serves the user goal.
- **Introduction:** it has all three of Google's parts (covers, prior knowledge, does not cover). Wrong-place routes go to define-an-adapter-and-schema, restrict-admin-access and arrange-the-admin-sidebar.
- **Cross-links:** all four outline crossLinks are placed. debug-your-site is in Resolve a missing audit record, and run-cairn-audit-on-your-site is in Verify and See also.
- **Recorded departures:** the plan records why it departs from covers items 9, 10, 11 and 14.

Blocking findings:
1. **Missing See also link (:499-504).** The introduction (:91-93) promises configure-media as a See also bullet, but the See also list leaves it out.
2. **No steps in Build the dialog form (:343-368).** The section has a task heading but no step, which breaks the plan's own ruling that a task heading heads a section with a step.
3. **Load row detail on demand (:381-398).** It states three ExpandableRow markup traps before any step, and no step renders the rows as ExpandableRow. The rules end up as exposition with no action to attach to.
````

Plan `couldNotDo`:

- The extend track's recovery surface, docs/extend/debug-your-site.md, carries no auth.access.refused symptom row in its outline covers or fact ids, so the owner's-403 diagnostic the structural edit asked for (Verify check 1, f:3lbdl6) points at restrict-admin-access and the auth.access.refused row in docs/reference/log-events.md instead of the recovery surface the task-guide anatomy names. Filed as friction feeding that page's inputs (new this revision).
- f:hafpqf is subordinated to docs/reference/sveltekit.md (createSectionAction check order item 2 and the SectionActionConfig type row), which states the rate limit's members, order, and degrade-to-open but not the default 429 copy or the redirect()/error() carve-out. Filed as reference-arm friction; the fact stays subordinated.
- No fact in the inventory states that a custom screen's form mounts CsrfField, though docs/reference/admin.md's CsrfField entry says a form without it fails the guard's token check and the example site mounts it in both signups forms. The plan keeps <CsrfField /> in the dialog snippet's code and lets the page make no prose claim. Filed as a facts-container hole.
- The outline's figure note asks for the signups screen with its dialog; the only shell-hosted story is toolkit/custom-screen (friction already logged 2026-09-30). The plan keeps that story.
- Covers item 9 asks the motion section to cite admin-design-system by heading; that document is internal, so the page cites the docs/reference/cairn-audit.md headings instead, per the conductor's ruling.

Plan `frictionFiled`:

- extender: a hole in docs/internal/facts/ for the add-a-custom-admin-screen page, no fact states that a custom screen's form mounts CsrfField (docs/reference/admin.md CsrfField entry; examples/showcase/src/routes/admin/signups/+page.svelte:8,64,145), and the committed dialog snippet posts with none
- extender: docs/reference/sveltekit.md's createSectionAction entry and SectionActionConfig row omit rateLimit.message's default 429 copy and the redirect()/error() propagation carve-out (f:hafpqf; src/lib/sveltekit/section-action.ts:278)
- docs/internal/docs-friction-log.md, under "Filed 2026-10-03 by the page plan for docs/extend/add-a-custom-admin-screen.md": `extender`, found by the add-a-custom-admin-screen page plan's revision on 2026-10-03 (f:3lbdl6): debug-your-site's outline carries no auth.access.refused symptom row for an owner's 403 on an unmapped custom route (new this revision)
- docs/internal/docs-friction-log.md, same group: `extender`, found by the add-a-custom-admin-screen page plan on 2026-10-03, a hole in docs/internal/facts/: no fact states that a custom screen's form mounts CsrfField (filed by the prior plan step, carried in this report)
- docs/internal/docs-friction-log.md, same group: `extender`, found by the add-a-custom-admin-screen page plan on 2026-10-03 (f:hafpqf): the createSectionAction reference entry states neither the default 429 copy nor the redirect()/error() carve-out (filed by the prior plan step, carried in this report)

#### Escalation findings (final, in full)

````text
## structural edit: fix
I graded the plan at the structural level, against the extend.json outline entry, the task-guide anatomy, the Red Hat Structure Checklist and Google's introduction items. The verdict is fix, with three blocking findings.

What passes:
- **Order and pace:** the route, gate, wrapper choice, actions, audit sink, markup, verify, failure path, see-also order argues itself from dependencies and serves the user goal.
- **Introduction:** it has all three of Google's parts (covers, prior knowledge, does not cover). Wrong-place routes go to define-an-adapter-and-schema, restrict-admin-access and arrange-the-admin-sidebar.
- **Cross-links:** all four outline crossLinks are placed. debug-your-site is in Resolve a missing audit record, and run-cairn-audit-on-your-site is in Verify and See also.
- **Recorded departures:** the plan records why it departs from covers items 9, 10, 11 and 14.

Blocking findings:
1. **Missing See also link (:499-504).** The introduction (:91-93) promises configure-media as a See also bullet, but the See also list leaves it out.
2. **No steps in Build the dialog form (:343-368).** The section has a task heading but no step, which breaks the plan's own ruling that a task heading heads a section with a step.
3. **Load row detail on demand (:381-398).** It states three ExpandableRow markup traps before any step, and no step renders the rows as ExpandableRow. The rules end up as exposition with no action to attach to.
- [BLOCKING] docs/internal/briefs/extend/add-a-custom-admin-screen.plan.md:499-504: Fails Block 2's check that the document meets the expectations the introduction sets ("Does your introduction provide an accurate overview of the topics you cover?") and Block 1's "Cross-references are used appropriately". The introduction at :91-93 sends the media upload protocol to See also as "`configure-media`, each a See also bullet". The See also list names six bullets and none is `configure-media`. A reader who follows the introduction's pointer finds no link, and the outline's out-of-scope item for the media upload protocol has nowhere on the page to send the reader.
  rewrite: Add a seventh See also bullet: `configure-media` (sets up media uploads and the upload protocol a screen using `MediaPicker` relies on). Or drop `configure-media` from the introduction's closing sentence and name only the pages See also carries. Adding the bullet is the better fix, since it disposes of the outline's out-of-scope item.
- [BLOCKING] docs/internal/briefs/extend/add-a-custom-admin-screen.plan.md:343-368: Fails Block 1's "Module types are used correctly" and "Tasks reflect the intended goal of the user". The plan applies the conductor's own ruling at :51-52 ("a task heading heads a section with a step") to Compose and Style, but not to Build the dialog form. That section has a task heading and no step. Its content is a list of four result branches, a statement about `showModal()`, a snippet, and a bulleted list of attribute rules. This is the task-heading-with-no-step defect the round-2 register editor flagged on the other sections. It also breaks the anatomy rule that explanation hangs on a step.
  rewrite: Give the recipe numbered steps, one action each, with the location named first. For example: (1) in the screen's `+page.svelte`, add a `<dialog>` with `aria-labelledby` pointing at its heading and open it with `showModal()`; (2) inside it, add the action form with `use:enhance`, never nested in a `<form method="dialog">`; (3) in the `enhance` callback, handle each of the four result types without calling `update()` on `'error'`; (4) mount an empty `role="alert"` paragraph and point the control's `aria-describedby` at it. Hang the four-branch list and the attribute rules under steps 3 and 4 as their explanation. Keep the snippet after the steps.
- [BLOCKING] docs/internal/briefs/extend/add-a-custom-admin-screen.plan.md:381-398: Fails Block 1's "Information is presented in the most logical order and location" and "Tasks reflect the intended goal of the user". The section states three `ExpandableRow` markup traps before any step: the `colspan` count, the `header` snippet's `<th scope="col">`, and `data-cairn-inert-cell`. Its eight steps then cover only the endpoint, the access gate, and the fetch handler. No step renders the rows as `ExpandableRow` in `+page.svelte`, so the markup rules have no action to attach to. They arrive as free-standing exposition ahead of the procedure, which the anatomy forbids ("Explanation stays subordinate to the steps"). They would also fit better next to the client-side steps than before the server ones.
  rewrite: Add a markup step, for example after the access-map step: in the screen's `+page.svelte`, render each row as an `ExpandableRow` inside the `AdminTable`, linking the `ExpandableRow` entry for its props. Hang the three traps under that step as its explanation. Then the open-handler steps (cache check, fetch, `response.ok`, `Response.json()`, cache on success) follow the markup they wire. Keep the streaming-does-not-help sentence (`f:b5mcea`) as the lead-in after the first sentence.
````

### replace-magic-links-with-cloudflare-access

Status: escalate (second fix verdict on the plan read). Page: `docs/extend/replace-magic-links-with-cloudflare-access.md`. Brief: `docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.json`. Plan: `docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.plan.md`.
Rework: True. Rounds drafted: 0. crossRegression: not reported (no drafting).

#### Plan step

Plan revised after the first read: True.

Plan read 1 (structural edit): verdict fix, blocking 1.

````text
I checked the plan against the outline entry (job, covers, outOfScope, crossLinks), the task-guide anatomy, and the two checklists (Red Hat structure and Google's large-docs). Verdict: fix, with one blocking finding.

**What holds up:**
- **Departures:** every departure from the outline's cover order comes with a reason. Preparing the roster ahead of the Access work, and spreading the logout facts over the sections that use them, are both sound pacing choices.
- **Hand-offs:** the Access section collects the three values that the verifier and config module use later.
- **Introduction:** it covers the anatomy's three parts, and the out-of-scope paragraph names both of the outline's outOfScope pages.
- **Cross-links:** both of the outline's crossLinks entries appear (the security model page and add-cairn-to-a-sveltekit-app#customize-the-sign-in-email).
- **Anatomy:** headings follow the bare-infinitive policy, and the ending is a See also section that doesn't repeat the recovery link.

**The blocking finding (plan lines 474-481):** the failure path in "Resolve a refused sign-in" has a gap. The plan says the `expired`, `invalid`, and `no_email` reasons are covered by step 8. Step 8 only applies to a stale-tab sign-out, so an ordinary `expired` refusal matches no step. Step 8 also tests a different thing from steps 4 to 7, so a stale-tab refusal can be sent to the wrong check first.

**Non-blocking:**
- The introduction's prior-knowledge paragraph describes the site's state rather than the reader's knowledge. It also repeats the first precondition almost word for word.
- The "read instead" redirects are split between the introduction and the Decide section.

I didn't run `npm run check:vale`, because the page doesn't exist yet. I made no edits.
````

Plan read 2 (structural edit): verdict fix, blocking 1.

````text
I graded the revised page plan at the structural level. The introduction meets Google's three parts and the task-guide anatomy. The contract is its first sentence, and it states when, why, and who it is for. Paragraph 2 gives the reader's prior knowledge and collects every 'read instead' redirect, including the outline's add-cairn customize-email cross-link. Paragraph 3 gives the two out-of-scope items with their pages. Section order follows the dependency chain and is paced: decide, then preconditions with producers, roster, Access application (which collects the three verifier inputs), verifier, wire, verify, failure path, see also. The failure path now runs every refusal reason in order, with debug-your-site last. Both outline cross-links are honored. One blocking finding remains: no step deploys the site or locates the go-live moment, yet the Verify section probes the live hostname and logs. Two advisory findings: the `error` step assumes a throw that the plan's own reasonFor default also produces, and the Access section's heading undersells its cache and Wrangler steps.
````

Plan `couldNotDo`:

- (none)

Plan `frictionFiled`:

- extender: Found by the replace-magic-links page plan on 2026-10-03 (f:q0icwk, f:s9s8mw, f:pwmybh). The facts container holds no fact stating Access's logout address, so the config module step can only link the session management page and the sample imports the value without spelling it.
- extender: Found by the replace-magic-links page plan on 2026-10-03 (f:qhmydf). Identity mode has no owner bootstrap, since bootstrapOwner lives only in the magic-link routes the identity branch never reaches, so the first owner is a precondition seeded out of band.

#### Escalation findings (final, in full)

````text
## structural edit: fix
I graded the revised page plan at the structural level. The introduction meets Google's three parts and the task-guide anatomy. The contract is its first sentence, and it states when, why, and who it is for. Paragraph 2 gives the reader's prior knowledge and collects every 'read instead' redirect, including the outline's add-cairn customize-email cross-link. Paragraph 3 gives the two out-of-scope items with their pages. Section order follows the dependency chain and is paced: decide, then preconditions with producers, roster, Access application (which collects the three verifier inputs), verifier, wire, verify, failure path, see also. The failure path now runs every refusal reason in order, with debug-your-site last. Both outline cross-links are honored. One blocking finding remains: no step deploys the site or locates the go-live moment, yet the Verify section probes the live hostname and logs. Two advisory findings: the `error` step assumes a throw that the plan's own reasonFor default also produces, and the Access section's heading undersells its cache and Wrangler steps.
- [BLOCKING] docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.plan.md:430-437: Red Hat 'Tasks reflect the intended goal of the user' and 'Information is presented in the most logical order': no step in the plan deploys the site. The Wrangler change (Access step 8, :342), the resolver module (verifier steps 2-3), and the hooks option (wire step, :430) are all local edits, and section 7 then probes the primary hostname, Workers Logs, and workers.dev as if the change were live. The plan names the go-live moment twice: the roster section's rationale (:89-91, :283 'before the gate goes live') and f:g0206o ('refused the moment the gate goes live'). It never places that moment as a step, so the reader never gets the action that completes the goal. The only 'deployed' in the plan is the precondition at :260.
  rewrite: Close the wire section with the go-live as its own step: change the single bullet into a two-step numbered list, (1) in src/hooks.server.ts pass the resolver as identity, (2) from the site's project, deploy the Worker. Name the deploy as the moment the roster check from section 3 starts to bite. Then make the hand-off read 'with the site deployed, the checks below confirm...'. If a fact is needed for the deploy command, cite the add-cairn page's deploy step or mark the step no-claim and link it.
- [advisory] docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.plan.md:510-511: Advisory, on the failure path's order of checks. Step 9 says the `error` reason means 'the resolver threw'. But the plan's own sample (:396-401) returns `error` as reasonFor's default for any unmapped jose failure, such as a JWKS fetch failure. A reader with a non-throwing `error` refusal would hunt for an exception that does not exist.
  rewrite: Key step 9 on the reason alone: 'If the reason is `error`, read the record's message: either the resolver threw, or the verifier hit a failure its reason mapping does not name.' Let the fact read confirm against f:fu4uis what a thrown resolver logs.
- [advisory] docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.plan.md:298-347: Advisory, on Google's 'headings and subheadings that help users understand the subject'. The section headed 'Create the Access application' ends with two steps outside the application: a zone cache-rule check (step 7) and a Wrangler config change (step 8). The section's own Takes sentence frames them as 'every other way to reach the Worker's /admin must be closed'. The outline groups them the same way, so the order holds, but the heading undersells the section.
  rewrite: Either retitle it to the section's claim, such as 'Put Access in front of /admin', or keep the heading and open the steps-7-8 stretch with a one-sentence lead-in tying them to closing the other routes to /admin.
````

### security-model

Status: escalate (second fix verdict or red gate). Page: `docs/extend/security-model.md`. Brief: `docs/internal/briefs/extend/security-model.json`. Plan: `docs/internal/briefs/extend/security-model.plan.md`.
Rework: True. Rounds drafted: 2. crossRegression: False.

#### Plan step

Plan revised after the first read: False.

Plan read 1 (structural edit): verdict accept, blocking 0.

````text
I graded the plan for docs/extend/security-model.md at the structural level and the verdict is accept: it fails no checklist item, and the four findings are all non-blocking.

**Order.** The plan departs from the outline's inventory order, and the departure holds up. The sections follow the threat argument: taking the account (sign-in, binding, cookie), then riding it (CSRF, guard, dev flag), then what it reaches (access map, render, GitHub App), then the two replaceable seams after the defaults they change, then the responsibilities and related resources. The introduction states this grouping, and the plan gives a reason for each departure, including folding the logs cover item into section 1.

**Pace and user goal.** Every section opens on its claim and closes on a "Limits of ..." subsection and a hand-off. The plan names both readers, the evaluator and the replacer, and says how the order serves each.

**Introduction.** All three Google parts are present in paragraph 3 (covers, prior knowledge, doesn't cover), and the definition follows as the concept anatomy asks. Owner-ruled paragraphs 1 and 2 stand.

**Coverage and links.** Every outline cover item is placed, including "floors, not ceilings" through f:y3ljm0's restored sentence. The out-of-scope list matches the outline's six entries. All four crossLinks from security-model appear in related resources. The allowlist subsection keeps the slug that docs/extend/migration-notes.md:370 links; I checked the file and it does.

**Non-blocking findings:**
- The isolation sentence in paragraph 5 is an out-of-scope statement placed after the definition; it belongs in paragraph 3.
- Paragraph 3 is dense, with about twelve named items before the first heading.
- migration-notes is a per-version record listed under Concepts.
- Section 4 (CSRF) is the densest component section, and its why-facts run long before the mechanism arrives.
````

Plan `couldNotDo`:

- f:9pmipf is subordinated to docs/reference/sveltekit.md, the NO_PENDING_REQUEST_ERROR entry, but that entry states the code's condition narrower than the code: it says the code fires when the browser holds no pending-login cookie and the token is bound to another browser's nonce, while src/lib/sveltekit/auth-routes.ts:346-362 sends no-pending-request for every failed cookie-less confirm (bound, missing, expired, or replayed). Filed as reference-arm friction; the fact stays subordinated, not kept on the page.

Plan `frictionFiled`:

- Filed 2026-10-03 by the page plan of docs/extend/security-model.md: extender, f:9pmipf, the NO_PENDING_REQUEST_ERROR entry in docs/reference/sveltekit.md states the cookie-less condition narrower than the code
- Filed 2026-10-03 by the page plan of docs/extend/security-model.md: extender, f:zzbzo8, the createRenderer entry in docs/reference/core.md lists the hast-stage steps with the dispatch before the sanitize floor and omits rehype-raw

#### Rounds

Round 1: gate pass; index link: present docs/extend/README.md: ./security-model.md under "Auth and access".
Reads: structural edit fix (blocking 2); register editor fix (blocking 4); fact read fix (blocking 4).

Round 1 drafter `couldNotDo`:

- I left one sentence of the plan's text out on purpose. Section 10's hand-off now reads only 'The other seam a site can add is an auth channel.' The plan's longer version said the channel signs a site's members in. The only fact for that is f:8u4iiv, and the round-2 fact read called that support indirect, so the sentence makes no claim.
- The plan asked for some groups of facts to go in one sentence: the three rule instances in section 11 (f:7idpoq, f:k6u4g2, f:e0imm6), the origin check (f:wu8x70 with f:8u4iiv), and the hashing facts (f:fslodf with f:dipwmx). Written as single sentences, these became the semicolon-chained lists the register's tells ban. So the three rule instances are a bulleted list under a lead-in sentence that cites f:pjjo64. The origin pair and the hashing pair are two sentences each. Every fact stays in the section the plan gives it.
- Geoff's paragraph 2 stands word for word as the plan's owner ruling requires. It still describes the page and refers to position ('Each section below', 'The page ends with'), which the register's tell forbids. The plan records that override.
- The sentence linking the NO_PENDING_REQUEST_ERROR entry uses plain link text ('entry for the missing-pending-request error'). A code-span link text would be an extractable name, and its facts (f:9uhscf, f:9pmipf) are subordinated cuts. That entry is still narrower than the code; the friction-log entry filed with the plan already records this.

Round 1 drafter `frictionFiled`:

- (none)

Round 1 fact read `frictionFiled`:

- Filed 2026-10-03 by the page plan of `docs/extend/security-model.md` (draft docs stage 2a, task 7c): security-model fact read, the 303 login redirect carries none of the guard's admin security headers (f:ubuj1w, f:t976f1, f:n3k03a)

Round 2: gate pass; index link: present docs/extend/README.md: ./security-model.md under "Auth and access".
Reads: structural edit fix (blocking 2); register editor fix (blocking 2); fact read accept (blocking 0).

Round 2 drafter `couldNotDo`:

- The cut reason for f:r0cv6e in the brief stays verbatim from the claim inventory, so it still names docs/extend/migration-notes.md as the record of when the sanitize floor shipped. The fact read found that file holds no such record, since it starts at 0.86.0 and the floor shipped in v0.17.0. The plan's row and the brief's reason need the conductor to correct them. The page itself no longer makes that claim.
- Plan section 12's enumerated list and its Concepts gloss for Migration notes ("when the sanitize floor and the access-map warning shipped") disagree with the redrafted page. The page adds three residual items to the list and limits the gloss to the access-map warning, so the plan text needs the same updates.
- Plan hand-offs dropped: the plan gives most sections a closing turn, but both reviewers ruled those turns restating or misplaced, so they are cut. The plan's hand-off lines for sections 1 to 11 no longer match the page.

Round 2 drafter `frictionFiled`:

- Filed 2026-10-03 by the page plan of `docs/extend/security-model.md`: extender, the two "tidy" surfaces gate differently (f:cvv6to, f:arr13a)

#### Escalation findings (final, in full)

````text
## structural edit: fix
Structural edit of /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/security-model.md against its plan (docs/internal/briefs/extend/security-model.plan.md), the outline entry, the concept anatomy, the Red Hat Structure Checklist, and Google's large-docs items. npm run check:vale reports 0 errors. Section order, headings, Limits subsections, the guard-then-dev-backend adjacency, the responsibilities list in page order, the related-resources grouping, and the kept allowlist slug (migration-notes.md:370 resolves) all match the plan. Two blocking findings. First, the introduction's doesn't-cover list leaves out the outline's sixth outOfScope item: when the sanitize floor shipped belongs to migration-notes. Second, the page drops every planned section hand-off, which leaves the turn from the built-in design to the replaced seams unmarked in the body and keeps the identity-gate and channel setup links away from the risks they belong to. Two non-blocking findings: the access-map body itemizes exceptions that belong in its Limits subsection, and the planned inline link to SvelteKit's csrf option is missing. Verdict: fix.
- [BLOCKING] docs/extend/security-model.md:16-20: Google intro item 'What the document doesn't cover', and the post-draft check of the introduction against the entry: the outline's outOfScope list has six items, and the introduction names five of them (the five how-to guides). 'When the sanitize floor shipped; state the floor as it is (migration-notes, kept)' appears nowhere on the page. The plan's paragraph 3 'Doesn't cover' duty assigns that sentence explicitly. The Related resources entry at :455 compounds the gap: it describes Migration notes only as 'for when the access-map warning shipped', while the plan's descriptor is 'when the sanitize floor and the access-map warning shipped'. So the page never tells a reader where the floor's history lives.
  rewrite: Close paragraph 3 with a subject-stated sentence after the guide list, with no code span or version: 'When the sanitize floor shipped is a record in [Migration notes](migration-notes.md), and the floor is described here as it stands.' Change :455 to '[Migration notes](migration-notes.md), for when the sanitize floor and the access-map warning shipped.'
- [BLOCKING] docs/extend/security-model.md:338-342: Google 'a clear, logical development of the subject' and Red Hat 'Cross-references are used appropriately': the plan gives every section a closing hand-off turn, and the page carries none of them. Each section stops at the last sentence of its Limits subsection. The cost peaks at the plan's group boundary, between the GitHub App's reach and Identity mode's threat surface. The plan's turn there is 'Every defense so far assumes cairn's own sign-in; a site that replaces it moves some of them'. Without it, nothing in the body marks the shift from the built-in design to the replaced seams, and only the introduction states that grouping. The two seam sections also leave out their planned setup links. The crossLinks entries tie replace-magic-links-with-cloudflare-access to 'the identity gate whose risks it describes' and add-a-second-sign-in-group to 'the channel whose threat catalogue it carries'. On the page, both links appear only in the introduction and in Related resources, never at the risks themselves (sections at :340-366 and :368-404).
  rewrite: Restore the plan's hand-offs as the closing sentence of each section, placed after the Limits subsection's content. At minimum, end 'Limits of the installation token' (:338) with the group turn: 'Every defense so far assumes cairn's own sign-in, and a site that replaces it or adds a second one moves some of them.' End 'Limits of identity mode' (:366) with '[Replace magic links with Cloudflare Access](replace-magic-links-with-cloudflare-access.md) sets up the gate these risks belong to.' End 'Limits of the auth channel' (:404) with '[Add a second sign-in group](add-a-second-sign-in-group.md) builds a channel, and [Config obligations](../reference/auth-channel.md#config-obligations) states what each supplied function owes.' The planned turns for sections 1 to 8 (for example, binding to session cookie, and access map to render safety) are worth restoring the same way.
- [advisory] docs/extend/security-model.md:243-248: Information pace and placement (Red Hat 'right pace' and 'most logical order and location'): the plan places f:cvv6to as one sentence, 'not the itemized action list'. The body sentence lists the three exceptions instead: the site-wide publish, the tidy action, and the personal-dictionary action. Those same three exceptions are the Limits subsection's material at :261-266, so the residuals arrive before the subsection that is meant to hold them.
  rewrite: Cut 'Apart from the site-wide publish, the tidy action, and the personal-dictionary action,' and state the gate in one sentence: every engine write action gates through the map against one target, and an unmapped target admits any editor-capability session. Leave the exceptions to 'Limits of access map coverage'.
- [advisory] docs/extend/security-model.md:135-137: Red Hat 'Cross-references are used appropriately': the plan puts an inline link to SvelteKit's csrf option (https://svelte.dev/docs/kit/configuration#csrf) on the sentence about SvelteKit's default check, and the page does not carry it. The plan's Related resources note says this link 'stays an inline link in section 4'.
  rewrite: Link 'SvelteKit's default check' to https://svelte.dev/docs/kit/configuration#csrf.

## register editor: fix
I graded the rework of /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/security-model.md at the page level against its page plan, docs/internal/briefs/extend/security-model.plan.md. The diff is non-empty: 230 lines added, 273 removed.

**Verdict: fix.** Two findings block.

**What the rework gets right:**
- Section order matches the plan's thirteen sections exactly.
- Geoff's two introduction paragraphs land as written, with the "nothing behind `/admin`" alternative he approved.
- The definition paragraph restores the original sentence word for word.
- Each section opens on the claim the plan gives it.
- The planned facts are subordinated with named reference links (no-pending-request, the HSTS reason, the `checkOrigin` deprecation, the log record).
- Every component section ends in a Limits subsection.
- The ending is the "In short" verdict, a responsibilities list in page order with every item under 26 words, then Related resources grouped by the anatomy.

**Blocking findings:**
1. **Every hand-off the plan specifies is missing.** Each section stops at its Limits subsection and the next starts cold. The page still reads as the atoms the diagnosis described, which is the problem the rework was for. Two disposals the plan claims never landed: the render lead-in turn, and the built-in-to-seams turn before the identity mode section.
2. **The intro's "Configuring each defense and seam belongs to the how-to guides" is false.** CSRF, the session cookie, the browser binding, and the dev-backend flag have no guide. The sentence is also a five-link inventory that repeats Related resources and names the doc taxonomy in prose. Vale's Cairn.ProseProcedure fires on it.

**Non-blocking findings:**
- The intro's seven-item inventory names the contents instead of the attacker-path argument.
- The access-map sentence (lines 245-248) contradicts its own Limits subsection.
- Two section openings refer back past a heading or use a term the next section introduces.
- Three claims need the claims checker: the 303 redirect carrying no admin headers, the dropped `createSectionAction`, and the NIST sentence's unconnected "and".

**Measures** (the docs-register profile resolved):

| Measure | Value |
| --- | --- |
| Prose sentences | 146 |
| `hinged_pair_share` | 0.42 |
| `short_sentence_share` | 0.007 |
| Average sentence length (my count) | about 23 words |
| Longest sentence | lines 245-248, about 47 words |
| Paragraphs | about 70 |
| Disproportionate paragraph | intro paragraph 3, about 110 words carrying two inventories |

By ear, the hinged share comes from a heavy reliance on ", so" consequence clauses; it is noted, not gated.

**Vale:** 0 errors. The 19 warnings are 18 Google.WordListCase hits on "admin", which the extend track and the Names table allow and so are not findings, plus the one ProseProcedure hit above. **tellgrader:** zero findings.

The draft reads as its register's plausible author sentence by sentence. The single change that would help most is writing the plan's hand-off turns, which would make the page argue the attacker's path instead of listing components.
- [BLOCKING] docs/extend/security-model.md, every section end: lines 61, 96, 119, 161, 206, 237, 276, 321, 338, 366, 404: None of the hand-offs in the page plan made it into the draft. Every section stops at the end of its Limits subsection, and the next section starts on a new subject with no turn. The diagnosis (docs/superpowers/research/2026-10-01-draft-docs-2a-page-plan-diagnosis.md) says the committed page reads as loosely connected atoms. The plan's fix is the attacker's path, carried section to section by those turns (plan, 'The argument, and the order it needs', and each section's Hand-off line), so the rework fixed the order but not the problem the order was for. Three junctures are worse than the rest. (1) Access map to Render safety: the plan says it disposes of the round-2 note on the render lead-in's equivocation by moving that turn to the end of section 7, and the turn is absent, so that disposal never happened. (2) The GitHub App's reach to Identity mode's threat surface: nothing tells the reader the page has moved from built-in defaults to seams a site replaces. That built-in-then-replaced grouping is the round-2 structural finding the plan says it applies. (3) The sections on identity mode and the auth channel end without the plan's hand-off links to their setup guides. Scope rule: page-level hand-offs are in scope, and the plan governs placement.
  rewrite: Add each hand-off as the last sentence of its section. Where a section ends in a Limits subsection, put the turn just before the Limits heading, not inside it. Use the plan's wording and refer to targets by name, never by position. For example, end of the Access map coverage body: "An editor's reach also includes the markup they write, which every visitor's browser renders, and [render safety](#render-safety) covers what the engine does with it." End of The GitHub App's reach (before its Limits): "Every defense up to this point assumes cairn's own sign-in, and a site that replaces it with an identity gate or adds an auth channel moves some of them." End of Identity mode's threat surface body: "[Replace magic links with Cloudflare Access](replace-magic-links-with-cloudflare-access.md) sets up the gate these risks belong to." End of The auth channel's threat surface body: "[Add a second sign-in group](add-a-second-sign-in-group.md) builds a channel, and [Config obligations](../reference/auth-channel.md#config-obligations) states what each supplied function owes." CSRF to the guard: "The CSRF check is one step in the [auth guard](#the-auth-guard)'s fixed order."
- [BLOCKING] docs/extend/security-model.md:16-20: "Configuring each defense and seam belongs to the how-to guides [five links]" is an overstated universal. CSRF protection, the session cookie, the browser binding, and the dev-backend flag have no guide among the five, so "each defense" is false. The sentence is also a five-link inline inventory that drops the plan's pairing of guide to seam (plan, paragraph 3 'Doesn't cover': each named as a subject, "Configuring the access map belongs to ..."). It repeats the Related resources how-to list word for word, and it names the doc-type taxonomy ("the how-to guides") in prose. Vale Cairn.ProseProcedure fires on it (17:101). Register tells: list cadence in prose, and no restatement. Logic: overstated universal.
  rewrite: Configuring the access map belongs to [Restrict admin access](restrict-admin-access.md), and an identity gate to [Replace magic links with Cloudflare Access](replace-magic-links-with-cloudflare-access.md). Building an auth channel belongs to [Add a second sign-in group](add-a-second-sign-in-group.md), the renderer's options to [Configure rendering](configure-rendering.md), and the App's private key to [Rotate the GitHub App key](rotate-the-github-app-key.md).
- [advisory] docs/extend/security-model.md:11-13: "The built-in defenses are the sign-in link and its browser binding, the session cookie, CSRF protection and the guard's response headers, the dev-backend flag's refusals, the access map's coverage, the render pipeline's sanitizing, and the GitHub App's reach." This is a seven-item comma inventory that repeats the section headings in order. It names the page's contents, but it does not state the plan's argument: the defenses follow the attacker's path, from taking the account, to riding it, to what it reaches. This makes intro paragraph 3 (about 110 words, two inventories) the page's most disproportionate paragraph. Register tell: list cadence in prose. Weigh this with the hand-off finding, since one sentence of argument here would do much of the hand-offs' work.
  rewrite: The built-in defenses follow that attacker's path: the sign-in link, its browser binding, and the session cookie guard the account, CSRF protection, the auth guard, and the dev-backend refusals guard requests made with it, and the access map, the render pipeline, and the GitHub App's permissions bound what a taken account reaches.
- [advisory] docs/extend/security-model.md:245-248: "Apart from the site-wide publish, the tidy action, and the personal-dictionary action, every engine write action, the tidy settings save included, gates through the map against one target, either the concept id or one of the fixed screens `media`, `nav`, `settings`, and `vocabulary`." At about 47 words it stacks two parentheticals before the verb. It also contradicts its own Limits subsection: the tidy and dictionary actions do gate through the map when the route carries a `concept` parameter (line 265), so "apart from" overstates their exemption. "One of ... and" should read "or". Logic: contradiction across sections. Flag for the claims checker.
  rewrite: Every engine write action, the tidy settings save included, gates through the map against one target, the concept id or one of the fixed screens `media`, `nav`, `settings`, or `vocabulary`. The site-wide publish, the tidy action, and the personal-dictionary action are the exceptions, and the Limits subsection below this one states how each reaches the map.
- [advisory] docs/extend/security-model.md:58: "A repeat request inside the one-minute cooldown is the exception, since ..." The words "the exception" point back across a heading, so the subsection's first sentence does not stand on its own. A reader who jumps to the heading meets an exception to nothing.
  rewrite: A repeat request inside the one-minute cooldown returns a distinct `throttled` status, which reveals that the address belongs to an editor.
- [advisory] docs/extend/security-model.md:52: "The most a requester can do to another person's address is replace or rebind its live token." Binding is introduced only in the next section, so "rebind" arrives before the reader knows what it means. This is a missing middle step.
  rewrite: The most a requester can do to another person's address is replace its live token, or rebind it as [browser binding](#browser-binding-for-sign-in) describes.
- [advisory] docs/extend/security-model.md:89-92: "The [reference entry for the no-pending-request error] states which error a failed confirm reports" sits between the paragraph on unbound rows and the paragraph on the forwarded-token risk. It is a pointer, not a limit, so it splits the Limits argument in two.
  rewrite: Move the sentence to the end of the Browser binding section body, before the Limits heading, unchanged.
- [advisory] docs/extend/security-model.md:34-38: The first sentence ("reaches only a roster address, lives 10 minutes, and sits in the store as a hash") is a summary, and the next three sentences explain it again: SHA-256 storage, "Only an address in the `editor` table is sent a token". The register tell is restatement. Of the roster sentence, only the owner-curated screen is new.
  rewrite: Replace "Only an address in the `editor` table is sent a token, and the owner curates that table through the owner-only `editors` screen." with "The owner curates the roster, the `editor` table, through the owner-only `editors` screen."
- [advisory] docs/extend/security-model.md:192-194: "The 303 redirect to `/admin/login` carries none of them, since the guard throws it before `resolve` runs." This claims more than the subordinated fact f:t976f1, which says only that the redirect carries no Strict-Transport-Security. Flag it for the claims checker before it ships.
  rewrite: If the code confirms only the Strict-Transport-Security half: "A rejection page and the 303 redirect to `/admin/login` carry no `Strict-Transport-Security`, for the reason the [guard's reference entry](../reference/sveltekit.md#createauthguard) gives."
- [advisory] docs/extend/security-model.md:250-252: The earlier draft named both `createSectionAction` and the `access` option of `createAdminAction` as users of the fail-closed check. The rework names only `createAdminAction`. If `createSectionAction` still uses that check, the page now understates what fails closed. Flag for the claims checker.
  rewrite: If confirmed: "A site's action built with `createSectionAction`, or one that opts into the map through the `access` option of [`createAdminAction`](../reference/sveltekit.md#createadminaction), fails closed instead, at the following three ordered gates:"
- [advisory] docs/extend/security-model.md:392-396: "..., which avoids the low-end bias that a naive modulo introduces, and [NIST's digital identity guidelines] require the secrets behind authenticators to come from an approved random bit generator." The "and" joins two unrelated claims: avoiding modulo bias, and where the random source comes from. The sentence never says which cairn mechanism satisfies the NIST requirement. This is a non-sequitur hinge.
  rewrite: A numeric confirmation code is drawn by rejection sampling over Web Crypto random bytes, which avoids the low-end bias that a naive modulo introduces. [NIST's digital identity guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html) require the secrets behind authenticators to come from an approved random bit generator.
- [advisory] docs/extend/security-model.md:26: `createAuthGuard` first appears here, in the definition paragraph, without a link. Its reference link comes at line 126. Link it at first mention.
  rewrite: That hand-off is the `identity` option on [`createAuthGuard`](../reference/sveltekit.md#createauthguard), which reads the proof of identity an external gate supplies in place of cairn's session resolution.
- [advisory] docs/extend/security-model.md:233-237: The last sentence of the dev-backend Limits subsection names an engine-repo file (`scripts/checks/dev-fold-markers.txt`) that a site reviewer cannot use. The plan's version stops at "a `wrangler deploy --dry-run` marker scan, for itself alone". This is depth beyond the reader's decision.
  rewrite: The engine's CI closes the bundle case for the example site alone, with a `wrangler deploy --dry-run` of a default build that fails if any dev-only marker survives in the output.

## fact read: accept
Accept. I graded the scoped rework diff of docs/extend/security-model.md: 230 lines added and 273 removed, uncommitted in the draft-docs-2a worktree, so the rework did change the page. The page is graded against the plan at docs/internal/briefs/extend/security-model.plan.md and the brief at docs/internal/briefs/extend/security-model.json.

- **Facts traced:** I traced all 174 cited sentences in the brief (29 are no-claim) against their facts. I retraced the load-bearing facts to source and found no drift. Checked: the token, session and cooldown constants in crypto.ts; the guard.refused reasons in guard.ts:199-292; the admin headers in admin-response.ts:35-46; the nonce SQL in store.ts:141 and :182; the pending-cookie maxAge; the 55-minute token cache; the tidy and dictionary concept gates; publishAll's canReach filter; and the config.access_unmapped warning.
- **Widened fact:** this chain's widening of f:ubuj1w (rejection pages omit Strict-Transport-Security; the 303 redirect carries no headers) matches guard.ts:355 and :370-371 and admin-response.ts:67.
- **Outline coverage:** every one of the 86 outline ids is either cited in the brief or listed in its 17 cuts, and none is both. Every inventory claim marked "carried" appears in the section the plan places it in. All 13 plan sections are present, in plan order.
- **Retired pages:** the facts from the two retired pages that this page does not carry (f:1rstld, f:cf1avu, f:gubeex, f:nz890r, f:xothz1, f:dwc2bu) are routed by the outline to other pages, so no topic of theirs was dropped.
- **Option map:** no row in docs/internal/option-map.json reads "pending security-model".
- **Gates:** check:provenance, check:facts, check:options and check:docs (links and anchors) all pass.
- **Friction:** the f:9pmipf entry is already in docs/internal/docs-friction-log.md (line 374), so I filed no new entry.

The three findings above are non-blocking: one indirect citation, the per-section hand-offs the plan asks for but the page omits, and two no-claim sentences worded differently from the plan.
- [advisory] docs/extend/security-model.md:325-326 (brief sentence 139): 'Every save and publish commits through the site's GitHub App' cites only f:gglwt4. That fact states the Contents permission's repository-wide reach. It names the save and lifecycle paths only through its source comment (repo.ts:265-268). f:kkp5bi covers publishing only. The claim holds against the source, but the citation supports it only indirectly.
  rewrite: Cite ['f:gglwt4', 'f:kkp5bi'] on brief sentence 139.
- [advisory] docs/extend/security-model.md, sections 1-11 (plan 'Hand-off' lines): For each section the plan specifies a hand-off turn, such as 'A token that exists can still be spent by a browser other than the one that asked for it, which the next section closes.' The page has none: every section ends on its Limits subsection. This loses no claim and no fact, so the fact read does not block on it. It is a plan departure for the structural seat to grade.
- [advisory] docs/extend/security-model.md:408 and :455: The 'In short' verdict on the page reads 'cairn defends the sign-in path and every admin request', where the plan has 'keeps an editor's sign-in hard to take and confines what a taken session reaches'. The Migration notes link names only the access-map warning, while the plan names the sanitize floor as well. Both are no-claim anatomy sentences and nothing is wrong in fact, so neither blocks.
````

### add-cairn-to-a-sveltekit-app

Status: escalate (second fix verdict or red gate). Page: `docs/extend/add-cairn-to-a-sveltekit-app.md`. Brief: `docs/internal/briefs/extend/add-cairn-to-a-sveltekit-app.json`. Plan: `docs/internal/briefs/extend/add-cairn-to-a-sveltekit-app.plan.md`.
Rework: True. Rounds drafted: 2. crossRegression: True.

#### Plan step

Plan revised after the first read: True.

Plan read 1 (structural edit): verdict fix, blocking 1.

````text
I read the page plan at the plan level, against the outline entry, the seven crossLinks, the register's tutorial and tutorial-milestone anatomies, Red Hat Block 1 and Google Block 2. I did not read the page or run Vale: no prose exists yet, the plan sits outside Vale's globs, and this seat only reports findings.

Verdict: fix, for one blocking finding. Milestone 4 says it "starts from the content site, pushed to a GitHub repository" (:460-461), but no earlier milestone creates or pushes that repository. Milestone 3's "commit `src/content`" (:399) also assumes git already exists. Three later steps depend on that repository: granting the App access (:489-500), confirming the commit on `main`, and `git pull` (:575). The fix is a repository-and-push step where that state is first needed.

Everything else holds:
- **Order:** each of the seven departures from the outline's cover order gives a reason tied to when the reader needs the information. The site config and adapter move ahead to milestone 2, the dev backend sits inside milestone 2, and the branded-500 check opens milestone 4.
- **User goal:** clear and matches the job.
- **Introduction:** it carries Google's three parts and the anatomy's overview items, including "what the reader can do by the end".
- **Module types:** not mixed. The page follows the tutorial anatomy with a summary and next steps, and the customize section closes after the milestones as the outline asks.
- **Troubleshooting:** every milestone has a verify step with ordered failure checks, plus resolve-failure sections in milestones 3 and 4.
- **Cross-links:** all seven crossLinks are placed.

Two findings are non-blocking:
- The intro's out-of-scope list leaves out the retired doctor and the `/components` subpath. That is deliberate and defensible, but the decision is not recorded against the outline.
- Milestone 4 is heavy compared with the others.
````

Plan read 2 (structural edit): verdict accept, blocking 0.

````text
I graded the plan at the structural level only; no page prose exists yet. Verdict: accept. No Block 1 or Block 2 item fails, and I found five advisories but no blocking finding.

What holds up:
- **User goal:** clear, and it covers both the empty `sv create` path and an existing app, which skips the project, git and push steps and uses `svelte.config.js`.
- **Order:** the eight departures from the outline's order each give a reason tied to a dependency, for example the admin needs the runtime, which needs the adapter and the site config.
- **Pace:** every milestone ends with a live check, troubleshooting sits after each check, and the git repository runs under the milestones so that milestone 4 starts from a state milestone 3 produced.
- **Introduction:** it has all three of Google's parts:
  - what the page covers, including the end state, which the tutorial anatomy also asks for;
  - the prior knowledge it assumes;
  - what it does not cover, with each item linked to the page that owns it.
- **Outline covers:** all are placed, both checks in milestone 4 are present, and all seven cross-links from extend.json appear.

Advisories:
1. The milestone 3 push comes after its verify and troubleshooting sections.
2. The introduction's milestone 3 line leaves out the push.
3. Two out-of-scope items are left off the does-not-cover list on purpose, with the reason recorded.
4. The optional closing how-to sits before the summary.
5. The key-rotation link should also appear in the key section.

I did not run Vale: the plan is an internal doc that the Vale config excludes, and this seat does not edit.

Plan: /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/internal/briefs/extend/add-cairn-to-a-sveltekit-app.plan.md
````

Plan `couldNotDo`:

- Subordinating f:gffvfd: docs/reference/auth-store.md does not state which of the five migration files run a CREATE TABLE or which tables each creates (re-verified this run: its headings cover normalized emails, owner-count guards, the roster functions, and types, and the page names no migration). The fact stays subordinated, not kept on the page; the reference-arm gap is filed in docs/internal/docs-friction-log.md (the extender entry found by the add-cairn page plan on 2026-10-03, naming f:gffvfd, f:hft8s8, f:rn62i1, f:pkrwom).

Plan `frictionFiled`:

- extender: the five shipped migrations and which a site applies have no reference page (f:gffvfd, f:hft8s8, f:rn62i1, f:pkrwom); filed 2026-10-03 by the page plan for docs/extend/add-cairn-to-a-sveltekit-app.md
- **`extender`.** Found by the add-cairn page plan on 2026-10-03 (`f:gffvfd`, `f:hft8s8`, `f:rn62i1`, `f:pkrwom`): the five shipped migrations and which a site applies have no reference page; filed by the first plan run, verified present at docs/internal/docs-friction-log.md:359 this run. No new entry this revision: the repository step is no-claim git and GitHub procedure with no hedge, caveat, or seam disagreement to record.

#### Rounds

Round 1: gate pass; index link: present docs/extend/README.md: ./add-cairn-to-a-sveltekit-app.md under "Start".
Reads: structural edit accept (blocking 0); register editor fix (blocking 2); fact read accept (blocking 0).

Round 1 drafter `couldNotDo`:

- f:gffvfd is subordinated by the plan to docs/reference/auth-store.md, but that page does not state the migration-to-table detail yet, so the page links nowhere for it. The plan step already logged this gap in the friction log (2026-10-03 entry naming f:gffvfd, f:hft8s8, f:rn62i1, f:pkrwom), so I added no new entry. The cut is in the brief with the plan's reason, word for word.
- Each exercise answer sits under a '#### Show me the steps' heading, not a collapsed <details> block. The plan's drafting constraint calls for this because check:provenance cannot read <details>/<summary>, and that defect is already in the friction log.
- Plan departure: the plan said the App registration would take ten steps; it takes eleven. I split the form's installable-by choice (f:rp65d2) and 'create the App' into two steps so that each step holds one action.
- Wording changes from the plan, to follow the register's tells (the brief outranks the plan's phrasing): 'Install the engine and let Vite compile it' opens without the setup-colon triad the plan's sentence had. The 'grant nothing / grants everything' pair in 'Give the adapter the identity and the Worker the key' is now two separate claims (f:zcwf5i, f:7dtrwy), which removes the balanced-halves construction. The 'Push the site to GitHub' section now opens on the App rather than on a lowercase 'cairn'.
- Advisory: tellgrader found 0 tells. Its docs-register measures report a hinged_pair_share of 0.55 ('X, and Y' sentences), which a register read may want to look at. Vale reports 0 errors; its remaining warnings are all on sanctioned words ('admin', the `cairn` CLI, 'Email Sending', and 'the package' used for tarball and install facts).

Round 1 drafter `frictionFiled`:

- (none)

Round 2: gate pass; index link: present docs/extend/README.md: ./add-cairn-to-a-sveltekit-app.md under "Start".
Reads: structural edit accept (blocking 0); register editor fix (blocking 4); fact read fix (blocking 1).

Round 2 drafter `couldNotDo`:

- Did not take the structural edit's advisory to add 'which needs a Go toolchain' to the cairn CLI install sentence. f:1dhk1a names go install and the release archive but says nothing about a Go toolchain, so the clause would have no fact behind it. If the page should carry it, the conductor needs to add a fact for it.
- Did not take two of the register editor's advisories that the plan explicitly keeps. One cuts the sentence saying Tailwind and daisyUI are optional peers (f:26kuvx, in Verify the rendered entry). The other cuts the 0001_roles and 0003_preview sentence (f:rn62i1, in Create the auth database). Both stay where the plan places them. Only the 0002_audit sentence was reworded, to the fact's 'recommended' framing.
- Left the '#### Show me the steps' headings and the reader-voice 'I can' checklist items as they are. The register editor reported both as tensions inside the register that need Geoff's ruling, not as page defects. The heading is the fallback already recorded in the friction log because check:provenance rejects <details>.

Round 2 drafter `frictionFiled`:

- (none)

#### Escalation findings (final, in full)

````text
## structural edit: accept
Verdict: accept, with six advisories and no blocking findings. I graded docs/extend/add-cairn-to-a-sveltekit-app.md at the structural level against its plan (docs/internal/briefs/extend/add-cairn-to-a-sveltekit-app.plan.md), the outline entry, the tutorial and tutorial-milestone anatomies in docs/internal/docs-register.md, the Red Hat Structure Checklist, and Google's large-docs checks.

`npm run check:vale` reports 0 errors across 1186 files.

**Introduction.** It has all of Google's three parts:
- **Covers:** :3-16, Geoff's verbatim paragraphs plus the numbered milestone list and the closing-section line.
- **Prior knowledge:** :7.
- **Doesn't cover:** :18-23, four items with their pages linked.
- **Other out-of-scope items:** the setup command and the scaffolded tree are handled at :3. The retired JavaScript doctor and the removed `/components` subpath are left off by absence, as the plan records.

The introduction matches the body: every milestone it names ends live with the check it promises.

**Order.** The page follows the plan's eight departures:
- The site config and adapter move into milestone 2.
- The dev-backend section sits inside milestone 2, under the slug the old reference links use.
- The branded-500 check opens milestone 4.
- The three-edits map is milestone 4's opening.
- "Customize the sign-in email" is a closing H2 after the production checklist.
- The Paid-plan trigger is stated once.
- Milestone 3's exercise is a second post.
- Git starts at milestone 1, and the push closes milestone 3.

Each milestone has objectives, its start state, steps, a verify section, a "Show me the steps" exercise, and an "I can" checklist. Milestones 3 and 4 also have failure sections.

**Ending and links.** The summary and Next steps follow. All seven crossLinks entries for this page are linked. The two inbound anchors in the repo (#compose-the-runtime-and-the-admin and #customize-the-sign-in-email) both resolve.

**Advisories.**
- The manifest's location is first named in a check at :800, after the commit step that depends on it.
- The Paid-plan failure at milestone 4's first admin deploy has no recognition step.
- Milestone 4's first lead-in runs to three sentences, against the plan's limit of two.
- The intro's self-descriptions at :7 and :18 are third person, though the plan prescribes them.
- The summary describes the site rather than what the reader learned.
- The heading at :892 drifted from the plan's heading.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:690-700: Logical order and location (Red Hat): step 4 commits the manifest with `git add src/content`, which only works because the manifest lands under `src/content`, and that location is never stated. The path `src/content/.cairn/index.json` first appears at :800, in the push section's check, two sections after the step that depends on it. A reader can't confirm that step 3 wrote the file the commit picks up.
  rewrite: In step 3, add one clause after the command: the command writes the manifest to `src/content/.cairn/index.json`, the default the plugin's options reference lists. The :800 check then confirms a path the reader has already seen.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:856-870: Troubleshooting and error recognition (Red Hat): this is the first deploy that carries the admin, so the Workers Paid plan first applies here. Only Before you begin (:27) says so. A reader still on the free tier gets a deploy failure here with no recognition step, and the page's two failure lists don't cover it.
  rewrite: Add one clause to the section's lead-in or to step 1: this deploy carries the admin, so it needs the Workers Paid plan from Before you begin. Alternatively, add a bullet for this case to Resolve a production failure.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:858: Pacing, measured against the plan's drafting constraint: every milestone 4 section opens with a lead-in of one or two sentences. This lead-in runs to three sentences, and its third sentence (the four env names and the `config.bindings-missing` throw) restates detail the opening map and the failure section already carry.
  rewrite: Cut the third sentence, or fold its `config.bindings-missing` clause into the second, so the lead-in stays at two sentences.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:7, :18: Module type used correctly (the register's anatomies): the tutorial overview is to be written in second person and to state its subject without describing the page itself. Lines :7 ('The tutorial serves a web developer...') and :18 ('The tutorial leaves the following topics to other pages') describe the page in third person. The plan prescribes both lines, and Geoff's verbatim :3 also says 'This tutorial', so the finding is not blocking.
  rewrite: :7 -> 'You build with SvelteKit and TypeScript and work in a terminal; an app you already have follows the same milestones and skips the steps that create the project.' :18 -> 'Other pages cover the following topics:'
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:1195-1197: Ending anatomy: the tutorial summary should say what the reader learned. This section describes the finished site's properties instead (what the engine does, what every build compares) and states no reader capability. It meets the plan's content list and uses different words from the objectives, so the finding is advisory. The plan also named the heading `## What you built`, and the page uses `## The finished site`.
  rewrite: Recast one or two sentences toward the reader, for example 'You wired the engine by hand...' and 'You registered a GitHub App...', and keep the plan's heading or record the rename in the plan.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:892: Plan conformance: the plan's heading is 'Give the adapter the identity and the Worker the key', and the page uses 'Store the App's credentials'. No inbound anchor targets either slug (the only inbound anchors are #compose-the-runtime-and-the-admin and #customize-the-sign-in-email, and both resolve), so nothing breaks. The plan and the page now disagree.
  rewrite: Keep the page's shorter heading and update the plan's section entry to match, so the next structural read compares like with like.

## register editor: fix
I graded the reworked page at docs/extend/add-cairn-to-a-sveltekit-app.md in the draft-docs-2a worktree as a tutorial (Google base, developer brief). The rework rewrote the whole page (716 lines added, 695 removed), so every sentence counted as changed.

At the page level the rework holds:
- Geoff's two introduction paragraphs land verbatim.
- The milestone order follows the plan's argument: deploy, then admin on the dev backend, then content, then production.
- Milestone 2 now ends with a verified dev sign-in.
- "Customize the sign-in email" is an H2 after milestone 4's checklist.
- A summary and Next steps close the page.
- Each milestone has objectives, a starting state, steps, a check, a "Show me the steps" exercise, and an "I can" checklist.

**Deterministic floor.**
- Vale: 0 errors, 47 warnings, 12 suggestions. The warnings are false positives:
  - "admin" to "administrator": admin is a register product term.
  - "Email" case: Cloudflare's product name.
  - Headings at :892 and :967: proper nouns.
  - Contractions: the register's measured tone overrides them.
  - The one real hit is Cairn.NamesRetired at :442.
- tellgrader: no findings.

**Measures** (docs-register profile).

| Measure | Value |
|---|---|
| sentences | 304 |
| hinged_pair_share | 0.549 |
| short_sentence_share | 0.184 |
| Average prose sentence length (my estimate) | about 20 to 22 words |
| Longest sentence | :854, about 46 words |
| Prose paragraphs (approximate) | about 95 |
| Disproportionate paragraphs | :199 (six sentences before the first step), :445, :447 |

**Blocking findings.**
1. Before you begin splits parallel prerequisites across an inline series, a list, and a detached paragraph. This breaks the base guide's list rule and the plan's shape.
2. :920 says a multi-line base64 encoding "does not parse." The facts container's own rejection record (f:w78j1b, a workerd run) says `atob()` ignores whitespace, so the claim looks false.
3. :890 frames the App's repository-wide write reach as a risk of someone else's setup. The tutorial's own `field-notes` repository holds the site's code, so the reader's setup is that case.
4. The repository name `field-notes` is not in code font where the reader types it.

The rest are non-blocking: logic fixes (the "three edits" map, "one setting", a commit step that sweeps in milestones 1 and 2, a non-sequitur), an ambiguous antecedent, one Names fix, two plan/page heading mismatches, and depth notes the plan already keeps. I found no balanced-halves or marketing slips.

**Verdict.** The page reads as a careful developer's tutorial in the register's voice. The single change that would help most is fixing the :890 caution so it tells the reader the truth about their own repository, together with pulling the :920 `atob()` claim until the claims checker rules on it.
- [BLOCKING] docs/extend/add-cairn-to-a-sveltekit-app.md:27-39 (Before you begin): Base guide, brief checklist item 'Parallel items that need no order form a bulleted list'. The prerequisites are split four ways. Four items sit in an inline series ("You need Node 24 or later, a GitHub account, a Cloudflare account, and, from the first deploy that carries the admin, Cloudflare's Workers Paid plan."), three more sit in a bulleted list, and the Paid-plan explanation ("The first milestone's bare deploy runs on the free tier. The Workers Paid plan also covers...") is detached below the install block. The plan's Shape line asks for 'a bulleted list, one item per item above'. A reader scanning for what to have on hand gets three partial lists.
  rewrite: You need the following:

- Node 24 or later.
- A GitHub account.
- A Cloudflare account. The first milestone's bare deploy runs on the free tier.
- Cloudflare's Workers Paid plan, from the first deploy that carries the admin. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) states its current terms.
- TypeScript on major version 6, which `npx sv create` already pins, since `svelte-check` cannot run on TypeScript 7 yet.
- A domain whose zone is on your Cloudflare account, since a `workers.dev` subdomain has no zone to onboard for sign-in mail.
- The `cairn` CLI, a separate Go module installed once per machine, which runs [`cairn doctor`](../reference/cli-cairn-doctor.md) in the production milestone.

The Paid plan also covers sign-in mail to a second person. To install the `cairn` CLI, run the following `go install` command, or download a release archive instead:
- [BLOCKING] docs/extend/add-cairn-to-a-sveltekit-app.md:920: Factual claim the facts container itself rejects, to be passed to the claims checker. "The engine decodes the secret with `atob()` before signing, so a multi-line encoding does not parse." docs/internal/facts/extend.md:620 (f:w78j1b) records a workerd run from 2026-09-29: `atob()` ignores ASCII whitespace, and a two-line value decoded to the same bytes as one line. Under that record, f:vpieos (:115, which the plan cites) is stale, and the sentence gives the reader a false reason for the `tr -d '\n'`. The facts conflict also belongs in the friction log.
  rewrite: The engine documents the secret as the PEM base64-encoded onto one line, and the `tr -d '\n'` produces that form. (Cut the causal clause until the claims checker resolves f:vpieos against f:w78j1b.)
- [BLOCKING] docs/extend/add-cairn-to-a-sveltekit-app.md:890: Presupposition-level falsity. "Installing the App on a repository that also holds code or other teams' content puts that content inside the token's write reach" frames the hazard as someone else's arrangement. The field-notes repository this tutorial builds holds the site's code: `src/lib`, the routes, `hooks.server.ts`, and `vite.config.ts`. The reader's own setup is therefore the case the sentence describes, and the reader comes away believing the tutorial avoided it.
  rewrite: The **Contents** permission is repository-wide, and only engine code confines writes to the declared content directories, so the App's token can also write the site's code in `field-notes`. The [security model](security-model.md) sets out the reasoning.
- [BLOCKING] docs/extend/add-cairn-to-a-sveltekit-app.md:792, 882, 887, 1055: Base guide, brief checklist item 'code identifiers, file names, and paths sit in code font'. The repository name the reader types into GitHub's form appears in plain text: "create an empty repository named field-notes", "the account that owns the field-notes repository", "access to the field-notes repository only", and "on `main` of the field-notes repository". The plan fixes the name as `field-notes`, and the remote URL and `wrangler.jsonc` already set it in code.
  rewrite: On GitHub, create an empty repository named `field-notes` with no starter files, following [Creating a new repository](...). Apply the same code font at :882, :887, and :1055.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:138, 938, 959, 1041, 1062, 1183: Brief checklist item 'A step names where the action happens before it names the action'. These steps open on the bare verb ("Build the site and upload the Worker:", "Copy the two migrations every site applies...", "Apply the migrations to the remote database:", "Build the site and deploy it:") while neighbouring steps name the project directory. This finding is advisory, since the location carries over from the step before, but the page is inconsistent with itself.
  rewrite: In the project directory, build the site and upload the Worker:  (and the same 'In the project directory,' prefix on each listed step)
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:848-854: Logic: overstated universal and a broken map. "Moving a dev-backend site to production takes three edits" is followed by "The App yields the App ID, the Installation ID, and the private key, ... so each section of this milestone makes its part of these edits once the value it needs exists." The private key feeds a Worker secret, which is none of the three edits. The milestone also creates a database, applies migrations, and onboards a domain. The second sentence runs about 46 words, the longest on the page, and chains three claims.
  rewrite: Moving a dev-backend site to production edits three files, and it also sets one Worker secret:

- The adapter's `backend` and `email` take real values.
- `wrangler.jsonc` gains the `EMAIL`, `AUTH_DB`, and `PUBLIC_ORIGIN` entries.
- The content module's `origin` names the deployed origin.

The hooks module needs no edit, because `__CAIRN_DEV_BUILD__` is `false` in a build and the build drops the dev-backend import. Each section makes its edit once the value it needs exists: the App yields its two IDs and the private key, and the database's create output yields the id for `AUTH_DB`.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:1076: Overstated universal contradicted inside the same list. "Each failed production check points at one setting that this milestone made:" is followed by a last bullet that points at two settings ("an App without Contents ... or at one not installed"). Two items are not checks at all: an email that never arrives, and a failed publish.
  rewrite: Each of the following failures points at a setting this milestone made:
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:1033: Misdescribed step. "Commit this milestone's edits and push the main branch" runs `git add .`, which also commits every engine file from milestones 1 and 2. Milestone 3 committed only `src/content`, so `wrangler.jsonc`, `vite.config.ts`, `src/lib/*`, `src/hooks.server.ts`, and the admin routes reach the repository here for the first time.
  rewrite: Commit every uncommitted file and push the main branch, so the pull after the publish is a fast-forward:
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:928: Incomplete claim that conflicts with :336. "The engine keeps its sign-in tokens and sessions in the D1 database bound as `AUTH_DB`" leaves out the editor table, which the page itself says `bootstrapOwner` writes to ("the engine inserts the owner row"). The plan's sentence reads 'editors, tokens, and sessions'.
  rewrite: The engine keeps its editors, sign-in tokens, and sessions in the D1 database bound as `AUTH_DB`, and every site applies two of the five migrations the package ships.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:614: Missing middle step (non-sequitur). In "Vite needs each glob's literal pattern at its call site, so `createSiteIndexes` throws at build time for a declared concept with no glob", Vite's need for literal patterns explains why the site must pass the globs. It does not explain why the engine throws when one is missing.
  rewrite: Vite needs each glob's literal pattern at its call site, so the engine cannot glob a concept's directory itself, and `createSiteIndexes` throws at build time for a declared concept the site passed no glob for.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:445: Tacked-on clause with no relation to its sentence's claim (list cadence in prose). "It imports `devBackendHandle` dynamically, so a default build never carries it, and a bare `createAuthGuard()` call is valid."
  rewrite: It imports `devBackendHandle` dynamically, so a default build never carries it. The `else` branch calls `createAuthGuard()` with no options, which the guard accepts.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:969: Ambiguous antecedent. In "A `workers.dev` subdomain has no zone to onboard for Email Sending, so the production site runs on that domain.", the nearest noun to "that domain" is the `workers.dev` subdomain, the opposite of what is meant. Product naming is also inconsistent: the page says "Email Sending" but links Cloudflare's "Email Service" page, so the reader should get one confirmed product name.
  rewrite: A `workers.dev` subdomain has no zone to onboard for Email Sending, so the production site runs on the domain you control.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:1153: Logic. In "The text of anything the sender throws reaches the log scrubbed of token values and truncated, so a thrown message must never embed the message body or the sign-in link.", the 'so' runs backward: scrubbing is a safeguard, and it gives no reason for the prohibition. The `MagicLinkMessage` member catalogue in the same paragraph is also reference detail that the plan's 'subordinate with a named link' test would move to `docs/reference/sveltekit.md`.
  rewrite: The engine scrubs token values from the text of anything the sender throws and truncates it before logging, and that scrub covers only token values, so a thrown message never embeds the message body or the sign-in link.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:442: Names (Cairn.NamesRetired warning, confirmed). In "The package installs as a `devDependency`.", "the package" sits in a paragraph about `@glw907/cairn-cms-dev`, while :199 and :928 use "the package" for `@glw907/cairn-cms`. The reader cannot tell which artifact is meant.
  rewrite: `@glw907/cairn-cms-dev` installs as a `devDependency`.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:7: Personification, and a sentence that states an action without an actor. "An app you already have follows the same milestones and skips the steps that create the project." An app does not follow milestones. The skipped steps also include `git init` and the GitHub push, which :72 and :788 call out separately.
  rewrite: An existing app takes the same milestones, without the steps that create the project, start its repository, or push it to GitHub.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:892 and :1195 (headings): Page departs from its committed plan in two headings, and the plan records no reason. The plan names `### Give the adapter the identity and the Worker the key` and `## What you built`; the page has "Store the App's credentials" and "The finished site". The page's headings are the better register: the plan's first is a balanced-halves heading. The plan should still be updated so the two agree. Vale's Google.Headings alert on :892 is a false positive on the proper noun 'App'.
  rewrite: Keep the page's headings and amend the plan's two Heading lines to match.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:1048: Echo in a procedure lead-in: "To publish an edit and follow it to the deployed page, follow these steps:"
  rewrite: To publish an edit and confirm it on the deployed page, complete the following steps:
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:199, 707, 774, 965: Depth against the dispatch's 'keep the core path light'. The plan keeps each of the following, so none is a cut demand, but each is optional detail inside a milestone that a reference entry already holds:
- :199, the `App.Platform` clause in a six-sentence paragraph ahead of the first step.
- :707, the `CairnHead` clause for a prop the page never passes.
- :774, the Tailwind and daisyUI peer sentence.
- :965, the `0002_audit.sql` separate-binding sentence.
The :199 paragraph is the densest on the page.
  rewrite: :199, drop "A custom route that reads `event.platform.env` needs `App.Platform` declared separately." (the ambient reference link already covers it). :707, end the paragraph's second sentence at "renders only `html`" and leave `CairnHead` to Build the public routes. Raise both with the plan step before cutting.
- [advisory] docs/extend/add-cairn-to-a-sveltekit-app.md:39, 33 (links): Linking. "download a release archive instead" names a source with no link, and the reader cannot find the archive. The [security model](security-model.md) is linked three times (:22, :447, :890), which is acceptable once per milestone, but :447's "The security model sets out the CSRF design." repeats the introduction's cover line word for word.
  rewrite: Link the release archive to the repository's releases page if the claims checker confirms it exists. Cut :447's last sentence, since the introduction already routes CSRF design to the security model.

## fact read: fix
The scoped read found one blocking finding, so the verdict is fix. `git diff` shows the rework rewrote the page throughout (716 insertions, 695 deletions), so every sentence was graded.

**Traced**
- All 353 brief sentences match the page verbatim.
- 72 distinct fact ids are cited, and every claim was checked against its cited fact. About 20 load-bearing facts were also retraced to source and still match: the email copy, the "Wrangler bindings are missing" title and guard order, the five migrations, the default permalink and datePrefix, the createSiteIndexes throw, the manifest fallback, the peer deps, the five App.Locals fields, the MagicLinkMessage and SendMagicLink shapes, the branding default, bootstrapOwner/insertOwnerIfEmpty, the omitted committer, atob, and the nonce error.

**Coverage**
- Every outline id is either cited or cut with a reason in the brief: f:gffvfd, f:pg2smj, f:xyizai, f:fekvhi, f:dzmj90, plus f:tkpmxr. No cut id is cited.
- Every inventory claim marked "carried" appears on the page, including f:u705t5, f:vrue1g, f:1dhk1a and f:txgoyy.
- Geoff's introduction landed exactly as written in the job-read record. 'Customize the sign-in email' is a closing section after the milestones.
- Of the retired build-a-site-by-hand.md section, the only facts neither cited nor cut are the seven tagged [rejected], so no topic was dropped.
- docs/internal/option-map.json has no row pending add-cairn-to-a-sveltekit-app.
- check:facts and docs-gate (including check:options) pass.

**Blocking finding**
- At docs/extend/add-cairn-to-a-sveltekit-app.md:493, the step "In `src/app.d.ts`, declare the define as a global boolean:" cites only f:vvgpr5, which says nothing about that declaration.
- The fix is in the brief only: cite f:n52h8f and f:72mctx on that sentence. The page wording can stay.

**Fact fixed in place**
- f:em69ru in docs/internal/facts/extend.md overstated the doctor's site-config check as reading only src/theme/site.config.yaml.
- I corrected it to the four paths the check tries, per tool/internal/doctor/siteconfig.go:43-50, and check:facts is green after the edit. No retag or option-map change was needed.
- The page's src/lib/site.config.yaml stays correct: the doctor finds it there, and it matches the engine's default fallback.

No new friction entry. The disagreement over the default site-config path is already covered by the existing friction-log entry on the site-config path (DAD-1, f:shv6wv).
- [BLOCKING] docs/extend/add-cairn-to-a-sveltekit-app.md:493 ("Wire the dev backend and the CSRF handoff", step 3); brief docs/internal/briefs/extend/add-cairn-to-a-sveltekit-app.json:601: The step "In `src/app.d.ts`, declare the define as a global boolean:" cites only f:vvgpr5. That fact covers the ambient import, the five App.Locals fields, and App.Platform. It says nothing about declaring `__CAIRN_DEV_BUILD__`, so the claim has no backing fact. f:n52h8f (verified, templates/waymark/src/app.d.ts) states that the scaffold's app.d.ts declares the `__CAIRN_DEV_BUILD__` boolean global.
  rewrite: Keep the sentence as written. In the brief, change its id to ["f:n52h8f", "f:72mctx"].
- [advisory] docs/internal/facts/extend.md:265 (f:em69ru): Fact retraced and fixed in place, not retagged. It said the doctor's site-config check places the file at src/theme/site.config.yaml. tool/internal/doctor/siteconfig.go:43-50 actually tries four paths: src/theme/site.config.yaml, site.config.yaml, src/lib/site.config.yaml, and src/site.config.yaml. The fact now states that and cites siteconfig.go. The page's src/lib/site.config.yaml is consistent: the doctor's check finds it, and it matches the engine's DEFAULT_SITE_CONFIG_PATH fallback. check:facts is green after the edit. No option-map rows were touched.
````

### theme-your-public-site

Status: escalate (second fix verdict on the plan read). Page: `docs/extend/theme-your-public-site.md`. Brief: `docs/internal/briefs/extend/theme-your-public-site.json`. Plan: `docs/internal/briefs/extend/theme-your-public-site.plan.md`.
Rework: True. Rounds drafted: 0. crossRegression: not reported (no drafting).

#### Plan step

Plan revised after the first read: True.

Plan read 1 (structural edit): verdict fix, blocking 1.

````text
Verdict: fix, with one blocking finding.

The plan for docs/extend/theme-your-public-site.md handles most of the structure well:
- The introduction meets the anatomy. The contract sentence comes first, then Google's three parts, and all six out-of-scope pages are named.
- Both outline cross-links (scaffolded-site-files and run-cairn-audit-on-your-site) appear in See also.
- The section order is argued from what the reader needs first: the hand-built on-ramp early, then the boundary and tiers, the local loop, re-skin, port, rendered markdown, preview, verify, resolve, and See also.
- Troubleshooting is present and points at debug-your-site.

The blocking issue is in Style the editor preview (plan:412-433). The scaffold already ships `editor.preview` (templates/waymark/src/theme/cairn.config.ts:227). Even so, the plan gives every reader setup steps under a first sentence that is pure exposition. No lead-in says that a re-skin does nothing here, that a port acts when its sheets or wrapper classes change, and that a hand-built site adds the setting. This fails "Tasks reflect the intended goal" and the anatomy's task-tie rule, the same defect the plan fixed in Style rendered markdown.

The other four findings don't block:
- Chassis conventions sit after port step 10, although step 6 needs them.
- The hand-built hand-off omits sections that apply to that reader: Resolve an audit finding and parts of Iterate locally. It also gives a mixed signal about Rebrand the status colors.
- The introduction's routing skips Before you begin.
- The chassis boundary and token tiers sections carry some rationale and key inventory that belongs in reference and slows the path to the first edit.

I ran no Vale check: the plan sits under docs/internal, which Vale's config excludes, and this seat doesn't edit.
````

Plan read 2 (structural edit): verdict fix, blocking 1.

````text
I graded the plan at the structural level only and did not read the page. Verdict: fix, with one blocking finding.

**Blocking:** in the port recipe, step 10 (line 386) sends the reader straight to Verify the theme. That skips Style rendered markdown and Style the editor preview, and both still hold port work: the directive classes, the flourish choice, and the update to editor.preview. A port that renamed or added a compiled style sheet then fails Verify check 3, the preview-renders-in-theme check. The plan proved the re-skin's jump to Verify is safe but never checked the port's.

**Advisory:**
- The introduction's in-order list leaves out the chassis boundary and the token tiers.
- The flourish option is offered only to a port, though a re-skin could take the same step.

**Checks that passed:**
- The introduction has all three of Google's parts and names all six out-of-scope pages.
- Before you begin routes both readers correctly.
- The plan argues for every place it departs from the outline's covers order.
- Both outline cross-links (scaffolded-site-files and run-cairn-audit-on-your-site) are in See also.
- Failure paths point to docs/extend/debug-your-site.md.
- Module types match the task-guide anatomy.

I did not run check:vale. The plan is an internal doc outside Vale's published-docs globs, and this seat only reviews.

Plan: /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/internal/briefs/extend/theme-your-public-site.plan.md
````

Plan `couldNotDo`:

- f:4xptbu is subordinated to docs/reference/cli-cairn-media-seed.md, whose --from row and What it writes state the fixed /media/ download path but not that the command never reads the adapter's assets.publicBase, so a site whose media route is mounted elsewhere cannot seed; the fact stays subordinated and the gap is the reference-arm friction entry filed in the plan's first run (unchanged by this revision).

Plan `frictionFiled`:

- extender: cli-cairn-media-seed.md states the fixed <base-url>/media/ download path but not that the command never reads assets.publicBase (f:4xptbu); reference-arm hole found at subordination, tool-side finding of 2026-09-30 not refiled
- extender: the editor preview frame's <html> carries no data-theme, so only the OS scheme reaches it while the public site resolves its scheme from the visitor's cookie and data-theme (f:faofr4, f:i9pgd2)
- extender: the $chassis seam is gated by check:chassis-boundary only in the engine repository; a scaffolded site inherits it as a convention with no gate (f:lwrqfd)
- Filed 2026-10-03 by the page plan of docs/extend/theme-your-public-site.md: extender entry on f:4xptbu (the media-seed reference states the fixed /media/ path but not that the command ignores assets.publicBase) -- filed in the first run, already in the log, not refiled
- Filed 2026-10-03 by the page plan of docs/extend/theme-your-public-site.md: extender entry on f:faofr4, f:i9pgd2 (the preview frame's html carries no data-theme, so it follows the OS scheme while the public site follows the cookie) -- filed in the first run, already in the log, not refiled
- Filed 2026-10-03 by the page plan of docs/extend/theme-your-public-site.md: extender entry on f:lwrqfd (the $chassis seam is a convention with no gate in a scaffolded site) -- filed in the first run, already in the log, not refiled

#### Escalation findings (final, in full)

````text
## structural edit: fix
I graded the plan at the structural level only and did not read the page. Verdict: fix, with one blocking finding.

**Blocking:** in the port recipe, step 10 (line 386) sends the reader straight to Verify the theme. That skips Style rendered markdown and Style the editor preview, and both still hold port work: the directive classes, the flourish choice, and the update to editor.preview. A port that renamed or added a compiled style sheet then fails Verify check 3, the preview-renders-in-theme check. The plan proved the re-skin's jump to Verify is safe but never checked the port's.

**Advisory:**
- The introduction's in-order list leaves out the chassis boundary and the token tiers.
- The flourish option is offered only to a port, though a re-skin could take the same step.

**Checks that passed:**
- The introduction has all three of Google's parts and names all six out-of-scope pages.
- Before you begin routes both readers correctly.
- The plan argues for every place it departs from the outline's covers order.
- Both outline cross-links (scaffolded-site-files and run-cairn-audit-on-your-site) are in See also.
- Failure paths point to docs/extend/debug-your-site.md.
- Module types match the task-guide anatomy.

I did not run check:vale. The plan is an internal doc outside Vale's published-docs globs, and this seat only reviews.

Plan: /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/internal/briefs/extend/theme-your-public-site.plan.md
- [BLOCKING] docs/internal/briefs/extend/theme-your-public-site.plan.md:386: Block 1, "Information is presented in the most logical order and location" and "Tasks reflect the intended goal of the user". The port's step 10 is "run the checks in Verify the theme", which sends a port reader past two sections that still hold port work. Style rendered markdown (lines 422-439) holds the port's directive-class edits and the data-flourish choice. Style the editor preview (lines 446-449) is where "a port that adds or renames a compiled style sheet, or changes the classes that wrap an entry, updates the adapter's editor.preview". A port reader who follows step 10 runs Verify check 3 (line 513, the preview renders in the theme's styles) before updating editor.preview. A port that renamed or added a sheet then fails that check, and the procedure gives no path back. The plan proves only the re-skin's jump is safe (line 486, "Re-skin Waymark's step 5 jumps here directly and stays correct"). It never checks the port's step 10 against the two sections in between.
  rewrite: Change port step 10 so the port's own sequence continues through the sections that carry its remaining work. Either drop step 10 and let the reader read on, or word it as "continue with Style rendered markdown and Style the editor preview, then run the checks in Verify the theme". Then restate the Style the editor preview hand-off at line 486 so it covers both recipes: the re-skin skips to Verify, and the port arrives here from step 10.
- [advisory] docs/internal/briefs/extend/theme-your-public-site.plan.md:93-95: Block 2, "Does your introduction provide an accurate overview of the topics you cover?" (advisory). The in-order sentence lists the local loop, the two recipes, rendered markdown, the editor preview, and the verification. It leaves out the two sections a reader meets first after the preconditions, The chassis boundary and Token tiers and cascade order, so the overview does not match the page's real order. The surrounding sentences cover the chassis and the tokens in concept, so this falls short of a failed item.
  rewrite: Add the boundary and the tiers to the head of the in-order list, for example "the chassis boundary and the token tiers, the local loop, the two recipes, ...". The sentence then predicts the section order the reader sees.
- [advisory] docs/internal/briefs/extend/theme-your-public-site.plan.md:422-439: Block 1, "Tasks reflect the intended goal" (advisory). The first sentence of Style rendered markdown offers the flourish choice to a port only ("a port that keeps prose.css ... chooses whether to turn the flourishes on"). The data-flourish attribute goes on the theme's .prose root, which Waymark also has, so a re-skin reader could take the same step. Re-skin step 5 jumps straight to Verify, so that reader never sees the option.
  rewrite: Either state in the lead-in that the flourish step is open to either recipe and have re-skin step 5 mention it, or confirm from the source that Waymark already sets or forbids data-flourish and say so.
````

### architecture

Status: escalate (second fix verdict or red gate). Page: `docs/extend/architecture.md`. Brief: `docs/internal/briefs/extend/architecture.json`. Plan: `docs/internal/briefs/extend/architecture.plan.md`.
Rework: True. Rounds drafted: 2. crossRegression: False.

#### Plan step

Plan revised after the first read: True.

Plan read 1 (structural edit): verdict fix, blocking 2.

````text
Read the plan, the extend.json crossLinks from 'architecture', and the register's concept anatomy. The plan has a clear user goal and a correct concept module type, and its three-part introduction, definition paragraph, and related-resources ending (5/4/5 links) all match the anatomy. All seven outline cross-links land, out-of-scope items are routed to their owning pages, and the departures from the cover order are reasoned. There are two blocking findings. (1) Line 171: the introduction's covers enumeration omits the write path, read path, hard dependencies, and Backend contract, so it is not an accurate overview of the body. (2) Line 348: Concurrent writes comes after Build verification, which breaks the save-publish-deploy spine. Its stated rationale and its hand-off at line 345 also claim it covers only commits on the edit's path, but the head guard covers nav, settings, vocabulary, media upload, and revert commits. There are two non-blocking notes: positional 'next section' hand-offs, and the unstated tie between the Backend contract's expectedHead semantics and Concurrent writes. Vale was not run because the plan sits under docs/internal, which .vale.ini excludes, and this seat does not edit.
````

Plan read 2 (structural edit): verdict accept, blocking 0.

````text
I graded the revised architecture page plan at the structural (developmental) level against Red Hat's Structure Checklist and Google's "Organizing large documents". Verdict: accept, with no blocking findings and four advisory ones.

- **Introduction (Block 2):** All three parts are present. The covers sentence now lists every body subject in page order. The prior-knowledge sentence matches the external resources. Five out-of-scope subjects carry links, and media settings and the migration record are linked from the body sections that need them. The definition follows as the anatomy requires.
- **Order and pace (Block 1):** The order runs surface (entry points, export map, seams), then machine (write path, read path, data tiers), then ground (hard dependencies, Backend contract), then promise (stability tiers). That order follows the job's clauses. Concurrent writes now sits inside the write path between publish and build, the hand-offs are subject turns rather than positional references, and the body ends on a synthesis before the related-resources ending.
- **User goal and cross-links:** The user goal is clear, the page type is a concept page throughout, and troubleshooting does not apply. All seven `crossLinks` entries from architecture land on the page.

The advisories, all non-blocking:
1. **Pace in Entry points:** f:n3cvf9 names extra subpaths and stability tiers before the export map or Stability tiers introduces them, which also blurs the "four subpaths" hand-off.
2. **Seams table column:** the third column's "guide" header mislabels the concept-page and reference destinations in three rows.
3. **Departures list:** it leaves out the Entry points/Export map swap, although line 76 gives the reason for it.
4. **Roles row:** it never states the application-layer role check that the outline's seventh out-of-scope item asks the page to state as it is.

I did not run `npm run check:vale`. This seat never edits, and `docs/internal` is outside Vale's published-arm globs.
````

Plan `couldNotDo`:

- (none)

Plan `frictionFiled`:

- Filed 2026-10-03 by the page plan of `docs/extend/architecture.md` (draft docs stage 2a, task 7c): `extender`, f:70mf58 states a finer edit record than the default branch keeps, since a publish is a fresh copy commit (`src/lib/sveltekit/content-routes-entry-write.ts:350-378`) and the holding branch is deleted after it lands (`:401-405`), leaving one commit per publish and no ref over the save commits

#### Rounds

Round 1: gate pass; index link: present docs/extend/README.md: ./architecture.md under "Start".
Reads: structural edit fix (blocking 1); register editor fix (blocking 3); fact read accept (blocking 0); figure verifier accept (blocking 0).

Round 1 drafter `couldNotDo`:

- I left out one sentence the plan asked for. Section 1 (Entry points) wanted an invariant line saying the admin's components do no I/O of their own. The code does not support that: src/lib/admin/client-action.ts and src/lib/admin/client-ingest.ts call fetch(). The page keeps only what f:40pxcq says, that the components on /admin receive the data the /sveltekit layer loads as props.
- I softened four of the plan's sentences because the facts did not support them as written. (1) Seams hand-off: the plan's 'Every seam feeds the one path an edit takes' overclaims, since navLayout and identity do not feed the edit path. It is now 'Whatever concepts a site declares, an edit to any of their entries takes one path from a save to the live site' (f:cjonmm). (2) Git paragraph: I dropped the plan's 'which is why it sits in git' clause about the media manifest, because f:4t707i does not state that reason. (3) Publish commit: I dropped 'the installation token signs it'. 'Signs' would wrongly suggest commit signing, and f:cjonmm ties the token only to the save. (4) Data tiers hand-off: 'Each tier is a service the engine depends on outright' contradicted the swappable content store. It is now 'Two of the three tiers are Cloudflare bindings, and the content store is the only one a site can replace' (f:hk24xs, f:pgy0mr).
- The figure-verifier agent was not dispatched because this seat has no agent-dispatch tool, so the conductor needs to run it. The mermaid diagram, accTitle, and accDescr are unchanged. The only change is a second caption sentence pointing at Data tiers, which the plan asked for.
- The seams table and the ending link four outlined pages that do not exist yet: configure-rendering.md, restrict-admin-access.md, arrange-the-admin-sidebar.md, and configure-media.md. The link gate accepts them as pending. content-model.md, define-an-adapter-and-schema.md, and scaffolded-site-files.md are also still pending.
- The worktree already had uncommitted edits to other in-flight pages: security-model, add-cairn-to-a-sveltekit-app, their briefs, the friction log, and facts/extend.md. They are other tasks' work and I did not touch them. Nothing was committed.

Round 1 drafter `frictionFiled`:

- (none)

Round 2: gate pass; index link: present docs/extend/README.md: ./architecture.md under "Start".
Reads: structural edit accept (blocking 0); register editor fix (blocking 2); fact read accept (blocking 0); figure verifier accept (blocking 0).

Round 2 drafter `couldNotDo`:

- Blocking findings fixed: (1) the two manifests are now explained where they first appear, in the Write path's store sentences (Git holds the edit and the two manifests, committed JSON indexes: the content manifest has one metadata row per entry and the media manifest describes each uploaded file). Data tiers now adds only their location, the fields a row carries, and that no body is stored. (2) Stability tiers keeps its qualifier inside the claim: 'Extension API and Scaffold API become frozen contracts at 1.0'. (3) The twelve one-sentence bridge paragraphs are gone. The one that carried a fact was folded into a neighbouring paragraph: the publish paragraph now ends on 'A save or a publish can land on a head...', and the Seams hand-off joined the Write path's opening as 'An edit to any entry, whatever concept it belongs to, ...'. The rest were cut. (4) The introduction's long list of what the page covers is now a bulleted list under a complete lead-in sentence with no numeral.
- Plan departures. Hand-offs: the plan gives each section a hand-off sentence, but the blocking bridge-paragraph finding outranks it, so sections now end where their content ends. Related resources: both the structural and register reviewers flagged the plan's general lead-in sentence as a doubled lead-in, so it was dropped. Migration notes was removed from the concepts group because Stability tiers already links it, and it is not one of the outline's required cross-links. Backend contract: the expectedHead bullet became two bullets so each list item stays under 26 words. The tie to Concurrent writes is a separate sentence after the list, checked against nav-routes.ts:145, content-routes-settings.ts:291,411, content-routes-media-ingest.ts:236, and content-routes-entry-revert.ts:87.
- Advisories taken: the save no longer says 'no committer'; the committer statement sits only in the publish section, with 'For a save and a publish alike'. The duplicated save-to-manifest capper is cut. The Build verification capper is cut. 'outright' and 'themselves' are removed. The edit-record sentence was rewritten so it no longer reads as contradicting audit_log. 'the one constraint' became 'provided'. The 'only tier a site can replace' universal is cut. The garbled Backend hand-off is cut. The closing sentence was rewritten so it no longer claims the upgrade page goes 'release by release'. The R2 delivery streaming now appears in the body (f:pgy0mr). The figure gained a dashed holding-branch-to-default-branch 'Publish copies content' edge, and its accDescr was updated to match. No new friction was filed: the pre-1.0 tier caveat is already in the log at docs-friction-log.md:288. Brief written at /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/internal/briefs/extend/architecture.json (167 entries, cuts unchanged). Vale: 0 errors; the 21 warnings are the sanctioned 'admin' plus 'Email Sending'. tellgrader: 0 findings.

Round 2 drafter `frictionFiled`:

- (none)

#### Escalation findings (final, in full)

````text
## structural edit: accept
Structural edit of docs/extend/architecture.md (worktree draft-docs-2a): accept, no blocking findings. `npm run check:vale` reports 0 errors across 1188 files, so there was nothing to fix. This seat only reports and never edits, so the page is unchanged.

The introduction meets Google's three parts. It opens with the contract, the covers list matches the body's subjects and order, the prior knowledge is stated, and the out-of-scope pages are linked. The register's concept-page definition follows at :16.

The body follows the plan's order: Entry points, Export map, Seams, then Write path with The holding branch, The publish commit, Concurrent writes (placed before Build verification), and Build verification. After those come Read path, Data tiers, Hard dependencies, Backend contract (which ties expectedHead to the head guard), and Stability tiers with the 0.86.0 worked example.

It is one module type: no procedure is mixed into the concept page. Every heading opens with a sentence of context. Related resources has three groups of 3 to 5 links (5 how-to, 3 concepts, 5 external). All seven crossLinks from architecture are present: add-cairn-to-a-sveltekit-app, scaffolded-site-files, security-model, content-model, upgrade-cairn, reference README, and configure-media.

There are four advisories:
1. Four sections drop the plan's scripted hand-offs, at :118, :122, :140 and :157.
2. The data-tiers git paragraph never says what reads git (:134).
3. "A save commits no manifest change" is repeated between the caption and :103, and the save's no-committer guarantee sits in the publish subsection instead.
4. The introduction is split into a list, where the plan specifies one prose paragraph.
- [advisory] docs/extend/architecture.md:118: Advisory (Google, 'a clear, logical development of the subject'): several of the hand-offs the plan scripts are missing, so four sections end without turning toward the next. Build verification (:118) does not turn to the read path. Read path (:122) does not turn to the data tiers. Data tiers (:140) ends on the cairn_ reservation with no turn to the hard dependencies. Backend contract (:157) ends on reference links with no turn to the stability tiers. Each following section opens with a context sentence, so the order still reads logically and this does not block.
  rewrite: Add the plan's hand-off as the last sentence of each section, phrased as a turn in the subject. For example, at :122: 'The manifest the corpus reads rely on is one of the kinds of state the engine commits to git, one of the three stores it places state in by what reads it.' At :157: 'The contract is one Extension-tier surface among many, and the tiers state what each export promises across versions.'
- [advisory] docs/extend/architecture.md:134: Advisory (the outline asks the data tiers to cover 'why (placement by what reads it)'): the section states the principle at :126 and shows it for D1 (the guard reads the session row) and R2 (the delivery route streams bytes). The git paragraph never says which code reads git. The plan's clause explaining why the media manifest sits in git rather than R2 (it is the dedup lookup an upload checks) was dropped, and the R2 reason at :138 is about suitability, not about what reads it.
  rewrite: In the git paragraph, name the reader: the build and the admin's corpus reads use the manifests. Restore the plan's clause that the media manifest sits in git beside the content manifest because it is the dedup lookup an upload checks.
- [advisory] docs/extend/architecture.md:99: Advisory (Red Hat, 'Information is provided at the right pace'): the figure caption's 'A save commits no manifest change' is repeated word for word at :103 in The holding branch. Also, the save's 'no committer' guarantee appears only at :107 in The publish commit ('For a save and a publish alike'). The plan puts it in the holding branch's opening sentence, where the save is introduced.
  rewrite: Drop the duplicate from either the caption or :103. Move 'with no committer, so GitHub attributes the commit to the App' into the :103 opening sentence, and keep only the publish's own clause at :107.
- [advisory] docs/extend/architecture.md:5: Advisory, plan conformance: the plan calls for a three-paragraph introduction in which paragraph 2 covers the topics, the prior knowledge, and the out-of-scope pages in one paragraph. The page splits the covers into a lead-in and a bulleted list (:5-12) ahead of the prior-knowledge and out-of-scope paragraph (:14). It still meets all three of Google's introduction items, and the list matches the body's order and subjects, so this does not block.
  rewrite: Either keep the list and record the departure in the plan, or fold the enumeration into the :14 paragraph as the plan specifies.

## register editor: fix
I graded the changed sentences of /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/architecture.md against the page plan. Vale reports 0 errors, 21 warnings, and 3 suggestions. The warnings are 20 "admin→administrator" alerts, which the register sanctions for extend ("admin" is free vocabulary), and one on "Email Sending binding", which looks like a product name. The suggestions are 3 SHA acronym alerts. tellgrader found 0 tells. Its measures: 88 sentences, hinged_pair_share 0.27, short_sentence_share 0.08. My own count: an average of about 26 words per sentence, a longest of about 70 words (line 14's inventory), and 31 paragraphs. The intro's first paragraph and the publish-commit paragraph (7 sentences, about 170 words) are the disproportionate ones.

The rework follows the plan's order and section moves faithfully:
- The Edit history fold is done.
- Concurrent writes now sits before Build verification.
- Backend contract now follows Hard dependencies.
- The seams table is self-contained, and capability is tied to roles.
- f:0xxou5 is kept whole.

Two blocking findings remain, both in the introduction:
1. **Covers list lead-in.** "The boundary between the engine and a site has the following parts:" frames the edit path, the stores, and the dependencies as parts of a boundary. That repeats round 2's figurative-structure problem as a false claim.
2. **Out-of-scope pointers.** They are a 70-word comma-chained inventory of five parallel link pairs. That is list cadence in prose and breaks the guide's parallel-items rule. The plan asked for prose here, so the conductor should rule on the conflict. Either form beats the chain.

Verdict: the page mostly reads as a measured systems-paper author. Its residue is long chained sentences (the 50-word contract sentence), a stray hand-off at the end of the publish section that duplicates Concurrent writes, and an undefined "target discipline". The change that would help most is rebuilding the introduction: a contract of one or two sentences, a covers lead-in without the "parts" frame, and the out-of-scope pages split out of the inventory sentence.
- [BLOCKING] docs/extend/architecture.md:5-12 (introduction, covers list): Logic and frame. "The boundary between the engine and a site has the following parts:" presents the page's subjects as parts of the boundary. The edit path, the read path, the stores, and the dependencies the engine never abstracts are not parts of a boundary. This is the same figurative spatial claim in a structural position that round 2 flagged on "the boundary runs from ... to ...", which the plan told the drafter to replace with a plain enumeration of the covers. The lead-in makes a literally false claim (brief, Tells: "Every factual claim is literally true").
  rewrite: Keep the list, but state the subject in the lead-in sentence without the parts frame: "The engine's side of that boundary comes down to the following subjects:" or, plainer, "The architecture has the following subjects, in the order a site meets them:" followed by the same six items.
- [BLOCKING] docs/extend/architecture.md:14, second sentence: Guide structure: "Parallel items that need no order form a bulleted list", and the tell "No list cadence in prose". "Separate pages cover the security properties of each piece in [Security model], declaring the adapter field by field in [...], concepts and fieldsets in depth in [...], each export's signature in the [...], and the upgrade procedure in [...]" runs to about 70 words and chains five parallel subject-and-link pairs. The plan asked for prose here because round 2 called the six-item list soft overlinking. But the guide prescribes a list for parallel items, and no deviation row licenses the inventory sentence. Two lines up, the page uses a list for the covers, so its treatment of parallel items is inconsistent. Raise the plan conflict with the conductor. Either form beats the 70-word chain.
  rewrite: "Security properties, the adapter's fields, and each export's signature each have a separate page. [Security model](security-model.md) states the security properties of each piece, and [Define an adapter and schema](define-an-adapter-and-schema.md) declares the adapter field by field. [Content model](content-model.md) covers concepts and fieldsets in depth, the [export reference](../reference/README.md) gives each export's signature, and [Upgrade cairn](upgrade-cairn.md) gives the upgrade procedure." (Alternatively, use a bulleted list of five items introduced by "The following pages cover what this page leaves out.")
- [advisory] docs/extend/architecture.md:3, first sentence (the one-line contract): The ruling asks for a one-line contract, but this first sentence runs about 50 words and chains four claims: the engine manages content and frame, features belong to the developer, the developer reaches the engine through seams, and the seams form a narrow versioned surface. They are joined by "while ... who reaches ... that form ...". Splitting it detaches no qualification, so the 26-word allowance for qualified claims does not cover it. The "while" also sets the two halves against each other for symmetry (balanced-halves residue).
  rewrite: "The engine manages a site's markdown content and its admin frame, and a site's features, actors, auth, data, and domain logic belong to the developer. A developer reaches the engine through a short list of seams, which form a narrow, versioned public surface. The boundary between the two decides which code a site writes and which engine contracts it relies on across releases."
- [advisory] docs/extend/architecture.md:62 (Seams table, identity row): Wrong referent. In "...in place of the built-in sign-in path, which the guard still looks up against the roster", the "which" attaches to "path", but the guard looks up the email.
  rewrite: "A proven email from an external identity gate, which replaces the built-in sign-in path and which the guard still checks against the roster"
- [advisory] docs/extend/architecture.md:61, 63, 66 (Seams table cells): Table cell length and form. The roles cell (about 37 words) and the custom-routes cell (about 40 words) carry multi-clause sentences, so the column breaks the form of the other rows. The BackendProvider cell uses "where" as a loose connective ("other than GitHub, where createGithubApp is the one provider..."). The Hard dependencies section and the Backend contract also restate the createGithubApp fact.
  rewrite: Roles row: "A role vocabulary mapping each site-defined role to one capability (`none`, `editor`, or `owner`), and an access map that only narrows a capability". Custom routes row: "A route file under `src/routes/admin/`, resolved ahead of the `[...path]` catch-all and rendered inside the `CairnAdminShell` chrome with no registration". BackendProvider row: "A content backend other than GitHub" (createGithubApp is stated once, in Hard dependencies).
- [advisory] docs/extend/architecture.md:107 last sentence, and :111 first sentence: The section boundary splits a hand-off and restates the rule. The publish paragraph ends on "A save or a publish can land on a head that another commit moved after the admin read it.", a sentence about concurrency left at the bottom of a publish section. The next section's first sentence then says the save and publish commits take the retry, and the list repeats it (restatement). "take a head-merge retry against a head another commit has moved" is also hard to parse. The two-halves shape, "An edit's save and publish commits take X, and the admin's other commits take either X or Y", is balanced-halves residue.
  rewrite: Cut the last sentence of the publish paragraph. Open Concurrent writes with: "Any commit the admin makes can land on a head that another commit moved after the admin read it, and each commit meets that case under one of two rules. The head-merge retry makes three further attempts against the moved head before it reports a conflict, and the head guard fails on the first stale head. The following list names the commits under each rule."
- [advisory] docs/extend/architecture.md:161: "Because the engine is still pre-1.0, the tiers are a target discipline" uses vague, undefined jargon that reads close to figurative. The facts say what pre-1.0 means concretely, so the phrase adds nothing.
  rewrite: "Because the engine is still pre-1.0, an Extension-tier break can ship in a minor release, and the `check:surface` snapshot gate detects and discloses such a break instead of preventing it." (This merges the last two sentences.)
- [advisory] docs/extend/architecture.md:163: Link at first mention. The new claim "A later minor version, `0.94.0`, renamed the `navLayout` types as well." is citation-shaped and carries no link. migration-notes.md has a `## 0.94.0` section that supports the claim ("the navLayout types finalized after 0.86.0's introduction").
  rewrite: "A later minor version, `0.94.0`, renamed the `navLayout` types as well, and the [migration notes for `0.94.0`](migration-notes.md#0940) list that rename."
- [advisory] docs/extend/architecture.md:165: Overstated universal and personification, flagged for the claims checker. "Code that a site writes against the seams needs an edit only where a release names a break" holds only for Extension-tier seams, and the page's own pre-1.0 caveat says a break can ship in a minor. The sentence comes close to a closing capper. "[Upgrade cairn] applies each crossed release's named changes" makes the page the actor, when the reader applies the changes.
  rewrite: "Because `check:surface` discloses every Extension-tier break, code a site writes against the seams needs an edit only where a release names one, and [Upgrade cairn](upgrade-cairn.md) describes applying each crossed release's named changes in order."
- [advisory] docs/extend/architecture.md:107, "so the content manifest changes only in a default-branch commit that changes an entry": Overstated universal, flagged for the claims checker. The sentence asserts that no other default-branch commit (nav, tidy-settings, vocabulary, revert) ever touches the content manifest. That holds only if f:e69d0l states it, and revert in particular may restore the manifest.
  rewrite: If the fact does not state the exclusivity, write: "A delete or a rename carries its manifest change in the same default-branch commit as its file change."
- [advisory] docs/extend/architecture.md:138: Dangling reason clause. In "R2 holds the media bytes, which the delivery route streams directly, since neither a git repository nor a D1 row suits binary assets", the "since" now reads as the reason for streaming. "Directly" is a new specific, so check it.
  rewrite: "R2 holds the media bytes, since neither a git repository nor a D1 row suits binary assets at megabyte scale. The delivery route streams those bytes from R2."
- [advisory] docs/extend/architecture.md:70 and :99, :103: Restatement. In "An edit to any entry, whatever concept it belongs to,", the second phrase repeats "any entry". "A save commits no manifest change" appears in both the caption and the holding-branch section.
  rewrite: First sentence: "An edit reaches the live site through a save onto a holding branch, ...". Caption: "A publish commit upserts the entry's manifest row together with the entry file. [Data tiers](#data-tiers) states what each store holds."
- [advisory] docs/extend/architecture.md:94 (mermaid edge added): The figure changed: a new dashed `hold -.->|Publish copies content| main` edge, and the accDescr was extended. The plan says the cairn-figure skill governs any diagram edit and the figure verifier reads the result. Route this change to the figure verifier. The edge is plausible but duplicates the `app -->|Publish commit| main` path.
- [advisory] docs/extend/architecture.md:20, :32: Minor logic. "each place reaches a different subpath" is inexact, because the adapter module reaches both the root barrel and `/sveltekit`, which makes four subpaths across three places. "each a set of subpaths with one job" overclaims for the Auth and platform group (`/vite`, `/ambient`, `/cloudflare`).
  rewrite: "A site touches the engine in three places, which between them import four subpaths." and "Most of the export map falls into six functional groups."
- [advisory] docs/extend/architecture.md:14, :136, :165, related resources (links): Overlinking. The body links Upgrade cairn, Security model, and Content model again after the introduction and again in Related resources. Several link targets do not exist yet in docs/extend (content-model, define-an-adapter-and-schema, configure-rendering, restrict-admin-access, arrange-the-admin-sidebar, configure-media, scaffolded-site-files). That is presumably expected mid-stage, but the claims checker should confirm. Related resources: "The following guides build a site on these seams" makes the guides the actor.
  rewrite: "The following guides cover building a site on these seams."

## fact read: accept
Scoped fact read of docs/extend/architecture.md in the draft-docs-2a worktree. `git diff` shows a page-level rewrite (64 insertions, 75 deletions), so nearly every sentence is a changed sentence and all of them were graded. The brief has 167 sentences: 116 cite facts and 51 are tagged no-claim. I checked all 116 cited sentences against 50 fact ids: the 49 outline ids the inventory carries plus f:p1xmp5. Each matches its fact. I spot-checked the load-bearing facts against source:
- COMMIT_RETRIES = 3 (repo.ts:195)
- the expectedHead fail-closed path (repo.ts:286-292)
- the nav, settings, vocabulary, media-ingest and revert callers that pass expectedHead (this backs the synthesis sentence at :157)
- the publish branch-delete head check (content-routes-entry-write.ts:404)
- publish-all as one commit
- the holding-branch codec (pending.ts)
- author set with committer omitted (repo.ts:258-263)
- the manifest paths (compose.ts:12-13)
- buildStart verify (vite/internal.ts)
- the role-to-capability mapping and the narrow-only access map (roles.ts, access.ts canReach)

No fact needed a [docs-drift] retag.

Inventory and plan:
- Every carried fact appears in the section the plan places it in.
- The six cuts (f:4b3rhm subordinated to the auth-store reference lede, which I confirmed; f:5vjwlc, f:pzbmhq, f:xkkt1o, f:2hnxsr, f:0435ck) are recorded in the brief.
- The page has every planned section.
- f:0xxou5 stays whole with its condition.
- The two round-2 blocking findings on the Edit history sentence are disposed by the plan; that section is gone. The roles/capability finding is applied in the access-map row.

The retired data-tiers.md topics are all carried or cut. The only exception is f:db0cx6, which is outside the outline and covered at summary level.

Every link target and anchor checked resolves: core.md#types, #error-classes, README.md#stability-tiers, migration-notes.md#0860, vite.md#cairnmanifest, sveltekit.md#loadpreview, supported-toolchain.md, and the subpaths the reference index documents. The pages still listed as pending are the outlined ones the plan names.

docs/internal/option-map.json has no row pending architecture. Its four rows backed by this page's facts (BackendProvider.* → f:gcd8h7, CairnAdapter.editor.navLayout → f:6a32oy) still match.

Gates: check:provenance, check:facts and check:options all pass (OK).

No new design friction was found, and nothing was filed. There are no blocking findings. Three non-blocking notes are listed in findings, one with a rewrite.
- [advisory] docs/extend/architecture.md:62 (Seams table, identity row): Non-blocking clarity point. In 'A proven email from an external identity gate, in place of the built-in sign-in path, which the guard still looks up against the roster', the relative clause sits right after 'path', so it reads as if the guard looks up the sign-in path. f:fhit7f says the guard looks up the proven email. The claim matches the fact, and only the clause order misleads.
  rewrite: A proven email from an external identity gate, which the guard still looks up against the roster, in place of the built-in sign-in path
- [advisory] docs/extend/architecture.md:177-181 (Related resources, concepts group): Non-blocking. The plan's ending lists four concept links, including docs/extend/migration-notes.md. The page carries three and omits migration-notes. Three is still inside the anatomy's 3-to-5 range, and Stability tiers links the 0.86.0 migration notes inline.
- [advisory] docs/internal/facts/extend.md:348 (retired docs/extend/data-tiers.md, f:db0cx6): Non-blocking. f:db0cx6 lists the fields of a media manifest row. It sits outside the outline's factIds and the inventory. The page keeps the topic at summary level ('the media manifest describes each uploaded file', line 70), so the retired page's topic is not dropped. f:rlrtfo is rejected and carries no topic. Every other fact from the retired page is carried or cut with a reason.

## figure verifier: accept
The page /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/architecture.md has one figure, and it earns its place. It is the mermaid write-path and data-tier flowchart at line 72. It passes the removal test and fits the 15-node budget at 9 nodes. Its source is mermaid in the page itself. Its accTitle is 101 characters and names the kind first, accDescr plus the body text give the two-part alternative, and the caption is correctly formed. No source, alt, or caption defects. No paragraph fails the missing-figure test: enumerable content is already in tables and lists. One non-blocking nit: the caption's opening clause repeats a sentence from The holding branch. Verdict: accept.
- [advisory] /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/architecture.md:72: EARNS ITS PLACE. The removal test passes because the prose at line 70 names the three stores, but no one paragraph shows how an action fans out to D1, R2, and git through the App, holding branch, default branch, and build. The diagram is the only place that topology is visible at once. It has 9 nodes and a subgraph, under the 15-node budget. It is mermaid in the page's own source, so it meets the routing and source rules. accTitle is 101 characters, names the kind first, and states what the reader learns. accDescr plus the Write path and Data tiers body text give the two-part text alternative. The caption is the first line after the fence, written as complete sentences. It does not repeat the alt and has no spatial reference. The figure matches the outline's figure note: write path, holding branch through the GitHub App, Publish copying to main, deploy rebuilding the manifest, and D1 and R2 beside git labelled with what each holds.
- [advisory] /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/architecture.md:99: Non-blocking nit: the caption's first clause, 'A save commits no manifest change', also appears word for word in The holding branch at line 103. No rule is broken, since the redundancy rule covers the alt, not body text. The caption could instead carry a fact the diagram shows and the prose states less directly, such as the dashed publish-copy edge.
- [advisory] /var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a/docs/extend/architecture.md:20-26: Missing-figure test passes, and no paragraph on the page needs a figure. The Entry points paragraph at line 26 describes layering, but it is short and readable in one pass. Concurrent writes (111-114), Read path (122), and Backend contract (148-155) already use lists or are plain enumerations. The Export map and Seams tables, and the Data tiers table, carry the enumerable content in the right form.
````
